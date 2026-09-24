// Audio: laadt geluiden uit public/assets/sounds. Ontbreekt een bestand,
// dan valt het terug op een eenvoudig gesynthetiseerd placeholder-geluid.
// De AudioContext wordt pas gestart na de eerste gebruikersinteractie.

const SOUND_DIR = `${import.meta.env.BASE_URL}assets/sounds/`;
const EXTENSIONS = ['mp3', 'ogg', 'wav'];

export const SOUND_NAMES = ['nut', 'box', 'hop', 'level-complete'];

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

  play(name, { volume = 1, rate = 1 } = {}) {
    if (!this.unlocked || this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
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
    const synth = PLACEHOLDERS[name];
    if (synth) synth(this.ctx, this.master, volume);
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
  // Fanfare bij level voltooid
  'level-complete'(ctx, out, v) {
    const melody = [523, 659, 784, 1047, 784, 1047];
    melody.forEach((f, i) =>
      tone(ctx, out, { type: 'triangle', from: f, start: i * 0.13, dur: i === melody.length - 1 ? 0.5 : 0.14, vol: 0.3 * v }),
    );
  },
};
