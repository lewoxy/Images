import { svg } from './icons';
import { STAR_BADGE } from './hud';
import { GAME_TITLE, HOTEL_NAMES, LEVEL_FEATURES, RES_NAMES, T, fmt, fmtTime } from '../config/strings';
import { BACKPACK_UPGRADES, GEM_PRICES, LEVELS, LEVEL_RES_BONUS, PLAYER_BASE, PLAYER_UPGRADES, ROOM_INCOME, RUNS, STARS } from '../config/balance';
import { tierColors } from '../config/palette';
import type { Game } from '../game/game';
import { ACHIEVEMENTS, questText } from '../game/quests';
import type { RoomRt } from '../game/hotel';

/** Modale Fenster und Seiten der Tab-Leiste. */

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

export class UI {
  private modalStack: HTMLElement[] = [];
  private page: HTMLElement | null = null;
  private levelQueue: number[] = [];
  private pageTimer = 0;

  constructor(
    private g: Game,
    private root: HTMLElement,
  ) {}

  get modalOpen() {
    return this.modalStack.length > 0;
  }

  get blocking() {
    return this.modalOpen || this.page !== null;
  }

  // ------------------------------------------------------------ Grundgerüst
  private modal(html: string, opts: { closable?: boolean; onClose?: () => void; cls?: string } = {}) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal ${opts.cls ?? ''}">${opts.closable !== false ? `<button class="close-x" data-x="1">✕</button>` : ''}${html}</div>`;
    this.root.appendChild(back);
    this.modalStack.push(back);
    const close = () => {
      if (!back.isConnected) return;
      back.remove();
      this.modalStack = this.modalStack.filter((m) => m !== back);
      opts.onClose?.();
      this.g.onModalClosed();
    };
    back.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.dataset.x || (t === back && opts.closable !== false)) {
        this.g.sfx.play('click');
        close();
      }
    });
    this.g.input.enabled = false;
    return { el: back.querySelector('.modal') as HTMLElement, close };
  }

  private on(el: HTMLElement, sel: string, fn: (b: HTMLElement) => void) {
    el.querySelectorAll<HTMLElement>(sel).forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.g.sfx.play('click');
        fn(b);
      }),
    );
  }

  confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cols = ['#ffc62b', '#ff5fa8', '#39a9ff', '#3bd65a', '#a56bff', '#ff7a3d'];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = cols[i % cols.length];
      c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
      c.style.animationDelay = Math.random() * 0.4 + 's';
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      this.root.appendChild(c);
      setTimeout(() => c.remove(), 3800);
    }
  }

  // ------------------------------------------------------------ Aktionen aus dem HUD
  action(act: string) {
    const g = this.g;
    switch (act) {
      case 'settings':
        return this.showSettings();
      case 'quests':
        return this.showQuests();
      case 'shop':
      case 'cur-cash':
      case 'cur-gems':
        return this.showShop();
      case 'gift':
        return this.showShop();
      case 'scooter':
        return this.buyGemItem('scooter');
      case 'helper':
        return this.buyGemItem('helper');
      case 'finder':
        g.nextFinder();
        return;
      case 'special': {
        const sc = g.specials.cardInfo;
        if (sc) g.hud.toast(`${svg('star')} ${sc.name} (${sc.role})`);
        return;
      }
      case 'cur-candy':
        g.hud.toast(`${svg('candy')} ${RES_NAMES.candy}: für Personal ab Zone 2 – von Sondergästen & Gästen`);
        return;
      case 'cur-toiletpaper':
        g.hud.toast(`${svg('toiletpaper')} ${RES_NAMES.toiletpaper}: für neue Bereiche ab Zone 3`);
        return;
      case 'cur-tokens':
        g.hud.setTab(3);
        return;
    }
  }

  buyGemItem(kind: 'scooter' | 'helper' | 'cashPack' | 'candyPack' | 'toiletpaperPack') {
    const g = this.g;
    const price = GEM_PRICES[kind];
    if (g.save.gems < price) {
      g.hud.toast(`${svg('gem')} Nicht genug Gems – Aufträge und Erfolge bringen welche!`);
      g.sfx.play('error');
      return false;
    }
    if (kind === 'scooter' && g.save.boosts.scooter > 0) {
      g.save.boosts.scooter += 180;
    }
    g.save.gems -= price;
    switch (kind) {
      case 'scooter':
        g.save.boosts.scooter = Math.max(g.save.boosts.scooter, 180);
        g.hud.toast(svg('scooter') + T.scooterFound);
        break;
      case 'helper':
        g.save.boosts.helper += 300;
        g.hud.toast(svg('helper') + 'Aushilfe unterwegs – 5 Minuten!');
        break;
      case 'cashPack':
        g.grant('cash', this.cashPackAmount);
        break;
      case 'candyPack':
        g.grant('candy', 10);
        break;
      case 'toiletpaperPack':
        g.grant('toiletpaper', 5);
        break;
    }
    g.sfx.play('powerup');
    g.hud.bump('gems');
    return true;
  }

  get cashPackAmount() {
    const lvl = this.g.level;
    return Math.round(400 * lvl * lvl * RUNS[this.g.save.run - 1].income);
  }

  // ------------------------------------------------------------ Level-Up
  queueLevelUp(level: number) {
    if (!this.levelQueue.includes(level)) this.levelQueue.push(level);
    if (!this.modalOpen) this.nextLevelUp();
  }

  nextLevelUp() {
    const lvl = this.levelQueue.shift();
    if (lvl === undefined) return;
    this.showLevelUp(lvl);
  }

  private showLevelUp(level: number) {
    const g = this.g;
    const def = LEVELS.find((l) => l.level === level)!;
    const run = RUNS[g.save.run - 1];
    const cash = Math.round(def.cash * run.rewardCash);
    const tokens = Math.round(def.tokens * run.rewardTokens);
    const feats = LEVEL_FEATURES[level] ?? [];
    const res = LEVEL_RES_BONUS[level] ?? { candy: 0, toiletpaper: 0 };
    const { el, close } = this.modal(
      `
      <div class="big-star">${STAR_BADGE}<div class="lvl-num">${level}</div></div>
      <div class="ribbon stroke">${T.levelUp}</div>
      ${feats.length ? `<h3>${T.nowAvailable}</h3><div class="unlock-list">${feats.map((f) => `<div class="unlock">${svg(f.icon)}${f.text}</div>`).join('')}</div>` : ''}
      <h3>${T.reward}</h3>
      <div class="reward-row">
        <div class="reward stroke">${svg('cash')}${fmt(cash)}</div>
        <div class="reward stroke">${svg('token')}${tokens}</div>
        ${res.candy ? `<div class="reward stroke">${svg('candy')}${res.candy}</div>` : ''}
        ${res.toiletpaper ? `<div class="reward stroke">${svg('toiletpaper')}${res.toiletpaper}</div>` : ''}
      </div>
      <div style="margin-top:12px">
        <button class="btn" data-b="1">${T.collect}</button>
        <button class="btn gem" data-b="2" ${g.save.gems < GEM_PRICES.levelDouble ? 'disabled' : ''}>×2 · ${GEM_PRICES.levelDouble} ${svg('gem')}</button>
      </div>`,
      { closable: false },
    );
    this.confetti();
    g.sfx.play('levelup');
    this.on(el, '[data-b]', (b) => {
      const dbl = b.dataset.b === '2';
      if (dbl) {
        if (g.save.gems < GEM_PRICES.levelDouble) return;
        g.save.gems -= GEM_PRICES.levelDouble;
      }
      g.claimLevel(level, cash * (dbl ? 2 : 1), tokens * (dbl ? 2 : 1), res.candy * (dbl ? 2 : 1), res.toiletpaper * (dbl ? 2 : 1));
      close();
    });
  }

  // ------------------------------------------------------------ Zimmer-Design
  showDesign(_room: RoomRt, tier: number, done: (design: number) => void) {
    const g = this.g;
    const inc = ROOM_INCOME[tier];
    const stars = tier === 2 ? STARS.roomTier2 : STARS.roomTier3;
    const gemPrice = tier === 2 ? GEM_PRICES.deluxeTier2 : GEM_PRICES.deluxeTier3;
    const card = (d: number) => {
      const tc = tierColors(tier, d);
      const pay = d === 2 ? inc.payRW : inc.pay;
      const sw = `<div class="sw" style="background:${hex(tc.floor)}">
          <i style="left:0;top:0;right:0;height:22px;background:${hex(tc.wall)}"></i>
          <i style="left:10px;top:26px;width:44px;height:28px;border-radius:6px;background:${hex(tc.bedFrame)}"></i>
          <i style="left:16px;top:30px;width:34px;height:20px;border-radius:5px;background:${hex(tc.blanket)}"></i>
          <i style="right:10px;top:34px;width:26px;height:18px;border-radius:9px;background:${hex(tc.rug)}"></i>
        </div>`;
      const btn =
        d === 2
          ? `<button class="btn gem" data-d="2" ${g.save.gems < gemPrice ? 'disabled' : ''}>${gemPrice} ${svg('gem')}</button>`
          : `<button class="btn" data-d="${d}">${T.choose}</button>`;
      return `<div class="design ${d === 2 ? 'deluxe' : ''}">${sw}<div class="dn">${T.designNames[d]}</div><div class="dd">${T.designHint[d]}</div>
        <div class="stat">${svg('star')}+${stars} ${svg('cash')}${Math.round(pay * g.incomeMult)}</div>${btn}</div>`;
    };
    const { el, close } = this.modal(
      `<h2 class="stroke">${T.upgradeRoom}</h2><div class="ribbon stroke" style="font-size:22px">STUFE ${tier}</div>
       <div class="designs">${card(0)}${card(1)}${card(2)}</div>`,
      { closable: false },
    );
    this.on(el, '[data-d]', (b) => {
      const d = Number(b.dataset.d);
      if (d === 2) {
        if (g.save.gems < gemPrice) return;
        g.save.gems -= gemPrice;
      }
      close();
      done(d);
    });
  }

  // ------------------------------------------------------------ Offline-Ertrag
  showOffline(amount: number, seconds: number) {
    const g = this.g;
    const mins = seconds >= 3600 ? `${Math.floor(seconds / 3600)} Std ${Math.floor((seconds % 3600) / 60)} Min` : `${Math.max(1, Math.floor(seconds / 60))} Min`;
    const { el, close } = this.modal(
      `<h2 class="stroke">${T.welcomeBack}</h2><p>${T.offlineText(mins)}</p>
      <div class="reward-row"><div class="reward stroke">${svg('cash')}${fmt(amount)}</div></div>
      <div style="margin-top:10px"><button class="btn" data-b="1">${T.collect}</button>
      <button class="btn gem" data-b="2" ${g.save.gems < GEM_PRICES.offlineDouble ? 'disabled' : ''}>×2 · ${GEM_PRICES.offlineDouble} ${svg('gem')}</button></div>`,
      { closable: false },
    );
    this.on(el, '[data-b]', (b) => {
      const dbl = b.dataset.b === '2';
      if (dbl) {
        if (g.save.gems < GEM_PRICES.offlineDouble) return;
        g.save.gems -= GEM_PRICES.offlineDouble;
      }
      // Offline-Geld liegt physisch an der Rezeption (Regel 1: Geld muss abgeholt werden)
      g.money.add(g.receptionPile, amount * (dbl ? 2 : 1), false);
      g.hud.toast(`${svg('cash')} Das Geld liegt an der Rezeption!`);
      close();
    });
  }

  // ------------------------------------------------------------ Einstellungen
  showSettings() {
    const g = this.g;
    const s = g.save.settings;
    const row = (k: keyof typeof s, label: string) => `<div class="toggle-row"><span>${label}</span><button class="switch ${s[k] ? 'on' : ''}" data-t="${k}" aria-label="${label}"></button></div>`;
    const { el } = this.modal(
      `<h2 class="stroke">${T.settings}</h2>
      ${row('sound', T.sound)}${row('vibration', T.vibration)}${row('quality', T.quality)}${row('fps', T.showFps)}
      <p style="opacity:.85;font-size:13px;margin-top:14px">${T.about}</p>
      <p style="opacity:.7;font-size:12px">${GAME_TITLE} · ${T.run} ${g.save.run}/3</p>
      <button class="btn red small" data-reset="1">${T.reset}</button>`,
    );
    this.on(el, '[data-t]', (b) => {
      const k = b.dataset.t as keyof typeof s;
      s[k] = !s[k];
      b.classList.toggle('on', s[k]);
      g.applySettings();
    });
    this.on(el, '[data-reset]', () => {
      this.confirm(T.resetConfirm, () => g.resetAll());
    });
  }

  confirm(text: string, yes: () => void) {
    const { el, close } = this.modal(`<p style="font-size:17px;font-weight:700;margin:10px 0 16px">${text}</p><button class="btn red" data-y="1">Ja</button><button class="btn" data-n="1">Nein</button>`);
    this.on(el, '[data-y]', () => {
      close();
      yes();
    });
    this.on(el, '[data-n]', () => close());
  }

  // ------------------------------------------------------------ Shop
  showShop() {
    const g = this.g;
    const giftLeft = (g.save.giftAt - Date.now()) / 1000;
    const item = (kind: string, icon: string, title: string, sub: string, price: number) =>
      `<div class="card"><div class="c-icon">${svg(icon)}</div><div class="c-main"><div class="c-title">${title}</div><div class="c-sub">${sub}</div></div>
       <button class="btn gem small" data-buy="${kind}" ${g.save.gems < price ? 'disabled' : ''}>${price} ${svg('gem')}</button></div>`;
    const { el, close } = this.modal(
      `<h2 class="stroke">${T.shop}</h2>
       <div class="card"><div class="c-icon">${svg('gift')}</div><div class="c-main"><div class="c-title">${T.shopItems.gift}</div><div class="c-sub">${giftLeft <= 0 ? 'Jetzt abholen!' : 'Wieder in ' + fmtTime(giftLeft)}</div></div>
       <button class="btn small" data-gift="1" ${giftLeft > 0 ? 'disabled' : ''}>${T.claim}</button></div>
       ${item('scooter', 'scooter', T.shopItems.scooter, 'Schneller laufen', GEM_PRICES.scooter)}
       ${item('helper', 'helper', T.shopItems.helper, 'Putzt in allen Zonen', GEM_PRICES.helper)}
       ${item('cashPack', 'cash', T.shopItems.cashPack, `+${fmt(this.cashPackAmount)} Bargeld`, GEM_PRICES.cashPack)}
       ${item('candyPack', 'candy', T.shopItems.candyPack, 'Für Personal-Upgrades', GEM_PRICES.candyPack)}
       ${item('toiletpaperPack', 'toiletpaper', T.shopItems.toiletpaperPack, 'Für neue Bereiche', GEM_PRICES.toiletpaperPack)}
       <p style="font-size:12px;opacity:.8">Gems gibt es für Aufträge, Erfolge und Sondergäste – ganz ohne Echtgeld und Werbung.</p>`,
    );
    this.on(el, '[data-buy]', (b) => {
      if (this.buyGemItem(b.dataset.buy as 'scooter')) {
        close();
      }
    });
    this.on(el, '[data-gift]', () => {
      g.claimGift();
      close();
    });
  }

  // ------------------------------------------------------------ Aufträge
  showQuests() {
    const g = this.g;
    const render = () => {
      const step = g.quests.tutorialStep;
      if (step) {
        return `<div class="card"><div class="c-icon">${svg('quests')}</div><div class="c-main"><div class="c-title">Einführung ${g.save.tutorial + 1}/9</div><div class="c-sub">${step.text}</div></div></div>
          <p style="font-size:13px">Danach warten hier Aufträge mit Tokens und Gems.</p>`;
      }
      return g.save.quests
        .filter((q) => !q.claimed)
        .map((q) => {
          const done = q.progress >= q.target;
          const pct = Math.min(100, (q.progress / q.target) * 100);
          return `<div class="card"><div class="c-icon">${svg(q.reward.type === 'gems' ? 'gem' : q.reward.type === 'tokens' ? 'token' : q.reward.type)}</div>
            <div class="c-main"><div class="c-title">${questText(q)}</div>
            <div class="prog"><i style="width:${pct}%"></i><span>${fmt(q.progress)}/${fmt(q.target)}</span></div></div>
            <button class="btn small" data-q="${q.id}" ${done ? '' : 'disabled'}>+${q.reward.amount}</button></div>`;
        })
        .join('');
    };
    const { el } = this.modal(`<h2 class="stroke">${T.quests}</h2><div data-list="1">${render()}</div>`);
    const bind = () =>
      this.on(el, '[data-q]', (b) => {
        g.quests.claim(Number(b.dataset.q));
        (el.querySelector('[data-list]') as HTMLElement).innerHTML = render();
        bind();
      });
    bind();
  }

  // ------------------------------------------------------------ Seiten
  showPage(tab: number) {
    this.page?.remove();
    this.page = null;
    if (tab === 2) {
      this.g.input.enabled = !this.modalOpen;
      return;
    }
    const p = document.createElement('div');
    p.className = 'page';
    this.root.appendChild(p);
    this.page = p;
    this.g.input.enabled = false;
    this.renderPage(tab);
  }

  private renderPage(tab: number) {
    const p = this.page;
    if (!p) return;
    const g = this.g;
    const titles = [T.ledger, T.map, '', T.character, T.achievements];
    let body = '';
    if (tab === 0) body = this.ledgerHtml();
    else if (tab === 1) body = this.mapHtml();
    else if (tab === 3) body = this.characterHtml();
    else if (tab === 4) body = this.achievementsHtml();
    const scroll = p.querySelector('.page-body')?.scrollTop ?? 0;
    p.innerHTML = `<div class="page-head stroke">${titles[tab]}<button class="close-x" data-close="1">✕</button></div><div class="page-body">${body}</div>`;
    const pb = p.querySelector('.page-body') as HTMLElement;
    pb.scrollTop = scroll;
    if (tab === 1 && scroll === 0) pb.scrollTop = pb.scrollHeight;
    this.on(p, '[data-close]', () => g.hud.setTab(2));
    this.on(p, '[data-upg]', () => {
      g.buyPlayerUpgrade();
      this.renderPage(tab);
    });
    this.on(p, '[data-bp]', () => {
      g.buyBackpack();
      this.renderPage(tab);
    });
    this.on(p, '[data-ach]', (b) => {
      g.quests.claimAchievement(b.dataset.ach!);
      this.renderPage(tab);
    });
    this.on(p, '[data-prestige]', () => {
      this.confirm(T.prestigeText + '<br><br>Jetzt neu eröffnen?', () => g.prestige());
    });
  }

  refreshPage() {
    if (this.page && this.g.hud.activeTab !== 2) {
      this.pageTimer++;
      if (this.pageTimer % 60 === 0 && this.g.hud.activeTab === 0) this.renderPage(0);
    }
  }

  private ledgerHtml(): string {
    const g = this.g;
    const s = g.save;
    const tiers = [0, 0, 0, 0];
    for (const r of g.rooms) tiers[r.tier]++;
    const built = g.rooms.filter((r) => r.tier > 0).length;
    const wcs = g.wcs.filter((w) => w.built).length;
    const staff = g.staff.cleaners.length + g.staff.receptionists.length + (g.staff.supplier ? 1 : 0) + (g.staff.parker ? 1 : 0);
    const zones = [1, 2, 3, 4, 5, 6, 7]
      .map((z) => {
        const rooms = g.rooms.filter((r) => r.zone === z);
        const unlocked = g.zoneUnlocked[z];
        const stars = rooms.reduce((a, r) => a + (r.tier >= 1 ? 2 : 0) + (r.tier >= 2 ? 3 : 0) + (r.tier >= 3 ? 5 : 0), 0) + (g.wcByZone.get(z)?.built ? 5 : 0);
        const cl = g.staff.cleaners.find((c) => c.zone === z);
        return `<div class="card"><div class="c-icon">${svg(unlocked ? 'bed' : 'lock')}</div><div class="c-main"><div class="c-title">Zone ${z}</div>
        <div class="c-sub">${unlocked ? `${rooms.filter((r) => r.tier > 0).length}/3 Zimmer · Stufen ${rooms.map((r) => r.tier).join('/')} · ${g.wcByZone.get(z)?.built ? 'WC ✓' : 'kein WC'} · ${cl ? 'Reinigung Stufe ' + cl.tier : 'keine Reinigung'}` : 'Gesperrt'}</div></div>
        <div class="stroke" style="font-family:var(--display);font-size:18px;color:#e68600">${stars}★</div></div>`;
      })
      .join('');
    const prestige =
      s.prestigeReady && s.run < 3
        ? `<div class="card"><div class="c-icon">${svg('hotel')}</div><div class="c-main"><div class="c-title">${T.prestige} (${T.run} ${s.run + 1})</div><div class="c-sub">${T.prestigeText}</div></div><button class="btn orange small" data-prestige="1">Los</button></div>`
        : '';
    return `
      <div class="stat-grid">
        <div class="stat-box"><b>${fmt(g.incomePerMinute)}</b><small>Bargeld / Minute (Ø)</small></div>
        <div class="stat-box"><b>${fmt(s.stats.checkins)}</b><small>Gäste eingecheckt</small></div>
        <div class="stat-box"><b>${built}/21</b><small>Zimmer (${tiers[1]}× I, ${tiers[2]}× II, ${tiers[3]}× III)</small></div>
        <div class="stat-box"><b>${wcs}/7</b><small>Toilettenblöcke</small></div>
        <div class="stat-box"><b>${staff}</b><small>Personal</small></div>
        <div class="stat-box"><b>${s.stars}/240</b><small>Sterne · ${T.run} ${s.run}</small></div>
      </div>
      ${prestige}
      <div class="section-title">Bereiche</div>
      ${zones}
      <div class="section-title">Hinweise</div>
      <div class="card"><div class="c-icon">${svg('cash')}</div><div class="c-main"><div class="c-sub">Personal sammelt nie Geld ein – Bargeld bleibt liegen, bis du es abholst. Es verfällt nicht.</div></div></div>
      <div class="card"><div class="c-icon">${svg('bed')}</div><div class="c-main"><div class="c-sub">Gäste warten geduldig. Niemand reist ab – du verpasst nur Einnahmen.</div></div></div>`;
  }

  private mapHtml(): string {
    const n = HOTEL_NAMES.length;
    const W = 400;
    const stepY = 150;
    const H = n * stepY + 120;
    const pts = HOTEL_NAMES.map((_, i) => {
      const y = H - 90 - i * stepY;
      const x = W / 2 + Math.sin(i * 1.3) * 110;
      return { x, y };
    });
    let path = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < n; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      path += ` C${a.x} ${a.y - 70} ${b.x} ${b.y + 70} ${b.x} ${b.y}`;
    }
    const isl = pts
      .map((p, i) => {
        const col = ['#6fd35a', '#f2d06b', '#8fd3ff', '#ffb35a', '#7ee08a'][i % 5];
        return `<ellipse cx="${p.x}" cy="${p.y + 16}" rx="84" ry="44" fill="#2e8fd6" opacity=".35"/><ellipse cx="${p.x}" cy="${p.y + 6}" rx="78" ry="40" fill="#f2d99b"/><ellipse cx="${p.x}" cy="${p.y}" rx="68" ry="34" fill="${col}"/>`;
      })
      .join('');
    const nodes = pts
      .map((p, i) => {
        const cur = i === 0;
        const left = (p.x / W) * 100;
        const top = (p.y / H) * 100;
        return `<div class="map-node" style="left:${left}%;top:${top}%">${svg(cur ? 'hotel' : 'lock', '')}<div class="mn-name stroke">${HOTEL_NAMES[i]}${cur ? '' : `<br><small style="opacity:.8">${T.comingSoon}</small>`}</div></div>`;
      })
      .join('');
    const here = `<div class="map-here" style="left:${(pts[0].x / W) * 100}%;top:${((pts[0].y - 46) / H) * 100}%">${T.youAreHere}</div>`;
    return `<div class="map-wrap"><svg class="map" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#39a9ff"/>
      ${Array.from({ length: 40 }, (_, i) => `<path d="M${(i * 97) % W} ${(i * 211) % H}q10 -6 20 0" stroke="#8fd3ff" stroke-width="3" fill="none" opacity=".6"/>`).join('')}
      ${isl}<path d="${path}" stroke="#ffd23a" stroke-width="8" stroke-dasharray="4 14" stroke-linecap="round" fill="none"/></svg>${nodes}${here}</div>`;
  }

  private characterHtml(): string {
    const g = this.g;
    const s = g.save;
    const up = PLAYER_UPGRADES.map((u, i) => {
      const owned = i < s.playerUpg;
      const next = i === s.playerUpg;
      return `<div class="card ${owned ? 'done' : ''}"><div class="c-icon">${svg(u.kind === 'speed' ? 'speed' : u.kind === 'carry' ? 'carry' : 'cash')}</div>
        <div class="c-main"><div class="c-title">${T.upgradeKinds[u.kind]}</div><div class="c-sub">${u.kind === 'magnet' ? 'Geld aus größerer Entfernung einsammeln' : u.kind === 'carry' ? 'Mehr Klopapier & Gegenstände tragen' : 'Schneller durchs Hotel'}</div></div>
        ${owned ? `<span class="stroke" style="font-family:var(--display);color:#3bd65a">✓</span>` : `<button class="btn small" data-upg="1" ${next && s.tokens >= u.cost ? '' : 'disabled'}>${u.cost} ${svg('token')}</button>`}</div>`;
    }).join('');
    const bpNext = s.backpack < BACKPACK_UPGRADES.length ? BACKPACK_UPGRADES[s.backpack] : null;
    return `<div class="stat-grid">
        <div class="stat-box"><b>${fmt(s.tokens)}</b><small>Tokens</small></div>
        <div class="stat-box"><b>${g.player.capacity}</b><small>Tragkraft</small></div>
        <div class="stat-box"><b>${((g.player.speed / PLAYER_BASE.speed) * 100).toFixed(0)} %</b><small>Lauftempo</small></div>
        <div class="stat-box"><b>${s.backpack}/${BACKPACK_UPGRADES.length}</b><small>${T.backpack}</small></div>
      </div>
      <div class="section-title">Verbesserungen</div>${up}
      <div class="section-title">${T.backpack}</div>
      <div class="card"><div class="c-icon">${svg('carry')}</div><div class="c-main"><div class="c-title">${T.backpack} Stufe ${s.backpack + (bpNext ? 1 : 0)}</div><div class="c-sub">${T.backpackText}</div></div>
      ${bpNext ? `<button class="btn small" data-bp="1" ${s.tokens >= bpNext ? '' : 'disabled'}>${bpNext} ${svg('token')}</button>` : `<span class="stroke" style="font-family:var(--display);color:#3bd65a">MAX</span>`}</div>
      <p style="font-size:13px;text-align:center;opacity:.85">Tokens gibt es bei jedem Level-Up und für Aufträge. Figur-Upgrades gelten hotelübergreifend.</p>`;
  }

  private achievementsHtml(): string {
    const g = this.g;
    return ACHIEVEMENTS.map((a) => {
      const done = g.save.achievements[a.id] ?? 0;
      const max = done >= a.tiers.length;
      const target = a.tiers[Math.min(done, a.tiers.length - 1)];
      const v = a.value(g);
      const can = g.quests.achievementClaimable(a);
      const pct = max ? 100 : Math.min(100, (v / target) * 100);
      return `<div class="card ${max ? 'done' : ''}"><div class="c-icon">${svg('trophy')}</div><div class="c-main"><div class="c-title">${a.label} ${'★'.repeat(done)}</div>
        <div class="prog"><i style="width:${pct}%"></i><span>${fmt(Math.min(v, target))}/${fmt(target)}</span></div></div>
        ${max ? `<span class="stroke" style="font-family:var(--display);color:#3bd65a">MAX</span>` : `<button class="btn gem small" data-ach="${a.id}" ${can ? '' : 'disabled'}>+${a.gems[done]} ${svg('gem')}</button>`}</div>`;
    }).join('');
  }

  // ------------------------------------------------------------ Abschluss
  showHotelComplete() {
    const g = this.g;
    this.confetti();
    g.sfx.play('levelup');
    const { el, close } = this.modal(
      `<div class="big-star">${STAR_BADGE}<div class="lvl-num">★</div></div>
      <div class="ribbon stroke">${T.hotelComplete}</div>
      <p>Der Aufzug fährt, die Lounge ist eröffnet – ${HOTEL_NAMES[0]} ist fertig ausgebaut!</p>
      <p>${g.save.run < 3 ? 'Im Hotelbuch kannst du das Hotel für einen neuen Durchlauf mit höheren Umsätzen neu eröffnen.' : 'Du hast alle drei Durchläufe gemeistert. Bravo!'}</p>
      <button class="btn" data-ok="1">Weiter</button>`,
    );
    this.on(el, '[data-ok]', () => close());
  }
}
