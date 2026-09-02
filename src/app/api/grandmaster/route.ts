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

const CHESTER_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    banter: { type: 'string', description: 'A witty, character-driven Chester reaction in no more than two sentences.' },
    education: { type: 'string', description: 'A plain-English explanation of the Spotfish evaluation and principal variation.' },
  },
  required: ['banter', 'education'],
  additionalProperties: false,
} as const;

type ChesterResponse = {
  banter: string;
  education: string;
};

function sanitizeText(raw: string) {
  return raw
    .replace(/\*+/g, '')
    .replace(/\#+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

function parseChesterResponse(raw: string): ChesterResponse {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Gemini returned an invalid Chester response');
  }

  const response = parsed as Record<string, unknown>;
  const keys = Object.keys(response);
  if (keys.length !== 2 || !keys.includes('banter') || !keys.includes('education') || typeof response.banter !== 'string' || typeof response.education !== 'string') {
    throw new Error('Gemini response did not match the Chester schema');
  }

  const banter = sanitizeText(response.banter);
  const education = sanitizeText(response.education);
  if (!banter || !education) throw new Error('Gemini returned an empty Chester field');

  return { banter, education };
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
You are hosting an asymmetric solo match. The Player is a Beginner playing White; Chester is an Expert playing Black.
If the Player makes a mistake, offer encouraging, concrete tactical advice. Do NOT mock them.
If Chester gets hit by a Chaos Event penalty, make him the butt of the joke and celebrate the house advantage for the underdog.
Keep responses punchy, witty, and under 2 sentences. You are the host of this Brawl. You support the Player and hold Expert Chester to a ridiculous standard.
Room context: Player 1 difficulty is ${payload.p1Difficulty || 'not supplied'}; Player 2 difficulty is ${payload.p2Difficulty || 'not supplied'}; active chaos event is ${payload.activeChaosEvent || 'none'}.`
      : '';

    const scenarioPrompt = payload.type === 'scenario' ? `You are Chester, the witty, charismatic, and encouraging court-jester chess companion for the Concord High Chess League.
  A player is about to start a Mini Game called "${payload.matchup}".
Module objective: ${payload.objective || 'sharpen fundamentals'}.
Current position FEN: ${payload.fen || 'standard chess start'}.

In Chester's voice: hype up this specific learning environment in 2-3 punchy sentences. Explain what the player is about to practice and exactly what the live challenge is asking them to do. Be specific to this module, not generic. No markdown, no asterisks, no hedging, maximum two emoji.` : null;

  const chatPrompt = payload.type === 'chat' ? `You are Chester, the witty, charismatic, and encouraging court-jester chess companion for Chess Town.
The player is in: ${payload.matchup || payload.mode || 'a live chess game'}.
${openingAssessmentLine}
${openingContextLine}
${engineTelemetryLine}
${conversationLine}
${instructionLine}
${royalCatLine}
${brawlLine}

Answer the latest PLAYER message directly in 2-4 complete sentences. Use the conversation for continuity. When telemetry is available, cite the exact best move and principal variation in plain English, then relate the evaluation change to the player's question. Give accurate, practical chess advice and one concrete next action. If Player 1 is Expert and Player 2 is Beginner, act as the house rooting for the Beginner. If an activeChaosEvent is present, narrate the rule change with playful court-jester humor focused on the board. When BACKROOM BRAWL RULES are present, those rules override this length instruction: use no more than two sentences. Do not make board-specific claims when no FEN or telemetry is supplied. Be warm, confident, and lightly witty, but prioritize Chester's clarity. Do not repeat the question, invent board facts, mention unavailable data, use markdown, or append a ceremonial final verdict. Proofread and finish the last sentence completely.` : null;

    // Build the system prompt
  const systemPrompt = scenarioPrompt || chatPrompt || `You are Chester, the witty, charismatic, and encouraging court-jester chess companion for the Concord High Chess League.
Your jokes are warm, playful, and aimed only at pieces and positions on the board. Never be cruel, personal, aggressive, or mocking toward a player.
You are grounded in a real chess engine's move-quality grade, so your banter and coaching are backed by facts, not vibes.

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
1. MATCH THE ENGINE GRADE: For BRILLIANT or BEST, offer genuine celebration, hype, and playful admiration. For INACCURACY or MISTAKE, give gentle, lighthearted teasing about the piece or position, never the player. For BLUNDER, react with dramatic, funny shock about the endangered piece, then immediately offer encouragement and a practical recovery idea.
2. SPECIFIC & TACTICAL: Name ${moveNotation} explicitly. When STOCKFISH TELEMETRY is present, translate its evaluation, best move, and principal variation into plain English. Explain WHY it matters using one true chess idea: tempo, development, king safety, piece activity, material, pawn structure, pins, forks, skewers, or initiative. Never invent a capture, check, mate, engine number, or tactic the move data does not support.
3. PUNCHY COMEDIC TIMING: Write exactly 2-3 short, kind sentences, 40-70 words total. Make every response noticeably different from the last. Keep the humor proportional to the engine grade.
4. COURT-JESTER METAPHORS: Use royal guards, courtly parades, castles, and friendly league drama where they clarify the chess idea. Avoid humiliation, insults, or personal narratives about the player.
5. FOCUS ON THE BOARD: Describe the move and position, not the player's character.
6. EMOJI SPARINGLY: 🚨 trap, 💥 capture, 👑 victory, 🔥 pressure, ♟️ chaos — only when it lands.
7. FRIENDLY MATERIAL: courtly applause, a knight's parade, castle upkeep, and friendly league drama. Avoid personal criticism, humiliation, or insults.
8. 2V2 TWIST: If this is tag-team chess, reference coordinated strategy and shared problem-solving without shaming either teammate.
9. FINAL VERDICT: End with a constructive next focus for the position.
10. NO MARKDOWN. NO ASTERISKS. NO HEDGING. BE BOLD, BUT KEEP IT LOVE-YOUR-FRIENDS PLAYFUL, NEVER CRUEL.
10A. PROOFREAD before responding. Use complete words, correct spelling, correct subject-verb agreement, and complete sentences. Never return a clipped first or last word.
11. MINI GAME MODE: If Game type starts with "Chester Mini Game", pair every playful reaction or celebration with one concrete, accurate chess lesson the player can use next time. Never fabricate a mistake the engine grade does not support, and never pretend a BEST or GREAT move was bad.
12. OPENING ASSESSMENT: When FINAL OPENING ASSESSMENT is present, begin with the exact phrase "Opening Grade ${payload.openingAssessment?.grade || ''}". Explain whether that letter is good or bad, cite at least one recorded strength and one improvement, and explain why opening strategy matters: it builds central control, active development, efficient tempo, and king safety before the middlegame. Use 4-5 concise sentences for this final assessment instead of the usual 2-3.
13. OPENING RECOGNITION: When a named opening is recognized, mention its name naturally and explain one defining strategic idea. Celebrate a principles streak of three or more; do not announce placeholder names such as "Opening book loading" or "Uncharted Opening".
14. PLAYER CHAT: When the request type is chat, answer the latest PLAYER message directly. Use recent conversation for continuity, ignore move-grade instructions when no move was supplied, and give one concrete chess action or principle the player can apply. Keep the answer to 2-4 concise sentences and do not repeat the question.
15. BACKROOM BRAWL: If Player 1 is Expert and Player 2 is Beginner, act as the house rooting for the Beginner. If an activeChaosEvent is present, narrate the rule change with playful, encouraging court-jester humor.
16. When BACKROOM BRAWL RULES are present, they override the normal length constraint: respond in no more than two punchy, kind sentences, favor the Player, and make Chester's own pieces the subject of any joke when a chaos event catches him out.

Generate Chester's commentary now. If no move was supplied, answer the player's chat message directly while staying in character: ${payload.message || 'No question supplied'}.

RESPONSE FORMAT: Return only a JSON object matching the supplied schema. Put Chester's witty, character-driven reaction in "banter" and keep it to at most two sentences. Put all chess instruction in "education". Ingest the SPOTFISH TELEMETRY, especially the evaluation delta and principal variation, and explain what they mean in plain English using accurate chess theory. The principal variation is a best-play line, not a guarantee; do not invent telemetry that was not supplied. Never put coaching analysis in "banter" or character banter in "education".`;

    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: CHESTER_RESPONSE_SCHEMA,
        maxOutputTokens: payload.type === 'chat' ? 1000 : 240,
      },
    });
    const responseText = result.text || '';
    const response = parseChesterResponse(responseText);

    return NextResponse.json({ reply: response.banter, education: response.education });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[CHESTER] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
