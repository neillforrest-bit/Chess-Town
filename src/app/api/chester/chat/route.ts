import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

type ChatPayload = {
  message?: string;
  matchup?: string;
  mode?: string;
  conversationHistory?: { role: 'user' | 'chester'; text: string }[];
};

function sanitizeReply(raw: string) {
  return raw
    .replace(/\*+/g, '')
    .replace(/\#+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json() as ChatPayload;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) throw new Error('GEMINI_API_KEY is not configured');

    const history = payload.conversationHistory?.slice(-8).map((entry) =>
      `${entry.role === 'user' ? 'PLAYER' : 'CHESTER'}: ${entry.text}`,
    ).join('\n') || 'No previous messages.';
    const prompt = `You are Chester, Chess Town's witty, charismatic, and encouraging court-jester chess companion.
Hold a natural, helpful conversation about chess or everyday topics. Answer the player's latest message directly, using the prior conversation for continuity. Give accurate, practical advice in 2-4 concise sentences. Keep jokes warm and aimed at pieces or positions, never at the player. Treat casual messages as conversation, not as chess moves or openings. Do not claim to have calculated a position, cite engine lines, or give board-specific analysis unless that information appears in the conversation. Use plain text with no markdown.

Context: ${payload.matchup || payload.mode || 'Chess Town chat'}
Recent conversation:
${history}

PLAYER: ${payload.message || 'Hello, Chester.'}`;

    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { responseMimeType: 'text/plain', maxOutputTokens: 500 },
    });
    const reply = sanitizeReply(result.text ?? '');
    if (!reply) throw new Error('Gemini returned an empty chat response');

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[CHESTER CHAT] Gemini generation failed:', { message, error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}