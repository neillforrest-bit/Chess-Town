'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBrawlState, type BrawlDifficulty } from '@/components/EngineEvaluationProvider';

const DIFFICULTIES: BrawlDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'EXPERT'];

function DifficultyPicker({ player, value, onChange }: { player: string; value: BrawlDifficulty; onChange: (difficulty: BrawlDifficulty) => void }) {
  return (
    <section className="brawl-player" aria-label={`${player} difficulty`}>
      <span>{player}</span>
      <div role="group" aria-label={`Choose ${player} difficulty`}>
        {DIFFICULTIES.map((difficulty) => (
          <button key={difficulty} type="button" aria-pressed={value === difficulty} onClick={() => onChange(difficulty)}>{difficulty}</button>
        ))}
      </div>
    </section>
  );
}

function BrawlContent() {
  const router = useRouter();
  const { p1Difficulty, setP1Difficulty, setP2Difficulty, setActiveChaosEvent } = useBrawlState();
  const [inviteStatus, setInviteStatus] = useState('');

  useEffect(() => {
    setP1Difficulty('BEGINNER');
    setP2Difficulty('EXPERT');
  }, [setP1Difficulty, setP2Difficulty]);

  const startBrawl = async () => {
    try {
      setActiveChaosEvent(null);
      router.push('/arena?mode=UNDERDOG&brawl=1');
    } catch (error) {
      setInviteStatus(error instanceof Error ? error.message : 'Could not start the Brawl.');
    }
  };

  return (
    <main className="brawl-lobby">
      <div className="brawl-grid" aria-hidden="true" />
      <section className="brawl-panel">
        <span className="brawl-kicker">MINI GAME / CHESTER&apos;S HOUSE RULES</span>
        <h1>PLAY AS THE UNDERDOG</h1>
        <p>You take the White pieces. Chester plays Expert Black. The board has opinions about fair play.</p>
        <DifficultyPicker player="YOUR LEVEL" value={p1Difficulty} onChange={setP1Difficulty} />
        <section className="brawl-player" aria-label="Chester difficulty"><span>CHESTER</span><strong>EXPERT</strong></section>
        <button className="brawl-start" type="button" onClick={startBrawl}>ENTER THE UNDERDOG MATCH</button>
        {inviteStatus && <p role="status">{inviteStatus}</p>}
      </section>
    </main>
  );
}

export default function BrawlPage() {
  return (
    <Suspense fallback={<main className="brawl-lobby" />}>
      <BrawlContent />
    </Suspense>
  );
}