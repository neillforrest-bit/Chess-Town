// THE OPENING ARMORY + BLUEPRINT (Battle PRD section 2, his 01:46-01:49 paste).
// Guided openings for Play Chester: a blueprint of user moves, each with a
// Chester-voiced WHY line, his exact handoff + abort lines, zero AI spend.
// FLAGGED (paste cut off): tier-to-opening mapping for 2/3, Trompowsky step 1
// expectedOpponentSAN, Italian/Halloween sequences = standard theory.
export type ArmoryStep = { san: string; expectedOpponentSAN: string; why: string };
export type ArmoryOpening = {
  id: string; tier: string; color: string; colorNum: number; name: string; blurb: string;
  steps: ArmoryStep[]; handoff: string; abortFoe: string; abortUser: string;
};
const ABORT_FOE = 'They broke the script! Blueprint aborted. Play chess!';   // his exact line
const ABORT_USER = 'Off script - blueprint aborted. Play chess!';            // flagged: his spec covers opponent only
const HANDOFF = "Blueprint complete. You're on your own now.";               // his exact line
export const ARMORY: ArmoryOpening[] = [
  {
    id: 'italian', tier: 'THE FUNDAMENTALS', color: '#3b82f6', colorNum: 0x3b82f6, name: 'Italian Game',
    blurb: 'Centuries old, still lethal. Centre, knights, then the bishop that wins games on its own.',
    steps: [
      { san: 'e4', expectedOpponentSAN: 'any', why: 'Claim the centre with the king pawn. Every door in the position opens from here.' },
      { san: 'Nf3', expectedOpponentSAN: 'any', why: 'Knight out, attacking his centre pawn. Development with a threat is free tempo.' },
      { san: 'Bc4', expectedOpponentSAN: 'any', why: 'Bishop to its best diagonal, aiming at the soft square in front of his king. This is the Italian - three moves, a full plan.' },
    ],
    handoff: HANDOFF, abortFoe: ABORT_FOE, abortUser: ABORT_USER,
  },
  {
    id: 'trompowsky', tier: 'THE DISRUPTOR', color: '#f59e0b', colorNum: 0xf59e0b, name: 'Trompowsky Attack',
    blurb: 'Skip the theory war. Drag him out of his preparation on move two and fight on your ground.',
    steps: [
      { san: 'd4', expectedOpponentSAN: 'any', why: 'Queen pawn centre. Solid, flexible, and it asks him the first question.' },
      { san: 'Bg5', expectedOpponentSAN: 'any', why: 'Bishop out immediately, pinning his knight before it settles. This is the Trompowsky - his preparation is now worthless.' },
    ],
    handoff: HANDOFF, abortFoe: ABORT_FOE, abortUser: ABORT_USER,
  },
  {
    id: 'halloween', tier: 'THE AMBUSH', color: '#dc2626', colorNum: 0xdc2626, name: 'Halloween Gambit',
    blurb: 'Sacrifice a knight on move four for a rampaging pawn centre. Unsound. Terrifying. Fun.',
    steps: [
      { san: 'e4', expectedOpponentSAN: 'any', why: 'King pawn first - this gambit only works from an open game.' },
      { san: 'Nf3', expectedOpponentSAN: 'any', why: 'Knight out, attacking his centre pawn. Nothing suspicious yet. Nothing at all.' },
      { san: 'Nc3', expectedOpponentSAN: 'any', why: 'Second knight into the Four Knights. He thinks this is a quiet dinner. It is not.' },
      { san: 'Nxe5', expectedOpponentSAN: 'any', why: 'THE HALLOWEEN. Sacrifice the knight! His pieces must now flee while your pawns stampede. Absolute chaos - exactly as planned.' },
    ],
    handoff: HANDOFF, abortFoe: ABORT_FOE, abortUser: ABORT_USER,
  },
];
