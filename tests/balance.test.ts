/**
 * Prüft die Balancing-Daten gegen die Spezifikation v5 und simuliert den
 * kompletten Freischaltgraphen. Ausführen: `npm test` (Node ≥ 22.18, TS nativ).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRICE_TABLE,
  LEVELS,
  ROOM_INCOME,
  STACK_SIZE,
  CLEANER_TIERS,
  START_CASH,
  levelForStars,
  nextThreshold,
  priceFor,
  purchaseStep,
} from '../src/config/balance.ts';
import { NODES, NODE_BY_ID, ZONE_CELLS, totalStars } from '../src/config/progression.ts';

test('Preistabelle hat 46 Einträge (§4)', () => {
  assert.equal(Object.keys(PRICE_TABLE).length, 46);
  assert.deepEqual(
    PRICE_TABLE['zone_1.room_02'].map((c) => c.cash),
    [30, 140, 280],
  );
  assert.deepEqual(
    PRICE_TABLE['supplier'].map((c) => [c.cash, c.res?.amount ?? 0]),
    [
      [780, 0],
      [970, 0],
      [1150, 5],
      [1350, 8],
      [3310, 11],
    ],
  );
  assert.equal(PRICE_TABLE['elevator'][0].cash, 5990);
  assert.equal(PRICE_TABLE['zone_7'][0].res?.type, 'toiletpaper');
  assert.equal(PRICE_TABLE['zone_7'][0].res?.amount, 28);
});

test('Levelschwellen und Belohnungen (§3)', () => {
  assert.deepEqual(
    LEVELS.map((l) => l.threshold),
    [30, 50, 85, 115, 145, 180, 240],
  );
  assert.deepEqual(
    LEVELS.map((l) => l.cash),
    [600, 1600, 2700, 4000, 5400, 7000, 5400],
  );
  assert.equal(levelForStars(0), 1);
  assert.equal(levelForStars(29), 1);
  assert.equal(levelForStars(30), 2);
  assert.equal(levelForStars(240), 8);
  assert.equal(nextThreshold(8), null);
});

test('Zimmereinnahmen: Trinkgeld = 20 % der Zahlung (§5)', () => {
  for (const t of [1, 2, 3]) assert.equal(ROOM_INCOME[t].tip, ROOM_INCOME[t].pay * 0.2);
  assert.equal(ROOM_INCOME[2].payRW, 40);
  assert.equal(ROOM_INCOME[3].payRW, 60);
});

test('Stapel fasst 10, Cleaner-Stufen, Startkapital (§2, §4, §10)', () => {
  assert.equal(STACK_SIZE, 10);
  assert.deepEqual(
    CLEANER_TIERS.map((c) => c.work),
    [0.5, 0.8, 1.0, 1.5],
  );
  assert.equal(START_CASH.length, 17);
  assert.equal(START_CASH[0], 50);
});

test('Belegte Kanten des Freischaltgraphen (§6)', () => {
  assert.ok(NODE_BY_ID['zone_1.room_01#1'].requires.includes('zone_1.toilet#1'));
  assert.ok(NODE_BY_ID['zone_1.room_01#2'].requires.includes('zone_1.cleaner#3'));
});

test('Zellbelegung: fehlende Zimmernummer = Toilette', () => {
  for (let z = 1; z <= 7; z++) {
    const c = ZONE_CELLS[z];
    const rooms = [c.a, c.b, c.c].sort();
    for (const r of rooms) assert.ok(PRICE_TABLE[`zone_${z}.room_0${r}`], `zone_${z}.room_0${r}`);
    assert.ok(!rooms.includes(c.wc));
  }
});

test('Gesamter Graph ist durchspielbar und erreicht Level 8', () => {
  const bought = new Set<string>();
  let stars = 0;
  let guard = 0;
  while (bought.size < NODES.length && guard++ < 1000) {
    const lvl = levelForStars(stars);
    const avail = NODES.filter((n) => !bought.has(n.id) && (n.minLevel ?? 1) <= lvl && n.requires.every((r) => bought.has(r)));
    assert.ok(avail.length > 0, `Sackgasse nach ${bought.size} Käufen bei ${stars} Sternen`);
    avail.sort((a, b) => priceFor(a.key, a.tier, 1).cash - priceFor(b.key, b.tier, 1).cash);
    bought.add(avail[0].id);
    stars += avail[0].stars;
  }
  assert.equal(bought.size, NODES.length);
  assert.equal(stars, totalStars());
  // Zone 1 room_01 hat laut Tabelle nur zwei Stufen → 243 statt 248 Sterne, Schwelle 240 bleibt erreichbar
  assert.equal(stars, 243);
  assert.ok(stars >= 240);
  assert.equal(levelForStars(stars), 8);
});

test('Zone 1 komplett = genau Level 2 (30 Sterne)', () => {
  const z1 = NODES.filter((n) => n.zone === 1).reduce((s, n) => s + n.stars, 0);
  assert.equal(z1, 30);
});

test('Kaufkurve: ≈ 3,2 s, Ease-out mit gemessenen Deltas (§9)', () => {
  const C = 3310;
  let p = 0;
  let t = 0;
  const deltas: number[] = [];
  while (p < 1 && t < 10) {
    const p2 = purchaseStep(p, 0.25);
    deltas.push((p2 - p) * C);
    p = p2;
    t += 0.25;
  }
  assert.ok(Math.abs(t - 3.25) < 0.01, `Dauer ${t}`);
  assert.ok(deltas[0] > 400 && deltas[0] < 550, `erstes Delta ${deltas[0]}`);
  const mid = deltas[Math.floor(deltas.length / 2) - 1];
  assert.ok(mid > 200 && mid < 300, `mittleres Delta ${mid}`);
  assert.ok(deltas[deltas.length - 1] < 20, `letztes Delta ${deltas[deltas.length - 1]}`);
  // Konstante Dauer unabhängig vom Betrag
  let q = 0;
  let n = 0;
  while (q < 1 && n < 1000) {
    q = purchaseStep(q, 1 / 60);
    n++;
  }
  assert.ok(Math.abs(n / 60 - 3.2) < 0.05);
});

test('Prestige-Preise ≈ 2,5- und 4,5-fach (§4)', () => {
  assert.equal(priceFor('elevator', 1, 2).cash, Math.round((5990 * 2.5) / 10) * 10);
  assert.equal(priceFor('elevator', 1, 3).cash, Math.round((5990 * 4.5) / 10) * 10);
});
