// SURPRISE LAB (BUILD 194) - guided lessons for unusual openings, his 7 Nov 01:53 ask:
// "learn unusual or outside the box openings to surprise good players, fully guided
// move by move." Every scripted line is engine-verified (Stockfish 18, depth 18,
// MultiPV walks on chess.js-generated FENs - never hand-written FENs). Opponent replies
// are the engine's own top choice at nearly every node; theory-standard exceptions are
// the natural human move and say so. Every card carries the honest machine read:
// playable surprise vs ambush is stated plainly, nothing is oversold.
// Copy rules: no generalisations about people ("nobody studies this"), no overclaims
// about positions; every why-line is specific to the move actually on the board.
export type LabBranchLine = {
  replySan: string;      // the strong alternative, played on the board in the detour
  replyWhy: string;      // what it is testing
  answerSan: string;     // the answer the user must find (engine-verified)
  answerWhy: string;     // why it works - shown after they find it
  answerHint: string;    // specific nudge after a wrong try, without naming the move
};
export type LabStep = {
  san: string;            // the user's scripted move (SAN)
  why: string;            // Chester's why-line, shown before the move
  mistake?: string;       // what a wrong move fails to do - shown on correction
  replySan?: string;      // the strong scripted reply (omitted on a lesson's final step)
  replyWhy?: string;      // what that reply is trying to do
  branch?: string;        // "if they're good": the actual strong alternative and its answer
  branchLine?: LabBranchLine; // interactive detour: the alternative on the board, user finds the answer
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
    blurb: 'Push the b-pawn on move one: queenside space and a bishop on the long diagonal. You set the agenda from the first move.',
    engineRead: 'Machine read: your opponent keeps a small pull (-0.4). Fully playable - the honest price of steering the game your way.',
    intro: 'The Sokolsky. One wing-pawn step and the game leaves the main highways. The idea: queenside space, a bishop ruling the longest diagonal, and a centre they must build for themselves. Six moves, then you drive.',
    handoff: 'Lesson complete. A level, lively position they cannot have memorised. Now play it against me - no hints.',
    steps: [
      { san: 'b4', mistake: 'the b-pawn two squares claims queenside space AND clears the long diagonal in one move. (b3 would clear the diagonal too, but without the space - a tamer, different opening.)',
        why: 'Kick off with the wing pawn. You claim queenside space and clear the long diagonal for your bishop - the whole opening in one move.',
        replySan: 'e5', replyWhy: 'The principled answer: they take the centre. That is exactly what this opening wants - their centre is now a target.',
        branch: 'If they develop quietly instead of grabbing the centre, your plan is unchanged: bishop to the long diagonal, queenside space, patience.',
        branchLine: { replySan: 'Nf6', replyWhy: 'They ignore your pawn and simply develop - the quiet test.', answerSan: 'Bb2', answerWhy: 'Your plan is unchanged: the bishop takes the long diagonal. Quiet development refutes nothing.', answerHint: 'They ignored your pawn entirely - what was that pawn buying?' } },
      { san: 'Bb2', mistake: 'the bishop to the long diagonal is the point of the whole opening - without it they keep the pawn and you have no pressure to show.',
        why: 'The point of the whole opening. Your bishop now stares down the longest diagonal in chess, straight at their centre pawn.',
        replySan: 'Bxb4', replyWhy: 'They take the pawn you offered - the critical test of the whole line. That pawn is the entry fee for what happens next.' },
      { san: 'Bxe5', mistake: 'collecting the centre pawn is the compensation - slower moves let them keep it.',
        why: 'Collect their centre pawn. Now their pieces must dance around your bishop, and the diagonal is yours for the whole game.',
        replySan: 'Nf6', replyWhy: 'They develop and kick your bishop at the same time. Stepping back is not retreating - the diagonal stays yours.',
        branch: 'The machine slightly prefers kicking your bishop with the f-pawn first. Same answer: the bishop slips back along the diagonal and you build with the c-pawn.',
        branchLine: { replySan: 'f6', replyWhy: 'The machine\'s preferred kick: the f-pawn attacks your bishop at once.', answerSan: 'Bb2', answerWhy: 'The bishop slips back along the diagonal it owns. Nothing is lost - the c-pawn builds next.', answerHint: 'The bishop is kicked - where does it stay on its diagonal?' } },
      { san: 'c4', mistake: 'the c-pawn supports the bishop and grabs more space - the squeeze is the plan.',
        why: 'More queenside space. Your plan was never to keep the extra pawn - it is to squeeze. Their bishop biting the queenside looks active but achieves nothing.',
        replySan: 'O-O', replyWhy: 'They castle - the natural human choice. The machine weighs knight-to-c6 development the same; your next moves work against both.',
        branch: 'If they strike the centre with the d-pawn instead of castling, capture it and open the c-file - your queenside pawns become a real asset.',
        branchLine: { replySan: 'd5', replyWhy: 'They strike the centre instead of castling - the principled test.', answerSan: 'cxd5', answerWhy: 'Capture it. The c-file opens and your queenside pawns become a real asset.', answerHint: 'Their centre pawn is loose - which pawn of yours is pointing at it?' } },
      { san: 'Nf3', mistake: 'the knight belongs on f3, watching the centre and preparing to castle.',
        why: 'Knight out, eyeing the centre. Every one of your pieces develops toward their king.',
        replySan: 'd5', replyWhy: 'They strike the centre - the strongest plan, and the one a well-prepared player will find. Hold your nerve: your structure was built for exactly this.' },
      { san: 'e3', mistake: 'the e-pawn opens the door for your other bishop and stays solid - the plan is space, not a race.',
        why: 'Reinforce. Your centre flexes instead of breaking, and your second bishop is ready to join the game.',
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
      { san: 'e4', mistake: 'the king\'s pawn is the whole idea - you cannot offer the gambit without it.',
        why: 'King pawn. If they answer with the Sicilian, you meet it with a move order that leaves the main-line books on move two.',
        replySan: 'c5', replyWhy: 'The Sicilian Defence. Entire books exist on its main lines. This gambit sidesteps nearly all of them.' },
      { san: 'd4', mistake: 'challenging their centre pawn immediately is the point - waiting lets them build the Sicilian they know.',
        why: 'Challenge the centre immediately. This is the fork where the game leaves the well-trodden Sicilian paths.',
        replySan: 'cxd4', replyWhy: 'They capture, as the large majority of players do here. Now the offer.',
        branch: 'If they decline and build quietly with the e-pawn, grab the space with the d-pawn - cramped for them, and every sharp Sicilian main line avoided.',
        branchLine: { replySan: 'e6', replyWhy: 'They decline and build quietly with the e-pawn - no gambit accepted.', answerSan: 'd5', answerWhy: 'The machine\'s answer: grab the space. Their quiet setup is cramped, and every sharp Sicilian main line is avoided.', answerHint: 'No gambit accepted - so take the space they left behind.' } },
      { san: 'c3', mistake: 'offering the second pawn is the gambit\'s price for speed - and speed is now.',
        why: 'The Smith-Morra. A real pawn, offered for pure speed. Declining is safer for them - taking is human.',
        replySan: 'dxc3', replyWhy: 'They accept. From here you gain a developing move every turn while their pieces are still at home.',
        branch: 'The strongest decline is ignoring the pawn and developing. Kick their knight with the e-pawn and keep the initiative.',
        branchLine: { replySan: 'Nf6', replyWhy: 'The strongest decline: they ignore the second pawn and develop.', answerSan: 'e5', answerWhy: 'Kick the knight with the e-pawn. You keep the initiative, and nothing was even invested.', answerHint: 'Their knight just walked into pawn range - which pawn can hit it?' } },
      { san: 'Nxc3', mistake: 'taking back with the knight lands it on its best square - you are two pieces developed.',
        why: 'Recapture with the knight. One pawn down, three pieces ready to fly. That is the deal - and the machine calls it a fair one.',
        replySan: 'Nc6', replyWhy: 'They develop and guard the centre - the strongest defence.' },
      { san: 'Nf3', mistake: 'developing the other knight keeps the lead - chasing the pawn back wastes what you paid for.',
        why: 'Second knight out. Your bishops come next, and both centre files belong to you.',
        replySan: 'd6', replyWhy: 'The careful, classical setup - a solid player keeps it tight. You are not checkmating anyone today; you are building pressure that lasts.',
        branch: 'If they keep it classical with the e-pawn, same plan: bishop to c4, castle, pressure on the d-file.',
        branchLine: { replySan: 'e6', replyWhy: 'They keep it classical with the e-pawn - a solid, compact structure.', answerSan: 'Bc4', answerWhy: 'Same plan: the bishop takes its post, you castle, and the pressure builds.', answerHint: 'Same plan as the main line - which piece still wants its square?' } },
      { san: 'Bc4', mistake: 'the bishop points at their softest square - that pressure is what the pawn bought.',
        why: 'Bishop to the most dangerous diagonal in the position, pointing at the softest square in their camp.',
        replySan: 'a6', replyWhy: 'They spend a whole move keeping your pieces off the queenside - an admission that the pressure is already real.' },
      { san: 'O-O', mistake: 'castling comes first - the rook wants the open file and the king wants safety before the attack.',
        why: 'King safe, rook coming to the middle. The gambit is complete: a pawn down, and every single piece humming.',
        replySan: 'Nf6', replyWhy: 'They finally develop the kingside. The middlegame starts now - with you ahead on development and open lines.' },
    ],
  },
  {
    id: 'bird', name: 'Bird Opening', side: 'w', tier: 'SOUND SURPRISE', color: '#a3e635',
    blurb: 'The Dutch Defence with an extra move in hand: grip the central dark squares, fianchetto, and build toward the kingside.',
    engineRead: 'Machine read: a small pull for your opponent (-0.3). A full, fighting game away from the main-line books.',
    intro: 'The Bird. You take the Dutch Defence - a respected fighting opening - and play it with an extra move in hand. The plan: control the central dark squares, fianchetto the queenside bishop, and aim everything at their kingside. Six moves, then you drive.',
    handoff: 'Lesson complete. Compact, flexible, with real kingside chances and no theory baggage. Play it against me - no hints.',
    steps: [
      { san: 'f4', mistake: 'the f-pawn grabs central space and frees your knight\'s favourite square - that is this plan.',
        why: 'The f-pawn grabs the dark square in front of your king\'s knight. From move one, this game is about the kingside.',
        replySan: 'd5', replyWhy: 'The main answer: they take their share of the centre and open the diagonal for their light-squared bishop.',
        branch: 'The sharpest test is the From Gambit - they offer the e-pawn for a development lead. The solid response: take it, give it straight back, and finish developing.',
        branchLine: { replySan: 'e5', replyWhy: 'The From Gambit - the sharpest practical test. They offer a pawn for a development lead.', answerSan: 'fxe5', answerWhy: 'Take it. When they offer the follow-up, give the pawn straight back and finish developing - the machine\'s clean route.', answerHint: 'They offered a pawn - take it on your terms.' } },
      { san: 'Nf3', mistake: 'the knight guards the centre from f3 - it belongs there before anything else moves.',
        why: 'Knight out, reinforcing your grip on the key square and clearing the way to castle.',
        replySan: 'Nf6', replyWhy: 'They develop toward the same central squares. Symmetrical - but you moved first.' },
      { san: 'e3', mistake: 'the e-pawn keeps the centre solid - anything committal gives them a target.',
        why: 'Solidify. Your pawns form a chain and your king\'s bishop gets its development square.',
        replySan: 'g6', replyWhy: 'They fianchetto - a natural setup against the Bird, pointing their bishop at your centre.' },
      { san: 'b3', mistake: 'the b-pawn prepares the bishop\'s long diagonal - the other half of the plan.',
        why: 'Mirror them: your queenside bishop is coming to the long diagonal, where it watches the centre and their kingside at once.',
        replySan: 'Bg7', replyWhy: 'Their bishop lands on the long diagonal. The two bishops now stare through the centre - tension you will use later.' },
      { san: 'Bb2', mistake: 'the bishop completes the grip on the dark squares - without it your centre pawns are just targets.',
        why: 'The bishop arrives. Both your bishops now point toward their king\'s house - that is the attacking geometry of the Bird.',
        replySan: 'O-O', replyWhy: 'They castle - into safety, or into the firing line. That depends on how well you play the next ten moves.' },
      { san: 'Be2', mistake: 'finishing development comes first: bishop out, ready to castle - safety before ambition.',
        why: 'Last piece out, king ready to castle. The setup is complete: compact centre, bishops aimed, knights ready to jump.',
        replySan: 'c5', replyWhy: 'They challenge your dark-square grip immediately - the critical test of the whole setup, and the position you must learn to handle.' },
    ],
  },
  {
    id: 'alekhine', name: "Alekhine's Defence", side: 'b', tier: 'SOUND SURPRISE', color: '#2dd4bf',
    blurb: 'Let White chase your knight and build a huge centre - then chip it until it cracks.',
    engineRead: 'Machine read: White gets a clear pull (+0.9 in this line). You play it for counterattack and imbalance, not for comfort.',
    intro: "Alekhine's Defence. You let White build a big pawn centre - then spend the game proving it overreached. It has been played by world champions. You are Black: White moves first, then you are on script.",
    handoff: 'Lesson complete. Solid, uncracked, and ready to counterattack. Play it against me from here - I will push the centre, you prove it is weak.',
    setupSan: ['e4'],
    setupWhy: 'White takes the centre with the king pawn - the classical start, and the one this defence was built to answer.',
    steps: [
      { san: 'Nf6', mistake: 'the knight provokes the whole game - the plan is to make their pawns overreach.',
        why: 'No pawn in the centre at all. You invite the pawns forward, because every step they take becomes a target later.',
        replySan: 'e5', replyWhy: 'White kicks your knight immediately - the main line, and exactly what you came for.' },
      { san: 'Nd5', mistake: 'the knight steps to d5, not backwards - retreating gives their centre a free pass.',
        why: 'The knight lands in the centre - for now. If White spends a pawn move chasing it, that pawn becomes your next target.',
        replySan: 'd4', replyWhy: 'More centre. White builds a broad pawn front - and a broad front is a broad target.' },
      { san: 'd6', mistake: 'chipping at the advanced pawn now - waiting lets them support it forever.',
        why: 'The first chip. You attack the head of their pawn chain immediately.',
        replySan: 'Nf3', replyWhy: 'White defends the centre sensibly - the solid Modern Variation.',
        branch: 'If White keeps chasing your knight with pawns instead, drop the knight back toward your camp, then attack the advanced centre pawn until it falls. Overextension is the whole plan.',
        branchLine: { replySan: 'c4', replyWhy: 'White keeps chasing your knight with pawns - the Four Pawns idea.', answerSan: 'Nb6', answerWhy: 'Drop the knight back toward your camp. Their pawns are overextended now - you attack the centre pawn until it falls.', answerHint: 'The knight is chased again - where does it go toward home?' } },
      { san: 'Bg4', mistake: 'pinning their knight before it defends the centre - pressure is the plan.',
        why: 'Bishop out, pinning the knight that guards their centre. The pressure on their advanced pawns doubles.',
        replySan: 'Be2', replyWhy: 'White calmly breaks the pin - the strongest and most natural answer. Do not chase shadows; finish developing.' },
      { san: 'e6', mistake: 'the e-pawn opens lines for your pieces behind the wall - your bishops need air.',
        why: 'Open the door for your dark-squared bishop and blunt their whole pawn front. Your position is small but solid as a rock.',
        replySan: 'O-O', replyWhy: 'White castles. The centre hangs in tension - the kind of position that is yours, not theirs from a book.' },
      { san: 'Be7', mistake: 'finishing the kingside: bishop out, ready to castle - the counterattack comes from safety.',
        why: 'Development complete, king ready to castle, and their centre still has to prove itself. You have earned a real fight - now make the position strange.' },
    ],
  },
  {
    id: 'modern', name: 'Modern Defence', side: 'b', tier: 'SOUND SURPRISE', color: '#f472b6',
    blurb: 'Concede the centre, fianchetto the king\'s bishop, then undermine everything they build.',
    engineRead: 'Machine read: White keeps a pull (+0.5). The most established defence on this shelf.',
    intro: 'The Modern Defence. You let White have the whole centre, then prove it can be attacked. It is the most established opening in this lab - an old weapon that still pulls games off the memorised highways. You are Black: White moves first.',
    handoff: 'Lesson complete. Elastic, uncracked, and ready to strike at the centre. Play it against me - no hints.',
    setupSan: ['e4'],
    setupWhy: 'White takes the king-pawn centre - the most natural start, and exactly what you were hoping for.',
    steps: [
      { san: 'g6', mistake: 'the fianchetto is this plan: the bishop will rule the long diagonal.',
        why: 'You concede the centre on move one. Your king\'s bishop is coming to the long diagonal, and your pawns stay flexible.',
        replySan: 'd4', replyWhy: 'White builds the full two-pawn centre - the most natural reply and the main test of your idea.' },
      { san: 'Bg7', mistake: 'the bishop is the defence - it lands on the long diagonal before anything else.',
        why: 'The bishop takes the long diagonal. It will watch their centre all game, waiting for its moment.',
        replySan: 'Nc3', replyWhy: 'White develops and reinforces the centre - the standard Classical setup.' },
      { san: 'd6', mistake: 'the d-pawn supports the centre quietly - grabbing more space now overextends.',
        why: 'Support the bishop and prepare your knights. Your position is small, but there are no targets in it.',
        replySan: 'Nf3', replyWhy: 'White\'s most natural developing move. Their centre looks mighty - and it is fixed, and fixed things can be attacked.' },
      { san: 'Nf6', mistake: 'the knight pressures their centre from f6 - it cannot sit home while the centre is contested.',
        why: 'Knight out, pressuring their advanced centre pawn and preparing to castle.',
        replySan: 'Be2', replyWhy: 'White develops quietly and sensibly. No tricks yet - just a big centre against your elastic setup.' },
      { san: 'O-O', mistake: 'castling now - the king must leave the centre before the fight starts.',
        why: 'Castle to safety. The setup is complete: their centre is big, your position is elastic, and the fight starts level in everything except familiarity.',
        replySan: 'O-O', replyWhy: 'White castles too. Now the real game: your plan is to chip at their centre with pawn breaks - the c- or e-pawn, when the moment comes.' },
      { san: 'c5', mistake: 'the c-pawn break is the point of the whole defence - their pawns must react to you.',
        why: 'Now strike at the centre with the c-pawn. This break is the whole point of the defence - their pawns must react to you.',
        replySan: 'd5', replyWhy: 'They grab space and close your bishop\'s diagonal - the standard answer. Your position stays compact, and the e-pawn break comes later.' }
    ],
  },
  {
    id: 'owens', name: "Owen's Defence", side: 'b', tier: 'SOUND SURPRISE', color: '#c084fc',
    blurb: 'Fianchetto the queenside bishop on move one and build a small, tough position behind it.',
    engineRead: 'Machine read: White keeps a real pull (+0.9). You trade comfort for a position away from every main line.',
    intro: "The Owen's Defence. You fianchetto the queenside bishop immediately, keep your position small and tough, and counterpunch later. The machine gives White a real pull - that is the honest price - and in exchange you get a position with no map. You are Black: White moves first.",
    handoff: 'Lesson complete. Tough, flexible, weakness-free. Play it against me from here.',
    setupSan: ['e4'],
    setupWhy: 'White takes the centre with the king pawn - the natural start, and the one this defence answers sideways.',
    steps: [
      { san: 'b6', mistake: 'the b-pawn prepares your bishop\'s long diagonal - that is this plan.',
        why: 'No central pawns at all. Your bishop comes to the long diagonal next, and every pawn stays flexible.',
        replySan: 'd4', replyWhy: 'White builds the ideal two-pawn centre. Let them - a big centre is a big target.' },
      { san: 'Bb7', mistake: 'the bishop takes the long diagonal immediately - it is the point of the opening.',
        why: 'The bishop arrives on the long diagonal, pressuring the advanced centre from a safe distance.',
        replySan: 'Bd3', replyWhy: 'White develops and protects the centre - the main line and the most natural move here.' },
      { san: 'e6', mistake: 'the e-pawn keeps their centre honest and frees your other bishop.',
        why: 'Quietly open the door for your dark-squared bishop and keep everything defended. Small but solid.',
        replySan: 'Nf3', replyWhy: 'White develops the knight to its most natural square. Their position looks textbook - that is fine.' },
      { san: 'c5', mistake: 'challenging their pawn chain at the base - quiet moves let them roll forward.',
        why: 'The first counterpunch: you chip at the base of their pawn centre.',
        replySan: 'c3', replyWhy: 'White reinforces. Now their centre is solid - and slightly passive. Your position has no weaknesses.' },
      { san: 'Nf6', mistake: 'the knight develops with pressure on their centre.',
        why: 'Knight out, adding a third attacker to their advanced centre pawn and preparing to castle.',
        replySan: 'O-O', replyWhy: 'White castles. Both sides are developed - and the position is nothing like a standard opening.' },
      { san: 'Be7', mistake: 'finishing development and preparing to castle - the king must leave the centre before it opens.',
        why: 'Bishop out, ready to castle into a position with no bad pieces and no theory to forget. From here, you counterpunch.' },
    ],
  },
  {
    id: 'halloween', name: 'Halloween Gambit', side: 'w', tier: 'AMBUSH', color: '#dc2626',
    blurb: 'Sacrifice a knight on move four for a stampede of centre pawns. Unsound, chaotic, and very hard to face cold.',
    engineRead: 'Machine read: losing (-1.6) against accurate defence. This card is honest: you are buying chaos, not an advantage.',
    intro: 'The Halloween Gambit. You sacrifice a whole knight on move four - on purpose - for a rampaging pawn centre. This is an ambush, not a sound opening: the machine refutes it, but finding the refutation over the board, cold, is a nasty job. Six moves.',
    handoff: 'Ambush set. Remember the deal: a piece down, a pawn stampede, and all to play for. Rehearse against me - prove you can convert the chaos.',
    steps: [
      { san: 'e4', mistake: 'the king\'s pawn is the setup - the gambit does not exist without it.',
        why: 'King pawn. The trap needs the open game - invite them in politely.',
        replySan: 'e5', replyWhy: 'They accept the invitation.' },
      { san: 'Nf3', mistake: 'developing with attack on their pawn - the invitation needs their knight on the board.',
        why: 'Knight out, attacking their centre pawn. Everything looks completely normal. Good.',
        replySan: 'Nc6', replyWhy: 'They defend. Still a quiet dinner party.' },
      { san: 'Nc3', mistake: 'inviting the Four Knights - the trap needs their knight on f6 and yours on c3.',
        why: 'Second knight into the Four Knights - the most symmetrical, harmless-looking position in chess. It is a disguise.',
        replySan: 'Nf6', replyWhy: 'They mirror you. Symmetry is the trigger - the ambush only fires now.' },
      { san: 'Nxe5', mistake: 'the sacrifice works because of the fork trick: whatever they take with, your pawns win the piece back. Now, not later.',
        why: 'THE HALLOWEEN. The knight leaps to its doom. You give a whole piece for their centre pawn and what comes next.',
        replySan: 'Nxe5', replyWhy: 'They take - the machine\'s choice too. Now the stampede.',
        branch: 'If they do NOT take, you have won a centre pawn for nothing: develop normally with a small, real edge. The gambit fails politely.',
        branchLine: { replySan: 'Bc5', replyWhy: 'They refuse the knight and simply develop - the polite decline.', answerSan: 'Nf3', answerWhy: 'Step back. You have won a centre pawn for nothing - develop normally with a small, real edge.', answerHint: 'You are a pawn up - keep it: where does the knight go safely?' } },
      { san: 'd4', mistake: 'kicking the knight with the d-pawn - tempo is the entire point of the gambit.',
        why: 'The centre starts rolling. Their knight has no good square and must flee while your pawns gain move after move.',
        replySan: 'Ng6', replyWhy: 'The best square - their knight retreats and you keep pushing. This is the entire point of the sacrifice.' },
      { san: 'e5', mistake: 'keep kicking - the e-pawn drives the second knight back and wins your piece back.',
        why: 'Push again. Their second knight must go home too. You are a piece down - and their whole position is paralysed.',
        replySan: 'Ng8', replyWhy: 'Back to the start square. A piece down, a monster centre, and the initiative in your hands. Attack with everything - the position demands it.' },
    ],
  },
  {
    id: 'englund', name: 'Englund Gambit', side: 'b', tier: 'AMBUSH', color: '#991b1b',
    blurb: 'Offer a whole pawn on move one and set a trap that has been catching players for decades. Pure ambush, honestly labelled.',
    engineRead: 'Machine read: White is clearly better (+1.2) with the correct defence. This one lives entirely on surprise.',
    intro: 'The Englund Gambit. You offer a pawn on move one and set a trap that has claimed victims for over a century - and you will learn it to checkmate. Be honest with yourself: against the correct defence you are simply worse. You are playing for the trap. You are Black: White moves first.',
    handoff: 'Checkmate - the full trap, landed to the very end. Now the honest rehearsal: I restart from the moment before White\'s mistake and defend PROPERLY. Prove you can still fight.',
    setupSan: ['d4'],
    setupWhy: 'White opens with the queen pawn - the only start this gambit answers.',
    rehearsalPlies: 10,  // through 5...Qxb2: White must defend, engine will not fall for the trap
    steps: [
      { san: 'e5', mistake: 'the plan is the pawn offer itself - normal development is a different, quieter defence.',
        why: 'The Englund. You offer your e-pawn immediately, gambling everything on speed and one vicious trap.',
        replySan: 'dxe5', replyWhy: 'White takes the pawn - the critical reply, and the only one this lesson needs.',
        branch: 'If White declines and simply develops, play normal chess - slightly worse, fully playable.',
        branchLine: { replySan: 'Nc3', replyWhy: 'White declines and simply develops a knight.', answerSan: 'Nc6', answerWhy: 'Play normal chess. Slightly worse - the honest price when they refuse - but fully playable.', answerHint: 'No trap today - just develop a piece.' } },
      { san: 'Nc6', mistake: 'developing with pressure on the advanced pawn - the trap is built on their greed.',
        why: 'Develop with pressure: your knight already attacks the pawn they just won.',
        replySan: 'Nf3', replyWhy: 'White defends the pawn with the knight - the most natural move on the board.' },
      { san: 'Qe7', mistake: 'the queen sets the bait from e7 - the trap\'s thread runs through this square.',
        why: 'The queen slides out - a second attacker on their pawn, and the raid begins. This move is the whole idea.',
        replySan: 'Bf4', replyWhy: 'White develops the bishop and holds the pawn. Natural, strong-looking, and one step from the edge.' },
      { san: 'Qb4+', mistake: 'the check drags their bishop to d2 - without it the trap door never opens.',
        why: 'Check! The queen forks the king and the pawn they won - and eyes something bigger on the queenside.',
        replySan: 'Bd2', replyWhy: 'White blocks the check with the bishop - the move nearly everyone plays here.' },
      { san: 'Qxb2', mistake: 'taking the pawn - this is the moment they choose between the trap and the accurate defence.',
        why: 'The queen takes a second pawn and attacks their rook. It looks like you are simply winning material. You are really setting the hook.',
        replySan: 'Bc3', replyWhy: 'White attacks your queen and saves the rook - the natural move. It is also the losing move.',
        branch: 'The accurate defence is developing the queenside knight instead. Then your queen is running for its life, you are a pawn down, and the machine\'s verdict is the reality. That is the gamble you signed up for.',
        branchLine: { replySan: 'Nc3', replyWhy: 'The accurate defence: the queenside knight develops, and the trap door stays shut.', answerSan: 'Nb4', answerWhy: 'The machine\'s survival line: knight to b4, back to a6, and your queen escapes via a3. You are a pawn down for nothing - this is why the Englund is an ambush, not a sound weapon.', answerHint: 'The queen needs escape squares - the c6 knight can make them. Where?' } },
      { san: 'Bb4', mistake: 'the bishop pins their knight - the pin is the trap\'s teeth.',
        why: 'The trap springs: your bishop pins theirs against their queen, and their whole queenside collapses.',
        replySan: 'Qd2', replyWhy: 'White tries to hold the bishop together. The machine says Black is already winning from here - every defence fails.' },
      { san: 'Bxc3', mistake: 'removing the defender now - anything else lets their king slip away.',
        why: 'Take it. Their queenside falls apart and their king is stranded in the middle.',
        replySan: 'Qxc3', replyWhy: 'White recaptures with the queen. It looks like they have survived. They have one move left to play.' },
      { san: 'Qc1#', mistake: 'the back-rank queen drop is mate - everything is covered. Anything else lets the king live.',
        why: 'Checkmate. The queen slides to the back rank and there is no answer. That is the whole gambit: eight moves, one trap, mate.' },
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
