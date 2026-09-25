import { RUNS, START_CASH } from '../config/balance';

/** Persistenter Spielstand (localStorage). Laufzeitobjekte (Gäste etc.) werden nicht gespeichert. */

export interface QuestState {
  id: number;
  kind: string;
  target: number;
  progress: number;
  reward: { type: 'tokens' | 'gems' | 'candy' | 'toiletpaper'; amount: number };
  claimed: boolean;
}

export interface Stats {
  checkins: number;
  cleans: number;
  cashEarned: number;
  paper: number;
  purchases: number;
  specials: number;
  vips: number;
  cars: number;
  toilets: number;
  playSeconds: number;
  collectedReception: number;
}

export interface Settings {
  sound: boolean;
  vibration: boolean;
  quality: boolean;
  fps: boolean;
}

export interface SaveState {
  version: 1;
  savedAt: number;
  // ---- global (hotelübergreifend)
  gems: number;
  tokens: number;
  playerUpg: number;
  backpack: number;
  settings: Settings;
  stats: Stats;
  achievements: Record<string, number>;
  giftAt: number;
  // ---- Hotel 1
  run: number;
  cash: number;
  candy: number;
  toiletpaper: number;
  stars: number;
  /** höchstes erreichtes Level, dessen Modal/Belohnung bereits abgeholt wurde */
  levelClaimed: number;
  bought: string[];
  partial: Record<string, { paid: number; res: boolean }>;
  designs: Record<string, number>;
  paper: Record<string, number>;
  piles: Record<string, number>;
  tutorial: number;
  quests: QuestState[];
  questSeq: number;
  timers: { vip: number; special: number; scooter: number };
  boosts: { scooter: number; helper: number };
  prestigeReady: boolean;
}

export function freshStats(): Stats {
  return { checkins: 0, cleans: 0, cashEarned: 0, paper: 0, purchases: 0, specials: 0, vips: 0, cars: 0, toilets: 0, playSeconds: 0, collectedReception: 0 };
}

export function newHotelState(run: number): Pick<
  SaveState,
  'run' | 'cash' | 'candy' | 'toiletpaper' | 'stars' | 'levelClaimed' | 'bought' | 'partial' | 'designs' | 'paper' | 'piles' | 'tutorial' | 'quests' | 'questSeq' | 'timers' | 'boosts' | 'prestigeReady'
> {
  return {
    run,
    cash: Math.round(START_CASH[0] * RUNS[Math.min(run, RUNS.length) - 1].price),
    candy: 0,
    toiletpaper: 0,
    stars: 0,
    levelClaimed: 1,
    bought: [],
    partial: {},
    designs: {},
    paper: {},
    piles: {},
    tutorial: run === 1 ? 0 : -1,
    quests: [],
    questSeq: 0,
    timers: { vip: 240, special: 150, scooter: 120 },
    boosts: { scooter: 0, helper: 0 },
    prestigeReady: false,
  };
}

export function newSave(): SaveState {
  return {
    version: 1,
    savedAt: Date.now(),
    gems: 5,
    tokens: 0,
    playerUpg: 0,
    backpack: 0,
    settings: { sound: true, vibration: true, quality: true, fps: false },
    stats: freshStats(),
    achievements: {},
    giftAt: Date.now() + 20 * 60 * 1000,
    ...newHotelState(1),
  };
}

const KEY = 'hotel-hektik-save-v1';

export function loadSave(): SaveState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveState;
    if (data.version !== 1) return null;
    // fehlende Felder aus neueren Versionen auffüllen
    const base = newSave();
    return { ...base, ...data, settings: { ...base.settings, ...data.settings }, stats: { ...base.stats, ...data.stats }, timers: { ...base.timers, ...data.timers }, boosts: { ...base.boosts, ...data.boosts } };
  } catch {
    return null;
  }
}

export function writeSave(s: SaveState): boolean {
  try {
    s.savedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorieren */
  }
}
