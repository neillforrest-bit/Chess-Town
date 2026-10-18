/** Solo 1v1 vs Orson: a pure rule-based driver for player B. The host's browser evaluates this against room
 *  state and posts B's intents. Zero AI calls, zero extra API spend: Orson plays by the same intents a human would. */
import { BY_ID, DRAFT_SIZE, TROPE_NAMES, type Intent, type State } from './game';

const rnd = Math.random;
const ri = (n: number) => Math.floor(rnd() * n);

/** Which of a bracket match's two films Orson backs: his own seed when he owns one, else the higher rated. */
function duelChoice(s: State, a: number | null, b: number | null): number | null {
  const b8 = s.b8; if (!b8 || a === null || b === null) return a ?? b;
  const pa = (b8.conf as Record<string, { p?: string }> | undefined)?.[String(b8.seed[a])]?.p;
  const pb = (b8.conf as Record<string, { p?: string }> | undefined)?.[String(b8.seed[b])]?.p;
  if (pa === 'B' && pb !== 'B') return a;
  if (pb === 'B' && pa !== 'B') return b;
  return (BY_ID[a]?.r || 0) >= (BY_ID[b]?.r || 0) ? a : b;
}

const PITCHES = [
  (t: string) => `${t}. I do not need sixty seconds. The bracket already made my argument, and the bracket is never wrong. Well. Rarely.`,
  (t: string) => `You want a pitch? Fine. ${t} survived everything you threw at it tonight. That is not luck. That is taste.`,
  (t: string) => `${t}. I chose it, I fought for it, I will stand on the table for it. Your move, judge.`,
];

/** The single next intent Orson (pid B) wants to send, or null when he is waiting on you or the clock. */
export function nextBotIntent(s: State): Intent | null {
  if (!s.solo || !s.players.B.joined) return null;

  // VIBE: sliders first, then the trope swiper, then the taste map confirmation.
  if (s.phase === 'vibe') {
    const v = s.vibe;
    if (!v.sl.B) return { t: 'sliders', pid: 'B', v: [35 + ri(40), 30 + ri(45), 40 + ri(35)], actors: '' } as unknown as Intent;
    if (!v.passed) {
      const name = TROPE_NAMES.find((n) => v.sw.B[n] === undefined);
      if (name) return { t: 'vswipe', pid: 'B', name, yes: v.sw.A[name] === true ? true : rnd() < 0.5 } as unknown as Intent;
      return null; // swiped out, waiting for the lock to pad
    }
    // taste map is derived from the locked tropes; Orson confirms his side immediately
    return { t: 'taste', pid: 'B', tags: v.tastes.B || [], nos: [], actor: '' } as unknown as Intent;
  }

  // DRAFT: grenade vote first, then swipe to six picks. He rates hard (7.25+) but softens as the queue runs dry, and always backs his own tagged suggestions.
  if (s.phase === 'draft') {
    const d = s.draft;
    if (d.gren.id !== null) {
      if (d.gren.votes.B === undefined) return { t: 'grenvote', pid: 'B', yes: (BY_ID[d.gren.id]?.r || 0) >= 7.6 } as unknown as Intent;
      return null;
    }
    if (d.loading || d.picks.B.length >= DRAFT_SIZE) return null;
    const cur = d.inbox.B[0] ?? d.q.B[0];
    if (cur === undefined) return null;
    const m = BY_ID[cur]; if (!m) return { t: 'swipe', pid: 'B', id: cur, yes: false, why: [] } as unknown as Intent;
    const own = d.orson.includes(cur);
    const soft = d.q.B.length <= 4 && m.r >= 6.4;
    const yes = own || m.r >= 7.25 || soft;
    return { t: 'swipe', pid: 'B', id: cur, yes, why: [] } as unknown as Intent;
  }

  // WAR ROOM: spread hype on his best three, shield the crown jewel, veto your best, pick a wild card, lock in.
  if (s.phase === 'hitlist') {
    const h = s.hit; if (!h || h.res) return null;
    const w = h.weap.B; if (w.done) return null;
    const mine = h.grid.filter((id) => h.owner[id] === 'B' || h.owner[id] === 'AB').sort((a, b) => (BY_ID[b]?.r || 0) - (BY_ID[a]?.r || 0));
    const yours = h.grid.filter((id) => h.owner[id] === 'A' || h.owner[id] === 'AB').sort((a, b) => (BY_ID[b]?.r || 0) - (BY_ID[a]?.r || 0));
    const spent = Object.keys(h.tok.B).length;
    const split = [0.4, 0.35, 0.25];
    if (spent < Math.min(3, mine.length) && h.budget.B > 0) {
      const id = mine[spent];
      return { t: 'hit', pid: 'B', tok: { id, amt: Math.max(1, Math.round(h.budget.B * split[spent])) } } as unknown as Intent;
    }
    if (w.shields.length === 0 && mine.length) return { t: 'hit', pid: 'B', shield: mine[0] } as unknown as Intent;
    if (w.veto === null && yours.length) return { t: 'hit', pid: 'B', veto: yours[0] } as unknown as Intent;
    const wpick = (h as { wpick?: Partial<Record<'A' | 'B', string>> }).wpick;
    if (!wpick?.B) return { t: 'wcpick', pid: 'B', k: 'mul' } as unknown as Intent;
    return { t: 'hit', pid: 'B', done: true } as unknown as Intent;
  }

  // BRACKET: ack every reveal beat, pick a champion, back his side of every duel, swing at trivia.
  if (s.phase === 'bracket') {
    const b = s.b8; if (!b) return null;
    if (b.show) {
      if (['explain', 'rank', 'champ', 'calls', 'round', 'seed'].includes(b.show.kind) && !b.ack?.B) return { t: 'ack', pid: 'B' } as unknown as Intent;
      return null;
    }
    const m = b.matches[b.cur]; if (!m) return null;
    if (m.trivia && !m.trivia.locked.B && m.status !== 'RESOLVED') return { t: 'ttap', pid: 'B', i: ri(m.trivia.opts.length) } as unknown as Intent;
    if (m.status === 'VOTING_ACTIVE' && !m.wg.B) {
      const id = duelChoice(s, m.a, m.b); if (id === null) return null;
      let tok = 0;
      if (m.round > 1) {
        const own = s.draft.picks.B.includes(id);
        tok = Math.min(b.purse.B, own ? Math.max(1, Math.ceil(b.purse.B / 2)) : 1);
      }
      return { t: 'w8', pid: 'B', id, tok } as unknown as Intent;
    }
    return null;
  }

  // FINAL: champion a side, then pitch (rule-based lines; the server engine handles judging and the verdict).
  if (s.phase === 'final') {
    const f = s.fin;
    if (f.verdict) return null;
    if (f.choice.B === undefined && f.a !== undefined && f.b !== undefined) {
      const id = duelChoice(s, f.a, f.b);
      if (id !== null) return { t: 'fchoice', pid: 'B', id } as unknown as Intent;
      return null;
    }
    if (!f.submitted.B && f.choice.B !== undefined) {
      const t = BY_ID[f.choice.B as number]?.t || 'My film';
      return { t: 'pitch', pid: 'B', text: PITCHES[ri(PITCHES.length)](t), submit: true } as unknown as Intent;
    }
    return null;
  }

  // DONE: decline the reroll so the night stands.
  if (s.phase === 'done' && s.reroll && s.reroll.stage === 'ask' && s.reroll.votes?.B === undefined) {
    return { t: 'rr', pid: 'B', yes: false } as unknown as Intent;
  }
  return null;
}
