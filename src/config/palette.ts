/**
 * Farbpalette nach `mph-farbpalette.json` (gemessen aus Gameplay-Frames, ±3 je
 * Kanal) und der 16-Farben-Palette des Stilhandbuchs (§4). Farbwerte sind nicht
 * geschützt; sie dienen als Stilreferenz für die eigenen, prozedural gebauten
 * Assets. Regeln aus dem Stilhandbuch: Sättigung ≥ 0,5 (außer Neutralflächen),
 * Helligkeit ≥ 0,4, kein Schwarz, Tiefe über Komplementärkontrast.
 */

/** Messwerte aus `mph-farbpalette.json` (unverändert) */
export const MEASURED = {
  umgebung: { rasen: 0x46ba0e, rasenScreenshot: 0x56ab41, baumHell: 0x16a15b, baumDunkel: 0x068a44, strasseAsphalt: 0x9dc3d3, strasseMarkierung: 0xe3f3f6 },
  ui: {
    navleiste: 0x8048cf,
    navleisteAktiv: 0xdfb8fe,
    navleisteGlow: 0xc989ff,
    navleisteTrenner: 0x5c3593,
    hudUeberlagerung: 0x1d4946,
    hudKomposit: 0x455f46,
    outlineWeiss: 0xf9faf7,
    fortschrittGruen: 0x92d535,
    badgeRot: 0xff2b1d,
    badgeCyan: 0x22c8e8,
    goldStern: 0xf8aa16,
    goldSternHell: 0xfecc06,
  },
  waehrung: { cash: 0x4bb710, cashHell: 0xc4ff3a, gem: 0x339eff, gemHell: 0x62a5d3, token: 0xf7ca11, bonbon: 0xff5fa2 },
  zimmerStufe1: { bodenParkett: 0xd37242, wandHell: 0x4bb375, wandDunkel: 0x38805b, bettDecke: 0x76a5d4, bettKissen: 0xfad6a8, moebelRot: 0x972235, vorhangOliv: 0x81a707 },
  zimmerStufe2: { bodenFliese: 0xe5c7aa, wandTuerkis: 0x5edaea, teppichBlau: 0x429ebc, deckeDunkel: 0x1c9c43, deckeHell: 0x42e978, rahmenHolz: 0xde5e2a, lampeGelb: 0xe5ba14 },
  zimmerStufe3: { wandGruen: 0x6ee602, wandMuster: 0x26902d, bodenHellgruen: 0xaeea8c, rundbettCyan: 0x0bcaf2, rahmenGold: 0xeea127, highlight: 0xdafafb },
  sanitaer: { bodenBeige: 0xeed3b0, wandRotbraun: 0x9c3734, keramikGelb: 0xf7ca11, beckenCyan: 0x15f8fa, holzTan: 0xbf8e62 },
  korridor: { laeuferViolett: 0x8b48e2, laeuferDunkel: 0x7f06b9, wandMagenta: 0xd804e7, bodenRosa: 0xe09be4, laeuferGruen: 0x16a15b, bodenSand: 0xe4ce87 },
  figur: { uniform: 0xe40151, hut: 0x700344, haut: 0xffd39d, borteGold: 0xf2c80b },
};

/** Stilhandbuch §4: die 16 Hauptfarben (nach Flächenanteil) */
export const STYLE = {
  lead: 0x06c2cd, // Türen, Akzentwände, Markenelemente
  neutralBlue: 0xa9c4d9, // Wände, Decken, kühle Flächen
  hedge: 0x70c210,
  lawn: 0xa9d200,
  mutedBlue: 0x5585a1, // Beton, Fahrbahn, Schattenflächen
  signalRed: 0xd33429,
  darkTeal: 0x207c6b,
  magenta: 0x9e12a1,
  gold: 0xf6b91c,
  emerald: 0x10af78,
  lilac: 0xd7bed9,
  pink: 0xdf1775,
  coral: 0xdd4d3c,
  sand: 0xcfc29a,
  orange: 0xf38b1f,
  grass: 0x6ab040,
};

const M = MEASURED;

export const UI = {
  nav: '#8048CF',
  navActive: '#DFB8FE',
  navGlow: '#C989FF',
  navDivider: '#5C3593',
  hudBar: 'rgba(29, 73, 70, 0.55)',
  cash: '#4BB710',
  cashLight: '#C4FF3A',
  gem: '#339EFF',
  gemLight: '#62A5D3',
  star: '#F8AA16',
  starLight: '#FECC06',
  token: '#F7CA11',
  candy: '#FF5FA2',
  toiletpaper: '#22C8E8',
  badge: '#FF2B1D',
  progress: '#92D535',
  outline: '#F9FAF7',
};

export const C = {
  // Außenbereich
  grass: M.umgebung.rasen,
  grassDark: 0x3a9e0b,
  grassLight: M.umgebung.rasenScreenshot,
  road: M.umgebung.strasseAsphalt,
  roadLine: M.umgebung.strasseMarkierung,
  sidewalk: 0xc4dbe5,
  sidewalkDark: 0xa9c4d9,
  stone: 0xbcd5e0,
  stoneJoint: 0x8fb3c6,
  curb: 0xe3f3f6,
  treeTrunk: 0xa8643a,
  treeLeaf: M.umgebung.baumDunkel,
  treeLeaf2: M.umgebung.baumHell,
  bush: STYLE.hedge,
  lampPost: STYLE.mutedBlue,
  lampLight: 0xfff3a0,
  fence: 0xf9faf7,
  fenceShade: 0xd7e4ec,

  // Gebäude
  outerWall: STYLE.neutralBlue,
  outerWallDark: STYLE.mutedBlue,
  wallCap: 0xf9faf7,
  wallCapDark: 0xe3f3f6,
  foundation: 0xb9cbd8,
  foundationLine: 0x93adc2,
  glass: 0x9ff3ff,
  doorFrame: STYLE.lead,
  door: STYLE.lead,
  doorDark: 0x0597a0,

  // Lobby (Sand-Boden, grüner Läufer, Leitfarbe Türkis)
  lobbyTileA: M.korridor.bodenSand,
  lobbyTileB: 0xd6b865,
  lobbyBorder: STYLE.gold,
  lobbyWall: STYLE.neutralBlue,
  lobbyAccent: STYLE.lead,
  deskWood: M.zimmerStufe2.rahmenHolz,
  deskWoodDark: 0xb8471c,
  deskFront: STYLE.lead,
  deskTop: STYLE.gold,
  sofa: STYLE.coral,
  sofaCushion: 0xf27a5c,
  plantLeaf: STYLE.emerald,
  plantPot: STYLE.coral,
  rugLobby: M.korridor.laeuferGruen,
  vending: STYLE.signalRed,
  sign: STYLE.lead,

  // Flure
  hallFloorA: M.korridor.bodenRosa,
  hallFloorB: 0xcf84d4,
  hallWall: M.korridor.wandMagenta,
  hallCarpet: M.korridor.laeuferViolett,
  hallCarpetDark: M.korridor.laeuferDunkel,
  hallBorder: STYLE.gold,

  // Zimmer – Stufe 1 (Grün, Parkett, Rot, Oliv)
  t1Wall: M.zimmerStufe1.wandHell,
  t1WallStripe: M.zimmerStufe1.wandDunkel,
  t1Floor: M.zimmerStufe1.bodenParkett,
  t1FloorDark: 0xb35a2f,
  t1BedFrame: M.zimmerStufe1.moebelRot,
  t1Blanket: M.zimmerStufe1.bettDecke,
  t1Rug: STYLE.coral,
  t1Night: M.zimmerStufe1.moebelRot,

  // Stufe 2 (Türkis, Fliese, Blau, Holz)
  t2Wall: M.zimmerStufe2.wandTuerkis,
  t2WallStripe: 0x3fbfd0,
  t2Floor: M.zimmerStufe2.bodenFliese,
  t2FloorDark: 0xd3ad8c,
  t2BedFrame: M.zimmerStufe2.rahmenHolz,
  t2Blanket: M.zimmerStufe2.deckeDunkel,
  t2Rug: M.zimmerStufe2.teppichBlau,
  t2Night: M.zimmerStufe2.rahmenHolz,

  // Stufe 3 (Hellgrün, Muster, Cyan, Gold)
  t3Wall: M.zimmerStufe3.wandGruen,
  t3WallStripe: M.zimmerStufe3.wandMuster,
  t3Floor: M.zimmerStufe3.bodenHellgruen,
  t3FloorDark: 0x8fd96a,
  t3BedFrame: M.zimmerStufe3.rahmenGold,
  t3Blanket: M.zimmerStufe3.rundbettCyan,
  t3Rug: STYLE.magenta,
  t3Night: M.zimmerStufe3.rahmenGold,

  // Deluxe-Akzente
  deluxeGold: STYLE.gold,
  deluxePurple: STYLE.magenta,
  deluxePink: STYLE.pink,

  pillow: M.zimmerStufe1.bettKissen,
  sheet: 0xf9faf7,
  lampShade: M.zimmerStufe2.lampeGelb,
  picture: STYLE.orange,
  pictureFrame: M.zimmerStufe3.rahmenGold,
  curtain: M.zimmerStufe1.vorhangOliv,

  // WC
  wcTileA: M.sanitaer.bodenBeige,
  wcTileB: 0xdcb98f,
  wcWall: M.sanitaer.wandRotbraun,
  wcStall: M.sanitaer.holzTan,
  wcToilet: M.sanitaer.keramikGelb,
  wcToiletSeat: 0xe0b10a,
  wcSink: M.sanitaer.beckenCyan,
  paper: 0xf9faf7,

  // Lager
  storageFloor: STYLE.neutralBlue,
  storageStripeA: STYLE.gold,
  storageStripeB: STYLE.mutedBlue,
  shelf: STYLE.lead,
  box: STYLE.sand,
  washer: 0xe3f3f6,

  // Parkplatz
  garageFloor: M.umgebung.strasseAsphalt,
  garageLine: M.umgebung.strasseMarkierung,
  barrierPole: 0xf9faf7,
  barrierRed: STYLE.signalRed,

  // Geld
  cashBill: M.waehrung.cash,
  cashBillDark: 0x3a9a0c,
  cashBand: M.waehrung.cashHell,

  // Schmutz (kein Schwarz: warme, mittelhelle Töne)
  dirtSheet: 0xe8dcc4,
  dirtTrash: 0xa9b4c0,
  dirtStain: 0x9c7a3c,
  banana: M.waehrung.token,

  // Figuren
  playerUniform: M.figur.uniform,
  playerUniformDark: 0xb0003f,
  playerTrim: M.figur.borteGold,
  playerHat: M.figur.hut,
  playerSkin: M.figur.haut,
  playerPants: M.figur.hut,
  shoe: 0x5c3593,
  eye: 0x3a2270,
  cheek: 0xff8fa0,

  cleanerUniform: STYLE.emerald,
  cleanerBand: 0xfff3a8,
  receptionVest: STYLE.lead,
  receptionShirt: 0xf9faf7,
  supplierOveralls: STYLE.orange,
  supplierCap: STYLE.gold,
  parkerJacket: 0x339eff,
  parkerCap: STYLE.signalRed,
  helperGold: STYLE.gold,
};

export const SKIN = [M.figur.haut, 0xf5c9a6, 0xeab28a, 0xcf9168, 0xb07a52, 0xf7d7bd];
export const HAIR = [0x7a4a2e, 0xa8643a, 0xe8b64c, 0xd33429, 0x5c3593, 0xa9b4c0, 0xf2d06b];
export const SHIRTS = [STYLE.signalRed, STYLE.lead, STYLE.gold, STYLE.magenta, STYLE.emerald, STYLE.orange, STYLE.pink, 0x339eff, STYLE.coral, 0x8b48e2, STYLE.lawn];
export const PANTS = [STYLE.mutedBlue, 0x5c3593, 0x7a4a2e, STYLE.darkTeal, 0x3f6fb5, 0x8b2f5a];
/** Fahrzeuge: Signalrot, Blau (Vehicle_CarRed/CarBlue), dazu Gelb (Taxi) und Palettenfarben */
export const CAR_COLORS = [STYLE.signalRed, 0x339eff, 0xf7ca11, STYLE.emerald, STYLE.magenta, STYLE.lead, STYLE.orange, 0xf9faf7];

/** Musterart der Bettdecke (Texturen in textures.ts) */
export type BlanketPattern = 'stripes' | 'diamonds' | 'fleur';

export interface TierColors {
  wall: number;
  stripe: number;
  floor: number;
  floorDark: number;
  bedFrame: number;
  blanket: number;
  blanketB: number;
  pattern: BlanketPattern;
  pillow: number;
  rug: number;
  rugB: number;
  night: number;
  curtain: number;
  curtainB: number;
  accent: number;
}

/**
 * Farbakkorde je Zimmerstufe und Design. Stufe 1 hat ein Design; Stufe 2 und 3
 * bieten wie das Original drei Varianten (Bett-, Teppich-, Vorhangsatz 1–3),
 * Variante 3 ist Deluxe.
 */
export function tierColors(tier: number, design: number): TierColors {
  if (tier >= 3) {
    const v = [
      { blanket: M.zimmerStufe3.rundbettCyan, blanketB: M.zimmerStufe3.highlight, rug: STYLE.magenta, rugB: STYLE.gold, curtain: STYLE.lead, curtainB: 0x0597a0 },
      { blanket: STYLE.lawn, blanketB: 0xe6ff7a, rug: STYLE.lead, rugB: STYLE.gold, curtain: STYLE.lawn, curtainB: 0x86a800 },
      { blanket: STYLE.pink, blanketB: STYLE.gold, rug: STYLE.magenta, rugB: STYLE.gold, curtain: 0xf02ad2, curtainB: STYLE.magenta },
    ][design] ?? { blanket: M.zimmerStufe3.rundbettCyan, blanketB: M.zimmerStufe3.highlight, rug: STYLE.magenta, rugB: STYLE.gold, curtain: STYLE.lead, curtainB: 0x0597a0 };
    return {
      wall: C.t3Wall,
      stripe: C.t3WallStripe,
      floor: C.t3Floor,
      floorDark: C.t3FloorDark,
      bedFrame: C.t3BedFrame,
      pattern: 'fleur',
      pillow: M.zimmerStufe3.highlight,
      night: C.t3Night,
      accent: M.zimmerStufe3.rahmenGold,
      ...v,
    };
  }
  if (tier === 2) {
    const v = [
      { blanket: M.zimmerStufe2.deckeDunkel, blanketB: M.zimmerStufe2.deckeHell, rug: M.zimmerStufe2.teppichBlau, rugB: STYLE.gold, curtain: M.zimmerStufe2.deckeDunkel, curtainB: M.zimmerStufe2.deckeHell },
      { blanket: 0x4a64d0, blanketB: 0x6f8fea, rug: STYLE.coral, rugB: STYLE.gold, curtain: 0x3f8fd8, curtainB: 0x6fc0f0 },
      { blanket: STYLE.signalRed, blanketB: STYLE.gold, rug: STYLE.magenta, rugB: STYLE.gold, curtain: STYLE.pink, curtainB: 0xf0507e },
    ][design] ?? { blanket: M.zimmerStufe2.deckeDunkel, blanketB: M.zimmerStufe2.deckeHell, rug: M.zimmerStufe2.teppichBlau, rugB: STYLE.gold, curtain: M.zimmerStufe2.deckeDunkel, curtainB: M.zimmerStufe2.deckeHell };
    return {
      wall: C.t2Wall,
      stripe: C.t2WallStripe,
      floor: C.t2Floor,
      floorDark: C.t2FloorDark,
      bedFrame: design === 2 ? STYLE.gold : C.t2BedFrame,
      pattern: 'diamonds',
      pillow: 0xf9faf7,
      night: C.t2Night,
      accent: M.zimmerStufe2.lampeGelb,
      ...v,
    };
  }
  return {
    wall: C.t1Wall,
    stripe: C.t1WallStripe,
    floor: C.t1Floor,
    floorDark: C.t1FloorDark,
    bedFrame: C.t1BedFrame,
    blanket: C.t1Blanket,
    blanketB: 0x9cc2e6,
    pattern: 'stripes',
    pillow: C.pillow,
    rug: C.t1Rug,
    rugB: STYLE.gold,
    night: C.t1Night,
    curtain: C.curtain,
    curtainB: 0x6a8a05,
    accent: M.zimmerStufe2.lampeGelb,
  };
}

export const hexCss = (n: number) => '#' + n.toString(16).padStart(6, '0');
