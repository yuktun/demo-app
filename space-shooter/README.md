# VOID STRIKER // Retro Space Combat 🚀

A high-octane, retro-futuristic arcade space shooting game built entirely with HTML5 Canvas and the procedural Web Audio API. Zero external dependencies or missing assets.

![Game Preview](https://img.shields.io/badge/Arcade-Space%20Shooter-00f0ff?style=for-the-badge)
![Tech](https://img.shields.io/badge/HTML5-Canvas%20%2B%20Web%20Audio-f43f5e?style=for-the-badge)

---

## 🎮 How to Play

### Controls
| Action | Keyboard / Mouse | Touch Devices |
|---|---|---|
| **Maneuver Vessel** | `W`, `A`, `S`, `D` or `Arrow Keys` / Mouse cursor | Drag anywhere on screen |
| **Fire Blasters** | `Spacebar` / Left Click (or Auto-Fire) | Tap & hold screen |
| **EMP Smart Bomb** | `B` or `X` / Right Click | Bomb icon in HUD |
| **Toggle Auto-Fire** | `F` or Auto-Fire button | Tap Auto-Fire button |
| **Pause / Resume** | `Escape` or `P` | Pause menu |

---

## ⚡ Game Features

1. **Procedural Web Audio Engine (`audio.js`)**
   - Synthesizes all sound effects on the fly via the Web Audio API (lasers, explosions, shield deflections, powerup arpeggios, boss alarms).
   - Dynamic 16-step procedural synthwave soundtrack loop.
   - Zero MP3/WAV asset loading issues.

2. **Juicy Visuals & High-Performance FX (`particles.js`)**
   - 3-tier parallax starfield with drifting glowing nebulae and warp-speed effects.
   - Screen-shake feedback on heavy impacts, detonations, and boss encounters.
   - Glowing particle explosions, engine thruster exhaust trails, and floating combat text (+Score, Combo multipliers, Criticals).

3. **Multi-Tier Weapon & Upgrade Progression**
   - **Spread Blasters `[S]`**: Upgrades ship cannons up to Tier 5 (Single -> Dual -> Triple -> Quad -> 5-Way Omni Spread).
   - **Rapid Fire `[R]`**: Doubles firing rate with neon violet laser trails.
   - **Plasma Cannon `[P]`**: High-damage piercing energy spheres that cleave through enemy formations.
   - **Shield Battery `[+]`**: Recharges energy shield to 100% with protective deflector dome.
   - **Wingman Drone `[D]`**: Deploys an orbiting escort drone firing in tandem with your vessel.
   - **EMP Smart Bomb `[B]`**: Wipes out all enemy projectiles in a blinding shockwave and deals massive damage to all targets.
   - **Hull Repair `[H]`**: Restores 40 integrity points to the fighter's hull.

4. **Enemy Threat Matrix & Boss Encounters**
   - **Scout Drone**: Fast, swoops in oscillating formations and fires quick plasma needles.
   - **Interceptor**: High-agility strafer with aimed dual red lasers.
   - **Heavy Bomber**: High hull armor, unleashes 3-way explosive spread rounds.
   - **Dreadnought Titan (Boss)**: Enters every 5 sectors with an alert klaxon siren, 3 combat phases (twin cannon sweeps -> radial bullet hell -> enraged rapid bullet storm), and full boss health bar.

5. **Combo & Scoring System**
   - Rapidly defeating enemies builds a combo multiplier up to **x5**.
   - Persistent High Score saved across sessions via `localStorage`.

---

## 🚀 Running the Game

### Option 1: Direct in Browser
Simply double-click [`index.html`](./index.html) or open it directly in Google Chrome, Microsoft Edge, Firefox, or Safari.

### Option 2: Local HTTP Server (Play on PC or iPhone on same Wi-Fi)
Using Python:
```bash
python -m http.server 8000 --bind 0.0.0.0
```
- On PC: Open `http://localhost:8000`
- On iPhone (connected to same Wi-Fi): Open Safari and go to `http://<YOUR_PC_IP>:8000` (e.g. `http://192.168.1.112:8000`)

---

## 📱 Playing on iPhone (iOS Safari & PWA)

The game is optimized for iPhone:
1. **Touch Navigation**: Drag your thumb anywhere on the screen to pilot your fighter smoothly. The ship tracks your finger movements with zero obstruction.
2. **Dedicated Mobile Bomb Button**: Tap the floating glowing `💣 EMP` button or the HUD bomb pips with your thumb to detonate a screen-clearing smart bomb.
3. **Mobile Pause**: Tap the `⏸️` icon in the top HUD bar anytime.
4. **Full-Screen Web App (Standalone Mode)**:
   - In Safari on your iPhone, tap the **Share** button (box with upward arrow).
   - Scroll down and tap **"Add to Home Screen"**.
   - Tap **"Add"**.
   - Launch **Void Striker** from your iPhone home screen to play in distraction-free full-screen mode!

