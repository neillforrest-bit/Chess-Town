import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { db, hash, eq, limit, ipKey, tokenValid, displayName } from '@/lib/find/server';
import { actorHandCount, buildDuelDeck, buildDiscoveryShelf, buildPairsDeal, resolvePairs, scoreSwipe, duoLine, duoPub, DUO_MOODS, DUO_GENRES, DOC_SHELVES, PAIRS_FLOORS, PAIRS_MAX_WAGER, buildMatchDeal, matchPool, matchLiveTotals, matchRound, matchLeader, matchSafeNeeded, matchSafeActive, matchTurnEnd, resolveMatchBid, matchWinnerSeat, MATCH_CHIPS, MATCH_PER_ACTOR, type DuoRoom, type DuoSeat, type DuoOp } from '@/lib/duo';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const reply = (x: unknown, status = 200) => NextResponse.json(x, { status, headers: { 'Cache-Control': 'no-store' } });
const blank = (token: string, name: string): DuoSeat => ({ hash: hash(token), name, tokens: 0, earned: 0, side: null, spent: 0, locked: false, double: false, wild: [] });
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function read(code: string) {
  const { data, error } = await db().from('find_rooms').select('state').eq('code', code).maybeSingle();
  if (error) throw Error();
  const s = data?.state;
  return s?.flow === 'movie-duo-v1' && s.expires > Date.now() ? (s as DuoRoom) : null;
}

function newBout(s: DuoRoom) {
  s.pair = s.queue.splice(0, 2);
  s.seats.forEach((p) => { p.side = null; p.spent = 0; p.locked = false; p.double = false; });
  s.tie = []; s.tieSpun = false;
  s.phase = 'bout';
  s.line = duoLine(s, 'bout');
}

function finishBout(s: DuoRoom, winner: number, tied: boolean) {
  const scores = s.pair.map((_, side) => s.seats.reduce((n, p) => n + (p.side === side ? p.spent * (p.double ? 2 : 1) : 0), 0));
  s.winner = winner;
  s.advanced.push(winner);
  s.history.push({ pair: s.pair, scores, winner, tied });
  s.phase = 'result';
  s.line = 'Winner advances. Spent tokens stay spent.';
}

function scores(s: DuoRoom) {
  return s.pair.map((_, side) => s.seats.reduce((n, p) => n + (p.side === side ? p.spent * (p.double ? 2 : 1) : 0), 0));
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!/^[A-Z2-9]{8}$/.test(code)) return reply({ error: 'Invalid room' }, 400);
    const spectate = new URL(req.url).searchParams.get('spectate') === '1';
    if (!await limit((spectate ? 'duo-spectate:' : 'duo-read:') + ipKey(req), 240, 60)) return reply({ error: 'Pause before refreshing' }, 429);
    const s = await read(code);
    if (!s) return reply({ error: 'Room not found or expired' }, 404);
    if (spectate) return reply(duoPub(s, -1, true));
    const token = req.headers.get('x-wheel-seat') || '';
    if (!tokenValid(token)) return reply({ error: 'Saved browser seat required' }, 403);
    const you = s.seats.findIndex((p) => eq(p.hash, hash(token)));
    return you < 0 ? reply({ error: 'Original invite required' }, 403) : reply(duoPub(s, you));
  } catch { return reply({ error: 'Room storage unavailable. Keep your browser seat and retry.' }, 503); }
}

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (process.env.VERCEL_ENV === 'production') return reply({ error: 'Preview only' }, 403);
    if (req.headers.get('origin') !== new URL(req.url).origin) return reply({ error: 'Same-site requests only' }, 403);
    const { code } = await params;
    if (!/^[A-Z2-9]{8}$/.test(code)) return reply({ error: 'Invalid room' }, 400);
    const token = req.headers.get('x-wheel-seat') || '';
    const text = await req.text();
    if (text.length > 6000) return reply({ error: 'Request too large' }, 413);
    const b = JSON.parse(text);
    if (!/^[a-f0-9]{32}$/.test(b.actionId || '')) return reply({ error: 'Action receipt required' }, 400);
    if (b.type !== 'tvCreate' && !tokenValid(token)) return reply({ error: 'Saved browser seat required' }, 403);
    if (b.type !== 'pairFindActors' && !await limit('duo-write:' + ipKey(req), 100, 60)) return reply({ error: 'Please pause before more actions' }, 429);

    if (b.type === 'pairFindActors') {
      if (!await limit('duo-actor-search:' + ipKey(req), 90, 60)) return reply({ error: 'Pause a moment, then search again.' }, 429);
      const q = String(b.q || '').trim();
      if (q.length < 2 || q.length > 80) return reply({ results: [] });
      const key = process.env.TMDB_API_KEY;
      if (!key) return reply({ error: 'Actor search is unavailable. Retry shortly.' }, 503);
      try {
        const r = await fetch('https://api.themoviedb.org/3/search/person?' + new URLSearchParams({ api_key: key, query: q, include_adult: 'false', language: 'en-US' }), { signal: AbortSignal.timeout(6000) });
        if (!r.ok) throw Error();
        const d = await r.json();
        const seen = new Set<string>();
        return reply({ results: (d.results || [])
          .filter((x: { id: number; gender?: number; popularity?: number; known_for_department: string; known_for?: { media_type?: string }[] }) => Number.isSafeInteger(x.id) && x.known_for_department === 'Acting' && x.gender !== 0 && (x.known_for || []).filter((k) => k.media_type === 'movie').length >= 2 && (x.popularity || 0) >= 0.5)
          .filter((x: { name: string }) => { const k = x.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
          .slice(0, 4)
          .map((x: { id: number; name: string; known_for?: { title?: string; media_type?: string }[] }) => ({ id: x.id, name: x.name, known: (x.known_for || []).filter((m) => m.media_type === 'movie').map((m) => m.title).filter(Boolean).slice(0, 2).join(' · ') })) });
      } catch { return reply({ error: 'Actor search is unavailable. Retry shortly.' }, 503); }
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      let s = await read(code);
      const version = s?.v;
      let you = s ? s.seats.findIndex((p) => eq(p.hash, hash(token))) : -1;

      if (b.type === 'tvCreate' && !s) {
        if (!tokenValid(b.invite)) return reply({ error: 'Invite required' }, 400);
        if (!await limit('duo-create:' + ipKey(req), 12, 86400)) return reply({ error: 'Daily room limit reached' }, 429);
        s = { flow: 'movie-duo-v1', v: 0, round: 0, expires: Date.now() + 7 * 86400000, inviteHash: hash(b.invite), receipts: [], seats: [], mode: null, phase: 'lobby', genres: DUO_GENRES, picks: [[], []], genreLocked: [], mood: '', shelf: [], extras: [], ops: [{}, {}], swipeDone: [], sync: 0, overlaps: [], loners: [[], []], wilds: [], finalists: [], revealAck: [], queue: [], pair: [], stage: 0, advanced: [], history: [], tie: [], tieSpun: false, winner: null, confirmed: [], pairs: null, match: null, openJoin: true, tvInvite: b.invite, line: 'Both players: scan the big QR, or type the code on your phones.' };
        you = -1;
      } else if (b.type === 'create' && !s) {
        if (!tokenValid(b.invite)) return reply({ error: 'Invite required' }, 400);
        if (!await limit('duo-create:' + ipKey(req), 12, 86400)) return reply({ error: 'Daily room limit reached' }, 429);
        s = { flow: 'movie-duo-v1', v: 0, round: 0, expires: Date.now() + 7 * 86400000, inviteHash: hash(b.invite), receipts: [], seats: [blank(token, displayName(b.name))], mode: null, phase: 'lobby', genres: DUO_GENRES, picks: [[], []], genreLocked: [], mood: '', shelf: [], extras: [], ops: [{}, {}], swipeDone: [], sync: 0, overlaps: [], loners: [[], []], wilds: [], finalists: [], revealAck: [], queue: [], pair: [], stage: 0, advanced: [], history: [], tie: [], tieSpun: false, winner: null, confirmed: [], pairs: null, match: null, line: duoLine({ seats: [{ name: displayName(b.name) }] } as DuoRoom, 'lobby') };
        you = 0;
      } else if (!s) return reply({ error: 'Room not found or expired' }, 404);

      if (b.type === 'join' && you < 0) {
        if (s.openJoin ? s.seats.length >= 2 : (!tokenValid(b.invite) || !eq(hash(b.invite), s.inviteHash))) return reply({ error: s.openJoin ? 'Both seats are taken.' : 'Invalid invite' }, 403);
        if (s.phase !== 'lobby' || (!s.openJoin && s.seats.length !== 1)) return reply({ error: 'Exactly two players. This room is full or has started.' }, 409);
        s.seats.push(blank(token, displayName(b.name)));
        you = s.seats.length - 1;
        if (s.seats.length === 2) s.line = 'Both seats taken. Host: pick the game.';
      } else if (you < 0) return reply({ error: 'This browser does not own a seat' }, 403);

      const oldPhase = s.phase;
      const receipt = hash(token) + ':' + b.actionId;
      if (s.receipts.includes(receipt)) return reply(duoPub(s, you));
      if (!['create', 'tvCreate', 'join'].includes(b.type)) {
        if (b.round !== s.round) return reply({ error: 'The game moved on. Retry from the current screen.' }, 409);
        const me = s.seats[you], other = s.seats[1 - you];
        switch (b.type) {
          case 'tvInvite': {
            if (s.phase !== 'lobby') return reply({ error: 'Join QR shows during the lobby only' }, 409);
            if (b.on) {
              if (!tokenValid(b.invite) || !eq(hash(b.invite), s.inviteHash)) return reply({ error: 'Only your own invite can go on the TV' }, 403);
              s.tvInvite = b.invite;
            } else delete s.tvInvite;
            break;
          }
          case 'start': {
            if (you !== 0 || s.phase !== 'lobby' || s.seats.length !== 2) return reply({ error: 'Host starts with exactly two players' }, 409);
            s.phase = 'mode';
            s.line = 'Host picks tonight\'s duel.';
            break;
          }
          case 'chooseMode': {
            if (s.phase !== 'mode' || you !== 0 || !['duel', 'discovery', 'pairs', 'match'].includes(b.mode)) return reply({ error: 'Host chooses the game' }, 409);
            s.mode = b.mode;
            if (s.mode === 'pairs') {
              s.pairs = { actors: [null, null], floor: 60, flip: null, cards: [], piles: [], turnIdx: 0, active: 0, pendingPass: false, wagers: [null, null], totals: null, points: null };
              s.phase = 'actors';
            } else if (s.mode === 'match') {
              s.match = { actors: [null, null], cards: [], status: [], faceUp: null, faceUpMiss: false, safeIdx: null, safeBy: null, safeRound: 0, chips: [MATCH_CHIPS, MATCH_CHIPS], turn: 0, turnsTaken: 0, claim: null, bids: [null, null], pitches: [null, null], totals: null, winnerSeat: null, lastEvent: '' };
              s.phase = 'mCast';
            } else s.phase = 'genres';
            s.line = duoLine(s, 'mode-' + s.mode);
            break;
          }
          case 'pairActor': {
            if (s.phase !== 'actors' || !s.pairs) return reply({ error: 'Actors lock before the deal only' }, 409);
            if (!Number.isSafeInteger(b.personId) || typeof b.personName !== 'string' || !b.personName.trim()) return reply({ error: 'Pick an actor from the search' }, 400);
            const poolSize = await actorHandCount(b.personId);
            if (poolSize === null) return reply({ error: 'Film credits check is unavailable. Retry shortly.' }, 503);
            if (poolSize < 5) return reply({ error: b.personName.trim().slice(0, 60) + ' has only ' + poolSize + ' scored film' + (poolSize === 1 ? '' : 's') + ' on record, too thin for a five-film hand. Pick a busier actor.' }, 409);
            s.pairs.actors[you] = { id: b.personId, name: b.personName.trim().slice(0, 60) };
            s.line = s.seats[you].name + ' brought ' + s.pairs.actors[you]!.name + ' to the table.';
            break;
          }
          case 'pairFloor': {
            if (s.phase !== 'actors' || !s.pairs || you !== 0 || !PAIRS_FLOORS.includes(b.floor)) return reply({ error: 'Host sets the floor' }, 409);
            s.pairs.floor = b.floor;
            break;
          }
          case 'pairDeal': {
            if (s.phase !== 'actors' || !s.pairs || you !== 0) return reply({ error: 'Host deals once both actors are in' }, 409);
            if (!s.pairs.actors[0] || !s.pairs.actors[1]) return reply({ error: 'Both actors first' }, 409);
            const deal = await buildPairsDeal(code, s.round, [s.pairs.actors[0], s.pairs.actors[1]] as { id: number; name: string }[], s.pairs.floor);
            if (deal.error || !deal.cards) { s.line = deal.error || 'The deck refused. Try again.'; return reply({ error: s.line }, 409); }
            if (deal.extras?.length) s.extras = [...s.extras.filter((x) => !deal.extras!.some((e) => e.id === x.id)), ...deal.extras];
            s.pairs.cards = deal.cards;
            s.pairs.piles = deal.cards.map(() => null);
            s.pairs.turnIdx = 0; s.pairs.active = 0; s.pairs.pendingPass = false;
            s.pairs.flip = randomInt(2) === 0 ? 'critics' : 'audience';
            s.phase = 'deal';
            s.line = duoLine(s, 'deal') + (deal.dipped && deal.dipped.length ? ' The ' + s.pairs.floor + '+ pool ran dry for ' + deal.dipped.join(' and ') + ', so Orson dealt their best verified films below the floor. Five real films each, no block.' : '');
            break;
          }
          case 'pairAct': {
            const p = s.pairs;
            if (s.phase !== 'deal' || !p || p.pendingPass || you !== p.active) return reply({ error: 'Not your card to call' }, 409);
            if (![0, 1, -1].includes(b.pile)) return reply({ error: 'Claim a pile or pass' }, 400);
            if (b.pile === -1) { p.pendingPass = true; s.line = s.seats[you].name + ' passes. Bluff, or genuine confusion?'; }
            else {
              p.piles[p.turnIdx] = b.pile;
              p.turnIdx++; p.active = 1 - p.active;
              if (p.turnIdx >= p.cards.length) { s.phase = 'wager'; s.line = duoLine(s, 'wager'); }
            }
            break;
          }
          case 'pairRespond': {
            const p = s.pairs;
            if (s.phase !== 'deal' || !p || !p.pendingPass || you === p.active) return reply({ error: 'Waiting on the other player' }, 409);
            if (![0, 1, -1].includes(b.pile)) return reply({ error: 'Claim a pile or let it go' }, 400);
            p.piles[p.turnIdx] = b.pile; // -1 = discarded
            p.pendingPass = false;
            p.turnIdx++; p.active = 1 - p.active;
            if (p.turnIdx >= p.cards.length) { s.phase = 'wager'; s.line = duoLine(s, 'wager'); }
            break;
          }
          case 'pairWager': {
            const p = s.pairs;
            if (s.phase !== 'wager' || !p || p.wagers[you] != null) return reply({ error: 'Wager already locked' }, 409);
            if (!Number.isSafeInteger(b.amount) || b.amount < 0 || b.amount > PAIRS_MAX_WAGER) return reply({ error: 'Wager 0 to ' + PAIRS_MAX_WAGER + ' points' }, 400);
            p.wagers[you] = b.amount;
            if (p.wagers[0] != null && p.wagers[1] != null) {
              resolvePairs(s);
              s.phase = 'pReveal';
              s.line = duoLine(s, 'pReveal');
            } else s.line = s.seats[you].name + ' has wagered. Silently.';
            break;
          }
          case 'pairRevealDone': {
            if (s.phase !== 'pReveal' || you !== 0) return reply({ error: 'Host calls the scores' }, 409);
            const p = s.pairs!;
            const pts = p.points || [0, 0];
            const tot = p.totals || [0, 0];
            const w = pts[0] !== pts[1] ? (pts[0] > pts[1] ? 0 : 1) : tot[0] !== tot[1] ? (tot[0] > tot[1] ? 0 : 1) : 0;
            const pile = p.cards.filter((c, i) => p.piles[i] === w);
            if (!pile.length) {
              s.phase = 'done';
              s.line = 'Points on the board. Jemma takes a bow.';
            } else {
              s.phase = 'pPick';
              s.line = s.seats[w].name + ' won the night. Their pile, their pick for tonight’s film.';
            }
            break;
          }
          case 'pairPickFilm': {
            const p = s.pairs;
            if (s.phase !== 'pPick' || !p) return reply({ error: 'No pick due' }, 409);
            const pts = p.points || [0, 0];
            const tot = p.totals || [0, 0];
            const w = pts[0] !== pts[1] ? (pts[0] > pts[1] ? 0 : 1) : tot[0] !== tot[1] ? (tot[0] > tot[1] ? 0 : 1) : 0;
            if (you !== w) return reply({ error: 'The winner picks tonight’s film' }, 403);
            if (!Number.isSafeInteger(b.id) || !p.cards.some((c, i) => c.id === b.id && p.piles[i] === w)) return reply({ error: 'Pick a film from your own pile' }, 400);
            p.watchPick = b.id;
            s.winner = b.id;
            s.confirmed = [];
            s.phase = 'pConfirm';
            s.line = s.seats[w].name + ' picked tonight’s film. Both phones confirm it.';
            break;
          }
          case 'pairConfirmWatch': {
            if (s.phase !== 'pConfirm' || !s.pairs?.watchPick) return reply({ error: 'Nothing to confirm yet' }, 409);
            if (s.confirmed.includes(you)) return reply({ error: 'Already confirmed' }, 409);
            s.confirmed.push(you);
            if (s.confirmed.length === 2) { s.phase = 'done'; s.line = 'Both in. That’s tonight’s film, and Jemma takes a bow.'; }
            else s.line = s.seats[you].name + ' is in. One more yes.';
            break;
          }
          case 'matchActor': {
            if (s.phase !== 'mCast' || !s.match) return reply({ error: 'Actors lock before the deal only' }, 409);
            if (!Number.isSafeInteger(b.personId) || typeof b.personName !== 'string' || !b.personName.trim()) return reply({ error: 'Pick an actor from the search' }, 400);
            const pool = await matchPool(b.personId);
            if (pool === null) return reply({ error: 'Film credits check is unavailable. Retry shortly.' }, 503);
            if (pool.length < MATCH_PER_ACTOR) return reply({ error: b.personName.trim().slice(0, 60) + ' has only ' + pool.length + ' films that fit (scored 60+, no sci-fi or animation). Pick another star.' }, 409);
            s.match.actors[you] = { id: b.personId, name: b.personName.trim().slice(0, 60) };
            s.line = s.seats[you].name + ' brought ' + s.match.actors[you]!.name + ' to the table.';
            break;
          }
          case 'matchDeal': {
            if (s.phase !== 'mCast' || !s.match || you !== 0) return reply({ error: 'Host deals once both actors are in' }, 409);
            if (!s.match.actors[0] || !s.match.actors[1]) return reply({ error: 'Both actors first' }, 409);
            const deal = await buildMatchDeal(code, [s.match.actors[0], s.match.actors[1]] as { id: number; name: string }[]);
            if (deal.error || !deal.cards) { s.line = deal.error || 'The deck refused. Try again.'; return reply({ error: s.line }, 409); }
            if (deal.extras?.length) s.extras = [...s.extras.filter((x) => !deal.extras!.some((e) => e.id === x.id)), ...deal.extras];
            s.match.cards = deal.cards;
            s.match.status = deal.cards.map(() => -1);
            s.match.turn = 0; s.match.turnsTaken = 0; s.match.faceUp = null; s.match.faceUpMiss = false;
            s.phase = 'mFlip';
            s.line = duoLine(s, 'mFlip');
            break;
          }
          case 'matchSafe': {
            const m = s.match;
            if (s.phase !== 'mFlip' || !m || !matchSafeNeeded(s)) return reply({ error: 'No safe card is due' }, 409);
            if (you !== matchLeader(matchLiveTotals(s))) return reply({ error: 'Only the points leader locks a safe card' }, 403);
            if (b.card === -1 || b.card === null) { m.safeRound = matchRound(m); m.safeIdx = null; m.safeBy = null; s.line = s.seats[you].name + ' locks nothing. Brave.'; break; }
            if (!Number.isSafeInteger(b.card) || b.card < 0 || b.card >= m.cards.length || m.status[b.card] !== -1) return reply({ error: 'Lock a face-down card' }, 400);
            m.safeIdx = b.card; m.safeBy = you; m.safeRound = matchRound(m);
            s.line = s.seats[you].name + ' locks a safe card. Nobody says which.';
            break;
          }
          case 'matchFlip': {
            const m = s.match;
            if (s.phase !== 'mFlip' || !m) return reply({ error: 'No flip due' }, 409);
            if (matchSafeNeeded(s)) return reply({ error: 'The points leader locks a safe card first' }, 409);
            if (you !== m.turn) return reply({ error: 'Not your flip' }, 409);
            if (!Number.isSafeInteger(b.card) || b.card < 0 || b.card >= m.cards.length || m.status[b.card] !== -1) return reply({ error: 'Flip a face-down card' }, 400);
            const safeOn = matchSafeActive(m);
            if (safeOn != null && b.card === safeOn && you !== m.safeBy) {
              // a lock can never block the last face-down card: anyone whose turn it is may flip it (a normal flip — the unchallengeable perk stays the lock owner's)
              if (m.status.filter((st) => st === -1).length > 1) return reply({ error: 'That card is locked this round' }, 409);
            }
            m.faceUp = b.card;
            if (m.cards[b.card].actor === you) {
              m.faceUpMiss = false;
              if (safeOn === b.card && m.safeBy === you) {
                m.status[b.card] = you;
                s.line = s.seats[you].name + ' banks their safe card. Unchallengeable.';
                m.lastEvent = s.line;
                matchTurnEnd(s);
                if (m.totals) { s.phase = 'mPitch'; s.line = duoLine(s, 'mPitch'); }
              } else {
                m.claim = { card: b.card, by: you };
                s.phase = 'mClaim';
                s.line = duoLine(s, 'mClaim');
              }
            } else {
              m.faceUpMiss = true;
              s.line = 'Not ' + s.seats[you].name + '\'s film. Back it goes. Remember where.';
              m.lastEvent = s.line;
              matchTurnEnd(s);
              if (m.totals) { s.phase = 'mPitch'; s.line = duoLine(s, 'mPitch'); }
            }
            break;
          }
          case 'matchClaimResp': {
            const m = s.match;
            if (s.phase !== 'mClaim' || !m?.claim) return reply({ error: 'No claim to answer' }, 409);
            if (you === m.claim.by) return reply({ error: 'The other player answers the claim' }, 409);
            if (b.challenge) {
              m.bids = [null, null];
              s.phase = 'mBid';
              s.line = duoLine(s, 'mBid');
            } else {
              m.status[m.claim.card] = m.claim.by;
              s.line = s.seats[1 - m.claim.by].name + ' lets it go. ' + s.seats[m.claim.by].name + ' banks the film.';
              m.lastEvent = s.line;
              m.claim = null;
              matchTurnEnd(s);
              s.phase = m.totals ? 'mPitch' : 'mFlip';
              if (m.totals) s.line = duoLine(s, 'mPitch');
            }
            break;
          }
          case 'matchBid': {
            const m = s.match;
            if (s.phase !== 'mBid' || !m || !m.cards.length) return reply({ error: 'No bids due' }, 409);
            if (m.bids[you] != null) return reply({ error: 'Bid already locked' }, 409);
            if (!Number.isSafeInteger(b.chips) || b.chips < 0 || b.chips > m.chips[you]) return reply({ error: 'Bid 0 to ' + m.chips[you] + ' chips' }, 400);
            const backing: number[] = Array.isArray(b.backing) ? [...new Set((b.backing as unknown[]).filter((i): i is number => typeof i === 'number' && Number.isSafeInteger(i)))] : [];
            if (backing.length > 12 || backing.some((i) => i < 0 || i >= m.cards.length || m.status[i] !== you)) return reply({ error: 'Back a bid only with films you have claimed' }, 400);
            m.bids[you] = { chips: b.chips, backing };
            if (m.bids[0] != null && m.bids[1] != null) {
              resolveMatchBid(s);
              s.line = m.lastEvent;
              matchTurnEnd(s);
              s.phase = m.totals ? 'mPitch' : 'mFlip';
              if (m.totals) s.line = duoLine(s, 'mPitch');
            } else s.line = s.seats[you].name + ' has bid. Silently.';
            break;
          }
          case 'matchPitch': {
            const m = s.match;
            if (s.phase !== 'mPitch' || !m?.totals) return reply({ error: 'Pitches come after the grid' }, 409);
            if (m.pitches[you] != null) return reply({ error: 'Pitch already in' }, 409);
            const text = String(b.text || '').trim().slice(0, 240);
            if (!text) return reply({ error: 'Say something. One line will do.' }, 400);
            m.pitches[you] = text;
            if (m.pitches[0] != null && m.pitches[1] != null) {
              m.winnerSeat = matchWinnerSeat(s);
              s.phase = 'mReveal';
              s.line = duoLine(s, 'mReveal');
            } else s.line = s.seats[you].name + ' has pitched. The other phone is still typing.';
            break;
          }
          case 'matchPickFilm': {
            const m = s.match;
            if (s.phase !== 'mReveal' || !m || m.winnerSeat == null) return reply({ error: 'No pick due' }, 409);
            if (you !== m.winnerSeat) return reply({ error: 'The winner picks tonight’s film' }, 403);
            if (!Number.isSafeInteger(b.id) || !m.cards.some((c, i) => c.id === b.id && (m.status[i] === 0 || m.status[i] === 1))) return reply({ error: 'Pick any film from the two collections' }, 400);
            m.watchPick = b.id;
            s.winner = b.id;
            s.confirmed = [];
            s.phase = 'mConfirm';
            s.line = s.seats[m.winnerSeat].name + ' picked tonight’s film. Both phones confirm it.';
            break;
          }
          case 'matchConfirmWatch': {
            if (s.phase !== 'mConfirm' || !s.match?.watchPick) return reply({ error: 'Nothing to confirm yet' }, 409);
            if (s.confirmed.includes(you)) return reply({ error: 'Already confirmed' }, 409);
            s.confirmed.push(you);
            if (s.confirmed.length === 2) { s.phase = 'done'; s.line = 'Both in. That’s tonight’s film.'; }
            else s.line = s.seats[you].name + ' is in. One more yes.';
            break;
          }
          case 'chooseGenres': {
            if (s.phase !== 'genres' || s.genreLocked.includes(you) || !Array.isArray(b.genres)) return reply({ error: 'Choose before locking' }, 409);
            if (s.mode === 'duel') {
              if (b.genres.length !== 1 || !DUO_MOODS.some((m) => m.name === b.genres[0])) return reply({ error: 'Pick one mood' }, 400);
            } else {
              const g = b.genres as string[];
              const doc = g.includes('Documentary');
              if (doc) {
                if (g.length > 2 || (g.length === 2 && !DOC_SHELVES.some((x) => x.id === g[1]))) return reply({ error: 'Pick Documentary and at most one shelf' }, 400);
              } else if (!g.length || g.length > 2 || g.some((x: unknown) => typeof x !== 'string' || !s!.genres.includes(x as string))) return reply({ error: 'Pick one or two genres' }, 400);
            }
            s.picks[you] = b.genres;
            s.genreLocked.push(you);
            s.line = 'P' + (you + 1) + ' locked in.';
            if (s.genreLocked.length === 2) {
              if (s.mode === 'duel') {
                const { shelf, mood } = buildDuelDeck(code, s.picks[0][0], s.picks[1][0]);
                if (shelf.length < 8) { s.genreLocked = []; s.picks = [[], []]; return reply({ error: 'That mood pairing dealt too thin a deck. Try another.' }, 409); }
                s.shelf = shelf; s.mood = mood; s.extras = [];
              } else {
                const chosen = [...new Set(s.picks.flat())];
                const { shelf, extras } = await buildDiscoveryShelf(chosen, randomInt(1, 1000000));
                if (shelf.length < 4) { s.genreLocked = []; s.picks = [[], []]; return reply({ error: 'Only ' + shelf.length + ' deep cuts on that shelf. Widen the genres and try again.' }, 409); }
                s.shelf = shelf; s.extras = extras; s.mood = chosen.map((g) => DOC_SHELVES.find((x) => x.id === g)?.n || g).join(' + ');
              }
              s.ops = [{}, {}]; s.swipeDone = [];
              s.phase = 'swipe';
              s.line = duoLine(s, 'shelf');
            }
            break;
          }
          case 'opinion': {
            if (s.phase !== 'swipe' || s.swipeDone.includes(you) || !s.shelf.includes(b.id) || !['keep', 'pass', 'seen'].includes(b.op)) return reply({ error: 'Card not on the shelf, or your shelf is finished' }, 409);
            const keeps = Object.values(s.ops[you]).filter((o) => o === 'keep').length;
            if (b.op === 'keep' && s.ops[you][b.id] !== 'keep' && keeps >= 5) return reply({ error: 'Five keeps maximum. Un-keep something first.' }, 409);
            s.ops[you][b.id] = b.op as DuoOp;
            break;
          }
          case 'finishSwipe': {
            if (s.phase !== 'swipe' || s.swipeDone.includes(you)) return reply({ error: 'Shelf already finished' }, 409);
            if (Object.keys(s.ops[you]).length < s.shelf.length) return reply({ error: 'Call every card first. Keep, pass or seen.' }, 409);
            s.swipeDone.push(you);
            if (s.swipeDone.length === 2) {
              scoreSwipe(s);
              s.phase = 'reveal'; s.revealAck = [];
              s.line = duoLine(s, 'reveal');
            } else s.line = 'P' + (you + 1) + ' finished the shelf.';
            break;
          }
          case 'ready': {
            if (s.phase === 'reveal') {
              if (!s.revealAck.includes(you)) s.revealAck.push(you);
              if (s.revealAck.length === 2) {
                s.revealAck = [];
                s.queue = [...s.finalists].sort(() => randomInt(2) ? 1 : -1);
                s.advanced = []; s.stage = 0; s.winner = null;
                newBout(s);
              }
            } else if (s.phase === 'result') {
              // result readiness reuses revealAck as the ack ledger between bouts
              if (!s.revealAck.includes(you)) s.revealAck.push(you);
              if (s.revealAck.length === 2) {
                s.revealAck = [];
                if (s.queue.length) newBout(s);
                else if (s.advanced.length > 1) { s.queue = [...s.advanced]; s.advanced = []; s.stage++; newBout(s); }
                else { s.phase = 'confirm'; s.confirmed = []; s.line = 'One film left standing. Both confirm it.'; }
              }
            } else return reply({ error: 'Nothing to acknowledge right now' }, 409);
            break;
          }
          case 'pull': {
            if (s.phase !== 'bout' || me.locked || ![0, 1].includes(b.side) || me.tokens < 1 || (me.side !== null && me.side !== b.side)) return reply({ error: 'Use your unlocked side and available tokens. Switch wildcard changes sides.' }, 409);
            me.side = b.side; me.spent++; me.tokens--;
            break;
          }
          case 'wild': {
            if (s.phase !== 'bout' || me.locked || !['double', 'steal', 'switch'].includes(b.kind) || me.wild.includes(b.kind)) return reply({ error: 'Wildcard unavailable' }, 409);
            if (b.kind === 'double') { if (!me.spent) return reply({ error: 'Spend at least one token before doubling' }, 409); me.double = true; }
            else if (b.kind === 'steal') { const n = Math.min(2, other.tokens); if (!n) return reply({ error: 'No unspent rival tokens. Wildcard not used.' }, 409); other.tokens -= n; me.tokens += n; }
            else { if (me.side === null) return reply({ error: 'Make a pull before switching' }, 409); me.side = 1 - me.side; }
            me.wild.push(b.kind);
            s.line = duoLine(s, b.kind, you);
            break;
          }
          case 'lockBout': {
            if (s.phase !== 'bout' || me.locked) return reply({ error: 'Pull already locked' }, 409);
            me.locked = true;
            if (s.seats.every((p) => p.locked)) {
              const sc = scores(s);
              if (sc[0] === sc[1]) { s.phase = 'tie'; s.tie = []; s.line = duoLine(s, 'tie'); }
              else finishBout(s, s.pair[sc[0] > sc[1] ? 0 : 1], false);
            }
            break;
          }
          case 'tieChoose': {
            if (s.phase !== 'tie' || ![...s.pair, -1].includes(b.id)) return reply({ error: 'Choose a tied film or the wheel' }, 409);
            s.tie[you] = b.id;
            if (s.tie[0] !== undefined && s.tie[0] === s.tie[1]) {
              if (b.id === -1) { s.tieSpun = true; finishBout(s, s.pair[randomInt(2)], true); }
              else finishBout(s, b.id, true);
            }
            break;
          }
          case 'confirm': {
            if (s.phase !== 'confirm') return reply({ error: 'Finish the duel first' }, 409);
            if (!s.confirmed.includes(you)) s.confirmed.push(you);
            if (s.confirmed.length === 2) { s.phase = 'done'; s.line = duoLine(s, 'done'); }
            break;
          }
          default: return reply({ error: 'Unknown action' }, 400);
        }
      }
      if (s.phase !== oldPhase) s.round++;
      s.v++;
      s.receipts = [...s.receipts.slice(-95), receipt];
      const saved = version === undefined
        ? await db().from('find_rooms').insert({ code, state: s })
        : await db().from('find_rooms').update({ state: s, updated_at: new Date().toISOString() }).eq('code', code).eq('state->>v', String(version)).select('code');
      if (saved.error) return reply({ error: 'Could not save. Keep your browser seat and retry.' }, 503);
      if (version === undefined || saved.data?.length) return reply(duoPub(s, you));
    }
    return reply({ error: 'Another player acted at the same time. Retry.' }, 409);
  } catch { return reply({ error: 'Action not saved. Keep your seat and retry.' }, 503); }
}
