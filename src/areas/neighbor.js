import * as THREE from 'three';
import { lambert } from '../world/materials.js';

// De buurvrouw: groot, chagrijnig, halflang wit haar en een bril.
// Ze loopt een vaste ronde door het Pistachehuis. Ziet ze Puck te lang (binnen haar
// kijkkegel en zonder meubels ertussen), dan zet ze hem buiten. In een doos ben je veilig.

const SPEED = 0.85;
const VIEW_RANGE = 4.2;
const VIEW_HALF_ANGLE = THREE.MathUtils.degToRad(38);
const EYE_HEIGHT = 1.62;

const C = {
  skin: lambert(0xf0c7a8),
  hair: lambert(0xf1f0ec),
  cardigan: lambert(0x7b5c7e),
  blouse: lambert(0xe9e1d3),
  skirt: lambert(0x4d4a5c),
  tights: lambert(0x8b7768),
  slipper: lambert(0x9c3b3b),
  glasses: lambert(0x2a2a2a),
  lens: new THREE.MeshLambertMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.45 }),
  dark: lambert(0x2b2220),
  lips: lambert(0xa9555b),
};

function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function ball(r, mat, x, y, z, parent, detail = 1) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function labelTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 35);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Neighbor {
  constructor(parent, waypoints) {
    this.waypoints = waypoints.map(([x, z, wait = 1.2]) => ({ pos: new THREE.Vector3(x, 0, z), wait }));
    this.target = 1;
    this.waitTime = 0;
    this.suspicion = 0;
    this.grace = 0;
    this.walkPhase = 0;
    this.lookAround = 0;

    this.root = new THREE.Group();
    this.root.position.copy(this.waypoints[0].pos);
    parent.add(this.root);
    this.build();
    this.buildCone(parent);

    this.qTex = labelTexture('?', '#e8a317');
    this.eTex = labelTexture('!', '#d7263d');
    this.alert = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.qTex, transparent: true, depthTest: false }));
    this.alert.scale.setScalar(0.35);
    this.alert.position.y = 2.15;
    this.alert.visible = false;
    this.alert.renderOrder = 5;
    this.root.add(this.alert);

    this.ray = new THREE.Ray();
    this.tmpBox = new THREE.Box3();
    this.hit = new THREE.Vector3();
  }

  build() {
    const g = new THREE.Group();
    this.body = g;
    this.root.add(g);
    // Benen met sloffen
    this.legs = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.1, 0.78, 0);
      box(0.13, 0.72, 0.14, C.tights, 0, -0.38, 0, pivot);
      box(0.14, 0.07, 0.26, C.slipper, 0, -0.75, 0.05, pivot);
      g.add(pivot);
      return pivot;
    });
    // Rok en stevig lijf met vest
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.33, 0.42, 8), C.skirt);
    skirt.position.y = 0.88;
    skirt.castShadow = true;
    g.add(skirt);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.6, 8), C.cardigan);
    torso.position.y = 1.35;
    torso.scale.set(1.1, 1, 0.85);
    torso.castShadow = true;
    g.add(torso);
    box(0.16, 0.5, 0.05, C.blouse, 0, 1.4, 0.23, g);
    // Armen
    this.arms = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.33, 1.58, 0);
      box(0.12, 0.5, 0.13, C.cardigan, 0, -0.24, 0.02, pivot);
      ball(0.06, C.skin, 0, -0.5, 0.04, pivot);
      g.add(pivot);
      return pivot;
    });
    // Nek en hoofd
    box(0.1, 0.1, 0.1, C.skin, 0, 1.7, 0, g);
    const head = new THREE.Group();
    head.position.y = 1.86;
    g.add(head);
    this.head = head;
    ball(0.15, C.skin, 0, 0, 0, head).scale.set(0.9, 1.05, 0.95);
    // Halflang wit haar: kapje + lokken tot op de schouders
    ball(0.16, C.hair, 0, 0.05, -0.03, head).scale.set(1.02, 0.95, 1.0);
    box(0.34, 0.26, 0.14, C.hair, 0, -0.08, -0.08, head);
    box(0.07, 0.26, 0.2, C.hair, -0.145, -0.08, 0.0, head);
    box(0.07, 0.26, 0.2, C.hair, 0.145, -0.08, 0.0, head);
    box(0.26, 0.05, 0.08, C.hair, 0, 0.1, 0.1, head);
    // Bril
    [-1, 1].forEach((side) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.009, 5, 12), C.glasses);
      rim.position.set(side * 0.055, 0.015, 0.14);
      head.add(rim);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), C.lens);
      lens.position.set(side * 0.055, 0.015, 0.141);
      head.add(lens);
      box(0.012, 0.012, 0.012, C.dark, side * 0.055, 0.015, 0.125, head);
      // Boze wenkbrauwen
      const brow = box(0.06, 0.012, 0.012, C.dark, side * 0.055, 0.07, 0.14, head);
      brow.rotation.z = side * -0.35;
    });
    box(0.03, 0.009, 0.01, C.glasses, 0, 0.02, 0.145, head);
    // Neus en een zuur mondje
    ball(0.025, C.skin, 0, -0.02, 0.15, head, 0);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 4, 8, Math.PI), C.lips);
    mouth.position.set(0, -0.085, 0.135);
    head.add(mouth);
  }

  buildCone(parent) {
    const geo = new THREE.CircleGeometry(VIEW_RANGE, 20, -Math.PI / 2 - VIEW_HALF_ANGLE, VIEW_HALF_ANGLE * 2);
    geo.rotateX(-Math.PI / 2);
    this.coneMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.18, depthWrite: false });
    this.cone = new THREE.Mesh(geo, this.coneMat);
    this.cone.position.y = 0.015;
    this.cone.renderOrder = 1;
    parent.add(this.cone);
  }

  reset(graceSeconds = 2.5) {
    this.suspicion = 0;
    this.grace = graceSeconds;
    this.alert.visible = false;
  }

  /** Heeft de buurvrouw vrij zicht op punt p? */
  canSee(p, colliders) {
    const eye = this.tmpEye || (this.tmpEye = new THREE.Vector3());
    eye.set(this.root.position.x, EYE_HEIGHT, this.root.position.z);
    const dir = this.tmpDir || (this.tmpDir = new THREE.Vector3());
    dir.subVectors(p, eye);
    const dist = dir.length();
    dir.divideScalar(dist);
    // In de kijkkegel?
    const fx = Math.sin(this.root.rotation.y);
    const fz = Math.cos(this.root.rotation.y);
    const flat = Math.hypot(dir.x, dir.z) || 1;
    const angle = Math.acos(THREE.MathUtils.clamp((dir.x * fx + dir.z * fz) / flat, -1, 1));
    const horiz = Math.hypot(p.x - eye.x, p.z - eye.z);
    if (horiz > VIEW_RANGE || angle > VIEW_HALF_ANGLE) return false;
    // Meubels ertussen?
    this.ray.set(eye, dir);
    for (const c of colliders) {
      if (!c.enabled || c.name === 'glas') continue;
      this.tmpBox.min.copy(c.min);
      this.tmpBox.max.copy(c.max);
      if (this.tmpBox.containsPoint(p)) continue;
      if (this.ray.intersectBox(this.tmpBox, this.hit) && this.hit.distanceTo(eye) < dist - 0.05) return false;
    }
    return true;
  }

  /**
   * @returns {'caught'|'suspicious'|null}
   */
  update(dt, time, puckPos, hidden, colliders) {
    this.grace = Math.max(0, this.grace - dt);
    const pos = this.root.position;
    const center = this.tmpCenter || (this.tmpCenter = new THREE.Vector3());
    center.set(puckPos.x, puckPos.y + 0.17, puckPos.z);

    const seen = !hidden && this.grace <= 0 && this.canSee(center, colliders);
    const bumped = !hidden && this.grace <= 0 && Math.hypot(puckPos.x - pos.x, puckPos.z - pos.z) < 0.5 && puckPos.y < 1.2;
    const dist = Math.hypot(center.x - pos.x, center.z - pos.z);
    if (seen) this.suspicion += dt * (dist < 2 ? 1.6 : 1.0);
    else this.suspicion = Math.max(0, this.suspicion - dt * 0.6);

    let moving = false;
    if (this.suspicion > 0.05) {
      // Stilstaan en naar Puck draaien
      if (seen) this.turnTo(Math.atan2(center.x - pos.x, center.z - pos.z), dt, 5);
    } else if (this.waitTime > 0) {
      this.waitTime -= dt;
      this.lookAround += dt;
      this.head.rotation.y = Math.sin(this.lookAround * 1.6) * 0.6;
    } else {
      const wp = this.waypoints[this.target];
      const dx = wp.pos.x - pos.x;
      const dz = wp.pos.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.08) {
        this.waitTime = wp.wait;
        this.lookAround = 0;
        this.target = (this.target + 1) % this.waypoints.length;
      } else {
        const step = Math.min(d, SPEED * dt);
        pos.x += (dx / d) * step;
        pos.z += (dz / d) * step;
        this.turnTo(Math.atan2(dx, dz), dt, 6);
        moving = true;
      }
      this.head.rotation.y *= 1 - Math.min(1, dt * 4);
    }

    // Loopanimatie
    if (moving) this.walkPhase += dt * 6;
    const swing = moving ? Math.sin(this.walkPhase) * 0.45 : 0;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing * 0.6;
    this.arms[1].rotation.x = swing * 0.6;
    this.body.position.y = moving ? Math.abs(Math.cos(this.walkPhase)) * 0.03 : 0;
    // Chagrijnig hoofdschudden als ze iets vermoedt
    if (this.suspicion > 0.05) this.head.rotation.z = Math.sin(time * 14) * 0.08 * this.suspicion;
    else this.head.rotation.z = 0;

    // Kijkkegel en ?/!
    this.cone.position.x = pos.x;
    this.cone.position.z = pos.z;
    this.cone.rotation.y = this.root.rotation.y;
    const alarm = Math.min(1, this.suspicion);
    this.coneMat.color.setRGB(1, 0.88 - alarm * 0.6, 0.4 - alarm * 0.3);
    this.coneMat.opacity = 0.16 + alarm * 0.2;
    this.alert.visible = this.suspicion > 0.05;
    this.alert.material.map = this.suspicion > 0.6 ? this.eTex : this.qTex;
    this.alert.scale.setScalar(0.3 + alarm * 0.15);

    if (this.suspicion >= 1 || bumped) {
      this.suspicion = 1;
      this.alert.material.map = this.eTex;
      return 'caught';
    }
    return this.suspicion > 0.05 ? 'suspicious' : null;
  }

  turnTo(target, dt, speed) {
    let diff = target - this.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.root.rotation.y += diff * Math.min(1, dt * speed);
  }
}
