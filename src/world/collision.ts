/** Achsparallele Kollisionsboxen in der Bodenebene (x/z), Kreis-gegen-Box-Auflösung. */

export interface AABB {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  tag?: string;
}

export class Collision {
  private boxes = new Set<AABB>();
  private grid = new Map<number, AABB[]>();
  private readonly cell = 4;
  private dirty = true;

  add(b: AABB): AABB {
    const n: AABB = { x0: Math.min(b.x0, b.x1), x1: Math.max(b.x0, b.x1), z0: Math.min(b.z0, b.z1), z1: Math.max(b.z0, b.z1), tag: b.tag };
    this.boxes.add(n);
    this.dirty = true;
    return n;
  }

  /** Box um einen Mittelpunkt */
  addCentered(x: number, z: number, w: number, d: number, tag?: string): AABB {
    return this.add({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, tag });
  }

  remove(b: AABB | undefined) {
    if (!b) return;
    this.boxes.delete(b);
    this.dirty = true;
  }

  removeTag(tag: string) {
    for (const b of [...this.boxes]) if (b.tag === tag) this.boxes.delete(b);
    this.dirty = true;
  }

  private key(i: number, j: number) {
    return (i + 512) * 1024 + (j + 512);
  }

  private rebuild() {
    this.grid.clear();
    const c = this.cell;
    for (const b of this.boxes) {
      for (let i = Math.floor(b.x0 / c); i <= Math.floor(b.x1 / c); i++)
        for (let j = Math.floor(b.z0 / c); j <= Math.floor(b.z1 / c); j++) {
          const k = this.key(i, j);
          let arr = this.grid.get(k);
          if (!arr) this.grid.set(k, (arr = []));
          arr.push(b);
        }
    }
    this.dirty = false;
  }

  private near(x: number, z: number, r: number): Set<AABB> {
    if (this.dirty) this.rebuild();
    const c = this.cell;
    const out = new Set<AABB>();
    for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++)
      for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++) {
        const arr = this.grid.get(this.key(i, j));
        if (arr) for (const b of arr) out.add(b);
      }
    return out;
  }

  /** Schiebt einen Kreis aus allen Boxen heraus. */
  resolve(x: number, z: number, r: number): { x: number; z: number } {
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const b of this.near(x, z, r + 0.5)) {
        const cx = Math.max(b.x0, Math.min(x, b.x1));
        const cz = Math.max(b.z0, Math.min(z, b.z1));
        const dx = x - cx;
        const dz = z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const push = r - d;
          x += (dx / d) * push;
          z += (dz / d) * push;
        } else {
          // Mittelpunkt in der Box: entlang der kleinsten Durchdringung hinaus
          const l = x - b.x0 + r;
          const rr = b.x1 - x + r;
          const t = z - b.z0 + r;
          const bb = b.z1 - z + r;
          const m = Math.min(l, rr, t, bb);
          if (m === l) x = b.x0 - r;
          else if (m === rr) x = b.x1 + r;
          else if (m === t) z = b.z0 - r;
          else z = b.z1 + r;
        }
        moved = true;
      }
      if (!moved) break;
    }
    return { x, z };
  }

  blocked(x: number, z: number, r: number): boolean {
    for (const b of this.near(x, z, r + 0.5)) {
      const cx = Math.max(b.x0, Math.min(x, b.x1));
      const cz = Math.max(b.z0, Math.min(z, b.z1));
      if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true;
    }
    return false;
  }
}
