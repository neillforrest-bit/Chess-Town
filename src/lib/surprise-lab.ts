// SURPRISE LAB (BUILD 194) - guided lessons for unusual openings, his 7 Nov 01:53 ask:
// "learn unusual or outside the box openings to surprise good players, fully guided
// move by move." Every scripted line is engine-verified (Stockfish 18, depth 18,
// chess.js-generated FENs): opponent replies are the engine's own top choices or
// theory mainlines within a few centipawns of them, and each card carries the honest
// machine read - playable surprise vs ambush is stated plainly, never oversold.
export type LabStep = {
  san: string;            // the user's scripted move (SAN)
  why: string;            // Chester's why-line, shown before the move
  replySan?: string;      // the strong scripted reply (omitted on a lesson's final step)
  replyWhy?: string;      // what that reply is trying to do
  branch?: string;        // "if they're good" note: the strongest alternative plan
};
export type LabOpening = {
  id: string; name: string; side: 'w' | 'b'; tier: 'SOUND SURPRISE' | 'AMBUSH';
  color: string; blurb: string; engineRead: string; intro: string; handoff: string;
  setupSan?: string[];    // opponent moves before the user's first (Black lessons)
  setupWhy?: string;
  steps: LabStep[];
};
export const LAB_OPENINGS: LabOpening[] = [
  {
    id: 'sokolsky', name: 'Sokolsky Opening', side: 'w', tier: 'SOUND SURPRISE', color: '#fb923c',
    blurb: 'Grab queenside space on move one and point a bishop down the long diagonal. Almost nobody studies it.',
    engineRead: 'Machine read: your opponent keeps a small pull (-0.4). Fully playable - that is the honest price of surprise.',
    intro: 'The Sokolsky. One wing-pawn step and most players leave their preparation on move one. The idea: queenside space, a bishop ruling the longest diagonal, and a centre THEY have to build - and can build wrong. Six moves, then you drive.',
    handoff: 'Lesson complete. You gave them a strange, balanced position where their preparation is worthless. Now play it against me - no hints.',
    steps: [
      { san: 'b4', why: 'Kick off with the wing pawn. You claim queenside space and clear the long diagonal for your bishop. No theory war today - they are on their own from the very first move.',
        replySan: 'e5', replyWhy: 'The principled answer: they grab the centre. Good - that is exactly what this opening wants. Their centre becomes a target, not a strength.',
        branch: 'If they develop quietly instead of grabbing the centre, your plan is unchanged: bishop to the long diagonal, queenside space, patience.' },
      { san: 'Bb2', why: 'The point of the whole opening. Your bishop now stares down the longest diagonal in chess, straight at their centre pawn.',
        replySan: 'Bxb4', replyWhy: 'They take the pawn you offered - the critical test. Do not panic: that pawn is the entry fee for what happens next.' },
      { san: 'Bxe5', why: 'Collect their centre pawn. Now their pieces must dance around your bishop, and the diagonal is yours for the whole game.',
        replySan: 'Nf6', replyWhy: 'They develop and kick your bishop at the same time - a good player finds this. Fine. Stepping back is not retreating: the diagonal stays yours.',
        branch: 'A strong alternative is kicking the bishop with the f-pawn first. Same answer: the bishop slips back along the diagonal and you build with the c-pawn.' },
      { san: 'c4', why: 'More queenside space. Your plan was never to keep the extra pawn - it is to squeeze. Their bishop biting your queenside looks active but achieves nothing.',
        replySan: 'O-O', replyWhy: 'They castle to safety. Natural. Now you finish development and ask the real questions.' },
      { san: 'Nf3', why: 'Knight out, eyeing the centre. Every one of your pieces develops toward their king.',
        replySan: 'd5', replyWhy: 'They strike the centre - the strongest plan, and the one a good player will find. Hold your nerve: your structure was built for exactly this.' },
      { san: 'e3', why: 'Reinforce. Your centre flexes instead of breaking, and your second bishop is ready to join the party.',
        replySan: 'c5', replyWhy: 'They challenge your queenside space. The position is wide open, level, and utterly unfamiliar to them - which was the whole idea.' },
    ],
  },
  {
    id: 'smithmorra', name: 'Smith-Morra Gambit', side: 'w', tier: 'SOUND SURPRISE', color: '#e879f9',
    blurb: 'Answer the Sicilian by offering a pawn on move three for a speeding attack. Booked-up Sicilian players hate it.',
    engineRead: 'Machine read: you pay about a third of a pawn for lasting pressure. Real compensation, not a trick.',
    intro: 'The Smith-Morra Gambit. They wheel out the Sicilian - the most-studied defence in chess - and you offer a pawn on move three to drag them into your kind of fight. Open lines, fast development, one plan: attack. Seven moves, then you drive.',
    handoff: 'Lesson complete. A pawn down, fully mobilised, and they still have every problem to solve. Rehearse it against me - no prompts from here.',
    steps: [
      { san: 'e4', why: 'King pawn. The Sicilian is coming - and you will meet it with something they did not prepare.',
        replySan: 'c5', replyWhy: 'The Sicilian Defence. They may know thirty moves of their favourite line. We leave all of it on the shelf right now.' },
      { san: 'd4', why: 'Challenge the centre immediately. This is the fork in the road where their preparation starts to creak.',
        replySan: 'cxd4', replyWhy: 'They capture, as almost everyone does. Now the offer.',
        branch: 'If they decline and build quietly, keep it simple: knight out, develop normally - they have given up the Sicilian\'s sharpest lines for nothing.' },
      { san: 'c3', why: 'The Smith-Morra. A real pawn, offered for pure speed. Declining is safer for them - but most people take.',
        replySan: 'dxc3', replyWhy: 'They accept. Perfect. From here you get a free move every turn while their pieces stay in bed.',
        branch: 'If they push the pawn deeper instead of taking, capture it with your bishop next and you are simply developed. No gambit accepted, no problem.' },
      { san: 'Nxc3', why: 'Recapture with the knight. One pawn down, three pieces ready to fly. That is the deal - and it is a fair one.',
        replySan: 'Nc6', replyWhy: 'They develop and guard the centre. Good players choose this - and still face a long, awkward defence.' },
      { san: 'Nf3', why: 'Second knight out. Your bishops come next, and both centre files belong to you.',
        replySan: 'd6', replyWhy: 'The careful, classical setup - a good player keeps it solid. Fine. You are not checkmating anyone today; you are building pressure that lasts.' },
      { san: 'Bc4', why: 'Bishop to the most dangerous diagonal in chess, pointing at the softest square in their camp.',
        replySan: 'a6', replyWhy: 'They spend a whole move keeping your pieces away. A quiet admission that your pressure is already real.' },
      { san: 'O-O', why: 'King safe, rook coming to the middle. The gambit is complete: you are a pawn down with every single piece humming.',
        replySan: 'Nf6', replyWhy: 'They finally develop the kingside. The middlegame starts now - and you are ahead on every clock that matters.' },
    ],
  },
  {
    id: 'alekhine', name: "Alekhine's Defence", side: 'b', tier: 'SOUND SURPRISE', color: '#2dd4bf',
    blurb: 'Let White chase your knight and build a huge centre - then chip it until it cracks.',
    engineRead: 'Machine read: White gets a clear pull (+0.9 in this line). You play it for counterattack and strange positions, not for comfort.',
    intro: "Alekhine's Defence. You let White build a big pawn centre - then spend the game proving it overreached. Provocative, respected at every level, and most players have no idea what to do against it. You are Black: White moves first, then you are on script.",
    handoff: 'Lesson complete. Solid, uncracked, and ready to counterattack. Play it against me from here - I will push the centre, you prove it is weak.',
    setupSan: ['e4'],
    setupWhy: 'White takes the centre with the king pawn - the most common start in chess, and the one this defence was built to answer.',
    steps: [
      { san: 'Nf6', why: 'The cheek of it: no pawn in the centre at all. You invite the pawns forward, because every step they take becomes a target.',
        replySan: 'e5', replyWhy: 'White kicks your knight immediately - the main line. The chase is on, exactly as planned.' },
      { san: 'Nd5', why: 'The knight hops to its outpost: central, annoying, and watching everything.',
        replySan: 'd4', replyWhy: 'More centre. White builds a broad pawn front - and a broad front is a broad target. This is what you wanted.' },
      { san: 'd6', why: 'The first chip. You attack the head of their pawn chain immediately.',
        replySan: 'Nf3', replyWhy: 'White defends sensibly - the strongest and most popular setup.',
        branch: 'If White keeps chasing your knight with pawns instead, keep dropping back, then chip at the advanced centre pawn until it falls. Overextension is the whole plan.' },
      { san: 'Bg4', why: 'Bishop out, pinning the knight that guards their centre. The pressure on their advanced pawns doubles.',
        replySan: 'Be2', replyWhy: 'White calmly breaks the pin - the right idea. Do not chase shadows now; finish developing.' },
      { san: 'e6', why: 'Open the door for your other bishop and blunt their whole pawn front. Your position is small but solid as a rock.',
        replySan: 'O-O', replyWhy: 'White castles. The centre hangs in tension - exactly the kind of position their opening preparation never covers.' },
      { san: 'Be7', why: 'Development complete, king ready to castle, and their centre still has to prove itself. You have earned a real fight - now make the position weird.' },
    ],
  },
  {
    id: 'halloween', name: 'Halloween Gambit', side: 'w', tier: 'AMBUSH', color: '#dc2626',
    blurb: 'Sacrifice a knight on move four for a stampede of centre pawns. Unsound. Terrifying. Hilarious.',
    engineRead: 'Machine read: this is losing (-1.6) if your opponent defends perfectly. You play it because people panic.',
    intro: 'The Halloween Gambit. You are going to sacrifice a whole knight on move four - on purpose - for a rampaging pawn centre and pure fear. This is an ambush, not a sound opening: against machine defence you are worse. Against a human, expect a horrible afternoon - for them. Six moves.',
    handoff: 'Ambush set. Remember the deal: a piece down, a pawn stampede, and a panicking opponent. Rehearse against me - prove you can convert chaos.',
    steps: [
      { san: 'e4', why: 'King pawn. The trap needs the open game - invite them in politely.',
        replySan: 'e5', replyWhy: 'They accept the invitation.' },
      { san: 'Nf3', why: 'Knight out, attacking their centre pawn. Everything looks completely normal. Good.',
        replySan: 'Nc6', replyWhy: 'They defend. Still a quiet dinner party.' },
      { san: 'Nc3', why: 'Second knight into the Four Knights - the most symmetrical, harmless-looking position in chess. It is a disguise.',
        replySan: 'Nf6', replyWhy: 'They mirror you. Symmetry is the trigger - the ambush only fires now.' },
      { san: 'Nxe5', why: 'THE HALLOWEEN. The knight leaps to its doom. You give a whole piece for their centre pawn and what comes next.',
        replySan: 'Nxe5', replyWhy: 'They take - everyone takes. Now the stampede.',
        branch: 'If they do NOT take, do not panic: you have won a centre pawn for nothing and play a normal, slightly better game. The gambit fails politely.' },
      { san: 'd4', why: 'The centre starts rolling. Their knight has no good square and must flee while your pawns gain move after move.',
        replySan: 'Ng6', replyWhy: 'The best square - their knight retreats and you keep pushing. This is the entire point of the sacrifice.' },
      { san: 'e5', why: 'Push again. Their second knight must go home too. You are a piece down - and they are paralysed.',
        replySan: 'Ng8', replyWhy: 'Back to the start square. You are a piece down with a monster centre and all the fun. Attack like your life depends on it - because it does.' },
    ],
  },
];
const KEY = 'surprise-lab-v1';
export type LabProgress = Record<string, { lessonDone?: boolean; rehearsed?: boolean }>;
export function loadLabProgress(): LabProgress {
  try { return JSON.parse(typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) || '{}' : '{}'); } catch { return {}; }
}
export function saveLabProgress(p: LabProgress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ }
}
