export type GameOption = {
  id: string;
  family: 'trivia' | 'chess' | 'checkers';
  title: string;
  players: string;
  description: string;
  href: string;
  action: string;
  note?: string;
};

// Only destinations implemented in this branch. Add newer games after their routes are verified.
export const GAME_OPTIONS: GameOption[] = [
  { id: 'brawl', family: 'trivia', title: 'Trivia Brawl', players: '2 players · 2 phones', description: 'Five rounds, five flash finales and four wildcards each. Single topic or a mixed quiz.', href: '/trivia-brawl?host=1', action: 'Host a game', note: 'Joining? Open the invite from your host.' },
  { id: 'party', family: 'trivia', title: 'Party Table', players: '2-5 players · separate phones', description: 'One live quiz for the whole table, with group wildcards and rotating flash rounds.', href: '/trivia-party', action: 'Set up a party', note: 'The host keeps the table open. Group rules apply.' },
  { id: 'solo', family: 'trivia', title: 'Trivia vs Chester', players: '1 player', description: 'Five rounds of five questions, each with a flash finale. Choose a topic or mixed categories, then set your difficulty.', href: '/trivia-brawl?solo=1', action: 'Play Chester' },
  { id: 'trivia-road', family: 'trivia', title: 'Road to the Landlord', players: '1 player · 15 levels', description: 'Beat Chester to climb through fifteen pub tables. Choose your question difficulty in setup.', href: '/road/trivia', action: 'Open the road', note: 'Progress stays in this browser.' },
  { id: 'pass', family: 'trivia', title: 'Pass & Play', players: '2 players · 1 phone', description: 'Take separate turns on one phone. Hand it over between answers, then compare your scores.', href: '/trivia-brawl?pass=1', action: 'Play together' },
  { id: 'quick', family: 'trivia', title: 'Last Call Quiz', players: '1 player · keep going', description: 'One untimed question at a time. Choose Easy, Medium, Hard or Mixed and keep collecting points.', href: '/trivia', action: 'Start the quiz' },
  { id: 'grammar', family: 'trivia', title: 'Grammar', players: 'Solo, one phone or a friend', description: 'Grammar questions at Easy, Medium, Hard or Master. Fifteen seconds per question, with the same Brawl scoring.', href: '/trivia-brawl?topic=grammar', action: 'Choose Grammar mode' },
  { id: 'chester', family: 'chess', title: 'Chess with Chester', players: '1 player', description: "Start at the opening position with Chester's coaching. Claim the centre and make a plan.", href: '/play-chester', action: 'Play Chester' },
  { id: 'chess-duel', family: 'chess', title: 'Local Chess Duel', players: '2 players · 1 device', description: 'White and Black take turns on the same board. Bring your rival, not an invite link.', href: '/play-chester?mode=1v1', action: 'Play together' },
  { id: 'underdog', family: 'chess', title: 'The Underdog', players: '1 player · house rules', description: 'Take White against Expert Chester. The house gives the underdog a little help.', href: '/brawl', action: 'Choose your level' },
  { id: 'training', family: 'chess', title: 'Chess Lessons', players: '1 player · 9 challenges', description: 'Practise openings, development, king safety and more. Choose a challenge, then play.', href: '/training', action: 'Choose a challenge' },
  { id: 'daily', family: 'chess', title: 'Daily Challenge', players: '1 player · daily puzzle', description: 'Find the two-move line in today\'s position. Compare the candidate moves and solve the puzzle.', href: '/daily-challenge', action: 'Play today' },
  { id:'chess-battle',family:'chess',title:'Live Chess Battle',players:'2 players · separate devices',description:'Invite a friend to your live chess board.',href:'/battle',action:'Open live battle'},
  { id:'chess-road',family:'chess',title:'Road to Joseph',players:'1 player',description:'Climb fifteen chess levels and meet the bosses.',href:'/road/chess',action:'Open the road'},
  { id:'brendo',family:'chess',title:'Road to Brendo',players:'1 player',description:'PJ, Rost, Andy, Byron and Brendo. A shorter teaching road.',href:'/road/brendo',action:'Open Brendo road'},
  { id:'review',family:'chess',title:'Chester Highlights',players:'1 player',description:'Review your Chess.com games, replay the moves and find your turning points.',href:'/review',action:'Review my games'},
  { id:'surprise',family:'chess',title:'Surprise Lab',players:'1 player',description:'Learn unusual openings with guided replies and no-hints practice.',href:'/surprise-lab',action:'Explore openings'},
  { id:'learning',family:'chess',title:'My Learning',players:'1 player',description:'Find your patterns and what to practise next.',href:'/learn',action:'Open my learning'},
  { id:'mistakes',family:'chess',title:'Fix My Mistakes',players:'1 player',description:'Puzzles built from your own slips.',href:'/puzzle-mill',action:'Practise mistakes'},
  { id:'league',family:'chess',title:'League Table',players:'Town standings',description:'See where the town ranks.',href:'/league',action:'See the table'},
  { id:'checkers-solo',family:'checkers',title:'Checkers with Chester',players:'1 player',description:'Forced jumps, kings and Chester across the board.',href:'/play-checkers?mode=chester',action:'Play Chester'},
  { id:'checkers-battle',family:'checkers',title:'Checkers Battle',players:'2 players · separate devices',description:'Invite a friend to a live checkers board.',href:'/play-checkers?mode=battle',action:'Host a battle'},
  { id:'checkers-road',family:'checkers',title:'Checkers Road',players:'1 player',description:'Climb the board and meet the bosses.',href:'/road/checkers',action:'Open the road'},
];
