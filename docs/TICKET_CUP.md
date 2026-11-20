# Movie Time: Ticket Cup preview

Source checkpoint: 82745bc, 19 November 2026. Simultaneous-selection revision.

## Entry and retained modes

The Movie Time landing now shows Solo and 2+ players. Solo keeps the existing solo wheel. The new Ticket Cup is an exactly-two-player preview. The earlier six choices remain at /movie-wheel/older and their original routes remain usable.

## Game rules

- Ten questions per night: four Oscar questions, three actor/character questions, one cast clue and two numeric closest-rating questions. The static starter bank contains 22 verified questions. Director and release-year questions are removed from this preview's older quiz bank too.
- Multiple choice earns two tokens for a correct answer plus one for the first correct answer received by the server. Exact server-time ties share the bonus. Network latency can affect this bonus.
- Numeric guesses are entered from 0.0 to 10.0. The closest guess to the dated TMDB snapshot earns three tokens. Equal distance shares three tokens. The target is hidden until reveal.
- No starting-token bonus. Earned quiz tickets become tournament tokens, which have no cash value.
- Each player selects two different genres from dropdowns and locks them. Both choose simultaneously. Cross-player overlap is allowed. The combined genres form the shared catalogue, with no genre coin toss or genre wheel.
- A player wheel chooses the filter setter. Both approve the release range, verified Rotten Tomatoes minimum, explicit unscored-film choice and optional verified actor filters. The pool uses the cached catalogue; actor credits are checked live. At least eight matches are needed.
- Both players start a one-minute nomination countdown at the same instant. Each nominates exactly four films. Another player's picks are reserved atomically, so the first saved claim wins. No automatic entrants. An expired incomplete minute has an explicit, individual retry that does not reset the other player's timer. The large clock turns orange at 30 seconds and red with a pulse at 15 seconds. Reduced-motion preferences disable the pulse.
- The eight selected films are shuffled into four quarter-finals, two semi-finals and a final. Every bout has a shared game card and requires both players to be ready.
- Each spent token moves one side's tug. All spent tokens are charged, regardless of who wins. The bank does not reset between bouts. Both players lock to resolve the bout.
- Once per player per night: Double doubles their pull without doubling the cost; Steal transfers up to two unspent rival tokens; Switch moves their entire pull to the other film. No wildcard works after that player's lock.
- Tied bouts require both players to choose the same film or both approve a fair tie wheel. No forced paid tiebreak or bank reset.
- Both players confirm the tournament champion before it becomes tonight's film. Saved ticket stubs stay device-local.

## Source notes

Official Academy ceremony records support Oscar facts:
- https://www.oscars.org/oscars/ceremonies/2024
- https://www.oscars.org/oscars/ceremonies/2020

TMDB cast records support actor and cast-clue questions. Numeric rating rounds use dated API snapshots, rounded to one decimal, checked 19 November 2026. Scores may subsequently change. The question records retain the data-source endpoint as well as the readable source page.
- https://www.themoviedb.org/movie/603
- https://www.themoviedb.org/movie/13
- https://www.themoviedb.org/movie/155
- https://www.themoviedb.org/movie/550
- https://www.themoviedb.org/movie/680
- https://www.themoviedb.org/movie/278

## Validation and limits

A full hosted two-browser run on checkpoint 0996835 completed all ten questions, the genre draft, filters, four picks each, seven bouts, every wildcard, a mutually approved tie wheel, both final confirmations and guest refresh. It ended with Zootopia 2. Final checkpoint 20d4cd9 adds short-phone layout fixes, wheel-pointer alignment and shuffled cast-clue answer positions.

Final-URL targeted tests checked receipt replay, no overdrafts, locked-side rules, single-use wildcards, doubled tug totals, hidden numeric answers, one answer per seat, shared closest-distance ties, pick expiry and retry, exactly four picks, no duplicate opponent picks, setter-only proposals and live actor-filter lookup. Hosted layouts were inspected at 320x568.

Testing used a single task-owned two-seat fixture, because the existing shared-network room-creation cap had already been reached. Fresh-room creation on this checkpoint was not verified. The cap was not changed or reset. This preview does not claim three-player tournament support or real-iPhone testing. The preceding five-round preview was successfully played to a winner on Forrest's iPhone.


## Simultaneous-selection revision validation

A task-owned two-seat fixture was used, with the room-creation cap unchanged. A hosted two-browser run on 54e5912 completed the ten-question quiz, both genre dropdowns, shared filters, simultaneous eight-film nominations and the first five bouts, including Double, Steal, Switch and a mutually approved tie wheel. The last two bouts and final confirmations were completed through the same hosted API. The browser test driver was interrupted and resumed; this is not an uninterrupted UI-only end-to-end claim. The final 82745bc deployment only restores the compact review-score strip to the new picks layout. Its winner and guest refresh were checked in two browsers, and its hosted 320x568 picks layout was inspected with review scores and the red clock visible.

An actual elapsed countdown verified orange at 30 seconds, red and CSS pulse at 15, time expiry and explicit retry. API tests verified equal starting deadlines, race-safe duplicate reservations, genre validation, overlap between players, replay-safe receipts, four-pick requirements and a personal retry that leaves the other clock unchanged. TypeScript passed. No real-iPhone run or fresh-room creation pass is claimed for this revision.

The reported original genre incident cannot be tied to a specific exception from retained state alone. The removed design required many alternating turns and permitted unlimited passes, and sparse genres could fail the eight-film minimum. The revision removes those genre handoffs and uses the union of chosen genres. A stale-round action now refetches the current room immediately instead of leaving the browser waiting for the next poll. The eight-film minimum remains enforced; actors or very narrow filters can still require an explicit widening.
