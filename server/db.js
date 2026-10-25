/* SQLite (node:sqlite, built into Node >= 22.13 — no native modules to compile). */
const fs = require('fs'), path = require('path');
const { DatabaseSync } = require('node:sqlite');
const cfg = require('./config');

function open(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'academic',
  description TEXT, hours TEXT, phone TEXT, website TEXT, services TEXT NOT NULL DEFAULT '[]',
  lat REAL, lng REAL, indoor INTEGER NOT NULL DEFAULT 0, verified INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS floors (
  building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  id TEXT NOT NULL, name TEXT NOT NULL, file TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (building_id, id)
);
CREATE TABLE IF NOT EXISTS rooms (
  key TEXT PRIMARY KEY, building_id TEXT NOT NULL, floor_id TEXT NOT NULL, id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT 'r',
  FOREIGN KEY (building_id, floor_id) REFERENCES floors(building_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(building_id, floor_id);
CREATE TABLE IF NOT EXISTS sections (code TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS slots (idx INTEGER PRIMARY KEY, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS courses (
  code TEXT PRIMARY KEY, name TEXT NOT NULL, faculty TEXT NOT NULL DEFAULT '', is_lab INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS timetable (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL REFERENCES sections(code) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('MON','TUE','WED','THU','FRI')),
  slot INTEGER NOT NULL REFERENCES slots(idx),
  course_code TEXT NOT NULL REFERENCES courses(code) ON DELETE CASCADE,
  room_key TEXT REFERENCES rooms(key) ON DELETE SET NULL,
  UNIQUE (section, day, slot)
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','faculty','admin')),
  section TEXT REFERENCES sections(code) ON DELETE SET NULL, reg_no TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Attendance values supplied as a dataset (what the prototype shipped with / imported from the ERP).
CREATE TABLE IF NOT EXISTS attendance_baseline (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL REFERENCES courses(code) ON DELETE CASCADE,
  attended INTEGER NOT NULL CHECK (attended >= 0), total INTEGER NOT NULL CHECK (total >= attended),
  PRIMARY KEY (user_id, course_code)
);
-- Per-class records marked in this system (values the system calculates from).
CREATE TABLE IF NOT EXISTS attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL REFERENCES courses(code) ON DELETE CASCADE,
  date TEXT NOT NULL, slot INTEGER NOT NULL,
  present INTEGER NOT NULL CHECK (present IN (0,1)),
  marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  marked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, course_code, date, slot)
);
CREATE INDEX IF NOT EXISTS idx_att_user ON attendance_records(user_id, course_code);
-- A student's OWN timetable (imported from a screenshot / PDF and confirmed by them). Independent of the section timetable above.
-- room_text is what the student confirmed ("AB2-127", "127", "XYZ 404"); room_key links it to a floor plan when it matches.
CREATE TABLE IF NOT EXISTS user_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('MON','TUE','WED','THU','FRI','SAT')),
  start_min INTEGER NOT NULL CHECK (start_min BETWEEN 0 AND 1439),
  end_min INTEGER NOT NULL CHECK (end_min BETWEEN 1 AND 1440),
  course_code TEXT NOT NULL DEFAULT '', course_name TEXT NOT NULL, faculty TEXT NOT NULL DEFAULT '',
  is_lab INTEGER NOT NULL DEFAULT 0,
  room_text TEXT NOT NULL DEFAULT '',
  room_key TEXT REFERENCES rooms(key) ON DELETE SET NULL,
  CHECK (end_min > start_min)
);
CREATE INDEX IF NOT EXISTS idx_uc_user ON user_classes(user_id, day, start_min);
CREATE TABLE IF NOT EXISTS user_timetables (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'import', updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
function migrate(db) { db.exec(SCHEMA); }

/** Run fn inside a transaction (node:sqlite has no helper). */
function tx(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}
module.exports = { open, tx, defaultFile: cfg.dbPath };
