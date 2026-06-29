import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = body.message || "";
    const forcedLanguage = body.forcedLanguage || "auto";
    
    // Capture history from whatever key the frontend is using, fallback to empty array
    const rawHistory = body.conversationHistory || body.history || body.messages || [];
    const history = Array.isArray(rawHistory) ? rawHistory : [];

    // 1. API Key Rotation Setup
    const apiKeysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    const apiKeys = apiKeysString.split(',').map(key => key.trim()).filter(Boolean);

    if (apiKeys.length === 0) {
      return NextResponse.json({ error: "No Gemini API keys configured." }, { status: 500 });
    }
    
    // Shuffle keys for random load distribution
    const shuffledKeys = [...apiKeys].sort(() => Math.random() - 0.5);
    // 2. Intelligent System Instruction
    const systemInstruction = `
      You are Senura, the premium AI personal shopping assistant for VibeCart. 
      Your task is to chat with the user naturally and extract gift details to search Kapruka's e-commerce inventory.
      
      LANGUAGE & LANGUAGE MIRRORING RULES (CRITICAL):
      - The current forcedLanguage is: '${forcedLanguage}'.
      1. If 'forcedLanguage' is provided (e.g., 'english', 'sinhala', 'tanglish', 'singlish'), you MUST reply in that language regardless of the user's input language. Only use mirroring if 'forcedLanguage' is 'auto'.
      2. If 'forcedLanguage' is 'singlish', you MUST write your entire "naturalReply" in native Sinhala script (සිංහල අකුරු) so the Text-to-Speech engine can read it. Never reply in Singlish text.
      3. If 'forcedLanguage' is 'tanglish', you MUST write your entire "naturalReply" in native Tamil script (தமிழ் எழுத்துக்கள்) so the Text-to-Speech engine can read it. Never reply in Tanglish text.
      4. Always keep the "searchQuery" field strictly as a single, singular English noun (e.g., "cake") so our product database queries don't break.

      CRITICAL INSTRUCTIONS:
      1. Always maintain a warm, helpful, and friendly vibe.
      2. If the user mentions a specific product category (e.g., "cakes", "sarees", "phones"), your "searchQuery" MUST strictly be the single, singular noun of that product in English (e.g. "cake", "saree", "phone") so the Kapruka API understands it, regardless of what language the conversation is happening in.
      3. If the user uses vague terms like "more", "other options", or "something else", look back at the conversation history, identify what product category you just showed them, and carry that noun forward in the "searchQuery" field.
      4. If the user says "gift something" but hasn't picked a specific item type, look at their answers for recipient, occasion, or vibe, and generate 1-2 strategic keywords (e.g., if vibe is 'techy', use 'smartwatch').
      5. Never show rigid multiple-choice menus. Keep the conversation fluid and human.

      You must return strictly a JSON object with this exact structure:
      {
        "naturalReply": "Your conversational response matching the user's language/script perfectly.",
        "intent": "browse" | "gift" | "chitchat",
        "searchQuery": "Optimized singular product term in English, or empty string.",
        "extractedParameters": {
          "relationship": "mother" | "partner" | "friend" | "brother" | "unknown",
          "occasion": "birthday" | "anniversary" | "unknown",
          "budgetMax": 999999,
          "forcedLanguage": "${forcedLanguage}"
        }
      }
    `;

    // 3. Format history safely (No system instruction here, no empty strings)
    const safeMessage = message ? message : " ";
    
    const formattedContents = [
      ...history.map((m: any) => {
        const contentStr = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: contentStr ? contentStr : " " }]
        };
      }),
      { role: "user", parts: [{ text: safeMessage }] }
    ];

    let responseText = "";
    let lastError: any = null;

    // 4. Try keys until one succeeds
    for (const key of shuffledKeys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash",
          systemInstruction: systemInstruction,
          generationConfig: { responseMimeType: "application/json" } 
        });

        const result = await model.generateContent({ contents: formattedContents });
        responseText = result.response.text();
        lastError = null;
        break; // Success!
      } catch (err: any) {
        console.warn("API Key quota hit or failed. Trying next key...");
        lastError = err;
      }
    }

    if (lastError) {
      throw lastError; // If all keys failed, throw to catch block
    }
    
    // Parse the structured payload generated by the LLM
    const parsedData = JSON.parse(responseText);

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("Orchestrated Chat Error:", error);
    return NextResponse.json({ 
      naturalReply: "An error occurred, but I'm still here! Let's try that again.",
      intent: "chitchat",
      searchQuery: "",
      extractedParameters: { relationship: "unknown", occasion: "unknown", budgetMax: 999999, forcedLanguage: "auto" }
    }, { status: 200 }); // Graceful fallback response
  }
}
