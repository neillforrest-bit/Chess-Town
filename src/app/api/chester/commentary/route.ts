// BUILD 165: optional Gemini tier for Chester commentary (PRD pillar 4). Default product path is the deterministic
// analyzer; this route only rewrites its grounded facts in Chester's voice. Any error/402/empty -> client keeps the
// deterministic lines. Model: Flash-Lite (cheapest suitable). Returns measured token usage for the spend tracker.
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { guardAiRequest } from '@/lib/api-guard';
import { isBanned } from '@/lib/chester-analyzer';

export const maxDuration = 20;
const MODEL = 'gemini-3.1-flash-lite';

const SYSTEM = `You are Chester, a razor-sharp, charismatic grandmaster coach inside Chess-Town.
RULES: 1. Never use canned filler like "ambitious! the engine found a crack in it", "that one stings a little", or "king to the kingside".
2. Ground every word in the provided JSON facts only. Keep exact squares and put algebraic notation in parentheses, e.g. (Bxh2+) or (O-O).
3. whatHappenedLine: tell the player what their move accomplished (good grades) or the exact tactical punishment it allows (SHAKY/BLUNDER). Max 20 words.
4. engineBlueprintLine: state what the engine would have played (engineBestSan) and the concrete reason why. Max 20 words.
5. headlineBadge: max 5 words, uppercase. 6. Never repeat phrasing from recentLines. No emoji. Do not invent pieces or squares.`;

export async function POST(req: NextRequest) {
  const blocked = guardAiRequest(req, 8_000, 40); if (blocked) return blocked;
  const key = process.env.GEMINI_API_KEY; if (!key?.trim()) return NextResponse.json({ error: 'no key' }, { status: 503 });
  let body: { facts?: Record<string, unknown>; chat?: { message: string } };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  if (!body.facts) return NextResponse.json({ error: 'no facts' }, { status: 400 });
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    if (body.chat?.message) {
      const out = await ai.models.generateContent({ model: MODEL, contents: `Student asks: ${String(body.chat.message).slice(0, 300)}\nFACTS: ${JSON.stringify(body.facts).slice(0, 3500)}`, config: { systemInstruction: SYSTEM.split('RULES:')[0] + 'Answer the student in at most 3 short sentences, funny and educational, using ONLY the FACTS. Put any move in algebraic notation. Never use the banned filler phrases. Plain text.', maxOutputTokens: 300, temperature: 0.8 } });
      const um = (out as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } }).usageMetadata || {};
      const reply = (out.text || '').replace(/\*+/g, '').trim();
      const usage = { input: um.promptTokenCount ?? 0, output: (um.candidatesTokenCount ?? 0) + (um.thoughtsTokenCount ?? 0), model: MODEL };
      if (!reply || isBanned(reply)) return NextResponse.json({ error: 'rejected', usage }, { status: 422 });
      return NextResponse.json({ reply, usage });
    }
    const out = await ai.models.generateContent({
      model: MODEL,
      contents: JSON.stringify(body.facts).slice(0, 4000),
      config: {
        systemInstruction: SYSTEM, responseMimeType: 'application/json', maxOutputTokens: 400, temperature: 0.8,
        responseSchema: { type: Type.OBJECT, properties: { headlineBadge: { type: Type.STRING }, whatHappenedLine: { type: Type.STRING }, engineBlueprintLine: { type: Type.STRING } }, required: ['headlineBadge', 'whatHappenedLine', 'engineBlueprintLine'] },
      },
    });
    const um = (out as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } }).usageMetadata || {};
    const p = JSON.parse(out.text || '{}') as { headlineBadge?: string; whatHappenedLine?: string; engineBlueprintLine?: string };
    const ok = [p.headlineBadge, p.whatHappenedLine, p.engineBlueprintLine].every((x) => typeof x === 'string' && x.trim().length > 0 && !isBanned(x));
    const usage = { input: um.promptTokenCount ?? 0, output: (um.candidatesTokenCount ?? 0) + (um.thoughtsTokenCount ?? 0), model: MODEL };
    if (!ok) return NextResponse.json({ error: 'rejected', usage }, { status: 422 });
    return NextResponse.json({ ...p, usage });
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    console.error('[chester-commentary]', msg.slice(0, 200));
    return NextResponse.json({ error: /402|credit|quota|billing/i.test(msg) ? 'no-credit' : 'error' }, { status: 502 });
  }
}
