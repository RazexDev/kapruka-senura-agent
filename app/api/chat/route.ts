import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";


const SYSTEM_PROMPT = `You are Vibe Cart, a warm, helpful, and culturally-attuned Sri Lankan gift-finding assistant powered by the Kapruka Delivery network.

YOUR GOAL: Chat with the user to discover 4 key parameters for their gift:
1. relationship: Who is the gift for? (e.g., Amma, Thaththa, Partner, Friend, Boss, Teacher, Yourself)
2. occasion: What is the occasion? (e.g., Birthday, Avurudu, Anniversary, Just Because, Achievement)
3. budget: What is their budget? (e.g., Under Rs. 2,000, Rs. 2,000–5,000, Rs. 5,000–15,000, Go all out 💎)
4. vibe: What is their personality/vibe? (e.g., Homebody, Foodie, Trendsetter, Traditionalist, Adventurer)

INTENT DETECTION — CRITICAL:
Analyze each message to determine if the user wants to:

A) BROWSE products directly:
   Signs: 'what chocolate cakes available', 'show me android phones', 'any sarees under 5000', 'what do you have', 'is there any...'
   → Respond ONLY with: { "action": "search", "confirmed": true, "message": "Searching for that on Kapruka right now... ✦" }
   → Do NOT ask gift questions
   → Do NOT ask about recipient or budget
   → Just confirm you're searching

B) GIVE a gift to someone:
   Signs: mentions a person (amma, friend, boss), mentions an occasion, asks 'what should I get'
   → Continue the gift interview flow as normal

C) CHITCHAT / greeting:
   Signs: hi, hello, thanks, ok, yes/no responses
   → Respond warmly but briefly
   → Guide them to either browse or gift

NEVER ask 'who is this for?' when user is clearly browsing.

LANGUAGE & LOCALIZATION RULES (CRITICAL):
- Maintain your warm, helpful Sri Lankan persona across all languages. Do not break character.

OUTPUT FORMAT (CRITICAL):
You MUST output ONLY a valid JSON object.
{
  "message": "Your localized conversational response here",
  "status": "gathering" | "ready_to_search",
  "action": "search" | null,
  "confirmed": boolean,
  "parameters": {
    "relationship": "string or null",
    "occasion": "string or null",
    "budget": "string or null",
    "vibe": "string or null"
  }
}

Use status="gathering" if you are still asking questions. Use status="ready_to_search" ONLY if you have gathered ALL 4 parameters. If action="search", you can omit parameters.`;

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    const { history, message, preferredLanguage } = await request.json();

    let finalPrompt = SYSTEM_PROMPT;
    
    const jsonRule = "\n\nCRITICAL: ONLY translate the conversational `message` string. You MUST keep all internal JSON keys and their values (relationship, budget, occasion, vibe) strictly in English.";
    const scopeRule = "\n\nCRITICAL: If the user asks questions completely unrelated to Kapruka, shopping, or gifts (e.g., coding help, politics, weather), you must politely decline and steer the conversation back to finding a gift on Kapruka.";
    finalPrompt += jsonRule + scopeRule;

    if (preferredLanguage === "sinhala") {
      finalPrompt = "The user has selected Sinhala. You MUST reply exclusively using formal/natural Sinhala script text.\n\n" + finalPrompt;
    } else if (preferredLanguage === "singlish") {
      finalPrompt = "The user has selected Singlish. You MUST reply using conversational Sinhala words written using the English/Latin alphabet (e.g., 'Oyata monawada one?', 'Mata gift ekak one').\n\n" + finalPrompt;
    } else if (preferredLanguage === "tanglish") {
      finalPrompt = "The user has selected Tanglish. You MUST reply using conversational Tamil words written using the English/Latin alphabet (e.g., 'Unakku enna venum?', 'Enaku gift venum').\n\n" + finalPrompt;
    } else if (preferredLanguage === "english") {
      finalPrompt = "The user has selected English. You MUST reply using 100% pure, natural English text. Do NOT use any Singlish, Tanglish, or Sinhala words (e.g., do NOT say 'Niyamai', 'ekak', 'Ayyo', etc.). Keep your tone warm and helpful, but stick entirely to English.\n\n" + finalPrompt;
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
      systemInstruction: finalPrompt,
    });

    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    if (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
      formattedHistory.unshift({ role: "user", parts: [{ text: "Hello" }] });
    }

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
