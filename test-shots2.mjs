// Focused Star Match shots for the private-scores + backing-bid changes: phone flip, TV counts (1080p + 4K), phone bid UI, TV bid.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const BASE = process.env.BASE || 'http://localhost:3000';
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => x.toString(16).padStart(2, '0')).join('');
const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
const t0 = hex(32), t1 = hex(32), inv = hex(32);
const tok = [t0, t1];
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/"/g, '');
const SK = env.SUPABASE_SERVICE_ROLE_KEY;
const sha = (x) => createHash('sha256').update(x).digest('hex');
const seat = (tok2, name) => ({ hash: sha(tok2), name, tokens: 0, earned: 0, side: null, spent: 0, locked: false, double: false, wild: [] });
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

const browser = await chromium.launch();
const phone = async (seat) => {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await p.goto(BASE + '/duo#room=' + code);
  await p.evaluate(([c, tk, i]) => localStorage.setItem('movietime-duo:' + c, JSON.stringify({ token: tk, invite: i })), [code, tok[seat], inv]);
  await p.reload();
  return p;
};
const tvAt = async (w, h) => { const p = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage(); await p.goto(BASE + '/tv/duo/' + code); return p; };

// play quiet turns until at least 2 cards are banked, so the backing picker has content
async function oneTurn() {
  let s = await get(0);
  const ss = safeState(s);
  if (ss.needed) { await act(ss.leader, 'matchSafe', { card: -1 }); s = await get(0); }
  const m = s.match;
  const down = m.cards.map((_, i) => i).filter((i) => m.status[i] === -1 && i !== ss.active);
  if (down[0] === undefined) return get(0);
  const r = await act(m.turn, 'matchFlip', { card: down[0] });
  if (r.j.phase === 'mClaim') await act(1 - r.j.match.claim.by, 'matchClaimResp', { challenge: false });
  return get(0);
}
let s = await get(0);
for (let i = 0; i < 10 && live(s).concat([0]).length && s.match.status.filter((x) => x === 0 || x === 1).length < 3; i++) s = await oneTurn();
console.log('banked:', s.match.status.filter((x) => x === 0 || x === 1).length);

const pf = await phone(s.match.turn); await pf.waitForTimeout(1100); await pf.screenshot({ path: 'shots/m13-phone-flip.png' }); await pf.close();
const tv1 = await tvAt(1920, 1080); await tv1.waitForTimeout(1100); await tv1.screenshot({ path: 'shots/m14-tv-counts.png' }); await tv1.close();
const tv4k = await tvAt(3840, 2160); await tv4k.waitForTimeout(1100); await tv4k.screenshot({ path: 'shots/m15-tv4k-counts.png' }); await tv4k.close();
console.log('flip + tv shots done');

// drive to a challenge
let claim = null;
for (let i = 0; i < 40 && !claim; i++) {
  s = await get(0);
  if (s.phase !== 'mFlip') break;
  const ss = safeState(s);
  if (ss.needed) { await act(ss.leader, 'matchSafe', { card: -1 }); continue; }
  const m = s.match;
  const down = m.cards.map((_, i2) => i2).filter((i2) => m.status[i2] === -1 && i2 !== ss.active);
  if (down[0] === undefined) break;
  const r = await act(m.turn, 'matchFlip', { card: down[i % down.length] });
  if (r.j.phase === 'mClaim') { claim = r.j.match.claim; await act(1 - claim.by, 'matchClaimResp', { challenge: true }); }
}
if (claim) {
  const pb = await phone(claim.by); await pb.waitForTimeout(1200);
  try { await pb.locator('button', { hasText: /RT \d|TMDB \d/ }).first().click({ timeout: 2500 }); await pb.locator('button[aria-label="More"]').click({ timeout: 1500 }); await pb.waitForTimeout(500); } catch (e) { console.log('backing tap skipped'); }
  await pb.screenshot({ path: 'shots/m16-phone-bid.png' }); await pb.close();
  const tvb = await tvAt(1920, 1080); await tvb.waitForTimeout(1100); await tvb.screenshot({ path: 'shots/m17-tv-bid.png' }); await tvb.close();
  console.log('bid shots done');
} else console.log('no claim reached');
await browser.close();
await fetch(SB + '/rest/v1/find_rooms?code=eq.' + code, { method: 'DELETE', headers: { apikey: SK, authorization: 'Bearer ' + SK } }).then((x) => console.log('cleanup', x.status));
