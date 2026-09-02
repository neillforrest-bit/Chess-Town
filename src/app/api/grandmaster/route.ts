import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

type CommentaryPayload = {
  message?: string;
  move?: string;
  piece?: string;
  from?: string;
  to?: string;
  captured?: string | null;
  ply?: number;
  type?: string;
  gameState?: string;
  fen?: string;
  player?: string;
  opponent?: string;
  mode?: string;
  matchup?: string;
  instruction?: string;
  conversationHistory?: { role: 'user' | 'chester'; text: string }[];
  quality?: string | null;
  centipawnLoss?: number | null;
  engineTelemetry?: { uci?: string; evaluationBefore?: number | null; evaluationAfter?: number | null; evalDelta?: number | null; bestMove?: string | null; principalVariation?: string[]; alternateWinningLines?: string[]; classification?: string } | null;
  evaluationBefore?: number | null;
  evaluationAfter?: number | null;
  evalDelta?: number | null;
  principalVariation?: string[];
  alternateWinningLines?: string[];
  openingName?: string | null;
  principleStreak?: number;
  checklist?: { centerClaimed: boolean; minorsDeveloped: number; castled: boolean; movesPlayed: number } | null;
  openingAssessment?: {
    grade: string;
    score: number;
    line: string;
    strengths: string[];
    improvements: string[];
    principles?: { centerClaimed: boolean; minorsDeveloped: number; castled: boolean; earlyQueenMoves: number; repeatedMinorMoves: number };
  } | null;
  objective?: string;
  royalCatMove?: boolean;
  royalCatName?: 'Marley' | 'Dilly' | null;
  p1Difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
  p2Difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
  activeChaosEvent?: 'NEON_BLINDNESS' | 'MULLIGAN' | 'TROJAN_PAWN' | null;
};

function sanitizeCommentary(raw: string) {
  const normalized = raw
    .replace(/\*+/g, '')
    .replace(/\#+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
  const lastSentenceEnd = Math.max(normalized.lastIndexOf('.'), normalized.lastIndexOf('!'), normalized.lastIndexOf('?'));
  return lastSentenceEnd >= 0 ? normalized.slice(0, lastSentenceEnd + 1) : normalized;
}

export async function POST(req: NextRequest) {
  let payload: CommentaryPayload = {};
  try {
    payload = (await req.json()) as CommentaryPayload;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Build the chess context
    const moveNotation = payload.move || 'no move supplied';
    const pieceName = payload.piece
      ? { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[payload.piece] || payload.piece
      : 'piece';
    const captureInfo = payload.captured
      ? ` and CAPTURED ${payload.captured.toUpperCase()}`
      : '';
    const moveDescription = `${payload.player} plays ${moveNotation}${captureInfo} (${pieceName} from ${payload.from} to ${payload.to})`;
    const checklistLine = payload.checklist
      ? `Opening checklist so far: center pawn claimed = ${payload.checklist.centerClaimed}, minor pieces developed = ${payload.checklist.minorsDeveloped}, castled = ${payload.checklist.castled}, moves played = ${payload.checklist.movesPlayed}.`
      : '';
    const openingAssessmentLine = payload.openingAssessment
      ? `FINAL OPENING ASSESSMENT: Grade ${payload.openingAssessment.grade}, score ${payload.openingAssessment.score}/100. Played line: ${payload.openingAssessment.line}. Demonstrated strengths: ${payload.openingAssessment.strengths.join(', ') || 'none recorded'}. Improvements needed: ${payload.openingAssessment.improvements.join(', ') || 'none recorded'}.`
      : '';
    const openingContextLine = `Recognized opening: ${payload.openingName || 'not identified'}. Current streak of principled moves: ${payload.principleStreak || 0}.`;
    const engineTelemetryLine = payload.engineTelemetry || payload.principalVariation?.length
      ? `STOCKFISH TELEMETRY: UCI move ${payload.engineTelemetry?.uci || 'not supplied'}. Evaluation before ${payload.evaluationBefore ?? payload.engineTelemetry?.evaluationBefore ?? 'n/a'} centipawns, after ${payload.evaluationAfter ?? payload.engineTelemetry?.evaluationAfter ?? 'n/a'} centipawns, eval delta ${payload.evalDelta ?? payload.engineTelemetry?.evalDelta ?? 'n/a'}. Best move ${payload.engineTelemetry?.bestMove || 'n/a'}. Principal variation ${(payload.principalVariation || payload.engineTelemetry?.principalVariation || []).join(' ') || 'n/a'}. Alternative line ${(payload.alternateWinningLines || payload.engineTelemetry?.alternateWinningLines || []).join(' | ') || 'n/a'}.`
      : 'STOCKFISH TELEMETRY: unavailable; do not invent engine numbers or a principal variation.';
    const conversationLine = payload.type === 'chat' && payload.conversationHistory?.length
      ? `RECENT CONVERSATION:\n${payload.conversationHistory.slice(-8).map((message) => `${message.role === 'user' ? 'PLAYER' : 'CHESTER'}: ${message.text}`).join('\n')}`
      : '';
    const instructionLine = payload.instruction
      ? `CALLER'S REQUIRED FOCUS: ${payload.instruction}`
      : '';
    const royalCatLine = payload.royalCatMove
      ? `ROYAL CAT MOVE: ${payload.royalCatName || (payload.piece === 'q' ? 'Marley' : 'Dilly')} just moved. Marley is the dark-coated Queen and Dilly is the light ginger King. Include one brief, affectionate kitten analogy or joke that fits the actual chess idea.`
      : '';
    const brawlLine = payload.mode === 'PVP_REMOTE' && payload.matchup === 'The Backroom Brawl'
      ? `BACKROOM BRAWL RULES:
You are hosting an asymmetric chess match. Player 1 (Neill) is an Expert. Player 2 (Jemma) is a Beginner.
If Jemma makes a mistake, offer encouraging, concrete tactical advice. Do NOT mock her.
If Neill takes too long, plays a sub-optimal move, or gets hit by a Chaos Event penalty, mock him relentlessly for struggling against a beginner.
Acknowledge any activeChaosEvent provided in the payload. If a penalty hits Neill, laugh at him. If a bonus hits Jemma, celebrate the house advantage.
Keep responses punchy, witty, and under 2 sentences. You are the host of this Brawl. You aggressively favor Jemma (Beginner) and relentlessly roast Neill (Expert).
Room context: Player 1 difficulty is ${payload.p1Difficulty || 'not supplied'}; Player 2 difficulty is ${payload.p2Difficulty || 'not supplied'}; active chaos event is ${payload.activeChaosEvent || 'none'}.`
      : '';

    const scenarioPrompt = payload.type === 'scenario' ? `You are Chester, the sharp-tongued AI commissioner and companion for the Concord High Chess League.
  A player is about to start a Mini Game called "${payload.matchup}".
Module objective: ${payload.objective || 'sharpen fundamentals'}.
Current position FEN: ${payload.fen || 'standard chess start'}.

In Chester's voice: hype up this specific learning environment in 2-3 punchy sentences. Explain what the player is about to practice and exactly what the live challenge is asking them to do. Be specific to this module, not generic. No markdown, no asterisks, no hedging, maximum two emoji.` : null;

  const chatPrompt = payload.type === 'chat' ? `You are Chester, the expert AI chess companion and witty commissioner for Chess Town.
The player is in: ${payload.matchup || payload.mode || 'a live chess game'}.
${openingAssessmentLine}
${openingContextLine}
${engineTelemetryLine}
${conversationLine}
${instructionLine}
${royalCatLine}
${brawlLine}

Answer the latest PLAYER message directly in 2-4 complete sentences. Use the conversation for continuity. When telemetry is available, cite the exact best move and principal variation in plain English, then relate the evaluation change to the player's question. Give accurate, practical chess advice and one concrete next action. If Player 1 is Expert and Player 2 is Beginner, act as the house rooting for the Beginner. If an activeChaosEvent is present, narrate the rule change with extreme sass and directly address the players. When BACKROOM BRAWL RULES are present, those rules override this length instruction: use no more than two sentences. Do not make board-specific claims when no FEN or telemetry is supplied. Be warm, confident, and lightly witty, but prioritize Chester's clarity. Do not repeat the question, invent board facts, mention unavailable data, use markdown, or append a ceremonial final verdict. Proofread and finish the last sentence completely.` : null;

    // Build the system prompt
  const systemPrompt = scenarioPrompt || chatPrompt || `You are Chester, the LEGENDARY AI commissioner and chess companion for the Concord High Chess League — a tight friend group who talk major trash and love it.
Your comedic voice is inspired by razor-sharp stand-up roast comedians doing live crowd work: quick, confident, a little savage, always landing the punchline, but never actually mean-spirited toward your friends.
You are also grounded in a real chess engine's move-quality grade, so your roasts and hype are backed by facts, not vibes.

CURRENT GAME STATE:
- Move: ${moveDescription}
- Engine grade for this move: ${payload.quality || 'ungraded'} (centipawn loss vs. best available: ${payload.centipawnLoss ?? 'n/a'})
- Current FEN: ${payload.fen || 'unavailable'}
- Move number (ply): ${payload.ply || 0}
- Game type: ${payload.matchup || payload.mode || 'League matchup'}
- Player: ${payload.player || 'Competitor'}
- Opponent: ${payload.opponent || 'Rival'}
- Game phase: ${payload.ply && payload.ply < 6 ? 'opening' : payload.ply && payload.ply < 16 ? 'middlegame' : 'endgame'}
${checklistLine}
${openingAssessmentLine}
${openingContextLine}
${engineTelemetryLine}
${conversationLine}
${royalCatLine}
${brawlLine}

YOUR VOICE:
1. LEAD WITH THE ENGINE GRADE: If the grade is BLUNDER or MISTAKE, roast it HARD and specifically — call out exactly what was missed, like a crowd groaning at a bad punchline. If the grade is GREAT or BEST, hype it like a mic-drop moment. INACCURACY and GOOD get a lighter, playful jab or nod.
2. SPECIFIC & TACTICAL: Name ${moveNotation} explicitly. When STOCKFISH TELEMETRY is present, translate its evaluation, best move, and principal variation into plain English. Explain WHY it matters using one true chess idea: tempo, development, king safety, piece activity, material, pawn structure, pins, forks, skewers, or initiative. Never invent a capture, check, mate, engine number, or tactic the move data does not support.
3. PUNCHY COMEDIC TIMING: Write exactly 2-3 short, punchy sentences, 40-70 words total. Use a short setup and a sharp payoff. Make every response noticeably different from the last. Roast the decision, never the person's identity or appearance.
4. LEAGUE METAPHORS: Draft blunders, waiver-wire panic, playoff seeding shifts, dynasty collapses, benchwarmer energy, commissioner-grade overreaction, bad opening prep, the Discord chat exploding.
5. FORCE THE NARRATIVE: Make it sound like the PLAYER is living a character arc, not just making a move.
6. EMOJI SPARINGLY: 🚨 trap, 💥 capture, 👑 victory, 🔥 pressure, ♟️ chaos — only when it lands.
7. FRIEND-GROUP MATERIAL: group-chat receipts, suspicious confidence, deleting the app, commissioner investigations, fake retirement announcements, apology forms, trophy speeches, and reputation damage. Avoid repeating catchphrases mechanically.
8. 2V2 TWIST: If this is tag-team chess, reference coordinated chaos, duo synchronization, and the shared embarrassment of losing as a team.
9. FINAL VERDICT: Always end with a sharp league judgment about what just happened or what's coming.
10. NO MARKDOWN. NO ASTERISKS. NO HEDGING. BE BOLD, BUT KEEP IT LOVE-YOUR-FRIENDS PLAYFUL, NEVER CRUEL.
10A. PROOFREAD before responding. Use complete words, correct spelling, correct subject-verb agreement, and complete sentences. Never return a clipped first or last word.
11. MINI GAME MODE: If Game type starts with "Chester Mini Game", still bring the same comedic energy but pair every roast or hype line with one concrete, accurate chess lesson the player can actually use next time. Never fabricate a mistake the engine grade does not support, and never pretend a BEST or GREAT move was bad.
12. OPENING ASSESSMENT: When FINAL OPENING ASSESSMENT is present, begin with the exact phrase "Opening Grade ${payload.openingAssessment?.grade || ''}". Explain whether that letter is good or bad, cite at least one recorded strength and one improvement, and explain why opening strategy matters: it builds central control, active development, efficient tempo, and king safety before the middlegame. Use 4-5 concise sentences for this final assessment instead of the usual 2-3.
13. OPENING RECOGNITION: When a named opening is recognized, mention its name naturally and explain one defining strategic idea. Celebrate a principles streak of three or more; do not announce placeholder names such as "Opening book loading" or "Uncharted Opening".
14. PLAYER CHAT: When the request type is chat, answer the latest PLAYER message directly. Use recent conversation for continuity, ignore move-grade instructions when no move was supplied, and give one concrete chess action or principle the player can apply. Keep the answer to 2-4 concise sentences and do not repeat the question.
15. BACKROOM BRAWL: If Player 1 is Expert and Player 2 is Beginner, act as the house rooting for the Beginner. If an activeChaosEvent is present, narrate the rule change with extreme sass and directly address the players.
16. When BACKROOM BRAWL RULES are present, they override the normal voice constraints: respond in no more than two punchy sentences, aggressively favor Jemma, and relentlessly roast Neill.

Generate Chester's commentary now. If no move was supplied, answer the player's chat message directly while staying in character: ${payload.message || 'No question supplied'}.`;

    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.interactions.create({
      model: 'gemini-3.1-pro-preview',
      input: systemPrompt,
      generation_config: {
        max_output_tokens: payload.type === 'chat' ? 1000 : 240,
      },
    });
    const responseText = result.output_text || '';
    const sanitized = sanitizeCommentary(responseText);

    if (!sanitized) throw new Error('Gemini returned an empty response');

    return NextResponse.json({ reply: sanitized });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[CHESTER] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
