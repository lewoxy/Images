/** Grundriss gegen mph-floorplan.json und Freischalt-Reihenfolge prüfen. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CELLS,
  DIR_VEC,
  FLOORPLAN_JSON,
  GATES,
  P,
  TOILET_MARKER_DZ,
  areaAt,
  cellCenter,
  cellLocal,
  cleanerPost,
  colOf,
  rowOf,
  zonePlatePos,
} from '../src/config/floorplan.ts';
import { ZONE_CELLS } from '../src/config/progression.ts';
import { buildNav, cellKey, crosses } from '../src/game/nav.ts';

test('alle Zimmer der Datei liegen (±0,05 m) auf dem 7,5-m-Raster', () => {
  for (const r of FLOORPLAN_JSON.rooms) {
    const c = cellCenter(r.zone, r.room);
    assert.ok(Math.hypot(c.x - r.x, c.z - r.z) < 0.05, `Zone ${r.zone} Zimmer ${r.room}`);
  }
  for (const t of FLOORPLAN_JSON.toilets) {
    const wc = CELLS.find((c) => c.kind === 'wc' && c.zone === t.zone)!;
    const c = cellCenter(wc.zone, wc.index);
    assert.ok(Math.hypot(c.x - t.x, c.z + TOILET_MARKER_DZ - t.z) < 0.25, `Toilette Zone ${t.zone}`);
  }
});

test('je Zone drei Zimmer und eine Toilette, passend zur Preistabelle', () => {
  assert.equal(CELLS.length, 28);
  const seen = new Set(CELLS.map((c) => `${c.col}/${c.row}`));
  assert.equal(seen.size, 28, 'keine doppelt belegte Rasterzelle');
  for (let z = 1; z <= 7; z++) {
    const zc = ZONE_CELLS[z];
    const cells = CELLS.filter((c) => c.zone === z);
    assert.equal(cells.length, 4);
    assert.deepEqual(cells.filter((c) => c.kind === 'room').map((c) => c.index).sort(), [zc.a, zc.b, zc.c].sort());
    assert.equal(cells.find((c) => c.kind === 'wc')!.index, zc.wc);
  }
});

test('jede Tür öffnet sich in einen Flur', () => {
  for (const c of CELLS) {
    const d = DIR_VEC[c.door];
    assert.equal(areaAt(c.col + d.x, c.row + d.z), 'hall', `Zone ${c.zone}.${c.index} Tür ${c.door}`);
  }
});

test('Cleaner-Posten stehen im Flur', () => {
  for (let z = 1; z <= 7; z++) {
    const p = cleanerPost(z);
    assert.equal(areaAt(colOf(p.x), rowOf(p.z)), 'hall', `Zone ${z}`);
  }
});

test('Landmarken aus der Datei werden verwendet', () => {
  const lm = FLOORPLAN_JSON.landmarks;
  assert.deepEqual(P.receptionDesk, lm.Reception);
  assert.deepEqual(P.parkingPlate, lm.Parking);
  assert.deepEqual(P.parkerPost, lm.ParkerBase);
  assert.deepEqual(P.supplierPost, lm.SupplierBase);
  assert.deepEqual(P.supplierVan, lm.Supplier);
  assert.ok(Math.hypot(P.elevator.x - lm.Elevator.x, P.elevator.z - lm.Elevator.z) < 0.5);
});

/** Weg von der Lobby zu einem Knoten, nur durch offene Sperren */
function reachableWith(open: Set<number>, key: string) {
  const nav = buildNav();
  for (const g of GATES) nav.setBlocked(g.id, !open.has(g.zone));
  const a = nav.id('LB');
  const b = nav.id(key);
  const path = nav.nodePath(a, b);
  if (path[path.length - 1] !== b) return false;
  for (let i = 1; i < path.length; i++) {
    if (!nav.adj[path[i - 1]].includes(path[i])) return false;
    const p = nav.pts[path[i - 1]];
    const q = nav.pts[path[i]];
    if (GATES.some((g) => !open.has(g.zone) && crosses(g, p, q))) return false;
  }
  return true;
}

test('Sperren: Zonen sind genau nach ihrem Kauf erreichbar', () => {
  const open = new Set<number>([1]);
  for (let z = 1; z <= 7; z++) {
    open.add(z);
    for (const c of CELLS.filter((k) => k.zone === z)) assert.ok(reachableWith(open, cellKey(c.zone, c.index)), `Zone ${z} Zelle ${c.index}`);
    assert.ok(reachableWith(open, `CP${z}`), `Cleaner-Posten ${z}`);
  }
  // vor dem Kauf: Zone 2 (linker Flur) und Zone 4 (Mittelflur hinten) gesperrt
  assert.ok(!reachableWith(new Set([1]), cellKey(2, 1)));
  assert.ok(!reachableWith(new Set([1, 2, 3]), cellKey(4, 1)));
  assert.ok(!reachableWith(new Set([1, 2, 3, 4]), cellKey(5, 1)));
});

test('Zonenplatten liegen vor der eigenen Sperre (erreichbar mit den vorherigen Zonen)', () => {
  const nav = buildNav();
  for (let z = 2; z <= 7; z++) {
    const open = new Set<number>();
    for (let k = 1; k < z; k++) open.add(k);
    for (const g of GATES) nav.setBlocked(g.id, !open.has(g.zone));
    const p = zonePlatePos(z);
    const n = nav.nearest(p.x, p.z);
    const path = nav.nodePath(nav.id('LB'), n);
    assert.equal(path[path.length - 1], n, `Zone ${z}: Weg zur Platte`);
    for (let i = 1; i < path.length; i++) assert.ok(nav.adj[path[i - 1]].includes(path[i]), `Zone ${z}: Weg unterbrochen`);
    assert.ok(!GATES.some((g) => !open.has(g.zone) && crosses(g, nav.pts[n], p)), `Zone ${z}: Platte hinter einer Sperre`);
  }
});

test('Türwege liegen außerhalb der Zelle (im Flur)', () => {
  for (const c of CELLS) {
    const d = cellLocal(c.zone, c.index, 1.9, 4.95);
    assert.equal(areaAt(colOf(d.x), rowOf(d.z)), 'hall', `Zone ${c.zone}.${c.index}`);
  }
});
