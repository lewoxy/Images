/**
 * Steuerung: schwebender virtueller Stick (Touch/Maus ziehen) und WASD/Pfeiltasten.
 * Keine Klick-Interaktion mit der Spielwelt – alles läuft über Betreten (§1).
 */
export class Input {
  private keys = new Set<string>();
  private pointerId: number | null = null;
  private origin = { x: 0, y: 0 };
  private pos = { x: 0, y: 0 };
  readonly radius = 58;
  private base: HTMLDivElement;
  private knob: HTMLDivElement;
  enabled = true;
  /** wird bei jeder ersten Eingabe ausgelöst (Audio entsperren, Hinweis ausblenden) */
  onFirstInput: (() => void) | null = null;
  usedTouch = false;
  anyInputAt = 0;

  constructor(private surface: HTMLElement, overlay: HTMLElement) {
    this.base = document.createElement('div');
    this.base.className = 'joy-base';
    this.knob = document.createElement('div');
    this.knob.className = 'joy-knob';
    this.base.appendChild(this.knob);
    overlay.appendChild(this.base);

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        this.keys.add(k);
        e.preventDefault();
        this.fire();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.release();
    });

    surface.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.pointerId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.pointerId = e.pointerId;
      this.usedTouch = e.pointerType !== 'mouse';
      surface.setPointerCapture(e.pointerId);
      this.origin = { x: e.clientX, y: e.clientY };
      this.pos = { ...this.origin };
      this.base.style.left = e.clientX + 'px';
      this.base.style.top = e.clientY + 'px';
      this.base.classList.add('on');
      this.updateKnob();
      this.fire();
      e.preventDefault();
    });
    surface.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.pos = { x: e.clientX, y: e.clientY };
      // Stick wandert mit, wenn der Finger über den Rand hinaus zieht
      const dx = this.pos.x - this.origin.x;
      const dy = this.pos.y - this.origin.y;
      const d = Math.hypot(dx, dy);
      if (d > this.radius) {
        const f = (d - this.radius) / d;
        this.origin.x += dx * f;
        this.origin.y += dy * f;
        this.base.style.left = this.origin.x + 'px';
        this.base.style.top = this.origin.y + 'px';
      }
      this.updateKnob();
      e.preventDefault();
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.release();
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);
    surface.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private fire() {
    this.anyInputAt = performance.now();
    if (this.onFirstInput) {
      const f = this.onFirstInput;
      this.onFirstInput = null;
      f();
    }
  }

  private release() {
    if (this.pointerId !== null) {
      try {
        this.surface.releasePointerCapture(this.pointerId);
      } catch {
        /* bereits freigegeben */
      }
    }
    this.pointerId = null;
    this.base.classList.remove('on');
  }

  private updateKnob() {
    const dx = this.pos.x - this.origin.x;
    const dy = this.pos.y - this.origin.y;
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  /** Bewegungsvektor in Bildschirmkoordinaten (x rechts, y hoch), Länge 0..1 */
  get vector(): { x: number; y: number } {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = 0,
      y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y -= 1;
    if (x !== 0 || y !== 0) {
      const l = Math.hypot(x, y);
      return { x: x / l, y: y / l };
    }
    if (this.pointerId !== null) {
      const dx = this.pos.x - this.origin.x;
      const dy = this.pos.y - this.origin.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) return { x: 0, y: 0 };
      const m = Math.min(1, d / this.radius);
      // weiche Kennlinie: schon kleine Auslenkung bewegt merklich
      const s = Math.min(1, 0.35 + m * 0.75);
      return { x: (dx / d) * s, y: (-dy / d) * s };
    }
    return { x: 0, y: 0 };
  }

  get active(): boolean {
    const v = this.vector;
    return v.x !== 0 || v.y !== 0;
  }
}
