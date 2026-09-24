'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ChesterHost from '@/components/ChesterHost';

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
  { value: 'BEGINNER', label: 'ROOKIE', note: 'Chester leaves the door open' },
  { value: 'INTERMEDIATE', label: 'CLUB', note: 'A fair fight with teeth' },
  { value: 'ADVANCED', label: 'MASTER', note: 'Punishes loose pieces' },
  { value: 'EXPERT', label: 'NIGHTMARE', note: 'No mercy, no refunds' },
];

export default function TrainingPage() {
  const router = useRouter();
  const [level, setLevel] = useState('BEGINNER');
  return <main className="training-page lesson-hall">
    <ChesterHost eyebrow="CHESTER'S LESSON HALL" instruction="Pick your difficulty, pick your lesson. Every lesson is a real game - Chester animates, grades and explains every move live." />
    <div className="lesson-hall__levels" role="radiogroup" aria-label="Choose difficulty">
      {LEVELS.map((item) => <button key={item.value} type="button" className={level === item.value ? 'is-active' : ''} onClick={() => setLevel(item.value)}><b>{item.label}</b><small>{item.note}</small></button>)}
    </div>
    <section className="lesson-hall__grid" aria-label="Choose a lesson">
      {drills.map((drill) => <button key={drill} type="button" className="lesson-card" onClick={() => router.push(`/play-chester?mode=${drillModes[drill]}&level=${level}`)}>
        <i aria-hidden="true">{drillIcons[drill]}</i>
        <b>{drill}</b>
        <p>{drillLessons[drill]}</p>
        <strong>START LESSON →</strong>
      </button>)}
    </section>
  </main>;
}
