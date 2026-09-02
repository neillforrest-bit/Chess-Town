'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

export default function BrawlPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { p1Difficulty, p2Difficulty, setP1Difficulty, setP2Difficulty, setActiveChaosEvent } = useBrawlState();
  const [createdMatchId, setCreatedMatchId] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const matchId = createdMatchId || searchParams.get('match') || '';

  const createRoom = async () => {
    const nextMatchId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const response = await fetch('/api/brawl/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: nextMatchId, p1Difficulty, p2Difficulty }),
    });
    if (!response.ok) throw new Error('Could not create the Brawl room');
    setCreatedMatchId(nextMatchId);
    router.replace(`/brawl?match=${nextMatchId}`);
    return nextMatchId;
  };

  const shareInvite = async () => {
    try {
      const roomId = matchId || await createRoom();
      const inviteUrl = `${window.location.origin}/arena?mode=PVP_REMOTE&brawl=1&match=${roomId}&role=b`;
      await navigator.clipboard.writeText(inviteUrl);
      setInviteStatus('Invite copied. Send it to Player 2.');
    } catch (error) {
      setInviteStatus(error instanceof Error ? error.message : 'Could not copy the invite.');
    }
  };

  const startBrawl = async () => {
    try {
      const roomId = matchId || await createRoom();
      setActiveChaosEvent(null);
      router.push(`/arena?mode=PVP_REMOTE&brawl=1&match=${roomId}&role=w`);
    } catch (error) {
      setInviteStatus(error instanceof Error ? error.message : 'Could not start the Brawl.');
    }
  };

  return (
    <main className="brawl-lobby">
      <div className="brawl-grid" aria-hidden="true" />
      <section className="brawl-panel">
        <span className="brawl-kicker">CHESTER PRESENTS</span>
        <h1>THE BACKROOM BRAWL</h1>
        <p>Two players. One board. No graceful exits.</p>
        <DifficultyPicker player="PLAYER 1" value={p1Difficulty} onChange={setP1Difficulty} />
        <DifficultyPicker player="PLAYER 2" value={p2Difficulty} onChange={setP2Difficulty} />
        <button className="brawl-start" type="button" onClick={shareInvite}>SHARE INVITE LINK</button>
        <button className="brawl-start" type="button" onClick={startBrawl}>START BRAWL</button>
        {inviteStatus && <p role="status">{inviteStatus}</p>}
      </section>
    </main>
  );
}