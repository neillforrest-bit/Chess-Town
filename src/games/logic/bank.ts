import { EXTRA } from './extra';
import { generatedPuzzles } from './generated';
// Original house pack. Generated puzzles carry constructive proofs, not remote answers.
export type Puzzle = { id: string; category: string; difficulty: number; prompt: string; options: string[]; correct: string; explanation: string };
export const CATEGORIES = ['Riddle Room', 'Number Lab', 'Deduction Den', 'Pattern Alley', 'Lateral Lounge'];
const bank: Puzzle[] = [];
function add(id: string, category: string, difficulty: number, prompt: string, correct: string, wrong: string[], explanation: string) {
  bank.push({ id, category, difficulty, prompt, correct, options: [correct, ...wrong], explanation });
}
const riddles = [
 ['What has keys and pedals, but cannot open a door or ride down a street?', 'A piano', 'A bicycle|A map|A clock', 'A piano has musical keys and foot pedals.'],
 ['What gets wetter as it dries your hands?', 'A towel', 'A candle|A mirror|A glove', 'The towel absorbs water while drying your hands.'],
 ['What has a face and hands, but no eyes or fingers?', 'An analogue clock', 'A book|A compass needle|A coin', 'The dial is its face, and the pointers are its hands.'],
 ['What can fill a room without taking up floor space?', 'Light', 'A wardrobe|Sand|A sofa', 'Light illuminates the room without occupying floor space.'],
 ['What travels around the world while staying stuck in the corner of an envelope?', 'A postage stamp', 'A compass|A pilot|A postcard message', 'The stamp stays in the envelope corner as the envelope travels.'],
 ['What has a neck but no head, and holds a drink?', 'A bottle', 'A scarf|A spoon|A kettle lid', 'The narrow top of a bottle is called its neck.'],
 ['What has many teeth but cannot bite, and helps tidy your hair?', 'A comb', 'A zipper pull|A fork|A hair ribbon', 'The comb teeth separate and arrange hair.'],
 ['What grows larger the more earth you take out of it?', 'A hole', 'A mountain|A bucket|A stone', 'Removing earth enlarges the empty hole.'],
 ['What is yours, but other people say it more often than you do?', 'Your name', 'Your password|Your shadow|Your age', 'Other people use your name to address or refer to you.'],
 ['What has branches but no leaves, and holds savings?', 'A bank', 'A river|A tree|A library shelf', 'A bank has local branches and holds savings.'],
 ['What has an eye but cannot see, and carries thread?', 'A needle', 'A storm|A button|A shoe', 'Thread passes through the eye of a needle.'],
 ['What has a head and tail, but no body, and can be tossed to decide a game?', 'A coin', 'A kite|A snake|A hammer', 'A coin has heads and tails sides.'],
 ['What breaks when you speak after agreeing to say nothing?', 'Silence', 'A window|A promise to sing|A microphone', 'Speaking ends the silence.'],
 ['What can run and babble, but never walks or speaks words?', 'A stream', 'A runner|A radio|A road', 'A stream runs downhill and makes a babbling sound.'],
 ['What has pages and a spine but no bones?', 'A book', 'A newspaper sheet|A skeleton|A tree trunk', 'A bound book has pages attached to its spine.'],
 ['What has a thumb and four fingers, but is not alive?', 'A glove', 'A mitten|A sleeve|A shoe', 'A glove has separate spaces for a thumb and four fingers.'],
 ['What comes once in minute, twice in moment, and never in hour?', 'The letter m', 'The letter o|Sixty seconds|The letter t', 'Count m in the written words: minute has one, moment two, hour none.'],
 ['What word becomes shorter when you add two letters?', 'Short', 'Small|Long|Tiny', 'Add e and r to short to make shorter.'],
 ['What has cities, roads and rivers but no actual people, cars or water?', 'A map', 'A city|A harbour|A photograph of a glass', 'Map symbols represent these things rather than containing the real things.'],
 ['What goes up every birthday and never goes down?', 'Your age', 'Your height|The temperature|Your savings', 'Age increases with elapsed time, even if height or savings do not.'],
];
riddles.forEach((x,i)=>add(`r${i}`, CATEGORIES[0], Math.min(3,1+Math.floor(i/7)), x[0], x[1], x[2].split('|'), x[3]));
const lateral = [
 ['A race runner overtakes the person in second place. What place is the runner now in?', 'Second', 'First|Third|Last', 'The runner takes the position of the person overtaken: second.'],
 ['Two fathers and two sons each eat one apple. Only three apples are eaten. How?', 'Grandfather, father and son', 'One apple was shared|One person ate none|There were four people', 'The middle person is both a father and a son, so there are three people.'],
 ['A farmer has 17 sheep. All but 9 escape. How many remain?', '9', '8|17|0', 'All but 9 means 9 did not escape.'],
 ['An electric train moves north while wind blows west. Which way does its smoke drift?', 'It produces no smoke', 'North|West|South', 'An electric train has no combustion smoke in this puzzle.'],
 ['A doctor gives you three pills, one now and then one every half hour. How long until the last pill?', '1 hour', '90 minutes|30 minutes|2 hours', 'Take them at minute 0, minute 30 and minute 60.'],
 ['Before Everest was identified as the tallest mountain, which mountain was tallest?', 'Everest', 'K2|Kilimanjaro|Mont Blanc', 'Discovery does not change a mountain height.'],
 ['A plane crashes exactly on a border. Where should the survivors be buried?', 'Nowhere', 'In the west country|In the east country|On the border', 'Survivors are alive, so they are not buried.'],
 ['How many months have at least 28 days?', '12', '1|2|11', 'Every month has at least 28 days.'],
 ['You have one match. In a dark room are an oil lamp, a candle and a fireplace. What do you light first?', 'The match', 'The lamp|The candle|The fireplace', 'The match must be lit before it can light anything else.'],
 ['A one-storey house is entirely painted blue inside. What colour are its stairs to the second storey?', 'There are no such stairs', 'Blue|White|Black', 'A one-storey house has no second storey.'],
 ['A basket holds six eggs. Six people each take one, yet one egg remains in the basket. How?', 'The last person takes the basket with an egg', 'An egg is split|There were seven eggs|One person takes no egg', 'The sixth person takes their egg while it is still inside the basket.'],
 ['A man walks outside in heavy rain without a hat. His uncovered head gets wet, but no hair does. Why?', 'He is bald', 'He is under a roof|The rain is dry|He has an umbrella', 'There is no hair on his head to get wet.'],
 ['Which weighs more: one kilogram of feathers or one kilogram of steel?', 'They weigh the same', 'Feathers|Steel|It depends on colour', 'Both quantities are defined as one kilogram.'],
 ['A rooster lays an egg on a roof ridge. Which way does it roll?', 'Roosters do not lay eggs', 'Left|Right|Down both sides', 'A rooster is a male chicken and does not lay eggs.'],
 ['You take two apples from a bowl containing five. How many apples do you have?', '2', '3|5|7', 'You have the two apples you took.'],
 ['A boat has a ladder hanging over its side. The tide rises a metre. How many additional rungs go under water if the boat floats freely?', 'None', 'One|Two|All of them', 'The floating boat and its ladder rise with the tide.'],
 ['A square table has four corners. One corner is cut off with a straight cut crossing two edges. How many corners remain?', '5', '3|4|6', 'One old corner is removed and two new corners are created: 4 - 1 + 2 = 5.'],
 ['There are five birds on a fence. You photograph one, and none move. How many remain?', '5', '1|4|0', 'Taking a photograph does not remove a bird; none moved.'],
];
lateral.forEach((x,i)=>add(`l${i}`,CATEGORIES[4],Math.min(3,1+Math.floor(i/7)),x[0],x[1],x[2].split('|'),x[3]));
for(let n=1;n<=20;n++) {
 const a=n+2,b=n+4;
 add(`n${n}`,CATEGORIES[1],Math.min(3,1+Math.floor(n/7)),`${a} identical machines make ${a} tokens in ${b} minutes. At that same constant rate, how long do ${a*2} machines take to make ${a*2} tokens?`,`${b} minutes`,[`${b*2} minutes`,`${b*3} minutes`,`${b+1} minutes`],`Each machine makes one token in ${b} minutes. Doubling machines and tokens leaves the time unchanged.`);
 const x=n+1,d=n+2;
 add(`p${n}`,CATEGORIES[3],Math.min(3,1+Math.floor(n/7)),`Continue the constant-difference sequence: ${x}, ${x+d}, ${x+2*d}, ${x+3*d}, ?`,`${x+4*d}`,[`${x+4*d+1}`,`${x+3*d+1}`,`${x+5*d}`],`Add ${d} each time. The next number is ${x+3*d} + ${d} = ${x+4*d}.`);
 
 const total=3*n+8,price=n+2;
 add(`c${n}`,CATEGORIES[1],2,`A notebook and pen cost £${total}. The notebook costs £${price} more than the pen. What does the pen cost?`,`£${((total-price)/2).toFixed(2)}`,[`£${total-price}`,`£${price+total}`,`£${total/2}`],`Let the pen cost x. Then x + (x + ${price}) = ${total}, so x = (${total} - ${price}) / 2 = ${(total-price)/2}.`);
 const start=n+2;
 add(`s${n}`,CATEGORIES[3],3,`Use the rule: multiply by 2, then add 1. ${start}, ${start*2+1}, ${start*4+3}, ?`,`${start*8+7}`,[`${start*8+6}`,`${start*8+8}`,`${start*4+4}`],`(${start*4+3} × 2) + 1 = ${start*8+7}.`);
}
const deductions = [
 ['All amber tokens are round. No round token is blue. Which must be true?','No amber token is blue','All blue tokens are amber|All round tokens are amber|No blue tokens exist','Amber implies round; round excludes blue. Therefore amber excludes blue.'],
 ['Ada is taller than Ben. Ben is taller than Cy. Who is shortest?','Cy','Ada|Ben|Cannot tell','Height order is Ada, Ben, Cy.'],
 ['Exactly one of two boxes holds a prize. Box A says: the prize is here. Box B says: A is empty. Exactly one label is true. Where is the prize?','Cannot determine','Definitely A|Definitely B|Both boxes','If A holds it, A label is true and B false. If B holds it, A is false and B true. Both placements satisfy one true label.'],
 ['No poets at a party are pilots. Some guests are poets. Which must be true?','Some guests are not pilots','No guests are pilots|All pilots are poets|All guests are poets','The guests who are poets cannot be pilots. Other guests may be pilots.'],
 ['If it rains, the path is wet. The path is wet. What follows?','It may or may not have rained','It definitely rained|It definitely did not rain|The rule is false','Rain is sufficient for wetness, but a sprinkler could also wet the path.'],
 ['If a card is red, it has a circle. A card has no circle. What follows?','It is not red','It is red|It is blue|It has a square','A red card would have a circle, so this card cannot be red.'],
 ['Exactly one of Ava, Bo and Cy broke a cup. Ava says Bo did it. Bo says I did not. Cy says Ava did it. Exactly two statements are true. Who broke it?','Ava','Cy|Bo|Cannot tell','If Ava did it, Bo and Cy tell the truth while Ava is false. Bo or Cy as culprit would give only one true statement.'],
 ['Three switches are labelled A, B and C. Only B is on. The lamp lights exactly when A and B are both on. Is it lit?','No','Yes|Only at night|Cannot tell','A is off, so the required conjunction A and B is false.'],
 ['All glips are glops. Some glops are glups. Must any glip be a glup?','No, not necessarily','Yes, every glip|Yes, exactly one|No glops can be glips','The glups may be entirely outside the glip subset of glops.'],
 ['A key is in one of three drawers. It is not in the top drawer. The bottom drawer is empty. Where is it?','The middle drawer','The top drawer|The bottom drawer|Outside all drawers','Two of the three possible drawers are ruled out.'],
 ['In a queue, Jo is immediately before Kai, and Kai is immediately before Lee. Who is in the middle of these three?','Kai','Jo|Lee|Cannot tell','The consecutive order is Jo, Kai, Lee.'],
 ['A number is an integer greater than 2 and less than 6. It is even. What is it?','4','2|3|6','Only 3, 4 and 5 are strictly between 2 and 6; only 4 is even.'],
 ['A code uses digits 2, 4 and 6 exactly once. The first digit is greater than the second, and the second greater than the third. What is the code?','642','624|462|426','The digits must be in descending order: 6, 4, 2.'],
 ['Every locked door requires a key. This door requires no key. Under this rule, can it be locked?','No','Yes|Only if red|Cannot tell','If locked, it would require a key. No key requirement rules out locked.'],
 ['Some artists are club runners. All club runners wear green. Which must be true?','Some artists wear green','All artists wear green|All green wearers are runners|No artist runs','The artists who are club runners must wear green. Other artists need not.'],
 ['A safe opens only if both buttons are pressed. The safe opened. What must be true?','Both buttons were pressed','Neither button was pressed|Exactly one was pressed|The safe is broken','Only if makes pressing both buttons a necessary condition of opening.'],
 ['Either the red key or the blue key opens a door, but not both. The red key opens it. Does the blue?','No','Yes|Only after red|Cannot tell','The exclusive either-or condition rules out the blue key.'],
 ['Four seats form a line. Ada sits at the left end; Bo at the right end. Cy is immediately left of Dee. What is the order?','Ada, Cy, Dee, Bo','Ada, Dee, Cy, Bo|Cy, Ada, Dee, Bo|Bo, Cy, Dee, Ada','The ends are fixed, leaving the two middle seats for Cy then Dee.'],
 ['All squares in a collection are red. Some red shapes are circles. Which claim is NOT guaranteed?','Some squares are circles','Every square is red|Every non-red shape is not a square|Every blue shape is not a square','The red circles need not belong to the square subset.'],
 ['A statement says: At least one of A and B is true. A is false. What about B?','B is true','B is false|B is both true and false|Cannot tell','To keep at least one true when A is false, B must be true.'],
];
deductions.forEach((x,i)=>add(`ded${i}`,CATEGORIES[2],Math.min(3,1+Math.floor(i/7)),x[0],x[1],x[2].split('|'),x[3]));
EXTRA.forEach((x,i)=>add(`house${i}`,CATEGORIES[x[0]],x[1],x[2],x[3],x[4].split('|'),x[5]));
bank.push(...generatedPuzzles());
export const PUZZLES = bank.filter((q,i,all)=>all.findIndex(x=>x.prompt===q.prompt)===i);
export function shuffle<T>(xs:T[]):T[] { const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
// Template ids (n/p/c/s/geo/draw/diff/alt/grid + number) share one puzzle idea with
// different numbers; group them so a match never feels like the same question twice.
export function familyOf(q:Puzzle):string { const m=q.id.match(/^(n|p|c|s|geo|draw|diff|alt|grid)\d+$/); return m?m[1]:q.id; }
export function buildDeck(level=1,seen:string[]=[]): Puzzle[] {
 const used=new Set<string>(),families=new Map<string,number>(),deck:Puzzle[]=[],recent=new Set(seen);const cycle=shuffle(CATEGORIES);
 for(let r=0;r<5;r++)for(let j=0;j<6;j++){
  const target=Math.min(3,1+Math.floor((r+Math.floor((level-1)/5))/2));
  const category=cycle[(r+j)%5];
  const pool=PUZZLES.filter(q=>!used.has(q.id)&&(families.get(familyOf(q))||0)<2);
  const rank=(q:Puzzle)=>(Math.abs(q.difficulty-target)*10000)+(recent.has(q.id)?1000:0)+(q.category===category?0:100);
  // Fresh questions always win over recently seen ones; seen is the last resort.
  const fresh=pool.filter(q=>!recent.has(q.id));
  const q=shuffle(fresh.length?fresh:pool).sort((a,b)=>rank(a)-rank(b))[0];
  used.add(q.id);families.set(familyOf(q),(families.get(familyOf(q))||0)+1);deck.push({...q,options:shuffle(q.options)});
 }
 return deck;
}
