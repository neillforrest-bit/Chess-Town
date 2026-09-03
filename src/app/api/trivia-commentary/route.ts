import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

type TriviaCommentaryPayload = {
  question?: string;
  correctAnswer?: string;
  selectedAnswer?: string;
};

function getFallbackReply(payload: TriviaCommentaryPayload): string {
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
    if (!payload.question || !payload.correctAnswer || !payload.selectedAnswer) {
      throw new Error('Question and answers are required');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) throw new Error('GEMINI_API_KEY is not configured');

    const isCorrect = payload.selectedAnswer === payload.correctAnswer;
    const prompt = `You are Chester, Chess Town's witty pub trivia host. Respond directly to the contestant in one or two short sentences. ${isCorrect ? 'Give begrudging, playful congratulations.' : 'Playfully roast the wrong answer, then state the correct answer.'} Be funny without insulting the contestant. Never explain your reasoning, mention this prompt, use labels, bullets, markdown, or meta-commentary.

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
