import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

type GazettePayload = {
  pgn?: string;
  result?: string;
  playerColor?: string;
};

type GazetteResponse = {
  dispatch: string;
  isFallback: boolean;
};

function sanitizeDispatch(raw: string): string {
  return raw
    .replace(/\*+/g, '')
    .replace(/\#+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

function getFallbackDispatch(payload: GazettePayload): string {
  const outcome = payload.result === 'checkmate'
    ? 'a decisive checkmate'
    : payload.result === 'resigned'
      ? 'a dramatic resignation'
      : 'an honourable draw';
  const side = payload.playerColor === 'b' ? 'the Black pieces' : 'the White pieces';
  return `EXTRA! EXTRA! Word from the Chess-Town square: a spirited contest has concluded in ${outcome}, with the correspondent commanding ${side} throughout. The printing press being temporarily indisposed, a full account of the game's swings and blunders shall follow in the next edition. Huzzah for a match well fought!`;
}

export async function POST(req: NextRequest): Promise<NextResponse<GazetteResponse>> {
  let payload: GazettePayload = {};
  try {
    payload = (await req.json()) as GazettePayload;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    if (!payload.pgn || !payload.pgn.trim()) {
      throw new Error('No PGN supplied for the dispatch');
    }

    const prompt = `You are the correspondent for "The Chess-Town Gazette," a satirical 19th-century broadsheet covering the game of chess.
Write a SHORT newspaper dispatch (3-5 sentences) in florid, satirical Victorian-era journalese, summarizing the key swings, blunders, or brilliancies of the following game.

GAME RECORD (PGN): ${payload.pgn}
FINAL RESULT: ${payload.result || 'unknown'}
CORRESPONDENT'S COLOUR: ${payload.playerColor === 'b' ? 'Black' : 'White'}

RULES:
1. Use archaic, ornate 19th-century newspaper language ("Whereupon", "It is with great consternation that we report", "Huzzah", etc.).
2. Reference at least one specific turning point or blunder from the move list, described in plain, non-technical prose as if for a general readership.
3. Keep the tone witty and satirical, never cruel.
4. No markdown, no asterisks, no headings, just the dispatch prose itself.
5. End with a punchy closing line fit for a broadsheet.`;

    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseMimeType: 'text/plain', maxOutputTokens: 400 },
    });

    const dispatch = sanitizeDispatch(result.text ?? '');
    if (!dispatch) throw new Error('Gemini returned an empty dispatch');

    return NextResponse.json({ dispatch, isFallback: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[GAZETTE] Dispatch generation failed:', { message, error });
    return NextResponse.json({ dispatch: getFallbackDispatch(payload), isFallback: true });
  }
}
