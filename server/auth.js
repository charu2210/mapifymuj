const jwt = require('jsonwebtoken'), cfg = require('./config'), { HttpError } = require('./util/http');
const sign = u => jwt.sign({ sub: u.id, role: u.role }, cfg.jwtSecret, { expiresIn: cfg.jwtExpires });
/** Attaches req.user (fresh from DB) if a valid Bearer token is present. */
const authenticate = db => (req, _res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return next();
  try {
    const p = jwt.verify(h.slice(7), cfg.jwtSecret);
    const u = db.prepare('SELECT id,email,name,role,section,reg_no FROM users WHERE id=?').get(p.sub);
    if (u) req.user = u;
  } catch (_) { /* invalid/expired token → treated as anonymous */ }
  next();
};
const requireAuth = (req, _res, next) => req.user ? next() : next(new HttpError(401, 'Sign in required'));
const requireRole = (...roles) => (req, _res, next) =>
  !req.user ? next(new HttpError(401, 'Sign in required')) :
  roles.includes(req.user.role) ? next() : next(new HttpError(403, 'Not allowed for your role'));
module.exports = { sign, authenticate, requireAuth, requireRole };
