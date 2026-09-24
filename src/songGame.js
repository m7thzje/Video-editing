// Merel-liedjes: de merel fluit een reeks tonen, Puck (jij) zingt ze na.
// Drie rondes (3, 4 en 5 tonen) = een ster. Werkt met klikken/tikken en toetsen 1-4.

const NOTES = [880, 1047, 1319, 1568];
const ROUNDS = [3, 4, 5];

export class SongGame {
  constructor({ audio, toast, onWin, onEnd }) {
    this.audio = audio;
    this.toast = toast;
    this.onWin = onWin;
    this.onEnd = onEnd;
    this.active = false;
    this.panel = document.getElementById('song-panel');
    this.title = document.getElementById('song-title');
    this.buttons = [...this.panel.querySelectorAll('[data-note]')];
    this.queue = []; // geplande "merel zingt"-stappen
    this.clock = 0;

    this.buttons.forEach((b) =>
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.press(Number(b.dataset.note));
      }),
    );
    document.getElementById('song-stop').addEventListener('click', () => this.stop());
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (n >= 0) this.press(n);
      if (e.code === 'Escape') this.stop();
    });
  }

  start() {
    this.active = true;
    this.round = 0;
    this.panel.classList.remove('hidden');
    this.toast('Luister goed naar de merel en zing het na! 🎵', 2.5);
    this.newRound(1.2);
  }

  stop(won = false) {
    this.active = false;
    this.queue = [];
    this.panel.classList.add('hidden');
    this.buttons.forEach((b) => b.classList.remove('lit'));
    if (!won) this.toast('Tot later, merel! 🐦', 1.5);
    this.onEnd();
  }

  newRound(delay = 0.8) {
    const len = ROUNDS[this.round];
    this.seq = Array.from({ length: len }, () => Math.floor(Math.random() * 4));
    this.playSequence(delay);
  }

  playSequence(delay) {
    this.listening = false;
    this.pos = 0;
    this.title.textContent = `🐦 De merel zingt… (liedje ${this.round + 1}/${ROUNDS.length})`;
    this.clock = 0;
    this.queue = this.seq.map((n, i) => ({ at: delay + i * 0.6, note: n }));
    this.queue.push({ at: delay + this.seq.length * 0.6, done: true });
  }

  light(n) {
    const b = this.buttons[n];
    b.classList.add('lit');
    setTimeout(() => b.classList.remove('lit'), 300);
  }

  press(n) {
    if (!this.active || !this.listening) return;
    this.light(n);
    this.audio.play('note', { freq: NOTES[n] * 0.75 });
    if (n !== this.seq[this.pos]) {
      this.audio.play('splash', { volume: 0.4 });
      this.toast('Oeps, verkeerde toon! De merel zingt het nog een keer.', 2);
      this.playSequence(1.4);
      return;
    }
    this.pos++;
    if (this.pos >= this.seq.length) {
      this.listening = false;
      this.round++;
      if (this.round >= ROUNDS.length) {
        this.toast('Prachtig gezongen! De merel is onder de indruk 🎶', 3);
        setTimeout(() => {
          this.stop(true);
          this.onWin();
        }, 800);
      } else {
        this.audio.play('checkpoint');
        this.toast('Goed zo! Volgend liedje…', 1.5);
        this.newRound(1.4);
      }
    }
  }

  update(dt) {
    if (!this.active || !this.queue.length) return;
    this.clock += dt;
    while (this.queue.length && this.queue[0].at <= this.clock) {
      const step = this.queue.shift();
      if (step.done) {
        this.listening = true;
        this.title.textContent = `🦜 Jouw beurt! (${this.seq.length} tonen)`;
      } else {
        this.light(step.note);
        this.audio.play('note', { freq: NOTES[step.note] });
      }
    }
  }
}
