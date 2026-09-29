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
        // Batch 92: bass-heavy magnetic thock - weighted body drop + wooden knock + contact transient
        tone(c, 170, 65, 'sine', 0.15, 0.34);
        tone(c, 320, 150, 'triangle', 0.07, 0.12);
        noise(c, 0.028, 0.11, 0, 950);
        break;
      case 'capture':
        // Batch 92: the thock, layered with a high-frequency shatter (glass click)
        tone(c, 170, 60, 'sine', 0.16, 0.34);
        tone(c, 300, 130, 'triangle', 0.08, 0.14);
        noise(c, 0.03, 0.12, 0, 950);
        tone(c, 2600, 3400, 'square', 0.03, 0.045, 0.012);
        tone(c, 3400, 2400, 'square', 0.026, 0.04, 0.038);
        noise(c, 0.05, 0.06, 0.01, 5200);
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

// Batch 91: haptics (drawer-toggleable). iOS Safari ignores navigator.vibrate - no-op there.
const HAPTICS_KEY = 'chess-town-haptics';
export function isHaptics(): boolean {
  try { return localStorage.getItem(HAPTICS_KEY) !== '0'; } catch { return true; }
}
export function setHaptics(on: boolean) {
  try { localStorage.setItem(HAPTICS_KEY, on ? '1' : '0'); } catch { /* private mode */ }
}
export function buzz(pattern: number | number[]) {
  if (!isHaptics()) return;
  try { (navigator as unknown as { vibrate?: (p: number | number[]) => boolean }).vibrate?.(pattern); } catch { /* unsupported */ }
}

// Batch 92: Chester speaks the grade. Male voice profile, slightly lowered pitch;
// delivery shifts with the grade - blunders slow and deep, strong moves sharper.
// cancel() before speak() prevents clipping when grades land quickly. Any autoplay
// block or unsupported browser fails silent - the game never breaks for a voice.
const SPEECH_LINES: Record<string, { text: string; rate: number; pitch: number }> = {
  BRILLIANT: { text: 'Brilliant!', rate: 1.15, pitch: 1.05 },
  BEST: { text: 'Best move.', rate: 1.1, pitch: 1.0 },
  GREAT: { text: 'Great move.', rate: 1.08, pitch: 0.98 },
  GOOD: { text: 'Good.', rate: 1.0, pitch: 0.92 },
  INACCURACY: { text: 'Shaky.', rate: 0.9, pitch: 0.82 },
  MISTAKE: { text: 'Mistake.', rate: 0.84, pitch: 0.74 },
  BLUNDER: { text: 'Blunder.', rate: 0.76, pitch: 0.62 },
};
export function speakGrade(label: string) {
  if (isMuted()) return;
  const line = SPEECH_LINES[label];
  if (!line || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(line.text);
    u.rate = line.rate;
    u.pitch = line.pitch;
    u.volume = 0.9;
    u.lang = 'en-GB';
    const voices = synth.getVoices();
    const male = voices.find((v) => v.lang.startsWith('en') && /male/i.test(v.name))
      || voices.find((v) => /daniel|george|brian|arthur|james/i.test(v.name))
      || voices.find((v) => v.lang === 'en-GB');
    if (male) u.voice = male;
    synth.speak(u);
  } catch { /* blocked or unsupported - silence is acceptable */ }
}
