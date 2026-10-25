/* Seeds campus data (buildings, floors, rooms, POIs, timetable) and — in development — demo accounts.
 * Idempotent: safe to run on every start. `npm run seed -- --reset` wipes the DB file first. */
const fs = require('fs'), path = require('path'), bcrypt = require('bcryptjs');
const cfg = require('../config'), { open, tx } = require('../db');

const campus = require('./campus.json'), places = require('./places.json'), tt = require('./timetable.json');

/* Approximate pins for the four indoor buildings — NOT surveyed. Correct them in Admin → Campus map. */
const INDOOR_PINS = {
  AB1: [26.8429, 75.5646, 'Academic Block 1'],
  AB2: [26.8433, 75.5642, 'Academic Block 2'],
  AIC: [26.8436, 75.5636, 'AIC'],
  LHC: [26.8427, 75.5650, 'Lecture Hall Complex']
};

function seedCampus(db) {
  const has = db.prepare('SELECT COUNT(*) n FROM buildings').get().n;
  if (has) return false;
  tx(db, () => {
    const b = db.prepare(`INSERT INTO buildings (id,name,category,description,lat,lng,indoor,verified,sort) VALUES (?,?,?,?,?,?,1,0,?)`);
    const f = db.prepare('INSERT INTO floors (building_id,id,name,file,sort) VALUES (?,?,?,?,?)');
    const r = db.prepare('INSERT INTO rooms (key,building_id,floor_id,id,name,type) VALUES (?,?,?,?,?,?)');
    campus.buildings.forEach((bd, i) => {
      const [lat, lng, desc] = INDOOR_PINS[bd.id] || [null, null, ''];
      b.run(bd.id, bd.name, 'academic', desc, lat, lng, i);
      bd.floors.forEach((fl, j) => f.run(bd.id, fl.id, fl.name, fl.file, j));
    });
    campus.rooms.forEach(rm => r.run(rm.k, rm.b, rm.f, rm.id, rm.name || '', rm.t));
    const p = db.prepare(`INSERT OR IGNORE INTO buildings (id,name,category,description,hours,phone,website,services,lat,lng,indoor,verified,sort)
                          VALUES (?,?,?,?,?,?,?,?,?,?,0,0,?)`);
    places.forEach((pl, i) => p.run(pl.id, pl.name, pl.category, pl.description, pl.hours, pl.phone, pl.website,
      JSON.stringify(pl.services || []), pl.lat, pl.lng, 100 + i));
  });
  return true;
}

/* Add newly published floor plans and rooms to an already-seeded database without resetting student data. */
function syncIndoorMaps(db) {
  const known = new Set(['AB1','AB2','AIC','LHC']);
  tx(db, () => {
    const b = db.prepare(`INSERT OR IGNORE INTO buildings (id,name,category,description,lat,lng,indoor,verified,sort) VALUES (?,?,?,?,?,?,1,0,?)`);
    const f = db.prepare('INSERT OR IGNORE INTO floors (building_id,id,name,file,sort) VALUES (?,?,?,?,?)');
    const r = db.prepare('INSERT OR IGNORE INTO rooms (key,building_id,floor_id,id,name,type) VALUES (?,?,?,?,?,?)');
    campus.buildings.forEach((bd, i) => {
      if (!known.has(bd.id)) b.run(bd.id, bd.name, 'academic', 'Indoor floor maps', 26.8430, 75.5645, 10 + i);
      bd.floors.forEach((fl, j) => f.run(bd.id, fl.id, fl.name, fl.file, j));
    });
    campus.rooms.forEach(rm => r.run(rm.k, rm.b, rm.f, rm.id, rm.name || '', rm.t));
  });
}

function seedTimetable(db) {
  if (db.prepare('SELECT COUNT(*) n FROM sections').get().n) return false;
  tx(db, () => {
    db.prepare('INSERT INTO sections (code,name) VALUES (?,?)').run(tt.section.code, tt.section.name);
    tt.slots.forEach(([s, e], i) => db.prepare('INSERT INTO slots (idx,start_min,end_min) VALUES (?,?,?)').run(i, s, e));
    tt.courses.forEach(c => db.prepare('INSERT INTO courses (code,name,faculty,is_lab) VALUES (?,?,?,?)').run(c.code, c.name, c.faculty, c.is_lab ? 1 : 0));
    const room = db.prepare('SELECT key FROM rooms WHERE key=?');
    tt.entries.forEach(e => {
      const key = e.building + '-' + e.room;
      const rk = room.get(key) ? key : null;
      if (!rk) console.warn('[seed] timetable room not on any map:', key);
      db.prepare('INSERT INTO timetable (section,day,slot,course_code,room_key) VALUES (?,?,?,?,?)').run(tt.section.code, e.day, e.slot, e.course, rk);
    });
  });
  return true;
}

function seedUsers(db) {
  const hash = p => bcrypt.hashSync(p, 10);
  if (!db.prepare("SELECT 1 FROM users WHERE role='admin'").get()) {
    const pw = cfg.adminPassword || (cfg.prod ? '' : 'admin1234');
    if (pw) {
      db.prepare('INSERT INTO users (email,name,password_hash,role) VALUES (?,?,?,?)').run(cfg.adminEmail, 'Administrator', hash(pw), 'admin');
      console.log(`[seed] admin created: ${cfg.adminEmail}` + (cfg.adminPassword ? '' : '  (dev password: admin1234 — change it!)'));
    } else console.warn('[seed] No admin created: set ADMIN_PASSWORD to create one in production.');
  }
  if (cfg.seedDemo && !db.prepare("SELECT 1 FROM users WHERE email='student@muj.local'").get()) {
    tx(db, () => {
      const id = db.prepare('INSERT INTO users (email,name,password_hash,role,section,reg_no) VALUES (?,?,?,?,?,?)')
        .run('student@muj.local', 'Demo Student', hash('student123'), 'student', tt.section.code, 'DEMO0001').lastInsertRowid;
      for (const [code, v] of Object.entries(tt.demoAttendance))
        db.prepare('INSERT INTO attendance_baseline (user_id,course_code,attended,total) VALUES (?,?,?,?)').run(id, code, v.a, v.t);
      db.prepare('INSERT INTO users (email,name,password_hash,role) VALUES (?,?,?,?)').run('faculty@muj.local', 'Demo Faculty', hash('faculty123'), 'faculty');
    });
    console.log('[seed] demo accounts: student@muj.local / student123, faculty@muj.local / faculty123');
  }
}

function seedAll(db) { seedCampus(db); syncIndoorMaps(db); seedTimetable(db); seedUsers(db); }
module.exports = { seedAll };

if (require.main === module) {
  if (process.argv.includes('--reset')) for (const s of ['', '-wal', '-shm']) fs.rmSync(cfg.dbPath + s, { force: true });
  const db = open(cfg.dbPath); seedAll(db);
  console.log('[seed] done →', cfg.dbPath,
    db.prepare('SELECT (SELECT COUNT(*) FROM buildings) b,(SELECT COUNT(*) FROM rooms) r,(SELECT COUNT(*) FROM timetable) t').get());
}
