// One model for every Gemini call. Change it here; src/actions/qaActions.ts prices by this name.
import { ThinkingLevel } from '@google/genai';
export const GEMINI_MODEL = 'gemini-3.8-flash';
// 3.8 Flash does not accept a zero thinking budget ("minimal" errors), so thinking runs at LOW.
// Thinking tokens bill as output and count toward maxOutputTokens: keep caps generous.
export const GEMINI_THINKING = { thinkingLevel: ThinkingLevel.LOW };
