/**
 * Freischaltgraph (vgl. §6 „SequenceUnlockUpgrades“).
 *
 * Die Spezifikation belegt zwei Kanten explizit – „Zimmer 1 Stufe 1 erfordert
 * Toilette Stufe 1, Stufe 2 erfordert Cleaner Stufe 3“ – und die Reihenfolge der
 * Preistabelle. Daraus ist der restliche Graph abgeleitet (🔧): pro Zone
 * Zimmer A → Cleaner → Zimmer B → Toilette → Zimmer C, danach die Upgrades
 * verschränkt mit den Cleaner-Stufen. Neue Zonen setzen das jeweilige Hotellevel
 * voraus; die Sternbilanz aus §3 macht diese Stufen genau erreichbar.
 */
import { PRICE_TABLE, STARS } from './balance.ts';

export type NodeKind =
  | 'room'
  | 'cleaner'
  | 'toilet'
  | 'zone'
  | 'reception'
  | 'supplier'
  | 'parking'
  | 'parker'
  | 'elevator';

export interface UpgradeNode {
  /** `${key}#${tier}` */
  id: string;
  /** Schlüssel der Preistabelle */
  key: string;
  /** 1-basiert */
  tier: number;
  kind: NodeKind;
  zone?: number;
  cell?: number;
  stars: number;
  requires: string[];
  minLevel?: number;
}

/**
 * Zellbelegung je Zone. Die Zimmernummern der Preistabelle lassen jeweils genau
 * eine Nummer aus – dort steht der Toilettenblock (Zone 1 hat z. B. room_01/02/04).
 * a/b/c = Bau-Reihenfolge laut Preistabelle.
 */
export const ZONE_CELLS: Record<number, { a: number; b: number; c: number; wc: number }> = {
  1: { a: 2, b: 4, c: 1, wc: 3 },
  2: { a: 1, b: 2, c: 3, wc: 4 },
  3: { a: 3, b: 2, c: 4, wc: 1 },
  4: { a: 1, b: 2, c: 3, wc: 4 },
  5: { a: 1, b: 2, c: 3, wc: 4 },
  6: { a: 1, b: 3, c: 4, wc: 2 },
  7: { a: 1, b: 3, c: 4, wc: 2 },
};

export const ZONE_COUNT = 7;

export const roomKey = (zone: number, cell: number) => `zone_${zone}.room_0${cell}`;
export const nodeId = (key: string, tier: number) => `${key}#${tier}`;

function roomStars(tier: number): number {
  return tier === 1 ? STARS.roomBuild : tier === 2 ? STARS.roomTier2 : STARS.roomTier3;
}

function buildGraph(): UpgradeNode[] {
  const nodes: UpgradeNode[] = [];
  const add = (n: Omit<UpgradeNode, 'id'>) => {
    if (!PRICE_TABLE[n.key]?.[n.tier - 1]) return;
    nodes.push({ ...n, id: nodeId(n.key, n.tier) });
  };

  for (let z = 1; z <= ZONE_COUNT; z++) {
    const cells = ZONE_CELLS[z];
    const A = roomKey(z, cells.a);
    const B = roomKey(z, cells.b);
    const C = roomKey(z, cells.c);
    const CL = `zone_${z}.cleaner`;
    const WC = `zone_${z}.toilet`;
    const room = (key: string, cell: number, tier: number, requires: string[]) =>
      add({ key, tier, kind: 'room', zone: z, cell, stars: roomStars(tier), requires });
    const cleaner = (tier: number, requires: string[]) =>
      add({ key: CL, tier, kind: 'cleaner', zone: z, stars: 0, requires });

    let entry: string[] = [];
    if (z > 1) {
      const prevC = roomKey(z - 1, ZONE_CELLS[z - 1].c);
      add({ key: `zone_${z}`, tier: 1, kind: 'zone', zone: z, stars: 0, requires: [nodeId(prevC, 1)], minLevel: z });
      entry = [nodeId(`zone_${z}`, 1)];
    }

    if (z === 1) {
      // Tutorial-Zone: zwei Zimmer, dann Personal und Toilette (Preisreihenfolge 30/50/80/90/110).
      room(A, cells.a, 1, []);
      room(B, cells.b, 1, [nodeId(A, 1)]);
      cleaner(1, [nodeId(B, 1)]);
      add({ key: WC, tier: 1, kind: 'toilet', zone: z, cell: cells.wc, stars: STARS.toilet, requires: [nodeId(CL, 1)] });
    } else {
      room(A, cells.a, 1, entry);
      cleaner(1, [nodeId(A, 1)]);
      room(B, cells.b, 1, [nodeId(CL, 1)]);
      add({ key: WC, tier: 1, kind: 'toilet', zone: z, cell: cells.wc, stars: STARS.toilet, requires: [nodeId(B, 1)] });
    }
    // ✅ belegt: Zimmer C Stufe 1 erfordert Toilette Stufe 1
    room(C, cells.c, 1, [nodeId(WC, 1)]);
    cleaner(2, [nodeId(C, 1)]);
    room(A, cells.a, 2, [nodeId(C, 1)]);
    room(B, cells.b, 2, [nodeId(A, 2)]);
    cleaner(3, [nodeId(CL, 2), nodeId(B, 2)]);
    // ✅ belegt: Zimmer C Stufe 2 erfordert Cleaner Stufe 3
    room(C, cells.c, 2, [nodeId(CL, 3)]);
    room(A, cells.a, 3, [nodeId(C, 2)]);
    room(B, cells.b, 3, [nodeId(A, 3)]);
    if (z === 1) {
      // Die vierte Cleaner-Stufe in Zone 1 kostet 900 und erscheint erst mit Zone 2.
      cleaner(4, ['zone_2.cleaner#1']);
    } else {
      cleaner(4, [nodeId(C, 2)]);
    }
    room(C, cells.c, 3, [nodeId(B, 3), nodeId(CL, 4)]);
  }

  // Lobby & Gebäude
  add({ key: 'lobby.reception', tier: 1, kind: 'reception', stars: 0, requires: ['zone_1.cleaner#2'] });
  add({ key: 'lobby.reception', tier: 2, kind: 'reception', stars: 0, requires: ['lobby.reception#1', nodeId(roomKey(2, ZONE_CELLS[2].c), 1)] });
  add({ key: 'lobby.reception', tier: 3, kind: 'reception', stars: 0, requires: ['lobby.reception#2', 'zone_3#1'] });
  add({ key: 'supplier', tier: 1, kind: 'supplier', stars: 0, requires: ['zone_2.toilet#1'] });
  add({ key: 'supplier', tier: 2, kind: 'supplier', stars: 0, requires: ['supplier#1', 'zone_3#1'] });
  add({ key: 'supplier', tier: 3, kind: 'supplier', stars: 0, requires: ['supplier#2', 'zone_4#1'] });
  add({ key: 'supplier', tier: 4, kind: 'supplier', stars: 0, requires: ['supplier#3', 'zone_5#1'] });
  add({ key: 'supplier', tier: 5, kind: 'supplier', stars: 0, requires: ['supplier#4', 'zone_6#1'] });
  add({ key: 'parking', tier: 1, kind: 'parking', stars: STARS.parking, requires: [nodeId(roomKey(3, ZONE_CELLS[3].c), 1)] });
  add({ key: 'parker', tier: 1, kind: 'parker', stars: 0, requires: ['parking#1', 'zone_4#1'] });
  add({ key: 'elevator', tier: 1, kind: 'elevator', stars: 0, requires: [nodeId(roomKey(7, ZONE_CELLS[7].c), 1)] });

  // Implizit: Stufe n erfordert Stufe n-1 desselben Objekts.
  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    if (n.tier > 1) {
      const prev = nodeId(n.key, n.tier - 1);
      if (!n.requires.includes(prev)) n.requires.push(prev);
    }
    for (const r of n.requires) if (!ids.has(r)) throw new Error(`Unbekannte Voraussetzung ${r} für ${n.id}`);
  }
  return nodes;
}

export const NODES: UpgradeNode[] = buildGraph();
export const NODE_BY_ID: Record<string, UpgradeNode> = Object.fromEntries(NODES.map((n) => [n.id, n]));

export function maxTier(key: string): number {
  return PRICE_TABLE[key]?.length ?? 0;
}

/** Summe aller erreichbaren Sterne im Hotel (Gegenprobe §3: ≥ 240). */
export function totalStars(): number {
  return NODES.reduce((s, n) => s + n.stars, 0);
}
