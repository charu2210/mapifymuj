/* Snapshots the API into public/data/static.json so the front-end also works with no server (e.g. GitHub Pages).
 * Run after changing seed data or after editing data through the admin console:  npm run build:static */
process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 'snapshot'; process.env.SEED_DEMO = '1';
const fs = require('fs'), path = require('path');
const { open } = require('../server/db'), { seedAll } = require('../server/seed/run'), { createApp } = require('../server/index');
(async () => {
  const db = open(':memory:'); seedAll(db);
  const srv = createApp(db, { limiter: false }).listen(0), base = `http://127.0.0.1:${srv.address().port}/api`;
  const get = async (p, tk) => (await fetch(base + p, { headers: tk ? { authorization: 'Bearer ' + tk } : {} })).json();
  const tk = (await (await fetch(base + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'student@muj.local', password: 'student123' }) })).json()).token;
  const att = await get('/attendance', tk);
  const out = {
    generated: new Date().toISOString(), note: 'Snapshot of the MapifyMUJ API for offline/static hosting. Attendance is SAMPLE data.',
    campus: await get('/campus'), places: (await get('/places')).places, timetable: await get('/timetable'),
    slotMinutes: db.prepare('SELECT start_min s,end_min e FROM slots ORDER BY idx').all().map(x => [x.s, x.e]),
    demoAttendance: att
  };
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'data', 'static.json'), JSON.stringify(out));
  console.log('static.json written:', (JSON.stringify(out).length / 1024).toFixed(0) + ' KB'); srv.close();
})();
