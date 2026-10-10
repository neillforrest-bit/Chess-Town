'use client';
import { useEffect } from 'react';
import { paletteOf, themeOf, type MoodTheme } from '@/lib/meta';

/** PRD s5: wash the body canvas in the focus film's poster colours, apply a genre theme (noir/soft) and a game-mode skin. Writes CSS variables + data attributes on <body>. */
export function useMood(o: { poster?: string | null; genres?: string[]; gm?: string | null }) {
  const th: MoodTheme = themeOf(o.genres);
  useEffect(() => {
    const b = document.body; let live = true;
    if (th) b.dataset.theme = th; else delete b.dataset.theme;
    if (o.gm) b.dataset.gm = o.gm; else delete b.dataset.gm;
    if (o.poster) paletteOf(o.poster).then((p) => { if (!live || !p) return; b.style.setProperty('--ma', p[0] + 'cc'); b.style.setProperty('--mb', p[1] + '99'); b.dataset.wash = '1'; });
    else { b.style.removeProperty('--ma'); b.style.removeProperty('--mb'); delete b.dataset.wash; }
    return () => { live = false; };
  }, [o.poster, th, o.gm]);
  useEffect(() => () => { const b = document.body; delete b.dataset.theme; delete b.dataset.gm; delete b.dataset.wash; b.style.removeProperty('--ma'); b.style.removeProperty('--mb'); }, []);
}
