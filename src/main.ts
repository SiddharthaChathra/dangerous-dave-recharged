import Phaser from 'phaser';
import { createGameConfig } from './game/core/GameConfig';
import { gameEvents } from './game/core/EventBus';
import { HUD } from './ui/HUD';
import { MainMenu } from './ui/MainMenu';
import { PauseMenu } from './ui/PauseMenu';
import { GameOverScreen } from './ui/GameOverScreen';
import { LevelCompleteScreen } from './ui/LevelCompleteScreen';
import { SettingsPanel } from './ui/SettingsPanel';
import { TouchControls } from './ui/TouchControls';
import type { PlayScene } from './game/scenes/PlayScene';
import { DEFAULT_LEVEL_ID, getLevel, getNextLevelId } from './game/levels/registry';
import { loadSave, writeSave, updateHighScore, unlockLevel, recordLevelResult } from './game/systems/SaveSystem';
import { computeRating } from './utils/scoring';
import { audioSystem } from './game/core/audio';
import { applyTheme, applyReducedMotion, prefersReducedMotion } from './ui/theme';

const parent = document.getElementById('game-root');
if (!parent) throw new Error('game-root element missing from index.html');

const uiRoot = document.getElementById('ui-root');
if (!uiRoot) throw new Error('ui-root element missing from index.html');

const game = new Phaser.Game(createGameConfig(parent));
(window as unknown as { __ddrDebugGame: Phaser.Game }).__ddrDebugGame = game;

// Mount HUD after game is created
const hud = new HUD(gameEvents);
hud.mount(uiRoot);

// Seed the shared AudioSystem from persisted settings so volumes/mute are correct from boot.
const initialSave = loadSave(window.localStorage);
audioSystem.setMusicVolume(initialSave.settings.musicVolume);
audioSystem.setSfxVolume(initialSave.settings.sfxVolume);
audioSystem.setMuted(initialSave.settings.muted);

// Apply theme and reduced motion from persisted settings.
applyTheme(initialSave.settings.theme);
applyReducedMotion(initialSave.settings.reducedMotion || prefersReducedMotion());

// The currently-mounted DOM screen (menu / pause / game-over / level-complete), if any.
let currentScreen: { destroy(): void } | null = null;

// The Settings panel, mounted as an independent overlay on top of currentScreen (not a
// currentScreen swap) so the menu underneath stays visible while Settings is open.
let settingsPanel: SettingsPanel | null = null;

// The level actually running, used to resolve PauseMenu's 'restart' sentinel.
let currentLevelId: string = DEFAULT_LEVEL_ID;

// The mounted TouchControls, bound at construction time to one Play scene's InputController.
// A fresh InputController is created every time PlayScene.create() runs, so a fresh
// TouchControls instance is created (and the old one destroyed) to match, each time Play
// (re)starts.
let touchControls: TouchControls | null = null;

function showScreen(screen: { destroy(): void } | null): void {
  currentScreen?.destroy();
  currentScreen = screen;
}

gameEvents.on('game:started', ({ levelId }) => {
  if (levelId === 'menu') {
    touchControls?.destroy();
    touchControls = null;
    const menu = new MainMenu(gameEvents);
    menu.mount(uiRoot);
    showScreen(menu);
    return;
  }

  const resolvedId = levelId === 'restart' ? currentLevelId : levelId;
  currentLevelId = resolvedId;
  showScreen(null);

  // The scene instance for 'Play' is registered (and thus retrievable via getScene) from the
  // moment the Phaser game is constructed, since it's listed in GameConfig's `scene` array —
  // but its InputController field is only assigned once create() actually runs. Whether
  // scene.start() runs create() synchronously (observed in this Phaser version) or defers it to
  // the next game step, subscribing to the scene's own CREATE lifecycle event BEFORE calling
  // start() is what's safe in both cases: a listener attached after start() can lose the race
  // entirely if create() already ran synchronously and the event already fired (the mirror image
  // of Task 13's self-emission-loop bug, where the risk was reading a stale/not-yet-replaced
  // instance instead). Attaching first means the freshly-(re)created InputController is
  // guaranteed to exist by the time the callback runs, regardless of that timing.
  const playScene = game.scene.getScene('Play') as PlayScene;
  playScene.events.once(Phaser.Scenes.Events.CREATE, () => {
    touchControls?.destroy();
    touchControls = new TouchControls(playScene.getInputController());
    touchControls.mount(uiRoot);
  });
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

gameEvents.on('settings:open', () => {
  // Defensive: avoid double-mounting if Settings is somehow opened while already open.
  settingsPanel?.destroy();
  const panel = new SettingsPanel(gameEvents, loadSave(window.localStorage).settings);
  panel.mount(uiRoot);
  settingsPanel = panel;
});

gameEvents.on('settings:changed', (settings) => {
  audioSystem.setMusicVolume(settings.musicVolume);
  audioSystem.setSfxVolume(settings.sfxVolume);
  audioSystem.setMuted(settings.muted);

  applyTheme(settings.theme);
  applyReducedMotion(settings.reducedMotion);

  const save = loadSave(window.localStorage);
  const updated = { ...save, settings };
  writeSave(window.localStorage, updated);
});

// Nothing has fired game:started yet at boot, so mount the main menu directly.
const initialMenu = new MainMenu(gameEvents);
initialMenu.mount(uiRoot);
currentScreen = initialMenu;
