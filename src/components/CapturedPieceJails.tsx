import { drawPieceSprite } from '@/lib/piece-sprites';

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
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  spriteCache[key] = ctx ? (drawPieceSprite(ctx, color, type, 64), canvas.toDataURL()) : '';
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
