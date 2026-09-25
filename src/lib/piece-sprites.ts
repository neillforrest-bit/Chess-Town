// Glossy sprite pieces: drawn to canvas as bitmaps so iOS can never hijack the
// unicode chess glyphs into Apple color emoji (which ignores our colors).
// Look: white army = glossy blue, black army = orange flame (the "fusion" build he approved).

const SPRITE_GLYPHS: Record<string, string> = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };
const TEXT_VS = '\uFE0E';

const PALETTES: Record<'w' | 'b', { stops: [string, string, string]; stroke: string; glow: string }> = {
  w: { stops: ['#cfeaff', '#4f9df0', '#1d45b8'], stroke: '#0a1f54', glow: 'rgba(120,190,255,.7)' },
  b: { stops: ['#ffe066', '#ff8c1f', '#d4240c'], stroke: '#4a0d02', glow: 'rgba(255,150,40,.65)' },
};

// Silhouette separation: pawns are chubby and short, bishops tall with a deep
// mitre slit - at a glance the two can never be confused (his batch-27 note).
const TYPE_SCALE: Record<string, number> = { p: 0.6, r: 0.78, n: 0.82, b: 0.9, q: 0.88, k: 0.88 };

export function drawPieceSprite(ctx: CanvasRenderingContext2D, color: 'w' | 'b', type: string, size: number) {
  const pal = PALETTES[color];
  const glyph = (SPRITE_GLYPHS[type] || SPRITE_GLYPHS.p) + TEXT_VS;
  const x = size / 2;
  const y = size * 0.56;
  ctx.clearRect(0, 0, size, size);
  const typeScale = TYPE_SCALE[type] || 0.78;
  if (type === 'p') ctx.setTransform(1.18, 0, 0, 1, -size * 0.09, 0); // chubby pawn
  ctx.font = `900 ${Math.round(size * 0.78 * typeScale)}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.shadowColor = pal.glow;
  ctx.shadowBlur = size * 0.09;
  ctx.strokeStyle = pal.stroke;
  ctx.lineWidth = size * 0.07;
  ctx.strokeText(glyph, x, y);
  const grad = ctx.createLinearGradient(0, size * 0.1, 0, size * 0.98);
  grad.addColorStop(0, pal.stops[0]);
  grad.addColorStop(0.45, pal.stops[1]);
  grad.addColorStop(1, pal.stops[2]);
  ctx.fillStyle = grad;
  ctx.fillText(glyph, x, y);
  ctx.shadowBlur = 0;
  // glossy sheen clipped to the glyph pixels
  ctx.globalCompositeOperation = 'source-atop';
  const sheen = ctx.createRadialGradient(size * 0.38, size * 0.22, 2, size * 0.38, size * 0.22, size * 0.5);
  sheen.addColorStop(0, 'rgba(255,255,255,.6)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Chester flair (batch 44, his open creative call): royalty gets a town-gold crown
  // badge at the base - king and queen read as royal at phone size, on both armies.
  if (type === 'k' || type === 'q') {
    const bx = size * 0.76, by = size * 0.8, w = size * 0.17, h = size * 0.13;
    ctx.beginPath();
    ctx.moveTo(bx - w / 2, by + h / 2);
    ctx.lineTo(bx - w / 2, by - h * 0.1);
    ctx.lineTo(bx - w * 0.25, by + h * 0.05);
    ctx.lineTo(bx, by - h / 2);
    ctx.lineTo(bx + w * 0.25, by + h * 0.05);
    ctx.lineTo(bx + w / 2, by - h * 0.1);
    ctx.lineTo(bx + w / 2, by + h / 2);
    ctx.closePath();
    ctx.fillStyle = '#ffd84d';
    ctx.strokeStyle = 'rgba(40,24,0,.85)';
    ctx.lineWidth = size * 0.014;
    ctx.stroke();
    ctx.fill();
  }
  // Bishop: whisper the mitre slit - the batch-27 heavy black slash read as a
  // stray stroke on his iPad. One fine bright line keeps the silhouette cue.
  if (type === 'b') {
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.moveTo(size * 0.455, size * 0.26);
    ctx.lineTo(size * 0.545, size * 0.38);
    ctx.stroke();
  }
}

const cache: Record<string, string> = {};

export function getPieceSpriteDataUrl(color: 'w' | 'b', type: string, size = 144): string | null {
  if (typeof document === 'undefined') return null;
  const key = `${color}${type}`;
  if (cache[key]) return cache[key];
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawPieceSprite(ctx, color, type, size);
  cache[key] = canvas.toDataURL('image/png');
  return cache[key];
}
