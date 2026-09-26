import * as THREE from 'three';

/**
 * Prozedurale Canvas-Texturen – keine fremden Bilddateien.
 *
 * Stilhandbuch §5: gezeichnete Flächen, 256 × 256 (Bänder 256 × 128), wenige
 * Farben, harte Kanten, kein Rauschen, keine Verläufe. Muster sind geometrisch:
 * Streifen, Karos, Rauten, konzentrische Rahmen. Alle Motive sind eigene Entwürfe.
 */

let maxAniso = 4;
export function setMaxAnisotropy(a: number) {
  maxAniso = Math.min(4, a);
}

function mk(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  return [c, g];
}

function tex(c: HTMLCanvasElement, repeat = true, mip = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = mip ? maxAniso : 1;
  t.generateMipmaps = mip;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  return t;
}

const cache = new Map<string, THREE.CanvasTexture>();
function cached(key: string, make: () => THREE.CanvasTexture) {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
}

export const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

/** Farbe aufhellen/abdunkeln (f > 1 heller) – bleibt gesättigt, nie Schwarz */
export function shade(color: number, f: number): string {
  const r = Math.min(255, Math.max(0, Math.round(((color >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((color >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((color & 255) * f)));
  return `rgb(${r},${g},${b})`;
}
/** Mischung zweier Farben */
export function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

function poly(g: CanvasRenderingContext2D, pts: number[][], fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fill();
}

function diamond(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, fill: string) {
  poly(g, [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]], fill);
}

/** Eigenes Blütenmotiv (vierblättrig mit Mittelstern) – Ersatz für ein Lilienmuster */
function blossom(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, fill: string, center?: string) {
  g.fillStyle = fill;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    g.beginPath();
    g.ellipse(cx + Math.sin(a) * s * 0.42, cy - Math.cos(a) * s * 0.42, s * 0.2, s * 0.36, a, 0, Math.PI * 2);
    g.fill();
  }
  diamond(g, cx, cy, s * 0.22, s * 0.22, center ?? fill);
  // kleine Eckspitzen
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    diamond(g, cx + Math.sin(a) * s * 0.5, cy - Math.cos(a) * s * 0.5, s * 0.08, s * 0.08, fill);
  }
}

// ================================================================== Böden

/** Fischgrät-Parkett (Zimmer Stufe 1): Chevron-Spalten, drei Holztöne, harte Fugen */
export function parquet(base: number, dark: number) {
  return cached(`parquet${base}${dark}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(dark);
    g.fillRect(0, 0, 256, 256);
    const tones = [shade(base, 1.0), shade(base, 1.09), shade(base, 0.92)];
    const col = 32;
    const band = 32;
    for (let i = 0; i < 256 / col; i++) {
      const x0 = i * col;
      const s = i % 2 === 0 ? 1 : -1;
      for (let n = -2; n < 256 / band + 3; n++) {
        const yA = (x: number) => (s > 0 ? x - x0 : col - (x - x0)) + n * band;
        poly(
          g,
          [
            [x0 + 1, yA(x0) + 1.5],
            [x0 + col - 1, yA(x0 + col) + 1.5],
            [x0 + col - 1, yA(x0 + col) + band - 1.5],
            [x0 + 1, yA(x0) + band - 1.5],
          ],
          tones[(((n * 7 + i * 3) % 3) + 3) % 3],
        );
      }
    }
    return tex(c);
  });
}

/** Fliesen mit Rautenmuster (Zimmer Stufe 2) */
export function diamondTiles(base: number, dark: number) {
  return cached(`dtiles${base}${dark}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i <= 2; i++)
      for (let j = 0; j <= 2; j++) {
        diamond(g, i * 128, j * 128, 64, 64, hex(dark));
        diamond(g, i * 128, j * 128, 40, 40, hex(base));
        diamond(g, i * 128, j * 128, 22, 22, shade(dark, 0.95));
      }
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) diamond(g, 64 + i * 128, 64 + j * 128, 10, 10, shade(dark, 1.05));
    return tex(c);
  });
}

/** Helles Gitter mit Kreuzblumen (Zimmer Stufe 3) */
export function latticeFloor(base: number, dark: number) {
  return cached(`lattice${base}${dark}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = hex(dark);
    for (let i = 0; i < 4; i++) {
      g.fillRect(i * 64 - 5, 0, 10, 256);
      g.fillRect(0, i * 64 - 5, 256, 10);
    }
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const cx = i * 64;
        const cy = j * 64;
        g.beginPath();
        g.arc(cx, cy, 15, 0, Math.PI * 2);
        g.fill();
        diamond(g, cx + 32, cy + 32, 9, 9, hex(dark));
      }
    return tex(c);
  });
}

/** Schachbrett (WC-Boden, Lagerboden) */
export function checker(a: number, b: number, n = 4, joint?: number) {
  return cached(`checker${a}${b}${n}${joint}`, () => {
    const [c, g] = mk(256, 256);
    const s = 256 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        g.fillStyle = hex((i + j) % 2 === 0 ? a : b);
        g.fillRect(i * s, j * s, s, s);
      }
    if (joint !== undefined) {
      g.fillStyle = hex(joint);
      for (let i = 0; i <= n; i++) {
        g.fillRect(i * s - 2, 0, 4, 256);
        g.fillRect(0, i * s - 2, 256, 4);
      }
    }
    return tex(c);
  });
}

/** Flurboden: Rosa mit Rahmenfliesen */
export function hallFloor(a: number, b: number) {
  return cached(`hall${a}${b}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(a);
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const x = i * 128;
        const y = j * 128;
        g.fillStyle = hex(b);
        g.fillRect(x + 10, y + 10, 108, 108);
        g.fillStyle = hex(a);
        g.fillRect(x + 20, y + 20, 88, 88);
        diamond(g, x + 64, y + 64, 26, 26, hex(b));
        diamond(g, x + 64, y + 64, 12, 12, hex(a));
      }
    return tex(c);
  });
}

/** Lobbyboden: Sandfliesen mit Ornament */
export function lobbyFloor(a: number, b: number, accent: number) {
  return cached(`lobby${a}${b}${accent}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(a);
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = hex(b);
    g.fillRect(0, 0, 256, 6);
    g.fillRect(0, 0, 6, 256);
    g.fillRect(0, 125, 256, 6);
    g.fillRect(125, 0, 6, 256);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const x = i * 128 + 66;
        const y = j * 128 + 66;
        diamond(g, x, y, 34, 34, hex(b));
        diamond(g, x, y, 20, 20, hex(accent));
        diamond(g, x, y, 8, 8, hex(a));
      }
    return tex(c);
  });
}

/** Fundament / Baufläche: helle Betonplatten mit Fugen */
export function foundation(base: number, line: number) {
  return cached(`found${base}${line}`, () => {
    const [c, g] = mk(128, 128);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = hex(line);
    g.fillRect(0, 0, 128, 3);
    g.fillRect(0, 0, 3, 128);
    g.fillRect(0, 63, 128, 2);
    g.fillRect(63, 0, 2, 128);
    return tex(c);
  });
}

/** Steinplatten des Vorplatzes (StoneRoad-Kachel 5 × 5 m) */
export function stoneTiles(base: number, joint: number) {
  return cached(`stone${base}${joint}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(joint);
    g.fillRect(0, 0, 256, 256);
    const tones = [hex(base), shade(base, 1.05), shade(base, 0.96)];
    // unregelmäßige, aber geometrische Platten (feste Aufteilung, nahtlos)
    const rows = [
      [0, 96, 176, 256],
      [0, 64, 160, 256],
      [0, 112, 200, 256],
      [0, 80, 144, 256],
    ];
    let k = 0;
    for (let r = 0; r < 4; r++) {
      const xs = rows[r];
      for (let i = 0; i < xs.length - 1; i++) {
        g.fillStyle = tones[k++ % 3];
        g.fillRect(xs[i] + 3, r * 64 + 3, xs[i + 1] - xs[i] - 6, 58);
      }
    }
    return tex(c);
  });
}

/** Fahrbahn: flache Fläche (Markierungen sind Geometrie) */
export function road(base: number) {
  return cached(`road${base}`, () => {
    const [c, g] = mk(64, 64);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = shade(base, 0.97);
    g.fillRect(0, 0, 32, 32);
    g.fillRect(32, 32, 32, 32);
    return tex(c);
  });
}

/** Rasen: Flächengrün mit geometrischen Grasbüscheln */
export function grass(base: number, dark: number, light: number) {
  return cached(`grass${base}${dark}${light}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, 256, 256);
    const tufts = [
      [30, 40, 0], [120, 22, 1], [200, 70, 0], [70, 120, 1], [170, 150, 0], [230, 210, 1], [40, 200, 0], [120, 230, 1], [100, 70, 0], [215, 20, 1],
    ];
    for (const [x, y, t] of tufts) {
      const col = t ? hex(light) : hex(dark);
      poly(g, [[x - 9, y + 6], [x - 5, y - 8], [x - 2, y + 6]], col);
      poly(g, [[x - 3, y + 6], [x + 1, y - 12], [x + 4, y + 6]], col);
      poly(g, [[x + 3, y + 6], [x + 8, y - 6], [x + 10, y + 6]], col);
    }
    return tex(c);
  });
}

// ================================================================== Wände
// Wandtexturen: u entlang der Wand (1 Kachel = 1,5 m Raster), v = Höhe (unten 0).
// Oben liegt die Canvas-Zeile 0 → Wandoberkante.

function baseboard(g: CanvasRenderingContext2D, h: number, color: string, rail?: string) {
  g.fillStyle = color;
  g.fillRect(0, h - 22, 256, 22);
  if (rail) {
    g.fillStyle = rail;
    g.fillRect(0, h - 26, 256, 4);
  }
}

/** Zimmer Stufe 1: Längsstreifen hell/dunkel, dunkler Sockel */
export function wallStripes(light: number, dark: number) {
  return cached(`wstripe${light}${dark}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(light);
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = hex(dark);
    g.fillRect(0, 0, 64, 256);
    g.fillRect(128, 0, 64, 256);
    g.fillStyle = shade(light, 1.08);
    g.fillRect(84, 0, 8, 256);
    g.fillRect(212, 0, 8, 256);
    g.fillStyle = shade(dark, 0.9);
    g.fillRect(0, 0, 256, 10);
    baseboard(g, 256, shade(dark, 0.82), shade(light, 1.12));
    return tex(c);
  });
}

/** Zimmer Stufe 2: Rautengitter */
export function wallDiamonds(light: number, dark: number) {
  return cached(`wdia${light}${dark}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(light);
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i <= 4; i++)
      for (let j = 0; j <= 5; j++) {
        diamond(g, i * 64, j * 48, 30, 22, hex(dark));
        diamond(g, i * 64, j * 48, 22, 15, hex(light));
        diamond(g, i * 64 + 32, j * 48 + 24, 5, 5, hex(dark));
      }
    baseboard(g, 256, shade(dark, 0.8), '#f9faf7');
    return tex(c);
  });
}

/** Zimmer Stufe 3: Tapete mit Blütenmotiv */
export function wallBlossom(base: number, motif: number) {
  return cached(`wblos${base}${motif}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const x = i * 64 + (j % 2 ? 32 : 0) + 16;
        const y = j * 58 + 22;
        blossom(g, x, y, 26, hex(motif));
      }
    baseboard(g, 256, hex(motif), hex(mix(base, 0xffffff, 0.5)));
    return tex(c);
  });
}

/** Flurwand: Magenta-Streifen, violette Vertäfelung mit Goldleiste */
export function wallHall(base: number, panel: number, rail: number) {
  return cached(`whall${base}${panel}${rail}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = shade(base, 0.9);
    for (let i = 0; i < 4; i++) g.fillRect(i * 64 + 40, 0, 16, 150);
    g.fillStyle = hex(panel);
    g.fillRect(0, 150, 256, 106);
    g.fillStyle = shade(panel, 1.12);
    for (let i = 0; i < 2; i++) g.fillRect(i * 128 + 14, 168, 100, 60);
    g.fillStyle = hex(panel);
    for (let i = 0; i < 2; i++) g.fillRect(i * 128 + 22, 176, 84, 44);
    g.fillStyle = hex(rail);
    g.fillRect(0, 144, 256, 10);
    g.fillStyle = shade(panel, 0.8);
    g.fillRect(0, 240, 256, 16);
    return tex(c);
  });
}

/** WC-Wand: Rotbraun, unten Fliesen */
export function wallWC(base: number, tile: number, tileB: number) {
  return cached(`wwc${base}${tile}${tileB}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = shade(base, 1.1);
    for (let i = 0; i < 4; i++) g.fillRect(i * 64 + 6, 8, 52, 100);
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 4; j++) {
        g.fillStyle = hex((i + j) % 2 ? tile : tileB);
        g.fillRect(i * 32, 128 + j * 32, 32, 32);
      }
    g.fillStyle = hex(tileB);
    g.fillRect(0, 122, 256, 6);
    return tex(c);
  });
}

/** Neutrale Wand (Lobby, Fassade, Lager): helle Fläche, farbiger Sockel, Zierleiste */
export function wallPlain(base: number, lower: number, rail: number, siding = false) {
  return cached(`wplain${base}${lower}${rail}${siding}`, () => {
    const [c, g] = mk(256, 256);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, 256, 256);
    if (siding) {
      g.fillStyle = shade(base, 0.92);
      for (let j = 0; j < 8; j++) g.fillRect(0, j * 22 + 14, 256, 5);
    } else {
      g.fillStyle = shade(base, 1.06);
      for (let i = 0; i < 2; i++) g.fillRect(i * 128 + 16, 18, 96, 140);
    }
    g.fillStyle = hex(lower);
    g.fillRect(0, 180, 256, 76);
    g.fillStyle = hex(rail);
    g.fillRect(0, 174, 256, 8);
    return tex(c);
  });
}

// ================================================================== Textilien

/** Längsstreifen (Bettdecke Stufe 1, Vorhänge) */
export function stripes(a: number, b: number, n = 4) {
  return cached(`stripes${a}${b}${n}`, () => {
    const [c, g] = mk(128, 128);
    const w = 128 / (n * 2);
    g.fillStyle = hex(a);
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = hex(b);
    for (let i = 0; i < n; i++) g.fillRect(i * w * 2 + w, 0, w, 128);
    return tex(c);
  });
}

/** Rautenmuster (Bettdecke Stufe 2) */
export function diamonds(a: number, b: number) {
  return cached(`diamonds${a}${b}`, () => {
    const [c, g] = mk(128, 128);
    g.fillStyle = hex(a);
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i <= 4; i++)
      for (let j = 0; j <= 4; j++) if ((i + j) % 2 === 0) diamond(g, i * 32, j * 32, 16, 16, hex(b));
    g.strokeStyle = shade(b, 1.15);
    g.lineWidth = 2;
    for (let i = -4; i < 8; i++) {
      g.beginPath();
      g.moveTo(i * 32, 0);
      g.lineTo(i * 32 + 128, 128);
      g.stroke();
    }
    return tex(c);
  });
}

/** Blütenmuster auf Grund (Bettdecke/Vorhang Stufe 3, Flurvorhänge) */
export function blossomFabric(bg: number, fg: number) {
  return cached(`bfab${bg}${fg}`, () => {
    const [c, g] = mk(128, 128);
    g.fillStyle = hex(bg);
    g.fillRect(0, 0, 128, 128);
    blossom(g, 32, 32, 28, hex(fg));
    blossom(g, 96, 96, 28, hex(fg));
    diamond(g, 96, 32, 5, 5, hex(fg));
    diamond(g, 32, 96, 5, 5, hex(fg));
    return tex(c);
  });
}

/** Teppich-Band 256 × 128 mit Rahmen und Mittelmedaillon */
export function rugBanner(bg: number, border: number, motif: number) {
  return cached(`rug${bg}${border}${motif}`, () => {
    const [c, g] = mk(256, 128);
    g.fillStyle = hex(border);
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = hex(bg);
    g.fillRect(10, 10, 236, 108);
    g.fillStyle = hex(border);
    g.fillRect(18, 18, 220, 4);
    g.fillRect(18, 106, 220, 4);
    g.fillRect(18, 18, 4, 92);
    g.fillRect(234, 18, 4, 92);
    diamond(g, 128, 64, 62, 38, hex(motif));
    diamond(g, 128, 64, 44, 26, hex(bg));
    diamond(g, 128, 64, 26, 15, hex(border));
    for (const x of [48, 208]) diamond(g, x, 64, 12, 12, hex(motif));
    return tex(c, false);
  });
}

/** Flurläufer: Violett mit dunklen Rauten und Goldkante (u = Länge) */
export function runner(base: number, dark: number, edge: number) {
  return cached(`runner${base}${dark}${edge}`, () => {
    const [c, g] = mk(256, 128);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = hex(edge);
    g.fillRect(0, 6, 256, 8);
    g.fillRect(0, 114, 256, 8);
    g.fillStyle = hex(dark);
    g.fillRect(0, 0, 256, 6);
    g.fillRect(0, 122, 256, 6);
    for (let i = 0; i < 4; i++) {
      diamond(g, i * 64 + 32, 64, 26, 34, hex(dark));
      diamond(g, i * 64 + 32, 64, 12, 16, hex(edge));
    }
    return tex(c);
  });
}

/** Gemälde (eigene Motive): 0 Sonne über Hügeln, 1 Kreise, 2 Welle */
export function painting(kind: number) {
  return cached(`paint${kind}`, () => {
    const [c, g] = mk(128, 128);
    if (kind === 0) {
      g.fillStyle = '#f6b91c';
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#f38b1f';
      g.beginPath();
      g.arc(84, 44, 22, 0, Math.PI * 2);
      g.fill();
      poly(g, [[0, 128], [0, 84], [40, 62], [80, 90], [128, 70], [128, 128]], '#10af78');
      poly(g, [[0, 128], [0, 104], [56, 88], [128, 110], [128, 128]], '#207c6b');
    } else if (kind === 1) {
      g.fillStyle = '#8b48e2';
      g.fillRect(0, 0, 128, 128);
      for (const [x, y, r, col] of [
        [40, 44, 26, '#df1775'],
        [88, 80, 30, '#06c2cd'],
        [44, 96, 12, '#f6b91c'],
      ] as [number, number, number, string][]) {
        g.fillStyle = col;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      g.fillStyle = '#a9d200';
      g.fillRect(0, 0, 128, 128);
      for (let k = 0; k < 3; k++) {
        g.fillStyle = ['#10af78', '#06c2cd', '#f9faf7'][k];
        g.beginPath();
        g.moveTo(0, 60 + k * 22);
        for (let x = 0; x <= 128; x += 16) g.lineTo(x, 60 + k * 22 + (x / 16) % 2 * 12);
        g.lineTo(128, 128);
        g.lineTo(0, 128);
        g.closePath();
        g.fill();
      }
    }
    return tex(c, false, false);
  });
}

// ================================================================== Effekte

/** Weicher Schatten für Figuren (einzige Ausnahme vom Verlaufsverbot: FX) */
export function blobShadow(): THREE.CanvasTexture {
  const [c, g] = mk(64, 64);
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 31);
  grd.addColorStop(0, 'rgba(40,20,90,0.30)');
  grd.addColorStop(0.65, 'rgba(40,20,90,0.2)');
  grd.addColorStop(1, 'rgba(40,20,90,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return tex(c, false);
}

/** Leuchtender Ring für Trigger-Zonen */
export function ringTexture(): THREE.CanvasTexture {
  const [c, g] = mk(128, 128);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 10;
  g.beginPath();
  g.arc(64, 64, 54, 0, Math.PI * 2);
  g.stroke();
  return tex(c, false);
}

export function chevronTexture(): THREE.CanvasTexture {
  const [c, g] = mk(64, 64);
  g.fillStyle = '#fecc06';
  g.strokeStyle = '#f9faf7';
  g.lineWidth = 3;
  for (const y of [6, 30]) {
    g.beginPath();
    g.moveTo(32, y);
    g.lineTo(58, y + 28);
    g.lineTo(46, y + 28);
    g.lineTo(32, y + 14);
    g.lineTo(18, y + 28);
    g.lineTo(6, y + 28);
    g.closePath();
    g.fill();
    g.stroke();
  }
  return tex(c, false);
}

/** Text-/Schild-Textur (Hotelschild, Parken-Schild) */
export function signTexture(text: string, bg: string, fg: string, w = 512, h = 128, font = 'Lilita One'): THREE.CanvasTexture {
  const [c, g] = mk(w, h);
  g.imageSmoothingEnabled = true;
  g.fillStyle = bg;
  const r = h * 0.3;
  g.beginPath();
  g.roundRect(4, 4, w - 8, h - 8, r);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(249,250,247,0.95)';
  g.stroke();
  g.fillStyle = fg;
  let size = Math.floor(h * 0.6);
  g.font = `${size}px "${font}", "Arial Black", sans-serif`;
  while (g.measureText(text).width > w * 0.86 && size > 8) {
    size -= 2;
    g.font = `${size}px "${font}", "Arial Black", sans-serif`;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = Math.max(3, size * 0.12);
  g.strokeStyle = 'rgba(92,53,147,0.95)';
  g.strokeText(text, w / 2, h / 2 + h * 0.04);
  g.fillText(text, w / 2, h / 2 + h * 0.04);
  return tex(c, false);
}
