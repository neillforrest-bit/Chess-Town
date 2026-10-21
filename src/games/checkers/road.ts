import type { RoadCfg } from '../RoadMap';
export const CK_ROAD_KEY = 'ct-road-checkers-v1';
export const CK_ROAD_MAX = 15;
/** Search depth and the chance of playing a non-best move, per road level 1..15. */
export const CK_DEPTH = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 8];
export const CK_SLIP = [0.55, 0.45, 0.35, 0.28, 0.22, 0.17, 0.12, 0.09, 0.06, 0.04, 0.03, 0.02, 0.01, 0, 0];
export const getCkRoad = () => { try { const n = parseInt(window.localStorage.getItem(CK_ROAD_KEY) || '1', 10); return Math.min(CK_ROAD_MAX, Math.max(1, n || 1)); } catch { return 1; } };
export const setCkRoad = (n: number) => { try { window.localStorage.setItem(CK_ROAD_KEY, String(Math.min(CK_ROAD_MAX, Math.max(1, n)))); } catch { /* storage unavailable */ } };
export const CHECKERS_ROAD: RoadCfg = {
  title: 'ROAD TO KING HENRY', narrative: 'Beat King Henry and you rule the board.', max: CK_ROAD_MAX, storageKey: CK_ROAD_KEY, playHref: '/play-checkers?road=1',
  zones: [
    { from: 1, name: 'MAN STREET', bg: 'linear-gradient(180deg,#4d2a1f,#6b3a2f)', tag: 'Every king was a man once.' },
    { from: 4, name: 'JUMP ALLEY', bg: 'linear-gradient(180deg,#352414,#3d3a1b)', tag: 'Look both ways before you capture.' },
    { from: 7, name: 'CROWN HEIGHTS', bg: 'linear-gradient(180deg,#3b2a55,#4a3366)', tag: 'The back row is close. So are they.' },
    { from: 10, name: 'DOUBLE-JUMP DOCKS', bg: 'linear-gradient(180deg,#1d3b57,#27506e)', tag: 'Two for one is a tax here.' },
    { from: 13, name: 'THE ROYAL COURT', bg: 'linear-gradient(180deg,#3a1420,#561b2a)', tag: 'One throne left.' },
  ],
  bosses: {
    3: { name: 'Huff Harry', archetype: 'The Greedy Jumper', line: 'Grabs every capture he sees. Set a trap and he walks in.', icon: '🔴' },
    6: { name: 'Lady Double', archetype: 'The Combo Queen', line: 'Loves a two-for-one. Do not leave her a gap.', icon: '⚫' },
    9: { name: 'The Wall', archetype: 'The Back-Row Guard', line: 'Never leaves home. Crowning past him is a puzzle.', icon: '🧱' },
    12: { name: 'Count Crown', archetype: 'The King Hunter', line: 'Races to the back row. Block him or lose the endgame.', icon: '👑' },
    15: { name: 'King Henry', archetype: 'The Checkers Champion', line: 'Searches eight moves deep and never slips. Beat him and you rule the board.', icon: '♔' },
  },
  strength: (n) => `thinks ${CK_DEPTH[n - 1]} move${CK_DEPTH[n - 1] > 1 ? 's' : ''} ahead`,
};
