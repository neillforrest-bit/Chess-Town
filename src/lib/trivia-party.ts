import { fetchRoundQuestions, shakespeareify, shuffle, type FlashType, type MatchQuestion, type WildcardId } from './trivia-match';
import { LOCAL_CATEGORIES, pickDuelBoard, pickRiddle, pickTeaser, type DuelBoard, type LocalQuestion } from './trivia-local';
import { normalizeTriviaSettings, roundDifficulty, sportFocusCategoryId, type TriviaSettings } from './trivia-settings';

export const PARTY_LIMIT = 5;
export const PARTY_TIMEOUT = "Time's up - no answer";
export const PARTY_RULES = [
  'Five rounds of five shared questions. Fifteen seconds for main Grammar questions; ten for other main questions. A correct answer earns one point; every third consecutive correct main answer earns one extra.',
  'Mixed quiz: three category picks each, pooled and shuffled across the questions. Single topic: all main questions use that topic. Flash finales can use other topics. No power rounds or roulette in Party Table.',
  'One of each wildcard per player. Fifty-Fifty removes two wrong options for you. Double Down doubles the base point for your next correct main answer (not the streak bonus). Pickpocket needs a named rival: if you are right and they are wrong, steal at most one existing point. Shakespeare needs a named rival: their next round is disguised. Wildcards rest during flashes.',
  'Riddle and Brain Teaser: two points for each correct player. Fastest Finger: first correct arrival at the host earns two. Last Orders: two each, plus one for the first correct arrival. Each flash question has twenty seconds.',
  'The Twenty: take turns, ten seconds per pick. One point per correct find. Three strikes eliminate a player. Most finds earns two bonus points; tied leaders earn one each. A timed-out turn is a strike. The board ends when all ten are found or everybody is out.',
  'Highest score after the final flash wins; ties share the win. Host must keep the table open. Reloading a guest keeps its seat, but a new player cannot join after start. Answers must reach the host before the bell.',
] as const;

type Cards = Record<WildcardId, boolean>;
export type PartySeat = { id: string; name: string; categories: number[]; ready: boolean; score: number; streak: number; used: Cards; active: { double?: boolean; pickpocket?: string; fifty?: string[] }; disguiseRound?: number };
export type PartyResult = { correctAnswer: string; answers: Record<string, string>; right: Record<string, boolean>; points: Record<string, number>; note: string };
export type PartyFlash = { type: FlashType; question?: MatchQuestion; board?: DuelBoard; picked: string[]; finds: Record<string, string[]>; strikes: Record<string, number>; turn: number; order: string[] };
export type PartyRoom = {
  gameId: string; settings: TriviaSettings; seats: PartySeat[]; phase: 'lobby' | 'intro' | 'question' | 'reveal' | 'flash' | 'flashReveal' | 'roundEnd' | 'finished';
  round: number; qIndex: number; questions: MatchQuestion[][]; flashQuestions: MatchQuestion[]; flashes: FlashType[]; flash: PartyFlash | null;
  deadline?: number; event?: string; answers: Record<string, string>; result: PartyResult | null; history: Array<PartyResult & { round: number; flash: boolean }>;
};
export type PartyView = Omit<PartyRoom, 'questions' | 'flashQuestions' | 'answers' | 'flash'> & {
  question: Omit<MatchQuestion, 'correctAnswer'> | null; locked: string[]; myAnswer?: string; remainingMs?: number;
  flash: Omit<PartyFlash, 'question' | 'board'> & { board?: { prompt: string; options: string[]; correct?: string[] } } | null;
};
export type PartyAction = { name?: string; settings?: TriviaSettings; categories?: number[]; ready?: boolean; start?: boolean; advance?: boolean; answer?: string; card?: WildcardId; target?: string; removeSeat?: string; pick?: string; timeout?: boolean; rematch?: boolean };
const emptyCards = (): Cards => ({ shakespeare: false, fiftyfifty: false, doubledown: false, pickpocket: false });
export function makePartySeat(id: string, name: string): PartySeat {
  return { id, name: cleanPartyName(name), categories: [], ready: false, score: 0, streak: 0, used: emptyCards(), active: {} };
}
export function cleanPartyName(name: string): string { return name.replace(/[^\p{L}\p{N} '.-]/gu, '').trim().slice(0, 20) || 'PLAYER'; }
export function createParty(hostId: string, settings: TriviaSettings): PartyRoom {
  return { gameId: crypto.randomUUID(), settings: normalizeTriviaSettings(settings), seats: [makePartySeat(hostId, 'HOST')], phase: 'lobby', round: 0, qIndex: 0, questions: [], flashQuestions: [], flashes: shuffle(['riddle', 'teaser', 'fastest', 'duel', 'lastorders'] as FlashType[]), flash: null, answers: {}, result: null, history: [] };
}
export function partyContext(room: Pick<PartyRoom, 'gameId' | 'phase' | 'round' | 'qIndex' | 'history'> & { flash?: { turn: number; picked: string[]; strikes: Record<string, number> } | null }): string { return `${room.gameId}:${room.phase}:${room.round}:${room.qIndex}:${room.history.length}:${room.flash?.turn ?? ''}:${room.flash?.picked.length ?? ''}:${JSON.stringify(room.flash?.strikes || {})}`; }
function currentQuestion(room: PartyRoom): MatchQuestion | null { return room.phase === 'flash' || room.phase === 'flashReveal' ? room.flash?.question || null : room.questions[room.round]?.[room.qIndex] || null; }
export function partyView(room: PartyRoom, seatId: string): PartyView {
  const { questions: _questions, flashQuestions: _bonus, answers, flash, ...publicState } = room;
  void _questions; void _bonus;
  const seat = room.seats.find(s => s.id === seatId);
  const raw = currentQuestion(room);
  let question: PartyView['question'] = raw ? { question: raw.question, category: raw.category, answers: seat?.active.fifty || raw.answers, difficulty: raw.difficulty } : null;
  if (question && room.phase === 'question' && seat?.disguiseRound === room.round) question = { ...question, question: shakespeareify(question.question), answers: question.answers.map(shakespeareify) };
  return { ...publicState, seats: room.seats.map(s => ({ ...s, active: s.id === seatId ? s.active : {} })), question, locked: Object.keys(answers), myAnswer: answers[seatId], remainingMs: room.deadline === undefined ? undefined : Math.max(0, room.deadline - Date.now()), flash: flash ? { type: flash.type, picked: flash.picked, finds: flash.finds, strikes: flash.strikes, turn: flash.turn, order: flash.order, board: flash.board ? { prompt: flash.board.prompt, options: flash.board.options, ...(room.phase === 'flashReveal' ? { correct: flash.board.correct } : {}) } : undefined } : null };
}
function fromLocal(q: LocalQuestion, category: string): MatchQuestion { return { category, question: q.question, correctAnswer: q.correct, answers: shuffle([q.correct, ...q.wrong]) }; }

// Preload before starting the clock; no question changes beneath a live player.
export async function prepareParty(room: PartyRoom, nameOf: (id: number) => string | undefined): Promise<PartyRoom> {
  if (room.phase !== 'lobby' || room.seats.length < 2 || room.seats.some(s => !s.ready)) throw new Error('At least two players must be ready.');
  const focus = sportFocusCategoryId(room.settings.focus);
  const pool = focus ? [focus] : room.seats.flatMap(s => s.categories);
  if (!pool.length) throw new Error('Choose the category pool first.');
  const used = new Set<string>();
  const questions: MatchQuestion[][] = [];
  // Every player contributes the same number of entries; shuffle once and cycle.
  const order = shuffle(pool);
  for (let round = 0; round < 5; round++) {
    const qs: MatchQuestion[] = [];
    for (let index = 0; index < 5; index++) {
      const category = order[(round * 5 + index) % order.length];
      const draw = await fetchRoundQuestions(category, roundDifficulty(room.settings.difficulty, round), used, 1);
      if (!draw[0]) throw new Error(`Could not draw ${nameOf(category) || 'a category'}. Try a different shelf.`);
      used.add(draw[0].question); qs.push(draw[0]);
    }
    questions.push(qs);
  }
  const flashQuestions = [fromLocal(pickRiddle(), 'Riddle'), fromLocal(pickTeaser(), 'Brain Teaser')];
  for (let i = 0; i < 3; i++) {
    const category = order[i % order.length];
    const draw = await fetchRoundQuestions(category, 'medium', used, 1);
    if (!draw[0]) throw new Error('Could not draw the flash shelf.');
    used.add(draw[0].question); flashQuestions.push(draw[0]);
  }
  return { ...room, questions, flashQuestions, phase: 'intro', answers: {}, result: null };
}
function nextQuestion(room: PartyRoom, now: number): PartyRoom { return { ...room, phase: 'question', answers: {}, result: null, event: undefined, deadline: now + (currentQuestion(room)?.category === 'Grammar' ? 15000 : 10000) }; }
function settleQuestion(room: PartyRoom): PartyRoom {
  const q = currentQuestion(room);
  if (!q) throw new Error('No question is live.');
  const isFlash = room.phase === 'flash';
  const right = Object.fromEntries(room.seats.map(s => [s.id, room.answers[s.id] === q.correctAnswer]));
  const delta: Record<string, number> = {};
  let seats = room.seats.map(s => ({ ...s, active: { ...s.active }, used: { ...s.used } }));
  for (const seat of seats) {
    if (isFlash) {
      const first = room.flash?.order.find(id => right[id]);
      delta[seat.id] = room.flash?.type === 'fastest' ? first === seat.id ? 2 : 0 : right[seat.id] ? 2 + (room.flash?.type === 'lastorders' && first === seat.id ? 1 : 0) : 0;
    } else {
      seat.streak = right[seat.id] ? seat.streak + 1 : 0;
      delta[seat.id] = right[seat.id] ? (seat.active.double ? 2 : 1) + (seat.streak % 3 === 0 ? 1 : 0) : 0;
    }
  }
  if (!isFlash) {
    // Resolve steals against pre-question scores, never against another steal's payout.
    const budget = Object.fromEntries(room.seats.map(s => [s.id, s.score]));
    for (const seat of seats) {
      const victim = seat.active.pickpocket;
      if (victim && right[seat.id] && !right[victim] && budget[victim] > 0) { delta[seat.id] += 1; delta[victim] -= 1; budget[victim] -= 1; }
    }
    seats = seats.map(s => ({ ...s, active: {} }));
  }
  const result: PartyResult = { correctAnswer: q.correctAnswer, answers: { ...room.answers }, right, points: delta, note: isFlash ? 'Flash settled.' : 'Question settled. A timeout counts as wrong.' };
  return { ...room, seats: seats.map(s => ({ ...s, score: s.score + (delta[s.id] || 0) })), phase: isFlash ? 'flashReveal' : 'reveal', deadline: undefined, result, history: [...room.history, { ...result, round: room.round, flash: isFlash }] };
}
function settleDuel(room: PartyRoom): PartyRoom {
  const flash = room.flash!;
  const high = Math.max(...room.seats.map(s => flash.finds[s.id]?.length || 0));
  const leaders = high > 0 ? room.seats.filter(s => (flash.finds[s.id]?.length || 0) === high).map(s => s.id) : [];
  const points = Object.fromEntries(room.seats.map(s => [s.id, (flash.finds[s.id]?.length || 0) + (leaders.includes(s.id) ? leaders.length === 1 ? 2 : 1 : 0)]));
  const result: PartyResult = { correctAnswer: flash.board!.correct.join(', '), answers: Object.fromEntries(room.seats.map(s => [s.id, (flash.finds[s.id] || []).join(', ') || 'No finds'])), right: Object.fromEntries(room.seats.map(s => [s.id, (flash.finds[s.id]?.length || 0) > 0])), points, note: 'One per find. Two bonus for a sole leader, one each for tied leaders.' };
  return { ...room, phase: 'flashReveal', deadline: undefined, result, seats: room.seats.map(s => ({ ...s, score: s.score + points[s.id] })), history: [...room.history, { ...result, round: room.round, flash: true }] };
}
function advanceDuel(room: PartyRoom, now: number): PartyRoom {
  const f = room.flash!;
  if (f.picked.filter(p => f.board!.correct.includes(p)).length >= f.board!.correct.length || room.seats.every(s => (f.strikes[s.id] || 0) >= 3)) return settleDuel(room);
  let turn = f.turn;
  do { turn = (turn + 1) % room.seats.length; } while ((f.strikes[room.seats[turn].id] || 0) >= 3);
  return { ...room, flash: { ...f, turn }, deadline: now + 10000 };
}
function startFlash(room: PartyRoom, now: number): PartyRoom {
  const type = room.flashes[room.round];
  const flash: PartyFlash = { type, question: type === 'duel' ? undefined : room.flashQuestions[type === 'riddle' ? 0 : type === 'teaser' ? 1 : room.round % 3 + 2], board: type === 'duel' ? pickDuelBoard() : undefined, picked: [], finds: {}, strikes: {}, turn: room.round % room.seats.length, order: [] };
  return { ...room, phase: 'flash', flash, answers: {}, result: null, deadline: now + (type === 'duel' ? 10000 : 20000) };
}
export function expireParty(room: PartyRoom, now = Date.now()): PartyRoom {
  if (room.deadline === undefined || now < room.deadline) return room;
  if (room.phase === 'question' || room.phase === 'flash' && room.flash?.type !== 'duel') {
    const answers = { ...room.answers };
    for (const seat of room.seats) if (!answers[seat.id]) answers[seat.id] = PARTY_TIMEOUT;
    return settleQuestion({ ...room, answers });
  }
  if (room.phase === 'flash' && room.flash?.type === 'duel') {
    const id = room.seats[room.flash.turn].id;
    return advanceDuel({ ...room, flash: { ...room.flash, strikes: { ...room.flash.strikes, [id]: (room.flash.strikes[id] || 0) + 1 } } }, now);
  }
  return room;
}
export function applyPartyAction(original: PartyRoom, id: string, action: PartyAction, now = Date.now()): PartyRoom {
  const room = expireParty(original, now);
  // Expiry won the race. Do not accidentally apply a late packet to the next duel turn.
  if (room !== original) return room;
  const seat = room.seats.find(s => s.id === id);
  if (!seat) throw new Error('Your seat is not at this table.');
  const host = room.seats[0].id === id;
  if (action.rematch && host && room.phase === 'finished') {
    return { ...createParty(id, room.settings), seats: room.seats.map(s => makePartySeat(s.id, s.name)) };
  }
  if (room.phase === 'lobby') {
    if (action.removeSeat && host) {
      if (action.removeSeat === id) throw new Error('The host cannot remove their own seat.');
      return { ...room, seats: room.seats.filter(s => s.id !== action.removeSeat) };
    }
    if (action.settings && host) {
      if (room.seats.some(s => s.ready)) throw new Error('Unready everyone before changing the quiz format.');
      return { ...room, settings: normalizeTriviaSettings(action.settings), seats: room.seats.map(s => ({ ...s, categories: [], ready: false })) };
    }
    if (action.name && !seat.ready) return { ...room, seats: room.seats.map(s => s.id === id ? { ...s, name: cleanPartyName(action.name!) } : s) };
    if (action.categories && !seat.ready) {
      const cats = [...new Set(action.categories.filter(n => Number.isInteger(n) && n !== 0))];
      if (cats.length !== 3 || cats.some(n => !LOCAL_CATEGORIES.some(c => c.id === n))) throw new Error('Choose three different house categories.');
      return { ...room, seats: room.seats.map(s => s.id === id ? { ...s, categories: cats } : s) };
    }
    if (action.ready !== undefined) {
      if (action.ready && room.settings.focus === 'open' && seat.categories.length !== 3) throw new Error('Choose three categories before readying.');
      return { ...room, seats: room.seats.map(s => s.id === id ? { ...s, ready: action.ready! } : s) };
    }
    return room;
  }
  if (action.start && host && room.phase === 'intro') return nextQuestion(room, now);
  if (action.advance && host) {
    if (room.phase === 'reveal') return room.qIndex === 4 ? startFlash(room, now) : nextQuestion({ ...room, qIndex: room.qIndex + 1 }, now);
    if (room.phase === 'flashReveal') return { ...room, phase: room.round === 4 ? 'finished' : 'roundEnd', flash: null };
    if (room.phase === 'roundEnd') return nextQuestion({ ...room, round: room.round + 1, qIndex: 0 }, now);
  }
  if (action.card && room.phase === 'question') {
    if (room.answers[id]) throw new Error('Your answer is already locked.');
    if (!(action.card in emptyCards()) || seat.used[action.card]) throw new Error('That card is unavailable.');
    const target = room.seats.find(s => s.id === action.target && s.id !== id);
    if ((action.card === 'shakespeare' || action.card === 'pickpocket') && !target) throw new Error('Choose a named rival for that card.');
    if (action.card === 'shakespeare' && room.round === 4) throw new Error('No next round remains for Shakespeare.');
    const q = currentQuestion(room)!;
    const seats = room.seats.map(s => s.id === id ? { ...s, used: { ...s.used, [action.card!]: true }, active: { ...s.active, ...(action.card === 'doubledown' ? { double: true } : {}), ...(action.card === 'pickpocket' ? { pickpocket: target!.id } : {}), ...(action.card === 'fiftyfifty' ? { fifty: shuffle([q.correctAnswer, shuffle(q.answers.filter(a => a !== q.correctAnswer))[0]]) } : {}) } } : action.card === 'shakespeare' && s.id === target!.id ? { ...s, disguiseRound: room.round + 1 } : s);
    const label = action.card === 'fiftyfifty' ? 'Fifty-Fifty' : action.card === 'doubledown' ? 'Double Down' : action.card === 'pickpocket' ? 'Pickpocket' : 'Shakespeare';
    return { ...room, seats, event: `${seat.name} plays ${label}${target ? ` on ${target.name}` : ''}. ${action.card === 'shakespeare' ? 'Next round gets a disguise.' : action.card === 'pickpocket' ? 'A correct answer against a rival mistake can steal a point.' : action.card === 'fiftyfifty' ? 'Two wrong answers leave their screen.' : 'Backing the next answer for double base points.'}` };
  }
  if (action.answer && (room.phase === 'question' || room.phase === 'flash' && room.flash?.type !== 'duel')) {
    if (room.answers[id]) return room;
    const q = currentQuestion(room)!;
    const raw = room.phase === 'question' && seat.disguiseRound === room.round ? q.answers.find(a => shakespeareify(a) === action.answer) : action.answer;
    if (!raw || !q.answers.includes(raw) || seat.active.fifty && !seat.active.fifty.includes(raw)) throw new Error('Choose an available answer.');
    const next = { ...room, answers: { ...room.answers, [id]: raw }, flash: room.flash ? { ...room.flash, order: [...room.flash.order, id] } : null };
    if (room.phase === 'flash' && room.flash?.type === 'fastest' && raw === q.correctAnswer) {
      for (const s of room.seats) if (!next.answers[s.id]) next.answers[s.id] = 'No answer before the winner';
      return settleQuestion(next);
    }
    return room.seats.every(s => next.answers[s.id]) ? settleQuestion(next) : next;
  }
  if (action.pick && room.phase === 'flash' && room.flash?.type === 'duel') {
    const f = room.flash;
    if (room.seats[f.turn].id !== id) throw new Error('Wait for your turn.');
    if (!f.board!.options.includes(action.pick) || f.picked.includes(action.pick)) throw new Error('Choose an unpicked option.');
    const correct = f.board!.correct.includes(action.pick);
    return advanceDuel({ ...room, flash: { ...f, picked: [...f.picked, action.pick], finds: correct ? { ...f.finds, [id]: [...(f.finds[id] || []), action.pick] } : f.finds, strikes: correct ? f.strikes : { ...f.strikes, [id]: (f.strikes[id] || 0) + 1 } } }, now);
  }
  return room;
}
