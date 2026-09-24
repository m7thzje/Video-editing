import * as THREE from 'three';

// Third-person camera die Puck volgt en binnen de kamer blijft.

export class FollowCamera {
  constructor(camera, bounds, colliders = []) {
    this.camera = camera;
    this.colliders = colliders;
    this.ray = new THREE.Ray();
    this.box = new THREE.Box3();
    this.hit = new THREE.Vector3();
    this.currentDistance = 1.7;
    this.minPitch = -0.25;
    this.bounds = bounds; // { minX, maxX, minZ, maxZ, minY, maxY } of null
    this.yaw = 0; // horizontale draaiing rond Puck
    this.pitch = 0.35; // omlaag kijken
    this.distance = 1.7;
    this.target = new THREE.Vector3();
    this.smoothTarget = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.sensitivity = 0.0035;
  }

  snap(target, yaw) {
    this.target.copy(target);
    this.smoothTarget.copy(target);
    this.yaw = yaw;
    this.update(0);
  }

  rotate(dx, dy) {
    this.yaw -= dx * this.sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * this.sensitivity, -0.25, 1.2);
  }

  /** Vooruit-richting van de camera op het grondvlak. */
  forward(out) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  update(dt, target) {
    if (target) this.target.copy(target);
    const k = dt === 0 ? 1 : 1 - Math.exp(-10 * dt);
    this.smoothTarget.lerp(this.target, k);

    if (this.pitch < this.minPitch) {
      this.pitch += (this.minPitch - this.pitch) * (dt === 0 ? 1 : 1 - Math.exp(-5 * dt));
    }
    const cp = Math.cos(this.pitch);
    const offset = this.tmp.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);

    // Camera-botsing: niet achter meubels of wanden verdwijnen
    let dist = this.distance;
    this.ray.set(this.smoothTarget, offset);
    for (const c of this.colliders) {
      if (!c.enabled || c.oneWay) continue;
      this.box.min.copy(c.min);
      this.box.max.copy(c.max);
      if (this.box.containsPoint(this.smoothTarget)) continue;
      if (this.ray.intersectBox(this.box, this.hit)) {
        const d = this.hit.distanceTo(this.smoothTarget) - 0.12;
        if (d < dist) dist = d;
      }
    }
    dist = Math.max(0.35, dist);
    // Sneller inzoomen dan uitzoomen voorkomt schokken
    const zk = dist < this.currentDistance ? 1 : 1 - Math.exp(-4 * (dt || 1));
    this.currentDistance += (dist - this.currentDistance) * zk;
    const pos = this.camera.position.copy(this.smoothTarget).addScaledVector(offset, this.currentDistance);

    const b = this.bounds;
    if (b) {
      pos.x = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX);
      pos.z = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
      pos.y = THREE.MathUtils.clamp(pos.y, b.minY, b.maxY);
    }
    this.camera.lookAt(this.smoothTarget);
  }
}
