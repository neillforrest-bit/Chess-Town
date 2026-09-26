import { NextResponse } from "next/server";
import { BATCH } from "../../../lib/build-info";

export const dynamic = "force-dynamic";

// Tiny version beacon: the client compares this against its baked-in build sha
// to detect a stale tab and offer a refresh. No-store so it is never cached.
export function GET() {
  return NextResponse.json(
    {
      batch: BATCH,
      sha: (process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || "dev").slice(0, 7),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
