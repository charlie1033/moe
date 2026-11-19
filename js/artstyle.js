// =============================================================
//  v2.4 AI 美術（Higgsfield 生成）：標題畫面、人物立繪、職業立繪、圖示、介面底紋
//  ・圖都在 js\artwork.js（assets\art\build_artwork.ps1 產生）
//  ・說明頁（H）可以切回舊美術；設定存在這台電腦的瀏覽器（yiwang_artnew）
//  ・圖還沒載入或某個圖示沒有新版時，自動用原本程式畫的圖示
// =============================================================
const ArtStyle = {
  on: (() => { try { return localStorage.getItem('yiwang_artnew') !== '0'; } catch (e) { return true; } })(),
  atlas: null,   // 合好透明度的圖示圖集（canvas）
  ready: false,
  has() { return typeof ARTWORK !== 'undefined'; },
  init() {
    if (!this.has()) return;
    const col = new Image(), mask = new Image(); let n = 0;
    const done = () => {
      if (++n < 2) return;
      // 顏色圖＋遮罩合成一張有透明度的圖集
      const c = document.createElement('canvas'); c.width = col.width; c.height = col.height;
      const g = c.getContext('2d');
      g.drawImage(mask, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
      const g2 = document.createElement('canvas').getContext('2d'); g2.canvas.width = c.width; g2.canvas.height = c.height;
      g2.drawImage(col, 0, 0); const cd = g2.getImageData(0, 0, c.width, c.height), ca = cd.data;
      for (let i = 0; i < a.length; i += 4) ca[i + 3] = a[i];
      g.putImageData(cd, 0, 0);
      this.atlas = c; this.ready = true;
      this.refresh();
    };
    col.onload = done; mask.onload = done;
    col.src = ARTWORK.atlas; mask.src = ARTWORK.atlasMask;
    this.applyTheme();
  },
  // 切換新／舊美術
  set(on) {
    this.on = !!on;
    try { localStorage.setItem('yiwang_artnew', on ? '1' : '0'); } catch (e) {}
    this.applyTheme(); this.refresh();
  },
  // 清掉圖示快取，讓畫面重新畫
  refresh() {
    for (const k in ART_CACHE) delete ART_CACHE[k];
    if (typeof UI === 'undefined') return;
    const safe = fn => { try { fn(); } catch (e) {} };
    safe(() => document.querySelectorAll('#curbar .curbtn').forEach(d => { const im = d.querySelector('img'); if (im) im.src = currencyIconURL(d.dataset.cur, 40); }));
    safe(() => { if ($('#menu').classList.contains('show')) UI.buildMenu(); });
    if (typeof G !== 'undefined' && G.P) for (const f of ['refreshInv', 'refreshFlasks', 'refreshChar', 'refreshSkills', 'refreshJewels', 'refreshJournal']) safe(() => UI[f]());
    safe(() => { if (UI.storyOpen) UI.renderStory(); });
    safe(() => { if (G.world && G.world.deco && typeof worldRepaint === 'function') worldRepaint(G.world); });   // v2.19.4 地板貼圖、障礙物新圖跟著切換
  },
  applyTheme() {
    const on = this.on && this.has();
    document.body.classList.toggle('artnew', on);
    const m = document.getElementById('menu');
    if (m) m.style.backgroundImage = on ? `linear-gradient(rgba(6,4,6,.35), rgba(6,4,6,.55) 45%, rgba(6,4,6,.82)), url(${ARTWORK.img.title})` : '';
    document.documentElement.style.setProperty('--panelTex', on ? `url(${ARTWORK.img.ui_panel})` : 'none');
  },
  // 在 100×100 座標裡畫一個新圖示；有畫就回傳 true
  icon(g, id) {
    if (!this.on || !this.ready) return false;
    const i = ARTWORK.index[id]; if (i === undefined) return false;
    const s = ARTWORK.cell, sx = (i % ARTWORK.cols) * s, sy = Math.floor(i / ARTWORK.cols) * s;
    g.save(); g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 4; g.shadowOffsetY = 1.5;
    g.drawImage(this.atlas, sx, sy, s, s, 2, 2, 96, 96); g.restore();
    return true;
  },
  // v2.6 裝備基底圖示：先找這個基底自己的圖（it_sword3）；沒有就拿同種類最接近階級的圖，染成這一階的顏色
  //   初階＝生鏽褐、中階＝原色、高階＝金、夢鑄＝紫光、深淵＝黑紅光
  // v2.7 圖集裡的一格（直立的原圖），換裝小人拿武器用
  cell(id) {
    if (!this.on || !this.ready || ARTWORK.index[id] === undefined) return null;
    this._cells = this._cells || {};
    if (this._cells[id]) return this._cells[id];
    const i = ARTWORK.index[id], s = ARTWORK.cell, c = document.createElement('canvas'); c.width = c.height = s;
    c.getContext('2d').drawImage(this.atlas, (i % ARTWORK.cols) * s, Math.floor(i / ARTWORK.cols) * s, s, s, 0, 0, s, s);
    return (this._cells[id] = c);
  },
  baseIcon(g, base) {
    if (!this.on || !this.ready) return false;
    // v2.7 武器、箭袋的圖是直立的細長條，放進方格會太瘦 → 斜 45 度放大擺（像傳統 RPG 背包）
    const diag = base.slot === 'weapon' || base.cls === 'quiver';
    if (diag && ARTWORK.index['it_' + base.id] !== undefined) {
      g.save(); g.translate(50, 50); g.rotate(Math.PI / 4); g.scale(1.32, 1.32); g.translate(-50, -50);
      this.icon(g, 'it_' + base.id); g.restore(); return true;
    }
    if (this.icon(g, 'it_' + base.id)) return true;
    const pre = base.def && base.slot !== 'offhand' ? `it_${base.cls}_${base.def}` : 'it_' + base.cls, t = base.tier || 0;
    let src = null, st = -9;
    for (let k = 0; k < 5; k++) if (ARTWORK.index[pre + k] !== undefined && Math.abs(k - t) < Math.abs(st - t)) { src = pre + k; st = k; }
    if (!src) { if (ARTWORK.index[pre] !== undefined) { src = pre; st = 1; } else if (ARTWORK.index['it_' + base.cls] !== undefined) { src = 'it_' + base.cls; st = 1; } }
    if (!src) return false;
    if (st === t) return this.icon(g, src);
    const TINT = [['#9a6a40', 0.5, 0.12], null, ['#f0c050', 0.42, 0], ['#a080ff', 0.62, 0, '#b090ff'], ['#c01828', 0.6, 0.3, '#ff2030']][t];
    if (!TINT) return this.icon(g, src);
    const c = document.createElement('canvas'); c.width = c.height = 100; const cg = c.getContext('2d');
    this.icon(cg, src);
    cg.globalCompositeOperation = 'source-atop';
    if (TINT[2]) { cg.globalAlpha = TINT[2]; cg.fillStyle = '#000'; cg.fillRect(0, 0, 100, 100); }
    cg.globalCompositeOperation = 'color'; cg.globalAlpha = TINT[1]; cg.fillStyle = TINT[0]; cg.fillRect(0, 0, 100, 100);
    cg.globalCompositeOperation = 'destination-in'; cg.globalAlpha = 1; this.icon(cg, src);
    g.save(); if (TINT[3]) { g.shadowColor = TINT[3]; g.shadowBlur = 10; } g.drawImage(c, 0, 0); g.restore();
    return true;
  },
  // 立繪（npc_olly、class_warrior…），沒有就回傳 null
  img(key) { return this.on && this.has() && ARTWORK.img[key] ? ARTWORK.img[key] : null; },
};
// 劇情章節／人物 → 立繪
const NPC_PORTRAIT = { shop: 'npc_olly', jailer: 'npc_glen', girl: 'npc_sparrow', sera: 'npc_sera', are: 'npc_are', vivi: 'npc_vivi',
  hassan: 'npc_hassan', mo: 'npc_mo', yin: 'npc_yin', karl: 'npc_karl', nova: 'npc_nova', king: 'npc_king' };
function npcOfStory(key) {
  for (const npc in NPC_STORIES) if (NPC_STORIES[npc].chapters.some(c => c.id === key)) return npc;
  return null;
}
function portraitOfStory(key) { const n = npcOfStory(key); return n ? ArtStyle.img(NPC_PORTRAIT[n]) : null; }
