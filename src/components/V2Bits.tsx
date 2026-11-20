'use client';
import { useEffect, useRef, useState } from 'react';
import { BY_ID, type Intent, type PID, type State } from '@/lib/game';
import { CONS_GENRES, PIVOT_OPTS, PIVOT_N, consLabel, type Cons } from '@/lib/cons';
import { R, wcOf, WK_NAME, WK_ALL, type WK } from '@/lib/b8';
import { useTokens } from '@/lib/tokenStore';
import { buzz } from './shared';

/** 2.1 + 2.2 strict calibration: runtime and era toggles plus must-have / never-show genre chips. Tap a genre once for MUST (+), twice for NEVER (-), three times to clear. */
export function ConsPicker({ value, onChange }: { value: Cons; onChange: (c: Cons) => void }) {
  const [open, setOpen] = useState(false);
  const st = (g: string) => (value.ig.includes(g) ? '+' : value.xg.includes(g) ? '-' : '');
  const cycle = (g: string) => { buzz(6); const s = st(g); const ig = value.ig.filter((x) => x !== g), xg = value.xg.filter((x) => x !== g); onChange({ ...value, ig: s === '' ? [...ig, g] : ig, xg: s === '+' ? [...xg, g] : xg }); };
  const lab = consLabel(value);
  return <div className="cs-cons">
    <button className={'cs-cons-h' + (lab.length ? ' has' : '')} onClick={() => setOpen(!open)}>HOUSE RULES · STRICT {lab.length ? <b>{lab.length} ON</b> : <i>optional</i>}<span>{open ? '▴' : '▾'}</span></button>
    {!open && lab.length > 0 && <div className="cs-cons-sum">{lab.map((x) => <u key={x}>{x}</u>)}</div>}
    {open && <div className="cs-pivot" onClick={() => setOpen(false)}><div className="cs-pivot-in cs-cons-b" onClick={(e) => e.stopPropagation()}><div className="cs-orson">HOUSE RULES · STRICT</div>
      <div className="cs-cons-r"><em>RUNTIME</em><button className={value.rt === 'u2' ? 'is-on' : ''} onClick={() => { buzz(6); onChange({ ...value, rt: value.rt === 'u2' ? 'any' : 'u2' }); }}>UNDER 2 HOURS</button></div>
      <div className="cs-cons-r"><em>ERA</em>{([['any', 'ANY'], ['pre2000', 'PRE-2000'], ['new', 'NEW (2023+)']] as const).map(([k, l]) => <button key={k} className={value.era === k ? 'is-on' : ''} onClick={() => { buzz(6); onChange({ ...value, era: k }); }}>{l}</button>)}</div>
      <div className="cs-cons-g"><em>GENRES · tap: MUST, again: NEVER</em><div>{CONS_GENRES.map((g) => <button key={g} className={st(g) === '+' ? 'is-must' : st(g) === '-' ? 'is-never' : ''} onClick={() => cycle(g)}>{st(g)}{g === 'Science Fiction' ? 'Sci-Fi' : g}</button>)}</div></div>
    <button className="cs-cons-done" onClick={() => setOpen(false)}>DONE</button>
    </div></div>}
  </div>;
}

/** 3.2 The 10-pass anti-fatigue intervention. */
export function PivotModal({ s, pid, send }: { s: State; pid: PID; send: (i: Intent) => void }) {
  const [fb, setFb] = useState<string[]>([]);
  if (!s.dx?.modal[pid]) return null;
  return <div className="cs-pivot" role="dialog" aria-label="Anti-fatigue check"><div className="cs-pivot-in">
    <div className="cs-orson">{PIVOT_N} PASSES IN A ROW</div>
    <p className="cs-say">We&apos;re missing the mark. What do you want more/less of?</p>
    <div className="cs-pivot-l">{PIVOT_OPTS.map((o) => <button key={o} className={fb.includes(o) ? 'is-on' : ''} onClick={() => { buzz(6); setFb(fb.includes(o) ? fb.filter((x) => x !== o) : [...fb, o]); }}><i>{fb.includes(o) ? '☑' : '☐'}</i>{o}</button>)}</div>
    <button className="cs-btn cs-btn--gold" onClick={() => { buzz([20, 30, 40]); send({ t: 'pivot', pid, fb }); setFb([]); }}>FETCH A FRESH BATCH</button>
  </div></div>;
}

/** consecutive-pass meter + the strict rules in force, shown under the draft counter */
export function PassPips({ s, pid }: { s: State; pid: PID }) {
  const n = s.dx?.passes[pid].length || 0; const lab = (['A', 'B'] as const).flatMap((q) => consLabel(s.consP?.[q]).map((x) => x + ' · ' + s.players[q].name.slice(0, 6))).filter((x, i, a) => a.indexOf(x) === i); const sup = (s.dx?.sup[pid] || []).filter((x) => x.until > s.draft.learn[pid].n);
  if (n < 3 && !lab.length && !sup.length) return null;
  return <div className="cs-pips">
    {n >= 3 && <span className={'cs-pips-r' + (n >= 7 ? ' hot' : '')}>{Array.from({ length: PIVOT_N }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}<b>{n} PASSES IN A ROW</b></span>}
    {lab.length > 0 && <span className="cs-pips-c">{lab.slice(0, 4).map((x) => <u key={x}>{x}</u>)}</span>}
    {sup.length > 0 && <span className="cs-pips-s">BENCHED: {sup.map((x) => { const [g, d] = x.k.split('|'); return (d === '*' ? '' : Number(d) >= 2000 ? d + 's ' : String(d).slice(2) + 's ') + (g === '*' ? 'decade' : g); }).join(', ')}</span>}
  </div>;
}

/** Permanent Graveyard: every veto is saved on this device and fed into every future room. */
export function useGraveSync(s: State | null, code: string, send: (i: Intent) => void) {
  const sent = useRef('');
  useEffect(() => {
    if (!s) return; let loc: number[] = []; try { loc = JSON.parse(localStorage.getItem('cs-graveyard') || '[]'); } catch { loc = []; }
    const room = s.grave || []; const merged = Array.from(new Set([...loc, ...room]));
    if (merged.length !== loc.length) { try { localStorage.setItem('cs-graveyard', JSON.stringify(merged)); } catch { /* ignore */ } }
    const missing = loc.filter((x) => !room.includes(x));
    if (missing.length && sent.current !== code + ':' + missing.length) { sent.current = code + ':' + missing.length; send({ t: 'grave', ids: missing }); }
  }, [s?.grave?.length, s?.phase, code]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** 4.3 Economy bar: both 100-token banks in one persistent bar. Each colour drains toward its own corner as that player spends. */
export function EconomyBar({ s, me, code }: { s: State; me: PID; code: string }) {
  const stored = useTokens(code); const b = s.b8; const p = b ? b.purse : stored ? { A: stored.A, B: stored.B } : null; if (!p) return null;
  const pct = (n: number) => Math.max(0, Math.min(100, (n / R.PURSE) * 100)); const low = (n: number) => n <= 20;
  return <div className="cs-eco" aria-label="Token economy">
    <div className="cs-eco-bar"><div className="cs-eco-h"><i className={'cs-eco-a' + (low(p.A) ? ' low' : '')} style={{ width: pct(p.A) + '%' }} /></div><u /><div className="cs-eco-h cs-eco-hb"><i className={'cs-eco-b' + (low(p.B) ? ' low' : '')} style={{ width: pct(p.B) + '%' }} /></div></div>
    <div className="cs-eco-l"><span className={me === 'A' ? 'me' : ''}>{me === 'A' ? 'YOU' : (s.players.A.name.split(' ')[0] || s.players.A.name).slice(0, 12).toUpperCase()} ◈{p.A}</span><small>BANK · NO REFILLS</small><span className={me === 'B' ? 'me' : ''}>◈{p.B} {me === 'B' ? 'YOU' : (s.players.B.name.split(' ')[0] || s.players.B.name).slice(0, 12).toUpperCase()}</span></div>
  </div>;
}

const WK_ICON: Record<WK, string> = { spy: '🔭', mul: '✖️', thief: '🦝' };
const WK_HELP: Record<WK, string> = { spy: 'See their bank, stake and wild card', mul: 'Your tokens count double this round', thief: 'Steal 10 unspent tokens' };
/** 4.2 pick-1 wild card (Spyglass / Multiplier / Thief): choose once, hold it all tournament, fire it in a token round. */
export function WildRow({ s, pid, send }: { s: State; pid: PID; send: (i: Intent) => void }) {
  const b = s.b8; const [arm, setArm] = useState<WK | ''>(''); if (!b) return null;
  const m = b.matches[b.cur]; const w = wcOf(b, pid); const o: PID = pid === 'A' ? 'B' : 'A'; const ow = wcOf(b, o);
  const live = m.round > 1 && m.status === 'VOTING_ACTIVE' && m.winner === null && !m.trivia && !m.wg[pid];
  if (!w.pick) return <div className="cs-wild"><div className="cs-wild-h">PICK 1 WILD CARD · YOU HOLD IT ALL TOURNAMENT</div><div className="cs-wild-r">{WK_ALL.map((k) => <button key={k} onClick={() => { buzz(14); send({ t: 'wcpick', pid, k }); }}><i>{WK_ICON[k]}</i><b>{WK_NAME[k].replace('THE ', '')}</b><small>{WK_HELP[k]}</small></button>)}</div></div>;
  const spying = m.spy?.includes(pid); const l = m.wg[o] || m.live?.[o];
  const fire = () => { if (arm !== w.pick) { setArm(w.pick as WK); setTimeout(() => setArm(''), 3500); return; } setArm(''); buzz([30, 30, 50]); send({ t: 'wcuse', pid, k: w.pick as WK }); };
  return <div className="cs-wild cs-wild--held">
    <button className={'cs-wild-b' + (arm ? ' is-armed' : '') + (w.used ? ' is-spent' : '')} disabled={w.used || !live || (w.pick === 'mul' && !!m.mul)} onClick={fire}><i>{WK_ICON[w.pick]}</i><b>{w.used ? WK_NAME[w.pick] + ' · USED' : arm ? 'TAP AGAIN TO FIRE' : WK_NAME[w.pick]}</b><small>{w.used ? 'spent' : live ? WK_HELP[w.pick] : m.round < 2 ? 'live from round 2' : 'wait for your round'}</small></button>
    {m.mul && <span className="cs-wild-x">✖️ {m.mul === pid ? 'YOUR' : (s.players[m.mul].name.split(' ')[0] || s.players[m.mul].name).toUpperCase().slice(0, 12) + "'S"} TOKENS COUNT x{R.WC_MUL}</span>}
    {spying && <span className="cs-wild-spy">🔭 {(s.players[o].name.split(' ')[0] || s.players[o].name).toUpperCase().slice(0, 12)}: ◈{b.purse[o]} bank · {l ? `${l.tok} on ${BY_ID[l.id].t.slice(0, 16)}` : 'no bid yet'} · holds {ow.pick ? (ow.used ? WK_NAME[ow.pick] + ' (spent)' : WK_NAME[ow.pick]) : 'nothing yet'}</span>}
  </div>;
}
