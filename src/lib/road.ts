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
/** Levels 1-14 interpolate 1320..3190 (Stockfish's UCI_Elo range). Level 15 is unlimited strength (null). */
export function eloForLevel(level: number): number | null {
  if (level >= ROAD_MAX) return null;
  const l = Math.max(1, level);
  return Math.round(1320 + ((l - 1) / 13) * (3190 - 1320));
}
/** Search depth grows with the level so high Elo settings are not throttled by a shallow search. */
export function depthForLevel(level: number): number {
  return level >= ROAD_MAX ? 16 : Math.min(14, 6 + Math.round(level * 0.6));
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
