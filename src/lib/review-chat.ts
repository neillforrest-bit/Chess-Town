/** Bounded, no-charge chat context for the game review.
 *
 *  The review page publishes the position the user is currently looking at; the
 *  global Chester chat can then answer a SMALL set of questions about that
 *  position offline (no paid calls). Anything outside the bounded intents
 *  returns null and the chat falls through to its normal path unchanged.
 *
 *  Suppression rule: when the scorecard marks this node's engine read unstable,
 *  no grade and no engine best-move is exposed here either - chat must not leak
 *  numbers the review UI itself hides.
 */
export type ReviewChatContext = {
  fen: string;
  practice?: boolean;
  plyNumber: number;        // 0 = starting position, otherwise 1-based ply being viewed
  totalPlies: number;
  san: string | null;       // SAN of the move at this ply (null at the start)
  isUserMove: boolean;
  suppressed: boolean;      // scorecard unstable at this node
  gradeLabel: string | null;
  bestMoveSan: string | null; // only set when NOT suppressed
  why: string | null;       // board-factual reason computed on the review page
  opponent: string;
  atEnd: boolean;
};

let current: ReviewChatContext | null = null;

export function publishReviewChatContext(ctx: ReviewChatContext): void {
  current = ctx;
}
export function clearReviewChatContext(): void {
  current = null;
}
export function getReviewChatContext(): ReviewChatContext | null {
  return current;
}

/** Answer a message from the current review context, or null when the message
 *  is outside the bounded move-help intents (caller falls through to the
 *  normal chat path). Never calls the network. */
export function reviewMoveHelp(message: string, ctx: ReviewChatContext): string | null {
  if (ctx.practice) return 'You are on the practice board now. Tap a piece and its destination to try the move; the board will check it. I will not grade a position you have not played yet.';
  const m = message.toLowerCase();
  const where = ctx.plyNumber === 0
    ? `the starting position of your game vs ${ctx.opponent}`
    : `move ${Math.ceil(ctx.plyNumber / 2)} of your game vs ${ctx.opponent}${ctx.san ? ` (${ctx.san})` : ''}`;

  const asksBest = /best move|should (i|i've|i have) (have )?play|what (move )?(was|is|would be) better|what (should|could) i (have )?(play|do)|what instead|right move/.test(m);
  const asksWhy = /why|what.*(wrong|bad)|how (was|is) that (bad|a mistake|a blunder)/.test(m) && /(bad|blunder|mistake|inaccuracy|wrong|why)/.test(m);
  const asksGrade = /grade|how (was|is|did) (that|this|the|my) move|how did i do|good move/.test(m);
  const asksWhere = /where are we|what happened|whose (move|turn)|what move (is this|are we on)|which move/.test(m);

  if (asksBest) {
    if (ctx.suppressed) return `The engine read is shaky at this exact position, so I won't name a best move from it. Step a move or two either way and the picture is usually clearer.`;
    if (ctx.bestMoveSan) return `For the move just reviewed (${ctx.san}), the stored engine pick was ${ctx.bestMoveSan}. This is about that move, not a new search of the current board.`;
    return `There's no engine pick stored for this position.`;
  }
  if (asksWhy) {
    if (ctx.why) return ctx.why;
    if (ctx.suppressed) return `Honestly? The engine read here is unreliable, so I can't give you a trustworthy reason for this one.`;
    if (ctx.gradeLabel && ctx.bestMoveSan) return `That graded ${ctx.gradeLabel} - the engine preferred ${ctx.bestMoveSan}.`;
    if (ctx.gradeLabel) return `That graded ${ctx.gradeLabel}.`;
    return `I don't have a stored read on that move.`;
  }
  if (asksGrade) {
    if (ctx.suppressed) return `The engine read is shaky at this position, so there's no grade I'd trust here.`;
    if (ctx.gradeLabel) return `At ${where}, that move graded ${ctx.gradeLabel}.`;
    return `No grade is stored for this position.`;
  }
  if (asksWhere) {
    return `You're at ${where} - ${ctx.plyNumber} of ${ctx.totalPlies} plies in. ${ctx.atEnd ? 'That is the final position.' : 'Keep stepping through, or hit play to run the rest.'} ${ctx.atEnd ? '' : `${ctx.fen.split(' ')[1] === 'w' ? 'White' : 'Black'} to move.`}`;
  }
  return null;
}
