import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { installDetailShader } from './world/detail.js';
import { Bakery, INGREDIENTS } from './areas/bakery.js';
import { Gallery } from './areas/gallery.js';
import { Lift } from './areas/lift.js';
import { Outside, STONE_TARGET_TIME } from './areas/outside.js';
import { PistachioHouse } from './areas/pistachioHouse.js';
import { PuckHouse } from './areas/puckHouse.js';
import { AudioManager, MusicPlayer } from './audio.js';
import { FollowCamera } from './camera.js';
import { Input } from './input.js';
import { CharacterBody, DEFAULT_HOP } from './physics.js';
import { Puck } from './puck.js';
import { Concert } from './concert.js';
import { SongGame } from './songGame.js';
import { Dialog } from './dialog.js';
import { vuurdraakCardCanvas } from './textures.js';
import { fxTime } from './world/fx.js';
import { makePerson } from './world/people.js';
import { mergeStatic } from './world/optimize.js';
import { glowSprite } from './world/area.js';

// ---------- Setup ----------

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('is-touch', isTouch);

const app = document.getElementById('app');
installDetailShader();
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.5);
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
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 4, window.innerHeight / 4), 0.45, 0.5, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
let bloomOn = !isTouch; // glow standaard alleen op computers
let baseFov = 60;

const quality = isTouch ? 'medium' : 'high';
const areas = {
  puckhuis: new PuckHouse({ quality }),
  galerij: new Gallery({ quality }),
  pistachehuis: new PistachioHouse({ quality }),
  buiten: new Outside({ quality }),
  bakkerij: new Bakery({ quality }),
  lift: new Lift({ quality }),
};
Object.values(areas).forEach((a) => scene.add(a.group));
let area = null;

const puck = new Puck();
scene.add(puck.root);
// Spiegelbeeld van Puck in de liftspiegel
const mirrorPuck = new Puck();
areas.lift.mirrorInner.add(mirrorPuck.root);
mirrorPuck.root.userData.dynamic = true;
// Prestaties: stilstaande onderdelen per materiaal samenvoegen
// Avondstand: verzamel lampen (voor gloed-sprites) en lichtgevende materialen vóór het samenvoegen
const nightMats = new Map();
const nightGlows = [];
Object.values(areas).forEach((a) => {
  a.group.updateMatrixWorld(true);
  const spots = [];
  a.group.traverse((o) => {
    const n = o.material?.userData?.night;
    if (!n) return;
    if (!nightMats.has(o.material)) nightMats.set(o.material, { color: o.material.emissive.clone(), intensity: o.material.emissiveIntensity, kind: n });
    if (n === 'lamp' && spots.length < 40) spots.push(o.getWorldPosition(new THREE.Vector3()));
  });
  const inv = a.group.matrixWorld.clone().invert();
  spots.forEach((p) => {
    const glow = glowSprite(0xffc870, 0.9, 0.7);
    glow.position.copy(p.applyMatrix4(inv));
    glow.visible = false;
    a.group.add(glow);
    nightGlows.push(glow);
  });
});
Object.values(areas).forEach((a) => mergeStatic(a.group));
// Snaveltikje als Puck zich met zijn snavel optrekt tijdens het klimmen
puck.onGrip = () => audio.play('puck-tok', { volume: 0.35, rate: 0.9 + Math.random() * 0.2 });

const setHat = (n) => {
  puck.setHat(n);
  mirrorPuck.setHat(n);
};
const setBeakItem = (n) => {
  puck.setBeakItem(n);
  mirrorPuck.setBeakItem(n);
};

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
const music = new MusicPlayer(audio);
audio.onUnlock = () => music.resume();

// ---------- Instellingen (per speler in de browser) ----------
const SETTINGS_KEY = 'puck-settings-v1';
const settings = { music: 0.5, sfx: 0.8, voice: 1, sens: 1, lowfx: false, evening: false, arrow: true, fps: false, hat: true };
const fpsEl = document.getElementById('fps');
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {});
} catch {
  /* geen opslag */
}
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* geen opslag */
  }
}
const MUSIC_FOR = { puckhuis: 'thuis', galerij: 'galerij', pistachehuis: 'pistachehuis', buiten: 'buiten', bakkerij: 'bakkerij', lift: 'lift' };
const musicFor = (name) => MUSIC_FOR[name] || 'buiten';
input.onFirstInteraction = () => audio.unlock();

// ---------- Voortgang (opgeslagen in de browser) ----------

const STARS = [
  { id: 'pistache', icon: '🥜', name: 'Pistachehuis', desc: 'Pik de 10 pistachenootjes van de buurvrouw, zonder dat ze je ziet' },
  { id: 'veren', icon: '🪶', name: 'Verenjacht', desc: 'Vind 8 rode veren in de buurt' },
  { id: 'stenen', icon: '🪨', name: 'Stapstenen', desc: `Steek de vijver over binnen ${STONE_TARGET_TIME} seconden` },
  { id: 'merel', icon: '🎵', name: 'Merel-liedjes', desc: 'Zing 3 liedjes van de merel na' },
  { id: 'koek', icon: '🍪', name: 'Groninger koek', desc: 'Breng oma Moi de 5 ingrediënten voor Groninger koek' },
  { id: 'duiven', icon: '🐦', name: 'Duiven wegjagen', desc: 'Jaag voor Duivenman Jan alle duiven van het plein (30 s)' },
  { id: 'rondje', icon: '🚲', name: 'Fietsrace', desc: 'Race tegen Studente Sjoukje op de fiets door alle ringen' },
  { id: 'dozen', icon: '📦', name: 'Dozen plat', desc: 'Maak voor Jumbo-Bas alle dozen plat binnen 40 s' },
  { id: 'toren', icon: '🔔', name: 'Martinitoren', desc: 'Klim de toren op en luid de klok binnen 30 s' },
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
  liftspiegel: 'Puck in de liftspiegel',
  pakketje: 'Een pakketje op de galerij',
  ds3: "Puck's eigen auto",
  stink: 'De geur van Pasja de kat',
  tasje: 'Het tasje!',
  balkon: 'Uitzicht vanaf het balkon',
  radio: 'Radio Moskou in de merelboom',
  cola: 'Watskecola! (op de bank)',
  ben: 'OP WELK NUMMER WOON JIJ?',
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
progress.found = progress.found || {};
// Al gevonden veren en pistachenootjes blijven weg
[['pistachehuis', 'pistache'], ['buiten', 'veer']].forEach(([an, type]) => {
  const list = areas[an].collectibles;
  (progress.found[type] || []).forEach((i) => {
    if (list[i]) {
      list[i].found = true;
      list[i].group.visible = false;
    }
  });
});
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
  setHat(!settings.hat ? null : allStars() ? 'kroon' : progress.hat);
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
  if (!allStars()) setTimeout(() => say('Hahaha!', { sound: 'lach', seconds: 2 }), 1600);
  burst(starTex, tmpV.set(body.pos.x, body.pos.y + 0.4, body.pos.z), 10, 0.3);
  confettiBurst(tmpV.set(body.pos.x, body.pos.y + 0.3, body.pos.z), 60);
  shockwave(tmpV.set(body.pos.x, body.pos.y + 0.02, body.pos.z), 0xffd84a, 3);
  const n = STARS.filter((s) => progress.stars[s.id]).length;
  banner('⭐ STER! ⭐', `${star.icon} ${star.name} (${n}/${STARS.length})`);
  flashScreen();
  if (n === STARS.length) {
    applyHat();
    toast('Alle sterren verdiend! Puck is de koning van de buurt 👑 Ga naar de galerij: feest!', 6);
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
  if (settings.lowfx) count = Math.ceil(count / 4);
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

const dialog = new Dialog();
const DUIVEN_TIME = 30;
const RONDJE_TIME = 60;
const DOZEN_TIME = 40;
const TOREN_TIME = 30;

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
      if (area.race) area.race.stop();
      if (area.rival) area.rival.stop();
      if (area.boxSmash) area.boxSmash.active = false;
      if (area.towerRun) area.towerRun = null;
      if (area.pigeons?.active) {
        area.pigeons.active = false;
        area.pigeons.reset();
      }
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
    if (state.mode !== 'start' && !state.party) music.play(musicFor(name));
    onAreaEntered(name);
  };
  if (instant) return doSwitch();
  state.transitioning = true;
  const lift = false;
  fadeEl.textContent = '';
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
  if (name === 'buiten' && allStars() && !progress.partyDone && !state.concertHinted) {
    state.concertHinted = true;
    setTimeout(() => toast('🎵 Alle sterren! Heel Stad wil Puck horen. Naar het podium bij de fontein!', 5), 800);
  } else if (name === 'galerij' && first) {
    toast('De galerij op de 9e! Nr. 143 is de buurvrouw (Pistachehuis). Aan het eind gaat de lift naar beneden.', 5);
  } else if (name === 'buiten' && first) {
    toast('Moi! Welkom in Groningen ⭐ Bakkerij Haafs, de vijver, de merel en rode veren wachten op je.', 5);
  } else if (name === 'lift' && first) {
    toast('De lift! Druk op de knop om naar beneden of boven te gaan. Klim via het bierkrat op de leuning en kijk in de spiegel!', 4);
  } else if (name === 'bakkerij') {
    toast(progress.stars.koek ? 'Bakkerij Haafs ruikt naar vers gebakken koek 🍪' : 'Bakkerij Haafs! Praat met oma Moi achter de toonbank.', 3.5);
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
  music.play(musicFor(area.name));
  setTimeout(() => say('Hallo!', { sound: 'hallo' }), 600);
  setTimeout(() => say('Watskebeurt?'), 3600);
  toast(progress.partyDone
    ? 'Moi Puck! Het concert was prachtig. Zoek je de laatste geheimpjes nog?'
    : `Puck is alleen thuis. Veel te stil. Plan: een fluitconcert! Verdien ${STARS.length} sterren, dan komt heel Stad luisteren. Volg de gele pijl!`, 7);
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
    const extra = s.id === 'stenen' && progress.best ? ` · beste tijd ${progress.best.toFixed(1)} s` : '';
    li.textContent = `${done ? '⭐' : '☆'} ${s.icon} ${s.name}: ${s.desc}${extra}`;
    list.appendChild(li);
  });
  const found = Object.keys(SECRETS).filter((k) => progress.secrets[k]);
  $('secret-line').textContent = `🥚 Geheimpjes: ${found.length}/${Object.keys(SECRETS).length}${found.length ? ': ' + found.map((k) => SECRETS[k]).join(', ') : ''}`;
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
  if (e.code === 'Escape' && state.concert) {
    concert.stop();
    if (state.camDist) followCam.distance = state.camDist;
    state.concert = false;
    state.frozen = false;
    music.play(musicFor(area.name));
    toast('Concert gestopt. Het podium wacht op je.', 2.5);
    return;
  }
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
    mirrorPuck.dance(8);
    audio.playLong('puck-dans');
    say('We gaan doen wat we doen! 🎶', { seconds: 4, sound: null });
    secret('dans');
  } else {
    // Afwisselend een zinnetje of een krijsje
    const r = Math.random();
    if (r < 0.25) say('Hahaha!', { sound: 'lach', seconds: 2 });
    else if (state.tapCount % 2) say(Math.random() < 0.5 ? 'Watskebeurt?' : 'Mag ik een koekje?');
    else say(['Fiieuw! ♪', 'Fie-fiew! ♪', 'Tuut! ♪'][Math.floor(Math.random() * 3)], { sound: 'fluit', seconds: 1.4 });
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

function eat(color) {
  puck.eat(color);
  mirrorPuck.eat(color);
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

function rememberFound(c) {
  const i = area.collectibles.indexOf(c);
  const arr = (progress.found[c.type] = progress.found[c.type] || []);
  if (!arr.includes(i)) arr.push(i);
  saveProgress();
}

function onCollect(c) {
  if (c.type === 'pistache' || c.type === 'veer') rememberFound(c);
  switch (c.type) {
    case 'pistache': {
      audio.play('nut');
      eat(0x9cc75a);
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
      eat(0xf7cf4a);
      state.powerTime = 15;
      toast('🍟 Patat-power! Supersnel en superhoog hoppen!', 3);
      break;
    case 'koekje':
      eat(0xb9803f);
      secret('koekje');
      break;
    case 'eierbal':
      audio.play('fries');
      eat(0xc98a3c);
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
      unlock(ing.icon, 'NIEUW ITEM!', `${ing.name} (${n}/${INGREDIENTS.length}) · breng het naar oma Moi`, { sound: 'feather' });
      if (n === INGREDIENTS.length) setTimeout(() => toast('Alles compleet! Breng de ingrediënten naar Bakkerij Haafs 🍪', 4), 2200);
      break;
    }
    case 'goud':
      audio.play('star');
      say('Watskebeurt? Goud!');
      secret('goud');
      break;
    case 'sigaret':
    case 'kaart':
      setBeakItem(c.type);
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
    say('Watskebeurt?!', { sound: 'piep' });
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
      if (z.dance) {
        puck.dance(6);
        mirrorPuck.dance(6);
        audio.playLong('puck-dans');
        say('Het tasje!! 🎶', { seconds: 3, sound: null });
      }
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
  const show = !!prompt && !song.active && !state.concert && !state.frozen;
  promptEl.classList.toggle('hidden', !show || isTouch);
  actionBtn.classList.toggle('hidden', !show || !isTouch);
  if (show) promptEl.textContent = `E: ${prompt.prompt}`;
}

function interact() {
  const z = state.activeZone;
  if (!z || song.active) return;
  if (z.id === 'npc') {
    talkTo(z.npc);
    return;
  }
  if (z.id === 'liftknop') {
    const lift = areas.lift;
    if (lift.ride((floor) => {
      audio.play('checkpoint');
      toast(floor === 0 ? '🛗 Ding! Begane grond. Welkom in Stad!' : '🛗 Ding! 9e verdieping', 2.5);
    })) {
      audio.play('door');
      toast(lift.floor === 9 ? '🛗 Naar beneden…' : '🛗 Naar boven…', 2);
    }
    return;
  }
  if (z.id === 'oma') {
    followCam.yaw = 0; // kijk naar oma achter de toonbank
    followCam.pitch = 0.55;
    talkToOma();
    return;
  }
  if (z.id === 'podium') {
    if (!allStars()) {
      const n = STARS.filter((st) => progress.stars[st.id]).length;
      dialog.show('Puck', `Nog niet. Eerst heel Stad warm krijgen. ${n}/${STARS.length} sterren. Anders fluit ik voor niemand.`, 4);
      return;
    }
    startConcert();
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
    else toast(`Finish in ${t.toFixed(1)} s. Net te langzaam! Probeer het onder de ${STONE_TARGET_TIME} s.`, 4);
  }
}

function talkTo(npc) {
  npc.person.talk(3);
  // Kort stukje "game-gebrabbel" bij elk bericht van een NPC, iets hoger of lager per persoon
  const pitch = 0.85 + ((npc.id.charCodeAt(0) * 7 + npc.id.length * 13) % 30) / 100;
  audio.playSlice('npc-praat', 0.55 + Math.random() * 0.35, { volume: 0.7, rate: pitch });
  const o = areas.buiten;
  if (npc.id === 'mehmet') {
    o.mehmetPaused = true;
    clearTimeout(state.mehmetTimer);
    state.mehmetTimer = setTimeout(() => (o.mehmetPaused = false), 3000);
    audio.play('meow');
    return dialog.show(npc.name, dialog.next('mehmet'), 2.5);
  }
  if (npc.id === 'ben') {
    setTimeout(() => say('Hahaha! 141!', { sound: 'lach', seconds: 2 }), 1400);
    secret('ben');
    return dialog.show(npc.name, dialog.next('ben'));
  }
  if (npc.id === 'bas') {
    if (o.boxSmash.active) return dialog.show(npc.name, 'Nait praten. Springen.');
    dialog.show(npc.name, progress.stars.dozen ? dialog.next('basIdle') : `Die dozen moeten plat. Allemaal. ${DOZEN_TIME} tellen. Spring er bovenop. Hup.`, 4);
    setTimeout(() => {
      o.boxSmash.start();
      audio.play('checkpoint');
      toast('📦 Go! Spring op alle dozen.', 2.5);
    }, 1200);
    return;
  }
  if (npc.id === 'toren') {
    if (o.towerRun) return dialog.show(npc.name, 'Klimmen. Nait kletsen.');
    dialog.show(npc.name, progress.stars.toren ? dialog.next('torenIdle') : `Moi. Klim naar het balkon en luid de klok. ${TOREN_TIME} tellen. Nait naar beneden kieken.`, 4);
    setTimeout(() => {
      o.towerRun = { time: 0 };
      audio.play('checkpoint');
      toast('🔔 Go! Klim de Martinitoren op (loop tegen de toren aan).', 3);
    }, 1200);
    return;
  }
  if (npc.id === 'sjoukje') {
    if (o.race.active) return dialog.show(npc.name, 'Rennen, nait praten.');
    if (!progress.stars.rondje) {
      dialog.show(npc.name, 'Moi! Race? Ik op de fiets, jij te voet. Door alle blauwe ringen. Wie het eerst terug is. Klaar? Nee? Toch go.', 5);
      setTimeout(() => {
        o.race.start();
        o.rival.start();
        audio.play('bell');
        toast('🚲 Go! Wees eerder terug dan Sjoukje.', 2.5);
      }, 1500);
      return;
    }
    return dialog.show(npc.name, dialog.next('sjoukjeIdle'));
  }
  if (npc.id === 'jan') {
    if (o.pigeons.active) return dialog.show(npc.name, 'Nait tegen mij. Tegen de duiven.');
    if (!progress.stars.duiven) {
      dialog.show(npc.name, `Die duiven eten al mien brood op. Jaag ze eens weg, jong. ${DUIVEN_TIME} tellen. Henk ook.`, 5);
      setTimeout(() => {
        o.pigeons.start();
        audio.play('checkpoint');
        toast('🐦 Go! Ren door de duiven heen.', 2.5);
      }, 1200);
      return;
    }
    return dialog.show(npc.name, dialog.next('janIdle'));
  }
  dialog.show(npc.name, dialog.next(npc.id));
}

// ---------- Doel + pijl ----------

const GRAPH = {
  puckhuis: ['galerij'],
  galerij: ['puckhuis', 'pistachehuis', 'lift'],
  pistachehuis: ['galerij'],
  lift: ['galerij', 'buiten'],
  buiten: ['lift', 'bakkerij'],
  bakkerij: ['buiten'],
};

function nextHop(from, to) {
  if (from === to) return to;
  const prev = { [from]: null };
  const queue = [from];
  while (queue.length) {
    const a = queue.shift();
    for (const b of GRAPH[a]) {
      if (b in prev) continue;
      prev[b] = a;
      if (b === to) {
        let n = b;
        while (prev[n] !== from) n = prev[n];
        return n;
      }
      queue.push(b);
    }
  }
  return to;
}

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function nearest(list) {
  let best = null;
  let bd = Infinity;
  for (const c of list) {
    const d = c.base.distanceToSquared(body.pos);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

/** Het huidige doel: { area, pos?, text }. */
function currentObjective() {
  const b = areas.buiten;
  if (b.race.active) return { area: 'buiten', pos: V3(b.race.target.x, 0, b.race.target.z), text: 'Rondje Stad: volg de ringen!' };
  if (b.pigeons.active) return { area: 'buiten', text: 'Jaag alle duiven weg!' };
  if (b.boxSmash.active) return { area: 'buiten', text: 'Spring op alle dozen!' };
  if (b.towerRun) return { area: 'buiten', pos: V3(b.towerTop.x, 0, b.towerTop.z), text: 'Klim naar het balkon en luid de klok!' };
  if (!visited.buiten) return { area: 'buiten', pos: V3(0, 0, -12), text: 'Neem de lift naar beneden (eind van de galerij)' };
  const list = [];
  const S = progress.stars;
  if (!S.merel) list.push({ area: 'buiten', pos: V3(17, 0, -8), text: 'Zing met de merel in de grote boom' });
  if (!S.stenen) list.push({ area: 'buiten', pos: V3(3.7, 0, 8), text: 'Stapstenen: steek de vijver over' });
  if (!S.duiven) list.push({ area: 'buiten', pos: V3(3, 0, 3.1), text: 'Praat met Duivenman Jan op het plein' });
  if (!S.rondje) list.push({ area: 'buiten', pos: V3(-5.4, 0, 20.6), text: 'Fietsrace: praat met Studente Sjoukje bij de brug' });
  if (!S.dozen) list.push({ area: 'buiten', pos: V3(20.5, 0, -2.5), text: 'Dozen plat: praat met Jumbo-Bas achter de Jumbo' });
  if (!S.toren) list.push({ area: 'buiten', pos: V3(-20, 0, 16), text: 'Martinitoren: praat met Torenwachter Wiebe' });
  if (!S.koek) {
    const missing = b.collectibles.filter((c) => c.type === 'ingredient' && !c.found);
    if (!state.omaMet || !missing.length) list.push({ area: 'bakkerij', pos: V3(0, 0, 0.55), text: missing.length ? 'Praat met oma Moi in Bakkerij Haafs' : 'Breng de ingrediënten naar oma Moi' });
    else {
      const n = nearest(missing);
      list.push({ area: 'buiten', pos: n.base, text: `Zoek ingrediënten voor oma Moi (${n.where})` });
    }
  }
  if (!S.veren) {
    const n = nearest(b.feathers.filter((c) => !c.found));
    if (n) list.push({ area: 'buiten', pos: n.base, text: `Rode veer: kijk ${n.where}` });
  }
  if (!S.pistache) list.push({ area: 'pistachehuis', text: 'Pik 10 pistachenootjes bij de buurvrouw (nr. 143)' });
  if (!list.length) {
    if (!progress.partyDone) return { area: 'buiten', pos: V3(-5.5, 0, 6), text: 'Alle sterren! Geef het fluitconcert op het podium 🎵' };
    return null;
  }
  return list.find((o) => o.area === area.name) || list[0];
}

const arrow = new THREE.Group();
const arrowMesh = new THREE.Mesh(
  new THREE.ConeGeometry(0.07, 0.22, 4).rotateX(Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xffd84a, toneMapped: false }),
);
arrowMesh.position.z = 0.28;
arrow.add(arrowMesh);
scene.add(arrow);
const objectiveEl = $('objective');
let objectiveTimer = 0;
let objective = null;

function portalCenter(a, to) {
  const p = a.portals.find((q) => q.to === to);
  return p ? V3((p.x0 + p.x1) / 2, 0, (p.z0 + p.z1) / 2) : null;
}

function updateObjective(dt) {
  objectiveTimer -= dt;
  if (objectiveTimer <= 0) {
    objectiveTimer = 0.3;
    objective = currentObjective();
    objectiveEl.textContent = objective ? `🎯 ${objective.text}` : '';
    objectiveEl.classList.toggle('hidden', !objective || !settings.arrow);
  }
  let target = null;
  if (objective && settings.arrow) {
    if (objective.area === area.name) target = objective.pos || null;
    else {
      const hop = nextHop(area.name, objective.area);
      if (area.name === 'lift') {
        const want = hop === 'buiten' ? 0 : 9;
        target = area.floor === want ? V3(0, 0, 1.2) : V3(0.45, 0, 0.45);
      } else {
        target = portalCenter(area, hop);
      }
    }
  }
  const show = !!target && Math.hypot(target.x - body.pos.x, target.z - body.pos.z) > 1.1;
  arrow.visible = show && state.mode === 'play';
  if (show) {
    arrow.position.set(body.pos.x, body.pos.y + 0.62 + Math.sin(state.time * 4) * 0.03, body.pos.z);
    arrow.rotation.y = Math.atan2(target.x - body.pos.x, target.z - body.pos.z);
  }
}

// ---------- Het feest (einde) ----------

// ---------- Finale: het fluitconcert ----------
const AUDIENCE = [
  ['Postbode Harm', { shirt: 0x1f3a6b, hat: 'postpet', hatColor: 0xe86a1a, prop: 'mailbag' }, 'Moi. Ik kwam een pakketje brengen. Ik blijf wel even.'],
  ['Oma Moi', { height: 1.6, shirt: 0x3d7ea6, hairStyle: 'bun', hair: 0xd8d8d8, mood: 'smile' }, 'Ik heb koek meegenomen. Voor na afloop. Of nu.'],
  ['Visser Geert', { shirt: 0x4f6b3a, hat: 'beanie', hatColor: 0x2f6e4a, beard: true, hair: 0xb9b9b9, skin: 1 }, 'Beter dan vissen. Nou ja. Anders.'],
  ['Studente Sjoukje', { height: 1.68, shirt: 0xf2c230, hairStyle: 'ponytail', hair: 0xe8cf8a, glasses: true, mood: 'smile' }, 'Hier schrijf ik mijn scriptie over.'],
  ['Duivenman Jan', { shirt: 0x6b5a4a, hairStyle: 'bald', hat: 'cap', hatColor: 0x5b5f66, prop: 'bread' }, 'Henk is er ook. Die was nait uitgenodigd.'],
  ['Buurman Ben', { shirt: 0x8a8f96, hairStyle: 'bald', pants: 0x3a3a3a }, 'Mooi. OP WELK NUMMER WOON JIJ?'],
  ['Meneer Mehmet', { shirt: 0x2f5d7c, beard: true, hair: 0x2a2a2a, skin: 2 }, 'Hoi.'],
  ['Buurvrouw Tineke', { height: 1.62, shirt: 0xc86a8a, hairStyle: 'bob', hair: 0x9a7b5a, glasses: true }, 'Ik heb mijn fiets keurig in het rek gezet. Voor de duidelijkheid.'],
  ['Jumbo-Bas', { shirt: 0xf2c230, hat: 'cap', hatColor: 0xf2c230 }, 'Ik heb de dozen laten staan. Voor één keer.'],
  ['Torenwachter Wiebe', { shirt: 0x4b3a6b, beard: true, hair: 0x8a8a8a }, 'Ik heb de klok zacht gezet. Uit respect.'],
  ['Mw. Zuur (nr. 143)', { height: 1.9, shirt: 0x7b5c7e, pants: 0x4d4a5c, hairStyle: 'bob', hair: 0xf1f0ec, glasses: true, mood: 'frown' }, 'Hmpf. Nou. Het was mooi. Zeg het tegen niemand.'],
];

const concert = new Concert({
  audio,
  onLane: (lane) => (state.concertLane = lane),
  onHit: (lane, combo, great) => {
    const a = areas.buiten;
    if (combo % 8 === 0) {
      confettiBurst(tmpV.set(body.pos.x, body.pos.y + 0.5, body.pos.z), 30);
      toast(`🔥 ${combo} op rij!`, 1.2);
    }
    if (great) burst(sparkleTex, tmpV.set(a.stage.lanes[lane], a.stage.y + 0.4, a.stage.z), 3, 0.25);
    const fan = state.audience?.[Math.floor(Math.random() * state.audience.length)];
    fan?.talk(0.6);
  },
  onMiss: () => {},
  onEnd: (acc, best) => endConcert(acc, best),
});

function spawnAudience() {
  const a = areas.buiten;
  // Publiek naast het podium (links en rechts), zodat de camera vrij zicht heeft op Puck
  const cx = a.stage.x;
  state.audience = AUDIENCE.map(([name, look], i) => {
    const p = makePerson(look);
    const side = i % 2 ? 1 : -1;
    const k = Math.floor(i / 2);
    const col = k % 2;
    const row = Math.floor(k / 2);
    p.root.position.set(cx + side * (2.6 + col * 0.8), 0, 5.7 + row * 0.75 + col * 0.3);
    p.root.rotation.y = Math.atan2(cx - p.root.position.x, 7.3 - p.root.position.z);
    p.name = name;
    a.group.add(p.root);
    a.fx.push(p);
    return p;
  });
}

function clearAudience() {
  const a = areas.buiten;
  (state.audience || []).forEach((p) => {
    a.group.remove(p.root);
    const k = a.fx.indexOf(p);
    if (k >= 0) a.fx.splice(k, 1);
  });
  state.audience = null;
}

function startConcert() {
  if (state.concert) return;
  const a = areas.buiten;
  state.concert = true;
  state.frozen = true;
  state.concertLane = 1;
  input.releasePointer();
  dialog.hide();
  music.stop();
  if (!state.audience) spawnAudience();
  body.teleport(V3(a.stage.lanes[1], a.stage.y + 0.02, a.stage.z), Math.PI);
  followCam.yaw = Math.PI;
  followCam.pitch = 0.26;
  state.camDist = followCam.distance;
  followCam.distance = 3.8;
  toast(isTouch ? 'Tik op de banen als de tonen op de lijn zijn!' : 'Druk op A, S, D (of de pijltjes) als de tonen op de lijn zijn!', 4);
  setTimeout(() => concert.start(), 600);
}

function endConcert(acc, best) {
  state.concert = false;
  if (state.camDist) followCam.distance = state.camDist;
  const pct = Math.round(acc * 100);
  if (acc < 0.6) {
    state.frozen = false;
    music.play(musicFor(area.name));
    dialog.show('Mw. Zuur (nr. 143)', `${pct} procent. Hmpf. Dat kan beter. Nou, wij blijven wel staan. Nog een keer?`, 5);
    return;
  }
  progress.partyDone = true;
  saveProgress();
  music.play('feest');
  puck.dance(30);
  mirrorPuck.dance(30);
  audio.play('star');
  toast(`🎉 ${pct} procent! Langste reeks: ${best}. Heel Stad klapt!`, 4);
  confettiBurst(tmpV.set(body.pos.x, body.pos.y + 0.5, body.pos.z), 90);
  let t = 2200;
  (state.audience || []).forEach((p, i) => {
    const line = AUDIENCE[i][2];
    setTimeout(() => {
      dialog.show(p.name, line, 2.6);
      p.talk(2.6);
      confettiBurst(tmpV.set(p.root.position.x, 1.8, p.root.position.z), 16);
    }, t);
    t += 2700;
  });
  setTimeout(() => {
    dialog.show('Puck', 'Watskecola! Ik ben niet meer alleen!', 3.5);
    say('Watskecola!', { sound: 'puck-watskecola', seconds: 3 });
    confettiBurst(tmpV.set(body.pos.x, body.pos.y + 0.4, body.pos.z), 80);
  }, t);
  setTimeout(() => {
    state.frozen = false;
    showCredits();
  }, t + 4000);
}

function showCredits() {
  const el = $('credits');
  el.classList.remove('hidden');
  input.releasePointer();
  state.mode = 'menu';
  const done = () => {
    el.classList.add('hidden');
    state.mode = 'play';
    music.play(musicFor(area.name));
  };
  $('credits-close').onclick = done;
}

function updateMinigames(dt) {
  if (area.name !== 'buiten') return;
  const o = area;
  const scared = o.pigeons.update(dt, state.time, body.pos);
  if (scared) {
    audio.play('feather', { volume: 0.5 });
    burst(sparkleTex, tmpV.set(body.pos.x, body.pos.y + 0.4, body.pos.z), 2, 0.2);
  }
  if (o.pigeons.active) {
    if (o.pigeons.left === 0) {
      o.pigeons.active = false;
      dialog.show('Duivenman Jan', 'Nou. Nou nou. Dat is mooi. Nou moet ik mien brood zelf opeten.', 4);
      award('duiven');
    } else if (o.pigeons.time > DUIVEN_TIME) {
      o.pigeons.active = false;
      o.pigeons.reset();
      dialog.show('Duivenman Jan', 'Te laat. Ze binnen weer terug. Henk voorop.', 3.5);
    }
  }
  const res = o.race.update(dt, state.time, body.pos);
  if (res === 'ring') audio.play('checkpoint');
  if (res === 'finish') {
    const t = o.race.time;
    o.rival.stop();
    dialog.show('Studente Sjoukje', `${t.toFixed(1)} seconden. Een papegaai die sneller is dan een fiets. Dat zeg ik tegen niemand.`, 4.5);
    award('rondje');
  }
  if (o.rival.update(dt) && o.race.active) {
    o.race.stop();
    o.rival.stop();
    audio.play('bell');
    dialog.show('Studente Sjoukje', 'Tring tring. Eerst. Het was ook een beetje oneerlijk. Nog een keer? Kom maar praten.', 4);
  }
  // Dozen plat
  const smashed = o.boxSmash.update(dt, body.pos);
  if (smashed) {
    audio.play('crunch');
    burst(sparkleTex, tmpV.set(body.pos.x, body.pos.y + 0.2, body.pos.z), 4, 0.3);
    shockwave(tmpV.set(body.pos.x, 0.02, body.pos.z), 0xc89b62, 0.8);
  }
  if (o.boxSmash.active) {
    if (o.boxSmash.left === 0) {
      o.boxSmash.active = false;
      const t = o.boxSmash.time;
      progress.bestDozen = Math.min(progress.bestDozen || 999, t);
      saveProgress();
      if (t <= DOZEN_TIME) {
        dialog.show('Jumbo-Bas', `${t.toFixed(1)} seconden. Plat is plat. Mooi.`, 3.5);
        award('dozen');
      } else dialog.show('Jumbo-Bas', `${t.toFixed(1)} seconden. Te langzaam. Ze binnen wel plat. Dat dan weer wel.`, 3.5);
    } else if (o.boxSmash.time > DOZEN_TIME + 20) {
      o.boxSmash.active = false;
      dialog.show('Jumbo-Bas', 'Laat maar. Ik doe het zelf wel. Zoals altied.', 3);
    }
  }
  // Martinitoren
  if (o.towerRun) {
    o.towerRun.time += dt;
    const tt = o.towerTop;
    if (body.pos.y > tt.y - 0.2 && Math.hypot(body.pos.x - tt.x, body.pos.z - tt.z) < 1.2) {
      const t = o.towerRun.time;
      o.towerRun = null;
      audio.play('bell');
      setTimeout(() => audio.play('bell'), 450);
      if (t <= TOREN_TIME) {
        dialog.show('Torenwachter Wiebe', `Bim. Bam. ${t.toFixed(1)} seconden. Heel Stad heeft het gehoord. Nou ja. De straat.`, 4);
        award('toren');
      } else dialog.show('Torenwachter Wiebe', `${t.toFixed(1)} seconden. Mooi geluid. Te laat. Nog een keer?`, 3.5);
    } else if (o.towerRun.time > TOREN_TIME + 20) {
      o.towerRun = null;
      dialog.show('Torenwachter Wiebe', 'Ook goed. Beneden is ook mooi.', 3);
    }
  }
  if (o.race.active && o.race.time > RONDJE_TIME + 30) {
    o.race.stop();
    o.rival.stop();
    dialog.show('Studente Sjoukje', 'Ben je verdwaald? Dat gebeurt iedereen in Stad. Kom maar weer praten.', 4);
  }
}

function updateCounter() {
  if (area.name === 'buiten' && area.race.active) {
    counterEl.classList.remove('hidden');
    counterKey = 'timer';
    counterEl.textContent = `🚲 ring ${area.race.next + 1}/${area.race.rings.length} · Sjoukje ${Math.round((area.rival.t / area.rival.duration) * 100)}%`;
    return;
  }
  if (area.name === 'buiten' && area.boxSmash.active) {
    counterEl.classList.remove('hidden');
    counterKey = 'timer';
    counterEl.textContent = `📦 ${area.boxSmash.left} over · ${area.boxSmash.time.toFixed(1)} s`;
    return;
  }
  if (area.name === 'buiten' && area.towerRun) {
    counterEl.classList.remove('hidden');
    counterKey = 'timer';
    counterEl.textContent = `🔔 ${area.towerRun.time.toFixed(1)} s · hoogte ${body.pos.y.toFixed(1)} m`;
    return;
  }
  if (area.name === 'buiten' && area.pigeons.active) {
    counterEl.classList.remove('hidden');
    counterKey = 'timer';
    counterEl.textContent = `🐦 ${area.pigeons.left} over · ${Math.max(0, DUIVEN_TIME - area.pigeons.time).toFixed(0)} s`;
    return;
  }
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
  if (state.concert) {
    concert.update();
    const lx = areas.buiten.stage.lanes[state.concertLane ?? 1];
    body.pos.x += (lx - body.pos.x) * Math.min(1, dt * 14);
    if (puck.dancing < 0.5) puck.dance(1);
  }

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
  if (area.name === 'lift') {
    mirrorPuck.root.position.copy(body.pos);
    mirrorPuck.root.rotation.y = body.yaw;
    mirrorPuck.update(dt, { speed: body.speed, grounded: body.grounded, climbing: body.climbing, vy: body.vel.y });
    mirrorPuck.applyDance(dt);
    mirrorPuck.setPower(state.powerTime > 0 ? 1 : 0, state.time);
  }
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
  updateMinigames(dt);
  updateObjective(dt);
  updateCounter();

  // Iets in de snavel?
  if (state.beakTime > 0) {
    state.beakTime -= dt;
    if (state.beakTime <= 0) setBeakItem(null);
  }

  // Tikken op Puck telt alleen snel achter elkaar
  if (state.tapTimer > 0) {
    state.tapTimer -= dt;
    if (state.tapTimer <= 0) state.tapCount = 0;
  }

  // Puck kletst af en toe uit zichzelf
  state.idleTalk -= dt;
  if (state.idleTalk <= 0) {
    state.idleTalk = 12 + Math.random() * 14;
    if (!song.active && speechTimer <= 0) {
      const r = Math.random();
      if (r < 0.12) say('Hahaha!', { sound: 'lach', seconds: 2 });
      else if (r < 0.2) audio.play('puck-klik', { volume: 0.7 });
      else if (r < 0.65) {
        say(['Fiieuw! ♪', 'Fie-fie-fiew! ♪', 'Tuuut-fiew! ♪'][Math.floor(Math.random() * 3)], { sound: 'fluit', seconds: 1.4 });
      } else {
        const lines = ['Watskebeurt?', 'Mag ik een koekje?', 'Watskebeurt?', 'Mag ik een koekje?', 'Hallo!'];
        const line = lines[Math.floor(Math.random() * lines.length)];
        say(line, { sound: line === 'Hallo!' ? 'hallo' : 'talk' });
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
  else if (!state.portalLock && !state.transitioning) {
    if (portal.to === 'lift') {
      areas.lift.floor = area.name === 'buiten' ? 0 : 9;
      areas.lift.drawDisplay(areas.lift.floor);
      enterArea('lift', 'binnen');
    } else if (portal.to === 'lift-uit') {
      if (area.moving <= 0) enterArea(area.floor === 9 ? 'galerij' : 'buiten', 'lift');
    } else {
      enterArea(portal.to, portal.spawn);
    }
  }

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

const perf = { update: 0, render: 0 };
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

  const tA = performance.now();
  if (state.mode === 'play') {
    update(dt);
    song.update(dt);
    dialog.update(dt);
  } else if (state.mode === 'start') {
    followCam.yaw += dt * 0.05;
    puck.root.position.copy(body.pos);
    puck.root.rotation.y = body.yaw;
    puck.update(dt, { speed: 0, grounded: true, climbing: false, vy: 0 });
    followCam.update(dt);
  }

  fxTime.value = elapsed;
  if (area.update(dt, elapsed)) renderer.shadowMap.needsUpdate = true;
  // Omgevingsgeluid per plek
  const ambKind = state.mode !== 'play' || state.concert ? null : { buiten: 'buiten', galerij: 'galerij', lift: 'lift', puckhuis: 'binnen', bakkerij: 'binnen' }[area.name] || null;
  if (ambKind !== state.ambKind) {
    state.ambKind = ambKind;
    audio.setAmbience(ambKind);
  }
  audio.updateAmbience(state.time);
  // Russische radio in de merelboom: harder naarmate Puck dichterbij komt
  const radio = areas.buiten.radio;
  const rd = area === areas.buiten && state.mode === 'play' && !state.concert ? body.pos.distanceTo(radio) : 99;
  audio.setLoopVolume('radio-russisch', rd < 12 ? 0.9 * Math.pow(1 - rd / 12, 2) : 0);
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
  if (now - perfTime > 1500) {
    const fps = (perfFrames * 1000) / (now - perfTime);
    fpsEl.textContent = `${Math.round(fps)} fps`;
    if (fps < 50 && bloomOn) {
      bloomOn = false; // eerst de glow uit
    } else if (fps < 45 && pixelRatio > 0.8) {
      pixelRatio = Math.max(0.8, pixelRatio - 0.2);
      renderer.setPixelRatio(pixelRatio);
      composer.setPixelRatio(pixelRatio);
    }
    perfTime = now;
    perfFrames = 0;
  }

  const tB = performance.now();
  if (bloomOn && !settings.lowfx) composer.render();
  else renderer.render(scene, camera);
  perf.update = perf.update * 0.95 + (tB - tA) * 0.05;
  perf.render = perf.render * 0.95 + (performance.now() - tB) * 0.05;
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

// ---------- Instellingen toepassen ----------

const skyMats = [];
Object.values(areas).forEach((a) =>
  a.group.traverse((o) => {
    if (o.material?.uniforms?.uEvening) skyMats.push(o.material);
  }),
);
const OUTDOOR = ['buiten', 'galerij'];
const dayLight = {};
Object.values(areas).forEach((a) => {
  dayLight[a.name] = { sun: a.sun?.intensity, sunColor: a.sun?.color.clone(), hemi: a.hemi?.intensity, fog: a.fog?.color.clone() };
});

function applySettings() {
  audio.setVolumes(settings);
  followCam.sensitivity = 0.0035 * settings.sens;
  fpsEl.classList.toggle('hidden', !settings.fps);
  if (typeof applyHat === 'function') applyHat();
  const eve = settings.evening ? 1 : 0;
  skyMats.forEach((m) => (m.uniforms.uEvening.value = eve));
  nightMats.forEach((d, m) => {
    m.emissive.copy(d.color);
    m.emissiveIntensity = d.intensity;
    if (!eve) return;
    if (d.kind === 'lamp') m.emissiveIntensity = d.intensity * 2.4;
    else {
      m.emissive.set(0xffc36e);
      m.emissiveIntensity = 0.75;
    }
  });
  nightGlows.forEach((g) => (g.visible = !!eve));
  Object.values(areas).forEach((a) => {
    const d = dayLight[a.name];
    const outdoorish = OUTDOOR.includes(a.name);
    if (a.sun) {
      a.sun.intensity = d.sun * (eve ? (outdoorish ? 0.3 : 0.45) : 1);
      a.sun.color.copy(d.sunColor);
      if (eve) a.sun.color.lerp(new THREE.Color(0xff9a5a), 0.6);
    }
    if (a.hemi) a.hemi.intensity = d.hemi * (eve ? (outdoorish ? 0.42 : 0.55) : 1);
    if (a.fog) {
      a.fog.color.copy(d.fog);
      if (eve) a.fog.color.set(0x7a6f8a);
    }
  });
  renderer.shadowMap.needsUpdate = true;
  objectiveTimer = 0;
}

function buildSettingsUI() {
  const box = $('settings');
  const slider = (key, label, min, max, step) => `<label>${label}<input type="range" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${settings[key]}"></label>`;
  const check = (key, label) => `<label class="check"><input type="checkbox" data-k="${key}" ${settings[key] ? 'checked' : ''}> ${label}</label>`;
  box.innerHTML =
    slider('music', '🎵 Muziek', 0, 1, 0.05) +
    slider('sfx', '🔔 Effecten', 0, 1, 0.05) +
    slider('voice', '🦜 Puck', 0, 1, 0.05) +
    slider('sens', '🎥 Camera', 0.3, 2.5, 0.1) +
    check('evening', '🌆 Avond in Stad') +
    check('arrow', '🎯 Doel-pijl') +
    check('hat', '🧢 Muts of kroon op (als je die gevonden hebt)') +
    check('lowfx', '📱 Minder effecten (sneller)') +
    check('fps', '📊 FPS tonen');
  box.querySelectorAll('input').forEach((inp) =>
    inp.addEventListener('input', () => {
      settings[inp.dataset.k] = inp.type === 'checkbox' ? inp.checked : parseFloat(inp.value);
      saveSettings();
      applySettings();
    }),
  );
}
buildSettingsUI();
applySettings();

// Debug-hulpje in de console
window.__puck = { concert, startConcert, talkTo, perf, renderer, bloom: () => bloomOn, audio, body, areas, state, cam: followCam, enterArea, progress: () => progress, puck, song, area: () => area };
