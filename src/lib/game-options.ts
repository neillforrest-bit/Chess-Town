export type GameOption = {
  id: string;
  family: 'trivia' | 'chess';
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
  { id: 'solo', family: 'trivia', title: 'Trivia vs Chester', players: '1 player', description: 'A short five-question contest. Pick three categories and take on Chester. No wildcards or flash finales.', href: '/trivia-brawl?solo=1', action: 'Play Chester' },
  { id: 'trivia-road', family: 'trivia', title: 'Road to the Landlord', players: '1 player · 15 levels', description: 'Five questions per level. Beat Chester to climb through the pub and reach the Landlord.', href: '/road/trivia', action: 'Open the road', note: 'Progress stays in this browser.' },
  { id: 'pass', family: 'trivia', title: 'Pass & Play', players: '2 players · 1 phone', description: 'Take separate turns on one phone. Hand it over between answers, then compare your scores.', href: '/trivia-brawl?pass=1', action: 'Play together' },
  { id: 'quick', family: 'trivia', title: 'Last Call Quiz', players: '1 player · keep going', description: 'One question at a time, ten seconds to answer. Keep collecting points for as long as you like.', href: '/trivia', action: 'Start the quiz' },
  { id: 'chester', family: 'chess', title: 'Chess with Chester', players: '1 player', description: "Start at the opening position with Chester's coaching. Claim the centre and make a plan.", href: '/play-chester', action: 'Play Chester' },
  { id: 'chess-duel', family: 'chess', title: 'Local Chess Duel', players: '2 players · 1 device', description: 'White and Black take turns on the same board. Bring your rival, not an invite link.', href: '/play-chester?mode=1v1', action: 'Play together' },
  { id: 'underdog', family: 'chess', title: 'The Underdog', players: '1 player · house rules', description: 'Take White against Expert Chester. The house gives the underdog a little help.', href: '/brawl', action: 'Choose your level' },
  { id: 'training', family: 'chess', title: 'Chess Mini Games', players: '1 player · 9 challenges', description: 'Practise openings, development, king safety and more. Choose a challenge, then play.', href: '/training', action: 'Choose a challenge' },
  { id: 'daily', family: 'chess', title: 'Daily Challenge', players: '1 player · daily puzzle', description: 'Find the two-move line in today\'s position. Compare the candidate moves and solve the puzzle.', href: '/daily-challenge', action: 'Play today' },
];
