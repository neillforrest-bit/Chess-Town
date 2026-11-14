# BUILD 216: preview redesign

Scope: new five-game landing, paginated town mode choices, shared header and return navigation, purple Chess/Checkers/Logic chrome, local guide stub, reduce-motion preference, guest invite parser. Existing game engines, accounts and saved match rules remain unchanged. No modes removed. One unified preview deployment only.

## Verified before push
- Optimized Next/TypeScript build passed.
- Actual 390x844 and 320x568 screenshots inspected for landing, selectors, pagination, settings, guide and Movie wrapper.
- All 29 mode choices remain reachable; every radio changes the target and action label correctly.
- All selector controls remain within both phone viewports, every More page included.
- 26 non-host launch destinations load; shared header points to the appropriate town, including the Trivia road. Three host-creation launches were not opened as part of this navigation sweep.
- Movie journey: main landing -> Movies -> Find Our Film -> inner username/host entry; outer Movie Town return -> All games passes at both sizes.
- Local guide has no message input/model request. Settings persist after reload.
- Guest invite parser: 14 tests, including stripping host/p1 roles, exact-origin validation and preservation of the film invite fragment.

## Important limits
- Not a whole-app all-pass or App Store sign-off. Prior audit findings remain open.
- Logic and Trivia inherited setup screens still scroll. This deploy does not implement the PDF's entire staged no-scroll setup/game/result journey.
- Movie's inner CineSync app and its existing PRIVATE COUPLES PREVIEW footer remain unchanged on its separate deployment.
- Fresh Movie username creation was rate-limited for this QA network. Stopped attempts; no new identity/room created. Fresh host creation was not passed this round. Do not infer the owner's own browser/network is limited.
- No full multiplayer/gameplay regression repeated for this visual shell change. Native iPhone Safari not certified.
- No paid model call, purchase, Apple spend, production deploy or PR merge. Account-wide billed currency delta cannot be established from the usage view.
