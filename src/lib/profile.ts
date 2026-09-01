export type GameKind = 'chester' | 'pvp';

export type ProfileState = {
  username: string;
  totalPoints: number;
  miniGamePoints: number;
  dailyPoints: number;
  games: Record<GameKind, { played: number; won: number }>;
  completedMiniGames: string[];
  dailyAttempts: Record<string, { timeMs: number; accuracy: number; points: number }>;
};

const PROFILE_KEY = 'chess-town-profile';

const initialProfile: ProfileState = {
  username: 'Challenger',
  totalPoints: 0,
  miniGamePoints: 0,
  dailyPoints: 0,
  games: { chester: { played: 0, won: 0 }, pvp: { played: 0, won: 0 } },
  completedMiniGames: [],
  dailyAttempts: {},
};

export const MINI_GAME_BASE_POINTS: Record<string, number> = {
  BEGINNER: 50,
  INTERMEDIATE: 150,
  ADVANCED: 300,
  EXPERT: 500,
  DAILY: 150,
};

export function calculateMiniGamePoints({ tier, mistakes, elapsedMs, targetMs }: { tier: string; mistakes: number; elapsedMs: number; targetMs: number }) {
  const base = MINI_GAME_BASE_POINTS[tier] ?? MINI_GAME_BASE_POINTS.INTERMEDIATE;
  const accuracyBonus = mistakes === 0 ? 50 : 0;
  const subtotal = base + accuracyBonus;
  const speedBonus = elapsedMs <= targetMs ? Math.round(subtotal * 0.25) : 0;
  return { base, accuracyBonus, speedBonus, total: subtotal + speedBonus };
}

export function getProfile(): ProfileState {
  if (typeof window === 'undefined') return initialProfile;
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    return saved ? { ...initialProfile, ...saved, games: { ...initialProfile.games, ...saved.games }, dailyAttempts: saved.dailyAttempts || {} } : initialProfile;
  } catch {
    return initialProfile;
  }
}

export function saveProfile(profile: ProfileState) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent('chess-town-profile-updated', { detail: profile }));
  return profile;
}

export function recordMiniGame(input: { id: string; tier: string; mistakes: number; elapsedMs: number; targetMs: number }) {
  const profile = getProfile();
  if (profile.completedMiniGames.includes(input.id)) return { profile, points: 0 };
  const points = calculateMiniGamePoints(input);
  profile.completedMiniGames = [...profile.completedMiniGames, input.id];
  profile.miniGamePoints += points.total;
  profile.totalPoints += points.total;
  return { profile: saveProfile(profile), points: points.total };
}

export function recordDailyAttempt(input: { date: string; timeMs: number; accuracy: number }) {
  const profile = getProfile();
  if (profile.dailyAttempts[input.date]) return { profile, points: 0, alreadyCompleted: true };
  const points = calculateMiniGamePoints({ tier: 'DAILY', mistakes: input.accuracy === 100 ? 0 : 1, elapsedMs: input.timeMs, targetMs: 60000 }).total;
  profile.dailyAttempts[input.date] = { ...input, points };
  profile.dailyPoints += points;
  profile.totalPoints += points;
  return { profile: saveProfile(profile), points, alreadyCompleted: false };
}

export function recordGame(kind: GameKind, won: boolean) {
  const profile = getProfile();
  profile.games[kind].played += 1;
  if (won) profile.games[kind].won += 1;
  return saveProfile(profile);
}

export function getTitle(points: number) {
  if (points >= 2500) return 'Grandmaster';
  if (points >= 1200) return 'Arena Captain';
  if (points >= 500) return 'Tactical Knight';
  return 'Town Rookie';
}