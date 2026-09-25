import * as THREE from 'three';
import { Stage } from './stage';
import { Collision, type AABB } from './collision';
import { Materials } from './materials';
import { GeoBuilder, WallBuilder, floorGeometry, vcMesh } from './geo';
import * as PR from './props';
import { C } from '../config/palette';
import { GARAGE, HALLS, LOBBY, P, ROWS, SIDEWALK, SPINE_HALF, STORAGE, STREET, WALL_H, ZONES, cellCenter, cleanerPost, doorLine, zoneRect, type Rect } from '../config/floorplan';
import { GAME_TITLE } from '../config/strings';
import { signTexture } from './textures';

/**
 * Statische Welt: Außenbereich, Gebäudehülle, Lobby, Lager, Garage, Flure.
 * Zimmer/WC-Zellen verwaltet cells.ts, gesperrte Zonen die Zaun-Objekte hier.
 */
export class World {
  mat = new Materials();
  root = new THREE.Group();
  private zoneFences = new Map<number, { obj: THREE.Object3D; col: AABB[] }>();
  private cleanerCarts = new Map<number, THREE.Object3D>();
  garageDoor: THREE.Object3D | null = null;
  barrierArm: THREE.Object3D | null = null;
  barrierGroup = new THREE.Group();
  elevatorGroup = new THREE.Group();
  elevatorDoors: THREE.Mesh[] = [];
  private elevatorCol: AABB[] = [];
  loungeGroup = new THREE.Group();
  private loungeCol: AABB[] = [];
  lobbyDoors: THREE.Mesh[] = [];

  constructor(
    public stage: Stage,
    public col: Collision,
  ) {
    stage.scene.add(this.root);
    this.root.add(this.barrierGroup, this.elevatorGroup, this.loungeGroup);
    this.buildExterior();
    this.buildShell();
    this.buildLobby();
    this.buildStorage();
    this.buildGarage();
    this.buildElevatorArea();
  }

  private floor(r: Rect, m: THREE.Material, tile: number, y = 0) {
    const mesh = new THREE.Mesh(floorGeometry(r.x0, r.x1, r.z0, r.z1, tile, y), m);
    mesh.matrixAutoUpdate = false;
    this.root.add(mesh);
    return mesh;
  }

  private add(obj: THREE.Object3D) {
    this.root.add(obj);
    return obj;
  }

  // ---------------------------------------------------------------- Außen
  private buildExterior() {
    const m = this.mat.floor;
    this.floor({ x0: -140, x1: 140, z0: -130, z1: 90 }, m.grass, 9, -0.06);
    this.floor(STREET, m.street, 7, -0.03);
    this.floor(SIDEWALK, m.sidewalk, 3.2, 0);
    // Gehweg-Streifen an den Gebäudeseiten und hinten (optisch)
    this.floor({ x0: -37, x1: -33.5, z0: -57, z1: 6 }, m.sidewalk, 3.2, 0);
    this.floor({ x0: 33.5, x1: 37, z0: -57, z1: 6 }, m.sidewalk, 3.2, 0);
    this.floor({ x0: -37, x1: 37, z0: -58, z1: -54.5 }, m.sidewalk, 3.2, 0);

    const b = new GeoBuilder();
    // Bordstein
    b.box(SIDEWALK.x1 - SIDEWALK.x0, 0.16, 0.35, C.curb, 0, -0.03, SIDEWALK.z1);
    b.box(SIDEWALK.x1 - SIDEWALK.x0 + 40, 0.16, 0.35, C.curb, 0, -0.03, STREET.z1 + 0.1);
    // Mittellinie
    for (let x = STREET.x0; x < STREET.x1; x += 3.4) b.quad(1.8, 0.22, C.roadLine, x, -0.02, (STREET.z0 + STREET.z1) / 2);
    // Zebrastreifen vor dem Eingang
    for (let i = 0; i < 6; i++) b.quad(0.55, 8.2, C.roadLine, -4.2 + i * 1.1 - 12, -0.02, (STREET.z0 + STREET.z1) / 2);
    // Bäume gegenüber
    for (let x = -80; x <= 80; x += 11) {
      b.group((g) => PR.tree(g, 0.95 + ((x * 7) % 5) * 0.06), x + ((x * 13) % 3), 0, 24 + ((x * 3) % 4));
      if (x % 22 === 0) b.group((g) => PR.bush(g, 1.2), x + 5, 0, 22.3);
    }
    for (let x = -76; x <= 76; x += 22) b.group((g) => PR.lampPost(g), x, 0, 21.2);
    // Laternen auf dem Gehweg (nicht im Schlangenbereich)
    for (const x of [-40, 10, 40]) b.group((g) => PR.lampPost(g), x, 0, 10.0);
    // Seiten und Rückseite
    for (let z = -50; z <= 0; z += 9) {
      b.group((g) => PR.tree(g, 1.0), -41, 0, z + 2);
      b.group((g) => PR.tree(g, 1.05), 41.5, 0, z - 2);
    }
    for (let x = -30; x <= 30; x += 10) b.group((g) => PR.tree(g, 1.1), x, 0, -62);
    // Beete vor der Fassade
    b.group((g) => PR.flowerBed(g, 9, 1.1), -24, 0, 7.0);
    b.group((g) => PR.flowerBed(g, 7, 1.1), -9, 0, 7.0);
    b.group((g) => PR.flowerBed(g, 3.4, 1.1), 11.5, 0, 7.0);
    b.group((g) => PR.bench(g), -34, 0, 9.4, Math.PI);
    b.group((g) => PR.bush(g, 1), 31.8, 0, 7.1);
    this.add(vcMesh(b));
    this.col.add({ x0: SIDEWALK.x0 - 2, x1: SIDEWALK.x1 + 2, z0: SIDEWALK.z1, z1: SIDEWALK.z1 + 3, tag: 'curb' });
    this.col.add({ x0: SIDEWALK.x0 - 2, x1: SIDEWALK.x0, z0: SIDEWALK.z0 - 2, z1: SIDEWALK.z1 + 2 });
    this.col.add({ x0: SIDEWALK.x1, x1: SIDEWALK.x1 + 2, z0: SIDEWALK.z0 - 2, z1: SIDEWALK.z1 + 2 });
    // Beete sind Hindernisse
    this.col.addCentered(-24, 7.0, 9, 1.1);
    this.col.addCentered(-9, 7.0, 7, 1.1);
    this.col.addCentered(11.5, 7.0, 3.4, 1.1);
    this.col.addCentered(-40, 10, 0.5, 0.5);
    this.col.addCentered(10, 10, 0.5, 0.5);
    this.col.addCentered(40, 10, 0.5, 0.5);
    this.col.addCentered(-34, 9.4, 2.1, 0.7);

  }

  // ---------------------------------------------------------------- Hülle
  private buildShell() {
    const m = this.mat.floor;
    for (const h of Object.values(HALLS)) this.floor(h, m.hall, 3.2, 0.001);
    this.floor({ x0: -SPINE_HALF, x1: SPINE_HALF, z0: -29, z1: -14 }, m.hall, 3.2, 0.001);
    this.floor({ x0: -SPINE_HALF, x1: SPINE_HALF, z0: -49, z1: -34 }, m.hall, 3.2, 0.001);

    // Goldene Bordüre entlang der Flure
    const bord = new GeoBuilder();
    const edge = (x0: number, x1: number, z: number) => bord.quad(x1 - x0, 0.14, C.hallBorder, (x0 + x1) / 2, 0.006, z);
    const edgeZ = (z0: number, z1: number, x: number) => bord.quad(0.14, z1 - z0, C.hallBorder, x, 0.006, (z0 + z1) / 2);
    for (const h of Object.values(HALLS)) {
      edge(h.x0 + 0.5, -SPINE_HALF + 0.35, h.z0 + 0.45);
      edge(SPINE_HALF - 0.35, h.x1 - 0.5, h.z0 + 0.45);
      edge(h.x0 + 0.5, -SPINE_HALF + 0.35, h.z1 - 0.45);
      edge(SPINE_HALF - 0.35, h.x1 - 0.5, h.z1 - 0.45);
    }
    edgeZ(-28.55, -14.45, -SPINE_HALF + 0.45);
    edgeZ(-28.55, -14.45, SPINE_HALF - 0.45);
    edgeZ(-48.55, -34.45, -SPINE_HALF + 0.45);
    edgeZ(-48.55, -34.45, SPINE_HALF - 0.45);
    this.add(vcMesh(bord));

    const wb = new WallBuilder(WALL_H);
    const ow = C.outerWall;
    const cap = C.wallCap;
    // Außenwände (außerhalb der Grundfläche)
    wb.seg(-33.25, -54.5, -33.25, 6.5, 0.5, ow, cap);
    wb.seg(33.25, -54.5, 33.25, 6.5, 0.5, ow, cap, 1.1);
    wb.seg(-33.5, -54.25, 33.5, -54.25, 0.5, ow, cap);
    this.col.add({ x0: -33.6, x1: -33, z0: -54.6, z1: 6.6 });
    this.col.add({ x0: 33, x1: 33.6, z0: -54.6, z1: 6.6 });
    this.col.add({ x0: -33.6, x1: 33.6, z0: -54.6, z1: -54 });

    // Front: Lager und Garage niedrig, Lobby als Glasfassade
    wb.seg(-33.5, 6.25, -15, 6.25, 0.5, ow, cap, 1.0);
    wb.seg(15, 6.25, 20, 6.25, 0.5, ow, cap, 1.0);
    wb.seg(28, 6.25, 33.5, 6.25, 0.5, ow, cap, 1.0);
    this.col.add({ x0: -33.6, x1: -15, z0: 6, z1: 6.5 });
    this.col.add({ x0: 15, x1: 33.6, z0: 6, z1: 6.5 });
    // Lobby-Front: Sockel + Glas, Eingang in der Mitte
    wb.seg(-15, 6.25, -2.7, 6.25, 0.5, C.deskFront, cap, 0.55);
    wb.seg(2.7, 6.25, 15, 6.25, 0.5, C.deskFront, cap, 0.55);
    this.col.add({ x0: -15, x1: -2.7, z0: 6, z1: 6.5 });
    this.col.add({ x0: 2.7, x1: 15, z0: 6, z1: 6.5 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(12.3, 1.45, 0.12), this.mat.glass);
    glass.position.set(-8.85, 1.3, 6.25);
    this.add(glass);
    const glass2 = glass.clone();
    glass2.position.x = 8.85;
    this.add(glass2);
    const frame = new GeoBuilder();
    for (const x of [-15, -11, -7, -2.7, 2.7, 7, 11, 15]) frame.box(0.18, 2.1, 0.2, C.doorFrame, x, 0, 6.25);
    frame.box(12.3, 0.14, 0.22, C.doorFrame, -8.85, 2.02, 6.25);
    frame.box(12.3, 0.14, 0.22, C.doorFrame, 8.85, 2.02, 6.25);
    this.add(vcMesh(frame));
    // Schiebetüren
    for (const s of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 0.1), this.mat.glass);
      d.position.set(s * 1.35, 1.0, 6.25);
      d.userData.baseX = s * 1.35;
      this.lobbyDoors.push(d);
      this.add(d);
    }

    // Lobby-Innenwände
    const lw = 0xffc94a;
    wb.seg(-15, -9, -15, -4.4, 0.5, lw, cap);
    wb.seg(-15, -2.0, -15, 6.0, 0.5, lw, cap, 1.0);
    this.col.add({ x0: -15.25, x1: -14.75, z0: -9, z1: -4.4 });
    this.col.add({ x0: -15.25, x1: -14.75, z0: -2.0, z1: 6 });
    wb.seg(15, -9, 15, 6.0, 0.5, lw, cap, 1.0);
    this.col.add({ x0: 14.75, x1: 15.25, z0: -9, z1: 6 });
    wb.seg(-15, -9.25, -3.6, -9.25, 0.5, lw, cap);
    wb.seg(3.6, -9.25, 15, -9.25, 0.5, lw, cap);
    this.col.add({ x0: -15, x1: -3.6, z0: -9.5, z1: -9 });
    this.col.add({ x0: 3.6, x1: 15, z0: -9.5, z1: -9 });
    // Lager-Rückwand mit Tür zum Flur, Garage-Rückwand
    wb.seg(-33, -9.25, -26.6, -9.25, 0.5, 0x8fa6c8, cap);
    wb.seg(-24.4, -9.25, -15, -9.25, 0.5, 0x8fa6c8, cap);
    this.col.add({ x0: -33, x1: -26.6, z0: -9.5, z1: -9 });
    this.col.add({ x0: -24.4, x1: -15, z0: -9.5, z1: -9 });
    wb.seg(15, -9.25, 33, -9.25, 0.5, 0x9aa3b0, cap);
    this.col.add({ x0: 15, x1: 33, z0: -9.5, z1: -9 });

    const sides = wb.buildSides();
    if (sides) this.add(new THREE.Mesh(sides, this.mat.wall));
    this.add(vcMesh(wb.caps));
  }

  // ---------------------------------------------------------------- Lobby
  private buildLobby() {
    this.floor(LOBBY, this.mat.floor.lobby, 3.75, 0.001);
    const b = new GeoBuilder();
    // Teppich vor dem Tresen (Warteschlange)
    b.group((g) => PR.rug(g, 3.2, 5.2, C.rugLobby, C.lobbyBorder), 0, 0, 3.0);
    b.group((g) => PR.reception(g), P.receptionDesk.x, 0, P.receptionDesk.z);
    this.col.add({ x0: -4.3, x1: 4.3, z0: -1.75, z1: -0.3 });
    // Hotelname auf der Tresenfront (verdeckt nichts, zeigt zur Kamera)
    const deskSign = new THREE.Mesh(
      new THREE.PlaneGeometry(7.6, 0.72),
      new THREE.MeshBasicMaterial({ map: signTexture(GAME_TITLE.toUpperCase(), '#7B2FF7', '#FFD23A', 1024, 97), transparent: true }),
    );
    deskSign.position.set(P.receptionDesk.x, 0.53, P.receptionDesk.z + 0.66);
    this.add(deskSign);
    // Sitzecke links
    b.group((g) => PR.sofa(g, C.sofa, C.sofaCushion, 3.2), -11.8, 0, 0.6, Math.PI / 2);
    b.group((g) => PR.coffeeTable(g, 0xffc94a), -9.5, 0, 0.6);
    this.col.addCentered(-11.8, 0.6, 1.1, 3.3);
    this.col.addCentered(-9.5, 0.6, 1.2, 1.2);
    b.group((g) => PR.plant(g, 1.3), -13.8, 0, 4.9);
    b.group((g) => PR.plant(g, 1.3), 13.8, 0, 4.9);
    this.col.addCentered(-13.8, 4.9, 0.9, 0.9);
    this.col.addCentered(13.8, 4.9, 0.9, 0.9);
    // Sitzecke rechts
    b.group((g) => PR.sofa(g, 0x3a7bf0, 0x6fa8ff, 3.2), 12.0, 0, 1.2, -Math.PI / 2);
    this.col.addCentered(12.0, 1.2, 1.1, 3.3);
    b.group((g) => PR.lampFloor(g), 13.9, 0, -1.4);
    // Automaten
    b.group((g) => PR.vendingMachine(g, C.vending), 13.4, 0, -7.6, -Math.PI / 2);
    this.col.addCentered(13.4, -7.6, 1.0, 1.4);
    b.group((g) => PR.waterCooler(g), 13.8, 0, -5.3);
    this.col.addCentered(13.8, -5.3, 0.6, 0.6);
    // Service-Theke (Sonderwünsche)
    b.rbox(3.2, 1.0, 1.0, 0.1, 0xb85e28, P.serviceBar.x, 0, P.serviceBar.z);
    b.rbox(3.4, 0.1, 1.2, 0.05, C.deskTop, P.serviceBar.x, 1.0, P.serviceBar.z);
    b.cyl(0.1, 0.12, 0.45, 0x2e8b3a, P.serviceBar.x - 1.1, 1.1, P.serviceBar.z, 8);
    b.cyl(0.04, 0.04, 0.18, 0x2e8b3a, P.serviceBar.x - 1.1, 1.55, P.serviceBar.z, 6);
    b.group((g) => PR.plant(g, 0.45, 0x5fd0ff, 0xff5fa8), P.serviceBar.x - 0.3, 1.1, P.serviceBar.z);
    b.rbox(0.6, 0.18, 0.4, 0.05, 0x39a9ff, P.serviceBar.x + 0.5, 1.1, P.serviceBar.z);
    b.cyl(0.12, 0.1, 0.22, 0xffffff, P.serviceBar.x + 1.2, 1.1, P.serviceBar.z, 8);
    this.col.addCentered(P.serviceBar.x, P.serviceBar.z, 3.3, 1.1);
    // Mülleimer
    b.cyl(0.4, 0.34, 0.9, 0x3c4150, P.trash.x, 0, P.trash.z, 12);
    b.cyl(0.44, 0.44, 0.1, 0x5c6170, P.trash.x, 0.9, P.trash.z, 12);
    this.col.addCentered(P.trash.x, P.trash.z, 0.8, 0.8);
    // Bilder an der Rückwand
    b.group((g) => PR.picture(g, 0xff7a3d, 1.6, 1.1), -9, 0.9, -8.95);
    b.group((g) => PR.picture(g, 0x39a9ff, 1.6, 1.1), 9, 0.9, -8.95);
    b.group((g) => PR.plant(g, 1.1), -4.4, 0, -8.2);
    b.group((g) => PR.plant(g, 1.1), 4.4, 0, -8.2);
    this.col.addCentered(-4.4, -8.2, 0.8, 0.8);
    this.col.addCentered(4.4, -8.2, 0.8, 0.8);
    this.add(vcMesh(b));
  }

  // ---------------------------------------------------------------- Lager
  private buildStorage() {
    this.floor(STORAGE, this.mat.floor.storage, 4, 0.001);
    const b = new GeoBuilder();
    // Warnstreifen vor der Palette
    for (let i = 0; i < 8; i++) b.quad(0.4, 0.4, i % 2 === 0 ? C.storageStripeA : C.storageStripeB, P.paperShelf.x - 1.4 + i * 0.4, 0.004, P.paperShelf.z + 1.25);
    b.group((g) => PR.paperPallet(g), P.paperShelf.x, 0, P.paperShelf.z);
    this.col.addCentered(P.paperShelf.x, P.paperShelf.z, 2.5, 1.9);
    b.group((g) => PR.shelfUnit(g, 3.0, true), -30.4, 0, -8.4);
    this.col.addCentered(-30.4, -8.4, 3.0, 0.7);
    b.group((g) => PR.shelfUnit(g, 3.2, false), -32.3, 0, -3.0, Math.PI / 2);
    this.col.addCentered(-32.3, -3.0, 0.7, 3.2);
    b.group((g) => PR.shelfUnit(g, 3.2, false), -32.3, 0, 1.4, Math.PI / 2);
    this.col.addCentered(-32.3, 1.4, 0.7, 3.2);
    for (let i = 0; i < 3; i++) {
      b.group((g) => PR.washer(g), -21.5 + i * 1.15, 0, 5.3, Math.PI);
    }
    this.col.add({ x0: -22.1, x1: -18.1, z0: 4.8, z1: 5.9 });
    b.group((g) => PR.boxStack(g), -16.4, 0, 4.9);
    b.group((g) => PR.boxStack(g), -16.2, 0, -7.9, 0.4);
    this.col.addCentered(-16.4, 4.9, 0.9, 0.9);
    this.col.addCentered(-16.2, -7.9, 0.9, 0.9);
    // Supplier-Posten: kleiner Schreibtisch
    b.rbox(1.6, 0.8, 0.8, 0.06, 0xc98f4e, P.supplierPost.x - 1.6, 0, P.supplierPost.z - 0.4);
    b.rbox(0.5, 0.05, 0.4, 0.02, 0xffffff, P.supplierPost.x - 1.6, 0.8, P.supplierPost.z - 0.4);
    this.col.addCentered(P.supplierPost.x - 1.6, P.supplierPost.z - 0.4, 1.6, 0.8);
    this.add(vcMesh(b));
  }

  // ---------------------------------------------------------------- Garage
  private buildGarage() {
    this.floor(GARAGE, this.mat.floor.garage, 8, 0.001);
    const b = new GeoBuilder();
    // Rampe nach unten
    b.quad(7.2, 8.6, 0x2a2e38, 24, 0.012, -2.6);
    for (let i = 0; i < 6; i++) b.quad(7.2, 0.14, 0xffd93b, 24, 0.016, 1.4 - i * 1.4);
    b.box(0.3, 0.9, 8.8, 0xffd93b, 20.2, 0, -2.6);
    b.box(0.3, 0.9, 8.8, 0xffd93b, 27.8, 0, -2.6);
    // Pfeiler & abgestellte Autos
    for (const x of [17.4, 30.6]) {
      b.group((g) => PR.car(g, x < 20 ? 0x35c8ff : 0xff5fa8), x, 0, -2.5);
    }
    for (const z of [-7.8, 4.6]) {
      b.box(0.8, 2.0, 0.8, 0x9aa3b0, 19.4, 0, z);
      b.box(0.8, 2.0, 0.8, 0x9aa3b0, 28.6, 0, z);
    }
    this.add(vcMesh(b));
    // Spieler kommt nicht in die Garage
    this.col.add({ x0: 19.5, x1: 28.5, z0: 5.6, z1: 6.6, tag: 'garage' });
    // Rolltor (bis der Parkplatz gekauft ist)
    const door = new GeoBuilder();
    for (let i = 0; i < 7; i++) door.box(8.0, 0.28, 0.2, i % 2 === 0 ? 0xff9a2e : 0xffb45a, 24, 0.02 + i * 0.3, 6.2);
    door.rbox(8.6, 0.3, 0.4, 0.08, C.outerWallDark, 24, 2.1, 6.2);
    this.garageDoor = this.add(vcMesh(door));

    // Schranke (erscheint mit dem Kauf)
    const gate = new GeoBuilder();
    gate.group((g) => PR.barrierGate(g), 0, 0, 0);
    this.barrierGroup.add(vcMesh(gate));
    const armB = new GeoBuilder();
    armB.group((g) => PR.barrierArm(g, 4.6), 0, 0, 0);
    const arm = vcMesh(armB);
    arm.matrixAutoUpdate = true;
    arm.position.set(0.05, 1.0, 0);
    this.barrierArm = arm;
    this.barrierGroup.add(arm);
    this.barrierGroup.position.set(P.barrier.x - 2.6, 0, P.barrier.z);
    this.barrierGroup.visible = false;
    // Parken-Schild
    const psign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.2),
      new THREE.MeshBasicMaterial({ map: signTexture('P', '#1464CC', '#FFFFFF', 256, 128), transparent: true }),
    );
    psign.position.set(29.4, 2.9, 6.6);
    psign.rotation.x = -0.35;
    this.add(psign);
    const pole = new GeoBuilder();
    pole.box(0.16, 2.3, 0.16, C.lampPost, 29.4, 0, 6.55);
    this.add(vcMesh(pole));
  }

  setGarageOpen(open: boolean) {
    if (this.garageDoor) this.garageDoor.visible = !open;
    this.barrierGroup.visible = open;
  }

  // ---------------------------------------------------------------- Aufzug & Lounge
  private buildElevatorArea() {
    // Baustelle / Aufzug werden per setElevator umgeschaltet
    this.setElevator(false);
  }

  setElevator(built: boolean) {
    this.elevatorGroup.clear();
    this.loungeGroup.clear();
    for (const c of this.elevatorCol) this.col.remove(c);
    for (const c of this.loungeCol) this.col.remove(c);
    this.elevatorCol = [];
    this.loungeCol = [];
    this.elevatorDoors = [];
    const ex = P.elevator.x;
    const ez = P.elevator.z;
    const b = new GeoBuilder();
    if (built) {
      b.group((g) => PR.elevatorDoorFrame(g), ex, 0, ez - 0.25);
      for (const s of [-1, 1]) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(1.32, 2.36, 0.12), new THREE.MeshLambertMaterial({ color: 0xd8dee8 }));
        d.position.set(ex + s * 0.67, 1.23, ez + 0.1);
        d.userData.baseX = ex + s * 0.67;
        this.elevatorDoors.push(d);
        this.elevatorGroup.add(d);
      }
      b.group((g) => PR.plant(g, 1.2), ex - 2.6, 0, ez + 0.3);
      b.group((g) => PR.plant(g, 1.2), ex + 2.6, 0, ez + 0.3);
    } else {
      b.group((g) => PR.scaffold(g, 3.6, 2.8), ex, 0, ez - 0.1);
      b.group((g) => PR.trafficCone(g), ex - 2.2, 0, ez + 0.6);
      b.group((g) => PR.trafficCone(g), ex + 2.2, 0, ez + 0.6);
    }
    this.elevatorCol.push(this.col.add({ x0: ex - 1.9, x1: ex + 1.9, z0: ez - 0.7, z1: ez + 0.35 }));
    this.elevatorGroup.add(vcMesh(b));

    // Lounge in Reihe 4 links
    const lr = { x0: -33, x1: -3, z0: ROWS[4].z0, z1: ROWS[4].z1 };
    const lb = new GeoBuilder();
    if (built) {
      const f = new THREE.Mesh(floorGeometry(lr.x0, lr.x1, lr.z0, lr.z1, 3.2, 0.002), this.mat.floor.lounge);
      this.loungeGroup.add(f);
      const wb = new WallBuilder(WALL_H);
      const lc = 0xff8fb0;
      wb.seg(lr.x0, lr.z1 - 0.125, lr.x1, lr.z1 - 0.125, 0.25, lc, C.wallCap, 1.05);
      wb.seg(lr.x1 - 0.125, lr.z0, lr.x1 - 0.125, lr.z1, 0.25, lc, C.wallCap, 1.05);
      const sides = wb.buildSides();
      if (sides) this.loungeGroup.add(new THREE.Mesh(sides, this.mat.wall));
      this.loungeGroup.add(vcMesh(wb.caps));
      this.loungeCol.push(this.col.add({ x0: lr.x0, x1: lr.x1, z0: lr.z1 - 0.25, z1: lr.z1 }));
      this.loungeCol.push(this.col.add({ x0: lr.x1 - 0.25, x1: lr.x1, z0: lr.z0, z1: lr.z1 }));
      const cz = (lr.z0 + lr.z1) / 2;
      lb.group((g) => PR.fountain(g), -18, 0, cz);
      this.loungeCol.push(this.col.addCentered(-18, cz, 3.2, 3.2));
      lb.group((g) => PR.sofa(g, 0x9b4dff, 0xc79bff, 3.0), -26, 0, cz + 1.8, Math.PI);
      lb.group((g) => PR.sofa(g, 0x9b4dff, 0xc79bff, 3.0), -10, 0, cz + 1.8, Math.PI);
      lb.group((g) => PR.piano(g), -29.5, 0, cz - 1.4, Math.PI / 2);
      lb.group((g) => PR.palm(g, 1.4), -5.2, 0, cz - 2.3);
      lb.group((g) => PR.palm(g, 1.4), -31.6, 0, cz + 2.4);
      lb.group((g) => PR.coffeeTable(g, 0xffc42e), -26, 0, cz - 0.6);
      lb.group((g) => PR.coffeeTable(g, 0xffc42e), -10, 0, cz - 0.6);
      this.loungeCol.push(this.col.addCentered(-26, cz + 1.8, 3.1, 1.2));
      this.loungeCol.push(this.col.addCentered(-10, cz + 1.8, 3.1, 1.2));
      this.loungeCol.push(this.col.addCentered(-29.5, cz - 1.4, 1.5, 1.9));
    } else {
      const f = new THREE.Mesh(floorGeometry(lr.x0, lr.x1, lr.z0, lr.z1, 7.5, 0.002), this.mat.floor.foundation);
      this.loungeGroup.add(f);
      lb.group((g) => PR.fence(g, 29.4), -18, 0, lr.z0 - 0.2);
      lb.group((g) => PR.trafficCone(g), -8, 0, lr.z0 + 1.2);
      lb.group((g) => PR.trafficCone(g), -27, 0, lr.z0 + 1.6);
      this.loungeCol.push(this.col.add({ x0: -33, x1: -3.1, z0: lr.z0 - 0.4, z1: lr.z0 }));
    }
    // Rückwand der Lounge zum Mittelflur hin schließen
    this.loungeCol.push(this.col.add({ x0: -3.25, x1: -3, z0: lr.z0, z1: lr.z1 }));
    if (!lb.empty) this.loungeGroup.add(vcMesh(lb));
  }

  // ---------------------------------------------------------------- Zonen
  setZoneLocked(zone: number, locked: boolean) {
    const cur = this.zoneFences.get(zone);
    if (cur) {
      cur.obj.removeFromParent();
      (cur.obj as THREE.Mesh).geometry?.dispose();
      for (const c of cur.col) this.col.remove(c);
      this.zoneFences.delete(zone);
    }
    if (locked) {
      const r = zoneRect(zone);
      const d = doorLine(zone);
      const b = new GeoBuilder();
      const fz = d.z + d.out * 0.2;
      b.group((g) => PR.fence(g, r.x1 - r.x0 - 0.4), (r.x0 + r.x1) / 2, 0, fz);
      const side = ZONES[zone].side;
      b.group((g) => PR.trafficCone(g), side * 8, 0, d.z - d.out * 1.4);
      b.group((g) => PR.trafficCone(g), side * 26, 0, d.z - d.out * 2.2);
      b.group((g) => PR.boxStack(g), side * 14, 0, d.z - d.out * 3.8);
      const obj = vcMesh(b);
      this.add(obj);
      const col = [this.col.add({ x0: r.x0 + 0.1, x1: r.x1 - 0.1, z0: Math.min(fz, d.z) - 0.25, z1: Math.max(fz, d.z) + 0.25 })];
      // Mittelflur-Seite der Zone ebenfalls sperren
      const sx = side * SPINE_HALF;
      col.push(this.col.add({ x0: sx - 0.15, x1: sx + 0.15, z0: r.z0, z1: r.z1 }));
      this.zoneFences.set(zone, { obj, col });
    }
    // Reinigungswagen am Posten
    const cart = this.cleanerCarts.get(zone);
    if (!locked && !cart) {
      const p = cleanerPost(zone);
      const b = new GeoBuilder();
      b.group((g) => PR.cleaningCart(g), p.x + ZONES[zone].side * 1.3, 0, p.z, Math.PI / 2);
      const m = vcMesh(b);
      this.cleanerCarts.set(zone, m);
      this.add(m);
      this.col.addCentered(p.x + ZONES[zone].side * 1.3, p.z, 0.8, 1.2);
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
      const target = nearDoor ? base + Math.sign(base) * 2.3 : base;
      d.position.x += (target - d.position.x) * Math.min(1, dt * 8);
    }
    // Aufzug fährt: Türen öffnen sich regelmäßig
    if (this.elevatorDoors.length) {
      const open = t % 9 > 6;
      for (const d of this.elevatorDoors) {
        const base = d.userData.baseX as number;
        const target = open ? base + Math.sign(base - P.elevator.x) * 1.2 : base;
        d.position.x += (target - d.position.x) * Math.min(1, dt * 5);
      }
    }
  }
}

