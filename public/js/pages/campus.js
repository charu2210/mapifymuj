(async () => {
  const $ = s => document.querySelector(s), { esc } = Shell;
  await Api.detect(); Shell.mountNav('campus'); Shell.modeBanner($('.topbar'));
  const CAT = { academic: ['#3b82f6', '🎓'], residential: ['#10b981', '🏠'], dining: ['#f59e0b', '🍽'], recreation: ['#8b5cf6', '⚽'], administrative: ['#ef4444', '🏛'], parking: ['#6b7280', '🅿'], outdoor: ['#22c55e', '🌳'] };
  const CENTER = [26.843, 75.5645];
  // Campus-only view. Edit these two lines to match the surveyed campus boundary (SW corner, NE corner).
  const CAMPUS_BOUNDS = [[26.8385, 75.5600], [26.8470, 75.5695]];
  const inCampus = ([la, ln]) => la >= CAMPUS_BOUNDS[0][0] && la <= CAMPUS_BOUNDS[1][0] && ln >= CAMPUS_BOUNDS[0][1] && ln <= CAMPUS_BOUNDS[1][1];
  let places = [], sel = null, cat = 'all', text = '', me = null, routeLayer = null, markers = {};
  if (typeof L === 'undefined') { $('#cmap').innerHTML = '<p class="sub" style="padding:16px">The map library could not be loaded (are you offline?). The place list on the right still works.</p>'; }
  const map = typeof L !== 'undefined' ? L.map('cmap', { center: CENTER, zoom: 17, minZoom: 16, maxZoom: 19, zoomControl: true, maxBounds: L.latLngBounds(CAMPUS_BOUNDS).pad(0.15), maxBoundsViscosity: 0.9 }) : null;
  // Base map: Esri World Street Map — no API key needed (OpenStreetMap's and CARTO's free tile servers now block or demand keys).
  // To use your own provider (e.g. MapTiler/Stadia/Geoapify with a free key) set window.MAPIFY_TILE_URL before this script,
  // e.g. 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR_KEY' (and allow its host in server/index.js imgSrc).
  const street = map && L.tileLayer(window.MAPIFY_TILE_URL || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 15, attribution: 'Tiles © Esri — Esri, HERE, Garmin, OpenStreetMap contributors' });
  let usingCarto = false; const carto = street;
  const sat = map && L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 18, attribution: 'Tiles © Esri, Maxar, Earthstar Geographics' });
  let satOn = true; if (map) { sat.addTo(map); $('#sat').textContent = '🗺 Street'; map.fitBounds(CAMPUS_BOUNDS);
    L.rectangle(CAMPUS_BOUNDS, { color: '#FF8C42', weight: 2, dashArray: '6 6', fill: false, interactive: false }).addTo(map).bindTooltip('Manipal University Jaipur (approx. boundary)', { sticky: true }); }
  $('#sat').onclick = () => { if (!map) return; const base = usingCarto ? carto : street; satOn = !satOn; (satOn ? base : sat).remove(); (satOn ? sat : base).addTo(map); $('#sat').textContent = satOn ? '🗺 Street' : '🛰 Satellite'; };

  const icon = p => { const [c, e] = CAT[p.category] || CAT.academic; return L.divIcon({ className: '', iconSize: p.indoor ? [36, 36] : [30, 30], iconAnchor: p.indoor ? [18, 36] : [15, 30],
    html: '<div class="mk ' + (p.indoor ? 'in' : '') + '" style="background:' + c + '"><span>' + e + '</span></div>' }); };
  const fmt = m => m >= 1000 ? (m / 1000).toFixed(1) + ' km' : m + ' m', mins = s => Math.max(1, Math.round(s / 60)) + ' min';

  function visible() { const t = text.toLowerCase(); return places.filter(p => (cat === 'all' || p.category === cat) && (!t || (p.name + ' ' + (p.description || '')).toLowerCase().includes(t))); }
  function draw() {
    const v = visible();
    $('#cats').innerHTML = ['all', ...Object.keys(CAT)].map(c => '<button class="chip ' + (c === cat ? 'on' : '') + '" data-c="' + c + '">' + (c === 'all' ? 'All' : c[0].toUpperCase() + c.slice(1)) + '</button>').join('');
    $('#plist').innerHTML = v.map(p => '<button data-id="' + esc(p.id) + '" class="' + (sel && sel.id === p.id ? 'on' : '') + '"><b>' + (p.indoor ? '🏢 ' : '') + esc(p.name) + '</b><br><span class="sub">' + esc(p.category) + '</span></button>').join('') || '<p class="sub">No places match.</p>';
    if (!map) return;
    Object.values(markers).forEach(m => m.remove()); markers = {};
    v.filter(p => p.lat != null).forEach(p => { markers[p.id] = L.marker([p.lat, p.lng], { icon: icon(p), title: p.name, keyboard: true }).addTo(map).on('click', () => choose(p.id, false)); });
  }
  function detail() {
    const p = sel; if (!p) return;
    $('#detail').innerHTML = '<div class="lab">' + esc(p.category) + (p.verified ? '' : ' · <span class="pill pill-warn">approximate position</span>') + '</div><div class="hero-title" style="font-size:20px">' + esc(p.name) + '</div>' +
      '<p style="margin:6px 0">' + esc(p.description || '') + '</p>' +
      (p.hours ? '<p class="sub">🕒 ' + esc(p.hours) + '</p>' : '') + (p.phone ? '<p class="sub">📞 ' + esc(p.phone) + '</p>' : '') +
      (p.services && p.services.length ? '<div class="row" style="margin:8px 0">' + p.services.map(s => '<span class="pill">' + esc(s) + '</span>').join('') + '</div>' : '') +
      '<div class="row" style="margin-top:10px">' + (p.indoor ? '<a class="btn primary" href="map.html?b=' + esc(p.id) + '">🗺 Open floor plans</a>' : '') + '<button class="btn" id="go">🧭 Walking directions</button></div><div id="rt" class="sub" style="margin-top:8px" aria-live="polite"></div>';
    $('#go').onclick = directions;
  }
  function choose(id, pan = true) {
    sel = places.find(p => p.id === id); if (!sel) return; draw(); detail();
    if (map && sel.lat != null) { if (pan) map.setView([sel.lat, sel.lng], Math.max(map.getZoom(), 18)); }
    history.replaceState(null, '', '?place=' + encodeURIComponent(id));
  }
  async function directions() {
    if (!sel || sel.lat == null) return; const rt = $('#rt'); rt.textContent = 'Finding the way…';
    const from = me || CENTER;
    try {
      const r = await Api.route(from, [sel.lat, sel.lng]);
      if (map) { if (routeLayer) routeLayer.remove(); routeLayer = L.polyline(r.coordinates, { color: '#FF4C4C', weight: 5, opacity: .85, dashArray: r.real ? null : '8 8' }).addTo(map); map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] }); }
      rt.textContent = fmt(r.distance) + ' · about ' + mins(r.duration) + ' on foot' + (me ? '' : ' (from the campus centre — tap “My location” for a route from you)') + (r.real ? '' : ' · straight-line estimate');
    } catch (e) { rt.textContent = e.message; }
  }
  let watchId = null, meMarker = null, meCircle = null, follow = true;
  function setStatus(t) { let el = $('#gps'); if (!el) { el = document.createElement('p'); el.id = 'gps'; el.className = 'sub'; el.setAttribute('aria-live', 'polite'); el.style.margin = '0 0 8px'; $('#cats').after(el); } el.textContent = t; }
  function stopGps() { if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; $('#loc').textContent = '🎯 My location'; }
  function onFix(pos) {
    me = [pos.coords.latitude, pos.coords.longitude]; const acc = pos.coords.accuracy || 0, on = inCampus(me);
    if (map) {
      if (!meMarker) { meMarker = L.marker(me, { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [16, 16] }), keyboard: false, zIndexOffset: 1000 }).addTo(map); meCircle = L.circle(me, { radius: acc, color: '#2563EB', weight: 1, fillOpacity: .1, interactive: false }).addTo(map); }
      else { meMarker.setLatLng(me); meCircle.setLatLng(me).setRadius(acc); }
      if (on && follow) map.setView(me, Math.max(map.getZoom(), 18));
    }
    setStatus(on ? '📡 You are on campus · accuracy ±' + Math.round(acc) + ' m' : '📡 You are outside the campus (' + me[0].toFixed(4) + ', ' + me[1].toFixed(4) + ') — directions start from the campus centre.');
    if (!on) me = null;   // routes from outside the campus make no sense on a campus-only map
  }
  $('#loc').onclick = () => {
    if (!navigator.geolocation) return Shell.toast('Geolocation is not supported here', true);
    if (!window.isSecureContext) Shell.toast('GPS needs https:// (or localhost) in most browsers', true);
    if (watchId != null) { stopGps(); setStatus('GPS tracking stopped.'); return; }
    $('#loc').textContent = '⏹ Stop tracking'; setStatus('Looking for your GPS position…'); follow = true;
    watchId = navigator.geolocation.watchPosition(pos => { const first = !meMarker; onFix(pos); if (first && sel) directions(); }, err => { stopGps(); setStatus(err.code === 1 ? 'Location permission denied — allow it in the browser to see yourself on the map.' : 'Could not get your location.'); Shell.toast(err.code === 1 ? 'Location permission denied' : 'Could not get your location', true); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 });
  };
  if (map) map.on('dragstart', () => { follow = false; });
  $('#q').addEventListener('input', e => { text = e.target.value; draw(); });
  document.addEventListener('click', e => { const c = e.target.closest('[data-c]'); if (c) { cat = c.dataset.c; draw(); } const b = e.target.closest('#plist [data-id]'); if (b) choose(b.dataset.id); });

  try { places = await Api.places(); } catch (e) { $('#plist').textContent = e.message; return; }
  draw();
  const want = new URLSearchParams(location.search).get('place'); if (want) choose(want);
})();
