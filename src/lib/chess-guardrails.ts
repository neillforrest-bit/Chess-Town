// BUILD 128: house rules appended to every Gemini prompt that evaluates or coaches a move
// (Red Freeze / blunder evaluations, live commentary, chat, reports). Single source of truth.
export const CHESS_GUARDRAILS = `

CRITICAL CHESS RULES (never break these):
- Never describe sacrificing the King. The King cannot be captured or sacrificed. Only pawns, minor pieces, major pieces, or tempi/squares can be sacrificed.
NOTATION FORMAT:
- When referencing a move, write the plain-language description first, then the standard algebraic notation in brackets. Always give both, for example "Knight to the Kingside (Nf6)" or "Queen to the Kingside with check (Qh5+)". This replaces the earlier no-notation rule.`;
