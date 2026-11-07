// SURPRISE LAB (BUILD 194) - guided lessons for unusual openings, his 7 Nov 01:53 ask:
// "learn unusual or outside the box openings to surprise good players, fully guided
// move by move." Every scripted line is engine-verified (Stockfish 18, depth 18,
// MultiPV walks on chess.js-generated FENs - never hand-written FENs). Opponent replies
// are the engine's own top choice at nearly every node; theory-standard exceptions are
// the natural human move and say so. Every card carries the honest machine read:
// playable surprise vs ambush is stated plainly, nothing is oversold.
// Copy rules: no generalisations about people ("nobody studies this"), no overclaims
// about positions; every why-line is specific to the move actually on the board.
export type LabStep = {
  san: string;            // the user's scripted move (SAN)
  why: string;            // Chester's why-line, shown before the move
  replySan?: string;      // the strong scripted reply (omitted on a lesson's final step)
  replyWhy?: string;      // what that reply is trying to do
  branch?: string;        // "if they're good": the actual strong alternative and its answer
};
export type LabOpening = {
  id: string; name: string; side: 'w' | 'b'; tier: 'SOUND SURPRISE' | 'AMBUSH';
  color: string; blurb: string; engineRead: string; intro: string; handoff: string;
  setupSan?: string[];    // opponent moves before the user's first (Black lessons)
  setupWhy?: string;
  rehearsalPlies?: number; // half-moves to replay for rehearsal (default: the whole lesson)
  steps: LabStep[];
};
export const LAB_OPENINGS: LabOpening[] = [
  {
    id: 'sokolsky', name: 'Sokolsky Opening', side: 'w', tier: 'SOUND SURPRISE', color: '#fb923c',
    blurb: 'Push the b-pawn on move one: queenside space and a bishop on the long diagonal. Rare enough that your opponent must think from the start.',
    engineRead: 'Machine read: your opponent keeps a small pull (-0.4). Fully playable - the honest price of a rare position.',
    intro: 'The Sokolsky. One wing-pawn step and the game leaves the main highways. The idea: queenside space, a bishop ruling the longest diagonal, and a centre they must build for themselves. Six moves, then you drive.',
    handoff: 'Lesson complete. A level, lively position they cannot have memorised. Now play it against me - no hints.',
    steps: [
      { san: 'b4', why: 'Kick off with the wing pawn. You claim queenside space and clear the long diagonal for your bishop - the whole opening in one move.',
        replySan: 'e5', replyWhy: 'The principled answer: they take the centre. That is exactly what this opening wants - their centre is now a target.',
        branch: 'If they develop quietly instead of grabbing the centre, your plan is unchanged: bishop to the long diagonal, queenside space, patience.' },
      { san: 'Bb2', why: 'The point of the whole opening. Your bishop now stares down the longest diagonal in chess, straight at their centre pawn.',
        replySan: 'Bxb4', replyWhy: 'They take the pawn you offered - the critical test of the whole line. That pawn is the entry fee for what happens next.' },
      { san: 'Bxe5', why: 'Collect their centre pawn. Now their pieces must dance around your bishop, and the diagonal is yours for the whole game.',
        replySan: 'Nf6', replyWhy: 'They develop and kick your bishop at the same time. Stepping back is not retreating - the diagonal stays yours.',
        branch: 'The machine slightly prefers kicking your bishop with the f-pawn first. Same answer: the bishop slips back along the diagonal and you build with the c-pawn.' },
      { san: 'c4', why: 'More queenside space. Your plan was never to keep the extra pawn - it is to squeeze. Their bishop biting the queenside looks active but achieves nothing.',
        replySan: 'O-O', replyWhy: 'They castle - the natural human choice. The machine weighs knight-to-c6 development the same; your next moves work against both.',
        branch: 'If they strike the centre with the d-pawn instead of castling, capture it and open the c-file - your queenside pawns become a real asset.' },
      { san: 'Nf3', why: 'Knight out, eyeing the centre. Every one of your pieces develops toward their king.',
        replySan: 'd5', replyWhy: 'They strike the centre - the strongest plan, and the one a well-prepared player will find. Hold your nerve: your structure was built for exactly this.' },
      { san: 'e3', why: 'Reinforce. Your centre flexes instead of breaking, and your second bishop is ready to join the game.',
        replySan: 'c5', replyWhy: 'They challenge your queenside space. The position is wide open, level, and nothing like a standard opening - which was the idea.' },
    ],
  },
  {
    id: 'smithmorra', name: 'Smith-Morra Gambit', side: 'w', tier: 'SOUND SURPRISE', color: '#e879f9',
    blurb: 'Answer the Sicilian by offering a pawn on move three for open lines and fast development.',
    engineRead: 'Machine read: you pay about a third of a pawn for lasting pressure. Real compensation, not a trick.',
    intro: 'The Smith-Morra Gambit. They play the Sicilian - the most-studied defence to the king pawn - and you offer a pawn on move three to drag the game somewhere their notes do not cover. Open lines, fast development, one plan: attack. Seven moves, then you drive.',
    handoff: 'Lesson complete. A pawn down, fully mobilised, and they still have every problem to solve. Rehearse it against me - no prompts from here.',
    steps: [
      { san: 'e4', why: 'King pawn. The Sicilian is the most common reply at club level - and you will meet it with a move order their preparation skips.',
        replySan: 'c5', replyWhy: 'The Sicilian Defence. Entire books exist on its main lines. This gambit sidesteps nearly all of them.' },
      { san: 'd4', why: 'Challenge the centre immediately. This is the fork where the game leaves the well-trodden Sicilian paths.',
        replySan: 'cxd4', replyWhy: 'They capture, as the large majority of players do here. Now the offer.',
        branch: 'If they decline and build quietly with the d- or e-pawn, develop naturally - knight out, bishop to c4 - and you have avoided every sharp Sicilian main line.' },
      { san: 'c3', why: 'The Smith-Morra. A real pawn, offered for pure speed. Declining is safer for them - but most club players take.',
        replySan: 'dxc3', replyWhy: 'They accept. From here you gain a developing move every turn while their pieces are still at home.',
        branch: 'If they push the pawn one step deeper instead of taking, capture it with your bishop next move and you are simply developed. No gambit accepted, no problem.' },
      { san: 'Nxc3', why: 'Recapture with the knight. One pawn down, three pieces ready to fly. That is the deal - and the machine calls it a fair one.',
        replySan: 'Nc6', replyWhy: 'They develop and guard the centre - the strongest and most common defence.' },
      { san: 'Nf3', why: 'Second knight out. Your bishops come next, and both centre files belong to you.',
        replySan: 'd6', replyWhy: 'The careful, classical setup - a solid player keeps it tight. You are not checkmating anyone today; you are building pressure that lasts.',
        branch: 'If they fianchetto the king\'s bishop instead, castle first and put a rook on the open d-file - your pressure works the same way.' },
      { san: 'Bc4', why: 'Bishop to the most dangerous diagonal in the position, pointing at the softest square in their camp.',
        replySan: 'a6', replyWhy: 'They spend a whole move keeping your pieces off the queenside - an admission that the pressure is already real.' },
      { san: 'O-O', why: 'King safe, rook coming to the middle. The gambit is complete: a pawn down, and every single piece humming.',
        replySan: 'Nf6', replyWhy: 'They finally develop the kingside. The middlegame starts now - with you ahead on development and open lines.' },
    ],
  },
  {
    id: 'bird', name: 'Bird Opening', side: 'w', tier: 'SOUND SURPRISE', color: '#a3e635',
    blurb: 'The Dutch Defence with an extra move in hand: grip the central dark squares, fianchetto, and build toward the kingside.',
    engineRead: 'Machine read: a small pull for your opponent (-0.3). A full, fighting game with almost no mainstream theory.',
    intro: 'The Bird. You take the Dutch Defence - a respected fighting opening - and play it with an extra move in hand. The plan: control the central dark squares, fianchetto the queenside bishop, and aim everything at their kingside. Six moves, then you drive.',
    handoff: 'Lesson complete. Compact, flexible, with real kingside chances and no theory baggage. Play it against me - no hints.',
    steps: [
      { san: 'f4', why: 'The f-pawn grabs the dark square in front of your king\'s knight. From move one, this game is about the kingside.',
        replySan: 'd5', replyWhy: 'The main answer: they take their share of the centre and open the diagonal for their light-squared bishop.',
        branch: 'The sharpest test is the From Gambit - they offer the e-pawn for a development lead. The solid response: take it, give it straight back, and finish developing.' },
      { san: 'Nf3', why: 'Knight out, reinforcing your grip on the key square and clearing the way to castle.',
        replySan: 'Nf6', replyWhy: 'They develop toward the same central squares. Symmetrical - but you moved first.' },
      { san: 'e3', why: 'Solidify. Your pawns form a chain and your king\'s bishop gets its development square.',
        replySan: 'g6', replyWhy: 'They fianchetto - the most common setup against the Bird, pointing their bishop at your centre.' },
      { san: 'b3', why: 'Mirror them: your queenside bishop is coming to the long diagonal, where it watches the centre and their kingside at once.',
        replySan: 'Bg7', replyWhy: 'Their bishop lands on the long diagonal. The two bishops now stare through the centre - tension you will use later.' },
      { san: 'Bb2', why: 'The bishop arrives. Both your bishops now point toward their king\'s house - that is the attacking geometry of the Bird.',
        replySan: 'O-O', replyWhy: 'They castle - into safety, or into the firing line. That depends on how well you play the next ten moves.' },
      { san: 'Be2', why: 'Last piece out, king ready to castle. The setup is complete: compact centre, bishops aimed, knights ready to jump.',
        replySan: 'c5', replyWhy: 'They challenge your dark-square grip immediately - the critical test of the whole setup, and the position you must learn to handle.' },
    ],
  },
  {
    id: 'alekhine', name: "Alekhine's Defence", side: 'b', tier: 'SOUND SURPRISE', color: '#2dd4bf',
    blurb: 'Let White chase your knight and build a huge centre - then chip it until it cracks.',
    engineRead: 'Machine read: White gets a clear pull (+0.9 in this line). You play it for counterattack and imbalance, not for comfort.',
    intro: "Alekhine's Defence. You let White build a big pawn centre - then spend the game proving it overreached. It has been played by world champions, and club opponents rarely meet it twice in a season. You are Black: White moves first, then you are on script.",
    handoff: 'Lesson complete. Solid, uncracked, and ready to counterattack. Play it against me from here - I will push the centre, you prove it is weak.',
    setupSan: ['e4'],
    setupWhy: 'White takes the centre with the king pawn - the most common start in chess, and the one this defence was built to answer.',
    steps: [
      { san: 'Nf6', why: 'No pawn in the centre at all. You invite the pawns forward, because every step they take becomes a target later.',
        replySan: 'e5', replyWhy: 'White kicks your knight immediately - the main line, and exactly what you came for.' },
      { san: 'Nd5', why: 'The knight lands in the centre - for now. If White spends a pawn move chasing it, that pawn becomes your next target.',
        replySan: 'd4', replyWhy: 'More centre. White builds a broad pawn front - and a broad front is a broad target.' },
      { san: 'd6', why: 'The first chip. You attack the head of their pawn chain immediately.',
        replySan: 'Nf3', replyWhy: 'White defends the centre sensibly - the Modern Variation, the most popular setup.',
        branch: 'If White keeps chasing your knight with pawns instead, drop the knight back toward your camp, then attack the advanced centre pawn until it falls. Overextension is the whole plan.' },
      { san: 'Bg4', why: 'Bishop out, pinning the knight that guards their centre. The pressure on their advanced pawns doubles.',
        replySan: 'Be2', replyWhy: 'White calmly breaks the pin - the strongest and most natural answer. Do not chase shadows; finish developing.' },
      { san: 'e6', why: 'Open the door for your dark-squared bishop and blunt their whole pawn front. Your position is small but solid as a rock.',
        replySan: 'O-O', replyWhy: 'White castles. The centre hangs in tension - the kind of position their opening notes rarely cover.' },
      { san: 'Be7', why: 'Development complete, king ready to castle, and their centre still has to prove itself. You have earned a real fight - now make the position strange.' },
    ],
  },
  {
    id: 'modern', name: 'Modern Defence', side: 'b', tier: 'SOUND SURPRISE', color: '#f472b6',
    blurb: 'Concede the centre, fianchetto the king\'s bishop, then undermine everything they build.',
    engineRead: 'Machine read: White keeps a pull (+0.5). The most established defence on this shelf.',
    intro: 'The Modern Defence. You let White have the whole centre, then prove it can be attacked. It is the most established opening in this lab - and still rare enough to drag most opponents out of their memorised lines. You are Black: White moves first.',
    handoff: 'Lesson complete. Elastic, uncracked, and ready to strike at the centre. Play it against me - no hints.',
    setupSan: ['e4'],
    setupWhy: 'White takes the king-pawn centre - the most natural start, and exactly what you were hoping for.',
    steps: [
      { san: 'g6', why: 'You concede the centre on move one. Your king\'s bishop is coming to the long diagonal, and your pawns stay flexible.',
        replySan: 'd4', replyWhy: 'White builds the full two-pawn centre - the most natural reply and the main test of your idea.' },
      { san: 'Bg7', why: 'The bishop takes the long diagonal. It will watch their centre all game, waiting for its moment.',
        replySan: 'Nc3', replyWhy: 'White develops and reinforces the centre - the standard Classical setup.' },
      { san: 'd6', why: 'Support the bishop and prepare your knights. Your position is small, but there are no targets in it.',
        replySan: 'Nf3', replyWhy: 'White\'s most natural developing move. Their centre looks mighty - and it is fixed, and fixed things can be attacked.' },
      { san: 'Nf6', why: 'Knight out, pressuring their advanced centre pawn and preparing to castle.',
        replySan: 'Be2', replyWhy: 'White develops quietly and sensibly. No tricks yet - just a big centre against your elastic setup.' },
      { san: 'O-O', why: 'Castle to safety. The setup is complete: their centre is big, your position is elastic, and the fight starts level in everything except familiarity.',
        replySan: 'O-O', replyWhy: 'White castles too. Now the real game: your plan is to chip at their centre with pawn breaks - the c- or e-pawn, when the moment comes.' },
    ],
  },
  {
    id: 'owens', name: "Owen's Defence", side: 'b', tier: 'SOUND SURPRISE', color: '#c084fc',
    blurb: 'Fianchetto the queenside bishop on move one and build a small, tough position behind it.',
    engineRead: 'Machine read: White keeps a real pull (+0.9). You trade comfort for a position your opponent has likely never played.',
    intro: "The Owen's Defence. You fianchetto the queenside bishop immediately, keep your position small and tough, and counterpunch later. The machine gives White a real pull - that is the honest price - and in exchange you get a position with no map. You are Black: White moves first.",
    handoff: 'Lesson complete. Tough, flexible, weakness-free. Play it against me from here.',
    setupSan: ['e4'],
    setupWhy: 'White takes the centre with the king pawn - the natural start, and the one this defence answers sideways.',
    steps: [
      { san: 'b6', why: 'No central pawns at all. Your bishop comes to the long diagonal next, and every pawn stays flexible.',
        replySan: 'd4', replyWhy: 'White builds the ideal two-pawn centre. Let them - a big centre is a big target.' },
      { san: 'Bb7', why: 'The bishop arrives on the long diagonal, pressuring the advanced centre from a safe distance.',
        replySan: 'Bd3', replyWhy: 'White develops and protects the centre - the main line and the most natural move here.' },
      { san: 'e6', why: 'Quietly open the door for your dark-squared bishop and keep everything defended. Small but solid.',
        replySan: 'Nf3', replyWhy: 'White develops the knight to its most natural square. Their position looks textbook - that is fine.' },
      { san: 'c5', why: 'The first counterpunch: you chip at the base of their pawn centre.',
        replySan: 'c3', replyWhy: 'White reinforces. Now their centre is solid - and slightly passive. Your position has no weaknesses.' },
      { san: 'Nf6', why: 'Knight out, adding a third attacker to their advanced centre pawn and preparing to castle.',
        replySan: 'O-O', replyWhy: 'White castles. Both sides are developed - and the position is nothing like a standard opening.' },
      { san: 'Be7', why: 'Bishop out, ready to castle into a position with no bad pieces and no theory to forget. From here, you counterpunch.' },
    ],
  },
  {
    id: 'halloween', name: 'Halloween Gambit', side: 'w', tier: 'AMBUSH', color: '#dc2626',
    blurb: 'Sacrifice a knight on move four for a stampede of centre pawns. Unsound, chaotic, and very hard to face cold.',
    engineRead: 'Machine read: losing (-1.6) against accurate defence. This card is honest: you are buying chaos, not an advantage.',
    intro: 'The Halloween Gambit. You sacrifice a whole knight on move four - on purpose - for a rampaging pawn centre. This is an ambush, not a sound opening: the machine refutes it, but finding the refutation over the board, cold, is a nasty job. Six moves.',
    handoff: 'Ambush set. Remember the deal: a piece down, a pawn stampede, and all to play for. Rehearse against me - prove you can convert the chaos.',
    steps: [
      { san: 'e4', why: 'King pawn. The trap needs the open game - invite them in politely.',
        replySan: 'e5', replyWhy: 'They accept the invitation.' },
      { san: 'Nf3', why: 'Knight out, attacking their centre pawn. Everything looks completely normal. Good.',
        replySan: 'Nc6', replyWhy: 'They defend. Still a quiet dinner party.' },
      { san: 'Nc3', why: 'Second knight into the Four Knights - the most symmetrical, harmless-looking position in chess. It is a disguise.',
        replySan: 'Nf6', replyWhy: 'They mirror you. Symmetry is the trigger - the ambush only fires now.' },
      { san: 'Nxe5', why: 'THE HALLOWEEN. The knight leaps to its doom. You give a whole piece for their centre pawn and what comes next.',
        replySan: 'Nxe5', replyWhy: 'They take - the machine\'s choice too. Now the stampede.',
        branch: 'If they do NOT take, you have won a centre pawn for nothing: develop normally with a small, real edge. The gambit fails politely.' },
      { san: 'd4', why: 'The centre starts rolling. Their knight has no good square and must flee while your pawns gain move after move.',
        replySan: 'Ng6', replyWhy: 'The best square - their knight retreats and you keep pushing. This is the entire point of the sacrifice.' },
      { san: 'e5', why: 'Push again. Their second knight must go home too. You are a piece down - and their whole position is paralysed.',
        replySan: 'Ng8', replyWhy: 'Back to the start square. A piece down, a monster centre, and the initiative in your hands. Attack with everything - the position demands it.' },
    ],
  },
  {
    id: 'englund', name: 'Englund Gambit', side: 'b', tier: 'AMBUSH', color: '#991b1b',
    blurb: 'Offer a whole pawn on move one and set the most famous trap in gambit chess. Pure ambush, honestly labelled.',
    engineRead: 'Machine read: White is clearly better (+1.2) with the correct defence. This one lives entirely on surprise.',
    intro: 'The Englund Gambit. You offer a pawn on move one and set a trap that has claimed victims for over a century - and you will learn it to checkmate. Be honest with yourself: against the correct defence you are simply worse. You are playing for the trap. You are Black: White moves first.',
    handoff: 'Checkmate - the full trap, landed to the very end. Now the honest rehearsal: I restart from the moment before White\'s mistake and defend PROPERLY. Prove you can still fight.',
    setupSan: ['d4'],
    setupWhy: 'White opens with the queen pawn - the only start this gambit answers.',
    rehearsalPlies: 10,  // through 5...Qxb2: White must defend, engine will not fall for the trap
    steps: [
      { san: 'e5', why: 'The Englund. You offer your e-pawn immediately, gambling everything on speed and one famous trap.',
        replySan: 'dxe5', replyWhy: 'White takes the pawn - the critical reply, and the only one this lesson needs.',
        branch: 'If White declines and simply develops, play normal chess - slightly worse, fully playable.' },
      { san: 'Nc6', why: 'Develop with pressure: your knight already attacks the pawn they just won.',
        replySan: 'Nf3', replyWhy: 'White defends the pawn with the knight - the most natural move on the board.' },
      { san: 'Qe7', why: 'The queen slides out - a second attacker on their pawn, and the raid begins. This move is the whole idea.',
        replySan: 'Bf4', replyWhy: 'White develops the bishop and holds the pawn. Natural, strong-looking, and one step from the edge.' },
      { san: 'Qb4+', why: 'Check! The queen forks the king and the pawn they won - and eyes something bigger on the queenside.',
        replySan: 'Bd2', replyWhy: 'White blocks the check with the bishop - the move nearly everyone plays here.' },
      { san: 'Qxb2', why: 'The queen takes a second pawn and attacks their rook. It looks like you are simply winning material. You are really setting the hook.',
        replySan: 'Bc3', replyWhy: 'White attacks your queen and saves the rook - the natural move. It is also the losing move.',
        branch: 'The accurate defence is developing the queenside knight instead. Then your queen is running for its life, you are a pawn down, and the machine\'s verdict is the reality. That is the gamble you signed up for.' },
      { san: 'Bb4', why: 'The trap springs: your bishop pins theirs against their queen, and their whole queenside collapses.',
        replySan: 'Qd2', replyWhy: 'White tries to hold the bishop together. The machine says Black is already winning from here - every defence fails.' },
      { san: 'Bxc3', why: 'Take it. Their queenside falls apart and their king is stranded in the middle.',
        replySan: 'Qxc3', replyWhy: 'White recaptures with the queen. It looks like they have survived. They have one move left to play.' },
      { san: 'Qc1#', why: 'Checkmate. The queen slides to the back rank and there is no answer. That is the whole gambit: eight moves, one trap, mate.' },
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
