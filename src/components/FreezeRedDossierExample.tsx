'use client';
// Example wiring (NOT mounted anywhere yet): fire-and-forget the dossier update when Chester
// freezes the board red. The game never waits on the network, and a failed save never breaks play.
import { useEffect, useRef } from 'react';
import { updateDossier } from '@/actions/updateDossier';

type Freeze = { ui_action: 'freeze_green' | 'freeze_red' | 'shake' | 'none'; tactic: string; ply: number } | null;

export default function FreezeRedDossierExample({ freeze }: { freeze: Freeze }) {
  const lastSent = useRef<string>('');
  useEffect(() => {
    if (!freeze || freeze.ui_action !== 'freeze_red') return;
    const key = `${freeze.tactic}-${freeze.ply}`; // one call per freeze, even if React re-renders
    if (lastSent.current === key) return;
    lastSent.current = key;
    void updateDossier(freeze.tactic, freeze.ply).then((r) => { if (!r.ok) console.warn('dossier not saved:', r.error); });
  }, [freeze]);
  return null;
}
