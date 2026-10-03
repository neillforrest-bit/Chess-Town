'use server';
// Chess-Town server actions: post-game save + Red Freeze dossier update.
// Both re-validate the session on the server with getUser() and never trust client-supplied ids.
import { createClient } from '@/utils/supabase/server';

export type SaveGameInput = { pgn: string; accuracy: number; effort_letter_grade: string; verdict_title: string };
export type SaveGameResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveGame(input: SaveGameInput): Promise<SaveGameResult> {
  const pgn = typeof input?.pgn === 'string' ? input.pgn.trim() : '';
  const accuracy = Number(input?.accuracy);
  const grade = typeof input?.effort_letter_grade === 'string' ? input.effort_letter_grade.trim().toUpperCase() : '';
  const verdict = typeof input?.verdict_title === 'string' ? input.verdict_title.trim() : '';
  if (!pgn || pgn.length > 20000) return { ok: false, error: 'Invalid PGN.' };
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) return { ok: false, error: 'Accuracy must be 0-100.' };
  if (!/^[A-F][+-]?$/.test(grade)) return { ok: false, error: 'Invalid letter grade.' };
  if (verdict.length > 80) return { ok: false, error: 'Verdict title too long.' };

  let supabase;
  try { supabase = await createClient(); } catch (e) { return { ok: false, error: (e as Error).message }; }
  // getUser() re-validates the session with Supabase; never trust the cookie alone on the server.
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase
    .from('games')
    .insert({ player_id: user.id, pgn, accuracy, effort_letter_grade: grade, verdict_title: verdict || null })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id as string };
}

// Red Freeze -> dossier. Inserts the leak, or bumps its frequency if this player already has it.
// The atomic increment lives in the database function public.bump_dossier (see the migration),
// because supabase-js .upsert() cannot express "frequency = frequency + 1".

export type UpdateDossierResult = { ok: true; frequency: number } | { ok: false; error: string };

export async function updateDossier(tactic_missed: string, move_number: number): Promise<UpdateDossierResult> {
  const tactic = typeof tactic_missed === 'string' ? tactic_missed.trim().toUpperCase() : '';
  const ply = Number(move_number);
  if (!tactic || tactic.length > 40) return { ok: false, error: 'Invalid tactic.' };
  if (!Number.isInteger(ply) || ply < 1 || ply > 1000) return { ok: false, error: 'Invalid move number.' };

  let supabase;
  try { supabase = await createClient(); } catch (e) { return { ok: false, error: (e as Error).message }; }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase.rpc('bump_dossier', { p_tactic: tactic, p_move_number: ply });
  if (error) return { ok: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, frequency: Number(row?.frequency ?? 1) };
}
