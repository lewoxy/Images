import * as THREE from 'three';
import { C, MEASURED as M, STYLE } from '../config/palette';
import { cel, type CelMaterial } from './cel';
import * as TX from './textures';

/**
 * Gemeinsame Materialien (einmal erzeugt, von allen Meshes geteilt). Alle
 * Weltmaterialien sind Cel-Materialien (drei Stufen, flat shaded); Wände
 * zusätzlich mit Durchblick um die Spielfigur.
 */
export class Materials {
  floor: Record<string, CelMaterial> = {};
  wall: Record<string, CelMaterial> = {};
  shadow: THREE.MeshBasicMaterial;
  ring: THREE.MeshBasicMaterial;
  chevron: THREE.MeshBasicMaterial;
  glass: CelMaterial;
  dark: THREE.MeshBasicMaterial;
  door: CelMaterial;
  private cache = new Map<string, CelMaterial>();

  constructor() {
    const f = (t: THREE.Texture) => cel({ map: t });
    this.floor.t1 = f(TX.parquet(C.t1Floor, C.t1FloorDark));
    this.floor.t2 = f(TX.diamondTiles(C.t2Floor, C.t2FloorDark));
    this.floor.t3 = f(TX.latticeFloor(C.t3Floor, C.t3FloorDark));
    this.floor.deluxe = f(TX.diamondTiles(0xffe08a, STYLE.gold));
    this.floor.lobby = f(TX.lobbyFloor(C.lobbyTileA, C.lobbyTileB, STYLE.lead));
    this.floor.hall = f(TX.hallFloor(C.hallFloorA, C.hallFloorB));
    this.floor.wc = f(TX.checker(C.wcTileA, C.wcTileB, 4));
    this.floor.storage = f(TX.checker(0xc6d8e4, STYLE.neutralBlue, 4, 0xb2c9d8));
    this.floor.foundation = f(TX.foundation(C.foundation, C.foundationLine));
    this.floor.forecourt = f(TX.stoneTiles(C.stone, C.stoneJoint));
    this.floor.street = f(TX.road(C.road));
    this.floor.sidewalk = f(TX.checker(C.sidewalk, 0xb3cfdc, 2, 0x9dc3d3));
    this.floor.grass = f(TX.grass(C.grass, C.grassDark, 0x5fcf2a));
    this.floor.lounge = f(TX.hallFloor(M.korridor.bodenSand, 0xd6b865));
    this.floor.lot = f(TX.road(C.road));

    const w = (t: THREE.Texture) => cel({ map: t, vertexColors: true, cutaway: true });
    this.wall.t1 = w(TX.wallStripes(C.t1Wall, C.t1WallStripe));
    this.wall.t2 = w(TX.wallDiamonds(C.t2Wall, C.t2WallStripe));
    this.wall.t3 = w(TX.wallBlossom(C.t3Wall, C.t3WallStripe));
    this.wall.deluxe = w(TX.wallDiamonds(0xffd66b, STYLE.gold));
    this.wall.wc = w(TX.wallWC(C.wcWall, C.wcTileA, M.sanitaer.beckenCyan));
    this.wall.hall = w(TX.wallHall(C.hallWall, M.korridor.laeuferViolett, STYLE.gold));
    this.wall.lobby = w(TX.wallPlain(STYLE.neutralBlue, STYLE.lead, STYLE.gold));
    this.wall.facade = w(TX.wallPlain(0xc9dbe6, STYLE.mutedBlue, 0xf9faf7, true));
    this.wall.court = w(TX.wallPlain(0xe3f3f6, STYLE.emerald, 0xf9faf7, true));
    this.wall.bare = w(TX.wallPlain(0xdbe7ef, 0xb9cbd8, 0xf9faf7));
    this.wall.storage = w(TX.wallPlain(0xd0e0ea, STYLE.mutedBlue, STYLE.gold));
    this.wall.elevator = w(TX.wallPlain(0xf2c80b, STYLE.lead, 0xf9faf7));

    this.shadow = new THREE.MeshBasicMaterial({ map: TX.blobShadow(), transparent: true, depthWrite: false });
    this.ring = new THREE.MeshBasicMaterial({ map: TX.ringTexture(), transparent: true, depthWrite: false, color: 0xffffff });
    this.chevron = new THREE.MeshBasicMaterial({ map: TX.chevronTexture(), transparent: true, depthWrite: false });
    this.glass = cel({ color: C.glass, transparent: true, opacity: 0.38 });
    this.dark = new THREE.MeshBasicMaterial({ color: 0x241a5c, transparent: true, opacity: 0, depthWrite: false });
    this.door = cel({ color: C.door });
  }

  /** Materialschlüssel → Wandmaterial (für Walls.build) */
  wallMat = (key: string): THREE.Material => this.wall[key] ?? this.wall.bare;

  roomFloor(tier: number, design: number): CelMaterial {
    if (design === 2 && tier === 2) return this.floor.deluxe;
    return tier >= 3 ? this.floor.t3 : tier === 2 ? this.floor.t2 : this.floor.t1;
  }

  roomWallKey(tier: number, design: number): string {
    if (design === 2 && tier === 2) return 'deluxe';
    return tier >= 3 ? 't3' : tier === 2 ? 't2' : 't1';
  }

  /** Texturiertes Material mit Cache (Textilien, Teppiche, Bilder) */
  textured(key: string, make: () => THREE.Texture, opts: { cutaway?: boolean } = {}): CelMaterial {
    let m = this.cache.get(key);
    if (!m) {
      m = cel({ map: make(), cutaway: opts.cutaway });
      this.cache.set(key, m);
    }
    return m;
  }

  colored(color: number): CelMaterial {
    const key = 'c' + color;
    let m = this.cache.get(key);
    if (!m) {
      m = cel({ color });
      this.cache.set(key, m);
    }
    return m;
  }
}
