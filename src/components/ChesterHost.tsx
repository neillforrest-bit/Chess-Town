'use client';

import { ChesterAvatar } from '@/components/ChesterUI';

type ChesterHostProps = {
  eyebrow: string;
  instruction: string;
};

export default function ChesterHost({ eyebrow, instruction }: ChesterHostProps) {
  return (
    <section className="relative overflow-hidden border border-cyan-300/40 bg-[#080611]/90 px-4 py-4 shadow-[0_0_28px_rgba(34,211,238,0.16)] sm:px-6" aria-label="Chester's instructions">
      <div className="absolute inset-y-0 left-0 w-1 bg-cyan-300" />
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center border border-blue-400/50 bg-blue-500/10 shadow-[inset_0_0_18px_rgba(37,99,235,0.2)]">
          <ChesterAvatar isThinking={false} size="default" />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-black tracking-wide text-cyan-200">{eyebrow}</p>
          <p className="text-sm font-bold leading-6 text-white sm:text-base">{instruction}</p>
        </div>
      </div>
    </section>
  );
}