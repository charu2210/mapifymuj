const express = require('express'), helmet = require('helmet'), cors = require('cors'), compression = require('compression');
const rateLimit = require('express-rate-limit'), path = require('path');
const cfg = require('./config'), { open } = require('./db'), { seedAll } = require('./seed/run'), { authenticate } = require('./auth'), { HttpError } = require('./util/http');

function createApp(db, { limiter = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'", "'wasm-unsafe-eval'", 'https://cdnjs.cloudflare.com'], workerSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
    fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org', 'https://server.arcgisonline.com', 'https://*.basemaps.cartocdn.com', 'https://cdnjs.cloudflare.com'],
    connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'self'"], upgradeInsecureRequests: null } } }));
  app.use(compression());
  if (cfg.corsOrigins.length) app.use('/api', cors({ origin: cfg.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));
  if (limiter) app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
  app.use('/api', authenticate(db));

  app.get('/api/health', (_q, res) => res.json({ ok: true, time: new Date().toISOString() }));
  app.use('/api', require('./routes/campus')(db));
  app.use('/api', require('./routes/timetable')(db));
  app.use('/api', require('./routes/attendance')(db));
  app.use('/api', require('./routes/mytimetable')(db));
  app.use('/api', require('./routes/route')());
  app.use('/api/auth', require('./routes/auth')(db, { limiter }));
  app.use('/api/admin', require('./routes/admin')(db));
  app.use('/api', (_q, _s, next) => next(new HttpError(404, 'Unknown API endpoint')));

  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'], maxAge: cfg.prod ? '1h' : 0 }));

  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') err = new HttpError(400, 'Invalid JSON');
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message, details: err.details });
  });
  return app;
}

if (require.main === module) {
  const db = open(cfg.dbPath); seedAll(db);
  createApp(db).listen(cfg.port, () => console.log(`MapifyMUJ running → http://localhost:${cfg.port}`));
}
module.exports = { createApp };
