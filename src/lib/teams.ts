// @ts-nocheck
// Team Trivia (family BBQ build) - host-authoritative team game on the existing
// PeerJS transport (p2p.ts). Host browser owns the room incl. correct answers;
// guests receive a public view only. Zero cost, local question packs only.
import { LOCAL_CATEGORIES } from './trivia-local';
import { SEASON_TWO_QUESTIONS } from './trivia-packs';
import type { LocalQuestion } from './trivia-local';

// All local question banks keyed by category id (base banks live in trivia-local).
import * as TriviaLocal from './trivia-local';

export type TeamPlayer = { id: string; name: string };
export type Team = { name: string; playerIds: string[]; score: number; roundScores: number[] };
export type DrawnQuestion = { question: string; options: string[]; correctIndex: number };

// Wildcards, ported from Forrest's 29-30 Oct asks (double-value flashes, mystery
// triple, fifty-fifty, riddles dropped in, sudden death). Keys are 'round-qIndex'.
export type WildState = {
  doubles: string[];                     // two questions a night pay double
  tripleKey: string | null;              // Chester's Choice mystery question, pays triple
  tripleCat: string | null;              // its real category, named only at the reveal
  flash: string[];                       // one Brainbox riddle/teaser per round, dropped in
  fiftyUsed: Record<number, boolean>;    // teamIdx -> lifeline spent
  fiftyHidden: Record<number, number[]>; // teamIdx -> option indexes hidden on the current question
};

export function qkey(round: number, qIndex: number): string { return `${round}-${qIndex}`; }

// Pick tonight's wildcard slots: one double early, one double late, one mystery
// triple kept clear of them, one flash riddle per round clear of both.
export function planWild(): WildState {
  const pick = (rounds: number[]) => qkey(rounds[Math.floor(Math.random() * rounds.length)], Math.floor(Math.random() * 5));
  const taken = new Set<string>();
  const grab = (rounds: number[]) => { let k = pick(rounds); let guard = 0; while (taken.has(k) && guard++ < 40) k = pick(rounds); taken.add(k); return k; };
  const doubles = [grab([0, 1]), grab([2, 3, 4])];
  const tripleKey = grab([1, 2, 3]);
  const flash: string[] = [];
  for (let r = 0; r < 5; r += 1) flash.push(grab([r]));
  return { doubles, tripleKey, tripleCat: null, flash, fiftyUsed: {}, fiftyHidden: {} };
}

export function wildKind(wild: WildState | undefined, round: number, qIndex: number): 'double' | 'triple' | 'flash' | null {
  if (!wild) return null;
  const k = qkey(round, qIndex);
  if (wild.tripleKey === k) return 'triple';
  if (wild.doubles.includes(k)) return 'double';
  if (wild.flash.includes(k)) return 'flash';
  return null;
}

export function wildPoints(kind: 'double' | 'triple' | 'flash' | null): number {
  return kind === 'triple' ? 3 : kind === 'double' ? 2 : 1;
}

export type TeamRoomPhase =
  | 'lobby'        // players joining
  | 'sorting'      // dramatic shuffle in progress
  | 'teams'        // teams revealed, single screen
  | 'categories'   // the night's 5 categories, single screen
  | 'question'     // live question, captains answering
  | 'reveal'       // answer revealed + per-team result
  | 'scoreboard'   // after-round team scoreboard
  | 'final';       // winner screen

export type TeamRoom = {
  code: string;
  phase: TeamRoomPhase;
  players: TeamPlayer[];
  teams: Team[];
  categoryIds: number[];
  round: number;           // 0..4
  qIndex: number;          // 0..4
  answers: Record<number, number | null>; // teamIdx -> option idx
  asked: string[];         // question texts already served (no repeats)
  wild?: WildState;        // tonight's wildcards (set when categories are drawn)
  suddenDeath?: { tied: number[] } | null; // tied final: only these teams answer
  hostLine: string;        // Chester's current line
  expected?: number;       // host's expected headcount (joined vs missing)
  startedAt: number;
  updatedAt: number;
};

export type PublicTeamRoom = Omit<TeamRoom, 'answers'> & {
  answers: Record<number, boolean>; // teamIdx -> answered?
  current: { question: string; options: string[] } | null;
  reveal: { correctIndex: number; perTeam: { teamIdx: number; picked: number | null; correct: boolean }[] } | null;
};

// --- Fun team names ---
export const TEAM_NAMES = [
  'The Quizzy Rascals', "Chester's Champions", 'The Brainy Bunch', 'Quizteam Machine',
  'The Know-It-Alls', 'Brew Crew', 'The Smartinis', 'Trivia Newton John',
  'The Think Tanks', 'Agatha Quiztie', 'The Mindsiders', 'Quiz Khalifa',
];

export function uid(): string { return Math.random().toString(36).slice(2, 10); }
export function roomCode(): string {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // no I/L/O confusion
  let s = '';
  for (let i = 0; i < 4; i += 1) s += letters[Math.floor(Math.random() * letters.length)];
  return s;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Teams of 3, some of 2 when the headcount needs it, never more than 4 teams.
export function sortIntoTeams(players: TeamPlayer[]): Team[] {
  const n = players.length;
  // Teams of 3, with 2s where the headcount needs them, never more than 4 teams.
  const nTeams = Math.min(4, Math.max(2, Math.ceil(n / 3)));
  const shuffled = shuffle(players);
  const buckets: string[][] = Array.from({ length: nTeams }, () => []);
  shuffled.forEach((p, i) => buckets[i % nTeams].push(p.id));
  // Rebalance: no team bigger than 3 while another has fewer than 2
  for (let guard = 0; guard < 8; guard += 1) {
    const big = buckets.findIndex((b) => b.length > 3);
    const small = buckets.findIndex((b) => b.length < 2);
    if (big === -1 || small === -1) break;
    buckets[small].push(buckets[big].pop()!);
  }
  const names = shuffle(TEAM_NAMES);
  return buckets.map((playerIds, i) => ({ name: names[i % names.length], playerIds, score: 0, roundScores: [] }));
}

// --- Question banks (local only, £0, no network at the party) ---
function bankFor(categoryId: number): LocalQuestion[] {
  // Base four packs live as BASE_QUESTIONS inside trivia-local (not exported);
  // they are re-exported here via the same objects SEASON_TWO merge used.
  const base = (TriviaLocal as any).BASE_QUESTIONS as Record<number, LocalQuestion[]> | undefined;
  if (base && base[categoryId]) return base[categoryId];
  return SEASON_TWO_QUESTIONS[categoryId] || [];
}

export function pickCategories(count = 5): number[] {
  return shuffle(LOCAL_CATEGORIES.map((c) => c.id)).slice(0, count);
}

export function categoryName(id: number): string {
  return LOCAL_CATEGORIES.find((c) => c.id === id)?.name || 'Mystery';
}

// Draw `perRound` questions per category, avoiding anything already asked.
export function drawRounds(categoryIds: number[], perRound = 5, alreadyAsked: string[] = []): DrawnQuestion[][] {
  const used = new Set(alreadyAsked);
  return categoryIds.map((cid) => {
    const pool = shuffle(bankFor(cid)).filter((q) => !used.has(q.question));
    const picked = pool.slice(0, perRound);
    picked.forEach((q) => used.add(q.question));
    return picked.map((q) => {
      const opts = shuffle([q.correct, ...q.wrong]);
      return { question: q.question, options: opts, correctIndex: opts.indexOf(q.correct) };
    });
  });
}

// --- Chester's host voice (local banks, £0) ---
const INTRO_LINES = [
  "Welcome to Team Trivia! I'm Chester, your host with the most questions. Huddle up, pick a captain, and no googling - I can see everything. Probably.",
  "Good evening quizzers! Chester here. Five rounds, five categories, one winning team. May the best huddle win.",
];
const TEAM_LINES = [
  "Teams are sorted! Look at those names. I've seen worse. I haven't, but it pays to be kind.",
  "There are your teams! Remember: the captain taps, the team talks. That's the whole law.",
];
const ROUND_LINES = [
  'Round {n}: {cat}. Nice and gentle to start... ish.',
  'Round {n}: {cat}. The heat is rising. Trust your huddle.',
  'Round {n}: {cat}. Halfway after this. Captains, fingers ready.',
  'Round {n}: {cat}. This is where quizzes are won and friendships are tested.',
  'Final round: {cat}! Double the drama, same points. Everything to play for.',
];
const REVEAL_RIGHT = ['Correct! Lovely huddling.', 'Bang on! Points on the board.', 'That is right - someone did their homework.'];
const REVEAL_WRONG = ['Oh no. Wrong. The huddle has let you down.', 'Not that one. Chester winces.', 'Incorrect - the other teams say thank you.'];
const SCORE_LINES = [
  'Scores after round {n}: {leader} lead the pack. Plenty of quiz left.',
  'Round {n} done. {leader} out in front - but one good round changes everything.',
];
export function line(bank: string[], vars: Record<string, string> = {}): string {
  let s = bank[Math.floor(Math.random() * bank.length)];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}
export const LINES = { INTRO_LINES, TEAM_LINES, ROUND_LINES, REVEAL_RIGHT, REVEAL_WRONG, SCORE_LINES };

// --- Room helpers (host side) ---
export function freshRoom(code: string): TeamRoom {
  return { code, phase: 'lobby', players: [], teams: [], categoryIds: [], round: 0, qIndex: 0, answers: {}, asked: [], wild: undefined, suddenDeath: null, hostLine: line(INTRO_LINES), startedAt: Date.now(), updatedAt: Date.now() };
}

export function publicView(room: TeamRoom, rounds: DrawnQuestion[][] | null): PublicTeamRoom {
  const answers: Record<number, boolean> = {};
  for (const [k, v] of Object.entries(room.answers)) answers[Number(k)] = v !== null;
  let current = null;
  let reveal = null;
  const q = rounds?.[room.round]?.[room.qIndex];
  if (q && (room.phase === 'question' || room.phase === 'reveal' || room.phase === 'scoreboard' || room.phase === 'final')) {
    current = { question: q.question, options: q.options };
    if (room.phase !== 'question') {
      reveal = {
        correctIndex: q.correctIndex,
        perTeam: room.teams.map((_, teamIdx) => {
          const picked = room.answers[teamIdx] ?? null;
          return { teamIdx, picked, correct: picked === q.correctIndex };
        }),
      };
    }
  }
  const { answers: _a, ...rest } = room;
  return { ...rest, answers, current, reveal };
}
