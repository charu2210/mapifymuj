/* MapifyMUJ core — pure logic shared by the browser UI and the Node backend.
 * One source of truth for: attendance thresholds, SVG ring, room search matching,
 * timetable "current / upcoming class" resolution. No DOM, no network. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MapifyCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────── Attendance (patent §5.6) ─────────
   * Above 75%          → green
   * 60% to 75% (incl.) → orange
   * Below 60%          → red
   * Status is decided on the EXACT ratio, never on a rounded figure. */
  const THRESHOLDS = { green: 75, orange: 60 };
  const COLORS = { green: '#2E9E4F', orange: '#E8760A', red: '#D92D2D' };

  function percent(attended, total) {
    return total > 0 ? (attended / total) * 100 : null;
  }
  function statusFor(pct) {
    if (pct == null || Number.isNaN(pct)) return 'none';
    if (pct > THRESHOLDS.green) return 'green';
    if (pct >= THRESHOLDS.orange) return 'orange';
    return 'red';
  }
  /** Classes the student can still miss and stay strictly above 75%. */
  function canSkip(attended, total) {
    let s = 0;
    while (attended / (total + s + 1) > THRESHOLDS.green / 100) s++;
    return attended / total > THRESHOLDS.green / 100 ? s : 0;
  }
  /** Consecutive classes to attend to get strictly above 75%. */
  function needToAttend(attended, total) {
    if (total === 0 || attended / total > THRESHOLDS.green / 100) return 0;
    let x = 0;
    while ((attended + x) / (total + x) <= THRESHOLDS.green / 100 && x < 10000) x++;
    return x;
  }
  function summarize(attended, total) {
    const pct = percent(attended, total);
    return {
      attended, total,
      percentage: pct == null ? null : Math.round(pct * 10) / 10,
      status: statusFor(pct),
      canSkip: pct == null ? 0 : canSkip(attended, total),
      needToAttend: pct == null ? 0 : needToAttend(attended, total)
    };
  }
  /** Circular progress indicator (SVG string). */
  function ringSvg(pct, size, opts) {
    size = size || 44; opts = opts || {};
    const st = statusFor(pct), col = COLORS[st] || '#B8B8C4';
    const sw = Math.max(3, Math.round(size / 11));
    const r = (size - sw) / 2 - 1, c = 2 * Math.PI * r, cx = size / 2;
    const v = pct == null ? 0 : Math.max(0, Math.min(100, pct));
    const label = pct == null ? '–' : Math.round(pct) + '%';
    const track = opts.track || '#ECECF1';
    return '<svg class="ring" role="img" aria-label="Attendance ' + label + ', ' + st + '" width="' + size + '" height="' + size +
      '" viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + track + '" stroke-width="' + sw + '"/>' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + sw +
      '" stroke-linecap="round" stroke-dasharray="' + (v / 100 * c).toFixed(2) + ' ' + c.toFixed(2) +
      '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>' +
      '<text x="' + cx + '" y="' + (cx + size * 0.075) + '" text-anchor="middle" font-size="' + (size * 0.25).toFixed(1) +
      '" font-weight="800" fill="' + (opts.text || col) + '" font-family="DM Sans,Arial,sans-serif">' + label + '</text></svg>';
  }

  /* ───────── Room search ───────── */
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '');
  /** Rank rooms for a free-text query. Accepts "127", "ab2 127", "AB2-127", "AB2127", "lab", "mess". */
  function searchRooms(rooms, query, limit) {
    const q = norm(query);
    if (!q) return { total: 0, results: [] };
    const hits = [];
    for (const r of rooms) {
      const id = norm(r.id), full = norm(r.b) + id, nm = norm(r.name);
      let sc = 9;
      if (id === q || full === q) sc = 0;
      else if (id.startsWith(q) || full.startsWith(q)) sc = 1;
      else if (nm && (nm.startsWith(q) || String(r.name).toLowerCase().split(/\W+/).some(w => norm(w).startsWith(q)))) sc = 2;
      else if (nm.includes(q)) sc = 3;
      if (sc < 9) hits.push([sc, r]);
    }
    hits.sort((a, b) => a[0] - b[0] || a[1].b.localeCompare(b[1].b) ||
      a[1].id.localeCompare(b[1].id, undefined, { numeric: true }));
    return { total: hits.length, results: hits.slice(0, limit || 30).map(h => h[1]) };
  }

  /* ───────── Timetable ───────── */
  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const label12 = m => { const h = Math.floor(m / 60), mm = m % 60; return ((h + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0'); };

  /** Wall-clock parts of `date` in a timezone (default Asia/Kolkata). */
  function clock(date, tz) {
    const p = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz || 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit',
      year: 'numeric', month: '2-digit', day: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).reduce((o, x) => (o[x.type] = x.value, o), {});
    return {
      day: p.weekday.slice(0, 3).toUpperCase(), minutes: (+p.hour) * 60 + (+p.minute),
      date: p.year + '-' + p.month + '-' + p.day
    };
  }

  /** Merge back-to-back periods of the same course+room (2-period labs) into one block. */
  function toBlocks(entries, slots) {
    const sorted = entries.slice().sort((a, b) => a.slot - b.slot);
    const out = [];
    for (const e of sorted) {
      const last = out[out.length - 1];
      if (last && last.course === e.course && last.roomKey === e.roomKey && last.endSlot === e.slot - 1) {
        last.endSlot = e.slot; last.end = slots[e.slot][1];
      } else out.push(Object.assign({}, e, {
        startSlot: e.slot, endSlot: e.slot, start: slots[e.slot][0], end: slots[e.slot][1]
      }));
    }
    return out.map(b => Object.assign(b, {
      time: label12(b.start) + '–' + label12(b.end), start_hhmm: hhmm(b.start), end_hhmm: hhmm(b.end)
    }));
  }

  /** Shared "current / upcoming" decision. `blocksOf(day)` → that day's blocks sorted by start; `days` = working days. */
  function resolveFrom(blocksOf, days, now) {
    const today = blocksOf(now.day);
    const current = today.find(b => now.minutes >= b.start && now.minutes < b.end) || null;
    const after = today.filter(b => b.start > now.minutes && b !== current);
    let next = after[0] || null, nextDay = null;
    if (!current && !next) {                       // nothing left today → first class of the next working day
      const i0 = days.indexOf(now.day);
      for (let k = 1; k <= 7 && !next; k++) {
        const d = days[((i0 < 0 ? -1 : i0) + k) % days.length];
        const nb = blocksOf(d)[0];
        if (nb) { next = nb; nextDay = d; }
      }
    }
    return {
      state: current ? 'current' : next ? 'upcoming' : 'none',
      current, next, nextDay,
      later: current ? after : after.slice(1),
      today, day: now.day, date: now.date, minutes: now.minutes
    };
  }

  /**
   * Decide which class is current / upcoming (patent §5.4).
   * `entries`: [{day, slot, course, roomKey, ...}] for ONE section; `slots`: [[startMin,endMin],…].
   * Returns { state:'current'|'upcoming'|'none', current, next, later[], today[], day, date }.
   */
  function resolveNow(entries, slots, now) {
    return resolveFrom(d => toBlocks(entries.filter(e => e.day === d), slots), DAYS, now);
  }

  /* ───────── Personal (imported) timetable ───────── */
  const DAYS_ALL = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  /** Stored class → the block shape the dashboard / timetable pages already render. */
  function personalBlock(c) {
    return Object.assign({}, c, {
      course: c.course || c.course_code || '', course_name: c.course_name || c.course || '', faculty: c.faculty || '',
      isLab: !!(c.isLab || c.is_lab), roomKey: c.roomKey || c.room_key || null, room: c.room || '', building: c.building || '', floor: c.floor || '',
      start: c.start != null ? c.start : c.start_min, end: c.end != null ? c.end : c.end_min,
      time: label12(c.start != null ? c.start : c.start_min) + '–' + label12(c.end != null ? c.end : c.end_min),
      start_hhmm: hhmm(c.start != null ? c.start : c.start_min), end_hhmm: hhmm(c.end != null ? c.end : c.end_min)
    });
  }
  const personalByDay = classes => Object.fromEntries(DAYS_ALL.map(d =>
    [d, classes.filter(c => c.day === d).map(personalBlock).sort((a, b) => a.start - b.start)]));
  /** Same result shape as resolveNow, for a student's own timetable (arbitrary start/end minutes, Mon–Sat). */
  function resolvePersonal(classes, now) {
    const by = personalByDay(classes);
    return resolveFrom(d => by[d] || [], DAYS_ALL, now);
  }

  /* ───────── Room matching (timetable text → floor-plan room) ───────── */
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const SEP = '[\\s.\\-_/]*';
  /** Strip one leading building from free text → { b, rest } (b = building id or null). Tolerates "AB 2", "A.B-2", "ab2". */
  function splitBuilding(upper, buildingIds) {
    for (const b of buildingIds.slice().sort((x, y) => y.length - x.length)) {
      const m = new RegExp('(?:^|[^A-Z0-9])' + b.split('').map(reEsc).join(SEP) + SEP).exec(upper);
      if (m) return { b, rest: upper.slice(m.index + m[0].length).trim() };
    }
    return { b: null, rest: upper };
  }
  /**
   * Resolve text such as "AB2-127", "ab 2 / 127", "LHC 301", "Room 127" to a floor-plan room.
   * → { status:'exact'|'ambiguous'|'none', room?, candidates[] }
   *   exact     one room matched (safe to link)
   *   ambiguous several buildings have that number (e.g. "127") → the student must choose
   *   none      nothing matched → the student must correct it (candidates = closest suggestions)
   */
  function matchRoom(rooms, text) {
    let up = String(text == null ? '' : text).toUpperCase().replace(/\b(?:CLASS\s*ROOM|CLASSROOM|ROOM|RM|VENUE|R\.?\s?NO\.?)\b[\s.:\-]*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!up) return { status: 'none', candidates: [] };
    const bIds = Array.from(new Set(rooms.map(r => r.b)));
    const { b, rest } = splitBuilding(up, bIds);
    const tokenOf = s => (/^[A-Z0-9]{1,5}/.exec(s.replace(/[\s.\-_/]+/g, '')) || [''])[0];
    // OCR often confuses O/0 and I/1 inside room numbers: try the text as typed first, then a repaired variant
    const variants = t => Array.from(new Set([t, t.replace(/O/g, '0').replace(/[I|]/g, '1')])).filter(Boolean);
    const pool = b ? rooms.filter(r => r.b === b) : rooms;
    const flat = rest.replace(/[\s.\-_/]+/g, '');
    for (const v of variants(b ? tokenOf(rest) : flat)) {
      const hit = pool.filter(r => norm(r.id) === norm(v));
      if (hit.length === 1) return { status: 'exact', room: hit[0], candidates: hit };
      if (hit.length > 1) return { status: 'ambiguous', candidates: hit };
    }
    const sug = searchRooms(pool, flat || rest, 6).results;
    return { status: 'none', candidates: sug.length ? sug : (b ? pool.slice(0, 0) : []) };
  }

  return { THRESHOLDS, COLORS, DAYS, percent, statusFor, canSkip, needToAttend, summarize, ringSvg,
           norm, searchRooms, clock, toBlocks, resolveNow, hhmm, label12,
           DAYS_ALL, personalBlock, personalByDay, resolvePersonal, matchRoom };
});
