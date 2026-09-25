import * as THREE from 'three';
import { GeoBuilder, WallBuilder, floorGeometry, vcMaterial } from './geo';
import { Collision, type AABB } from './collision';
import { Materials } from './materials';
import * as PR from './props';
import { C, tierColors } from '../config/palette';
import { CELL, DOOR_U, DOOR_W, ROWS, WALL_H, ZONES, cellCenter } from '../config/floorplan';
import { ROOM, WC } from '../config/layout';

export type CellKind = 'room' | 'wc';
export type CellVisual = 'locked' | 'unbuilt' | 'built';

const IN = CELL / 2 - 0.25; // 3.5 Innenmaß
const HALF = CELL / 2;
/** Wandhöhe der Wände, die zur Kamera zeigen (Einblick ins Zimmer) */
export const NEAR_H = 1.1;

/**
 * Darstellung einer Zelle (Zimmer oder WC). Die Gruppe liegt im Zellmittelpunkt
 * und ist bei Reihen mit Tür nach hinten in z gespiegelt – so gilt für alle
 * Zellen dasselbe lokale Layout (v zeigt zur Tür).
 */
export class CellView {
  group = new THREE.Group();
  private content = new THREE.Group();
  private colliders: AABB[] = [];
  darkness: THREE.Mesh | null = null;
  dirt: THREE.Object3D[] = [];
  private popT = 1;
  visual: CellVisual = 'locked';
  tier = 0;
  design = 0;
  readonly out: 1 | -1;
  readonly cx: number;
  readonly cz: number;
  wcPaper: THREE.Group | null = null;
  stallDoors: THREE.Mesh[] = [];

  constructor(
    public zone: number,
    public index: number,
    public kind: CellKind,
    private mat: Materials,
    private col: Collision,
    parent: THREE.Object3D,
  ) {
    const c = cellCenter(zone, index);
    this.cx = c.x;
    this.cz = c.z;
    this.out = ROWS[ZONES[zone].row].doorSide;
    this.group.position.set(c.x, 0, c.z);
    this.group.scale.z = this.out;
    this.group.add(this.content);
    parent.add(this.group);
  }

  /** lokale (u, v) → Welt */
  w(u: number, v: number) {
    return { x: this.cx + u, z: this.cz + v * this.out };
  }

  private addCol(u0: number, u1: number, v0: number, v1: number) {
    const a = this.w(u0, v0);
    const b = this.w(u1, v1);
    this.colliders.push(this.col.add({ x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) }));
  }

  private clear() {
    for (const c of this.colliders) this.col.remove(c);
    this.colliders = [];
    this.content.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (o.geometry !== this.paperMesh) o.geometry.dispose();
      // eigene (nicht geteilte) Materialien: Dunkelheit, Kabinentüren
      if (o === this.darkness || this.stallDoors.includes(o)) (o.material as THREE.Material).dispose();
    });
    this.content.clear();
    this.darkness = null;
    this.dirt = [];
    this.wcPaper = null;
    this.stallDoors = [];
  }

  set(visual: CellVisual, tier = 0, design = 0, animate = false) {
    this.clear();
    this.visual = visual;
    this.tier = tier;
    this.design = design;
    if (visual === 'locked') {
      this.content.add(new THREE.Mesh(floorGeometry(-HALF, HALF, -HALF, HALF, CELL, 0.002), this.mat.floor.foundation));
    } else if (visual === 'unbuilt') {
      this.content.add(new THREE.Mesh(floorGeometry(-HALF, HALF, -HALF, HALF, CELL, 0.002), this.mat.floor.foundation));
      const b = new GeoBuilder();
      const L = IN - 0.25;
      for (let i = -L; i < L; i += 0.9) {
        b.quad(0.5, 0.1, 0xf4f7fb, i + 0.25, 0.01, -L);
        b.quad(0.5, 0.1, 0xf4f7fb, i + 0.25, 0.01, L);
        b.quad(0.1, 0.5, 0xf4f7fb, -L, 0.01, i + 0.25);
        b.quad(0.1, 0.5, 0xf4f7fb, L, 0.01, i + 0.25);
      }
      this.content.add(new THREE.Mesh(b.build(), vcMaterial));
    } else if (this.kind === 'room') {
      this.buildRoom(tier, design);
    } else {
      this.buildWC();
    }
    if (animate) this.popT = 0;
  }

  private walls(color: number, capColor: number, doorU: number, doorW: number) {
    const wb = new WallBuilder(WALL_H);
    const t = 0.25;
    const e = HALF - t / 2; // Wandmitte 3,625
    // Sichtbarkeit: Welt-Normale · Kamerarichtung (vorn rechts)
    const nearFront = this.out === 1;
    const hFront = nearFront ? NEAR_H : WALL_H;
    const hBack = nearFront ? WALL_H : NEAR_H;
    // Rückwand (v = -e)
    wb.seg(-HALF, -e, HALF, -e, t, color, capColor, hBack);
    // Front mit Türöffnung
    const d0 = doorU - doorW / 2;
    const d1 = doorU + doorW / 2;
    wb.seg(-HALF, e, d0, e, t, color, capColor, hFront);
    wb.seg(d1, e, HALF, e, t, color, capColor, hFront);
    // Türsturz nur bei hohen Wänden
    if (hFront > 1.5) wb.seg(d0, e, d1, e, t, color, capColor, 0.35, hFront - 0.35);
    // Links (fern) / rechts (nah)
    wb.seg(-e, -IN, -e, IN, t, color, capColor, WALL_H);
    wb.seg(e, -IN, e, IN, t, color, capColor, NEAR_H + 0.25);
    this.addCol(-HALF, HALF, -HALF, -IN);
    this.addCol(-HALF, d0, IN, HALF);
    this.addCol(d1, HALF, IN, HALF);
    this.addCol(-HALF, -IN, -IN, IN);
    this.addCol(IN, HALF, -IN, IN);
    const sides = wb.buildSides();
    if (sides) this.content.add(new THREE.Mesh(sides, this.mat.wall));
    this.content.add(new THREE.Mesh(wb.caps.build(), vcMaterial));
    // Türschwelle
    const fr = new GeoBuilder();
    fr.quad(doorW, 0.5, C.doorFrame, doorU, 0.012, e);
    this.content.add(new THREE.Mesh(fr.build(), vcMaterial));
  }

  private buildRoom(tier: number, design: number) {
    const tc = tierColors(tier, design);
    this.content.add(new THREE.Mesh(floorGeometry(-HALF, HALF, -HALF, HALF, tier >= 3 ? 2.5 : 3.0, 0.002), this.mat.roomFloor(tier, design)));
    this.walls(tc.wall, C.wallCap, DOOR_U, DOOR_W);
    const b = new GeoBuilder();
    const deluxe = design === 2;
    // Teppich unter dem Bett
    b.group((g) => PR.rug(g, ROOM.rug.w, ROOM.rug.d, tc.rug, tier >= 2 ? C.deskTop : undefined), ROOM.rug.u, 0, ROOM.rug.v);
    b.group((g) => PR.bed(g, tc.bedFrame, tc.blanket, deluxe || tier >= 3), ROOM.bed.u, 0, ROOM.bed.v, Math.PI / 2);
    this.addCol(ROOM.bed.u - 1.55, ROOM.bed.u + 1.5, ROOM.bed.v - 1.05, ROOM.bed.v + 1.05);
    b.group((g) => PR.nightstand(g, tc.night), ROOM.night.u, 0, ROOM.night.v, Math.PI / 2);
    this.addCol(ROOM.night.u - 0.4, ROOM.night.u + 0.4, ROOM.night.v - 0.45, ROOM.night.v + 0.45);
    b.group((g) => PR.picture(g, tier >= 2 ? C.deluxePink : C.picture, 1.3, 0.9), ROOM.picture.u, 0.9, ROOM.picture.v, Math.PI / 2);
    if (tier === 1) {
      // Stufe 1: kleiner Tisch + Hocker
      b.rbox(1.0, 0.7, 0.7, 0.08, tc.night, ROOM.dresser.u - 0.1, 0, ROOM.dresser.v, { ry: Math.PI / 2 });
      b.cyl(0.26, 0.26, 0.45, tc.bedFrame, ROOM.dresser.u - 1.0, 0, ROOM.dresser.v, 10);
      this.addCol(ROOM.dresser.u - 0.55, ROOM.dresser.u + 0.4, ROOM.dresser.v - 0.5, ROOM.dresser.v + 0.5);
    } else {
      b.group((g) => PR.dresser(g, tc.night), ROOM.dresser.u, 0, ROOM.dresser.v, -Math.PI / 2);
      this.addCol(ROOM.dresser.u - 0.35, ROOM.dresser.u + 0.35, ROOM.dresser.v - 0.82, ROOM.dresser.v + 0.82);
      b.group((g) => PR.plant(g, 1.0), ROOM.plant.u, 0, ROOM.plant.v);
      this.addCol(ROOM.plant.u - 0.35, ROOM.plant.u + 0.35, ROOM.plant.v - 0.35, ROOM.plant.v + 0.35);
    }
    if (tier >= 3) {
      b.group((g) => PR.tv(g), ROOM.dresser.u - 0.05, 0.85, ROOM.dresser.v, -Math.PI / 2);
      b.group((g) => PR.armchair(g, tc.blanket, tc.rug), ROOM.armchair.u, 0, ROOM.armchair.v, -0.3);
      this.addCol(ROOM.armchair.u - 0.55, ROOM.armchair.u + 0.55, ROOM.armchair.v - 0.5, ROOM.armchair.v + 0.5);
    }
    if (deluxe || tier >= 3) {
      b.group((g) => PR.lampFloor(g), ROOM.lamp.u, 0, ROOM.lamp.v);
      this.addCol(ROOM.lamp.u - 0.3, ROOM.lamp.u + 0.3, ROOM.lamp.v - 0.3, ROOM.lamp.v + 0.3);
    }
    if (deluxe) {
      b.group((g) => PR.palm(g, 0.9), -3.0, 0, 3.0);
      b.group((g) => PR.roundRug(g, 0.9, C.deluxePurple, C.deluxeGold), 0.6, 0, 1.3);
    }
    this.content.add(new THREE.Mesh(b.build(), vcMaterial));

    // Schmutzmarker (einzeln schaltbar)
    this.dirt = ROOM.spots.map((s, i) => {
      const g = new GeoBuilder();
      if (i === 0) {
        // zerwühlte Laken
        g.sphere(0.42, C.dirtSheet, 0, 0.1, 0, 8, { sy: 0.45 });
        g.sphere(0.3, 0xcfc6b2, 0.35, 0.1, 0.25, 7, { sy: 0.5 });
        g.sphere(0.26, 0xe6dfcf, -0.3, 0.12, -0.2, 7, { sy: 0.5 });
        g.rbox(0.5, 0.06, 0.3, 0.03, tc.blanket, 0.2, 0.2, -0.45, { ry: 0.7 });
      } else if (i === 1) {
        // Müll: Papierknäuel + Bananenschale + Dose
        g.sphere(0.16, 0xe8e4da, 0, 0.14, 0, 6);
        g.sphere(0.13, 0xd9d4c6, 0.28, 0.12, 0.18, 6);
        g.sphere(0.12, 0xe8e4da, -0.25, 0.1, 0.2, 6);
        g.rbox(0.45, 0.06, 0.14, 0.05, C.banana, 0.05, 0.02, -0.3, { ry: 0.5 });
        g.cyl(0.08, 0.08, 0.22, 0xe84a5f, -0.3, 0.02, -0.15, 8, { rz: Math.PI / 2 });
      } else {
        // Fleck
        g.disc(0.55, C.dirtStain, 0, 0.012, 0, 16);
        g.disc(0.3, 0x74582c, 0.35, 0.016, 0.2, 12);
        g.sphere(0.08, 0x8a6a3a, -0.2, 0.05, -0.1, 5);
      }
      const m = new THREE.Mesh(g.build(), vcMaterial);
      m.position.set(s.u, s.y, s.v);
      m.visible = false;
      this.content.add(m);
      return m;
    });

    // Dunkelheit für die Nachtphase
    const dk = new THREE.Mesh(new THREE.BoxGeometry(IN * 2, WALL_H + 0.1, IN * 2), this.mat.dark.clone());
    dk.position.y = (WALL_H + 0.1) / 2 + 0.01;
    dk.visible = false;
    dk.renderOrder = 5;
    this.content.add(dk);
    this.darkness = dk;
  }

  private buildWC() {
    this.content.add(new THREE.Mesh(floorGeometry(-HALF, HALF, -HALF, HALF, 2.5, 0.002), this.mat.floor.wc));
    this.walls(C.wcWall, C.wallCap, WC.doorU, WC.doorW);
    const b = new GeoBuilder();
    for (const u of WC.stalls) {
      b.group((g) => PR.toilet(g), u, 0, WC.toiletV);
      // Klopapierhalter
      b.box(0.1, 0.1, 0.2, 0xb8c2d0, u + 0.7, 0.75, -3.35);
    }
    for (const u of WC.partitions) {
      b.rbox(0.14, 1.45, 2.3, 0.04, C.wcStall, u, 0, -2.35);
      b.box(0.2, 0.1, 2.3, 0xff8a7a, u, 1.45, -2.35);
    }
    for (const s of WC.sinks) b.group((g) => PR.sink(g), s.u, 0, s.v, Math.PI / 2);
    for (const s of WC.sinks) this.addCol(s.u - 0.35, s.u + 0.45, s.v - 0.48, s.v + 0.48);
    for (const u of WC.partitions) this.addCol(u - 0.1, u + 0.1, -3.5, -1.2);
    // Papierstation (Nachfüllpunkt)
    b.rbox(1.0, 0.7, 0.8, 0.06, 0x3a7bf0, WC.paper.u + 0.35, 0, WC.paper.v);
    this.addCol(WC.paper.u - 0.15, WC.paper.u + 0.85, WC.paper.v - 0.4, WC.paper.v + 0.4);
    b.group((g) => PR.plant(g, 0.8), 3.0, 0, 3.0);
    this.content.add(new THREE.Mesh(b.build(), vcMaterial));
    // Papierrollen auf der Station (Anzeige des Vorrats)
    this.wcPaper = new THREE.Group();
    this.wcPaper.position.set(WC.paper.u + 0.35, 0.7, WC.paper.v);
    this.content.add(this.wcPaper);
    // Kabinentüren (schwingen auf)
    for (const u of WC.stalls) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.05, 0.08), new THREE.MeshLambertMaterial({ color: 0xff8a3d }));
      d.geometry.translate(0.5, 0.52, 0);
      d.position.set(u - 0.55, 0.28, -1.22);
      d.rotation.y = -1.4;
      this.stallDoors.push(d);
      this.content.add(d);
    }
  }

  private paperMesh: THREE.BufferGeometry | null = null;
  setPaperStock(n: number) {
    if (!this.wcPaper) return;
    if (!this.paperMesh) {
      const g = new GeoBuilder();
      PR.paperRoll(g, 0, 0, 0);
      this.paperMesh = g.build();
    }
    const want = Math.min(9, n);
    while (this.wcPaper.children.length > want) this.wcPaper.remove(this.wcPaper.children[this.wcPaper.children.length - 1]);
    while (this.wcPaper.children.length < want) {
      const i = this.wcPaper.children.length;
      const m = new THREE.Mesh(this.paperMesh, vcMaterial);
      m.position.set(-0.3 + (i % 3) * 0.3, Math.floor(i / 3) * 0.27, 0.0 + ((i % 2) - 0.5) * 0.12);
      this.wcPaper.add(m);
    }
  }

  setStallOpen(i: number, open: boolean) {
    const d = this.stallDoors[i];
    if (d) d.userData.target = open ? -1.4 : 0;
  }

  setDirty(i: number, on: boolean) {
    const d = this.dirt[i];
    if (d) d.visible = on;
  }

  setNight(a: number) {
    if (!this.darkness) return;
    this.darkness.visible = a > 0.01;
    (this.darkness.material as THREE.MeshBasicMaterial).opacity = a * 0.62;
  }

  update(dt: number) {
    if (this.popT < 1) {
      this.popT = Math.min(1, this.popT + dt * 2.2);
      const t = this.popT;
      // elastisches Ausschwingen
      const s = t === 1 ? 1 : 1 - Math.pow(2, -9 * t) * Math.cos(t * 11);
      this.content.scale.set(1, Math.max(0.02, s), 1);
    }
    for (const d of this.stallDoors) {
      const target = (d.userData.target as number | undefined) ?? -1.4;
      d.rotation.y += (target - d.rotation.y) * Math.min(1, dt * 8);
    }
  }
}
