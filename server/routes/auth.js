const express = require('express'), bcrypt = require('bcryptjs'), rateLimit = require('express-rate-limit');
const { sign, requireAuth } = require('../auth'), { HttpError, wrap, str } = require('../util/http');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = (db, { limiter = true } = {}) => {
  const r = express.Router();
  const strict = limiter ? rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many attempts, try again in a few minutes.' } }) : (_q, _s, n) => n();
  const pub = u => ({ id: u.id, email: u.email, name: u.name, role: u.role, section: u.section, reg_no: u.reg_no });

  /** Students self-register (role is always 'student'; faculty/admin are created by an admin). */
  r.post('/register', strict, wrap((req, res) => {
    const email = str(req.body.email, 120).toLowerCase(), name = str(req.body.name, 80), pw = typeof req.body.password === 'string' ? req.body.password : '';
    const section = str(req.body.section, 30) || null, reg = str(req.body.reg_no, 30) || null;
    if (!EMAIL.test(email)) throw new HttpError(400, 'Enter a valid email');
    if (name.length < 2) throw new HttpError(400, 'Enter your name');
    if (pw.length < 8 || pw.length > 72) throw new HttpError(400, 'Password must be 8–72 characters');
    if (section && !db.prepare('SELECT 1 FROM sections WHERE code=?').get(section)) throw new HttpError(400, 'Unknown section');
    if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) throw new HttpError(409, 'An account with this email already exists');
    const id = db.prepare('INSERT INTO users (email,name,password_hash,section,reg_no) VALUES (?,?,?,?,?)')
      .run(email, name, bcrypt.hashSync(pw, 10), section, reg).lastInsertRowid;
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
    res.status(201).json({ token: sign(u), user: pub(u) });
  }));

  r.post('/login', strict, wrap((req, res) => {
    const email = str(req.body.email, 120).toLowerCase(), pw = typeof req.body.password === 'string' ? req.body.password : '';
    const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    // Always run a hash compare so response time does not reveal whether the email exists.
    const ok = bcrypt.compareSync(pw, u ? u.password_hash : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
    if (!u || !ok) throw new HttpError(401, 'Wrong email or password');
    res.json({ token: sign(u), user: pub(u) });
  }));

  r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

  r.patch('/me', requireAuth, wrap((req, res) => {
    const name = str(req.body.name, 80) || req.user.name, section = req.body.section === undefined ? req.user.section : (str(req.body.section, 30) || null);
    if (section && !db.prepare('SELECT 1 FROM sections WHERE code=?').get(section)) throw new HttpError(400, 'Unknown section');
    db.prepare('UPDATE users SET name=?, section=? WHERE id=?').run(name, section, req.user.id);
    res.json({ user: { ...req.user, name, section } });
  }));

  r.post('/password', requireAuth, strict, wrap((req, res) => {
    const cur = req.body.current, next = req.body.next;
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    if (typeof cur !== 'string' || !bcrypt.compareSync(cur, u.password_hash)) throw new HttpError(401, 'Current password is wrong');
    if (typeof next !== 'string' || next.length < 8 || next.length > 72) throw new HttpError(400, 'New password must be 8–72 characters');
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(next, 10), u.id);
    res.json({ ok: true });
  }));
  return r;
};
