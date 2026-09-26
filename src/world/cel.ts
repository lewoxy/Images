import * as THREE from 'three';

/**
 * Cel-Shading nach Stilhandbuch §6 („FlatKit / Stylized Surface“ nachgebaut):
 *  - drei harte Helligkeitsstufen 0,52 / 0,78 / 1,00 mit Schwellen bei 0,31 / 0,62,
 *  - 15 % richtungsunabhängiges Licht (`_Flatness` ≈ 0,15),
 *  - Flat Shading über Bildschirm-Ableitungen (jede Fläche eine Facette),
 *  - Farbe ausschließlich aus Albedo (Textur × Vertex-Farbe × Grundfarbe), kein Glanz.
 * Wände bekommen zusätzlich einen runden Durchblick um die Spielfigur, damit sie
 * hinter 3-m-Wänden nie verschwindet.
 */

export const CEL = {
  uLight: { value: new THREE.Vector3(-0.34, 0.84, 0.42).normalize() },
  /** Globale Tönung (Tag/Nacht, Blitz) */
  uTint: { value: new THREE.Color(1, 1, 1) },
  /** xyz = Fokuspunkt (Figur), w = Radius des Durchblicks (0 = aus) */
  uCut: { value: new THREE.Vector4(0, 0, 0, 0) },
  uCam: { value: new THREE.Vector3() },
};

export const CEL_STEPS = { stops: [0.31, 0.62], levels: [0.52, 0.78, 1.0], flatness: 0.15 };

const vert = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
#ifdef USE_COLOR
varying vec3 vColor;
#endif
#ifndef FLAT
varying vec3 vNormalW;
#endif
void main() {
  vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  #endif
  vec4 wp = modelMatrix * p;
  vWorld = wp.xyz;
  vUv = uv;
  #ifdef USE_COLOR
  vColor = color;
  #endif
  #ifndef FLAT
  mat3 nm = mat3(modelMatrix);
  #ifdef USE_INSTANCING
  nm = nm * mat3(instanceMatrix);
  #endif
  vNormalW = normalize(nm * normal);
  #endif
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const frag = /* glsl */ `
uniform vec3 diffuse;
uniform float opacity;
uniform vec3 uLight;
uniform vec3 uTint;
uniform vec4 uCut;
uniform vec3 uCam;
#ifdef CEL_MAP
uniform sampler2D map;
#endif
varying vec3 vWorld;
varying vec2 vUv;
#ifdef USE_COLOR
varying vec3 vColor;
#endif
#ifndef FLAT
varying vec3 vNormalW;
#endif
void main() {
  #ifdef CUTAWAY
  if (uCut.w > 0.0 && vWorld.y > 0.28) {
    vec3 ab = uCut.xyz - uCam;
    float t = dot(vWorld - uCam, ab) / dot(ab, ab);
    if (t > 0.0 && t < 0.985) {
      vec3 q = uCam + ab * t;
      if (distance(vWorld, q) < uCut.w) discard;
    }
  }
  #endif
  #ifdef FLAT
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  #else
  vec3 n = normalize(vNormalW);
  #endif
  float lum = ${CEL_STEPS.flatness.toFixed(2)} + ${(1 - CEL_STEPS.flatness).toFixed(2)} * max(dot(n, uLight), 0.0);
  float s = lum < ${CEL_STEPS.stops[0].toFixed(2)} ? ${CEL_STEPS.levels[0].toFixed(2)} : (lum < ${CEL_STEPS.stops[1].toFixed(2)} ? ${CEL_STEPS.levels[1].toFixed(2)} : 1.0);
  vec4 c = vec4(diffuse, opacity);
  #ifdef CEL_MAP
  c *= texture2D(map, vUv);
  #endif
  #ifdef USE_COLOR
  c.rgb *= vColor;
  #endif
  #ifdef ALPHA_TEST
  if (c.a < 0.5) discard;
  #endif
  #ifdef UNLIT
  s = 1.0;
  #endif
  gl_FragColor = vec4(c.rgb * s * uTint, c.a);
  #include <colorspace_fragment>
}
`;

export interface CelOpts {
  map?: THREE.Texture | null;
  color?: number;
  vertexColors?: boolean;
  transparent?: boolean;
  opacity?: number;
  /** Durchblick um die Spielfigur (nur Wände) */
  cutaway?: boolean;
  /** Flat Shading (Standard); false = glatte Normalen (Figuren) */
  flat?: boolean;
  side?: THREE.Side;
  depthWrite?: boolean;
  alphaTest?: boolean;
  unlit?: boolean;
}

export type CelMaterial = THREE.ShaderMaterial & { color: THREE.Color };

export function cel(o: CelOpts = {}): CelMaterial {
  const defines: Record<string, string> = {};
  if (o.flat !== false) defines.FLAT = '';
  if (o.map) defines.CEL_MAP = '';
  if (o.cutaway) defines.CUTAWAY = '';
  if (o.alphaTest) defines.ALPHA_TEST = '';
  if (o.unlit) defines.UNLIT = '';
  const color = new THREE.Color(o.color ?? 0xffffff);
  const m = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    defines,
    uniforms: {
      diffuse: { value: color },
      opacity: { value: o.opacity ?? 1 },
      map: { value: o.map ?? null },
      uLight: CEL.uLight,
      uTint: CEL.uTint,
      uCut: CEL.uCut,
      uCam: CEL.uCam,
    },
    vertexColors: !!o.vertexColors,
    transparent: !!o.transparent,
    side: o.side ?? THREE.FrontSide,
    depthWrite: o.depthWrite ?? !o.transparent,
  }) as CelMaterial;
  // Bequemer Zugriff wie bei den Standardmaterialien (bewusst kein `map`-Feld:
  // das würde three.js' eigene USE_MAP-Pfade einschalten)
  Object.defineProperty(m, 'color', { get: () => color });
  return m;
}

/** Deckkraft eines Cel-Materials setzen */
export function setOpacity(m: THREE.Material, a: number) {
  const sm = m as THREE.ShaderMaterial;
  if (sm.uniforms?.opacity) sm.uniforms.opacity.value = a;
  else (m as THREE.MeshBasicMaterial).opacity = a;
}
