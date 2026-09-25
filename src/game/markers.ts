import * as THREE from 'three';
import { drawIcon } from '../ui/icons';

/**
 * Sichtbare Bodenzonen für Trigger ohne Kaufplatte (Rezeption, Lager, WC-Station,
 * Service-Theke, Schranke, Mülleimer). Aktive Zonen leuchten und pulsieren.
 */

const texCache = new Map<string, THREE.CanvasTexture>();

function markerTexture(icon: string, color: string): THREE.CanvasTexture {
  const key = icon + color;
  let t = texCache.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.beginPath();
  g.arc(64, 64, 58, 0, Math.PI * 2);
  g.fillStyle = color.replace('1)', '0.28)');
  g.fill();
  g.setLineDash([16, 10]);
  g.lineWidth = 8;
  g.strokeStyle = '#ffffff';
  g.beginPath();
  g.arc(64, 64, 54, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  drawIcon(g, icon, 34, 34, 60);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

export class FloorMarker {
  mesh: THREE.Mesh;
  private mat: THREE.MeshBasicMaterial;
  active = false;
  visible = true;
  private t = Math.random() * 5;

  constructor(
    scene: THREE.Object3D,
    public x: number,
    public z: number,
    size: number,
    icon: string,
    yaw: number,
    color = 'rgba(123,47,247,1)',
  ) {
    const geo = new THREE.PlaneGeometry(size, size);
    geo.rotateX(-Math.PI / 2);
    this.mat = new THREE.MeshBasicMaterial({ map: markerTexture(icon, color), transparent: true, depthWrite: false, opacity: 0.55 });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.set(x, 0.03, z);
    this.mesh.rotation.y = yaw;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
  }

  update(dt: number) {
    this.t += dt;
    this.mesh.visible = this.visible;
    if (!this.visible) return;
    const target = this.active ? 1 : 0.5;
    this.mat.opacity += (target - this.mat.opacity) * Math.min(1, dt * 6);
    const s = this.active ? 1 + Math.sin(this.t * 6) * 0.05 : 1;
    this.mesh.scale.set(s, 1, s);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}
