/* MapifyMUJ timetable importer — turns OCR / PDF word boxes into timetable classes.
 * Pure logic (no DOM, no network) so it runs in the browser and in the Node tests.
 *
 *   MapifyImport.parse(words, { buildings:['AB1','AB2',…] }) → { method:'grid'|'list'|'none', classes[], warnings[] }
 *
 *   words   : [{ t:'DSE2201', x0, y0, x1, y1 }]  boxes in image/page pixels (y grows downward)
 *   classes : [{ day:'MON', start:540, end:590, course:'DSE2201', course_name, faculty, roomText:'AB2-127',
 *                isLab, flags:['no_room', …] }]
 *
 * OCR is never perfect: everything returned here is a *suggestion* that the student confirms on the import page. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MapifyImport = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const DAY_WORD = { mon: 'MON', monday: 'MON', tue: 'TUE', tues: 'TUE', tuesday: 'TUE', wed: 'WED', weds: 'WED', wednesday: 'WED',
    thu: 'THU', thur: 'THU', thurs: 'THU', thursday: 'THU', fri: 'FRI', friday: 'FRI', sat: 'SAT', saturday: 'SAT' };
  const dayOf = s => DAY_WORD[String(s).toLowerCase().replace(/[^a-z]/g, '')] || null;

  /* ───────── times ───────── */
  const T = '(\\d{1,2})\\s*[:.]\\s*(\\d{2})\\s*([ap]\\.?\\s?m\\.?)?';
  const RANGE = new RegExp('^' + T + '\\s*(?:-|–|—|to|till|until|~)\\s*' + T + '$', 'i');
  const RANGE_ANY = new RegExp(T + '\\s*(?:-|–|—|to|till|until|~)\\s*' + T, 'i');
  const SINGLE = new RegExp('^' + T + '$', 'i');
  /** Minutes after midnight. Without am/pm, 1–7 o'clock is read as afternoon (timetables run roughly 8:00–18:00). */
  function toMin(h, m, ap) {
    h = +h; m = +m;
    if (m > 59 || h > 23) return null;
    ap = ap ? ap.toLowerCase().replace(/[^ap]/g, '') : '';
    if (ap === 'p' && h < 12) h += 12; else if (ap === 'a' && h === 12) h = 0; else if (!ap && h >= 1 && h <= 7) h += 12;
    return h * 60 + m;
  }
  function rangeFrom(m) {
    const a = toMin(m[1], m[2], m[3]); let b = toMin(m[4], m[5], m[6]);
    if (a == null || b == null) return null;
    if (b <= a && b + 720 > a && b + 720 < 1440) b += 720;           // "11:30 - 12:20" is fine; "12:20 - 1:10" → 13:10
    return b > a && b - a <= 360 ? [a, b] : null;
  }

  /* ───────── geometry helpers ───────── */
  const cx = w => (w.x0 + w.x1) / 2, cy = w => (w.y0 + w.y1) / 2, wh = w => w.y1 - w.y0;
  const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const AX = { x: { c: cx, lo: w => w.x0, hi: w => w.x1 }, y: { c: cy, lo: w => w.y0, hi: w => w.y1 } };
  const other = a => (a === 'x' ? 'y' : 'x');

  /** Group word boxes into reading-order lines. */
  function toLines(words) {
    const H = median(words.map(wh)) || 12, ws = words.slice().sort((a, b) => cy(a) - cy(b));
    const lines = [];
    for (const w of ws) {
      const L = lines[lines.length - 1];
      if (L && Math.abs(cy(w) - L.cy) < 0.6 * Math.max(H, wh(w))) { L.words.push(w); L.cy = (L.cy * (L.words.length - 1) + cy(w)) / L.words.length; }
      else lines.push({ words: [w], cy: cy(w) });
    }
    return lines.map(L => { L.words.sort((a, b) => a.x0 - b.x0); L.text = L.words.map(w => w.t).join(' '); return L; });
  }

  /** Time ranges ("9:00 - 9:50", "9:00 AM – 9:50 AM", even when split over several words or stacked on two lines). */
  function findTimeRanges(words) {
    const out = [], used = new Set(), H = median(words.map(wh)) || 12;
    for (const L of toLines(words)) {
      for (let i = 0; i < L.words.length;) {
        let hit = null;
        for (let n = Math.min(7, L.words.length - i); n >= 1 && !hit; n--) {
          const m = RANGE.exec(L.words.slice(i, i + n).map(w => w.t).join(' ').trim());
          const r = m && rangeFrom(m);
          if (r) hit = { n, r };
        }
        if (hit) {
          const part = L.words.slice(i, i + hit.n);
          out.push({ start: hit.r[0], end: hit.r[1], x0: Math.min(...part.map(w => w.x0)), x1: Math.max(...part.map(w => w.x1)), y0: Math.min(...part.map(w => w.y0)), y1: Math.max(...part.map(w => w.y1)), t: part.map(w => w.t).join(' ') });
          part.forEach(w => used.add(w)); i += hit.n;
        } else i++;
      }
    }
    // stacked headers: "9:00" over "9:50"
    const singles = words.filter(w => !used.has(w) && SINGLE.test(w.t.trim())).map(w => { const m = SINGLE.exec(w.t.trim()); return { w, min: toMin(m[1], m[2], m[3]) }; }).filter(s => s.min != null);
    const taken = new Set();
    for (const a of singles) {
      if (taken.has(a.w)) continue;
      const b = singles.find(s => s !== a && !taken.has(s.w) && s.min > a.min && s.min - a.min <= 360 && Math.abs(cx(s.w) - cx(a.w)) < 0.6 * Math.max(a.w.x1 - a.w.x0, s.w.x1 - s.w.x0) && cy(s.w) > cy(a.w) && cy(s.w) - cy(a.w) < 3 * H);
      if (b) { taken.add(a.w); taken.add(b.w); out.push({ start: a.min, end: b.min, x0: Math.min(a.w.x0, b.w.x0), x1: Math.max(a.w.x1, b.w.x1), y0: a.w.y0, y1: b.w.y1, t: a.w.t + ' ' + b.w.t }); }
    }
    return out;
  }

  /* ───────── cell text → fields ───────── */
  const SEP = '[\\s.\\-_/]*';
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function roomRegexes(buildings) {
    return (buildings || []).slice().sort((a, b) => b.length - a.length).map(b => ({
      b, re: new RegExp('(?<![A-Z0-9])' + b.split('').map(reEsc).join(SEP) + SEP + '((?:LG|G|FB)?[0-9OIl|]{1,3}[A-D]?)(?![A-Z0-9])', 'g')
    }));
  }
  const NOISE = /\b(?:venue|room|rm|class\s?room|faculty|teacher|sec(?:tion)?|batch|group|slot)\b\s*[:\-]?/gi;

  function extractFields(textLines, opts) {
    let lines = textLines.map(s => s.replace(/[|¦]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const flags = [];
    let roomText = '';
    // 1) room — "AB2-127", "AB 2 / 127", "LHC 216" (building prefix), else "Room 127"
    for (let i = 0; i < lines.length && !roomText; i++) {
      const up = lines[i].toUpperCase();
      for (const { b, re } of roomRegexes(opts && opts.buildings)) {
        re.lastIndex = 0; const m = re.exec(up);
        if (m) { roomText = b + '-' + m[1].replace(/O/g, '0').replace(/[Il|]/g, '1'); lines[i] = (lines[i].slice(0, m.index) + ' ' + lines[i].slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim(); break; }
      }
    }
    if (!roomText) {
      for (let i = 0; i < lines.length && !roomText; i++) {
        const m = /(?:^|\b)(?:room|rm|venue|class\s?room)\s*(?:no\.?)?\s*[:.\-]?\s*([A-Za-z0-9][A-Za-z0-9\-/ ]{0,9}?)(?=\s{2,}|\s*[|,;]|\s+(?:dr|mr|mrs|ms|prof)\b|$)/i.exec(lines[i]);
        if (m) { roomText = m[1].trim(); lines[i] = lines[i].replace(m[0], ' ').replace(/\s+/g, ' ').trim(); }
      }
    }
    if (!roomText) {                                                     // two code-like lines → the last one is the room ("DSE2270" + "XYZ 404")
      const like = lines.map((l, i) => [l, i]).filter(([l]) => /^[A-Za-z]{2,5}[\s-]?\d{2,4}[A-Za-z]?$/.test(l));
      if (like.length >= 2) { const [l, i] = like[like.length - 1]; roomText = l; lines.splice(i, 1); }
    }
    if (!roomText) {                                                     // a line that is only a 3-digit room number
      const i = lines.findIndex(l => /^[A-Z]?\d{3}[A-D]?$/i.test(l));
      if (i >= 0) { roomText = lines[i]; lines.splice(i, 1); }
    }
    // 2) faculty
    let faculty = '';
    const fi = lines.findIndex(l => /^(?:dr|mr|mrs|ms|prof)\b\.?\s*\S/i.test(l));
    if (fi >= 0) { faculty = lines[fi].replace(/^(?:faculty\s*[:\-]\s*)/i, '').trim(); lines.splice(fi, 1); }
    else for (let i = 0; i < lines.length; i++) {                        // "… CODE Name  Dr. Someone" on one line
      const m = /\s((?:dr|mr|mrs|ms|prof)\b\.?\s+[A-Za-z.' ]{2,40})$/i.exec(lines[i]);
      if (m) { faculty = m[1].trim(); lines[i] = lines[i].slice(0, m.index).trim(); break; }
    }
    // 3) course code (letters + 3-4 digits: DSE2201, MAS 2001, CSE-2101)
    let course = '', rest = lines.join(' ');
    const cm = /(?<![A-Za-z0-9])([A-Za-z]{2,4})\s?-?\s?(\d{3,4}[A-Za-z]?)(?![A-Za-z0-9])/.exec(rest);
    if (cm && /^[A-Z]{2,4}$/i.test(cm[1])) { course = (cm[1] + cm[2]).toUpperCase(); rest = (rest.slice(0, cm.index) + ' ' + rest.slice(cm.index + cm[0].length)); }
    // 4) name = what is left
    let name = rest.replace(NOISE, ' ').replace(/^[\s\-–:,;()]+|[\s\-–:,;()]+$/g, '').replace(/\s+/g, ' ').trim();
    if (!roomText) {                                                     // single-line rows: "… Cloud Computing 127", "… PBL-2 XYZ 404"
      const m = /^(.{3,}?)\s((?:[A-Za-z]{2,5}[\s-]?)?\d{2,3}[A-D]?)$/.exec(name);
      if (m) { name = m[1].trim(); roomText = m[2].trim(); }
    }
    const isLab = /\blab(?:oratory)?\b|\bpractical\b|\(p\)/i.test(name + ' ' + lines.join(' '));
    if (!course && name.length < 3) return null;                          // noise
    if (!course) flags.push('no_code');
    if (!name) name = course;
    if (!roomText) flags.push('no_room');
    return { course, course_name: name, faculty, roomText, isLab, flags };
  }

  /* ───────── grid layout (days × periods, either way round) ───────── */
  const alignedSet = (items, axis, tol) => {                              // largest group lying on one line across `axis`
    let best = [];
    for (const a of items) { const g = items.filter(b => Math.abs(AX[axis].c(b) - AX[axis].c(a)) <= tol); if (g.length > best.length) best = g; }
    return best;
  };
  const bandsOf = (items, ax) => {                                        // [lo,hi] band per item, sorted along the axis
    const A = AX[ax], s = items.slice().sort((a, b) => A.c(a) - A.c(b)), c = s.map(A.c);
    return s.map((it, i) => {
      const lo = i ? (c[i - 1] + c[i]) / 2 : c[i] - (c[1] - c[0]) / 2, hi = i < s.length - 1 ? (c[i] + c[i + 1]) / 2 : c[i] + (c[i] - c[i - 1]) / 2;
      return Object.assign({}, it, { lo, hi });
    });
  };

  function parseGrid(words, opts) {
    const H = median(words.map(wh)) || 12;
    const ranges = findTimeRanges(words);
    const days = words.map(w => ({ w, day: dayOf(w.t) })).filter(d => d.day);
    if (ranges.length < 2 || days.length < 2) return null;
    // times run across a header row (timeAxis 'x') or down a header column ('y'); days are the other way
    const rowHdr = alignedSet(ranges, 'y', 1.2 * H), colHdr = alignedSet(ranges, 'x', 0.6 * Math.max(...ranges.map(r => r.x1 - r.x0)));
    const timeAxis = rowHdr.length >= colHdr.length ? 'x' : 'y', hdr = timeAxis === 'x' ? rowHdr : colHdr;
    const dayAxis = other(timeAxis);
    const dayItems = alignedSet(days.map(d => Object.assign({}, d.w, { day: d.day })), timeAxis, timeAxis === 'x' ? 0.8 * Math.max(...days.map(d => d.w.x1 - d.w.x0)) : 1.2 * H)
      .filter((d, i, a) => a.findIndex(e => e.day === d.day) === i);
    if (hdr.length < 2 || dayItems.length < 2) return null;

    const tb = bandsOf(hdr, timeAxis), db = bandsOf(dayItems, dayAxis);
    const hdrEdge = timeAxis === 'x' ? Math.max(...hdr.map(h => h.y1)) : Math.max(...hdr.map(h => h.x1));        // cells start after the header…
    const lblEdge = timeAxis === 'x' ? Math.max(...dayItems.map(d => d.x1)) : Math.max(...dayItems.map(d => d.y1)); // …and after the day labels
    const dLo = Math.max(db[0].lo, hdrEdge) , dHi = db[db.length - 1].hi, tLo = Math.max(tb[0].lo, lblEdge), tHi = tb[tb.length - 1].hi;
    const dAx = AX[dayAxis], tAx = AX[timeAxis];
    const skip = new Set(); ranges.forEach(() => 0);
    const isHdr = w => hdr.some(h => w.x0 >= h.x0 - 1 && w.x1 <= h.x1 + 1 && w.y0 >= h.y0 - 1 && w.y1 <= h.y1 + 1) || dayItems.some(d => d.t === w.t && d.x0 === w.x0 && d.y0 === w.y0);
    const body = words.filter(w => !isHdr(w) && dAx.c(w) >= dLo && dAx.c(w) <= dHi && tAx.c(w) >= tLo && tAx.c(w) <= tHi);

    const classes = [];
    for (const band of db) {
      const inRow = body.filter(w => dAx.c(w) >= band.lo && dAx.c(w) < band.hi + 1e-6);
      // cluster words of this day into cell blocks: same line & close, or stacked lines that overlap horizontally
      const par = inRow.map((_, i) => i), find = i => (par[i] === i ? i : (par[i] = find(par[i])));
      const gx = 0.6 * H, gy = 1.25 * H;
      for (let i = 0; i < inRow.length; i++) for (let j = i + 1; j < inRow.length; j++) {
        const a = inRow[i], b = inRow[j];
        const vOv = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0), hGap = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1);
        const hOv = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), vGap = Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1);
        const sameLine = vOv > 0.3 * Math.min(wh(a), wh(b)) && hGap <= gx;
        const stacked = hOv > 0 && vGap <= gy && vOv <= 0.3 * Math.min(wh(a), wh(b));
        if (sameLine || stacked) par[find(i)] = find(j);
      }
      const groups = {}; inRow.forEach((w, i) => (groups[find(i)] = groups[find(i)] || []).push(w));
      for (const g of Object.values(groups)) {
        const lo = Math.min(...g.map(tAx.lo)), hi = Math.max(...g.map(tAx.hi)), mid = (lo + hi) / 2;
        let cols = tb.map((c, i) => [i, Math.max(0, Math.min(hi, c.hi) - Math.max(lo, c.lo)) / (c.hi - c.lo)]).filter(([, f]) => f >= 0.5).map(([i]) => i);
        let guessed = false;
        if (!cols.length) {
          const avgW = median(tb.map(c => c.hi - c.lo));
          let k = tb.findIndex(c => mid >= c.lo && mid < c.hi); if (k < 0) k = mid < tb[0].lo ? 0 : tb.length - 1;
          const nearRight = k < tb.length - 1 && tb[k].hi - mid <= 0.12 * avgW, nearLeft = k > 0 && mid - tb[k].lo <= 0.12 * avgW;
          if (nearRight) { cols = [k, k + 1]; guessed = true; } else if (nearLeft) { cols = [k - 1, k]; guessed = true; } else cols = [k];
        }
        const first = Math.min(...cols), last = Math.max(...cols);
        const textLines = toLines(g).map(l => l.text);
        const f = extractFields(textLines, opts);
        if (!f) continue;
        if (guessed) f.flags.push('span_guess');
        classes.push(Object.assign({ day: band.day, start: tb[first].start, end: tb[last].end }, f));
      }
    }
    return { classes, layout: timeAxis === 'x' ? 'days down the side, periods across the top' : 'days across the top, periods down the side' };
  }

  /* ───────── list layout (text PDFs, app screenshots: "Monday", "9:00 - 9:50  DSE2201 …") ───────── */
  function parseListLines(lineTexts, opts) {
    const classes = []; let day = null, cur = null;
    const finish = c => {
      const f = extractFields(c.lines, opts); if (!f) return;
      if (!c.day) f.flags.push('no_day');
      classes.push(Object.assign({ day: c.day || '', start: c.start, end: c.end }, f));
    };
    for (let raw of lineTexts) {
      let line = raw.replace(/\s+/g, ' ').trim(); if (!line) continue;
      const dm = /^(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:s|nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\b\.?\s*[:\-–]?\s*/i.exec(line);
      if (dm && (dm[0].length === line.length || RANGE_ANY.test(line))) { if (cur) { finish(cur); cur = null; } day = dayOf(dm[1]); line = line.slice(dm[0].length).trim(); if (!line) continue; }
      const tm = RANGE_ANY.exec(line), r = tm && rangeFrom(tm);
      if (r) {
        if (cur) finish(cur);
        cur = { day, start: r[0], end: r[1], lines: [] };
        const remainder = (line.slice(0, tm.index) + '  ' + line.slice(tm.index + tm[0].length)).trim();
        if (remainder) cur.lines.push(remainder);
      } else if (cur) cur.lines.push(line);
    }
    if (cur) finish(cur);
    return { classes };
  }

  /* ───────── public ───────── */
  function tidy(classes) {
    const seen = new Set(), out = [];
    for (const c of classes) {
      const k = [c.day, c.start, c.end, c.course || c.course_name].join('|');
      if (!seen.has(k)) { seen.add(k); out.push(c); }
    }
    return out.sort((a, b) => (DAY_ORDER.indexOf(a.day) + 1 || 9) - (DAY_ORDER.indexOf(b.day) + 1 || 9) || a.start - b.start);
  }
  /** words → classes. Tries a grid first (most timetables are one), then falls back to a day/time list. */
  function parse(words, opts) {
    opts = opts || {};
    const ws = (words || []).filter(w => w && String(w.t).trim() && w.x1 > w.x0 && w.y1 > w.y0).map(w => Object.assign({}, w, { t: String(w.t).trim() }));
    const warnings = [];
    if (!ws.length) return { method: 'none', classes: [], warnings: ['No text could be read from the file.'] };
    const g = parseGrid(ws, opts);
    if (g && g.classes.length) return { method: 'grid', layout: g.layout, classes: tidy(g.classes), warnings };
    const l = parseListLines(toLines(ws).map(L => L.text), opts);
    if (l.classes.length) return { method: 'list', classes: tidy(l.classes), warnings };
    return { method: 'none', classes: [], warnings: ['The text was read, but no days and times could be recognised — add your classes manually below.'] };
  }
  /** Plain text (e.g. pasted) → classes, list layout only. */
  const parseText = (text, opts) => { const r = parseListLines(String(text || '').split(/\r?\n/), opts || {}); return { method: r.classes.length ? 'list' : 'none', classes: tidy(r.classes), warnings: [] }; };

  return { parse, parseText, findTimeRanges, extractFields, dayOf, toMin, DAY_ORDER };
});
