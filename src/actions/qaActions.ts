'use server';
// QA "Hallucination Flag": logs the board state, Stockfish loss and Gemini's words to Supabase qa_logs,
// with token usage and an estimated cost. Re-validates the session server-side; never trusts a client id.
import { createClient } from '@/utils/supabase/server';
import { GEMINI_MODEL } from '@/lib/gemini-model';

// USD per 1M tokens, Standard paid tier (https://ai.google.dev/gemini-api/docs/pricing, checked Oct 2026).
// gemini-3.8-flash is promo pricing through 2026-12-31 (1.50 / 7.50 from 2027-01-01).
const RATES: Record<string, { input: number; output: number }> = {
  'gemini-3.5-flash': { input: 1.5, output: 9.0 },
  'gemini-3.8-flash': { input: 0.75, output: 3.75 },
};
const RATES_3_8_FROM_2027 = { input: 1.5, output: 7.5 };
const rateFor = (model: string) => (model === 'gemini-3.8-flash' && Date.now() >= Date.UTC(2027, 0, 1) ? RATES_3_8_FROM_2027 : RATES[model]);
const DEFAULT_MODEL = GEMINI_MODEL; // the model the app actually calls

export type QualityFlagPayload = {
  match_id?: string;
  move_number?: number | null;
  current_fen: string;
  stockfish_cpl?: number | null;
  tactic_flagged?: string;
  gemini_output?: string;
  model?: string;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } | null;
};
export type QualityFlagResult = { ok: true; id: string; estimated_cost_usd: number } | { ok: false; error: string };

export async function logQualityFlag(payload: QualityFlagPayload): Promise<QualityFlagResult> {
  const fen = typeof payload?.current_fen === 'string' ? payload.current_fen.trim() : '';
  if (!fen || fen.length > 120) return { ok: false, error: 'Invalid FEN.' };
  const int = (v: unknown) => (Number.isFinite(Number(v)) && v !== null && v !== undefined ? Math.round(Number(v)) : null);
  const input_tokens = Math.max(0, int(payload.usageMetadata?.promptTokenCount) ?? 0);
  const output_tokens = Math.max(0, int(payload.usageMetadata?.candidatesTokenCount) ?? 0);
  const model = payload.model && RATES[payload.model] ? payload.model : DEFAULT_MODEL;
  const rate = rateFor(model);
  const cost = ((input_tokens / 1000000) * rate.input) + ((output_tokens / 1000000) * rate.output);

  let supabase;
  try { supabase = await createClient(); } catch (e) { return { ok: false, error: (e as Error).message }; }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: 'Sign in to flag a reply.' };

  const { data, error } = await supabase.from('qa_logs').insert({
    player_id: user.id,
    match_id: (payload.match_id ?? '').slice(0, 80) || null,
    move_number: int(payload.move_number),
    current_fen: fen,
    stockfish_cpl: int(payload.stockfish_cpl),
    tactic_flagged: (payload.tactic_flagged ?? '').slice(0, 300) || null,
    gemini_output: (payload.gemini_output ?? '').slice(0, 4000) || null,
    model,
    input_tokens,
    output_tokens,
    estimated_cost_usd: cost,
  }).select('id').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id as string, estimated_cost_usd: cost };
}
