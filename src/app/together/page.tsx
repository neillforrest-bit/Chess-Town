'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './together.module.css';
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
export default function Together() {
  const router = useRouter();
  const [name, setName] = useState(''); const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false); const [ready, setReady] = useState(false);
  useEffect(() => { try { setName(localStorage.getItem('cs-name') || ''); } catch { /* storage optional */ } setReady(true); }, []);
  const launch = (solo = false) => {
    const n = name.trim(); if (!n) return;
    try { localStorage.setItem('cs-name', n); } catch { /* storage optional */ }
    router.push(`/play/${makeCode()}?p=A&n=${encodeURIComponent(n)}${solo ? '&solo=1' : ''}`);
  };
  return <main className={styles.page}>
    <header><Link href="https://chess-town-git-instinct-good-together-preview-20261111-neillo.vercel.app/?choose=mode&town=movie">← Movie Town</Link><span>ORSON HOSTS</span></header>
    <section className={styles.title}><span className={styles.eyebrow}>TWO PHONES. ONE FILM.</span><h1>Movie night,<br/><em>together.</em></h1><p>The age-old problem: what do we watch? Turn it into a game with your partner.</p></section>
    <ol className={styles.steps}><li><b>Invite</b><span>Create a room and share its link.</span></li><li><b>Play</b><span>Match your moods. Draft in secret.</span></li><li><b>Choose</b><span>Battle the bracket. Crown tonight&apos;s film.</span></li></ol>
    <section className={styles.form}>
      <label htmlFor="movie-host-name">Your callsign</label><input id="movie-host-name" disabled={!ready} autoComplete="nickname" maxLength={14} placeholder="e.g., Forrest" value={name} onChange={e => setName(e.target.value)}/>
      <button className={styles.primary} disabled={!name.trim()} onClick={() => launch()}>CREATE A SHARE-LINK ROOM <span>→</span></button>
      <p className={styles.note}>Full Vibe → Draft → Bracket → Watch game. No bot joins your partner&apos;s seat.</p>
    </section>
    {joining ? <form className={styles.join} onSubmit={e => { e.preventDefault(); if (code.length === 4) router.push(`/invite?gameId=${code}`); }}><label htmlFor="movie-join-code">Room code</label><div><input id="movie-join-code" placeholder="ABCD" maxLength={4} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}/><button type="submit" disabled={code.length !== 4}>JOIN</button><button type="button" aria-label="Close join" onClick={() => setJoining(false)}>×</button></div></form> : <button className={styles.joinToggle} onClick={() => setJoining(true)}>Already invited? Join with a code</button>}
    <footer><Link href="/tonight">Quick film picks</Link><button disabled={!name.trim()} onClick={() => launch(true)}>Play 1v1 vs Orson</button><Link href="/">More nights</Link></footer>
  </main>;
}
