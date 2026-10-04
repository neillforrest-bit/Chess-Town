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
export const isBossLevel = (level: number) => level % 3 === 0;
export const bossFor = (level: number): RoadBoss | null => (isBossLevel(level) ? BOSS_ROSTER[level] || null : null);
/** Nominal strength. Levels 1-14 interpolate 800..3190 Elo. Level 15 is unlimited (null): Joseph plays at full grandmaster strength. */
export const ROAD_FLOOR_ELO = 800;
export function eloForLevel(level: number): number | null {
  if (level >= ROAD_MAX) return null;
  const l = Math.max(1, level);
  return Math.round(ROAD_FLOOR_ELO + ((l - 1) / 13) * (3190 - ROAD_FLOOR_ELO));
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
const KEY = 'ct-road-level-v1';
export function getRoadLevel(): number {
  try { const n = parseInt(window.localStorage.getItem(KEY) || '1', 10); return Math.min(ROAD_MAX, Math.max(1, n || 1)); } catch { return 1; }
}
export function setRoadLevel(n: number) { try { window.localStorage.setItem(KEY, String(Math.min(ROAD_MAX, Math.max(1, n)))); } catch { /* storage unavailable */ } }
export function bossTauntPrompt(boss: RoadBoss, playerName = 'Forrest'): string {
  return `You are ${boss.name}, a ${boss.archetype}. You are playing a boss match against ${playerName}. Generate a 1-sentence hostile taunt based on the engine evaluation swing. Do not offer advice.${boss.name === 'Joseph' ? " If the boss is 'Joseph', return an empty string." : ''}`;
}
