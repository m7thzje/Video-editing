import * as THREE from 'three';

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

const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

const MATERIALS = {
  body: mat(0xffffff, { map: scaleTexture('#8e959b', '#b4babf') }),
  head: mat(0xffffff, { map: scaleTexture('#aab0b5', '#d3d7da') }),
  belly: mat(0xffffff, { map: scaleTexture('#9ea4a9', '#c3c8cc') }),
  wing: mat(0xffffff, { map: scaleTexture('#737b82', '#9aa1a7') }),
  primaries: mat(0x5a5f64),
  face: mat(0xf4f2ed),
  beak: mat(0x1b1b1d),
  iris: mat(0xf1dc86),
  eye: mat(0x0d0d0d),
  eyeShine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  tail: mat(0xe11d2b),
  speckle: mat(0xee7a64),
  legs: mat(0x55595d),
  hatRed: mat(0xd7263d),
  hatWhite: mat(0xfaf3e8),
  gold: mat(0xf2c230, { emissive: 0x8a5a00, emissiveIntensity: 0.4 }),
};

const ball = (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail);

/** Klein ruilkaartje: "Vuurdraak 150 HP". */
function cardTexture() {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f2c230';
  ctx.fillRect(0, 0, 96, 128);
  ctx.fillStyle = '#f08a4b';
  ctx.fillRect(6, 6, 84, 116);
  ctx.fillStyle = '#ffd36b';
  ctx.fillRect(12, 22, 72, 46);
  ctx.fillStyle = '#e2502c';
  ctx.beginPath();
  ctx.moveTo(48, 28);
  ctx.lineTo(70, 62);
  ctx.lineTo(26, 62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3b2a1e';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('Vuurdraak', 10, 17);
  ctx.fillText('150 HP', 22, 90);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Puck {
  constructor() {
    this.root = new THREE.Group(); // positie + draaiing (wordt door de controller gezet)
    this.rig = new THREE.Group(); // animatie-offsets (bob, waggel, squash)
    this.root.add(this.rig);

    this.walkPhase = 0;
    this.idleTime = 0;
    this.squash = 0; // >0 net geland
    this.happy = 0; // >0 blij (in doos / nootje)
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
    add(this.body, ball(0.1), MATERIALS.body, [0, 0, -0.01], [1, 1.25, 1.05], [0.25, 0, 0]);
    add(this.body, ball(0.086), MATERIALS.belly, [0, -0.01, 0.035], [0.92, 1.15, 0.75]);
    // Rode spikkels op buik en dijen (zoals bij Puck op de foto)
    [[0.03, -0.03, 0.095], [-0.035, -0.05, 0.09], [0.0, -0.075, 0.085], [0.045, -0.085, 0.07], [-0.05, -0.09, 0.065], [0.02, 0.0, 0.098]].forEach(
      ([x, y, z], i) => add(this.body, ball(0.013, 0), MATERIALS.speckle, [x, y, z], [1.3, 0.8, 0.4], [0, 0, i]),
    );

    // Staart: rode waaier met donkere dekveren erboven
    this.tail = new THREE.Group();
    this.tail.position.set(0, -0.075, -0.075);
    this.body.add(this.tail);
    const featherGeo = new THREE.BoxGeometry(0.035, 0.014, 0.15);
    featherGeo.translate(0, 0, -0.075);
    [-0.35, -0.12, 0.12, 0.35].forEach((spread) => {
      add(this.tail, featherGeo, MATERIALS.tail, [spread * 0.05, 0, 0], null, [-0.55, spread, 0]);
    });
    add(this.tail, ball(0.045, 0), MATERIALS.tail, [0, -0.005, 0.005], [1, 0.6, 1.2]);
    add(this.tail, ball(0.05, 0), MATERIALS.wing, [0, 0.03, 0.03], [0.9, 0.5, 1.1]);

    // Vleugels met donkere slagpennen
    this.wings = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.085, 0.05, -0.01);
      add(pivot, ball(0.075), MATERIALS.wing, [side * 0.012, -0.055, -0.02], [0.36, 1.2, 1], [0.35, 0, 0]);
      add(pivot, ball(0.04, 0), MATERIALS.primaries, [side * 0.012, -0.11, -0.075], [0.3, 0.9, 1.0], [0.7, 0, 0]);
      pivot.userData.side = side;
      this.body.add(pivot);
      return pivot;
    });

    // Kop
    this.head = new THREE.Group();
    this.head.position.set(0, 0.128, 0.035);
    this.body.add(this.head);
    add(this.head, ball(0.078), MATERIALS.head, null, [1, 0.97, 1.02]);

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
      add(pivot, new THREE.CylinderGeometry(0.012, 0.012, 0.07, 5), MATERIALS.legs, [0, -0.035, 0]);
      add(pivot, new THREE.BoxGeometry(0.04, 0.012, 0.055), MATERIALS.legs, [0, -0.07, 0.012]);
      rig.add(pivot);
      return pivot;
    });

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
    this.hats = { kabouter: gnome, kroon: crown };
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
    const cardTex = cardTexture();
    add(card, new THREE.BoxGeometry(0.075, 0.1, 0.003), [MATERIALS.gold, MATERIALS.gold, MATERIALS.gold, MATERIALS.gold, mat(0xffffff, { map: cardTex }), mat(0xffffff, { map: cardTex })], [0.03, -0.075, 0.105]);
    card.rotation.y = 1.2;
    this.beakItems = { sigaret: cig, kaart: card };
    Object.values(this.beakItems).forEach((b) => {
      b.visible = false;
      this.head.add(b);
    });
    this.dancing = 0;

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

  land(impact) {
    this.squash = Math.min(1, impact * 0.35);
  }

  cheer(duration = 1.2) {
    this.happy = duration;
  }
}
