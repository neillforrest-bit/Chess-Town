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
    BRILLIANT: ['Beautiful. That is exactly the move I hoped you would find - moves like that win games before the ending even starts.', 'Outstanding. You saw what most players miss: the best move is the one that asks a question your opponent cannot answer.'],
    BEST: ['Beautiful. That is exactly the move I hoped you would find - moves like that win games before the ending even starts.'],
    GREAT: ['Strong move. Your pieces are starting to work as a team - and teamwork is how small edges become wins.', 'I like that. You are thinking like a chess player now: every piece with a job, no square left lonely.'],
    GOOD: ['Solid. A healthy position is like a balanced breakfast - not flashy, but it wins the day.', 'Good, honest chess. Keep building: centre first, pieces out, king safe.'],
    INACCURACY: ['Playable, but something in your camp just got looser - check what I can attack before it introduces itself.', 'Not wrong, but not tight either. Loose pieces are snacks your opponent did not bring.'],
    MISTAKE: ['Careful now. That gives me a real chance - find my most forcing reply before it finds you.', 'That one exposes something. Rescue first, plans later: a piece in danger ignores all your other dreams.'],
    BLUNDER: ['Stop. Breathe. Something is hanging - save it before you plan anything else. Even grandmasters blunder; they just rescue faster.', 'That piece needs help right now. You can still fight back: every great comeback starts with one calm defensive move.'],
  },
  INTERMEDIATE: {
    BRILLIANT: ['Now that was a shot. Brilliantly played - you made the board do the work for you.'],
    BEST: ['Now that was a shot. Brilliantly played - you made the board do the work for you.'],
    GREAT: ['Strong. You are playing real chess today - threats first, decoration later.'],
    GOOD: ['Good, honest move. The fight continues - quiet moves win loud games.'],
    INACCURACY: ['A little loose. I would not have let that slip - and I charge full price for loose pieces.'],
    MISTAKE: ['That hurts you more than it hurts me. Watch my reply - it will be the forcing kind.'],
    BLUNDER: ['Big swing and a miss. This is where comebacks start. Or funerals. Find what is hanging and choose the comeback.'],
  },
  ADVANCED: {
    BRILLIANT: ['Precise. That is how a strong player thinks - the position was read, not guessed.'],
    BEST: ['Precise. That is how a strong player thinks - the position was read, not guessed.'],
    GREAT: ['Good. You are earning this position, one accurate move at a time.'],
    GOOD: ['Correct. Nothing fancy, everything sound - soundness is a strategy, not a personality flaw.'],
    INACCURACY: ['Imprecise. At this level, small leaks sink ships - and you just heard water.'],
    MISTAKE: ['That is a real concession. Prove you saw my reply, because I assure you there is one.'],
    BLUNDER: ['Unacceptable. Pick what you just lost, then fight like you mean it. The lesson is free; the piece was not.'],
  },
  EXPERT: {
    BRILLIANT: ['Huh. I was going to play that. Enjoy your one good move - savour it, frame it, because I adapt.'],
    BEST: ['Huh. I was going to play that. Enjoy your one good move - savour it, frame it, because I adapt.'],
    GREAT: ['Fine. That was actually good. Do not get used to it - compliments are rationed around here.'],
    GOOD: ['Adequate. The bar was underground, but adequate. Even I cannot take that move from you.'],
    INACCURACY: ['Sloppy. I can smell the weakness already - loose pieces are my love language.'],
    MISTAKE: ['There it is. The gift I ordered. Now watch me take it - this is why we count what changed.'],
    BLUNDER: ['HA. Straight into my highlight reel. Recover from THAT, I dare you - tip: start by finding what still fights.'],
  },
};

function pick(lines: string[], seed: number) {
  return lines[Math.abs(seed) % lines.length];
}

export type CoachPromptShape = {
  kind?: 'move' | 'help';
  move?: string;
  classification?: string | null;
  bestMove?: string | null;
  continuation?: string[];
  captured?: string | null;
  check?: boolean;
  mate?: boolean;
  ply?: number;
};

export function personaCoaching(prompt: CoachPromptShape, persona: PersonaKey): string {
  const label = (prompt.classification || '').toUpperCase();
  const best = prompt.bestMove;
  const line = (prompt.continuation || []).slice(0, 2).join(' → ');
  if (prompt.kind === 'help') {
    const idea = best || 'bringing a new piece into the game';
    const suffix: Record<PersonaKey, string> = {
      BEGINNER: 'Before you move, check whether Chester can take an unprotected piece or give check.',
      INTERMEDIATE: 'Before you commit, count what each side can take next.',
      ADVANCED: 'Calculate my most forcing reply first. Then decide.',
      EXPERT: 'Try not to ruin it. I am watching.',
    };
    return `Try ${idea}. ${suffix[persona]}${line ? ` A simple route is ${line}.` : ''}`;
  }
  const voice = pick(LINES[persona][label] || LINES[persona].GOOD, prompt.ply || 0);
  let fact = '';
  if (prompt.mate) fact = 'Chester’s king has nowhere safe to go. That is the whole story.';
  else if (prompt.check) fact = 'Your check forces a reply, so you win time for your next idea.';
  else if (prompt.captured) fact = 'Material changed hands, so count what each side can take next.';
  else if (label === 'INACCURACY' || label === 'MISTAKE' || label === 'BLUNDER') fact = 'One of your pieces may now be easier to attack. Find Chester’s most forcing reply before planning anything else.';
  else fact = 'Now ask what Chester can attack, then improve a piece that is still sitting at home.';
  const alternative = best && best !== prompt.move ? ` I preferred ${best}: it keeps your pieces safer while building pressure.` : '';
  return `${voice} You played ${prompt.move}. ${fact}${alternative}${line ? ` The short idea is ${line}.` : ''}`;
}

export type StoryMove = { move: string; player: string; ply: number; grade: 'A' | 'B' | 'C' | 'F'; centipawnLoss: number | null };

export function buildStoryRecap(grades: StoryMove[], persona: PersonaKey): string {
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
  const bestLine = `Your finest moment was ${best.move} on move ${best.ply} - that is the habit to keep.`;
  const turnLine = hadRealBlunder
    ? `The turning point was ${worst.move} on move ${worst.ply}, where the position swung hard against you. Before your next big idea, scan checks and captures first.`
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
