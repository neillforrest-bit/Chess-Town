export const ACTIVITY_KEY = 'game-town-last-session-v1';
export const WELCOME_KEY = 'game-town-welcome-v1';
export type TownActivity = { label: string; href: string; at: number; kind: 'opened' | 'finished'; result?: string };
export function readTownActivity(): TownActivity | null {
  try { const a = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || 'null'); return a && typeof a.label === 'string' && typeof a.href === 'string' && Number.isFinite(a.at) && ['opened', 'finished'].includes(a.kind) ? a : null; } catch { return null; }
}
export function recordTownActivity(activity: Omit<TownActivity, 'at'>) {
  try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify({ ...activity, at: Date.now() })); } catch { /* storage is optional */ }
}
export function trackTownRoute(path: string, search: string) {
  const q = new URLSearchParams(search);
  const names: Record<string, string> = { '/play-chester': q.get('mode') === '1v1' ? 'Local Chess Duel' : 'Chess with Chester', '/training': 'Chess Mini Games', '/boss-map': 'Chess Mini Games', '/daily-challenge': 'Daily Chess Challenge', '/brawl': 'The Underdog', '/trivia-party': 'Party Table', '/trivia': 'Last Call Quiz' };
  const label = path === '/trivia-brawl' ? q.get('road') === '1' ? 'Road to the Landlord' : q.get('pass') === '1' ? 'Pass & Play' : q.get('solo') === '1' ? 'Trivia vs Chester' : 'Trivia Brawl' : names[path];
  if (label) recordTownActivity({ label, href: path + search, kind: 'opened' });
}
export function readRoadLevel() {
  try { const n = Number(localStorage.getItem('ct-road-trivia-v1')); return Number.isInteger(n) && n >= 1 && n <= 15 ? n : null; } catch { return null; }
}
