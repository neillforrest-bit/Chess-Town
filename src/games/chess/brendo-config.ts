// BUILD 184 (4 Nov 2026): Time to Beat Brendo - rough clone of Road to Joseph, built for Brendo.
import { BRENDO_MAX, BRENDO_ROSTER, eloForLevelV } from '@/lib/road';
import type { RoadCfg } from '../RoadMap';
const LINES: Record<number, string> = {1:'Start with PJ.',2:'Rost raises the difficulty.',3:'Andy is the middle test.',4:'Byron guards the final door.',5:'Time to beat Brendo.'};
const ICON: Record<number, string> = {1:'♟',2:'♞',3:'♝',4:'♜',5:'♚'};
export const BRENDO_ROAD: RoadCfg = {
  title: 'TIME TO BEAT BRENDO',
  narrative: 'PJ -> Rost -> Andy -> Byron -> Brendo. Five opponents, each a harder test.',
  max: BRENDO_MAX,
  storageKey: 'ct-brendo-level-v2',
  playHref: '/play-chester?road=brendo',
  zones: [
    { from: 1, name: 'THE FIRST TEST', bg: 'linear-gradient(180deg,#123a2f,#1c5741)', tag: 'PJ, then Rost. Build your game.' },
    { from: 3, name: 'THE MIDDLE TEST', bg: 'linear-gradient(180deg,#2c2440,#3c3057)', tag: 'Andy, then Byron. Keep climbing.' },
    { from: 5, name: "BRENDO'S ROOFTOP", bg: 'linear-gradient(180deg,#3d1622,#5c1f30)', tag: 'The fifth and hardest test.' },
  ],
  bosses: Object.fromEntries(Object.entries(BRENDO_ROSTER).map(([k, b]) => [k, { name: b.name, archetype: b.archetype, line: LINES[+k] || '', icon: ICON[+k] || '♟' }])),
  strength: (n) => { const e = eloForLevelV('brendo', n); return e ? `setting ~${e}` : 'full strength'; },
};
