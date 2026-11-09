import { localCategoryName, pickLocalQuestion } from './trivia-local';
import { DEFAULT_TRIVIA_SETTINGS, roundDifficulty, sportFocusCategoryId, type TriviaSettings } from './trivia-settings';

export type TriviaQuestion = {
  category: string;
  difficulty: string;
  question: string;
  correctAnswer: string;
  answers: string[];
};

type OpenTriviaResponse = {
  response_code: number;
  results: Array<{
    category: string;
    difficulty: string;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
  }>;
};

function decodeHtml(value: string): string {
  if (typeof document === 'undefined') return value;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export async function fetchTriviaQuestion(settings: TriviaSettings = DEFAULT_TRIVIA_SETTINGS): Promise<TriviaQuestion> {
  const focusId = sportFocusCategoryId(settings.focus);
  const heat = roundDifficulty(settings.difficulty, 0);
  if (focusId) {
    const source = pickLocalQuestion(focusId, heat);
    if (!source) throw new Error('The focused sports shelf is empty');
    return {
      category: localCategoryName(focusId),
      difficulty: heat,
      question: source.question,
      correctAnswer: source.correct,
      answers: shuffle([source.correct, ...source.wrong]),
    };
  }

  const difficultyQuery = settings.difficulty === 'classic' ? '' : `&difficulty=${heat === 'master' ? 'hard' : heat}`;
  const response = await fetch(`https://opentdb.com/api.php?amount=1&type=multiple${difficultyQuery}`);
  if (!response.ok) throw new Error('Trivia service request failed');

  const payload = await response.json() as OpenTriviaResponse;
  const question = payload.results[0];
  if (payload.response_code !== 0 || !question || question.incorrect_answers.length !== 3) {
    throw new Error('Trivia service returned no multiple-choice question');
  }

  const correctAnswer = decodeHtml(question.correct_answer);
  return {
    category: decodeHtml(question.category),
    difficulty: settings.difficulty === 'classic' ? question.difficulty : heat,
    question: decodeHtml(question.question),
    correctAnswer,
    answers: shuffle([correctAnswer, ...question.incorrect_answers.map(decodeHtml)]),
  };
}
