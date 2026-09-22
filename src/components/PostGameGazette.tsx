'use client';
import { useEffect, useMemo, useState } from 'react';

export type GazetteResult = 'checkmate' | 'draw' | 'resigned';
type GazetteApiResponse = { dispatch?: string; isFallback?: boolean; error?: string };

const RESULT_HEADLINES: Record<GazetteResult, string> = {
  checkmate: 'CHECKMATE DECLARED!',
  draw: 'HONOURABLE DRAW DECLARED!',
  resigned: 'RESIGNATION TENDERED!',
};

function getTurningPoint(pgn: string) {
  const moves = pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/)
    .filter((move) => move && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(move));
  if (!moves.length) return 'A battle whose decisive moment remains locked in Chester’s archives.';
  const index = Math.max(0, Math.min(moves.length - 1, Math.floor(moves.length * .66)));
  return `Turning point: ${moves[index]} on move ${Math.floor(index / 2) + 1}.`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/); let line = ''; let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > width && line) {
      ctx.fillText(line, x, y); y += lineHeight; lines += 1; line = word;
      if (lines >= maxLines) return y;
    } else line = test;
  }
  if (line && lines < maxLines) { ctx.fillText(line, x, y); y += lineHeight; }
  return y;
}

export default function PostGameGazette({ pgn, result, playerColor = 'w', onClose }: { pgn: string; result: GazetteResult; playerColor?: 'w' | 'b'; onClose?: () => void }) {
  const [dispatch, setDispatch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLabel, setActionLabel] = useState('SHARE RESULT CARD');
  const turningPoint = useMemo(() => getTurningPoint(pgn), [pgn]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/gazette', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pgn, result, playerColor }), signal: AbortSignal.timeout(15_000) });
        const data = (await response.json()) as GazetteApiResponse;
        if (!cancelled) setDispatch(data.dispatch || 'Chester reports a hard-fought contest in the neon court.');
      } catch { if (!cancelled) setDispatch('Chester reports a hard-fought contest in the neon court.'); }
      finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [pgn, result, playerColor]);

  const makeCard = async () => {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1350); gradient.addColorStop(0, '#071416'); gradient.addColorStop(.55, '#170918'); gradient.addColorStop(1, '#050708');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, 1350);
    ctx.strokeStyle = '#00e5e5'; ctx.lineWidth = 8; ctx.strokeRect(42, 42, 996, 1266);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ff7ab6'; ctx.font = '800 30px Georgia'; ctx.fillText('CHESTER PRESENTS', 540, 130);
    ctx.fillStyle = '#f4feff'; ctx.font = '900 72px Georgia'; ctx.fillText('THE CHESS-TOWN GAZETTE', 540, 220);
    ctx.fillStyle = '#ffd84d'; ctx.font = '900 46px Georgia'; ctx.fillText(RESULT_HEADLINES[result], 540, 305);
    ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(130, 350); ctx.lineTo(950, 350); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#f4ecd8'; ctx.font = '700 39px Georgia';
    let y = wrap(ctx, `“${dispatch}”`, 130, 440, 820, 58, 9);
    ctx.fillStyle = '#00e5e5'; ctx.font = '900 32px Georgia'; y += 38; wrap(ctx, turningPoint.toUpperCase(), 130, y, 820, 46, 3);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ff7ab6'; ctx.font = '900 33px Georgia'; ctx.fillText('PLAY. LEARN. SHARE THE DRAMA.', 540, 1190);
    ctx.fillStyle = '#f4feff'; ctx.font = '700 28px Georgia'; ctx.fillText(window.location.origin.replace(/^https?:\/\//, ''), 540, 1245);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Image failed')), 'image/png'));
  };

  const shareCard = async () => {
    try {
      const blob = await makeCard(); const file = new File([blob], 'chess-town-gazette.png', { type: 'image/png' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: 'My Chess-Town result', text: 'Chester filed the match report. Can you beat me?', files: [file], url: window.location.origin });
        setActionLabel('SHARED!');
      } else {
        const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); URL.revokeObjectURL(url); setActionLabel('CARD SAVED!');
      }
    } catch (error) { if ((error as Error).name !== 'AbortError') setActionLabel('TRY AGAIN'); }
    setTimeout(() => setActionLabel('SHARE RESULT CARD'), 1800);
  };

  return <div role="dialog" aria-modal="true" aria-label="Chess-Town Gazette dispatch" className="gazette-overlay">
    <article className="gazette-card">
      <header><small>EST. 1826 · CHESTER’S MATCH REPORT</small><h2>The Chess-Town Gazette</h2><b>{RESULT_HEADLINES[result]}</b></header>
      {isLoading ? <p className="gazette-loading">THE PRESSES ARE ROLLING…</p> : <><p className="gazette-dispatch">{dispatch}</p><p className="gazette-turning">{turningPoint}</p></>}
      <footer><button onClick={shareCard} disabled={isLoading || !dispatch}>{actionLabel}</button>{onClose && <button className="secondary" onClick={onClose}>CLOSE</button>}</footer>
    </article>
  </div>;
}
