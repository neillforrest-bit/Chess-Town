// Chesterville solo rating - local-only (localStorage), no accounts, no backend.
// Designed so the same {points, history} shape can later feed a community ladder:
// every win is a dated entry, points are additive and difficulty-scaled.
export type RatingState = { points: number; wins: number; history: { at: string; kind: string; label: string; points: number }[] };
const KEY = 'ct-rating-v1';

export const RANKS: { min: number; name: string; icon: string }[] = [
  { min: 0, name: 'PAWN', icon: '♟' },
  { min: 100, name: 'KNIGHT', icon: '♞' },
  { min: 250, name: 'BISHOP', icon: '♝' },
  { min: 500, name: 'ROOK', icon: '♜' },
  { min: 900, name: 'QUEEN', icon: '♛' },
  { min: 1400, name: 'KING', icon: '♚' },
  { min: 2200, name: 'TOP DOG', icon: '👑' },
];

export const DIFFICULTY_POINTS: Record<string, number> = { BEGINNER: 40, INTERMEDIATE: 80, ADVANCED: 160, EXPERT: 300 };

export function getRating(): RatingState {
  if (typeof window === 'undefined') return { points: 0, wins: 0, history: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); return { points: p.points || 0, wins: p.wins || 0, history: Array.isArray(p.history) ? p.history : [] }; }
  } catch { /* private browsing */ }
  return { points: 0, wins: 0, history: [] };
}

export function rankFor(points: number): { name: string; icon: string; next: { name: string; at: number } | null } {
  let current = RANKS[0];
  for (const rank of RANKS) if (points >= rank.min) current = rank;
  const idx = RANKS.indexOf(current);
  const next = idx < RANKS.length - 1 ? { name: RANKS[idx + 1].name, at: RANKS[idx + 1].min } : null;
  return { name: current.name, icon: current.icon, next };
}

export function awardPoints(kind: string, label: string, points: number): RatingState {
  const state = getRating();
  const next: RatingState = {
    points: state.points + points,
    wins: state.wins + 1,
    history: [...state.history, { at: new Date().toISOString(), kind, label, points }].slice(-200),
  };
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private browsing */ }
  return next;
}

/* ---- Boss-map progress (RPG skeleton) ---- */
export type BossProgress = { completed: string[] };
const BOSS_KEY = 'ct-boss-v1';

export function getBossProgress(): BossProgress {
  if (typeof window === 'undefined') return { completed: [] };
  try {
    const raw = window.localStorage.getItem(BOSS_KEY);
    if (raw) { const p = JSON.parse(raw); return { completed: Array.isArray(p.completed) ? p.completed : [] }; }
  } catch { /* private browsing */ }
  return { completed: [] };
}

export function completeBossNode(nodeId: string): BossProgress {
  const progress = getBossProgress();
  if (progress.completed.includes(nodeId)) return progress;
  const next = { completed: [...progress.completed, nodeId] };
  try { window.localStorage.setItem(BOSS_KEY, JSON.stringify(next)); } catch { /* private browsing */ }
  return next;
}

/* ---- Gated Chester ladder (batch 29) ----
   Players start at ROOKIE and unlock the next level only by beating the current
   one. Beating NIGHTMARE crowns GRAND CHESTER. Local-only, same localStorage
   philosophy as the solo rating above; the landing page reads this to greet,
   congratulate and assign homework. */
export const LADDER_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
export const LADDER_LABELS: Record<string, string> = { BEGINNER: 'ROOKIE', INTERMEDIATE: 'CLUB', ADVANCED: 'MASTER', EXPERT: 'NIGHTMARE' };

export type LadderState = {
  unlocked: number;          // highest unlocked LADDER_LEVELS index (0 = ROOKIE only)
  grandChester: boolean;     // beaten NIGHTMARE
  lastLevel: string | null;
  lastResult: 'win' | 'loss' | 'draw' | null;
  lastGrade: string | null;
  lastFocus: string | null;      // the focus point from the last scorecard
  lastWeakness: string | null;   // weakest-habit key from the last scorecard
  updatedAt: string | null;
};
const LADDER_KEY = 'ct-chester-ladder-v1';
const LADDER_DEFAULT: LadderState = { unlocked: 0, grandChester: false, lastLevel: null, lastResult: null, lastGrade: null, lastFocus: null, lastWeakness: null, updatedAt: null };

export function getLadder(): LadderState {
  if (typeof window === 'undefined') return LADDER_DEFAULT;
  try {
    const raw = window.localStorage.getItem(LADDER_KEY);
    if (raw) { const p = JSON.parse(raw); return { ...LADDER_DEFAULT, ...p }; }
  } catch { /* private browsing */ }
  return LADDER_DEFAULT;
}

export function recordLadderGame(input: { level: string; result: 'win' | 'loss' | 'draw'; grade?: string | null; focus?: string | null; weakness?: string | null }): LadderState {
  const state = getLadder();
  const idx = LADDER_LEVELS.indexOf(input.level as (typeof LADDER_LEVELS)[number]);
  let unlocked = state.unlocked;
  let grandChester = state.grandChester;
  if (input.result === 'win' && idx >= 0) {
    if (idx === LADDER_LEVELS.length - 1) grandChester = true;
    else if (idx >= unlocked) unlocked = Math.min(LADDER_LEVELS.length - 1, idx + 1);
  }
  const next: LadderState = { unlocked, grandChester, lastLevel: input.level, lastResult: input.result, lastGrade: input.grade || null, lastFocus: input.focus || null, lastWeakness: input.weakness || null, updatedAt: new Date().toISOString() };
  try { window.localStorage.setItem(LADDER_KEY, JSON.stringify(next)); } catch { /* private browsing */ }
  return next;
}

/* ---- Verdict memory: the mission banked from the last report card ----
   Next game's card opens with the callback: fixed, or still the leak. */
export type VerdictMemory = { leakKey: string | null; mission: string | null; at: string | null };
const VERDICT_KEY = 'ct-verdict-v1';
const VERDICT_DEFAULT: VerdictMemory = { leakKey: null, mission: null, at: null };

export function getVerdictMemory(): VerdictMemory {
  if (typeof window === 'undefined') return VERDICT_DEFAULT;
  try {
    const raw = window.localStorage.getItem(VERDICT_KEY);
    if (raw) { const p = JSON.parse(raw); return { ...VERDICT_DEFAULT, ...p }; }
  } catch { /* private browsing */ }
  return VERDICT_DEFAULT;
}

export function recordVerdictMemory(leakKey: string, mission: string): VerdictMemory {
  const next: VerdictMemory = { leakKey, mission, at: new Date().toISOString() };
  try { window.localStorage.setItem(VERDICT_KEY, JSON.stringify(next)); } catch { /* private browsing */ }
  return next;
}

/* Where Chester sends you to practise each weakness. */
export const WEAKNESS_HOMEWORK: Record<string, { text: string; href: string }> = {
  development: { text: 'Lesson Hall - the develop-with-purpose drills', href: '/training' },
  kingSafety: { text: 'Lesson Hall - castle early, every single game', href: '/training' },
  tactics: { text: 'Mate Sprint - sixty seconds of checks and captures', href: '/mate-sprint' },
  accuracy: { text: 'a rematch at your level - one breath before every move', href: '/play-chester' },
  blunders: { text: 'Pawn Wars - short sharp games, nothing left hanging', href: '/pawn-wars' },
};

/* Honest weakest-habit read from the scorecard dimensions. Shared by the
   report card, the ladder record and the landing-page homework line. */
export function weakestHabit(summary: { development?: number; kingSafety?: number; accuracy?: number; tactics?: number } | undefined, blunders: number): { key: string; reason: string; focus: string } {
  const dims = [
    { key: 'development', value: summary?.development ?? 100, reason: 'your back pieces slept too long', focus: 'First ten moves: bring every knight and bishop off the back rank before chasing anything. Soldiers first, plans second.' },
    { key: 'kingSafety', value: summary?.kingSafety ?? 100, reason: 'your king stayed in the firing line', focus: 'Castle inside your first eight moves. A king in the centre is a target wearing a crown.' },
    { key: 'accuracy', value: summary?.accuracy ?? 100, reason: 'too many moves gave away ground', focus: 'Pause one breath before every move and ask what it leaves undefended. Loose pieces are where games leak.' },
    { key: 'tactics', value: summary?.tactics ?? 100, reason: 'loose pieces went unpunished - and unprotected', focus: 'Before every move, scan checks, captures and threats - in that order. The free points live there.' },
  ];
  dims.sort((a, b) => a.value - b.value);
  if (blunders >= 3) return { key: 'blunders', reason: `${blunders} moves dropped serious material`, focus: 'Pause one breath before every move and ask what it leaves undefended. Blunders you review are blunders you stop making.' };
  return dims[0];
}
