import * as THREE from 'three';

// Sfeer en "juice": wind, lucht, wolken, vlinders, vogels, fontein, vlaggetjes,
// stofjes in zonlicht. Alles licht genoeg voor een gemiddelde telefoon.

export const fxTime = { value: 0 };

/** Laat bladeren/bloemen zachtjes wiegen in de wind (vertex shader, geen CPU-kosten). */
export function applyWind(material, strength = 1) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = fxTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 windBase = instanceMatrix[3].xyz;
        #else
          vec3 windBase = modelMatrix[3].xyz;
        #endif
        float windH = max(position.y, 0.0) * ${strength.toFixed(3)};
        transformed.x += sin(uTime * 1.7 + windBase.x * 0.6 + windBase.z * 0.4) * 0.07 * windH;
        transformed.z += cos(uTime * 1.3 + windBase.z * 0.5) * 0.05 * windH;`,
      );
  };
  material.customProgramCacheKey = () => `wind${strength}`;
  return material;
}

/** Hemelkoepel met kleurverloop en een zachte zon. */
export function makeSkyDome(sunDir = new THREE.Vector3(-0.5, 0.55, 0.4)) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uSun: { value: sunDir.clone().normalize() } },
    vertexShader: `varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `varying vec3 vDir;
      uniform vec3 uSun;
      void main() {
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 top = vec3(0.30, 0.62, 0.95);
        vec3 mid = vec3(0.62, 0.84, 1.0);
        vec3 horizon = vec3(1.0, 0.90, 0.74);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.25, h));
        col = mix(col, top, smoothstep(0.25, 0.9, h));
        float s = max(dot(normalize(vDir), uSun), 0.0);
        col += vec3(1.0, 0.85, 0.55) * pow(s, 64.0) * 1.6;   // zonneschijf
        col += vec3(1.0, 0.75, 0.45) * pow(s, 6.0) * 0.25;   // gloed
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(120, 24, 12), mat);
  dome.renderOrder = -1;
  return dome;
}

/** Drijvende lowpoly-wolken (één instanced mesh). */
export class Clouds {
  constructor(parent, count = 9) {
    const puffs = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 45 + (i % 3) * 12;
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;
      const cy = 22 + (i % 4) * 4;
      for (let k = 0; k < 4; k++) puffs.push([cx + (k - 1.5) * 3.2, cy + (k % 2) * 1.2, cz + ((k * 7) % 3) - 1, 2.6 + (k % 2) * 1.2]);
    }
    this.mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xe8eef5, emissiveIntensity: 0.55, flatShading: true, fog: false }),
      puffs.length,
    );
    const m = new THREE.Matrix4();
    puffs.forEach(([x, y, z, s], i) => this.mesh.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(s * 1.3, s * 0.8, s))));
    parent.add(this.mesh);
  }

  update(dt) {
    this.mesh.rotation.y += dt * 0.004;
  }
}

/** Fladderende vlinders die rond een punt dwarrelen. */
export class Butterflies {
  constructor(parent, spots) {
    const colors = [0xf2c230, 0xe9806e, 0x9ad3ff, 0xd96fb4, 0xffffff, 0xff9f43];
    const wingGeo = new THREE.CircleGeometry(0.07, 5);
    wingGeo.translate(0.06, 0, 0);
    this.list = spots.map(([x, z], i) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide });
      const l = new THREE.Mesh(wingGeo, mat);
      const r = new THREE.Mesh(wingGeo, mat);
      r.scale.x = -1;
      l.rotation.x = r.rotation.x = -Math.PI / 2;
      const wl = new THREE.Group();
      const wr = new THREE.Group();
      wl.add(l);
      wr.add(r);
      g.add(wl, wr);
      parent.add(g);
      return { g, wl, wr, cx: x, cz: z, phase: i * 1.7, speed: 0.4 + (i % 3) * 0.15 };
    });
  }

  update(dt, t) {
    for (const b of this.list) {
      const a = t * b.speed + b.phase;
      const x = b.cx + Math.sin(a) * 1.6 + Math.sin(a * 2.3) * 0.4;
      const z = b.cz + Math.cos(a * 0.8) * 1.4;
      const y = 0.7 + Math.sin(a * 3.1) * 0.3;
      const dx = x - b.g.position.x;
      const dz = z - b.g.position.z;
      b.g.position.set(x, y, z);
      if (dx || dz) b.g.rotation.y = Math.atan2(dx, dz);
      const flap = Math.sin(t * 22 + b.phase) * 1.1;
      b.wl.rotation.z = flap;
      b.wr.rotation.z = -flap;
    }
  }
}

/** Vogeltjes die hoog in de lucht rondcirkelen. */
export class Birds {
  constructor(parent, count = 6) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.6, 0.15, 0, 0, 0, 0.1, 0, 0, -0.1, 0.6, 0.15, 0, 0, 0, 0.1, 0, 0, -0.1], 3));
    const mat = new THREE.MeshBasicMaterial({ color: 0x3b3f46, side: THREE.DoubleSide, fog: false });
    this.list = Array.from({ length: count }, (_, i) => {
      const m = new THREE.Mesh(geo, mat);
      parent.add(m);
      return { m, r: 18 + (i % 3) * 6, h: 14 + (i % 2) * 4, phase: (i / count) * Math.PI * 2, speed: 0.12 + (i % 2) * 0.05 };
    });
  }

  update(dt, t) {
    for (const b of this.list) {
      const a = t * b.speed + b.phase;
      b.m.position.set(Math.cos(a) * b.r, b.h + Math.sin(t * 0.7 + b.phase) * 1.5, Math.sin(a) * b.r);
      b.m.rotation.y = -a;
      b.m.scale.y = 1 + Math.sin(t * 9 + b.phase) * 0.8;
    }
  }
}

/** Stofjes die in de zonnestralen zweven (binnen). */
export class DustMotes {
  constructor(parent, box, count = 70) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = box.min.x + Math.random() * (box.max.x - box.min.x);
      pos[i * 3 + 1] = box.min.y + Math.random() * (box.max.y - box.min.y);
      pos[i * 3 + 2] = box.min.z + Math.random() * (box.max.z - box.min.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xfff1c8, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.box = box;
    parent.add(this.points);
  }

  update(dt, t) {
    const p = this.points.geometry.attributes.position;
    const { min, max } = this.box;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + dt * 0.03;
      if (y > max.y) y = min.y;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(t * 0.5 + i) * dt * 0.02);
    }
    p.needsUpdate = true;
  }
}

/** Schuine lichtbundel door een raam (additief, zonder schaduwkosten). */
export function lightShaft(width, height, color = 0xfff0c8, opacity = 0.14) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 64);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  return m;
}

/** Zonnestraal van `from` (raam) naar `to` (vloer): twee gekruiste additieve vlakken. */
export function addShaft(parent, from, to, width = 0.9, opacity = 0.12) {
  const dir = new THREE.Vector3().subVectors(from, to);
  const len = dir.length();
  dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  for (let i = 0; i < 2; i++) {
    const m = lightShaft(width, len, 0xfff0c8, opacity);
    m.position.copy(mid);
    m.quaternion.copy(q);
    m.rotateY((i * Math.PI) / 2);
    m.renderOrder = 2;
    parent.add(m);
  }
}

/** Fontein met opspattende druppels. */
export class Fountain {
  constructor(parent, x, z, stone, water) {
    this.x = x;
    this.z = z;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    parent.add(g);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.45, 12, 1, true), stone);
    basin.material = stone.clone();
    basin.material.side = THREE.DoubleSide;
    basin.position.y = 0.225;
    basin.castShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.08, 5, 16), stone);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.45;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.12, 16), water);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.36;
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.0, 8), stone);
    column.position.y = 0.5;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.2, 0.18, 10), stone);
    bowl.position.y = 1.05;
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.4, 10), water);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 1.13;
    g.add(basin, rim, pool, column, bowl, top);

    const n = 60;
    this.drops = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.035, 0),
      new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.85 }),
      n,
    );
    this.seed = Array.from({ length: n }, (_, i) => ({ a: (i / n) * Math.PI * 2 * 3.7, off: i / n }));
    g.add(this.drops);
    this.m = new THREE.Matrix4();
  }

  update(dt, t) {
    const period = 1.1;
    this.seed.forEach((d, i) => {
      const p = ((t / period + d.off) % 1) * period;
      const vr = 0.9;
      const vy = 2.4;
      const r = vr * p;
      const y = 1.25 + vy * p - 4.9 * p * p;
      this.m.makeTranslation(Math.cos(d.a) * r, Math.max(0.38, y), Math.sin(d.a) * r);
      this.drops.setMatrixAt(i, this.m);
    });
    this.drops.instanceMatrix.needsUpdate = true;
  }
}

/** Slinger met vrolijke vlaggetjes tussen twee punten. */
export function bunting(parent, a, b, count = 16, sag = 0.5) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.12, 0, 0, 0.12, 0, 0, 0, -0.28, 0], 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const flags = new THREE.InstancedMesh(geo, mat, count);
  const colors = [0xd7263d, 0xf2c230, 0x3d9be0, 0x6ac46b, 0xe86fb4, 0xff9f43];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(b.z - a.z, a.x - b.x));
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    flags.setMatrixAt(i, m.compose(p, q, new THREE.Vector3(1, 1, 1)));
    flags.setColorAt(i, c.setHex(colors[i % colors.length]));
  }
  parent.add(flags);
  // Het touwtje
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x6b4423 })));
  return flags;
}

/** Canvas-textuur met lichte glinsteringen voor water. */
export function waterTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5fbde0';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const x = (i * 37) % 128;
    const y = (i * 53) % 128;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 8, y - 4, x + 16, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}
