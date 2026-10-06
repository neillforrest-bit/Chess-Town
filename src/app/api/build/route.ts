import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
export async function GET() {
  // booleans only, never the key: lets us verify the service key is wired and the seen table is reachable with it
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; let seenTable: boolean | null = null;
  if (key) { try { const { error } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, key, { auth: { persistSession: false } }).from('cinesync_seen').select('couple').limit(1); seenTable = !error; } catch { seenTable = false; } }
  return NextResponse.json({ app: 'cinesync', batch: 1, sha: (process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || 'dev').slice(0, 7), svcKey: !!key, seenTable }, { headers: { 'Cache-Control': 'no-store' } });
}
