# Good Together preview, 11 November 2026

Fresh preview branch off2fb342f. Reconstructed the front-door design from the recorded Good Together study because the earlier source backups were no longer locally available. This is NOT recovery of e8c2572's later app changes.

Scope: Good Together front door at / and /arena; Chester hosting; four game worlds; select, description, Enter; mode choice only after Enter; real links to existing games. No automatic navigation on select. Browser back and in-page Back supported. Existing games keep their existing appearance and rules. Plot Night and Brain Parlour link to separate previews; the movie preview still has Orson as host, stated before entry. No claim of full downstream rebrand or whole-app no-scroll completion.

Validation: Next production build, TypeScript, focused ESLint pass. Four sizes320x568,390x844,820x1180,1280x800; all four worlds and16mode descriptions at each size (64mode viewport checks), Enter/Back selection retention, no scroll or description clipping in those states. Actual shortest-phone pixels inspected for all four front doors and four mode panels, plus390hub. Original vector assets inspected after fixing missing SVG namespace. External movie and logic entry/discovery/road pages read live before linking. No paid AI or game calls during checks. No application payments or spending committed.

Not tested: arbitrary-long browser/user data, cross-network multiplayer, whole-game regression after this front-door change, keyboard/zoom accessibility. Existing app features unchanged from2fb342f. Historical external-provider and relay limitations remain. Only this preview branch is authorized for publication. Production/main/PRs untouched.
