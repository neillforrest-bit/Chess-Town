// BUILD 165: deterministic Chester analyzer (PRD pillars 3-5). chess.js + existing Stockfish facts -> structured,
// speakable, exact-square commentary in the ChesterCommentaryPayload shape. Zero AI spend. A Gemini tier can fill the
// same schema later (flag), but this path is the default and the guaranteed fallback so the HUD is never blank.
import { Chess } from 'chess.js';
import { hangingPieces } from './tactics';

export type MoveGrade = 'BRILLIANT' | 'STRONG' | 'SOLID' | 'SHAKY' | 'BLUNDER' | 'IDLE';
export type ArrowIntent = 'ENGINE_BEST' | 'OPPONENT_THREAT' | 'PLAYER_MISTAKE';
export type SquareType = 'HANGING_PIECE' | 'CHECK_DANGER' | 'KEY_OUTPOST';
export type WhyCard = {
  ply: number; moveNo: number; san: string; grade: MoveGrade; cp: number | null;
  headlineBadge: string; whatHappenedLine: string; engineBlueprintLine: string;
  boardOverlayArrows: { from: string; to: string; intent: ArrowIntent }[];
  highlightedSquares: { square: string; type: SquareType }[];
  contextualChatChips: [string, string, string];
  engineBestSan: string | null; engineBestUci: string | null; hintMotif: string; hintPiece: string | null; hintSquare: string | null;
  fenBefore: string; fenAfter: string;
};

const N: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** PRD FR-3.2: strict move-to-English. Always exact squares, SAN in brackets. Never "to the kingside". */
export function formatSanToHuman(fenBefore: string, moveSanOrUci: string): string {
  try {
    const c = new Chess(fenBefore);
    const legal = c.moves({ verbose: true }) as any[];
    const m = legal.find((x) => x.san === moveSanOrUci) || legal.find((x) => `${x.from}${x.to}${x.promotion || ''}` === moveSanOrUci) || legal.find((x) => x.lan === moveSanOrUci);
    if (!m) return moveSanOrUci;
    const check = m.san.includes('#') ? ' with checkmate' : m.san.includes('+') ? ' with check' : '';
    if (m.flags.includes('k')) return `castles kingside (O-O)${check}`;
    if (m.flags.includes('q')) return `castles queenside (O-O-O)${check}`;
    const piece = cap(N[m.piece]);
    if (m.captured) return `${piece} captures ${N[m.captured]} on ${m.to}${check} (${m.san})`;
    if (m.promotion) return `pawn promotes to a ${N[m.promotion]} on ${m.to}${check} (${m.san})`;
    return `${piece} to ${m.to}${check} (${m.san})`;
  } catch { return moveSanOrUci; }
}

export function gradeOf(classification: string | null | undefined, cp: number | null | undefined, hanging: boolean): MoveGrade {
  const c = (classification || '').toUpperCase();
  if (c.includes('BRILL')) return 'BRILLIANT';
  if (c.includes('BLUNDER') || c.includes('MISTAKE')) return 'BLUNDER';
  if (c.includes('INACC') || c.includes('MISS')) return 'SHAKY';
  if (c.includes('BEST') || c.includes('GREAT')) return 'STRONG';
  if (c.includes('GOOD')) return 'SOLID';
  const d = cp == null ? null : Math.abs(cp);
  if (d != null) { if (hanging && d > 120) return 'BLUNDER'; if (d > 120) return 'BLUNDER'; if (d > 45) return 'SHAKY'; if (d > 20) return 'SOLID'; return 'STRONG'; }
  return 'IDLE';
}

const BADGE_ICON: Record<MoveGrade, string> = { BRILLIANT: '👑', STRONG: '🎯', SOLID: '✅', SHAKY: '😬', BLUNDER: '🚨', IDLE: '♞' };
export const gradeIcon = (g: MoveGrade) => BADGE_ICON[g];

// Rolling anti-repetition memory (PRD FR-4.2 rule 6): never reuse a phrasing shown in the last 6 cards.
const recent: string[] = [];
function pick(pool: string[], salt: number): string {
  const fresh = pool.filter((p) => !recent.includes(p));
  const use = (fresh.length ? fresh : pool)[Math.abs(salt) % (fresh.length ? fresh.length : pool.length)];
  recent.push(use); if (recent.length > 6) recent.shift();
  return use;
}
export const resetAnalyzerMemory = () => { recent.length = 0; };

/** Why the engine's move is good, concretely, by exact square. */
function engineReason(fenBefore: string, bestSan: string): { uci: string | null; text: string; piece: string | null; from: string | null; motif: string } {
  try {
    const c = new Chess(fenBefore);
    const legal = c.moves({ verbose: true }) as any[];
    const m = legal.find((x) => x.san === bestSan) || legal.find((x) => `${x.from}${x.to}${x.promotion || ''}` === bestSan) || legal.find((x) => x.lan === bestSan);
    if (!m) return { uci: null, text: '', piece: null, from: null, motif: 'a stronger move that keeps all your pieces guarded' };
    const enemy = m.color === 'w' ? 'b' : 'w';
    const after = new Chess(fenBefore); after.move(m.san);
    const parts: string[] = []; let motif = 'a move that improves your worst-placed piece';
    if (m.flags.includes('k') || m.flags.includes('q')) { parts.push('tucks your king to safety and connects your rooks'); motif = 'a move that tucks your king to safety'; }
    else if (m.san.includes('#')) { parts.push('it is checkmate'); motif = 'a move that ends the game on the spot'; }
    else if (m.captured) { parts.push(`wins the ${N[m.captured]} on ${m.to}`); motif = `a capture that wins material on ${m.to[0]}-file`; }
    else if (m.san.includes('+')) { parts.push('gives check and forces their reply'); motif = 'a check that forces their reply'; }
    else if (m.promotion) { parts.push('promotes to a new queen'); motif = 'a pawn push that promotes'; }
    else if (c.isAttacked(m.from, enemy)) { parts.push(`rescues your ${N[m.piece]} from the attack on ${m.from}`); motif = `a move that saves your ${N[m.piece]} under attack`; }
    else if ((m.piece === 'n' || m.piece === 'b') && m.from[1] === (m.color === 'w' ? '1' : '8')) { parts.push(`develops your ${N[m.piece]} to ${m.to} where it controls more squares`); motif = 'a developing move that brings a minor piece into play'; }
    else if (m.piece === 'p' && 'de'.includes(m.to[0]) && '45'.includes(m.to[1])) { parts.push(`claims the centre with a pawn on ${m.to}`); motif = 'a pawn move that claims the centre'; }
    else { const att = (after.moves({ verbose: true }) as any[]).length; void att; parts.push(`improves your ${N[m.piece]} on ${m.to} while keeping everything defended`); }
    const hang = (() => { try { return hangingPieces(after, m.color).length; } catch { return 0; } })();
    if (!hang && !parts.length) parts.push('keeps every piece guarded');
    return { uci: `${m.from}${m.to}${m.promotion || ''}`, text: parts.join(' and '), piece: N[m.piece], from: m.from, motif };
  } catch { return { uci: null, text: '', piece: null, from: null, motif: 'a stronger move' }; }
}

export type AnalyzerInput = { ply: number; san: string; fenBefore: string; fenAfter: string; classification?: string | null; cp?: number | null; bestSan?: string | null; check?: boolean; mate?: boolean; captured?: string | null };

export function buildWhyCard(inp: AnalyzerInput): WhyCard {
  const moveNo = Math.ceil(inp.ply / 2);
  let hang: ReturnType<typeof hangingPieces> = []; let punishSan: string | null = null; let punishArrow: { from: string; to: string } | null = null;
  let human = inp.san;
  try {
    const after = new Chess(inp.fenAfter);
    hang = hangingPieces(after, after.turn() === 'w' ? 'b' : 'w');
    human = formatSanToHuman(inp.fenBefore, inp.san);
    if (hang.length) {
      const target = hang[0].square;
      const takes = (after.moves({ verbose: true }) as any[]).filter((m) => m.to === target && m.captured).sort((a, b) => 'pnbrqk'.indexOf(a.piece) - 'pnbrqk'.indexOf(b.piece))[0];
      if (takes) { punishSan = takes.san; punishArrow = { from: takes.from, to: takes.to }; }
    }
  } catch { /* bad fen: fall through to generic wording */ }
  const grade = gradeOf(inp.classification, inp.cp, hang.length > 0);
  const best = inp.bestSan ? engineReason(inp.fenBefore, inp.bestSan) : { uci: null, text: '', piece: null, from: null, motif: 'a stronger move' };
  const bestHuman = inp.bestSan ? formatSanToHuman(inp.fenBefore, inp.bestSan) : '';
  const good = grade === 'BRILLIANT' || grade === 'STRONG' || grade === 'SOLID';
  const salt = inp.ply * 7 + (inp.san.charCodeAt(0) || 1);

  const headline = (() => {
    if (!good && hang.length) return `LOOSE ${hang[0].piece.toUpperCase()} ON ${hang[0].square.toUpperCase()}`;
    return pick(good
      ? grade === 'BRILLIANT' ? ['BRILLIANT FIND', 'PINPOINT STRIKE', 'CHESTER SALUTES THAT'] : grade === 'STRONG' ? ['ENGINE-GRADE MOVE', 'EXACTLY RIGHT', 'CLEAN AND ACCURATE'] : ['SOLID CHOICE', 'SENSIBLE AND SAFE', 'STEADY PLAY']
      : grade === 'BLUNDER' ? ['COSTLY MISTAKE', 'THAT HANDS ME AN EDGE', 'BIG SWING AGAINST YOU'] : ['SMALL SLIP', 'A BETTER ONE EXISTED', 'PLAYABLE BUT LOOSE'], salt);
  })();

  const did = (() => {
    if (good) {
      const verb = pick(['You played', 'Your move:', 'You chose'], salt + 1);
      const why = inp.captured ? `winning the ${N[inp.captured] || inp.captured}` : inp.check ? 'with check, so my reply is forced' : grade === 'BRILLIANT' ? 'and the engine rates it as the strongest idea here' : 'and it keeps your position healthy';
      return `✅ ${verb} ${human} ${why}.`;
    }
    if (hang.length) return `❌ You played ${human}, leaving your ${hang[0].piece} on ${hang[0].square} undefended${punishSan ? ` - I can take it with ${punishSan}` : ''}.`;
    return `❌ You played ${human}, and it gives up ground: the engine had a clearly better idea.`;
  })();

  const eng = inp.bestSan
    ? (!good || grade === 'SOLID')
      ? `🤖 Engine pick (${inp.bestSan}): ${best.text ? cap(best.text) : 'it keeps your pieces safer and the initiative with you'}.`
      : `🤖 ${grade === 'BRILLIANT' ? 'Engine agrees' : 'Engine pick matches'} (${inp.bestSan}): ${best.text ? cap(best.text) : 'nothing better on the board'}.`
    : '🤖 Engine line loading - the move above is graded on the board facts.';

  const arrows: WhyCard['boardOverlayArrows'] = [];
  if (best.uci && (!good || grade === 'SOLID')) arrows.push({ from: best.uci.slice(0, 2), to: best.uci.slice(2, 4), intent: 'ENGINE_BEST' });
  if (punishArrow) arrows.push({ ...punishArrow, intent: 'OPPONENT_THREAT' });
  const squares: WhyCard['highlightedSquares'] = hang.map((h) => ({ square: h.square, type: 'HANGING_PIECE' as const }));
  if (inp.check) { try { const a = new Chess(inp.fenAfter); const t = a.turn(); for (const s of [].concat(...(a.board() as any))) { const sq = s as any; if (sq && sq.type === 'k' && sq.color === t) squares.push({ square: sq.square, type: 'CHECK_DANGER' }); } } catch { /* ignore */ } }

  const chips: WhyCard['contextualChatChips'] = !good
    ? ['Why did my last move lose points?', "How do I defend against Chester's threat?", 'Let me take that move back']
    : ['Compare my top 2 candidate moves', 'Are any of my pieces undefended right now?', "What is Chester's plan here?"];

  return {
    ply: inp.ply, moveNo, san: inp.san, grade, cp: inp.cp == null ? null : Math.round(inp.cp),
    headlineBadge: headline, whatHappenedLine: did, engineBlueprintLine: eng,
    boardOverlayArrows: arrows, highlightedSquares: squares, contextualChatChips: chips,
    engineBestSan: inp.bestSan || null, engineBestUci: best.uci, hintMotif: best.motif, hintPiece: best.piece, hintSquare: best.from,
    fenBefore: inp.fenBefore, fenAfter: inp.fenAfter,
  };
}

/** Progressive hint ladder (PRD FR-7.5). */
export function hintFor(card: WhyCard | null, stage: 1 | 2 | 3): string {
  if (!card || !card.engineBestUci) return 'Check which of your pieces is attacked and unprotected, then look for a safe, active move.';
  if (stage === 1) return `Look at your ${card.hintPiece || 'piece'} on ${card.hintSquare} - it can do much more work from a better square.`;
  if (stage === 2) return `Look for ${card.hintMotif}.`;
  return `Play ${formatSanToHuman(card.fenBefore, card.engineBestSan || card.engineBestUci)}.`;
}

export const BANNED_PHRASES = ['ambitious! the engine found a crack', 'that one stings a little', 'to the kingside', 'to the queenside'];
export const isBanned = (s: string) => { const l = s.toLowerCase(); return BANNED_PHRASES.some((b) => l.includes(b)); };

/** Best-move facts for the live position (hint ladder, MoveChip previews). */
export function bestInfo(fen: string, best: string | null | undefined): { san: string | null; uci: string | null; piece: string | null; from: string | null; motif: string; text: string } {
  if (!fen || !best) return { san: null, uci: null, piece: null, from: null, motif: 'a stronger move', text: '' };
  const r = engineReason(fen, best);
  let san: string | null = null;
  try { const c = new Chess(fen); const m = (c.moves({ verbose: true }) as any[]).find((x) => x.san === best || `${x.from}${x.to}${x.promotion || ''}` === best || x.lan === best); san = m ? m.san : null; } catch { /* ignore */ }
  return { san, uci: r.uci, piece: r.piece, from: r.from, motif: r.motif, text: r.text };
}

/** Deterministic Chester chat (default, 0p). Same intents as the PRD chips; uses the live card + live engine pick. */
export function chatReply(message: string, card: WhyCard | null, live: { fen: string; bestSan: string | null } | null): string {
  const q = message.toLowerCase();
  const eng = live?.bestSan && live.fen ? bestInfo(live.fen, live.bestSan) : null;
  const engLine = eng?.san ? `My pick here is ${formatSanToHuman(live!.fen, eng.san)}${eng.text ? ` - it ${eng.text}` : ''}.` : '';
  let und: string[] = [];
  try { if (live?.fen) { const c = new Chess(live.fen); const mine = c.turn(); und = hangingPieces(c, mine).map((h) => `${h.piece} on ${h.square}`); } } catch { /* ignore */ }
  if (/undefended|loose|hanging/.test(q)) return und.length ? `Yes: your ${und.join(' and your ')} ${und.length > 1 ? 'are' : 'is'} attacked with no defender. Fix that before anything fancy.` : 'Nothing of yours is hanging right now. Every attacked piece has a defender.';
  if (/lose points|why.*(shaky|last move|lose)|what could i have done|better/.test(q)) {
    if (!card) return 'Make a move first and I will grade it. Then ask me again.';
    return `${card.whatHappenedLine.replace(/^[✅❌]\s*/, '')} ${card.engineBlueprintLine.replace(/^🤖\s*/, '')}`;
  }
  if (/defend|threat|secret plan|plan/.test(q)) return und.length ? `Your ${und[0]} is the soft spot. Guard it or move it, then think about attack. ${engLine}` : `${engLine || 'Keep your pieces guarded and look at what my last move attacks.'}`;
  if (/take that move back|retry|undo/.test(q)) return 'Use the Retry pill under my comment. It rewinds your last move so you can try the engine idea.';
  if (/compare|candidate|what should i play|best/.test(q)) return engLine || 'Look for checks, captures and threats in that order, then pick the safest of them.';
  if (/tactic/.test(q)) return 'Three questions before every move: what is loose, what can be forked, what does my move leave undefended? Tonight the third one wins you games.';
  return engLine || (card ? card.engineBlueprintLine.replace(/^🤖\s*/, '') : 'Ask me about your last move, a threat, or what to play next.');
}
