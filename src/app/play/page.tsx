import GameHub from '@/components/GameHub';
export default function PlayHub() {
  return <GameHub door="play" extras={[
    { href: '/training', icon: '♝', title: 'LESSONS', copy: 'Nine short coached drills.' },
    { href: '/daily-challenge', icon: '☀️', title: 'DAILY PUZZLE', copy: 'One puzzle a day. Keep the streak.' },
    { href: '/learn', icon: '📈', title: 'MY LEARNING', copy: 'Where you slip, and how to fix it.' },
    { href: '/puzzle-mill', icon: '🏭', title: 'FIX MY MISTAKES', copy: 'Puzzles from your own slips.' },
  ]} />;
}
