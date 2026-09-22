import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { guardAiRequest, safeAiError } from '@/lib/api-guard';

type ChatPayload = { message?: string; matchup?: string; mode?: string; conversationHistory?: { role: 'user' | 'chester'; text: string }[] };

function sanitizeReply(raw: string) { return raw.replace(/\*+/g, '').replace(/\#+/g, '').replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim(); }
function isMetaReply(reply: string) { return /\b(?:internal (?:thought|dialogue|reasoning)|system prompt|instruction(?:s)? (?:met|followed)|constraint(?:s)? (?:met|checklist))\b/i.test(reply); }
function fallback(message: string) { const subject = message.trim() || 'the board'; return `Ah, ${subject} has wandered into the neon court. Give me the position or your next chess question, and I will help you find a plan.`; }

export async function POST(req: NextRequest) {
  const blocked = guardAiRequest(req, 16_000, 20);
  if (blocked) return blocked;
  try {
    const payload = await req.json() as ChatPayload;
    const message = (payload.message || 'Hello, Chester.').slice(0, 1200);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) throw new Error('Gemini unavailable');
    const history = payload.conversationHistory?.slice(-8).map((entry) => `${entry.role === 'user' ? 'PLAYER' : 'CHESTER'}: ${entry.text.slice(0, 800)}`).join('\n') || 'No previous messages.';
    const prompt = `You are Chester, a witty theatrical chess host. Answer the player's latest message directly in 3-4 complete sentences. Be warm, funny and educational. Do not make board-specific claims unless the conversation supplies the position. Plain text only.\nContext: ${payload.matchup || payload.mode || 'Chess Town chat'}\nRecent conversation:\n${history}\nPLAYER: ${message}`;
    const result = await new GoogleGenAI({ apiKey }).models.generateContent({ model: 'gemini-3.5-flash', contents: prompt, config: { responseMimeType: 'text/plain', maxOutputTokens: 500 } });
    const reply = sanitizeReply(result.text ?? '');
    return NextResponse.json({ reply: !reply || isMetaReply(reply) ? fallback(message) : reply, toolCall: null });
  } catch (error) { return safeAiError('CHESTER CHAT', error); }
}
