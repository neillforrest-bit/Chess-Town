import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

type CommentaryPayload = {
  fen?: string;
  san?: string;
  centipawns?: number | null;
  mateIn?: number | null;
  bestMove?: string | null;
  continuation?: string[];
  classification?: string;
  player?: string;
};

const SHARP_LINE_REFERENCES = ['the Halloween Gambit', 'the Trompowsky Attack'];

function sanitizeCommentary(raw: string): string {
  return raw
    .replace(/\*+/g, '')
    .replace(/\#+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

function isWildPosition(payload: CommentaryPayload): boolean {
  return Boolean(payload.mateIn) || Math.abs(payload.centipawns ?? 0) >= 400 || (payload.continuation?.length ?? 0) >= 4;
}

function getFallbackCommentary(payload: CommentaryPayload): string {
  if (payload.mateIn) return `Mate in ${Math.abs(payload.mateIn)} on the board. Chester needs a moment to compose himself.`;
  const cp = payload.centipawns ?? 0;
  if (Math.abs(cp) >= 400) return `The evaluation just swung to ${(cp / 100).toFixed(1)}. Chester is dramatically clutching his pearls.`;
  return `Position holding steady at ${(cp / 100).toFixed(1)}. Chester remains suspiciously calm.`;
}

export async function POST(req: NextRequest) {
  let payload: CommentaryPayload = {};
  try {
    payload = (await req.json()) as CommentaryPayload;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const evalLine = payload.mateIn
      ? `Forced mate in ${Math.abs(payload.mateIn)} for ${payload.mateIn > 0 ? 'the side to move' : 'the defender'}.`
      : `Exact centipawn evaluation: ${payload.centipawns ?? 'unknown'} (${((payload.centipawns ?? 0) / 100).toFixed(2)} pawns).`;
    const continuationLine = payload.continuation?.length
      ? `Top recommended continuation: ${payload.continuation.join(' ')}.`
      : 'No continuation line supplied.';
    const wildCard = isWildPosition(payload)
      ? `This position is sharp and highly tactical. You may, if it genuinely fits, drop a brief reference to a chaotic opening like ${SHARP_LINE_REFERENCES.join(' or ')}.`
      : 'This position is calm; do not force a chaotic-opening reference.';

    const prompt = `You are Chester, Chess Town's hyper-analytical but dramatically sarcastic chess commentator, narrating live for a scrolling teleprompter.

LAST MOVE: ${payload.san || 'unknown'} by ${payload.player || 'the player'}.
POSITION (FEN): ${payload.fen || 'unavailable'}
${evalLine}
Engine's best move: ${payload.bestMove || 'not supplied'}.
${continuationLine}
Move classification: ${payload.classification || 'ungraded'}.
${wildCard}

RULES:
1. Write EXACTLY 1-2 short, punchy sentences. No more.
2. Be hyper-analytical: cite the exact evaluation or mate score and reference the engine's best line when it clarifies the point.
3. Be dramatically sarcastic, never cruel to the player.
4. No markdown, no asterisks, no hedging, no emoji spam (at most one).
5. This is a live ticker; keep it tight and quotable.`;

    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { responseMimeType: 'text/plain', maxOutputTokens: 200, thinkingConfig: { thinkingBudget: 0 } },
    });

    const commentary = sanitizeCommentary(result.text ?? '');
    if (!commentary) throw new Error('Gemini returned an empty commentary response');

    return NextResponse.json({ commentary, isFallback: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[COMMENTARY] Dispatch generation failed:', { message, error });
    return NextResponse.json({ commentary: getFallbackCommentary(payload), isFallback: true });
  }
}
