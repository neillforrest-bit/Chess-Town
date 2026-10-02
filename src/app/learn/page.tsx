'use client';

// MY LEARNING - your own games vs Chester, turned into a plain-language read of where you
// slip and what to do about it. Club-calibrated: only swings a club player should see.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import TapBoard from '@/components/TapBoard';
import { analyse, loadPlayerFile, sampleFile, type Flag, type GameRecord, type PlayerFile } from '@/lib/player-file';
import { loadMill, millWhy } from '@/lib/puzzle-mill';
import { phrasesFromPgn } from '@/lib/move-words';

const PHASE_LABEL = { opening: 'Opening', middlegame: 'Middle of the game', endgame: 'Endgame' } as const;
const DOT = ['learn-dot--ok', 'learn-dot--slip', 'learn-dot--mistake', 'learn-dot--blunder'];

function Moment({ game, flag }: { game: GameRecord; flag: Flag }) {
  const phrase = useMemo(() => phrasesFromPgn(game.pgn).get(flag.ply) || null, [game.pgn, flag.ply]);
  const better = useMemo(() => {
    const hit = flag.fenBefore ? loadMill().find((p) => p.fen === flag.fenBefore) : null;
    return hit ? millWhy(hit) : null;
  }, [flag.fenBefore]);
  const fen = flag.fenBefore;
  let orientation: 'w' | 'b' = 'w';
  try { if (fen) orientation = new Chess(fen).turn(); } catch { /* default */ }
  return <article className="learn-moment">
    {fen && <div className="learn-moment__board"><TapBoard fen={fen} orientation={orientation} locked label="Position just before your slip" /></div>}
    <div className="learn-moment__text">
      <b>{flag.tier === 'blunder' ? 'Big slip' : 'Mistake'} · move {Math.ceil(flag.ply / 2)} · {PHASE_LABEL[flag.phase]}</b>
      <p>You played {phrase ? `"${phrase}"` : `your ${flag.piece}`}. It cost about {(flag.loss / 100).toFixed(1)} pawns of value.</p>
      {better ? <p>Better: {better}</p> : <p className="learn-muted">Open Fix My Mistakes to practise this kind of position.</p>}
    </div>
  </article>;
}

export default function LearnPage() {
  const [ready, setReady] = useState(false);
  const [file, setFile] = useState<PlayerFile>({ v: 1, games: [] });
  const [sample, setSample] = useState(false);
  const [millCount, setMillCount] = useState(0);

  useEffect(() => {
    const real = loadPlayerFile();
    const demo = new URLSearchParams(window.location.search).get('demo') === '1';
    setFile(real.games.length ? real : demo ? sampleFile() : real);
    setSample(!real.games.length && demo);
    setMillCount(loadMill().length);
    setReady(true);
  }, []);

  const a = useMemo(() => analyse(file), [file]);
  const recent = file.games.slice(0, 6);
  const moments = file.games.slice(0, 3).flatMap((g) => g.flags.map((f) => ({ g, f }))).sort((x, y) => y.f.loss - x.f.loss).slice(0, 3);

  return <main className="learn-page">
    <header className="minigame-head">
      <span className="minigame-kicker">MY LEARNING · FROM YOUR OWN GAMES</span>
      <h1>WHERE I <em>SLIP</em></h1>
      {sample && <p className="learn-sample">SAMPLE GAME - play Chester and this becomes yours.</p>}
    </header>

    {ready && !a.games && <section className="learn-card">
      <h2>Nothing to read yet</h2>
      <p>Play a game against Chester. When it ends, he reads every move you made and shows you here where the game really turned, in plain words. Only the moves that truly matter get flagged.</p>
      <Link className="minigame-cta" href="/play-chester">PLAY A GAME</Link>
      <Link className="learn-link" href="/learn?demo=1">See a sample →</Link>
    </section>}

    {ready && a.games > 0 && <>
      <section className="learn-card learn-card--chester">
        <small>CHESTER&apos;S READ · {a.games} {a.games === 1 ? 'GAME' : 'GAMES'}</small>
        <h2>{a.headline}</h2>
        <p>{a.lesson}</p>
        {a.trend !== 'new' && <p className="learn-trend">{a.trend === 'better' ? 'Trend: you are slipping less than before. Keep going.' : a.trend === 'worse' ? 'Trend: more slips lately. Slow down, one breath per move.' : 'Trend: steady.'}</p>}
      </section>

      <section className="learn-card">
        <h3>Where your big slips happen</h3>
        {a.byPhase.map((p) => <div className="learn-bar" key={p.phase}>
          <span>{PHASE_LABEL[p.phase]}</span>
          <i><b style={{ width: `${Math.min(100, Math.round(p.rate * 400))}%` }} /></i>
          <em>{p.moves ? `${p.flags} ${p.flags === 1 ? 'slip' : 'slips'} in ${p.moves} moves` : 'no moves here yet'}</em>
        </div>)}
        {a.topPiece && <p className="learn-muted">Piece involved most: your {a.topPiece.piece} ({a.topPiece.n}).</p>}
      </section>

      <section className="learn-card">
        <h3>Your last {recent.length} {recent.length === 1 ? 'game' : 'games'}, move by move</h3>
        {recent.map((g) => <div className="learn-strip" key={g.id}>
          <span>{g.date.slice(5)} · {g.level === 'SAMPLE' ? 'sample' : g.level.toLowerCase()} · {g.result}</span>
          <div>{g.strip.map((s) => <i key={s.ply} className={`learn-dot ${DOT[s.t]}`} title={`move ${Math.ceil(s.ply / 2)}`} />)}</div>
        </div>)}
        <p className="learn-legend"><i className="learn-dot learn-dot--ok" />fine <i className="learn-dot learn-dot--slip" />small slip <i className="learn-dot learn-dot--mistake" />mistake <i className="learn-dot learn-dot--blunder" />big slip</p>
      </section>

      {moments.length > 0 && <section className="learn-card"><h3>Your biggest moments</h3>{moments.map(({ g, f }) => <Moment key={`${g.id}-${f.ply}`} game={g} flag={f} />)}</section>}

      <section className="learn-card">
        <h3>Turn it into practice</h3>
        <Link className="minigame-cta" href="/puzzle-mill">FIX MY MISTAKES{millCount ? ` (${millCount})` : ''}</Link>
        <Link className="minigame-cta minigame-cta--ghost" href="/play-chester">PLAY ANOTHER GAME</Link>
        <p className="learn-muted">Only swings a club player should spot are flagged. Small inaccuracies are counted, not nagged about.</p>
      </section>
    </>}
    <Link className="learn-link" href="/">← Back to Chesterville</Link>
  </main>;
}
