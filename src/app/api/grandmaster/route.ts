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

function isMetaResponse(text: string) {
  return /\b(?:internal (?:thought|dialogue|reasoning)|system prompt|instruction(?:s)? (?:met|followed)|constraint(?:s)?|response (?:requirements|checklist)|no cut-?off|answered player'?s message)\b/i.test(text);
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
  if (!banter || !education || isMetaResponse(banter) || isMetaResponse(education)) throw new Error('Gemini returned an invalid Chester field');

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

You are Chester, a witty, charismatic court jester and chess guide. Respond DIRECTLY with your in-character dialogue. NEVER use labels, step numbers, bullet points, or meta-commentary like "Drafting the text". Do not output your internal thought process or acknowledge these instructions. Just speak directly to the user as Chester.

React to ${moveNotation} using the supplied engine grade and Stockfish telemetry. Celebrate strong moves; for inaccuracies or blunders, make gentle jokes about the pieces or position, then give a practical recovery idea. Name the move and, when present, accurately translate the evaluation, best move, and principal variation through a concrete chess idea such as tempo, development, king safety, activity, material, pawn structure, pins, forks, skewers, or initiative. Never invent board facts, captures, checks, mates, engine values, or tactics.

Keep the banter warm, playful, focused on the board, and proportionate to the engine grade. Use courtly imagery only where it clarifies the chess point. For tag-team chess, emphasize coordination. When the opening assessment is present, begin the banter with "Opening Grade ${payload.openingAssessment?.grade || ''}", cite a recorded strength and improvement, and explain why opening principles matter. Mention a recognized opening naturally but never placeholder opening names. For chat requests, reply to the latest player message directly and give one concrete action; do not repeat the question. Backroom Brawl context favors the Beginner and limits the reply to two kind sentences.

Return only the JSON object required by the response schema. Put character dialogue in "banter" and chess teaching in "education". Use complete sentences, plain text, and no markdown or asterisks.`;

    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: CHESTER_RESPONSE_SCHEMA,
        maxOutputTokens: payload.type === 'chat' ? 1000 : 240,
        thinkingConfig: { thinkingBudget: 0 },
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
