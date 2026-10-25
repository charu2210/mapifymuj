const express = require('express'), bcrypt = require('bcryptjs');
const { requireRole } = require('../auth'), { HttpError, wrap, str, int } = require('../util/http');
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'], RTYPES = ['r', 'l', 'f', 'a', 'u', 'e'];
const CATS = ['academic', 'residential', 'dining', 'recreation', 'administrative', 'parking', 'outdoor'];

module.exports = db => {
  const r = express.Router();
  r.use(requireRole('admin'));

  /* Rooms: 190 of 309 rooms have no name yet — this is where they get filled in. */
  r.patch('/rooms/:key', wrap((req, res) => {
    const x = db.prepare('SELECT * FROM rooms WHERE key=?').get(req.params.key);
    if (!x) throw new HttpError(404, 'Room not found');
    const name = req.body.name === undefined ? x.name : str(req.body.name, 100);
    const type = req.body.type === undefined ? x.type : req.body.type;
    if (!RTYPES.includes(type)) throw new HttpError(400, 'type must be one of ' + RTYPES.join(','));
    db.prepare('UPDATE rooms SET name=?, type=? WHERE key=?').run(name, type, x.key);
    res.json({ k: x.key, id: x.id, name, t: type, b: x.building_id, f: x.floor_id });
  }));

  /* Campus map pins / POIs */
  const placeBody = (b, cur = {}) => {
    const lat = b.lat === undefined ? cur.lat : +b.lat, lng = b.lng === undefined ? cur.lng : +b.lng;
    if (lat != null && (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180))) throw new HttpError(400, 'Invalid coordinates');
    const category = b.category === undefined ? cur.category : b.category;
    if (!CATS.includes(category)) throw new HttpError(400, 'category must be one of ' + CATS.join(','));
    const name = b.name === undefined ? cur.name : str(b.name, 120);
    if (!name) throw new HttpError(400, 'name required');
    const services = Array.isArray(b.services) ? b.services.slice(0, 20).map(s => str(s, 60)) : JSON.parse(cur.services || '[]');
    const pick = (k) => b[k] === undefined ? (cur[k] ?? null) : (str(b[k], 300) || null);
    return { lat, lng, category, name, services: JSON.stringify(services), description: pick('description'), hours: pick('hours'), phone: pick('phone'), website: pick('website'),
             verified: b.verified === undefined ? (cur.verified ?? 0) : (b.verified ? 1 : 0) };
  };
  r.post('/places', wrap((req, res) => {
    const p = placeBody(req.body), id = str(req.body.id, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (db.prepare('SELECT 1 FROM buildings WHERE id=?').get(id)) throw new HttpError(409, 'A place with this id exists');
    db.prepare(`INSERT INTO buildings (id,name,category,description,hours,phone,website,services,lat,lng,indoor,verified,sort) VALUES (?,?,?,?,?,?,?,?,?,?,0,?,500)`)
      .run(id, p.name, p.category, p.description, p.hours, p.phone, p.website, p.services, p.lat, p.lng, p.verified);
    res.status(201).json({ id });
  }));
  r.patch('/places/:id', wrap((req, res) => {
    const cur = db.prepare('SELECT * FROM buildings WHERE id=?').get(req.params.id);
    if (!cur) throw new HttpError(404, 'Place not found');
    const p = placeBody(req.body, cur);
    db.prepare('UPDATE buildings SET name=?,category=?,description=?,hours=?,phone=?,website=?,services=?,lat=?,lng=?,verified=? WHERE id=?')
      .run(p.name, p.category, p.description, p.hours, p.phone, p.website, p.services, p.lat, p.lng, p.verified, cur.id);
    res.json({ ok: true });
  }));
  r.delete('/places/:id', wrap((req, res) => {
    const cur = db.prepare('SELECT indoor FROM buildings WHERE id=?').get(req.params.id);
    if (!cur) throw new HttpError(404, 'Place not found');
    if (cur.indoor) throw new HttpError(400, 'Buildings with floor plans cannot be deleted');
    db.prepare('DELETE FROM buildings WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  }));

  /* Courses */
  r.get('/courses', wrap((_q, res) => res.json({ courses: db.prepare('SELECT code,name,faculty,is_lab isLab FROM courses ORDER BY code').all() })));
  r.put('/courses/:code', wrap((req, res) => {
    const code = str(req.params.code, 20).toUpperCase(), name = str(req.body.name, 100);
    if (!/^[A-Z0-9]{3,12}$/.test(code) || !name) throw new HttpError(400, 'Valid code and name required');
    db.prepare(`INSERT INTO courses (code,name,faculty,is_lab) VALUES (?,?,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name,faculty=excluded.faculty,is_lab=excluded.is_lab`)
      .run(code, name, str(req.body.faculty, 100), req.body.isLab ? 1 : 0);
    res.json({ ok: true });
  }));

  /* Timetable entries (one course in one period of one day for a section) */
  r.put('/timetable', wrap((req, res) => {
    const section = str(req.body.section, 30), day = str(req.body.day, 3).toUpperCase(), slot = int(req.body.slot), course = str(req.body.course, 20), room = str(req.body.room, 40) || null;
    if (!db.prepare('SELECT 1 FROM sections WHERE code=?').get(section)) throw new HttpError(400, 'Unknown section');
    if (!DAYS.includes(day)) throw new HttpError(400, 'day must be MON–FRI');
    if (slot == null || !db.prepare('SELECT 1 FROM slots WHERE idx=?').get(slot)) throw new HttpError(400, 'Unknown period');
    if (!db.prepare('SELECT 1 FROM courses WHERE code=?').get(course)) throw new HttpError(400, 'Unknown course');
    if (room && !db.prepare('SELECT 1 FROM rooms WHERE key=?').get(room)) throw new HttpError(400, 'Unknown room key (e.g. AB2-127)');
    db.prepare(`INSERT INTO timetable (section,day,slot,course_code,room_key) VALUES (?,?,?,?,?)
      ON CONFLICT(section,day,slot) DO UPDATE SET course_code=excluded.course_code, room_key=excluded.room_key`).run(section, day, slot, course, room);
    res.json({ ok: true });
  }));
  r.delete('/timetable/:id', wrap((req, res) => {
    const n = db.prepare('DELETE FROM timetable WHERE id=?').run(+req.params.id).changes;
    if (!n) throw new HttpError(404, 'Entry not found');
    res.json({ ok: true });
  }));

  /* Users */
  r.get('/users', wrap((_q, res) => res.json({ users: db.prepare('SELECT id,email,name,role,section,reg_no,created_at FROM users ORDER BY id').all() })));
  r.patch('/users/:id', wrap((req, res) => {
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(+req.params.id);
    if (!u) throw new HttpError(404, 'User not found');
    const role = req.body.role === undefined ? u.role : req.body.role;
    if (!['student', 'faculty', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role');
    if (u.id === req.user.id && role !== 'admin') throw new HttpError(400, 'You cannot remove your own admin role');
    db.prepare('UPDATE users SET role=? WHERE id=?').run(role, u.id);
    res.json({ ok: true });
  }));
  r.post('/users', wrap((req, res) => {
    const email = str(req.body.email, 120).toLowerCase(), name = str(req.body.name, 80), pw = req.body.password, role = req.body.role || 'faculty';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2 || typeof pw !== 'string' || pw.length < 8) throw new HttpError(400, 'email, name and an 8+ char password required');
    if (!['student', 'faculty', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role');
    if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) throw new HttpError(409, 'Email already used');
    const id = db.prepare('INSERT INTO users (email,name,password_hash,role) VALUES (?,?,?,?)').run(email, name, bcrypt.hashSync(pw, 10), role).lastInsertRowid;
    res.status(201).json({ id });
  }));

  /* Attendance baseline import (dataset values, e.g. exported from the ERP) */
  r.put('/attendance-baseline', wrap((req, res) => {
    const uid = int(req.body.userId), course = str(req.body.course, 20), a = int(req.body.attended), t = int(req.body.total);
    if (uid == null || a == null || t == null || a < 0 || t < a) throw new HttpError(400, 'userId, course, attended ≤ total required');
    if (!db.prepare("SELECT 1 FROM users WHERE id=? AND role='student'").get(uid) || !db.prepare('SELECT 1 FROM courses WHERE code=?').get(course)) throw new HttpError(400, 'Unknown student or course');
    db.prepare(`INSERT INTO attendance_baseline (user_id,course_code,attended,total) VALUES (?,?,?,?)
      ON CONFLICT(user_id,course_code) DO UPDATE SET attended=excluded.attended,total=excluded.total`).run(uid, course, a, t);
    res.json({ ok: true });
  }));
  return r;
};
