import type { RoadCfg } from '../RoadMap';
export const TRV_ROAD_KEY = 'ct-road-trivia-v1';
export const TRV_ROAD_MAX = 15;
/** Chance Chester answers a question correctly, per road level 1..15 (a round is 5 questions). */
export const TRIVIA_ACC = [0.3, 0.36, 0.42, 0.48, 0.54, 0.58, 0.62, 0.66, 0.7, 0.74, 0.78, 0.82, 0.86, 0.9, 0.94];
export const getTrvRoad = () => { try { const n = parseInt(window.localStorage.getItem(TRV_ROAD_KEY) || '1', 10); return Math.min(TRV_ROAD_MAX, Math.max(1, n || 1)); } catch { return 1; } };
export const setTrvRoad = (n: number) => { try { window.localStorage.setItem(TRV_ROAD_KEY, String(Math.min(TRV_ROAD_MAX, Math.max(1, n)))); } catch { /* storage unavailable */ } };
export const TRIVIA_ROAD: RoadCfg = {
  title: 'ROAD TO THE LANDLORD', narrative: 'Beat the Landlord and the pub is yours.', max: TRV_ROAD_MAX, storageKey: TRV_ROAD_KEY, playHref: '/trivia-brawl?road=1',
  zones: [
    { from: 1, name: 'THE BEER GARDEN', bg: 'linear-gradient(180deg,#1f4d2b,#2f6b3a)', tag: 'Easy questions, warm crowd.' },
    { from: 4, name: 'THE SNUG', bg: 'linear-gradient(180deg,#4d3a1f,#6b4f2f)', tag: 'Quiet corner, sharper regulars.' },
    { from: 7, name: 'QUIZ NIGHT', bg: 'linear-gradient(180deg,#3b2a55,#4a3366)', tag: 'Teams. Pens. Grudges.' },
    { from: 10, name: 'THE CELLAR', bg: 'linear-gradient(180deg,#1d3b57,#27506e)', tag: 'Where the hard questions are kept.' },
    { from: 13, name: 'THE LANDLORD\u2019S BAR', bg: 'linear-gradient(180deg,#3a1420,#561b2a)', tag: 'Last orders.' },
  ],
  bosses: {
    3: { name: 'Barstool Bob', archetype: 'The Confident Guesser', line: 'Wrong a lot, loud every time.', icon: '🍺' },
    6: { name: 'Dr Footnote', archetype: 'The Pedant', line: 'Knows the date, the author and the typo.', icon: '📚' },
    9: { name: 'The Quizmaster', archetype: 'The Question Setter', line: 'Wrote half the questions. Knows the other half.', icon: '🎤' },
    12: { name: 'Lightning Lou', archetype: 'The Buzzer Ace', line: 'Answers before you finish reading.', icon: '⚡' },
    15: { name: 'The Landlord', archetype: 'The House Champion', line: 'Wins about nine in ten. Beat him and the pub is yours.', icon: '🏆' },
  },
  strength: (n) => `Chester answers ${Math.round(TRIVIA_ACC[n - 1] * 100)}% right`,
};
