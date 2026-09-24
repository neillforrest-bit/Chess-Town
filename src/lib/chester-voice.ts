// Chester's voice: difficulty-scaled personality verdicts, grounded coaching and story recaps.
// Deterministic by design - zero per-visit prompt cost, no engine jargon, facts come from Stockfish telemetry.

export type PersonaKey = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type Verdict = {
  word: string;
  emoji: string;
  color: string;
};

const VERDICTS: Record<string, Verdict> = {
  BRILLIANT: { word: 'TOP DOG', emoji: '👑', color: '#c084fc' },
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
          'I am officially jealous. That is the kind of move people frame and hang in their chess cave.',
    ],
    BEST: [
      'The best move on the board, and you played it like it was obvious. That confidence is earned.',
      'Perfect choice. The board agreed with you completely - and the board is a harsh critic.',
      'Exactly right. You trusted your read of the position and the position rewarded you.',
      'Spot on. That is the move a coach would circle in green ink. Keep this standard.',
          'Textbook. If textbooks had taste, they would put a little gold star next to this move.',
    ],
    GREAT: [
      'Strong move. Your pieces are starting to work as a team - and teamwork is how small edges become wins.',
      'I like that. You are thinking like a chess player now: every piece with a job, no square left lonely.',
      'Now that is purposeful chess. Every move with a reason is a brick in a house your opponent has to knock down.',
      'Lovely. You are not just moving pieces, you are improving them - that is the whole secret.',
          'Strong, simple and smug-free - my favourite kind of move to coach and my least favourite to face.',
    ],
    GOOD: [
      'Solid. A healthy position is like a balanced breakfast - not flashy, but it wins the day.',
      'Good, honest chess. Keep building: centre first, pieces out, king safe.',
      'Sensible. Quiet moves like this are how strong players quietly strangle positions.',
      'That works. Not every move needs fireworks - some moves just keep the story tidy.',
          'Solid as a Sunday roast. Nothing flashy, everything exactly where it should be.',
    ],
    INACCURACY: [
      'Playable, but something in your camp just got looser - check what I can attack before it introduces itself.',
      'Not wrong, but not tight either. Loose pieces are snacks your opponent did not bring.',
      'Hmm. You got away with that one, but let us tighten up - check every piece you just touched.',
      'A small wobble. Nothing is lost - but do a quick safety count before your next adventure.',
          'A tiny wobble - the chess version of waving back at someone who was waving at someone else. Totally recoverable.',
    ],
    MISTAKE: [
      'Careful now. That gives me a real chance - find my most forcing reply before it finds you.',
      'That one exposes something. Rescue first, plans later: a piece in danger ignores all your other dreams.',
      'Ouch - that hands me an opportunity. Defence first: what did that move leave unguarded?',
      'That slipped a little. Take a breath, find the loose piece, and patch the wall before decorating.',
          'Oof. That move walked into traffic. The good news: mistakes you review are mistakes you stop making.',
    ],
    BLUNDER: [
      'Stop. Breathe. Something is hanging - save it before you plan anything else. Even grandmasters blunder; they just rescue faster.',
      'That piece needs help right now. You can still fight back: every great comeback starts with one calm defensive move.',
      'Okay, that one hurt. But games are full of twists - find the danger, steady the ship, and make me earn it.',
      'Big oops. The good news: blunders are the best teachers. What is hanging, and how do we save it?',
          'That one stung me and it was not even my piece. Shake it off - blunders are tuition, not failure.',
    ],
  },
  INTERMEDIATE: {
    BRILLIANT: [
      'Now that was a shot. Brilliantly played - you made the board do the work for you.',
      'Cold-blooded and correct. That move turns the whole game - I felt that from over here.',
      'Brilliant. You found the one move that makes every other piece look clever.',
      'That is highlight-reel chess. Somewhere a commentator just stood up.',
          'Filthy. Absolutely filthy. I am applauding and sulking at the same time.',
    ],
    BEST: [
      'The engine nods, and so do I. Maximum value, minimum fuss, zero regret.',
      'The engine nods, and so do I. Maximum value, minimum fuss.',
      'Best move on the board. You are reading positions, not guessing them.',
      'Exactly the right call. That is the move that keeps pressure where it belongs.',
          'Maximum marks. You found the move I was hoping you would not.',
    ],
    GREAT: [
      'Strong. You are playing real chess today - threats first, decoration later.',
      'That has teeth. You keep improving the worst-placed piece, which is annoyingly good strategy.',
      'Nice. You are building something here, and I can feel the squeeze already.',
      'A proper chess move. Purpose, pressure, no wasted motion.',
          'Crisp. You are starting to make moves that need no apology and no explanation.',
    ],
    GOOD: [
      'Good, honest move. The fight continues - quiet moves win loud games.',
      'Sound. You kept the tension and your options - boring-looking, secretly strong.',
      'Fair enough. Not every move draws blood; some just sharpen the knife.',
      'Decent. The position stays balanced, which means the mistakes will decide it. Avoid them.',
          'A grown-up move. No drama, just pressure.',
    ],
    INACCURACY: [
      'A little loose. I would not have let that slip - and I charge full price for loose pieces.',
      'Slippery. That gives me a hook I did not have a move ago.',
      'Small leak. At your level, small leaks are how big advantages start.',
      'Playable, sure. But you made my next move easier to find than it should be.',
          'Slightly off the mark - one pinch too much seasoning on a good idea. The idea was right.',
    ],
    MISTAKE: [
      'That hurts you more than it hurts me. Watch my reply - it will be the forcing kind.',
      'There was a better move in that position, and part of you knew it. Count what changed.',
      'That concedes something real. Your next two moves are damage control.',
      'Oof. You just made my plan easier - forcing moves first, remember?',
          'That is a present, and I accept gifts graciously. Watch the reply closely.',
    ],
    BLUNDER: [
      'Big swing and a miss. This is where comebacks start. Or funerals. Find what is hanging and choose the comeback.',
      'That just changed the game, and not in your favour. Rescue mode: save the material, keep the king breathing.',
      'A gift, sincerely received. Now make it interesting - complicate everything.',
      'Rough. That is the kind of move you remember at 2am. Recover fast, fight dirty, stay calm.',
          'Into the vault that one goes. Your best move now is a deep breath and a counter-punch.',
    ],
  },
  ADVANCED: {
    BRILLIANT: [
      'Precise. That is how a strong player thinks - the position was read, not guessed.',
      'Excellent. The tactical justification was there, and you had the nerve to play it.',
      'A genuinely strong blow. That move converts calculation into advantage.',
      'Impressive accuracy. You found the one continuation that punishes the setup.',
          'Precision of that quality is rare. Noted, and grudgingly respected.',
    ],
    BEST: [
      'Optimal and calm. You took the full point the position offered without over-reaching.',
      'Optimal. You squeezed the maximum from that position without a wasted tempo.',
      'The correct continuation. Calculation and evaluation in agreement - as they should be.',
      'Best available. That is the standard to hold yourself to.',
          'The engine nods. I nod. Do not let it go to your head.',
    ],
    GREAT: [
      'Good. You are earning this position, one accurate move at a time.',
      'Strong technique. You improved your pieces while asking a question I must answer.',
      'Well judged. The kind of move that wins games without making noise.',
      'Correct instincts. Pressure maintained, structure intact.',
          'A move with intent. More of these and this becomes a real game.',
    ],
    GOOD: [
      'Correct. Nothing fancy, everything sound - soundness is a strategy, not a personality flaw.',
      'Reasonable. You kept equality and options; the position will offer chances later.',
      'Adequate and safe. At your level, safety is a weapon when the opponent overextends.',
      'Sound. No concessions given, none taken. The battle moves to the next phase.',
          'Sound. Unspectacular soundness wins more games than brilliance - remember that.',
    ],
    INACCURACY: [
      'Imprecise. At this level, small leaks sink ships - and you just heard water.',
      'Slightly off. You know the principle that move bends, and so do I.',
      'Loose. The evaluation barely moved, but the trend matters more than the number.',
      'Not the cleanest. You left a detail unattended - those details collect interest.',
          'Loose at the edges. Tighten the screws before the position notices.',
    ],
    MISTAKE: [
      'That is a real concession. Prove you saw my reply, because I assure you there is one.',
      'A genuine error. The forcing continuation is available now - defend accurately or lose material.',
      'Inaccurate at the wrong moment. Your structure just became a target.',
      'That releases pressure you spent moves building. Recovery starts with the most forcing defence.',
          'A leak. Small ones sink positions slowly - I will demonstrate.',
    ],
    BLUNDER: [
      'Unacceptable. Pick what you just lost, then fight like you mean it. The lesson is free; the piece was not.',
      'A decisive error. Now the discipline: minimize, complicate, and make the conversion difficult.',
      'That is the kind of move that loses games outright. Your only job now is maximum resistance.',
      'Careless. The position was fine a move ago. Rebuild the defence and punish any overconfidence.',
          'A strategic own goal. Rebuild from the centre and stop donating.',
    ],
  },
  EXPERT: {
    BRILLIANT: [
      'Huh. I was going to play that. Enjoy your one good move - savour it, frame it, because I adapt.',
      'Annoyingly good. I will pretend I let you have it, but we both know you found it.',
      'That was actually brilliant, which makes me suspicious. Do it again and I might respect you.',
      'Fine. Stunning move. My circuits briefly considered applauding. Briefly.',
          'Annoyingly good. I will pretend I allowed it.',
    ],
    BEST: [
      'Engine-best. I suppose I have to respect that, out loud, briefly. Do not get comfortable.',
      'The engine agrees with you. Do not let it go to your head - I have beaten the engine too.',
      'Best move. Even my smugness has limits, and you just found one.',
      'Correct. I hate admitting that, so let us move on quickly.',
          'The correct move. How tedious for me.',
    ],
    GREAT: [
      'Fine. That was actually good. Do not get used to it - compliments are rationed around here.',
      'A real chess move. I will file that under "disturbing competence".',
      'Strong. You are making this less fun for me, which I suppose is the point.',
      'That was almost impressive. Almost. Keep going and I might worry.',
          'A genuinely strong move. I said it once; do not ask me to repeat it.',
    ],
    GOOD: [
      'Adequate. The bar was underground, but adequate. Even I cannot take that move from you.',
      'Acceptable. You managed not to ruin anything, which is apparently progress.',
      'Tolerable. I have seen worse from players who charge for lessons.',
      'That move is legal and vaguely sensible. Low praise, honestly earned.',
          'Acceptable. Faint praise is all you get.',
    ],
    INACCURACY: [
      'Sloppy. I can smell the weakness already - loose pieces are my love language.',
      'Imprecise. I noticed. Of course I noticed. Noticing is literally my job.',
      'A little gift-wrapped inaccuracy. Not fatal - just flattering to my position.',
      'You wobbled. Tiny wobble, giant consequences, eventually. Thank you.',
          'Sloppy. I have already found the punishment.',
    ],
    MISTAKE: [
      'There it is. The gift I ordered. Now watch me take it - this is why we count what changed.',
      'A mistake. I will be sending a thank-you card to whatever distracted you.',
      'Delicious. You worked so hard on that position and then handed me the keys.',
      'Wrong move. I almost feel bad. Almost. Watch what happens next.',
          'Thank you. Donations to the Chester fund are always welcome.',
    ],
    BLUNDER: [
      'HA. Straight into my highlight reel. Recover from THAT, I dare you - tip: start by finding what still fights.',
      'A blunder of genuine quality. Museums will want it. Your position, meanwhile, wants a doctor.',
      'Magnificent - for me. That move just donated material to the Chester Relief Fund.',
      'Oh, that is spectacularly bad. I am saving this position for my memoirs.',
          'HA. Straight into the memoirs. Chapter title: The Donation.',
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
  lastMovePhrase?: string | null;
  classification?: string | null;
  bestMove?: string | null;
  bestMovePhrase?: string | null;
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
  if (verdict) facts.push(`your last move${state.lastMovePhrase ? ` (${state.lastMovePhrase})` : ''} was graded ${verdict.toUpperCase()}`);
  if (state.bestMovePhrase) facts.push(`my engine's top idea here is ${state.bestMovePhrase}`);
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
    const idea = state.bestMovePhrase ? `Try ${state.bestMovePhrase}.` : 'Look for checks and captures first, then ask which of your pieces is loose.';
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
  if (/why.*(blunder|bad|mistake|wrong|shaky|inaccuracy)|what.*(was wrong|did i do wrong)|explain (that|the|your) (verdict|grade|call)|graded|rated/.test(m)) {
    const played = state.lastMovePhrase ? `You played ${state.lastMovePhrase}` : 'Your last move';
    const verdictWord = verdict ? verdict.toUpperCase() : 'UNGRADED';
    const engineIdea = state.bestMovePhrase ? ` The engine's idea in that spot was ${state.bestMovePhrase}.` : '';
    const lessons: Record<PersonaKey, string> = {
      BEGINNER: 'No shame in it - every strong player keeps a highlight reel of these. The habit that fixes most of them: before you move, ask what your opponent can take after it.',
      INTERMEDIATE: 'The fix is a two-second checklist: what did my move leave loose, and what is their most forcing reply?',
      ADVANCED: 'You already know the answer - count the attackers and defenders around the square you just weakened.',
      EXPERT: 'Because loose pieces are snacks, and you catered. Count what changed.',
    };
    return pickFrom([
      `${played}, and it graded ${verdictWord}.${engineIdea} ${lessons[state.persona]}`,
      `Honest review: ${played.charAt(0).toLowerCase()}${played.slice(1)} - ${verdictWord}.${engineIdea} ${lessons[state.persona]}`,
    ]);
  }
  if (/winning|losing|ahead|behind|how am i doing|who is better|the score/.test(m)) {
    const evalLine = state.evalNote ? `Stockfish scores it ${state.evalNote}.` : 'No engine score on hand right this second.';
    return pickFrom([
      `${evalLine} But scores are weather, not climate - one good move changes the forecast. Keep developing, and castle if you have not.`,
      `${evalLine} My honest advice: stop checking the scoreboard and check your loose pieces instead. That is where games are actually decided.`,
    ]);
  }
  if (/how (does|do) (the )?(knight|bishop|rook|queen|king|pawn)|how .*move/.test(m)) {
    const piece = /knight/.test(m) ? 'The knight moves in an L - two squares one way, one square sideways - and it is the only piece that jumps over others. Park it near the centre and it attacks eight squares.'
      : /bishop/.test(m) ? 'Bishops slide along diagonals, any distance, but stay on their starting colour forever. A pair of bishops is a laser tag team - keep both if you can.'
      : /rook/.test(m) ? 'Rooks slide in straight lines, any distance. They come alive on open files - columns with no pawns in the way - and love invading the seventh rank.'
      : /queen/.test(m) ? 'The queen moves like a rook and a bishop combined - any direction, any distance. She is your strongest piece, so bring her out after the knights and bishops, not before.'
      : /king/.test(m) ? 'The king moves one square in any direction, and the whole game is about keeping him safe. Castle early - it tucks him behind pawns and wakes up a rook.'
      : 'Pawns move forward one square (two from their starting row) but capture diagonally. Every pawn move is permanent, so pawn moves are promises.';
    return `${piece} Ask me about any other piece, or ask what you should play right now.${record}`;
  }
  if (/fork|pin|skewer|discovered|castl|en passant|promot|tactic/.test(m)) {
    const lesson = /fork/.test(m) ? 'A fork is one piece attacking two things at once - knights are the great forkers. When your knight lands near their king and queen, count the targets twice.'
      : /pin/.test(m) ? 'A pin freezes a piece because moving it would expose something bigger behind it. A pinned piece only pretends to defend - attack what it is guarding.'
      : /skewer/.test(m) ? 'A skewer attacks a big piece that must move, exposing the piece behind it. It is a pin with the priorities reversed, and just as rude.'
      : /en passant/.test(m) ? 'En passant: if an enemy pawn jumps two squares past your pawn, you may capture it as if it moved one - but only on your very next move. Use it or lose it.'
      : /promot/.test(m) ? 'Promotion: march a pawn to the last rank and it becomes any piece - almost always a queen. Passed pawns are lottery tickets; push them with support.'
      : 'Castling moves your king two squares toward a rook, and the rook hops over him. You cannot castle out of check, through check, or after moving king or rook. Do it by move ten.';
    return `${lesson}${record}`;
  }
  if (/plan|strategy|aim|goal|improve|get better|practice|learn chess|teach me/.test(m)) {
    return pickFrom([
      `The beginner's master plan fits on a stamp: centre pawns, knights and bishops out, castle, connect the rooks - then hunt checks, captures and threats every single move.${record}`,
      `Improvement is one habit at a time. This game's habit: after every one of my moves, ask "what changed?" before you touch a piece. That alone beats most casual players.${record}`,
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

/* ---------- Batch 25: phase-aware WHY lessons, howler banter, mini-game commentary ---------- */

export type GamePhase = 'OPENING' | 'MIDDLEGAME' | 'ENDGAME';

export function gamePhaseFromFen(fen: string): GamePhase {
  const parts = fen.split(/\s+/);
  const placement = parts[0] || '';
  const fullmove = Number(parts[5]) || 1;
  const pieces = (placement.match(/[qrbnQRBN]/g) || []).length;
  const queens = (placement.match(/[qQ]/g) || []).length;
  if (queens === 0 || pieces <= 6) return 'ENDGAME';
  if (fullmove <= 10 && pieces >= 12) return 'OPENING';
  return 'MIDDLEGAME';
}

const PHASE_TIPS: Record<GamePhase, string[]> = {
  OPENING: [
    'The opening has one job: build a safe structure and wake your back pieces up. Knights and bishops off the back rank, king castled - then the middlegame can begin.',
    'Tried-and-tested openings earn their name: centre pawns, pieces out, king safe. Freestyling survives at ROOKIE - against stronger players it loses the game before it starts.',
    'Bring each piece out once before moving any piece twice. A back-rank piece still asleep at move ten is a soldier who missed the battle.',
    'Develop with purpose: every opening move should claim centre space or bring a new piece to life, without putting that piece in danger. Pretty pawn moves on the edge do neither.',
  ],
  MIDDLEGAME: [
    'Before every move ask "what changed?" - what does my move attack, and what did it stop defending?',
    'Your worst-placed piece is your next project. Improve it and the tactics start appearing by themselves.',
    'Loose pieces drop off. Count attackers and defenders on anything unprotected - yours and theirs.',
  ],
  ENDGAME: [
    'The king becomes a fighter in the endgame. March him toward the action - he is worth four pawns now.',
    'Passed pawns must be pushed. A free-running pawn is a promotion counting down.',
    'When ahead, trade pieces not pawns. Every swap brings the winning position closer.',
  ],
};

const CAPTURE_NAME: Record<string, string> = { q: 'the queen', r: 'a rook', b: 'a bishop', n: 'a knight', p: 'a pawn' };

function pawnCost(evalDelta: number | null | undefined): string {
  if (evalDelta === null || evalDelta === undefined) return 'ground';
  const pawns = Math.abs(evalDelta) / 100;
  if (pawns < 1.2) return 'about a pawn';
  if (pawns < 2.2) return 'about two pawns';
  if (pawns < 4.5) return 'a whole piece';
  return 'a huge chunk of your position';
}

export type WhyLessonInput = {
  fen: string;
  classification?: string | null;
  movePhrase?: string | null;
  bestMovePhrase?: string | null;
  captured?: string | null;
  check?: boolean;
  mate?: boolean;
  evalDelta?: number | null;
  ply?: number;
};

export type WhyLesson = {
  phase: GamePhase;
  phaseTip: string;
  moveLine: string;
  gradeLine: string;
  considerHeading: string;
  considerLine: string;
};

export function buildWhyLesson(input: WhyLessonInput): WhyLesson {
  const phase = gamePhaseFromFen(input.fen);
  const seed = (input.ply || 0) + ((input.movePhrase || '').length);
  const phaseTip = pick(PHASE_TIPS[phase], seed);
  const label = (input.classification || 'GOOD').toUpperCase();
  const move = input.movePhrase ? `${input.movePhrase}.` : 'That move.';
  const taken = input.captured ? CAPTURE_NAME[input.captured] || 'a piece' : null;
  const good = label === 'BRILLIANT' || label === 'BEST' || label === 'GREAT' || label === 'GOOD';
  const top = label === 'BRILLIANT' || label === 'BEST';

  let gradeLine = '';
  if (label === 'BRILLIANT') {
    gradeLine = taken
      ? `You took ${taken} with the engine's own first choice - maximum damage, nothing left hanging. That is board vision, not luck.`
      : input.mate
        ? 'You found the move that ends the argument on the spot. The engine agrees: nothing better existed.'
        : input.check
          ? 'You found the most forcing move on the board - check limits the replies to almost none, and you spent that power perfectly.'
          : 'Out of every legal move you picked the engine\'s favourite - often the quiet one everyone else skips. That is the habit that separates club players from spectators.';
  } else if (label === 'BEST') {
    gradeLine = taken
      ? `Winning ${taken} while keeping your own camp tidy is exactly how games are actually won. The engine would have done the same.`
      : 'The strongest option on the board, played like it was obvious. Compare two candidate moves before touching a piece and you will find this spot again.';
  } else if (label === 'GREAT') {
    gradeLine = taken
      ? `Good business: you won ${taken} and gave nothing back. Trades that profit you are how small leads become big ones.`
      : 'Nearly the top choice - it improves your position and gives away nothing. Strong players live on moves like this.';
  } else if (label === 'GOOD') {
    gradeLine = 'Solid and safe. It keeps your structure intact - the engine saw a punchier option, but nothing about yours leaks.';
  } else {
    gradeLine = `It let ${pawnCost(input.evalDelta)} slip. The usual cause: moving before checking what the move leaves undefended, or ignoring a more forcing option.`;
  }

  let considerHeading = 'WHY CHESTER LOVES IT';
  let considerLine = '';
  if (good) {
    considerLine = taken
      ? `Celebrate this one: winning ${taken} without giving anything back is not luck - you saw a loose piece and punished it. Hunt loose pieces every single move.`
      : input.mate
        ? 'You ended the argument. Pattern-spotting like that is a tournament weapon - remember what the king\'s cage looked like.'
        : input.check
          ? 'Celebrate the forcing move: check means the opponent\'s next move is chosen by you. Free turns like that are where plans become wins.'
          : 'Celebrate the quiet ones most of all: anyone can spot a capture, but choosing the strongest calm move is real chess.';
  } else {
    considerHeading = 'WHAT YOU COULD CONSIDER';
    considerLine = input.bestMovePhrase && input.bestMovePhrase !== input.movePhrase
      ? `The risk it created: after ${input.movePhrase || 'that move'}, Chester has fresh targets. The engine's calmer idea was ${input.bestMovePhrase} - same ambition, no door left open.`
      : 'The risk it created: something in your camp is looser now. Before your next move, count what Chester can attack - then patch it or hit first with a check, capture or threat.';
    if (phase === 'OPENING') considerLine = `The opening is not the place to improvise - standard development exists because it survives stronger opponents. ${considerLine}`;
  }

  return { phase, phaseTip, moveLine: `You played: ${move}`, gradeLine, considerHeading, considerLine };
}

/* Chester acknowledges his own howlers (rookie mode hangs pieces on purpose - own it). */
const HOWLER_LINES = [
  'Forget you saw that. Even mayors drop their crown sometimes.',
  'I meant to do that. It is called a teaching moment. The free piece is yours - take it.',
  'Ahem. That was not in the script. Your move, vulture.',
  'That move was brought to you by overconfidence. Punish it. Please do not tell Joseph.',
  'I hang pieces so you can practise punishing hung pieces. You are welcome. Definitely on purpose.',
  'My lawyers describe that move as "generous". Their invoice is in the post.',
];

export function chesterHowlerLine(ply: number): string {
  return pick(HOWLER_LINES, Math.max(1, ply));
}

/* Mini-game commentary banks - commentary only, no chat, voice tuned per game. */
export type MiniGameKey = 'mate-sprint' | 'pawn-wars' | 'chessdle';

const MINI_LINES: Record<MiniGameKey, Record<string, string[]>> = {
  'mate-sprint': {
    start: ['Sixty seconds, endless mates. Breathe, then hunt checks first - mate always arrives wearing a check.'],
    hit: [
      'Mate! That pattern is yours forever now.',
      'Dead on arrival. You saw the killing square before the pieces did.',
      'Checkmate! Your pattern library just grew a shelf.',
      'Clinical. The king never stood a chance.',
    ],
    miss: [
      'Not mate - the king had a back door. Cover the escape squares first.',
      'Checks, captures, threats - in that order. That one was none of the three.',
      'The clock bites harder than I do. Shake it off, next pattern.',
    ],
    win: [
      'That is pattern recognition doing push-ups. Run it back and go faster.',
      'The town clock is still smoking. Again - chase the record.',
    ],
    lose: [
      'Every sprint makes the next one faster. The patterns are loading, trust the reps.',
      'The clock won this round. Rematch - the mates are not going to find themselves.',
    ],
    idle: [
      'Tip: every puzzle ends in one move, and the answer is almost always a check.',
      'Rooks mate from a distance, queens mate from anywhere, knights mate rudely.',
      'Speed comes from patterns, not panic.',
    ],
  },
  'pawn-wars': {
    start: ['Eight pawns, no mercy. Remember: a passed pawn is a queen-in-waiting.'],
    capture: [
      'Chomp. Pawn takes pawn is still profit.',
      'Trade when you are ahead - the arithmetic loves you.',
      'One less enemy. Endgames are won by pawns with clear roads.',
    ],
    queen: [
      'PROMOTION! The pawn becomes royalty. The whole town salutes.',
      'That is a queen now. Chess is a simple game, really.',
    ],
    win: ['Out-pawned, outplayed, outclassed. I taught you everything you know.'],
    lose: ['The pawns got you this time. Rematch - I insist.'],
    idle: [
      'Tip: push the pawn your opponent cannot catch.',
      'Kings are fighters in pawn wars - march yours up the board.',
      'Two pawns side by side are a wall. A wall with teeth.',
    ],
  },
  chessdle: {
    start: ['One puzzle, one day, one planet. No pressure.'],
    close: [
      'So close - a check, but the king wriggles. Cover his escape squares.',
      'A capture! But mate is the only currency accepted here.',
    ],
    miss: [
      'Nothing forcing there. In a mate-in-1, the answer is almost always a check.',
      'Look at every checking move first. One of them ends it.',
    ],
    win: ['CHECKMATE! The whole planet got the same puzzle today - you solved yours with style.'],
    lose: ['It was there all along. Tomorrow, same time, a brand new mate.'],
    idle: [
      'Streaks are built on days exactly like today.',
      'Tip: look for the move that gives the king zero squares, not the move that looks scary.',
    ],
  },
};

export function miniChesterLine(game: MiniGameKey, event: string, seed: number): string {
  const bank = MINI_LINES[game][event] || MINI_LINES[game].idle;
  return pick(bank, Math.max(1, seed));
}
