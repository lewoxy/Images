/**
 * Grundriss Hotel 1 nach `mph-floorplan.json` (Weltkoordinaten in Metern – wie im
 * Original sind Unity-Einheiten Meter, Stilhandbuch §2).
 *
 * Die Datei liefert Zimmer-, Toiletten- und Cleaner-Positionen sowie Landmarken.
 * Alle Zimmer liegen exakt auf einem 7,5-m-Raster (x = -37,5 + 7,5·k,
 * z = -50,1 + 7,5·j; Abweichungen ≤ 0,02 m werden gerundet). Daraus folgt:
 *  - linke Außenreihe (k = 0: Zonen 2 und 6) und rechte (k = 8: Zonen 5 und 7),
 *    Türen jeweils zum Flur daneben,
 *  - ein Innenblock aus zwei Spalten (k = 3 und 5: Zonen 1 und 4) mit Türen zum
 *    Mittelflur (k = 4), in dem laut Datei die Cleaner der Zonen 1 und 4 stehen,
 *  - eine hintere Reihe (j = 0: Zone 3, zwei Toiletten, Aufzug bei k = 4),
 *  - Lobby mit Rezeption bei (0, 0), davor Parkplatz (6,72 | 9,28).
 * Die Toiletten-Marker liegen einheitlich 2 m hinter der Zellmitte (Pivot des
 * Toilettenblocks). Die Datei nennt für Zone 3 zwei Toiletten und für Zone 5 keine;
 * die Toilette bei (15,2 | -52,1) liegt direkt über der Zimmerreihe von Zone 5 und
 * wird deshalb Zone 5 zugeordnet. Nicht belegt sind Flurbreiten und Innenhöfe
 * (🔧): die 15 m breiten Streifen zwischen Außenreihen und Innenblock werden als
 * 7,5 m breiter Flur plus Innenhof umgesetzt.
 *
 * Achsen: +x = rechts, -z = „hinten“ (vom Eingang weg, auf dem Bildschirm oben).
 */

export const CELL = 7.5;
/** Wandstärke gesamt (Stilhandbuch: 0,3) – jede Zelle trägt die innere Hälfte */
export const WALL_T = 0.3;
export const WALL_HALF = WALL_T / 2;
/** Wandhöhe (Stilhandbuch: 3,0) */
export const WALL_H = 3.0;
export const DOOR_H = 2.4;
/** Grundraster */
export const GRID = 1.5;

export const GRID_X0 = -37.5;
export const GRID_Z0 = -50.1;
export const colX = (c: number) => GRID_X0 + CELL * c;
export const rowZ = (r: number) => GRID_Z0 + CELL * r;

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export const rectCenter = (r: Rect) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });
export const rectW = (r: Rect) => r.x1 - r.x0;
export const rectD = (r: Rect) => r.z1 - r.z0;
/** Rechteck über Rasterspalten c0..c1 und -zeilen r0..r1 (inklusive) */
export function gridRect(c0: number, c1: number, r0: number, r1: number): Rect {
  return { x0: colX(c0) - CELL / 2, x1: colX(c1) + CELL / 2, z0: rowZ(r0) - CELL / 2, z1: rowZ(r1) + CELL / 2 };
}
export const inRect = (r: Rect, x: number, z: number, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;

// ------------------------------------------------------------------ Quelldaten
/** Auszug aus `mph-floorplan.json` (unverändert) */
export const FLOORPLAN_JSON = {
  rooms: [
    { zone: 6, room: 1, x: -37.5, z: -20.1 },
    { zone: 6, room: 3, x: -37.5, z: -5.1 },
    { zone: 6, room: 4, x: -37.5, z: 2.4 },
    { zone: 2, room: 1, x: -37.5, z: -42.6 },
    { zone: 2, room: 2, x: -37.5, z: -35.1 },
    { zone: 2, room: 3, x: -37.5, z: -27.6 },
    { zone: 4, room: 3, x: 0.0, z: -35.1 },
    { zone: 4, room: 2, x: -15.0, z: -27.6 },
    { zone: 4, room: 1, x: 0.0, z: -27.6 },
    { zone: 1, room: 4, x: -15.0, z: -20.1 },
    { zone: 1, room: 2, x: -15.0, z: -12.6 },
    { zone: 1, room: 1, x: 0.0, z: -12.6 },
    { zone: 3, room: 2, x: 7.51, z: -50.11 },
    { zone: 3, room: 4, x: -22.49, z: -50.1 },
    { zone: 3, room: 3, x: -15.0, z: -50.09 },
    { zone: 5, room: 1, x: 22.5, z: -42.6 },
    { zone: 5, room: 2, x: 22.5, z: -35.1 },
    { zone: 5, room: 3, x: 22.5, z: -27.6 },
    { zone: 7, room: 1, x: 22.5, z: -20.1 },
    { zone: 7, room: 3, x: 22.5, z: -5.1 },
    { zone: 7, room: 4, x: 22.5, z: 2.4 },
  ],
  cleaners: [
    { zone: 6, x: -27.7, z: -13.72 },
    { zone: 2, x: -27.59, z: -33.07 },
    { zone: 4, x: -6.6, z: -30.29 },
    { zone: 1, x: -5.01, z: -15.04 },
    { zone: 3, x: -2.84, z: -42.53 },
    { zone: 5, x: 15.84, z: -30.83 },
    { zone: 7, x: 15.97, z: -13.72 },
  ],
  toilets: [
    { zone: 2, x: -29.8, z: -52.1 },
    { zone: 3, x: 0.2, z: -52.1 },
    /** in der Datei ebenfalls Zone 3 – hier Zone 5 (siehe oben) */
    { zone: 5, x: 15.2, z: -52.1 },
    { zone: 4, x: -14.9, z: -37.1 },
    { zone: 1, x: 0.1, z: -22.1 },
    { zone: 6, x: -37.4, z: -14.6 },
    { zone: 7, x: 22.6, z: -14.6 },
  ],
  landmarks: {
    Elevator: { x: -7.34, z: -47.42 },
    Lobby: { x: 0, z: 0 },
    Reception: { x: 0, z: 0 },
    ParkerBase: { x: 0.82, z: 12.41 },
    Parking: { x: 6.72, z: 9.28 },
    Supplier: { x: -21.09, z: 14.22 },
    SupplierBase: { x: -13.0, z: 2.01 },
  },
};
/** Versatz der Toiletten-Marker gegenüber der Zellmitte */
export const TOILET_MARKER_DZ = -2;

// ------------------------------------------------------------------ Zellen
export type Dir = 'N' | 'S' | 'E' | 'W';
export const DIR_VEC: Record<Dir, { x: number; z: number }> = {
  N: { x: 0, z: -1 },
  S: { x: 0, z: 1 },
  E: { x: 1, z: 0 },
  W: { x: -1, z: 0 },
};
/** Drehung um die Hochachse, die lokales +z (Richtung Tür) auf die Türseite legt */
export const DIR_ANGLE: Record<Dir, number> = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };

export interface CellDef {
  zone: number;
  index: number;
  kind: 'room' | 'wc';
  col: number;
  row: number;
  door: Dir;
}

const snapCol = (x: number) => Math.round((x - GRID_X0) / CELL);
const snapRow = (z: number) => Math.round((z - GRID_Z0) / CELL);

/** Türseite aus der Lage im Raster: Außenreihen zum Flur, Innenblock zum Mittelflur, hintere Reihe nach vorn */
export function doorDirFor(col: number, row: number): Dir {
  if (row === 0) return 'S';
  if (col === 0) return 'E';
  if (col === 8) return 'W';
  if (col === 3) return 'E';
  if (col === 5) return 'W';
  throw new Error(`Keine Türseite für Zelle ${col}/${row}`);
}

/** Toiletten-Nummer je Zone = die in der Preistabelle fehlende Zimmernummer */
const WC_INDEX: Record<number, number> = { 1: 3, 2: 4, 3: 1, 4: 4, 5: 4, 6: 2, 7: 2 };

function buildCells(): CellDef[] {
  const out: CellDef[] = [];
  for (const r of FLOORPLAN_JSON.rooms) {
    const col = snapCol(r.x);
    const row = snapRow(r.z);
    out.push({ zone: r.zone, index: r.room, kind: 'room', col, row, door: doorDirFor(col, row) });
  }
  for (const t of FLOORPLAN_JSON.toilets) {
    const col = snapCol(t.x);
    const row = snapRow(t.z - TOILET_MARKER_DZ);
    out.push({ zone: t.zone, index: WC_INDEX[t.zone], kind: 'wc', col, row, door: doorDirFor(col, row) });
  }
  return out.sort((a, b) => a.zone - b.zone || a.index - b.index);
}

export const CELLS: CellDef[] = buildCells();
const CELL_BY_KEY = new Map(CELLS.map((c) => [`${c.zone}.${c.index}`, c]));

export function cellDef(zone: number, index: number): CellDef {
  const c = CELL_BY_KEY.get(`${zone}.${index}`);
  if (!c) throw new Error(`Zelle ${zone}.${index} fehlt im Grundriss`);
  return c;
}

/** Mitte einer Zelle */
export function cellCenter(zone: number, index: number) {
  const c = cellDef(zone, index);
  return { x: colX(c.col), z: rowZ(c.row) };
}

export function cellRect(zone: number, index: number): Rect {
  const c = cellCenter(zone, index);
  return { x0: c.x - CELL / 2, x1: c.x + CELL / 2, z0: c.z - CELL / 2, z1: c.z + CELL / 2 };
}

/** Rasterzelle belegt? (Zimmer/WC) */
export function cellAt(col: number, row: number): CellDef | undefined {
  return CELLS.find((c) => c.col === col && c.row === row);
}

/**
 * Lokales Zellsystem: v zeigt zur Tür, u liegt quer dazu (bei Tür nach vorn
 * entspricht u der Weltachse +x). Liefert Weltkoordinaten.
 */
export function cellLocal(zone: number, index: number, u: number, v: number) {
  const d = cellDef(zone, index);
  const a = DIR_ANGLE[d.door];
  const cx = colX(d.col);
  const cz = rowZ(d.row);
  return { x: cx + u * Math.cos(a) + v * Math.sin(a), z: cz - u * Math.sin(a) + v * Math.cos(a) };
}

/** Türmitte (u) im lokalen System – rechts von der Mitte, das Bett steht links */
export const DOOR_U = 1.9;
export const DOOR_W = 2.0;

// ------------------------------------------------------------------ Flächen
export const BUILDING: Rect = { x0: colX(0) - CELL / 2, x1: colX(8) + CELL / 2, z0: rowZ(0) - CELL / 2, z1: rowZ(7) + CELL / 2 };

/** Flure: hinten quer, links/rechts längs, Mittelflur zwischen den Innenblock-Spalten */
export const HALLS = {
  top: gridRect(1, 7, 1, 1),
  left: gridRect(1, 1, 2, 7),
  right: gridRect(7, 7, 2, 7),
  mid: gridRect(4, 4, 2, 5),
};
/** Innenhöfe (links: Lounge, freigeschaltet mit dem Aufzug; rechts: Garten) */
export const COURT_L: Rect = gridRect(2, 2, 2, 5);
export const COURT_R: Rect = gridRect(6, 6, 2, 5);
export const LOBBY: Rect = gridRect(2, 6, 6, 7);
/** Lagerecke der Lobby (Papierpalette, Regale) */
export const STORAGE: Rect = gridRect(2, 2, 6, 6);
export const ELEVATOR_CELL: Rect = gridRect(4, 4, 0, 0);

/** Laufachsen der Flure */
export const LANE = {
  leftX: colX(1),
  rightX: colX(7),
  topZ: rowZ(1),
  midX: colX(4),
};

// ------------------------------------------------------------------ Außen
export const FORECOURT: Rect = { x0: -62, x1: 48, z0: BUILDING.z1, z1: 15.5 };
export const SIDEWALK: Rect = { x0: -110, x1: 110, z0: 15.5, z1: 18.5 };
export const STREET: Rect = { x0: -110, x1: 110, z0: 18.5, z1: 28.5 };
export const LANE_NEAR = 21.0;
export const LANE_FAR = 26.0;
/** Parkplatz vor dem Gebäude (Mitte laut Datei: 6,72 | 9,28) */
export const PARKING_LOT: Rect = { x0: 1.6, x1: 11.8, z0: 6.6, z1: 12.4 };
export const PARKING_BAYS = [3.3, 6.7, 10.1];
export const PARKING_BAY_Z = 9.4;
/** Spielbereich draußen (Kollisionsgrenzen) */
export const OUTDOOR: Rect = { x0: -62, x1: 48, z0: BUILDING.z1, z1: SIDEWALK.z1 - 0.4 };

// ------------------------------------------------------------------ Punkte
const LM = FLOORPLAN_JSON.landmarks;

export const P = {
  receptionDesk: { x: LM.Reception.x, z: LM.Reception.z },
  receptionPlayer: { x: 0, z: -1.85 },
  receptionStaff: [
    { x: -2.1, z: -1.85 },
    { x: 2.1, z: -1.85 },
  ],
  receptionMoney: { x: -4.3, z: -2.2 },
  receptionPlate: { x: 5.1, z: -3.7 },
  queueStart: { x: 0, z: 1.5 },
  entranceIn: { x: 1.3, z: 4.8 },
  entranceOut: { x: 1.3, z: 7.4 },
  serviceBar: { x: -15.0, z: -7.5 },
  serviceBarPickup: { x: -15.0, z: -5.7 },
  trash: { x: -10.2, z: 4.6 },
  paperShelf: { x: -22.5, z: -7.45 },
  paperPickup: { x: -22.5, z: -5.2 },
  supplierPost: { x: LM.SupplierBase.x, z: LM.SupplierBase.z },
  supplierPlate: { x: -16.2, z: 2.0 },
  supplierVan: { x: LM.Supplier.x, z: LM.Supplier.z },
  parkingPlate: { x: LM.Parking.x, z: LM.Parking.z },
  parkerPost: { x: LM.ParkerBase.x, z: LM.ParkerBase.z },
  parkerPlate: { x: LM.ParkerBase.x, z: LM.ParkerBase.z },
  barrier: { x: 6.7, z: 14.3 },
  valetSpot: { x: 3.4, z: 14.3 },
  parkingMoney: { x: 1.3, z: 14.6 },
  elevator: { x: colX(4), z: -47.2 },
  elevatorPlate: { x: colX(4), z: rowZ(1) - 1.1 },
  helperPost: { x: 3.4, z: -6.4 },
  spawnLeft: { x: -60, z: 9.4 },
  exitRight: { x: 60, z: 16.8 },
};

/** Warteschlange: vom Tresen durch die Tür und draußen nach links */
export const QUEUE_PATH = [
  { x: 0, z: 1.5 },
  { x: 0, z: 8.9 },
  { x: -26, z: 8.9 },
];
export const QUEUE_SPACING = 1.25;

/** Cleaner-Posten laut Datei */
export function cleanerPost(zone: number) {
  const c = FLOORPLAN_JSON.cleaners.find((k) => k.zone === zone)!;
  return { x: c.x, z: c.z };
}

/** Reinigungswagen neben dem Posten (zur nächsten Flurwand hin) */
export function cleanerCartPos(zone: number) {
  const p = cleanerPost(zone);
  const off: Record<number, { x: number; z: number }> = {
    1: { x: 0.9, z: -1.3 },
    2: { x: 0.9, z: 1.2 },
    3: { x: -2.0, z: -1.9 },
    4: { x: 2.3, z: -0.2 },
    5: { x: -3.9, z: 0.4 },
    6: { x: 0.9, z: 1.2 },
    7: { x: -3.9, z: 0.4 },
  };
  const o = off[zone];
  return { x: p.x + o.x, z: p.z + o.z };
}

/** Zonen-Sperren: Zaun an einer Flurgrenze, fällt mit dem Kauf der Zone */
export interface Gate {
  id: string;
  zone: number;
  /** achsparallele Linie */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export const GATES: Gate[] = [
  // Lobby → linker Flur (Zone 2)
  { id: 'G2', zone: 2, x0: HALLS.left.x1, z0: rowZ(7) - CELL / 2, x1: HALLS.left.x1, z1: LOBBY.z1 },
  // linker Flur → hinterer Flur (Zone 3)
  { id: 'G3', zone: 3, x0: HALLS.left.x1, z0: HALLS.top.z0, x1: HALLS.left.x1, z1: HALLS.top.z1 },
  // Mittelflur Süd/Nord (Zone 4)
  { id: 'G4S', zone: 4, x0: HALLS.mid.x0, z0: rowZ(3) + CELL / 2, x1: HALLS.mid.x1, z1: rowZ(3) + CELL / 2 },
  { id: 'G4N', zone: 4, x0: HALLS.mid.x0, z0: HALLS.mid.z0, x1: HALLS.mid.x1, z1: HALLS.mid.z0 },
  // Lobby → rechter Flur und hinterer Flur → rechter Flur (Zone 5)
  { id: 'G5', zone: 5, x0: HALLS.right.x0, z0: rowZ(7) - CELL / 2, x1: HALLS.right.x0, z1: LOBBY.z1 },
  { id: 'G5N', zone: 5, x0: HALLS.right.x0, z0: HALLS.top.z0, x1: HALLS.right.x0, z1: HALLS.top.z1 },
];

/** Freischaltplatte einer Zone: vor der jeweiligen Sperre bzw. im Flur der Zone */
export function zonePlatePos(zone: number) {
  const pos: Record<number, { x: number; z: number }> = {
    2: { x: -23.6, z: 1.4 },
    3: { x: -29.0, z: -41.6 },
    4: { x: colX(4), z: -21.4 },
    5: { x: 8.6, z: -5.2 },
    6: { x: LANE.leftX, z: -9.0 },
    7: { x: LANE.rightX, z: -9.0 },
  };
  return pos[zone] ?? { x: 0, z: 0 };
}

/** Was liegt in einer Rasterzelle? (für Wandseiten und Tests) */
export type AreaKind = 'cell' | 'elevator' | 'hall' | 'lobby' | 'court' | 'outside';
export function areaAt(col: number, row: number): AreaKind {
  if (cellAt(col, row)) return 'cell';
  if (col === 4 && row === 0) return 'elevator';
  if (row === 1 && col >= 1 && col <= 7) return 'hall';
  if ((col === 1 || col === 7) && row >= 2 && row <= 7) return 'hall';
  if (col === 4 && row >= 2 && row <= 5) return 'hall';
  if (row >= 6 && row <= 7 && col >= 2 && col <= 6) return 'lobby';
  if ((col === 2 || col === 6) && row >= 2 && row <= 5) return 'court';
  return 'outside';
}

/** Rasterindex eines Weltpunkts */
export const colOf = (x: number) => Math.round((x - GRID_X0) / CELL);
export const rowOf = (z: number) => Math.round((z - GRID_Z0) / CELL);
