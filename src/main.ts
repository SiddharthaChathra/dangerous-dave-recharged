import Phaser from 'phaser';
import { createGameConfig } from './game/core/GameConfig';

const parent = document.getElementById('game-root');
if (!parent) throw new Error('game-root element missing from index.html');

new Phaser.Game(createGameConfig(parent));
