import * as THREE from 'three';
import { GeoBuilder, vcMaterial } from '../world/geo';
import * as PR from '../world/props';
import { C } from '../config/palette';

/** Tragbare Gegenstände und Boden-Pickups. */

export type ItemType = 'roll' | 'champagne' | 'flowers' | 'towel' | 'coffee' | 'luggage';
export type PickupType = 'candy' | 'toiletpaper' | 'scooter' | 'luggage';

const geoCache = new Map<string, THREE.BufferGeometry>();

function geo(key: string, fn: (g: GeoBuilder) => void): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    const b = new GeoBuilder();
    fn(b);
    g = b.build();
    geoCache.set(key, g);
  }
  return g;
}

/** Höhe eines Gegenstands im Stapel */
export const ITEM_H: Record<ItemType, number> = {
  roll: 0.27,
  champagne: 0.62,
  flowers: 0.6,
  towel: 0.2,
  coffee: 0.3,
  luggage: 0.78,
};

export function itemMesh(t: ItemType): THREE.Mesh {
  const g = geo('item:' + t, (b) => {
    switch (t) {
      case 'roll':
        PR.paperRoll(b, 0, 0, 0);
        break;
      case 'champagne':
        b.cyl(0.11, 0.12, 0.4, 0x2e8b3a, 0, 0, 0, 10);
        b.cyl(0.05, 0.1, 0.12, 0x2e8b3a, 0, 0.4, 0, 8);
        b.cyl(0.05, 0.05, 0.1, 0xffc42e, 0, 0.52, 0, 8);
        b.cyl(0.115, 0.115, 0.12, 0xfff3a8, 0, 0.14, 0, 10);
        break;
      case 'flowers':
        b.cone(0.16, 0.36, 0x46c97a, 0, 0, 0, 8, { rx: Math.PI });
        b.cone(0.16, 0.36, 0x46c97a, 0, 0.36, 0, 8, { rx: Math.PI });
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          b.sphere(0.09, [0xff5fa8, 0xffd23a, 0xb57bff, 0xff7a3d, 0xffffff][i], Math.cos(a) * 0.1, 0.44, Math.sin(a) * 0.1, 6);
        }
        break;
      case 'towel':
        b.rbox(0.5, 0.18, 0.36, 0.06, 0x39a9ff, 0, 0, 0);
        b.box(0.52, 0.04, 0.37, 0x8fd3ff, 0, 0.07, 0);
        break;
      case 'coffee':
        b.cyl(0.13, 0.1, 0.24, 0xffffff, 0, 0, 0, 10);
        b.cyl(0.11, 0.11, 0.02, 0x8a4b2a, 0, 0.23, 0, 10);
        b.torus(0.06, 0.02, 0xffffff, 0.14, 0.12, 0);
        break;
      case 'luggage':
        PR.suitcase(b);
        break;
    }
  });
  const m = new THREE.Mesh(g, vcMaterial);
  return m;
}

export function pickupMesh(t: PickupType): THREE.Object3D {
  const g = geo('pickup:' + t, (b) => {
    switch (t) {
      case 'candy':
        b.sphere(0.24, 0xff5fa8, 0, 0, 0, 10);
        b.cone(0.16, 0.2, 0xff8fc4, -0.3, 0, 0, 6, { rz: -Math.PI / 2 });
        b.cone(0.16, 0.2, 0xff8fc4, 0.3, 0, 0, 6, { rz: Math.PI / 2 });
        b.torus(0.2, 0.03, 0xffd3e8, 0, 0, 0, { ry: Math.PI / 2 });
        break;
      case 'toiletpaper':
        b.rbox(0.56, 0.26, 0.36, 0.1, 0x5fd0ff, 0, -0.13, 0);
        b.sphere(0.08, 0xe6f8ff, 0.2, 0.18, 0.05, 6);
        b.sphere(0.06, 0xe6f8ff, 0.06, 0.24, -0.05, 6);
        break;
      case 'scooter':
        b.rbox(1.3, 0.12, 0.4, 0.05, 0x9b4dff, 0, 0.18, 0);
        b.cyl(0.05, 0.05, 1.0, 0x9b4dff, 0.55, 0.2, 0, 6, { rz: 0.25 });
        b.box(0.06, 0.06, 0.6, 0x2b1457, 0.8, 1.15, 0);
        for (const x of [-0.5, 0.55]) b.cyl(0.18, 0.18, 0.1, 0x2b1457, x, 0.18, 0, 12, { rx: Math.PI / 2 });
        b.sphere(0.14, 0xff5fa8, -0.1, 0.36, 0, 8);
        break;
      case 'luggage':
        PR.suitcase(b, 0xff5fa8);
        break;
    }
  });
  const m = new THREE.Mesh(g, vcMaterial);
  const grp = new THREE.Group();
  grp.add(m);
  // Leuchtring am Boden
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.6, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: t === 'scooter' ? 0x39a9ff : t === 'candy' ? 0xff5fa8 : 0x5fd0ff, transparent: true, opacity: 0.7 }),
  );
  ring.position.y = 0.03;
  grp.add(ring);
  return grp;
}

/** Stapel im Arm einer Figur anzeigen */
export function syncHeld(hold: THREE.Group, items: ItemType[]) {
  const cur = hold.userData.items as ItemType[] | undefined;
  if (cur && cur.length === items.length && cur.every((v, i) => v === items[i])) return;
  hold.clear();
  let y = 0;
  for (const it of items) {
    const m = itemMesh(it);
    m.position.y = y;
    if (it === 'luggage') m.position.z = 0.08;
    hold.add(m);
    y += ITEM_H[it];
  }
  hold.userData.items = [...items];
}

export const ITEM_ICON: Record<ItemType, string> = {
  roll: 'paper',
  champagne: 'champagne',
  flowers: 'flowers',
  towel: 'towel',
  coffee: 'coffee',
  luggage: 'luggage',
};

void C;
