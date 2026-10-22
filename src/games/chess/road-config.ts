import { BOSS_ROSTER, ROAD_MAX, eloForLevel } from '@/lib/road';
import type { RoadCfg } from '../RoadMap';
const LINES: Record<number, string> = {
  3: 'Casual, chatty, and confident. Beat him and the road opens.',
  6: 'Methodical. He never blunders on purpose and never rushes.',
  9: 'Chaos with a bishop. Expect sacrifices that almost work.',
  12: 'A wall of pawns and patience. Break it or be frozen out.',
  15: 'Full grandmaster strength. Beat Joseph and you are ready to call yourself a grandmaster.',
};
const ICON: Record<number, string> = { 3: '♟', 6: '♞', 9: '♝', 12: '♛', 15: '♚' };
export const CHESS_ROAD: RoadCfg = {
  title: 'ROAD TO JOSEPH', narrative: 'Beat Joseph and you are ready to be a grandmaster.', max: ROAD_MAX, storageKey: 'ct-road-level-v1', playHref: '/play-chester?road=1', dailyHref: '/chessdle',
  zones: [
    { from: 1, name: 'PAWN MEADOW', bg: 'linear-gradient(180deg,#1f4d2b,#2f6b3a)', tag: 'Where every legend starts.' },
    { from: 4, name: 'KNIGHT FOREST', bg: 'linear-gradient(180deg,#143524,#1b3d3a)', tag: 'The trees watch your every move.' },
    { from: 7, name: 'BISHOP HILLS', bg: 'linear-gradient(180deg,#3b2a55,#4a3366)', tag: 'Diagonals everywhere. Nowhere to hide.' },
    { from: 10, name: 'FROZEN KEEP', bg: 'linear-gradient(180deg,#1d3b57,#27506e)', tag: 'Cold, patient, hard to crack.' },
    { from: 13, name: 'JOSEPH\u2019S CASTLE', bg: 'linear-gradient(180deg,#3a1420,#561b2a)', tag: 'One door left.' },
  ],
  bosses: Object.fromEntries(Object.entries(BOSS_ROSTER).map(([k, b]) => [k, { name: b.name, archetype: b.archetype, line: LINES[+k], icon: ICON[+k] }])),
  strength: (n) => { const e = eloForLevel(n); return e ? `~${e} Elo` : 'full strength'; },
};
