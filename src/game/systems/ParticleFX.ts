import Phaser from 'phaser';
import { getVisualMode } from '../core/visualMode';

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
    const isClassic = getVisualMode() === 'classic';
    const particleKey = isClassic ? 'classic__particle' : this.moteKey;
    const blendMode = isClassic ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD;
    
    const scale = opts.scale ?? 0.5;
    const emitter = this.scene.add.particles(x, y, particleKey, {
      lifespan: opts.lifespan,
      speed: { min: opts.speed * 0.35, max: opts.speed },
      angle: opts.angle,
      gravityY: opts.gravityY ?? 0,
      scale: { start: isClassic ? scale * 0.6 : scale, end: isClassic ? scale * 0.6 : 0 },
      alpha: { start: 0.95, end: 0 },
      tint: opts.color,
      blendMode: blendMode,
      emitting: false,
    });
    emitter.setDepth(30);
    emitter.explode(opts.count);
    this.scene.time.delayedCall(opts.lifespan + 80, () => emitter.destroy());
  }

  /** Expanding ring — communicates impact weight far better than a puff alone. */
  private ring(x: number, y: number, color: number, radius: number, durationMs: number): void {
    if (this.reducedMotion) return;
    const isClassic = getVisualMode() === 'classic';
    if (isClassic) return; // Classic mode shouldn't have modern vector rings

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
    const isClassic = getVisualMode() === 'classic';
    
    const ghost = this.scene.add
      .image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
      .setScale(sprite.scaleX, sprite.scaleY)
      .setFlipX(sprite.flipX)
      .setAlpha(0.4)
      .setTint(tint)
      .setBlendMode(isClassic ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD)
      .setDepth(sprite.depth - 1);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: isClassic ? 150 : 260,
      ease: isClassic ? 'Linear' : 'Quad.easeOut',
      onComplete: () => ghost.destroy(),
    });
  }

  /** Floating "+N" so score changes are readable without watching the HUD. */
  /**
   * ---- Effects called by gameplay, styled by presentation ----------------------------------
   * PlayScene calls these at the right gameplay moments; what they look like is yours. These
   * are deliberately minimal starting points, not finished art — upgrade them freely, just keep
   * the signatures so the call sites in PlayScene keep working.
   */

  /** Heat rising off a fire/lava hazard. Called continuously, so keep it cheap. */
  hazardEmber(x: number, y: number, hot = false): void {
    const isClassic = getVisualMode() === 'classic';
    if (isClassic) {
      this.burst(x, y, {
        color: hot ? [0xff5500, 0xff0000] : [0xffaa00, 0xff5500],
        count: 1,
        speed: 30,
        lifespan: 500,
        scale: 0.4,
        gravityY: -20,
      });
      return;
    }
    
    // Modern: Premium glowing embers with drift
    const color = hot ? [0xff3300, 0xff5500, 0xff9900] : [0xff9900, 0xffcc00, 0xffffff];
    const particleKey = this.moteKey;
    const emitter = this.scene.add.particles(x, y, particleKey, {
      lifespan: { min: 600, max: 1200 },
      speed: { min: 10, max: 40 },
      angle: { min: 240, max: 300 },
      gravityY: -50,
      scale: { start: 0.4 + Math.random() * 0.2, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: color,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    emitter.setDepth(25); // Behind player, in front of hazard
    emitter.explode(1 + Math.floor(Math.random() * 2));
    this.scene.time.delayedCall(1300, () => emitter.destroy());
  }

  /** The level key is taken and the exit unlocks — this should feel like a reward. */
  keyCollectBurst(x: number, y: number): void {
    const isClassic = getVisualMode() === 'classic';
    
    this.burst(x, y, { 
      color: [0xffd700, 0xfff3b0, 0xffffff], 
      count: isClassic ? 15 : 35, 
      speed: 220, 
      lifespan: 800, 
      scale: isClassic ? 0.6 : 0.8,
      gravityY: isClassic ? 0 : 80 
    });
    
    if (!isClassic) {
      // Premium golden ring explosion
      this.ring(x, y, 0xffd700, 60, 400);
      this.ring(x, y, 0xffffff, 80, 500);
      
      // Starburst rays
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const line = this.scene.add.line(0, 0, x, y, x + Math.cos(angle)*60, y + Math.sin(angle)*60, 0xffffff, 0.8);
        line.setLineWidth(3);
        line.setBlendMode(Phaser.BlendModes.ADD);
        line.setDepth(40);
        this.scene.tweens.add({
          targets: line,
          alpha: 0,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 300,
          ease: 'Cubic.easeOut',
          onComplete: () => line.destroy()
        });
      }
    }
  }

  /** The exit door's lock coming off. */
  doorUnlockGlow(x: number, y: number): void {
    const isClassic = getVisualMode() === 'classic';
    this.burst(x, y, { 
      color: [0x7dffb0, 0x00f0ff, 0xffffff], 
      count: isClassic ? 12 : 24, 
      speed: 180, 
      lifespan: 700, 
      scale: 0.6 
    });
    
    if (!isClassic) {
      this.ring(x, y, 0x00f0ff, 50, 450);
    }
  }

  /** Dave's death. Fast and dramatic — it has to land in the moment before the level restarts. */
  playerDeathBurst(x: number, y: number): void {
    const isClassic = getVisualMode() === 'classic';
    
    // Core blood/energy explosion
    this.burst(x, y, { 
      color: [0xff0000, 0xff2b2b, 0xffffff], 
      count: isClassic ? 20 : 40, 
      speed: 300, 
      lifespan: 650, 
      scale: isClassic ? 0.8 : 1.0,
      gravityY: 150
    });
    
    if (!isClassic) {
      // Intense double shockwave
      this.ring(x, y, 0xff0000, 70, 300);
      this.ring(x, y, 0xff2b2b, 100, 450);
      
      // Screen flash
      const flash = this.scene.add.rectangle(0, 0, this.scene.scale.width * 2, this.scene.scale.height * 2, 0xff0000, 0.4);
      flash.setScrollFactor(0);
      flash.setDepth(100);
      flash.setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 300,
        ease: 'Expo.easeOut',
        onComplete: () => flash.destroy()
      });
    }
  }

  scorePopup(x: number, y: number, text: string, color = '#ffe98a'): void {
    if (this.reducedMotion) return;
    const isClassic = getVisualMode() === 'classic';
    const label = this.scene.add
      .text(x, y - 12, text, {
        fontFamily: isClassic ? '"Share Tech Mono", monospace' : 'monospace',
        fontSize: '16px',
        color: isClassic ? '#ffffff' : color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.scene.tweens.add({
      targets: label,
      y: y - 52,
      alpha: 0,
      scale: isClassic ? 1 : 1.25,
      duration: isClassic ? 600 : 780,
      ease: isClassic ? 'Linear' : 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }
}
