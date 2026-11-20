import type { PID, State } from '@/lib/game';
export default function PlayerReadiness({ s, ready, label = 'Player status' }: { s: State; ready: Partial<Record<PID, boolean>>; label?: string }) {
  return <div className="cs-ready-seats" role="group" aria-label={label} aria-live="polite">{(['A', 'B'] as PID[]).map(p => <div key={p} data-player={p} className={ready[p] && s.players[p].joined ? 'is-ready' : ''}><b>{s.players[p].name}</b><span>{s.players[p].joined ? 'Joined' : 'Not joined'} · {ready[p] && s.players[p].joined ? 'Ready' : 'Not ready'}</span></div>)}</div>;
}
