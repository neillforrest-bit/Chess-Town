# Captain's Cove preview checks

Nine pirate crazy-golf holes, alternating tee direction, real slope forces, diagonal timber banks, ponds, paired hidden skull-rock tunnels, and pirates that pop up on odd-numbered putts. No windmills.

- Actual browser: all nine RPG holes completed with real aiming/power/putt controls; coins, XP ranks, equipment, next-hole and final scorecard. Every hole has a recorded legal 1-2-shot route. These are QA solutions, not a promise that first-time players will find them.
- Actual online: four independent browsers join, duplicate names accepted, fifth refused, host/guest shots relay and turn ownership holds, host/guest reload and reconnect. Full separate two-browser three-hole round ends in equal synced scores and a tie.
- Actual same-phone: four-player setup, alternating turns, holed shot, local resume, small-phone scorecard. Engine also plays full two-player three-hole eight-stroke-cap rounds.
- Physics: 1,800 deterministic boundary shots, finite values, wall/rail collisions, non-finite/out-of-range/wrong-turn/repeated requests refused, legal paths for all nine holes. Water adds one penalty and total caps at eight.
- UI: 320x568,390x664,430x932,1200x850 phone/desktop checks; shared navigation kept visible, no page scroll. Scorecard paged in three-hole sections, treasure-map tab separate. Invalid saves ignored; blocked storage warns while allowing play.
- Fixed a real first-frame negative-time crash on some background online tabs; clamped frame progress and added a defensive ball-position fallback.

Limits: casual trusted-friend rooms, not authenticated accounts or anti-cheat. Host must keep the original tab open. Saves are browser-local, not cloud backup; same browser restores the room. No public matchmaking, chat, video, simultaneous shots or native iPhone Safari certification. Gameplay makes no AI/model calls. Preview only, no production/alias promotion.

Final polish checks: touch hit-testing uses the actual fitted SVG dimensions at 430px; touching never auto-fires. All nine scorecard rows reached through paging, separate treasure-map tab, modal focus trap and Escape. Pirate up/down state remains fixed to the shot that is animating, rather than switching early to the next player's obstacles.
