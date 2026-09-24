import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { puckPortraitTexture, rugTexture, skyTexture, wallpaperTexture, woodFloorTexture } from '../textures.js';
import { Area, makePistachio } from '../world/area.js';
import { Neighbor } from './neighbor.js';
import { addShaft, DustMotes } from '../world/fx.js';
import { lambert, M } from '../world/materials.js';

// Het Pistachehuis van de buren: hier verstopt de buurvrouw 10 pistachenootjes.
// Eenheden zijn ongeveer meters. De kamer loopt van x -4..4, z -3.5..3.5, hoogte 2.7.

export const ROOM = { minX: -4, maxX: 4, minZ: -3.5, maxZ: 3.5, height: 2.7 };
const DOOR = { x: 4, z0: 1.6, z1: 2.5, height: 2.1 };
const WINDOW = { x0: -0.5, x1: 1.3, y0: 0.9, y1: 2.1 };

export class PistachioHouse extends Area {
  constructor(opts) {
    super('pistachehuis', opts);
    this.boxes = [];
    this.addSpawn('deur', 3.45, 0, 2.05, -Math.PI / 2);
    this.portals.push({ x0: ROOM.maxX + 0.1, z0: DOOR.z0, x1: ROOM.maxX + 1, z1: DOOR.z1, to: 'buiten', spawn: 'pistachehuis' });
    this.cameraBounds = {
      minX: ROOM.minX + 0.15,
      maxX: ROOM.maxX - 0.15,
      minZ: ROOM.minZ + 0.15,
      maxZ: ROOM.maxZ - 0.15,
      minY: 0.12,
      maxY: ROOM.height - 0.15,
    };

    this.buildShell();
    this.buildOutside();
    this.buildWindow();
    this.buildSofa();
    this.buildCoffeeTable();
    this.buildDiningTable();
    this.buildCage();
    this.buildPlant();
    this.buildBookcase();
    this.buildLamp();
    this.buildDoor();
    this.buildBoxes();
    this.buildNuts();
    this.buildLights();

    // Zonnestralen door het raam en stofjes
    [0.0, 0.9].forEach((x) => addShaft(this.group, new THREE.Vector3(x, 1.9, -3.5), new THREE.Vector3(x - 0.7, 0, -1.3), 0.8));
    this.fx.push(new DustMotes(this.group, new THREE.Box3(new THREE.Vector3(-1.2, 0.3, -3.3), new THREE.Vector3(1.6, 2.2, -0.8)), 50));

    // De chagrijnige buurvrouw loopt haar vaste rondje
    this.neighbor = new Neighbor(this.group, [
      [-1.0, -1.6, 1.5],
      [1.6, -1.5, 1.0],
      [3.0, -0.4, 2.0],
      [2.9, 0.0, 0.5],
      [0.3, 0.0, 0.5],
      [0.1, 2.55, 1.5],
      [-1.3, 1.3, 1.0],
      [-1.2, -0.6, 0.5],
    ]);
  }

  enter() {
    super.enter();
    this.neighbor.reset();
  }

  updateNeighbor(dt, time, puckPos, hidden) {
    return this.neighbor.update(dt, time, puckPos, hidden, this.colliders);
  }

  // ---------- Kamer ----------

  buildShell() {
    const { minX, maxX, minZ, maxZ, height } = ROOM;
    const t = 0.3; // wanddikte (buiten de kamer)

    const floorTex = woodFloorTexture();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(maxX - minX, maxZ - minZ),
      new THREE.MeshLambertMaterial({ map: floorTex }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.9),
      new THREE.MeshLambertMaterial({ map: rugTexture() }),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-1.9, 0.005, 0);
    rug.receiveShadow = true;
    this.group.add(rug);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX, maxZ - minZ), lambert(0xfff7ea));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    this.group.add(ceiling);

    const wallMat = new THREE.MeshLambertMaterial({ map: wallpaperTexture() });
    const wall = (x0, y0, z0, x1, y1, z1) =>
      this.block(x0, y0, z0, x1, y1, z1, wallMat, { shadow: false });

    // Achterwand (z = minZ) met raamopening
    wall(minX - t, 0, minZ - t, WINDOW.x0, height, minZ);
    wall(WINDOW.x1, 0, minZ - t, maxX + t, height, minZ);
    wall(WINDOW.x0, 0, minZ - t, WINDOW.x1, WINDOW.y0, minZ);
    wall(WINDOW.x0, WINDOW.y1, minZ - t, WINDOW.x1, height, minZ);
    // Voorwand
    wall(minX - t, 0, maxZ, maxX + t, height, maxZ + t);
    // Linkerwand
    wall(minX - t, 0, minZ, minX, height, maxZ);
    // Rechterwand met deuropening
    wall(maxX, 0, minZ, maxX + t, height, DOOR.z0);
    wall(maxX, 0, DOOR.z1, maxX + t, height, maxZ);
    wall(maxX, DOOR.height, DOOR.z0, maxX + t, height, DOOR.z1);

    // Plinten
    const skirt = M.white;
    this.block(minX, 0, minZ, maxX, 0.08, minZ + 0.02, skirt, { collide: false, shadow: false });
    this.block(minX, 0, maxZ - 0.02, maxX, 0.08, maxZ, skirt, { collide: false, shadow: false });
    this.block(minX, 0, minZ, minX + 0.02, 0.08, maxZ, skirt, { collide: false, shadow: false });
    this.block(maxX - 0.02, 0, minZ, maxX, 0.08, DOOR.z0, skirt, { collide: false, shadow: false });
    this.block(maxX - 0.02, 0, DOOR.z1, maxX, 0.08, maxZ, skirt, { collide: false, shadow: false });

    // Schilderij boven de bank: een portret van... Puck! (easter egg)
    this.block(minX, 1.25, -0.45, minX + 0.04, 1.95, 0.45, M.woodDark, { collide: false, shadow: false });
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshLambertMaterial({ map: puckPortraitTexture() }));
    art.rotation.y = Math.PI / 2;
    art.position.set(minX + 0.045, 1.6, 0);
    this.group.add(art);
    this.zones.push({ x: -3.84, y: 0.88, z: 0, r: 0.8, h: 0.5, secret: 'portret', say: 'Watskebeurt? Dat ben ik!' });
  }

  buildOutside() {
    this.background = skyTexture();

    const grass = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), M.grass);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.01;
    this.group.add(grass);

    // Pad naar buiten bij de deur
    const path = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.9), lambert(0xe6d2a8));
    path.rotation.x = -Math.PI / 2;
    path.position.set(ROOM.maxX + 2.3, 0.002, (DOOR.z0 + DOOR.z1) / 2);
    this.group.add(path);

    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.2, 6);
    const crownGeo = new THREE.IcosahedronGeometry(0.9, 0);
    const trees = [
      [-3, -8], [1.5, -9], [4, -7], [-6, -6], [8, 0], [9, 4], [7, -4], [10, -1], [-1, -12],
    ];
    trees.forEach(([x, z], i) => {
      const trunk = new THREE.Mesh(trunkGeo, M.trunk);
      trunk.position.set(x, 0.6, z);
      const crown = new THREE.Mesh(crownGeo, i % 2 ? M.treeLeaf : M.leaf);
      const s = 1 + ((i * 37) % 10) / 20;
      crown.scale.setScalar(s);
      crown.position.set(x, 1.4 + s * 0.5, z);
      this.group.add(trunk, crown);
    });
  }

  buildWindow() {
    const z = ROOM.minZ;
    const { x0, x1, y0, y1 } = WINDOW;
    const f = 0.06;
    // Kozijn
    this.block(x0, y0, z - 0.3, x1, y0 + f, z + 0.02, M.white, { collide: false });
    this.block(x0, y1 - f, z - 0.3, x1, y1, z + 0.02, M.white, { collide: false });
    this.block(x0, y0, z - 0.3, x0 + f, y1, z + 0.02, M.white, { collide: false });
    this.block(x1 - f, y0, z - 0.3, x1, y1, z + 0.02, M.white, { collide: false });
    this.block((x0 + x1) / 2 - f / 2, y0, z - 0.2, (x0 + x1) / 2 + f / 2, y1, z - 0.12, M.white, { collide: false });
    // Glas: geen botsvorm nodig, de vensterbank en het kozijn houden Puck binnen
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), M.glass);
    glass.position.set((x0 + x1) / 2, (y0 + y1) / 2, z - 0.16);
    this.group.add(glass);
    this.addCollider(x0, y0, z - 0.3, x1, y1, z - 0.12, { name: 'glas' });

    // Vensterbank (begaanbaar)
    this.block(x0 - 0.12, y0 - 0.05, z, x1 + 0.12, y0, z + 0.26, M.white, { oneWay: true, name: 'vensterbank' });

    // Radiator eronder: beklimbaar
    const rad = new THREE.Group();
    this.group.add(rad);
    for (let x = x0 + 0.05; x < x1 - 0.05; x += 0.1) {
      this.block(x, 0.12, z + 0.02, x + 0.07, 0.5, z + 0.2, M.white, { collide: false, parent: rad });
    }
    this.block(x0 + 0.03, 0.5, z + 0.02, x1 - 0.03, 0.52, z + 0.2, M.white, { collide: false, parent: rad });
    this.addCollider(x0, 0, z, x1, 0.52, z + 0.2, { climbable: true, name: 'radiator' });

    // Gordijnen
    const curtain = lambert(0xe9806e);
    this.block(x0 - 0.45, 0.3, z + 0.02, x0 - 0.15, y1 + 0.3, z + 0.12, curtain, { collide: false });
    this.block(x1 + 0.15, 0.3, z + 0.02, x1 + 0.45, y1 + 0.3, z + 0.12, curtain, { collide: false });
    this.block(x0 - 0.55, y1 + 0.3, z + 0.03, x1 + 0.55, y1 + 0.35, z + 0.08, M.woodDark, { collide: false });
  }

  buildSofa() {
    const x0 = ROOM.minX + 0.05;
    const x1 = x0 + 0.9;
    const z0 = -1.2;
    const z1 = 1.2;
    const o = { climbable: true, name: 'bank' };
    // Zitting en onderstel
    this.block(x0 + 0.2, 0.06, z0 + 0.2, x1, 0.3, z1 - 0.2, M.sofaDark, o);
    // Kussens
    this.block(x0 + 0.22, 0.3, z0 + 0.22, x1 - 0.02, 0.45, -0.02, M.sofa, o);
    this.block(x0 + 0.22, 0.3, 0.02, x1 - 0.02, 0.45, z1 - 0.22, M.sofa, o);
    // Rugleuning
    this.block(x0, 0.06, z0, x0 + 0.22, 0.88, z1, M.sofa, o);
    // Armleuningen
    this.block(x0, 0.06, z0, x1, 0.62, z0 + 0.2, M.sofa, o);
    this.block(x0, 0.06, z1 - 0.2, x1, 0.62, z1, M.sofa, o);
    // Pootjes
    [[x0 + 0.05, z0 + 0.05], [x1 - 0.1, z0 + 0.05], [x0 + 0.05, z1 - 0.1], [x1 - 0.1, z1 - 0.1]].forEach(([x, z]) =>
      this.block(x, 0, z, x + 0.05, 0.06, z + 0.05, M.woodDark, { collide: false }),
    );
    // Sierkussens
    const pillow = (z, mat, rot) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), mat);
      m.scale.set(0.45, 1, 1);
      m.position.set(x0 + 0.32, 0.6, z);
      m.rotation.x = rot;
      m.castShadow = true;
      this.group.add(m);
    };
    pillow(-0.75, M.mustard, 0.2);
    pillow(0.75, M.coral, -0.2);
  }

  buildCoffeeTable() {
    const x0 = -2.6;
    const x1 = -1.75;
    const z0 = -0.55;
    const z1 = 0.55;
    this.block(x0, 0.36, z0, x1, 0.42, z1, M.woodLight, { oneWay: true, name: 'salontafel' });
    [[x0 + 0.03, z0 + 0.03], [x1 - 0.08, z0 + 0.03], [x0 + 0.03, z1 - 0.08], [x1 - 0.08, z1 - 0.08]].forEach(([x, z]) =>
      this.block(x, 0, z, x + 0.05, 0.36, z + 0.05, M.wood, { climbable: true }),
    );
    // Theepot en boekje als decoratie
    const pot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), M.coral);
    pot.position.set(-2.35, 0.48, 0.3);
    pot.scale.set(1, 0.85, 1);
    pot.castShadow = true;
    this.group.add(pot);
    this.block(-2.05, 0.42, -0.4, -1.85, 0.45, -0.15, M.book[1], { collide: false });
  }

  buildDiningTable() {
    const cx = 1.6;
    const cz = 1.3;
    const x0 = cx - 0.7;
    const x1 = cx + 0.7;
    const z0 = cz - 0.45;
    const z1 = cz + 0.45;
    const top = 0.77;
    this.block(x0, top - 0.05, z0, x1, top, z1, M.wood, { oneWay: true, name: 'tafel' });
    [[x0 + 0.05, z0 + 0.05], [x1 - 0.12, z0 + 0.05], [x0 + 0.05, z1 - 0.12], [x1 - 0.12, z1 - 0.12]].forEach(([x, z]) =>
      this.block(x, 0, z, x + 0.07, top, z + 0.07, M.woodDark, { climbable: true, name: 'tafelpoot' }),
    );

    // Stoelen: zitting als blok, leuning erachter
    const chair = (z, dir) => {
      const sx0 = cx - 0.22;
      const sx1 = cx + 0.22;
      const sz0 = z - 0.22;
      const sz1 = z + 0.22;
      this.block(sx0, 0.4, sz0, sx1, 0.46, sz1, M.woodLight, { climbable: true, name: 'stoel' });
      this.addCollider(sx0 + 0.02, 0, sz0 + 0.02, sx1 - 0.02, 0.4, sz1 - 0.02, { climbable: true });
      [[sx0, sz0], [sx1 - 0.05, sz0], [sx0, sz1 - 0.05], [sx1 - 0.05, sz1 - 0.05]].forEach(([x, zz]) =>
        this.block(x, 0, zz, x + 0.05, 0.4, zz + 0.05, M.wood, { collide: false }),
      );
      const bz = dir > 0 ? sz1 - 0.05 : sz0;
      this.block(sx0, 0.46, bz, sx1, 0.95, bz + 0.05, M.woodLight, { climbable: true });
    };
    chair(z0 - 0.3, -1);
    chair(z1 + 0.3, 1);

    // Fruitschaal
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.07, 8), M.white);
    bowl.position.set(cx - 0.3, top + 0.035, cz - 0.1);
    bowl.castShadow = true;
    this.group.add(bowl);
    [[0, 0x6aa36b], [0.07, 0xe8b04b], [-0.06, 0xd7263d]].forEach(([dx, c], i) => {
      const fruit = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), lambert(c));
      fruit.position.set(cx - 0.3 + dx, top + 0.1, cz - 0.1 + (i - 1) * 0.04);
      this.group.add(fruit);
    });
  }

  buildCage() {
    const cx = 3.1;
    const cz = -2.65;
    const w = 0.9;
    const d = 0.7;
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    const z0 = cz - d / 2;
    const z1 = cz + d / 2;
    const baseTop = 0.5;
    const cageTop = 1.6;

    // Onderkast
    this.block(x0, 0, z0, x1, baseTop, z1, M.cageBase, { climbable: true, name: 'kooi' });
    this.block(x0 - 0.02, baseTop, z0 - 0.02, x1 + 0.02, baseTop + 0.05, z1 + 0.02, M.metal, { collide: false });

    // Tralies: samengevoegd tot één mesh voor snelheid
    const bars = [];
    const barGeo = new THREE.CylinderGeometry(0.008, 0.008, cageTop - baseTop, 4);
    const addBar = (x, z) => {
      const g = barGeo.clone();
      g.translate(x, (baseTop + cageTop) / 2, z);
      bars.push(g);
    };
    const step = 0.07;
    for (let x = x0; x <= x1 + 0.001; x += step) {
      addBar(x, z0);
      addBar(x, z1);
    }
    for (let z = z0 + step; z < z1 - 0.001; z += step) {
      addBar(x0, z);
      addBar(x1, z);
    }
    [0.8, 1.2].forEach((y) => {
      const ring = new THREE.BoxGeometry(w, 0.015, 0.015);
      [z0, z1].forEach((z) => bars.push(ring.clone().translate(cx, y, z)));
      const ring2 = new THREE.BoxGeometry(0.015, 0.015, d);
      [x0, x1].forEach((x) => bars.push(ring2.clone().translate(x, y, cz)));
    });
    const barMesh = new THREE.Mesh(mergeGeometries(bars), M.metal);
    barMesh.castShadow = true;
    this.group.add(barMesh);
    this.addCollider(x0, baseTop, z0, x1, cageTop, z1, { climbable: true, name: 'kooi' });

    // Dak met speelplek en stokje
    this.block(x0 - 0.03, cageTop, z0 - 0.03, x1 + 0.03, cageTop + 0.04, z1 + 0.03, M.cageBase, { climbable: true, name: 'kooidak' });
    this.block(cx - 0.35, cageTop + 0.04, cz - 0.02, cx - 0.32, cageTop + 0.25, cz + 0.02, M.woodDark, { collide: false });
    this.block(cx + 0.32, cageTop + 0.04, cz - 0.02, cx + 0.35, cageTop + 0.25, cz + 0.02, M.woodDark, { collide: false });
    this.block(cx - 0.35, cageTop + 0.25, cz - 0.02, cx + 0.35, cageTop + 0.28, cz + 0.02, M.wood, { oneWay: true, name: 'stokje' });

    // Binnenin: zitstok, voerbakje en een speeltje
    this.block(x0 + 0.05, 1.0, cz - 0.015, x1 - 0.05, 1.03, cz + 0.015, M.wood, { collide: false });
    const toy = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), M.mustard);
    toy.position.set(cx + 0.2, 1.3, cz);
    this.group.add(toy);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.05, 8), M.coral);
    bowl.position.set(cx - 0.25, baseTop + 0.08, cz + 0.2);
    this.group.add(bowl);
  }

  buildPlant() {
    const cx = -3.35;
    const cz = 2.85;
    // Pot
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.45, 8), M.pot);
    pot.position.set(cx, 0.225, cz);
    pot.castShadow = true;
    pot.receiveShadow = true;
    this.group.add(pot);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 8), M.soil);
    soil.position.set(cx, 0.44, cz);
    this.group.add(soil);
    this.addCollider(cx - 0.26, 0, cz - 0.26, cx + 0.26, 0.45, cz + 0.26, { climbable: true, name: 'plantenpot' });

    // Stam: beklimbaar
    const trunkTop = 1.55;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, trunkTop - 0.45, 6), M.trunk);
    trunk.position.set(cx, (0.45 + trunkTop) / 2, cz);
    trunk.castShadow = true;
    this.group.add(trunk);
    this.addCollider(cx - 0.06, 0.45, cz - 0.06, cx + 0.06, trunkTop, cz + 0.06, { climbable: true, name: 'stam' });

    // Takken: van bovenaf begaanbaar
    const branch = (y, dx, dz, len) => {
      const ex = cx + dx * len;
      const ez = cz + dz * len;
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, len, 5), M.trunk);
      mesh.position.set((cx + ex) / 2, y, (cz + ez) / 2);
      mesh.rotation.z = dx ? Math.PI / 2 : 0;
      mesh.rotation.x = dz ? Math.PI / 2 : 0;
      mesh.castShadow = true;
      this.group.add(mesh);
      const hw = 0.09;
      this.addCollider(
        Math.min(cx, ex) - hw,
        y - 0.03,
        Math.min(cz, ez) - hw,
        Math.max(cx, ex) + hw,
        y + 0.03,
        Math.max(cz, ez) + hw,
        { oneWay: true, name: 'tak' },
      );
      // Bladeren aan het uiteinde
      this.leafCluster(ex, y + 0.3, ez, 0.2);
    };
    branch(0.9, 1, 0, 0.6);
    branch(1.25, 0, -1, 0.55);

    // Kruin
    this.leafCluster(cx, trunkTop + 0.15, cz, 0.35);
    this.leafCluster(cx + 0.2, trunkTop + 0.05, cz - 0.15, 0.25);
    this.leafCluster(cx - 0.1, trunkTop + 0.3, cz + 0.1, 0.25);
    this.addCollider(cx - 0.18, trunkTop - 0.03, cz - 0.18, cx + 0.18, trunkTop, cz + 0.18, { oneWay: true, name: 'kruin' });
  }


  buildBookcase() {
    const x0 = -1.6;
    const x1 = -0.4;
    const z1 = ROOM.maxZ;
    const z0 = z1 - 0.32;
    const top = 1.8;
    // Kast als één beklimbaar blok voor de botsing
    this.addCollider(x0, 0, z0, x1, top, z1, { climbable: true, name: 'boekenkast' });
    this.block(x0, 0, z0, x0 + 0.04, top, z1, M.wood, { collide: false });
    this.block(x1 - 0.04, 0, z0, x1, top, z1, M.wood, { collide: false });
    this.block(x0, top - 0.04, z0, x1, top, z1, M.wood, { collide: false });
    this.block(x0, 0, z1 - 0.02, x1, top, z1, M.woodDark, { collide: false, shadow: false });
    const shelves = [0.05, 0.45, 0.85, 1.25];
    shelves.forEach((y, s) => {
      this.block(x0, y - 0.03, z0, x1, y, z1, M.wood, { collide: false });
      // Boeken
      let x = x0 + 0.06;
      let i = s * 2;
      while (x < x1 - 0.12) {
        const w = 0.04 + ((i * 13) % 5) * 0.012;
        const h = 0.22 + ((i * 7) % 4) * 0.03;
        this.block(x, y, z0 + 0.04, x + w, y + h, z1 - 0.04, M.book[i % M.book.length], {
          collide: false,
          shadow: false,
        });
        x += w + 0.008;
        i++;
        if (i % 7 === 0) x += 0.1;
      }
    });
  }

  buildLamp() {
    const x = -3.5;
    const z = -2.9;
    this.block(x - 0.15, 0, z - 0.15, x + 0.15, 0.04, z + 0.15, M.woodDark, { collide: false });
    this.block(x - 0.02, 0.04, z - 0.02, x + 0.02, 1.5, z + 0.02, M.woodDark, { collide: false });
    this.addCollider(x - 0.04, 0, z - 0.04, x + 0.04, 1.5, z + 0.04);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.28, 0.3, 8, 1, true), M.lampShade);
    shade.material.side = THREE.DoubleSide;
    shade.position.set(x, 1.55, z);
    this.group.add(shade);
    this.lampPosition = new THREE.Vector3(x, 1.45, z);
  }

  buildDoor() {
    const { x, z0, z1, height } = DOOR;
    // Kozijn
    this.block(x - 0.06, 0, z0 - 0.06, x + 0.02, height + 0.06, z0, M.white, { collide: false });
    this.block(x - 0.06, 0, z1, x + 0.02, height + 0.06, z1 + 0.06, M.white, { collide: false });
    this.block(x - 0.06, height, z0 - 0.06, x + 0.02, height + 0.06, z1 + 0.06, M.white, { collide: false });

    // Deur staat open naar buiten
    const hinge = new THREE.Group();
    hinge.position.set(x - 0.02, 0, z0);
    hinge.rotation.y = 1.75;
    this.group.add(hinge);
    const w = z1 - z0;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.05, height, w), lambert(0x9fc7c1));
    panel.position.set(0, height / 2, w / 2);
    panel.castShadow = true;
    hinge.add(panel);
    [0.55, 1.45].forEach((y) => {
      const inset = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, w - 0.25), lambert(0xb5d6d0));
      inset.position.set(0, y, w / 2);
      hinge.add(inset);
    });
    const knob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), M.gold);
    knob.position.set(-0.05, 1.0, w - 0.1);
    hinge.add(knob);

    // Zonnig licht van buiten
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(w, height),
      new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.85 }),
    );
    glow.rotation.y = -Math.PI / 2;
    glow.position.set(x + 0.9, height / 2, (z0 + z1) / 2);
    this.group.add(glow);

    // Deurmat
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8), lambert(0x8a6a4a));
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(x - 0.35, 0.004, (z0 + z1) / 2);
    this.group.add(mat);
  }

  buildBoxes() {
    // [x, z, draaiing, grootte]
    const defs = [
      [-0.9, -2.6, 0.3, 0.6],
      [3.2, 2.7, Math.PI + 0.2, 0.62],
      [-2.2, 2.2, -Math.PI / 2 + 0.25, 0.55],
    ];
    defs.forEach(([x, z, rot, size]) => this.buildBox(x, z, rot, size));
  }

  /** Kartonnen doos met een opening aan de voorkant (lokale +Z). */
  buildBox(x, z, rot, size) {
    const h = size * 0.8;
    const t = 0.025;
    const s = size / 2;
    const hole = 0.34;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    this.group.add(g);

    const panel = (w, hh, d, px, py, pz, mat = M.cardboard) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat);
      m.position.set(px, py, pz);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };
    panel(size, 0.02, size, 0, 0.01, 0, M.cardboardDark);
    panel(size, h, t, 0, h / 2, -s + t / 2); // achter
    panel(t, h, size, -s + t / 2, h / 2, 0); // links
    panel(t, h, size, s - t / 2, h / 2, 0); // rechts
    const side = (size - hole) / 2;
    panel(side, h, t, -s + side / 2, h / 2, s - t / 2); // voor links
    panel(side, h, t, s - side / 2, h / 2, s - t / 2); // voor rechts
    panel(hole, 0.06, t, 0, h - 0.03, s - t / 2); // boven opening
    // Openstaande flappen
    const flap = (px, pz, ry, rz) => {
      const f = panel(size * 0.95, 0.015, size * 0.45, px, h, pz);
      f.rotation.set(rz, ry, 0);
    };
    flap(0, -s - size * 0.18, 0, -0.7);
    const flapL = panel(size * 0.45, 0.015, size * 0.9, -s - size * 0.17, h + 0.08, 0);
    flapL.rotation.z = 0.8;
    // Plakband
    panel(0.06, 0.005, size * 0.9, 0, 0.022, 0, M.tape);

    // Botsvormen: de wanden, in wereldcoördinaten (doos-rotatie benaderd per paneel)
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const toWorld = (lx, lz) => [x + lx * cos + lz * sin, z - lx * sin + lz * cos];
    const wallBox = (lx0, lz0, lx1, lz1) => {
      const corners = [toWorld(lx0, lz0), toWorld(lx1, lz0), toWorld(lx0, lz1), toWorld(lx1, lz1)];
      const xs = corners.map((c) => c[0]);
      const zs = corners.map((c) => c[1]);
      this.addCollider(Math.min(...xs), 0, Math.min(...zs), Math.max(...xs), h, Math.max(...zs), {
        name: 'doos',
        thinWall: true,
      });
    };
    // Voor AABB's rond gedraaide wanden gebruiken we een smalle strook per wand.
    const segs = 3;
    const addWallSegments = (ax, az, bx, bz) => {
      for (let i = 0; i < segs; i++) {
        const t0 = i / segs;
        const t1 = (i + 1) / segs;
        const p0 = [ax + (bx - ax) * t0, az + (bz - az) * t0];
        const p1 = [ax + (bx - ax) * t1, az + (bz - az) * t1];
        wallBox(Math.min(p0[0], p1[0]) - t / 2, Math.min(p0[1], p1[1]) - t / 2, Math.max(p0[0], p1[0]) + t / 2, Math.max(p0[1], p1[1]) + t / 2);
      }
    };
    addWallSegments(-s, -s, s, -s);
    addWallSegments(-s, -s, -s, s);
    addWallSegments(s, -s, s, s);
    addWallSegments(-s, s, -hole / 2, s);
    addWallSegments(hole / 2, s, s, s);

    this.boxes.push({
      group: g,
      center: new THREE.Vector3(x, 0, z),
      rot,
      inner: s - t - 0.02,
      height: h,
      visited: false,
    });
  }

  buildNuts() {
    // Tien verstopplekjes voor pistachenootjes
    const spots = [
      [3.1, 1.64, -2.5, 'op het dak van de kooi'],
      [-3.55, 0.45, 0.35, 'tussen de bankkussens'],
      [-3.84, 0.88, -0.65, 'op de rugleuning van de bank'],
      [-2.15, 0.0, 0.1, 'onder de salontafel'],
      [1.95, 0.77, 1.45, 'op de eettafel'],
      [1.05, 0.9, -3.36, 'op de vensterbank'],
      [-2.95, 0.93, 2.85, 'op een tak van de plant'],
      [-0.7, 1.8, 3.34, 'boven op de boekenkast'],
      [3.2, 0.02, 2.7, 'in een kartonnen doos'],
      [3.8, 0.0, -3.3, 'achter de kooi'],
    ];
    spots.forEach(([x, y, z, where]) => {
      const p = makePistachio();
      p.scale.setScalar(1.3);
      this.addCollectible('pistache', p, x, y, z, { where });
    });
  }

  buildLights() {
    this.addLights({ sunPos: new THREE.Vector3(2.5, 6, -7), center: new THREE.Vector3(0, 0, 0.5), size: 5.5 });
    // Gezellige staande lamp
    const lamp = new THREE.PointLight(0xffb866, 2.2, 6, 1.4);
    lamp.position.copy(this.lampPosition);
    this.group.add(lamp);
  }

  // ---------- Gameplay ----------

  get pistachios() {
    return this.collectibles.filter((c) => c.type === 'pistache');
  }

  /** Is punt p (wereld) binnen in een doos? Geeft de doos terug. */
  boxAt(p) {
    for (const b of this.boxes) {
      const dx = p.x - b.center.x;
      const dz = p.z - b.center.z;
      const cos = Math.cos(-b.rot);
      const sin = Math.sin(-b.rot);
      const lx = dx * cos + dz * sin;
      const lz = -dx * sin + dz * cos;
      if (Math.abs(lx) < b.inner && Math.abs(lz) < b.inner && p.y < b.height * 0.5) return b;
    }
    return null;
  }

  update(dt, time) {
    this.animateCollectibles(dt, time);
    return false;
  }
}
