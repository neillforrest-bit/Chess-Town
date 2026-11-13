'use client';

import './QuizMaster.css';

// Deliberately separate from chess's Chester and Movie Town's host/state.
export function QuizMaster({ question, label = 'Chester asks', className = '' }: { question: string; label?: string; className?: string }) {
  return <div className={`quiz-master${question.length > 120 ? ' quiz-master--long' : ''} ${className}`}>
    <div className="quiz-master__portrait" aria-hidden="true"><svg viewBox="0 0 100 110" role="presentation">
      <path d="M28 48C14 29 14 5 23 7c11 2 19 30 17 43M61 48C63 23 77 5 83 10c8 9-1 34-11 43" fill="#ad9cce" stroke="#362847" strokeWidth="3" />
      <path d="M29 37C22 23 20 14 23 14c5 2 10 16 12 26M67 39c4-14 11-24 13-24 1 8-3 18-8 27" fill="#e7bbca" />
      <path d="M26 55c0-24 43-29 49 0l-1 30c-3 20-49 20-51 0z" fill="#bba9d8" stroke="#362847" strokeWidth="3" />
      <path d="M35 43l6-8 6 5 7-6 9 10" fill="#645275" />
      <ellipse cx="48" cy="85" rx="28" ry="18" fill="#efe0cc" stroke="#362847" strokeWidth="3" />
      <ellipse cx="34" cy="59" rx="6" ry="8" fill="#fff8ed" /><ellipse cx="64" cy="59" rx="6" ry="8" fill="#fff8ed" />
      <circle cx="36" cy="60" r="3" fill="#282235" /><circle cx="62" cy="60" r="3" fill="#282235" />
      <path d="M30 50l10-2M59 48l10 3M36 91q13 9 26-2" fill="none" stroke="#362847" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="33" cy="81" rx="3" ry="2" fill="#8a6f76" /><ellipse cx="62" cy="81" rx="3" ry="2" fill="#8a6f76" />
      <path d="M32 41L25 25l19 6 9-16 8 17 18-2-10 16z" fill="#d0a961" stroke="#362847" strokeWidth="2" /><circle cx="25" cy="25" r="4" fill="#e9d49c" /><circle cx="53" cy="15" r="4" fill="#e9d49c" /><circle cx="79" cy="30" r="4" fill="#e9d49c" />
    </svg><span>QUIZ MASTER</span></div>
    <div className="quiz-master__speech"><span className="quiz-master__label">{label}</span><h2 className="quiz-master__question">{question}</h2></div>
  </div>;
}

export function QuizCountdown({ seconds, duration, label = 'Time to think' }: { seconds: number; duration: number; label?: string }) {
  const ratio = Math.max(0, Math.min(1, seconds / duration));
  const low = seconds <= Math.min(5, duration / 3) && seconds > 0;
  return <div className={`quiz-countdown${low ? ' is-red' : ''}`} role="timer" aria-label={`${Math.ceil(seconds)} seconds remaining`} style={{ '--quiz-clock-colour': `hsl(${low ? 0 : Math.round(ratio * 120)} 68% 54%)` } as React.CSSProperties}>
    <div className="quiz-countdown__caption"><span>{label}</span><b>{seconds > 0 ? `${Math.ceil(seconds)}s` : "Time's up"}</b></div>
    <div className="quiz-countdown__track"><i style={{ width: `${ratio * 100}%` }} /></div>
  </div>;
}
