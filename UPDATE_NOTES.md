# MapifyMUJ UI and indoor-map update

- Unified the application theme around deep teal, mint, white, and slate surfaces.
- Refreshed the indoor navigation page layout, search controls, floor selectors, map canvas, room directory, and room details styling.
- Added vector floor plans based on the supplied sketches for LHC Ground Floor, LHC First Floor, and AB-3 Ground, First, Second, and Third Floors.
- Preserved existing AB-1, AB-2, AIC, and LHC Second Floor map assets and app features.
- Added an idempotent database sync for new buildings/floors/rooms so an existing seeded database can receive the map additions without resetting student data.

The newly redrawn maps are schematic and not to scale. Some handwritten room names were difficult to read, so generic room labels are used where the sketch did not clearly identify a room. Please verify labels and locations on site before treating these plans as authoritative.

## Apply the update

1. Replace the existing project with this updated project folder (or merge the changed files).
2. Install dependencies with `npm install`.
3. Start with `npm start` (or `npm run dev` for development).
4. The seed sync adds the new indoor maps to an already-seeded database. For a static deployment, the offline snapshot is also updated at `public/data/static.json`.


# Update — LHC Third Floor + web dashboard

- Added the **LHC Third Floor** plan (`public/maps/LHC_3.svg`, 36 selectable rooms) drawn from the supplied sketch with the same generator as the AB-1/AB-2 plans (`tools/floors_data.py` -> `LHC_3`; render with `python3 tools/build_lhc_3.py`). Registered in `server/seed/campus.json` and `public/data/static.json`; existing databases pick it up on next start.
- The small letters under some room numbers (A-F, A-H ...) are copied from the sketch; their meaning is not stated there. "WA" on the sketch is shown as "WS" like the other washrooms; the unlabelled grey cell beside the west HOD cabin is left blank. Check on site.
- Web layout (`public/css/web.css`, loaded on every page): at 900px and wider the app gets a left sidebar, a wide content area and a multi-column dashboard (summary tiles, live "right now" card, today's timeline, week at a glance, attendance by course, room finder - press `/`). Timetable is two-column; phones keep the bottom tab bar.


# Update — Timetable importer + “Find my classroom”

- New `import.html`: upload a timetable screenshot/PDF, check/correct the extracted subjects, days, times and rooms, save to the student profile.
- New per-student tables `user_classes` / `user_timetables` and routes under `/api/me/timetable` (the image is never uploaded).
- Dashboard + Schedule use the student’s own timetable when present: next class with building, floor, room; **Find my classroom** opens the floor plan with the room highlighted; unmatched rooms prompt a correction.
- Campus navigation (`map.html`, search, building → floor → room) is unchanged.
- `core.js`: `matchRoom`, `resolvePersonal` (Mon–Sat, arbitrary times); `resolveNow` refactored onto a shared resolver (behaviour unchanged, tests pass).
- CSP: `'wasm-unsafe-eval'`, `worker-src 'self'`, `blob:` images (for the OCR engine and preview).
- Test fixed: the old hierarchy test still expected 4 buildings / 309 rooms (before AB-3 was added).
