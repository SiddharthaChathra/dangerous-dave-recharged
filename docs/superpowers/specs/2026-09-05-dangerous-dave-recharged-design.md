# Dangerous Dave: Recharged — Design Spec

Date: 2026-09-05
Status: Approved for planning

## Summary

An original, browser-based side-scrolling platformer inspired by the classic
platforming formula of 1988's *Dangerous Dave* (run/jump/collect/avoid-hazards
gameplay shape only). No original Dangerous Dave source code, sprites, sounds,
levels, or branding are used — all art, audio, code, levels, and branding are
newly created for this project.

Working title: **Dangerous Dave: Recharged**. Repo: `dangerous-dave-recharged`
under GitHub account `SiddharthaChathra`, public.

## Scope: Milestone 1 (this build)

Full production pipeline (engine, physics, UI, audio, mobile controls, save
system, tests, CI, GitHub Pages deploy) built and verified end-to-end, with a
trimmed content set so every piece is actually finished and tested rather than
partially stubbed:

- 3 levels (not 5): Training Grounds, Industrial Ruins, Neon Caverns
- 3 enemy archetypes (not 5): Patrol, Flying, Chase
- Everything else in the original brief (screens, persistence, audio,
  accessibility basics, responsive/touch controls, CI/CD) is in scope at full
  quality, not reduced.

**Explicitly deferred to Milestone 2** (follow-up, not part of this pass):
Sky Fortress + Final Challenge levels, Stationary-hazard + Fast enemy
archetypes, deeper accessibility audit, additional VFX/polish pass.

## Tech Stack

- **Vite** + **TypeScript** — build tooling, static output, GitHub Pages friendly
- **Phaser 3** — scene graph, Arcade Physics, sprite animation, camera,
  particles, input
- Plain **HTML/CSS** (no framework) for DOM menu/HUD overlays above the canvas
- **Vitest** — unit tests
- **Playwright** — browser E2E smoke tests
- No backend; all persistence via `localStorage`

Rationale: Phaser provides tested 2D physics/camera/animation primitives so
effort goes into game feel and content, not reinventing collision detection.
DOM overlays avoid fighting Phaser's canvas with a second UI renderer (React
was considered and rejected for the core game loop — see chat discussion).

## Architecture / Folder Structure

```
src/
  game/
    core/          Game bootstrap, GameConfig, constants, EventBus
    scenes/        Boot, Preload, MainMenu, Play, GameOver, LevelComplete
                    (Pause is a DOM overlay + scene pause, not a separate Phaser scene)
    entities/       Player, EnemyBase, PatrolEnemy, FlyingEnemy, ChaseEnemy,
                    Collectible, Checkpoint, Hazard
    systems/        InputController (keyboard+touch unified), CameraController,
                    SaveSystem, AudioSystem (procedural WebAudio), ParticleFX
    levels/         level001.ts, level002.ts, level003.ts, LevelLoader
  ui/               DOM overlays: MainMenu, HUD, PauseMenu, GameOverScreen,
                    LevelCompleteScreen, SettingsPanel, TouchControls
                    styles/ (theme tokens: dark default + light), theme.ts
  utils/            math/physics helpers, types
tests/              Vitest unit tests (physics, collision, scoring, enemy FSM, save)
e2e/                Playwright specs
public/             favicon, manifest
.github/workflows/  ci.yml (test+build), deploy.yml (or combined)
.claude/game-progress.md   lightweight progress tracker (per user instructions)
ASSETS.md           asset/audio sourcing + license statement
README.md
```

Game logic (Phaser) and DOM UI communicate through a small typed `EventBus`
(e.g. `score:changed`, `player:died`, `level:complete`, `game:pause`) — Phaser
scenes never reach into the DOM and vice versa.

## Player Feel (tunable constants in `core/constants.ts`)

- Run: acceleration ~1800 px/s², max run speed ~220 px/s, ground friction/decel
  ~1600 px/s²
- Gravity: tuned so jump apex ≈ 0.4s
- Jump velocity: tuned to clear a 2.5-tile gap at max run speed
- Coyote time: 100ms after leaving ground
- Jump buffer: 120ms before landing
- Air control: ~60% of ground acceleration, no air friction beyond drag cap
- These are starting values — tuned by actually playtesting in-browser during
  the player-controller loop, not shipped as first guesses.

## Content

**Levels** (each: distinct palette + parallax layers, 1 checkpoint minimum,
5–8 collectibles, 1 secret/rare collectible, clear start/goal):

1. *Training Grounds* — flat-to-rolling terrain, basic gaps/spikes, teaches
   run/jump/coyote/buffer. No enemies or 1 simple Patrol enemy at the end.
2. *Industrial Ruins* — moving platforms, a falling/crumbling platform,
   Patrol + Flying enemies, more hazard density.
3. *Neon Caverns* — verticality, Chase enemy introduced, combined hazard +
   enemy sections, one secret branching path.

**Enemies** (finite-state: Idle → Patrol/Fly → Chase(if applicable) → Hurt →
Dead):

All three enemy archetypes are avoid-only hazards (touch damages the player;
no stomp-defeat mechanic), matching the "avoid enemies" formula named in the
brief and keeping enemy interaction rules consistent and simple to tune:

- **Patrol** — walks a fixed path between two points, reverses at edges/walls.
- **Flying** — sine-wave vertical patrol path, ignores ground collision.
- **Chase** — idle until player enters detection radius, then pursues along
  ground within a bounded leash range, returns to patrol/idle if player
  escapes.

**Collectibles** — common gems (score value), 1 rare/secret collectible per
level (bonus score + tracked separately for level-complete rating).

**Systems** — score, lives (start 3), damage + respawn at last checkpoint,
per-level timer, level-complete performance rating (time + collectibles
collected vs total), game over when lives exhausted, high score persisted.

## UI/UX

Screens: Start (logo, Play, Level Select, Settings, Controls, Credits), HUD
(score, lives, collectibles, level progress, timer, pause button), Pause
(resume/restart/settings/exit), Game Over (final score, best score, retry,
level select, main menu), Level Complete (score, time, collectibles,
performance rating, continue).

Theme: dark (default) + light, both intentionally designed (not inverted),
token-based CSS variables, persisted choice. Motion: tasteful transitions,
`prefers-reduced-motion` respected — reduces/removes non-essential animation.

Controls: keyboard (Arrow/WASD move, Space jump, Esc pause) always active;
translucent touch D-pad + jump button shown only on coarse-pointer/touch
devices via `(pointer: coarse)` media query, not user-agent sniffing.

## Audio

Procedural Web Audio only (oscillator/noise-based synthesis) — no downloaded
sample libraries — for jump, coin/collect, damage, enemy-defeat, checkpoint,
level-complete, UI click, and a simple generated background loop per level
mood. Music/SFX volume sliders + mute, persisted. Documented in `ASSETS.md`.

## Art

Original pixel-art-style sprites (player run/idle/jump/fall/hurt/death,
3 enemies, tiles, collectibles, parallax backgrounds per level) authored as
new assets for this project (hand-drawn/generated sprite sheets), not sourced
from any existing game. Documented in `ASSETS.md`.

## Persistence

Single versioned `localStorage` key (e.g. `ddr:save:v1`) containing: high
score, per-level best score/time, unlocked levels, audio settings (music/sfx
volume, mute), theme, reduced-motion preference. `SaveSystem` handles
load/migrate/save with safe defaults if the key is missing/corrupt.

## Testing

- **Vitest**: physics helpers (accel/decel/gravity integration), AABB
  collision resolution, scoring math, enemy FSM transitions, SaveSystem
  load/save round-trip and corrupt-data fallback.
- **Playwright**: smoke test — load game, reach main menu, start game, move
  and jump, pause/resume, verify HUD updates, reach a level-complete state
  via a debug/test seam (not RNG-dependent). Run against the Vite preview of
  the production build in CI.

## CI/CD & Deployment

GitHub Actions workflow(s) on push to `main` + `workflow_dispatch`:
checkout → setup Node → install → lint → typecheck → vitest → build (Vite
`base: '/dangerous-dave-recharged/'`) → Playwright E2E against built preview
→ upload Pages artifact → deploy via `actions/deploy-pages`. Permissions:
`contents: read`, `pages: write`, `id-token: write`; `environment:
github-pages`.

Risk flagged: enabling the repository's Pages "source: GitHub Actions" may
require a manual one-click step in GitHub's UI if not settable via the
available GitHub MCP tools — this will be attempted programmatically first
and surfaced clearly if manual action is required.

## Out of Scope / Non-Goals (Milestone 1)

- Levels 4–5 (Sky Fortress, Final Challenge)
- Stationary-hazard and Fast enemy archetypes
- Backend/server, accounts, multiplayer
- Any use of original Dangerous Dave assets/code/branding
