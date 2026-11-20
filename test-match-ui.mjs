// Star Match UI shots: drive a seeded room through play states, screenshot phone + TV (1080p + 4K).
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
const live = (s) => { const t = [0, 0]; s.match.cards.forEach((c, i) => { const st = s.match.status[i]; if ((st === 0 || st === 1) && c.id) { const m = s.extras.find((x) => x.id === c.id); const sc = m ? (m.rt ?? m.tmdb) : null; if (sc != null) t[st] += sc; } }); return t; };
const safeState = (s) => { const m = s.match; const t = live(s); const round = Math.floor(m.turnsTaken / 2) + 1; const leader = t[0] === t[1] ? -1 : t[0] > t[1] ? 0 : 1; return { needed: m.safeRound < round && leader >= 0 && m.status.filter((x) => x === -1).length >= 2, leader, round, active: m.safeIdx != null && m.safeRound === round ? m.safeIdx : null }; };

await act(0, 'start');
await act(0, 'chooseMode', { mode: 'match' });
await act(0, 'matchActor', { personId: 31, personName: 'Tom Hanks' });
await act(1, 'matchActor', { personId: 3291, personName: 'Hugh Grant' });
await act(0, 'matchDeal');
console.log('dealt');

// resolve one turn (flip + let go or skip on miss); returns phase
async function oneTurn() {
  let s = await get(0);
  const ss = safeState(s);
  if (ss.needed) { await act(ss.leader, 'matchSafe', { card: -1 }); s = await get(0); }
  const m = s.match;
  const down = m.cards.map((_, i) => i).filter((i) => m.status[i] === -1 && i !== ss.active);
  const r = await act(m.turn, 'matchFlip', { card: down[0] });
  if (r.j.phase === 'mClaim') await act(1 - r.j.match.claim.by, 'matchClaimResp', { challenge: false });
  return get(0);
}

// three quiet turns, then leader locks a real safe card for the shot
await oneTurn(); await oneTurn(); await oneTurn();
let s = await get(0);
let ss = safeState(s);
if (ss.needed) {
  const down = s.match.cards.map((_, i) => i).filter((i) => s.match.status[i] === -1);
  await act(ss.leader, 'matchSafe', { card: down[0] });
  console.log('safe locked by seat', ss.leader);
}
s = await get(0);
console.log('phase for grid shots:', s.phase, 'turn', s.match.turn);

const browser = await chromium.launch();
const phone = async (seat) => {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await p.goto(BASE + '/duo#room=' + code);
  await p.evaluate(([c, tk, i]) => localStorage.setItem('movietime-duo:' + c, JSON.stringify({ token: tk, invite: i })), [code, tok[seat], inv]);
  await p.reload();
  return p;
};
const tvAt = async (w, h) => { const p = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage(); await p.goto(BASE + '/tv/duo/' + code); return p; };

const turnSeat = s.match.turn;
const p1 = await phone(turnSeat);
await p1.waitForTimeout(3500);
await p1.screenshot({ path: 'shots/m01-phone-flip.png' });
const tv1 = await tvAt(1920, 1080); await tv1.waitForTimeout(3500); await tv1.screenshot({ path: 'shots/m02-tv-flip.png' });
const tv4k = await tvAt(3840, 2160); await tv4k.waitForTimeout(3500); await tv4k.screenshot({ path: 'shots/m03-tv4k-flip.png' });
console.log('grid shots done');

// force a claim + challenge -> mBid shot
s = await get(0);
{
  const m = s.match;
  const down = m.cards.map((_, i) => i).filter((i) => m.status[i] === -1 && i !== safeState(s).active);
  let r = await act(m.turn, 'matchFlip', { card: down[0] });
  while (r.j.phase === 'mFlip' && !r.j.match.totals) { const s2 = r.j; const ss2 = safeState(s2); if (ss2.needed) { await act(ss2.leader, 'matchSafe', { card: -1 }); } const m2 = (await get(0)).match; const d2 = m2.cards.map((_, i) => i).filter((i) => m2.status[i] === -1 && i !== ss2.active); r = await act(m2.turn, 'matchFlip', { card: d2[0] }); }
  if (r.j.phase === 'mClaim') {
    await act(1 - r.j.match.claim.by, 'matchClaimResp', { challenge: true });
    const pb = await phone(r.j.match.claim.by); await pb.waitForTimeout(3500);
    try { await pb.locator('button', { hasText: /RT \d|TMDB \d/ }).first().click({ timeout: 2500 }); await pb.waitForTimeout(600); } catch { /* no banked cards to back with yet */ }
    await pb.screenshot({ path: 'shots/m04-phone-bid.png' }); await pb.close();
    const tvb = await tvAt(1920, 1080); await tvb.waitForTimeout(3500); await tvb.screenshot({ path: 'shots/m05-tv-bid.png' }); await tvb.close();
    const cl = r.j.match.claim;
    await act(cl.by, 'matchBid', { chips: 4, backing: [] });
    await act(1 - cl.by, 'matchBid', { chips: 2, backing: [] });
    console.log('bid resolved');
  }
}
// finish the grid
for (let i = 0; i < 60; i++) { const st = await oneTurn(); if (st.phase === 'mPitch') break; }
s = await get(0);
console.log('phase', s.phase, 'totals', JSON.stringify(s.match.totals));
const pp = await phone(s.match.turn); await pp.waitForTimeout(3500); await pp.screenshot({ path: 'shots/m06-phone-pitch.png' });
await act(0, 'matchPitch', { text: 'It is the greatest film ever made and I will hear no arguments.' });
await act(1, 'matchPitch', { text: 'Pick mine or I tell everyone you cried at Paddington.' });
s = await get(0);
const pr = await phone(0); await pr.waitForTimeout(3500); await pr.screenshot({ path: 'shots/m07-phone-reveal.png' });
const tvr = await tvAt(1920, 1080); await tvr.waitForTimeout(3500); await tvr.screenshot({ path: 'shots/m08-tv-reveal.png' }); await tvr.close();
const w = s.match.winnerSeat;
const ownBest = s.match.cards.find((c, i) => s.match.status[i] === w);
await act(w, 'matchPickFilm', { id: ownBest.id });
await act(0, 'matchConfirmWatch'); await act(1, 'matchConfirmWatch');
s = await get(0);
console.log('done, film', s.winner);
await pr.reload(); await pr.waitForTimeout(4000);
await pr.evaluate(() => { const m = document.querySelector('main'); m.scrollTop = 0; });
await pr.screenshot({ path: 'shots/m09-phone-done.png' });
const tvd = await tvAt(1920, 1080); await tvd.waitForTimeout(3500); await tvd.screenshot({ path: 'shots/m10-tv-done.png' });
console.log('phone done text ok:', await pr.evaluate(() => /WHERE TO WATCH|No GB streaming|FINAL TOTALS/.test(document.body.innerText)));
await browser.close();
await fetch(SB + '/rest/v1/find_rooms?code=eq.' + code, { method: 'DELETE', headers: { apikey: SK, authorization: 'Bearer ' + SK } }).then((x) => console.log('cleanup', x.status));
