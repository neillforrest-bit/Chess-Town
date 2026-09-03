'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ChesterHost from '@/components/ChesterHost';

const drills = ['Daily Breakthrough', 'Practice Your Opening', 'Own the Center', 'Bring Out the Squad', 'Castle Before Chaos', 'Build the Squeeze', 'Convert the Advantage', 'The Knightmare', 'Phantom Threat'];
const drillModes: Record<string, string> = { 'Daily Breakthrough': 'COACH_DAILY', 'Practice Your Opening': 'COACH_PRACTICE_OPENING', 'Own the Center': 'COACH_OPENING', 'Bring Out the Squad': 'COACH_DEVELOPMENT', 'Castle Before Chaos': 'COACH_KING_SAFETY', 'Build the Squeeze': 'COACH_PRESSURE', 'Convert the Advantage': 'COACH_ENDGAME', 'The Knightmare': 'COACH_KNIGHTMARE', 'Phantom Threat': 'COACH_INVISIBLE' };

export default function TrainingPage() {
  const router = useRouter();
  const [drill, setDrill] = useState(drills[0]);
  return <main className="training-page training-picker-page">
    <ChesterHost eyebrow="CHESTER'S MINI-GAME MENU" instruction="Pick your poison. Which mini-game are we playing? Choose a challenge, then bring a plan that survives more than one move." />
    <section className="training-picker" aria-label="Choose a mini game">
      <span>CHESTER MINI GAMES</span>
      <h1>Choose Your Challenge</h1>
      <label>MINI GAME<select value={drill} onChange={(event) => setDrill(event.target.value)}>{drills.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button type="button" onClick={() => router.push(`/play-chester?mode=${drillModes[drill]}`)}>PLAY {drill}</button>
    </section>
  </main>;
}