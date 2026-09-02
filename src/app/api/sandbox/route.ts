import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

type SandboxPayload = {
  message?: string;
  history?: { role: 'user' | 'chester'; text: string }[];
};

function sanitizeReply(raw: string) {
  return raw.replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
}

function getFallbackReply(message?: string) {
  const subject = message?.trim() || 'that diagnostic';
  return `Sandbox inference is temporarily unavailable, so ${subject} has escaped the usual review. Consider this a suspiciously merciful result.`;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as SandboxPayload;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) throw new Error('GEMINI_API_KEY is not configured');

    const history = payload.history?.slice(-6).map((entry) =>
      `${entry.role === 'user' ? 'OPERATOR' : 'CHESTER'}: ${entry.text}`,
    ).join('\n') || 'No prior diagnostics.';
    const prompt = `You are Chester running an unlisted Chess Town engineering sandbox. Respond to the OPERATOR with highly sarcastic but playful diagnostic banter in 1-3 concise sentences. Make dry jokes about questionable code choices, chess blunders, needless complexity, or asking whether the implementation works. Roast the code and the move, not the human: no insults about intelligence, identity, appearance, worth, or protected traits. Never be cruel, threatening, or profane. Do not claim to execute code, inspect systems, or know facts that are not in the conversation. Plain text only, no markdown.

Diagnostic history:
${history}

OPERATOR: ${payload.message || 'Run a diagnostic.'}`;

    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { responseMimeType: 'text/plain', maxOutputTokens: 300 },
    });
    const reply = sanitizeReply(result.text ?? '');
    if (!reply) throw new Error('Gemini returned an empty sandbox response');

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[SANDBOX] Gemini generation failed:', { message, error });
    return NextResponse.json({ reply: getFallbackReply() });
  }
}
