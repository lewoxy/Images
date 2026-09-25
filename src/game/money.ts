import * as THREE from 'three';
import { GeoBuilder, vcMaterial } from '../world/geo';
import { C } from '../config/palette';
import { BUNDLE_VALUE, STACK_SIZE } from '../config/balance';

/**
 * Physisches Bargeld (§2, Regel 1): Geld liegt als Bündel auf Stapeln à 10
 * Einheiten und muss abgelaufen werden. Alle Bündel der Welt teilen sich ein
 * InstancedMesh (§16: „Instanced Meshes für Geldstapel“).
 */

const BW = 0.64;
const BH = 0.14;
const BD = 0.36;

export class MoneyPile {
  bundles: number[] = [];
  dirty = true;
  constructor(
    public id: string,
    public x: number,
    public z: number,
    public cols: number,
    public rows: number,
    public y = 0.02,
  ) {}

  get total() {
    let s = 0;
    for (const b of this.bundles) s += b;
    return s;
  }

  get capacity() {
    return this.cols * this.rows * STACK_SIZE;
  }

  /** Radius der Grundfläche (für den Einsammel-Test) */
  get radius() {
    return Math.max(this.cols * (BW + 0.08), this.rows * (BD + 0.08)) * 0.5 + 0.2;
  }

  slotPos(i: number) {
    const stack = Math.floor(i / STACK_SIZE);
    const level = i % STACK_SIZE;
    const c = stack % this.cols;
    const r = Math.floor(stack / this.cols) % this.rows;
    const ox = (c - (this.cols - 1) / 2) * (BW + 0.08);
    const oz = (r - (this.rows - 1) / 2) * (BD + 0.08);
    return { x: this.x + ox, y: this.y + level * BH, z: this.z + oz };
  }
}

interface Flying {
  x0: number;
  y0: number;
  z0: number;
  t: number;
  dur: number;
  value: number;
  target: () => { x: number; y: number; z: number };
  done: (v: number) => void;
  spin: number;
}

export class MoneySystem {
  piles: MoneyPile[] = [];
  private mesh: THREE.InstancedMesh;
  private flying: Flying[] = [];
  private dirty = true;
  private readonly max = 3000;
  private _m = new THREE.Matrix4();
  private _q = new THREE.Quaternion();
  private _e = new THREE.Euler();
  private _s = new THREE.Vector3(1, 1, 1);
  private _p = new THREE.Vector3();
  private collectAcc = new Map<MoneyPile, number>();

  constructor(scene: THREE.Scene) {
    const b = new GeoBuilder();
    b.box(BW, BH * 0.92, BD, C.cashBill, 0, 0, 0, {}, 0x55e068);
    b.box(0.13, BH * 0.96, BD + 0.012, C.cashBand, 0, -0.002, 0);
    b.box(BW - 0.12, 0.01, BD - 0.1, C.cashBillDark, 0, BH * 0.92, 0);
    this.mesh = new THREE.InstancedMesh(b.build(), vcMaterial, this.max);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
  }

  createPile(id: string, x: number, z: number, cols: number, rows: number): MoneyPile {
    const p = new MoneyPile(id, x, z, cols, rows);
    this.piles.push(p);
    return p;
  }

  add(p: MoneyPile, amount: number) {
    if (amount <= 0) return;
    let rest = Math.round(amount);
    while (rest > 0) {
      const v = Math.min(BUNDLE_VALUE, rest);
      if (p.bundles.length < p.capacity) p.bundles.push(v);
      else p.bundles[Math.floor(Math.random() * p.bundles.length)] += v;
      rest -= v;
    }
    this.dirty = true;
  }

  /** Nimmt Bündel vom Stapel und lässt sie zum Ziel fliegen. */
  collect(p: MoneyPile, dt: number, target: () => { x: number; y: number; z: number }, done: (v: number) => void, rate = 34) {
    if (p.bundles.length === 0) return false;
    let acc = (this.collectAcc.get(p) ?? 0) + dt * rate;
    let took = false;
    while (acc >= 1 && p.bundles.length > 0) {
      acc -= 1;
      const i = p.bundles.length - 1;
      const pos = p.slotPos(i);
      const v = p.bundles.pop()!;
      this.flying.push({ x0: pos.x, y0: pos.y, z0: pos.z, t: 0, dur: 0.24 + Math.random() * 0.08, value: v, target, done, spin: (Math.random() - 0.5) * 8 });
      took = true;
    }
    // Wenn nur noch wenig liegt, mindestens ein Bündel sofort nehmen
    if (!took && p.bundles.length > 0 && acc > 0.4) {
      acc = 1;
    }
    this.collectAcc.set(p, acc);
    this.dirty = true;
    return true;
  }

  /** Rein optisch: Bündel von A nach B (z. B. Bezahlen an einer Platte) */
  fly(from: { x: number; y: number; z: number }, target: () => { x: number; y: number; z: number }, done: () => void = () => {}) {
    if (this.flying.length > 200) return;
    this.flying.push({ x0: from.x, y0: from.y, z0: from.z, t: 0, dur: 0.3, value: 0, target, done: () => done(), spin: (Math.random() - 0.5) * 8 });
  }

  resetAccum(p: MoneyPile) {
    this.collectAcc.set(p, 0.99);
  }

  clearAll() {
    for (const p of this.piles) p.bundles = [];
    this.flying = [];
    this.dirty = true;
  }

  update(dt: number) {
    // Fliegende Bündel
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt;
      if (f.t >= f.dur) {
        this.flying.splice(i, 1);
        this.dirty = true;
        f.done(f.value);
      }
    }
    if (!this.dirty && this.flying.length === 0) return;
    let n = 0;
    const m = this._m;
    for (const p of this.piles) {
      for (let i = 0; i < p.bundles.length && n < this.max; i++) {
        const pos = p.slotPos(i);
        this._p.set(pos.x, pos.y, pos.z);
        this._q.identity();
        m.compose(this._p, this._q, this._s);
        this.mesh.setMatrixAt(n++, m);
      }
    }
    for (const f of this.flying) {
      if (n >= this.max) break;
      const k = f.t / f.dur;
      const tg = f.target();
      const e = k * k * (3 - 2 * k);
      const x = f.x0 + (tg.x - f.x0) * e;
      const z = f.z0 + (tg.z - f.z0) * e;
      const y = f.y0 + (tg.y - f.y0) * e + Math.sin(k * Math.PI) * 1.4;
      this._p.set(x, y, z);
      this._e.set(f.spin * k, f.spin * k * 0.5, 0);
      this._q.setFromEuler(this._e);
      const s = 1 - k * 0.3;
      this._s.set(s, s, s);
      m.compose(this._p, this._q, this._s);
      this._s.set(1, 1, 1);
      this.mesh.setMatrixAt(n++, m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.dirty = false;
  }
}
