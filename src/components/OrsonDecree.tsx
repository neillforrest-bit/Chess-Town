'use client';
import { useEffect, useState } from 'react';
import { OrsonFace } from './shared';

export type StageId = 'mood' | 'scene' | 'tournament';
export const DECREES: Record<StageId, { n: string; title: string; text: string; purpose: string }> = {
  mood: { n: 'STAGE 1', title: 'MOOD SETTING', text: 'I am forcing you to agree on an aesthetic before you ruin my evening with conflicting genres.', purpose: 'both players swipe on abstract moods and pacing to agree an aesthetic' },
  scene: { n: 'STAGE 2', title: 'SCENE SETTING', text: 'The mood is set, against my better judgment. Now, draft your weapons. And try to pick something that justifies turning on the big TV.', purpose: 'each player drafts films in secret from the agreed mood; their best become Champions' },
  tournament: { n: 'STAGE 3', title: 'THE TOURNAMENT', text: 'Eight enter. One survives. Spend your tokens wisely, or suffer the consequences of your own terrible taste.', purpose: 'a tug-of-war bracket where players wager tokens on films' },
};
const FALLBACK: Record<StageId, string> = { mood: 'Two adults, one sofa, and no shared taste. I have seen hostage negotiations go smoother.', scene: 'Player 1 and Player 2 have shown me the taste of two people picking films from opposite ends of a very long corridor.', tournament: 'Remember: every token you waste is a vote for your own regret.' };

/** Full-screen, unskippable Orson decree before each stage: animated text reveal, one Acknowledge button. Fetches a roast by stageId (generic: never names the players), falls back to a stock line. */
export default function OrsonDecree({ stageId, history, existing, onAck }: { stageId: StageId; history: string; existing?: string; onAck: () => void }) {
  const d = DECREES[stageId]; const [roast, setRoast] = useState<string>(existing || ''); const [shown, setShown] = useState(0);
  useEffect(() => { const i = setInterval(() => setShown((x) => Math.min(x + 2, d.text.length)), 28); return () => clearInterval(i); }, [d.text]);
  useEffect(() => {
    let live = true; const k = 'cs-dec-roast-' + stageId + history.length;
    try { const c = sessionStorage.getItem(k); if (c) { setRoast(c); return; } } catch { /* none */ }
    fetch('/api/orson', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'decree', stageId, purpose: d.purpose, history }) })
      .then((r) => r.json()).then((j) => { const t = (j && j.roast) || ''; if (live) setRoast(t || existing || FALLBACK[stageId]); try { if (t) sessionStorage.setItem(k, t); } catch { /* none */ } })
      .catch(() => { if (live) setRoast(existing || FALLBACK[stageId]); });
    return () => { live = false; };
  }, [stageId]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = shown >= d.text.length;
  return <div className={'cs-decree cs-decree--' + stageId} role="dialog" aria-label="Orson decree">
    <div className="cs-decree-in">
      <div className="cs-decree-n">{d.n}</div>
      <h1>{d.title}</h1>
      <div className="cs-decree-face"><OrsonFace mood="smug" talking={!done} /></div>
      <p className="cs-decree-t">&ldquo;{d.text.slice(0, shown)}<i className="cs-decree-cur" />{done ? '\u201d' : ''}</p>
      <p className={'cs-decree-r' + (done && roast ? ' is-on' : '')}>{roast || 'Orson is reading your file...'}</p>
      <button className="cs-btn cs-btn--gold cs-decree-btn" disabled={!done} onClick={onAck}>ACKNOWLEDGE</button>
    </div>
  </div>;
}
