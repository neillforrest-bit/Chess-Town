'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LessonCinema from '@/components/LessonCinema';
import ChesterCompanion from '@/components/ChesterCompanion';

const drills = ['Daily Breakthrough', 'Practice Your Opening', 'Own the Center', 'Bring Out the Squad', 'Castle Before Chaos', 'Build the Squeeze', 'Convert the Advantage', 'The Knightmare', 'Phantom Threat'];
const drillModes: Record<string, string> = { 'Daily Breakthrough': 'COACH_DAILY', 'Practice Your Opening': 'COACH_PRACTICE_OPENING', 'Own the Center': 'COACH_OPENING', 'Bring Out the Squad': 'COACH_DEVELOPMENT', 'Castle Before Chaos': 'COACH_KING_SAFETY', 'Build the Squeeze': 'COACH_PRESSURE', 'Convert the Advantage': 'COACH_ENDGAME', 'The Knightmare': 'COACH_KNIGHTMARE', 'Phantom Threat': 'COACH_INVISIBLE' };
const drillLessons: Record<string, string> = {
  'Daily Breakthrough': "Today's hand-picked position. One idea, a few minutes, a small win to carry around.",
  'Practice Your Opening': 'Learn the first moves every strong player knows, with Chester nudging each decision.',
  'Own the Center': 'The centre squares are the high ground. Take them, keep them, punish anyone who ignores them.',
  'Bring Out the Squad': 'Pieces on the back rank cannot fight. Get your whole team into the game fast.',
  'Castle Before Chaos': 'Make king safety a habit before the fireworks start.',
  'Build the Squeeze': 'Small advantages, grown move by move until something breaks.',
  'Convert the Advantage': 'Winning position? Learn the habits that actually turn it into a win.',
  'The Knightmare': "Chester's knights get up to real mischief. Survive the forks and trickery.",
  'Phantom Threat': 'Some of Chester’s pieces are hidden. Learn to read danger you cannot see.',
};
const drillIcons: Record<string, string> = {
  'Daily Breakthrough': '☀️', 'Practice Your Opening': '📖', 'Own the Center': '🎯', 'Bring Out the Squad': '🐎', 'Castle Before Chaos': '🏰', 'Build the Squeeze': '🗜️', 'Convert the Advantage': '🏆', 'The Knightmare': '♞', 'Phantom Threat': '👻',
};
const LEVELS = [
  { value: 'BEGINNER', label: 'ROOKIE', note: 'He blunders on purpose and coaches every move' },
  { value: 'INTERMEDIATE', label: 'CLUB', note: 'A fair fight with teeth' },
  { value: 'ADVANCED', label: 'MASTER', note: 'Punishes loose pieces' },
  { value: 'EXPERT', label: 'NIGHTMARE', note: 'No mercy, no refunds' },
];

export default function TrainingPage() {
  const router = useRouter();
  const [level, setLevel] = useState('BEGINNER');const [page,setPage]=useState(0),[clip,setClip]=useState<string|null>(null);
 if(clip)return <LessonCinema key={clip} mode={clip} onClose={()=>setClip(null)} onPlay={()=>router.push(`/play-chester?mode=${clip}&level=${level}`)}/>;
  return <main className="training-page lesson-hall">
    <header className="lesson-hall__host"><div><ChesterCompanion/></div><section><h1>Chester's Lesson Hall</h1><p>Watch the idea. Then make it your move.</p></section></header>
    <span className="lesson-hall__step">STEP 1 · PICK YOUR OPPONENT - this sets how hard Chester fights in every lesson below</span>
    <div className="lesson-hall__levels" role="radiogroup" aria-label="Choose difficulty">
      {LEVELS.map((item) => <button key={item.value} type="button" className={level === item.value ? 'is-active' : ''} onClick={() => setLevel(item.value)}><b>{item.label}</b><small>{item.note}</small></button>)}
    </div>
    <span className="lesson-hall__step">STEP 2 · WATCH A LESSON, THEN PLAY AT YOUR CHOSEN LEVEL</span>
    <section className="lesson-hall__grid" aria-label="Choose a lesson">
      {drills.slice(page*3,page*3+3).map((drill) => <button key={drill} type="button" className="lesson-card" onClick={() => setClip(drillModes[drill])}>
        <i aria-hidden="true">{drillIcons[drill]}</i>
        <b>{drill}</b>
        <p>{drillLessons[drill]}</p>
        <strong>WATCH THE IDEA →</strong>
      </button>)}
    </section><nav className="lesson-hall__pager"><button disabled={!page} onClick={()=>setPage(n=>n-1)}>Previous lessons</button><span>{page+1} / 3</span><button disabled={page===2} onClick={()=>setPage(n=>n+1)}>More lessons</button></nav>
  </main>;
}
