import { disposeStockfishClient, getStockfishClient } from './stockfish';

export async function runStockfishDiagnostics() {
  const startedAt = performance.now();
  try {
    const result = await getStockfishClient().diagnose();
    return { ok: true, elapsedMs: Math.round(performance.now() - startedAt), ...result };
  } finally {
    disposeStockfishClient();
  }
}