(async () => {
  const $ = s => document.querySelector(s), { esc } = Shell, C = MapifyCore;
  await Api.detect(); Shell.mountNav('map'); Shell.modeBanner($('.topbar'));
  let D, R, B, TT = null; const S = {}, st = { b: 'AB2', f: '1', k: null, z: innerWidth < 700 ? 2.4 : 1 };
  try { D = await Api.campus(); await Promise.all(D.buildings.flatMap(b => b.floors).map(async f => { const r = await fetch('maps/' + f.file); if (!r.ok) throw new Error('Missing map ' + f.file); S[f.file] = await r.text(); })); }
  catch (e) { $('#stage').textContent = 'Could not load the maps: ' + e.message; return; }
  R = Object.fromEntries(D.rooms.map(r => [r.k, r])); B = Object.fromEntries(D.buildings.map(b => [b.id, b]));
  const fl = () => B[st.b].floors.find(f => f.id === st.f), fname = r => B[r.b].floors.find(f => f.id === r.f).name;

  const p = new URLSearchParams(location.search), rk = p.get('room');
  if (rk && R[rk]) { st.k = rk; st.b = R[rk].b; st.f = R[rk].f; }
  else if (B[p.get('b')]) { st.b = p.get('b'); st.f = (B[st.b].floors.find(f => f.id === p.get('f')) || B[st.b].floors[0]).id; }

  function url() { const u = new URL(location.href); u.search = ''; if (st.k) u.searchParams.set('room', st.k); else { u.searchParams.set('b', st.b); u.searchParams.set('f', st.f); } history.replaceState(null, '', u); }
  function render() {
    $('#blds').innerHTML = D.buildings.map(b => '<button class="seg ' + (b.id === st.b ? 'on' : '') + '" data-b="' + b.id + '">' + esc(b.name) + '</button>').join('');
    $('#fls').innerHTML = B[st.b].floors.map(f => '<button class="chip ' + (f.id === st.f ? 'on' : '') + '" data-f="' + f.id + '">' + esc(f.name) + '</button>').join('');
    $('#crumb').textContent = 'Campus › ' + B[st.b].name + ' › ' + fl().name + (st.k ? ' › ' + R[st.k].id : '');
    $('#stage').innerHTML = S[fl().file]; const sv = $('#stage svg'); sv.style.width = st.z * 100 + '%'; sv.removeAttribute('height'); sv.setAttribute('role', 'group');
    sv.querySelectorAll('g[id]').forEach(g => { const r = R[g.id]; if (!r) return; g.style.cursor = 'pointer'; g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'Room ' + r.id + (r.name ? ', ' + r.name : '')); });
    $('#rl').innerHTML = D.rooms.filter(r => r.b === st.b && r.f === st.f).map(r => '<button class="chip ' + (r.k === st.k ? 'on' : '') + '" data-k="' + esc(r.k) + '">' + esc(r.id) + '</button>').join('');
    const el = st.k && document.getElementById(st.k);
    if (el) {
      const rc = el.querySelector('rect,path'); rc.style.fill = '#D9480F'; rc.style.fillOpacity = 1; rc.style.stroke = '#D9480F'; rc.style.strokeWidth = 3;
      el.querySelectorAll('text').forEach(t => t.style.fill = '#fff'); el.setAttribute('aria-pressed', 'true');
      const s = $('#stage'), a = el.getBoundingClientRect(), c = s.getBoundingClientRect();
      s.scrollTo({ left: s.scrollLeft + a.left - c.left - c.width / 2 + a.width / 2, top: s.scrollTop + a.top - c.top - c.height / 2 + a.height / 2, behavior: 'smooth' });
    }
    url(); info();
  }
  let infoSeq = 0;
  async function info() {
    const r = R[st.k], box = $('#i'); if (!r) { box.innerHTML = '<div class="lab">Selected room</div><p class="sub">Search above or tap a room on the map.</p>'; return; }
    box.innerHTML = '<div class="lab">' + esc(B[r.b].name) + ' › ' + esc(fname(r)) + '</div><div class="big">' + esc(r.id) + '</div><div>' + esc(r.name || 'Name not added yet') + '</div><div class="sub">' + esc(D.types[r.t] || '') + '</div>' +
      '<div class="row" style="margin-top:12px"><a class="btn" href="campus.html?place=' + r.b + '">📍 ' + esc(B[r.b].name) + ' on campus map</a><button class="btn" id="cp">🔗 Copy link</button></div><div id="cls"></div>';
    $('#cp').onclick = async () => { try { await navigator.clipboard.writeText(location.href); Shell.toast('Link copied'); } catch (_) { Shell.toast('Copy the address bar link', true); } };
    const my = ++infoSeq;
    try {
      const [room, tt] = await Promise.all([Api.room(r.k), TT || Api.timetable()]); TT = tt; if (my !== infoSeq) return;
      if (!room.classes.length) return;
      const lab = i => tt.slots[i] ? tt.slots[i].label : 'period ' + (i + 1), ord = d => C.DAYS.indexOf(d);
      $('#cls').innerHTML = '<div class="lab" style="margin:14px 0 0">Classes timetabled here</div><div class="cls-list">' + room.classes.slice().sort((a, b) => ord(a.day) - ord(b.day) || a.slot - b.slot)
        .map(c => '<div><span><b>' + c.day + '</b> ' + esc(lab(c.slot)) + '</span><span>' + esc(c.course) + ' · ' + esc(c.course_name) + '</span></div>').join('') + '</div>';
    } catch (_) {}
  }
  function pick(k) { st.k = k; st.b = R[k].b; st.f = R[k].f; closeRes(); $('#nf').hidden = true; render(); }

  /* search — runs locally on the loaded room data (no server round-trip per keystroke) */
  let hits = [], act = -1;
  const closeRes = () => { $('#res').hidden = true; $('#q').setAttribute('aria-expanded', 'false'); act = -1; };
  function showRes(text) {
    const { total, results } = C.searchRooms(D.rooms, text, 30); hits = results; act = -1;
    $('#nf').hidden = !(text.trim() && !total); if (!total) return closeRes();
    $('#res').innerHTML = results.map((r, i) => '<button role="option" data-k="' + esc(r.k) + '" data-i="' + i + '"><b>' + esc(r.id) + ' ' + esc(r.name) + '</b><span class="sub">' + esc(B[r.b].name) + ' · ' + esc(fname(r)) + '</span></button>').join('') +
      (total > results.length ? '<div class="more">Showing ' + results.length + ' of ' + total + ' matches — type more to narrow down.</div>' : '');
    $('#res').hidden = false; $('#q').setAttribute('aria-expanded', 'true');
  }
  $('#q').addEventListener('input', e => showRes(e.target.value));
  $('#q').addEventListener('keydown', e => {
    const bs = [...document.querySelectorAll('#res button')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!bs.length) return; act = (act + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length; bs.forEach((b, i) => b.classList.toggle('act', i === act)); bs[act].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); const h = hits[act >= 0 ? act : 0]; if (h) pick(h.k); else $('#nf').hidden = !e.target.value.trim(); }
    else if (e.key === 'Escape') closeRes();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#s')) closeRes();
    const g = e.target.closest('#stage g[id]'); if (g && R[g.id] && !dragged) return pick(g.id);
    const bt = e.target.closest('[data-b],[data-f],[data-k]'); if (!bt) return;
    if (bt.dataset.b) { st.b = bt.dataset.b; st.f = B[st.b].floors[0].id; st.k = null; render(); }
    else if (bt.dataset.f) { st.f = bt.dataset.f; st.k = null; render(); } else pick(bt.dataset.k);
  });
  $('#stage').addEventListener('keydown', e => { const g = e.target.closest && e.target.closest('g[id]'); if (g && R[g.id] && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(g.id); } });

  const zoom = d => { st.z = Math.min(4, Math.max(1, +(st.z + d).toFixed(2))); $('#stage svg').style.width = st.z * 100 + '%'; };
  $('#zi').onclick = () => zoom(.4); $('#zo').onclick = () => zoom(-.4); $('#zf').onclick = () => { st.z = 1; zoom(0); };
  $('#stage').addEventListener('wheel', e => { if (e.ctrlKey) { e.preventDefault(); zoom(e.deltaY < 0 ? .2 : -.2); } }, { passive: false });
  /* mouse drag-to-pan (touch uses native scrolling) */
  let dragged = false, ds = null; const stg = $('#stage');
  stg.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) { ds = { x: e.clientX, y: e.clientY, l: stg.scrollLeft, t: stg.scrollTop }; dragged = false; } });
  stg.addEventListener('pointermove', e => { if (!ds) return; const dx = e.clientX - ds.x, dy = e.clientY - ds.y; if (Math.abs(dx) + Math.abs(dy) > 6) { dragged = true; stg.classList.add('drag'); } if (dragged) { stg.scrollLeft = ds.l - dx; stg.scrollTop = ds.t - dy; } });
  addEventListener('pointerup', () => { ds = null; stg.classList.remove('drag'); setTimeout(() => dragged = false, 0); });

  window.MapifyMap = { select: k => R[k] && pick(k) };   // hook kept from the prototype: MapifyMap.select('AB2-127')
  render();
})();
