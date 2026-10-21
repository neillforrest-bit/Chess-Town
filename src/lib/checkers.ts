// BUILD 166: American/English checkers engine. 8x8, men move/capture forward only, kings one square any diagonal,
// captures MANDATORY, multi-jumps MANDATORY to complete (same piece), crown ends the turn, no flying kings.
// Draw: 80 plies without a capture or man move, or 3-fold repetition. Loss: no legal move / no pieces.
export type Side = 'r' | 'b'; // r moves up the board (rows decreasing), starts at bottom; b starts at top
export type Piece = 'r' | 'R' | 'b' | 'B' | '.';
export type Board = Piece[]; // 64, index = row*8+col, dark squares where (row+col)%2===1
export type CMove = { from: number; to: number; path: number[]; caps: number[]; crown: boolean };

export const initial = (): Board => { const b: Board = Array(64).fill('.'); for (let i = 0; i < 64; i++) { const r = i >> 3, c = i & 7; if ((r + c) % 2 === 1) { if (r < 3) b[i] = 'b'; else if (r > 4) b[i] = 'r'; } } return b; };
const sideOf = (p: Piece): Side | null => (p === 'r' || p === 'R' ? 'r' : p === 'b' || p === 'B' ? 'b' : null);
const isKing = (p: Piece) => p === 'R' || p === 'B';
const dirs = (p: Piece): [number, number][] => (isKing(p) ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : p === 'r' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
const inB = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const crownRow = (s: Side) => (s === 'r' ? 0 : 7);

function jumpsFrom(b: Board, from: number, p: Piece, path: number[], caps: number[], out: CMove[], start: number) {
  const r0 = from >> 3, c0 = from & 7; let any = false;
  for (const [dr, dc] of dirs(p)) {
    const mr = r0 + dr, mc = c0 + dc, lr = r0 + 2 * dr, lc = c0 + 2 * dc;
    if (!inB(lr, lc)) continue;
    const mid = mr * 8 + mc, land = lr * 8 + lc;
    const mp = b[mid]; const s = sideOf(p);
    if (mp === '.' || sideOf(mp) === s || caps.includes(mid)) continue;
    if (b[land] !== '.' && land !== start) continue;
    any = true;
    const crowns = !isKing(p) && lr === crownRow(s as Side);
    const nc = [...caps, mid], np = [...path, land];
    if (crowns) out.push({ from: start, to: land, path: np, caps: nc, crown: true }); // crowning ends the turn
    else jumpsFrom(b, land, p, np, nc, out, start);
  }
  if (!any && caps.length) out.push({ from: start, to: from, path, caps, crown: false });
}

export function legalMoves(b: Board, s: Side): CMove[] {
  const jumps: CMove[] = [], steps: CMove[] = [];
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (sideOf(p) !== s) continue;
    jumpsFrom(b, i, p, [i], [], jumps, i);
    const r = i >> 3, c = i & 7;
    for (const [dr, dc] of dirs(p)) { const nr = r + dr, nc = c + dc; if (inB(nr, nc) && b[nr * 8 + nc] === '.') steps.push({ from: i, to: nr * 8 + nc, path: [i, nr * 8 + nc], caps: [], crown: !isKing(p) && nr === crownRow(s) }); }
  }
  return jumps.length ? jumps : steps; // forced capture
}

export function apply(b: Board, m: CMove): Board {
  const n = b.slice(); const p = n[m.from]; n[m.from] = '.'; for (const c of m.caps) n[c] = '.';
  n[m.to] = m.crown ? (p === 'r' ? 'R' : 'B') : p; return n;
}

export const other = (s: Side): Side => (s === 'r' ? 'b' : 'r');
export const count = (b: Board, s: Side) => { let men = 0, kings = 0; for (const p of b) if (sideOf(p) === s) isKing(p) ? kings++ : men++; return { men, kings }; };

// Evaluation from side `s` perspective, in "men" units (kings 1.6, advancement + centre bonus).
export function evaluate(b: Board, s: Side): number {
  let v = 0;
  for (let i = 0; i < 64; i++) { const p = b[i]; const ps = sideOf(p); if (!ps) continue; const r = i >> 3, c = i & 7;
    let x = isKing(p) ? 1.6 : 1 + (ps === 'r' ? 7 - r : r) * 0.04; if (c >= 2 && c <= 5 && r >= 2 && r <= 5) x += 0.05;
    if (!isKing(p) && ((ps === 'r' && r === 7) || (ps === 'b' && r === 0))) x += 0.1; // back-rank guard
    v += ps === s ? x : -x; }
  return v;
}

function search(b: Board, turn: Side, me: Side, depth: number, alpha: number, beta: number): number {
  const ms = legalMoves(b, turn);
  if (!ms.length) return turn === me ? -100 - depth : 100 + depth;
  if (depth === 0) return evaluate(b, me);
  if (turn === me) { let best = -1e9; for (const m of ms) { best = Math.max(best, search(apply(b, m), other(turn), me, depth - 1, alpha, beta)); alpha = Math.max(alpha, best); if (alpha >= beta) break; } return best; }
  let best = 1e9; for (const m of ms) { best = Math.min(best, search(apply(b, m), other(turn), me, depth - 1, alpha, beta)); beta = Math.min(beta, best); if (alpha >= beta) break; } return best;
}

export function scoreMoves(b: Board, s: Side, depth: number): { m: CMove; v: number }[] {
  return legalMoves(b, s).map((m) => ({ m, v: search(apply(b, m), other(s), s, depth - 1, -1e9, 1e9) })).sort((a, z) => z.v - a.v);
}
export function chooseMove(b: Board, s: Side, level: 'BEGINNER' | 'CASUAL' | 'CLUB' | 'SHARP'): CMove | null {
  const depth = { BEGINNER: 2, CASUAL: 4, CLUB: 6, SHARP: 8 }[level];
  const sc = scoreMoves(b, s, depth); if (!sc.length) return null;
  if (level === 'BEGINNER' && sc.length > 1 && Math.random() < 0.35) return sc[Math.min(sc.length - 1, 1 + Math.floor(Math.random() * 2))].m;
  const top = sc.filter((x) => x.v >= sc[0].v - 0.01); return top[Math.floor(Math.random() * top.length)].m;
}

export type Grade = 'BRILLIANT' | 'STRONG' | 'SOLID' | 'SHAKY' | 'BLUNDER';
export function gradeMove(before: Board, s: Side, m: CMove): { grade: Grade; loss: number; best: CMove | null } {
  const sc = scoreMoves(before, s, 5); if (!sc.length) return { grade: 'SOLID', loss: 0, best: null };
  const mine = sc.find((x) => x.m.from === m.from && x.m.to === m.to && x.m.caps.length === m.caps.length) || sc[sc.length - 1];
  const loss = sc[0].v - mine.v; const second = sc[1]?.v ?? sc[0].v;
  const grade: Grade = loss >= 1.4 ? 'BLUNDER' : loss >= 0.5 ? 'SHAKY' : loss < 0.05 && m.caps.length >= 2 && sc[0].v - second > 0.8 ? 'BRILLIANT' : loss < 0.05 ? 'STRONG' : 'SOLID';
  return { grade, loss, best: sc[0].m };
}

export const sqName = (i: number) => 'abcdefgh'[i & 7] + (8 - (i >> 3));
export const moveText = (m: CMove) => m.path.map(sqName).join(m.caps.length ? 'x' : '-');
export const boardKey = (b: Board, t: Side) => b.join('') + t;

/** Road to King Henry: depth ramps with the level and a slip chance picks a lesser move. depth/slip come from games/checkers/road.ts. */
export function chooseRoadMove(b: Board, s: Side, depth: number, slip: number): CMove | null {
  const sc = scoreMoves(b, s, Math.max(1, depth)); if (!sc.length) return null;
  if (slip > 0 && sc.length > 1 && Math.random() < slip) return sc[1 + Math.floor(Math.random() * Math.min(2, sc.length - 1))].m;
  const top = sc.filter((x) => x.v >= sc[0].v - 0.01); return top[Math.floor(Math.random() * top.length)].m;
}
