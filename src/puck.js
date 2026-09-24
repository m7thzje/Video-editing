import * as THREE from 'three';

// Puck: een grijze roodstaart papegaai (Psittacus erithacus) van simpele vormen.
// Lokale voorkant is +Z, voeten staan op y = 0.

const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

const MATERIALS = {
  body: mat(0x9aa1a7),
  bodyLight: mat(0xb9bec3),
  wing: mat(0x6f777e),
  face: mat(0xf1efe9),
  beak: mat(0x1d1d1f),
  eye: mat(0x111111),
  eyeShine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  tail: mat(0xe0192a),
  legs: mat(0x5b5f63),
};

const ball = (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail);

export class Puck {
  constructor() {
    this.root = new THREE.Group(); // positie + draaiing (wordt door de controller gezet)
    this.rig = new THREE.Group(); // animatie-offsets (bob, waggel, squash)
    this.root.add(this.rig);

    this.walkPhase = 0;
    this.idleTime = 0;
    this.squash = 0; // >0 net geland
    this.happy = 0; // >0 blij (in doos / nootje)
    this.build();
  }

  build() {
    const { rig } = this;

    // Lijf
    this.body = new THREE.Group();
    this.body.position.y = 0.16;
    rig.add(this.body);

    const torso = new THREE.Mesh(ball(0.1), MATERIALS.body);
    torso.scale.set(1, 1.25, 1.05);
    torso.rotation.x = 0.25;
    torso.castShadow = true;
    this.body.add(torso);

    const belly = new THREE.Mesh(ball(0.085), MATERIALS.bodyLight);
    belly.scale.set(0.9, 1.1, 0.7);
    belly.position.set(0, -0.005, 0.04);
    this.body.add(belly);

    // Staart (knalrood)
    this.tail = new THREE.Group();
    this.tail.position.set(0, -0.07, -0.07);
    this.body.add(this.tail);
    // Waaier van staartveren, schuin naar achteren en omlaag
    const featherGeo = new THREE.BoxGeometry(0.035, 0.014, 0.15);
    featherGeo.translate(0, 0, -0.075);
    [-0.35, 0, 0.35].forEach((spread) => {
      const f = new THREE.Mesh(featherGeo, MATERIALS.tail);
      f.rotation.set(-0.55, spread, 0);
      f.position.x = spread * 0.05;
      f.castShadow = true;
      this.tail.add(f);
    });
    const coverts = new THREE.Mesh(ball(0.045, 0), MATERIALS.tail);
    coverts.scale.set(1, 0.6, 1.2);
    coverts.position.set(0, 0.0, 0.0);
    this.tail.add(coverts);

    // Vleugels
    this.wings = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.085, 0.05, -0.01);
      const wing = new THREE.Mesh(ball(0.075), MATERIALS.wing);
      wing.scale.set(0.35, 1.2, 1);
      wing.position.set(side * 0.01, -0.06, -0.02);
      wing.rotation.x = 0.35;
      wing.castShadow = true;
      pivot.add(wing);
      pivot.userData.side = side;
      this.body.add(pivot);
      return pivot;
    });

    // Kop
    this.head = new THREE.Group();
    this.head.position.set(0, 0.125, 0.035);
    this.body.add(this.head);

    const skull = new THREE.Mesh(ball(0.075), MATERIALS.body);
    skull.castShadow = true;
    this.head.add(skull);

    // Witte oogvlakken, zwarte oogjes
    [-1, 1].forEach((side) => {
      const patch = new THREE.Mesh(ball(0.035, 0), MATERIALS.face);
      patch.scale.set(0.5, 1, 1.1);
      patch.position.set(side * 0.058, 0.008, 0.032);
      this.head.add(patch);
      const eye = new THREE.Mesh(ball(0.014, 0), MATERIALS.eye);
      eye.position.set(side * 0.071, 0.012, 0.038);
      this.head.add(eye);
      const shine = new THREE.Mesh(ball(0.004, 0), MATERIALS.eyeShine);
      shine.position.set(side * 0.08, 0.018, 0.043);
      this.head.add(shine);
    });

    // Zwarte kromme snavel
    const upper = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 6), MATERIALS.beak);
    upper.position.set(0, -0.012, 0.085);
    upper.rotation.x = Math.PI / 2 + 0.55;
    this.head.add(upper);
    const lower = new THREE.Mesh(ball(0.02, 0), MATERIALS.beak);
    lower.scale.set(1, 0.7, 1.1);
    lower.position.set(0, -0.035, 0.07);
    this.head.add(lower);

    // Pootjes
    this.legs = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.04, 0.075, 0.01);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 5), MATERIALS.legs);
      leg.position.y = -0.035;
      pivot.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.055), MATERIALS.legs);
      foot.position.set(0, -0.07, 0.012);
      pivot.add(foot);
      rig.add(pivot);
      return pivot;
    });
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

  land(impact) {
    this.squash = Math.min(1, impact * 0.35);
  }

  cheer(duration = 1.2) {
    this.happy = duration;
  }
}
