'use client';

import { useEffect, useState } from 'react';
import { getPieceSpriteDataUrl } from '@/lib/piece-sprites';

const PIECES: Record<string, string> = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', P: '♟', R: '♜', N: '♞', B: '♝', Q: '♛', K: '♚' };
const TEXT_VS = '\uFE0E';

function rows(fen: string): string[][] {
  return fen.split(' ')[0].split('/').map((rank) => rank.split('').flatMap((piece) => Number.isInteger(Number(piece)) ? Array(Number(piece)).fill('') : [piece]));
}

export default function NeonChessboard({ fen, label }: { fen: string; label?: string }) {
  const [sprites, setSprites] = useState<Record<string, string>>({});
  useEffect(() => {
    const next: Record<string, string> = {};
    (['w', 'b'] as const).forEach((color) => ['p', 'r', 'n', 'b', 'q', 'k'].forEach((type) => {
      const url = getPieceSpriteDataUrl(color, type);
      if (url) next[`${color}${type}`] = url;
    }));
    setSprites(next);
  }, []);

  return <div className="neon-chessboard" aria-label={label || 'Chess position'}>
    {rows(fen).flatMap((rank, row) => rank.map((piece, col) => {
      const isWhite = piece === piece.toUpperCase();
      const key = `${isWhite ? 'w' : 'b'}${piece.toLowerCase()}`;
      const sprite = piece ? sprites[key] : null;
      return <span className={(row + col) % 2 ? 'neon-chessboard__dark' : 'neon-chessboard__light'} key={`${row}-${col}`}>
        {piece ? (sprite
          ? <img src={sprite} alt="" style={{ width: '88%', height: '88%', objectFit: 'contain', display: 'block' }} />
          : <span data-color={isWhite ? 'white' : 'black'}>{PIECES[piece] + TEXT_VS}</span>) : ''}
      </span>;
    }))}
  </div>;
}
