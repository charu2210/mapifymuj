process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 'test-secret'; process.env.SEED_DEMO = '1';
const { test, before, after } = require('node:test'), assert = require('node:assert/strict');
const { open } = require('../server/db'), { seedAll } = require('../server/seed/run'), { createApp } = require('../server/index');
const core = require('../public/js/core');
let server, base, db;
before(async () => { db = open(':memory:'); seedAll(db); server = createApp(db, { limiter: false }).listen(0); base = `http://127.0.0.1:${server.address().port}/api`; });
after(() => server.close());
const call = async (p, { method = 'GET', body, token } = {}) => {
  const r = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
};
const login = async (email, password) => (await call('/auth/login', { method: 'POST', body: { email, password } })).json.token;

test('hierarchy: campus → building → floor → room', async () => {
  const { json } = await call('/campus');
  assert.deepEqual(json.buildings.map(b => b.id), ['AB1', 'AB2', 'AIC', 'LHC', 'AB3']);
  assert.equal(json.buildings.reduce((n, b) => n + b.floors.length, 0), 17);
  assert.equal(json.rooms.length, 445);
  assert.equal((await call('/rooms?b=AB2&f=1')).json.rooms.length, 33);
});

test('room search: every room findable by number; hyphen/space/prefix variants; not-found', async () => {
  const all = (await call('/campus')).json.rooms;
  for (const r of all) assert.ok(core.searchRooms(all, r.id, 400).results.some(x => x.k === r.k), r.k);
  for (const q of ['AB2-127', 'AB2127', 'AB2 127', 'ab2-127', 'ab2127'])
    assert.equal((await call('/rooms/search?q=' + encodeURIComponent(q))).json.results[0].k, 'AB2-127', q);
  const lab = (await call('/rooms/search?q=lab&limit=100')).json;
  assert.ok(lab.total > 30 && lab.shown === Math.min(lab.total, 100));
  assert.equal((await call('/rooms/search?q=zzzz9')).json.total, 0);
  assert.equal((await call('/rooms/search?q=')).json.total, 0);
  assert.equal((await call('/rooms/AB2-127')).json.floor, 'First Floor');
  assert.equal((await call('/rooms/NOPE')).status, 404);
});

test('timetable: current / upcoming / none logic (IST)', async () => {
  const at = t => call('/timetable/now?section=DSE-IV-B&at=' + encodeURIComponent(t));
  let { json } = await at('2026-10-22T10:45:00+05:30');            // Thursday, period 3
  assert.equal(json.state, 'current'); assert.equal(json.current.course, 'DSE2201'); assert.equal(json.current.roomKey, 'AB2-127');
  assert.equal(json.later.length, 1); assert.equal(json.later[0].time, '11:30–1:10');   // 2 back-to-back periods merged
  ({ json } = await at('2026-10-22T08:00:00+05:30'));                // before first class
  assert.equal(json.state, 'upcoming'); assert.equal(json.next.course, 'DSE2240');
  ({ json } = await at('2026-10-22T14:00:00+05:30'));                // after last class → next working day
  assert.equal(json.state, 'upcoming'); assert.equal(json.nextDay, 'FRI');
  ({ json } = await at('2026-10-24T10:00:00+05:30'));                // Saturday → Monday
  assert.equal(json.nextDay, 'MON'); assert.equal(json.next.start_hhmm, '09:50');
  assert.equal((await call('/timetable/now?at=garbage')).status, 400);
  const wk = (await call('/timetable')).json;
  assert.equal(wk.week.MON.length, 3); assert.equal(wk.week.MON.at(-1).time, '11:30–1:10');   // 2-period lab → one block
});

test('attendance thresholds follow the patent exactly (>75 green, 60–75 orange, <60 red)', () => {
  assert.equal(core.statusFor(75.0001), 'green'); assert.equal(core.statusFor(75), 'orange');
  assert.equal(core.statusFor(60), 'orange'); assert.equal(core.statusFor(59.99), 'red');
  assert.equal(core.statusFor(100), 'green'); assert.equal(core.statusFor(0), 'red'); assert.equal(core.statusFor(null), 'none');
  assert.equal(core.summarize(15, 20).status, 'orange');            // exactly 75%
  assert.equal(core.summarize(18, 22).status, 'green');
  assert.equal(core.summarize(12, 18).status, 'orange');            // 66.7%
  assert.equal(core.summarize(3, 10).needToAttend, 19);             // (3+19)/(10+19)=75.9% > 75%
  assert.equal(core.summarize(18, 22).canSkip, 1);                  // 18/23=78% ok, 18/24=75% is NOT above 75
});

test('auth: register/login/me, validation, wrong password, token required', async () => {
  assert.equal((await call('/auth/register', { method: 'POST', body: { email: 'bad', name: 'X', password: 'longenough1' } })).status, 400);
  assert.equal((await call('/auth/register', { method: 'POST', body: { email: 'new@muj.local', name: 'New Student', password: 'short' } })).status, 400);
  const reg = await call('/auth/register', { method: 'POST', body: { email: 'new@muj.local', name: 'New Student', password: 'password123', section: 'DSE-IV-B', role: 'admin' } });
  assert.equal(reg.status, 201); assert.equal(reg.json.user.role, 'student', 'role escalation via register must be ignored');
  assert.equal((await call('/auth/register', { method: 'POST', body: { email: 'new@muj.local', name: 'Dup', password: 'password123' } })).status, 409);
  assert.equal((await call('/auth/login', { method: 'POST', body: { email: 'new@muj.local', password: 'nope' } })).status, 401);
  assert.equal((await call('/auth/me')).status, 401);
  assert.equal((await call('/auth/me', { token: reg.json.token })).json.user.email, 'new@muj.local');
  assert.equal((await call('/auth/me', { token: 'garbage' })).status, 401);
  assert.equal((await call('/attendance', { token: reg.json.token })).json.courses.length, 0);
});

test('attendance: dataset baseline vs calculated records, faculty marking, RBAC', async () => {
  const st = await login('student@muj.local', 'student123'), fac = await login('faculty@muj.local', 'faculty123');
  let a = (await call('/attendance', { token: st })).json;
  const c = a.courses.find(x => x.code === 'DSE2220');
  assert.deepEqual([c.attended, c.total, c.status, c.baseline.source, c.recorded.source], [15, 20, 'orange', 'dataset', 'calculated']);
  assert.equal(a.courses.find(x => x.code === 'DSE2201').status, 'green');
  assert.equal((await call('/attendance/mark', { method: 'POST', token: st, body: {} })).status, 403, 'students cannot mark');
  assert.equal((await call('/attendance/mark', { method: 'POST', body: {} })).status, 401);
  const sid = (await call('/auth/me', { token: st })).json.user.id;
  const mark = present => call('/attendance/mark', { method: 'POST', token: fac, body: { course: 'DSE2220', date: '2026-10-22', slot: 3, records: [{ userId: sid, present }] } });
  assert.equal((await mark(true)).status, 200);
  c.n = (await call('/attendance/DSE2220', { token: st })).json;
  assert.deepEqual([c.n.attended, c.n.total, c.n.recorded.total], [16, 21, 1]);
  await mark(false);                                                    // correction replaces, never double-counts
  assert.deepEqual([(await call('/attendance/DSE2220', { token: st })).json.attended, (await call('/attendance/DSE2220', { token: st })).json.total], [15, 21]);
  assert.equal((await call('/attendance/mark', { method: 'POST', token: fac, body: { course: 'X', date: '2026-10-22', slot: 3, records: [{ userId: sid, present: true }] } })).status, 400);
  assert.equal((await call('/attendance/mark', { method: 'POST', token: fac, body: { course: 'DSE2220', date: '22-10-2026', slot: 3, records: [{ userId: sid, present: true }] } })).status, 400);
  assert.equal((await call('/attendance/mark', { method: 'POST', token: fac, body: { course: 'DSE2220', date: '2026-10-22', slot: 3, records: [{ userId: 1, present: true }] } })).status, 400, 'cannot mark a non-student');
});

test('admin: only admins; room rename persists into search; timetable edit; validation', async () => {
  const st = await login('student@muj.local', 'student123'), ad = await login('admin@muj.local', 'admin1234');
  assert.equal((await call('/admin/users', { token: st })).status, 403);
  assert.equal((await call('/admin/users')).status, 401);
  assert.equal((await call('/admin/rooms/AB2-102', { method: 'PATCH', token: ad, body: { name: 'Data Science Studio', type: 'l' } })).status, 200);
  assert.ok((await call('/rooms/search?q=studio')).json.results.some(x => x.k === 'AB2-102'));
  assert.equal((await call('/admin/rooms/AB2-102', { method: 'PATCH', token: ad, body: { type: 'zz' } })).status, 400);
  assert.equal((await call('/admin/timetable', { method: 'PUT', token: ad, body: { section: 'DSE-IV-B', day: 'MON', slot: 0, course: 'DSE2201', room: 'AB2-102' } })).status, 200);
  assert.equal((await call('/timetable?section=DSE-IV-B')).json.week.MON[0].roomKey, 'AB2-102');
  assert.equal((await call('/admin/timetable', { method: 'PUT', token: ad, body: { section: 'DSE-IV-B', day: 'MON', slot: 0, course: 'DSE2201', room: 'AB9-999' } })).status, 400);
  assert.equal((await call('/admin/places/ab1', { method: 'PATCH', token: ad, body: { lat: 999 } })).status, 404);
  assert.equal((await call('/admin/places/AB1', { method: 'PATCH', token: ad, body: { lat: 999 } })).status, 400);
  assert.equal((await call('/admin/places/AB1', { method: 'PATCH', token: ad, body: { lat: 26.8431, lng: 75.5647, verified: true } })).status, 200);
  assert.equal((await call('/admin/places/AB1', { method: 'DELETE', token: ad })).status, 400, 'indoor buildings are protected');
});

test('places + route + errors', async () => {
  assert.ok((await call('/places')).json.places.length >= 28);
  assert.ok((await call('/places?category=dining')).json.places.every(p => p.category === 'dining'));
  assert.equal((await call('/places?q=library')).json.places[0].id, 'central-library');
  const rt = (await call('/route?from=26.843,75.5645&to=26.8433,75.5642')).json;
  assert.equal(rt.real, false); assert.ok(rt.distance > 20 && rt.distance < 100);
  assert.equal((await call('/route?from=abc&to=1,2')).status, 400);
  assert.equal((await call('/nope')).status, 404);
  const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' }); assert.equal(r.status, 400);
});
