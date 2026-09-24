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
