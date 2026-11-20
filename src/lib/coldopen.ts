/** THE COLD OPEN (Movie Time V2, Act I): five Orson-hosted beats that derive the SAME intents the old
 *  sliders/swiper flow produced - sliders vector, three trope picks, taste tags/nos/actors. Pure functions;
 *  the UI component owns presentation, this module owns every mapping decision so it is probe-testable. */
import { BY_ID, TROPE_MATRIX, TROPE_NAMES, poolOf, seeded, type Movie } from './game';

export type Spectrum = { k: string; lo: string; hi: string; loTag?: string; hiTag?: string; loTrope: string; hiTrope: string; slider: (pos: number) => number[] };
/** Rotating nightly versus-slides. pos 0 = far left, 100 = far right. slider() contributes to [dark/light, indie/blockbuster, brainy/brain-off]. */
export const SPECTRA: Spectrum[] = [
  { k: 'tone', lo: 'COMEDY', hi: 'HORROR', loTag: 'Comedy', hiTag: 'Horror', loTrope: 'Feel-Good Comfort', hiTrope: 'Slow-Burn Dread', slider: (p) => [Math.round(88 - p * 0.76), 50, 50] },
  { k: 'scale', lo: 'INDIE GEM', hi: 'BLOCKBUSTER', loTag: 'Artsy', loTrope: 'Cult-Classic Weirdness', hiTrope: 'Gonzo Action Spectacle', slider: (p) => [50, Math.round(p), 50] },
  { k: 'pedigree', lo: 'AWARD SEASON', hi: 'GUILTY PLEASURE', loTag: 'Award winner', loTrope: 'Moral Dilemma', hiTrope: 'Brainless Action', slider: (p) => [50, Math.round(30 + p * 0.6), Math.round(25 + p * 0.6)] },
  { k: 'risk', lo: 'COMFORT BLANKET', hi: 'INTO THE UNKNOWN', loTrope: 'Found-Family Warmth', hiTrope: 'Mind-Bending Twists', slider: (p) => [Math.round(70 - p * 0.3), 50, Math.round(80 - p * 0.6)] },
];
/** Which spectrum Orson asks tonight: rotates per room code + night count. */
export const tonightSpectrum = (code: string, nights: number): Spectrum => SPECTRA[Math.floor(seeded(code, 'spectra' + (nights || 0))() * SPECTRA.length)];

export type TrophyPick = 'trophy' | 'trash' | 'both';
export const trophyTags = (t: TrophyPick | null): string[] => (t === 'trophy' ? ['Award winner'] : []);

/** Three poster cards for the swipe beat: high-rated, spread across genres, stable per room+night. */
export function swipeFilms(code: string, nights: number, kind: 'movie' | 'series' = 'movie', seen: number[] = []): number[] {
  const pool = poolOf(kind).filter((m) => !m.w && m.r >= 7.2 && m.p && !seen.includes(m.id));
  const sh = [...pool].sort((a, b) => (seeded(code, 'sw3' + (nights || 0) + a.id)() < 0.5 ? -1 : 1));
  const out: Movie[] = [];
  for (const m of sh) { if (out.length >= 3) break; if (out.every((o) => !o.g.some((g) => m.g.includes(g)))) out.push(m); }
  for (const m of sh) { if (out.length >= 3) break; if (!out.includes(m)) out.push(m); }
  return out.map((m) => m.id);
}
/** Right-swiped posters -> up to two trope picks whose taste tags overlap the liked genres most. */
export function swipeTropes(likedIds: number[]): string[] {
  const liked = new Set(likedIds.flatMap((id) => BY_ID[id]?.g || []));
  if (!liked.size) return [];
  return TROPE_MATRIX.map((t) => ({ n: t.n, hit: t.tastes.filter((x) => liked.has(x)).length }))
    .filter((x) => x.hit > 0).sort((a, b) => b.hit - a.hit || a.n.localeCompare(b.n)).slice(0, 2).map((x) => x.n);
}
/** Assemble exactly three valid trope picks: spectrum first, then swipes, then deterministic fill. */
export function tropePicks(code: string, spec: Spectrum, pos: number, likedIds: number[]): string[] {
  const first = pos <= 50 ? spec.loTrope : spec.hiTrope;
  const out = [first, ...swipeTropes(likedIds).filter((n) => n !== first)];
  for (const n of TROPE_NAMES) { if (out.length >= 3) break; if (!out.includes(n) && seeded(code, 'fill' + n)() < 0.3) out.push(n); }
  for (const n of TROPE_NAMES) { if (out.length >= 3) break; if (!out.includes(n)) out.push(n); }
  return out.slice(0, 3);
}
/** Taste tags: spectrum lean + trophy pick + right-swipe genres. */
export function tasteTags(spec: Spectrum, pos: number, trophy: TrophyPick | null, likedIds: number[]): string[] {
  const tags = new Set<string>();
  if (pos <= 35 && spec.loTag) tags.add(spec.loTag);
  if (pos >= 65 && spec.hiTag) tags.add(spec.hiTag);
  trophyTags(trophy).forEach((t) => tags.add(t));
  likedIds.flatMap((id) => BY_ID[id]?.g || []).forEach((g) => tags.add(g));
  return [...tags];
}
/** Orson's read-back monologue: one line, rule-based (zero spend), plays the night back to the players. */
export function orsonRead(opts: { actors: string[]; spec: Spectrum; pos: number; trophy: TrophyPick | null; likedIds: number[] }): string {
  const { actors, spec, pos, trophy, likedIds } = opts;
  const bits: string[] = [];
  const lean = pos <= 35 ? spec.lo.toLowerCase() : pos >= 65 ? spec.hi.toLowerCase() : 'somewhere in the middle';
  bits.push(`tonight leans ${lean}`);
  if (trophy === 'trophy') bits.push('with a veneer of prestige');
  if (trophy === 'trash') bits.push('and proudly zero prestige');
  if (likedIds.length) bits.push(`you swiped right on ${BY_ID[likedIds[0]]?.t || 'a poster'}`);
  const who = actors.length ? ` And ${actors.join(' and ')} had better clear their schedule.` : '';
  return `So: ${bits.join(', ')}.${who} Curtain up.`;
}
/** Searchable actor index from the bundled catalogue, most-cast first. */
export function actorIndex(): { name: string; n: number }[] {
  const count = new Map<string, number>();
  for (const m of Object.values(BY_ID)) for (const c of m.c || []) { const name = c.trim(); if (name.length > 2) count.set(name, (count.get(name) || 0) + 1); }
  return [...count.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}
export const searchActors = (idx: { name: string; n: number }[], q: string, take = 6): { name: string; n: number }[] => {
  const s = q.trim().toLowerCase(); if (s.length < 2) return [];
  return idx.filter((a) => a.name.toLowerCase().includes(s)).slice(0, take);
};
