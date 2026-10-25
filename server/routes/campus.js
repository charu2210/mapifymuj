const express = require('express'), core = require('../../public/js/core');
const { HttpError, wrap, str, int } = require('../util/http');
const TYPES = { r: 'Room', l: 'Lab', f: 'Food & café', a: 'Hall', u: 'Utility', e: 'Entrance' };
const parseB = b => ({ ...b, services: JSON.parse(b.services || '[]'), indoor: !!b.indoor, verified: !!b.verified });

module.exports = db => {
  const r = express.Router();
  const roomRow = x => ({ k: x.key, id: x.id, name: x.name, t: x.type, b: x.building_id, f: x.floor_id });

  /** Campus → Building → Floor hierarchy + every room (same shape as public/maps/campus.json). */
  r.get('/campus', wrap((_q, res) => {
    const buildings = db.prepare('SELECT id,name,lat,lng FROM buildings WHERE indoor=1 ORDER BY sort').all().map(b => ({
      ...b, floors: db.prepare('SELECT id,name,file FROM floors WHERE building_id=? ORDER BY sort').all(b.id)
    }));
    const rooms = db.prepare('SELECT * FROM rooms').all().map(roomRow);
    res.json({ campus: 'Manipal University Jaipur', buildings, rooms, types: TYPES });
  }));

  r.get('/rooms', wrap((req, res) => {
    const b = str(req.query.b, 20), f = str(req.query.f, 20);
    const rows = db.prepare('SELECT * FROM rooms WHERE (?1=\'\' OR building_id=?1) AND (?2=\'\' OR floor_id=?2)').all(b, f);
    res.json({ rooms: rows.map(roomRow) });
  }));

  r.get('/rooms/search', wrap((req, res) => {
    const q = str(req.query.q, 60), limit = Math.min(int(req.query.limit, 30), 100);
    const all = db.prepare('SELECT * FROM rooms').all().map(roomRow);
    const { total, results } = core.searchRooms(all, q, limit);
    res.json({ query: q, total, shown: results.length, results });
  }));

  /** Room card: location + the classes timetabled into it. */
  r.get('/rooms/:key', wrap((req, res) => {
    const x = db.prepare(`SELECT r.*, b.name bname, f.name fname FROM rooms r JOIN buildings b ON b.id=r.building_id
                          JOIN floors f ON f.building_id=r.building_id AND f.id=r.floor_id WHERE r.key=?`).get(req.params.key);
    if (!x) throw new HttpError(404, 'Room not found');
    const classes = db.prepare(`SELECT t.section,t.day,t.slot,c.code course,c.name course_name,c.faculty
                                FROM timetable t JOIN courses c ON c.code=t.course_code WHERE t.room_key=? ORDER BY t.day,t.slot`).all(x.key);
    res.json({ ...roomRow(x), building: x.bname, floor: x.fname, typeLabel: TYPES[x.type], classes });
  }));

  /** Outdoor points of interest (campus map). ?category= & ?q= */
  r.get('/places', wrap((req, res) => {
    const cat = str(req.query.category, 30), q = '%' + str(req.query.q, 60).toLowerCase() + '%';
    const rows = db.prepare(`SELECT * FROM buildings WHERE (?1='' OR ?1='all' OR category=?1)
      AND (lower(name) LIKE ?2 OR lower(coalesce(description,'')) LIKE ?2) ORDER BY sort,name`).all(cat, q);
    res.json({ places: rows.map(parseB) });
  }));
  r.get('/places/:id', wrap((req, res) => {
    const b = db.prepare('SELECT * FROM buildings WHERE id=?').get(req.params.id);
    if (!b) throw new HttpError(404, 'Place not found');
    res.json(parseB(b));
  }));
  return r;
};
