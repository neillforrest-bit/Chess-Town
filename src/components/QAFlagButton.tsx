'use client';
// QA "Hallucination Flag": one tap logs the board, the engine's centipawn loss and what Chester said to
// Supabase qa_logs (with token cost). Optimistic: glows red, flips to "Logged" at once, never blocks play.
// Plain CSS (qa-flag*) because Tailwind utilities do not compile in this app; same look as the spec's
// text-red-500 + drop-shadow-md.
import { useState } from 'react';
import { logQualityFlag, type QualityFlagPayload } from '@/actions/qaActions';

type Props = { build: () => QualityFlagPayload | null };

export default function QAFlagButton({ build }: Props) {
  const [state, setState] = useState<'idle' | 'logged' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const click = () => {
    if (state === 'logged') return;
    const payload = build();
    if (!payload) return;
    setState('logged'); setMsg('');
    void logQualityFlag(payload).then((r) => {
      if (!r.ok) { setState('error'); setMsg(r.error); window.setTimeout(() => setState('idle'), 3500); }
    }).catch(() => { setState('error'); setMsg('Could not log'); window.setTimeout(() => setState('idle'), 3500); });
  };
  return <button type="button" className={`qa-flag qa-flag--${state}`} onClick={click} aria-label={state === 'logged' ? 'Logged' : 'Flag this reply as a hallucination'} title="Flag a wrong Chester reply">
    {state === 'logged'
      ? <><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Logged</span></>
      : <><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 21V4M6 4h11l-2 4 2 4H6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>{state === 'error' && <span>{msg}</span>}</>}
  </button>;
}
