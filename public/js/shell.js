/* Shared page chrome: navigation, helpers, toast. */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NAV = [['index.html', '🏠', 'Home', 'home'], ['timetable.html', '📅', 'Schedule', 'schedule'], ['map.html', '🗺️', 'Indoor', 'map'],
               ['campus.html', '📍', 'Campus', 'campus'], ['login.html', '👤', 'Account', 'account']];
  function mountNav(active) {
    const u = window.Api && Api.user && Api.user();
    const n = document.createElement('nav'); n.className = 'bnav'; n.setAttribute('aria-label', 'Main');
    n.innerHTML = '<a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">M</span><span><b>MapifyMUJ</b><small>Manipal University Jaipur</small></span></a>' +
      '<div class="nav-links">' + NAV.map(([h, i, l, k]) => `<a class="nb ${k === active ? 'on' : ''}" href="${h}" ${k === active ? 'aria-current="page"' : ''}><span class="ni" aria-hidden="true">${i}</span><span class="nl">${l}</span></a>`).join('') + '</div>' +
      '<a class="side-user" id="side-user" href="login.html"></a>';
    document.body.appendChild(n); document.body.classList.add('has-side'); updateUser(u);
  }
  function updateUser(u) {
    const el = document.getElementById('side-user'); if (!el) return;
    el.innerHTML = u ? '<span class="su-av">' + esc(u.name[0].toUpperCase()) + '</span><span><b>' + esc(u.name) + '</b><small>' + esc(u.role) + (u.section ? ' · ' + esc(u.section) : '') + '</small></span>'
                     : '<span class="su-av">?</span><span><b>Sign in</b><small>Attendance &amp; timetable</small></span>';
  }
  function toast(msg, bad) {
    const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
  }
  function modeBanner(target) {
    if (window.Api.mode === 'static') {
      const d = document.createElement('div'); d.className = 'banner';
      d.textContent = 'Offline demo mode — showing the bundled campus data. Start the MapifyMUJ server for sign-in, live timetable edits and attendance.';
      target.prepend(d);
    }
  }
  const bTypeIcon = { AB1: '🏢', AB2: '🏢', AIC: '💡', LHC: '🎓' };
  const bTint = { AB1: '#EEE8FF', AB2: '#FFF0E6', AIC: '#E0F7F6', LHC: '#EDE8FF' };
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good Morning ☀️' : h < 17 ? 'Good Afternoon 🌤' : 'Good Evening 🌙'; };
  const DAYN = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday' };

  /** <datalist id="rooms-dl"> with every floor-plan room ("AB2-127" → "First Floor · Name"), used by room inputs. */
  function roomDatalist(campus) {
    if (document.getElementById('rooms-dl')) return;
    const dl = document.createElement('datalist'); dl.id = 'rooms-dl';
    dl.innerHTML = campus.rooms.map(r => { const b = campus.buildings.find(x => x.id === r.b), f = b && b.floors.find(x => x.id === r.f);
      return '<option value="' + esc(r.b + '-' + r.id) + '">' + esc((f ? f.name : '') + (r.name ? ' · ' + r.name : '')) + '</option>'; }).join('');
    document.body.appendChild(dl);
  }
  /** Inline "this room couldn't be matched — correct it" editor for one imported class (cls.id, cls.roomText). */
  function roomFixer(host, cls, campus, onDone) {
    roomDatalist(campus);
    host.innerHTML = '<form class="fixer" novalidate><div class="fix-msg">⚠ ' + (cls.roomText ? 'We couldn’t match “' + esc(cls.roomText) + '” to a floor plan.' : 'No room is set for this class.') + ' Enter the correct room:</div>' +
      '<div class="fix-row"><input list="rooms-dl" aria-label="Room for ' + esc(cls.course_name) + '" placeholder="e.g. AB2-127" autocomplete="off"/><button class="btn primary" type="submit">Save room</button></div><div class="fix-res" role="alert"></div></form>';
    const f = host.firstChild, inp = f.querySelector('input'), res = f.querySelector('.fix-res');
    const apply = async arg => { res.textContent = ''; try { await Api.fixMyRoom(cls.id, arg); toast('Room saved'); if (onDone) onDone(); } catch (e) { show(e); } };
    function show(e) {
      res.textContent = e.message;
      const c = (e.details && e.details.candidates) || [];
      if (c.length) {
        const w = document.createElement('div'); w.className = 'fix-cands';
        w.innerHTML = c.map(r => '<button type="button" class="chip" data-k="' + esc(r.k) + '">' + esc(r.b + '-' + r.id) + (r.name ? ' · ' + esc(r.name) : '') + '</button>').join('');
        w.onclick = ev => { const b = ev.target.closest('[data-k]'); if (b) apply({ roomKey: b.dataset.k }); }; res.appendChild(w);
      }
    }
    f.addEventListener('submit', ev => { ev.preventDefault(); if (!inp.value.trim()) { res.textContent = 'Type a room, e.g. AB2-127'; return; } apply({ roomText: inp.value.trim() }); });
  }
  const DAYN6 = Object.assign({ SAT: 'Saturday' }, DAYN);
  window.Shell = { esc, mountNav, updateUser, toast, modeBanner, bTypeIcon, bTint, greeting, DAYN: DAYN6, roomDatalist, roomFixer };
})();
