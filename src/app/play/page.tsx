import GameHub from '@/components/GameHub';
export default function PlayHub() {
  return <GameHub door="play" extras={[
    { href: '/quiz', icon: '🔐', title: 'ALL QUIZ GAMES', copy: 'Logic, Grammar, Pub Trivia and Party Table.' },
    { href: '/trivia-brawl?topic=grammar', icon: '✍', title: 'GRAMMAR', copy: 'Pick your difficulty and play.' },
    { href: '/trivia-party', icon: '🍻', title: 'PARTY TABLE', copy: 'Two to five players on separate phones.' },
    { href: '/training', icon: '♝', title: 'LESSONS', copy: 'Nine short coached drills.' },
    { href: '/daily-challenge', icon: '☀️', title: 'DAILY PUZZLE', copy: 'One puzzle a day. Keep the streak.' },
    { href: '/learn', icon: '📈', title: 'MY LEARNING', copy: 'Where you slip, and how to fix it.' },
    { href: '/puzzle-mill', icon: '🏭', title: 'FIX MY MISTAKES', copy: 'Puzzles from your own slips.' },
  ]} />;
}
