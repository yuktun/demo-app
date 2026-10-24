# Demo App Collection 🚀

A showcase repository containing various standalone demo applications and interactive web experiments.

## 📁 Apps Directory

| Application | Directory | Description | Platform |
|---|---|---|---|
| **PokéBonk** ⚡ | [`pokebonk/`](./pokebonk/) | 3D browser-based Pokémon roguelite horde survivor game (Offline & local play) | Desktop & Mobile |
| **Void Striker** 🚀 | [`space-shooter/`](./space-shooter/) | Retro-futuristic arcade space shooting game (HTML5 Canvas + Procedural Web Audio) | Desktop & Mobile (iOS Safari / PWA) |
| **安東尼大冒險** ⚔️ | [`anthony-adventure/`](./anthony-adventure/) | Pokémon-style mobile web RPG (Monster collection, exploration & turn-based combat) | Mobile (Android Chrome / iOS) & Desktop |
| **聽頁 · 中文朗讀** 📖 | [`dist/`](./dist/) | Dependency-free, mobile-first Chinese text reader with speech synthesis | Desktop & Mobile |

---

# 聽頁 · 中文朗讀

A dependency-free, mobile-first Chinese text reader. Traditional Chinese (Hong Kong) interface, local text import, automatic chapters and browser-provided speech.

## Run

### Matters article URL import (disabled pending setup)

A public-only article importer is included but not enabled. It retains source/author/
license metadata and reuses the reader's existing storage and TTS. Production
URL import remains disabled pending a permitted retrieval route and an approved
service host. See [importer setup and limits](importer/README.md). Paste and TXT/
Markdown import continue to work without any article service.

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
- Continuous speech across segments and chapters, with play, pause, stop, previous/next segment, chapter restart, speed, local Chinese voice choice and preview.
- Segment highlighting, optional auto-follow, font size control, responsive mobile chapter drawer.
- Multiple books in IndexedDB; each book's reading position and preferences in localStorage. A book picker in the chapter drawer switches between saved books, and imported books can be deleted locally.
- Browser voices are allowed only when `localService === true` and the language is Chinese/Cantonese. No remote voice option or silent remote fallback.
- Speech callbacks and timers are guarded by a generation and current utterance identity. Cancels never advance reading. A stalled utterance pauses for manual retry.
- Tab switching and minimizing no longer pause reading. Background speech is best effort and depends on the browser/OS keeping the page and speech engine active. Closing/navigating away still pauses and saves position. Returning never restarts speech automatically after user pause/stop or an interruption. Lock-screen, sleep, discarded tabs and mobile background playback are not guaranteed.
- A restrictive content security policy disallows network requests from app JavaScript. Imported text is not uploaded; local storage is not a backup or device sync.

## Validation performed

`npm test`: 16 passing deterministic tests cover parser, empty/bad/oversized input, bounded surrogate-safe chunks, chapter traversal, restore position clamping, local voice gate, continuous completion, stale cancellation callbacks, rapid controls, new-book replacement, repeated boundary resume, missing voice, stalled playback and explicit restart after completion.

`npm run check`: syntax checks passed for both modules.

Local asset paths and HTML/JavaScript element ID references were checked.

No actual iPhone, browser speech engine, DOM visual rendering, or WebMCP runtime verification was available in the cloud build environment. Previous cloud preview access was denied and browser infrastructure was unavailable; no alternate route was used to bypass that restriction. The local executor should perform permitted browser checks before calling the integration fully verified.

## Remaining device checks

Background lifecycle acceptance can be run with `npm run test:reader:background`
and an installed Playwright package (`PLAYWRIGHT_PATH`) / Chromium browser
(`BROWSER_PATH`). Its default mode uses synthetic speech and visibility events
to verify sequencing, explicit controls, interruption recovery and persistence.
Set `NATIVE_SPEECH=1` to open an isolated headed browser and test real window
minimize/restore and native local Chinese speech when available. Reports clearly
separate native-engine observations from mocks. Audible output, phone lock-screen,
sleep and tab-discard behavior still require device validation. Set
`BACKGROUND_QA_DIR` outside the repository for local reports/screenshots.

1. Open at approximately 390 px and desktop width; check dialogs, chapter drawer, touch targets and scroll/fixed-player overlap.
2. Import a real UTF-8 Chinese TXT; try Big5/GB18030 files using the corresponding selector; reject a PDF/empty/garbled file.
3. Confirm actual local voices. Tap Play, repeatedly pause/play/skip, change speed/voice, move chapters, and complete the final chapter.
4. On Windows, start speech then switch tabs or minimize/restore the browser. Expect continued speech where the browser supports it; no new utterance should be queued merely on restore. Test explicit pause/stop, chapter transitions and interruption followed by manual Play. Lock-screen/sleep/mobile background behavior remains platform-dependent. An interruption may repeat from the last reported word boundary, or the current segment if the engine supplies no boundaries.
5. Refresh and verify book, chapter/segment, completion state and preferences. Test private browsing, unavailable IndexedDB and localStorage quota failure; the reading session must remain usable and clearly report unsaved state.
6. Optional WebMCP chapter-navigation tool is feature-detected. Validate only in a permitted browser exposing `document.modelContext`; unsupported browsers do not need it.

## Limits

20 MB per imported file and 8 million characters per book. Large books may take a moment to parse and the total library is limited by browser storage. Clearing browser data, storage eviction or private mode can remove it. Voice availability and speech quality depend on the operating system/browser; browser-labelled local voices are not an independent audit of the OS speech engine. Native speech word boundaries are inconsistent; resume may repeat part of a segment. No copyrighted novel is bundled.


## Hong Kong transit app

The independent [transit ETA app](dist/transit/) lives at dist/transit/; the reader is unchanged. For setup, official data sources, scope and validation see [its README](dist/transit/README.md). On the existing GitHub Pages site, open [the transit app](https://yuktun.github.io/demo-app/dist/transit/).

This repository hosts multiple independent apps. Put every newly requested app in its own separate folder (for example `dist/<app-name>/` for a static app), preserve existing app folders and data, and use relative asset paths. Do not replace or relocate an existing app when adding another one.

## English practice

The independent [English practice app](dist/english/) provides short sessions with Traditional Chinese support. See [its README](dist/english/README.md) for local setup, storage limits and checks.

## Starlight Isles adventure

The independent [安東尼大冒險 app](dist/adventure/) adds an original mobile creature-catching adventure. See [its README](dist/adventure/README.md) for preview steps, controls, save behavior and tests.

## 安東尼大冒險 (Anthony's Adventure RPG)

The independent [Anthony's Adventure RPG](anthony-adventure/) lives at `anthony-adventure/` (and mirrored at `dist/anthony-adventure/`).
- **Demo Link**: [Open Anthony's Adventure](https://yuktun.github.io/demo-app/anthony-adventure/)
- **Features**: Original storyline from Maple Town to the Apex Temple, 14 original monsters, turn-based combat, capture mechanics, evolutions, procedural Web Audio synthesizer, and tactile mobile controls optimized for Android Chrome.
