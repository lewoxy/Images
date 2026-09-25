import { Stage } from '../world/stage';

/** An Weltpositionen verankerte DOM-Elemente: schwebende Zahlen, Sprechblasen, Fortschrittsringe. */

type Anchor = () => { x: number; y: number; z: number };

interface Sticky {
  outer: HTMLDivElement;
  inner: HTMLDivElement;
  anchor: Anchor;
  html: string;
  cls: string;
  seen: boolean;
}

interface Floater {
  outer: HTMLDivElement;
  x: number;
  y: number;
  z: number;
  t: number;
  dur: number;
  rise: number;
}

const RING_R = 18;
const RING_C = 2 * Math.PI * RING_R;

export class FX {
  private sticky = new Map<string, Sticky>();
  private floats: Floater[] = [];

  constructor(
    private stage: Stage,
    private layer: HTMLElement,
  ) {}

  /** Schwebender Text (+10 etc.) */
  float(x: number, y: number, z: number, html: string, cls = '', dur = 1.1, rise = 46) {
    if (this.floats.length > 40) {
      const f = this.floats.shift()!;
      f.outer.remove();
    }
    const outer = document.createElement('div');
    outer.className = 'fx';
    const inner = document.createElement('div');
    inner.className = 'float-text stroke ' + cls;
    inner.style.transform = 'translate(-50%, -100%)';
    inner.innerHTML = html;
    outer.appendChild(inner);
    this.layer.appendChild(outer);
    this.floats.push({ outer, x, y, z, t: 0, dur, rise });
  }

  /** Dauerhaftes, verankertes Element setzen/aktualisieren */
  set(id: string, anchor: Anchor, html: string, cls = '') {
    let s = this.sticky.get(id);
    if (!s) {
      const outer = document.createElement('div');
      outer.className = 'fx';
      const inner = document.createElement('div');
      inner.style.transform = 'translate(-50%, -100%)';
      outer.appendChild(inner);
      this.layer.appendChild(outer);
      s = { outer, inner, anchor, html: '', cls: '', seen: true };
      this.sticky.set(id, s);
    }
    s.anchor = anchor;
    s.seen = true;
    if (s.html !== html) {
      s.inner.innerHTML = html;
      s.html = html;
    }
    if (s.cls !== cls) {
      s.inner.className = cls;
      s.cls = cls;
    }
  }

  has(id: string) {
    return this.sticky.has(id);
  }

  remove(id: string) {
    const s = this.sticky.get(id);
    if (s) {
      s.outer.remove();
      this.sticky.delete(id);
    }
  }

  /** Fortschrittsring (0..1) */
  ring(id: string, anchor: Anchor, p: number, color = '#7cf08a') {
    const off = (RING_C * (1 - Math.max(0, Math.min(1, p)))).toFixed(1);
    const html = `<svg class="ring" viewBox="0 0 46 46"><circle class="bg" cx="23" cy="23" r="${RING_R}"/><circle class="fg" cx="23" cy="23" r="${RING_R}" stroke="${color}" stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${off}"/></svg>`;
    this.set(id, anchor, html, '');
  }

  /** Markiert alle Sticky-Elemente als „nicht gesehen“ – am Frame-Ende werden nicht erneuerte entfernt. */
  beginFrame() {
    for (const s of this.sticky.values()) s.seen = false;
  }

  endFrame() {
    for (const [id, s] of this.sticky) {
      if (!s.seen) {
        s.outer.remove();
        this.sticky.delete(id);
      }
    }
  }

  update(dt: number) {
    for (const s of this.sticky.values()) {
      const a = s.anchor();
      const p = this.stage.project(a.x, a.y, a.z);
      if (!p.visible) {
        s.outer.style.display = 'none';
        continue;
      }
      s.outer.style.display = '';
      s.outer.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      const k = f.t / f.dur;
      if (k >= 1) {
        f.outer.remove();
        this.floats.splice(i, 1);
        continue;
      }
      const p = this.stage.project(f.x, f.y, f.z);
      const lift = f.rise * (1 - (1 - k) * (1 - k));
      const sc = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : k < 0.3 ? 1.1 - ((k - 0.15) / 0.15) * 0.1 : 1;
      f.outer.style.transform = `translate3d(${p.x.toFixed(1)}px, ${(p.y - lift).toFixed(1)}px, 0) scale(${sc.toFixed(2)})`;
      f.outer.style.opacity = k > 0.7 ? String(1 - (k - 0.7) / 0.3) : '1';
    }
  }

  clear() {
    for (const s of this.sticky.values()) s.outer.remove();
    this.sticky.clear();
    for (const f of this.floats) f.outer.remove();
    this.floats = [];
  }
}
