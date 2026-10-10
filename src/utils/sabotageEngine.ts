/** CineSync v3.0 sabotage + chaos: one use per session per player (Veto, Block, Genre Roulette, Orson Takes the Wheel), Feline Intervention (5%), Spectacle Multiplier. Pure state mutations; game.ts's reducer calls sabIntent. */
import { BY_ID, poolOf, seeded, shuffled, type State, type Sab, type SabKey, type PID, type Movie } from '@/lib/game';
import { finish, type B8, type M8 } from '@/lib/b8';

export const FELINE_P = 0.05;
export const SAB_LABEL: Record<SabKey, string> = { veto: 'VETO', block: 'BLOCK', roulette: 'GENRE ROULETTE', orson: 'ORSON PICKS' };
const other = (p: PID): PID => (p === 'A' ? 'B' : 'A');
export const newSab = (): Sab => ({ A: { veto: true, block: true, roulette: true, orson: true }, B: { veto: true, block: true, roulette: true, orson: true }, genre: null, log: [] });

export { CAT_WILDS } from './catWilds';
import { CAT_WILDS } from './catWilds';

/** Spectacle tags: TMDB (and OMDB) carry no 4K HDR / Dolby Atmos format data, so a film counts as "Atmos-grade" when it is a modern big-screen genre piece. Documented proxy, tunable here. */
export const SPEC_GENRES = ['Action', 'Science Fiction', 'Adventure', 'Fantasy', 'War', 'Animation'];
export const isSpectacle = (id: number | null): boolean => { const m = id === null ? null : BY_ID[id]; return !!m && m.y >= 2010 && m.r >= 7.8 && m.g.some((g) => SPEC_GENRES.includes(g)); };
export const SPEC_TAG = '4K HDR · ATMOS';

const say = (s: State, line: string, mood: 'smug' | 'shock' | 'glee' | 'scheme' = 'scheme') => { s.orson = { ...s.orson, line, mood, n: s.orson.n + 1 }; };

export function canUse(s: State, pid: PID, k: SabKey): boolean {
  const u = s.sab?.[pid]; if (!u || !u[k]) return false;
  if (k === 'roulette') return s.phase === 'vibe' || (s.phase === 'draft' && !s.draft.loading && s.draft.gren.id === null);
  const b = s.b8; if (s.phase !== 'bracket' || !b) return false;
  const m = b.matches[b.cur]; if (!m || m.round < 2 || m.a === null || m.b === null || m.status !== 'VOTING_ACTIVE' || m.winner !== null || m.trivia) return false;
  if (k === 'block') return !(m.wg[other(pid)] || m.live?.[other(pid)]) && !m.blk;
  return true;
}

/** The movie a Veto kills: the opponent's film in this matchup (their conference owns it); if it is not clear, the lower seed. */
function vetoTarget(b: B8, m: M8, pid: PID): number {
  const a = m.a as number, c = m.b as number; const oa = b.conf[a]?.p, oc = b.conf[c]?.p;
  if (oa === other(pid) && oc !== other(pid)) return a; if (oc === other(pid) && oa !== other(pid)) return c;
  return m.seedA > m.seedB ? a : c;
}

export function sabIntent(s: State, it: { pid: PID; kind: SabKey; winner?: number; genre?: string }, now: number) {
  s.sab ||= newSab(); const pid = it.pid; if (pid !== 'A' && pid !== 'B') return;
  if (!canUse(s, pid, it.kind)) return;
  const nm = s.players[pid].name; const b = s.b8; const m = b ? b.matches[b.cur] : null;
  if (it.kind === 'roulette') {
    const g = genreRoulette(s); if (!g) return; s.sab[pid].roulette = false; s.sab.genre = g;
    if (s.phase === 'draft') {
      const deck = genreDeck(s, g); const taken = new Set([...s.draft.picks.A, ...s.draft.picks.B]);
      s.draft.deck = deck; s.draft.q = { A: deck.filter((x) => !s.draft.picks.A.includes(x) && !taken.has(x)), B: deck.filter((x) => !s.draft.picks.B.includes(x) && !taken.has(x)) }; s.draft.inbox = { A: [], B: [] };
    }
    say(s, `GENRE ROULETTE. ${nm} did not like the options, so I spun the wheel. Tonight is now ${g}. Nobody is happy. That is how you know it is fair.`); s.log.unshift(`${nm} spun GENRE ROULETTE: ${g}.`); return;
  }
  if (!b || !m) return;
  if (it.kind === 'veto') {
    const dead = vetoTarget(b, m, pid), live = dead === m.a ? (m.b as number) : (m.a as number); s.sab[pid].veto = false; s.vetoed.push(dead);
    say(s, `VETO. ${nm} has struck ${BY_ID[dead].t} from the record. ${BY_ID[live].t} advances without lifting a finger. Democracy is dead.`);
    m.veto = { by: pid, dead }; s.sab.log.unshift(`${nm} vetoed ${BY_ID[dead].t}`); finish(s, m, live, `${nm} played THE VETO on ${BY_ID[dead].t}`, now); return;
  }
  if (it.kind === 'block') {
    const tg = other(pid); s.sab[pid].block = false; m.blk = { by: pid, target: tg }; s.sab.log.unshift(`${nm} blocked ${s.players[tg].name}`);
    say(s, `THE BLOCK. ${nm} has frozen ${s.players[tg].name}'s token HUD for this round. Zero wager. Zero dignity. Pick with your heart, since your wallet is on ice.`); s.log.unshift(`${nm} BLOCKED ${s.players[tg].name}'s tokens this round.`); return;
  }
  if (it.kind === 'orson') {
    const w = Number(it.winner); if (w !== m.a && w !== m.b) return; s.sab[pid].orson = false;
    m.orsonPick = { by: pid, winner: w };
    say(s, `ORSON TAKES THE WHEEL. ${nm} handed me the keys. I consulted the critics: ${BY_ID[w].t} it is. Do not thank me.`, 'glee');
    finish(s, m, w, `Orson took the wheel for ${nm}: critics' scores pick ${BY_ID[w].t}`, now);
  }
}

/** Pick a radically different genre: not one of the top genres in the current deck, with enough unseen films. */
export function genreRoulette(s: State): string | null {
  const pool = poolOf(s.kind).filter((m) => !m.w); const cnt: Record<string, number> = {};
  for (const id of (s.draft.deck.length ? s.draft.deck : []).slice(0, 40)) for (const g of BY_ID[id]?.g || []) cnt[g] = (cnt[g] || 0) + 1;
  const top = Object.entries(cnt).sort((x, y) => y[1] - x[1]).slice(0, 3).map((x) => x[0]);
  const all: Record<string, number> = {}; for (const m of pool) if (m.r >= 6) for (const g of m.g) all[g] = (all[g] || 0) + 1;
  const opts = Object.keys(all).filter((g) => all[g] >= 14 && !top.includes(g) && g !== s.sab?.genre).sort();
  if (!opts.length) return null; const r = seeded(s.code, 'roulette' + (s.log.length)); return opts[Math.floor(r() * opts.length)];
}
export function genreDeck(s: State, genre: string): number[] {
  const ban = new Set([...(s.seenBan || []), ...s.draft.picks.A, ...s.draft.picks.B]);
  const ok = poolOf(s.kind).filter((m) => !m.w && m.g.includes(genre) && m.r >= 5.8 && !ban.has(m.id)).sort((a, c) => c.r + c.pop / 400 - (a.r + a.pop / 400)).slice(0, 40).map((m) => m.id);
  return shuffled(ok, s.code, 'rdeck' + genre);
}

/** Feline Intervention: 5% per token matchup. Marley or Dilly knocks the highest-rated poster off the shelf and a wildcard takes its seat. Returns true when it fired. */
export function rollFeline(s: State, b: B8, m: M8): boolean {
  if (m.cat !== undefined || m.round < 2 || m.a === null || m.b === null) return false;
  const rnd = seeded(s.code, 'feline' + m.id + m.a + m.b); m.cat = null;
  if (rnd() >= FELINE_P) return false;
  const inPlay = new Set<number>(b.matches.flatMap((x) => [x.a, x.b]).filter((x): x is number => x !== null));
  const wild = CAT_WILDS.find((w) => !inPlay.has(w.id)); if (!wild) return false;
  const hiSide: 'a' | 'b' = BY_ID[m.a].r >= BY_ID[m.b].r ? 'a' : 'b'; const out = m[hiSide] as number;
  const by = rnd() < 0.5 ? 'Marley' : 'Dilly';
  m.was = { a: m.a, b: m.b }; m.cat = { by, out, in: wild.id };
  b.seed[wild.id] = b.seed[out]; b.conf[wild.id] = { p: b.conf[out]?.p ?? 'A', rank: b.conf[out]?.rank ?? 0, golden: false, tok: 0 };
  m[hiSide] = wild.id; if (hiSide === 'a') m.seedA = b.seed[out]; else m.seedB = b.seed[out]; delete m.tape; s.pool = s.pool.map((q) => (q === out ? wild.id : q));
  say(s, `FELINE INTERVENTION. ${by} has knocked ${BY_ID[out].t} off the shelf. In its place: ${wild.t} (${wild.y}). I did not authorise this. I also cannot stop it.`, 'shock'); s.log.unshift(`FELINE INTERVENTION: ${by} swapped ${BY_ID[out].t} for ${wild.t}.`);
  return true;
}

/** Orson Takes the Wheel: score both films by Metacritic / Rotten Tomatoes (plus IMDb). Tries OMDB through /api/omdb (needs OMDB_API_KEY on the server); falls back to the catalogue's own TMDB-sourced rt/mc/imdb so it always works. */
export type PickScore = { id: number; score: number; rt: number | null; mc: number | null; imdb: number | null; src: 'omdb' | 'catalogue' };
const scoreOf = (rt: number | null, mc: number | null, imdb: number | null, r: number): number => { const v = [rt, mc, imdb !== null ? imdb * 10 : null].filter((x): x is number => x !== null && !Number.isNaN(x)); return v.length ? v.reduce((a, c) => a + c, 0) / v.length : r * 10; };
export async function executeOrsonPicks(filmA: number, filmB: number): Promise<{ winner: number; a: PickScore; b: PickScore }> {
  const one = async (id: number): Promise<PickScore> => {
    const f = BY_ID[id]; let rt = f.rt ?? null, mc = f.mc ?? null, imdb = f.imdb ?? null, src: 'omdb' | 'catalogue' = 'catalogue';
    try {
      const r = await fetch('/api/omdb', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ imdb: f.im || '', t: f.t, y: f.y }) });
      if (r.ok) { const d = await r.json() as { rt?: number | null; mc?: number | null; imdb?: number | null }; if (d.rt != null || d.mc != null || d.imdb != null) { rt = d.rt ?? rt; mc = d.mc ?? mc; imdb = d.imdb ?? imdb; src = 'omdb'; } }
    } catch { /* catalogue fallback */ }
    return { id, rt, mc, imdb, src, score: scoreOf(rt, mc, imdb, f.r) };
  };
  const [a, b] = await Promise.all([one(filmA), one(filmB)]);
  const winner = a.score === b.score ? (BY_ID[filmA].r >= BY_ID[filmB].r ? filmA : filmB) : a.score > b.score ? filmA : filmB;
  return { winner, a, b };
}
