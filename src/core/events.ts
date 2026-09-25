/** Minimaler, typisierter Event-Bus. */
export interface GameEvents {
  cash: { amount: number; x?: number; z?: number };
  checkin: { vip: boolean; special: boolean };
  clean: { zone: number; byPlayer: boolean };
  collect: { amount: number; source: string };
  purchase: { id: string; kind: string };
  paper: { amount: number; byPlayer: boolean };
  pickupPaper: { amount: number };
  stars: { amount: number; total: number };
  levelUp: { level: number };
  toilet: { zone: number };
  car: object;
  special: { done: boolean };
  vip: object;
  currency: { type: string };
  tutorial: { step: number };
}

type Handler<T> = (payload: T) => void;

export class Emitter {
  private map = new Map<keyof GameEvents, Handler<never>[]>();

  on<K extends keyof GameEvents>(k: K, h: Handler<GameEvents[K]>) {
    const arr = this.map.get(k) ?? [];
    arr.push(h as Handler<never>);
    this.map.set(k, arr);
  }

  emit<K extends keyof GameEvents>(k: K, payload: GameEvents[K]) {
    const arr = this.map.get(k);
    if (!arr) return;
    for (const h of arr) (h as Handler<GameEvents[K]>)(payload);
  }
}
