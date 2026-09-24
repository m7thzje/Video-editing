import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lambert, M } from './materials.js';

// Groningse dingen: de Martinitoren, de stadsvlag (groen-wit-groen), fietsen,
// grachtenpanden met trapgevels en een stadsgezicht voor het uitzicht vanaf de 9e verdieping.

const G = {
  brick: lambert(0x9a5f45),
  brickLight: lambert(0xb9785a),
  stoneTower: lambert(0xd8c9a8),
  spire: lambert(0x4d6b62),
  clock: lambert(0xf4efe2),
  gold: lambert(0xf2c230, { emissive: 0x8a5a00, emissiveIntensity: 0.4 }),
  green: new THREE.MeshLambertMaterial({ color: 0x1f8a4c, side: THREE.DoubleSide }),
  white: new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  bikeFrames: [0x2b2f3a, 0xd7263d, 0x3d7ea6, 0x6aa36b, 0xe8b04b, 0x8e6bb0].map((c) => lambert(c)),
  tyre: lambert(0x1b1b1d),
  facade: [0xa65b43, 0x7d4a3a, 0xc98b5e, 0x8c5a4a, 0xb86a4e, 0x6f4c3e].map((c) => lambert(c)),
  window: lambert(0x2f3e4c, { emissive: 0x1a2530, emissiveIntensity: 0.3 }),
  roofTile: lambert(0x7d3a2e),
};

/** De Martinitoren ("d'Olle Grieze"), in lowpoly. Hoogte ~ 30 * s. */
export function makeMartinitoren(s = 1) {
  const g = new THREE.Group();
  const add = (geo, mat, y) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(5, 10, 5), G.brick, 5);
  add(new THREE.BoxGeometry(4.4, 6, 4.4), G.brickLight, 13);
  add(new THREE.BoxGeometry(3.6, 4, 3.6), G.stoneTower, 18);
  add(new THREE.CylinderGeometry(1.6, 1.8, 3, 8), G.stoneTower, 21.5);
  add(new THREE.CylinderGeometry(1.1, 1.3, 2.2, 8), G.stoneTower, 24.1);
  add(new THREE.ConeGeometry(1.0, 4.5, 8), G.spire, 27.4);
  add(new THREE.SphereGeometry(0.25, 8, 6), G.gold, 29.8);
  // Klokken op vier zijden
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), G.clock);
    const a = (i * Math.PI) / 2;
    c.position.set(Math.sin(a) * 2.21, 13.5, Math.cos(a) * 2.21);
    c.rotation.y = a;
    g.add(c);
  }
  // Ramen/nissen
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    for (const y of [3, 7, 16.5]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2), G.window);
      w.position.set(Math.sin(a) * (y > 15 ? 1.81 : y > 10 ? 2.21 : 2.51), y, Math.cos(a) * (y > 15 ? 1.81 : y > 10 ? 2.21 : 2.51));
      w.rotation.y = a;
      g.add(w);
    }
  }
  g.scale.setScalar(s);
  return g;
}

/** Vlaggenmast met de Groningse stadsvlag (groen-wit-groen). */
export function makeGroningenFlag(height = 4) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, height, 6), M.white);
  pole.position.y = height / 2;
  pole.castShadow = true;
  g.add(pole);
  const flag = new THREE.Group();
  flag.position.set(0.02, height - 0.35, 0);
  const w = 1.1;
  [[G.green, 0.2], [G.white, 0], [G.green, -0.2]].forEach(([mat, y]) => {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.2, 6, 1), mat);
    band.position.set(w / 2, y, 0);
    flag.add(band);
  });
  g.add(flag);
  g.userData.flag = flag;
  g.update = (dt, t) => {
    flag.rotation.y = Math.sin(t * 2 + g.position.x) * 0.25;
    flag.rotation.x = Math.sin(t * 3.3 + g.position.z) * 0.05;
  };
  return g;
}

/** Eenvoudige lowpoly-fiets (samengevoegd tot 2 meshes). */
export function makeBike(color = 0) {
  const frame = [];
  const tyres = [];
  const wheel = (x) => tyres.push(new THREE.TorusGeometry(0.3, 0.035, 5, 14).translate(x, 0.33, 0));
  wheel(-0.52);
  wheel(0.52);
  const bar = (x0, y0, x1, y1, r = 0.02) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const geo = new THREE.CylinderGeometry(r, r, len, 5);
    geo.rotateZ(-Math.atan2(x1 - x0, y1 - y0));
    geo.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
    frame.push(geo);
  };
  bar(-0.52, 0.33, -0.1, 0.33);
  bar(-0.1, 0.33, 0.38, 0.72);
  bar(-0.52, 0.33, -0.18, 0.75);
  bar(-0.18, 0.75, 0.38, 0.72);
  bar(-0.1, 0.33, -0.2, 0.8);
  bar(0.38, 0.72, 0.52, 0.33);
  bar(0.38, 0.72, 0.42, 0.95);
  frame.push(new THREE.BoxGeometry(0.06, 0.03, 0.5).translate(0.42, 0.97, 0));
  frame.push(new THREE.BoxGeometry(0.24, 0.05, 0.12).translate(-0.2, 0.83, 0));
  frame.push(new THREE.BoxGeometry(0.3, 0.02, 0.2).translate(-0.5, 0.66, 0)); // bagagedrager
  const g = new THREE.Group();
  const f = new THREE.Mesh(mergeGeometries(frame), G.bikeFrames[color % G.bikeFrames.length]);
  const t = new THREE.Mesh(mergeGeometries(tyres), G.tyre);
  f.castShadow = t.castShadow = true;
  g.add(f, t);
  return g;
}

/** Grachtenpand met trapgevel. Voorkant richting +z. */
export function makeCanalHouse(w, h, color = 0) {
  const g = new THREE.Group();
  const mat = G.facade[color % G.facade.length];
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), mat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // Trapgevel
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const sw = w * (1 - (i + 1) / (steps + 1));
    const st = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.6, 0.35), mat);
    st.position.set(0, h + 0.3 + i * 0.6, 2.85);
    g.add(st);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.3, 5.4), G.roofTile);
  roof.position.set(0, h + 0.1, -0.2);
  g.add(roof);
  // Ramen met witte kozijnen
  const rows = Math.floor(h / 2.4);
  const cols = Math.max(1, Math.floor(w / 1.4));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + (w / cols) * (c + 0.5);
      const y = 1.4 + r * 2.4;
      const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.3), M.white);
      fr.position.set(x, y, 3.01);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.1), G.window);
      gl.position.set(x, y, 3.02);
      g.add(fr, gl);
    }
  }
  return g;
}

/**
 * Stadsgezicht voor het uitzicht vanaf hoog: daken, bomen, een gracht en de Martinitoren.
 * `groundY` is de hoogte van de straat onder de kijker (negatief).
 */
export function makeCityView(groundY = -25, { towerPos = new THREE.Vector3(10, 0, 70), radius = 90, exclude = null } = {}) {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.5, radius * 2.5), M.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = groundY;
  g.add(ground);
  const canal = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.5, 5), M.water);
  canal.rotation.x = -Math.PI / 2;
  canal.position.set(0, groundY + 0.05, 38);
  g.add(canal);

  // Daken en huizen (instanced)
  const houseGeo = new THREE.BoxGeometry(1, 1, 1);
  houseGeo.translate(0, 0.5, 0);
  const roofGeo = new THREE.ConeGeometry(0.75, 0.6, 4);
  roofGeo.rotateY(Math.PI / 4);
  roofGeo.translate(0, 0.3, 0);
  const spots = [];
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 160; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 14 + rnd() * radius;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (exclude && exclude(x, z)) continue;
    if (Math.abs(z - 38) < 4) continue;
    spots.push([x, z, 3 + rnd() * 5, 4 + rnd() * 4, 6 + rnd() * 10, Math.floor(rnd() * 6)]);
  }
  const houses = new THREE.InstancedMesh(houseGeo, new THREE.MeshLambertMaterial({ flatShading: true }), spots.length);
  const roofs = new THREE.InstancedMesh(roofGeo, G.roofTile, spots.length);
  const trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M.treeLeaf, spots.length);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  const cols = [0xa65b43, 0xd8c9a8, 0xc98b5e, 0xe7ddd0, 0x8c5a4a, 0xb9785a];
  spots.forEach(([x, z, w, dd, h, ci], i) => {
    houses.setMatrixAt(i, m.compose(new THREE.Vector3(x, groundY, z), new THREE.Quaternion(), new THREE.Vector3(w, h, dd)));
    houses.setColorAt(i, c.setHex(cols[ci]));
    roofs.setMatrixAt(i, m.compose(new THREE.Vector3(x, groundY + h, z), new THREE.Quaternion(), new THREE.Vector3(w * 1.35, 3, dd * 1.35)));
    trees.setMatrixAt(i, m.compose(new THREE.Vector3(x + w, groundY + 2, z + dd), new THREE.Quaternion(), new THREE.Vector3(2.2, 2.4, 2.2)));
  });
  g.add(houses, roofs, trees);

  const tower = makeMartinitoren(1.4);
  tower.position.set(towerPos.x, groundY, towerPos.z);
  g.add(tower);
  return g;
}

/** Lowpoly auto (voor de parkeerplaats). Lengte langs z. */
export function makeCar(color = 0x222222) {
  const g = new THREE.Group();
  const paint = lambert(color);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 3.9), paint);
  body.position.y = 0.55;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 2.1), paint);
  cabin.position.set(0, 1.12, -0.2);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.4, 1.9), lambert(0x2f3e4c, { emissive: 0x1a2530, emissiveIntensity: 0.3 }));
  glass.position.set(0, 1.14, -0.2);
  body.castShadow = cabin.castShadow = true;
  g.add(body, cabin, glass);
  const wheel = new THREE.CylinderGeometry(0.33, 0.33, 0.25, 10);
  wheel.rotateZ(Math.PI / 2);
  [[-0.8, 1.25], [0.8, 1.25], [-0.8, -1.25], [0.8, -1.25]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheel, G.tyre);
    w.position.set(x, 0.33, z);
    g.add(w);
  });
  [-0.55, 0.55].forEach((x) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), lambert(0xd7263d, { emissive: 0x800000, emissiveIntensity: 0.4 }));
    l.position.set(x, 0.65, -1.96);
    g.add(l);
  });
  return g;
}
