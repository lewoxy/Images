/**
 * Farbpalette. Die Originaldatei `mph-farbpalette.json` lag nicht bei – die Werte
 * sind eigene, folgen aber den drei Stilregeln aus §15:
 *  1. Sättigung fast durchweg über 70 %,
 *  2. jede Zimmerstufe ist ein eigener Farbakkord
 *     (Stufe 1 grün-braun-blau, Stufe 2 türkis-beige-grün, Stufe 3 hellgrün-cyan-gold),
 *  3. Weiß nur als Outline/Text bzw. Kleinstdetail, nie als Fläche.
 */

export const UI = {
  purple: '#7B2FF7',
  purpleDark: '#4A1AA8',
  purpleDeep: '#2E0F73',
  purpleLight: '#A56BFF',
  /** §15: HUD-Leiste #1D4946 bei ≈ 55 % Deckkraft */
  hudBar: 'rgba(29, 73, 70, 0.55)',
  cash: '#3BD65A',
  cashDark: '#1B9C3B',
  gem: '#39A9FF',
  gemDark: '#1464CC',
  star: '#FFC62B',
  starDark: '#E68600',
  token: '#FFB02E',
  candy: '#FF5FA8',
  toiletpaper: '#5FD0FF',
  badge: '#F2303F',
  text: '#FFFFFF',
  outline: '#2B1457',
};

export const C = {
  // Außenbereich
  grass: 0x68c943,
  grassDark: 0x55b336,
  road: 0x4a4f5c,
  roadLine: 0xf3f3f3,
  sidewalk: 0xcfd5de,
  sidewalkDark: 0xb7bfcb,
  curb: 0x98a2b0,
  treeTrunk: 0x8b5a2b,
  treeLeaf: 0x2fae4f,
  treeLeaf2: 0x46c85c,
  bush: 0x3bbf55,
  lampPost: 0x3c4150,
  lampLight: 0xfff1a8,

  // Gebäude
  outerWall: 0xe8733c,
  outerWallDark: 0xcc5c2b,
  wallCap: 0xffe2b5,
  wallCapDark: 0xf3c98e,
  foundation: 0xb9c0cb,
  foundationLine: 0x9aa3b1,
  glass: 0x8fe3ff,
  doorFrame: 0x8a4b2a,

  // Lobby
  lobbyTileA: 0x9ee6f1,
  lobbyTileB: 0x77d2e4,
  lobbyBorder: 0xf2b83a,
  deskWood: 0xd9793a,
  deskWoodDark: 0xb85e28,
  deskFront: 0x7b2ff7,
  deskTop: 0xffd27a,
  sofa: 0xf5842b,
  sofaCushion: 0xffa84a,
  plantLeaf: 0x37b84c,
  plantPot: 0xe0603a,
  rugLobby: 0xe8445a,
  vending: 0x3a7bf0,
  sign: 0x7b2ff7,

  // Flur
  hallCarpet: 0x5b63de,
  hallCarpetDark: 0x4a50c4,
  hallBorder: 0xffc53d,

  // Zimmer – Stufe 1 (grün-braun-blau)
  t1Wall: 0x3daa56,
  t1WallStripe: 0x35994c,
  t1Floor: 0xd8742c,
  t1FloorDark: 0xbf5f22,
  t1BedFrame: 0xf07b28,
  t1Blanket: 0x4a7fe8,
  t1Rug: 0x3aa0e8,
  t1Night: 0xe86a28,

  // Stufe 2 (türkis-beige-grün)
  t2Wall: 0x25c2c0,
  t2WallStripe: 0x1fadab,
  t2Floor: 0xe8c78d,
  t2FloorDark: 0xd6ad6a,
  t2BedFrame: 0xc98f4e,
  t2Blanket: 0x52c957,
  t2Rug: 0xf5a93a,
  t2Night: 0xb97a3e,

  // Stufe 3 (hellgrün-cyan-gold)
  t3Wall: 0x98e06a,
  t3WallStripe: 0x86cf58,
  t3Floor: 0x4fd0ee,
  t3FloorDark: 0x36b9db,
  t3BedFrame: 0xffbf2e,
  t3Blanket: 0x2fc8e6,
  t3Rug: 0xffd84a,
  t3Night: 0xf2a922,

  // Deluxe-Akzente
  deluxeGold: 0xffc42e,
  deluxePurple: 0x9b4dff,
  deluxePink: 0xff5fa8,

  pillow: 0xf2f6ff,
  sheet: 0xe9f0ff,
  lampShade: 0xffe07a,
  picture: 0xff7a3d,
  pictureFrame: 0x8a4b2a,

  // WC
  wcTileA: 0xbfe9ff,
  wcTileB: 0x94d5f7,
  wcWall: 0x6cc4f0,
  wcStall: 0xe2463a,
  wcToilet: 0xffe27a,
  wcToiletSeat: 0xffc933,
  wcSink: 0xd8f2ff,
  paper: 0xf6f3ea,

  // Lager
  storageFloor: 0xaab3c0,
  storageStripeA: 0xffd23a,
  storageStripeB: 0x3b3f4a,
  shelf: 0x9a5b2e,
  box: 0xd9964a,
  washer: 0xe8eef8,

  // Garage
  garageFloor: 0x626a78,
  garageLine: 0xffd93b,
  barrierPole: 0xf2f2f2,
  barrierRed: 0xe63a3a,

  // Geld
  cashBill: 0x3fcf52,
  cashBillDark: 0x25a43c,
  cashBand: 0xf6ffe8,

  // Schmutz
  dirtSheet: 0xdcd6c8,
  dirtTrash: 0x8b8b8b,
  dirtStain: 0x8a6a3a,
  banana: 0xffd23a,

  // Figuren
  playerUniform: 0x6c3ce9,
  playerUniformDark: 0x4b25b5,
  playerTrim: 0xffc933,
  playerPants: 0x3a2394,
  shoe: 0x2a2233,
  eye: 0x1c1a24,
  cheek: 0xff9aa6,

  cleanerUniform: 0x2ec98c,
  cleanerBand: 0xfff3a8,
  receptionVest: 0xe8423a,
  receptionShirt: 0xfff0d6,
  supplierOveralls: 0xff9a2e,
  supplierCap: 0xffd23a,
  parkerJacket: 0x2b4fb8,
  parkerCap: 0xe23b3b,
  helperGold: 0xffc42e,
};

export const SKIN = [0xf5c9a6, 0xeab28a, 0xcf9168, 0x9a6441, 0xf7d7bd, 0x7a4a2e];
export const HAIR = [0x3b2a20, 0x6b4226, 0xe8b64c, 0xc0452b, 0x1e1e24, 0x9e9e9e, 0xf2d06b];
export const SHIRTS = [0xe84a5f, 0x3fa7f5, 0xf9c846, 0x8e5cf7, 0x46c97a, 0xff8a3d, 0xf06cc0, 0x2fc4b2, 0xff5a4a, 0x5b7cff];
export const PANTS = [0x2e3a59, 0x4b3f72, 0x5a4636, 0x33475b, 0x1f6f8b, 0x6b2f4a];
export const CAR_COLORS = [0x2f6bff, 0xff5a3c, 0xffc62b, 0x2ec98c, 0x9b4dff, 0xff5fa8, 0x35c8ff, 0xf2f2f2];

export interface TierColors {
  wall: number;
  stripe: number;
  floor: number;
  floorDark: number;
  bedFrame: number;
  blanket: number;
  rug: number;
  night: number;
}

export function tierColors(tier: number, design: number): TierColors {
  const base: TierColors =
    tier >= 3
      ? { wall: C.t3Wall, stripe: C.t3WallStripe, floor: C.t3Floor, floorDark: C.t3FloorDark, bedFrame: C.t3BedFrame, blanket: C.t3Blanket, rug: C.t3Rug, night: C.t3Night }
      : tier === 2
        ? { wall: C.t2Wall, stripe: C.t2WallStripe, floor: C.t2Floor, floorDark: C.t2FloorDark, bedFrame: C.t2BedFrame, blanket: C.t2Blanket, rug: C.t2Rug, night: C.t2Night }
        : { wall: C.t1Wall, stripe: C.t1WallStripe, floor: C.t1Floor, floorDark: C.t1FloorDark, bedFrame: C.t1BedFrame, blanket: C.t1Blanket, rug: C.t1Rug, night: C.t1Night };
  if (design === 1) {
    // Alternative: Akzentfarben getauscht
    return { ...base, blanket: base.rug, rug: base.blanket };
  }
  if (design === 2) {
    // Deluxe: Gold/Violett-Akzente
    return { ...base, bedFrame: C.deluxeGold, blanket: C.deluxePurple, rug: C.deluxePink };
  }
  return base;
}
