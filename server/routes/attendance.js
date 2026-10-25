const express = require('express'), core = require('../../public/js/core');
const { requireAuth, requireRole } = require('../auth'), { tx } = require('../db');
const { HttpError, wrap, str, int, isDate } = require('../util/http');

module.exports = db => {
  const r = express.Router();

  /** Per-course attendance for one student.
   *  `baseline` = figures supplied as a dataset; `recorded` = classes marked in this system;
   *  attended/total/percentage are CALCULATED as baseline + recorded. */
  function summaryFor(userId) {
    const rows = db.prepare(`
      SELECT c.code, c.name, c.faculty, c.is_lab isLab,
        coalesce(b.attended,0) b_att, coalesce(b.total,0) b_tot,
        (SELECT coalesce(sum(present),0) FROM attendance_records a WHERE a.user_id=?1 AND a.course_code=c.code) r_att,
        (SELECT count(*) FROM attendance_records a WHERE a.user_id=?1 AND a.course_code=c.code) r_tot
      FROM courses c LEFT JOIN attendance_baseline b ON b.course_code=c.code AND b.user_id=?1
      WHERE c.code IN (SELECT course_code FROM attendance_baseline WHERE user_id=?1
                       UNION SELECT course_code FROM attendance_records WHERE user_id=?1)
      ORDER BY c.code`).all(userId);
    return rows.map(x => ({
      code: x.code, name: x.name, faculty: x.faculty, isLab: !!x.isLab,
      baseline: { attended: x.b_att, total: x.b_tot, source: 'dataset' },
      recorded: { attended: x.r_att, total: x.r_tot, source: 'calculated' },
      ...core.summarize(x.b_att + x.r_att, x.b_tot + x.r_tot)
    }));
  }

  r.get('/attendance', requireAuth, wrap((req, res) => {
    const courses = summaryFor(req.user.id);
    const A = courses.reduce((s, c) => s + c.attended, 0), T = courses.reduce((s, c) => s + c.total, 0);
    res.json({ thresholds: core.THRESHOLDS, overall: core.summarize(A, T), courses });
  }));

  r.get('/attendance/:course', requireAuth, wrap((req, res) => {
    const c = summaryFor(req.user.id).find(x => x.code === req.params.course);
    if (!c) throw new HttpError(404, 'No attendance for this course');
    const records = db.prepare('SELECT date,slot,present FROM attendance_records WHERE user_id=? AND course_code=? ORDER BY date DESC,slot DESC LIMIT 200')
      .all(req.user.id, req.params.course).map(x => ({ ...x, present: !!x.present }));
    res.json({ ...c, records });
  }));

  /* ── Faculty / admin ── */
  r.get('/section/:code/students', requireRole('faculty', 'admin'), wrap((req, res) => {
    res.json({ students: db.prepare("SELECT id,name,email,reg_no FROM users WHERE role='student' AND section=? ORDER BY name").all(req.params.code) });
  }));

  /** Mark attendance for one class (course + date + period). Re-posting corrects earlier marks. */
  r.post('/attendance/mark', requireRole('faculty', 'admin'), wrap((req, res) => {
    const course = str(req.body.course, 20), date = str(req.body.date, 10), slot = int(req.body.slot), recs = req.body.records;
    if (!db.prepare('SELECT 1 FROM courses WHERE code=?').get(course)) throw new HttpError(400, 'Unknown course');
    if (!isDate(date)) throw new HttpError(400, 'date must be YYYY-MM-DD');
    if (slot == null || !db.prepare('SELECT 1 FROM slots WHERE idx=?').get(slot)) throw new HttpError(400, 'Unknown period');
    if (!Array.isArray(recs) || !recs.length || recs.length > 500) throw new HttpError(400, 'records must be a non-empty array');
    const isStudent = db.prepare("SELECT 1 FROM users WHERE id=? AND role='student'");
    const up = db.prepare(`INSERT INTO attendance_records (user_id,course_code,date,slot,present,marked_by) VALUES (?,?,?,?,?,?)
      ON CONFLICT(user_id,course_code,date,slot) DO UPDATE SET present=excluded.present, marked_by=excluded.marked_by, marked_at=datetime('now')`);
    let n = 0;
    tx(db, () => recs.forEach(x => {
      const uid = int(x.userId);
      if (uid == null || !isStudent.get(uid)) throw new HttpError(400, 'Unknown student id ' + x.userId);
      if (typeof x.present !== 'boolean') throw new HttpError(400, 'present must be true/false');
      up.run(uid, course, date, slot, x.present ? 1 : 0, req.user.id); n++;
    }));
    res.json({ ok: true, marked: n });
  }));
  return r;
};
