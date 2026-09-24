import * as THREE from 'three';
import { Area, makeSign } from '../world/area.js';
import { lambert, M } from '../world/materials.js';
import { makePerson } from '../world/people.js';

// De lift van de Donderslaanflat, naar de foto: witte wanden met aluminium strips,
// leuningen, lichtpaneel, donkere vloer en een grote spiegel op de achterwand.
// Met de knop ga je tussen de 9e verdieping en de begane grond.
//
// Kooi: x -0.65..0.65, z -0.75..0.75, hoogte 2.2. Deuren aan de +z-kant.

const X = 0.65;
const Z = 0.75;
const H = 2.2;
const MIRROR = { y0: 0.9, y1: 1.95 };

const P = {
  wall: lambert(0xf1f1ee),
  alu: lambert(0xb8bdc1, { emissive: 0x2a2e31, emissiveIntensity: 0.2 }),
  floor: lambert(0x2c2e30),
  light: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  display: new THREE.MeshBasicMaterial({ color: 0x111111 }),
  red: lambert(0xb3121f),
};

/** Bouwt de liftkooi in `parent` (ook gebruikt voor het spiegelbeeld). */
function buildCage(parent, withColliders, area) {
  const block = (x0, y0, z0, x1, y1, z1, mat, opts = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.receiveShadow = true;
    parent.add(m);
    if (withColliders && opts.collide !== false) area.addCollider(x0, y0, z0, x1, y1, z1, opts);
    return m;
  };
  block(-X, -0.1, -Z, X, 0, Z, P.floor, { collide: false });
  block(-X, H, -Z, X, H + 0.1, Z, P.wall, { collide: false });
  // Zijwanden met verticale aluminium strips
  block(-X - 0.1, 0, -Z, -X, H, Z, P.wall, { name: 'liftwand' });
  block(X, 0, -Z, X + 0.1, H, Z, P.wall, { name: 'liftwand' });
  [-0.3, 0.2, 0.55].forEach((z) => {
    block(-X, 0, z, -X + 0.01, H, z + 0.02, P.alu, { collide: false });
    block(X - 0.01, 0, z, X, H, z + 0.02, P.alu, { collide: false });
  });
  // Achterwand: onderkant dicht, bovenkant is de spiegel (het gat wordt door het spiegelbeeld gevuld)
  block(-X, 0, -Z - 0.1, X, MIRROR.y0, -Z, P.wall, { name: 'liftwand' });
  block(-X, MIRROR.y1, -Z - 0.1, X, H, -Z, P.wall, { collide: false });
  block(-X, MIRROR.y0 - 0.03, -Z, X, MIRROR.y0, -Z + 0.02, P.alu, { collide: false });
  block(-X, MIRROR.y1, -Z, X, MIRROR.y1 + 0.03, -Z + 0.02, P.alu, { collide: false });
  // Leuningen
  [-1, 1].forEach((side) => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), P.alu);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(side * (X - 0.06), 0.9, -0.05);
    parent.add(rail);
    if (withColliders) area.addCollider(side > 0 ? X - 0.1 : -X, 0.86, -0.65, side > 0 ? X : -X + 0.1, 0.94, 0.55, { oneWay: true, name: 'leuning' });
  });
  // Bierkrat van Buurman Ben in de hoek: opstapje naar de leuning (en de spiegel)
  const crate = lambert(0xb3261e);
  const cx0 = 0.2;
  const cx1 = X - 0.02;
  const cz0 = -Z + 0.02;
  const cz1 = -0.35;
  const ch = 0.54;
  block(cx0, 0, cz0, cx1, 0.06, cz1, crate, { climbable: true, name: 'bierkrat' });
  block(cx0, 0, cz0, cx1, ch, cz0 + 0.03, crate, { collide: false });
  block(cx0, 0, cz1 - 0.03, cx1, ch, cz1, crate, { collide: false });
  block(cx0, 0, cz0, cx0 + 0.03, ch, cz1, crate, { collide: false });
  block(cx1 - 0.03, 0, cz0, cx1, ch, cz1, crate, { collide: false });
  block(cx0, ch - 0.06, cz0, cx1, ch - 0.03, cz1, crate, { collide: false });
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 6), lambert(0x3d5a2a));
      b.position.set(cx0 + 0.08 + i * 0.12, ch - 0.16, cz0 + 0.1 + j * 0.15);
      parent.add(b);
    }
  }
  if (withColliders) {
    area.addCollider(cx0, 0, cz0, cx1, ch, cz1, { climbable: true, name: 'bierkrat' });
    area.addCollider(cx0, ch - 0.02, cz0, cx1, ch + 0.02, cz1, { oneWay: true, name: 'bierkrat' });
  }
  // Lichtpaneel en rooster
  block(-0.3, H - 0.03, -0.25, 0.3, H, 0.25, P.light, { collide: false });
  block(-0.2, H - 0.02, 0.35, 0.2, H, 0.45, P.floor, { collide: false });
  // Deurkozijn
  block(-X - 0.1, 0, Z, -0.42, H, Z + 0.08, P.alu, { name: 'liftwand' });
  block(0.42, 0, Z, X + 0.1, H, Z + 0.08, P.alu, { name: 'liftwand' });
  block(-X, 2.05, Z, X, H, Z + 0.08, P.alu, { collide: false });
}

export class Lift extends Area {
  constructor(opts) {
    super('lift', opts);
    this.background = new THREE.Color(0x222428);
    this.cameraBounds = { minX: -X + 0.08, maxX: X - 0.08, minZ: -Z + 0.08, maxZ: Z - 0.05, minY: 0.2, maxY: H - 0.1 };
    this.cameraDistance = 0.9;
    this.floor = 9; // 9 = galerij, 0 = begane grond
    this.moving = 0;
    this.addSpawn('binnen', 0, 0, 0.35, Math.PI);
    this.spawns.binnen.camYaw = 0;

    buildCage(this.group, true, this);
    // Schuifdeuren: open als de lift stilstaat
    this.doors = [-1, 1].map((side) => {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.05, 0.03), P.alu);
      d.position.set(side * 0.21, 1.025, Z + 0.1);
      d.userData.noMerge = true;
      this.group.add(d);
      return d;
    });
    this.doorCollider = this.addCollider(-0.42, 0, Z + 0.02, 0.42, 2.05, Z + 0.12, { name: 'liftdeur' });
    this.doorCollider.enabled = false;
    this.doorOpen = 1;
    // Rode buitenkant (zoals op de foto) zie je door de open deur
    const out = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.6), new THREE.MeshBasicMaterial({ color: 0x5a6570 }));
    out.position.set(0, 1.3, Z + 1.2);
    out.rotation.y = Math.PI;
    this.group.add(out);

    // Spiegelbeeld: een gespiegelde kopie van de kooi achter de spiegel
    this.mirrorGroup = new THREE.Group();
    this.mirrorGroup.position.z = -Z;
    this.mirrorGroup.scale.z = -1;
    this.group.add(this.mirrorGroup);
    const inner = new THREE.Group();
    inner.position.z = Z;
    this.mirrorGroup.add(inner);
    buildCage(inner, false, this);
    this.mirrorInner = inner;
    // Een heel licht getint glas
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(2 * X, MIRROR.y1 - MIRROR.y0),
      new THREE.MeshBasicMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.12, depthWrite: false }),
    );
    glass.position.set(0, (MIRROR.y0 + MIRROR.y1) / 2, -Z + 0.005);
    this.group.add(glass);

    // Knoppenpaneel met verdiepingsdisplay
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.2), P.alu);
    panel.position.set(X - 0.01, 1.15, 0.5);
    this.group.add(panel);
    this.displayCanvas = document.createElement('canvas');
    this.displayCanvas.width = 64;
    this.displayCanvas.height = 32;
    this.displayTex = new THREE.CanvasTexture(this.displayCanvas);
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshBasicMaterial({ map: this.displayTex }));
    disp.rotation.y = -Math.PI / 2;
    disp.position.set(X - 0.025, 1.8, 0.2);
    this.group.add(disp);
    [['0', 1.02], ['9', 1.26]].forEach(([label, y]) => {
      const b = makeSign(label, { width: 0.06, height: 0.06, bg: '#f2c230', fg: '#3b2a1e', border: '#8a6d1c' });
      b.rotation.y = -Math.PI / 2;
      b.position.set(X - 0.022, y, 0.5);
      this.group.add(b);
    });
    this.drawDisplay(this.floor);

    this.zones.push({ x: 0.2, y: 0, z: 0.3, r: 0.6, h: 1.4, id: 'liftknop', prompt: 'Druk op de liftknop 🛗' });
    // Buurman Ben hangt altijd in de lift, tegen de achterwand. Ook in de spiegel.
    const benLook = { shirt: 0x8a8f96, pants: 0x3a3a3a, hairStyle: 'bald', hair: 0xd8d8d8, glasses: true, mood: 'smile', height: 1.72 };
    const ben = this.addNPC('ben', 'Buurman Ben', -0.36, -0.42, 0.35, benLook, { solid: false, r: 0.55 });
    ben.person.root.rotation.z = 0.06;
    ben.person.arms[1].rotation.z = 0.35;
    const benMirror = makePerson(benLook);
    benMirror.root.position.copy(ben.person.root.position);
    benMirror.root.rotation.copy(ben.person.root.rotation);
    benMirror.arms[1].rotation.z = 0.35;
    inner.add(benMirror.root);
    this.fx.push({
      update: () => {
        benMirror.head.rotation.copy(ben.person.head.rotation);
        benMirror.arms[0].rotation.copy(ben.person.arms[0].rotation);
      },
    });
    // Op de leuning zie je jezelf in de spiegel
    this.zones.push({ x: 0, y: 0.72, z: -0.35, r: 0.75, h: 0.6, secret: 'liftspiegel', say: 'Watskebeurt? Wat een knappe vogel in de spiegel!' });
    // Deuropening: uitgang (bestemming hangt af van de verdieping)
    this.portals.push({ x0: -0.42, z0: Z + 0.02, x1: 0.42, z1: Z + 1.5, to: 'lift-uit', spawn: '' });
    // Vloertje in de deuropening zodat Puck naar buiten kan stappen
    this.addCollider(-0.42, -0.1, Z, 0.42, 0, Z + 1.5, { name: 'drempel' });

    this.addLights({ sunPos: new THREE.Vector3(0.3, 4, 0.5), center: new THREE.Vector3(0, 0, 0), size: 1.5, hemi: 2.0, sun: 1.2, sunColor: 0xffffff });
  }

  drawDisplay(text) {
    const ctx = this.displayCanvas.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 64, 32);
    ctx.fillStyle = '#ff5a3c';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), 32, 17);
    this.displayTex.needsUpdate = true;
  }

  /** Start een rit; `onArrive` wordt aangeroepen als de lift er is. */
  ride(onArrive) {
    if (this.moving > 0) return false;
    this.from = this.floor;
    this.to = this.floor === 9 ? 0 : 9;
    this.moving = 3.2;
    this.onArrive = onArrive;
    return true;
  }

  update(dt, time) {
    this.animateCollectibles(dt, time);
    // Deuren schuiven dicht tijdens de rit
    const target = this.moving > 0.35 ? 0 : 1;
    this.doorOpen += (target - this.doorOpen) * Math.min(1, dt * 6);
    this.doors[0].position.x = -0.21 - this.doorOpen * 0.4;
    this.doors[1].position.x = 0.21 + this.doorOpen * 0.4;
    this.doorCollider.enabled = this.doorOpen < 0.8;
    if (this.moving > 0) {
      this.moving -= dt;
      const t = 1 - Math.max(0, this.moving) / 3.2;
      const f = Math.round(this.from + (this.to - this.from) * Math.min(1, t * 1.1));
      this.drawDisplay(f);
      // Een beetje schudden tijdens de rit
      this.group.position.y = Math.sin(time * 40) * 0.004 * (this.moving > 0.3 ? 1 : 0);
      if (this.moving <= 0) {
        this.floor = this.to;
        this.drawDisplay(this.floor);
        this.group.position.y = 0;
        if (this.onArrive) this.onArrive(this.floor);
      }
    }
    return false;
  }
}

export const LIFT_MIRROR_Z = -Z;
