export const TRV_ROAD_KEY = 'ct-road-trivia-v1';
export const TRV_ROAD_MAX = 15;
/** Chance Chester answers a question correctly, per road level 1..15 (a round is 5 questions). */
export const TRIVIA_ACC = [0.3, 0.36, 0.42, 0.48, 0.54, 0.58, 0.62, 0.66, 0.7, 0.74, 0.78, 0.82, 0.86, 0.9, 0.94];
export const getTrvRoad = () => { try { const n = parseInt(window.localStorage.getItem(TRV_ROAD_KEY) || '1', 10); return Math.min(TRV_ROAD_MAX, Math.max(1, n || 1)); } catch { return 1; } };
export const setTrvRoad = (n: number) => { try { window.localStorage.setItem(TRV_ROAD_KEY, String(Math.min(TRV_ROAD_MAX, Math.max(1, n)))); } catch { /* storage unavailable */ } };
