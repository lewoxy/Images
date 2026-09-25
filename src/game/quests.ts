import type { Game } from './game';
import type { QuestState, Stats } from './state';
import { P } from '../config/floorplan';
import { T, fmt } from '../config/strings';
import { ROOM, WC } from '../config/layout';
import type { Pt } from './nav';

/**
 * Onboarding (📱 „Reinigungspunkte … bestätigt durch die Onboarding-Quest“),
 * danach rotierende Aufträge und dauerhafte Erfolge – die werbefreie Quelle
 * für Gems und Tokens.
 */

export interface TutorialStep {
  text: string;
  done: (g: Game) => boolean;
  target: (g: Game) => Pt | null;
  progress?: (g: Game) => string;
  /** Kaufschritt: fehlt Geld, führt die Anleitung erst zu Rezeption/Geld */
  buyId?: string;
}

const platePos = (g: Game, id: string): Pt | null => {
  const p = g.plates.get(id);
  return p ? { x: p.x, z: p.z } : null;
};

export const TUTORIAL: TutorialStep[] = [
  { text: T.tutorial[0], done: (g) => g.bought.has('zone_1.room_02#1'), target: (g) => platePos(g, 'zone_1.room_02#1'), buyId: 'zone_1.room_02#1' },
  { text: T.tutorial[1], done: (g) => g.save.stats.checkins >= 1, target: () => P.receptionPlayer },
  {
    text: T.tutorial[2],
    done: (g) => g.save.stats.collectedReception >= 1 || (g.save.stats.checkins >= 1 && g.receptionPile.bundles.length === 0),
    target: (g) => ({ x: g.receptionPile.x, z: g.receptionPile.z }),
  },
  {
    text: T.tutorial[3],
    done: (g) => g.save.stats.cleans >= 1,
    target: (g) => {
      const r = g.rooms.find((k) => k.state === 'dirty' && k.zone === 1);
      if (!r) {
        const occ = g.rooms.find((k) => k.guest && k.zone === 1);
        return occ ? occ.w(ROOM.entry.u, ROOM.entry.v) : null;
      }
      const i = r.spots.findIndex((s) => s.dirty);
      const sp = ROOM.spots[Math.max(0, i)];
      return r.w(sp.trig.u, sp.trig.v);
    },
    progress: (g) => {
      const r = g.rooms.find((k) => k.state === 'dirty' && k.zone === 1);
      return r ? `${3 - r.dirtyCount}/3` : '';
    },
  },
  { text: T.tutorial[4], done: (g) => g.bought.has('zone_1.room_04#1'), target: (g) => platePos(g, 'zone_1.room_04#1'), buyId: 'zone_1.room_04#1' },
  { text: T.tutorial[5], done: (g) => g.bought.has('zone_1.cleaner#1'), target: (g) => platePos(g, 'zone_1.cleaner#1'), buyId: 'zone_1.cleaner#1' },
  { text: T.tutorial[6], done: (g) => g.bought.has('zone_1.toilet#1'), target: (g) => platePos(g, 'zone_1.toilet#1'), buyId: 'zone_1.toilet#1' },
  { text: T.tutorial[7], done: (g) => g.player.carried.includes('roll') || g.save.stats.paper >= 1, target: () => P.paperPickup },
  {
    text: T.tutorial[8],
    done: (g) => g.save.stats.paper >= 1,
    target: (g) => {
      const w = g.wcByZone.get(1);
      return w ? w.w(WC.paper.u - 0.9, WC.paper.v) : null;
    },
  },
];

interface QuestTemplate {
  kind: string;
  ok: (g: Game) => boolean;
  target: (lvl: number) => number;
  reward: (lvl: number) => QuestState['reward'];
  text: (n: number) => string;
}

const QUESTS: QuestTemplate[] = [
  { kind: 'checkin', ok: () => true, target: (l) => 6 + l * 4, reward: (l) => ({ type: 'tokens', amount: 1 + Math.floor(l / 3) }), text: (n) => T.questTemplates.checkin(n) },
  { kind: 'clean', ok: () => true, target: (l) => 4 + l * 2, reward: () => ({ type: 'tokens', amount: 1 }), text: (n) => T.questTemplates.clean(n) },
  { kind: 'collect', ok: () => true, target: (l) => 150 * l * l, reward: () => ({ type: 'gems', amount: 1 }), text: (n) => T.questTemplates.collect(fmt(n)) },
  { kind: 'paper', ok: (g) => g.wcs.some((w) => w.built), target: (l) => 5 + l * 2, reward: () => ({ type: 'tokens', amount: 1 }), text: (n) => T.questTemplates.paper(n) },
  { kind: 'buy', ok: () => true, target: (l) => 2 + Math.floor(l / 2), reward: () => ({ type: 'gems', amount: 1 }), text: (n) => T.questTemplates.buy(n) },
  { kind: 'special', ok: (g) => g.level >= 2, target: () => 2, reward: () => ({ type: 'toiletpaper', amount: 2 }), text: () => T.questTemplates.special() },
  { kind: 'park', ok: (g) => g.parkingBuilt, target: (l) => 4 + l, reward: () => ({ type: 'candy', amount: 3 }), text: (n) => T.questTemplates.park(n) },
  { kind: 'vip', ok: (g) => g.level >= 3, target: () => 1, reward: () => ({ type: 'gems', amount: 1 }), text: () => T.questTemplates.vip() },
];

export function questText(q: QuestState): string {
  const t = QUESTS.find((k) => k.kind === q.kind);
  return t ? t.text(q.target) : q.kind;
}

export interface Achievement {
  id: string;
  label: string;
  value: (g: Game) => number;
  tiers: number[];
  gems: number[];
}

const stat = (k: keyof Stats) => (g: Game) => g.save.stats[k];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'checkins', label: 'Gäste eingecheckt', value: stat('checkins'), tiers: [10, 50, 200, 1000, 5000], gems: [1, 2, 3, 5, 8] },
  { id: 'cleans', label: 'Zimmer geputzt', value: stat('cleans'), tiers: [10, 50, 200, 1000], gems: [1, 2, 3, 5] },
  { id: 'cash', label: 'Bargeld eingesammelt', value: stat('cashEarned'), tiers: [1000, 10000, 100000, 1000000], gems: [1, 2, 4, 8] },
  { id: 'paper', label: 'Klopapier aufgefüllt', value: stat('paper'), tiers: [10, 100, 500], gems: [1, 2, 4] },
  { id: 'toilets', label: 'Toilettenbesuche', value: stat('toilets'), tiers: [20, 200, 1000], gems: [1, 2, 4] },
  { id: 'specials', label: 'Sonderwünsche erfüllt', value: stat('specials'), tiers: [3, 15, 60], gems: [2, 3, 5] },
  { id: 'vips', label: 'VIP-Gäste eingecheckt', value: stat('vips'), tiers: [1, 10, 40], gems: [1, 3, 5] },
  { id: 'cars', label: 'Autos geparkt', value: stat('cars'), tiers: [10, 100, 500], gems: [1, 2, 4] },
  { id: 'stars', label: 'Sterne im Hotel', value: (g) => g.save.stars, tiers: [30, 85, 145, 240], gems: [2, 3, 4, 6] },
  { id: 'play', label: 'Minuten gespielt', value: (g) => Math.floor(g.save.stats.playSeconds / 60), tiers: [10, 60, 240], gems: [1, 2, 4] },
];

export class Quests {
  constructor(private g: Game) {
    g.events.on('checkin', () => this.bump('checkin', 1));
    g.events.on('clean', () => this.bump('clean', 1));
    g.events.on('collect', (e) => this.bump('collect', e.amount));
    g.events.on('paper', (e) => e.byPlayer && this.bump('paper', e.amount));
    g.events.on('purchase', () => this.bump('buy', 1));
    g.events.on('special', () => this.bump('special', 1));
    g.events.on('car', () => this.bump('park', 1));
    g.events.on('vip', () => this.bump('vip', 1));
  }

  get tutorialStep(): TutorialStep | null {
    const i = this.g.save.tutorial;
    return i >= 0 && i < TUTORIAL.length ? TUTORIAL[i] : null;
  }

  /** Fehlbetrag für den aktuellen Kaufschritt (0 = bezahlbar oder kein Kaufschritt) */
  get tutorialMissing(): number {
    const st = this.tutorialStep;
    if (!st?.buyId) return 0;
    const pl = this.g.plates.get(st.buyId);
    if (!pl || pl.onT > 0) return 0;
    const missing = pl.rest - this.g.save.cash;
    return missing > 0.5 ? Math.ceil(missing) : 0;
  }

  private bump(kind: string, n: number) {
    if (this.g.save.tutorial >= 0) return;
    for (const q of this.g.save.quests) if (q.kind === kind && !q.claimed) q.progress = Math.min(q.target, q.progress + n);
  }

  /** Aufträge nachfüllen (drei aktive) */
  refill() {
    const s = this.g.save;
    if (s.tutorial >= 0) return;
    s.quests = s.quests.filter((q) => !q.claimed);
    let guard = 0;
    while (s.quests.length < 3 && guard++ < 30) {
      const pool = QUESTS.filter((t) => t.ok(this.g) && !s.quests.some((q) => q.kind === t.kind));
      if (!pool.length) break;
      const t = pool[Math.floor(Math.random() * pool.length)];
      const lvl = this.g.level;
      s.quests.push({ id: ++s.questSeq, kind: t.kind, target: t.target(lvl), progress: 0, reward: t.reward(lvl), claimed: false });
    }
  }

  claim(id: number) {
    const q = this.g.save.quests.find((k) => k.id === id);
    if (!q || q.claimed || q.progress < q.target) return;
    q.claimed = true;
    this.g.grant(q.reward.type, q.reward.amount);
    this.g.sfx.play('reward');
    this.refill();
  }

  get claimable(): number {
    return this.g.save.quests.filter((q) => !q.claimed && q.progress >= q.target).length;
  }

  achievementClaimable(a: Achievement): boolean {
    const done = this.g.save.achievements[a.id] ?? 0;
    return done < a.tiers.length && a.value(this.g) >= a.tiers[done];
  }

  get achievementsClaimable(): number {
    return ACHIEVEMENTS.filter((a) => this.achievementClaimable(a)).length;
  }

  claimAchievement(id: string) {
    const a = ACHIEVEMENTS.find((k) => k.id === id);
    if (!a || !this.achievementClaimable(a)) return;
    const done = this.g.save.achievements[a.id] ?? 0;
    this.g.save.achievements[a.id] = done + 1;
    this.g.grant('gems', a.gems[done]);
    this.g.sfx.play('reward');
  }

  update() {
    const s = this.g.save;
    if (s.tutorial >= 0) {
      const step = TUTORIAL[s.tutorial];
      if (step && step.done(this.g)) {
        s.tutorial++;
        this.g.sfx.play('step');
        this.g.events.emit('tutorial', { step: s.tutorial });
        if (s.tutorial >= TUTORIAL.length) {
          s.tutorial = -1;
          this.g.hud.toast(T.tutorialDone);
          this.g.grant('gems', 2);
          this.refill();
        }
      }
    } else if (s.quests.filter((q) => !q.claimed).length < 3) {
      this.refill();
    }
  }
}
