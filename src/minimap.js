import * as THREE from 'three';

// Minikaart voor buiten: een bovenaanzicht dat één keer uit de wereld zelf wordt getekend
// (alle naar boven gerichte vlakken in hun eigen kleur, bomen als bolletjes), en dat meedraait
// met de camera. Met Puck in het midden, personen als stipjes, iconen bij de gebouwen en een rode
// stip voor het doel (aan de rand als het buiten beeld is).

const RANGE = 36; // halve breedte van de getekende wereld (m)
const PX = 6; // pixels per meter in de achtergrond
const VIEW = 20; // hoeveel meter je vanaf Puck tot de rand ziet

export class Minimap {
  constructor(el, { colorFor }) {
    this.el = el;
    this.canvas = el.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.colorFor = colorFor;
    this.pois = [];
    this.timer = 0;
  }

  /** Tekent de achtergrond vanuit de meshes van het gebied. */
  build(group) {
    const size = RANGE * 2 * PX;
    const bg = document.createElement('canvas');
    bg.width = bg.height = size;
    const ctx = bg.getContext('2d');
    ctx.fillStyle = '#7cb35a';
    ctx.fillRect(0, 0, size, size);
    const tris = [];
    const circles = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const n = new THREE.Vector3();
    const m4 = new THREE.Matrix4();
    group.updateMatrixWorld(true);
    group.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      const col = this.colorFor(o.material);
      if (!col) return;
      if (o.isInstancedMesh) {
        // Boomkruinen en struiken als rondjes
        o.geometry.computeBoundingSphere();
        const r = o.geometry.boundingSphere.radius;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m4);
          m4.premultiply(o.matrixWorld);
          const s = new THREE.Vector3().setFromMatrixScale(m4);
          const p = new THREE.Vector3().setFromMatrixPosition(m4);
          if (p.y > 0.5) circles.push({ x: p.x, z: p.z, r: r * Math.max(s.x, s.z), y: p.y, col });
        }
        return;
      }
      const pos = o.geometry.attributes.position;
      const idx = o.geometry.index;
      const count = idx ? idx.count : pos.count;
      if (count > 60000) return;
      for (let i = 0; i < count; i += 3) {
        const i0 = idx ? idx.getX(i) : i;
        const i1 = idx ? idx.getX(i + 1) : i + 1;
        const i2 = idx ? idx.getX(i + 2) : i + 2;
        a.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
        b.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
        c.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
        n.subVectors(b, a).cross(c.clone().sub(a));
        if (n.y <= 0.0001 * n.length() * 10) continue; // alleen vlakken die (ongeveer) naar boven wijzen
        if (Math.abs(a.x) > RANGE + 4 && Math.abs(b.x) > RANGE + 4) continue;
        const y = Math.max(a.y, b.y, c.y);
        if (y > 40 || y < -1) continue;
        tris.push({ y, col, p: [a.x, a.z, b.x, b.z, c.x, c.z] });
      }
    });
    tris.sort((p, q) => p.y - q.y);
    const tx = (v) => (v + RANGE) * PX;
    for (const t of tris) {
      ctx.fillStyle = t.col;
      ctx.strokeStyle = t.col;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(tx(t.p[0]), tx(t.p[1]));
      ctx.lineTo(tx(t.p[2]), tx(t.p[3]));
      ctx.lineTo(tx(t.p[4]), tx(t.p[5]));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    circles.sort((p, q) => p.y - q.y);
    for (const cl of circles) {
      ctx.fillStyle = cl.col;
      ctx.beginPath();
      ctx.arc(tx(cl.x), tx(cl.z), Math.max(2, cl.r * PX), 0, Math.PI * 2);
      ctx.fill();
    }
    this.bg = bg;
  }

  setVisible(v) {
    this.el.classList.toggle('hidden', !v);
    document.body.classList.toggle('has-minimap', v);
  }

  /** Tekent de kaart. player: {x,z,yaw}, camYaw, target: Vector3|null, dots: [{x,z,col}] */
  draw(dt, { player, camYaw, target, dots }) {
    this.timer -= dt;
    if (this.timer > 0 || !this.bg) return;
    this.timer = 1 / 15;
    const ctx = this.ctx;
    const W = this.canvas.width;
    const C = W / 2;
    const s = C / VIEW; // pixels per meter op het scherm
    const cos = Math.cos(camYaw);
    const sin = Math.sin(camYaw);
    const toScreen = (x, z) => {
      const dx = (x - player.x) * s;
      const dy = (z - player.z) * s;
      return [C + dx * cos - dy * sin, C + dx * sin + dy * cos];
    };
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath();
    ctx.arc(C, C, C - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#6fa84f';
    ctx.fillRect(0, 0, W, W);
    ctx.save();
    ctx.translate(C, C);
    ctx.rotate(camYaw);
    const k = s / PX;
    ctx.drawImage(this.bg, -(player.x + RANGE) * PX * k, -(player.z + RANGE) * PX * k, this.bg.width * k, this.bg.height * k);
    ctx.restore();
    // Stipjes voor mensen
    for (const d of dots) {
      const [x, y] = toScreen(d.x, d.z);
      ctx.fillStyle = d.col;
      ctx.strokeStyle = '#3b2a1e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Iconen bij de gebouwen
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.pois) {
      const [x, y] = toScreen(p.x, p.z);
      if (Math.hypot(x - C, y - C) > C - 8) continue;
      ctx.fillStyle = 'rgba(255,246,230,0.85)';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(p.icon, x, y + 1);
    }
    // Doel: rode stip, of een pijltje aan de rand
    if (target) {
      let [x, y] = toScreen(target.x, target.z);
      const d = Math.hypot(x - C, y - C);
      const edge = C - 12;
      const pulse = 5 + Math.sin(performance.now() / 180) * 1.5;
      if (d > edge) {
        x = C + ((x - C) / d) * edge;
        y = C + ((y - C) / d) * edge;
      }
      ctx.fillStyle = '#e8283a';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Puck in het midden: pijltje in zijn looprichting
    ctx.translate(C, C);
    ctx.rotate(Math.PI - player.yaw + camYaw);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#c8203a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // Noorden op de rand
    const [nx, ny] = [C + Math.sin(camYaw) * (C - 9), C - Math.cos(camYaw) * (C - 9)];
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#3b2a1e';
    ctx.lineWidth = 3;
    ctx.strokeText('N', nx, ny);
    ctx.fillText('N', nx, ny);
  }
}
