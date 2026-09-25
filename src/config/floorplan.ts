/**
 * Grundriss Hotel 1 (Weltkoordinaten, 1 Einheit ≈ 0,5 m).
 *
 * Rekonstruiert nach §6: sieben Zonen mit je drei Zimmern und einem
 * Toilettenblock, Zimmerraster 7,5 Einheiten, Grundfläche ≈ 66 × 60, Lobby mit
 * Rezeption bei (0, 0) am Straßenrand, Parkplatz vorne rechts, Lager/Supplier
 * vorne links, Aufzug am hinteren Ende der Mittelachse. Zone 1 liegt direkt
 * hinter der Lobby. Die Originaldatei `mph-floorplan.json` lag nicht bei; die
 * Anordnung der Zonen entlang eines Mittelflurs mit Querfluren ist daher eine
 * eigene Umsetzung (🔧), die die belegten Kennzahlen einhält.
 *
 * Achsen: +x = rechts, -z = „hinten“ (vom Eingang weg, auf dem Bildschirm oben).
 */

export const CELL = 7.5;
/** Wandstärke je Raumseite (zwei aneinanderstoßende Räume ergeben 0,5) */
export const WALL_HALF = 0.25;
export const WALL_H = 2.0;
export const SPINE_HALF = 3;

export const BUILDING = { x0: -33, x1: 33, z0: -54, z1: 6 };

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export const rectCenter = (r: Rect) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });
export const rectW = (r: Rect) => r.x1 - r.x0;
export const rectD = (r: Rect) => r.z1 - r.z0;

/** Zimmerreihen. doorSide +1: Tür an der vorderen (+z) Wand, -1: an der hinteren. */
export const ROWS: Record<number, { z0: number; z1: number; doorSide: 1 | -1; hall: number }> = {
  1: { z0: -21.5, z1: -14, doorSide: 1, hall: 1 },
  2: { z0: -29, z1: -21.5, doorSide: -1, hall: 2 },
  3: { z0: -41.5, z1: -34, doorSide: 1, hall: 2 },
  4: { z0: -49, z1: -41.5, doorSide: -1, hall: 3 },
};

export const HALLS: Record<number, Rect> = {
  1: { x0: -33, x1: 33, z0: -14, z1: -9 },
  2: { x0: -33, x1: 33, z0: -34, z1: -29 },
  3: { x0: -33, x1: 33, z0: -54, z1: -49 },
};
export const hallZ = (h: number) => (HALLS[h].z0 + HALLS[h].z1) / 2;

/** Mittelflur (verbindet die Querflure) */
export const SPINE: Rect = { x0: -SPINE_HALF, x1: SPINE_HALF, z0: -49, z1: -14 };

/** Zonen: Reihe und Seite (+1 rechts, -1 links). */
export const ZONES: Record<number, { row: number; side: 1 | -1 }> = {
  1: { row: 1, side: 1 },
  2: { row: 1, side: -1 },
  3: { row: 2, side: 1 },
  4: { row: 2, side: -1 },
  5: { row: 3, side: 1 },
  6: { row: 3, side: -1 },
  7: { row: 4, side: 1 },
};

/** Lounge (wird mit dem Aufzug freigeschaltet) – Reihe 4 links */
export const LOUNGE = { row: 4, side: -1 as const };

export const LOBBY: Rect = { x0: -15, x1: 15, z0: -9, z1: 6 };
export const STORAGE: Rect = { x0: -33, x1: -15, z0: -9, z1: 6 };
export const GARAGE: Rect = { x0: 15, x1: 33, z0: -9, z1: 6 };

export const SIDEWALK: Rect = { x0: -46, x1: 46, z0: 6, z1: 10.5 };
export const STREET: Rect = { x0: -90, x1: 90, z0: 10.5, z1: 19.5 };
export const LANE_NEAR = 12.75;
export const LANE_FAR = 17.25;

/** Mitte einer Zelle (Zone, Index 1..4 vom Mittelflur nach außen) */
export function cellCenter(zone: number, index: number) {
  const z = ZONES[zone];
  const row = ROWS[z.row];
  const x = z.side * (SPINE_HALF + CELL * (index - 0.5));
  return { x, z: (row.z0 + row.z1) / 2 };
}

export function cellRect(zone: number, index: number): Rect {
  const c = cellCenter(zone, index);
  return { x0: c.x - CELL / 2, x1: c.x + CELL / 2, z0: c.z - CELL / 2, z1: c.z + CELL / 2 };
}

export function zoneRect(zone: number): Rect {
  const z = ZONES[zone];
  const row = ROWS[z.row];
  const xa = z.side * SPINE_HALF;
  const xb = z.side * (SPINE_HALF + CELL * 4);
  return { x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0: row.z0, z1: row.z1 };
}

/** Tür-z (Wandlinie) und die Richtung „nach draußen in den Flur“ */
export function doorLine(zone: number) {
  const row = ROWS[ZONES[zone].row];
  return { z: row.doorSide === 1 ? row.z1 : row.z0, out: row.doorSide };
}

/**
 * Lokales Raumkoordinatensystem: u entlang x, v = Richtung zur Tür (v>0 → Tür).
 * Liefert Weltkoordinaten für einen Punkt (u, v) in einer Zelle.
 */
export function cellLocal(zone: number, index: number, u: number, v: number) {
  const c = cellCenter(zone, index);
  const out = ROWS[ZONES[zone].row].doorSide;
  return { x: c.x + u, z: c.z + v * out };
}

/** Türmitte (u) im lokalen System – rechts von der Mitte, das Bett steht links */
export const DOOR_U = 1.75;
export const DOOR_W = 2.0;

/** Wichtige Punkte */
export const P = {
  receptionDesk: { x: 0, z: -1.0 },
  receptionPlayer: { x: 0, z: -2.7 },
  receptionStaff: [
    { x: -1.6, z: -2.6 },
    { x: 1.6, z: -2.6 },
  ],
  receptionMoney: { x: -5.3, z: -3.5 },
  receptionPlate: { x: 5.7, z: -4.4 },
  queueStart: { x: 0, z: 0.55 },
  entranceIn: { x: 1.9, z: 4.4 },
  entranceOut: { x: 1.9, z: 7.6 },
  lobbyBackR: { x: 2.2, z: -7.8 },
  lobbyBackL: { x: -2.2, z: -7.8 },
  lobbySideR: { x: 7.8, z: -5.8 },
  lobbySideRF: { x: 7.8, z: 1.2 },
  serviceBar: { x: -11.2, z: -6.6 },
  serviceBarPickup: { x: -11.2, z: -4.7 },
  trash: { x: -12.8, z: 2.4 },
  paperShelf: { x: -19.5, z: -7.6 },
  paperPickup: { x: -19.5, z: -5.6 },
  storageDoorLobby: { x: -15, z: -3.2 },
  storageDoorHall: { x: -25.5, z: -9 },
  supplierPost: { x: -27.5, z: -2.5 },
  supplierPlate: { x: -26.5, z: 1.6 },
  garageEntrance: { x: 24, z: 6 },
  barrier: { x: 24, z: 7.5 },
  valetSpot: { x: 20.0, z: 8.3 },
  parkingMoney: { x: 29.8, z: 8.3 },
  parkingPlate: { x: 24, z: 8.3 },
  parkerPlate: { x: 16.6, z: 8.3 },
  elevator: { x: 0, z: -53.4 },
  elevatorPlate: { x: 0, z: -51.3 },
  spawnLeft: { x: -30, z: 8.9 },
  spawnRight: { x: 45, z: 8.9 },
  exitRight: { x: 45, z: 8.0 },
};

/** Warteschlange: Polylinie vom Tresen durch die Tür und auf dem Gehweg nach links */
export const QUEUE_PATH = [
  { x: 0, z: 0.55 },
  { x: 0, z: 8.7 },
  { x: -30, z: 8.7 },
];
export const QUEUE_SPACING = 1.2;

/** Cleaner-Posten: am äußeren Ende des Querflurs, auf der Seite der jeweiligen Zone */
export function cleanerPost(zone: number) {
  const d = doorLine(zone);
  return { x: ZONES[zone].side * 30.9, z: d.z + d.out * 1.3 };
}

/** Freischaltplatte einer Zone: im Flur vor der Mitte der Zone */
export function zonePlatePos(zone: number) {
  const d = doorLine(zone);
  return { x: ZONES[zone].side * 18.0, z: d.z + d.out * 1.5 };
}
