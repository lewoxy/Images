import * as THREE from 'three';
import { C } from '../config/palette';
import * as TX from './textures';

/** Gemeinsame Materialien (einmal erzeugt, von allen Meshes geteilt). */
export class Materials {
  wall: THREE.MeshLambertMaterial;
  floor: Record<string, THREE.MeshLambertMaterial> = {};
  shadow: THREE.MeshBasicMaterial;
  ring: THREE.MeshBasicMaterial;
  chevron: THREE.MeshBasicMaterial;
  glass: THREE.MeshLambertMaterial;
  dark: THREE.MeshBasicMaterial;

  constructor() {
    this.wall = new THREE.MeshLambertMaterial({ vertexColors: true, map: TX.wallStripes() });
    const lam = (t: THREE.Texture) => new THREE.MeshLambertMaterial({ map: t });
    this.floor.t1 = lam(TX.chevronParquet(C.t1Floor, C.t1FloorDark));
    this.floor.t2 = lam(TX.planks(C.t2Floor, C.t2FloorDark));
    this.floor.t3 = lam(TX.tiles(C.t3Floor, C.t3FloorDark, 6));
    this.floor.deluxe = lam(TX.checker(0xffd66b, 0xffc02e, 4));
    this.floor.lobby = lam(TX.checker(C.lobbyTileA, C.lobbyTileB, 4));
    this.floor.hall = lam(TX.carpet(C.hallCarpet, C.hallCarpetDark));
    this.floor.wc = lam(TX.tiles(C.wcTileA, C.wcTileB, 8));
    this.floor.storage = lam(TX.concrete(0xaab3c0, 0x959fad));
    this.floor.foundation = lam(TX.concrete(C.foundation, C.foundationLine));
    this.floor.garage = lam(TX.garageFloor());
    this.floor.street = lam(TX.asphalt());
    this.floor.sidewalk = lam(TX.pavers());
    this.floor.grass = lam(TX.grass());
    this.floor.lounge = lam(TX.planks(0xd9a066, 0xb97a3e));
    this.shadow = new THREE.MeshBasicMaterial({ map: TX.blobShadow(), transparent: true, depthWrite: false });
    this.ring = new THREE.MeshBasicMaterial({ map: TX.ringTexture(), transparent: true, depthWrite: false, color: 0xffffff });
    this.chevron = new THREE.MeshBasicMaterial({ map: TX.chevronTexture(), transparent: true, depthWrite: false });
    this.glass = new THREE.MeshLambertMaterial({ color: C.glass, transparent: true, opacity: 0.35, depthWrite: false });
    this.dark = new THREE.MeshBasicMaterial({ color: 0x0a0d2e, transparent: true, opacity: 0, depthWrite: false });
  }

  roomFloor(tier: number, design: number): THREE.MeshLambertMaterial {
    if (design === 2 && tier >= 2) return this.floor.deluxe;
    return tier >= 3 ? this.floor.t3 : tier === 2 ? this.floor.t2 : this.floor.t1;
  }
}
