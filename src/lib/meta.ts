import type { Movie } from './game';
import { oscarWins, totalWins } from './game';

/** PRD section 3 schema: rtScore, awards, genreMatrix. Catalogue values (OMDb-sourced at build time) are the working fallback; /api/omdb overrides them live when OMDB_API_KEY exists. */
export type Meta = { rtScore: number | null; awards: string; genreMatrix: string[]; src: 'catalogue' | 'omdb' };
const KW: [RegExp, string][] = [[/psycholog/, 'Psychological'], [/slasher/, 'Slasher'], [/serial killer/, 'Serial-Killer'], [/haunted|ghost|supernatural/, 'Supernatural'], [/dystopi|post-apocal/, 'Dystopian'], [/heist|robbery/, 'Heist'], [/coming of age/, 'Coming-of-Age'], [/based on true|true story|biograph/, 'True Story'], [/space|alien/, 'Space'], [/superhero/, 'Superhero'], [/musical/, 'Musical'], [/revenge/, 'Revenge'], [/romantic comedy|rom-com/, 'Rom-Com'], [/neo-noir|film noir/, 'Neo-Noir']];
export function metaOf(m: Movie): Meta {
  const mx: string[] = []; const kws = (m.kw || []).join(' | ').toLowerCase();
  for (const [re, n] of KW) if (re.test(kws)) { const base = m.g.find((g) => /Thriller|Horror|Drama|Comedy|Crime|Mystery|Science Fiction|Romance/.test(g)); mx.push(base && !n.includes(base) && /Psychological|Slasher|Serial|Supernatural|Neo-Noir|Heist|Revenge/.test(n) ? `${n} ${base}` : n); }
  return { rtScore: m.rt ?? null, awards: m.aw || '', genreMatrix: Array.from(new Set([...mx.slice(0, 2), ...m.g])).slice(0, 5), src: 'catalogue' };
}
export const awardTag = (m: Movie): string => { const o = oscarWins(m); if (o) return `${o} Oscar${o > 1 ? 's' : ''}`; const w = totalWins(m); return w ? `${w} wins` : ''; };
export type MoodTheme = 'noir' | 'soft' | null;
export const themeOf = (g: string[] = []): MoodTheme => (g.some((x) => /Thriller|Horror|Mystery/.test(x)) ? 'noir' : g.some((x) => /Romance|Drama/.test(x)) ? 'soft' : null);

const cache = new Map<string, [string, string]>();
/** Dominant colours from a poster via a 16x24 canvas bucket count. Falls back to null if CORS taints the canvas. */
export function paletteOf(path: string): Promise<[string, string] | null> {
  const hit = cache.get(path); if (hit) return Promise.resolve(hit);
  return new Promise((res) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => { try {
      const c = document.createElement('canvas'); c.width = 16; c.height = 24; const x = c.getContext('2d')!; x.drawImage(im, 0, 0, 16, 24); const d = x.getImageData(0, 0, 16, 24).data;
      const b: Record<string, { n: number; r: number; g: number; b: number }> = {};
      for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], bl = d[i + 2]; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); if (mx < 40 || (mx > 235 && mn > 220)) continue; const k = (r >> 6) + '-' + (g >> 6) + '-' + (bl >> 6); const e = b[k] || (b[k] = { n: 0, r: 0, g: 0, b: 0 }); e.n += 1 + (mx - mn) / 128; e.r += r; e.g += g; e.b += bl; }
      const top = Object.values(b).sort((p, q) => q.n - p.n); if (!top.length) return res(null);
      const col = (e: { n: number; r: number; g: number; b: number }, N: number) => '#' + [e.r, e.g, e.b].map((v) => Math.min(255, Math.round(v / N)).toString(16).padStart(2, '0')).join('');
      // true pixel counts per bucket for averaging
      const cntB: Record<string, number> = {};
      for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], bl = d[i + 2]; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); if (mx < 40 || (mx > 235 && mn > 220)) continue; const k = (r >> 6) + '-' + (g >> 6) + '-' + (bl >> 6); cntB[k] = (cntB[k] || 0) + 1; }
      const keyed = Object.entries(b).sort((p, q) => q[1].n - p[1].n);
      const c1 = col(keyed[0][1], cntB[keyed[0][0]]); const c2 = keyed[1] ? col(keyed[1][1], cntB[keyed[1][0]]) : c1;
      const out: [string, string] = [c1, c2]; cache.set(path, out); res(out);
    } catch { res(null); } };
    im.onerror = () => res(null); im.src = `https://image.tmdb.org/t/p/w92${path}`;
  });
}
