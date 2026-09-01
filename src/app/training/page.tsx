'use client';

import { Chess, type Square } from 'chess.js';
import { useState } from 'react';

const drills = ['Daily Breakthrough', 'Practice Your Opening', 'Own the Center', 'Bring Out the Squad', 'Castle Before Chaos', 'Build the Squeeze', 'Convert the Advantage', 'The Knightmare', 'Phantom Threat'];
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const pieceGlyphs: Record<string, string> = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };

export default function TrainingPage() {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [drill, setDrill] = useState(drills[0]);

  const onPieceDrop = (source: Square, target: Square) => {
    const nextGame = new Chess(game.fen());
    try {
      const move = nextGame.move({ from: source, to: target, promotion: 'q' });
      if (!move) return false;
      setGame(nextGame);
      setMoveHistory((history) => [...history, move.san]);
      return true;
    } catch {
      return false;
    }
  };

  const chooseSquare = (square: Square) => {
    if (!selectedSquare) {
      if (game.get(square)?.color === game.turn()) setSelectedSquare(square);
      return;
    }
    if (selectedSquare === square) return setSelectedSquare(null);
    const moved = onPieceDrop(selectedSquare, square);
    setSelectedSquare(moved ? null : game.get(square)?.color === game.turn() ? square : null);
  };

  const resetBoard = () => {
    setGame(new Chess());
    setMoveHistory([]);
    setSelectedSquare(null);
  };

  return <main className="training-page">
    <div className="training-chat"><b>CHESTER</b><span>{drill}: choose a piece, then tap its destination.</span></div>
    <section className="training-board" aria-label="Interactive training chessboard">
      {game.board().flatMap((rank, rankIndex) => rank.map((piece, fileIndex) => {
        const square = `${files[fileIndex]}${8 - rankIndex}` as Square;
        const glyph = piece ? pieceGlyphs[piece.type] : '';
        return <button key={square} type="button" onClick={() => chooseSquare(square)} className={`training-square ${(rankIndex + fileIndex) % 2 ? 'training-square--dark' : 'training-square--light'} ${selectedSquare === square ? 'is-selected' : ''}`} aria-label={piece ? `${square} ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : square}>{glyph && <span data-color={piece?.color}>{glyph}</span>}</button>;
      }))}
    </section>
    <section className="training-controls" aria-label="Training controls">
      <label>MINI GAME<select value={drill} onChange={(event) => setDrill(event.target.value)}>{drills.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button type="button" onClick={resetBoard}>RESET BOARD</button>
      <p><b>MOVES</b> {moveHistory.length ? moveHistory.join('  ') : 'No moves recorded.'}</p>
    </section>
  </main>;
}