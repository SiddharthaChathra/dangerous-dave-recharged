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
