# Captain's Cove 3D checks

Three-hole Preview journey, not a finished nine-hole game.

- `node checks/cove3d-20261116/cove-engine.cjs`: finite/bounded physics, terrain samples, legal tunnel solution.
- Run the app on port 3037, then `python checks/cove3d-20261116/cove-play.py` and `cove-edges.py`.
- `cove-phase2.py`: pro four-player team finish, solo amateur, settings, slope toggle.
- `cove-render.py`: 320, 390 and 1200 pixel screenshots.
- Set `COVE_URL` to test a deployed host.

Browser checks use Playwright and software WebGL in headless Chromium. Their frame rate does not predict a physical iPhone's frame rate. Native Safari, heat and battery still need a real-device check.

Modes in this slice share one device, with turns after every stroke. Team play sums players 1 + 3 versus 2 + 4. There are no new 3D online rooms or cloud saves. The original nine-hole route remains separate.

Challenge changes cup radius/capture speed and aim guide. Pro starts without flag snap. Green-reading arrows show the actual downhill surface gradient, not a predicted ball route. Scenery, art and audio are procedural and original. Three.js licence is included with the source.

## Three-hole journey checkpoint

The Preview now has three terrain variants: Smuggler's Ridge, Lantern Lagoon and Treasure at Sundown. Choose a full journey or practice one hole. Hole scorecards feed cumulative player and team totals. Browser-local postcards record visited holes and solo full-journey bests per challenge. No identity or network storage is involved.

- `node checks/cove3d-20261116/cove-course-solve.cjs`: all course physics finite/bounded and find legal integer-slider Pro routes.
- `node checks/cove3d-20261116/cove-passport.cjs`: validate saves, accumulated stamps, personal best rules, malformed and blocked storage.
- `python checks/cove3d-20261116/cove-journey.py`: four-player Pro journey, transitions, cumulative team score, reload persistence and practice selection.
- `python checks/cove3d-20261116/cove-storage.py`: blocked localStorage still permits a completed solo practice game and shows an honest save warning.

Blocked-storage QA also found the shared layout read its optional reduced-motion preference without a guard. That read now fails safely, allowing the Cove to load when browser storage is disabled.
