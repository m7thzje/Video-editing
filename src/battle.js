// Gevecht tegen Bertus de buizerd, in de stijl van een Pokémon-gevecht: beurten, HP-balken, 4 aanvallen.
// De 3D-kant (camera, uitvallen, schudden) gaat via callbacks naar main.js.

const MOVES = [
  { name: 'Fluitstoot', type: 'GELUID', power: 18, acc: 0.95, text: 'Puck fluit zo hard dat Bertus zijn veren ervan rechtop gaan staan!' },
  { name: 'Snavelpik', type: 'SNAVEL', power: 26, acc: 0.8, text: 'Puck pikt Bertus in zijn teen. Au.' },
  { name: 'Watskebeurt?!', type: 'VERWARRING', power: 0, acc: 1, text: 'Puck kijkt Bertus heel indringend aan. "Watskebeurt?!" Bertus raakt in de war.', confuse: true },
  { name: 'Pistache', type: 'ETEN', power: 0, acc: 1, heal: 32, uses: 2, text: 'Puck eet een pistache. Lekker! Puck voelt zich beter.' },
];

const FOE_MOVES = [
  { name: 'Klauwgreep', power: 16, acc: 0.9, text: 'Bertus grijpt met zijn klauwen!' },
  { name: 'Duikvlucht', power: 24, acc: 0.65, text: 'Bertus duikt van de dakrand naar beneden!' },
  { name: 'Snerpende krijs', power: 0, acc: 1, text: 'Bertus krijst. Puck schrikt zich een hoedje. Puck valt minder hard aan.', weaken: true },
  { name: 'Veer in je oog', power: 10, acc: 1, text: 'Bertus wappert een veer in Puck\'s oog. Gemeen.' },
];

const FOE_TAUNTS = [
  'Dit is MIJN dak. Ik heb er een nest. En een parkeervergunning.',
  'Papegaaien horen in een kooi. Of in een dierentuin. Of in een kooi in een dierentuin.',
  'Ik heb bij de Gasunie gewerkt. Als dak. Nou ja, óp het dak.',
];

export class Battle {
  constructor({ audio, onAttack, onHit, onEnd }) {
    this.audio = audio;
    this.onAttack = onAttack; // (who) => animatie uitval
    this.onHit = onHit; // (who) => animatie geraakt
    this.onEnd = onEnd; // (won) => afloop
    this.el = document.getElementById('battle');
    this.msg = this.el.querySelector('.bt-msg');
    this.moveBox = this.el.querySelector('.bt-moves');
    this.puckBar = this.el.querySelector('.bt-puck .bt-hp i');
    this.foeBar = this.el.querySelector('.bt-foe .bt-hp i');
    this.puckHp = this.el.querySelector('.bt-puck .bt-num');
    this.active = false;
    window.addEventListener('keydown', (e) => {
      if (!this.active || !this.waiting) return;
      const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (n >= 0) this.choose(n);
    });
  }

  start() {
    this.active = true;
    this.puck = { hp: 100, max: 100, atk: 1 };
    this.foe = { hp: 140, max: 140, confused: 0 };
    this.uses = MOVES.map((m) => m.uses ?? Infinity);
    this.el.classList.remove('hidden');
    this.render();
    this.say(['Een wilde BERTUS DE BUIZERD verschijnt!', FOE_TAUNTS[Math.floor(Math.random() * FOE_TAUNTS.length)], 'Wat doet Puck?']).then(() => this.ask());
  }

  stop() {
    this.active = false;
    this.el.classList.add('hidden');
  }

  render() {
    const pct = (v, m) => `${Math.max(0, (v / m) * 100)}%`;
    this.puckBar.style.width = pct(this.puck.hp, this.puck.max);
    this.foeBar.style.width = pct(this.foe.hp, this.foe.max);
    this.puckBar.className = this.puck.hp / this.puck.max < 0.3 ? 'low' : '';
    this.foeBar.className = this.foe.hp / this.foe.max < 0.3 ? 'low' : '';
    this.puckHp.textContent = `${Math.max(0, Math.round(this.puck.hp))} / ${this.puck.max}`;
  }

  /** Toont berichten één voor één (doorklikken of na een korte pauze). */
  async say(lines) {
    for (const l of lines) {
      this.msg.textContent = l;
      await new Promise((res) => {
        const t = setTimeout(done, Math.max(1500, l.length * 45));
        const skip = () => done();
        function done() {
          clearTimeout(t);
          window.removeEventListener('pointerdown', skip);
          res();
        }
        setTimeout(() => window.addEventListener('pointerdown', skip), 250);
      });
    }
  }

  ask() {
    if (!this.active) return;
    this.msg.textContent = 'Wat doet Puck? (1-4)';
    this.moveBox.innerHTML = MOVES.map(
      (m, i) => `<button data-i="${i}" ${this.uses[i] <= 0 ? 'disabled' : ''}><b>${i + 1}. ${m.name}</b><small>${m.type}${m.power ? ` · kracht ${m.power}` : ''}${Number.isFinite(this.uses[i]) ? ` · nog ${this.uses[i]}x` : ''}</small></button>`,
    ).join('');
    this.moveBox.querySelectorAll('button').forEach((b) =>
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.choose(Number(b.dataset.i));
      }),
    );
    this.moveBox.classList.remove('hidden');
    this.waiting = true;
  }

  async choose(i) {
    if (!this.waiting || this.uses[i] <= 0) return;
    this.waiting = false;
    this.moveBox.classList.add('hidden');
    const m = MOVES[i];
    this.uses[i]--;
    const lines = [`Puck gebruikt ${m.name.toUpperCase()}!`];
    this.onAttack('puck', m);
    if (Math.random() > m.acc) {
      lines.push('Mis! Bertus kijkt verveeld.');
      this.audio.play('splash', { volume: 0.3 });
    } else {
      lines.push(m.text);
      if (m.power) {
        const crit = Math.random() < 0.12;
        const dmg = Math.round(m.power * this.puck.atk * (0.85 + Math.random() * 0.3) * (crit ? 1.8 : 1));
        this.foe.hp -= dmg;
        this.audio.play(i === 0 ? 'whistle' : 'crunch', { freq: 1500 });
        setTimeout(() => this.onHit('foe'), 350);
        if (crit) lines.push('Een voltreffer! Recht in de veren!');
        if (m.type === 'GELUID') lines.push('Het is supereffectief! Buizerds houden niet van fluiten.');
      }
      if (m.heal) {
        this.puck.hp = Math.min(this.puck.max, this.puck.hp + m.heal);
        this.audio.play('puck-lekker');
      }
      if (m.confuse) {
        this.foe.confused = 2;
        this.audio.play('piep');
      }
    }
    await this.say(lines.slice(0, 1));
    this.render();
    await this.say(lines.slice(1));
    if (this.foe.hp <= 0) return this.finish(true);
    await this.foeTurn();
  }

  async foeTurn() {
    const m = FOE_MOVES[Math.floor(Math.random() * FOE_MOVES.length)];
    if (this.foe.confused > 0) {
      this.foe.confused--;
      if (Math.random() < 0.5) {
        this.foe.hp -= 8;
        this.render();
        await this.say(['Bertus is in de war…', 'Bertus pikt zichzelf in zijn eigen vleugel. Watskebeurt?']);
        if (this.foe.hp <= 0) return this.finish(true);
        return this.ask();
      }
    }
    const lines = [`Bertus gebruikt ${m.name.toUpperCase()}!`];
    this.onAttack('foe', m);
    if (Math.random() > m.acc) lines.push('Mis! Puck hopt opzij. Vliegen doet hij niet, hoppen wel.');
    else {
      lines.push(m.text);
      if (m.power) {
        this.puck.hp -= Math.round(m.power * (0.85 + Math.random() * 0.3));
        this.audio.play('caught', { volume: 0.5 });
        setTimeout(() => this.onHit('puck'), 350);
      }
      if (m.weaken) this.puck.atk = Math.max(0.6, this.puck.atk - 0.15);
    }
    await this.say(lines.slice(0, 1));
    this.render();
    await this.say(lines.slice(1));
    if (this.puck.hp <= 0) return this.finish(false);
    this.ask();
  }

  async finish(won) {
    this.render();
    if (won) {
      await this.say(['Bertus de buizerd is verslagen!', 'Bertus: "Pff. Ik ga wel op het provinciehuis zitten. Daar is het ook gezellig."']);
    } else {
      await this.say(['Puck is uitgeput…', 'Bertus: "Kom maar terug als je groot bent. Of een buizerd."']);
    }
    this.stop();
    this.onEnd(won);
  }
}
