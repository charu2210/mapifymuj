/* MapifyMUJ timetable importer — image preprocessing + OCR + PDF reading (all in the browser).
 *
 * Nothing is uploaded: the screenshot / PDF is read on the student's device with the bundled Tesseract.js and PDF.js
 * (public/vendor/…); only the details the student has confirmed are sent to the server.
 *
 * The pixel functions are pure (Uint8 grayscale buffers) so they are unit-tested in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MapifyOCR = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────── pure pixel helpers ───────── */
  /** RGBA → 8-bit luminance. */
  function toGray(rgba, w, h) {
    const g = new Uint8ClampedArray(w * h);
    for (let i = 0, p = 0; i < g.length; i++, p += 4) g[i] = (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) / 1000;
    return g;
  }
  function otsu(g) {
    const hist = new Array(256).fill(0); for (let i = 0; i < g.length; i++) hist[g[i]]++;
    let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sB = 0, wB = 0, best = 0, thr = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (!wB) continue; const wF = g.length - wB; if (!wF) break;
      sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; thr = t; }
    }
    return thr;
  }
  /**
   * Erase thin table borders (long, thin dark runs) so OCR sees text instead of boxes. Filled dark areas
   * (e.g. a teal header cell) are thicker than a border and are left alone. Returns a new buffer.
   */
  function removeGridLines(gray, w, h) {
    const out = Uint8ClampedArray.from(gray), dark = Math.min(190, Math.max(110, otsu(gray) + 25));
    const minLen = Math.max(80, Math.round(Math.max(w, h) / 10)), maxThick = Math.max(3, Math.round(w / 220));
    const isDark = i => gray[i] < dark;
    // long horizontal runs
    const hm = new Uint8Array(w * h), vm = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) { let x = 0; while (x < w) { if (!isDark(y * w + x)) { x++; continue; } let e = x; while (e < w && isDark(y * w + e)) e++; if (e - x >= minLen) hm.fill(1, y * w + x, y * w + e); x = e; } }
    for (let x = 0; x < w; x++) { let y = 0; while (y < h) { if (!isDark(y * w + x)) { y++; continue; } let e = y; while (e < h && isDark(e * w + x)) e++; if (e - y >= minLen) for (let k = y; k < e; k++) vm[k * w + x] = 1; y = e; } }
    // keep only the thin ones (vertical extent of a horizontal run ≤ maxThick; horizontal extent of a vertical run ≤ maxThick)
    for (let x = 0; x < w; x++) { let y = 0; while (y < h) { if (!hm[y * w + x]) { y++; continue; } let e = y; while (e < h && hm[e * w + x]) e++; if (e - y <= maxThick) for (let k = y; k < e; k++) out[k * w + x] = 255; y = e; } }
    for (let y = 0; y < h; y++) { let x = 0; while (x < w) { if (!vm[y * w + x]) { x++; continue; } let e = x; while (e < w && vm[y * w + e]) e++; if (e - x <= maxThick) out.fill(255, y * w + x, y * w + e); x = e; } }
    // line pixels' anti-aliased fringe: whiten dark pixels that now touch the erased line and are not part of text strokes
    return out;
  }

  /**
   * Header bars are often light text on a dark fill, which Tesseract reads poorly. Find large dark filled blocks and invert
   * them in place (stretching the fill to white) so every piece of text is dark-on-light. Returns a new buffer.
   */
  function normalizeDarkBlocks(gray, w, h) {
    const out = Uint8ClampedArray.from(gray), DARK = 150, seen = new Uint8Array(w * h), stack = new Int32Array(w * h);
    const minArea = Math.max(600, Math.round(w * h * 0.002));
    for (let s0 = 0; s0 < w * h; s0++) {
      if (seen[s0] || gray[s0] >= DARK) continue;
      let sp = 0, area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0; stack[sp++] = s0; seen[s0] = 1;
      while (sp) {
        const i = stack[--sp], x = i % w, y = (i - x) / w; area++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && !seen[i - 1] && gray[i - 1] < DARK) { seen[i - 1] = 1; stack[sp++] = i - 1; }
        if (x < w - 1 && !seen[i + 1] && gray[i + 1] < DARK) { seen[i + 1] = 1; stack[sp++] = i + 1; }
        if (y > 0 && !seen[i - w] && gray[i - w] < DARK) { seen[i - w] = 1; stack[sp++] = i - w; }
        if (y < h - 1 && !seen[i + w] && gray[i + w] < DARK) { seen[i + w] = 1; stack[sp++] = i + w; }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (area < minArea || area / (bw * bh) < 0.4 || bw < 40 || bh < 16 || bh > h * 0.6) continue;   // glyphs, thin shapes, photos
      const vals = []; for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) vals.push(255 - gray[y * w + x]);
      vals.sort((a, b) => a - b); const bg = Math.max(60, vals[Math.floor(vals.length * 0.6)]);          // inverted fill level
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * w + x; out[i] = Math.min(255, (255 - gray[i]) * 255 / bg); }
    }
    return out;
  }
  /** Everything done to a screenshot before OCR. */
  const prepare = (gray, w, h) => normalizeDarkBlocks(removeGridLines(gray, w, h), w, h);
  const invert = g => { const o = new Uint8ClampedArray(g.length); for (let i = 0; i < g.length; i++) o[i] = 255 - g[i]; return o; };
  const grayToRgba = (g, w, h) => { const o = new Uint8ClampedArray(w * h * 4); for (let i = 0, p = 0; i < g.length; i++, p += 4) { o[p] = o[p + 1] = o[p + 2] = g[i]; o[p + 3] = 255; } return o; };

  /** Merge OCR passes: where two words overlap keep the more confident one. */
  function mergeWords(...passes) {
    const all = [].concat(...passes.map(p => p || [])).sort((a, b) => (b.conf || 0) - (a.conf || 0)), kept = [];
    for (const w of all) {
      const dup = kept.some(k => {
        const ix = Math.min(k.x1, w.x1) - Math.max(k.x0, w.x0), iy = Math.min(k.y1, w.y1) - Math.max(k.y0, w.y0);
        return ix > 0 && iy > 0 && ix * iy > 0.4 * Math.min((k.x1 - k.x0) * (k.y1 - k.y0), (w.x1 - w.x0) * (w.y1 - w.y0));
      });
      if (!dup) kept.push(w);
    }
    return kept;
  }

  /* ───────── browser-only: file → words ───────── */
  const base = () => (document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/js\/[^/]*$/, '') : location.origin + location.pathname.replace(/[^/]*$/, ''));
  let BASE = null;
  const vendor = p => (BASE || (BASE = base())) + 'vendor/' + p;
  const loadScript = src => new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('Could not load ' + src)); document.head.appendChild(s); });

  async function ensureTesseract() {
    if (!window.Tesseract) await loadScript(vendor('tesseract/tesseract.min.js'));
    return window.Tesseract;
  }
  let workerP = null;
  async function ocrWorker(onProgress) {
    if (workerP) return workerP;
    const T = await ensureTesseract();
    workerP = T.createWorker('eng', 1, {
      workerPath: vendor('tesseract/worker.min.js'), corePath: vendor('tesseract/'), langPath: vendor('tesseract/lang/'),
      workerBlobURL: false, gzip: true, cacheMethod: 'none',
      logger: m => { if (onProgress && m.status === 'recognizing text') onProgress(m.progress); }
    }).then(async w => { await w.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' }); return w; });
    workerP.catch(() => { workerP = null; });
    return workerP;
  }

  function canvasOf(src, maxW) {
    const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height;
    const scale = Math.max(1, Math.min(3, 2000 / w0)) * (w0 > 3600 ? 3600 / w0 : 1);
    const c = document.createElement('canvas'); c.width = Math.round(w0 * scale); c.height = Math.round(h0 * scale);
    const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
    return { canvas: c, scale };
  }

  /** Image (HTMLImageElement / canvas / ImageBitmap) → word boxes in the ORIGINAL image's pixel units. */
  async function ocrImage(src, { onProgress } = {}) {
    const { canvas, scale } = canvasOf(src), w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d', { willReadFrequently: true });
    const gray = prepare(toGray(ctx.getImageData(0, 0, w, h).data, w, h), w, h);
    const worker = await ocrWorker(p => onProgress && onProgress(p));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const cx = c.getContext('2d'), img = cx.createImageData(w, h); img.data.set(grayToRgba(gray, w, h)); cx.putImageData(img, 0, 0);
    const { data } = await worker.recognize(c);
    return data.words.filter(x => x.text.trim() && x.confidence >= 30).map(x => ({
      t: x.text.trim(), conf: x.confidence, x0: x.bbox.x0 / scale, y0: x.bbox.y0 / scale, x1: x.bbox.x1 / scale, y1: x.bbox.y1 / scale
    }));
  }

  /** PDF → { words, canvas }. Text PDFs are read directly (exact, no OCR); scanned PDFs are rasterised and OCR'd. */
  async function readPdf(file, { onProgress } = {}) {
    const pdfjs = await import(vendor('pdfjs/pdf.min.mjs'));
    pdfjs.GlobalWorkerOptions.workerSrc = vendor('pdfjs/pdf.worker.min.mjs');
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false, disableFontFace: false }).promise;
    const page = await doc.getPage(1), vp = page.getViewport({ scale: 1 }), tc = await page.getTextContent();
    const words = tc.items.filter(i => i.str && i.str.trim()).map(i => {
      const h = Math.abs(i.height || i.transform[3]) || 10, x = i.transform[4], y = vp.height - i.transform[5];
      return { t: i.str.trim(), conf: 100, x0: x, x1: x + (i.width || h * i.str.length * 0.5), y0: y - h, y1: y };
    });
    const render = async scale => { const v = page.getViewport({ scale }), c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height); await page.render({ canvasContext: c.getContext('2d'), viewport: v }).promise; return c; };
    if (words.length >= 8) return { words, canvas: await render(1.2), pages: doc.numPages, text: true };
    const c = await render(2.2);                                      // scanned PDF
    return { words: await ocrImage(c, { onProgress }), canvas: c, pages: doc.numPages, text: false };
  }

  /** File (image or PDF) → { words, preview:canvas|img, pages, text:boolean } */
  async function readFile(file, opts = {}) {
    if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) return readPdf(file, opts);
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('That file could not be opened as an image.')); i.src = url; });
      return { words: await ocrImage(img, opts), preview: url, pages: 1, text: false };
    } catch (e) { URL.revokeObjectURL(url); throw e; }
  }

  return { toGray, otsu, removeGridLines, normalizeDarkBlocks, prepare, invert, grayToRgba, mergeWords, readFile, ocrImage };
});
