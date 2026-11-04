// BUILD 184 (4 Nov 2026): Time to Beat Brendo - rough clone of Road to Joseph, built for Brendo.
import { BRENDO_MAX, BRENDO_ROSTER, eloForLevel, engineEloFor } from '@/lib/road';
import type { RoadCfg } from '../RoadMap';
const LINES: Record<number, string> = {
  3: 'Young Brendo energy - all attack, no fear. Clip his wings.',
  6: 'Sharper, louder, trickier. He talks a big game for a reason.',
  9: 'The man himself. Everything on the table. Time to beat Brendo.',
};
const ICON: Record<number, string> = { 3: '♟', 6: '♞', 9: '♚' };
export const BRENDO_ROAD: RoadCfg = {
  title: 'TIME TO BEAT BRENDO',
  narrative: 'Nine relaxed levels, one loud rival. Beat BRENDO at the top.',
  max: BRENDO_MAX,
  storageKey: 'ct-brendo-level-v1',
  playHref: '/play-chester?road=brendo',
  zones: [
    { from: 1, name: "BRENDO'S BACKYARD", bg: 'linear-gradient(180deg,#123a2f,#1c5741)', tag: 'Where the smack talk begins.' },
    { from: 4, name: 'TRASH-TALK ALLEY', bg: 'linear-gradient(180deg,#2c2440,#3c3057)', tag: 'Mind games included, free of charge.' },
    { from: 7, name: "BRENDO'S ROOFTOP", bg: 'linear-gradient(180deg,#3d1622,#5c1f30)', tag: 'One door left. He can hear you coming.' },
  ],
  bosses: Object.fromEntries(Object.entries(BRENDO_ROSTER).map(([k, b]) => [k, { name: b.name, archetype: b.archetype, line: LINES[+k] || '', icon: ICON[+k] || '♟' }])),
  strength: (n) => { const e = n >= 4 ? engineEloFor(n) : eloForLevel(n); return e ? `~${e} Elo` : 'full strength'; },
};
