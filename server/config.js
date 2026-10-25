const path = require('path');
try { process.loadEnvFile && require('fs').existsSync('.env') && process.loadEnvFile('.env'); } catch (_) {}
const prod = process.env.NODE_ENV === 'production';
const crypto = require('crypto');
let secret = process.env.JWT_SECRET;
if (!secret) {
  if (prod) { console.error('FATAL: JWT_SECRET must be set in production.'); process.exit(1); }
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('[config] JWT_SECRET not set — using a random one (sessions reset on restart).');
}
module.exports = {
  prod,
  port: +process.env.PORT || 3000,
  jwtSecret: secret,
  jwtExpires: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'mapifymuj.db'),
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  orsKey: process.env.ORS_API_KEY || '',
  tz: process.env.CAMPUS_TZ || 'Asia/Kolkata',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@muj.local').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  seedDemo: process.env.SEED_DEMO ? process.env.SEED_DEMO === '1' : !prod
};
