'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}
// BUILD 136: Battle Mode entry - mint a match id and drop the player in the Walkout Tunnel.
export default function BattleEntry() {
  const router = useRouter();
  useEffect(() => { router.replace(`/battle/${makeId()}`); }, [router]);
  return <main className="battle-shell"><p className="battle-sub">Opening the tunnel...</p></main>;
}
