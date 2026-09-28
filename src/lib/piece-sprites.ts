// Original 16x16 pixel-art pieces, drawn as bitmaps (iOS can never hijack these into
// Apple color emoji, and they read crisp at phone size). Retro adventure-game souls:
// squire pawn, keep rook, horse knight, wizard bishop, jeweled queen, cross-crowned king.
// Armies: player = frost blue, Chester = flame orange. Batch 87, his creative call.
const PIX: Record<string, string[]> = {
  p: [
    "................",
    ".....OOOOOO.....",
    "....OhhhhhOO....",
    "...OhmmhmmmhmO..",
    "..OmmmmmmmmmmO..",
    "..OmmOmmmmOmmO..",
    "..OmmmmmmmmmmO..",
    "...OmmmmmmmmO...",
    "....OmmmmmmO....",
    "...OOmmmmmmOO...",
    "..OmmmmmmmmmmO..",
    "..OsmmmmmmmmmmO.",
    "..OmmmmmmmmmmO..",
    ".OOsmmmmmmmmmOO.",
    ".OmmmmmmmmmmmmO.",
    ".OOOOOOOOOOOOOO.",
  ],
  r: [
    ".OOO..OOOO..OOO.",
    ".OmhO.OmhmO.OmO.",
    ".OmmOOmmmmOOmmO.",
    ".OmmmmmmmmmmmmO.",
    ".OmmmmmmmmmmmmO.",
    "..OmmmmmmmmmmO..",
    "..OsmmOmmmOmmO..",
    "..OmmmOmmmOmmO..",
    "..OmmmmmmmmmmO..",
    "..OsmmmmmmmmmO..",
    "..OmmmmmmmmmmO..",
    "..OsmmmmmmmmmO..",
    ".OOmmmmmmmmmmOO.",
    ".OmssmmmmmmmmmO.",
    ".OmmmmmmmmmmmmO.",
    ".OOOOOOOOOOOOOO.",
  ],
  n: [
    "................",
    "......OO........",
    ".....OmmOO......",
    "....OmmmmmOO....",
    "...OmmOmmmmmO...",
    "..OmmmmmmmmO....",
    "..OmmmmmmmO.....",
    "..OmmmmmO.......",
    ".OmmmmmO........",
    ".OmmmO..........",
    ".OmmOOOOOOOO....",
    ".OmmmmmmmmmmO...",
    ".OsmmmmmmmmmmO..",
    ".OOmmmmmmmmmmOO.",
    ".OmmmmmmmmmmmmO.",
    ".OOOOOOOOOOOOOO.",
  ],
  b: [
    ".......OO.......",
    "......OmmO......",
    "......OmhO......",
    ".....OmmmhO.....",
    ".....OmmmmO.....",
    "....OmmmmmmO....",
    "....OmmmmmmO....",
    "...OmggggggmO...",
    "..OOOOOOOOOOOO..",
    "..OmmmmmmmmmmO..",
    "..OmmOmmmmOmmO..",
    "..OmmmmmmmmmmO..",
    "..OsmmmmmmmmmO..",
    ".OOmmmmmmmmmmOO.",
    ".OmsmmmmmmmmmmO.",
    ".OOOOOOOOOOOOOO.",
  ],
  q: [
    "................",
    "..gO..gO...gO...",
    ".OmOOmmOOmmOO...",
    ".OmmmmmmmmmmO...",
    ".OmmggggggmmO...",
    "..OmmmmmmmmO....",
    "...OmmmmmmO.....",
    "....OmmmmO......",
    "...OmmmmmmO.....",
    "..OmmmmmmmmO....",
    "..OmmmmmmmmO....",
    ".OmsmmmmmmmmmO..",
    ".OmmmmmmmmmmmO..",
    "OOsmmmmmmmmmmOO.",
    "OmmmmmmmmmmmmmO.",
    "OOOOOOOOOOOOOOO.",
  ],
  k: [
    "......OOOO......",
    "......OggO......",
    "...OOOOggOOOO...",
    "...OggggggggO...",
    "...OOOOOOOOOO...",
    "..OOOOOOOOOOOO..",
    ".OmggggggggggmO.",
    ".OmmmmmmmmmmmO..",
    "..OmmmmmmmmmO...",
    ".OOmmmmmmmmmOO..",
    ".OmmmOmmmOmmmmO.",
    ".OmmmOmmmOmmmmO.",
    ".OmsmmmmmmmmmmO.",
    ".OOmmmmmmmmmmOO.",
    ".OmmmmmmmmmmmmO.",
    ".OOOOOOOOOOOOOO.",
  ],
};

const PAL: Record<'w' | 'b', Record<string, string>> = {
  w: { O: '#0a0a0f', h: '#a8d8ff', m: '#3580e0', s: '#14348c', g: '#ffd84d' },
  b: { O: '#0a0a0f', h: '#ffc94d', m: '#ff7714', s: '#b8160a', g: '#fff3c2' },
};

export function drawPieceSprite(ctx: CanvasRenderingContext2D, color: 'w' | 'b', type: string, size: number, opts?: { small?: boolean }) {
  const map = PIX[type] || PIX.p;
  const pal = PAL[color];
  const px = size / 16;
  ctx.clearRect(0, 0, size, size);
  for (let y = 0; y < 16; y++) {
    const row = map[y];
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(Math.floor(x * px), Math.floor(y * px), Math.ceil(px), Math.ceil(px));
    }
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
