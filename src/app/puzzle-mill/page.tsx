'use client';

// PUZZLE MILL - the position just before you slipped in a real game, served back as a puzzle.
// Chester's grading feeds it automatically; nothing to set up, nothing to pay for.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import TapBoard from '@/components/TapBoard';
import { awardPoints } from '@/lib/rating';
import { loadMill, markMill, millCorrect, millFromTo, millWhy, todaysQueue, type MillPuzzle } from '@/lib/puzzle-mill';

type Phase = 'ask' | 'miss' | 'solved' | 'shown';

export default function PuzzleMillPage() {
  const [ready, setReady] = useState(false);
  const [all, setAll] = useState<MillPuzzle[]>([]);
  const [queue, setQueue] = useState<MillPuzzle[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ask');
  const [tries, setTries] = useState(0);
  const [solvedToday, setSolvedToday] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const list = loadMill();
    setAll(list);
    setQueue(todaysQueue(list, 5));
    setReady(true);
  }, []);

  const puzzle = queue[index];
  const orientation = useMemo(() => (puzzle ? ((new Chess(puzzle.fen).turn() === 'w') ? 'w' : 'b') : 'w'), [puzzle]);
  const answer = puzzle ? millFromTo(puzzle.fen, puzzle.best) : null;

  const attempt = (from: string, to: string, promotion?: string) => {
    if (!puzzle || (phase !== 'ask' && phase !== 'miss')) return;
    if (millCorrect(puzzle, from, to, promotion)) {
      setAll(markMill(puzzle.id, true));
      setSolvedToday((n) => n + 1);
      awardPoints('mini', 'Puzzle Mill - fixed my own mistake', tries === 0 ? 15 : 8);
      setPhase('solved');
    } else {
      setAll(markMill(puzzle.id, false));
      const next = tries + 1;
      setTries(next);
      setPhase(next >= 3 ? 'shown' : 'miss');
    }
  };
  const next = () => {
    if (index + 1 >= queue.length) { setDone(true); return; }
    setIndex(index + 1); setTries(0); setPhase('ask');
  };
  const again = () => { const list = loadMill(); setAll(list); setQueue(todaysQueue(list, 5)); setIndex(0); setTries(0); setPhase('ask'); setSolvedToday(0); setDone(false); };

  const tone = puzzle?.grade === 'BLUNDER' ? 'BLUNDER' : 'MISTAKE';
  const total = all.length;
  const mastered = all.filter((p) => p.solved > 0).length;

  return <main className="minigame-page puzzle-mill">
    <header className="minigame-head">
      <span className="minigame-kicker">CHESTER&apos;S PUZZLE MILL · BUILT FROM YOUR OWN GAMES</span>
      <h1>PUZZLE <em>MILL</em></h1>
      <p>{total ? `${total} of your own slips banked · ${mastered} fixed. Find the move you missed.` : 'Every mistake Chester catches in your games lands here as a puzzle.'}</p>
    </header>

    {ready && !total && <section className="minigame-result minigame-ready">
      <p>The mill is empty - which means no mistakes graded yet. Play Chester and every real slip gets banked here, the exact position, ready to fix tomorrow.</p>
      <Link className="minigame-cta" href="/play-chester">PLAY CHESTER - FEED THE MILL ♞</Link>
      <div className="minigame-links"><Link href="/">← Back to Chesterville</Link></div>
    </section>}

    {ready && total > 0 && !done && puzzle && <>
      <div className="minigame-hud">
        <span className="minigame-score">PUZZLE {index + 1}/{queue.length}</span>
        <span className="minigame-best">{tone}</span>
        <span className="minigame-best">FIXED TODAY {solvedToday}</span>
      </div>
      <div className={`minigame-board ${phase === 'solved' ? 'minigame-board--hit' : ''} ${phase === 'miss' ? 'minigame-board--miss' : ''}`}>
        <TapBoard key={puzzle.id} fen={puzzle.fen} orientation={orientation} locked={phase === 'solved' || phase === 'shown'} lastMove={phase === 'solved' || phase === 'shown' ? answer : null} onMove={attempt} label="Puzzle Mill - find the move you missed" />
      </div>
      <p className="minigame-message" aria-live="polite">
        {phase === 'ask' && `You slipped here on ${puzzle.date}. Find the better move.`}
        {phase === 'miss' && `Not that one - ${3 - tries} ${3 - tries === 1 ? 'try' : 'tries'} left. Look at what is hanging, then what you can win.`}
        {phase === 'solved' && `✓ That is it. ${millWhy(puzzle)}`}
        {phase === 'shown' && `Here it is, highlighted. ${millWhy(puzzle)} It comes back tomorrow.`}
      </p>
      {(phase === 'solved' || phase === 'shown') && <button type="button" className="minigame-cta" onClick={next}>{index + 1 >= queue.length ? 'FINISH THE SHIFT' : 'NEXT PUZZLE →'}</button>}
    </>}

    {ready && done && <section className="minigame-result">
      <h2 className="minigame-final">{solvedToday} OF {queue.length} FIXED</h2>
      <p className="minigame-sub">{solvedToday === queue.length ? 'Clean sheet. Those slips will not catch you twice.' : 'The ones you missed stay in the queue and come back first.'}</p>
      <div className="minigame-result__actions">
        <button type="button" className="minigame-cta" onClick={again}>ANOTHER SHIFT</button>
        <Link className="minigame-cta minigame-cta--ghost" href="/play-chester">PLAY CHESTER</Link>
      </div>
      <div className="minigame-links"><Link href="/">← Back to Chesterville</Link></div>
    </section>}
  </main>;
}
