// Pure Web Audio API procedural sound synthesizer
class ProceduralAudioSynth {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isPlayingBgm: boolean = false;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private chordInterval: any = null;

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      this.ambientGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.sfxGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(muted ? 0 : 0.12, this.ctx.currentTime);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(muted ? 0 : 0.25, this.ctx.currentTime);
    }
  }

  startBgm() {
    if (!this.ctx || this.isPlayingBgm) return;
    this.resume();
    this.isPlayingBgm = true;

    try {
      // Warm surreal school ambient drone (liminal school hall vibes)
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();

      this.droneOsc1.type = 'sine';
      this.droneOsc1.frequency.setValueAtTime(110, this.ctx.currentTime); // A2

      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.setValueAtTime(164.81, this.ctx.currentTime); // E3

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      const droneSubGain = this.ctx.createGain();
      droneSubGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.droneOsc1.connect(filter);
      this.droneOsc2.connect(filter);
      filter.connect(droneSubGain);
      if (this.ambientGain) {
        droneSubGain.connect(this.ambientGain);
      }

      this.droneOsc1.start();
      this.droneOsc2.start();

      // Gentle procedural chime progression every 6 seconds
      const notes = [220, 261.63, 329.63, 392, 440, 523.25];
      let noteIndex = 0;
      this.chordInterval = setInterval(() => {
        if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
        this.playSoftBell(notes[noteIndex % notes.length]);
        noteIndex++;
      }, 5000);
    } catch (e) {
      console.warn('Failed to start ambient BGM:', e);
    }
  }

  playSoftBell(freq: number) {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 3.5);

      osc.connect(gain);
      if (this.ambientGain) gain.connect(this.ambientGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 3.6);
    } catch (_) {}
  }

  // Visual novel blip text sound (Ace Attorney style)
  playTextBlip() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      // Slight pitch variation for retro personality
      const pitch = 380 + (Math.random() * 40 - 20);
      osc.frequency.setValueAtTime(pitch, now);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      if (this.sfxGain) gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch (_) {}
  }

  // Clue unlocked fanfare
  playSuccessChime() {
    if (!this.ctx || this.isMuted) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const startTime = this.ctx!.currentTime + idx * 0.1;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.8);

        osc.connect(gain);
        if (this.sfxGain) gain.connect(this.sfxGain);

        osc.start(startTime);
        osc.stop(startTime + 0.85);
      });
    } catch (_) {}
  }

  // Touch beat pulse
  playBeatPulse() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      if (this.sfxGain) gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (_) {}
  }

  // Glitch or sensor activation sound
  playGlitchSound() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.1);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      if (this.sfxGain) gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (_) {}
  }

  // Classroom 404 door open transition sound
  playDoorOpenSound() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(70, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 1.2);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 1.2);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(filter);
      filter.connect(gain);
      if (this.sfxGain) gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 1.6);
    } catch (_) {}
  }
}

export const audioSynth = new ProceduralAudioSynth();
