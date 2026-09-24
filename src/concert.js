// Het fluitconcert: de finale. Puck staat op het podium op het plein en fluit mee op de beat.
// Drie banen (links, midden, rechts). Tonen vallen naar beneden; druk op het juiste moment op
// A/S/D, J/K/L of de pijltjes (of tik op de baan). Puck schuift mee naar links en rechts.
// De begeleiding (drums, bas, akkoorden) wordt hier zelf ingepland, zodat de tonen precies op de maat vallen.

const BPM = 104;
const BEAT = 60 / BPM;
const LEAD_IN = 4; // tellen aftellen
const TRAVEL = 2.0; // seconden dat een toon zichtbaar valt
const WINDOW_GOOD = 0.1;
const WINDOW_OK = 0.2;
const LANE_FREQ = [1175, 1397, 1760]; // fluittonen (D6, F6, A6)
const ROOT = 50; // D3

// Patroon per maat (8 achtsten): baan 0-2 of -1 = rust. Opbouw: rustig, dan drukker, dan het slot.
const BARS = [
  [0, -1, 1, -1, 2, -1, 1, -1],
  [0, -1, 1, -1, 2, -1, -1, -1],
  [2, -1, 1, -1, 0, -1, 1, -1],
  [0, -1, 0, -1, 2, -1, -1, -1],
  [0, 1, 2, -1, 2, 1, 0, -1],
  [1, -1, 1, 2, -1, 2, 1, -1],
  [0, -1, 2, -1, 0, -1, 2, -1],
  [1, 1, -1, 1, 0, -1, -1, -1],
  [2, 1, 0, -1, 0, 1, 2, -1],
  [1, -1, 0, 2, -1, 0, 2, -1],
  [0, 1, 2, 1, 0, 1, 2, -1],
  [1, -1, 1, -1, 1, -1, -1, -1],
];
const CHORDS = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]];

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Concert {
  constructor({ audio, onLane, onHit, onMiss, onEnd }) {
    this.audio = audio;
    this.onLane = onLane;
    this.onHit = onHit;
    this.onMiss = onMiss;
    this.onEnd = onEnd;
    this.active = false;
    this.el = document.getElementById('concert');
    this.lanes = [...this.el.querySelectorAll('.concert-lane')];
    this.scoreEl = document.getElementById('concert-score');
    this.comboEl = document.getElementById('concert-combo');
    this.judgeEl = document.getElementById('concert-judge');
    this.countEl = document.getElementById('concert-count');
    this.lanes.forEach((l, i) =>
      l.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.press(i);
      }),
    );
    const keys = [
      ['KeyA', 'KeyJ', 'ArrowLeft'],
      ['KeyS', 'KeyK', 'ArrowDown', 'ArrowUp'],
      ['KeyD', 'KeyL', 'ArrowRight'],
    ];
    window.addEventListener('keydown', (e) => {
      if (!this.active || e.repeat) return;
      const lane = keys.findIndex((k) => k.includes(e.code));
      if (lane >= 0) {
        e.preventDefault();
        this.press(lane);
      }
    });
  }

  now() {
    const ctx = this.audio.ctx;
    return ctx ? ctx.currentTime - this.t0 : (performance.now() / 1000) - this.t0;
  }

  start() {
    const ctx = this.audio.ctx;
    this.t0 = (ctx ? ctx.currentTime : performance.now() / 1000) + 0.3;
    this.notes = [];
    BARS.forEach((bar, b) =>
      bar.forEach((lane, i) => {
        if (lane >= 0) this.notes.push({ t: (LEAD_IN + b * 4 + i / 2) * BEAT, lane, state: 0, el: null });
      }),
    );
    this.end = (LEAD_IN + BARS.length * 4 + 2) * BEAT;
    this.hits = 0;
    this.score = 0;
    this.combo = 0;
    this.best = 0;
    this.scheduled = 0; // tot en met welke tel de begeleiding is ingepland
    this.lane = 1;
    this.active = true;
    this.lastCount = null;
    this.el.classList.remove('hidden');
    this.lanes.forEach((l) => l.querySelectorAll('.concert-note').forEach((n) => n.remove()));
    this.judgeEl.textContent = '';
    this.updateHud();
  }

  stop() {
    this.active = false;
    this.el.classList.add('hidden');
    this.notes?.forEach((n) => n.el?.remove());
  }

  get accuracy() {
    return this.notes.length ? this.score / this.notes.length : 0;
  }

  updateHud() {
    this.scoreEl.textContent = `${Math.round(this.accuracy * 100)}%`;
    this.comboEl.textContent = this.combo >= 3 ? `${this.combo}x reeks!` : '';
  }

  judge(text, cls) {
    this.judgeEl.textContent = text;
    this.judgeEl.className = cls;
    void this.judgeEl.offsetWidth;
    this.judgeEl.classList.add('pop');
  }

  press(lane) {
    if (!this.active) return;
    this.lane = lane;
    this.onLane(lane);
    const lit = this.lanes[lane];
    lit.classList.add('lit');
    setTimeout(() => lit.classList.remove('lit'), 120);
    const t = this.now();
    let best = null;
    for (const n of this.notes) {
      if (n.state || n.lane !== lane) continue;
      const d = Math.abs(n.t - t);
      if (d < WINDOW_OK && (!best || d < Math.abs(best.t - t))) best = n;
    }
    if (!best) {
      // Mis-tik: zacht piepje, geen straf behalve de reeks
      this.audio.play('whistle', { freq: LANE_FREQ[lane] * 0.94, volume: 0.35 });
      this.combo = 0;
      this.updateHud();
      return;
    }
    const good = Math.abs(best.t - t) < WINDOW_GOOD;
    best.state = 1;
    best.el?.classList.add('hit');
    this.hits++;
    this.score += good ? 1 : 0.7;
    this.combo++;
    this.best = Math.max(this.best, this.combo);
    this.audio.play('whistle', { freq: LANE_FREQ[lane], volume: 0.9 });
    this.judge(good ? 'Prachtig!' : 'Goed!', good ? 'great' : 'good');
    this.onHit(lane, this.combo, good);
    this.updateHud();
  }

  scheduleBacking(until) {
    const ctx = this.audio.ctx;
    if (!ctx || this.audio.muted) return;
    const out = this.audio.musicOut;
    while (this.scheduled * BEAT < until) {
      const beat = this.scheduled++;
      const time = this.t0 + beat * BEAT;
      if (time < ctx.currentTime) continue;
      if (beat < LEAD_IN) {
        this.click(time, beat === 0 ? 1320 : 990);
        continue;
      }
      const b = beat - LEAD_IN;
      if (b >= BARS.length * 4) {
        if (b === BARS.length * 4) this.chord(time, [0, 4, 7, 12], BEAT * 3, out);
        continue;
      }
      this.kick(time, out);
      if (b % 2 === 1) this.snare(time, out);
      this.hat(time + BEAT / 2, out);
      const chord = CHORDS[Math.floor(b / 4) % 4];
      this.bass(time, midi(ROOT + chord[0] - 12 + (b % 2 ? 12 : 0)), out);
      if (b % 4 === 0) this.chord(time, chord, BEAT * 4, out);
    }
  }

  click(time, f) {
    const ctx = this.audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.15, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    o.connect(g).connect(this.audio.sfxOut);
    o.start(time);
    o.stop(time + 0.1);
  }

  kick(time, out) {
    const ctx = this.audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, time);
    o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    g.gain.setValueAtTime(0.9, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    o.connect(g).connect(out);
    o.start(time);
    o.stop(time + 0.22);
  }

  noise(time, dur, freq, vol, out) {
    const ctx = this.audio.ctx;
    if (!this.noiseBuf) {
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(f).connect(g).connect(out);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  snare(time, out) {
    this.noise(time, 0.16, 1500, 0.45, out);
  }

  hat(time, out) {
    this.noise(time, 0.04, 7000, 0.18, out);
  }

  bass(time, f, out) {
    const ctx = this.audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.35, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + BEAT * 0.9);
    o.connect(g).connect(out);
    o.start(time);
    o.stop(time + BEAT);
  }

  chord(time, notes, dur, out) {
    const ctx = this.audio.ctx;
    notes.forEach((n) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = midi(ROOT + 12 + n);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(0.06, time + 0.08);
      g.gain.linearRampToValueAtTime(0.0001, time + dur);
      o.connect(g).connect(out);
      o.start(time);
      o.stop(time + dur + 0.05);
    });
  }

  update() {
    if (!this.active) return;
    const t = this.now();
    this.scheduleBacking(t + 0.5);
    // Aftellen
    const beat = Math.floor(t / BEAT);
    const count = t < 0 ? '' : beat < LEAD_IN ? String(LEAD_IN - beat) : '';
    if (count !== this.lastCount) {
      this.lastCount = count;
      this.countEl.textContent = count;
      this.countEl.classList.toggle('hidden', !count);
    }
    for (const n of this.notes) {
      const dt = n.t - t;
      if (!n.el && dt < TRAVEL && !n.state) {
        n.el = document.createElement('div');
        n.el.className = 'concert-note';
        n.el.textContent = '♪';
        this.lanes[n.lane].appendChild(n.el);
      }
      if (n.el) {
        // 0 = bovenaan, 1 = op de lijn
        const k = 1 - dt / TRAVEL;
        n.el.style.top = `calc(${(k * 82).toFixed(2)}% - 22px)`;
        if (n.state === 1 || k > 1.25) {
          if (!n.state) this.missNote(n);
          if (!n.fade) {
            n.fade = true;
            const el = n.el;
            setTimeout(() => el.remove(), 250);
          }
        }
      }
      if (!n.state && dt < -WINDOW_OK) this.missNote(n);
    }
    if (t > this.end) {
      this.stop();
      this.onEnd(this.accuracy, this.best);
    }
  }

  missNote(n) {
    if (n.state) return;
    n.state = 2;
    n.el?.classList.add('miss');
    this.combo = 0;
    this.judge('Mis', 'miss');
    this.onMiss();
    this.updateHud();
  }
}
