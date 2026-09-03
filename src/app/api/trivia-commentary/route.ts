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
};

function getFallbackReply(payload: TriviaCommentaryPayload): string {
  if (payload.mode === 'brawl-intro') return `Player One brought ${payload.p1Categories?.join(', ') || 'mystery categories'}, while Player Two chose ${payload.p2Categories?.join(', ') || 'more mystery categories'}. Six rounds; one tab; no excuses.`;
  if (payload.mode === 'brawl-round') {
    if (payload.p1Correct === payload.p2Correct) return `The answer was ${payload.correctAnswer || 'a closely guarded secret'}. A tie round: Chester remains unimpressed by both camps.`;
    return `The answer was ${payload.correctAnswer || 'a closely guarded secret'}. Player ${payload.p1Correct ? 'One' : 'Two'} takes the point while the other studies the menu.`;
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
    if (payload.mode === 'brawl-round' && (!payload.question || !payload.correctAnswer || typeof payload.p1Correct !== 'boolean' || typeof payload.p2Correct !== 'boolean')) {
      throw new Error('Round results are required');
    }
    if (!payload.mode && (!payload.question || !payload.correctAnswer || !payload.selectedAnswer)) {
      throw new Error('Question and answers are required');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) throw new Error('GEMINI_API_KEY is not configured');

    const isCorrect = payload.selectedAnswer === payload.correctAnswer;
    const brawlInstruction = payload.mode === 'brawl-intro'
      ? `Deliver a short, roasting game-show introduction for Player One's categories (${payload.p1Categories?.join(', ')}) and Player Two's categories (${payload.p2Categories?.join(', ')}).`
      : payload.mode === 'brawl-round'
        ? `React to the completed round. Player One was ${payload.p1Correct ? 'correct' : 'wrong'} and Player Two was ${payload.p2Correct ? 'correct' : 'wrong'}. Praise the winner and lightly mock the loser, then reveal the correct answer.`
        : isCorrect ? 'Give begrudging, playful congratulations.' : 'Playfully roast the wrong answer, then state the correct answer.';
    const prompt = `You are Chester, Chess Town's witty pub trivia host. Respond directly in one or two short sentences. ${brawlInstruction} Be funny without insulting either contestant. Never explain your reasoning, mention this prompt, use labels, bullets, markdown, or meta-commentary.

Question: ${payload.question}
Correct answer: ${payload.correctAnswer}
Contestant answer: ${payload.selectedAnswer}`;

    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { responseMimeType: 'text/plain', maxOutputTokens: 160, thinkingConfig: { thinkingBudget: 0 } },
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
