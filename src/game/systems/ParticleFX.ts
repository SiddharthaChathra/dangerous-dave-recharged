import Phaser from 'phaser';

/**
 * Gameplay VFX.
 *
 * Effects are built from a soft radial "mote" texture with additive blending rather than
 * flat 1px squares, so impacts read as light rather than noise. Every effect is a no-op
 * under reduced motion, and every emitter/tween cleans itself up so long play sessions
 * don't accumulate objects.
 */
export class ParticleFX {
  private reducedMotion = false;
  private readonly moteKey: string;

  constructor(private readonly scene: Phaser.Scene) {
    this.moteKey = ParticleFX.ensureMote(scene);
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  /** Soft radial dot shared by every effect (and by the environment layers). */
  private static ensureMote(scene: Phaser.Scene): string {
    const key = 'ddr_mote';
    if (scene.textures.exists(key)) return key;
    const size = 24;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return key;
    const ctx = canvas.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
    return key;
  }

  private burst(
    x: number,
    y: number,
    opts: {
      color: number | number[];
      count: number;
      speed: number;
      lifespan: number;
      scale?: number;
      gravityY?: number;
      angle?: { min: number; max: number };
    },
  ): void {
    if (this.reducedMotion) return;
    const scale = opts.scale ?? 0.5;
    const emitter = this.scene.add.particles(x, y, this.moteKey, {
      lifespan: opts.lifespan,
      speed: { min: opts.speed * 0.35, max: opts.speed },
      angle: opts.angle,
      gravityY: opts.gravityY ?? 0,
      scale: { start: scale, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: opts.color,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    emitter.setDepth(30);
    emitter.explode(opts.count);
    this.scene.time.delayedCall(opts.lifespan + 80, () => emitter.destroy());
  }

  /** Expanding ring — communicates impact weight far better than a puff alone. */
  private ring(x: number, y: number, color: number, radius: number, durationMs: number): void {
    if (this.reducedMotion) return;
    const ring = this.scene.add.circle(x, y, 4);
    ring.setStrokeStyle(2, color, 0.9);
    ring.setDepth(29);
    this.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onUpdate: () => ring.setRadius(ring.radius),
      onComplete: () => ring.destroy(),
    });
  }

  /** Faint puff kicked up while running. */
  dustAt(x: number, y: number): void {
    this.burst(x, y, {
      color: [0xd8e4f5, 0x9ca3af],
      count: 3,
      speed: 55,
      lifespan: 380,
      scale: 0.28,
      gravityY: -20,
      angle: { min: 200, max: 340 },
    });
  }

  jumpBurst(x: number, y: number): void {
    this.burst(x, y + 14, {
      color: [0xffffff, 0xbcd7ff],
      count: 7,
      speed: 110,
      lifespan: 380,
      scale: 0.34,
      angle: { min: 210, max: 330 },
    });
  }

  landingDust(x: number, y: number): void {
    this.burst(x, y, {
      color: [0xffffff, 0xa8b8cc],
      count: 10,
      speed: 130,
      lifespan: 420,
      scale: 0.4,
      angle: { min: 190, max: 350 },
    });
    this.ring(x, y, 0xbcd7ff, 34, 320);
  }

  sparkle(x: number, y: number): void {
    this.burst(x, y, {
      color: [0xffe98a, 0xfacc15, 0xffffff],
      count: 12,
      speed: 140,
      lifespan: 480,
      scale: 0.42,
    });
    this.ring(x, y, 0xffe98a, 30, 340);
  }

  enemyDefeat(x: number, y: number): void {
    this.burst(x, y, {
      color: [0xff6b6b, 0xef4444, 0xffd08a],
      count: 16,
      speed: 190,
      lifespan: 520,
      scale: 0.5,
      gravityY: 220,
    });
    this.ring(x, y, 0xff6b6b, 44, 380);
  }

  /** Player took a hit — sharp red spray plus a shock ring. */
  damageBurst(x: number, y: number): void {
    this.burst(x, y, {
      color: [0xff4d4d, 0xff9d9d, 0xffffff],
      count: 14,
      speed: 200,
      lifespan: 460,
      scale: 0.46,
      gravityY: 160,
    });
    this.ring(x, y, 0xff4d4d, 48, 340);
  }

  checkpointPulse(x: number, y: number): void {
    this.burst(x, y, {
      color: [0x8affc1, 0x4ade80, 0xffffff],
      count: 14,
      speed: 120,
      lifespan: 620,
      scale: 0.44,
      angle: { min: 240, max: 300 },
    });
    this.ring(x, y, 0x4ade80, 56, 520);
  }

  levelCompleteBurst(x: number, y: number): void {
    this.burst(x, y, {
      color: [0x4ade80, 0x8affc1, 0xffffff, 0xffe98a],
      count: 40,
      speed: 260,
      lifespan: 900,
      scale: 0.6,
      gravityY: 120,
    });
    this.ring(x, y, 0x8affc1, 90, 700);
  }

  /**
   * Ghost copy of a sprite that fades in place — a speed trail.
   *
   * Only worth spawning at genuine top speed; at walking pace it reads as
   * smearing rather than momentum, so the caller gates on velocity.
   */
  motionTrail(sprite: Phaser.GameObjects.Sprite, tint = 0x7df4ff): void {
    if (this.reducedMotion) return;
    const ghost = this.scene.add
      .image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
      .setScale(sprite.scaleX, sprite.scaleY)
      .setFlipX(sprite.flipX)
      .setAlpha(0.4)
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(sprite.depth - 1);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => ghost.destroy(),
    });
  }

  /** Floating "+N" so score changes are readable without watching the HUD. */
  scorePopup(x: number, y: number, text: string, color = '#ffe98a'): void {
    if (this.reducedMotion) return;
    const label = this.scene.add
      .text(x, y - 12, text, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.scene.tweens.add({
      targets: label,
      y: y - 52,
      alpha: 0,
      scale: 1.25,
      duration: 780,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }
}
