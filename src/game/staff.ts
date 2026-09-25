import { Agent } from './agent';
import { LOOKS, makeMop } from '../world/characters';
import { CLEANER_TIERS, RECEPTION_TIERS, STAFF_SPEED_SCALE, SUPPLIER_TIERS, TOILET_STOCK_MAX } from '../config/balance';
import { P, cleanerPost } from '../config/floorplan';
import { ROOM, WC } from '../config/layout';
import { cellKey, type Pt } from './nav';
import type { RoomRt, WCRt } from './hotel';
import type { Game } from './game';
import { syncHeld, type ItemType } from './items';

/**
 * Personal (§10): nächste Aufgabe in der Zone suchen → hinlaufen → Timer → wiederholen.
 * Regel 1 (§2): Personal sammelt niemals Geld ein.
 */

type CleanerState = 'idle' | 'walk' | 'work' | 'return';

export class Cleaner extends Agent {
  state: CleanerState = 'idle';
  room: RoomRt | null = null;
  spot = -1;
  post: Pt;
  tier = 1;
  /** 0 = Aushilfe für alle Zonen */
  constructor(
    public zone: number,
    g: Game,
    public helper = false,
  ) {
    const post = helper ? { x: 1.5, z: -7.2 } : cleanerPost(zone);
    super(helper ? LOOKS.helper() : LOOKS.cleaner(), g.stage.scene, g.shadows, post.x, post.z);
    this.post = post;
    this.ch.setTool(makeMop());
    this.faceDir(0, 1);
  }

  get workRate() {
    return this.helper ? 1.5 : CLEANER_TIERS[this.tier - 1].work;
  }

  setTier(t: number) {
    this.tier = t;
    this.speed = (this.helper ? 4.0 : CLEANER_TIERS[t - 1].speed) * STAFF_SPEED_SCALE;
  }
}

export class StaffManager {
  cleaners: Cleaner[] = [];
  helper: Cleaner | null = null;
  receptionists: Agent[] = [];
  supplier: Supplier | null = null;
  parker: Agent | null = null;

  constructor(private g: Game) {}

  setCleaner(zone: number, tier: number) {
    let c = this.cleaners.find((k) => k.zone === zone);
    if (!c && tier > 0) {
      c = new Cleaner(zone, this.g);
      this.cleaners.push(c);
      c.ch.pop();
    }
    if (c) {
      c.setTier(tier);
      if (tier > 1) c.ch.pop();
    }
  }

  setReception(tier: number) {
    const desks = tier > 0 ? RECEPTION_TIERS[tier - 1].desks : 0;
    while (this.receptionists.length < desks) {
      const i = this.receptionists.length;
      const p = P.receptionStaff[i];
      const a = new Agent(LOOKS.receptionist(), this.g.stage.scene, this.g.shadows, p.x, p.z);
      a.faceDir(0, 1);
      a.ch.pop();
      this.receptionists.push(a);
    }
    for (const r of this.receptionists) r.ch.pop();
  }

  setSupplier(tier: number) {
    if (tier <= 0) return;
    if (!this.supplier) this.supplier = new Supplier(this.g);
    this.supplier.setTier(tier);
    this.supplier.ch.pop();
  }

  setParker(on: boolean) {
    if (on && !this.parker) {
      const p = P.valetSpot;
      this.parker = new Agent(LOOKS.parker(), this.g.stage.scene, this.g.shadows, p.x - 0.3, p.z - 0.2);
      this.parker.faceDir(1, 0);
      this.parker.ch.pop();
    }
  }

  spawnHelper() {
    if (this.helper) return;
    this.helper = new Cleaner(0, this.g, true);
    this.helper.setTier(4);
    this.helper.ch.pop();
  }

  dismissHelper() {
    const h = this.helper;
    if (!h) return;
    this.release(h);
    this.helper = null;
    h.state = 'return';
    h.walk(this.g.nav.route(h, 'SWR'), () => h.dispose());
    this.leaving.push(h);
  }

  private leaving: Agent[] = [];

  /** Reinigungskraft gibt ihre Aufgabe frei */
  private release(c: Cleaner) {
    if (c.room) {
      const s = c.room.spots[c.spot];
      if (s && s.claim === c) s.claim = null;
      if (c.room.cleaner === c) c.room.cleaner = null;
    }
    c.room = null;
    c.spot = -1;
    c.ch.pose = 'idle';
  }

  /** Nächsten schmutzigen Punkt suchen */
  private findTask(c: Cleaner): { room: RoomRt; spot: number } | null {
    let best: { room: RoomRt; spot: number } | null = null;
    let bd = Infinity;
    for (const r of this.g.rooms) {
      if (r.state !== 'dirty') continue;
      if (!c.helper && r.zone !== c.zone) continue;
      if (r.cleaner && r.cleaner !== c) continue;
      for (let i = 0; i < r.spots.length; i++) {
        const s = r.spots[i];
        if (!s.dirty || (s.claim && s.claim !== c)) continue;
        const sp = ROOM.spots[i];
        const p = r.w(sp.stand.u, sp.stand.v);
        // gleiches Zimmer bevorzugen
        const d = Math.hypot(p.x - c.x, p.z - c.z) + (r === c.room ? -100 : 0);
        if (d < bd) {
          bd = d;
          best = { room: r, spot: i };
        }
      }
    }
    return best;
  }

  private assign(c: Cleaner, task: { room: RoomRt; spot: number }) {
    const sameRoom = c.room === task.room && c.state === 'work';
    if (c.room && c.room !== task.room) this.release(c);
    c.room = task.room;
    c.spot = task.spot;
    task.room.cleaner = c;
    task.room.spots[task.spot].claim = c;
    c.state = 'walk';
    c.ch.pose = 'idle';
    const sp = ROOM.spots[task.spot];
    const stand = task.room.w(sp.stand.u, sp.stand.v);
    let pts: Pt[];
    if (sameRoom || this.insideRoom(c, task.room)) {
      pts = [stand];
    } else {
      const r = task.room;
      pts = [...this.g.nav.route(c, cellKey(r.zone, r.cell)), r.w(ROOM.doorIn.u, ROOM.doorIn.v), r.w(ROOM.entry.u, ROOM.entry.v), stand];
      if (this.insideAnyRoom(c)) {
        const cur = this.insideAnyRoom(c)!;
        pts = [cur.w(ROOM.entry.u, ROOM.entry.v), cur.w(ROOM.doorIn.u, ROOM.doorIn.v), cur.w(ROOM.doorOut.u, ROOM.doorOut.v), ...pts];
      }
    }
    c.walk(pts, () => {
      c.state = 'work';
      const m = task.room.w(sp.u, sp.v);
      c.face(m.x, m.z);
      c.ch.pose = 'work';
    });
  }

  private insideRoom(c: Agent, r: RoomRt) {
    return Math.abs(c.x - r.view.cx) < 3.5 && Math.abs(c.z - r.view.cz) < 3.5;
  }

  private insideAnyRoom(c: Agent): RoomRt | null {
    for (const r of this.g.rooms) if (r.tier > 0 && this.insideRoom(c, r)) return r;
    return null;
  }

  private goHome(c: Cleaner) {
    this.release(c);
    c.state = 'return';
    let pts: Pt[] = [];
    const cur = this.insideAnyRoom(c);
    if (cur) pts = [cur.w(ROOM.entry.u, ROOM.entry.v), cur.w(ROOM.doorIn.u, ROOM.doorIn.v), cur.w(ROOM.doorOut.u, ROOM.doorOut.v)];
    const home = c.helper ? { x: 1.5, z: -7.2 } : c.post;
    pts.push(...this.g.nav.routeTo(pts.length ? pts[pts.length - 1] : c, home));
    c.walk(pts, () => {
      c.state = 'idle';
      c.faceDir(0, 1);
    });
  }

  private updateCleaner(c: Cleaner, dt: number) {
    c.step(dt);
    switch (c.state) {
      case 'idle':
      case 'return': {
        const t = this.findTask(c);
        if (t) this.assign(c, t);
        break;
      }
      case 'walk': {
        // Ziel inzwischen vom Spieler geputzt?
        if (!c.room || !c.room.spots[c.spot]?.dirty) {
          const t = this.findTask(c);
          if (t) this.assign(c, t);
          else this.goHome(c);
        }
        break;
      }
      case 'work': {
        const r = c.room;
        if (!r || !r.spots[c.spot]?.dirty) {
          const t = this.findTask(c);
          if (t) this.assign(c, t);
          else this.goHome(c);
          break;
        }
        const si = c.spot;
        const cleaned = r.work(si, c.workRate * dt);
        const sp = ROOM.spots[si];
        this.g.fx.ring('cl' + r.key + si, () => ({ ...r.w(sp.u, sp.v), y: 1.6 }), r.spots[si]?.progress ?? 1, '#5fd0ff');
        if (cleaned) {
          this.g.onSpotCleaned(r, si, false);
          const t = this.findTask(c);
          if (t) this.assign(c, t);
          else this.goHome(c);
        }
        break;
      }
    }
  }

  get receptionRate(): number {
    const tier = this.g.receptionTier;
    if (tier <= 0) return 0;
    return RECEPTION_TIERS[tier - 1].rate * RECEPTION_TIERS[tier - 1].desks;
  }

  update(dt: number) {
    for (const c of this.cleaners) this.updateCleaner(c, dt);
    if (this.helper) this.updateCleaner(this.helper, dt);
    for (const r of this.receptionists) {
      r.step(dt);
      r.ch.pose = this.g.checkinActive ? 'work' : 'idle';
    }
    if (this.parker) {
      this.parker.step(dt);
      this.parker.ch.pose = this.g.parking.busy ? 'wave' : 'idle';
    }
    this.supplier?.update(dt);
    for (let i = this.leaving.length - 1; i >= 0; i--) {
      const a = this.leaving[i];
      a.step(dt);
      if (!a.moving) this.leaving.splice(i, 1);
    }
  }

  clear() {
    for (const c of this.cleaners) c.dispose();
    this.cleaners = [];
    this.helper?.dispose();
    this.helper = null;
    for (const r of this.receptionists) r.dispose();
    this.receptionists = [];
    this.supplier?.dispose();
    this.supplier = null;
    this.parker?.dispose();
    this.parker = null;
  }
}

/** Lieferant (Loader): Klopapier vom Lager zu den Toiletten (§10). */
export class Supplier extends Agent {
  tier = 1;
  state: 'idle' | 'toStorage' | 'load' | 'toWC' | 'unload' | 'home' = 'idle';
  carried: ItemType[] = [];
  target: WCRt | null = null;
  private t = 0;

  constructor(private g: Game) {
    super(LOOKS.supplier(), g.stage.scene, g.shadows, P.supplierPost.x, P.supplierPost.z);
    this.faceDir(0, 1);
  }

  get cap() {
    return SUPPLIER_TIERS[this.tier - 1].carry;
  }

  setTier(t: number) {
    this.tier = t;
    this.speed = SUPPLIER_TIERS[t - 1].speed * STAFF_SPEED_SCALE;
  }

  private needyWC(): WCRt | null {
    let best: WCRt | null = null;
    let bv = Infinity;
    for (const w of this.g.wcs) {
      if (!w.built) continue;
      const have = w.stock + w.incoming;
      if (have >= TOILET_STOCK_MAX) continue;
      if (have < bv) {
        bv = have;
        best = w;
      }
    }
    return best;
  }

  update(dt: number) {
    this.step(dt);
    this.ch.carrying = this.carried.length > 0;
    syncHeld(this.ch.hold, this.carried);
    switch (this.state) {
      case 'idle':
      case 'home': {
        const w = this.needyWC();
        if (w) {
          if (this.carried.length > 0) this.goWC(w);
          else {
            this.state = 'toStorage';
            this.walk(this.g.nav.route(this, 'PAPER'), () => {
              this.state = 'load';
              this.t = 0;
              this.face(P.paperShelf.x, P.paperShelf.z);
            });
          }
        }
        break;
      }
      case 'load':
        this.t += dt;
        if (this.t > 0.22) {
          this.t = 0;
          if (this.carried.length < this.cap) this.carried.push('roll');
          else {
            const w = this.needyWC();
            if (w) this.goWC(w);
            else {
              this.state = 'home';
              this.walk(this.g.nav.route(this, 'SP'), () => this.faceDir(0, 1));
            }
          }
        }
        break;
      case 'unload': {
        const w = this.target;
        if (!w) {
          this.state = 'idle';
          break;
        }
        this.t += dt;
        if (this.t > 0.2) {
          this.t = 0;
          if (this.carried.length > 0 && w.stock < TOILET_STOCK_MAX) {
            this.carried.pop();
            w.stock++;
            w.incoming = Math.max(0, w.incoming - 1);
            w.view.setPaperStock(w.stock);
            this.g.events.emit('paper', { amount: 1, byPlayer: false });
          } else {
            w.incoming = 0;
            this.target = null;
            const next = this.needyWC();
            if (this.carried.length > 0 && next) this.goWC(next);
            else {
              this.state = 'idle';
              if (this.carried.length === 0 && next) break;
              this.state = 'home';
              this.walk(this.g.nav.route(this, 'SP'), () => this.faceDir(0, 1));
            }
          }
        }
        break;
      }
    }
  }

  private goWC(w: WCRt) {
    this.state = 'toWC';
    this.target = w;
    w.incoming += Math.min(this.carried.length, TOILET_STOCK_MAX - w.stock);
    const p = w.w(WC.paper.u - 0.95, WC.paper.v);
    this.walk([...this.g.nav.route(this, cellKey(w.zone, w.cell)), w.w(WC.doorIn.u, WC.doorIn.v), p], () => {
      this.state = 'unload';
      this.t = 0;
      const s = w.w(WC.paper.u + 0.3, WC.paper.v);
      this.face(s.x, s.z);
    });
  }
}
