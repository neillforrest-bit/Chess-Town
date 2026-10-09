'use client';
import { OrsonFace } from './shared';

/** Full-screen Orson pause between stages. Plain CSS overlay; the game keeps its server state, this player proceeds when ready. */
export default function OrsonInterstitial({ title, line, onProceed }: { title: string; line?: string; onProceed: () => void }) {
  return <div className="cs-inter" role="dialog">
    <div className="cs-inter-in">
      <div className="cs-orson">{title}</div>
      <div className="cs-inter-face"><OrsonFace mood="smug" talking={!line} /></div>
      <p className="cs-inter-line">{line || 'Orson is composing his verdict...'}</p>
      <button className="cs-btn cs-btn--gold" onClick={onProceed}>PROCEED</button>
    </div>
  </div>;
}
