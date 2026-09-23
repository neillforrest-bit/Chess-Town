'use client';
import { BUILD_LABEL } from '@/lib/build-info';

export default function BuildBadge() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: 6,
        bottom: 4,
        zIndex: 60,
        fontSize: 9,
        letterSpacing: '0.08em',
        fontFamily: 'monospace',
        color: 'rgba(180,200,255,0.55)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {BUILD_LABEL}
    </div>
  );
}
