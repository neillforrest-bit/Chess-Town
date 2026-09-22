const PIECES: Record<string, string> = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', P: '♟', R: '♜', N: '♞', B: '♝', Q: '♛', K: '♚' };

function rows(fen: string): string[][] {
  return fen.split(' ')[0].split('/').map((rank) => rank.split('').flatMap((piece) => Number.isInteger(Number(piece)) ? Array(Number(piece)).fill('') : [piece]));
}

export default function NeonChessboard({ fen, label }: { fen: string; label?: string }) {
  return <div className="neon-chessboard" aria-label={label || 'Chess position'}>
    {rows(fen).flatMap((rank, row) => rank.map((piece, col) => {
      const isWhite = piece === piece.toUpperCase();
      return <span className={(row + col) % 2 ? 'neon-chessboard__dark' : 'neon-chessboard__light'} key={`${row}-${col}`}>{piece ? <span data-color={isWhite ? 'white' : 'black'}>{PIECES[piece]}</span> : ''}</span>;
    }))}
  </div>;
}
