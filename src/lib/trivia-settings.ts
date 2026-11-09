export type QuestionDifficulty = 'easy' | 'medium' | 'hard' | 'master';
export type TriviaDifficultySetting = 'classic' | QuestionDifficulty;
export type TriviaSportFocus = 'open' | 'nba' | 'nfl' | 'premier-league';

export type TriviaSettings = {
  difficulty: TriviaDifficultySetting;
  focus: TriviaSportFocus;
};

export const DEFAULT_TRIVIA_SETTINGS: TriviaSettings = { difficulty: 'classic', focus: 'open' };

export const DIFFICULTY_OPTIONS: Array<{ id: TriviaDifficultySetting; label: string; hint: string }> = [
  { id: 'classic', label: 'CLASSIC', hint: 'Rises easy to hard across five rounds' },
  { id: 'easy', label: 'EASY', hint: 'Friendlier pours all night' },
  { id: 'medium', label: 'MEDIUM', hint: 'A proper pub-quiz heat' },
  { id: 'hard', label: 'HARD', hint: 'Top-shelf questions from the start' },
  { id: 'master', label: 'MASTER', hint: 'Hardest top-shelf questions' },
];

export const SPORT_FOCUS_OPTIONS: Array<{ id: TriviaSportFocus; label: string; hint: string; categoryId: number | null }> = [
  { id: 'open', label: 'OPEN PUB', hint: 'Draft from every category', categoryId: null },
  { id: 'nba', label: 'NBA', hint: 'Every round from the NBA shelf', categoryId: -11 },
  { id: 'nfl', label: 'NFL', hint: 'Every round from the NFL shelf', categoryId: -12 },
  { id: 'premier-league', label: 'PREMIER LEAGUE', hint: 'Every round from the Premier League shelf', categoryId: -13 },
];

const SETTINGS_KEY = 'ct-trivia-settings-v1';

export function difficultyLabel(id: TriviaDifficultySetting): string {
  return DIFFICULTY_OPTIONS.find((option) => option.id === id)?.label || 'CLASSIC';
}

export function sportFocusLabel(id: TriviaSportFocus): string {
  return SPORT_FOCUS_OPTIONS.find((option) => option.id === id)?.label || 'OPEN PUB';
}

export function sportFocusCategoryId(id: TriviaSportFocus): number | null {
  return SPORT_FOCUS_OPTIONS.find((option) => option.id === id)?.categoryId ?? null;
}

export function normalizeTriviaSettings(value: unknown): TriviaSettings {
  if (!value || typeof value !== 'object') return DEFAULT_TRIVIA_SETTINGS;
  const candidate = value as Partial<Record<keyof TriviaSettings, unknown>>;
  const difficulty = DIFFICULTY_OPTIONS.some((option) => option.id === candidate.difficulty) ? candidate.difficulty as TriviaDifficultySetting : DEFAULT_TRIVIA_SETTINGS.difficulty;
  const focus = SPORT_FOCUS_OPTIONS.some((option) => option.id === candidate.focus) ? candidate.focus as TriviaSportFocus : DEFAULT_TRIVIA_SETTINGS.focus;
  return { difficulty, focus };
}

export function loadTriviaSettings(): TriviaSettings {
  if (typeof window === 'undefined') return DEFAULT_TRIVIA_SETTINGS;
  try { return normalizeTriviaSettings(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || 'null')); } catch { return DEFAULT_TRIVIA_SETTINGS; }
}

export function saveTriviaSettings(settings: TriviaSettings): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeTriviaSettings(settings))); } catch { /* private browsing */ }
}

export function roundDifficulty(setting: TriviaDifficultySetting, roundIndex: number): QuestionDifficulty {
  if (setting !== 'classic') return setting;
  return (['easy', 'easy', 'medium', 'medium', 'hard'] as QuestionDifficulty[])[Math.max(0, Math.min(4, roundIndex))];
}
