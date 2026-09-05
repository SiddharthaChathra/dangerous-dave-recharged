import Phaser from 'phaser';

/**
 * Animated background scene behind the DOM MainMenu.
 * Draws floating particles and a subtle atmosphere.
 */
export class MainMenuScene extends Phaser.Scene {
  private particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];

  constructor() {
    super('MainMenu');
  }

  create(): void {
    const { width, height } = this.scale;

    // Dark gradient background
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a10);
    bg.setDepth(-10);

    // Subtle grid pattern
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1e293b, 0.15);
    for (let x = 0; x < width; x += 40) {
      grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 40) {
      grid.lineBetween(0, y, width, y);
    }
    grid.setDepth(-9);

    // Create floating particles
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 15 - 5,
        size: 1 + Math.random() * 3,
        alpha: 0.1 + Math.random() * 0.3,
      });
    }
  }

  update(_time: number, delta: number): void {
    // Animate particles (using simple graphics — no external assets needed)
    const { width, height } = this.scale;
    const dt = delta / 1000;

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wrap around
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;
    }
  }
}
