"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Q } from "../lib/nfl";
import { BAKED } from "../lib/nflBaked";

/* ---------------------------------- data ---------------------------------- */
const ROUND_SIZE = 4;
const TOTAL_PLAYERS = 100;
const QUESTION_MS = 10000;

/* --------------------------------- helpers -------------------------------- */
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
type Phase = "lobby" | "playing" | "eliminated" | "victory";

/* ---------------------------------- icons --------------------------------- */
const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d={d} />
  </svg>
);
const ICONS = {
  bolt: "M13 2 3 14h7l-1 8 10-12h-7l1-8z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  skull: "M12 2a8 8 0 0 0-8 8c0 2.9 1.6 5.4 4 6.7V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3.3c2.4-1.3 4-3.8 4-6.7a8 8 0 0 0-8-8zM9 12h.01M15 12h.01",
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z",
  timer: "M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
};

/* ---------------------------------- page ----------------------------------- */
export default function KnockoutTrivia() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [qi, setQi] = useState(0); // question index 0..11
  const [bots, setBots] = useState(99);
  const [picked, setPicked] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_MS);
  const [placement, setPlacement] = useState<number | null>(null);
  const [spectating, setSpectating] = useState(false);
  const [flash, setFlash] = useState<"red" | "green" | null>(null);
  const [questions, setQuestions] = useState<Q[]>(BAKED);
  const [qsrc, setQsrc] = useState<"live" | "pack" | null>(null);
  const [joining, setJoining] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  // dev-only answer key for automated tests (stripped from production logic)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") (window as any).__KT = questions;
  }, [questions]);

  const round = Math.floor(qi / ROUND_SIZE) + 1;
  const qInRound = (qi % ROUND_SIZE) + 1;
  const playersRemaining = bots + (phase === "playing" ? 1 : 0);

  /* ------------------------------ question flow ---------------------------- */
  const attritBots = useCallback((active: number) => {
    if (active <= 0) return 0;
    const pct = 0.1 + Math.random() * 0.2; // 10% - 30%
    const n = Math.max(1, Math.round(active * pct));
    return Math.max(0, active - n);
  }, []);

  const startQuestion = useCallback((idx: number) => {
    setQi(idx);
    setPicked(null);
    setReveal(false);
    setTimeLeft(QUESTION_MS);
    if (tickRef.current) clearInterval(tickRef.current);
    const t0 = Date.now();
    const tick = setInterval(() => {
      const left = Math.max(0, QUESTION_MS - (Date.now() - t0));
      setTimeLeft(left);
      if (left <= 0) { if (tickRef.current) clearInterval(tickRef.current); tickRef.current = null; }
    }, 50);
    tickRef.current = tick;
    // timeout = elimination, handled by effect below via timeLeft
  }, []);

  const eliminateUser = useCallback((botsAliveAfter: number) => {
    setFlash("red");
    setPlacement(botsAliveAfter + 1);
    later(() => {
      setFlash(null);
      setPhase("eliminated");
      setSpectating(true);
    }, 900);
  }, [later]);

  // resolve a question once (answer picked or timer out)
  const resolveQuestion = useCallback((userPicked: number | null) => {
    setReveal(true);
    const q = questions[qi];
    const correct = userPicked === q.answer;
    setBots((prevBots) => {
      const after = attritBots(prevBots);
      if (!correct) {
        later(() => eliminateUser(after), 500);
      } else {
        setFlash("green");
        later(() => setFlash(null), 500);
        if (qi + 1 >= questions.length) {
          later(() => setPhase("victory"), 800);
        } else {
          later(() => startQuestion(qi + 1), 900);
        }
      }
      return after;
    });
  }, [qi, questions, attritBots, eliminateUser, later, startQuestion]);

  // countdown expiry
  useEffect(() => {
    if (phase === "playing" && !reveal && timeLeft <= 0) {
      resolveQuestion(null);
    }
  }, [timeLeft, phase, reveal, resolveQuestion]);

  const begin = (qs: Q[], src: "live" | "pack") => {
    clearAll();
    setQuestions(qs);
    setQsrc(src);
    setBots(99);
    setPlacement(null);
    setSpectating(false);
    setJoining(false);
    setPhase("playing");
    startQuestion(0);
  };

  const join = () => {
    if (joining) return;
    setJoining(true);
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 3000);
    fetch("/api/nfl", { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { clearTimeout(to); if (d.live && Array.isArray(d.questions) && d.questions.length >= 12) begin(d.questions.slice(0, 12), "live"); else begin(BAKED, "pack"); })
      .catch(() => { clearTimeout(to); begin(BAKED, "pack"); });
  };

  const pick = (i: number) => {
    if (picked !== null || reveal || phase !== "playing") return;
    setPicked(i);
    resolveQuestion(i);
  };

  // spectator sim: keep draining bots to a winner
  useEffect(() => {
    if (!spectating || phase !== "eliminated") return;
    const iv = setInterval(() => {
      setBots((b) => {
        const after = attritBots(b);
        if (after <= 0) {
          clearInterval(iv);
          setSpectating(false);
          return 0;
        }
        return after;
      });
    }, 1400);
    return () => clearInterval(iv);
  }, [spectating, phase, attritBots]);

  useEffect(() => () => clearAll(), [clearAll]);

  const pct = Math.max(0, timeLeft / QUESTION_MS);
  const timerColor = pct > 0.5 ? "bg-cyan-400" : pct > 0.25 ? "bg-fuchsia-500" : "bg-red-500";

  /* --------------------------------- render -------------------------------- */
  return (
    <main className="fixed inset-0 bg-zinc-950 text-white overflow-hidden select-none">
      {/* neon backdrop */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />

      {/* elimination / correct flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: flash === "red" ? 0.45 : 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`fixed inset-0 z-50 pointer-events-none ${flash === "red" ? "bg-red-600" : "bg-emerald-400"}`}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ------------------------------- LOBBY ------------------------------ */}
        {phase === "lobby" && (
          <motion.section
            key="lobby"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            className="relative z-10 flex h-full flex-col items-center justify-center gap-8 px-6 text-center"
          >
            <div className="flex flex-col items-center gap-3">
              <Icon d={ICONS.bolt} className="h-14 w-14 text-cyan-400 drop-shadow-[0_0_18px_rgba(34,211,238,.9)]" />
              <h1 className="text-4xl font-black tracking-tight">
                KNOCKOUT
                <span className="block bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">TRIVIA</span>
              </h1>
              <p className="text-sm text-zinc-400">100 enter. One wins. 12 questions. 10 seconds each.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs text-zinc-400">
              <Icon d={ICONS.users} className="h-4 w-4 text-fuchsia-400" />
              Next contest fills instantly
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={join}
              className="w-full max-w-sm rounded-2xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 px-6 py-5 text-lg font-extrabold tracking-wide shadow-[0_0_40px_rgba(34,211,238,.35)]"
            >
              {joining ? "FINDING 99 OPPONENTS…" : "JOIN NEXT CONTEST (100 PLAYERS)"}
            </motion.button>
          </motion.section>
        )}

        {/* ------------------------------ GAMEPLAY ----------------------------- */}
        {phase === "playing" && (
          <motion.section
            key={`q${qi}`}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative z-10 flex h-full flex-col px-5 pt-5 pb-6"
          >
            {/* header */}
            <div className="flex items-center justify-between text-xs font-bold tracking-widest text-zinc-400">
              <span className="whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5">
                R{round} · Q{qInRound}/{ROUND_SIZE}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-cyan-300">
                <Icon d={ICONS.users} className="h-3.5 w-3.5" />
                PLAYERS REMAINING: {playersRemaining} / {TOTAL_PLAYERS}
              </span>
            </div>

            {qsrc && (
              <div className="mt-2 text-center text-[10px] font-bold tracking-widest">
                {qsrc === "live"
                  ? <span className="text-emerald-400">● LIVE NFL SCORES FROM TODAY'S GAMES</span>
                  : <span className="text-zinc-500">QUESTION PACK (LIVE FEED UNAVAILABLE)</span>}
              </div>
            )}

            {/* countdown bar */}
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full ${timerColor} transition-[width] duration-100 ease-linear shadow-[0_0_12px_currentColor]`}
                style={{ width: `${pct * 100}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-end gap-1 text-xs text-zinc-500">
              <Icon d={ICONS.timer} className="h-3.5 w-3.5" />
              {(timeLeft / 1000).toFixed(1)}s
            </div>

            {/* question */}
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-[0_0_30px_rgba(0,0,0,.5)]">
              <p className="text-xl font-bold leading-snug">{questions[qi].q}</p>
            </div>

            {/* answers */}
            <div className="mt-5 flex flex-1 flex-col justify-end gap-3">
              {questions[qi].options.map((opt, i) => {
                const isPicked = picked === i;
                const isRight = reveal && i === questions[qi].answer;
                const isWrong = reveal && isPicked && i !== questions[qi].answer;
                return (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => pick(i)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left text-base font-semibold transition-colors
                      ${isRight ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,.4)]"
                      : isWrong ? "border-red-500 bg-red-500/20 text-red-300 shadow-[0_0_24px_rgba(239,68,68,.4)]"
                      : isPicked ? "border-fuchsia-500 bg-fuchsia-500/15"
                      : "border-zinc-800 bg-zinc-900/70 active:border-cyan-400/60"}`}
                  >
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
          <motion.section
            key="out"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: [0, -14, 14, -10, 10, -5, 5, 0] }}
            transition={{ x: { duration: 0.6 }, opacity: { duration: 0.2 } }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
          >
            <Icon d={ICONS.skull} className="h-16 w-16 text-red-500 drop-shadow-[0_0_24px_rgba(239,68,68,.9)]" />
            <div>
              <h2 className="text-4xl font-black tracking-tight text-red-500">ELIMINATED</h2>
              <p className="mt-3 text-lg text-zinc-300">
                You finished in <span className="font-black text-white">{placement ? ordinal(placement) : "?"}</span> place
              </p>
              <p className="mt-1 text-sm text-zinc-500">of {TOTAL_PLAYERS} players</p>
            </div>
            <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-400">
              {spectating ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-500" />
                  Spectating — {bots} bots still fighting it out…
                </div>
              ) : (
                <div>Contest over — a champion has been crowned.</div>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={join}
              className="w-full max-w-sm rounded-2xl border border-cyan-500/50 bg-cyan-500/10 px-6 py-4 text-base font-extrabold tracking-wide text-cyan-300"
            >
              PLAY AGAIN
            </motion.button>
          </motion.section>
        )}

        {/* ------------------------------ VICTORY ------------------------------ */}
        {phase === "victory" && (
          <motion.section
            key="win"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
          >
            <motion.div
              animate={{ rotate: [0, -6, 6, -3, 3, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}
            >
              <Icon d={ICONS.trophy} className="h-20 w-20 text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,.9)]" />
            </motion.div>
            <div>
              <h2 className="bg-gradient-to-r from-amber-300 via-cyan-300 to-fuchsia-400 bg-clip-text text-5xl font-black tracking-tight text-transparent">
                CHAMPION
              </h2>
              <p className="mt-3 text-lg text-zinc-300">
                You survived all {questions.length} questions — <span className="font-black text-white">1st place</span> of {TOTAL_PLAYERS}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={join}
              className="w-full max-w-sm rounded-2xl bg-gradient-to-r from-amber-400 to-fuchsia-600 px-6 py-4 text-base font-extrabold tracking-wide text-zinc-950 shadow-[0_0_40px_rgba(251,191,36,.35)]"
            >
              PLAY AGAIN
            </motion.button>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
