// Type-only import: erased at compile time, so this does not create a runtime import cycle
// with visualMode.ts (which imports the `gameEvents` instance from this module).
import type { VisualMode } from './visualMode';

type Handler<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, unknown> = Record<string, unknown>> {
  private handlers: { [K in keyof Events]?: Handler<Events[K]>[] } = {};

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    const list = this.handlers[event] ?? [];
    list.push(handler);
    this.handlers[event] = list;
    return () => this.off(event, handler);
  }

  /**
   * Subscribes for exactly one delivery, then unsubscribes itself.
   *
   * Unsubscribing *before* invoking the handler matters: if the handler re-emits the same
   * event (or triggers something that does), a self-removing listener that fired first would
   * re-enter itself.
   */
  once<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    const wrapped: Handler<Events[K]> = (payload) => {
      this.off(event, wrapped);
      handler(payload);
    };
    return this.on(event, wrapped);
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
  'hp:changed': { hp: number; maxHp: number };
  'collectible:changed': { collected: number; total: number };
  /**
   * One specific pickup was just collected, with everything a reward popup needs.
   *
   * Presentation must use this rather than inferring pickups from `score:changed` deltas:
   * score is a run total that also jumps for enemy defeats (+50, so two at once looks exactly
   * like a +100 secret), carries across levels, and rolls back on death.
   */
  'collectible:collected': {
    kind: 'gem' | 'secret';
    /** Points this pickup awarded. */
    value: number;
    /** World position, for spawning a popup at the pickup. */
    x: number;
    y: number;
    collected: number;
    total: number;
  };
  'level:progress': { percent: number };
  'timer:tick': { seconds: number };
  /**
   * A life was lost but the run continues. The current level must restart from its beginning
   * (classic arcade rule — there is no checkpoint respawn).
   */
  'life:lost': { livesRemaining: number; levelId: string };
  /**
   * Dave's armed state changed. Emitted on pickup and on every level (re)start, so the HUD can
   * show a gun/ammo indicator without tracking gameplay state itself.
   */
  'weapon:changed': { hasGun: boolean };
  /** The level's trophy was collected — the exit door is now unlocked. */
  'trophy:collected': { x: number; y: number };
  /** The player reached the exit without the trophy. Fired at most once per second. */
  'door:locked': { x: number; y: number };
  /** The unlocked door is opening and the player is stepping through. */
  'door:opening': { levelId: string };
  /** The between-levels corridor has finished (or was skipped). */
  'transition:finished': { levelId: string };
  /**
   * The playable character changed. Cosmetic only — hitbox, speed, jump and damage are
   * identical for every character, so this never affects gameplay or level difficulty.
   */
  'character:changed': { characterId: string; previousCharacterId: string };
  'level:complete': { levelId: string; score: number; timeSeconds: number; collected: number; total: number };
  'game:over': { finalScore: number; levelId: string };
  /** Progression was persisted — the truthful trigger for any "game saved" feedback. */
  'progress:saved': { levelId: string; unlockedLevelId: string | null; bestScore: number };
  'game:pause': Record<string, never>;
  'game:resume': Record<string, never>;
  'game:started': { levelId: string };
  // ---- Presentation theme (see THEME_INTEGRATION.md) ----------------------------------------
  // Visual-only. Gameplay systems must never branch on these; they exist so presentation code
  // can re-skin the same, still-running world.
  /** Fired before the swap, so visual code can begin a crossfade out. */
  'visual-mode:transition:start': { mode: VisualMode; previousMode: VisualMode };
  /** The mode has changed; re-skin now. */
  'visual-mode:changed': { mode: VisualMode; previousMode: VisualMode };
  /** Fired VISUAL_MODE_TRANSITION_MS after the swap, so visual code can clean up. */
  'visual-mode:transition:complete': { mode: VisualMode; previousMode: VisualMode };
  'settings:open': Record<string, never>;
  /** Request to open the character roster. main.ts owns mounting the screen. */
  'character-select:open': Record<string, never>;
  'settings:changed': {
    musicVolume: number;
    sfxVolume: number;
    muted: boolean;
    theme: 'dark' | 'light';
    reducedMotion: boolean;
  };
};

export const gameEvents = new EventBus<GameEvents>();
