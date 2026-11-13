"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TriviaPartyGame from '@/components/TriviaPartyGame';
export default function TriviaPartyPage() {
  const [room, setRoom] = useState('');
  const [host, setHost] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('room');
    if (value && /^[a-z0-9]{8,24}$/.test(value)) { setRoom(value); setHost(params.get('host') === '1'); }
    setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const create = () => {
    const id = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
    window.history.replaceState(null, '', `/trivia-party?room=${id}&host=1`); setRoom(id); setHost(true);
  };
  if (!ready) return <main className="trivia-brawl-page trivia-showtime" />;
  if (room) return <TriviaPartyGame roomId={room} isHost={host} />;
  return <main className="trivia-brawl-page trivia-showtime"><header className="trivia-brawl-header"><div><span>CHESTER&apos;S PUB · SEPARATE PHONES</span><h1>Party Table</h1></div><Link href="/trivia-brawl">← Pub door</Link></header><section className="trivia-brawl-question"><h2>Two to five players. One shared quiz.</h2><p>Host on one phone and send the invite to up to four friends. The host must keep the table open: closing or refreshing it loses the game. Guests can reconnect to their saved seats. New players join before the quiz starts.</p><p>This separate party format uses shared house questions, timed group flashes and group rules. Your existing two-player Brawl is unchanged.</p><button className="trivia-brawl-primary" onClick={create}>OPEN A PARTY TABLE</button></section></main>;
}
