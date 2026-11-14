// Recovery is scoped to this browser tab and origin, not an account or backup.
const PREFIX = 'ct-checkpoint-v1:';
const MAX_AGE = 24 * 60 * 60 * 1000;
export function saveCheckpoint(key: string, value: unknown): boolean {
  try { sessionStorage.setItem(PREFIX + key, JSON.stringify({ version: 1, at: Date.now(), value })); return true; }
  catch { return false; }
}
export function loadCheckpoint<T>(key: string, valid: (value: T) => boolean): T | null {
  try { const raw = sessionStorage.getItem(PREFIX + key); if (!raw) return null;
    const data = JSON.parse(raw); if (data.version !== 1 || !Number.isFinite(data.at) || Date.now() - data.at > MAX_AGE || data.at > Date.now() + 60000 || !valid(data.value)) return null;
    return data.value as T;
  } catch { return null; }
}
export function clearCheckpoint(key: string) { try { sessionStorage.removeItem(PREFIX + key); } catch { /* optional storage */ } }

export function hasCheckpoint(key: string): boolean { try { return sessionStorage.getItem(PREFIX + key) !== null; } catch { return false; } }
