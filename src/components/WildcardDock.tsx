'use client';
import { useState } from 'react';
import type { State, PID, Intent, SabKey } from '@/lib/game';
import { BY_ID } from '@/lib/game';
import { canUse, executeOrsonPicks, SAB_LABEL } from '@/utils/sabotageEngine';

const ICON: Record<SabKey, string> = { veto: '🚫', block: '❄️', roulette: '🎰', orson: '🎩' };
const HELP: Record<SabKey, string> = { veto: 'Kill a film. Their film advances.', block: 'Freeze their tokens this round.', roulette: 'Wheel of fortune: one spin and one veto each.', orson: 'Orson picks by critic scores.' };

/** Floating Wildcard Dock: each sabotage is single-use per player per session. A tap arms it, a second tap fires it. */
export default function WildcardDock({ s, pid, send }: { s: State; pid: PID; send: (i: Intent) => void }) {
  const [arm, setArm] = useState<SabKey | ''>(''); const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
  const sab = s.sab; if (!sab) return null;
  const keys: SabKey[] = s.phase === 'bracket' && s.b8 && !s.b8.show ? ['veto', 'block', 'orson'] : s.phase === 'vibe' || s.phase === 'draft' ? ['roulette'] : [];
  if (!keys.length) return null;
  const fire = async (k: SabKey) => {
    if (arm !== k) { setArm(k); setNote(HELP[k] + ' Tap again to fire.'); setTimeout(() => setArm((a) => (a === k ? '' : a)), 4000); return; }
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
  return <div className="cs-dock" role="toolbar" aria-label="Wildcard dock">
    {note && <div className="cs-dock-note">{note}</div>}
    <div className="cs-dock-row">{keys.map((k) => { const spent = !sab[pid][k]; const ok = !spent && canUse(s, pid, k) && !busy;
      return <button key={k} className={'cs-dock-b' + (arm === k ? ' is-armed' : '') + (spent ? ' is-spent' : '')} disabled={!ok} onClick={() => fire(k)}><span>{ICON[k]}</span><b>{SAB_LABEL[k]}</b><small>{spent ? 'USED' : arm === k ? 'TAP TO FIRE' : 'ONCE'}</small></button>; })}</div>
  </div>;
}
