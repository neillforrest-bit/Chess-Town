'use client';

import { useState } from 'react';
import ChesterGuide from '@/components/ChesterGuide';
import ChesterIntro from '@/components/ChesterIntro';
import PortalDashboard from '@/components/PortalDashboard';
import { CHESTER_LANDING_COPY } from '@/lib/chester-landing';

export default function ChessTownLanding() {
  const [dialogue, setDialogue] = useState(CHESTER_LANDING_COPY.dailyLeaderboard);

  return <main className="portal-shell">
    <PortalDashboard onHover={setDialogue} />
    <ChesterGuide dialogue={dialogue} />
  </main>;
}
