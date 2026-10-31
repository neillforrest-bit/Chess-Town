'use client';
// Games for All - game-first family hub. Each game opens its own mode options.
// Chess = full Chess-Town experience; Pub Trivia = brawl + the new team mode;
// Movie Night and Checkers are presented honestly (link out / coming soon).
import Link from 'next/link';

const MOVIE_NIGHT_URL = 'https://chess-town-git-movie-night-neillo.vercel.app';

const CSS: any = {
  page: { minHeight: '100dvh', background: 'linear-gradient(180deg,#120b2e 0%,#1d1145 100%)', color: '#fff', fontFamily: "'Nunito', system-ui, sans-serif", padding: '22px 18px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  brand: { fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 44, letterSpacing: 1, color: '#ffd93b', textShadow: '0 4px 0 rgba(0,0,0,0.4)', textAlign: 'center', margin: '14px 0 2px' },
  tag: { fontSize: 16, opacity: 0.85, textAlign: 'center', marginBottom: 18 },
  tile: (accent: string): React.CSSProperties => ({ width: '100%', maxWidth: 460, background: 'rgba(255,255,255,0.06)', border: `2px solid ${accent}`, borderRadius: 20, padding: '18px 18px 16px', marginTop: 16, boxSizing: 'border-box' }),
  tileHead: { display: 'flex', alignItems: 'center', gap: 12 },
  tileIcon: { fontSize: 34 },
  tileTitle: { fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 26, letterSpacing: 0.5 },
  tileSub: { fontSize: 14, opacity: 0.85, marginTop: 2 },
  modeBtn: (accent: string): React.CSSProperties => ({ display: 'block', width: '100%', textAlign: 'left', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 14, padding: '13px 15px', marginTop: 10, color: '#fff', fontFamily: "'Nunito', system-ui, sans-serif", fontSize: 16, fontWeight: 800, textDecoration: 'none', boxSizing: 'border-box' }),
  modeNote: { display: 'block', fontSize: 13, fontWeight: 600, opacity: 0.75, marginTop: 2 },
  soon: { display: 'inline-block', background: 'rgba(255,217,59,0.18)', border: '1px solid rgba(255,217,59,0.5)', color: '#ffd93b', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 900, letterSpacing: 1, marginLeft: 8 },
};

export default function GamesForAllHub() {
  return (
    <main style={CSS.page}>
      <div style={{ fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 14, letterSpacing: 3, opacity: 0.7, marginTop: 8 }}>WELCOME TO</div>
      <h1 style={CSS.brand}>GAMES FOR ALL</h1>
      <div style={CSS.tag}>Pick a game. Grab your people. Chester hosts.</div>

      <section style={CSS.tile('#c8cdd5')}>
        <div style={CSS.tileHead}>
          <span style={CSS.tileIcon}>♞</span>
          <div>
            <div style={CSS.tileTitle}>Chess</div>
            <div style={CSS.tileSub}>Classic black-v-white boards, Chester coaching every move</div>
          </div>
        </div>
        <Link href="/chess" style={CSS.modeBtn('#c8cdd5')}>Play Chess<span style={CSS.modeNote}>New here? Chester sizes up your level first</span></Link>
      </section>

      <section style={CSS.tile('#56ccf2')}>
        <div style={CSS.tileHead}>
          <span style={CSS.tileIcon}>🍻</span>
          <div>
            <div style={CSS.tileTitle}>Pub Trivia</div>
            <div style={CSS.tileSub}>Solo brawls or full team quiz night</div>
          </div>
        </div>
        <Link href="/trivia-teams" style={CSS.modeBtn('#56ccf2')}>Team Quiz Night<span style={CSS.modeNote}>Everyone on their phone - random teams, 5 rounds, scoreboard</span></Link>
        <Link href="/trivia-brawl" style={CSS.modeBtn('#56ccf2')}>Trivia Brawl<span style={CSS.modeNote}>Head-to-head on two devices</span></Link>
        <Link href="/trivia" style={CSS.modeBtn('#56ccf2')}>Solo Trivia<span style={CSS.modeNote}>Quick questions against the house</span></Link>
      </section>

      <section style={CSS.tile('#ff6b6b')}>
        <div style={CSS.tileHead}>
          <span style={CSS.tileIcon}>🎬</span>
          <div>
            <div style={CSS.tileTitle}>Movie Night</div>
            <div style={CSS.tileSub}>Pick tonight's film together</div>
          </div>
        </div>
        <a href={MOVIE_NIGHT_URL} target="_blank" rel="noreferrer" style={CSS.modeBtn('#ff6b6b')}>Open Movie Night<span style={CSS.modeNote}>Opens the Movie Night app in a new tab</span></a>
      </section>

      <section style={{ ...CSS.tile('#ffb454'), opacity: 0.75 }}>
        <div style={CSS.tileHead}>
          <span style={CSS.tileIcon}>⚫</span>
          <div>
            <div style={CSS.tileTitle}>Checkers<span style={CSS.soon}>COMING SOON</span></div>
            <div style={CSS.tileSub}>On its way to the hub - not tonight</div>
          </div>
        </div>
      </section>

      <div style={{ marginTop: 26, fontSize: 13, opacity: 0.6 }}>
        <Link href="/classic" style={{ color: '#fff' }}>Classic Chess-Town arena</Link>
      </div>
    </main>
  );
}
