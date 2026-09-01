import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

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
};

function sanitizeCommentary(raw: string) {
  return raw
    .replace(/\*+/g, '')
    .replace(/\#+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

const CHESTER_FALLBACKS = [
  "That move just screamed 'waiver-wire panic' and everyone knows it.",
  "Central control wrapped in confidence—let's see if it holds up.",
  "Tempo theft disguised as a solid plan. Classic league strategy.",
  "The board is reading your intention like a commissioner reading draft notes.",
  "That's the move of someone who believes their own hype. The league is watching.",
  "Calculated aggression meets desperate hope. Beautiful.",
  "The narrative just shifted and neither player saw it coming.",
  "One move away from legend status or benchwarmer energy. No middle ground.",
  "This board state feels like a playoff seeding on life support.",
  "That move will live forever in the discord. Either as genius or as meme.",
];

const QUALITY_ROAST: Record<string, string> = {
  BLUNDER: 'Certified blunder. That move needs an apology letter and a witness-protection program.',
  MISTAKE: 'Real mistake. The engine just leaned back like it smelled something suspicious.',
  INACCURACY: 'Playable, but sloppy. That move showed up wearing confidence it did not earn.',
  GOOD: 'Solid move. No fireworks, but at least nobody needs to delete the group chat.',
  GREAT: 'Great move. The engine nodded, the arena woke up, and the opponent suddenly needs a story.',
  BEST: 'Engine top choice. That was not a move; that was a public announcement.',
};

function getDynamicFallback(payload: CommentaryPayload) {
  if (payload.type === 'scenario') {
    return `Alright, ${payload.matchup || 'training session'} is live. ${payload.objective || 'Make your move and Chester will grade every decision.'} Chester is watching every square, so bring real chess, not vibes.`;
  }

  if (payload.message && !payload.move) {
    if (payload.openingAssessment) {
      const assessment = payload.openingAssessment;
      return `Opening Grade ${assessment.grade}, ${assessment.score}/100. Your strengths were ${assessment.strengths.join(', ') || 'still developing'}, while your next priorities are ${assessment.improvements.join(', ') || 'to keep building efficiently'}. Opening strategy matters because central space, active pieces, and king safety determine who gets to make threats first; this grade shows how reliably your first five moves created that foundation.`;
    }
    return `Chester's scanner is temporarily off-air, but ${payload.message} has the arena arguing already. The next move decides whether this is sharp prep or pure benchwarmer vibes.`;
  }

  if (payload.openingAssessment) {
    const assessment = payload.openingAssessment;
    const verdict = ['A', 'B'].includes(assessment.grade) ? 'That is a strong opening foundation' : 'That grade needs work before the middlegame arrives';
    return `Opening Grade ${assessment.grade}, ${assessment.score}/100: ${verdict}. You did well to ${assessment.strengths.join(' and ') || 'complete the line'}, but next time ${assessment.improvements.join(' and ') || 'keep every move purposeful'}. Openings matter because center control, development, tempo, and king safety decide who enters the middlegame making threats instead of answering them.`;
  }

  const move = payload.move || 'that move';
  const player = payload.player || 'The player';
  const moveVerb = player.toLowerCase() === 'you' ? 'play' : 'plays';
  const opponent = payload.opponent || 'the rival';
  const qualityLine = payload.quality ? QUALITY_ROAST[payload.quality] || '' : '';
  const tacticalNote = payload.captured
    ? `That capture changes the material conversation immediately, and ${opponent} has to find compensation before the position turns into a waiver-wire disaster.`
    : move.includes('+')
      ? `Check means ${opponent}'s king is now spending a tempo on survival instead of development. The league chat can smell playoff panic.`
      : payload.ply && payload.ply <= 6
        ? `It fights for development and the center, but ${opponent} gets one clean reply to challenge the claim. Opening prep is now under commissioner review.`
        : `The initiative is shifting toward the more active pieces, and ${opponent} cannot afford a quiet answer. This is where a normal game becomes league folklore.`;

  return `${player} ${moveVerb} ${move} and Chester hears the arena volume jump. ${qualityLine} ${tacticalNote}`.replace(/\s+/g, ' ').trim();
}

export async function POST(req: NextRequest) {
  let payload: CommentaryPayload = {};
  try {
    payload = (await req.json()) as CommentaryPayload;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      console.error('[CHESTER] No API key found');
      return NextResponse.json({
        reply: CHESTER_FALLBACKS[Math.floor(Math.random() * CHESTER_FALLBACKS.length)],
      });
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
    const conversationLine = payload.type === 'chat' && payload.conversationHistory?.length
      ? `RECENT CONVERSATION:\n${payload.conversationHistory.slice(-8).map((message) => `${message.role === 'user' ? 'PLAYER' : 'CHESTER'}: ${message.text}`).join('\n')}`
      : '';

    const scenarioPrompt = payload.type === 'scenario' ? `You are Chester, the sharp-tongued AI commissioner and coach for the Concord High Chess League.
A player is about to start a coaching module called "${payload.matchup}".
Module objective: ${payload.objective || 'sharpen fundamentals'}.
Current position FEN: ${payload.fen || 'standard chess start'}.

In Chester's voice: hype up this specific learning environment in 2-3 punchy sentences. Explain what the player is about to practice and exactly what the live challenge is asking them to do. Be specific to this module, not generic. No markdown, no asterisks, no hedging, maximum two emoji.` : null;

  const chatPrompt = payload.type === 'chat' ? `You are Chester, the expert AI chess coach and witty commissioner for Chess Town.
The player is in: ${payload.matchup || payload.mode || 'a live chess game'}.
${openingAssessmentLine}
${openingContextLine}
${conversationLine}

Answer the latest PLAYER message directly in 2-4 complete sentences. Use the conversation for continuity. Give accurate, practical chess advice and one concrete next action. Be warm, confident, and lightly witty, but prioritize coaching clarity. Do not repeat the question, invent board facts, mention unavailable data, use markdown, or append a ceremonial final verdict. Proofread and finish the last sentence completely.` : null;

    // Build the system prompt
  const systemPrompt = scenarioPrompt || chatPrompt || `You are Chester, the LEGENDARY AI commissioner and chess coach for the Concord High Chess League — a tight friend group who talk major trash and love it.
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
${conversationLine}

YOUR VOICE:
1. LEAD WITH THE ENGINE GRADE: If the grade is BLUNDER or MISTAKE, roast it HARD and specifically — call out exactly what was missed, like a crowd groaning at a bad punchline. If the grade is GREAT or BEST, hype it like a mic-drop moment. INACCURACY and GOOD get a lighter, playful jab or nod.
2. SPECIFIC & TACTICAL: Name ${moveNotation} explicitly. Explain WHY it matters using one true chess idea: tempo, development, king safety, piece activity, material, pawn structure, pins, forks, skewers, or initiative. Never invent a capture, check, mate, or tactic the move data does not support.
3. PUNCHY COMEDIC TIMING: Write exactly 2-3 short, punchy sentences, 40-70 words total. Use a short setup and a sharp payoff. Make every response noticeably different from the last. Roast the decision, never the person's identity or appearance.
4. LEAGUE METAPHORS: Draft blunders, waiver-wire panic, playoff seeding shifts, dynasty collapses, benchwarmer energy, commissioner-grade overreaction, bad opening prep, the Discord chat exploding.
5. FORCE THE NARRATIVE: Make it sound like the PLAYER is living a character arc, not just making a move.
6. EMOJI SPARINGLY: 🚨 trap, 💥 capture, 👑 victory, 🔥 pressure, ♟️ chaos — only when it lands.
7. FRIEND-GROUP MATERIAL: group-chat receipts, suspicious confidence, deleting the app, commissioner investigations, fake retirement announcements, apology forms, trophy speeches, and reputation damage. Avoid repeating catchphrases mechanically.
8. 2V2 TWIST: If this is tag-team chess, reference coordinated chaos, duo synchronization, and the shared embarrassment of losing as a team.
9. FINAL VERDICT: Always end with a sharp league judgment about what just happened or what's coming.
10. NO MARKDOWN. NO ASTERISKS. NO HEDGING. BE BOLD, BUT KEEP IT LOVE-YOUR-FRIENDS PLAYFUL, NEVER CRUEL.
10A. PROOFREAD before responding. Use complete words, correct spelling, correct subject-verb agreement, and complete sentences. Never return a clipped first or last word.
11. COACHING MODE: If Game type starts with "Chester Coaching", still bring the same comedic energy but pair every roast or hype line with one concrete, accurate chess lesson the player can actually use next time. Never fabricate a mistake the engine grade does not support, and never pretend a BEST or GREAT move was bad.
12. OPENING ASSESSMENT: When FINAL OPENING ASSESSMENT is present, begin with the exact phrase "Opening Grade ${payload.openingAssessment?.grade || ''}". Explain whether that letter is good or bad, cite at least one recorded strength and one improvement, and explain why opening strategy matters: it builds central control, active development, efficient tempo, and king safety before the middlegame. Use 4-5 concise sentences for this final assessment instead of the usual 2-3.
13. OPENING RECOGNITION: When a named opening is recognized, mention its name naturally and explain one defining strategic idea. Celebrate a principles streak of three or more; do not announce placeholder names such as "Opening book loading" or "Uncharted Opening".
14. PLAYER CHAT: When the request type is chat, answer the latest PLAYER message directly. Use recent conversation for continuity, ignore move-grade instructions when no move was supplied, and give one concrete chess action or principle the player can apply. Keep the answer to 2-4 concise sentences and do not repeat the question.

Generate Chester's commentary now. If no move was supplied, answer the player's chat message directly while staying in character: ${payload.message || 'No question supplied'}.`;

    const genAI = new GoogleGenAI({ apiKey });
    const models = payload.type === 'chat'
      ? ['gemini-3.5-flash', 'gemini-3.1-flash-lite']
      : ['gemini-3.6-flash', 'gemini-3.5-flash-lite'];
    let responseText = '';
    let lastError: unknown;
    for (const model of models) {
      try {
        const result = await genAI.models.generateContent({
          model,
          contents: systemPrompt,
          config: {
            temperature: payload.type === 'chat' ? 0.85 : 1.15,
            maxOutputTokens: payload.type === 'chat' ? 1000 : 240,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          },
        });
        responseText = result.text || '';
        if (responseText) break;
      } catch (error) {
        lastError = error;
        console.warn(`[CHESTER] ${model} unavailable, trying fallback`);
      }
    }
    if (!responseText && lastError) throw lastError;
    const sanitized = sanitizeCommentary(responseText);

    if (!sanitized || sanitized.length < 80) {
      console.warn('[CHESTER] Gemini response too short:', sanitized);
      return NextResponse.json({
        reply: getDynamicFallback(payload),
      });
    }

    return NextResponse.json({ reply: sanitized });
  } catch (error) {
    console.error('[CHESTER] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      reply: getDynamicFallback(payload),
    });
  }
}
