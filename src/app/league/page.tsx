import Link from 'next/link';
export default function LeaguePage() {
  return <main className="league-page"><section><small>CHESS TOWN / STANDINGS</small><h1>League Table</h1>
    <div className="league-empty" role="status"><h2>No live standings yet</h2><p>A verified town results feed is not connected. No players are ranked here yet.</p><p>The old arena contained sample names and ratings. Those are not real standings, so they are not shown as a live league.</p></div>
    <Link href="/battle">Play a friend</Link><br/><Link href="/?choose=mode&town=chess">Back to Game Town</Link>
  </section></main>;
}
