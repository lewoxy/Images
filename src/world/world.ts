import * as THREE from 'three';
import { Stage } from './stage';
import { Collision, type AABB } from './collision';
import { Materials } from './materials';
import { GeoBuilder, Walls, floorGeometry, stripGeometry, vcMaterial, vcMesh } from './geo';
import * as PR from './props';
import * as TX from './textures';
import { C, MEASURED as M, STYLE } from '../config/palette';
import {
  BUILDING,
  CELL,
  COURT_L,
  COURT_R,
  ELEVATOR_CELL,
  FORECOURT,
  GATES,
  HALLS,
  LANE,
  LOBBY,
  OUTDOOR,
  P,
  PARKING_BAYS,
  PARKING_LOT,
  SIDEWALK,
  STORAGE,
  STREET,
  WALL_H,
  WALL_HALF,
  cellCenter,
  cleanerCartPos,
  rowZ,
  type Rect,
} from '../config/floorplan';
import { GAME_TITLE } from '../config/strings';

const T = WALL_HALF * 2; // freistehende Wände: volle Stärke 0,3

/**
 * Statische Welt: Außenbereich, Flure, Lobby mit Lagerecke, Innenhöfe, Aufzug,
 * Parkplatz. Zimmer/WC-Zellen verwaltet cells.ts, Zonensperren die Zäune hier.
 */
export class World {
  mat = new Materials();
  root = new THREE.Group();
  private gateObjs = new Map<string, { obj: THREE.Object3D; col: AABB[] }>();
  private cleanerCarts = new Map<number, THREE.Object3D>();
  private lotGroup = new THREE.Group();
  private lotSite = new THREE.Group();
  barrierArm: THREE.Object3D | null = null;
  barrierGroup = new THREE.Group();
  elevatorGroup = new THREE.Group();
  elevatorDoors: THREE.Mesh[] = [];
  private elevatorCol: AABB[] = [];
  loungeGroup = new THREE.Group();
  lobbyDoors: THREE.Mesh[] = [];

  constructor(
    public stage: Stage,
    public col: Collision,
  ) {
    stage.scene.add(this.root);
    this.root.add(this.barrierGroup, this.elevatorGroup, this.loungeGroup, this.lotGroup, this.lotSite);
    this.buildExterior();
    this.buildHalls();
    this.buildInnerWalls();
    this.buildLobby();
    this.buildStorage();
    this.buildCourts();
    this.buildParking();
    this.setElevator(false);
    for (const g of GATES) this.setGate(g.id, true);
  }

  private floor(r: Rect, m: THREE.Material, tile: number, y = 0, parent: THREE.Object3D = this.root) {
    const mesh = new THREE.Mesh(floorGeometry(r.x0, r.x1, r.z0, r.z1, tile, y), m);
    mesh.matrixAutoUpdate = false;
    parent.add(mesh);
    return mesh;
  }

  private add(obj: THREE.Object3D, parent: THREE.Object3D = this.root) {
    parent.add(obj);
    return obj;
  }

  private addWalls(wl: Walls, parent: THREE.Object3D = this.root) {
    for (const m of wl.build(this.mat.wallMat)) {
      m.matrixAutoUpdate = false;
      parent.add(m);
    }
  }

  // ---------------------------------------------------------------- Außen
  private buildExterior() {
    const m = this.mat.floor;
    this.floor({ x0: -160, x1: 160, z0: -150, z1: 110 }, m.grass, 6, -0.06);
    this.floor(FORECOURT, m.forecourt, 5, -0.01);
    this.floor(SIDEWALK, m.sidewalk, 3, -0.02);
    this.floor(STREET, m.street, 4, -0.03);
    // Plattenweg rund ums Gebäude
    this.floor({ x0: BUILDING.x0 - 3, x1: BUILDING.x0, z0: BUILDING.z0 - 3, z1: BUILDING.z1 }, m.forecourt, 5, -0.012);
    this.floor({ x0: BUILDING.x1, x1: BUILDING.x1 + 3, z0: BUILDING.z0 - 3, z1: BUILDING.z1 }, m.forecourt, 5, -0.012);
    this.floor({ x0: BUILDING.x0, x1: BUILDING.x1, z0: BUILDING.z0 - 3, z1: BUILDING.z0 }, m.forecourt, 5, -0.012);

    const b = new GeoBuilder();
    // Bordsteine und Markierungen (#E3F3F6)
    b.box(SIDEWALK.x1 - SIDEWALK.x0, 0.16, 0.3, C.curb, 0, -0.03, SIDEWALK.z0);
    b.box(SIDEWALK.x1 - SIDEWALK.x0, 0.16, 0.3, C.curb, 0, -0.03, SIDEWALK.z1);
    b.box(STREET.x1 - STREET.x0, 0.16, 0.3, C.curb, 0, -0.03, STREET.z1 + 0.15);
    const mid = (STREET.z0 + STREET.z1) / 2;
    for (let x = STREET.x0; x < STREET.x1; x += 4) b.quad(2.2, 0.26, C.roadLine, x, -0.02, mid);
    b.quad(STREET.x1 - STREET.x0, 0.18, C.roadLine, 0, -0.02, STREET.z0 + 0.6);
    b.quad(STREET.x1 - STREET.x0, 0.18, C.roadLine, 0, -0.02, STREET.z1 - 0.6);
    // Zebrastreifen links vom Eingang
    for (let i = 0; i < 6; i++) b.quad(0.6, 8.4, C.roadLine, -36 + i * 1.2, -0.02, mid);
    // Bäume gegenüber: Kiefern und Laubbäume im Wechsel, Zaun davor
    for (let x = -96; x <= 96; x += 8) {
      const k = Math.abs(x / 8) % 3;
      if (k === 1) b.group((g) => PR.tree(g, 1.05), x + 1, 0, 35);
      else b.group((g) => PR.pine(g, 0.95 + (k === 2 ? 0.12 : 0), k === 2), x, 0, 33 + (k === 2 ? 2.5 : 0));
      if (k === 0) b.group((g) => PR.bush(g, 1.1), x + 4, 0, 31.2);
    }
    b.group((g) => PR.picketFence(g, 190), 0, 0, 30.2);
    for (let x = -80; x <= 80; x += 20) b.group((g) => PR.lampPost(g), x, 0, 29.4, Math.PI);
    // Laternen am Gehweg (nicht im Schlangen- und Einfahrtsbereich)
    for (const x of [-52, -40, 22, 36]) b.group((g) => PR.lampPost(g), x, 0, 15.9);
    // Kiefern rund um das Gebäude
    for (let z = -60; z <= 4; z += 8) {
      b.group((g) => PR.pine(g, 1.0, (z / 8) % 2 === 0), BUILDING.x0 - 7, 0, z);
      b.group((g) => PR.pine(g, 1.05, (z / 8) % 2 !== 0), BUILDING.x1 + 7, 0, z - 3);
    }
    for (let x = BUILDING.x0; x <= BUILDING.x1; x += 9) b.group((g) => PR.pine(g, 1.1, (x / 9) % 2 === 0), x, 0, BUILDING.z0 - 8);
    // Ecken hinter dem Gebäude (Raster k = 0 und 8, j = 0) sind Garten
    for (const cx of [-37.5, 22.5]) {
      b.group((g) => PR.pine(g, 0.9, true), cx - 1.2, 0, rowZ(0) - 1.2);
      b.group((g) => PR.bush(g, 1.0), cx + 2, 0, rowZ(0) + 1.8);
      b.group((g) => PR.grassTuft(g, 1.4), cx + 1, 0, rowZ(0) - 2.4);
    }
    // Zäune seitlich des Vorplatzes
    b.group((g) => PR.picketFence(g, 26), BUILDING.x0 - 4.5, 0, -6, Math.PI / 2);
    b.group((g) => PR.picketFence(g, 26), BUILDING.x1 + 4.5, 0, -6, Math.PI / 2);
    // Beete vor der Fassade
    b.group((g) => PR.flowerBed(g, 10, 1.2), -34.5, 0, 7.1);
    b.group((g) => PR.flowerBed(g, 9, 1.2), 20.5, 0, 7.1);
    b.group((g) => PR.hedge(g, 6), -52, 0, 7.4);
    b.group((g) => PR.hedge(g, 6), 40, 0, 7.4);
    for (const [x, z] of [
      [-46, 12],
      [-58, 7.5],
      [30, 13],
      [44, 9],
      [-14, 13.5],
    ])
      b.group((g) => PR.grassTuft(g, 1.2), x, 0, z);
    b.group((g) => PR.bench(g), -46, 0, 14.3, Math.PI);
    // Lieferwagen des Papierlieferanten (Landmarke „Supplier“)
    b.group((g) => PR.van(g), P.supplierVan.x, 0, P.supplierVan.z, Math.PI / 2);
    this.add(vcMesh(b));

    // Kollision: Straße, Seiten, Hindernisse
    this.col.add({ x0: OUTDOOR.x0 - 3, x1: OUTDOOR.x1 + 3, z0: OUTDOOR.z1, z1: OUTDOOR.z1 + 3, tag: 'curb' });
    this.col.add({ x0: OUTDOOR.x0 - 3, x1: OUTDOOR.x0, z0: BUILDING.z0 - 10, z1: OUTDOOR.z1 + 3 });
    this.col.add({ x0: OUTDOOR.x1, x1: OUTDOOR.x1 + 3, z0: BUILDING.z0 - 10, z1: OUTDOOR.z1 + 3 });
    // Gebäude-Außenseiten: der Spieler bleibt vorn
    this.col.add({ x0: BUILDING.x0 - 5, x1: BUILDING.x0 - 4.2, z0: BUILDING.z0 - 10, z1: BUILDING.z1 + 0.5 });
    this.col.add({ x0: BUILDING.x1 + 4.2, x1: BUILDING.x1 + 5, z0: BUILDING.z0 - 10, z1: BUILDING.z1 + 0.5 });
    this.col.addCentered(-34.5, 7.1, 10, 1.2);
    this.col.addCentered(20.5, 7.1, 9, 1.2);
    this.col.addCentered(-52, 7.4, 6, 0.8);
    this.col.addCentered(40, 7.4, 6, 0.8);
    this.col.addCentered(-46, 14.3, 2.1, 0.7);
    for (const x of [-52, -40, 22, 36]) this.col.addCentered(x, 15.9, 0.5, 0.5);
    this.col.addCentered(P.supplierVan.x, P.supplierVan.z, 6.4, 2.9);
  }

  // ---------------------------------------------------------------- Flure
  private buildHalls() {
    const m = this.mat.floor;
    for (const h of Object.values(HALLS)) this.floor(h, m.hall, 3.0, 0.002);
    // Läufer (Violett mit Goldkante) entlang der Laufachsen
    const rm = this.mat.textured('runner', () => TX.runner(C.hallCarpet, C.hallCarpetDark, STYLE.gold));
    const W = 1.3;
    const strip = (x0: number, x1: number, z0: number, z1: number, alongX: boolean, y: number) =>
      this.add(new THREE.Mesh(stripGeometry(x0, x1, z0, z1, 3.0, alongX, y), rm));
    strip(HALLS.top.x0 + 1.2, HALLS.top.x1 - 1.2, LANE.topZ - W, LANE.topZ + W, true, 0.012);
    strip(LANE.leftX - W, LANE.leftX + W, HALLS.left.z0 - 2.4, HALLS.left.z1 - 1.0, false, 0.014);
    strip(LANE.rightX - W, LANE.rightX + W, HALLS.right.z0 - 2.4, HALLS.right.z1 - 1.0, false, 0.014);
    strip(LANE.midX - W, LANE.midX + W, HALLS.mid.z0 - 2.4, HALLS.mid.z1 + 1.5, false, 0.016);
  }

  // ---------------------------------------------------------------- Wände außerhalb der Zellen
  private buildInnerWalls() {
    const wl = new Walls(WALL_H);
    const cap = C.wallCap;
    const hall = { mat: 'hall' };
    const court = { mat: 'court' };
    const lobby = { mat: 'lobby' };
    const facade = { mat: 'facade' };
    const storage = { mat: 'storage' };
    const col = (r: Rect) => this.col.add(r);
    // Innenhof links: Flurseite (x = -26,25), hinterer Flur, Lobby/Lager
    const L = COURT_L;
    wl.seg(L.x0 + T / 2, L.z0, L.x0 + T / 2, L.z1, T, hall, court, cap);
    wl.seg(L.x0, L.z0 + T / 2, L.x1, L.z0 + T / 2, T, hall, court, cap);
    wl.seg(L.x0, L.z1 - T / 2, L.x1, L.z1 - T / 2, T, court, storage, cap);
    col({ x0: L.x0, x1: L.x0 + T, z0: L.z0, z1: L.z1 });
    col({ x0: L.x0, x1: L.x1, z0: L.z0, z1: L.z0 + T });
    col({ x0: L.x0, x1: L.x1, z0: L.z1 - T, z1: L.z1 });
    // Innenhof rechts
    const R = COURT_R;
    wl.seg(R.x1 - T / 2, R.z0, R.x1 - T / 2, R.z1, T, court, hall, cap);
    wl.seg(R.x0, R.z0 + T / 2, R.x1, R.z0 + T / 2, T, hall, court, cap);
    wl.seg(R.x0, R.z1 - T / 2, R.x1, R.z1 - T / 2, T, court, lobby, cap);
    col({ x0: R.x1 - T, x1: R.x1, z0: R.z0, z1: R.z1 });
    col({ x0: R.x0, x1: R.x1, z0: R.z0, z1: R.z0 + T });
    col({ x0: R.x0, x1: R.x1, z0: R.z1 - T, z1: R.z1 });
    // Lagerecke ↔ linker Flur, Lobby ↔ rechter Flur (jeweils nur Zeile 6; Zeile 7 ist Durchgang)
    const r6 = { z0: rowZ(6) - CELL / 2, z1: rowZ(6) + CELL / 2 };
    wl.seg(STORAGE.x0 + T / 2, r6.z0, STORAGE.x0 + T / 2, r6.z1, T, hall, storage, cap);
    col({ x0: STORAGE.x0, x1: STORAGE.x0 + T, z0: r6.z0, z1: r6.z1 });
    wl.seg(LOBBY.x1 - T / 2, r6.z0, LOBBY.x1 - T / 2, r6.z1, T, lobby, hall, cap);
    col({ x0: LOBBY.x1 - T, x1: LOBBY.x1, z0: r6.z0, z1: r6.z1 });
    // Flurenden vorn (Fassade mit Fenster)
    const fz = BUILDING.z1 - T / 2;
    for (const h of [HALLS.left, HALLS.right]) {
      wl.seg(h.x0, fz, h.x0 + 2.3, fz, T, hall, facade, cap);
      wl.seg(h.x1 - 2.3, fz, h.x1, fz, T, hall, facade, cap);
      wl.seg(h.x0 + 2.3, fz, h.x1 - 2.3, fz, T, hall, facade, cap, 0.9);
      wl.seg(h.x0 + 2.3, fz, h.x1 - 2.3, fz, T, hall, facade, cap, 0.5, WALL_H - 0.5);
      col({ x0: h.x0, x1: h.x1, z0: BUILDING.z1 - T, z1: BUILDING.z1 + 0.1 });
    }
    // Lobby-Fassade: Sockel, Glas, Sturz – Eingang in der Mitte
    const ex = 1.8;
    for (const [a, c] of [
      [LOBBY.x0, -ex],
      [ex, LOBBY.x1],
    ]) {
      wl.seg(a, fz, c, fz, T, lobby, facade, cap, 0.6);
      wl.seg(a, fz, c, fz, T, lobby, facade, cap, 0.35, WALL_H - 0.35);
      col({ x0: a, x1: c, z0: BUILDING.z1 - T, z1: BUILDING.z1 + 0.1 });
    }
    wl.seg(-ex, fz, ex, fz, T, lobby, facade, cap, 0.35, WALL_H - 0.35);
    // Aufzugsschacht: Front zum hinteren Flur mit Türöffnung, Rückwand, Dach
    const ec = ELEVATOR_CELL;
    const ecx = (ec.x0 + ec.x1) / 2;
    wl.seg(ec.x0, ec.z1 - T / 2, ecx - 1.5, ec.z1 - T / 2, T, { mat: 'elevator' }, hall, cap);
    wl.seg(ecx + 1.5, ec.z1 - T / 2, ec.x1, ec.z1 - T / 2, T, { mat: 'elevator' }, hall, cap);
    wl.seg(ecx - 1.5, ec.z1 - T / 2, ecx + 1.5, ec.z1 - T / 2, T, { mat: 'elevator' }, hall, cap, 0.5, WALL_H - 0.5);
    wl.seg(ec.x0, ec.z0 + T / 2, ec.x1, ec.z0 + T / 2, T, facade, { mat: 'elevator' }, cap);
    col({ x0: ec.x0, x1: ec.x1, z0: ec.z1 - T - 0.2, z1: ec.z1 });
    this.addWalls(wl);

    const b = new GeoBuilder();
    // Schachtdach mit Maschinenhaus
    b.box(CELL - 0.3, 0.2, CELL - 0.3, STYLE.neutralBlue, ecx, WALL_H, (ec.z0 + ec.z1) / 2);
    b.box(3.2, 1.2, 3.2, 0xf9faf7, ecx, WALL_H + 0.2, (ec.z0 + ec.z1) / 2 - 0.8);
    b.box(3.4, 0.14, 3.4, STYLE.lead, ecx, WALL_H + 1.4, (ec.z0 + ec.z1) / 2 - 0.8);
    // Fensterbänder und Fensterkreuze der Lobbyfassade
    for (const [a, c] of [
      [LOBBY.x0, -ex],
      [ex, LOBBY.x1],
    ]) {
      for (let x = a; x <= c + 0.01; x += (c - a) / Math.round((c - a) / 3)) b.box(0.16, WALL_H - 0.95, 0.24, 0xf9faf7, x, 0.6, fz);
    }
    for (const h of [HALLS.left, HALLS.right]) {
      b.box(h.x1 - h.x0 - 4.6, 0.12, 0.34, 0xf9faf7, (h.x0 + h.x1) / 2, 0.88, fz);
      b.box(0.14, 1.6, 0.24, 0xf9faf7, (h.x0 + h.x1) / 2, 0.9, fz);
    }
    // Wandleuchten, Fenster mit Vorhängen und Pflanzen in den Fluren (Hofwände)
    const curtain = this.mat.textured('hallCurtain', () => TX.stripes(M.korridor.laeuferGruen, 0x0f7f47, 3));
    const hallWindow = (x: number, z: number, ry: number) => {
      b.group((g) => PR.windowFrame(g, 1.6, 1.3), x, 1.0, z, ry);
      const dx = Math.cos(ry);
      const dz = -Math.sin(ry);
      const nx = Math.sin(ry);
      const nz = Math.cos(ry);
      for (const s of [-1, 1]) {
        const g = new THREE.BoxGeometry(0.46, 2.4, 0.1);
        g.translate(0, 1.2, 0);
        const cm = new THREE.Mesh(g, curtain);
        cm.position.set(x + dx * s * 1.05 + nx * 0.12, 0.3, z + dz * s * 1.05 + nz * 0.12);
        cm.rotation.y = ry;
        this.add(cm);
      }
      const v = new THREE.BoxGeometry(2.8, 0.3, 0.14);
      v.translate(0, 0.15, 0);
      const vm = new THREE.Mesh(v, curtain);
      vm.position.set(x + nx * 0.12, 2.6, z + nz * 0.12);
      vm.rotation.y = ry;
      this.add(vm);
    };
    for (const z of [-34.5, -27.6, -20.1, -12.6]) {
      hallWindow(L.x0 - 0.01, z, -Math.PI / 2);
      hallWindow(R.x1 + 0.01, z, Math.PI / 2);
    }
    for (const x of [L.x0 + 3.75, R.x0 + 3.75]) hallWindow(x, L.z0 - 0.01, Math.PI);
    for (const z of [-38, -31, -16.4, -9.2]) {
      b.group((g) => PR.wallLamp(g), L.x0 - 0.01, 2.2, z, -Math.PI / 2);
      b.group((g) => PR.wallLamp(g), R.x1 + 0.01, 2.2, z, Math.PI / 2);
    }
    // Pflanzen, Bänke, Automat im hinteren Flur
    for (const [x, z] of [
      [HALLS.top.x0 + 0.9, HALLS.top.z1 - 0.9],
      [HALLS.top.x1 - 0.9, HALLS.top.z1 - 0.9],
      [HALLS.left.x1 - 0.9, 5.2],
      [HALLS.right.x0 + 0.9, 5.2],
    ]) {
      b.group((g) => PR.plant(g, 1.05), x, 0, z);
      this.col.addCentered(x, z, 0.9, 0.9);
    }
    b.group((g) => PR.vendingMachine(g, STYLE.signalRed), -18.7, 0, HALLS.top.z1 - 0.65, Math.PI);
    this.col.addCentered(-18.7, HALLS.top.z1 - 0.65, 1.5, 1.1);
    b.group((g) => PR.bench(g, STYLE.lead), 3.9, 0, HALLS.top.z1 - 0.55, Math.PI);
    this.col.addCentered(3.9, HALLS.top.z1 - 0.55, 2.2, 0.7);
    // Uhr im Mittelflur
    b.group((g) => PR.wallClock(g, STYLE.gold), LANE.midX, 2.3, HALLS.mid.z0 + 0.01);
    this.add(vcMesh(b));
  }

  // ---------------------------------------------------------------- Lobby
  private buildLobby() {
    this.floor(LOBBY, this.mat.floor.lobby, 3.75, 0.002);
    const b = new GeoBuilder();
    // Grüner Läufer vom Eingang zum Tresen (Warteschlange)
    const rm = this.mat.textured('lobbyRunner', () => TX.runner(M.korridor.laeuferGruen, 0x0e7a44, STYLE.gold));
    this.add(new THREE.Mesh(stripGeometry(-1.4, 1.4, 1.0, LOBBY.z1 - 0.2, 3.0, false, 0.012), rm));
    b.group((g) => PR.reception(g), P.receptionDesk.x, 0, P.receptionDesk.z);
    this.col.add({ x0: -PR.DESK.w / 2 - 0.3, x1: PR.DESK.w / 2 + 0.3, z0: -PR.DESK.d / 2, z1: PR.DESK.d / 2 + 0.1 });
    // Hotelname auf der Tresenfront (zeigt zur Kamera)
    const deskSign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 0.62),
      new THREE.MeshBasicMaterial({ map: TX.signTexture(GAME_TITLE.toUpperCase(), '#8048CF', '#FECC06', 1024, 138), transparent: true }),
    );
    deskSign.position.set(P.receptionDesk.x, 0.62, P.receptionDesk.z + PR.DESK.d / 2 + 0.06);
    this.add(deskSign);
    // Rückwand hinter dem Tresen: Uhr, Bilder, Pflanzen
    const bz = LOBBY.z0 + 0.01;
    b.group((g) => PR.wallClock(g, STYLE.gold), 0, 2.2, bz);
    for (const x of [-2.4, 2.4]) {
      b.group((g) => PR.pictureFrame(g, 1.3, 1.0, STYLE.gold), x, 1.3, bz);
      const k = x < 0 ? 0 : 1;
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), this.mat.textured('paint' + k, () => TX.painting(k)));
      pm.position.set(x, 1.72, bz + 0.06);
      this.add(pm);
    }
    for (const x of [-3.2, 3.2]) {
      b.group((g) => PR.plant(g, 1.1), x, 0, LOBBY.z0 + 0.8);
      this.col.addCentered(x, LOBBY.z0 + 0.8, 0.9, 0.9);
    }
    // Sitzecke links
    b.group((g) => PR.sofa(g, STYLE.coral, 0xf27a5c, 2.8), -16.2, 0, -2.3);
    b.group((g) => PR.coffeeTable(g, STYLE.gold), -16.2, 0, -0.2);
    this.col.addCentered(-16.2, -2.3, 2.9, 1.2);
    this.col.addCentered(-16.2, -0.2, 1.4, 1.4);
    // Sitzecke rechts
    b.group((g) => PR.sofa(g, 0x339eff, 0x62a5d3, 2.8), 7.5, 0, 5.2, Math.PI);
    b.group((g) => PR.coffeeTable(g, STYLE.gold), 7.5, 0, 3.5);
    this.col.addCentered(7.5, 5.2, 2.9, 1.2);
    this.col.addCentered(7.5, 3.5, 1.4, 1.4);
    // Automaten, Wasserspender, Pflanzen
    b.group((g) => PR.vendingMachine(g, STYLE.signalRed), 9.8, 0, LOBBY.z0 + 0.65);
    this.col.addCentered(9.8, LOBBY.z0 + 0.65, 1.5, 1.1);
    b.group((g) => PR.waterCooler(g), 7.9, 0, LOBBY.z0 + 0.5);
    this.col.addCentered(7.9, LOBBY.z0 + 0.5, 0.7, 0.7);
    for (const [x, z] of [
      [10.5, 5.4],
      [-25.4, 5.4],
      [-11.8, -8.2],
    ]) {
      b.group((g) => PR.plant(g, 1.2), x, 0, z);
      this.col.addCentered(x, z, 0.9, 0.9);
    }
    // Service-Theke (Sonderwünsche)
    const sb = P.serviceBar;
    b.box(3.4, 1.05, 1.0, C.deskWood, sb.x, 0, sb.z);
    b.box(3.2, 0.8, 0.05, STYLE.lead, sb.x, 0.12, sb.z + 0.5);
    b.box(3.6, 0.1, 1.2, C.deskTop, sb.x, 1.05, sb.z);
    b.cyl(0.12, 0.14, 0.5, STYLE.emerald, sb.x - 1.2, 1.15, sb.z, 8);
    b.cyl(0.05, 0.05, 0.2, STYLE.emerald, sb.x - 1.2, 1.65, sb.z, 6);
    b.group((g) => PR.plant(g, 0.4, STYLE.lead, STYLE.pink), sb.x - 0.35, 1.15, sb.z);
    b.box(0.66, 0.2, 0.44, 0x339eff, sb.x + 0.55, 1.15, sb.z);
    b.cyl(0.13, 0.11, 0.24, 0xf9faf7, sb.x + 1.3, 1.15, sb.z, 8);
    this.col.addCentered(sb.x, sb.z, 3.7, 1.2);
    // Mülleimer
    b.cyl(0.46, 0.4, 1.0, STYLE.mutedBlue, P.trash.x, 0, P.trash.z, 10);
    b.cyl(0.5, 0.5, 0.12, STYLE.neutralBlue, P.trash.x, 1.0, P.trash.z, 10);
    this.col.addCentered(P.trash.x, P.trash.z, 0.9, 0.9);
    // Supplier-Posten: Kistenstapel
    b.group((g) => PR.boxStack(g), P.supplierPost.x - 1.6, 0, P.supplierPost.z + 2.4);
    this.col.addCentered(P.supplierPost.x - 1.6, P.supplierPost.z + 2.4, 1.0, 1.0);
    this.add(vcMesh(b));

    // Schiebetüren im Eingang
    for (const s of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 0.1), this.mat.glass);
      d.position.set(s * 0.9, 1.3, BUILDING.z1 - 0.15);
      d.userData.baseX = s * 0.9;
      this.lobbyDoors.push(d);
      this.add(d);
    }
    // Glas der Fassade
    const ex = 1.8;
    for (const [a, c] of [
      [LOBBY.x0, -ex],
      [ex, LOBBY.x1],
    ]) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(c - a, WALL_H - 0.95, 0.08), this.mat.glass);
      g.position.set((a + c) / 2, 0.6 + (WALL_H - 0.95) / 2, BUILDING.z1 - 0.15);
      this.add(g);
    }
  }

  // ---------------------------------------------------------------- Lager
  private buildStorage() {
    this.floor(STORAGE, this.mat.floor.storage, 3, 0.004);
    const b = new GeoBuilder();
    for (let i = 0; i < 9; i++) b.quad(0.42, 0.42, i % 2 === 0 ? C.storageStripeA : C.storageStripeB, P.paperShelf.x - 1.7 + i * 0.42, 0.008, P.paperShelf.z + 1.25);
    b.group((g) => PR.paperPallet(g), P.paperShelf.x, 0, P.paperShelf.z);
    this.col.addCentered(P.paperShelf.x, P.paperShelf.z, 2.7, 2.0);
    b.group((g) => PR.shelfUnit(g, 3.2, true), STORAGE.x0 + 0.6, 0, -5.9, Math.PI / 2);
    this.col.addCentered(STORAGE.x0 + 0.6, -5.9, 0.8, 3.2);
    b.group((g) => PR.shelfUnit(g, 2.4, false), STORAGE.x1 - 1.6, 0, STORAGE.z0 + 0.6);
    this.col.addCentered(STORAGE.x1 - 1.6, STORAGE.z0 + 0.6, 2.4, 0.8);
    for (let i = 0; i < 2; i++) b.group((g) => PR.washer(g), STORAGE.x0 + 0.8, 0, -2.6 - i * 1.2, Math.PI / 2);
    this.col.add({ x0: STORAGE.x0, x1: STORAGE.x0 + 1.4, z0: -4.0, z1: -1.9 });
    this.add(vcMesh(b));
  }

  // ---------------------------------------------------------------- Innenhöfe
  private buildCourts() {
    // Rechts: Garten mit Kiefern und Brunnen (nicht begehbar)
    const R = COURT_R;
    this.floor(R, this.mat.floor.grass, 6, 0.0);
    const b = new GeoBuilder();
    const cx = (R.x0 + R.x1) / 2;
    b.group((g) => PR.fountain(g), cx, 0, -24.2);
    b.group((g) => PR.pine(g, 0.8), cx - 1.8, 0, -35.5);
    b.group((g) => PR.pine(g, 0.75, true), cx + 1.6, 0, -31.5);
    b.group((g) => PR.pine(g, 0.8, true), cx - 1.6, 0, -15.5);
    b.group((g) => PR.tree(g, 0.75), cx + 1.6, 0, -11.8);
    b.group((g) => PR.bench(g), cx + 2.4, 0, -20.0, -Math.PI / 2);
    b.group((g) => PR.bush(g, 0.9), cx - 2.3, 0, -28.0);
    b.group((g) => PR.flowerBed(g, 1.2, 3.2), cx - 2.5, 0, -20.5);
    this.add(vcMesh(b));
  }

  // ---------------------------------------------------------------- Parkplatz
  private buildParking() {
    const lot = PARKING_LOT;
    this.floor(lot, this.mat.floor.lot, 4, 0.0);
    this.floor({ x0: 5.1, x1: 8.3, z0: lot.z1, z1: SIDEWALK.z1 }, this.mat.floor.lot, 4, 0.004);
    const b = new GeoBuilder();
    b.box(lot.x1 - lot.x0 + 0.3, 0.2, 0.3, C.curb, (lot.x0 + lot.x1) / 2, -0.02, lot.z0 - 0.1);
    b.box(0.3, 0.2, lot.z1 - lot.z0, C.curb, lot.x1 + 0.15, -0.02, (lot.z0 + lot.z1) / 2);
    this.add(vcMesh(b));
    // Stellplätze und Schranke (sichtbar nach dem Kauf)
    const lines = new GeoBuilder();
    for (const x of [lot.x0 + 0.2, ...PARKING_BAYS.slice(0, -1).map((bx, i) => (bx + PARKING_BAYS[i + 1]) / 2), lot.x1 - 0.2]) lines.quad(0.16, 5.2, C.roadLine, x, 0.01, 9.4);
    for (const bx of PARKING_BAYS) lines.quad(1.6, 0.16, C.roadLine, bx, 0.01, 12.0);
    lines.group((g) => PR.booth(g), -1.4, 0, 13.2);
    this.lotGroup.add(vcMesh(lines));
    const gate = new GeoBuilder();
    gate.group((g) => PR.barrierGate(g), 0, 0, 0);
    this.barrierGroup.add(vcMesh(gate));
    const armB = new GeoBuilder();
    armB.group((g) => PR.barrierArm(g, 3.4), 0, 0, 0);
    const arm = vcMesh(armB);
    arm.matrixAutoUpdate = true;
    arm.position.set(0.05, 1.1, 0);
    this.barrierArm = arm;
    this.barrierGroup.add(arm);
    this.barrierGroup.position.set(P.barrier.x - 1.7, 0, P.barrier.z);
    this.lotGroup.add(this.barrierGroup);
    const psign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({ map: TX.signTexture('P', '#339EFF', '#F9FAF7', 256, 256), transparent: true }),
    );
    psign.position.set(lot.x1 + 0.4, 3.0, lot.z1 + 0.6);
    psign.rotation.x = -0.3;
    this.lotGroup.add(psign);
    const pole = new GeoBuilder();
    pole.box(0.16, 2.3, 0.16, PR.METAL_D, lot.x1 + 0.4, 0, lot.z1 + 0.55);
    this.lotGroup.add(vcMesh(pole));
    // Baustelle vor dem Kauf
    const site = new GeoBuilder();
    for (const [x, z] of [
      [2.6, 7.4],
      [10.8, 7.4],
      [2.6, 11.6],
      [10.8, 11.6],
    ])
      site.group((g) => PR.trafficCone(g), x, 0, z);
    site.group((g) => PR.boxStack(g), 10.6, 0, 9.5, 0.5);
    this.lotSite.add(vcMesh(site));
    this.lotGroup.visible = false;
    this.col.addCentered(-1.4, 13.2, 1.9, 1.7);
  }

  setGarageOpen(open: boolean) {
    this.lotGroup.visible = open;
    this.lotSite.visible = !open;
  }

  // ---------------------------------------------------------------- Aufzug & Lounge
  setElevator(built: boolean) {
    this.elevatorGroup.clear();
    this.loungeGroup.clear();
    for (const c of this.elevatorCol) this.col.remove(c);
    this.elevatorCol = [];
    this.elevatorDoors = [];
    const ex = P.elevator.x;
    const fz = ELEVATOR_CELL.z1; // Flurseite der Schachtwand
    const b = new GeoBuilder();
    if (built) {
      b.group((g) => PR.elevatorDoorFrame(g), ex, 0, fz - 0.2);
      for (const s of [-1, 1]) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(1.38, 2.46, 0.1), this.mat.colored(0xe3f3f6));
        d.position.set(ex + s * 0.7, 1.23, fz + 0.02);
        d.userData.baseX = ex + s * 0.7;
        this.elevatorDoors.push(d);
        this.elevatorGroup.add(d);
      }
      b.group((g) => PR.plant(g, 1.1), ex - 2.7, 0, fz + 0.7);
      b.group((g) => PR.plant(g, 1.1), ex + 2.7, 0, fz + 0.7);
    } else {
      b.group((g) => PR.scaffold(g, 3.6, 2.7), ex, 0, fz + 0.3);
      b.group((g) => PR.trafficCone(g), ex - 2.3, 0, fz + 0.9);
      b.group((g) => PR.trafficCone(g), ex + 2.3, 0, fz + 0.9);
    }
    this.elevatorCol.push(this.col.add({ x0: ex - 3.1, x1: ex + 3.1, z0: fz - 0.2, z1: fz + 1.0 }));
    this.elevatorGroup.add(vcMesh(b));

    // Innenhof links: Baustelle, mit dem Aufzug wird er zur Lounge
    const L = COURT_L;
    const cx = (L.x0 + L.x1) / 2;
    const lb = new GeoBuilder();
    if (built) {
      this.floor(L, this.mat.floor.lounge, 3, 0.002, this.loungeGroup);
      lb.group((g) => PR.fountain(g), cx, 0, -24.0);
      lb.group((g) => PR.sofa(g, 0x8b48e2, 0xc989ff, 2.8), cx + 1.9, 0, -32.5, -Math.PI / 2);
      lb.group((g) => PR.sofa(g, 0x8b48e2, 0xc989ff, 2.8), cx + 1.9, 0, -15.5, -Math.PI / 2);
      lb.group((g) => PR.coffeeTable(g, STYLE.gold), cx - 0.2, 0, -32.5);
      lb.group((g) => PR.coffeeTable(g, STYLE.gold), cx - 0.2, 0, -15.5);
      lb.group((g) => PR.piano(g), cx - 1.8, 0, -11.2, Math.PI / 2);
      lb.group((g) => PR.palm(g, 1.2), cx - 2.6, 0, -36.8);
      lb.group((g) => PR.palm(g, 1.2), cx + 2.6, 0, -19.8);
      lb.group((g) => PR.roundRug(g, 2.2, STYLE.magenta, STYLE.gold), cx, 0, -24.0);
    } else {
      this.floor(L, this.mat.floor.foundation, 3.75, 0.002, this.loungeGroup);
      lb.group((g) => PR.scaffold(g, 3.2, 2.7), cx, 0, -24);
      lb.group((g) => PR.boxStack(g), cx - 1.8, 0, -31.0, 0.3);
      lb.group((g) => PR.boxStack(g), cx + 1.9, 0, -14.8, -0.4);
      lb.group((g) => PR.trafficCone(g), cx + 2.2, 0, -35.5);
      lb.group((g) => PR.trafficCone(g), cx - 2.2, 0, -19.5);
    }
    this.loungeGroup.add(vcMesh(lb));
  }

  // ---------------------------------------------------------------- Zonen
  private setGate(id: string, closed: boolean) {
    const cur = this.gateObjs.get(id);
    if (cur) {
      cur.obj.removeFromParent();
      (cur.obj as THREE.Mesh).geometry?.dispose();
      for (const c of cur.col) this.col.remove(c);
      this.gateObjs.delete(id);
    }
    if (!closed) return;
    const g = GATES.find((k) => k.id === id)!;
    const alongX = Math.abs(g.z1 - g.z0) < 1e-6;
    const len = alongX ? Math.abs(g.x1 - g.x0) : Math.abs(g.z1 - g.z0);
    const cx = (g.x0 + g.x1) / 2;
    const cz = (g.z0 + g.z1) / 2;
    const b = new GeoBuilder();
    b.group((p) => PR.fence(p, len - 0.4), cx, 0, cz, alongX ? 0 : Math.PI / 2);
    // Absperrkegel und Kisten auf der gesperrten Seite andeuten
    const off = alongX ? { x: 0, z: 1 } : { x: 1, z: 0 };
    b.group((p) => PR.trafficCone(p), cx + off.z * (len / 2 - 0.9) + off.x * 0.9, 0, cz + off.x * (len / 2 - 0.9) + off.z * 0.9);
    b.group((p) => PR.trafficCone(p), cx - off.z * (len / 2 - 0.9) - off.x * 0.9, 0, cz - off.x * (len / 2 - 0.9) - off.z * 0.9);
    const obj = vcMesh(b);
    this.add(obj);
    const col = [this.col.add(alongX ? { x0: g.x0, x1: g.x1, z0: cz - 0.3, z1: cz + 0.3 } : { x0: cx - 0.3, x1: cx + 0.3, z0: g.z0, z1: g.z1 })];
    this.gateObjs.set(id, { obj, col });
  }

  setZoneLocked(zone: number, locked: boolean) {
    for (const g of GATES) if (g.zone === zone) this.setGate(g.id, locked);
    // Reinigungswagen neben dem Cleaner-Posten
    const cart = this.cleanerCarts.get(zone);
    if (!locked && !cart) {
      const p = cleanerCartPos(zone);
      const b = new GeoBuilder();
      b.group((g) => PR.cleaningCart(g), p.x, 0, p.z, Math.PI / 2);
      const m = vcMesh(b);
      this.cleanerCarts.set(zone, m);
      this.add(m);
      this.col.addCentered(p.x, p.z, 0.9, 1.4);
    }
  }

  /** Hilfsfunktion für Zellmittelpunkte (für Debug/Tests) */
  cellCenter(zone: number, index: number) {
    return cellCenter(zone, index);
  }

  update(dt: number, t: number, nearDoor: boolean) {
    // Automatische Schiebetüren der Lobby
    for (const d of this.lobbyDoors) {
      const base = d.userData.baseX as number;
      const target = nearDoor ? base + Math.sign(base) * 1.7 : base;
      d.position.x += (target - d.position.x) * Math.min(1, dt * 8);
    }
    // Aufzug fährt: Türen öffnen sich regelmäßig
    if (this.elevatorDoors.length) {
      const open = t % 9 > 6;
      for (const d of this.elevatorDoors) {
        const base = d.userData.baseX as number;
        const target = open ? base + Math.sign(base - P.elevator.x) * 1.25 : base;
        d.position.x += (target - d.position.x) * Math.min(1, dt * 5);
      }
    }
  }
}

export { vcMaterial };
