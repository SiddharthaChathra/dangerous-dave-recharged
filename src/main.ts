import Phaser from 'phaser';
import { createGameConfig } from './game/core/GameConfig';
import { gameEvents } from './game/core/EventBus';
import { HUD } from './ui/HUD';
import { MainMenu } from './ui/MainMenu';
import { PauseMenu } from './ui/PauseMenu';
import { GameOverScreen } from './ui/GameOverScreen';
import { LifeLostScreen } from './ui/LifeLostScreen';
import { LevelCompleteScreen } from './ui/LevelCompleteScreen';
import { SettingsPanel } from './ui/SettingsPanel';
import { TouchControls } from './ui/TouchControls';
import type { PlayScene } from './game/scenes/PlayScene';
import { DEFAULT_LEVEL_ID, LEVEL_ORDER, getLevel, getNextLevelId, resolveRequestedLevelId } from './game/levels/registry';
import { STARTING_LIVES } from './utils/livesReducer';
import { loadSave, writeSave, updateHighScore, unlockLevel, recordLevelResult, updateVisualMode, updateSelectedCharacter, completedLevelIds } from './game/systems/SaveSystem';
import { VisualModeToggle } from './ui/VisualModeToggle';
import { CharacterSelectScreen } from './ui/CharacterSelectScreen';
import { getVisualMode, setVisualMode, type VisualMode } from './game/core/visualMode';
import { setSelectedCharacter } from './game/characters/selection';
import { registerPreviewTextureSource } from './game/characters/preview';
import { computeRating } from './utils/scoring';
import { completionMessage, levelNumber } from './utils/levelProgress';
import { audioSystem } from './game/core/audio';
import { applyTheme, applyReducedMotion, prefersReducedMotion } from './ui/theme';

const parent = document.getElementById('game-root');
if (!parent) throw new Error('game-root element missing from index.html');

const uiRoot = document.getElementById('ui-root');
if (!uiRoot) throw new Error('ui-root element missing from index.html');

const game = new Phaser.Game(createGameConfig(parent));
(window as unknown as { __ddrDebugGame: Phaser.Game }).__ddrDebugGame = game;

// Lets UI render character previews without importing Phaser or reaching for a debug global.
registerPreviewTextureSource(game.textures);

/**
 * Keeps the DOM UI layer glued to the game canvas.
 *
 * Scale.FIT letterboxes the canvas to preserve the 16:9 playfield, so the canvas almost never
 * fills the window — but #ui-root is a full-viewport overlay. Left unsynced, the HUD floats in
 * the letterbox bars while the bottom-anchored controls sit *inside* the playfield covering the
 * ground: the UI and the game end up in two different coordinate spaces.
 *
 * The letterbox size depends on the window's aspect ratio at runtime, so CSS alone can't
 * express this; it has to be measured.
 */
function syncUiRootToCanvas(): void {
  const canvas = game.canvas;
  if (!canvas || !uiRoot) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return; // not laid out yet
  uiRoot.style.left = `${rect.left}px`;
  uiRoot.style.top = `${rect.top}px`;
  uiRoot.style.width = `${rect.width}px`;
  uiRoot.style.height = `${rect.height}px`;
  uiRoot.style.right = 'auto';
  uiRoot.style.bottom = 'auto';
}

game.scale.on('resize', syncUiRootToCanvas);
window.addEventListener('resize', syncUiRootToCanvas);
// Catches letterbox changes that don't raise a window resize (fullscreen, zoom, devtools).
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(syncUiRootToCanvas).observe(parent);
}
// The canvas is laid out after this tick, so measure once the first frame has been painted.
requestAnimationFrame(syncUiRootToCanvas);

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

// ---- Presentation mode (CLASSIC DAVE / CURRENT VISUAL) — see THEME_INTEGRATION.md ----------
// The single DOM hook all visual code branches on. Set before anything mounts so the first
// paint is already in the right mode. Applied to BOTH <html> and <body>: <html> is what CSS
// authored against `:root`/`html[data-visual-mode]` expects, and <body> lets mode selectors
// combine with the body-level state classes (e.g. `.ddr-modal-open`) already in use here.
function applyVisualModeToDocument(mode: VisualMode): void {
  document.documentElement.setAttribute('data-visual-mode', mode);
  document.body.setAttribute('data-visual-mode', mode);
}

setSelectedCharacter(initialSave.selectedCharacterId);
setVisualMode(initialSave.visualMode);
applyVisualModeToDocument(getVisualMode());

// Character selection is cosmetic, but it must survive a reload like any other preference.
gameEvents.on('character:changed', ({ characterId }) => {
  writeSave(window.localStorage, updateSelectedCharacter(loadSave(window.localStorage), characterId));
});

gameEvents.on('visual-mode:changed', ({ mode }) => {
  applyVisualModeToDocument(mode);
  writeSave(window.localStorage, updateVisualMode(loadSave(window.localStorage), mode));
});

// The currently-mounted DOM screen (menu / pause / game-over / level-complete), if any.
let currentScreen: { destroy(): void } | null = null;

// The Settings panel, mounted as an independent overlay on top of currentScreen (not a
// currentScreen swap) so the menu underneath stays visible while Settings is open.
let settingsPanel: SettingsPanel | null = null;

// ---------------------------------------------------------------------------------------------
// Run state. A "run" is one attempt at the campaign under the classic three-life rule: lives and
// score persist across level restarts AND level transitions, and reset only when a new run
// begins (picking a level from the menu, or Try Again after a Game Over). Keeping this here — in
// the one place that owns scene transitions — is what stops PlayScene from silently refilling
// lives to 3 every time it restarts.
// ---------------------------------------------------------------------------------------------

/** The level actually running, used to resolve the 'restart'/'next-level' sentinels. */
let currentLevelId: string = DEFAULT_LEVEL_ID;

/** Lives left in the current run. */
let currentLives: number = STARTING_LIVES;

/**
 * The run's score as it stood when the current level attempt began. Restarting after a death
 * rolls back to this, so dying can't be used to farm the same gems over and over.
 */
let runScoreAtLevelStart = 0;

/** How long the "LIFE LOST" beat is shown before the level restarts. */
const LIFE_LOST_MS = 850;

/**
 * Cancels the pending "corridor finished" subscription, if any.
 *
 * The interstitial hands off to the stats card through a one-shot listener. If the player
 * leaves mid-corridor — quitting to the menu, or any other level start — that listener would
 * otherwise still be waiting, and would drop a Level Complete card on top of whatever screen
 * they went to.
 */
let cancelPendingTransition: (() => void) | null = null;

function abortPendingTransition(game: Phaser.Game): void {
  cancelPendingTransition?.();
  cancelPendingTransition = null;
  setCutsceneState(false);
  if (game.scene.getScene('LevelTransition')?.scene.isActive()) {
    game.scene.stop('LevelTransition');
  }
}

/**
 * Marks the document while the between-levels corridor is playing. CSS uses it to clear the
 * persistent on-screen chrome — the visual-mode toggle and the touch pad — out of a shot the
 * player cannot interact with anyway. The HUD hides itself on `level:complete`.
 */
function setCutsceneState(playing: boolean): void {
  document.body.classList.toggle('ddr-cutscene', playing);
}

/** Sentinels that continue the current run rather than starting a fresh one. */
function continuesCurrentRun(requestedLevelId: string): boolean {
  return requestedLevelId === 'restart' || requestedLevelId === 'next-level';
}

// The mounted TouchControls, bound at construction time to one Play scene's InputController.
// A fresh InputController is created every time PlayScene.create() runs, so a fresh
// TouchControls instance is created (and the old one destroyed) to match, each time Play
// (re)starts.
let touchControls: TouchControls | null = null;

function showScreen(screen: { destroy(): void } | null): void {
  currentScreen?.destroy();
  currentScreen = screen;
  syncModalState();
}

/**
 * Marks the document while any modal screen (menu / pause / game over / level complete /
 * settings) is open. CSS uses this to make the HUD and touch controls inert, so overlay
 * chrome can never intercept a click aimed at a menu button.
 */
function syncModalState(): void {
  const open = currentScreen !== null || settingsPanel !== null || characterSelectScreen !== null;
  document.body.classList.toggle('ddr-modal-open', open);
}

gameEvents.on('game:started', ({ levelId }) => {
  abortPendingTransition(game);
  if (levelId === 'menu') {
    touchControls?.destroy();
    touchControls = null;
    const menu = new MainMenu(gameEvents);
    menu.mount(uiRoot);
    showScreen(menu);
    return;
  }

  const resolvedId = resolveRequestedLevelId(levelId, currentLevelId);

  // Starting a level any other way than continuing the run (menu Play, level select, or Try
  // Again) begins a NEW run: full lives, score from zero.
  if (!continuesCurrentRun(levelId)) {
    currentLives = STARTING_LIVES;
    runScoreAtLevelStart = 0;
  }

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
  game.scene.start('Play', { levelId: resolvedId, lives: currentLives, score: runScoreAtLevelStart });
});

/**
 * A life was lost with lives still remaining: show a brief, unmissable "LIFE LOST" beat, then
 * restart the CURRENT level from its beginning. There is no checkpoint respawn — the whole level
 * is re-staged, so enemies, collectibles and platforms are all back to their starting state.
 */
gameEvents.on('life:lost', ({ livesRemaining, levelId }) => {
  game.scene.pause('Play');
  currentLives = livesRemaining;
  // Trust the scene's own level id over the tracked one. They normally agree, but if anything
  // ever starts a level without going through this handler they would diverge — and the cost
  // of that is sending the player to the wrong level on death, which is exactly the bug the
  // "a death restarts the CURRENT level" rule exists to prevent.
  currentLevelId = levelId;

  const lifeLostScreen = new LifeLostScreen({ livesRemaining });
  lifeLostScreen.mount(uiRoot);
  showScreen(lifeLostScreen);

  window.setTimeout(() => {
    // 'restart' keeps the run going (lives already decremented, score rolled back to the value
    // it had when this level attempt started).
    gameEvents.emit('game:started', { levelId: 'restart' });
  }, LIFE_LOST_MS);
});

gameEvents.on('game:pause', () => {
  // Only pause a level that is actually running. The HUD's pause button stays on screen during
  // the between-levels corridor and the life-lost beat, when Play is already paused — pausing
  // it again made Phaser warn ("Cannot pause non-running Scene Play") and, worse, opened the
  // pause menu on top of a cutscene the player cannot act on.
  const play = game.scene.getScene('Play');
  if (!play || !play.scene.isActive()) return;

  game.scene.pause('Play');
  const pauseMenu = new PauseMenu(gameEvents);
  pauseMenu.mount(uiRoot);
  showScreen(pauseMenu);
});

gameEvents.on('game:resume', () => {
  showScreen(null);
  game.scene.resume('Play');
});

gameEvents.on('game:over', ({ finalScore, levelId }) => {
  // Without this the Play scene keeps simulating behind the Game Over screen: gravity, enemies,
  // and the timer all keep running, and the death animation gets overwritten on the very next
  // frame because Player.update() is still being called every frame.
  game.scene.pause('Play');
  currentLives = 0;

  const save = loadSave(window.localStorage);
  const updated = updateHighScore(save, finalScore);
  writeSave(window.localStorage, updated);

  const levelIndex = LEVEL_ORDER.indexOf(levelId);
  const gameOverScreen = new GameOverScreen(gameEvents, {
    finalScore,
    bestScore: updated.highScore,
    levelReached: getLevel(levelId).name,
    levelNumber: levelIndex >= 0 ? levelIndex + 1 : 1,
  });
  gameOverScreen.mount(uiRoot);
  showScreen(gameOverScreen);
});

gameEvents.on('level:complete', ({ levelId, score, timeSeconds, collected, total }) => {
  const level = getLevel(levelId);
  const rating = computeRating({ score, collected, total }, timeSeconds, level.parTimeSeconds);
  const nextLevelId = getNextLevelId(levelId);

  // `score` is the run total; this level's own contribution is what belongs in its best-score
  // record. Carry the run total forward so the next level continues from it.
  const levelScore = Math.max(0, score - runScoreAtLevelStart);
  runScoreAtLevelStart = score;

  let save = loadSave(window.localStorage);
  save = recordLevelResult(save, levelId, levelScore, timeSeconds);
  if (nextLevelId) save = unlockLevel(save, nextLevelId);
  writeSave(window.localStorage, save);

  // Announced only after the write actually happened, so "game saved" feedback can't lie.
  gameEvents.emit('progress:saved', {
    levelId,
    unlockedLevelId: nextLevelId,
    bestScore: save.levels[levelId]?.bestScore ?? levelScore,
  });

  // Play the between-levels corridor first: Dave walks into the next level's door, with the
  // "GOOD WORK! ONLY N MORE TO GO." banner overhead, as in the original. The stats card follows
  // once that finishes (or the player skips it). Progression is already persisted above, so a
  // skipped or interrupted interstitial can never cost the player their completed level.
  const message = completionMessage(levelId);
  setCutsceneState(true);
  game.scene.pause('Play');
  game.scene.start('LevelTransition', {
    levelId,
    title: message.title,
    subtitle: message.subtitle,
    isVictory: message.isVictory,
    levelNumber: levelNumber(levelId),
    totalLevels: LEVEL_ORDER.length,
    score,
    gemsCollected: collected,
    gemsTotal: total,
    timeSeconds,
  });

  cancelPendingTransition = gameEvents.once('transition:finished', () => {
    cancelPendingTransition = null;
    setCutsceneState(false);
    if (message.isVictory) {
      showLevelCompleteCard();
    } else {
      gameEvents.emit('game:started', { levelId: 'next-level' });
    }
  });

  const showLevelCompleteCard = () => {
    const levelCompleteScreen = new LevelCompleteScreen(gameEvents, {
      score,
      timeSeconds,
      collected,
      total,
      rating,
      nextLevelId,
      // Counted from the campaign, so it stays right if levels are ever added or removed.
      message,
    });
    levelCompleteScreen.mount(uiRoot);
    showScreen(levelCompleteScreen);
  };
});

/**
 * The roster is mounted the same way as Settings: an independent overlay on top of whatever
 * screen is open, so opening it from the main menu doesn't tear the menu down.
 */
let characterSelectScreen: CharacterSelectScreen | null = null;

gameEvents.on('character-select:open', () => {
  characterSelectScreen?.destroy();
  const save = loadSave(window.localStorage);
  const screen = new CharacterSelectScreen(completedLevelIds(save), () => {
    characterSelectScreen = null;
    syncModalState();
  });
  screen.mount(uiRoot);
  characterSelectScreen = screen;
  syncModalState();
});

gameEvents.on('settings:open', () => {
  // Defensive: avoid double-mounting if Settings is somehow opened while already open.
  settingsPanel?.destroy();
  const panel = new SettingsPanel(gameEvents, loadSave(window.localStorage).settings, () => {
    settingsPanel = null;
    syncModalState();
  });
  panel.mount(uiRoot);
  settingsPanel = panel;
  syncModalState();
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

// The theme switch lives outside the screen stack: it stays available in menus and in play,
// and is never torn down by a screen change.
const visualModeToggle = new VisualModeToggle();
visualModeToggle.mount(uiRoot);

// Nothing has fired game:started yet at boot, so mount the main menu directly.
const initialMenu = new MainMenu(gameEvents);
initialMenu.mount(uiRoot);
currentScreen = initialMenu;
