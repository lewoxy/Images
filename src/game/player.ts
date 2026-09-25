import * as THREE from 'three';
import { Character, LOOKS } from '../world/characters';
import { GeoBuilder, vcMaterial } from '../world/geo';
import { BACKPACK_UPGRADES, PLAYER_BASE, PLAYER_UPGRADES, SCOOTER } from '../config/balance';
import type { Game } from './game';
import { syncHeld, type ItemType } from './items';

/** Spielfigur: Bewegung mit Kollision, Tragen, Upgrades (§11). */
export class Player {
  ch = new Character(LOOKS.player());
  carried: ItemType[] = [];
  speedNow = 0;
  shadow: { x: number; z: number; s: number; on: boolean };
  private scooter: THREE.Object3D;
  private backpack: THREE.Object3D;
  moveDir = { x: 0, z: 0 };

  constructor(private g: Game) {
    g.stage.scene.add(this.ch.root);
    this.shadow = g.shadows.add(1.35);
    const b = new GeoBuilder();
    b.rbox(1.3, 0.12, 0.42, 0.05, 0x9b4dff, 0, 0.14, 0, { ry: Math.PI / 2 });
    b.cyl(0.05, 0.05, 1.05, 0x9b4dff, 0, 0.18, 0.5, 6, { rx: -0.22 });
    b.box(0.62, 0.07, 0.07, 0x2b1457, 0, 1.18, 0.72);
    for (const z of [-0.5, 0.52]) b.cyl(0.17, 0.17, 0.1, 0x2b1457, 0, 0.17, z, 12, { rz: Math.PI / 2 });
    this.scooter = new THREE.Mesh(b.build(), vcMaterial);
    this.scooter.visible = false;
    this.ch.root.add(this.scooter);
    const bp = new GeoBuilder();
    bp.rbox(0.5, 0.56, 0.26, 0.1, 0xff9a2e, 0, 0.62, -0.32);
    bp.rbox(0.36, 0.2, 0.08, 0.05, 0xffc45a, 0, 0.7, -0.46);
    this.backpack = new THREE.Mesh(bp.build(), vcMaterial);
    this.backpack.visible = false;
    this.ch.body.add(this.backpack);
  }

  get x() {
    return this.ch.root.position.x;
  }
  get z() {
    return this.ch.root.position.z;
  }

  /** Anzahl gekaufter Upgrades einer Art */
  private upgCount(kind: 'speed' | 'carry' | 'magnet') {
    let n = 0;
    for (let i = 0; i < this.g.save.playerUpg; i++) if (PLAYER_UPGRADES[i].kind === kind) n++;
    return n;
  }

  get speed() {
    const base = PLAYER_BASE.speed * (1 + PLAYER_BASE.speedPerUpgrade * this.upgCount('speed'));
    return base * (this.g.save.boosts.scooter > 0 ? SCOOTER.mult : 1);
  }

  get capacity() {
    return PLAYER_BASE.carry + this.upgCount('carry') + Math.min(this.g.save.backpack, BACKPACK_UPGRADES.length);
  }

  get pickupRadius() {
    return this.upgCount('magnet') > 0 ? PLAYER_BASE.magnetRadius : PLAYER_BASE.pickupRadius;
  }

  place(x: number, z: number) {
    this.ch.root.position.set(x, 0, z);
  }

  update(dt: number) {
    const g = this.g;
    const v = g.input.vector;
    const d = g.stage.screenToWorldDir(v.x, v.y);
    const mag = Math.min(1, Math.hypot(v.x, v.y));
    const sp = this.speed * mag;
    let nx = this.x;
    let nz = this.z;
    if (mag > 0.01) {
      const l = Math.hypot(d.x, d.z) || 1;
      this.moveDir = { x: d.x / l, z: d.z / l };
      // in Teilschritten bewegen, damit schnelle Figuren nicht durch dünne Wände rutschen
      const steps = Math.max(1, Math.ceil((sp * dt) / 0.3));
      for (let i = 0; i < steps; i++) {
        nx += (this.moveDir.x * sp * dt) / steps;
        nz += (this.moveDir.z * sp * dt) / steps;
        const r = g.col.resolve(nx, nz, 0.42);
        nx = r.x;
        nz = r.z;
      }
      this.ch.faceTowards(this.moveDir.x, this.moveDir.z, dt, 14);
    }
    const moved = Math.hypot(nx - this.x, nz - this.z);
    this.speedNow = dt > 0 ? moved / dt : 0;
    this.ch.root.position.set(nx, 0, nz);
    const riding = g.save.boosts.scooter > 0;
    this.scooter.visible = riding;
    this.ch.root.position.y = riding ? 0.22 : 0;
    this.ch.carrying = this.carried.length > 0;
    syncHeld(this.ch.hold, this.carried);
    this.backpack.visible = g.save.backpack > 0;
    this.ch.animate(dt, riding ? Math.min(1.2, this.speedNow * 0.15) : this.speedNow);
    this.shadow.x = nx;
    this.shadow.z = nz;
  }
}
