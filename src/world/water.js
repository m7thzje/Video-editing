import * as THREE from 'three';
import { fxTime } from './fx.js';

// Mooier water: diep/ondiep-kleur, bewegende rimpels (wereldcoördinaten, dus overal even groot),
// zonneglinsteringen, een beetje lucht-spiegeling op afstand en een schuimrandje langs de kant.
// shape 'circle': rand = uv-afstand tot het midden (vijver, fontein); 'strip': rand = boven/onderkant (gracht).

const cache = {};

export function waterMaterial({ shape = 'circle', deep = 0x1f6f8f, shallow = 0x5cc6d6, foam = 0.12 } = {}) {
  const key = `${shape}|${deep}|${shallow}|${foam}`;
  if (cache[key]) return cache[key];
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: fxTime,
        uDeep: { value: new THREE.Color(deep) },
        uShallow: { value: new THREE.Color(shallow) },
        uSky: { value: new THREE.Color(0xcfeaf7) },
        uSun: { value: new THREE.Vector3(-0.5, 0.8, 0.3).normalize() },
        uFoam: { value: foam },
        uStrip: { value: shape === 'strip' ? 1 : 0 },
        uEvening: { value: 0 },
      },
    ]),
    vertexShader: `
      #include <fog_pars_vertex>
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uSun;
      uniform float uFoam;
      uniform float uStrip;
      uniform float uEvening;
      varying vec2 vUv;
      varying vec3 vWorld;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
      }
      float waves(vec2 p) {
        return n(p * 1.3 + vec2(uTime * 0.25, uTime * 0.12)) * 0.6 + n(p * 3.1 - vec2(uTime * 0.18, -uTime * 0.3)) * 0.4;
      }
      void main() {
        vec2 p = vWorld.xz;
        // Normaal uit de golfhoogte
        float e = 0.08;
        float w0 = waves(p);
        vec3 nrm = normalize(vec3(w0 - waves(p + vec2(e, 0.0)), 0.35, w0 - waves(p + vec2(0.0, e))));
        // Afstand tot de rand (0 = midden, 1 = rand)
        float edge = uStrip > 0.5 ? abs(vUv.y - 0.5) * 2.0 : length(vUv - 0.5) * 2.0;
        float depth = smoothstep(1.0, 0.35, edge);
        vec3 col = mix(uShallow, uDeep, depth);
        // Lichte en donkere banden van de golven
        col *= 0.9 + w0 * 0.25;
        // Lucht-spiegeling (fresnel) en zonneglinstering
        vec3 view = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(view, nrm), 0.0), 3.0);
        col = mix(col, uSky, fres * 0.55);
        vec3 refl = reflect(-uSun, nrm);
        float spec = pow(max(dot(refl, view), 0.0), 60.0);
        col += vec3(1.0, 0.97, 0.85) * spec * (1.2 - uEvening * 0.8);
        // Glinsterende stipjes
        float sparkle = step(0.985, n(p * 9.0 + uTime * 0.6)) * (1.0 - uEvening);
        col += sparkle * 0.6;
        // Schuimrandje dat zachtjes meebeweegt
        float foamLine = smoothstep(1.0 - uFoam - 0.05 * sin(uTime * 1.5 + p.x * 3.0 + p.y * 2.0), 1.0, edge);
        col = mix(col, vec3(0.93, 0.97, 1.0), foamLine * 0.85);
        col *= 1.0 - uEvening * 0.45;
        gl_FragColor = vec4(col, 0.88 + foamLine * 0.12);
        #include <fog_fragment>
      }`,
  });
  mat.userData.water = true;
  cache[key] = mat;
  return mat;
}

/** Zet de avondstand voor alle watermaterialen. */
export function setWaterEvening(on) {
  Object.values(cache).forEach((m) => (m.uniforms.uEvening.value = on ? 1 : 0));
}
