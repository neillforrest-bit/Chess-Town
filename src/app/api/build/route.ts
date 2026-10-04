import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export function GET() {
  return NextResponse.json({ app: 'cinesync', batch: 1, sha: (process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || 'dev').slice(0, 7) }, { headers: { 'Cache-Control': 'no-store' } });
}
