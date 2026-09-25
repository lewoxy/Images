import * as THREE from 'three';
import { drawIcon } from '../ui/icons';
import type { Cost } from '../config/balance';
import { PLATE_DELAY, purchaseStep } from '../config/balance';
import type { UpgradeNode } from '../config/progression';
import { T, fmt } from '../config/strings';

/**
 * Kaufplatte: Betreten startet die Zahlung (Trigger-Volume, keine Klicks, §1).
 *
 * §9: Kaufdauer konstant ≈ 3 s mit Ease-out. Die gemessenen Deltas (≈450 →
 * ≈250 → 11 → 1 pro Viertelsekunde bei 3.310 in 3,2 s) entsprechen einem
 * quadratischen Ease-out: bezahlt(t) = Kosten · (1 − (1 − t/T)²).
 * Der Fortschritt bleibt beim Verlassen erhalten.
 */

export function plateIcon(n: UpgradeNode): { icon: string; label: string } {
  switch (n.kind) {
    case 'room':
      return n.tier === 1 ? { icon: 'bedPlus', label: T.plate.room } : { icon: 'bedUp', label: `${T.plate.roomUp} ${n.tier}` };
    case 'cleaner':
      return n.tier === 1 ? { icon: 'cleanerPlus', label: T.plate.cleaner } : { icon: 'cleanerSpeed', label: T.plate.cleanerUp };
    case 'toilet':
      return { icon: 'wcPlus', label: T.plate.toilet };
    case 'zone':
      return { icon: 'zone', label: T.plate.zone };
    case 'reception':
      return n.tier === 1 ? { icon: 'receptionPlus', label: T.plate.reception } : n.tier === 2 ? { icon: 'receptionSpeed', label: T.plate.receptionUp } : { icon: 'desk2', label: T.plate.receptionDesk2 };
    case 'supplier':
      return n.tier === 1
        ? { icon: 'supplierPlus', label: T.plate.supplier }
        : n.tier % 2 === 0
          ? { icon: 'supplierSpeed', label: T.plate.supplierSpeed }
          : { icon: 'supplierCarry', label: T.plate.supplierCarry };
    case 'parking':
      return { icon: 'parking', label: T.plate.parking };
    case 'parker':
      return { icon: 'parkerPlus', label: T.plate.parker };
    case 'elevator':
      return { icon: 'elevator', label: T.plate.elevator };
  }
}

export class Plate {
  mesh: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private lastKey = '';
  onT = 0;
  appear = 0;
  removing = false;
  affordable = false;
  /** Spieler hat keine Ressourcen – kurz rot blinken */
  blockedFlash = 0;
  icon: string;
  label: string;

  constructor(
    public node: UpgradeNode,
    public cost: Cost,
    public x: number,
    public z: number,
    public size: number,
    public paid: number,
    public resPaid: boolean,
    yaw: number,
    scene: THREE.Object3D,
  ) {
    const ic = plateIcon(node);
    this.icon = ic.icon;
    this.label = ic.label;
    if (node.kind === 'zone') this.label = `${T.plate.zone} ${node.zone}`;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    const geo = new THREE.PlaneGeometry(size, size);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.mesh.position.set(x, 0.035, z);
    this.mesh.rotation.y = yaw;
    this.mesh.renderOrder = 2;
    this.mesh.scale.setScalar(0.01);
    scene.add(this.mesh);
    this.redraw(0, 0);
  }

  get rest() {
    return Math.max(0, this.cost.cash - this.paid);
  }

  /** Liegt der Punkt auf der Platte? (Quadrat, gegen die Kameradrehung gedreht) */
  contains(px: number, pz: number): boolean {
    const dx = px - this.x;
    const dz = pz - this.z;
    const a = -this.mesh.rotation.y;
    const lx = dx * Math.cos(a) - dz * Math.sin(a);
    const lz = dx * Math.sin(a) + dz * Math.cos(a);
    const h = this.size / 2 - 0.12;
    return Math.abs(lx) <= h && Math.abs(lz) <= h;
  }

  /**
   * Zahlungsschritt. Gibt den abgebuchten Betrag zurück.
   * `cash` = verfügbares Geld, `hasRes` = genügend Ressource vorhanden.
   */
  pay(dt: number, cash: number): number {
    const C = this.cost.cash;
    if (C <= 0) return 0;
    const p2 = purchaseStep(this.paid / C, dt);
    let tick = Math.max(p2 * C - this.paid, Math.min(1, this.rest));
    tick = Math.min(tick, this.rest, cash);
    if (tick <= 1e-9) return 0;
    this.paid += tick;
    if (this.rest < 1e-6) this.paid = C;
    return tick;
  }

  get complete() {
    return this.paid >= this.cost.cash - 1e-6 && (!this.cost.res || this.resPaid);
  }

  update(dt: number, t: number, resShort: boolean) {
    if (this.removing) {
      this.appear = Math.max(0, this.appear - dt * 5);
      this.mesh.scale.setScalar(Math.max(0.001, this.appear));
      return;
    }
    if (this.appear < 1) {
      this.appear = Math.min(1, this.appear + dt * 3);
      const k = this.appear;
      const s = 1 + Math.sin(k * Math.PI) * 0.25 * (1 - k);
      this.mesh.scale.setScalar(Math.max(0.01, k * s));
    } else {
      const pulse = this.affordable && this.onT === 0 ? 1 + Math.sin(t * 5) * 0.035 : 1;
      this.mesh.scale.setScalar(pulse);
    }
    if (this.blockedFlash > 0) this.blockedFlash = Math.max(0, this.blockedFlash - dt);
    this.redraw(this.cost.cash > 0 ? this.paid / this.cost.cash : 1, resShort ? 1 : 0);
  }

  private redraw(progress: number, resShort: number) {
    const rest = Math.ceil(this.rest);
    const flash = this.blockedFlash > 0 && Math.floor(this.blockedFlash * 8) % 2 === 0 ? 1 : 0;
    const key = `${rest}|${Math.round(progress * 60)}|${resShort}|${this.resPaid}|${flash}|${this.affordable}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const g = this.ctx;
    g.clearRect(0, 0, 256, 256);
    g.save();
    g.beginPath();
    g.roundRect(10, 10, 236, 236, 46);
    g.fillStyle = 'rgba(38, 14, 96, 0.62)';
    g.fill();
    g.clip();
    if (progress > 0) {
      g.fillStyle = 'rgba(92, 232, 112, 0.85)';
      const h = 236 * progress;
      g.fillRect(0, 246 - h, 256, h);
    }
    g.restore();
    g.setLineDash([30, 17]);
    g.lineWidth = 11;
    g.strokeStyle = this.affordable ? '#ffffff' : 'rgba(255,255,255,0.75)';
    g.beginPath();
    g.roundRect(16, 16, 224, 224, 40);
    g.stroke();
    g.setLineDash([]);
    // Label
    g.font = '28px "Lilita One", "Arial Black", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 7;
    g.strokeStyle = '#2b1457';
    g.fillStyle = '#ffffff';
    g.strokeText(this.label.toUpperCase(), 128, 46);
    g.fillText(this.label.toUpperCase(), 128, 46);
    // Icon
    drawIcon(g, this.icon, 80, 62, 96);
    // Preis
    const res = this.cost.res && !this.resPaid ? this.cost.res : null;
    const priceTxt = fmt(rest);
    g.font = res ? '40px "Lilita One", "Arial Black", sans-serif' : '48px "Lilita One", "Arial Black", sans-serif';
    const pw = g.measureText(priceTxt).width;
    const iconS = res ? 36 : 44;
    let resW = 0;
    let resTxt = '';
    if (res) {
      resTxt = String(res.amount);
      resW = iconS + 6 + g.measureText(resTxt).width + 16;
    }
    const total = iconS + 6 + pw + resW;
    let x = 128 - total / 2;
    const y = 204;
    drawIcon(g, 'cash', x, y - iconS / 2 - 2, iconS);
    x += iconS + 6;
    g.textAlign = 'left';
    g.lineWidth = 8;
    g.strokeText(priceTxt, x, y);
    g.fillStyle = flash ? '#ff5a5a' : '#ffffff';
    g.fillText(priceTxt, x, y);
    x += pw + 16;
    if (res) {
      drawIcon(g, res.type === 'candy' ? 'candy' : 'toiletpaper', x, y - iconS / 2 - 2, iconS);
      x += iconS + 6;
      g.strokeText(resTxt, x, y);
      g.fillStyle = resShort ? '#ff6a6a' : '#ffffff';
      g.fillText(resTxt, x, y);
    }
    this.tex.needsUpdate = true;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.tex.dispose();
  }
}

export { PLATE_DELAY };
