import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    // Sprite/audio generation happens in later tasks; nothing to load yet.
  }

  create(): void {
    this.scene.start('MainMenu');
  }
}
