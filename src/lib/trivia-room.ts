// Trivia Brawl room logic - host-authoritative, ported from the old serverless
// sync route. The host browser owns the full room (including correct answers);
// guests only ever receive the serialized public view.
// BUILD 183: wraps the shared match engine (trivia-match.ts): 5 rounds x 5.
import {
  MATCH_ROUNDS, advanceMatch, applyAnswer, applyWildcard, currentQuestionOf, planMatch,
  viewerQuestion, type MatchState, type Player, type WildcardId,
} from './trivia-match';

export type { MatchQuestion as TriviaQuestion, MatchRound, MatchState, Player, QuestionResult, WildcardId } from './trivia-match';
export { MATCH_ROUNDS, QUESTIONS_PER_ROUND, currentQuestionOf, isPowerRound, lastCallActive, loadAllRounds, markRoundLoaded, roundSummary, doubleKey } from './trivia-match';

export type TriviaRoom = {
  categories: Record<Player, number[]>;
  names: Record<Player, string>;
  power: Record<Player, number>;
  match: MatchState | null;
  hostMessage: string;
  phase: 'draft' | 'intro' | 'question' | 'reveal' | 'banter' | 'finished';
  updatedAt: number;
};

export type RoundMeta = { categoryName: string; difficulty: string; ready: boolean; count: number };
export type PublicRoom = Omit<TriviaRoom, 'match'> & {
  roundMeta: RoundMeta[] | null;
  round: number;
  qIndex: number;
  score: Record<Player, number>;
  streak: Record<Player, number>;
  answers: Partial<Record<Player, string>>;
  cardsUsed: MatchState['cardsUsed'] | null;
  activeCards: MatchState['activeCards'] | null;
  doubleQuestions: string[];
  powerRoundFor: Player[];
  isDoubleQuestion: boolean;
  result: MatchState['result'];
  lastCall: boolean;
  currentQuestion: ReturnType<typeof viewerQuestion>;
};

const MAX_CATEGORIES = 3;

export function createRoom(): TriviaRoom {
  return {
    categories: { p1: [], p2: [] },
    names: { p1: 'PLAYER 1', p2: 'PLAYER 2' },
    power: { p1: 0, p2: 0 },
    match: null,
    hostMessage: 'Choose your categories and Chester will open the Brawl.',
    phase: 'draft',
    updatedAt: Date.now(),
  };
}

// Per-viewer serialization: the guest's copy hides correct answers, trims their
// fifty-fifty and dresses their sabotaged question in Shakespearean disguise.
export function serializeRoom(room: TriviaRoom, viewer: Player): PublicRoom {
  const { match, ...rest } = room;
  if (!match) {
    return { ...rest, roundMeta: null, round: 0, qIndex: 0, score: { p1: 0, p2: 0 }, streak: { p1: 0, p2: 0 }, answers: {}, cardsUsed: null, activeCards: null, doubleQuestions: [], powerRoundFor: [], isDoubleQuestion: false, result: null, lastCall: false, currentQuestion: null };
  }
  const round = match.rounds[match.round];
  return {
    ...rest,
    roundMeta: match.rounds.map((item) => ({ categoryName: item.categoryName, difficulty: item.difficulty, ready: item.ready, count: item.questions.length })),
    round: match.round,
    qIndex: match.qIndex,
    score: match.score,
    streak: match.streak,
    answers: match.answers,
    cardsUsed: match.cardsUsed,
    activeCards: match.activeCards,
    doubleQuestions: match.doubleQuestions,
    powerRoundFor: (['p1', 'p2'] as Player[]).filter((player) => round && match.power[player] === round.categoryId),
    isDoubleQuestion: match.doubleQuestions.includes(`${match.round}:${match.qIndex}`),
    result: match.result,
    lastCall: match.lastCall,
    currentQuestion: viewerQuestion(match, viewer),
  };
}

export type RoomAction = { rematch?: unknown; categories?: unknown; power?: unknown; answer?: unknown; wildcard?: unknown; advance?: unknown; start?: unknown; hostMessage?: unknown; name?: unknown };

export async function applyRoomAction(room: TriviaRoom, player: Player, body: RoomAction): Promise<{ room: TriviaRoom; error?: string; justLocked?: boolean }> {
  const next: TriviaRoom = { ...room, categories: { ...room.categories }, names: { ...room.names }, power: { ...room.power } };
  let justLocked = false;

  if (body.rematch === true && next.phase === 'finished') {
    const fresh = createRoom();
    fresh.names = { ...next.names };
    fresh.hostMessage = '';
    return { room: fresh };
  }

  if (typeof body.name === 'string') {
    const clean = body.name.replace(/[^\p{L}\p{N} '.-]/gu, '').trim().slice(0, 14);
    if (clean) next.names[player] = clean;
  }

  if (Array.isArray(body.categories) && next.phase === 'draft') {
    const picked = body.categories.filter((category): category is number => Number.isInteger(category) && category !== 0).slice(0, MAX_CATEGORIES);
    if (picked.length !== MAX_CATEGORIES) return { room, error: 'Choose exactly three categories' };
    const power = Number.isInteger(body.power) && picked.includes(body.power as number) ? (body.power as number) : picked[0];
    next.categories[player] = picked;
    next.power[player] = power;
    if (next.categories.p1.length === MAX_CATEGORIES && next.categories.p2.length === MAX_CATEGORIES && !next.match) {
      // Category names resolve at the caller; ids are planned here, names patched in via planCategories.
      return { room: next, justLocked: true, needsPlan: true } as { room: TriviaRoom; justLocked: boolean; needsPlan: boolean };
    }
  }

  if (typeof body.answer === 'string' && next.match && next.phase === 'question') {
    const applied = applyAnswer(next.match, player, body.answer);
    if (applied.error) return { room, error: applied.error };
    next.match = applied.state;
    next.phase = applied.state.phase;
  }

  if (typeof body.wildcard === 'string' && next.match) {
    const applied = applyWildcard(next.match, player, body.wildcard as WildcardId);
    if (applied.error) return { room, error: applied.error };
    next.match = applied.state;
  }

  if (typeof body.hostMessage === 'string' && (next.phase === 'intro' || next.phase === 'banter')) next.hostMessage = body.hostMessage.slice(0, 600);

  if (body.start === true && player === 'p1' && next.phase === 'intro') {
    if (!next.match || !next.match.rounds[0]?.ready) return { room, error: 'Chester is still scribbling the first round.' };
    next.phase = 'question';
  }

  if (body.advance === true && player === 'p1' && next.match && (next.phase === 'reveal' || next.phase === 'banter')) {
    const advanced = await advanceMatch(next.match);
    if (advanced.error) return { room, error: advanced.error };
    next.match = advanced.state;
    next.phase = advanced.state.phase;
    next.hostMessage = '';
  }

  next.updatedAt = Date.now();
  return { room: next, justLocked };
}

// Builds the match plan once both drafts are in; the first round loads before the
// intro opens, the rest pour in the background via loadAllRounds.
export function planRoomMatch(room: TriviaRoom, nameOf: (categoryId: number) => string | undefined): TriviaRoom {
  if (room.match) return room;
  const pick = (ids: number[]) => ids.map((id) => ({ id, name: nameOf(id) || (id < 0 ? 'House Special' : `Category ${id}`) }));
  const match = planMatch(pick(room.categories.p1), pick(room.categories.p2), room.power);
  return { ...room, match };
}

export const TOTAL_ROUNDS = MATCH_ROUNDS;
