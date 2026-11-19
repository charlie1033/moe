// =============================================================
//  手機／平板觸控操作（電腦版不會啟動）
//  左半邊：手指按下的地方就是搖桿；右下：5 個技能鈕（自動瞄準畫面裡的怪：首領＞精英＞一般，同級打最近；點怪可以鎖定，見 autoaim.js）
//  v2.19.7 右下配置：大圓鈕（主攻擊）＋左上一圈四顆技能（直徑 62，手機上至少 40 像素）；
//    位移鈕（空白鍵：翻滾／瞬移／躍擊／一閃，classmove.js）單獨放在技能弧的左下外側，畫該職業位移的圖示＋冷卻轉圈
//  右上「☰」：所有功能選單；靠近人物時出現「對話」鈕
//  點地上物品名稱＝撿起；背包、身上的裝備：點一下＝選取，左邊的比較面板有完整說明和按鈕（不另外跳浮動說明）
//  倉庫、商店、珠寶格：點一下看說明，再點一下才使用
// =============================================================
const Touch = {
  on: IS_TOUCH,
  held: new Map(),       // 正按著的技能鈕：pointerId → 技能欄
  joyId: null,           // 控制搖桿的手指
  tipEl: null,           // 目前顯示說明的格子（再點一次才執行）
  // 技能鈕位置（邏輯座標 960×540）：主攻擊在右下，其他四顆繞著它
  BTN: [[868, 388, 42], [777, 401, 31], [792, 337, 31], [846, 299, 31], [911, 307, 31]],
  DODGE: [712, 444, 30],   // 位移鈕：技能弧左下外側，跟其他鈕隔開，不會誤觸
  init() {
    if (!this.on) return;
    document.body.classList.add('touch');
    UI.questOpen = false; // 手機畫面小，任務框先收起來（點標題可以展開）
    const ui = document.createElement('div'); ui.id = 'touchui';
    ui.innerHTML = `<div id="tzone"></div><div id="tjoy"><div id="tknob"></div></div>`
      + this.BTN.map(([x, y, r], i) => `<div class="tbtn ${i ? '' : 'main'}" data-s="${i}" style="left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px"><img class="tico" alt=""><i class="tcd"></i></div>`).join('')
      + `<div class="tbtn dodge" id="tdodge" style="left:${this.DODGE[0] - this.DODGE[2]}px;top:${this.DODGE[1] - this.DODGE[2]}px;width:${this.DODGE[2] * 2}px;height:${this.DODGE[2] * 2}px"><img class="tico" alt=""><i class="tcd"></i></div>`
      + `<div class="tbtn talk" id="ttalk" style="right:62px;top:196px;height:60px">對話</div>`
      + `<div class="tbtn menu" id="tmenu" style="left:${VW - 66}px;top:6px;width:58px;height:58px">☰<b class="tbadge"></b></div>`;   // 58 邏輯像素＝手機上約 40
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
    $('#tdodge').addEventListener('pointerdown', e => { e.stopPropagation(); $('#tdodge').classList.add('on'); playerDodge(); });
    const dUp = () => $('#tdodge').classList.remove('on'); $('#tdodge').addEventListener('pointerup', dUp); $('#tdodge').addEventListener('pointercancel', dUp);
    $('#ttalk').addEventListener('pointerdown', e => { e.stopPropagation(); UI.interact(); });
    $('#tmenu').addEventListener('pointerdown', e => { e.stopPropagation(); this.toggleMenu(); });
    // 夢之門（地圖裝置）：手機上面板蓋住左半邊的搖桿區，走不開 → 標題加一顆 ✕
    const mh = document.querySelector('#mapdev .ph');
    if (mh) { const x = document.createElement('span'); x.className = 'x'; x.textContent = '✕'; x.onclick = () => UI.showMapDevice(false); mh.appendChild(x); const t = mh.querySelector('.thint'); if (t) t.textContent = '走開或按 ✕ 關閉'; }
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
    this.dodgeTick(pl);
    const ta = $('#ttalk'); ta.style.display = G.nearAct ? 'flex' : 'none'; if (G.nearAct && ta.textContent !== G.nearAct.label) ta.textContent = G.nearAct.label;
    // ☰ 放在小地圖的左邊，不要蓋到小地圖
    const w = G.world, mw = w && w.mini ? w.W * (w.kind === 'town' ? 3 : 2) : 0;
    $('#tmenu').style.left = (mw ? VW - mw - 19 - 122 : VW - 12 - 122) + 'px'; // 回城鈕（手機上 58 寬，ui.js placePortalBtn）的左邊
    // 功能選單上的紅點：任何一個功能有新東西就亮
    const any = [...document.querySelectorAll('#menubar .mbadge.red')].some(x => x.textContent);
    $('#tmenu .tbadge').style.display = any ? 'block' : 'none';
    if (this.menuOpen) this.renderMenu();
  },
  // 位移鈕：該職業位移技能的圖示＋冷卻轉圈（冷卻長度＝classmove.js 的 CLASS_MOVE）
  dodgeTick(pl) {
    const b = $('#tdodge'); if (!b) return;
    const M = classMove(), ico = b.querySelector('.tico'), cd = b.querySelector('.tcd');
    const u = moveIconURL(M.id); if (ico.src !== u) ico.src = u;
    b.style.setProperty('--sc', M.id === 'roll' ? '#3a6a3a' : M.id === 'blink' ? '#3a4a8a' : '#7a3a2a');
    const fr = pl.dodgeCd > 0 ? Math.min(1, pl.dodgeCd / M.cd) : 0;
    cd.style.background = fr ? `conic-gradient(from ${(1 - fr) * 360}deg, rgba(0,0,0,.68) 0 ${fr * 360}deg, transparent 0)` : 'none';
    cd.textContent = fr ? pl.dodgeCd.toFixed(1) : '';
    b.dataset.move = M.id;
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
// v2.19.7 位移鈕的圖示：瞬移、一閃用美術的技能圖（sk_blink、sk_iai）；翻滾、躍擊美術還沒做，先用程式畫（寶石底＋符號），
// 美術補了 sk_roll／sk_leap 就自動換成新圖
function moveIconURL(id) {
  if (id === 'blink') return skillIconURL('blink', 96);
  if (id === 'issen') return skillIconURL('iai', 96);
  return artURL(artCanvas('mv_' + id, 96, g => {
    if (artNew(g, 'sk_' + id)) return;
    const c = id === 'roll' ? ATTR_GEM.dex : ATTR_GEM.str;
    drawGemBody(g, gemPoints(50, 50, 46, 8, 0.32), gemPoints(50, 50, 33, 8, 0.32), c[0], c[1]);
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#fff6dc'; g.fillStyle = '#fff6dc'; g.lineWidth = 7;
    g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 4;
    const head = (x, y, a) => { g.beginPath(); g.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); g.lineTo(x + Math.cos(a + 2.4) * 11, y + Math.sin(a + 2.4) * 11); g.lineTo(x + Math.cos(a - 2.4) * 11, y + Math.sin(a - 2.4) * 11); g.closePath(); g.fill(); };
    if (id === 'roll') {   // 翻滾：一圈箭頭＋後面的速度線
      const a1 = Math.PI * 0.75, a2 = Math.PI * 2.3;
      g.beginPath(); g.arc(56, 50, 19, a1, a2); g.stroke();
      head(56 + Math.cos(a2) * 19, 50 + Math.sin(a2) * 19, a2 + Math.PI / 2);
      g.lineWidth = 5; for (const [y, l] of [[38, 14], [50, 18], [62, 14]]) { g.beginPath(); g.moveTo(30 - l, y); g.lineTo(30, y); g.stroke(); }
    } else {   // 躍擊：跳起的弧線＋落地的衝擊
      g.beginPath(); g.moveTo(20, 70); g.quadraticCurveTo(42, 8, 70, 58); g.stroke();
      head(70, 58, Math.atan2(58 - 33, 70 - 56));
      g.lineWidth = 5; for (const a of [-2.6, -1.9, -1.2, -0.5]) { g.beginPath(); g.moveTo(72 + Math.cos(a) * 10, 76 + Math.sin(a) * 10); g.lineTo(72 + Math.cos(a) * 20, 76 + Math.sin(a) * 20); g.stroke(); }
      g.beginPath(); g.moveTo(52, 80); g.lineTo(92, 80); g.stroke();
    }
    g.restore();
  }));
}
(() => {
  if (!IS_TOUCH) return;
  const st = document.createElement('style');
  // 手機的觸控目標至少 40×40（面板有 zoom 縮小，所以除以 zoom 換回實際大小）
  const z = 'calc(40px / (var(--pz, 1) * var(--uiScale, 1)))';
  st.textContent = `.tbtn.dodge { border-color:rgba(200,190,255,.85); }
  .tbtn.dodge .tico { width:80%; height:80%; }
  .tbtn.talk { font-size:19px; }
  .tbtn.menu { font-size:30px; }
  body.touch #portalbtn { width:58px; height:58px; }
  body.touch .hspot[data-s^="fl"] { margin-left:-3px; width:36px !important; margin-top:-22px; height:74px !important; }   /* 藥劑：點的範圍往上加高（寬度被隔壁擋住） */
  body.touch #fullbtn { width:40px; height:40px; line-height:40px; z-index:5; }   /* 面板打開時躲到面板後面，不蓋住背包格子 */
  body.touch .panel .ph .x { min-width:${z}; min-height:${z}; display:inline-flex; align-items:center; justify-content:center; padding:0; box-sizing:border-box; }
  body.touch .panel .ph button, body.touch #cmp .cmpbtns button { min-height:${z}; min-width:${z}; }
  body.touch #tree .ph .x, body.touch #tree .ph button { min-width:40px; min-height:40px; }   /* 天賦樹沒有縮放 */
  body.touch #mapList button { min-height:${z}; min-width:calc(64px / (var(--pz, 1) * var(--uiScale, 1))); }   /* 夢之門的「進入」 */
  body.touch #gask button { min-height:40px; min-width:72px; }
  body.touch .tmbtn { min-height:${z}; box-sizing:border-box; }   /* ☰ 功能選單的大按鈕 */
  body.touch #questbox .qhead { position:relative; } body.touch #questbox .qhead::after { content:''; position:absolute; inset:-20px -4px; }   /* 任務框標題（展開／收起）：點得到的範圍加高 */
  body.touch .jtabs button { min-height:${z}; }   /* 日誌的分頁 */
  body.touch #menu button:not(.go):not(.del) { min-height:calc(40px / var(--pz, 1)); }   /* 選角畫面：回到開始畫面、備份（角色卡上的「繼續」不用放大：點整張卡就進遊戲；「刪除」小一點免得誤觸） */
  body.touch .jent .replay { position:relative; } body.touch .jent .replay::after { content:''; position:absolute; inset:-14px -10px; }
  body.touch .glock, body.touch .supall { position:relative; }   /* 技能頁：自動升級、顯示全部（列高固定，按鈕本身不能變高 → 用看不見的外框把點得到的範圍放大） */
  body.touch .glock::after, body.touch .supall::after { content:''; position:absolute; inset:-14px -8px; }`;
  document.head.appendChild(st);
})();
