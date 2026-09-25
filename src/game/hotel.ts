import { CellView } from '../world/cells';
import { MoneyPile } from './money';
import { ROOM, WC } from '../config/layout';
import { CLEAN_SPOTS } from '../config/balance';
import type { Guest } from './guests';

/** Laufzeit-Objekte des Hotels: Zimmer und Toilettenblöcke. */

export type RoomState = 'unbuilt' | 'free' | 'reserved' | 'occupied' | 'dirty';

export interface Spot {
  dirty: boolean;
  progress: number;
  /** wer den Punkt gerade anläuft (Cleaner-Objekt) */
  claim: object | null;
}

export class RoomRt {
  readonly kind = 'room' as const;
  tier = 0;
  design = 0;
  state: RoomState = 'unbuilt';
  guest: Guest | null = null;
  spots: Spot[] = [];
  night = 0;
  nightTarget = 0;
  /** Cleaner, der dieses Zimmer bearbeitet */
  cleaner: object | null = null;
  unlocked = false;

  constructor(
    public key: string,
    public zone: number,
    public cell: number,
    public maxTier: number,
    public view: CellView,
    public tipPile: MoneyPile,
  ) {
    for (let i = 0; i < CLEAN_SPOTS; i++) this.spots.push({ dirty: false, progress: 0, claim: null });
  }

  w(u: number, v: number) {
    return this.view.w(u, v);
  }

  get bedPos() {
    return this.w(ROOM.bed.u, ROOM.bed.v);
  }

  get dirtyCount() {
    return this.spots.filter((s) => s.dirty).length;
  }

  makeDirty() {
    this.state = 'dirty';
    for (let i = 0; i < this.spots.length; i++) {
      this.spots[i].dirty = true;
      this.spots[i].progress = 0;
      this.spots[i].claim = null;
      this.view.setDirty(i, true);
    }
  }

  /** Arbeit an einem Schmutzpunkt. Gibt true zurück, wenn der Punkt damit sauber wurde. */
  work(i: number, amount: number): boolean {
    const s = this.spots[i];
    if (!s.dirty) return false;
    s.progress += amount;
    if (s.progress >= 1) {
      s.dirty = false;
      s.progress = 0;
      s.claim = null;
      this.view.setDirty(i, false);
      if (this.spots.every((p) => !p.dirty)) {
        this.state = 'free';
        this.cleaner = null;
      }
      return true;
    }
    return false;
  }
}

export class WCRt {
  readonly kind = 'wc' as const;
  built = false;
  stock = 0;
  stalls: (Guest | null)[] = [null, null, null];
  queue: Guest[] = [];
  unlocked = false;
  /** vom Supplier reserviert (Lieferung unterwegs) */
  incoming = 0;

  constructor(
    public key: string,
    public zone: number,
    public cell: number,
    public view: CellView,
    public pile: MoneyPile,
  ) {}

  w(u: number, v: number) {
    return this.view.w(u, v);
  }

  get paperPos() {
    return this.w(WC.paper.u - 0.9, WC.paper.v);
  }

  /** Gäste, die unterwegs sind oder warten (noch keine Kabine) – jeder hat eine Rolle reserviert */
  reserved = 0;

  freeStall(): number {
    return this.stalls.findIndex((s) => s === null);
  }

  get freeStalls() {
    return this.stalls.filter((s) => s === null).length;
  }

  /** Kann ein weiterer Gast kommen? Papier muss für alle Reservierungen reichen. */
  canAccept(): boolean {
    if (!this.built) return false;
    return this.stock - this.reserved > 0 && this.reserved < WC.queue.length + this.freeStalls;
  }
}
