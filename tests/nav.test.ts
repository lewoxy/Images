/** Wegpunkt-Graph: alle Ziele müssen von der Lobby aus erreichbar sein. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNav, cellKey } from '../src/game/nav.ts';

const nav = buildNav();

function reachable(from: string, to: string): boolean {
  const path = nav.nodePath(nav.id(from), nav.id(to));
  if (path[path.length - 1] !== nav.id(to)) return false;
  for (let i = 1; i < path.length; i++) if (!nav.adj[path[i - 1]].includes(path[i])) return false;
  return true;
}

test('alle Zimmer- und WC-Türen sind von der Lobby erreichbar', () => {
  for (let z = 1; z <= 7; z++) for (let c = 1; c <= 4; c++) assert.ok(reachable('LB', cellKey(z, c)), `Zone ${z} Zelle ${c}`);
});

test('Cleaner-Posten, Lager, Service-Theke, Aufzug und Ausgang erreichbar', () => {
  for (let z = 1; z <= 7; z++) assert.ok(reachable('LB', `CP${z}`), `Posten ${z}`);
  for (const k of ['PAPER', 'SP', 'SERVICE', 'RECEPTION', 'ELEV', 'SWR', 'DF']) assert.ok(reachable('LB', k), k);
});

test('Wege zwischen weit entfernten Zonen bleiben kurz genug', () => {
  const path = nav.nodePath(nav.id(cellKey(7, 4)), nav.id('SWR'));
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    const a = nav.pts[path[i - 1]];
    const b = nav.pts[path[i]];
    len += Math.hypot(a.x - b.x, a.z - b.z);
  }
  // Luftlinie ≈ 95; ein Umweg über mehr als das Doppelte wäre ein Graphfehler
  assert.ok(len < 190, `Weglänge ${len.toFixed(1)}`);
});
