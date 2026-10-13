export class Metronome {
  constructor({ createContext = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(), set = (fn, ms) => setInterval(fn, ms), clear = id => clearInterval(id), beat = () => {}, stopped = () => {}, interrupted = () => {} } = {}) {
    Object.assign(this, { createContext, set, clear, beat, stopped, interrupted }); this.generation = 0; this.nodes = new Set(); this.active = false;
  }
  async start(tempo, beats = 4) {
    this.stop(); const generation = this.generation;
    const ctx = this.createContext(); this.ctx = ctx;
    try {
      await ctx.resume();
      if (generation !== this.generation) return;
      this.active = true; this.tempo = tempo; this.beats = beats; this.index = 0; this.next = ctx.currentTime + 0.04;
      ctx.onstatechange = () => { if (ctx.state !== 'running' && this.active) { this.stop(); this.interrupted(); } };
      this.timer = this.set(() => this.schedule(), 25); this.schedule();
    } catch (error) { if (generation !== this.generation) return; this.stop(); throw error; }
  }
  schedule() {
    const ctx = this.ctx;
    if (!this.active || !ctx || ctx.state !== 'running') return;
    if (this.next < ctx.currentTime - 0.15) this.next = ctx.currentTime + 0.04;
    while (this.next < ctx.currentTime + 0.10) {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.frequency.value = this.index % this.beats === 0 ? 1000 : 700;
      gain.gain.setValueAtTime(0.16, this.next); gain.gain.exponentialRampToValueAtTime(0.001, this.next + 0.035);
      osc.connect(gain); gain.connect(ctx.destination); this.nodes.add(osc);
      osc.onended = () => { this.nodes.delete(osc); osc.disconnect(); gain.disconnect(); };
      osc.start(this.next); osc.stop(this.next + 0.045); this.beat(this.index % this.beats);
      this.index++; this.next += 60 / this.tempo;
    }
  }
  stop() {
    this.generation++; this.active = false;
    if (this.timer != null) this.clear(this.timer); this.timer = null;
    for (const node of this.nodes) { try { node.stop(); node.disconnect(); } catch {} }
    this.nodes.clear(); const ctx = this.ctx; this.ctx = null;
    if (ctx) { ctx.onstatechange = null; Promise.resolve(ctx.close()).catch(() => {}); }
    this.stopped();
  }
}
