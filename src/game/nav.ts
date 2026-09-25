/**
 * Wegpunkt-Graph statt Navmesh (§16: „Pathfinding über feste Wegpunkt-Splines“).
 * NPCs laufen Polylinien ab; innerhalb von Zimmern/WCs hängen lokale Punkte an.
 */
import { P, ROWS, ZONES, cellLocal, cleanerPost, hallZ } from '../config/floorplan.ts';
import { ROOM, WC } from '../config/layout.ts';
import { ZONE_CELLS } from '../config/progression.ts';

export interface Pt {
  x: number;
  z: number;
}

export class Nav {
  pts: Pt[] = [];
  adj: number[][] = [];
  private byKey = new Map<string, number>();
  private cache = new Map<string, number[]>();

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
        if (closed[nb]) continue;
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

export const cellKey = (zone: number, cell: number) => `D${zone}.${cell}`;

/** Baut den Graphen für Hotel 1 aus dem Grundriss. */
export function buildNav(): Nav {
  const nav = new Nav();
  // Flurlinien
  const hallXs: Record<number, Set<number>> = { 1: new Set([-31.2, 0, 31.2]), 2: new Set([-31.2, 0, 31.2]), 3: new Set([-31.2, 0, 31.2]) };
  const round = (x: number) => Math.round(x * 100) / 100;
  for (let z = 1; z <= 7; z++) {
    const row = ROWS[ZONES[z].row];
    for (let i = 1; i <= 4; i++) {
      const isWC = ZONE_CELLS[z].wc === i;
      const d = cellLocal(z, i, isWC ? WC.doorOut.u : ROOM.doorOut.u, isWC ? WC.doorOut.v : ROOM.doorOut.v);
      hallXs[row.hall].add(round(d.x));
    }
    hallXs[row.hall].add(round(cleanerPost(z).x));
  }
  // Lounge-Reihe (4 links) hat keine Türen; Lagertür am Flur 1
  hallXs[1].add(P.storageDoorHall.x);
  for (const h of [1, 2, 3]) {
    const xs = [...hallXs[h]].sort((a, b) => a - b);
    const hz = hallZ(h);
    let prev = -1;
    for (const x of xs) {
      const n = nav.node(`H${h}:${round(x)}`, x, hz);
      if (prev >= 0) nav.link(prev, n);
      prev = n;
    }
  }
  // Mittelflur
  nav.link('H1:0', 'H2:0');
  nav.link('H2:0', 'H3:0');
  // Türen, Cleaner-Posten
  for (let z = 1; z <= 7; z++) {
    const row = ROWS[ZONES[z].row];
    for (let i = 1; i <= 4; i++) {
      const isWC = ZONE_CELLS[z].wc === i;
      const d = cellLocal(z, i, isWC ? WC.doorOut.u : ROOM.doorOut.u, isWC ? WC.doorOut.v : ROOM.doorOut.v);
      const n = nav.node(cellKey(z, i), d.x, d.z);
      nav.link(n, `H${row.hall}:${round(d.x)}`);
    }
    const cp = cleanerPost(z);
    const n = nav.node(`CP${z}`, cp.x, cp.z);
    nav.link(n, `H${row.hall}:${round(cp.x)}`);
  }
  // Lobby
  nav.node('LB', 0, -7.4);
  nav.link('LB', 'H1:0');
  nav.node('LBR', 6.8, -6.3);
  nav.node('LR', 7.4, 1.0);
  nav.node('LEI', 2.1, 4.5);
  nav.node('LEO', 2.1, 7.6);
  nav.node('SWR', P.exitRight.x, P.exitRight.z);
  nav.node('DF', 0, 0.55);
  nav.link('LB', 'LBR');
  nav.link('LBR', 'LR');
  nav.link('LR', 'LEI');
  nav.link('LEI', 'LEO');
  nav.link('LEO', 'SWR');
  nav.link('DF', 'LR');
  nav.node('LBL', -6.8, -6.3);
  nav.link('LB', 'LBL');
  nav.node('LSD', -13.4, -3.2);
  nav.link('LBL', 'LSD');
  nav.node('SDL', -16.8, -3.2);
  nav.link('LSD', 'SDL');
  nav.node('PAPER', P.paperPickup.x, P.paperPickup.z);
  nav.link('SDL', 'PAPER');
  nav.node('SP', P.supplierPost.x, P.supplierPost.z);
  nav.link('PAPER', 'SP');
  nav.node('SDI', P.storageDoorHall.x, -7.2);
  nav.link('SDI', 'PAPER');
  nav.link('SDI', 'SP');
  nav.link('SDI', `H1:${P.storageDoorHall.x}`);
  nav.node('SERVICE', P.serviceBarPickup.x, P.serviceBarPickup.z);
  nav.link('SERVICE', 'LBL');
  nav.link('SERVICE', 'LSD');
  nav.node('RECEPTION', P.receptionPlayer.x, P.receptionPlayer.z);
  nav.node('RECL', -5.4, -2.6);
  nav.link('RECEPTION', 'RECL');
  nav.link('RECL', 'LBL');
  nav.node('RECR', 5.4, -2.6);
  nav.link('RECEPTION', 'RECR');
  nav.link('RECR', 'LBR');
  nav.node('ELEV', P.elevatorPlate.x, P.elevatorPlate.z);
  nav.link('ELEV', 'H3:0');
  // Gehweg (für die Wegführung des Spielers zur Parkplatz-Platte)
  nav.node('SWP', P.valetSpot.x, P.valetSpot.z);
  nav.link('LEO', 'SWP');
  return nav;
}
