'use client';

const rankings = [
	{ name: 'Charlie', time: '01:14' },
	{ name: 'Wolf', time: '01:45' },
	{ name: 'Brendan', time: '02:03' },
	{ name: 'James', time: '02:27' },
	{ name: 'Kyle', time: '02:58' },
	{ name: 'Marley', time: '03:16' },
	{ name: 'Dilly', time: '04:02' },
];

export default function DailyLeaderboardPage() {
	return <main className="simple-leaderboard">
		<section className="simple-leaderboard__panel" aria-labelledby="leaderboard-title">
			<header><span>DAILY RANKINGS</span><h1 id="leaderboard-title">Daily Chester Challenge: Fastest Solves</h1></header>
			<div className="simple-leaderboard__table" role="table" aria-label="Daily Chester Challenge fastest solves">
				<div className="simple-leaderboard__row simple-leaderboard__head" role="row"><span>RANK</span><span>PLAYER</span><span>TIME</span></div>
				{rankings.map((entry, index) => <div className="simple-leaderboard__row" role="row" key={entry.name}><b>#{index + 1}</b><strong>{entry.name}</strong><time>{entry.time}</time></div>)}
			</div>
		</section>
	</main>;
}
