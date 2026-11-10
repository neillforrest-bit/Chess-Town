"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { applyPartyAction, createParty, expireParty, makePartySeat, PARTY_LIMIT, partyContext, partyView, prepareParty, type PartyAction, type PartyRoom, type PartyView } from './trivia-party';
import { LOCAL_CATEGORIES } from './trivia-local';
import { loadTriviaSettings } from './trivia-settings';

type Snapshot = { type: 'room'; room: PartyView; seatId: string; online: string[]; busy: boolean; ack?: string };
type Wire = Snapshot | { type: 'join'; protocol: 1; token: string } | { type: 'ping' } | { type: 'action'; id: string; context: string; body: PartyAction } | { type: 'error'; message: string; ack?: string; terminal?: boolean };
export function usePartyConnection(roomId: string, isHost: boolean) {
  const [view, setView] = useState<PartyView | null>(null);
  const [seatId, setSeatId] = useState(isHost ? 'host' : '');
  const [online, setOnline] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Opening the party table...');
  const [error, setError] = useState('');
  const [stopped, setStopped] = useState(false);
  const [relay, setRelay] = useState<boolean | null>(null);
  const actionRef = useRef<(body: PartyAction) => void>(() => undefined);
  const retryRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    let disposed = false, peer: Peer | null = null, hostLink: DataConnection | null = null;
    let room: PartyRoom | null = isHost ? createParty('host', loadTriviaSettings()) : null;
    let busyNow = false, attempts = 0, joined = false, recovering = false, hostSeen = 0, healthySince = 0;
    const links = new Map<string, DataConnection>();
    const tokenSeats = new Map<string, string>();
    const seen = new Set<string>();
    const lastSeen = new Map<string, number>();
    const pending = new Map<string, { context: string; body: PartyAction }>();
    const offers = new Set<DataConnection>();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let interval: ReturnType<typeof setInterval> | undefined;
    let queue = Promise.resolve();
    let localView: PartyView | null = null;
    let localSeat = isHost ? 'host' : '';
    const tokenKey = `ct-party-seat-${roomId}`;
    let token = '';
    if (!isHost) {
      try { token = localStorage.getItem(tokenKey) || crypto.randomUUID(); localStorage.setItem(tokenKey, token); }
      catch { token = crypto.randomUUID(); }
    }
    const later = (fn: () => void, ms: number) => { const t = setTimeout(() => { timers.delete(t); if (!disposed) fn(); }, ms); timers.add(t); };
    const liveSeats = () => ['host', ...[...links.keys()].filter(id => Date.now() - (lastSeen.get(id) || 0) < 10000)];
    const send = (link: DataConnection, message: Wire) => { try { if (link.open) link.send(message); } catch { /* heartbeat repairs the link */ } };
    const snapshot = (id: string, link: DataConnection, ack?: string) => {
      if (!room) return;
      send(link, { type: 'room', room: partyView(room, id), seatId: id, online: liveSeats(), busy: busyNow, ack });
    };
    const publish = () => {
      if (!room || disposed) return;
      localView = partyView(room, 'host'); setView(localView); setOnline(liveSeats()); setBusy(busyNow);
      links.forEach((link, id) => snapshot(id, link));
    };
    const hostAction = (id: string, body: PartyAction, context: string, ack?: string) => {
      queue = queue.then(async () => {
        if (!room || disposed) return;
        const link = links.get(id);
        if (ack && seen.has(ack)) { if (link) snapshot(id, link, ack); return; }
        if (context !== partyContext(room) || busyNow) { if (link) snapshot(id, link, ack); return; }
        if (ack) { seen.add(ack); if (seen.size > 2048) seen.delete(seen.values().next().value!); }
        try {
          if (body.start && id === 'host' && (room.phase === 'lobby' || room.phase === 'intro') && room.seats.some(s => s.id !== 'host' && (!links.get(s.id)?.open || Date.now() - (lastSeen.get(s.id) || 0) > 10000))) throw new Error('Wait for every saved seat to reconnect, or remove an absent seat before preparing.');
          if (body.removeSeat && id === 'host' && room.phase === 'lobby' && body.removeSeat !== 'host') {
            const removed = body.removeSeat;
            for (const [token, seat] of tokenSeats) if (seat === removed) tokenSeats.delete(token);
            const old = links.get(removed); links.delete(removed);
            if (old) { send(old, { type: 'error', terminal: true, message: 'The host removed this lobby seat. Return to the pub door.' }); old.close(); }
          }
          if (body.start && id === 'host' && room.phase === 'lobby') {
            busyNow = true; publish();
            try { room = await prepareParty(room, category => LOCAL_CATEGORIES.find(c => c.id === category)?.name); }
            finally { busyNow = false; }
          } else room = applyPartyAction(room, id, body);
          publish(); if (link) snapshot(id, link, ack);
        } catch (e) {
          const message = e instanceof Error ? e.message : 'That action did not land.';
          if (id === 'host') setError(message); else if (link) send(link, { type: 'error', message, ack });
          publish();
        }
      }).catch(() => { if (!disposed) setError('The host could not apply that action.'); });
    };
    actionRef.current = body => {
      setError('');
      if (isHost && room) hostAction('host', body, partyContext(room));
      else if (localView) {
        const id = crypto.randomUUID(), context = partyContext(localView);
        pending.set(id, { context, body });
        if (hostLink?.open) send(hostLink, { type: 'action', id, context, body });
        else setError('Reconnecting. Your choice is saved here, not yet confirmed by the host.');
      }
    };
    const acceptSnapshot = (message: Snapshot) => {
      if (!joined) healthySince = Date.now();
      joined = true; recovering = false; hostSeen = Date.now();
      if (Date.now() - healthySince >= 10000) attempts = 0;
      localView = message.room; localSeat = message.seatId;
      setView(localView); setSeatId(localSeat); setOnline(message.online); setBusy(message.busy); setStatus('Connected to the party table.'); setStopped(false);
      if (message.ack) pending.delete(message.ack);
      for (const [id, item] of pending) {
        if (item.context !== partyContext(localView)) pending.delete(id);
        else if (hostLink?.open) send(hostLink, { type: 'action', id, context: item.context, body: item.body });
      }
    };
    let PeerCtor: typeof Peer;
    let iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
    const connectGuest = () => {
      if (disposed || recovering) return;
      if (attempts >= 3) { setStopped(true); setStatus('Connection paused after three attempts.'); return; }
      attempts++; joined = false; recovering = true; setOnline([]);
      setStatus(`Connecting to the host (${attempts}/3)...`);
      try { hostLink?.close(); peer?.destroy(); } catch { /* retired attempt */ }
      const mine = new PeerCtor({ config: { iceServers } }); peer = mine;
      const recover = () => {
        if (disposed || peer !== mine) return;
        recovering = false;
        setStatus('Connection lost. Rejoining your saved seat...');
        later(connectGuest, 1000);
      };
      mine.on('open', () => {
        if (disposed || peer !== mine) return;
        const link = mine.connect(`ct-party-${roomId}`, { reliable: true }); hostLink = link;
        link.on('open', () => { if (peer === mine) send(link, { type: 'join', protocol: 1, token }); });
        link.on('data', data => {
          if (disposed || peer !== mine) return;
          const message = data as Wire; hostSeen = Date.now();
          if (message?.type === 'room') acceptSnapshot(message);
          else if (message?.type === 'error') {
            if (message.ack) pending.delete(message.ack);
            setError(message.message);
            if (message.terminal) { attempts = 3; recovering = true; joined = false; setStopped(true); setStatus('This seat could not join.'); link.close(); mine.destroy(); }
          }
        });
        link.on('close', recover); link.on('error', recover);
      });
      mine.on('error', recover);
      later(() => { if (peer === mine && !joined && recovering && attempts < 4 && !disposed) { recovering = false; connectGuest(); } }, 12000);
    };
    retryRef.current = () => { attempts = 0; recovering = false; setStopped(false); setError(''); connectGuest(); };
    void (async () => {
      try {
        const response = await fetch('/api/trivia-ice', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        if (response.ok) { const config = await response.json() as { iceServers?: RTCIceServer[]; relayConfigured?: boolean }; if (config.iceServers?.length) iceServers = config.iceServers; if (!disposed) setRelay(config.relayConfigured === true); }
        else if (!disposed) setRelay(false);
      } catch { if (!disposed) setRelay(false); }
      PeerCtor = (await import('peerjs')).default;
      if (disposed) return;
      if (isHost) {
        publish();
        const mine = new PeerCtor(`ct-party-${roomId}`, { config: { iceServers } }); peer = mine;
        mine.on('open', () => { if (!disposed) setStatus('Party table open. Invite up to four friends.'); });
        mine.on('disconnected', () => { if (!disposed) { setStatus('Host signalling disconnected. Keeping existing seats; reconnecting...'); try { mine.reconnect(); } catch { /* next error is visible */ } } });
        mine.on('error', () => { if (!disposed) setError('The host connection could not open. Keep this screen if people are connected; otherwise open a fresh party table.'); });
        mine.on('connection', link => {
          offers.add(link);
          let id = '';
          later(() => { offers.delete(link); if (!id) link.close(); }, 8000);
          link.on('data', data => {
            if (disposed || !room) return;
            const message = data as Wire;
            if (message?.type === 'join' && id) { snapshot(id, link); return; }
            if (message?.type === 'join' && message.protocol === 1 && typeof message.token === 'string' && /^[a-f0-9-]{36}$/.test(message.token)) {
              const previous = tokenSeats.get(message.token);
              if (!previous && (busyNow || room.phase !== 'lobby' || room.seats.length >= PARTY_LIMIT)) { send(link, { type: 'error', terminal: true, message: busyNow ? 'The host is preparing the quiz. Rejoin in a moment.' : room.phase !== 'lobby' ? 'This quiz has started. Only saved seats can rejoin.' : 'This party table is full (five players including the host).' }); return; }
              id = previous || crypto.randomUUID();
              if (!previous) { tokenSeats.set(message.token, id); room = { ...room, seats: [...room.seats, makePartySeat(id, `PLAYER ${room.seats.length + 1}`)] }; }
              const old = links.get(id); links.set(id, link); if (old !== link) old?.close();
              lastSeen.set(id, Date.now()); offers.delete(link); publish(); return;
            }
            if (!id || links.get(id) !== link) return;
            lastSeen.set(id, Date.now());
            if (message?.type === 'ping') snapshot(id, link);
            if (message?.type === 'action' && typeof message.id === 'string' && message.id.length <= 60 && typeof message.context === 'string' && message.body && typeof message.body === 'object') hostAction(id, message.body, message.context, message.id);
          });
          const closed = () => { if (links.get(id) === link) { links.delete(id); publish(); } };
          link.on('close', closed); link.on('error', closed);
        });
      } else connectGuest();
      let lastPing = 0;
      interval = setInterval(() => {
        if (disposed) return;
        if (isHost && room && !busyNow) {
          // A single serialized queue owns both bells and incoming answers.
          const before = room;
          queue = queue.then(() => { if (!room || disposed || busyNow) return; const next = expireParty(room); if (next !== room) { room = next; publish(); } });
          if (Date.now() - lastPing > 3000) { lastPing = Date.now(); if (before.phase === 'lobby') publish(); }
        } else if (!isHost && joined && Date.now() - lastPing > 3000) {
          lastPing = Date.now(); if (hostLink) send(hostLink, { type: 'ping' });
          if (hostSeen && Date.now() - hostSeen > 12000) { joined = false; recovering = false; connectGuest(); }
        }
      }, 100);
    })().catch(e => { if (!disposed) setError(e instanceof Error ? e.message : 'Could not open the party table.'); });
    return () => { disposed = true; timers.forEach(clearTimeout); clearInterval(interval); offers.forEach(l => l.close()); links.forEach(l => l.close()); hostLink?.close(); peer?.destroy(); actionRef.current = () => undefined; retryRef.current = () => undefined; };
  }, [roomId, isHost]);
  const act = useCallback((body: PartyAction) => actionRef.current(body), []);
  const retry = useCallback(() => retryRef.current(), []);
  return { view, seatId, online, busy, status, error, stopped, relay, act, retry };
}
