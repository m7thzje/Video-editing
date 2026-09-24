import * as THREE from 'three';
import { Area, makeSign } from '../world/area.js';
import { Clouds, makeSkyDome } from '../world/fx.js';
import { makeCar, makeCityView, makeDS3, makeGroningenFlag } from '../world/groningen.js';
import { lambert, M } from '../world/materials.js';
import { worldTexture } from '../world/phototex.js';

// De galerij op de 9e verdieping: een lange buitengang met balustrade en uitzicht over
// Groningen (met de Martinitoren). Hier zitten de voordeur van Puck, de deur van de
// chagrijnige buurvrouw (het Pistachehuis) en aan het eind de lift naar beneden.
//
// De galerij loopt van x 0..32, z 0..1.8 (open kant = +z). Plafond op 2.6.

const L = 32;
const W = 1.8;
const H = 2.6;
export const GALLERY_DOORS = { puck: 3.5, buurvrouw: 7.5, lift: 29.8 };

const P = {
  floor: worldTexture(lambert(0xffffff), 'concrete', 2, 0xdfe2e4),
  joint: lambert(0x2a2c2e),
  beam: lambert(0xf6f5f1, { emissive: 0x77766f }),
  ceiling: lambert(0xf2f1ec, { emissive: 0x8f8d86 }),
  gutter: lambert(0x1f2123),
  panel: lambert(0x3a5486),
  frame: lambert(0xf4f1ea),
  glass: Object.assign(lambert(0x9fb4c4, { emissive: 0x3b5266, emissiveIntensity: 0.35 }), { userData: { night: 'window' } }),
  red: lambert(0xb3121f),
  concrete: lambert(0xd8d2c6),
  concreteDark: lambert(0xb3ac9f),
  tiles: lambert(0x9d978c),
  railing: lambert(0xa9b0b3),
  wall: lambert(0xf1f0eb),
  door: lambert(0x2a2b2e),
  doorGreen: lambert(0x4d6660),
  doorRed: lambert(0x8e3b36),
  steel: lambert(0xb7bec4, { emissive: 0x30363b, emissiveIntensity: 0.2 }),
  button: lambert(0xf2c230, { emissive: 0xf2a000, emissiveIntensity: 0.6 }),
};

export class Gallery extends Area {
  constructor(opts) {
    super('galerij', opts);
    this.background = new THREE.Color(0xbfe6ff);
    this.fog = new THREE.Fog(0xe4eef0, 40, 170);
    this.cameraDistance = 1.9;
    this.cameraBounds = { minX: -0.4, maxX: L + 0.4, minZ: 0.15, maxZ: W - 0.1, minY: 0.15, maxY: H - 0.15 };

    this.addSpawn('puck', GALLERY_DOORS.puck + 0.45, 0, 0.6, Math.PI / 2);
    this.spawns.puck.camYaw = -Math.PI / 2 + 0.5;
    this.addSpawn('buurvrouw', GALLERY_DOORS.buurvrouw + 0.45, 0, 0.6, Math.PI / 2);
    this.spawns.buurvrouw.camYaw = -Math.PI / 2 + 0.5;
    this.addSpawn('lift', GALLERY_DOORS.lift + 0.45, 0, 0.65, -Math.PI / 2);
    this.spawns.lift.camYaw = Math.PI / 2 - 0.5;

    const door = (x, to, spawn) => this.portals.push({ x0: x, z0: -0.5, x1: x + 0.9, z1: 0.2, to, spawn });
    door(GALLERY_DOORS.puck, 'puckhuis', 'voordeur');
    door(GALLERY_DOORS.buurvrouw, 'pistachehuis', 'deur');
    door(GALLERY_DOORS.lift, 'lift', 'binnen');

    this.buildStructure();
    this.buildDoors();
    this.buildDecor();
    this.buildView();
    this.addLights({ sunPos: new THREE.Vector3(-12, 16, 18), center: new THREE.Vector3(L / 2, 0, 1), size: 18, hemi: 1.6 });
  }

  buildStructure() {
    // Grijze betonvloer met donkere naden
    this.block(-0.5, -0.3, -0.2, L + 0.5, 0, W + 0.35, P.floor, { collide: false, shadow: false });
    for (let x = 1.5; x < L; x += 3.2) this.block(x, 0, 0, x + 0.05, 0.004, W, P.joint, { collide: false, shadow: false });
    // Galerij erboven: plafond met witte uitkragende liggers en een zwarte goot
    this.block(-0.5, H, -0.2, L + 0.5, H + 0.3, W + 0.4, P.ceiling, { collide: false });
    // Kopse rand van de galerij erboven, met de zwarte goot eronder (zoals op de foto)
    this.block(-0.5, H - 0.05, W + 0.3, L + 0.5, H + 0.3, W + 0.45, P.beam, { collide: false });
    this.block(-0.5, H - 0.2, W + 0.3, L + 0.5, H - 0.05, W + 0.36, P.gutter, { collide: false });
    for (let x = 0; x <= L; x += 3.2) this.block(x - 0.12, H - 0.3, -0.1, x + 0.12, H, W + 0.4, P.beam, { collide: false });
    const gutter = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, L + 1, 6), P.gutter);
    gutter.rotation.z = Math.PI / 2;
    gutter.position.set(L / 2, H - 0.12, W + 0.36);
    this.group.add(gutter);
    // Achterwand en kopse kanten
    this.block(-0.5, 0, -0.5, L + 0.5, H, 0, P.wall, { shadow: false, name: 'muur' });
    this.block(-0.8, 0, -0.5, -0.5, H, W + 0.4, P.concreteDark, { name: 'muur' });
    this.block(L + 0.5, 0, -0.5, L + 0.8, H, W + 0.4, P.concreteDark, { name: 'muur' });
    // Balustrade: betonnen rand, gegalvaniseerde reling met ronde spijlen en stalen steunpalen.
    // Onzichtbare hoge botsvorm: Puck valt nooit naar beneden.
    this.block(-0.5, 0, W, L + 0.5, 0.12, W + 0.3, P.concreteDark, { collide: false });
    this.addCollider(-0.5, 0, W, L + 0.5, 3.0, W + 0.35, { name: 'balustrade', camIgnore: true });
    // Platte bovenregel en onderregel, daartussen dichte ronde spijlen, elke 3 regels een staander
    this.block(-0.5, 1.02, W + 0.1, L + 0.5, 1.08, W + 0.2, P.railing, { collide: false });
    this.block(-0.5, 0.2, W + 0.12, L + 0.5, 0.24, W + 0.18, P.railing, { collide: false });
    const count = Math.floor((L + 1) / 0.11);
    const bars = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.82, 5), P.railing, count);
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) bars.setMatrixAt(i, m.makeTranslation(-0.5 + i * 0.11, 0.62, W + 0.15));
    bars.castShadow = true;
    this.group.add(bars);
    for (let x = 0; x <= L; x += 1.6) this.block(x - 0.025, 0.12, W + 0.1, x + 0.025, 1.02, W + 0.2, P.railing, { collide: false });
    // Ronde stalen kolommen tot aan het plafond, vlak achter de reling
    for (let x = 0; x <= L; x += 6.4) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, H, 10), P.railing);
      post.position.set(x, H / 2, W + 0.02);
      post.castShadow = true;
      this.group.add(post);
      this.addCollider(x - 0.06, 0, W - 0.04, x + 0.06, H, W + 0.08, { name: 'kolom' });
    }
    // Ramen met witte kozijnen en donkerblauwe borstwering tussen de deuren
    const doorXs = [GALLERY_DOORS.puck, 7.5, GALLERY_DOORS.buurvrouw, 17, 21.5, 25.5, GALLERY_DOORS.lift];
    for (let x = -0.3; x < L; x += 1.25) {
      if (doorXs.some((d) => x + 1.2 > d - 0.35 && x < d + 1.6)) continue;
      this.block(x, 0.1, 0.0, x + 1.2, 0.95, 0.03, P.panel, { collide: false, shadow: false });
      this.block(x, 0.05, 0.0, x + 1.2, 0.1, 0.06, P.frame, { collide: false, shadow: false });
      this.block(x + 0.06, 1.05, 0.0, x + 1.14, 2.35, 0.025, P.glass, { collide: false, shadow: false });
      this.block(x, 1.98, 0.0, x + 1.2, 2.03, 0.05, P.frame, { collide: false, shadow: false });
      this.block(x, 0.95, 0.0, x + 1.2, 1.05, 0.05, P.frame, { collide: false, shadow: false });
      this.block(x, 2.35, 0.0, x + 1.2, 2.45, 0.05, P.frame, { collide: false, shadow: false });
      this.block(x, 0.95, 0.0, x + 0.06, 2.45, 0.05, P.frame, { collide: false, shadow: false });
      this.block(x + 1.14, 0.95, 0.0, x + 1.2, 2.45, 0.05, P.frame, { collide: false, shadow: false });
    }
  }

  buildDoors() {
    const door = (x, mat, number, name) => {
      this.block(x - 0.06, 0, -0.02, x + 0.96, 2.18, 0.01, M.white, { collide: false, shadow: false });
      this.block(x, 0, 0, x + 0.9, 2.1, 0.03, mat, { collide: false, shadow: false });
      this.block(x + 0.42, 0.7, 0.03, x + 0.48, 1.8, 0.035, lambert(0xf6f3e6, { emissive: 0xfff2cc, emissiveIntensity: 0.4 }), { collide: false, shadow: false });
      const knob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), M.metal);
      knob.position.set(x + 0.78, 1.0, 0.06);
      this.group.add(knob);
      const s = makeSign([`${number}`, name].filter(Boolean), { width: 0.42, height: name ? 0.26 : 0.16, bg: '#f4f1ea' });
      s.position.set(x + 1.25, 1.55, 0.02);
      this.group.add(s);
    };
    door(GALLERY_DOORS.puck, P.door, 'nr. 141', 'Puck 🦜');
    door(GALLERY_DOORS.buurvrouw, P.doorRed, 'nr. 143', 'Mw. Zuur');
    door(12.5, P.doorGreen, 'nr. 145');
    door(17, P.door, 'nr. 147');
    door(21.5, P.doorGreen, 'nr. 149');
    // Deurmatten
    const mat = (x, text) => {
      const m = makeSign(text, { width: 0.7, height: 0.45, bg: '#6b4423', fg: '#f3c98b', border: '#4a2f18' });
      m.rotation.x = -Math.PI / 2;
      m.position.set(x + 0.45, 0.01, 0.35);
      this.group.add(m);
    };
    mat(GALLERY_DOORS.puck, 'Moi!');
    mat(GALLERY_DOORS.buurvrouw, 'WEG!');
    this.zones.push({ x: GALLERY_DOORS.buurvrouw + 0.45, y: 0, z: 0.35, r: 0.35, h: 0.5, secret: 'deurmat', say: 'WEG? Watskebeurt? Mag ik een koekje?' });

    // Lift aan het eind: stalen deuren met knopje en verdiepingsbordje
    const x = GALLERY_DOORS.lift;
    // Rode liftdeuren in een rode omlijsting (zoals op de foto)
    this.block(x - 0.2, 0, -0.02, x - 0.05, 2.3, 0.12, P.red, { collide: false });
    this.block(x + 0.95, 0, -0.02, x + 1.1, 2.3, 0.12, P.red, { collide: false });
    this.block(x - 0.2, 2.15, -0.02, x + 1.1, 2.3, 0.12, P.red, { collide: false });
    this.liftDoors = [0, 1].map((i) => this.block(x - 0.05 + i * 0.5, 0, 0, x + 0.45 + i * 0.5, 2.15, 0.03, P.red, { collide: false, shadow: false }));
    this.block(x + 0.44, 0, 0.03, x + 0.46, 2.15, 0.035, lambert(0x6e0b12), { collide: false, shadow: false });
    this.block(x + 1.0, 1.0, 0.12, x + 1.08, 1.2, 0.13, M.metal, { collide: false, shadow: false });
    const btn = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), P.button);
    btn.position.set(x + 1.04, 1.1, 0.135);
    this.group.add(btn);
    const sign = makeSign(['LIFT ⬇', '9e verdieping'], { width: 0.7, height: 0.3, bg: '#222', fg: '#9ef08a', border: '#555' });
    sign.position.set(x + 0.45, 2.45, 0.03);
    this.group.add(sign);
    // Trappenhuis (dicht)
    this.block(25.5, 0, 0, 26.4, 2.1, 0.03, P.concreteDark, { collide: false, shadow: false });
    const tr = makeSign('Trappenhuis', { width: 0.7, height: 0.16, bg: '#2f6e4a', fg: '#fff', border: '#1d4a30' });
    tr.position.set(25.95, 2.3, 0.03);
    this.group.add(tr);
  }

  buildDecor() {
    // Plantenbakken en een scootmobiel: dingen om op te klimmen onderweg
    [[1.2, 0.35], [9.8, 0.3], [15.2, 0.35], [19.6, 0.3], [24.2, 0.35]].forEach(([x, r], i) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 0.5, 8), i % 2 ? M.pot : lambert(0xe7e3da));
      pot.position.set(x, 0.25, 0.45);
      pot.castShadow = true;
      this.group.add(pot);
      this.addCollider(x - r, 0, 0.45 - r, x + r, 0.5, 0.45 + r, { climbable: true, name: 'plantenbak' });
      this.leafCluster(x, 0.8, 0.45, 0.3);
    });
    // Een kartonnen doos op de galerij (zoals op de foto). Een pakketje voor Puck?
    this.block(22.9, 0, 0.35, 23.4, 0.35, 0.8, M.cardboard, { climbable: true, name: 'pakketje' });
    this.block(22.9, 0.35, 0.55, 23.4, 0.36, 0.6, M.tape, { collide: false, shadow: false });
    this.zones.push({ x: 23.15, y: 0.35, z: 0.57, r: 0.3, h: 0.4, secret: 'pakketje', say: 'Een pakketje! Voor Puck? Mag ik een koekje?' });
    // Bankje met krant
    this.block(26.8, 0.4, 0.1, 28.4, 0.46, 0.55, M.wood, { climbable: true, name: 'bankje' });
    this.addCollider(26.85, 0, 0.15, 28.35, 0.4, 0.5, { climbable: true });
    this.block(27.3, 0.46, 0.2, 27.7, 0.47, 0.45, M.white, { collide: false });
    // Buurman Klaas zit op het bankje
    this.addNPC('klaas', 'Buurman Klaas', 27.9, 0.2, 0, { sitting: true, shirt: 0x8c5a4a, pants: 0x3a3d40, hairStyle: 'bald', beard: true, hair: 0xd8d8d8, glasses: true, activity: 'coffee' }, { solid: false, r: 0.9 });
    // Groningse vlag aan de pilaar
    const flag = makeGroningenFlag(2.2);
    flag.position.set(16.2, 0.2, W + 0.2);
    flag.rotation.y = -Math.PI / 2;
    this.group.add(flag);
    this.fx.push(flag);
    // Uitzicht-plekje op de balustrade-bank: de Martinitoren!
    this.block(18.2, 0.4, 1.25, 19.4, 0.5, 1.75, M.woodLight, { climbable: true, name: 'opstapje' });
    this.addCollider(18.25, 0, 1.3, 19.35, 0.4, 1.7, { climbable: true });
    this.zones.push({ x: 18.8, y: 0.5, z: 1.5, r: 0.6, h: 0.5, secret: 'martini', say: 'Watskebeurt? De Martinitoren!' });
    // Bordje "Er gaat niets boven Groningen"
    const s = makeSign(['Er gaat niets', 'boven Groningen!'], { width: 1.3, height: 0.5, bg: '#e8f3d6', fg: '#1f6e3c', border: '#1f8a4c' });
    s.position.set(6.3, 1.6, 0.02);
    this.group.add(s);
  }

  buildView() {
    this.group.add(makeSkyDome(new THREE.Vector3(-12, 16, 18)));
    this.fx.push(new Clouds(this.group));
    const city = makeCityView(-25, { towerPos: new THREE.Vector3(14, 0, 60), exclude: (x, z) => z < 6 });
    city.position.x = L / 2;
    this.group.add(city);
    // Recht beneden: grasstrook, parkeervakken met klinkers, de weg en Puck's witte DS3
    const below = -25;
    const strip = (z0, z1, mat) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L + 60, z1 - z0), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(L / 2, below + 0.02, (z0 + z1) / 2);
      this.group.add(m);
    };
    strip(2, 9, M.grass);
    strip(9, 10, lambert(0x9a9a98));
    strip(10, 14.5, lambert(0x8a6e62));
    strip(14.5, 21, lambert(0x55585c));
    const cols = [0x2b2f36, 0xb3261e, 0xdadada, 0x1f4f9c, 0x3a3d40, 0x8c1c2c];
    for (let i = 0; i < 14; i++) {
      const x = -4 + i * 2.6;
      if (i === 7) {
        const ds3 = makeDS3();
        ds3.position.set(x, below, 12.2);
        ds3.rotation.y = Math.PI + 0.12;
        this.group.add(ds3);
        continue;
      }
      if (i % 5 === 3) continue;
      const car = makeCar(cols[i % cols.length]);
      car.position.set(x, below, 12.2);
      car.rotation.y = Math.PI + (i % 2 ? 0.05 : -0.05);
      this.group.add(car);
    }
  }

  update(dt, time) {
    this.animateCollectibles(dt, time);
    return false;
  }
}
