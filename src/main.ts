import Phaser from 'phaser';
import { createGameConfig } from './game/core/GameConfig';
import { gameEvents } from './game/core/EventBus';
import { HUD } from './ui/HUD';

const parent = document.getElementById('game-root');
if (!parent) throw new Error('game-root element missing from index.html');

const uiRoot = document.getElementById('ui-root');
if (!uiRoot) throw new Error('ui-root element missing from index.html');

new Phaser.Game(createGameConfig(parent));

// Mount HUD after game is created
const hud = new HUD(gameEvents);
hud.mount(uiRoot);
