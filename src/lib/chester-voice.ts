// Chester's voice: difficulty-scaled personality verdicts, grounded coaching and story recaps.
// Deterministic by design - zero per-visit prompt cost, no engine jargon, facts come from Stockfish telemetry.

export type PersonaKey = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type Verdict = {
  word: string;
  emoji: string;
  color: string;
};

const VERDICTS: Record<string, Verdict> = {
  BRILLIANT: { word: 'BRILLIANT', emoji: '🔥', color: '#ffd84d' },
  BEST: { word: 'SPOT ON', emoji: '🔥', color: '#ffd84d' },
  GREAT: { word: 'STRONG', emoji: '😎', color: '#22d3ee' },
  GOOD: { word: 'SOLID', emoji: '🙂', color: '#2563eb' },
  INACCURACY: { word: 'SHAKY', emoji: '🤨', color: '#f3c8d6' },
  MISTAKE: { word: 'DANGER', emoji: '😬', color: '#ff8c00' },
  BLUNDER: { word: 'BLUNDER', emoji: '💀', color: '#f43f7a' },
};

export function getVerdict(classification: string | null | undefined): Verdict {
  return VERDICTS[(classification || '').toUpperCase()] || { word: 'ON THE BOARD', emoji: '♞', color: '#2563eb' };
}

export const PERSONA_DESC: Record<PersonaKey, string> = {
  BEGINNER: 'a warm, patient coach who genuinely wants the player to win and explains everything kindly',
  INTERMEDIATE: 'a friendly rival-coach who plays fair, praises good moves and teases lightly',
  ADVANCED: 'a stern master with high standards who respects precision and calls out sloppiness dryly',
  EXPERT: 'a merciless trash-talker who mocks blunders, barely admits good moves are good, and loves being feared',
};

const LINES: Record<PersonaKey, Record<string, string[]>> = {
  BEGINNER: {
    BRILLIANT: [
      'Beautiful. That is exactly the move I hoped you would find - moves like that win games before the ending even starts.',
      'Outstanding. You saw what most players miss: the best move is the one that asks a question your opponent cannot answer.',
      'Wow. If you keep finding moves like that, I am going to start taking notes from YOU.',
      'That move deserves a little parade. The whole position just lit up - enjoy this feeling, then do it again.',
    ],
    BEST: [
      'The best move on the board, and you played it like it was obvious. That confidence is earned.',
      'Perfect choice. The board agreed with you completely - and the board is a harsh critic.',
      'Exactly right. You trusted your read of the position and the position rewarded you.',
      'Spot on. That is the move a coach would circle in green ink. Keep this standard.',
    ],
    GREAT: [
      'Strong move. Your pieces are starting to work as a team - and teamwork is how small edges become wins.',
      'I like that. You are thinking like a chess player now: every piece with a job, no square left lonely.',
      'Now that is purposeful chess. Every move with a reason is a brick in a house your opponent has to knock down.',
      'Lovely. You are not just moving pieces, you are improving them - that is the whole secret.',
    ],
    GOOD: [
      'Solid. A healthy position is like a balanced breakfast - not flashy, but it wins the day.',
      'Good, honest chess. Keep building: centre first, pieces out, king safe.',
      'Sensible. Quiet moves like this are how strong players quietly strangle positions.',
      'That works. Not every move needs fireworks - some moves just keep the story tidy.',
    ],
    INACCURACY: [
      'Playable, but something in your camp just got looser - check what I can attack before it introduces itself.',
      'Not wrong, but not tight either. Loose pieces are snacks your opponent did not bring.',
      'Hmm. You got away with that one, but let us tighten up - check every piece you just touched.',
      'A small wobble. Nothing is lost - but do a quick safety count before your next adventure.',
    ],
    MISTAKE: [
      'Careful now. That gives me a real chance - find my most forcing reply before it finds you.',
      'That one exposes something. Rescue first, plans later: a piece in danger ignores all your other dreams.',
      'Ouch - that hands me an opportunity. Defence first: what did that move leave unguarded?',
      'That slipped a little. Take a breath, find the loose piece, and patch the wall before decorating.',
    ],
    BLUNDER: [
      'Stop. Breathe. Something is hanging - save it before you plan anything else. Even grandmasters blunder; they just rescue faster.',
      'That piece needs help right now. You can still fight back: every great comeback starts with one calm defensive move.',
      'Okay, that one hurt. But games are full of twists - find the danger, steady the ship, and make me earn it.',
      'Big oops. The good news: blunders are the best teachers. What is hanging, and how do we save it?',
    ],
  },
  INTERMEDIATE: {
    BRILLIANT: [
      'Now that was a shot. Brilliantly played - you made the board do the work for you.',
      'Cold-blooded and correct. That move turns the whole game - I felt that from over here.',
      'Brilliant. You found the one move that makes every other piece look clever.',
      'That is highlight-reel chess. Somewhere a commentator just stood up.',
    ],
    BEST: [
      'The engine nods, and so do I. Maximum value, minimum fuss, zero regret.',
      'The engine nods, and so do I. Maximum value, minimum fuss.',
      'Best move on the board. You are reading positions, not guessing them.',
      'Exactly the right call. That is the move that keeps pressure where it belongs.',
    ],
    GREAT: [
      'Strong. You are playing real chess today - threats first, decoration later.',
      'That has teeth. You keep improving the worst-placed piece, which is annoyingly good strategy.',
      'Nice. You are building something here, and I can feel the squeeze already.',
      'A proper chess move. Purpose, pressure, no wasted motion.',
    ],
    GOOD: [
      'Good, honest move. The fight continues - quiet moves win loud games.',
      'Sound. You kept the tension and your options - boring-looking, secretly strong.',
      'Fair enough. Not every move draws blood; some just sharpen the knife.',
      'Decent. The position stays balanced, which means the mistakes will decide it. Avoid them.',
    ],
    INACCURACY: [
      'A little loose. I would not have let that slip - and I charge full price for loose pieces.',
      'Slippery. That gives me a hook I did not have a move ago.',
      'Small leak. At your level, small leaks are how big advantages start.',
      'Playable, sure. But you made my next move easier to find than it should be.',
    ],
    MISTAKE: [
      'That hurts you more than it hurts me. Watch my reply - it will be the forcing kind.',
      'There was a better move in that position, and part of you knew it. Count what changed.',
      'That concedes something real. Your next two moves are damage control.',
      'Oof. You just made my plan easier - forcing moves first, remember?',
    ],
    BLUNDER: [
      'Big swing and a miss. This is where comebacks start. Or funerals. Find what is hanging and choose the comeback.',
      'That just changed the game, and not in your favour. Rescue mode: save the material, keep the king breathing.',
      'A gift, sincerely received. Now make it interesting - complicate everything.',
      'Rough. That is the kind of move you remember at 2am. Recover fast, fight dirty, stay calm.',
    ],
  },
  ADVANCED: {
    BRILLIANT: [
      'Precise. That is how a strong player thinks - the position was read, not guessed.',
      'Excellent. The tactical justification was there, and you had the nerve to play it.',
      'A genuinely strong blow. That move converts calculation into advantage.',
      'Impressive accuracy. You found the one continuation that punishes the setup.',
    ],
    BEST: [
      'Optimal and calm. You took the full point the position offered without over-reaching.',
      'Optimal. You squeezed the maximum from that position without a wasted tempo.',
      'The correct continuation. Calculation and evaluation in agreement - as they should be.',
      'Best available. That is the standard to hold yourself to.',
    ],
    GREAT: [
      'Good. You are earning this position, one accurate move at a time.',
      'Strong technique. You improved your pieces while asking a question I must answer.',
      'Well judged. The kind of move that wins games without making noise.',
      'Correct instincts. Pressure maintained, structure intact.',
    ],
    GOOD: [
      'Correct. Nothing fancy, everything sound - soundness is a strategy, not a personality flaw.',
      'Reasonable. You kept equality and options; the position will offer chances later.',
      'Adequate and safe. At your level, safety is a weapon when the opponent overextends.',
      'Sound. No concessions given, none taken. The battle moves to the next phase.',
    ],
    INACCURACY: [
      'Imprecise. At this level, small leaks sink ships - and you just heard water.',
      'Slightly off. You know the principle that move bends, and so do I.',
      'Loose. The evaluation barely moved, but the trend matters more than the number.',
      'Not the cleanest. You left a detail unattended - those details collect interest.',
    ],
    MISTAKE: [
      'That is a real concession. Prove you saw my reply, because I assure you there is one.',
      'A genuine error. The forcing continuation is available now - defend accurately or lose material.',
      'Inaccurate at the wrong moment. Your structure just became a target.',
      'That releases pressure you spent moves building. Recovery starts with the most forcing defence.',
    ],
    BLUNDER: [
      'Unacceptable. Pick what you just lost, then fight like you mean it. The lesson is free; the piece was not.',
      'A decisive error. Now the discipline: minimize, complicate, and make the conversion difficult.',
      'That is the kind of move that loses games outright. Your only job now is maximum resistance.',
      'Careless. The position was fine a move ago. Rebuild the defence and punish any overconfidence.',
    ],
  },
  EXPERT: {
    BRILLIANT: [
      'Huh. I was going to play that. Enjoy your one good move - savour it, frame it, because I adapt.',
      'Annoyingly good. I will pretend I let you have it, but we both know you found it.',
      'That was actually brilliant, which makes me suspicious. Do it again and I might respect you.',
      'Fine. Stunning move. My circuits briefly considered applauding. Briefly.',
    ],
    BEST: [
      'Engine-best. I suppose I have to respect that, out loud, briefly. Do not get comfortable.',
      'The engine agrees with you. Do not let it go to your head - I have beaten the engine too.',
      'Best move. Even my smugness has limits, and you just found one.',
      'Correct. I hate admitting that, so let us move on quickly.',
    ],
    GREAT: [
      'Fine. That was actually good. Do not get used to it - compliments are rationed around here.',
      'A real chess move. I will file that under "disturbing competence".',
      'Strong. You are making this less fun for me, which I suppose is the point.',
      'That was almost impressive. Almost. Keep going and I might worry.',
    ],
    GOOD: [
      'Adequate. The bar was underground, but adequate. Even I cannot take that move from you.',
      'Acceptable. You managed not to ruin anything, which is apparently progress.',
      'Tolerable. I have seen worse from players who charge for lessons.',
      'That move is legal and vaguely sensible. Low praise, honestly earned.',
    ],
    INACCURACY: [
      'Sloppy. I can smell the weakness already - loose pieces are my love language.',
      'Imprecise. I noticed. Of course I noticed. Noticing is literally my job.',
      'A little gift-wrapped inaccuracy. Not fatal - just flattering to my position.',
      'You wobbled. Tiny wobble, giant consequences, eventually. Thank you.',
    ],
    MISTAKE: [
      'There it is. The gift I ordered. Now watch me take it - this is why we count what changed.',
      'A mistake. I will be sending a thank-you card to whatever distracted you.',
      'Delicious. You worked so hard on that position and then handed me the keys.',
      'Wrong move. I almost feel bad. Almost. Watch what happens next.',
    ],
    BLUNDER: [
      'HA. Straight into my highlight reel. Recover from THAT, I dare you - tip: start by finding what still fights.',
      'A blunder of genuine quality. Museums will want it. Your position, meanwhile, wants a doctor.',
      'Magnificent - for me. That move just donated material to the Chester Relief Fund.',
      'Oh, that is spectacularly bad. I am saving this position for my memoirs.',
    ],
  },
};

function pick(lines: string[], seed: number) {
  return lines[Math.abs(seed) % lines.length];
}

function moveHash(move: string | undefined): number {
  let h = 0;
  for (const ch of move || '') h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

// Variety engine: seed by ply AND move so the same grade never serves the same line twice in a row.
function varietySeed(prompt: CoachPromptShape): number {
  return (prompt.ply || 0) * 97 + moveHash(prompt.move) * 13 + (prompt.streak || 0) * 7;
}

export type CoachPromptShape = {
  kind?: 'move' | 'help';
  move?: string;
  movePhrase?: string | null;
  classification?: string | null;
  bestMove?: string | null;
  bestMovePhrase?: string | null;
  continuation?: string[];
  captured?: string | null;
  check?: boolean;
  mate?: boolean;
  ply?: number;
  streak?: number;
};

export function personaCoaching(prompt: CoachPromptShape, persona: PersonaKey): string {
  const label = (prompt.classification || '').toUpperCase();
  // Only natural-language, legality-checked phrases may be shown - never raw notation.
  const moveWords = prompt.movePhrase || null;
  const bestWords = prompt.bestMovePhrase || null;
  if (prompt.kind === 'help') {
    const idea = bestWords || 'bringing a new piece into the game';
    const suffix: Record<PersonaKey, string> = {
      BEGINNER: 'Before you move, check whether Chester can take an unprotected piece or give check.',
      INTERMEDIATE: 'Before you commit, count what each side can take next.',
      ADVANCED: 'Calculate my most forcing reply first. Then decide.',
      EXPERT: 'Try not to ruin it. I am watching.',
    };
    return `Try this: ${idea}. ${suffix[persona]}`;
  }
  const voice = pick(LINES[persona][label] || LINES[persona].GOOD, varietySeed(prompt));
  const positive = label === 'BRILLIANT' || label === 'BEST' || label === 'GREAT';
  const streakOpeners: Record<PersonaKey, string> = {
    BEGINNER: 'Look at you go - strong moves are becoming a habit. ',
    INTERMEDIATE: 'You are on a roll. Rolls win games. ',
    ADVANCED: 'Sustained accuracy. This is how positions are actually won. ',
    EXPERT: 'A streak of good moves. I am choosing to find it irritating. ',
  };
  const streakPrefix = positive && (prompt.streak || 0) >= 3 ? streakOpeners[persona] : '';
  // Fact tails vary like the voices do - the same situation never gets the same sentence twice in a row.
  const FACT_MATE = [
    'Chester’s king has nowhere safe to go. That is the whole story.',
    'Every escape square is covered. That is what checkmate feels like from the wrong side.',
    'The king is out of moves and out of hiding places. Textbook finish.',
  ];
  const FACT_CHECK = [
    'Your check forces a reply, so you win time for your next idea.',
    'Check means Chester moves where you say - you just took the steering wheel.',
    'That check buys you a free tempo. Spend it on your most ambitious piece.',
  ];
  const FACT_CAPTURE = [
    'Material changed hands, so count what each side can take next.',
    'Pieces are coming off - recount the trade before you plan anything fancy.',
    'A capture shifts the balance sheet. Check who profits before the dust settles.',
  ];
  const FACT_DANGER = [
    'One of your pieces may now be easier to attack. Find Chester’s most forcing reply before planning anything else.',
    'Something in your camp just got looser. Ask what Chester can hit before you build anything new.',
    'That move may have left a piece under-defended. Count the attackers before you count your plans.',
  ];
  const FACT_QUIET = [
    'Now ask what Chester can attack, then improve a piece that is still sitting at home.',
    'Good positions are built one job at a time - which of your pieces is still unemployed?',
    'No fireworks needed here. Give your quietest piece a better square and the position grows.',
    'Steady. Strong players use calm moves to ask: what is my worst-placed piece, and where does it want to live?',
  ];
  const factSeed = varietySeed(prompt) + 5;
  let fact = '';
  if (prompt.mate) fact = pick(FACT_MATE, factSeed);
  else if (prompt.check) fact = pick(FACT_CHECK, factSeed);
  else if (prompt.captured) fact = pick(FACT_CAPTURE, factSeed);
  else if (label === 'INACCURACY' || label === 'MISTAKE' || label === 'BLUNDER') fact = pick(FACT_DANGER, factSeed);
  else fact = pick(FACT_QUIET, factSeed);
  const played = moveWords ? `You played: ${moveWords}.` : (prompt.move ? `You played ${prompt.move}.` : '');
  const alternative = bestWords && bestWords !== moveWords ? ` My engine's pick in that spot was ${bestWords}.` : '';
  return `${streakPrefix}${voice} ${played} ${fact}${alternative}`;
}

export type StoryMove = { move: string; player: string; ply: number; grade: 'A' | 'B' | 'C' | 'F'; centipawnLoss: number | null };

export function buildStoryRecap(grades: StoryMove[], persona: PersonaKey, phraseFor?: (ply: number, san: string) => string | null): string {
  const mine = grades.filter((entry) => entry.player !== 'Chester');
  if (!mine.length) return 'Short game. Come back with a longer story and I will grade every chapter.';
  const best = mine.reduce((a, b) => ((a.centipawnLoss ?? 999) <= (b.centipawnLoss ?? 999) ? a : b));
  const worst = mine.reduce((a, b) => ((a.centipawnLoss ?? 0) >= (b.centipawnLoss ?? 0) ? a : b));
  const goodCount = mine.filter((entry) => entry.grade === 'A' || entry.grade === 'B').length;
  const hadRealBlunder = (worst.centipawnLoss ?? 0) >= 250;
  const openers: Record<PersonaKey, string> = {
    BEGINNER: 'Here is the story of our game, and I am proud of parts of it.',
    INTERMEDIATE: 'Story time. You earned an honest review.',
    ADVANCED: 'The post-mortem. No flattery, only facts.',
    EXPERT: 'The autopsy. Try not to cry.',
  };
  const bestWords = phraseFor?.(best.ply, best.move);
  const worstWords = phraseFor?.(worst.ply, worst.move);
  const bestLine = bestWords
    ? `Your finest moment was on move ${Math.ceil(best.ply / 2)}: ${bestWords} - that is the habit to keep.`
    : `Your finest moment came on move ${Math.ceil(best.ply / 2)} - that is the habit to keep.`;
  const turnLine = hadRealBlunder
    ? worstWords
      ? `The turning point was move ${Math.ceil(worst.ply / 2)} - ${worstWords} - where the position swung hard against you. Before your next big idea, scan checks and captures first.`
      : `The turning point was move ${Math.ceil(worst.ply / 2)}, where the position swung hard against you. Before your next big idea, scan checks and captures first.`
    : `You never gave me a real opening - no single move swung the game, which is how strong players win slowly.`;
  const countLine = `${goodCount} of your ${mine.length} moves were genuinely good ones.`;
  const tip = hadRealBlunder
    ? 'Next game, try this: pause one breath before every move and ask what your last move left undefended.'
    : 'Next game, keep that discipline and add one sharper threat per move.';
  return `${openers[persona]} ${bestLine} ${turnLine} ${countLine} ${tip}`;
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export type OfflineChatState = {
  persona: PersonaKey;
  fen?: string;
  lastMove?: string;
  classification?: string | null;
  bestMove?: string | null;
  evalNote?: string;
  capturedCount?: number;
  historyCount?: number;
};

// Chester's offline chat brain: intent-aware, position-aware where facts exist, varied by seed so
// he never repeats a canned line verbatim. Used whenever the Gemini desk is unreachable.
export function chesterOfflineChat(message: string, state: OfflineChatState): string {
  const m = message.toLowerCase().trim();
  const seed = hashSeed(`${m}|${state.historyCount ?? 0}|${state.lastMove ?? ''}`);
  const pickFrom = (lines: string[]) => lines[seed % lines.length];
  const verdict = state.classification ? getVerdict(state.classification).word.toLowerCase() : null;
  const facts: string[] = [];
  if (state.lastMove) facts.push(`your last move ${state.lastMove} read ${verdict || 'interesting'}`);
  if (state.bestMove) facts.push(`my engine's top idea here is ${state.bestMove}`);
  if (state.evalNote) facts.push(`Stockfish scores it ${state.evalNote}`);
  if (state.capturedCount) facts.push(`${state.capturedCount} piece${state.capturedCount === 1 ? ' has' : 's have'} fallen so far`);
  const record = facts.length ? ` Right now: ${facts.join(', ')}.` : '';

  if (/share|friend|link|challenge|invite|duel/.test(m)) {
    return pickFrom([
      `Easy. Head back to the arena and hit CHALLENGE A FRIEND - it builds a private duel link you can send to anyone. They open it, you both play on one device pass-and-play, and I commentate every move like a tiny jester referee.`,
      `The CHALLENGE A FRIEND button in the arena is your ticket. It writes a duel link; your friend opens it and the two of you fight it out, pass-and-play, with me judging both sides out loud.`,
    ]);
  }
  if (/who are you|your name|about yourself|what are you/.test(m)) {
    return pickFrom([
      `Chester, at your service - jester of Chess Town, part coach, part heckler, full-time believer that anyone can learn this game. I grade your moves, draw arrows at your mistakes, and occasionally say something wise by accident.`,
      `I am Chester: your knight in slightly tarnished armour. I watch every move, celebrate the good ones loudly, and turn the bad ones into lessons before they hurt twice.`,
    ]);
  }
  if (/^(hi|hello|hey|yo|hiya|good (morning|evening|afternoon))\b/.test(m)) {
    return pickFrom([
      `Well met, challenger. Ask me about your position, an opening, or why your knight keeps wandering off - I have opinions.${record}`,
      `Chester reporting for duty. Bring me a chess question and I will bring you a lesson with a joke smuggled inside it.${record}`,
    ]);
  }
  if (/opening|first move|start the game|begin the game/.test(m)) {
    return pickFrom([
      `Start with the centre: a pawn two squares in front of your king or queen, then knights and bishops out before anything moves twice. Castle by move ten and you are already ahead of most beginners.`,
      `My favourite opening lesson fits in one breath: centre pawn, develop knights and bishops, castle early, connect the rooks. Fancy openings can wait - habits win games first.`,
    ]);
  }
  if (/too (fast|quick)|slow|tempo|commentar|commentat|remarks? about|banter/.test(m)) {
    return pickFrom([
      `Heard, and already handled: I now take a proper thinking pause - a couple of seconds, like a real opponent - before my reply lands, and commentary belongs to YOUR moves only. My own moves just appear on the board after the beat. Your move, your spotlight.`,
      `Sharp eyes, and good news: my replies now arrive after a deliberate pause so you can read the verdict on your move, and I no longer commentate my own moves at all. Quiet opponent, loud coach.`,
    ]);
  }
  if (/hint|help|what.*(do|play|move)|should i|worried|safe|danger|threat/.test(m)) {
    const idea = state.bestMove ? `Try ${state.bestMove}.` : 'Look for checks and captures first, then ask which of your pieces is loose.';
    const personaSuffix: Record<PersonaKey, string> = {
      BEGINNER: 'That order - checks, captures, loose pieces - is the whole secret to staying safe.',
      INTERMEDIATE: 'Count what changed after every move and the board stops surprising you.',
      ADVANCED: 'Calculate my most forcing reply first. Then decide.',
      EXPERT: 'Try not to hang anything while I watch. I notice everything.',
    };
    return pickFrom([
      `${idea} ${personaSuffix[state.persona]}${record}`,
      `Here is the read: ${idea} ${personaSuffix[state.persona]}${record}`,
    ]);
  }
  const generic: Record<PersonaKey, string[]> = {
    BEGINNER: [
      `Good question to chew on. My standing advice: every move should do a job - centre, development, or king safety. Pick the move that ticks one of those boxes and you will rarely go wrong.${record}`,
      `Here is a lesson worth keeping: before you commit to any idea, ask what your opponent can take next. Most games at any level turn on that one habit.${record}`,
    ],
    INTERMEDIATE: [
      `I like the question. Short answer, Chester style: make threats first, decorations later - quiet moves win loud games.${record}`,
      `Let me put it this way: the player who counts what changed after each move beats the player who memorises lines.${record}`,
    ],
    ADVANCED: [
      `Precision question, precision answer: evaluate what the last move changed - lines opened, squares weakened, pieces loose - then choose the most forcing reply. Soundness is a strategy, not a personality flaw.${record}`,
      `At your level the edge comes from leak-free moves. Small leaks sink ships; check what this position just loosened.${record}`,
    ],
    EXPERT: [
      `Bold of you to ask the executioner for advice. Fine: find your loosest piece before I do - loose pieces are my love language.${record}`,
      `I will say this once: every blunder you have ever made was visible one move earlier. Look harder than I think you can.${record}`,
    ],
  };
  return pickFrom(generic[state.persona]);
}
