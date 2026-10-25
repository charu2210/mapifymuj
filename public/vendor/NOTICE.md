# Bundled third-party code

| Path | Project | Version | Licence |
|---|---|---|---|
| `leaflet/` | Leaflet | 1.9.4 | BSD-2-Clause |
| `tesseract/tesseract.min.js`, `worker.min.js` | Tesseract.js | 5.1.1 | Apache-2.0 |
| `tesseract/tesseract-core-*.wasm.js` | Tesseract.js-core (Tesseract OCR compiled to WebAssembly) | 5.1.1 | Apache-2.0 |
| `tesseract/lang/eng.traineddata.gz` | Tesseract "best" English model (`@tesseract.js-data/eng`, 4.0.0_best_int) | 1.0.0 | Apache-2.0 |
| `pdfjs/` | PDF.js (legacy build) | 4.10.38 | Apache-2.0 |

Used only by the timetable importer (`import.html`): the screenshot / PDF is read in the browser; nothing is uploaded.
Refresh with `npm run vendor:ocr`.
