// =============================================================
//  v2.8 介面美術（Higgsfield 美術工作階段）：生命／魔力球、技能格、藥劑格、下方面板、功能選單圖示
//  ・圖在 js\artwork.js：ARTWORK.img 的 hud_*（外框、液體、面板），圖集裡的 ui_*（選單圖示）
//  ・只用「包裝」的方式接上遊戲：換掉 drawOrb、在 drawHUD 前後加畫，不改 render.js
//  ・說明頁關掉「新美術」就回到原本程式畫的樣子
//  ・載入順序：artscenes.js 之後、touch.js 之前
// =============================================================
const ArtUI = {
  IM: {},
  on() { return typeof ArtStyle !== 'undefined' && ArtStyle.on; },
  depth() { return typeof CFG === 'undefined' || CFG.depth3d !== false; },   // v2.12 立體光影（設定→介面可關）
  // v2.16 這張地圖用不用「圓滑牆」：有 AI 地板＋牆貼圖、不是營地
  smoothWalls(w) { const id = w && w.theme && w.theme.id; return !!(this.on() && w && w.kind !== 'town' && id && this.tex && this.tex(id + '_floor') && this.tex(id + '_wall')); },
  // 外框圖：量出中間的洞有多大（從中心往外找第一個不透明的點），再把洞挖乾淨
  prep(k, im) {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const o = { c, w: im.width, h: im.height };
    if (!/^hud_(orb|slot|flask)$/.test(k)) return o;
    const d = g.getImageData(0, 0, c.width, c.height).data, cx = c.width / 2, cy = c.height / 2;
    const hit = (dx, dy) => {
      for (let t = 0; t < Math.max(cx, cy); t++) {
        const x = Math.round(cx + dx * t), y = Math.round(cy + dy * t);
        if (x < 0 || y < 0 || x >= c.width || y >= c.height) return t;
        if (d[(y * c.width + x) * 4 + 3] > 140) return t;
      }
      return 0;
    };
    g.globalCompositeOperation = 'destination-out'; g.beginPath();
    if (k === 'hud_orb') {
      const rs = []; for (let a = 0; a < 16; a++) rs.push(hit(Math.cos(a * Math.PI / 8), Math.sin(a * Math.PI / 8)));
      rs.sort((a, b) => a - b); o.hole = rs[4];                       // 偏小的那一側（有裝飾伸進來的地方不算）
      if (o.hole < c.width * 0.22) o.hole = c.width * 0.34;           // 中間沒挖空的圖：用預設大小
      g.arc(cx, cy, o.hole, 0, Math.PI * 2);
    } else {
      o.hx = Math.min(hit(1, 0), hit(-1, 0)); o.hy = Math.min(hit(0, 1), hit(0, -1));
      if (o.hx < c.width * 0.2) o.hx = c.width * 0.36;
      if (o.hy < c.height * 0.2) o.hy = c.height * 0.4;
      g.rect(cx - o.hx, cy - o.hy, o.hx * 2, o.hy * 2);
    }
    g.fill();
    return o;
  },
  load() {
    if (typeof ARTWORK === 'undefined') return;
    for (const k in ARTWORK.img) if (k.startsWith('hud_')) {
      const im = new Image(); im.onload = () => { this.IM[k] = this.prep(k, im); }; im.src = ARTWORK.img[k];
    }
  },
  // 下方面板：左右兩端照原比例，中間那段照原比例一段一段接（不拉長，鉚釘才不會變橢圓）
  bar(g, x, y, w, h) {
    const b = this.IM.hud_bar; if (!b) return false;
    const k = h / b.h, cap = Math.round(b.w * 0.12), capW = cap * k;
    const m0 = cap, mw = b.w - cap * 2, segW = mw * k, x1 = x + w - capW;
    for (let xx = x + capW; xx < x1; xx += segW) {
      const dw = Math.min(segW, x1 - xx);
      g.drawImage(b.c, m0, 0, dw / k, b.h, xx, y, dw, h);
    }
    g.drawImage(b.c, 0, 0, cap, b.h, x, y, capW, h);
    g.drawImage(b.c, b.w - cap, 0, cap, b.h, x1, y, capW, h);
    return true;
  },
  // 把外框放在一個格子上：洞比格子小一點（蓋住格子的邊），外圍最多比格子大 pad
  frame(g, f, x, y, w, h, inset, pad) {
    const kx = Math.min((w / 2 - inset) / f.hx, (w / 2 + pad) / (f.w / 2)), ky = Math.min((h / 2 - inset) / f.hy, (h / 2 + pad) / (f.h / 2));
    const fw = f.w * kx, fh = f.h * ky;
    g.drawImage(f.c, x + w / 2 - fw / 2, y + h / 2 - fh / 2, fw, fh);
  },
  // v2.11 小地圖外框：九宮格（四個角照原比例、四條邊拉長），框的內緣壓進地圖 5px
  nine(g, f, x, y, w, h) {
    const cs = Math.round(f.w * 0.158), cd = 18, o = cd * 0.1 / 0.158 - 5;   // 原圖：角 15.8%、內緣在 10% 的地方
    x -= o; y -= o; w += o * 2; h += o * 2;
    const sw = f.w, sh = f.h, mW = sw - cs * 2, mH = sh - cs * 2, dW = w - cd * 2, dH = h - cd * 2;
    if (dW <= 0 || dH <= 0) return;
    g.save(); g.imageSmoothingEnabled = true;
    g.drawImage(f.c, cs, 0, mW, cs, x + cd, y, dW, cd); g.drawImage(f.c, cs, sh - cs, mW, cs, x + cd, y + h - cd, dW, cd);
    g.drawImage(f.c, 0, cs, cs, mH, x, y + cd, cd, dH); g.drawImage(f.c, sw - cs, cs, cs, mH, x + w - cd, y + cd, cd, dH);
    g.drawImage(f.c, 0, 0, cs, cs, x, y, cd, cd); g.drawImage(f.c, sw - cs, 0, cs, cs, x + w - cd, y, cd, cd);
    g.drawImage(f.c, 0, sh - cs, cs, cs, x, y + h - cd, cd, cd); g.drawImage(f.c, sw - cs, sh - cs, cs, cs, x + w - cd, y + h - cd, cd, cd);
    g.restore();
  },
  // v2.11 畫面上方大橫幅的底：兩端的金飾照原比例，中間拉長
  banner(g, cx, cy) {
    const f = this.IM.hud_banner; if (!f) return;
    const h = 62, k = h / f.h, cap = Math.round(f.w * 0.09), capW = cap * k, w = 500, x = cx - w / 2, y = cy - h / 2;
    g.save(); g.imageSmoothingEnabled = true;
    g.drawImage(f.c, cap, 0, f.w - cap * 2, f.h, x + capW - 1, y, w - capW * 2 + 2, h);
    g.drawImage(f.c, 0, 0, cap, f.h, x, y, capW, h); g.drawImage(f.c, f.w - cap, 0, cap, f.h, x + w - capW, y, capW, h);
    g.restore();
  },
  // 功能選單、回城按鈕的圖示：換成 ui_<id> 的圖（CSS 變數，關掉新美術時 CSS 會改回線條圖示）
  menuIcons() {
    if (typeof ARTWORK === 'undefined' || typeof ArtStyle === 'undefined') return;
    // 跟著遊戲目前的選單項目走（遊戲拿掉或新增項目都不用改這裡），再加回城鈕（portal）和功能鈕（menu）
    const root = document.documentElement.style, ids = new Set(['portal', 'menu']);
    if (typeof UI !== 'undefined' && UI.MENU) UI.MENU.forEach(m => ids.add(m.id));
    let miss = 0;
    for (const id of ids) {
      const c = ArtStyle.cell('ui_' + id);
      if (c) root.setProperty('--ui-' + id, `url(${c.toDataURL()})`); else miss++;
    }
    document.body.classList.toggle('uiicons', miss === 0);
    // 標題後面的金框牌匾：把標題包進一個外框，牌匾放在標題後面（標題的漸層字才不會被蓋住）
    if (ARTWORK.img.ui_plaque) root.setProperty('--ui-plaque', `url(${ARTWORK.img.ui_plaque})`);
    const t = document.querySelector('#menu .title');
    if (t && !t.parentElement.classList.contains('tp-wrap')) {
      const w = document.createElement('div'); w.className = 'tp-wrap'; t.parentElement.insertBefore(w, t);
      const p = document.createElement('div'); p.className = 'tplaque'; w.appendChild(p); w.appendChild(t);
    }
    document.body.classList.toggle('uiplaque', !!ARTWORK.img.ui_plaque);   // 有任何一個項目沒有新圖 → 整組用原本的線條圖示，避免一半新一半舊
  },
};
ArtUI.load();

// 生命球、魔力球：AI 外框＋會慢慢轉的液體貼圖＋液面波紋（沒圖或關掉新美術 → 原本的畫法）
(function () {
  const prev = drawOrb;
  drawOrb = function (g, x, y, R, frac, col, dark, label, es, trail) {
    const IM = ArtUI.IM, fr = IM.hud_orb, life = col === '#b82020', tex = IM[life ? 'hud_liq_life' : 'hud_liq_mana'];
    if (!ArtUI.on() || !fr || !tex) return prev.apply(this, arguments);
    const t = (typeof G !== 'undefined' && G.time) || 0, f = clamp(frac, 0, 1), top = y + R - R * 2 * f;
    const wave = i => top + (f > 0.01 && f < 0.99 ? Math.sin(i * 0.9 + t * 2.4) * 1.6 : 0);
    g.save();
    g.fillStyle = '#050305'; g.beginPath(); g.arc(x, y, R + 2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.clip();
    g.fillStyle = dark; g.fillRect(x - R, y - R, R * 2, R * 2);
    // 空的部分也看得到一點點液體的影子
    g.globalAlpha = 0.16; g.drawImage(tex.c, x - R, y - R, R * 2, R * 2); g.globalAlpha = 1;
    if (trail > frac) { const th = R * 2 * clamp(trail, 0, 1); g.fillStyle = 'rgba(255,235,215,0.8)'; g.fillRect(x - R, y + R - th, R * 2, th - R * 2 * f); }
    if (f > 0) {
      g.save();
      g.beginPath(); g.moveTo(x - R, y + R);
      for (let i = 0; i <= 16; i++) g.lineTo(x - R + i * R / 8, wave(i));
      g.lineTo(x + R, y + R); g.closePath(); g.clip();
      g.translate(x, y); g.rotate(t * (life ? 0.12 : -0.1));
      const s = R * 2.9; g.imageSmoothingEnabled = true; g.drawImage(tex.c, -s / 2, -s / 2, s, s);
      g.restore();
      g.strokeStyle = life ? 'rgba(255,170,150,.6)' : 'rgba(160,200,255,.6)'; g.lineWidth = 1.2; g.beginPath();
      for (let i = 0; i <= 16; i++) { const xx = x - R + i * R / 8; i ? g.lineTo(xx, wave(i)) : g.moveTo(xx, wave(i)); }
      g.stroke();
    }
    // 玻璃球的感覺：邊緣暗、左上反光
    const rg = g.createRadialGradient(x, y, R * 0.5, x, y, R);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = rg; g.fillRect(x - R, y - R, R * 2, R * 2);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.ellipse(x - R * 0.28, y - R * 0.5, R * 0.42, R * 0.2, -0.45, 0, Math.PI * 2); g.fill();
    g.restore();
    // 外框（洞對準球的邊）
    const k = (R + 1) / fr.hole; g.imageSmoothingEnabled = true;
    g.drawImage(fr.c, x - fr.w * k / 2, y - fr.h * k / 2, fr.w * k, fr.h * k);
    if (es != null) {
      g.save(); g.shadowColor = '#8fd0ff'; g.shadowBlur = 6; g.strokeStyle = '#b0e0ff'; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, R - 1.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(es, 0, 1)); g.stroke(); g.restore();
    }
    // 數字：直接叫原本的 drawOrb 來寫字，但只讓「寫字」生效（畫圓、填色都略過）→ 遊戲之後改數字的格式也會自動跟上
    g.save(); prev.call(this, textOnly(g), x, y, R, frac, col, dark, label, null, null); g.restore();
    if (!life) lastMana = [x, y, R, frac, col, dark, label];
  };
  // v2.14.2 光環保留魔力時，遊戲在 'drawHUD' 事件把球頂畫成一截灰色斜線，會蓋到數字 → 數字在最後再補寫一次
  //   要排在光環那個登記之後，所以等遊戲開始（所有模組都載入完）才登記
  let lastMana = null, late = false;
  Hook.on('start', () => {
    if (late) return; late = true;
    Hook.on('drawHUD', g => {
      if (!lastMana || !ArtUI.on() || !(G.S && G.S.manaReserved > 0)) return;
      g.save(); prev.call(this, textOnly(g), ...lastMana, null, null); g.restore();
    });
  });
  const SKIP = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'clip', 'drawImage', 'clearRect']);
  const textOnly = g => new Proxy(g, {
    get(t, k) { if (SKIP.has(k)) return () => {}; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; },
    set(t, k, v) { t[k] = v; return true; },
  });
})();

// 下方 HUD：原本的深色漸層換成石板面板；技能格、藥劑格疊上 AI 外框，按鍵字再補畫在最上面
(function () {
  const prev = drawHUD;
  drawHUD = function (g) {
    const IM = ArtUI.IM, use = ArtUI.on() && typeof G !== 'undefined' && G.P;
    if (use && (IM.hud_bar || IM.hud_banner)) {
      if (IM.hud_bar) { g.save(); g.imageSmoothingEnabled = true; ArtUI.bar(g, 100, VH - 60, VW - 200, 60); g.restore(); }
      // 跳過原本那一塊漸層底；v2.11 畫面上方大橫幅（升級、進地圖、擊敗首領）的黑底＋兩條細線換成 AI 橫幅
      const fr = g.fillRect, bn = IM.hud_banner && G.banner;
      g.fillRect = function (x, y, w, h) {
        if (IM.hud_bar && x === 100 && y === VH - 62 && w === VW - 200 && h === 62) return;
        if (bn && w === 520 && h === 54 && x === VW / 2 - 260) { ArtUI.banner(this, VW / 2, y + 28); return; }
        if (bn && w === 300 && h === 1 && x === VW / 2 - 150) return;
        return fr.call(this, x, y, w, h);
      };
      try { prev(g); } finally { delete g.fillRect; }
    } else prev(g);
    if (!use) return;
    g.save(); g.imageSmoothingEnabled = true;
    if (IM.hud_slot) {
      const labels = IS_TOUCH && typeof skillKeyNames === 'function' ? skillKeyNames() : CFG.swapMouse ? ['右', '左', keyLabel('sk3'), keyLabel('sk4'), keyLabel('sk5')] : ['左', '右', keyLabel('sk3'), keyLabel('sk4'), keyLabel('sk5')];   // 手機：主、2～5（跟技能頁一致）
      for (let i = 0; i < 5; i++) {
        const [x, y, s] = HUD.skill(i);
        if (!G.P.skills[i]) emptySlot(g, x, y, s);   // v2.11 沒放技能的格子：一個淡淡的空寶石座
        ArtUI.frame(g, IM.hud_slot, x, y, s, s, 2, 2);
        g.fillStyle = 'rgba(0,0,0,0.78)'; roundRect(g, x + 2, y + 2, 13, 11, 3); g.fill();
        txt(g, labels[i], x + 8.5, y + 7.5, 8, '#f0d088', 'center', false);
      }
    }
    for (let i = 0; i < 4; i++) {
      const [x, y, fw, fh] = HUD.flask(i), f = G.pl && G.pl.fl[i], ic = f && flaskArt(f.type);
      if (ic) { g.fillStyle = '#0c0a0e'; roundRect(g, x + 0.5, y + 0.5, fw - 1, fh - 1, 4); g.fill(); }   // 蓋掉原本的色塊
      if (IM.hud_flask) ArtUI.frame(g, IM.hud_flask, x, y, fw, fh, 1, 2);
      if (ic) drawFlaskBottle(g, f, ic, x, y, fw, fh);
      if (!IS_TOUCH) txt(g, keyLabel('f' + (i + 1)), x + fw / 2, y + 7, 9, '#f0d088', 'center');   // 手機不畫按鍵字
    }
    drawMiniFrame(g);
    g.restore();
  };

  // ---- v2.11 藥劑格：用背包裡那張 AI 藥瓶圖，瓶子裡的藥水高度＝剩下的量 ----
  const FL = { full: {}, dim: {} };
  function flaskArt(type) {
    if (FL.full[type] !== undefined) return FL.full[type];
    const c = ArtStyle.cell && ArtStyle.cell('fl_' + type); if (!c) return null;   // 圖還沒好：這一格照原本畫
    const d = document.createElement('canvas'); d.width = c.width; d.height = c.height;
    // 空瓶＝原圖蓋一層半透明的暗灰（不用 ctx.filter：iPhone 舊版 Safari 不支援，會變得跟滿瓶一樣亮）
    const x = d.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(40,38,44,0.8)'; x.fillRect(0, 0, d.width, d.height); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 0, d.width, d.height);
    FL.dim[type] = d; return (FL.full[type] = c);
  }
  function drawFlaskBottle(g, f, ic, x, y, fw, fh) {
    const s = fw + 4, bx = x + fw / 2 - s / 2, by = y + fh - s - 2;
    const frac = clamp(f.c / f.max, 0, 1), ok = f.c >= f.use, buff = G.flaskBuffs && G.flaskBuffs[f.type];
    g.drawImage(FL.dim[f.type], bx, by, s, s);                 // 空的瓶子
    const top = by + s * (0.38 + 0.54 * (1 - frac));           // 藥水表面（瓶身大約在圖的 38%～92%）
    g.save(); g.beginPath(); g.rect(bx - 3, top, s + 6, by + s - top + 3); g.rect(bx - 3, by - 3, s + 6, s * 0.3 + 3); g.clip();
    if (buff) { g.shadowColor = FLASKS[f.type].color; g.shadowBlur = 7 + 3 * Math.sin(G.time * 6); }
    g.globalAlpha = ok ? 1 : 0.55; g.drawImage(ic, bx, by, s, s);
    g.restore();
    // 還能喝幾次：瓶子上方的小點
    const n = Math.floor(f.max / f.use), have = Math.floor(f.c / f.use);
    for (let k = 0; k < n && n <= 6; k++) {
      const px = x + fw / 2 + (k - (n - 1) / 2) * 4.5;
      g.fillStyle = k < have ? '#ffe9a8' : 'rgba(255,233,168,0.18)'; g.fillRect(Math.round(px) - 1, y + 13, 2, 2);
    }
  }
  // ---- v2.11 空技能格 ----
  function emptySlot(g, x, y, s) {
    const cx = x + s / 2, cy = y + s / 2;
    const rg = g.createRadialGradient(cx, cy, 1, cx, cy, s * 0.62);
    rg.addColorStop(0, 'rgba(46,34,26,0.95)'); rg.addColorStop(1, 'rgba(10,8,9,0.95)');
    g.fillStyle = rg; roundRect(g, x + 1, y + 1, s - 2, s - 2, 5); g.fill();
    const r = s * 0.2, d = () => { g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * 0.8, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r * 0.8, cy); g.closePath(); };
    d(); g.fillStyle = 'rgba(110,80,180,0.16)'; g.fill(); g.strokeStyle = 'rgba(214,176,104,0.32)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(255,240,200,0.18)'; g.fillRect(Math.round(cx - r * 0.3), Math.round(cy - r * 0.45), 1, 1);
  }
  // ---- v2.11 小地圖外框（九宮格：四個角照原比例，邊拉長） ----
  function drawMiniFrame(g) {
    const f = ArtUI.IM.hud_mini, w = G.world; if (!f || !w || !w.mini || CFG.minimap === 'off') return;
    const s = (w.kind === 'town' ? 3 : 2) * ({ small: 0.5, normal: 1, large: 1.5 }[CFG.minimap] || 1);
    const mw = w.W * s, mh = w.H * s, mx = VW - mw - 10, my = 10;
    ArtUI.nine(g, f, mx - 3, my - 3, mw + 6, mh + 6);
  }
})();

// v2.8.7 投射物：render.js 的掛鉤 drawProjArt(g, p)，畫好回傳 true；不處理回傳 false（照原本畫）
//   敵方：依投射物種類／元素換圖（箭、火球、冰刺、雷球、混沌毒彈、暗影彈、骨刺、法術光彈）
//   玩家：箭、火球、冰刺、飛斧換圖；各技能自己顏色的法術彈（orb／shadow）保留原畫法，才分得出是哪個技能
(function () {
  if (typeof ARTWORK === 'undefined') return;
  const IM = {};
  for (const k in ARTWORK.img) if (k.startsWith('prj_')) { const im = new Image(); im.onload = () => { IM[k.slice(4)] = im; }; im.src = ARTWORK.img[k]; }
  // 畫出來的長度（px，敵方一般大小的投射物）；圓的投射物置中，長的讓「頭」對準投射物的位置
  const LEN = { arrow: 34, fireball: 34, ice: 30, light: 26, chaos: 28, shadow: 30, bone: 28, axe: 24, arcane: 26, rock: 22 };
  const HEAD = { arrow: 0.88, fireball: 0.78, ice: 0.86, light: 0.72, chaos: 0.76, shadow: 0.82, bone: 0.86, arcane: 0.74, rock: 0.75, axe: 0.5 };
  const GLOW = { fireball: '255,120,40', ice: '150,220,255', light: '255,240,140', chaos: '120,255,90', shadow: '170,110,255', arcane: '255,230,150' };
  const elemOf = p => (p.parts && p.parts[0] && p.parts[0][1]) || (p.owner && p.owner.def && p.owner.def.elem) || 'phys';
  function pick(p) {
    if (p.team !== 'enemy') {
      if (p.sprite === 'bonespear' || (p.sprite === 'arrow' && p.color === '#e8dcc0')) return 'bone';   // v2.13 召喚師「骨矛」＝骨刺圖
      return { arrow: 'arrow', fireball: 'fireball', iceshard: 'ice', axe: 'axe' }[p.sprite] || null;
    }
    if (p.sprite === 'arrow') return 'arrow';
    if (p.sprite === 'axe') return 'axe';
    if (p.sprite === 'shadow') return 'shadow';
    const el = elemOf(p);
    if (p.sprite === 'fireball' || el === 'fire') return 'fireball';
    if (p.sprite === 'iceshard' || el === 'cold') return 'ice';
    if (el === 'light') return 'light';
    if (el === 'chaos') return 'chaos';
    return (p.spell || (p.owner && p.owner.def && p.owner.def.spell)) ? 'arcane' : 'bone';
  }
  window.drawProjArt = function (g, p) {
    if (!ArtUI.on()) return false;
    const k = pick(p), im = k && IM[k]; if (!im) return false;
    const t = (typeof G !== 'undefined' && G.time) || 0;
    const base = k === 'fireball' ? 7 : 5, sz = clamp((p.r || base) / base, 0.8, 2.4) * (k === 'bone' && p.team !== 'enemy' ? (p.shard ? 1.1 : 1.8) : 1);   // 骨矛比怪物的骨刺長；v2.16.2 骨刺碎片小一點
    const L = LEN[k] * sz, H = L * im.height / im.width;
    g.save(); g.translate(p.x, p.y);
    if (GLOW[k]) {   // 元素光暈（疊加光，暗的地方也看得到）
      const R = Math.max(H, L * 0.35) * (1 + Math.sin(t * 18 + p.x) * 0.08);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
      gr.addColorStop(0, `rgba(${GLOW[k]},0.55)`); gr.addColorStop(1, `rgba(${GLOW[k]},0)`);
      g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
    g.imageSmoothingEnabled = true;
    if (k === 'axe') {   // 飛斧：一直轉
      g.rotate(p.spin != null ? p.spin : t * 18);
      g.drawImage(im, -L / 2, -H / 2, L, H);
    } else {
      const a = Math.atan2(p.vy || 0, p.vx || 1);
      g.rotate(a);
      if (Math.abs(a) > Math.PI / 2 && k !== 'light' && k !== 'arcane' && k !== 'rock') g.scale(1, -1);   // 往左飛時上下翻回來，火焰尾巴才不會倒過來
      g.drawImage(im, -L * HEAD[k], -H / 2, L, H);
    }
    g.restore();
    return true;
  };
})();

// v2.8.8 地圖事件（mapevents.js 的掛鉤 drawEventArt(g, ev)：畫好主體回傳 true；陰影、名字標籤照遊戲原本畫）
//   神殿＝石祭壇＋上面浮著神殿顏色的光球；深淵裂口＝地上發紫光的裂縫（清完變成封住的裂縫）；
//   精髓水晶＝怪物被封在透明冰晶裡；瞻望之柱＝刻著金色眼睛的方尖碑（用過變暗）
(function () {
  if (typeof ARTWORK === 'undefined') return;
  const IM = {};
  for (const k in ARTWORK.img) if (k.startsWith('ev_') || k.startsWith('hs_')) {
    const im = new Image();
    im.onload = () => {
      IM[k] = im;
      // 小屋圖比地圖晚載好（例如直接讀檔進村莊）→ 重畫一次村莊底圖
      if (k.startsWith('hs_') && typeof G !== 'undefined' && G.world && G.world.hub === 'village') try { buildWorldCanvas(G.world); } catch (e) {}
    };
    im.src = ARTWORK.img[k];
  }
  ArtUI.EV = IM;
  const put = (g, im, x, foot, w) => { const h = w * im.height / im.width; g.drawImage(im, x - w / 2, foot - h, w, h); return h; };
  // 用過的瞻望之柱：灰階＋壓暗（'saturation' 混色去色，再用原圖形狀裁一次；iPhone 也支援）
  let GRAY = null;
  const grayPillar = im => {
    if (GRAY) return GRAY;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'saturation'; x.globalAlpha = 0.8; x.fillStyle = '#808080'; x.fillRect(0, 0, c.width, c.height);
    x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, 0, c.width, c.height);
    return (GRAY = c);
  };
  const glow = (g, x, y, r, rgb, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const hexRgb = c => { const n = parseInt(String(c).slice(1, 7), 16) || 0xffffff; return `${n >> 16},${(n >> 8) & 255},${n & 255}`; };
  window.drawEventArt = function (g, ev) {
    if (!ArtUI.on() || typeof G === 'undefined') return false;
    const x = ev.x, y = ev.y, t = G.time || 0;
    g.imageSmoothingEnabled = true;
    if (ev.kind === 'shrine') {
      if (!IM.ev_shrine) return false;
      put(g, IM.ev_shrine, x, y + 16, 44);
      if (!ev.done) {
        const c = (typeof SHRINES !== 'undefined' && SHRINES[ev.type] && SHRINES[ev.type].color) || '#ffffff', oy = y - 34 + Math.sin(t * 3) * 3;
        g.globalCompositeOperation = 'lighter'; glow(g, x, oy, 30, hexRgb(c), 0.75); g.globalCompositeOperation = 'source-over';
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x, oy, 5, 0, Math.PI * 2); g.fill();
      }
      return true;
    }
    if (ev.kind === 'abyss') {
      const im = ev.cleared ? IM.ev_sealed : IM.ev_abyss; if (!im) return false;
      const w = 86, h = w * im.height / im.width; g.drawImage(im, x - w / 2, y - h / 2, w, h);
      if (!ev.cleared) {
        g.globalCompositeOperation = 'lighter'; glow(g, x, y, 46, '170,100,255', 0.28 + 0.14 * Math.sin(t * 4)); g.globalCompositeOperation = 'source-over';
        if (Math.random() < 0.3) G.parts.push({ x: x + rnd(-28, 28), y: y + rnd(-6, 6), vx: 0, vy: -30, t: 0, dur: 0.8, color: '#a060e0', s: 2 });
      }
      return true;
    }
    if (ev.kind === 'essence') {
      if (!IM.ev_crystal) return false;
      if (ev.done) return true;
      g.globalAlpha = 0.9; drawSprite(g, ev.mon, x, y + 8, 2, 1, '#9ae8ff', false, 0); g.globalAlpha = 0.6;
      put(g, IM.ev_crystal, x, y + 18, 54); g.globalAlpha = 1;
      g.globalCompositeOperation = 'lighter'; glow(g, x, y - 16, 36, '150,220,255', 0.18 + 0.06 * Math.sin(t * 3)); g.globalCompositeOperation = 'source-over';
      return true;
    }
    if (ev.kind === 'vision') {
      if (!IM.ev_pillar) return false;
      if (ev.done) { put(g, grayPillar(IM.ev_pillar), x, y + 16, 34); return true; }   // 用過：變灰變暗（事先做好一張，不用 ctx.filter）
      const h = put(g, IM.ev_pillar, x, y + 16, 34);
      g.globalCompositeOperation = 'lighter'; glow(g, x, y + 16 - h * 0.78, 18, '255,220,120', 0.5 + 0.2 * Math.sin(t * 2.5)); g.globalCompositeOperation = 'source-over';
      return true;
    }
    return false;
  };
  // 終局村莊：牆壁圍起來的五塊地方換成小屋（直接畫進地圖底圖，跟原本的牆一樣不會擋視線）
  const HOUSES = { '3,3': 'hs_cottage', '36,3': 'hs_slate', '3,25': 'hs_long', '35,25': 'hs_long', '18,2': 'hs_hall' };
  const prevBuild = buildWorldCanvas;
  buildWorldCanvas = function (w) {
    const r = prevBuild.apply(this, arguments);
    try {
      if (w && w.hub === 'village' && ArtUI.on() && w.canvas) {
        const g = w.canvas.getContext('2d'); g.imageSmoothingEnabled = true;
        for (const [hx, hy, hw, hh] of [[3, 3, 5, 3], [36, 3, 5, 3], [3, 25, 6, 2], [35, 25, 6, 2], [18, 2, 8, 2]]) {
          const im = IM[HOUSES[hx + ',' + hy]]; if (!im) continue;
          const bw = hw * TS + 12, bh = bw * im.height / im.width, x0 = hx * TS - 6, foot = (hy + hh) * TS + 6;
          g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x0 + bw / 2, foot - 2, bw * 0.52, 9, 0, 0, Math.PI * 2); g.fill();
          if (hx > 30) { g.save(); g.translate(x0 + bw, 0); g.scale(-1, 1); g.drawImage(im, 0, foot - bh, bw, bh); g.restore(); }   // 右邊的屋子左右翻，村子比較不呆板
          else g.drawImage(im, x0, foot - bh, bw, bh);
        }
      }
    } catch (e) {}
    return r;
  };
})();

// v2.9 場景地板與牆：草原、海灘、沼澤、森林、沙漠、冰原換成 AI 貼圖（tex_<場景>_floor／_wall）
//   不是一格一格貼，而是整張地圖連續鋪同一張貼圖（看不出格子）；牆頂用牆貼圖壓暗、牆的正面加上下明暗
//   包 paintWorldDetail：先鋪貼圖，再讓原本的程式畫牆邊陰影、地上的小東西
(function () {
  if (typeof ARTWORK === 'undefined' || typeof paintWorldDetail !== 'function') return;
  const SRC = {}, READY = {};
  for (const k in ARTWORK.img) if (k.startsWith('tex_')) {
    const im = new Image();
    im.onload = () => {
      SRC[k.slice(4)] = im;
      // 貼圖比地圖晚載好 → 這張地圖重畫一次
      if (typeof G !== 'undefined' && G.world && G.world.theme && k.startsWith('tex_' + G.world.theme.id + '_')) try { buildWorldCanvas(G.world); } catch (e) {}
    };
    im.src = ARTWORK.img[k];
  }
  // 讓貼圖上下左右接起來沒有縫：中間用原圖、靠邊用「錯開半張」的同一張圖，中間平滑交叉
  function seamless(im) {
    const N = im.width, h = N / 2, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const s = document.createElement('canvas'); s.width = s.height = N; const sg = s.getContext('2d');
    for (const [dx, dy] of [[-h, -h], [h, -h], [-h, h], [h, h]]) sg.drawImage(im, dx, dy);
    const A = g.getImageData(0, 0, N, N), B = sg.getImageData(0, 0, N, N), a = A.data, b = B.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let t = Math.max(Math.abs(x + 0.5 - h), Math.abs(y + 0.5 - h)) / h; t = Math.min(1, Math.max(0, (t - 0.55) / 0.4)); t = t * t * (3 - 2 * t);
      const i = (y * N + x) * 4; for (let k = 0; k < 3; k++) a[i + k] = a[i + k] * (1 - t) + b[i + k] * t;
    }
    g.putImageData(A, 0, 0); return c;
  }
  const tex = key => READY[key] || (SRC[key] ? (READY[key] = seamless(SRC[key])) : null);
  ArtUI.tex = tex; ArtUI.seamless = seamless;
  const prev = paintWorldDetail;
  paintWorldDetail = function (g, w) {
    const id = w && w.theme && w.theme.id, on = ArtUI.on();
    const fl = on && tex(id + '_floor'), wl = on && tex(id + '_wall');
    const W = w.W, H = w.H, solid = (x, y) => x < 0 || y < 0 || x >= W || y >= H || w.grid[y * W + x] === 0;
    if (fl || wl) {
      g.save();
      if (fl) { g.fillStyle = g.createPattern(fl, 'repeat'); g.beginPath(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!solid(x, y)) g.rect(x * TS, y * TS, TS, TS); g.fill(); }
      if (wl) {   // 牆頂：牆貼圖壓暗
        g.beginPath(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(x, y)) g.rect(x * TS, y * TS, TS, TS);
        g.fillStyle = g.createPattern(wl, 'repeat'); g.fill(); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill();
      }
      g.restore();
    }
    prev.apply(this, arguments);
    if (wl) {   // 牆的正面（下面是地板的牆）：貼圖＋上亮下暗＋頂端亮邊
      g.save(); const pat = g.createPattern(wl, 'repeat');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(x, y) && !solid(x, y + 1)) {
        const px = x * TS, top = y * TS + 10, hh = 22;
        g.fillStyle = pat; g.fillRect(px, top, TS, hh);
        const gr = g.createLinearGradient(0, top, 0, top + hh); gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)');
        g.fillStyle = gr; g.fillRect(px, top, TS, hh);
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(px, top, TS, 2);
      }
      g.restore();
    }
    if (on && ArtUI.depth() && !ArtUI.smoothWalls(w)) wallDepth(g, w, solid);   // v2.16 圓滑牆會自己畫牆面和陰影
  };
  // v2.12 立體感：牆變高、牆頂有厚度、牆腳有落影（不管哪種場景、哪種牆的畫法都適用：直接拿已經畫好的牆面往上接）
  //   後面還有牆的地方（牆至少兩格厚）：牆的正面往上加高 16px（從 22px 變 38px）
  //   牆頂：靠地板那一側左亮右暗，看起來有厚度；牆腳：地板上多一道比較深的陰影
  function wallDepth(g, w, solid) {
    const W = w.W, H = w.H, EX = 16;
    // 先把畫好的地圖整張複製一份，之後都從這份拿（直接從自己身上拿，每次都會整張複製，大地圖會卡好幾秒）
    const src = document.createElement('canvas'); src.width = g.canvas.width; src.height = g.canvas.height; src.getContext('2d').drawImage(g.canvas, 0, 0);
    g.save();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!solid(x, y)) continue;
      const px = x * TS, py = y * TS;
      if (!solid(x, y + 1)) {   // 這一格是牆的正面
        if (solid(x, y - 1) && y > 0) {
          g.drawImage(src, px, py + 12, TS, EX, px, py + 10 - EX, TS, EX);   // 拿正面中間那段往上接
          g.drawImage(src, px, py + 13, TS, 2, px, py + 10, TS, 2);          // 蓋掉原本在正面中間的亮邊
          const top = py + 10 - EX, gr = g.createLinearGradient(0, top, 0, py + 32);
          gr.addColorStop(0, 'rgba(255,240,220,0.06)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.28)');
          g.fillStyle = gr; g.fillRect(px, top, TS, py + 32 - top);
          g.fillStyle = 'rgba(255,255,255,0.24)'; g.fillRect(px, top, TS, 2);       // 新的頂端亮邊
          g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(px, top - 2, TS, 2);         // 牆頂和正面交界的暗線
        }
        // 牆腳落影：照在下面那一格地板上
        const sg = g.createLinearGradient(0, py + TS, 0, py + TS + 14);
        sg.addColorStop(0, 'rgba(0,0,0,0.38)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = sg; g.fillRect(px, py + TS, TS, 14);
      }
      // 牆頂的厚度：旁邊是地板的那一側，左邊亮、右邊暗
      if (!solid(x - 1, y)) { g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(px, py, 2, TS); }
      if (!solid(x + 1, y)) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(px + TS - 3, py, 3, TS); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(px + TS, py + 4, 4, TS - 4); }
    }
    g.restore();
  }
})();

// v2.9 召喚物（骷髏、靈狼、靈體、魔像）：換成帶青綠色光的 AI 小人，一看就知道是自己人
(function () {
  if (typeof ARTWORK === 'undefined') return;
  const MAP = { minion: ['min_skel', 40], mwolf: ['min_wolf', 34], mspirit: ['min_spirit', 30], mgolem: ['min_golem', 60] };
  const IM = {}, cache = new Map();
  for (const k in MAP) { const src = ARTWORK.img[MAP[k][0]]; if (!src) continue; const im = new Image(); im.onload = () => { IM[k] = im; cache.clear(); }; im.src = src; }
  const make = (im, h, flash, flip) => {
    const w = Math.max(1, Math.round(im.width * h / im.height)), c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (flip) { g.translate(w, 0); g.scale(-1, 1); }
    g.drawImage(im, 0, 0, w, h); g.setTransform(1, 0, 0, 1, 0, 0);
    if (flash) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.85; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
    return c;
  };
  const prev = getSprite;
  getSprite = function (name, scale, tint, flash) {
    const im = IM[name];
    if (!im || !ArtUI.on()) return prev.apply(this, arguments);
    const key = name + '|' + (flash ? 1 : 0); let s = cache.get(key);
    if (!s) { const h = MAP[name][1], r = make(im, h, flash, false), l = make(im, h, flash, true); s = { r, l, w: r.width, h: r.height }; cache.set(key, s); }
    return s;
  };
})();

// v2.9 戰鬥特效（render.js 特效迴圈的掛鉤 drawFxArt(g, f, p)：畫好回傳 true；p＝0→1 的進度，透明度遊戲已經設好）
//   近戰揮砍＝AI 刀光（依技能顏色染色）；衝擊圈＝地面衝擊波；大的命中火花＝放射狀光芒
(function () {
  if (typeof ARTWORK === 'undefined') return;
  const IM = {}, tinted = new Map();
  for (const k of ['fx_slash', 'fx_ring', 'fx_burst']) { const src = ARTWORK.img[k]; if (!src) continue; const im = new Image(); im.onload = () => { IM[k] = im; }; im.src = src; }
  // 白色的特效圖染成技能的顏色（亮部保留一點白，看起來會發光）
  function tint(k, col) {
    const key = k + col; let c = tinted.get(key); if (c) return c;
    const im = IM[k]; c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.62; g.fillStyle = col || '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    if (tinted.size > 80) tinted.clear(); tinted.set(key, c); return c;
  }
  window.drawFxArt = function (g, f, p) {
    if (!ArtUI.on()) return false;
    if (f.k === 'slash' && IM.fx_slash) {
      const im = tint('fx_slash', f.color), arc = Math.min(f.arc || 1.6, Math.PI * 1.2);
      const h = 2 * f.r * Math.sin(Math.min(arc, Math.PI) / 2) * 1.15 * (0.9 + p * 0.25), w = h * im.width / im.height;
      g.save(); g.translate(f.x, f.y); g.rotate(f.ang); g.scale(-1, 1);   // 原圖凸面朝左 → 翻過來讓凸面朝揮砍方向
      g.globalCompositeOperation = 'lighter'; g.drawImage(im, -f.r * 0.95 - w / 2, -h / 2, w, h);
      g.restore(); return true;
    }
    if (f.k === 'ring' && IM.fx_ring) {
      const r = f.r * (0.5 + p * 0.5);
      if (f.fill) { g.fillStyle = f.fill; g.beginPath(); g.arc(f.x, f.y, r, 0, Math.PI * 2); g.fill(); }
      const im = tint('fx_ring', f.color), w = r * 2.3, h = w * im.height / im.width;
      g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(im, f.x - w / 2, f.y - h / 2, w, h); g.restore();
      return true;
    }
    if (f.k === 'spark' && f.big && IM.fx_burst) {
      const im = tint('fx_burst', f.color), s = 46 * (0.5 + p * 0.7);
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(f.x, f.y); g.rotate(f.a || 0); g.drawImage(im, -s / 2, -s / 2, s, s); g.restore();
      return true;
    }
    return false;
  };
  // 地上的夢魘碎片、鑰匙（render.js 掉落物的掛鉤 drawLootArt(g, l, bob)：畫好回傳 true）
  const L = {};
  for (const k of ['ui_frag', 'ui_key']) { const src = ARTWORK.img[k]; if (!src) continue; const im = new Image(); im.onload = () => { L[k] = im; }; im.src = src; }
  window.drawLootArt = function (g, l, bob) {
    if (!ArtUI.on() || !(l.frag || l.key)) return false;
    const k = l.key ? 'ui_key' : 'ui_frag'; if (!L[k]) return false;
    const c = (typeof NIGHTMARES !== 'undefined' && NIGHTMARES[l.frag || l.key] && NIGHTMARES[l.frag || l.key].color) || '#ffffff';
    const key = k + c; let im = tinted.get(key);
    if (!im) { const s = L[k]; im = document.createElement('canvas'); im.width = s.width; im.height = s.height; const x = im.getContext('2d'); x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.55; x.fillStyle = c; x.fillRect(0, 0, im.width, im.height); tinted.set(key, im); }
    const h = 22, w = h * im.width / im.height, y = l.y + (bob || 0);
    g.save(); g.globalAlpha = 0.3; g.fillStyle = c; g.beginPath(); g.ellipse(l.x, l.y + 8, 10, 4, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    g.imageSmoothingEnabled = true; g.drawImage(im, l.x - w / 2, y - h / 2, w, h);
    if (l.key) { const gr = g.createLinearGradient(0, l.y - 90, 0, l.y); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, c); g.globalAlpha = 0.4; g.fillStyle = gr; g.fillRect(l.x - 4, l.y - 90, 8, 90); }
    g.restore(); return true;
  };
})();

// v2.9.1 光環圈（auras.js 的掛鉤 drawAuraArt(g, pl, list)：畫好回傳 true）
//   每個開著的光環＝腳下一圈慢慢轉的符文環（光環顏色），一圈比一圈大
(function () {
  if (typeof ARTWORK === 'undefined' || !ARTWORK.img.fx_aura) return;
  let src = null; const tinted = new Map();
  { const im = new Image(); im.onload = () => { src = im; }; im.src = ARTWORK.img.fx_aura; }
  const tint = col => {
    let c = tinted.get(col); if (c) return c;
    c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const g = c.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.85; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    tinted.set(col, c); return c;
  };
  window.drawAuraArt = function (g, pl, list) {
    if (!src || !ArtUI.on() || typeof AURA_DEF === 'undefined') return false;
    const t = (G && G.time) || 0;
    list.forEach((id, i) => {
      const A = AURA_DEF[id]; if (!A) return;
      const im = tint(A.color), w = (30 + i * 6) * 2.3, h = w * im.height / im.width;
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.18 * Math.sin(t * 2 + i);
      // 「轉動」：橢圓沒辦法真的轉，改成左右輕輕來回滑一點點＋亮度起伏
      g.translate(pl.x + Math.sin(t * 0.8 + i) * 1.5, pl.y + 10); g.drawImage(im, -w / 2, -h / 2, w, h);
      g.restore();
    });
    return true;
  };
})();

// v2.9 天賦樹：星雲背景圖、職業起點換成「金框徽章＋職業立繪」
(function () {
  if (typeof TreeView === 'undefined' || typeof ARTWORK === 'undefined') return;
  const IM = {};
  const load = (k, key) => { const src = ARTWORK.img[key]; if (!src) return; const im = new Image(); im.onload = () => { IM[k] = im; }; im.src = src; };
  load('bg', 'tree_bg');
  // 徽章外框：中間是實心的深色 → 挖成空心，立繪才看得到（洞的半徑約是圖寬的 0.38）
  const HOLE = 0.38;
  { const src = ARTWORK.img.ui_medal; if (src) { const im = new Image(); im.onload = () => {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(c.width / 2, c.height / 2, c.width * HOLE, 0, Math.PI * 2); g.fill();
      IM.medal = c; }; im.src = src; } }
  if (typeof CLASSES !== 'undefined') for (const c in CLASSES) load('cls_' + c, 'class_' + c);
  const prev = TreeView.draw;
  TreeView.draw = function () {
    const g = this.g, c = this.canvas, on = ArtUI.on();
    if (on && IM.bg) {
      // 原本第一步是整片塗黑：改成畫星雲圖（跟著拖曳慢慢移動，有景深）
      const fr = g.fillRect, self = this;
      g.fillRect = function (x, y, w, h) {
        if (x === 0 && y === 0 && w === c.width && h === c.height && g.fillStyle === '#05040a') {
          fr.call(g, x, y, w, h);
          const im = IM.bg, k = Math.max(c.width / im.width, c.height / im.height) * 1.25, iw = im.width * k, ih = im.height * k;
          g.globalAlpha = 0.85; g.drawImage(im, (c.width - iw) / 2 + self.ox * 0.15, (c.height - ih) / 2 + self.oy * 0.15, iw, ih); g.globalAlpha = 1;
          return;
        }
        return fr.call(g, x, y, w, h);
      };
      try { prev.apply(this, arguments); } finally { delete g.fillRect; }
    } else prev.apply(this, arguments);
    if (!on || !IM.medal || !G.P) return;
    const has = new Set(G.P.tree);
    for (const n of TREE.list) if (n.kind === 'start') {
      const p = this.toScreen(n), r = this.nodeR(n), por = IM['cls_' + n.cls];
      if (p.x < -60 || p.y < -60 || p.x > c.width + 60 || p.y > c.height + 60) continue;
      if (por) {   // 立繪的上半身（頭）放進圓框
        g.save(); g.beginPath(); g.arc(p.x, p.y, r + 1, 0, Math.PI * 2); g.clip();
        const sw = por.width * 0.62, sx = (por.width - sw) / 2, sy = por.height * 0.06;
        g.drawImage(por, sx, sy, sw, sw, p.x - r - 1, p.y - r - 1, (r + 1) * 2, (r + 1) * 2);
        if (!has.has(n.id)) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(p.x - r - 2, p.y - r - 2, r * 2 + 4, r * 2 + 4); }
        g.restore();
      }
      const s = (r + 1) / HOLE; g.drawImage(IM.medal, p.x - s / 2, p.y - s / 2, s, s);
      if (this.hover === n) { g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, r + 7, 0, Math.PI * 2); g.stroke(); }
    }
  };
})();

// v2.9 背包裡空的裝備格：放一個淡淡的剪影（用該部位的裝備圖示），一眼看出是哪個部位
(function () {
  if (typeof UI === 'undefined' || !UI.refreshInv || typeof BASES === 'undefined') return;
  const SIL = {};
  const silFor = slot => {
    if (SIL[slot] !== undefined) return SIL[slot];
    const want = slot.replace(/\d+$/, ''), list = Object.values(BASE_BY_ID || {});
    const b = list.find(x => x.slot === want && x.tier === 1) || list.find(x => x.slot === want) || list.find(x => x.cls === want);
    const c = b && typeof ArtStyle !== 'undefined' && ArtStyle.cell('it_' + b.id);
    return (SIL[slot] = c ? c.toDataURL() : null);
  };
  const prev = UI.refreshInv;
  UI.refreshInv = function () {
    prev.apply(this, arguments);
    if (!ArtUI.on() || typeof ArtStyle === 'undefined' || !ArtStyle.ready) return;
    try {
      document.querySelectorAll('.eslot').forEach(d => {
        const lab = d.querySelector('.slabel'); if (!lab || d.querySelector('.esil')) return;
        const u = silFor(d.dataset.slot); if (!u) return;
        const im = document.createElement('img'); im.className = 'esil'; im.alt = ''; im.src = u; d.insertBefore(im, lab);
      });
    } catch (e) {}
  };
})();

// 怪物圖鑑（日誌 J）：每一列前面加怪物的小圖；還沒殺過的只顯示黑影
(function () {
  if (typeof UI === 'undefined' || !UI.refreshJournal || typeof ARTWORK === 'undefined') return;
  const NM_FILTER = { nm_bone: 'hue-rotate(250deg) saturate(1.3) brightness(.8)', nm_ash: 'saturate(1.5) brightness(.75) contrast(1.15)', nm_frost: 'hue-rotate(170deg) brightness(.75)' };
  const prev = UI.refreshJournal;
  UI.refreshJournal = function () {
    prev.apply(this, arguments);
    if (!ArtUI.on()) return;
    try {
      const body = document.getElementById('journalBody'); if (!body) return;
      const sec = [...body.querySelectorAll('.csec')].find(e => e.textContent.includes('怪物圖鑑')); if (!sec) return;
      // 跟 ui.js 一樣的順序：每個場景 10 隻怪＋看守者，最後是夢魘首領與守門人
      const keys = [];
      for (const th of THEMES) { th.monsters.forEach(k => keys.push({ src: 'mon_' + (MONSTERS[k].sprite || k) })); keys.push({ src: 'mon_boss_' + BOSSES[th.boss].sprite }); }
      ['nm_bone', 'nm_ash', 'nm_frost', 'keeper'].forEach(k => keys.push(BOSSES[k] && BOSSES[k].sprite ? { src: 'mon_boss_' + BOSSES[k].sprite, f: NM_FILTER[k] } : {}));
      const rows = []; for (let e = sec.nextElementSibling; e; e = e.nextElementSibling) if (e.classList.contains('lrow')) rows.push(e);
      if (rows.length !== keys.length) return;   // 遊戲改了圖鑑的排法 → 先不加圖，免得對錯
      rows.forEach((row, i) => {
        const src = keys[i].src && ARTWORK.img[keys[i].src]; if (!src) return;
        const im = document.createElement('img'); im.className = 'lmon'; im.alt = ''; im.src = src;
        if (keys[i].f && !row.classList.contains('dim')) im.style.filter = keys[i].f + ' drop-shadow(0 1px 1px #000)';
        row.insertBefore(im, row.firstChild);
      });
    } catch (e) {}
  };
})();

// 功能選單圖示：圖集準備好之後換上（ArtStyle.refresh 會在圖集載好、切換新舊美術時被呼叫）
(function () {
  if (typeof ArtStyle === 'undefined') return;
  const prev = ArtStyle.refresh.bind(ArtStyle);
  ArtStyle.refresh = function () { prev(); try { ArtUI.menuIcons(); } catch (e) {} };
})();

// v2.11 營地中間的夢之門營火：AI 畫的營火（石圈、木柴、橘火往上變成紫色的夢煙）蓋在原本程式畫的小火堆上
//   用 Hook.on('drawWorld')：在地圖物件之後、角色之前畫；原本的火光暈、火星粒子、繞圈的夢之光點照舊
(function () {
  if (typeof ARTWORK === 'undefined' || !ARTWORK.img.ev_campfire || typeof Hook === 'undefined') return;
  const im = new Image(); im.src = ARTWORK.img.ev_campfire;
  Hook.on('drawWorld', g => {
    const w = G.world; if (!ArtUI.on() || !w || w.kind !== 'town' || !w.fire || !im.width) return;
    const fx = w.fire[0] * TS, fy = w.fire[1] * TS, H = 54, W = H * im.width / im.height, t = G.time;   // 煙的頂端不要蓋到上面「夢之門」那行字
    const fl = 1 + Math.sin(t * 9) * 0.018 + Math.sin(t * 23) * 0.01;   // 火在跳：整張圖上下微微伸縮
    g.save(); g.imageSmoothingEnabled = true; g.translate(fx, fy + 14); g.scale(1, fl);
    g.drawImage(im, -W / 2, -H, W, H);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.1 + 0.07 * Math.sin(t * 7); g.drawImage(im, -W / 2, -H, W, H);
    g.restore();
  });
})();

// =============================================================
//  v2.12 立體光影（使用者選「保留現在視角、加強立體感」）
//  ・角色投影：角色、怪物、召喚物、營地的人，影子往「遠離光源」的方向拉長
//      地城：光源是主角身上的火光（怪物的影子背對主角）＋附近的火球、爆炸、閃電這類強光
//      營地：光源是中間的營火
//    原本腳下的圓影子照舊（那是貼地的接觸影子）
//  ・遠近層次：戶外場景有慢慢飄過地面的雲影；鏡頭前面飄著比地面移動得快的模糊前景粒子
//  ・設定 → 介面：「立體光影」可以關掉（牆的加高下次進地圖才會變）
//  接法：Hook.on('drawWorld')（地圖物件之後、角色之前）畫投影；Hook.on('drawOver')（角色之後）畫雲影與前景
// =============================================================
(function () {
  if (typeof Hook === 'undefined') return;
  const on = () => ArtUI.on() && ArtUI.depth() && G.world && G.pl;
  // 一團往右邊淡掉的柔邊影子（之後旋轉、拉長來用）
  const BLOB = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 40; const g = c.getContext('2d');
    // 柔邊用放射漸層做（不用 ctx.filter 的 blur：iPhone 舊版 Safari 不支援）：先畫一個邊緣淡掉的橢圓，再用橫向漸層讓尾巴淡掉
    g.save(); g.translate(64, 20); g.scale(1, 16 / 62);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, 62); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.7, 'rgba(0,0,0,0.85)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.fill(); g.restore();
    const gr = g.createLinearGradient(6, 0, 122, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = gr; g.fillRect(0, 0, 128, 40);
    return c;
  })();
  const OUTDOOR = { grass: 1, beach: 1, desert: 1, swamp: 1, forest: 1, ice: 1 };
  function lights(w, pl) {
    const L = [];
    if (w.kind === 'town') { if (w.fire) L.push({ x: w.fire[0] * TS, y: w.fire[1] * TS, r: 600, a: 0.6 }); }
    else L.push({ x: pl.x, y: pl.y - 10, r: 380, a: 0.72, self: pl });
    if (typeof ColorLight !== 'undefined' && ColorLight.on()) {
      // 遊戲的光源清單（上一格的，差一格看不出來；舊版沒有 list() 才自己重算）
      let D; try { D = typeof ColorLight.list === 'function' ? ColorLight.list() : ColorLight.collect(); } catch (e) { D = []; }
      (D || []).filter(s => s.a >= 0.6 && s.r >= 70).sort((a, b) => b.a * b.r - a.a * a.r).slice(0, 3)
        .forEach(s => L.push({ x: s.x, y: s.y, r: s.r * 2.2, a: 0.5 * Math.min(1, s.a) }));
    }
    return L;
  }
  function cast(g, L, x, feet, r, h, skip, only1) {
    const cx = G.cam.x, cy = G.cam.y, m = h * 2 + 20;   // 畫面外的不畫
    if (x < cx - m || x > cx + VW + m || feet < cy - m || feet > cy + VH + m) return;
    for (let i = 0; i < (only1 ? 1 : L.length); i++) {
      const s = L[i];
      if (s.self === skip) continue;
      const dx = x - s.x, dy = feet - s.y, d = Math.hypot(dx, dy); if (d < 6 || d > s.r) continue;
      const k = 1 - d / s.r, len = Math.min(h * 2, h * (0.7 + d / 200)), wid = r * 2.2;
      // 直接設定座標轉換（比每隻都 save／restore 省）：旋轉＝光源→角色的方向
      const c = dx / d, sn = dy / d, B = BASE;
      g.setTransform(B.a * c + B.c * sn, B.b * c + B.d * sn, B.c * c - B.a * sn, B.d * c - B.b * sn, B.a * x + B.c * feet + B.e, B.b * x + B.d * feet + B.f);
      g.globalAlpha = s.a * Math.sqrt(k);
      g.drawImage(BLOB, -r * 0.6, -wid / 2, len + r * 0.6, wid);
    }
  }
  let BASE = null;
  Hook.on('drawWorld', g => {
    if (!on()) return;
    const w = G.world, pl = G.pl, L = lights(w, pl); if (!L.length) return;
    g.save(); g.imageSmoothingEnabled = true; BASE = g.getTransform();
    // 怪很多時（深層夢境一個畫面上百隻）：蟲群和超過 60 隻之後的怪只投主光源的影子
    let n = 0;
    for (const m of G.mons) if (!m.dead && !m.hidden) cast(g, L, m.x, m.y + m.r * 0.8, m.r, m.boss ? m.r * 3.6 : 22 + m.r * 2.4, null, m.swarm || ++n > 60);
    for (const e of G.mins) cast(g, L, e.x, e.y + e.r * 0.8, e.r, 20 + e.r * 2);
    cast(g, L, pl.x, pl.y + pl.r * 0.8, 11, 52, pl);
    if (w.kind === 'town') {
      for (const n of w.npcs || []) cast(g, L, n.x, n.y + 12, 10, 48);
      if (typeof campFolk === 'function') for (const f of campFolk(w)) cast(g, L, f.x, f.y + 12, 10, 44);
    }
    g.restore();
  });

  // ---- 雲影（戶外）＋ 前景粒子 ----
  const CLOUD = (() => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 200; const g = c.getContext('2d');
    for (const [x, y, rr] of [[110, 100, 80], [180, 90, 95], [240, 115, 60], [150, 130, 70], [80, 120, 50]]) {
      const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 320, 200);
    }
    return c;
  })();
  const CL = Array.from({ length: 4 }, (_, i) => ({ x: (i * 397) % 1500, y: (i * 251) % 1000, s: 1 + (i % 3) * 0.3 }));   // v2.12.2 6→4 朵、縮小一點（全螢幕時混色的面積小一點）
  const FG = Array.from({ length: 14 }, (_, i) => ({ x: (i * 173) % 1200, y: (i * 311) % 800, s: 0.6 + ((i * 37) % 10) / 10, ph: i * 1.7 }));
  const FGSTYLE = {   // 前景粒子：顏色、透明度、大小、形狀
    forest: ['#0c1608', 0.42, 13, 'leaf'], swamp: ['#141c0a', 0.32, 11, 'leaf'], grass: ['#2a3010', 0.22, 9, 'leaf'],
    ice: ['#f4fbff', 0.35, 5, 'dot'], desert: ['#f0d8a0', 0.22, 4, 'dot'], beach: ['#e8f4ff', 0.2, 4, 'dot'],
    fire: ['#ffb060', 0.3, 3, 'dot'], void: ['#c8a8ff', 0.3, 3, 'dot'],
  };
  const wrap = (v, p) => ((v % p) + p) % p;
  Hook.on('drawOver', g => {
    if (!on()) return;
    const w = G.world, id = w.theme && w.theme.id, t = G.time, cx = G.cam.x, cy = G.cam.y;
    g.save(); g.imageSmoothingEnabled = true;
    if (OUTDOOR[id] && w.kind !== 'town') {   // 雲影：跟著地面走（世界座標），自己慢慢往右下飄
      const PW = VW + 700, PH = VH + 500;
      g.globalAlpha = id === 'forest' ? 0.5 : 0.32;
      for (const c of CL) {
        const x = cx - 350 + wrap(c.x + t * 14 - cx, PW), y = cy - 250 + wrap(c.y + t * 5 - cy, PH);
        g.drawImage(CLOUD, x, y, 320 * c.s * 1.25, 200 * c.s * 1.25);
      }
    }
    const st = FGSTYLE[id] || ['#ffe0b0', 0.16, 3, 'dot'];   // 其他場景：暖色的灰塵
    const PW = VW + 240, PH = VH + 240, spr = fgSprite(st);
    for (const p of FG) {   // 前景：移動速度是地面的 1.6 倍（比較靠近鏡頭），自己也慢慢飄
      const sx = wrap(p.x - cx * 1.6 + Math.sin(t * 0.3 + p.ph) * 30 + t * 6, PW) - 120, sy = wrap(p.y - cy * 1.6 + t * (st[3] === 'leaf' ? 10 : -4), PH) - 120;
      const size = st[2] * p.s * 1.5 * 2.6; g.globalAlpha = st[1] * (0.6 + 0.4 * Math.sin(t * 0.8 + p.ph));
      g.save(); g.translate(cx + sx, cy + sy); if (st[3] === 'leaf') g.rotate(t * 0.4 + p.ph);
      g.drawImage(spr, -size / 2, -size / 2, size, size); g.restore();
    }
    g.restore();
  });
  // 前景粒子的圖（先模糊好存起來，每格只貼圖）
  const FGC = {};
  function fgSprite(st) {
    const k = st.join('|'); if (FGC[k]) return FGC[k];
    const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d');
    // 模糊的邊用放射漸層做（不用 ctx.filter：iPhone 舊版 Safari 不支援）；葉子＝把圓壓扁
    const R = st[3] === 'leaf' ? 22 : 13, rg = g.createRadialGradient(0, 0, 0, 0, 0, R);
    rg.addColorStop(0, st[0]); rg.addColorStop(0.45, st[0]); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.translate(24, 24); if (st[3] === 'leaf') g.scale(1, 0.45);
    g.fillStyle = rg; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill(); return (FGC[k] = c);
  }

  SettingsRows.add('ui', () => `<div class="prow"><div class="pname">立體光影<small>角色的影子會背對光源拉長、牆壁比較高、戶外有雲影和前景粒子；電腦比較慢可以關掉（牆的高度下次進地圖才會變）</small></div><div class="pctl"><label class="pswitch"><input type="checkbox" data-depth3d ${ArtUI.depth() ? 'checked' : ''}><span></span></label></div></div>`, root => {
    const c = root.querySelector('[data-depth3d]');
    if (c) c.onchange = () => { CFG.depth3d = c.checked; saveCfg(); };
  });
})();

// =============================================================
//  v2.13 怪物死亡碎裂（參考《星蝕深淵》骷髏散架的做法）
//  ・怪物死掉時，把牠當下的樣子切成幾塊，往外噴開、落地彈一下、慢慢淡掉
//  ・全部用程式做，每種怪都適用；首領切得比較碎、留得比較久
//  ・碎片只記「從哪張圖的哪一塊」，不另外做圖；一個畫面最多 500 塊，怪死很多時每隻切少一點
//  接法：Hook.on('kill') 產生碎片、Hook.on('update') 移動、Hook.on('drawWorld') 畫（在活著的角色下面）、Hook.on('enterMap') 清掉
// =============================================================
(function () {
  if (typeof Hook === 'undefined') return;
  let S = [];
  const MAX = 500, rnd = (a, b) => a + Math.random() * (b - a);
  Hook.on('enterMap', () => { S = []; });
  Hook.on('kill', m => {
    if (!ArtUI.on() || !m || !m.def || !m.def.sprite) return;
    let sp; try { sp = getSprite(m.def.sprite, m.scale, m.tint || null, false); } catch (e) { return; }
    if (!sp) return;
    const fr = sp.anim ? sp.idle[0] : sp, img = m.facing < 0 ? fr.l : fr.r; if (!img || !img.width) return;
    const boss = !!m.boss, busy = S.length > MAX * 0.7;
    const cols = boss ? 5 : busy ? 2 : 3, rows = boss ? 6 : busy ? 2 : (sp.h > 50 ? 4 : 3);
    const feet = m.y + m.r * 0.8, x0 = m.x - sp.w / 2, y0 = feet - sp.h, pw = img.width / cols, ph = img.height / rows;
    const kw = sp.w / img.width, kh = sp.h / img.height, cx = m.x, cy = feet - sp.h * 0.5, life = boss ? 2.4 : 1.25;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (S.length >= MAX) S.shift();
      const px = x0 + (c + 0.5) * pw * kw, py = y0 + (r + 0.5) * ph * kh;
      const out = (px - cx) / Math.max(8, sp.w * 0.5);   // 越靠邊的塊飛得越外面
      S.push({ img, sx: c * pw, sy: r * ph, sw: pw, sh: ph, w: pw * kw, h: ph * kh,
        x: px, y: py, vx: out * rnd(50, 110) + rnd(-25, 25), vy: -rnd(70, 170) * (1 - r / rows * 0.5),
        g: feet + rnd(-5, 7), a: 0, va: rnd(-7, 7), t: 0, life: life * rnd(0.8, 1.15) });
    }
  });
  Hook.on('update', dt => {
    if (!S.length) return;
    for (const p of S) {
      p.t += dt; p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt;
      if (p.y + p.h * 0.3 > p.g) {   // 碰到地面：彈一下，越彈越小、慢慢停住
        p.y = p.g - p.h * 0.3;
        if (p.vy > 40) { p.vy *= -0.32; p.vx *= 0.6; p.va *= 0.5; } else { p.vy = 0; p.vx *= 0.85; p.va *= 0.8; }
      }
    }
    S = S.filter(p => p.t < p.life);
  });
  Hook.on('drawWorld', g => {
    if (!S.length || !ArtUI.on()) return;
    const cx = G.cam.x, cy = G.cam.y;
    g.save(); g.imageSmoothingEnabled = true; const B = g.getTransform();
    for (const p of S) {
      if (p.x < cx - 60 || p.x > cx + VW + 60 || p.y < cy - 60 || p.y > cy + VH + 60) continue;
      const fade = Math.min(1, (p.life - p.t) / 0.45), c = Math.cos(p.a), s = Math.sin(p.a);
      g.setTransform(B.a * c + B.c * s, B.b * c + B.d * s, B.c * c - B.a * s, B.d * c - B.b * s, B.a * p.x + B.c * p.y + B.e, B.b * p.x + B.d * p.y + B.f);
      g.globalAlpha = fade;
      g.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, -p.w / 2, -p.h / 2, p.w, p.h);
    }
    g.restore();
  });
  ArtUI.shards = () => S.length;   // 給自我檢查看
})();

// =============================================================
//  v2.14 岩漿、水塘、虛空裂隙：AI 液面貼圖（liq_lava／liq_water／liq_rift）
//  ・畫進地圖底圖（Hook 'worldCanvas'，只畫一次）：整片連續鋪貼圖，岸邊往內一圈深色、液面邊緣一條亮線（岩漿＝橘光、水＝白浪、裂隙＝紫光），岸上一圈落影 → 看起來是凹下去的池子
//  ・每格只在畫面裡的池子上疊一層慢慢流動的同一張貼圖（Hook 'drawWorld'）；岩漿另外一明一暗地發光
//  ・木橋照原本的木板樣子畫在水面上
// =============================================================
(function () {
  if (typeof Hook === 'undefined' || typeof ARTWORK === 'undefined') return;
  const KIND = { 8: 'lava', 2: 'water', 14: 'rift' };
  const EDGE = {   // 岸邊：[池子內側的暗色, 液面邊緣的亮線, 岸上的落影]
    lava: ['rgba(40,8,0,0.85)', 'rgba(255,190,90,0.75)', 'rgba(0,0,0,0.45)'],
    water: ['rgba(6,20,28,0.75)', 'rgba(220,240,255,0.45)', 'rgba(0,0,0,0.4)'],
    rift: ['rgba(0,0,0,0.9)', 'rgba(190,140,255,0.6)', 'rgba(0,0,0,0.5)'],
  };
  const FLOW = { lava: [6, 3], water: [10, 4], rift: [-4, 2] };   // 每秒流動幾點
  const SRC = {}, TILE = 160;   // 一張貼圖鋪 5 格寬
  for (const k of ['lava', 'water', 'rift']) {
    const s = ARTWORK.img['liq_' + k]; if (!s) continue;
    const im = new Image();
    im.onload = () => { SRC[k] = ArtUI.seamless ? ArtUI.seamless(im) : im; if (typeof G !== 'undefined' && G.world && G.world.deco) try { buildWorldCanvas(G.world); } catch (e) { } };
    im.src = s;
  }
  const pat = (g, k, ox, oy) => { const p = g.createPattern(SRC[k], 'repeat'), s = TILE / SRC[k].width; if (p.setTransform) p.setTransform(new DOMMatrix([s, 0, 0, s, ox || 0, oy || 0])); return p; };
  Hook.on('worldCanvas', w => {
    if (!ArtUI.on() || !w.deco || !w.canvas) return;
    const g = w.canvas.getContext('2d'), W = w.W, H = w.H;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : w.deco[y * W + x];
    g.save();
    for (const t in KIND) {
      const k = KIND[t], T = +t; if (!SRC[k]) continue;
      const same = (x, y) => { const v = at(x, y); return v === T || (T === 2 && v === 15); };
      const cells = []; for (let i = 0; i < W * H; i++) { const v = w.deco[i]; if (v === T || (T === 2 && v === 15)) cells.push(i); }
      if (!cells.length) continue;
      const [inner, rim, drop] = EDGE[k];
      // v2.16 有地板貼圖時：池子也用圓滑輪廓（跟牆同一套），不再是一格一格的方塊
      const fl = ArtUI.contour && w.theme && ArtUI.tex && ArtUI.tex(w.theme.id + '_floor');
      if (fl) {
        g.fillStyle = g.createPattern(fl, 'repeat'); g.beginPath(); for (const i of cells) g.rect((i % W) * TS, ((i / W) | 0) * TS, TS, TS); g.fill();   // 池子格先鋪地板
        const L = ArtUI.contour(w, same, false); (w._liq || (w._liq = {}))[k] = L;
        g.save(); g.strokeStyle = drop; g.lineWidth = 6; g.stroke(L); g.restore();   // 岸上一圈落影
        g.save(); g.clip(L, 'evenodd');
        g.fillStyle = pat(g, k); g.fillRect(0, 0, W * TS, H * TS);
        g.strokeStyle = inner; g.globalAlpha = 0.5; g.lineWidth = 20; g.stroke(L); g.globalAlpha = 0.7; g.lineWidth = 8; g.stroke(L);   // 池子內側一圈暗（看起來凹下去）
        g.globalAlpha = 1; g.strokeStyle = rim; g.lineWidth = 3; g.stroke(L);   // 液面邊緣亮線
        g.restore();
      } else {
      if (w._liq) delete w._liq[k];
      g.fillStyle = pat(g, k); g.beginPath(); for (const i of cells) g.rect((i % W) * TS, ((i / W) | 0) * TS, TS, TS); g.fill();
      for (const i of cells) {
        const x = i % W, y = (i / W) | 0, X = x * TS, Y = y * TS;
        const side = (nx, ny, gx0, gy0, gx1, gy1, rx, ry, rw, rh, lx, ly, lw, lh, ox, oy, ow, oh) => {
          if (same(nx, ny)) return;
          const gr = g.createLinearGradient(gx0, gy0, gx1, gy1); gr.addColorStop(0, inner); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
          g.fillStyle = rim; g.fillRect(lx, ly, lw, lh);
          if (!KIND[at(nx, ny)] && at(nx, ny) !== 15) { g.fillStyle = drop; g.fillRect(ox, oy, ow, oh); }   // 岸上：一圈落影
        };
        side(x, y - 1, 0, Y, 0, Y + 9, X, Y, TS, 9, X, Y + 3, TS, 1, X, Y - 3, TS, 3);
        side(x, y + 1, 0, Y + TS, 0, Y + TS - 6, X, Y + TS - 6, TS, 6, X, Y + TS - 3, TS, 1, X, Y + TS, TS, 2);
        side(x - 1, y, X, 0, X + 7, 0, X, Y, 7, TS, X + 2, Y, 1, TS, X - 2, Y, 2, TS);
        side(x + 1, y, X + TS, 0, X + TS - 7, 0, X + TS - 7, Y, 7, TS, X + TS - 3, Y, 1, TS, X + TS, Y, 2, TS);
      }
      }
      if (T === 2) for (const i of cells) if (w.deco[i] === 15) {   // 木橋：木板畫在水面上
        const X = (i % W) * TS, Y = ((i / W) | 0) * TS;
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X + 2, Y + 3, TS - 2, TS - 2);
        g.fillStyle = '#7a5a34'; for (let n = 0; n < 4; n++) g.fillRect(X + 1, Y + 1 + n * 8, TS - 2, 6);
        g.fillStyle = 'rgba(255,230,180,0.18)'; for (let n = 0; n < 4; n++) g.fillRect(X + 1, Y + 1 + n * 8, TS - 2, 1);
        g.fillStyle = '#4a3420'; g.fillRect(X + 1, Y, 3, TS); g.fillRect(X + TS - 4, Y, 3, TS);
      }
    }
    g.restore();
  });
  // 每格：畫面裡的池子疊一層慢慢流動的液面；岩漿一明一暗發光
  Hook.on('drawWorld', g => {
    const w = G.world; if (!ArtUI.on() || !w || !w.deco) return;
    const W = w.W, t = G.time, x0 = Math.max(0, Math.floor(G.cam.x / TS)), y0 = Math.max(0, Math.floor(G.cam.y / TS));
    const x1 = Math.min(W - 1, Math.ceil((G.cam.x + VW) / TS)), y1 = Math.min(w.H - 1, Math.ceil((G.cam.y + VH) / TS));
    g.save();
    for (const T of [8, 2, 14]) {
      const k = KIND[T]; if (!SRC[k]) continue;
      g.beginPath(); let n = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (w.deco[y * W + x] === T) { g.rect(x * TS, y * TS, TS, TS); n++; }
      if (!n) continue;
      const L = w._liq && w._liq[k];   // v2.16 圓滑池子：流動層也照輪廓裁，不會畫出方塊
      if (L) { g.save(); g.clip(L, 'evenodd'); g.beginPath(); g.rect(x0 * TS, y0 * TS, (x1 - x0 + 1) * TS, (y1 - y0 + 1) * TS); }
      const [vx, vy] = FLOW[k];
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = k === 'rift' ? 0.3 : 0.38;
      g.fillStyle = pat(g, k, t * vx, t * vy); g.fill();
      if (k === 'lava') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.1 + 0.08 * Math.sin(t * 2.2); g.fillStyle = pat(g, k, -t * 3, t * 5); g.fill(); }
      if (L) g.restore();
    }
    g.restore();
  });
})();

// =============================================================
//  v2.15 牆邊圓滑（使用者覺得地圖方方正正）：碰撞還是格子，只有「畫出來的輪廓」變圓
//  ・建地圖畫布時（Hook 'worldCanvas'，在岩漿水塘畫好之後），看每個格子交點的四個格子：
//      只有一格是牆（牆的凸角）→ 把那格牆的角削圓（從旁邊的地板拿同位置的像素補上）
//      三格是牆、一格地板（凹角）→ 在那格地板的角補一個小圓弧的牆（從上下那格牆拿像素）
//  ・長直的牆邊隨機凸出一點小弧（不是每格都一樣），牆腳隨機散一些碎石（冰原是冰晶）
//  ・營地不做（營地的房子是貼圖，削角會切到房子）
// =============================================================
(function () {
  if (typeof Hook === 'undefined') return;
  const R = 18;   // 圓角半徑（格子 32，太小看不出來）
  Hook.on('worldCanvas', w => {
    if (!ArtUI.on() || !w.canvas || !w.grid || w.kind === 'town' || ArtUI.smoothWalls(w)) return;   // 有 AI 貼圖的場景改用 v2.16 的圓滑牆
    const W = w.W, H = w.H, deco = w.deco;
    const wall = (x, y) => x < 0 || y < 0 || x >= W || y >= H || (w.grid[y * W + x] === 0 && !(deco && deco[y * W + x]));
    const g = w.canvas.getContext('2d');
    const src = document.createElement('canvas'); src.width = w.canvas.width; src.height = w.canvas.height; src.getContext('2d').drawImage(w.canvas, 0, 0);
    const rnd = (x, y, k) => { const h = hash2(x * 7 + k * 131, y * 13 + k * 17); return (h % 1000) / 1000; };
    // 把 (cx,cy) 這個角、往 (sx,sy) 方向 r×r 的那一小塊，換成從 (dx,dy) 偏移拿來的像素（只換角落圓弧外面那一片）
    //   效能：同一個偏移量的形狀全部收進同一個路徑，最後每種偏移量只畫一次（不用每個角都裁切一次）
    const GR = new Map(), D = 20;
    const grp = (dx, dy) => { const k = dx + ',' + dy; let o = GR.get(k); if (!o) GR.set(k, o = { p: new Path2D(), dx, dy }); return o.p; };
    const flush = () => {
      for (const o of GR.values()) { const pt = g.createPattern(src, 'no-repeat'); pt.setTransform(new DOMMatrix([1, 0, 0, 1, -o.dx, -o.dy])); g.fillStyle = pt; g.fill(o.p); }
      GR.clear();
    };
    const corner = (cx, cy, sx, sy, dx, dy, r) => { const p = grp(dx, dy); p.moveTo(cx, cy); p.lineTo(cx, cy + sy * r); p.arcTo(cx, cy, cx + sx * r, cy, r); p.closePath(); };
    const fillet = (cx, cy, sx, sy, dx, dy, r) => {   // 凹角：角落補一塊四分之一圓（圓心在角上）
      const p = grp(dx, dy); p.moveTo(cx, cy);
      p.arc(cx, cy, r, sx > 0 ? (sy > 0 ? 0 : -Math.PI / 2) : (sy > 0 ? Math.PI / 2 : Math.PI), sx > 0 ? (sy > 0 ? Math.PI / 2 : 0) : (sy > 0 ? Math.PI : Math.PI * 1.5)); p.closePath();
    };
    for (let vy = 1; vy < H; vy++) for (let vx = 1; vx < W; vx++) {
      const tl = wall(vx - 1, vy - 1), tr = wall(vx, vy - 1), bl = wall(vx - 1, vy), br = wall(vx, vy), n = tl + tr + bl + br;
      const cx = vx * TS, cy = vy * TS, r = R + Math.round(rnd(vx, vy, 1) * 4 - 2);
      if (n === 1) {   // 凸角：削那格牆的角，像素從上下那格地板拿
        if (tl) corner(cx, cy, -1, -1, 0, D, r); else if (tr) corner(cx, cy, 1, -1, 0, D, r);
        else if (bl) corner(cx, cy, -1, 1, 0, -D, r); else corner(cx, cy, 1, 1, 0, -D, r);
      } else if (n === 3) {   // 凹角：那格地板的角補小圓弧，像素從上下那格牆拿
        const k = Math.round(r * 0.75);
        if (!tl) fillet(cx, cy, -1, -1, 0, D, k); else if (!tr) fillet(cx, cy, 1, -1, 0, D, k);
        else if (!bl) fillet(cx, cy, -1, 1, 0, -D, k); else fillet(cx, cy, 1, 1, 0, -D, k);
      }
    }
    // 牆面（有磚紋那一段）露在外面的兩端：上角也削圓（像素從旁邊那格拿）→ 一階一階的牆看起來比較像圓滑的岩塊
    const EXT = ArtUI.depth() ? 16 : 0;
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) {
      if (!wall(x, y) || wall(x, y + 1)) continue;   // 只看牆的正面（下面是地板）
      const px = x * TS, top = y * TS + 10 - (wall(x, y - 1) && y > 0 ? EXT : 0), r = Math.round(R * 0.8 + rnd(x, y, 71) * 4);
      if (!wall(x - 1, y)) corner(px, top, 1, 1, -D, 0, r);
      if (!wall(x + 1, y)) corner(px + TS, top, -1, 1, D, 0, r);
    }
    // 長直牆邊：隨機凸出一點小弧（從旁邊那格牆，拿一個半橢圓伸進地板）
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (wall(x, y)) continue;
      const px = x * TS, py = y * TS;
      for (const [nx, ny, horiz] of [[x, y - 1, true], [x - 1, y, false], [x + 1, y, false]]) {
        if (!wall(nx, ny) || rnd(x, y, nx - x + 3 * (ny - y) + 5) > 0.32) continue;
        const len = 8 + rnd(x, y, 9) * 10, dep = 3 + rnd(x, y, 11) * 3, off = 4 + rnd(x, y, 13) * (TS - 8 - len), p = grp((nx - x) * TS, (ny - y) * TS);
        // 只畫伸進地板的那半個橢圓（另一半在牆上，偏移量對牆來說是錯的）
        if (horiz) { const ex = py, ecx = px + off + len / 2; p.moveTo(ecx + len / 2, ex); p.ellipse(ecx, ex, len / 2, dep, 0, 0, Math.PI); p.closePath(); }
        else if (nx < x) { const ex = px, ecy = py + off + len / 2; p.moveTo(ex, ecy - len / 2); p.ellipse(ex, ecy, dep, len / 2, 0, -Math.PI / 2, Math.PI / 2); p.closePath(); }
        else { const ex = px + TS, ecy = py + off + len / 2; p.moveTo(ex, ecy + len / 2); p.ellipse(ex, ecy, dep, len / 2, 0, Math.PI / 2, Math.PI * 1.5); p.closePath(); }
      }
    }
    flush();
    // 長直牆邊：隨機凸出一點小弧＋牆腳碎石
    const th = w.theme || {}, ice = th.id === 'ice';
    // 碎石顏色＝旁邊那格牆的平均顏色（把整張地圖縮成一格一點，只讀一次）
    const tiny = document.createElement('canvas'); tiny.width = W; tiny.height = H; const tg = tiny.getContext('2d'); tg.imageSmoothingEnabled = true; tg.drawImage(src, 0, 0, W, H);
    const TD = tg.getImageData(0, 0, W, H).data;
    const colAt = (x, y, k) => { const i = (y * W + x) * 4, f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(TD[i])},${f(TD[i + 1])},${f(TD[i + 2])})`; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (wall(x, y)) continue;
      const px = x * TS, py = y * TS;
      // 牆腳碎石
      const near = wall(x, y - 1) || wall(x - 1, y) || wall(x + 1, y) || wall(x, y + 1);
      if (!near || rnd(x, y, 21) > 0.4) continue;
      const cnt = 1 + Math.floor(rnd(x, y, 23) * 3);
      const wx = wall(x, y - 1) ? x : wall(x - 1, y) ? x - 1 : wall(x + 1, y) ? x + 1 : x, wy = wall(x, y - 1) ? y - 1 : wall(x, y + 1) && wx === x ? y + 1 : y;
      const inMap = wx >= 0 && wy >= 0 && wx < W && wy < H;
      for (let i = 0; i < cnt; i++) {
        let sx = px + 3 + rnd(x, y, 30 + i) * (TS - 6), sy = py + 3 + rnd(x, y, 40 + i) * (TS - 6);
        if (wall(x, y - 1)) sy = py + 3 + rnd(x, y, 50 + i) * 7; else if (wall(x - 1, y)) sx = px + 2 + rnd(x, y, 50 + i) * 7; else if (wall(x + 1, y)) sx = px + TS - 3 - rnd(x, y, 50 + i) * 7;
        const s = 1.5 + rnd(x, y, 60 + i) * 2.5;
        if (ice) { g.fillStyle = 'rgba(220,245,255,0.8)'; g.beginPath(); g.moveTo(sx, sy - s * 1.6); g.lineTo(sx + s * 0.7, sy + s * 0.5); g.lineTo(sx - s * 0.7, sy + s * 0.5); g.fill(); continue; }
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(sx + 0.8, sy + s * 0.5, s * 1.1, s * 0.55, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = inMap ? colAt(wx, wy, 1.15) : '#665'; g.beginPath(); g.ellipse(sx, sy, s, s * 0.7, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = inMap ? colAt(wx, wy, 1.7) : '#998'; g.fillRect(Math.round(sx - s * 0.4), Math.round(sy - s * 0.5), Math.max(1, s * 0.6), 1);
      }
    }
  });
})();

// =============================================================
//  v2.16 圓滑牆（使用者：貼圖上還是看得到角，要讓牆的貼圖本身是圓滑輪廓）
//  ・不再「一格一格」畫牆：先算出整張地圖牆的圓滑輪廓（把牆格子模糊後取一半的等高線＋一點點雜訊），
//    牆格底下先鋪連續的地板，再用這個輪廓「裁」牆的貼圖貼上去 → 削掉的地方露出真正的地板，看不到方格接縫
//  ・立體：輪廓整塊是牆面（貼圖＋越往下越暗），輪廓往上移 hf 之後還在牆裡的部分是牆頂（貼圖壓暗）；交界一條亮線，外圍一圈深色描邊，牆外地上有落影
//  ・保證：每格牆的中心一定是牆、每格地板的中心一定是地板（輪廓只在格子邊緣圓滑，不會吃掉能走的地方）
//  ・只用在有 AI 地板＋牆貼圖、而且不是營地的地圖（ArtUI.smoothWalls）；碰撞照舊是格子
// =============================================================
(function () {
  if (typeof Hook === 'undefined') return;
  const RES = 8, PAD = 3, SUB = TS / RES;   // 輪廓取樣：每格 4×4 點
  function contour(w, inside, outer = true) {   // inside(x,y)：這格算不算「裡面」；outer：地圖外圍算不算裡面（牆＝算，水池＝不算）
    const W = w.W, H = w.H, deco = w.deco;
    const wall = inside || ((x, y) => x < 0 || y < 0 || x >= W || y >= H || (w.grid[y * W + x] === 0 && !(deco && deco[y * W + x])));
    const NX = W * SUB + PAD * 2, NY = H * SUB + PAD * 2;
    let v = new Float32Array(NX * NY), t = new Float32Array(NX * NY);
    const cellOf = i => Math.floor((i - PAD + 0.5) * RES / TS);
    for (let j = 0; j < NY; j++) { const cy = cellOf(j); for (let i = 0; i < NX; i++) v[j * NX + i] = wall(cellOf(i), cy) ? 1 : 0; }
    const blurX = (a, b) => { for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { let s = 0; for (let k = -2; k <= 2; k++) s += a[j * NX + Math.min(NX - 1, Math.max(0, i + k))]; b[j * NX + i] = s / 5; } };
    const blurY = (a, b) => { for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { let s = 0; for (let k = -2; k <= 2; k++) s += a[Math.min(NY - 1, Math.max(0, j + k)) * NX + i]; b[j * NX + i] = s / 5; } };
    blurX(v, t); blurY(t, v); blurX(v, t); blurY(t, v);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const gx = i - PAD, gy = j - PAD, cx = cellOf(i), cy = cellOf(j), k = j * NX + i;
      v[k] += ((hash2(gx * 3 + 7, gy * 5 + 11) % 1000) / 1000 - 0.5) * 0.14;   // 一點點雜訊：直牆邊不會是一條死板的直線
      const lx = (gx % SUB + SUB) % SUB, ly = (gy % SUB + SUB) % SUB, core = lx >= 1 && lx <= 2 && ly >= 1 && ly <= 2;
      if (core) v[k] = wall(cx, cy) ? Math.max(v[k], 0.7) : Math.min(v[k], 0.3);   // 格子中心：牆一定是牆、地板一定是地板
    }
    // marching squares：沿著輪廓走一圈，做成一條條完整的外框線（不是一堆小塊拼起來，才不會有接縫細線）
    //   外框和中間的洞（牆裡的地板）用 evenodd 規則一起處理
    const X = i => (i - PAD + 0.5) * RES, Y = j => (j - PAD + 0.5) * RES, T = 0.5;
    const val = (i, j) => v[j * NX + i];
    const ptOf = key => {   // 邊的編號 → 輪廓點（在那條邊上依數值內插）
      const e = key % 2, idx = (key - e) / 2, i = idx % NX, j = (idx - i) / NX;
      if (e === 0) { const p = val(i, j), q = val(i + 1, j), f = (T - p) / (q - p); return [X(i) + RES * f, Y(j)]; }
      const p = val(i, j), q = val(i, j + 1), f = (T - p) / (q - p); return [X(i), Y(j) + RES * f];
    };
    const link = new Map(), add = (k1, k2) => { (link.get(k1) || link.set(k1, []).get(k1)).push(k2); (link.get(k2) || link.set(k2, []).get(k2)).push(k1); };
    for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
      const a = val(i, j) >= T, b = val(i + 1, j) >= T, c = val(i + 1, j + 1) >= T, d = val(i, j + 1) >= T;
      const n = (a ? 8 : 0) | (b ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0); if (n === 0 || n === 15) continue;
      const top = (j * NX + i) * 2, bot = ((j + 1) * NX + i) * 2, left = (j * NX + i) * 2 + 1, right = (j * NX + i + 1) * 2 + 1;
      const mid = (val(i, j) + val(i + 1, j) + val(i + 1, j + 1) + val(i, j + 1)) / 4 >= T;
      switch (n) {
        case 1: case 14: add(left, bot); break;
        case 2: case 13: add(bot, right); break;
        case 3: case 12: add(left, right); break;
        case 4: case 11: add(top, right); break;
        case 6: case 9: add(top, bot); break;
        case 7: case 8: add(left, top); break;
        case 5: if (mid) { add(left, top); add(bot, right); } else { add(top, right); add(left, bot); } break;
        case 10: if (mid) { add(top, right); add(left, bot); } else { add(left, top); add(bot, right); } break;
      }
    }
    const P = new Path2D(), seen = new Set();
    if (outer) P.rect(X(0), Y(0), X(NX - 1) - X(0), Y(NY - 1) - Y(0));   // 地圖外圍整個算牆；輪廓線圍起來的是地板（evenodd：外框減掉地板＝牆，地板裡的柱子又是牆）
    for (const start of link.keys()) {
      if (seen.has(start)) continue;
      let prev = -1, cur = start, first = true;
      while (true) {
        seen.add(cur); const [px, py] = ptOf(cur);
        if (first) { P.moveTo(px, py); first = false; } else P.lineTo(px, py);
        const nb = link.get(cur), next = nb[0] !== prev ? nb[0] : nb[1];
        if (next === undefined || next === start || seen.has(next)) break;
        prev = cur; cur = next;
      }
      P.closePath();
    }
    return P;
  }
  const moved = (P, dx, dy) => { const p = new Path2D(); p.addPath(P, new DOMMatrix([1, 0, 0, 1, dx, dy])); return p; };
  ArtUI.contour = contour;   // 岩漿水塘也用同一套圓滑輪廓
  Hook.on('worldCanvas', w => {
    if (!w.canvas || !w.grid || !ArtUI.smoothWalls(w)) return;
    const id = w.theme.id, fl = ArtUI.tex(id + '_floor'), wl = ArtUI.tex(id + '_wall'), g = w.canvas.getContext('2d');
    const W = w.W, H = w.H, deco = w.deco, CW = W * TS, CH = H * TS, hf = ArtUI.depth() ? 26 : 22;
    const P = contour(w), cap = moved(P, 0, -hf);
    const big = new Path2D(); big.rect(-200, -200, CW + 400, CH + 400);
    g.save();
    // 0) 牆格底下先鋪連續的地板（被削掉的牆角露出來的就是真正的地板）
    g.fillStyle = g.createPattern(fl, 'repeat'); g.beginPath();
    //   立體障礙物（岩石、樹…）的格子也鋪：它們是每格畫面另外疊上去的，底圖那格原本是舊的方塊地板，跟連續地板對不上
    //   v2.16.5 立體障礙物被關掉時（設定關掉，或手機太慢被自動關掉）：平面障礙物原本畫在一塊舊的方塊地板上 → 一樣鋪連續地板，最後再把平面障礙物畫回來
    const pool = t => t === 2 || t === 8 || t === 14 || t === 15;
    const stacked = t => t && !pool(t) && typeof StackProps !== 'undefined' && StackProps.handles && StackProps.handles(t);
    const flat = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, t = deco && deco[i];
      if ((w.grid[i] === 0 && !t) || stacked(t)) g.rect(x * TS, y * TS, TS, TS);
      else if (t && !pool(t) && typeof drawDeco === 'function') { g.rect(x * TS, y * TS, TS, TS); flat.push([t, x, y]); }
    }
    g.fill();
    w._flatDeco = flat;
    // 1) 牆外地上的落影（往右下）
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fill(moved(P, 4, 7), 'evenodd'); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fill(moved(P, 1.5, 3), 'evenodd');
    // 2) 牆面：整塊先貼牆貼圖，越往下越暗
    g.save(); g.clip(P, 'evenodd');
    g.fillStyle = g.createPattern(wl, 'repeat'); g.fillRect(0, 0, CW, CH);
    for (const [k, a] of [[0.7, 0.14], [0.45, 0.14], [0.2, 0.16]]) { const p = new Path2D(); p.addPath(big); p.addPath(P, new DOMMatrix([1, 0, 0, 1, 0, -hf * k])); g.fillStyle = `rgba(0,0,0,${a})`; g.fill(p, 'evenodd'); }
    // 3) 牆頂：輪廓往上移 hf 之後還在牆裡的地方；貼圖壓暗，邊緣一圈稍亮（看起來有厚度）
    g.save(); g.clip(cap, 'evenodd');
    g.fillStyle = g.createPattern(wl, 'repeat'); g.fillRect(0, 0, CW, CH); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, CW, CH);
    g.strokeStyle = 'rgba(255,240,220,0.1)'; g.lineWidth = 6; g.stroke(cap);
    g.restore();
    g.strokeStyle = 'rgba(255,245,230,0.22)'; g.lineWidth = 2; g.stroke(cap);   // 牆頂和牆面交界的亮線
    g.restore();
    // 4) 外輪廓一圈深色描邊，牆和地板分得開
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1.5; g.stroke(P);
    g.restore();
    // 5) 平面障礙物畫回連續地板上（沒有方塊底）
    for (const [t, x, y] of w._flatDeco || []) try { drawDeco(g, t, x, y, hash2(x, y), w); } catch (e) { }
    w._flatDeco = null;
  });
})();
