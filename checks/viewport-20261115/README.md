# BUILD242: visible viewport and quiz popups

User-reported iPhone image showed shared navigation overlapping a fixed fullscreen Chess game. Match CSS predated the shared header and fixed the match at y=0. The app now owns the visual viewport; Chess stays inside app-main below navigation, including saved duels. Main ResizeObserver sets the board and dialog budget. MENU and a dedicated BOARD button stay visible. Board and piece choices remain in their existing picker. Match drawer now uses the same measured area.

Quiz flash phases use a bounded dialog on each connected player's screen, controlled by existing shared game phase. Twenty-option boards retain paged answers. Wildcard hands use separate, two-page pickers with visible return controls, not an inline expansion. Existing deadlines, scoring and card rules are unchanged. Party no longer calls scrollIntoView on a descendant, which could move the shared page.

Local actual tests: 364x597 (approximate visible screenshot area),320x568,390x680,430x740 Chess MENU/picker/theme changes. Saved Chess and Pawn War real e4/e5/third ply,host/guest new-tab recovery,private seats. Arena same actual move/recovery sequence. Two-phone Grammar five real questions and shared flash popup on both. Five-player Party private seat flow,five actual questions,flash popup on all five. Wildcard pages are local private hands; opening one does not reveal private choices to the other player. Five flash types and20-option pagination fixtures at320/390/430. Entry-page visual smoke:Checkers,Logic,HAYWIRE,Trivia,training,daily puzzle,embedded Find.

Visuals inspected from actual rendered screenshots. WebKit automation was attempted but this host lacks required runtime libraries; native iOS Safari is not claimed verified. No paid model calls,production deploy,schema or policy changes. Delete only exact QA room IDs created by a test. Original script log phrases inherited from delayed-invite tests can still say17s although this regression shortened the wait to300ms; no new delayed-duration claim is based on those lines.

HAYWIRE expansion remains separately parked,not part of242.
