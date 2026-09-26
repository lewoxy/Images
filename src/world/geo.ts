import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { cel } from './cel';

/**
 * Sammelt Primitive mit Vertex-Farben und verschmilzt sie zu einer Geometrie.
 * Ein Mesh pro Bereich statt hunderter Einzelmeshes – wenige Draw Calls. Wie im
 * Original hat jedes Objekt ein Material; Farbe kommt aus Vertex-Farbe bzw. Textur.
 */

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

export interface XForm {
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

function paint(g: THREE.BufferGeometry, color: number, topColor?: number, bottomColor?: number) {
  const n = g.attributes.normal as THREE.BufferAttribute;
  const count = g.attributes.position.count;
  const arr = new Float32Array(count * 3);
  _c.set(color);
  const r = _c.r,
    gg = _c.g,
    b = _c.b;
  let tr = r,
    tg = gg,
    tb = b;
  if (topColor !== undefined) {
    _c.set(topColor);
    tr = _c.r;
    tg = _c.g;
    tb = _c.b;
  }
  let br = r,
    bg = gg,
    bb = b;
  if (bottomColor !== undefined) {
    _c.set(bottomColor);
    br = _c.r;
    bg = _c.g;
    bb = _c.b;
  }
  for (let i = 0; i < count; i++) {
    const ny = n ? n.getY(i) : 0;
    if (ny > 0.7) {
      arr[i * 3] = tr;
      arr[i * 3 + 1] = tg;
      arr[i * 3 + 2] = tb;
    } else if (ny < -0.7) {
      arr[i * 3] = br;
      arr[i * 3 + 1] = bg;
      arr[i * 3 + 2] = bb;
    } else {
      arr[i * 3] = r;
      arr[i * 3 + 1] = gg;
      arr[i * 3 + 2] = b;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}

function normalize(g: THREE.BufferGeometry): THREE.BufferGeometry {
  // Einheitliche Attribute für mergeGeometries: indexiert, position/normal/color
  let out = g;
  if (!out.index) {
    const idx: number[] = [];
    for (let i = 0; i < out.attributes.position.count; i++) idx.push(i);
    out.setIndex(idx);
  }
  for (const k of Object.keys(out.attributes)) {
    if (k !== 'position' && k !== 'normal' && k !== 'color') out.deleteAttribute(k);
  }
  out.morphAttributes = {};
  out.clearGroups();
  return out;
}

export class GeoBuilder {
  parts: THREE.BufferGeometry[] = [];

  add(g: THREE.BufferGeometry, color: number, x: number, y: number, z: number, t: XForm = {}, topColor?: number, bottomColor?: number) {
    _e.set(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0);
    _q.setFromEuler(_e);
    _s.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    _p.set(x, y, z);
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    paint(g, color, topColor, bottomColor);
    this.parts.push(normalize(g));
    return this;
  }

  /** Quader; (x, y, z) = Mitte der Grundfläche (y = Unterkante) */
  box(w: number, h: number, d: number, color: number, x: number, y: number, z: number, t: XForm = {}, topColor?: number) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    return this.add(g, color, x, y, z, t, topColor);
  }

  /** Abgerundeter Quader; y = Unterkante */
  rbox(w: number, h: number, d: number, r: number, color: number, x: number, y: number, z: number, t: XForm = {}, topColor?: number) {
    const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
    g.translate(0, h / 2, 0);
    return this.add(g, color, x, y, z, t, topColor);
  }

  /** Zylinder; y = Unterkante */
  cyl(rTop: number, rBot: number, h: number, color: number, x: number, y: number, z: number, seg = 14, t: XForm = {}, topColor?: number) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    g.translate(0, h / 2, 0);
    return this.add(g, color, x, y, z, t, topColor);
  }

  /** Kugel; (x, y, z) = Mittelpunkt */
  sphere(r: number, color: number, x: number, y: number, z: number, seg = 14, t: XForm = {}) {
    const g = new THREE.SphereGeometry(r, seg, Math.max(6, Math.floor(seg * 0.7)));
    return this.add(g, color, x, y, z, t);
  }

  /** Halbkugel (Kuppel nach oben); (x, y, z) = Mittelpunkt der Grundfläche */
  dome(r: number, color: number, x: number, y: number, z: number, seg = 14, t: XForm = {}) {
    const g = new THREE.SphereGeometry(r, seg, Math.max(5, Math.floor(seg * 0.5)), 0, Math.PI * 2, 0, Math.PI / 2);
    return this.add(g, color, x, y, z, t);
  }

  cone(r: number, h: number, color: number, x: number, y: number, z: number, seg = 12, t: XForm = {}) {
    const g = new THREE.ConeGeometry(r, h, seg);
    g.translate(0, h / 2, 0);
    return this.add(g, color, x, y, z, t);
  }

  capsule(r: number, len: number, color: number, x: number, y: number, z: number, t: XForm = {}) {
    const g = new THREE.CapsuleGeometry(r, len, 4, 10);
    return this.add(g, color, x, y, z, t);
  }

  torus(r: number, tube: number, color: number, x: number, y: number, z: number, t: XForm = {}) {
    const g = new THREE.TorusGeometry(r, tube, 8, 20);
    return this.add(g, color, x, y, z, t);
  }

  /** Flache Scheibe auf dem Boden (Teppich, Markierung) */
  disc(r: number, color: number, x: number, y: number, z: number, seg = 24) {
    const g = new THREE.CircleGeometry(r, seg);
    g.rotateX(-Math.PI / 2);
    return this.add(g, color, x, y, z);
  }

  /** Flaches Rechteck auf dem Boden */
  quad(w: number, d: number, color: number, x: number, y: number, z: number, ry = 0) {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    return this.add(g, color, x, y, z, { ry });
  }

  /** Einzelnes Viereck (Eckpunkte gegen den Uhrzeigersinn von außen gesehen) */
  face(p: number[][], color: number) {
    const g = new THREE.BufferGeometry();
    const a = new THREE.Vector3(...p[0]);
    const b = new THREE.Vector3(...p[1]);
    const c = new THREE.Vector3(...p[2]);
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p.flat(), 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    paint(g, color);
    this.parts.push(normalize(g));
    return this;
  }

  merge(other: GeoBuilder) {
    this.parts.push(...other.parts);
    other.parts = [];
    return this;
  }

  /** Zusammengesetztes Objekt im lokalen System bauen und als Ganzes platzieren/drehen */
  group(fn: (g: GeoBuilder) => void, x: number, y: number, z: number, ry = 0, scale = 1) {
    const sub = new GeoBuilder();
    fn(sub);
    if (sub.empty) return this;
    const g = sub.build();
    _e.set(0, ry, 0);
    _q.setFromEuler(_e);
    _s.set(scale, scale, scale);
    _p.set(x, y, z);
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    this.parts.push(g);
    return this;
  }

  get empty() {
    return this.parts.length === 0;
  }

  build(): THREE.BufferGeometry {
    if (this.parts.length === 0) return new THREE.BufferGeometry();
    const g = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    g.computeBoundingSphere();
    return g;
  }
}

/** Gemeinsames Cel-Material für alle vertex-gefärbten Objekte (flat shaded) */
export const vcMaterial = cel({ vertexColors: true });
/** Figuren: glatte Normalen, trotzdem drei harte Stufen */
export const vcSmooth = cel({ vertexColors: true, flat: false });
/** Wandoberkanten: vertex-gefärbt, mit Durchblick um die Spielfigur */
export const vcCutaway = cel({ vertexColors: true, cutaway: true });

export function vcMesh(b: GeoBuilder): THREE.Mesh {
  const m = new THREE.Mesh(b.build(), vcMaterial);
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  return m;
}

/** Boden-Quad mit UVs in Kachelgröße (Textur läuft über Raumgrenzen hinweg weiter) */
export function floorGeometry(x0: number, x1: number, z0: number, z1: number, tile: number, y = 0): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0]);
  const nor = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
  const uv = new Float32Array([x0 / tile, -z1 / tile, x1 / tile, -z1 / tile, x1 / tile, -z0 / tile, x0 / tile, -z0 / tile]);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeBoundingSphere();
  return g;
}

/** Textur-Streifen auf dem Boden (Läufer, Teppich): u entlang der Länge */
export function stripGeometry(x0: number, x1: number, z0: number, z1: number, uLen: number, alongX: boolean, y = 0.01): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0]);
  const nor = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
  const L = alongX ? (x1 - x0) / uLen : (z1 - z0) / uLen;
  const uv = alongX ? [0, 0, L, 0, L, 1, 0, 1] : [0, 1, 0, 0, L, 0, L, 1];
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeBoundingSphere();
  return g;
}

/** Wandseite: Material-Schlüssel und optionale Tönung (Vertex-Farbe) */
export interface WallFace {
  mat: string;
  tint?: number;
}

interface Bucket {
  pos: number[];
  nor: number[];
  uv: number[];
  col: number[];
  idx: number[];
}

/**
 * Wände nach Stilhandbuch (Höhe 3,0, Stärke 0,3): achsparallele Segmente, deren
 * beide Seiten eigene Materialien bekommen (z. B. innen Zimmertapete, außen
 * Flurwand). UV: u = Weltkoordinate entlang der Wand / Periode (Muster laufen
 * über Segmentgrenzen weiter), v = Höhe / Wandhöhe (Sockel bleibt unten).
 * Oberseiten und Stirnflächen landen vertex-gefärbt in `caps`.
 */
export class Walls {
  private buckets = new Map<string, Bucket>();
  caps = new GeoBuilder();

  constructor(
    public height = 3,
    public period = 1.5,
  ) {}

  private bucket(k: string): Bucket {
    let b = this.buckets.get(k);
    if (!b) {
      b = { pos: [], nor: [], uv: [], col: [], idx: [] };
      this.buckets.set(k, b);
    }
    return b;
  }

  private quad(face: WallFace, p: number[][], n: number[], u0: number, u1: number, v0: number, v1: number) {
    const b = this.bucket(face.mat);
    const base = b.pos.length / 3;
    _c.set(face.tint ?? 0xffffff);
    const uvs = [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v1],
    ];
    for (let i = 0; i < 4; i++) {
      b.pos.push(p[i][0], p[i][1], p[i][2]);
      b.nor.push(n[0], n[1], n[2]);
      b.uv.push(uvs[i][0], uvs[i][1]);
      b.col.push(_c.r, _c.g, _c.b);
    }
    b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  /**
   * Segment von (x0,z0) nach (x1,z1), symmetrisch zur Linie mit Stärke t.
   * `neg` = Seite mit Normale nach −z (Wand entlang x) bzw. −x (Wand entlang z),
   * `pos` = gegenüberliegende Seite. null = Seite weglassen (verdeckt).
   */
  seg(x0: number, z0: number, x1: number, z1: number, t: number, neg: WallFace | null, pos: WallFace | null, capColor: number, h = this.height, y0 = 0) {
    const alongX = Math.abs(z1 - z0) < 1e-6;
    const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
    const a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    if (a1 - a0 < 0.01) return;
    const c = alongX ? z0 : x0;
    const lo = c - t / 2;
    const hi = c + t / 2;
    const yA = y0;
    const yB = y0 + h;
    const u0 = a0 / this.period;
    const u1 = a1 / this.period;
    const v0 = yA / this.height;
    const v1 = yB / this.height;
    if (alongX) {
      if (neg) this.quad(neg, [[a1, yA, lo], [a0, yA, lo], [a0, yB, lo], [a1, yB, lo]], [0, 0, -1], -u1, -u0, v0, v1);
      if (pos) this.quad(pos, [[a0, yA, hi], [a1, yA, hi], [a1, yB, hi], [a0, yB, hi]], [0, 0, 1], u0, u1, v0, v1);
      this.caps.face([[a0, yB, hi], [a1, yB, hi], [a1, yB, lo], [a0, yB, lo]], capColor);
      this.caps.face([[a0, yA, lo], [a0, yA, hi], [a0, yB, hi], [a0, yB, lo]], capColor);
      this.caps.face([[a1, yA, hi], [a1, yA, lo], [a1, yB, lo], [a1, yB, hi]], capColor);
    } else {
      if (neg) this.quad(neg, [[lo, yA, a0], [lo, yA, a1], [lo, yB, a1], [lo, yB, a0]], [-1, 0, 0], u0, u1, v0, v1);
      if (pos) this.quad(pos, [[hi, yA, a1], [hi, yA, a0], [hi, yB, a0], [hi, yB, a1]], [1, 0, 0], -u1, -u0, v0, v1);
      this.caps.face([[lo, yB, a1], [hi, yB, a1], [hi, yB, a0], [lo, yB, a0]], capColor);
      this.caps.face([[hi, yA, a0], [lo, yA, a0], [lo, yB, a0], [hi, yB, a0]], capColor);
      this.caps.face([[lo, yA, a1], [hi, yA, a1], [hi, yB, a1], [lo, yB, a1]], capColor);
    }
  }

  /** Meshes je Material; `mats` liefert das Material zum Schlüssel */
  build(mats: (key: string) => THREE.Material, capMat: THREE.Material = vcCutaway): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [k, b] of this.buckets) {
      if (!b.idx.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.setIndex(b.idx);
      g.computeBoundingSphere();
      out.push(new THREE.Mesh(g, mats(k)));
    }
    this.buckets.clear();
    if (!this.caps.empty) out.push(new THREE.Mesh(this.caps.build(), capMat));
    return out;
  }
}
