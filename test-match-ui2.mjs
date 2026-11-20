// Star Match UI shots part 2: fresh room -> fast playthrough -> pitch/reveal/done shots -> cleanup test rooms.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const BASE = 'http://localhost:3000';
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => x.toString(16).padStart(2, '0')).join('');
const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
const t0 = hex(32), t1 = hex(32), inv = hex(32);
const tok = [t0, t1];
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/"/g, '');
const SK = env.SUPABASE_SERVICE_ROLE_KEY;
const sha = (x) => createHash('sha256').update(x).digest('hex');
const seat = (t, name) => ({ hash: sha(t), name, tokens: 0, earned: 0, side: null, spent: 0, locked: false, double: false, wild: [] });
const seed = { flow: 'movie-duo-v1', v: 0, round: 0, expires: Date.now() + 86400000, inviteHash: sha(inv), receipts: [], seats: [seat(t0, 'Neillo'), seat(t1, 'Jemma')], mode: null, phase: 'lobby', genres: ['Action'], picks: [[], []], genreLocked: [], mood: '', shelf: [], extras: [], ops: [{}, {}], swipeDone: [], sync: 0, overlaps: [], loners: [[], []], wilds: [], finalists: [], revealAck: [], queue: [], pair: [], stage: 0, advanced: [], history: [], tie: [], tieSpun: false, winner: null, confirmed: [], pairs: null, match: null, openJoin: true, line: 'Test.' };
await fetch(SB + '/rest/v1/find_rooms?code=eq.' + code, { method: 'DELETE', headers: { apikey: SK, authorization: 'Bearer ' + SK } });
console.log('seed', (await fetch(SB + '/rest/v1/find_rooms', { method: 'POST', headers: { apikey: SK, authorization: 'Bearer ' + SK, 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify({ code, state: seed }) })).status, code);

async function get(s) { const r = await fetch(BASE + '/api/duo/' + code, { headers: { 'x-wheel-seat': tok[s] }, cache: 'no-store' }); return r.json(); }
async function act(s, type, extra = {}) { const j = await get(s); const r = await fetch(BASE + '/api/duo/' + code, { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-wheel-seat': tok[s] }, body: JSON.stringify({ type, round: j.round, actionId: hex(16), ...extra }) }); return { status: r.status, j: await r.json() }; }
import catalog from './src/data/catalog.json' with { type: 'json' };
const CAT = new Map(catalog.movies.map((m) => [m.id, m]));
const live = (s) => { const t = [0, 0]; s.match.cards.forEach((c, i) => { const st = s.match.status[i]; if ((st === 0 || st === 1) && c.id) { const m = CAT.get(c.id) || s.extras.find((x) => x.id === c.id); const sc = m ? (m.rt ?? m.tmdb) : null; if (sc != null) t[st] += sc; } }); return t; };
const safeState = (s) => { const m = s.match; const t = live(s); const round = Math.floor(m.turnsTaken / 2) + 1; const leader = t[0] === t[1] ? -1 : t[0] > t[1] ? 0 : 1; return { needed: m.safeRound < round && leader >= 0 && m.status.filter((x) => x === -1).length >= 2, leader, round, active: m.safeIdx != null && m.safeRound === round ? m.safeIdx : null }; };

await act(0, 'start');
await act(0, 'chooseMode', { mode: 'match' });
await act(0, 'matchActor', { personId: 31, personName: 'Tom Hanks' });
await act(1, 'matchActor', { personId: 3291, personName: 'Hugh Grant' });
await act(0, 'matchDeal');
for (let i = 0; i < 60; i++) {
  let s = await get(0);
  if (s.phase === 'mPitch') break;
  const ss = safeState(s);
  if (ss.needed) { await act(ss.leader, 'matchSafe', { card: -1 }); continue; }
  const m = s.match;
  const down = m.cards.map((_, k) => k).filter((k) => m.status[k] === -1 && k !== ss.active);
  const r = await act(m.turn, 'matchFlip', { card: down[0] });
  if (r.j.phase === 'mClaim') await act(1 - r.j.match.claim.by, 'matchClaimResp', { challenge: false });
}
let s = await get(0);
console.log('phase', s.phase, 'totals', JSON.stringify(s.match.totals));

const browser = await chromium.launch();
const phone = async (st) => {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await p.goto(BASE + '/duo#room=' + code);
  await p.evaluate(([c, tk, i]) => localStorage.setItem('movietime-duo:' + c, JSON.stringify({ token: tk, invite: i })), [code, tok[st], inv]);
  await p.reload(); await p.waitForTimeout(2800);
  return p;
};
const tv = async () => { const p = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); await p.goto(BASE + '/tv/duo/' + code); await p.waitForTimeout(2800); return p; };

const pp = await phone(0);
await pp.screenshot({ path: 'shots/m06-phone-pitch.png' });
await act(0, 'matchPitch', { text: 'It is the greatest film ever made and I will hear no arguments.' });
await act(1, 'matchPitch', { text: 'Pick mine or I tell everyone you cried at Paddington.' });
s = await get(0);
console.log('reveal, winner seat', s.match.winnerSeat);
await pp.reload(); await pp.waitForTimeout(2800);
await pp.evaluate(() => { const m = document.querySelector('main'); m.scrollTop = 0; });
await pp.screenshot({ path: 'shots/m07-phone-reveal.png' });
const t1p = await tv(); await t1p.screenshot({ path: 'shots/m08-tv-reveal.png' }); await t1p.close();
const w = s.match.winnerSeat;
const ownBest = s.match.cards.find((c, i) => s.match.status[i] === w);
await act(w, 'matchPickFilm', { id: ownBest.id });
await act(0, 'matchConfirmWatch'); await act(1, 'matchConfirmWatch');
s = await get(0);
console.log('done, film', s.winner);
await pp.reload(); await pp.waitForTimeout(3500);
await pp.evaluate(() => { const m = document.querySelector('main'); m.scrollTop = 0; });
await pp.screenshot({ path: 'shots/m09-phone-done.png' });
const t2p = await tv(); await t2p.screenshot({ path: 'shots/m10-tv-done.png' }); await t2p.close();
console.log('phone done shows watch box:', await pp.evaluate(() => /WHERE TO WATCH|No GB streaming|FINAL TOTALS/.test(document.body.innerText)));
await browser.close();
// cleanup all test rooms (line marker Test.) but never real rooms
const q = await fetch(SB + '/rest/v1/find_rooms?select=code,state', { headers: { apikey: SK, authorization: 'Bearer ' + SK } });
const rows = await q.json();
for (const row of rows) {
  if (row.state?.flow === 'movie-duo-v1' && /^Test/.test(row.state?.line || '')) {
    await fetch(SB + '/rest/v1/find_rooms?code=eq.' + row.code, { method: 'DELETE', headers: { apikey: SK, authorization: 'Bearer ' + SK } });
    console.log('deleted test room', row.code);
  }
}
console.log('done');
