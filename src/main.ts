import Phaser from 'phaser';
import { createGameConfig } from './game/core/GameConfig';
import { gameEvents } from './game/core/EventBus';
import { HUD } from './ui/HUD';
import { MainMenu } from './ui/MainMenu';
import { PauseMenu } from './ui/PauseMenu';
import { GameOverScreen } from './ui/GameOverScreen';
import { LevelCompleteScreen } from './ui/LevelCompleteScreen';
import { DEFAULT_LEVEL_ID, getLevel, getNextLevelId } from './game/levels/registry';
import { loadSave, writeSave, updateHighScore, unlockLevel, recordLevelResult } from './game/systems/SaveSystem';
import { computeRating } from './utils/scoring';

const parent = document.getElementById('game-root');
if (!parent) throw new Error('game-root element missing from index.html');

const uiRoot = document.getElementById('ui-root');
if (!uiRoot) throw new Error('ui-root element missing from index.html');

const game = new Phaser.Game(createGameConfig(parent));

// Mount HUD after game is created
const hud = new HUD(gameEvents);
hud.mount(uiRoot);

// The currently-mounted DOM screen (menu / pause / game-over / level-complete), if any.
let currentScreen: { destroy(): void } | null = null;

// The level actually running, used to resolve PauseMenu's 'restart' sentinel.
let currentLevelId: string = DEFAULT_LEVEL_ID;

function showScreen(screen: { destroy(): void } | null): void {
  currentScreen?.destroy();
  currentScreen = screen;
}

gameEvents.on('game:started', ({ levelId }) => {
  if (levelId === 'menu') {
    const menu = new MainMenu(gameEvents);
    menu.mount(uiRoot);
    showScreen(menu);
    return;
  }

  const resolvedId = levelId === 'restart' ? currentLevelId : levelId;
  currentLevelId = resolvedId;
  showScreen(null);
  game.scene.start('Play', { levelId: resolvedId });
});

gameEvents.on('game:pause', () => {
  game.scene.pause('Play');
  const pauseMenu = new PauseMenu(gameEvents);
  pauseMenu.mount(uiRoot);
  showScreen(pauseMenu);
});

gameEvents.on('game:resume', () => {
  showScreen(null);
  game.scene.resume('Play');
});

gameEvents.on('game:over', ({ finalScore }) => {
  const save = loadSave(window.localStorage);
  const updated = updateHighScore(save, finalScore);
  writeSave(window.localStorage, updated);

  const gameOverScreen = new GameOverScreen(gameEvents, { finalScore, bestScore: updated.highScore });
  gameOverScreen.mount(uiRoot);
  showScreen(gameOverScreen);
});

gameEvents.on('level:complete', ({ levelId, score, timeSeconds, collected, total }) => {
  const level = getLevel(levelId);
  const rating = computeRating({ score, collected, total }, timeSeconds, level.parTimeSeconds);
  const nextLevelId = getNextLevelId(levelId);

  let save = loadSave(window.localStorage);
  save = recordLevelResult(save, levelId, score, timeSeconds);
  if (nextLevelId) save = unlockLevel(save, nextLevelId);
  writeSave(window.localStorage, save);

  const levelCompleteScreen = new LevelCompleteScreen(gameEvents, {
    score,
    timeSeconds,
    collected,
    total,
    rating,
    nextLevelId,
  });
  levelCompleteScreen.mount(uiRoot);
  showScreen(levelCompleteScreen);
});

// Nothing has fired game:started yet at boot, so mount the main menu directly.
const initialMenu = new MainMenu(gameEvents);
initialMenu.mount(uiRoot);
currentScreen = initialMenu;
