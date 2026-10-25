(async () => {
  const { esc } = Shell, C = MapifyCore, $ = s => document.getElementById(s), COL = C.COLORS;
  $('greeting').textContent = Shell.greeting();
  await Api.detect(); Shell.mountNav('home'); Shell.modeBanner($('app'));
  const user = await Api.refreshUser(); Shell.updateUser(user);
  if (user) { $('who').textContent = user.name.split(' ')[0]; $('avatar').textContent = user.name[0].toUpperCase(); }
  try {
    /* The student's own (imported) timetable wins; without one we fall back to the section timetable. */
    const mine = await Api.myTimetable().catch(() => ({ classes: [], source: null })), personal = mine.classes.length > 0;
    const [nowS, attS, campus, ttS] = await Promise.all([personal ? null : Api.now(user && user.section), Api.attendance(), Api.campus(), personal ? null : Api.timetable(user && user.section)]);
    let now = nowS, tt = ttS, att = attS;
    if (personal) {
      const atq = new URLSearchParams(location.search).get('at');
      now = Object.assign({ section: { name: 'My timetable' }, tz: 'Asia/Kolkata' }, C.resolvePersonal(mine.classes, C.clock(atq ? new Date(atq) : new Date(), 'Asia/Kolkata')));
      tt = { week: C.personalByDay(mine.classes) };
      if (att.demo) att = { demo: false, overall: C.summarize(0, 0), courses: [] };     // sample attendance belongs to the sample section, not to this student
    }
    const byCode = Object.fromEntries(att.courses.map(c => [c.code, c]));
    const dateLong = new Date(now.date + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    $('sect').textContent = (now.section.name || now.section) + ' · ' + dateLong + (att.demo ? ' · sample attendance' : '');
    const floorName = b => { const x = campus.buildings.find(y => y.id === b.building); const f = x && x.floors.find(z => z.id === b.floor); return f ? f.name : ''; };
    const place = b => b.roomKey ? 'Room ' + esc(b.room) + ' · ' + esc(b.building) + (floorName(b) ? ' · ' + esc(floorName(b)) : '') : personal ? '⚠ Room ' + (b.roomText ? '“' + esc(b.roomText) + '” ' : '') + 'not matched' : 'Room to be announced';
    const bName = b => { const x = campus.buildings.find(y => y.id === b.building); return x ? x.name : b.building; };
    const locChips = b => '<div class="loc-chips">' + (b.roomKey
      ? '<span class="loc-chip"><small>Building</small><b>' + esc(bName(b)) + '</b></span><span class="loc-chip"><small>Floor</small><b>' + esc(floorName(b)) + '</b></span><span class="loc-chip"><small>Room</small><b>' + esc(b.room) + '</b></span>'
      : '<span class="loc-chip warn"><small>Room</small><b>' + (b.roomText ? esc(b.roomText) : 'not set') + ' — needs correcting</b></span>') + '</div>';
    /* notices: invite to import, or move a device-only timetable to the profile */
    const live = Api.mode === 'live', signedIn = !!Api.token();
    const note = !personal ? '<b>Use your own timetable</b> — upload a screenshot or PDF and we’ll find every classroom for you.<a class="btn primary" href="import.html">📥 Import timetable</a>'
      : mine.source === 'device' && live && signedIn ? 'Your timetable is saved on this device only.<button class="btn primary" id="mv" type="button">Save to my profile</button>'
      : mine.source === 'device' && live ? 'Your timetable is saved on this device only. <a href="login.html?next=index.html"><b>Sign in</b></a> to keep it on your profile.' : '';
    if (note) { $('next').insertAdjacentHTML('beforebegin', '<div class="notice">' + note.replace(/<a class="btn primary"/, '<a class="btn primary"') + '</div>'); const mv = $('mv'); if (mv) mv.onclick = async () => { try { await Api.moveDeviceTimetableToProfile(); location.reload(); } catch (e) { Shell.toast(e.message, true); } }; }
    const left = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
    const cur = now.current, nxt = now.next, focus = cur || nxt;

    /* ── summary tiles ── */
    const o = att.overall, risk = att.courses.filter(c => c.status === 'red' || c.status === 'orange');
    const doneN = now.today.filter(b => b.end <= now.minutes).length, todayN = now.today.length;
    const nextVal = cur ? 'Now' : nxt ? (now.nextDay ? Shell.DAYN[now.nextDay].slice(0, 3) + ' ' + esc(nxt.time.split('–')[0]) : esc(nxt.time.split('–')[0])) : '—';
    const nextSub = cur ? 'ends in ' + left(cur.end - now.minutes) : nxt ? (now.nextDay ? esc(nxt.course_name) : 'in ' + left(nxt.start - now.minutes)) : 'nothing scheduled';
    $('stats').innerHTML =
      '<a class="stat" href="timetable.html#attendance"><div class="stat-ring">' + C.ringSvg(o.percentage, 60) + '</div><div><span class="stat-k">Overall attendance</span><b class="stat-v">' + (o.percentage == null ? '–' : o.percentage + '%') + '</b><span class="stat-s">' + o.attended + ' of ' + o.total + ' classes</span></div></a>' +
      '<div class="stat"><div class="stat-ic" style="background:#E1F4F1">📚</div><div><span class="stat-k">Classes today</span><b class="stat-v">' + todayN + '</b><span class="stat-s">' + (todayN ? doneN + ' done · ' + (todayN - doneN) + ' to go' : 'no classes on ' + (Shell.DAYN[now.day] || 'the weekend')) + '</span></div></div>' +
      '<div class="stat"><div class="stat-ic" style="background:#FFF1E0">⏰</div><div><span class="stat-k">' + (cur ? 'In session' : 'Next class') + '</span><b class="stat-v">' + nextVal + '</b><span class="stat-s">' + nextSub + '</span></div></div>' +
      '<a class="stat" href="timetable.html#attendance"><div class="stat-ic" style="background:' + (risk.length ? '#FDECEC' : '#E8F5E9') + '">' + (risk.length ? '⚠️' : '✅') + '</div><div><span class="stat-k">Needs attention</span><b class="stat-v">' + risk.length + '</b><span class="stat-s">' + (risk.length ? 'course' + (risk.length > 1 ? 's' : '') + ' at or below 75%' : 'all courses above 75%') + '</span></div></a>';

    /* ── hero ── */
    const lab = cur ? '🔴 Right now' : nxt ? (now.nextDay ? '⏭ Next class · ' + Shell.DAYN[now.nextDay] : '⏭ Up next') : 'Schedule';
    const hero = $('next');
    if (!focus) hero.innerHTML = '<div class="nc-tag">' + lab + '</div><div class="nc-name">No classes scheduled 🎉</div><div class="nc-meta">Enjoy the free time.</div>';
    else {
      const a = byCode[focus.course], pct = cur ? Math.min(100, Math.round((now.minutes - cur.start) / (cur.end - cur.start) * 100)) : 0;
      hero.innerHTML = '<div class="hero-body"><div class="nc-tag">' + lab + (focus.course ? ' · ' + esc(focus.course) : '') + (focus.isLab ? ' · Lab' : ' · Theory') + '</div><div class="nc-name">' + esc(focus.course_name) + '</div>' +
        '<div class="nc-meta">' + (focus.faculty ? '<span>👤 ' + esc(focus.faculty) + '</span>' : '') + (personal ? '' : '<span>📍 ' + place(focus) + '</span>') + '<span>⏰ ' + esc(focus.time) + '</span></div>' + (personal ? locChips(focus) : '') +
        (cur ? '<div class="prog" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Class progress"><i style="width:' + pct + '%"></i></div>' : '') +
        '<div id="fixhost"></div><div class="nc-btns">' + (focus.roomKey ? '<a class="btn-w" id="findcls" href="map.html?room=' + encodeURIComponent(focus.roomKey) + '">🧭 Find my classroom</a>' : '') + '<a class="btn-ghost" href="timetable.html">Open schedule</a></div></div>' +
        (a ? '<div class="hero-ring" title="Attendance in this course">' + C.ringSvg(a.percentage, 92, { text: '#0F766E' }) + '<span>Attendance</span></div>' : '');
    }

    if (personal && focus && !focus.roomKey && $('fixhost')) Shell.roomFixer($('fixhost'), focus, campus, () => location.reload());

    /* ── today's timeline ── */
    $('today').innerHTML = now.today.map(b => {
      const st = b.end <= now.minutes ? 'done' : b.start <= now.minutes ? 'now' : 'next', a = byCode[b.course];
      return '<div class="tl-row ' + st + '"><div class="tl-time"><b>' + esc(b.time.split('–')[0]) + '</b><span>' + esc(b.time.split('–')[1]) + '</span></div><i class="tl-dot"></i>' +
        '<div class="tl-body"><h3>' + esc(b.course_name) + (st === 'now' ? ' <span class="pill pill-now">NOW</span>' : '') + (b.isLab ? ' <span class="pill pill-lab">Lab</span>' : '') + '</h3><p>' + esc(b.faculty) + ' · ' + place(b) + '</p></div>' +
        '<div class="tl-act">' + (b.roomKey ? '<a class="tl-go" href="map.html?room=' + encodeURIComponent(b.roomKey) + '" aria-label="Find room ' + esc(b.room) + '">🗺 Find</a>' : personal ? '<button class="tl-fix" type="button" data-fix="' + esc(b.id) + '">⚠ Fix room</button>' : '') + (a ? '<div class="tl-ring">' + C.ringSvg(a.percentage, 40) + '</div>' : '') + '</div></div>';
    }).join('') || '<p class="empty">No classes on ' + esc(Shell.DAYN[now.day] || 'the weekend') + (nxt && now.nextDay ? ' — next up: <b>' + esc(nxt.course_name) + '</b> on ' + Shell.DAYN[now.nextDay] + ' at ' + esc(nxt.time.split('–')[0]) : '') + '.</p>';

    $('today').addEventListener('click', e => {
      const bt = e.target.closest('[data-fix]'); if (!bt) return;
      const row = bt.closest('.tl-row'); let h = row.querySelector('.tl-fixhost');
      if (!h) { h = document.createElement('div'); h.className = 'tl-fixhost'; row.appendChild(h); }
      Shell.roomFixer(h, now.today.find(x => String(x.id) === bt.dataset.fix), campus, () => location.reload());
    });

    /* ── week at a glance ── */
    $('wk-sub').textContent = Object.values(tt.week).reduce((n, d) => n + d.length, 0) + ' class blocks this week';
    const wdays = personal && (tt.week.SAT || []).length ? C.DAYS_ALL : C.DAYS; if (wdays.length > 5) $('week').style.gridTemplateColumns = 'repeat(6,minmax(92px,1fr))';
    $('week').innerHTML = wdays.map(d => {
      const bl = tt.week[d] || [];
      return '<a class="wk-day ' + (d === now.day ? 'today' : '') + '" href="timetable.html"><div class="wk-h"><b>' + d + '</b><span>' + bl.length + '</span></div>' +
        (bl.map(b => '<div class="wk-b ' + (b.isLab ? 'lab' : '') + '"><span>' + esc(b.time.split('–')[0]) + '</span>' + esc(b.course) + '</div>').join('') || '<div class="wk-none">Free</div>') + '</a>';
    }).join('');

    /* ── attendance by course (lowest first) ── */
    $('att').innerHTML = att.courses.slice().sort((a, b) => (a.percentage == null) - (b.percentage == null) || a.percentage - b.percentage).map(c => {
      const col = COL[c.status] || '#bbb';
      return '<div class="ac"><div class="ac-h"><span class="ac-n" title="' + esc(c.name) + '">' + esc(c.name) + '</span><b style="color:' + col + '">' + (c.percentage == null ? '–' : c.percentage + '%') + '</b></div>' +
        '<div class="att-bar" role="progressbar" aria-valuenow="' + (c.percentage || 0) + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + esc(c.code) + '"><div class="att-fill" style="width:' + (c.percentage || 0) + '%;background:' + col + '"></div></div>' +
        '<div class="ac-s">' + esc(c.code) + ' · ' + c.attended + '/' + c.total + (c.status === 'green' ? (c.canSkip ? ' · can miss ' + c.canSkip : ' · none to spare') : c.total ? ' · attend next ' + c.needToAttend : '') + '</div></div>';
    }).join('') || '<p class="empty">No attendance recorded yet.</p>';

    /* ── buildings ── */
    $('blds').innerHTML = campus.buildings.map(x => '<a class="bld-card" href="map.html?b=' + x.id + '"><div class="bld-icon" style="background:' + (Shell.bTint[x.id] || '#E1F4F1') + '">' + (Shell.bTypeIcon[x.id] || '🏢') +
      '</div><div><div class="bld-name">' + esc(x.name) + '</div><div class="bld-sub">' + x.floors.length + ' floor' + (x.floors.length > 1 ? 's' : '') + '</div></div></a>').join('') +
      '<a class="bld-card wide-card" href="campus.html"><div class="bld-icon" style="background:#E3F2FD">📍</div><div><div class="bld-name">Campus map</div><div class="bld-sub">Outdoor map, hostels, library, directions</div></div></a>';

    /* ── room finder ── */
    const inp = $('fq'), res = $('fres'); let hits = [], act = -1;
    const close = () => { res.hidden = true; inp.setAttribute('aria-expanded', 'false'); act = -1; };
    const fname = r => { const b = campus.buildings.find(x => x.id === r.b), f = b && b.floors.find(x => x.id === r.f); return (b ? b.name : r.b) + (f ? ' · ' + f.name : ''); };
    inp.addEventListener('input', () => {
      const { total, results } = C.searchRooms(campus.rooms, inp.value, 7); hits = results; act = -1;
      if (!total) { res.innerHTML = inp.value.trim() ? '<div class="more-r">No room matches “' + esc(inp.value.trim()) + '”.</div>' : ''; res.hidden = !inp.value.trim(); return; }
      res.innerHTML = results.map(r => '<a role="option" href="map.html?room=' + encodeURIComponent(r.k) + '"><b>' + esc(r.id) + ' ' + esc(r.name) + '</b><span>' + esc(fname(r)) + '</span></a>').join('') + (total > results.length ? '<div class="more-r">+' + (total - results.length) + ' more — open the indoor map to browse.</div>' : '');
      res.hidden = false; inp.setAttribute('aria-expanded', 'true');
    });
    inp.addEventListener('keydown', e => {
      const as = [...res.querySelectorAll('a')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!as.length) return; act = (act + (e.key === 'ArrowDown' ? 1 : -1) + as.length) % as.length; as.forEach((x, i) => x.classList.toggle('act', i === act)); }
      else if (e.key === 'Enter' && hits.length) { e.preventDefault(); location.href = 'map.html?room=' + encodeURIComponent(hits[act >= 0 ? act : 0].k); }
      else if (e.key === 'Escape') close();
    });
    document.addEventListener('click', e => { if (!e.target.closest('#finder')) close(); });
    document.addEventListener('keydown', e => { if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); inp.focus(); } });
  } catch (e) { $('next').innerHTML = '<div class="nc-name">Could not load</div><div class="nc-meta">' + esc(e.message) + '</div>'; }
})();
