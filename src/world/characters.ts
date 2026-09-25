import * as THREE from 'three';
import { GeoBuilder, vcMaterial } from './geo';
import { C, HAIR, PANTS, SHIRTS, SKIN } from '../config/palette';

/**
 * Eigene Figuren im Chibi-Stil (großer Kopf, kleiner Körper), komplett aus
 * Primitiven gebaut. Bewusst anders gestaltet als das Original (§18):
 * der Page trägt Violett-Gold und hat ein Gesicht.
 */

export type HairStyle = 'short' | 'bun' | 'long' | 'spiky' | 'bald' | 'pony' | 'curly';
export type HatKind = 'bellhop' | 'cap' | 'band' | 'chef' | 'hardhat' | 'crown' | 'nurse' | 'beanie' | 'tophat';

export interface Look {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  shirt: number;
  pants: number;
  shoes: number;
  hat?: { kind: HatKind; color: number; band?: number };
  vest?: number;
  buttons?: number;
  bowtie?: number;
  sunglasses?: boolean;
  apron?: number;
  gloves?: number;
  scale?: number;
}

export type Pose = 'idle' | 'walk' | 'work' | 'sleep' | 'sit' | 'wave';

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export function randomGuestLook(): Look {
  const styles: HairStyle[] = ['short', 'bun', 'long', 'spiky', 'pony', 'curly', 'short', 'bald'];
  const style = pick(styles);
  const look: Look = {
    skin: pick(SKIN),
    hair: pick(HAIR),
    hairStyle: style,
    shirt: pick(SHIRTS),
    pants: pick(PANTS),
    shoes: pick([0x2a2233, 0x6b3b24, 0xf2f2f2, 0xe84a5f]),
    scale: 0.94 + Math.random() * 0.1,
  };
  const r = Math.random();
  if (style === 'bald' || r < 0.18) {
    look.hat = { kind: pick(['cap', 'beanie', 'tophat'] as HatKind[]), color: pick(SHIRTS), band: pick(SHIRTS) };
  }
  if (Math.random() < 0.12) look.sunglasses = true;
  return look;
}

export const LOOKS = {
  player: (): Look => ({
    skin: 0xf5c9a6,
    hair: 0x6b4226,
    hairStyle: 'short',
    shirt: C.playerUniform,
    pants: C.playerPants,
    shoes: C.shoe,
    hat: { kind: 'bellhop', color: C.playerUniform, band: C.playerTrim },
    buttons: C.playerTrim,
    gloves: 0xf4f0ff,
  }),
  cleaner: (): Look => ({
    skin: pick(SKIN),
    hair: pick(HAIR),
    hairStyle: pick(['bun', 'short', 'pony'] as HairStyle[]),
    shirt: C.cleanerUniform,
    pants: 0x1f8a63,
    shoes: 0x2a2233,
    hat: { kind: 'band', color: C.cleanerBand },
    apron: 0xfff3a8,
  }),
  helper: (): Look => ({
    skin: pick(SKIN),
    hair: 0xf2d06b,
    hairStyle: 'spiky',
    shirt: C.helperGold,
    pants: 0xe08a00,
    shoes: 0x2a2233,
    hat: { kind: 'band', color: 0xff5fa8 },
    apron: 0xffffff,
  }),
  receptionist: (): Look => ({
    skin: pick(SKIN),
    hair: pick(HAIR),
    hairStyle: pick(['bun', 'short', 'long', 'curly'] as HairStyle[]),
    shirt: C.receptionShirt,
    vest: C.receptionVest,
    bowtie: 0x2a2233,
    pants: 0x2e2a45,
    shoes: C.shoe,
  }),
  supplier: (): Look => ({
    skin: pick(SKIN),
    hair: pick(HAIR),
    hairStyle: 'short',
    shirt: C.supplierOveralls,
    pants: 0xd97a1a,
    shoes: 0x5a3a24,
    hat: { kind: 'hardhat', color: C.supplierCap },
  }),
  parker: (): Look => ({
    skin: pick(SKIN),
    hair: pick(HAIR),
    hairStyle: 'short',
    shirt: C.parkerJacket,
    pants: 0x1c2a5a,
    shoes: C.shoe,
    hat: { kind: 'cap', color: C.parkerCap, band: 0xffffff },
    buttons: 0xffd23a,
  }),
  vip: (): Look => ({
    skin: pick(SKIN),
    hair: pick(HAIR),
    hairStyle: pick(['short', 'long', 'pony'] as HairStyle[]),
    shirt: 0x1d1d28,
    vest: 0xffc42e,
    pants: 0x1d1d28,
    shoes: 0xffc42e,
    sunglasses: true,
    hat: { kind: 'crown', color: 0xffc42e },
  }),
};

export const SPECIAL_LOOKS: Look[] = [
  { skin: 0xf5c9a6, hair: 0xc0452b, hairStyle: 'bun', shirt: 0xffffff, pants: 0xff8fb0, shoes: 0xffffff, hat: { kind: 'nurse', color: 0xffffff }, apron: 0xff5f7a },
  { skin: 0xeab28a, hair: 0x1e1e24, hairStyle: 'spiky', shirt: 0x1d1d28, pants: 0xe8203a, shoes: 0x1d1d28, sunglasses: true, vest: 0xe8203a },
  { skin: 0xf7d7bd, hair: 0x3b2a20, hairStyle: 'short', shirt: 0xffffff, pants: 0x2e3a59, shoes: 0x2a2233, hat: { kind: 'chef', color: 0xffffff }, bowtie: 0xe8423a },
  { skin: 0xf5c9a6, hair: 0x9b4dff, hairStyle: 'long', shirt: 0xb57bff, pants: 0x6a2fd6, shoes: 0xffc42e, hat: { kind: 'crown', color: 0xffc42e } },
  { skin: 0xcf9168, hair: 0x9e9e9e, hairStyle: 'short', shirt: 0x1f3f8a, pants: 0xffffff, shoes: 0x2a2233, hat: { kind: 'cap', color: 0xffffff, band: 0x1f3f8a }, buttons: 0xffd23a },
  { skin: 0x9a6441, hair: 0x1e1e24, hairStyle: 'pony', shirt: 0xffffff, pants: 0x46c97a, shoes: 0xffffff, hat: { kind: 'band', color: 0x46c97a } },
];

function buildHead(b: GeoBuilder, look: Look) {
  const hy = 1.52;
  b.sphere(0.36, look.skin, 0, hy, 0, 18);
  // Augen
  b.sphere(0.055, C.eye, -0.125, hy + 0.02, 0.325, 8, { sz: 0.55 });
  b.sphere(0.055, C.eye, 0.125, hy + 0.02, 0.325, 8, { sz: 0.55 });
  b.sphere(0.018, 0xffffff, -0.108, hy + 0.045, 0.352, 6);
  b.sphere(0.018, 0xffffff, 0.142, hy + 0.045, 0.352, 6);
  // Wangen
  b.sphere(0.05, C.cheek, -0.21, hy - 0.08, 0.28, 8, { sz: 0.4 });
  b.sphere(0.05, C.cheek, 0.21, hy - 0.08, 0.28, 8, { sz: 0.4 });
  // Mund
  b.box(0.1, 0.022, 0.02, 0x8a3b3b, 0, hy - 0.13, 0.335);
  if (look.sunglasses) {
    b.box(0.46, 0.1, 0.06, 0x1a1a22, 0, hy - 0.03, 0.32);
  }
  const hair = look.hair;
  switch (look.hairStyle) {
    case 'short':
      b.dome(0.38, hair, 0, hy + 0.02, -0.03, 16, { sy: 0.85 });
      break;
    case 'bun':
      b.dome(0.38, hair, 0, hy + 0.02, -0.03, 16, { sy: 0.85 });
      b.sphere(0.16, hair, 0, hy + 0.36, -0.14, 10);
      break;
    case 'pony':
      b.dome(0.38, hair, 0, hy + 0.02, -0.03, 16, { sy: 0.85 });
      b.capsule(0.09, 0.28, hair, 0, hy - 0.08, -0.38, { rx: 0.35 });
      break;
    case 'long':
      b.dome(0.385, hair, 0, hy + 0.02, -0.02, 16, { sy: 0.9 });
      b.rbox(0.72, 0.62, 0.3, 0.14, hair, 0, hy - 0.5, -0.2);
      break;
    case 'spiky':
      b.dome(0.37, hair, 0, hy + 0.04, -0.03, 14, { sy: 0.8 });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        b.cone(0.1, 0.22, hair, Math.cos(a) * 0.18, hy + 0.24, Math.sin(a) * 0.16 - 0.04, 6, { rx: Math.sin(a) * 0.5, rz: -Math.cos(a) * 0.5 });
      }
      break;
    case 'curly':
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        b.sphere(0.15, hair, Math.cos(a) * 0.25, hy + 0.2, Math.sin(a) * 0.22 - 0.06, 8);
      }
      b.sphere(0.2, hair, 0, hy + 0.3, -0.05, 10);
      break;
    case 'bald':
      break;
  }
  const hat = look.hat;
  if (hat) {
    switch (hat.kind) {
      case 'bellhop':
        b.cyl(0.22, 0.24, 0.24, hat.color, 0.04, hy + 0.3, -0.02, 16, { rz: -0.15 });
        if (hat.band) b.cyl(0.245, 0.245, 0.06, hat.band, 0.04, hy + 0.31, -0.02, 16, { rz: -0.15 });
        b.sphere(0.04, hat.band ?? 0xffffff, 0.08, hy + 0.56, -0.02, 6);
        break;
      case 'cap':
        b.dome(0.39, hat.color, 0, hy + 0.06, -0.02, 14, { sy: 0.7 });
        b.box(0.44, 0.04, 0.26, hat.band ?? hat.color, 0, hy + 0.1, 0.36);
        break;
      case 'band':
        b.torus(0.345, 0.05, hat.color, 0, hy + 0.14, -0.01, { rx: Math.PI / 2 + 0.12 });
        break;
      case 'chef':
        b.cyl(0.25, 0.25, 0.3, hat.color, 0, hy + 0.25, -0.02, 14);
        b.sphere(0.3, hat.color, 0, hy + 0.62, -0.02, 12, { sy: 0.7 });
        break;
      case 'hardhat':
        b.dome(0.4, hat.color, 0, hy + 0.06, -0.02, 14, { sy: 0.78 });
        b.cyl(0.47, 0.47, 0.04, hat.color, 0, hy + 0.05, 0.02, 16);
        break;
      case 'crown':
        b.cyl(0.24, 0.22, 0.16, hat.color, 0, hy + 0.3, -0.02, 10);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          b.cone(0.06, 0.14, hat.color, Math.cos(a) * 0.2, hy + 0.46, Math.sin(a) * 0.2 - 0.02, 5);
        }
        b.sphere(0.045, 0xe8203a, 0, hy + 0.38, 0.22, 6);
        break;
      case 'nurse':
        b.box(0.34, 0.14, 0.14, hat.color, 0, hy + 0.32, 0.02, { rx: -0.2 });
        b.box(0.1, 0.03, 0.02, 0xe8203a, 0, hy + 0.38, 0.1, { rx: -0.2 });
        b.box(0.03, 0.1, 0.02, 0xe8203a, 0, hy + 0.345, 0.1, { rx: -0.2 });
        break;
      case 'beanie':
        b.dome(0.39, hat.color, 0, hy + 0.05, -0.02, 14, { sy: 0.95 });
        b.sphere(0.08, hat.band ?? 0xffffff, 0, hy + 0.43, -0.02, 8);
        break;
      case 'tophat':
        b.cyl(0.2, 0.2, 0.38, hat.color, 0, hy + 0.3, -0.02, 14);
        b.cyl(0.34, 0.34, 0.03, hat.color, 0, hy + 0.29, -0.02, 16);
        if (hat.band) b.cyl(0.205, 0.205, 0.07, hat.band, 0, hy + 0.33, -0.02, 14);
        break;
    }
  }
}

function buildTorso(b: GeoBuilder, look: Look) {
  const main = look.vest ?? look.shirt;
  b.rbox(0.66, 0.6, 0.44, 0.17, main, 0, 0.56, 0);
  // Hals
  b.cyl(0.11, 0.12, 0.12, look.skin, 0, 1.1, 0, 8);
  if (look.vest) {
    // Hemdeinsatz (V)
    b.box(0.2, 0.24, 0.04, look.shirt, 0, 0.9, 0.21, { rx: 0.05 });
  }
  if (look.apron) {
    b.rbox(0.46, 0.46, 0.05, 0.03, look.apron, 0, 0.56, 0.2);
  }
  if (look.buttons) {
    for (const x of [-0.1, 0.1])
      for (const y of [0.78, 0.94]) b.sphere(0.035, look.buttons, x, y, 0.225, 6);
    // Kragen
    b.box(0.34, 0.05, 0.1, look.buttons, 0, 1.12, 0.12);
  }
  if (look.bowtie) {
    b.cone(0.06, 0.1, look.bowtie, -0.06, 1.1, 0.23, 6, { rz: Math.PI / 2 });
    b.cone(0.06, 0.1, look.bowtie, 0.06, 1.1, 0.23, 6, { rz: -Math.PI / 2 });
  }
  // Gürtel
  b.rbox(0.67, 0.08, 0.45, 0.04, look.pants, 0, 0.56, 0);
}

export class Character {
  root = new THREE.Group();
  body = new THREE.Group();
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  hold = new THREE.Group();
  tool: THREE.Object3D | null = null;
  private phase = Math.random() * 10;
  private t = Math.random() * 10;
  pose: Pose = 'idle';
  carrying = false;
  /** 0..1 für Squash-Animation beim Kauf etc. */
  private bounce = 0;

  constructor(public look: Look) {
    const s = look.scale ?? 1;
    const bt = new GeoBuilder();
    buildTorso(bt, look);
    buildHead(bt, look);
    const torso = new THREE.Mesh(bt.build(), vcMaterial);
    this.body.add(torso);

    const leg = (sx: number) => {
      const b = new GeoBuilder();
      b.capsule(0.12, 0.34, look.pants, 0, -0.26, 0);
      b.rbox(0.24, 0.14, 0.34, 0.06, look.shoes, 0, -0.62, 0.05);
      const m = new THREE.Mesh(b.build(), vcMaterial);
      m.position.set(sx, 0.62, 0);
      return m;
    };
    this.legL = leg(-0.15);
    this.legR = leg(0.15);
    const arm = (sx: number) => {
      const b = new GeoBuilder();
      b.capsule(0.095, 0.3, look.vest ? look.shirt : look.shirt, 0, -0.22, 0);
      b.sphere(0.105, look.gloves ?? look.skin, 0, -0.45, 0, 10);
      const m = new THREE.Mesh(b.build(), vcMaterial);
      m.position.set(sx, 1.04, 0);
      m.rotation.z = sx < 0 ? 0.12 : -0.12;
      return m;
    };
    this.armL = arm(-0.41);
    this.armR = arm(0.41);
    this.body.add(this.legL, this.legR, this.armL, this.armR);
    this.hold.position.set(0, 0.86, 0.42);
    this.body.add(this.hold);
    this.root.add(this.body);
    this.root.scale.setScalar(s);
  }

  setTool(obj: THREE.Object3D | null) {
    if (this.tool) this.armR.remove(this.tool);
    this.tool = obj;
    if (obj) {
      obj.position.set(0, -0.45, 0.05);
      this.armR.add(obj);
    }
  }

  pop() {
    this.bounce = 1;
  }

  get x() {
    return this.root.position.x;
  }
  get z() {
    return this.root.position.z;
  }

  faceTowards(dx: number, dz: number, dt: number, rate = 12) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
    const target = Math.atan2(dx, dz);
    let d = target - this.root.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.root.rotation.y += d * Math.min(1, dt * rate);
  }

  /** Animation. speed = aktuelle Laufgeschwindigkeit in Einheiten/s */
  animate(dt: number, speed: number) {
    this.t += dt;
    const b = this.body;
    b.rotation.set(0, 0, 0);
    b.position.set(0, 0, 0);
    if (this.pose === 'sleep') {
      b.rotation.x = -Math.PI / 2;
      b.position.set(0, 0.95, 0.62);
      this.legL.rotation.x = 0;
      this.legR.rotation.x = 0;
      this.armL.rotation.x = 0;
      this.armR.rotation.x = 0;
      const br = 1 + Math.sin(this.t * 2.2) * 0.02;
      b.scale.set(1, br, 1);
      return;
    }
    b.scale.set(1, 1, 1);
    if (this.pose === 'sit') {
      b.position.y = -0.3;
      this.legL.rotation.x = -1.35;
      this.legR.rotation.x = -1.35;
      this.armL.rotation.x = -0.3;
      this.armR.rotation.x = -0.3;
      return;
    }
    const walking = speed > 0.2;
    if (walking) {
      this.phase += dt * (3.2 + speed * 1.55);
      const a = Math.min(1, speed / 3);
      const s = Math.sin(this.phase);
      this.legL.rotation.x = s * 0.75 * a;
      this.legR.rotation.x = -s * 0.75 * a;
      b.position.y = Math.abs(Math.cos(this.phase)) * 0.06 * a;
      b.rotation.z = Math.sin(this.phase) * 0.03 * a;
      if (!this.carrying) {
        this.armL.rotation.x = -s * 0.6 * a;
        this.armR.rotation.x = s * 0.6 * a;
      }
    } else {
      this.legL.rotation.x *= 0.8;
      this.legR.rotation.x *= 0.8;
      b.position.y = Math.sin(this.t * 2.4) * 0.012;
      if (!this.carrying) {
        this.armL.rotation.x *= 0.8;
        this.armR.rotation.x *= 0.8;
      }
    }
    if (this.carrying) {
      this.armL.rotation.x = -1.25;
      this.armR.rotation.x = -1.25;
    }
    if (this.pose === 'work') {
      this.armR.rotation.x = -0.9 + Math.sin(this.t * 13) * 0.55;
      this.armL.rotation.x = -0.5 + Math.cos(this.t * 13) * 0.3;
      b.rotation.x = 0.12;
      b.position.y = Math.abs(Math.sin(this.t * 6.5)) * 0.04;
    } else if (this.pose === 'wave') {
      this.armR.rotation.x = -2.6;
      this.armR.rotation.z = -0.3 + Math.sin(this.t * 10) * 0.35;
    } else {
      this.armR.rotation.z = -0.12;
    }
    if (this.bounce > 0) {
      this.bounce = Math.max(0, this.bounce - dt * 3.5);
      const k = Math.sin(this.bounce * Math.PI) * 0.18;
      b.scale.set(1 + k * 0.5, 1 - k, 1 + k * 0.5);
    }
  }

  dispose() {
    // nur eigene Geometrien freigeben – gehaltene Gegenstände teilen sich Cache-Geometrien
    for (const m of [this.legL, this.legR, this.armL, this.armR]) m.geometry.dispose();
    (this.body.children[0] as THREE.Mesh).geometry.dispose();
    if (this.tool instanceof THREE.Mesh) this.tool.geometry.dispose();
    this.root.removeFromParent();
  }
}

/** Werkzeug-Mopp für Reinigungskräfte */
export function makeMop(): THREE.Mesh {
  const b = new GeoBuilder();
  b.cyl(0.03, 0.03, 1.1, 0xb98a55, 0, -0.55, 0, 6);
  b.rbox(0.36, 0.1, 0.16, 0.04, 0x4fb3ff, 0, -0.62, 0);
  const m = new THREE.Mesh(b.build(), vcMaterial);
  m.rotation.x = 0.5;
  return m;
}
