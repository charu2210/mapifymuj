/* Copies the OCR / PDF libraries used by the timetable importer from node_modules into public/vendor/ (like Leaflet, they are
 * bundled so the app needs no CDN and the student's screenshot never leaves the browser).   npm run vendor:ocr            */
const fs = require('fs'), path = require('path');
const nm = p => path.join(__dirname, '..', 'node_modules', p), out = p => path.join(__dirname, '..', 'public', 'vendor', p);
const copy = (from, to) => { fs.mkdirSync(path.dirname(out(to)), { recursive: true }); fs.copyFileSync(nm(from), out(to)); console.log('  ', to.padEnd(46), (fs.statSync(out(to)).size / 1024).toFixed(0).padStart(6), 'KB'); };
copy('tesseract.js/dist/tesseract.min.js', 'tesseract/tesseract.min.js');
copy('tesseract.js/dist/worker.min.js', 'tesseract/worker.min.js');
copy('tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract/tesseract-core-simd-lstm.wasm.js');
copy('tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract/tesseract-core-lstm.wasm.js');
copy('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'tesseract/lang/eng.traineddata.gz');
copy('pdfjs-dist/legacy/build/pdf.min.mjs', 'pdfjs/pdf.min.mjs');
copy('pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'pdfjs/pdf.worker.min.mjs');
