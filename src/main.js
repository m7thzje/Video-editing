import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Bakery, INGREDIENTS } from './areas/bakery.js';
import { Gallery } from './areas/gallery.js';
import { Outside, STONE_TARGET_TIME } from './areas/outside.js';
import { PistachioHouse } from './areas/pistachioHouse.js';
import { PuckHouse } from './areas/puckHouse.js';
import { AudioManager } from './audio.js';
import { FollowCamera } from './camera.js';
import { Input } from './input.js';
import { CharacterBody, DEFAULT_HOP } from './physics.js';
import { Puck } from './puck.js';
import { SongGame } from './songGame.js';
import { vuurdraakCardCanvas } from './textures.js';
import { fxTime } from './world/fx.js';

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
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 250);

// Gloed (bloom) op alles wat glimt; valt automatisch weg op trage apparaten
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.5, 0.55, 0.8);
composer.addPass(bloom);
composer.addPass(new OutputPass());
let bloomOn = true;
let baseFov = 60;

const quality = isTouch ? 'medium' : 'high';
const areas = {
  puckhuis: new PuckHouse({ quality }),
  galerij: new Gallery({ quality }),
  pistachehuis: new PistachioHouse({ quality }),
  buiten: new Outside({ quality }),
  bakkerij: new Bakery({ quality }),
};
Object.values(areas).forEach((a) => scene.add(a.group));
let area = null;

const puck = new Puck();
scene.add(puck.root);

// Zachte "blob"-schaduw onder Puck
const blob = new THREE.Mesh(
  new THREE.CircleGeometry(0.13, 16),
  new THREE.MeshBasicMaterial({ color: 0x3b2a1e, transparent: true, opacity: 0.3, depthWrite: false }),
);
blob.rotation.x = -Math.PI / 2;
blob.renderOrder = 1;
scene.add(blob);

const body = new CharacterBody([]);
const followCam = new FollowCamera(camera, null, []);
const input = new Input(renderer.domElement, { isTouch });
const audio = new AudioManager();
input.onFirstInteraction = () => audio.unlock();

// ---------- Voortgang (opgeslagen in de browser) ----------

const STARS = [
  { id: 'pistache', icon: '🥜', name: 'Pistachehuis', desc: 'Pik de 10 pistachenootjes van de buurvrouw, zonder dat ze je ziet' },
  { id: 'veren', icon: '🪶', name: 'Verenjacht', desc: 'Vind 8 rode veren in de buurt' },
  { id: 'stenen', icon: '🪨', name: 'Stapstenen', desc: `Steek de vijver over binnen ${STONE_TARGET_TIME} seconden` },
  { id: 'merel', icon: '🎵', name: 'Merel-liedjes', desc: 'Zing 3 liedjes van de merel na' },
  { id: 'koek', icon: '🍪', name: 'Groninger koek', desc: 'Breng oma Moi de 5 ingrediënten voor Groninger koek' },
];
const SECRETS = {
  portret: 'Het schilderij bij de buren',
  tv: 'Puck op tv',
  letterbord: 'Het letterbord',
  koekje: 'Een koekje!',
  spiegel: 'De spiegels in de gang',
  sigaret: 'Stoer sigaretje',
  kaart: 'Zeldzaam vuurdraak-kaartje',
  goud: 'De gouden pistache',
  kabouter: 'De tuinkabouter',
  eend: 'Het badeendje',
  vliegen: 'Vliegen? Nee hoor!',
  dans: 'Puck danst',
  deurmat: 'De WEG-deurmat van de buurvrouw',
  martini: 'Uitzicht op de Martinitoren',
  fietsbel: 'Tring tring!',
  eierbal: 'Een echte Groningse eierbal',
};
const SAVE_KEY = 'puck-avontuur-v2';

function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (p && p.stars && p.secrets) return p;
  } catch {
    /* geen opslag beschikbaar */
  }
  return { stars: {}, secrets: {}, best: null, hat: null, items: {} };
}
let progress = loadProgress();
progress.items = progress.items || {};
// Al verzamelde ingrediënten niet opnieuw neerleggen
areas.buiten.collectibles.forEach((c) => {
  if (c.type === 'ingredient' && progress.items[c.id]) {
    c.found = true;
    c.group.visible = false;
  }
});
function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    /* privé-venster o.i.d. */
  }
}
const allStars = () => STARS.every((s) => progress.stars[s.id]);

// ---------- HUD ----------

const $ = (id) => document.getElementById(id);
const hud = $('hud');
const touchUI = $('touch-ui');
const counterEl = $('counter');
const toastEl = $('toast');
const speechEl = $('speech');
const promptEl = $('prompt');
const actionBtn = $('action-button');
const powerEl = $('power');
const powerFill = $('power-fill');
const fadeEl = $('fade');
const menuEl = $('menu');
$('loading').remove();
$('star-total').textContent = STARS.length;

const PISTACHIO_ICON =
  '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="21" rx="16" ry="11" fill="#dcc79b" stroke="#6b4423" stroke-width="2.5" transform="rotate(-20 20 21)"/><ellipse cx="23" cy="17" rx="8" ry="5" fill="#93c24a" transform="rotate(-20 23 17)"/></svg>';

let toastTimer = 0;
function toast(text, seconds = 3) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  toastTimer = seconds;
}

let speechTimer = 0;
function say(text, { seconds = 2.6, sound = 'talk' } = {}) {
  speechEl.textContent = text;
  speechEl.classList.remove('hidden');
  speechTimer = seconds;
  if (sound) audio.play(sound);
}

let counterKey = '';
function setCounter(key, html) {
  if (counterKey === key) return;
  const bump = counterKey.split(':')[0] === key.split(':')[0];
  counterKey = key;
  counterEl.innerHTML = html;
  if (bump) {
    counterEl.classList.remove('bump');
    void counterEl.offsetWidth;
    counterEl.classList.add('bump');
  }
}

function updateStarHud() {
  $('star-count').textContent = STARS.filter((s) => progress.stars[s.id]).length;
}

function applyHat() {
  puck.setHat(allStars() ? 'kroon' : progress.hat);
}

function award(id) {
  const star = STARS.find((s) => s.id === id);
  if (progress.stars[id]) {
    toast(`${star.icon} ${star.name}: nog een keer gelukt! Knap hoor.`, 3);
    audio.play('level-complete');
    return;
  }
  progress.stars[id] = true;
  saveProgress();
  updateStarHud();
  audio.play('star');
  setTimeout(() => audio.play('level-complete'), 400);
  burst(starTex, tmpV.set(body.pos.x, body.pos.y + 0.4, body.pos.z), 10, 0.3);
  confettiBurst(tmpV.set(body.pos.x, body.pos.y + 0.3, body.pos.z), 60);
  shockwave(tmpV.set(body.pos.x, body.pos.y + 0.02, body.pos.z), 0xffd84a, 3);
  const n = STARS.filter((s) => progress.stars[s.id]).length;
  banner('⭐ STER! ⭐', `${star.icon} ${star.name} (${n}/${STARS.length})`);
  flashScreen();
  if (n === STARS.length) {
    applyHat();
    toast('Alle sterren verdiend! Puck is de koning van de buurt 👑', 6);
    setTimeout(() => say('Watskebeurt? Ik ben de koning!'), 1200);
  } else {
    toast(`⭐ Ster verdiend: ${star.name}! (${n}/${STARS.length})`, 4);
  }
}

function secret(id) {
  if (progress.secrets[id]) return false;
  progress.secrets[id] = true;
  saveProgress();
  audio.play('secret');
  flashScreen();
  const n = Object.keys(SECRETS).filter((k) => progress.secrets[k]).length;
  unlock('🥚', 'GEHEIMPJE!', `${SECRETS[id]} (${n}/${Object.keys(SECRETS).length})`, {
    image: id === 'kaart' ? cardImage() : null,
    sound: null,
  });
  return true;
}

// ---------- Effecten ----------

function flashScreen() {
  const f = $('flash');
  f.classList.remove('on');
  void f.offsetWidth;
  f.classList.add('on');
}

let cardDataUrl = null;
function cardImage() {
  if (!cardDataUrl) cardDataUrl = vuurdraakCardCanvas().toDataURL();
  return cardDataUrl;
}

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
const starTex = emojiTexture('⭐');
const dropTex = emojiTexture('💧');
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

// Schokgolf-ring op de grond
const rings = [];
const ringGeo = new THREE.RingGeometry(0.8, 1, 32);
ringGeo.rotateX(-Math.PI / 2);
function shockwave(pos, color = 0xfff1a8, size = 1) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.copy(pos);
  m.scale.setScalar(0.05);
  scene.add(m);
  rings.push({ m, age: 0, size });
}

// Confetti
const confetti = [];
const confettiGeo = new THREE.PlaneGeometry(0.05, 0.08);
const confettiColors = [0xd7263d, 0xf2c230, 0x3d9be0, 0x6ac46b, 0xe86fb4, 0xff9f43, 0xffffff];
function confettiBurst(pos, count = 40) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(confettiGeo, new THREE.MeshBasicMaterial({ color: confettiColors[i % confettiColors.length], side: THREE.DoubleSide, transparent: true }));
    m.position.copy(pos);
    scene.add(m);
    const a = Math.random() * Math.PI * 2;
    const sp = 1 + Math.random() * 2;
    confetti.push({ m, vel: new THREE.Vector3(Math.cos(a) * sp, 3 + Math.random() * 2.5, Math.sin(a) * sp), spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, 0), age: 0 });
  }
}

// Stofwolkjes bij landen en rennen
const puffTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,250,240,0.9)');
  g.addColorStop(1, 'rgba(255,250,240,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
})();
const puffs = [];
function dustPuff(pos, count = 5, spread = 1) {
  for (let i = 0; i < count; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0.8 }));
    s.position.set(pos.x, pos.y + 0.03, pos.z);
    s.scale.setScalar(0.08);
    scene.add(s);
    const a = Math.random() * Math.PI * 2;
    puffs.push({ s, vel: new THREE.Vector3(Math.cos(a) * 0.6 * spread, 0.25, Math.sin(a) * 0.6 * spread), age: 0 });
  }
}

function updateJuice(dt) {
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.age += dt;
    const t = r.age / 0.6;
    r.m.scale.setScalar(0.05 + t * 0.9 * r.size);
    r.m.material.opacity = 0.9 * (1 - t);
    if (t >= 1) {
      scene.remove(r.m);
      r.m.material.dispose();
      rings.splice(i, 1);
    }
  }
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.age += dt;
    c.vel.y -= 6 * dt;
    c.vel.multiplyScalar(1 - dt * 1.2);
    c.m.position.addScaledVector(c.vel, dt);
    c.m.rotation.x += c.spin.x * dt;
    c.m.rotation.y += c.spin.y * dt;
    c.m.material.opacity = Math.min(1, 2.6 - c.age);
    if (c.age > 2.6) {
      scene.remove(c.m);
      c.m.material.dispose();
      confetti.splice(i, 1);
    }
  }
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i];
    p.age += dt;
    p.s.position.addScaledVector(p.vel, dt);
    p.vel.multiplyScalar(1 - dt * 3);
    const t = p.age / 0.7;
    p.s.scale.setScalar(0.08 + t * 0.18);
    p.s.material.opacity = 0.8 * (1 - t);
    if (t >= 1) {
      scene.remove(p.s);
      p.s.material.dispose();
      puffs.splice(i, 1);
    }
  }
}

const bannerEl = $('banner');
function banner(title, sub) {
  bannerEl.innerHTML = `<div class="banner-rays"></div><div class="banner-title">${title}</div><div class="banner-sub">${sub}</div>`;
  bannerEl.classList.remove('show');
  void bannerEl.offsetWidth;
  bannerEl.classList.add('show');
}

// Grote "vrijgespeeld!"-pop-up met stralen en confetti
const unlockEl = $('unlock');
const unlockQueue = [];
let unlockBusy = false;
function unlock(icon, title, sub, { image = null, sound = 'secret' } = {}) {
  unlockQueue.push({ icon, title, sub, image, sound });
  if (!unlockBusy) nextUnlock();
}
function nextUnlock() {
  const u = unlockQueue.shift();
  if (!u) {
    unlockBusy = false;
    return;
  }
  unlockBusy = true;
  const visual = u.image ? `<img class="unlock-img" src="${u.image}" alt="">` : `<div class="unlock-icon">${u.icon}</div>`;
  unlockEl.innerHTML = `<div class="banner-rays"></div>${visual}<div class="unlock-title">${u.title}</div><div class="unlock-sub">${u.sub}</div>`;
  unlockEl.classList.remove('show');
  void unlockEl.offsetWidth;
  unlockEl.classList.add('show');
  if (u.sound) audio.play(u.sound);
  confettiBurst(tmpV.set(body.pos.x, body.pos.y + 0.3, body.pos.z), 30);
  shockwave(tmpV.set(body.pos.x, body.pos.y + 0.02, body.pos.z), 0xfff1a8, 2);
  setTimeout(nextUnlock, u.image ? 2600 : 2000);
}

const inventoryEl = $('inventory');
function updateInventory() {
  const have = INGREDIENTS.filter((i) => progress.items[i.id]);
  const done = progress.stars.koek;
  inventoryEl.classList.toggle('hidden', !have.length || done);
  inventoryEl.innerHTML = `<span class="inv-label">Voor oma Moi:</span>` +
    INGREDIENTS.map((i) => `<span class="inv-item ${progress.items[i.id] ? 'have' : ''}" title="${i.name}">${i.icon}</span>`).join('');
}

// Pistacheradar (bonus uit de kartonnen dozen)
const beacon = new THREE.Mesh(
  new THREE.CylinderGeometry(0.1, 0.1, 3, 10, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xb6e36a, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
);
beacon.visible = false;
scene.add(beacon);
let radarTime = 0;
let radarItem = null;

// ---------- Spelstatus ----------

const state = {
  mode: 'start', // start | play | menu
  frozen: false,
  transitioning: false,
  portalLock: true,
  insideBox: null,
  zonesInside: new Set(),
  activeZone: null,
  powerTime: 0,
  beakTime: 0,
  airHops: 0,
  tapCount: 0,
  tapTimer: 0,
  idleTalk: 14,
  time: 0,
};

const song = new SongGame({
  audio,
  toast,
  onWin: () => award('merel'),
  onEnd: () => (state.frozen = false),
});

const visited = {};

function enterArea(name, spawnName, { instant = false } = {}) {
  const doSwitch = () => {
    if (area) {
      area.exit();
      if (area.stopStoneRun) area.stopStoneRun();
    }
    area = areas[name];
    area.enter();
    body.colliders = area.colliders;
    followCam.colliders = area.colliders;
    followCam.bounds = area.cameraBounds;
    followCam.distance = area.cameraDistance;
    scene.background = area.background;
    scene.fog = area.fog;
    const sp = area.spawns[spawnName];
    body.teleport(sp.pos, sp.yaw);
    followCam.pitch = 0.35;
    followCam.snap(tmpV.set(sp.pos.x, sp.pos.y + 0.3, sp.pos.z), sp.camYaw ?? sp.yaw + Math.PI);
    state.portalLock = true;
    state.insideBox = null;
    state.zonesInside.clear();
    radarTime = 0;
    beacon.visible = false;
    renderer.shadowMap.needsUpdate = true;
    onAreaEntered(name);
  };
  if (instant) return doSwitch();
  state.transitioning = true;
  const lift = (area?.name === 'galerij' && name === 'buiten') || (area?.name === 'buiten' && name === 'galerij');
  fadeEl.textContent = lift ? (name === 'buiten' ? '🛗 Lift gaat naar beneden… Ding! Begane grond' : '🛗 Lift gaat omhoog… Ding! 9e verdieping') : '';
  fadeEl.classList.add('on');
  audio.play(lift ? 'checkpoint' : 'door');
  setTimeout(
    () => {
      doSwitch();
      setTimeout(() => {
        fadeEl.classList.remove('on');
        state.transitioning = false;
      }, lift ? 700 : 80);
    },
    lift ? 900 : 260,
  );
}

function onAreaEntered(name) {
  if (state.mode === 'start') return;
  const first = !visited[name];
  visited[name] = true;
  if (name === 'galerij' && first) {
    toast('De galerij op de 9e! Nr. 93 is de buurvrouw (Pistachehuis). Aan het eind gaat de lift naar beneden.', 5);
  } else if (name === 'buiten' && first) {
    toast('Moi! Welkom in Groningen ⭐ Bakkerij Moi, de vijver, de merel en rode veren wachten op je.', 5);
  } else if (name === 'bakkerij') {
    toast(progress.stars.koek ? 'Bakkerij Moi ruikt naar vers gebakken koek 🍪' : 'Bakkerij Moi! Praat met oma Moi achter de toonbank.', 3.5);
  } else if (name === 'pistachehuis') {
    const left = area.pistachios.filter((c) => !c.found).length;
    toast(
      left
        ? `Het Pistachehuis! Nog ${left} pistachenootjes… maar pas op voor de chagrijnige buurvrouw. Blijf uit haar zicht (verstop je in een doos)!`
        : 'Alle pistachenootjes zijn al op. Lekker! (De buurvrouw is nog steeds chagrijnig.)',
      5,
    );
  } else if (name === 'puckhuis' && !first) {
    toast('Weer thuis! 🏠', 2);
  }
}

function startGame() {
  if (state.mode !== 'start') return;
  audio.unlock();
  $('start-screen').classList.add('hidden');
  hud.classList.remove('hidden');
  if (isTouch) touchUI.classList.remove('hidden');
  state.mode = 'play';
  input.enabled = true;
  visited.puckhuis = true;
  updateStarHud();
  applyHat();
  setTimeout(() => say('Hallo!', { sound: 'puck-hallo' }), 600);
  setTimeout(() => say('Watskebeurt?'), 3600);
  toast('Welkom thuis op de 9e verdieping, Puck! Loop door de gang naar de voordeur en de galerij op.', 5);
  updateInventory();
}

function openMenu() {
  if (state.mode !== 'play') return;
  state.mode = 'menu';
  input.releasePointer();
  const list = $('quest-list');
  list.innerHTML = '';
  STARS.forEach((s) => {
    const li = document.createElement('li');
    const done = progress.stars[s.id];
    li.className = done ? 'done' : '';
    const extra = s.id === 'stenen' && progress.best ? ` — beste tijd ${progress.best.toFixed(1)} s` : '';
    li.textContent = `${done ? '⭐' : '☆'} ${s.icon} ${s.name}: ${s.desc}${extra}`;
    list.appendChild(li);
  });
  const found = Object.keys(SECRETS).filter((k) => progress.secrets[k]);
  $('secret-line').textContent = `🥚 Geheimpjes: ${found.length}/${Object.keys(SECRETS).length}${found.length ? ' — ' + found.map((k) => SECRETS[k]).join(', ') : ''}`;
  $('menu-sound').textContent = `Geluid: ${audio.muted ? 'uit' : 'aan'}`;
  menuEl.classList.remove('hidden');
}

function closeMenu() {
  menuEl.classList.add('hidden');
  state.mode = 'play';
}

$('start-button').addEventListener('click', startGame);
$('menu-button').addEventListener('click', openMenu);
$('stars').addEventListener('click', openMenu);
$('menu-resume').addEventListener('click', closeMenu);
$('menu-sound').addEventListener('click', () => {
  audio.toggleMute();
  $('menu-sound').textContent = `Geluid: ${audio.muted ? 'uit' : 'aan'}`;
});
$('menu-reset').addEventListener('click', () => {
  if (!confirm('Weet je het zeker? Alle sterren en geheimpjes worden gewist.')) return;
  progress = { stars: {}, secrets: {}, best: null, hat: null, items: {} };
  saveProgress();
  location.reload();
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') toast(audio.toggleMute() ? 'Geluid uit 🔇' : 'Geluid aan 🔊', 1.5);
  if ((e.code === 'Enter' || e.code === 'Space') && state.mode === 'start') startGame();
  if (e.code === 'Escape' && state.mode === 'menu') closeMenu();
  else if ((e.code === 'KeyP' || e.code === 'Escape') && state.mode === 'play' && !document.pointerLockElement) openMenu();
});

// Tikken op Puck: hij praat terug, en 5x snel tikken laat hem dansen
const raycaster = new THREE.Raycaster();
const tapSphere = new THREE.Sphere(new THREE.Vector3(), 0.3);
input.onTap = (x, y) => {
  if (state.mode !== 'play') return;
  raycaster.setFromCamera({ x: (x / window.innerWidth) * 2 - 1, y: -(y / window.innerHeight) * 2 + 1 }, camera);
  tapSphere.center.set(body.pos.x, body.pos.y + 0.2, body.pos.z);
  if (!raycaster.ray.intersectsSphere(tapSphere)) return;
  state.tapCount++;
  state.tapTimer = 2;
  if (state.tapCount >= 5) {
    state.tapCount = 0;
    puck.dance(8);
    audio.playLong('puck-dans');
    say('We gaan doen wat we doen! 🎶', { seconds: 4, sound: null });
    secret('dans');
  } else {
    // Afwisselend een zinnetje of een krijsje
    if (state.tapCount % 2) say(Math.random() < 0.5 ? 'Watskebeurt?' : 'Mag ik een koekje?');
    else say(['Kraa!', 'Fiieuw!', 'Hihi!'][Math.floor(Math.random() * 3)], { sound: 'chirp', seconds: 1.4 });
    puck.cheer(0.6);
  }
};

// ---------- Gameplay ----------

const tmpV = new THREE.Vector3();
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const wish = new THREE.Vector3();
const center = new THREE.Vector3();
const flying = [];

function eat() {
  audio.play('puck-lekker');
  say('Lekker!', { sound: null, seconds: 1.6 });
}

function collect() {
  center.set(body.pos.x, body.pos.y + 0.17, body.pos.z);
  for (const c of area.collectibles) {
    if (c.found) continue;
    const p = c.group.position;
    const dx = p.x - center.x;
    const dz = p.z - center.z;
    if (dx * dx + dz * dz > 0.32 * 0.32 || Math.abs(p.y - center.y) > 0.32) continue;
    c.found = true;
    c.timer = 45;
    flying.push({ item: c, t: 0 });
    burst(sparkleTex, p, 8);
    shockwave(tmpV.set(p.x, body.pos.y + 0.02, p.z), c.type === 'veer' ? 0xff8a8a : c.type === 'patat' ? 0xffc34a : 0xd8f59a, 1.2);
    if (radarItem === c) {
      radarTime = 0;
      beacon.visible = false;
    }
    onCollect(c);
  }
}

function onCollect(c) {
  switch (c.type) {
    case 'pistache': {
      audio.play('nut');
      eat();
      puck.cheer(0.8);
      const all = area.pistachios;
      const got = all.filter((x) => x.found).length;
      if (got === all.length) setTimeout(() => award('pistache'), 500);
      else toast(`Pistache gevonden ${c.where}! Nog ${all.length - got} te gaan.`, 2.5);
      break;
    }
    case 'veer': {
      audio.play('feather');
      puck.cheer(0.8);
      const all = area.feathers;
      const got = all.filter((x) => x.found).length;
      if (got === all.length) setTimeout(() => award('veren'), 400);
      else toast(`Rode veer gevonden ${c.where}! (${got}/${all.length})`, 2.5);
      break;
    }
    case 'patat':
      audio.play('fries');
      confettiBurst(tmpV.set(body.pos.x, body.pos.y + 0.3, body.pos.z), 20);
      eat();
      state.powerTime = 15;
      toast('🍟 Patat-power! Supersnel en superhoog hoppen!', 3);
      break;
    case 'koekje':
      eat();
      secret('koekje');
      break;
    case 'eierbal':
      audio.play('fries');
      eat();
      state.powerTime = 15;
      toast('🥚 Eierbal-power! Supersnel en superhoog hoppen!', 3);
      secret('eierbal');
      break;
    case 'ingredient': {
      const ing = INGREDIENTS.find((i) => i.id === c.id);
      progress.items[c.id] = true;
      saveProgress();
      updateInventory();
      const n = INGREDIENTS.filter((i) => progress.items[i.id]).length;
      unlock(ing.icon, 'NIEUW ITEM!', `${ing.name} (${n}/${INGREDIENTS.length}) — breng het naar oma Moi`, { sound: 'feather' });
      if (n === INGREDIENTS.length) setTimeout(() => toast('Alles compleet! Breng de ingrediënten naar Bakkerij Moi 🍪', 4), 2200);
      break;
    }
    case 'goud':
      audio.play('star');
      say('Watskebeurt? Goud!');
      secret('goud');
      break;
    case 'sigaret':
    case 'kaart':
      puck.setBeakItem(c.type);
      state.beakTime = 20;
      say(c.type === 'sigaret' ? 'Watskebeurt? Stoer hè!' : 'Vuurdraak, 150 HP! 🔥');
      secret(c.type);
      break;
  }
}

function updateFlying(dt) {
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i];
    f.t += dt * 2.5;
    const g = f.item.group;
    f.item.flying = true;
    g.position.lerp(tmpV.set(body.pos.x, body.pos.y + 0.35, body.pos.z), Math.min(1, dt * 10));
    g.scale.setScalar(Math.max(0.01, 1 - f.t));
    g.rotation.y += dt * 12;
    if (f.t >= 1) {
      g.visible = false;
      f.item.flying = false;
      flying.splice(i, 1);
    }
  }
}

function checkBoxes() {
  if (!area.boxAt) {
    followCam.minPitch = -0.25;
    return;
  }
  const box = area.boxAt(body.pos);
  if (box && box !== state.insideBox) {
    audio.play('box');
    say('Watskebeurt?', { sound: null });
    puck.cheer(1.6);
    burst(heartTex, tmpV.set(body.pos.x, body.pos.y + 0.4, body.pos.z), 5, 0.12);
    if (!box.visited) {
      box.visited = true;
      const target = area.pistachios
        .filter((c) => !c.found)
        .sort((a, b) => a.base.distanceToSquared(body.pos) - b.base.distanceToSquared(body.pos))[0];
      if (target) {
        radarItem = target;
        radarTime = 12;
        beacon.visible = true;
        toast('Knus! Bonus: pistacheradar! Volg de groene lichtstraal ✨', 3.5);
      } else {
        toast('Heerlijk knus in de doos! 📦', 2.5);
      }
    }
  }
  state.insideBox = box;
  // In een doos kijkt de camera van bovenaf mee
  followCam.minPitch = box ? 0.95 : -0.25;
}

const GRUMBLES = ['Hé… wie is daar?', 'Hmpf! Hoor ik iets?', 'Is daar iemand?', 'Wat was dat?'];
const SCOLDS = ['Hé! Wegwezen, rotvogel!', 'Eruit, jij! En blijf eruit!', 'Mijn pistachenootjes! Eruit!', 'Ksst! Naar buiten, jij!'];

function updateNeighbor(dt) {
  if (!area.updateNeighbor || state.transitioning || state.caught) return;
  const res = area.updateNeighbor(dt, state.time, body.pos, !!state.insideBox);
  if (res === 'suspicious' && !state.warned) {
    state.warned = true;
    audio.play('alert');
    toast(`Buurvrouw: "${GRUMBLES[Math.floor(Math.random() * GRUMBLES.length)]}" Snel, verstop je!`, 2.2);
  } else if (!res) {
    state.warned = false;
  } else if (res === 'caught') {
    state.caught = true;
    state.frozen = true;
    audio.play('caught');
    say('Watskebeurt?!', { sound: 'chirp' });
    toast(`Buurvrouw: "${SCOLDS[Math.floor(Math.random() * SCOLDS.length)]}" Je bent buiten gezet. Blijf uit haar zicht!`, 4.5);
    setTimeout(() => {
      state.frozen = false;
      state.caught = false;
      state.warned = false;
      enterArea('galerij', 'buurvrouw');
    }, 1300);
  }
}

function inZone(z) {
  const dx = body.pos.x - z.x;
  const dz = body.pos.z - z.z;
  const y = body.pos.y;
  const zy = z.y ?? 0;
  return dx * dx + dz * dz < z.r * z.r && y > zy - 0.25 && y < zy + (z.h ?? 1);
}

function checkZones() {
  let prompt = null;
  for (const z of area.zones) {
    const inside = inZone(z);
    const was = state.zonesInside.has(z);
    if (inside && !was) {
      state.zonesInside.add(z);
      if (z.secret) secret(z.secret);
      if (z.sound) audio.play(z.sound);
      if (z.say) setTimeout(() => say(z.say), z.sound ? 350 : 0);
      if (z.hat && !allStars()) {
        progress.hat = z.hat;
        saveProgress();
        applyHat();
      }
      if (z.onEnter) z.onEnter();
      if (z.id === 'stenen-start' && !area.stoneRun.active) {
        area.startStoneRun();
        audio.play('checkpoint');
        toast(`Go! Hop over de stenen door de gele ringen naar de finish (${STONE_TARGET_TIME} s)`, 3);
      }
    } else if (!inside && was) {
      state.zonesInside.delete(z);
    }
    if (inside && z.prompt) prompt = z;
  }
  state.activeZone = prompt;
  const show = !!prompt && !song.active;
  promptEl.classList.toggle('hidden', !show || isTouch);
  actionBtn.classList.toggle('hidden', !show || !isTouch);
  if (show) promptEl.textContent = `E — ${prompt.prompt}`;
}

function interact() {
  const z = state.activeZone;
  if (!z || song.active) return;
  if (z.id === 'oma') {
    followCam.yaw = 0; // kijk naar oma achter de toonbank
    followCam.pitch = 0.55;
    talkToOma();
    return;
  }
  if (z.id === 'merel') {
    state.frozen = true;
    input.releasePointer();
    song.start();
  }
}

function talkToOma() {
  const missing = INGREDIENTS.filter((i) => !progress.items[i.id]);
  if (progress.stars.koek) {
    toast('Oma Moi: "Moi Puck! Nog een koekje? Alsjeblieft!" 🍪', 3);
    eat();
    return;
  }
  if (!state.omaMet) {
    state.omaMet = true;
    toast('Oma Moi: "Moi! Ik wil Groninger koek bakken, maar ik mis 5 dingen. Ze liggen ergens in Stad. Help je me?"', 6);
    setTimeout(() => say('Mag ik een koekje?'), 1500);
    updateInventory();
    inventoryEl.classList.remove('hidden');
    return;
  }
  if (missing.length) {
    toast(`Oma Moi: "Ik mis nog: ${missing.map((i) => `${i.icon} ${i.name}`).join(', ')}. Kijk eens ${area.name === 'bakkerij' ? 'goed rond in Stad' : ''}!"`, 5);
    return;
  }
  // Alles compleet: bakken!
  toast('Oma Moi: "Wat fijn! Even in de oven…" 🔥', 2.5);
  state.frozen = true;
  setTimeout(() => {
    state.frozen = false;
    eat();
    say('Mag ik een koekje? Lekker!');
    award('koek');
    updateInventory();
  }, 2200);
}

function updateStoneRun(dt) {
  if (!area.updateStoneRun) return;
  const res = area.updateStoneRun(dt, body.pos);
  if (res === 'checkpoint') audio.play('checkpoint');
  if (res === 'finish') {
    const t = area.stoneRun.time;
    if (!progress.best || t < progress.best) {
      progress.best = t;
      saveProgress();
    }
    if (t <= STONE_TARGET_TIME) award('stenen');
    else toast(`Finish in ${t.toFixed(1)} s — net te langzaam! Probeer het onder de ${STONE_TARGET_TIME} s.`, 4);
  }
}

function updateCounter() {
  if (area.stoneRun?.active) {
    counterEl.classList.remove('hidden');
    counterKey = 'timer';
    counterEl.textContent = `⏱ ${area.stoneRun.time.toFixed(1)} s`;
    return;
  }
  let key = null;
  let html = '';
  if (area.name === 'pistachehuis') {
    const all = area.pistachios;
    const n = all.filter((c) => c.found).length;
    key = `pistache:${n}`;
    html = `${PISTACHIO_ICON}<span>${n}</span><small>/ ${all.length}</small>`;
  } else if (area.name === 'buiten') {
    const all = area.feathers;
    const n = all.filter((c) => c.found).length;
    key = `veer:${n}`;
    html = `🪶 <span>${n}</span><small>/ ${all.length}</small>`;
  }
  counterEl.classList.toggle('hidden', !key);
  if (key) setCounter(key, html);
}

function update(dt) {
  state.time += dt;

  const look = input.consumeLook();
  followCam.rotate(look.x, look.y);

  const frozen = state.frozen || state.transitioning || puck.dancing > 0;
  const move = input.poll();
  followCam.forward(fwd);
  right.set(-fwd.z, 0, fwd.x);
  wish.set(0, 0, 0);
  if (!frozen) wish.addScaledVector(fwd, move.y).addScaledVector(right, move.x);

  const hops = input.consumeHop();
  if (hops && !frozen) {
    // Wie in de lucht blijft drukken, probeert te vliegen...
    const airborne = !body.grounded && !body.climbing;
    if (airborne) state.airHops += hops;
    if (state.airHops >= 3 && !state.flewTried) {
      state.flewTried = true;
      say('Vliegen? Nee hoor, ik loop wel!');
      secret('vliegen');
    }
    body.requestHop();
  }
  if (body.grounded && !hops) {
    state.airHops = 0;
    state.flewTried = false;
  }
  if (input.consumeInteract()) interact();

  // Patat-power
  if (state.powerTime > 0) {
    state.powerTime -= dt;
    if (state.powerTime <= 0) toast('De patat-power is op. Nog meer patat? 🍟', 2.5);
  }
  const powered = state.powerTime > 0;
  body.walkSpeed = area.walkSpeed * (powered ? 1.6 : 1);
  body.hopHeight = powered ? 1.5 : DEFAULT_HOP;
  powerEl.classList.toggle('hidden', !powered);
  if (powered) powerFill.style.width = `${(state.powerTime / 15) * 100}%`;
  puck.setPower(powered ? 1 : 0, state.time);

  body.update(dt, wish);
  if (body.events.hopped) audio.play('hop', { volume: 0.7, rate: powered ? 1.3 : 1 });
  if (body.events.landed > 2) {
    puck.land(body.events.landed);
    dustPuff(body.pos, Math.min(10, Math.round(body.events.landed * 1.5)), 1);
  }
  if (body.grounded && body.speed > 2.2 && Math.random() < dt * 6) dustPuff(body.pos, 1, 0.4);
  document.body.classList.toggle('powered', powered);
  const wantFov = baseFov + (powered ? 8 : 0);
  if (Math.abs(camera.fov - wantFov) > 0.05) {
    camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 4);
    camera.updateProjectionMatrix();
  }
  if (powered && body.speed > 0.5 && Math.random() < dt * 8) burst(sparkleTex, tmpV.set(body.pos.x, body.pos.y + 0.1, body.pos.z), 1, 0.05);

  // In het water gevallen, of uit de wereld
  const hazard = area.hazardAt(body.pos);
  if (hazard || body.pos.y < -3) {
    audio.play('splash');
    burst(dropTex, tmpV.copy(body.pos), 6, 0.3);
    const sp = hazard ? hazard.respawn : Object.values(area.spawns)[0].pos;
    body.teleport(sp, hazard ? hazard.yaw : 0);
    if (area.stoneRun?.active) {
      area.stopStoneRun();
      toast('Plons! Papegaaien zwemmen niet… Probeer het nog eens vanaf START.', 3);
    } else {
      toast('Plons! Papegaaien zwemmen niet 💦', 2);
    }
    say('Watskebeurt?!');
  }

  puck.root.position.copy(body.pos);
  puck.root.rotation.y = body.yaw;
  puck.update(dt, { speed: body.speed, grounded: body.grounded, climbing: body.climbing, vy: body.vel.y });
  puck.applyDance(dt);
  if (puck.dancing <= 0 && audio.long) audio.stopLong();

  const gh = body.groundHeight(body.pos.y + 0.01);
  const h = body.pos.y - gh;
  blob.position.set(body.pos.x, gh + 0.006, body.pos.z);
  const bs = Math.max(0.4, 1 - h * 0.8);
  blob.scale.setScalar(bs);
  blob.material.opacity = 0.3 * bs;

  collect();
  updateFlying(dt);
  checkBoxes();
  updateNeighbor(dt);
  checkZones();
  updateStoneRun(dt);
  updateCounter();

  // Iets in de snavel?
  if (state.beakTime > 0) {
    state.beakTime -= dt;
    if (state.beakTime <= 0) puck.setBeakItem(null);
  }

  // Tikken op Puck telt alleen snel achter elkaar
  if (state.tapTimer > 0) {
    state.tapTimer -= dt;
    if (state.tapTimer <= 0) state.tapCount = 0;
  }

  // Puck kletst af en toe uit zichzelf
  state.idleTalk -= dt;
  if (state.idleTalk <= 0) {
    state.idleTalk = 18 + Math.random() * 20;
    if (!song.active && speechTimer <= 0) {
      if (Math.random() < 0.35) {
        say(['Kraa!', 'Fiieuw!', 'Wauw!'][Math.floor(Math.random() * 3)], { sound: 'chirp', seconds: 1.4 });
      } else {
        const lines = ['Watskebeurt?', 'Mag ik een koekje?', 'Watskebeurt?', 'Mag ik een koekje?', 'Hallo!'];
        const line = lines[Math.floor(Math.random() * lines.length)];
        say(line, { sound: line === 'Hallo!' ? 'puck-hallo' : 'talk' });
      }
    }
  }

  // Radar
  if (radarTime > 0) {
    radarTime -= dt;
    if (radarItem && !radarItem.found) {
      beacon.position.set(radarItem.base.x, radarItem.base.y + 1.5, radarItem.base.z);
      beacon.material.opacity = 0.25 + Math.sin(state.time * 6) * 0.1;
    }
    if (radarTime <= 0) beacon.visible = false;
  }

  // Deuren
  const portal = area.portalAt(body.pos);
  if (!portal) state.portalLock = false;
  else if (!state.portalLock && !state.transitioning) enterArea(portal.to, portal.spawn);

  followCam.update(dt, tmpV.set(body.pos.x, body.pos.y + 0.3, body.pos.z));
}

function updateSpeechBubble() {
  if (speechTimer <= 0) return;
  tmpV.set(body.pos.x, body.pos.y + 0.48, body.pos.z).project(camera);
  const offscreen = tmpV.z > 1;
  speechEl.classList.toggle('hidden', offscreen);
  if (offscreen) return;
  speechEl.style.left = `${(tmpV.x * 0.5 + 0.5) * window.innerWidth}px`;
  speechEl.style.top = `${(-tmpV.y * 0.5 + 0.5) * window.innerHeight}px`;
}

// ---------- Hoofdlus ----------

const timer = new THREE.Timer();
timer.connect(document);
let elapsed = 0;
let perfTime = 0;
let perfFrames = 0;

enterArea('puckhuis', 'start', { instant: true });

function frame(timestamp) {
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 1 / 20);
  elapsed += dt;

  if (state.mode === 'play') {
    update(dt);
    song.update(dt);
  } else if (state.mode === 'start') {
    followCam.yaw += dt * 0.05;
    puck.root.position.copy(body.pos);
    puck.root.rotation.y = body.yaw;
    puck.update(dt, { speed: 0, grounded: true, climbing: false, vy: 0 });
    followCam.update(dt);
  }

  fxTime.value = elapsed;
  if (area.update(dt, elapsed)) renderer.shadowMap.needsUpdate = true;
  updateParticles(dt);
  updateJuice(dt);

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl.classList.remove('show');
  }
  if (speechTimer > 0) {
    speechTimer -= dt;
    if (speechTimer <= 0) speechEl.classList.add('hidden');
  }

  // Automatisch lichter renderen als het niet soepel loopt: eerst resolutie, dan de gloed
  const now = performance.now();
  if (!perfTime) perfTime = now;
  perfFrames++;
  if (now - perfTime > 2500) {
    const fps = (perfFrames * 1000) / (now - perfTime);
    if (fps < 45 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
      composer.setPixelRatio(pixelRatio);
    } else if (fps < 40 && bloomOn) {
      bloomOn = false;
    }
    perfTime = now;
    perfFrames = 0;
  }

  if (bloomOn) composer.render();
  else renderer.render(scene, camera);
  updateSpeechBubble();
}
renderer.setAnimationLoop(frame);

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  baseFov = camera.aspect < 1 ? 72 : 60;
  camera.fov = baseFov;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
onResize();

// Debug-hulpje in de console
window.__puck = { bloom: () => bloomOn, audio, body, areas, state, cam: followCam, enterArea, progress: () => progress, puck, song, area: () => area };
