# 聽頁 · 中文朗讀

A dependency-free, mobile-first Chinese text reader. Traditional Chinese (Hong Kong) interface, local text import, automatic chapters and browser-provided speech.

## Run

Serve `dist/` over HTTP or HTTPS. For example:

```sh
python3 -m http.server 8000 --directory dist
```

Open the server in a browser. ES modules will not reliably load from a `file://` URL.

## Add to family-helper

This artifact is independent. Do not read or depend on existing application data.

- Add only a new `novel-reader/` folder in the existing repository.
- For a plain static GitHub Pages repository, copy the four files from `dist/` into `novel-reader/`. Asset URLs are relative, so `/family-helper/novel-reader/` works without root-path rewrites.
- If the existing repository builds a frontend, put those four files into a new `public/novel-reader/` (or its existing public-assets equivalent) so the normal build preserves them. Inspect only the build configuration needed to identify that location. Do not refactor the application or add navigation without approval.
- Keep `tests/`, `package.json`, and this README in the new feature folder if appropriate. Tests expect the `dist/` layout; adjust only their relative import if flattening assets.
- No server, package installation, API key, network integration, or new GitHub repository is required.
- Repository content contains only an explicitly labelled original sample, never the user's novel.
- No Site has been registered or published. No repository has been changed or pushed by this build task.

## Features

- UTF-8, Big5 and GB18030/GBK text-file decoding. TXT and plain-text Markdown only.
- Chinese numbered chapter headings, English `Chapter N`, and common preface/epilogue headings.
- Foreground continuous speech across segments and chapters, with play, pause, stop, previous/next segment, chapter restart, speed, local Chinese voice choice and preview.
- Segment highlighting, optional auto-follow, font size control, responsive mobile chapter drawer.
- Multiple books in IndexedDB; each book's reading position and preferences in localStorage. A book picker in the chapter drawer switches between saved books.
- Browser voices are allowed only when `localService === true` and the language is Chinese/Cantonese. No remote voice option or silent remote fallback.
- Speech callbacks and timers are guarded by a generation and current utterance identity. Cancels never advance reading. A stalled utterance pauses for manual retry.
- The page pauses when hidden. It does not promise lock-screen, background or offline playback.
- A restrictive content security policy disallows network requests from app JavaScript. Imported text is not uploaded; local storage is not a backup or device sync.

## Validation performed

`npm test`: 16 passing deterministic tests cover parser, empty/bad/oversized input, bounded surrogate-safe chunks, chapter traversal, restore position clamping, local voice gate, continuous completion, stale cancellation callbacks, rapid controls, new-book replacement, repeated boundary resume, missing voice, stalled playback and explicit restart after completion.

`npm run check`: syntax checks passed for both modules.

Local asset paths and HTML/JavaScript element ID references were checked.

No actual iPhone, browser speech engine, DOM visual rendering, or WebMCP runtime verification was available in the cloud build environment. Previous cloud preview access was denied and browser infrastructure was unavailable; no alternate route was used to bypass that restriction. The local executor should perform permitted browser checks before calling the integration fully verified.

## Remaining device checks

1. Open at approximately 390 px and desktop width; check dialogs, chapter drawer, touch targets and scroll/fixed-player overlap.
2. Import a real UTF-8 Chinese TXT; try Big5/GB18030 files using the corresponding selector; reject a PDF/empty/garbled file.
3. Confirm actual local voices. Tap Play, repeatedly pause/play/skip, change speed/voice, move chapters, and complete the final chapter.
4. Lock screen, switch apps, receive an interruption, return and tap Play. Expect foreground-only and possible repetition of the current phrase.
5. Refresh and verify book, chapter/segment, completion state and preferences. Test private browsing, unavailable IndexedDB and localStorage quota failure; the reading session must remain usable and clearly report unsaved state.
6. Optional WebMCP chapter-navigation tool is feature-detected. Validate only in a permitted browser exposing `document.modelContext`; unsupported browsers do not need it.

## Limits

20 MB per imported file and 8 million characters per book. Large books may take a moment to parse and the total library is limited by browser storage. Clearing browser data, storage eviction or private mode can remove it. Voice availability and speech quality depend on the operating system/browser; browser-labelled local voices are not an independent audit of the OS speech engine. Native speech word boundaries are inconsistent; resume may repeat part of a segment. No copyrighted novel is bundled.
