'use client';
import { useState } from 'react';
import type { OpponentRow } from '@/lib/opponent-stats';
type Point = { t: number; rating: number };
const date = (t: number) => new Date(t * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export default function OpponentTable({ rows, trajectory, coverage }: { rows: OpponentRow[]; trajectory: Point[]; coverage: string }) {
  const [sort, setSort] = useState('games');
  const [query, setQuery] = useState('');
  const [winner, setWinner] = useState('all');
  const [record, setRecord] = useState('all');
  const visible = rows.filter((r) => r.opponent.toLowerCase().includes(query.trim().toLowerCase())
    && (winner === 'all' || r.lastWinner === winner)
    && (record === 'all' || (record === 'ahead' ? r.wins > r.losses : record === 'behind' ? r.losses > r.wins : r.wins === r.losses)))
    .sort((a, b) => sort === 'games' ? b.games - a.games : sort === 'minutes' ? b.totalMinutes - a.totalMinutes : sort === 'record' ? b.wins / b.games - a.wins / a.games || b.games - a.games : sort === 'recent' ? b.lastPlayed - a.lastPlayed : (b.rapidRating ?? -1) - (a.rapidRating ?? -1));
  const min = Math.min(...trajectory.map((p) => p.rating));
  const max = Math.max(...trajectory.map((p) => p.rating));
  const first = trajectory[0], last = trajectory.at(-1);
  const points = trajectory.map((p) => `${20 + (p.t - (first?.t ?? 0)) / Math.max(1, (last?.t ?? 0) - (first?.t ?? 0)) * 560},${100 - (p.rating - min) / Math.max(1, max - min) * 80}`).join(' ');
  return <section>
    <h2 className="review-h2">Opponents · six calendar months</h2>
    <p className="review-sub">{coverage}. All records below cover only these published games, not lifetime head-to-head history. Chess.com's archive may lag or omit games.</p>
    {first && last ? <>
      <p className="review-sub">Your rapid: {first.rating} → {last.rating} ({last.rating - first.rating >= 0 ? '+' : ''}{last.rating - first.rating}) · peak {max} · {trajectory.length} rapid games</p>
      <svg className="opp-rating-chart" viewBox="0 0 600 135" role="img" aria-label={`Your rapid rating from ${first.rating} on ${date(first.t)} to ${last.rating} on ${date(last.t)}; range ${min} to ${max}`}>
        <title>Your rapid rating in the fetched public archive</title>
        <path d="M20 15V105H580" fill="none" stroke="#65727e" />
        <polyline points={points} fill="none" stroke="#7ef29a" strokeWidth="2" />
        <text x="24" y="128" fill="#e8eef2" fontSize="11">{date(first.t)}</text>
        <text x="576" y="128" fill="#e8eef2" fontSize="11" textAnchor="end">{date(last.t)}</text>
        <text x="24" y="15" fill="#e8eef2" fontSize="11">{min}–{max}</text>
      </svg>
    </> : <p className="review-sub">No rapid ratings in this fetched window.</p>}
    <div className="opp-filters">
      <input className="review-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter opponent name" aria-label="Filter opponents" />
      <select className="review-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort opponents">
        <option value="games">Most games</option><option value="minutes">Most measured time</option><option value="record">Best win rate</option><option value="recent">Most recent encounter</option><option value="rating">Highest rapid at encounter</option>
      </select>
      <select className="review-select" value={record} onChange={(e) => setRecord(e.target.value)} aria-label="Head-to-head record"><option value="all">All W-L records</option><option value="ahead">Winning record</option><option value="behind">Losing record</option><option value="level">Level record</option></select>
      <select className="review-select" value={winner} onChange={(e) => setWinner(e.target.value)} aria-label="Most recent winner"><option value="all">Any latest result</option><option value="you">You won latest</option><option value="opponent">Opponent won latest</option><option value="draw">Latest was drawn</option></select>
    </div>
    <div className="opp-table-wrap"><table className="opp-table">
      <thead><tr><th>Opponent</th><th>Games</th><th>Measured time</th><th>Your W-L-D</th><th>Latest winner</th><th>Rapid at encounter</th></tr></thead>
      <tbody>{visible.slice(0, 50).map((r) => <tr key={r.opponent}>
        <td>{r.opponent}</td><td>{r.games}</td><td>{r.timedGames ? `${r.totalMinutes}m` : 'Unavailable'}<small>{r.timedGames}/{r.games} games timed</small></td>
        <td>{r.wins}-{r.losses}-{r.draws}</td><td>{r.lastWinner === 'you' ? 'You' : r.lastWinner === 'opponent' ? 'Opponent' : 'Draw'}<small>{date(r.lastPlayed)}</small></td>
        <td>{r.rapidRating ?? 'Unavailable'}{r.rapidAt && <small>{date(r.rapidAt)}</small>}</td>
      </tr>)}</tbody>
    </table></div>
    <p className="review-sub">{visible.length === 0 ? 'No opponents match.' : `Showing ${Math.min(50, visible.length)} of ${visible.length} matching opponents.`} Measured time uses recorded start/end times for non-daily games, excludes missing or implausible spans (over 4h), and is not an estimate of active thinking time. Missing time is not zero.</p>
    <p className="review-sub">Rapid ratings are from your latest rapid encounter in this window, not current ratings or the opponent's overall six-month trajectory. Opponent-wide history has not been fetched.</p>
  </section>;
}
