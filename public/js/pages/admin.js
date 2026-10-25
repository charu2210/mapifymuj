(async () => {
  const $ = s => document.querySelector(s), { esc } = Shell, C = MapifyCore, H = Api.http;
  await Api.detect(); Shell.mountNav('account');
  if (Api.mode !== 'live') { $('#panel').innerHTML = '<p>The console needs the MapifyMUJ server (<code>npm start</code>).</p>'; return; }
  const me = await Api.refreshUser();
  if (!me) { location.href = 'login.html?next=admin.html'; return; }
  if (me.role === 'student') { $('#panel').innerHTML = '<p>This console is for faculty and administrators.</p>'; return; }
  $('#who').textContent = me.name + ' · ' + me.role;
  const admin = me.role === 'admin', fail = e => Shell.toast(e.message, true);
  const TABS = [['att', 'Mark attendance', 1], ['rooms', 'Rooms', admin], ['tt', 'Timetable', admin], ['pins', 'Campus pins', admin], ['users', 'Users', admin]].filter(t => t[2]);
  const TYPES = { r: 'Room', l: 'Lab', f: 'Food & café', a: 'Hall', u: 'Utility', e: 'Entrance' };
  let tab = location.hash.slice(1) || 'att', campus, sections, slots;
  const draw = () => { $('#tabs').innerHTML = TABS.map(([k, l]) => '<button class="seg ' + (k === tab ? 'on' : '') + '" data-t="' + k + '">' + l + '</button>').join(''); (VIEWS[tab] || VIEWS.att)(); };
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; location.hash = tab; draw(); } });
  [campus, sections, slots] = await Promise.all([Api.campus(), H('/sections').then(r => r.sections), H('/slots').then(r => r.slots)]);
  const opts = (arr, sel, f) => arr.map(x => '<option value="' + esc(f(x)[0]) + '" ' + (f(x)[0] == sel ? 'selected' : '') + '>' + esc(f(x)[1]) + '</option>').join('');

  const VIEWS = {
    /* ── faculty + admin: mark attendance for one class ── */
    async att() {
      const p = $('#panel'), now = await Api.now(); let tt;
      p.innerHTML = '<div class="two"><div class="field"><label for="sc">Section</label><select id="sc">' + opts(sections, sections[0] && sections[0].code, s => [s.code, s.name]) + '</select></div>' +
        '<div class="field"><label for="co">Course</label><select id="co"></select></div><div class="field"><label for="dt">Date</label><input id="dt" type="date" value="' + now.date + '"/></div>' +
        '<div class="field"><label for="sl">Period</label><select id="sl">' + opts(slots, 0, s => [s.idx, (s.idx + 1) + ' · ' + C.label12(s.start_min) + '–' + C.label12(s.end_min)]) + '</select></div></div>' +
        '<div class="row" style="margin:12px 0"><button class="btn" id="ld">Load students</button><button class="btn" id="allp">All present</button><button class="btn" id="alla">All absent</button></div><div id="stu"></div><button class="btn primary" id="sv" hidden style="margin-top:12px">Save attendance</button>';
      const loadCourses = async () => { tt = await Api.timetable($('#sc').value); const seen = {}; tt.entries.forEach(e => seen[e.course] = e.course_name); $('#co').innerHTML = Object.entries(seen).map(([c, n]) => '<option value="' + esc(c) + '">' + esc(c + ' · ' + n) + '</option>').join(''); };
      await loadCourses(); $('#sc').onchange = loadCourses;
      let students = [], mark = {};
      const list = () => { $('#stu').innerHTML = students.map(s => '<div class="stu"><span><b>' + esc(s.name) + '</b> <span class="sub">' + esc(s.reg_no || s.email) + '</span></span><button class="btn tg ' + (mark[s.id] ? 'p' : 'a') + '" data-id="' + s.id + '" aria-pressed="' + !!mark[s.id] + '">' + (mark[s.id] ? 'Present' : 'Absent') + '</button></div>').join('') || '<p class="sub">No students in this section yet.</p>'; $('#sv').hidden = !students.length; };
      $('#ld').onclick = async () => { try { students = (await H('/section/' + encodeURIComponent($('#sc').value) + '/students')).students; mark = Object.fromEntries(students.map(s => [s.id, true])); list(); } catch (e) { fail(e); } };
      $('#allp').onclick = () => { students.forEach(s => mark[s.id] = true); list(); }; $('#alla').onclick = () => { students.forEach(s => mark[s.id] = false); list(); };
      $('#stu').onclick = e => { const b = e.target.closest('[data-id]'); if (b) { mark[b.dataset.id] = !mark[b.dataset.id]; list(); } };
      $('#sv').onclick = async () => { try { const r = await H('/attendance/mark', { method: 'POST', body: { course: $('#co').value, date: $('#dt').value, slot: +$('#sl').value, records: students.map(s => ({ userId: s.id, present: !!mark[s.id] })) } }); Shell.toast('Saved attendance for ' + r.marked + ' students'); } catch (e) { fail(e); } };
    },
    /* ── rooms: name the 190 unnamed rooms ── */
    rooms() {
      $('#panel').innerHTML = '<div class="field"><label for="rq">Find a room (number or name)</label><input id="rq" type="search" placeholder="e.g. AB2-102"/></div><div class="sub" style="margin:8px 0" id="rc"></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Room</th><th>Building · floor</th><th>Name</th><th>Type</th><th></th></tr></thead><tbody id="rb"></tbody></table></div>';
      const show = () => {
        const q = $('#rq').value, { total, results } = q.trim() ? C.searchRooms(campus.rooms, q, 40) : { total: campus.rooms.filter(r => !r.name).length, results: campus.rooms.filter(r => !r.name).slice(0, 40) };
        $('#rc').textContent = q.trim() ? total + ' match' + (total === 1 ? '' : 'es') : total + ' rooms have no name yet (showing the first 40)';
        $('#rb').innerHTML = results.map(r => { const b = campus.buildings.find(x => x.id === r.b); return '<tr data-k="' + esc(r.k) + '"><td><b>' + esc(r.id) + '</b></td><td>' + esc(b.name) + ' · ' + esc(b.floors.find(f => f.id === r.f).name) + '</td><td><input class="nm" value="' + esc(r.name) + '" maxlength="100"/></td><td><select class="ty">' + Object.entries(TYPES).map(([k, v]) => '<option value="' + k + '" ' + (k === r.t ? 'selected' : '') + '>' + v + '</option>').join('') + '</select></td><td><button class="btn sv">Save</button></td></tr>'; }).join('');
      };
      $('#rq').oninput = show; show();
      $('#rb').onclick = async e => { const b = e.target.closest('.sv'); if (!b) return; const tr = b.closest('tr'), k = tr.dataset.k;
        try { const r = await H('/admin/rooms/' + encodeURIComponent(k), { method: 'PATCH', body: { name: tr.querySelector('.nm').value, type: tr.querySelector('.ty').value } }); Object.assign(campus.rooms.find(x => x.k === k), { name: r.name, t: r.t }); Shell.toast('Saved ' + k); } catch (er) { fail(er); } };
    },
    /* ── timetable editor ── */
    async tt() {
      const p = $('#panel'), courses = (await H('/admin/courses')).courses;
      p.innerHTML = '<div class="two"><div class="field"><label for="sc">Section</label><select id="sc">' + opts(sections, sections[0] && sections[0].code, s => [s.code, s.name]) + '</select></div></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Day</th><th>Period</th><th>Course</th><th>Room key</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>' +
        '<datalist id="rk">' + campus.rooms.map(r => '<option value="' + esc(r.k) + '">').join('') + '</datalist><div class="lab" style="margin-top:14px">Add / replace a period</div><div class="row"><select id="nd">' + C.DAYS.map(d => '<option>' + d + '</option>').join('') + '</select><select id="ns">' + opts(slots, 0, s => [s.idx, 'Period ' + (s.idx + 1)]) + '</select><select id="nc">' + opts(courses, '', c => [c.code, c.code + ' · ' + c.name]) + '</select><input id="nr" list="rk" placeholder="AB2-127" style="min-height:44px;border:1.5px solid var(--line);border-radius:12px;padding:0 10px"/><button class="btn primary" id="add">Save period</button></div>';
      const load = async () => { const tt = await Api.timetable($('#sc').value); $('#tb').innerHTML = tt.entries.sort((a, b) => C.DAYS.indexOf(a.day) - C.DAYS.indexOf(b.day) || a.slot - b.slot).map(e => '<tr><td>' + e.day + '</td><td>' + (e.slot + 1) + '</td><td>' + esc(e.course + ' · ' + e.course_name) + '</td><td>' + esc(e.roomKey || '—') + '</td><td><button class="btn danger" data-del="' + e.id + '">Remove</button></td></tr>').join(''); };
      await load(); $('#sc').onchange = load;
      $('#add').onclick = async () => { try { await H('/admin/timetable', { method: 'PUT', body: { section: $('#sc').value, day: $('#nd').value, slot: +$('#ns').value, course: $('#nc').value, room: $('#nr').value || null } }); Shell.toast('Saved'); load(); } catch (e) { fail(e); } };
      $('#tb').onclick = async e => { const b = e.target.closest('[data-del]'); if (!b) return; try { await H('/admin/timetable/' + b.dataset.del, { method: 'DELETE' }); load(); } catch (er) { fail(er); } };
    },
    /* ── campus pins ── */
    async pins() {
      const p = $('#panel'); let places = await Api.places(), target = null, mk = null;
      p.innerHTML = '<p class="sub">Select a place, then click the map to set its position. Tick “verified” once you have checked the pin against the real campus.</p><div id="cmap" style="height:340px;margin:10px 0"></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Place</th><th>Lat</th><th>Lng</th><th>✔ verified</th><th></th></tr></thead><tbody id="pb"></tbody></table></div>';
      const map = typeof L !== 'undefined' ? L.map('cmap').setView([26.843, 75.5645], 17) : null; if (map) { L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map); }
      const rows = () => { $('#pb').innerHTML = places.map(x => '<tr data-id="' + esc(x.id) + '" class="' + (target === x.id ? 'sel' : '') + '"><td><button class="chip pick ' + (target === x.id ? 'on' : '') + '">' + esc(x.name) + '</button></td><td><input class="la" type="number" step="0.00001" value="' + (x.lat ?? '') + '"/></td><td><input class="ln" type="number" step="0.00001" value="' + (x.lng ?? '') + '"/></td><td><input class="vf" type="checkbox" ' + (x.verified ? 'checked' : '') + ' style="width:22px;height:22px"/></td><td><button class="btn sv">Save</button></td></tr>').join(''); };
      rows();
      if (map) map.on('click', e => { if (!target) return Shell.toast('Select a place first', true); const tr = document.querySelector('tr[data-id="' + CSS.escape(target) + '"]'); tr.querySelector('.la').value = e.latlng.lat.toFixed(5); tr.querySelector('.ln').value = e.latlng.lng.toFixed(5); if (mk) mk.remove(); mk = L.marker(e.latlng).addTo(map); });
      $('#pb').onclick = async e => { const tr = e.target.closest('tr'); if (!tr) return; const id = tr.dataset.id;
        if (e.target.closest('.pick')) { target = id; const x = places.find(y => y.id === id); rows(); if (map && x.lat != null) map.setView([x.lat, x.lng], 18); }
        if (e.target.closest('.sv')) try { await H('/admin/places/' + encodeURIComponent(id), { method: 'PATCH', body: { lat: +tr.querySelector('.la').value, lng: +tr.querySelector('.ln').value, verified: tr.querySelector('.vf').checked } }); Shell.toast('Saved'); places = await Api.places(); } catch (er) { fail(er); } };
    },
    /* ── users ── */
    async users() {
      const p = $('#panel'), load = async () => { const us = (await H('/admin/users')).users;
        $('#ub').innerHTML = us.map(u => '<tr><td>' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.section || '—') + '</td><td><select data-u="' + u.id + '">' + ['student', 'faculty', 'admin'].map(r => '<option ' + (r === u.role ? 'selected' : '') + '>' + r + '</option>').join('') + '</select></td></tr>').join(''); };
      p.innerHTML = '<div class="scroll-x"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Section</th><th>Role</th></tr></thead><tbody id="ub"></tbody></table></div><div class="lab" style="margin-top:16px">Create faculty / admin account</div><div class="row"><input id="un" placeholder="Name" style="min-height:44px;border:1.5px solid var(--line);border-radius:12px;padding:0 10px"/><input id="ue" type="email" placeholder="Email" style="min-height:44px;border:1.5px solid var(--line);border-radius:12px;padding:0 10px"/><input id="up" type="password" placeholder="Password (8+)" style="min-height:44px;border:1.5px solid var(--line);border-radius:12px;padding:0 10px"/><select id="ur"><option>faculty</option><option>admin</option></select><button class="btn primary" id="uc">Create</button></div>';
      await load();
      $('#ub').onchange = async e => { const s = e.target.closest('[data-u]'); if (!s) return; try { await H('/admin/users/' + s.dataset.u, { method: 'PATCH', body: { role: s.value } }); Shell.toast('Role updated'); } catch (er) { fail(er); load(); } };
      $('#uc').onclick = async () => { try { await H('/admin/users', { method: 'POST', body: { name: $('#un').value, email: $('#ue').value, password: $('#up').value, role: $('#ur').value } }); Shell.toast('Account created'); ['#un', '#ue', '#up'].forEach(s => $(s).value = ''); load(); } catch (e) { fail(e); } };
    }
  };
  addEventListener('hashchange', () => { tab = location.hash.slice(1) || 'att'; draw(); });
  draw();
})();
