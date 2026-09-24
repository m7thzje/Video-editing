// Audio: laadt geluiden uit public/assets/sounds. Ontbreekt een bestand,
// dan valt het terug op een eenvoudig gesynthetiseerd placeholder-geluid.
// De AudioContext wordt pas gestart na de eerste gebruikersinteractie.

const SOUND_DIR = `${import.meta.env.BASE_URL}assets/sounds/`;
const EXTENSIONS = ['mp3', 'ogg', 'wav'];

export const SOUND_NAMES = [
  'nut', 'box', 'hop', 'level-complete', 'feather', 'fries', 'secret', 'splash', 'squeak', 'star', 'door', 'checkpoint',
  'puck-praat-1', 'puck-praat-2', 'puck-praat-3', 'puck-praat-4', 'puck-praat-5', 'puck-dans', 'puck-lekker',
  'puck-geluid-1', 'puck-geluid-2', 'puck-geluid-3', 'puck-geluid-4', 'puck-geluid-5', 'puck-geluid-6', 'puck-geluid-7',
  'puck-wauw', 'puck-hallo', 'alert', 'caught',
];

// Groepen: er wordt willekeurig een geladen variant gekozen.
const GROUPS = {
  talk: ['puck-praat-1', 'puck-praat-2', 'puck-praat-3', 'puck-praat-4', 'puck-praat-5'],
  chirp: ['puck-geluid-1', 'puck-geluid-2', 'puck-geluid-3', 'puck-geluid-4', 'puck-geluid-5', 'puck-geluid-6', 'puck-geluid-7'],
};

// Ontbreekt een eigen bestand (bijv. box.mp3), gebruik dan eerst een geluidje van Puck zelf.
const FALLBACKS = {
  box: 'chirp',
  feather: 'chirp',
  star: 'puck-wauw',
  secret: 'puck-wauw',
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.buffers = new Map();
    this.unlocked = false;
    this.muted = false;
  }

  /** Aanroepen vanuit een klik/tik/toets-handler. */
  unlock() {
    if (this.unlocked) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.unlocked = true;
    SOUND_NAMES.forEach((name) => this.load(name));
  }

  async load(name) {
    for (const ext of EXTENSIONS) {
      try {
        const res = await fetch(`${SOUND_DIR}${name}.${ext}`);
        if (!res.ok) continue;
        const type = res.headers.get('content-type') || '';
        // Dev-servers geven soms index.html terug voor onbekende paden.
        if (type.includes('text/html')) continue;
        const data = await res.arrayBuffer();
        const buffer = await this.ctx.decodeAudioData(data);
        this.buffers.set(name, buffer);
        return;
      } catch {
        // volgende extensie proberen
      }
    }
    console.info(`[audio] ${name}: geen bestand gevonden, placeholder-geluid wordt gebruikt.`);
  }

  play(name, { volume = 1, rate = 1, freq } = {}) {
    if (!this.unlocked || this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.buffers.has(name) && FALLBACKS[name]) {
      const fb = FALLBACKS[name];
      if (this.buffers.has(fb) || (GROUPS[fb] || []).some((n) => this.buffers.has(n))) name = fb;
    }
    if (GROUPS[name]) {
      const loaded = GROUPS[name].filter((n) => this.buffers.has(n));
      if (loaded.length) name = loaded[Math.floor(Math.random() * loaded.length)];
    }
    const buffer = this.buffers.get(name);
    if (buffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      src.connect(gain).connect(this.master);
      src.start();
      return;
    }
    const synth = PLACEHOLDERS[name] || (name.startsWith('puck-') || name === 'chirp' ? PLACEHOLDERS.talk : null);
    if (synth) synth(this.ctx, this.master, volume, freq);
  }

  /** Stopt een lopend lang geluid (bijv. de dans). */
  playLong(name) {
    this.stopLong();
    if (!this.unlocked || this.muted || !this.ctx) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return this.play('talk');
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.master);
    src.start();
    this.long = src;
  }

  stopLong() {
    if (this.long) {
      try {
        this.long.stop();
      } catch {
        /* al gestopt */
      }
      this.long = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

// ---------- Placeholder-geluiden (Web Audio synthese) ----------

function tone(ctx, out, { type = 'sine', from, to = from, start = 0, dur = 0.15, vol = 0.3 }) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const PLACEHOLDERS = {
  // Vrolijk "pling" bij een nootje
  nut(ctx, out, v) {
    tone(ctx, out, { type: 'triangle', from: 880, to: 1320, dur: 0.12, vol: 0.35 * v });
    tone(ctx, out, { type: 'triangle', from: 1320, to: 1760, start: 0.08, dur: 0.16, vol: 0.3 * v });
  },
  // Blij papegaaien-kwetteren in de doos
  box(ctx, out, v) {
    const notes = [900, 1400, 1100, 1700, 1300];
    notes.forEach((f, i) =>
      tone(ctx, out, { type: 'square', from: f, to: f * 1.35, start: i * 0.07, dur: 0.06, vol: 0.12 * v }),
    );
  },
  // Klein "boing" bij een hop
  hop(ctx, out, v) {
    tone(ctx, out, { type: 'sine', from: 320, to: 620, dur: 0.12, vol: 0.25 * v });
  },
  feather(ctx, out, v) {
    tone(ctx, out, { type: 'sine', from: 1200, to: 1800, dur: 0.18, vol: 0.25 * v });
    tone(ctx, out, { type: 'sine', from: 1600, to: 2400, start: 0.1, dur: 0.2, vol: 0.2 * v });
  },
  fries(ctx, out, v) {
    [392, 523, 659, 784, 1047].forEach((f, i) => tone(ctx, out, { type: 'square', from: f, to: f * 1.02, start: i * 0.06, dur: 0.09, vol: 0.12 * v }));
  },
  secret(ctx, out, v) {
    [784, 988, 1175, 1568].forEach((f, i) => tone(ctx, out, { type: 'triangle', from: f, start: i * 0.09, dur: 0.2, vol: 0.22 * v }));
  },
  splash(ctx, out, v) {
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2000, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.4);
    const g = ctx.createGain();
    g.gain.value = 0.5 * v;
    src.connect(f).connect(g).connect(out);
    src.start();
  },
  squeak(ctx, out, v) {
    tone(ctx, out, { type: 'square', from: 1400, to: 900, dur: 0.12, vol: 0.12 * v });
    tone(ctx, out, { type: 'square', from: 1500, to: 1000, start: 0.15, dur: 0.12, vol: 0.12 * v });
  },
  star(ctx, out, v) {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(ctx, out, { type: 'triangle', from: f, start: i * 0.08, dur: 0.25, vol: 0.25 * v }));
  },
  door(ctx, out, v) {
    tone(ctx, out, { type: 'sine', from: 220, to: 140, dur: 0.18, vol: 0.3 * v });
  },
  checkpoint(ctx, out, v) {
    tone(ctx, out, { type: 'triangle', from: 988, to: 1319, dur: 0.12, vol: 0.25 * v });
  },
  note(ctx, out, v, freq = 660) {
    tone(ctx, out, { type: 'sine', from: freq, to: freq * 1.03, dur: 0.32, vol: 0.3 * v });
    tone(ctx, out, { type: 'triangle', from: freq * 2, dur: 0.12, vol: 0.06 * v });
  },
  talk(ctx, out, v) {
    [700, 1100, 850, 1300].forEach((f, i) => tone(ctx, out, { type: 'sawtooth', from: f, to: f * 1.2, start: i * 0.09, dur: 0.08, vol: 0.06 * v }));
  },
  // Buurvrouw vermoedt iets
  alert(ctx, out, v) {
    tone(ctx, out, { type: 'triangle', from: 520, to: 780, dur: 0.14, vol: 0.25 * v });
    tone(ctx, out, { type: 'triangle', from: 520, to: 780, start: 0.18, dur: 0.14, vol: 0.25 * v });
  },
  // Buurvrouw zet je buiten: boos "hmpf"
  caught(ctx, out, v) {
    tone(ctx, out, { type: 'sawtooth', from: 180, to: 110, dur: 0.35, vol: 0.2 * v });
    tone(ctx, out, { type: 'sawtooth', from: 150, to: 90, start: 0.35, dur: 0.4, vol: 0.2 * v });
  },
  // Fanfare bij level voltooid
  'level-complete'(ctx, out, v) {
    const melody = [523, 659, 784, 1047, 784, 1047];
    melody.forEach((f, i) =>
      tone(ctx, out, { type: 'triangle', from: f, start: i * 0.13, dur: i === melody.length - 1 ? 0.5 : 0.14, vol: 0.3 * v }),
    );
  },
};
