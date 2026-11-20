'use client';
// CineSync v2.0 global token state: one app-wide store for both banks so every screen (HUD, economy bar, wild cards) reads the same
// numbers and the last known balance survives route changes and reloads while the room state is still loading. The server room state
// stays the source of truth: setTokens is called with every authoritative update.
import { useSyncExternalStore } from 'react';
export type Bank = { code: string; A: number; B: number } | null;
let cur: Bank = null; const subs = new Set<() => void>();
const key = (c: string) => 'cs-tokens-' + c;
export function setTokens(code: string, p: { A: number; B: number }) {
  if (cur && cur.code === code && cur.A === p.A && cur.B === p.B) return;
  cur = { code, A: p.A, B: p.B }; try { sessionStorage.setItem(key(code), JSON.stringify(cur)); } catch { /* private mode */ }
  subs.forEach((f) => f());
}
const snap = (): Bank => cur;
export function useTokens(code: string): Bank {
  const b = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, snap, () => null);
  if (b && b.code === code) return b;
  try { const raw = sessionStorage.getItem(key(code)); if (raw) { const v = JSON.parse(raw) as Bank; if (v && v.code === code) return v; } } catch { /* ignore */ }
  return null;
}
