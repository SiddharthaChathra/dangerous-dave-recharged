import Phaser from 'phaser';
import { buildParallaxLayers, type ParallaxController } from '../levels/parallax';
import { gameEvents } from '../core/EventBus';
import { getVisualMode } from '../core/visualMode';
import { getSelectedCharacterId } from '../characters/selection';
import { resolvePlayerTextureKey } from '../characters/playerTexture';

/**
 * Cinematic animated background scene behind the DOM MainMenu.
 * Displays a beautiful endless panning environment with a hero character.
 *
 * Listens for visual-mode and character changes so the hero sprite always
 * reflects the current presentation mode and selected character.
 */
export class MainMenuScene extends Phaser.Scene {
  private cameraScrollX = 0;
  private heroSprite!: Phaser.GameObjects.Sprite;
  private heroGlow!: Phaser.GameObjects.Sprite;
  private environment!: ParallaxController;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private unsubscribers: (() => void)[] = [];

  /** Platform sprite rendered beneath the hero for a polished pedestal effect. */
  private platformGraphics!: Phaser.GameObjects.Graphics;
  /** Rim-light ring drawn behind the hero to give a "3D lit" feel. */
  private rimRing!: Phaser.GameObjects.Graphics;

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

    const heroX = width * 0.78;
    const heroY = height - 96;

    // Holographic platform / pedestal beneath the hero
    this.platformGraphics = this.add.graphics();
    this.platformGraphics.setScrollFactor(0).setDepth(17);
    this.drawPedestal(heroX, heroY + 8);

    // Animated rim-light ring behind the hero
    this.rimRing = this.add.graphics();
    this.rimRing.setScrollFactor(0).setDepth(18);

    // Hero glow (behind hero)
    this.heroGlow = this.add.sprite(heroX, heroY - 32, 'particle');
    this.heroGlow.setScale(20);
    this.heroGlow.setAlpha(0.15);
    this.heroGlow.setBlendMode('ADD');
    this.heroGlow.setScrollFactor(0);
    this.heroGlow.setDepth(19);

    this.tweens.add({
      targets: this.heroGlow,
      alpha: 0.25,
      scale: 22,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Place the hero on the right-hand third. The DOM menu panel (title, PLAY/SETTINGS and
    // the level grid) occupies the left side, and the hero previously sat on top of those
    // controls — keeping it right of them lets both read clearly.
    const initialTexture = this.resolveHeroTexture();
    this.heroSprite = this.add.sprite(heroX, heroY, initialTexture);
    this.heroSprite.setOrigin(0.5, 1);
    this.heroSprite.setScale(2.5); // make character large and heroic
    this.heroSprite.setScrollFactor(0); // Lock to screen
    this.heroSprite.setDepth(20);

    // Apply glow tint to match the character
    this.applyCharacterGlow();

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

    // Listen for visual mode changes to swap the hero texture in real time
    this.unsubscribers.push(
      gameEvents.on('visual-mode:changed', () => this.refreshHeroSkin()),
    );

    // Listen for character changes (from the roster) to update the hero on the menu
    this.unsubscribers.push(
      gameEvents.on('character:changed', () => this.refreshHeroSkin()),
    );
  }

  /** Resolves the correct idle texture for the current character + visual mode. */
  private resolveHeroTexture(): string {
    return resolvePlayerTextureKey(
      'idle',
      getSelectedCharacterId(),
      getVisualMode(),
      (key) => this.textures.exists(key),
    );
  }

  /** Swaps the hero sprite's texture and updates the glow to match. */
  private refreshHeroSkin(): void {
    const textureKey = this.resolveHeroTexture();
    if (this.heroSprite?.texture?.key !== textureKey) {
      this.heroSprite.setTexture(textureKey);
    }
    this.applyCharacterGlow();
  }

  /**
   * Colour-codes the hero glow, rim ring and pedestal to match the selected character.
   * Each character has a signature tint so the menu backdrop feels personalised.
   */
  private applyCharacterGlow(): void {
    const charId = getSelectedCharacterId();
    const tints: Record<string, number> = {
      dave:  0x00f0ff,
      delta: 0xfb923c,
      nova:  0xc084fc,
      rex:   0x2dd4bf,
    };
    const tint = tints[charId] ?? 0x00f0ff;

    this.heroGlow.setTint(tint);

    // Redraw pedestal and rim in the new tint
    const heroX = this.heroSprite?.x ?? this.scale.width * 0.78;
    const heroY = this.heroSprite?.y ?? this.scale.height - 96;
    this.drawPedestal(heroX, heroY + 8, tint);
    this.drawRimRing(heroX, heroY - 48, tint);

    // Update ambient particle tint
    if (this.particles) {
      this.particles.setParticleTint(tint);
    }
  }

  /** Draws a glowing holographic pedestal ellipse. */
  private drawPedestal(x: number, y: number, color: number = 0x00f0ff): void {
    const g = this.platformGraphics;
    g.clear();

    // Outer glow ring
    g.lineStyle(3, color, 0.25);
    g.strokeEllipse(x, y, 140, 28);

    // Inner bright ring
    g.lineStyle(2, color, 0.5);
    g.strokeEllipse(x, y, 110, 20);

    // Filled translucent base
    g.fillStyle(color, 0.08);
    g.fillEllipse(x, y, 140, 28);
  }

  /** Draws a subtle rim-light halo behind the hero. */
  private drawRimRing(x: number, y: number, color: number = 0x00f0ff): void {
    const g = this.rimRing;
    g.clear();

    // Soft outer halo
    g.lineStyle(4, color, 0.12);
    g.strokeCircle(x, y, 80);

    g.lineStyle(2, color, 0.2);
    g.strokeCircle(x, y, 60);
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

  shutdown(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }
}
