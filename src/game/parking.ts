import * as THREE from 'three';
import { GeoBuilder, vcMaterial } from '../world/geo';
import * as PR from '../world/props';
import { CAR_COLORS } from '../config/palette';
import { LANE_FAR, LANE_NEAR, P, PARKING_BAYS, PARKING_BAY_Z, PARKING_LOT } from '../config/floorplan';
import { PARKER_RATE, PLAYER_PARK_RATE } from '../config/balance';
import type { Game } from './game';
import type { Pt } from './nav';

/**
 * Straßenverkehr und Parkplatz vor dem Motel (§5/§10, Landmarke „Parking“): Autos
 * stauen sich auf der Straße vor der Einfahrt, Spieler oder Parkwächter öffnen die
 * Schranke, das Auto parkt in einer der drei Buchten, der Fahrer stellt sich an
 * der Rezeption an (jedes Auto zahlt 20). Nach kurzer Zeit fährt es wieder ab.
 */

interface Car {
  obj: THREE.Object3D;
  lane: 1 | -1; // -1: nahe Spur Richtung -x, 1: ferne Spur Richtung +x
  x: number;
  z: number;
  heading: number;
  speed: number;
  customer: boolean;
  state: 'drive' | 'queue' | 'enter' | 'parked' | 'exit' | 'gone';
  t: number;
  path: (Pt & { rev?: boolean })[];
  bay: number;
}

const geoCache: THREE.BufferGeometry[] = [];
function carGeo(i: number) {
  if (!geoCache[i]) {
    const b = new GeoBuilder();
    PR.car(b, CAR_COLORS[i % CAR_COLORS.length]);
    geoCache[i] = b.build();
  }
  return geoCache[i];
}

const ENTRY_X = P.barrier.x;
const QUEUE_X = [ENTRY_X, ENTRY_X + 6.0, ENTRY_X + 12.0, ENTRY_X + 18.0];
/** Parkdauer, bevor ein Auto wieder abfährt */
const PARK_TIME = 9;

export class Parking {
  cars: Car[] = [];
  queue: Car[] = [];
  progress = 0;
  active = false;
  parkerOn = false;
  private spawnNear = 2;
  private spawnFar = 4;
  private armAngle = 0;
  private armOpenT = 0;
  private bays: (Car | null)[] = PARKING_BAYS.map(() => null);
  busy = false;

  constructor(private g: Game) {}

  private makeCar(lane: 1 | -1, customer: boolean): Car {
    const obj = new THREE.Mesh(carGeo(Math.floor(Math.random() * CAR_COLORS.length)), vcMaterial);
    const x = lane === -1 ? 100 : -100;
    const z = lane === -1 ? LANE_NEAR : LANE_FAR;
    const heading = lane === -1 ? -Math.PI / 2 : Math.PI / 2;
    obj.position.set(x, 0, z);
    obj.rotation.y = heading;
    this.g.stage.scene.add(obj);
    const c: Car = { obj, lane, x, z, heading, speed: 10 + Math.random() * 2, customer, state: 'drive', t: 0, path: [], bay: -1 };
    this.cars.push(c);
    return c;
  }

  /** Einem Pfad folgen; rev = rückwärts (Blick entgegen der Fahrtrichtung) */
  private follow(c: Car, dt: number, speed: number): boolean {
    const tgt = c.path[0];
    if (!tgt) return true;
    const dx = tgt.x - c.x;
    const dz = tgt.z - c.z;
    const d = Math.hypot(dx, dz);
    const step = Math.min(d, speed * dt);
    if (d > 1e-4) {
      c.x += (dx / d) * step;
      c.z += (dz / d) * step;
      let want = Math.atan2(dx, dz) + (tgt.rev ? Math.PI : 0);
      let diff = want - c.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      want = c.heading + diff;
      c.heading += (want - c.heading) * Math.min(1, dt * 5);
    }
    if (d - step < 0.05) c.path.shift();
    return c.path.length === 0;
  }

  private freeBay(): number {
    const free = this.bays.findIndex((b) => b === null);
    if (free >= 0) return free;
    // alle belegt: das am längsten parkende Auto fährt los
    let best = 0;
    let bt = -1;
    this.bays.forEach((b, i) => {
      if (b && b.state === 'parked' && b.t > bt) {
        bt = b.t;
        best = i;
      }
    });
    const old = this.bays[best];
    if (old) this.startExit(old);
    return best;
  }

  private startExit(c: Car) {
    if (c.bay >= 0 && this.bays[c.bay] === c) this.bays[c.bay] = null;
    c.state = 'exit';
    c.path = [
      { x: c.x, z: PARKING_LOT.z1 + 0.6, rev: true },
      { x: ENTRY_X - 0.6, z: P.barrier.z + 1.6, rev: true },
      { x: ENTRY_X + 1.5, z: LANE_FAR - 1.2 },
      { x: ENTRY_X + 6, z: LANE_FAR },
      { x: 110, z: LANE_FAR },
    ];
    this.armOpenT = Math.max(this.armOpenT, 2.2);
  }

  update(dt: number, playerNear: boolean) {
    // Verkehr
    this.spawnNear -= dt;
    this.spawnFar -= dt;
    if (this.spawnFar <= 0) {
      this.makeCar(1, false);
      this.spawnFar = 5 + Math.random() * 6;
    }
    if (this.spawnNear <= 0) {
      const customer = this.active && this.queue.length < QUEUE_X.length && Math.random() < 0.75;
      const c = this.makeCar(-1, customer);
      if (customer) this.queue.push(c);
      this.spawnNear = this.active ? 4.5 + Math.random() * 4 : 6 + Math.random() * 7;
    }

    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i];
      if (c.state === 'drive') {
        if (c.customer) {
          const qi = this.queue.indexOf(c);
          const tx = QUEUE_X[Math.max(0, qi)];
          const dx = tx - c.x;
          const step = Math.min(Math.abs(dx), c.speed * dt * Math.min(1, Math.abs(dx) / 6 + 0.25));
          c.x += Math.sign(dx) * step;
          if (Math.abs(dx) < 0.05) c.state = 'queue';
        } else {
          c.x += c.lane * c.speed * dt;
        }
      } else if (c.state === 'queue') {
        const qi = this.queue.indexOf(c);
        const tx = QUEUE_X[Math.max(0, qi)];
        if (Math.abs(tx - c.x) > 0.05) c.state = 'drive';
      } else if (c.state === 'enter') {
        if (this.follow(c, dt, 6)) {
          c.state = 'parked';
          c.t = 0;
          const bx = PARKING_BAYS[c.bay];
          this.g.onCarParked({ x: bx + (bx < 5 ? 0.2 : -0.2), z: PARKING_LOT.z1 + 0.5 });
        }
      } else if (c.state === 'parked') {
        c.t += dt;
        if (c.t > PARK_TIME) this.startExit(c);
      } else if (c.state === 'exit') {
        const rev = c.path[0]?.rev;
        if (this.follow(c, dt, rev ? 4.5 : 8)) c.state = 'gone';
      }
      // Nicht-Kunden in der nahen Spur weichen der Schlange etwas zur Mitte aus
      if (!c.customer && c.lane === -1 && c.state === 'drive') {
        const nearQueue = this.queue.length > 0 && c.x > ENTRY_X - 4 && c.x < QUEUE_X[this.queue.length - 1] + 7;
        const tz = nearQueue ? (LANE_NEAR + LANE_FAR) / 2 : LANE_NEAR;
        c.z += (tz - c.z) * Math.min(1, dt * 3);
      }
      c.obj.position.x = c.x;
      c.obj.position.z = c.z;
      c.obj.rotation.y = c.heading;
      if (c.state === 'gone' || Math.abs(c.x) > 105) {
        c.obj.removeFromParent();
        this.cars.splice(i, 1);
        const qi = this.queue.indexOf(c);
        if (qi >= 0) this.queue.splice(qi, 1);
        if (c.bay >= 0 && this.bays[c.bay] === c) this.bays[c.bay] = null;
      }
    }

    // Schranke
    const front = this.queue[0];
    const ready = !!front && front.state === 'queue' && Math.abs(front.x - QUEUE_X[0]) < 0.1;
    const rate = (playerNear ? PLAYER_PARK_RATE : 0) + (this.parkerOn ? PARKER_RATE : 0);
    this.busy = ready && rate > 0;
    if (this.active && ready && rate > 0) {
      this.progress += rate * dt;
      if (this.progress >= 1) {
        this.progress = 0;
        this.queue.shift();
        front.customer = false;
        front.bay = this.freeBay();
        this.bays[front.bay] = front;
        const bx = PARKING_BAYS[front.bay];
        front.state = 'enter';
        front.path = [
          { x: ENTRY_X, z: LANE_NEAR - 2.2 },
          { x: ENTRY_X, z: P.barrier.z - 1.2 },
          { x: bx, z: PARKING_LOT.z1 - 1.2 },
          { x: bx, z: PARKING_BAY_Z },
        ];
        this.armOpenT = 2.2;
      }
    } else if (!ready) {
      this.progress = Math.max(0, this.progress - dt);
    }
    this.armOpenT = Math.max(0, this.armOpenT - dt);
    const target = this.armOpenT > 0 ? 1.35 : 0;
    this.armAngle += (target - this.armAngle) * Math.min(1, dt * 7);
    if (this.g.world.barrierArm) this.g.world.barrierArm.rotation.z = this.armAngle;
  }

  get frontWaiting(): boolean {
    const f = this.queue[0];
    return !!f && f.state === 'queue';
  }

  clear() {
    for (const c of this.cars) c.obj.removeFromParent();
    this.cars = [];
    this.queue = [];
    this.bays = PARKING_BAYS.map(() => null);
  }
}
