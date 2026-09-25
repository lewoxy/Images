import { GeoBuilder } from './geo';
import { C } from '../config/palette';

/**
 * Möbel und Requisiten, alle aus Primitiven. Jede Funktion baut im lokalen
 * System (Boden y = 0, Vorderseite +z) und wird über GeoBuilder.group platziert.
 */

export function bed(g: GeoBuilder, frame: number, blanket: number, deluxe = false) {
  // Längsachse z: Kopfteil bei -z
  for (const x of [-0.9, 0.9]) for (const z of [-1.35, 1.35]) g.cyl(0.07, 0.07, 0.14, C.doorFrame, x, 0, z, 6);
  g.rbox(2.1, 0.36, 3.0, 0.1, frame, 0, 0.12, 0);
  g.rbox(1.92, 0.24, 2.84, 0.1, C.sheet, 0, 0.44, 0);
  g.rbox(2.0, 0.14, 1.95, 0.07, blanket, 0, 0.62, 0.45);
  g.rbox(2.02, 0.1, 0.26, 0.05, C.sheet, 0, 0.64, -0.62);
  g.rbox(0.78, 0.2, 0.5, 0.1, C.pillow, -0.46, 0.64, -1.08);
  g.rbox(0.78, 0.2, 0.5, 0.1, C.pillow, 0.46, 0.64, -1.08);
  g.rbox(2.22, 1.25, 0.2, 0.09, frame, 0, 0.0, -1.55);
  g.rbox(2.22, 0.66, 0.16, 0.07, frame, 0, 0.0, 1.55);
  if (deluxe) {
    g.rbox(2.3, 0.14, 0.26, 0.06, C.deluxeGold, 0, 1.2, -1.55);
    g.sphere(0.12, C.deluxeGold, -1.05, 1.34, -1.55, 8);
    g.sphere(0.12, C.deluxeGold, 1.05, 1.34, -1.55, 8);
    g.rbox(0.5, 0.16, 0.5, 0.08, C.deluxePink, 0, 0.72, -0.72, { ry: 0.6 });
  }
}

export function nightstand(g: GeoBuilder, color: number, lamp = true) {
  g.rbox(0.8, 0.72, 0.7, 0.08, color, 0, 0, 0);
  g.box(0.62, 0.04, 0.02, 0x00000, 0, 0.4, 0.351);
  g.sphere(0.04, C.deskTop, 0, 0.52, 0.36, 6);
  if (lamp) {
    g.cyl(0.07, 0.12, 0.3, C.doorFrame, 0, 0.72, 0, 8);
    g.cyl(0.18, 0.28, 0.3, C.lampShade, 0, 1.0, 0, 10);
  }
}

export function rug(g: GeoBuilder, w: number, d: number, color: number, border?: number) {
  if (border !== undefined) g.rbox(w + 0.24, 0.025, d + 0.24, 0.02, border, 0, 0.005, 0);
  g.rbox(w, 0.035, d, 0.02, color, 0, 0.008, 0);
}

export function roundRug(g: GeoBuilder, r: number, color: number, border: number) {
  g.cyl(r + 0.14, r + 0.14, 0.025, border, 0, 0.005, 0, 24);
  g.cyl(r, r, 0.035, color, 0, 0.008, 0, 24);
}

export function wardrobe(g: GeoBuilder, color: number, h = 1.7) {
  g.rbox(1.7, h, 0.66, 0.08, color, 0, 0, 0);
  g.box(0.03, h - 0.3, 0.02, 0x3b2414, 0, 0.15, 0.335);
  g.sphere(0.05, C.deskTop, -0.12, h * 0.55, 0.35, 6);
  g.sphere(0.05, C.deskTop, 0.12, h * 0.55, 0.35, 6);
}

export function plant(g: GeoBuilder, scale = 1, pot = C.plantPot, leaf = C.plantLeaf) {
  const s = scale;
  g.cyl(0.3 * s, 0.22 * s, 0.5 * s, pot, 0, 0, 0, 10);
  g.cyl(0.33 * s, 0.33 * s, 0.07 * s, pot, 0, 0.47 * s, 0, 10);
  g.sphere(0.36 * s, leaf, 0, 0.92 * s, 0, 8);
  g.sphere(0.26 * s, 0x2a9c3f, 0.2 * s, 0.75 * s, 0.12 * s, 8);
  g.sphere(0.24 * s, 0x49c95a, -0.18 * s, 0.8 * s, -0.1 * s, 8);
  g.sphere(0.2 * s, leaf, 0.02 * s, 1.22 * s, 0.05 * s, 8);
}

export function palm(g: GeoBuilder, scale = 1) {
  const s = scale;
  g.cyl(0.32 * s, 0.26 * s, 0.5 * s, C.plantPot, 0, 0, 0, 10);
  g.cyl(0.08 * s, 0.1 * s, 1.1 * s, C.treeTrunk, 0, 0.5 * s, 0, 6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.rbox(0.18 * s, 0.05 * s, 0.9 * s, 0.03, C.plantLeaf, Math.sin(a) * 0.36 * s, 1.52 * s, Math.cos(a) * 0.36 * s, { ry: a, rx: 0.5 });
  }
}

export function picture(g: GeoBuilder, color: number, w = 1.0, h = 0.75) {
  // Hängt an einer Wand, Vorderseite +z; y = Unterkante
  g.box(w, h, 0.08, C.pictureFrame, 0, 0, 0);
  g.box(w - 0.16, h - 0.16, 0.04, color, 0, 0.08, 0.04);
  g.sphere(0.1, 0xfff3a8, -w * 0.18, h * 0.62, 0.07, 6, { sz: 0.3 });
  g.box(w - 0.24, 0.12, 0.04, 0x3daa56, 0, 0.12, 0.06);
}

export function tv(g: GeoBuilder) {
  g.rbox(1.2, 0.08, 0.3, 0.03, 0x2a2233, 0, 0.0, 0);
  g.box(0.06, 0.2, 0.06, 0x2a2233, 0, 0.05, 0);
  g.rbox(1.3, 0.78, 0.09, 0.03, 0x1d1d28, 0, 0.22, 0);
  g.box(1.18, 0.66, 0.02, 0x2f8ad8, 0, 0.28, 0.05);
}

export function dresser(g: GeoBuilder, color: number) {
  g.rbox(1.6, 0.85, 0.6, 0.07, color, 0, 0, 0);
  for (const y of [0.25, 0.55]) {
    g.box(1.4, 0.03, 0.02, 0x3b2414, 0, y, 0.305);
    g.sphere(0.04, C.deskTop, -0.35, y + 0.13, 0.31, 6);
    g.sphere(0.04, C.deskTop, 0.35, y + 0.13, 0.31, 6);
  }
}

export function armchair(g: GeoBuilder, color: number, cushion: number) {
  g.rbox(1.1, 0.42, 1.0, 0.14, color, 0, 0.05, 0);
  g.rbox(0.8, 0.14, 0.72, 0.07, cushion, 0, 0.45, 0.08);
  g.rbox(1.1, 0.8, 0.26, 0.12, color, 0, 0.3, -0.4);
  g.rbox(0.22, 0.52, 0.9, 0.1, color, -0.46, 0.3, 0.02);
  g.rbox(0.22, 0.52, 0.9, 0.1, color, 0.46, 0.3, 0.02);
}

export function sofa(g: GeoBuilder, color: number, cushion: number, w = 2.6) {
  g.rbox(w, 0.42, 1.05, 0.14, color, 0, 0.06, 0);
  const n = Math.round(w / 1.1);
  const cw = (w - 0.5) / n;
  for (let i = 0; i < n; i++) g.rbox(cw - 0.06, 0.16, 0.76, 0.07, cushion, -w / 2 + 0.25 + cw * (i + 0.5), 0.46, 0.1);
  g.rbox(w, 0.82, 0.28, 0.12, color, 0, 0.3, -0.42);
  g.rbox(0.26, 0.58, 1.0, 0.1, color, -w / 2 + 0.1, 0.3, 0.02);
  g.rbox(0.26, 0.58, 1.0, 0.1, color, w / 2 - 0.1, 0.3, 0.02);
}

export function coffeeTable(g: GeoBuilder, color: number) {
  g.cyl(0.08, 0.1, 0.4, 0x3c4150, 0, 0, 0, 8);
  g.cyl(0.62, 0.62, 0.08, color, 0, 0.4, 0, 18);
  g.cyl(0.12, 0.1, 0.18, 0xffffff, 0.2, 0.48, 0.1, 8);
}

export function lampFloor(g: GeoBuilder) {
  g.cyl(0.22, 0.26, 0.06, 0x3c4150, 0, 0, 0, 10);
  g.cyl(0.035, 0.035, 1.5, 0x3c4150, 0, 0.06, 0, 6);
  g.cyl(0.2, 0.34, 0.42, C.lampShade, 0, 1.45, 0, 12);
}

export function toilet(g: GeoBuilder) {
  g.rbox(0.62, 0.8, 0.26, 0.07, C.wcToilet, 0, 0.35, -0.42);
  g.cyl(0.26, 0.2, 0.38, C.wcToilet, 0, 0, 0.02, 12);
  g.cyl(0.3, 0.3, 0.06, C.wcToiletSeat, 0, 0.38, 0.04, 14);
  g.box(0.14, 0.04, 0.06, 0xd8f2ff, 0, 1.12, -0.42);
}

export function sink(g: GeoBuilder) {
  g.rbox(0.9, 0.9, 0.55, 0.06, C.wcSink, 0, 0, 0);
  g.cyl(0.26, 0.2, 0.12, 0x9fd7f5, 0, 0.84, 0.02, 12);
  g.cyl(0.035, 0.035, 0.3, 0xb8c2d0, 0, 0.9, -0.2, 6);
  g.box(0.9, 0.7, 0.05, 0xbfeaff, 0, 1.2, -0.28);
}

export function paperRoll(g: GeoBuilder, x = 0, y = 0, z = 0, upright = true) {
  if (upright) {
    g.cyl(0.16, 0.16, 0.26, C.paper, x, y, z, 10);
    g.cyl(0.055, 0.055, 0.265, 0xb9a88a, x, y, z, 6);
  } else {
    g.cyl(0.16, 0.16, 0.26, C.paper, x, y + 0.16, z, 10, { rz: Math.PI / 2 });
  }
}

/** Palette mit Klopapier (Lager) */
export function paperPallet(g: GeoBuilder) {
  g.rbox(2.4, 0.18, 1.8, 0.03, 0xc98f4e, 0, 0, 0);
  for (let layer = 0; layer < 4; layer++)
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 4; j++) paperRoll(g, -1.0 + i * 0.4, 0.18 + layer * 0.27, -0.6 + j * 0.4);
  // Folienband
  g.box(2.44, 0.1, 1.84, 0x5fd0ff, 0, 0.62, 0);
}

export function shelfUnit(g: GeoBuilder, w: number, withRolls: boolean, color = C.shelf) {
  const h = 2.0;
  for (const x of [-w / 2 + 0.06, w / 2 - 0.06]) g.box(0.1, h, 0.62, color, x, 0, 0);
  for (const y of [0.1, 0.72, 1.34, 1.9]) g.box(w, 0.07, 0.62, color, 0, y, 0);
  if (withRolls) {
    for (const y of [0.17, 0.79, 1.41]) for (let x = -w / 2 + 0.3; x < w / 2 - 0.2; x += 0.36) paperRoll(g, x, y, 0);
  } else {
    for (const y of [0.17, 0.79, 1.41]) for (let x = -w / 2 + 0.4; x < w / 2 - 0.3; x += 0.7) g.rbox(0.56, 0.42, 0.5, 0.04, C.box, x, y, 0);
  }
}

export function boxStack(g: GeoBuilder) {
  g.rbox(0.8, 0.6, 0.8, 0.04, C.box, 0, 0, 0);
  g.rbox(0.7, 0.5, 0.7, 0.04, 0xe8a85a, 0.05, 0.6, -0.02, { ry: 0.3 });
  g.box(0.82, 0.08, 0.1, 0xc98446, 0, 0.3, 0.36);
}

export function washer(g: GeoBuilder) {
  g.rbox(1.0, 1.1, 0.9, 0.08, C.washer, 0, 0, 0);
  g.cyl(0.32, 0.32, 0.05, 0x8fd3ff, 0, 0.5, 0.45, 16, { rx: Math.PI / 2 });
  g.cyl(0.24, 0.24, 0.06, 0x3a7bf0, 0, 0.5, 0.46, 16, { rx: Math.PI / 2 });
  g.box(0.9, 0.12, 0.05, 0xb8c2d0, 0, 0.95, 0.44);
}

export function cleaningCart(g: GeoBuilder) {
  g.rbox(1.1, 0.12, 0.6, 0.04, 0x3a7bf0, 0, 0.12, 0);
  g.rbox(1.1, 0.12, 0.6, 0.04, 0x3a7bf0, 0, 0.72, 0);
  for (const x of [-0.5, 0.5]) for (const z of [-0.25, 0.25]) g.box(0.05, 0.8, 0.05, 0xb8c2d0, x, 0.1, z);
  for (const x of [-0.45, 0.45]) for (const z of [-0.22, 0.22]) g.sphere(0.07, 0x2a2233, x, 0.07, z, 6);
  g.cyl(0.2, 0.17, 0.35, 0xffd23a, -0.25, 0.84, 0, 10);
  g.cyl(0.03, 0.03, 1.2, 0xb98a55, 0.28, 0.84, 0.05, 6, { rz: -0.15 });
  g.rbox(0.3, 0.2, 0.3, 0.05, 0xf2f6ff, 0.2, 0.24, 0);
  g.cyl(0.08, 0.08, 0.22, 0xff5fa8, -0.3, 0.24, 0.08, 8);
}

export function vendingMachine(g: GeoBuilder, color: number) {
  g.rbox(1.3, 2.2, 0.9, 0.08, color, 0, 0, 0);
  g.box(0.8, 1.4, 0.05, 0x8fe3ff, -0.14, 0.62, 0.45);
  const cans = [0xe84a5f, 0xf9c846, 0x46c97a, 0x3fa7f5, 0xff8a3d];
  for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) g.cyl(0.07, 0.07, 0.2, cans[(r + i) % cans.length], -0.44 + i * 0.2, 0.7 + r * 0.32, 0.36, 6);
  g.box(0.24, 0.9, 0.06, 0x1d1d28, 0.42, 0.9, 0.45);
  g.box(0.8, 0.2, 0.06, 0x1d1d28, -0.14, 0.25, 0.45);
}

export function waterCooler(g: GeoBuilder) {
  g.rbox(0.55, 1.05, 0.5, 0.06, 0xe8eef8, 0, 0, 0);
  g.cyl(0.24, 0.24, 0.5, 0x7fd0ff, 0, 1.05, 0, 12);
  g.sphere(0.24, 0x7fd0ff, 0, 1.55, 0, 12, { sy: 0.4 });
}

export function tree(g: GeoBuilder, s = 1, leaf = C.treeLeaf) {
  g.cyl(0.22 * s, 0.3 * s, 1.6 * s, C.treeTrunk, 0, 0, 0, 7);
  g.sphere(1.25 * s, leaf, 0, 2.4 * s, 0, 9);
  g.sphere(0.9 * s, C.treeLeaf2, 0.55 * s, 2.0 * s, 0.35 * s, 8);
  g.sphere(0.8 * s, 0x28994a, -0.6 * s, 2.15 * s, -0.2 * s, 8);
  g.sphere(0.72 * s, C.treeLeaf2, 0.1 * s, 3.25 * s, 0.05 * s, 8);
}

export function bush(g: GeoBuilder, s = 1) {
  g.sphere(0.55 * s, C.bush, 0, 0.4 * s, 0, 8);
  g.sphere(0.42 * s, C.treeLeaf2, 0.45 * s, 0.32 * s, 0.1 * s, 8);
  g.sphere(0.4 * s, 0x2e9e46, -0.4 * s, 0.3 * s, 0.05 * s, 8);
  g.sphere(0.12 * s, 0xff5fa8, 0.2 * s, 0.82 * s, 0.25 * s, 5);
  g.sphere(0.1 * s, 0xffd23a, -0.25 * s, 0.7 * s, 0.3 * s, 5);
}

export function lampPost(g: GeoBuilder) {
  g.cyl(0.2, 0.26, 0.2, C.lampPost, 0, 0, 0, 8);
  g.cyl(0.07, 0.08, 3.6, C.lampPost, 0, 0.2, 0, 6);
  g.rbox(0.5, 0.35, 0.5, 0.08, C.lampPost, 0, 3.75, 0);
  g.rbox(0.4, 0.28, 0.4, 0.06, C.lampLight, 0, 3.52, 0);
}

export function bench(g: GeoBuilder, color = 0xc98f4e) {
  for (const x of [-0.8, 0.8]) g.box(0.12, 0.45, 0.5, C.lampPost, x, 0, 0);
  g.rbox(2.0, 0.1, 0.6, 0.03, color, 0, 0.45, 0);
  g.rbox(2.0, 0.45, 0.1, 0.03, color, 0, 0.6, -0.28);
}

export function trafficCone(g: GeoBuilder) {
  g.box(0.5, 0.06, 0.5, 0xff7a1a, 0, 0, 0);
  g.cone(0.2, 0.62, 0xff7a1a, 0, 0.06, 0, 10);
  g.cyl(0.12, 0.155, 0.12, 0xffffff, 0, 0.3, 0, 10);
}

/** Absperrung für gesperrte Bereiche (Länge entlang x) */
export function fence(g: GeoBuilder, len: number) {
  const n = Math.max(1, Math.round(len / 2.4));
  const seg = len / n;
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + i * seg;
    g.cyl(0.07, 0.07, 1.05, 0xe8eef8, x, 0, 0, 6);
    g.box(0.36, 0.08, 0.36, 0x3c4150, x, 0, 0);
  }
  for (let i = 0; i < n; i++) {
    const x0 = -len / 2 + i * seg;
    const stripes = 6;
    for (let k = 0; k < stripes; k++) {
      const col = k % 2 === 0 ? 0xff4a3a : 0xfff2e0;
      g.box(seg / stripes, 0.2, 0.06, col, x0 + (k + 0.5) * (seg / stripes), 0.72, 0);
      g.box(seg / stripes, 0.14, 0.06, k % 2 === 0 ? 0xfff2e0 : 0xff4a3a, x0 + (k + 0.5) * (seg / stripes), 0.36, 0);
    }
  }
}

export function scaffold(g: GeoBuilder, w: number, h: number) {
  for (const x of [-w / 2, w / 2]) for (const z of [-0.4, 0.4]) g.cyl(0.05, 0.05, h, 0xb8c2d0, x, 0, z, 6);
  for (let y = 0.9; y < h; y += 0.9) {
    g.box(w, 0.08, 0.9, 0xc98f4e, 0, y, 0);
  }
}

export function car(g: GeoBuilder, color: number) {
  // Längsachse z, Front bei +z
  g.rbox(1.9, 0.62, 4.0, 0.25, color, 0, 0.32, 0);
  g.rbox(1.64, 0.62, 2.1, 0.22, color, 0, 0.86, -0.25);
  g.rbox(1.68, 0.44, 2.0, 0.18, 0x8fe3ff, 0, 0.96, -0.25);
  g.rbox(1.72, 0.18, 1.1, 0.06, color, 0, 1.36, -0.25);
  for (const x of [-0.92, 0.92])
    for (const z of [-1.3, 1.3]) {
      g.cyl(0.36, 0.36, 0.28, 0x1d1d28, x, 0.36, z, 12, { rz: Math.PI / 2 });
      g.cyl(0.17, 0.17, 0.3, 0xc9d1dc, x, 0.36, z, 8, { rz: Math.PI / 2 });
    }
  g.box(0.38, 0.14, 0.05, 0xfff3a8, -0.6, 0.62, 2.0);
  g.box(0.38, 0.14, 0.05, 0xfff3a8, 0.6, 0.62, 2.0);
  g.box(0.38, 0.12, 0.05, 0xff3a3a, -0.6, 0.62, -2.0);
  g.box(0.38, 0.12, 0.05, 0xff3a3a, 0.6, 0.62, -2.0);
}

export function flowerBed(g: GeoBuilder, w: number, d: number) {
  g.rbox(w, 0.3, d, 0.08, 0xa8653a, 0, 0, 0);
  g.box(w - 0.2, 0.05, d - 0.2, 0x6b3f22, 0, 0.28, 0);
  const cols = [0xff5fa8, 0xffd23a, 0xff7a3d, 0xb57bff, 0xffffff];
  let k = 0;
  for (let x = -w / 2 + 0.35; x < w / 2 - 0.2; x += 0.45)
    for (let z = -d / 2 + 0.35; z < d / 2 - 0.2; z += 0.45) {
      g.sphere(0.16, C.treeLeaf2, x, 0.42, z, 6);
      g.sphere(0.09, cols[k++ % cols.length], x + 0.05, 0.58, z + 0.02, 5);
    }
}

export function barrierGate(g: GeoBuilder) {
  g.rbox(0.5, 1.05, 0.5, 0.08, 0xffd23a, 0, 0, 0);
  g.box(0.3, 0.2, 0.3, 0x1d1d28, 0, 1.05, 0);
}

/** Schlagbaum (dynamisch, drehbar) – Länge entlang +x */
export function barrierArm(g: GeoBuilder, len: number) {
  const n = 6;
  for (let i = 0; i < n; i++) g.box(len / n, 0.14, 0.12, i % 2 === 0 ? C.barrierRed : C.barrierPole, (i + 0.5) * (len / n), -0.07, 0);
}

export function suitcase(g: GeoBuilder, color = 0x9b4dff) {
  g.rbox(0.62, 0.72, 0.3, 0.08, color, 0, 0, 0);
  g.box(0.08, 0.72, 0.31, 0xffc42e, -0.16, 0, 0);
  g.box(0.08, 0.72, 0.31, 0xffc42e, 0.16, 0, 0);
  g.torus(0.1, 0.025, 0x2a2233, 0, 0.78, 0);
}

export function reception(g: GeoBuilder) {
  // Tresen 8 breit, Vorderseite +z
  g.rbox(8.2, 1.05, 1.2, 0.12, C.deskWood, 0, 0, 0);
  g.rbox(8.0, 0.8, 0.08, 0.04, C.deskFront, 0, 0.12, 0.6);
  for (let i = -3; i <= 3; i++) g.box(0.12, 0.8, 0.1, C.lobbyBorder, i * 1.12, 0.12, 0.62);
  g.rbox(8.6, 0.12, 1.45, 0.06, C.deskTop, 0, 1.05, 0.05);
  // Monitore und Klingel
  for (const x of [-1.6, 1.6]) {
    g.box(0.1, 0.25, 0.1, 0x2a2233, x, 1.17, -0.2);
    g.rbox(0.9, 0.6, 0.08, 0.03, 0x2a2233, x, 1.35, -0.2, { rx: -0.1 });
    g.box(0.8, 0.5, 0.02, 0x39a9ff, x, 1.4, -0.15, { rx: -0.1 });
  }
  g.dome(0.16, 0xffc42e, 0, 1.17, 0.25, 10);
  g.sphere(0.04, 0xffc42e, 0, 1.35, 0.25, 6);
  g.group((p) => plant(p, 0.55), -3.6, 1.17, 0.1);
  g.rbox(0.5, 0.08, 0.36, 0.03, 0xffffff, 3.3, 1.17, 0.2, { ry: 0.3 });
}

export function elevatorDoorFrame(g: GeoBuilder) {
  g.rbox(3.6, 2.9, 0.6, 0.1, 0xb8c2d0, 0, 0, 0);
  g.box(2.7, 2.4, 0.1, 0x3c4150, 0, 0.05, 0.28);
  g.rbox(1.2, 0.34, 0.1, 0.05, 0x1d1d28, 0, 2.5, 0.31);
  g.sphere(0.07, 0xff5a3a, -0.25, 2.67, 0.36, 6);
  g.sphere(0.07, 0x3bd65a, 0.25, 2.67, 0.36, 6);
  g.box(0.16, 0.3, 0.06, 0xffc42e, 1.55, 1.1, 0.32);
}

export function fountain(g: GeoBuilder) {
  g.cyl(1.5, 1.6, 0.5, 0xd1d7df, 0, 0, 0, 18);
  g.cyl(1.3, 1.3, 0.05, 0x5fd0ff, 0, 0.44, 0, 18);
  g.cyl(0.25, 0.3, 1.0, 0xd1d7df, 0, 0.45, 0, 10);
  g.cyl(0.7, 0.4, 0.2, 0xd1d7df, 0, 1.4, 0, 14);
  g.sphere(0.25, 0x8fe3ff, 0, 1.75, 0, 8);
}

export function piano(g: GeoBuilder) {
  g.rbox(1.8, 1.0, 1.4, 0.1, 0x1d1d28, 0, 0.1, 0);
  g.box(1.6, 0.06, 0.4, 0xffffff, 0, 0.9, 0.62);
  for (let i = 0; i < 8; i++) g.box(0.08, 0.05, 0.22, 0x1d1d28, -0.7 + i * 0.2, 0.95, 0.54);
  for (const x of [-0.7, 0.7]) g.cyl(0.05, 0.05, 0.1, 0xffc42e, x, 0, 0.5, 6);
}
