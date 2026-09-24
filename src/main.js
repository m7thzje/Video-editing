import * as THREE from 'three';
import { AudioManager } from './audio.js';
import { FollowCamera } from './camera.js';
import { Input } from './input.js';
import { LivingRoom, ROOM } from './livingRoom.js';
import { CharacterBody } from './physics.js';
import { Puck } from './puck.js';

// ---------- Setup ----------

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('is-touch', isTouch);

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false; // statische schaduwen: alleen verversen als er iets verandert
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 80);

const level = new LivingRoom(scene, { quality: isTouch ? 'medium' : 'high' });
renderer.shadowMap.needsUpdate = true;

const puck = new Puck();
scene.add(puck.root);

// Zachte "blob"-schaduw onder Puck (goedkoop en handig om sprongen in te schatten)
const blob = new THREE.Mesh(
  new THREE.CircleGeometry(0.13, 16),
  new THREE.MeshBasicMaterial({ color: 0x3b2a1e, transparent: true, opacity: 0.3, depthWrite: false }),
);
blob.rotation.x = -Math.PI / 2;
blob.renderOrder = 1;
scene.add(blob);

const body = new CharacterBody(level.colliders);
const roomBounds = {
  minX: ROOM.minX + 0.15,
  maxX: ROOM.maxX - 0.15,
  minZ: ROOM.minZ + 0.15,
  maxZ: ROOM.maxZ - 0.15,
  minY: 0.12,
  maxY: ROOM.height - 0.15,
};
const followCam = new FollowCamera(camera, { ...roomBounds }, level.colliders);
const input = new Input(renderer.domElement, { isTouch });
const audio = new AudioManager();
input.onFirstInteraction = () => audio.unlock();

// ---------- HUD ----------

const hud = document.getElementById('hud');
const touchUI = document.getElementById('touch-ui');
const nutCountEl = document.getElementById('nut-count');
const nutCounter = document.getElementById('nut-counter');
const nutTotalEl = document.querySelector('.nut-total');
const toastEl = document.getElementById('toast');
const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const endStats = document.getElementById('end-stats');
document.getElementById('loading').remove();

const TOTAL = level.nuts.length;
nutTotalEl.textContent = `/ ${TOTAL}`;

let toastTimer = 0;
function toast(text, seconds = 3) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  toastTimer = seconds;
}

function setCount(n) {
  nutCountEl.textContent = n;
  nutCounter.classList.remove('bump');
  void nutCounter.offsetWidth; // animatie opnieuw starten
  nutCounter.classList.add('bump');
}

// ---------- Effecten ----------

function emojiTexture(emoji) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = '52px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 32, 36);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const heartTex = emojiTexture('❤️');
const sparkleTex = emojiTexture('✨');
const particles = [];

function burst(tex, pos, count, spread = 0.25) {
  for (let i = 0; i < count; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.position.copy(pos);
    s.scale.setScalar(0.12);
    scene.add(s);
    particles.push({
      sprite: s,
      vel: new THREE.Vector3((Math.random() - 0.5) * spread * 4, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * spread * 4),
      life: 1.1 + Math.random() * 0.4,
      age: 0,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    p.sprite.position.addScaledVector(p.vel, dt);
    p.vel.multiplyScalar(1 - dt * 1.5);
    const t = p.age / p.life;
    p.sprite.material.opacity = 1 - t;
    p.sprite.scale.setScalar(0.12 + t * 0.06);
    if (t >= 1) {
      scene.remove(p.sprite);
      p.sprite.material.dispose();
      particles.splice(i, 1);
    }
  }
}

// Nootjesradar: lichtzuil boven het dichtstbijzijnde nootje
const beacon = new THREE.Mesh(
  new THREE.CylinderGeometry(0.1, 0.1, 3, 10, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
);
beacon.visible = false;
scene.add(beacon);
let radarTime = 0;
let radarNut = null;

// Vliegende nootjes na het oppakken
const flying = [];

// ---------- Spelstatus ----------

const state = {
  mode: 'start', // start | play | end
  found: 0,
  time: 0,
  sinceLastFind: 0,
  hintGiven: false,
  boxVisits: 0,
};
let insideBox = null;

function resetGame() {
  level.reset();
  renderer.shadowMap.needsUpdate = true;
  state.found = 0;
  state.time = 0;
  state.sinceLastFind = 0;
  state.boxVisits = 0;
  nutCountEl.textContent = '0';
  body.teleport(level.spawn, level.spawnYaw);
  followCam.bounds = { ...roomBounds };
  followCam.pitch = 0.35;
  followCam.snap(new THREE.Vector3(level.spawn.x, 0.3, level.spawn.z), level.spawnYaw + Math.PI);
  radarTime = 0;
  beacon.visible = false;
  insideBox = null;
}

function startGame() {
  audio.unlock();
  startScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  if (isTouch) touchUI.classList.remove('hidden');
  state.mode = 'play';
  input.enabled = true;
  toast(isTouch ? 'Zoek de 10 nootjes! 🥜' : 'Zoek de 10 nootjes! Klik in beeld om de muis te gebruiken.', 4);
}

function finishLevel() {
  state.mode = 'end';
  input.enabled = false;
  input.releasePointer();
  hud.classList.add('hidden');
  touchUI.classList.add('hidden');
  const m = Math.floor(state.time / 60);
  const s = Math.floor(state.time % 60).toString().padStart(2, '0');
  endStats.textContent = `Tijd: ${m}:${s} · Dozen bezocht: ${state.boxVisits} van ${level.boxes.length}`;
  endScreen.classList.remove('hidden');
}

document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('restart-button').addEventListener('click', () => {
  resetGame();
  startGame();
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') toast(audio.toggleMute() ? 'Geluid uit 🔇' : 'Geluid aan 🔊', 1.5);
  if ((e.code === 'Enter' || e.code === 'Space') && state.mode === 'start') startGame();
});

// ---------- Gameplay ----------

const tmpV = new THREE.Vector3();
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const wish = new THREE.Vector3();
const puckCenter = new THREE.Vector3();

function nearestNut(from) {
  let best = null;
  let bestD = Infinity;
  for (const n of level.nuts) {
    if (n.found) continue;
    const d = n.base.distanceToSquared(from);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

function collectNuts() {
  puckCenter.set(body.pos.x, body.pos.y + 0.17, body.pos.z);
  for (const n of level.nuts) {
    if (n.found) continue;
    const dx = n.group.position.x - puckCenter.x;
    const dy = n.group.position.y - puckCenter.y;
    const dz = n.group.position.z - puckCenter.z;
    if (dx * dx + dz * dz < 0.3 * 0.3 && Math.abs(dy) < 0.3) {
      n.found = true;
      state.found++;
      state.sinceLastFind = 0;
      state.hintGiven = false;
      setCount(state.found);
      audio.play('nut');
      puck.cheer(0.8);
      burst(sparkleTex, n.group.position, 6);
      flying.push({ nut: n, t: 0 });
      if (radarNut === n) {
        radarTime = 0;
        beacon.visible = false;
      }

      if (state.found === TOTAL) {
        setTimeout(() => {
          audio.play('level-complete');
          toast('Alle nootjes gevonden! 🎉 De deur naar buiten gaat open!', 5);
          level.openDoor();
          followCam.bounds.maxX = ROOM.maxX + 3;
        }, 500);
      } else {
        const left = TOTAL - state.found;
        toast(`Nootje gevonden ${n.where}! Nog ${left} te gaan.`, 2.5);
      }
    }
  }
}

function checkBoxes() {
  const box = level.boxAt(body.pos);
  if (box && box !== insideBox) {
    audio.play('box');
    puck.cheer(1.6);
    burst(heartTex, tmpV.set(body.pos.x, body.pos.y + 0.4, body.pos.z), 5, 0.12);
    if (!box.visited) {
      box.visited = true;
      state.boxVisits++;
      const target = nearestNut(body.pos);
      if (target) {
        radarNut = target;
        radarTime = 12;
        beacon.visible = true;
        toast('Knus! Bonus: nootjesradar! Volg de lichtstraal ✨', 3.5);
      } else {
        toast('Heerlijk knus in de doos! 📦', 2.5);
      }
    } else {
      toast('Nog steeds een fijne doos 📦', 1.5);
    }
  }
  insideBox = box;
  // In een doos kijkt de camera van bovenaf mee
  followCam.minPitch = box ? 0.95 : -0.25;
}

function updateFlyingNuts(dt) {
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i];
    f.t += dt * 2.5;
    const g = f.nut.group;
    g.position.lerp(tmpV.set(body.pos.x, body.pos.y + 0.35, body.pos.z), Math.min(1, dt * 10));
    g.scale.setScalar(Math.max(0.01, 1 - f.t));
    g.rotation.y += dt * 12;
    if (f.t >= 1) {
      g.visible = false;
      flying.splice(i, 1);
    }
  }
}

function update(dt) {
  state.time += dt;
  state.sinceLastFind += dt;

  // Camera draaien
  const look = input.consumeLook();
  followCam.rotate(look.x, look.y);

  // Looprichting t.o.v. de camera
  const move = input.poll();
  followCam.forward(fwd);
  right.set(-fwd.z, 0, fwd.x);
  wish.set(0, 0, 0).addScaledVector(fwd, move.y).addScaledVector(right, move.x);

  if (input.consumeHop()) body.requestHop();
  body.update(dt, wish);

  if (body.events.hopped) audio.play('hop', { volume: 0.7 });
  if (body.events.landed > 2) puck.land(body.events.landed);

  // Puck-model volgen
  puck.root.position.copy(body.pos);
  puck.root.rotation.y = body.yaw;
  puck.update(dt, { speed: body.speed, grounded: body.grounded, climbing: body.climbing, vy: body.vel.y });

  // Blob-schaduw op de grond eronder
  const gh = body.groundHeight(body.pos.y + 0.01);
  const h = body.pos.y - gh;
  blob.position.set(body.pos.x, gh + 0.006, body.pos.z);
  const bs = Math.max(0.4, 1 - h * 0.8);
  blob.scale.setScalar(bs);
  blob.material.opacity = 0.3 * bs;

  collectNuts();
  checkBoxes();
  updateFlyingNuts(dt);

  // Radar
  if (radarTime > 0) {
    radarTime -= dt;
    if (radarNut && !radarNut.found) {
      beacon.position.set(radarNut.base.x, radarNut.base.y + 1.5, radarNut.base.z);
      beacon.material.opacity = 0.25 + Math.sin(state.time * 6) * 0.1;
    }
    if (radarTime <= 0) beacon.visible = false;
  }

  // Tip na een tijdje niets vinden
  if (!state.hintGiven && state.sinceLastFind > 50 && state.found < TOTAL) {
    const n = nearestNut(body.pos);
    if (n) toast(`Tip: kijk eens ${n.where}…`, 4);
    state.hintGiven = true;
  }

  // Naar buiten = level voltooid
  if (level.doorOpen > 0.6 && body.pos.x > ROOM.maxX + 0.35) finishLevel();

  // Camera volgen
  followCam.update(dt, tmpV.set(body.pos.x, body.pos.y + 0.3, body.pos.z));
}

// ---------- Hoofdlus ----------

const timer = new THREE.Timer();
timer.connect(document);
let elapsed = 0;
let perfTime = 0;
let perfFrames = 0;

resetGame();

function frame(timestamp) {
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 1 / 20);
  elapsed += dt;

  if (state.mode === 'play') {
    update(dt);
  } else {
    // Rustig ronddraaiende camera in het menu
    followCam.yaw += dt * 0.15;
    puck.update(dt, { speed: 0, grounded: true, climbing: false, vy: 0 });
    followCam.update(dt);
  }

  if (level.update(dt, elapsed)) renderer.shadowMap.needsUpdate = true;
  updateParticles(dt);

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl.classList.remove('show');
  }

  // Automatisch de resolutie verlagen als het niet soepel loopt
  perfTime += dt;
  perfFrames++;
  if (perfTime > 2) {
    const fps = perfFrames / perfTime;
    if (fps < 45 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
    }
    perfTime = 0;
    perfFrames = 0;
  }

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = camera.aspect < 1 ? 72 : 60;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
onResize();

// Debug-hulpje in de console
window.__puck = { body, level, state, cam: followCam };
