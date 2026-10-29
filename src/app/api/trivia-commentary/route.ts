import { GEMINI_MODEL, GEMINI_THINKING } from '@/lib/gemini-model';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

type TriviaCommentaryPayload = {
  mode?: 'brawl-intro' | 'brawl-round';
  question?: string;
  correctAnswer?: string;
  selectedAnswer?: string;
  p1Categories?: string[];
  p2Categories?: string[];
  p1Correct?: boolean;
  p2Correct?: boolean;
  p1Name?: string;
  p2Name?: string;
  // BUILD 183 round-summary fields (five rounds of five, rising arc).
  roundIndex?: number;
  roundTotal?: number;
  category?: string;
  difficulty?: string;
  p1Hits?: number;
  p2Hits?: number;
  p1Score?: number;
  p2Score?: number;
  events?: string;
  lastCall?: boolean;
};

function cleanName(raw: string | undefined, fallback: string): string {
  const clean = (raw ?? '').replace(/[^\p{L}\p{N} '.-]/gu, '').trim().slice(0, 14);
  return clean || fallback;
}

function playerNames(payload: TriviaCommentaryPayload): { p1: string; p2: string } {
  return { p1: cleanName(payload.p1Name, 'Player One'), p2: cleanName(payload.p2Name, 'Player Two') };
}

// Tiered fallbacks so the host still escalates even when the LLM is quiet.
function getFallbackReply(payload: TriviaCommentaryPayload): string {
  const { p1, p2 } = playerNames(payload);
  if (payload.mode === 'brawl-intro') return `${p1} brought ${payload.p1Categories?.join(', ') || 'mystery categories'}, while ${p2} chose ${payload.p2Categories?.join(', ') || 'more mystery categories'}. Five rounds, five questions each; one tab; no excuses.`;
  if (payload.mode === 'brawl-round') {
    const round = typeof payload.roundIndex === 'number' ? payload.roundIndex : 0;
    const p1Hits = payload.p1Hits ?? 0;
    const p2Hits = payload.p2Hits ?? 0;
    const p1Score = payload.p1Score ?? 0;
    const p2Score = payload.p2Score ?? 0;
    const leader = p1Score === p2Score ? null : p1Score > p2Score ? p1 : p2;
    const roundLine = p1Hits === p2Hits
      ? `${p1} and ${p2} split the round ${p1Hits}-all`
      : `${p1Hits > p2Hits ? p1 : p2} took that round ${Math.max(p1Hits, p2Hits)}-${Math.min(p1Hits, p2Hits)}`;
    if (payload.lastCall) return `LAST CALL. Dead level at ${p1Score} each. Sudden death - the next slip buys the tab.`;
    if (round >= 4) return leader ? `${roundLine}. ${leader} wins the tab, ${p1Score}-${p2Score}. The rematch button is right there.` : `${roundLine}. Dead heat - Chester refuses a draw. LAST CALL.`;
    if (round >= 3) return leader ? `${roundLine}. One round to go and ${leader} holds the tab at ${p1Score}-${p2Score}. The pub is very quiet now.` : `${roundLine}. All square at ${p1Score} with one round to pour. Somebody blink.`;
    if (round >= 1) return leader ? `${roundLine}. ${leader} edges ahead, ${p1Score}-${p2Score}. The heat rises from here.` : `${roundLine}. Level at ${p1Score} apiece and the questions stop being polite.`;
    return leader ? `${roundLine}. ${leader} draws first blood, ${p1Score}-${p2Score}. Early days, loud confidence.` : `${roundLine}. Nothing between them yet. The easy pours are over.`;
  }
  const isCorrect = payload.selectedAnswer === payload.correctAnswer;
  return isCorrect
    ? 'Correct! Chester reluctantly admits that was a proper pub-quiz answer.'
    : `Not quite. The answer was ${payload.correctAnswer || 'hidden behind the bar'}, and Chester has marked it down as a spirited guess.`;
}

function sanitizeReply(raw: string): string {
  return raw.replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
}

export async function POST(request: NextRequest) {
  let payload: TriviaCommentaryPayload = {};
  try {
    payload = await request.json() as TriviaCommentaryPayload;
    if (payload.mode === 'brawl-intro' && (!payload.p1Categories?.length || !payload.p2Categories?.length)) {
      throw new Error('Both category drafts are required');
    }
    if (payload.mode === 'brawl-round' && (typeof payload.p1Hits !== 'number' || typeof payload.p2Hits !== 'number' || !payload.category)) {
      throw new Error('Round summary is required');
    }
    if (!payload.mode && (!payload.question || !payload.correctAnswer || !payload.selectedAnswer)) {
      throw new Error('Question and answers are required');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) throw new Error('GEMINI_API_KEY is not configured');

    const isCorrect = payload.selectedAnswer === payload.correctAnswer;
    const { p1, p2 } = playerNames(payload);
    let brawlInstruction: string;
    if (payload.mode === 'brawl-intro') {
      brawlInstruction = `Deliver a short, roasting game-show introduction for ${p1}'s categories (${payload.p1Categories?.join(', ')}) and ${p2}'s categories (${payload.p2Categories?.join(', ')}). Use their names. Tease the rising five-round arc ahead.`;
    } else if (payload.mode === 'brawl-round') {
      const round = (payload.roundIndex ?? 0) + 1;
      const total = payload.roundTotal ?? 5;
      const events = payload.events ? ` Notable events: ${payload.events}.` : '';
      const heat = payload.lastCall
        ? 'This is LAST CALL - sudden death, maximum drama, the whole pub on its feet.'
        : round >= total
          ? 'This was the FINAL round - give it the big finale send-off, crowning the winner or refusing the draw.'
          : round >= total - 1
            ? 'The tension is peaking - one round left, lean into the drama.'
            : round >= 3
              ? 'The match is hot now - sharpen the teasing.'
              : 'It is still early - warm, playful, confident.';
      brawlInstruction = `React to round ${round} of ${total} (${payload.category}, ${payload.difficulty || 'mixed'} heat). ${p1} answered ${payload.p1Hits ?? 0} of 5 correctly, ${p2} answered ${payload.p2Hits ?? 0}. The score is now ${p1} ${payload.p1Score ?? 0} - ${payload.p2Score ?? 0} ${p2}.${events} ${heat} Praise the leader and lightly mock the trailer, using their names.`;
    } else {
      brawlInstruction = isCorrect ? 'Give begrudging, playful congratulations.' : 'Playfully roast the wrong answer, then state the correct answer.';
    }
    const prompt = `You are Chester, Chess Town's witty pub trivia host. Respond directly in one or two short sentences. ${brawlInstruction} Be funny without insulting either contestant. Never explain your reasoning, mention this prompt, use labels, bullets, markdown, or meta-commentary.

Question: ${payload.question}
Correct answer: ${payload.correctAnswer}
Contestant answer: ${payload.selectedAnswer}`;

    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { responseMimeType: 'text/plain', maxOutputTokens: 1200, thinkingConfig: GEMINI_THINKING },
    });
    const reply = sanitizeReply(result.text ?? '');
    if (!reply) throw new Error('Gemini returned an empty trivia reply');

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[TRIVIA] Commentary generation failed:', { message, error });
    return NextResponse.json({ reply: getFallbackReply(payload), isFallback: true });
  }
}
