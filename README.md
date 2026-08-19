# 🥋 HALLAND: Cyber-Karate Stickman Parkour

[![Platform](https://img.shields.io/badge/platform-HTML5%20Canvas%20%7C%20Web%20Audio-red.svg)](https://github.com/ConnorShih578/Halland)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Size](https://img.shields.io/badge/bundle%20size-227%20KB-brightgreen.svg)]()

A hyper-responsive, buttery-smooth 2D martial arts parkour platformer starring **Halland** — a Spider-Man superhero meets Erling Haaland martial arts stickman in a high-octane neon dojo saga.

---
##i kind of lost where the level selection mode went
## 🎮 Play Online
You can play the game directly in your browser with zero downloads:
👉 **[Play Halland on GitHub Pages](https://connorshih578.github.io/Halland/)**

---

## ⚡ Features
- **Fluid Kinematics & Procedural IK**: 2-bone analytic IK solver with harmonic spring-damper transitions and Verlet ribbon physics for Halland's blonde ponytail and black belt.
- **Precision Vex-Style Platforming**: 60FPS fixed-step physics, sub-pixel apex corner assist, 150ms coyote time, wall-sliding, and mid-air web zips.
- **Batman Arkham Freeflow Combat**: Automatic 6-hit combo progression (`Jab` ➔ `Straight Punch` ➔ `Snap Kick` ➔ `Spinning Backfist` ➔ `Flying Tornado Kick` ➔ `Dragon Uppercut`), reverse auto-aim, and Perfect Parry counters.
- **Cinematic Story Campaign**: 5 action-packed acts featuring animated cutscenes:
  - *Act 1: The Dojo Infiltration*
  - *Act 2: The Rooftop Gauntlet*
  - *Act 3: The Cyber Temple*
  - *Act 4: The Golden Pagoda*
  - *Act 5: Final Showdown with Giant LeBrown Jameson & MJ's Golden Shoe*
- **Procedural Infinite Endless Gauntlet**: Seamless chunk-streamed infinite runner tracking distance records and scores.
- **Custom BGM Audio Suite**: Zero-latency procedural Web Audio synthesizer + custom MP3 player uploader with real-time spectrum equalizer.
- **Featherweight Payload**: Only **227 KB total** uncompressed with **zero external dependencies**.

---

## 🕹️ Controls

### Keyboard:
| Action | Key |
| :--- | :--- |
| **Move Left / Right** | `A` / `D` |
| **Jump / Wall Vault** | `W` (or `Up Arrow`) |
| **Crouch / Low Slide** | `S` (or `Down Arrow`) |
| **Attack Combo** | `Spacebar` (or `E`) |
| **Parry / Block** | `S` (hold on incoming strike) |
| **Web Zip (Air)** | `Up Arrow` (or Swipe Up) |
| **Pause Game** | `Escape` / `P` |
| **Restart Checkpoint** | `R` |
| **Custom Music Modal** | `N` |
| **Toggle Audio** | `M` |

### Touch / Mobile:
- **Left Screen Area**: Virtual thumb joystick for movement and crouching.
- **Right Screen Area**: Tap for attack combo, directional swipes for special techniques, touch & hold for Perfect Parry.

---

## 🛠️ Local Development

Clone the repository and run any static HTTP server:

```bash
git clone https://github.com/ConnorShih578/Halland.git
cd Halland
python -m http.server 8085
```

Open `http://localhost:8085` in your browser.

---

## 📄 License
This project is licensed under the **[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/)**.

