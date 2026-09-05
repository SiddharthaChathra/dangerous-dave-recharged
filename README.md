# Dangerous Dave: Recharged

A modern, original browser-based side-scrolling platformer inspired by the
classic run/jump/collect/avoid-hazards formula of retro platform games.
This is a wholly new implementation — original code, procedural art, 
procedural audio, levels, and branding. It does not include any source code, 
sprites, sounds, levels, or branding from the original 1988 "Dangerous Dave."

## 🎮 Features

- **5 original levels** with distinct visual themes, increasing difficulty, and unique mechanics
- Responsive platforming with **coyote time** and **jump buffering** for forgiving controls
- **3 enemy archetypes** (patrol, flying, chase) with idle/patrol/chase/hurt/dead state machines
- **Moving platforms**, **falling platforms**, **hazards** (spikes), and **checkpoints**
- Score, lives, collectibles (gems + secrets), and **performance rating** (gold/silver/bronze)
- **Procedural Web Audio** sound effects and ambient music — no sample files
- **Procedural pixel-art** sprites generated at runtime — no external image assets
- **Dark/light themes**, **reduced-motion** support, keyboard + touch controls
- **Level select** with unlock progression and best-score tracking
- Local high-score and settings persistence (no account, no backend)
- **Parallax scrolling** backgrounds with environmental decorations
- **Particle effects**: dust, jump burst, landing, sparkle, enemy defeat, checkpoint, level-complete
- **Camera system**: smooth follow, dead-zone, look-ahead, shake on damage
- **Squash & stretch** player animations (idle, run, jump, fall, hurt, death)

## 🎯 Levels

| # | Name | Theme | New Mechanics |
|---|------|-------|--------------|
| 1 | Training Grounds | Forest | Movement, jumping, basic gaps |
| 2 | Industrial Ruins | Factory | Moving platforms, falling platforms, flying enemies |
| 3 | Neon Caverns | Underground neon | Chase enemies, vertical platforming |
| 4 | Sky Fortress | Sky/cloud | Heavy verticality, multiple platform types, all enemy types |
| 5 | Final Challenge | Lava/danger | Precision jumps, combat arenas, spike gauntlets, tower climbs |

## 🎮 Controls

| Action | Keyboard | Touch |
|--------|----------|-------|
| Move | Arrow keys or A/D | On-screen D-pad |
| Jump | Up arrow | Jump button |
| Pause | Escape | HUD pause button |

## 🛠 Tech Stack

- **Runtime**: [Phaser 3](https://phaser.io/) (Arcade Physics, Canvas/WebGL)
- **Language**: TypeScript
- **Bundler**: Vite
- **Testing**: Vitest (unit), Playwright (E2E)
- **UI**: Plain HTML/CSS DOM overlays + Phaser canvas (no React)
- **Fonts**: [Orbitron](https://fonts.google.com/specimen/Orbitron) (display), [Inter](https://fonts.google.com/specimen/Inter) (body)
- **Audio**: Procedural Web Audio API (no sample files)
- **Art**: Procedural canvas-generated pixel art
- **Backend**: None — fully static, deployable to GitHub Pages

## 🏗 Architecture

```
src/
  game/
    core/           EventBus, GameConfig, constants, audio singleton
    entities/       Player, enemies (Patrol/Flying/Chase), platforms, collectibles
    levels/         Level data, loader, registry, parallax
    scenes/         Boot → Preload → MainMenu → Play
    systems/        InputController, CameraController, AudioSystem, ParticleFX, SaveSystem
  ui/
    styles/         Design tokens, base, HUD, menus, touch controls
    *.ts            DOM overlay components (MainMenu, HUD, PauseMenu, Settings, etc.)
  utils/            Pure-function physics, collision, scoring, lives reducer
tests/              Vitest unit tests
e2e/                Playwright E2E smoke test
```

Game simulation and rendering live in `src/game/` (Phaser scenes, entities, systems).
DOM UI lives in `src/ui/`. Both sides communicate only through `src/game/core/EventBus.ts`.

## 💻 Local Development

```bash
npm install
npm run dev
```

## 🧪 Testing

```bash
npm run test       # Vitest unit tests (62 tests)
npm run typecheck   # TypeScript type-checking
npm run lint        # ESLint
npm run e2e         # Playwright E2E smoke test (requires build + preview)
```

## 📦 Production Build

```bash
npm run build
npm run preview
```

## 🚀 Deployment

Pushing to `main` runs GitHub Actions CI (lint, typecheck, test, build, E2E)
and deploys the production build to GitHub Pages via `.github/workflows/ci.yml`.

**Live URL**: [`https://siddharthachathra.github.io/dangerous-dave-recharged/`](https://siddharthachathra.github.io/dangerous-dave-recharged/)

## ⚡ Performance

Targets 60 FPS via Phaser's Arcade Physics and Canvas/WebGL rendering.
Particle effects are capped in count and disabled under reduced-motion.
Object pooling used for particles. No unnecessary DOM updates during gameplay.

## ♿ Accessibility

- Keyboard-navigable menus with visible focus states
- WCAG AA contrast in both dark and light themes
- `prefers-reduced-motion` support (disables animations and particles)
- Game state never depends on color alone
- Semantic HTML with ARIA labels on interactive elements
- Auto-focus on primary action buttons in overlay screens

## 📄 Asset Credits

See [ASSETS.md](ASSETS.md).

## 📜 License

MIT

## ⚠️ Disclaimer

This is an original, independent project inspired by the general mechanics
of classic 1980s platform games. It is not affiliated with, endorsed by,
or derived from the source code or assets of the original 1988 "Dangerous Dave."
All code, artwork, audio, levels, and branding are original creations.
