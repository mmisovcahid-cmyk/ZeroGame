// Prosedürel ses motoru — harici ses dosyası yok, her şey Web Audio ile üretilir.
export class AudioSys {
  constructor(settings) {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.musicOn = false;
    this.step = 0;
    this.nextT = 0;
    this.tempo = 104;
    this.setVolume(settings.sound / 100);
  }

  setVolume(v) {
    this.vol = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.vol ?? 0.7;
    this.master.connect(this.ctx.destination);
    // gürültü tamponu (patlama/rıhtım için)
    const len = this.ctx.sampleRate * 1.2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  _osc(type, f0, f1, t, dur, vol, dest) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(t, dur, vol, filterFrom, filterTo) {
    if (!this.ctx) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filterFrom, t);
    f.frequency.exponentialRampToValueAtTime(filterTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  _now() { return this.ctx ? this.ctx.currentTime : 0; }

  shoot()   { const t = this._now(); this._osc('square', 900, 240, t, 0.09, 0.12); this._osc('sawtooth', 1400, 400, t, 0.06, 0.05); }
  coin()    { const t = this._now(); this._osc('sine', 1240, null, t, 0.07, 0.14); this._osc('sine', 1860, null, t + 0.06, 0.12, 0.13); }
  jump()    { const t = this._now(); this._osc('sine', 260, 640, t, 0.16, 0.16); }
  slide()   { const t = this._now(); this._noise(t, 0.28, 0.14, 2600, 300); }
  hit()     { const t = this._now(); this._osc('sawtooth', 130, 40, t, 0.3, 0.3); this._noise(t, 0.25, 0.28, 900, 120); }
  explode() { const t = this._now(); this._noise(t, 0.5, 0.4, 2400, 90); this._osc('sawtooth', 90, 30, t, 0.4, 0.24); }
  power()   { const t = this._now(); [520, 780, 1160].forEach((f, i) => this._osc('sine', f, null, t + i * 0.07, 0.12, 0.14)); }
  bossHorn(){ const t = this._now(); this._osc('sawtooth', 78, 62, t, 0.7, 0.3); this._osc('sawtooth', 117, 92, t, 0.7, 0.22); this._noise(t, 0.6, 0.1, 500, 100); }
  laserHit(){ const t = this._now(); this._osc('triangle', 700, 180, t, 0.08, 0.09); }
  orb()     { const t = this._now(); this._osc('sawtooth', 210, 160, t, 0.22, 0.09); }
  way()     { const t = this._now(); this._osc('sine', 340, 900, t, 0.12, 0.1); }

  // ---- müzik ----
  startMusic() {
    if (!this.ctx) return;
    this.musicOn = true;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.1;
  }
  stopMusic() { this.musicOn = false; }

  update(speed) {
    if (!this.ctx || !this.musicOn) return;
    this.tempo = Math.min(172, 100 + speed * 1.8);
    const stepDur = 60 / this.tempo / 2; // 8'lik nota
    const t0 = this.ctx.currentTime;
    if (this.nextT < t0) this.nextT = t0 + 0.05;
    while (this.nextT < t0 + 0.18) {
      this._scheduleStep(this.nextT);
      this.nextT += stepDur;
    }
  }

  _scheduleStep(t) {
    const s = this.step % 32;
    const roots = [55, 55, 65.4, 49]; // A1 A1 C2 G1
    const root = roots[Math.floor(s / 8) % 4];
    if (s % 8 === 0) { // bas
      this._osc('triangle', root, null, t, 0.24, 0.22);
      this._osc('sine', root * 2, null, t, 0.2, 0.1);
    }
    if (s % 4 === 2) this._noise(t, 0.04, 0.05, 8000, 6000); // hi-hat
    if (s % 8 === 4) this._osc('square', root * 2, root * 2, t, 0.1, 0.05);
    // arp melodi
    const arp = [0, 7, 12, 7, 10, 7, 12, 15];
    if (s % 2 === 0) {
      const n = arp[(s / 2) % 8];
      const f = root * 4 * Math.pow(2, n / 12);
      this._osc('sawtooth', f, f, t, 0.09, 0.028);
    }
    this.step++;
  }
}
