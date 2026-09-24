import * as THREE from 'three';
import { lambert } from './materials.js';
import { mergeStatic } from './optimize.js';
import { noDetail } from './detail.js';

// Lowpoly Groningers. Eén bouwfunctie met opties voor kleding, haar en attributen.
// Kwaliteit: getekend gezicht (ogen met glansje, wenkbrauwen, neus, mond, blosjes), ronde armen en benen,
// handen, schoenen met zool, stof-textuur op kleding en plukjes-textuur op het haar.
// Onderdelen die niet bewegen worden per persoon samengevoegd (weinig tekenopdrachten).

const SKIN = [0xf0c7a8, 0xe3b08d, 0xc98f6a, 0x8d5a3b];

const hex = (c) => `#${new THREE.Color(c).getHexString()}`;

let fabricTex = null;
let hairTex = null;

/** Grijze weefselstructuur die met de kledingkleur vermenigvuldigd wordt. */
function fabricTexture() {
  if (fabricTex) return fabricTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 2) {
    ctx.fillStyle = `rgba(0,0,0,${0.035 + Math.random() * 0.03})`;
    ctx.fillRect(0, y, 64, 1);
  }
  for (let x = 0; x < 64; x += 2) {
    ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.04})`;
    ctx.fillRect(x, 0, 1, 64);
  }
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  }
  fabricTex = new THREE.CanvasTexture(c);
  fabricTex.colorSpace = THREE.SRGBColorSpace;
  fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping;
  fabricTex.repeat.set(3, 3);
  return fabricTex;
}

/** Plukjes haar: lichte en donkere strepen. */
function hairTexture() {
  if (hairTex) return hairTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e6e6e6';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 64;
    ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 12, 32, x + (Math.random() - 0.5) * 6, 64);
    ctx.stroke();
  }
  hairTex = new THREE.CanvasTexture(c);
  hairTex.colorSpace = THREE.SRGBColorSpace;
  hairTex.wrapS = hairTex.wrapT = THREE.RepeatWrapping;
  return hairTex;
}

/**
 * Gezicht op een bol-UV: de voorkant (+z) ligt op u = 0.25.
 * mood: 'smile' | 'flat' | 'frown'
 */
function faceTexture(skinColor, hairColor, mood) {
  const W = 256;
  const H = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = hex(skinColor);
  ctx.fillRect(0, 0, W, H);
  const fx = W * 0.25;
  const eyeY = H * 0.47;
  const eyeDX = 11;
  // Blosjes
  ctx.fillStyle = 'rgba(230,110,110,0.28)';
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.ellipse(fx + s * 17, eyeY + 15, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Ogen: wit, iris, pupil, glansje
  [-1, 1].forEach((s) => {
    const x = fx + s * eyeDX;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, eyeY, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a3322';
    ctx.beginPath();
    ctx.arc(x, eyeY + 1, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x, eyeY + 1, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 0.5, eyeY - 2, 1.6, 1.6);
    // Wenkbrauw
    ctx.strokeStyle = hex(hairColor);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    // Boos: binnenkant omlaag. Blij: binnenkant iets omhoog.
    const inner = mood === 'frown' ? 3 : mood === 'smile' ? -1.5 : 0;
    const innerX = x - s * 5;
    const outerX = x + s * 5;
    ctx.beginPath();
    ctx.moveTo(outerX, eyeY - 9);
    ctx.lineTo(innerX, eyeY - 9 + inner);
    ctx.stroke();
  });
  // Neus
  ctx.strokeStyle = 'rgba(120,60,40,0.35)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(fx, eyeY + 4);
  ctx.quadraticCurveTo(fx + 3, eyeY + 11, fx - 1, eyeY + 12);
  ctx.stroke();
  // Mond
  ctx.strokeStyle = '#8a3b36';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  const my = eyeY + 20;
  if (mood === 'smile') {
    ctx.moveTo(fx - 7, my - 2);
    ctx.quadraticCurveTo(fx, my + 4, fx + 7, my - 2);
  } else if (mood === 'frown') {
    ctx.moveTo(fx - 7, my + 2);
    ctx.quadraticCurveTo(fx, my - 4, fx + 7, my + 2);
  } else {
    ctx.moveTo(fx - 6, my);
    ctx.lineTo(fx + 6, my);
  }
  ctx.stroke();
  // Oortjes (achter de wangen, op u = 0 en 0.5)
  ctx.fillStyle = 'rgba(150,80,60,0.25)';
  [0, 0.5].forEach((u) => {
    ctx.beginPath();
    ctx.ellipse(W * u + (u ? 0 : 2), eyeY + 4, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makePerson({
  height = 1.75,
  skin = 0,
  shirt = 0x3d7ea6,
  pants = 0x2b2f3a,
  hair = 0x6b4423,
  hairStyle = 'short', // short | bald | bob | bun | ponytail
  hat = null, // cap | beanie | postpet
  hatColor = 0x1f4f9c,
  beard = false,
  glasses = false,
  prop = null, // rod | mailbag | bread | book
  sitting = false,
  mood = 'flat', // smile | flat | frown
  shoes = 0x2a2522,
} = {}) {
  const s = height / 1.75;
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(s);
  root.add(body);
  const skinColor = SKIN[skin] ?? skin;
  const skinMat = lambert(skinColor);
  const fabric = fabricTexture();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt, map: fabric, flatShading: true });
  const shirtDark = new THREE.MeshLambertMaterial({ color: new THREE.Color(shirt).multiplyScalar(0.72), map: fabric, flatShading: true });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants, map: fabric, flatShading: true });
  const hairMat = new THREE.MeshLambertMaterial({ color: hair, map: hairTexture(), flatShading: true });
  const shoeMat = lambert(shoes);
  const soleMat = lambert(0xe9e4da);
  const dark = lambert(0x222222);
  const add = (geo, mat, x, y, z, parent = body) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const hipY = sitting ? 0.46 : 0.85;
  // Benen: ronde broekspijpen, schoen met lichte zool
  const legs = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.1, hipY, 0);
    add(new THREE.CapsuleGeometry(0.075, 0.62, 3, 8), pantsMat, 0, -0.38, 0, pivot);
    const shoe = add(new THREE.CapsuleGeometry(0.065, 0.14, 3, 8), shoeMat, 0, -0.79, 0.05, pivot);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1.1, 1, 0.75);
    add(new THREE.BoxGeometry(0.14, 0.025, 0.27), soleMat, 0, -0.835, 0.05, pivot);
    if (sitting) pivot.rotation.x = -Math.PI / 2;
    body.add(pivot);
    return pivot;
  });
  // Heupen en romp (iets getailleerd), kraag en knoopjes
  add(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 12), pantsMat, 0, hipY + 0.02, 0).scale.set(1.1, 1, 0.8);
  add(new THREE.CylinderGeometry(0.25, 0.21, 0.6, 12), shirtMat, 0, hipY + 0.36, 0).scale.set(1.1, 1, 0.8);
  add(new THREE.SphereGeometry(0.25, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), shirtMat, 0, hipY + 0.66, 0).scale.set(1.1, 0.35, 0.8);
  add(new THREE.CylinderGeometry(0.075, 0.09, 0.05, 10), shirtDark, 0, hipY + 0.73, 0);
  add(new THREE.BoxGeometry(0.26, 0.03, 0.06), dark, 0, hipY + 0.08, 0.16).scale.set(1, 1, 0.6);
  [0.5, 0.35, 0.2].forEach((y) => add(new THREE.SphereGeometry(0.012, 5, 4), shirtDark, 0, hipY + y, 0.2));
  // Armen: mouw, onderarm en handje
  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.3, hipY + 0.6, 0);
    add(new THREE.SphereGeometry(0.075, 8, 6), shirtMat, 0, 0, 0, pivot);
    add(new THREE.CapsuleGeometry(0.058, 0.3, 3, 8), shirtMat, 0, -0.2, 0, pivot);
    add(new THREE.CapsuleGeometry(0.045, 0.14, 3, 8), skinMat, 0, -0.43, 0, pivot);
    add(new THREE.SphereGeometry(0.052, 8, 6), skinMat, 0, -0.54, 0.005, pivot).scale.set(0.85, 1.1, 0.7);
    pivot.rotation.z = side * 0.06;
    body.add(pivot);
    return pivot;
  });
  // Hoofd met getekend gezicht
  const head = new THREE.Group();
  head.position.y = hipY + 0.82;
  body.add(head);
  add(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 8), skinMat, 0, -0.12, 0, head);
  const faceMat = noDetail(new THREE.MeshLambertMaterial({ map: faceTexture(skinColor, hair, mood) }));
  add(new THREE.SphereGeometry(0.15, 16, 12), faceMat, 0, 0.03, 0, head).scale.set(0.9, 1.05, 0.95);
  add(new THREE.SphereGeometry(0.025, 6, 4), skinMat, 0, 0.0, 0.14, head);
  [-1, 1].forEach((side) => add(new THREE.SphereGeometry(0.03, 6, 5), skinMat, side * 0.135, 0.02, 0, head).scale.set(0.5, 1, 0.8));
  if (hairStyle !== 'bald') {
    // Kruin (eindigt boven de wenkbrauwen) en achterkant tot oorhoogte
    add(new THREE.SphereGeometry(0.16, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.42), hairMat, 0, 0.06, -0.005, head).scale.set(0.95, 1, 1);
    add(new THREE.SphereGeometry(0.158, 12, 6, Math.PI * 0.9, Math.PI * 1.2, Math.PI * 0.3, Math.PI * 0.42), hairMat, 0, 0.04, -0.008, head).scale.set(0.95, 1.05, 1);
  } else {
    // Kale kruin met een randje haar
    add(new THREE.TorusGeometry(0.128, 0.022, 5, 14, Math.PI * 1.2), hairMat, 0, 0.0, -0.01, head).rotation.set(Math.PI / 2, 0, -Math.PI * 0.1 + Math.PI);
  }
  if (hairStyle === 'bob') add(new THREE.CylinderGeometry(0.165, 0.18, 0.2, 14, 1, true, Math.PI * 0.3, Math.PI * 1.4), hairMat, 0, -0.01, -0.01, head);
  if (hairStyle === 'bun') add(new THREE.SphereGeometry(0.07, 10, 8), hairMat, 0, 0.17, -0.1, head);
  if (hairStyle === 'ponytail') add(new THREE.CapsuleGeometry(0.04, 0.2, 3, 8), hairMat, 0, -0.04, -0.17, head).rotation.x = 0.25;
  if (beard) {
    // Baard rond kin en kaken, snor boven de mond
    const b = add(new THREE.SphereGeometry(0.125, 12, 6, Math.PI * 0.05, Math.PI * 0.9, Math.PI * 0.45, Math.PI * 0.4), hairMat, 0, -0.03, 0.012, head);
    b.scale.set(1.05, 1, 1.12);
    add(new THREE.CapsuleGeometry(0.014, 0.06, 2, 6), hairMat, 0, -0.012, 0.143, head).rotation.z = Math.PI / 2;
  }
  if (glasses) {
    [-1, 1].forEach((side) => {
      const rim = add(new THREE.TorusGeometry(0.03, 0.006, 4, 12), dark, side * 0.05, 0.05, 0.14, head);
      rim.castShadow = false;
    });
    add(new THREE.BoxGeometry(0.035, 0.006, 0.006), dark, 0, 0.055, 0.145, head).castShadow = false;
  }
  if (hat === 'cap' || hat === 'postpet') {
    const hm = lambert(hatColor);
    add(new THREE.SphereGeometry(0.162, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), hm, 0, 0.08, 0, head).scale.set(1, 0.75, 1);
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 12, 1, false, -Math.PI / 2, Math.PI), hm, 0, 0.088, 0.1, head).scale.set(1, 1, 0.8);
    if (hat === 'postpet') add(new THREE.BoxGeometry(0.06, 0.03, 0.01), lambert(0xf2c230), 0, 0.13, 0.15, head);
  }
  if (hat === 'beanie') {
    const bm = new THREE.MeshLambertMaterial({ color: hatColor, map: fabric, flatShading: true });
    add(new THREE.SphereGeometry(0.168, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), bm, 0, 0.085, -0.005, head);
    add(new THREE.TorusGeometry(0.158, 0.022, 5, 16), bm, 0, 0.09, -0.005, head).rotation.x = Math.PI / 2;
    add(new THREE.SphereGeometry(0.035, 6, 5), bm, 0, 0.26, -0.01, head);
  }
  // Attributen
  if (prop === 'rod') {
    const rod = add(new THREE.CylinderGeometry(0.01, 0.015, 2.2, 5), lambert(0x6b4423), 0, -0.2, 0.9, arms[1]);
    rod.rotation.x = 1.1;
  }
  if (prop === 'mailbag') {
    add(new THREE.BoxGeometry(0.1, 0.35, 0.4), lambert(0xe86a1a), -0.32, hipY + 0.05, 0);
    add(new THREE.BoxGeometry(0.02, 0.6, 0.02), lambert(0x333333), -0.12, hipY + 0.38, 0.12).rotation.z = 0.6;
  }
  if (prop === 'bread') add(new THREE.CapsuleGeometry(0.05, 0.16, 3, 8), lambert(0xc98a4b), 0, -0.58, 0.1, arms[1]).rotation.x = Math.PI / 2;
  if (prop === 'book') add(new THREE.BoxGeometry(0.16, 0.22, 0.04), lambert(0xd7263d), 0, -0.55, 0.12, arms[0]);

  // Onderdelen samenvoegen per beweegbaar deel: hoofd, armen, benen, dan de romp
  [head, ...arms, ...legs].forEach((part) => {
    mergeStatic(part);
    part.userData.dynamic = true;
  });
  mergeStatic(body);

  const state = { talk: 0, t: Math.random() * 10, rage: 0 };
  const baseSkin = new THREE.Color(skinColor);
  const red = new THREE.Color(0xff2a1a);
  let steam = null;
  const makeSteam = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d');
    // Stripwolkje: wit met een grijze rand, goed zichtbaar op elke achtergrond
    c.width = c.height = 64;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#8a929a';
    ctx.lineWidth = 4;
    const blobs = [[32, 38, 16], [20, 32, 12], [44, 32, 12], [32, 22, 13]];
    blobs.forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    blobs.forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r - 2, 0, Math.PI * 2);
      ctx.fill();
    });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    steam = [];
    for (let i = 0; i < 10; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sp.userData.phase = i / 10;
      sp.userData.side = i % 2 ? 1 : -1;
      sp.visible = false;
      head.add(sp);
      steam.push(sp);
    }
  };
  root.userData.person = true;
  root.userData.dynamic = true;
  return {
    root,
    head,
    arms,
    legs,
    talk(seconds = 2) {
      state.talk = seconds;
    },
    /** Overdreven boos: knalrood hoofd, stoom uit de oren, springen en met de armen zwaaien. */
    rage(seconds = 5) {
      state.rage = seconds;
      if (!steam) makeSteam();
    },
    get raging() {
      return state.rage > 0;
    },
    update(dt, t) {
      state.t += dt;
      state.talk = Math.max(0, state.talk - dt);
      // Rustig ademen en af en toe om zich heen kijken
      body.position.y = Math.sin(state.t * 1.5) * 0.005;
      head.rotation.y = Math.sin(state.t * 0.4) * 0.35;
      if (state.rage > 0 || (steam && steam[0].visible)) {
        state.rage = Math.max(0, state.rage - dt);
        const k = Math.min(1, state.rage * 2);
        faceMat.color.setRGB(1, 1, 1).lerp(red, 0.75 * k);
        skinMat.color.copy(baseSkin).lerp(red, 0.75 * k);
        body.position.y = Math.abs(Math.sin(state.t * 9)) * 0.14 * k;
        head.rotation.y = Math.sin(state.t * 26) * 0.35 * k;
        head.rotation.x = -0.15 * k;
        head.scale.setScalar(1 + 0.12 * k + Math.sin(state.t * 30) * 0.03 * k);
        if (!sitting) {
          arms[0].rotation.x = -2.7 * k + Math.sin(state.t * 18) * 0.35 * k;
          arms[1].rotation.x = -2.7 * k + Math.sin(state.t * 18 + 1.5) * 0.35 * k;
          arms[0].rotation.z = -0.3 * k;
          arms[1].rotation.z = 0.3 * k;
        }
        steam.forEach((sp) => {
          const f = (state.t * 1.6 + sp.userData.phase) % 1;
          sp.visible = k > 0.05;
          sp.position.set(sp.userData.side * (0.15 + f * 0.18), 0.02 + f * 0.6, -0.02);
          sp.scale.setScalar((0.12 + f * 0.34) * (0.5 + k * 0.5));
          sp.material.opacity = Math.min(1, (1 - f) * 1.6) * k;
        });
        if (state.rage <= 0) {
          head.scale.setScalar(1);
          arms.forEach((a, i) => a.rotation.set(0, 0, (i ? 1 : -1) * 0.06));
          steam.forEach((sp) => (sp.visible = false));
          faceMat.color.setRGB(1, 1, 1);
          skinMat.color.copy(baseSkin);
        }
        return;
      }
      if (state.talk > 0) {
        head.rotation.x = Math.sin(state.t * 11) * 0.06;
        arms[0].rotation.x = -0.3 + Math.sin(state.t * 5) * 0.15;
      } else {
        head.rotation.x *= 0.9;
        if (!sitting) arms[0].rotation.x *= 0.9;
      }
    },
  };
}
