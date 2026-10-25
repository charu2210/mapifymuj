class HttpError extends Error { constructor(status, message, details) { super(message); this.status = status; this.details = details; } }
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v, d = null) => (Number.isInteger(+v) && v !== '' && v != null ? +v : d);
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
module.exports = { HttpError, wrap, str, int, isDate };
