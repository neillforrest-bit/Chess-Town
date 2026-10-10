'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOVIES, poster, oscarWins, totalWins, type Movie } from '@/lib/game';
import { metaOf, awardTag, type Meta } from '@/lib/meta';
import { useMood } from './useMood';
import { isSpectacle } from '@/utils/sabotageEngine';

type Sort = 'genre' | 'rt' | 'awards' | 'imax';
const MODES: { id: string; n: string; t: string }[] = [{ id: '', n: 'CLASSIC', t: 'The usual' }, { id: 'oscar', n: 'OSCAR GAUNTLET', t: 'Awarded films only' }, { id: 'rotten', n: 'ROTTEN ROLL', t: 'Sub-60% RT only' }, { id: 'clash', n: 'GENRE CLASH', t: 'Two clashing genres' }];
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
const awScore = (m: Movie) => oscarWins(m) * 1000 + totalWins(m);

/** Lights-down transition: dim the interface and fade in a low hum before the room opens. */
export function useTheater() {
  const r = useRouter(); const [dark, setDark] = useState(false);
  const go = (path: string) => {
    setDark(true);
    try { if (localStorage.getItem('cs-mute') !== '1') { const A = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; const c = new A(); const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 82.5; g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(0.16, c.currentTime + 1.2); g.gain.linearRampToValueAtTime(0, c.currentTime + 2.4); o.connect(g); o2.connect(g); g.connect(c.destination); o.start(); o2.start(); o.stop(c.currentTime + 2.5); o2.stop(c.currentTime + 2.5); } } catch { /* no audio */ }
    setTimeout(() => r.push(path), 1500);
  };
  return { dark, go };
}

export default function Repository() {
  const [sort, setSort] = useState<Sort>('rt'); const [imaxNote, setImaxNote] = useState(false); const [q, setQ] = useState(''); const [focus, setFocus] = useState<Movie | null>(null); const [open, setOpen] = useState<Movie | null>(null);
  const [mode, setMode] = useState(''); const th = useTheater();
  const [live, setLive] = useState<Meta | null>(null);
  useMood({ poster: (open || focus)?.p, genres: (open || focus)?.g });
  const list = useMemo(() => {
    const f = MOVIES.filter((m) => !q || m.t.toLowerCase().includes(q.toLowerCase()));
    if (sort === 'rt') return [{ h: 'BY ROTTEN TOMATOES', ms: [...f].sort((a, b) => (b.rt ?? -1) - (a.rt ?? -1)) }];
    if (sort === 'imax') { const y = f.filter((m) => isSpectacle(m.id)).sort((a, b) => b.r - a.r), n = f.filter((m) => !isSpectacle(m.id)).sort((a, b) => b.r - a.r); return [{ h: 'IMAX-GRADE (PROXY)', ms: y }, { h: 'EVERYTHING ELSE', ms: n }]; }
    if (sort === 'awards') return [{ h: 'BY AWARDS WON', ms: [...f].sort((a, b) => awScore(b) - awScore(a)) }];
    const by: Record<string, Movie[]> = {}; for (const m of f) (by[m.g[0] || 'Other'] ||= []).push(m);
    return Object.keys(by).sort().map((g) => ({ h: g.toUpperCase(), ms: by[g].sort((a, b) => (b.rt ?? -1) - (a.rt ?? -1)) }));
  }, [sort, q]);
  useEffect(() => {
    setLive(null); if (!open?.im) return; let on = true;
    fetch('/api/omdb', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ imdb: open.im, full: 1 }) }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (on && j && (j.rt != null || j.awards)) setLive({ rtScore: j.rt ?? null, awards: j.awards || '', genreMatrix: j.genres?.length ? j.genres : metaOf(open).genreMatrix, src: 'omdb' }); }).catch(() => {});
    return () => { on = false; };
  }, [open]);
  const launch = (gm: string) => { const n = (localStorage.getItem('cs-name') || 'Player 1').trim(); const n2 = (localStorage.getItem('cs-p2') || 'Player 2').trim(); th.go(`/play/${makeCode()}?p=A&n=${encodeURIComponent(n)}&n2=${encodeURIComponent(n2)}${gm ? '&gm=' + gm : ''}`); };
  const mt = open ? (live || metaOf(open)) : null;
  return <div className={'cs-repo' + (th.dark ? ' is-dark' : '')}>
    <div className="cs-repo-bar">
      <div className="cs-repo-sort">{(['rt', 'genre', 'awards', 'imax'] as Sort[]).map((s) => <button key={s} className={sort === s ? 'is-on' : ''} onClick={() => { setSort(s); setImaxNote(s === 'imax'); }}>{s === 'rt' ? 'ROTTEN' : s === 'imax' ? 'IMAX*' : s.toUpperCase()}</button>)}</div>
      <input className="cs-repo-q" placeholder="Search films" value={q} onChange={(e) => setQ(e.target.value)} />
    </div>
    {imaxNote && <p className="cs-repo-note">IMAX* is a proxy: no IMAX Enhanced data in the catalogue, so this ranks modern big-screen spectacle films (2010+, 7.8+ rated).</p>}
    <div className="cs-repo-modes">{MODES.map((m) => <button key={m.id} className={mode === m.id ? 'is-on' : ''} onClick={() => setMode(m.id)}><b>{m.n}</b><i>{m.t}</i></button>)}<button className="cs-repo-go" onClick={() => launch(mode)}>LIGHTS DOWN · PLAY ▸</button></div>
    <div className="cs-repo-scroll">
      {list.map((sec) => <section key={sec.h}><h3 className="cs-repo-h">{sec.h} <i>{sec.ms.length}</i></h3>
        <div className="cs-repo-grid">{sec.ms.map((m) => <button key={m.id} className="cs-repo-card" onPointerEnter={() => setFocus(m)} onFocus={() => setFocus(m)} onClick={() => { setFocus(m); setOpen(m); }}>
          <span className="cs-repo-im"><img loading="lazy" alt="" src={poster(m, 'w185')} />
          <span className={'cs-repo-rt' + (m.rt != null && m.rt < 60 ? ' is-rot' : '')}>{m.rt != null ? m.rt + '%' : '--'}</span>
          {awardTag(m) && <span className="cs-repo-aw">🏆 {awardTag(m)}</span>}</span>
          <em>{m.t}</em></button>)}</div></section>)}
      {!list.some((s) => s.ms.length) && <p className="cs-small" style={{ padding: 24, textAlign: 'center' }}>Nothing matches.</p>}
    </div>
    {open && mt && <div className="cs-repo-sheet" onClick={() => setOpen(null)}><div onClick={(e) => e.stopPropagation()}>
      <img alt="" src={poster(open, 'w342')} /><div className="cs-repo-info">
        <h2>{open.t} <i>{open.y}</i></h2>
        <div className="cs-repo-facts"><span className={mt.rtScore != null && mt.rtScore < 60 ? 'is-rot' : ''}>🍅 {mt.rtScore != null ? mt.rtScore + '%' : 'n/a'}</span><span>★ {open.r.toFixed(1)}</span></div>
        <p className="cs-repo-awd">{mt.awards || 'No awards on record'}</p>
        <div className="cs-chips">{mt.genreMatrix.map((g) => <i key={g}>{g}</i>)}</div>
        <p className="cs-repo-plot">{open.o}</p>
        {isSpectacle(open.id) && <small className="cs-repo-src">IMAX-GRADE: proxy only (2010+, rated 7.8+, action/sci-fi/adventure/fantasy/war/animation). No IMAX Enhanced data exists in the catalogue.</small>}
        <small className="cs-repo-src">DATA: {mt.src === 'omdb' ? 'OMDb live' : 'catalogue (OMDb key not set)'}</small>
        <button className="cs-btn cs-btn--gold" onClick={() => setOpen(null)}>CLOSE</button></div></div></div>}
    {th.dark && <div className="cs-lights" aria-hidden><span>LIGHTS DOWN</span></div>}
  </div>;
}
