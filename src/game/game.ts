import * as THREE from 'three';
import { Stage } from '../world/stage';
import { Collision } from '../world/collision';
import { World } from '../world/world';
import { CellView } from '../world/cells';
import { Input } from '../core/input';
import { Emitter } from '../core/events';
import { FX } from '../ui/fx';
import { Hud } from '../ui/hud';
import { UI } from '../ui/ui';
import { svg } from '../ui/icons';
import { Sfx } from '../audio/sfx';
import { buildNav, type Nav, type Pt } from './nav';
import { MoneySystem, type MoneyPile } from './money';
import { Shadows } from './agent';
import { GuestManager } from './guests';
import { StaffManager } from './staff';
import { Player } from './player';
import { Parking } from './parking';
import { Specials } from './specials';
import { Quests } from './quests';
import { Guide } from './guide';
import { Plate } from './plates';
import { FloorMarker } from './markers';
import { RoomRt, WCRt } from './hotel';
import { pickupMesh, type PickupType } from './items';
import { clearSave, loadSave, newHotelState, newSave, writeSave, type SaveState } from './state';
import {
  BACKPACK_UPGRADES,
  LEVELS,
  LEVEL_RES_BONUS,
  OFFLINE,
  PARKING_INCOME,
  PLATE_DELAY,
  PLAYER_CHECKIN_RATE,
  PLAYER_CLEAN_RATE,
  PLAYER_UPGRADES,
  ROOM_INCOME,
  RUNS,
  TOILET_INCOME,
  TOILET_STOCK_MAX,
  levelForStars,
  priceFor,
  type ResType,
} from '../config/balance';
import { NODES, ZONE_CELLS, maxTier, nodeId, roomKey, type UpgradeNode } from '../config/progression';
import { P, cleanerPost, zonePlatePos } from '../config/floorplan';
import { ROOM, WC } from '../config/layout';
import { RES_NAMES, T, fmt } from '../config/strings';

interface Pickup {
  type: PickupType;
  obj: THREE.Object3D;
  x: number;
  z: number;
  amount: number;
  t: number;
}

export class Game {
  stage: Stage;
  col = new Collision();
  world: World;
  input: Input;
  fx: FX;
  hud: Hud;
  ui: UI;
  sfx = new Sfx();
  events = new Emitter();
  save: SaveState;
  nav: Nav;
  money: MoneySystem;
  shadows: Shadows;
  guests: GuestManager;
  staff: StaffManager;
  player: Player;
  parking: Parking;
  specials: Specials;
  quests: Quests;
  guide: Guide;

  rooms: RoomRt[] = [];
  wcs: WCRt[] = [];
  roomByKey = new Map<string, RoomRt>();
  wcByZone = new Map<number, WCRt>();
  cells: CellView[] = [];
  zoneUnlocked: boolean[] = [false, true, false, false, false, false, false, false];
  receptionTier = 0;
  supplierTier = 0;
  parkingBuilt = false;
  parkerBuilt = false;
  elevatorBuilt = false;
  bought = new Set<string>();
  plates = new Map<string, Plate>();
  receptionPile: MoneyPile;
  parkingPile: MoneyPile;
  pickups: Pickup[] = [];
  markers!: { reception: FloorMarker; paper: FloorMarker; valet: FloorMarker; service: FloorMarker; trash: FloorMarker; wc: Map<number, FloorMarker> };

  checkinProgress = 0;
  checkinActive = false;
  time = 0;
  private saveT = 0;
  private levelShown = 1;
  private payFxT = 0;
  private paperT = 0;
  private dropT = 0;
  private collectFloat = 0;
  private collectFloatT = 0;
  private incomeLog: { t: number; v: number }[] = [];
  private hiddenAt = 0;
  guideActive = false;
  finderIndex = 0;
  timeScale = 1;
  /** Debug/Tests: keine Modals, Level werden automatisch abgeholt */
  silent = false;
  private perf = { t: 0, acc: 0, frames: 0, checked: false };
  private grantStack = 0;
  private grantAt = -1;
  private debug = false;
  private started = false;

  constructor() {
    const gameEl = document.getElementById('game')!;
    const fxEl = document.getElementById('fx')!;
    const uiEl = document.getElementById('ui')!;
    this.save = loadSave() ?? newSave();
    const params = new URLSearchParams(location.search);
    if (params.has('speed')) this.timeScale = Math.max(0.1, Math.min(20, Number(params.get('speed')) || 1));
    this.stage = new Stage(gameEl);
    this.stage.setQuality(this.save.settings.quality);
    this.world = new World(this.stage, this.col);
    this.input = new Input(this.stage.renderer.domElement, fxEl);
    this.fx = new FX(this.stage, fxEl);
    this.nav = buildNav();
    this.money = new MoneySystem(this.stage.scene);
    this.shadows = new Shadows(this.stage.scene, this.world.mat.shadow);
    this.guests = new GuestManager(this);
    this.staff = new StaffManager(this);
    this.parking = new Parking(this);
    this.specials = new Specials(this);
    this.ui = new UI(this, uiEl);
    this.hud = new Hud(this, uiEl);
    this.hud.onTab = (i) => this.ui.showPage(i);
    this.quests = new Quests(this);
    this.player = new Player(this);
    this.guide = new Guide(this.stage.scene, this.world.mat.chevron);
    this.money.onAdd = (v) => this.logIncome(v);
    this.receptionPile = this.money.createPile('reception', P.receptionMoney.x, P.receptionMoney.z, 3, 2);
    this.parkingPile = this.money.createPile('parking', P.parkingMoney.x, P.parkingMoney.z, 3, 2);
    const yaw = this.stage.yaw;
    const sc = this.stage.scene;
    this.markers = {
      reception: new FloorMarker(sc, P.receptionPlayer.x, P.receptionPlayer.z, 2.5, 'bell', yaw),
      paper: new FloorMarker(sc, P.paperPickup.x, P.paperPickup.z, 2.8, 'paper', yaw),
      valet: new FloorMarker(sc, P.valetSpot.x, P.valetSpot.z, 2.5, 'parking', yaw, 'rgba(57,169,255,1)'),
      service: new FloorMarker(sc, P.serviceBarPickup.x, P.serviceBarPickup.z, 2.3, 'champagne', yaw, 'rgba(255,95,168,1)'),
      trash: new FloorMarker(sc, P.trash.x, P.trash.z, 2.9, 'close', yaw, 'rgba(242,48,63,1)'),
      wc: new Map(),
    };
    this.buildHotel();
    this.restore();
    this.applySettings();
    this.bindLifecycle();
    if (params.has('debug')) {
      this.debug = true;
      this.debugSetup(params);
    }
  }

  /** Schwache Geräte: nach einigen Sekunden unter ~38 FPS automatisch die Auflösung senken */
  private autoQuality(rawDt: number) {
    const pf = this.perf;
    if (pf.checked || this.debug || !this.save.settings.quality || document.hidden) return;
    pf.t += rawDt;
    if (pf.t < 2.5) return; // Anlaufphase (Shader, Texturen) ignorieren
    pf.frames++;
    pf.acc += rawDt;
    if (pf.acc < 5) return;
    const fps = pf.frames / pf.acc;
    if (fps < 38) {
      this.save.settings.quality = false;
      this.applySettings();
      this.hud.toast(`${svg('gear')} Grafik für flüssigeres Spielen angepasst`);
    }
    pf.checked = true;
  }

  // ================================================================ Aufbau
  private buildHotel() {
    for (let z = 1; z <= 7; z++) {
      const zc = ZONE_CELLS[z];
      for (let i = 1; i <= 4; i++) {
        const isWC = zc.wc === i;
        const view = new CellView(z, i, isWC ? 'wc' : 'room', this.world.mat, this.col, this.world.root);
        this.cells.push(view);
        if (isWC) {
          const m = view.w(WC.money.u, WC.money.v);
          const pile = this.money.createPile(`wc${z}`, m.x, m.z, 2, 1);
          const wc = new WCRt(`zone_${z}.toilet`, z, i, view, pile);
          this.wcs.push(wc);
          this.wcByZone.set(z, wc);
        } else {
          const key = roomKey(z, i);
          const tp = view.w(ROOM.tip.u, ROOM.tip.v);
          const pile = this.money.createPile(`tip:${key}`, tp.x, tp.z, 2, 1);
          const r = new RoomRt(key, z, i, maxTier(key), view, pile);
          this.rooms.push(r);
          this.roomByKey.set(key, r);
        }
        view.set(z === 1 ? 'unbuilt' : 'locked');
      }
      this.world.setZoneLocked(z, z !== 1);
    }
  }

  /** Spielstand anwenden */
  private restore() {
    const s = this.save;
    for (const id of s.bought) {
      const n = NODES.find((k) => k.id === id);
      if (!n) continue;
      this.bought.add(id);
      if (n.kind === 'room' && n.tier >= 2) {
        const r = this.roomByKey.get(n.key)!;
        r.design = s.designs[n.key] ?? 0;
      }
      this.applyNode(n, false);
    }
    for (const [zone, stock] of Object.entries(s.paper)) {
      const wc = this.wcByZone.get(Number(zone));
      if (wc && wc.built) {
        wc.stock = Math.min(TOILET_STOCK_MAX, stock);
        wc.view.setPaperStock(wc.stock);
      }
    }
    for (const p of this.money.piles) {
      const v = s.piles[p.id];
      if (v) this.money.add(p, v, false);
    }
    this.levelShown = s.levelClaimed;
    this.refreshPlates();
    // Startposition
    if (s.bought.length === 0) {
      this.player.place(3.5, -6.5);
      this.player.ch.root.rotation.y = Math.PI * 0.8;
      // Zwei Gäste warten schon (Tutorial)
      this.guests.spawn({ atSlot: true });
      this.guests.spawn({ atSlot: true });
    } else {
      this.player.place(0, -3.5);
      this.player.ch.root.rotation.y = Math.PI;
      for (let i = 0; i < 3; i++) this.guests.spawn({ atSlot: true });
    }
    this.stage.snap(this.player.x, this.player.z);
    this.quests.refill();
  }

  start() {
    if (this.started) return;
    this.started = true;
    // Offline-Fortschritt über die Passiv-Koeffizienten (§16, Punkt 13)
    const away = (Date.now() - this.save.savedAt) / 1000;
    if (this.save.bought.length > 0 && away > OFFLINE.minSeconds) this.grantOffline(away);
    this.checkLevel();
    if (!this.input.usedTouch) this.hud.showHint(matchMedia('(pointer: coarse)').matches ? T.controlsHintTouch : T.controlsHintKeys);
    this.input.onFirstInput = () => {
      this.sfx.unlock();
      this.hud.hideHint();
    };
  }

  private grantOffline(seconds: number) {
    const secs = Math.min(seconds, OFFLINE.maxSeconds);
    const amount = Math.floor(this.passivePerSecond * secs * this.incomeMult);
    if (amount >= 1) this.ui.showOffline(amount, seconds);
  }

  get passivePerSecond() {
    let s = 0;
    for (const r of this.rooms) s += ROOM_INCOME[r.tier].passive;
    for (const w of this.wcs) if (w.built) s += TOILET_INCOME.passive;
    if (this.parkingBuilt) s += PARKING_INCOME.passive;
    return s;
  }

  private bindLifecycle() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.hiddenAt = Date.now();
        this.persist();
      } else if (this.hiddenAt) {
        const away = (Date.now() - this.hiddenAt) / 1000;
        this.hiddenAt = 0;
        if (away > OFFLINE.minSeconds && !this.ui.modalOpen) this.grantOffline(away);
      }
    });
    window.addEventListener('pagehide', () => this.persist());
    window.addEventListener('beforeunload', () => this.persist());
  }

  applySettings() {
    const st = this.save.settings;
    this.sfx.enabled = st.sound;
    this.stage.setQuality(st.quality);
  }

  // ================================================================ Abgeleitete Werte
  get level() {
    return levelForStars(this.save.stars);
  }

  get incomeMult() {
    return RUNS[this.save.run - 1].income;
  }

  get incomePerMinute() {
    const now = this.time;
    this.incomeLog = this.incomeLog.filter((e) => now - e.t < 300);
    const span = Math.max(30, Math.min(300, now));
    return (this.incomeLog.reduce((a, e) => a + e.v, 0) / span) * 60;
  }

  private logIncome(v: number) {
    this.incomeLog.push({ t: this.time, v });
  }

  resOf(t: ResType) {
    return t === 'candy' ? this.save.candy : this.save.toiletpaper;
  }

  // ================================================================ Käufe
  private nodeAvailable(n: UpgradeNode) {
    if (this.bought.has(n.id)) return false;
    if ((n.minLevel ?? 1) > this.level) return false;
    return n.requires.every((r) => this.bought.has(r));
  }

  private platePos(n: UpgradeNode): { x: number; z: number; size: number } {
    switch (n.kind) {
      case 'room': {
        const r = this.roomByKey.get(n.key)!;
        const p = n.tier === 1 ? r.w(ROOM.buildPlate.u, ROOM.buildPlate.v) : r.w(ROOM.plate.u, ROOM.plate.v);
        return { ...p, size: n.tier === 1 ? ROOM.buildPlate.size : ROOM.plate.size };
      }
      case 'toilet': {
        const w = this.wcByZone.get(n.zone!)!;
        return { ...w.w(WC.buildPlate.u, WC.buildPlate.v), size: WC.buildPlate.size };
      }
      case 'cleaner':
        return { ...cleanerPost(n.zone!), size: 2.3 };
      case 'zone':
        return { ...zonePlatePos(n.zone!), size: 3.2 };
      case 'reception':
        return { ...P.receptionPlate, size: 2.6 };
      case 'supplier':
        return { ...P.supplierPlate, size: 2.8 };
      case 'parking':
        return { ...P.parkingPlate, size: 2.8 };
      case 'parker':
        return { ...P.parkerPlate, size: 2.6 };
      case 'elevator':
        return { ...P.elevatorPlate, size: 3.0 };
    }
  }

  refreshPlates() {
    for (const n of NODES) {
      const has = this.plates.get(n.id);
      if (this.nodeAvailable(n)) {
        if (!has) {
          const pos = this.platePos(n);
          const part = this.save.partial[n.id];
          const cost = priceFor(n.key, n.tier, this.save.run);
          const pl = new Plate(n, cost, pos.x, pos.z, pos.size, part?.paid ?? 0, part?.res ?? false, this.stage.yaw, this.stage.scene);
          this.plates.set(n.id, pl);
        }
      } else if (has && !has.removing) {
        has.removing = true;
      }
    }
    if (this.finderIndex >= this.finderList().length) this.finderIndex = 0;
  }

  private completePurchase(pl: Plate) {
    const n = pl.node;
    const s = this.save;
    pl.removing = true;
    delete s.partial[n.id];
    this.bought.add(n.id);
    s.bought.push(n.id);
    this.applyNode(n, true);
    if (n.stars > 0) {
      s.stars += n.stars;
      this.fx.float(pl.x, 1.4, pl.z, `+${n.stars} ${svg('star')}`, 'star big', 1.6, 70);
      this.events.emit('stars', { amount: n.stars, total: s.stars });
    }
    s.stats.purchases++;
    this.events.emit('purchase', { id: n.id, kind: n.kind });
    this.sfx.play('buy');
    this.vibrate(30);
    this.player.ch.pop();
    if (n.kind === 'room' && n.tier >= 2 && !this.silent) {
      const r = this.roomByKey.get(n.key)!;
      this.ui.showDesign(r, n.tier, (d) => {
        s.designs[r.key] = d;
        r.design = d;
        this.refreshRoomView(r, true);
        this.persist();
      });
    }
    if (n.kind === 'zone') this.hud.toast(`${svg('zone')} ${T.plate.zone} ${n.zone}!`);
    if (n.kind === 'elevator' && !this.silent) setTimeout(() => this.ui.showHotelComplete(), 600);
    if (this.guideActive) {
      this.guideActive = false;
    }
    this.refreshPlates();
    this.checkLevel();
    this.persist();
  }

  private applyNode(n: UpgradeNode, fresh: boolean) {
    switch (n.kind) {
      case 'room': {
        const r = this.roomByKey.get(n.key)!;
        r.tier = n.tier;
        if (r.state === 'unbuilt') r.state = 'free';
        if (n.tier >= 2 && fresh) r.design = 0;
        this.refreshRoomView(r, fresh);
        if (fresh) this.puff(r.view.cx, r.view.cz);
        break;
      }
      case 'toilet': {
        const w = this.wcByZone.get(n.zone!)!;
        w.built = true;
        w.view.set('built', 1, 0, fresh);
        if (fresh) {
          w.stock = 3;
          this.puff(w.view.cx, w.view.cz);
        }
        w.view.setPaperStock(w.stock);
        if (!this.markers.wc.has(w.zone)) {
          const pp = w.paperPos;
          this.markers.wc.set(w.zone, new FloorMarker(this.stage.scene, pp.x, pp.z, 2.0, 'paper', this.stage.yaw, 'rgba(95,208,255,1)'));
        }
        break;
      }
      case 'cleaner':
        this.staff.setCleaner(n.zone!, n.tier);
        break;
      case 'zone':
        this.unlockZone(n.zone!, fresh);
        break;
      case 'reception':
        this.receptionTier = n.tier;
        this.staff.setReception(n.tier);
        break;
      case 'supplier':
        this.supplierTier = n.tier;
        this.staff.setSupplier(n.tier);
        break;
      case 'parking':
        this.parkingBuilt = true;
        this.world.setGarageOpen(true);
        this.parking.active = true;
        break;
      case 'parker':
        this.parkerBuilt = true;
        this.staff.setParker(true);
        this.parking.parkerOn = true;
        break;
      case 'elevator':
        this.elevatorBuilt = true;
        this.world.setElevator(true);
        this.save.prestigeReady = true;
        break;
    }
  }

  private unlockZone(z: number, fresh: boolean) {
    this.zoneUnlocked[z] = true;
    this.world.setZoneLocked(z, false);
    for (const r of this.rooms) if (r.zone === z && r.tier === 0) r.view.set('unbuilt', 0, 0, fresh);
    const w = this.wcByZone.get(z);
    if (w && !w.built) w.view.set('unbuilt', 0, 0, fresh);
  }

  refreshRoomView(r: RoomRt, animate: boolean) {
    if (r.tier === 0) {
      r.view.set(this.zoneUnlocked[r.zone] ? 'unbuilt' : 'locked');
      return;
    }
    r.view.set('built', r.tier, r.design, animate);
    r.spots.forEach((sp, i) => r.view.setDirty(i, sp.dirty));
    r.view.setNight(r.night);
  }

  private puff(x: number, z: number) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.fx.float(x + Math.cos(a) * 2, 0.5, z + Math.sin(a) * 2, svg('sparkle'), '', 0.8, 30);
    }
  }

  // ================================================================ Level
  checkLevel() {
    const lvl = this.level;
    while (this.levelShown < lvl) {
      this.levelShown++;
      if (this.silent) {
        const def = LEVELS.find((l) => l.level === this.levelShown)!;
        const rb = LEVEL_RES_BONUS[this.levelShown];
        this.claimLevel(this.levelShown, def.cash, def.tokens, rb?.candy ?? 0, rb?.toiletpaper ?? 0);
      } else this.ui.queueLevelUp(this.levelShown);
    }
  }

  claimLevel(level: number, cash: number, tokens: number, candy = 0, toiletpaper = 0) {
    const s = this.save;
    s.levelClaimed = Math.max(s.levelClaimed, level);
    this.grant('cash', cash);
    this.grant('tokens', tokens);
    this.grant('candy', candy);
    this.grant('toiletpaper', toiletpaper);
    this.events.emit('levelUp', { level });
    this.refreshPlates();
    this.quests.refill();
    this.persist();
  }

  onModalClosed() {
    if (!this.ui.modalOpen && this.hud.activeTab === 2) this.input.enabled = true;
    if (!this.ui.modalOpen) setTimeout(() => this.ui.nextLevelUp(), 250);
  }

  // ================================================================ Belohnungen & Währungen
  grant(type: 'cash' | 'gems' | 'tokens' | ResType, amount: number) {
    if (amount <= 0) return;
    const s = this.save;
    if (type === 'cash') s.cash += amount;
    else if (type === 'gems') s.gems += amount;
    else if (type === 'tokens') s.tokens += amount;
    else if (type === 'candy') s.candy += amount;
    else s.toiletpaper += amount;
    const icon = type === 'cash' ? 'cash' : type === 'gems' ? 'gem' : type === 'tokens' ? 'token' : type;
    this.hud.bump(type as 'cash');
    // mehrere gleichzeitige Belohnungen übereinander staffeln
    const now = this.time;
    this.grantStack = now - this.grantAt < 0.4 ? this.grantStack + 1 : 0;
    this.grantAt = now;
    this.fx.float(this.player.x, 2.6 + this.grantStack * 0.75, this.player.z, `+${fmt(amount)} ${svg(icon)}`, 'big', 1.5, 60);
    this.events.emit('currency', { type });
  }

  /** Belohnung am Ort: Bargeld physisch, Ressourcen direkt */
  rewardAt(x: number, z: number, r: { cash?: number; candy?: number; toiletpaper?: number }) {
    if (r.cash) {
      const room = this.specials.active?.room;
      if (room) this.money.add(room.tipPile, r.cash);
      else this.money.add(this.receptionPile, r.cash);
    }
    if (r.candy) {
      this.save.candy += r.candy;
      this.fx.float(x, 2.4, z, `+${r.candy} ${svg('candy')}`, 'big', 1.5, 60);
      this.hud.bump('candy');
    }
    if (r.toiletpaper) {
      this.save.toiletpaper += r.toiletpaper;
      this.fx.float(x + 0.8, 2.0, z, `+${r.toiletpaper} ${svg('toiletpaper')}`, 'big', 1.5, 60);
      this.hud.bump('toiletpaper');
    }
  }

  addReceptionCash(v: number) {
    this.money.add(this.receptionPile, v);
  }

  onVipCheckedIn(_g: unknown) {
    this.save.stats.vips++;
    this.events.emit('vip', {});
    this.hud.toast(`${svg('crown')} VIP eingecheckt! +${fmt(10 * this.incomeMult)} Trinkgeld`);
  }

  onCarParked() {
    const v = Math.round(PARKING_INCOME.pay * this.incomeMult);
    this.money.add(this.parkingPile, v);
    this.save.stats.cars++;
    this.events.emit('car', {});
    this.sfx.play('car');
    if (this.guests.queue.length < 16) this.guests.spawn({ fromCar: true });
  }

  spawnPickup(type: PickupType, p: Pt, amount: number) {
    const obj = pickupMesh(type);
    obj.position.set(p.x, 0.3, p.z);
    this.stage.scene.add(obj);
    this.pickups.push({ type, obj, x: p.x, z: p.z, amount, t: Math.random() * 6 });
  }

  onSpotCleaned(r: RoomRt, i: number, byPlayer: boolean) {
    const sp = ROOM.spots[i];
    const w = r.w(sp.u, sp.v);
    this.fx.float(w.x, 1.2, w.z, svg('sparkle'), '', 0.7, 34);
    if (byPlayer) this.sfx.play('clean');
    if (r.state === 'free') {
      this.save.stats.cleans++;
      this.events.emit('clean', { zone: r.zone, byPlayer });
      this.fx.float(r.view.cx, 2.2, r.view.cz, svg('check') , '', 1.0, 40);
    }
  }

  claimGift() {
    const s = this.save;
    if (Date.now() < s.giftAt) return;
    s.giftAt = Date.now() + 3 * 3600 * 1000;
    const roll = Math.random();
    if (roll < 0.35) this.grant('gems', 2);
    else if (roll < 0.6) this.grant('tokens', 2);
    else if (roll < 0.8) this.grant('candy', 4);
    else this.grant('cash', Math.round(250 * this.level * this.level * this.incomeMult));
    this.sfx.play('reward');
  }

  canAffordPlayerUpgrade() {
    const s = this.save;
    const up = PLAYER_UPGRADES[s.playerUpg];
    const bp = BACKPACK_UPGRADES[s.backpack];
    return (!!up && s.tokens >= up.cost) || (!!bp && s.tokens >= bp);
  }

  buyPlayerUpgrade() {
    const s = this.save;
    const up = PLAYER_UPGRADES[s.playerUpg];
    if (!up || s.tokens < up.cost) return;
    s.tokens -= up.cost;
    s.playerUpg++;
    this.player.ch.pop();
    this.sfx.play('powerup');
    this.persist();
  }

  buyBackpack() {
    const s = this.save;
    const c = BACKPACK_UPGRADES[s.backpack];
    if (c === undefined || s.tokens < c) return;
    s.tokens -= c;
    s.backpack++;
    this.player.ch.pop();
    this.sfx.play('powerup');
    this.persist();
  }

  vibrate(ms: number) {
    if (this.save.settings.vibration && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {
        /* nicht unterstützt */
      }
    }
  }

  // ================================================================ Aufgabenfinder
  finderList(): Plate[] {
    const list = [...this.plates.values()].filter((p) => !p.removing);
    list.sort((a, b) => Number(b.affordable) - Number(a.affordable) || a.cost.cash - b.cost.cash);
    return list;
  }

  nextFinder() {
    const n = this.finderList().length;
    if (!n) return;
    if (!this.guideActive) {
      this.guideActive = true;
      this.finderIndex = 0;
    } else this.finderIndex = (this.finderIndex + 1) % n;
  }

  private guideTarget(): Pt | null {
    const step = this.quests.tutorialStep;
    if (step) {
      if (this.quests.tutorialMissing > 0) {
        // Erst Geld einsammeln, sonst Gäste einchecken
        const pile = this.money.piles.filter((p) => p.bundles.length > 0).sort((a, b) => b.total - a.total)[0];
        return pile ? { x: pile.x, z: pile.z } : { ...P.receptionPlayer };
      }
      return step.target(this);
    }
    if (this.guideActive) {
      const list = this.finderList();
      const p = list[this.finderIndex % Math.max(1, list.length)];
      if (!p) {
        this.guideActive = false;
        return null;
      }
      if (Math.hypot(p.x - this.player.x, p.z - this.player.z) < 1.0) {
        this.guideActive = false;
        return null;
      }
      return { x: p.x, z: p.z };
    }
    return null;
  }

  // ================================================================ Hauptschleife
  update(rawDt: number) {
    this.autoQuality(rawDt);
    const dt = rawDt * this.timeScale;
    this.time += dt;
    this.save.stats.playSeconds += rawDt;
    this.fx.beginFrame();
    this.player.update(dt);
    this.updateInteractions(dt);
    this.guests.update(dt);
    this.staff.update(dt);
    this.parking.update(dt, this.parking.active && Math.hypot(this.player.x - P.valetSpot.x, this.player.z - P.valetSpot.z) < 1.5);
    this.specials.update(dt);
    for (const r of this.rooms) {
      if (Math.abs(r.night - r.nightTarget) > 0.001) {
        r.night += (r.nightTarget - r.night) * Math.min(1, dt * 5);
        r.view.setNight(r.night);
      }
    }
    for (const c of this.cells) c.update(dt);
    for (const [id, pl] of this.plates) {
      if (pl.removing && pl.appear <= 0) {
        pl.dispose();
        this.plates.delete(id);
      }
    }
    this.updatePickups(dt);
    this.money.update(dt);
    this.shadows.update();
    const nearDoor = this.guests.guests.some((g) => Math.abs(g.z - 6.2) < 2.2 && Math.abs(g.x) < 3.5) || (Math.abs(this.player.z - 6.2) < 2.2 && Math.abs(this.player.x) < 3.5);
    this.world.update(dt, this.time, nearDoor);
    this.quests.update();
    this.guide.update(rawDt, { x: this.player.x, z: this.player.z }, this.guideTarget(), this.nav);
    this.hud.update(rawDt);
    this.ui.refreshPage();
    this.stage.target.set(this.player.x, 0, this.player.z);
    this.stage.updateCamera(rawDt);
    this.fx.endFrame();
    this.fx.update(rawDt);
    this.saveT += rawDt;
    if (this.saveT > 5) {
      this.saveT = 0;
      this.persist();
    }
  }

  private findFreeRoom(): RoomRt | null {
    let best: RoomRt | null = null;
    let bs = -Infinity;
    for (const r of this.rooms) {
      if (r.state !== 'free') continue;
      // höchste Stufe zuerst, dann die nächstgelegene
      const score = r.tier * 1000 + (r.design === 2 ? 500 : 0) - Math.hypot(r.view.cx, r.view.cz);
      if (score > bs) {
        bs = score;
        best = r;
      }
    }
    return best;
  }

  private chest = () => ({ x: this.player.x, y: 1.1, z: this.player.z });

  private updateInteractions(dt: number) {
    const p = this.player;
    const s = this.save;
    const px = p.x;
    const pz = p.z;

    // ---- Kaufplatten
    let paying = false;
    for (const pl of this.plates.values()) {
      const res = pl.cost.res;
      const resShort = !!res && !pl.resPaid && this.resOf(res.type) < res.amount;
      pl.affordable = s.cash + 1e-6 >= pl.rest && !resShort;
      if (!pl.removing && pl.contains(px, pz) && this.input.enabled) {
        pl.onT += dt;
        if (pl.onT > PLATE_DELAY) {
          if (res && !pl.resPaid) {
            if (!resShort) {
              if (res.type === 'candy') s.candy -= res.amount;
              else s.toiletpaper -= res.amount;
              pl.resPaid = true;
              this.hud.bump(res.type);
            } else if (!pl.mesh.userData.warned) {
              pl.mesh.userData.warned = true;
              pl.blockedFlash = 0.9;
              this.hud.toast(`${svg(res.type)} Dir fehlen ${res.amount - this.resOf(res.type)} ${RES_NAMES[res.type]}`);
              this.sfx.play('error');
            }
          }
          if (!res || pl.resPaid) {
            const tick = pl.pay(dt, s.cash);
            if (tick > 0) {
              s.cash = Math.max(0, s.cash - tick);
              paying = true;
              s.partial[pl.node.id] = { paid: pl.paid, res: pl.resPaid };
            } else if (s.cash < 1 && pl.rest > 0 && !pl.mesh.userData.broke) {
              pl.mesh.userData.broke = true;
              pl.blockedFlash = 0.9;
              this.sfx.play('error');
            }
            if (pl.complete) this.completePurchase(pl);
          } else if (res && pl.resPaid) {
            s.partial[pl.node.id] = { paid: pl.paid, res: true };
          }
        }
      } else {
        pl.onT = 0;
        pl.mesh.userData.warned = false;
        pl.mesh.userData.broke = false;
      }
      pl.update(dt, this.time, resShort);
    }
    if (paying) {
      this.payFxT -= dt;
      if (this.payFxT <= 0) {
        this.payFxT = 0.07;
        const pl = [...this.plates.values()].find((k) => k.onT > 0);
        if (pl) {
          this.money.fly({ x: px, y: 1.2, z: pz }, () => ({ x: pl.x, y: 0.1, z: pl.z }));
          this.sfx.play('pay');
        }
      }
    }

    // ---- Rezeption (Check-in)
    const atDesk = Math.hypot(px - P.receptionPlayer.x, pz - P.receptionPlayer.z) < 1.3;
    const front = this.guests.queueFront;
    const room = front ? this.findFreeRoom() : null;
    const rate = (atDesk ? PLAYER_CHECKIN_RATE : 0) + this.staff.receptionRate;
    this.checkinActive = !!front && !!room && rate > 0;
    const deskAnchor = () => ({ x: 0, y: 2.3, z: -1.0 });
    if (this.checkinActive && front && room) {
      this.checkinProgress += rate * dt;
      this.fx.ring('checkin', deskAnchor, this.checkinProgress);
      if (this.checkinProgress >= 1) {
        this.checkinProgress = 0;
        this.guests.checkIn(front, room);
        s.stats.checkins++;
        this.events.emit('checkin', { vip: front.vip, special: !!front.special });
        this.sfx.play('bell');
        this.fx.float(front.x, 2.2, front.z, svg('key'), '', 0.9, 40);
      }
    } else if (front && !room) {
      this.fx.set('noroom', () => ({ x: front.x, y: 2.5, z: front.z }), svg('noBed'), 'bubble warn');
    }
    if (atDesk && !front && this.guests.queue.length === 0 && s.tutorial < 0) {
      /* nichts zu tun */
    }

    // ---- Putzen durch den Spieler
    for (const r of this.rooms) {
      if (r.state !== 'dirty') continue;
      if (Math.abs(r.view.cx - px) > 5 || Math.abs(r.view.cz - pz) > 5) continue;
      for (let i = 0; i < r.spots.length; i++) {
        if (!r.spots[i].dirty) continue;
        const sp = ROOM.spots[i];
        const tw = r.w(sp.trig.u, sp.trig.v);
        if (Math.hypot(px - tw.x, pz - tw.z) < sp.r) {
          const done = r.work(i, PLAYER_CLEAN_RATE * dt);
          this.fx.ring(`pc${r.key}${i}`, () => ({ ...r.w(sp.u, sp.v), y: 1.6 }), r.spots[i].progress, '#ffd23a');
          p.ch.pose = 'work';
          if (done) this.onSpotCleaned(r, i, true);
        }
      }
    }
    if (p.ch.pose === 'work' && p.speedNow > 0.5) p.ch.pose = 'idle';
    if (p.ch.pose === 'work') {
      let still = false;
      for (const r of this.rooms) if (r.state === 'dirty' && Math.hypot(r.view.cx - px, r.view.cz - pz) < 5) still = true;
      if (!still) p.ch.pose = 'idle';
    }

    // ---- Geld einsammeln
    const pr = p.pickupRadius;
    for (const pile of this.money.piles) {
      if (pile.bundles.length === 0) continue;
      const d = Math.hypot(px - pile.x, pz - pile.z);
      if (d < pile.radius + pr - 0.55) {
        this.money.collect(pile, dt, this.chest, (v) => this.onCollected(v, pile.id));
      }
    }
    if (this.collectFloat > 0) {
      this.collectFloatT -= dt;
      if (this.collectFloatT <= 0) {
        this.fx.float(px, 2.4, pz, `+${fmt(this.collectFloat)}`, 'cash', 0.9, 44);
        this.collectFloat = 0;
        this.collectFloatT = 0.3;
      }
    }

    // ---- Klopapier aus dem Lager
    const cap = p.capacity;
    if (Math.hypot(px - P.paperPickup.x, pz - P.paperPickup.z) < 1.6 && p.carried.length < cap) {
      this.paperT += dt;
      if (this.paperT > 0.14) {
        this.paperT = 0;
        p.carried.push('roll');
        this.sfx.play('paper');
        this.events.emit('pickupPaper', { amount: 1 });
      }
    }
    // ---- Klopapier in die Toiletten
    const rolls = p.carried.filter((c) => c === 'roll').length;
    let dropping = false;
    for (const w of this.wcs) {
      if (!w.built || rolls === 0) continue;
      const pp = w.paperPos;
      if (Math.hypot(px - pp.x, pz - pp.z) < 1.4 && w.stock < TOILET_STOCK_MAX) {
        dropping = true;
        this.dropT += dt;
        if (this.dropT > 0.12) {
          this.dropT = 0;
          const i = p.carried.lastIndexOf('roll');
          p.carried.splice(i, 1);
          w.stock++;
          w.view.setPaperStock(w.stock);
          s.stats.paper++;
          this.events.emit('paper', { amount: 1, byPlayer: true });
          this.sfx.play('paper');
        }
      }
    }
    if (!dropping) this.dropT = 0.08;
    // ---- Service-Theke (Sonderwünsche)
    const want = this.specials.wantedItem;
    if (want && Math.hypot(px - P.serviceBarPickup.x, pz - P.serviceBarPickup.z) < 1.5 && !p.carried.includes(want) && p.carried.length < cap) {
      p.carried.push(want);
      this.sfx.play('pop');
    }
    const lp = this.specials.luggagePos;
    if (lp && Math.hypot(px - lp.x, pz - lp.z) < 1.3 && !p.carried.includes('luggage') && p.carried.length < cap) {
      p.carried.push('luggage');
      this.specials.takeLuggage();
      this.sfx.play('pop');
    }
    const sg = this.specials.active;
    if (sg && sg.state === 'special' && Math.hypot(px - sg.x, pz - sg.z) < 2.0) {
      const idx = this.specials.tryDeliver(p.carried);
      if (idx >= 0) p.carried.splice(idx, 1);
    }
    // ---- Mülleimer
    if (p.carried.length > 0 && Math.hypot(px - P.trash.x, pz - P.trash.z) < 1.5) {
      p.carried = [];
      this.fx.float(P.trash.x, 1.5, P.trash.z, svg('sparkle'), '', 0.6, 30);
      this.sfx.play('pop');
    }
    // Trage-Anzeige
    if (p.carried.length > 0) {
      const full = p.carried.length >= cap;
      this.fx.set('carry', () => ({ x: this.player.x, y: 2.9 + p.carried.length * 0.28, z: this.player.z }), `<span class="carry-tag stroke">${full ? T.full : `${p.carried.length}/${cap}`}</span>`, '');
    }
    // WC-Anzeigen (Papiervorrat)
    for (const w of this.wcs) {
      if (!w.built) continue;
      const near = Math.hypot(px - w.view.cx, pz - w.view.cz) < 16;
      if (w.stock === 0) this.fx.set('wc' + w.zone, () => ({ ...w.w(0, -0.5), y: 2.6 }), svg('noPaper'), 'bubble warn');
      else if (near) this.fx.set('wc' + w.zone, () => ({ ...w.w(WC.paper.u, WC.paper.v), y: 1.9 }), `<span class="stock-tag stroke">${svg('paper')}${w.stock}/${TOILET_STOCK_MAX}</span>`, '');
    }
    // Hinweis bei der Parkplatz-Schranke
    if (this.parking.active && this.parking.progress > 0) {
      this.fx.ring('valet', () => ({ x: P.barrier.x - 2.4, y: 2.2, z: P.barrier.z }), this.parking.progress, '#39a9ff');
    }
    // Bodenzonen
    const mk = this.markers;
    const tutStep = s.tutorial;
    mk.reception.active = atDesk || (!!front && !!room && this.receptionTier === 0);
    mk.paper.visible = this.wcs.some((w) => w.built);
    mk.paper.active = Math.hypot(px - P.paperPickup.x, pz - P.paperPickup.z) < 1.6 || tutStep === 7;
    for (const [zone, m] of mk.wc) {
      const w = this.wcByZone.get(zone)!;
      m.active = (rolls > 0 && w.stock < TOILET_STOCK_MAX) || w.stock <= 2;
    }
    mk.valet.visible = this.parking.active;
    mk.valet.active = this.parking.frontWaiting && !this.parkerBuilt;
    mk.service.visible = this.level >= 2;
    mk.service.active = !!want;
    mk.trash.visible = p.carried.length > 0;
    mk.trash.active = Math.hypot(px - P.trash.x, pz - P.trash.z) < 1.5;
    for (const m of [mk.reception, mk.paper, mk.valet, mk.service, mk.trash, ...mk.wc.values()]) m.update(dt);
  }

  private onCollected(v: number, pileId: string) {
    const s = this.save;
    s.cash += v;
    s.stats.cashEarned += v;
    if (pileId === 'reception') s.stats.collectedReception++;
    this.collectFloat += v;
    if (this.collectFloatT <= 0) this.collectFloatT = 0.12;
    this.events.emit('collect', { amount: v, source: pileId });
    this.hud.bump('cash');
    this.sfx.play('coin');
  }

  private updatePickups(dt: number) {
    const px = this.player.x;
    const pz = this.player.z;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i];
      k.t += dt;
      k.obj.position.y = 0.35 + Math.sin(k.t * 3) * 0.1;
      k.obj.rotation.y = k.t * 1.5;
      if (Math.hypot(px - k.x, pz - k.z) < Math.max(1.2, this.player.pickupRadius * 0.9)) {
        if (k.type === 'candy' || k.type === 'toiletpaper') this.grant(k.type, k.amount);
        k.obj.removeFromParent();
        this.pickups.splice(i, 1);
        this.sfx.play('reward');
      }
    }
  }

  // ================================================================ Speichern
  persist() {
    const s = this.save;
    s.piles = {};
    for (const p of this.money.piles) {
      const t = p.total;
      if (t > 0) s.piles[p.id] = t;
    }
    s.paper = {};
    for (const w of this.wcs) if (w.built) s.paper[w.zone] = w.stock;
    s.cash = Math.max(0, s.cash);
    writeSave(s);
  }

  resetAll() {
    clearSave();
    this.save = newSave();
    writeSave(this.save);
    location.reload();
  }

  prestige() {
    const s = this.save;
    if (!s.prestigeReady || s.run >= 3) return;
    const keep = { ...s };
    const fresh = newHotelState(s.run + 1);
    this.save = { ...keep, ...fresh };
    writeSave(this.save);
    location.reload();
  }

  // ================================================================ Debug (?debug)
  private debugSetup(params: URLSearchParams) {
    const cash = Number(params.get('cash') ?? 0);
    if (cash) this.save.cash = cash;
    if (params.has('gems')) this.save.gems = Number(params.get('gems'));
    if (params.has('tokens')) this.save.tokens = Number(params.get('tokens'));
    if (params.has('res')) {
      this.save.candy = Number(params.get('res'));
      this.save.toiletpaper = Number(params.get('res'));
    }
    if (params.has('skiptut')) this.save.tutorial = -1;
    (window as unknown as { hotel: Game }).hotel = this;
  }

  /** Für Tests/Debug: alle verfügbaren Platten sofort kaufen */
  debugBuyAll(maxRounds = 200) {
    this.silent = true;
    for (let k = 0; k < maxRounds; k++) {
      const list = [...this.plates.values()].filter((p) => !p.removing);
      if (!list.length) break;
      for (const pl of list) {
        if (pl.removing) continue;
        pl.paid = pl.cost.cash;
        pl.resPaid = true;
        this.completePurchase(pl);
      }
    }
    this.silent = false;
  }
}

export { nodeId, LEVELS };
