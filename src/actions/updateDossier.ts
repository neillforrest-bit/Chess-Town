'use server';
// Red Freeze -> dossier. Inserts the leak, or bumps its frequency if this player already has it.
// The atomic increment lives in the database function public.bump_dossier (see the migration),
// because supabase-js .upsert() cannot express "frequency = frequency + 1".
import { createClient } from '@/utils/supabase/server';

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
