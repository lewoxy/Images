import * as THREE from 'three';
import { GeoBuilder, Walls, floorGeometry, vcMaterial, type WallFace } from './geo';
import { Collision, type AABB } from './collision';
import { Materials } from './materials';
import { setOpacity } from './cel';
import * as PR from './props';
import * as TX from './textures';
import { C, STYLE, tierColors, type TierColors } from '../config/palette';
import { CELL, DIR_ANGLE, DOOR_H, DOOR_U, DOOR_W, WALL_H, WALL_HALF, areaAt, cellDef, colX, rowZ, type CellDef, type Dir } from '../config/floorplan';
import { IN, ROOM, WC } from '../config/layout';

export type CellKind = 'room' | 'wc';
export type CellVisual = 'locked' | 'unbuilt' | 'built';

const HALF = CELL / 2; // 3,75
const T = WALL_HALF; // 0,15 – jede Zelle trägt ihre Wandhälfte
const E = HALF - T / 2; // Wandmitte
type Side = 'front' | 'back' | 'left' | 'right';

/**
 * Darstellung einer Zelle (Zimmer oder WC). Die Gruppe liegt im Zellmittelpunkt
 * und ist so gedreht, dass lokales +z (v) zur Tür zeigt – so gilt für alle
 * Zellen dasselbe Einrichtungslayout. Die Wände stehen immer (3,0 m); gesperrte
 * Zellen haben eine geschlossene Tür.
 */
export class CellView {
  group = new THREE.Group();
  private shell = new THREE.Group();
  private content = new THREE.Group();
  private shellCols: AABB[] = [];
  private colliders: AABB[] = [];
  darkness: THREE.Mesh | null = null;
  dirt: THREE.Object3D[] = [];
  private popT = 1;
  visual: CellVisual = 'locked';
  tier = 0;
  design = 0;
  readonly def: CellDef;
  readonly angle: number;
  readonly cx: number;
  readonly cz: number;
  wcPaper: THREE.Group | null = null;
  stallDoors: THREE.Mesh[] = [];
  door: THREE.Mesh;
  private doorTarget = 0;
  private doorCol: AABB | null = null;

  constructor(
    public zone: number,
    public index: number,
    public kind: CellKind,
    private mat: Materials,
    private col: Collision,
    parent: THREE.Object3D,
  ) {
    this.def = cellDef(zone, index);
    this.cx = colX(this.def.col);
    this.cz = rowZ(this.def.row);
    this.angle = DIR_ANGLE[this.def.door];
    this.group.position.set(this.cx, 0, this.cz);
    this.group.rotation.y = this.angle;
    this.group.add(this.shell, this.content);
    // Tür (Leitfarbe), Scharnier an der rechten Laibung
    const dg = new THREE.BoxGeometry(DOOR_W - 0.08, DOOR_H - 0.04, 0.08);
    dg.translate(-(DOOR_W - 0.08) / 2, (DOOR_H - 0.04) / 2, 0);
    this.door = new THREE.Mesh(dg, mat.door);
    const du = this.doorU();
    this.door.position.set(du + DOOR_W / 2 - 0.04, 0, E);
    this.group.add(this.door);
    parent.add(this.group);
  }

  private doorU() {
    return this.kind === 'wc' ? WC.doorU : DOOR_U;
  }

  /** lokale (u, v) → Welt */
  w(u: number, v: number) {
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    return { x: this.cx + u * c + v * s, z: this.cz - u * s + v * c };
  }

  /** Blickrichtung (Weltwinkel um y) für lokales +z */
  get facing() {
    return this.angle;
  }

  private sideDir(side: Side): Dir {
    const lv = side === 'front' ? [0, 1] : side === 'back' ? [0, -1] : side === 'left' ? [-1, 0] : [1, 0];
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    const x = Math.round(lv[0] * c + lv[1] * s);
    const z = Math.round(-lv[0] * s + lv[1] * c);
    return x === 1 ? 'E' : x === -1 ? 'W' : z === 1 ? 'S' : 'N';
  }

  /** Außenseite einer Wand je nach Nachbarfläche (verdeckte Seiten entfallen) */
  private outer(side: Side): WallFace | null {
    const d = this.sideDir(side);
    const dc = d === 'E' ? 1 : d === 'W' ? -1 : 0;
    const dr = d === 'S' ? 1 : d === 'N' ? -1 : 0;
    const a = areaAt(this.def.col + dc, this.def.row + dr);
    if (a === 'cell' || a === 'elevator') return null;
    return { mat: a === 'hall' ? 'hall' : a === 'lobby' ? 'lobby' : a === 'court' ? 'court' : 'facade' };
  }

  private addColTo(list: AABB[], u0: number, u1: number, v0: number, v1: number) {
    const a = this.w(u0, v0);
    const b = this.w(u1, v1);
    const c = this.col.add({ x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) });
    list.push(c);
    return c;
  }

  private addCol(u0: number, u1: number, v0: number, v1: number) {
    return this.addColTo(this.colliders, u0, u1, v0, v1);
  }

  private clearGroup(g: THREE.Group, keep: THREE.BufferGeometry | null = null) {
    g.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (o.geometry !== keep) o.geometry.dispose();
      if (o === this.darkness) (o.material as THREE.Material).dispose();
    });
    g.clear();
  }

  private clear() {
    for (const c of this.colliders) this.col.remove(c);
    this.colliders = [];
    this.clearGroup(this.content, this.paperMesh);
    this.darkness = null;
    this.dirt = [];
    this.wcPaper = null;
    this.stallDoors = [];
  }

  /** Wände mit Türöffnung; Innenseite je nach Zustand/Stufe */
  private buildShell(innerKey: string) {
    for (const c of this.shellCols) this.col.remove(c);
    this.shellCols = [];
    this.clearGroup(this.shell);
    const wl = new Walls(WALL_H);
    const inner: WallFace = { mat: innerKey };
    const cap = C.wallCap;
    const du = this.doorU();
    const d0 = du - DOOR_W / 2;
    const d1 = du + DOOR_W / 2;
    wl.seg(-HALF, -E, HALF, -E, T, this.outer('back'), inner, cap);
    wl.seg(-HALF, E, d0, E, T, inner, this.outer('front'), cap);
    wl.seg(d1, E, HALF, E, T, inner, this.outer('front'), cap);
    wl.seg(d0, E, d1, E, T, inner, this.outer('front'), cap, WALL_H - DOOR_H, DOOR_H);
    wl.seg(-E, -HALF + T, -E, HALF - T, T, this.outer('left'), inner, cap);
    wl.seg(E, -HALF + T, E, HALF - T, T, inner, this.outer('right'), cap);
    for (const m of wl.build(this.mat.wallMat)) this.shell.add(m);
    // Türrahmen in Leitfarbe (beidseitig)
    const fr = new GeoBuilder();
    for (const s of [-1, 1]) {
      fr.box(0.14, DOOR_H + 0.08, T + 0.12, C.doorFrame, s < 0 ? d0 + 0.07 : d1 - 0.07, 0, E);
    }
    fr.box(DOOR_W, 0.14, T + 0.12, C.doorFrame, du, DOOR_H - 0.06, E);
    fr.box(DOOR_W - 0.1, 0.02, 0.5, C.doorFrame, du, 0, E);
    this.shell.add(new THREE.Mesh(fr.build(), vcMaterial));
    const L = this.shellCols;
    this.addColTo(L, -HALF, HALF, -HALF, -IN);
    this.addColTo(L, -HALF, d0, IN, HALF);
    this.addColTo(L, d1, HALF, IN, HALF);
    this.addColTo(L, -HALF, -IN, -IN, IN);
    this.addColTo(L, IN, HALF, -IN, IN);
  }

  private setDoor(open: boolean) {
    this.doorTarget = open ? -Math.PI / 2 + 0.08 : 0;
    if (this.doorCol) {
      this.col.remove(this.doorCol);
      this.doorCol = null;
    }
    if (!open) {
      const du = this.doorU();
      this.doorCol = this.addColTo(this.shellCols, du - DOOR_W / 2, du + DOOR_W / 2, IN - 0.1, HALF);
    }
  }

  set(visual: CellVisual, tier = 0, design = 0, animate = false) {
    this.clear();
    const changedShell = this.visual !== visual || this.tier !== tier || this.design !== design || this.shell.children.length === 0;
    this.visual = visual;
    this.tier = tier;
    this.design = design;
    const innerKey = visual !== 'built' ? 'bare' : this.kind === 'wc' ? 'wc' : this.mat.roomWallKey(tier, design);
    if (changedShell) this.buildShell(innerKey);
    this.setDoor(visual !== 'locked');
    if (visual === 'locked' || visual === 'unbuilt') {
      this.content.add(new THREE.Mesh(floorGeometry(-IN, IN, -IN, IN, CELL / 2, 0.003), this.mat.floor.foundation));
      if (visual === 'unbuilt') {
        const b = new GeoBuilder();
        const L = IN - 0.35;
        for (let i = -L; i < L; i += 0.9) {
          b.quad(0.5, 0.1, 0xf9faf7, i + 0.25, 0.012, -L);
          b.quad(0.5, 0.1, 0xf9faf7, i + 0.25, 0.012, L);
          b.quad(0.1, 0.5, 0xf9faf7, -L, 0.012, i + 0.25);
          b.quad(0.1, 0.5, 0xf9faf7, L, 0.012, i + 0.25);
        }
        b.group((g) => PR.trafficCone(g), -IN + 0.5, 0, -IN + 0.5);
        b.group((g) => PR.boxStack(g), IN - 0.7, 0, -IN + 0.7, 0.4);
        this.content.add(new THREE.Mesh(b.build(), vcMaterial));
      }
    } else if (this.kind === 'room') {
      this.buildRoom(tier, design);
    } else {
      this.buildWC();
    }
    if (animate) this.popT = 0;
  }

  // ---------------------------------------------------------------- Texturteile
  private texBox(w: number, h: number, d: number, mat: THREE.Material, u: number, y: number, v: number, ry = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    const m = new THREE.Mesh(g, mat);
    m.position.set(u, y, v);
    m.rotation.y = ry;
    this.content.add(m);
    return m;
  }

  private texPlane(w: number, d: number, mat: THREE.Material, u: number, y: number, v: number, vertical = false, ry = 0) {
    const g = new THREE.PlaneGeometry(w, d);
    if (!vertical) g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat);
    m.position.set(u, y, v);
    m.rotation.y = ry;
    this.content.add(m);
    return m;
  }

  private blanketMat(tc: TierColors) {
    const key = `bl${tc.pattern}${tc.blanket}${tc.blanketB}`;
    return this.mat.textured(key, () =>
      tc.pattern === 'stripes' ? TX.stripes(tc.blanket, tc.blanketB, 4) : tc.pattern === 'diamonds' ? TX.diamonds(tc.blanket, tc.blanketB) : TX.blossomFabric(tc.blanket, tc.blanketB),
    );
  }

  private curtainMat(tc: TierColors, tier: number) {
    const key = `cu${tier}${tc.curtain}${tc.curtainB}`;
    return this.mat.textured(key, () => (tier >= 3 ? TX.blossomFabric(tc.curtain, tc.curtainB) : TX.stripes(tc.curtain, tc.curtainB, 3)));
  }

  // ---------------------------------------------------------------- Zimmer
  private buildRoom(tier: number, design: number) {
    const tc = tierColors(tier, design);
    const deluxe = design === 2;
    this.content.add(new THREE.Mesh(floorGeometry(-IN, IN, -IN, IN, tier === 2 ? 3.0 : 2.4, 0.003), this.mat.roomFloor(tier, design)));
    const b = new GeoBuilder();
    const bd = ROOM.bed;

    // Teppich (Band-Textur) vor dem Bett
    this.texPlane(ROOM.rug.w, ROOM.rug.d, this.mat.textured(`rug${tc.rug}${tc.rugB}${tc.accent}`, () => TX.rugBanner(tc.rug, tc.rugB, tc.accent)), ROOM.rug.u, 0.02, ROOM.rug.v);

    // Bett
    if (tier >= 3) {
      b.group((g) => PR.roundBed(g, tc.bedFrame, tc.accent, tc.pillow), bd.u, 0, bd.v + 0.25);
      const top = new THREE.CylinderGeometry(PR.ROUND_BED.r - 0.12, PR.ROUND_BED.r - 0.08, 0.14, 24);
      top.translate(0, 0.07, 0);
      const m = new THREE.Mesh(top, this.blanketMat(tc));
      m.position.set(bd.u, 0.6, bd.v + 0.25);
      this.content.add(m);
      this.addCol(bd.u - 1.6, bd.u + 1.6, -IN, bd.v + 1.8);
    } else {
      b.group((g) => PR.bed(g, tc.bedFrame, tc.pillow, tier >= 2, deluxe ? STYLE.gold : undefined), bd.u, 0, bd.v);
      this.texBox(PR.BED.w - 0.06, 0.14, PR.BED.blanketL, this.blanketMat(tc), bd.u, PR.BED.top - 0.12, bd.v + PR.BED.blanketZ);
      this.addCol(bd.u - bd.w / 2, bd.u + bd.w / 2, -IN, bd.v + bd.l / 2);
    }

    // Nachttische mit Lampen, Wandleuchten ab Stufe 2
    const round = tier >= 3;
    for (const n of [ROOM.nightL, ROOM.nightR]) {
      b.group((g) => PR.nightstand(g, tc.night, true, tc.accent === STYLE.gold ? C.lampShade : tc.accent, round), n.u, 0, n.v);
      this.addCol(n.u - 0.55, n.u + 0.55, -IN, n.v + 0.35);
      if (tier >= 2) b.group((g) => PR.wallLamp(g, STYLE.gold, C.lampShade), n.u, 2.05, -IN);
    }

    // Fenster mit Vorhängen an der Rückwand
    const wu = ROOM.window.u;
    const ww = ROOM.window.w;
    b.group((g) => PR.windowFrame(g, ww, 1.3), wu, 1.0, -IN);
    const cm = this.curtainMat(tc, tier);
    for (const s of [-1, 1]) this.texBox(0.5, 2.45, 0.12, cm, wu + s * (ww / 2 + 0.12), 0.25, -IN + 0.16);
    this.texBox(ww + 1.1, 0.34, 0.16, cm, wu, 2.62, -IN + 0.14);

    // Kommode / Tisch an der rechten Wand
    const dr = ROOM.dresser;
    if (tier === 1) {
      b.group((g) => PR.smallTable(g, tc.night, C.t1Rug), dr.u - 0.25, 0, dr.v, -Math.PI / 2);
      this.addCol(dr.u - 0.9, IN, dr.v - 0.7, dr.v + 1.1);
    } else {
      b.group((g) => PR.dresser(g, tc.night), dr.u, 0, dr.v, -Math.PI / 2);
      this.addCol(dr.u - 0.4, IN, dr.v - 1.05, dr.v + 1.05);
    }
    if (tier >= 3) b.group((g) => PR.tv(g), dr.u - 0.1, 1.03, dr.v, -Math.PI / 2);

    // Uhr: Wanduhr (Stufe 1) oder Standuhr
    const ck = ROOM.clock;
    if (tier === 1) {
      b.group((g) => PR.wallClock(g, STYLE.lead), -IN, 2.15, 1.4, Math.PI / 2);
    } else {
      b.group((g) => PR.grandfatherClock(g, tc.night, STYLE.gold), ck.u, 0, ck.v, Math.PI / 2);
      this.addCol(ck.u - 0.35, ck.u + 0.35, ck.v - 0.45, IN);
    }

    // Bild an der linken Wand
    const pk = (this.zone * 3 + this.index + tier) % 3;
    b.group((g) => PR.pictureFrame(g, 1.1, 0.85, tier >= 3 ? STYLE.gold : C.doorFrame), -IN + 0.02, 1.5, ROOM.picture.v, Math.PI / 2);
    this.texPlane(1.1, 0.85, this.mat.textured('paint' + pk, () => TX.painting(pk)), -IN + 0.08, 1.5 + 0.425 - 0.08, ROOM.picture.v, true, Math.PI / 2);

    // Sessel ab Stufe 2
    if (tier >= 2) {
      b.group((g) => PR.armchair(g, tc.rug, tc.blanketB), ROOM.armchair.u, 0, ROOM.armchair.v, -Math.PI / 2 - 0.35);
      this.addCol(ROOM.armchair.u - 0.6, ROOM.armchair.u + 0.6, ROOM.armchair.v - 0.6, ROOM.armchair.v + 0.6);
    }
    if (deluxe) {
      b.group((g) => PR.roundRug(g, 0.85, STYLE.magenta, STYLE.gold), -2.7, 0, 2.3);
      b.group((g) => PR.lampFloor(g), 3.1, 0, 2.2);
      this.addCol(2.8, 3.4, 1.9, 2.5);
    }
    this.content.add(new THREE.Mesh(b.build(), vcMaterial));

    // Schmutzmarker (einzeln schaltbar)
    this.dirt = ROOM.spots.map((s, i) => {
      const g = new GeoBuilder();
      if (i === 0) {
        // zerwühlte Laken
        g.sphere(0.5, C.dirtSheet, 0, 0.1, 0, 7, { sy: 0.45 });
        g.sphere(0.36, 0xf9faf7, 0.42, 0.1, 0.3, 6, { sy: 0.5 });
        g.sphere(0.32, 0xe0d2b4, -0.36, 0.12, -0.24, 6, { sy: 0.5 });
        g.box(0.62, 0.06, 0.36, tc.blanket, 0.24, 0.2, -0.52, { ry: 0.7 });
      } else if (i === 1) {
        // Müll: Papierknäuel, Bananenschale, Dose
        g.sphere(0.2, 0xf9faf7, 0, 0.16, 0, 5);
        g.sphere(0.16, 0xe3f3f6, 0.34, 0.14, 0.22, 5);
        g.sphere(0.15, 0xf9faf7, -0.3, 0.12, 0.24, 5);
        g.box(0.55, 0.07, 0.17, C.banana, 0.06, 0.02, -0.36, { ry: 0.5 });
        g.cyl(0.1, 0.1, 0.27, STYLE.signalRed, -0.36, 0.02, -0.18, 8, { rz: Math.PI / 2 });
      } else {
        // Fleck
        g.disc(0.66, C.dirtStain, 0, 0.014, 0, 10);
        g.disc(0.36, 0xb89250, 0.42, 0.018, 0.24, 8);
        g.sphere(0.1, 0xa8804a, -0.24, 0.06, -0.12, 5);
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

  // ---------------------------------------------------------------- WC
  private buildWC() {
    this.content.add(new THREE.Mesh(floorGeometry(-IN, IN, -IN, IN, 2.0, 0.003), this.mat.floor.wc));
    const b = new GeoBuilder();
    for (const u of WC.stalls) {
      b.group((g) => PR.toilet(g), u, 0, WC.toiletV);
      b.box(0.12, 0.12, 0.22, PR.METAL, u + 0.75, 0.85, -IN + 0.1);
      b.group((g) => PR.paperRoll(g, 0, 0, 0, false), u + 0.75, 0.62, -IN + 0.2);
    }
    for (const u of WC.partitions) {
      b.box(0.14, 1.9, 2.4, C.wcStall, u, 0.12, -IN + 1.2);
      b.box(0.2, 0.1, 2.4, C.wcToiletSeat, u, 2.02, -IN + 1.2);
      b.box(0.1, 0.12, 0.1, PR.METAL, u, 0, -IN + 2.35);
    }
    for (const s of WC.sinks) b.group((g) => PR.sink(g), s.u, 0, s.v, Math.PI / 2);
    for (const s of WC.sinks) this.addCol(s.u - 0.45, s.u + 0.35, s.v - 0.55, s.v + 0.55);
    for (const u of WC.partitions) this.addCol(u - 0.1, u + 0.1, -IN, -1.15);
    // Papierstation (Nachfüllpunkt)
    b.box(1.1, 0.72, 0.9, STYLE.lead, WC.paper.u + 0.3, 0, WC.paper.v);
    b.box(1.16, 0.06, 0.96, STYLE.gold, WC.paper.u + 0.3, 0.72, WC.paper.v);
    this.addCol(WC.paper.u - 0.25, IN, WC.paper.v - 0.45, WC.paper.v + 0.45);
    b.group((g) => PR.plant(g, 0.8), 3.05, 0, 3.05);
    b.group((g) => PR.wallLamp(g, STYLE.gold, C.lampShade), 0, 2.3, -IN);
    this.content.add(new THREE.Mesh(b.build(), vcMaterial));
    // Papierrollen auf der Station (Anzeige des Vorrats)
    this.wcPaper = new THREE.Group();
    this.wcPaper.position.set(WC.paper.u + 0.3, 0.78, WC.paper.v);
    this.content.add(this.wcPaper);
    // Kabinentüren (schwingen auf)
    for (const u of WC.stalls) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.55, 0.08), this.mat.colored(0xd9a978));
      d.geometry.translate(0.55, 0.78, 0);
      d.position.set(u - 0.58, 0.3, -1.2);
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
      m.position.set(-0.36 + (i % 3) * 0.36, Math.floor(i / 3) * 0.31, ((i % 2) - 0.5) * 0.16);
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
    setOpacity(this.darkness.material as THREE.Material, a * 0.55);
  }

  update(dt: number) {
    if (this.popT < 1) {
      this.popT = Math.min(1, this.popT + dt * 2.2);
      const t = this.popT;
      // elastisches Ausschwingen
      const s = t === 1 ? 1 : 1 - Math.pow(2, -9 * t) * Math.cos(t * 11);
      this.content.scale.set(1, Math.max(0.02, s), 1);
    }
    this.door.rotation.y += (this.doorTarget - this.door.rotation.y) * Math.min(1, dt * 6);
    for (const d of this.stallDoors) {
      const target = (d.userData.target as number | undefined) ?? -1.4;
      d.rotation.y += (target - d.rotation.y) * Math.min(1, dt * 8);
    }
  }
}
