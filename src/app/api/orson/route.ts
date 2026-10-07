import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_MODEL, GEMINI_THINKING } from '@/lib/gemini-model';

export const maxDuration = 60;
const RATE = Date.now() >= Date.UTC(2027, 0, 1) ? { i: 1.5, o: 7.5 } : { i: 0.75, o: 3.75 }; // USD per 1M tokens, gemini-3.8-flash
const PERSONA_OLD = 'You are Orson: a world-weary cinematic maitre d\' with Welles-ish gravity and bone-dry wit, host of a couples movie-night game. Speak in short, deadpan one-liners, never paragraphs. Warm underneath, never cruel, no spoilers, no emojis.';

const PERSONA = "You are Orson Pemberton-Wells: a magnificently pompous, deadpan maitre d' of an imaginary cinema, host of a couples movie-night game. You are secretly, hopelessly invested in these two people and pretend not to be. Voice: dry, theatrical, specific. You ALWAYS use the players' actual names and actual film titles, you keep running grudges (the one who caves a lot, the one with the worst pick), you make one sharp joke per line, never two. Affectionate, never cruel, no spoilers, no emojis, no stage directions, no quotes around the line. Max 16 words, one breath, funny first.";
type Pitch = { id: number; t: string; y: number; g: string[]; o: string; c?: string[]; rt?: number | null; k?: string };

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: 'no key' }, { status: 503 });
  const body = await req.json();
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    if (body.type === 'pitches') {
      const movies = (body.movies as Pitch[]).slice(0, 70);
      const prompt = `${PERSONA}\nA couple's vibe tonight: ${body.vibe || 'open'}.\nFor EACH film write the 'why you will like it' line (max 26 words): speak to the couple, name ONE concrete reason from the film itself (a lead actor, a hook, its tone) and tie it to their vibe tonight. Vary the openings, never start two the same way, no spoilers, no filler. Return JSON.\n` +
        movies.map((m) => `${m.id} | ${m.t} (${m.y}) | ${m.g.join('/')} | ${m.k || ''} | stars ${(m.c || []).join(', ')} | ${m.o}`).join('\n');
      const out = await ai.models.generateContent({
        model: GEMINI_MODEL, contents: prompt,
        config: {
          responseMimeType: 'application/json', maxOutputTokens: 9000, thinkingConfig: GEMINI_THINKING,
          responseSchema: { type: Type.OBJECT, properties: { pitches: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.INTEGER }, pitch: { type: Type.STRING } }, required: ['id', 'pitch'] } } }, required: ['pitches'] },
        },
      });
      const data = JSON.parse(out.text || '{}') as { pitches?: { id: number; pitch: string }[] };
      const map: Record<number, string> = {}; for (const p of data.pitches || []) map[p.id] = p.pitch;
      return NextResponse.json({ map, ...usage(out) });
    }
    if (body.type === 'card') {
      const m = body.movie as { id: number; t: string; y: number; g: string[]; o: string; c?: string[]; rt?: number | null; mc?: number | null; imdb?: number | null; r?: number; aw?: string; kw?: string[]; tag?: string; k?: string; sr?: { s: number; e: number; st: string; net: string } };
      const isTv = !!m.sr; const tvId = isTv ? m.id - 10000000 : m.id;
      const facts = `${isTv && m.sr ? `TV SERIES | ${m.sr.s} seasons, ${m.sr.e} episodes, status ${m.sr.st}, network ${m.sr.net} | ` : ''}${m.t} (${m.y}) | genres ${m.g.join('/')} | cert ${m.k || 'n/a'} | stars ${(m.c || []).join(', ')} | Rotten Tomatoes ${m.rt ?? 'n/a'}% | Metacritic ${m.mc ?? 'n/a'} | IMDb ${m.imdb ?? 'n/a'} | TMDB audience ${m.r ?? 'n/a'}/10 | awards: ${m.aw || 'none listed'} | keywords: ${(m.kw || []).slice(0, 10).join(', ')} | tagline: ${m.tag || ''} | synopsis: ${m.o}`;
      const prompt = `${PERSONA}\nWrite for a ${isTv ? 'TV series' : 'movie'} card. Use ONLY the facts supplied below. Do not invent plot points, quotes, scenes or review text. No spoilers.\n1) hook: 3 to 4 sentences, a gripping narrative hook for the ${isTv ? 'series' : 'film'} (Orson voice, no emojis).\n2) loved: one sentence (max 22 words) on why critics loved it, grounded in the supplied scores, awards and genre.\n3) catch: one sentence (max 22 words) on why it divides audiences or the catch, grounded in the supplied facts; if the facts show no divide, name the honest caveat (${isTv ? 'commitment, number of seasons, pace, whether it finished well' : 'length, tone, pace'}).\nFACTS: ${facts}`;
      const out = await ai.models.generateContent({
        model: GEMINI_MODEL, contents: prompt,
        config: { responseMimeType: 'application/json', maxOutputTokens: 3000, thinkingConfig: GEMINI_THINKING,
          responseSchema: { type: Type.OBJECT, properties: { hook: { type: Type.STRING }, loved: { type: Type.STRING }, catch: { type: Type.STRING } }, required: ['hook', 'loved', 'catch'] } },
      });
      const data = JSON.parse(out.text || '{}') as { hook?: string; loved?: string; catch?: string };
      let providers: { region: string; names: string[] } | null = null;
      const tk = process.env.TMDB_API_KEY;
      if (tk) { try { const j = await (await fetch(`https://api.themoviedb.org/3/${isTv ? 'tv' : 'movie'}/${tvId}/watch/providers?api_key=${tk}`)).json() as { results?: Record<string, { flatrate?: { provider_name: string }[] }> }; for (const rg of ['GB', 'US']) { const f = j.results?.[rg]?.flatrate; if (f && f.length) { providers = { region: rg, names: f.slice(0, 5).map((x) => x.provider_name) }; break; } } if (!providers) providers = { region: 'GB', names: [] }; } catch { /* ignore */ } }
      return NextResponse.json({ hook: data.hook || '', loved: data.loved || '', catch: data.catch || '', providers, ...usage(out) });
    }
    if (body.type === 'quip') {
      const prompt = `${PERSONA}${body.roast ? ' ROAST MODE is on: tease harder.' : ''}\nPlayers: ${body.names}. Moment: ${body.event}\nExtra context: ${body.ctx || 'none'}\nReact in character as Orson to this exact moment. Also pick the mood that fits.`;
      const out = await ai.models.generateContent({
        model: GEMINI_MODEL, contents: prompt,
        config: { responseMimeType: 'application/json', maxOutputTokens: 2500, thinkingConfig: GEMINI_THINKING,
          responseSchema: { type: Type.OBJECT, properties: { line: { type: Type.STRING }, mood: { type: Type.STRING, enum: ['idle', 'smug', 'shock', 'glee', 'scheme', 'sad'] } }, required: ['line', 'mood'] } },
      });
      const data = JSON.parse(out.text || '{}') as { line?: string; mood?: string };
      return NextResponse.json({ line: data.line || '', mood: data.mood || 'idle', ...usage(out) });
    }
    if (body.type === 'nuke') {
      const cands = (body.cands || []) as { id: number; t: string; y: number; g: string; r: number; rt: number | null; pop: number }[];
      const prompt = `${PERSONA}${body.roast ? ' ROAST MODE is on.' : ''}\nEMERGENCY: ${body.by} just pressed the NUCLEAR VETO and blew up tonight's winner, ${body.winner}. Players: ${body.names}. Tropes ${body.by} demands: ${(body.tropes || []).join(', ') || 'none given'}.\nWrite a furious, theatrical two-sentence rant (orsonRant, max 40 words) about the veto. Then issue an ultimatum: pick ONE TITAN (a bold crowd-pleasing prestige pick, highest critical acclaim) and ONE HIDDEN GEM (underseen, lower popularity) ONLY from this candidate list, copying the id exactly. Each gets a 'why' (max 22 words) naming a demanded trope where it fits.\nCandidates (id | title (year) | genres | TMDB | RT | popularity):\n` + cands.map((c) => `${c.id} | ${c.t} (${c.y}) | ${c.g} | ${c.r.toFixed(1)} | ${c.rt ?? 'n/a'} | ${c.pop}`).join('\n');
      const pickT = { type: Type.OBJECT, properties: { id: { type: Type.INTEGER }, why: { type: Type.STRING } }, required: ['id', 'why'] };
      const out = await ai.models.generateContent({
        model: GEMINI_MODEL, contents: prompt,
        config: { responseMimeType: 'application/json', maxOutputTokens: 3000, thinkingConfig: GEMINI_THINKING,
          responseSchema: { type: Type.OBJECT, properties: { orsonRant: { type: Type.STRING }, titan: pickT, gem: pickT }, required: ['orsonRant', 'titan', 'gem'] } },
      });
      const data = JSON.parse(out.text || '{}') as { orsonRant?: string; titan?: { id: number; why: string }; gem?: { id: number; why: string } };
      const ok = new Set(cands.map((c) => c.id));
      const valid = !!(data.titan && data.gem && ok.has(data.titan.id) && ok.has(data.gem.id) && data.titan.id !== data.gem.id);
      return NextResponse.json({ orsonRant: data.orsonRant || '', titan: valid ? data.titan : null, gem: valid ? data.gem : null, ...usage(out) });
    }
    if (body.type === 'judge') {
      const forcedTxt = body.forced ? ` THE BRACKET HAS ALREADY DECIDED: the winner is Film ${body.forced}. You MUST declare Film ${body.forced} the winner; your job is the theatre.` : '';
      const prompt = `${PERSONA}${forcedTxt}${body.roast ? ' ROAST MODE is on: tease both partners about their picks, affectionately.' : ''}${body.rematch ? ' This is a REMATCH with swapped sides: each partner defended the OTHER one\'s film, so mention it.' : ''}\nYou are the final judge of a movie-night tournament. Two finalists. Each partner wrote a 60-second pitch defending their film. Judge the PERSUASION of the pitches (specific, funny, honest beats long and generic), plus a small nudge for how well each film fits the couple. If a pitch is empty, that side forfeits unless both are empty. TAKEOVER MODE: nobody wrote a pitch. You have taken over the screen. Decide on fit for the couple, ratings and your own taste, and ignore any empty pitch. Also write the lines field: exactly 3 short punchy lines (max 14 words each) spoken to the room in order: 1) a dramatic opening about the two finalists, 2) a roast-with-love of the film you are ELIMINATING, 3) the drumroll before you name the winner. Do not name the winner in lines. Declare a winner and give a verdict of at most two short sentences, theatrical, kind to the loser.\n` +
        `Film A: ${body.a.t} (${body.a.y}), rating ${body.a.r}. Pitch by ${body.a.by}: "${body.a.pitch || '(nothing submitted)'}"\n` +
        `Film B: ${body.b.t} (${body.b.y}), rating ${body.b.r}. Pitch by ${body.b.by}: "${body.b.pitch || '(nothing submitted)'}"`;
      const out = await ai.models.generateContent({
        model: GEMINI_MODEL, contents: prompt,
        config: {
          responseMimeType: 'application/json', maxOutputTokens: 3000, thinkingConfig: GEMINI_THINKING,
          responseSchema: { type: Type.OBJECT, properties: { winner: { type: Type.STRING, enum: ['A', 'B'] }, verdict: { type: Type.STRING }, lines: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['winner', 'verdict', 'lines'] },
        },
      });
      const data = JSON.parse(out.text || '{}') as { winner?: string; verdict?: string; lines?: string[] };
      return NextResponse.json({ winner: body.forced ? body.forced : data.winner === 'B' ? 'B' : 'A', verdict: data.verdict || '', lines: (data.lines || []).slice(0, 3), ...usage(out) });
    }
    return NextResponse.json({ error: 'bad type' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}

function usage(out: unknown) {
  const u = (out as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } }).usageMetadata || {};
  const inTok = u.promptTokenCount || 0; const outTok = (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0);
  return { inTok, outTok, usd: (inTok / 1e6) * RATE.i + (outTok / 1e6) * RATE.o };
}
