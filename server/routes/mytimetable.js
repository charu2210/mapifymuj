/* A student's own timetable (imported from a screenshot/PDF, confirmed by the student in the browser).
 * The image never reaches the server — only the verified rows do. Room text is matched to a floor-plan room here with the
 * same MapifyCore.matchRoom the browser uses, so "Find my classroom" always points at a real room or asks for a correction. */
const express = require('express'), core = require('../../public/js/core');
const { requireAuth } = require('../auth'), { tx } = require('../db');
const { HttpError, wrap, str, int } = require('../util/http');
const MAX_CLASSES = 120;

module.exports = db => {
  const r = express.Router();
  const rooms = () => db.prepare('SELECT key k, id, name, type t, building_id b, floor_id f FROM rooms').all();
  const roomByKey = db.prepare('SELECT key k, id, name, type t, building_id b, floor_id f FROM rooms WHERE key=?');
  const label = x => x.b + '-' + x.id;
  const pub = x => ({ k: x.k, id: x.id, name: x.name, b: x.b, f: x.f });

  const rows = uid => db.prepare(`
    SELECT c.id, c.day, c.start_min start, c.end_min "end", c.course_code course, c.course_name, c.faculty, c.is_lab isLab,
           c.room_text roomText, c.room_key roomKey, r.id room, r.building_id building, r.floor_id floor, r.name roomName, f.name floorName, b.name buildingName
    FROM user_classes c LEFT JOIN rooms r ON r.key=c.room_key
      LEFT JOIN floors f ON f.building_id=r.building_id AND f.id=r.floor_id LEFT JOIN buildings b ON b.id=r.building_id
    WHERE c.user_id=? ORDER BY instr('MON TUE WED THU FRI SAT', c.day), c.start_min`).all(uid)
    .map(x => ({ ...x, isLab: !!x.isLab, needsRoom: !x.roomKey }));
  const meta = uid => db.prepare('SELECT source, updated_at updatedAt FROM user_timetables WHERE user_id=?').get(uid) || null;
  const view = uid => { const classes = rows(uid); return { ...(meta(uid) || { source: null, updatedAt: null }), classes, unmatched: classes.filter(c => c.needsRoom).length }; };

  function clean(x, i, all) {
    const at = m => new HttpError(400, `Class ${i + 1}: ${m}`);
    if (!x || typeof x !== 'object') throw at('invalid entry');
    const day = str(x.day, 3).toUpperCase(); if (!core.DAYS_ALL.includes(day)) throw at('day must be one of ' + core.DAYS_ALL.join(', '));
    const start = int(x.start), end = int(x.end);
    if (start == null || end == null || start < 0 || end > 1440 || end <= start) throw at('start and end must be times with the end after the start');
    if (end - start > 480) throw at('a class cannot be longer than 8 hours');
    const course = str(x.course, 20).toUpperCase().replace(/[^A-Z0-9-]/g, ''), name = str(x.course_name, 100) || course;
    if (!name) throw at('give the subject a name or course code');
    const roomText = str(x.roomText, 40);
    let room = null;
    const picked = str(x.roomKey, 60);
    if (picked) { room = roomByKey.get(picked); if (!room) throw at('unknown room ' + picked); }
    else if (roomText) { const m = core.matchRoom(all, roomText); if (m.status === 'exact') room = m.room; }
    // a matched room is stored in its canonical form ("AB2-127"); unmatched text is kept as typed so the student can fix it later
    return { day, start, end, course, name, faculty: str(x.faculty, 100), isLab: x.isLab ? 1 : 0, roomText: room ? label(room) : roomText, roomKey: room ? room.k : null };
  }

  r.get('/me/timetable', requireAuth, wrap((req, res) => res.json(view(req.user.id))));

  /** Replace the whole timetable with the rows the student confirmed. */
  r.put('/me/timetable', requireAuth, wrap((req, res) => {
    const list = req.body && req.body.classes;
    if (!Array.isArray(list) || list.length > MAX_CLASSES) throw new HttpError(400, `classes must be an array of at most ${MAX_CLASSES} entries`);
    const all = rooms(), cleaned = list.map((x, i) => clean(x, i, all));
    const source = ['import', 'manual'].includes(req.body.source) ? req.body.source : 'import';
    tx(db, () => {
      db.prepare('DELETE FROM user_classes WHERE user_id=?').run(req.user.id);
      const ins = db.prepare('INSERT INTO user_classes (user_id,day,start_min,end_min,course_code,course_name,faculty,is_lab,room_text,room_key) VALUES (?,?,?,?,?,?,?,?,?,?)');
      cleaned.forEach(c => ins.run(req.user.id, c.day, c.start, c.end, c.course, c.name, c.faculty, c.isLab, c.roomText, c.roomKey));
      db.prepare("INSERT INTO user_timetables (user_id,source,updated_at) VALUES (?,?,datetime('now')) ON CONFLICT(user_id) DO UPDATE SET source=excluded.source, updated_at=excluded.updated_at").run(req.user.id, source);
    });
    res.json(view(req.user.id));
  }));

  /** Correct the room of one class. Ambiguous / unknown text is refused with suggestions so the student can choose. */
  r.patch('/me/timetable/:id', requireAuth, wrap((req, res) => {
    const id = int(req.params.id), cur = id == null ? null : db.prepare('SELECT id FROM user_classes WHERE id=? AND user_id=?').get(id, req.user.id);
    if (!cur) throw new HttpError(404, 'Class not found');
    let room = null;
    if (req.body.roomKey) { room = roomByKey.get(str(req.body.roomKey, 60)); if (!room) throw new HttpError(400, 'Unknown room'); }
    else {
      const text = str(req.body.roomText, 40); if (!text) throw new HttpError(400, 'Enter a room, e.g. AB2-127');
      const m = core.matchRoom(rooms(), text);
      if (m.status !== 'exact') throw new HttpError(422, m.status === 'ambiguous' ? `“${text}” exists in more than one building — choose one` : `Couldn’t find “${text}” on any floor plan`, { status: m.status, candidates: m.candidates.slice(0, 8).map(pub) });
      room = m.room;
    }
    db.prepare('UPDATE user_classes SET room_key=?, room_text=? WHERE id=?').run(room.k, label(room), id);
    db.prepare("UPDATE user_timetables SET updated_at=datetime('now') WHERE user_id=?").run(req.user.id);
    res.json(view(req.user.id));
  }));

  r.delete('/me/timetable', requireAuth, wrap((req, res) => {
    tx(db, () => { db.prepare('DELETE FROM user_classes WHERE user_id=?').run(req.user.id); db.prepare('DELETE FROM user_timetables WHERE user_id=?').run(req.user.id); });
    res.json(view(req.user.id));
  }));
  return r;
};
