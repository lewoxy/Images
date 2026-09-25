import { Agent } from './agent';
import { LOOKS, SPECIAL_LOOKS, randomGuestLook, type Look } from '../world/characters';
import { GUEST_DROPS, GUEST_FLOW, GUEST_TIMING, ROOM_INCOME, TOILET_INCOME, VIP, VIP_TIP } from '../config/balance';
import { P, QUEUE_PATH, QUEUE_SPACING } from '../config/floorplan';
import { ROOM, WC } from '../config/layout';
import { cellKey, type Pt } from './nav';
import type { RoomRt, WCRt } from './hotel';
import type { Game } from './game';
import { svg } from '../ui/icons';

export type GuestState =
  | 'arrive'
  | 'queue'
  | 'toRoom'
  | 'special'
  | 'lieDown'
  | 'sleep'
  | 'getUp'
  | 'toWC'
  | 'wcWait'
  | 'wcStall'
  | 'leave'
  | 'gone';

export interface SpecialInfo {
  idx: number;
  name: string;
  role: string;
  /** noch offene Wünsche */
  requests: string[];
  current: string | null;
  timer: number;
  done: number;
}

let SEQ = 0;

export class Guest extends Agent {
  id = ++SEQ;
  state: GuestState = 'arrive';
  room: RoomRt | null = null;
  wc: WCRt | null = null;
  stall = -1;
  wcSlot = -1;
  timer = 0;
  payment = 0;
  vip = false;
  vipTime = 0;
  special: SpecialInfo | null = null;
  slot = -1;
  fromCar = false;

  get atDesk() {
    return this.state === 'queue' && this.slot === 0 && !this.moving;
  }
}

/** Position eines Warteplatzes entlang der Schlangen-Polylinie */
export function queueSlotPos(i: number): Pt {
  let d = i * QUEUE_SPACING;
  for (let k = 0; k < QUEUE_PATH.length - 1; k++) {
    const a = QUEUE_PATH[k];
    const b = QUEUE_PATH[k + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (d <= len) {
      const t = d / len;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    d -= len;
  }
  const l = QUEUE_PATH[QUEUE_PATH.length - 1];
  return { ...l };
}

export class GuestManager {
  guests: Guest[] = [];
  queue: Guest[] = [];
  private spawnT = 1.5;

  constructor(private g: Game) {}

  get queueFront(): Guest | null {
    const f = this.queue[0];
    return f && f.atDesk ? f : null;
  }

  private builtRooms() {
    return this.g.rooms.filter((r) => r.tier > 0).length;
  }

  spawnInterval() {
    const n = Math.max(1, this.builtRooms());
    return Math.min(GUEST_FLOW.maxInterval, Math.max(GUEST_FLOW.minInterval, GUEST_FLOW.intervalPerRoom / n));
  }

  spawn(opts: { look?: Look; vip?: boolean; special?: SpecialInfo; fromCar?: boolean; atSlot?: boolean } = {}): Guest {
    const fromCar = !!opts.fromCar;
    const start = fromCar ? { x: P.garageEntrance.x, z: 7.6 } : { x: P.spawnLeft.x, z: P.spawnLeft.z + (Math.random() - 0.5) * 0.6 };
    const gst = new Guest(opts.look ?? randomGuestLook(), this.g.stage.scene, this.g.shadows, start.x, start.z);
    gst.speed = GUEST_FLOW.walkSpeed * (0.92 + Math.random() * 0.16);
    gst.vip = !!opts.vip;
    gst.special = opts.special ?? null;
    gst.fromCar = fromCar;
    if (gst.vip) gst.vipTime = VIP.patience;
    this.guests.push(gst);
    // Vorrang für VIP/Sondergäste: direkt hinter den Gast am Tresen
    if (gst.vip || gst.special) {
      const idx = this.queue.length > 0 && this.queue[0].atDesk ? 1 : 0;
      this.queue.splice(idx, 0, gst);
    } else {
      this.queue.push(gst);
    }
    gst.state = 'arrive';
    if (opts.atSlot) {
      const i = this.queue.indexOf(gst);
      const p = queueSlotPos(i);
      gst.place(p.x, p.z);
      gst.slot = i;
      gst.state = 'queue';
      gst.faceDir(0, -1);
    }
    this.assignSlots();
    return gst;
  }

  private walkToSlot(gst: Guest, i: number) {
    const p = queueSlotPos(i);
    const pts: Pt[] = [];
    // Von draußen erst zur Tür, dann hinein
    if (p.z < 6.8 && gst.z > 6.8) pts.push({ x: 0.15, z: 8.7 });
    if (p.z < 6.8 && gst.z > 6.8 && Math.abs(gst.x) > 1) pts.unshift({ x: gst.x, z: 8.7 });
    pts.push(p);
    gst.walk(pts, () => {
      gst.state = 'queue';
      gst.faceDir(0, -1);
    });
  }

  assignSlots(force = false) {
    this.queue.forEach((gst, i) => {
      if (gst.slot !== i || force) {
        const was = gst.slot;
        gst.slot = i;
        if (was !== i || gst.state === 'arrive') this.walkToSlot(gst, i);
      }
    });
  }

  /** Check-in des vordersten Gastes in ein Zimmer */
  checkIn(gst: Guest, room: RoomRt) {
    const i = this.queue.indexOf(gst);
    if (i >= 0) this.queue.splice(i, 1);
    gst.slot = -1;
    room.state = 'reserved';
    room.guest = gst;
    gst.room = room;
    const inc = ROOM_INCOME[room.tier];
    const pay = Math.round((room.design === 2 ? inc.payRW : inc.pay) * this.g.incomeMult);
    gst.payment = pay;
    this.g.addReceptionCash(pay);
    if (gst.vip) {
      this.g.addReceptionCash(Math.round(VIP_TIP * this.g.incomeMult));
      this.g.onVipCheckedIn(gst);
    }
    gst.state = 'toRoom';
    const route = this.g.nav.route(gst, cellKey(room.zone, room.cell));
    const inPts = [room.w(ROOM.doorIn.u, ROOM.doorIn.v), room.w(ROOM.entry.u, ROOM.entry.v), room.w(ROOM.bedSide.u, ROOM.bedSide.v)];
    gst.walk([...route, ...inPts], () => this.arrivedAtBed(gst));
    this.assignSlots();
  }

  private arrivedAtBed(gst: Guest) {
    const room = gst.room!;
    if (gst.special && gst.special.requests.length > 0) {
      gst.state = 'special';
      gst.face(room.bedPos.x, room.bedPos.z);
      room.state = 'occupied';
      this.g.specials.onSpecialInRoom(gst);
      return;
    }
    this.lieDown(gst);
  }

  lieDown(gst: Guest) {
    const room = gst.room!;
    room.state = 'occupied';
    gst.state = 'lieDown';
    gst.timer = GUEST_TIMING.lieDown;
    const b = room.bedPos;
    gst.place(b.x + 0.35, b.z);
    gst.ch.root.rotation.y = Math.PI / 2;
    gst.ch.pose = 'sleep';
    gst.shadow.on = false;
  }

  private leaveRoom(gst: Guest) {
    const room = gst.room!;
    room.nightTarget = 0;
    room.makeDirty();
    room.guest = null;
    // Trinkgeld = 20 % der Zahlung (§5), bleibt im Zimmer liegen
    const tip = Math.round(ROOM_INCOME[room.tier].tip * this.g.incomeMult);
    this.g.money.add(room.tipPile, tip);
    // Werbefreie Ressourcenquelle (§12)
    if (Math.random() < GUEST_DROPS.candy) this.g.spawnPickup('candy', room.w(ROOM.drop.u, ROOM.drop.v), 1);
    else if (Math.random() < GUEST_DROPS.toiletpaper) this.g.spawnPickup('toiletpaper', room.w(ROOM.drop.u, ROOM.drop.v), 1);
    if (gst.vip) this.g.spawnPickup('candy', room.w(ROOM.drop.u - 0.8, ROOM.drop.v + 0.4), 2);
    gst.ch.pose = 'idle';
    gst.shadow.on = true;
    const bs = room.w(ROOM.bedSide.u, ROOM.bedSide.v);
    gst.place(bs.x, bs.z);
    gst.state = 'getUp';
    // zufriedener Gast (ohne Zufriedenheitssystem – nur Rückmeldung)
    this.g.fx.float(bs.x, 2.3, bs.z, svg(room.tier >= 3 || room.design === 2 ? 'star' : 'thumb'), '', 1.1, 40);
    const out = [room.w(ROOM.entry.u, ROOM.entry.v), room.w(ROOM.doorIn.u, ROOM.doorIn.v), room.w(ROOM.doorOut.u, ROOM.doorOut.v)];
    gst.walk(out, () => this.afterRoom(gst));
    gst.room = null;
  }

  private afterRoom(gst: Guest) {
    // Toilette der eigenen Zone, falls Papier da ist
    const wc = this.g.wcByZone.get(gst.special ? -1 : this.zoneOf(gst));
    if (wc && wc.canAccept() && Math.random() < GUEST_FLOW.toiletChance) {
      wc.reserved++;
      gst.wc = wc;
      gst.state = 'toWC';
      const route = this.g.nav.route(gst, cellKey(wc.zone, wc.cell));
      gst.walk([...route, wc.w(WC.doorIn.u, WC.doorIn.v)], () => this.arriveWC(gst));
    } else {
      this.leave(gst);
    }
  }

  private lastZone = new Map<Guest, number>();
  private zoneOf(gst: Guest) {
    return this.lastZone.get(gst) ?? 1;
  }

  private arriveWC(gst: Guest) {
    const wc = gst.wc!;
    const s = wc.freeStall();
    if (s >= 0 && wc.queue.length === 0) {
      this.enterStall(gst, s);
    } else {
      wc.queue.push(gst);
      gst.state = 'wcWait';
      this.layoutWCQueue(wc);
    }
  }

  private layoutWCQueue(wc: WCRt) {
    wc.queue.forEach((q, i) => {
      const p = WC.queue[Math.min(i, WC.queue.length - 1)];
      const wp = wc.w(p.u, p.v);
      q.walk([wp], () => q.face(wc.w(0, -2).x, wc.w(0, -2).z));
    });
  }

  private enterStall(gst: Guest, s: number) {
    const wc = gst.wc!;
    wc.reserved = Math.max(0, wc.reserved - 1);
    wc.stock = Math.max(0, wc.stock - 1);
    wc.view.setPaperStock(wc.stock);
    wc.stalls[s] = gst;
    gst.stall = s;
    gst.state = 'wcStall';
    gst.timer = -1;
    const u = WC.stalls[s];
    const pts = [wc.w(u, 0.35), wc.w(u, WC.stallEntryV), wc.w(u, WC.sitV)];
    gst.walk(pts, () => {
      const f = wc.w(u, 3);
      gst.face(f.x, f.z);
      gst.ch.pose = 'sit';
      gst.timer = GUEST_TIMING.toilet;
      wc.view.setStallOpen(s, false);
    });
  }

  private exitStall(gst: Guest) {
    const wc = gst.wc!;
    const s = gst.stall;
    wc.stalls[s] = null;
    wc.view.setStallOpen(s, true);
    gst.ch.pose = 'idle';
    gst.stall = -1;
    this.g.money.add(wc.pile, Math.round(TOILET_INCOME.pay * this.g.incomeMult));
    this.g.save.stats.toilets++;
    this.g.events.emit('toilet', { zone: wc.zone });
    const u = WC.stalls[s];
    gst.walk([wc.w(u, WC.stallEntryV), wc.w(u, 0.4), wc.w(WC.doorIn.u, WC.doorIn.v), wc.w(WC.doorOut.u, WC.doorOut.v)], () => this.leave(gst));
    gst.wc = null;
    gst.state = 'leave';
    // Nächster aus der Warteschlange
    if (wc.queue.length > 0) {
      const next = wc.queue.shift()!;
      this.enterStall(next, s);
      this.layoutWCQueue(wc);
    }
  }

  leave(gst: Guest) {
    gst.state = 'leave';
    const route = this.g.nav.route(gst, 'SWR');
    gst.walk(route, () => {
      gst.state = 'gone';
    });
  }

  /** Gast aus der Schlange entfernen und gehen lassen (VIP-Geduld abgelaufen) */
  dropFromQueue(gst: Guest) {
    const i = this.queue.indexOf(gst);
    if (i >= 0) this.queue.splice(i, 1);
    gst.slot = -1;
    this.assignSlots();
    gst.walk([{ x: gst.x > 0 ? 1.8 : gst.x, z: Math.max(gst.z, 7.8) }, { x: P.exitRight.x, z: 8.0 }], () => (gst.state = 'gone'));
    gst.state = 'leave';
  }

  update(dt: number) {
    // Neue Gäste – keine Abwanderung, die Schlange staut sich bis auf die Straße (§8)
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      if (this.queue.length < GUEST_FLOW.maxQueue && this.builtRooms() > 0) this.spawn();
      this.spawnT = this.spawnInterval() * (0.8 + Math.random() * 0.4);
    }
    for (let i = this.guests.length - 1; i >= 0; i--) {
      const gst = this.guests[i];
      gst.step(dt);
      this.tick(gst, dt);
      if (gst.state === 'gone') {
        this.guests.splice(i, 1);
        const qi = this.queue.indexOf(gst);
        if (qi >= 0) this.queue.splice(qi, 1);
        this.lastZone.delete(gst);
        this.g.fx.remove('g' + gst.id);
        gst.dispose();
      }
    }
  }

  private tick(gst: Guest, dt: number) {
    const fx = this.g.fx;
    const id = 'g' + gst.id;
    switch (gst.state) {
      case 'lieDown':
        gst.timer -= dt;
        fx.set(id, () => ({ x: gst.x, y: 1.9, z: gst.z }), svg('sleepy'), 'bubble');
        if (gst.timer <= 0) {
          gst.state = 'sleep';
          gst.timer = GUEST_TIMING.night;
          gst.room!.nightTarget = 1;
          if (gst.room) this.lastZone.set(gst, gst.room.zone);
        }
        return;
      case 'sleep':
        gst.timer -= dt;
        fx.set(id, () => ({ x: gst.x - 0.6, y: 2.1, z: gst.z }), '<div class="zzz stroke">Z<small>z</small>z</div>', '');
        if (gst.timer <= 0) {
          fx.remove(id);
          this.leaveRoom(gst);
        }
        return;
      case 'wcStall':
        if (gst.timer > 0) {
          gst.timer -= dt;
          if (gst.timer <= 0) this.exitStall(gst);
        }
        return;
      case 'queue':
      case 'arrive':
        if (gst.vip) {
          gst.vipTime -= dt;
          fx.set(id, () => ({ x: gst.x, y: 2.35, z: gst.z }), svg('crown') + Math.max(0, Math.ceil(gst.vipTime)), 'bubble vip');
          if (gst.vipTime <= 0) {
            fx.remove(id);
            this.dropFromQueue(gst);
          }
        } else if (gst.special) {
          fx.set(id, () => ({ x: gst.x, y: 2.35, z: gst.z }), svg('star'), 'bubble special');
        }
        return;
      default:
        if (gst.state !== 'special') fx.remove(id);
    }
  }

  /** Zone des WCs für einen Gast, der aus einem Zimmer kommt (vor afterRoom gesetzt) */
  noteZone(gst: Guest, zone: number) {
    this.lastZone.set(gst, zone);
  }

  /** Beim Laden/Prestige: alle Gäste entfernen */
  clear() {
    for (const gst of this.guests) {
      this.g.fx.remove('g' + gst.id);
      gst.dispose();
    }
    this.guests = [];
    this.queue = [];
    this.lastZone.clear();
  }

  makeSpecialLook(i: number): Look {
    return { ...SPECIAL_LOOKS[i % SPECIAL_LOOKS.length] };
  }

  makeVipLook(): Look {
    return LOOKS.vip();
  }
}

