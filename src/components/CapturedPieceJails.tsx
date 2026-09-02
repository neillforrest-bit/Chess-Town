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
    <div key={pieces.length} className={`piece-jail flex h-10 min-w-0 items-center gap-2 overflow-hidden rounded-md border px-2 ${pieces.length ? 'piece-jail--impact' : ''} ${isWhite ? 'border-pink-400/50 bg-pink-500/10 shadow-[inset_0_0_18px_rgba(255,43,136,0.12)]' : 'border-green-400/50 bg-green-400/10 shadow-[inset_0_0_18px_rgba(57,255,20,0.12)]'}`}>
      <span className={`shrink-0 text-[9px] font-black tracking-wide ${isWhite ? 'text-pink-300' : 'text-green-300'}`}>{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">
        {pieces.map((piece, index) => <span key={`${color}-${index}`} className={`shrink-0 font-serif text-lg leading-none ${isWhite ? 'text-pink-200 drop-shadow-[0_0_8px_#ff4eb1]' : 'text-green-100 drop-shadow-[0_0_8px_#39ff14]'} ${index === pieces.length - 1 ? 'piece-jail__piece' : ''}`}>{PIECE_GLYPHS[color][piece.type]}</span>)}
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