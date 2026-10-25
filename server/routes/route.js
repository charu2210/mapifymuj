/* Walking route for the outdoor map. Uses OpenRouteService when ORS_API_KEY is set (key stays on the server),
 * otherwise returns a straight-line estimate and says so (`real:false`). */
const express = require('express'), cfg = require('../config'), { HttpError, wrap } = require('../util/http');
const pt = s => { const [a, b] = String(s || '').split(',').map(Number); if (!(a >= -90 && a <= 90 && b >= -180 && b <= 180)) throw new HttpError(400, 'Use lat,lng'); return [a, b]; };
const hav = ([a1, b1], [a2, b2]) => { const R = 6371000, t = x => x * Math.PI / 180, dA = t(a2 - a1), dB = t(b2 - b1);
  const h = Math.sin(dA / 2) ** 2 + Math.cos(t(a1)) * Math.cos(t(a2)) * Math.sin(dB / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

module.exports = () => {
  const r = express.Router();
  r.get('/route', wrap(async (req, res) => {
    const from = pt(req.query.from), to = pt(req.query.to);
    const straight = hav(from, to);
    if (cfg.orsKey) {
      try {
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
        const u = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${encodeURIComponent(cfg.orsKey)}&start=${from[1]},${from[0]}&end=${to[1]},${to[0]}`;
        const resp = await fetch(u, { signal: ctl.signal, headers: { Accept: 'application/geo+json' } }); clearTimeout(t);
        if (resp.ok) {
          const f = (await resp.json()).features?.[0];
          if (f) return res.json({ real: true, distance: Math.round(f.properties.summary.distance), duration: Math.round(f.properties.summary.duration),
            coordinates: f.geometry.coordinates.map(([lng, lat]) => [lat, lng]) });
        }
      } catch (_) { /* fall through to straight-line */ }
    }
    res.json({ real: false, distance: Math.round(straight), duration: Math.round(straight / 1.3), coordinates: [from, to] });
  }));
  return r;
};
