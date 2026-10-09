/** v2.2 Orson prompt builders (plain strings, no framework). */
export type DraftStats = { name: string; swipes: number; passes: number; drafted: number; streak: number };

/** One call, two DIFFERENT payloads: P1 gets mocked for their own habit, P2 gets Orson complaining about P1 (and being teased for their own). Counts are tracked independently per player. */
export function buildAsymmetricDraftPrompt(p1: DraftStats, p2: DraftStats): string {
  const f = (p: DraftStats) => `${p.name}: swiped ${p.swipes} films, PASSED ${p.passes}, drafted ${p.drafted}, longest-recent streak ${p.streak}`;
  const worse = p1.passes >= p2.passes ? p1 : p2; const other = worse === p1 ? p2 : p1;
  return `The DRAFT stage just ended. ${f(p1)}. ${f(p2)}. ${worse.name} was the pickier one (${worse.passes} passes vs ${other.passes}). Write TWO different private messages, each shown on that player's own phone. Field "a" is for ${p1.name}: ${p1 === worse ? `mock ${p1.name}'s impossible standards using their pass count` : `tease ${p1.name} for saying yes to almost everything and complain about ${p2.name}'s indecision and ${p2.passes} passes`}. Field "b" is for ${p2.name}: ${p2 === worse ? `mock ${p2.name}'s impossible standards using their pass count` : `tease ${p2.name} for saying yes to almost everything and complain about ${p1.name}'s indecision and ${p1.passes} passes`}. Each is 2 sentences max, uses the real numbers, never mentions the other message exists.`;
}

export type Bout = { a: { name: string; film: string; tokens: number }; b: { name: string; film: string; tokens: number }; winner: string; margin: string; upset: boolean };
/** Post-bout toast: Orson gets the wager math and mocks desperation or apathy. */
export function buildPostMatchMortem(m: Bout): string {
  return `Post-mortem for a bout that just resolved. ${m.a.name} put ${m.a.tokens} tokens on "${m.a.film}". ${m.b.name} put ${m.b.tokens} tokens on "${m.b.film}". Winner: "${m.winner}" (${m.margin})${m.upset ? ', an upset' : ''}. React in ONE short sentence (max 20 words) using the exact token numbers. Mock desperation if someone threw lots of tokens and lost, apathy if someone spent nothing.`;
}
