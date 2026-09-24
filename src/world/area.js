import * as THREE from 'three';
import { noDetail } from './detail.js';
import { vuurdraakCardTexture } from '../textures.js';
import { makePerson } from './people.js';
import { lambert, M } from './materials.js';

// Basis voor een speelgebied (Puck's huis, buiten, het Pistachehuis).
// Botsvormen zijn assen-uitgelijnde blokken (AABB):
//   climbable: Puck klimt omhoog als hij er tegenaan loopt
//   oneWay:    alleen van bovenaf begaanbaar (takken, planken, tafelblad)

export class Area {
  constructor(name, { quality = 'high' } = {}) {
    this.name = name;
    this.quality = quality;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.colliders = [];
    this.spawns = {}; // naam -> { pos, yaw }
    this.portals = []; // { x0, z0, x1, z1, to, spawn }
    this.zones = []; // interactie/trigger: { x, y, z, r, h?, prompt?, onInteract?, onEnter? }
    this.collectibles = []; // { type, group, base, found, where, respawn?, timer }
    this.cameraBounds = null;
    this.cameraDistance = 1.7;
    this.walkSpeed = 1.6;
    this.background = new THREE.Color(0xf3c98b);
    this.fog = null;
    this.fx = []; // objecten met update(dt, t)
  }

  addSpawn(name, x, y, z, yaw) {
    this.spawns[name] = { pos: new THREE.Vector3(x, y, z), yaw };
  }

  /** Blok van (x0,y0,z0) tot (x1,y1,z1) met optioneel botsvorm. */
  block(x0, y0, z0, x1, y1, z1, material, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    mesh.castShadow = opts.shadow !== false;
    mesh.receiveShadow = true;
    (opts.parent || this.group).add(mesh);
    if (opts.collide !== false) this.addCollider(x0, y0, z0, x1, y1, z1, opts);
    return mesh;
  }

  addCollider(x0, y0, z0, x1, y1, z1, opts = {}) {
    const c = {
      min: new THREE.Vector3(x0, y0, z0),
      max: new THREE.Vector3(x1, y1, z1),
      climbable: !!opts.climbable,
      oneWay: !!opts.oneWay,
      enabled: true,
      name: opts.name || '',
      camIgnore: !!opts.camIgnore,
    };
    this.colliders.push(c);
    return c;
  }

  leafCluster(x, y, z, r, parent = this.group) {
    const geo = new THREE.IcosahedronGeometry(r, 0);
    [[0, 0, 0, M.leaf], [r * 0.5, -r * 0.2, r * 0.3, M.leafDark], [-r * 0.4, -r * 0.1, -r * 0.3, M.leafDark]].forEach(
      ([dx, dy, dz, mat]) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x + dx, y + dy, z + dz);
        m.scale.set(1, 0.7, 1);
        m.castShadow = true;
        parent.add(m);
      },
    );
  }

  /** Warme standaardverlichting; de schaduwcamera dekt `size` meter rond `center`. */
  addLights({ sunPos, center = new THREE.Vector3(), size = 6, hemi = 1.6, sun = 2.2, sunColor = 0xffd9a0 }) {
    const h = new THREE.HemisphereLight(0xfff1dc, 0x9a6f4a, hemi);
    this.group.add(h);
    this.hemi = h;
    const s = new THREE.DirectionalLight(sunColor, sun);
    s.position.copy(center).add(sunPos);
    s.target.position.copy(center);
    if (this.quality !== 'low') {
      s.castShadow = true;
      const map = this.quality === 'high' ? (size > 10 ? 2048 : 1024) : size > 10 ? 1024 : 512;
      s.shadow.mapSize.set(map, map);
      const cam = s.shadow.camera;
      cam.left = -size;
      cam.right = size;
      cam.top = size;
      cam.bottom = -size;
      cam.near = 0.5;
      cam.far = sunPos.length() + size * 2;
      s.shadow.bias = -0.0015;
      s.shadow.normalBias = 0.02;
    }
    this.group.add(s, s.target);
    this.sun = s;
    return s;
  }

  /** Iets om op te pakken: pistache, veer, patat, gouden pistache... */
  addCollectible(type, object, x, y, z, extra = {}) {
    const g = new THREE.Group();
    g.position.set(x, y + 0.07, z);
    g.userData.dynamic = true;
    g.add(glowSprite(extra.glow ?? 0xffe28a, (extra.glowSize ?? 0.3) * 1.4), object);
    this.group.add(g);
    const item = { type, group: g, base: g.position.clone(), found: false, timer: 0, phase: Math.random() * 6.28, ...extra };
    this.collectibles.push(item);
    return item;
  }

  animateCollectibles(dt, time) {
    for (const f of this.fx) f.update(dt, time);
    for (const c of this.collectibles) {
      if (c.found) {
        if (c.respawn && !c.flying) {
          c.timer -= dt;
          if (c.timer <= 0) {
            c.found = false;
            c.group.visible = true;
            c.group.scale.setScalar(1);
            c.group.position.copy(c.base);
          }
        }
        continue;
      }
      c.group.rotation.y += dt * 2.2;
      c.group.position.y = c.base.y + Math.sin(time * 2.5 + c.phase) * 0.03;
      const glow = c.group.children[0];
      glow.material.opacity = 0.55 + Math.sin(time * 4 + c.phase) * 0.25;
      glow.scale.setScalar(glow.userData.size * (1 + Math.sin(time * 4 + c.phase) * 0.15));
    }
  }

  /** Een Groninger die je kunt aanspreken. `id` verwijst naar de dialogen in dialog.js. */
  addNPC(id, name, x, z, yaw, look = {}, { y = 0, r = 1.1, solid = true } = {}) {
    this.npcs = this.npcs || [];
    const person = makePerson(look);
    person.root.position.set(x, y, z);
    person.root.rotation.y = yaw;
    this.group.add(person.root);
    this.fx.push(person);
    if (solid) this.addCollider(x - 0.3, y, z - 0.3, x + 0.3, y + (look.sitting ? 1.2 : look.height || 1.75), z + 0.3, { name: id });
    const npc = { id, name, person, x, y, z };
    this.npcs.push(npc);
    this.zones.push({ x, y, z, r, h: 1.2, id: 'npc', npc, prompt: `Praat met ${name} 💬` });
    return npc;
  }

  /** Is punt p binnen een van de portalen? */
  portalAt(p) {
    for (const portal of this.portals) {
      if (p.x > portal.x0 && p.x < portal.x1 && p.z > portal.z0 && p.z < portal.z1 && p.y < 1) return portal;
    }
    return null;
  }

  /** Vallen in water e.d.: geeft een terugzetpunt of null. */
  hazardAt() {
    return null;
  }

  enter() {
    this.group.visible = true;
  }

  exit() {
    this.group.visible = false;
  }

  /** @returns {boolean} true als de schaduwkaart ververst moet worden */
  update() {
    return false;
  }
}

// ---------- Gedeelde objecten ----------

/** Pistachenootje: beige schelp met een groen pitje dat eruit piept. */
export function makePistachio() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(PISTACHIO.shell, M.pistachioShell);
  shell.castShadow = true;
  const kernel = new THREE.Mesh(PISTACHIO.kernel, M.pistachioKernel);
  kernel.position.set(0, 0.022, 0.012);
  kernel.rotation.x = -0.3;
  g.add(shell, kernel);
  return g;
}

const PISTACHIO = (() => {
  const shell = new THREE.IcosahedronGeometry(0.05, 1);
  shell.scale(0.85, 0.75, 1.25);
  const kernel = new THREE.IcosahedronGeometry(0.038, 0);
  kernel.scale(0.7, 0.6, 1.1);
  return { shell, kernel };
})();

/** Patatbakje (rood puntzakje met frietjes). */
export function makeFries() {
  const g = new THREE.Group();
  const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.14, 6), M.friesBag);
  bag.position.y = 0.07;
  bag.castShadow = true;
  g.add(bag);
  const fry = new THREE.BoxGeometry(0.018, 0.12, 0.018);
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(fry, M.fries);
    const a = (i / 9) * Math.PI * 2;
    const r = i % 3 === 0 ? 0 : 0.04;
    f.position.set(Math.cos(a) * r, 0.17 + (i % 2) * 0.02, Math.sin(a) * r);
    f.rotation.set(Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25);
    g.add(f);
  }
  return g;
}

/** Koekje met chocoladestukjes. */
export function makeCookie() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 9), M.cardboard);
  c.castShadow = true;
  g.add(c);
  for (let i = 0; i < 5; i++) {
    const chip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.012, 0), M.soil);
    chip.position.set(Math.cos(i * 1.3) * 0.04, 0.014, Math.sin(i * 1.3) * 0.04);
    g.add(chip);
  }
  g.rotation.x = 0.5;
  return g;
}

/** Sigaretje (grapje, niet aangestoken). */
export function makeCigarette() {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), M.white);
  const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.05, 6), lambert(0xe0a24a));
  filter.position.y = -0.1;
  g.add(paper, filter);
  g.rotation.z = Math.PI / 2;
  return g;
}

/** Glimmend holo-ruilkaartje (Vuurdraak, 150 HP). */
export function makeCard() {
  const g = new THREE.Group();
  const tex = vuurdraakCardTexture();
  const front = new THREE.MeshBasicMaterial({ map: tex });
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.21, 0.004), [M.gold, M.gold, M.gold, M.gold, front, front]);
  card.position.y = 0.12;
  g.add(card);
  return g;
}

let haafsTexture = null;
/** Bord met het logo van Bakkerij Haafs (wit op zwart). Voorkant richting +z. */
export function makeHaafsBoard(width = 2.4) {
  if (!haafsTexture) {
    haafsTexture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/images/haafs-logo.png`);
    haafsTexture.colorSpace = THREE.SRGBColorSpace;
    haafsTexture.anisotropy = 4;
  }
  const height = width * 0.6;
  const g = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.06), lambert(0x0d0d0e));
  panel.castShadow = true;
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.88, width * 0.88 * (173 / 300)),
    new THREE.MeshBasicMaterial({ map: haafsTexture, transparent: true, toneMapped: false }),
  );
  logo.position.z = 0.032;
  g.add(panel, logo);
  return g;
}

/** Rode veer. */
export function makeFeather() {
  const g = new THREE.Group();
  const vane = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), M.red);
  vane.scale.set(0.45, 1.6, 0.12);
  vane.position.y = 0.06;
  vane.castShadow = true;
  const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4), M.white);
  quill.position.y = 0.04;
  g.add(vane, quill);
  g.rotation.z = 0.4;
  return g;
}

let glowTexture = null;
export function glowSprite(color = 0xffe28a, size = 0.3, opacity = 0.55) {
  if (!glowTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    glowTexture = new THREE.CanvasTexture(c);
    glowTexture.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  s.scale.setScalar(size);
  s.userData.size = size;
  return s;
}

/** Bord met tekst (canvas-textuur). */
export function makeSign(lines, { width = 1.2, height = 0.5, bg = '#fff6e6', fg = '#6b4423', border = '#6b4423' } = {}) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round((512 * height) / width);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = border;
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const list = Array.isArray(lines) ? lines : [lines];
  const fs = Math.min(c.height / (list.length + 0.6), 90);
  ctx.font = `bold ${fs}px "Trebuchet MS", sans-serif`;
  list.forEach((l, i) => ctx.fillText(l, c.width / 2, (c.height * (i + 1)) / (list.length + 1)));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), noDetail(new THREE.MeshLambertMaterial({ map: tex })));
  return mesh;
}
