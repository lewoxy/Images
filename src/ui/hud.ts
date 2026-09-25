import { portraitSvg, svg } from './icons';
import { HOTEL_SHORT, T, fmt, fmtTime } from '../config/strings';
import { MAX_LEVEL, nextThreshold, GEM_PRICES } from '../config/balance';
import type { Game } from '../game/game';

/** Heads-up-Display gemäß §14 (eigene Gestaltung). */

export const STAR_BADGE = `<svg viewBox="0 0 64 64"><path d="M32 3l8.5 17.3 19 2.8-13.8 13.4 3.3 19-17-9-17 9 3.3-19L4.5 23.1l19-2.8z" fill="#ffc62b" stroke="#2b1457" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 13l5.2 10.6 11.7 1.7-8.5 8.2 2 11.6L32 39.6l-10.4 5.5 2-11.6-8.5-8.2 11.7-1.7z" fill="#ffdf6e"/></svg>`;

type CurKey = 'candy' | 'toiletpaper' | 'tokens' | 'cash' | 'gems';

export class Hud {
  root: HTMLElement;
  private els: Record<string, HTMLElement> = {};
  private last: Record<string, string | number> = {};
  private toasts: HTMLElement;
  private banner: HTMLElement;
  private hintEl: HTMLElement | null = null;
  private fpsEl: HTMLElement;
  private frames = 0;
  private fpsT = 0;
  onTab: (i: number) => void = () => {};
  activeTab = 2;

  constructor(
    private g: Game,
    ui: HTMLElement,
  ) {
    this.root = ui;
    ui.insertAdjacentHTML(
      'beforeend',
      `
      <div class="hud-top">
        <div class="lvl" data-k="lvl">${STAR_BADGE}<div class="lvl-num" data-k="lvlNum">1</div></div>
        <div class="lvl-info">
          <div class="lvl-name stroke" data-k="hotel">${HOTEL_SHORT}</div>
          <div class="lvl-bar"><div class="lvl-fill" data-k="fill"></div><div class="lvl-text stroke" data-k="lvlText">0/30</div></div>
        </div>
        <div class="cur-list">
          ${this.cur('candy', 'candy')}
          ${this.cur('toiletpaper', 'toiletpaper')}
          ${this.cur('tokens', 'token')}
          ${this.cur('cash', 'cash', true)}
          ${this.cur('gems', 'gem', true)}
        </div>
      </div>
      <div class="side left">
        <button class="sq-btn" data-act="settings" aria-label="Menü">${svg('menu')}</button>
        <div class="offer" data-act="gift" data-k="gift">${svg('gift')}<span class="offer-label stroke" data-k="giftT">--:--</span></div>
        <div class="offer" data-act="scooter">${svg('scooter')}<span class="offer-label stroke">${GEM_PRICES.scooter}${svg('gem')}</span></div>
        <div class="offer" data-act="helper">${svg('helper')}<span class="offer-label stroke">${GEM_PRICES.helper}${svg('gem')}</span></div>
        <div class="offer" data-act="shop">${svg('cash')}<span class="offer-label stroke">Shop</span></div>
      </div>
      <div class="side right" data-k="right">
        <div class="finder" data-k="finder">
          <span class="f-count stroke" data-k="fCount">0/0</span>
          <button class="f-btn" data-act="finder" aria-label="Nächste Aufgabe zeigen">${svg('search')}</button>
        </div>
        <div class="timer-card" data-k="special" data-act="special" style="display:none"><div class="tc-face" data-k="specialFace">${svg('star')}</div><div class="tc-time" data-k="specialT">--</div></div>
        <div class="timer-card vip" data-k="vip" style="display:none"><div class="tc-face">${svg('crown')}</div><div class="tc-time" data-k="vipT">--</div></div>
        <div class="timer-card helper" data-k="helper" style="display:none"><div class="tc-face">${svg('helper')}</div><div class="tc-time" data-k="helperT">--</div></div>
        <div class="timer-card boost" data-k="boost" style="display:none"><div class="tc-face">${svg('scooter')}</div><div class="tc-time" data-k="boostT">--</div></div>
      </div>
      <div class="quest-btn"><button class="sq-btn" data-act="quests" aria-label="Aufträge">${svg('quests')}<span class="badge" data-k="qBadge" style="display:none">0</span></button></div>
      <div class="task-banner hidden" data-k="banner"></div>
      <div class="toasts" data-k="toasts"></div>
      <nav class="tabbar">
        ${T.tabs
          .map(
            (name, i) =>
              `<button class="tab${i === 2 ? ' active' : ''}" data-tab="${i}">${svg(['book', 'map', 'hotel', 'character', 'trophy'][i])}<span class="stroke">${name}</span>${i === 4 ? '<span class="badge" data-k="aBadge" style="display:none">0</span>' : ''}${i === 3 ? '<span class="badge" data-k="cBadge" style="display:none">!</span>' : ''}</button>`,
          )
          .join('')}
      </nav>
      <div class="fps" data-k="fps" style="display:none"></div>
    `,
    );
    ui.querySelectorAll<HTMLElement>('[data-k]').forEach((e) => (this.els[e.dataset.k!] = e));
    this.toasts = this.els.toasts;
    this.banner = this.els.banner;
    this.fpsEl = this.els.fps;
    ui.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-tab]');
      if (!t || !ui.contains(t)) return;
      if (t.dataset.tab) {
        this.setTab(Number(t.dataset.tab));
        this.g.sfx.play('click');
        return;
      }
      const act = t.dataset.act!;
      this.g.sfx.play('click');
      this.g.ui.action(act);
    });
  }

  private cur(key: CurKey, icon: string, plus = false) {
    return `<div class="cur ${icon}" data-act="cur-${key}" data-k="cur-${key}">${svg(icon)}<span class="cur-val stroke" data-k="v-${key}">0</span>${plus ? '<span class="cur-plus stroke">+</span>' : ''}</div>`;
  }

  setTab(i: number) {
    this.activeTab = i;
    this.root.querySelectorAll('.tab').forEach((el, k) => el.classList.toggle('active', k === i));
    this.onTab(i);
  }

  bump(key: CurKey) {
    const el = this.els['cur-' + key];
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  toast(html: string) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.innerHTML = html;
    this.toasts.appendChild(d);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild!.remove();
    setTimeout(() => d.remove(), 2700);
  }

  showHint(text: string) {
    if (this.hintEl) return;
    this.hintEl = document.createElement('div');
    this.hintEl.className = 'hint';
    this.hintEl.textContent = text;
    this.root.appendChild(this.hintEl);
  }

  hideHint() {
    this.hintEl?.remove();
    this.hintEl = null;
  }

  private set(k: string, v: string | number, prop: 'text' | 'html' | 'width' | 'display' = 'text') {
    const ck = k + '|' + prop;
    if (this.last[ck] === v) return;
    this.last[ck] = v;
    const el = this.els[k];
    if (!el) return;
    if (prop === 'text') el.textContent = String(v);
    else if (prop === 'html') el.innerHTML = String(v);
    else if (prop === 'width') el.style.width = String(v);
    else el.style.display = String(v);
  }

  update(dt: number) {
    const g = this.g;
    const s = g.save;
    this.set('v-cash', fmt(s.cash + 1e-6));
    this.set('v-gems', fmt(s.gems));
    this.set('v-tokens', fmt(s.tokens));
    this.set('v-candy', fmt(s.candy));
    this.set('v-toiletpaper', fmt(s.toiletpaper));
    const lvl = g.level;
    this.set('lvlNum', lvl);
    const next = nextThreshold(lvl);
    if (lvl >= MAX_LEVEL || next === null) {
      this.set('lvlText', `${s.stars} · ${T.max}`);
      this.set('fill', '100%', 'width');
    } else {
      this.set('lvlText', `${s.stars}/${next}`);
      this.set('fill', `${Math.min(100, (s.stars / next) * 100).toFixed(1)}%`, 'width');
    }
    // Geschenk
    const giftLeft = (s.giftAt - Date.now()) / 1000;
    this.set('giftT', giftLeft <= 0 ? 'GRATIS!' : fmtTime(giftLeft));
    // Aufgabenfinder
    const n = g.finderList().length;
    this.set('fCount', n ? `${Math.min(g.finderIndex + 1, n)}/${n}` : '0/0');
    this.els.finder.classList.toggle('active', g.guideActive && !g.quests.tutorialStep);
    // Sondergast
    const sc = g.specials.cardInfo;
    this.set('special', sc ? '' : 'none', 'display');
    if (sc) {
      this.set('specialT', sc.time >= 0 ? fmtTime(sc.time) : sc.name.split(' ').pop()!);
      this.set('specialFace', portraitSvg(g.guests.makeSpecialLook(sc.idx)), 'html');
    }
    const vip = g.specials.vipGuest;
    this.set('vip', vip && vip.vipTime > 0 ? '' : 'none', 'display');
    if (vip) this.set('vipT', fmtTime(vip.vipTime));
    this.set('helper', s.boosts.helper > 0 ? '' : 'none', 'display');
    if (s.boosts.helper > 0) this.set('helperT', fmtTime(s.boosts.helper));
    this.set('boost', s.boosts.scooter > 0 ? '' : 'none', 'display');
    if (s.boosts.scooter > 0) this.set('boostT', fmtTime(s.boosts.scooter));
    // Badges
    const qc = g.quests.claimable;
    this.set('qBadge', qc > 0 ? '' : 'none', 'display');
    this.set('qBadge', qc);
    const ac = g.quests.achievementsClaimable;
    this.set('aBadge', ac > 0 ? '' : 'none', 'display');
    this.set('aBadge', ac);
    this.set('cBadge', g.canAffordPlayerUpgrade() ? '' : 'none', 'display');
    // Aufgabenbanner
    const step = g.quests.tutorialStep;
    if (step) {
      const prog = step.progress ? step.progress(g) : '';
      this.set('banner', `${svg('quests')}<span>${step.text}${prog ? ` <span class="tb-prog">${prog}</span>` : ''}</span>`, 'html');
      this.banner.classList.remove('hidden');
    } else {
      this.banner.classList.add('hidden');
    }
    // FPS
    if (s.settings.fps) {
      this.fpsEl.style.display = '';
      this.frames++;
      this.fpsT += dt;
      if (this.fpsT > 0.5) {
        this.fpsEl.textContent = `${Math.round(this.frames / this.fpsT)} FPS · ${g.guests.guests.length} Gäste`;
        this.frames = 0;
        this.fpsT = 0;
      }
    } else this.fpsEl.style.display = 'none';
  }
}
