"use client";

import { useCallback, useEffect, useState } from "react";
import { BUILD_SHA } from "@/lib/build-info";

// Watches /api/build and shows a tap-to-refresh pill when this tab's bundle is
// older than the latest deploy. Never auto-reloads - a mid-game screen is only
// ever replaced by an explicit tap.
export default function BuildWatcher() {
  const [stale, setStale] = useState(false);

  const check = useCallback(async () => {
    if (!BUILD_SHA || BUILD_SHA === "dev") return;
    try {
      const res = await fetch("/api/build", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { sha?: string };
      if (data.sha && data.sha !== "dev" && data.sha !== BUILD_SHA) setStale(true);
    } catch {
      // Offline or transient failure - stay quiet, try again on next foreground.
    }
  }, []);

  useEffect(() => {
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, [check]);

  if (!stale) return null;

  return (
    <button
      type="button"
      className="build-watcher-pill"
      onClick={() => window.location.reload()}
      aria-label="A new version of Chess Town is available. Tap to refresh."
    >
      NEW VERSION - TAP TO REFRESH
    </button>
  );
}
