// Star Match E2E: create -> cast -> deal -> flips/safe/challenge/bids -> pitches -> reveal -> pick (from either collection) -> confirm -> done.
const BASE = process.env.BASE || 'http://localhost:3000';
const TEST_IP = '203.0.113.' + (1 + Math.floor(Math.random() * 250));
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => x.toString(16).padStart(2, '0')).join('');
const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
const t0 = hex(32), t1 = hex(32), inv = hex(32);
const tok = [t0, t1];
const names = ['Neillo', 'Jemma'];
let fails = 0;
const ok = (cond, label) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + label); if (!cond) fails++; };

async function get(seat, spectate = false) {
  const r = await fetch(BASE + '/api/duo/' + code + (spectate ? '?spectate=1' : ''), { headers: spectate ? {} : { 'x-wheel-seat': tok[seat] }, cache: 'no-store' });
  return { status: r.status, j: await r.json() };
}
async function act(seat, type, extra = {}) {
  const { j } = await get(seat);
  const r = await fetch(BASE + '/api/duo/' + code, { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-wheel-seat': tok[seat], 'x-forwarded-for': TEST_IP }, body: JSON.stringify({ type, round: j.round, actionId: hex(16), ...extra }) });
  return { status: r.status, j: await r.json() };
}
import catalog from './src/data/catalog.json' with { type: 'json' };
const CAT = new Map(catalog.movies.map((m) => [m.id, m]));
const filmOf = (s, id) => CAT.get(id) || (s.extras || []).find((x) => x.id === id);
const critics = (s, id) => { const m = filmOf(s, id); return m ? (m.rt ?? m.tmdb ?? null) : null; };
const liveTotals = (s) => { const t = [0, 0]; s.match.cards.forEach((c, i) => { const st = s.match.status[i]; if ((st === 0 || st === 1) && c.id) { const sc = critics(s, c.id); if (sc != null) t[st] += sc; } }); return t; };
const safeNeeded = (s) => { const m = s.match; const t = liveTotals(s); const round = Math.floor(m.turnsTaken / 2) + 1; const leader = t[0] === t[1] ? -1 : t[0] > t[1] ? 0 : 1; return { needed: m.safeRound < round && leader >= 0 && m.status.filter((x) => x === -1).length >= 2, leader, round }; };

// --- setup: seed the room directly (duo-create is rate-limited per IP/day) ---
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/"/g, '');
const SK = env.SUPABASE_SERVICE_ROLE_KEY;
const sha = (x) => createHash('sha256').update(x).digest('hex');
const seat = (tok, name) => ({ hash: sha(tok), name, tokens: 0, earned: 0, side: null, spent: 0, locked: false, double: false, wild: [] });
const seed = { flow: 'movie-duo-v1', v: 0, round: 0, expires: Date.now() + 86400000, inviteHash: sha(inv), receipts: [], seats: [seat(t0, names[0]), seat(t1, names[1])], mode: null, phase: 'lobby', genres: ['Action', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance', 'Sci-fi', 'Fantasy', 'Animation', 'Crime', 'Mystery', 'War', 'Documentary'], picks: [[], []], genreLocked: [], mood: '', shelf: [], extras: [], ops: [{}, {}], swipeDone: [], sync: 0, overlaps: [], loners: [[], []], wilds: [], finalists: [], revealAck: [], queue: [], pair: [], stage: 0, advanced: [], history: [], tie: [], tieSpun: false, winner: null, confirmed: [], pairs: null, match: null, openJoin: true, line: 'Test room.' };
await fetch(SB + '/rest/v1/find_rooms?code=eq.' + code, { method: 'DELETE', headers: { apikey: SK, authorization: 'Bearer ' + SK } });
const ins = await fetch(SB + '/rest/v1/find_rooms', { method: 'POST', headers: { apikey: SK, authorization: 'Bearer ' + SK, 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify({ code, state: seed }) });
ok(ins.status === 201, 'seed room ' + code);
let r = await act(0, 'start');
ok(r.j.phase === 'mode', 'host starts -> mode');
r = await act(1, 'chooseMode', { mode: 'match' });
ok(r.status === 409, 'non-host cannot choose mode');
r = await act(0, 'chooseMode', { mode: 'match' });
ok(r.j.phase === 'mCast' && r.j.match && r.j.match.chips.join(',') === '20,20', 'chooseMode match -> mCast, 20 chips each');

// --- cast: resolve real TMDB ids via the search endpoint ---
const actors = [];
for (const q of ['Tom Hanks', 'Hugh Grant']) {
  const s = await fetch(BASE + '/api/duo/' + code, { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-wheel-seat': tok[0] }, body: JSON.stringify({ type: 'pairFindActors', q, round: 0, actionId: hex(16) }) });
  const sd = await s.json();
  actors.push(sd.results[0]);
  console.log('search', q, '->', JSON.stringify(sd.results[0]));
}
r = await act(0, 'matchActor', { personId: actors[0].id, personName: actors[0].name });
ok(r.status === 200 && r.j.match.actors[0]?.id === actors[0].id, 'seat 0 picks ' + actors[0].name);
r = await act(1, 'matchActor', { personId: actors[1].id, personName: actors[1].name });
ok(r.status === 200 && r.j.match.actors[1]?.id === actors[1].id, 'seat 1 picks ' + actors[1].name);
r = await act(1, 'matchDeal');
ok(r.status === 409, 'non-host cannot deal');
r = await act(0, 'matchDeal');
ok(r.status === 200 && r.j.phase === 'mFlip' && r.j.match.cards.length === 12, 'deal -> mFlip, 12 cards');

// pool rules: all films 60+, no sci-fi/animation; 6 per actor
const deal = (await get(0, true)).j;
const dealt = deal.match.cards.map((c) => c.id ? { ...c, m: filmOf(deal, c.id) } : null).filter(Boolean);
ok(dealt.length === 0, 'spectator grid is fully masked at deal (0 revealed ids), got ' + dealt.length);
// unmask via seat view? seats also masked. Use the count of status entries.
ok(deal.match.status.length === 12 && deal.match.status.every((x) => x === -1), 'all 12 face-down');

// --- play loop ---
let safeTested = false, challengeTested = false, bidTested = false, missTested = false;
const seenFilms = new Map(); // id -> movie (from extras once revealed)
for (let step = 0; step < 80; step++) {
  const { j: s } = await get(0);
  const m = s.match;
  if (s.phase === 'mPitch') break;
  if (s.phase === 'mFlip') {
    const sn = safeNeeded(s);
    if (sn.needed) {
      const down = m.cards.map((c, i) => i).filter((i) => m.status[i] === -1);
      if (!safeTested) {
        // leader locks the first face-down card; opponent then tries to flip it and must fail
        const lockCard = down[0];
        r = await act(sn.leader, 'matchSafe', { card: lockCard });
        ok(r.status === 200, 'leader locks safe card ' + lockCard);
        if (m.turn !== sn.leader) {
          r = await act(m.turn, 'matchFlip', { card: lockCard });
          ok(r.status === 409, 'opponent cannot flip the locked card');
        }
        safeTested = true;
        continue;
      }
      r = await act(sn.leader, 'matchSafe', { card: -1 });
      ok(r.status === 200, 'leader skips safe lock');
      continue;
    }
    const round = Math.floor(m.turnsTaken / 2) + 1;
    const safeActive = m.safeIdx != null && m.safeRound === round ? m.safeIdx : null;
    const mine = m.cards.map((c, i) => i).filter((i) => m.status[i] === -1 && i !== safeActive);
    // flip the first legal card
    const card = mine[0] !== undefined ? mine[0] : m.cards.findIndex((_, i) => m.status[i] === -1);
    r = await act(m.turn, 'matchFlip', { card });
    if (r.status !== 200) { ok(false, 'flip accepted (got ' + r.status + ' ' + (r.j.error || '') + ')'); break; }
    if (r.j.phase === 'mClaim') {
      const cl = r.j.match.claim;
      if (!challengeTested) {
        r = await act(1 - cl.by, 'matchClaimResp', { challenge: true });
        ok(r.status === 200 && r.j.phase === 'mBid', 'challenge opens bids');
        // summed-score bids: each side backs with its own banked films + chips
        const sm = r.j.match;
        const backOf = (seat) => sm.cards.map((_, i) => i).filter((i) => sm.status[i] === seat);
        const theirs = backOf(1 - cl.by);
        if (theirs.length) {
          const bad = await act(cl.by, 'matchBid', { chips: 1, backing: theirs.slice(0, 1) });
          ok(bad.status === 400, 'cannot back a bid with the other player\'s films');
        }
        const overChips = await act(cl.by, 'matchBid', { chips: 21, backing: [] });
        ok(overChips.status === 400, 'bid over chips rejected');
        const sumOf = (idxs) => idxs.reduce((a, i) => a + (critics(r.j, sm.cards[i].id) || 0), 0);
        const cBack = backOf(cl.by), cPow = sumOf(cBack) + 1;
        const cb = await act(cl.by, 'matchBid', { chips: 1, backing: cBack });
        ok(cb.status === 200, 'claimer bids: ' + cBack.length + ' films + 1 chip = ' + cPow);
        const xBack = backOf(1 - cl.by), xPow = sumOf(xBack);
        r = await act(1 - cl.by, 'matchBid', { chips: 0, backing: xBack });
        ok(r.status === 200 && (r.j.phase === 'mFlip' || r.j.phase === 'mPitch'), 'both bids in -> resolved: ' + r.j.match.lastEvent);
        const claimerKept = r.j.match.lastEvent.includes(names[cl.by] + ' keeps it');
        ok(claimerKept === (cPow >= xPow), 'outcome follows summed scores + chips (' + cPow + ' vs ' + xPow + ')');
        ok(r.j.match.chips[cl.by] === 19, 'claimer chip spent, backing films kept');
        bidTested = true; challengeTested = true;
      } else {
        r = await act(1 - cl.by, 'matchClaimResp', { challenge: false });
        ok(r.status === 200, 'claim let go');
      }
    } else if (r.j.match.faceUpMiss) missTested = true;
  } else { ok(false, 'unexpected phase ' + s.phase); break; }
}
let s = (await get(0)).j;
ok(s.phase === 'mPitch', 'grid resolved -> mPitch (turnsTaken ' + s.match.turnsTaken + ')');
ok(s.match.totals && s.match.totals.length === 2, 'totals computed: ' + JSON.stringify(s.match.totals));
console.log('safeTested', safeTested, 'challengeTested', challengeTested, 'bidTested', bidTested, 'missTested', missTested);

// pool rules on everything that was revealed
for (const c of s.match.cards) { const m = filmOf(s, c.id); if (m) seenFilms.set(m.id, m); }
let poolOk = true, gemNote = [];
for (const m of seenFilms.values()) {
  const sc = m.rt ?? m.tmdb;
  if (sc == null || sc < 60) { poolOk = false; console.log('POOL FAIL low score', m.t, sc); }
  if (m.g.some((g) => /sci-?fi|science fiction|animation/i.test(g))) { poolOk = false; console.log('POOL FAIL genre', m.t, m.g); }
  gemNote.push(m.t + ' (' + sc + ')');
}
ok(poolOk && seenFilms.size === 12, 'pool rules: 12 films, all 60+, no sci-fi/animation');
console.log('films:', gemNote.join(' | '));
const perActor = [0, 0];
for (const c of s.match.cards) perActor[c.actor]++;
ok(perActor[0] === 6 && perActor[1] === 6, '6 films per actor: ' + perActor.join('/'));

// --- pitches ---
r = await act(0, 'matchPitch', { text: 'Because mine is the greatest film ever made and hers is rubbish.' });
ok(r.status === 200 && r.j.phase === 'mPitch', 'pitch 1 in, still waiting');
ok(r.j.match.pitches[1] === null && r.j.match.pitches[0] !== null, 'pitch secret until both in (seat 0 sees own)');
const other = (await get(1)).j;
ok(other.match.pitches[0] === null, 'seat 1 cannot see seat 0 pitch yet');
r = await act(1, 'matchPitch', { text: 'This one made me cry three times, pick it or else.' });
ok(r.j.phase === 'mReveal' && r.j.match.winnerSeat != null, 'both pitches -> mReveal, winner ' + r.j.match.winnerSeat);

// --- pick from either collection ---
const fin = r.j;
const w = fin.match.winnerSeat;
const loserPick = fin.match.cards.find((c, i) => fin.match.status[i] === 1 - w);
r = await act(1 - w, 'matchPickFilm', { id: loserPick.id });
ok(r.status === 403, 'loser cannot pick');
r = await act(w, 'matchPickFilm', { id: loserPick.id });
ok(r.status === 200 && r.j.phase === 'mConfirm', 'winner picks from the OTHER collection (pitch sway): id ' + loserPick.id);
r = await act(0, 'matchConfirmWatch');
r = await act(1, 'matchConfirmWatch');
ok(r.status === 200 && r.j.phase === 'done' && r.j.winner === loserPick.id, 'both confirm -> done, film ' + r.j.winner);

// tv view renders done for match
r = await get(0, true);
ok(r.status === 200 && r.j.mode === 'match' && r.j.phase === 'done', 'spectate done state');

console.log(fails === 0 ? 'ALL PASS' : fails + ' FAILURES');
fs.writeFileSync('/tmp/match-code.txt', code + ' ' + t0 + ' ' + t1 + ' ' + inv);
