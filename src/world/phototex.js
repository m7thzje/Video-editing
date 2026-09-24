import * as THREE from 'three';

// Foto-textures (public/assets/textures) op wereldschaal: de textuur wordt geprojecteerd langs de as
// waar een vlak naar wijst (boven: xz, zijkant: zy of xy). Zo is een baksteen of dakpan overal even groot,
// ook op grote samengevoegde blokken, zonder dat elk blok eigen uv's nodig heeft. Eén opzoeking per pixel.

const DIR = `${import.meta.env.BASE_URL}assets/textures/`;
const loader = new THREE.TextureLoader();
const cache = {};

export function photo(name) {
  if (!cache[name]) {
    const t = loader.load(`${DIR}${name}.jpg`);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    cache[name] = t;
  }
  return cache[name];
}

/**
 * Geeft een materiaal een foto-textuur op wereldschaal.
 * size: hoeveel meter één herhaling van de textuur beslaat. tint: kleur waarmee de foto vermenigvuldigd wordt.
 */
export function worldTexture(material, name, size = 2, tint = 0xffffff) {
  material.map = photo(name);
  material.color.set(tint);
  const scale = 1 / size;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.uniforms.uWScale = { value: scale };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWMPos;\nvarying vec3 vWMNrm;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 wmP = vec4(transformed, 1.0);
        vec3 wmN = objectNormal;
        #ifdef USE_INSTANCING
          wmP = instanceMatrix * wmP;
          wmN = mat3(instanceMatrix) * wmN;
        #endif
        vWMPos = (modelMatrix * wmP).xyz;
        vWMNrm = normalize(mat3(modelMatrix) * wmN);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWScale;\nvarying vec3 vWMPos;\nvarying vec3 vWMNrm;')
      .replace(
        '#include <map_fragment>',
        `vec3 wmA = abs(vWMNrm);
        vec2 wmUv = (wmA.y > wmA.x && wmA.y > wmA.z) ? vWMPos.xz : (wmA.x > wmA.z ? vWMPos.zy : vWMPos.xy);
        diffuseColor *= texture2D(map, wmUv * uWScale);`,
      );
  };
  const key = material.customProgramCacheKey ? material.customProgramCacheKey() : '';
  material.customProgramCacheKey = () => `${key}|wm${scale}`;
  material.needsUpdate = true;
  return material;
}
