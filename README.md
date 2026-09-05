# Dangerous Dave: Recharged

An original browser-based side-scrolling platformer inspired by the
classic run/jump/collect/avoid-hazards formula of retro platform games.
This is a wholly new implementation — original code, art, audio, levels,
and branding. It does not include any source code, sprites, sounds,
levels, or branding from the original 1988 "Dangerous Dave".

## Features

- Responsive platforming with coyote time and jump buffering
- 3 original levels with distinct visual themes and mechanics
- 3 enemy archetypes with idle/patrol/chase/hurt/dead state machines
- Score, lives, checkpoints, collectibles (including secret gems)
- Procedural Web Audio sound effects and music — no sample files
- Dark/light themes, reduced-motion support, keyboard + touch controls
- Local high-score and settings persistence (no account, no backend)

## Controls

- Move: Arrow keys or A/D
- Jump: Up arrow
- Pause: Escape, or the HUD pause button
- Touch: on-screen D-pad + jump button appear automatically on touch devices

## Tech Stack

Vite, TypeScript, Phaser 3 (Arcade Physics), Vitest, Playwright. No UI
framework — DOM overlays are plain HTML/CSS talking to Phaser through a
typed event bus. No backend.

## Architecture

See [docs/superpowers/specs/2026-09-05-dangerous-dave-recharged-design.md](docs/superpowers/specs/2026-09-05-dangerous-dave-recharged-design.md)
for the full design spec, and [docs/superpowers/plans/2026-09-05-dangerous-dave-recharged.md](docs/superpowers/plans/2026-09-05-dangerous-dave-recharged.md)
for the implementation plan.

Game simulation and rendering live in `src/game/` (Phaser scenes,
entities, systems, levels). DOM UI lives in `src/ui/`. Both sides
communicate only through `src/game/core/EventBus.ts`.

## Local Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm run test       # Vitest unit tests
npm run e2e        # Playwright end-to-end smoke test (requires a production build preview)
npm run typecheck
npm run lint
```

## Production Build

```bash
npm run build
npm run preview
```

## Deployment

Pushing to `main` runs GitHub Actions CI (lint, typecheck, test, build,
E2E) and deploys the production build to GitHub Pages via
`.github/workflows/ci.yml`. Live URL:
`https://siddharthachathra.github.io/dangerous-dave-recharged/`.

## Performance

Targets 60 FPS via Phaser's Arcade Physics and canvas rendering; particle
effects are capped in count and disabled under reduced-motion.

## Accessibility

Keyboard-navigable menus, visible focus states, WCAG AA-checked contrast
in both themes, `prefers-reduced-motion` support, and game state that
never depends on color alone.

## Asset Credits

See [ASSETS.md](ASSETS.md).

## License

MIT — see this repository's license.

## Disclaimer

This is an original, independent project inspired by the general
mechanics of classic 1980s platform games. It is not affiliated with,
endorsed by, or derived from the source code or assets of the original
1988 "Dangerous Dave".
