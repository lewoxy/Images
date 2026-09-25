import * as THREE from 'three';
import { SCOOTER, SPECIAL, VIP } from '../config/balance';
import { SPECIAL_GUESTS, T } from '../config/strings';
import type { Game } from './game';
import type { Guest, SpecialInfo } from './guests';
import { pickupMesh, type ItemType } from './items';
import { svg } from '../ui/icons';

/**
 * Sondergäste, VIPs und Roller (§11, §13). Werbefrei: Sonderwünsche werden
 * direkt erfüllt und geben Ressourcen (§12, Designentscheidung für den Klon).
 */
export class Specials {
  active: Guest | null = null;
  vipGuest: Guest | null = null;
  luggage: THREE.Object3D | null = null;
  scooter: THREE.Object3D | null = null;
  private scooterPos = { x: 0, z: 0 };
  private specialIdx = Math.floor(Math.random() * SPECIAL_GUESTS.length);

  constructor(private g: Game) {}

  get level() {
    return this.g.level;
  }

  update(dt: number) {
    const s = this.g.save;
    // VIP ab Level 3, alle 300 s (📦 VipComeDelay)
    if (this.level >= 3 && !this.vipGuest) {
      s.timers.vip -= dt;
      if (s.timers.vip <= 0) {
        s.timers.vip = VIP.interval;
        this.vipGuest = this.g.guests.spawn({ look: this.g.guests.makeVipLook(), vip: true });
        this.g.hud.toast(svg('crown') + T.vipArrives);
        this.g.sfx.play('vip');
      }
    }
    if (this.vipGuest && (this.vipGuest.state === 'gone' || this.vipGuest.state === 'leave' || this.vipGuest.state === 'toRoom')) {
      this.vipGuest = null;
    }
    // Sondergast ab Level 2, alle 420 s (📦 SpecialRequestsSettings)
    if (this.level >= 2 && !this.active) {
      s.timers.special -= dt;
      if (s.timers.special <= 0) {
        s.timers.special = SPECIAL.interval;
        this.spawnSpecial();
      }
    }
    if (this.active) {
      const gst = this.active;
      const sp = gst.special!;
      if (gst.state === 'special' && sp.current) {
        sp.timer -= dt;
        const need = sp.current;
        this.g.fx.set('g' + gst.id, () => ({ x: gst.x, y: 2.4, z: gst.z }), svg(need === 'luggage' ? 'luggage' : need), 'bubble special');
        if (sp.timer <= 0) this.finishSpecial(false);
      }
      if (gst.state === 'gone') {
        this.active = null;
        this.removeLuggage();
      }
    }
    // Roller im Flur
    if (s.boosts.scooter > 0) {
      s.boosts.scooter = Math.max(0, s.boosts.scooter - dt);
    } else if (!this.scooter && this.g.level >= 2) {
      s.timers.scooter -= dt;
      if (s.timers.scooter <= 0) {
        s.timers.scooter = SCOOTER.respawn;
        this.spawnScooter();
      }
    }
    if (this.scooter) {
      const t = performance.now() / 1000;
      this.scooter.position.y = 0.15 + Math.sin(t * 3) * 0.08;
      this.scooter.rotation.y = t * 1.2;
      if (Math.hypot(this.g.player.x - this.scooterPos.x, this.g.player.z - this.scooterPos.z) < 1.4) {
        this.scooter.removeFromParent();
        this.scooter = null;
        s.boosts.scooter = SCOOTER.seconds;
        this.g.hud.toast(svg('scooter') + T.scooterFound);
        this.g.sfx.play('powerup');
      }
    }
    if (this.luggage) {
      const t = performance.now() / 1000;
      this.luggage.position.y = 0.1 + Math.abs(Math.sin(t * 3)) * 0.12;
    }
    // Aushilfe
    if (s.boosts.helper > 0) {
      s.boosts.helper = Math.max(0, s.boosts.helper - dt);
      if (!this.g.staff.helper) this.g.staff.spawnHelper();
      if (s.boosts.helper <= 0) this.g.staff.dismissHelper();
    }
  }

  private spawnScooter() {
    const spots = [
      { x: -20, z: -11.5 },
      { x: 20, z: -31.5 },
      { x: -20, z: -31.5 },
      { x: 0, z: -22 },
      { x: 12, z: -11.5 },
    ];
    const ok = spots.filter((p) => Math.hypot(p.x - this.g.player.x, p.z - this.g.player.z) > 8);
    const p = ok[Math.floor(Math.random() * ok.length)] ?? spots[0];
    this.scooterPos = p;
    this.scooter = pickupMesh('scooter');
    this.scooter.position.set(p.x, 0.15, p.z);
    this.g.stage.scene.add(this.scooter);
  }

  private spawnSpecial() {
    const idx = this.specialIdx++ % SPECIAL_GUESTS.length;
    const info = SPECIAL_GUESTS[idx];
    const pool = ['champagne', 'flowers', 'towel', 'coffee'];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const reqs = ['luggage', ...pool.slice(0, SPECIAL.requests - 1)];
    const sp: SpecialInfo = { idx, name: info.name, role: info.role, requests: reqs, current: null, timer: 0, done: 0 };
    this.active = this.g.guests.spawn({ look: this.g.guests.makeSpecialLook(idx), special: sp });
    this.g.hud.toast(svg('star') + T.special.arrives(info.name));
    this.g.sfx.play('vip');
  }

  /** Sondergast hat sein Zimmer erreicht: erster Wunsch */
  onSpecialInRoom(gst: Guest) {
    this.nextRequest(gst);
  }

  private nextRequest(gst: Guest) {
    const sp = gst.special!;
    sp.current = sp.requests.shift() ?? null;
    sp.timer = SPECIAL.requestSeconds;
    if (!sp.current) {
      this.finishSpecial(true);
      return;
    }
    if (sp.current === 'luggage') {
      this.removeLuggage();
      this.luggage = pickupMesh('luggage');
      this.luggage.position.set(-1.7, 0.1, 4.6);
      this.g.stage.scene.add(this.luggage);
    }
  }

  private removeLuggage() {
    if (this.luggage) {
      this.luggage.removeFromParent();
      this.luggage = null;
    }
  }

  /** Welche Gegenstände gibt die Service-Theke gerade aus? */
  get wantedItem(): ItemType | null {
    const sp = this.active?.special;
    if (!sp || !sp.current || sp.current === 'luggage' || this.active!.state !== 'special') return null;
    return sp.current as ItemType;
  }

  get luggagePos() {
    return this.luggage ? { x: this.luggage.position.x, z: this.luggage.position.z } : null;
  }

  takeLuggage() {
    this.removeLuggage();
  }

  /** Spieler bringt etwas zum Sondergast */
  tryDeliver(items: ItemType[]): number {
    const gst = this.active;
    const sp = gst?.special;
    if (!gst || !sp || gst.state !== 'special' || !sp.current) return -1;
    const need = sp.current as ItemType;
    const i = items.indexOf(need);
    if (i < 0) return -1;
    sp.done++;
    this.g.save.stats.specials++;
    this.g.events.emit('special', { done: false });
    // Belohnung je Wunsch: ein Drittel von 500 plus Ressourcen
    const cash = Math.round((SPECIAL.reward / SPECIAL.requests) * this.g.incomeMult);
    this.g.rewardAt(gst.x, gst.z, { cash, candy: 2 + Math.floor(Math.random() * 3), toiletpaper: Math.random() < 0.65 ? 1 + Math.floor(Math.random() * 2) : 0 });
    gst.ch.pop();
    this.g.sfx.play('reward');
    this.nextRequest(gst);
    return i;
  }

  private finishSpecial(happy: boolean) {
    const gst = this.active;
    if (!gst) return;
    const sp = gst.special!;
    sp.requests = [];
    sp.current = null;
    this.g.fx.remove('g' + gst.id);
    this.removeLuggage();
    if (happy) {
      this.g.save.gems += 1;
      this.g.hud.toast(svg('gem') + `${sp.name}: ${T.special.thanks} +1`);
      this.g.events.emit('special', { done: true });
    }
    if (gst.state === 'special' && gst.room) this.g.guests.lieDown(gst);
  }

  get cardInfo(): { name: string; role: string; time: number; idx: number } | null {
    const gst = this.active;
    if (!gst || !gst.special) return null;
    const sp = gst.special;
    return { name: sp.name, role: sp.role, time: gst.state === 'special' ? sp.timer : -1, idx: sp.idx };
  }

  clear() {
    this.removeLuggage();
    this.scooter?.removeFromParent();
    this.scooter = null;
    this.active = null;
    this.vipGuest = null;
  }
}
