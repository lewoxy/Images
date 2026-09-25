import * as THREE from 'three';

/** Prozedurale Canvas-Texturen – keine fremden Bilddateien. */

let maxAniso = 4;
export function setMaxAnisotropy(a: number) {
  maxAniso = Math.min(8, a);
}

function mk(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function tex(c: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = maxAniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

function shade(color: number, f: number): string {
  const r = Math.min(255, Math.max(0, Math.round(((color >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((color >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((color & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

/** Deterministischer Zufall für reproduzierbare Texturen */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Fischgrät-/Chevron-Parkett (Zimmer Stufe 1) */
export function chevronParquet(base: number, dark: number): THREE.CanvasTexture {
  const [c, g] = mk(256, 256);
  const r = rng(7);
  const col = 32;
  const band = 32;
  g.fillStyle = hex(dark);
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256 / col; i++) {
    const x0 = i * col;
    const s = i % 2 === 0 ? 1 : -1;
    for (let n = -2; n < 256 / band + 3; n++) {
      const f = 0.92 + r() * 0.16;
      g.fillStyle = shade(base, f * (n % 2 === 0 ? 1 : 0.95));
      const yA = (x: number) => (s > 0 ? x - x0 : col - (x - x0)) + n * band;
      g.beginPath();
      g.moveTo(x0 + 0.8, yA(x0) + 1.2);
      g.lineTo(x0 + col - 0.8, yA(x0 + col) + 1.2);
      g.lineTo(x0 + col - 0.8, yA(x0 + col) + band - 1.2);
      g.lineTo(x0 + 0.8, yA(x0) + band - 1.2);
      g.closePath();
      g.fill();
    }
  }
  return tex(c);
}

/** Dielen (Zimmer Stufe 2) */
export function planks(base: number, dark: number): THREE.CanvasTexture {
  const [c, g] = mk(256, 256);
  const r = rng(11);
  g.fillStyle = hex(dark);
  g.fillRect(0, 0, 256, 256);
  const h = 32;
  for (let row = 0; row < 8; row++) {
    let x = row % 2 === 0 ? 0 : -64;
    while (x < 256) {
      const w = 96 + Math.floor(r() * 3) * 32;
      g.fillStyle = shade(base, 0.93 + r() * 0.14);
      g.fillRect(x + 1, row * h + 1.2, w - 2, h - 2.4);
      if (x + w > 256) {
        g.fillRect(x + 1 - 256, row * h + 1.2, w - 2, h - 2.4);
      }
      // Maserung
      g.strokeStyle = shade(base, 0.86);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x + 10, row * h + 10 + r() * 10);
      g.lineTo(x + w - 20, row * h + 12 + r() * 10);
      g.stroke();
      x += w;
    }
  }
  return tex(c);
}

/** Schachbrett-Fliesen (Lobby) */
export function checker(a: number, b: number, n = 4): THREE.CanvasTexture {
  const [c, g] = mk(256, 256);
  const s = 256 / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      g.fillStyle = hex((i + j) % 2 === 0 ? a : b);
      g.fillRect(i * s, j * s, s, s);
    }
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i <= n; i++) {
    g.beginPath();
    g.moveTo(i * s, 0);
    g.lineTo(i * s, 256);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i * s);
    g.lineTo(256, i * s);
    g.stroke();
  }
  return tex(c);
}

/** Kleine Fliesen (WC, Stufe 3) */
export function tiles(a: number, b: number, n = 8): THREE.CanvasTexture {
  const [c, g] = mk(256, 256);
  const s = 256 / n;
  g.fillStyle = shade(b, 0.9);
  g.fillRect(0, 0, 256, 256);
  const r = rng(3);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      g.fillStyle = hex((i + j) % 2 === 0 ? a : b);
      g.globalAlpha = 0.9 + r() * 0.1;
      g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    }
  g.globalAlpha = 1;
  return tex(c);
}

/** Teppich mit Rautenmuster und Rand (Flure) */
export function carpet(base: number, dark: number): THREE.CanvasTexture {
  const [c, g] = mk(256, 256);
  g.fillStyle = hex(base);
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = hex(dark);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const cx = i * 64 + 32;
      const cy = j * 64 + 32;
      g.beginPath();
      g.moveTo(cx, cy - 14);
      g.lineTo(cx + 14, cy);
      g.lineTo(cx, cy + 14);
      g.lineTo(cx - 14, cy);
      g.closePath();
      g.fill();
    }
  g.fillStyle = shade(base, 1.12);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      g.beginPath();
      g.arc(i * 64, j * 64, 4, 0, Math.PI * 2);
      g.fill();
    }
  return tex(c);
}

/** Wandstreifen: Graustufen, werden mit der Vertex-Farbe multipliziert. Oben Zierleiste, unten Sockel. */
export function wallStripes(): THREE.CanvasTexture {
  const [c, g] = mk(64, 128);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#e4e4e4';
  g.fillRect(32, 0, 32, 128);
  // Zierleiste oben
  g.fillStyle = '#c9c9c9';
  g.fillRect(0, 6, 64, 5);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 6);
  // Sockelleiste
  g.fillStyle = '#b8b8b8';
  g.fillRect(0, 116, 64, 12);
  return tex(c);
}

/** Beton mit Fugen (Fundament, Lager) */
export function concrete(base: number, line: number): THREE.CanvasTexture {
  const [c, g] = mk(256, 256);
  const r = rng(5);
  g.fillStyle = hex(base);
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
    g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 3);
  }
  g.strokeStyle = hex(line);
  g.lineWidth = 2;
  g.strokeRect(1, 1, 254, 254);
  return tex(c);
}

export function asphalt(): THREE.CanvasTexture {
  const [c, g] = mk(256, 256);
  const r = rng(9);
  g.fillStyle = '#4a4f5c';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const v = r();
    g.fillStyle = v > 0.5 ? `rgba(255,255,255,${r() * 0.05})` : `rgba(0,0,0,${r() * 0.08})`;
    g.fillRect(r() * 256, r() * 256, 2, 2);
  }
  return tex(c);
}

export function pavers(): THREE.CanvasTexture {
  const [c, g] = mk(256, 256);
  g.fillStyle = '#b3bcc8';
  g.fillRect(0, 0, 256, 256);
  const r = rng(13);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 === 0 ? 0 : 32;
    for (let i = -1; i < 5; i++) {
      g.fillStyle = shade(0xd1d7df, 0.96 + r() * 0.06);
      g.fillRect(i * 64 + off + 2, row * 64 + 2, 60, 60);
    }
  }
  return tex(c);
}

export function grass(): THREE.CanvasTexture {
  const [c, g] = mk(256, 256);
  const r = rng(21);
  g.fillStyle = '#68c943';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(80,170,50,0.55)' : 'rgba(120,215,80,0.5)';
    const x = r() * 256;
    const y = r() * 256;
    g.beginPath();
    g.ellipse(x, y, 6 + r() * 10, 3 + r() * 5, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c);
}

/** Garage: Asphalt mit gelben Stellplatzlinien */
export function garageFloor(): THREE.CanvasTexture {
  const [c, g] = mk(256, 256);
  g.fillStyle = '#626a78';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#ffd93b';
  g.fillRect(0, 0, 8, 150);
  g.fillRect(128, 0, 8, 150);
  return tex(c);
}

/** Radialer weicher Schatten für Figuren */
export function blobShadow(): THREE.CanvasTexture {
  const [c, g] = mk(64, 64);
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 31);
  grd.addColorStop(0, 'rgba(0,0,0,0.42)');
  grd.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
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
  g.fillStyle = '#ffd23a';
  g.strokeStyle = '#b36b00';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(32, 6);
  g.lineTo(58, 34);
  g.lineTo(46, 34);
  g.lineTo(32, 20);
  g.lineTo(18, 34);
  g.lineTo(6, 34);
  g.closePath();
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(32, 30);
  g.lineTo(58, 58);
  g.lineTo(46, 58);
  g.lineTo(32, 44);
  g.lineTo(18, 58);
  g.lineTo(6, 58);
  g.closePath();
  g.fill();
  g.stroke();
  return tex(c, false);
}

/** Text-/Schild-Textur (Hotelschild, Parken-Schild) */
export function signTexture(text: string, bg: string, fg: string, w = 512, h = 128, font = 'Lilita One'): THREE.CanvasTexture {
  const [c, g] = mk(w, h);
  g.fillStyle = bg;
  const r = h * 0.3;
  g.beginPath();
  g.roundRect(4, 4, w - 8, h - 8, r);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(255,255,255,0.9)';
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
  g.strokeStyle = 'rgba(43,20,87,0.9)';
  g.strokeText(text, w / 2, h / 2 + h * 0.04);
  g.fillText(text, w / 2, h / 2 + h * 0.04);
  return tex(c, false);
}
