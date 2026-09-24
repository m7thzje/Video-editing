import * as THREE from 'three';
import { Area, makeSign } from '../world/area.js';
import { lambert, M } from '../world/materials.js';

// De Jumbo van binnen: schappen, koelvakken, een kassa met Kassière Anja, een aanbiedingsbak met
// pistachenoten en poortjes bij de uitgang. Bedrijfsleider Gerrit houdt alles in de gaten.
// Betalen kan (met een knoopje), stelen ook. Dan gaan de poortjes af en ontploft Gerrit.
//
// Winkel: x -5..5, z -4..4, hoogte 3. Uitgang in de oostwand (x = 5, z -0.6..0.6).

const R = { minX: -5, maxX: 5, minZ: -4, maxZ: 4, h: 3 };

const P = {
  floor: lambert(0xdedad2),
  joint: lambert(0xc9c4ba),
  wall: lambert(0xf4f2ec),
  yellow: lambert(0xffd200),
  shelf: lambert(0xe7e7e3),
  shelfDark: lambert(0x9aa1a6),
  fridge: lambert(0xdfe6ea),
  fridgeGlass: lambert(0xbfe6f5, { emissive: 0x7ab6d0, emissiveIntensity: 0.45 }),
  counter: lambert(0x3a3d40),
  belt: lambert(0x1f2123),
  light: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  gate: lambert(0xc9ccd0),
  gateLight: lambert(0xff4a3c, { emissive: 0xff2a1c, emissiveIntensity: 0.2 }),
  pistache: lambert(0x7fb34a),
  pistacheBag: lambert(0x3f8f3a),
};

const PRODUCT_COLORS = [0xd7263d, 0xf2c230, 0x3d7ea6, 0x6ac46b, 0xe86a1a, 0xffffff, 0x8e6bb0, 0xf09a5a, 0x1f4f9c, 0xc8203a];

export class JumboStore extends Area {
  constructor(opts) {
    super('jumbo', opts);
    this.background = new THREE.Color(0xf4f2ec);
    this.cameraBounds = { minX: R.minX + 0.15, maxX: R.maxX - 0.15, minZ: R.minZ + 0.15, maxZ: R.maxZ - 0.15, minY: 0.15, maxY: R.h - 0.15 };
    this.cameraDistance = 2.0;
    this.addSpawn('deur', 4.2, 0, 0, -Math.PI / 2);
    this.spawns.deur.camYaw = Math.PI / 2;
    this.portals.push({ x0: R.maxX - 0.25, z0: -0.6, x1: R.maxX + 1, z1: 0.6, to: 'buiten', spawn: 'jumbo' });

    this.buildRoom();
    this.buildShelves();
    this.buildFridges();
    this.buildCheckout();
    this.buildPistachios();
    this.buildGates();
    this.buildPeople();
    this.addLights({ sunPos: new THREE.Vector3(3, 8, 2), center: new THREE.Vector3(0, 0, 0), size: 6, hemi: 2.1 });
  }

  buildRoom() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), P.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
    for (let x = R.minX + 0.6; x < R.maxX; x += 0.6) this.block(x, 0, R.minZ, x + 0.015, 0.002, R.maxZ, P.joint, { collide: false, shadow: false });
    for (let z = R.minZ + 0.6; z < R.maxZ; z += 0.6) this.block(R.minX, 0, z, R.maxX, 0.002, z + 0.015, P.joint, { collide: false, shadow: false });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), lambert(0xf8f7f3));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = R.h;
    this.group.add(ceil);
    // Lichtbalken
    for (let x = -3.5; x <= 3.5; x += 2.3) this.block(x - 0.08, R.h - 0.04, -3.5, x + 0.08, R.h, 3.5, P.light, { collide: false, shadow: false });
    const t = 0.25;
    const wall = (x0, z0, x1, z1) => this.block(x0, 0, z0, x1, R.h, z1, P.wall, { shadow: false, name: 'muur' });
    wall(R.minX - t, R.minZ - t, R.maxX + t, R.minZ);
    wall(R.minX - t, R.maxZ, R.maxX + t, R.maxZ + t);
    wall(R.minX - t, R.minZ, R.minX, R.maxZ);
    wall(R.maxX, R.minZ, R.maxX + t, -0.6);
    wall(R.maxX, 0.6, R.maxX + t, R.maxZ);
    this.block(R.maxX, 2.3, -0.6, R.maxX + t, R.h, 0.6, P.wall, { shadow: false });
    // Gele band met JUMBO erop
    this.block(R.minX, 2.3, R.minZ, R.maxX, 2.6, R.minZ + 0.01, P.yellow, { collide: false, shadow: false });
    this.block(R.minX, 2.3, R.maxZ - 0.01, R.maxX, 2.6, R.maxZ, P.yellow, { collide: false, shadow: false });
    const logo = makeSign('JUMBO', { width: 1.6, height: 0.36, bg: '#ffd200', fg: '#1b1b1d', border: '#ffd200' });
    logo.position.set(0, 2.45, R.minZ + 0.02);
    this.group.add(logo);
    // Buitenlicht in de deuropening
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.3), new THREE.MeshBasicMaterial({ color: 0xeaf6ff }));
    glow.rotation.y = -Math.PI / 2;
    glow.position.set(R.maxX + 0.24, 1.15, 0);
    this.group.add(glow);
    // Bordjes boven de paden
    [['Groente & fruit', -3.2, -2.5], ['Koek & snoep', -1.2, -0.5], ['Zuivel', -1.2, 1.5]].forEach(([text, x, z]) => {
      const s = makeSign(text, { width: 1.1, height: 0.24, bg: '#1b1b1d', fg: '#ffd200', border: '#1b1b1d' });
      s.position.set(x, 2.35, z);
      this.group.add(s);
    });
  }

  gondola(x0, x1, z, doubleSided = true) {
    // Schap met drie planken en producten (instanced, dus snel)
    const d = doubleSided ? 0.6 : 0.4;
    const z0 = z - d / 2;
    const z1 = z + d / 2;
    const h = 1.55;
    this.block(x0, 0, z - 0.03, x1, h, z + 0.03, P.shelfDark, { collide: false });
    this.block(x0, 0, z0, x1, 0.12, z1, P.shelf, { collide: false });
    this.addCollider(x0, 0, z0, x1, h, z1, { climbable: true, name: 'schap' });
    this.block(x0 - 0.02, h - 0.02, z0 - 0.02, x1 + 0.02, h + 0.02, z1 + 0.02, P.shelf, { oneWay: true, name: 'schap' });
    const items = [];
    [0.12, 0.6, 1.08].forEach((y, level) => {
      this.block(x0, y, z0, x1, y + 0.03, z1, P.shelf, { collide: false });
      for (const side of doubleSided ? [-1, 1] : [1]) {
        for (let x = x0 + 0.1; x < x1 - 0.08; x += 0.16) {
          items.push({ x, y: y + 0.03, z: z + side * (d / 2 - 0.12), level });
        }
      }
    });
    return items;
  }

  buildShelves() {
    const items = [
      ...this.gondola(-4.2, 0.6, -3.55, false),
      ...this.gondola(-4.2, 0.6, -1.5),
      ...this.gondola(-4.2, 0.6, 0.5),
    ];
    const geo = new THREE.BoxGeometry(0.12, 1, 0.14);
    geo.translate(0, 0.5, 0);
    const mesh = new THREE.InstancedMesh(geo, lambert(0xffffff), items.length);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    let seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    items.forEach((it, i) => {
      const hgt = 0.14 + rnd() * 0.22;
      m.makeScale(1, hgt, 1).setPosition(it.x, it.y, it.z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.setHex(PRODUCT_COLORS[Math.floor(rnd() * PRODUCT_COLORS.length)]));
    });
    mesh.castShadow = true;
    this.group.add(mesh);
  }

  buildFridges() {
    // Koelvakken langs de westmuur met blauw licht
    const x0 = R.minX;
    const x1 = R.minX + 0.6;
    this.block(x0, 0, -2.6, x1, 2.0, 3.8, P.fridge, { climbable: true, name: 'koeling' });
    this.block(x1, 0.2, -2.5, x1 + 0.01, 1.9, 3.7, P.fridgeGlass, { collide: false, shadow: false });
    for (let z = -2.5; z < 3.7; z += 0.9) this.block(x1, 0.2, z, x1 + 0.02, 1.9, z + 0.04, P.fridge, { collide: false, shadow: false });
    const s = makeSign('Zuivel & kaas', { width: 1.2, height: 0.26, bg: '#3d7ea6', fg: '#ffffff', border: '#3d7ea6' });
    s.rotation.y = Math.PI / 2;
    s.position.set(x1 + 0.02, 2.15, 0.6);
    this.group.add(s);
  }

  buildCheckout() {
    // Kassa met lopende band en een kassaapparaat
    this.block(1.4, 0, 2.2, 3.6, 0.9, 2.8, P.counter, { climbable: true, name: 'kassa' });
    this.block(1.45, 0.9, 2.3, 3.0, 0.93, 2.7, P.belt, { collide: false, shadow: false });
    this.block(3.1, 0.9, 2.35, 3.5, 1.15, 2.7, lambert(0x2b2f36), { collide: false });
    this.block(3.15, 1.15, 2.4, 3.45, 1.35, 2.45, lambert(0x9fe0a0, { emissive: 0x3fa040, emissiveIntensity: 0.6 }), { collide: false, shadow: false });
    const s = makeSign(['KASSA 1', 'Hier betalen'], { width: 0.7, height: 0.3, bg: '#ffd200', fg: '#1b1b1d', border: '#1b1b1d' });
    s.position.set(2.5, 2.1, 2.5);
    this.group.add(s);
    this.block(2.48, 1.5, 2.48, 2.52, R.h, 2.52, M.metalDark, { collide: false });
    this.zones.push({ id: 'kassa', x: 2.4, y: 0, z: 1.7, r: 0.75, h: 1.2, prompt: 'Betalen bij de kassa 💶' });
  }

  buildPistachios() {
    // Aanbiedingsbak vol zakken pistachenoten
    const x = 2.2;
    const z = -1.6;
    this.block(x - 0.55, 0, z - 0.4, x + 0.55, 0.7, z + 0.4, P.yellow, { climbable: true, name: 'aanbiedingsbak' });
    const bag = new THREE.BoxGeometry(0.16, 0.2, 0.08);
    const bags = new THREE.InstancedMesh(bag, P.pistacheBag, 18);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < 18; i++) {
      e.set((i % 3) * 0.3 - 0.3, i * 1.7, (i % 2) * 0.4 - 0.2);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x - 0.42 + (i % 6) * 0.17, 0.74 + Math.floor(i / 6) * 0.04, z - 0.22 + Math.floor(i / 6) * 0.2), q, new THREE.Vector3(1, 1, 1));
      bags.setMatrixAt(i, m);
    }
    bags.castShadow = true;
    this.group.add(bags);
    const sign = makeSign(['PISTACHENOTEN', '€2,49 · 1+1 gratis', 'Niet voor papegaaien'], { width: 1.0, height: 0.5, bg: '#ffd200', fg: '#1b1b1d', border: '#d7263d' });
    sign.position.set(x, 1.25, z - 0.42);
    this.group.add(sign);
    this.block(x - 0.02, 0.7, z - 0.44, x + 0.02, 1.0, z - 0.4, M.metalDark, { collide: false });
    this.zones.push({ id: 'pistachebak', x, y: 0, z, r: 0.95, h: 1.5, prompt: 'Pak een zak pistachenoten 🥜' });
  }

  buildGates() {
    // Antidiefstalpoortjes bij de uitgang
    this.gateLights = [];
    [-0.75, 0.75].forEach((z) => {
      this.block(3.95, 0, z - 0.06, 4.05, 1.5, z + 0.06, P.gate, { name: 'poortje' });
      const l = this.block(3.94, 1.3, z - 0.07, 4.06, 1.42, z + 0.07, P.gateLight, { collide: false, shadow: false });
      l.userData.noMerge = true;
      this.gateLights.push(l);
    });
    this.zones.push({ id: 'poortjes', x: 4.2, y: 0, z: 0, r: 0.55, h: 1.5 });
  }

  buildPeople() {
    this.anja = this.addNPC('anja', 'Kassière Anja', 2.5, 3.2, Math.PI, { height: 1.64, shirt: 0xffd200, pants: 0x1b1b1d, hairStyle: 'ponytail', hair: 0x9a4a2a, mood: 'flat' }, { solid: false, r: 0.1 });
    this.gerrit = this.addNPC('gerrit', 'Bedrijfsleider Gerrit', 3.4, -2.6, -Math.PI / 2 - 0.4, {
      shirt: 0xffffff, pants: 0x2b2f3a, hairStyle: 'short', hair: 0x4a3322, glasses: true, mood: 'frown', height: 1.8,
    });
    // Stropdas en naambordje
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.02), lambert(0xffd200));
    tie.position.set(0, 1.35, 0.2);
    this.gerrit.person.root.add(tie);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.01), lambert(0xffd200));
    badge.position.set(0.12, 1.45, 0.2);
    this.gerrit.person.root.add(badge);
  }

  /** Poortjes knipperen tijdens het alarm. */
  alarm(seconds = 3) {
    this.alarmTime = seconds;
  }

  update(dt, time) {
    this.animateCollectibles(dt, time);
    if (this.alarmTime > 0) {
      this.alarmTime -= dt;
      const on = Math.sin(time * 18) > 0 && this.alarmTime > 0;
      P.gateLight.emissiveIntensity = on ? 2.2 : 0.2;
    }
    return false;
  }
}
