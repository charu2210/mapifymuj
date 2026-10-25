(async () => {
  const { esc } = Shell, C = MapifyCore, COL = C.COLORS;
  await Api.detect(); Shell.mountNav('schedule'); Shell.modeBanner(document.getElementById('app'));
  const user = await Api.refreshUser();
  try {
    const mine = await Api.myTimetable().catch(() => ({ classes: [] })), personal = mine.classes.length > 0;
    let [tt, now, att, campus] = await Promise.all([personal ? null : Api.timetable(user && user.section), personal ? null : Api.now(user && user.section), Api.attendance(), Api.campus()]);
    if (personal) {
      const atq = new URLSearchParams(location.search).get('at');
      now = Object.assign({ section: { name: 'My timetable' } }, C.resolvePersonal(mine.classes, C.clock(atq ? new Date(atq) : new Date(), 'Asia/Kolkata')));
      tt = { section: { name: 'My timetable' + (mine.source === 'device' ? ' · saved on this device' : '') }, week: C.personalByDay(mine.classes) };
      if (att.demo) att = { demo: false, overall: C.summarize(0, 0), courses: [] };
    }
    const DAYS = personal && mine.classes.some(c => c.day === 'SAT') ? C.DAYS_ALL : C.DAYS;
    const byCode = Object.fromEntries(att.courses.map(c => [c.code, c]));
    document.getElementById('sect').textContent = (tt.section.name || tt.section) + (att.demo ? ' · sample attendance (sign in for yours)' : '');
    // dates of the week that contains "today" (campus clock)
    const base = new Date(now.date + 'T00:00:00Z'), dow = (base.getUTCDay() + 6) % 7;
    const dateOf = d => { const x = new Date(base); x.setUTCDate(x.getUTCDate() - dow + C.DAYS_ALL.indexOf(d)); return x.getUTCDate(); };
    let sel = DAYS.includes(now.day) ? now.day : 'MON';
    const nowBlock = now.current;
    const tabs = () => document.getElementById('tabs').innerHTML = DAYS.map(d => '<button role="tab" aria-selected="' + (d === sel) + '" class="dtab ' + (d === sel ? 'on' : '') + '" data-d="' + d + '"><span class="dn">' + d + '</span><span class="dd">' + dateOf(d) + '</span></button>').join('');
    const slots = () => {
      const blocks = tt.week[sel] || [], out = [];
      if (!blocks.length) out.push('<div class="slot free">No classes on ' + Shell.DAYN[sel] + ' 🎉</div>');
      blocks.forEach(b => {
        const a = byCode[b.course], isNow = nowBlock && sel === now.day && nowBlock.start === b.start;
        out.push('<div class="slot ' + (isNow ? 'now-slot' : '') + '"><div class="slot-time"><span>' + esc(b.time.split('–')[0]) + '</span><div class="slot-line"></div><span>' + esc(b.time.split('–')[1]) + '</span></div>' +
          '<div class="slot-body"><div class="slot-sub">' + esc(b.course_name) + '</div><div class="slot-fac">' + esc(b.faculty) + '</div><div class="slot-pills"><span class="pill ' + (b.isLab ? 'pill-lab' : '') + '">' + esc(b.course) + '</span>' +
          (b.roomKey ? '<a href="map.html?room=' + encodeURIComponent(b.roomKey) + '">📍 Rm ' + esc(b.room) + ' · ' + esc(b.building) + ' — find</a>' : personal ? '<button class="tl-fix" type="button" data-fix="' + esc(b.id) + '">⚠ Room ' + (b.roomText ? '“' + esc(b.roomText) + '” ' : '') + 'not matched — fix</button>' : '<span>📍 Room TBA</span>') + (isNow ? '<span class="pill pill-now">NOW</span>' : '') + '</div></div>' +
          (a ? '<div>' + C.ringSvg(a.percentage, 46) + '<div class="ring-lbl">' + a.attended + '/' + a.total + '</div></div>' : '') + '</div>');
      });
      document.getElementById('slots').innerHTML = out.join('');
    };
    document.getElementById('tabs').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) { sel = b.dataset.d; tabs(); slots(); } });
    document.getElementById('slots').addEventListener('click', e => {
      const bt = e.target.closest('[data-fix]'); if (!bt) return;
      const cls = (tt.week[sel] || []).find(x => String(x.id) === bt.dataset.fix), body = bt.closest('.slot-body');
      let h = body.querySelector('.tl-fixhost'); if (!h) { h = document.createElement('div'); h.className = 'tl-fixhost'; body.appendChild(h); }
      Shell.roomFixer(h, cls, campus, () => location.reload());
    });
    tabs(); slots();
    document.getElementById('ov').innerHTML = C.ringSvg(att.overall.percentage, 38);
    const word = { green: 'Safe', orange: 'Borderline', red: 'Low', none: 'No data' };
    document.getElementById('rows').innerHTML = att.courses.map(c => {
      const col = COL[c.status] || '#bbb';
      const tip = c.status === 'green' ? (c.canSkip ? 'You can miss ' + c.canSkip + ' more class' + (c.canSkip > 1 ? 'es' : '') + ' and stay above 75%.' : 'Missing the next class would drop you to 75% or below.')
        : c.total ? 'Attend the next ' + c.needToAttend + ' classes in a row to get above 75%.' : '';
      const src = c.baseline ? '<div class="att-tip" style="font-size:10.5px">' + c.baseline.attended + '/' + c.baseline.total + ' from dataset' + (c.recorded.total ? ' + ' + c.recorded.attended + '/' + c.recorded.total + ' marked in MapifyMUJ' : '') + '</div>' : '';
      return '<div class="att-row"><span class="att-row-code">' + esc(c.code) + '</span><div><div class="att-name">' + esc(c.name) + '</div><div class="att-row-pct"><span>' + c.attended + '/' + c.total + ' classes</span>' +
        '<span style="color:' + col + ';font-weight:800">' + (c.percentage == null ? '–' : c.percentage + '%') + ' · ' + word[c.status] + '</span></div><div class="att-bar" role="progressbar" aria-valuenow="' + (c.percentage || 0) + '" aria-valuemin="0" aria-valuemax="100"><div class="att-fill" style="width:' + (c.percentage || 0) + '%;background:' + col + '"></div></div><div class="att-tip">' + tip + '</div>' + src + '</div></div>';
    }).join('') || '<p class="sub" style="padding:14px">No attendance recorded yet.</p>';
  } catch (e) { document.getElementById('slots').innerHTML = '<div class="slot free">' + esc(e.message) + '</div>'; }
})();
