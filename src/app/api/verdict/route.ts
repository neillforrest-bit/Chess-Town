import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { guardAiRequest } from '@/lib/api-guard';

// THE VERDICT - turns a finished game's real record into Chester's shareable
// report-card lines. Grounded ONLY in the graded moves and stats the client
// sends: the card never invents moments that are not in the record.

type GradedMove = { move?: string; player?: string; ply?: number; grade?: string; centipawnLoss?: number | null };

type VerdictPayload = {
  gradeHistory?: GradedMove[];
  difficulty?: string;
  result?: 'won' | 'lost' | 'drew';
  score?: number;
  grade?: string;
  accuracy?: number;
  openingName?: string;
  moves?: number;
  opponentLabel?: string;
};

type CardLines = { headline: string; turningPoint: string; funniestMoment: string; lesson: string };

function clean(raw: string) {
  return raw.replace(/\*+/g, '').replace(/#+/g, '').replace(/\s+/g, ' ').trim();
}

function moveNo(ply?: number) {
  return Math.max(1, Math.ceil((ply || 1) / 2));
}

function fallbackLines(payload: VerdictPayload): CardLines {
  const mine = (payload.gradeHistory || []).filter((g) => g.player === 'You');
  const worst = mine.length ? mine.reduce((a, b) => ((a.centipawnLoss ?? 0) >= (b.centipawnLoss ?? 0) ? a : b)) : null;
  const best = mine.length ? mine.reduce((a, b) => ((a.centipawnLoss ?? 999) <= (b.centipawnLoss ?? 999) ? a : b)) : null;
  const resultWord = payload.result === 'won' ? 'beat' : payload.result === 'drew' ? 'held' : 'fought';
  return {
    headline: `You ${resultWord} ${payload.opponentLabel || 'Chester'} and lived to tell the tale.`,
    turningPoint: best ? `Move ${moveNo(best.ply)} was your cleanest decision of the whole game.` : 'The middlegame tug-of-war decided everything.',
    funniestMoment: worst && (worst.centipawnLoss ?? 0) >= 200 ? `Move ${moveNo(worst.ply)} was magnificently weird - technically a blunder, but Chester respects the audacity.` : 'Chester checked twice: no howlers. Frankly, he is a little disappointed.',
    lesson: 'Next game, win the race to castle - king safety first, heroics second.',
  };
}

export async function POST(req: NextRequest) {
  const blocked = guardAiRequest(req, 24_000, 10);
  if (blocked) return blocked;
  let payload: VerdictPayload = {};
  try {
    payload = (await req.json()) as VerdictPayload;
  } catch {
    return NextResponse.json({ ...fallbackLines({}), fallback: true });
  }

  const result = payload.result === 'won' ? 'won' : payload.result === 'drew' ? 'drew' : 'lost';
  const opponent = payload.opponentLabel || 'CHESTER';
  const record = (payload.gradeHistory || [])
    .filter((g) => g.player === 'You')
    .slice(-24)
    .map((g) => `move ${moveNo(g.ply)} graded ${g.grade || '?'}${(g.centipawnLoss ?? 0) >= 200 ? ' (big swing)' : ''}`)
    .join('; ') || 'no graded moves recorded';

  const prompt = `You are Chester, Chess Town's knight-jester, writing the SHAREABLE REPORT CARD for a finished game. The player's friends will read this in a group chat, so make it worth pasting: warm, genuinely funny, and honest.

GAME RECORD (ground truth - never invent anything outside it):
Result: the player ${result} against ${opponent}. Effort grade ${payload.grade || '?'}, score ${payload.score ?? '?'}/100, accuracy ${payload.accuracy ?? '?'}%. Opening: ${payload.openingName || 'unknown'}. Length: ${payload.moves ?? record.length} plies.
The player's graded moves, in order: ${record}.

COURAGE CLAUSE: daring, outside-the-box ideas get banter, not just slaps. An unsound but imaginative move is technically a blunder but magnificently weird - name what they were hunting. An unorthodox move that is also SOUND gets explicit respect.

Return ONLY a JSON object with exactly these four string fields:
- "headline": one punchy sentence summing up the game in your voice, at most 16 words.
- "turningPoint": the real turning point from the record, 1-2 sentences, referenced by move number.
- "funniestMoment": the single most entertaining moment from the record - a howler, a daring punt, a lucky escape - 1-2 sentences. If nothing was funny, tease that the game was suspiciously sensible.
- "lesson": ONE concrete lesson for next time, one sentence, plain English.
No markdown, no chess notation like Nf3, no centipawns. Refer to moves by number only ("move 12").`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) throw new Error('GEMINI_API_KEY is not configured');
    const genAI = new GoogleGenAI({ apiKey });
    const response = await genAI.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', maxOutputTokens: 600, thinkingConfig: { thinkingBudget: 0 } },
    });
    const parsed = JSON.parse(clean(response.text ?? '{}')) as Partial<CardLines>;
    const lines = fallbackLines(payload);
    return NextResponse.json({
      headline: clean(parsed.headline || '') || lines.headline,
      turningPoint: clean(parsed.turningPoint || '') || lines.turningPoint,
      funniestMoment: clean(parsed.funniestMoment || '') || lines.funniestMoment,
      lesson: clean(parsed.lesson || '') || lines.lesson,
      fallback: false,
    });
  } catch (error) {
    console.error('[VERDICT] Gemini failed, serving deterministic card', error);
    return NextResponse.json({ ...fallbackLines(payload), fallback: true });
  }
}
