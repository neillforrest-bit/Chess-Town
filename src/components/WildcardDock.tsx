'use client';
import { useState } from 'react';
import type { State, PID, Intent, SabKey } from '@/lib/game';
import { BY_ID } from '@/lib/game';
import { canUse, executeOrsonPicks, SAB_LABEL } from '@/utils/sabotageEngine';
import { buzz } from './shared';

const ICON: Record<SabKey, string> = { veto: '🚫', block: '❄️', roulette: '🎰', orson: '🎩' };
const HELP: Record<SabKey, string> = { veto: 'Kill ONE film in this matchup - the other film wins the round on the spot.', block: 'Freeze ALL their tokens for this matchup: they wager 0 while you bid free.', roulette: 'Wheel of fortune: one spin and one veto each.', orson: 'End this matchup NOW: the film with the better critic score wins.' };

/** Floating Wildcard Dock: each sabotage is single-use per player per session. A tap arms it, a second tap fires it. */
export default function WildcardDock({ s, pid, send }: { s: State; pid: PID; send: (i: Intent) => void }) {
  const [arm, setArm] = useState<SabKey | ''>(''); const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
  const sab = s.sab; if (!sab) return null;
  const keys: SabKey[] = s.phase === 'bracket' && s.b8 && !s.b8.show ? ['veto', 'block', 'orson'] : s.phase === 'vibe' || s.phase === 'draft' ? ['roulette'] : [];
  if (!keys.length) return null;
  const fire = async (k: SabKey) => {
    if (arm !== k) { setArm(k); setNote(HELP[k] + (k === 'veto' ? ' Now tap the film you want DEAD.' : ' Tap again to fire.')); setTimeout(() => setArm((a) => (a === k ? '' : a)), 8000); return; }
    if (k === 'veto') return; // armed veto fires from the target chooser below
    setArm(''); setNote('');
    if (k === 'orson') {
      const b = s.b8; const m = b?.matches[b.cur]; if (!m || m.a === null || m.b === null) return;
      setBusy(true); setNote('Orson is reading the reviews...');
      try { const r = await executeOrsonPicks(m.a, m.b); setNote(`${BY_ID[r.winner].t}: ${Math.round(Math.max(r.a.score, r.b.score))} vs ${Math.round(Math.min(r.a.score, r.b.score))} (${r.a.src === 'omdb' ? 'OMDB' : 'catalogue'} scores)`); send({ t: 'sab', pid, kind: 'orson', winner: r.winner }); } finally { setBusy(false); }
      return;
    }
    if (k === 'roulette') { send({ t: 'wheel', pid, act: 'start' }); return; }
    send({ t: 'sab', pid, kind: k });
  };
  const cur = s.b8 && s.phase === 'bracket' && !s.b8.show ? s.b8.matches[s.b8.cur] : null;
  const vetoTargets = arm === 'veto' && cur && cur.a !== null && cur.b !== null ? [cur.a, cur.b] : null;
  const fireVeto = (dead: number) => { setArm(''); setNote(''); buzz([30, 30, 50]); send({ t: 'sab', pid, kind: 'veto', dead }); };
  return <div className="cs-dock" role="toolbar" aria-label="Wildcard dock">
    {note && <div className="cs-dock-note">{note}</div>}
    {vetoTargets && <div className="cs-dock-note cs-dock-veto"><b>WHICH FILM DIES?</b><div className="cs-dock-veto-r">{vetoTargets.map((id) => <button key={id} onClick={() => fireVeto(id)}>🚫 KILL {BY_ID[id].t.slice(0, 18).toUpperCase()}</button>)}</div><small>The other film wins this matchup. One power per matchup.</small></div>}
    <div className="cs-dock-row">{keys.map((k) => { const spent = !sab[pid][k]; const locked = !spent && !!cur && !!(cur.veto || cur.blk || cur.orsonPick); const ok = !spent && canUse(s, pid, k) && !busy;
      return <button key={k} className={'cs-dock-b' + (arm === k ? ' is-armed' : '') + (spent ? ' is-spent' : '')} disabled={!ok} onClick={() => fire(k)}><span>{ICON[k]}</span><b>{SAB_LABEL[k]}</b><small>{spent ? 'USED' : locked ? 'POWER PLAYED' : arm === k ? (k === 'veto' ? 'PICK A FILM' : 'TAP TO FIRE') : 'ONCE'}</small></button>; })}</div>
  </div>;
}
