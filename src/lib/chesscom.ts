// GAME REVIEW (stage A) - Chess.com public archive import. No login: the PubAPI is public
// and CORS-open (verified 7 Nov 2026: access-control-allow-origin: *). Serial requests only -
// parallel month pulls get 429s. Data can lag up to 12h and completeness is not guaranteed;
// we say so in the UI rather than promise a full history.
// Official docs: https://www.chess.com/news/view/published-data-api
import { Chess } from 'chess.js';

export type CcGame = {
  url: string;
  endTime: number;          // unix seconds
  timeClass: string;        // rapid | blitz | bullet | daily
  timeControl: string;      // e.g. "600", "180+2"
  rated: boolean;
  userColor: 'w' | 'b';
  opponent: string;
  opponentRating: number | null;
  userRating: number | null;
  result: 'win' | 'loss' | 'draw';
  termination: string;      // plain reason from the PGN header, e.g. "won by checkmate"
  ecoName: string | null;   // from the ECOUrl slug
  pgn: string;
};

export type ParsedMove = { ply: number; san: string; uci: string; fenBefore: string; fenAfter: string; clkSec: number | null; mover: 'w' | 'b' };

/** Short honest end phrase from the PGN Termination header, e.g. "by checkmate". */
export function endPhrase(termination: string): string {
  const m = termination.match(/by (checkmate|resignation|stalemate|repetition|timeout|insufficient material)/i);
  if (m) return `by ${m[1].toLowerCase()}`;
  if (/on time/i.test(termination)) return 'on time';
  if (/abandoned/i.test(termination)) return '- game abandoned';
  return '';
}

function resultFor(userResult: string): CcGame['result'] {
  if (userResult === 'win') return 'win';
  // Chess.com loss codes: checkmated, resigned, timeout, abandoned, lose...
  if (['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(userResult)) return 'draw';
  return 'loss';
}

function ecoNameFromUrl(eco: unknown): string | null {
  if (typeof eco !== 'string' || !eco.includes('/openings/')) return null;
  const slug = eco.split('/openings/')[1] || '';
  const name = decodeURIComponent(slug).replace(/-/g, ' ').trim();
  if (!name || /undefined/i.test(name)) return null;
  return name;
}

export async function fetchArchives(username: string): Promise<string[]> {
  const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/archives`);
  if (res.status === 404) throw new Error('No Chess.com account with that name.');
  if (!res.ok) throw new Error(`Chess.com said ${res.status} - try again in a minute.`);
  const data = await res.json();
  return Array.isArray(data.archives) ? data.archives : [];
}

export async function fetchMonth(archiveUrl: string, username: string): Promise<CcGame[]> {
  const res = await fetch(archiveUrl);
  if (!res.ok) throw new Error(`Chess.com said ${res.status} - try again in a minute.`);
  const data = await res.json();
  const uname = username.toLowerCase();
  const games = Array.isArray(data.games) ? data.games : [];
  return games
    .filter((g: any) => g && g.pgn && (g.white?.username?.toLowerCase() === uname || g.black?.username?.toLowerCase() === uname))
    .map((g: any): CcGame => {
      const asWhite = g.white.username.toLowerCase() === uname;
      const me = asWhite ? g.white : g.black;
      const them = asWhite ? g.black : g.white;
      const termMatch = typeof g.pgn === 'string' ? g.pgn.match(/\[Termination "([^"]+)"\]/) : null;
      return {
        url: g.url, endTime: g.end_time, timeClass: g.time_class, timeControl: g.time_control,
        rated: Boolean(g.rated), userColor: asWhite ? 'w' : 'b',
        opponent: them.username, opponentRating: them.rating ?? null, userRating: me.rating ?? null,
        result: resultFor(me.result), termination: termMatch ? termMatch[1] : '',
        ecoName: ecoNameFromUrl(g.eco), pgn: g.pgn,
      };
    })
    .sort((a: CcGame, b: CcGame) => b.endTime - a.endTime);
}

/** Parse a live-chess PGN into per-ply moves with FENs and clock seconds. Never trusts
 *  hand-built positions: every FEN comes out of chess.js after a verified move. */
export function parseGamePgn(pgn: string): ParsedMove[] {
  // Capture [%clk h:mm:ss.s] comments attached to each move.
  const tokens = pgn
    .replace(/\{(\[[^\]]*\]\s*)*([^{}]*)\}/g, (_m, _tags, inner) => {
      const clk = (_m.match(/\[%clk ([\d:.]+)\]/) || [])[1];
      return clk ? ` __CLK${clk}__ ` : ' ';
    })
    .replace(/\[[^\]]*\]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
  const chess = new Chess();
  const moves: ParsedMove[] = [];
  for (const tok of tokens) {
    const clkMatch = tok.match(/^__CLK([\d:.]+)__$/);
    if (clkMatch) {
      // A [%clk] comment annotates the move just played (clock after that move).
      const parts = clkMatch[1].split(':').map(Number);
      const clkSec = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
      if (moves.length) moves[moves.length - 1].clkSec = clkSec;
      continue;
    }
    const fenBefore = chess.fen();
    const mover = chess.turn();
    let mv;
    try { mv = chess.move(tok); } catch { break; } // stop at first unreadable token, keep the verified prefix
    if (!mv) break;
    moves.push({ ply: moves.length + 1, san: mv.san, uci: mv.from + mv.to + (mv.promotion || ''), fenBefore, fenAfter: chess.fen(), clkSec: null, mover });
  }
  return moves;
}
