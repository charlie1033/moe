// =============================================================
//  手機／平板觸控操作（電腦版不會啟動）
//  左半邊：手指按下的地方就是搖桿；右下：5 個技能鈕（自動瞄準畫面裡的怪：首領＞精英＞一般，同級打最近；點怪可以鎖定，見 autoaim.js）
//  右上「☰」：所有功能選單；靠近人物時出現「對話」鈕
//  點地上物品名稱＝撿起；背包裡的物品：點一下看說明，再點一下才使用
// =============================================================
const Touch = {
  on: IS_TOUCH,
  held: new Map(),       // 正按著的技能鈕：pointerId → 技能欄
  joyId: null,           // 控制搖桿的手指
  tipEl: null,           // 目前顯示說明的格子（再點一次才執行）
  // 技能鈕位置（邏輯座標 960×540）：主攻擊在右下，其他四顆繞著它
  BTN: [[872, 392, 36], [800, 426, 24], [797, 365, 24], [834, 321, 24], [889, 314, 24]],
  init() {
    if (!this.on) return;
    document.body.classList.add('touch');
    UI.questOpen = false; // 手機畫面小，任務框先收起來（點標題可以展開）
    const ui = document.createElement('div'); ui.id = 'touchui';
    ui.innerHTML = `<div id="tzone"></div><div id="tjoy"><div id="tknob"></div></div>`
      + this.BTN.map(([x, y, r], i) => `<div class="tbtn ${i ? '' : 'main'}" data-s="${i}" style="left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px"><img class="tico" alt=""><i class="tcd"></i></div>`).join('')
      + `<div class="tbtn talk" id="ttalk" style="right:62px;top:214px;height:48px">對話</div>`
      + `<div class="tbtn menu" id="tmenu" style="left:${VW - 52}px;top:8px;width:44px;height:44px">☰<b class="tbadge"></b></div>`;
    document.body.appendChild(ui);
    const panel = document.createElement('div'); panel.id = 'tmenupanel'; panel.className = 'panel';
    document.body.appendChild(panel);
    const rot = document.createElement('div'); rot.id = 'rotate'; rot.innerHTML = '<div>⟳</div>請把手機轉成橫向來玩';
    document.body.appendChild(rot);
    // 手指在控制鈕上時，不要讓瀏覽器捲動、縮放或模擬滑鼠
    ui.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    ui.addEventListener('contextmenu', e => e.preventDefault());
    const zone = $('#tzone');
    zone.addEventListener('pointerdown', e => this.zoneDown(e));
    window.addEventListener('pointermove', e => this.zoneMove(e));
    window.addEventListener('pointerup', e => this.zoneUp(e));
    window.addEventListener('pointercancel', e => this.zoneUp(e));
    ui.querySelectorAll('.tbtn[data-s]').forEach(b => {
      const s = +b.dataset.s;
      b.addEventListener('pointerdown', e => { e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch (_) {} this.held.set(e.pointerId, s); this.press(s, true); b.classList.add('on'); });
      const up = e => { if (!this.held.has(e.pointerId)) return; this.held.delete(e.pointerId); if (![...this.held.values()].includes(s)) { this.press(s, false); b.classList.remove('on'); } };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    });
    $('#ttalk').addEventListener('pointerdown', e => { e.stopPropagation(); UI.interact(); });
    $('#tmenu').addEventListener('pointerdown', e => { e.stopPropagation(); this.toggleMenu(); });
    // 背包、倉庫、商店、珠寶：第一下看說明，第二下才執行
    document.addEventListener('click', e => this.cellTap(e), true);
    // HUD 熱區（藥劑、技能欄）：手機上直接點就用，不跳說明
    document.querySelectorAll('.hspot').forEach(d => { d.onmouseenter = null; d.onmousemove = null; });
    window.addEventListener('resize', () => this.layout());
    this.layout();
  },
  layout() {
    if (!this.on) return;
    const r = CV.getBoundingClientRect(), s = r.width / VW;
    Object.assign($('#touchui').style, { left: r.left + 'px', top: r.top + 'px', transform: `scale(${s})` });
    // 面板縮放：畫面越小，面板縮越小（可以上下捲動）
    const pz = Math.min(1, innerHeight / 600, innerWidth / 1000);
    document.documentElement.style.setProperty('--pz', pz.toFixed(3));
  },
  press(s, down) {
    if (s === 0) input.l = down; else if (s === 1) input.r = down;
    else input.keys[['KeyQ', 'KeyE', 'KeyR'][s - 2]] = down;
  },
  toLogical(e) { const r = CV.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH }; },
  zoneDown(e) {
    if (G.state !== 'play' || !G.P) return;
    const p = this.toLogical(e);
    UI.hideTip(); this.tipEl = null;
    // 點到地上物品的名稱：撿起來
    const l = G.loot.find(l => l.rect && p.x >= l.rect.x - 4 && p.x <= l.rect.x + l.rect.w + 4 && p.y >= l.rect.y - 4 && p.y <= l.rect.y + l.rect.h + 4);
    if (l) { if (dist(l, G.pl) < 240) pickupLoot(l); else UI.msg('太遠了，走近一點再撿', '#d8c8a0'); return; }
    if (typeof AutoAim !== 'undefined' && AutoAim.tap(p.x, p.y, p.x > VW * 0.55) && p.x > VW * 0.55) return;   // v2.18.2 點一下怪物＝鎖定（右半邊再點同一隻＝解除；左半邊點到怪只鎖定、照樣當搖桿）
    if (p.x > VW * 0.55 || this.joyId != null) return;
    this.joyId = e.pointerId; this.joyO = p;
    const j = $('#tjoy'); j.style.display = 'block'; j.style.left = (p.x - 56) + 'px'; j.style.top = (p.y - 56) + 'px';
    $('#tknob').style.transform = 'translate(0px,0px)';
    input.joy = { x: 0, y: 0 };
  },
  zoneMove(e) {
    if (e.pointerId !== this.joyId) return;
    const p = this.toLogical(e), R = 50;
    let dx = p.x - this.joyO.x, dy = p.y - this.joyO.y;
    const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    $('#tknob').style.transform = `translate(${dx}px,${dy}px)`;
    input.joy = { x: dx / R, y: dy / R };
  },
  zoneUp(e) {
    if (e.pointerId !== this.joyId) return;
    this.joyId = null; input.joy = null; $('#tjoy').style.display = 'none';
  },
  // 每一格畫面呼叫一次：按著技能鈕時自動瞄準（autoaim.js 挑目標）；更新按鈕外觀
  frame: 0,
  tick() {
    if (!this.on || G.state !== 'play' || !G.P || !G.pl) return;
    const pl = G.pl;
    if (this.held.size) {
      const best = typeof AutoAim !== 'undefined' ? AutoAim.pick() : null;   // v2.18.2 只打畫面裡的；首領＞精英＞一般，同級打最近；點怪可以鎖定（autoaim.js）
      const j = input.joy && Math.hypot(input.joy.x, input.joy.y) > 0.2 ? input.joy : { x: pl.facing || 1, y: 0 };
      const tx = best ? best.x : pl.x + j.x * 140, ty = best ? best.y : pl.y + j.y * 140;
      input.mx = tx - G.cam.x; input.my = ty - G.cam.y;
    }
    if (++this.frame % 6) return;
    const P = G.P;
    document.querySelectorAll('#touchui .tbtn[data-s]').forEach(b => {
      const s = +b.dataset.s, sid = P.skills[s], ico = b.querySelector('.tico'), cd = b.querySelector('.tcd');
      if (!sid) { b.style.setProperty('--sc', '#2a2420'); ico.style.visibility = 'hidden'; cd.style.height = '0'; return; }
      const sk = SKILLS[sid], c = G.slotCalc[s], cdv = pl.cd[sid] || 0;
      b.style.setProperty('--sc', sk.color);
      b.classList.toggle('bad', !!(skillUsable(G.S, sid) || (!G.S.flags.bloodMagic && c && pl.mana < c.cost)));
      ico.style.visibility = 'visible'; const u = skillIconURL(sid, 96); if (ico.src !== u) ico.src = u;
      const fr = cdv > 0 ? Math.min(1, cdv / ((pl.cdMax && pl.cdMax[sid]) || sk.cd)) : 0; // 冷卻：轉圈＋秒數
      cd.style.background = fr ? `conic-gradient(from ${(1 - fr) * 360}deg, rgba(0,0,0,.68) 0 ${fr * 360}deg, transparent 0)` : 'none';
      cd.textContent = fr ? cdv.toFixed(1) : '';
    });
    const ta = $('#ttalk'); ta.style.display = G.nearAct ? 'flex' : 'none'; if (G.nearAct && ta.textContent !== G.nearAct.label) ta.textContent = G.nearAct.label;
    // ☰ 放在小地圖的左邊，不要蓋到小地圖
    const w = G.world, mw = w && w.mini ? w.W * (w.kind === 'town' ? 3 : 2) : 0;
    $('#tmenu').style.left = (mw ? VW - mw - 13 - 104 : VW - 104) + 'px'; // 回城鈕的左邊
    // 功能選單上的紅點：任何一個功能有新東西就亮
    const any = [...document.querySelectorAll('#menubar .mbadge.red')].some(x => x.textContent);
    $('#tmenu .tbadge').style.display = any ? 'block' : 'none';
    if (this.menuOpen) this.renderMenu();
  },
  // ☰ 功能選單：大按鈕，點了就開
  menuOpen: false,
  toggleMenu(force) {
    this.menuOpen = force != null ? force : !this.menuOpen;
    $('#tmenupanel').classList.toggle('show', this.menuOpen);
    if (this.menuOpen) { UI.hideTip(); this.renderMenu(true); }
  },
  renderMenu(force) {
    const badge = id => { const b = document.querySelector(`.mbtn[data-m="${id}"] .mbadge`); return b && b.textContent ? `<b class="tmbadge ${b.classList.contains('red') ? 'red' : ''}">${b.textContent}</b>` : ''; };
    const svg = id => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${UI.ICONS[id]}</svg>`;
    const fs = document.fullscreenElement ? '離開全螢幕' : '全螢幕';
    const h = `<div class="ph">功能選單<span class="x" id="tmclose">✕</span></div><div class="tmgrid">`
      + UI.MENU.filter(m => !(m.hide && m.hide(G.P))).map(m => `<div class="tmbtn" data-m="${m.id}"><span class="mico">${svg(m.id)}</span>${m.name}${badge(m.id)}</div>`).join('')
      + `<div class="tmbtn" data-m="fs"><span class="mico">⛶</span>${fs}</div><div class="tmbtn" data-m="pause"><span class="mico">⚙</span>設定・存檔</div></div>`;   // v2.18.2 手機沒有 Esc：從這裡打開暫停選單（設定、存檔、回選角）
    const p = $('#tmenupanel');
    if (!force && p.dataset.h === h) return;
    p.innerHTML = h; p.dataset.h = h;
    $('#tmclose').onclick = () => this.toggleMenu(false);
    p.querySelectorAll('.tmbtn').forEach(b => b.onclick = () => {
      const id = b.dataset.m;
      this.toggleMenu(false);
      if (id === 'portal') usePortalScroll();
      else if (id === 'fs') this.fullscreen();
      else if (id === 'pause') Pause.show();
      else UI.toggle(id, true);
    });
  },
  fullscreen() {
    const d = document.documentElement;
    if (document.fullscreenElement) return document.exitFullscreen && document.exitFullscreen();
    const req = d.requestFullscreen || d.webkitRequestFullscreen;
    if (!req) return UI.msg('這個瀏覽器不支援全螢幕（iPhone 可以用「加入主畫面」）', '#d8c8a0');
    Promise.resolve(req.call(d)).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
  },
  // 背包等格子：手機上第一下只看說明，同一格再點一下才執行
  cellTap(e) {
    if (!this.on) return;
    const el = e.target.closest('.fcell, .jcell, .shopitem, #stashGrid .cell'); // 背包格不用：點一下就是「選取」，比較面板有按鈕
    if (!el) { if (!e.target.closest('#tip')) { this.tipEl = null; } return; }
    if (el.classList.contains('shopitem') && e.target.closest('button')) return; // 購買鈕直接買
    if (UI.curSel || UI.salvMode) { this.tipEl = null; return; } // 正在用通貨或分解：直接執行
    if (this.tipEl !== el) {
      this.tipEl = el; e.stopPropagation(); e.preventDefault();
      el.dispatchEvent(new MouseEvent('mouseenter', { clientX: e.clientX, clientY: e.clientY }));
      return;
    }
    this.tipEl = null; UI.hideTip();
  },
};
