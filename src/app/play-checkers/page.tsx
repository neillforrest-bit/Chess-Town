'use client';
// BUILD 166: checkers vs Chester / vs a friend (pass-and-play). Raw skeleton, flagged untested until verified live.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initial, legalMoves, apply, other, count, chooseMove, gradeMove, moveText, boardKey, sqName, type Board, type CMove, type Side, type Grade } from '@/lib/checkers';

type Mode = 'chester' | 'friend';
type Level = 'BEGINNER' | 'CASUAL' | 'CLUB' | 'SHARP';
const TAUNTS: Record<string, string[]> = {
  crown: ['A king! Fancy hat. Still can be trapped.', 'Crowned. Do not let it go to your head.', 'Royalty arrives. I will make it pay rent.'],
  capture: ['Mandatory means mandatory, my friend.', 'Hop. Hop. Gone.', 'Delicious. Forced captures are my love language.'],
  good: ['Clean. I felt that.', 'Annoyingly accurate.', 'Okay, that was neat.'],
  bad: ['Oh dear. I will take that gift.', 'That left a gap you could drive a bus through.', 'Bold. Wrong, but bold.'],
  start: ['Red moves first. Try not to hang anything in move two.', 'Eight by eight, no mercy, forced captures. Go.'],
};
const pick = (k: string, seed: number) => TAUNTS[k][seed % TAUNTS[k].length];
const GRADE_ICON: Record<Grade, string> = { BRILLIANT: '💎', STRONG: '🎯', SOLID: '👍', SHAKY: '😬', BLUNDER: '🚨' };

export default function PlayCheckers() {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>('chester');
  const [level, setLevel] = useState<Level>('CASUAL');
  const [bd, setBd] = useState<Board>(initial());
  const [ids, setIds] = useState<number[]>(() => initial().map((p, i) => (p === '.' ? -1 : i)));
  const [turn, setTurn] = useState<Side>('r');
  const [sel, setSel] = useState<number | null>(null);
  const [ghostOn, setGhostOn] = useState(true);
  const [ghost, setGhost] = useState<CMove | null>(null);
  const [busy, setBusy] = useState(false);
  const [dying, setDying] = useState<{ sq: number; id: number; p: string }[]>([]);
  const [last, setLast] = useState<number[]>([]);
  const [hud, setHud] = useState<{ grade: Grade | 'IDLE'; title: string; l1: string; l2: string }>({ grade: 'IDLE', title: 'YOUR MOVE', l1: 'Red moves first. Captures are forced.', l2: '' });
  const [tug, setTug] = useState(50);
  const [over, setOver] = useState<string | null>(null);
  const [hint, setHint] = useState<CMove | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [plies, setPlies] = useState(0);
  const quiet = useRef(0);
  const seen = useRef<Record<string, number>>({});
  const seed = useRef(0);
  const bdRef = useRef(bd); bdRef.current = bd;

  const legal = useMemo(() => (over ? [] : legalMoves(bd, turn)), [bd, turn, over]);
  const forced = legal.length > 0 && legal[0].caps.length > 0;
  const targetsOf = useMemo(() => (sel === null ? [] : legal.filter((m) => m.from === sel)), [legal, sel]);
  const mine = (s: Side) => mode === 'friend' || s === 'r';
  const c = count(bd, 'r'), d = count(bd, 'b');

  const updateTug = (b: Board) => { const e = count(b, 'r'), f = count(b, 'b'); const v = (e.men + e.kings * 1.6) - (f.men + f.kings * 1.6); setTug(Math.max(6, Math.min(94, 50 + v * 7))); };

  const play = useCallback(async (m: CMove, side: Side, before: Board) => {
    setBusy(true); setSel(null); setGhost(null); setHint(null);
    let cur = before.slice(); let curIds = ids.slice(); const piece = cur[m.from];
    for (let k = 1; k < m.path.length; k++) {
      const from = m.path[k - 1], to = m.path[k]; const cap = m.caps[k - 1];
      const id = curIds[from]; curIds[from] = -1; curIds[to] = id; cur[to] = cur[from]; cur[from] = '.';
      if (cap !== undefined && m.caps.length) { setDying((x) => [...x, { sq: cap, id: curIds[cap], p: cur[cap] }]); curIds[cap] = -1; cur[cap] = '.'; }
      setBd(cur.slice()); setIds(curIds.slice()); setLast([m.path[0], to]);
      await new Promise((r) => setTimeout(r, 280));
    }
    if (m.crown) cur[m.to] = piece === 'r' ? 'R' : 'B';
    setBd(cur); setDying([]); updateTug(cur);
    const nxt = other(side); setTurn(nxt); setPlies((p) => p + 1);
    quiet.current = m.caps.length || piece === 'r' || piece === 'b' ? 0 : quiet.current + 1;
    const key = boardKey(cur, nxt); seen.current[key] = (seen.current[key] || 0) + 1;
    setLog((l) => [...l.slice(-30), `${side === 'r' ? 'Red' : 'Black'} ${moveText(m)}`]);
    const moves = legalMoves(cur, nxt);
    if (!moves.length) { setOver(`${side === 'r' ? 'Red' : 'Black'} wins - ${other(side) === 'r' ? 'Red' : 'Black'} has no moves`); }
    else if (quiet.current >= 80) setOver('Draw - 40 moves each with no capture or man move');
    else if (seen.current[key] >= 3) setOver('Draw - same position three times');
    setBusy(false); return cur;
  }, [ids]);

  const commit = useCallback(async (m: CMove) => {
    const before = bdRef.current; const side = turn;
    let g: ReturnType<typeof gradeMove> | null = null;
    if (mine(side)) { g = gradeMove(before, side, m); seed.current++; }
    const after = await play(m, side, before);
    if (g) {
      const bestTxt = g.best ? moveText(g.best) : '';
      const kind = m.crown ? 'crown' : g.grade === 'SHAKY' || g.grade === 'BLUNDER' ? 'bad' : m.caps.length ? 'capture' : 'good';
      setHud({ grade: g.grade, title: g.grade === 'BLUNDER' ? 'COSTLY MISTAKE' : g.grade === 'BRILLIANT' ? 'BRILLIANT SHOT' : g.grade === 'SHAKY' ? 'SMALL SLIP' : 'CLEAN MOVE',
        l1: `${GRADE_ICON[g.grade]} You played ${moveText(m)}${m.caps.length > 1 ? ` (${m.caps.length}-piece jump!)` : m.caps.length ? ' (capture)' : ''}${m.crown ? ' and crowned a king' : ''}.`,
        l2: g.grade === 'SHAKY' || g.grade === 'BLUNDER' ? `🤖 Engine preferred ${bestTxt}. It loses about ${g.loss.toFixed(1)} of a man. ${pick(kind, seed.current)}` : `🤖 ${pick(kind, seed.current)}` });
    }
    return after;
  }, [turn, play, mode]);

  // Chester's turn
  useEffect(() => {
    if (!started || mode !== 'chester' || turn !== 'b' || over || busy) return;
    const t = setTimeout(async () => {
      const m = chooseMove(bdRef.current, 'b', level); if (!m) return;
      const after = await play(m, 'b', bdRef.current); void after;
      if (m.crown || m.caps.length) setHud((h) => ({ ...h, l2: `😈 ${m.crown ? pick('crown', seed.current++) : pick('capture', seed.current++)}` }));
    }, 650);
    return () => clearTimeout(t);
  }, [started, mode, turn, over, busy, level, play]);

  const tap = (i: number) => {
    if (busy || over || !mine(turn)) return;
    const mv = targetsOf.find((m) => m.to === i);
    if (mv) { if (ghostOn && !(ghost && ghost.to === i && ghost.from === mv.from)) { setGhost(mv); return; } void commit(mv); return; }
    const p = bd[i]; const own = (turn === 'r' && (p === 'r' || p === 'R')) || (turn === 'b' && (p === 'b' || p === 'B'));
    if (own && legal.some((m) => m.from === i)) { setSel(i); setGhost(null); }
    else if (own && forced) setHud({ grade: 'SHAKY', title: 'CAPTURE IS FORCED', l1: '⚠️ You must jump when a jump is available.', l2: '🤖 Pieces that can capture are highlighted.' });
    else { setSel(null); setGhost(null); }
  };

  const reset = () => { const b = initial(); setBd(b); setIds(b.map((p, i) => (p === '.' ? -1 : i))); setTurn('r'); setSel(null); setGhost(null); setOver(null); setHint(null); setLast([]); setLog([]); setPlies(0); quiet.current = 0; seen.current = {}; setTug(50); setHud({ grade: 'IDLE', title: 'YOUR MOVE', l1: pick('start', seed.current++), l2: '' }); };
  const askHint = () => { if (busy || over || !mine(turn)) return; const m = chooseMove(bd, turn, 'SHARP'); if (m) { setHint(m); setSel(m.from); setHud({ grade: 'STRONG', title: 'HINT', l1: `💡 Try the piece on ${sqName(m.from)}.`, l2: m.caps.length ? '🤖 A capture is forced here anyway.' : '🤖 Tap the glowing piece to see where it can go.' }); } };

  useEffect(() => { document.title = 'Checkers vs Chester'; }, []);

  if (!started) return (
    <main className="ck-root ck-start">
      <style>{CSS}</style>
      <h1>🏁 CHECKERS</h1><p className="ck-sub">8x8 American rules. Forced captures, multi-jumps, kings.</p>
      <div className="ck-row"><button className={mode === 'chester' ? 'on' : ''} onClick={() => setMode('chester')}>🤖 vs Chester</button><button className={mode === 'friend' ? 'on' : ''} onClick={() => setMode('friend')}>🧑‍🤝‍🧑 vs a friend</button></div>
      {mode === 'chester' && <div className="ck-row">{(['BEGINNER', 'CASUAL', 'CLUB', 'SHARP'] as Level[]).map((l) => <button key={l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>{l}</button>)}</div>}
      <button className="ck-go" onClick={() => { setStarted(true); reset(); }}>START</button>
      <p className="ck-tiny">Friend mode is pass-and-play on one device. Raw build, being verified.</p>
    </main>);

  const arrowSq = hint ? hint.to : null;
  return (
    <main className="ck-root">
      <style>{CSS}</style>
      <header className="ck-head"><span>🏁 CHECKERS</span><span>🔴 {c.men + c.kings} v ⚫ {d.men + d.kings}</span><button onClick={() => setGhostOn((v) => !v)} aria-pressed={ghostOn}>👻 {ghostOn ? 'On' : 'Off'}</button></header>
      <div className="ck-tug" title="material tug of war"><i style={{ width: `${tug}%` }} /></div>
      <div className="ck-board" style={{ ['--n' as string]: 8 }}>
        {Array.from({ length: 64 }, (_, i) => { const r = i >> 3, cc = i & 7; const dark = (r + cc) % 2 === 1; const isT = targetsOf.some((m) => m.to === i); const canSel = legal.some((m) => m.from === i) && mine(turn) && forced;
          return <div key={i} className={`ck-sq ${dark ? 'dk' : 'lt'} ${last.includes(i) ? 'last' : ''} ${isT ? 'tgt' : ''} ${sel === i ? 'sel' : ''} ${canSel ? 'must' : ''} ${arrowSq === i ? 'hintsq' : ''}`} style={{ gridRow: r + 1, gridColumn: cc + 1 }} onClick={() => tap(i)} />; })}
        {bd.map((p, i) => p === '.' ? null : <div key={ids[i]} className={`ck-pc ${p === 'r' || p === 'R' ? 'red' : 'blk'} ${p === 'R' || p === 'B' ? 'king' : ''}`} style={{ ['--x' as string]: i & 7, ['--y' as string]: i >> 3 }} onClick={() => tap(i)}>{p === 'R' || p === 'B' ? '♛' : ''}</div>)}
        {dying.map((x) => <div key={'d' + x.id} className={`ck-pc dead ${x.p === 'r' || x.p === 'R' ? 'red' : 'blk'}`} style={{ ['--x' as string]: x.sq & 7, ['--y' as string]: x.sq >> 3 }} />)}
        {ghost && <div className={`ck-pc ghost ${turn === 'r' ? 'red' : 'blk'}`} style={{ ['--x' as string]: ghost.to & 7, ['--y' as string]: ghost.to >> 3 }} onClick={() => void commit(ghost)}>{ghost.crown ? '♛' : ''}</div>}
      </div>
      <section className={`ck-hud ck-hud--${hud.grade.toLowerCase()}`}>
        <div className="ck-hud-t">{hud.title}{mode === 'chester' && turn === 'b' && !over ? ' - Chester is thinking…' : ''}</div>
        <p>{hud.l1}</p>{hud.l2 && <p>{hud.l2}</p>}
        {ghost && <p className="ck-ghosttip">👻 Ghost preview: tap the ghost (or the square) again to confirm.</p>}
        <div className="ck-pills"><button onClick={askHint}>💡 Hint</button><button onClick={reset}>🔄 Rematch</button><button onClick={() => setStarted(false)}>🏠 Menu</button>{forced && mine(turn) && !over && <span className="ck-forced">⚠️ Jump is forced</span>}</div>
      </section>
      {over && <div className="ck-over"><div><h2>{over}</h2><p>{plies} plies played.</p><button onClick={reset}>Rematch</button> <button onClick={() => setStarted(false)}>Menu</button></div></div>}
    </main>
  );
}

const CSS = `
.ck-root{height:100dvh;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 8px max(8px,env(safe-area-inset-bottom));background:#0b1220;color:#e7eefc;font-family:system-ui,sans-serif;overflow:hidden;box-sizing:border-box}
.ck-start{justify-content:center;text-align:center}.ck-start h1{font-size:34px;margin:0}.ck-sub{opacity:.8;margin:0 0 8px}.ck-tiny{opacity:.6;font-size:12px}
.ck-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.ck-root button{background:#16233d;color:#e7eefc;border:1px solid #2c4170;border-radius:12px;padding:10px 14px;font-weight:700;font-size:14px}
.ck-root button.on{background:#0e7490;border-color:#22d3ee}.ck-go{background:#10b981!important;border-color:#34d399!important;font-size:18px!important;padding:12px 38px!important;margin-top:10px}
.ck-head{display:flex;justify-content:space-between;align-items:center;width:min(94vw,49dvh,640px);min-height:40px;font-weight:800;gap:8px}.ck-head button{padding:6px 10px}
.ck-tug{width:min(94vw,49dvh,640px);height:8px;border-radius:6px;background:#1f2937;overflow:hidden}.ck-tug i{display:block;height:100%;background:linear-gradient(90deg,#ef4444,#f59e0b);transition:width .4s}
.ck-board{position:relative;width:min(94vw,49dvh,640px);aspect-ratio:1;display:grid;grid-template:repeat(8,1fr)/repeat(8,1fr);border:3px solid #3b2a1a;border-radius:8px;overflow:hidden;flex:none;touch-action:manipulation}
.ck-sq.dk{background:#6b4423}.ck-sq.lt{background:#e8d3a8}.ck-sq.last{box-shadow:inset 0 0 0 100px rgba(250,204,21,.25)}.ck-sq.tgt{box-shadow:inset 0 0 0 100px rgba(34,211,238,.38)}.ck-sq.sel{box-shadow:inset 0 0 0 100px rgba(16,185,129,.45)}.ck-sq.must{box-shadow:inset 0 0 0 100px rgba(245,158,11,.35)}.ck-sq.hintsq{animation:ckp 1s infinite}
@keyframes ckp{50%{box-shadow:inset 0 0 0 100px rgba(34,211,238,.6)}}
.ck-pc{position:absolute;left:calc(var(--x)*12.5%);top:calc(var(--y)*12.5%);width:12.5%;height:12.5%;display:flex;align-items:center;justify-content:center;transition:left .26s ease,top .26s ease;pointer-events:auto;font-size:min(5vw,2.6dvh);color:#fde68a}
.ck-pc::before{content:'';position:absolute;inset:11%;border-radius:50%;box-shadow:0 3px 6px rgba(0,0,0,.5),inset 0 -3px 0 rgba(0,0,0,.3);z-index:0}
.ck-pc.red::before{background:radial-gradient(circle at 35% 30%,#fca5a5,#dc2626 60%,#7f1d1d)}.ck-pc.blk::before{background:radial-gradient(circle at 35% 30%,#6b7280,#1f2937 60%,#030712)}
.ck-pc.king::before{outline:3px solid #fbbf24;animation:ckk 1.6s infinite}.ck-pc.king{z-index:2}.ck-pc>*{z-index:1}
@keyframes ckk{50%{box-shadow:0 0 14px #fbbf24}}
.ck-pc.dead{animation:ckd .3s forwards;pointer-events:none}@keyframes ckd{to{transform:scale(1.6);opacity:0}}
.ck-pc.ghost{opacity:.5;pointer-events:auto;animation:ckg 1s infinite;z-index:3}@keyframes ckg{50%{opacity:.8;transform:scale(1.06)}}
.ck-hud{width:min(94vw,640px);flex:1;min-height:110px;overflow:auto;border-radius:14px;padding:10px 12px;background:#111c33;border:2px solid #334155;box-sizing:border-box}
.ck-hud p{margin:4px 0;font-size:14px;line-height:1.35}.ck-hud-t{font-weight:900;letter-spacing:.04em;font-size:13px}
.ck-hud--brilliant,.ck-hud--strong{border-color:#10b981;background:#062b22}.ck-hud--solid{border-color:#22d3ee}.ck-hud--shaky{border-color:#f59e0b;background:#2b1e05}.ck-hud--blunder{border-color:#ef4444;background:#2b0a0a;animation:cks .4s}
@keyframes cks{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.ck-pills{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px}.ck-pills button{padding:6px 10px;font-size:12px}.ck-forced{color:#fbbf24;font-size:12px;font-weight:700}.ck-ghosttip{opacity:.8}
.ck-over{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:50;text-align:center}.ck-over>div{background:#111c33;border:2px solid #22d3ee;border-radius:16px;padding:22px}
@media (orientation:landscape) and (min-width:700px){.ck-root{flex-direction:row;flex-wrap:wrap;justify-content:center;align-content:center}.ck-board,.ck-head,.ck-tug{width:min(90dvh,60vw)}.ck-hud{width:min(34vw,380px);flex:none;max-height:90dvh}}
`;
