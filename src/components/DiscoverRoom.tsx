'use client';
import { useEffect, useMemo, useState } from 'react';
import { MOVIES, registerExtra, poster as posterUrl, type Movie } from '@/lib/game';
import { Confetti } from '@/components/shared';

type FM = Movie & { ol?: string };
type Watch = { ok: boolean; region: string; stream: string[]; free: string[]; rent: string[]; buy: string[] } | null;
type Phase = 'setup' | 'shelf' | 'shortlist' | 'final' | 'done';

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance', 'Sci-fi', 'Fantasy', 'Animation', 'Crime', 'Mystery', 'War', 'Documentary'];
const GID_OF: Record<string, string> = { 'Sci-fi': 'Science Fiction' };
const DOC_SHELVES: { id: string; n: string }[] = [
  { id: 'docs_tc', n: 'TRUE CRIME' }, { id: 'docs_crazy', n: 'CRAZY STORIES' }, { id: 'docs_power', n: 'MONEY & POWER' },
  { id: 'docs_nature', n: 'NATURE & SCIENCE' }, { id: 'docs_music', n: 'MUSIC & CULTURE' }, { id: 'docs', n: 'ALL DOCS' },
];
const SHELF_KW: Record<string, RegExp> = {
  docs_tc: /murder|kill|crime|criminal|prison|heist|fraud|scam|trial|police|detective|victim|disappear|kidnap|con artist|serial|mafia|cartel|investigat|convict|cult/i,
  docs_power: /war|politic|econom|money|power|corrupt|government|president|finance|capital|society|history/i,
  docs_nature: /nature|animal|planet|ocean|space|science|wildlife|earth|climate|mountain/i,
  docs_music: /music|band|singer|concert|jazz|rock|hip-hop|rap|soul|album|artist/i,
  docs_crazy: /cult|insane|bizarre|scandal|conspir|wild|strange|obsess|hoax|eccentric/i,
};

/** Orson's curator line, rule-based from metadata only. Zero AI. */
function why(m: FM): string {
  const bits: string[] = [];
  if (m.ol && m.ol !== 'en') bits.push({ ja: 'Japanese', fr: 'French', ko: 'Korean', es: 'Spanish', it: 'Italian', de: 'German', sv: 'Swedish', da: 'Danish', no: 'Norwegian', zh: 'Chinese', hi: 'Hindi', fa: 'Persian', tr: 'Turkish', pl: 'Polish', pt: 'Portuguese', ru: 'Russian', th: 'Thai' }[m.ol] || m.ol.toUpperCase());
  if (m.pop < 150) return `${m.r.toFixed(1)} from ${m.pop} votes${bits.length ? ', ' + bits[0] : ''}. Nobody saw it. Everybody who did loved it.`;
  if (m.y < 1985) return `${m.y}${bits.length ? ', ' + bits[0] : ''}, rated ${m.r.toFixed(1)}. The archives do not miss.`;
  if (m.y < 2000) return `${m.y}, ${m.r.toFixed(1)}. Older than your algorithm, better than your feed.`;
  if (bits.length) return `${bits[0]}, ${m.y}, ${m.r.toFixed(1)}. This is why I keep the archives.`;
  if (m.r >= 8) return `${m.r.toFixed(1)}. ${m.g[0]}. Buried at the back of the shelf, where I keep the good stuff.`;
  return `${m.g[0]}, ${m.y}, ${m.r.toFixed(1)}. You would never have typed this into a search bar. That is the point.`;
}
const obscurity = (m: FM) => m.r * 10 - Math.log10(Math.max(10, m.pop)) * 12;

export default function DiscoverRoom() {
  const [name, setName] = useState('');
  useEffect(() => { setName(localStorage.getItem('cs-name') || ''); }, []);
  const [phase, setPhase] = useState<Phase>('setup');
  const [genres, setGenres] = useState<string[]>([]);
  const [shelf, setShelf] = useState<FM[]>([]);
  const [si, setSi] = useState(0);
  const [kept, setKept] = useState<FM[]>([]);
  const [wilds, setWilds] = useState<FM[]>([]);
  const [finalists, setFinalists] = useState<number[]>([]);
  const [winner, setWinner] = useState<FM | null>(null);
  const [watch, setWatch] = useState<Watch>(null);
  const [loading, setLoading] = useState(false);
  const [line, setLine] = useState('Pick a genre. I will find the ones you would never have thought of.');
  const docShelf = genres.includes('Documentary') ? genres.find((g) => g.startsWith('docs')) : undefined;

  const build = async () => {
    if (!genres.length) return;
    setLoading(true);
    const seed = Date.now();
    const pool: FM[] = []; const seen = new Set<number>();
    // catalogue deep cuts: well-rated, low-profile
    const docMode = genres.includes('Documentary');
    const cats = docShelf && docShelf !== 'docs' ? [docShelf] : [];
    const inShelf = (m: FM) => !cats.length || cats.some((c) => (m.kw || []).includes('doccat:' + c.slice(5)));
    const cl = MOVIES.filter((m) => (docMode ? m.g.includes('Documentary') && inShelf(m as FM) : genres.some((g) => m.g.includes(GID_OF[g] || g))) && m.r >= 7 && m.pop >= 100 && m.y >= 1960) as FM[];
    cl.sort((a, b) => obscurity(b) - obscurity(a));
    for (const m of cl.slice(0, 7)) { if (!seen.has(m.id)) { seen.add(m.id); pool.push(m); } }
    // TMDB deep fetch: low floors, foreign allowed, 1960+
    const gids = docMode ? ['Documentary'] : genres.filter((g) => !g.startsWith('docs')).map((g) => GID_OF[g] || g);
    try {
      const r = await fetch('/api/discover', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'deep', cons: { ig: gids, xg: [], rt: 'any', era: 'any' }, sl: [50, 50, 50], seed, n: 40 }) });
      const d = (await r.json()) as { movies?: FM[] };
      let fresh = (d.movies || []).filter((m) => m && m.id && m.p && m.r >= 6.9 && m.pop >= 100 && !seen.has(m.id));
      if (docMode) { const re = cats.length ? SHELF_KW[cats[0]] : null; fresh = fresh.filter((m) => m.g.includes('Documentary') && (!re || re.test(m.t + ' ' + m.o))); }
      fresh.sort((a, b) => obscurity(b) - obscurity(a));
      registerExtra(fresh);
      for (const m of fresh.slice(0, 7)) { seen.add(m.id); pool.push(m); }
    } catch { /* catalogue-only is still a full shelf */ }
    // interleave so neither source clumps, cap 12
    const mix = pool.slice(0, 12);
    setShelf(mix); setSi(0); setKept([]); setFinalists([]); setWinner(null); setWatch(null);
    setLoading(false);
    if (mix.length < 6) { setLine(`Only ${mix.length} on this shelf. Narrow genre, narrow shelf. Try another, or take these.`); }
    else setLine(`Twelve films. Keep up to six. I have opinions about all of them.`);
    setPhase('shelf');
  };

  const swipe = (yes: boolean) => {
    const m = shelf[si]; if (!m) return;
    const nk = yes ? [...kept, m] : kept;
    setKept(nk);
    if (nk.length >= 6 || si + 1 >= shelf.length) {
      const rest = shelf.filter((x) => !nk.some((k) => k.id === x.id)).sort((a, b) => obscurity(b) - obscurity(a));
      setWilds(rest.slice(0, 2));
      setLine(nk.length ? `You kept ${nk.length}. I am adding two of mine. Choose three finalists.` : 'You kept nothing. Brave. Then my two wildcards pick the final three by default.');
      setPhase('shortlist');
    } else setSi(si + 1);
  };

  const toggleFinal = (id: number) => {
    setFinalists((f) => f.includes(id) ? f.filter((x) => x !== id) : f.length >= 3 ? f : [...f, id]);
  };

  const toFinal = () => { if (finalists.length !== 3) return; setLine('Three stand. One gets tonight. Read the cards, then point.'); setPhase('final'); };

  const crown = async (m: FM) => {
    setWinner(m); setPhase('done');
    setLine(`Tonight's discovery: ${m.t}. ${why(m)}`);
    try { const r = await fetch('/api/watch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: m.id }) }); setWatch(await r.json()); } catch { setWatch(null); }
  };

  const cards: FM[] = useMemo(() => {
    if (phase === 'shortlist') return [...kept, ...wilds];
    if (phase === 'final' || phase === 'done') return finalists.map((id) => [...kept, ...wilds].find((m) => m.id === id)).filter(Boolean) as FM[];
    return [];
  }, [phase, kept, wilds, finalists]);

  const cur = shelf[si];
  const head = <div className="cs-solohead"><span>CINE<b>SYNC</b> DISCOVERY</span><span>{phase === 'setup' ? 'DEEP CUTS' : (genres.filter((g) => !g.startsWith('docs')).join(' + ') || DOC_SHELVES.find((x) => x.id === docShelf)?.n || 'DOCS').toUpperCase()}</span></div>;
  const bar = <p className="cs-solo-orson"><em>ORSON</em> {line}</p>;
  return (
    <main className="cs-play">{head}{bar}<section className="cs-body">

      {phase === 'setup' && (
        <section className="cs-ask">
          <div className="cs-orson">WHAT ARE WE DIGGING IN?</div>
          <div className="cs-dgenres">
            {GENRES.map((g) => (
              <button key={g} className={'cs-chip' + (genres.includes(g) ? ' is-on' : '')} onClick={() => setGenres((x) => {
                if (g === 'Documentary') return x.includes(g) ? [] : ['Documentary'];
                const base = x.filter((y) => y !== 'Documentary' && !y.startsWith('docs'));
                return x.includes(g) ? base.filter((y) => y !== g) : [...base, g].slice(-3);
              })}>{g}</button>
            ))}
          </div>
          {genres.includes('Documentary') && (
            <div className="cs-dgenres">
              {DOC_SHELVES.map((s) => (
                <button key={s.id} className={'cs-chip' + (genres.includes(s.id) ? ' is-on' : '')} onClick={() => setGenres((x) => ['Documentary', s.id])}>{s.n}</button>
              ))}
            </div>
          )}
          <p className="cs-small">Deep cuts only: low hype, high score, any country, any year since 1960. Nothing here trends.</p>
          <button className="cs-btn cs-btn--gold" disabled={!genres.length || loading} onClick={build}>{loading ? 'DIGGING IN THE ARCHIVES...' : 'DEAL THE SHELF'}</button>
        </section>
      )}

      {phase === 'shelf' && cur && (
        <section className="cs-ask">
          <div className="cs-orson">THE SHELF · {si + 1}/{shelf.length} · KEPT {kept.length}/6</div>
          <div className="cs-dcard">
            <img className="cs-poster" src={posterUrl(cur, 'w342')} alt={cur.t} draggable={false} />
            <b>{cur.t}</b><small>{cur.y} · {cur.g.slice(0, 3).join(' / ')}{cur.ol && cur.ol !== 'en' ? ' · ' + cur.ol.toUpperCase() : ''}</small>
            <div className="cs-scores"><span>TMDB {cur.r.toFixed(1)}</span><span>{cur.pop.toLocaleString()} votes</span></div>
            <p className="cs-dwhy">{why(cur)}</p>
            <p className="cs-dsyn">{cur.o}</p>
          </div>
          <div className="cs-row"><button className="cs-btn" onClick={() => swipe(false)}>PASS</button><button className="cs-btn cs-btn--gold" onClick={() => swipe(true)}>KEEP</button></div>
        </section>
      )}

      {(phase === 'shortlist' || phase === 'final') && (
        <section className="cs-ask">
          <div className="cs-orson">{phase === 'shortlist' ? `THE SHORTLIST · PICK ${finalists.length}/3` : 'THE ONE'}</div>
          {cards.map((m) => (
            <button key={m.id} className={'cs-drow' + (finalists.includes(m.id) ? ' is-on' : '')} onClick={() => phase === 'shortlist' ? toggleFinal(m.id) : crown(m)}>
              <img className="cs-poster" src={posterUrl(m)} alt={m.t} draggable={false} />
              <span><b>{m.t}</b><small>{m.y} · TMDB {m.r.toFixed(1)} · {m.pop.toLocaleString()} votes{wilds.some((w) => w.id === m.id) ? ' · ORSON WILDCARD' : ''}</small>{phase === 'final' && <em>{m.o.slice(0, 220)}{m.o.length > 220 ? '...' : ''}</em>}<em>{why(m)}</em></span>
            </button>
          ))}
          {phase === 'shortlist' && <button className="cs-btn cs-btn--gold" disabled={finalists.length !== 3} onClick={toFinal}>FINAL THREE</button>}
        </section>
      )}

      {phase === 'done' && winner && (
        <section className="cs-ask">
          <Confetti />
          <div className="cs-orson">TONIGHT&apos;S DISCOVERY</div>
          <div className="cs-dcard">
            <img className="cs-poster" src={posterUrl(winner, 'w500')} alt={winner.t} draggable={false} />
            <b>{winner.t}</b><small>{winner.y} · {winner.g.slice(0, 3).join(' / ')} · TMDB {winner.r.toFixed(1)}</small>
          </div>
          {watch && watch.ok && (watch.stream.length || watch.rent.length || watch.buy.length) ? (
            <div className="cs-watch--box"><em>WHERE TO WATCH · {watch.region}</em>
              {!!watch.stream.length && <p><b>STREAM</b> {watch.stream.join(' · ')}</p>}
              {!!watch.rent.length && <p><b>RENT</b> {watch.rent.join(' · ')}</p>}
              {!!watch.buy.length && <p><b>BUY</b> {watch.buy.join(' · ')}</p>}
            </div>
          ) : <p className="cs-small">No GB streaming listing found. The archives are like that sometimes.</p>}
          <button className="cs-btn cs-btn--gold" onClick={() => { setPhase('setup'); setGenres([]); setLine('Again? Pick another shelf.'); }}>AGAIN</button>
        </section>
      )}
    </section></main>
  );
}
