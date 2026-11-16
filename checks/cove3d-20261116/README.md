# Captain's Cove 3D checks

Three-hole Preview journey, not a finished nine-hole game.

- `node checks/cove3d-20261116/cove-engine.cjs`: finite/bounded physics, terrain samples, legal tunnel solution.
- Run the app on port 3037, then `python checks/cove3d-20261116/cove-play.py` and `cove-edges.py`.
- `cove-phase2.py`: pro four-player team finish, solo amateur, settings, slope toggle.
- `cove-render.py`: 320, 390 and 1200 pixel screenshots.
- Set `COVE_URL` to test a deployed host.

Browser checks use Playwright and software WebGL in headless Chromium. Their frame rate does not predict a physical iPhone's frame rate. Native Safari, heat and battery still need a real-device check.

Modes in this slice share one device, with turns after every stroke. Team play sums players 1 + 3 versus 2 + 4. There are no new 3D online rooms or cloud saves. The original nine-hole route remains separate.

Challenge changes cup radius/capture speed. Pro starts without flag snap. Green-reading arrows show the actual downhill surface gradient, not a predicted ball route. Scenery, art and audio are procedural and original. Three.js licence is included with the source.

## Three-hole journey checkpoint

The Preview now has three terrain variants: Smuggler's Ridge, Lantern Lagoon and Treasure at Sundown. Choose a full journey or practice one hole. Hole scorecards feed cumulative player and team totals. Browser-local postcards record visited holes and solo full-journey bests per challenge. No identity or network storage is involved.

- `node checks/cove3d-20261116/cove-course-solve.cjs`: all course physics finite/bounded and find legal integer-slider Pro routes.
- `node checks/cove3d-20261116/cove-passport.cjs`: validate saves, accumulated stamps, personal best rules, malformed and blocked storage.
- `python checks/cove3d-20261116/cove-journey.py`: four-player Pro journey, transitions, cumulative team score, reload persistence and practice selection.
- `python checks/cove3d-20261116/cove-storage.py`: blocked localStorage still permits a completed solo practice game and shows an honest save warning.

Blocked-storage QA also found the shared layout read its optional reduced-motion preference without a guard. That read now fails safely, allowing the Cove to load when browser storage is disabled.

## Player / drone feedback checkpoint

Gameplay now has one player/drone switch, auto-read moving slope grid in drone view, drag and zoom scouting, and an animated original cartoon golfer. Sound, quality and aim-snap settings live in the field guide. The pre-putt character faces the player before Lock In & Putt. The aim line is a normal feature, not an earned clue; it simulates selected power/slope only until first wall, rock, tunnel or pond contact. It never reveals a bounce or the tunnel exit.

Moving balls use real occlusion, interpolated positions, a short hidden tunnel interval and a high follow camera. Cliff decorations can disappear when they block the camera, while physical hazards never disappear. The earlier large downward camera crop is removed. The guide provides drone recentering and a practice rescue to the tee. Rescue preserves strokes but excludes that round from solo personal bests.

- `node checks/cove3d-20261116/cove-contact.cjs`: 750 all-course shot samples, first-contact cutoffs, finite traces and +72-degree paths.
- `python checks/cove3d-20261116/cove-feedback.py`: character/swing/tunnel stage sequence, drone pan/zoom, 320/390 layouts, rescue and guide pages.
- `python checks/cove3d-20261116/cove-camera.py`: a non-scoring tunnel route, seven end-lie camera angles including +72 degrees, ball stays in frame, rescue keeps strokes.

A real iPhone screenshot exposed the old camera problem; the exact seven-shot session could not be reconstructed from the screenshot. These tests exercise that class of failure, not a claim of reproducing the exact session or certifying native Safari performance. The art is original procedural cartoon art, not a licensed character or paid asset.

## Solo medals checkpoint

The welcome passport opens a two-leaf browser-local memory book. Six solo goals give titles from Day tripper to Harbour legend: par or better on each hole, a fully sunk three-hole journey, a par-13 journey and a Pro par-13 journey. Earned titles never change physics, cups or aim tools. Practice can earn a hole medal, but not a journey medal. Capped holes do not earn medals. A rescue disables further records in that round; records already earned on earlier holes stay. Existing v1 scores/stamps remain, but do not retroactively claim new sunk-putt medals.

Postcards now write immediately at each hole's completed scorecard, before leaving for the next hole. Only final journey/practice completion increments the existing adventure count. Partial journeys keep earned postcards but are not resumable games.

- `python checks/cove3d-20261116/cove-progression.py`: real Pro solo journey, all six goals, hole-by-hole persistence, completion count once, title reload, 320px passport leaves/finish and rescue exclusions.
