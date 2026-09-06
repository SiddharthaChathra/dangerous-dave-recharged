import { gameEvents } from './EventBus';

/**
 * The game's two presentation modes. This is a *visual* axis only — no gameplay system may
 * branch on it. Collision boxes, physics, level coordinates, enemy AI, scoring and the life
 * system are identical in both modes; only how the same world is drawn changes.
 */
export type VisualMode = 'classic' | 'current';

/** Existing presentation stays the default, so nothing changes until the player opts in. */
export const DEFAULT_VISUAL_MODE: VisualMode = 'current';

/**
 * How long visual code has to finish a crossfade before `visual-mode:transition:complete` fires.
 * The theme state itself swaps immediately; this window is purely for presentation.
 */
export const VISUAL_MODE_TRANSITION_MS = 320;

export function isVisualMode(value: unknown): value is VisualMode {
  return value === 'classic' || value === 'current';
}

export function nextVisualMode(mode: VisualMode): VisualMode {
  return mode === 'classic' ? 'current' : 'classic';
}

let currentMode: VisualMode = DEFAULT_VISUAL_MODE;
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

export function getVisualMode(): VisualMode {
  return currentMode;
}

/**
 * Switches presentation. Deliberately touches no gameplay state: the running scene re-skins
 * its existing objects in place, so player position, enemies, score, lives, collected items
 * and timers all survive a switch mid-level.
 */
export function setVisualMode(mode: VisualMode): void {
  if (mode === currentMode) return;

  const previousMode = currentMode;
  gameEvents.emit('visual-mode:transition:start', { mode, previousMode });
  currentMode = mode;
  gameEvents.emit('visual-mode:changed', { mode, previousMode });

  // Coalesce rapid toggles: only the last transition announces completion.
  if (transitionTimer !== null) clearTimeout(transitionTimer);
  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    gameEvents.emit('visual-mode:transition:complete', { mode, previousMode });
  }, VISUAL_MODE_TRANSITION_MS);
}

export function toggleVisualMode(): VisualMode {
  setVisualMode(nextVisualMode(currentMode));
  return currentMode;
}
