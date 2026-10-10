'use client';
import { useState } from 'react';
import type { State, PID, Intent } from '@/lib/game';
import { BY_ID } from '@/lib/game';
import OrsonDecree, { type StageId } from './OrsonDecree';
import WildcardDock from './WildcardDock';

export const STAGE_OF = (phase: State['phase']): StageId | null => (phase === 'vibe' ? 'mood' : phase === 'draft' ? 'scene' : phase === 'hitlist' || phase === 'bracket' ? 'tournament' : null);
const CW: Record<StageId, string> = { mood: 'cw-discovery', scene: 'cw-curiosity', tournament: 'cw-warroom' };

function historyOf(s: State, pid: PID): string {
  const o: PID = pid === 'A' ? 'B' : 'A'; const l = s.draft.learn;
  const bits = [`previous nights together: ${s.mem?.nights || 0}`, `Player 1 swiped ${l.A.n} films in the draft and said yes to ${l.A.yes}`, `Player 2 swiped ${l.B.n} and said yes to ${l.B.yes}`];
  if (s.mem?.ledger) bits.push(`past ledger Player 1 ${s.mem.ledger.A} vs Player 2 ${s.mem.ledger.B}`);
  if (s.b8) bits.push(`bracket purses ${s.b8.purse.A} vs ${s.b8.purse.B}`);
  if (s.vibe.tropes?.A && s.vibe.tropes.B) bits.push(`vibes chosen: ${[...s.vibe.tropes.A, ...s.vibe.tropes.B].join(', ')}`);
  void o; void BY_ID; return bits.join('; ');
}

/** CineSync v3.0 pipeline: Mood -> Scene -> Tournament. Applies the stage colorway, gates each stage behind an unskippable Orson decree (per player), and floats the Wildcard Dock + Feline hijack overlay. */
export default function CineSyncPipeline({ s, pid, code, send, children }: { s: State; pid: PID; code: string; send: (i: Intent) => void; children: React.ReactNode }) {
  const stage = STAGE_OF(s.phase);
  const [acked, setAcked] = useState<Record<string, boolean>>(() => { const o: Record<string, boolean> = {}; try { for (const st of ['mood', 'scene', 'tournament']) if (sessionStorage.getItem(`cs-dec-${code}-${st}`)) o[st] = true; } catch { /* none */ } return o; });
  const ack = (st: string) => { try { sessionStorage.setItem(`cs-dec-${code}-${st}`, '1'); } catch { /* none */ } setAcked((a) => ({ ...a, [st]: true })); };
  const gate = stage && !acked[stage];
  const b = s.b8; const m = b && s.phase === 'bracket' ? b.matches[b.cur] : null; const cat = m?.cat || null;
  const [catSeen, setCatSeen] = useState('');
  const catKey = cat ? m!.id + cat.in : '';
  const vt = m?.veto || null; const vKey = vt ? m!.id + 'v' + vt.dead : ''; const [vSeen, setVSeen] = useState(''); const showVeto = !!vt && vSeen !== vKey && !gate && !(cat && catSeen !== catKey);
  const EULOGY = ['It was never going to survive the second act.', 'Gone. The critics will not be called.', 'A moment of silence. A short one. I have a schedule.', 'Cancelled by committee of one.', 'Struck from the record. Please do not ask for a sequel.'];
  const showCat = !!cat && catSeen !== catKey && !gate;
  return <main className={'cs-play ' + (stage ? CW[stage] : '')} data-stage={stage || 'lobby'}>
    {children}
    {!gate && <WildcardDock s={s} pid={pid} send={send} />}
    {showCat && cat && <div className="cs-cat" onClick={() => setCatSeen(catKey)} onAnimationEnd={() => undefined}>
      <div className="cs-cat-shelf"><img className="cs-cat-poster" alt="" src={`https://image.tmdb.org/t/p/w342${BY_ID[cat.out]?.p || ''}`} /><span className="cs-cat-paw">🐾</span><span className="cs-cat-cat">🐈‍⬛</span></div>
      <b>FELINE INTERVENTION</b><p>{cat.by} just knocked {BY_ID[cat.out]?.t} off the shelf.</p><p>{BY_ID[cat.in]?.t} ({BY_ID[cat.in]?.y}) takes its seat.</p><button className="cs-btn cs-btn--gold" onClick={() => setCatSeen(catKey)}>FINE</button>
    </div>}
    {showVeto && vt && <div className="cs-veto" onClick={() => setVSeen(vKey)} ref={(el) => { if (el && !el.dataset.t) { el.dataset.t = '1'; setTimeout(() => setVSeen(vKey), 3600); } }}>
      <div className="cs-veto-flash" />
      <div className="cs-veto-poster">{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w342${BY_ID[vt.dead]?.p || ''})`, backgroundPosition: `${i * 20}% 0`, animationDelay: `${0.5 + i * 0.06}s`, ['--dx' as string]: `${(i % 2 ? 1 : -1) * (20 + i * 8)}px` }} />)}</div>
      <b>VETOED</b><p>{BY_ID[vt.dead]?.t}</p><p className="cs-veto-eul">{EULOGY[(vt.dead + (m?.slot || 0)) % EULOGY.length]}</p>
    </div>}
    {gate && stage && <OrsonDecree key={stage} stageId={stage} history={historyOf(s, pid)} existing={stage === 'scene' ? s.inter?.vibe : stage === 'tournament' && s.asym ? s.asym[pid] : undefined} onAck={() => ack(stage)} />}
  </main>;
}
