'use client';

/* Batch 180: recognisable boss CHARACTERS (hand-built animated SVG, 0p, deterministic).
   Each boss gets a distinct silhouette + its own movement: blink, bob, sway, shake, float. */

export type BossId = 3 | 6 | 9 | 12 | 15;

export default function BossAvatar({ level, size = 96, animate = true }: { level: number; size?: number; animate?: boolean }) {
  const a = animate ? 'boss-char--live' : '';
  const common = { width: size, height: size, viewBox: '0 0 100 100', role: 'img' as const };
  switch (level) {
    case 3: return ( // Pawn Solo: sleepy pawn in a nightcap, gently swaying
      <svg {...common} aria-label="Pawn Solo" className={`boss-char ${a}`}>
        <g className="boss-char__sway">
          <ellipse cx="50" cy="86" rx="26" ry="6" fill="#1e293b" />
          <path d="M35 82c0-8 5-12 5-20 0-6-3-8-3-14 0-8 6-14 13-14s13 6 13 14c0 6-3 8-3 14 0 8 5 12 5 20z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="50" cy="30" r="12" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          <path className="boss-char__cap" d="M38 26c2-10 10-16 12-16s10 6 12 16c-4-3-8-4-12-4s-8 1-12 4z" fill="#6366f1" />
          <circle className="boss-char__cap" cx="50" cy="9" r="4" fill="#818cf8" />
          <g className="boss-char__eyes"><path d="M43 32h6M51 32h6" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" /></g>
          <path d="M45 42q5 4 10 0" stroke="#334155" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <text className="boss-char__zzz" x="66" y="22" fontSize="12" fill="#818cf8">z</text>
          <text className="boss-char__zzz boss-char__zzz--2" x="74" y="14" fontSize="15" fill="#818cf8">z</text>
        </g>
      </svg>);
    case 6: return ( // Dark Knight: armoured knight head, slow heavy bob, visor glint
      <svg {...common} aria-label="Dark Knight" className={`boss-char ${a}`}>
        <g className="boss-char__bob">
          <ellipse cx="50" cy="88" rx="28" ry="6" fill="#111827" />
          <path d="M30 84c0-16 6-22 6-32 0-4-2-6-2-10 0-12 9-20 16-20s16 8 16 20c0 4-2 6-2 10 0 10 6 16 6 32z" fill="#374151" stroke="#111827" strokeWidth="2.5" />
          <path d="M50 22l4-12 4 12z" fill="#6b7280" />
          <path className="boss-char__visor" d="M36 46h28v8H36z" fill="#0ea5e9" opacity="0.9" />
          <path d="M36 46h28v3H36z" fill="#7dd3fc" opacity="0.7" />
          <path d="M40 66h20M40 72h20" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
          <path className="boss-char__cape" d="M28 56c-8 4-12 12-12 24 6-4 10-4 14-2z" fill="#7f1d1d" />
        </g>
      </svg>);
    case 9: return ( // Arch-Bishop: mitre, wild eyes, crackling with energy, twitching
      <svg {...common} aria-label="Arch-Bishop" className={`boss-char ${a}`}>
        <g className="boss-char__twitch">
          <ellipse cx="50" cy="88" rx="26" ry="6" fill="#1e1b4b" />
          <path d="M34 84c0-10 4-14 4-22 0-6-2-8-2-13 0-11 7-18 14-18s14 7 14 18c0 5-2 7-2 13 0 8 4 12 4 22z" fill="#4c1d95" stroke="#2e1065" strokeWidth="2.5" />
          <path d="M50 8l10 22H40z" fill="#7c3aed" stroke="#2e1065" strokeWidth="2" />
          <circle cx="50" cy="14" r="3" fill="#fbbf24" />
          <g className="boss-char__eyes">
            <circle cx="44" cy="44" r="3.4" fill="#fff" /><circle cx="44.8" cy="44.6" r="1.7" fill="#111" />
            <circle cx="57" cy="44" r="3.4" fill="#fff" /><circle cx="56.2" cy="44.6" r="1.7" fill="#111" />
          </g>
          <path d="M44 56q6-5 13 1" stroke="#fbbf24" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <g className="boss-char__bolt" stroke="#fbbf24" strokeWidth="2.4" fill="none" strokeLinecap="round">
            <path d="M24 40l-6 6 6 2-6 6" /><path d="M76 40l6 6-6 2 6 6" />
          </g>
        </g>
      </svg>);
    case 12: return ( // Ice Queen: crown + frost ring rotating, cold glow, slow float
      <svg {...common} aria-label="Ice Queen" className={`boss-char ${a}`}>
        <g className="boss-char__float">
          <ellipse cx="50" cy="88" rx="26" ry="6" fill="#0c4a6e" />
          <path d="M34 84c0-12 5-16 5-24 0-5-2-7-2-12 0-10 6-16 13-16s13 6 13 16c0 5-2 7-2 12 0 8 5 12 5 24z" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2.5" />
          <path d="M38 30l3-12 6 8 3-12 3 12 6-8 3 12z" fill="#7dd3fc" stroke="#0284c7" strokeWidth="2" />
          <g className="boss-char__eyes"><path d="M43 46h6M52 46h6" stroke="#075985" strokeWidth="2.6" strokeLinecap="round" /></g>
          <path d="M45 58h10" stroke="#075985" strokeWidth="2.2" strokeLinecap="round" />
          <g className="boss-char__frost" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round">
            <path d="M20 30v10M15 35h10M17 31l6 8M23 31l-6 8" />
            <path d="M80 60v10M75 65h10M77 61l6 8M83 61l-6 8" />
          </g>
        </g>
      </svg>);
    case 15: return ( // Joseph: crowned king silhouette, burning aura, levitating
      <svg {...common} aria-label="Joseph" className={`boss-char ${a}`}>
        <defs><radialGradient id="j-aura" cx="50%" cy="45%" r="55%"><stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" /><stop offset="100%" stopColor="#f43f5e" stopOpacity="0" /></radialGradient></defs>
        <circle className="boss-char__aura" cx="50" cy="48" r="42" fill="url(#j-aura)" />
        <g className="boss-char__float">
          <ellipse cx="50" cy="90" rx="24" ry="5" fill="#111" opacity="0.6" />
          <path d="M32 86c0-14 6-18 6-28 0-6-2-8-2-13 0-11 7-17 14-17s14 6 14 17c0 5-2 7-2 13 0 10 6 14 6 28z" fill="#18181b" stroke="#f43f5e" strokeWidth="2.5" />
          <path d="M36 26l4-14 7 9 3-13 3 13 7-9 4 14z" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
          <g className="boss-char__eyes"><circle cx="44" cy="44" r="2.6" fill="#f43f5e" /><circle cx="56" cy="44" r="2.6" fill="#f43f5e" /></g>
          <path d="M43 58q7 6 14 0" stroke="#f43f5e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
      </svg>);
    default: return null;
  }
}
