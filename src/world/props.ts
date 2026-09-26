import { GeoBuilder } from './geo';
import { C, STYLE, MEASURED as M } from '../config/palette';

/**
 * Möbel und Requisiten, alle eigene Modelle aus Grundkörpern. Jede Funktion baut
 * im lokalen System (Boden y = 0, Vorderseite +z) und wird über GeoBuilder.group
 * platziert. Maße nach Stilhandbuch §2/§3: etwa 1,5-fach über Realmaß, nie höher
 * als 3,0 m; klare Silhouetten, wenige Farbfamilien, kein Schwarz.
 */

/** Dunkle Details ohne Schwarz (Stilhandbuch: V ≥ 0,4) */
export const DARK = 0x5c3593;
export const METAL = 0xa9c4d9;
export const METAL_D = STYLE.mutedBlue;

// ------------------------------------------------------------------ Zimmer

/**
 * Rechteckiges Bett 2,8 × 3,0 m, Kopfteil mit Bogen bei −z. Die Bettdecke ist ein
 * eigenes, texturiertes Teil (cells.ts) auf Höhe BED_TOP.
 */
export const BED = { w: 2.8, l: 3.0, top: 0.78, blanketL: 2.05, blanketZ: 0.42 };
export function bed(g: GeoBuilder, frame: number, pillow: number, arch = true, trim?: number) {
  const { w, l } = BED;
  // Rahmen und Füße
  g.rbox(w, 0.34, l, 0.06, frame, 0, 0.12, 0);
  for (const x of [-w / 2 + 0.16, w / 2 - 0.16]) for (const z of [-l / 2 + 0.2, l / 2 - 0.16]) g.box(0.2, 0.14, 0.2, frame, x, 0, z);
  // Matratze (weiß) und umgeschlagenes Laken
  g.rbox(w - 0.14, 0.3, l - 0.2, 0.06, C.sheet, 0, 0.46, 0.02);
  g.rbox(w - 0.1, 0.06, 0.3, 0.03, C.sheet, 0, BED.top - 0.02, -0.28);
  // Kissen
  g.rbox(1.05, 0.24, 0.62, 0.1, pillow, -0.66, BED.top - 0.04, -l / 2 + 0.55);
  g.rbox(1.05, 0.24, 0.62, 0.1, pillow, 0.66, BED.top - 0.04, -l / 2 + 0.55);
  // Kopfteil: Paneel mit Bogen
  g.box(w + 0.1, 1.25, 0.22, frame, 0, 0, -l / 2 + 0.02);
  if (arch) {
    g.cyl(w / 2 + 0.05, w / 2 + 0.05, 0.22, frame, 0, 1.25 - 0.95, -l / 2 - 0.09, 16, { rx: Math.PI / 2 });
  } else {
    g.box(w + 0.1, 0.2, 0.3, frame, 0, 1.25, -l / 2 + 0.02);
  }
  if (trim !== undefined) {
    g.box(w + 0.16, 0.1, 0.26, trim, 0, 1.24, -l / 2 + 0.02);
    for (const x of [-w / 2 - 0.02, w / 2 + 0.02]) g.sphere(0.13, trim, x, 1.34, -l / 2 + 0.02, 8);
  }
  // Fußteil
  g.box(w + 0.1, 0.62, 0.16, frame, 0, 0, l / 2 - 0.05);
}

/** Rundbett (Stufe 3): Sockel mit Goldring, halbrundes Kopfteil. Liegefläche texturiert (cells.ts). */
export const ROUND_BED = { r: 1.55, top: 0.72 };
export function roundBed(g: GeoBuilder, frame: number, trim: number, pillow: number) {
  const r = ROUND_BED.r;
  g.cyl(r + 0.08, r, 0.36, frame, 0, 0.06, 0, 24);
  g.cyl(r + 0.12, r + 0.12, 0.08, trim, 0, 0.38, 0, 24);
  g.cyl(r - 0.05, r - 0.05, 0.22, C.sheet, 0, 0.42, 0, 24);
  // halbrundes Kopfteil hinten
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const x = Math.cos(a) * (r + 0.1);
    const z = Math.sin(a) * (r + 0.1);
    g.box(0.66, 1.35 - Math.abs(i - 4) * 0.08, 0.26, frame, x, 0, z, { ry: -a - Math.PI / 2 });
  }
  g.sphere(0.16, trim, 0, 1.45, -r - 0.1, 8);
  g.rbox(1.0, 0.24, 0.55, 0.1, pillow, -0.55, ROUND_BED.top, -r + 0.6, { ry: 0.25 });
  g.rbox(1.0, 0.24, 0.55, 0.1, pillow, 0.55, ROUND_BED.top, -r + 0.6, { ry: -0.25 });
}

/** Nachttisch 1,1 × 0,75 × 0,66 mit Schublade; Lampe optional */
export function nightstand(g: GeoBuilder, color: number, lamp = true, shadeColor = C.lampShade, round = false) {
  if (round) {
    g.cyl(0.5, 0.5, 0.75, color, 0, 0, 0, 14);
    g.cyl(0.54, 0.54, 0.06, STYLE.gold, 0, 0.72, 0, 14);
  } else {
    g.rbox(1.1, 0.75, 0.66, 0.05, color, 0, 0, 0);
    g.box(0.9, 0.24, 0.04, 0xf9faf7, 0, 0.36, 0.33);
    g.box(0.84, 0.18, 0.05, color, 0, 0.39, 0.34);
    g.sphere(0.05, STYLE.gold, 0, 0.48, 0.38, 6);
  }
  if (lamp) {
    g.cyl(0.14, 0.2, 0.08, STYLE.gold, 0, 0.75, 0, 8);
    g.cyl(0.05, 0.05, 0.3, STYLE.gold, 0, 0.83, 0, 6);
    g.cyl(0.18, 0.3, 0.36, shadeColor, 0, 1.1, 0, 4, { ry: Math.PI / 4 });
  }
}

/** Wandleuchte (hängt an der Wand, Vorderseite +z), y = Montagehöhe */
export function wallLamp(g: GeoBuilder, color = STYLE.gold, shadeColor = C.lampShade) {
  g.cyl(0.14, 0.14, 0.06, color, 0, 0, 0.03, 10, { rx: Math.PI / 2 });
  g.box(0.06, 0.06, 0.3, color, 0, -0.03, 0.18);
  g.cyl(0.14, 0.24, 0.3, shadeColor, 0, 0.0, 0.34, 4, { ry: Math.PI / 4 });
}

/** Wanduhr (rund), Vorderseite +z */
export function wallClock(g: GeoBuilder, rim = STYLE.lead) {
  g.cyl(0.36, 0.36, 0.1, rim, 0, 0, 0.05, 16, { rx: Math.PI / 2 });
  g.cyl(0.29, 0.29, 0.04, 0xf9faf7, 0, 0, 0.1, 16, { rx: Math.PI / 2 });
  g.box(0.04, 0.2, 0.02, DARK, 0, 0.08, 0.13);
  g.box(0.15, 0.04, 0.02, DARK, 0.06, 0, 0.13);
}

/** Standuhr 0,7 × 2,4 × 0,45 */
export function grandfatherClock(g: GeoBuilder, wood: number, trim = STYLE.gold) {
  g.rbox(0.8, 0.3, 0.5, 0.04, wood, 0, 0, 0);
  g.box(0.62, 1.4, 0.42, wood, 0, 0.3, 0);
  g.box(0.36, 0.9, 0.02, 0xfff3a0, 0, 0.5, 0.21);
  g.cyl(0.12, 0.12, 0.03, trim, 0, 0.62, 0.23, 12, { rx: Math.PI / 2 });
  g.box(0.03, 0.5, 0.02, trim, 0, 0.72, 0.225);
  g.rbox(0.78, 0.7, 0.5, 0.05, wood, 0, 1.7, 0);
  g.cyl(0.26, 0.26, 0.04, 0xf9faf7, 0, 2.05, 0.25, 16, { rx: Math.PI / 2 });
  g.box(0.03, 0.18, 0.02, DARK, 0, 2.08, 0.27);
  g.cyl(0.4, 0.4, 0.5, wood, 0, 2.4, -0.25, 12, { rx: Math.PI / 2, sz: 0.5 });
  g.sphere(0.08, trim, 0, 2.72, 0, 6);
}

/** Fenster (Rahmen + Glas), Vorderseite +z, y = Unterkante */
export function windowFrame(g: GeoBuilder, w: number, h: number, frame = 0xf9faf7) {
  g.box(w + 0.2, h + 0.2, 0.08, frame, 0, -0.1, 0.02);
  g.box(w, h, 0.04, 0x9ff3ff, 0, 0, 0.06);
  g.box(0.08, h, 0.06, frame, 0, 0, 0.08);
  g.box(w, 0.08, 0.06, frame, 0, h * 0.55, 0.08);
  g.box(w + 0.3, 0.1, 0.22, frame, 0, -0.14, 0.1);
}

export function rug(g: GeoBuilder, w: number, d: number, color: number, border?: number) {
  if (border !== undefined) g.box(w + 0.24, 0.02, d + 0.24, border, 0, 0.004, 0);
  g.box(w, 0.03, d, color, 0, 0.008, 0);
}

export function roundRug(g: GeoBuilder, r: number, color: number, border: number) {
  g.cyl(r + 0.14, r + 0.14, 0.02, border, 0, 0.004, 0, 24);
  g.cyl(r, r, 0.03, color, 0, 0.008, 0, 24);
}

export function wardrobe(g: GeoBuilder, color: number, h = 2.3) {
  g.rbox(2.0, h, 0.8, 0.05, color, 0, 0, 0);
  g.box(1.84, h - 0.3, 0.02, mixDark(color), 0, 0.15, 0.405);
  for (const x of [-0.46, 0.46]) g.box(0.84, h - 0.42, 0.03, color, x, 0.21, 0.41);
  g.sphere(0.06, STYLE.gold, -0.1, h * 0.55, 0.44, 6);
  g.sphere(0.06, STYLE.gold, 0.1, h * 0.55, 0.44, 6);
  g.box(2.1, 0.12, 0.88, color, 0, h, 0);
}

function mixDark(c: number) {
  const r = ((c >> 16) & 255) * 0.72;
  const gg = ((c >> 8) & 255) * 0.72;
  const b = (c & 255) * 0.72;
  return (Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(b);
}

export function plant(g: GeoBuilder, scale = 1, pot = C.plantPot, leaf = C.plantLeaf) {
  const s = scale * 1.25;
  g.cyl(0.32 * s, 0.24 * s, 0.52 * s, pot, 0, 0, 0, 8);
  g.cyl(0.36 * s, 0.36 * s, 0.08 * s, pot, 0, 0.5 * s, 0, 8);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    g.cone(0.14 * s, 0.9 * s, i % 2 ? leaf : M.umgebung.baumHell, Math.sin(a) * 0.16 * s, 0.55 * s, Math.cos(a) * 0.16 * s, 4, { rx: Math.cos(a) * 0.5, rz: -Math.sin(a) * 0.5 });
  }
  g.cone(0.16 * s, 1.1 * s, leaf, 0, 0.55 * s, 0, 4);
}

export function palm(g: GeoBuilder, scale = 1) {
  const s = scale * 1.2;
  g.cyl(0.34 * s, 0.26 * s, 0.5 * s, C.plantPot, 0, 0, 0, 8);
  g.cyl(0.08 * s, 0.11 * s, 1.2 * s, C.treeTrunk, 0, 0.5 * s, 0, 6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.box(0.26 * s, 0.05 * s, 1.0 * s, i % 2 ? C.plantLeaf : STYLE.hedge, Math.sin(a) * 0.4 * s, 1.62 * s, Math.cos(a) * 0.4 * s, { ry: a, rx: 0.45 });
  }
}

/** Bilderrahmen (Bild selbst ist ein texturiertes Teil) – hängt an der Wand, Vorderseite +z */
export function pictureFrame(g: GeoBuilder, w: number, h: number, color = STYLE.gold) {
  g.box(w + 0.16, h + 0.16, 0.08, color, 0, -0.08, 0);
}

export function tv(g: GeoBuilder) {
  g.rbox(1.0, 0.06, 0.34, 0.02, DARK, 0, 0.0, 0);
  g.box(0.1, 0.18, 0.08, DARK, 0, 0.05, 0);
  g.rbox(1.69, 1.0, 0.12, 0.03, DARK, 0, 0.21, 0);
  g.box(1.53, 0.84, 0.02, M.ui.badgeCyan, 0, 0.29, 0.065);
  g.box(0.5, 0.3, 0.02, 0x9ff3ff, -0.35, 0.62, 0.075);
}

export function dresser(g: GeoBuilder, color: number) {
  g.rbox(2.0, 0.95, 0.72, 0.05, color, 0, 0, 0);
  for (const y of [0.18, 0.5]) {
    g.box(1.8, 0.26, 0.03, mixDark(color), 0, y, 0.36);
    g.sphere(0.05, STYLE.gold, -0.45, y + 0.13, 0.39, 6);
    g.sphere(0.05, STYLE.gold, 0.45, y + 0.13, 0.39, 6);
  }
  g.box(2.1, 0.08, 0.8, mixDark(color), 0, 0.95, 0);
}

/** Tischchen + Hocker (Stufe 1) */
export function smallTable(g: GeoBuilder, color: number, seat: number) {
  g.cyl(0.62, 0.62, 0.08, color, 0, 0.8, 0, 12);
  g.cyl(0.08, 0.1, 0.8, color, 0, 0, 0, 8);
  g.cyl(0.36, 0.42, 0.06, color, 0, 0, 0, 10);
  g.cyl(0.36, 0.32, 0.5, seat, -0.95, 0, 0.1, 10);
  g.cyl(0.38, 0.38, 0.1, seat, -0.95, 0.5, 0.1, 10);
}

/** Sessel (Kübelform, SofaArm) */
export function armchair(g: GeoBuilder, color: number, cushion: number) {
  g.cyl(0.72, 0.62, 0.55, color, 0, 0.05, 0, 12);
  g.cyl(0.6, 0.6, 0.14, cushion, 0, 0.55, 0.05, 12);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    g.box(0.36, 0.72, 0.24, color, Math.cos(a) * 0.62, 0.45, Math.sin(a) * 0.62, { ry: -a - Math.PI / 2 });
  }
  for (const x of [-0.4, 0.4]) g.cyl(0.06, 0.06, 0.12, STYLE.gold, x, 0, 0.35, 6);
}

export function sofa(g: GeoBuilder, color: number, cushion: number, w = 2.6) {
  g.rbox(w, 0.46, 1.14, 0.1, color, 0, 0.08, 0);
  const n = Math.max(2, Math.round(w / 1.1));
  const cw = (w - 0.56) / n;
  for (let i = 0; i < n; i++) g.rbox(cw - 0.06, 0.18, 0.82, 0.06, cushion, -w / 2 + 0.28 + cw * (i + 0.5), 0.52, 0.1);
  g.rbox(w, 0.9, 0.3, 0.1, color, 0, 0.3, -0.42);
  g.rbox(0.3, 0.64, 1.1, 0.1, color, -w / 2 + 0.12, 0.3, 0.02);
  g.rbox(0.3, 0.64, 1.1, 0.1, color, w / 2 - 0.12, 0.3, 0.02);
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) g.box(0.12, 0.08, 0.12, STYLE.gold, x, 0, 0.42);
}

/** Glastisch rund auf Säule */
export function coffeeTable(g: GeoBuilder, color: number) {
  g.cyl(0.36, 0.44, 0.06, color, 0, 0, 0, 12);
  g.cyl(0.08, 0.1, 0.52, color, 0, 0.06, 0, 8);
  g.cyl(0.78, 0.78, 0.07, 0x9ff3ff, 0, 0.58, 0, 18);
  g.cyl(0.8, 0.8, 0.03, color, 0, 0.56, 0, 18);
  g.cyl(0.12, 0.1, 0.2, 0xf9faf7, 0.25, 0.65, 0.12, 8);
}

export function lampFloor(g: GeoBuilder) {
  g.cyl(0.24, 0.28, 0.06, STYLE.gold, 0, 0, 0, 10);
  g.cyl(0.04, 0.04, 1.8, STYLE.gold, 0, 0.06, 0, 6);
  g.cyl(0.24, 0.4, 0.5, C.lampShade, 0, 1.7, 0, 4, { ry: Math.PI / 4 });
}

// ------------------------------------------------------------------ Sanitär

export function toilet(g: GeoBuilder) {
  g.rbox(0.74, 0.9, 0.3, 0.06, C.wcToilet, 0, 0.4, -0.46);
  g.cyl(0.3, 0.22, 0.45, C.wcToilet, 0, 0, 0.02, 12);
  g.cyl(0.34, 0.34, 0.07, C.wcToiletSeat, 0, 0.45, 0.04, 14);
  g.box(0.18, 0.05, 0.08, 0xf9faf7, 0, 1.3, -0.46);
}

export function sink(g: GeoBuilder) {
  g.rbox(1.05, 0.95, 0.62, 0.05, M.sanitaer.holzTan, 0, 0, 0);
  g.cyl(0.32, 0.24, 0.14, C.wcSink, 0, 0.9, 0.02, 12);
  g.cyl(0.04, 0.04, 0.34, METAL, 0, 0.95, -0.22, 6);
  g.box(1.0, 0.8, 0.05, 0x9ff3ff, 0, 1.32, -0.3);
  g.box(1.1, 0.08, 0.08, STYLE.gold, 0, 2.12, -0.3);
}

export function paperRoll(g: GeoBuilder, x = 0, y = 0, z = 0, upright = true) {
  if (upright) {
    g.cyl(0.19, 0.19, 0.3, C.paper, x, y, z, 10);
    g.cyl(0.065, 0.065, 0.305, STYLE.sand, x, y, z, 6);
  } else {
    g.cyl(0.19, 0.19, 0.3, C.paper, x, y + 0.19, z, 10, { rz: Math.PI / 2 });
  }
}

/** Palette mit Klopapier (Lager) */
export function paperPallet(g: GeoBuilder) {
  g.box(2.6, 0.2, 1.9, STYLE.sand, 0, 0, 0);
  for (const x of [-1.1, 0, 1.1]) g.box(0.2, 0.2, 1.92, 0xb8a36e, x, 0, 0);
  for (let layer = 0; layer < 4; layer++)
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 4; j++) paperRoll(g, -1.05 + i * 0.42, 0.2 + layer * 0.31, -0.63 + j * 0.42);
  g.box(2.64, 0.12, 1.94, M.ui.badgeCyan, 0, 0.72, 0);
}

export function shelfUnit(g: GeoBuilder, w: number, withRolls: boolean, color = C.shelf) {
  const h = 2.4;
  for (const x of [-w / 2 + 0.06, w / 2 - 0.06]) g.box(0.12, h, 0.7, color, x, 0, 0);
  for (const y of [0.1, 0.8, 1.5, 2.2]) g.box(w, 0.08, 0.7, color, 0, y, 0);
  if (withRolls) {
    for (const y of [0.18, 0.88, 1.58]) for (let x = -w / 2 + 0.34; x < w / 2 - 0.2; x += 0.42) paperRoll(g, x, y, 0);
  } else {
    for (const y of [0.18, 0.88, 1.58]) for (let x = -w / 2 + 0.45; x < w / 2 - 0.3; x += 0.78) g.box(0.62, 0.48, 0.56, C.box, x, y, 0);
  }
}

export function boxStack(g: GeoBuilder) {
  g.box(0.9, 0.7, 0.9, C.box, 0, 0, 0);
  g.box(0.8, 0.56, 0.8, 0xe4ce87, 0.05, 0.7, -0.02, { ry: 0.3 });
  g.box(0.92, 0.1, 0.12, 0xb8a36e, 0, 0.35, 0.4);
}

export function washer(g: GeoBuilder) {
  g.rbox(1.1, 1.2, 1.0, 0.06, C.washer, 0, 0, 0);
  g.cyl(0.36, 0.36, 0.05, 0x9ff3ff, 0, 0.55, 0.5, 14, { rx: Math.PI / 2 });
  g.cyl(0.26, 0.26, 0.06, 0x339eff, 0, 0.55, 0.51, 14, { rx: Math.PI / 2 });
  g.box(1.0, 0.14, 0.05, METAL, 0, 1.02, 0.49);
}

export function cleaningCart(g: GeoBuilder) {
  g.box(1.3, 0.12, 0.7, STYLE.lead, 0, 0.14, 0);
  g.box(1.3, 0.12, 0.7, STYLE.lead, 0, 0.86, 0);
  for (const x of [-0.6, 0.6]) for (const z of [-0.3, 0.3]) g.box(0.06, 0.9, 0.06, METAL, x, 0.12, z);
  for (const x of [-0.52, 0.52]) for (const z of [-0.26, 0.26]) g.sphere(0.08, METAL_D, x, 0.08, z, 6);
  g.cyl(0.24, 0.2, 0.4, STYLE.gold, -0.3, 0.98, 0, 10);
  g.cyl(0.035, 0.035, 1.4, 0xb98a55, 0.34, 0.98, 0.06, 6, { rz: -0.15 });
  g.box(0.36, 0.24, 0.36, 0xf9faf7, 0.24, 0.26, 0);
  g.cyl(0.09, 0.09, 0.26, STYLE.pink, -0.36, 0.26, 0.1, 8);
}

export function vendingMachine(g: GeoBuilder, color: number) {
  g.rbox(1.4, 2.4, 1.0, 0.05, color, 0, 0, 0);
  g.box(0.86, 1.5, 0.05, 0x9ff3ff, -0.16, 0.7, 0.5);
  const cans = [STYLE.signalRed, STYLE.gold, STYLE.emerald, 0x339eff, STYLE.orange];
  for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) g.cyl(0.08, 0.08, 0.22, cans[(r + i) % cans.length], -0.48 + i * 0.21, 0.78 + r * 0.34, 0.4, 6);
  g.box(0.26, 1.0, 0.06, DARK, 0.45, 1.0, 0.5);
  g.box(0.86, 0.22, 0.06, DARK, -0.16, 0.28, 0.5);
  g.box(1.44, 0.3, 1.04, 0xf9faf7, 0, 2.2, 0);
}

export function waterCooler(g: GeoBuilder) {
  g.rbox(0.62, 1.15, 0.56, 0.05, 0xf9faf7, 0, 0, 0);
  g.cyl(0.26, 0.26, 0.56, 0x62a5d3, 0, 1.15, 0, 10);
  g.sphere(0.26, 0x62a5d3, 0, 1.71, 0, 10, { sy: 0.4 });
}

// ------------------------------------------------------------------ Außen

/** Kiefer 3,1 × 5,3 m: drei gestufte Kegel */
export function pine(g: GeoBuilder, s = 1, light = false) {
  const a = light ? M.umgebung.baumHell : M.umgebung.baumDunkel;
  const b = light ? 0x3fbf78 : M.umgebung.baumHell;
  g.cyl(0.18 * s, 0.26 * s, 1.0 * s, C.treeTrunk, 0, 0, 0, 6);
  g.cone(1.55 * s, 2.2 * s, a, 0, 0.8 * s, 0, 7);
  g.cone(1.2 * s, 1.9 * s, b, 0, 2.0 * s, 0, 7);
  g.cone(0.85 * s, 1.7 * s, a, 0, 3.4 * s, 0, 7);
}

/** Laubbaum (Tree01/02-Art): Stamm mit gestapelten Kronen */
export function tree(g: GeoBuilder, s = 1, leaf = C.treeLeaf) {
  g.cyl(0.2 * s, 0.28 * s, 1.8 * s, C.treeTrunk, 0, 0, 0, 6);
  g.sphere(1.3 * s, leaf, 0, 2.6 * s, 0, 7);
  g.sphere(0.95 * s, C.treeLeaf2, 0.6 * s, 2.2 * s, 0.4 * s, 7);
  g.sphere(0.85 * s, C.treeLeaf2, -0.6 * s, 2.4 * s, -0.25 * s, 7);
  g.sphere(0.8 * s, leaf, 0.1 * s, 3.5 * s, 0.05 * s, 7);
}

export function bush(g: GeoBuilder, s = 1) {
  g.sphere(0.6 * s, C.bush, 0, 0.42 * s, 0, 7);
  g.sphere(0.46 * s, STYLE.lawn, 0.48 * s, 0.34 * s, 0.1 * s, 7);
  g.sphere(0.44 * s, M.umgebung.baumHell, -0.44 * s, 0.32 * s, 0.05 * s, 7);
  g.sphere(0.13 * s, STYLE.pink, 0.2 * s, 0.9 * s, 0.25 * s, 5);
  g.sphere(0.11 * s, STYLE.gold, -0.25 * s, 0.76 * s, 0.3 * s, 5);
}

/** Grasbüschel (Grass01/02): drei flache Spitzen */
export function grassTuft(g: GeoBuilder, s = 1) {
  for (let i = 0; i < 3; i++) g.cone(0.12 * s, 0.4 * s, i === 1 ? STYLE.lawn : STYLE.hedge, (i - 1) * 0.16 * s, 0, 0, 3, { rz: (i - 1) * 0.35 });
}

export function lampPost(g: GeoBuilder) {
  g.cyl(0.22, 0.28, 0.24, METAL_D, 0, 0, 0, 8);
  g.cyl(0.07, 0.09, 3.4, METAL_D, 0, 0.24, 0, 6);
  g.box(0.9, 0.08, 0.08, METAL_D, 0.3, 3.5, 0);
  g.cyl(0.26, 0.2, 0.36, METAL_D, 0.7, 3.2, 0, 6);
  g.cyl(0.18, 0.18, 0.12, C.lampLight, 0.7, 3.12, 0, 6);
}

export function bench(g: GeoBuilder, color = STYLE.sand) {
  for (const x of [-0.8, 0.8]) g.box(0.14, 0.48, 0.56, METAL_D, x, 0, 0);
  g.box(2.1, 0.1, 0.66, color, 0, 0.48, 0);
  g.box(2.1, 0.5, 0.1, color, 0, 0.64, -0.3);
}

export function trafficCone(g: GeoBuilder) {
  g.box(0.55, 0.06, 0.55, STYLE.orange, 0, 0, 0);
  g.cone(0.22, 0.7, STYLE.orange, 0, 0.06, 0, 8);
  g.cyl(0.13, 0.17, 0.14, 0xf9faf7, 0, 0.32, 0, 8);
}

/** Lattenzaun (Fence 2,5 × 0,9 m je Element), Länge entlang x */
export function picketFence(g: GeoBuilder, len: number, color = C.fence) {
  const n = Math.max(1, Math.round(len / 2.5));
  const seg = len / n;
  for (let i = 0; i <= n; i++) g.box(0.16, 1.0, 0.16, color, -len / 2 + i * seg, 0, 0);
  g.box(len, 0.1, 0.07, color, 0, 0.3, 0);
  g.box(len, 0.1, 0.07, color, 0, 0.66, 0);
  for (let x = -len / 2 + 0.25; x < len / 2 - 0.1; x += 0.36) {
    g.box(0.14, 0.78, 0.05, color, x, 0.04, 0.05);
    g.cone(0.1, 0.14, color, x, 0.82, 0.05, 4, { ry: Math.PI / 4 });
  }
}

/** Absperrung für gesperrte Bereiche (Länge entlang x): rot-weiße Baken */
export function fence(g: GeoBuilder, len: number) {
  const n = Math.max(1, Math.round(len / 2.5));
  const seg = len / n;
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + i * seg;
    g.cyl(0.08, 0.08, 1.2, 0xf9faf7, x, 0, 0, 6);
    g.box(0.4, 0.1, 0.4, METAL_D, x, 0, 0);
  }
  for (let i = 0; i < n; i++) {
    const x0 = -len / 2 + i * seg;
    const stripes = 6;
    for (let k = 0; k < stripes; k++) {
      const col = k % 2 === 0 ? STYLE.signalRed : 0xf9faf7;
      g.box(seg / stripes, 0.24, 0.07, col, x0 + (k + 0.5) * (seg / stripes), 0.82, 0);
      g.box(seg / stripes, 0.16, 0.07, k % 2 === 0 ? 0xf9faf7 : STYLE.signalRed, x0 + (k + 0.5) * (seg / stripes), 0.4, 0);
    }
  }
}

export function scaffold(g: GeoBuilder, w: number, h: number) {
  for (const x of [-w / 2, w / 2]) for (const z of [-0.45, 0.45]) g.cyl(0.06, 0.06, h, METAL, x, 0, z, 6);
  for (let y = 0.9; y < h; y += 0.9) g.box(w, 0.08, 1.0, STYLE.sand, 0, y, 0);
}

/** Auto 3,3 × 2,2 × 5,4 m (Vehicle_Car-Maße), Längsachse z, Front bei +z */
export function car(g: GeoBuilder, color: number) {
  g.rbox(2.9, 0.8, 5.2, 0.28, color, 0, 0.36, 0);
  g.rbox(2.5, 0.85, 2.7, 0.26, color, 0, 1.08, -0.35);
  g.rbox(2.56, 0.6, 2.56, 0.22, 0x9ff3ff, 0, 1.18, -0.35);
  g.rbox(2.6, 0.2, 1.5, 0.08, color, 0, 1.78, -0.35);
  for (const x of [-1.38, 1.38])
    for (const z of [-1.7, 1.7]) {
      g.cyl(0.5, 0.5, 0.36, 0x6b5c8a, x, 0.5, z, 10, { rz: Math.PI / 2 });
      g.cyl(0.24, 0.24, 0.38, METAL, x, 0.5, z, 8, { rz: Math.PI / 2 });
    }
  g.box(0.56, 0.22, 0.06, 0xfff3a0, -0.9, 0.78, 2.6);
  g.box(0.56, 0.22, 0.06, 0xfff3a0, 0.9, 0.78, 2.6);
  g.box(0.56, 0.18, 0.06, STYLE.signalRed, -0.9, 0.78, -2.6);
  g.box(0.56, 0.18, 0.06, STYLE.signalRed, 0.9, 0.78, -2.6);
  g.box(2.96, 0.14, 0.2, METAL, 0, 0.42, 2.58);
  g.box(2.96, 0.14, 0.2, METAL, 0, 0.42, -2.58);
}

/** Lieferwagen des Papierlieferanten, Längsachse z */
export function van(g: GeoBuilder, color = 0xf9faf7, stripe = STYLE.lead) {
  g.rbox(2.8, 2.5, 4.4, 0.18, color, 0, 0.45, -0.7);
  g.rbox(2.7, 1.5, 1.6, 0.24, color, 0, 0.45, 2.2);
  g.rbox(2.72, 0.7, 1.0, 0.18, 0x9ff3ff, 0, 1.2, 2.4);
  g.box(2.84, 0.4, 4.3, stripe, 0, 1.4, -0.7);
  for (const x of [-1.3, 1.3])
    for (const z of [-2.1, 1.9]) {
      g.cyl(0.52, 0.52, 0.36, 0x6b5c8a, x, 0.52, z, 10, { rz: Math.PI / 2 });
      g.cyl(0.25, 0.25, 0.38, METAL, x, 0.52, z, 8, { rz: Math.PI / 2 });
    }
  g.box(0.5, 0.2, 0.06, 0xfff3a0, -0.9, 0.9, 3.0);
  g.box(0.5, 0.2, 0.06, 0xfff3a0, 0.9, 0.9, 3.0);
  // Klopapier-Logo auf der Seite
  for (const s of [-1, 1]) {
    g.cyl(0.4, 0.4, 0.05, 0xf9faf7, s * 1.43, 2.0, -0.7, 12, { rz: Math.PI / 2 });
    g.cyl(0.14, 0.14, 0.06, STYLE.sand, s * 1.44, 2.0, -0.7, 8, { rz: Math.PI / 2 });
  }
}

export function flowerBed(g: GeoBuilder, w: number, d: number) {
  g.box(w, 0.32, d, 0xf9faf7, 0, 0, 0);
  g.box(w - 0.24, 0.05, d - 0.24, 0xa8643a, 0, 0.3, 0);
  const cols = [STYLE.pink, STYLE.gold, STYLE.orange, 0x8b48e2, 0xf9faf7];
  let k = 0;
  for (let x = -w / 2 + 0.4; x < w / 2 - 0.25; x += 0.5)
    for (let z = -d / 2 + 0.4; z < d / 2 - 0.25; z += 0.5) {
      g.sphere(0.18, STYLE.hedge, x, 0.45, z, 6);
      g.sphere(0.1, cols[k++ % cols.length], x + 0.05, 0.63, z + 0.02, 5);
    }
}

/** Hecke (Quader mit Stufen) */
export function hedge(g: GeoBuilder, len: number) {
  g.box(len, 0.9, 0.8, STYLE.hedge, 0, 0, 0);
  g.box(len - 0.2, 0.12, 0.6, STYLE.lawn, 0, 0.9, 0);
}

export function barrierGate(g: GeoBuilder) {
  g.box(0.56, 1.15, 0.56, STYLE.gold, 0, 0, 0);
  g.box(0.36, 0.24, 0.36, DARK, 0, 1.15, 0);
}

/** Schlagbaum (dynamisch, drehbar) – Länge entlang +x */
export function barrierArm(g: GeoBuilder, len: number) {
  const n = 6;
  for (let i = 0; i < n; i++) g.box(len / n, 0.16, 0.14, i % 2 === 0 ? C.barrierRed : C.barrierPole, (i + 0.5) * (len / n), -0.08, 0);
}

/** Parkwächter-Häuschen */
export function booth(g: GeoBuilder) {
  g.box(1.8, 2.2, 1.6, 0xf9faf7, 0, 0, 0);
  g.box(1.6, 0.9, 0.05, 0x9ff3ff, 0, 1.0, 0.8);
  g.box(2.1, 0.2, 1.9, STYLE.lead, 0, 2.2, 0);
}

export function suitcase(g: GeoBuilder, color = 0x8b48e2) {
  g.rbox(0.7, 0.82, 0.34, 0.08, color, 0, 0, 0);
  g.box(0.09, 0.82, 0.35, STYLE.gold, -0.18, 0, 0);
  g.box(0.09, 0.82, 0.35, STYLE.gold, 0.18, 0, 0);
  g.torus(0.11, 0.028, DARK, 0, 0.88, 0);
}

/** Rezeptionstresen (LobbyDesk-Art) 5,4 lang, 1,6 tief, 1,25 hoch; Vorderseite +z */
export const DESK = { w: 5.4, d: 1.6, h: 1.25 };
export function reception(g: GeoBuilder) {
  const { w, d, h } = DESK;
  g.box(w, h - 0.1, d, C.deskWood, 0, 0, 0);
  // Front in Leitfarbe mit Goldleisten
  g.box(w - 0.2, h - 0.35, 0.06, C.deskFront, 0, 0.12, d / 2);
  for (let i = -2; i <= 2; i++) g.box(0.12, h - 0.35, 0.08, STYLE.gold, i * 1.1, 0.12, d / 2 + 0.01);
  g.box(w + 0.3, 0.12, d + 0.3, C.deskTop, 0, h - 0.1, 0.05);
  // Seitenflügel
  for (const s of [-1, 1]) g.box(0.4, h - 0.1, d + 0.2, C.deskWoodDark, s * (w / 2 + 0.05), 0, 0);
  // Bildschirm, Klingel, Blumen
  g.box(0.1, 0.25, 0.1, DARK, -1.3, h, -0.3);
  g.box(0.9, 0.6, 0.08, DARK, -1.3, h + 0.2, -0.3, { rx: -0.1 });
  g.box(0.8, 0.5, 0.02, M.ui.badgeCyan, -1.3, h + 0.25, -0.25, { rx: -0.1 });
  g.dome(0.18, STYLE.gold, 0.4, h + 0.02, 0.3, 10);
  g.sphere(0.05, STYLE.gold, 0.4, h + 0.22, 0.3, 6);
  g.group((p) => plant(p, 0.45), 2.2, h + 0.02, 0.0);
  g.box(0.5, 0.06, 0.36, 0xf9faf7, 1.3, h + 0.02, 0.2, { ry: 0.3 });
}

/** Aufzugsrahmen (Vorderseite +z) */
export function elevatorDoorFrame(g: GeoBuilder) {
  g.box(3.8, 2.9, 0.4, STYLE.gold, 0, 0, 0);
  g.box(2.8, 2.5, 0.1, METAL_D, 0, 0.0, 0.18);
  g.box(1.3, 0.36, 0.1, DARK, 0, 2.5, 0.22);
  g.sphere(0.08, STYLE.signalRed, -0.3, 2.68, 0.28, 6);
  g.sphere(0.08, M.waehrung.cash, 0.3, 2.68, 0.28, 6);
  g.box(0.18, 0.34, 0.06, 0xf9faf7, 1.6, 1.1, 0.22);
}

/** Springbrunnen 2,7 × 2,9 (Fountain-Art): Becken, Schale, Spitze */
export function fountain(g: GeoBuilder) {
  g.cyl(1.5, 1.6, 0.55, STYLE.neutralBlue, 0, 0, 0, 12);
  g.cyl(1.32, 1.32, 0.05, 0x62d8ff, 0, 0.5, 0, 12);
  g.cyl(0.3, 0.38, 1.1, STYLE.neutralBlue, 0, 0.5, 0, 8);
  g.cyl(0.85, 0.35, 0.32, STYLE.neutralBlue, 0, 1.6, 0, 12);
  g.cyl(0.72, 0.72, 0.04, 0x62d8ff, 0, 1.88, 0, 12);
  g.cyl(0.14, 0.2, 0.7, STYLE.neutralBlue, 0, 1.9, 0, 8);
  g.sphere(0.24, 0x9ff3ff, 0, 2.7, 0, 8);
}

export function piano(g: GeoBuilder) {
  g.rbox(2.0, 1.1, 1.5, 0.06, 0x8b48e2, 0, 0.1, 0);
  g.box(1.8, 0.06, 0.44, 0xf9faf7, 0, 0.98, 0.68);
  for (let i = 0; i < 8; i++) g.box(0.09, 0.05, 0.24, DARK, -0.78 + i * 0.22, 1.04, 0.6);
  for (const x of [-0.8, 0.8]) g.cyl(0.06, 0.06, 0.1, STYLE.gold, x, 0, 0.55, 6);
}
