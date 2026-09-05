import Phaser from 'phaser';
import { buildParallaxLayers, type ParallaxController } from '../levels/parallax';

/**
 * Cinematic animated background scene behind the DOM MainMenu.
 * Displays a beautiful endless panning environment with a hero character.
 */
export class MainMenuScene extends Phaser.Scene {
  private cameraScrollX = 0;
  private heroSprite!: Phaser.GameObjects.Sprite;
  private environment!: ParallaxController;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    const { width, height } = this.scale;

    // Use the striking 'neon' palette for the main menu hero shot
    this.environment = buildParallaxLayers(this, 'neon', width * 4, height);

    // Create cinematic lighting (vignette + glows)
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.8, 0.8, 0, 0);
    vignette.fillRect(0, 0, width, height);
    vignette.setScrollFactor(0).setDepth(-5);

    // Add ambient particles (dust/sparks)
    this.particles = this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: width },
      y: { min: height - 100, max: height },
      lifespan: { min: 3000, max: 8000 },
      speedY: { min: -10, max: -30 },
      speedX: { min: -20, max: 20 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0x00f0ff,
      blendMode: 'ADD',
      frequency: 150
    });
    this.particles.setScrollFactor(0).setDepth(10);

    // Place the hero on the right-hand third. The DOM menu panel (title, PLAY/SETTINGS and
    // the level grid) occupies the left side, and the hero previously sat on top of those
    // controls — keeping it right of them lets both read clearly.
    this.heroSprite = this.add.sprite(width * 0.78, height - 96, 'player_idle');
    this.heroSprite.setOrigin(0.5, 1);
    this.heroSprite.setScale(2.5); // make character large and heroic
    this.heroSprite.setScrollFactor(0); // Lock to screen
    this.heroSprite.setDepth(20);

    // Hero subtle idle breathing animation (scale Y)
    this.tweens.add({
      targets: this.heroSprite,
      scaleY: 2.45,
      scaleX: 2.52,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Hero glow
    const heroGlow = this.add.sprite(width * 0.78, height - 128, 'particle');
    heroGlow.setScale(20);
    heroGlow.setTint(0x00f0ff);
    heroGlow.setAlpha(0.15);
    heroGlow.setBlendMode('ADD');
    heroGlow.setScrollFactor(0);
    heroGlow.setDepth(19);
    
    this.tweens.add({
      targets: heroGlow,
      alpha: 0.25,
      scale: 22,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // Pan endlessly to the right for cinematic motion. The environment layers wrap on
    // their own (screen-fixed TileSprites), so this can grow without bound and never
    // needs the old reset hack.
    this.cameraScrollX += 40 * dt;
    this.cameras.main.scrollX = this.cameraScrollX;
    this.environment.update(this.cameras.main, delta);
  }
}
