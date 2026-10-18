'use client';

// Interactive tap-to-move board: tap one of your pieces, then tap a highlighted
// target. Legal moves come from chess.js; promotions auto-queen. Display matches
// NeonChessboard (cream/tan squares, glossy sprites) so every mini game feels
// like the same town.
import { useEffect, useMemo, useRef, useState } from 'react';
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
  // square -> opacity override (battle wild card: invisible piece)
  ghostSquares?: Record<string, number>;
  // BUILD 157: checkmate - the king on this square topples over.
  toppleSquare?: string;
};

function rows(fen: string): string[][] {
  return fen.split(' ')[0].split('/').map((rank) => rank.split('').flatMap((piece) => Number.isInteger(Number(piece)) ? Array(Number(piece)).fill('') : [piece]));
}

export default function TapBoard({ fen, orientation = 'w', locked = false, lastMove = null, onMove, label, ghostSquares, toppleSquare }: TapBoardProps) {
  const [sprites, setSprites] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  // Capture battle: the attacker trots in along a flashing path, the loser tips over.
  type CapAnim = { key: number; from: string; to: string; mover: string; captured: string; capturedSq: string; path: string[] };
  const prevFenRef = useRef<string>(fen);
  const [capAnim, setCapAnim] = useState<CapAnim | null>(null);

  useEffect(() => {
    const prev = prevFenRef.current;
    prevFenRef.current = fen;
    if (!lastMove || prev === fen) return;
    const prevGrid = rows(prev);
    const at = (g: string[][], sq: string) => g[8 - parseInt(sq[1], 10)]?.[sq.charCodeAt(0) - 97] || '';
    const mover = at(prevGrid, lastMove.from);
    let captured = at(prevGrid, lastMove.to);
    let capturedSq = lastMove.to;
    if (!captured && mover.toLowerCase() === 'p' && lastMove.from[0] !== lastMove.to[0]) {
      capturedSq = `${lastMove.to[0]}${lastMove.from[1]}`; // en passant
      captured = at(prevGrid, capturedSq);
    }
    if (!mover || !captured) return;
    const path: string[] = [];
    if ('rbq'.includes(mover.toLowerCase())) {
      const ff = lastMove.from.charCodeAt(0) - 97; const fr = parseInt(lastMove.from[1], 10);
      const tf = lastMove.to.charCodeAt(0) - 97; const tr = parseInt(lastMove.to[1], 10);
      const df = Math.sign(tf - ff); const dr = Math.sign(tr - fr);
      let f = ff + df; let r = fr + dr;
      while (f !== tf || r !== tr) { path.push(`${FILES[f]}${r}`); f += df; r += dr; }
    }
    setCapAnim({ key: Date.now(), from: lastMove.from, to: lastMove.to, mover, captured, capturedSq, path });
    const t = setTimeout(() => setCapAnim(null), 1250);
    return () => clearTimeout(t);
  }, [fen, lastMove]);

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
    {rankOrder.map((row, ri) => fileOrder.map((col, ci) => {
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
      const ghostOpacity = ghostSquares && square in ghostSquares ? ghostSquares[square] : 1;
      const hideForAnim = capAnim !== null && capAnim.to === square;
      return <button type="button" className={classes} key={square} onClick={() => tap(square, piece)} aria-label={`${square}${piece ? ` ${piece}` : ''}`}>
        {piece ? (sprite
          ? <img src={sprite} alt="" draggable={false} className={toppleSquare === square ? 'tapboard__piece--topple' : undefined} style={{ width: '88%', height: '88%', objectFit: 'contain', display: 'block', pointerEvents: 'none', opacity: hideForAnim ? 0 : ghostOpacity, transition: 'opacity .5s' }} />
          : <span data-color={isWhite ? 'white' : 'black'} style={{ opacity: hideForAnim ? 0 : ghostOpacity, transition: 'opacity .5s' }}>{PIECES[piece.toLowerCase()] + '︎'}</span>) : ''}
        {ri === 7 && <i className="tapboard__coord tapboard__coord--file" aria-hidden="true">{FILES[col]}</i>}
        {ci === 0 && <i className="tapboard__coord tapboard__coord--rank" aria-hidden="true">{8 - row}</i>}
      </button>;
    }))}
    {capAnim && (() => {
      const pos = (sq: string) => {
        const f = sq.charCodeAt(0) - 97; const r = parseInt(sq[1], 10);
        const c = orientation === 'w' ? f : 7 - f; const rw = orientation === 'w' ? 8 - r : r - 1;
        return { left: `${c * 12.5}%`, top: `${rw * 12.5}%` };
      };
      const fromPos = pos(capAnim.from); const toPos = pos(capAnim.to);
      const dx = (parseFloat(toPos.left) - parseFloat(fromPos.left)) / 12.5;
      const dy = (parseFloat(toPos.top) - parseFloat(fromPos.top)) / 12.5;
      const moverSprite = sprites[`${capAnim.mover === capAnim.mover.toUpperCase() ? 'w' : 'b'}${capAnim.mover.toLowerCase()}`];
      const capSprite = sprites[`${capAnim.captured === capAnim.captured.toUpperCase() ? 'w' : 'b'}${capAnim.captured.toLowerCase()}`];
      return <>
        {[capAnim.from, ...capAnim.path, capAnim.to].map((sq, i) => <i key={`${capAnim.key}-${sq}`} className="tapboard__pathflash" style={{ ...pos(sq), animationDelay: `${i * 55}ms` }} />)}
        {capSprite && <img key={`cap-${capAnim.key}`} className="tapboard__fallen" style={pos(capAnim.capturedSq)} src={capSprite} alt="" />}
        {moverSprite && <img key={`mv-${capAnim.key}`} className="tapboard__trot" style={{ ...fromPos, ['--dx' as never]: dx, ['--dy' as never]: dy }} src={moverSprite} alt="" />}
      </>;
    })()}
  </div>;
}
