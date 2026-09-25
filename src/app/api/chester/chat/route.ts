import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { guardAiRequest, safeAiError } from '@/lib/api-guard';

// CHESTER CHAT - the one route behind every conversational surface (arena chat,
// Play Chester chat + coach line, post-game story, scenario intros, meet-chester).
// Every client already sends a rich briefing; this route's job is to HONOR it:
// Chester always answers from the actual position, grades and engine evidence,
// in a voice that is funny AND educational - theater is seasoning, never the meal.

type HistoryEntry = { role: 'user' | 'chester'; text: string };

type ChatPayload = {
  type?: string;
  message?: string;
  context?: string;
  instruction?: string;
  persona?: string;
  matchup?: string;
  mode?: string;
  fen?: string;
  objective?: string;
  engineTelemetry?: Record<string, unknown> | null;
  principalVariation?: string[];
  evaluationBefore?: number | null;
  evaluationAfter?: number | null;
  evalDelta?: number | null;
  openingAssessment?: string;
  gradeHistory?: { player?: string; move?: string; grade?: string }[];
  conversationHistory?: HistoryEntry[];
};

function sanitizeReply(raw: string) {
  return raw.replace(/\*+/g, '').replace(/\#+/g, '').replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();
}

function isMetaReply(reply: string) {
  return /\b(?:internal (?:thought|dialogue|reasoning)|system prompt|instruction(?:s)? (?:met|followed)|constraint(?:s)? (?:met|checklist)|as an ai|language model)\b/i.test(reply);
}

function fallback(message: string) {
  const subject = message.trim() || 'the board';
  return `Ah, ${subject} has wandered into the neon court. Give me the position or your next chess question, and I will help you find a plan.`;
}

const VOICE = `You are Chester, Chess Town's knight-jester: warm, quick-witted and genuinely funny, but a COACH first and a performer second. House rules, in order of importance:
1. ANSWER FIRST. Every reply directly addresses what the player asked, using the board evidence provided. Theater is the seasoning, never the meal - a joke that replaces the answer is a failed reply.
2. NEVER go meta: no narration about the conversation, the stage, the audience, echoes, curtains or spotlights instead of answering. If asked a chess question, answer the chess question.
3. Be educational: smuggle one real lesson into every answer - a principle, a pattern, a habit.
4. Plain English only: no algebraic notation, no square coordinates, no centipawns, no engine jargon. Describe moves in words ("knight to the kingside", "pawn two squares up").
5. Never invent board facts. If the evidence does not say it, do not claim it - work from the FEN, grades and engine lines supplied, and say so when the position is not provided.
6. Keep it tight: 2-4 complete sentences unless the briefing says otherwise. End with exactly one concrete thing the player can do or look for next.
7. COURAGE CLAUSE: daring, outside-the-box ideas get banter, not just slaps. If the evidence shows an unsound but imaginative move, say so honestly - technically a blunder, magnificently weird - and name what they were hunting and why it nearly worked. If a move is unorthodox AND sound, give explicit respect: you love a maverick who did the math.`;

const TYPE_CONTRACTS: Record<string, string> = {
  chat: `TASK: The player asked a question mid-game. Answer it directly from the evidence: "how am I doing" gets the real grades and eval trend; "what should I play" gets the engine's idea translated into a plan; "teach me a tactic" gets one tactic that fits THIS position if the evidence offers one, otherwise the most useful pattern for their level; "why was my move graded that" gets the real reason from the grade and the engine's preferred idea.`,
  coach: `TASK: You are reviewing one graded move (or a hint request) mid-lesson. Explain the threat, the plan and the why in at most 3 sentences, then one concrete next action. If it is a hint, point at the idea, not the exact move - teach the player to find it. Apply the courage clause: creative-but-unsound gets the magnificently-weird treatment with what they were hunting; creative-and-sound gets explicit respect.`,
  'post-game-report': `TASK: Tell the story of this finished match in your voice: the turning point, what the player did well, one lesson, one concrete thing to try next game. At most 4 sentences.`,
  scenario: `TASK: Introduce this coaching scenario with hype energy: what the learning environment is and what the challenge asks, in 2-3 punchy sentences.`,
};

function buildEvidence(payload: ChatPayload): string {
  const lines: string[] = [];
  if (payload.persona) lines.push(`Persona briefing: ${payload.persona}`);
  if (payload.context) lines.push(`Client briefing (treat as ground truth for voice and board facts): ${payload.context}`);
  if (payload.matchup || payload.mode) lines.push(`Game: ${payload.matchup || payload.mode}`);
  if (payload.fen) lines.push(`Live board FEN: ${payload.fen}`);
  if (payload.openingAssessment) lines.push(`Opening assessment: ${payload.openingAssessment}`);
  const t = payload.engineTelemetry;
  if (t && typeof t === 'object') {
    const bits = Object.entries(t).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`);
    if (bits.length) lines.push(`Engine telemetry: ${bits.join('; ')}`);
  }
  if (payload.evaluationBefore !== null && payload.evaluationBefore !== undefined) lines.push(`Eval before last move: ${payload.evaluationBefore}`);
  if (payload.evaluationAfter !== null && payload.evaluationAfter !== undefined) lines.push(`Eval after last move: ${payload.evaluationAfter}`);
  if (payload.evalDelta !== null && payload.evalDelta !== undefined) lines.push(`Eval swing: ${payload.evalDelta}`);
  if (payload.principalVariation?.length) lines.push(`Engine's top line: ${payload.principalVariation.slice(0, 6).join(' ')}`);
  if (payload.objective) lines.push(`Challenge objective: ${payload.objective}`);
  if (payload.gradeHistory?.length) {
    const recent = payload.gradeHistory.slice(-12).map((g) => `${g.player || 'player'}: ${g.move || '?'} graded ${g.grade || '?'}`).join('; ');
    lines.push(`Recent graded moves: ${recent}`);
  }
  return lines.length ? `EVIDENCE FROM THE LIVE GAME:\n${lines.join('\n')}` : 'No live game evidence was supplied for this question - answer generally and say the board is not in view.';
}

export async function POST(req: NextRequest) {
  const blocked = guardAiRequest(req, 24_000, 20);
  if (blocked) return blocked;
  try {
    const payload = await req.json() as ChatPayload;
    const message = (payload.message || 'Hello, Chester.').slice(0, 1200);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) throw new Error('Gemini unavailable');

    const typeContract = TYPE_CONTRACTS[payload.type || 'chat'] || TYPE_CONTRACTS.chat;
    const evidence = buildEvidence(payload);
    const history = payload.conversationHistory?.slice(-8).map((entry) => `${entry.role === 'user' ? 'PLAYER' : 'CHESTER'}: ${entry.text.slice(0, 800)}`).join('\n') || 'No previous messages.';
    const instruction = payload.instruction ? `ADDITIONAL BRIEFING FROM THE GAME MASTER (follow it): ${payload.instruction}` : '';

    const prompt = `${VOICE}

${typeContract}
${instruction}

${evidence}

Recent conversation:
${history}

PLAYER: ${message}

Return only Chester's spoken reply. No markdown, no asterisks, no hashtags, at most one emoji.`;

    const result = await new GoogleGenAI({ apiKey }).models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { responseMimeType: 'text/plain', maxOutputTokens: 800, thinkingConfig: { thinkingBudget: 0 } },
    });
    const reply = sanitizeReply(result.text ?? '');
    return NextResponse.json({ reply: !reply || isMetaReply(reply) ? fallback(message) : reply, toolCall: null });
  } catch (error) {
    return safeAiError('CHESTER CHAT', error);
  }
}
