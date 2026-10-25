process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 'test-secret'; process.env.SEED_DEMO = '1';
const { test, before, after } = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { open } = require('../server/db'), { seedAll } = require('../server/seed/run'), { createApp } = require('../server/index');
const C = require('../public/js/core'), I = require('../public/js/tt-import'), O = require('../public/js/tt-ocr');
const campus = require('../server/seed/campus.json'), BUILD = [...new Set(campus.rooms.map(r => r.b))];
const fx = n => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', n), 'utf8'));
const key = c => [c.day, C.hhmm(c.start), C.hhmm(c.end), c.course, c.roomText].join(' ');

/* What the sample images contain (tools/make_sample_timetables.py). Names/rooms are checked loosely: OCR may misread a letter. */
const EXPECTED = ['MON 09:00 09:50 DSE2201 AB2-127', 'MON 10:40 12:20 DSE2231 AB2-213', 'TUE 09:50 10:40 MAS2001 AB2-127', 'TUE 11:30 12:20 DSE2202 LHC-216',
  'WED 09:00 10:40 DSE2230 AB2-213', 'WED 12:20 13:10 DSE2240 127', 'THU 10:40 11:30 DSE2220 AB3-012', 'FRI 09:50 10:40 DSE2270 XYZ 404', 'FRI 11:30 12:20 MAS2001 AB2-127'];

test('importer: grid screenshot, days down the side (real OCR output)', () => {
  const r = I.parse(fx('ocr_words_grid_days_rows.json'), { buildings: BUILD });
  assert.equal(r.method, 'grid'); assert.deepEqual(r.classes.map(key), EXPECTED);
  assert.ok(r.classes.find(c => c.course === 'DSE2231').isLab);
});
test('importer: grid screenshot, days across the top (real OCR output)', () => {
  const r = I.parse(fx('ocr_words_grid_days_cols.json'), { buildings: BUILD });
  assert.equal(r.method, 'grid'); assert.deepEqual(r.classes.map(key), EXPECTED.map(e => e));
});
test('importer: phone-style list screenshot (real OCR output)', () => {
  const r = I.parse(fx('ocr_words_list_phone.json'), { buildings: BUILD });
  assert.equal(r.method, 'list'); assert.deepEqual(r.classes.map(key), EXPECTED);
  assert.equal(r.classes[0].faculty, 'Dr. Neeraj Verma'); assert.equal(r.classes[0].course_name, 'Relational DB Mgmt Systems');
});
test('importer: plain text, am/pm, 12-hour times, noise rejected', () => {
  const r = I.parseText('Monday\n9:00 AM - 9:50 AM  CSE2101 Data Structures  AB 1 / 214  Dr. A B\n1:10 - 2:00 MAS2002 Maths Room 301\n|||\nTuesday\n14:00-15:40 CSE2103 Operating Systems Lab LHC-301', { buildings: BUILD });
  assert.deepEqual(r.classes.map(key), ['MON 09:00 09:50 CSE2101 AB1-214', 'MON 13:10 14:00 MAS2002 301', 'TUE 14:00 15:40 CSE2103 LHC-301']);
  assert.ok(r.classes[2].isLab);
  assert.equal(I.parse([], {}).method, 'none'); assert.equal(I.parse([{ t: 'hello', x0: 0, y0: 0, x1: 40, y1: 12 }], {}).method, 'none');
});
test('importer: times — 1:10 is afternoon, ranges that make no sense are ignored', () => {
  assert.equal(I.toMin(1, 10), 13 * 60 + 10); assert.equal(I.toMin(9, 0), 540); assert.equal(I.toMin(12, 20), 740); assert.equal(I.toMin(12, 5, 'am'), 5); assert.equal(I.toMin(9, 75), null);
});

test('room matching: exact / ambiguous / none, OCR O-0 and I-1 repair', () => {
  const R = campus.rooms;
  for (const t of ['AB2-127', 'ab2 127', 'AB-2/127', 'A B 2 127', 'Room AB2-I27', 'ab2127']) assert.equal(C.matchRoom(R, t).room.k, 'AB2-127', t);
  assert.equal(C.matchRoom(R, 'LHC 216').room.k, 'LHC-216');
  const amb = C.matchRoom(R, '127'); assert.equal(amb.status, 'ambiguous'); assert.deepEqual(amb.candidates.map(r => r.k).sort(), ['AB1-127', 'AB2-127']);
  for (const t of ['XYZ 404', 'AB2-999', '']) assert.equal(C.matchRoom(R, t).status, 'none', t);
});

test('personal timetable: current / upcoming / next day, Saturday, weekend wrap', () => {
  const cls = [{ day: 'MON', start: 540, end: 590, course: 'A', roomKey: 'AB2-127' }, { day: 'MON', start: 640, end: 740, course: 'B' }, { day: 'SAT', start: 600, end: 650, course: 'S' }];
  const at = (day, minutes) => C.resolvePersonal(cls, { day, minutes, date: '2026-10-26' });
  let r = at('MON', 550); assert.equal(r.state, 'current'); assert.equal(r.current.course, 'A'); assert.equal(r.next.course, 'B'); assert.equal(r.current.time, '9:00–9:50');
  r = at('MON', 600); assert.equal(r.state, 'upcoming'); assert.equal(r.next.course, 'B');
  r = at('MON', 800); assert.equal(r.nextDay, 'SAT'); assert.equal(r.next.course, 'S');
  r = at('SAT', 700); assert.equal(r.nextDay, 'MON'); r = at('SUN', 100); assert.equal(r.nextDay, 'MON'); assert.equal(C.resolvePersonal([], { day: 'MON', minutes: 0, date: 'x' }).state, 'none');
});

test('OCR pre-processing: thin table borders are erased, filled header bars are inverted, text is kept', () => {
  const w = 400, h = 300, g = new Uint8ClampedArray(w * h).fill(255);
  for (let x = 0; x < w; x++) g[150 * w + x] = 60;                                   // 1px horizontal border
  for (let y = 0; y < h; y++) g[y * w + 200] = 60;                                   // 1px vertical border
  for (let y = 0; y < 40; y++) for (let x = 0; x < w; x++) g[y * w + x] = 80;        // dark header bar…
  for (let y = 15; y < 25; y++) for (let x = 100; x < 160; x++) g[y * w + x] = 250;  // …with light text
  for (let y = 100; y < 112; y++) for (let x = 50; x < 70; x++) g[y * w + x] = 20;   // ordinary dark text
  const out = O.prepare(g, w, h);
  assert.equal(out[150 * w + 300], 255); assert.equal(out[100 * w + 200], 255);        // borders gone
  assert.ok(out[20 * w + 120] < 60 && out[5 * w + 10] > 200);                         // header: text dark, fill light
  assert.equal(out[105 * w + 60], 20);                                                // body text untouched
});

/* ───────── API ───────── */
let server, base;
before(() => { const db = open(':memory:'); seedAll(db); server = createApp(db, { limiter: false }).listen(0); base = `http://127.0.0.1:${server.address().port}/api`; });
after(() => server.close());
const call = async (p, { method = 'GET', body, token } = {}) => { const r = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) }); return { status: r.status, json: await r.json() }; };
const reg = async n => (await call('/auth/register', { method: 'POST', body: { email: n + '@muj.local', name: n, password: 'password123' } })).json.token;

test('API: save confirmed timetable, rooms matched server-side, per-student isolation', async () => {
  const a = await reg('alice'), b = await reg('bob');
  assert.equal((await call('/me/timetable')).status, 401);
  assert.equal((await call('/me/timetable', { token: a })).json.classes.length, 0);
  const put = await call('/me/timetable', { method: 'PUT', token: a, body: { classes: [
    { day: 'MON', start: 540, end: 590, course: 'dse2201', course_name: 'RDBMS', roomText: 'ab 2 127' },
    { day: 'FRI', start: 600, end: 650, course_name: 'PBL', roomText: 'XYZ 404' },
    { day: 'TUE', start: 600, end: 650, course_name: 'X', roomText: '127' }] } });
  assert.equal(put.status, 200); assert.equal(put.json.classes.length, 3); assert.equal(put.json.unmatched, 2);
  const first = put.json.classes[0]; assert.deepEqual([first.course, first.roomKey, first.roomText, first.buildingName, first.floorName, first.room], ['DSE2201', 'AB2-127', 'AB2-127', 'AB-2', 'First Floor', '127']);
  assert.equal((await call('/me/timetable', { token: b })).json.classes.length, 0);          // not shared
  assert.equal((await call('/me/timetable/' + first.id, { method: 'PATCH', token: b, body: { roomText: 'AB2-213' } })).status, 404);   // not editable by others
});
test('API: correcting a room — ambiguous and unknown text are refused with suggestions', async () => {
  const t = await reg('carol');
  const { json } = await call('/me/timetable', { method: 'PUT', token: t, body: { classes: [{ day: 'TUE', start: 600, end: 650, course_name: 'X', roomText: '127' }] } });
  const id = json.classes[0].id;
  let r = await call('/me/timetable/' + id, { method: 'PATCH', token: t, body: { roomText: '127' } });
  assert.equal(r.status, 422); assert.equal(r.json.details.status, 'ambiguous'); assert.deepEqual(r.json.details.candidates.map(c => c.k).sort(), ['AB1-127', 'AB2-127']);
  r = await call('/me/timetable/' + id, { method: 'PATCH', token: t, body: { roomText: 'AB2-999' } }); assert.equal(r.status, 422); assert.equal(r.json.details.status, 'none');
  r = await call('/me/timetable/' + id, { method: 'PATCH', token: t, body: { roomKey: 'AB1-127' } }); assert.equal(r.status, 200); assert.equal(r.json.unmatched, 0); assert.equal(r.json.classes[0].buildingName, 'AB-1');
  assert.equal((await call('/me/timetable/' + id, { method: 'PATCH', token: t, body: { roomKey: 'NOPE' } })).status, 400);
  assert.equal((await call('/me/timetable', { method: 'DELETE', token: t })).json.classes.length, 0);
});
test('API: validation', async () => {
  const t = await reg('dave'), put = classes => call('/me/timetable', { method: 'PUT', token: t, body: { classes } });
  for (const bad of [{ day: 'SUN', start: 1, end: 2, course_name: 'x' }, { day: 'MON', start: 600, end: 500, course_name: 'x' }, { day: 'MON', start: 0, end: 600, course_name: 'x' },
    { day: 'MON', start: 540, end: 590 }, { day: 'MON', start: 540, end: 590, course_name: 'x', roomKey: 'NOPE' }, null])
    assert.equal((await put([bad])).status, 400, JSON.stringify(bad));
  assert.equal((await call('/me/timetable', { method: 'PUT', token: t, body: { classes: 'x' } })).status, 400);
  assert.equal((await put(Array(121).fill({ day: 'MON', start: 540, end: 590, course_name: 'x' }))).status, 400);
  const ok = await put([{ day: 'SAT', start: 540, end: 590, course_name: '<b>x</b>' }]); assert.equal(ok.status, 200); assert.equal(ok.json.classes[0].course_name, '<b>x</b>');   // stored as text; the UI escapes it
});
