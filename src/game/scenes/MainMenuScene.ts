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

    this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('Play'));
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 60, 'Press ENTER to test Play scene', {
        fontSize: '14px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);
  }
}
