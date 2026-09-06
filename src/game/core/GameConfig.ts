import Phaser from 'phaser';
import { SCREEN } from './constants';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { PlayScene } from '../scenes/PlayScene';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: SCREEN.WIDTH,
    height: SCREEN.HEIGHT,
    backgroundColor: '#101018',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      // FIT, deliberately — not RESIZE.
      //
      // RESIZE makes the camera's world view equal the viewport, so a 1920px-wide window shows
      // nearly twice as much of the level as a 1024px one: the player on the bigger screen sees
      // hazards and enemies sooner. That is a difficulty change driven by hardware, and it also
      // breaks the level validator's guarantee, which is computed against this fixed camera.
      // (It also renders dead space: viewports are taller than several levels' 540-860px.)
      //
      // FIT keeps every player's view identical. The fullscreen look comes from the layout CSS
      // filling the viewport, not from handing bigger screens a bigger playfield.
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, PreloadScene, MainMenuScene, PlayScene],
  };
}
