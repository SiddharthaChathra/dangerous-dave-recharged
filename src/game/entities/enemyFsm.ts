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
