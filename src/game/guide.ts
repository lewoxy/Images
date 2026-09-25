import * as THREE from 'three';
import { GeoBuilder, vcMaterial } from '../world/geo';
import type { Nav, Pt } from './nav';

/** Bodennavigation über gelbe Chevron-Pfeile (§14) plus hüpfender Pfeil über dem Ziel. */
export class Guide {
  private chev: THREE.InstancedMesh;
  private arrow: THREE.Mesh;
  private path: Pt[] = [];
  private lastFrom = { x: 1e9, z: 1e9 };
  private lastTo: Pt | null = null;
  private t = 0;
  private recalc = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3(1, 1, 1);

  constructor(scene: THREE.Scene, mat: THREE.Material) {
    const g = new THREE.PlaneGeometry(1.1, 1.1);
    g.rotateX(-Math.PI / 2);
    this.chev = new THREE.InstancedMesh(g, mat, 24);
    this.chev.count = 0;
    this.chev.frustumCulled = false;
    this.chev.renderOrder = 3;
    scene.add(this.chev);
    const b = new GeoBuilder();
    b.cone(0.55, 0.8, 0xffc62b, 0, 0, 0, 4, { rx: Math.PI, ry: Math.PI / 4 });
    b.box(0.46, 0.7, 0.46, 0xffc62b, 0, 0.0, 0, { ry: Math.PI / 4 });
    this.arrow = new THREE.Mesh(b.build(), vcMaterial);
    this.arrow.visible = false;
    scene.add(this.arrow);
  }

  update(dt: number, from: Pt, to: Pt | null, nav: Nav) {
    this.t += dt;
    if (!to) {
      this.chev.count = 0;
      this.arrow.visible = false;
      this.lastTo = null;
      return;
    }
    this.arrow.visible = true;
    this.arrow.position.set(to.x, 2.4 + Math.abs(Math.sin(this.t * 4)) * 0.5, to.z);
    this.arrow.rotation.y = this.t * 2;
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    if (dist < 2.2) {
      this.chev.count = 0;
      return;
    }
    this.recalc -= dt;
    const moved = Math.hypot(from.x - this.lastFrom.x, from.z - this.lastFrom.z);
    const changed = !this.lastTo || this.lastTo.x !== to.x || this.lastTo.z !== to.z;
    if (changed || moved > 0.8 || this.recalc <= 0) {
      this.path = [{ ...from }, ...nav.routeTo(from, to)];
      this.lastFrom = { ...from };
      this.lastTo = { ...to };
      this.recalc = 0.4;
    }
    // Chevrons entlang der Polylinie verteilen
    const spacing = 1.5;
    const offset = (this.t * 2.2) % spacing;
    let n = 0;
    let acc = 0;
    let nextAt = 1.4 + offset;
    const maxLen = 18;
    for (let i = 0; i < this.path.length - 1 && n < 24; i++) {
      const a = this.path[i];
      const b = this.path[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 1e-4) continue;
      const dx = (b.x - a.x) / len;
      const dz = (b.z - a.z) / len;
      while (nextAt <= acc + len && n < 24 && nextAt < maxLen) {
        const k = nextAt - acc;
        const x = a.x + dx * k;
        const z = a.z + dz * k;
        if (Math.hypot(to.x - x, to.z - z) < 1.2) break;
        this.p.set(x, 0.05, z);
        this.e.set(0, Math.atan2(-dx, -dz), 0);
        this.q.setFromEuler(this.e);
        const fade = Math.min(1, (maxLen - nextAt) / 4);
        this.s.set(fade, 1, fade);
        this.m.compose(this.p, this.q, this.s);
        this.chev.setMatrixAt(n++, this.m);
        nextAt += spacing;
      }
      acc += len;
    }
    this.chev.count = n;
    this.chev.instanceMatrix.needsUpdate = true;
  }
}
