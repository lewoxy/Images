import * as THREE from 'three';
import { GeoBuilder, vcMaterial } from '../world/geo';
import * as PR from '../world/props';
import { CAR_COLORS } from '../config/palette';
import { LANE_FAR, LANE_NEAR, P } from '../config/floorplan';
import { PARKER_RATE, PLAYER_PARK_RATE } from '../config/balance';
import type { Game } from './game';

/**
 * Straßenverkehr und Parkplatz mit Schranke (§5/§10): Autos stauen sich vor
 * der Einfahrt, Spieler oder Parkwächter öffnen die Schranke, jedes Auto zahlt
 * 20 und bringt einen Gast für die Rezeption.
 */

interface Car {
  obj: THREE.Object3D;
  lane: 1 | -1; // -1: nahe Spur Richtung -x, 1: ferne Spur Richtung +x
  x: number;
  z: number;
  speed: number;
  customer: boolean;
  state: 'drive' | 'queue' | 'enter' | 'gone';
  t: number;
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

const QUEUE_X = [P.barrier.x, P.barrier.x + 5.2, P.barrier.x + 10.4, P.barrier.x + 15.6];

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
  busy = false;

  constructor(private g: Game) {}

  private makeCar(lane: 1 | -1, customer: boolean): Car {
    const obj = new THREE.Mesh(carGeo(Math.floor(Math.random() * CAR_COLORS.length)), vcMaterial);
    const x = lane === -1 ? 95 : -95;
    const z = lane === -1 ? LANE_NEAR : LANE_FAR;
    obj.position.set(x, 0, z);
    obj.rotation.y = lane === -1 ? -Math.PI / 2 : Math.PI / 2;
    this.g.stage.scene.add(obj);
    const c: Car = { obj, lane, x, z, speed: 9 + Math.random() * 2, customer, state: 'drive', t: 0 };
    this.cars.push(c);
    return c;
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
          // Nicht auf wartende Kunden auffahren: überholen durch leichtes Ausweichen reicht optisch
        }
      } else if (c.state === 'queue') {
        const qi = this.queue.indexOf(c);
        const tx = QUEUE_X[Math.max(0, qi)];
        if (Math.abs(tx - c.x) > 0.05) c.state = 'drive';
      } else if (c.state === 'enter') {
        c.t += dt;
        // Einbiegen: Drehung Richtung -z, dann in die Rampe
        const turn = Math.min(1, c.t / 0.5);
        c.obj.rotation.y = -Math.PI / 2 - (Math.PI / 2) * turn;
        if (c.t > 0.3) c.z -= 7 * dt;
        c.x += (P.barrier.x - c.x) * Math.min(1, dt * 6);
        if (c.z < 3) {
          c.obj.position.y -= 3 * dt;
          c.obj.rotation.x = 0.15;
        }
        if (c.z < -4) c.state = 'gone';
      }
      c.obj.position.x = c.x;
      c.obj.position.z = c.z;
      if (c.state === 'gone' || Math.abs(c.x) > 100) {
        c.obj.removeFromParent();
        this.cars.splice(i, 1);
        const qi = this.queue.indexOf(c);
        if (qi >= 0) this.queue.splice(qi, 1);
      }
      // Nicht-Kunden in der nahen Spur weichen der Schlange aus (fahren „durch“, kurz in die Mitte)
      if (!c.customer && c.lane === -1 && c.state === 'drive') {
        const nearQueue = this.queue.length > 0 && c.x > P.barrier.x - 3 && c.x < QUEUE_X[this.queue.length - 1] + 6;
        const tz = nearQueue ? (LANE_NEAR + LANE_FAR) / 2 : LANE_NEAR;
        c.z += (tz - c.z) * Math.min(1, dt * 3);
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
        front.state = 'enter';
        front.t = 0;
        front.customer = false;
        this.armOpenT = 1.6;
        this.g.onCarParked();
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
  }
}
