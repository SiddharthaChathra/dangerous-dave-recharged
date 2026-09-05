import Phaser from 'phaser';

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
