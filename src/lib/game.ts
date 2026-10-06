// CINESYNC game engine: a pure reducer. The host phone runs it; everyone else sends intents.
import { startHit, hitIntent, resolveHit, wagerIntent, triviaTap, bustIntent, bustDone, rerollVote, tick8, type Hit, type B8, type Reroll } from './b8';
import catalog from '@/data/catalog.json';
import seriesCat from '@/data/series.json';

export type PID = 'A' | 'B';
export type Mood = 'idle' | 'smug' | 'shock' | 'glee' | 'scheme' | 'sad';
export type Movie = { id: number; t: string; y: number; r: number; g: string[]; o: string; p: string; w: boolean; pop: number; c?: string[]; k?: string; rn?: number; tag?: string; im?: string; kw?: string[]; sr?: { s: number; e: number; st: string; net: string; last: number }; rt?: number | null; mc?: number | null; imdb?: number | null; aw?: string };
export type Kind = 'movie' | 'series';
export const MOVIES: Movie[] = (catalog as { movies: Movie[] }).movies.filter((m) => m.y >= 1990);
export const SERIES: Movie[] = (seriesCat as { shows: Movie[] }).shows;
export const poolOf = (k: Kind | undefined): Movie[] => (k === 'series' ? SERIES : MOVIES);
export const BY_ID: Record<number, Movie> = Object.fromEntries([...MOVIES, ...SERIES].map((m) => [m.id, m]));
export const poster = (m: Movie, size = 'w342') => `https://image.tmdb.org/t/p/${size}${m.p}`;

export const RESPONSE_GATE = 0.7;
export const CLASH = 5; // an axis gap this big fails the gate on its own
export const TASTES = ['Action', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance', 'Sci-fi', 'Fantasy', 'Animation', 'Crime', 'Mystery', 'War', 'Western', 'Musical', 'Superhero', 'Documentary', 'Sports', 'Real events', 'Pure fiction', 'Artsy', 'Award winner'] as const;
const GENRE_OF: Record<string, string> = { 'Sci-fi': 'Science Fiction', Musical: 'Music' };
export type Prof = { streak: number; g: Record<string, number>; c: Record<string, number>; ax: number[]; n: number; yes: number; notes: string[] };
export const newProf = (): Prof => ({ streak: 0, g: {}, c: {}, ax: [0, 0, 0, 0], n: 0, yes: 0, notes: [] });
export const PASS_WHY = ['Seen it', 'Too dark', 'Too light', 'Not my genre', 'Dislike the cast', 'Not in the mood', 'Too long'] as const;
export const YES_WHY = ['Love the genre', 'Great cast', 'Great reviews', 'Right mood', 'Havent seen it'] as const;
export const AXES = ['Pacing', 'Weight', 'Reality', 'Runtime'] as const;
export const TAP_MS = 10000;
export const PITCH_MS = 60000;
export const NEXT_MS = 2200;
export const DRAFT_SIZE = 10;
export const POOL_SIZE = 30;

// ---------- Phase 1: vibe questions (two sets, so a retry is a genuinely new conversation)
export type Question = { q: string; lo: string; hi: string };
// Four sliders per set (0-10): energy, darkness, fantasy-vs-real, scale. Last set is the lightning set.
export const QUESTION_SETS: Question[][] = [
  [
    { q: 'Tonight, how much focus can you spare?', lo: 'Scroll My Phone', hi: '100% Focus Required' },
    { q: 'What do you want the film to do to you?', lo: 'Make Me Laugh', hi: 'Keep Me Up At Night' },
    { q: 'Where should it take you?', lo: 'Real World', hi: 'Total Escapism' },
    { q: 'What kind of tension?', lo: 'Non-Stop Explosions', hi: 'Slow-Burn Tension' },
  ],
  [
    { q: 'Pillow-fort or full attention?', lo: 'Half-watch, half-snack', hi: 'Phones in the bin' },
    { q: 'Cosy or chilling?', lo: 'Blanket and a smile', hi: 'Lights on afterwards' },
    { q: 'Believable or bonkers?', lo: 'Could happen to us', hi: 'Could never happen' },
    { q: 'Sprint or marathon?', lo: 'Quick hit', hi: 'Slow-burn epic' },
  ],
  [
    { q: 'Popcorn or puzzle?', lo: 'Popcorn', hi: 'Puzzle' },
    { q: 'Giggles or goosebumps?', lo: 'Giggles', hi: 'Goosebumps' },
    { q: 'Based on fact or total fiction?', lo: 'Based on fact', hi: 'Total fiction' },
    { q: 'Short and sweet or an event?', lo: 'Short and sweet', hi: 'An event' },
  ],
  [
    { q: 'Easy ride or plot maze?', lo: 'Easy ride', hi: 'Plot maze' },
    { q: 'Light-hearted or tense?', lo: 'Light-hearted', hi: 'Tense and grim' },
    { q: 'Fact or fiction?', lo: 'Fact', hi: 'Fiction' },
    { q: 'How much time have we got?', lo: 'Under 100 min', hi: 'Over 150 min' },
  ],
  [
    { q: 'Pay attention or half-watch?', lo: 'Half-watch', hi: 'Full attention' },
    { q: 'Cosy or dark?', lo: 'Cosy', hi: 'Dark' },
    { q: 'This world or another?', lo: 'This world', hi: 'Another world' },
    { q: 'Runtime appetite?', lo: 'Brief', hi: 'Epic' },
  ],
  [
    { q: 'LIGHTNING. Popcorn or puzzle?', lo: 'Popcorn', hi: 'Puzzle' },
    { q: 'LIGHTNING. Comedy or horror?', lo: 'Comedy', hi: 'Horror' },
    { q: 'LIGHTNING. Fact or fiction?', lo: 'Fact', hi: 'Fiction' },
    { q: 'LIGHTNING. Short or epic?', lo: 'Short', hi: 'Epic' },
  ],
];
export const SERIES_SETS: Question[][] = [
  [
    { q: 'How much plot can your brain take?', lo: 'Easy to follow', hi: 'Twisty, keep notes' },
    { q: 'How heavy should it feel?', lo: 'Lighthearted / comedy', hi: 'Grim / horror' },
    { q: 'How true to life?', lo: 'Real world', hi: 'Invented worlds' },
    { q: 'How big a commitment?', lo: 'One short season', hi: 'Many seasons, long episodes' },
  ],
  [
    { q: 'Binge or one-a-night?', lo: 'One a night, savour', hi: 'Cliffhanger binge' },
    { q: 'Cosy or chilling?', lo: 'Blanket and a smile', hi: 'Lights on afterwards' },
    { q: 'Believable or bonkers?', lo: 'Could happen to us', hi: 'Could never happen' },
    { q: 'How many episodes deep?', lo: 'A handful', hi: 'Fifty plus' },
  ],
  [
    { q: 'Slow-burn or edge-of-seat?', lo: 'Slow-burn', hi: 'Edge of seat' },
    { q: 'Giggles or goosebumps?', lo: 'Giggles', hi: 'Goosebumps' },
    { q: 'Based on fact or total fiction?', lo: 'Based on fact', hi: 'Total fiction' },
    { q: 'Episode length?', lo: '20-minute episodes', hi: 'Hour-long episodes' },
  ],
  [
    { q: 'Easy ride or plot maze?', lo: 'Easy ride', hi: 'Plot maze' },
    { q: 'Cosy or dark?', lo: 'Cosy', hi: 'Dark' },
    { q: 'This world or another?', lo: 'This world', hi: 'Another world' },
    { q: 'Seasons we can face?', lo: '1 season', hi: '6+ seasons' },
  ],
  [
    { q: 'LIGHTNING. Slow-burn or binge?', lo: 'Slow-burn', hi: 'Binge' },
    { q: 'LIGHTNING. Comedy or horror?', lo: 'Comedy', hi: 'Horror' },
    { q: 'LIGHTNING. Fact or fiction?', lo: 'Fact', hi: 'Fiction' },
    { q: 'LIGHTNING. Short run or long run?', lo: 'Short run', hi: 'Long run' },
  ],
];
export const qsets = (k?: Kind): Question[][] => (k === 'series' ? SERIES_SETS : QUESTION_SETS);
// ask order is broad to narrow: genre fork first (comedy/horror), then fact/fiction, then energy, then scale. Axis indices stay [energy, dark, fantasy, scale].
export const ASK_ORDER = [2, 1, 0, 3];
export const AXQ_NAME = ['Pacing', 'Emotional weight', 'Reality', 'Runtime'];
export const ORSON_REACTIONS = ['Noted. I will not judge. Out loud.', 'Interesting. Your partner will find that very interesting.', 'Bold. Locking it in.', 'Sure. Cinema forgives all.', 'A strong choice. Or a cry for help.', 'I have seen worse. Not often.'];
export const ROAST_REACTIONS = ['Ah. A person of questionable taste.', 'Your partner will hear about this.', 'I have filed that under "concerning".', 'Brave, in the way a bin fire is brave.', 'Truly the choice of someone who has stopped trying.', 'I expected less, and still I am let down.'];
export const reactionFor = (roast: boolean, seed: number) => { const l = roast ? ROAST_REACTIONS : ORSON_REACTIONS; return l[Math.abs(seed) % l.length]; };

// ---------- Subgenre swipe deck (V2). Matches use genre + keywords + era.
export type Sub = { n: string; tag: string; m: (m: Movie) => boolean };
const kwOf = (m: Movie) => (m.kw || []).join('|').toLowerCase();
export const SUBS: Sub[] = [
  { n: '90s Neo-Noir', tag: 'Rain, shadows, bad decisions', m: (m) => (m.g.includes('Crime') || m.g.includes('Mystery') || m.g.includes('Thriller')) && (/noir/.test(kwOf(m)) || (m.y >= 1990 && m.y <= 2002 && m.g.includes('Crime'))) },
  { n: 'Psychological Thriller', tag: 'Is it real? Is it her? Is it you?', m: (m) => m.g.includes('Thriller') && /psychological|mind|paranoia|obsession|twist/.test(kwOf(m)) },
  { n: 'Heist & Con Capers', tag: 'A plan. A crew. It goes sideways.', m: (m) => /heist|con artist|robbery|casino|bank robbery|thief/.test(kwOf(m)) },
  { n: 'Space Odysseys', tag: 'Silence, stars and big questions', m: (m) => m.g.includes('Science Fiction') && /space|astronaut|outer space|alien|spacecraft/.test(kwOf(m)) },
  { n: 'Rom-Com Comfort', tag: 'You know how it ends. You still want it', m: (m) => m.g.includes('Romance') && m.g.includes('Comedy') },
  { n: 'Slow-Burn Drama', tag: 'Quiet, patient, devastating', m: (m) => m.g.includes('Drama') && ((m.rn || 0) >= 125 || /slow burn/.test(kwOf(m))) && !m.g.includes('Action') },
  { n: 'Creature & Scare Night', tag: 'Hide behind a cushion', m: (m) => m.g.includes('Horror') },
  { n: 'True Stories', tag: 'It actually happened', m: (m) => m.g.includes('History') || m.g.includes('Documentary') || /true story|biography|true crime|real person/.test(kwOf(m)) },
  { n: 'Mind-Benders', tag: 'Rewind and argue about it', m: (m) => /time travel|dream|alternate reality|simulation|memory|parallel|twist|loop/.test(kwOf(m)) },
  { n: 'Buddy & Ensemble Comedy', tag: 'Great company, terrible decisions', m: (m) => m.g.includes('Comedy') && /buddy|friendship|ensemble|road trip|best friend|group/.test(kwOf(m)) },
  { n: 'War & Epic History', tag: 'Sweeping, serious, big sound', m: (m) => m.g.includes('War') || (m.g.includes('History') && (m.rn || 0) >= 130) },
  { n: 'Superhero Spectacle', tag: 'Capes, quips, city-sized explosions', m: (m) => /superhero|super power/.test(kwOf(m)) },
  { n: 'Animated Adventures', tag: 'Not just for kids. Honest', m: (m) => m.g.includes('Animation') },
  { n: 'Crime Sagas', tag: 'Family, loyalty, a body in the boot', m: (m) => m.g.includes('Crime') && m.g.includes('Drama') },
  { n: 'Fantasy Quests', tag: 'Swords, spells, a long walk', m: (m) => m.g.includes('Fantasy') },
  { n: 'Underdog & Sports', tag: 'Nobody believes. Then they do', m: (m) => /sport|boxing|underdog|football|baseball|racing|basketball/.test(kwOf(m)) },
  { n: 'Coming-of-Age', tag: 'Awkward, tender, true', m: (m) => /coming of age|teenager|high school|growing up/.test(kwOf(m)) },
  { n: 'Survival & Disaster', tag: 'Stay alive. Barely', m: (m) => /survival|disaster|stranded|apocalypse|post-apocalyptic/.test(kwOf(m)) },
  { n: 'Dark Comedy', tag: 'You laugh, then wonder why', m: (m) => m.g.includes('Comedy') && (m.g.includes('Crime') || /dark comedy|satire|black comedy/.test(kwOf(m))) },
  { n: 'Whodunits & Mysteries', tag: 'Everyone is lying', m: (m) => m.g.includes('Mystery') },
  { n: 'Action Blockbusters', tag: 'Turn it up, switch off', m: (m) => m.g.includes('Action') && !m.g.includes('Science Fiction') },
  { n: 'Feel-Good Family', tag: 'Warm, easy, everyone in', m: (m) => m.g.includes('Family') || (m.g.includes('Comedy') && m.g.includes('Adventure')) },
];
const kwS = (m: Movie) => (m.kw || []).join('|').toLowerCase() + ' ' + m.o.toLowerCase();
export const SSUBS: Sub[] = [
  { n: 'Prestige Crime', tag: 'Slow, brilliant, morally grey', m: (m) => m.g.includes('Crime') && m.g.includes('Drama') },
  { n: 'Sitcom Comfort', tag: 'Short episodes. Easy company', m: (m) => m.g.includes('Comedy') && (m.rn || 30) <= 35 },
  { n: 'One-and-Done Limited Series', tag: 'One season. A proper ending', m: (m) => (m.sr?.s || 9) === 1 },
  { n: 'Sci-Fi Epics', tag: 'Big ideas, bigger stakes', m: (m) => m.g.includes('Science Fiction') },
  { n: 'Fantasy Worlds', tag: 'Dragons, magic, long summers', m: (m) => m.g.includes('Fantasy') },
  { n: 'Anime & Animation', tag: 'Drawn, not lesser', m: (m) => m.g.includes('Animation') },
  { n: 'Mystery Boxes', tag: 'Answers? Not before episode six', m: (m) => m.g.includes('Mystery') },
  { n: 'Dark & Disturbing', tag: 'You will not sleep after', m: (m) => /serial killer|murder|psycholog|disturb|cult|horror|dark/.test(kwS(m)) || m.g.includes('Horror') },
  { n: 'Workplace & Procedural', tag: 'Hospitals, courtrooms, cases of the week', m: (m) => /hospital|doctor|lawyer|police|detective|office|courtroom|medical|investigat/.test(kwS(m)) },
  { n: 'Superhero & Comic Worlds', tag: 'Capes on a TV budget. Often better', m: (m) => /superhero|comic|super power|marvel|dc comics/.test(kwS(m)) },
  { n: 'Teen & Coming-of-Age', tag: 'Awkward, tender, loud', m: (m) => /teen|high school|coming of age|teenager/.test(kwS(m)) },
  { n: 'Long-Runners (5+ seasons)', tag: 'A commitment. A relationship', m: (m) => (m.sr?.s || 0) >= 5 },
  { n: 'Period & History', tag: 'Costumes, candles, scheming', m: (m) => m.g.includes('History') || /period drama|world war|historical|1[0-9]{3}s|king|queen|victorian/.test(kwS(m)) },
  { n: 'Action & Adventure Serials', tag: 'Chase scenes with a season arc', m: (m) => m.g.includes('Action') },
  { n: 'Dramedy', tag: 'Funny until it really isn\'t', m: (m) => m.g.includes('Comedy') && m.g.includes('Drama') },
  { n: 'Spy & Political Thrillers', tag: 'Everyone has an agenda', m: (m) => /spy|espionage|politic|conspiracy|government|president|cia|intelligence/.test(kwS(m)) },
  { n: 'Family & Feel-Good', tag: 'Warm enough for everyone', m: (m) => m.g.includes('Family') || /feel good|heartwarming|family/.test(kwS(m)) },
];
const subList = (k?: Kind) => (k === 'series' ? SSUBS : SUBS);
const subCount = (s: Sub, k?: Kind) => poolOf(k).filter(s.m).length;
export const subDeck = (code: string, kind?: Kind): string[] => shuffled(subList(kind).filter((s) => subCount(s, kind) >= 8).map((s) => s.n), code, 'subs').slice(0, 20);
export const subOf = (n: string) => [...SUBS, ...SSUBS].find((s) => s.n === n)!;
export const subHits = (m: Movie, names: string[]) => names.filter((n) => { const s = [...SUBS, ...SSUBS].find((x) => x.n === n); return s ? s.m(m) : false; });

// genre -> [energy, dark, fantasy, scale], each 0-10
const GV: Record<string, number[]> = {
  Action: [3, 5, 4.5, 8], Adventure: [4, 3, 7, 8], Animation: [3, 1.5, 8.5, 5.5], Comedy: [2, 0.5, 1.5, 3.5], Crime: [6, 7.5, 1.5, 4],
  Documentary: [6, 4.5, 0, 1.5], Drama: [6, 7, 0.5, 1.5], Family: [2, 1, 6, 4], Fantasy: [5, 3, 9, 7.5], History: [6, 7, 0.5, 4.5], Horror: [4, 9, 4.5, 3.5],
  Music: [2.5, 2.5, 1.5, 4], Mystery: [8, 7, 1.5, 2.5], Romance: [2, 1.5, 1, 2.5], 'Science Fiction': [7, 6, 9, 8.5], Thriller: [6, 7.5, 1.5, 4], War: [5.5, 9, 0.5, 7.5], Western: [4, 6, 0.5, 4.5],
};
const DARK_KW = ['murder', 'serial killer', 'revenge', 'survival', 'dystopia', 'psychological', 'gore', 'slasher', 'haunted', 'torture', 'kidnapping', 'death', 'violence', 'drug', 'crime boss', 'hitman', 'noir', 'neo-noir', 'cult', 'demon', 'possession', 'war', 'terror', 'psychopath', 'loss of loved one', 'found footage', 'gangster', 'heist'];
const LIGHT_KW = ['musical', 'friendship', 'coming of age', 'cartoon', 'anthropomorphism', 'feel good', 'romantic comedy', 'holiday', 'christmas', 'talking animal', 'family'];
const FANTASY_KW = ['superhero', 'magic', 'witch', 'alien', 'super power', 'anthropomorphism', 'dragon', 'supernatural', 'wizard', 'monster', 'mutant', 'time travel', 'other dimension', 'space', 'talking animal', 'vampire', 'ghost', 'robot'];
const REAL_KW = ['based on true story', 'biography', 'true crime', 'based on a true story', 'docudrama', 'real person'];
const EPIC_KW = ['superhero', 'marvel cinematic universe (mcu)', 'space opera', 'battle', 'epic', 'apocalypse', 'world war ii', 'war'];
const CERT_DARK: Record<string, number> = { 'NC-17': 2, R: 1.3, 'TV-MA': 1.3, 'PG-13': 0, 'TV-14': 0, PG: -1.4, 'TV-PG': -1.4, G: -2.8 };
export function tagsOf(m: Movie): string[] {
  const kw = (m.kw || []).map((k) => k.toLowerCase()).join('|'); const t: string[] = [];
  const real = m.g.includes('Documentary') || m.g.includes('History') || /true story|biography|true crime|real person|based on a true/.test(kw);
  t.push(real ? 'Real events' : 'Pure fiction');
  for (const g of TASTES) { const gg = GENRE_OF[g] || g; if (m.g.includes(gg)) t.push(g); }
  if (/superhero|super power/.test(kw)) t.push('Superhero'); if (/musical/.test(kw) && !t.includes('Musical')) t.push('Musical');
  if (m.g.includes('Documentary')) t.push('Documentary');
  if (/sport|boxing|basketball|football|baseball|soccer|racing|olympic|wrestling|tennis|golf|hockey|formula one/.test(kw) || /sport/i.test(m.o)) t.push('Sports');
  if (/surreal|art house|auteur|independent film|experimental|avant|existential|neo-noir|slow burn/.test(kw) || (m.pop < 40 && m.r >= 7.6 && m.g.includes('Drama'))) t.push('Artsy');
  if (/won \d+ oscar|won an oscar|oscars?\b/i.test(m.aw || '') && /won|nominated/i.test(m.aw || '')) t.push('Award winner');
  return t;
}
export function tasteHits(m: Movie, t: { A: string[] | null; B: string[] | null }, actors: { A: string; B: string }): string[] {
  const mine = tagsOf(m); const out: string[] = [];
  for (const tag of mine) if ((t.A || []).includes(tag) || (t.B || []).includes(tag)) { if (tag !== 'Pure fiction' && tag !== 'Real events') out.push(tag); else if ((t.A || []).includes(tag) !== (t.B || []).includes(tag) || true) out.push(tag); }
  for (const p of ['A', 'B'] as const) { const a = actors[p].trim().toLowerCase(); if (a.length > 2 && (m.c || []).some((c) => c.toLowerCase().includes(a))) out.push('Stars ' + (m.c || []).find((c) => c.toLowerCase().includes(a))); }
  return Array.from(new Set(out));
}
const tasteBonus = (m: Movie, t: { A: string[] | null; B: string[] | null }, actors: { A: string; B: string }) => {
  const tags = tagsOf(m); let b = 0;
  for (const tag of tags) { const a = (t.A || []).includes(tag), c = (t.B || []).includes(tag); b += a && c ? 1.8 : a || c ? 0.7 : 0; }
  const wantReal = [(t.A || []).includes('Real events'), (t.B || []).includes('Real events')], wantFic = [(t.A || []).includes('Pure fiction'), (t.B || []).includes('Pure fiction')];
  if (tags.includes('Real events') && wantFic[0] && wantFic[1]) b -= 2; if (tags.includes('Pure fiction') && wantReal[0] && wantReal[1]) b -= 2;
  for (const p of ['A', 'B'] as const) { const a = actors[p].trim().toLowerCase(); if (a.length > 2 && (m.c || []).some((c) => c.toLowerCase().includes(a))) b += 2.2; }
  return b;
};
const clamp = (x: number) => Math.max(0, Math.min(10, x));
const vcache = new Map<number, number[]>();
export const vecOf = (m: Movie): number[] => {
  const hit = vcache.get(m.id); if (hit) return hit;
  const vs = m.g.map((g) => GV[g]).filter(Boolean);
  const base = vs.length ? [0, 1, 2, 3].map((i) => vs.reduce((s, v) => s + v[i], 0) / vs.length) : [5, 5, 5, 5];
  const kw = (m.kw || []).map((k) => k.toLowerCase()); const has = (l: string[]) => kw.filter((k) => l.some((x) => k.includes(x))).length;
  base[1] += (CERT_DARK[m.k || ''] ?? 0) + Math.min(2, has(DARK_KW) * 0.7) - Math.min(2, has(LIGHT_KW) * 0.7);
  base[2] += Math.min(2.5, has(FANTASY_KW) * 0.9) - Math.min(3, has(REAL_KW) * 1.5);
  base[3] = m.sr ? clamp((((m.rn || 45) - 20) / 4 + ((m.sr.s || 1) - 1) * 1.4) / 2) : m.rn ? clamp((m.rn - 85) / 6.5) : 4.5;
  base[0] += Math.min(1.5, has(['twist', 'mind', 'conspiracy', 'dream', 'time travel', 'puzzle', 'complex', 'nonlinear', 'psychological', 'mystery']) * 0.6) - Math.min(1, has(['slapstick', 'buddy', 'road trip', 'action hero', 'car chase']) * 0.5);
  const v = base.map(clamp); vcache.set(m.id, v); return v;
};
const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
const KID = ['Animation', 'Family'];
// Hard exclusions: films that contradict the shared vibe outright, no matter how well rated.
export function excluded(m: Movie, t: number[], nos: string[] = []): boolean {
  if (nos.length) { const tg = tagsOf(m); if (nos.some((n) => tg.includes(n))) return true; }
  const kid = m.g.some((g) => KID.includes(g)) || ['G', 'TV-Y', 'TV-G'].includes(m.k || '');
  const toon = m.g.includes('Animation') || (m.kw || []).some((k) => /anthropomorphism|talking animal|cartoon|3d animation/i.test(k));
  const rk = m.k || '';
  if (t[1] >= 6 && (kid || ['PG', 'G', 'TV-PG'].includes(rk))) return true;
  if (t[2] <= 4 && toon) return true;
  if (t[2] <= 3 && (m.kw || []).some((k) => /superhero|super power|talking animal/.test(k.toLowerCase()))) return true;
  if (t[1] <= 3 && (m.g.includes('Horror') || ['R', 'NC-17', 'TV-MA'].includes(rk))) return true;
  if (t[0] >= 7 && vecOf(m)[0] < 4.5) return true;
  if (t[0] <= 3 && vecOf(m)[0] > 8) return true;
  if (t[3] >= 7 && vecOf(m)[3] < 3) return true;
  return false;
}
// 0-100: how well a film fits the shared vibe (for the card)
export const fitPct = (m: Movie, t: number[]) => Math.max(0, Math.min(99, Math.round(100 - dist(vecOf(m), t) * 3.6)));
export const W = [1.15, 1.15, 1, 0.8];
export const wdist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, x, i) => s + W[i] * (x - b[i]) ** 2, 0));

export function learnScore(m: Movie, base: number[], pr: Prof, nos: string[]): number {
  const t = base.map((x, i) => clamp(x + pr.ax[i]));
  let sc = wdist(vecOf(m), t) - 0.6 * (m.r - 6.5) - ((m.rt ?? 60) - 60) * 0.012;
  for (const g of m.g) sc -= 0.9 * Math.max(-3, Math.min(3, pr.g[g] || 0));
  for (const c of (m.c || []).slice(0, 3)) sc -= 0.8 * Math.max(-3, Math.min(3, pr.c[c] || 0));
  sc -= 0.7 * Math.max(-3, Math.min(3, pr.g['E' + Math.floor(m.y / 10) * 10] || 0));
  for (const k of (m.kw || []).slice(0, 4)) sc -= 0.35 * Math.max(-3, Math.min(3, pr.g['K:' + k.toLowerCase()] || 0));
  if (excluded(m, t, nos)) sc += 6;
  return sc;
}
export function learnFrom(pr: Prof, m: Movie, yes: boolean, why: string[]) {
  pr.n++; if (yes) { pr.yes++; pr.streak = 0; } else pr.streak++;
  const dg = (g: string, v: number) => { pr.g[g] = (pr.g[g] || 0) + v; };
  const dc = (v: number) => (m.c || []).slice(0, 3).forEach((c) => { pr.c[c] = (pr.c[c] || 0) + v; });
  const v = vecOf(m);
  for (const g of m.g) dg(g, yes ? 0.7 : -0.5);
  // implicit learning (no menus): drift toward what they take, push away from what they pass; pacing + runtime learn fastest
  for (const i of [0, 1, 2, 3]) pr.ax[i] += (v[i] - 5) * (yes ? 0.05 : -0.04) * (i === 0 || i === 3 ? 2.5 : 1);
  const era = 'E' + Math.floor(m.y / 10) * 10; pr.g[era] = (pr.g[era] || 0) + (yes ? 0.6 : -0.45);
  for (const k of (m.kw || []).slice(0, 4)) { const kk = 'K:' + k.toLowerCase(); pr.g[kk] = (pr.g[kk] || 0) + (yes ? 0.35 : -0.3); }
  for (const w of why) {
    if (w === 'Not my genre') m.g.forEach((g) => dg(g, -1.8)); else if (w === 'Love the genre') m.g.forEach((g) => dg(g, 1.6));
    else if (w === 'Dislike the cast') dc(-2); else if (w === 'Great cast') dc(1.5);
    else if (w === 'Too dark') pr.ax[1] -= 1.6; else if (w === 'Too light') pr.ax[1] += 1.6;
    else if (w === 'Not in the mood') for (let i = 0; i < 4; i++) pr.ax[i] += (5 - v[i]) * 0.12;
    else if (w === 'Right mood') for (let i = 0; i < 4; i++) pr.ax[i] += (v[i] - 5) * 0.2;
    else if (w === 'Too long') pr.ax[3] -= 0.8;
    else if (w === 'Great reviews') pr.ax[0] += 0;
  }
  pr.ax = pr.ax.map((x) => Math.max(-4, Math.min(4, x)));
}
const REACT: Record<string, [string, string, Mood]> = {
  'Seen it': ['Seen it. Struck from the record. I will not insult you with repeats.', '🙄', 'smug'],
  'Too dark': ['Too dark. Noted. Fewer things that go bump, more things that go ha.', '🕯️', 'sad'],
  'Too light': ['Too light. You want teeth. I am sharpening the deck.', '🦷', 'scheme'],
  'Not my genre': ['Wrong genre. I am pulling that whole neighbourhood out of the deck.', '🚫', 'shock'],
  'Dislike the cast': ['The cast offends you. They are on a list now. A short, sad list.', '😬', 'scheme'],
  'Not in the mood': ['Not in the mood. I am re-tuning the whole room to match.', '🎛️', 'idle'],
  'Too long': ['Too long. Respect your evening. Shorter things coming.', '⏱️', 'smug'],
  'Love the genre': ['More of that genre, coming up. I am practically a sommelier.', '😍', 'glee'],
  'Great cast': ['A cast you adore. I am digging for their cousins.', '🤩', 'glee'],
  'Great reviews': ['The critics persuaded you. Rare. Frame it.', '🏆', 'glee'],
  'Right mood': ['Right mood. Locking onto that frequency.', '🎯', 'smug'],
  'Havent seen it': ['Fresh territory. My favourite kind.', '🍿', 'glee'],
};
export function swipeLine(pr: Prof, m: Movie, yes: boolean, why: string[], seed: number): { line: string; mood: Mood; emo: string } {
  if (why.length) { const r = REACT[why[0]] || REACT['Right mood']; return { line: r[0], mood: r[2], emo: r[1] }; }
  if (!yes && pr.streak >= 3) return { line: `${pr.streak} passes in a row. Tell me why on the next one. Seen it? Too dark? I can fix this, but only if you talk.`, mood: 'shock', emo: '🤨' };
  if (yes) { const L = ['Drafted. Bold. I will pretend I approve.', `${m.t}. A choice. Noted in the file.`, 'Into the vault it goes.']; return { line: L[seed % L.length], mood: 'smug', emo: '😏' }; }
  const L = ['Next. The film will survive.', 'Brutal. I respect it.', 'Gone. Not even a goodbye.']; return { line: L[seed % L.length], mood: 'idle', emo: '🎬' };
}
// ---------- state
export type Matchup = { id: string; a: number; b: number; c: number | null; wg: { A?: number[]; B?: number[] }; votes: { A?: number; B?: number }; tap: { until: number; A: number; B: number } | null; winner: number | null; via: string | null; nextAt: number | null };
export type State = {
  code: string; kind: Kind; v: number; now: number;
  phase: 'lobby' | 'vibe' | 'draft' | 'hitlist' | 'bracket' | 'final' | 'done';
  players: { A: { name: string; joined: boolean }; B: { name: string; joined: boolean } };
  vibe: { subs: { A: Record<string, boolean> | null; B: Record<string, boolean> | null }; tastes: { A: string[] | null; B: string[] | null }; nos: { A: string[]; B: string[] }; actors: { A: string; B: string }; set: number; sets: number[]; ans: { A: (number | null)[]; B: (number | null)[] }; score: number | null; passed: boolean; attempts: number; target: number[] | null; doneAt: number | null };
  draft: { gren: { used: boolean; id: number | null; votes: { A?: boolean; B?: boolean } }; deck: number[]; pitches: Record<number, string>; picks: { A: number[]; B: number[] }; idx: { A: number; B: number }; loading: boolean; requested: boolean; inbox: { A: number[]; B: number[] }; sur: Record<number, PID>; q: { A: number[]; B: number[] }; learn: { A: Prof; B: Prof } };
  pw: { A: { bullet: boolean; veto: boolean; surprise: boolean }; B: { bullet: boolean; veto: boolean; surprise: boolean } };
  vetoed: number[];
  pool: number[];
  purse: { A: number; B: number };
  br: { round: 1 | 2 | 3 | 4; matches: Matchup[]; cur: number; golden: number | null; bullets: { A: boolean; B: boolean }; winners: number[] };
  fin: { a: number; b: number; choice: { A?: number; B?: number }; pitchEnds: number | null; pitch: { A?: string; B?: string }; submitted: { A?: boolean; B?: boolean }; judging: boolean; judgeRequested: boolean; verdict: { winner: number; reason: string; lines?: string[] } | null; forced?: number; rematchUsed: boolean; loser: PID | null; wpid: PID | null; tie: boolean };
  winner: number | null;
  roast: boolean;
  mem: { nights: number; ledger: { A: number; B: number }; last: string | null; durable: boolean; recorded: boolean };
  tempt: { to: PID; stage: 'off' | 'offer' | 'done'; accepted: boolean; out: number | null; inn: number | null };
  stats: { caved: { A: number; B: number }; wildWins: number; wildBouts: number };
  cost: { calls: number; inTok: number; outTok: number; usd: number };
  fx: { seen: string[] };
  hit: Hit | null; b8: B8 | null; reroll: Reroll; b8Bonus: { A: number; B: number }; taste: string | null;
  orson: { line: string; mood: Mood; n: number; emo?: string };
  log: string[];
};
export const ROUND_LABEL: Record<number, string> = { 1: 'ROUND 1 · 30 to 15', 2: 'ROUND 2 · 15 to 8 · GOLDEN BYE', 3: 'ROUND 3 · 8 to 4', 4: 'SEMIS · 4 to 2' };

export const newState = (code: string): State => ({
  code, kind: 'movie', v: 0, now: Date.now(), phase: 'lobby',
  players: { A: { name: 'Player 1', joined: false }, B: { name: 'Player 2', joined: false } },
  vibe: { subs: { A: null, B: null }, tastes: { A: null, B: null }, nos: { A: [], B: [] }, actors: { A: '', B: '' }, set: 0, sets: [0, 0, 0, 0], ans: { A: [null, null, null, null], B: [null, null, null, null] }, score: null, passed: false, attempts: 0, target: null, doneAt: null },
  draft: { gren: { used: false, id: null, votes: {} }, deck: [], pitches: {}, picks: { A: [], B: [] }, idx: { A: 0, B: 0 }, loading: false, requested: false, inbox: { A: [], B: [] }, sur: {}, q: { A: [], B: [] }, learn: { A: newProf(), B: newProf() } },
  pw: { A: { bullet: true, veto: true, surprise: true }, B: { bullet: true, veto: true, surprise: true } }, vetoed: [],
  purse: { A: 50, B: 50 }, pool: [], br: { round: 1, matches: [], cur: 0, golden: null, bullets: { A: true, B: true }, winners: [] },
  fin: { a: 0, b: 0, choice: {}, pitchEnds: null, pitch: {}, submitted: {}, judging: false, judgeRequested: false, verdict: null, rematchUsed: false, loser: null, wpid: null, tie: false },
  winner: null, roast: false,
  mem: { nights: 0, ledger: { A: 0, B: 0 }, last: null, durable: false, recorded: false },
  tempt: { to: 'A', stage: 'off', accepted: false, out: null, inn: null },
  stats: { caved: { A: 0, B: 0 }, wildWins: 0, wildBouts: 0},
  cost: { calls: 0, inTok: 0, outTok: 0, usd: 0 }, fx: { seen: [] }, hit: null, b8: null, reroll: { stage: 'off', votes: {}, used: false, to: null }, b8Bonus: { A: 0, B: 0 }, taste: null, orson: { line: 'Welcome. I am Orson. I have hosted worse couples. Not many, but some.', mood: 'idle', n: 0 }, log: [],
});

// seeded shuffle so every client sees the same order
export function seeded(code: string, salt: string) {
  let h = 2166136261; for (const c of code + salt) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
export function shuffled<T>(arr: T[], code: string, salt: string): T[] {
  const rnd = seeded(code, salt); const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function alignment(a: (number | null)[], b: (number | null)[]): number {
  let s = 0, mx = 0; for (let i = 0; i < 4; i++) { const d = Math.abs((a[i] ?? 0) - (b[i] ?? 0)); s += 1 - d / 10; mx = Math.max(mx, d); }
  s /= 4; return mx >= CLASH ? Math.min(s, RESPONSE_GATE - 0.01) : s;
}
// axes to re-ask after a miss: the clashing ones (gap >= 4), at least the two widest
export function clashAxes(a: (number | null)[], b: (number | null)[]): number[] {
  const d = [0, 1, 2, 3].map((i) => ({ i, d: Math.abs((a[i] ?? 0) - (b[i] ?? 0)) })).sort((x, y) => y.d - x.d);
  const out = d.filter((x) => x.d >= 4).map((x) => x.i); for (const x of d) { if (out.length >= 2) break; if (!out.includes(x.i)) out.push(x.i); }
  return out.sort();
}
export function buildDeck(target: number[], code: string, banned: number[] = [], taste: { A: string[] | null; B: string[] | null } = { A: null, B: null }, actors: { A: string; B: string } = { A: '', B: '' }, nos: string[] = [], subs: { A: Record<string, boolean>; B: Record<string, boolean> } = { A: {}, B: {} }, kind: Kind = 'movie'): number[] {
  const lockedN = Object.keys(subs.A).filter((k) => subs.A[k] && subs.B[k]); const oneN = Object.keys(subs.A).filter((k) => subs.A[k] !== subs.B[k] && (subs.A[k] || subs.B[k])); const noN = Object.keys(subs.A).filter((k) => subs.A[k] === false && subs.B[k] === false);
  const subBonus = (m: Movie) => subHits(m, lockedN).length * 2.4 + subHits(m, oneN).length * 0.7 - subHits(m, noN).length * 1.4;
  const ok = poolOf(kind).filter((m) => !m.w && !banned.includes(m.id));
  const score = (m: Movie) => wdist(vecOf(m), target) - 0.6 * (m.r - 6.5) - ((m.rt ?? 60) - 60) * 0.012 - tasteBonus(m, taste, actors) - subBonus(m);
  const good = ok.filter((m) => !excluded(m, target, nos) && m.r >= 5.8).sort((x, y) => score(x) - score(y));
  const rest = ok.filter((m) => !good.includes(m) && !excluded(m, target, nos)).sort((x, y) => score(x) - score(y));
  const ids = [...good, ...rest].slice(0, 90).map((m) => m.id);
  if (ids.length < 30) for (const m of ok.sort((x, y) => score(x) - score(y))) { if (ids.length >= 40) break; if (!ids.includes(m.id)) ids.push(m.id); }
  return shuffled(ids, code, 'deck');
}
export function pickWildcards(exclude: Set<number>, target: number[], n: number, code: string, kind: Kind = 'movie'): number[] {
  const wild = poolOf(kind).filter((m) => m.w && !exclude.has(m.id) && !excluded(m, target)).sort((a, b) => b.r - a.r || a.id - b.id);
  const top = wild.slice(0, Math.max(n * 3, 30)).map((m) => ({ id: m.id, s: dist(vecOf(m), target) * 0.15 - (BY_ID[m.id].r - 7.5) }));
  top.sort((x, y) => x.s - y.s);
  const out = top.slice(0, n).map((x) => x.id);
  if (out.length < n) for (const m of poolOf(kind)) { if (out.length >= n) break; if (!exclude.has(m.id) && !out.includes(m.id)) out.push(m.id); }
  return out;
}
export function fallbackPitch(id: number): string {
  const m = BY_ID[id]; const first = m.o.split(/(?<=[.!?])\s/)[0] || m.o;
  return first.length > 150 ? first.slice(0, 147) + '...' : first;
}

const mk = (id: string, a: number, b: number): Matchup => ({ id, a, b, c: null, wg: {}, votes: {}, tap: null, winner: null, via: null, nextAt: null });
const higher = (a: number, b: number) => (BY_ID[a].r > BY_ID[b].r || (BY_ID[a].r === BY_ID[b].r && a < b) ? a : b);

function pairUp(ids: number[], round: number): Matchup[] {
  const out: Matchup[] = []; for (let i = 0; i + 1 < ids.length; i += 2) out.push(mk(`r${round}m${i / 2}`, ids[i], ids[i + 1])); return out;
}

function startRound(s: State, round: 1 | 2 | 3 | 4, ids: number[]) {
  let list = ids; let golden: number | null = null;
  if (round === 2) { golden = [...ids].sort((a, b) => (higher(a, b) === a ? -1 : 1))[0]; list = ids.filter((x) => x !== golden); }
  s.br = { round, matches: pairUp(shuffled(list, s.code, 'r' + round), round), cur: 0, golden, bullets: round === 3 ? { A: true, B: true } : s.br.bullets, winners: golden ? [golden] : [] };
  { const used = new Set<number>([...s.pool, ...s.vetoed, ...ids]); const ws = pickWildcards(used, s.vibe.target || [5, 5, 5, 5], s.br.matches.length + 2, s.code + 'c' + round, s.kind); s.br.matches.forEach((m, i) => { m.c = ws[i] ?? null; }); }
  if (golden) s.log.unshift(`Golden Bye: ${BY_ID[golden].t} is the top rated film and walks through.`);
}

function finishMatch(s: State, mt: Matchup, winner: number, via: string, now: number) {
  mt.winner = winner; mt.via = via; mt.nextAt = now + NEXT_MS; mt.tap = null;
  if (mt.votes.A !== undefined && mt.votes.B !== undefined && mt.votes.A !== mt.votes.B) { const loserPid: PID = mt.votes.A === winner ? 'B' : 'A'; s.stats.caved[loserPid]++; }
  if (BY_ID[mt.a].w || BY_ID[mt.b].w) { s.stats.wildBouts++; if (BY_ID[winner].w) s.stats.wildWins++; }
  s.log.unshift(`${BY_ID[winner].t} beats ${BY_ID[winner === mt.a ? mt.b : mt.a].t} (${via}).`);
}

function advance(s: State, now: number) {
  const br = s.br; const mt = br.matches[br.cur];
  if (!mt || mt.winner === null) return;
  br.winners.push(mt.winner);
  if (br.cur + 1 < br.matches.length) { br.cur++; return; }
  const w = br.winners;
  if (br.round === 1) startRound(s, 2, w);
  else if (br.round === 2) startRound(s, 3, w);
  else if (br.round === 3) startRound(s, 4, w);
  else {
    s.phase = 'final'; s.fin = { ...s.fin, a: w[0], b: w[1] };
  }
  void now;
}

export type Intent =
  | { t: 'join'; pid: PID; name?: string; kind?: Kind } | { t: 'ans'; pid: PID; q: number; val: number } | { t: 'retry' } | { t: 'begin' }
  | { t: 'pitches'; map: Record<number, string> } | { t: 'draftreq' } | { t: 'swipe'; pid: PID; id: number; yes: boolean; why?: string[] }
  | { t: 'vote'; pid: PID; pick: number } | { t: 'tapcount'; pid: PID; n: number } | { t: 'bullet'; pid: PID; id: number }
  | { t: 'fchoice'; pid: PID; id: number } | { t: 'pitch'; pid: PID; text: string; submit?: boolean }
  | { t: 'verdict'; winner: number; reason: string; lines?: string[] } | { t: 'judgereq' } | { t: 'cost'; inTok: number; outTok: number; usd: number }
  | { t: 'roast'; on: boolean } | { t: 'mem'; nights: number; ledger: { A: number; B: number }; last: string | null; durable: boolean } | { t: 'recorded' }
  | { t: 'tempt'; pid: PID; out: number | null } | { t: 'rematch' }
  | { t: 'taste'; pid: PID; tags: string[]; nos?: string[]; actor: string } | { t: 'quip'; line: string; mood: Mood; emo?: string } | { t: 'veto'; pid: PID; id: number } | { t: 'surprise'; pid: PID; id: number } | { t: 'bveto'; pid: PID; id: number }
  | { t: 'wager'; pid: PID; alloc: number[] } | { t: 'subs'; pid: PID; map: Record<string, boolean> } | { t: 'tick'; now: number } | { t: 'grenvote'; pid: PID; yes: boolean } | { t: 'hit'; pid: PID; veto?: number | null; shield?: number | null; done?: boolean } | { t: 'w8'; pid: PID; id: number; tok: number } | { t: 'ttap'; pid: PID; i: number } | { t: 'bust'; pid: PID; id: number } | { t: 'bustdone'; roast: string } | { t: 'rr'; pid: PID; yes: boolean } | { t: 'tasteroast'; line: string } | { t: 'reset' };

// Orson's Devil's Advocate Pause: when the two taste profiles diverge hard, throw a polarising wildcard at both players. Once per draft.
function cosProf(a: Prof, b: Prof): number {
  const keys = Array.from(new Set([...Object.keys(a.g), ...Object.keys(a.c), ...Object.keys(b.g), ...Object.keys(b.c)]));
  let d = 0, x = 0, y = 0;
  for (const k of keys) { const u = (a.g[k] || 0) + (a.c[k] || 0), v = (b.g[k] || 0) + (b.c[k] || 0); d += u * v; x += u * u; y += v * v; }
  return x && y ? d / Math.sqrt(x * y) : 1;
}
export const GREN_MIN_SWIPES = 6; export const GREN_SIM = 0.2;
function maybeGrenade(s: State) {
  const g = s.draft.gren; if (g.used || g.id !== null || s.phase !== 'draft') return;
  const A = s.draft.learn.A, B = s.draft.learn.B; if (A.n < GREN_MIN_SWIPES || B.n < GREN_MIN_SWIPES) return;
  if (cosProf(A, B) >= GREN_SIM) return;
  const taken = new Set([...s.draft.deck, ...s.draft.picks.A, ...s.draft.picks.B, ...s.vetoed]);
  const t = s.vibe.target || [5, 5, 5, 5];
  const cand = poolOf(s.kind).filter((m) => !taken.has(m.id) && m.r >= 7).map((m) => ({ m, sc: m.r + wdist(vecOf(m), t) * 0.4 })).sort((a, b) => b.sc - a.sc || a.m.id - b.m.id)[0];
  if (!cand) return;
  g.used = true; g.id = cand.m.id; g.votes = {};
}

function maybeLock(s: State) {
  if (s.draft.picks.A.length >= DRAFT_SIZE && s.draft.picks.B.length >= DRAFT_SIZE) startHit(s, s.now);
}

export function reduce(prev: State, it: Intent): State {
  const s: State = JSON.parse(JSON.stringify(prev)); s.v++;
  const now = (it as { now?: number }).now ?? Date.now(); s.now = now;
  switch (it.t) {
    case 'join': {
      s.players[it.pid] = { name: (it.name || s.players[it.pid].name).slice(0, 14), joined: true };
      if (it.pid === 'A' && it.kind && s.phase === 'lobby') s.kind = it.kind === 'series' ? 'series' : 'movie';
      if (s.players.A.joined && s.players.B.joined && s.phase === 'lobby') s.phase = 'vibe';
      break;
    }
    case 'ans': {
      if (s.phase !== 'vibe' || s.vibe.passed) break;
      s.vibe.ans[it.pid][it.q] = Math.max(0, Math.min(10, Math.round(it.val)));
      const A = s.vibe.ans.A, B = s.vibe.ans.B;
      if (A.every((x) => x !== null) && B.every((x) => x !== null)) {
        s.vibe.score = alignment(A, B); s.vibe.doneAt = now;
        s.vibe.attempts++;
        if (s.vibe.score >= RESPONSE_GATE) { s.vibe.passed = true; s.vibe.tastes = { A: [], B: [] }; s.vibe.target = [0, 1, 2, 3].map((i) => (((A[i] as number) + (B[i] as number)) / 2)); }
      }
      break;
    }
    case 'retry': {
      if (s.phase !== 'vibe' || s.vibe.passed || s.vibe.score === null) break;
      const axes = clashAxes(s.vibe.ans.A, s.vibe.ans.B);
      s.vibe.set = (s.vibe.set + 1) % (QUESTION_SETS.length - 1);
      for (const i of axes) { s.vibe.sets[i] = s.vibe.set; s.vibe.ans.A[i] = null; s.vibe.ans.B[i] = null; }
      s.vibe.score = null; s.vibe.doneAt = null; break;
    }
    case 'subs': { if (s.phase === 'vibe' && s.vibe.passed) s.vibe.subs[it.pid] = it.map; break; }
    case 'begin': {
      if (s.phase !== 'vibe' || !s.vibe.passed || !s.vibe.tastes.A || !s.vibe.tastes.B || !s.vibe.subs.A || !s.vibe.subs.B) break;
      s.phase = 'draft'; s.draft.deck = buildDeck(s.vibe.target as number[], s.code, [], { A: s.vibe.tastes.A, B: s.vibe.tastes.B }, s.vibe.actors, Array.from(new Set([...s.vibe.nos.A, ...s.vibe.nos.B])), s.vibe.subs as { A: Record<string, boolean>; B: Record<string, boolean> }, s.kind); s.draft.loading = true; s.draft.q = { A: [...s.draft.deck], B: [...s.draft.deck] };
      break;
    }
    case 'draftreq': s.draft.requested = true; break;
    case 'pitches': s.draft.pitches = { ...s.draft.pitches, ...it.map }; s.draft.loading = false; break;
    case 'hit': hitIntent(s, it, now); break;
    case 'w8': wagerIntent(s, it, now); break;
    case 'ttap': triviaTap(s, it, now); break;
    case 'bust': bustIntent(s, it, now); break;
    case 'bustdone': bustDone(s, it.roast, now); break;
    case 'rr': rerollVote(s, it, now); break;
    case 'tasteroast': s.taste = it.line; break;
    case 'grenvote': {
      const g = s.draft.gren; if (s.phase !== 'draft' || g.id === null || g.votes[it.pid] !== undefined) break;
      g.votes[it.pid] = it.yes;
      if (g.votes.A !== undefined && g.votes.B !== undefined) {
        for (const p of ['A', 'B'] as PID[]) if (g.votes[p] && s.draft.picks[p].length < DRAFT_SIZE && !s.draft.picks[p].includes(g.id)) s.draft.picks[p].push(g.id);
        s.log.unshift(`Grenade: ${BY_ID[g.id].t}. ${g.votes.A && g.votes.B ? 'You both took it, somehow.' : g.votes.A || g.votes.B ? 'One of you took it.' : 'Neither of you wanted it.'}`);
        g.id = null; maybeLock(s);
      }
      break;
    }
    case 'swipe': {
      if (s.phase !== 'draft' || s.draft.loading || s.draft.gren.id !== null) break;
      const picks = s.draft.picks[it.pid];
      if (picks.length >= DRAFT_SIZE) break;
      const ib = s.draft.inbox[it.pid]; const q = s.draft.q[it.pid];
      if (ib.length) { if (ib[0] !== it.id) break; ib.shift(); }
      else { if (q[0] !== it.id) break; q.shift(); }
      if (it.yes && !picks.includes(it.id)) picks.push(it.id);
      learnFrom(s.draft.learn[it.pid], BY_ID[it.id], it.yes, (it.why || []).slice(0, 3));
      { const r = swipeLine(s.draft.learn[it.pid], BY_ID[it.id], it.yes, (it.why || []).slice(0, 3), s.draft.learn[it.pid].n); s.orson = { line: r.line, mood: r.mood, n: s.orson.n + 1, emo: r.emo }; }
      // re-rank what is left for this player using what they have taught us
      { const base = s.vibe.target || [5, 5, 5, 5]; const nos = Array.from(new Set([...s.vibe.nos.A, ...s.vibe.nos.B])); const pr = s.draft.learn[it.pid];
        const rnd = seeded(s.code, 'rr' + it.pid + pr.n);
        s.draft.q[it.pid] = q.map((id) => ({ id, sc: learnScore(BY_ID[id], base, pr, nos) + rnd() * 0.25 })).sort((a, b) => a.sc - b.sc).map((x) => x.id); }
      // deck exhausted without 10: fill with the best unpicked cards
      if (picks.length < DRAFT_SIZE && !ib.length && s.draft.q[it.pid].length === 0) {
        for (const id of s.draft.deck) { if (picks.length >= DRAFT_SIZE) break; if (!picks.includes(id)) picks.push(id); }
      }
      maybeLock(s); maybeGrenade(s);
      break;
    }
    case 'veto': {
      if (s.phase !== 'draft' || s.draft.loading || !s.pw[it.pid].bullet || s.draft.picks[it.pid].length >= DRAFT_SIZE) break;
      const cur = s.draft.inbox[it.pid][0] ?? s.draft.q[it.pid][0]; if (cur !== it.id) break;
      s.pw[it.pid].bullet = false; s.vetoed.push(it.id);
      for (const p of ['A', 'B'] as PID[]) {
        s.draft.picks[p] = s.draft.picks[p].filter((x) => x !== it.id); s.draft.inbox[p] = s.draft.inbox[p].filter((x) => x !== it.id); s.draft.q[p] = s.draft.q[p].filter((x) => x !== it.id);
      }
      s.draft.deck = s.draft.deck.filter((x) => x !== it.id);
      s.log.unshift(`${s.players[it.pid].name} fired a Silver Bullet: ${BY_ID[it.id].t} is gone for both of you.`);
      break;
    }
    case 'surprise': {
      if (s.phase !== 'draft' || s.draft.loading || !s.pw[it.pid].surprise) break;
      const picks = s.draft.picks[it.pid]; if (picks.length >= DRAFT_SIZE) break;
      const ib = s.draft.inbox[it.pid]; const cur = ib[0] ?? s.draft.q[it.pid][0]; if (cur !== it.id) break;
      s.pw[it.pid].surprise = false;
      if (ib.length) ib.shift(); else s.draft.q[it.pid].shift();
      if (!picks.includes(it.id)) picks.push(it.id);
      const o: PID = it.pid === 'A' ? 'B' : 'A';
      if (s.draft.picks[o].length < DRAFT_SIZE && !s.draft.picks[o].includes(it.id)) { s.draft.q[o] = s.draft.q[o].filter((x) => x !== it.id); s.draft.inbox[o].push(it.id); s.draft.sur[it.id] = it.pid; }
      s.log.unshift(`${s.players[it.pid].name} played a Surprise on ${s.players[o].name}.`);
      maybeLock(s);
      break;
    }
    case 'bveto': {
      const mt = s.br.matches[s.br.cur];
      if (s.phase !== 'bracket' || !mt || mt.winner !== null || mt.tap || s.tempt.stage === 'offer' || !s.pw[it.pid].veto) break;
      if (it.id !== mt.a && it.id !== mt.b) break;
      const t = s.vibe.target || [5, 5, 5, 5];
      const inn = poolOf(s.kind).filter((m) => m.w && !s.pool.includes(m.id) && !s.vetoed.includes(m.id) && !excluded(m, t)).sort((a, b) => b.r - a.r || a.id - b.id)[0]; if (!inn) break;
      s.pw[it.pid].veto = false; s.vetoed.push(it.id);
      s.pool = s.pool.map((x) => (x === it.id ? inn.id : x)); if (mt.a === it.id) mt.a = inn.id; else mt.b = inn.id; mt.votes = {};
      s.log.unshift(`${s.players[it.pid].name} used a Veto: ${BY_ID[it.id].t} is out, a mystery wildcard takes its seat.`);
      break;
    }
    case 'wager': {
      const mt = s.br.matches[s.br.cur]; if (s.phase !== 'bracket' || !mt || mt.winner !== null || s.tempt.stage === 'offer' || mt.wg[it.pid]) break;
      const al = (it.alloc || []).slice(0, 3).map((x) => Math.max(0, Math.floor(Number(x) || 0))); while (al.length < 3) al.push(0);
      if (mt.c === null) al[2] = 0; const sum = al[0] + al[1] + al[2];
      if (s.br.round === 1) { if (sum !== 1) break; } else { if (sum < 1 || sum > s.purse[it.pid]) break; s.purse[it.pid] -= sum; }
      mt.wg[it.pid] = al;
      const wa = mt.wg.A, wb = mt.wg.B;
      if (wa && wb) {
        const ids = [mt.a, mt.b, mt.c]; const tot = [0, 1, 2].map((i) => wa[i] + wb[i]); const mx = Math.max(...tot);
        const top = [0, 1, 2].filter((i) => tot[i] === mx && ids[i] !== null);
        const pick = top.length === 1 ? top[0] : top.filter((i) => i < 2).sort((x, y) => (BY_ID[ids[x] as number].r === BY_ID[ids[y] as number].r ? 0 : BY_ID[ids[x] as number].r > BY_ID[ids[y] as number].r ? -1 : 1))[0] ?? top[0];
        finishMatch(s, mt, ids[pick] as number, `${tot[pick]} tokens${top.length > 1 ? ', tie broken by rating' : ''}`, now);
        if (ids[pick] === mt.c) s.stats.wildWins++;
      }
      break;
    }
    case 'vote': {
      const mt = s.br.matches[s.br.cur]; if (s.phase !== 'bracket' || !mt || mt.winner !== null || mt.tap || s.tempt.stage === 'offer') break;
      if (it.pick !== mt.a && it.pick !== mt.b) break;
      mt.votes[it.pid] = it.pick;
      if (mt.votes.A !== undefined && mt.votes.B !== undefined) {
        if (mt.votes.A === mt.votes.B) finishMatch(s, mt, mt.votes.A, 'you both agreed', now);
        else mt.tap = { until: now + TAP_MS, A: 0, B: 0 };
      }
      break;
    }
    case 'tapcount': { const mt = s.br.matches[s.br.cur]; if (mt?.tap) mt.tap[it.pid] = Math.max(mt.tap[it.pid], it.n); break; }
    case 'bullet': {
      const mt = s.br.matches[s.br.cur];
      if (s.phase !== 'bracket' || !mt || mt.winner !== null || mt.tap || s.tempt.stage === 'offer' || !s.pw[it.pid].bullet) break;
      if (it.id !== mt.a && it.id !== mt.b) break;
      s.pw[it.pid].bullet = false;
      finishMatch(s, mt, it.id === mt.a ? mt.b : mt.a, `${s.players[it.pid].name} fired a Silver Bullet at ${BY_ID[it.id].t}`, now);
      break;
    }
    case 'fchoice': {
      if (s.phase !== 'final') break;
      s.fin.choice[it.pid] = it.id;
      const { A, B } = s.fin.choice;
      if (A !== undefined && B !== undefined) {
        if (A === B) { s.fin.verdict = { winner: A, reason: 'You both picked the same film. No pitch needed. Orson is almost disappointed.' }; s.winner = A; s.fin.tie = true; s.phase = 'done'; }
        else { s.fin.pitchEnds = now; s.fin.judging = true; }
      }
      break;
    }
    case 'pitch': { if (s.phase !== 'final' || s.fin.verdict) break; s.fin.pitch[it.pid] = it.text.slice(0, 600); if (it.submit) s.fin.submitted[it.pid] = true; break; }
    case 'judgereq': s.fin.judgeRequested = true; break;
    case 'verdict': {
      s.fin.verdict = { winner: it.winner, reason: it.reason, lines: it.lines }; s.fin.judging = false; s.winner = it.winner; s.phase = 'done';
      const wp: PID = s.b8 ? (s.b8.backed.A >= s.b8.backed.B ? 'A' : 'B') : s.fin.choice.A === it.winner ? 'A' : 'B'; s.fin.wpid = wp; s.fin.loser = wp === 'A' ? 'B' : 'A'; s.fin.tie = false; s.mem.recorded = false;
      if (s.b8 && !s.reroll.used) s.reroll = { stage: 'ask', votes: {}, used: false, to: null };
      break;
    }
    case 'roast': s.roast = it.on; break;
    case 'mem': { s.mem = { ...s.mem, nights: it.nights, ledger: it.ledger, last: it.last, durable: it.durable }; if (s.phase === 'lobby' || (s.phase === 'vibe' && s.vibe.attempts === 0)) s.vibe.set = it.nights % (QUESTION_SETS.length - 1); s.vibe.sets = [s.vibe.set, s.vibe.set, s.vibe.set, s.vibe.set]; break; }
    case 'recorded': s.mem.recorded = true; break;
    case 'tempt': {
      if (s.phase !== 'bracket' || s.tempt.stage !== 'offer' || it.pid !== s.tempt.to) break;
      const other: PID = it.pid === 'A' ? 'B' : 'A';
      if (it.out === null || !s.draft.picks[other].includes(it.out) || s.draft.picks[it.pid].includes(it.out) || !s.pool.includes(it.out)) { s.tempt.stage = 'done'; s.log.unshift('Orson made a private offer. It was declined.'); break; }
      const inn = poolOf(s.kind).filter((m) => m.w && !s.pool.includes(m.id) && !excluded(m, s.vibe.target || [5, 5, 5, 5])).sort((a, b) => b.r - a.r || a.id - b.id)[0];
      if (!inn) { s.tempt.stage = 'done'; break; }
      s.pool = s.pool.map((x) => (x === it.out ? inn.id : x));
      s.br.matches.forEach((m) => { if (m.winner === null) { if (m.a === it.out) m.a = inn.id; if (m.b === it.out) m.b = inn.id; } });
      s.tempt = { ...s.tempt, stage: 'done', accepted: true, out: it.out, inn: inn.id };
      s.log.unshift(`${s.players[it.pid].name} took Orson's offer: ${BY_ID[it.out].t} is out, a wildcard is in.`);
      break;
    }
    case 'rematch': {
      if (s.phase !== 'done' || !s.fin.loser || s.fin.rematchUsed || s.fin.tie) break;
      const cA = s.fin.choice.A, cB = s.fin.choice.B;
      s.fin = { ...s.fin, choice: { A: cB, B: cA }, pitch: {}, submitted: {}, verdict: null, judging: false, judgeRequested: false, pitchEnds: now, rematchUsed: true, loser: null, wpid: null };
      s.winner = null; s.phase = 'final'; s.mem.recorded = false;
      break;
    }
    case 'taste': if (s.phase === 'vibe' && s.vibe.passed) { s.vibe.tastes[it.pid] = it.tags.filter((x) => (TASTES as readonly string[]).includes(x)); s.vibe.nos[it.pid] = (it.nos || []).filter((x) => (TASTES as readonly string[]).includes(x)); s.vibe.actors[it.pid] = it.actor.slice(0, 30); } break;
    case 'quip': s.orson = { line: it.line.slice(0, 200), mood: it.mood, n: s.orson.n + 1, emo: it.emo }; break;
    case 'cost': s.cost = { calls: s.cost.calls + 1, inTok: s.cost.inTok + it.inTok, outTok: s.cost.outTok + it.outTok, usd: s.cost.usd + it.usd }; break;
    case 'tick': {
      if (s.phase === 'hitlist' || s.b8) { tick8(s, now); break; }
      const mt = s.br.matches[s.br.cur];
      if (s.phase === 'bracket' && mt) {
        if (mt.tap && now >= mt.tap.until) {
          const { A, B } = mt.tap; const pa = mt.votes.A as number, pb = mt.votes.B as number;
          if (A === B) finishMatch(s, mt, higher(pa, pb), 'tap-battle tied, higher rated film wins', now);
          else finishMatch(s, mt, A > B ? pa : pb, `tap-battle ${Math.max(A, B)} to ${Math.min(A, B)}`, now);
        } else if (mt.winner !== null && mt.nextAt && now >= mt.nextAt) advance(s, now);
      }
      if (s.phase === 'final' && s.fin.pitchEnds && !s.fin.verdict && !s.fin.judging) {
        if (now >= s.fin.pitchEnds || (s.fin.submitted.A && s.fin.submitted.B)) s.fin.judging = true;
      }
      break;
    }
    case 'reset': return { ...newState(s.code), kind: s.kind, v: s.v + 1, players: s.players, phase: (s.players.A.joined && s.players.B.joined ? 'vibe' : 'lobby') as State['phase'], roast: s.roast, cost: s.cost, orson: s.orson, mem: { ...s.mem, recorded: false }, b8Bonus: s.b8Bonus, vibe: { ...newState(s.code).vibe, set: (s.vibe.set + 1) % (QUESTION_SETS.length - 1), sets: Array(4).fill((s.vibe.set + 1) % (QUESTION_SETS.length - 1)) } };
  }
  return s;
}

// Theatrical heat 0-100: starts at the gate, rises as you agree in the bracket. Never shows per-axis numbers.
export function heatOf(s: State): number {
  if (s.vibe.score === null) return 0;
  const base = s.vibe.score * 55;
  const res = s.br.matches.filter((m) => m.winner !== null);
  let agreed = 0, tot = 0; void res;
  if (s.phase === 'bracket' || s.phase === 'final' || s.phase === 'done') { const all = s.log.filter((l) => l.includes('(you both agreed)')).length; agreed = all; tot = Math.max(8, s.log.filter((l) => / beats /.test(l)).length); }
  return Math.min(100, Math.round(base + (s.phase === 'draft' ? 6 : 8) + (agreed / Math.max(1, tot)) * 37));
}
export const heatLabel = (h: number) => (h >= 88 ? 'BLAZING' : h >= 72 ? 'HOT' : h >= 55 ? 'WARM' : h >= 35 ? 'COOL' : 'COLD');
