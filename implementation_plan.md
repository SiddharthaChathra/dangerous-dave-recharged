# Implement Dual Visual Modes: Classic Dave & Current

This implementation plan covers the complete visual overhaul to support two high-fidelity themes: "Classic Dave" and "Current Visual", along with the UI switch, animations, HUD, and VFX.

## User Review Required

> [!WARNING]
> **Coordination with Game Logic (Claude)**
> I am responsible only for the visual implementation. The prompt specifies that Claude owns the theme state and game logic, and I should consume the interface provided by Claude. 
> 
> Currently, the game's `SaveSystem` and `EventBus` only support a `theme: 'dark' | 'light'` setting. **I need Claude to implement a specific `visualMode: 'classic' | 'current'` state.**
> 
> **What I need from Claude:**
> 1. Add `visualMode: 'classic' | 'current'` to `SaveData` in `SaveSystem.ts`.
> 2. Add a `visual-mode:changed` event to `EventBus.ts` that broadcasts the current mode.
> 3. Provide a way to toggle this state globally (e.g., listening to a `theme:toggle` event emitted by the UI).
> 
> **For this implementation:** I will build the visual toggle to dispatch a custom UI event and modify `document.documentElement.setAttribute('data-visual-mode')` directly so that we can test the visual transition immediately. Claude will later need to wire this into the persistent save state.

## Proposed Changes

---

### Procedural Textures & VFX (Preload & Particles)

#### [MODIFY] [PreloadScene.ts](file:///c:/Users/bnsch/OneDrive/Desktop/dangerous%20dave/src/game/scenes/PreloadScene.ts)
- Generate a second set of textures for "Classic Dave" mode with high-fidelity retro styling.
- **Classic Player:** Crisp, slightly blocky proportions but with modern shading (e.g., normal maps or glowing edges).
- **Classic Platforms:** Brick patterns and hazard stripes that mimic the original 1990s Dangerous Dave.
- **Classic Collectibles & Hazards:** High-fidelity retro cups, diamonds, and fire/water hazards.
- Retain and polish the existing "Current" procedural textures.

#### [MODIFY] [ParticleFX.ts](file:///c:/Users/bnsch/OneDrive/Desktop/dangerous%20dave/src/game/systems/ParticleFX.ts)
- Add mode-specific particle effects.
- **Classic Mode:** Pixel-perfect square particles, classic explosion patterns.
- **Current Mode:** Smooth, glowing orb particles and light blooms.

---

### Game Scene Visuals

#### [MODIFY] [PlayScene.ts](file:///c:/Users/bnsch/OneDrive/Desktop/dangerous%20dave/src/game/scenes/PlayScene.ts)
- Listen to visual mode change events.
- Dynamically swap texture keys on `player`, `enemies`, `platforms`, and `collectibles` without resetting the game state.
- Implement a smooth visual transition overlay (e.g., a quick flash or pixelation wipe) when switching modes to avoid a harsh snap.
- Improve environmental lighting and background parallax depending on the mode.

#### [MODIFY] [PlayerAnimator.ts](file:///c:/Users/bnsch/OneDrive/Desktop/dangerous%20dave/src/game/entities/PlayerAnimator.ts)
- Polish player animations with squash and stretch during jumps and landings.
- Differentiate animation framing based on the active visual mode.

---

### UI, HUD & Menus

#### [MODIFY] [HUD.ts](file:///c:/Users/bnsch/OneDrive/Desktop/dangerous%20dave/src/ui/HUD.ts)
- Add the interactive **Visual Mode Switch Button** `[ CLASSIC ⇄ CURRENT ]`.
- Create responsive click, hover, and active states for the switch.
- Update the HUD layout: Classic mode will feature a retro-inspired blocky layout; Current mode will maintain a sleek, modern UI.
- Add "Life Lost" animation logic to visually break a heart or animate the health bar downward.

#### [MODIFY] [hud.css](file:///c:/Users/bnsch/OneDrive/Desktop/dangerous%20dave/src/ui/styles/hud.css)
- Implement `[data-visual-mode="classic"]` overrides.
- Use classic typography, borders, and colors for the Classic HUD.
- Add CSS transitions for smooth color morphing when the switch is clicked.

#### [MODIFY] [menus.css](file:///c:/Users/bnsch/OneDrive/Desktop/dangerous%20dave/src/ui/styles/menus.css) & [base.css](file:///c:/Users/bnsch/OneDrive/Desktop/dangerous%20dave/src/ui/styles/base.css)
- Apply the dual-theme CSS architecture to all overlay screens (Game Over, Level Complete, Pause, Main Menu).

## Verification Plan

### Manual Verification
1. **Visual Generation:** Verify `PreloadScene.ts` successfully generates both texture sets without performance drops.
2. **Mode Switching:** Click the switch button during gameplay. Verify that the textures, background, and HUD morph smoothly into the selected theme without resetting player position, score, or enemies.
3. **Animations & Feedback:** Test jumping, landing, collecting gems, and taking damage to ensure particles and animations trigger correctly and fit the active visual mode.
4. **Death & Game Over:** Intentionally lose a life and trigger a game over to verify the polished visual flow (Life Lost screen -> quick transition -> Restart).
