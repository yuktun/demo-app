# PokéBonk (Offline & Local Play)

A fully packaged local edition of [PokéBonk](https://pokebonk.com/) — the 3D browser-based Pokémon roguelite / horde survivor game.

## Features of Local Setup
- **100% Offline Capable**: Core bundles, 3D models (`.glb`), biomes, texture atlases, Web Audio SFX synth, icons, items, and Gen 1 Pokémon (1–151) sprites and cries are pre-downloaded locally.
- **On-Demand Auto-Caching Proxy**: Built-in HTTP server (`server.js` or `server.py`) transparently fetches any previously uncached Pokémon or sprite on the fly from the remote server and persists it to disk forever.
- **Local Progress Saving**: Game progress, unlocked Pokémon, achievements, high scores, and settings persist safely in your browser's local origin storage (`localStorage` & `indexedDB`).
- **One-Click Launch**: Run `start.bat` on Windows or use `npm start` / `python server.py --open`.

---

## Quick Start (Playing Locally)

### Option 1: Double-Click Launcher (Windows)
Double-click [`start.bat`](file:///c:/Users/yuktu/OneDrive/031.%20Technology/AI/Antigravity/demo-app/pokebonk/start.bat) in this folder. It will detect Node.js or Python, start the server, and automatically open your default browser to `http://localhost:8000`.

### Option 2: Using Node.js
```bash
npm start
```
*(Or `node server.js --open`)*

### Option 3: Using Python
```bash
python server.py --open
```

Once running, navigate to:
**[http://localhost:8000](http://localhost:8000)**

---

## Controls
- **Movement**: `W`, `A`, `S`, `D` or Arrow Keys / Left Analog Stick on Gamepad
- **Dash**: `Space` or `Shift` / Gamepad button
- **Attack**: Attacks fire automatically based on cooldowns, targeting nearby enemies
- **Ultimate**: Unleash charged special moves once your gauge is filled
- **Pause / Menu**: `Esc` or `P`

---

## Directory Structure
- `index.html` - Game canvas and UI entry point
- `server.js` - Node.js local streaming and auto-caching web server
- `server.py` - Python local streaming and auto-caching web server
- `start.bat` - 1-click Windows launcher
- `data/` - Pokémon stats, learnsets, moves, abilities, items, and translations
- `assets/` - 3D models, textures, biome atlases, fonts, audio, and sprites
- `download_all_assets.py` - Asset synchronization script for bulk downloads
- `tools/` - Development and inspection utilities
