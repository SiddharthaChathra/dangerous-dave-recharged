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
