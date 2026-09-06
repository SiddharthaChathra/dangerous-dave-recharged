# THEME_INTEGRATION.md

Integration contract between **game logic** (owned by the game engineer) and **visual/UI work**
(owned by Gemini).

The game supports two presentation modes:

| Mode | Value | Meaning |
| --- | --- | --- |
| Classic Dave | `'classic'` | Retro arcade presentation of the same world |
| Current visual | `'current'` | Existing modern presentation (**default**) |

**The golden rule:** a visual mode is a *skin*. Switching modes must never change collision
boxes, physics, level coordinates, enemy AI, scoring, damage, lives or difficulty. Both modes
are the same game world, drawn differently. Gameplay code never branches on the visual mode,
and visual-mode code never reads or writes gameplay state.

---

## 0. Status — read this first

**Everything you asked for in your plan is already built, tested and merged.** Please do not
re-implement it; it will conflict.

| You asked for | Status |
| --- | --- |
| `visualMode: 'classic' \| 'current'` in `SaveData` | ✅ Done — top level of the save (not inside `settings`, so `settings:changed` can't drop it). Persists and restores on boot. |
| A `visual-mode:changed` event | ✅ Done — plus `visual-mode:transition:start` / `:complete` for crossfades. |
| A global way to toggle | ✅ Done — `toggleVisualMode()`, plus a mounted switch and a `T` shortcut. |
| `data-visual-mode` on `documentElement` | ✅ Done — set on **both** `<html>` and `<body>`, before first paint. |

Three corrections to your plan, so we don't collide:

1. **Do not set `data-visual-mode` yourself, and do not dispatch a custom UI event.** The state
   layer owns that attribute; a second writer will fight it and break persistence. Read the
   attribute in CSS, and call `toggleVisualMode()` if you need to switch it.
2. **Do not add the switch button to `HUD.ts`, and do not add mode-swapping to `PlayScene.ts`.**
   The switch already exists as `src/ui/VisualModeToggle.ts` (mounted globally, so it survives
   screen changes), and the live texture-swapping is already implemented in `VisualSkinner`,
   wired into `PlayScene`, and verified to preserve player position, score, lives, enemies,
   collected items and timers. **Style the existing switch instead** — see §6.
3. **The only thing needed from you for canvas art is registering `classic__*` textures in
   `PreloadScene`** (§4). No `PlayScene` changes at all: registration is automatic, and objects
   without classic art keep their current texture.

Everything else in your plan — classic/current procedural textures, particle styles, HUD and
menu CSS for both modes, animation polish, the transition overlay — is yours and unblocked.

---

## 1. Theme state API

```ts
import {
  getVisualMode,
  setVisualMode,
  toggleVisualMode,
  type VisualMode,          // 'classic' | 'current'
  DEFAULT_VISUAL_MODE,      // 'current'
  VISUAL_MODE_TRANSITION_MS,     // 320
} from './game/core/visualMode';

getVisualMode();            // → 'classic' | 'current'
toggleVisualMode();         // flips and returns the new mode
setVisualMode('classic');   // explicit set; a no-op if already active
```

The mode is persisted automatically (top level of the save, key `visualMode`) and restored on
boot. You do not need to save or restore it.

## 2. Events

Subscribe through the existing bus. `on()` returns an unsubscribe function — **always call it on
teardown**, or restarts will leak listeners.

```ts
import { gameEvents } from './game/core/EventBus';

const off = gameEvents.on('visual-mode:changed', ({ mode, previousMode }) => { /* re-skin */ });
off();
```

| Event | Payload | When |
| --- | --- | --- |
| `visual-mode:transition:start` | `{ mode, previousMode }` | Immediately before the swap — start a crossfade out |
| `visual-mode:changed` | `{ mode, previousMode }` | State has swapped — apply the new skin |
| `visual-mode:transition:complete` | `{ mode, previousMode }` | `VISUAL_MODE_TRANSITION_MS` after the swap — clean up |

Rapid toggles coalesce: only the final transition emits `complete`.

## 3. DOM hook (for all CSS/UI theming)

Both `<html>` and `<body>` always carry the current mode:

```html
<html data-visual-mode="classic">
  <body data-visual-mode="classic">
```

So CSS branches with no JS at all:

```css
[data-visual-mode='classic'] .hud-panel { /* classic HUD treatment */ }
[data-visual-mode='current'] .hud-panel { /* existing treatment */ }
```

This is set before first paint and updated on every change. **Prefer this over JS listeners for
anything purely CSS.**

## 4. Canvas art (Phaser textures)

In-game art is skinned by texture key, using a naming convention:

```
<base key>            →  current mode   e.g. 'platform_tile'
classic__<base key>   →  classic mode   e.g. 'classic__platform_tile'
```

**To add classic art:** register a texture named `classic__<base key>` in `PreloadScene`
(same size/anchor as the base texture). That is the entire integration step — the running
scene picks it up automatically on the next switch, including for objects created later.

**Fallback is deliberate:** if `classic__<key>` does not exist, the base texture is used. So
classic art can land incrementally, and a partially-skinned game never shows missing-texture
boxes.

Currently skinned automatically: platform tiles, moving platforms, falling platforms, hazards,
enemies, collectibles, the goal door, the weapon pickup, and the player (all four movement
textures).

### Weapon art — placeholders awaiting you

Shooting is implemented, so these two textures exist as **crude placeholders** drawn by
`src/game/systems/WeaponPlaceholders.ts`. That generator runs **only if the key doesn't already
exist**, so simply defining them in `PreloadScene` replaces them outright and the generator
becomes a no-op — `PreloadScene` stays entirely your file.

| Key | What it is | Placeholder size |
| --- | --- | --- |
| `weapon_pickup` | The gun lying in the level | 22×14 |
| `classic__weapon_pickup` | Classic-mode gun | match above |
| `projectile` | Dave's shot, travels horizontally | 10×6 |
| `classic__projectile` | Classic-mode shot | match above |

A muzzle flash and a gun/armed indicator in the HUD are **not** implemented — those are yours.
The HUD indicator has an event ready for it (`weapon:changed`, below); there is no HUD element
for it yet, deliberately, since HUD markup is your file.

Helpers, if you need them directly:

```ts
import { classicTextureKey, resolveTextureKey } from './game/systems/VisualSkinner';
```

⚠️ Texture swaps must keep the **same display dimensions** as the base art. Sprite size is
visual, but drastically different art can mislead players about a hitbox that has not changed.
Hitboxes are fixed in gameplay code and are not yours to adjust.

## 4b. Characters (Phase 12) — ready for your UI

The roster, selection state, persistence and texture resolution are built and tested. What's
missing is **sprites and a selection screen** — both yours.

```ts
import { CHARACTERS, getCharacter, unlockedCharacters } from './game/characters/roster';
import { getSelectedCharacterId, setSelectedCharacter } from './game/characters/selection';
import { loadSave, completedLevelIds } from './game/systems/SaveSystem';

const save = loadSave(window.localStorage);
unlockedCharacters(completedLevelIds(save)); // CharacterDef[] to render as choices
getSelectedCharacterId();                    // currently active id
setSelectedCharacter('nova');                // switches, persists, emits character:changed
```

`CharacterDef` gives you `id`, `name`, `blurb`, `texturePrefix`, `unlockedByDefault` and
`unlockAfterLevelId` — everything a card needs, including why a locked one is locked.

| Character | id | Texture prefix | Unlocks |
| --- | --- | --- | --- |
| Dangerous Dave | `dave` | `player` | from the start |
| Delta | `delta` | `char_delta` | clear level002 |
| Nova | `nova` | `char_nova` | clear level003 |
| Rex | `rex` | `char_rex` | clear level004 |

**Sprites to author** — four states each, same dimensions and anchor as Dave's `player_*`:

```
char_delta_idle | _run | _jump | _fall          classic__char_delta_idle | ...
char_nova_idle  | _run | _jump | _fall          classic__char_nova_idle  | ...
char_rex_idle   | _run | _jump | _fall          classic__char_rex_idle   | ...
```

Resolution cascades: character-classic → character-modern → Dave-classic → Dave-modern. So a
character with no art yet renders as Dave rather than a missing-texture box, and you can add
sprites one character (or one mode) at a time.

### Trophy, locked door and fire/lava — ready for your art

The mechanics are built and tested. Placeholder art exists for all of it (same rule as the
weapons: generated only when the key is absent, so defining these in `PreloadScene` replaces
them and the generator becomes a no-op).

| Key | What it is | Placeholder size |
| --- | --- | --- |
| `trophy` / `classic__trophy` | The level key — collect it to unlock the exit | 26×30 |
| `fire` / `classic__fire` | Fire hazard | 64×40 (tiled) |
| `lava` / `classic__lava` | Lava hazard | 64×40 (tiled) |

New events to hook feedback onto:

| Event | Payload | When |
| --- | --- | --- |
| `trophy:collected` | `{ x, y }` | Trophy taken; the exit is now unlocked |
| `door:locked` | `{ x, y }` | Player reached the exit without the trophy (throttled to 1/sec) |
| `door:opening` | `{ levelId }` | Unlocked door opening, player stepping through |

The door sequence already animates Dave into the doorway and shuts the door before
`level:complete` fires (~700ms), so a completion is never an instant cut. Feel free to add to
that with the events above — just don't make it much longer; it sits between the player and
their reward.

⚠️ **Hazard art must stay within its declared rectangle.** The damage box is deliberately inset
from the drawing (18% at the sides, 30% off the top) so a graze doesn't kill. Flames that
overhang the rectangle would look dangerous in places that are actually safe — which reads as a
bug to the player even though collision is correct.

### The between-levels corridor (`LevelTransitionScene`)

A shared file: **logic owns the lifecycle, you own everything you can see.**

Restyle freely — background, brick art, typography, character animation, VFX, a progress
indicator, audio cues. `init()` hands you everything you need, so the scene never has to derive
progression itself:

```ts
{ levelId, title, subtitle, isVictory,
  levelNumber, totalLevels,        // e.g. 3 of 10 — for a progress indicator
  score, gemsCollected, gemsTotal, timeSeconds }
```

Textures to author (placeholders exist for each, replaced by defining the key in
`PreloadScene`): `transition_brick` / `classic__transition_brick`, plus any new keys you add.
The scene already resolves art through the normal cascade, so it inherits the active visual
mode and the selected character with no mode-specific logic.

⚠️ **Three things must survive a redesign:**

1. **`finish()` must still be reachable from every path and run exactly once.** Animation
   completing, the player skipping, and the failsafe timer all funnel through it. If a new tween
   becomes the thing that ends the scene, its `onComplete` must call `finish()` — otherwise the
   game wedges in the interstitial with no way out.
2. **Keep the skip.** Any key or pointer press must abort straight to the next screen. A player
   replaying a level for the tenth time should never be held in a cutscene.
3. **Keep the failsafe timer.** It is the backstop for a missing texture, an interrupted tween
   or a backgrounded tab. Don't remove it because "the animation always finishes" — that is
   exactly the assumption it exists to survive.

A note on audio: please don't reuse `playSfx('jump')` for a text pulse. Reusing a movement cue
for UI muddles what a sound *means* — add a dedicated name to `SFX_PROFILE` instead.

### Rendering a character preview in UI

For the roster showcase, ask logic for the image instead of reaching into Phaser or
`window.__ddrDebugGame`:

```ts
import { getCharacterPreviewImage } from './game/characters/preview';

const img = getCharacterPreviewImage('nova', 'idle');       // uses the active visual mode
const classicRun = getCharacterPreviewImage('rex', 'run', 'classic');
if (img) ctx.drawImage(img, 0, 0);                          // null before boot / if unresolved
```

It returns a drawable canvas/image resolved through the *same* cascade the in-game player
uses, so a preview always shows exactly what will appear in the level — fallbacks included.
**It can return `null`** (UI may mount before Phaser finishes booting): render a placeholder,
don't assume an image.

### The roster screen already exists — restyle it, don't rebuild the wiring

`src/ui/CharacterSelectScreen.ts` is built, wired and tested, on the same basis as
`VisualModeToggle`: **logic owns the behaviour, you own the appearance.** It is mounted by
`main.ts` in response to `character-select:open`, layered over whatever screen is open (like
Settings), and counts as a modal for click-blocking.

To open it from your menu button, just emit the event — no `main.ts` changes needed:

```ts
this.bus.emit('character-select:open', {} as Record<string, never>);
```

Restyle or rebuild the markup freely via `.roster`, `.roster-grid`, `.character-card`,
`.character-card--active|--unlocked|--locked` and `.character-card__name|__blurb|__badge`.
Two things must survive a redesign:

- the hooks `data-character-card="<id>"`, `data-character-state`, and
  `data-character-select="panel|close"` — tests and logic select on them;
- selection going through `setSelectedCharacter`, which refuses locked ids.

**Locked characters are inert in logic, not just in styling** — a card that merely *looks*
disabled but still fired would hand out unearned unlocks, so don't route clicks around it.

One API correction to your plan: `unlockedCharacters()` returns only the unlocked ones, so it
can't render locked cards. Use `CHARACTERS` for the full list plus
`isCharacterUnlocked(character, completedLevelIds(save))` per card — which is what the built
screen does.

⚠️ **Characters are cosmetic by contract.** Hitbox, speed, jump and damage are identical for
every character — the ten levels are validated against one fixed set of physics constants, so a
character that moved differently would silently change level difficulty. If you want a
character to *feel* different, do it with animation and VFX, not movement values.

## 5. Reading game state (never duplicate it)

Everything the UI needs is already broadcast. Listen; do not recompute, and do not reach into
Phaser scenes or gameplay modules.

| Event | Payload |
| --- | --- |
| `score:changed` | `{ score }` (run total) |
| `lives:changed` | `{ lives }` |
| `hp:changed` | `{ hp, maxHp }` |
| `collectible:changed` | `{ collected, total }` |
| `weapon:changed` | `{ hasGun }` — emitted on pickup and on every level (re)start |
| `collectible:collected` | `{ kind, value, x, y, collected, total }` — one specific pickup |
| `progress:saved` | `{ levelId, unlockedLevelId, bestScore }` — fired *after* the write |
| `character:changed` | `{ characterId, previousCharacterId }` |
| `timer:tick` | `{ seconds }` |
| `level:progress` | `{ percent }` |
| `game:started` | `{ levelId }` (`'menu'` when returning to the menu) |
| `life:lost` | `{ livesRemaining, levelId }` |
| `level:complete` | `{ levelId, score, timeSeconds, collected, total }` |
| `game:over` | `{ finalScore, levelId }` |
| `game:pause` / `game:resume` | `{}` |

Level metadata (names, order) is available from `game/levels/registry`:
`LEVELS`, `LEVEL_ORDER`, `getLevel(id)`.

If something you need is not exposed, **ask for an event — do not compute it from gameplay
internals.**

## 6. File ownership

### Gemini owns (edit freely)

- `src/ui/styles/**` — all CSS, both modes
- `src/ui/HUD.ts`, `MainMenu.ts`, `PauseMenu.ts`, `GameOverScreen.ts`,
  `LevelCompleteScreen.ts`, `LifeLostScreen.ts`, `SettingsPanel.ts`, `TouchControls.ts`,
  `theme.ts` — markup/appearance
- `src/game/scenes/PreloadScene.ts` — all procedural art, including new `classic__*` textures
- `src/game/systems/ParticleFX.ts`, `src/game/levels/parallax.ts` — effects and backgrounds
- Tween/easing/visual timing inside `PlayerAnimator.ts` and `EnemyBase.ts`

**Constraint:** keep the `data-*` attributes and element ids already present — tests and game
logic select on them (`data-hud`, `data-gameover`, `data-lifelost`, `data-levelcomplete`,
`data-pause`, `data-menu`, `data-level`, `data-visual-toggle`). Restyle and restructure around
them; don't remove them.

### Game logic owns (do not edit — request a change instead)

- `src/game/core/visualMode.ts`, `EventBus.ts`, `constants.ts`, `GameConfig.ts`
- `src/game/systems/VisualSkinner.ts`, `InputController.ts`, `CameraController.ts`,
  `SaveSystem.ts`
- `src/game/scenes/PlayScene.ts`
- `src/game/entities/Player.ts`, `EnemyBase.ts` movement/FSM, `enemyFsm.ts`,
  `Collectible.ts`, `Hazard.ts`, `MovingPlatform.ts`, `FallingPlatform.ts`
- `src/game/levels/level00*.ts`, `types.ts`, `LevelLoader.ts`, `registry.ts` — **level layout
  and hazard placement are gameplay, not decoration**
- `src/utils/**` — physics, scoring, lives
- `src/main.ts` — wiring and run state

### Shared, with a boundary

- `src/ui/VisualModeToggle.ts` — logic owns the behaviour (toggling, label sync, shortcut, a11y);
  Gemini owns the appearance. Rebuild the markup if you like; the only requirement is that
  something calls `toggleVisualMode()`.
- `src/game/entities/PlayerAnimator.ts` — logic owns texture-key resolution and the state
  machine; Gemini owns tweens, timings and easing.

## 7. Classic mode design intent

Classic mode should read as *"the classic game rebuilt with modern rendering"* — not a
different game. Favour: clear readable platforms, chunky recognisable obstacles, obvious
hazards, strong silhouettes, arcade spacing, limited palette. Avoid: heavy bloom/blur, busy
particles over gameplay, or anything that reduces readability of where the player can stand
and what can kill them.

Level geometry is identical in both modes by design — only its rendering changes.

## 7b. Step 4 punch list (from integration testing)

Found while regression-testing your Step 2 work. All are visual — none block gameplay.

1. **Missing classic weapon art.** `classic__weapon_pickup` and `classic__projectile` aren't
   registered, so the gun and its shot fall back to my crude placeholders in classic mode (the
   grey gun visible on the ground). Sizes and keys are in §4.
2. **Dead checkpoint textures.** `checkpoint`, `checkpoint_active`, `classic__checkpoint` and
   `classic__checkpoint_active` are still generated at boot, but checkpoints were removed from
   the game — nothing references them. Four canvas textures' worth of wasted boot work; safe to
   delete outright.
3. **Parallax background is identical in both modes.** The city skyline / mountain layers don't
   change with the theme, so classic mode still has a modern backdrop behind retro platforms.
   `src/game/levels/parallax.ts` is yours; it can read `getVisualMode()` and subscribe to
   `visual-mode:changed` the same way everything else does.
4. **HUD left panel** (INTEGRITY bar/avatar) still reads modern in classic mode, while the
   right-hand stat panel is themed. Worth a consistency pass.

## 8. Checklist before you hand work back

- [ ] Toggling mid-level does not move the player, reset score/lives/timer, or restore collected gems
- [ ] Both modes are readable: platforms, hazards, enemies and collectibles are distinguishable
- [ ] Every `gameEvents.on(...)` has a matching unsubscribe on teardown
- [ ] No gameplay values (coordinates, sizes, speeds, hitboxes) changed
- [ ] `npm run typecheck && npm run lint && npm run test` all pass
