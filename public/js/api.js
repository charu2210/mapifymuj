/* MapifyMUJ client API.
 * LIVE mode  → talks to the Node backend (/api/…).
 * STATIC mode → if no backend answers (e.g. the folder is hosted on GitHub Pages), the same calls are served from
 *               data/static.json (a snapshot of the API) using the same MapifyCore logic, so the app still works. */
(function () {
  'use strict';
  const C = window.MapifyCore, TOKEN = 'mapify.token', USER = 'mapify.user';
  const BASE = (window.MAPIFY_API_BASE || '') + '/api';
  let mode = null, staticData = null;
  const q = new URLSearchParams(location.search);

  const ls = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } },
               set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} },
               del: k => { try { localStorage.removeItem(k); } catch (_) {} } };

  async function detect() {
    if (mode) return mode;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 2500);
      const r = await fetch(BASE + '/health', { signal: ctl.signal }); clearTimeout(t);
      mode = r.ok && (r.headers.get('content-type') || '').includes('json') ? 'live' : 'static';
    } catch (_) { mode = 'static'; }
    return mode;
  }
  function st() {   // cached promise: concurrent callers share one download
    if (!staticData) staticData = fetch('data/static.json').then(r => { if (!r.ok) throw new Error('data/static.json missing — run "npm run build:static"'); return r.json(); });
    return staticData;
  }
  async function http(path, { method = 'GET', body } = {}) {
    const headers = { Accept: 'application/json' }, tk = ls.get(TOKEN);
    if (body) headers['Content-Type'] = 'application/json';
    if (tk) headers.Authorization = 'Bearer ' + tk;
    const r = await fetch(BASE + path, { method, headers, body: body && JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'Request failed (' + r.status + ')'); e.status = r.status; e.details = j.details; throw e; }
    return j;
  }
  const live = async () => (await detect()) === 'live';
  const atParam = () => q.get('at');            // ?at=2026-10-22T10:45:00+05:30 → simulate a moment (demo)

  const Api = {
    get mode() { return mode; }, detect,
    token: () => ls.get(TOKEN),
    user: () => { try { return JSON.parse(ls.get(USER) || 'null'); } catch (_) { return null; } },
    setSession(res) { ls.set(TOKEN, res.token); ls.set(USER, JSON.stringify(res.user)); },
    logout() { ls.del(TOKEN); ls.del(USER); },
    async refreshUser() {
      if (!Api.token() || !(await live())) return Api.user();
      try { const { user } = await http('/auth/me'); ls.set(USER, JSON.stringify(user)); return user; }
      catch (e) { if (e.status === 401) Api.logout(); return null; }
    },
    async login(email, password) { if (!(await live())) throw new Error('Sign-in needs the MapifyMUJ server (not available in static mode).'); const r = await http('/auth/login', { method: 'POST', body: { email, password } }); Api.setSession(r); return r.user; },
    async register(b) { if (!(await live())) throw new Error('Registration needs the MapifyMUJ server.'); const r = await http('/auth/register', { method: 'POST', body: b }); Api.setSession(r); return r.user; },
    http: async (p, o) => { if (!(await live())) throw new Error('This feature needs the MapifyMUJ server.'); return http(p, o); },

    async campus() { return (await live()) ? http('/campus') : (await st()).campus; },
    async rooms(b, f) { const d = await Api.campus(); return d.rooms.filter(r => r.b === b && (!f || r.f === f)); },
    async search(text, limit = 30) {
      if (await live()) return http('/rooms/search?limit=' + limit + '&q=' + encodeURIComponent(text));
      const { total, results } = C.searchRooms((await st()).campus.rooms, text, limit);
      return { query: text, total, shown: results.length, results };
    },
    async room(key) {
      if (await live()) return http('/rooms/' + encodeURIComponent(key));
      const s = await st(), r = s.campus.rooms.find(x => x.k === key); if (!r) throw new Error('Room not found');
      const b = s.campus.buildings.find(x => x.id === r.b), f = b.floors.find(x => x.id === r.f);
      return { ...r, building: b.name, floor: f.name, typeLabel: s.campus.types[r.t],
        classes: s.timetable.entries.filter(e => e.roomKey === key).map(e => ({ section: s.timetable.section, day: e.day, slot: e.slot, course: e.course, course_name: e.course_name, faculty: e.faculty })) };
    },
    async places(category) {
      if (await live()) return (await http('/places' + (category && category !== 'all' ? '?category=' + category : ''))).places;
      const p = (await st()).places; return category && category !== 'all' ? p.filter(x => x.category === category) : p;
    },
    async timetable(section) { return (await live()) ? http('/timetable' + (section ? '?section=' + encodeURIComponent(section) : '')) : (await st()).timetable; },
    async now(section) {
      if (await live()) {
        const qs = new URLSearchParams(); if (section) qs.set('section', section); if (atParam()) qs.set('at', atParam());
        return http('/timetable/now?' + qs);
      }
      const s = await st(), at = atParam() ? new Date(atParam()) : new Date();
      return { section: s.timetable.section, ...C.resolveNow(s.timetable.entries, s.slotMinutes, C.clock(at, 'Asia/Kolkata')) };
    },
    /** → { demo:boolean, overall, courses[] }. Signed-out / static visitors get the sample dataset, flagged demo:true. */
    async attendance() {
      if ((await live()) && Api.token()) { try { return { demo: false, ...(await http('/attendance')) }; } catch (e) { if (e.status !== 401) throw e; Api.logout(); } }
      return { demo: true, ...(await st()).demoAttendance };
    },
    async route(from, to) {
      if (await live()) return http('/route?from=' + from.join(',') + '&to=' + to.join(','));
      const R = 6371000, t = x => x * Math.PI / 180, h = Math.sin(t(to[0] - from[0]) / 2) ** 2 + Math.cos(t(from[0])) * Math.cos(t(to[0])) * Math.sin(t(to[1] - from[1]) / 2) ** 2;
      const d = 2 * R * Math.asin(Math.sqrt(h)); return { real: false, distance: Math.round(d), duration: Math.round(d / 1.3), coordinates: [from, to] };
    }
  };

  /* ───────── My timetable (imported from a screenshot / PDF) ─────────
   * Signed in on the server → saved to the student's profile (GET/PUT/PATCH /api/me/timetable).
   * Otherwise (offline demo, or not signed in) → kept on this device in localStorage, clearly labelled as such. */
  const MY = 'mapify.myTT';
  const localTT = () => { try { const j = JSON.parse(ls.get(MY) || 'null'); return j && Array.isArray(j.classes) ? j : null; } catch (_) { return null; } };
  const saveLocal = j => ls.set(MY, JSON.stringify(j));
  async function enrich(c, campus) {                      // add building / floor / room details for classes kept on the device
    const r = c.roomKey && campus.rooms.find(x => x.k === c.roomKey), b = r && campus.buildings.find(x => x.id === r.b), f = b && b.floors.find(x => x.id === r.f);
    return Object.assign({}, c, { room: r ? r.id : '', building: r ? r.b : '', floor: r ? r.f : '', roomName: r ? r.name : '', buildingName: b ? b.name : '', floorName: f ? f.name : '', needsRoom: !r });
  }
  const norm = c => ({ day: c.day, start: c.start, end: c.end, course: c.course || '', course_name: c.course_name || '', faculty: c.faculty || '', isLab: !!c.isLab, roomText: c.roomText || '', roomKey: c.roomKey || null });
  Object.assign(Api, {
    /** → { source:'server'|'device'|null, updatedAt, classes[] } — the student's own timetable (empty classes = none yet). */
    async myTimetable() {
      if ((await live()) && Api.token()) {
        try { const j = await http('/me/timetable'); if (j.classes.length) return { ...j, source: 'server' }; }
        catch (e) { if (e.status === 401) Api.logout(); else throw e; }
      }
      const l = localTT(); if (!l) return { source: null, updatedAt: null, classes: [] };
      const campus = await Api.campus();
      return { source: 'device', updatedAt: l.updatedAt, classes: await Promise.all(l.classes.map(c => enrich(c, campus))) };
    },
    /** Replace the timetable with the rows the student confirmed. */
    async saveMyTimetable(classes, { source = 'import' } = {}) {
      if ((await live()) && Api.token()) { await http('/me/timetable', { method: 'PUT', body: { classes: classes.map(norm), source } }); ls.del(MY); return Api.myTimetable(); }
      const campus = await Api.campus();
      saveLocal({ updatedAt: new Date().toISOString(), classes: classes.map((c, i) => {
        const x = norm(c), m = !x.roomKey && x.roomText ? C.matchRoom(campus.rooms, x.roomText) : null;
        if (m && m.status === 'exact') x.roomKey = m.room.k;
        const r = x.roomKey && campus.rooms.find(q => q.k === x.roomKey); if (r) x.roomText = r.b + '-' + r.id;
        return Object.assign(x, { id: 'L' + (i + 1) });
      }) });
      return Api.myTimetable();
    },
    /** Fix one class's room. Throws an Error (status 422, .details = { status:'ambiguous'|'none', candidates[] }) if it can't be matched. */
    async fixMyRoom(id, { roomText, roomKey }) {
      if (!String(id).startsWith('L')) { await http('/me/timetable/' + encodeURIComponent(id), { method: 'PATCH', body: roomKey ? { roomKey } : { roomText } }); return Api.myTimetable(); }
      const l = localTT(), c = l && l.classes.find(x => x.id === id); if (!c) throw new Error('Class not found');
      const campus = await Api.campus(); let room = roomKey && campus.rooms.find(x => x.k === roomKey);
      if (!room) {
        const m = C.matchRoom(campus.rooms, roomText || '');
        if (m.status !== 'exact') { const e = new Error(m.status === 'ambiguous' ? '“' + roomText + '” exists in more than one building — choose one' : 'Couldn’t find “' + roomText + '” on any floor plan'); e.status = 422; e.details = { status: m.status, candidates: m.candidates.slice(0, 8) }; throw e; }
        room = m.room;
      }
      c.roomKey = room.k; c.roomText = room.b + '-' + room.id; saveLocal(l); return Api.myTimetable();
    },
    async clearMyTimetable() { if ((await live()) && Api.token()) await http('/me/timetable', { method: 'DELETE' }); ls.del(MY); },
    /** Timetable saved on this device before signing in → move it to the profile. */
    deviceTimetable: () => localTT(),
    async moveDeviceTimetableToProfile() { const l = localTT(); if (!l) return null; const r = await Api.saveMyTimetable(l.classes, { source: 'import' }); return r; }
  });
  window.Api = Api;
})();
