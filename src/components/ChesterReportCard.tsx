'use client';

import { useMemo } from 'react';
import { phrasesFromPgn } from '@/lib/move-words';

export type GradedMove = {
  move: string;
  player: string;
  ply: number;
  grade: 'A' | 'B' | 'C' | 'F';
  centipawnLoss: number | null;
};

const GRADE_EMOJI: Record<string, string> = { A: '🔥', B: '🙂', C: '🤨', F: '💀' };
const GRADE_WORD: Record<string, string> = { A: 'SPOT ON', B: 'SOLID', C: 'SHAKY', F: 'BLUNDER' };

function overallVerdict(goodRatio: number): { emoji: string; word: string; line: string } {
  if (goodRatio >= 0.8) return { emoji: '🔥', word: 'COMMANDING', line: 'Chester is filing a formal complaint.' };
  if (goodRatio >= 0.6) return { emoji: '😎', word: 'STRONG GAME', line: 'A performance worth a small parade.' };
  if (goodRatio >= 0.4) return { emoji: '🙂', word: 'SCRAPPY', line: 'Real fight in this one. The habits are forming.' };
  return { emoji: '💪', word: 'TOUGH LESSON', line: 'Every strong player has a drawer full of these.' };
}

export default function ChesterReportCard({
  grades,
  review,
  isLoading,
  pgn,
  onClose,
}: {
  grades: GradedMove[];
  review: string;
  isLoading: boolean;
  pgn?: string;
  onClose: () => void;
}) {
  const mine = grades.filter((entry) => entry.player === 'You');
  const phrases = useMemo(() => phrasesFromPgn(pgn || ''), [pgn]);
  const goodCount = mine.filter((entry) => entry.grade === 'A' || entry.grade === 'B').length;
  const verdict = overallVerdict(mine.length ? goodCount / mine.length : 0);
  const best = mine.length ? mine.reduce((a, b) => ((a.centipawnLoss ?? 999) <= (b.centipawnLoss ?? 999) ? a : b)) : null;
  const worst = mine.length ? mine.reduce((a, b) => ((a.centipawnLoss ?? 0) >= (b.centipawnLoss ?? 0) ? a : b)) : null;
  const moveNo = (ply: number) => Math.ceil(ply / 2);
  return <div className="chester-report-modal" role="dialog" aria-modal="true" aria-labelledby="chester-report-title">
    <div className="chester-report-modal__backdrop" onClick={onClose} />
    <section className="chester-report-card">
      <header><span>CHESTER'S FINAL VERDICT</span><button type="button" onClick={onClose} aria-label="Close report">×</button></header>
      <h2 id="chester-report-title">{verdict.emoji} {verdict.word}</h2>
      <p className="chester-report-card__tagline">{verdict.line} {mine.length ? `${goodCount} of your ${mine.length} moves were genuinely good ones.` : ''}</p>
      {mine.length > 0 && <div className="chester-report-card__strip" aria-label="Your game at a glance">
        {mine.map((entry) => <span key={`${entry.ply}-${entry.move}`} title={`Move ${moveNo(entry.ply)}: ${GRADE_WORD[entry.grade]}`}>{GRADE_EMOJI[entry.grade]}</span>)}
      </div>}
      {best && <div className="chester-report-card__moment">
        <b>🔥 FINEST MOMENT</b>
        <p>Move {moveNo(best.ply)}{phrases.get(best.ply) ? `: ${phrases.get(best.ply)}` : ''} - keep that habit.</p>
      </div>}
      {worst && (worst.centipawnLoss ?? 0) >= 250 && <div className="chester-report-card__moment">
        <b>💀 TURNING POINT</b>
        <p>Move {moveNo(worst.ply)}{phrases.get(worst.ply) ? `: ${phrases.get(worst.ply)}` : ''} - the swing of the game.</p>
      </div>}
      <p className="chester-report-card__story">{isLoading ? 'Chester is writing his final review...' : review}</p>
    </section>
  </div>;
}
