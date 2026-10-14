// ============================================================================
// Sound & Audio Engine (Web Audio API - 100% Procedural, Zero External Assets)
// ============================================================================

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.sfxVolume = 0.7;
    this.musicVolume = 0.35;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicBpm = 128;
    this.whiteNoiseBuffer = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.createNoiseBuffer();
      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio not supported or blocked:", e);
    }
  }

  resume() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuffer = buffer;
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted && this.musicPlaying) {
      this.stopMusic();
    } else if (!muted && !this.musicPlaying && this.initialized) {
      this.startMusic();
    }
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // Laser shot (Primary)
  playLaser(type = 'default') {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'rapid') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1100, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.08);
      gain.gain.setValueAtTime(0.2 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } else if (type === 'plasma') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.22);
      gain.gain.setValueAtTime(0.35 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, t);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    } else {
      // Standard / Spread
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);
      gain.gain.setValueAtTime(0.28 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  // Enemy laser shot
  playEnemyLaser() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.14);
    gain.gain.setValueAtTime(0.18 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  // Hit impact
  playHit() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.06);
    gain.gain.setValueAtTime(0.25 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Shield deflecting damage
  playShieldDeflect() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(950, t + 0.05);
    osc.frequency.linearRampToValueAtTime(500, t + 0.12);
    gain.gain.setValueAtTime(0.3 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Explosions (small, medium, boss/bomb)
  playExplosion(size = 'small') {
    if (this.isMuted || !this.ctx || !this.whiteNoiseBuffer) return;
    this.resume();

    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.whiteNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (size === 'boss') {
      // Sub punch oscillator
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(140, t);
      sub.frequency.exponentialRampToValueAtTime(25, t + 0.8);
      subGain.gain.setValueAtTime(0.7 * this.sfxVolume, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(t);
      sub.stop(t + 0.8);

      // Deep rumbling noise
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + 0.9);
      gain.gain.setValueAtTime(0.6 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.9);
    } else if (size === 'medium') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(150, t + 0.4);
      gain.gain.setValueAtTime(0.4 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.4);
    } else {
      // Small
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.frequency.exponentialRampToValueAtTime(220, t + 0.25);
      gain.gain.setValueAtTime(0.3 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.25);
    }
  }

  // Power-up pickup chime
  playPowerup() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  // EMP Bomb detonation sound
  playBomb() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    
    // Low rumble sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    gain.gain.setValueAtTime(0.6 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  // Boss warning alarm
  playBossAlarm() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    for (let i = 0; i < 3; i++) {
      const t = this.ctx.currentTime + i * 0.45;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.linearRampToValueAtTime(660, t + 0.2);
      gain.gain.setValueAtTime(0.35 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    }
  }

  // Game over sound
  playGameOver() {
    if (this.isMuted || !this.ctx) return;
    this.resume();

    const notes = [440, 415.3, 392, 349.2, 293.7]; // Melancholic downward progression
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.22;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  // Procedural Synthwave Soundtrack Loop
  startMusic() {
    if (this.musicPlaying || this.isMuted) return;
    this.resume();
    this.musicPlaying = true;
    this.musicStep = 0;

    const intervalMs = (60 / this.musicBpm / 4) * 1000; // 16th notes
    // Bass scale: D minor (D2, F2, G2, A2, C3)
    const bassline = [
      73.42, 73.42, 0, 73.42, 87.31, 0, 73.42, 0,
      98.00, 0, 87.31, 0, 110.00, 0, 65.41, 0
    ];
    // Arp lead: D minor 9 arpeggios
    const leadNotes = [
      293.66, 0, 349.23, 0, 440.00, 0, 523.25, 0,
      587.33, 0, 523.25, 0, 440.00, 349.23, 440.00, 0
    ];

    this.musicTimer = setInterval(() => {
      if (!this.musicPlaying || !this.ctx) return;

      const step = this.musicStep % 16;
      const t = this.ctx.currentTime;

      // Bass note
      const bassFreq = bassline[step];
      if (bassFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, t);
        filter.frequency.exponentialRampToValueAtTime(150, t + 0.12);

        gain.gain.setValueAtTime(0.16 * this.musicVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.14);
      }

      // Arp Lead note
      const leadFreq = leadNotes[step];
      if (leadFreq > 0 && Math.floor(this.musicStep / 16) % 2 === 1) { // Appears every alternate 16 bars
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(leadFreq, t);

        gain.gain.setValueAtTime(0.12 * this.musicVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.16);
      }

      // Snare / Hi-hat on backbeats
      if (step === 4 || step === 12) {
        if (this.whiteNoiseBuffer) {
          const noise = this.ctx.createBufferSource();
          noise.buffer = this.whiteNoiseBuffer;
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();

          filter.type = 'highpass';
          filter.frequency.setValueAtTime(1000, t);

          gain.gain.setValueAtTime(0.1 * this.musicVolume, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          noise.start(t);
          noise.stop(t + 0.1);
        }
      }

      this.musicStep++;
    }, intervalMs);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

// Global audio singleton
window.soundManager = new SoundManager();
