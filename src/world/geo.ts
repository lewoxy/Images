import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Sammelt Primitive mit Vertex-Farben und verschmilzt sie zu einer Geometrie.
 * Ein Mesh pro Bereich statt hunderter Einzelmeshes – wenige Draw Calls, flacher
 * „Sticker“-Look ohne Texturen (§15).
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

/** Gemeinsames Material für alle vertex-gefärbten Objekte */
export const vcMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

export function vcMesh(b: GeoBuilder): THREE.Mesh {
  const m = new THREE.Mesh(b.build(), vcMaterial);
  m.matrixAutoUpdate = false;
  m.updateMatrix();
  return m;
}

/** Boden-Quad mit Welt-UVs (Textur kachelt über Raumgrenzen hinweg gleichmäßig) */
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

/**
 * Wände mit Streifentextur: Seitenflächen bekommen Welt-UVs (u entlang der Wand,
 * v = Höhe) und die Vertex-Farbe der Wand; die Oberseiten (Schnittkanten) werden
 * separat als Vertex-Farb-Geometrie ausgegeben.
 */
export class WallBuilder {
  private sides: THREE.BufferGeometry[] = [];
  caps = new GeoBuilder();

  constructor(
    public height: number,
    public period = 0.9,
  ) {}

  /** Wandsegment von (x0,z0) nach (x1,z1) – achsparallel –, Dicke t (symmetrisch zur Linie) */
  seg(x0: number, z0: number, x1: number, z1: number, t: number, color: number, capColor: number, h = this.height, y0 = 0) {
    const alongX = Math.abs(z1 - z0) < 1e-6;
    const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    if (len < 0.01) return;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const w = alongX ? len : t;
    const d = alongX ? t : len;
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(cx, y0 + h / 2, cz);
    // Oberseite entfernen wir nicht – sie liegt unter dem Cap
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const nx = nor.getX(i);
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const u = Math.abs(nx) > 0.5 ? z / this.period : x / this.period;
      uv.setXY(i, u, (y - y0) / h);
    }
    paint(g, color);
    this.sides.push(g);
    // Kappe
    this.caps.box(w + 0.001, 0.06, d + 0.001, capColor, cx, y0 + h, cz);
  }

  buildSides(): THREE.BufferGeometry | null {
    if (this.sides.length === 0) return null;
    const g = mergeGeometries(
      this.sides.map((s) => {
        s.clearGroups();
        return s;
      }),
      false,
    );
    for (const s of this.sides) s.dispose();
    this.sides = [];
    g.computeBoundingSphere();
    return g;
  }
}
