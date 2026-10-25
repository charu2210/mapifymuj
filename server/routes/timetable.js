const express = require('express'), core = require('../../public/js/core'), cfg = require('../config');
const { HttpError, wrap, str } = require('../util/http');

module.exports = db => {
  const r = express.Router();
  const slots = () => db.prepare('SELECT start_min,end_min FROM slots ORDER BY idx').all().map(s => [s.start_min, s.end_min]);
  const sectionOf = req => {
    const code = str(req.query.section, 30) || req.user?.section || db.prepare('SELECT code FROM sections ORDER BY code LIMIT 1').get()?.code;
    if (!code || !db.prepare('SELECT 1 FROM sections WHERE code=?').get(code)) throw new HttpError(404, 'Unknown section');
    return code;
  };
  const entries = section => db.prepare(`
    SELECT t.id,t.day,t.slot,t.course_code course,c.name course_name,c.faculty,c.is_lab isLab,t.room_key roomKey,
           r.id room,r.building_id building,r.floor_id floor
    FROM timetable t JOIN courses c ON c.code=t.course_code LEFT JOIN rooms r ON r.key=t.room_key
    WHERE t.section=? ORDER BY t.slot`).all(section).map(e => ({ ...e, isLab: !!e.isLab }));

  r.get('/sections', wrap((_q, res) => res.json({ sections: db.prepare('SELECT * FROM sections ORDER BY code').all() })));
  r.get('/slots', wrap((_q, res) => res.json({ slots: db.prepare('SELECT * FROM slots ORDER BY idx').all() })));

  /** Weekly timetable. Back-to-back periods of a course are merged into blocks. */
  r.get('/timetable', wrap((req, res) => {
    const section = sectionOf(req), sl = slots(), all = entries(section);
    const week = Object.fromEntries(core.DAYS.map(d => [d, core.toBlocks(all.filter(e => e.day === d), sl)]));
    res.json({ section, slots: sl.map(([s, e]) => ({ start: core.hhmm(s), end: core.hhmm(e), label: core.label12(s) + '–' + core.label12(e) })), week, entries: all });
  }));

  /** The class running now / coming up. `?at=2026-10-22T10:45:00+05:30` lets you simulate a moment (demo & tests). */
  r.get('/timetable/now', wrap((req, res) => {
    const at = req.query.at ? new Date(String(req.query.at)) : new Date();
    if (Number.isNaN(at.getTime())) throw new HttpError(400, 'Invalid "at" timestamp');
    const section = sectionOf(req);
    res.json({ section, tz: cfg.tz, at: at.toISOString(), ...core.resolveNow(entries(section), slots(), core.clock(at, cfg.tz)) });
  }));
  return r;
};
