'use client';

import { useMemo } from 'react';
import { phrasesFromPgn } from '@/lib/move-words';
import { weakestHabit } from '@/lib/rating';
import VerdictShare from './VerdictShare';

export type GradedMove = {
  move: string;
  player: string;
  ply: number;
  grade: 'A' | 'B' | 'C' | 'F';
  centipawnLoss: number | null;
};

type Summary = {
  grade?: string;
  score?: number;
  accuracy?: number;
  development?: number;
  kingSafety?: number;
  tactics?: number;
};

const GRADE_EMOJI: Record<string, string> = { A: '🔥', B: '🙂', C: '🤨', F: '💀' };
const GRADE_WORD: Record<string, string> = { A: 'SPOT ON', B: 'SOLID', C: 'SHAKY', F: 'BLUNDER' };

const LADDER = [
  { value: 'BEGINNER', label: 'ROOKIE' },
  { value: 'INTERMEDIATE', label: 'CLUB' },
  { value: 'ADVANCED', label: 'MASTER' },
  { value: 'EXPERT', label: 'NIGHTMARE' },
];

function overallVerdict(goodRatio: number): { emoji: string; word: string; line: string } {
  if (goodRatio >= 0.8) return { emoji: '🔥', word: 'COMMANDING', line: 'Chester is filing a formal complaint.' };
  if (goodRatio >= 0.6) return { emoji: '😎', word: 'STRONG GAME', line: 'A performance worth a small parade.' };
  if (goodRatio >= 0.4) return { emoji: '🙂', word: 'SCRAPPY', line: 'Real fight in this one. The habits are forming.' };
  return { emoji: '💪', word: 'TOUGH LESSON', line: 'Every strong player has a drawer full of these.' };
}

function moveOfGameWhy(phrase: string | null, centipawnLoss: number | null): string {
  if (phrase && /takes|wins|captures/i.test(phrase)) return 'you won material and kept everything defended - that is how small leads become wins.';
  if (phrase && /check/i.test(phrase)) return "a forcing move: Chester's reply was chosen for him. Free turns like that are where plans become wins.";
  if ((centipawnLoss ?? 99) === 0) return "the engine's own first choice, played like it was obvious. That is board vision, not luck.";
  return 'the most accurate decision in your game - maximum value, nothing left hanging. That is the habit that separates club players from spectators.';
}

export default function ChesterReportCard({
  grades,
  review,
  isLoading,
  pgn,
  difficulty,
  summary,
  onClose,
}: {
  grades: GradedMove[];
  review: string;
  isLoading: boolean;
  pgn?: string;
  difficulty?: string;
  summary?: Summary;
  onClose: () => void;
}) {
  const mine = grades.filter((entry) => entry.player === 'You');
  const phrases = useMemo(() => phrasesFromPgn(pgn || ''), [pgn]);
  const goodCount = mine.filter((entry) => entry.grade === 'A' || entry.grade === 'B').length;
  const blunderCount = mine.filter((entry) => entry.grade === 'F').length;
  const goodRatio = mine.length ? goodCount / mine.length : 0;
  const verdict = overallVerdict(goodRatio);
  const best = mine.length ? mine.reduce((a, b) => ((a.centipawnLoss ?? 999) <= (b.centipawnLoss ?? 999) ? a : b)) : null;
  const worst = mine.length ? mine.reduce((a, b) => ((a.centipawnLoss ?? 0) >= (b.centipawnLoss ?? 0) ? a : b)) : null;
  const moveNo = (ply: number) => Math.ceil(ply / 2);

  const letter = summary?.grade || (goodRatio >= 0.8 ? 'A' : goodRatio >= 0.65 ? 'B' : goodRatio >= 0.5 ? 'C' : goodRatio >= 0.35 ? 'D' : 'F');
  const score = summary?.score ?? Math.round(goodRatio * 100);

  const won = /1-0\s*$/.test(pgn || '');
  const levelIndex = Math.max(0, LADDER.findIndex((level) => level.value === difficulty));
  const levelLabel = LADDER[levelIndex]?.label || 'ROOKIE';
  const nextLabel = LADDER[levelIndex + 1]?.label || null;
  const habit = weakestHabit(summary, blunderCount);
  const readyUp = won && Boolean(nextLabel);
  const cleanWin = won && goodRatio >= 0.65 && blunderCount <= 1;
  const atTop = !nextLabel;
  const readiness = atTop
    ? { word: won ? 'GRAND CHESTER' : 'TOP OF THE LADDER', detail: won ? 'You beat NIGHTMARE - the crown is yours. Only Joseph left to dethrone.' : 'NIGHTMARE still has your number. Keep swinging.' }
    : readyUp
      ? cleanWin
        ? { word: `${nextLabel} UNLOCKED`, detail: `You beat ${levelLabel} with ${goodCount} of ${mine.length} moves rated good. Take the promotion - the next level punishes what this one forgives.` }
        : { word: `${nextLabel} UNLOCKED`, detail: `A win is a win - but fair warning: ${habit.reason}. At ${nextLabel} that becomes a rout. Fix it before you climb.` }
      : { word: `HOLD AT ${levelLabel}`, detail: `Not yet - ${habit.reason}. Beat ${levelLabel} and the next door opens.` };

  return <div className="chester-report-modal" role="dialog" aria-modal="true" aria-labelledby="chester-report-title">
    <div className="chester-report-modal__backdrop" onClick={onClose} />
    <section className="chester-report-card">
      <header><span>CHESTER'S FINAL VERDICT</span><button type="button" onClick={onClose} aria-label="Close report">×</button></header>
      <h2 id="chester-report-title">{verdict.emoji} {verdict.word}</h2>
      <p className="chester-report-card__tagline">{verdict.line} {mine.length ? `${goodCount} of your ${mine.length} moves were genuinely good ones.` : ''}</p>

      <div className="chester-report-card__graderow">
        <div className="chester-report-card__letter"><span>EFFORT GRADE</span><b>{letter}</b><small>{score}/100</small></div>
        <div className="chester-report-card__ladder">
          <span className="chester-report-card__ladder-title">SKILL LADDER</span>
          <div className="chester-report-card__ladder-track">
            {LADDER.map((level, index) => <i key={level.value} className={`chester-report-card__rung ${index < levelIndex ? 'is-passed' : ''} ${index === levelIndex ? 'is-current' : ''}`}><em>{level.label}</em>{index === levelIndex && <u>YOU</u>}</i>)}
          </div>
          <div className={`chester-report-card__readiness ${readyUp ? 'is-ready' : ''}`}>
            <b>{readyUp || atTop ? '🪜' : '🛑'} {readiness.word}</b>
            <p>{readiness.detail}</p>
          </div>
        </div>
      </div>

      {mine.length > 0 && <div className="chester-report-card__strip" aria-label="Your game at a glance">
        {mine.map((entry) => <span key={`${entry.ply}-${entry.move}`} title={`Move ${moveNo(entry.ply)}: ${GRADE_WORD[entry.grade]}`}>{GRADE_EMOJI[entry.grade]}</span>)}
      </div>}

      {best && <div className="chester-report-card__moment">
        <b>🏆 MOVE OF THE GAME</b>
        <p>Move {moveNo(best.ply)}{phrases.get(best.ply) ? `: ${phrases.get(best.ply)}` : ''} - {moveOfGameWhy(phrases.get(best.ply) || null, best.centipawnLoss)}</p>
      </div>}
      {worst && (worst.centipawnLoss ?? 0) >= 250 && <div className="chester-report-card__moment">
        <b>💀 WHAT COST YOU</b>
        <p>Move {moveNo(worst.ply)}{phrases.get(worst.ply) ? `: ${phrases.get(worst.ply)}` : ''} - the swing of the game. {habit.reason.charAt(0).toUpperCase() + habit.reason.slice(1)}.</p>
      </div>}
      <div className="chester-report-card__focus">
        <b>🎯 NEXT GAME, FOCUS ON THIS</b>
        <p>{habit.focus}</p>
      </div>

      <p className="chester-report-card__story">{isLoading ? 'Chester is writing his final review...' : review}</p>
      <VerdictShare grades={grades} pgn={pgn} difficulty={difficulty} opponentLabel={`${levelLabel} CHESTER`} summary={{ grade: letter, score, accuracy: summary?.accuracy, openingName: null }} />
    </section>
  </div>;
}
