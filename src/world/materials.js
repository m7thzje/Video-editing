import * as THREE from 'three';
import { applyWind } from './fx.js';
import { worldTexture } from './phototex.js';

// Gedeelde lowpoly-materialen (Lambert + flat shading: zacht en snel op telefoons).

export const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

// Kleine procedurele textures (vermenigvuldigd met de materiaalkleur) voor meer detail zonder downloads
function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}

/** Bladerdek: lichte en donkere blaadjes door elkaar. */
const leafTex = canvasTex(64, (ctx, n) => {
  ctx.fillStyle = '#d9d9d9';
  ctx.fillRect(0, 0, n, n);
  for (let i = 0; i < 140; i++) {
    const light = Math.random() < 0.45;
    ctx.fillStyle = light ? 'rgba(255,255,230,0.55)' : 'rgba(0,30,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(Math.random() * n, Math.random() * n, 2 + Math.random() * 3, 1 + Math.random() * 1.5, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}, 2);

/** Schors: verticale groeven. */
const barkTex = canvasTex(64, (ctx, n) => {
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(0, 0, n, n);
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * n;
    ctx.strokeStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 4, n * 0.3, x - 4, n * 0.6, x + 2, n);
    ctx.stroke();
  }
}, 1);

/** Houtnerf voor meubels en planken. */
const grainTex = canvasTex(64, (ctx, n) => {
  ctx.fillStyle = '#ececec';
  ctx.fillRect(0, 0, n, n);
  for (let y = 0; y < n; y += 3) {
    ctx.strokeStyle = `rgba(90,50,20,${0.08 + Math.random() * 0.12})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= n; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.2 + y) * 1.2);
    ctx.stroke();
  }
}, 1);

const withMap = (mat, map) => {
  mat.map = map;
  return mat;
};

export const M = {
  wood: withMap(lambert(0xa86b3c), grainTex),
  woodDark: withMap(lambert(0x7a4a26), grainTex),
  woodLight: withMap(lambert(0xd9a86c), grainTex),
  white: lambert(0xfaf3e8),
  sofa: lambert(0x4f8a8b),
  sofaDark: lambert(0x3f7475),
  mustard: lambert(0xe8b04b),
  coral: lambert(0xe9806e),
  red: lambert(0xd7263d),
  cardboard: lambert(0xc89b62),
  cardboardDark: lambert(0xa87c47),
  tape: lambert(0xe8cf9a),
  metal: lambert(0xdedede),
  metalDark: lambert(0x8d9499),
  cageBase: lambert(0xefe6d8),
  pot: lambert(0xc4643a),
  soil: lambert(0x5a3b22),
  trunk: withMap(lambert(0x8a6644), barkTex),
  leaf: withMap(lambert(0x62ab60), leafTex),
  leafDark: withMap(lambert(0x4e9555), leafTex),
  glass: new THREE.MeshLambertMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.25, depthWrite: false }),
  windowBlue: lambert(0x9fd3ef, { emissive: 0x6fa8c8, emissiveIntensity: 0.25 }),
  gold: lambert(0xf2c230, { emissive: 0x8a5a00, emissiveIntensity: 0.35 }),
  lampShade: new THREE.MeshLambertMaterial({ color: 0xfff0c8, emissive: 0xffc870, emissiveIntensity: 0.6, flatShading: true }),
  grass: lambert(0x8cc56a),
  grassDark: lambert(0x74b35a),
  path: lambert(0xe6d2a8),
  stone: lambert(0xb9b2a6),
  stoneDark: lambert(0x948d82),
  water: new THREE.MeshLambertMaterial({ color: 0x6cc3e0, transparent: true, opacity: 0.85, flatShading: true }),
  treeLeaf: withMap(lambert(0x68b862), leafTex),
  brick: lambert(0xd98b6a),
  roof: lambert(0x9c4a3a),
  roofDark: lambert(0x7d3a2e),
  plaster: lambert(0xf6e7cf),
  fence: lambert(0xf3ead8),
  book: [0xd7263d, 0x3d7ea6, 0xe8b04b, 0x6aa36b, 0x8e6bb0, 0xf09a5a].map((c) => lambert(c)),
  pistachioShell: lambert(0xdcc79b),
  pistachioKernel: lambert(0x93c24a),
  fries: lambert(0xf7cf4a, { emissive: 0x6b4a00, emissiveIntensity: 0.2 }),
  friesBag: lambert(0xe23b3b),
};

// Avondstand: lampen gaan feller branden en ramen lichten warm op
M.lampShade.userData.night = 'lamp';
M.windowBlue.userData.night = 'window';

// Foto-textures op wereldschaal (gras, dakpannen, natuursteen, hout)
worldTexture(M.grass, 'grass', 3.2, 0xf2fff0);
worldTexture(M.grassDark, 'grass-dry', 3.2);
worldTexture(M.roof, 'roof-terracotta', 1.6);
worldTexture(M.roofDark, 'roof-red', 1.6);
worldTexture(M.stone, 'stone-blocks', 1.3);
worldTexture(M.stoneDark, 'stone-rough', 1.3);
worldTexture(M.wood, 'wood-light', 1.2, 0xd9a878);
worldTexture(M.woodDark, 'plywood', 1.2);
worldTexture(M.woodLight, 'oak', 1.2);

// Bladeren wiegen zachtjes in de wind
applyWind(M.leaf);
applyWind(M.leafDark);
applyWind(M.treeLeaf, 0.6);
