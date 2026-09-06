import { describe, it, expect, vi } from 'vitest';
import { AudioSystem } from '../src/game/systems/AudioSystem';

/**
 * A no-op AudioParam exposing the whole scheduling interface. The fake must not constrain how
 * sounds are synthesised — a richer synth (pitch ramps, ADSR envelopes, noise buffers) should
 * change what you hear, not break the suite.
 */
function fakeParam() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    setValueCurveAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    cancelAndHoldAtTime: vi.fn(),
  };
}

function fakeAudioContext() {
  const oscillator = {
    connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(),
    frequency: fakeParam(), detune: fakeParam(), type: 'sine',
  };
  const gainNode = { connect: vi.fn(), disconnect: vi.fn(), gain: fakeParam() };
  const filterNode = {
    connect: vi.fn(), disconnect: vi.fn(),
    frequency: fakeParam(), Q: fakeParam(), gain: fakeParam(), type: 'lowpass',
  };
  const bufferSource = {
    connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(),
    buffer: null, playbackRate: fakeParam(), loop: false,
  };
  return {
    currentTime: 0,
    sampleRate: 44100,
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gainNode),
    createBiquadFilter: vi.fn(() => filterNode),
    createBufferSource: vi.fn(() => bufferSource),
    createBuffer: vi.fn((channels: number, length: number) => ({
      numberOfChannels: channels,
      length,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(Math.max(0, length)),
    })),
    createStereoPanner: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn(), pan: fakeParam() })),
    destination: {},
  } as unknown as AudioContext;
}

describe('AudioSystem', () => {
  it('clamps music volume to [0, 1]', () => {
    const audio = new AudioSystem(fakeAudioContext());
    audio.setMusicVolume(1.5);
    expect(audio.getMusicVolume()).toBe(1);
    audio.setMusicVolume(-0.5);
    expect(audio.getMusicVolume()).toBe(0);
  });

  it('clamps sfx volume to [0, 1]', () => {
    const audio = new AudioSystem(fakeAudioContext());
    audio.setSfxVolume(2);
    expect(audio.getSfxVolume()).toBe(1);
  });

  it('does not play a tone when muted', () => {
    const ctx = fakeAudioContext();
    const audio = new AudioSystem(ctx);
    audio.setMuted(true);
    audio.playSfx('jump');
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('plays a tone when not muted', () => {
    const ctx = fakeAudioContext();
    const audio = new AudioSystem(ctx);
    audio.playSfx('jump');
    expect(ctx.createOscillator).toHaveBeenCalled();
  });
});
