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
