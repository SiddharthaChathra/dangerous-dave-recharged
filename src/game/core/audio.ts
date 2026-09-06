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
  // A faithful no-op AudioParam: the stub must accept the *whole* scheduling interface, not
  // just the couple of methods today's sounds happen to call. Anything less means a richer
  // synth (envelopes, pitch ramps, noise) breaks the test suite rather than the audio.
  const audioParam = () => ({
    value: 0,
    setValueAtTime() { return this; },
    linearRampToValueAtTime() { return this; },
    exponentialRampToValueAtTime() { return this; },
    setTargetAtTime() { return this; },
    setValueCurveAtTime() { return this; },
    cancelScheduledValues() { return this; },
    cancelAndHoldAtTime() { return this; },
  });

  return {
    state: 'running',
    currentTime: 0,
    sampleRate: 44100,
    createOscillator: () => ({
      connect() {},
      disconnect() {},
      start() {},
      stop() {},
      frequency: audioParam(),
      detune: audioParam(),
      type: 'sine',
    }),
    createGain: () => ({
      connect() {},
      disconnect() {},
      gain: audioParam(),
    }),
    createBiquadFilter: () => ({
      connect() {},
      disconnect() {},
      frequency: audioParam(),
      Q: audioParam(),
      gain: audioParam(),
      type: 'lowpass',
    }),
    // White-noise style sources need a buffer + buffer source.
    createBuffer: (channels: number, length: number) => ({
      numberOfChannels: channels,
      length,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(Math.max(0, length)),
    }),
    createBufferSource: () => ({
      connect() {},
      disconnect() {},
      start() {},
      stop() {},
      buffer: null,
      playbackRate: audioParam(),
      loop: false,
    }),
    createStereoPanner: () => ({ connect() {}, disconnect() {}, pan: audioParam() }),
    createDynamicsCompressor: () => ({
      connect() {},
      disconnect() {},
      threshold: audioParam(),
      knee: audioParam(),
      ratio: audioParam(),
      attack: audioParam(),
      release: audioParam(),
    }),
    destination: {},
    resume: () => Promise.resolve(),
  } as unknown as AudioContext;
}

export const audioSystem = new AudioSystem(createAudioContext());
