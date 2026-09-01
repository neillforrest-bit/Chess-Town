'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProfile, getTitle, type ProfileState } from '@/lib/profile';

function WinRate({ label, played, won, color }: { label: string; played: number; won: number; color: string }) {
  const rate = played ? Math.round((won / played) * 100) : 0;
  return <section className="profile-game-card"><div className="profile-ring" style={{ '--progress': `${rate * 3.6}deg`, '--ring-color': color } as React.CSSProperties}><b>{rate}%</b></div><div><span>{label}</span><strong>{won} wins / {played} games</strong></div></section>;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  useEffect(() => {
    const update = () => setProfile(getProfile());
    update();
    window.addEventListener('chess-town-profile-updated', update);
    return () => window.removeEventListener('chess-town-profile-updated', update);
  }, []);
  if (!profile) return null;
  const title = getTitle(profile.totalPoints);
  const nextTitle = profile.totalPoints < 500 ? 500 : profile.totalPoints < 1200 ? 1200 : 2500;
  const progress = Math.min(100, Math.round((profile.totalPoints / nextTitle) * 100));
  return <main className="profile-page">
    <header className="profile-header"><div><span>CHESS TOWN PROFILE</span><h1>{profile.username}</h1><p>{title}</p></div><Link href="/">Back to Town</Link></header>
    <section className="profile-hero"><div><span>TOTAL POINTS EARNED</span><strong>{profile.totalPoints.toLocaleString()}</strong><p>{profile.miniGamePoints} from Mini Games · {profile.dailyPoints} from Daily Challenges</p></div><div className="profile-rank"><span>{title}</span><div><i style={{ width: `${progress}%` }} /></div><small>{nextTitle - profile.totalPoints > 0 ? `${nextTitle - profile.totalPoints} points to the next title` : 'Top title unlocked'}</small></div></section>
    <section className="profile-games"><WinRate label="VS CHESTER" played={profile.games.chester.played} won={profile.games.chester.won} color="#00e5e5" /><WinRate label="PVP ARENA" played={profile.games.pvp.played} won={profile.games.pvp.won} color="#ff2b88" /></section>
    <section className="profile-actions"><Link href="/daily-challenge">Daily Challenge</Link><Link href="/arena?view=mini-games">Player Map</Link><Link href="/arena?view=play">Play Chester</Link></section>
  </main>;
}