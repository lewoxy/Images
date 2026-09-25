import * as THREE from 'three';
import { setMaxAnisotropy } from './textures';

/**
 * Renderer, Szene und Kamera. Feste Schrägdraufsicht, die der Figur folgt (§1).
 */
export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  /** Blickrichtung um die Hochachse (Kamera steht vorne rechts) */
  yaw = THREE.MathUtils.degToRad(26);
  pitch = THREE.MathUtils.degToRad(54);
  /** Gewünschte sichtbare Breite am Zielpunkt (Einheiten) */
  viewWidth = 24;
  viewDepth = 30;
  dist = 34;
  zoom = 1;
  target = new THREE.Vector3();
  private smoothTarget = new THREE.Vector3();
  private shake = 0;
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  highQuality = true;

  constructor(public container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x68c943);
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = 'game-canvas';
    setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());

    this.camera = new THREE.PerspectiveCamera(34, 1, 1, 400);

    // Weiches, helles Licht – Lambert mit flacher Schattierung (§15)
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xb8a58c, 2.1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.55);
    this.sun.position.set(-18, 40, 22);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
  }

  setQuality(high: boolean) {
    this.highQuality = high;
    this.resize();
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.highQuality ? 2 : 1.25);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h;
    // Abstand so wählen, dass im Hochformat ≈ viewWidth Einheiten Breite sichtbar sind,
    // im Querformat ≈ viewDepth Einheiten Tiefe.
    const vf = THREE.MathUtils.degToRad(this.camera.fov);
    const hf = 2 * Math.atan(Math.tan(vf / 2) * this.camera.aspect);
    const dW = this.viewWidth / 2 / Math.tan(hf / 2);
    const dH = (this.viewDepth * Math.sin(this.pitch)) / 2 / Math.tan(vf / 2);
    this.dist = Math.max(22, Math.min(62, Math.max(dW, dH)));
    this.camera.updateProjectionMatrix();
  }

  /** Bildschirm-Richtung (x rechts, y hoch) in Welt-Richtung umrechnen */
  screenToWorldDir(sx: number, sy: number): { x: number; z: number } {
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    return { x: rx * sx + fx * sy, z: rz * sx + fz * sy };
  }

  addShake(a: number) {
    this.shake = Math.min(0.6, this.shake + a);
  }

  snap(x: number, z: number) {
    this.target.set(x, 0, z);
    this.smoothTarget.copy(this.target);
    this.updateCamera(0);
  }

  updateCamera(dt: number) {
    const k = dt > 0 ? 1 - Math.exp(-dt * 7) : 1;
    this.smoothTarget.lerp(this.target, k);
    const d = this.dist * this.zoom;
    const hd = Math.cos(this.pitch) * d;
    const cx = this.smoothTarget.x + Math.sin(this.yaw) * hd;
    const cz = this.smoothTarget.z + Math.cos(this.yaw) * hd;
    const cy = Math.sin(this.pitch) * d;
    let sx = 0,
      sy = 0;
    if (this.shake > 0) {
      sx = (Math.random() - 0.5) * this.shake;
      sy = (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.camera.position.set(cx + sx, cy + sy, cz);
    this.camera.lookAt(this.smoothTarget.x + sx, 0.6, this.smoothTarget.z);
    this.sun.position.set(this.smoothTarget.x - 18, 40, this.smoothTarget.z + 22);
    this.sun.target.position.set(this.smoothTarget.x, 0, this.smoothTarget.z);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** Weltpunkt → Bildschirmkoordinaten (CSS-Pixel). z > 1 = hinter der Kamera */
  private _v = new THREE.Vector3();
  project(x: number, y: number, z: number): { x: number; y: number; visible: boolean } {
    const v = this._v.set(x, y, z).project(this.camera);
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    return {
      x: (v.x * 0.5 + 0.5) * w,
      y: (-v.y * 0.5 + 0.5) * h,
      visible: v.z < 1 && v.x > -1.2 && v.x < 1.2 && v.y > -1.3 && v.y < 1.3,
    };
  }
}
