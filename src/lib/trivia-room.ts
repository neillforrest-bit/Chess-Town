// Trivia Brawl room logic - host-authoritative, ported from the old serverless
// sync route. The host browser owns the full room (including correct answers);
// guests only ever receive the serialized public view.
export type Player = 'p1' | 'p2';
export type TriviaQuestion = { category: string; question: string; correctAnswer: string; answers: string[] };
export type RoundResult = { correctAnswer: string; p1Correct: boolean; p2Correct: boolean };
export type TriviaRoom = {
  categories: Record<Player, number[]>;
  questionBank: Record<number, TriviaQuestion>;
  questions: TriviaQuestion[];
  answers: Partial<Record<Player, string>>;
  score: Record<Player, number>;
  sabotage: Record<Player, boolean>;
  sabotageTarget: Player | null;
  sabotageRound: number | null;
  hostMessage: string;
  phase: 'draft' | 'intro' | 'question' | 'banter' | 'finished';
  round: number;
  roundResult: RoundResult | null;
  updatedAt: number;
};
export type PublicRoom = Omit<TriviaRoom, 'questions'> & { currentQuestion: Omit<TriviaQuestion, 'correctAnswer'> | null };

const MAX_CATEGORIES = 3;
const TOTAL_ROUNDS = 6;

function decodeHtml(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

// opentdb rate-limits hard per IP (one call per ~5s) - a parallel burst fails,
// which is exactly what killed the category lock for real players. Fetch
// sequentially with spacing and retry instead.
let lastQuestionFetch = 0;
async function fetchQuestion(categoryId: number): Promise<TriviaQuestion> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const wait = Math.max(0, 5300 - (Date.now() - lastQuestionFetch));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastQuestionFetch = Date.now();
    try {
      const response = await fetch(`https://opentdb.com/api.php?amount=1&type=multiple&category=${categoryId}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) continue;
      const payload = await response.json() as { response_code: number; results: Array<{ category: string; question: string; correct_answer: string; incorrect_answers: string[] }> };
      const source = payload.results?.[0];
      if (payload.response_code !== 0 || !source || source.incorrect_answers.length !== 3) continue;
      const correctAnswer = decodeHtml(source.correct_answer);
      return { category: decodeHtml(source.category), question: decodeHtml(source.question), correctAnswer, answers: shuffle([correctAnswer, ...source.incorrect_answers.map(decodeHtml)]) };
    } catch { /* retry below */ }
  }
  throw new Error('The quizmaster is overwhelmed - lock your categories again in a moment');
}

export function createRoom(): TriviaRoom {
  return { categories: { p1: [], p2: [] }, questionBank: {}, questions: [], answers: {}, score: { p1: 0, p2: 0 }, sabotage: { p1: false, p2: false }, sabotageTarget: null, sabotageRound: null, hostMessage: 'Choose your categories and Chester will open the Brawl.', phase: 'draft', round: 0, roundResult: null, updatedAt: Date.now() };
}

export function serializeRoom(room: TriviaRoom): PublicRoom {
  const question = room.questions[room.round];
  const { questions: _questions, ...rest } = room;
  return { ...rest, currentQuestion: question ? { category: question.category, question: question.question, answers: question.answers } : null };
}

export type RoomAction = { categories?: unknown; answer?: unknown; sabotage?: unknown; advance?: unknown; start?: unknown; hostMessage?: unknown };

export async function applyRoomAction(room: TriviaRoom, player: Player, body: RoomAction): Promise<{ room: TriviaRoom; error?: string; justLocked?: boolean }> {
  const next: TriviaRoom = { ...room, categories: { ...room.categories }, answers: { ...room.answers }, score: { ...room.score }, sabotage: { ...room.sabotage } };
  let justLocked = false;

  if (Array.isArray(body.categories) && next.phase === 'draft') {
    const picked = body.categories.filter((category): category is number => Number.isInteger(category) && (category as number) > 0).slice(0, MAX_CATEGORIES);
    if (picked.length !== MAX_CATEGORIES) return { room, error: 'Choose exactly three categories' };
    const bank = { ...next.questionBank };
    try {
      for (const categoryId of picked) {
        if (!bank[categoryId]) bank[categoryId] = await fetchQuestion(categoryId);
      }
    } catch (error) {
      return { room, error: error instanceof Error ? error.message : 'Could not prepare questions' };
    }
    next.questionBank = bank;
    next.categories[player] = picked;
    if (next.categories.p1.length === MAX_CATEGORIES && next.categories.p2.length === MAX_CATEGORIES && !next.questions.length) {
      const ids = [...next.categories.p1, ...next.categories.p2];
      next.questions = Array.from({ length: TOTAL_ROUNDS }, (_, index) => bank[ids[index % ids.length]]);
      next.phase = 'intro';
      justLocked = true;
    }
  }

  if (typeof body.answer === 'string' && next.phase === 'question' && !next.answers[player]) {
    next.answers[player] = body.answer;
    const question = next.questions[next.round];
    if (next.answers.p1 && next.answers.p2 && question) {
      const p1Correct = next.answers.p1 === question.correctAnswer;
      const p2Correct = next.answers.p2 === question.correctAnswer;
      if (p1Correct) next.score.p1 += 1;
      if (p2Correct) next.score.p2 += 1;
      next.roundResult = { correctAnswer: question.correctAnswer, p1Correct, p2Correct };
      next.phase = 'banter';
    }
  }

  if (typeof body.hostMessage === 'string' && (next.phase === 'intro' || next.phase === 'banter')) next.hostMessage = body.hostMessage.slice(0, 600);
  if (body.start === true && player === 'p1' && next.phase === 'intro') next.phase = 'question';
  if (body.sabotage === true && next.phase === 'question' && !next.sabotage[player] && next.round < TOTAL_ROUNDS - 1) {
    next.sabotage[player] = true;
    next.sabotageTarget = player === 'p1' ? 'p2' : 'p1';
    next.sabotageRound = next.round + 1;
  }
  if (body.advance === true && player === 'p1' && next.phase === 'banter') {
    next.round += 1;
    next.answers = {};
    next.roundResult = null;
    next.hostMessage = '';
    next.phase = next.round >= TOTAL_ROUNDS ? 'finished' : 'question';
  }

  next.updatedAt = Date.now();
  return { room: next, justLocked };
}
