import { NextRequest, NextResponse } from 'next/server';

type Player = 'p1' | 'p2';
type TriviaQuestion = { category: string; question: string; correctAnswer: string; answers: string[] };
type PublicQuestion = Omit<TriviaQuestion, 'correctAnswer'>;
type RoundResult = { correctAnswer: string; p1Correct: boolean; p2Correct: boolean };
type TriviaRoom = {
  categories: Record<Player, number[]>;
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

type OpenTriviaResponse = {
  response_code: number;
  results: Array<{ category: string; question: string; correct_answer: string; incorrect_answers: string[] }>;
};

const rooms = new Map<string, TriviaRoom>();
const MAX_CATEGORIES = 3;
const TOTAL_ROUNDS = 6;

function validMatchId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]{6,24}$/i.test(value);
}

function isPlayer(value: unknown): value is Player {
  return value === 'p1' || value === 'p2';
}

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

async function fetchQuestion(categoryId: number): Promise<TriviaQuestion> {
  const response = await fetch(`https://opentdb.com/api.php?amount=1&type=multiple&category=${categoryId}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Trivia question request failed');
  const payload = await response.json() as OpenTriviaResponse;
  const source = payload.results[0];
  if (payload.response_code !== 0 || !source || source.incorrect_answers.length !== 3) throw new Error('Trivia category has no question available');
  const correctAnswer = decodeHtml(source.correct_answer);
  return { category: decodeHtml(source.category), question: decodeHtml(source.question), correctAnswer, answers: shuffle([correctAnswer, ...source.incorrect_answers.map(decodeHtml)]) };
}

async function createQuestions(categoryIds: number[]): Promise<TriviaQuestion[]> {
  const selectedIds = Array.from({ length: TOTAL_ROUNDS }, (_, index) => categoryIds[index % categoryIds.length]);
  return Promise.all(selectedIds.map(fetchQuestion));
}

function serialize(room: TriviaRoom) {
  const question = room.questions[room.round];
  const publicQuestion: PublicQuestion | null = question ? { category: question.category, question: question.question, answers: question.answers } : null;
  return { ...room, currentQuestion: publicQuestion, questions: undefined };
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { matchId?: unknown };
  if (!validMatchId(body.matchId)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
  const room: TriviaRoom = { categories: { p1: [], p2: [] }, questions: [], answers: {}, score: { p1: 0, p2: 0 }, sabotage: { p1: false, p2: false }, sabotageTarget: null, sabotageRound: null, hostMessage: 'Choose your categories and Chester will open the Brawl.', phase: 'draft', round: 0, roundResult: null, updatedAt: Date.now() };
  rooms.set(body.matchId, room);
  return NextResponse.json(serialize(room), { status: 201 });
}

export function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get('match');
  if (!validMatchId(matchId)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
  const room = rooms.get(matchId);
  return room ? NextResponse.json(serialize(room)) : NextResponse.json({ error: 'Trivia Brawl room not found' }, { status: 404 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json() as { matchId?: unknown; player?: unknown; categories?: unknown; answer?: unknown; sabotage?: unknown; advance?: unknown; start?: unknown; hostMessage?: unknown };
  if (!validMatchId(body.matchId) || !isPlayer(body.player)) return NextResponse.json({ error: 'Invalid match ID or player' }, { status: 400 });
  const room = rooms.get(body.matchId);
  if (!room) return NextResponse.json({ error: 'Trivia Brawl room not found' }, { status: 404 });
  const player = body.player;

  if (Array.isArray(body.categories) && room.phase === 'draft') {
    const categories = body.categories.filter((category): category is number => Number.isInteger(category) && category > 0).slice(0, MAX_CATEGORIES);
    if (categories.length !== MAX_CATEGORIES) return NextResponse.json({ error: 'Choose exactly three categories' }, { status: 400 });
    room.categories[player] = categories;
    if (room.categories.p1.length === MAX_CATEGORIES && room.categories.p2.length === MAX_CATEGORIES && !room.questions.length) {
      try {
        room.questions = await createQuestions([...room.categories.p1, ...room.categories.p2]);
        room.phase = 'intro';
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not prepare questions' }, { status: 502 });
      }
    }
  }

  if (typeof body.answer === 'string' && room.phase === 'question' && !room.answers[player]) {
    room.answers[player] = body.answer;
    const question = room.questions[room.round];
    if (room.answers.p1 && room.answers.p2 && question) {
      const p1Correct = room.answers.p1 === question.correctAnswer;
      const p2Correct = room.answers.p2 === question.correctAnswer;
      if (p1Correct) room.score.p1 += 1;
      if (p2Correct) room.score.p2 += 1;
      room.roundResult = { correctAnswer: question.correctAnswer, p1Correct, p2Correct };
      room.phase = 'banter';
    }
  }

  if (typeof body.hostMessage === 'string' && (room.phase === 'intro' || room.phase === 'banter')) room.hostMessage = body.hostMessage.slice(0, 600);
  if (body.start === true && player === 'p1' && room.phase === 'intro') room.phase = 'question';
  if (body.sabotage === true && room.phase === 'question' && !room.sabotage[player] && room.round < TOTAL_ROUNDS - 1) {
    room.sabotage[player] = true;
    room.sabotageTarget = player === 'p1' ? 'p2' : 'p1';
    room.sabotageRound = room.round + 1;
  }
  if (body.advance === true && player === 'p1' && room.phase === 'banter') {
    room.round += 1;
    room.answers = {};
    room.roundResult = null;
    room.hostMessage = '';
    room.phase = room.round >= TOTAL_ROUNDS ? 'finished' : 'question';
  }

  room.updatedAt = Date.now();
  return NextResponse.json(serialize(room));
}
