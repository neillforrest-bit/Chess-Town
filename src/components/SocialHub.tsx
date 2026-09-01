'use client';

import { useEffect, useState } from 'react';

type SocialScene = 'HOME' | 'TOWN' | 'SEASON';
type Topic = 'ALL' | 'TACTICS' | 'CALLOUTS' | 'CLUBHOUSE';

type CommunityPost = {
  id: string;
  author: string;
  handle: string;
  role: string;
  topic: Exclude<Topic, 'ALL'>;
  message: string;
  time: string;
  reactions: number;
  accent: string;
  official?: boolean;
};

type HubProps = {
  guestName: string;
  onNavigate: (scene: SocialScene) => void;
  onPlay: (mode: string, title: string) => void;
  onChallenge: () => void;
};

const STARTER_POSTS: CommunityPost[] = [
  {
    id: 'chester-week-seven',
    author: 'Chester',
    handle: '@commissioner',
    role: 'TOWN COMMISSIONER',
    topic: 'CLUBHOUSE',
    message: 'Week Seven is live. Brendan has form, Gabe has excuses, and Z-Man has the crown. Submit your moves before the narrative submits you.',
    time: 'NOW',
    reactions: 24,
    accent: '#00e5e5',
    official: true,
  },
  {
    id: 'brendan-center',
    author: 'Brendan',
    handle: '@brendan',
    role: 'HERO OF THE BOARD',
    topic: 'TACTICS',
    message: 'That central pawn break was completely sound. I will be accepting apologies after Chester confirms it.',
    time: '4M',
    reactions: 13,
    accent: '#7cff45',
  },
  {
    id: 'gabe-callout',
    author: 'Gabe',
    handle: '@gabe',
    role: 'THE VILLAIN',
    topic: 'CALLOUTS',
    message: 'Neill, private challenge tonight. No simulations, no committee, no witnesses required.',
    time: '11M',
    reactions: 18,
    accent: '#ff2b88',
  },
  {
    id: 'zman-prep',
    author: 'Z-Man',
    handle: '@zman',
    role: 'DEFENDING CHAMPION',
    topic: 'CLUBHOUSE',
    message: 'Six straight wins. The crown is available to inspect but not to borrow.',
    time: '26M',
    reactions: 31,
    accent: '#ffd84d',
  },
];

const POWER_RANKINGS = [
  { rank: 1, player: 'Z-Man', record: '10-1', form: 'W6', rating: 96, change: 'HOLD', accent: '#ffd84d' },
  { rank: 2, player: 'Brendan', record: '9-2', form: 'W4', rating: 92, change: '+1', accent: '#00e5e5' },
  { rank: 3, player: 'Gabe', record: '8-3', form: 'W2', rating: 87, change: '-1', accent: '#ff2b88' },
  { rank: 4, player: 'Neill', record: '8-3', form: 'L1', rating: 84, change: 'HOLD', accent: '#7cff45' },
  { rank: 5, player: 'Sam', record: '7-4', form: 'W1', rating: 76, change: '+2', accent: '#b7c8cc' },
];

const FIXTURES = [
  { time: 'FRI 8:00', home: 'Neill', away: 'Brendan', title: 'The Main Event', heat: 98, mode: 'SIMULATION' },
  { time: 'SAT 7:30', home: 'Gabe', away: 'Z-Man', title: 'Crown Pressure', heat: 91, mode: 'SIMULATION' },
  { time: 'SUN 6:00', home: 'Heroes', away: 'Villains', title: 'Tag-Team Night', heat: 94, mode: '2V2' },
];

function HubNav({ active, onNavigate, onPlay, onChallenge }: HubProps & { active: SocialScene }) {
  return (
    <header className="social-nav">
      <button className="social-brand" onClick={() => onNavigate('HOME')} aria-label="Chess Town home">
        <span>CT</span><b>CHESS TOWN</b>
      </button>
      <nav aria-label="Community navigation">
        {(['HOME', 'TOWN', 'SEASON'] as const).map((item) => (
          <button key={item} className={active === item ? 'is-active' : ''} onClick={() => onNavigate(item)}>
            {item === 'HOME' ? 'ARENA' : item === 'TOWN' ? 'TOWN SQUARE' : 'SEASON'}
          </button>
        ))}
      </nav>
      <div className="social-nav__actions">
        <button onClick={onChallenge}>INVITE</button>
        <button className="social-play" onClick={() => onPlay('COACH_OPENING', 'You vs. Chester')}>PLAY</button>
      </div>
    </header>
  );
}

export function TownSquare(props: HubProps) {
  const [topic, setTopic] = useState<Topic>('ALL');
  const [draft, setDraft] = useState('');
  const [posts, setPosts] = useState<CommunityPost[]>(STARTER_POSTS);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem('chess-town-posts') || '[]');
        if (Array.isArray(saved) && saved.length) setPosts([...saved.slice(0, 8), ...STARTER_POSTS]);
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const persistPersonalPosts = (next: CommunityPost[]) => {
    localStorage.setItem('chess-town-posts', JSON.stringify(next.filter((post) => post.handle === '@you').slice(0, 8)));
  };

  const publishPost = () => {
    const message = draft.trim().slice(0, 220);
    if (!message) return;
    const post: CommunityPost = {
      id: `${Date.now()}`,
      author: props.guestName || 'Challenger',
      handle: '@you',
      role: 'TOWN CONTENDER',
      topic: topic === 'ALL' ? 'CLUBHOUSE' : topic,
      message,
      time: 'NOW',
      reactions: 0,
      accent: '#7cff45',
    };
    const next = [post, ...posts];
    setPosts(next);
    persistPersonalPosts(next);
    setDraft('');
  };

  const reactToPost = (id: string) => {
    const next = posts.map((post) => post.id === id ? { ...post, reactions: post.reactions + 1 } : post);
    setPosts(next);
    persistPersonalPosts(next);
  };

  const filteredPosts = topic === 'ALL' ? posts : posts.filter((post) => post.topic === topic || post.official);

  return (
    <div className="social-shell">
      <HubNav {...props} active="TOWN" />
      <main className="town-layout">
        <section className="town-feed">
          <div className="social-title-row">
            <div><span>LIVE FROM THE CLUBHOUSE</span><h1>TOWN SQUARE</h1></div>
            <div className="town-presence"><i /> 38 IN TOWN</div>
          </div>

          <div className="town-topics" aria-label="Forum topics">
            {(['ALL', 'TACTICS', 'CALLOUTS', 'CLUBHOUSE'] as const).map((item) => (
              <button key={item} className={topic === item ? 'is-active' : ''} onClick={() => setTopic(item)}>{item}</button>
            ))}
          </div>

          <div className="town-composer">
            <div className="town-avatar">{(props.guestName || 'C').slice(0, 1).toUpperCase()}</div>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={220} placeholder="Call your shot. Ask the town. Start a rivalry." aria-label="New Town Square post" />
            <button onClick={publishPost} disabled={!draft.trim()}>POST</button>
          </div>

          <div className="town-posts">
            {filteredPosts.map((post) => (
              <article key={post.id} className={`town-post${post.official ? ' town-post--official' : ''}`} style={{ '--post-accent': post.accent } as React.CSSProperties}>
                <div className="town-post__avatar">{post.official ? '♞' : post.author.slice(0, 1)}</div>
                <div className="town-post__body">
                  <div className="town-post__meta"><b>{post.author}</b><span>{post.handle}</span><em>{post.role}</em><time>{post.time}</time></div>
                  <p>{post.message}</p>
                  <div className="town-post__actions">
                    <button onClick={() => reactToPost(post.id)}>+ HEAT <b>{post.reactions}</b></button>
                    <span>{post.topic}</span>
                    {post.topic === 'CALLOUTS' && <button onClick={props.onChallenge}>ANSWER CHALLENGE</button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="town-sidebar">
          <section className="chester-desk">
            <span className="chester-desk__eyebrow">{"COMMISSIONER'S DESK"}</span>
            <div className="chester-desk__mark">♞</div>
            <h2>CHESTER<br />RUNS THIS TOWN.</h2>
            <p>Power rankings at midnight. Match verdicts on the whistle. Excuses reviewed never.</p>
            <button onClick={() => props.onPlay('COACH_DAILY', 'Chester Daily Verdict')}>{"FACE TODAY'S VERDICT"}</button>
          </section>

          <section className="live-room">
            <div className="live-room__label"><i /> LIVE ROOM</div>
            <h3>NEILL vs. BRENDAN</h3>
            <p>Town prediction: 62% Brendan</p>
            <div className="live-room__meter"><span /></div>
            <button onClick={() => props.onPlay('SIMULATION', 'Neill vs. Brendan')}>WATCH WITH THE TOWN</button>
          </section>

          <section className="town-trending">
            <span>TRENDING IN TOWN</span>
            <ol>
              <li><b>#BongcloudTrial</b><small>42 posts</small></li>
              <li><b>Is Gabe actually winning?</b><small>31 posts</small></li>
              <li><b>Week Seven predictions</b><small>24 posts</small></li>
            </ol>
          </section>
        </aside>
      </main>
    </div>
  );
}

export function SeasonHub(props: HubProps) {
  return (
    <div className="social-shell season-shell">
      <HubNav {...props} active="SEASON" />
      <main className="season-layout">
        <section className="season-hero">
          <div>
            <span className="season-kicker">SEASON ONE / WEEK SEVEN</span>
            <h1>EVERY MOVE<br />CHANGES THE TABLE.</h1>
            <p>Three fixtures. One crown. Chester has rated the pressure at an entirely reasonable 97 percent.</p>
          </div>
          <div className="season-countdown"><span>NEXT LOCK</span><b>01:42:18</b><small>FRIDAY / 8:00 PM</small></div>
        </section>

        <section className="season-rankings">
          <div className="season-section-title"><div><span>{"CHESTER'S MODEL"}</span><h2>POWER RANKINGS</h2></div><button onClick={() => props.onNavigate('TOWN')}>DEBATE IN TOWN</button></div>
          <div className="ranking-list">
            {POWER_RANKINGS.map((entry) => (
              <article key={entry.player} style={{ '--rank-accent': entry.accent } as React.CSSProperties}>
                <b className="ranking-number">{entry.rank}</b>
                <div><strong>{entry.player}</strong><span>{entry.record} / {entry.form}</span></div>
                <div className="ranking-rating"><i style={{ width: `${entry.rating}%` }} /></div>
                <b>{entry.rating}</b>
                <em>{entry.change}</em>
              </article>
            ))}
          </div>
        </section>

        <section className="season-fixtures">
          <div className="season-section-title"><div><span>COMING UP</span><h2>FIXTURE BOARD</h2></div></div>
          <div className="fixture-list">
            {FIXTURES.map((fixture) => (
              <article key={fixture.title}>
                <div className="fixture-time">{fixture.time}</div>
                <span>{fixture.title}</span>
                <h3>{fixture.home} <i>vs.</i> {fixture.away}</h3>
                <div className="fixture-heat"><small>RIVALRY HEAT</small><b>{fixture.heat}</b></div>
                <button onClick={() => props.onPlay(fixture.mode, `${fixture.home} vs. ${fixture.away}`)}>ENTER MATCH</button>
              </article>
            ))}
          </div>
        </section>

        <aside className="season-sidebar">
          <section className="chester-verdict">
            <span>{"CHESTER'S WEEKLY VERDICT"}</span>
            <div>♞</div>
            <blockquote>“Brendan is climbing. Z-Man is comfortable. Comfort, historically, is where the blunders begin.”</blockquote>
          </section>
          <section className="fantasy-card">
            <span>YOUR FANTASY FORM</span>
            <b>184 PTS</b>
            <div><i style={{ width: '72%' }} /></div>
            <p>Top 28% this week</p>
            <button onClick={() => props.onPlay('COACH_DAILY', 'Daily Breakthrough')}>EARN DAILY POINTS</button>
          </section>
          <section className="season-awards">
            <span>WEEKLY AWARDS</span>
            <p><b>MOVE OF THE WEEK</b> Brendan / Nxf7+</p>
            <p><b>CHAOS AGENT</b> Gabe / 4 gambits</p>
            <p><b>{"CHESTER'S TARGET"}</b> Neill / L1</p>
          </section>
        </aside>
      </main>
    </div>
  );
}
