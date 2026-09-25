import type { Metadata } from 'next';
import { decodeVerdict } from '@/lib/verdict';
import VerdictCardView from '@/components/VerdictCardView';

type Props = { searchParams: Promise<{ c?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const card = decodeVerdict((await searchParams).c);
  return {
    title: card ? `Chester graded this game ${card.g} (${card.s}/100) · CHESS-TOWN` : 'CHESS-TOWN VERDICT',
    description: card ? card.h : 'Chester’s report card for a finished game of chess.',
  };
}

export default async function VerdictPage({ searchParams }: Props) {
  const card = decodeVerdict((await searchParams).c);
  return <VerdictCardView card={card} />;
}
