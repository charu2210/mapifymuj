# 🗺️ MapifyMUJ v2

Campus navigation + academic dashboard for Manipal University Jaipur: **Campus → Building → Floor → Room** floor plans, room search, current/next class, timetable, attendance rings, an outdoor campus map, and a real backend.

## Run it

Requires **Node.js ≥ 22.13** (uses the built-in `node:sqlite`; nothing to compile).

```bash
npm install
npm start            # → http://localhost:3000   (creates data/mapifymuj.db and seeds it on first run)
npm test             # 8 API/logic tests
```

Development accounts (created only when `NODE_ENV` ≠ production): `admin@muj.local / admin1234`, `faculty@muj.local / faculty123`, `student@muj.local / student123`.
**Production:** set `NODE_ENV=production`, `JWT_SECRET` (long random), `ADMIN_PASSWORD` (see `.env.example`). The server refuses to start in production without a JWT secret.

Demo any moment: add `?at=2026-10-22T10:45:00+05:30` to the dashboard/timetable URL (campus time is Asia/Kolkata).

## What's inside

| Page | What it does |
|---|---|
| `index.html` | Dashboard: current/upcoming class (falls through to the next working day), Find Room, later today, attendance snapshot, building shortcuts |
| `map.html` | Updated floor plans (AB-1, AB-2, AIC, LHC, AB-3 · LHC now has Ground–Third floors). Search (`127`, `AB2-127`, `ab2 127`, names), tap/keyboard select, zoom/pan, deep links `?room=AB2-127`, `?b=AB2&f=1`, classes timetabled in the room |
| `campus.html` | Outdoor Leaflet/OpenStreetMap map locked to the campus, live GPS dot with on/off-campus check, category pins, search, satellite toggle, my location, walking directions, “Open floor plans” for indoor buildings |
| `import.html` | **Timetable importer.** Upload a screenshot (PNG/JPG/WebP) or PDF → read on the device (OCR / PDF text) → editable check screen (day, time, subject, room, faculty, lab; room match status; overlap and “lab length is a guess” flags) → tick “I’ve checked these details” → save to the student’s profile |
| `timetable.html` | Weekly timetable (2-period labs merged), per-course attendance with SVG ring, “can skip N / attend N more” |
| `login.html` | Sign in / register / section / change password |
| `admin.html` | Faculty: mark attendance. Admin: name rooms, edit timetable, correct campus pins, manage users |

Attendance colours follow the patent exactly: **> 75 % green · 60–75 % (inclusive) orange · < 60 % red**, decided on the exact ratio (shared code: `public/js/core.js`, used by both server and browser). Every course shows what came from the **dataset** (`baseline`) versus what the system **calculated** from classes marked in MapifyMUJ (`recorded`).

## API (all JSON, `/api`)

Public: `GET /campus` · `/rooms?b=&f=` · `/rooms/search?q=&limit=` · `/rooms/:key` · `/places?category=&q=` · `/places/:id` · `/sections` · `/slots` · `/timetable?section=` · `/timetable/now?section=&at=` · `/route?from=lat,lng&to=lat,lng` · `/health`
Auth: `POST /auth/register` · `/auth/login` · `GET/PATCH /auth/me` · `POST /auth/password` (Bearer JWT)
My timetable (signed in): `GET /me/timetable` · `PUT /me/timetable {classes[]}` (replace with the verified rows) · `PATCH /me/timetable/:id {roomText|roomKey}` (correct a room; 422 + suggestions if it can’t be matched) · `DELETE /me/timetable`
Student: `GET /attendance` · `/attendance/:course`
Faculty/Admin: `GET /section/:code/students` · `POST /attendance/mark {course,date,slot,records:[{userId,present}]}`
Admin (`/admin`): `PATCH /rooms/:key` · `POST|PATCH|DELETE /places` · `GET /courses` · `PUT /courses/:code` · `PUT /timetable` · `DELETE /timetable/:id` · `GET|POST /users` · `PATCH /users/:id` · `PUT /attendance-baseline`

Security: bcrypt passwords, JWT, role checks, rate limits (login 30/15 min, API 300/min), Helmet CSP (no inline scripts), parameterised SQL, role can’t be chosen at registration.

## Hosting

* **Full app:** any Node host (`Dockerfile` included; mount a volume at `/app/data`).
* **Static only (GitHub Pages):** upload `public/`. With no backend the pages automatically use `public/data/static.json` (a snapshot of the API; attendance is sample data; no sign-in). Regenerate it with `npm run build:static` after changing seed data.
* Frontend on one host, API on another: set `window.MAPIFY_API_BASE` before the scripts and `CORS_ORIGINS` on the server.

## Timetable import → campus navigation

1. **Import** (`import.html`): the file never leaves the browser. Images are cleaned (table borders removed, dark header bars inverted) and read with a bundled Tesseract.js; text PDFs are read directly with PDF.js (scanned PDFs fall back to OCR). `public/js/tt-import.js` turns the word boxes into classes — grids with days down the side *or* across the top (merged 2-period lab cells included) and day/time lists (phone screenshots, PDFs).
2. **Verify**: every row is editable; nothing is saved until the student ticks the confirmation box. Room text is matched live to a floor-plan room (`MapifyCore.matchRoom`): *exact* (linked), *ambiguous* (`127` exists in AB-1 and AB-2 → pick one) or *none* (suggestions).
3. **Save**: `PUT /api/me/timetable` (profile). Signed out / offline demo → saved in `localStorage` on the device, labelled as such, with a “Save to my profile” button after signing in.
4. **Navigate**: Home shows the current/next class with Building · Floor · Room and **🧭 Find my classroom** → `map.html?room=KEY` (existing floor-plan page, room highlighted). If the room is unmatched the card shows an inline correction box (same for rows in today’s schedule and the Schedule page).

Students without an imported timetable still see the section timetable as before. Re-generate the sample files used by the tests with `python3 tools/make_sample_timetables.py`; refresh the bundled OCR/PDF libraries with `npm run vendor:ocr` (~13 MB in `public/vendor/`, licences in `public/vendor/NOTICE.md`).

**OCR accuracy:** screenshots read well when clear and full-width, but letters can be misread (e.g. “Relational” → “elational”), and the length of merged lab cells is inferred from where the text sits — that is why the verify step is mandatory and flagged rows are highlighted.

## Known limitations — please read

* **Building pins on the campus map are approximate.** AB1/AB2/AIC/LHC positions were placed near the campus centre used in UniWay, *not surveyed*; the other 24 places are UniWay’s seed data. Correct them in Admin → Campus pins and tick “verified”.
* many rooms have no name yet (Admin → Rooms).
* Timetable/attendance seed data is the single DSE IV-B section from the prototype. `DSE2229` (Fri, “Machine Learning”) shares a name with `DSE2220` in the source data — check it’s intended.
* UniWay’s voice turn-by-turn navigation and its Neon/Postgres + Next.js stack were **not** ported (Mapify stays vanilla HTML/CSS/JS + SQLite). Walking routes use OpenRouteService only if `ORS_API_KEY` is set; otherwise a straight-line estimate is shown and labelled as such.
* Indoor routing (turn-by-turn between rooms) is not implemented; the patent does not claim it.
* Leaflet 1.9.4 is bundled in `public/vendor/leaflet/` (no CDN). The campus boundary is `CAMPUS_BOUNDS` at the top of `public/js/pages/campus.js` — approximate, not surveyed.
* `tests/e2e_browser.py` is the Playwright suite used during development (not in `npm test`).

`tools/` holds the original map generator (`floors_data.py`, `build_maps.py`) for regenerating SVGs; copy results into `public/maps/` and re-seed if room lists change.
