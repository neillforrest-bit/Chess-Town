// Weekly Boss Rush: beat three bosses back to back. A loss resets the run. Trophy per completed week. Device-local.
export const RUSH_LEVELS = [3, 6, 9] as const;
const KEY = 'ct-rush-v1';
type Store = { week: string; step: number; trophies: string[]; attempts: number };
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const wk = Math.ceil((((t.getTime() - Date.UTC(y, 0, 1)) / 86400000) + 1) / 7);
  return `${y}-W${String(wk).padStart(2, '0')}`;
}
function read(): Store {
  try {
    const s = JSON.parse(window.localStorage.getItem(KEY) || 'null') as Store | null;
    const wk = weekKey();
    if (s && Array.isArray(s.trophies)) return s.week === wk ? s : { ...s, week: wk, step: 0, attempts: 0 };
    return { week: wk, step: 0, trophies: [], attempts: 0 };
  } catch { return { week: weekKey(), step: 0, trophies: [], attempts: 0 }; }
}
function write(s: Store) { try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ } }
export function getRush(): Store & { done: boolean } { const s = read(); return { ...s, done: s.trophies.includes(s.week) }; }
export function rushWin(): { step: number; complete: boolean } {
  const s = read(); s.step += 1;
  const complete = s.step >= RUSH_LEVELS.length;
  if (complete) { if (!s.trophies.includes(s.week)) s.trophies.push(s.week); s.step = 0; }
  write(s); return { step: s.step, complete };
}
export function rushLoss() { const s = read(); s.step = 0; s.attempts += 1; write(s); }
