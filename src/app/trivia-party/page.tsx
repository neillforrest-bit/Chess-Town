"use client";

import { versionLink } from '@/lib/version-link';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {hasHostIdentity} from '@/lib/durable-invites';
import TriviaPartyGame from '@/components/TriviaPartyGame';
export default function TriviaPartyPage() {
  const [durable,setDurable]=useState(false),[creating,setCreating]=useState(false);
  const [room, setRoom] = useState('');
  const [host, setHost] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('room');
    if (value && /^[a-z0-9]{8,24}$/.test(value)) { setRoom(value);const saved=params.get('durable')==='1';setDurable(saved);setHost(saved?hasHostIdentity('trivia-party',value):params.get('host')==='1'); }
    setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const create = () => {
    const id = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
    window.history.replaceState(null, '', versionLink(`/trivia-party?room=${id}&host=1&durable=1`)); setRoom(id);setCreating(true);setDurable(true);setHost(true);
  };
  if (!ready) return <main className="trivia-brawl-page trivia-showtime" />;
  if (room) return <TriviaPartyGame roomId={room} isHost={host} durable={durable} creating={creating} />;
  return <main className="trivia-brawl-page trivia-showtime"><header className="trivia-brawl-header"><div><span>CHESTER&apos;S PUB · SEPARATE PHONES</span><h1>Party Table</h1></div><Link href="/?choose=mode&town=trivia">‹ Trivia Town</Link></header><section className="trivia-brawl-question"><h2>Two to five players. One shared quiz.</h2><p>Host on one phone and send the invite to up to four friends. New invites last seven days. The host can close the tab and return in this browser. Guests can reconnect to their saved seats. New players join before the quiz starts.</p><p>This separate party format uses shared house questions, timed group flashes and group rules. Your existing two-player Brawl is unchanged.</p><button className="trivia-brawl-primary" onClick={create}>OPEN A PARTY TABLE</button></section></main>;
}
