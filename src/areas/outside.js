import * as THREE from 'three';
import { applyWind, Birds, bunting, Butterflies, Clouds, Fountain, makeSkyDome, waterTexture } from '../world/fx.js';
import { Area, glowSprite, makeFeather, makeFries, makePistachio, makeSign } from '../world/area.js';
import { lambert, M } from '../world/materials.js';

// De open wereld rond Puck's flat. Hier liggen de toegangen tot de minigames:
//   - Pistachehuis (deur)                       -> 10 pistachenootjes zoeken
//   - Verenjacht                                -> 8 rode veren door de hele buurt
//   - Stapstenen over de vijver                 -> parcours op tijd
//   - De merel in de grote boom                 -> liedjes nazingen
// Plus patatkramen (superkracht!) en een hoop geheimpjes.

const SIZE = 30; // wereld loopt van -30..30
export const POND = { x: 10, z: 8, r: 5.5 };
const STONE_START = new THREE.Vector3(3.7, 0, 8);
export const STONE_TARGET_TIME = 18;

export class Outside extends Area {
  constructor(opts) {
    super('buiten', opts);
    this.background = new THREE.Color(0xbfe6ff);
    this.fog = new THREE.Fog(0xe4eef0, 30, 105);
    this.walkSpeed = 2.6;
    this.cameraDistance = 2.3;
    this.cameraBounds = { minX: -SIZE + 0.5, maxX: SIZE - 0.5, minZ: -SIZE + 0.5, maxZ: SIZE - 0.5, minY: 0.15, maxY: 14 };

    this.addSpawn('flat', 0, 0, -15.3, 0);
    this.spawns.flat.camYaw = 0.5;
    this.addSpawn('pistachehuis', -11.2, 0, 5.55, Math.PI / 2);
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
    // Puck woont driehoog in deze flat
    const x0 = -8;
    const x1 = 8;
    const z0 = -24;
    const z1 = -16;
    const h = 12;
    this.block(x0, 0, z0, x1, h, z1, lambert(0xd9c7ae), { climbable: false, name: 'flat' });
    this.block(x0 - 0.2, h, z0 - 0.2, x1 + 0.2, h + 0.3, z1 + 0.2, lambert(0x8c7a66), { collide: false });
    // Ramen en balkons
    const win = new THREE.PlaneGeometry(1.4, 1.2);
    const count = 4 * 8;
    const wins = new THREE.InstancedMesh(win, M.windowBlue, count);
    const m = new THREE.Matrix4();
    let i = 0;
    for (let f = 0; f < 4; f++) {
      for (let k = 0; k < 8; k++) {
        m.makeTranslation(x0 + 1 + k * 2, 1.8 + f * 2.8, z1 + 0.01);
        wins.setMatrixAt(i++, m);
      }
    }
    this.group.add(wins);
    for (let f = 1; f < 4; f++) {
      this.block(x0 + 0.5, f * 2.8 + 0.2, z1, x1 - 0.5, f * 2.8 + 0.3, z1 + 1.0, lambert(0xf2eee6), { collide: false });
      this.block(x0 + 0.5, f * 2.8 + 0.3, z1 + 0.95, x1 - 0.5, f * 2.8 + 1.2, z1 + 1.0, lambert(0x6f8fb2), { collide: false, shadow: false });
    }
    // Puck's raam (derde verdieping) met een rood gordijntje
    this.block(-1.2, 2 * 2.8 + 1.25, z1 + 0.02, -0.4, 2 * 2.8 + 2.35, z1 + 0.05, M.red, { collide: false, shadow: false });
    // Entree met zwarte voordeur
    this.block(-1.4, 0, z1, 1.4, 2.6, z1 + 0.15, lambert(0xefe6d8), { collide: false });
    this.block(-0.5, 0, z1 + 0.15, 0.5, 2.1, z1 + 0.18, lambert(0x222325), { collide: false });
    this.block(-0.05, 0.7, z1 + 0.18, 0.05, 1.8, z1 + 0.19, lambert(0xf6f3e6, { emissive: 0xfff2cc, emissiveIntensity: 0.5 }), { collide: false, shadow: false });
    this.block(-1.6, 2.6, z1, 1.6, 2.75, z1 + 1.4, lambert(0x8c7a66), { collide: false });
    this.portals.push({ x0: -0.55, z0: z1 - 1, x1: 0.55, z1: z1 + 0.45, to: 'puckhuis', spawn: 'voordeur' });
    this.sign(['Puck woont', 'hier 🦜'], 1.9, 1.6, z1 + 0.02, 0, { width: 0.8, height: 0.45 });
    // Brievenbus
    this.block(-2.6, 0, -14.6, -2.5, 0.9, -14.5, M.metalDark, { collide: false });
    this.block(-2.8, 0.9, -14.75, -2.3, 1.1, -14.35, M.red, { climbable: true, name: 'brievenbus' });
    this.addCollider(-2.6, 0, -14.6, -2.5, 0.9, -14.5, { climbable: true });
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
    this.portals.push({ x0: x1 - 0.5, z0: 5.1, x1: x1 + 0.3, z1: 6.0, to: 'pistachehuis', spawn: 'deur' });
    // Uithangbord met logo
    const board = this.sign(['Pistachehuis', '10 nootjes verstopt!'], x1 + 0.05, 2.65, 5.55, Math.PI / 2, { width: 1.5, height: 0.55, bg: '#e8f3d6' });
    board.material.side = THREE.DoubleSide;
    const nut = makePistachio();
    nut.scale.setScalar(4);
    nut.position.set(x1 + 0.25, 3.15, 5.55);
    this.group.add(nut);
    this.pistachioMarker = glowSprite(0xb6e36a, 1.1, 0.5);
    this.pistachioMarker.position.set(x1 + 0.3, 3.2, 5.55);
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
    this.group.add(merel);
    this.merel = merel;
    this.merelMarker = glowSprite(0x9ad3ff, 0.9, 0.5);
    this.merelMarker.position.set(x + 1.0, 1.9, z);
    this.group.add(this.merelMarker);
    this.zones.push({ x: x + 1.0, y: 0, z, r: 1.3, h: 1.6, id: 'merel', prompt: 'Zing met de merel 🎵' });
    this.sign(['🎵 Zing met', 'de merel'], x + 2.2, 0.9, z + 0.8, -Math.PI / 2 + 0.5, { width: 0.8, height: 0.4 });
    this.block(x + 2.15, 0, z + 0.75, x + 2.2, 0.7, z + 0.8, M.woodDark, { collide: false });
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
    this.sign(['🍟 PATAT 🍟', 'geeft superkracht!'], (x0 + x1) / 2, 2.6, (z0 + z1) / 2 + 0.01, 0, { width: 1.6, height: 0.5, bg: '#fff3b0' });

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
    [[-3.4, 3], [3.4, -3], [0, -12], [-8, 3.5]].forEach(([x, z]) => {
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
      posts.push([t, -SIZE], [t, SIZE], [-SIZE, t], [SIZE, t]);
    }
    const geo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const fence = new THREE.InstancedMesh(geo, M.fence, posts.length);
    const m = new THREE.Matrix4();
    posts.forEach(([x, z], i) => fence.setMatrixAt(i, m.makeTranslation(x, 0.4, z)));
    this.group.add(fence);
    const rail = (x0, z0, x1, z1) => this.block(x0, 0.55, z0, x1, 0.65, z1, M.fence, { collide: false, shadow: false });
    rail(-SIZE, -SIZE - 0.03, SIZE, -SIZE + 0.03);
    rail(-SIZE, SIZE - 0.03, SIZE, SIZE + 0.03);
    rail(-SIZE - 0.03, -SIZE, -SIZE + 0.03, SIZE);
    rail(SIZE - 0.03, -SIZE, SIZE + 0.03, SIZE);
    this.addCollider(-SIZE - 1, 0, -SIZE - 1, SIZE + 1, 3, -SIZE);
    this.addCollider(-SIZE - 1, 0, SIZE, SIZE + 1, 3, SIZE + 1);
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
    spots.push([-24, -4], [24, 2], [-9, 20], [18, 20], [-24, 16], [6, 22], [24, -14], [-11, -22]);
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
      } while (Math.abs(x) < 2 || (x > -21 && x < -11 && z > 1 && z < 10) || Math.hypot(x - POND.x, z - POND.z) < POND.r + 1 || (Math.abs(x) < 9 && z < -15));
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
      [-2.55, 1.1, -14.55, 'op de brievenbus'],
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
    bunting(this.group, new THREE.Vector3(3.4, 2.35, -3), new THREE.Vector3(0, 2.35, -12), 22, 0.7);
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
      } while (Math.abs(x) < 1.2 || Math.hypot(x, z) < 3.4 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.5 || (Math.abs(x) < 9 && z < -15) || (x > -21 && x < -11 && z > 1 && z < 10));
      const sc = 0.7 + rnd() * 0.8;
      m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6), new THREE.Vector3(sc, sc, sc));
      tufts.setMatrixAt(i, m);
    }
    this.group.add(tufts);
  }

  // ---------- Gameplay ----------

  get feathers() {
    return this.collectibles.filter((c) => c.type === 'veer');
  }

  hazardAt(p) {
    const d = Math.hypot(p.x - POND.x, p.z - POND.z);
    if (d < POND.r - 0.05 && p.y < 0.05) return { respawn: STONE_START, yaw: Math.PI / 2 };
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
