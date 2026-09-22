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
        {pieces.map((piece, index) => <span key={`${color}-${index}`} className={`shrink-0 font-serif text-lg leading-none ${isWhite ? 'text-blue-200 drop-shadow-[0_0_8px_#2563eb]' : 'text-gray-300 drop-shadow-[0_0_8px_#14181f]'} ${index === pieces.length - 1 ? 'piece-jail__piece' : ''}`} style={{ transform: 'scale(.8)' }}>{PIECE_GLYPHS[color][piece.type]}</span>)}
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