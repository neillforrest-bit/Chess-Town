import Link from 'next/link';
import { QuizMaster } from '@/components/QuizMaster';
export const metadata = { title: "Chester's Quiz Games" };
export default function QuizGames() {
  return <main className="quiz-games-door"><QuizMaster question="Which table are we playing tonight?" label="Chester's quiz games" /><p>Same quiz master. Three ways to keep him on his toes.</p><nav aria-label="Choose a quiz"><Link href="/logic-brawl"><b>Logic &amp; Riddles</b><span>Number Lab, Pattern Alley and more</span></Link><Link href="/trivia-brawl"><b>Pub Trivia</b><span>Solo, pass &amp; play, a friend or the whole table</span></Link><Link href="/trivia-brawl?topic=grammar&amp;difficulty=hard"><b>Grammar</b><span>Trickier questions. Fifteen seconds to think.</span></Link></nav></main>;
}
