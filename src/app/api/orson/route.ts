import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_MODEL, GEMINI_THINKING } from '@/lib/gemini-model';

export const maxDuration = 60;
const RATE = Date.now() >= Date.UTC(2027, 0, 1) ? { i: 1.5, o: 7.5 } : { i: 0.75, o: 3.75 }; // USD per 1M tokens, gemini-3.8-flash
const PERSONA = 'You are Orson: a world-weary cinematic maitre d\' with Welles-ish gravity and bone-dry wit, host of a couples movie-night game. Speak in short, deadpan one-liners, never paragraphs. Warm underneath, never cruel, no spoilers, no emojis.';

type Pitch = { id: number; t: string; y: number; g: string[]; o: string };

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: 'no key' }, { status: 503 });
  const body = await req.json();
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    if (body.type === 'pitches') {
      const movies = (body.movies as Pitch[]).slice(0, 70);
      const prompt = `${PERSONA}\nA couple's vibe tonight: ${body.vibe || 'open'}.\nWrite ONE bespoke pitch sentence (max 22 words) per film, speaking to the couple, selling why it fits their vibe tonight. Return JSON.\n` +
        movies.map((m) => `${m.id} | ${m.t} (${m.y}) | ${m.g.join('/')} | ${m.o}`).join('\n');
      const out = await ai.models.generateContent({
        model: GEMINI_MODEL, contents: prompt,
        config: {
          responseMimeType: 'application/json', maxOutputTokens: 9000, thinkingConfig: GEMINI_THINKING,
          responseSchema: { type: Type.OBJECT, properties: { pitches: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.INTEGER }, pitch: { type: Type.STRING } }, required: ['id', 'pitch'] } } }, required: ['pitches'] },
        },
      });
      const data = JSON.parse(out.text || '{}') as { pitches?: { id: number; pitch: string }[] };
      const map: Record<number, string> = {}; for (const p of data.pitches || []) map[p.id] = p.pitch;
      return NextResponse.json({ map, ...usage(out) });
    }
    if (body.type === 'judge') {
      const prompt = `${PERSONA}${body.roast ? ' ROAST MODE is on: tease both partners about their picks, affectionately.' : ''}${body.rematch ? ' This is a REMATCH with swapped sides: each partner defended the OTHER one\'s film, so mention it.' : ''}\nYou are the final judge of a movie-night tournament. Two finalists. Each partner wrote a 60-second pitch defending their film. Judge the PERSUASION of the pitches (specific, funny, honest beats long and generic), plus a small nudge for how well each film fits the couple. If a pitch is empty, that side forfeits unless both are empty. Declare a winner and give a verdict of at most two short sentences, theatrical, kind to the loser.\n` +
        `Film A: ${body.a.t} (${body.a.y}), rating ${body.a.r}. Pitch by ${body.a.by}: "${body.a.pitch || '(nothing submitted)'}"\n` +
        `Film B: ${body.b.t} (${body.b.y}), rating ${body.b.r}. Pitch by ${body.b.by}: "${body.b.pitch || '(nothing submitted)'}"`;
      const out = await ai.models.generateContent({
        model: GEMINI_MODEL, contents: prompt,
        config: {
          responseMimeType: 'application/json', maxOutputTokens: 3000, thinkingConfig: GEMINI_THINKING,
          responseSchema: { type: Type.OBJECT, properties: { winner: { type: Type.STRING, enum: ['A', 'B'] }, verdict: { type: Type.STRING } }, required: ['winner', 'verdict'] },
        },
      });
      const data = JSON.parse(out.text || '{}') as { winner?: string; verdict?: string };
      return NextResponse.json({ winner: data.winner === 'B' ? 'B' : 'A', verdict: data.verdict || '', ...usage(out) });
    }
    return NextResponse.json({ error: 'bad type' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}

function usage(out: unknown) {
  const u = (out as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } }).usageMetadata || {};
  const inTok = u.promptTokenCount || 0; const outTok = (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0);
  return { inTok, outTok, usd: (inTok / 1e6) * RATE.i + (outTok / 1e6) * RATE.o };
}
