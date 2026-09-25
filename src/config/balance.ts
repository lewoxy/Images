/**
 * Balancing-Daten für Hotel 1.
 *
 * Alle mit 📦 markierten Werte stammen 1:1 aus der Spezifikation v5
 * (docs/spezifikation-v5.md, Abschnitte 3–5, 10, 11, 13). Werte mit 🔧 sind
 * eigene Designentscheidungen, wo die Spezifikation nichts vorgibt.
 */

/** Interne Ressourcennamen wie in der Spezifikation (§12). Anzeige je Hotel in strings.ts. */
export type ResType = 'candy' | 'toiletpaper';
export type CurrencyType = 'cash' | 'gems' | 'tokens' | ResType;

export interface Cost {
  cash: number;
  res?: { type: ResType; amount: number };
}

const c = (cash: number, resType?: ResType, amount = 0): Cost =>
  resType ? { cash, res: { type: resType, amount } } : { cash };

/** 📦 §4 – Vollständige Preistabelle, Hotel 1, erster Durchlauf (46 Einträge). */
export const PRICE_TABLE: Record<string, Cost[]> = {
  'zone_1.room_02': [c(30), c(140), c(280)],
  'zone_1.room_04': [c(50), c(150), c(290)],
  'zone_1.cleaner': [c(80), c(140), c(190), c(900)],
  'zone_1.toilet': [c(90)],
  'zone_1.room_01': [c(110), c(280)],
  'lobby.reception': [c(140), c(520), c(1580, 'candy', 10)],
  zone_2: [c(350)],
  'zone_2.room_01': [c(380), c(500), c(750)],
  'zone_2.cleaner': [c(450), c(440), c(610), c(1180, 'candy', 5)],
  'zone_2.room_02': [c(420), c(590), c(860)],
  'zone_2.toilet': [c(440)],
  'zone_2.room_03': [c(420), c(680), c(980)],
  supplier: [c(780), c(970), c(1150, 'candy', 5), c(1350, 'candy', 8), c(3310, 'candy', 11)],
  zone_3: [c(1030, 'toiletpaper', 4)],
  'zone_3.room_03': [c(960), c(1050), c(1410)],
  'zone_3.cleaner': [c(990), c(860, 'candy', 3), c(1050, 'candy', 5), c(1860, 'candy', 15)],
  'zone_3.room_02': [c(950), c(1160), c(1580)],
  'zone_3.toilet': [c(980)],
  'zone_3.room_04': [c(940), c(1280), c(1680)],
  parking: [c(1190)],
  zone_4: [c(1760, 'toiletpaper', 7)],
  'zone_4.room_01': [c(1680), c(1790), c(2230)],
  'zone_4.cleaner': [c(1380, 'candy', 3), c(1460, 'candy', 8), c(1700, 'candy', 13), c(2630, 'candy', 18)],
  'zone_4.room_02': [c(1660), c(1930), c(2450)],
  'zone_4.toilet': [c(1700)],
  'zone_4.room_03': [c(1650), c(2080), c(2570)],
  parker: [c(1820, 'candy', 15)],
  zone_5: [c(2620, 'toiletpaper', 11)],
  'zone_5.room_01': [c(2540), c(2680), c(3040)],
  'zone_5.cleaner': [c(2070, 'candy', 3), c(2050, 'candy', 11), c(2480, 'candy', 16), c(3540, 'candy', 21)],
  'zone_5.room_02': [c(2520), c(2800), c(3230)],
  'zone_5.toilet': [c(2570)],
  'zone_5.room_03': [c(2510), c(2920), c(3420)],
  zone_6: [c(3550, 'toiletpaper', 18)],
  'zone_6.room_01': [c(3470), c(3650), c(4070)],
  'zone_6.cleaner': [c(2820, 'candy', 3), c(2810, 'candy', 14), c(3370, 'candy', 19), c(4300, 'candy', 24)],
  'zone_6.room_03': [c(3460), c(3780), c(4360)],
  'zone_6.toilet': [c(3520)],
  'zone_6.room_04': [c(3450), c(3930), c(4590)],
  zone_7: [c(4660, 'toiletpaper', 28)],
  'zone_7.room_01': [c(4580), c(4810), c(5300)],
  'zone_7.cleaner': [c(3720, 'candy', 3), c(3720, 'candy', 17), c(4510, 'candy', 22), c(4720, 'candy', 27)],
  'zone_7.room_03': [c(4570), c(4970), c(5550)],
  'zone_7.toilet': [c(4650)],
  'zone_7.room_04': [c(4580), c(5130), c(5810)],
  elevator: [c(5990)],
};

/**
 * 📦 §4 – Prestige-Durchläufe: Block 2 ≈ 2,5-fach, Block 3 ≈ 4,5-fach.
 * 🔧 Die Einnahmen steigen etwas weniger stark (die Tabelle nennt dafür keine Werte).
 */
export const RUNS = [
  { price: 1, income: 1, rewardCash: 1, rewardTokens: 1 },
  { price: 2.5, income: 2, rewardCash: 2.5, rewardTokens: 2 },
  { price: 4.5, income: 3.5, rewardCash: 4.5, rewardTokens: 4 },
] as const;

/** 📦 §4 – Startkapital je Hotel (Index 0 = Hotel 1). */
export const START_CASH = [50, 200, 300, 300, 350, 400, 400, 400, 500, 600, 600, 700, 800, 900, 1000, 1100, 1200];

/** 📦 §3 – LevelRewardSettings. Schwelle = kumulative Sterne im aktuellen Hotel. */
export const LEVELS: { level: number; threshold: number; cash: number; tokens: number }[] = [
  { level: 2, threshold: 30, cash: 600, tokens: 5 },
  { level: 3, threshold: 50, cash: 1600, tokens: 5 },
  { level: 4, threshold: 85, cash: 2700, tokens: 5 },
  { level: 5, threshold: 115, cash: 4000, tokens: 5 },
  { level: 6, threshold: 145, cash: 5400, tokens: 5 },
  { level: 7, threshold: 180, cash: 7000, tokens: 5 },
  { level: 8, threshold: 240, cash: 5400, tokens: 5 },
];
export const MAX_LEVEL = 8;

/**
 * 🔧 Werbefreier Klon: kleine Ressourcen-Boni beim Level-Up, damit Zonen- und
 * Personal-Freischaltungen nicht an Werbevideos hängen (§12). Zusammen mit den
 * Sondergästen deckt das den Bedarf (≈ 300 Bonbons, 68 Seife) auch ohne Drops.
 */
export const LEVEL_RES_BONUS: Record<number, { candy: number; toiletpaper: number }> = {
  2: { candy: 5, toiletpaper: 2 },
  3: { candy: 8, toiletpaper: 4 },
  4: { candy: 10, toiletpaper: 5 },
  5: { candy: 12, toiletpaper: 6 },
  6: { candy: 14, toiletpaper: 8 },
  7: { candy: 16, toiletpaper: 10 },
  8: { candy: 20, toiletpaper: 0 },
};

/** 📦 §3 – Sterne je Aktion. */
export const STARS = {
  roomBuild: 2,
  roomTier2: 3,
  roomTier3: 5,
  toilet: 5,
  parking: 3,
} as const;

/** 📦 §5 – Zimmer-Einnahmen je Stufe (Index = Stufe). `rw` = Deluxe-/RoomRW-Variante. */
export const ROOM_INCOME: { pay: number; payRW: number; tip: number; passive: number }[] = [
  { pay: 0, payRW: 0, tip: 0, passive: 0 },
  { pay: 10, payRW: 10, tip: 2, passive: 0.02 },
  { pay: 30, payRW: 40, tip: 6, passive: 0.04 },
  { pay: 50, payRW: 60, tip: 10, passive: 0.07 },
];

/** 📦 §5 – Weitere Quellen. */
export const TOILET_INCOME = { pay: 20, passive: 0.04 };
export const PARKING_INCOME = { pay: 20, passive: 0.07 };
export const VIP_TIP = 10;

/** 📦 §10 – Cleaner Hotel 1: Tempo und Arbeitsrate je Stufe (Index 0 = Stufe 1). */
export const CLEANER_TIERS = [
  { speed: 1.8, work: 0.5 },
  { speed: 2.3, work: 0.8 },
  { speed: 3.0, work: 1.0 },
  { speed: 4.0, work: 1.5 },
];

/**
 * 🔧 Umrechnung der Personal-Tempi (Unity-Einheiten) auf unsere Welt, in der die
 * Spielfigur ≈ 5,4 Einheiten/s läuft. Das Verhältnis Cleaner:Spieler bleibt erhalten
 * („ein Basis-Cleaner schafft drei Zimmer nicht allein“).
 */
export const STAFF_SPEED_SCALE = 1.4;

/** 🔧 Supplier (Loader): 5 Stufen laut Preistabelle – Einstellen, Tempo, Tragen, Tempo, Tragen. */
export const SUPPLIER_TIERS = [
  { speed: 2.0, carry: 3 },
  { speed: 2.7, carry: 3 },
  { speed: 2.7, carry: 5 },
  { speed: 3.4, carry: 5 },
  { speed: 3.4, carry: 8 },
];

/** 🔧 Rezeption: Stufe 1 = Rezeptionist, 2 = schneller, 3 = zweiter Tresen (zweite Kraft). Check-ins pro Sekunde. */
export const RECEPTION_TIERS = [
  { rate: 0.55, desks: 1 },
  { rate: 0.9, desks: 1 },
  { rate: 0.9, desks: 2 },
];
/** 🔧 Check-in-Geschwindigkeit der Spielfigur (Check-ins pro Sekunde). */
export const PLAYER_CHECKIN_RATE = 1.35;
/** 🔧 Reinigungsrate der Spielfigur (Arbeitseinheiten pro Sekunde, 1 Einheit je Punkt). */
export const PLAYER_CLEAN_RATE = 1.7;
/** 🔧 Parker (Valet): Autos pro Sekunde. */
export const PARKER_RATE = 0.4;
export const PLAYER_PARK_RATE = 1.0;

/** 📦 §7 – Gastzyklus. */
export const GUEST_TIMING = {
  lieDown: 1,
  night: 3,
  getUp: 1,
  /** 🔧 Toilettenbesuch */
  toilet: 2.2,
};
/** 📦 §7 – exakt drei Reinigungspunkte pro Zimmer. */
export const CLEAN_SPOTS = 3;

/** 📦 §2 – Ein Geldstapel fasst genau 10 Einheiten. */
export const STACK_SIZE = 10;
/** 🔧 Wert eines Geldbündels (ein Zimmer der Stufe 1 zahlt also genau ein Bündel). */
export const BUNDLE_VALUE = 10;

/** 📦 §9 – Kaufdauer konstant ≈ 3 s, Ease-out mit Mindesttempo. */
export const PURCHASE_SECONDS = 3.2;
/** 🔧 Kurze Verzögerung, bevor eine Platte zu zahlen beginnt (verhindert Käufe im Vorbeigehen). */
export const PLATE_DELAY = 0.3;

/** 📦 §11 – Spielerfigur-Upgrades (Tokens). Abwechselnd Tempo/Tragen, Magnet ab 12 Tokens. */
export const PLAYER_UPGRADES: { cost: number; kind: 'speed' | 'carry' | 'magnet' }[] = [
  { cost: 3, kind: 'speed' },
  { cost: 6, kind: 'carry' },
  { cost: 8, kind: 'speed' },
  { cost: 10, kind: 'carry' },
  { cost: 12, kind: 'magnet' },
  { cost: 14, kind: 'speed' },
  { cost: 16, kind: 'carry' },
  { cost: 18, kind: 'speed' },
];
/** 📦 §11 – Rucksack-Upgrades (Tokens), je +1 Tragekapazität. */
export const BACKPACK_UPGRADES = [3, 12, 18, 24, 30, 36, 42, 48];

export const PLAYER_BASE = {
  /** 🔧 ≈ 0,8 Zimmerlängen pro Sekunde (§11: „grob eine Zimmerlänge pro Sekunde“) */
  speed: 6.2,
  speedPerUpgrade: 0.12,
  /** ✅ Basis-Tragekapazität 3 */
  carry: 3,
  pickupRadius: 1.25,
  magnetRadius: 3.2,
};

/** 🎥 §11 – Tempo-Boost +50 % für rund 3 Minuten. */
export const SCOOTER = { mult: 1.5, seconds: 180, respawn: 240 };

/** 📦 §13 – VIP */
export const VIP = { interval: 300, patience: 75 };
/** 📦 §13 – SpecialRequestsSettings 500, 3, 1, 420 (Belohnung, Anfragen, –, Intervall). */
export const SPECIAL = { reward: 500, requests: 3, interval: 420, requestSeconds: 100 };

/**
 * 🔧 Werbefreie Ressourcenquelle (§12: „Ressource aus normalen Gästen droppen lassen“).
 * Chance je abreisendem Gast, im Zimmer etwas liegen zu lassen.
 */
export const GUEST_DROPS = { candy: 0.1, toiletpaper: 0.035 };

/** 🔧 Toiletten: Papiervorrat je Block (3 Kabinen). */
export const TOILET_STOCK_MAX = 9;

/** 🔧 Offline-Fortschritt über die Passiv-Koeffizienten (§16, Punkt 13). */
export const OFFLINE = { minSeconds: 60, maxSeconds: 4 * 3600 };

/** 🔧 Gäste-Aufkommen: Ankunftsintervall abhängig von der Zimmerzahl, Warteschlange ohne Abwanderung. */
export const GUEST_FLOW = {
  intervalPerRoom: 34,
  minInterval: 1.9,
  maxInterval: 11,
  maxQueue: 16,
  walkSpeed: 3.5,
  /** 🔧 Anteil der Gäste, die nach dem Aufenthalt die Toilette nutzen (Passivwerte §5: WC ≈ 2× Zimmer Stufe 1) */
  toiletChance: 0.55,
};

/** 🔧 Premium-Preise (Gems) im werbefreien Klon. */
export const GEM_PRICES = {
  levelDouble: 3,
  offlineDouble: 2,
  deluxeTier2: 4,
  deluxeTier3: 6,
  scooter: 4,
  helper: 6,
  cashPack: 8,
  candyPack: 5,
  toiletpaperPack: 7,
};

/**
 * §9 – Kaufkurve. Die gemessenen Deltas (≈450 → ≈250 → 11 → 1 je Viertelsekunde,
 * 3.310 in 3,2 s) entsprechen einem quadratischen Ease-out:
 * bezahlt(t) = Kosten · (1 − (1 − t/T)²). Liefert den neuen Anteil nach dt Sekunden.
 */
export function purchaseStep(paidFraction: number, dt: number, T = PURCHASE_SECONDS): number {
  const t = T * (1 - Math.sqrt(Math.max(0, 1 - paidFraction)));
  const t2 = t + dt;
  return t2 >= T ? 1 : 1 - (1 - t2 / T) ** 2;
}

export function priceFor(key: string, tier: number, run: number): Cost {
  const row = PRICE_TABLE[key];
  if (!row || !row[tier - 1]) throw new Error(`Kein Preis für ${key}#${tier}`);
  const base = row[tier - 1];
  const m = RUNS[Math.min(run, RUNS.length) - 1].price;
  const cash = m === 1 ? base.cash : Math.round((base.cash * m) / 10) * 10;
  return base.res ? { cash, res: { ...base.res } } : { cash };
}

export function levelForStars(stars: number): number {
  let lvl = 1;
  for (const l of LEVELS) if (stars >= l.threshold) lvl = l.level;
  return lvl;
}

/** Schwelle für das nächste Level oder null bei MAX. */
export function nextThreshold(level: number): number | null {
  const next = LEVELS.find((l) => l.level === level + 1);
  return next ? next.threshold : null;
}

export function prevThreshold(level: number): number {
  const cur = LEVELS.find((l) => l.level === level);
  return cur ? cur.threshold : 0;
}
