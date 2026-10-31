// BUILD 117 - his 1:31am sprint: trivia night for him and Jemma.
// Local town-flavored category pack (negative ids never collide with OpenTDB),
// plus Chester's host voice banks - all deterministic, zero per-question cost.

export type LocalCategory = { id: number; name: string };
export type LocalQuestion = { question: string; correct: string; wrong: [string, string, string] };

import { SEASON_TWO_CATEGORIES, SEASON_TWO_QUESTIONS } from './trivia-packs';

export const LOCAL_CATEGORIES: LocalCategory[] = [
  { id: -1, name: '♞ Chess-Town' },
  { id: -2, name: '🍻 Pub Culture' },
  { id: -3, name: '🎬 Movie Night' },
  { id: -4, name: '🇬🇧 Blighty' },
  ...SEASON_TWO_CATEGORIES,
];

export const BASE_QUESTIONS: Record<number, LocalQuestion[]> = {
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

export const LOCAL_QUESTIONS: Record<number, LocalQuestion[]> = (() => {
  const merged: Record<number, LocalQuestion[]> = {};
  for (const [id, list] of Object.entries(BASE_QUESTIONS)) merged[Number(id)] = [...list];
  for (const [id, list] of Object.entries(SEASON_TWO_QUESTIONS)) merged[Number(id)] = [...(merged[Number(id)] || []), ...list];
  return merged;
})();

export function localCategoryName(id: number): string {
  return (LOCAL_CATEGORIES.find((c) => c.id === id)?.name || 'House Special').replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

// Season Two: never serve the same house question twice until the whole shelf is used.
const SEEN_KEY = 'ct-trivia-seen-v1';
export function pickLocalQuestion(categoryId: number): LocalQuestion | null {
  const pack = LOCAL_QUESTIONS[categoryId] || [];
  if (!pack.length) return null;
  let seen: Record<string, string[]> = {};
  try { seen = JSON.parse(window.localStorage.getItem(SEEN_KEY) || '{}'); } catch { /* private browsing */ }
  let used = seen[categoryId] || [];
  let fresh = pack.filter((item) => !used.includes(item.question));
  if (!fresh.length) { used = []; fresh = pack; }
  const choice = fresh[Math.floor(Math.random() * fresh.length)];
  try { seen[categoryId] = [...used, choice.question]; window.localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch { /* best effort */ }
  return choice;
}

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
  [/brainbox/i, 'Lab coats on, Chester has been reading the back of the crisp packets again.'],
  [/kitchen/i, 'Apron up. Chester guarantees at least one answer will make you hungry.'],
  [/wide world/i, 'Passports out. Chester has never left the pub but knows everything about everywhere.'],
  [/jukebox/i, 'Drop a coin in. Humming the answer still counts as answering.'],
  [/time machine/i, 'Hold tight. Chester was there, he says, and he is not going to say which century.'],
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


// BUILD 183 - five rounds of five: Chester's temperature rises with the match.
// All local, all free - the paid brawl commentary stays the premium voice on top.

// Round intros, coldest to hottest. Indexed by round; variants rotate by seed.
export const ROULETTE_LINES = [
  '*ding ding ding* Chester rings the bell! MYSTERY POUR - a category nobody drafted, and it pays TRIPLE.',
  'Bell behind the bar! This one is a mystery pour, friends. Triple points, no refunds.',
  'Chester spins the roulette wheel... mystery category, TRIPLE points. Fortune favours the thirsty.',
];

export const ROUND_INTROS: string[][] = [
  [
    'Round one - easy pours to open the tab. Confidence is free at this stage.',
    'First round, gentle glasses. Even the bar dog gets these.',
  ],
  [
    'Round two, still friendly. The pub is watching politely.',
    'Second round. Chester refills the peanuts and raises one eyebrow.',
  ],
  [
    'Round three - the medium heat. This is where the pub quiz usually turns.',
    'Halftime approaches and the questions stop being polite.',
  ],
  [
    'Round four. The regulars have gone quiet. Someone here is sweating.',
    'Fourth round, medium-hot. Chester has stopped polishing glasses to watch.',
  ],
  [
    'LAST CALL. Round five - the hard stuff. Chester dims the lights.',
    'Final round, top shelf only. The whole pub leans in.',
  ],
];

// Per-question reveal quips, tiered by match heat (early / mid / late).
export const REVEAL_QUIPS: Record<'bothRight' | 'bothWrong' | 'oneRight', string[][]> = {
  bothRight: [
    ['Two clean hits. The bar applauds both corners.', 'Nobody blinked. Chester underlines both names.'],
    ['Both right - this is becoming a proper duel.', 'Two more clean hits. The ledger is getting crowded.'],
    ['Both right under pressure. Chester is genuinely impressed, which is unsettling.', 'No quarter given, none taken. The finale neither of you asked for.'],
  ],
  bothWrong: [
    ['The bar winces in unison. Nobody speaks of this one again.', 'Two swings, two misses. Chester quietly turns the ledger page.'],
    ['Both wrong. The medium heat claims its first victims.', 'A shared stumble. Chester pretends not to enjoy this.'],
    ['Both wrong at the sharp end. The pub gasps - genuinely.', 'Nobody had that. LAST CALL shows no mercy.'],
  ],
  oneRight: [
    ['One clean hit, one swing at the air. The pub loves a gap in the scoreline.', 'A point separates the brave from the nearly-brave.'],
    ['One of you read the room. The other read something else entirely.', 'A single hit. The gap widens and Chester has opinions.'],
    ['One stands tall at the business end. The other needs a miracle or a malt.', 'Only one hand stayed steady. This is where tabs are won.'],
  ],
};

export function revealQuip(outcome: 'bothRight' | 'bothWrong' | 'oneRight', round: number, seed: number): string {
  const heat = round <= 1 ? 0 : round <= 3 ? 1 : 2;
  const pool = REVEAL_QUIPS[outcome][heat];
  return pool[Math.abs(seed) % pool.length];
}

// End-of-round summary line: leader-aware, escalating. Names and score do the work.
export function roundEndLine(roundIndex: number, p1Name: string, p2Name: string, p1Score: number, p2Score: number, lastCall: boolean): string {
  const margin = Math.abs(p1Score - p2Score);
  const leader = p1Score === p2Score ? null : p1Score > p2Score ? p1Name : p2Name;
  const trailer = leader === p1Name ? p2Name : p1Name;
  if (lastCall) return 'LAST CALL. Dead heat. One hard question at a time until somebody blinks.';
  if (roundIndex >= 4) {
    if (!leader) return 'A dead heat after five rounds. Chester refuses a draw - the pub demands LAST CALL.';
    return `${leader} takes the tab by ${margin}. ${trailer}, the rematch button is right there.`;
  }
  const stage = ['One round down', 'Two rounds poured', 'Three rounds in', 'One round to go'][roundIndex] || 'The match rolls on';
  if (!leader) return `${stage} and dead level at ${p1Score} apiece. Somebody blink soon.`;
  if (margin === 1) return `${stage}: ${leader} noses in front by a single point. ${trailer} is one clean hit from silence.`;
  return `${stage}: ${leader} leads by ${margin}. ${trailer}, the regulars believe in a comeback. Chester does not.`;
}

// BUILD 184 - Flash Finale: one bonus double-points pour at the end of every round.
// Five flash types, one per round in a shuffled deal. All hand-written, all free.

export const RIDDLE_PACK: LocalQuestion[] = [
  { question: 'I speak without a mouth and hear without ears. What am I?', correct: 'An echo', wrong: ['A shadow', 'A mirror', 'A drum'] },
  { question: 'The more of me you take, the more you leave behind. What am I?', correct: 'Footsteps', wrong: ['Time', 'Breath', 'Memories'] },
  { question: 'What has keys but cannot open a single lock?', correct: 'A piano', wrong: ['A janitor', 'A treasure chest', 'A map'] },
  { question: 'What gets wetter the more it dries?', correct: 'A towel', wrong: ['A raincoat', 'A bar of soap', 'A cloud'] },
  { question: 'What has a head and a tail but no body?', correct: 'A coin', wrong: ['A tadpole', 'A drum', 'A kite'] },
  { question: 'What can you catch but never throw?', correct: 'A cold', wrong: ['A ball', 'A frisbee', 'A fish'] },
  { question: 'What has hands but cannot clap?', correct: 'A clock', wrong: ['A statue', 'A conductor', 'A scarecrow'] },
  { question: 'The more you have of me, the less you see. What am I?', correct: 'Darkness', wrong: ['Bright light', 'A crowd', 'Loud noise'] },
  { question: 'What goes up but never comes down?', correct: 'Your age', wrong: ['A balloon', 'Smoke', 'The tide'] },
  { question: 'What has one eye but cannot see?', correct: 'A needle', wrong: ['A telescope', 'A keyhole', 'A button'] },
  { question: 'What has a neck but no head?', correct: 'A bottle', wrong: ['A lamp', 'A river', 'A chair'] },
  { question: 'What is full of holes but still holds water?', correct: 'A sponge', wrong: ['A bucket', 'A sieve', 'A net'] },
  { question: 'What belongs to you, but other people use it more than you do?', correct: 'Your name', wrong: ['Your phone', 'Your car', 'Your shadow'] },
  { question: 'What walks on four legs in the morning, two at noon and three in the evening?', correct: 'A human', wrong: ['A dog', 'A chair', 'A spider'] },
];

export const TEASER_PACK: LocalQuestion[] = [
  { question: 'How many months have 28 days?', correct: 'All 12 of them', wrong: ['Just one', 'Two', 'Six'] },
  { question: 'A farmer has 17 sheep and all but 9 run away. How many are left?', correct: '9', wrong: ['8', '17', 'None'] },
  { question: 'Divide 30 by a half and add ten. What do you get?', correct: '70', wrong: ['25', '55', '40'] },
  { question: 'If there are 3 apples and you take away 2, how many do YOU have?', correct: '2', wrong: ['1', '3', 'None'] },
  { question: 'What comes next in the sequence J, F, M, A, M, J...?', correct: 'J', wrong: ['S', 'O', 'A'] },
  { question: 'A plane crashes exactly on the England-Scotland border. Where are the survivors buried?', correct: 'Nowhere - they survived', wrong: ['England', 'Scotland', 'Wherever the families choose'] },
  { question: 'How many times can you subtract 5 from 25?', correct: 'Once - then it is 20', wrong: ['Five times', 'Four times', 'As many as you like'] },
  { question: 'Which is heavier: a tonne of bricks or a tonne of feathers?', correct: 'They weigh the same', wrong: ['The bricks', 'The feathers', 'Depends on the wind'] },
  { question: 'Some months have 31 days. How many have 30?', correct: '11', wrong: ['4', '5', '6'] },
  { question: 'In a race, you overtake the runner in second place. What place are you in now?', correct: 'Second', wrong: ['First', 'Third', 'Last'] },
  { question: 'How many letters are there in "the alphabet"?', correct: '11', wrong: ['26', '24', '10'] },
  { question: 'A rooster lays an egg on a peaked roof. Which way does it roll?', correct: 'Roosters do not lay eggs', wrong: ['Down the left slope', 'Down the right slope', 'It stays put'] },
  { question: 'Multiply every number on a telephone keypad together. What do you get?', correct: '0', wrong: ['362,880', '90', '45'] },
  { question: 'Before Everest was discovered, what was the highest mountain in the world?', correct: 'Everest - it had just not been found', wrong: ['K2', 'Mont Blanc', 'Kilimanjaro'] },
];

// The Twenty: 20 options on the board, exactly 10 correct. Players alternate
// tapping one; a wrong tap is a strike, three strikes loses the flash.
export type DuelBoard = { prompt: string; options: string[]; correct: string[] };

export const DUEL_BOARDS: DuelBoard[] = [
  {
    prompt: 'Tap the real CAPITAL CITIES. Ten are, ten are not.',
    options: ['London', 'Manchester', 'Paris', 'Lyon', 'Madrid', 'Barcelona', 'Rome', 'Milan', 'Berlin', 'Munich', 'Oslo', 'Bergen', 'Dublin', 'Cork', 'Vienna', 'Salzburg', 'Prague', 'Brno', 'Lisbon', 'Porto'],
    correct: ['London', 'Paris', 'Madrid', 'Rome', 'Berlin', 'Oslo', 'Dublin', 'Vienna', 'Prague', 'Lisbon'],
  },
  {
    prompt: 'Tap the countries IN EUROPE. Ten in, ten out.',
    options: ['France', 'Morocco', 'Spain', 'Japan', 'Poland', 'Brazil', 'Norway', 'Canada', 'Greece', 'Egypt', 'Croatia', 'Thailand', 'Belgium', 'Peru', 'Austria', 'Kenya', 'Finland', 'Chile', 'Estonia', 'Vietnam'],
    correct: ['France', 'Spain', 'Poland', 'Norway', 'Greece', 'Croatia', 'Belgium', 'Austria', 'Finland', 'Estonia'],
  },
  {
    prompt: 'Tap the DOG breeds. Ten bark, ten do not.',
    options: ['Labrador', 'Siamese', 'Poodle', 'Persian', 'Beagle', 'Mustang', 'Bulldog', 'Koala', 'Dalmatian', 'Gecko', 'Chihuahua', 'Falcon', 'Husky', 'Otter', 'Corgi', 'Panther', 'Dachshund', 'Walrus', 'Boxer', 'Iguana'],
    correct: ['Labrador', 'Poodle', 'Beagle', 'Bulldog', 'Dalmatian', 'Chihuahua', 'Husky', 'Corgi', 'Dachshund', 'Boxer'],
  },
  {
    prompt: 'Tap the FRUITS. Ten are sweet fruit, ten are veg (kitchen rules, not botany class).',
    options: ['Apple', 'Carrot', 'Banana', 'Potato', 'Cherry', 'Onion', 'Mango', 'Broccoli', 'Plum', 'Cabbage', 'Grape', 'Turnip', 'Peach', 'Celery', 'Pear', 'Leek', 'Kiwi', 'Spinach', 'Melon', 'Parsnip'],
    correct: ['Apple', 'Banana', 'Cherry', 'Mango', 'Plum', 'Grape', 'Peach', 'Pear', 'Kiwi', 'Melon'],
  },
  {
    prompt: 'Tap the current OLYMPIC sports. Ten are in, ten watch from the pub.',
    options: ['Archery', 'Chess', 'Fencing', 'Snooker', 'Rowing', 'Darts', 'Judo', 'Poker', 'Diving', 'Bowling', 'Hockey', 'Paintball', 'Triathlon', 'Quidditch', 'Badminton', 'Monopoly', 'Canoeing', 'Scrabble', 'Handball', 'Caber Toss'],
    correct: ['Archery', 'Fencing', 'Rowing', 'Judo', 'Diving', 'Hockey', 'Triathlon', 'Badminton', 'Canoeing', 'Handball'],
  },
  {
    prompt: 'Tap the SHAKESPEARE plays. Ten are the Bard, ten are not.',
    options: ['Hamlet', 'The Great Gatsby', 'Macbeth', 'War and Peace', 'Othello', 'Pride and Prejudice', 'King Lear', 'Moby Dick', 'The Tempest', 'Dracula', 'Much Ado About Nothing', 'Frankenstein', 'A Midsummer Night\u2019s Dream', 'The Odyssey', 'Romeo and Juliet', 'Great Expectations', 'Twelfth Night', 'Wuthering Heights', 'Julius Caesar', 'Jane Eyre'],
    correct: ['Hamlet', 'Macbeth', 'Othello', 'King Lear', 'The Tempest', 'Much Ado About Nothing', 'A Midsummer Night\u2019s Dream', 'Romeo and Juliet', 'Twelfth Night', 'Julius Caesar'],
  },
  {
    prompt: 'Tap the US STATES. Ten star-spangled, ten impostors.',
    options: ['Texas', 'Ontario', 'Ohio', 'Bavaria', 'Florida', 'Queensland', 'Oregon', 'Brittany', 'Nevada', 'Tuscany', 'Vermont', 'Andalusia', 'Kansas', 'Hokkaido', 'Iowa', 'Jalisco', 'Maine', 'Punjab', 'Utah', 'Catalonia'],
    correct: ['Texas', 'Ohio', 'Florida', 'Oregon', 'Nevada', 'Vermont', 'Kansas', 'Iowa', 'Maine', 'Utah'],
  },
  {
    prompt: 'Tap the musical INSTRUMENTS. Ten play, ten do not.',
    options: ['Violin', 'Blender', 'Trumpet', 'Telescope', 'Cello', 'Wrench', 'Banjo', 'Kettle', 'Oboe', 'Compass', 'Harp', 'Stapler', 'Tuba', 'Lantern', 'Flute', 'Hammer', 'Clarinet', 'Microscope', 'Mandolin', 'Funnel'],
    correct: ['Violin', 'Trumpet', 'Cello', 'Banjo', 'Oboe', 'Harp', 'Tuba', 'Flute', 'Clarinet', 'Mandolin'],
  },
];

// Flash pickers use the same never-repeat-until-shelf-empty habit as the house packs.
const FLASH_SEEN_KEY = 'ct-trivia-flash-seen-v1';
function pickFresh<T>(key: string, list: T[], idOf: (item: T) => string): T {
  let seen: Record<string, string[]> = {};
  try { seen = JSON.parse(window.localStorage.getItem(FLASH_SEEN_KEY) || '{}'); } catch { /* private browsing */ }
  let used = seen[key] || [];
  let fresh = list.filter((item) => !used.includes(idOf(item)));
  if (!fresh.length) { used = []; fresh = list; }
  const choice = fresh[Math.floor(Math.random() * fresh.length)];
  try { seen[key] = [...used, idOf(choice)]; window.localStorage.setItem(FLASH_SEEN_KEY, JSON.stringify(seen)); } catch { /* best effort */ }
  return choice;
}
export function pickRiddle(): LocalQuestion { return pickFresh('riddle', RIDDLE_PACK, (item) => item.question); }
export function pickTeaser(): LocalQuestion { return pickFresh('teaser', TEASER_PACK, (item) => item.question); }
export function pickDuelBoard(): DuelBoard { return pickFresh('duel', DUEL_BOARDS, (item) => item.prompt); }

export const FLASH_INTROS: Record<string, string[]> = {
  riddle: ['FLASH FINALE - Chester\u2019s Riddle! Double points. No conferring, no peeking, no mercy.'],
  teaser: ['FLASH FINALE - Brain Teaser! Double points for the quick of wit. Read it twice, answer once.'],
  fastest: ['FLASH FINALE - Fastest Finger! First CORRECT answer banks double. A wrong lunge hands it over.'],
  duel: ['FLASH FINALE - The Twenty! Ten right, ten wrong on the board. Take turns, tap one. Three strikes and you are out.'],
  lastorders: ['FLASH FINALE - Last Orders! Both of you can score double - but the swifter glass gets a top-up.'],
};

export const FLASH_RESOLVE_LINES: Record<string, string> = {
  riddle: 'The riddle is solved, or it solved you.',
  teaser: 'Brains officially teased.',
  fastest: 'The fastest finger did the talking.',
  duel: 'The Twenty is settled.',
  lastorders: 'Last orders served. The till rings.',
};

export const ON_THE_HOUSE_LINES = [
  'ON THE HOUSE! Chester buys this round - a point each, compliments of the bar.',
  'Bell rings for a free one! Chester shouts the whole table - a point each.',
  'This pour is on Chester. A point apiece, and not a word to the brewery.',
];
