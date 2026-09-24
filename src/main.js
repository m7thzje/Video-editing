import * as THREE from 'three';
import { Outside, STONE_TARGET_TIME } from './areas/outside.js';
import { PistachioHouse } from './areas/pistachioHouse.js';
import { PuckHouse } from './areas/puckHouse.js';
import { AudioManager } from './audio.js';
import { FollowCamera } from './camera.js';
import { Input } from './input.js';
import { CharacterBody, DEFAULT_HOP } from './physics.js';
import { Puck } from './puck.js';
import { SongGame } from './songGame.js';

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
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 150);

const quality = isTouch ? 'medium' : 'high';
const areas = {
  puckhuis: new PuckHouse({ quality }),
  buiten: new Outside({ quality }),
  pistachehuis: new PistachioHouse({ quality }),
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
};
const SAVE_KEY = 'puck-avontuur-v2';

function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (p && p.stars && p.secrets) return p;
  } catch {
    /* geen opslag beschikbaar */
  }
  return { stars: {}, secrets: {}, best: null, hat: null };
}
let progress = loadProgress();
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
  const n = STARS.filter((s) => progress.stars[s.id]).length;
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
  const n = Object.keys(SECRETS).filter((k) => progress.secrets[k]).length;
  setTimeout(() => toast(`🥚 Geheimpje gevonden: ${SECRETS[id]} (${n}/${Object.keys(SECRETS).length})`, 3.5), 300);
  return true;
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
  fadeEl.classList.add('on');
  audio.play('door');
  setTimeout(() => {
    doSwitch();
    setTimeout(() => {
      fadeEl.classList.remove('on');
      state.transitioning = false;
    }, 80);
  }, 260);
}

function onAreaEntered(name) {
  if (state.mode === 'start') return;
  const first = !visited[name];
  visited[name] = true;
  if (name === 'buiten' && first) {
    toast('Buiten! Verdien sterren bij het Pistachehuis, de vijver, de merel en met de verenjacht ⭐', 5);
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
  toast('Welkom thuis, Puck! Loop door de gang naar de voordeur om naar buiten te gaan.', 5);
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
  progress = { stars: {}, secrets: {}, best: null, hat: null };
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
    burst(sparkleTex, p, 6);
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
      eat();
      state.powerTime = 15;
      toast('🍟 Patat-power! Supersnel en superhoog hoppen!', 3);
      break;
    case 'koekje':
      eat();
      secret('koekje');
      break;
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
      enterArea('buiten', 'pistachehuis');
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
  if (z.id === 'merel') {
    state.frozen = true;
    input.releasePointer();
    song.start();
  }
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
  if (body.events.landed > 2) puck.land(body.events.landed);
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

  if (area.update(dt, elapsed)) renderer.shadowMap.needsUpdate = true;
  updateParticles(dt);

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl.classList.remove('show');
  }
  if (speechTimer > 0) {
    speechTimer -= dt;
    if (speechTimer <= 0) speechEl.classList.add('hidden');
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
  updateSpeechBubble();
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
window.__puck = { audio, body, areas, state, cam: followCam, enterArea, progress: () => progress, puck, song, area: () => area };
