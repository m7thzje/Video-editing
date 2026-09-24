import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Prestaties: voeg alle stilstaande meshes van een gebied per materiaal samen tot één mesh.
// Duizenden losse tekenopdrachten worden er zo een paar tientallen.
// Objecten (of hun ouders) met userData.dynamic of userData.noMerge worden overgeslagen,
// net als doorzichtige materialen, instanced meshes, sprites en lijnen.

export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];

  const visit = (obj, dynamic) => {
    if (obj.userData.dynamic) dynamic = true;
    if (!dynamic && obj.isMesh && !obj.isInstancedMesh && !obj.userData.noMerge && obj.visible) {
      const mat = obj.material;
      if (!Array.isArray(mat) && !mat.transparent && !mat.isShaderMaterial && obj.geometry.attributes.uv) {
        const m = new THREE.Matrix4().multiplyMatrices(inv, obj.matrixWorld);
        const flipped = m.determinant() < 0;
        const key = `${mat.uuid}|${obj.castShadow}|${obj.receiveShadow}|${flipped}`;
        if (!buckets.has(key)) buckets.set(key, { mat, cast: obj.castShadow, receive: obj.receiveShadow, items: [] });
        buckets.get(key).items.push({ obj, m });
      }
    }
    for (const c of obj.children) visit(c, dynamic);
  };
  visit(root, false);

  let merged = 0;
  for (const b of buckets.values()) {
    if (b.items.length < 2) continue;
    const geos = b.items.map(({ obj, m }) => {
      let g = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      if (!g.attributes.normal) g.computeVertexNormals();
      g.applyMatrix4(m);
      g.morphAttributes = {};
      // Gespiegelde objecten (liftspiegel): driehoeken omdraaien zodat de voorkant klopt
      if (m.determinant() < 0) {
        for (const attr of Object.values(g.attributes)) {
          const a = attr.array;
          const n = attr.itemSize;
          for (let t = 0; t < attr.count; t += 3) {
            for (let k = 0; k < n; k++) {
              const i1 = (t + 1) * n + k;
              const i2 = (t + 2) * n + k;
              const tmp = a[i1];
              a[i1] = a[i2];
              a[i2] = tmp;
            }
          }
        }
      }
      return g;
    });
    const geo = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    root.add(mesh);
    b.items.forEach(({ obj }) => victims.push(obj));
    merged += b.items.length;
  }
  victims.forEach((o) => o.parent && o.parent.remove(o));
  return merged;
}
