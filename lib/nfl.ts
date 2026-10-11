export type Q = { q: string; options: string[]; answer: number; live?: boolean };

const STATIC: Q[] = [
  { q: "How many points is a touchdown worth?", options: ["3", "6", "7", "8"], answer: 1 },
  { q: "What is it called when the defense tackles the quarterback behind the line of scrimmage?", options: ["Blitz", "Sack", "Pick", "Fumble"], answer: 1 },
  { q: "How many minutes are in one NFL quarter?", options: ["10", "12", "15", "20"], answer: 2 },
  { q: "A safety is worth how many points?", options: ["1", "2", "3", "6"], answer: 1 },
  { q: "Which position throws the ball the most?", options: ["Running back", "Wide receiver", "Quarterback", "Linebacker"], answer: 2 },
  { q: "What does NFL stand for?", options: ["National Football League", "National Field League", "North Football League", "National Football Lineup"], answer: 0 },
  { q: "How many teams from each conference make the NFL playoffs?", options: ["5", "6", "7", "8"], answer: 2 },
  { q: "Which of these teams has won 6 Super Bowls?", options: ["Dallas Cowboys", "San Francisco 49ers", "New England Patriots", "Green Bay Packers"], answer: 2 },
  { q: "How many yards for a first down?", options: ["5", "10", "15", "20"], answer: 1 },
  { q: "What happens after a touchdown before the extra point or 2-point try?", options: ["Kickoff", "Coin toss", "Nothing", "Two-minute warning"], answer: 0 },
];

type Ev = { status: { type: { state: string; description: string } }; competitions: { competitors: { homeAway: string; team: { displayName: string }; score?: string }[] }[] };

const shuffle = <T,>(a: T[]): T[] => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function genQuestions(events: Ev[], rng: () => number = Math.random): Q[] {
  const live: Q[] = [];
  const inProg = events.filter((e) => e.status.type.state === "in");
  const pre = events.filter((e) => e.status.type.state === "pre");
  const post = events.filter((e) => e.status.type.state === "post");
  const names = (e: Ev) => {
    const cs = e.competitions[0].competitors;
    const home = cs.find((c) => c.homeAway === "home")!;
    const away = cs.find((c) => c.homeAway === "away")!;
    return { home: home.team.displayName, away: away.team.displayName, hs: +(home.score || 0), as: +(away.score || 0) };
  };
  const pick = <T,>(arr: T[], n: number): T[] => shuffle([...arr]).slice(0, n);

  // 1. Who's winning right now (up to 4 in-progress games)
  for (const e of pick(inProg, 4)) {
    const { home, away, hs, as } = names(e);
    const tied = hs === as;
    const opts = shuffle([away, home, "It's tied", "Not started yet"]);
    const correct = tied ? "It's tied" : hs > as ? home : away;
    live.push({ q: `LIVE: Who's winning - ${away} or ${home}?`, options: opts, answer: opts.indexOf(correct), live: true });
  }
  // 2. Margin question on one in-progress game with a lead
  const withLead = inProg.map((e) => names(e)).filter((g) => g.hs !== g.as);
  if (withLead.length) {
    const g = withLead[Math.floor(rng() * withLead.length)];
    const [leader, trailer] = g.hs > g.as ? [g.home, g.away] : [g.away, g.home];
    const m = Math.abs(g.hs - g.as);
    const opts = shuffle([`${m} points`, `${m + 3} points`, `${m + 7} points`, `${m + 14} points`]);
    live.push({ q: `LIVE: The ${leader} lead the ${trailer} by how much?`, options: opts, answer: opts.indexOf(`${m} points`), live: true });
  }
  // 3. Which game is on right now (needs 1 in-progress + 3 pre)
  if (inProg.length >= 1 && pre.length >= 3) {
    const on = names(inProg[Math.floor(rng() * inProg.length)]);
    const fakes = pick(pre, 3).map((e) => { const g = names(e); return `${g.away} vs ${g.home}`; });
    const real = `${on.away} vs ${on.home}`;
    const opts = shuffle([real, ...fakes]);
    live.push({ q: "LIVE: Which of these games is being played right now?", options: opts, answer: opts.indexOf(real), live: true });
  }
  // 4. Final result today
  if (post.length) {
    const g = names(post[Math.floor(rng() * post.length)]);
    const tied = g.hs === g.as;
    const winner = g.hs > g.as ? g.home : g.away;
    const opts = shuffle([g.away, g.home, "It ended in a tie"]);
    live.push({ q: `FINAL today: ${g.away} ${g.as} - ${g.hs} ${g.home}. Who won?`, options: opts, answer: opts.indexOf(tied ? "It ended in a tie" : winner), live: true });
  }
  // 5. One fake matchup among today's real remaining slate
  if (pre.length >= 3) {
    const reals = pick(pre, 3).map((e) => { const g = names(e); return `${g.away} vs ${g.home}`; });
    const fake = "Toronto Argonauts vs Memphis Showboats";
    const opts = shuffle([fake, ...reals]);
    live.push({ q: "Which of these is NOT on today's NFL slate?", options: opts, answer: opts.indexOf(fake), live: true });
  }

  const all = shuffle([...live, ...shuffle([...STATIC])]).slice(0, 12);
  // top up if live slate was thin
  let i = 0;
  while (all.length < 12 && i < STATIC.length) { if (!all.includes(STATIC[i])) all.push(STATIC[i]); i++; }
  return all;
}
