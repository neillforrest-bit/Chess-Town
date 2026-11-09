// Explicit preview-only commentary test mode. The exact preview hostname and
// query flag are both required, so production traffic can never take this path.
const PREVIEW_TEST_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'chess-town-git-instinct-trivia-mainline-184-neillo.vercel.app',
]);

export function isFreeTriviaCommentaryTest(): boolean {
  if (typeof window === 'undefined') return false;
  if (!PREVIEW_TEST_HOSTS.has(window.location.hostname)) return false;
  return new URLSearchParams(window.location.search).get('triviaFreeCommentary') === '1';
}

type FreeCommentaryPayload = {
  mode?: string;
  p1Name?: string;
  p2Name?: string;
  selectedAnswer?: string;
  correctAnswer?: string;
  roundIndex?: number;
};

export function freeTriviaCommentaryReply(payload: FreeCommentaryPayload): string {
  if (payload.mode === 'brawl-intro') {
    return `FREE PREVIEW TEST: ${payload.p1Name || 'Player One'} and ${payload.p2Name || 'Player Two'}, the bell is rung and no paid commentary was called.`;
  }
  if (payload.mode === 'brawl-round') {
    return `FREE PREVIEW TEST: Round ${Number(payload.roundIndex ?? 0) + 1} is settled. No paid commentary was called.`;
  }
  if (payload.selectedAnswer && payload.selectedAnswer === payload.correctAnswer) {
    return 'FREE PREVIEW TEST: Correct. No paid commentary was called.';
  }
  return `FREE PREVIEW TEST: The answer was ${payload.correctAnswer || 'on the card'}. No paid commentary was called.`;
}
