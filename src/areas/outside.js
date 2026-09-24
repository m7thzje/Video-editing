import * as THREE from 'three';
import { applyWind, Birds, bunting, Butterflies, Clouds, Fountain, makeSkyDome, waterTexture } from '../world/fx.js';
import { Area, glowSprite, makeFeather, makeFries, makeHaafsBoard, makePistachio, makeSign } from '../world/area.js';
import { makeBike, makeCanalHouse, makeCar, makeCityView, makeDS3, makeGroningenFlag, makeMartinitoren } from '../world/groningen.js';
import { greyBrickTexture, mailboxTexture, pavingTexture, redBrickPavingTexture, terrazzoTexture } from '../textures.js';
import { lambert, M } from '../world/materials.js';
import { BoxSmash, Pigeons, RingRace, Rival, Walker } from '../minigames.js';
import { makePerson } from '../world/people.js';

// De open wereld rond Puck's flat. Hier liggen de toegangen tot de minigames:
//   - Pistachehuis (deur)                       -> 10 pistachenootjes zoeken
//   - Verenjacht                                -> 8 rode veren door de hele buurt
//   - Stapstenen over de vijver                 -> parcours op tijd
//   - De merel in de grote boom                 -> liedjes nazingen
// Plus patatkramen (superkracht!) en een hoop geheimpjes.

const SIZE = 30; // wereld loopt van -30..30
export const POND = { x: 10, z: 8, r: 5.5 };
const CANAL = { z0: 22.5, z1: 26.4 };
const STONE_START = new THREE.Vector3(3.7, 0, 8);
export const STONE_TARGET_TIME = 18;

export class Outside extends Area {
  constructor(opts) {
    super('buiten', opts);
    this.background = new THREE.Color(0xbfe6ff);
    this.fog = new THREE.Fog(0xe4eef0, 35, 150);
    this.walkSpeed = 2.6;
    this.cameraDistance = 2.3;
    this.cameraBounds = { minX: -SIZE + 0.5, maxX: SIZE - 0.5, minZ: -SIZE + 0.5, maxZ: SIZE - 0.5, minY: 0.15, maxY: 14 };

    this.addSpawn('lift', 0, 0, -14.3, 0);
    this.spawns.lift.camYaw = 0.5;
    this.addSpawn('bakkerij', -11.2, 0, 5.55, Math.PI / 2);
    this.addSpawn('vijver', STONE_START.x, 0, STONE_START.z, Math.PI / 2);

    this.stoneRun = { active: false, time: 0, next: 0, best: null };
    this.checkpoints = [];
    this.duck = null;
    this.merel = null;

    this.buildGround();
    this.buildFlat();
    this.buildPistachioHouse();
    this.buildPond();
    this.buildMerelTree();
    this.buildShed();
    this.buildBikeShed();
    this.buildPlaza();
    this.buildBorder();
    this.buildTrees();
    this.buildFlowers();
    this.buildFeathers();
    this.buildFries();
    this.buildAtmosphere();
    this.buildGroningen();
    this.buildIngredients();
    this.buildJumbo();
    this.buildTower();
    this.buildPeople();
    this.buildStage();
    this.addLights({ sunPos: new THREE.Vector3(-18, 30, 14), center: new THREE.Vector3(0, 0, 0), size: 31, sun: 2.4, hemi: 1.5 });
  }

  // ---------- Hulpjes ----------

  prism(w, h, d, mat) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, h);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    geo.translate(0, 0, -d / 2);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  pathStrip(x0, z0, x1, z1, w = 1.4) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), M.path);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(x1 - x0, z1 - z0);
    m.position.set((x0 + x1) / 2, 0.004, (z0 + z1) / 2);
    m.receiveShadow = true;
    this.group.add(m);
  }

  sign(lines, x, y, z, ry, opts) {
    const s = makeSign(lines, opts);
    s.position.set(x, y, z);
    s.rotation.y = ry;
    this.group.add(s);
    return s;
  }

  /** Beklimbare boom met een paar takken om op te staan. */
  climbTree(x, z, height, branches = []) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, height, 7), M.trunk);
    trunk.position.set(x, height / 2, z);
    trunk.castShadow = true;
    this.group.add(trunk);
    this.addCollider(x - 0.18, 0, z - 0.18, x + 0.18, height, z + 0.18, { climbable: true, name: 'boom' });
    for (const [y, dx, dz, len] of branches) {
      const ex = x + dx * len;
      const ez = z + dz * len;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, len, 5), M.trunk);
      b.position.set((x + ex) / 2, y, (z + ez) / 2);
      if (dx) b.rotation.z = Math.PI / 2;
      if (dz) b.rotation.x = Math.PI / 2;
      b.castShadow = true;
      this.group.add(b);
      this.addCollider(Math.min(x, ex) - 0.12, y - 0.05, Math.min(z, ez) - 0.12, Math.max(x, ex) + 0.12, y + 0.05, Math.max(z, ez) + 0.12, { oneWay: true, name: 'tak' });
      this.leafCluster(ex, y + 0.45, ez, 0.45);
    }
    this.leafCluster(x, height + 0.4, z, 1.2);
    this.leafCluster(x + 0.6, height, z - 0.4, 0.9);
    this.addCollider(x - 0.6, height - 0.05, z - 0.6, x + 0.6, height, z + 0.6, { oneWay: true, name: 'kruin' });
  }

  // ---------- Onderdelen ----------

  buildGround() {
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * 2 + 40, SIZE * 2 + 40), M.grass);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.group.add(grass);
    // Paden
    this.pathStrip(0, -16, 0, 0);
    this.pathStrip(0, 0, -11.5, 5.5);
    this.pathStrip(0, 0, 3.5, 8);
    this.pathStrip(0, 0, 15, -7);
    this.pathStrip(0, -8, -17, -11);
    this.pathStrip(0, 0, 0, 20);
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(3.2, 16), M.path);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.006;
    this.group.add(plaza);
  }

  buildFlat() {
    // De flat in Groningen: 10 verdiepingen met galerijen. Puck woont op de 9e.
    const x0 = -8;
    const x1 = 8;
    const z0 = -24;
    const z1 = -16;
    const floors = 10;
    const fh = 2.8;
    const h = floors * fh;
    this.block(x0, 0, z0, x1, h, z1, lambert(0xd9c7ae), { climbable: false, name: 'flat' });
    this.block(x0 - 0.2, h, z0 - 0.2, x1 + 0.2, h + 0.4, z1 + 0.2, lambert(0x8c7a66), { collide: false });
    // Ramen
    const wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.4, 1.2), M.windowBlue, floors * 8);
    const m = new THREE.Matrix4();
    let i = 0;
    for (let f = 0; f < floors; f++) {
      for (let k = 0; k < 8; k++) wins.setMatrixAt(i++, m.makeTranslation(x0 + 1 + k * 2, 1.8 + f * fh, z1 + 0.01));
    }
    this.group.add(wins);
    // Galerijen met balustrade op elke verdieping
    for (let f = 1; f < floors; f++) {
      this.block(x0 - 0.3, f * fh - 0.1, z1, x1 + 0.3, f * fh + 0.1, z1 + 1.8, lambert(0xefe9dd), { collide: false });
      this.block(x0 - 0.3, f * fh + 0.1, z1 + 1.7, x1 + 0.3, f * fh + 0.65, z1 + 1.85, lambert(0xd8d2c6), { collide: false, shadow: false });
      this.block(x0 - 0.3, f * fh + 1.0, z1 + 1.75, x1 + 0.3, f * fh + 1.06, z1 + 1.85, lambert(0x3c4a52), { collide: false, shadow: false });
    }
    // Liftschacht aan de zijkant
    this.block(x0 - 2.2, 0, z1 - 3, x0, h + 1.6, z1, lambert(0xb3ac9f), { name: 'liftschacht' });
    // Puck's galerij (9e): Groningse vlag en een rood gordijntje
    const y9 = 9 * fh;
    this.block(-4.9, y9 + 1.25, z1 + 0.02, -4.1, y9 + 2.35, z1 + 0.05, M.red, { collide: false, shadow: false });
    const flag = makeGroningenFlag(2.2);
    flag.position.set(-4.5, y9 + 0.65, z1 + 1.8);
    this.group.add(flag);
    this.fx.push(flag);
    this.buildFlatGround(x0, x1, z1, fh, floors);
  }

  /** Begane grond van de Donderslaanflat, naar de foto's. */
  buildFlatGround(x0, x1, z1, fh, floors) {
    // Lichtgrijze bakstenen plint met witte bergingsdeuren, lampjes en smalle raampjes
    const plinth = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, fh), new THREE.MeshLambertMaterial({ map: greyBrickTexture([10, 2]) }));
    plinth.position.set(0, fh / 2, z1 + 0.02);
    this.group.add(plinth);
    const lampMat = lambert(0xffd89a, { emissive: 0xffb050, emissiveIntensity: 1.2 });
    lampMat.userData.night = 'lamp';
    [-6.6, -4.3, 4.1, 6.9].forEach((x) => {
      this.block(x - 0.45, 0, z1, x + 0.45, 2.05, z1 + 0.05, lambert(0xf6f4ef), { collide: false, shadow: false });
      this.block(x + 0.3, 0.95, z1 + 0.05, x + 0.36, 1.05, z1 + 0.08, M.metalDark, { collide: false, shadow: false });
      this.block(x - 0.2, 2.2, z1, x + 0.2, 2.32, z1 + 0.1, lampMat, { collide: false, shadow: false });
      const glow = glowSprite(0xffc070, 1.1, 0.6);
      glow.position.set(x, 2.26, z1 + 0.15);
      this.group.add(glow);
    });
    [-5.45, 5.5].forEach((x) => {
      this.block(x - 0.6, 1.9, z1, x + 0.6, 2.25, z1 + 0.04, M.white, { collide: false, shadow: false });
      this.block(x - 0.55, 1.93, z1 + 0.04, x + 0.55, 2.22, z1 + 0.05, M.windowBlue, { collide: false, shadow: false });
    });
    // Verticale spijlen op alle galerijen (instanced)
    const barsPer = Math.floor((x1 - x0 + 0.6) / 0.25);
    const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.9, 0.03), lambert(0xe4e2dc), barsPer * (floors - 1));
    const m = new THREE.Matrix4();
    let n = 0;
    for (let f = 1; f < floors; f++) {
      for (let k = 0; k < barsPer; k++) bars.setMatrixAt(n++, m.makeTranslation(x0 - 0.3 + k * 0.25, f * fh + 0.55, z1 + 1.78));
    }
    this.group.add(bars);

    // Glazen entreehal met brievenbussen, witte band "donderslaanflat" en rode baksteen erboven
    const hx0 = -2;
    const hx1 = 2;
    const hz = z1 + 1.1;
    this.block(hx0, 0, z1, hx1, 2.6, hz, M.glass, { collide: false, shadow: false });
    this.addCollider(hx0, 0, z1, hx1, 2.6, hz, { name: 'entree' });
    const mail = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.6), new THREE.MeshLambertMaterial({ map: mailboxTexture() }));
    mail.position.set(0, 1.2, z1 + 0.04);
    this.group.add(mail);
    [hx0, -0.62, 0.62, hx1].forEach((x) => this.block(x - 0.04, 0, hz - 0.04, x + 0.04, 2.6, hz + 0.02, lambert(0x2b2f36), { collide: false, shadow: false }));
    this.block(hx0 - 0.4, fh + 0.1, z1 + 1.86, hx1 + 1.2, fh + 0.7, z1 + 1.9, M.white, { collide: false, shadow: false });
    const title = makeSign('donderslaanflat', { width: 3.6, height: 0.5, bg: '#ffffff', fg: '#1b1b1d', border: '#ffffff' });
    title.position.set(0.4, fh + 0.4, z1 + 1.91);
    this.group.add(title);
    this.block(hx0, 3.2, z1, hx1 + 2, fh * 2, z1 + 0.05, lambert(0x8e4a36), { collide: false, shadow: false });
    // Wit paneel naast de hal
    this.block(0.75, 0.35, hz + 0.02, hx1, 1.95, hz + 0.12, M.white, { name: 'paneel' });
    this.block(0.85, 0, hz + 0.04, 0.93, 0.35, hz + 0.1, lambert(0x2b2f36), { collide: false });
    this.block(1.82, 0, hz + 0.04, 1.9, 0.35, hz + 0.1, lambert(0x2b2f36), { collide: false });
    // Lift achter de glazen deuren
    this.block(-0.55, 0, z1 + 0.02, 0.55, 2.1, z1 + 0.05, lambert(0xb7bec4, { emissive: 0x30363b, emissiveIntensity: 0.2 }), { collide: false, shadow: false });
    this.portals.push({ x0: -0.62, z0: hz - 0.6, x1: 0.62, z1: hz + 0.35, to: 'lift', spawn: 'binnen' });
    const liftSign = makeSign('🛗 LIFT', { width: 0.6, height: 0.2, bg: '#222', fg: '#9ef08a', border: '#555' });
    liftSign.position.set(0, 2.35, hz + 0.03);
    this.group.add(liftSign);

    // Pad: rode klinkers + grindtegels met een betonnen paaltje, hedera en struiken
    const path = (xa, xb, tex) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(xb - xa, 3.4), new THREE.MeshLambertMaterial({ map: tex }));
      p.rotation.x = -Math.PI / 2;
      p.position.set((xa + xb) / 2, 0.012, hz + 1.7);
      p.receiveShadow = true;
      this.group.add(p);
    };
    path(-1.5, -0.5, redBrickPavingTexture([2, 7]));
    path(-0.5, 0.5, terrazzoTexture([1, 5]));
    path(0.5, 1.5, redBrickPavingTexture([2, 7]));
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.65, 8), M.stone);
    bollard.position.set(0, 0.325, hz + 2.3);
    bollard.castShadow = true;
    this.group.add(bollard);
    this.addCollider(-0.1, 0, hz + 2.2, 0.1, 0.65, hz + 2.4, { climbable: true, name: 'paaltje' });
    const ivy = lambert(0x355e2e);
    this.block(-4.2, 0, hz, -1.6, 0.18, hz + 2.6, lambert(0xa9a39a), { name: 'plantenbak' });
    this.block(-4.15, 0.18, hz + 0.05, -1.65, 0.24, hz + 2.55, ivy, { collide: false });
    this.block(1.6, 0, hz, 2.6, 0.18, hz + 0.9, lambert(0xa9a39a), { name: 'plantenbak' });
    [[-3.4, hz + 1.4, 0.8], [-2.4, hz + 0.9, 0.6], [-3.6, hz + 0.5, 0.55]].forEach(([bx, bz, r]) => {
      this.leafCluster(bx, 0.2 + r * 0.6, bz, r);
      this.addCollider(bx - r * 0.6, 0, bz - r * 0.6, bx + r * 0.6, r * 1.1, bz + r * 0.6, { climbable: true, name: 'struik' });
    });
    // Twee slanke coniferen
    [z1 + 0.45, z1 + 1.05].forEach((cz) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.32, 3.2, 7), lambert(0x21432a));
      c.position.set(2.35, 1.7, cz);
      c.castShadow = true;
      this.group.add(c);
      this.addCollider(2.2, 0, cz - 0.15, 2.5, 3.0, cz + 0.15, { climbable: true, name: 'conifeer' });
    });
    // Lange rij fietsen tegen de gevel (ook een mintgroene)
    const bikeColors = [0, 2, 0, 5, 1, 0, 3];
    for (let k = 0; k < 7; k++) {
      const b = makeBike(bikeColors[k]);
      b.rotation.y = Math.PI / 2 + (k % 2 ? 0.08 : -0.08);
      const bx = 2.8 + k * 0.75 + 0.3;
      b.position.set(bx, 0, z1 + 0.85);
      this.group.add(b);
      this.addCollider(bx - 0.15, 0, z1 + 0.3, bx + 0.15, 0.8, z1 + 1.4, { climbable: true, name: 'fiets' });
    }
    const mint = makeBike(0);
    mint.children[0].material = lambert(0x7fd6c2);
    mint.rotation.y = Math.PI / 2;
    mint.position.set(8.35, 0, z1 + 0.85);
    this.group.add(mint);
    this.addCollider(8.2, 0, z1 + 0.3, 8.5, 0.8, z1 + 1.4, { climbable: true, name: 'fiets' });
    this.zones.push({ x: 5.4, y: 0, z: z1 + 1.7, r: 0.5, h: 1, secret: 'fietsbel', say: 'Tring tring! Watskebeurt?' });

    // Stoeptegels, straatnaambord en een parkeerplaats met auto's
    const pave = new THREE.Mesh(new THREE.PlaneGeometry(22, 5), new THREE.MeshLambertMaterial({ map: pavingTexture([22, 5]) }));
    pave.rotation.x = -Math.PI / 2;
    pave.position.set(1, 0.006, z1 + 2.5);
    pave.receiveShadow = true;
    this.group.add(pave);
    this.block(-6.05, 0, z1 + 4.4, -5.95, 2.4, z1 + 4.5, M.metalDark, { climbable: true, name: 'paal' });
    const street = makeSign('Donderslaan', { width: 1.0, height: 0.25, bg: '#1f4f9c', fg: '#ffffff', border: '#ffffff' });
    street.position.set(-6, 2.25, z1 + 4.52);
    this.group.add(street);
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), lambert(0x6f7174));
    lot.rotation.x = -Math.PI / 2;
    lot.position.set(11.8, 0.005, z1 + 4.5);
    lot.receiveShadow = true;
    this.group.add(lot);
    const bays = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 4.4), new THREE.MeshLambertMaterial({ map: redBrickPavingTexture([8, 6]) }));
    bays.rotation.x = -Math.PI / 2;
    bays.position.set(11.8, 0.008, z1 + 4.5);
    this.group.add(bays);
    [[9.8, 0x3a3d40], [11.8, 'ds3'], [13.8, 0xb3261e]].forEach(([cx, col]) => {
      const car = col === 'ds3' ? makeDS3() : makeCar(col);
      car.position.set(cx, 0, z1 + 4.5);
      if (col === 'ds3') car.rotation.y = 0.2; // scheef geparkeerd, net als op de foto
      this.group.add(car);
      this.addCollider(cx - 0.85, 0, z1 + 2.55, cx + 0.85, 0.85, z1 + 6.45, { climbable: true, name: 'auto' });
      this.addCollider(cx - 0.75, 0.85, z1 + 3.25, cx + 0.75, 1.4, z1 + 5.35, { climbable: true, name: 'auto' });
    });
    this.zones.push({ x: 11.8, y: 0, z: z1 + 2.2, r: 0.8, h: 1.6, secret: 'ds3', say: 'Watskebeurt? Mijn DS3! P-UCK-141' });
    this.sign(['🦜 Puck', 'parkeerplaats'], 11.8, 0.9, z1 + 6.9, Math.PI, { width: 0.8, height: 0.35 });
    this.block(11.75, 0, z1 + 6.95, 11.85, 0.7, z1 + 7.05, M.metalDark, { collide: false });
    // Brievenbus op de hoek
    this.block(-4.6, 0, z1 + 3.3, -4.5, 0.9, z1 + 3.4, M.metalDark, { collide: false });
    this.block(-4.8, 0.9, z1 + 3.15, -4.3, 1.1, z1 + 3.55, M.red, { climbable: true, name: 'brievenbus' });
    this.addCollider(-4.6, 0, z1 + 3.3, -4.5, 0.9, z1 + 3.4, { climbable: true });
  }

  buildPistachioHouse() {
    const x0 = -20;
    const x1 = -12;
    const z0 = 2;
    const z1 = 9;
    const h = 3;
    this.block(x0, 0, z0, x1, h, z1, M.brick, { name: 'pistachehuis' });
    const roof = this.prism(z1 - z0 + 0.8, 2.2, x1 - x0 + 0.8, M.roof);
    roof.rotation.y = Math.PI / 2;
    roof.position.set((x0 + x1) / 2, h, (z0 + z1) / 2);
    this.group.add(roof);
    // Deur op de oostgevel (kant van het pad)
    this.block(x1, 0, 5.1, x1 + 0.06, 2.1, 6.0, lambert(0x9fc7c1), { collide: false });
    this.block(x1, 2.1, 4.95, x1 + 0.1, 2.25, 6.15, M.white, { collide: false });
    const knob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), M.gold);
    knob.position.set(x1 + 0.08, 1.0, 5.85);
    this.group.add(knob);
    [[3.2, 1.2], [7.6, 1.2]].forEach(([z]) => {
      this.block(x1, 1.1, z - 0.6, x1 + 0.03, 2.2, z + 0.6, M.windowBlue, { collide: false, shadow: false });
      this.block(x1, 1.0, z - 0.7, x1 + 0.2, 1.1, z + 0.7, M.white, { collide: false });
    });
    this.portals.push({ x0: x1 - 0.5, z0: 5.1, x1: x1 + 0.3, z1: 6.0, to: 'bakkerij', spawn: 'deur' });
    // Gevelbord van Bakkerij Haafs: logo op zwarte achtergrond, steekt boven de dakrand uit
    const board = makeHaafsBoard(2.6);
    board.rotation.y = Math.PI / 2;
    board.position.set(x1 + 0.1, 3.05, 5.55);
    this.group.add(board);
    this.pistachioMarker = glowSprite(0xffc34a, 1.1, 0.4);
    this.pistachioMarker.position.set(x1 + 0.5, 2.35, 5.55);
    this.group.add(this.pistachioMarker);
    // Bloembak
    this.block(x1, 0, 6.3, x1 + 0.4, 0.35, 8.5, M.woodDark, { climbable: true });
  }

  buildPond() {
    const { x, z, r } = POND;
    const edge = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.4, r + 0.4, 0.06, 20), M.stoneDark);
    edge.position.set(x, 0.01, z);
    this.group.add(edge);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 20), M.water);
    water.position.set(x, 0.03, z);
    water.receiveShadow = true;
    this.group.add(water);
    this.water = water;

    // Stapstenen
    const stones = [
      [5.3, 8.0], [6.6, 8.35], [7.9, 7.9], [9.2, 8.3], [10.5, 7.8], [11.8, 8.25], [13.1, 7.85], [14.4, 8.15],
    ];
    stones.forEach(([sx, sz], i) => {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.2, 7), i % 2 ? M.stone : M.stoneDark);
      s.position.set(sx, 0.1, sz);
      s.castShadow = true;
      s.receiveShadow = true;
      this.group.add(s);
      this.addCollider(sx - 0.35, 0, sz - 0.35, sx + 0.35, 0.2, sz + 0.35, { name: 'steen' });
    });
    this.stones = stones;

    // Start- en finishvlag + checkpoints (ringen)
    const flag = (fx, fz, color, label) => {
      this.block(fx - 0.03, 0, fz - 0.03, fx + 0.03, 1.4, fz + 0.03, M.white, { collide: false });
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), lambert(color, { side: THREE.DoubleSide }));
      f.position.set(fx + 0.25, 1.22, fz);
      this.group.add(f);
      this.sign(label, fx, 1.65, fz, Math.PI / 2, { width: 0.9, height: 0.3 });
    };
    flag(3.4, 7.2, 0x6ac46b, 'START');
    flag(16.4, 7.2, 0xd7263d, 'FINISH');
    const ringGeo = new THREE.TorusGeometry(0.45, 0.04, 6, 20);
    [[2, false], [4, false], [6, false], [null, true]].forEach(([idx, finish]) => {
      const [cx, cz] = finish ? [16.3, 8] : stones[idx];
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: finish ? 0xd7263d : 0xf2c230, transparent: true, opacity: 0.7 }));
      ring.rotation.y = Math.PI / 2;
      ring.position.set(cx, finish ? 0.6 : 0.75, cz);
      ring.visible = false;
      ring.userData.noMerge = true;
      this.group.add(ring);
      this.checkpoints.push({ ring, x: cx, z: cz });
    });
    this.zones.push({ x: STONE_START.x, y: 0, z: STONE_START.z, r: 0.7, h: 0.5, id: 'stenen-start' });
    this.sign(['Stapstenen-parcours', `Haal de finish binnen ${STONE_TARGET_TIME} s`, 'Niet in het water vallen!'], 2.9, 0.8, 9.6, Math.PI / 2 - 0.4, { width: 1.3, height: 0.65 });
    this.block(2.9, 0, 9.55, 2.95, 0.5, 9.65, M.woodDark, { collide: false });

    // Badeendje (geheim)
    const duck = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 1), lambert(0xf7d648));
    body.scale.set(1.2, 0.8, 1);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 1), lambert(0xf7d648));
    head.position.set(0.1, 0.13, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 5), lambert(0xf08a24));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.19, 0.12, 0);
    duck.add(body, head, beak);
    duck.position.set(10, 0.1, 12.4);
    duck.userData.dynamic = true;
    this.group.add(duck);
    this.duck = duck;
    this.zones.push({ x: 10, y: 0, z: 12.4, r: 1.6, h: 1, secret: 'eend', sound: 'squeak', say: 'Kwak? Watskebeurt?' });

    // Riet
    for (let i = 0; i < 18; i++) {
      const a = 2.0 + i * 0.09;
      const hgt = 0.35 + (i % 3) * 0.1;
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, hgt, 4), M.leafDark);
      reed.position.set(x + Math.cos(a) * (r + 0.2 + (i % 2) * 0.12), hgt / 2, z + Math.sin(a) * (r + 0.2 + (i % 2) * 0.12));
      reed.rotation.z = Math.sin(i * 1.7) * 0.15;
      this.group.add(reed);
    }
  }

  buildMerelTree() {
    const x = 16;
    const z = -8;
    this.climbTree(x, z, 3.2, [
      [1.3, 1, 0, 1.3],
      [2.2, 0, 1, 1.1],
    ]);
    // Vogelhuisje
    this.block(x - 0.2, 2.4, z - 0.45, x + 0.2, 2.8, z - 0.2, M.woodLight, { collide: false });
    const roof = this.prism(0.55, 0.2, 0.35, M.roof);
    roof.position.set(x, 2.8, z - 0.33);
    this.group.add(roof);
    // De merel zelf
    const merel = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), lambert(0x1f1f22));
    body.scale.set(1, 0.9, 1.4);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.065, 1), lambert(0x1f1f22));
    head.position.set(0, 0.08, 0.1);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 5), lambert(0xf5a623));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.07, 0.19);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.16), lambert(0x1f1f22));
    tail.position.set(0, 0.02, -0.17);
    tail.rotation.x = -0.3;
    merel.add(body, head, beak, tail);
    merel.position.set(x + 1.0, 1.45, z);
    merel.rotation.y = -Math.PI / 2;
    merel.userData.dynamic = true;
    this.group.add(merel);
    this.merel = merel;
    this.merelMarker = glowSprite(0x9ad3ff, 0.9, 0.5);
    this.merelMarker.position.set(x + 1.0, 1.9, z);
    this.group.add(this.merelMarker);
    this.zones.push({ x: x + 1.0, y: 0, z, r: 1.3, h: 1.6, id: 'merel', prompt: 'Zing met de merel 🎵' });
    this.sign(['🎵 Zing met', 'de merel'], x + 2.2, 0.9, z + 0.8, -Math.PI / 2 + 0.5, { width: 0.8, height: 0.4 });
    this.block(x + 2.15, 0, z + 0.75, x + 2.2, 0.7, z + 0.8, M.woodDark, { collide: false });
    // Een oude radio bovenop het vogelhuisje. Waarom? Niemand weet het. Hij speelt Russisch.
    const radio = new THREE.Group();
    const caseMat = lambert(0x6b3a22);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.14), caseMat);
    const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.14), lambert(0xd8c8a0));
    grill.position.set(-0.07, 0, 0.071);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), lambert(0xf2c230, { emissive: 0x8a5a00, emissiveIntensity: 0.5 }));
    dial.position.set(0.1, 0.02, 0.071);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8), lambert(0x1f1f22));
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.1, -0.06, 0.08);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.45, 4), M.metal);
    antenna.position.set(0.12, 0.3, 0);
    antenna.rotation.z = -0.4;
    radio.add(box, grill, dial, knob, antenna);
    radio.traverse((m) => (m.castShadow = true));
    radio.position.set(x, 3.0, z - 0.33);
    radio.rotation.y = 0.5;
    radio.userData.dynamic = true;
    this.group.add(radio);
    this.radio = new THREE.Vector3(x, 3.0, z - 0.33);
    this.fx.push({ update: (dt, t) => (radio.position.y = 3.0 + Math.abs(Math.sin(t * 9)) * 0.012) });
    this.zones.push({ x, y: 0, z: z - 0.33, r: 1.4, h: 3.5, secret: 'radio', say: 'Watskebeurt? De merel luistert Russische radio!' });
  }

  buildShed() {
    // Schuurtje met kratten om erop te klimmen
    const x0 = -20;
    const x1 = -16;
    const z0 = -14;
    const z1 = -10.5;
    const h = 2.2;
    this.block(x0, 0, z0, x1, h, z1, lambert(0x7d8f6a), { climbable: true, name: 'schuur' });
    this.block(x0 - 0.15, h, z0 - 0.15, x1 + 0.15, h + 0.12, z1 + 0.15, M.woodDark, { climbable: true, name: 'schuurdak' });
    for (let x = x0 + 0.2; x < x1; x += 0.4) this.block(x, 0, z1, x + 0.05, h, z1 + 0.02, lambert(0x6c7d5b), { collide: false, shadow: false });
    this.block(-18.5, 0, z1, -17.5, 1.9, z1 + 0.03, M.woodDark, { collide: false });
    // Kratten-trap
    [[-15.6, -11.0, 0.4], [-15.6, -11.6, 0.8], [-15.6, -12.2, 1.2], [-15.6, -12.8, 1.6]].forEach(([cx, cz, top]) => {
      this.block(cx - 0.28, top - 0.4, cz - 0.28, cx + 0.28, top, cz + 0.28, M.cardboard, { name: 'krat' });
      if (top > 0.4) this.addCollider(cx - 0.28, 0, cz - 0.28, cx + 0.28, top - 0.4, cz + 0.28);
    });
    // Tuinkabouter achter de schuur (geheim)
    const gnome = new THREE.Group();
    const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.25, 7), lambert(0x3d7ea6));
    gb.position.y = 0.125;
    const gh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 1), lambert(0xf2c9a0));
    gh.position.y = 0.3;
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 7), M.white);
    beard.position.set(0, 0.24, 0.05);
    beard.rotation.x = Math.PI;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 7), M.red);
    hat.position.y = 0.45;
    gnome.add(gb, gh, beard, hat);
    gnome.position.set(-18, 0, -14.6);
    gnome.rotation.y = Math.PI;
    gnome.traverse((o) => (o.castShadow = true));
    this.group.add(gnome);
    this.zones.push({ x: -18, y: 0, z: -14.6, r: 0.8, h: 1, secret: 'kabouter', say: 'Watskebeurt? Een kabouter! Mag ik je muts?', hat: 'kabouter' });
  }

  buildBikeShed() {
    // Fietsenhok naast de flat, met regenpijp. Op het dak: de gouden pistache!
    const x0 = 9.5;
    const x1 = 13.5;
    const z0 = -22;
    const z1 = -18;
    const h = 2.2;
    this.block(x0, 0, z0, x1, h, z1, lambert(0xa6adb3), { name: 'fietsenhok' });
    this.block(x0 - 0.1, h, z0 - 0.1, x1 + 0.1, h + 0.08, z1 + 0.1, M.metalDark, { name: 'fietsenhokdak' });
    this.block(x0 - 0.12, 0, z1 - 0.12, x0 + 0.02, h + 0.08, z1 + 0.02, M.metal, { collide: false });
    this.addCollider(x0 - 0.2, 0, z1 - 0.2, x0 + 0.1, h + 0.08, z1 + 0.1, { climbable: true, name: 'regenpijp' });
    const gold = makePistachio();
    gold.traverse((o) => {
      if (o.isMesh) o.material = M.gold;
    });
    gold.scale.setScalar(2);
    this.addCollectible('goud', gold, 11.5, h + 0.08, -20, { secret: 'goud', glow: 0xffd84a, glowSize: 0.6 });
  }

  buildPlaza() {
    // Patatkraam met een hoog dak (alleen bereikbaar met patat-power!)
    const x0 = -6.5;
    const x1 = -4.5;
    const z0 = -1.2;
    const z1 = 0.4;
    this.block(x0, 0, z0, x1, 0.95, z1, M.white, { climbable: true, name: 'patatkraam' });
    this.block(x0 - 0.05, 0.95, z0 - 0.05, x1 + 0.05, 1.0, z1 + 0.05, M.woodLight, { climbable: true, name: 'toonbank' });
    [[x0, z0], [x1 - 0.08, z0], [x0, z1 - 0.08], [x1 - 0.08, z1 - 0.08]].forEach(([x, z]) =>
      this.block(x, 1.0, z, x + 0.08, 2.2, z + 0.08, M.white, { collide: false }),
    );
    this.block(x0 - 0.3, 2.2, z0 - 0.3, x1 + 0.3, 2.35, z1 + 0.3, M.red, { oneWay: true, name: 'kraamdak' });
    for (let i = 0; i < 6; i++) {
      this.block(x0 - 0.3 + i * 0.43, 2.1, z1 + 0.25, x0 - 0.3 + i * 0.43 + 0.2, 2.2, z1 + 0.3, i % 2 ? M.red : M.white, { collide: false, shadow: false });
    }
    this.sign(['🍟 SNACKBAR 🍟', 'patat & eierbal'], (x0 + x1) / 2, 2.6, (z0 + z1) / 2 + 0.01, 0, { width: 1.6, height: 0.5, bg: '#fff3b0' });

    // Bankje
    this.block(2.2, 0.38, 1.8, 3.8, 0.45, 2.3, M.wood, { climbable: true, name: 'bankje' });
    this.addCollider(2.25, 0, 1.85, 3.75, 0.38, 2.25, { climbable: true });
    this.block(2.2, 0.45, 2.25, 3.8, 0.85, 2.32, M.wood, { climbable: true });
    // Wegwijzer
    this.block(-0.05, 0, -2.6, 0.05, 1.9, -2.5, M.woodDark, { collide: false });
    this.sign('← Pistachehuis', -0.5, 1.7, -2.5, 0, { width: 1.0, height: 0.22 });
    this.sign('Vijver →', 0.45, 1.45, -2.5, 0, { width: 0.8, height: 0.22 });
    this.sign('↑ Merel', 0.3, 1.2, -2.5, 0, { width: 0.7, height: 0.22 });
    this.addCollider(-0.08, 0, -2.63, 0.08, 1.9, -2.47, { climbable: true, name: 'paal' });
    // Lantaarns
    [[-3.4, 3], [3.4, -3], [-3.2, -10.8], [-8, 3.5]].forEach(([x, z]) => {
      this.block(x - 0.05, 0, z - 0.05, x + 0.05, 2.4, z + 0.05, M.metalDark, { climbable: true, name: 'lantaarn' });
      const lamp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), M.lampShade);
      lamp.position.set(x, 2.5, z);
      this.group.add(lamp);
    });
    // Waterput
    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.6, 10, 1, true), M.stone);
    well.material.side = THREE.DoubleSide;
    well.position.set(20, 0.3, -20);
    this.group.add(well);
    this.addCollider(19.4, 0, -20.6, 20.6, 0.6, -20.4, { climbable: true });
    this.addCollider(19.4, 0, -19.6, 20.6, 0.6, -19.4, { climbable: true });
    this.addCollider(19.4, 0, -20.6, 19.6, 0.6, -19.4, { climbable: true });
    this.addCollider(20.4, 0, -20.6, 20.6, 0.6, -19.4, { climbable: true });
    // Hooibalen
    [[22, 18, 0.6], [22.9, 18, 0.6], [22.45, 18, 1.2]].forEach(([x, z, top]) =>
      this.block(x - 0.45, top - 0.6, z - 0.4, x + 0.45, top, z + 0.4, lambert(0xe3c16f), { climbable: true, name: 'hooibaal' }),
    );
  }

  buildBorder() {
    // Hek rondom de wereld
    const posts = [];
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const t = -SIZE + (i / n) * SIZE * 2;
      posts.push([t, -SIZE], [-SIZE, t], [SIZE, t]);
    }
    const geo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const fence = new THREE.InstancedMesh(geo, M.fence, posts.length);
    const m = new THREE.Matrix4();
    posts.forEach(([x, z], i) => fence.setMatrixAt(i, m.makeTranslation(x, 0.4, z)));
    this.group.add(fence);
    const rail = (x0, z0, x1, z1) => this.block(x0, 0.55, z0, x1, 0.65, z1, M.fence, { collide: false, shadow: false });
    rail(-SIZE, -SIZE - 0.03, SIZE, -SIZE + 0.03);
    rail(-SIZE - 0.03, -SIZE, -SIZE + 0.03, SIZE);
    rail(SIZE - 0.03, -SIZE, SIZE + 0.03, SIZE);
    this.addCollider(-SIZE - 1, 0, -SIZE - 1, SIZE + 1, 3, -SIZE);
    this.addCollider(-SIZE - 1, 0, 27, SIZE + 1, 3, SIZE + 1);
    this.addCollider(-SIZE - 1, 0, -SIZE, -SIZE, 3, SIZE);
    this.addCollider(SIZE, 0, -SIZE, SIZE + 1, 3, SIZE);
  }

  buildTrees() {
    // Decoratieve bomen (instanced = snel)
    const spots = [];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2;
      const d = 27 + (i % 3);
      spots.push([Math.cos(a) * d * 1.1, Math.sin(a) * d * 1.1]);
    }
    spots.push([-24, -4], [-9, 18], [18, 18], [24, -14], [-11, -22]);
    const blocked = ([x, z]) => z > 19 || (x > 18.5 && x < 30.5 && z > -9 && z < 12.5) || Math.hypot(x + 24, z - 15) < 5 || (x > -9 && x < -2 && z > 4.5 && z < 10.5);
    for (let k = spots.length - 1; k >= 0; k--) if (blocked(spots[k])) spots.splice(k, 1);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 6), M.trunk, spots.length);
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.5, 0), M.treeLeaf, spots.length);
    trunk.castShadow = crown.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    spots.forEach(([x, z], i) => {
      const s = 0.9 + ((i * 37) % 10) / 12;
      trunk.setMatrixAt(i, m.compose(new THREE.Vector3(x, s, z), q.identity(), new THREE.Vector3(s, s, s)));
      e.set(0, i, 0);
      crown.setMatrixAt(i, m.compose(new THREE.Vector3(x, 2 * s + 1, z), q.setFromEuler(e), new THREE.Vector3(s, s * 1.1, s)));
      if (z > 20) return;
      if (Math.abs(x) < SIZE - 1 && Math.abs(z) < SIZE - 1) this.addCollider(x - 0.3 * s, 0, z - 0.3 * s, x + 0.3 * s, 2 * s, z + 0.3 * s, { climbable: true, name: 'boom' });
    });
    this.group.add(trunk, crown);

    // Beklimbare bomen met takken
    this.climbTree(-6, 14, 3.0, [[1.2, 1, 0, 1.2], [2.0, 0, -1, 1.0]]);
    this.climbTree(-8, -6, 2.6, [[1.1, 0, 1, 1.1]]);
  }

  buildFlowers() {
    const colors = [0xe9806e, 0xf2c230, 0xffffff, 0xd96fb4, 0x9ad3ff];
    const count = 220;
    const geo = new THREE.IcosahedronGeometry(0.07, 0);
    const flowers = new THREE.InstancedMesh(geo, applyWind(new THREE.MeshLambertMaterial({ flatShading: true }), 1.5), count);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      let x;
      let z;
      do {
        x = (rnd() - 0.5) * 54;
        z = (rnd() - 0.5) * 54;
      } while (z > 20.5 || (x > 19.5 && z > -8.5 && z < 11.5) || Math.hypot(x + 24, z - 15) < 3.5 || Math.abs(x) < 2 || (x > -21 && x < -11 && z > 1 && z < 10) || (x > -9 && x < -2 && z > 4.5 && z < 10.5) || Math.hypot(x - POND.x, z - POND.z) < POND.r + 1 || (Math.abs(x) < 9 && z < -15));
      flowers.setMatrixAt(i, m.makeTranslation(x, 0.12, z));
      flowers.setColorAt(i, c.setHex(colors[i % colors.length]));
    }
    this.group.add(flowers);
    // Bloemperk achter de flat
    this.block(-4, 0, -26.5, 4, 0.2, -25.5, M.soil, { collide: false });
  }

  buildFeathers() {
    // 8 rode veren door de hele buurt
    const spots = [
      [-18, 2.32, -12.2, 'op het dak van de schuur'],
      [3.0, 0.45, 2.05, 'op het bankje'],
      [-4.55, 1.1, -12.65, 'op de brievenbus'],
      [-6.9, 1.2, 14, 'op een tak van de boom'],
      [9.2, 0.2, 8.3, 'op een stapsteen in de vijver'],
      [0, 0.2, -26, 'in het bloemperk achter de flat'],
      [22.45, 1.2, 18, 'op de hooibalen'],
      [-5.5, 2.35, -0.4, 'op het dak van de patatkraam'],
    ];
    spots.forEach(([x, y, z, where]) => this.addCollectible('veer', makeFeather(), x, y, z, { where, glow: 0xff8a8a }));
  }

  buildFries() {
    // Patat: geeft tijdelijk superkracht en komt na een tijdje terug
    // Een Groningse eierbal op de toonbank: ook superkracht!
    const eierbal = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), lambert(0xc9822e));
    ball.position.y = 0.1;
    ball.castShadow = true;
    eierbal.add(ball);
    this.addCollectible('eierbal', eierbal, -4.9, 1.0, -0.2, { respawn: true, glow: 0xffc34a, glowSize: 0.5 });
    [[-5.5, 1.0, -0.4], [4.2, 0, 13.5], [-9.5, 0, -2.5], [14, 0, -14]].forEach(([x, y, z]) =>
      this.addCollectible('patat', makeFries(), x, y, z, { respawn: true, glow: 0xffe066, glowSize: 0.5 }),
    );
  }

  buildAtmosphere() {
    // Lucht, wolken, vogels, vlinders
    this.group.add(makeSkyDome(new THREE.Vector3(-18, 30, 14)));
    this.fx.push(new Clouds(this.group));
    this.fx.push(new Birds(this.group));
    this.fx.push(
      new Butterflies(this.group, [
        [-3, 8], [5, 3], [-8, -3], [12, -3], [-14, 12], [8, 16], [-2, -8], [18, 10], [-20, -4], [3, -20],
      ]),
    );
    // Fontein op het plein
    this.fountain = new Fountain(this.group, 0, 0.6, M.stone, M.water);
    this.fx.push(this.fountain);
    this.addCollider(-1.2, 0, -0.6, 1.2, 0.45, 1.8, { climbable: true, name: 'fontein' });
    this.addCollider(-0.2, 0.45, 0.4, 0.2, 1.1, 0.8, { climbable: true, name: 'fontein' });
    // Vlaggetjes over het plein
    bunting(this.group, new THREE.Vector3(-3.4, 2.35, 3), new THREE.Vector3(3.4, 2.35, -3), 18, 0.6);
    bunting(this.group, new THREE.Vector3(-8, 2.35, 3.5), new THREE.Vector3(-3.4, 2.35, 3), 12, 0.45);
    bunting(this.group, new THREE.Vector3(3.4, 2.35, -3), new THREE.Vector3(-3.2, 2.35, -10.8), 22, 0.7);
    // Glinsterend water en waterlelies
    M.water.map = waterTexture();
    M.water.color.set(0xffffff);
    M.water.needsUpdate = true;
    const pad = new THREE.CircleGeometry(0.35, 7, 0.3, Math.PI * 1.8);
    [[8.5, 5.5], [12.2, 10.6], [7.2, 10.2], [13.8, 5.6], [10.2, 4.1]].forEach(([x, z], i) => {
      const lp = new THREE.Mesh(pad, M.leaf);
      lp.rotation.x = -Math.PI / 2;
      lp.rotation.z = i;
      lp.position.set(x, 0.065, z);
      this.group.add(lp);
      if (i % 2 === 0) {
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.1, 6), new THREE.MeshLambertMaterial({ color: 0xf6a5c8, flatShading: true }));
        fl.position.set(x + 0.1, 0.1, z);
        this.group.add(fl);
      }
    });
    // Graspollen die meewiegen
    const tuftGeo = new THREE.ConeGeometry(0.06, 0.28, 3);
    tuftGeo.translate(0, 0.14, 0);
    const tufts = new THREE.InstancedMesh(tuftGeo, applyWind(new THREE.MeshLambertMaterial({ color: 0x6fae4f, flatShading: true }), 2.5), 500);
    const m = new THREE.Matrix4();
    let seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 500; i++) {
      let x;
      let z;
      do {
        x = (rnd() - 0.5) * 56;
        z = (rnd() - 0.5) * 56;
      } while (z > 20.5 || (x > 19.5 && z > -8.5 && z < 11.5) || Math.hypot(x + 24, z - 15) < 3.5 || Math.abs(x) < 1.2 || Math.hypot(x, z) < 3.4 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.5 || (Math.abs(x) < 9 && z < -15) || (x > -21 && x < -11 && z > 1 && z < 10) || (x > -9 && x < -2 && z > 4.5 && z < 10.5));
      const sc = 0.7 + rnd() * 0.8;
      m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6), new THREE.Vector3(sc, sc, sc));
      tufts.setMatrixAt(i, m);
    }
    this.group.add(tufts);
  }

  buildGroningen() {
    // De gracht (het Diep) met een brug, kade en grachtenpanden met trapgevels
    const canal = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * 2 + 4, CANAL.z1 - CANAL.z0), M.water);
    canal.rotation.x = -Math.PI / 2;
    canal.position.set(0, -0.25, (CANAL.z0 + CANAL.z1) / 2);
    this.group.add(canal);
    this.block(-SIZE - 2, -0.6, CANAL.z0 - 0.3, SIZE + 2, 0.02, CANAL.z0, M.stoneDark, { collide: false });
    this.block(-SIZE - 2, -0.6, CANAL.z1, SIZE + 2, 0.02, 27, M.stone, { collide: false });
    // Brug (plat, zodat Puck er gewoon overheen loopt)
    this.block(-1.3, 0, CANAL.z0 - 0.3, 1.3, 0.1, CANAL.z1 + 0.1, M.woodLight, { name: 'brug' });
    [-1.3, 1.2].forEach((x) => {
      this.block(x, 0.1, CANAL.z0 - 0.3, x + 0.1, 0.9, CANAL.z1 + 0.1, M.white, { name: 'brugleuning' });
    });
    const brugFlag = makeGroningenFlag(3.5);
    brugFlag.position.set(1.6, 0, CANAL.z0 - 0.6);
    this.group.add(brugFlag);
    this.fx.push(brugFlag);
    // Bootje in de gracht
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1.1), lambert(0x2f6e4a));
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.8), lambert(0xf4f1ea));
    cabin.position.set(-0.3, 0.45, 0);
    boat.add(hull, cabin);
    boat.position.set(-12, -0.15, 24.6);
    boat.userData.dynamic = true;
    this.group.add(boat);
    this.boat = boat;
    // Grachtenpanden aan de overkant
    let x = -SIZE;
    let k = 0;
    while (x < SIZE) {
      const w = 3.2 + ((k * 7) % 3) * 0.8;
      const h = 6 + ((k * 5) % 4) * 1.2;
      const house = makeCanalHouse(w, h, k);
      house.rotation.y = Math.PI;
      house.position.set(x + w / 2, 0, 30);
      this.group.add(house);
      x += w + 0.1;
      k++;
    }
    // Fietsen langs de kade en bij de brug
    [[-4, 21.8], [-3.2, 21.8], [3.4, 21.8], [4.2, 21.8], [-9, 26.4], [8, 26.4]].forEach(([bx, bz], i) => {
      const b = makeBike(i + 2);
      b.position.set(bx, 0, bz);
      b.rotation.y = i % 2 ? 0.1 : -0.1;
      this.group.add(b);
      this.addCollider(bx - 0.6, 0, bz - 0.15, bx + 0.6, 0.8, bz + 0.15, { climbable: true, name: 'fiets' });
    });
    // De Martinitoren en de rest van de stad in de verte
    this.group.add(makeCityView(-0.05, { towerPos: new THREE.Vector3(-400, 0, 0), radius: 110, exclude: (hx, hz) => Math.abs(hx) < 36 && hz < 36 && hz > -36 }));
    // "Er gaat niets boven Groningen" op de kade
    this.sign(['Er gaat niets boven', 'GRONINGEN'], -3.5, 1.4, CANAL.z0 - 0.55, 0, { width: 2, height: 0.6, bg: '#e8f3d6', fg: '#1f6e3c', border: '#1f8a4c' });
    this.block(-3.55, 0, CANAL.z0 - 0.6, -3.45, 1.1, CANAL.z0 - 0.5, M.woodDark, { collide: false });
    const plazaFlag = makeGroningenFlag(4);
    plazaFlag.position.set(-2.6, 0, -1.6);
    this.group.add(plazaFlag);
    this.fx.push(plazaFlag);
    this.addCollider(-2.66, 0, -1.66, -2.54, 4, -1.54, { climbable: true, name: 'vlaggenmast' });
  }

  buildJumbo() {
    // De Jumbo: gele gevel, glazen schuifdeuren, winkelwagentjes
    const x0 = 20;
    const x1 = 29;
    const z0 = -1;
    const z1 = 11;
    const h = 4.2;
    const yellow = lambert(0xffd200);
    this.block(x0, 0, z0, x1, h, z1, lambert(0xe9e5dc), { name: 'jumbo' });
    this.block(x0 - 0.05, h - 1.1, z0, x0, h, z1, yellow, { collide: false, shadow: false });
    this.block(x0 - 0.4, h, z0 - 0.2, x1 + 0.2, h + 0.3, z1 + 0.2, lambert(0x3a3d40), { collide: false });
    const logo = makeSign('JUMBO', { width: 4.2, height: 0.9, bg: '#ffd200', fg: '#1b1b1d', border: '#ffd200' });
    logo.position.set(x0 - 0.07, h - 0.55, (z0 + z1) / 2);
    logo.rotation.y = -Math.PI / 2;
    this.group.add(logo);
    // Glazen pui + schuifdeuren (dicht: papegaaien mogen nait naar binnen)
    this.block(x0 - 0.04, 0, 1.5, x0, 2.9, 8.5, M.windowBlue, { collide: false, shadow: false });
    this.block(x0 - 0.06, 0, 4.2, x0 - 0.02, 2.4, 5.8, lambert(0xcfe6f2, { emissive: 0x7fa0b8, emissiveIntensity: 0.4 }), { collide: false, shadow: false });
    this.block(x0 - 0.08, 2.4, 4.1, x0 - 0.02, 2.55, 5.9, yellow, { collide: false, shadow: false });
    // Winkelwagentjes
    const cartMat = lambert(0x9aa3aa);
    for (let k = 0; k < 4; k++) {
      const c = new THREE.Group();
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.8), cartMat);
      basket.position.y = 0.75;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.05), yellow);
      handle.position.set(0, 1.0, -0.42);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.75), cartMat);
      base.position.y = 0.2;
      c.add(basket, handle, base);
      c.position.set(x0 - 1.1, 0, 9.4 - k * 0.3);
      c.traverse((o) => (o.castShadow = true));
      this.group.add(c);
    }
    this.addCollider(x0 - 1.4, 0, 8.1, x0 - 0.8, 1.0, 9.9, { climbable: true, name: 'karretjes' });
    // Laadperron achter: plek voor de dozen-speedrun
    const dock = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), lambert(0x6f7174));
    dock.rotation.x = -Math.PI / 2;
    dock.position.set(24, 0.006, -5.2);
    this.group.add(dock);
    this.boxSmash = new BoxSmash(this, [
      [21, -2.6], [22.1, -2.9, 0.6], [23.3, -2.5], [24.6, -3.0, 0.45], [26, -2.6, 0.6], [27.2, -3.1],
      [21.4, -4.6, 0.6], [22.8, -5.0], [24.2, -4.4, 0.55], [25.6, -4.9], [27, -4.5, 0.6],
      [21.8, -6.9], [23.4, -7.2, 0.6], [25, -6.8], [26.6, -7.3, 0.5],
    ], M.cardboard, M.tape);
  }

  buildTower() {
    // De Martinitoren in het klein (1:1 zou nait passen). Klimmen tot het balkon!
    const tx = -24;
    const tz = 15;
    const tower = makeMartinitoren(0.9);
    tower.position.set(tx, 0, tz);
    this.group.add(tower);
    const r = 2.5 * 0.9;
    this.addCollider(tx - r, 0, tz - r, tx + r, 9, tz + r, { climbable: true, name: 'martinitoren' });
    // Balkon op 9 m
    this.block(tx - r - 0.5, 8.9, tz - r - 0.5, tx + r + 0.5, 9.05, tz + r + 0.5, M.stone, { oneWay: true, name: 'balkon' });
    for (const [x0, z0, x1, z1] of [[-1, -1, 1, -1], [-1, 1, 1, 1], [-1, -1, -1, 1], [1, -1, 1, 1]]) {
      const w = r + 0.5;
      this.block(tx + Math.min(x0, x1) * w - 0.04, 9.05, tz + Math.min(z0, z1) * w - 0.04, tx + Math.max(x0, x1) * w + 0.04, 9.6, tz + Math.max(z0, z1) * w + 0.04, M.white, { collide: false });
    }
    this.addCollider(tx - r, 9, tz - r, tx + r, 22, tz + r, { name: 'toren-boven' });
    // Klok om te luiden
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 10, 1, true), M.gold);
    bell.material = M.gold;
    bell.position.set(tx + r + 0.2, 9.75, tz);
    this.group.add(bell);
    this.towerTop = { x: tx + r + 0.25, y: 9.05, z: tz };
    this.towerStart = { x: tx + r + 0.8, z: tz };
    this.sign(['Martinitoren-klim', 'Luid de klok binnen 30 s!'], tx + r + 1.5, 1.1, tz - 1.6, Math.PI / 2, { width: 1.4, height: 0.45 });
    this.block(tx + r + 1.47, 0, tz - 1.62, tx + r + 1.53, 0.9, tz - 1.58, M.woodDark, { collide: false });
  }

  buildStage() {
    // Podium voor Puck's fluitconcert, met de achterwand naar het noorden en het publiek richting de fontein
    const S = { x0: -7.6, x1: -3.4, z0: 6.2, z1: 8.7, h: 0.4 };
    this.stage = { x: (S.x0 + S.x1) / 2, y: S.h, z: 7.3, lanes: [-6.7, -5.5, -4.3] };
    const plank = lambert(0x8a5a36);
    const dark = lambert(0x2b2f3a);
    const speakerMat = new THREE.MeshLambertMaterial({ color: 0x3a3d42, map: speakerTexture(), flatShading: true });
    this.block(S.x0, 0, S.z0, S.x1, S.h, S.z1, plank, { name: 'podium' });
    for (let x = S.x0 + 0.3; x < S.x1; x += 0.3) this.block(x, S.h, S.z0, x + 0.02, S.h + 0.005, S.z1, lambert(0x6e4526), { collide: false, shadow: false });
    // Treetjes aan de voorkant
    this.block(-6.2, 0, S.z0 - 0.45, -4.8, 0.2, S.z0, plank, { name: 'trapje' });
    // Rood-groene rok (Groningse kleuren)
    for (let x = S.x0; x < S.x1 - 0.01; x += 0.35) {
      const red = Math.round((x - S.x0) / 0.35) % 2 === 0;
      this.block(x, 0.02, S.z0 - 0.02, x + 0.35, S.h - 0.02, S.z0, lambert(red ? 0xc8203a : 0x2f7a3e), { collide: false, shadow: false });
    }
    // Achterwand met doek
    this.block(S.x0, S.h, S.z1 - 0.12, S.x1, 3.2, S.z1, dark, { name: 'achterwand' });
    const banner = makeSign(["PUCK'S", 'FLUITCONCERT'], { width: 3.2, height: 1.1, bg: '#fff6e6', fg: '#2b1d14', border: '#c8203a' });
    banner.position.set(this.stage.x, 2.55, S.z1 - 0.14);
    banner.rotation.y = Math.PI;
    this.group.add(banner);
    // Palen met lampen en speakers
    [S.x0 + 0.1, S.x1 - 0.1].forEach((x) => {
      this.block(x - 0.06, S.h, S.z1 - 0.3, x + 0.06, 3.4, S.z1 - 0.18, M.metalDark, { collide: false });
      this.block(x - 0.35, 0, S.z0 + 0.1, x + 0.35, 1.1, S.z0 + 0.6, speakerMat, { climbable: true, name: 'speaker' });
      [0.72, 0.3].forEach((y, i) => {
        const r = i ? 0.13 : 0.2;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 5, 16), lambert(0x6c7178));
        rim.position.set(x, y, S.z0 + 0.085);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 0.08, 16, 1, true), lambert(0x2a2c30, { side: THREE.DoubleSide }));
        cone.rotation.x = -Math.PI / 2;
        cone.position.set(x, y, S.z0 + 0.1);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.25, 8, 6), lambert(0x6c7178));
        cap.position.set(x, y, S.z0 + 0.08);
        this.group.add(rim, cone, cap);
      });
    });
    this.block(S.x0, 3.3, S.z1 - 0.3, S.x1, 3.4, S.z1 - 0.18, M.metalDark, { collide: false });
    const spotMat = lambert(0xfff1c2, { emissive: 0xffd27a, emissiveIntensity: 0.8 });
    spotMat.userData.night = 'lamp';
    [-6.9, -5.5, -4.1].forEach((x) => {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.22, 8), spotMat);
      lamp.position.set(x, 3.2, S.z1 - 0.4);
      lamp.rotation.x = -0.6;
      this.group.add(lamp);
    });
    // Bordje ervoor
    const sign = makeSign(['Fluitconcert van Puck', 'Binnenkort! Toegang gratis'], { width: 1.5, height: 0.55, bg: '#fff6e6', fg: '#2b1d14' });
    sign.position.set(-8.3, 1.1, 5.7);
    sign.rotation.y = Math.PI + 0.5;
    this.group.add(sign);
    this.block(-8.33, 0, 5.67, -8.27, 0.85, 5.73, M.trunk, { collide: false });
    this.zones.push({ id: 'podium', x: this.stage.x, y: S.h, z: 7.2, r: 1.4, h: 1.5, prompt: 'Geef het fluitconcert 🎵' });
  }

  buildPeople() {
    // Groningers
    this.addNPC('harm', 'Postbode Harm', -5.3, -12.9, Math.PI / 2, { shirt: 0x1f3a6b, pants: 0x2b2f3a, hat: 'postpet', hatColor: 0xe86a1a, prop: 'mailbag', hair: 0x3b2a1e });
    this.addNPC('geert', 'Visser Geert', 9, 21.75, 0, { shirt: 0x4f6b3a, pants: 0x3a3d40, hat: 'beanie', hatColor: 0x2f6e4a, beard: true, hair: 0xb9b9b9, prop: 'rod', skin: 1 });
    this.addNPC('sjoukje', 'Studente Sjoukje', -5.4, 20.6, Math.PI / 2, { height: 1.68, shirt: 0xf2c230, pants: 0x3d5a8a, hairStyle: 'ponytail', hair: 0xe8cf8a, glasses: true, prop: 'book', mood: 'smile' });
    this.addNPC('jan', 'Duivenman Jan', 3.0, 3.1, Math.PI, { shirt: 0x6b5a4a, pants: 0x4a4a4a, hairStyle: 'bald', hat: 'cap', hatColor: 0x5b5f66, prop: 'bread', skin: 0 });
    this.addNPC('bas', 'Jumbo-Bas', 20.5, -1.9, Math.PI, { shirt: 0xffd200, pants: 0x1b1b1d, hair: 0x3b2a1e, hat: 'cap', hatColor: 0xffd200 });
    this.addNPC('jumbo', 'Jumbo-medewerker Eline', 19.2, 3.2, -Math.PI / 2, { height: 1.66, shirt: 0xffd200, pants: 0x1b1b1d, hairStyle: 'bun', hair: 0x6b4423, mood: 'smile' });
    this.addNPC('tineke', 'Buurvrouw Tineke', 14.8, -13.6, -Math.PI / 2, { height: 1.62, shirt: 0xd96fb4, pants: 0x4d4a5c, hairStyle: 'bob', hair: 0xb07a4a, glasses: true, mood: 'frown' });
    this.addNPC('toren', 'Torenwachter Wiebe', this.towerStart.x + 0.9, this.towerStart.z + 1.2, -Math.PI / 2, { shirt: 0x2f6e4a, pants: 0x3a3d40, beard: true, hair: 0x8a8a8a, hat: 'cap', hatColor: 0x1f8a4c });
    // Meneer Mehmet met zijn oranje kat Pasja loopt zijn rondje
    const mehmet = makePerson({ shirt: 0x5b6a7a, pants: 0x3a3d40, hair: 0x1b1b1d, beard: true, skin: 2 });
    const cat = makeCat();
    this.catTail = cat.userData.tail;
    this.catHead = cat.userData.head;
    this.fx.push({
      update: (dt, t) => {
        this.catTail.rotation.z = Math.sin(t * 2.2) * 0.5;
        this.catHead.rotation.y = -1.2 + Math.sin(t * 0.7) * 0.35;
      },
    });
    cat.rotation.y = Math.PI / 2;
    cat.position.set(0, 1.02, 0.3);
    cat.scale.setScalar(0.85);
    mehmet.root.add(cat);
    mehmet.arms.forEach((a) => (a.rotation.x = -1.1));
    this.mehmet = new Walker(this.group, mehmet, [[-2, -6], [6, -5], [4.2, 4.5], [4, 12], [-4, 12], [-3, 4], [-3, -4]], { speed: 0.6, stink: true });
    this.fx.push({ update: (dt, t) => this.mehmet.update(dt, t, this.mehmetPaused) });
    // Praat-zone volgt hem
    this.mehmetZone = { x: 0, y: 0, z: 0, r: 1.2, h: 1.4, id: 'npc', npc: { id: 'mehmet', name: 'Meneer Mehmet', person: mehmet }, prompt: 'Zeg hoi tegen Meneer Mehmet 👋' };
    this.zones.push(this.mehmetZone);
    this.stinkZone = { x: 0, y: 0, z: 0, r: 1.6, h: 2, secret: 'stink', say: 'Watskebeurt?! Pff… is dat de kat?' };
    this.zones.push(this.stinkZone);
    // Sjoukje op de fiets (tegenstander in de fietsrace)
    const rider = new THREE.Group();
    rider.add(makeBike(3));
    const sj = makePerson({ height: 1.68, shirt: 0xf2c230, pants: 0x3d5a8a, hairStyle: 'ponytail', hair: 0xe8cf8a, glasses: true, sitting: true });
    sj.root.rotation.y = Math.PI / 2;
    sj.root.position.set(-0.15, 0.35, 0);
    rider.add(sj.root);
    rider.userData.dynamic = true;
    // Duiven op het plein (voor Jan)
    this.pigeons = new Pigeons(this.group, new THREE.Vector3(0, 0, 0.6), 3.6, 12, (x, z) => (x > 1.9 && x < 4 && z > 1.5 && z < 3.6) || Math.hypot(x, z - 0.6) < 1.6);
    // Rondje Stad (voor Sjoukje)
    const route = [[-4.5, 18.8], [4, 17], [14, 15], [18.5, 6], [18.5, -4], [12, -6], [4, -6.5], [-6, -4], [-9.5, 3], [-8, 11], [-4.5, 18.8]];
    this.race = new RingRace(this.group, route);
    this.rival = new Rival(this.group, rider, route, 40);
  }

  buildIngredients() {
    // De 5 ingrediënten voor oma Moi's Groninger koek
    const models = {
      roggemeel: () => {
        const g = new THREE.Group();
        const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.26, 7), lambert(0xe7dcc7));
        bag.position.y = 0.13;
        const tie = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 8), lambert(0xc4643a));
        tie.rotation.x = Math.PI / 2;
        tie.position.y = 0.24;
        g.add(bag, tie);
        return g;
      },
      honing: () => {
        const g = new THREE.Group();
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.18, 8), lambert(0xf2b01e, { emissive: 0x8a5a00, emissiveIntensity: 0.3 }));
        pot.position.y = 0.09;
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 8), lambert(0xd7263d));
        lid.position.y = 0.2;
        g.add(pot, lid);
        return g;
      },
      stroop: () => {
        const g = new THREE.Group();
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8), lambert(0x4a2410));
        pot.position.y = 0.1;
        const label = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.09, 8), lambert(0xf2c230));
        label.position.y = 0.1;
        g.add(pot, label);
        return g;
      },
      kaneel: () => {
        const g = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const st = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 6), lambert(0x9a5a2c));
          st.rotation.z = Math.PI / 2;
          st.position.set(0, 0.03 + i * 0.03, (i - 1) * 0.03);
          g.add(st);
        }
        return g;
      },
      anijs: () => {
        const g = new THREE.Group();
        for (let i = 0; i < 8; i++) {
          const p = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), lambert(0x6e3b1e));
          const a = (i / 8) * Math.PI * 2;
          p.rotation.z = Math.PI / 2;
          p.rotation.y = -a;
          p.position.set(Math.cos(a) * 0.05, 0.05, Math.sin(a) * 0.05);
          g.add(p);
        }
        return g;
      },
    };
    const spots = [
      ['roggemeel', -17.6, 0, -9.8, 'bij de schuur'],
      ['honing', 17.9, 0.5, -6.4, 'op de bijenkast bij de merel'],
      ['stroop', 0, 0.1, 24.6, 'midden op de brug'],
      ['kaneel', 0, 1.14, 0.6, 'bovenin de fontein'],
      ['anijs', 4.225, 0, -15.1, 'tussen de fietsen bij de flat'],
    ];
    spots.forEach(([id, x, y, z, where]) => this.addCollectible('ingredient', models[id](), x, y, z, { id, where, glow: 0xffb347, glowSize: 0.5 }));
    // Bijenkast
    this.block(17.6, 0, -6.7, 18.2, 0.5, -6.1, lambert(0xf4f1ea), { climbable: true, name: 'bijenkast' });
    this.block(17.55, 0.5, -6.75, 18.25, 0.55, -6.05, M.roof, { collide: false });
  }

  // ---------- Gameplay ----------

  get feathers() {
    return this.collectibles.filter((c) => c.type === 'veer');
  }

  hazardAt(p) {
    const d = Math.hypot(p.x - POND.x, p.z - POND.z);
    if (d < POND.r - 0.05 && p.y < 0.05) return { respawn: STONE_START, yaw: Math.PI / 2 };
    if (p.z > CANAL.z0 + 0.1 && p.z < CANAL.z1 - 0.1 && Math.abs(p.x) > 1.3 && p.y < 0.05) return { respawn: new THREE.Vector3(0, 0, 21), yaw: 0 };
    return null;
  }

  startStoneRun() {
    const run = this.stoneRun;
    run.active = true;
    run.time = 0;
    run.next = 0;
    this.checkpoints.forEach((c, i) => (c.ring.visible = i === 0));
  }

  stopStoneRun() {
    this.stoneRun.active = false;
    this.checkpoints.forEach((c) => (c.ring.visible = false));
  }

  /** Geeft 'checkpoint' | 'finish' | null terug. */
  updateStoneRun(dt, p) {
    const run = this.stoneRun;
    if (!run.active) return null;
    run.time += dt;
    const cp = this.checkpoints[run.next];
    if (Math.hypot(p.x - cp.x, p.z - cp.z) < 0.55) {
      cp.ring.visible = false;
      run.next++;
      if (run.next >= this.checkpoints.length) {
        run.active = false;
        return 'finish';
      }
      this.checkpoints[run.next].ring.visible = true;
      return 'checkpoint';
    }
    return null;
  }

  update(dt, time) {
    this.animateCollectibles(dt, time);
    if (this.duck) {
      this.duck.position.x = 10 + Math.sin(time * 0.4) * 0.8;
      this.duck.position.y = 0.1 + Math.sin(time * 2) * 0.015;
      this.duck.rotation.y = Math.cos(time * 0.4) > 0 ? 0 : Math.PI;
      this.zones.find((z) => z.secret === 'eend').x = this.duck.position.x;
    }
    if (this.merel) this.merel.rotation.z = Math.sin(time * 3) * 0.05;
    if (this.mehmet) {
      const mp = this.mehmet.pos;
      this.mehmetZone.x = this.stinkZone.x = mp.x;
      this.mehmetZone.z = this.stinkZone.z = mp.z;
    }
    if (this.boat) {
      this.boat.position.x = ((time * 0.8 + 30) % 70) - 35;
      this.boat.position.y = -0.15 + Math.sin(time * 1.5) * 0.03;
    }
    const pulse = 0.4 + Math.sin(time * 3) * 0.15;
    if (this.merelMarker) this.merelMarker.material.opacity = pulse;
    if (this.pistachioMarker) this.pistachioMarker.material.opacity = pulse;
    this.checkpoints.forEach((c) => {
      if (c.ring.visible) c.ring.rotation.x = time * 2;
    });
    if (M.water.map) {
      M.water.map.offset.x = time * 0.02;
      M.water.map.offset.y = Math.sin(time * 0.3) * 0.03;
    }
    return false;
  }
}

/** Speakerkast: donker vilt met een fijn raster. */
function speakerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#6a6a6a';
  for (let y = 2; y < 64; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < 64; x += 4) ctx.fillRect(x, y, 2, 2);
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 62, 62);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Pasja: dikke oranje gestreepte kat met witte snuit en borst, groene ogen en een krulstaart. */
function makeCat() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f39a3c';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#c9661c';
  for (let x = 2; x < 64; x += 9) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + 5, 32, x - 1, 64);
    ctx.lineTo(x + 3, 64);
    ctx.quadraticCurveTo(x + 8, 32, x + 3, 0);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const fur = new THREE.MeshLambertMaterial({ map: tex, flatShading: true });
  const white = lambert(0xfbf3e6);
  const pink = lambert(0xf29aa8);
  const eye = lambert(0x7ccf4a, { emissive: 0x2a5a10, emissiveIntensity: 0.4 });
  const dark = lambert(0x1b1b1b);
  const cat = new THREE.Group();
  const add = (geo, mat, x, y, z, parent = cat) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  add(new THREE.SphereGeometry(0.15, 12, 9), fur, 0, 0, 0).scale.set(1, 0.85, 1.45);
  add(new THREE.SphereGeometry(0.1, 10, 8), white, 0, -0.04, 0.12).scale.set(0.9, 0.8, 0.9);
  // Pootjes
  [[-0.07, 0.17], [0.07, 0.17], [-0.08, -0.15], [0.08, -0.15]].forEach(([x, z]) => add(new THREE.SphereGeometry(0.045, 8, 6), white, x, -0.11, z).scale.set(1, 0.7, 1.3));
  // Kop
  const head = new THREE.Group();
  head.position.set(0, 0.09, 0.22);
  cat.add(head);
  add(new THREE.SphereGeometry(0.1, 12, 10), fur, 0, 0, 0, head).scale.set(1.1, 0.95, 1);
  add(new THREE.SphereGeometry(0.05, 10, 8), white, 0, -0.03, 0.07, head).scale.set(1.3, 0.8, 0.8);
  add(new THREE.SphereGeometry(0.012, 6, 4), pink, 0, -0.005, 0.105, head);
  [-1, 1].forEach((sd) => {
    const ear = add(new THREE.ConeGeometry(0.04, 0.08, 4), fur, sd * 0.06, 0.09, -0.005, head);
    ear.rotation.z = -sd * 0.25;
    add(new THREE.ConeGeometry(0.022, 0.05, 4), pink, sd * 0.06, 0.085, 0.008, head).rotation.z = -sd * 0.25;
    add(new THREE.SphereGeometry(0.018, 8, 6), eye, sd * 0.042, 0.025, 0.083, head);
    add(new THREE.BoxGeometry(0.005, 0.022, 0.005), dark, sd * 0.042, 0.025, 0.1, head);
    // Snorharen
    [-0.012, 0.008].forEach((dy) => {
      const w = add(new THREE.CylinderGeometry(0.0025, 0.0025, 0.12, 3), white, sd * 0.07, -0.025 + dy, 0.08, head);
      w.rotation.z = Math.PI / 2 + sd * dy * 8;
      w.castShadow = false;
    });
  });
  // Krulstaart in segmenten
  const tail = new THREE.Group();
  tail.position.set(0, 0.02, -0.2);
  cat.add(tail);
  let parent = tail;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Group();
    seg.position.set(0, i ? 0.06 : 0, i ? 0 : 0);
    seg.rotation.x = i ? -0.35 : -0.9;
    parent.add(seg);
    add(new THREE.CylinderGeometry(0.022, 0.026, 0.07, 6), i === 4 ? lambert(0xc9661c) : fur, 0, 0.03, 0, seg);
    parent = seg;
  }
  cat.userData.tail = tail;
  cat.userData.head = head;
  cat.userData.dynamic = true;
  return cat;
}
