type CommentaryPayload = {
  message?: string;
  context?: string;
  ply?: number;
  type?: string;
  move?: string;
  fen?: string;
  player?: string;
  mode?: string;
  matchup?: string;
  quality?: 'BRILLIANT' | 'BEST' | 'GREAT' | 'GOOD' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER' | null;
  evalDelta?: number | null;
  engineTelemetry?: {
    classification?: 'BRILLIANT' | 'BEST' | 'GREAT' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER';
    evalDelta?: number | null;
  } | null;
};

export type ChesterReply = {
  banter: string;
  education: string;
};

export type ChesterIntent = 'chat' | 'move';

const CHESS_MOVE_PATTERN = /^(?:O-O(?:-O)?|0-0(?:-0)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8][a-h][1-8][qrbn]?)$/i;

export function detectUserIntent(input: string): ChesterIntent {
  return CHESS_MOVE_PATTERN.test(input.trim()) ? 'move' : 'chat';
}

export function getFallbackRoast(payload: CommentaryPayload) {
  const classification = payload.engineTelemetry?.classification || payload.quality || 'GOOD';
  const move = payload.move ? `${payload.move} ` : 'That move ';

  switch (classification) {
    case 'BRILLIANT':
    case 'BEST':
      return `${move}is a royal flourish. Chester salutes that sharp, confident choice!`;
    case 'GREAT':
    case 'GOOD':
      return `${move}looks steady and purposeful. A fine way to keep the position under control.`;
    case 'INACCURACY':
      return `${move}was a touch adventurous; that piece may have wandered from the parade route. The position is still very much playable.`;
    case 'MISTAKE':
      return `${move}gave the board a little comic wobble. No panic: regroup the pieces and look for the simplest defense.`;
    case 'BLUNDER':
      return `${move}has the royal guards checking on that piece. Take a breath: every good chess recovery starts with spotting the threat.`;
    default:
      return `${move}keeps the game moving. Let Spotfish's next evaluation guide the plan.`;
  }
}

function sanitizeCommentary(raw: string) {
  return raw
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

function getFallbackReply(payload: CommentaryPayload): ChesterReply {
  return {
    banter: getFallbackRoast(payload),
    education: 'Spotfish analysis is unavailable for this position. Use the engine evaluation and principal variation when they return to compare your move with the strongest continuation.',
  };
}

export async function askChesterAnalysis(payloadString: string): Promise<ChesterReply> {
  try {
    let payload: CommentaryPayload;
    try {
      payload = JSON.parse(payloadString || '{}') as CommentaryPayload;
    } catch {
      payload = { message: payloadString };
      payloadString = JSON.stringify(payload);
    }
    
    const response = await fetch('/api/grandmaster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadString,
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return getFallbackReply(payload);
    }

    const data = await response.json() as Partial<{ reply: string; education: string }>;
    if (typeof data.reply !== 'string' || typeof data.education !== 'string') {
      return getFallbackReply(payload);
    }

    const banter = sanitizeCommentary(data.reply);
    const education = sanitizeCommentary(data.education);
    return banter && education ? { banter, education } : getFallbackReply(payload);
  } catch {
    try {
      const fallbackPayload: CommentaryPayload = JSON.parse(payloadString || '{}');
      return getFallbackReply(fallbackPayload);
    } catch {
      return {
        banter: 'A sharp position calls for patient pieces. Let us inspect the next move together.',
        education: 'Spotfish analysis is unavailable for this position. Try again when engine telemetry is available.',
      };
    }
  }
}

export async function askChesterChat(payloadString: string): Promise<string> {
  let payload: CommentaryPayload;
  try {
    try {
      payload = JSON.parse(payloadString || '{}') as CommentaryPayload;
    } catch {
      payload = { message: payloadString };
      payloadString = JSON.stringify(payload);
    }

    const response = await fetch('/api/chester/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadString,
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return 'The court messenger is delayed. What would you like to explore on the board?';

    const data = await response.json() as Partial<{ reply: string }>;
    const reply = typeof data.reply === 'string' ? sanitizeCommentary(data.reply) : '';
    return reply || 'The court messenger is delayed. What would you like to explore on the board?';
  } catch {
    return 'The court messenger is delayed. What would you like to explore on the board?';
  }
}

export async function askChester(payloadString: string): Promise<ChesterReply | string> {
  let payload: CommentaryPayload;
  try {
    payload = JSON.parse(payloadString || '{}') as CommentaryPayload;
  } catch {
    payload = { message: payloadString };
  }

  if (payload.type === 'move' || detectUserIntent(payload.message || '')) {
    return askChesterAnalysis(payloadString);
  }
  return askChesterChat(payloadString);
}

export async function askGrandmaster(payloadString: string) {
  const response = await askChesterAnalysis(payloadString);
  return response.banter;
}
