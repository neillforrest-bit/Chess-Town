// BUILD 125: Chester as "opponent voice + UI state controller".
// His spec returns one STRICT JSON object. Mid-game fields are produced here by
// deterministic rules (zero cost per move); only the post-game debrief + scouting
// report may come from the LLM (see parsePostGame / localPostGame).
import { analyse, type PlayerFile } from '@/lib/player-file';
import { CHESS_GUARDRAILS } from '@/lib/chess-guardrails';

export type UiAction = 'freeze_green' | 'freeze_red' | 'shake' | 'none';
export type DirectorOut = {
  ui_action: UiAction;
  hesitation_ms: number;
  chester_immediate_chat: string;
  freeze_explanation: string;
  post_game: { storyteller_debrief: string; scouting_report: string[] };
};
export type MoveFacts = {
  classification?: string | null; evalDelta?: number | null; // centipawns LOST vs the best move (>= 0)
  evaluationBefore?: number | null; // mover-relative centipawns before the move
  evaluationAfter?: number | null; // WHITE-absolute centipawns after the move
  playerColor?: 'w' | 'b'; movePhrase?: string | null; bestMovePhrase?: string | null;
  captured?: string | null; check?: boolean; mate?: boolean; sacrificePiece?: string | null;
  moveSan?: string | null; bestSan?: string | null; principleKey?: string | null; principleFollowed?: boolean | null; ply?: number;
};

export const FREEZE_PAWNS = 1.5; // his number: +-1.5 pawns

// His "stockfish_eval_swing", from the player's side, in pawns: eval after the move
// minus the eval the position promised before it. Never shown raw to the player.
export function evalSwingPawns(f: MoveFacts): number | null {
  if (f.evaluationAfter == null || f.evaluationBefore == null) return f.evalDelta == null ? null : -f.evalDelta / 100;
  const after = (f.playerColor || 'w') === 'w' ? f.evaluationAfter : -f.evaluationAfter;
  const swing = (after - f.evaluationBefore) / 100;
  const lossSwing = f.evalDelta == null ? 0 : -f.evalDelta / 100;
  return lossSwing <= -FREEZE_PAWNS ? lossSwing : swing;
}

const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];
const PIECE: Record<string, string> = { p: 'PAWN', n: 'KNIGHT', b: 'BISHOP', r: 'ROOK', q: 'QUEEN', k: 'KING' };

const BANTER = {
  green: ['Hm. Not bad, Maverick. Do not let it go to your head.', 'Okay, THAT I did not enjoy. Well played.', 'Maverick finds a good move. Mark the calendar.'],
  red: ['Oh, Maverick. I almost feel bad. Almost.', 'I saw that coming three moves ago. Thank you.', 'Bold. Wrong, but bold.'],
  shake: ['Careful, Maverick. That one wobbled.', 'Hm. I will take that, thanks.'],
  none: ['Your move was fine, Maverick. Fine is my favourite thing to beat.', 'Steady. Let us see if you keep it up.', 'I am watching every move. Just so you know.', 'Interesting. Not wrong. Yet.'],
};

export function direct(f: MoveFacts): Pick<DirectorOut, 'ui_action' | 'chester_immediate_chat' | 'freeze_explanation'> {
  const loss = f.evalDelta ?? 0;
  const swing = f.evalDelta == null && f.evaluationAfter == null ? null : (evalSwingPawns(f) ?? 0);
  const cls = (f.classification || '').toUpperCase();
  const seed = (f.ply || 0) * 7 + loss;
  const bad = (cls === 'MISTAKE' || cls === 'BLUNDER') && loss >= FREEZE_PAWNS * 100;
  const good = !bad && (cls === 'BRILLIANT' || ((cls === 'BEST' || cls === 'GREAT') && swing !== null && swing >= FREEZE_PAWNS));
  const slip = !bad && (cls === 'INACCURACY' || (loss >= 80 && loss < FREEZE_PAWNS * 100));
  // His notation rule: every move reference carries its standard algebraic notation next to the words.
  const withSan = (phrase: string | null | undefined, san: string | null | undefined) => (phrase && san ? `${phrase} (${san})` : phrase || san || null);
  const move = withSan(f.movePhrase, f.moveSan) || 'that move';
  const bestRef = withSan(f.bestMovePhrase, f.bestSan);
  const better = bestRef ? ` The move you wanted was ${bestRef}.` : '';
  // His chess rule: a King is never captured or sacrificed, so it can never be named as a sacrifice.
  const sacPiece = f.sacrificePiece && (f.sacrificePiece || '').toLowerCase().charAt(0) !== 'k' ? f.sacrificePiece : null;
  const cost = Math.max(1, Math.round(loss / 100));
  if (bad) {
    const concept = f.captured ? 'a CAPTURE that costs more than it wins' : f.principleKey && f.principleFollowed === false ? 'a BROKEN OPENING PRINCIPLE' : f.check ? 'a CHECK that walks into trouble' : 'an UNDEFENDED PIECE and a LOST TEMPO';
    return { ui_action: 'freeze_red', chester_immediate_chat: pick(BANTER.red, seed),
      freeze_explanation: `${move.toUpperCase()}, MAVERICK? THAT IS ${concept} - roughly ${cost} ${cost === 1 ? 'PAWN' : 'PAWNS'} OF VALUE GONE.${better}` };
  }
  if (good) {
    const concept = sacPiece ? `a SACRIFICE of your ${PIECE[(sacPiece || '').toLowerCase().charAt(0)] || (sacPiece || '').toUpperCase()} that pays back with INTEREST` : f.mate ? 'CHECKMATE' : f.captured ? 'a CLEAN WIN OF MATERIAL' : 'a move that grabs the INITIATIVE';
    return { ui_action: 'freeze_green', chester_immediate_chat: pick(BANTER.green, seed),
      freeze_explanation: `${move.toUpperCase()} IS ${concept}. I HATE that you found it, Maverick.` };
  }
  return { ui_action: slip ? 'shake' : 'none', chester_immediate_chat: pick(slip ? BANTER.shake : BANTER.none, seed), freeze_explanation: '' };
}

// Rule 3: complex, balanced middlegame = think long; forced or obvious = fast.
export function hesitationMs(input: { legalMoves: number; evalAbsCp: number | null; fullmove: number; lastWasCapture: boolean; recapture: boolean; level?: string }): number {
  if (input.legalMoves <= 1) return 300;
  if (input.recapture) return 500;
  let ms = 1800;
  if (input.fullmove >= 8 && input.legalMoves >= 28 && input.evalAbsCp != null && Math.abs(input.evalAbsCp) <= 50) ms = 5000 + Math.min(3000, (input.legalMoves - 28) * 120);
  else if (input.fullmove >= 6 && input.legalMoves >= 24 && input.evalAbsCp != null && Math.abs(input.evalAbsCp) <= 120) ms = 3200;
  else if (input.lastWasCapture) ms = 1200;
  if (input.level === 'BEGINNER') ms = Math.min(ms, 2200); // rookies should not wait
  return Math.max(0, Math.min(8000, ms));
}

// Post-game: ask the LLM for his exact JSON shape, fall back to a local read.
export function postGamePrompt(topSwings: string, playerLine: string): string {
  return `You are Chester, sharp-witted, slightly arrogant, highly analytical host of Chess-Town. Address the player as Maverick: competitive, a little sarcastic, genuinely educational. Return ONLY a strict JSON object, no markdown: {"storyteller_debrief": "<punchy narrative of the 2 biggest evaluation swings, centipawns translated into plain-English strategy, max 4 sentences>", "scouting_report": ["<bullet 1: Maverick's current form>", "<bullet 2: a recurring weakness>", "<bullet 3: one concrete tactical adjustment>"]}. The two biggest swings this game: ${topSwings}. Maverick's history: ${playerLine}. ${CHESS_GUARDRAILS}`;
}
export function parsePostGame(raw: string | null | undefined): { debrief: string; bullets: string[] } | null {
  if (!raw) return null;
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    const d = j.storyteller_debrief ?? j.post_game?.storyteller_debrief;
    const b = j.scouting_report ?? j.post_game?.scouting_report;
    if (typeof d === 'string' && d.length > 20 && Array.isArray(b) && b.length >= 3 && b.every((x: unknown) => typeof x === 'string')) return { debrief: d, bullets: b.slice(0, 3) };
  } catch { /* fall through */ }
  return null;
}
export function localScouting(file: PlayerFile): string[] {
  const a = analyse(file);
  if (!a.games) return ['Form: one game on the books, Maverick. I need more before I judge you properly.', 'Weakness: not enough games yet to spot a habit. Keep playing.', 'Fix: before every move, ask what it leaves undefended.'];
  const form = a.trend === 'better' ? 'Form: improving - fewer big slips lately.' : a.trend === 'worse' ? 'Form: slipping - more big mistakes than before.' : `Form: ${a.wins} win${a.wins === 1 ? '' : 's'} in ${a.games} game${a.games === 1 ? '' : 's'}, about ${a.perGame.toFixed(1)} big slips per game.`;
  const weak = a.worstPhase ? `Weakness: ${a.headline}${a.topPiece ? ` Your ${a.topPiece.piece} is involved most often.` : ''}` : 'Weakness: none that stands out yet.';
  return [form, weak, `Fix: ${a.lesson}`];
}
