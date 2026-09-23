'use client';

// Interactive tap-to-move board: tap one of your pieces, then tap a highlighted
// target. Legal moves come from chess.js; promotions auto-queen. Display matches
// NeonChessboard (cream/tan squares, glossy sprites) so every mini game feels
// like the same town.
import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { getPieceSpriteDataUrl } from '@/lib/piece-sprites';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const PIECES: Record<string, string> = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };

type TapBoardProps = {
  fen: string;
  orientation?: 'w' | 'b';
  locked?: boolean;
  lastMove?: { from: string; to: string } | null;
  onMove?: (from: string, to: string, promotion?: string) => void;
  label?: string;
};

function rows(fen: string): string[][] {
  return fen.split(' ')[0].split('/').map((rank) => rank.split('').flatMap((piece) => Number.isInteger(Number(piece)) ? Array(Number(piece)).fill('') : [piece]));
}

export default function TapBoard({ fen, orientation = 'w', locked = false, lastMove = null, onMove, label }: TapBoardProps) {
  const [sprites, setSprites] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    (['w', 'b'] as const).forEach((color) => ['p', 'r', 'n', 'b', 'q', 'k'].forEach((type) => {
      const url = getPieceSpriteDataUrl(color, type);
      if (url) next[`${color}${type}`] = url;
    }));
    setSprites(next);
  }, []);

  useEffect(() => { setSelected(null); }, [fen]);

  const targets = useMemo(() => {
    const map = new Map<string, { capture: boolean; promotion: boolean }>();
    if (!selected) return map;
    try {
      for (const m of new Chess(fen).moves({ square: selected as never, verbose: true })) {
        map.set(m.to, { capture: Boolean(m.captured), promotion: Boolean(m.promotion) });
      }
    } catch { /* bad fen: no targets */ }
    return map;
  }, [fen, selected]);

  const tap = (square: string, piece: string) => {
    if (locked || !onMove) return;
    if (selected && targets.has(square)) {
      const target = targets.get(square)!;
      onMove(selected, square, target.promotion ? 'q' : undefined);
      setSelected(null);
      return;
    }
    const sideToMove = fen.split(' ')[1] || 'w';
    const isOwnPiece = piece && (sideToMove === 'w' ? piece === piece.toUpperCase() : piece === piece.toLowerCase());
    setSelected(isOwnPiece && square !== selected ? square : null);
  };

  const grid = rows(fen);
  const rankOrder = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const fileOrder = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  return <div className="neon-chessboard tapboard" aria-label={label || 'Chess board - tap a piece, then tap where it goes'} role="grid">
    {rankOrder.map((row) => fileOrder.map((col) => {
      const piece = grid[row][col];
      const square = `${FILES[col]}${8 - row}`;
      const isWhite = piece === piece.toUpperCase();
      const sprite = piece ? sprites[`${isWhite ? 'w' : 'b'}${piece.toLowerCase()}`] : null;
      const target = targets.get(square);
      const classes = [
        (row + col) % 2 ? 'neon-chessboard__dark' : 'neon-chessboard__light',
        'tapboard__square',
        selected === square ? 'tapboard__square--selected' : '',
        target ? (target.capture ? 'tapboard__square--capture' : 'tapboard__square--target') : '',
        lastMove && (lastMove.from === square || lastMove.to === square) ? 'tapboard__square--last' : '',
      ].filter(Boolean).join(' ');
      return <button type="button" className={classes} key={square} onClick={() => tap(square, piece)} aria-label={`${square}${piece ? ` ${piece}` : ''}`}>
        {piece ? (sprite
          ? <img src={sprite} alt="" draggable={false} style={{ width: '88%', height: '88%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
          : <span data-color={isWhite ? 'white' : 'black'}>{PIECES[piece.toLowerCase()] + '︎'}</span>) : ''}
      </button>;
    }))}
  </div>;
}
