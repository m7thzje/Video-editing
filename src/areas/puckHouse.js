import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  letterboardTexture,
  mapTexture,
  puckPortraitTexture,
  skyTexture,
  tileTexture,
  woodFloorTexture,
} from '../textures.js';
import { Area, makeCard, makeCigarette, makeCookie } from '../world/area.js';
import { lambert, M } from '../world/materials.js';

// Puck's eigen appartement, nagebouwd naar de foto's:
// woonkamer met grijze L-bank, groene tv-wand, ronde bijzettafeltjes, grote zwarte kooi
// met boogdak, eettafel met X-poten en mintgroene stoelen, notenhouten dressoir met
// letterbord, donkere ladekast met monstera en een gang met donkere tegels naar de voordeur.
//
// Woonkamer: x -5..5, z -3.5..3.5. Gang: x 0.4..1.6, z 3.5..10.5. Hoogte 2.6.

const H = 2.6;
const R = { minX: -5, maxX: 5, minZ: -3.5, maxZ: 3.5 };
const HALL = { x0: 0.4, x1: 1.6, z1: 10.5 };
const HALL_DOOR = { x0: 0.5, x1: 1.4 };

const P = {
  wall: lambert(0xf4f1ea),
  green: lambert(0x4d6660),
  sofa: lambert(0x6d6865),
  sofaDark: lambert(0x5b5653),
  oak: lambert(0xc9965e),
  walnut: lambert(0x8a4f2c),
  walnutDark: lambert(0x6e3d21),
  black: lambert(0x222325),
  charcoal: lambert(0x3d3f41),
  mint: lambert(0x9fc9b6),
  curtain: new THREE.MeshLambertMaterial({ color: 0xb9b6b0, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  blind: lambert(0xece8df),
  tv: new THREE.MeshLambertMaterial({ color: 0x151618, emissive: 0x000000 }),
  pinkPerch: lambert(0xb88786),
  navy: lambert(0x2b2f3a),
  blanket: lambert(0x5a3f36),
  whitePot: lambert(0xf2f2ee),
  basket: lambert(0xb08a58),
  spotLeaf: lambert(0x5d8c3f),
  mirror: lambert(0xb9d3dd, { emissive: 0x6d8a96, emissiveIntensity: 0.3 }),
};

export class PuckHouse extends Area {
  constructor(opts) {
    super('puckhuis', opts);
    this.background = skyTexture();
    this.cameraBounds = { minX: R.minX + 0.15, maxX: R.maxX - 0.15, minZ: R.minZ + 0.15, maxZ: HALL.z1 - 0.15, minY: 0.12, maxY: H - 0.15 };
    this.cameraDistance = 1.6;

    // Start: op de roze zitstok naast de kooi, net als op de foto
    this.addSpawn('start', 1.12, 1.25, -2.95, Math.PI / 4);
    this.spawns.start.camYaw = Math.PI / 4 + 0.3;
    this.addSpawn('voordeur', 1.0, 0, 9.9, Math.PI);
    this.portals.push({ x0: HALL.x0, z0: HALL.z1 - 0.3, x1: HALL.x1, z1: HALL.z1 + 1, to: 'buiten', spawn: 'flat' });

    this.buildShell();
    this.buildView();
    this.buildSofa();
    this.buildCoffeeTables();
    this.buildTvWall();
    this.buildCage();
    this.buildDining();
    this.buildSideboard();
    this.buildDresser();
    this.buildHallway();
    this.addLights({ sunPos: new THREE.Vector3(-7, 6, 2.5), center: new THREE.Vector3(0, 0, 3.2), size: 7.8, hemi: 1.7 });
    const hallLamp = new THREE.PointLight(0xffd6a0, 1.4, 5, 1.5);
    hallLamp.position.set(1, 2.3, 7);
    this.group.add(hallLamp);
  }

  wall(x0, y0, z0, x1, y1, z1, mat = P.wall) {
    return this.block(x0, y0, z0, x1, y1, z1, mat, { shadow: false });
  }

  buildShell() {
    const t = 0.25;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(R.maxX - R.minX, R.maxZ - R.minZ),
      new THREE.MeshLambertMaterial({ map: woodFloorTexture(['#c9a47a', '#d1ad84', '#c29d72', '#cfaa80'], [5, 4]) }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(10, 14), lambert(0xfbfaf6));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, H, 3.5);
    this.group.add(ceiling);

    // West: grote raampartij achter de bank + balkondeur
    this.wall(R.minX - t, 0, R.minZ, R.minX, 0.5, R.maxZ);
    this.wall(R.minX - t, 2.35, R.minZ, R.minX, H, R.maxZ);
    this.addCollider(R.minX - t, 0, R.minZ, R.minX - 0.05, H, R.maxZ, { name: 'raam' });
    const glassW = new THREE.Mesh(new THREE.PlaneGeometry(R.maxZ - R.minZ, 1.85), M.glass);
    glassW.rotation.y = Math.PI / 2;
    glassW.position.set(R.minX - 0.08, 1.425, 0);
    this.group.add(glassW);
    for (const z of [-3.45, -1.6, 0.4, 2.45, 3.45]) this.block(R.minX - 0.12, 0.5, z - 0.04, R.minX, 2.35, z + 0.04, M.white, { collide: false });
    this.block(R.minX - 0.12, 0.47, R.minZ, R.minX + 0.02, 0.53, 2.45, M.white, { collide: false });
    // Vitrage
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), P.curtain);
      c.rotation.y = Math.PI / 2 + (i % 2 ? 0.08 : -0.08);
      c.position.set(R.minX + 0.12, 1.3, -2.9 + i * 1.25);
      this.group.add(c);
    }

    // Noord: lounge dicht, eetkamer met raam (x 1.4..4.4)
    const wx0 = 1.4;
    const wx1 = 4.4;
    this.wall(R.minX, 0, R.minZ - t, wx0, H, R.minZ);
    this.wall(wx1, 0, R.minZ - t, R.maxX + t, H, R.minZ);
    this.wall(wx0, 0, R.minZ - t, wx1, 0.95, R.minZ);
    this.wall(wx0, 2.3, R.minZ - t, wx1, H, R.minZ);
    this.addCollider(wx0, 0.95, R.minZ - t, wx1, 2.3, R.minZ - 0.12);
    const glassN = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0, 1.35), M.glass);
    glassN.position.set((wx0 + wx1) / 2, 1.625, R.minZ - 0.12);
    this.group.add(glassN);
    for (const x of [wx0, 2.4, wx1]) this.block(x - 0.04, 0.95, R.minZ - 0.16, x + 0.04, 2.3, R.minZ - 0.08, M.white, { collide: false });
    this.block(wx0 - 0.05, 0.9, R.minZ, wx1 + 0.05, 0.95, R.minZ + 0.22, M.white, { oneWay: true, name: 'vensterbank' });
    // Rolgordijn half omlaag
    this.block(wx0, 2.3, R.minZ, wx1, 2.42, R.minZ + 0.12, P.blind, { collide: false });
    this.block(wx0 + 0.05, 1.95, R.minZ + 0.03, wx1 - 0.05, 2.3, R.minZ + 0.05, P.blind, { collide: false, shadow: false });
    // Radiator onder het raam (beklimbaar)
    const ribs = [];
    for (let x = wx0 + 0.1; x < wx1 - 0.1; x += 0.07) ribs.push(new THREE.BoxGeometry(0.045, 0.55, 0.1).translate(x, 0.43, R.minZ + 0.1));
    const rad = new THREE.Mesh(mergeGeometries(ribs), M.white);
    rad.castShadow = true;
    this.group.add(rad);
    this.addCollider(wx0 + 0.08, 0, R.minZ, wx1 - 0.08, 0.7, R.minZ + 0.16, { climbable: true, name: 'radiator' });

    // Oost: balkondeur (dicht)
    this.wall(R.maxX, 0, R.minZ, R.maxX + t, H, R.maxZ);
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.1), M.glass);
    bd.rotation.y = -Math.PI / 2;
    bd.position.set(R.maxX - 0.02, 1.05, -2.1);
    this.group.add(bd);
    this.block(R.maxX - 0.08, 0, -2.6, R.maxX, 2.15, -2.55, M.white, { collide: false });
    this.block(R.maxX - 0.08, 0, -1.65, R.maxX, 2.15, -1.6, M.white, { collide: false });
    this.block(R.maxX - 0.08, 2.1, -2.6, R.maxX, 2.15, -1.6, M.white, { collide: false });

    // Zuid: groene muur links, deur naar de gang, witte muur rechts
    this.wall(R.minX, 0, R.maxZ, HALL_DOOR.x0, H, R.maxZ + t, P.wall);
    this.block(-2.2, 0, R.maxZ - 0.01, HALL_DOOR.x0 - 0.1, H, R.maxZ, P.green, { collide: false, shadow: false });
    this.wall(HALL_DOOR.x1, 0, R.maxZ, R.maxX, H, R.maxZ + t);
    this.wall(HALL_DOOR.x0, 2.1, R.maxZ, HALL_DOOR.x1, H, R.maxZ + t);
    // Openstaande deur met matglas
    const hinge = new THREE.Group();
    hinge.position.set(HALL_DOOR.x1, 0, R.maxZ - 0.03);
    hinge.rotation.y = -(Math.PI / 2 + 0.25);
    this.group.add(hinge);
    const w = HALL_DOOR.x1 - HALL_DOOR.x0;
    const door = new THREE.Mesh(new THREE.BoxGeometry(w, 2.08, 0.04), M.white);
    door.position.set(-w / 2, 1.04, 0);
    door.castShadow = true;
    hinge.add(door);
    for (let i = 0; i < 4; i++) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.36, 0.05), lambert(0xdde6e6));
      pane.position.set(-w / 2, 0.45 + i * 0.44, 0);
      hinge.add(pane);
    }
    this.addCollider(HALL_DOOR.x1, 0, 2.62, HALL_DOOR.x1 + 0.2, 2.08, R.maxZ, { name: 'deur' });

    // Plinten
    this.block(R.minX, 0, R.minZ, R.maxX, 0.07, R.minZ + 0.015, M.white, { collide: false, shadow: false });
    this.block(R.maxX - 0.015, 0, R.minZ, R.maxX, 0.07, R.maxZ, M.white, { collide: false, shadow: false });
  }

  buildView() {
    // Uitzicht vanaf driehoog: boomtoppen en daken
    const crown = new THREE.IcosahedronGeometry(2.2, 0);
    const spots = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 1.1 + Math.PI * 0.45;
      const d = 14 + ((i * 7) % 9) * 2;
      spots.push([Math.cos(a) * d, -2 - (i % 3), -Math.abs(Math.sin(a) * d) + 3]);
    }
    const tree = new THREE.InstancedMesh(crown, M.treeLeaf, spots.length);
    const m = new THREE.Matrix4();
    spots.forEach(([x, y, z], i) => {
      m.makeScale(1 + (i % 4) * 0.3, 0.8, 1 + (i % 3) * 0.3).setPosition(x, y, z);
      tree.setMatrixAt(i, m);
    });
    this.group.add(tree);
    const roof = lambert(0x6f8fb2);
    this.block(-16, -4, -22, -9, -1.5, -15, roof, { collide: false, shadow: false });
    this.block(6, -4, -24, 14, -2, -16, roof, { collide: false, shadow: false });
  }

  buildSofa() {
    const o = { climbable: true, name: 'bank' };
    const x0 = R.minX + 0.08;
    // Deel langs de noordmuur
    this.block(x0, 0.08, -3.42, -2.3, 0.45, -2.55, P.sofa, o);
    this.block(x0, 0.08, -3.45, -2.3, 0.85, -3.18, P.sofa, o);
    this.block(-2.52, 0.08, -3.42, -2.3, 0.62, -2.55, P.sofa, o);
    // Deel langs het raam
    this.block(x0, 0.08, -2.55, -4.05, 0.45, 1.3, P.sofa, o);
    this.block(x0, 0.08, -3.18, -4.7, 0.85, 1.3, P.sofa, o);
    // Chaise longue
    this.block(x0, 0.08, 1.3, -3.25, 0.45, 2.45, P.sofaDark, o);
    this.block(x0, 0.08, 1.3, -4.7, 0.62, 2.45, P.sofa, o);
    // Kussennaden
    this.block(-3.62, 0.45, -3.2, -3.58, 0.47, -2.55, P.sofaDark, { collide: false, shadow: false });
    this.block(-4.7, 0.45, -1.0, -4.05, 0.47, -0.96, P.sofaDark, { collide: false, shadow: false });
    // Kussens, plaid en speeltje
    const pillow = (x, y, z, ry, mat) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), mat);
      m.scale.set(0.45, 1, 1);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      m.castShadow = true;
      this.group.add(m);
    };
    pillow(-4.45, 0.62, -2.4, 0.7, P.navy);
    pillow(-2.9, 0.62, -2.95, Math.PI / 2, lambert(0xa9c3ad));
    pillow(-4.4, 0.55, 0.9, 0.2, lambert(0xc9cfc4));
    this.block(-4.0, 0.45, 0.2, -3.45, 0.5, 0.95, P.blanket, { collide: false });
    const toyColors = [0xe23b3b, 0xf2c230, 0x3d9be0, 0x6ac46b, 0xe86fb4];
    toyColors.forEach((c, i) => {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), lambert(c));
      b.position.set(-3.9 + i * 0.08, 0.49, 1.9 + Math.sin(i) * 0.08);
      this.group.add(b);
    });
  }

  roundTable(x, z, r, top) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 14), P.oak);
    t.position.set(x, top - 0.02, z);
    t.castShadow = true;
    t.receiveShadow = true;
    this.group.add(t);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.85, 0.012, 4, 16), P.black);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.02, z);
    this.group.add(ring);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      this.block(x + Math.cos(a) * r * 0.82 - 0.012, 0, z + Math.sin(a) * r * 0.82 - 0.012, x + Math.cos(a) * r * 0.82 + 0.012, top - 0.04, z + Math.sin(a) * r * 0.82 + 0.012, P.black, { collide: false });
    }
    const k = r * 0.8;
    this.addCollider(x - k, top - 0.04, z - k, x + k, top, z + k, { oneWay: true, name: 'bijzettafel' });
    this.addCollider(x - 0.03, 0, z - 0.03, x + 0.03, top, z + 0.03, { climbable: true });
  }

  buildCoffeeTables() {
    this.roundTable(-2.2, -1.35, 0.5, 0.46);
    this.roundTable(-3.05, -1.75, 0.34, 0.5);
    this.roundTable(-2.95, -0.75, 0.3, 0.38);
    // Schaaltje en een controller (easter egg: tv aan!)
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.03, 8), lambert(0xc9e46a));
    dish.position.set(-2.0, 0.48, -1.55);
    this.group.add(dish);
    const pad = new THREE.Group();
    const padBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.09), M.white);
    const gripL = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), M.white);
    gripL.position.set(-0.06, 0, 0.035);
    const gripR = gripL.clone();
    gripR.position.x = 0.06;
    pad.add(padBody, gripL, gripR);
    pad.position.set(-2.95, 0.4, -0.75);
    pad.rotation.y = 0.5;
    this.group.add(pad);
    this.zones.push({ x: -2.95, y: 0.38, z: -0.75, r: 0.28, h: 0.3, secret: 'tv', say: 'Watskebeurt? Ik ben op tv!', onEnter: () => this.tvOn() });
  }

  buildTvWall() {
    // Groene wand met witte pilaar
    this.block(-0.75, 0, R.minZ, -0.5, H, -0.6, P.green, { shadow: false, name: 'tv-wand' });
    this.block(-0.78, 0, -0.62, -0.35, H, -0.2, P.wall, { shadow: false });
    // Notenhouten tv-meubel met ribbels
    this.block(-1.3, 0.12, -3.3, -0.76, 0.58, -0.9, P.walnut, { climbable: true, name: 'tv-meubel' });
    for (let z = -3.25; z < -0.95; z += 0.06) {
      this.block(-1.315, 0.16, z, -1.3, 0.54, z + 0.03, P.walnutDark, { collide: false, shadow: false });
    }
    [[-1.25, -3.25], [-1.25, -0.95]].forEach(([x, z]) => this.block(x, 0, z - 0.02, x + 0.03, 0.12, z + 0.02, P.black, { collide: false }));
    // Tv
    this.block(-0.95, 0.58, -2.3, -0.85, 0.66, -1.9, P.black, { collide: false });
    this.block(-0.92, 0.66, -3.05, -0.84, 1.36, -1.15, P.black, { collide: false });
    this.tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 0.64), P.tv);
    this.tvScreen.rotation.y = -Math.PI / 2;
    this.tvScreen.position.set(-0.925, 1.01, -2.1);
    this.group.add(this.tvScreen);
    this.addCollider(-0.95, 0.58, -3.05, -0.84, 1.36, -1.15, { name: 'tv' });

    // Hoge plant (dieffenbachia) in witte pot naast de tv
    this.plant(-1.6, -3.15, 0.2, 0.36, 1.85, P.whitePot, P.spotLeaf);
    // Kartonnen koker bij de pilaar: prima klimpaal
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 10), M.cardboard);
    tube.position.set(-0.2, 0.55, 0.15);
    tube.castShadow = true;
    this.group.add(tube);
    this.addCollider(-0.3, 0, 0.05, -0.1, 1.1, 0.25, { climbable: true, name: 'koker' });
  }

  plant(x, z, r, potH, height, potMat, leafMat) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, potH, 10), potMat);
    pot.position.set(x, potH / 2, z);
    pot.castShadow = true;
    this.group.add(pot);
    this.addCollider(x - r, 0, z - r, x + r, potH, z + r, { climbable: true, name: 'plantenpot' });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, height - potH, 5), M.trunk);
    stem.position.set(x, (potH + height) / 2, z);
    this.group.add(stem);
    this.addCollider(x - 0.05, potH, z - 0.05, x + 0.05, height, z + 0.05, { climbable: true, name: 'stam' });
    const leaf = new THREE.IcosahedronGeometry(0.16, 0);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      const y = potH + 0.3 + (i / 9) * (height - potH - 0.2);
      const m = new THREE.Mesh(leaf, leafMat);
      m.scale.set(1.3, 0.25, 0.6);
      m.position.set(x + Math.cos(a) * 0.18, y, z + Math.sin(a) * 0.18);
      m.rotation.set(0.3, -a, 0.4);
      m.castShadow = true;
      this.group.add(m);
    }
    this.addCollider(x - 0.2, height - 0.03, z - 0.2, x + 0.2, height, z + 0.2, { oneWay: true, name: 'bladeren' });
  }

  buildCage() {
    // Grote zwarte kooi met boogdak, zoals op de foto
    const x0 = -0.3;
    const x1 = 0.95;
    const z0 = -3.4;
    const z1 = -2.6;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const base = 0.5;
    const top = 1.65;
    const parts = [];
    const bar = (x, z, y0, y1) => parts.push(new THREE.CylinderGeometry(0.008, 0.008, y1 - y0, 4).translate(x, (y0 + y1) / 2, z));
    // Pootjes met wieltjes
    [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].forEach(([x, z]) => {
      bar(x, z, 0.05, base);
      parts.push(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8).rotateX(Math.PI / 2).translate(x, 0.03, z));
    });
    // Tralies
    for (let x = x0; x <= x1 + 0.001; x += 0.05) {
      bar(x, z0, base, top);
      bar(x, z1, base, top);
    }
    for (let z = z0 + 0.05; z < z1; z += 0.05) {
      bar(x0, z, base, top);
      bar(x1, z, base, top);
    }
    [0.95, 1.3, top].forEach((y) => {
      parts.push(new THREE.BoxGeometry(x1 - x0, 0.02, 0.02).translate(cx, y, z0));
      parts.push(new THREE.BoxGeometry(x1 - x0, 0.02, 0.02).translate(cx, y, z1));
      parts.push(new THREE.BoxGeometry(0.02, 0.02, z1 - z0).translate(x0, y, cz));
      parts.push(new THREE.BoxGeometry(0.02, 0.02, z1 - z0).translate(x1, y, cz));
    });
    // Boogdak met "zonnewielen" voor en achter
    const arcR = (x1 - x0) / 2;
    [z0, z1].forEach((z) => {
      parts.push(new THREE.TorusGeometry(arcR, 0.012, 4, 20, Math.PI).translate(cx, top, z));
      for (let i = 1; i < 8; i++) {
        const a = (i / 8) * Math.PI;
        const g = new THREE.BoxGeometry(arcR, 0.008, 0.008);
        g.translate(arcR / 2, 0, 0).rotateZ(a).translate(cx, top, z);
        parts.push(g);
      }
    });
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI;
      parts.push(new THREE.CylinderGeometry(0.007, 0.007, z1 - z0, 4).rotateX(Math.PI / 2).translate(cx + Math.cos(a) * arcR, top + Math.sin(a) * arcR, cz));
    }
    const cage = new THREE.Mesh(mergeGeometries(parts), P.black);
    cage.castShadow = true;
    this.group.add(cage);
    // Bodemlade
    this.block(x0 - 0.1, base - 0.12, z0 - 0.05, x1 + 0.1, base, z1 + 0.05, P.black, { climbable: true, name: 'kooi' });
    this.block(x0, base, z0, x1, base + 0.03, z1, lambert(0x8b6a44), { collide: false, shadow: false });
    this.addCollider(x0, 0, z0, x1, base - 0.12, z1, { climbable: true });
    this.addCollider(x0, base, z0, x1, top, z1, { climbable: true, name: 'kooi' });
    this.addCollider(x0, top - 0.02, z0, x1, top, z1, { climbable: true, name: 'kooidak' });
    // Houten stok bovenop met etensbakjes
    this.block(x0 + 0.05, top + arcR + 0.02, cz - 0.025, x1 - 0.05, top + arcR + 0.06, cz + 0.025, P.oak, { oneWay: true, name: 'stok' });
    [x0 + 0.25, x1 - 0.25].forEach((x) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.05, 8), M.metal);
      cup.position.set(x, top + arcR + 0.09, cz + 0.07);
      this.group.add(cup);
    });
    // Binnenin: stokjes en speelgoed
    this.block(x0 + 0.05, 1.05, cz - 0.015, x1 - 0.05, 1.08, cz + 0.015, P.oak, { collide: false });
    const toy = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), M.cardboard);
    toy.position.set(cx - 0.2, top + 0.1, cz);
    this.group.add(toy);
    // Roze betonnen zitstok aan de zijkant: Puck's favoriete plekje
    const perch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.4, 7), P.pinkPerch);
    perch.rotation.z = Math.PI / 2;
    perch.position.set(x1 + 0.2, 1.2, z0 + 0.45);
    perch.castShadow = true;
    this.group.add(perch);
    this.addCollider(x1, 1.17, z0 + 0.36, x1 + 0.4, 1.23, z0 + 0.54, { oneWay: true, name: 'zitstok' });
  }

  buildDining() {
    // Tafel met eiken blad en zwarte X-poten
    const tx0 = 1.9;
    const tx1 = 3.7;
    const tz0 = -2.3;
    const tz1 = -1.3;
    const top = 0.76;
    this.block(tx0, top - 0.05, tz0, tx1, top, tz1, P.oak, { oneWay: true, name: 'eettafel' });
    [tx0 + 0.25, tx1 - 0.25].forEach((x) => {
      [0.75, -0.75].forEach((rot) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.95, 0.07), P.charcoal);
        leg.position.set(x, (top - 0.05) / 2, (tz0 + tz1) / 2);
        leg.rotation.x = rot;
        leg.castShadow = true;
        this.group.add(leg);
      });
      this.addCollider(x - 0.04, 0, (tz0 + tz1) / 2 - 0.04, x + 0.04, top, (tz0 + tz1) / 2 + 0.04, { climbable: true, name: 'tafelpoot' });
    });
    // Spulletjes op tafel
    this.block(2.9, top, -2.1, 3.15, top + 0.12, -1.95, lambert(0xf3c6cf), { collide: false });
    this.block(2.2, top, -1.9, 2.6, top + 0.01, -1.55, M.white, { collide: false, shadow: false });
    // Een sigaretje tussen de spullen (grapje: Puck doet 'm stoer in zijn snavel)
    this.addCollectible('sigaret', makeCigarette(), 3.35, top, -1.55, { secret: 'sigaret', glowSize: 0.2 });
    const tape = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 5, 10), M.metalDark);
    tape.rotation.x = Math.PI / 2;
    tape.position.set(2.75, top + 0.015, -1.6);
    this.group.add(tape);

    // Mintgroene kuipstoelen met houten pootjes
    const chair = (x, z, ry) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      this.group.add(g);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.42), P.mint);
      seat.position.y = 0.45;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.05), P.mint);
      back.position.set(0, 0.66, -0.2);
      back.rotation.x = -0.15;
      seat.castShadow = back.castShadow = true;
      g.add(seat, back);
      [[-0.16, -0.15], [0.16, -0.15], [-0.16, 0.15], [0.16, 0.15]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 4), P.oak);
        leg.position.set(lx, 0.22, lz);
        leg.rotation.set(lz * 0.6, 0, -lx * 0.6);
        g.add(leg);
      });
      this.addCollider(x - 0.2, 0, z - 0.2, x + 0.2, 0.48, z + 0.2, { climbable: true, name: 'stoel' });
    };
    chair(2.5, -2.75, 0);
    chair(4.15, -1.8, -Math.PI / 2);

    // Yucca in zwarte pot in de hoek + mandje
    this.plant(4.55, -3.05, 0.25, 0.5, 1.6, P.black, M.leaf);
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.25, 10), P.basket);
    basket.position.set(4.2, 0.125, -2.4);
    this.group.add(basket);
    this.addCollider(4.02, 0, -2.58, 4.38, 0.25, -2.22, { climbable: true });
    this.leafCluster(4.2, 0.4, -2.4, 0.16);
  }

  buildSideboard() {
    // Notenhouten dressoir met ronde zijkanten en ribbeldeurtjes
    const x0 = 2.05;
    const x1 = 4.35;
    const z0 = 3.02;
    const z1 = 3.48;
    const h = 0.78;
    this.block(x0 + 0.12, 0.15, z0, x1 - 0.12, h, z1, P.walnut, { collide: false });
    [x0 + 0.12, x1 - 0.12].forEach((x) => {
      const end = new THREE.Mesh(new THREE.CylinderGeometry((z1 - z0) / 2, (z1 - z0) / 2, h - 0.15, 10, 1, false, 0, Math.PI), P.walnut);
      end.position.set(x, (h + 0.15) / 2, (z0 + z1) / 2);
      end.rotation.y = x < 3 ? -Math.PI / 2 : Math.PI / 2;
      end.scale.set(1, 1, 0.55);
      end.castShadow = true;
      this.group.add(end);
    });
    this.addCollider(x0, 0, z0, x1, h, z1, { climbable: true, name: 'dressoir' });
    for (let x = x0 + 0.2; x < x1 - 0.15; x += 0.07) {
      this.block(x, 0.2, z0 - 0.012, x + 0.035, h - 0.05, z0, P.walnutDark, { collide: false, shadow: false });
    }
    [x0 + 0.3, x1 - 0.3].forEach((x) => this.block(x - 0.015, 0, z0 + 0.15, x + 0.015, 0.15, z0 + 0.18, P.black, { collide: false }));

    // Letterbord: "MAG IK WEL EEN KOEKJE? PUCK 2026"
    this.block(3.7, h, 3.2, 4.0, h + 0.12, 3.42, P.navy, { collide: false });
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.34, 0.03),
      [P.walnut, P.walnut, P.walnut, P.walnut, new THREE.MeshLambertMaterial({ map: letterboardTexture(['MAG IK', 'WEL EEN', 'KOEKJE?', 'PUCK 2026']) }), P.walnut],
    );
    board.position.set(3.85, h + 0.12 + 0.17, 3.36);
    board.rotation.set(-0.12, Math.PI, 0);
    board.castShadow = true;
    this.group.add(board);
    this.zones.push({ x: 3.6, y: h, z: 3.2, r: 0.45, h: 0.4, secret: 'letterbord', say: 'Mag ik een koekje?' });
    // ...en daar ligt er eentje, verstopt achter het letterbord
    this.addCollectible('koekje', makeCookie(), 4.2, h, 3.32, { secret: 'koekje', glowSize: 0.2 });
    // Kaarsen, droogbloemen en een zwart aapje
    [[2.9, 0.28], [3.15, 0.22]].forEach(([x, hh]) => {
      this.block(x - 0.012, h, 3.23, x + 0.012, h + hh, 3.26, M.white, { collide: false });
    });
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 8), lambert(0xe7e3da));
    vase.position.set(2.6, h + 0.1, 3.25);
    this.group.add(vase);
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.25, 4), lambert(i % 2 ? 0xd8b98a : 0xc9906a));
      s.position.set(2.6 + Math.sin(i) * 0.06, h + 0.35, 3.25 + Math.cos(i) * 0.05);
      s.rotation.z = Math.sin(i) * 0.4;
      this.group.add(s);
    }
    // Oude stadskaart erboven
    this.block(2.8, 1.45, R.maxZ - 0.03, 3.6, 2.0, R.maxZ, P.black, { collide: false, shadow: false });
    const map = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.47), new THREE.MeshLambertMaterial({ map: mapTexture() }));
    map.rotation.y = Math.PI;
    map.position.set(3.2, 1.725, R.maxZ - 0.035);
    this.group.add(map);
  }

  buildDresser() {
    // Twee donkere ladekasten tegen de groene muur, met een monstera
    const z0 = 3.02;
    const z1 = 3.48;
    [[-2.0, -0.95], [-0.93, 0.2]].forEach(([x0, x1]) => {
      this.block(x0, 0.03, z0, x1, 0.85, z1, P.charcoal, { climbable: true, name: 'ladekast' });
      for (let i = 1; i < 4; i++) this.block(x0 + 0.02, i * 0.21, z0 - 0.01, x1 - 0.02, i * 0.21 + 0.012, z0, P.black, { collide: false, shadow: false });
    });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.3, 10), P.whitePot);
    pot.position.set(-1.7, 1.0, 3.25);
    this.group.add(pot);
    const leaf = new THREE.CircleGeometry(0.22, 7);
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(leaf, lambert(0x2f6b3a, { side: THREE.DoubleSide }));
      const a = i * 0.9;
      m.position.set(-1.7 + Math.cos(a) * 0.3, 1.3 + (i % 3) * 0.12, 3.15 + Math.sin(a) * 0.15);
      m.rotation.set(-1.0 + (i % 3) * 0.3, a, 0.3);
      m.castShadow = true;
      this.group.add(m);
    }
    // Poolkaart op de groene muur
    const map = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.0), new THREE.MeshLambertMaterial({ map: mapTexture() }));
    map.rotation.y = Math.PI;
    map.position.set(-0.9, 1.65, R.maxZ - 0.02);
    this.group.add(map);
    // Kandelaar
    this.block(0.3, 0, 3.3, 0.33, 1.2, 3.33, P.black, { collide: false });
    [0.9, 1.05, 1.2].forEach((y, i) => this.block(0.28 + i * 0.03, y, 3.3, 0.3 + i * 0.03, y + 0.15, 3.32, M.white, { collide: false }));
  }

  buildHallway() {
    const { x0, x1, z1 } = HALL;
    const z0 = R.maxZ;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshLambertMaterial({ map: tileTexture([1, 5]) }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((x0 + x1) / 2, 0.002, (z0 + z1) / 2);
    floor.receiveShadow = true;
    this.group.add(floor);
    this.wall(x0 - 0.2, 0, z0, x0, H, z1);
    this.wall(x1, 0, z0, x1 + 0.2, H, z1);
    this.wall(x0, 0, z1, x1, H, z1 + 0.2, P.wall);
    // Andere deuren (dicht)
    [[x0 + 0.005, 6.0, Math.PI / 2], [x1 - 0.005, 8.8, -Math.PI / 2]].forEach(([x, z, ry]) => {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.05), M.white);
      d.rotation.y = ry;
      d.position.set(x, 1.025, z);
      this.group.add(d);
    });
    // Zwarte voordeur met glasstrook (leidt naar buiten)
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.1), P.black);
    door.rotation.y = Math.PI;
    door.position.set(1.0, 1.05, z1 - 0.01);
    this.group.add(door);
    const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.1), lambert(0xf6f3e6, { emissive: 0xfff2cc, emissiveIntensity: 0.6 }));
    slit.rotation.y = Math.PI;
    slit.position.set(1.0, 1.2, z1 - 0.015);
    this.group.add(slit);
    this.block(0.62, 0, z1 - 0.6, 1.38, 0.01, z1 - 0.05, P.navy, { collide: false, shadow: false });
    // Kapstok met jassen (beklimbaar!)
    this.block(x0, 1.8, 4.4, x0 + 0.06, 1.84, 6.0, M.metal, { collide: false });
    [[4.6, 0x9a9486], [5.05, 0xb59d7c], [5.5, 0x2a2a2a]].forEach(([z, c]) => {
      this.block(x0 + 0.02, 0.45, z - 0.2, x0 + 0.26, 1.8, z + 0.2, lambert(c), { collide: false });
      this.addCollider(x0, 0, z - 0.2, x0 + 0.26, 1.8, z + 0.2, { climbable: true, name: 'jas' });
    });
    // Een zeldzaam kaartje bovenop de jassen
    this.addCollectible('kaart', makeCard(), x0 + 0.14, 1.8, 5.05, { secret: 'kaart', glow: 0xffb347, glowSize: 0.35 });
    // Kastje met drie ronde spiegels erboven
    this.block(x1 - 0.4, 0, 4.0, x1, 0.9, 4.8, P.walnut, { climbable: true, name: 'kastje' });
    [[1.25, 4.2, 0.2], [1.62, 4.5, 0.14], [1.2, 4.7, 0.18]].forEach(([y, z, r]) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), P.mirror);
      m.rotation.y = -Math.PI / 2;
      m.position.set(x1 - 0.01, y, z);
      this.group.add(m);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 4, 16), P.black);
      rim.rotation.y = -Math.PI / 2;
      rim.position.copy(m.position);
      this.group.add(rim);
    });
    this.zones.push({ x: x1 - 0.2, y: 0.9, z: 4.4, r: 0.45, h: 0.4, secret: 'spiegel', say: 'Watskebeurt? Wat een knappe vogel!' });
    // Rode tas op de grond
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.35), lambert(0xc8203a));
    bag.position.set(x1 - 0.12, 0.125, 5.2);
    bag.rotation.y = 0.2;
    bag.castShadow = true;
    this.group.add(bag);
    this.addCollider(x1 - 0.2, 0, 5.0, x1, 0.25, 5.4, { climbable: true, name: 'tas' });
  }

  tvOn() {
    if (this.tvScreen.material.map) return;
    this.tvScreen.material = new THREE.MeshBasicMaterial({ map: puckPortraitTexture('#7ec8f2') });
  }

  update(dt, time) {
    this.animateCollectibles(dt, time);
    return false;
  }
}
