'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CHESTER_LANDING_COPY, DAILY_LEADERS, LEAGUE_STANDINGS } from '@/lib/chester-landing';

function ChesterNote({ children }: { children: string }) {
  return <p className="landing-chester-note"><b>CHESTER:</b> {children}</p>;
}

function SectionCard({ title, eyebrow, children, note }: { title: string; eyebrow: string; children: React.ReactNode; note: string }) {
  return <section className="landing-card"><header><span>{eyebrow}</span><h2>{title}</h2></header>{children}<ChesterNote>{note}</ChesterNote></section>;
}

function ChallengeLinks() {
  const [message, setMessage] = useState('');
  const createInvite = async (teamMode: boolean) => {
    const room = Math.random().toString(36).slice(2, 10);
    const url = `${window.location.origin}/arena?room=${room}${teamMode ? '&mode=2v2' : ''}`;
    try { await navigator.clipboard.writeText(url); setMessage(`${teamMode ? '2v2 team' : '1v1'} invite copied.`); } catch { setMessage(url); }
  };
  return <div className="landing-actions"><button onClick={() => createInvite(false)}>Create 1v1 Invite</button><button onClick={() => createInvite(true)}>Create 2v2 Invite</button>{message && <small>{message}</small>}</div>;
}

export default function ChessTownLanding() {
  const [difficulty, setDifficulty] = useState('INTERMEDIATE');
  return <main className="landing-shell">
    <header className="landing-hero"><div><span>CHESS TOWN / COMMUNITY PLAY</span><h1>Make every move part of the story.</h1><p>{CHESTER_LANDING_COPY.greeting}</p></div><div className="landing-chester" aria-label="Chester">♞</div></header>
    <div className="landing-grid">
      <SectionCard eyebrow="TODAY'S TABLE" title="Daily Leaderboard" note={CHESTER_LANDING_COPY.dailyLeaderboard}>
        <ol className="landing-rankings">{DAILY_LEADERS.map((player) => <li key={player.rank}><span>#{player.rank}</span><b>{player.name}</b><em>{player.form}</em><strong>{player.points}</strong></li>)}</ol>
      </SectionCard>
      <SectionCard eyebrow="CHESTER CHALLENGE" title="Daily Chester Challenge" note={CHESTER_LANDING_COPY.dailyChallenge}>
        <div className="landing-challenge"><b>Find the mate in 3</b><span>Trompowsky Attack setup</span><Link href="/chester-challenge">Play Today&apos;s Puzzle</Link></div>
        <div className="landing-mini-leaderboard"><b>Top 10 Fastest Solvers</b><span>#1 Brendan · 00:14.2</span><span>#2 Z-Man · 00:18.9</span><span>#3 Gabe · 00:26.3</span></div>
      </SectionCard>
      <SectionCard eyebrow="LEVEL PATH" title="Chess Town Training" note={CHESTER_LANDING_COPY.training}>
        <div className="landing-skill-path">{[['01', 'Beginner', 'Center Control'], ['02', 'Intermediate', 'King Safety'], ['03', 'Pro', 'Tactical Pressure'], ['04', 'Expert', 'Endgame Conversion']].map(([number, tier, label], index) => <Link key={number} href="/arena?view=mini-games" className={index === 0 ? 'is-open' : ''}><i>{number}</i><b>{tier}</b><span>{label}</span></Link>)}</div>
      </SectionCard>
      <SectionCard eyebrow="MATCH COMMAND" title="Core Gameplay" note={CHESTER_LANDING_COPY.gameplay}>
        <div className="landing-gameplay"><label>Play Chester<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>BEGINNER</option><option>INTERMEDIATE</option><option>ADVANCED</option><option>EXPERT</option></select></label><Link href={`/arena?view=play&difficulty=${difficulty}`}>Start Match</Link></div><ChallengeLinks />
      </SectionCard>
      <SectionCard eyebrow="SEASON ONE" title="League Play" note={CHESTER_LANDING_COPY.league}>
        <div className="landing-league-head"><span>Team</span><span>W-L</span><span>Form</span></div><div className="landing-league">{LEAGUE_STANDINGS.map(([team, wins, losses, form], index) => <div key={team}><span>{index + 1}. {team}</span><b>{wins}-{losses}</b><em>{form}</em></div>)}</div><Link className="landing-link" href="/arena?view=leagues">Open Town Hall</Link>
      </SectionCard>
    </div>
  </main>;
}
