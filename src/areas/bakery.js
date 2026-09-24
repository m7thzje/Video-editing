import * as THREE from 'three';
import { woodFloorTexture } from '../textures.js';
import { Area, makeHaafsBoard } from '../world/area.js';
import { addShaft, DustMotes } from '../world/fx.js';
import { lambert, M } from '../world/materials.js';

// Bakkerij Haafs: het bakstenen huis beneden in Groningen. Oma Moi wil Groninger koek
// bakken, maar ze mist 5 ingrediënten die ergens in de stad liggen.
//
// Kamer: x -3..3, z -2.5..2.5, hoogte 2.6. Deur op de oostwand (x = 3).

const R = { minX: -3, maxX: 3, minZ: -2.5, maxZ: 2.5, h: 2.6 };

export const INGREDIENTS = [
  { id: 'roggemeel', name: 'Roggemeel', icon: '🌾' },
  { id: 'honing', name: 'Honing', icon: '🍯' },
  { id: 'stroop', name: 'Stroop', icon: '🫙' },
  { id: 'kaneel', name: 'Kaneel', icon: '🪵' },
  { id: 'anijs', name: 'Steranijs', icon: '⭐' },
];

const P = {
  tiles: lambert(0xe9e2d4),
  wall: lambert(0xf3e3c3),
  blue: lambert(0x3d7ea6),
  counter: lambert(0xb9855a),
  oven: lambert(0x7d5a4a),
  fire: new THREE.MeshBasicMaterial({ color: 0xff9a3c }),
  koek: lambert(0x8a4b22),
  apron: lambert(0xf4f1ea),
  dress: lambert(0x3d7ea6),
  skin: lambert(0xf0c7a8),
  hair: lambert(0xd8d8d8),
  cheek: lambert(0xef9a9a),
  dark: lambert(0x2b2220),
};

export class Bakery extends Area {
  constructor(opts) {
    super('bakkerij', opts);
    this.background = new THREE.Color(0xbfe6ff);
    this.cameraBounds = { minX: R.minX + 0.15, maxX: R.maxX - 0.15, minZ: R.minZ + 0.15, maxZ: R.maxZ - 0.15, minY: 0.12, maxY: R.h - 0.15 };
    this.addSpawn('deur', 2.5, 0, 0.4, -Math.PI / 2);
    this.portals.push({ x0: R.maxX - 0.2, z0: 0, x1: R.maxX + 1, z1: 0.9, to: 'buiten', spawn: 'bakkerij' });

    this.buildRoom();
    this.buildOma();
    this.addLights({ sunPos: new THREE.Vector3(5, 6, 3), center: new THREE.Vector3(0, 0, 0), size: 4.5, hemi: 1.7 });
    const warm = new THREE.PointLight(0xffa860, 2.4, 5, 1.4);
    warm.position.set(-2.2, 1.0, -1.8);
    this.group.add(warm);
    this.ovenLight = warm;
  }

  buildRoom() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshLambertMaterial({ map: woodFloorTexture(['#b98150', '#c38b58', '#ad764a', '#c9925f'], [3, 3]) }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), lambert(0xfbf5ea));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = R.h;
    this.group.add(ceil);
    const t = 0.25;
    const wall = (x0, z0, x1, z1) => this.block(x0, 0, z0, x1, R.h, z1, P.wall, { shadow: false, name: 'muur' });
    wall(R.minX - t, R.minZ - t, R.maxX + t, R.minZ);
    wall(R.minX - t, R.maxZ, R.maxX + t, R.maxZ + t);
    wall(R.minX - t, R.minZ, R.minX, R.maxZ);
    wall(R.maxX, R.minZ, R.maxX + t, 0);
    wall(R.maxX, 0.9, R.maxX + t, R.maxZ);
    this.block(R.maxX, 2.1, 0, R.maxX + t, R.h, 0.9, P.wall, { shadow: false });
    // Blauwe tegeltjes (Delfts-achtig) langs de achterwand
    for (let x = R.minX + 0.1; x < R.maxX; x += 0.3) {
      for (let y = 0.9; y < 1.8; y += 0.3) {
        this.block(x, y, R.minZ, x + 0.27, y + 0.27, R.minZ + 0.01, (Math.round(x * 10 + y * 10) % 3 === 0 ? P.blue : lambert(0xf4f1ea)), { collide: false, shadow: false });
      }
    }
    // Deur naar buiten (open, zonlicht)
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.1), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
    glow.rotation.y = -Math.PI / 2;
    glow.position.set(R.maxX + 0.2, 1.05, 0.45);
    this.group.add(glow);
    addShaft(this.group, new THREE.Vector3(R.maxX, 1.9, 0.45), new THREE.Vector3(1.2, 0, 0.1), 0.9, 0.14);

    // Toonbank met koeken
    this.block(-1.2, 0, -0.4, 1.4, 0.9, 0.2, P.counter, { climbable: true, name: 'toonbank' });
    this.block(-1.25, 0.9, -0.45, 1.45, 0.95, 0.25, M.woodLight, { climbable: true, name: 'toonbank' });
    for (let i = 0; i < 4; i++) {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.16), P.koek);
      k.position.set(-0.9 + i * 0.5, 1.01, -0.1);
      k.castShadow = true;
      this.group.add(k);
    }
    // Oven met vuurtje
    this.block(-2.9, 0, -2.4, -1.6, 1.4, -1.6, P.oven, { climbable: true, name: 'oven' });
    const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.35), P.fire);
    fire.position.set(-2.25, 0.5, -1.59);
    fire.userData.noMerge = true;
    this.group.add(fire);
    this.fire = fire;
    // Planken met broden en koekjestrommels
    [1.2, 1.7].forEach((y) => {
      this.block(0.2, y, R.minZ, 2.8, y + 0.05, R.minZ + 0.35, M.wood, { oneWay: true, name: 'plank' });
      for (let x = 0.4; x < 2.7; x += 0.45) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), x % 0.9 < 0.45 ? P.koek : lambert(0xd9a86c));
        b.scale.set(1.3, 0.7, 1);
        b.position.set(x, y + 0.12, R.minZ + 0.18);
        this.group.add(b);
      }
    });
    // Zak meel en een krukje om bij de planken te komen
    this.block(2.3, 0, -1.2, 2.8, 0.55, -0.7, lambert(0xe7dcc7), { climbable: true, name: 'meelzak' });
    this.block(1.9, 0, -2.2, 2.3, 0.75, -1.8, M.woodLight, { climbable: true, name: 'krukje' });
    // Uithangbord binnen
    const s = makeHaafsBoard(1.3);
    s.position.set(-0.9, 2.05, R.minZ + 0.05);
    this.group.add(s);
    this.fx.push(new DustMotes(this.group, new THREE.Box3(new THREE.Vector3(0.5, 0.3, -1), new THREE.Vector3(2.9, 2.2, 1.5)), 40));
  }

  buildOma() {
    // Oma Moi: vriendelijk, grijs knotje, blauwe jurk met schort
    const g = new THREE.Group();
    g.position.set(0, 0, -1.2);
    g.userData.dynamic = true;
    this.group.add(g);
    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    add(new THREE.CylinderGeometry(0.25, 0.36, 0.95, 8), P.dress, 0, 0.5, 0);
    add(new THREE.CylinderGeometry(0.26, 0.27, 0.5, 8), P.dress, 0, 1.2, 0);
    add(new THREE.BoxGeometry(0.34, 0.7, 0.04), P.apron, 0, 0.85, 0.27);
    [-1, 1].forEach((side) => {
      const arm = add(new THREE.BoxGeometry(0.11, 0.45, 0.12), P.dress, side * 0.32, 1.2, 0.05);
      arm.rotation.z = side * 0.2;
    });
    const head = new THREE.Group();
    head.position.y = 1.6;
    g.add(head);
    this.omaHead = head;
    const h = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), P.skin);
    head.add(h);
    const hair = new THREE.Mesh(new THREE.IcosahedronGeometry(0.155, 1), P.hair);
    hair.position.set(0, 0.04, -0.03);
    hair.scale.set(1, 0.85, 0.95);
    head.add(hair);
    const bun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), P.hair);
    bun.position.set(0, 0.16, -0.08);
    head.add(bun);
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(new THREE.IcosahedronGeometry(0.014, 0), P.dark);
      eye.position.set(side * 0.05, 0.01, 0.14);
      head.add(eye);
      const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.025, 8), P.cheek);
      cheek.position.set(side * 0.075, -0.035, 0.13);
      head.add(cheek);
    });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 4, 8, Math.PI), P.dark);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.05, 0.14);
    head.add(smile);
    this.oma = g;
    this.addCollider(-0.4, 0, -1.6, 0.4, 1.8, -0.8, { name: 'oma' });
    this.omaMarker = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture(), transparent: true, depthTest: false }));
    this.omaMarker.scale.setScalar(0.35);
    this.omaMarker.position.set(0, 2.05, -1.2);
    this.omaMarker.renderOrder = 5;
    this.group.add(this.omaMarker);
    this.zones.push({ x: 0, y: 0, z: 0.55, r: 0.9, h: 1.2, id: 'oma', prompt: 'Praat met oma Moi 👵' });
  }

  update(dt, time) {
    this.animateCollectibles(dt, time);
    this.ovenLight.intensity = 2.2 + Math.sin(time * 9) * 0.3 + Math.sin(time * 23) * 0.15;
    this.fire.scale.y = 1 + Math.sin(time * 12) * 0.1;
    this.omaHead.rotation.y = Math.sin(time * 0.8) * 0.3;
    this.oma.position.y = Math.abs(Math.sin(time * 1.5)) * 0.01;
    this.omaMarker.position.y = 2.05 + Math.sin(time * 3) * 0.05;
    return false;
  }
}

function bubbleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(32, 30, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 34px sans-serif';
  ctx.fillStyle = '#d7263d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
