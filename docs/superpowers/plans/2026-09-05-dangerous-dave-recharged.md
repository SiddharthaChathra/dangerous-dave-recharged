# Dangerous Dave: Recharged Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a complete, original browser platformer ("Dangerous Dave: Recharged") — Phaser3+Vite+TS engine, 3 levels, 3 enemy archetypes, full UI/audio/persistence/testing pipeline, live on GitHub Pages.

**Architecture:** Phaser 3 scenes/entities own game simulation and rendering on a canvas; a typed `EventBus` is the only channel between Phaser and a DOM overlay layer (HTML/CSS, no framework) that renders menus/HUD. Pure, side-effect-free logic (physics integration, AABB collision resolution, enemy FSM, scoring, save schema) lives in plain TS modules under `src/utils` and `src/game/systems`, unit-tested with Vitest independent of Phaser/DOM. Phaser-specific wiring is verified via the dev server; end-to-end flow is covered by Playwright.

**Tech Stack:** Vite, TypeScript, Phaser 3 (Arcade Physics), Vitest, Playwright, plain HTML/CSS, localStorage. No backend, no UI framework.

**Spec:** [docs/superpowers/specs/2026-09-05-dangerous-dave-recharged-design.md](../specs/2026-09-05-dangerous-dave-recharged-design.md)

## Global Constraints

- Node available: v26.3.0 / npm 11.16.0. Use `npm` (not pnpm/yarn) for all scripts.
- No original Dangerous Dave source, sprites, sounds, levels, or branding anywhere in the repo.
- All audio is procedural Web Audio synthesis — no downloaded sample files.
- All sprites/backgrounds are newly authored for this project.
- Vite `base` must be `'/dangerous-dave-recharged/'` for GitHub Pages compatibility (repo `dangerous-dave-recharged` under account `SiddharthaChathra`, public).
- Persistence is a single versioned `localStorage` key (`ddr:save:v1`) via an injectable `Storage` interface — never call `window.localStorage` directly outside `SaveSystem`.
- Phaser and DOM never reach into each other directly; all cross-communication goes through `src/game/core/EventBus.ts`.
- Every commit follows `type: summary` (feat/test/fix/docs/ci) and ends with the `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer.
- `prefers-reduced-motion` and a manual reduced-motion setting must both be respected wherever non-essential animation/particles are triggered.
- Touch controls render only under `(pointer: coarse)` — never via user-agent sniffing.

## File Structure

```
src/
  game/
    core/          GameConfig.ts, EventBus.ts, constants.ts
    scenes/         BootScene.ts, PreloadScene.ts, MainMenuScene.ts, PlayScene.ts,
                    GameOverScene.ts, LevelCompleteScene.ts
    entities/       Player.ts, EnemyBase.ts, PatrolEnemy.ts, FlyingEnemy.ts,
                    ChaseEnemy.ts, Collectible.ts, Checkpoint.ts, Hazard.ts,
                    MovingPlatform.ts, enemyFsm.ts
    systems/        InputController.ts, CameraController.ts, SaveSystem.ts,
                    AudioSystem.ts, ParticleFX.ts
    levels/         types.ts, LevelLoader.ts, level001.ts, level002.ts, level003.ts
  ui/
    MainMenu.ts, HUD.ts, PauseMenu.ts, GameOverScreen.ts, LevelCompleteScreen.ts,
    SettingsPanel.ts, TouchControls.ts, theme.ts
    styles/         tokens.css, base.css, menus.css, hud.css, touch-controls.css
  utils/            physics.ts, collision.ts, scoring.ts, types.ts
  main.ts
tests/              physics.test.ts, collision.test.ts, scoring.test.ts,
                    enemyFsm.test.ts, SaveSystem.test.ts, LevelLoader.test.ts
e2e/                smoke.spec.ts
public/             favicon.svg, manifest.webmanifest
.github/workflows/  ci.yml
.claude/            game-progress.md
index.html, ASSETS.md, README.md, vite.config.ts, tsconfig.json, package.json,
.eslintrc.cjs, .prettierrc, .gitignore, playwright.config.ts, vitest.config.ts
```

## Tasks Index

1. Project Scaffold
2. EventBus and Core Bootstrap
3. Physics Core + Player Movement
4. Collision System + Platforms
5. Camera Controller
6. Level Data Format + Level 1 (Training Grounds)
7. Hazards, Damage, Checkpoints, Lives
8. Enemy FSM Core + Patrol Enemy
9. Flying Enemy + Chase Enemy
10. Collectibles + Scoring System
11. SaveSystem (Persistence)
12. HUD Overlay
13. Screen Flow: Main Menu, Pause, Game Over, Level Complete
14. Level 2 (Industrial Ruins)
15. Level 3 (Neon Caverns)
16. AudioSystem + Settings Panel
17. Theme System + Reduced Motion + Settings Persistence Wiring
18. Touch Controls + Unified InputController
19. Procedural Animation + Particles / VFX
20. Accessibility Pass
21. ASSETS.md + README.md
22. Playwright E2E Smoke Test
23. GitHub Actions CI + Pages Deploy Workflow
24. GitHub Repo Creation, Push, Pages Enablement, Deployment Verification
25. Final Visual + Gameplay QA Pass

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `index.html`, `src/main.ts`, `.claude/game-progress.md`

**Interfaces:**
- Produces: an `npm run dev`, `npm run build`, `npm run test`, `npm run lint`, `npm run typecheck` script set every later task relies on.

- [ ] **Step 1: Scaffold the Vite + TypeScript project**

Run:
```bash
npm create vite@latest . -- --template vanilla-ts
```
When prompted about the non-empty directory (it contains `docs/` and `.git/`), choose to continue/ignore existing files.

- [ ] **Step 2: Install Phaser, Vitest, and tooling**

```bash
npm install phaser
npm install -D vitest @vitest/coverage-v8 eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier jsdom @playwright/test
```

- [ ] **Step 3: Replace `vite.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/dangerous-dave-recharged/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Set `tsconfig.json` to strict mode**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 6: Add `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

- [ ] **Step 7: Add npm scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src tests e2e --ext .ts",
    "typecheck": "tsc --noEmit",
    "e2e": "playwright test"
  }
}
```

- [ ] **Step 8: Create `.gitignore`**

```
node_modules
dist
.vite
playwright-report
test-results
*.local
```

- [ ] **Step 9: Create minimal `index.html` and `src/main.ts`**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Dangerous Dave: Recharged</title>
    <link rel="stylesheet" href="/src/ui/styles/tokens.css" />
    <link rel="stylesheet" href="/src/ui/styles/base.css" />
  </head>
  <body>
    <div id="app">
      <div id="game-root"></div>
      <div id="ui-root"></div>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`:
```ts
console.log('Dangerous Dave: Recharged booting...');
```

Create empty placeholders `src/ui/styles/tokens.css` and `src/ui/styles/base.css` (content added in Task 17) with a single comment line `/* populated in Task 17 */` so the build doesn't 404.

- [ ] **Step 10: Verify the toolchain**

Run: `npm run build`
Expected: succeeds, `dist/` produced.

Run: `npm run lint`
Expected: no errors (no source files to lint yet beyond `main.ts`).

- [ ] **Step 11: Create the progress tracker**

`.claude/game-progress.md`:
```markdown
# Dangerous Dave: Recharged — Progress

CURRENT PHASE: Task 1 complete
COMPLETED PHASES: Task 1 — Project scaffold
CURRENT TASK: Task 2 — Core bootstrap
KNOWN BUGS: none
TEST STATUS: no tests yet
BUILD STATUS: passing
DEPLOYMENT STATUS: not deployed
NEXT ACTION: implement EventBus + Boot/Preload scenes
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + TypeScript + Phaser project

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: EventBus and Core Bootstrap

**Files:**
- Create: `src/game/core/EventBus.ts`, `src/game/core/constants.ts`, `src/game/core/GameConfig.ts`, `src/game/scenes/BootScene.ts`, `src/game/scenes/PreloadScene.ts`, `src/game/scenes/MainMenuScene.ts`, `src/game/scenes/PlayScene.ts`
- Modify: `src/main.ts`
- Test: `tests/EventBus.test.ts`

**Interfaces:**
- Produces: `GameEvents` type map and `gameEvents: EventBus` singleton, imported by every later task that crosses the Phaser/DOM boundary. Produces `PHYSICS` and `SCREEN` constant objects from `constants.ts`.

- [ ] **Step 1: Write the failing test for EventBus**

`tests/EventBus.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../src/game/core/EventBus';

interface TestEvents {
  'ping': { count: number };
}

describe('EventBus', () => {
  it('calls subscribed handlers with the emitted payload', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.emit('ping', { count: 3 });
    expect(handler).toHaveBeenCalledWith({ count: 3 });
  });

  it('stops calling a handler after off()', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.off('ping', handler);
    bus.emit('ping', { count: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('on() returns an unsubscribe function', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    const unsubscribe = bus.on('ping', handler);
    unsubscribe();
    bus.emit('ping', { count: 1 });
    expect(handler).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/EventBus.test.ts`
Expected: FAIL — cannot find module `../src/game/core/EventBus`.

- [ ] **Step 3: Implement EventBus**

`src/game/core/EventBus.ts`:
```ts
type Handler<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, unknown> = Record<string, unknown>> {
  private handlers: { [K in keyof Events]?: Handler<Events[K]>[] } = {};

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    const list = this.handlers[event] ?? [];
    list.push(handler);
    this.handlers[event] = list;
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    const list = this.handlers[event];
    if (!list) return;
    this.handlers[event] = list.filter((h) => h !== handler) as Handler<Events[K]>[];
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const list = this.handlers[event];
    if (!list) return;
    for (const handler of [...list]) handler(payload);
  }
}

export type GameEvents = {
  'score:changed': { score: number };
  'lives:changed': { lives: number };
  'collectible:changed': { collected: number; total: number };
  'level:progress': { percent: number };
  'timer:tick': { seconds: number };
  'player:died': { livesRemaining: number };
  'player:respawned': Record<string, never>;
  'checkpoint:reached': { id: string };
  'level:complete': { levelId: string; score: number; timeSeconds: number; collected: number; total: number };
  'game:over': { finalScore: number; bestScore: number };
  'game:pause': Record<string, never>;
  'game:resume': Record<string, never>;
  'game:started': { levelId: string };
  'settings:changed': {
    musicVolume: number;
    sfxVolume: number;
    muted: boolean;
    theme: 'dark' | 'light';
    reducedMotion: boolean;
  };
};

export const gameEvents = new EventBus<GameEvents>();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/EventBus.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add constants**

`src/game/core/constants.ts`:
```ts
export const SCREEN = {
  WIDTH: 960,
  HEIGHT: 540,
};

export const PHYSICS = {
  RUN_ACCEL: 1800,
  RUN_DECEL: 1600,
  MAX_RUN_SPEED: 220,
  AIR_CONTROL_FACTOR: 0.6,
  GRAVITY: 1400,
  JUMP_APEX_SECONDS: 0.4,
  MAX_FALL_SPEED: 700,
  COYOTE_MS: 100,
  JUMP_BUFFER_MS: 120,
};

// v^2 = 2 * g * h form solved for the launch velocity that reaches apex in JUMP_APEX_SECONDS:
// v = g * t
export const JUMP_VELOCITY = PHYSICS.GRAVITY * PHYSICS.JUMP_APEX_SECONDS;
```

- [ ] **Step 6: Add GameConfig and empty scenes**

`src/game/scenes/BootScene.ts`:
```ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preload');
  }
}
```

`src/game/scenes/PreloadScene.ts`:
```ts
import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    // Sprite/audio generation happens in later tasks; nothing to load yet.
  }

  create(): void {
    this.scene.start('MainMenu');
  }
}
```

`src/game/scenes/MainMenuScene.ts`:
```ts
import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Dangerous Dave: Recharged', {
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }
}
```

`src/game/scenes/PlayScene.ts`:
```ts
import Phaser from 'phaser';

export class PlayScene extends Phaser.Scene {
  constructor() {
    super('Play');
  }

  create(): void {
    // Player, level, and systems are wired in later tasks.
  }
}
```

`src/game/core/GameConfig.ts`:
```ts
import Phaser from 'phaser';
import { SCREEN } from './constants';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { PlayScene } from '../scenes/PlayScene';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: SCREEN.WIDTH,
    height: SCREEN.HEIGHT,
    backgroundColor: '#101018',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, PreloadScene, MainMenuScene, PlayScene],
  };
}
```

- [ ] **Step 7: Wire `src/main.ts`**

```ts
import Phaser from 'phaser';
import { createGameConfig } from './game/core/GameConfig';

const parent = document.getElementById('game-root');
if (!parent) throw new Error('game-root element missing from index.html');

new Phaser.Game(createGameConfig(parent));
```

- [ ] **Step 8: Verify in the dev server**

Run: `npm run dev`, open the printed local URL.
Expected: canvas renders with "Dangerous Dave: Recharged" text centered, no console errors.

- [ ] **Step 9: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add EventBus, constants, and scene bootstrap

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Physics Core + Player Movement

**Files:**
- Create: `src/utils/physics.ts`, `src/game/entities/Player.ts`
- Modify: `src/game/scenes/PlayScene.ts`
- Test: `tests/physics.test.ts`

**Interfaces:**
- Consumes: `PHYSICS`, `JUMP_VELOCITY` from `src/game/core/constants.ts` (Task 2).
- Produces: `MoveInput`, `JumpAssistState`, `integrateHorizontal`, `applyGravity`, `updateJumpAssist` from `src/utils/physics.ts` — consumed by Task 4 (collision integration) and Task 7 (respawn resets velocity via the same types). Produces `Player` class with `sprite: Phaser.Physics.Arcade.Sprite` and `update(dtSeconds: number, input: MoveInput): void`, consumed by Tasks 4, 6, 7, 19.

- [ ] **Step 1: Write failing tests for the pure physics functions**

`tests/physics.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { PHYSICS, JUMP_VELOCITY } from '../src/game/core/constants';
import {
  integrateHorizontal,
  applyGravity,
  updateJumpAssist,
  type MoveInput,
  type JumpAssistState,
} from '../src/utils/physics';

const noInput: MoveInput = { left: false, right: false, jumpPressed: false, jumpHeld: false };

describe('integrateHorizontal', () => {
  it('accelerates toward max speed when holding right', () => {
    const input: MoveInput = { ...noInput, right: true };
    const vx = integrateHorizontal(0, input, 0.1, PHYSICS, true);
    expect(vx).toBeCloseTo(180, 0); // 1800 px/s^2 * 0.1s
    expect(vx).toBeLessThanOrEqual(PHYSICS.MAX_RUN_SPEED);
  });

  it('never exceeds MAX_RUN_SPEED', () => {
    const input: MoveInput = { ...noInput, right: true };
    let vx = 0;
    for (let i = 0; i < 100; i++) vx = integrateHorizontal(vx, input, 0.1, PHYSICS, true);
    expect(vx).toBeLessThanOrEqual(PHYSICS.MAX_RUN_SPEED);
  });

  it('decelerates to zero when no input is held on the ground', () => {
    const vx = integrateHorizontal(100, noInput, 1, PHYSICS, true);
    expect(vx).toBe(0);
  });

  it('applies reduced acceleration in the air', () => {
    const input: MoveInput = { ...noInput, right: true };
    const grounded = integrateHorizontal(0, input, 0.1, PHYSICS, true);
    const airborne = integrateHorizontal(0, input, 0.1, PHYSICS, false);
    expect(airborne).toBeLessThan(grounded);
    expect(airborne).toBeCloseTo(grounded * PHYSICS.AIR_CONTROL_FACTOR, 1);
  });
});

describe('applyGravity', () => {
  it('increases downward velocity over time', () => {
    const vy = applyGravity(0, 0.1, PHYSICS);
    expect(vy).toBeCloseTo(140, 0); // 1400 px/s^2 * 0.1s
  });

  it('caps at MAX_FALL_SPEED', () => {
    const vy = applyGravity(10000, 1, PHYSICS);
    expect(vy).toBe(PHYSICS.MAX_FALL_SPEED);
  });
});

describe('updateJumpAssist', () => {
  const freshState: JumpAssistState = { coyoteRemainingMs: 0, bufferRemainingMs: 0 };

  it('allows a jump while grounded and jump is pressed', () => {
    const { shouldJump } = updateJumpAssist(freshState, true, true, 16, PHYSICS);
    expect(shouldJump).toBe(true);
  });

  it('allows a jump shortly after leaving the ground (coyote time)', () => {
    const airborneJustLeft = updateJumpAssist(freshState, false, false, 0, PHYSICS).state;
    // still within COYOTE_MS window
    const { shouldJump } = updateJumpAssist(airborneJustLeft, false, true, 50, PHYSICS);
    expect(shouldJump).toBe(true);
  });

  it('rejects a jump once coyote time has fully elapsed', () => {
    let state = updateJumpAssist(freshState, false, false, 0, PHYSICS).state;
    state = updateJumpAssist(state, false, false, PHYSICS.COYOTE_MS + 10, PHYSICS).state;
    const { shouldJump } = updateJumpAssist(state, false, true, 1, PHYSICS);
    expect(shouldJump).toBe(false);
  });

  it('buffers a jump pressed just before landing', () => {
    let state = updateJumpAssist(freshState, false, true, 0, PHYSICS).state; // press while airborne, not grounded
    const result = updateJumpAssist(state, true, false, 50, PHYSICS); // lands within buffer window
    expect(result.shouldJump).toBe(true);
  });

  it('does not buffer a jump pressed too long before landing', () => {
    let state = updateJumpAssist(freshState, false, true, 0, PHYSICS).state;
    state = updateJumpAssist(state, false, false, PHYSICS.JUMP_BUFFER_MS + 10, PHYSICS).state;
    const result = updateJumpAssist(state, true, false, 1, PHYSICS);
    expect(result.shouldJump).toBe(false);
  });
});

it('JUMP_VELOCITY is negative (upward) and reaches configured apex time under gravity', () => {
  expect(JUMP_VELOCITY).toBeGreaterThan(0);
  const framesToApex = JUMP_VELOCITY / (PHYSICS.GRAVITY * (1 / 60)) / 60;
  expect(framesToApex).toBeCloseTo(PHYSICS.JUMP_APEX_SECONDS, 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/physics.test.ts`
Expected: FAIL — `src/utils/physics.ts` does not exist.

- [ ] **Step 3: Implement the pure physics module**

`src/utils/physics.ts`:
```ts
import type { PHYSICS as PhysicsConstantsShape } from '../game/core/constants';

export type PhysicsConstants = typeof PhysicsConstantsShape;

export interface MoveInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
}

export interface JumpAssistState {
  coyoteRemainingMs: number;
  bufferRemainingMs: number;
}

export function integrateHorizontal(
  vx: number,
  input: MoveInput,
  dtSeconds: number,
  constants: PhysicsConstants,
  onGround: boolean,
): number {
  const controlFactor = onGround ? 1 : constants.AIR_CONTROL_FACTOR;
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  if (direction !== 0) {
    const next = vx + direction * constants.RUN_ACCEL * controlFactor * dtSeconds;
    return Math.max(-constants.MAX_RUN_SPEED, Math.min(constants.MAX_RUN_SPEED, next));
  }

  if (!onGround) return vx; // no air friction beyond the drag cap already enforced by acceleration

  const decel = constants.RUN_DECEL * dtSeconds;
  if (Math.abs(vx) <= decel) return 0;
  return vx - Math.sign(vx) * decel;
}

export function applyGravity(vy: number, dtSeconds: number, constants: PhysicsConstants): number {
  const next = vy + constants.GRAVITY * dtSeconds;
  return Math.min(next, constants.MAX_FALL_SPEED);
}

export function updateJumpAssist(
  state: JumpAssistState,
  onGround: boolean,
  jumpPressed: boolean,
  dtMs: number,
  constants: PhysicsConstants,
): { state: JumpAssistState; shouldJump: boolean } {
  const coyoteRemainingMs = onGround ? constants.COYOTE_MS : Math.max(0, state.coyoteRemainingMs - dtMs);
  let bufferRemainingMs = Math.max(0, state.bufferRemainingMs - dtMs);
  if (jumpPressed) bufferRemainingMs = constants.JUMP_BUFFER_MS;

  const canUseCoyote = onGround || coyoteRemainingMs > 0;
  const wantsToJump = jumpPressed || bufferRemainingMs > 0;
  const shouldJump = wantsToJump && canUseCoyote;

  return {
    state: {
      coyoteRemainingMs: shouldJump ? 0 : coyoteRemainingMs,
      bufferRemainingMs: shouldJump ? 0 : bufferRemainingMs,
    },
    shouldJump,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/physics.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Build the Player entity on a temporary test platform**

`src/game/entities/Player.ts`:
```ts
import Phaser from 'phaser';
import { PHYSICS, JUMP_VELOCITY } from '../core/constants';
import { integrateHorizontal, applyGravity, updateJumpAssist, type MoveInput, type JumpAssistState } from '../../utils/physics';

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private jumpAssist: JumpAssistState = { coyoteRemainingMs: 0, bufferRemainingMs: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, '__WHITE');
    this.sprite.setDisplaySize(24, 32);
    this.sprite.setTint(0x4ade80);
    this.sprite.setDamping(false);
    this.sprite.setMaxVelocity(PHYSICS.MAX_RUN_SPEED, PHYSICS.MAX_FALL_SPEED);
    // Arcade Body.setSize() treats its args as "source" dims and re-multiplies by the
    // GameObject's current scale every frame (Phaser Body.js setSize/preUpdate) — since
    // setDisplaySize(24,32) on the 4x4 '__WHITE' texture already set scale to (6,8), the
    // desired final body size must be pre-divided by that scale or it balloons to 120x240.
    (this.sprite.body as Phaser.Physics.Arcade.Body).setSize(20 / this.sprite.scaleX, 30 / this.sprite.scaleY);
  }

  get isOnGround(): boolean {
    return this.sprite.body.blocked.down || this.sprite.body.touching.down;
  }

  update(dtMs: number, input: MoveInput): void {
    const dtSeconds = dtMs / 1000;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    const vx = integrateHorizontal(body.velocity.x, input, dtSeconds, PHYSICS, this.isOnGround);
    const vy = applyGravity(body.velocity.y, dtSeconds, PHYSICS);
    this.sprite.setVelocity(vx, vy);

    const { state, shouldJump } = updateJumpAssist(this.jumpAssist, this.isOnGround, input.jumpPressed, dtMs, PHYSICS);
    this.jumpAssist = state;
    if (shouldJump) this.sprite.setVelocityY(-JUMP_VELOCITY);

    if (input.right) this.sprite.setFlipX(false);
    else if (input.left) this.sprite.setFlipX(true);
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
  }
}
```

Note: `'__WHITE'` is Phaser's built-in 1x1 white pixel texture, always available without loading an asset — used as a placeholder tint-able rectangle until Task 19-era sprite art exists; replacing it with authored sprite sheets is a visual QA follow-up in Task 25, not blocking here.

- [ ] **Step 6: Wire a temporary ground and keyboard input into PlayScene for manual verification**

`src/game/scenes/PlayScene.ts`:
```ts
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import type { MoveInput } from '../../utils/physics';

export class PlayScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private ground!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super('Play');
  }

  create(): void {
    this.physics.world.gravity.y = 0; // gravity is applied manually in Player.update
    this.ground = this.physics.add.staticGroup();
    const groundRect = this.add.rectangle(480, 520, 960, 40, 0x333344);
    this.physics.add.existing(groundRect, true);
    this.ground.add(groundRect);

    this.player = new Player(this, 100, 400);
    this.physics.add.collider(this.player.sprite, this.ground);

    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  update(_time: number, delta: number): void {
    const input: MoveInput = {
      left: this.cursors.left.isDown,
      right: this.cursors.right.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.cursors.up),
      jumpHeld: this.cursors.up.isDown,
    };
    this.player.update(delta, input);
  }
}
```

- [ ] **Step 7: Manually verify in the browser**

Run: `npm run dev`, navigate directly to trigger the Play scene by temporarily changing `GameConfig.ts`'s scene start order is not needed — instead add a quick keypress in `MainMenuScene.create()`: `this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('Play'));` and a text hint `"Press ENTER to test Play scene"`. Load the game, press Enter, then Left/Right/Up.

Expected: the green rectangle runs left/right with visible accel/decel, jumps with a floaty ~0.4s-apex arc, holding Up right before landing (from a previous jump) still triggers a jump (buffer), and tapping Up just after walking off the ground edge still jumps (coyote). No console errors.

- [ ] **Step 8: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add player movement physics with coyote time and jump buffering

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Collision System + Platforms

**Files:**
- Create: `src/utils/collision.ts`, `src/game/entities/MovingPlatform.ts`
- Modify: `src/game/scenes/PlayScene.ts`
- Test: `tests/collision.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure geometry module); `Player` from Task 3 for the manual-verification wiring.
- Produces: `AABB`, `intersectAABB`, `resolveAABBCollision` from `src/utils/collision.ts` — used directly only by unit tests in this task (Phaser's own Arcade Physics collider handles runtime collision), but this module documents and pins down the exact collision-resolution rules (used later for one-off cases like `MovingPlatform` carrying the player, and for the E2E/manual test seam in Task 22). Produces `MovingPlatform` class with `sprite`, `update(dtMs: number): void`, consumed by Task 14.

- [ ] **Step 1: Write failing tests for AABB collision**

`tests/collision.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { intersectAABB, resolveAABBCollision, type AABB } from '../src/utils/collision';

describe('intersectAABB', () => {
  it('detects overlap and reports overlap depth on each axis', () => {
    const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
    const b: AABB = { x: 5, y: 5, width: 10, height: 10 };
    const result = intersectAABB(a, b);
    expect(result.collided).toBe(true);
    expect(result.overlapX).toBe(5);
    expect(result.overlapY).toBe(5);
  });

  it('reports no collision for separated boxes', () => {
    const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
    const b: AABB = { x: 20, y: 20, width: 10, height: 10 };
    expect(intersectAABB(a, b).collided).toBe(false);
  });
});

describe('resolveAABBCollision', () => {
  it('lands the moving box on top of a static box when falling', () => {
    const moving: AABB = { x: 0, y: 90, width: 10, height: 10 };
    const staticBox: AABB = { x: 0, y: 95, width: 10, height: 10 };
    const result = resolveAABBCollision(moving, { vx: 0, vy: 50 }, staticBox);
    expect(result.landedOnTop).toBe(true);
    expect(result.y).toBe(85); // pushed up to sit exactly on top of staticBox
    expect(result.vy).toBe(0);
  });

  it('stops upward motion when hitting a ceiling', () => {
    const moving: AABB = { x: 0, y: 10, width: 10, height: 10 };
    const staticBox: AABB = { x: 0, y: 5, width: 10, height: 10 };
    const result = resolveAABBCollision(moving, { vx: 0, vy: -50 }, staticBox);
    expect(result.hitCeiling).toBe(true);
    expect(result.vy).toBe(0);
  });

  it('stops horizontal motion when hitting a wall', () => {
    const moving: AABB = { x: 90, y: 0, width: 10, height: 10 };
    const staticBox: AABB = { x: 95, y: 0, width: 10, height: 10 };
    const result = resolveAABBCollision(moving, { vx: 50, vy: 0 }, staticBox);
    expect(result.hitWall).toBe(true);
    expect(result.vx).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/collision.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the collision module**

`src/utils/collision.ts`:
```ts
export interface AABB {
  x: number; // top-left
  y: number;
  width: number;
  height: number;
}

export interface IntersectResult {
  collided: boolean;
  overlapX: number;
  overlapY: number;
}

export function intersectAABB(a: AABB, b: AABB): IntersectResult {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return { collided: overlapX > 0 && overlapY > 0, overlapX: Math.max(0, overlapX), overlapY: Math.max(0, overlapY) };
}

export interface ResolveResult {
  x: number;
  y: number;
  vx: number;
  vy: number;
  landedOnTop: boolean;
  hitCeiling: boolean;
  hitWall: boolean;
}

export function resolveAABBCollision(
  moving: AABB,
  velocity: { vx: number; vy: number },
  staticBox: AABB,
): ResolveResult {
  const { collided, overlapX, overlapY } = intersectAABB(moving, staticBox);
  if (!collided) {
    return { x: moving.x, y: moving.y, vx: velocity.vx, vy: velocity.vy, landedOnTop: false, hitCeiling: false, hitWall: false };
  }

  // Resolve along the axis of least penetration.
  if (overlapX < overlapY) {
    const movingCenter = moving.x + moving.width / 2;
    const staticCenter = staticBox.x + staticBox.width / 2;
    const pushLeft = movingCenter < staticCenter;
    const x = pushLeft ? staticBox.x - moving.width : staticBox.x + staticBox.width;
    return { x, y: moving.y, vx: 0, vy: velocity.vy, landedOnTop: false, hitCeiling: false, hitWall: true };
  }

  const movingCenterY = moving.y + moving.height / 2;
  const staticCenterY = staticBox.y + staticBox.height / 2;
  const pushUp = movingCenterY < staticCenterY;
  if (pushUp) {
    return {
      x: moving.x,
      y: staticBox.y - moving.height,
      vx: velocity.vx,
      vy: 0,
      landedOnTop: true,
      hitCeiling: false,
      hitWall: false,
    };
  }
  return {
    x: moving.x,
    y: staticBox.y + staticBox.height,
    vx: velocity.vx,
    vy: 0,
    landedOnTop: false,
    hitCeiling: true,
    hitWall: false,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/collision.test.ts`
Expected: PASS.

- [ ] **Step 5: Add a MovingPlatform entity and expand the temporary test level**

`src/game/entities/MovingPlatform.ts`:
```ts
import Phaser from 'phaser';

export class MovingPlatform {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly startX: number;
  private readonly rangePx: number;
  private readonly speedPxPerSec: number;
  private direction = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, widthPx: number, rangePx: number, speedPxPerSec: number) {
    this.sprite = scene.physics.add.sprite(x, y, '__WHITE');
    this.sprite.setDisplaySize(widthPx, 16);
    this.sprite.setTint(0x94a3b8);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.startX = x;
    this.rangePx = rangePx;
    this.speedPxPerSec = speedPxPerSec;
  }

  update(dtMs: number): void {
    const dtSeconds = dtMs / 1000;
    const deltaX = this.direction * this.speedPxPerSec * dtSeconds;
    const nextX = this.sprite.x + deltaX;
    if (nextX > this.startX + this.rangePx || nextX < this.startX - this.rangePx) {
      this.direction *= -1;
    }
    this.sprite.setVelocityX(this.direction * this.speedPxPerSec);
  }
}
```

- [ ] **Step 6: Wire ground detection + a moving platform into PlayScene for manual verification**

Modify `src/game/scenes/PlayScene.ts`: add a `MovingPlatform` instance, add it to a `Phaser.Physics.Arcade.Group`, collide the player against both the static ground and the moving-platform group, and call `movingPlatform.update(delta)` in `update()`. Use `this.physics.add.collider(this.player.sprite, this.movingPlatformGroup)` so Arcade Physics carries the player horizontally when standing on an `immovable` moving body (Arcade Physics does this automatically for a body riding an immovable moving collider via velocity transfer — verify visually in Step 7).

- [ ] **Step 7: Manually verify in the browser**

Run: `npm run dev`, Enter to Play scene.
Expected: player can stand on the static ground and the moving platform, is carried along by the moving platform without sliding off, and jumping onto the platform from below/beside registers ground correctly. No console errors.

- [ ] **Step 8: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add AABB collision resolver and moving platform entity

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Camera Controller

**Files:**
- Create: `src/game/systems/CameraController.ts`
- Modify: `src/game/scenes/PlayScene.ts`

**Interfaces:**
- Consumes: `Player` from Task 3.
- Produces: `CameraController` class with `attach(camera, target, bounds)` and `shake(durationMs, intensity)`, consumed by Task 6 (level bounds) and Task 7 (damage shake).

- [ ] **Step 1: Implement CameraController**

`src/game/systems/CameraController.ts`:
```ts
import Phaser from 'phaser';

export interface CameraBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CameraController {
  private camera!: Phaser.Cameras.Scene2D.Camera;

  attach(camera: Phaser.Cameras.Scene2D.Camera, target: Phaser.GameObjects.GameObject, bounds: CameraBounds): void {
    this.camera = camera;
    camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    camera.startFollow(target, true, 0.12, 0.12); // smooth interpolation (lerp)
    camera.setDeadzone(80, 40);
    camera.setFollowOffset(0, -20); // slight look-ahead upward for jump readability
  }

  shake(durationMs = 150, intensity = 0.006): void {
    this.camera.shake(durationMs, intensity);
  }
}
```

- [ ] **Step 2: Wire into PlayScene with level bounds from the temporary test level**

Modify `PlayScene.create()`: instantiate `CameraController`, call `attach(this.cameras.main, this.player.sprite, { x: 0, y: 0, width: 1920, height: 540 })`, and widen the temporary ground rectangle to `1920` width so there's room to scroll.

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev`, Enter to Play scene, hold Right to run toward the level edge.
Expected: camera smoothly follows with a small deadzone (doesn't jitter on tiny movements), stops scrolling at the level bounds, and doesn't show area outside the level.

- [ ] **Step 4: Run checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add smooth-follow camera with deadzone, bounds, and shake

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Level Data Format + Level 1 (Training Grounds)

**Files:**
- Create: `src/game/levels/types.ts`, `src/game/levels/LevelLoader.ts`, `src/game/levels/level001.ts`, `src/game/levels/parallax.ts`
- Modify: `src/game/scenes/PlayScene.ts`
- Test: `tests/LevelLoader.test.ts`

**Interfaces:**
- Consumes: `Player` (Task 3), `MovingPlatform` (Task 4), `CameraController` (Task 5).
- Produces: `LevelData`, `PlatformDef`, `HazardDef`, `EnemyDef`, `CollectibleDef`, `CheckpointDef` types from `types.ts` — the shared shape every level file (Tasks 6, 14, 15) and every entity-spawning task (7, 8, 9, 10) is defined against. Produces `LevelLoader.parse(data: unknown): LevelData` (validates + parses) and `LevelLoader.buildInScene(scene, level): LevelBuildResult` (constructs Phaser objects, including parallax background layers), consumed by Task 6's own PlayScene wiring and reused unmodified by Tasks 14–15. Produces `buildParallaxLayers(scene, palette, levelWidthPx): ParallaxLayer[]` with `ParallaxLayer.update(cameraScrollX: number): void`, consumed by `PlayScene`'s update loop here and unmodified in Tasks 14-15.

- [ ] **Step 1: Define the level data types**

`src/game/levels/types.ts`:
```ts
export interface Vec2 {
  x: number;
  y: number;
}

export interface PlatformDef {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MovingPlatformDef extends PlatformDef {
  rangePx: number;
  speedPxPerSec: number;
}

export interface HazardDef {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'spike';
}

export type EnemyKind = 'patrol' | 'flying' | 'chase';

export interface EnemyDef {
  kind: EnemyKind;
  x: number;
  y: number;
  rangePx: number;
}

export interface CollectibleDef {
  x: number;
  y: number;
  kind: 'gem' | 'secret';
}

export interface CheckpointDef {
  id: string;
  x: number;
  y: number;
}

export interface LevelData {
  id: string;
  name: string;
  widthPx: number;
  heightPx: number;
  parTimeSeconds: number;
  playerStart: Vec2;
  groundY: number;
  platforms: PlatformDef[];
  movingPlatforms: MovingPlatformDef[];
  hazards: HazardDef[];
  enemies: EnemyDef[];
  collectibles: CollectibleDef[];
  checkpoints: CheckpointDef[];
  goal: Vec2;
  backgroundPalette: string;
}
```

- [ ] **Step 2: Write a failing test for LevelLoader validation**

`tests/LevelLoader.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { LevelLoader } from '../src/game/levels/LevelLoader';
import type { LevelData } from '../src/game/levels/types';

const validLevel: LevelData = {
  id: 'level001',
  name: 'Training Grounds',
  widthPx: 1000,
  heightPx: 540,
  parTimeSeconds: 60,
  playerStart: { x: 50, y: 400 },
  groundY: 500,
  platforms: [{ x: 0, y: 500, width: 1000, height: 40 }],
  movingPlatforms: [],
  hazards: [],
  enemies: [],
  collectibles: [{ x: 200, y: 460, kind: 'gem' }],
  checkpoints: [{ id: 'cp1', x: 500, y: 460 }],
  goal: { x: 950, y: 460 },
  backgroundPalette: 'training',
};

describe('LevelLoader.parse', () => {
  it('accepts a well-formed level object', () => {
    expect(() => LevelLoader.parse(validLevel)).not.toThrow();
    expect(LevelLoader.parse(validLevel).id).toBe('level001');
  });

  it('rejects a level missing required fields', () => {
    const { platforms: _platforms, ...broken } = validLevel;
    expect(() => LevelLoader.parse(broken)).toThrow(/platforms/);
  });

  it('rejects a level with no goal', () => {
    const { goal: _goal, ...broken } = validLevel;
    expect(() => LevelLoader.parse(broken)).toThrow(/goal/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/LevelLoader.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement LevelLoader.parse (validation only in this step)**

`src/game/levels/LevelLoader.ts`:
```ts
import Phaser from 'phaser';
import type { LevelData } from './types';
import { Player } from '../entities/Player';
import { MovingPlatform } from '../entities/MovingPlatform';

const REQUIRED_FIELDS: (keyof LevelData)[] = [
  'id', 'name', 'widthPx', 'heightPx', 'parTimeSeconds', 'playerStart', 'groundY',
  'platforms', 'movingPlatforms', 'hazards', 'enemies', 'collectibles', 'checkpoints',
  'goal', 'backgroundPalette',
];

export interface LevelBuildResult {
  player: Player;
  staticGroup: Phaser.Physics.Arcade.StaticGroup;
  movingPlatforms: MovingPlatform[];
  level: LevelData;
}

export class LevelLoader {
  static parse(raw: unknown): LevelData {
    if (typeof raw !== 'object' || raw === null) throw new Error('Level data must be an object');
    const data = raw as Record<string, unknown>;
    for (const field of REQUIRED_FIELDS) {
      if (!(field in data)) throw new Error(`Level data missing required field: ${String(field)}`);
    }
    return data as unknown as LevelData;
  }

  static buildInScene(scene: Phaser.Scene, level: LevelData): LevelBuildResult {
    const staticGroup = scene.physics.add.staticGroup();
    for (const platform of level.platforms) {
      const rect = scene.add.rectangle(
        platform.x + platform.width / 2,
        platform.y + platform.height / 2,
        platform.width,
        platform.height,
        0x333344,
      );
      scene.physics.add.existing(rect, true);
      staticGroup.add(rect);
    }

    const movingPlatforms = level.movingPlatforms.map(
      (def) => new MovingPlatform(scene, def.x, def.y, def.width, def.rangePx, def.speedPxPerSec),
    );

    const player = new Player(scene, level.playerStart.x, level.playerStart.y);
    scene.physics.add.collider(player.sprite, staticGroup);
    for (const mp of movingPlatforms) scene.physics.add.collider(player.sprite, mp.sprite);

    return { player, staticGroup, movingPlatforms, level };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/LevelLoader.test.ts`
Expected: PASS.

- [ ] **Step 6: Author Level 1 content**

`src/game/levels/level001.ts`:
```ts
import type { LevelData } from './types';

export const level001: LevelData = {
  id: 'level001',
  name: 'Training Grounds',
  widthPx: 2400,
  heightPx: 540,
  parTimeSeconds: 75,
  playerStart: { x: 60, y: 400 },
  groundY: 500,
  platforms: [
    { x: 0, y: 500, width: 700, height: 40 },
    { x: 820, y: 500, width: 300, height: 40 }, // gap at 700-820 teaches basic jump
    { x: 1250, y: 420, width: 160, height: 24 }, // raised platform
    { x: 1500, y: 500, width: 900, height: 40 },
  ],
  movingPlatforms: [],
  hazards: [
    { x: 1700, y: 480, width: 32, height: 20, kind: 'spike' },
    { x: 1900, y: 480, width: 32, height: 20, kind: 'spike' },
  ],
  enemies: [{ kind: 'patrol', x: 2100, y: 468, rangePx: 120 }],
  collectibles: [
    { x: 300, y: 460, kind: 'gem' },
    { x: 500, y: 460, kind: 'gem' },
    { x: 900, y: 460, kind: 'gem' },
    { x: 1290, y: 380, kind: 'gem' },
    { x: 1600, y: 460, kind: 'gem' },
    { x: 1320, y: 380, kind: 'secret' },
  ],
  checkpoints: [{ id: 'level001-cp1', x: 1000, y: 460 }],
  goal: { x: 2340, y: 460 },
  backgroundPalette: 'training',
};
```

- [ ] **Step 7: Add a parallax background layer helper and wire it into LevelLoader**

`src/game/levels/parallax.ts`:
```ts
import Phaser from 'phaser';

export interface ParallaxLayer {
  update(cameraScrollX: number): void;
}

const PARALLAX_PALETTES: Record<string, { colors: number[]; scrollFactors: number[] }> = {
  training: { colors: [0x1e293b, 0x334155, 0x475569], scrollFactors: [0.1, 0.25, 0.45] },
  industrial: { colors: [0x27272a, 0x3f3f46, 0x52525b], scrollFactors: [0.1, 0.25, 0.45] },
  neon: { colors: [0x1e1b4b, 0x312e81, 0x4c1d95], scrollFactors: [0.1, 0.25, 0.45] },
};

export function buildParallaxLayers(scene: Phaser.Scene, palette: string, levelWidthPx: number, levelHeightPx: number): ParallaxLayer[] {
  const config = PARALLAX_PALETTES[palette] ?? PARALLAX_PALETTES.training;
  return config.colors.map((color, index) => {
    const scrollFactor = config.scrollFactors[index];
    // Layers are wider than the level so they never run out while scrolling at a fractional rate.
    const rect = scene.add.rectangle(0, 0, levelWidthPx * 1.5, levelHeightPx, color).setOrigin(0, 0).setScrollFactor(scrollFactor, 0);
    rect.setDepth(-100 + index);
    return {
      update: () => {
        /* Phaser's setScrollFactor already handles per-frame positioning; no manual update needed,
           but the interface stays update()-shaped in case a future layer wants extra motion (e.g. drift). */
      },
    };
  });
}
```

- [ ] **Step 8: Replace PlayScene's temporary content with LevelLoader + level001, camera bounds, and parallax layers**

Modify `src/game/scenes/PlayScene.ts` to call `LevelLoader.buildInScene(this, level001)`, store the returned `player`/`movingPlatforms`, drive `player.update()` and each `movingPlatforms[i].update()` from `update()`, attach `CameraController` using `{ x: 0, y: 0, width: level001.widthPx, height: level001.heightPx }`, and call `buildParallaxLayers(this, level001.backgroundPalette, level001.widthPx, level001.heightPx)` before spawning gameplay objects so the layers render behind everything (`setDepth(-100...)` already ensures this regardless of creation order, but creating them first keeps the scene graph readable).

- [ ] **Step 9: Manually verify in the browser**

Run: `npm run dev`, Enter to Play scene.
Expected: full Level 1 layout renders (platforms, gap, raised platform) over 3 visibly distinct scrolling background layers (nearest layer moves fastest), player can traverse it with jump/coyote/buffer feeling responsive, camera scrolls the full level width and clamps at both ends. Spikes/enemy/collectibles render as placeholder colored rectangles (no collision logic yet — added in Tasks 7/8/10). No console errors.

- [ ] **Step 10: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add level data format, LevelLoader, and Level 1 content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Hazards, Damage, Checkpoints, Lives

**Files:**
- Create: `src/game/entities/Hazard.ts`, `src/game/entities/Checkpoint.ts`, `src/utils/livesReducer.ts`
- Modify: `src/game/levels/LevelLoader.ts`, `src/game/scenes/PlayScene.ts`
- Test: `tests/livesReducer.test.ts`

**Interfaces:**
- Consumes: `gameEvents` (Task 2), `LevelBuildResult`/`HazardDef`/`CheckpointDef` (Task 6), `CameraController.shake` (Task 5), `Player.setPosition` (Task 3).
- Produces: `LivesState`, `applyDamage(state, checkpoint): LivesState`, `respawnAt(state, checkpoint): LivesState` from `livesReducer.ts` — consumed by Task 12 (HUD reacts to `lives:changed`) and Task 13 (GameOverScreen reacts to `game:over`).

- [ ] **Step 1: Write failing tests for the lives reducer**

`tests/livesReducer.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createLivesState, applyDamage, type LivesState } from '../src/utils/livesReducer';

describe('livesReducer', () => {
  it('starts with 3 lives and no checkpoint', () => {
    const state = createLivesState();
    expect(state.lives).toBe(3);
    expect(state.checkpointId).toBeNull();
  });

  it('decrements lives on damage while lives remain', () => {
    const state: LivesState = { lives: 3, checkpointId: null, isGameOver: false };
    const next = applyDamage(state);
    expect(next.lives).toBe(2);
    expect(next.isGameOver).toBe(false);
  });

  it('sets isGameOver when the last life is lost', () => {
    const state: LivesState = { lives: 1, checkpointId: 'cp1', isGameOver: false };
    const next = applyDamage(state);
    expect(next.lives).toBe(0);
    expect(next.isGameOver).toBe(true);
  });

  it('never goes below zero lives', () => {
    const state: LivesState = { lives: 0, checkpointId: null, isGameOver: true };
    const next = applyDamage(state);
    expect(next.lives).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/livesReducer.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the lives reducer**

`src/utils/livesReducer.ts`:
```ts
export interface LivesState {
  lives: number;
  checkpointId: string | null;
  isGameOver: boolean;
}

export function createLivesState(): LivesState {
  return { lives: 3, checkpointId: null, isGameOver: false };
}

export function applyDamage(state: LivesState): LivesState {
  const lives = Math.max(0, state.lives - 1);
  return { ...state, lives, isGameOver: lives === 0 };
}

export function setCheckpoint(state: LivesState, checkpointId: string): LivesState {
  return { ...state, checkpointId };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/livesReducer.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement Hazard and Checkpoint entities**

`src/game/entities/Hazard.ts`:
```ts
import Phaser from 'phaser';
import type { HazardDef } from '../levels/types';

export class Hazard {
  readonly sprite: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };

  constructor(scene: Phaser.Scene, def: HazardDef) {
    const rect = scene.add.rectangle(def.x + def.width / 2, def.y + def.height / 2, def.width, def.height, 0xef4444);
    scene.physics.add.existing(rect, true);
    this.sprite = rect as unknown as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
  }
}
```

`src/game/entities/Checkpoint.ts`:
```ts
import Phaser from 'phaser';
import type { CheckpointDef } from '../levels/types';

export class Checkpoint {
  readonly id: string;
  readonly sprite: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
  private activated = false;

  constructor(scene: Phaser.Scene, def: CheckpointDef) {
    this.id = def.id;
    const rect = scene.add.rectangle(def.x, def.y, 16, 40, 0xfbbf24, 0.6);
    scene.physics.add.existing(rect, true);
    this.sprite = rect as unknown as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };
  }

  activate(): boolean {
    if (this.activated) return false;
    this.activated = true;
    this.sprite.setFillStyle(0xfbbf24, 1);
    return true;
  }
}
```

- [ ] **Step 6: Wire hazards, checkpoints, damage, and respawn into PlayScene**

Modify `LevelLoader.buildInScene` to also construct `Hazard[]` and `Checkpoint[]` from `level.hazards`/`level.checkpoints` and return them in `LevelBuildResult`.

Modify `PlayScene`:
- Hold a `livesState: LivesState` (from Task 7's reducer) initialized via `createLivesState()`.
- Add an Arcade overlap between `player.sprite` and each hazard: on overlap, call `applyDamage`, emit `gameEvents.emit('lives:changed', { lives: next.lives })`, call `cameraController.shake()`, and respawn the player at the last activated checkpoint (or `level.playerStart` if none) via `player.setPosition(...)`. Emit `gameEvents.emit('player:died', { livesRemaining: next.lives })`. Add a brief invulnerability window (e.g. 1000ms flag) so standing in a hazard doesn't drain all lives in one frame.
- If `next.isGameOver`, emit `gameEvents.emit('game:over', { finalScore: 0, bestScore: 0 })` (real score values wired in Task 10) and stop further damage processing.
- Add an Arcade overlap between `player.sprite` and each checkpoint: on overlap, call `checkpoint.activate()`; if it returns true (first activation), update `livesState.checkpointId` and emit `gameEvents.emit('checkpoint:reached', { id: checkpoint.id })`.

- [ ] **Step 7: Manually verify in the browser**

Run: `npm run dev`, Enter to Play scene.
Expected: walking into a spike causes a camera shake and respawn at the level start (no checkpoint reached yet); after touching the checkpoint (now filled solid) and then hitting a spike, the player respawns at the checkpoint instead; after 3 total hits the scene stops responding to further damage (game over path, full screen wired in Task 13). No console errors, no rapid repeated damage from standing in one spike.

- [ ] **Step 8: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add hazards, checkpoints, damage, and lives system

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Enemy FSM Core + Patrol Enemy

**Files:**
- Create: `src/game/entities/enemyFsm.ts`, `src/game/entities/EnemyBase.ts`, `src/game/entities/PatrolEnemy.ts`
- Modify: `src/game/levels/LevelLoader.ts`, `src/game/scenes/PlayScene.ts`
- Test: `tests/enemyFsm.test.ts`

**Interfaces:**
- Consumes: `EnemyDef` (Task 6), `gameEvents` (Task 2).
- Produces: `EnemyState`, `EnemyFsmContext`, `EnemyFsmEvent`, `enemyFsmReducer` from `enemyFsm.ts` — consumed by `EnemyBase` here and by Task 9's `FlyingEnemy`/`ChaseEnemy`. Produces `EnemyBase` abstract class with `sprite`, `context`, `tick(dtSeconds, distanceToPlayer)`, `hit()`, consumed by Task 9.

- [ ] **Step 1: Write failing tests for the enemy FSM reducer**

`tests/enemyFsm.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { enemyFsmReducer, type EnemyFsmContext } from '../src/game/entities/enemyFsm';

const baseContext: EnemyFsmContext = {
  state: 'patrol',
  detectionRadius: 150,
  leashRadius: 300,
  distanceToPlayer: 500,
  hurtTimerMs: 0,
};

describe('enemyFsmReducer', () => {
  it('stays in patrol when the player is outside detection radius', () => {
    const next = enemyFsmReducer(baseContext, { type: 'TICK', dtMs: 16 }, { canChase: true });
    expect(next.state).toBe('patrol');
  });

  it('transitions patrol -> chase when player enters detection radius and enemy can chase', () => {
    const context = { ...baseContext, distanceToPlayer: 100 };
    const next = enemyFsmReducer(context, { type: 'TICK', dtMs: 16 }, { canChase: true });
    expect(next.state).toBe('chase');
  });

  it('does not chase if the enemy archetype cannot chase (e.g. plain patrol)', () => {
    const context = { ...baseContext, distanceToPlayer: 50 };
    const next = enemyFsmReducer(context, { type: 'TICK', dtMs: 16 }, { canChase: false });
    expect(next.state).toBe('patrol');
  });

  it('transitions chase -> patrol when player exceeds leash radius', () => {
    const context: EnemyFsmContext = { ...baseContext, state: 'chase', distanceToPlayer: 350 };
    const next = enemyFsmReducer(context, { type: 'TICK', dtMs: 16 }, { canChase: true });
    expect(next.state).toBe('patrol');
  });

  it('transitions any state -> hurt on HIT, and starts a hurt timer', () => {
    const next = enemyFsmReducer(baseContext, { type: 'HIT' }, { canChase: true });
    expect(next.state).toBe('hurt');
    expect(next.hurtTimerMs).toBeGreaterThan(0);
  });

  it('transitions hurt -> dead once the hurt timer elapses', () => {
    const context: EnemyFsmContext = { ...baseContext, state: 'hurt', hurtTimerMs: 10 };
    const next = enemyFsmReducer(context, { type: 'TICK', dtMs: 20 }, { canChase: true });
    expect(next.state).toBe('dead');
  });

  it('stays dead regardless of further ticks', () => {
    const context: EnemyFsmContext = { ...baseContext, state: 'dead' };
    const next = enemyFsmReducer(context, { type: 'TICK', dtMs: 1000 }, { canChase: true });
    expect(next.state).toBe('dead');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/enemyFsm.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the FSM reducer**

`src/game/entities/enemyFsm.ts`:
```ts
export type EnemyState = 'idle' | 'patrol' | 'chase' | 'hurt' | 'dead';

export interface EnemyFsmContext {
  state: EnemyState;
  detectionRadius: number;
  leashRadius: number;
  distanceToPlayer: number;
  hurtTimerMs: number;
}

export type EnemyFsmEvent = { type: 'TICK'; dtMs: number } | { type: 'HIT' };

export interface EnemyCapabilities {
  canChase: boolean;
}

const HURT_DURATION_MS = 300;

export function enemyFsmReducer(
  context: EnemyFsmContext,
  event: EnemyFsmEvent,
  capabilities: EnemyCapabilities,
): EnemyFsmContext {
  if (context.state === 'dead') return context;

  if (event.type === 'HIT') {
    return { ...context, state: 'hurt', hurtTimerMs: HURT_DURATION_MS };
  }

  if (context.state === 'hurt') {
    const hurtTimerMs = context.hurtTimerMs - event.dtMs;
    if (hurtTimerMs <= 0) return { ...context, state: 'dead', hurtTimerMs: 0 };
    return { ...context, hurtTimerMs };
  }

  if (!capabilities.canChase) return { ...context, state: 'patrol' };

  if (context.state === 'chase' && context.distanceToPlayer > context.leashRadius) {
    return { ...context, state: 'patrol' };
  }
  if (context.state !== 'chase' && context.distanceToPlayer <= context.detectionRadius) {
    return { ...context, state: 'chase' };
  }
  return context;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/enemyFsm.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement EnemyBase and PatrolEnemy**

`src/game/entities/EnemyBase.ts`:
```ts
import Phaser from 'phaser';
import { enemyFsmReducer, type EnemyFsmContext, type EnemyCapabilities } from './enemyFsm';

export abstract class EnemyBase {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  context: EnemyFsmContext;
  protected abstract capabilities: EnemyCapabilities;

  constructor(scene: Phaser.Scene, x: number, y: number, tint: number) {
    this.sprite = scene.physics.add.sprite(x, y, '__WHITE');
    this.sprite.setDisplaySize(24, 24);
    this.sprite.setTint(tint);
    this.context = { state: 'patrol', detectionRadius: 150, leashRadius: 300, distanceToPlayer: Infinity, hurtTimerMs: 0 };
  }

  tick(dtMs: number, distanceToPlayer: number): void {
    if (this.context.state === 'dead') return;
    this.context = enemyFsmReducer({ ...this.context, distanceToPlayer }, { type: 'TICK', dtMs }, this.capabilities);
    if (this.context.state === 'dead') {
      this.sprite.setActive(false).setVisible(false);
      (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    }
    this.onTick(dtMs);
  }

  hit(): void {
    this.context = enemyFsmReducer(this.context, { type: 'HIT' }, this.capabilities);
  }

  protected abstract onTick(dtMs: number): void;
}
```

`src/game/entities/PatrolEnemy.ts`:
```ts
import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import type { EnemyCapabilities } from './enemyFsm';

export class PatrolEnemy extends EnemyBase {
  protected capabilities: EnemyCapabilities = { canChase: false };
  private readonly startX: number;
  private readonly rangePx: number;
  private direction = 1;
  private readonly speedPxPerSec = 60;

  constructor(scene: Phaser.Scene, x: number, y: number, rangePx: number) {
    super(scene, x, y, 0xf97316);
    this.startX = x;
    this.rangePx = rangePx;
  }

  protected onTick(dtMs: number): void {
    if (this.context.state === 'hurt') {
      this.sprite.setVelocityX(0);
      return;
    }
    const dtSeconds = dtMs / 1000;
    const nextX = this.sprite.x + this.direction * this.speedPxPerSec * dtSeconds;
    if (nextX > this.startX + this.rangePx || nextX < this.startX - this.rangePx) this.direction *= -1;
    this.sprite.setVelocityX(this.direction * this.speedPxPerSec);
    this.sprite.setFlipX(this.direction < 0);
  }
}
```

- [ ] **Step 6: Wire enemy spawning and player-touch damage into LevelLoader/PlayScene**

Modify `LevelLoader.buildInScene`: for each `EnemyDef` with `kind === 'patrol'`, construct a `PatrolEnemy` and collect into `EnemyBase[]`; return it in `LevelBuildResult` (Flying/Chase kinds are handled starting Task 9 — for now, throw a clear error if an unhandled kind appears, so gaps are visible rather than silently skipped).

Modify `PlayScene.update()`: for each enemy, call `enemy.tick(delta, Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, player.sprite.x, player.sprite.y))`. Add an Arcade overlap between `player.sprite` and each enemy's sprite that triggers the same damage/respawn path as hazards (Task 7) when the enemy is not in the `dead` state.

- [ ] **Step 7: Manually verify in the browser**

Run: `npm run dev`, Enter to Play scene, walk to the patrol enemy near the level end.
Expected: enemy walks back and forth between its patrol bounds, reversing direction cleanly; touching it damages the player and respawns at the last checkpoint, same as a hazard.

- [ ] **Step 8: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add enemy FSM core and patrol enemy archetype

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Flying Enemy + Chase Enemy

**Files:**
- Create: `src/game/entities/FlyingEnemy.ts`, `src/game/entities/ChaseEnemy.ts`
- Modify: `src/game/levels/LevelLoader.ts`

**Interfaces:**
- Consumes: `EnemyBase`, `enemyFsm` types (Task 8).
- Produces: `FlyingEnemy`, `ChaseEnemy` classes, consumed by Task 14 (Industrial Ruins uses Flying) and Task 15 (Neon Caverns uses Chase).

- [ ] **Step 1: Implement FlyingEnemy**

`src/game/entities/FlyingEnemy.ts`:
```ts
import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import type { EnemyCapabilities } from './enemyFsm';

export class FlyingEnemy extends EnemyBase {
  protected capabilities: EnemyCapabilities = { canChase: false };
  private readonly baseY: number;
  private readonly amplitudePx: number;
  private elapsedSeconds = 0;
  private readonly periodSeconds = 2.5;

  constructor(scene: Phaser.Scene, x: number, y: number, amplitudePx: number) {
    super(scene, x, y, 0xa855f7);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.baseY = y;
    this.amplitudePx = amplitudePx;
  }

  protected onTick(dtMs: number): void {
    if (this.context.state === 'hurt') return;
    this.elapsedSeconds += dtMs / 1000;
    const offset = Math.sin((this.elapsedSeconds / this.periodSeconds) * Math.PI * 2) * this.amplitudePx;
    this.sprite.y = this.baseY + offset;
  }
}
```

- [ ] **Step 2: Implement ChaseEnemy**

`src/game/entities/ChaseEnemy.ts`:
```ts
import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import type { EnemyCapabilities } from './enemyFsm';

export class ChaseEnemy extends EnemyBase {
  protected capabilities: EnemyCapabilities = { canChase: true };
  private readonly speedPxPerSec = 140;
  private targetX = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 0xdc2626);
  }

  setPlayerX(x: number): void {
    this.targetX = x;
  }

  protected onTick(): void {
    if (this.context.state === 'hurt') {
      this.sprite.setVelocityX(0);
      return;
    }
    if (this.context.state !== 'chase') {
      this.sprite.setVelocityX(0);
      return;
    }
    const direction = Math.sign(this.targetX - this.sprite.x);
    this.sprite.setVelocityX(direction * this.speedPxPerSec);
    this.sprite.setFlipX(direction < 0);
  }
}
```

- [ ] **Step 3: Wire both kinds into LevelLoader**

Modify `LevelLoader.buildInScene`'s enemy-construction switch to handle `'flying'` (pass `def.rangePx` as amplitude) and `'chase'` (construct `ChaseEnemy`, and in `PlayScene.update()` call `chaseEnemy.setPlayerX(player.sprite.x)` before `tick()` for every `ChaseEnemy` instance — cast/filter the `EnemyBase[]` array by `instanceof ChaseEnemy`).

- [ ] **Step 4: Manually verify in the browser**

Temporarily add one `{ kind: 'flying', x: 1300, y: 350, rangePx: 40 }` and one `{ kind: 'chase', x: 1800, y: 468, rangePx: 0 }` to `level001.enemies` (Level 1 is meant to be enemy-light per the spec — revert this addition after verifying; Flying/Chase get their real placements in Levels 2–3, Tasks 14–15).

Run: `npm run dev`, Enter to Play scene.
Expected: flying enemy bobs smoothly along a sine path ignoring gravity/ground; chase enemy stays idle until the player is within ~150px, then pursues at a bounded speed, and gives up once the player is far enough away (leash). Revert the temporary level001 edit once confirmed.

- [ ] **Step 5: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add flying and chase enemy archetypes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Collectibles + Scoring System

**Files:**
- Create: `src/utils/scoring.ts`, `src/game/entities/Collectible.ts`
- Modify: `src/game/levels/LevelLoader.ts`, `src/game/scenes/PlayScene.ts`
- Test: `tests/scoring.test.ts`

**Interfaces:**
- Consumes: `CollectibleDef` (Task 6), `gameEvents` (Task 2).
- Produces: `ScoreState`, `collectGem`, `collectSecret`, `computeRating`, `Rating` from `scoring.ts` — consumed by Task 13 (LevelCompleteScreen shows rating) and Task 11 (SaveSystem stores best score).

- [ ] **Step 1: Write failing tests for scoring**

`tests/scoring.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createScoreState, collectGem, collectSecret, computeRating } from '../src/utils/scoring';

describe('scoring', () => {
  it('starts at zero score and zero collected', () => {
    const state = createScoreState(6);
    expect(state.score).toBe(0);
    expect(state.collected).toBe(0);
    expect(state.total).toBe(6);
  });

  it('collecting a gem adds 10 points and increments collected', () => {
    const state = createScoreState(6);
    const next = collectGem(state);
    expect(next.score).toBe(10);
    expect(next.collected).toBe(1);
  });

  it('collecting a secret adds 100 points', () => {
    const state = createScoreState(6);
    const next = collectSecret(state);
    expect(next.score).toBe(100);
    expect(next.collected).toBe(1);
  });

  it('computeRating returns gold for full collection well under par time', () => {
    const state = { score: 160, collected: 6, total: 6 };
    expect(computeRating(state, 30, 75)).toBe('gold');
  });

  it('computeRating returns bronze for low collection or slow time', () => {
    const state = { score: 20, collected: 2, total: 6 };
    expect(computeRating(state, 200, 75)).toBe('bronze');
  });

  it('computeRating returns silver for a middling run', () => {
    const state = { score: 80, collected: 4, total: 6 };
    expect(computeRating(state, 80, 75)).toBe('silver');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scoring.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the scoring module**

`src/utils/scoring.ts`:
```ts
export interface ScoreState {
  score: number;
  collected: number;
  total: number;
}

export const GEM_SCORE = 10;
export const SECRET_SCORE = 100;

export function createScoreState(total: number): ScoreState {
  return { score: 0, collected: 0, total };
}

export function collectGem(state: ScoreState): ScoreState {
  return { ...state, score: state.score + GEM_SCORE, collected: state.collected + 1 };
}

export function collectSecret(state: ScoreState): ScoreState {
  return { ...state, score: state.score + SECRET_SCORE, collected: state.collected + 1 };
}

export type Rating = 'bronze' | 'silver' | 'gold';

export function computeRating(state: ScoreState, elapsedSeconds: number, parTimeSeconds: number): Rating {
  const collectionRatio = state.total === 0 ? 1 : state.collected / state.total;
  const underPar = elapsedSeconds <= parTimeSeconds;
  const withinOneAndHalfPar = elapsedSeconds <= parTimeSeconds * 1.5;

  if (collectionRatio === 1 && underPar) return 'gold';
  if (collectionRatio >= 0.5 && withinOneAndHalfPar) return 'silver';
  return 'bronze';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the Collectible entity**

`src/game/entities/Collectible.ts`:
```ts
import Phaser from 'phaser';
import type { CollectibleDef } from '../levels/types';

export class Collectible {
  readonly kind: CollectibleDef['kind'];
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private collected = false;

  constructor(scene: Phaser.Scene, def: CollectibleDef) {
    this.kind = def.kind;
    this.sprite = scene.physics.add.sprite(def.x, def.y, '__WHITE');
    this.sprite.setDisplaySize(14, 14);
    this.sprite.setTint(def.kind === 'secret' ? 0xf472b6 : 0xfacc15);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  }

  collect(): boolean {
    if (this.collected) return false;
    this.collected = true;
    this.sprite.setActive(false).setVisible(false);
    (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    return true;
  }
}
```

- [ ] **Step 6: Wire collectible spawning and score emission into LevelLoader/PlayScene**

Modify `LevelLoader.buildInScene` to construct a `Collectible[]` from `level.collectibles` and return it, plus `totalCollectibles = level.collectibles.length` in `LevelBuildResult`.

Modify `PlayScene`: hold `scoreState: ScoreState` initialized via `createScoreState(totalCollectibles)`. Add an Arcade overlap between `player.sprite` and each collectible's sprite: on overlap, call `collectible.collect()`; if it returns true, update `scoreState` via `collectGem`/`collectSecret` based on `collectible.kind`, then emit `gameEvents.emit('score:changed', { score: scoreState.score })` and `gameEvents.emit('collectible:changed', { collected: scoreState.collected, total: scoreState.total })`.

Update the `game:over` emission from Task 7 to use the real `finalScore: scoreState.score` (the `bestScore` field is filled in properly once Task 11's SaveSystem exists — use `0` as a placeholder there, replaced in Task 11).

- [ ] **Step 7: Manually verify in the browser**

Run: `npm run dev`, Enter to Play scene, walk over several gems and the secret gem.
Expected: each collectible disappears exactly once on touch (no double-counting), console has no errors. (Score isn't visible on-screen yet — that's Task 12's HUD; verify via a temporary `console.log` in the event handler, then remove it before committing.)

- [ ] **Step 8: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add collectibles and scoring system

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: SaveSystem (Persistence)

**Files:**
- Create: `src/game/systems/SaveSystem.ts`
- Test: `tests/SaveSystem.test.ts`

**Interfaces:**
- Produces: `SaveData`, `DEFAULT_SAVE`, `loadSave(storage)`, `writeSave(storage, data)`, `updateHighScore`, `unlockLevel`, `recordLevelResult` from `SaveSystem.ts` — consumed by Task 13 (GameOverScreen/LevelCompleteScreen read/write high score and unlocks), Task 16 (settings persistence), Task 17 (theme/reduced-motion persistence).

- [ ] **Step 1: Write failing tests for SaveSystem**

`tests/SaveSystem.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_SAVE,
  loadSave,
  writeSave,
  updateHighScore,
  unlockLevel,
  recordLevelResult,
} from '../src/game/systems/SaveSystem';

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const store = { ...initial };
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe('SaveSystem', () => {
  it('returns DEFAULT_SAVE when no save exists', () => {
    const storage = fakeStorage();
    expect(loadSave(storage)).toEqual(DEFAULT_SAVE);
  });

  it('returns DEFAULT_SAVE when the stored value is corrupt JSON', () => {
    const storage = fakeStorage({ 'ddr:save:v1': '{not json' });
    expect(loadSave(storage)).toEqual(DEFAULT_SAVE);
  });

  it('round-trips a written save', () => {
    const storage = fakeStorage();
    const data = updateHighScore(DEFAULT_SAVE, 500);
    writeSave(storage, data);
    expect(loadSave(storage).highScore).toBe(500);
  });

  it('updateHighScore only raises the score, never lowers it', () => {
    const withHigh = updateHighScore(DEFAULT_SAVE, 500);
    const unchanged = updateHighScore(withHigh, 100);
    expect(unchanged.highScore).toBe(500);
  });

  it('unlockLevel marks a level unlocked without clobbering others', () => {
    const next = unlockLevel(DEFAULT_SAVE, 'level002');
    expect(next.levels.level002.unlocked).toBe(true);
    expect(next.levels.level001.unlocked).toBe(true); // level001 starts unlocked by default
  });

  it('recordLevelResult keeps the best score and best (lowest) time per level', () => {
    let data = recordLevelResult(DEFAULT_SAVE, 'level001', 100, 60);
    data = recordLevelResult(data, 'level001', 80, 40);
    expect(data.levels.level001.bestScore).toBe(100);
    expect(data.levels.level001.bestTimeSeconds).toBe(40);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/SaveSystem.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement SaveSystem**

`src/game/systems/SaveSystem.ts`:
```ts
export interface LevelSaveEntry {
  bestScore: number;
  bestTimeSeconds: number | null;
  unlocked: boolean;
}

export interface SaveData {
  version: 1;
  highScore: number;
  levels: Record<string, LevelSaveEntry>;
  settings: {
    musicVolume: number;
    sfxVolume: number;
    muted: boolean;
    theme: 'dark' | 'light';
    reducedMotion: boolean;
  };
}

const SAVE_KEY = 'ddr:save:v1';

export const DEFAULT_SAVE: SaveData = {
  version: 1,
  highScore: 0,
  levels: {
    level001: { bestScore: 0, bestTimeSeconds: null, unlocked: true },
    level002: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
    level003: { bestScore: 0, bestTimeSeconds: null, unlocked: false },
  },
  settings: {
    musicVolume: 0.6,
    sfxVolume: 0.8,
    muted: false,
    theme: 'dark',
    reducedMotion: false,
  },
};

function isValidSaveData(value: unknown): value is SaveData {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Partial<SaveData>;
  return data.version === 1 && typeof data.highScore === 'number' && typeof data.levels === 'object' && typeof data.settings === 'object';
}

export function loadSave(storage: Storage): SaveData {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return DEFAULT_SAVE;
  try {
    const parsed = JSON.parse(raw);
    return isValidSaveData(parsed) ? parsed : DEFAULT_SAVE;
  } catch {
    return DEFAULT_SAVE;
  }
}

export function writeSave(storage: Storage, data: SaveData): void {
  storage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function updateHighScore(data: SaveData, score: number): SaveData {
  if (score <= data.highScore) return data;
  return { ...data, highScore: score };
}

export function unlockLevel(data: SaveData, levelId: string): SaveData {
  const existing = data.levels[levelId] ?? { bestScore: 0, bestTimeSeconds: null, unlocked: false };
  return { ...data, levels: { ...data.levels, [levelId]: { ...existing, unlocked: true } } };
}

export function recordLevelResult(data: SaveData, levelId: string, score: number, timeSeconds: number): SaveData {
  const existing = data.levels[levelId] ?? { bestScore: 0, bestTimeSeconds: null, unlocked: true };
  const bestScore = Math.max(existing.bestScore, score);
  const bestTimeSeconds =
    existing.bestTimeSeconds === null ? timeSeconds : Math.min(existing.bestTimeSeconds, timeSeconds);
  return { ...data, levels: { ...data.levels, [levelId]: { bestScore, bestTimeSeconds, unlocked: existing.unlocked } } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/SaveSystem.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add versioned localStorage save system

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: HUD Overlay

**Files:**
- Create: `src/ui/HUD.ts`, `src/ui/styles/hud.css`
- Modify: `index.html`, `src/main.ts`, `src/game/scenes/PlayScene.ts`
- Test: `tests/HUD.test.ts`

**Interfaces:**
- Consumes: `gameEvents` (Task 2) events `score:changed`, `lives:changed`, `collectible:changed`, `level:progress`, `timer:tick`, `game:pause`/`game:resume`.
- Produces: `HUD` class with `mount(root: HTMLElement): void` and `destroy(): void`, consumed by `main.ts` wiring in this task and referenced (pattern) by Task 13's other screens.

- [ ] **Step 1: Write a failing test for HUD DOM rendering and event reactivity**

`tests/HUD.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus, type GameEvents } from '../src/game/core/EventBus';
import { HUD } from '../src/ui/HUD';

describe('HUD', () => {
  let bus: EventBus<GameEvents>;
  let root: HTMLElement;

  beforeEach(() => {
    bus = new EventBus<GameEvents>();
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('renders initial score, lives, and collectible counters', () => {
    const hud = new HUD(bus);
    hud.mount(root);
    expect(root.querySelector('[data-hud="score"]')?.textContent).toBe('0');
    expect(root.querySelector('[data-hud="lives"]')?.textContent).toBe('3');
    expect(root.querySelector('[data-hud="collectibles"]')?.textContent).toBe('0/0');
  });

  it('updates score when score:changed is emitted', () => {
    const hud = new HUD(bus);
    hud.mount(root);
    bus.emit('score:changed', { score: 40 });
    expect(root.querySelector('[data-hud="score"]')?.textContent).toBe('40');
  });

  it('updates lives when lives:changed is emitted', () => {
    const hud = new HUD(bus);
    hud.mount(root);
    bus.emit('lives:changed', { lives: 1 });
    expect(root.querySelector('[data-hud="lives"]')?.textContent).toBe('1');
  });

  it('updates collectible count when collectible:changed is emitted', () => {
    const hud = new HUD(bus);
    hud.mount(root);
    bus.emit('collectible:changed', { collected: 3, total: 6 });
    expect(root.querySelector('[data-hud="collectibles"]')?.textContent).toBe('3/6');
  });

  it('emits game:pause when the pause button is clicked', () => {
    const hud = new HUD(bus);
    hud.mount(root);
    let paused = false;
    bus.on('game:pause', () => {
      paused = true;
    });
    (root.querySelector('[data-hud="pause-button"]') as HTMLButtonElement).click();
    expect(paused).toBe(true);
  });

  it('stops updating after destroy()', () => {
    const hud = new HUD(bus);
    hud.mount(root);
    hud.destroy();
    bus.emit('score:changed', { score: 999 });
    expect(root.querySelector('[data-hud="score"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/HUD.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement HUD**

`src/ui/HUD.ts`:
```ts
import type { EventBus, GameEvents } from '../game/core/EventBus';

export class HUD {
  private container: HTMLElement | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor(private readonly bus: EventBus<GameEvents>) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'hud';
    container.innerHTML = `
      <div class="hud__item">Score: <span data-hud="score">0</span></div>
      <div class="hud__item">Lives: <span data-hud="lives">3</span></div>
      <div class="hud__item">Gems: <span data-hud="collectibles">0/0</span></div>
      <div class="hud__item">Time: <span data-hud="timer">0</span>s</div>
      <button class="hud__pause" data-hud="pause-button" aria-label="Pause game">II</button>
    `;
    root.appendChild(container);
    this.container = container;

    const scoreEl = container.querySelector('[data-hud="score"]') as HTMLElement;
    const livesEl = container.querySelector('[data-hud="lives"]') as HTMLElement;
    const collectiblesEl = container.querySelector('[data-hud="collectibles"]') as HTMLElement;
    const timerEl = container.querySelector('[data-hud="timer"]') as HTMLElement;
    const pauseButton = container.querySelector('[data-hud="pause-button"]') as HTMLButtonElement;

    this.unsubscribers.push(
      this.bus.on('score:changed', ({ score }) => (scoreEl.textContent = String(score))),
      this.bus.on('lives:changed', ({ lives }) => (livesEl.textContent = String(lives))),
      this.bus.on('collectible:changed', ({ collected, total }) => (collectiblesEl.textContent = `${collected}/${total}`)),
      this.bus.on('timer:tick', ({ seconds }) => (timerEl.textContent = String(Math.floor(seconds)))),
    );
    pauseButton.addEventListener('click', () => this.bus.emit('game:pause', {}));
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    this.container?.remove();
    this.container = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/HUD.test.ts`
Expected: PASS.

- [ ] **Step 5: Add HUD styling**

`src/ui/styles/hud.css`:
```css
.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 1.25rem;
  align-items: center;
  padding: 0.6rem 1rem;
  font: 600 0.95rem/1.2 system-ui, sans-serif;
  color: var(--ddr-hud-text);
  background: var(--ddr-hud-bg);
  backdrop-filter: blur(6px);
  pointer-events: none;
}
.hud__item { pointer-events: none; }
.hud__pause {
  margin-left: auto;
  pointer-events: auto;
  background: var(--ddr-surface);
  color: var(--ddr-hud-text);
  border: 1px solid var(--ddr-border);
  border-radius: 0.5rem;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
}
.hud__pause:focus-visible { outline: 2px solid var(--ddr-accent); outline-offset: 2px; }
```
(`--ddr-*` custom properties are defined in Task 17's `tokens.css`; until then this renders with browser defaults, which is fine — visual QA happens in Task 25.)

- [ ] **Step 6: Mount the HUD from PlayScene and drive the level timer**

Modify `src/main.ts` to construct `gameEvents`-backed `HUD` once and mount it to `#ui-root` after the Phaser game is created (HUD persists across scene changes; individual scenes just emit events).

Modify `PlayScene`: track `elapsedSeconds` since scene start, emit `gameEvents.emit('timer:tick', { seconds: elapsedSeconds })` and `gameEvents.emit('level:progress', { percent: player.sprite.x / level.widthPx })` once per second (guard with an accumulator, not every frame).

Link the CSS files by adding `<link rel="stylesheet" href="/src/ui/styles/hud.css" />` to `index.html`.

- [ ] **Step 7: Manually verify in the browser**

Run: `npm run dev`, Enter to Play scene.
Expected: HUD bar shows live score/lives/collectible/timer updates while playing, pause button is clickable (no visible pause behavior yet — wired in Task 13), no layout overlap with the game canvas, no console errors.

- [ ] **Step 8: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add HUD overlay wired to game events

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: Screen Flow — Main Menu, Pause, Game Over, Level Complete

**Files:**
- Create: `src/ui/MainMenu.ts`, `src/ui/PauseMenu.ts`, `src/ui/GameOverScreen.ts`, `src/ui/LevelCompleteScreen.ts`, `src/ui/styles/menus.css`
- Modify: `src/main.ts`, `src/game/scenes/MainMenuScene.ts`, `src/game/scenes/PlayScene.ts`, `index.html`
- Test: `tests/PauseMenu.test.ts`, `tests/GameOverScreen.test.ts`

**Interfaces:**
- Consumes: `gameEvents` (Task 2), `SaveSystem` (Task 11), `scoring.Rating` (Task 10).
- Produces: a `ScreenManager`-free direct pattern — each screen class exposes `mount(root)`/`destroy()` like `HUD`; `main.ts` owns which screen is mounted based on `gameEvents` signals (`game:pause`/`game:resume`, `game:over`, `level:complete`, and a new `game:started`).

- [ ] **Step 1: Write failing tests for PauseMenu and GameOverScreen**

`tests/PauseMenu.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus, type GameEvents } from '../src/game/core/EventBus';
import { PauseMenu } from '../src/ui/PauseMenu';

describe('PauseMenu', () => {
  let bus: EventBus<GameEvents>;
  let root: HTMLElement;

  beforeEach(() => {
    bus = new EventBus<GameEvents>();
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('emits game:resume when Resume is clicked', () => {
    const menu = new PauseMenu(bus);
    menu.mount(root);
    let resumed = false;
    bus.on('game:resume', () => (resumed = true));
    (root.querySelector('[data-pause="resume"]') as HTMLButtonElement).click();
    expect(resumed).toBe(true);
  });

  it('exposes Restart and Exit-to-menu buttons', () => {
    const menu = new PauseMenu(bus);
    menu.mount(root);
    expect(root.querySelector('[data-pause="restart"]')).not.toBeNull();
    expect(root.querySelector('[data-pause="exit"]')).not.toBeNull();
  });
});
```

`tests/GameOverScreen.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus, type GameEvents } from '../src/game/core/EventBus';
import { GameOverScreen } from '../src/ui/GameOverScreen';

describe('GameOverScreen', () => {
  let bus: EventBus<GameEvents>;
  let root: HTMLElement;

  beforeEach(() => {
    bus = new EventBus<GameEvents>();
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('displays the final and best score it was constructed with', () => {
    const screen = new GameOverScreen(bus, { finalScore: 120, bestScore: 300 });
    screen.mount(root);
    expect(root.querySelector('[data-gameover="final-score"]')?.textContent).toBe('120');
    expect(root.querySelector('[data-gameover="best-score"]')?.textContent).toBe('300');
  });

  it('emits game:started when Retry is clicked', () => {
    const screen = new GameOverScreen(bus, { finalScore: 120, bestScore: 300 });
    screen.mount(root);
    let started = false;
    bus.on('game:started', () => (started = true));
    (root.querySelector('[data-gameover="retry"]') as HTMLButtonElement).click();
    expect(started).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/PauseMenu.test.ts tests/GameOverScreen.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement PauseMenu, GameOverScreen, LevelCompleteScreen, MainMenu**

`src/ui/PauseMenu.ts`:
```ts
import type { EventBus, GameEvents } from '../game/core/EventBus';

export class PauseMenu {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--overlay';
    container.innerHTML = `
      <div class="screen__panel">
        <h2>Paused</h2>
        <button data-pause="resume">Resume</button>
        <button data-pause="restart">Restart</button>
        <button data-pause="settings">Settings</button>
        <button data-pause="exit">Exit to Menu</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;
    container.querySelector('[data-pause="resume"]')!.addEventListener('click', () => this.bus.emit('game:resume', {}));
    container.querySelector('[data-pause="restart"]')!.addEventListener('click', () => this.bus.emit('game:started', { levelId: 'restart' }));
    container.querySelector('[data-pause="exit"]')!.addEventListener('click', () => this.bus.emit('game:started', { levelId: 'menu' }));
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
```

`src/ui/GameOverScreen.ts`:
```ts
import type { EventBus, GameEvents } from '../game/core/EventBus';

export interface GameOverData {
  finalScore: number;
  bestScore: number;
}

export class GameOverScreen {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>, private readonly data: GameOverData) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--overlay';
    container.innerHTML = `
      <div class="screen__panel">
        <h2>Game Over</h2>
        <p>Score: <span data-gameover="final-score">${this.data.finalScore}</span></p>
        <p>Best: <span data-gameover="best-score">${this.data.bestScore}</span></p>
        <button data-gameover="retry">Retry</button>
        <button data-gameover="menu">Main Menu</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;
    container.querySelector('[data-gameover="retry"]')!.addEventListener('click', () => this.bus.emit('game:started', { levelId: 'level001' }));
    container.querySelector('[data-gameover="menu"]')!.addEventListener('click', () => this.bus.emit('game:started', { levelId: 'menu' }));
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
```

`src/ui/LevelCompleteScreen.ts`:
```ts
import type { EventBus, GameEvents } from '../game/core/EventBus';
import type { Rating } from '../utils/scoring';

export interface LevelCompleteData {
  score: number;
  timeSeconds: number;
  collected: number;
  total: number;
  rating: Rating;
  nextLevelId: string | null;
}

export class LevelCompleteScreen {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>, private readonly data: LevelCompleteData) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--overlay';
    container.innerHTML = `
      <div class="screen__panel">
        <h2>Level Complete — ${this.data.rating.toUpperCase()}</h2>
        <p>Score: ${this.data.score}</p>
        <p>Time: ${Math.floor(this.data.timeSeconds)}s</p>
        <p>Gems: ${this.data.collected}/${this.data.total}</p>
        <button data-levelcomplete="continue">${this.data.nextLevelId ? 'Continue' : 'Back to Menu'}</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;
    container.querySelector('[data-levelcomplete="continue"]')!.addEventListener('click', () =>
      this.bus.emit('game:started', { levelId: this.data.nextLevelId ?? 'menu' }),
    );
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
```

`src/ui/MainMenu.ts`:
```ts
import type { EventBus, GameEvents } from '../game/core/EventBus';

export class MainMenu {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--menu';
    container.innerHTML = `
      <div class="screen__panel">
        <h1>Dangerous Dave: Recharged</h1>
        <button data-menu="play">Play</button>
        <button data-menu="settings">Settings</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;
    container.querySelector('[data-menu="play"]')!.addEventListener('click', () => this.bus.emit('game:started', { levelId: 'level001' }));
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/PauseMenu.test.ts tests/GameOverScreen.test.ts`
Expected: PASS.

- [ ] **Step 5: Add shared screen styling**

`src/ui/styles/menus.css`:
```css
.screen {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.screen--overlay { background: var(--ddr-overlay-bg); }
.screen__panel {
  background: var(--ddr-surface);
  color: var(--ddr-text);
  border-radius: 1rem;
  padding: 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 260px;
  text-align: center;
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.35);
}
.screen__panel button {
  padding: 0.6rem 1rem;
  border-radius: 0.6rem;
  border: 1px solid var(--ddr-border);
  background: var(--ddr-accent);
  color: var(--ddr-accent-text);
  font-weight: 600;
  cursor: pointer;
}
.screen__panel button:focus-visible { outline: 2px solid var(--ddr-focus); outline-offset: 2px; }
```

- [ ] **Step 6: Wire the full screen flow as the single orchestration point in `src/main.ts`**

Replace `src/main.ts` with an orchestrator that: creates the Phaser game once; keeps a `currentScreen: { destroy(): void } | null`; subscribes to `gameEvents` for `game:started` (mount `Play` scene via `game.scene.start('Play', { levelId })` or return to `MainMenu` when `levelId === 'menu'`, destroying whatever screen is mounted), `game:pause`/`game:resume` (pause/resume the `Play` scene with `game.scene.pause('Play')`/`resume('Play')` and mount/destroy `PauseMenu`), `game:over` (mount `GameOverScreen` with the payload, using `SaveSystem.loadSave(window.localStorage)` to source `bestScore` before emitting, and write the updated save via `updateHighScore`+`writeSave`), and `level:complete` (compute `Rating` via `computeRating`, persist via `recordLevelResult`+`unlockLevel`+`writeSave`, mount `LevelCompleteScreen`). Mount `MainMenu` initially instead of relying on `MainMenuScene`'s placeholder text — `MainMenuScene` becomes just the Phaser scene showing a background/logo behind the DOM `MainMenu` panel.

Modify `PlayScene`: accept `data: { levelId: string }` in its `init(data)` method to know which level file to load (`level001` for now; Tasks 14–15 add `level002`/`level003` to the same lookup), emit `gameEvents.emit('game:started', { levelId: level.id })` in `create()`, and emit `gameEvents.emit('level:complete', {...})` when the player reaches `level.goal` (overlap check), including `nextLevelId` resolution (`level002` after `level001`, `null` after the last level) passed to `main.ts`'s `LevelCompleteScreen` construction via the event payload plus a small lookup table in `main.ts`.

Remove the Task 3/9 temporary "press Enter to test Play scene" hooks now that `MainMenu`'s Play button drives the flow.

- [ ] **Step 7: Manually verify the full loop in the browser**

Run: `npm run dev`.
Expected: Main Menu → Play → move/jump/collect → Escape or HUD pause button pauses (Resume/Restart/Exit all work) → intentionally die 3 times → Game Over screen shows correct final/best score, Retry restarts Level 1, Main Menu returns to the menu → completing Level 1 (reach the goal) shows Level Complete with a sane rating, Continue currently loops back to `level001` again since `level002` doesn't exist until Task 14 (acceptable for now — re-verify after Task 14). No console errors at any transition.

- [ ] **Step 8: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: wire full menu/pause/game-over/level-complete screen flow

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 14: Level 2 (Industrial Ruins)

**Files:**
- Create: `src/game/levels/level002.ts`
- Modify: `src/game/scenes/PlayScene.ts` (level lookup), `src/game/levels/LevelLoader.ts` (falling-platform support), `src/game/entities/FallingPlatform.ts`

**Interfaces:**
- Consumes: `LevelData` (Task 6), `MovingPlatform` (Task 4), `FlyingEnemy`/`PatrolEnemy` (Tasks 8-9).
- Produces: `FallingPlatform` entity (`sprite`, `trigger(): void`), a `fallingPlatforms: FallingPlatformDef[]` field added to `LevelData`, and `level002`, consumed by `PlayScene`'s level lookup only (no other task depends on this level's internals).

- [ ] **Step 1: Add falling-platform support to the level type and loader**

Modify `src/game/levels/types.ts`: add `export interface FallingPlatformDef extends PlatformDef { fallDelayMs: number; }` and a `fallingPlatforms: FallingPlatformDef[]` field to `LevelData`. Also add `'fallingPlatforms'` to `LevelLoader.ts`'s `REQUIRED_FIELDS` array (Task 6) so validation stays in sync with the type, and add it to Level 1's export and its `LevelLoader.test.ts` fixture as an empty array so existing tests keep passing.

`src/game/entities/FallingPlatform.ts`:
```ts
import Phaser from 'phaser';
import type { FallingPlatformDef } from '../levels/types';

export class FallingPlatform {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private triggered = false;
  private readonly fallDelayMs: number;

  constructor(scene: Phaser.Scene, def: FallingPlatformDef) {
    this.sprite = scene.physics.add.sprite(def.x + def.width / 2, def.y + def.height / 2, '__WHITE');
    this.sprite.setDisplaySize(def.width, def.height);
    this.sprite.setTint(0xb45309);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.fallDelayMs = def.fallDelayMs;
  }

  trigger(scene: Phaser.Scene): void {
    if (this.triggered) return;
    this.triggered = true;
    this.sprite.setTint(0xef4444);
    scene.time.delayedCall(this.fallDelayMs, () => {
      (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
      (this.sprite.body as Phaser.Physics.Arcade.Body).setImmovable(false);
    });
  }
}
```

Modify `LevelLoader.buildInScene` to construct `FallingPlatform[]` from `level.fallingPlatforms`, collide the player against them, and return them in `LevelBuildResult`; `PlayScene` calls `.trigger(this)` on the specific falling platform when the player's body is `touching.down` against it (Arcade collider callback).

- [ ] **Step 2: Author Level 2 content**

`src/game/levels/level002.ts`:
```ts
import type { LevelData } from './types';

export const level002: LevelData = {
  id: 'level002',
  name: 'Industrial Ruins',
  widthPx: 2800,
  heightPx: 540,
  parTimeSeconds: 90,
  playerStart: { x: 60, y: 400 },
  groundY: 500,
  platforms: [
    { x: 0, y: 500, width: 500, height: 40 },
    { x: 700, y: 500, width: 400, height: 40 },
    { x: 1900, y: 500, width: 900, height: 40 },
  ],
  movingPlatforms: [
    { x: 550, y: 440, width: 100, height: 20, rangePx: 90, speedPxPerSec: 70 },
    { x: 1400, y: 380, width: 100, height: 20, rangePx: 140, speedPxPerSec: 90 },
  ],
  fallingPlatforms: [{ x: 1150, y: 460, width: 120, height: 20, fallDelayMs: 500 }],
  hazards: [
    { x: 780, y: 480, width: 32, height: 20, kind: 'spike' },
    { x: 2000, y: 480, width: 32, height: 20, kind: 'spike' },
    { x: 2200, y: 480, width: 32, height: 20, kind: 'spike' },
  ],
  enemies: [
    { kind: 'patrol', x: 900, y: 468, rangePx: 150 },
    { kind: 'flying', x: 1300, y: 300, rangePx: 60 },
    { kind: 'patrol', x: 2400, y: 468, rangePx: 180 },
  ],
  collectibles: [
    { x: 200, y: 460, kind: 'gem' },
    { x: 750, y: 460, kind: 'gem' },
    { x: 1180, y: 420, kind: 'gem' },
    { x: 1420, y: 340, kind: 'gem' },
    { x: 2100, y: 460, kind: 'gem' },
    { x: 2600, y: 460, kind: 'gem' },
    { x: 1440, y: 340, kind: 'secret' },
  ],
  checkpoints: [
    { id: 'level002-cp1', x: 1000, y: 460 },
    { id: 'level002-cp2', x: 1950, y: 460 },
  ],
  goal: { x: 2740, y: 460 },
  backgroundPalette: 'industrial',
};
```

- [ ] **Step 3: Add level002 to the level lookup**

Modify `PlayScene`'s level-lookup table (introduced in Task 13) to include `level002: level002`, and confirm Level 1's `nextLevelId` resolves to `'level002'`.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, complete Level 1, confirm Continue now loads Level 2.
Expected: moving platforms carry the player correctly at two different speeds/ranges, the falling platform holds briefly then drops after the player steps on it (must be able to jump off before it falls too far), patrol + flying enemies both function, all 3 hazards/7 collectibles reachable, goal at the far right triggers Level Complete with `nextLevelId` unresolved yet (Level 3 doesn't exist until Task 15 — acceptable for now).

- [ ] **Step 5: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add Level 2 (Industrial Ruins) with moving/falling platforms

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 15: Level 3 (Neon Caverns)

**Files:**
- Create: `src/game/levels/level003.ts`
- Modify: `src/game/scenes/PlayScene.ts` (level lookup)

**Interfaces:**
- Consumes: `LevelData` (Task 6), `ChaseEnemy` (Task 9).
- Produces: `level003`, consumed only by `PlayScene`'s level lookup.

- [ ] **Step 1: Author Level 3 content**

`src/game/levels/level003.ts`:
```ts
import type { LevelData } from './types';

export const level003: LevelData = {
  id: 'level003',
  name: 'Neon Caverns',
  widthPx: 3000,
  heightPx: 700,
  parTimeSeconds: 110,
  playerStart: { x: 60, y: 560 },
  groundY: 640,
  platforms: [
    { x: 0, y: 640, width: 400, height: 40 },
    { x: 500, y: 560, width: 200, height: 24 },
    { x: 800, y: 460, width: 200, height: 24 },
    { x: 1100, y: 640, width: 500, height: 40 },
    { x: 1750, y: 500, width: 160, height: 24 },
    { x: 2000, y: 380, width: 160, height: 24 },
    { x: 2300, y: 640, width: 700, height: 40 },
  ],
  movingPlatforms: [{ x: 1650, y: 300, width: 100, height: 20, rangePx: 100, speedPxPerSec: 100 }],
  fallingPlatforms: [],
  hazards: [
    { x: 420, y: 620, width: 32, height: 20, kind: 'spike' },
    { x: 1250, y: 620, width: 32, height: 20, kind: 'spike' },
    { x: 1400, y: 620, width: 32, height: 20, kind: 'spike' },
    { x: 2450, y: 620, width: 32, height: 20, kind: 'spike' },
  ],
  enemies: [
    { kind: 'chase', x: 1300, y: 608, rangePx: 0 },
    { kind: 'flying', x: 1900, y: 260, rangePx: 80 },
    { kind: 'chase', x: 2600, y: 608, rangePx: 0 },
  ],
  collectibles: [
    { x: 200, y: 600, kind: 'gem' },
    { x: 560, y: 520, kind: 'gem' },
    { x: 860, y: 420, kind: 'gem' },
    { x: 1780, y: 460, kind: 'gem' },
    { x: 2050, y: 340, kind: 'gem' },
    { x: 2700, y: 600, kind: 'gem' },
    { x: 2050, y: 300, kind: 'secret' },
  ],
  checkpoints: [
    { id: 'level003-cp1', x: 1150, y: 600 },
    { id: 'level003-cp2', x: 2320, y: 600 },
  ],
  goal: { x: 2960, y: 600 },
  backgroundPalette: 'neon',
};
```

Note the secret gem at `(2050, 300)` sits just above the reachable platform at `(2000, 380)`, requiring the player to use the nearby moving platform to reach an alternate branch — satisfying the spec's "one secret branching path" requirement for this level.

- [ ] **Step 2: Add level003 to the level lookup, with `nextLevelId: null` (last level in Milestone 1)**

Modify `PlayScene`'s level lookup to include `level003: level003`, and set `level002`'s resolved `nextLevelId` to `'level003'`.

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev`, play through to Level 3 (or temporarily set `MainMenu`'s Play button to start `level003` directly for faster iteration, then revert).
Expected: verticality is navigable with the tuned jump arc, the moving platform is needed to reach the upper secret branch, chase enemies correctly pursue within their leash and give up outside it, reaching the goal shows Level Complete with `nextLevelId: null` rendering "Back to Menu" instead of "Continue".

- [ ] **Step 4: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add Level 3 (Neon Caverns) with verticality and chase enemies

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 16: AudioSystem + Settings Panel

**Files:**
- Create: `src/game/systems/AudioSystem.ts`, `src/ui/SettingsPanel.ts`
- Modify: `src/main.ts`, `src/game/scenes/PlayScene.ts`, `src/ui/MainMenu.ts`, `src/ui/PauseMenu.ts`
- Test: `tests/AudioSystem.test.ts`

**Interfaces:**
- Consumes: `gameEvents` (Task 2), `SaveSystem` (Task 11).
- Produces: `AudioSystem` class with `playSfx(name: SfxName)`, `setMusicVolume`, `setSfxVolume`, `setMuted`, `startMusic(mood)`, `stopMusic()`, consumed by `PlayScene` (Task 16 wiring below) for jump/collect/damage/enemy-defeat/checkpoint/level-complete/UI-click cues.

- [ ] **Step 1: Write failing tests for AudioSystem's pure volume/mute logic**

`tests/AudioSystem.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { AudioSystem } from '../src/game/systems/AudioSystem';

function fakeAudioContext() {
  const oscillator = { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 }, type: 'sine' };
  const gainNode = { connect: vi.fn(), gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } };
  return {
    currentTime: 0,
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gainNode),
    destination: {},
  } as unknown as AudioContext;
}

describe('AudioSystem', () => {
  it('clamps music volume to [0, 1]', () => {
    const audio = new AudioSystem(fakeAudioContext());
    audio.setMusicVolume(1.5);
    expect(audio.getMusicVolume()).toBe(1);
    audio.setMusicVolume(-0.5);
    expect(audio.getMusicVolume()).toBe(0);
  });

  it('clamps sfx volume to [0, 1]', () => {
    const audio = new AudioSystem(fakeAudioContext());
    audio.setSfxVolume(2);
    expect(audio.getSfxVolume()).toBe(1);
  });

  it('does not play a tone when muted', () => {
    const ctx = fakeAudioContext();
    const audio = new AudioSystem(ctx);
    audio.setMuted(true);
    audio.playSfx('jump');
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('plays a tone when not muted', () => {
    const ctx = fakeAudioContext();
    const audio = new AudioSystem(ctx);
    audio.playSfx('jump');
    expect(ctx.createOscillator).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/AudioSystem.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement AudioSystem with procedural Web Audio tones**

`src/game/systems/AudioSystem.ts`:
```ts
export type SfxName = 'jump' | 'collect' | 'damage' | 'enemyDefeat' | 'checkpoint' | 'levelComplete' | 'uiClick';

const SFX_PROFILE: Record<SfxName, { freq: number; durationSeconds: number; type: OscillatorType }> = {
  jump: { freq: 520, durationSeconds: 0.12, type: 'square' },
  collect: { freq: 880, durationSeconds: 0.1, type: 'sine' },
  damage: { freq: 140, durationSeconds: 0.25, type: 'sawtooth' },
  enemyDefeat: { freq: 260, durationSeconds: 0.18, type: 'triangle' },
  checkpoint: { freq: 660, durationSeconds: 0.2, type: 'sine' },
  levelComplete: { freq: 990, durationSeconds: 0.4, type: 'sine' },
  uiClick: { freq: 400, durationSeconds: 0.06, type: 'square' },
};

export class AudioSystem {
  private musicVolume = 0.6;
  private sfxVolume = 0.8;
  private muted = false;

  constructor(private readonly context: AudioContext) {}

  setMusicVolume(value: number): void {
    this.musicVolume = Math.max(0, Math.min(1, value));
  }
  getMusicVolume(): number {
    return this.musicVolume;
  }
  setSfxVolume(value: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, value));
  }
  getSfxVolume(): number {
    return this.sfxVolume;
  }
  setMuted(value: boolean): void {
    this.muted = value;
  }

  playSfx(name: SfxName): void {
    if (this.muted) return;
    const profile = SFX_PROFILE[name];
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.type = profile.type;
    oscillator.frequency.value = profile.freq;
    gainNode.gain.setValueAtTime(this.sfxVolume * 0.5, this.context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + profile.durationSeconds);
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + profile.durationSeconds);
  }

  // Background "music" is a slow, quiet arpeggio loop synthesized per level mood — kept intentionally
  // simple (procedural, not a sample) to satisfy the no-external-audio-assets constraint.
  private musicIntervalId: ReturnType<typeof setInterval> | null = null;

  startMusic(moodNotes: number[] = [220, 277, 330, 277]): void {
    this.stopMusic();
    if (this.muted) return;
    let step = 0;
    this.musicIntervalId = setInterval(() => {
      if (this.muted) return;
      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = moodNotes[step % moodNotes.length];
      gainNode.gain.setValueAtTime(this.musicVolume * 0.15, this.context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.8);
      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + 0.8);
      step += 1;
    }, 900);
  }

  stopMusic(): void {
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/AudioSystem.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement SettingsPanel**

`src/ui/SettingsPanel.ts`:
```ts
import type { EventBus, GameEvents } from '../game/core/EventBus';
import type { SaveData } from '../game/systems/SaveSystem';

export class SettingsPanel {
  private container: HTMLElement | null = null;

  constructor(private readonly bus: EventBus<GameEvents>, private readonly initial: SaveData['settings']) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'screen screen--overlay';
    container.innerHTML = `
      <div class="screen__panel">
        <h2>Settings</h2>
        <label>Music
          <input type="range" min="0" max="1" step="0.05" data-settings="music" value="${this.initial.musicVolume}" />
        </label>
        <label>SFX
          <input type="range" min="0" max="1" step="0.05" data-settings="sfx" value="${this.initial.sfxVolume}" />
        </label>
        <label><input type="checkbox" data-settings="muted" ${this.initial.muted ? 'checked' : ''}/> Mute</label>
        <label><input type="checkbox" data-settings="reducedMotion" ${this.initial.reducedMotion ? 'checked' : ''}/> Reduced motion</label>
        <label>Theme
          <select data-settings="theme">
            <option value="dark" ${this.initial.theme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="light" ${this.initial.theme === 'light' ? 'selected' : ''}>Light</option>
          </select>
        </label>
        <button data-settings="close">Close</button>
      </div>
    `;
    root.appendChild(container);
    this.container = container;

    const emitChange = () => {
      this.bus.emit('settings:changed', {
        musicVolume: Number((container.querySelector('[data-settings="music"]') as HTMLInputElement).value),
        sfxVolume: Number((container.querySelector('[data-settings="sfx"]') as HTMLInputElement).value),
        muted: (container.querySelector('[data-settings="muted"]') as HTMLInputElement).checked,
        reducedMotion: (container.querySelector('[data-settings="reducedMotion"]') as HTMLInputElement).checked,
        theme: (container.querySelector('[data-settings="theme"]') as HTMLSelectElement).value as 'dark' | 'light',
      });
    };

    container.querySelectorAll('input, select').forEach((el) => el.addEventListener('input', emitChange));
    container.querySelector('[data-settings="close"]')!.addEventListener('click', () => this.destroy());
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
```

- [ ] **Step 6: Wire AudioSystem + SettingsPanel into the orchestrator and gameplay events**

Modify `src/main.ts`: construct one `AudioSystem` backed by `new (window.AudioContext ?? (window as any).webkitAudioContext)()`, seed its volumes/mute from `SaveSystem.loadSave(window.localStorage).settings`, subscribe to `gameEvents.on('settings:changed', ...)` to update the `AudioSystem` live and persist via `writeSave`, and open `SettingsPanel` when `MainMenu`'s or `PauseMenu`'s Settings button is clicked (add a `data-menu="settings"` button to `MainMenu` and wire it the same way as `PauseMenu`'s existing settings button from Task 13).

Modify `PlayScene` to accept the shared `AudioSystem` instance (constructor-injected from `main.ts` when starting the scene, e.g. via scene data or a small module-level accessor) and call `audio.playSfx(...)` at: jump triggered (Task 3's `shouldJump`), collectible collected (Task 10), damage taken (Task 7), enemy reaches `dead` state (Task 8), checkpoint activated (Task 7), and `audio.playSfx('levelComplete')` when the goal is reached. Call `audio.startMusic(moodForPalette(level.backgroundPalette))` in `create()` and `audio.stopMusic()` in `shutdown()`. Add `uiClick` playback to every menu button across `MainMenu`, `PauseMenu`, `GameOverScreen`, `LevelCompleteScreen`, `SettingsPanel` (small shared helper, e.g. wrap `addEventListener('click', ...)` calls).

- [ ] **Step 7: Manually verify in the browser**

Run: `npm run dev`.
Expected: distinct short blips for jump/collect/damage/checkpoint/level-complete, a quiet background arpeggio during play that stops on scene shutdown, Settings panel sliders immediately affect volume, mute silences everything, and settings survive a page refresh (persisted via `localStorage`).

- [ ] **Step 8: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add procedural Web Audio system and settings panel

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 17: Theme System + Reduced Motion + Settings Persistence Wiring

**Files:**
- Create: `src/ui/styles/tokens.css`, `src/ui/theme.ts`
- Modify: `src/ui/styles/base.css`, `src/main.ts`

**Interfaces:**
- Consumes: `SaveSystem` (Task 11), `gameEvents` `settings:changed` (Task 2/16).
- Produces: `applyTheme(theme: 'dark' | 'light')` and `applyReducedMotion(enabled: boolean)` from `theme.ts`, called from `main.ts`'s settings-change handler (extends Task 16's wiring, doesn't replace it).

- [ ] **Step 1: Define theme tokens for both palettes**

`src/ui/styles/tokens.css`:
```css
:root {
  --ddr-bg: #0b0b12;
  --ddr-surface: #16161f;
  --ddr-text: #f4f4f6;
  --ddr-hud-text: #f4f4f6;
  --ddr-hud-bg: rgb(10 10 16 / 0.55);
  --ddr-border: #2c2c3a;
  --ddr-accent: #4ade80;
  --ddr-accent-text: #0b0b12;
  --ddr-focus: #60a5fa;
  --ddr-overlay-bg: rgb(5 5 10 / 0.72);
}

:root[data-theme='light'] {
  --ddr-bg: #f4f4f8;
  --ddr-surface: #ffffff;
  --ddr-text: #17171f;
  --ddr-hud-text: #17171f;
  --ddr-hud-bg: rgb(255 255 255 / 0.7);
  --ddr-border: #d8d8e2;
  --ddr-accent: #15803d;
  --ddr-accent-text: #ffffff;
  --ddr-focus: #1d4ed8;
  --ddr-overlay-bg: rgb(255 255 255 / 0.75);
}

:root[data-reduced-motion='true'] * {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
}
```

- [ ] **Step 2: Base layout styling respecting the tokens**

`src/ui/styles/base.css`:
```css
html, body { margin: 0; height: 100%; background: var(--ddr-bg); color: var(--ddr-text); }
#app { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
#game-root { position: relative; }
#ui-root { position: absolute; inset: 0; pointer-events: none; }
#ui-root > * { pointer-events: auto; }
```

- [ ] **Step 3: Implement theme application helpers**

`src/ui/theme.ts`:
```ts
export function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function applyReducedMotion(enabled: boolean): void {
  document.documentElement.setAttribute('data-reduced-motion', String(enabled));
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

- [ ] **Step 4: Wire theme/reduced-motion on boot and on settings change**

Modify `src/main.ts`: on boot, call `applyTheme(save.settings.theme)` and `applyReducedMotion(save.settings.reducedMotion || prefersReducedMotion())`; inside the existing `settings:changed` handler (Task 16), also call `applyTheme(payload.theme)` and `applyReducedMotion(payload.reducedMotion)`.

Add `<link rel="stylesheet" href="/src/ui/styles/menus.css" />` to `index.html` if not already present from Task 13.

- [ ] **Step 5: Manually verify both themes and reduced motion in the browser**

Run: `npm run dev`, open Settings, switch to Light — verify all screens/HUD remain readable with good contrast (not just inverted — surface/border/accent colors were chosen deliberately per Step 1). Toggle Reduced Motion — verify camera shake amplitude/duration and any CSS transitions become negligible. Refresh the page — verify the theme persists.

- [ ] **Step 6: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add dark/light theme system and reduced-motion support

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 18: Touch Controls + Unified InputController

**Files:**
- Create: `src/game/systems/InputController.ts`, `src/ui/TouchControls.ts`, `src/ui/styles/touch-controls.css`
- Modify: `src/game/scenes/PlayScene.ts`, `index.html`
- Test: `tests/InputController.test.ts`

**Interfaces:**
- Consumes: `MoveInput` type (Task 3).
- Produces: `InputController` class with `getState(): MoveInput & { pausePressed: boolean }`, replacing `PlayScene`'s direct `cursors` usage; produces `TouchControls` DOM component that writes into the same `InputController` instance via `setVirtualState(partial)`.

- [ ] **Step 1: Write a failing test for InputController's merge-of-keyboard-and-virtual-state logic**

`tests/InputController.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mergeInputState } from '../src/game/systems/InputController';

describe('mergeInputState', () => {
  it('is true for a direction if either keyboard or virtual reports it held', () => {
    const merged = mergeInputState(
      { left: false, right: false, jumpPressed: false, jumpHeld: false, pausePressed: false },
      { left: true },
    );
    expect(merged.left).toBe(true);
    expect(merged.right).toBe(false);
  });

  it('keyboard-only state passes through unchanged with no virtual overrides', () => {
    const keyboard = { left: true, right: false, jumpPressed: true, jumpHeld: true, pausePressed: false };
    expect(mergeInputState(keyboard, {})).toEqual(keyboard);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/InputController.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement InputController with the pure merge function plus Phaser keyboard wiring**

`src/game/systems/InputController.ts`:
```ts
import Phaser from 'phaser';

export interface FullInputState {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  pausePressed: boolean;
}

export function mergeInputState(keyboard: FullInputState, virtual: Partial<FullInputState>): FullInputState {
  return {
    left: keyboard.left || !!virtual.left,
    right: keyboard.right || !!virtual.right,
    jumpPressed: keyboard.jumpPressed || !!virtual.jumpPressed,
    jumpHeld: keyboard.jumpHeld || !!virtual.jumpHeld,
    pausePressed: keyboard.pausePressed || !!virtual.pausePressed,
  };
}

export class InputController {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private escKey: Phaser.Input.Keyboard.Key;
  private virtual: Partial<FullInputState> = {};

  constructor(scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      left: scene.input.keyboard!.addKey('A'),
      right: scene.input.keyboard!.addKey('D'),
    };
    this.escKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  setVirtualState(partial: Partial<FullInputState>): void {
    this.virtual = { ...this.virtual, ...partial };
  }

  getState(): FullInputState {
    const keyboard: FullInputState = {
      left: this.cursors.left.isDown || this.wasd.left.isDown,
      right: this.cursors.right.isDown || this.wasd.right.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.cursors.up),
      jumpHeld: this.cursors.up.isDown,
      pausePressed: Phaser.Input.Keyboard.JustDown(this.escKey),
    };
    const merged = mergeInputState(keyboard, this.virtual);
    // Edge-triggered virtual jump is consumed once per read so a held touch button doesn't repeat-jump.
    if (this.virtual.jumpPressed) this.virtual.jumpPressed = false;
    if (this.virtual.pausePressed) this.virtual.pausePressed = false;
    return merged;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/InputController.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement TouchControls**

`src/ui/TouchControls.ts`:
```ts
import type { InputController } from '../game/systems/InputController';

export class TouchControls {
  private container: HTMLElement | null = null;

  constructor(private readonly input: InputController) {}

  mount(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'touch-controls';
    container.innerHTML = `
      <div class="touch-controls__dpad">
        <button class="touch-controls__btn" data-touch="left" aria-label="Move left">◀</button>
        <button class="touch-controls__btn" data-touch="right" aria-label="Move right">▶</button>
      </div>
      <button class="touch-controls__btn touch-controls__jump" data-touch="jump" aria-label="Jump">▲</button>
    `;
    root.appendChild(container);
    this.container = container;

    const bind = (selector: string, key: 'left' | 'right' | 'jumpHeld') => {
      const el = container.querySelector(selector) as HTMLButtonElement;
      const press = (e: Event) => {
        e.preventDefault();
        this.input.setVirtualState({ [key]: true, ...(key === 'jumpHeld' ? { jumpPressed: true } : {}) });
      };
      const release = (e: Event) => {
        e.preventDefault();
        this.input.setVirtualState({ [key]: false });
      };
      el.addEventListener('touchstart', press, { passive: false });
      el.addEventListener('touchend', release);
      el.addEventListener('touchcancel', release);
    };
    bind('[data-touch="left"]', 'left');
    bind('[data-touch="right"]', 'right');
    bind('[data-touch="jump"]', 'jumpHeld');
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
```

- [ ] **Step 6: Add touch-controls styling gated to coarse pointers**

`src/ui/styles/touch-controls.css`:
```css
.touch-controls {
  position: absolute;
  inset: auto 0 0 0;
  display: none;
  justify-content: space-between;
  padding: 0 1.25rem calc(1rem + env(safe-area-inset-bottom));
}
.touch-controls__dpad { display: flex; gap: 0.75rem; }
.touch-controls__btn {
  width: 60px; height: 60px; border-radius: 999px;
  background: rgb(255 255 255 / 0.15);
  border: 1px solid rgb(255 255 255 / 0.3);
  color: #fff; font-size: 1.4rem;
  touch-action: none; user-select: none;
}
@media (pointer: coarse) {
  .touch-controls { display: flex; }
}
```

- [ ] **Step 7: Replace PlayScene's direct keyboard reads with InputController, and mount TouchControls from `main.ts`**

Modify `PlayScene`: construct `this.inputController = new InputController(this)` in `create()`, replace the ad-hoc `cursors` reads in `update()` with `this.inputController.getState()`, and route `pausePressed` into the same `gameEvents.emit('game:pause', {})` path the HUD button uses.

Modify `src/main.ts`: after the Phaser game starts the `Play` scene, mount one `TouchControls` bound to that scene's exposed `InputController` (expose it via a small getter on the scene, e.g. `playScene.inputController`), and unmount it when leaving `Play`.

Add `<link rel="stylesheet" href="/src/ui/styles/touch-controls.css" />` to `index.html`.

- [ ] **Step 8: Manually verify in the browser**

Run: `npm run dev`, then in the Browser pane use `resize_window` with the `mobile` preset and reload.
Expected: translucent D-pad + jump button appear only in the mobile/touch emulation, respond to tap/hold without page scroll, and are absent at desktop size. Keyboard controls keep working unchanged at desktop size. Escape key and touch controls both funnel into the same pause path.

- [ ] **Step 9: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add unified keyboard/touch input controller and mobile controls

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 19: Procedural Animation + Particles / VFX

**Files:**
- Create: `src/game/systems/ParticleFX.ts`, `src/game/entities/PlayerAnimator.ts`
- Modify: `src/game/entities/Player.ts`, `src/game/entities/EnemyBase.ts`, `src/game/scenes/PlayScene.ts`

**Interfaces:**
- Consumes: `Player`, enemy/collectible sprites, `CameraController.shake` (existing), `prefersReducedMotion`/reduced-motion setting (Task 17).
- Produces: `ParticleFX` class with `dustAt(x, y)`, `jumpBurst(x, y)`, `landingDust(x, y)`, `sparkle(x, y)`, `enemyDefeat(x, y)`, `checkpointPulse(x, y)`, `levelCompleteBurst(x, y)`, each a no-op when reduced motion is active. Produces `PlayerAnimator` with `update(dtMs, state: 'idle'|'run'|'jump'|'fall'|'hurt'|'death')` that drives tween-based squash/stretch/bob on `Player.sprite`, consumed by `Player.update()`. Enemy hurt/death visuals are added directly to `EnemyBase` since all three archetypes share the same FSM-driven states.

Since this project's art strategy (per the design spec) is original tinted-primitive shapes rather than illustrated sprite sheets, "animation" here means procedural, tween-driven motion — this satisfies the idle/run/jump/fall/hurt/death animation requirement without needing sprite sheet assets.

- [ ] **Step 1: Implement PlayerAnimator (procedural squash/stretch/bob)**

`src/game/entities/PlayerAnimator.ts`:
```ts
import Phaser from 'phaser';

export type PlayerAnimState = 'idle' | 'run' | 'jump' | 'fall' | 'hurt' | 'death';

export class PlayerAnimator {
  private runCycleSeconds = 0;
  private currentState: PlayerAnimState = 'idle';
  // Captured at construction time (after Player's constructor calls setDisplaySize(24,32) on
  // the 4x4 '__WHITE' texture, giving scale (6,8)) — every animation-driven scale below must
  // be relative to THIS base, not an assumed base of (1,1), or the sprite shrinks to its raw
  // 4x4 texture size the instant any animation state runs (a real bug found via live testing:
  // the player became a near-invisible dot as soon as it went idle or ran).
  private readonly baseScaleX: number;
  private readonly baseScaleY: number;

  constructor(private readonly scene: Phaser.Scene, private readonly sprite: Phaser.Physics.Arcade.Sprite) {
    this.baseScaleX = sprite.scaleX;
    this.baseScaleY = sprite.scaleY;
  }

  update(dtMs: number, state: PlayerAnimState): void {
    if (state !== this.currentState) this.onStateEnter(state);
    this.currentState = state;

    if (state === 'run') {
      this.runCycleSeconds += dtMs / 1000;
      const bob = Math.abs(Math.sin(this.runCycleSeconds * 10)) * 3;
      this.sprite.setScale(this.baseScaleX, this.baseScaleY * (1 - bob * 0.01));
    } else if (state === 'idle') {
      this.sprite.setScale(this.baseScaleX, this.baseScaleY);
    }
  }

  private onStateEnter(state: PlayerAnimState): void {
    switch (state) {
      case 'jump':
        this.scene.tweens.add({
          targets: this.sprite,
          scaleX: this.baseScaleX * 0.8,
          scaleY: this.baseScaleY * 1.2,
          duration: 120,
          yoyo: true,
          ease: 'Quad.Out',
        });
        break;
      case 'fall':
        this.sprite.setScale(this.baseScaleX * 1.05, this.baseScaleY * 0.95);
        break;
      case 'hurt':
        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0.3,
          duration: 80,
          yoyo: true,
          repeat: 3,
          onComplete: () => this.sprite.setAlpha(1),
        });
        break;
      case 'death':
        this.scene.tweens.add({ targets: this.sprite, angle: 360, alpha: 0, duration: 500, ease: 'Cubic.In' });
        break;
      default:
        break;
    }
  }
}
```

- [ ] **Step 2: Wire PlayerAnimator into Player based on physics state**

Modify `src/game/entities/Player.ts`: construct `this.animator = new PlayerAnimator(scene, this.sprite)` in the constructor, and at the end of `update()` derive a `PlayerAnimState` from the current body velocity/ground state (`'jump'` when `vy < -20`, `'fall'` when `vy > 20 && !onGround`, `'run'` when `onGround && Math.abs(vx) > 10`, else `'idle'`) and call `this.animator.update(dtMs, derivedState)`. Add a `playHurt(): void` and `playDeath(): void` passthrough on `Player` that call `this.animator.update(dtMs, 'hurt' | 'death')` directly, called from `PlayScene`'s existing damage/game-over handling (Tasks 7/13) instead of (or alongside) the plain respawn teleport already there.

- [ ] **Step 3: Add hurt/death visuals to EnemyBase driven by the existing FSM**

Modify `src/game/entities/EnemyBase.ts`: in `tick()`, when `this.context.state` transitions into `'hurt'` (compare against the previous frame's state before overwriting `this.context`), tint-flash the sprite white briefly via `this.sprite.setTintFill(0xffffff)` for one frame then restore the archetype's tint; when it transitions into `'dead'` (already sets `visible=false` — add a quick tween just before hiding: `scene.tweens.add({ targets: this.sprite, alpha: 0, scaleY: 0.2, duration: 200 })` and delay the `setActive(false).setVisible(false)` until that tween's `onComplete`).

- [ ] **Step 4: Manually verify animation in the browser**

Run: `npm run dev`. Expected: player visibly squashes/stretches on jump takeoff and landing, has a subtle run bob, flashes semi-transparent on taking damage, spins and fades on the death-respawn transition; enemies flash white when hit and shrink-fade when defeated instead of vanishing instantly. All of this is skippable reading — it's tasteful and doesn't obscure hitboxes.

- [ ] **Step 5: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add procedural player/enemy animation (squash-stretch, hurt, death)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Implement ParticleFX**

`src/game/systems/ParticleFX.ts`:
```ts
import Phaser from 'phaser';

export class ParticleFX {
  private reducedMotion = false;

  constructor(private readonly scene: Phaser.Scene) {}

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  private emitBurst(x: number, y: number, color: number, count: number, speed: number, lifespanMs: number): void {
    if (this.reducedMotion) return;
    const particles = this.scene.add.particles(x, y, '__WHITE', {
      lifespan: lifespanMs,
      speed: { min: speed * 0.4, max: speed },
      scale: { start: 0.5, end: 0 },
      tint: color,
      quantity: count,
      emitting: false,
    });
    particles.explode(count);
    this.scene.time.delayedCall(lifespanMs + 50, () => particles.destroy());
  }

  dustAt(x: number, y: number): void {
    this.emitBurst(x, y, 0x9ca3af, 2, 60, 250);
  }

  jumpBurst(x: number, y: number): void {
    this.emitBurst(x, y, 0xe5e7eb, 4, 90, 300);
  }

  landingDust(x: number, y: number): void {
    this.emitBurst(x, y, 0x9ca3af, 6, 100, 350);
  }

  sparkle(x: number, y: number): void {
    this.emitBurst(x, y, 0xfacc15, 8, 120, 400);
  }

  enemyDefeat(x: number, y: number): void {
    this.emitBurst(x, y, 0xef4444, 10, 150, 450);
  }

  checkpointPulse(x: number, y: number): void {
    this.emitBurst(x, y, 0xfbbf24, 6, 80, 500);
  }

  levelCompleteBurst(x: number, y: number): void {
    this.emitBurst(x, y, 0x4ade80, 24, 200, 700);
  }
}
```

- [ ] **Step 7: Wire ParticleFX calls at each gameplay moment in PlayScene**

Modify `PlayScene`: construct `this.fx = new ParticleFX(this)`, call `this.fx.setReducedMotion(...)` on boot and whenever `settings:changed` fires (subscribe locally or read from a shared settings accessor). Trigger: `dustAt` every ~150ms while running on the ground (accumulator-gated, not every frame), `jumpBurst` on `shouldJump`, `landingDust` on the ground-transition edge (was airborne, now `isOnGround`), `sparkle` on collectible pickup, `enemyDefeat` when an enemy transitions to `dead`, `checkpointPulse` on checkpoint activation, `levelCompleteBurst` at the goal.

- [ ] **Step 8: Manually verify in the browser**

Run: `npm run dev`. Expected: subtle dust while running, a small burst on jump/landing, a colored sparkle on pickups, a red burst when an enemy dies, a burst at checkpoints and at the level goal — all tasteful, not obscuring gameplay, and all disabled when Reduced Motion is on (verify via Settings toggle).

- [ ] **Step 9: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "feat: add particle VFX for movement, combat, and level events

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 20: Accessibility Pass

**Files:**
- Modify: `src/ui/styles/menus.css`, `src/ui/styles/hud.css`, `src/ui/MainMenu.ts`, `src/ui/PauseMenu.ts`, `src/ui/GameOverScreen.ts`, `src/ui/LevelCompleteScreen.ts`, `src/ui/SettingsPanel.ts`, `index.html`

**Interfaces:**
- Consumes: all DOM UI classes from Tasks 12-13, 16. Purely closes gaps — no new public interfaces.

- [ ] **Step 1: Add a visible skip/landmark structure and `lang`/viewport correctness**

Verify `index.html`'s `<html lang="en">` and viewport meta are present (from Task 1); add `role="application"` to `#game-root` and `aria-label="Dangerous Dave: Recharged game canvas"`.

- [ ] **Step 2: Ensure every interactive DOM control has an accessible name and visible focus state**

Audit each screen file from Tasks 12/13/16: every `<button>` already has visible text content (accessible name via content) except the HUD pause button, which already has `aria-label="Pause game"` (Task 12) — add the same treatment to `TouchControls`' buttons (already has `aria-label` from Task 18). Add `aria-label` to `SettingsPanel`'s range/checkbox inputs by wrapping them in `<label>` (already done in Task 16 — verify labels use `<label>...<input></label>` so the association is implicit, not just adjacent text).

Add to `src/ui/styles/menus.css` and `src/ui/styles/hud.css` (if not already covered by Task 13's `:focus-visible` rule) a project-wide focus rule in `tokens.css` instead, so it's not duplicated per file:
```css
:focus-visible {
  outline: 2px solid var(--ddr-focus);
  outline-offset: 2px;
}
```
Remove the now-redundant per-component `:focus-visible` rules added in Tasks 12/13 in favor of this single global rule.

- [ ] **Step 3: Verify keyboard-only navigation reaches and operates every menu**

Manually tab through Main Menu, Settings, Pause, Game Over, and Level Complete using only Tab/Shift+Tab/Enter/Space (no mouse). Fix any control that isn't a real `<button>`/`<input>`/`<select>` (native elements are keyboard-operable by default; the plan has used only native elements throughout, so this step is verification, not new code, unless an issue is found).

- [ ] **Step 4: Verify color contrast in both themes**

Check text-vs-background contrast for `--ddr-text`/`--ddr-bg` and `--ddr-accent-text`/`--ddr-accent` in both the dark and light token sets against WCAG AA (4.5:1 for normal text) using the browser's accessibility inspector (DevTools → Elements → Accessibility pane shows a contrast ratio for selected text). Adjust any token in `tokens.css` that fails.

- [ ] **Step 5: Confirm game state isn't communicated by color alone**

Verify: lives/HUD show a number, not just a color; hazards are shaped as distinct rectangles with sufficient contrast, not relying solely on red vs. background; the pause/settings icons/buttons have text or `aria-label`, not just an icon glyph.

- [ ] **Step 6: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test
git add -A
git commit -m "fix: accessibility pass — focus states, aria-labels, contrast

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 21: ASSETS.md + README.md

**Files:**
- Create: `ASSETS.md`
- Modify: `README.md` (created by the Task 1 scaffold with Vite's default content)

**Interfaces:** None — documentation only.

- [ ] **Step 1: Write `ASSETS.md`**

```markdown
# Asset Sourcing & Licensing

All assets in this project are original, created specifically for
Dangerous Dave: Recharged. No assets, source code, levels, or branding
from the original 1988 "Dangerous Dave" are used anywhere in this project.

## Visuals

Sprites (player, enemies, tiles, collectibles) are simple original
shapes/tints rendered via Phaser primitives and the built-in white-pixel
texture, authored directly in code (see `src/game/entities/`). No external
image files are downloaded or bundled.

## Audio

All sound effects and music are generated at runtime using the Web Audio
API (oscillator-based synthesis) in `src/game/systems/AudioSystem.ts`. No
sampled/recorded audio files are used, so there is nothing to license.

## Fonts

System font stack only (`system-ui, sans-serif`) — no bundled font files.

## License

Project code is original work. See `README.md` for the project license.
```

- [ ] **Step 2: Rewrite `README.md`**

```markdown
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

\`\`\`bash
npm install
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm run test       # Vitest unit tests
npm run e2e        # Playwright end-to-end smoke test (requires a production build preview)
npm run typecheck
npm run lint
\`\`\`

## Production Build

\`\`\`bash
npm run build
npm run preview
\`\`\`

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
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add ASSETS.md and full project README

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 22: Playwright E2E Smoke Test

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `src/game/scenes/PlayScene.ts` (test seam), `package.json`

**Interfaces:**
- Consumes: the full running app.
- Produces: a `window.__ddrTestHooks` object (only attached when `import.meta.env.DEV || (window as any).__DDR_E2E__`) exposing `completeLevel(): void` so the smoke test can reach Level Complete deterministically without depending on precise pixel-perfect play.

- [ ] **Step 1: Add a Playwright config**

`playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:4173/dangerous-dave-recharged/',
  },
});
```

- [ ] **Step 2: Add a deterministic test seam to PlayScene**

Modify `PlayScene.create()` to register, once, a `window.__ddrTestHooks = { completeLevel: () => this.forceReachGoal() }` where `forceReachGoal()` teleports `player.sprite` to `level.goal` (reusing the exact same overlap-triggered completion path already wired in Task 13, not a separate code path — call the same private method the goal-overlap callback calls). Guard this so it only ever attaches once (module-level flag), and only exists to give Playwright a reliable hook — it does not change any gameplay behavior.

- [ ] **Step 3: Write the smoke test**

`e2e/smoke.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('full happy-path: menu -> play -> move -> jump -> pause -> resume -> complete level', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await expect(page.getByText('Dangerous Dave: Recharged')).toBeVisible();

  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('[data-hud="score"]')).toBeVisible();

  // Exercise movement/jump via real keyboard events against the canvas.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(200);

  await page.getByLabel('Pause game').click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeHidden();

  await page.evaluate(() => (window as unknown as { __ddrTestHooks: { completeLevel: () => void } }).__ddrTestHooks.completeLevel());
  await expect(page.getByText(/Level Complete/i)).toBeVisible();

  expect(errors, `Console/page errors: ${errors.join('; ')}`).toEqual([]);
});
```

- [ ] **Step 4: Run the E2E test**

Run: `npm run e2e`
Expected: PASS — the full menu → play → pause/resume → level-complete flow succeeds with zero console/page errors.

- [ ] **Step 5: Run full checks and commit**

```bash
npm run typecheck && npm run lint && npm run test && npm run e2e
git add -A
git commit -m "test: add Playwright E2E smoke test for the full gameplay loop

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 23: GitHub Actions CI + Pages Deploy Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:** None — CI configuration only.

- [ ] **Step 1: Write the combined CI + deploy workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI and Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build-and-test
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify the workflow file is valid YAML and matches npm script names**

Run: `npm run lint && npm run typecheck && npm run test` locally to confirm the script names referenced (`lint`, `typecheck`, `test`, `e2e`, `build`) all exist in `package.json` from Tasks 1 and 22.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "ci: add GitHub Actions workflow for test, build, and Pages deploy

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 24: GitHub Repo Creation, Push, Pages Enablement, Deployment Verification

**Files:** None — operational task using the GitHub MCP tools and `git`.

**Interfaces:** None.

- [ ] **Step 1: Create the GitHub repository**

Use the `mcp__github__create_repository` tool: `name: "dangerous-dave-recharged"`, `description: "An original browser platformer inspired by classic platform-game mechanics — Phaser 3 + Vite + TypeScript."`, `private: false`.

- [ ] **Step 2: Add the remote and push all commits**

```bash
git remote add origin https://github.com/SiddharthaChathra/dangerous-dave-recharged.git
git branch -M main
git push -u origin main
```

If `git push` fails due to missing credentials (no credential helper configured locally), fall back to `mcp__github__push_files`: read every tracked file via `git ls-files`, batch them into groups of ~50, and call `push_files` for each batch against `owner: "SiddharthaChathra"`, `repo: "dangerous-dave-recharged"`, `branch: "main"`, preserving the same commit messages where feasible (or one consolidated "feat: initial import of Dangerous Dave: Recharged" commit if batching makes per-task messages impractical — local git history remains intact either way as the source of truth).

- [ ] **Step 3: Enable GitHub Pages with the Actions build type**

Attempt via any available GitHub MCP tool capable of a raw REST call to `PUT /repos/SiddharthaChathra/dangerous-dave-recharged/pages` with `{"build_type": "workflow"}`. If no such tool is available, this is the one manual step flagged in the spec: tell the user to open the repo's Settings → Pages → "Build and deployment" → Source → select "GitHub Actions", and wait for their confirmation before proceeding to Step 4.

- [ ] **Step 4: Trigger and monitor the Actions run**

The push in Step 2 should trigger `.github/workflows/ci.yml` automatically. Poll via `mcp__github__list_commits`/the Actions API equivalent available through the GitHub MCP tools (or ask the user to check the Actions tab if no polling tool is available) until the run completes.

- [ ] **Step 5: If the run fails, diagnose and fix**

Read the failing job's logs. Common failure modes to check first: `base` path mismatch in `vite.config.ts` vs. the actual repo name, Playwright browsers not installed in CI (already handled by `npx playwright install --with-deps chromium` in Task 23), a lint/typecheck error not caught locally due to a stale `node_modules`. Fix the root cause, commit, push, and re-check — repeat until green.

- [ ] **Step 6: Update the progress tracker**

Modify `.claude/game-progress.md`:
```markdown
DEPLOYMENT STATUS: deployed — https://siddharthachathra.github.io/dangerous-dave-recharged/
NEXT ACTION: Task 25 — final visual + gameplay QA pass
```

```bash
git add .claude/game-progress.md
git commit -m "docs: update progress tracker after successful deployment

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push
```

---

### Task 25: Final Visual + Gameplay QA Pass

**Files:** Any file needing a fix discovered during this pass — no files are pre-specified.

**Interfaces:** None — this task consumes the entire finished app.

- [ ] **Step 1: Open the live deployed URL in the Browser tool**

Navigate to `https://siddharthachathra.github.io/dangerous-dave-recharged/`. Confirm: page loads with no blank screen, no console errors (`read_console_messages`), all assets/JS/CSS load (`read_network_requests` shows no 404s), and the `base` path didn't break any asset reference.

- [ ] **Step 2: Play through all 3 levels start-to-finish**

Exercise: start → move → jump → collect gems and both secret gems → encounter every enemy type → take damage → hit a checkpoint → die and respawn at the checkpoint → complete a level → advance to the next → reach Game Over by exhausting all lives → Retry → reach the final Level Complete with `nextLevelId: null`.

- [ ] **Step 3: Exercise edge cases**

Jump exactly at a platform edge, rapid left/right direction changes, spam the jump key, walk into an enemy from multiple angles, fall into a gap, pause mid-air and resume, resize the browser window mid-game (`resize_window` to a few sizes), switch to the mobile preset and confirm touch controls work end-to-end, refresh the page mid-level (confirm it returns to the main menu cleanly, not a broken state), change a setting then refresh (confirm it persisted).

- [ ] **Step 4: Visual QA**

Check spacing/alignment/contrast/overflow on every screen in both themes at desktop and mobile widths; confirm the HUD never overlaps critical gameplay area; confirm no particle effect obscures the player or hazards.

- [ ] **Step 5: Fix every issue found, in small targeted commits**

For each bug found in Steps 1-4, make the smallest correct fix in the relevant file, re-verify in the browser, then commit with a `fix:` message and push (re-triggering CI/deploy). Repeat until a full playthrough on the live URL has zero known issues.

- [ ] **Step 6: Final progress tracker update**

Modify `.claude/game-progress.md` to reflect `CURRENT PHASE: complete`, `TEST STATUS: all passing`, `BUILD STATUS: passing`, `DEPLOYMENT STATUS: live and verified`, `NEXT ACTION: none — Milestone 1 complete`.

```bash
git add .claude/game-progress.md
git commit -m "docs: mark Milestone 1 complete after final QA pass

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push
```

