/**
 * Wegpunkt-Graph statt Navmesh (§16: „Pathfinding über feste Wegpunkt-Splines“).
 * NPCs laufen Polylinien ab; innerhalb von Zimmern/WCs hängen lokale Punkte an.
 */
import { CELLS, GATES, LANE, P, cellLocal, cleanerPost, type Gate } from '../config/floorplan.ts';
import { ROOM, WC } from '../config/layout.ts';

export interface Pt {
  x: number;
  z: number;
}

export class Nav {
  pts: Pt[] = [];
  adj: number[][] = [];
  private byKey = new Map<string, number>();
  private cache = new Map<string, number[]>();
  /** Kanten, die eine Zonensperre kreuzen: "a:b" → Sperren-IDs */
  private edgeGates = new Map<string, string[]>();
  private blocked = new Set<string>();
  gates: Gate[] = [];

  node(key: string, x: number, z: number): number {
    const ex = this.byKey.get(key);
    if (ex !== undefined) return ex;
    const i = this.pts.length;
    this.pts.push({ x, z });
    this.adj.push([]);
    this.byKey.set(key, i);
    return i;
  }

  id(key: string): number {
    const i = this.byKey.get(key);
    if (i === undefined) throw new Error('Unbekannter Wegpunkt ' + key);
    return i;
  }

  has(key: string) {
    return this.byKey.has(key);
  }

  link(a: number | string, b: number | string) {
    const ia = typeof a === 'string' ? this.id(a) : a;
    const ib = typeof b === 'string' ? this.id(b) : b;
    if (ia === ib) return;
    if (!this.adj[ia].includes(ib)) this.adj[ia].push(ib);
    if (!this.adj[ib].includes(ia)) this.adj[ib].push(ia);
    const tags = this.gates.filter((g) => crosses(g, this.pts[ia], this.pts[ib])).map((g) => g.id);
    if (tags.length) this.edgeGates.set(edgeKey(ia, ib), tags);
  }

  /** Sperre schließen/öffnen (Wege durch geschlossene Sperren werden gemieden) */
  setBlocked(gateId: string, blocked: boolean) {
    if (blocked === this.blocked.has(gateId)) return;
    if (blocked) this.blocked.add(gateId);
    else this.blocked.delete(gateId);
    this.cache.clear();
  }

  private passable(a: number, b: number) {
    if (!this.blocked.size) return true;
    const t = this.edgeGates.get(edgeKey(a, b));
    return !t || !t.some((g) => this.blocked.has(g));
  }

  /** Knoten, deren Kanten eine Sperre kreuzen (für Tests) */
  gatedEdges() {
    return [...this.edgeGates.entries()];
  }

  nearest(x: number, z: number): number {
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < this.pts.length; i++) {
      const d = (this.pts[i].x - x) ** 2 + (this.pts[i].z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  private dist(a: number, b: number) {
    return Math.hypot(this.pts[a].x - this.pts[b].x, this.pts[a].z - this.pts[b].z);
  }

  /** A* zwischen zwei Knoten */
  nodePath(a: number, b: number): number[] {
    const key = a + ':' + b;
    const c = this.cache.get(key);
    if (c) return c;
    const n = this.pts.length;
    const g = new Float64Array(n).fill(Infinity);
    const f = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const open = new Set<number>([a]);
    const closed = new Uint8Array(n);
    g[a] = 0;
    f[a] = this.dist(a, b);
    while (open.size) {
      let cur = -1;
      let bf = Infinity;
      for (const o of open)
        if (f[o] < bf) {
          bf = f[o];
          cur = o;
        }
      if (cur === b) break;
      open.delete(cur);
      closed[cur] = 1;
      for (const nb of this.adj[cur]) {
        if (closed[nb] || !this.passable(cur, nb)) continue;
        const ng = g[cur] + this.dist(cur, nb);
        if (ng < g[nb]) {
          g[nb] = ng;
          f[nb] = ng + this.dist(nb, b);
          prev[nb] = cur;
          open.add(nb);
        }
      }
    }
    const out: number[] = [];
    let k = b;
    if (prev[k] === -1 && k !== a) return [a, b];
    while (k !== -1) {
      out.push(k);
      k = prev[k];
    }
    out.reverse();
    this.cache.set(key, out);
    return out;
  }

  /** Weg von einer beliebigen Position zu einem Knoten (inkl. Zielpunkt). */
  route(from: Pt, toKey: string): Pt[] {
    const a = this.nearest(from.x, from.z);
    const b = this.id(toKey);
    const nodes = this.nodePath(a, b);
    const pts = nodes.map((i) => ({ ...this.pts[i] }));
    // ersten Knoten überspringen, wenn wir schon näher am zweiten sind
    if (pts.length >= 2) {
      const d01 = Math.hypot(pts[0].x - pts[1].x, pts[0].z - pts[1].z);
      const df1 = Math.hypot(from.x - pts[1].x, from.z - pts[1].z);
      if (df1 < d01) pts.shift();
    }
    return pts;
  }

  routeTo(from: Pt, to: Pt): Pt[] {
    const b = this.nearest(to.x, to.z);
    const a = this.nearest(from.x, from.z);
    const nodes = this.nodePath(a, b).map((i) => ({ ...this.pts[i] }));
    if (nodes.length >= 2) {
      const d01 = Math.hypot(nodes[0].x - nodes[1].x, nodes[0].z - nodes[1].z);
      const df1 = Math.hypot(from.x - nodes[1].x, from.z - nodes[1].z);
      if (df1 < d01) nodes.shift();
    }
    nodes.push({ ...to });
    return nodes;
  }
}

const edgeKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** Schneidet die Strecke a–b die (achsparallele) Sperrlinie? */
export function crosses(g: Gate, a: Pt, b: Pt): boolean {
  if (Math.abs(g.x1 - g.x0) < 1e-6) {
    const gx = g.x0;
    if ((a.x - gx) * (b.x - gx) >= 0) return false;
    const t = (gx - a.x) / (b.x - a.x);
    const z = a.z + (b.z - a.z) * t;
    return z >= Math.min(g.z0, g.z1) - 0.01 && z <= Math.max(g.z0, g.z1) + 0.01;
  }
  const gz = g.z0;
  if ((a.z - gz) * (b.z - gz) >= 0) return false;
  const t = (gz - a.z) / (b.z - a.z);
  const x = a.x + (b.x - a.x) * t;
  return x >= Math.min(g.x0, g.x1) - 0.01 && x <= Math.max(g.x0, g.x1) + 0.01;
}

export const cellKey = (zone: number, cell: number) => `D${zone}.${cell}`;

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Baut den Graphen für Hotel 1 aus dem Grundriss (Flurachsen + Stichwege). */
export function buildNav(): Nav {
  const nav = new Nav();
  nav.gates = GATES;
  // Punkte auf den Flurachsen sammeln
  const top = new Set<number>([LANE.leftX, LANE.midX, LANE.rightX]);
  const left = new Set<number>([LANE.topZ, 1.5]);
  const right = new Set<number>([LANE.topZ, 1.5]);
  const mid = new Set<number>([LANE.topZ, -6.0]);
  const doorOf = (c: (typeof CELLS)[number]) =>
    c.kind === 'wc' ? cellLocal(c.zone, c.index, WC.doorOut.u, WC.doorOut.v) : cellLocal(c.zone, c.index, ROOM.doorOut.u, ROOM.doorOut.v);
  const laneOf = (p: Pt): { set: Set<number>; v: number; key: (v: number) => string } => {
    if (p.z > -46.35 && p.z < -38.85) return { set: top, v: r2(p.x), key: (v) => `T:${v}` };
    if (p.x < -26.25) return { set: left, v: r2(p.z), key: (v) => `L:${v}` };
    if (p.x > 11.25) return { set: right, v: r2(p.z), key: (v) => `R:${v}` };
    return { set: mid, v: r2(p.z), key: (v) => `M:${v}` };
  };
  const stubs: { key: string; p: Pt; lane: ReturnType<typeof laneOf> }[] = [];
  for (const c of CELLS) {
    const d = doorOf(c);
    const ln = laneOf(d);
    ln.set.add(ln.v);
    stubs.push({ key: cellKey(c.zone, c.index), p: d, lane: ln });
  }
  for (let z = 1; z <= 7; z++) {
    const cp = cleanerPost(z);
    const ln = laneOf(cp);
    ln.set.add(ln.v);
    stubs.push({ key: `CP${z}`, p: cp, lane: ln });
  }
  const chain = (set: Set<number>, key: (v: number) => string, pos: (v: number) => Pt) => {
    let prev = -1;
    for (const v of [...set].sort((a, b) => a - b)) {
      const p = pos(v);
      const n = nav.node(key(v), p.x, p.z);
      if (prev >= 0) nav.link(prev, n);
      prev = n;
    }
  };
  chain(top, (v) => `T:${v}`, (v) => ({ x: v, z: LANE.topZ }));
  chain(left, (v) => `L:${v}`, (v) => ({ x: LANE.leftX, z: v }));
  chain(right, (v) => `R:${v}`, (v) => ({ x: LANE.rightX, z: v }));
  chain(mid, (v) => `M:${v}`, (v) => ({ x: LANE.midX, z: v }));
  // Ecken/Kreuzungen verbinden
  nav.link(`T:${LANE.leftX}`, `L:${LANE.topZ}`);
  nav.link(`T:${LANE.rightX}`, `R:${LANE.topZ}`);
  nav.link(`T:${LANE.midX}`, `M:${LANE.topZ}`);
  for (const s of stubs) {
    const n = nav.node(s.key, s.p.x, s.p.z);
    nav.link(n, s.lane.key(s.lane.v));
  }

  // Lobby
  const node = (k: string, p: Pt) => nav.node(k, p.x, p.z);
  node('LB', { x: LANE.midX, z: -6.0 });
  node('LML', { x: -7.5, z: 1.5 });
  node('DF', { x: 0, z: 1.5 });
  node('LR', { x: 4.2, z: 1.5 });
  node('LHJ', { x: -24.0, z: 1.5 });
  node('RHJ', { x: 9.2, z: 1.5 });
  node('RECEPTION', P.receptionPlayer);
  node('RECL', { x: -3.8, z: -2.2 });
  node('RECR', { x: 3.8, z: -2.2 });
  node('LEI', { x: 1.0, z: 4.8 });
  node('LEO', { x: 1.0, z: 7.4 });
  node('FX', { x: 1.0, z: 14.3 });
  node('SWM', { x: 1.0, z: 16.8 });
  node('SWR', P.exitRight);
  node('SWP', P.valetSpot);
  node('STO', { x: -21.0, z: 0.2 });
  node('PAPER', P.paperPickup);
  node('SP', P.supplierPost);
  node('SERVICE', P.serviceBarPickup);
  node('ELEV', P.elevatorPlate);
  nav.link('LB', 'M:-6');
  nav.link('LB', 'LML');
  nav.link('LB', 'RECL');
  nav.link('LML', 'DF');
  nav.link('DF', 'LR');
  nav.link('LML', 'RECL');
  nav.link('RECL', 'RECEPTION');
  nav.link('RECEPTION', 'RECR');
  nav.link('RECR', 'LR');
  nav.link('LR', 'LEI');
  nav.link('LEI', 'LEO');
  nav.link('LEO', 'FX');
  nav.link('FX', 'SWM');
  nav.link('SWM', 'SWR');
  nav.link('FX', 'SWP');
  nav.link('LML', 'LHJ');
  nav.link('LHJ', 'L:1.5');
  nav.link('LR', 'RHJ');
  nav.link('RHJ', 'R:1.5');
  nav.link('STO', 'LHJ');
  nav.link('STO', 'PAPER');
  nav.link('STO', 'SP');
  nav.link('SP', 'LML');
  nav.link('SERVICE', 'PAPER');
  nav.link('SERVICE', 'LB');
  nav.link('ELEV', `T:${LANE.midX}`);
  return nav;
}
