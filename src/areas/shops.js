import * as THREE from 'three';
import { Area, makeSign } from '../world/area.js';
import { lambert, M } from '../world/materials.js';
import { worldTexture } from '../world/phototex.js';

// Twee kleine winkels met een nut:
// - Snackbar De Vette Hap: bestel aan de toonbank een snack = superkracht, wanneer je maar wilt.
// - Kringloop Van Alles Wat: hoedjes passen die je vrijspeelt met sterren, plus een prijzenkast.
//
// Beide kamers: x -3..3, z -2.5..2.5, deur in de oostwand (x = 3, z -0.45..0.45).

const R = { minX: -3, maxX: 3, minZ: -2.5, maxZ: 2.5, h: 2.6 };

function buildRoom(area, { wall, floor, ceiling = 0xf8f6f0 }) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), floor);
  f.rotation.x = -Math.PI / 2;
  f.receiveShadow = true;
  area.group.add(f);
  const c = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), lambert(ceiling, { emissive: 0xaaa89f }));
  c.rotation.x = Math.PI / 2;
  c.position.y = R.h;
  area.group.add(c);
  const t = 0.25;
  const w = (x0, z0, x1, z1) => area.block(x0, 0, z0, x1, R.h, z1, wall, { shadow: false, name: 'muur' });
  w(R.minX - t, R.minZ - t, R.maxX + t, R.minZ);
  w(R.minX - t, R.maxZ, R.maxX + t, R.maxZ + t);
  w(R.minX - t, R.minZ, R.minX, R.maxZ);
  w(R.maxX, R.minZ, R.maxX + t, -0.45);
  w(R.maxX, 0.45, R.maxX + t, R.maxZ);
  area.block(R.maxX, 2.1, -0.45, R.maxX + t, R.h, 0.45, wall, { shadow: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.1), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
  glow.rotation.y = -Math.PI / 2;
  glow.position.set(R.maxX + 0.24, 1.05, 0);
  area.group.add(glow);
  area.cameraBounds = { minX: R.minX + 0.15, maxX: R.maxX - 0.15, minZ: R.minZ + 0.15, maxZ: R.maxZ - 0.15, minY: 0.12, maxY: R.h - 0.15 };
  area.cameraDistance = 1.8;
  area.addSpawn('deur', 2.4, 0, 0, -Math.PI / 2);
  area.spawns.deur.camYaw = Math.PI / 2;
}

// ---------- Snackbar ----------

export const SNACKS = [
  { name: 'Patatje mayo', color: 0xf7cf4a, line: 'Patatje mayo. Klassiek. Zoals mijn vader het bakte. En zijn vader. Die bakte ook.' },
  { name: 'Eierbal', color: 0xc98a3c, line: 'Een eierbal. Echt Gronings. In de rest van het land weten ze niet eens wat het is. Zielig.' },
  { name: 'Frikandel speciaal', color: 0x8a4a22, line: 'Frikandel speciaal. Met uitjes. Je ruikt er drie dagen naar. Graag gedaan.' },
  { name: 'Kroket', color: 0xb8742c, line: 'Kroket. Heet vanbinnen. Niet meteen happen. Je hapt toch meteen. Iedereen hapt meteen.' },
  { name: 'Kaassoufflé', color: 0xe8b04b, line: 'Kaassoufflé. Er zit kaas in. Soms. Meestal lucht.' },
  { name: 'Patatje oorlog', color: 0xd9a441, line: 'Patatje oorlog? Nee. Hier heet het patatje vrede. Het is een rustige zaak.' },
];

export class Snackbar extends Area {
  constructor(opts) {
    super('snackbar', opts);
    this.background = new THREE.Color(0xfff6e6);
    this.portals.push({ x0: R.maxX - 0.2, z0: -0.45, x1: R.maxX + 1, z1: 0.45, to: 'buiten', spawn: 'snackbar' });
    const tiles = worldTexture(lambert(0xffffff), 'concrete', 1.4, 0xf1efe8);
    buildRoom(this, { wall: lambert(0xf6f1e4), floor: tiles });
    // Rood-wit geblokte tegels langs de muren
    for (let x = R.minX; x < R.maxX; x += 0.25) {
      const red = Math.round((x - R.minX) / 0.25) % 2 === 0;
      this.block(x, 0.9, R.minZ, x + 0.25, 1.15, R.minZ + 0.01, lambert(red ? 0xd7263d : 0xffffff), { collide: false, shadow: false });
    }
    // Toonbank met friteuse en vitrine
    this.block(-1.8, 0, -1.3, 1.6, 1.0, -0.7, lambert(0xd7263d), { climbable: true, name: 'toonbank' });
    this.block(-1.85, 1.0, -1.35, 1.65, 1.05, -0.65, M.metal, { climbable: true, name: 'toonbank' });
    this.block(-0.4, 1.05, -1.25, 1.2, 1.4, -0.8, lambert(0xcfe6f2, { emissive: 0x7fa0b8, emissiveIntensity: 0.3 }), { collide: false });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.14, 3, 6), lambert(SNACKS[i].color));
      s.rotation.z = Math.PI / 2;
      s.position.set(-0.2 + i * 0.23, 1.1, -1.02);
      this.group.add(s);
    }
    this.block(-2.9, 0, -2.4, -1.9, 1.0, -1.6, M.metalDark, { climbable: true, name: 'friteuse' });
    const oil = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), lambert(0xe8b04b, { emissive: 0x8a5a00, emissiveIntensity: 0.4 }));
    oil.rotation.x = -Math.PI / 2;
    oil.position.set(-2.4, 1.01, -2.0);
    this.group.add(oil);
    // Menubord
    const menu = makeSign(['DE VETTE HAP', ...SNACKS.map((s) => s.name), 'Mayo is gratis. Liefde niet.'], { width: 1.6, height: 1.3, bg: '#1b1b1d', fg: '#ffd84a', border: '#d7263d' });
    menu.position.set(0.3, 1.9, R.minZ + 0.02);
    this.group.add(menu);
    // Statafels en een gokkast
    [[-1.6, 1.5], [0.6, 1.6]].forEach(([x, z]) => {
      this.block(x - 0.03, 0, z - 0.03, x + 0.03, 1.05, z + 0.03, M.metalDark, { collide: false });
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 14), lambert(0xd7263d));
      top.position.set(x, 1.07, z);
      this.group.add(top);
      this.addCollider(x - 0.3, 1.03, z - 0.3, x + 0.3, 1.09, z + 0.3, { oneWay: true, name: 'statafel' });
      this.addCollider(x - 0.05, 0, z - 0.05, x + 0.05, 1.05, z + 0.05, { climbable: true });
    });
    this.block(-2.9, 0, 1.4, -2.3, 1.7, 2.2, lambert(0x3f2a7a), { climbable: true, name: 'gokkast' });
    this.block(-2.31, 0.9, 1.55, -2.29, 1.4, 2.05, lambert(0xffd84a, { emissive: 0xffa000, emissiveIntensity: 0.6 }), { collide: false, shadow: false });
    this.zones.push({ x: -2.1, y: 0, z: 1.8, r: 0.5, h: 1.2, id: 'gokkast', prompt: 'Speel op de gokkast 🎰' });
    // Eigenaar
    this.addNPC('sietske', 'Snackbar-Sietske', 0.2, -1.9, 0, { height: 1.66, shirt: 0xffffff, pants: 0x2b2f3a, hairStyle: 'bun', hair: 0xc9a06c, mood: 'smile' }, { solid: false, r: 0.1 });
    this.zones.push({ id: 'snack', x: 0.2, y: 0, z: -0.2, r: 0.75, h: 1.4, prompt: 'Bestel een snack 🍟' });
    this.addLights({ sunPos: new THREE.Vector3(5, 6, 3), center: new THREE.Vector3(0, 0, 0), size: 4.5, hemi: 1.9 });
  }

  update(dt, time) {
    this.animateCollectibles(dt, time);
    return false;
  }
}

// ---------- Kringloop ----------

export const HATS = [
  { id: null, name: 'Niks op', need: 0 },
  { id: 'pet', name: 'Gele pet', need: 1 },
  { id: 'zonnebril', name: 'Zonnebril', need: 3 },
  { id: 'koksmuts', name: 'Koksmuts', need: 5 },
  { id: 'feesthoed', name: 'Feesthoedje', need: 7 },
  { id: 'kabouter', name: 'Kaboutermuts', secret: 'kabouter' },
  { id: 'kroon', name: 'Kroon', need: 9 },
];

/** Grote versie van een hoedje voor op de standaard in de winkel. */
function hatModel(id) {
  const g = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  if (id === 'pet') {
    add(new THREE.SphereGeometry(0.12, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0xffd200));
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 12, 1, false, -Math.PI / 2, Math.PI), lambert(0xffd200), 0, 0.005, 0.08).scale.set(1, 1, 0.9);
  } else if (id === 'zonnebril') {
    [-1, 1].forEach((s) => add(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 12), lambert(0x111111), s * 0.055, 0.05, 0).rotation.x = Math.PI / 2);
    add(new THREE.BoxGeometry(0.06, 0.012, 0.012), lambert(0x111111), 0, 0.06, 0);
  } else if (id === 'koksmuts') {
    add(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12), M.white, 0, 0.04, 0);
    add(new THREE.SphereGeometry(0.13, 12, 8), M.white, 0, 0.14, 0).scale.set(1, 0.7, 1);
  } else if (id === 'feesthoed') {
    add(new THREE.ConeGeometry(0.08, 0.22, 12), lambert(0xe86fb4), 0, 0.11, 0);
    add(new THREE.SphereGeometry(0.025, 8, 6), lambert(0xffd84a), 0, 0.23, 0);
  } else if (id === 'kabouter') {
    add(new THREE.ConeGeometry(0.1, 0.26, 10), lambert(0xd7263d), 0, 0.13, 0);
    add(new THREE.TorusGeometry(0.095, 0.02, 5, 12), M.white, 0, 0.01, 0).rotation.x = Math.PI / 2;
  } else if (id === 'kroon') {
    const gold = M.gold;
    add(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 10, 1, true), gold, 0, 0.035, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      add(new THREE.ConeGeometry(0.022, 0.06, 4), gold, Math.cos(a) * 0.085, 0.1, Math.sin(a) * 0.085);
    }
  } else {
    add(new THREE.TorusGeometry(0.06, 0.012, 5, 12), lambert(0x9aa1a6), 0, 0.02, 0).rotation.x = Math.PI / 2;
  }
  return g;
}

export class Kringloop extends Area {
  constructor(opts) {
    super('kringloop', opts);
    this.background = new THREE.Color(0xf4ecdf);
    this.portals.push({ x0: R.maxX - 0.2, z0: -0.45, x1: R.maxX + 1, z1: 0.45, to: 'buiten', spawn: 'kringloop' });
    buildRoom(this, { wall: lambert(0xefe4cf), floor: worldTexture(lambert(0xffffff), 'greywood', 1.6, 0xd8c3a5) });
    // Hoedjesrek: zeven standaards langs de achterwand
    this.hatStands = HATS.map((h, i) => {
      const x = -2.5 + i * 0.8;
      const z = R.minZ + 0.45;
      this.block(x - 0.04, 0, z - 0.04, x + 0.04, 1.0, z + 0.04, M.woodDark, { collide: false });
      this.block(x - 0.18, 0, z - 0.18, x + 0.18, 0.04, z + 0.18, M.woodDark, { collide: false });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), lambert(0xe7e3da));
      head.position.set(x, 1.08, z);
      this.group.add(head);
      const model = hatModel(h.id);
      model.position.set(x, 1.16, z);
      model.userData.dynamic = true;
      this.group.add(model);
      const label = makeSign([h.name, h.secret ? 'geheim' : h.need ? `${h.need} ⭐` : 'gratis'], { width: 0.55, height: 0.24, bg: '#fff6e6', fg: '#3b2a1e' });
      label.position.set(x, 0.55, z + 0.06);
      this.group.add(label);
      this.zones.push({ id: 'hoed', hat: h, x, y: 0, z: z + 0.55, r: 0.38, h: 1.3, prompt: `Pas: ${h.name} 🧢` });
      return { model, x, z };
    });
    // Spiegel om jezelf te bekijken
    this.block(2.2, 0.4, R.minZ + 0.01, 2.9, 2.0, R.minZ + 0.04, lambert(0xb9d3dd, { emissive: 0x6d8a96, emissiveIntensity: 0.4 }), { collide: false, shadow: false });
    // Prijzenkast met een beker per verdiende ster
    this.block(-2.95, 0, -0.6, -2.55, 1.9, 1.6, M.wood, { climbable: true, name: 'prijzenkast' });
    [0.5, 1.0, 1.5].forEach((y) => this.block(-2.55, y, -0.6, -2.35, y + 0.03, 1.6, M.wood, { oneWay: true, name: 'plank' }));
    this.cups = [];
    for (let i = 0; i < 9; i++) {
      const cup = new THREE.Group();
      const g = M.gold;
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.1, 10), g);
      bowl.position.y = 0.14;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 6), g);
      stem.position.y = 0.06;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.03, 10), g);
      base.position.y = 0.015;
      cup.add(bowl, stem, base);
      cup.position.set(-2.45, 0.53 + Math.floor(i / 3) * 0.5, -0.35 + (i % 3) * 0.6);
      cup.userData.dynamic = true;
      this.group.add(cup);
      this.cups.push(cup);
    }
    const trophy = makeSign('Prijzenkast van Puck', { width: 0.9, height: 0.2, bg: '#3b2a1e', fg: '#ffd84a', border: '#3b2a1e' });
    trophy.rotation.y = Math.PI / 2;
    trophy.position.set(-2.53, 2.05, 0.5);
    this.group.add(trophy);
    // Rommel: lamp, schommelstoel, stapel borden
    this.block(0.4, 0, 1.4, 1.4, 0.45, 2.2, M.woodLight, { climbable: true, name: 'tafeltje' });
    const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.25, 10, 1, true), M.lampShade);
    lamp.position.set(0.7, 0.95, 1.8);
    this.group.add(lamp);
    this.block(0.68, 0.45, 1.78, 0.72, 0.85, 1.82, M.metalDark, { collide: false });
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.02, 12), M.white);
      p.position.set(1.15, 0.46 + i * 0.022, 1.8);
      this.group.add(p);
    }
    const bord = makeSign(['KRINGLOOP', 'Van Alles Wat', 'Alles moet weg. Niks gaat weg.'], { width: 1.4, height: 0.5, bg: '#2f6e4a', fg: '#ffffff', border: '#1d4a30' });
    bord.position.set(0.2, 2.2, R.minZ + 0.02);
    this.group.add(bord);
    this.addNPC('karin', 'Kringloop-Karin', 1.8, 1.2, -Math.PI / 2 - 0.4, { height: 1.62, shirt: 0x8e6bb0, pants: 0x4d4a5c, hairStyle: 'bob', hair: 0xd8d8d8, glasses: true, mood: 'smile', activity: 'coffee' });
    this.addLights({ sunPos: new THREE.Vector3(5, 6, 3), center: new THREE.Vector3(0, 0, 0), size: 4.5, hemi: 1.8 });
  }

  /** Bekers en hoedjes bijwerken met de voortgang. */
  refresh(starCount, isUnlocked) {
    this.cups.forEach((c, i) => (c.visible = i < starCount));
    this.hatStands.forEach((s, i) => (s.model.visible = isUnlocked(HATS[i])));
  }

  update(dt, time) {
    this.animateCollectibles(dt, time);
    this.hatStands.forEach((s, i) => (s.model.rotation.y = time * 0.8 + i));
    return false;
  }
}
