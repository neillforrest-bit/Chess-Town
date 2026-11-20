'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PlayRoom from './PlayRoom';

/** Player 2 without a callsign (old link or direct URL) is routed through the invite onboarding first. */
export default function PlayGate({ code }: { code: string }) {
  const sp = useSearchParams(); const router = useRouter();
  const needs = sp.get('p') === 'B' && !(sp.get('n') || '').trim();
  useEffect(() => { if (needs) router.replace(`/invite?gameId=${code}`); }, [needs, code, router]);
  if (needs) return null;
  return <PlayRoom code={code} />;
}
