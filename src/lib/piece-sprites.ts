// Glossy sprite pieces: drawn to canvas as bitmaps so iOS can never hijack the
// unicode chess glyphs into Apple color emoji (which ignores our colors).
// Look: white army = glossy blue, black army = orange flame (the "fusion" build he approved).

const SPRITE_GLYPHS: Record<string, string> = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };
const TEXT_VS = '\uFE0E';

const PALETTES: Record<'w' | 'b', { stops: [string, string, string]; stroke: string; glow: string }> = {
  w: { stops: ['#cfeaff', '#4f9df0', '#1d45b8'], stroke: '#0a1f54', glow: 'rgba(120,190,255,.7)' },
  b: { stops: ['#ffe066', '#ff8c1f', '#d4240c'], stroke: '#4a0d02', glow: 'rgba(255,150,40,.65)' },
};

export function drawPieceSprite(ctx: CanvasRenderingContext2D, color: 'w' | 'b', type: string, size: number) {
  const pal = PALETTES[color];
  const glyph = (SPRITE_GLYPHS[type] || SPRITE_GLYPHS.p) + TEXT_VS;
  const x = size / 2;
  const y = size * 0.56;
  ctx.clearRect(0, 0, size, size);
  ctx.font = `900 ${Math.round(size * 0.78)}px Georgia, 'Times New Roman', serif`;
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
