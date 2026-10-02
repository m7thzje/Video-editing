import * as THREE from 'three';
import { lambert } from './materials.js';

// Sjors de slechtvalk: de slechtvalk die echt op het Gasunie-gebouw broedt. Blauwgrijze rug en vleugels,
// donkere kap met "snor", witte wangen, roomkleurige borst met donkere streepjes, gele oogring en poten.
// Lokale voorkant is +Z.

function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f2ead8';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#3b4652';
  for (let y = 4; y < 64; y += 9) for (let x = (y % 18) / 2; x < 64; x += 12) {
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeRaptor() {
  const g = new THREE.Group();
  const rig = new THREE.Group();
  g.add(rig);
  const brown = lambert(0x5b6876);
  const dark = lambert(0x2f3742);
  const white = lambert(0xf4f1ea);
  const chest = new THREE.MeshLambertMaterial({ map: stripeTexture() });
  const yellow = lambert(0xf2b01e);
  const black = lambert(0x111111);
  const add = (parent, geo, mat, p, s, r) => {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(...p);
    if (s) m.scale.set(...s);
    if (r) m.rotation.set(...r);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const sph = (r) => new THREE.SphereGeometry(r, 16, 12);
  add(rig, sph(0.27), brown, [0, 0.55, -0.02], [1, 1.3, 0.9], [0.25, 0, 0]);
  add(rig, sph(0.25), chest, [0, 0.5, 0.1], [0.95, 1.15, 0.7]);
  // Kop met wenkbrauw-lijst (boze blik) en haaksnavel
  const head = new THREE.Group();
  head.position.set(0, 0.98, 0.08);
  rig.add(head);
  add(head, sph(0.19), brown, null, [1, 0.95, 1.05]);
  add(head, sph(0.12), white, [0, -0.07, 0.09], [1.05, 0.75, 0.8]);
  [-1, 1].forEach((s) => {
    // Witte wang met zwarte "snor" (baardstreep), gele oogring, groot donker oog
    add(head, sph(0.06), white, [s * 0.12, -0.03, 0.08], [0.6, 1, 0.9]);
    add(head, new THREE.BoxGeometry(0.035, 0.12, 0.05), dark, [s * 0.14, -0.04, 0.11], null, [0, 0, s * 0.15]);
    add(head, sph(0.042), yellow, [s * 0.11, 0.03, 0.13]);
    add(head, sph(0.032), black, [s * 0.122, 0.03, 0.15]);
    add(head, new THREE.BoxGeometry(0.11, 0.025, 0.05), dark, [s * 0.1, 0.085, 0.14], null, [0, 0, s * -0.4]);
  });
  add(head, new THREE.ConeGeometry(0.045, 0.06, 8), yellow, [0, -0.01, 0.18], null, [Math.PI / 2, 0, 0]);
  add(head, new THREE.ConeGeometry(0.038, 0.1, 6), lambert(0x3b4048), [0, -0.04, 0.23], null, [Math.PI - 0.7, 0, 0]);
  // Vleugels
  const wings = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.27, 0.75, -0.02);
    rig.add(pivot);
    add(pivot, sph(0.22), brown, [s * 0.05, -0.22, -0.05], [0.35, 1.45, 1.0], [0.3, 0, 0]);
    for (let i = 0; i < 4; i++) add(pivot, new THREE.BoxGeometry(0.04, 0.03, 0.32), dark, [s * (0.06 + i * 0.01), -0.45 - i * 0.04, -0.2 - i * 0.02], null, [0.9, 0, 0]);
    return pivot;
  });
  // Staart en poten
  add(rig, new THREE.BoxGeometry(0.18, 0.04, 0.42), dark, [0, 0.22, -0.33], null, [-0.6, 0, 0]);
  [-1, 1].forEach((s) => {
    add(rig, new THREE.CylinderGeometry(0.035, 0.035, 0.2, 6), yellow, [s * 0.1, 0.12, 0.02]);
    for (let i = -1; i <= 1; i++) add(rig, new THREE.ConeGeometry(0.02, 0.1, 5), black, [s * 0.1 + i * 0.03, 0.02, 0.08], null, [Math.PI / 2, 0, 0]);
  });
  g.userData.dynamic = true;
  g.userData.head = head;
  g.userData.wings = wings;
  g.userData.rig = rig;
  // Rustig om zich heen kijken; flap/attack wordt door het gevecht gestuurd
  g.userData.flap = 0;
  g.userData.idle = (t) => {
    head.rotation.y = Math.sin(t * 0.7) * 0.6;
    const f = g.userData.flap;
    wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.1 + f * (0.9 + Math.sin(t * 22) * 0.6))));
    rig.position.y = f * 0.2 * Math.abs(Math.sin(t * 11));
  };
  return g;
}
