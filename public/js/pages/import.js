(async () => {
  const $ = s => document.querySelector(s), { esc } = Shell, C = MapifyCore, I = MapifyImport;
  await Api.detect(); Shell.mountNav('schedule');
  const user = await Api.refreshUser();
  let D;
  try { D = await Api.campus(); } catch (e) { $('#s1err').textContent = 'Could not load campus data: ' + e.message; return; }
  Shell.roomDatalist(D);
  const R = Object.fromEntries(D.rooms.map(r => [r.k, r])), B = Object.fromEntries(D.buildings.map(b => [b.id, b]));
  const BUILDINGS = D.buildings.map(b => b.id), DAYS = C.DAYS_ALL;
  let rows = [], mode = 'import', uid = 0;

  const step = n => { document.querySelectorAll('#steps li').forEach(li => { const s = +li.dataset.s; li.className = s === n ? 'on' : s < n ? 'done' : ''; }); ['s1', 's2', 's3'].forEach((id, i) => $('#' + id).hidden = i + 1 !== n); scrollTo({ top: 0 }); };
  const tstr = m => (m == null ? '' : C.hhmm(m)), tmin = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
  const label = r => r ? (B[r.b] ? B[r.b].name : r.b) + ' · ' + (B[r.b].floors.find(f => f.id === r.f) || {}).name + ' · Room ' + r.id : '';

  /* ── rows ── */
  function toRow(c) {
    const row = { uid: ++uid, day: c.day || '', start: c.start, end: c.end, course: c.course || '', course_name: c.course_name || '', faculty: c.faculty || '', isLab: !!c.isLab, roomText: c.roomText || '', roomKey: c.roomKey || null, flags: c.flags || [] };
    if (!row.roomKey && row.roomText) { const m = C.matchRoom(D.rooms, row.roomText); if (m.status === 'exact') { row.roomKey = m.room.k; row.roomText = m.room.b + '-' + m.room.id; } }
    return row;
  }
  const bad = r => !DAYS.includes(r.day) || r.start == null || r.end == null || r.end <= r.start || !(r.course_name.trim() || r.course.trim());
  function overlaps(r) { return rows.filter(o => o !== r && o.day === r.day && !bad(o) && !bad(r) && o.start < r.end && r.start < o.end); }

  function roomStatus(r) {
    if (r.roomKey && R[r.roomKey]) return '<div class="rs ok">✓ ' + esc(label(R[r.roomKey])) + '</div>';
    if (!r.roomText.trim()) return '<div class="rs none">No room yet — you can add it now or later.</div>';
    const m = C.matchRoom(D.rooms, r.roomText), chips = m.candidates.slice(0, 6).map(c => '<button type="button" class="chip" data-pick="' + esc(c.k) + '">' + esc(c.b + '-' + c.id) + '</button>').join('');
    return '<div class="rs no">⚠ ' + (m.status === 'ambiguous' ? 'Several buildings have room ' + esc(r.roomText) + ' — pick yours:' : '“' + esc(r.roomText) + '” isn’t on any floor plan.' + (chips ? ' Did you mean:' : ' Check it, or keep it and fix it later.')) + chips + '</div>';
  }
  function rowHtml(r) {
    const ov = overlaps(r), problems = [];
    if (bad(r)) problems.push('Check the day, times and subject'); if (ov.length) problems.push('Overlaps with ' + esc(ov[0].course || ov[0].course_name));
    if (r.flags.includes('span_guess')) problems.push('Lab length is a guess — check the end time'); if (r.flags.includes('no_code')) problems.push('No course code found');
    return '<div class="crow ' + (bad(r) ? 'bad' : problems.length || (r.roomText && !r.roomKey) ? 'warn' : '') + '" data-u="' + r.uid + '"><div class="cf">' +
      '<div><label>Day</label><select data-f="day"><option value="">Choose…</option>' + DAYS.map(d => '<option value="' + d + '"' + (d === r.day ? ' selected' : '') + '>' + d + '</option>').join('') + '</select></div>' +
      '<div><label>Start</label><input type="time" data-f="start" value="' + tstr(r.start) + '"/></div><div><label>End</label><input type="time" data-f="end" value="' + tstr(r.end) + '"/></div>' +
      '<div><label>Course code</label><input data-f="course" value="' + esc(r.course) + '" maxlength="20" placeholder="DSE2201"/></div>' +
      '<div class="w2"><label>Subject</label><input data-f="course_name" value="' + esc(r.course_name) + '" maxlength="100"/></div>' +
      '<div class="w2"><label>Room (building-number)</label><input data-f="roomText" list="rooms-dl" value="' + esc(r.roomText) + '" maxlength="40" placeholder="AB2-127" autocomplete="off"/></div>' +
      '<div class="w3"><label>Faculty (optional)</label><input data-f="faculty" value="' + esc(r.faculty) + '" maxlength="100"/></div>' +
      '<div><label class="lab-chk"><input type="checkbox" data-f="isLab"' + (r.isLab ? ' checked' : '') + '/> Lab</label></div></div>' +
      '<div class="rstat">' + roomStatus(r) + '</div><div class="cbar"><div>' + problems.map(p => '<span class="flag">' + p + '</span> ').join('') + '</div><button class="btn del danger" type="button" data-del="1">Remove</button></div></div>';
  }
  function renderRows() {
    const order = [...DAYS, ''], by = d => rows.filter(r => r.day === d).sort((a, b) => (a.start ?? 9999) - (b.start ?? 9999));
    $('#rows').innerHTML = order.map(d => { const g = by(d); return g.length ? '<h3 class="dayh">' + (d ? esc(Shell.DAYN[d]) : 'Day needed') + '</h3>' + g.map(rowHtml).join('') : ''; }).join('') || '<div class="card sub">No classes yet — add one below.</div>';
    summary();
  }
  function summary() {
    const n = rows.length, invalid = rows.filter(bad).length, unm = rows.filter(r => !bad(r) && !r.roomKey).length;
    $('#sum').innerHTML = n + ' class' + (n === 1 ? '' : 'es') + (unm ? ' · <b>' + unm + '</b> without a matched room (you can fix these later from Home)' : n ? ' · all rooms matched ✓' : '');
    $('#s2err').textContent = invalid ? invalid + ' class' + (invalid > 1 ? 'es need' : ' needs') + ' a day, a valid start/end time and a subject before you can save.' : '';
    $('#save').disabled = !($('#ok').checked && n && !invalid);
  }

  $('#rows').addEventListener('change', e => {
    const el = e.target.closest('[data-f]'), box = e.target.closest('.crow'); if (!el || !box) return;
    const r = rows.find(x => x.uid === +box.dataset.u), f = el.dataset.f;
    if (f === 'start' || f === 'end') r[f] = tmin(el.value); else if (f === 'isLab') r.isLab = el.checked; else if (f === 'course') r.course = el.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); else r[f] = el.value;
    if (f === 'roomText') { r.roomKey = null; const m = C.matchRoom(D.rooms, r.roomText); if (m.status === 'exact') { r.roomKey = m.room.k; r.roomText = m.room.b + '-' + m.room.id; } }
    r.flags = r.flags.filter(x => x !== 'span_guess' || (f !== 'end' && f !== 'start'));
    renderRows(); const again = document.querySelector('.crow[data-u="' + r.uid + '"] [data-f="' + f + '"]'); if (again && f !== 'isLab') again.focus({ preventScroll: true });
  });
  $('#rows').addEventListener('click', e => {
    const box = e.target.closest('.crow'); if (!box) return; const r = rows.find(x => x.uid === +box.dataset.u);
    if (e.target.closest('[data-del]')) { rows = rows.filter(x => x !== r); renderRows(); }
    const p = e.target.closest('[data-pick]'); if (p) { const rm = R[p.dataset.pick]; r.roomKey = rm.k; r.roomText = rm.b + '-' + rm.id; renderRows(); }
  });
  $('#add').onclick = () => { rows.push(toRow({ day: '', start: 540, end: 590 })); renderRows(); const last = [...document.querySelectorAll('.crow')].pop(); if (last) { last.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
  $('#ok').onchange = summary;

  /* ── step 2 ── */
  function openEditor({ classes, title, sub, preview }) {
    rows = classes.map(toRow); $('#ok').checked = false;
    $('#s2t').textContent = title; $('#s2s').textContent = sub;
    $('#prevWrap').hidden = !preview; $('#prev').innerHTML = ''; if (preview) $('#prev').append(preview);
    const live = Api.mode === 'live';
    $('#auth').innerHTML = live && !Api.token() ? '<div class="banner" style="margin:0">You’re not signed in, so this will be saved <b>on this device</b>. <a href="login.html?next=import.html"><b>Sign in</b></a> afterwards (or first) to keep it on your profile.</div>'
      : !live ? '<div class="banner" style="margin:0">Offline demo mode: the timetable is saved on this device only.</div>' : '';
    renderRows(); step(2);
  }

  /* ── step 1: file → words → classes ── */
  async function handleFile(file) {
    $('#s1err').textContent = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type) && !/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { $('#s1err').textContent = 'Please choose a PNG, JPG, WebP or PDF file.'; return; }
    if (file.size > 20 * 1024 * 1024) { $('#s1err').textContent = 'That file is over 20 MB — please use a smaller screenshot.'; return; }
    const bar = $('#pbar'); $('#prog').hidden = false; bar.removeAttribute('value'); $('#pmsg').textContent = 'Loading the reading engine…';
    try {
      const res = await MapifyOCR.readFile(file, { onProgress: p => { bar.value = Math.round(p * 100); $('#pmsg').textContent = 'Reading your timetable… ' + Math.round(p * 100) + '%'; } });
      const out = I.parse(res.words, { buildings: BUILDINGS });
      let prev = null;
      if (res.preview) { prev = new Image(); prev.alt = 'Your uploaded timetable'; prev.src = res.preview; } else if (res.canvas) { prev = res.canvas; prev.setAttribute('role', 'img'); prev.setAttribute('aria-label', 'Your uploaded timetable'); }
      mode = 'import';
      const found = out.classes.length;
      openEditor({ classes: out.classes, preview: prev, title: found ? 'We found ' + found + ' class' + (found === 1 ? '' : 'es') : 'We couldn’t read any classes',
        sub: found ? 'Compare each card with your timetable, correct anything that’s off, and add anything missing.' + (res.text ? ' (Read directly from the PDF text.)' : '') : (out.warnings[0] || 'Add your classes manually below.') });
    } catch (e) { $('#s1err').textContent = 'Couldn’t read that file: ' + e.message; }
    finally { $('#prog').hidden = true; $('#file').value = ''; }
  }
  $('#file').addEventListener('change', e => handleFile(e.target.files[0]));
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
  $('#manual').onclick = () => { mode = 'manual'; openEditor({ classes: [], title: 'Add your classes', sub: 'Add each class with its day, time and room.', preview: null }); $('#add').click(); };
  $('#again').onclick = () => { rows = []; $('#s1err').textContent = ''; step(1); };

  /* ── save ── */
  $('#save').onclick = async () => {
    const btn = $('#save'); btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const out = await Api.saveMyTimetable(rows.slice().sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start - b.start), { source: mode });
      const unm = out.classes.filter(c => c.needsRoom).length;
      $('#s3').innerHTML = '<div class="imp-done"><div class="big">✅</div><h2 class="hero-title" style="font-size:22px">Timetable saved</h2>' +
        '<p class="sub">' + out.classes.length + ' classes saved ' + (out.source === 'server' ? 'to your profile.' : 'on this device. Sign in to keep it on your profile.') + '</p>' +
        (unm ? '<div class="banner" style="margin:12px 0 0">' + unm + ' class' + (unm > 1 ? 'es have' : ' has') + ' a room we couldn’t match. We’ll ask you to correct it on Home when it comes up.</div>' : '<p class="sub" style="margin-top:8px">Every room is matched to a floor plan 🎉</p>') +
        '<div class="row"><a class="btn primary" href="index.html">Go to Home</a><a class="btn" href="timetable.html">View timetable</a></div></div>';
      step(3);
    } catch (e) { $('#s2err').textContent = e.message; btn.disabled = false; }
    btn.textContent = 'Save timetable';
  };

  /* ── an existing timetable: edit or remove ── */
  try {
    const cur = await Api.myTimetable();
    if (cur.classes.length) {
      $('#existing').innerHTML = '<div class="notice"><span>You already have a timetable (<b>' + cur.classes.length + ' classes</b>, ' + (cur.source === 'server' ? 'on your profile' : 'on this device') + '). Importing a new one replaces it.</span><span class="row"><button class="btn" id="edit" type="button">✏️ Edit current</button><button class="btn danger" id="rm" type="button">Remove</button></span></div>';
      $('#edit').onclick = () => { mode = 'manual'; openEditor({ classes: cur.classes.map(c => ({ ...c, flags: [] })), title: 'Your current timetable', sub: 'Make changes, tick the box and save.', preview: null }); };
      $('#rm').onclick = async () => { if (!confirm('Remove your saved timetable?')) return; await Api.clearMyTimetable(); $('#existing').innerHTML = ''; Shell.toast('Timetable removed'); };
    }
  } catch (_) {}
  step(1);
})();
