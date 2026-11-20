// Cross-night memory: the Ledger and Orson's recollections. localStorage on the host phone first;
// silently durable once the cinesync_nights table exists (anon read/insert).
import { sb } from './supa';

export type Night = { ts: number; couple: string; winner: string; loser: string; film: string; tie: boolean; amend?: boolean };
export const coupleKey = (a: string, b: string) => [a, b].map((x) => x.trim().toLowerCase()).sort().join('+');
const LK = (c: string) => 'cs-nights-' + c;

const readLocal = (c: string): Night[] => { try { return JSON.parse(localStorage.getItem(LK(c)) || '[]'); } catch { return []; } };
const writeLocal = (c: string, l: Night[]) => { try { localStorage.setItem(LK(c), JSON.stringify(l)); } catch { /* ignore */ } };

function fold(list: Night[]): Night[] {
  const out: Night[] = [];
  for (const n of list) { if (n.amend && out.length) out[out.length - 1] = { ...n, amend: false }; else out.push(n); }
  return out;
}

export function summarize(list: Night[], nameA: string, nameB: string, durable: boolean) {
  const f = fold(list);
  const wins = (name: string) => f.filter((n) => !n.tie && n.winner.toLowerCase() === name.trim().toLowerCase()).length;
  const l = f[f.length - 1];
  return { nights: f.length, ledger: { A: wins(nameA), B: wins(nameB) }, last: l ? `${l.film}${l.tie ? ' (you agreed, boringly)' : ` (${l.winner} won the pitch-off)`}` : null, durable };
}

export async function loadMem(nameA: string, nameB: string) {
  const c = coupleKey(nameA, nameB); const local = readLocal(c);
  try {
    const { data, error } = await sb().from('cinesync_nights').select('data').eq('couple', c).order('created_at', { ascending: true }).limit(500);
    if (!error && data) {
      const remote = (data as { data: Night }[]).map((r) => r.data);
      const have = new Set(remote.map((n) => n.ts));
      const missing = local.filter((n) => !have.has(n.ts));
      for (const n of missing) await sb().from('cinesync_nights').insert({ couple: c, data: n });
      return summarize([...remote, ...missing].sort((a, b) => a.ts - b.ts), nameA, nameB, true);
    }
  } catch { /* table not there yet: stay local */ }
  return summarize(local, nameA, nameB, false);
}

export async function recordNight(n: Night, nameA: string, nameB: string) {
  const c = n.couple; const l = readLocal(c); l.push(n); writeLocal(c, l);
  let durable = false;
  try { const { error } = await sb().from('cinesync_nights').insert({ couple: c, data: n }); durable = !error; } catch { /* local only */ }
  return summarize(l, nameA, nameB, durable);
}
export const nightsKey = 'cs-nights-total';
