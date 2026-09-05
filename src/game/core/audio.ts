import { AudioSystem } from '../systems/AudioSystem';

const AudioContextClass =
  window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

// jsdom (used by the Vitest test suite) does not implement the Web Audio API, so
// window.AudioContext is undefined there. Fall back to an inert stub so importing this
// module — which UI files do purely to fire 'uiClick' sfx — never throws outside a real
// browser. AudioSystem.playSfx/startMusic simply no-op harmlessly against the stub.
function createAudioContext(): AudioContext {
  if (AudioContextClass) {
    return new AudioContextClass();
  }
  return {
    state: 'running',
    currentTime: 0,
    createOscillator: () => ({
      connect() {},
      start() {},
      stop() {},
      frequency: { value: 0 },
      type: 'sine',
    }),
    createGain: () => ({
      connect() {},
      gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} },
    }),
    destination: {},
    resume: () => Promise.resolve(),
  } as unknown as AudioContext;
}

export const audioSystem = new AudioSystem(createAudioContext());
