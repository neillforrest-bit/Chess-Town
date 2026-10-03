'use client';

import { useEffect, useMemo, useRef } from 'react';
import { phrasesFromPgn } from '@/lib/move-words';
import { weakestHabit, getVerdictMemory, recordVerdictMemory, getLadder } from '@/lib/rating';
import VerdictShare from './VerdictShare';

export type GradedMove = {
  move: string;
  player: string;
  ply: number;
  grade: 'A' | 'B' | 'C' | 'F';
  centipawnLoss: number | null;
};

type Habits = { castled?: boolean; developed?: boolean; blunders?: number };

type Summary = {
  grade?: string;
  score?: number;
  accuracy?: number;
  development?: number;
  kingSafety?: number;
  tactics?: number;
  habits?: Habits;
};

const LADDER = [
  { value: 'BEGINNER', label: 'ROOKIE' },
  { value: 'INTERMEDIATE', label: 'CLUB' },
  { value: 'ADVANCED', label: 'MASTER' },
  { value: 'EXPERT', label: 'NIGHTMARE' },
];

const LEAK_LABEL: Record<string, string> = {
  development: 'developing your pieces',
  kingSafety: 'king safety',
  accuracy: 'accuracy',
  tactics: 'tactics',
  blunders: 'hanging pieces',
};

function overallVerdict(goodRatio: number): { emoji: string; word: string; line: string } {
  if (goodRatio >= 0.8) return { emoji: '🔥', word: 'COMMANDING', line: 'Chester is filing a formal complaint.' };
  if (goodRatio >= 0.6) return { emoji: '😎', word: 'STRONG GAME', line: 'A performance worth a small parade.' };
  if (goodRatio >= 0.4) return { emoji: '🙂', word: 'SCRAPPY', line: 'Real fight in this one. The habits are forming.' };
  return { emoji: '💪', word: 'TOUGH LESSON', line: 'Every strong player has a drawer full of these.' };
}

function moveOfGameWhy(phrase: string | null, centipawnLoss: number | null): string {
  if (phrase && /takes|wins|captures/i.test(phrase)) return 'you won material and kept everything defended - that is how small leads become wins.';
  if (phrase && /check|attacking the king/i.test(phrase)) return "a forcing move: Chester's reply was chosen for him. Free turns like that are where plans become wins.";
  if ((centipawnLoss ?? 99) === 0) return "the engine's own first choice, played like it was obvious. That is board vision, not luck.";
  return 'the most accurate decision in your game - maximum value, nothing left hanging. That is the habit that separates club players from spectators.';
}

function habitMark(state: 'pass' | 'almost' | 'miss'): string {
  return state === 'pass' ? '✅ PASS' : state === 'almost' ? '🟡 ALMOST' : '⛔ NOT YET';
}

export default function ChesterReportCard({
  grades,
  review,
  scouting,
  isLoading,
  pgn,
  difficulty,
  summary,
  onClose,
  onRetry,
}: {
  grades: GradedMove[];
  review: string;
  scouting?: string[];
  isLoading: boolean;
  pgn?: string;
  difficulty?: string;
  summary?: Summary;
  onClose: () => void;
  onRetry?: (() => void) | null;
}) {
  const mine = grades.filter((entry) => entry.player === 'You');
  const phrases = useMemo(() => phrasesFromPgn(pgn || ''), [pgn]);
  const goodCount = mine.filter((entry) => entry.grade === 'A' || entry.grade === 'B').length;
  const blunderCount = mine.filter((entry) => entry.grade === 'F').length;
  const goodRatio = mine.length ? goodCount / mine.length : 0;
  const verdict = overallVerdict(goodRatio);
  const best = mine.length ? mine.reduce((a, b) => ((a.centipawnLoss ?? 999) <= (b.centipawnLoss ?? 999) ? a : b)) : null;
  const worst = mine.length ? mine.reduce((a, b) => ((a.centipawnLoss ?? 0) >= (b.centipawnLoss ?? 0) ? a : b)) : null;

  const letter = summary?.grade || (goodRatio >= 0.8 ? 'A' : goodRatio >= 0.65 ? 'B' : goodRatio >= 0.5 ? 'C' : goodRatio >= 0.35 ? 'D' : 'F');
  const score = summary?.score ?? Math.round(goodRatio * 100);

  const won = /1-0\s*$/.test(pgn || '');
  const levelIndex = Math.max(0, LADDER.findIndex((level) => level.value === difficulty));
  const levelLabel = LADDER[levelIndex]?.label || 'ROOKIE';
  const nextLabel = LADDER[levelIndex + 1]?.label || null;
  const habit = weakestHabit(summary, blunderCount);
  const readyUp = won && Boolean(nextLabel);
  const atTop = !nextLabel;


  // Verdict 2.0: cross-game memory. Read the previous mission BEFORE banking
  // this one, then judge it against this game's dimensions.
  const prevMission = useMemo(() => getVerdictMemory(), []);
  const banked = useRef(false);
  useEffect(() => {
    if (banked.current || !mine.length) return;
    banked.current = true;
    recordVerdictMemory(habit.key, habit.focus);
  }, [habit.key, habit.focus, mine.length]);

  const dimValue = (key: string): number => {
    if (key === 'blunders') return blunderCount === 0 ? 100 : blunderCount === 1 ? 60 : 20;
    const value = summary?.[key as 'development' | 'kingSafety' | 'accuracy' | 'tactics'];
    return typeof value === 'number' ? value : 100;
  };
  const missionCallback = prevMission.leakKey && prevMission.leakKey !== habit.key
    ? dimValue(prevMission.leakKey) >= 70
      ? { icon: '📈', line: `Last game's mission was ${LEAK_LABEL[prevMission.leakKey] || prevMission.leakKey} - you fixed it. Banked.` }
      : { icon: '📉', line: `Last game's mission was ${LEAK_LABEL[prevMission.leakKey] || prevMission.leakKey} - still leaking. Chester noticed.` }
    : prevMission.leakKey
      ? { icon: '🔁', line: `Same mission as last game: ${LEAK_LABEL[prevMission.leakKey] || prevMission.leakKey}. This is now officially a pattern.` }
      : null;

  const habits = summary?.habits;
  const habitChecks = habits
    ? [
        { label: 'CASTLE', state: habits.castled ? 'pass' as const : 'miss' as const },
        { label: 'DEVELOP 3+ PIECES', state: habits.developed ? 'pass' as const : 'almost' as const },
        { label: 'HANG NOTHING', state: (habits.blunders ?? 0) === 0 ? 'pass' as const : (habits.blunders ?? 0) === 1 ? 'almost' as const : 'miss' as const },
      ]
    : null;

  // PROMOTION PROGRESS: real, local, game-by-game evidence of how close the player
  // is to the next rung - the door (beat this level), the grade (bank a B or better
  // here), and the habits (clean sheet: castle, develop, hang nothing). This game's
  // result is already banked in the ladder by the time the card opens.
  const GRADE_POINTS: Record<string, number> = { 'A+': 7, A: 6, 'A-': 5, B: 4, C: 3, D: 2, F: 1 };
  const lad = getLadder();
  const levelRecord = (difficulty && lad.levels?.[difficulty]) || { wins: 0, games: 0, bestGrade: null, lastGrade: null };
  const doorBeaten = levelIndex >= LADDER.length - 1 ? lad.grandChester : lad.unlocked > levelIndex;
  const gradeBanked = (GRADE_POINTS[levelRecord.bestGrade || ''] || 0) >= GRADE_POINTS.B;
  const habitsPassed = habitChecks ? habitChecks.filter((c) => c.state === 'pass').length : 0;
  const cleanSheet = habitChecks ? habitsPassed === habitChecks.length : false;
  const promoChecks = [
    { done: doorBeaten, label: `BEAT ${levelLabel}`, hint: doorBeaten ? 'door beaten' : `the door to ${nextLabel || 'the crown'}` },
    { done: gradeBanked, label: 'BANK A B OR BETTER', hint: `best at ${levelLabel}: ${levelRecord.bestGrade || 'none yet'}` },
    { done: cleanSheet, label: 'CLEAN SHEET', hint: `${habitsPassed}/3 habits this game` },
  ];
  const promoDone = promoChecks.filter((c) => c.done).length;
  const promoPct = Math.round((promoDone / promoChecks.length) * 100);
  const promoReady = promoDone === promoChecks.length;

  const bestPhrase = best ? phrases.get(best.ply) || null : null;
  const worstPhrase = worst ? phrases.get(worst.ply) || null : null;
  const canRetry = Boolean(onRetry && worst && (worst.centipawnLoss ?? 0) >= 150 && pgn);

  return <div className="chester-report-modal" role="dialog" aria-modal="true" aria-labelledby="chester-report-title">
    <div className="chester-report-modal__backdrop" onClick={onClose} />
    <section className="chester-report-card">
      <header><span>CHESTER'S FINAL VERDICT</span><button type="button" onClick={onClose} aria-label="Close report">×</button></header>
      <h2 id="chester-report-title">{verdict.emoji} {verdict.word}</h2>
      <p className="chester-report-card__tagline">{verdict.line}</p>

      <div className="chester-report-card__graderow">
        <div className="chester-report-card__letter"><span>EFFORT GRADE</span><b>{letter}</b><small>{score}/100</small></div>
        <div className="chester-report-card__ladder">
          <span className="chester-report-card__ladder-title">SKILL LADDER</span>
          <div className="chester-report-card__ladder-track">
            {LADDER.map((level, index) => <i key={level.value} className={`chester-report-card__rung ${index < levelIndex ? 'is-passed' : ''} ${index === levelIndex ? 'is-current' : ''}`}><em>{level.label}</em>{index === levelIndex && <u>YOU</u>}</i>)}
          </div>
          <div className={`chester-report-card__readiness ${promoReady ? 'is-ready' : ''}`}>
            <b>{atTop ? '👑 THE CROWN' : `ROAD TO ${nextLabel}`}<em className="chester-report-card__promo-pct">{promoPct}%</em></b>
            <div className="chester-report-card__promo-bar"><i style={{ width: `${promoPct}%` }} /></div>
            <ul className="chester-report-card__promo-checks">
              {promoChecks.map((check) => <li key={check.label} className={check.done ? 'is-done' : ''}><u>{check.done ? '✅' : '⬜'}</u> {check.label} <small>{check.hint}</small></li>)}
            </ul>
            <p>{promoReady ? (atTop ? 'The town is yours. Joseph is next.' : `Promotion case complete - ${nextLabel} Chester is waiting. Go take it.`) : atTop ? 'Beat NIGHTMARE and keep the sheets clean: the crown wants proof.' : `${promoDone} of 3 banked. ${!doorBeaten ? `Beat ${levelLabel} for the door.` : !gradeBanked ? 'A B-grade here seals the case.' : 'One clean game: castle, develop, hang nothing.'}`}</p>
          </div>
        </div>
      </div>

      {habitChecks && <div className="chester-report-card__habits">
        {habitChecks.map((check) => <span key={check.label} className={`chester-report-card__habit is-${check.state}`}><b>{check.label}</b><em>{habitMark(check.state)}</em></span>)}
      </div>}

      {missionCallback && <div className="chester-report-card__moment">
        <b>{missionCallback.icon} LAST GAME'S MISSION</b>
        <p>{missionCallback.line}</p>
      </div>}

      {best && bestPhrase && <div className="chester-report-card__moment">
        <b>🎉 THE WIN TO CELEBRATE</b>
        <p>{bestPhrase.charAt(0).toUpperCase() + bestPhrase.slice(1)} - {moveOfGameWhy(bestPhrase, best.centipawnLoss)}</p>
      </div>}

      <div className="chester-report-card__moment">
        <b>🩹 THE LEAK</b>
        <p>{habit.reason.charAt(0).toUpperCase() + habit.reason.slice(1)}.{worst && (worst.centipawnLoss ?? 0) >= 250 && worstPhrase ? ` The swing of the game: ${worstPhrase}.` : ''}</p>
      </div>

      <div className="chester-report-card__focus">
        <b>🎯 NEXT GAME'S MISSION</b>
        <p>{habit.focus}</p>
      </div>

      {canRetry && <button type="button" className="verdict-share__cta" style={{ background: '#22d3ee' }} onClick={onRetry!}>🔁 RETRY THE MISTAKE<small>replay the position, find the better move</small></button>}

      <p className="chester-report-card__story">{isLoading ? 'Chester is writing his final review...' : review}</p>
      {!isLoading && scouting && scouting.length > 0 && <ul className="chester-report-card__scout" aria-label="Scouting report">{scouting.map((b, i) => <li key={i}>{b}</li>)}</ul>}
      <p className="chester-report-signature">{letter === 'A' ? 'Framed. This one hangs on the town hall wall.' : letter === 'B' ? 'A proper scrap. You are knocking on something big.' : letter === 'C' ? 'The bones of a great player, the skin of a gambler.' : 'We burn this tape together, then we rebuild.'}<b>- Chester 🖋</b></p>
      <VerdictShare grades={grades} pgn={pgn} difficulty={difficulty} opponentLabel={`${levelLabel} CHESTER`} summary={{ grade: letter, score, accuracy: summary?.accuracy, openingName: null }} />
    </section>
  </div>;
}
