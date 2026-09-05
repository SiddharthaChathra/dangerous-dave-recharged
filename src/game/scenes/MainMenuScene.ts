import Phaser from 'phaser';

/**
 * Minimal background scene behind the DOM `MainMenu` panel (src/ui/MainMenu.ts).
 * The real menu UI and its Play button now live in the DOM layer, driven by
 * the `game:started` event orchestrated in main.ts — this scene just renders
 * whatever ambient background/logo art the game world shows behind it.
 */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Dangerous Dave: Recharged', {
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }
}
