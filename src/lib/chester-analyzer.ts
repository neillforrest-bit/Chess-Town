// BUILD 165: deterministic Chester analyzer (PRD pillars 3-5). chess.js + existing Stockfish facts -> structured,
// speakable, exact-square commentary in the ChesterCommentaryPayload shape. Zero AI spend. A Gemini tier can fill the
// same schema later (flag), but this path is the default and the guaranteed fallback so the HUD is never blank.
import { Chess } from 'chess.js';
import { hangingPieces } from './tactics';
import { plainMoveNoun, plainSuggestion, plainWhy, sameMove } from './move-words';

export type MoveGrade = 'BRILLIANT' | 'STRONG' | 'SOLID' | 'SHAKY' | 'BLUNDER' | 'IDLE';
export type ArrowIntent = 'ENGINE_BEST' | 'OPPONENT_THREAT' | 'PLAYER_MISTAKE';
export type SquareType = 'HANGING_PIECE' | 'CHECK_DANGER' | 'KEY_OUTPOST';
export type WhyCard = {
  ply: number; moveNo: number; san: string; grade: MoveGrade; cp: number | null;
  headlineBadge: string; whatHappenedLine: string; engineBlueprintLine: string;
  boardOverlayArrows: { from: string; to: string; intent: ArrowIntent }[];
  highlightedSquares: { square: string; type: SquareType }[];
  contextualChatChips: string[];
  engineBestSan: string | null; engineBestUci: string | null; hintMotif: string; hintPiece: string | null; hintSquare: string | null;
  fenBefore: string; fenAfter: string;
};

const N: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** PRD FR-3.2: strict move-to-English. Always exact squares, SAN in brackets. Never "to the kingside". */
export function formatSanToHuman(fenBefore: string, moveSanOrUci: string): string {
  try {
    { const plain = plainMoveNoun(fenBefore, moveSanOrUci); if (plain) return plain; }
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


/** Terminal facts about the position AFTER a move: mate/stalemate/draw + mover material edge. */
export function terminalInfo(fenAfter: string): { kind: 'mate' | 'stalemate' | 'draw'; moverUp: number } | null {
  try {
    const t = new Chess(fenAfter);
    const mover = t.turn() === 'w' ? 'b' : 'w';
    if (t.isCheckmate()) return { kind: 'mate', moverUp: 0 };
    if (!t.isStalemate() && !t.isDraw()) return null;
    const val: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    let moverMat = 0; let oppMat = 0;
    for (const row of t.board()) for (const sq of row) { if (sq && sq.type !== 'k') { const v = val[sq.type] || 0; if (sq.color === mover) moverMat += v; else oppMat += v; } }
    if (t.isStalemate()) return { kind: 'stalemate', moverUp: moverMat - oppMat };
    return { kind: 'draw', moverUp: moverMat - oppMat };
  } catch { return null; }
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

export type AnalyzerInput = { ply: number; san: string; fenBefore: string; fenAfter: string; classification?: string | null; cp?: number | null; bestSan?: string | null; check?: boolean; mate?: boolean; captured?: string | null; provisional?: boolean };

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
  const term = terminalInfo(inp.fenAfter);
  // Tactic grounding (his insight ask): the moved piece's LEGAL captures on the next move,
  // read from the board with the turn flipped back (pin-safe by construction). A fork is only
  // named when those captures are actually legal; when the piece can simply be taken back it is
  // described as a sacrifice whose compensation the deep engine search confirmed - never as a
  // guaranteed material win.
  const tactic = (() => {
    const none = { caps: [] as { piece: string; square: string }[], enPrise: false, kingTakes: false, piece: '' };
    try {
      const beforeC = new Chess(inp.fenBefore);
      const mv = (beforeC.moves({ verbose: true }) as any[]).find((m) => m.san === inp.san);
      if (!mv || mv.piece === 'k' || mv.piece === 'p') return none;
      const afterT = new Chess(inp.fenAfter);
      (afterT as any).setTurn(mv.color);
      const caps = ((afterT.moves({ verbose: true }) as any[]).filter((m: any) => m.from === mv.to && m.captured && m.captured !== 'p') as any[])
        .map((m: any) => ({ piece: m.captured as string, square: m.to as string }))
        .sort((a, b) => 'qrbn'.indexOf(a.piece) - 'qrbn'.indexOf(b.piece));
      const enemy = mv.color === 'w' ? 'b' : 'w';
      const takers = ((new Chess(inp.fenAfter)) as any).attackers(mv.to, enemy) as string[];
      const kingTakes = takers.some((sq) => { const pc = (new Chess(inp.fenAfter)).get(sq as any) as any; return pc && pc.type === 'k'; });
      return { caps, enPrise: takers.length > 0, kingTakes, piece: N[mv.piece] || mv.piece };
    } catch { return none; }
  })();
  // Terminal facts (mate/stalemate/draw) are certain from the board; the move's QUALITY
  // comes only from real engine evidence (classification/cp) - never from material counts.
  // Provisional (deep engine check pending): never assert a quality grade - 'ENGINE STILL
  // UNSURE' with a STRONG badge and 'matches the engine' body was self-contradictory (his screenshot).
  const grade: MoveGrade = inp.provisional && !term ? 'IDLE' : gradeOf(inp.classification, inp.cp, hang.length > 0);
  const best = inp.bestSan ? engineReason(inp.fenBefore, inp.bestSan) : { uci: null, text: '', piece: null, from: null, motif: 'a stronger move' };
  const bestHuman = inp.bestSan ? formatSanToHuman(inp.fenBefore, inp.bestSan) : '';
  const good = grade === 'BRILLIANT' || grade === 'STRONG' || grade === 'SOLID';
  const salt = inp.ply * 7 + (inp.san.charCodeAt(0) || 1);

  const headline = (() => {
    if (term?.kind === 'mate') return 'CHECKMATE';
    if (term?.kind === 'stalemate') return !inp.provisional && grade === 'BLUNDER' ? 'THREW AWAY THE WIN' : 'DRAWN BY STALEMATE';
    if (term?.kind === 'draw') return 'DRAWN';
    if (inp.provisional) return 'ENGINE STILL UNSURE';
    if (!good && hang.length) return `LOOSE ${hang[0].piece.toUpperCase()} ON ${hang[0].square.toUpperCase()}`;
    return pick(good
      ? grade === 'BRILLIANT' ? ['BRILLIANT FIND', 'PINPOINT STRIKE', 'CHESTER SALUTES THAT'] : grade === 'STRONG' ? ['ENGINE-GRADE MOVE', 'EXACTLY RIGHT', 'CLEAN AND ACCURATE'] : ['SOLID CHOICE', 'SENSIBLE AND SAFE', 'STEADY PLAY']
      : grade === 'BLUNDER' ? ['COSTLY MISTAKE', 'THAT HANDS ME AN EDGE', 'BIG SWING AGAINST YOU'] : ['SMALL SLIP', 'A BETTER ONE EXISTED', 'PLAYABLE BUT LOOSE'], salt);
  })();

  const did = (() => {
    if (inp.provisional && !term) return `\u2753 You played ${human}. The engine is still reading this one - no confirmed grade yet.`;
    if (term?.kind === 'mate') return `\u2705 You played ${human.replace(/[ -]+checkmate\.?$/i, '')} - checkmate. Their king has no escape: the game is over.`;
    if (term?.kind === 'stalemate') {
      const fact = `${human} - stalemate: their king was NOT in check but had no legal move, so the game is a draw.`;
      if (inp.provisional) return `\u2796 You played ${fact} The engine did not produce a trustworthy grade here, so this move is excluded from your accuracy.`;
      if (grade === 'BLUNDER') return `\u274c You played ${fact} The engine had a much stronger move - this cost you most of your expected score.`;
      return `\u2796 You played ${fact}`;
    }
    if (term?.kind === 'draw') return `\u2796 You played ${human}, and the game ends in a draw.`;
    if (good) {
      const verb = pick(['You played', 'Your move:', 'You chose'], salt + 1);
      const parts: string[] = [];
      if (inp.captured && !/taking|captures/i.test(human)) parts.push(`winning the ${N[inp.captured] || inp.captured}`);
      if (tactic.caps.length >= 2 && !tactic.enPrise) parts.push(`forking their ${N[tactic.caps[0].piece]} on ${tactic.caps[0].square} and ${N[tactic.caps[1].piece]} on ${tactic.caps[1].square}`);
      else if (tactic.caps.length >= 1 && !tactic.enPrise && 'qr'.includes(tactic.caps[0].piece)) parts.push(`attacking their ${N[tactic.caps[0].piece]} on ${tactic.caps[0].square}`);
      else if (tactic.kingTakes && grade === 'BRILLIANT') parts.push(`sacrificing ${inp.captured ? 'it' : `the ${tactic.piece}`} to drag their king into the open`);
      const why = parts.length ? parts.join(' and ') : inp.check ? 'with check, so my reply is forced' : grade === 'BRILLIANT' ? 'and the engine rates it as the strongest idea here' : `to ${plainWhy(inp.fenBefore, inp.san)}`;
      const glue = parts.length && /taking|captures/i.test(human) ? ' and ' : ' ';
      return `✅ ${verb} ${human}${glue}${why}.`;
    }
    if (inp.provisional) return `❓ You played ${human}. The quick engine read calls this a slip, but the deeper check did not finish - treat this grade as unconfirmed.`;
    if (hang.length) return `❌ You played ${human}, leaving your ${hang[0].piece} on ${hang[0].square} undefended${punishSan ? ` - I can take it with ${punishSan}` : ''}.`;
    return `❌ You played ${human}, and it gives up ground: the engine had a clearly better idea.`;
  })();

  const eng = inp.provisional && !term
    ? '\ud83e\udd16 Engine line still loading - the deeper check will settle this one.'
    : term
    ? (term.kind === 'mate'
      ? '\ud83e\udd16 No engine opinion needed - the game is over.'
      : term.kind === 'stalemate'
        ? (grade === 'BLUNDER' && !inp.provisional
          ? '\ud83e\udd16 Stalemate ends the game immediately as a draw. The engine\u2019s preferred move kept the win - the final report shows the exact accuracy math.'
          : '\ud83e\udd16 Stalemate ends the game immediately as a draw - there is nothing left to analyse.')
        : '\ud83e\udd16 The game is drawn - there is nothing left to analyse.')
    : inp.bestSan
    ? (!good || grade === 'SOLID')
      ? `🤖 Before your move, the stronger idea was: ${plainSuggestion(inp.fenBefore, inp.bestSan) || best.text || 'a move that keeps your pieces safer'}.`
      : `🤖 ${grade === 'BRILLIANT' ? 'The engine agrees' : 'That matches the engine'}${tactic.caps.length >= 2 && !tactic.enPrise ? ' - the fork is the point' : tactic.kingTakes && grade === 'BRILLIANT' ? ' - the material comes second; the exposed king is the point, and the deep search backs the attack' : ` - a good way to ${plainWhy(inp.fenBefore, inp.bestSan)}`}.`
    : '🤖 Engine line loading - the move above is graded on the board facts.';

  const arrows: WhyCard['boardOverlayArrows'] = [];
  if (best.uci && (!good || grade === 'SOLID')) arrows.push({ from: best.uci.slice(0, 2), to: best.uci.slice(2, 4), intent: 'ENGINE_BEST' });
  if (punishArrow) arrows.push({ ...punishArrow, intent: 'OPPONENT_THREAT' });
  const squares: WhyCard['highlightedSquares'] = hang.map((h) => ({ square: h.square, type: 'HANGING_PIECE' as const }));
  if (inp.check) { try { const a = new Chess(inp.fenAfter); const t = a.turn(); for (const s of [].concat(...(a.board() as any))) { const sq = s as any; if (sq && sq.type === 'k' && sq.color === t) squares.push({ square: sq.square, type: 'CHECK_DANGER' }); } } catch { /* ignore */ } }

  const chips: WhyCard['contextualChatChips'] = !good
    ? ['What should my next move be?', 'Why did my last move lose points?', "How do I defend against Chester's threat?", 'Let me take that move back']
    : ['What should my next move be?', 'Compare my top 2 candidate moves', 'Are any of my pieces undefended right now?', "What is Chester's plan here?"];

  return {
    ply: inp.ply, moveNo, san: inp.san, grade, cp: term ? null : inp.cp == null ? null : Math.round(inp.cp),
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
  return `Try this: ${plainSuggestion(card.fenBefore, card.engineBestSan || card.engineBestUci) || formatSanToHuman(card.fenBefore, card.engineBestSan || card.engineBestUci)}.`;
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
function chatReplyBase(message: string, card: WhyCard | null, live: { fen: string; bestSan: string | null } | null): string {
  const q = message.toLowerCase();
  const eng = live?.bestSan && live.fen ? bestInfo(live.fen, live.bestSan) : null;
  const engLine = eng?.san ? `My pick here: ${plainSuggestion(live!.fen, eng.san) || formatSanToHuman(live!.fen, eng.san)}.` : '';
  let und: string[] = [];
  try { if (live?.fen) { const c = new Chess(live.fen); const mine = c.turn(); und = hangingPieces(c, mine).map((h) => `${h.piece} on ${h.square}`); } } catch { /* ignore */ }
  if (/undefended|loose|hanging/.test(q)) return und.length ? `Yes: your ${und.join(' and your ')} ${und.length > 1 ? 'are' : 'is'} attacked with no defender. Fix that before anything fancy.` : 'Nothing of yours is hanging right now. Every attacked piece has a defender.';
  if (/lose points|why.*(shaky|last move|lose|brilliant|graded|mistake)|what could i have done|better/.test(q)) {
    if (!card) return 'Make a move first and I will grade it. Then ask me again.';
    if (noLossCard(card)) return `Good news first: that move did not lose points. ${card.whatHappenedLine.replace(/^[✅❌]\s*/, '')} If you want a real lesson, ask me about a move I marked with a warning - or ask "what should I play?" for the next idea.`;
    return `${card.whatHappenedLine.replace(/^[✅❌]\s*/, '')} ${card.engineBlueprintLine.replace(/^🤖\s*/, '')}`;
  }
  const pieceAsk = q.match(/queen|rook|bishop|knight/);
  if (pieceAsk && /lose|safe|attacked|take|hang|blunder/.test(q) && live?.fen) {
    try {
      const c = new Chess(live.fen); const mine = c.turn(); const enemy = mine === 'w' ? 'b' : 'w';
      const t = { q: 'q', r: 'r', b: 'b', k: 'n' }[pieceAsk[0][0]] as string;
      const squares: string[] = [];
      for (const row of c.board()) for (const sq of row as any[]) { if (sq && sq.type === t && sq.color === mine) squares.push(sq.square); }
      if (squares.length) {
        const attacked = squares.filter((sq) => c.isAttacked(sq as any, enemy));
        return attacked.length
          ? `Yes, watch it: your ${pieceAsk[0]} on ${attacked.join(' and ')} is under attack right now. ${engLine || 'Move it or guard it before anything fancy.'}`
          : `Your ${pieceAsk[0]} is not under attack at the moment. ${engLine || 'Still, count attackers and defenders before you commit.'}`;
      }
    } catch { /* ignore */ }
  }
  if (/defend|threat|secret plan|plan/.test(q)) {
    // Concrete, from the live board: name what is actually under attack right now.
    const threats: string[] = [];
    try { if (live?.fen) { const c = new Chess(live.fen); const mine = c.turn(); const enemy = mine === 'w' ? 'b' : 'w'; const val: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      const hits: { t: string; v: number }[] = [];
      for (const row of c.board()) for (const sq of row as any[]) { if (sq && sq.color === mine && sq.type !== 'k' && val[sq.type] && c.isAttacked(sq.square as any, enemy)) hits.push({ t: `your ${N[sq.type]} on ${sq.square}`, v: val[sq.type] }); }
      for (const h of hits.sort((a, b) => b.v - a.v).slice(0, 2)) threats.push(h.t);
    } } catch { /* ignore */ }
    if (threats.length) return `Watch out: ${threats.join(' and ')} ${threats.length > 1 ? 'are' : 'is'} under attack right now. Deal with the biggest one first. ${engLine}`;
    return `${engLine || 'Nothing of yours is under fire right now. Find your worst-placed piece and give it a better job.'}`;
  }
  if (/take that move back|retry|undo/.test(q)) return 'Use the Retry pill under my comment. It rewinds your last move so you can try the engine idea.';
  if (/compare|candidate|what should i play|best/.test(q)) {
    // Never the chess.com proverb: name the actual checks and captures on this board.
    try { if (live?.fen) {
      const c = new Chess(live.fen); const ms = c.moves({ verbose: true }) as any[];
      const fmt = (m: any) => plainMoveNoun(live.fen, m.san) || m.san;
      const checks = ms.filter((m) => m.san.includes('+')).slice(0, 2).map((m) => `check with ${fmt(m)}`);
      const caps = ms.filter((m) => m.captured).slice(0, 2).map((m) => fmt(m));
      const opts = [...checks, ...caps];
      if (opts.length) return `Concrete options on this board: ${opts.join('; ')}. ${engLine}`;
    } } catch { /* ignore */ }
    return engLine || 'Look for checks, captures and threats in that order, then pick the safest of them.';
  }
  if (/tactic/.test(q)) return 'Three questions before every move: what is loose, what can be forked, what does my move leave undefended? Tonight the third one wins you games.';
  return engLine || (card ? `About your last move: ${card.whatHappenedLine.replace(/^[✅❌]\s*/, '')} Ask me "what should I do next?" for a fresh idea.` : 'Ask me about your last move, a threat, or what to play next.');
}

// ---- BUILD 183: multi-turn Chester chat -------------------------------------
// Fixes the verbatim-repeat bug: follow-ups used to fall through to the static card lines.
// Adds: board-support intent (frozen/can't move), safety simulation of the discussed idea
// ("won't I lose my pawn?"), why-better follow-ups, and a repeat guard.

type ChatTurn = { role: 'user' | 'chester'; text: string };

/** Legal captures landing on `target` for `byColor`, cheapest attacker first. */
function takersOf(pos: Chess, target: string, byColor: 'w' | 'b'): { piece: string; value: number }[] {
  const val: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  try {
    let c = pos;
    const occ = pos.get(target as never) as { type: string; color: string } | null;
    if (occ && occ.color === byColor && occ.type !== 'k') {
      // Own piece sits on the square: swap in an enemy dummy so legal captures enumerate the real defenders.
      c = new Chess(pos.fen());
      c.remove(target as never);
      c.put({ type: occ.type as never, color: (byColor === 'w' ? 'b' : 'w') as never }, target as never);
    }
    if (c.turn() !== byColor) {
      const parts = c.fen().split(' ');
      parts[1] = byColor; parts[3] = '-';
      c = new Chess(parts.join(' '));
    }
    return (c.moves({ verbose: true }) as any[])
      .filter((mv) => mv.to === target && mv.captured)
      .map((mv) => ({ piece: N[mv.piece], value: val[mv.piece] || 1 }))
      .sort((a, b) => a.value - b.value);
  } catch { return []; }
}

function simMove(fen: string, moveSanOrUci: string): { after: Chess; m: any } | null {
  try {
    const c = new Chess(fen);
    const legal = c.moves({ verbose: true }) as any[];
    const m = legal.find((x) => x.san === moveSanOrUci) || legal.find((x) => `${x.from}${x.to}${x.promotion || ''}` === moveSanOrUci) || legal.find((x) => x.lan === moveSanOrUci);
    if (!m) return null;
    c.move(m.san);
    return { after: c, m };
  } catch { return null; }
}

/** "Won't I lose my pawn?" - simulate the discussed idea and answer its safety with named pieces. */
function safetyAnswer(card: WhyCard | null, live: { fen: string; bestSan: string | null } | null): string | null {
  const fen = card?.fenBefore || live?.fen || null;
  const san = card?.engineBestSan || live?.bestSan || null;
  if (!fen || !san) return null;
  const sim = simMove(fen, san);
  if (!sim) return null;
  const { after, m } = sim;
  const mover = m.color as 'w' | 'b';
  const val: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const movedName = N[m.piece];
  const human = formatSanToHuman(fen, m.san);
  const oppTakers = takersOf(after, m.to, mover === 'w' ? 'b' : 'w');
  if (!oppTakers.length) return `No - ${human} is safe. Nothing of theirs can take your ${movedName} on ${m.to} next move, so the idea stands.`;
  const defenders = takersOf(after, m.to, mover);
  const cheapest = oppTakers[0];
  const dName = defenders.length ? ` - your ${defenders[0].piece} covers it` : '';
  if (defenders.length) {
    if (cheapest.value < (val[m.piece] || 1)) return `Yes, their ${cheapest.piece} can take it - and that is the trap: you recapture${dName}, and they have handed a ${cheapest.piece} over for a ${movedName}. Bad deal for them.`;
    return `They can chase it with their ${cheapest.piece}, but your ${movedName} is guarded${dName}. If they take, you take straight back - an even trade, and your move has already done its job.`;
  }
  return `Honest answer: yes, right now their ${cheapest.piece} could win your ${movedName} on ${m.to} and nothing of yours guards it yet. The engine still rates ${human} for other reasons - but if you want the safe road first, ask me "what should I play?" and I will give you a solid one.`;
}

/** "Why is your idea better than what I played?" - consequence comparison, never the review text repeated. */
function whyBetterAnswer(card: WhyCard): string {
  const played = formatSanToHuman(card.fenBefore, card.san);
  if (noLossCard(card)) return `Straight answer: it was not better - you played the engine's own idea with ${played}. Nothing dropped, nothing to retry. Ask me "what should I play?" and I will find the next one.`;
  const idea = card.engineBestSan ? formatSanToHuman(card.fenBefore, card.engineBestSan) : null;
  let moverColor: 'w' | 'b' = 'w';
  try { moverColor = new Chess(card.fenBefore).turn(); } catch { /* ignore */ }
  let afterPlayedLoose: { piece: string; square: string }[] = [];
  try { afterPlayedLoose = hangingPieces(new Chess(card.fenAfter), moverColor); } catch { /* ignore */ }
  const engineSim = card.engineBestSan ? simMove(card.fenBefore, card.engineBestSan) : null;
  let afterIdeaLoose: { piece: string; square: string }[] = [];
  if (engineSim) { try { afterIdeaLoose = hangingPieces(engineSim.after, moverColor); } catch { /* ignore */ } }
  const bits: string[] = [];
  if (idea) bits.push(`the idea was ${idea}`);
  if (afterPlayedLoose.length && !afterIdeaLoose.length) bits.push(`your move (${played}) leaves your ${afterPlayedLoose[0].piece} on ${afterPlayedLoose[0].square} attacked with no defender, and the idea keeps everything covered`);
  else if (card.cp != null && Math.abs(card.cp) >= 40) bits.push(`the engine counts your move (${played}) as giving up about ${(Math.abs(card.cp) / 100).toFixed(1)} pawns of value - nothing drops at once, but the pressure fades`);
  if (!bits.length) return `Short version: ${card.whatHappenedLine.replace(/^[✅❌]\s*/, '')}`;
  const retry = card.grade === 'SHAKY' || card.grade === 'BLUNDER';
  return `Here is the difference: ${bits.join(', ')}. That is why I nudged you there.${retry ? ' Want to try it? Use the Retry pill under my review.' : ''}`;
}

/** True when the played move matches the engine idea or cost nothing worth a lesson. */
function noLossCard(card: WhyCard): boolean {
  if (card.grade === 'BRILLIANT' || card.grade === 'STRONG') return true;
  if (card.engineBestSan && sameMove(card.fenBefore, card.san, card.engineBestSan)) return true;
  if (card.cp != null && Math.abs(card.cp) < 25 && card.grade !== 'BLUNDER' && card.grade !== 'SHAKY') return true;
  return false;
}

export function chatReply(message: string, card: WhyCard | null, live: { fen: string; bestSan: string | null } | null, history?: ChatTurn[]): string {
  const q = message.toLowerCase();
  const prevChester = history ? [...history].reverse().find((t) => t.role === 'chester')?.text || '' : '';
  let out = '';
  // 0. Terminal board: the game is over. Answer in review voice from the final position
  // and the actual last move - never a future suggestion on a finished board, and never
  // "it was not better" boilerplate when nobody asked for a comparison (his pixel review).
  try {
    if (live?.fen) {
      const over = new Chess(live.fen);
      if (over.isGameOver()) {
        const hist = over.history({ verbose: true }) as any[];
        const last = hist[hist.length - 1] || null;
        const mate = over.isCheckmate();
        const stale = over.isStalemate();
        // Whose mate was it: the side TO MOVE is the mated side, always (a FEN-built board
        // has no history, so never trust `last` here). The coach-mode player is White, so
        // black-to-move-mated means the player delivered it.
        const playerMatedIt = mate && ((card && last && card.san === last.san) || over.turn() === 'b');
        const piecePhrase = last ? `your ${({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as Record<string, string>)[last.piece] || 'piece'} to ${last.to}` : 'the final move';
        const resultLine = mate
          ? (playerMatedIt ? 'your final move was checkmate' : 'that final move was checkmate against you')
          : stale ? 'the game ended in stalemate - no legal moves, but no check' : 'the game ended in a draw';
        const whyMate = (): string => {
          if (!mate) return '';
          try {
            const kingSq = (() => { for (const row of over.board()) for (const cell of row) { if (cell && cell.type === 'k' && cell.color === over.turn()) return cell.square; } return null; })();
            if (!kingSq) return 'The king was attacked and had no legal reply.';
            const files = 'abcdefgh';
            const kc = files.indexOf(kingSq[0]);
            const kr = parseInt(kingSq[1], 10);
            const reasons: string[] = [];
            for (let dc = -1; dc <= 1 && reasons.length < 3; dc++) for (let dr = -1; dr <= 1 && reasons.length < 3; dr++) {
              if (!dc && !dr) continue;
              const c2 = kc + dc; const r2 = kr + dr;
              if (c2 < 0 || c2 > 7 || r2 < 1 || r2 > 8) continue;
              const sq2 = `${files[c2]}${r2}`;
              const occ = over.get(sq2 as any);
              if (occ && occ.color === over.turn()) { reasons.push(`${sq2} was blocked by their own ${({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as Record<string, string>)[occ.type] || 'piece'}`); continue; }
              const hunters = over.attackers(sq2 as any, over.turn() === 'w' ? 'b' : 'w');
              if (hunters.length) reasons.push(`${sq2} was covered`);
            }
            return reasons.length ? ` The king could not run: ${reasons.join(', ')} - and nothing could block or take the attacker.` : ' The king was attacked and had no legal reply.';
          } catch { return ' The king was attacked and had no legal reply.'; }
        };
        if (/why|how come|explain/.test(q) && mate) return `${resultLine.charAt(0).toUpperCase() + resultLine.slice(1)}.${whyMate()} That is what checkmate means - the attack with no answer.`;
        if (/practise|practice|homework|work on|improve|get better/.test(q)) return 'One habit decides games at your level: before every move, ask what it leaves undefended. Pawn Wars is the short, sharp drill for exactly that - nothing left hanging.';
        if (/next|what should i (play|do)|suggest|best move|stuck|help me/.test(q)) return 'There is no next move on this board - the game is finished. Tap REMATCH and I will meet you back at move one.';
        if (/last move|how did i do|was .*(good|ok|okay|right)|good move|grade|how was|did i win|who won/.test(q) || mate || stale) {
          if (playerMatedIt) return `Yes - and then some. ${resultLine.charAt(0).toUpperCase() + resultLine.slice(1)}.${whyMate()} The cleanest ending in chess.`;
          if (mate) return `Hard truth: ${resultLine}.${whyMate()} The lesson lives a move or two earlier - ask me "what should I practise?" and I will point you at it.`;
          return `Here is the honest read: ${resultLine}. Ask me "what should I practise?" for the next step.`;
        }
      }
    }
  } catch { /* terminal detection is a bonus - fall through to normal intents */ }
  // 1. Board support: frozen / can't move / not working. Never a move review.
  if (/frozen|can'?t move|cant move|won'?t move|wont move|not (working|responding|moving)|nothing happens|glitch|bug|broken|crashed|won'?t let me/.test(q)) {
    const turn = live?.fen ? live.fen.split(' ')[1] : null;
    if (turn === 'b') return 'That is not the board freezing - it is my move. Give me a few seconds to play, then your pieces will answer again.';
    return 'Not chess this time - let us unstick you. Tap one of your own pieces once: every square it can reach should glow. If nothing glows, try a different piece. If the whole board ignores you, refresh the page once and come straight back to me.';
  }
  // 2. Safety of the discussed idea: "won't I lose my pawn?" - simulate it and name names.
  if (!out && (/won'?t i lose|wont i lose|will i lose|lose my (pawn|queen|rook|bishop|knight|piece)|get taken|be captured|be taken|take my (pawn|queen|rook|bishop|knight)/.test(q) || (/is (it|that|this|the move) safe/.test(q)))) {
    out = safetyAnswer(card, live) || '';
  }
  // 3. Why is your idea better than what I played?
  if (!out && card && (/why .*(better|stronger|prefer)|but why|how come|why is (that|this|it)/.test(q) || /^(why|why\?|really|are you sure|how so|what do you mean|explain)[?!. ]*$/.test(q.trim()))) {
    out = whyBetterAnswer(card);
  }
  // 4. Everything else: the original intent router.
  if (!out) out = chatReplyBase(message, card, live);
  // 5. Repeat guard: only for card-based review questions. Live-board answers ("is anything
  // hanging?") are recomputed from the position - an identical repeat there is the honest
  // answer when the facts are identical, and swapping in a card answer would go off-intent.
  const cardIntent = /lose points|why.*(shaky|last move|lose|brilliant|graded|mistake)|what could i have done|better/.test(q);
  if (prevChester && out === prevChester && cardIntent && card) {
    const deeper = whyBetterAnswer(card);
    if (deeper !== prevChester) out = deeper;
    else out = `${out} Ask me "what should I play?" and I will take a fresh look at the board as it stands.`;
  }
  return out;
}
