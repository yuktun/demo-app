# 安東尼大冒險 · 星潮群島

An original, dependency-free, mobile-first creature adventure in Traditional Chinese. This folder is a standalone static app; all assets and imports are relative. No accounts, external services, analytics, remote fonts or paid APIs.

## Preview

From the repository root:

```sh
python -m http.server 8000 --directory dist
```

Open `http://localhost:8000/adventure/`. On a phone on the same Wi-Fi, use `http://<computer-LAN-IP>:8000/adventure/` if the computer firewall permits local connections. Stop the server with Ctrl+C. Use HTTP rather than opening `index.html` directly. The app is also compatible with a subdirectory deployment such as `/demo-app/dist/adventure/`.

## Adventure

- Choose one of three original starters; collect 12 original creatures across five elements.
- Explore a safe harbor and four illustrated wilderness regions. Move using the touch direction pad or arrow/WASD keys; use the explicit exploration actions to find encounters and herbs.
- Elemental attacks, visible capture probabilities, weakening, guarding, healing, party switching, experience and a level-seven recovery move create turn-based decisions. Guardians telegraph heavy attacks.
- Three beacon trials unlock the summit guardian, a written ending and continued exploration. Two side quests recognize earlier progress and award rewards once.
- Three active companions plus 40 reserve slots. Reserve companions can be released outside battle after a confirmation naming the creature and level; party members cannot be released, and collection history is retained. This lets a full collection make room for new species. Free harbor healing and emergency capture supplies prevent loss or bankruptcy from blocking progress. Capture and guardian rewards help new companions catch up.

## Save and controls

Progress is saved after each accepted action to the app-specific `anthony-adventure-save-v1` key. The previous valid state is retained under its `-backup` key. The version-one schema validates IDs, ranges, progression, team and battle state; corrupt primary saves can recover from the backup. Storage failures display a warning and play can continue in memory. Export JSON regularly; browser storage is not device sync or a permanent backup.

The backup screen validates an import before asking to replace progress; an invalid import leaves the current game intact. A second tab changing the save pauses this tab and requires reload before continuing, avoiding stale writes. Returning from another app requires an explicit resume. There are no real-time combat timers. Sound is off by default, generated locally after a user gesture, and can be muted. Reduced-motion preferences are respected.

Touch controls use `touch-action` locally and throttle accepted game actions to prevent accidental double turns. The page remains zoomable, content can scroll normally, and directional keyboard controls prevent page scroll only while exploring. Portrait and landscape layouts account for safe-area insets.

## Validation

```sh
npm run test:adventure
npm run check:adventure
npm run test:adventure:browser
```

The browser suite requires a locally installed Playwright package and a Chromium-family browser. Set `PLAYWRIGHT_MODULE` to the absolute path of Playwright's `index.mjs`, and optionally `BROWSER_PATH` to a browser executable. It starts and stops its own localhost server. `ADVENTURE_QA_DIR` selects screenshot/report output. Neither Playwright nor a browser is a runtime dependency of the game.

Unit tests cover all starter campaigns, elemental combat, capture, telegraphs, rewards, economy, defeat recovery, deterministic restore, malformed imports and unavailable storage. The real browser suite exercises the complete campaign with UI input, mobile touch, reload, backups, recovery, and screenshots. See the test report for the actual run results; no claim of physical iPhone/Safari testing is made.

## Design boundaries

This is a complete first chapter with compact, illustrated map exploration, rather than a large tile collision world. Landmark actions are available from each region's controls, so the small-screen interface does not require precision tapping. Turn-based combat allows relaxed play on a phone. There is no automatic offline installation or guarantee of background operation. Every creature, map, name and story is original; no third-party game artwork or characters are included.
