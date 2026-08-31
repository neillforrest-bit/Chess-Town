type CommentaryPayload = {
  message: string;
  context?: string;
  ply?: number;
  move?: string;
  player?: string;
  mode?: string;
  matchup?: string;
};

const SCRIPTED_ROASTS = [
  "Neill e4—textbook flex energy from a guy who loses to his own opening prep every Thursday night. This board is about to get messy.",
  "Brendan copies with e5 like he's got a cheat code and a vengeance streak brewing. This is not symmetry, this is a man setting a trap.",
  "Nf3! Neill develops like he's fixing a mistake he already made in his head. Respect for the tempo, but we both know Brendan saw this coming.",
  "Brendan locks down c6 and the pressure in this arena just went NUCLEAR. Neill's opening is officially under review by the waiver committee.",
  "ITALIAN GAME! Neill brings the bishop like a guy who checked YouTube tutorials at 2 AM. Brendan's sitting there grinning like he wrote the script.",
  "🚨 BLACKBURNE GAMBIT! Brendan offers the poisoned pawn like a villain handing out free lottery tickets. Neill's about to learn what 'waiver-wire disaster' means in 4D.",
  "HE TOOK IT! Neill bit the trap HARD and now he's staring at a board that feels like season-ending panic. No coming back from this one.",
  "Qg5! Brendan unleashes the double attack like a man who studied this position for WEEKS. Neill looks like he just realized he's completely out-matched.",
  "Nxf7! Neill forks Queen and Rook but Brendan's not sweating—he already won the narrative three moves ago. This is the moment Neill became the cautionary tale.",
  "BOOM! Brendan cracks g2 and Neill's entire position just went from 'playoff contender' to 'highlight reel disaster.' The board is PURE CHAOS.",
  "Rf1 panic defense! Neill scrambles like a manager watching his dynasty crumble in real time. This is not chess anymore, this is emergency triage.",
  "CHECK! Brendan owns the grid like he literally wrote the league bylaws. Neill is one move away from becoming a meme in the Discord for ALL ETERNITY.",
  "Be2 block! Neill's last gasp, and it's the move that makes the commissioner wonder if he has strategy or just vibes. Spoiler: it's vibes.",
  "👑 SMOTHERED CHECKMATE! Brendan finishes like a CHAMPION in a league where Neill just donated his playoff seed to the bad-decisions museum. LEGEND STATUS."
];

export function getFallbackRoast(payload: CommentaryPayload) {
  const safePly = Math.max(0, Number(payload.ply ?? 0));
  return SCRIPTED_ROASTS[safePly % SCRIPTED_ROASTS.length];
}

function sanitizeCommentary(raw: string) {
  return raw
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

export async function askGrandmaster(payloadString: string) {
  try {
    const payload: CommentaryPayload = JSON.parse(payloadString || '{}');
    const response = await fetch('/api/grandmaster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadString,
    });

    if (!response.ok) {
      return getFallbackRoast(payload);
    }

    const data = await response.json();
    return sanitizeCommentary(String(data.reply || getFallbackRoast(payload)));
  } catch {
    try {
      const fallbackPayload: CommentaryPayload = JSON.parse(payloadString || '{}');
      return getFallbackRoast(fallbackPayload);
    } catch {
      return 'Chester is live and the board is chaos. The waiver wire just got scarier than the opening line.';
    }
  }
}
