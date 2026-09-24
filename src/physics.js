import * as THREE from 'three';

// Eenvoudige karakterfysica: Puck is een staande cilinder (straal RADIUS, hoogte HEIGHT)
// die botst met assen-uitgelijnde blokken. Geen externe physics-library nodig.

export const RADIUS = 0.12;
export const HEIGHT = 0.34;
export const DEFAULT_HOP = 0.45;
const GRAVITY = 12;
const WALK_SPEED = 1.6;
const ACCEL = 14;
const HOP_HEIGHT = DEFAULT_HOP; // "hooguit een klein stukje hoppen"
const STEP_HEIGHT = 0.1;
const CLIMB_SPEED = 1.1;
const COYOTE_TIME = 0.1;
const HOP_BUFFER = 0.12;
const FOOT_RADIUS = RADIUS * 0.55; // hoe ver Puck over een rand kan staan

export class CharacterBody {
  constructor(colliders) {
    this.colliders = colliders;
    this.walkSpeed = WALK_SPEED;
    this.hopHeight = HOP_HEIGHT;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.grounded = true;
    this.climbing = false;
    this.coyote = 0;
    this.hopBuffer = 0;
    this.events = { hopped: false, landed: 0 };
  }

  teleport(p, yaw = 0) {
    this.pos.copy(p);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.grounded = true;
    this.climbing = false;
  }

  requestHop() {
    this.hopBuffer = HOP_BUFFER;
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} wish gewenste looprichting in wereldruimte (lengte 0..1)
   */
  update(dt, wish) {
    this.events.hopped = false;
    this.events.landed = 0;
    this.hopBuffer = Math.max(0, this.hopBuffer - dt);
    this.coyote = this.grounded ? COYOTE_TIME : Math.max(0, this.coyote - dt);

    // Horizontale snelheid richting de gewenste snelheid
    const control = this.grounded || this.climbing ? 1 : 0.55;
    const k = 1 - Math.exp(-ACCEL * control * dt);
    this.vel.x += (wish.x * this.walkSpeed - this.vel.x) * k;
    this.vel.z += (wish.z * this.walkSpeed - this.vel.z) * k;

    // Draai Puck naar de looprichting
    const wishLen = Math.hypot(wish.x, wish.z);
    if (wishLen > 0.05) {
      const target = Math.atan2(wish.x, wish.z);
      let diff = target - this.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.yaw += diff * (1 - Math.exp(-12 * dt));
    }

    // Hoppen
    if (this.hopBuffer > 0 && (this.coyote > 0 || this.climbing)) {
      this.vel.y = Math.sqrt(2 * GRAVITY * this.hopHeight) * (this.climbing ? 0.7 : 1);
      if (this.climbing) {
        // afzetten van de wand
        this.vel.x -= Math.sin(this.yaw) * 1.2;
        this.vel.z -= Math.cos(this.yaw) * 1.2;
      }
      this.grounded = false;
      this.climbing = false;
      this.coyote = 0;
      this.hopBuffer = 0;
      this.events.hopped = true;
    }

    const prevFeet = this.pos.y;

    // --- Horizontaal bewegen en botsen ---
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    const climbHit = this.resolveHorizontal(wish, wishLen);

    // --- Klimmen ---
    if (this.stepped && this.climbing && !climbHit) {
      // Bovenaan aangekomen: netjes op de rand gaan staan
      this.climbing = false;
      this.vel.y = 0;
    } else if (climbHit) {
      this.climbing = true;
      this.vel.y = CLIMB_SPEED;
    } else if (this.climbing) {
      this.climbing = false;
      // over de rand? even een klein zetje omhoog
      if (this.vel.y > 0) this.vel.y = Math.min(this.vel.y, 1.5);
    }

    // --- Verticaal ---
    if (!this.climbing) this.vel.y -= GRAVITY * dt;
    this.vel.y = Math.max(this.vel.y, -12);
    const ground = this.groundHeight(prevFeet);
    const oldVy = this.vel.y;
    this.pos.y += this.vel.y * dt;

    // Plafond (alleen massieve blokken van onderaf)
    if (this.vel.y > 0) {
      const head = this.pos.y + HEIGHT;
      const prevHead = prevFeet + HEIGHT;
      for (const c of this.colliders) {
        if (!c.enabled || c.oneWay || (c.climbable && climbHit)) continue;
        if (c.min.y < head && c.min.y >= prevHead - 0.01 && this.overlapsXZ(c, RADIUS * 0.5)) {
          this.pos.y = c.min.y - HEIGHT;
          this.vel.y = 0;
          this.climbing = false;
        }
      }
    }

    const wasGrounded = this.grounded;
    if (this.pos.y <= ground && this.vel.y <= 0) {
      this.pos.y = ground;
      if (!wasGrounded && oldVy < -1) this.events.landed = -oldVy;
      this.vel.y = 0;
      this.grounded = true;
      this.climbing = false;
    } else {
      // Blijf op de grond "plakken" bij kleine hoogteverschillen naar beneden (traptreetjes)
      if (wasGrounded && this.vel.y <= 0 && ground > this.pos.y - STEP_HEIGHT && ground < prevFeet + 0.001) {
        this.pos.y = ground;
        this.vel.y = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    }
  }

  overlapsXZ(c, r) {
    const cx = Math.max(c.min.x, Math.min(this.pos.x, c.max.x));
    const cz = Math.max(c.min.z, Math.min(this.pos.z, c.max.z));
    const dx = this.pos.x - cx;
    const dz = this.pos.z - cz;
    return dx * dx + dz * dz < r * r;
  }

  /** Hoogste begaanbare oppervlak onder Puck. */
  groundHeight(prevFeet) {
    let ground = 0;
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      const top = c.max.y;
      if (top <= ground) continue;
      if (top > prevFeet + (c.oneWay ? 0.001 : STEP_HEIGHT * 0.5)) continue;
      if (this.overlapsXZ(c, FOOT_RADIUS)) ground = top;
    }
    return ground;
  }

  /** Duwt Puck uit blokken; geeft true als hij tegen iets beklimbaars duwt. */
  resolveHorizontal(wish, wishLen) {
    const feet = this.pos.y;
    const head = feet + HEIGHT;
    let climb = false;
    this.stepped = false;
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.colliders) {
        if (!c.enabled || c.oneWay) continue;
        if (c.max.y <= feet + 0.001 || c.min.y >= head - 0.01) continue;

        const cx = Math.max(c.min.x, Math.min(this.pos.x, c.max.x));
        const cz = Math.max(c.min.z, Math.min(this.pos.z, c.max.z));
        let nx = this.pos.x - cx;
        let nz = this.pos.z - cz;
        let dist2 = nx * nx + nz * nz;
        if (dist2 >= RADIUS * RADIUS) continue;

        // Kleine opstapjes: gewoon erop stappen
        const rise = c.max.y - feet;
        if (rise <= STEP_HEIGHT && (this.grounded || this.climbing || (this.vel.y <= 0 && rise < 0.05))) {
          this.pos.y = c.max.y;
          this.stepped = true;
          continue;
        }

        let dist = Math.sqrt(dist2);
        if (dist < 1e-5) {
          // Middelpunt zit in het blok: duw langs de kortste as eruit
          const pen = [
            [this.pos.x - c.min.x, -1, 0],
            [c.max.x - this.pos.x, 1, 0],
            [this.pos.z - c.min.z, 0, -1],
            [c.max.z - this.pos.z, 0, 1],
          ].sort((a, b) => a[0] - b[0])[0];
          nx = pen[1];
          nz = pen[2];
          this.pos.x += nx * (pen[0] + RADIUS);
          this.pos.z += nz * (pen[0] + RADIUS);
        } else {
          nx /= dist;
          nz /= dist;
          const push = RADIUS - dist;
          this.pos.x += nx * push;
          this.pos.z += nz * push;
        }
        // Snelheid in de wand wegnemen
        const vn = this.vel.x * nx + this.vel.z * nz;
        if (vn < 0) {
          this.vel.x -= vn * nx;
          this.vel.z -= vn * nz;
        }
        // Klimmen als je er actief tegenaan loopt
        if (c.climbable && wishLen > 0.2) {
          const into = -(wish.x * nx + wish.z * nz) / wishLen;
          if (into > 0.35) climb = true;
        }
      }
    }
    return climb;
  }

  get speed() {
    return Math.hypot(this.vel.x, this.vel.z);
  }
}
