import * as THREE from 'three';
import { vuurdraakCardTexture } from './textures.js';
import { mergeStatic } from './world/optimize.js';

// Puck: een grijze roodstaart papegaai (Psittacus erithacus), naar de foto:
// lichtgrijze geschubde kop, donkerder rug en vleugels, witte oogvlekken met een
// lichtgele iris, grote zwarte kromsnavel, rode spikkels op de buik en een knalrode staart.
// Lokale voorkant is +Z, voeten staan op y = 0.

/** Geschubde verentextuur: lichte boogjes op grijs. */
function scaleTexture(base, edge) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  for (let y = 0; y < 72; y += 8) {
    for (let x = (y / 8) % 2 ? 0 : 5; x < 72; x += 10) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/**
 * Echte veertjes: rijen overlappende, afgeronde veren (van onder naar boven getekend, zodat ze als
 * dakpannen over elkaar vallen), elk met een donker hart en een lichte rand.
 * red: kans op een rood veertje per plek, als functie van (u, v) (0..1), voor de buik.
 */
function featherTexture(base, rim, { w = 256, h = 256, size = 14, red = null, repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rowH = size * 0.62;
  for (let y = h + size; y > -size; y -= rowH) {
    const row = Math.round(y / rowH);
    for (let x = (row % 2) * size * 0.5 - size; x < w + size; x += size) {
      const isRed = red && rnd() < red(x / w, 1 - y / h);
      const jitter = (rnd() - 0.5) * 3;
      const cx = x + jitter;
      const cy = y + jitter * 0.5;
      const rw = size * 0.62;
      const rh = size * 0.85;
      // Veertje: halve ellips naar beneden, met verloop van donker (midden) naar licht (rand)
      const g = ctx.createRadialGradient(cx, cy - rh * 0.3, 1, cx, cy, rh);
      if (isRed) {
        g.addColorStop(0, '#9e1320');
        g.addColorStop(0.7, '#d9283a');
        g.addColorStop(1, '#f25a5a');
      } else {
        g.addColorStop(0, shade(base, -22));
        g.addColorStop(0.75, base);
        g.addColorStop(1, rim);
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI);
      ctx.lineTo(cx - rw, cy - rh * 0.4);
      ctx.lineTo(cx + rw, cy - rh * 0.4);
      ctx.fill();
      // Lichte zoom onderaan en een schachtje in het midden
      ctx.strokeStyle = isRed ? 'rgba(255,170,160,0.9)' : rim;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rw - 0.7, rh - 0.7, 0, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
      ctx.strokeStyle = isRed ? 'rgba(120,10,20,0.35)' : 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy - rh * 0.3);
      ctx.lineTo(cx, cy + rh * 0.7);
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  return t;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v) => Math.max(0, Math.min(255, v));
  const r = cl((n >> 16) + amt);
  const g = cl(((n >> 8) & 255) + amt);
  const b = cl((n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
const smooth = (map) => new THREE.MeshLambertMaterial({ color: 0xffffff, map });

const MATERIALS = {
  body: smooth(featherTexture('#8e959b', '#c4c9cd', { size: 16, repeat: [2, 1] })),
  head: smooth(featherTexture('#a9afb4', '#dde0e2', { size: 11, repeat: [2, 1] })),
  // Buik: grijze veertjes met hier en daar een rood veertje, vooral onderaan de voorkant (zoals bij Puck)
  belly: smooth(featherTexture('#9ca2a7', '#cfd3d6', {
    w: 512,
    size: 15,
    red: (u, v) => {
      const front = Math.max(0, 1 - Math.abs(u - 0.25) / 0.2);
      const low = Math.max(0, (0.55 - v) / 0.4);
      return Math.min(0.75, front * low * 0.9);
    },
  })),
  wing: smooth(featherTexture('#6f777e', '#a3aab0', { size: 20, repeat: [2, 1] })),
  primaries: mat(0x5a5f64),
  face: mat(0xf4f2ed),
  beak: mat(0x1b1b1d),
  iris: mat(0xf1dc86),
  eye: mat(0x0d0d0d),
  eyeShine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  tail: mat(0xe11d2b),
  speckle: mat(0xee7a64),
  legs: mat(0x7d8288),
  claw: mat(0x2a2a2c),
  rump: mat(0xffffff, { map: scaleTexture('#c3c8cc', '#e0e3e5') }),
  hatRed: mat(0xd7263d),
  hatWhite: mat(0xfaf3e8),
  gold: mat(0xf2c230, { emissive: 0x8a5a00, emissiveIntensity: 0.4 }),
};

const ball = (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail);
const sphere = (r) => new THREE.SphereGeometry(r, 24, 16);

export class Puck {
  constructor() {
    this.root = new THREE.Group(); // positie + draaiing (wordt door de controller gezet)
    this.rig = new THREE.Group(); // animatie-offsets (bob, waggel, squash)
    this.root.add(this.rig);

    this.walkPhase = 0;
    this.idleTime = 0;
    this.squash = 0; // >0 net geland
    this.happy = 0; // >0 blij (in doos / nootje)
    this.stillTime = 0; // hoe lang Puck al stilstaat
    this.fluffing = 0; // >0 veren opzetten
    this.peering = 0; // >0 diep voorover buigen en knikken (zoals op de zitstok)
    this.gripPrev = 0;
    this.eating = 0; // >0 eten met het pootje vastgehouden
    this.hats = {};
    this.build();
  }

  build() {
    const { rig } = this;
    const add = (parent, geo, material, pos, scale, rot) => {
      const m = new THREE.Mesh(geo, material);
      if (pos) m.position.set(...pos);
      if (scale) m.scale.set(...scale);
      if (rot) m.rotation.set(...rot);
      m.castShadow = true;
      parent.add(m);
      return m;
    };

    // Lijf
    this.body = new THREE.Group();
    this.body.position.y = 0.16;
    rig.add(this.body);
    add(this.body, sphere(0.1), MATERIALS.body, [0, 0, -0.01], [1, 1.25, 1.05], [0.25, 0, 0]);
    add(this.body, sphere(0.086), MATERIALS.belly, [0, -0.01, 0.035], [0.92, 1.15, 0.75]);
    // Lichte stuit boven de staart (typisch voor een grijze roodstaart)
    add(this.body, ball(0.05, 1), MATERIALS.rump, [0, -0.07, -0.07], [1.1, 0.7, 0.8]);
    // Rode spikkels op buik en dijen (zoals bij Puck op de foto)
    // (De rode veertjes zitten nu als echte veertjes in de buiktextuur)

    // Staart: rode waaier met donkere dekveren erboven
    this.tail = new THREE.Group();
    this.tail.position.set(0, -0.075, -0.075);
    this.body.add(this.tail);
    // Losse staartveren met afgeronde punt, als een waaier
    const featherGeo = new THREE.SphereGeometry(1, 8, 4);
    featherGeo.scale(0.02, 0.006, 0.08);
    featherGeo.translate(0, 0, -0.075);
    [-0.42, -0.25, -0.08, 0.08, 0.25, 0.42].forEach((spread, i) => {
      add(this.tail, featherGeo, MATERIALS.tail, [spread * 0.05, (i % 2) * 0.004, 0], null, [-0.55, spread, 0]);
    });
    add(this.tail, ball(0.045, 0), MATERIALS.tail, [0, -0.005, 0.005], [1, 0.6, 1.2]);
    add(this.tail, ball(0.05, 0), MATERIALS.wing, [0, 0.03, 0.03], [0.9, 0.5, 1.1]);

    // Vleugels met donkere slagpennen
    this.wings = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.085, 0.05, -0.01);
      add(pivot, sphere(0.075), MATERIALS.wing, [side * 0.012, -0.055, -0.02], [0.36, 1.2, 1], [0.35, 0, 0]);
      // Donkere slagpennen in een waaiertje naar achteren
      const pf = new THREE.SphereGeometry(1, 6, 4);
      pf.scale(0.012, 0.022, 0.05);
      for (let i = 0; i < 4; i++) {
        add(pivot, pf, MATERIALS.primaries, [side * (0.012 - i * 0.003), -0.095 - i * 0.006, -0.06 - i * 0.004], null, [0.75 + i * 0.1, 0, side * 0.12]);
      }
      pivot.userData.side = side;
      this.body.add(pivot);
      return pivot;
    });

    // Kop
    this.head = new THREE.Group();
    this.head.position.set(0, 0.128, 0.035);
    this.headBase = this.head.position.clone();
    this.body.add(this.head);
    add(this.head, sphere(0.078), MATERIALS.head, null, [1, 0.97, 1.02]);

    // Witte naakte huid rond de ogen, lichtgele iris, zwarte pupil
    [-1, 1].forEach((side) => {
      add(this.head, ball(0.036, 1), MATERIALS.face, [side * 0.057, 0.004, 0.038], [0.5, 0.95, 1.25]);
      add(this.head, new THREE.CylinderGeometry(0.014, 0.014, 0.006, 10), MATERIALS.iris, [side * 0.073, 0.01, 0.044], null, [0, 0, Math.PI / 2]);
      add(this.head, new THREE.CylinderGeometry(0.0075, 0.0075, 0.008, 8), MATERIALS.eye, [side * 0.0755, 0.01, 0.045], null, [0, 0, Math.PI / 2]);
      add(this.head, ball(0.003, 0), MATERIALS.eyeShine, [side * 0.078, 0.015, 0.049]);
    });

    // Grote zwarte kromme snavel
    const upper = new THREE.Group();
    upper.position.set(0, -0.005, 0.07);
    this.head.add(upper);
    add(upper, ball(0.03, 1), MATERIALS.beak, [0, 0, 0.005], [0.85, 0.9, 1.1]);
    add(upper, new THREE.ConeGeometry(0.022, 0.06, 7), MATERIALS.beak, [0, -0.028, 0.026], null, [Math.PI - 0.5, 0, 0]);
    add(this.head, ball(0.021, 1), MATERIALS.beak, [0, -0.04, 0.068], [0.95, 0.65, 1.0]);

    // Pootjes
    this.legs = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.04, 0.075, 0.01);
      add(pivot, new THREE.CylinderGeometry(0.011, 0.013, 0.07, 7), MATERIALS.legs, [0, -0.035, 0]);
      // Papegaaienvoet: twee tenen naar voren, twee naar achteren, met donkere nageltjes
      const toe = new THREE.CapsuleGeometry(0.0065, 0.03, 2, 6);
      toe.rotateX(Math.PI / 2);
      [[-0.35, 1], [0.35, 1], [-0.45, -1], [0.45, -1]].forEach(([spread, dir]) => {
        const t = new THREE.Group();
        t.position.set(0, -0.068, 0);
        t.rotation.y = spread + (dir < 0 ? Math.PI : 0);
        pivot.add(t);
        add(t, toe, MATERIALS.legs, [0, 0, 0.02]);
        add(t, new THREE.ConeGeometry(0.005, 0.012, 5), MATERIALS.claw, [0, -0.003, 0.041], null, [Math.PI / 2 + 0.6, 0, 0]);
      });
      rig.add(pivot);
      return pivot;
    });
    this.legBase = this.legs[0].position.clone();
    // Hapje dat Puck in zijn pootje vasthoudt tijdens het eten
    this.snack = add(this.legs[0], new THREE.IcosahedronGeometry(0.022, 0), new THREE.MeshLambertMaterial({ color: 0xd9b36b, flatShading: true }), [0, -0.075, 0.035]);
    this.snack.visible = false;

    // Hoedjes (easter eggs): kaboutermuts en kroon
    const gnome = new THREE.Group();
    add(gnome, new THREE.ConeGeometry(0.05, 0.13, 8), MATERIALS.hatRed, [0, 0.12, -0.01], null, [-0.25, 0, 0]);
    add(gnome, new THREE.TorusGeometry(0.048, 0.012, 5, 10), MATERIALS.hatWhite, [0, 0.062, 0], null, [Math.PI / 2 + 0.2, 0, 0]);
    const crown = new THREE.Group();
    add(crown, new THREE.CylinderGeometry(0.045, 0.045, 0.035, 8, 1, true), MATERIALS.gold, [0, 0.085, 0]);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      add(crown, new THREE.ConeGeometry(0.012, 0.035, 4), MATERIALS.gold, [Math.cos(a) * 0.042, 0.115, Math.sin(a) * 0.042]);
    }
    // Hoedjes uit de kringloop
    const pet = new THREE.Group();
    add(pet, new THREE.SphereGeometry(0.068, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffd200), [0, 0.045, -0.005]);
    add(pet, new THREE.CylinderGeometry(0.055, 0.055, 0.008, 12, 1, false, -Math.PI / 2, Math.PI), mat(0xffd200), [0, 0.05, 0.045], [1, 1, 0.9]);
    const shades = new THREE.Group();
    [-1, 1].forEach((s) => add(shades, new THREE.CylinderGeometry(0.02, 0.02, 0.006, 12), mat(0x111111), [s * 0.074, 0.012, 0.046], null, [0, 0, Math.PI / 2]));
    add(shades, new THREE.BoxGeometry(0.14, 0.006, 0.006), mat(0x111111), [0, 0.03, 0.05]);
    const chef = new THREE.Group();
    add(chef, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), MATERIALS.hatWhite, [0, 0.085, 0]);
    add(chef, new THREE.SphereGeometry(0.068, 12, 8), MATERIALS.hatWhite, [0, 0.13, 0], [1, 0.7, 1]);
    const party = new THREE.Group();
    add(party, new THREE.ConeGeometry(0.04, 0.12, 12), mat(0xe86fb4), [0.02, 0.12, 0], null, [0, 0, -0.2]);
    add(party, new THREE.SphereGeometry(0.014, 8, 6), mat(0xffd84a), [0.033, 0.18, 0]);
    this.hats = { kabouter: gnome, kroon: crown, pet, zonnebril: shades, koksmuts: chef, feesthoed: party };
    Object.values(this.hats).forEach((h) => {
      h.visible = false;
      this.head.add(h);
    });

    // Dingen in de snavel (easter eggs): een sigaretje (grapje!) of een zeldzaam kaartje
    const cig = new THREE.Group();
    add(cig, new THREE.CylinderGeometry(0.007, 0.007, 0.1, 6), MATERIALS.hatWhite, [0, 0, 0.05], null, [Math.PI / 2, 0, 0]);
    add(cig, new THREE.CylinderGeometry(0.0072, 0.0072, 0.03, 6), mat(0xe0a24a), [0, 0, 0.005], null, [Math.PI / 2, 0, 0]);
    cig.position.set(0.035, -0.045, 0.085);
    cig.rotation.y = 0.9;
    const card = new THREE.Group();
    const cardTex = vuurdraakCardTexture();
    add(card, new THREE.BoxGeometry(0.075, 0.105, 0.003), [MATERIALS.gold, MATERIALS.gold, MATERIALS.gold, MATERIALS.gold, mat(0xffffff, { map: cardTex }), mat(0xffffff, { map: cardTex })], [0.03, -0.075, 0.105]);
    card.rotation.y = 1.2;
    // Zak pistachenoten uit de Jumbo
    const zak = new THREE.Group();
    add(zak, new THREE.BoxGeometry(0.06, 0.075, 0.03), mat(0x3f8f3a), [0, -0.075, 0.1]);
    add(zak, new THREE.BoxGeometry(0.062, 0.02, 0.032), mat(0xffd200), [0, -0.05, 0.1]);
    this.beakItems = { sigaret: cig, kaart: card, zak };
    Object.values(this.beakItems).forEach((b) => {
      b.visible = false;
      this.head.add(b);
    });
    this.dancing = 0;

    // Prestaties: onderdelen per bewegend deel samenvoegen (hoedjes, snavel-items en het hapje blijven los)
    [...Object.values(this.hats), ...Object.values(this.beakItems), this.snack].forEach((o) => (o.userData.dynamic = true));
    [this.head, this.tail, ...this.wings, ...this.legs].forEach((part) => {
      mergeStatic(part);
      part.userData.dynamic = true;
    });
    mergeStatic(this.body);

    // Gloed voor patat-power
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,230,120,0.9)');
    g.addColorStop(1, 'rgba(255,200,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    this.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
    this.aura.scale.setScalar(0.7);
    this.aura.position.y = 0.18;
    this.aura.visible = false;
    this.root.add(this.aura);
  }

  setBeakItem(name) {
    Object.entries(this.beakItems).forEach(([k, b]) => (b.visible = k === name));
  }

  dance(seconds = 8) {
    this.dancing = seconds;
  }

  setHat(name) {
    Object.entries(this.hats).forEach(([k, h]) => (h.visible = k === name));
  }

  setPower(amount, time) {
    this.aura.visible = amount > 0;
    if (amount > 0) {
      this.aura.material.opacity = 0.55 + Math.sin(time * 12) * 0.2;
      this.aura.scale.setScalar(0.65 + Math.sin(time * 6) * 0.08);
    }
  }

  /**
   * @param {number} dt
   * @param {{speed:number, grounded:boolean, climbing:boolean, vy:number}} s
   */
  update(dt, s) {
    const moving = Math.min(s.speed / 1.6, 1);
    const air = !s.grounded && !s.climbing;
    this.idleTime += dt;
    this.happy = Math.max(0, this.happy - dt);
    this.squash = Math.max(0, this.squash - dt * 4);

    if (s.climbing) {
      this.walkPhase += dt * 16;
    } else if (!air) {
      this.walkPhase += dt * (4 + s.speed * 9);
    }
    const sin = Math.sin(this.walkPhase);

    // Waggelen en wippen tijdens lopen
    const walkAmt = s.climbing ? 0.6 : air ? 0 : moving;
    this.rig.rotation.z = sin * 0.14 * walkAmt;
    this.rig.position.y = Math.abs(Math.cos(this.walkPhase)) * 0.018 * walkAmt;

    // Lichaamshouding
    let pitch = 0.05 * moving;
    if (s.climbing) pitch = 0.45; // tegen de wand aan hangen
    if (air) pitch = THREE.MathUtils.clamp(-s.vy * 0.12, -0.3, 0.3);
    this.rig.rotation.x = THREE.MathUtils.lerp(this.rig.rotation.x, pitch, 1 - Math.exp(-dt * 12));

    // Squash & stretch
    let sy = 1;
    if (air) sy = 1 + THREE.MathUtils.clamp(Math.abs(s.vy) * 0.04, 0, 0.12);
    sy -= this.squash * 0.25;
    const sxz = 1 / Math.sqrt(sy);
    this.rig.scale.set(sxz, sy, sxz);

    // Pootjes
    this.legs[0].rotation.x = air ? 0.5 : sin * 0.7 * walkAmt;
    this.legs[1].rotation.x = air ? 0.5 : -sin * 0.7 * walkAmt;

    // Vleugels: tegen het lijf, klapperen in de lucht / bij klimmen / blij
    const flap = air ? 1 : s.climbing ? 0.35 : this.happy > 0 ? 0.8 : 0;
    const t = this.idleTime;
    this.wings.forEach((w) => {
      const side = w.userData.side;
      const open = flap * (0.6 + Math.sin(t * 28) * 0.5);
      w.rotation.z = THREE.MathUtils.lerp(w.rotation.z, side * open, 1 - Math.exp(-dt * 20));
    });

    // Staart wipt mee
    this.tail.rotation.x = Math.sin(this.walkPhase * 2) * 0.12 * walkAmt + (air ? -0.25 : 0);

    // Kop: nieuwsgierig schuin houden als hij stilstaat
    const idle = moving < 0.1 && !air && !s.climbing;
    const tilt = idle ? Math.sin(t * 0.9) * 0.35 * Math.max(0, Math.sin(t * 0.37)) : 0;
    const bob = this.happy > 0 ? Math.sin(t * 20) * 0.25 : 0;
    this.head.rotation.z = THREE.MathUtils.lerp(this.head.rotation.z, tilt, 1 - Math.exp(-dt * 6));
    this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, bob + (s.climbing ? -0.4 : 0), 1 - Math.exp(-dt * 10));

    // Snavelklimmen: de snavel is een derde poot. Kop reikt omhoog, grijpt, en trekt het lijf op.
    if (s.climbing) {
      const c = this.walkPhase * 0.5;
      const reach = Math.max(0, Math.sin(c));
      // Moment dat de snavel grijpt: tikje
      const grip = Math.sin(c) > 0.95 ? 1 : 0;
      if (grip && !this.gripPrev && this.onGrip) this.onGrip();
      this.gripPrev = grip;
      this.head.rotation.x = -0.9 * reach + 0.35 * (1 - reach);
      this.head.position.z = this.headBase.z + 0.02 * reach;
      this.rig.position.y += Math.max(0, -Math.sin(c)) * 0.025;
      this.legs[0].rotation.x = -0.6 + Math.sin(c) * 0.5;
      this.legs[1].rotation.x = -0.6 - Math.sin(c) * 0.5;
    } else {
      this.head.position.z += (this.headBase.z - this.head.position.z) * Math.min(1, dt * 10);
    }

    // Veren opzetten: na een tijdje stilstaan schudt Puck zich even helemaal pluizig
    this.stillTime = idle ? this.stillTime + dt : 0;
    if (idle && this.fluffing <= 0 && this.stillTime > 4 && Math.random() < dt * 0.6) this.fluffing = 1.4;
    if (this.fluffing > 0) {
      this.fluffing -= dt;
      const k = Math.sin(Math.min(1, (1.4 - this.fluffing) / 1.4) * Math.PI);
      const f = 1 + 0.2 * k;
      this.body.scale.set(f, 1 + 0.08 * k, f);
      this.head.scale.setScalar(1 + 0.12 * k);
      this.rig.rotation.z += Math.sin(t * 45) * 0.06 * k;
      this.tail.rotation.y = Math.sin(t * 30) * 0.3 * k;
      // Aan het eind een flinke schudbeweging met de kop, zoals in het filmpje
      const shake = this.fluffing < 0.6 ? Math.sin((this.fluffing / 0.6) * Math.PI) : 0;
      this.head.rotation.y = Math.sin(t * 48) * 0.55 * shake;
      this.wings.forEach((w) => (w.rotation.z = w.userData.side * 0.25 * k));
      if (this.fluffing <= 0) {
        this.body.scale.set(1, 1, 1);
        this.head.scale.setScalar(1);
        this.head.rotation.y = 0;
        this.tail.rotation.y = 0;
        this.stillTime = 0;
      }
    }

    // Voorover buigen en knikken: kop laag, nieuwsgierig op en neer (zoals op de zitstok bij het raam)
    if (idle && this.peering <= 0 && this.fluffing <= 0 && this.stillTime > 2.5 && Math.random() < dt * 0.35) this.peering = 2.4;
    if (this.peering > 0) {
      this.peering -= dt;
      const k = Math.sin(Math.min(1, (2.4 - this.peering) / 2.4) * Math.PI);
      this.rig.rotation.x = 0.55 * k;
      this.head.rotation.x = 0.35 * k + Math.sin(t * 7) * 0.18 * k;
      this.head.rotation.z = 0.3 * k;
      this.tail.rotation.x = -0.35 * k;
    }

    // Eten: linkerpootje omhoog met het hapje, kop buigt knabbelend omlaag
    if (this.eating > 0) {
      this.eating -= dt;
      // Pootje omhoog tot vlak onder de snavel, lijf leunt op het andere pootje
      const lift = 1 - Math.exp(-dt * 14);
      const leg = this.legs[0];
      leg.position.y = THREE.MathUtils.lerp(leg.position.y, this.legBase.y + 0.07, lift);
      leg.position.z = THREE.MathUtils.lerp(leg.position.z, this.legBase.z + 0.05, lift);
      leg.position.x = THREE.MathUtils.lerp(leg.position.x, 0, lift);
      leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, -1.9, lift);
      this.rig.rotation.z = 0.1;
      this.head.rotation.x = 0.5 + Math.max(0, Math.sin(t * 16)) * 0.3;
      this.snack.scale.setScalar(Math.max(0.35, this.eating / 1.8));
      if (this.eating <= 0) {
        this.snack.visible = false;
        this.snack.scale.setScalar(1);
        leg.position.copy(this.legBase);
      }
    }
  }

  applyDance(dt) {
    if (this.dancing <= 0) return;
    this.dancing -= dt;
    const t = this.idleTime;
    this.rig.rotation.z = Math.sin(t * 9) * 0.25;
    this.rig.position.y = Math.abs(Math.sin(t * 9)) * 0.04;
    this.head.rotation.x = Math.sin(t * 18) * 0.3;
    const fluff = 1.12 + Math.sin(t * 18) * 0.05;
    this.body.scale.set(fluff, 1, fluff);
    this.wings.forEach((w) => (w.rotation.z = w.userData.side * (0.5 + Math.sin(t * 18) * 0.3)));
    if (this.dancing <= 0) this.body.scale.set(1, 1, 1);
  }

  /** Puck pakt een hapje met zijn pootje en knabbelt ervan. */
  eat(color = 0xd9b36b, seconds = 1.8) {
    this.eating = seconds;
    this.snack.material.color.set(color);
    this.snack.visible = true;
  }

  land(impact) {
    this.squash = Math.min(1, impact * 0.35);
  }

  cheer(duration = 1.2) {
    this.happy = duration;
  }
}
