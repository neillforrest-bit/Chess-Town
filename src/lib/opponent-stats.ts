// OPPONENT STATS (stage B) - aggregates the user's fetched archive months into a per-opponent
// table. Metadata only: no engine analysis. Ratings are the ratings AT each game (the only
// truthful thing the archive gives us); live current ratings need a per-opponent stats call
// and stay lazy. Duration comes from the PGN StartTime/EndTime headers; daily games and any
// game missing headers contribute no duration (we never invent one).
import type { CcGame } from './chesscom';

export type OpponentRow = {
  opponent: string;
  games: number;
  wins: number;           // user wins
  losses: number;
  draws: number;
  totalMinutes: number;   // sum over games with usable clock headers (0 counted games => 0)
  timedGames: number;     // how many games contributed a duration - partial coverage stays visible
  lastWinner: 'you' | 'opponent' | 'draw';
  lastPlayed: number;     // unix seconds of most recent encounter
  lastRating: number | null;       // opponent rating at the most recent encounter
  lastRatingClass: string | null;  // time class that rating belongs to ('rapid', 'blitz', ...)
  firstRating: number | null;      // opponent rating at the first encounter in the fetched range
  firstRatingClass: string | null;
  // NOTE: first/last ratings span only the user's encounters with this opponent in the
  // fetched window - they are not the opponent's overall trajectory over the period.
};

/** Wall-clock minutes between the PGN's StartTime/EndTime headers, or null when absent or
 *  implausible for a single sitting (>4h). Callers skip daily-class games separately; this
 *  only measures what the headers record, it does not infer time class. */
export function durationMinutesFromPgn(pgn: string): number | null {
  const st = pgn.match(/\[StartTime "(\d+):(\d+):(\d+)"\]/);
  const et = pgn.match(/\[EndTime "(\d+):(\d+):(\d+)"\]/);
  if (!st || !et) return null;
  const start = (+st[1]) * 3600 + (+st[2]) * 60 + (+st[3]);
  let end = (+et[1]) * 3600 + (+et[2]) * 60 + (+et[3]);
  const sd = pgn.match(/\[UTCDate "([^"]+)"\]/);
  const ed = pgn.match(/\[EndDate "([^"]+)"\]/);
  if (sd && ed && ed[1] !== sd[1]) end += 24 * 3600; // crosses midnight via UTCDate/EndDate
  const mins = (end - start) / 60;
  if (!Number.isFinite(mins) || mins < 0 || mins > 240) return null; // >4h is not a single live sitting
  return Math.round(mins);
}

export function buildOpponentRows(games: CcGame[]): OpponentRow[] {
  const byOpp = new Map<string, CcGame[]>();
  for (const g of games) {
    const list = byOpp.get(g.opponent) ?? [];
    list.push(g);
    byOpp.set(g.opponent, list);
  }
  const rows: OpponentRow[] = [];
  for (const [opponent, list] of byOpp) {
    const asc = [...list].sort((a, b) => a.endTime - b.endTime);
    const latest = asc[asc.length - 1];
    let totalMinutes = 0;
    let timedGames = 0;
    for (const g of asc) {
      if (g.timeClass === 'daily') continue; // daily games span days; header span is not playing time
      const d = durationMinutesFromPgn(g.pgn);
      if (d != null) { totalMinutes += d; timedGames++; }
    }
    rows.push({
      opponent,
      games: asc.length,
      wins: asc.filter((g) => g.result === 'win').length,
      losses: asc.filter((g) => g.result === 'loss').length,
      draws: asc.filter((g) => g.result === 'draw').length,
      totalMinutes, timedGames,
      lastWinner: latest.result === 'win' ? 'you' : latest.result === 'loss' ? 'opponent' : 'draw',
      lastPlayed: latest.endTime,
      lastRating: latest.opponentRating, lastRatingClass: latest.timeClass,
      firstRating: asc[0].opponentRating, firstRatingClass: asc[0].timeClass,
    });
  }
  return rows.sort((a, b) => b.games - a.games || b.lastPlayed - a.lastPlayed);
}

/** The user's rapid rating after each rapid game, oldest first - their own 6-month
 *  trajectory is complete because every archived game carries both players' ratings. */
export function userRapidTrajectory(games: CcGame[]): { t: number; rating: number }[] {
  return games
    .filter((g) => g.timeClass === 'rapid' && g.userRating != null)
    .sort((a, b) => a.endTime - b.endTime)
    .map((g) => ({ t: g.endTime, rating: g.userRating as number }));
}
