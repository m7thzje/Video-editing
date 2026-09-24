import * as THREE from 'three';

// Algemene kwaliteitsboost voor alle Lambert-materialen, zonder extra textures te downloaden:
// - subtiele vlekjes en korrel op basis van de wereldpositie (geen "plastic" vlakken meer)
// - zachte contactschaduw onderaan muren en meubels (nep-ambient-occlusion bij de vloer)
// Korrel vervaagt op afstand om flikkeren te voorkomen. Uit te zetten per materiaal met
// material.defines = { DETAIL_OFF: '' }.

let installed = false;

export function installDetailShader() {
  if (installed) return;
  installed = true;
  const lib = THREE.ShaderLib.lambert;
  lib.vertexShader = lib.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vDWPos;\nvarying vec3 vDWNormal;')
    .replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vec4 dWorld = vec4(transformed, 1.0);
      vec3 dNrm = objectNormal;
      #ifdef USE_INSTANCING
        dWorld = instanceMatrix * dWorld;
        dNrm = mat3(instanceMatrix) * dNrm;
      #endif
      dWorld = modelMatrix * dWorld;
      vDWPos = dWorld.xyz;
      vDWNormal = normalize(mat3(modelMatrix) * dNrm);`,
    );
  lib.fragmentShader = lib.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      varying vec3 vDWPos;
      varying vec3 vDWNormal;
      float dHash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float dNoise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(dHash(i), dHash(i + vec3(1, 0, 0)), f.x), mix(dHash(i + vec3(0, 1, 0)), dHash(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(dHash(i + vec3(0, 0, 1)), dHash(i + vec3(1, 0, 1)), f.x), mix(dHash(i + vec3(0, 1, 1)), dHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
      }`,
    )
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      #ifndef DETAIL_OFF
      {
        float camDist = length(vDWPos - cameraPosition);
        // Eén ruis-opzoeking (grote vlekken op vloeren, kleine op de rest) + goedkope korrel: licht voor de videokaart
        float up = smoothstep(0.7, 0.95, vDWNormal.y);
        float blotch = dNoise(vDWPos * mix(1.7, 0.45, up));
        float grain = dHash(floor(vDWPos * 48.0)) - 0.5;
        float grainFade = 1.0 - smoothstep(3.0, 11.0, camDist);
        float shade = 1.0 + (blotch - 0.5) * mix(0.14, 0.2, up) + grain * 0.07 * grainFade;
        // Contactschaduw: alleen op schuine/verticale vlakken, vlak boven de vloer
        float side = 1.0 - smoothstep(0.55, 0.85, abs(vDWNormal.y));
        float ao = mix(0.74, 1.0, smoothstep(0.0, 0.5, vDWPos.y));
        shade *= mix(1.0, ao, side);
        diffuseColor.rgb *= shade;
      }
      #endif`,
    );
}

/** Zet de detail-shader uit voor een materiaal (bijv. borden met tekst en gezichten). */
export function noDetail(material) {
  material.defines = { ...(material.defines || {}), DETAIL_OFF: '' };
  return material;
}
