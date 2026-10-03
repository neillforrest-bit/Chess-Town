import { getPieceSpriteDataUrl } from '@/lib/piece-sprites';

export type CapturedPiece = {
  color: 'w' | 'b';
  type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
};

const PIECE_GLYPHS: Record<CapturedPiece['color'], Record<CapturedPiece['type'], string>> = {
  w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
  b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' },
};

export function PieceJail({ capturedPieces, color, label }: { capturedPieces: CapturedPiece[]; color: CapturedPiece['color']; label: string }) {
  const pieces = capturedPieces.filter((piece) => piece.color === color);
  const isWhite = color === 'w';

  return (
    <div key={pieces.length} className={`piece-jail flex h-10 min-w-0 items-center gap-2 overflow-hidden rounded-md border px-2 ${pieces.length ? 'piece-jail--impact' : ''} ${isWhite ? 'border-blue-400/50 bg-blue-500/10 shadow-[inset_0_0_18px_rgba(37,99,235,0.14)]' : 'border-zinc-500/50 bg-zinc-800/40 shadow-[inset_0_0_18px_rgba(20,24,31,0.35)]'}`}>
      <span className={`shrink-0 text-[9px] font-black tracking-wide ${isWhite ? 'text-blue-300' : 'text-zinc-400'}`}>{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">
        {pieces.map((piece, index) => <span key={`${color}-${index}`} className={`shrink-0 font-serif text-lg leading-none ${isWhite ? 'text-blue-200 drop-shadow-[0_0_8px_#2563eb]' : 'text-gray-300 drop-shadow-[0_0_8px_#14181f]'} ${index === pieces.length - 1 ? 'piece-jail__piece' : ''}`} style={{ transform: 'scale(.8)' }}>{PIECE_GLYPHS[color][piece.type] + '\uFE0E'}</span>)}
      </div>
    </div>
  );
}

export { PieceJail as CapturedPieceJail };

export default function CapturedPieceJails({ capturedPieces }: { capturedPieces: CapturedPiece[] }) {
  const cells: { color: CapturedPiece['color']; label: string }[] = [
    { color: 'w', label: 'P1 CAPTURED' },
    { color: 'b', label: 'P2 CAPTURED' },
  ] as const;

  return (
    <section aria-label="Captured pieces" className="grid h-24 w-full grid-cols-2 gap-2">
      {cells.map(({ color, label }) => <PieceJail key={color} capturedPieces={capturedPieces} color={color} label={label} />)}
    </section>
  );
}
const MATERIAL_POINTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Mini sprites rendered through the same artist as the board pieces, so the jail
// matches what you see on the squares (crowns included). Cached per piece kind.
const spriteCache: Record<string, string> = {};
function jailSpriteUrl(color: CapturedPiece['color'], type: string): string {
  const key = `${color}-${type}`;
  if (spriteCache[key] !== undefined) return spriteCache[key];
  spriteCache[key] = getPieceSpriteDataUrl(color, type) || '';
  return spriteCache[key];
}

function JailSide({ label, pieces, tone }: { label: string; pieces: CapturedPiece[]; tone: 'you' | 'opp' }) {
  const pts = pieces.reduce((total, piece) => total + (MATERIAL_POINTS[piece.type] || 0), 0);
  return (
    <div className={`material-bar__jail material-bar__jail--${tone}`} aria-label={label}>
      <span>{label}<i>{pts > 0 ? `+${pts}` : ''}</i></span>
      <div className="material-bar__pieces" key={pieces.length}>
        {pieces.map((piece, index) => (
          <img key={`${piece.color}-${piece.type}-${index}`} src={jailSpriteUrl(piece.color, piece.type)} alt="" className={index === pieces.length - 1 ? 'material-bar__new' : undefined} />
        ))}
        {!pieces.length && <em className="material-bar__empty">empty</em>}
      </div>
    </div>
  );
}

// Live material scoreboard + jails. Standard values: pawn 1, knight/bishop 3, rook 5, queen 9.
export function MaterialJailBar({ capturedPieces, playerColor = 'w', youLabel = 'YOU', oppLabel = 'CHESTER' }: { capturedPieces: CapturedPiece[]; playerColor?: 'w' | 'b'; youLabel?: string; oppLabel?: string }) {
  const youTook = capturedPieces.filter((piece) => piece.color !== playerColor);
  const oppTook = capturedPieces.filter((piece) => piece.color === playerColor);
  const yourPts = youTook.reduce((total, piece) => total + (MATERIAL_POINTS[piece.type] || 0), 0);
  const oppPts = oppTook.reduce((total, piece) => total + (MATERIAL_POINTS[piece.type] || 0), 0);
  const lead = yourPts - oppPts;
  const last = capturedPieces[capturedPieces.length - 1];
  const lastGain = last && last.color !== playerColor ? MATERIAL_POINTS[last.type] || 0 : 0;
  return (
    <section className="material-bar" aria-label="Captured pieces and material score">
      <JailSide label={`${oppLabel} TOOK`} pieces={oppTook} tone="opp" />
      <div className="material-bar__score" key={`${yourPts}-${oppPts}`}>
        {lastGain > 0 && <em className="material-bar__gain" key={capturedPieces.length}>+{lastGain}</em>}
        <div className="material-bar__team material-bar__team--you"><b>{yourPts}</b><span>{youLabel}</span></div>
        <div className="material-bar__mid"><i>·</i><small>{lead > 0 ? `${youLabel} +${lead}` : lead < 0 ? `${oppLabel} +${-lead}` : 'LEVEL'}</small></div>
        <div className="material-bar__team material-bar__team--opp"><b>{oppPts}</b><span>{oppLabel}</span></div>
      </div>
      <JailSide label={`${youLabel} TOOK`} pieces={youTook} tone="you" />
    </section>
  );
}

// Batch 49: shared material split + slim board-edge capture strips.
export function splitMaterial(capturedPieces: CapturedPiece[], playerColor: 'w' | 'b' = 'w') {
  const youTook = capturedPieces.filter((piece) => piece.color !== playerColor);
  const oppTook = capturedPieces.filter((piece) => piece.color === playerColor);
  const yourPts = youTook.reduce((total, piece) => total + (MATERIAL_POINTS[piece.type] || 0), 0);
  const oppPts = oppTook.reduce((total, piece) => total + (MATERIAL_POINTS[piece.type] || 0), 0);
  return { youTook, oppTook, yourPts, oppPts, lead: yourPts - oppPts };
}

export function CaptureStrip({ pieces, tone, label }: { pieces: CapturedPiece[]; tone: 'you' | 'opp'; label: string }) {
  return (
    <div className={`capture-strip capture-strip--${tone}`} aria-label={label}>
      <span>{label}</span>
      <div className="capture-strip__pieces" key={pieces.length} data-more={pieces.length > 9 ? `+${pieces.length - 9}` : undefined}>
        {pieces.map((piece, index) => (
          <img key={`${piece.color}-${piece.type}-${index}`} src={jailSpriteUrl(piece.color, piece.type)} alt="" className={index === pieces.length - 1 ? 'capture-strip__new' : undefined} />
        ))}
        {!pieces.length && <em>none yet</em>}
      </div>
    </div>
  );
}

// Batch 56 (BUILD 55, his hero feature): NFL-style live material scoreboard above the
// board. Two big stadium score boxes (points captured per side, bigger than anything
// else on the page), capturer's number pops green, the loser's box flashes red, and
// side commentary boxes call the latest take in words. Mobile band only - desktop keeps
// the floating badge.
// Batch 93 (BUILD 93, his NBA Jumbotron brief): the captured-pieces text panels are
// gone - the two glossy obsidian score blocks carry the material story. Slot-machine
// rolling digits on every score change, a pulsating neon ring on the leader, a neon
// possession underline under the side to move, and an ON FIRE run badge with an amber
// score glow when the user strings 3+ top grades (TOP DOG / SPOT ON / STRONG) together.
function RollDigit({ digit }: { digit: number }) {
  return (
    <span className="hero-roll__digit" aria-hidden="true">
      <span className="hero-roll__strip" style={{ transform: `translateY(-${digit}em)` }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => <span key={d}>{d}</span>)}
      </span>
    </span>
  );
}

function RollNumber({ value }: { value: number }) {
  const v = Math.max(0, Math.min(99, value));
  const tens = Math.floor(v / 10);
  return (
    <b className="hero-roll">
      {tens > 0 && <RollDigit digit={tens} />}
      <RollDigit digit={v % 10} />
    </b>
  );
}

export function HeroScoreboard({ material, youLabel = 'YOU', oppLabel = 'CHESTER', oppThinking = false, turnSide = 'you', tugPct = 50, lead = 0 }: { material: ReturnType<typeof splitMaterial>; youLabel?: string; oppLabel?: string; oppThinking?: boolean; turnSide?: 'you' | 'opp'; tugPct?: number; lead?: number }) {
  const { yourPts, oppPts } = material;
  const you = Math.max(2, Math.min(98, tugPct));
  const youR = Math.round(you);
  return (
    <div className="fighthud" aria-label={`Live material score: ${youLabel} ${yourPts}, ${oppLabel} ${oppPts}`}>
      <div className="fighthud__names">
        <div className={`fighthud__name fighthud__name--you ${turnSide === 'you' ? 'is-turn' : ''}`}>
          <span>{youLabel}</span>{lead > 0 && <em key={`l-${lead}`}>+{lead}</em>}
        </div>
        <div className={`fighthud__name fighthud__name--opp ${turnSide === 'opp' ? 'is-turn' : ''} ${oppThinking ? 'is-thinking' : ''}`}>
          {lead < 0 && <em key={`l-${lead}`}>+{-lead}</em>}<span>{oppLabel}</span>
        </div>
      </div>
      <div className="fighthud__bar" role="img" aria-label={`Tug of war: ${youLabel} ${youR} percent, ${oppLabel} ${100 - youR} percent`}>
        <i className="fighthud__you" style={{ width: `${you}%` }} />
        <i className="fighthud__opp" style={{ width: `${100 - you}%` }} />
        <b className="fighthud__notch" aria-hidden="true" />
        <span className="fighthud__pct fighthud__pct--you">{youR}%</span>
        <span className="fighthud__pct fighthud__pct--opp">{100 - youR}%</span>
      </div>
    </div>
  );
}
