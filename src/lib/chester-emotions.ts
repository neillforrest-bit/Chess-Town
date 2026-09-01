export type ChesterEmotion = 'aggressive' | 'skeptical' | 'impressed' | 'thinking' | 'encouraging' | 'neutral';

export const CHESTER_EMOTIONS: Record<ChesterEmotion, { emoji: string; text: string }> = {
  aggressive: { emoji: '😈', text: "Pushing the Trompowsky? Let's see if you can handle the tension." },
  skeptical: { emoji: '🤨', text: 'The Bongcloud? Bold. Foolish, but bold.' },
  impressed: { emoji: '🔥', text: "Brilliant tactic. I didn't think you saw that mate." },
  thinking: { emoji: '🧠', text: 'Calculating consequences.' },
  encouraging: { emoji: '⚡', text: 'Keep the pressure on.' },
  neutral: { emoji: '♞', text: 'The board is yours.' },
};

export function getChesterEmotion(text: string): ChesterEmotion {
  const value = text.toLowerCase();
  if (/(blunder|mistake|disaster|panic|foolish)/.test(value)) return 'aggressive';
  if (/(brilliant|best|great|genius|excellent)/.test(value)) return 'impressed';
  if (/(bongcloud|risky|questionable|bold)/.test(value)) return 'skeptical';
  if (/(calculate|analyz|thinking)/.test(value)) return 'thinking';
  if (/(keep|strong|good|solid|pressure)/.test(value)) return 'encouraging';
  return 'neutral';
}
