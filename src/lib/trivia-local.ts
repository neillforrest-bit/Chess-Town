// BUILD 117 - his 1:31am sprint: trivia night for him and Jemma.
// Local town-flavored category pack (negative ids never collide with OpenTDB),
// plus Chester's host voice banks - all deterministic, zero per-question cost.

export type LocalCategory = { id: number; name: string };
export type LocalQuestion = { question: string; correct: string; wrong: [string, string, string] };

export const LOCAL_CATEGORIES: LocalCategory[] = [
  { id: -1, name: '♞ Chess-Town' },
  { id: -2, name: '🍻 Pub Culture' },
  { id: -3, name: '🎬 Movie Night' },
  { id: -4, name: '🇬🇧 Blighty' },
];

export const LOCAL_QUESTIONS: Record<number, LocalQuestion[]> = {
  [-1]: [
    { question: 'How many squares are there on a standard chessboard?', correct: '64', wrong: ['48', '72', '81'] },
    { question: 'Which piece can only ever move diagonally?', correct: 'The bishop', wrong: ['The knight', 'The rook', 'The queen'] },
    { question: 'What is it called when the king is attacked and cannot escape?', correct: 'Checkmate', wrong: ['Stalemate', 'Check', 'Castling'] },
    { question: 'Which piece moves in an L-shape?', correct: 'The knight', wrong: ['The bishop', 'The pawn', 'The rook'] },
    { question: 'How many pawns does each player start with?', correct: '8', wrong: ['6', '7', '10'] },
    { question: 'When a pawn reaches the far side of the board, most players promote it to a...', correct: 'Queen', wrong: ['King', 'Second pawn', 'Bishop'] },
  ],
  [-2]: [
    { question: 'What does IPA stand for?', correct: 'India Pale Ale', wrong: ['International Pub Ale', 'Irish Pale Ale', 'Imperial Porter Ale'] },
    { question: 'Which country is home to the Guinness brewery?', correct: 'Ireland', wrong: ['Scotland', 'England', 'Wales'] },
    { question: 'A "session beer" is known for what?', correct: 'Lower alcohol, so you can enjoy a few', wrong: ['Extra strength', 'Being served warm', 'Only brewed in winter'] },
    { question: 'Which spirit is the base of a classic Moscow Mule?', correct: 'Vodka', wrong: ['Gin', 'Rum', 'Whiskey'] },
    { question: 'Prosecco comes from which country?', correct: 'Italy', wrong: ['France', 'Spain', 'Portugal'] },
    { question: 'What is the name for the mixture of beer and lemonade popular in British pubs?', correct: 'Shandy', wrong: ['Snakebite', 'Mickey Finn', 'Black Velvet'] },
  ],
  [-3]: [
    { question: 'Who directed Jaws?', correct: 'Steven Spielberg', wrong: ['George Lucas', 'James Cameron', 'Ridley Scott'] },
    { question: '"Here\'s looking at you, kid" is from which film?', correct: 'Casablanca', wrong: ['The Godfather', 'Gone with the Wind', 'Star Wars'] },
    { question: 'Which animated film features a clownfish called Nemo?', correct: 'Finding Nemo', wrong: ['Shark Tale', 'The Little Mermaid', 'Moana'] },
    { question: 'In The Lion King, what is Simba\'s father called?', correct: 'Mufasa', wrong: ['Scar', 'Rafiki', 'Timon'] },
    { question: 'Which actor played Jack in Titanic?', correct: 'Leonardo DiCaprio', wrong: ['Brad Pitt', 'Matt Damon', 'Tom Cruise'] },
    { question: '"May the Force be with you" comes from which saga?', correct: 'Star Wars', wrong: ['Star Trek', 'Harry Potter', 'The Matrix'] },
  ],
  [-4]: [
    { question: 'What is the capital of Scotland?', correct: 'Edinburgh', wrong: ['Glasgow', 'Aberdeen', 'Dundee'] },
    { question: 'Which river runs through London?', correct: 'The Thames', wrong: ['The Severn', 'The Mersey', 'The Tyne'] },
    { question: 'How many countries make up the United Kingdom?', correct: '4', wrong: ['3', '5', '6'] },
    { question: 'The bell known as Big Ben hangs in which tower?', correct: 'The Elizabeth Tower', wrong: ['Tower Bridge', 'The Shard', 'The BT Tower'] },
    { question: 'What colour are London\'s iconic double-decker buses?', correct: 'Red', wrong: ['Blue', 'Green', 'Black'] },
    { question: 'Which flower is the national emblem of England?', correct: 'The rose', wrong: ['The thistle', 'The daffodil', 'The shamrock'] },
  ],
};

// Chester's round intros, keyed by category flavor. Warm, pub-host energy, layman-safe.
const CATEGORY_QUIPS: Array<[RegExp, string]> = [
  [/chess/i, 'Home turf, this one. Chester is polishing a hoof and pretending not to watch.'],
  [/pub/i, 'House specialty. Wrong answers traditionally buy the next round.'],
  [/movie|film|cinema/i, 'Popcorn round. Silence in the stalls, shouting in the answers.'],
  [/blighty|british/i, 'Local knowledge. Passport stamps optional, confidence mandatory.'],
  [/sport/i, 'Elbows warmed up - this one separates the players from the watchers.'],
  [/science|nature/i, 'Lab coats on. Guessing technically counts as an experiment.'],
  [/history/i, 'Dust off the past - it is about to be graded.'],
  [/geography/i, 'Pack a bag. We are going somewhere neither of you has been.'],
  [/music|musical/i, 'Turn it up. Humming the answer still counts as answering.'],
  [/television/i, 'Remotes down. This is the one screen you are allowed to shout at.'],
  [/book|literature/i, 'Library voices, please - loud wrong answers echo forever.'],
  [/video game/i, 'Controller grips ready. Button-mashing will not save you here.'],
  [/animal/i, 'The animal kingdom sends its regards and its trick questions.'],
  [/art/i, 'Berets optional. Opinions mandatory.'],
  [/mytholog/i, 'Gods, monsters, and one of you about to look very heroic.'],
  [/general/i, 'A bit of everything - the lucky dip of the trivia world.'],
  [/politic/i, 'No speeches, no filibuster - just the right answer, please.'],
  [/vehicle/i, 'Engines running. Hands at ten and two on those buzzers.'],
  [/celebrit/i, 'Autographs later. Answers first.'],
  [/comic|anime|cartoon/i, 'Cape on. Even superheroes get one wrong sometimes.'],
];

const DEFAULT_QUIPS = [
  'The tap is flowing and so is the confidence.',
  'Chester has seen empires fall on questions like this.',
  'Eyes up, phones down - this one is pure brain.',
  'The whole pub just leaned in. No pressure.',
];

export function categoryQuip(categoryName: string, seed = 0): string {
  for (const [pattern, quip] of CATEGORY_QUIPS) if (pattern.test(categoryName)) return quip;
  return DEFAULT_QUIPS[Math.abs(seed) % DEFAULT_QUIPS.length];
}

// Banter for the brawl when the LLM is quiet or offline - the host never goes silent.
export const BRAWL_BANTER = {
  bothRight: [
    'Two clean hits. The bar applauds both corners.',
    'Nobody blinked. Chester underlines both names with a flourish.',
  ],
  bothWrong: [
    'The bar winces in unison. Nobody speaks of this round again.',
    'Two swings, two misses. Chester quietly turns the ledger page.',
  ],
  oneRight: [
    'One clean hit, one swing at the air. The pub loves a gap in the scoreline.',
    'A point separates the brave from the nearly-brave.',
  ],
};
