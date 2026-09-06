export type SfxName = 'jump' | 'collect' | 'damage' | 'enemyDefeat' | 'checkpoint' | 'levelComplete' | 'uiClick';

const SFX_PROFILE: Record<SfxName, { freq: number; durationSeconds: number; type: OscillatorType }> = {
  jump: { freq: 520, durationSeconds: 0.12, type: 'square' },
  collect: { freq: 880, durationSeconds: 0.1, type: 'sine' },
  damage: { freq: 140, durationSeconds: 0.25, type: 'sawtooth' },
  enemyDefeat: { freq: 260, durationSeconds: 0.18, type: 'triangle' },
  checkpoint: { freq: 660, durationSeconds: 0.2, type: 'sine' },
  levelComplete: { freq: 990, durationSeconds: 0.4, type: 'sine' },
  uiClick: { freq: 400, durationSeconds: 0.06, type: 'square' },
};

export class AudioSystem {
  private musicVolume = 0.6;
  private sfxVolume = 0.8;
  private muted = false;

  constructor(private readonly context: AudioContext) {}

  setMusicVolume(value: number): void {
    this.musicVolume = Math.max(0, Math.min(1, value));
  }
  getMusicVolume(): number {
    return this.musicVolume;
  }
  setSfxVolume(value: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, value));
  }
  getSfxVolume(): number {
    return this.sfxVolume;
  }
  setMuted(value: boolean): void {
    this.muted = value;
  }

  playSfx(name: SfxName): void {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    if (this.muted) return;
    
    const t = this.context.currentTime;
    
    if (name === 'jump') {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(250, t);
        osc.frequency.exponentialRampToValueAtTime(500, t + 0.12);
        gain.gain.setValueAtTime(this.sfxVolume * 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain);
        gain.connect(this.context.destination);
        osc.start(t);
        osc.stop(t + 0.15);
    } else if (name === 'collect' || name === 'checkpoint') {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(name === 'collect' ? 880 : 1200, t);
        osc.frequency.exponentialRampToValueAtTime(name === 'collect' ? 1760 : 2400, t + 0.1);
        gain.gain.setValueAtTime(this.sfxVolume * 0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(gain);
        gain.connect(this.context.destination);
        osc.start(t);
        osc.stop(t + 0.2);
    } else if (name === 'damage' || name === 'enemyDefeat') {
        const dur = name === 'damage' ? 0.3 : 0.15;
        const bufferSize = this.context.sampleRate * dur;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.context.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.context.createBiquadFilter();
        noiseFilter.type = name === 'damage' ? 'lowpass' : 'bandpass';
        noiseFilter.frequency.value = name === 'damage' ? 600 : 1200;
        const noiseGain = this.context.createGain();
        noiseGain.gain.setValueAtTime(this.sfxVolume * 0.6, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + dur);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.context.destination);
        noise.start(t);
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.type = name === 'damage' ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(name === 'damage' ? 150 : 200, t);
        osc.frequency.exponentialRampToValueAtTime(name === 'damage' ? 50 : 100, t + dur);
        gain.gain.setValueAtTime(this.sfxVolume * 0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
        osc.connect(gain);
        gain.connect(this.context.destination);
        osc.start(t);
        osc.stop(t + dur);
    } else {
        const profile = SFX_PROFILE[name];
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        oscillator.type = profile.type;
        oscillator.frequency.value = profile.freq;
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.3, t);
        gainNode.gain.linearRampToValueAtTime(0, t + profile.durationSeconds);
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        oscillator.start(t);
        oscillator.stop(t + profile.durationSeconds);
    }
  }

  // Background "music" is a slow, quiet arpeggio loop synthesized per level mood — kept intentionally
  // simple (procedural, not a sample) to satisfy the no-external-audio-assets constraint.
  private musicIntervalId: ReturnType<typeof setInterval> | null = null;

  startMusic(moodNotes: number[] = [220, 277, 330, 277]): void {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    this.stopMusic();
    if (this.muted) return;
    let step = 0;
    this.musicIntervalId = setInterval(() => {
      if (this.muted) return;
      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = moodNotes[step % moodNotes.length];
      gainNode.gain.setValueAtTime(this.musicVolume * 0.15, this.context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.8);
      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + 0.8);
      step += 1;
    }, 900);
  }

  stopMusic(): void {
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }
}
