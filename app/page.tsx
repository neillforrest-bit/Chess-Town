"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Q } from "../lib/nfl";
import { BAKED } from "../lib/nflBaked";

/* ---------------------------------- types --------------------------------- */
type DriveInfo = { id: string; offense: string | null; description: string; lastPlayText: string; downDist: string };
type LiveGame = { id: string; name: string; home: string; away: string; hs: number; as: number; status: string; halftime: boolean; final: boolean };
type LiveResp = {
  live: boolean; reason?: string;
  game?: LiveGame;
  drive?: DriveInfo | null;
  results?: Record<string, { result: string; cls: number | null; description: string }>;
};
type Phase = "lobby" | "playing" | "eliminated" | "victory";
type Mode = "live" | "trivia";
const TOTAL_PLAYERS = 100;
const TOTAL_ROUNDS = 12;
const QUESTION_MS = 10000;
const DRIVE_OPTIONS = ["TOUCHDOWN", "FIELD GOAL", "PUNT", "TURNOVER"];

/* --------------------------------- helpers -------------------------------- */
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d={d} /></svg>
);
const ICONS = {
  bolt: "M13 2 3 14h7l-1 8 10-12h-7l1-8z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  skull: "M12 2a8 8 0 0 0-8 8c0 2.9 1.6 5.4 4 6.7V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3.3c2.4-1.3 4-3.8 4-6.7a8 8 0 0 0-8-8zM9 12h.01M15 12h.01",
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z",
  timer: "M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  radio: "M4.9 19.1a10 10 0 0 1 0-14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 16.2a6 6 0 0 0 0-8.4M19.1 19.1a10 10 0 0 0 0-14.2M12 12h.01",
};

/* ---------------------------------- page ----------------------------------- */
export default function KnockoutTrivia() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [mode, setMode] = useState<Mode>("live");
  const [bots, setBots] = useState(99);
  const [picked, setPicked] = useState<number | null>(null);
  const [reveal, setReveal] = useState<number | null>(null); // resolved correct index
  const [placement, setPlacement] = useState<number | null>(null);
  const [spectating, setSpectating] = useState(false);
  const [flash, setFlash] = useState<"red" | "green" | null>(null);
  const [joining, setJoining] = useState(false);
  const [round, setRound] = useState(1);

  // live-mode state
  const [game, setGame] = useState<LiveGame | null>(null);
  const [drive, setDrive] = useState<DriveInfo | null>(null);
  const [roundDrive, setRoundDrive] = useState<{ id: string; offense: string | null } | null>(null);
  const [lastResolve, setLastResolve] = useState<string | null>(null);

  // trivia-mode state
  const [questions, setQuestions] = useState<Q[]>(BAKED);
  const [qi, setQi] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_MS);
  const [triviaReveal, setTriviaReveal] = useState(false);
  const [qsrc, setQsrc] = useState<"live" | "pack" | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetedAt = useRef<number>(0);
  const stateRef = useRef({ phase, mode, roundDrive, picked, bots, round, game, qi, questions, reveal });
  stateRef.current = { phase, mode, roundDrive, picked, bots, round, game, qi, questions, reveal };

  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); }, []);
  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const attritBots = useCallback((active: number) => {
    if (active <= 0) return 0;
    const pct = 0.1 + Math.random() * 0.2;
    const n = Math.max(1, Math.round(active * pct));
    return Math.max(0, active - n);
  }, []);

  const eliminateUser = useCallback((botsAliveAfter: number) => {
    setFlash("red");
    setPlacement(botsAliveAfter + 1);
    later(() => { setFlash(null); setPhase("eliminated"); setSpectating(true); }, 900);
  }, [later]);

  /* ------------------------------ live polling ----------------------------- */
  const pollLive = useCallback(async () => {
    const s = stateRef.current;
    if (s.phase !== "playing" || s.mode !== "live") return;
    let d: LiveResp;
    try {
      const r = await fetch("/api/live", { cache: "no-store" });
      d = await r.json();
    } catch { return; }
    if (!d.live || !d.game) {
      // slate ended while playing: survivors win
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setPhase("victory");
      return;
    }
    setGame(d.game);
    setDrive(d.drive || null);
    const rd = stateRef.current.roundDrive;
    if (rd) {
      const res = d.results?.[rd.id];
      if (res && stateRef.current.reveal === null) {
        const unfair = stateRef.current.picked === null && Date.now() - targetedAt.current < 12000;
        if (res.cls === null || unfair) {
          // half/quarter end, or the drive ended before a fair chance to call it: free pass
          setRoundDrive(d.drive ? { id: d.drive.id, offense: d.drive.offense } : null);
          targetedAt.current = Date.now();
          setPicked(null);
          setReveal(null);
          setLastResolve(unfair ? `Drive ended (${res.result}) before you could call it - free pass` : `Drive ended (${res.result}) - free pass, nobody out`);
        } else {
          resolveLiveRound(res.cls, res.result);
        }
        return;
      }
      // tracked game changed under us -> retarget
      if (stateRef.current.game && d.game.id !== stateRef.current.game.id) {
        setRoundDrive(d.drive ? { id: d.drive.id, offense: d.drive.offense } : null);
        targetedAt.current = Date.now();
        setPicked(null);
        setReveal(null);
        setLastResolve(`Switched to ${d.game.name} (other game went final)`);
      }
    } else if (d.drive) {
      // no drive targeted yet (between drives) -> target it
      setRoundDrive({ id: d.drive.id, offense: d.drive.offense });
      targetedAt.current = Date.now();
    }
  }, []);

  const resolveLiveRound = useCallback((cls: number, rawResult: string) => {
    const s = stateRef.current;
    if (s.phase !== "playing") return;
    setReveal(cls);
    setLastResolve(`Drive result: ${rawResult}`);
    const correct = s.picked === cls;
    setBots((prevBots) => {
      const after = attritBots(prevBots);
      if (!correct) {
        later(() => eliminateUser(after), 600);
      } else {
        setFlash("green");
        later(() => setFlash(null), 600);
        if (s.round >= TOTAL_ROUNDS) {
          later(() => setPhase("victory"), 1000);
        } else {
          later(() => {
            setRound(s.round + 1);
            setPicked(null);
            setReveal(null);
            setRoundDrive(null); // wait for the next real drive
          }, 1400);
        }
      }
      return after;
    });
  }, [attritBots, eliminateUser, later]);

  // start/stop polling with phase
  useEffect(() => {
    if (phase === "playing" && mode === "live" && !pollRef.current) {
      pollRef.current = setInterval(pollLive, 4000);
      pollLive();
    }
    if (phase !== "playing" && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, [phase, mode, pollLive]);

  /* ------------------------------ trivia engine ---------------------------- */
  const startTriviaQuestion = useCallback((idx: number) => {
    setQi(idx);
    setPicked(null);
    setTriviaReveal(false);
    setTimeLeft(QUESTION_MS);
    if (tickRef.current) clearInterval(tickRef.current);
    const t0 = Date.now();
    const tick = setInterval(() => {
      const left = Math.max(0, QUESTION_MS - (Date.now() - t0));
      setTimeLeft(left);
      if (left <= 0) { if (tickRef.current) clearInterval(tickRef.current); tickRef.current = null; }
    }, 50);
    tickRef.current = tick;
  }, []);

  const resolveTrivia = useCallback((userPicked: number | null) => {
    const s = stateRef.current;
    setTriviaReveal(true);
    const correct = userPicked === s.questions[s.qi]?.answer;
    setBots((prevBots) => {
      const after = attritBots(prevBots);
      if (!correct) {
        later(() => eliminateUser(after), 500);
      } else {
        setFlash("green");
        later(() => setFlash(null), 500);
        if (s.qi + 1 >= s.questions.length) later(() => setPhase("victory"), 800);
        else later(() => startTriviaQuestion(s.qi + 1), 900);
      }
      return after;
    });
  }, [attritBots, eliminateUser, later, startTriviaQuestion]);

  useEffect(() => {
    if (phase === "playing" && mode === "trivia" && !triviaReveal && timeLeft <= 0) resolveTrivia(null);
  }, [timeLeft, phase, mode, triviaReveal, resolveTrivia]);

  /* --------------------------------- actions ------------------------------- */
  const beginLive = (d: LiveResp) => {
    clearAll();
    setMode("live");
    setGame(d.game || null);
    setDrive(d.drive || null);
    setRoundDrive(d.drive ? { id: d.drive.id, offense: d.drive.offense } : null);
    targetedAt.current = Date.now();
    setRound(1);
    setPicked(null);
    setReveal(null);
    setBots(99);
    setPlacement(null);
    setSpectating(false);
    setJoining(false);
    setLastResolve(null);
    setPhase("playing");
  };

  const beginTrivia = (qs: Q[], src: "live" | "pack") => {
    clearAll();
    setMode("trivia");
    setQuestions(qs);
    setQsrc(src);
    setRound(1);
    setPicked(null);
    setBots(99);
    setPlacement(null);
    setSpectating(false);
    setJoining(false);
    setPhase("playing");
    startTriviaQuestion(0);
  };

  const join = () => {
    if (joining) return;
    setJoining(true);
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 3500);
    fetch("/api/live", { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((d: LiveResp) => {
        clearTimeout(to);
        if (d.live && d.game) { beginLive(d); return; }
        // no live game -> trivia fallback
        fetch("/api/nfl", { cache: "no-store" })
          .then((r) => r.json())
          .then((n) => { if (n.live && Array.isArray(n.questions) && n.questions.length >= 12) beginTrivia(n.questions.slice(0, 12), "live"); else beginTrivia(BAKED, "pack"); })
          .catch(() => beginTrivia(BAKED, "pack"));
      })
      .catch(() => { clearTimeout(to); beginTrivia(BAKED, "pack"); });
  };

  const pick = (i: number) => {
    if (picked !== null || phase !== "playing") return;
    if (mode === "live") {
      if (!roundDrive || reveal !== null) return;
      setPicked(i);
    } else {
      if (triviaReveal) return;
      setPicked(i);
      resolveTrivia(i);
    }
  };

  // spectator sim: keep draining bots to a winner
  useEffect(() => {
    if (!spectating || phase !== "eliminated") return;
    const iv = setInterval(() => {
      setBots((b) => {
        const after = attritBots(b);
        if (after <= 0) { clearInterval(iv); setSpectating(false); return 0; }
        return after;
      });
    }, 1400);
    return () => clearInterval(iv);
  }, [spectating, phase, attritBots]);

  useEffect(() => () => clearAll(), [clearAll]);

  const playersRemaining = bots + (phase === "playing" ? 1 : 0);
  const pct = Math.max(0, timeLeft / QUESTION_MS);
  const timerColor = pct > 0.5 ? "bg-cyan-400" : pct > 0.25 ? "bg-fuchsia-500" : "bg-red-500";

  /* --------------------------------- render -------------------------------- */
  return (
    <main className="fixed inset-0 bg-zinc-950 text-white overflow-hidden select-none">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />

      <AnimatePresence>
        {flash && (
          <motion.div key="flash" initial={{ opacity: 0 }} animate={{ opacity: flash === "red" ? 0.45 : 0.25 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            className={`fixed inset-0 z-50 pointer-events-none ${flash === "red" ? "bg-red-600" : "bg-emerald-400"}`} />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ------------------------------- LOBBY ------------------------------ */}
        {phase === "lobby" && (
          <motion.section key="lobby" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
            className="relative z-10 flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <Icon d={ICONS.bolt} className="h-14 w-14 text-cyan-400 drop-shadow-[0_0_18px_rgba(34,211,238,.9)]" />
              <h1 className="text-4xl font-black tracking-tight">
                KNOCKOUT
                <span className="block bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">NFL LIVE</span>
              </h1>
              <p className="text-sm text-zinc-400">100 enter. One wins. Call every drive, live.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs text-zinc-400">
              <Icon d={ICONS.users} className="h-4 w-4 text-fuchsia-400" />
              Next contest fills instantly
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={join}
              className="w-full max-w-sm rounded-2xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 px-6 py-5 text-lg font-extrabold tracking-wide shadow-[0_0_40px_rgba(34,211,238,.35)]">
              {joining ? "FINDING 99 OPPONENTS…" : "JOIN NEXT CONTEST (100 PLAYERS)"}
            </motion.button>
          </motion.section>
        )}

        {/* ------------------------------ GAMEPLAY ----------------------------- */}
        {phase === "playing" && mode === "live" && (
          <motion.section key={`live-${round}`} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative z-10 flex h-full flex-col px-5 pt-5 pb-6">
            <div className="flex items-center justify-between text-xs font-bold tracking-widest text-zinc-400">
              <span className="whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5">ROUND {round}/{TOTAL_ROUNDS}</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] text-cyan-300">
                <Icon d={ICONS.users} className="h-3.5 w-3.5" />
                PLAYERS REMAINING: {playersRemaining} / {TOTAL_PLAYERS}
              </span>
            </div>

            {/* live game strip */}
            <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  LIVE · {game?.status || "…"}
                </span>
                <span className="font-black text-white">{game ? `${game.away.split(" ").pop()} ${game.as} - ${game.hs} ${game.home.split(" ").pop()}` : ""}</span>
              </div>
              <div className="mt-2 min-h-8 text-xs leading-snug text-zinc-400">
                {drive ? (
                  <>
                    {drive.downDist ? <span className="font-bold text-zinc-300">{drive.downDist} · </span> : null}
                    {drive.lastPlayText || "Waiting for the next play…"}
                  </>
                ) : (game?.halftime ? "Halftime - next drive starts the second half." : "Between drives - next question loads with the next drive.")}
              </div>
            </div>

            {/* question */}
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-[0_0_30px_rgba(0,0,0,.5)]">
              {roundDrive ? (
                <p className="text-xl font-bold leading-snug">
                  How does this <span className="text-cyan-300">{roundDrive.offense || "offense"}</span> drive end?
                </p>
              ) : (
                <p className="text-xl font-bold leading-snug text-zinc-400">Waiting for the next real drive…</p>
              )}
              {lastResolve && <p className="mt-2 text-xs text-zinc-500">{lastResolve}</p>}
            </div>

            {/* answers */}
            <div className="mt-5 flex flex-1 flex-col justify-end gap-3">
              {DRIVE_OPTIONS.map((opt, i) => {
                const isPicked = picked === i;
                const isRight = reveal !== null && i === reveal;
                const isWrong = reveal !== null && isPicked && i !== reveal;
                return (
                  <motion.button key={opt} whileTap={{ scale: 0.97 }} onClick={() => pick(i)} disabled={!roundDrive}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left text-base font-semibold transition-colors
                      ${isRight ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,.4)]"
                      : isWrong ? "border-red-500 bg-red-500/20 text-red-300 shadow-[0_0_24px_rgba(239,68,68,.4)]"
                      : isPicked ? "border-fuchsia-500 bg-fuchsia-500/15"
                      : "border-zinc-800 bg-zinc-900/70 active:border-cyan-400/60"} ${!roundDrive ? "opacity-40" : ""}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black
                      ${isRight ? "bg-emerald-400 text-zinc-950" : isWrong ? "bg-red-500 text-white" : "bg-zinc-800 text-cyan-300"}`}>
                      {"ABCD"[i]}
                    </span>
                    {opt}
                    {isPicked && reveal === null && <span className="ml-auto text-xs text-zinc-400">locked in</span>}
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        )}

        {phase === "playing" && mode === "trivia" && (
          <motion.section key={`trivia-${qi}`} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative z-10 flex h-full flex-col px-5 pt-5 pb-6">
            <div className="flex items-center justify-between text-xs font-bold tracking-widest text-zinc-400">
              <span className="whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5">R{Math.floor(qi / 4) + 1} · Q{(qi % 4) + 1}/4</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] text-cyan-300">
                <Icon d={ICONS.users} className="h-3.5 w-3.5" />
                PLAYERS REMAINING: {playersRemaining} / {TOTAL_PLAYERS}
              </span>
            </div>
            {qsrc && (
              <div className="mt-2 text-center text-[10px] font-bold tracking-widest">
                {qsrc === "live" ? <span className="text-emerald-400">● LIVE NFL SCORES FROM TODAY'S GAMES</span> : <span className="text-zinc-500">QUESTION PACK (NO LIVE GAME RIGHT NOW)</span>}
              </div>
            )}
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className={`h-full rounded-full ${timerColor} transition-[width] duration-100 ease-linear shadow-[0_0_12px_currentColor]`} style={{ width: `${pct * 100}%` }} />
            </div>
            <div className="mt-1 flex items-center justify-end gap-1 text-xs text-zinc-500">
              <Icon d={ICONS.timer} className="h-3.5 w-3.5" />{(timeLeft / 1000).toFixed(1)}s
            </div>
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-[0_0_30px_rgba(0,0,0,.5)]">
              <p className="text-xl font-bold leading-snug">{questions[qi].q}</p>
            </div>
            <div className="mt-5 flex flex-1 flex-col justify-end gap-3">
              {questions[qi].options.map((opt, i) => {
                const isPicked = picked === i;
                const isRight = triviaReveal && i === questions[qi].answer;
                const isWrong = triviaReveal && isPicked && i !== questions[qi].answer;
                return (
                  <motion.button key={i} whileTap={{ scale: 0.97 }} onClick={() => pick(i)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left text-base font-semibold transition-colors
                      ${isRight ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,.4)]"
                      : isWrong ? "border-red-500 bg-red-500/20 text-red-300 shadow-[0_0_24px_rgba(239,68,68,.4)]"
                      : isPicked ? "border-fuchsia-500 bg-fuchsia-500/15"
                      : "border-zinc-800 bg-zinc-900/70 active:border-cyan-400/60"}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black
                      ${isRight ? "bg-emerald-400 text-zinc-950" : isWrong ? "bg-red-500 text-white" : "bg-zinc-800 text-cyan-300"}`}>
                      {"ABCD"[i]}
                    </span>
                    {opt}
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ----------------------------- ELIMINATED ---------------------------- */}
        {phase === "eliminated" && (
          <motion.section key="out" initial={{ opacity: 0 }} animate={{ opacity: 1, x: [0, -14, 14, -10, 10, -5, 5, 0] }}
            transition={{ x: { duration: 0.6 }, opacity: { duration: 0.2 } }} exit={{ opacity: 0 }}
            className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
            <Icon d={ICONS.skull} className="h-16 w-16 text-red-500 drop-shadow-[0_0_24px_rgba(239,68,68,.9)]" />
            <div>
              <h2 className="text-4xl font-black tracking-tight text-red-500">ELIMINATED</h2>
              <p className="mt-3 text-lg text-zinc-300">You finished in <span className="font-black text-white">{placement ? ordinal(placement) : "?"}</span> place</p>
              <p className="mt-1 text-sm text-zinc-500">of {TOTAL_PLAYERS} players</p>
            </div>
            <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-400">
              {spectating ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-500" />
                  Spectating - {bots} bots still fighting it out…
                </div>
              ) : (<div>Contest over - a champion has been crowned.</div>)}
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={join}
              className="w-full max-w-sm rounded-2xl border border-cyan-500/50 bg-cyan-500/10 px-6 py-4 text-base font-extrabold tracking-wide text-cyan-300">
              PLAY AGAIN
            </motion.button>
          </motion.section>
        )}

        {/* ------------------------------ VICTORY ------------------------------ */}
        {phase === "victory" && (
          <motion.section key="win" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
            <motion.div animate={{ rotate: [0, -6, 6, -3, 3, 0], scale: [1, 1.12, 1] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}>
              <Icon d={ICONS.trophy} className="h-20 w-20 text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,.9)]" />
            </motion.div>
            <div>
              <h2 className="bg-gradient-to-r from-amber-300 via-cyan-300 to-fuchsia-400 bg-clip-text text-5xl font-black tracking-tight text-transparent">CHAMPION</h2>
              <p className="mt-3 text-lg text-zinc-300">You outlasted the lobby - <span className="font-black text-white">1st place</span> of {TOTAL_PLAYERS}</p>
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={join}
              className="w-full max-w-sm rounded-2xl bg-gradient-to-r from-amber-400 to-fuchsia-600 px-6 py-4 text-base font-extrabold tracking-wide text-zinc-950 shadow-[0_0_40px_rgba(251,191,36,.35)]">
              PLAY AGAIN
            </motion.button>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
