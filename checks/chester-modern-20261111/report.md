# A new Chester and a more game-like Good Together
11 November2026. One visual round, existing games and modes only.

My read: a midnight-plum game launcher with a bright tactile Enter button, individual town accents and a new soft-dimensional Chester. The flow stays town dropdown -> readable Chester commentary -> Enter -> existing modes. The town names remain working reads: Chess Town, Quiz Town, Movie Town, Puzzle Town. No new mechanics, rewards, fake players, ratings or progress.

## What the reference review changed
1. Bunch's current public front door: bold playful type, a strong color field and dimensional character imagery. This pushed me away from the earlier quiet cream page toward a character-led world. Not its character shapes, exact layout or yellow palette.
2. Plato's public mobile front door: a single colored game feature with a clear action. Each town now has a distinct accent/icon and the next action is visually strong. Kept the requested dropdown, not Plato's carousel.
3. AirConsole's mobile entry: a clear play action and an uncomplicated shared-game promise. One next step at a time, not an expanded catalogue.
4. Jackbox's design interview: the host talks to players, gives one task and responds to their choices. Chester's commentary remains immediate, persistent and readable rather than a typing effect or an automatically advancing tutorial. Common Sense Media's review also cautions that fast instructions can be hard to follow.

These are directly inspected public entry surfaces and published context, not an audit of the apps' signed-in home screens or a claim they are the best products. The store listing for Bunch uses MiniParty while its current site uses Bunch; that inconsistency is not resolved here. Full observed sources in sources.md.

## Chester
Original vector art, drawn for this round. A plum companion with apricot face, a small curled crest, body badge and host headset. No chess horse or old jester hat. He floats, blinks, waves and has a soft changing shadow, with a tiny accent sparkle. A visible44pxpause/resume button stops the animations. System reduced-motion disables them. All meaning is present without motion or audio. No paid image, animation or model call.

Typeface is locally served Manrope from Google Fonts, OFL license included. No remote font request at runtime. Other reference art is not bundled into the app.

## Checks and limits
- Next production build, TypeScript and focused ESLint.
- Four worlds and16existing modes at320x568,390x844,820x1180,1280x800:64mode viewport checks plus selection, Enter and Back. No page/horizontal scroll, offscreen primary content or description overflow in the tested states.
- Actual pixels inspected for all four320town/mode panels,390Quiz Town,820Movie Town and1280desktop. Animation-frame contact sheet inspected. Screenshot waits for mascot arrival before capturing.
- Five infinite animations verified running, pause/resume tested,40distinct rendered frames captured, reduced-motion disables all five.
- No new games or routes. No whole-game or cross-network acceptance claim. Downstream game screens still have their earlier appearance. Movie Town still opens the separate Orson-hosted preview, clearly stated before entry. This does not fulfill Chester hosting inside that separate movie app.
- One preview push planned for this round, same branch. No production/main/mainline merge or deploy. Existing integration also builds a duplicate preview project. No payments, API spend, credit purchases or upgrades initiated. No paid gameplay tests.
