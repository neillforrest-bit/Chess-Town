'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { TriviaQuestionClock, useTriviaQuestionTimer } from '@/components/TriviaQuestionClock';
import { QUESTION_TIMEOUT_ANSWER } from '@/lib/trivia-match';
import ChesterHost from '@/components/ChesterHost';
import { TriviaSetupPanel } from '@/components/TriviaSetupPanel';
import { fetchTriviaQuestion, type TriviaQuestion } from '@/lib/trivia';
import { freeTriviaCommentaryReply, isFreeTriviaCommentaryTest } from '@/lib/trivia-commentary-test';
import { loadTriviaSettings, saveTriviaSettings, type TriviaSettings } from '@/lib/trivia-settings';

type AnswerState = 'idle' | 'submitting' | 'answered';

export default function TriviaPage() {
  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [chesterReply, setChesterReply] = useState('The first round is on the house. Do not embarrass the tavern.');
  const [settings, setSettings] = useState<TriviaSettings>(() => loadTriviaSettings());
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetchTriviaQuestion(settings)
      .then((nextQuestion) => {
        if (!cancelled) setQuestion(nextQuestion);
      })
      .catch(() => {
        if (!cancelled) setError('The trivia ledger is temporarily unavailable. Please draw another question.');
      });
    return () => {
      cancelled = true;
    };
  }, [round, settings]);

  const answeredRef = useRef(false);
  const timer = useTriviaQuestionTimer(question && answerState === 'idle' ? `${round}:${question.question}` : null, undefined, () => { void selectAnswer(QUESTION_TIMEOUT_ANSWER); });
  async function selectAnswer(answer: string) {
    if (!question || answerState !== 'idle' || answeredRef.current) return;
    answeredRef.current = true;
    if (timer.expired()) answer = QUESTION_TIMEOUT_ANSWER;
    if (answer === QUESTION_TIMEOUT_ANSWER) {
      setSelectedAnswer(answer);
      setAnswerState('answered');
      setChesterReply(`Time's up. The answer was ${question.correctAnswer}. No point this time.`);
      return;
    }
    const isCorrect = answer === question.correctAnswer;
    setSelectedAnswer(answer);
    setAnswerState('submitting');
    if (isCorrect) setScore((current) => current + 1);

    try {
      if (isFreeTriviaCommentaryTest()) {
        setChesterReply(freeTriviaCommentaryReply({ selectedAnswer: answer, correctAnswer: question.correctAnswer }));
        setAnswerState('answered');
        return;
      }
      const response = await fetch('/api/trivia-commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          correctAnswer: question.correctAnswer,
          selectedAnswer: answer,
        }),
      });
      const data = await response.json() as { reply?: string };
      setChesterReply(data.reply || (isCorrect ? 'Correct. Chester is briefly impressed.' : `The answer was ${question.correctAnswer}.`));
    } catch {
      setChesterReply(isCorrect ? 'Correct. Chester is briefly impressed.' : `The answer was ${question.correctAnswer}.`);
    } finally {
      setAnswerState('answered');
    }
  };

  const updateSettings = (next: TriviaSettings) => {
    answeredRef.current = false;
    setSettings(next);
    saveTriviaSettings(next);
    setQuestion(null);
    setSelectedAnswer(null);
    setAnswerState('idle');
  };

  const nextQuestion = () => {
    answeredRef.current = false;
    setSelectedAnswer(null);
    setAnswerState('idle');
    setQuestion(null);
    setError('');
    setRound((current) => current + 1);
  };

  return (
    <main className={`trivia-page trivia-timed-quiz${question && answerState === 'idle' && timer.left <= 5 && timer.left > 0 ? ' is-time-low' : ''}`}>
      <header className="trivia-header">
        <div><span>CHESTER&apos;S PUB TRIVIA</span><h1>Last Call Quiz</h1></div>
        <Link href="/arena">Arena</Link>
      </header>
      <ChesterHost eyebrow="THE HOUSE QUIZMASTER" instruction="Pick the right answer, collect the point, and try not to make Chester ring the shame bell." />
      <TriviaSetupPanel settings={settings} onChange={updateSettings} compact />
      <section className="trivia-game" aria-live="polite">
        <div className="trivia-scoreboard"><span>ROUND {round}</span><b>{score} POINT{score === 1 ? '' : 'S'}</b></div>
        {error ? (
          <div className="trivia-error"><p>{error}</p><button onClick={nextQuestion}>DRAW QUESTION</button></div>
        ) : !question ? (
          <div className="trivia-loading"><span>CHESTER IS RAIDING THE TRIVIA CELLAR&apos;S BACK ROOM...</span></div>
        ) : (
          <>
            <div className="trivia-question">
              <span>{question.category} · {question.difficulty}</span>
              <h2>{question.question}</h2>
            </div>
            {answerState === 'idle' && <TriviaQuestionClock seconds={timer.left} />}
            <div className="trivia-answers">
              {question.answers.map((answer) => {
                const isCorrect = answer === question.correctAnswer;
                const isSelected = answer === selectedAnswer;
                const isAnswered = answerState === 'answered';
                const resultClass = isAnswered ? (isCorrect ? 'is-correct' : isSelected ? 'is-wrong' : '') : '';
                return <button className={resultClass} key={answer} onClick={() => void selectAnswer(answer)} disabled={answerState !== 'idle' || timer.left === 0}>{answer}</button>;
              })}
            </div>
            <div className="trivia-host-reply">{answerState === 'submitting' ? 'Chester is consulting the bar ledger...' : chesterReply}</div>
            {answerState === 'answered' && <button className="trivia-next" onClick={nextQuestion}>NEXT ROUND</button>}
          </>
        )}
      </section>
    </main>
  );
}
