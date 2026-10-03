// Magic-link landing: swaps the one-time code for a session cookie, then returns to the sign-in page.
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/sign-in?welcome=1`);
    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent('That link has expired or was opened in a different browser. Ask for a new one here.')}`);
  }
  return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent('That link was missing its code. Ask for a new one here.')}`);
}
