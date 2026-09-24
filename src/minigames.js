import * as THREE from 'three';
import { lambert } from './world/materials.js';

/** Ringen-parcours: loop op tijd door een reeks ringen. */
export class RingRace {
  constructor(parent, points, { color = 0x3d9be0, finishColor = 0xd7263d, height = 0.7, radius = 0.6 } = {}) {
    this.active = false;
    this.time = 0;
    this.next = 0;
    const geo = new THREE.TorusGeometry(radius, 0.05, 6, 24);
    this.rings = points.map(([x, z, y = 0], i) => {
      const last = i === points.length - 1;
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: last ? finishColor : color, transparent: true, opacity: 0.8, toneMapped: false }));
      m.position.set(x, y + height, z);
      m.visible = false;
      m.userData.noMerge = true;
      parent.add(m);
      // Richting: kijk naar de volgende ring
      const nx = points[Math.min(i + 1, points.length - 1)];
      m.rotation.y = Math.atan2(nx[0] - x, nx[1] - z);
      return { mesh: m, x, z, y };
    });
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 6, 8, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    this.beam.visible = false;
    parent.add(this.beam);
  }

  start() {
    this.active = true;
    this.time = 0;
    this.next = 0;
    this.rings.forEach((r, i) => (r.mesh.visible = i < 2));
  }

  stop() {
    this.active = false;
    this.rings.forEach((r) => (r.mesh.visible = false));
    this.beam.visible = false;
  }

  get target() {
    return this.rings[this.next];
  }

  /** Geeft 'ring' | 'finish' | null. */
  update(dt, t, p) {
    this.rings.forEach((r) => {
      if (r.mesh.visible) r.mesh.rotation.z = t * 1.5;
    });
    if (!this.active) return null;
    this.time += dt;
    const r = this.rings[this.next];
    this.beam.visible = true;
    this.beam.position.set(r.x, r.y + 3, r.z);
    if (Math.hypot(p.x - r.x, p.z - r.z) < 0.7 && p.y < r.y + 1.4) {
      r.mesh.visible = false;
      this.next++;
      if (this.next >= this.rings.length) {
        this.stop();
        return 'finish';
      }
      if (this.rings[this.next + 1]) this.rings[this.next + 1].mesh.visible = true;
      this.rings[this.next].mesh.visible = true;
      return 'ring';
    }
    return null;
  }
}

/** Duiven op het plein die opvliegen als Puck eraan komt. */
export class Pigeons {
  constructor(parent, center, radius, count = 12, avoid = null) {
    this.center = center;
    this.radius = radius;
    this.active = false;
    this.time = 0;
    const bodyGeo = new THREE.IcosahedronGeometry(0.1, 0);
    bodyGeo.scale(0.8, 0.75, 1.3);
    const headGeo = new THREE.IcosahedronGeometry(0.05, 0);
    const grey = lambert(0x8c929c);
    const neck = lambert(0x5f7d77);
    const white = lambert(0xe9e9e9);
    this.birds = [];
    let seed = 5;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      let x;
      let z;
      do {
        const a = rnd() * Math.PI * 2;
        const d = 1.6 + rnd() * (radius - 1.6);
        x = center.x + Math.cos(a) * d;
        z = center.z + Math.sin(a) * d;
      } while (avoid && avoid(x, z));
      const g = new THREE.Group();
      const b = new THREE.Mesh(bodyGeo, i === 3 ? white : grey);
      b.position.y = 0.12;
      const h = new THREE.Mesh(headGeo, neck);
      h.position.set(0, 0.2, 0.1);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 4), lambert(0x3a3a3a));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.2, 0.16);
      g.add(b, h, beak);
      g.position.set(x, 0, z);
      g.rotation.y = rnd() * 6;
      g.traverse((o) => (o.castShadow = true));
      g.userData.dynamic = true;
      parent.add(g);
      this.birds.push({ g, head: h, home: new THREE.Vector3(x, 0, z), fly: 0, dir: new THREE.Vector3(), phase: rnd() * 6, gone: false });
    }
  }

  start() {
    this.active = true;
    this.time = 0;
    this.reset();
  }

  reset() {
    this.birds.forEach((b) => {
      b.gone = false;
      b.fly = 0;
      b.g.visible = true;
      b.g.position.copy(b.home);
    });
  }

  get left() {
    return this.birds.filter((b) => !b.gone).length;
  }

  /** Geeft het aantal net weggejaagde duiven terug. */
  update(dt, t, p) {
    let scared = 0;
    for (const b of this.birds) {
      if (b.fly > 0) {
        b.fly += dt;
        b.g.position.addScaledVector(b.dir, dt * 6);
        b.g.position.y += dt * 4;
        b.g.rotation.z = Math.sin(t * 30) * 0.4;
        if (b.fly > 3) b.g.visible = false;
        continue;
      }
      // Pikken en rondscharrelen
      b.head.position.y = 0.2 - Math.max(0, Math.sin(t * 4 + b.phase)) * 0.08;
      b.g.position.x = b.home.x + Math.sin(t * 0.3 + b.phase) * 0.15;
      if (this.active && Math.hypot(p.x - b.g.position.x, p.z - b.g.position.z) < 1.0 && p.y < 1) {
        b.fly = 0.01;
        b.gone = true;
        b.dir.set(b.g.position.x - p.x, 0, b.g.position.z - p.z).normalize();
        b.g.rotation.y = Math.atan2(b.dir.x, b.dir.z);
        scared++;
      }
    }
    if (this.active) this.time += dt;
    return scared;
  }
}

/** Een persoon die over een route heen en weer wandelt (met optionele stinkwolkjes). */
export class Walker {
  constructor(parent, person, points, { speed = 0.7, stink = false } = {}) {
    this.person = person;
    this.points = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.speed = speed;
    this.i = 1;
    this.wait = 0;
    person.root.position.copy(this.points[0]);
    parent.add(person.root);
    this.puffs = [];
    if (stink) {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(150,200,60,0.8)');
      g.addColorStop(1, 'rgba(150,200,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
      const tex = new THREE.CanvasTexture(c);
      for (let k = 0; k < 8; k++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.5 }));
        s.userData.phase = k / 8;
        parent.add(s);
        this.puffs.push(s);
      }
    }
  }

  get pos() {
    return this.person.root.position;
  }

  update(dt, t, paused = false) {
    const p = this.person.root.position;
    if (!paused) {
      if (this.wait > 0) this.wait -= dt;
      else {
        const target = this.points[this.i];
        const d = Math.hypot(target.x - p.x, target.z - p.z);
        if (d < 0.05) {
          this.i = (this.i + 1) % this.points.length;
          this.wait = 1.2;
        } else {
          const step = Math.min(d, this.speed * dt);
          p.x += ((target.x - p.x) / d) * step;
          p.z += ((target.z - p.z) / d) * step;
          const want = Math.atan2(target.x - p.x, target.z - p.z);
          let diff = want - this.person.root.rotation.y;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          this.person.root.rotation.y += diff * Math.min(1, dt * 5);
          const sw = Math.sin(t * 6) * 0.4;
          this.person.legs[0].rotation.x = sw;
          this.person.legs[1].rotation.x = -sw;
        }
      }
    }
    this.puffs.forEach((s) => {
      const k = (t * 0.35 + s.userData.phase) % 1;
      const a = s.userData.phase * Math.PI * 2 + t * 0.5;
      s.position.set(p.x + Math.cos(a) * (0.4 + k * 0.5), 0.4 + k * 1.6, p.z + Math.sin(a) * (0.4 + k * 0.5));
      s.scale.setScalar(0.3 + k * 0.5);
      s.material.opacity = 0.5 * (1 - k);
    });
  }
}

/** Dozen-speedrun: spring op elke doos om hem plat te maken. */
export class BoxSmash {
  constructor(area, spots, cardboard, tape) {
    this.area = area;
    this.active = false;
    this.time = 0;
    this.boxes = spots.map(([x, z, s = 0.5]) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.userData.dynamic = true;
      const h = s * 0.8;
      const b = new THREE.Mesh(new THREE.BoxGeometry(s, h, s), cardboard);
      b.position.y = h / 2;
      b.castShadow = true;
      const t = new THREE.Mesh(new THREE.BoxGeometry(s * 1.01, 0.01, 0.07), tape);
      t.position.y = h + 0.005;
      g.add(b, t);
      area.group.add(g);
      const collider = area.addCollider(x - s / 2, 0, z - s / 2, x + s / 2, h, z + s / 2, { name: 'doos-plat', climbable: true });
      return { g, collider, x, z, s, h, smashed: false, anim: 0 };
    });
  }

  start() {
    this.active = true;
    this.time = 0;
    this.boxes.forEach((b) => {
      b.smashed = false;
      b.anim = 0;
      b.g.scale.set(1, 1, 1);
      b.g.visible = true;
      b.collider.enabled = true;
    });
  }

  get left() {
    return this.boxes.filter((b) => !b.smashed).length;
  }

  /** Geeft het aantal net geplette dozen terug. */
  update(dt, p) {
    let n = 0;
    for (const b of this.boxes) {
      if (b.smashed) {
        if (b.anim < 1) {
          b.anim = Math.min(1, b.anim + dt * 5);
          b.g.scale.set(1 + b.anim * 0.4, 1 - b.anim * 0.92, 1 + b.anim * 0.4);
        }
        continue;
      }
      if (!this.active) continue;
      const on = Math.abs(p.x - b.x) < b.s / 2 + 0.05 && Math.abs(p.z - b.z) < b.s / 2 + 0.05 && p.y > b.h - 0.08 && p.y < b.h + 0.4;
      if (on) {
        b.smashed = true;
        b.collider.enabled = false;
        n++;
      }
    }
    if (this.active) this.time += dt;
    return n;
  }
}

/** Tegenstander die een route afrijdt (Sjoukje op de fiets). */
export class Rival {
  constructor(parent, model, points, duration) {
    this.model = model;
    this.points = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.lengths = [];
    let total = 0;
    for (let i = 1; i < this.points.length; i++) {
      total += this.points[i].distanceTo(this.points[i - 1]);
      this.lengths.push(total);
    }
    this.total = total;
    this.duration = duration;
    this.t = 0;
    this.active = false;
    model.visible = false;
    parent.add(model);
  }

  start() {
    this.t = 0;
    this.active = true;
    this.model.visible = true;
  }

  stop() {
    this.active = false;
    this.model.visible = false;
  }

  /** true zodra de tegenstander over de finish is. */
  update(dt) {
    if (!this.active) return false;
    this.t += dt;
    const d = Math.min(1, this.t / this.duration) * this.total;
    let i = this.lengths.findIndex((l) => l >= d);
    if (i < 0) i = this.lengths.length - 1;
    const a = this.points[i];
    const b = this.points[i + 1];
    const start = i ? this.lengths[i - 1] : 0;
    const f = (d - start) / (this.lengths[i] - start || 1);
    this.model.position.lerpVectors(a, b, f);
    this.model.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x);
    return this.t >= this.duration;
  }
}
