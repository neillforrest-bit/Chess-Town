/* Chess-Town sound engine (batch 89): fully synthesized WebAudio SFX - no assets,
   no licensing, tiny. iOS-safe: the context resumes on the first user gesture.
   Mute persists in localStorage. */

let ctx: AudioContext | null = null;
const MUTE_KEY = 'chess-town-muted';

export function isMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
export function setMuted(muted: boolean) {
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* private mode */ }
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    return ctx;
  } catch { return null; }
}

export function unlockAudio() {
  const c = ac();
  if (c && c.state === 'suspended') void c.resume();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { capture: true, passive: true });
}

function tone(c: AudioContext, f0: number, f1: number, type: OscillatorType, dur: number, vol: number, delay = 0) {
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(30, f0), t0);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g); g.connect(c.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

function noise(c: AudioContext, dur: number, vol: number, delay = 0, lowpass = 2400) {
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = lowpass;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t0);
  src.connect(filt); filt.connect(g); g.connect(c.destination);
  src.start(t0);
}

export type SfxName = 'select' | 'move' | 'capture' | 'good' | 'brilliant' | 'shaky' | 'bad' | 'check' | 'start' | 'win';

export function playSfx(name: SfxName) {
  if (isMuted()) return;
  const c = ac();
  if (!c || c.state !== 'running') return;
  try {
    switch (name) {
      case 'select':
        tone(c, 640, 660, 'sine', 0.05, 0.07);
        break;
      case 'move':
        tone(c, 235, 150, 'triangle', 0.1, 0.24);
        noise(c, 0.045, 0.07, 0, 1800);
        break;
      case 'capture':
        tone(c, 310, 75, 'sawtooth', 0.17, 0.26);
        noise(c, 0.12, 0.18, 0, 1200);
        tone(c, 95, 60, 'sine', 0.16, 0.22, 0.02);
        break;
      case 'good':
        tone(c, 659, 659, 'sine', 0.1, 0.18);
        tone(c, 880, 880, 'sine', 0.16, 0.2, 0.09);
        break;
      case 'brilliant':
        tone(c, 784, 784, 'sine', 0.09, 0.18);
        tone(c, 988, 988, 'sine', 0.09, 0.18, 0.08);
        tone(c, 1319, 1319, 'sine', 0.2, 0.22, 0.16);
        noise(c, 0.25, 0.05, 0.16, 6000);
        break;
      case 'shaky':
        tone(c, 220, 196, 'sine', 0.16, 0.15);
        break;
      case 'bad':
        tone(c, 196, 147, 'square', 0.22, 0.1);
        tone(c, 147, 98, 'sine', 0.3, 0.2, 0.06);
        break;
      case 'check':
        tone(c, 988, 988, 'triangle', 0.07, 0.18);
        tone(c, 988, 988, 'triangle', 0.1, 0.18, 0.1);
        break;
      case 'start':
        tone(c, 523, 523, 'triangle', 0.11, 0.16);
        tone(c, 659, 659, 'triangle', 0.11, 0.16, 0.09);
        tone(c, 784, 784, 'triangle', 0.2, 0.2, 0.18);
        break;
      case 'win':
        tone(c, 523, 523, 'sine', 0.12, 0.18);
        tone(c, 659, 659, 'sine', 0.12, 0.18, 0.11);
        tone(c, 784, 784, 'sine', 0.12, 0.18, 0.22);
        tone(c, 1047, 1047, 'sine', 0.3, 0.24, 0.33);
        break;
    }
  } catch { /* sound is decoration - never break the game for it */ }
}
