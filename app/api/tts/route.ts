import { TextToSpeechClient } from "@google-cloud/text-to-speech";

let credentials: any = {};
try {
  let envJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}';
  // Strip accidental outer quotes added by hosting platforms
  envJson = envJson.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  credentials = JSON.parse(envJson);
  // Re-escape literal \n strings back into real newlines for the private key
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
} catch (e) {
  console.error("[TTS API] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON. Ensure it is a valid JSON string.");
}

const client = new TextToSpeechClient({
  credentials: Object.keys(credentials).length > 0 ? credentials : undefined
});

async function synthesizeSpeech(text: string, lang: string): Promise<Buffer> {
  const isSinhala = lang === 'si' || lang === 'sinhala' || lang === 'singlish' || /[\u0D80-\u0DFF]/.test(text);
  const isTamil = lang === 'ta' || lang === 'tanglish' || /[\u0B80-\u0BFF]/.test(text);

  if (isSinhala) {
    // Google Cloud TTS lacks native support for Sinhala (si-LK).
    // We proxy request to Google Translate TTS API which provides high-quality native Sinhala voice synthesis.
    const translateUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=si&client=tw-ob&q=${encodeURIComponent(text)}`;
    const res = await fetch(translateUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    if (!res.ok) {
      throw new Error(`Google Translate TTS failed with status: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } else if (isTamil) {
    // For Tamil/Tanglish, use Google Cloud TTS Wavenet voice
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: { 
        languageCode: 'ta-IN', 
        name: 'ta-IN-Wavenet-A' 
      },
      audioConfig: { 
        audioEncoding: 'MP3' as const,
        sampleRateHertz: 24000,
        speakingRate: 1.0,
        pitch: 0.0,
      },
    });
    return response.audioContent as Buffer;
  } else {
    // For English, use premium Google Cloud TTS Neural2 voice
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: { 
        languageCode: 'en-US', 
        name: 'en-US-Neural2-F' 
      },
      audioConfig: { 
        audioEncoding: 'MP3' as const,
        sampleRateHertz: 24000,
        speakingRate: 1.0,
        pitch: 0.0,
      },
    });
    return response.audioContent as Buffer;
  }
}

export async function POST(req: Request) {
  try {
    const { text, lang } = await req.json(); // Accept 'lang' from frontend

    if (!text) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    const audioBuffer = await synthesizeSpeech(text, lang || '');
    const base64Audio = audioBuffer.toString('base64');

    // Verify it's actually a string
    if (typeof base64Audio !== 'string' || base64Audio.length === 0) {
      return Response.json(
        { error: 'Audio encoding failed' }, 
        { status: 500 }
      );
    }

    console.log('TTS generated:', base64Audio.length, 'chars, first 20:', base64Audio.slice(0, 20));

    return Response.json({ audioContent: base64Audio });
  } catch (error: any) {
    console.error('Cloud TTS Error:', error);
    return Response.json({ error: error.message || 'Failed to synthesize speech' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || 'Hello from Senura';
    const lang = searchParams.get('lang') || '';

    const audioBuffer = await synthesizeSpeech(text, lang);
    return new Response(audioBuffer as any, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      }
    });
  } catch (err: any) {
    console.error("GET TTS Error:", err);
    return Response.json({ 
      error: err.message,
      code: err.code 
    }, { status: 500 });
  }
}
