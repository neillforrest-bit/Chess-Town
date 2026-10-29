// Trivia Town match engine - BUILD 184: five rounds of five shared questions,
// rising heat, wildcards, doubles, streaks, a FLASH FINALE after every round,
// Chester surprises (roulette bell + on the house), sudden-death LAST CALL.
// Shared by Trivia Brawl (host-authoritative p2p room) and Pass & Play (one phone).
// Cost profile: OpenTDB community API (free) + hand-written house packs. No LLM here.
import { LOCAL_CATEGORIES, localCategoryName, pickLocalQuestion, pickRiddle, pickTeaser, pickDuelBoard, type DuelBoard } from './trivia-local';

export type Player = 'p1' | 'p2';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type WildcardId = 'shakespeare' | 'fiftyfifty' | 'doubledown' | 'pickpocket';
export type AnswerCardId = 'fiftyfifty' | 'doubledown' | 'pickpocket';

export const MATCH_ROUNDS = 5;
export const QUESTIONS_PER_ROUND = 5;
export const DIFFICULTY_LADDER: Difficulty[] = ['easy', 'easy', 'medium', 'medium', 'hard'];

export type CategoryPick = { id: number; name: string };
export type MatchQuestion = { category: string; question: string; correctAnswer: string; answers: string[]; difficulty?: string; roulette?: boolean };
export type MatchRound = { categoryId: number; categoryName: string; difficulty: Difficulty; questions: MatchQuestion[]; ready: boolean };
export type QuestionResult = {
  correctAnswer: string;
  p1Correct: boolean;
  p2Correct: boolean;
  p1Points: number;
  p2Points: number;
  double: boolean;
  roulette?: boolean;
  powerPlayers: Player[];
  p1StreakBonus: boolean;
  p2StreakBonus: boolean;
  stolenFrom: Player | null;
  flash?: FlashType;
  onTheHouse?: boolean;
};

export type FlashType = 'riddle' | 'teaser' | 'fastest' | 'duel' | 'lastorders';
export type FlashState = {
  type: FlashType;
  question?: MatchQuestion;              // riddle / teaser / fastest / lastorders
  board?: DuelBoard;                     // duel
  answers: Partial<Record<Player, string>>;
  order: Player[];                       // answer arrival order (host-authoritative)
  turn: Player;                          // duel: whose pick
  strikes: Record<Player, number>;
  picks: Record<Player, string[]>;       // duel: correct picks per player
  picked: string[];                      // duel: every option tapped so far
  done: boolean;
  winner: Player | 'both' | 'none' | null;
  resolvedNote?: string;
};
export type MatchState = {
  power: Record<Player, number>;
  rounds: MatchRound[];
  round: number;
  qIndex: number;
  phase: 'question' | 'reveal' | 'flash' | 'flashReveal' | 'banter' | 'finished';
  answers: Partial<Record<Player, string>>;
  score: Record<Player, number>;
  streak: Record<Player, number>;
  cardsUsed: Record<Player, Record<WildcardId, boolean>>;
  activeCards: Record<Player, Partial<Record<AnswerCardId, boolean>>>;
  shakespeareTarget: Player | null;
  shakespeareRound: number | null;
  result: QuestionResult | null;
  roundResults: QuestionResult[];
  doubleQuestions: string[];
  rouletteKey: string | null;
  onTheHouseKey: string | null;
  flashOrder: FlashType[];
  flash: FlashState | null;
  history: Array<QuestionResult & { round: number }>;
  lastCall: boolean;
};

export function decodeHtml(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

// --- Shakespearean disguise: the sabotage now actually disguises the question. ---
const SHAKESPEARE_SWAPS: Array<[RegExp, string]> = [
  [/\byour\b/gi, 'thy'], [/\byours\b/gi, 'thine'], [/\byou\b/gi, 'thou'],
  [/\bare\b/gi, 'art'], [/\bwas\b/gi, 'wast'], [/\bwere\b/gi, 'wert'],
  [/\bhas\b/gi, 'hath'], [/\bdoes\b/gi, 'doth'], [/\bthe\b/gi, 'ye'],
];
export function shakespeareify(text: string): string {
  let out = text;
  for (const [pattern, swap] of SHAKESPEARE_SWAPS) out = out.replace(pattern, swap);
  return `Hear ye: ${out}`;
}

// --- Match planning ---
export function doubleKey(round: number, qIndex: number): string {
  return `${round}:${qIndex}`;
}

export function planMatch(p1Categories: CategoryPick[], p2Categories: CategoryPick[], power: Record<Player, number>): MatchState {
  // Both players' POWER categories always serve a round - a power round that sits
  // out would silently rig the match. The remaining rounds come from the rest of
  // the draft; heavy overlap just means a category hosts more than one round.
  const byId = new Map<number, CategoryPick>();
  for (const pick of [...p1Categories, ...p2Categories]) if (!byId.has(pick.id)) byId.set(pick.id, pick);
  const must = [...new Set([power.p1, power.p2])].filter((id) => byId.has(id));
  const rest = shuffle([...byId.keys()].filter((id) => !must.includes(id)));
  const chosen = [...must, ...rest];
  while (chosen.length < MATCH_ROUNDS) chosen.push(chosen[chosen.length % Math.max(1, chosen.length)]);
  const ordered = shuffle(chosen.slice(0, MATCH_ROUNDS).map((id) => byId.get(id) as CategoryPick));
  const rounds: MatchRound[] = ordered.map((pick, index) => ({
    categoryId: pick.id,
    categoryName: pick.name,
    difficulty: DIFFICULTY_LADDER[index],
    questions: [],
    ready: false,
  }));
  // Two random questions a match pour double points: one early, one late.
  const early = doubleKey(1 + Math.floor(Math.random() * 2), Math.floor(Math.random() * QUESTIONS_PER_ROUND));
  const late = doubleKey(3 + Math.floor(Math.random() * 2), Math.floor(Math.random() * QUESTIONS_PER_ROUND));
  // CHESTER'S ROULETTE: one bell-ringer mid-match (rounds 2-3 so it always lands
  // before the business end), a mystery house pour from a category nobody drafted,
  // worth triple. Kept clear of the double slots.
  let rouletteKey: string | null = null;
  for (let tries = 0; tries < 12; tries += 1) {
    const candidate = doubleKey(1 + Math.floor(Math.random() * 2), Math.floor(Math.random() * QUESTIONS_PER_ROUND));
    if (candidate !== early && candidate !== late) { rouletteKey = candidate; break; }
  }
  // ON THE HOUSE: once a match, Chester buys a round - a free point each,
  // landing late enough to sting (rounds 3-5), clear of the bell and the doubles.
  let onTheHouseKey: string | null = null;
  for (let tries = 0; tries < 12; tries += 1) {
    const candidate = doubleKey(2 + Math.floor(Math.random() * 3), Math.floor(Math.random() * QUESTIONS_PER_ROUND));
    if (candidate !== early && candidate !== late && candidate !== rouletteKey) { onTheHouseKey = candidate; break; }
  }
  return {
    power,
    rounds,
    round: 0,
    qIndex: 0,
    phase: 'question',
    answers: {},
    score: { p1: 0, p2: 0 },
    streak: { p1: 0, p2: 0 },
    cardsUsed: { p1: { shakespeare: false, fiftyfifty: false, doubledown: false, pickpocket: false }, p2: { shakespeare: false, fiftyfifty: false, doubledown: false, pickpocket: false } },
    activeCards: { p1: {}, p2: {} },
    shakespeareTarget: null,
    shakespeareRound: null,
    result: null,
    roundResults: [],
    doubleQuestions: [early, late],
    rouletteKey,
    onTheHouseKey,
    flashOrder: shuffle(['riddle', 'teaser', 'fastest', 'duel', 'lastorders'] as FlashType[]),
    flash: null,
    history: [],
    lastCall: false,
  };
}

export function usedQuestionTexts(state: MatchState): Set<string> {
  const used = new Set<string>();
  for (const round of state.rounds) for (const question of round.questions) used.add(question.question);
  return used;
}

export function currentQuestionOf(state: MatchState): MatchQuestion | null {
  return state.rounds[state.round]?.questions[state.qIndex] || null;
}

// --- Question fetching. OpenTDB rate-limits hard per IP (one call per ~5s, verified
// response_code 5 on a 2s burst), so every fetch goes through one shared spaced lane.
// Batched amount=5 keeps a 25-question match at five calls - the same count the old
// 5-question match needed. House packs fill any gap so a match never stalls.
let lastFetchAt = 0;
async function spacedJson(url: string): Promise<{ response_code: number; results: Array<{ category: string; difficulty: string; question: string; correct_answer: string; incorrect_answers: string[] }> } | null> {
  const wait = Math.max(0, 5300 - (Date.now() - lastFetchAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastFetchAt = Date.now();
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(9000) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function fromOpenTdb(source: { category: string; difficulty: string; question: string; correct_answer: string; incorrect_answers: string[] }): MatchQuestion {
  const correctAnswer = decodeHtml(source.correct_answer);
  return {
    category: decodeHtml(source.category),
    difficulty: source.difficulty,
    question: decodeHtml(source.question),
    correctAnswer,
    answers: shuffle([correctAnswer, ...source.incorrect_answers.map(decodeHtml)]),
  };
}

function fromHouse(categoryId: number, source: { question: string; correct: string; wrong: [string, string, string] }): MatchQuestion {
  return { category: localCategoryName(categoryId), difficulty: 'house', question: source.question, correctAnswer: source.correct, answers: shuffle([source.correct, ...source.wrong]) };
}

function drawHouseQuestions(categoryId: number, count: number, exclude: Set<string>): MatchQuestion[] {
  const drawn: MatchQuestion[] = [];
  for (let tries = 0; drawn.length < count && tries < count * 8; tries += 1) {
    const source = pickLocalQuestion(categoryId);
    if (!source) break;
    if (exclude.has(source.question) || drawn.some((item) => item.question === source.question)) continue;
    drawn.push(fromHouse(categoryId, source));
  }
  return drawn;
}

function drawHouseMixed(count: number, exclude: Set<string>): MatchQuestion[] {
  const drawn: MatchQuestion[] = [];
  const ids = shuffle(LOCAL_CATEGORIES.map((category) => category.id));
  for (let tries = 0; drawn.length < count && tries < count * 10; tries += 1) {
    const id = ids[tries % ids.length];
    const source = pickLocalQuestion(id);
    if (!source) continue;
    if (exclude.has(source.question) || drawn.some((item) => item.question === source.question)) continue;
    drawn.push(fromHouse(id, source));
  }
  return drawn;
}

export async function fetchRoundQuestions(categoryId: number, difficulty: Difficulty, exclude: Set<string>, count = QUESTIONS_PER_ROUND): Promise<MatchQuestion[]> {
  if (categoryId < 0) {
    const drawn = drawHouseQuestions(categoryId, count, exclude);
    return drawn.length >= count ? drawn : [...drawn, ...drawHouseMixed(count - drawn.length, new Set([...exclude, ...drawn.map((q) => q.question)]))];
  }
  const picked: MatchQuestion[] = [];
  const seen = new Set<string>(exclude);
  const take = (payload: Awaited<ReturnType<typeof spacedJson>>) => {
    if (!payload || payload.response_code !== 0) return;
    for (const source of payload.results || []) {
      if (picked.length >= count) break;
      if (!source || source.incorrect_answers.length !== 3) continue;
      const question = fromOpenTdb(source);
      if (seen.has(question.question)) continue;
      seen.add(question.question);
      picked.push(question);
    }
  };
  // Preferred pour: five at the round's heat in one call.
  take(await spacedJson(`https://opentdb.com/api.php?amount=${count}&type=multiple&category=${categoryId}&difficulty=${difficulty}`));
  // Small category shelves run dry at one heat - top up at any heat rather than stall.
  if (picked.length < count) take(await spacedJson(`https://opentdb.com/api.php?amount=${count}&type=multiple&category=${categoryId}`));
  if (picked.length < count) picked.push(...drawHouseMixed(count - picked.length, seen));
  return picked.slice(0, count);
}

export async function fetchLastCallQuestion(exclude: Set<string>): Promise<MatchQuestion> {
  const seen = new Set<string>(exclude);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const payload = await spacedJson('https://opentdb.com/api.php?amount=1&type=multiple&difficulty=hard');
    const source = payload?.response_code === 0 ? payload.results?.[0] : null;
    if (source && source.incorrect_answers.length === 3) {
      const question = fromOpenTdb(source);
      if (!seen.has(question.question)) return question;
    }
  }
  const house = drawHouseMixed(1, seen);
  if (house.length) return house[0];
  throw new Error('The quizmaster is out of deciders - take the draw and rematch.');
}

// Loads every unready round in order, reporting each as it lands so callers can
// merge it into their latest state (never clobber answers that arrived meanwhile).
export async function loadAllRounds(state: MatchState, onRoundReady: (roundIndex: number, questions: MatchQuestion[]) => void): Promise<void> {
  const exclude = usedQuestionTexts(state);
  for (let index = 0; index < state.rounds.length; index += 1) {
    const round = state.rounds[index];
    if (round.ready) continue;
    const questions = await fetchRoundQuestions(round.categoryId, round.difficulty, exclude);
    for (const question of questions) exclude.add(question.question);
    onRoundReady(index, questions);
  }
}

export function markRoundLoaded(state: MatchState, roundIndex: number, questions: MatchQuestion[]): MatchState {
  if (!questions.length) return state;
  const rounds = state.rounds.map((round, index) => (index === roundIndex ? { ...round, questions, ready: true } : round));
  return { ...state, rounds };
}

// --- Scoring ---
const MAX_MULTIPLIER = 4;
const MAX_ROULETTE_MULTIPLIER = 6;

export function playerMultiplier(state: MatchState, player: Player, roundIndex: number, qIndex: number): number {
  const round = state.rounds[roundIndex];
  if (!round) return 1;
  const question = round.questions[qIndex];
  if (question?.roulette) {
    let bell = 3;
    if (state.activeCards[player]?.doubledown) bell *= 2;
    return Math.min(MAX_ROULETTE_MULTIPLIER, bell);
  }
  let multiplier = 1;
  if (state.doubleQuestions.includes(doubleKey(roundIndex, qIndex))) multiplier *= 2;
  if (state.power[player] === round.categoryId) multiplier *= 2;
  if (state.activeCards[player]?.doubledown) multiplier *= 2;
  return Math.min(MAX_MULTIPLIER, multiplier);
}

export function isPowerRound(state: MatchState, player: Player, roundIndex: number): boolean {
  const round = state.rounds[roundIndex];
  return Boolean(round && state.power[player] === round.categoryId);
}

// --- Actions ---
export function applyAnswer(state: MatchState, player: Player, answer: string): { state: MatchState; error?: string } {
  if (state.phase !== 'question') return { state, error: 'No question is live' };
  if (state.answers[player]) return { state, error: 'Answer already locked' };
  const question = currentQuestionOf(state);
  if (!question) return { state, error: 'Chester is still scribbling this round' };
  const next: MatchState = { ...state, answers: { ...state.answers, [player]: answer }, score: { ...state.score }, streak: { ...state.streak }, activeCards: { p1: { ...state.activeCards.p1 }, p2: { ...state.activeCards.p2 } } };
  if (!next.answers.p1 || !next.answers.p2) return { state: next };

  const p1Correct = next.answers.p1 === question.correctAnswer;
  const p2Correct = next.answers.p2 === question.correctAnswer;
  const isDouble = !question.roulette && state.doubleQuestions.includes(doubleKey(state.round, state.qIndex));
  const powerPlayers = (['p1', 'p2'] as Player[]).filter((p) => isPowerRound(state, p, state.round));
  let p1Points = p1Correct ? playerMultiplier(state, 'p1', state.round, state.qIndex) : 0;
  let p2Points = p2Correct ? playerMultiplier(state, 'p2', state.round, state.qIndex) : 0;

  next.streak.p1 = p1Correct ? next.streak.p1 + 1 : 0;
  next.streak.p2 = p2Correct ? next.streak.p2 + 1 : 0;
  const p1StreakBonus = p1Correct && next.streak.p1 > 0 && next.streak.p1 % 3 === 0;
  const p2StreakBonus = p2Correct && next.streak.p2 > 0 && next.streak.p2 % 3 === 0;
  if (p1StreakBonus) p1Points += 1;
  if (p2StreakBonus) p2Points += 1;

  let stolenFrom: Player | null = null;
  const trySteal = (thief: Player, victim: Player, thiefCorrect: boolean, victimCorrect: boolean) => {
    if (!next.activeCards[thief]?.pickpocket || !thiefCorrect || victimCorrect) return 0;
    const available = next.score[victim];
    return available > 0 ? 1 : 0;
  };
  const p1Steal = trySteal('p1', 'p2', p1Correct, p2Correct);
  const p2Steal = trySteal('p2', 'p1', p2Correct, p1Correct);
  if (p1Steal) { p1Points += p1Steal; stolenFrom = 'p2'; }
  if (p2Steal) { p2Points += p2Steal; stolenFrom = 'p1'; }

  // ON THE HOUSE: Chester buys this round - a free point each, right or wrong.
  const onTheHouse = !question.roulette && state.onTheHouseKey === doubleKey(state.round, state.qIndex);
  if (onTheHouse) { p1Points += 1; p2Points += 1; }

  next.score.p1 = Math.max(0, next.score.p1 + p1Points - p2Steal);
  next.score.p2 = Math.max(0, next.score.p2 + p2Points - p1Steal);
  next.activeCards = { p1: {}, p2: {} };
  next.result = { correctAnswer: question.correctAnswer, p1Correct, p2Correct, p1Points, p2Points, double: isDouble, roulette: Boolean(question.roulette), onTheHouse, powerPlayers, p1StreakBonus, p2StreakBonus, stolenFrom };
  next.roundResults = [...state.roundResults, next.result];
  next.history = [...state.history, { ...next.result, round: state.round }];
  next.phase = 'reveal';
  return { state: next };
}

export function applyWildcard(state: MatchState, player: Player, card: WildcardId): { state: MatchState; error?: string } {
  if (state.phase === 'flash' || state.phase === 'flashReveal') return { state, error: 'Cards rest during the flash finale' };
  if (state.cardsUsed[player][card]) return { state, error: 'That card is already spent' };
  const next: MatchState = { ...state, cardsUsed: { ...state.cardsUsed, [player]: { ...state.cardsUsed[player], [card]: true } }, activeCards: { p1: { ...state.activeCards.p1 }, p2: { ...state.activeCards.p2 } } };
  if (card === 'shakespeare') {
    // Targets the opponent's next question; never the current one, never sudden death.
    if (state.phase !== 'question' && state.phase !== 'reveal') return { state, error: 'Sabotage waits for a live round' };
    if (state.round >= MATCH_ROUNDS - 1 || state.lastCall) return { state, error: 'No sabotage in the final round' };
    next.shakespeareTarget = player === 'p1' ? 'p2' : 'p1';
    next.shakespeareRound = state.round + 1;
    return { state: next };
  }
  if (state.phase !== 'question') return { state, error: 'Play that card while a question is live' };
  if (state.answers[player]) return { state, error: 'Too late - your answer is locked' };
  if (!currentQuestionOf(state)) return { state, error: 'Chester is still scribbling this round' };
  next.activeCards[player] = { ...next.activeCards[player], [card]: true };
  return { state: next };
}

export function lastCallActive(state: MatchState): boolean {
  return state.lastCall || state.round >= MATCH_ROUNDS;
}

// --- Chester's Roulette: when the bell-ringer question comes up, swap it for a
// mystery house pour so neither player drafted the category. Same swap for both
// viewers - it happens in the shared state, never per-viewer.
function applyRoulette(state: MatchState): MatchState {
  if (!state.rouletteKey || state.phase !== 'question') return state;
  const [roundIndex, qIndex] = state.rouletteKey.split(':').map(Number);
  if (state.round !== roundIndex || state.qIndex !== qIndex) return state;
  const round = state.rounds[roundIndex];
  if (!round?.ready || round.questions[qIndex]?.roulette) return state;
  const [mystery] = drawHouseMixed(1, usedQuestionTexts(state));
  if (!mystery) return { ...state, rouletteKey: null };
  const swapped: MatchQuestion = { ...mystery, category: `🎰 Roulette: ${mystery.category}`, roulette: true };
  const rounds = state.rounds.map((item, index) => (index === roundIndex ? { ...item, questions: item.questions.map((question, qi) => (qi === qIndex ? swapped : question)) } : item));
  return { ...state, rounds };
}


// --- FLASH FINALE: after the fifth question of every round, one bonus pour worth
// double. Five types dealt shuffled across the five rounds. Riddles and teasers
// are 4-option questions; fastest finger pays only the first correct answer;
// Last Orders pays both but the swifter glass gets a top-up; The Twenty is a
// strikeout duel on a 20-option board. Wildcards rest; streaks are untouched.
const FLASH_POINTS = 2;

function flashQuestionResult(state: MatchState, flash: FlashState, p1Points: number, p2Points: number, note: string): MatchState {
  const question = flash.question;
  const result: QuestionResult = {
    correctAnswer: question?.correctAnswer || note,
    p1Correct: p1Points > 0,
    p2Correct: p2Points > 0,
    p1Points,
    p2Points,
    double: true,
    powerPlayers: [],
    p1StreakBonus: false,
    p2StreakBonus: false,
    stolenFrom: null,
    flash: flash.type,
  };
  return {
    ...state,
    score: { p1: state.score.p1 + p1Points, p2: state.score.p2 + p2Points },
    result,
    roundResults: [...state.roundResults, result],
    history: [...state.history, { ...result, round: state.round }],
    flash: { ...flash, done: true, resolvedNote: note },
    phase: 'flashReveal',
  };
}

function startFlash(state: MatchState): MatchState {
  if (state.lastCall || state.round >= MATCH_ROUNDS) return { ...state, phase: 'banter', flash: null };
  const type = state.flashOrder[state.round] || 'riddle';
  const base: FlashState = {
    type,
    answers: {},
    order: [],
    turn: state.score.p1 <= state.score.p2 ? 'p1' : 'p2',
    strikes: { p1: 0, p2: 0 },
    picks: { p1: [], p2: [] },
    picked: [],
    done: false,
    winner: null,
  };
  if (type === 'riddle') {
    const source = pickRiddle();
    return { ...state, phase: 'flash', flash: { ...base, question: { category: '⚡ Riddle', difficulty: 'house', question: source.question, correctAnswer: source.correct, answers: shuffle([source.correct, ...source.wrong]) } } };
  }
  if (type === 'teaser') {
    const source = pickTeaser();
    return { ...state, phase: 'flash', flash: { ...base, question: { category: '⚡ Brain Teaser', difficulty: 'house', question: source.question, correctAnswer: source.correct, answers: shuffle([source.correct, ...source.wrong]) } } };
  }
  const [pour] = drawHouseMixed(1, usedQuestionTexts(state));
  const question: MatchQuestion = pour || { category: '⚡ Flash', question: 'Chester has run dry - take a point each and call it square.', correctAnswer: '', answers: [] };
  if (type === 'fastest') return { ...state, phase: 'flash', flash: { ...base, question: { ...question, category: '⚡ Fastest Finger' } } };
  if (type === 'lastorders') return { ...state, phase: 'flash', flash: { ...base, question: { ...question, category: '⚡ Last Orders' } } };
  return { ...state, phase: 'flash', flash: { ...base, board: pickDuelBoard() } };
}

// Both-answered flashes resolve when the second answer lands (or the Last Orders
// bell rings). Fastest finger resolves the instant a correct answer arrives.
export function applyFlashAnswer(state: MatchState, player: Player, answer: string): { state: MatchState; error?: string } {
  if (state.phase !== 'flash' || !state.flash) return { state, error: 'No flash finale is live' };
  const flash = state.flash;
  if (flash.type === 'duel') return { state, error: 'The Twenty is a board duel - tap the options, not answers' };
  if (flash.answers[player]) return { state, error: 'Your flash answer is already locked' };
  const question = flash.question;
  if (!question) return { state, error: 'Chester is still scribbling the flash' };
  const next: FlashState = { ...flash, answers: { ...flash.answers, [player]: answer }, order: [...flash.order, player] };
  const correct = answer === question.correctAnswer;
  if (flash.type === 'fastest') {
    if (correct) {
      const pts = { p1: 0, p2: 0 };
      pts[player] = FLASH_POINTS;
      return { state: flashQuestionResult(state, next, pts.p1, pts.p2, 'firstCorrect') };
    }
    if (next.answers.p1 && next.answers.p2) return { state: flashQuestionResult(state, { ...next, winner: 'none' }, 0, 0, 'bothWrong') };
    return { state: { ...state, flash: next } };
  }
  if (!next.answers.p1 || !next.answers.p2) return { state: { ...state, flash: next } };
  const p1Correct = next.answers.p1 === question.correctAnswer;
  const p2Correct = next.answers.p2 === question.correctAnswer;
  if (flash.type === 'lastorders') {
    let p1 = p1Correct ? FLASH_POINTS : 0;
    let p2 = p2Correct ? FLASH_POINTS : 0;
    if (p1Correct && p2Correct && next.order[0]) (next.order[0] === 'p1' ? p1 += 1 : p2 += 1);
    return { state: flashQuestionResult(state, next, p1, p2, p1Correct && p2Correct ? 'bothCorrectSwifterTopped' : 'settled') };
  }
  return { state: flashQuestionResult(state, next, p1Correct ? FLASH_POINTS : 0, p2Correct ? FLASH_POINTS : 0, 'settled') };
}

// Last Orders bell: the host's timer rings and the flash settles as it stands.
export function resolveFlashTimeout(state: MatchState): { state: MatchState; error?: string } {
  if (state.phase !== 'flash' || !state.flash || state.flash.type === 'duel') return { state, error: 'No timed flash is live' };
  const flash = state.flash;
  const question = flash.question;
  if (!question) return { state, error: 'Nothing to settle' };
  const p1Correct = flash.answers.p1 === question.correctAnswer;
  const p2Correct = flash.answers.p2 === question.correctAnswer;
  if (flash.type === 'lastorders') {
    let p1 = p1Correct ? FLASH_POINTS : 0;
    let p2 = p2Correct ? FLASH_POINTS : 0;
    if (p1Correct && p2Correct && flash.order[0]) (flash.order[0] === 'p1' ? p1 += 1 : p2 += 1);
    return { state: flashQuestionResult(state, flash, p1, p2, 'bellRang') };
  }
  if (flash.type === 'fastest') return { state: flashQuestionResult(state, { ...flash, winner: 'none' }, 0, 0, 'bellRang') };
  return { state: flashQuestionResult(state, flash, p1Correct ? FLASH_POINTS : 0, p2Correct ? FLASH_POINTS : 0, 'bellRang') };
}
// Host calls off a live duel (the rival's phone died, the match cannot stall
// forever): no flash points either way, normal-question scores untouched.
export function applyFlashVoid(state: MatchState): { state: MatchState; error?: string } {
  if (state.phase !== 'flash' || !state.flash || state.flash.done) return { state, error: 'No live flash to call off' };
  if (state.flash.type !== 'duel') return { state, error: 'Only The Twenty can be called off - the bell settles the timed pours' };
  return { state: flashQuestionResult(state, state.flash, 0, 0, 'void') };
}

// The Twenty: alternate taps on a 20-option board, ten of them right.
// A wrong tap is a strike; three strikes and the other player banks the flash.
// If all ten correct are found first, the fuller basket wins; level baskets split it.
export function applyDuelPick(state: MatchState, player: Player, option: string): { state: MatchState; error?: string } {
  if (state.phase !== 'flash' || !state.flash || state.flash.type !== 'duel') return { state, error: 'The Twenty is not live' };
  const flash = state.flash;
  const board = flash.board;
  if (!board) return { state, error: 'The board is not set' };
  if (flash.turn !== player) return { state, error: 'Not your pick - wait for your turn' };
  if (!board.options.includes(option)) return { state, error: 'That is not on the board' };
  if (flash.picked.includes(option)) return { state, error: 'Already tapped' };
  const isCorrect = board.correct.includes(option);
  const next: FlashState = {
    ...flash,
    picked: [...flash.picked, option],
    picks: isCorrect ? { ...flash.picks, [player]: [...flash.picks[player], option] } : flash.picks,
    strikes: isCorrect ? flash.strikes : { ...flash.strikes, [player]: flash.strikes[player] + 1 },
    turn: player === 'p1' ? 'p2' : 'p1',
  };
  const other: Player = player === 'p1' ? 'p2' : 'p1';
  if (!isCorrect && next.strikes[player] >= 3) {
    next.done = true;
    next.winner = other;
    return { state: flashQuestionResult(state, next, other === 'p1' ? FLASH_POINTS : 0, other === 'p2' ? FLASH_POINTS : 0, 'threeStrikes') };
  }
  const found = next.picks.p1.length + next.picks.p2.length;
  if (found >= board.correct.length) {
    next.done = true;
    if (next.picks.p1.length === next.picks.p2.length) {
      next.winner = 'both';
      return { state: flashQuestionResult(state, next, 1, 1, 'boardClearedLevel') };
    }
    const winner: Player = next.picks.p1.length > next.picks.p2.length ? 'p1' : 'p2';
    next.winner = winner;
    return { state: flashQuestionResult(state, next, winner === 'p1' ? FLASH_POINTS : 0, winner === 'p2' ? FLASH_POINTS : 0, 'boardCleared') };
  }
  return { state: { ...state, flash: next } };
}

export async function advanceMatch(state: MatchState): Promise<{ state: MatchState; error?: string }> {
  if (state.phase === 'reveal') {
    if (state.lastCall) {
      // Sudden death: decided on any split question, otherwise the next hard pour.
      if (state.score.p1 !== state.score.p2) return { state: { ...state, phase: 'finished' } };
      try {
        const question = await fetchLastCallQuestion(usedQuestionTexts(state));
        const rounds = state.rounds.map((round, index) => (index === state.round ? { ...round, questions: [question], ready: true } : round));
        return { state: applyRoulette({ ...state, rounds, qIndex: 0, answers: {}, result: null, phase: 'question' }) };
      } catch (error) {
        return { state, error: error instanceof Error ? error.message : 'Could not pour a decider' };
      }
    }
    if (state.qIndex + 1 < QUESTIONS_PER_ROUND) {
      return { state: applyRoulette({ ...state, qIndex: state.qIndex + 1, answers: {}, result: null, phase: 'question' }) };
    }
    return { state: startFlash({ ...state, phase: 'reveal' }) };
  }
  if (state.phase === 'flashReveal') {
    return { state: { ...state, phase: 'banter', flash: null } };
  }
  if (state.phase === 'banter') {
    const nextRound = state.round + 1;
    if (nextRound < MATCH_ROUNDS) {
      const round = state.rounds[nextRound];
      if (!round?.ready) return { state, error: 'Chester is still scribbling the next round - give him a breath.' };
      return { state: applyRoulette({ ...state, round: nextRound, qIndex: 0, answers: {}, result: null, roundResults: [], phase: 'question' }) };
    }
    if (state.score.p1 !== state.score.p2) return { state: { ...state, phase: 'finished' } };
    // Dead heat after five rounds: LAST CALL, sudden death, hard questions only.
    try {
      const question = await fetchLastCallQuestion(usedQuestionTexts(state));
      const decider: MatchRound = { categoryId: 0, categoryName: question.category, difficulty: 'hard', questions: [question], ready: true };
      return { state: { ...state, rounds: [...state.rounds, decider], round: MATCH_ROUNDS, qIndex: 0, answers: {}, result: null, roundResults: [], lastCall: true, phase: 'question' } };
    } catch (error) {
      return { state, error: error instanceof Error ? error.message : 'Could not pour a decider' };
    }
  }
  return { state, error: 'Nothing to advance' };
}

// --- Per-viewer question shaping: fifty-fifty trims, Shakespeare disguises.
// The client renders `disguise` text but always submits the raw answer string.
export type ViewerQuestion = { category: string; question: string; answers: string[]; difficulty?: string; roulette?: boolean; disguise?: { question: string; answers: string[] } };

export function viewerQuestion(state: MatchState, viewer: Player): ViewerQuestion | null {
  const question = currentQuestionOf(state);
  if (!question) return null;
  let answers = question.answers;
  if (state.activeCards[viewer]?.fiftyfifty) {
    const wrong = shuffle(question.answers.filter((option) => option !== question.correctAnswer))[0];
    answers = shuffle([question.correctAnswer, wrong]);
  }
  const view: ViewerQuestion = { category: question.category, difficulty: question.difficulty, question: question.question, answers, roulette: question.roulette };
  if (state.shakespeareTarget === viewer && state.shakespeareRound === state.round) {
    view.disguise = { question: shakespeareify(question.question), answers: answers.map(shakespeareify) };
  }
  return view;
}

// Round summary facts for the host line and the (paid, brawl-only) commentary call.
export function roundSummary(state: MatchState, _roundIndex: number): { p1Hits: number; p2Hits: number; events: string[] } {
  // roundResults holds only the current round's results (reset on round advance).
  const slice = state.roundResults.slice(-QUESTIONS_PER_ROUND);
  const events: string[] = [];
  const p1Hits = slice.filter((result) => result.p1Correct).length;
  const p2Hits = slice.filter((result) => result.p2Correct).length;
  if (slice.some((result) => result.double)) events.push('a double-points question landed');
  if (slice.some((result) => result.roulette)) events.push('Chester rang the roulette bell for a mystery triple pour');
  if (slice.some((result) => result.stolenFrom)) events.push('a point was pickpocketed');
  if (slice.some((result) => result.flash)) events.push('the flash finale paid out double');
  if (slice.some((result) => result.onTheHouse)) events.push('Chester bought a round on the house');
  if (slice.some((result) => result.p1StreakBonus || result.p2StreakBonus)) events.push('someone went on a roll');
  return { p1Hits, p2Hits, events };
}
