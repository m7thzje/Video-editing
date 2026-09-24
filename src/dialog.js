// Dialogen met de Groningers. Droog, kort, een beetje Gronings.
// Elke keer dat je iemand aanspreekt komt de volgende zin; daarna begint het weer opnieuw.

export const NPC_LINES = {
  harm: [
    'Moi.',
    'Pakketje veur nummer 141. Dat bist doe? Een papegaai. Nou. Tekenen kan zeker nait.',
    'Ik loop hier al dattig joar. Vroeger was hier gain lift. Nou wel. Doet ie ook wel eens.',
    'Dat pakketje ligt boven op de galerij. Ik ga nait nog een keer.',
    'Doe mor gewoon, dan dooest al gek genog.',
    'Watskebeurt? Ik bin postbode, gain psycholoog.',
  ],
  geert: [
    'Moi.',
    'Bijt niks. Al sinds 1987.',
    'Vroeger zat hier nog wel eens een snoek in. Die is ook verhuisd. Naar Assen.',
    'Papegaai hè. Kinst ook vissen? Nee. Nou. Dan binnen we met zien tweeën.',
    'Kin wel.',
    'Stil. Je jaagt de vis weg. Welke vis. Precies.',
  ],
  klaas: [
    'Moi.',
    'Ik zit hier elke dag. Kieken of de Martinitoren er nog staat. Staat er nog.',
    'Die van 143? Die is altied zo. Ook toen ze jong was. Toen was ze ook al oud.',
    'Lift doet het weer? Nou. Dan ga ik morgen misschien naar beneden. Of overmorgen.',
    't Is wat.',
    'Mag ik een koekje? Nee, dat vroeg jij. Ik heb ze ook nait.',
  ],
  sjoukjeIdle: [
    'Ik studeer psychologie. Jij bent een interessant geval.',
    'Mien fiets heeft drie versnellingen. Ik gebruik er één. De rest is voor noodgevallen.',
    'Moi. Nog een rondje? Nee? Ook goed.',
  ],
  janIdle: [
    'Nou. Nou nou.',
    'Twintig joar brood voeren. Nooit bedankt. Duiven hè.',
    'Die ene met dat witte vlekje, dat is Henk. Henk deugt nait.',
  ],
  ben: [
    'OP WELK NUMMER WOON JIJ?',
    'Ik heb achtendattig joar bij de Gasunie gewerkt. Gas. Veel gas. OP WELK NUMMER WOON JIJ?',
    'Deze lift is van 1971. Net als ik. Nou ja. Ongeveer. OP WELK NUMMER WOON JIJ?',
    '141? Daar woonde vroeger een man met een hond. Of een kat. Een dier. OP WELK NUMMER WOON JIJ?',
    'Ik sta hier nait. Ik wacht. Dat is wat anders. OP WELK NUMMER WOON JIJ?',
    'Weetst wat het is met liften? Nee. Ik ook nait. OP WELK NUMMER WOON JIJ?',
  ],
  mehmet: ['Hoi.', 'Hoi.', 'Hoi.', 'Hoi.', '…Hoi.'],
  tineke: [
    'Kijk nou. Weer scheef. Die witte. Van wie is die?',
    'Twee vakken. Twéé. Voor één autootje.',
    'Ik heb de gemeente gebeld. Die zeiden: mevrouw. Verder niks.',
    'Ik heb zelf gain auto. Maar het gaat om het idee.',
    'P-UCK-141. Ik heb het opgeschreven. Voor later.',
  ],
  jumbo: [
    'Welkom bij Jumbo. Papegaaien mogen nait naar binnen. Regels.',
    'Spaar je zegels? Nee? Ik ook nait.',
    'Wij hebben alles. Behalve pistachenootjes. Die binnen op. Weet ik veel waarom.',
    'Hou dij goud.',
  ],
  basIdle: ['Plat is plat.', 'Morgen komen er weer honderd. Dozen houden nooit op.', 'Mooi werk. Nou ja. Werk.'],
  torenIdle: ['De echte is 97 meter. Deze is kleiner. Zeg het tegen niemand.', "D'Olle Grieze. Zo noemen we hem. Hij vindt het nait erg.", 'Klokluiden mag. Nait te vaak.'],
  omaIdle: ['Moi Puck! Nog een koekje? Alsjeblieft. Nait alles in één keer opeten.'],
  zuur: ['Hmpf.', 'Nou. Gefeliciteerd dan.', 'Maar niet aan mien pistachenootjes zitten.'],
};

export class Dialog {
  constructor() {
    this.el = document.getElementById('dialog');
    this.nameEl = this.el.querySelector('.dialog-name');
    this.textEl = this.el.querySelector('.dialog-text');
    this.timer = 0;
    this.index = {};
  }

  /** Volgende zin van een vaste lijst. */
  next(id) {
    const lines = NPC_LINES[id];
    const i = this.index[id] || 0;
    this.index[id] = (i + 1) % lines.length;
    return lines[i];
  }

  show(name, text, seconds = 4.5) {
    this.nameEl.textContent = name;
    this.textEl.textContent = text;
    this.el.classList.remove('hidden');
    this.el.classList.remove('pop');
    void this.el.offsetWidth;
    this.el.classList.add('pop');
    this.timer = seconds + text.length * 0.02;
  }

  hide() {
    this.el.classList.add('hidden');
    this.timer = 0;
  }

  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.hide();
    }
  }
}
