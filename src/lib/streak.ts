// Play streak: consecutive local days with at least one finished game. Device-local.
const KEY = 'ct-play-streak-v1';
type S = { last: string; streak: number; best: number };
const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function read(): S { try { const s = JSON.parse(window.localStorage.getItem(KEY) || 'null') as S | null; if (s && typeof s.streak === 'number') return s; } catch { /* */ } return { last: '', streak: 0, best: 0 }; }
export function getPlayStreak(): { streak: number; playedToday: boolean } {
  const s = read(); const today = dayStr(); const y = new Date(); y.setDate(y.getDate() - 1);
  if (s.last === today) return { streak: s.streak, playedToday: true };
  if (s.last === dayStr(y)) return { streak: s.streak, playedToday: false };
  return { streak: 0, playedToday: false };
}
export function bumpPlayStreak() {
  try {
    const s = read(); const today = dayStr(); if (s.last === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const streak = s.last === dayStr(y) ? s.streak + 1 : 1;
    window.localStorage.setItem(KEY, JSON.stringify({ last: today, streak, best: Math.max(s.best, streak) }));
  } catch { /* storage blocked */ }
}
