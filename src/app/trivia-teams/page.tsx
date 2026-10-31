// @ts-nocheck
'use client';
// Team Trivia - the family BBQ centrepiece. Shareable link, agree-to-play,
// random teams (up to 4, of 3 or 2), 5 categories x 5 rounds, captains answer,
// Chester hosts, team scoreboard after every round. Host-authoritative over the
// app's existing PeerJS transport (lib/p2p.ts); local question packs, £0.
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PEER_CONFIG } from '@/lib/p2p';
import {
  BASE_QUESTIONS, LOCAL_CATEGORIES,
} from '@/lib/trivia-local';
import { SEASON_TWO_QUESTIONS } from '@/lib/trivia-packs';
import {
  DrawnQuestion, LINES, PublicTeamRoom, TeamRoom, categoryName, drawRounds,
  freshRoom, line, pickCategories, planWild, publicView, qkey, roomCode, sortIntoTeams, uid, wildKind, wildPoints,
} from '@/lib/teams';

const QUESTION_SECONDS = 25;
const BRAINBOX_ID = -5;

// Draw one fresh question (shuffled options) from a category bank, dodging repeats.
function drawOne(categoryId: number, used: Set<string>): DrawnQuestion | null {
  const bank = (BASE_QUESTIONS as any)[categoryId] || (SEASON_TWO_QUESTIONS as any)[categoryId] || [];
  const pool = bank.filter((q: any) => !used.has(q.question));
  if (!pool.length) return null;
  const q = pool[Math.floor(Math.random() * pool.length)];
  used.add(q.question);
  const opts = [q.correct, ...q.wrong].sort(() => Math.random() - 0.5);
  return { question: q.question, options: opts, correctIndex: opts.indexOf(q.correct) };
}

// Swap tonight's wildcard slots for their special questions: a Brainbox riddle or
// brain teaser per round (his 30 Oct ask), one mystery Chester's Choice triple.
function applyWildcards(rounds: DrawnQuestion[][], categoryIds: number[], wild: NonNullable<TeamRoom['wild']>, asked: string[]) {
  const used = new Set([...asked, ...rounds.flat().map((q) => q.question)]);
  wild.flash.forEach((k) => {
    const [r, qi] = k.split('-').map(Number);
    const q = drawOne(BRAINBOX_ID, used);
    if (q) rounds[r][qi] = q;
  });
  if (wild.tripleKey) {
    const [r, qi] = wild.tripleKey.split('-').map(Number);
    const others = LOCAL_CATEGORIES.map((c) => c.id).filter((id) => !categoryIds.includes(id) && id !== BRAINBOX_ID);
    const cid = others[Math.floor(Math.random() * others.length)];
    const q = drawOne(cid, used);
    if (q) { rounds[r][qi] = q; wild.tripleCat = categoryName(cid); }
  }
}
const MAX_PLAYERS = 12;
const HOST_PLAYER_ID = 'HOST-DEVICE';
const MIN_PLAYERS = 4;

type GuestMsg =
  | { type: 'join'; pid: string; name: string }
  | { type: 'answer'; pid: string; teamIdx: number; choice: number }
  | { type: 'fifty'; pid: string; teamIdx: number }
  | { type: 'ping' };

function teamOf(room: TeamRoom | PublicTeamRoom, pid: string): number {
  return room.teams.findIndex((t) => t.playerIds.includes(pid));
}
function isCaptain(room: TeamRoom | PublicTeamRoom, pid: string): boolean {
  const t = teamOf(room, pid);
  return t >= 0 && room.teams[t].playerIds[0] === pid;
}

const CSS: any = {
  page: { minHeight: '100dvh', background: '#120b2e', color: '#fff', fontFamily: "'Nunito', system-ui, sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 16px 110px', overflowY: 'auto' as const, height: '100dvh', boxSizing: 'border-box' as const },
  card: { width: '100%', maxWidth: 430, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 18, padding: '18px 16px', marginTop: 14 },
  h1: { fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 34, letterSpacing: 1, margin: '10px 0 0', textAlign: 'center', color: '#ffd93b', textShadow: '0 3px 0 rgba(0,0,0,0.35)' },
  h2: { fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 24, margin: '0 0 8px', color: '#ffd93b' },
  chester: { display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%', maxWidth: 430, marginTop: 14, background: 'rgba(255,217,59,0.10)', border: '1px solid rgba(255,217,59,0.35)', borderRadius: 16, padding: '12px 14px', fontSize: 15, lineHeight: 1.4 },
  btn: { width: '100%', maxWidth: 430, marginTop: 14, padding: '16px 18px', borderRadius: 16, border: 'none', background: 'linear-gradient(180deg,#ffcf3d,#f5a623)', color: '#3a2400', fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 20, letterSpacing: 0.5, cursor: 'pointer', boxShadow: '0 4px 0 #a86e00' },
  btnGhost: { width: '100%', maxWidth: 430, marginTop: 10, padding: '12px 18px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: '#fff', fontFamily: "'Nunito', system-ui, sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  input: { width: '100%', padding: '14px 16px', borderRadius: 14, border: '2px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 18, fontFamily: "'Nunito', system-ui, sans-serif", boxSizing: 'border-box' },
  option: (state: 'idle' | 'picked' | 'right' | 'wrong' | 'dim'): React.CSSProperties => ({ width: '100%', padding: '15px 16px', borderRadius: 14, marginTop: 10, border: state === 'picked' ? '3px solid #ffd93b' : '2px solid rgba(255,255,255,0.2)', background: state === 'right' ? '#1e9e50' : state === 'wrong' ? '#c0392b' : state === 'picked' ? 'rgba(255,217,59,0.18)' : 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 17, fontWeight: 700, textAlign: 'left', cursor: state === 'idle' ? 'pointer' : 'default', opacity: state === 'dim' ? 0.55 : 1, fontFamily: "'Nunito', system-ui, sans-serif" }),
  pill: { display: 'inline-block', background: 'rgba(255,255,255,0.12)', borderRadius: 999, padding: '6px 14px', fontWeight: 800, fontSize: 15, margin: '4px 6px 0 0' },
  code: { fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 56, letterSpacing: 12, color: '#ffd93b', textAlign: 'center', margin: '6px 0', textShadow: '0 4px 0 rgba(0,0,0,0.4)' },
  teamBox: (i: number): React.CSSProperties => ({ borderRadius: 16, padding: '12px 14px', marginTop: 12, background: ['rgba(86,204,242,0.12)', 'rgba(255,107,107,0.12)', 'rgba(120,224,143,0.12)', 'rgba(255,180,84,0.12)'][i % 4], border: `2px solid ${['#56ccf2', '#ff6b6b', '#78e08f', '#ffb454'][i % 4]}` }),
  scoreRow: (lead: boolean): React.CSSProperties => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 14, marginTop: 10, background: lead ? 'rgba(255,217,59,0.16)' : 'rgba(255,255,255,0.06)', border: lead ? '2px solid #ffd93b' : '1px solid rgba(255,255,255,0.15)', fontSize: 17, fontWeight: 800 }),
};

function Chester({ children }: { children: React.ReactNode }) {
  return (
    <div style={CSS.chester}>
      <span style={{ fontSize: 26, lineHeight: 1 }}>♞</span>
      <div><b>Chester:</b> {children}</div>
    </div>
  );
}

function LobbyView({ room, isHost, onSort, onRemove, onJoinHost, onLeaveHost, hostName, setHostName, onExpected }: { room: PublicTeamRoom; isHost: boolean; onSort?: () => void; onRemove?: (pid: string) => void; onJoinHost?: (n: string) => void; onLeaveHost?: () => void; hostName?: string; setHostName?: (v: string) => void; onExpected?: (n: number) => void }) {
  return (
    <>
      <div style={CSS.card}>
        <div style={{ fontSize: 15, opacity: 0.85, marginBottom: 6 }}>{room.expected ? `${room.players.length} of ${room.expected} expected players in` : `Players in the room (${room.players.length}/${MAX_PLAYERS})`}{room.expected && room.players.length < room.expected ? ` - waiting on ${room.expected - room.players.length}` : room.expected ? ' - everyone is here!' : ''}</div>
        {room.players.map((p) => (
          <span key={p.id} style={CSS.pill}>{p.name}{isHost && onRemove ? <button onClick={() => onRemove(p.id)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ff9c9c', fontWeight: 900, cursor: 'pointer' }} aria-label={`Remove ${p.name}`}>x</button> : null}</span>
        ))}
        {!room.players.length && <div style={{ opacity: 0.7 }}>Waiting for players to join...</div>}
      </div>
      {isHost && onJoinHost && (
        <div style={{ ...CSS.card }}>
          <div style={{ fontSize: 15, opacity: 0.9, marginBottom: 6 }}>Playing too, host? Add yourself - you run the board, so your team's captain taps for you.</div>
          {!room.players.some((p) => p.id === HOST_PLAYER_ID) ? (
            <>
              <input style={CSS.input} placeholder="Your name (optional)" maxLength={16} value={hostName || ''} onChange={(e) => setHostName?.(e.target.value)} />
              <button style={{ ...CSS.btnGhost, opacity: (hostName || '').trim() ? 1 : 0.5 }} disabled={!(hostName || '').trim()} onClick={() => onJoinHost(hostName || '')}>JOIN AS A PLAYER</button>
            </>
          ) : (
            <button style={CSS.btnGhost} onClick={onLeaveHost}>You're in as {room.players.find((p) => p.id === HOST_PLAYER_ID)?.name} - tap to leave</button>
          )}
        </div>
      )}
      {isHost && onExpected && (
        <div style={{ ...CSS.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: 15, opacity: 0.9 }}>How many players tonight?</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{ ...CSS.btnGhost, width: 'auto', marginTop: 0, padding: '8px 14px' }} onClick={() => onExpected(Math.max(MIN_PLAYERS, (room.expected || MIN_PLAYERS) - 1))} aria-label="One fewer expected player">-</button>
            <span style={{ fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 24, color: '#ffd93b', minWidth: 28, textAlign: 'center' }}>{room.expected || MIN_PLAYERS}</span>
            <button style={{ ...CSS.btnGhost, width: 'auto', marginTop: 0, padding: '8px 14px' }} onClick={() => onExpected(Math.min(MAX_PLAYERS, (room.expected || MIN_PLAYERS) + 1))} aria-label="One more expected player">+</button>
          </div>
        </div>
      )}
      {isHost && (
        <button style={{ ...CSS.btn, opacity: room.players.length >= MIN_PLAYERS ? 1 : 0.5 }} disabled={room.players.length < MIN_PLAYERS} onClick={onSort}>
          {room.expected && room.players.length < room.expected ? `SORT ANYWAY (${room.expected - room.players.length} MISSING)` : 'SORT INTO TEAMS'}
        </button>
      )}
      {isHost && room.players.length < MIN_PLAYERS && <div style={{ marginTop: 8, fontSize: 14, opacity: 0.75 }}>Need at least {MIN_PLAYERS} players for teams.</div>}
    </>
  );
}

function SortingView({ room }: { room: PublicTeamRoom }) {
  const names = room.players.map((p) => p.name);
  return (
    <div style={{ ...CSS.card, width: '100%', maxWidth: 430, boxSizing: 'border-box', textAlign: 'center' }}>
      <div style={{ fontSize: 54 }}>🎲</div>
      <div style={CSS.h1}>SHUFFLING...</div>
      <div style={{ fontSize: 16, opacity: 0.9, minHeight: 28 }}>
        <span key={Math.floor(Date.now() / 300)} style={{ fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 22, color: '#ffd93b' }}>{names.length ? names[Math.floor(Date.now() / 300) % names.length] : ''}</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 14, opacity: 0.75 }}>Teams, captains and names land together in a moment...</div>
      <style>{`@keyframes ctShake{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}`}</style>
    </div>
  );
}

function TeamsView({ room, isHost, onNext }: { room: PublicTeamRoom; isHost: boolean; onNext?: () => void }) {
  return (
    <>
      {room.teams.map((t, i) => (
        <div key={t.name} style={{ ...CSS.teamBox(i), width: '100%', maxWidth: 430, boxSizing: 'border-box' }}>
          <div style={{ fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 21 }}>{t.name}</div>
          <div style={{ marginTop: 6, fontSize: 16 }}>
            {t.playerIds.map((pid, j) => {
              const p = room.players.find((pl) => pl.id === pid);
              return <span key={pid} style={CSS.pill}>{j === 0 ? '★ ' : ''}{p?.name || '?'}</span>;
            })}
          </div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>★ captain taps the answers - everyone else huddles</div>
        </div>
      ))}
      {isHost && <button style={CSS.btn} onClick={onNext}>MEET TONIGHT'S CATEGORIES</button>}
    </>
  );
}

function CategoriesView({ room, isHost, onNext }: { room: PublicTeamRoom; isHost: boolean; onNext?: () => void }) {
  return (
    <div style={CSS.card}>
      <div style={CSS.h2}>Tonight's 5 rounds</div>
      {room.categoryIds.map((cid, i) => (
        <div key={cid} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 4px', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.1)' : 'none', fontSize: 18, fontWeight: 800 }}>
          <span style={{ fontFamily: "'Lilita One', system-ui, sans-serif", color: '#ffd93b', width: 26 }}>{i + 1}</span>
          {displayCategory(cid)}
        </div>
      ))}
      {isHost && <button style={CSS.btn} onClick={onNext}>START ROUND 1</button>}
    </div>
  );
}

function QuestionView({ room, pid, isHost, secondsLeft, onAnswer, onReveal, onFifty }: { room: PublicTeamRoom; pid: string | null; isHost: boolean; secondsLeft: number; onAnswer?: (choice: number) => void; onReveal?: () => void; onFifty?: () => void }) {
  const myTeam = pid ? teamOf(room, pid) : -1;
  const captain = pid ? isCaptain(room, pid) : false;
  const answered = pid && myTeam >= 0 ? room.answers[myTeam] : false;
  const kind = room.suddenDeath ? null : wildKind(room.wild, room.round, room.qIndex);
  const hidden = myTeam >= 0 ? (room.wild?.fiftyHidden?.[myTeam] || []) : [];
  const canFifty = captain && !answered && !room.suddenDeath && !!room.wild && !room.wild.fiftyUsed?.[myTeam];
  const tiedNames = room.suddenDeath ? room.suddenDeath.tied.map((i) => room.teams[i]?.name).join(' vs ') : '';
  return (
    <>
      <div style={{ ...CSS.card, textAlign: 'center' }}>
        <div style={{ fontSize: 14, opacity: 0.85 }}>{room.suddenDeath ? `SUDDEN DEATH - ${tiedNames} - first ahead wins` : `Round ${room.round + 1} of 5 - ${kind === 'triple' ? "CHESTER'S CHOICE ???" : displayCategory(room.categoryIds[room.round])} - Question ${room.qIndex + 1} of 5`}</div>
        {kind && <div style={{ marginTop: 6, display: 'inline-block', padding: '4px 14px', borderRadius: 999, background: kind === 'flash' ? 'rgba(155,89,255,0.25)' : 'rgba(255,217,59,0.2)', border: `2px solid ${kind === 'flash' ? '#9b59ff' : '#ffd93b'}`, fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 18, color: kind === 'flash' ? '#c9a4ff' : '#ffd93b' }}>{kind === 'double' ? '⭐ DOUBLE POINTS!' : kind === 'triple' ? "❓ CHESTER'S CHOICE - TRIPLE POINTS!" : '🧩 WILDCARD RIDDLE!'}</div>}
        <div style={{ fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 42, color: secondsLeft <= 5 ? '#ff6b6b' : '#ffd93b', marginTop: 4 }}>{secondsLeft}</div>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.35, marginTop: 8 }}>{room.current?.question}</div>
        <div style={{ marginTop: 10, fontSize: 14, opacity: 0.9 }}>
          {room.teams.map((t, i) => <span key={t.name} style={{ ...CSS.pill, background: room.answers[i] ? 'rgba(120,224,143,0.25)' : 'rgba(255,255,255,0.1)' }}>{t.name} {room.answers[i] ? 'locked in' : 'huddling...'}</span>)}
        </div>
      </div>
      <div style={{ width: '100%', maxWidth: 430 }}>
        {room.current?.options.map((opt, i) => {
          if (hidden.includes(i)) return <button key={i} style={{ ...CSS.option('dim'), opacity: 0.35, fontStyle: 'italic' }} disabled>— gone —</button>;
          return (
            <button key={i} style={CSS.option((!captain || answered) ? 'dim' : 'idle')} disabled={!captain || answered} onClick={() => onAnswer?.(i)}>
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          );
        })}
        {canFifty && <button style={{ ...CSS.btnGhost, borderColor: '#9b59ff', color: '#c9a4ff' }} onClick={onFifty}>🍸 FIFTY-FIFTY - bin two wrong answers (once a night)</button>}
        {!isHost && pid && !captain && myTeam >= 0 && <div style={{ marginTop: 10, textAlign: 'center', fontSize: 14, opacity: 0.85 }}>Huddle! Your captain ★ taps the answer.</div>}
        {isHost && <button style={CSS.btn} onClick={onReveal}>REVEAL ANSWER</button>}
      </div>
    </>
  );
}

function RevealView({ room, isHost, onNext, demo }: { room: PublicTeamRoom; isHost: boolean; onNext?: () => void; demo?: boolean }) {
  const reveal = room.reveal;
  if (!reveal || !room.current) return null;
  return (
    <>
      <div style={{ ...CSS.card, textAlign: 'center' }}>
        <div style={{ fontSize: 16, opacity: 0.9 }}>{room.current.question}</div>
        <div style={{ fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 26, color: '#78e08f', marginTop: 8 }}>{room.current.options[reveal.correctIndex]}</div>
      </div>
      <div style={{ width: '100%', maxWidth: 430 }}>
        {room.teams.map((t, i) => {
          const r = reveal.perTeam.find((x) => x.teamIdx === i);
          const captainName = room.players.find((pl) => pl.id === t.playerIds[0])?.name || 'Captain';
          const pts = r?.correct ? wildPoints(room.suddenDeath ? null : wildKind(room.wild, room.round, room.qIndex)) : 0;
          return (
            <div key={t.name} style={CSS.scoreRow(!!r?.correct)}>
              <span>{r?.correct ? '✅' : '❌'} {t.name}{r?.correct && pts > 1 ? ` (+${pts})` : ''}</span>
              <span>{r?.picked === null || r?.picked === undefined ? `★ ${captainName} passed` : `★ ${captainName} locked in: ${room.current!.options[r.picked]}`}</span>
            </div>
          );
        })}
      </div>
      {isHost && <button style={CSS.btn} onClick={onNext}>{demo ? 'SEE THE SCOREBOARD' : room.qIndex >= 4 ? 'TEAM SCOREBOARD' : 'NEXT QUESTION'}</button>}
    </>
  );
}

function rankRows(teams: { name: string; score: number; roundScores: number[]; playerIds: string[] }[]) {
  const order = teams.map((t, i) => ({ t, i })).sort((a, b) => b.t.score - a.t.score);
  const top = order[0]?.t.score;
  const tiedTop = order.filter((x) => x.t.score === top).length > 1;
  let lastScore: number | null = null;
  let lastRank = 0;
  return order.map(({ t, i }, idx) => {
    const rank = t.score === lastScore ? lastRank : idx + 1;
    lastScore = t.score; lastRank = rank;
    return { t, i, rank, soleLeader: rank === 1 && !tiedTop };
  });
}

function ScoreboardView({ room, isHost, onNext, demo }: { room: PublicTeamRoom; isHost: boolean; onNext?: () => void; demo?: boolean }) {
  const rows = rankRows(room.teams);
  return (
    <div style={{ ...CSS.card, width: '100%', maxWidth: 430, boxSizing: 'border-box' }}>
      <div style={CSS.h2}>Scoreboard after round {room.round + 1}</div>
      {rows.map(({ t, rank, soleLeader }) => (
        <div key={t.name} style={CSS.scoreRow(soleLeader)}>
          <span>{soleLeader ? '👑 ' : `${rank}. `}{t.name}</span>
          <span>{t.score} pts <span style={{ opacity: 0.7, fontWeight: 600, fontSize: 14 }}>(+{t.roundScores[room.round] ?? 0})</span></span>
        </div>
      ))}
      {isHost && <button style={CSS.btn} onClick={onNext}>{demo ? 'WRAP UP THE DEMO' : room.round >= 4 ? 'FINAL RESULTS' : `START ROUND ${room.round + 2}`}</button>}
    </div>
  );
}

function FinalView({ room, isHost, onAgain }: { room: PublicTeamRoom; isHost: boolean; onAgain?: () => void }) {
  const rows = rankRows(room.teams);
  const tied = rows.filter((r) => r.rank === 1).length > 1;
  const winners = rows.filter((r) => r.rank === 1).map((r) => r.t.name);
  return (
    <div style={{ ...CSS.card, width: '100%', maxWidth: 430, boxSizing: 'border-box', textAlign: 'center' }}>
      <div style={{ fontSize: 54 }}>{tied ? '🤝' : '🏆'}</div>
      <div style={CSS.h1}>{tied ? "IT'S A TIE!" : `${winners[0]} WIN!`}</div>
      {rows.map(({ t, rank, soleLeader }) => (
        <div key={t.name} style={CSS.scoreRow(soleLeader || (tied && rank === 1))}>
          <span>{soleLeader ? '👑 ' : `${rank}. `}{t.name}</span><span>{t.score} pts</span>
        </div>
      ))}
      {isHost && <button style={CSS.btn} onClick={onAgain}>PLAY AGAIN - NEW TEAMS</button>}
    </div>
  );
}

function TeamTriviaInner() {
  const params = useSearchParams();
  const router = useRouter();
  const joinCode = (params.get('room') || '').toUpperCase();
  const isDemo = params.get('demo') === '1';

  const [role, setRole] = useState<'choose' | 'host' | 'guest'>(joinCode ? 'guest' : 'choose');
  const [demoSeeded, setDemoSeeded] = useState(false);
  const [room, setRoom] = useState<TeamRoom | null>(null);        // host: full room
  const [view, setView] = useState<PublicTeamRoom | null>(null);  // guest: public view
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [shareMsg, setShareMsg] = useState('');
  const [hostName, setHostName] = useState('');

  const pidRef = useRef<string>('');
  if (!pidRef.current) pidRef.current = typeof window !== 'undefined' ? (sessionStorage.getItem('ct-teams-pid') || (() => { const v = uid(); sessionStorage.setItem('ct-teams-pid', v); return v; })()) : uid();

  const peerRef = useRef<any>(null);
  const linksRef = useRef<Map<string, any>>(new Map()); // host: pid -> conn
  const guestLinkRef = useRef<any>(null);
  const roomRef = useRef<TeamRoom | null>(null);
  const demoRef = useRef(false);
  demoRef.current = isDemo;
  const roundsRef = useRef<DrawnQuestion[][] | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  roomRef.current = room;

  // ---------- HOST ----------
  const broadcast = useCallback((r: TeamRoom) => {
    const pub = publicView(r, roundsRef.current);
    for (const link of linksRef.current.values()) { try { link.send({ type: 'room', room: pub }); } catch { /* gone */ } }
  }, []);

  const setHostRoom = useCallback((r: TeamRoom) => {
    const stamped = { ...r, updatedAt: Date.now() };
    setRoom(stamped);
    broadcast(stamped);
  }, [broadcast]);

  const clearTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const startQuestionTimer = useCallback((r: TeamRoom) => {
    clearTimer();
    let left = QUESTION_SECONDS;
    setSecondsLeft(left);
    timerRef.current = setInterval(() => {
      left -= 1;
      setSecondsLeft(left);
      if (left <= 0) { clearTimer(); hostReveal(); }
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hostReveal = useCallback((base?: TeamRoom) => {
    const r = base || roomRef.current;
    if (!r || r.phase !== 'question') return;
    clearTimer();
    const q = roundsRef.current?.[r.round]?.[r.qIndex];
    const kind = r.suddenDeath ? null : wildKind(r.wild, r.round, r.qIndex);
    const pts = wildPoints(kind);
    const teams = r.teams.map((t, i) => {
      const picked = r.answers[i] ?? null;
      const right = picked !== null && picked === q?.correctIndex;
      const roundScores = [...t.roundScores];
      if (right) { roundScores[r.round] = (roundScores[r.round] ?? 0) + pts; }
      return { ...t, score: t.score + (right ? pts : 0), roundScores };
    });
    const anyRight = teams.some((t, i) => (r.answers[i] ?? null) === q?.correctIndex);
    const catNote = kind === 'triple' && r.wild?.tripleCat ? ` It was ${r.wild.tripleCat} all along - and it pays TRIPLE!` : kind === 'double' ? ' That one was worth DOUBLE!' : '';
    setHostRoom({ ...r, teams, phase: 'reveal', hostLine: (anyRight ? line(LINES.REVEAL_RIGHT) : line(LINES.REVEAL_WRONG)) + catNote });
  }, [setHostRoom]);

  const hostApply = useCallback((msg: GuestMsg, link: any) => {
    const r = roomRef.current;
    if (!r) return;
    if (msg.type === 'ping') { try { link?.send({ type: 'pong' }); } catch { /* gone */ } return; }
    if (msg.type === 'join') {
      if (r.phase !== 'lobby') {
        // Rejoin or late arrival: known pid rejoins any phase; new player only in lobby
        if (!r.players.some((p) => p.id === msg.pid)) { try { link?.send({ type: 'guest-error', message: 'This quiz has already started - grab Chester for the next one!' }); } catch { /* gone */ } return; }
        broadcast(r);
        return;
      }
      const clean = (msg.name || '').trim().slice(0, 16) || `Player ${r.players.length + 1}`;
      if (r.players.some((p) => p.id === msg.pid)) { broadcast(r); return; }
      if (r.players.length >= MAX_PLAYERS) { try { link?.send({ type: 'guest-error', message: 'This quiz is full (12 players max) - next round!' }); } catch { /* gone */ } return; }
      linksRef.current.set(msg.pid, link);
      setHostRoom({ ...r, players: [...r.players, { id: msg.pid, name: clean }] });
      return;
    }
    if (msg.type === 'fifty') {
      // Fifty-Fifty: once per team per night, captain only, before they answer.
      if (r.phase !== 'question' || r.suddenDeath) return;
      const t = teamOf(r, msg.pid);
      if (t < 0 || t !== msg.teamIdx || !isCaptain(r, msg.pid)) return;
      const wild = r.wild; if (!wild || wild.fiftyUsed[t]) return;
      if ((r.answers[t] ?? null) !== null) return;
      const q = roundsRef.current?.[r.round]?.[r.qIndex]; if (!q) return;
      const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correctIndex).sort(() => Math.random() - 0.5).slice(0, 2);
      const nextWild = { ...wild, fiftyUsed: { ...wild.fiftyUsed, [t]: true }, fiftyHidden: { ...wild.fiftyHidden, [t]: wrong } };
      setHostRoom({ ...r, wild: nextWild, hostLine: `${r.teams[t]?.name} played their Fifty-Fifty - two wrong answers are gone!` });
      return;
    }
    if (msg.type === 'answer') {
      if (r.phase !== 'question') return;
      const t = teamOf(r, msg.pid);
      if (t < 0 || t !== msg.teamIdx) return;
      if (!isCaptain(r, msg.pid)) return;
      if (r.suddenDeath && !r.suddenDeath.tied.includes(t)) return;
      if ((r.answers[t] ?? null) !== null) return;
      const next = { ...r, answers: { ...r.answers, [t]: msg.choice } };
      setHostRoom(next);
      // All (tied, in sudden death) teams locked in? Reveal early - score from `next`, not the stale ref.
      const eligible = next.suddenDeath ? next.suddenDeath.tied : next.teams.map((_, i) => i);
      if (eligible.every((i) => (next.answers[i] ?? null) !== null)) hostReveal(next);
      return;
    }
  }, [broadcast, hostReveal, setHostRoom]);

  const startHost = useCallback(async () => {
    setError('');
    const code = roomCode();
    try {
      const { default: Peer } = await import('peerjs');
      const peer = new Peer(`ct-teams-${code}`, PEER_CONFIG as any);
      peerRef.current = peer;
      peer.on('open', () => {
        const r = freshRoom(code);
        setRoom(r);
        setRole('host');
      });
      peer.on('connection', (link: any) => {
        link.on('data', (msg: GuestMsg) => hostApply(msg, link));
        link.on('close', () => { /* keep player - they may reconnect */ });
        link.on('error', () => { /* drop */ });
      });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch { /* dropped */ } });
      peer.on('error', (e: any) => {
        if (e?.type === 'unavailable-id') { setError('That room code collided - tap Host again.'); peer.destroy(); }
        else setError('Connection hiccup - check wifi and keep this tab open.');
      });
    } catch (e) {
      setError('Could not start the quiz room. Check your connection and try again.');
    }
  }, [hostApply]);

  // ---------- HOST flow actions ----------
  const hostSort = () => {
    const r = roomRef.current; if (!r) return;
    // Drumroll first: everyone watches the shuffle, then teams land together.
    setHostRoom({ ...r, phase: 'sorting', hostLine: 'Drumroll... Chester is shuffling the room!' });
    setTimeout(() => {
      const cur = roomRef.current; if (!cur || cur.phase !== 'sorting') return;
      // The host device runs the reveal controls, so a host who plays never captains:
      // move them to the back of their team so a phone-holding teammate taps answers.
      const teams = sortIntoTeams(cur.players).map((t) => {
        const i = t.playerIds.indexOf(HOST_PLAYER_ID);
        if (i === 0 && t.playerIds.length > 1) return { ...t, playerIds: [...t.playerIds.slice(1), t.playerIds[0]] };
        return t;
      });
      setHostRoom({ ...cur, phase: 'teams', teams, hostLine: line(LINES.TEAM_LINES) });
    }, 4500);
  };
  const hostShowCategories = () => {
    const r = roomRef.current; if (!r) return;
    const categoryIds = pickCategories(5);
    roundsRef.current = drawRounds(categoryIds, 5, r.asked);
    const wild = planWild();
    if (demoRef.current) { // demo's single question shows the DOUBLE POINTS badge
      wild.doubles = [qkey(0, 0), wild.doubles.find((k) => k !== qkey(0, 0)) || qkey(4, 4)];
      wild.flash = wild.flash.filter((k) => k !== qkey(0, 0));
      if (wild.tripleKey === qkey(0, 0)) wild.tripleKey = null;
    }
    applyWildcards(roundsRef.current, categoryIds, wild, r.asked);
    setHostRoom({ ...r, phase: 'categories', categoryIds, wild, suddenDeath: null });
  };
  const hostStartRound = (roundIdx: number) => {
    const r = roomRef.current; if (!r) return;
    const next: TeamRoom = { ...r, phase: 'question', round: roundIdx, qIndex: 0, answers: {}, hostLine: line(LINES.ROUND_LINES, { n: String(roundIdx + 1), cat: displayCategory(r.categoryIds[roundIdx]) }) };
    setHostRoom(next);
    startQuestionTimer(next);
  };
  const hostNextAfterReveal = () => {
    const r = roomRef.current; if (!r) return;
    if (r.suddenDeath) {
      const q = roundsRef.current?.[5]?.[r.qIndex];
      const winners = r.suddenDeath.tied.filter((i) => (r.answers[i] ?? null) === q?.correctIndex);
      if (winners.length === 1) { setHostRoom({ ...r, phase: 'final', hostLine: `${r.teams[winners[0]]?.name} steal it in sudden death! What a finish!` }); return; }
      const used = new Set<string>([...r.asked, ...(roundsRef.current || []).flat().map((x) => x.question)]);
      const cid = r.categoryIds[Math.floor(Math.random() * r.categoryIds.length)];
      const q2 = drawOne(cid, used);
      if (!q2) { setHostRoom({ ...r, phase: 'final', suddenDeath: null, hostLine: 'Honours even - share the trophy and the trifle!' }); return; }
      roundsRef.current![5].push(q2);
      const next: TeamRoom = { ...r, phase: 'question', qIndex: r.qIndex + 1, answers: {}, hostLine: winners.length > 1 ? 'Still level! Sudden death continues...' : 'Nobody had it! Another sudden-death question...' };
      setHostRoom(next);
      startQuestionTimer(next);
      return;
    }
    if (r.qIndex >= 4 || demoRef.current) {
      const sorted = [...r.teams].sort((a, b) => b.score - a.score);
      const leader = sorted[0];
      const tied = sorted.length > 1 && sorted[1].score === leader?.score;
      const hostLine = tied
        ? `Scores after round ${r.round + 1}: dead level at the top. Nothing in it.`
        : line(LINES.SCORE_LINES, { n: String(r.round + 1), leader: leader?.name || 'Nobody' });
      setHostRoom({ ...r, phase: 'scoreboard', hostLine });
      return;
    }
    const next = { ...r, phase: 'question' as const, qIndex: r.qIndex + 1, answers: {}, hostLine: '' };
    setHostRoom(next);
    startQuestionTimer(next);
  };
  const hostStartSuddenDeath = (r: TeamRoom, tied: number[]) => {
    const used = new Set<string>([...r.asked, ...(roundsRef.current || []).flat().map((q) => q.question)]);
    const cid = r.categoryIds[Math.floor(Math.random() * r.categoryIds.length)];
    const q = drawOne(cid, used);
    if (!q) { setHostRoom({ ...r, phase: 'final', suddenDeath: null, hostLine: 'What a quiz! Give the winners a huge cheer - and the losers a drink.' }); return; }
    if (!roundsRef.current) roundsRef.current = [];
    roundsRef.current[5] = [q];
    const next: TeamRoom = { ...r, phase: 'question', round: 5, qIndex: 0, answers: {}, suddenDeath: { tied }, hostLine: `DEAD LEVEL! Sudden death between ${tied.map((i) => r.teams[i]?.name).join(' and ')} - first team to pull ahead takes the night!` };
    setHostRoom(next);
    startQuestionTimer(next);
  };
  const hostNextAfterScore = () => {
    const r = roomRef.current; if (!r) return;
    if (demoRef.current || r.round >= 4) {
      if (!demoRef.current) {
        const top = Math.max(...r.teams.map((t) => t.score));
        const tied = r.teams.map((t, i) => (t.score === top ? i : -1)).filter((i) => i >= 0);
        if (tied.length > 1) { hostStartSuddenDeath(r, tied); return; }
      }
      setHostRoom({ ...r, phase: 'final', hostLine: demoRef.current ? 'And that is how a quiz night flows! Host a real room to play for keeps.' : 'What a quiz! Give the winners a huge cheer - and the losers a drink.' });
      return;
    }
    hostStartRound(r.round + 1);
  };
  const hostAgain = () => {
    const r = roomRef.current; if (!r) return;
    const asked = [...r.asked];
    roundsRef.current?.flat().forEach((q) => asked.push(q.question));
    roundsRef.current = null;
    setHostRoom({ ...freshRoom(r.code), players: r.players, expected: r.expected, asked, hostLine: demoRef.current ? 'Demo reset - same pretend crowd, fresh teams!' : 'Same legends, fresh teams! Sorting when you are ready.' });
  };
  const hostJoinAsPlayer = (hostName: string) => {
    const r = roomRef.current; if (!r || r.phase !== 'lobby') return;
    if (r.players.some((p) => p.id === HOST_PLAYER_ID)) return;
    if (r.players.length >= MAX_PLAYERS) return;
    setHostRoom({ ...r, players: [...r.players, { id: HOST_PLAYER_ID, name: hostName.trim().slice(0, 16) || 'Host' }] });
  };
  const hostLeaveAsPlayer = () => {
    const r = roomRef.current; if (!r || r.phase !== 'lobby') return;
    setHostRoom({ ...r, players: r.players.filter((p) => p.id !== HOST_PLAYER_ID) });
  };
  // Fallback: the sort always moves the host behind a teammate, but if the host
  // is ever their team's captain, they can answer here without losing host controls.
  const hostAnswer = (choice: number) => {
    const r = roomRef.current; if (!r) return;
    hostApply({ type: 'answer', pid: HOST_PLAYER_ID, teamIdx: teamOf(r, HOST_PLAYER_ID), choice }, null);
  };
  const hostRemove = (pid: string) => {
    const r = roomRef.current; if (!r || r.phase !== 'lobby') return;
    setHostRoom({ ...r, players: r.players.filter((p) => p.id !== pid) });
  };

  // ---------- GUEST ----------
  const startGuest = useCallback(async () => {
    setError('');
    try {
      const { default: Peer } = await import('peerjs');
      const peer = new Peer(PEER_CONFIG as any);
      peerRef.current = peer;
      const attach = () => {
        const link = peer.connect(`ct-teams-${joinCode}`, { reliable: true });
        guestLinkRef.current = link;
        link.on('open', () => {
          link.send({ type: 'join', pid: pidRef.current, name });
        });
        link.on('data', (msg: any) => {
          if (msg?.type === 'room') setView(msg.room as PublicTeamRoom);
          if (msg?.type === 'guest-error') setError(String(msg.message || 'Could not join that quiz.'));
          if (msg?.type === 'ping') { try { link.send({ type: 'pong' }); } catch { /* gone */ } }
        });
        link.on('close', () => setError('Lost the quiz room - keep this tab open, retrying...'));
      };
      peer.on('open', attach);
      peer.on('disconnected', () => { try { peer.reconnect(); } catch { /* dropped */ } });
      peer.on('error', (e: any) => {
        if (e?.type === 'peer-unavailable') setError(`No quiz found with code ${joinCode} - check the code on the host's screen.`);
        else if (e?.type !== 'network') setError('Connection hiccup - retrying...');
      });
    } catch {
      setError('Could not reach the quiz room. Check your connection and try again.');
    }
  }, [joinCode, name]);

  const guestFifty = () => {
    if (!view || pidRef.current == null) return;
    const t = teamOf(view, pidRef.current);
    if (t < 0) return;
    try { guestLinkRef.current?.send({ type: 'fifty', pid: pidRef.current, teamIdx: t }); } catch { /* gone */ }
  };

  const guestAnswer = (choice: number) => {
    if (!view || pidRef.current == null) return;
    const t = teamOf(view, pidRef.current);
    if (t < 0) return;
    try { guestLinkRef.current?.send({ type: 'answer', pid: pidRef.current, teamIdx: t, choice }); } catch { /* gone */ }
    setView({ ...view, answers: { ...view.answers, [t]: true } });
  };

  // Share link
  const shareUrl = typeof window !== 'undefined' && room ? `${window.location.origin}/trivia-teams?room=${room.code}` : '';
  const doShare = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'Team Trivia with Chester', text: `Join my quiz - code ${room?.code}`, url: shareUrl }); return; }
      await navigator.clipboard.writeText(shareUrl);
      setShareMsg('Link copied - send it to everyone!');
      setTimeout(() => setShareMsg(''), 2500);
    } catch {
      try { await navigator.clipboard.writeText(shareUrl); setShareMsg('Link copied - send it to everyone!'); setTimeout(() => setShareMsg(''), 2500); } catch { setShareMsg(shareUrl); }
    }
  };

  // Guest-side countdown mirror: host is authoritative; this is display-only.
  useEffect(() => {
    if (role !== 'guest' || view?.phase !== 'question') return;
    setSecondsLeft(QUESTION_SECONDS);
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [role, view?.phase, view?.round, view?.qIndex]);

  useEffect(() => () => { clearTimer(); try { peerRef.current?.destroy(); } catch { /* gone */ } }, []);

  // Demo mode: pretend players answer on their own so the walkthrough flows.
  useEffect(() => {
    if (!isDemo || room?.phase !== 'question') return;
    const t = setTimeout(() => {
      const r = roomRef.current; if (!r || r.phase !== 'question') return;
      const answers: Record<number, number | null> = {};
      const eligible = r.suddenDeath ? r.suddenDeath.tied : r.teams.map((_, i) => i);
      eligible.forEach((i) => { answers[i] = Math.floor(Math.random() * 4); });
      setHostRoom({ ...r, answers, hostLine: 'Huddles are locking in...' });
    }, 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, room?.phase, room?.round, room?.qIndex]);

  // ---------- RENDER ----------
  const shown: PublicTeamRoom | null = role === 'host' && room ? publicView(room, roundsRef.current) : view;
  const isHost = role === 'host';
  const pid = pidRef.current;

  let body: React.ReactNode = null;

  if (role === 'choose') {
    body = (
      <div style={CSS.card}>
        <div style={CSS.h2}>Team Trivia</div>
        <p style={{ margin: '6px 0 0', fontSize: 16, lineHeight: 1.5 }}>One phone hosts, everyone else joins on theirs. Random teams, five rounds, Chester in charge of the mic.</p>
        <button style={CSS.btn} onClick={startHost}>HOST A QUIZ</button>
        <button style={CSS.btnGhost} onClick={() => {
          setDemoSeeded(true);
          setRole('host');
          setRoom({ ...freshRoom('DEMO'), expected: 8, players: ['Jemma', 'Alfie', 'Grandma Pat', 'Uncle Rob', 'Sophie', 'Grandad Joe', 'Maisie', 'Tom'].map((n, i) => ({ id: `demo-${i}`, name: n })), hostLine: 'Demo night! Pretend players, and tonight\'s real game has wildcards: DOUBLE POINTS flashes, a mystery Chester\'s Choice triple, riddles, one Fifty-Fifty per team - only captains tap.' });
        }}>WATCH A DEMO (pretend players)</button>
        <button style={CSS.btnGhost} onClick={() => router.push('/trivia')}>Back to trivia menu</button>
      </div>
    );
  } else if (role === 'guest' && !agreed) {
    body = (
      <div style={CSS.card}>
        <div style={CSS.h2}>You're in for Team Trivia!</div>
        <Chester>You've been invited to quiz night - I'll be your host, Chester. Teams get sorted at random, your captain taps the answers, and googling is a crime against fun. Ready?</Chester>
        <input style={CSS.input} placeholder="Your name" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />
        <button style={{ ...CSS.btn, opacity: name.trim() ? 1 : 0.5 }} disabled={!name.trim()} onClick={() => { setAgreed(true); startGuest(); }}>LET'S PLAY</button>
        {error && <div style={{ marginTop: 10, color: '#ffb0b0', fontWeight: 700 }}>{error}</div>}
      </div>
    );
  } else if (isHost && room) {
    body = (
      <>
        {isDemo && <div style={{ ...CSS.card, border: '2px dashed #ffd93b', textAlign: 'center', fontFamily: "'Lilita One', system-ui, sans-serif", color: '#ffd93b' }}>DEMO - pretend players, nothing here is live</div>}
        {!isDemo && (room.phase === 'lobby' || room.phase === 'teams') ? (
          <div style={CSS.card}>
            <div style={{ fontSize: 15, opacity: 0.85, textAlign: 'center' }}>Everyone joins on their phone at</div>
            <div style={{ ...CSS.code, fontSize: 22, letterSpacing: 2, wordBreak: 'break-all' }}>{shareUrl.replace('https://', '')}</div>
            <div style={{ textAlign: 'center', fontSize: 14, opacity: 0.85 }}>or enter the code</div>
            <div style={CSS.code}>{room.code}</div>
            <button style={CSS.btnGhost} onClick={doShare}>SHARE INVITE LINK</button>
            {shareMsg && <div style={{ textAlign: 'center', marginTop: 8, color: '#78e08f', fontWeight: 800 }}>{shareMsg}</div>}
          </div>
        ) : (
          (!isDemo && <div style={{ marginTop: 10, fontSize: 14, opacity: 0.75 }}>Room code <b style={{ letterSpacing: 2 }}>{room.code}</b> - <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={doShare}>{shareMsg || 'share link'}</span></div>)
        )}
        {room.phase === 'lobby' && <LobbyView room={shown!} isHost onSort={hostSort} onRemove={hostRemove} onJoinHost={hostJoinAsPlayer} onLeaveHost={hostLeaveAsPlayer} hostName={hostName} setHostName={setHostName} onExpected={(n) => { const r = roomRef.current; if (r && r.phase === 'lobby') setHostRoom({ ...r, expected: n }); }} />}
        {room.phase === 'sorting' && <SortingView room={shown!} />}
        {room.phase === 'teams' && <TeamsView room={shown!} isHost onNext={hostShowCategories} />}
        {room.phase === 'categories' && <CategoriesView room={shown!} isHost onNext={() => hostStartRound(0)} />}
        {room.phase === 'question' && <QuestionView room={shown!} pid={room.players.some((p) => p.id === HOST_PLAYER_ID) ? HOST_PLAYER_ID : null} isHost secondsLeft={secondsLeft} onReveal={() => hostReveal()} onAnswer={hostAnswer} onFifty={() => hostApply({ type: 'fifty', pid: HOST_PLAYER_ID, teamIdx: teamOf(room, HOST_PLAYER_ID) }, null)} />}
        {room.phase === 'reveal' && <RevealView room={shown!} isHost onNext={hostNextAfterReveal} demo={isDemo} />}
        {room.phase === 'scoreboard' && <ScoreboardView room={shown!} isHost onNext={hostNextAfterScore} demo={isDemo} />}
        {room.phase === 'final' && <FinalView room={shown!} isHost onAgain={hostAgain} />}
      </>
    );
  } else if (role === 'guest' && shown) {
    body = (
      <>
        {shown.phase === 'lobby' && (
          <div style={CSS.card}>
            <div style={CSS.h2}>You're in, {shown.players.find((p) => p.id === pid)?.name || 'quizzer'}!</div>
            <p style={{ margin: 0, fontSize: 16 }}>The host will sort teams once everyone's here. Stand by...</p>
            <LobbyView room={shown} isHost={false} />
          </div>
        )}
        {shown.phase === 'sorting' && <SortingView room={shown} />}
        {shown.phase === 'teams' && <TeamsView room={shown} isHost={false} />}
        {shown.phase === 'categories' && <CategoriesView room={shown} isHost={false} />}
        {shown.phase === 'question' && <QuestionView room={shown} pid={pid} isHost={false} secondsLeft={secondsLeft} onAnswer={guestAnswer} onFifty={guestFifty} />}
        {shown.phase === 'reveal' && <RevealView room={shown} isHost={false} />}
        {shown.phase === 'scoreboard' && <ScoreboardView room={shown} isHost={false} />}
        {shown.phase === 'final' && <FinalView room={shown} isHost={false} />}
      </>
    );
  } else {
    body = <div style={CSS.card}><div style={CSS.h2}>Connecting...</div>{error && <div style={{ marginTop: 8, color: '#ffb0b0', fontWeight: 700 }}>{error}</div>}</div>;
  }

  return (
    <div style={CSS.page}>
      <div style={{ fontFamily: "'Lilita One', system-ui, sans-serif", fontSize: 15, letterSpacing: 2, opacity: 0.7, marginTop: 6 }}>GAMES FOR ALL</div>
      <div style={CSS.h1}>TEAM TRIVIA</div>
      {shown && <Chester>{shown.hostLine || 'Welcome!'}</Chester>}
      {body}
      {error && agreed && <div style={{ marginTop: 10, color: '#ffb0b0', fontWeight: 700, maxWidth: 430 }}>{error}</div>}
    </div>
  );
}

function displayCategory(id: number): string {
  return categoryName(id).replace(/^[^A-Za-z0-9]+/, '');
}

export default function TeamTriviaPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#120b2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>Setting the table...</div>}>
      <TeamTriviaInner />
    </Suspense>
  );
}
