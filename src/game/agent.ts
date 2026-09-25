import * as THREE from 'three';
import { Character, type Look } from '../world/characters';
import type { Pt } from './nav';

/** Weiche Blob-Schatten für alle Figuren in einem einzigen InstancedMesh. */
export class Shadows {
  mesh: THREE.InstancedMesh;
  private list = new Set<{ x: number; z: number; s: number; on: boolean }>();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private sc = new THREE.Vector3();

  constructor(scene: THREE.Scene, material: THREE.Material) {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(g, material, 256);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  add(s = 1.3) {
    const h = { x: 0, z: 0, s, on: true };
    this.list.add(h);
    return h;
  }

  remove(h: object) {
    this.list.delete(h as { x: number; z: number; s: number; on: boolean });
  }

  update() {
    let n = 0;
    for (const h of this.list) {
      if (!h.on || n >= 256) continue;
      this.p.set(h.x, 0.025, h.z);
      this.sc.set(h.s, 1, h.s);
      this.m.compose(this.p, this.q, this.sc);
      this.mesh.setMatrixAt(n++, this.m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Figur, die Polylinien abläuft. */
export class Agent {
  ch: Character;
  path: Pt[] = [];
  speed = 3;
  curSpeed = 0;
  private arrive: (() => void) | null = null;
  shadow: { x: number; z: number; s: number; on: boolean };

  constructor(
    look: Look,
    public scene: THREE.Object3D,
    public shadows: Shadows,
    x: number,
    z: number,
  ) {
    this.ch = new Character(look);
    this.ch.root.position.set(x, 0, z);
    scene.add(this.ch.root);
    this.shadow = shadows.add(1.25 * (look.scale ?? 1));
    this.shadow.x = x;
    this.shadow.z = z;
  }

  get x() {
    return this.ch.root.position.x;
  }
  get z() {
    return this.ch.root.position.z;
  }

  get moving() {
    return this.path.length > 0;
  }

  walk(path: Pt[], onArrive: (() => void) | null = null) {
    this.path = path.map((p) => ({ x: p.x, z: p.z }));
    this.arrive = onArrive;
    if (this.path.length === 0 && onArrive) {
      this.arrive = null;
      onArrive();
    }
  }

  stop() {
    this.path = [];
    this.arrive = null;
  }

  place(x: number, z: number) {
    this.ch.root.position.set(x, 0, z);
    this.shadow.x = x;
    this.shadow.z = z;
  }

  face(x: number, z: number) {
    this.ch.root.rotation.y = Math.atan2(x - this.x, z - this.z);
  }

  faceDir(dx: number, dz: number) {
    this.ch.root.rotation.y = Math.atan2(dx, dz);
  }

  /** Bewegung entlang des Pfads, Animation */
  step(dt: number) {
    let moved = 0;
    if (this.path.length) {
      let budget = this.speed * dt;
      while (budget > 0 && this.path.length) {
        const t = this.path[0];
        const dx = t.x - this.x;
        const dz = t.z - this.z;
        const d = Math.hypot(dx, dz);
        if (d <= budget) {
          this.ch.root.position.x = t.x;
          this.ch.root.position.z = t.z;
          budget -= d;
          moved += d;
          this.path.shift();
          if (d > 1e-4) this.ch.faceTowards(dx, dz, dt, 16);
        } else {
          this.ch.root.position.x += (dx / d) * budget;
          this.ch.root.position.z += (dz / d) * budget;
          moved += budget;
          budget = 0;
          this.ch.faceTowards(dx, dz, dt, 10);
        }
      }
      if (!this.path.length && this.arrive) {
        const a = this.arrive;
        this.arrive = null;
        a();
      }
    }
    this.curSpeed = dt > 0 ? moved / dt : 0;
    this.ch.animate(dt, this.curSpeed);
    this.shadow.x = this.x;
    this.shadow.z = this.z;
  }

  dispose() {
    this.shadows.remove(this.shadow);
    this.ch.dispose();
  }
}
