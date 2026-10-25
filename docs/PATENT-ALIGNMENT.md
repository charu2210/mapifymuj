# Patent draft ↔ implementation notes

Things in the draft that the code now changes, or that should be corrected before submission.

1. **§5.5 / §5.7 “no database server or persistent backend”.** The project now has a Node/Express backend with SQLite, JWT accounts and roles. Either update those sections or describe the backend as an optional deployment; the front-end still runs standalone from `public/data/static.json` (static mode), so the “no installation, static data” description remains true for that mode. “Authenticated student accounts” and “server-side application” are no longer only future extensions.
2. **Attendance thresholds.** The prototype coloured exactly 75 % green (`>= 75`). The draft says *above* 75 % is green and 60–75 inclusive is orange. The code now follows the draft (`public/js/core.js`, tested at 75, 75.0001, 60, 59.99).
3. **Dataset vs calculated values (§5.6 asks for this distinction).** API returns `baseline` (source: dataset) and `recorded` (source: calculated) separately; the shown percentage is baseline + recorded.
4. **§6 Experiments.** Timetable and attendance are now implemented, so “not yet evaluated” is out of date — `npm test` covers them. The performance figures (55 ms load, 309/309 rooms, etc.) were measured on the earlier single-file build; they are **not re-measured** for this version and shouldn’t be quoted for it without re-running them.
5. **Search issues from §6.2 fixed:** `AB2-127` (hyphen) now works; generic queries like “lab” show 30 results plus “Showing 30 of 68”; smallest tap target raised from 29 px to 44 px (verified on the map page; no horizontal scrolling at 6 viewport sizes on all pages).
6. **Hierarchy wording.** Salient features say a *three-level* structure; the description says *four* levels (Campus → Building → Floor → Room). Pick one.
7. **Data changes.** The old prototype listed AB3 and put room 127 on AB-2’s 3rd floor; the updated maps have AB-1, AB-2, AIC, LHC and AB2-127 on the First Floor. Timetable rooms now link to the real room records (all 23 entries resolve).
8. **Reference 3** has a placeholder year `(/.)` — fill in the real year.
9. **Campus-map claims.** If you describe the outdoor map in the patent, note the pins are unsurveyed until verified in the admin console.
