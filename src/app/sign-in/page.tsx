'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type Db = { state: 'checking' | 'ok' | 'bad'; rows?: number; message?: string };

function SignInInner() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get('error'));
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<Db>({ state: 'checking' });
  const [configured, setConfigured] = useState(true);

  const checkDb = useCallback(async () => {
    setDb({ state: 'checking' });
    try {
      const supabase = createClient();
      const { count, error: e } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      if (e) setDb({ state: 'bad', message: e.message });
      else setDb({ state: 'ok', rows: count ?? 0 });
    } catch (e) { setDb({ state: 'bad', message: e instanceof Error ? e.message : 'Unknown error' }); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setUser(data.user ? { id: data.user.id, email: data.user.email } : null);
      } catch { if (!cancelled) setConfigured(false); }
      if (!cancelled) setReady(true);
      await checkDb();
    })();
    return () => { cancelled = true; };
  }, [checkDb]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (err) setError(err.message); else setSent(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); }
    setBusy(false);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null); setSent(false); await checkDb();
  }

  return <main className="signin-page"><section className="signin-card">
    <span className="signin-kicker">CHESS TOWN ACCOUNT</span>
    <h1>{user ? 'You are signed in' : 'Sign in'}</h1>
    {!ready ? <p className="signin-note">Checking your session…</p>
      : !configured ? <p className="signin-error">Sign-in is not configured on this build.</p>
      : user ? <>
        <p className="signin-note">Signed in as <b>{user.email}</b>. Your games and Chester dossier can now be saved to your account.</p>
        <button type="button" className="signin-btn signin-btn--ghost" onClick={signOut}>Sign out</button>
      </> : sent ? <p className="signin-note signin-note--ok">Link sent to <b>{email}</b>. Open it on this same device and browser to finish signing in.</p>
      : <form onSubmit={send}>
        <p className="signin-note">No password. We email you a one-time link.</p>
        <label className="signin-label" htmlFor="signin-email">Email</label>
        <input id="signin-email" className="signin-input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(ev) => setEmail(ev.target.value)} required />
        <button className="signin-btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
      </form>}
    {error && <p className="signin-error" role="alert">{error}</p>}
    <div className={`signin-db signin-db--${db.state}`}>
      <b>Database</b>
      <span>{db.state === 'checking' ? 'Checking…' : db.state === 'ok' ? `Connected. Profiles table answers (${db.rows} visible to you).` : `Problem: ${db.message}`}</span>
    </div>
    <Link className="signin-back" href="/">← Back to Chesterville</Link>
  </section></main>;
}

export default function SignInPage() { return <Suspense fallback={null}><SignInInner /></Suspense>; }
