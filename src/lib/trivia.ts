import { LOCAL_QUESTIONS, localCategoryName } from './trivia-local';

export type TriviaQuestion = {
  source?: 'opentdb' | 'house';
  category: string;
  difficulty: string;
  question: string;
  correctAnswer: string;
  answers: string[];
};

type OpenTriviaResponse = {
  response_code: number;
  results: Array<{
    category: string;
    difficulty: string;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
  }>;
};

function decodeHtml(value: string): string {
  if (typeof document === 'undefined') return value;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

const cache: Record<string, TriviaQuestion[]> = {};
const pending: Record<string, Promise<TriviaQuestion[]> | undefined> = {};
let cooldownUntil = 0;
const seen = new Set<string>();
function houseQuestion(difficulty: string): TriviaQuestion {
  const all = Object.entries(LOCAL_QUESTIONS).filter(([id]) => Number(id) >= -12 && Number(id) <= -1)
    .flatMap(([id, pack]) => pack.filter(q => !q.level || !difficulty || q.level === difficulty)
      .map(q => ({ category: localCategoryName(Number(id)), difficulty: q.level || 'house mix', question:q.question,
        correctAnswer:q.correct, answers:shuffle([q.correct,...q.wrong]), source:'house' as const })));
  let fresh = all.filter(q => !seen.has(q.question));
  if (!fresh.length) { seen.clear(); fresh = all; }
  const q = fresh[Math.floor(Math.random()*fresh.length)];
  seen.add(q.question); return q;
}
export async function fetchTriviaQuestion(difficulty = ""): Promise<TriviaQuestion> {
  const level = ['easy','medium','hard'].includes(difficulty) ? difficulty : '';
  const queued = cache[level]?.shift(); if (queued) { seen.add(queued.question); return queued; }
  if (Date.now() < cooldownUntil) return houseQuestion(level);
  try {
    // One small batch avoids rate-limiting a new upstream request on every Next tap.
    if (!pending[level]) pending[level] = (async () => {
      const response = await fetch('https://opentdb.com/api.php?amount=10&type=multiple'+(level?'&difficulty='+level:''), { signal:AbortSignal.timeout(3500) });
      if (!response.ok) throw new Error('Trivia service request failed');
      const payload = await response.json() as OpenTriviaResponse;
      if (payload.response_code !== 0 || !Array.isArray(payload.results) || !payload.results.length) throw new Error('Trivia service returned no questions');
      return payload.results.filter(q => q.incorrect_answers?.length === 3).map(q => ({
        category:decodeHtml(q.category), difficulty:q.difficulty, question:decodeHtml(q.question),
        correctAnswer:decodeHtml(q.correct_answer), answers:shuffle([q.correct_answer,...q.incorrect_answers].map(decodeHtml)), source:'opentdb' as const
      })).filter(q => !seen.has(q.question));
    })();
    cache[level] = await pending[level]!;
    const next = cache[level].shift(); if (!next) throw new Error('No fresh questions');
    seen.add(next.question); return next;
  } catch {
    // Upstream code 5 / 429 / bad JSON / offline never ends the quiz.
    cooldownUntil = Date.now()+60000;
    return houseQuestion(level);
  } finally { delete pending[level]; }
}
