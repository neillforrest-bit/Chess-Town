// Road to Joseph: a 15-level ladder. Every 3rd level is a boss fight (exam mode).
export type RoadBoss = { name: string; archetype: string };
export const ROAD_MAX = 15;
export const BOSS_ROSTER: Record<number, RoadBoss> = {
  3: { name: 'Pawn Solo', archetype: 'The Casual Player' },
  6: { name: 'Dark Knight', archetype: 'The Methodical Grinder' },
  9: { name: 'Arch-Bishop', archetype: 'The Chaotic Aggressor' },
  12: { name: 'Ice Queen', archetype: 'The Defensive Wall' },
  15: { name: 'Joseph', archetype: 'The Final Mastermind' },
};
/** Batch 177 (stage 2 RPG): pre-boss scouting card - badge emoji + one tactical focus line, deterministic. */
export const BOSS_FOCUS: Record<number, { emoji: string; focus: string }> = {
  3: { emoji: '♟️', focus: 'TRAINING FOCUS: punishing drift - take the centre early and develop every piece.' },
  6: { emoji: '🐴', focus: 'TRAINING FOCUS: patience in quiet positions - keep pieces active and avoid weak pawns.' },
  9: { emoji: '🏹', focus: 'TRAINING FOCUS: defending early raids - develop with tempo, castle on time, and let attacks run out of fuel.' },
  12: { emoji: '❄️', focus: 'TRAINING FOCUS: breaking down a wall - build slowly, improve your worst piece, strike only when it is really winning.' },
  15: { emoji: '👑', focus: 'TRAINING FOCUS: everything you have learned - no gifts, play your best chess on every move.' },
};
/** Batch 179: per-level training focus text for the pre-game card on NORMAL levels (his words: "text that overrides the game board to talk about the difficulty between each level"). */
export function levelFocus(level: number): string {
  if (level <= 2) return 'TRAINING FOCUS: the basics - centre pawns, develop knights and bishops, castle early.';
  if (level <= 5) return 'TRAINING FOCUS: stop hanging pieces - before every move, check what is attacked.';
  if (level <= 8) return 'TRAINING FOCUS: tactics - look for forks, pins and loose pieces before developing on autopilot.';
  if (level <= 11) return 'TRAINING FOCUS: plans over moves - ask what your worst-placed piece needs.';
  return 'TRAINING FOCUS: precision - calculate every forcing move: checks, captures, threats.';
}
export const isBossLevel = (level: number) => level % 3 === 0;
export const bossFor = (level: number, variant: RoadVariant = 'joseph'): RoadBoss | null => {
  if (variant === 'rost') return ROST_ROSTER[level] || null;
  return isBossLevel(level) ? (variant === 'brendo' ? BRENDO_ROSTER : BOSS_ROSTER)[level] || null : null;
};
/** Variant-aware boss test: on the Rost road, PJ (level 2) is the boss; David Rost (level 1) is a full-teaching medium level. */
export const isBossFor = (variant: RoadVariant, level: number): boolean => (variant === 'rost' ? level === 2 : isBossLevel(level));
/** Boss level numbers per variant, for "next boss" copy. */
export const BOSS_LEVELS: Record<RoadVariant, number[]> = { joseph: [3, 6, 9, 12, 15], brendo: [3, 6, 9], rost: [2] };

export type RoadVariant = 'joseph' | 'brendo' | 'rost';

/** BUILD 186 (5 Nov 2026): David Rost mode - his invite road for Brendo. Level 1: David Rost at a
   medium engine setting with full teaching; Level 2: boss PJ, harder. 2 levels, both named. */
export const ROST_MAX = 2;
export const ROST_ROSTER: Record<number, RoadBoss> = {
  2: { name: 'PJ', archetype: 'The Harder Test' },
};
/** Displayed difficulty SETTINGS per level (settings, not measured human Elo). */
export const ROST_LEVEL_ELO: Record<number, number> = { 1: 1300, 2: 1850 };
/** Effective global-ramp level the engine actually plays at (medium ~L6, harder ~L10). */
const ROST_EFFECTIVE: Record<number, number> = { 1: 6, 2: 10 };
export const effectiveLevelFor = (variant: RoadVariant, level: number): number => (variant === 'rost' ? (ROST_EFFECTIVE[level] || 6) : level);
/** Variant-aware displayed difficulty setting. */
export const eloForLevelV = (variant: RoadVariant, level: number): number | null => (variant === 'rost' ? (ROST_LEVEL_ELO[level] ?? null) : eloForLevel(level));
/** Deterministic PJ banter (exam mode, no LLM): hostile on player mistakes, grudging on strong moves, needling otherwise. */
export const ROST_PJ_TAUNTS = {
  bad: ['PJ: Rost was the warm-up. I am the exam.', 'PJ: That move just made my job easier.', 'PJ: Simpler, remember? You are making it simpler for ME.'],
  good: ['PJ: Fine. That one was real. Do it again.', 'PJ: Okay. You have been practising.'],
  calm: ['PJ: Rost told me you were quick. Show me.', 'PJ: Medium is behind you. This is harder.'],
} as const;

/** BUILD 184 (4 Nov 2026): Time to Beat Brendo - a shorter, friendlier road cloned from Road to Joseph for Brendo. */
/** BUILD 187 (5 Nov, his cast list): the Brendo road's commentary cast - Concord Academy,
 *  Neillo, Aidan the maiden, David Rost, Ayres, Andy, Gabe, Danny, jay bird. Deterministic,
 *  reacting to the chess only (no invented personal facts about real people). Used on the
 *  shareable Brendo and Rost invite flows. */
export const BRENDO_CAST_TAUNTS = {
  bad: ['Aidan the maiden spotted that threat before you moved.', 'David Rost would never have given that piece away.', 'Concord Academy rule one: check what they attack before you move. That one gets homework.'],
  good: ['Neillo will hear about that move. Yes, that one.', 'Ayres just stood up. That was proper chess.', 'jay bird is telling everyone. Lovely move.'],
  calm: ['Andy says breathe. Take the steady square.', 'Gabe rates your position here. Do not spoil it.', 'Danny has seen games turn on less than this. Concentrate.'],
} as const;

/** Boss-flavoured lines on the Brendo road: the boss speaks, the cast gets named. */
export const BRENDO_BOSS_TAUNTS = {
  bad: ['The whole of Concord Academy is watching, and you play THAT?', 'Danny saw that blunder from the back row.'],
  good: ['Okay. Gabe saw that one. Do it again.', 'Fine. Ayres taught someone well.'],
  calm: ['Andy and Neillo both said you were quick. Show me.', 'jay bird is commentating for the Academy. Make it worth his time.'],
} as const;

export const BRENDO_MAX = 9;
export const BRENDO_ROSTER: Record<number, RoadBoss> = {
  3: { name: 'Little Brendo', archetype: 'The Eager Challenger' },
  6: { name: 'Brendo Prime', archetype: 'The Trash-Talking Tactician' },
  9: { name: 'BRENDO', archetype: 'The One To Beat' },
};
export const roadMaxFor = (variant: RoadVariant = 'joseph'): number => (variant === 'brendo' ? BRENDO_MAX : variant === 'rost' ? ROST_MAX : ROAD_MAX);
const ROAD_KEYS: Record<RoadVariant, string> = { joseph: 'ct-road-level-v1', brendo: 'ct-brendo-level-v1', rost: 'ct-rost-level-v1' };
/** Nominal strength. Levels 1-14 interpolate 800..3190 Elo. Level 15 is unlimited (null): Joseph plays at full grandmaster strength. */
export const ROAD_FLOOR_ELO = 600;
// Batch 176 (his steering): the old ramp hit ~2271 by level 9 of 15 - far too steep for a
// beginner-to-master road. Gentler linear ramp: ~600 at L1 to ~2400 at L14, L15 unlimited.
// This is the nominal engine SETTING, not a measured strength.
const ROAD_CEIL_ELO = 2400;
export function eloForLevel(level: number): number | null {
  if (level >= ROAD_MAX) return null;
  const l = Math.max(1, level);
  return Math.round(ROAD_FLOOR_ELO + ((l - 1) / 13) * (ROAD_CEIL_ELO - ROAD_FLOOR_ELO));
}
/** UCI_Elo for levels 4+: rounded to an integer and clamped to 1380..3190 (Stockfish rejects decimals and values under its floor). */
export const engineEloFor = (level: number): number | null => {
  const e = eloForLevel(level);
  return e === null ? null : Math.max(1380, Math.min(3190, Math.round(e)));
};
/** Levels 1-3 skip UCI_Elo: the engine searches 3 lines at depth 1/1/2 and a dice roll picks which line to play. */
export const isHandicapLevel = (level: number) => level >= 1 && level <= 3;
/** BUILD 148 (restored): the human-style casual-pick blend, layered ON TOP of the handicap dice so Level 1 plays like a beginner (85% at level 1, fading to 0 at 1320 Elo). */
export function casualChanceForLevel(level: number): number {
  // BUILD 149: his retest - L1 right, L2 far too hard. Gentler ramp: 85 / 78 / 60 / 30 then engine only.
  return ({ 1: 0.85, 2: 0.78, 3: 0.6, 4: 0.3 } as Record<number, number>)[level] || 0;
}
export const HANDICAP_DEPTH: Record<number, number> = { 1: 1, 2: 1, 3: 2 };
/** Cumulative odds for [best, 2nd, 3rd]. */
export const HANDICAP_ODDS: Record<number, number[]> = { 1: [0.5, 0.3, 0.2], 2: [0.7, 0.3], 3: [0.85, 0.15] };
export function pickHandicapIndex(level: number, roll = Math.random(), available = 3): number {
  const odds = HANDICAP_ODDS[level] || [1];
  let acc = 0;
  for (let i = 0; i < odds.length; i++) { acc += odds[i]; if (roll < acc) return Math.min(i, available - 1); }
  return 0;
}
export function depthForLevel(level: number): number {
  if (level >= ROAD_MAX) return 22;
  const e = eloForLevel(level) ?? 3190;
  return e < 1320 ? 2 : Math.min(16, 6 + Math.round(level * 0.7));
}
/** Think-time cap per move (ms) so high levels stay under the analysis timeout on a phone. */
export function movetimeForLevel(level: number): number {
  return level >= ROAD_MAX ? 4000 : level >= 10 ? 2500 : level >= 5 ? 1200 : 600;
}
/** The persona/teaching tier a level borrows from the older 4-step ladder. */
export function tierForLevel(level: number): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' {
  return level <= 4 ? 'BEGINNER' : level <= 8 ? 'INTERMEDIATE' : level <= 12 ? 'ADVANCED' : 'EXPERT';
}
export function getRoadLevel(variant: RoadVariant = 'joseph'): number {
  try { const n = parseInt(window.localStorage.getItem(ROAD_KEYS[variant]) || '1', 10); return Math.min(roadMaxFor(variant), Math.max(1, n || 1)); } catch { return 1; }
}
export function setRoadLevel(n: number, variant: RoadVariant = 'joseph') { try { window.localStorage.setItem(ROAD_KEYS[variant], String(Math.min(roadMaxFor(variant), Math.max(1, n)))); } catch { /* storage unavailable */ } }
export function bossTauntPrompt(boss: RoadBoss, playerName = 'Forrest'): string {
  return `You are ${boss.name}, a ${boss.archetype}. You are playing a boss match against ${playerName}. Generate a 1-sentence hostile taunt based on the engine evaluation swing. Do not offer advice.${boss.name === 'Joseph' ? " If the boss is 'Joseph', return an empty string." : ''}`;
}
