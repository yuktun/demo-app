/**
 * Anthony's Adventure (安東尼大冒險)
 * Procedural Web Audio Chiptune Sound & Music Engine
 * 100% self-contained, no external audio files needed
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.isMuted = false;
    this.bgmVolume = 0.35;
    this.sfxVolume = 0.55;
    this.currentTrack = null;
    this.bgmTimer = null;
    this.currentStep = 0;
    this.tempo = 120;
    this.isPlayingBgm = false;
    this.unlocked = false;

    // Track definitions
    this.tracks = this.createTracks();
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmVolume;
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.unlocked = true;
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  unlock() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // Frequency conversion from note name e.g. "C4", "F#4", "A4"
  noteToFreq(note) {
    if (!note || note === '-' || note === ' ') return 0;
    const notes = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
      'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
      'A#': 10, 'Bb': 10, 'B': 11
    };
    const match = note.match(/^([A-G][#b]?)([0-8])$/);
    if (!match) return 0;
    const name = match[1];
    const octave = parseInt(match[2], 10);
    const semitone = notes[name] + (octave - 4) * 12;
    return 440 * Math.pow(2, (semitone - 9) / 12);
  }

  // Procedural SFX generators
  playSfx(name) {
    this.unlock();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    switch (name) {
      case 'select':
      case 'click': {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.setValueAtTime(800, t + 0.03);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.08);
        break;
      }

      case 'confirm': {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
      }

      case 'cancel': {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(250, t + 0.1);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.12);
        break;
      }

      case 'bump': {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.08);
        break;
      }

      case 'encounter': {
        // High-pitched retro battle swoosh
        for (let i = 0; i < 4; i++) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sawtooth';
          const startTime = t + i * 0.06;
          osc.frequency.setValueAtTime(400 + i * 200, startTime);
          osc.frequency.exponentialRampToValueAtTime(900 + i * 300, startTime + 0.05);
          g.gain.setValueAtTime(0.2, startTime);
          g.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
          osc.connect(g);
          g.connect(this.sfxGain);
          osc.start(startTime);
          osc.stop(startTime + 0.05);
        }
        break;
      }

      case 'throw': {
        // Pokeball throw sound
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
        osc.frequency.exponentialRampToValueAtTime(450, t + 0.28);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.3);
        break;
      }

      case 'shake': {
        // Capsule shake click
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.setValueAtTime(260, t + 0.04);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.08);
        break;
      }

      case 'catch': {
        // Caught jingle!
        const notes = ['G4', 'B4', 'D5', 'G5'];
        notes.forEach((n, idx) => {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'triangle';
          const startTime = t + idx * 0.1;
          osc.frequency.setValueAtTime(this.noteToFreq(n), startTime);
          g.gain.setValueAtTime(0.3, startTime);
          g.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
          osc.connect(g);
          g.connect(this.sfxGain);
          osc.start(startTime);
          osc.stop(startTime + 0.25);
        });
        break;
      }

      case 'hit': {
        // Normal attack hit
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
        g.gain.setValueAtTime(0.35, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.12);
        break;
      }

      case 'super_effective': {
        // Heavy impact
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(350, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.22);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.22);
        break;
      }

      case 'faint': {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.35);
        g.gain.setValueAtTime(0.35, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.38);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.38);
        break;
      }

      case 'level_up': {
        const fan = ['C4', 'E4', 'G4', 'C5', 'G4', 'C5'];
        const dur = 0.1;
        fan.forEach((n, idx) => {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'square';
          const startTime = t + idx * dur;
          osc.frequency.setValueAtTime(this.noteToFreq(n), startTime);
          g.gain.setValueAtTime(0.25, startTime);
          g.gain.exponentialRampToValueAtTime(0.01, startTime + dur + 0.05);
          osc.connect(g);
          g.connect(this.sfxGain);
          osc.start(startTime);
          osc.stop(startTime + dur + 0.05);
        });
        break;
      }

      case 'heal': {
        const notes = ['E4', 'G4', 'B4', 'E5'];
        notes.forEach((n, idx) => {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'triangle';
          const startTime = t + idx * 0.12;
          osc.frequency.setValueAtTime(this.noteToFreq(n), startTime);
          g.gain.setValueAtTime(0.25, startTime);
          g.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
          osc.connect(g);
          g.connect(this.sfxGain);
          osc.start(startTime);
          osc.stop(startTime + 0.3);
        });
        break;
      }

      case 'run': {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.linearRampToValueAtTime(200, t + 0.15);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
      }

      case 'text': {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(500, t);
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.03);
        break;
      }

      default:
        break;
    }
  }

  // Chiptune Music Patterns
  createTracks() {
    return {
      title: {
        tempo: 130,
        lead: [
          'C4', 'E4', 'G4', 'C5', 'B4', 'G4', 'A4', 'B4',
          'C5', 'G4', 'E4', 'F4', 'G4', 'E4', 'D4', 'G4',
          'C4', 'E4', 'G4', 'C5', 'E5', 'D5', 'C5', 'B4',
          'A4', 'C5', 'G4', 'C5', 'F4', 'E4', 'D4', 'C4'
        ],
        bass: [
          'C3', '-', 'C3', '-', 'G2', '-', 'G2', '-',
          'A2', '-', 'A2', '-', 'F2', '-', 'G2', '-',
          'C3', '-', 'E3', '-', 'G3', '-', 'E3', '-',
          'F3', '-', 'G3', '-', 'C3', '-', 'C3', '-'
        ]
      },
      town: {
        tempo: 108,
        lead: [
          'E4', 'G4', 'C5', 'B4', 'A4', 'G4', 'E4', 'F4',
          'G4', 'C4', 'D4', 'E4', 'D4', '-', 'G3', '-',
          'E4', 'G4', 'C5', 'D5', 'E5', 'D5', 'C5', 'A4',
          'G4', 'C5', 'D5', 'B4', 'C5', '-', '-', '-'
        ],
        bass: [
          'C3', 'G3', 'C3', 'G3', 'F2', 'C3', 'F2', 'C3',
          'E2', 'B2', 'E2', 'B2', 'G2', 'D3', 'G2', 'B2',
          'C3', 'G3', 'C3', 'G3', 'A2', 'E3', 'A2', 'E3',
          'F2', 'C3', 'G2', 'D3', 'C3', 'G3', 'C3', '-'
        ]
      },
      route: {
        tempo: 135,
        lead: [
          'C4', 'D4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4',
          'C4', 'E4', 'G4', 'C5', 'B4', 'A4', 'G4', '-',
          'A4', 'B4', 'C5', 'A4', 'G4', 'E4', 'C4', 'D4',
          'E4', 'G4', 'A4', 'B4', 'C5', '-', 'C5', '-'
        ],
        bass: [
          'C3', 'C3', 'G2', 'G2', 'A2', 'A2', 'F2', 'G2',
          'C3', 'C3', 'E3', 'E3', 'F3', 'F3', 'G3', 'G3',
          'F3', 'F3', 'F3', 'F3', 'C3', 'C3', 'A2', 'A2',
          'D3', 'D3', 'G2', 'G2', 'C3', 'G3', 'C3', '-'
        ]
      },
      cave: {
        tempo: 96,
        lead: [
          'D4', 'F4', 'A4', 'Ab4', 'D4', 'F4', 'Ab4', 'G4',
          'Eb4', 'G4', 'Bb4', 'A4', 'D4', 'F4', 'E4', 'C#4',
          'D4', 'F4', 'A4', 'D5', 'C#5', 'Bb4', 'A4', 'F4',
          'G4', 'Bb4', 'A4', 'F4', 'D4', '-', '-', '-'
        ],
        bass: [
          'D2', '-', 'A2', '-', 'D2', '-', 'Ab2', '-',
          'Eb2', '-', 'Bb2', '-', 'D2', '-', 'A2', '-',
          'D2', '-', 'D3', '-', 'G2', '-', 'Bb2', '-',
          'A2', '-', 'A2', '-', 'D2', 'A2', 'D2', '-'
        ]
      },
      battle: {
        tempo: 150,
        lead: [
          'E4', 'E4', 'G4', 'E4', 'A4', 'G4', 'Bb4', 'A4',
          'B4', 'B4', 'D5', 'B4', 'C5', 'B4', 'A4', 'G4',
          'E4', 'G4', 'B4', 'D5', 'E5', 'D5', 'B4', 'G4',
          'A4', 'B4', 'C5', 'D5', 'E5', 'B4', 'E4', '-'
        ],
        bass: [
          'E3', 'E2', 'E3', 'E2', 'E3', 'E2', 'E3', 'E2',
          'G3', 'G2', 'G3', 'G2', 'A3', 'A2', 'A3', 'A2',
          'E3', 'E2', 'E3', 'E2', 'C3', 'C2', 'C3', 'C2',
          'D3', 'D2', 'D3', 'D2', 'E3', 'B2', 'E3', '-'
        ]
      },
      boss: {
        tempo: 160,
        lead: [
          'A4', 'C5', 'B4', 'G#4', 'A4', 'E5', 'D5', 'C5',
          'B4', 'D5', 'C5', 'A4', 'G#4', 'B4', 'A4', 'F4',
          'E4', 'A4', 'C5', 'E5', 'F5', 'E5', 'D5', 'C5',
          'B4', 'C5', 'D5', 'B4', 'A4', '-', 'A4', '-'
        ],
        bass: [
          'A2', 'A2', 'A3', 'A2', 'F2', 'F2', 'F3', 'F2',
          'G2', 'G2', 'G3', 'G2', 'E2', 'E2', 'E3', 'E2',
          'A2', 'A2', 'C3', 'C3', 'D3', 'D3', 'F3', 'F3',
          'E3', 'E3', 'G#3', 'G#3', 'A3', 'E3', 'A2', '-'
        ]
      },
      victory: {
        tempo: 135,
        loop: false,
        lead: [
          'C4', 'E4', 'G4', 'C5', '-', 'G4', 'C5', '-',
          'D5', 'B4', 'G4', 'B4', 'C5', '-', '-', '-'
        ],
        bass: [
          'C3', '-', 'C3', '-', 'G2', '-', 'G2', '-',
          'G2', '-', 'G2', '-', 'C3', '-', '-', '-'
        ]
      },
      ending: {
        tempo: 100,
        lead: [
          'C4', 'E4', 'G4', 'C5', 'B4', 'A4', 'G4', 'E4',
          'F4', 'A4', 'C5', 'F5', 'E5', 'D5', 'C5', 'G4',
          'A4', 'C5', 'E5', 'D5', 'C5', 'B4', 'A4', 'F4',
          'G4', 'B4', 'D5', 'F5', 'E5', 'D5', 'C5', '-'
        ],
        bass: [
          'C3', 'G3', 'E3', 'G3', 'F2', 'C3', 'A2', 'C3',
          'D3', 'A3', 'F3', 'A3', 'G2', 'D3', 'B2', 'D3',
          'A2', 'E3', 'C3', 'E3', 'F2', 'C3', 'A2', 'C3',
          'G2', 'D3', 'G2', 'B2', 'C3', 'G3', 'C3', '-'
        ]
      }
    };
  }

  playBgm(trackName) {
    if (this.currentTrack === trackName && this.isPlayingBgm) return;
    this.stopBgm();

    const track = this.tracks[trackName];
    if (!track) return;

    this.currentTrack = trackName;
    this.isPlayingBgm = true;
    this.currentStep = 0;
    this.tempo = track.tempo || 120;

    const stepInterval = (60 / this.tempo / 2) * 1000; // 8th note interval

    const playStep = () => {
      if (!this.isPlayingBgm || !this.ctx) return;
      if (this.isMuted) {
        this.currentStep = (this.currentStep + 1) % track.lead.length;
        this.bgmTimer = setTimeout(playStep, stepInterval);
        return;
      }

      const t = this.ctx.currentTime;
      const stepDur = (60 / this.tempo / 2) * 0.9;

      // Play Lead voice (Square wave)
      const leadNote = track.lead[this.currentStep];
      const leadFreq = this.noteToFreq(leadNote);
      if (leadFreq > 0) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(leadFreq, t);

        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + stepDur);

        osc.connect(g);
        g.connect(this.bgmGain);
        osc.start(t);
        osc.stop(t + stepDur);
      }

      // Play Bass voice (Triangle wave)
      const bassNote = track.bass[this.currentStep];
      const bassFreq = this.noteToFreq(bassNote);
      if (bassFreq > 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(bassFreq, t);

        bGain.gain.setValueAtTime(0.24, t);
        bGain.gain.exponentialRampToValueAtTime(0.02, t + stepDur);

        bOsc.connect(bGain);
        bGain.connect(this.bgmGain);
        bOsc.start(t);
        bOsc.stop(t + stepDur);
      }

      this.currentStep++;
      if (this.currentStep >= track.lead.length) {
        if (track.loop === false) {
          this.isPlayingBgm = false;
          return;
        }
        this.currentStep = 0;
      }

      this.bgmTimer = setTimeout(playStep, stepInterval);
    };

    playStep();
  }

  stopBgm() {
    this.isPlayingBgm = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

window.AudioManager = AudioManager;
