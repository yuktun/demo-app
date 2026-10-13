# 字母譜工作室

An independent Traditional Chinese editor for letter-note, octave-mark and chord-grid scores. The editable custom notation is the primary view. A local score viewer and practice companion remains at `companion.html`.

## Run locally

Serve the repository's `dist/` directory over HTTP/HTTPS, then open `/practice/`. For example, `python -m http.server 8000 --directory dist`. Do not open ES modules with `file://`. All runtime assets are relative and local; the editor has no network connections, accounts, analytics, microphone, audio upload, or API keys.

For editor automatic saving, use a browser with Web Locks over HTTPS or localhost. Ordinary HTTP can run the editor in memory with JSON export, and shows the missing-save capability immediately. Both apps generate local record IDs even when `crypto.randomUUID` is unavailable; these IDs are not security tokens. This fallback does not enable automatic editor saving without Web Locks.

## Editor

- Add, edit and delete melody notes, accidentals, literal upper dots/lower lines, chord names, explicit rests, and uninterpreted symbols in either lane.
- Edit beat positions, source-grid indices (including fractional indices), or relative horizontal positions. Unknown durations stay `null`; empty melody bars stay empty. Grid indices do not assert rhythm.
- Add/delete pages and bars, reorder bars, change bar labels/counts/grid subdivisions, and edit notes and key labels. Key labels are metadata: changing them does not transpose anything.
- Drafts require Apply. Bar and event drafts have independent lifetimes and can be applied in either order. Deleting an event preserves the bar draft; undo/redo preserves drafts when their editing target still exists. Leaving or removing that target asks before discarding. Undo/redo retains up to 40 recent edits within the open session, bounded by a memory budget; import/new-score replacement remains undoable.
- Browser-local automatic save after applied changes, JSON import/export with confirmation, readable tablet/phone layouts, focus view, and all-page browser print/PDF output.
- Controls use `touch-action: manipulation`; score-area pinch zoom remains enabled. No maximum-scale or user-scalable restriction is applied.
- The app does not recognize staff PDFs, transcribe YouTube/audio, infer chords, assign absolute octave numbers, or play the score. This editor is the correction/output foundation, not a completed automatic transcription system.

The bundled two-bar demonstration and automated test fixtures are original. No private score, repertoire, background, or source identifier is included.

## Import and lossless source preservation

Two JSON formats are accepted, with a 2 MB limit:

1. Native `format: "letter-score", version: 1`, containing metadata and `pages[].measures[].events[]`.
2. A manually transcribed `documentType: "editable-letter-note-chord-score", schemaVersion: "1.0.0"` document. See [FORMAT.md](FORMAT.md).

Native and transcription formats preserve unknown metadata at every document level. The source adapter preserves the original document, source/encoding/verification metadata, fractional positions, unknown durations and literal uninterpreted marks. An unchanged source import exports the original JSON structure. Edits are projected onto that structure, while unrelated fields and original `sourceSpelling` remain intact. Edited exports set verification status to `edited_needs_review`; prior counts, original spelling and source metadata are historical, not a fresh verification. Source collections and stable IDs are required, and wrong-lane event types reject before replacement. Embedded source documents receive the same validation. A generic source-schema fixture exercises this contract.

The 2 MB budget is measured in UTF-8 bytes using the actual indented backup representation. Accepted states and emitted backups share the byte limit, including CJK text and retained metadata. Export uses that same serializer, so accepted edits cannot silently create an oversized, non-importable backup.

## Persistence and privacy

The editor uses only localStorage key `letter-score-editor-v1`; the companion uses IndexedDB database `keyboard-practice-v1`. Other applications' storage is untouched. Editor writes are asynchronous and serialize the complete compare/write operation with a named Web Lock across tabs. A stale writer is rejected before overwriting the winner. On browsers/origins without Web Locks, saving fails safely with a visible explanation; editing/export remain available in memory. Use a supporting HTTPS browser (or localhost). There is no unsafe unlocked fallback. Storage failure is visible, corrupt data is not silently overwritten, and conflicting updates prompt export/reload.

Local browser data is not a backup or device sync. Clearing site data, storage eviction or private browsing can lose it. Export regularly. JSON contains the score and annotations, including source metadata for imported transcriptions. Keep private files and screenshots outside the checkout. `.gitignore` adds safeguards for score files and common backup names.

Limits: 100 pages, 2,000 bars, 10,000 events, 200 events per bar, 2 MB JSON. Companion limits: 20 MB per score file, 40 MB per batch, 30 images or one PDF per song, 500 PDF pages, 50 songs, 100 sections per song, 500 retained history entries, 60 MB backup.

## Validation and review

Run `node --test tests/*.test.mjs` from the repository root. The integrated repository has 83 passing tests, including native/source metadata roundtrips, malformed source rejection, byte-budget boundaries, locked concurrent writes, obsolete metronome-resume rejection, compatible local record IDs, and existing application regressions. `npm run check` checks the existing apps; additionally run `node --check` on the practice/editor JavaScript modules.

Browser suites: `node tests/editor-browser.mjs` and `node tests/practice-browser.mjs`. Install Playwright in a separate development directory or provide `PLAYWRIGHT_MODULE` pointing to its `index.mjs`. Set `PRACTICE_BROWSER_PATH` to an installed Chromium/Edge executable if needed. `PRACTICE_QA_DIR` chooses an output directory outside the repository.

`node tests/review-regressions.mjs` adds the independent review's targeted UI, persistence and print cases. It requires Poppler `pdfinfo` and `pdftoppm` on PATH, or `PDFINFO_PATH` / `PDFTOPPM_PATH`. It tests the actual Print button and direct screen-to-PDF flow without preparing print media first. PDF page counts and rendered PNGs supplement layout bounds: the original two-bar demo uses one page; a synthetic 46-bar fixture uses eight. Print tracks are measured off-screen at the fixed A4 landscape printable width and are bounded even for near-coincident source positions. Logical source pages can continue onto additional physical sheets. Browser print settings and hardware printer margins can change final pagination.

`node tests/followup-regressions.mjs` tests new-event drafts through bar Apply, Undo and Redo; 40-character CJK symbols/chords through direct PDF generation, card bounds, accessible labels and extracted text; and startup/edit/export on an actual insecure HTTP origin mapped only to the local test server. It uses bundled PDF.js for text extraction and Poppler `pdftoppm` (or `PDFTOPPM_PATH`) for visual evidence. Long printed tokens wrap within their card at the normal print font size, preserving the full literal text.

Both browser suites pass using Playwright 1.64.0 and headless Edge. The editor suite covers CRUD, unsaved drafts, undo/redo, page/bar navigation, reload recovery, source-schema roundtrip and edited verification, malformed JSON, inert HTML text, print PDF, 820x1180 and 1180x820 tablet layouts, 320/390 px phones, quota/unavailable/corrupt storage and tab conflicts. Screenshots were inspected. These are browser simulations, not physical iPad or Safari tests.

The companion suite covers repeated timer start/pause and refresh recovery, original two-page PDF navigation/zoom, touch controls, repeated metronome toggles, actual Web Audio context suspension and simulated visibility changes, malformed score/backup imports, cancelled/confirmed backup roundtrip, quota/unavailable storage, tab conflicts, and existing app entry points. The stale persisted running flag and an uncaught transaction-write exception were fixed during testing.

Physical iPad Safari file selection/download, pinch/double-tap behavior, hardware audio interruptions and print pagination remain device checks. Transcription adapter tests use original generic fixtures; they do not establish visual fidelity for an arbitrary imported score. Check imported notes, marks and source positions against your own reference before relying on the result.

## Companion and vendor

The optional companion offers local PDF/raster viewing, plans, notes, configurable timing, explicit Web Audio metronome, self-reported history and backups. It pauses timer/audio when hidden, restores checkpoints paused, and never automatically resumes sound. Background/lock-screen audio is not promised; up to five seconds after a checkpoint may be lost on abrupt close.

`vendor/` contains PDF.js / pdfjs-dist 6.4.299 modules, worker, CMaps, standard fonts and WASM assets. Apache-2.0: [vendor/LICENSE](vendor/LICENSE); upstream https://github.com/mozilla/pdf.js. Asset-specific licenses are preserved in vendor directories.

This application is isolated under `dist/practice/`; existing applications and their storage remain independent.
