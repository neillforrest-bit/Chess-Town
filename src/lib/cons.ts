// CineSync v2.0 gap-fill: strict calibration constraints, the validation layer, adaptive suppression, 10-pass pivot.
// Pure helpers (no imports from game.ts at runtime) so the reducer, the API route and tests can all share them.
export type RT = 'any' | 'u2';
export type ERA = 'any' | 'pre2000' | 'new';
/** Strict calibration. ig = must match one of these genres, xg = hard exclusion ("-genre:horror"), rt/era = hard limits. */
export type Cons = { rt: RT; era: ERA; ig: string[]; xg: string[]; eraClash?: boolean };
type M = { id: number; y: number; g: string[]; rn?: number; sr?: unknown };
export const CONS_GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Family', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Science Fiction', 'Thriller', 'War'] as const;
export const NEW_FROM = 2023;
export const newCons = (): Cons => ({ rt: 'any', era: 'any', ig: [], xg: [] });
export const consActive = (c?: Cons | null): boolean => !!c && (c.rt !== 'any' || c.era !== 'any' || c.ig.length > 0 || c.xg.length > 0);
const list = (a: unknown): string[] => (Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string' && (CONS_GENRES as readonly string[]).includes(x)) : []);
export function cleanCons(x: Partial<Cons> | null | undefined): Cons {
  const xg = list(x?.xg); const ig = list(x?.ig).filter((g) => !xg.includes(g));
  return { rt: x?.rt === 'u2' ? 'u2' : 'any', era: x?.era === 'pre2000' || x?.era === 'new' ? x.era : 'any', ig, xg };
}
/** Two players' toggles become one rule set. Exclusions and runtime limits are strict for both; an era clash (one wants pre-2000, one wants new) opens the era so nobody is silently overruled. */
export function mergeCons(a: Cons | null | undefined, b: Cons | null | undefined): Cons {
  const x = cleanCons(a), y = cleanCons(b); const xg = Array.from(new Set([...x.xg, ...y.xg]));
  const ig = Array.from(new Set([...x.ig, ...y.ig])).filter((g) => !xg.includes(g));
  const clash = x.era !== 'any' && y.era !== 'any' && x.era !== y.era;
  return { rt: x.rt === 'u2' || y.rt === 'u2' ? 'u2' : 'any', era: clash ? 'any' : x.era !== 'any' ? x.era : y.era, ig, xg, eraClash: clash || undefined };
}
/** Hard boolean test for one film. Unknown runtime fails a runtime limit (strict, never assume). */
export function consOk(m: M, c?: Cons | null): boolean {
  if (!c) return true;
  if (c.xg.length && m.g.some((g) => c.xg.includes(g))) return false;
  if (c.ig.length && !m.g.some((g) => c.ig.includes(g))) return false;
  if (c.era === 'pre2000' && !(m.y < 2000)) return false;
  if (c.era === 'new' && !(m.y >= NEW_FROM)) return false;
  if (c.rt === 'u2' && !m.sr && !(typeof m.rn === 'number' && m.rn > 0 && m.rn <= 120)) return false;
  return true;
}
/** The intermediary validation layer: nothing reaches the frontend unless it passes. Returns what passed plus how many were rejected. */
export function validateBatch<T extends M>(movies: T[], c?: Cons | null): { ok: T[]; rejected: number } {
  const ok = movies.filter((m) => consOk(m, c)); return { ok, rejected: movies.length - ok.length };
}
export const assertBatch = (movies: M[], c?: Cons | null): boolean => movies.every((m) => consOk(m, c));
export const consLabel = (c?: Cons | null): string[] => { if (!c) return []; const o: string[] = []; if (c.rt === 'u2') o.push('UNDER 2H'); if (c.era === 'pre2000') o.push('PRE-2000'); if (c.era === 'new') o.push('NEW RELEASES'); for (const g of c.ig) o.push('+' + g.toUpperCase()); for (const g of c.xg) o.push('NO ' + g.toUpperCase()); return o; };

// ---- adaptive suppression (3.1) ----
export const decadeOf = (y: number): number => Math.floor(y / 10) * 10;
export type Sup = { k: string; until: number };
export type Pass = { id: number; g: string[]; d: number };
/** The sub-genre key a film belongs to for suppression: "<genre>|<decade>". */
export const subKeys = (m: { g: string[]; y: number }): string[] => [...m.g.slice(0, 3).map((g) => `${g}|${decadeOf(m.y)}`), ...m.g.slice(0, 3).map((g) => `${g}|*`), `*|${decadeOf(m.y)}`];
/** If the last 3 consecutive passes all share one genre+decade ("90s action"), return that key. */
export function suppressKey(passes: Pass[]): string | null {
  if (passes.length < 3) return null; const last = passes.slice(-3);
  const common = last[0].g.slice(0, 3).filter((g) => last.every((p) => p.d === last[0].d && p.g.slice(0, 3).includes(g)));
  return common.length ? `${common[0]}|${last[0].d}` : null;
}
export const supHit = (m: { g: string[]; y: number }, sup: Sup[] | undefined, n: number): boolean => !!sup && sup.some((s) => s.until > n && subKeys(m).includes(s.k));
export const supLabel = (k: string): string => { const [g, d] = k.split('|'); const dn = d === '*' ? '' : Number(d) >= 2000 ? `${d}s ` : `${String(d).slice(2)}s `; return `${dn}${g === '*' ? 'films' : g}`.trim(); };

// ---- 10-pass pivot (3.2) ----
export const PIVOT_N = 10;
export const PIVOT_OPTS = ['Seen too many of these', 'Too heavy / serious', 'Need a different decade', 'Switch primary genre'] as const;
