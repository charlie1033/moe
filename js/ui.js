// =============================================================
//  介面：背包、角色、技能、天賦樹、地圖裝置、選角、死亡
// =============================================================
const $ = s => document.querySelector(s);
// v2.0：遊戲自己的確認視窗。瀏覽器內建的 confirm()／alert() 在線上版（claude.ai 的安全沙盒）會被擋掉、
//   一律當作「取消」，所以「全部賣出／全部分解」按了沒反應。改用自己畫的視窗，本機和線上版都能用。
//   gameAsk(訊息, 按確定要做的事)；gameNote(訊息) 只有一個「知道了」
function gameAsk(text, onYes, opts = {}) {
  let box = document.getElementById('gask');
  if (!box) {
    box = document.createElement('div'); box.id = 'gask';
    box.innerHTML = '<div class="gask-card"><div class="gask-text"></div><div class="gask-btns"><button class="gask-yes"></button><button class="gask-no">取消</button></div></div>';
    document.body.appendChild(box);
  }
  box.querySelector('.gask-text').textContent = text;
  const yes = box.querySelector('.gask-yes'), no = box.querySelector('.gask-no');
  yes.textContent = opts.yes || '確定'; no.textContent = opts.no || '取消'; no.style.display = opts.noCancel ? 'none' : '';
  if (typeof input !== 'undefined') { input.keys = {}; input.l = input.r = false; }
  const close = () => { box.classList.remove('show'); window.removeEventListener('keydown', onKey, true); };
  const onKey = e => { // Enter＝確定、Esc＝取消；視窗開著時按鍵不要傳進遊戲
    e.stopPropagation(); e.preventDefault();
    if (e.key === 'Enter' || e.code === 'Space') { close(); onYes && onYes(); } else if (e.key === 'Escape') { close(); opts.onNo && opts.onNo(); }
  };
  yes.onclick = () => { close(); onYes && onYes(); };
  no.onclick = () => { close(); opts.onNo && opts.onNo(); };   // v2.7.9 取消也可以做事
  box.classList.add('show'); window.addEventListener('keydown', onKey, true);
}
const gameNote = text => gameAsk(text, null, { yes: '知道了', noCancel: true });
window.alert = gameNote;   // 剩下只是通知用的 alert 也改成遊戲視窗
const EQUIP_SLOTS = [
  ['weapon', '武器', 20, 20, 60, 116], ['helmet', '頭盔', 180, 4, 60, 60], ['amulet', '項鍊', 252, 30, 46, 46],
  ['offhand', '副手', 340, 20, 60, 116], ['body', '胸甲', 174, 70, 72, 100], ['ring1', '戒指', 118, 104, 46, 46],
  ['ring2', '戒指', 256, 104, 46, 46], ['gloves', '手套', 20, 148, 60, 60], ['belt', '腰帶', 174, 176, 72, 32], ['boots', '鞋子', 340, 148, 60, 60],
];
const UI = {
  open: { inv: false, char: false, skills: false, tree: false, help: false, shop: false, stash: false, journal: false },
  stashTab: 0,
  get treeOpen() { return this.open.tree; },
  mouseOverUI: false, curSel: null,
  paused() { return this.open.tree || this.open.help || this.open.journal || this.storyOpen || (typeof Pause !== 'undefined' && Pause.open) || (typeof ChoiceBox !== 'undefined' && ChoiceBox.open); },
  msg(t, color = '#e8e0d0') { G.msgs.push({ txt: t, color, t: G.time }); if (G.msgs.length > 5) G.msgs.shift(); },
  // v2.3 重要事件的大橫幅（升級、傳奇掉落、擊敗首領）
  banner(title, sub, color = "#ffe6a0") { G.banner = { title, sub, color, t: G.time }; },

  init() {
    TreeView.init($('#treeCanvas'));
    { const vr = $("#volRange"); if (vr) { vr.value = Math.round(Sfx.vol * 100); vr.oninput = () => { Sfx.init(); Sfx.setVol(vr.value / 100); CFG.vol = +vr.value; saveCfg(); Sfx.play("pickup"); }; } }   // v2.3 音量
    { const ac = $('#artNewChk'); if (ac && typeof ArtStyle !== 'undefined') { ac.checked = ArtStyle.on; ac.onchange = () => ArtStyle.set(ac.checked); } }   // v2.4 新／舊美術
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => this.toggle(b.dataset.close, false));
    // 裝備欄
    const doll = $('#doll');
    EQUIP_SLOTS.forEach(([slot, name, x, y, w, h]) => {
      const d = document.createElement('div');
      d.className = 'cell eslot'; d.dataset.slot = slot;
      Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      d.innerHTML = `<span class="slabel">${name}</span>`;
      d.onclick = e => this.clickEquip(slot, e);
      d.oncontextmenu = e => { e.preventDefault(); if (this.curSel) { this.curSel = null; this.refreshInv(); } else this.unequip(slot); };
      d.onmouseenter = e => this.hoverEquip(slot, e); d.onmousemove = e => this.moveTip(e); d.onmouseleave = () => this.hideTip();
      doll.appendChild(d);
    });
    // 背包格
    const grid = $('#invgrid');
    for (let i = 0; i < 60; i++) {
      const d = document.createElement('div');
      d.className = 'cell icell'; d.dataset.i = i;
      d.onclick = e => this.clickInv(i, e);
      d.oncontextmenu = e => { e.preventDefault(); this.rightInv(i, e); };
      d.onmouseenter = e => this.hoverInv(i, e); d.onmousemove = e => this.moveTip(e); d.onmouseleave = () => this.hideTip();
      grid.appendChild(d);
    }
    // 通貨
    const cb = $('#curbar');
    for (const k in CURRENCY) {
      const d = document.createElement('div');
      d.className = 'curbtn'; d.dataset.cur = k;
      d.innerHTML = `<img src="${currencyIconURL(k, 40)}"><span class="cn">0</span>`;
      d.onclick = () => {
        if (CURRENCY[k].scroll) return usePortalScroll();
        if (G.P.cur[k] > 0) { this.curSel = this.curSel === k ? null : k; this.refreshInv(); } else this.msg(`沒有${CURRENCY[k].name}`);
      };
      d.onmouseenter = e => this.showTip(`<div class="tip-name" style="color:${CURRENCY[k].color}">${CURRENCY[k].name}</div><div class="tip-sub">${CURRENCY[k].scroll ? '卷軸' : '工藝石'}　·　持有 ${G.P.cur[k]}　碎片 ${G.P.shards[k] || 0}/${SHARD_NEED}</div><div class="tip-mod">${CURRENCY[k].desc}</div><div class="tip-hint">${CURRENCY[k].scroll ? '點一下或按 T 使用' : '點一下選取，再點要改造的裝備。按住 Shift 可連續使用，右鍵取消。'}</div>`, e.clientX, e.clientY);
      d.onmousemove = e => this.moveTip(e); d.onmouseleave = () => this.hideTip();
      cb.appendChild(d);
    }
    $('#sortBtn').onclick = () => this.sortInv();
    $('#treeReset').onclick = () => {
      const P = G.P, cost = resetAllCost(P);
      if (P.tree.length <= 1) return;
      if (cost > (P.respec || 0)) return alert(`全部重置需要 ${cost} 點重置點數（每 5 個天賦 1 點），你只有 ${P.respec || 0} 點。`);
      gameAsk(cost ? `全部重置要花 ${cost} 點重置點數，確定嗎？` : `要把所有天賦點數退回嗎？（${FREE_RESPEC_LVL} 級以前免費）`, () => { P.respec = (P.respec || 0) - cost; P.tree = [CLASSES[P.cls].start]; onBuildChanged(); });
    };
    $('#treeCenter').onclick = () => TreeView.center();
    this.buildMenu();
    this.buildMenuBar();
  },

  // ---------- 面板開關 ----------
  toggle(name, force) {
    const v = force ?? !this.open[name];
    this.open[name] = v;
    $('#' + name).classList.toggle('show', v);
    // 左側面板一次只開一個；商人與倉庫會順便打開背包
    const LEFT = ['char', 'skills', 'shop', 'stash', 'jewelbox', 'gemshop', 'craft'];
    if (v && LEFT.includes(name)) for (const o of LEFT) if (o !== name && this.open[o]) { this.open[o] = false; $('#' + o).classList.remove('show'); }
    // 打開過就把紅點清掉
    if (v && G.P && G.P.ui) { if (name === 'skills') G.P.ui.skillLvl = G.P.lvl; if (name === 'journal') G.P.ui.journalN = Object.keys(G.P.story.seen).length; }
    document.querySelectorAll('.mbtn').forEach(b => b.classList.toggle('on', !!this.open[b.dataset.m]));
    if (v && (name === 'shop' || name === 'stash') && !this.open.inv) { this.open.inv = true; $('#inv').classList.add('show'); }
    if (name === 'help' && v) $('#saveInfo').textContent = (G.saveFail ? '⚠ 瀏覽器存檔失敗中！' : G.lastSave ? `瀏覽器存檔：${new Date(G.lastSave).toLocaleTimeString()}` : '')
      + (FileSave.ok ? `　存檔檔案「${FileSave.handle.name}」：${G.lastFileSave ? new Date(G.lastFileSave).toLocaleTimeString() : '已連結'}` : '　（尚未連結存檔檔案）');
    if (name === 'shop' && v) this.refreshShop();
    if (name === 'stash' && v) this.refreshStash();
    if (name === 'gemshop' && v) this.refreshGemShop();
    if (name === 'craft' && v) this.refreshCraft();
    if (name === 'tree' && v) { TreeView.center(); }
    if (!v) this.hideTip();
    if (name === 'inv' && !v) { this.curSel = null; this.sel = null; this.renderCompare(); }
    this.refresh();
  },
  closeAll() { for (const k in this.open) if (this.open[k]) this.toggle(k, false); this.curSel = null; this.hideTip(); },
  onStart() { const ae = document.activeElement; if (ae && ae.blur) ae.blur(); setTimeout(() => window.focusSink && window.focusSink(), 50); $('#menu').classList.remove('show'); document.body.classList.add('playing'); this.layoutHUD(); Touch.layout(); this.refresh(); this.renderQuest(); },
  refresh() { if (!G.P) return; this.refreshInv(); this.refreshChar(); this.refreshSkills(); this.refreshTreeHead(); this.refreshJournal(); this.refreshJewels(); this.refreshCraft(); },

  // ---------- 功能按鈕列（畫面右側）與 HUD 說明 ----------
  // 每個按鈕的小圖示（線條 SVG，跟著文字顏色）
  ICONS: {
    inv: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9 12h6"/>',
    char: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/>',
    skills: '<path d="M13 2L5 13h6l-1 9 8-12h-6z"/>',
    tree: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><circle cx="12" cy="13" r="2"/><path d="M12 7.5v3.5M10.5 14.5l-4 2M13.5 14.5l4 2"/>',
    journal: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
    portal: '<ellipse cx="12" cy="12" rx="6" ry="9"/><path d="M12 7c-2 1.5-2 8.5 0 10M12 7c2 1.5 2 8.5 0 10"/>',
    craft: '<path d="M3 9h12l3-3h3v4l-3 2v3H6z"/><path d="M9 15v3h6v-3M6 21h12"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  },
  MENU: [
    { id: 'inv', name: '背包', key: 'I', desc: '裝備、藥劑、通貨、整理與分解' },
    { id: 'char', name: '角色', key: 'C', desc: '生命、防禦、抗性、技能傷害' },
    { id: 'skills', name: '技能', key: 'K', desc: '換技能、插輔助寶石' },
    { id: 'craft', name: '強化', key: 'B', desc: '用磨石強化武器、用護貝劑強化防具（+1～+10）' },
    { id: 'tree', name: '天賦', key: 'P', desc: '升級得到的天賦點數' },
    { id: 'journal', name: '日誌', key: 'J', desc: '記憶碎片、人物故事、怪物圖鑑' },
    { id: 'portal', name: '回城', key: 'T', desc: '使用傳送卷軸回營地（之後可回到同一場夢）' },
    { id: 'help', name: '說明', key: 'H', desc: '操作說明、存檔與備份' },
  ],
  buildMenuBar() {
    // v1.2：功能列收在藍球左邊的一顆按鈕裡，點了才往上彈出；回城獨立放在小地圖旁邊
    const bar = $('#menubar');
    const svg = id => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${this.ICONS[id]}</svg>`;
    const items = this.MENU.filter(m => m.id !== 'portal');
    bar.innerHTML = `<div id="mpop">${items.map(m => `<div class="mbtn" data-m="${m.id}"><span class="mico">${svg(m.id)}<span class="mkey">${keyLabel(m.id)}</span></span><span class="mname">${m.name}</span><span class="mbadge"></span></div>`).join('')}</div>`
      + `<div id="mtoggle" title="功能選單"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14"/></svg><span>功能</span><b class="mtbadge"></b></div>`;
    bar.querySelectorAll('.mbtn').forEach(b => {
      const m = this.MENU.find(x => x.id === b.dataset.m);
      b.onclick = () => { this.toggle(m.id); this.menuPop(false); };
      b.onmouseenter = e => this.showTip(`<div class="tip-name">${m.name}　<span class="mkey2">${keyLabel(m.id)}</span></div><div class="tip-mod" style="color:#d8ccb4">${m.desc}</div>`, e.clientX, e.clientY);
      b.onmousemove = e => this.moveTip(e); b.onmouseleave = () => this.hideTip();
    });
    $('#mtoggle').onclick = e => { e.stopPropagation(); this.menuPop(); };
    if (!this._menuOutside) { this._menuOutside = true; document.addEventListener('pointerdown', e => { if (this.menuOpen && !e.target.closest('#menubar')) this.menuPop(false); }); }   // v2.13.4 只加一次（改設定會重建功能列）
    // 回城按鈕（小地圖左邊）
    document.querySelectorAll('#portalbtn').forEach(x => x.remove());   // v2.13.4 改設定會重建功能列：先拿掉舊的回城鈕，不然會多出一顆卡在畫面中間
    const pb = document.createElement('div'); pb.id = 'portalbtn';
    pb.innerHTML = `<span class="mico">${svg('portal')}<span class="mkey">${keyLabel('portal')}</span></span><span class="pbname">回城</span><b class="pbcount"></b>`;
    pb.onclick = () => usePortalScroll();
    pb.onmouseenter = e => this.showTip(`<div class="tip-name">回城　<span class="mkey2">T</span></div><div class="tip-mod" style="color:#d8ccb4">使用傳送卷軸回營地，之後可以從營地的藍色門回到同一場夢。持有 ${G.P ? G.P.cur.portal : 0} 張。</div>`, e.clientX, e.clientY);
    pb.onmousemove = e => this.moveTip(e); pb.onmouseleave = () => this.hideTip();
    document.body.appendChild(pb);
    // HUD 熱區：技能欄、藥劑、生命球、魔力球、經驗條（滑鼠移上去看說明）
    const hot = $('#hudhot');
    const spots = [];
    for (let i = 0; i < 5; i++) { const [x, y, w, h] = HUD.skill(i); spots.push({ id: 'sk' + i, x, y, w, h }); }
    for (const [id, o] of [['life', HUD.orbL], ['mana', HUD.orbR]]) spots.push({ id, x: o[0] - o[2], y: o[1] - o[2], w: o[2] * 2, h: o[2] * 2 });
    for (let i = 0; i < 4; i++) { const [x, y, w, h] = HUD.flask(i); spots.push({ id: 'fl' + i, x, y, w, h }); }
    { const [x, y, w] = HUD.xp; spots.push({ id: 'xp', x, y: y - 4, w, h: 10 }); }
    this.spots = spots;
    hot.innerHTML = spots.map(s => `<div class="hspot" data-s="${s.id}" style="left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px"></div>`).join('');
    hot.querySelectorAll('.hspot').forEach(d => {
      d.onmouseenter = e => { this.hotTip = d.dataset.s; this.showTip(this.hudTip(d.dataset.s), e.clientX, e.clientY); };
      d.onmousemove = e => this.moveTip(e);
      d.onmouseleave = () => { this.hotTip = null; this.hideTip(); };
      d.onclick = () => { if (d.dataset.s.startsWith('sk')) this.toggle('skills', true); if (d.dataset.s.startsWith('fl')) useFlask(+d.dataset.s.slice(2)); };
    });
    if (!this._hudResize) { this._hudResize = true; window.addEventListener('resize', () => this.layoutHUD()); }
    this.layoutHUD();
  },
  // 依畫布實際大小，把按鈕列與熱區縮放到正確位置
  menuOpen: false,
  menuPop(v) { this.menuOpen = v ?? !this.menuOpen; $('#menubar').classList.toggle('open', this.menuOpen); if (!this.menuOpen) this.hideTip(); },
  // 回城按鈕跟著小地圖的寬度放在它左邊
  placePortalBtn() {
    const r = CV.getBoundingClientRect(), s = r.width / VW, w = G.world;
    const mw = w && w.mini ? w.W * (w.kind === 'town' ? 3 : 2) : 0;
    const x = mw ? VW - mw - 13 - 50 : VW - 56;
    Object.assign($('#portalbtn').style, { left: (r.left + x * s) + 'px', top: (r.top + 8 * s) + 'px', transform: `scale(${s})` });
    $('#portalbtn').classList.toggle('dim', !w || w.kind === 'town');
  },
  layoutHUD() {
    const r = CV.getBoundingClientRect(), s = r.width / VW;
    const bar = $('#menubar'), hot = $('#hudhot');
    Object.assign(bar.style, { left: (r.left + HUD.menuBtn[0] * s) + 'px', top: (r.top + HUD.menuBtn[1] * s) + 'px', transform: `scale(${s})` });
    this.placePortalBtn();
    Object.assign(hot.style, { left: r.left + 'px', top: r.top + 'px', transform: `scale(${s})` });
    Object.assign($('#questbox').style, { left: (r.left + 10 * s) + 'px', top: (r.top + 172 * s) + 'px', transform: `scale(${s})` });
  },
  hudTip(id) {
    const P = G.P, S = G.S, pl = G.pl; if (!S) return '';
    if (id.startsWith('sk')) {
      const i = +id.slice(2), sid = P.skills[i], key = ['左鍵', '右鍵', 'Q', 'E', 'R'][i];
      if (!sid) return `<div class="tip-name">空的技能欄（${key}）</div><div class="tip-hint">點一下或按 K 裝上技能</div>`;
      const sk = SKILLS[sid], c = G.slotCalc[i], err = skillUsable(S, sid);
      const sups = (P.links[i] || []).filter(x => x).map(x => `<span style="color:${supportFits(x, sid) ? SUPPORTS[x].color : '#a05050'}">◆${SUPPORTS[x].name}</span>`).join(' ');
      return `<div class="tip-name" style="color:${sk.color}"><img class="skico" src="${skillIconURL(sid, 64)}">${sk.name}　<span class="mkey2">${key}</span></div><div class="tip-sub">${sk.tags.map(t => TAG_NAME[t]).join('・')}　魔力消耗 ${c.cost}</div>
        <div class="tip-mod" style="color:#d8ccb4">${sk.desc}</div><div class="tip-mod ${err ? 'c-bad' : ''}" style="color:${err ? '' : '#8fd0ff'}">${err || this.skillInfo(sid, c)}</div>
        ${sups ? `<div class="tip-sep"></div><div class="tip-mod">${sups}</div>` : ''}<div class="tip-hint">點一下打開技能面板</div>`;
    }
    if (id === 'life') return `<div class="tip-name" style="color:#ff8080">生命 ${Math.ceil(pl.life)} / ${S.maxLife}</div>${S.maxES ? `<div class="tip-mod" style="color:#9fd8ff">能量護盾 ${Math.ceil(pl.es)} / ${S.maxES}（外圈藍色，先扣護盾）</div>` : ''}
      <div class="tip-mod" style="color:#d8ccb4">每秒回復 ${S.lifeRegenPS.toFixed(1)}　護甲 ${S.armourT}　閃避 ${S.evasionT}</div>
      <div class="tip-mod" style="color:#d8ccb4">抗性：火 ${S.resF}%　冰 ${S.resC}%　雷 ${S.resL}%　毒 ${S.resX}%</div><div class="tip-hint">生命歸零就會在牢房醒來</div>`;
    if (id === 'mana') return S.flags.bloodMagic ? '<div class="tip-name">血之魔法</div><div class="tip-mod" style="color:#d8ccb4">技能消耗生命，沒有魔力</div>'
      : `<div class="tip-name" style="color:#8fb8ff">魔力 ${Math.floor(pl.mana)} / ${S.maxMana}</div><div class="tip-mod" style="color:#d8ccb4">每秒回復 ${S.manaRegenPS.toFixed(1)}，擊殺也會回一點</div><div class="tip-hint">施放技能要消耗魔力</div>`;
    if (id.startsWith('fl')) {
      const k = +id.slice(2), f = pl.fl[k];
      if (!f) return `<div class="tip-name">空的藥劑欄　<span class="mkey2">${k + 1}</span></div><div class="tip-hint">按 I 打開背包，在「藥劑欄」選一瓶放進來</div>`;
      const on = G.flaskBuffs && G.flaskBuffs[f.type];
      return flaskTipHTML(f.item, { hint: `目前充能 ${Math.floor(f.c)} / ${f.max}${on ? `　<span style="color:#9fff9f">生效中 ${on.t.toFixed(1)} 秒</span>` : ''}<br>按 ${k + 1} 或點一下喝。殺怪和時間都會充能，回營地補滿` });
    }
    if (id === 'xp') return `<div class="tip-name">等級 ${P.lvl}</div><div class="tip-mod" style="color:#d8ccb4">經驗 ${P.xp} / ${xpNeed(P.lvl)}</div><div class="tip-hint">升級得到 1 點天賦點數；部分技能與連結孔要等級解鎖</div>`;
    return '';
  },
  // 任務提示框（畫面左側）
  questOpen: true,
  renderQuest() {
    const box = $('#questbox'), P = G.P; if (!P) return;
    const q = Quest.state(P), ch = QUESTS[q.ch];
    let h = `<div class="qhead" onclick="UI.questOpen=!UI.questOpen;UI.renderQuest()">任務 ${this.questOpen ? '▾' : '▸'}　<span class="qch">${ch ? ch.title : '全部完成'}</span></div>`;
    if (this.questOpen) {
      if (!ch) h += '<div class="qstep done">九章全部完成！之後是自由刷寶：深層夢境越深、詞綴越多，掉得越好。</div>';
      else {
        let hintShown = false, nDone = 0;
        ch.steps.forEach((st, i) => {
          const done = q.done[Quest.key(q.ch, st, i)];
          if (done) { nDone++; return; } // 完成的步驟收起來，只顯示還沒做的
          const prog = st.goal ? `（${Math.min(st.goal, Math.max(0, st.prog(P, q.base)))}/${st.goal}）` : '';
          h += `<div class="qstep ${st.boss ? 'boss' : ''}">${st.boss ? '☠' : '○'} ${ctlText(st.text)}${prog}</div>`;
          if (!hintShown && st.hint) { h += `<div class="qhint">${ctlText(st.hint)}</div>`; hintShown = true; }
        });
        if (nDone) h += `<div class="qstep done">✓ 已完成 ${nDone}/${ch.steps.length} 步</div>`;
        const r = ch.reward, rw = [r.pts ? `天賦點+${r.pts}` : '', r.respec ? `重置點+${r.respec}` : ''].filter(x => x)
          .concat(Object.keys(r.cur || {}).map(k => `${CURRENCY[k].name}×${r.cur[k]}`)).concat(r.jewel ? [jewelName(r.jewel)] : []);
        h += `<div class="qreward">獎勵：${rw.join('、')}</div>`;
      }
      h += PanelRows.html('quest', P);   // 帶話任務等（core.js 的 PanelRows）
    }
    if (box.dataset.h !== h) { box.innerHTML = h; box.dataset.h = h; }
  },
  // 紅點提醒：天賦點、新技能、日誌新內容、卷軸數量
  updateBadges() {
    const P = G.P; if (!P) return;
    P.ui = P.ui || { skillLvl: P.lvl, journalN: 0 };
    const pts = treePointsTotal(P) - treePointsUsed(P);
    const newSkill = Object.keys(SKILLS).some(k => hasSkillGem(P, k) && SKILLS[k].lvl > P.ui.skillLvl && SKILLS[k].lvl <= P.lvl) || LINK_LEVELS.some(l => l > P.ui.skillLvl && l <= P.lvl);
    const journalN = Object.keys(P.story.seen).length;
    const npcNew = Object.keys(NPC_STORIES).some(n => nextNpcChapter(n, P));
    const set = (id, txt, red) => { const b = document.querySelector(`.mbtn[data-m="${id}"] .mbadge`); if (b) { b.textContent = txt; b.className = 'mbadge' + (txt ? (red ? ' red' : ' info') : ''); } };
    set('tree', pts > 0 ? '+' + pts : '', true);
    const gemUp = P.skills.some(s => s && typeof gemCanLevel === 'function' && gemCanLevel(s));   // v2.12.9 技能寶石可以升級：功能選單「技能」也亮紅點
    set('skills', gemUp ? '升' : newSkill ? '新' : '', true);
    set('journal', journalN > (P.ui.journalN || 0) ? '新' : npcNew ? '！' : '', true);
    $('#portalbtn .pbcount').textContent = P.cur.portal || 0; this.placePortalBtn();
    $('#mtoggle .mtbadge').style.display = [...document.querySelectorAll('#mpop .mbadge.red')].some(b => b.textContent) ? 'block' : 'none';
    // 如果滑鼠正停在 HUD 熱區上，順便更新說明內容
    if (this.hotTip && $('#tip').style.display === 'block') $('#tip').innerHTML = this.hudTip(this.hotTip);
  },

  // 珠寶工坊已拿掉（v2.8.1）：鑲嵌在 jewels2.js；這個空函式留著給舊的呼叫點
  refreshJewels() {},
  // ---------- 提示框 ----------
  showTip(html, x, y) { const t = $('#tip'); t.innerHTML = html; t.style.display = 'block'; this.placeTip(x, y); },
  moveTip(e) { if ($('#tip').style.display === 'block') this.placeTip(e.clientX, e.clientY); },
  placeTip(x, y) {
    const t = $('#tip'); const r = t.getBoundingClientRect();
    let px = x + 18, py = y + 12;
    if (px + r.width > window.innerWidth - 6) px = x - r.width - 18;
    if (py + r.height > window.innerHeight - 6) py = window.innerHeight - r.height - 6;
    t.style.left = Math.max(4, px) + 'px'; t.style.top = Math.max(4, py) + 'px';
    // v2.7.7 兩件對照時：滑鼠指著的那件放在靠近物品的一邊，身上穿的放外側
    const cols = t.querySelector('.tipcols'); if (cols) cols.style.flexDirection = px < x ? 'row-reverse' : 'row';
  },
  // v2.5.2 地上物品的說明固定放在畫面右下角（藍球上方），不擋住角色和怪物
  showTipCorner(html) {
    const t = $("#tip"); t.innerHTML = html; t.style.display = "block";
    const c = document.getElementById("game").getBoundingClientRect(), r = t.getBoundingClientRect(), k = c.width / VW;
    const right = c.right - 12 * k, bottom = c.top + (VH - 118) * k;   // 藍球和功能按鈕的上方
    t.style.left = Math.max(4, right - r.width) + "px"; t.style.top = Math.max(4, bottom - r.height) + "px";
  },
  hideTip() { $('#tip').style.display = 'none'; },

  // ---------- 背包 ----------
  cellHTML(it) {
    if (!it) return '';
    if (isStack(it)) { const T = STACK_TYPES[it.stack]; return `<img src="${T.icon(it.key)}"><span class="iname" style="color:${T.color(it.key)}">${T.name(it.key).slice(0, 5)}</span><b class="stackn">${it.n}</b>`; }   // v2.6.1
    if (isFlask(it)) return `<img src="${flaskIconURL(it.type, 64)}"><span class="iname c-${it.rarity}">${FLASKS[it.type].name.slice(0, 4)}</span><span class="ftier">${it.tier}</span>`;
    const b = BASE_BY_ID[it.base];
    const socks = (it.sockets || []).map(k => `<i style="background:${k ? JEWELS[parseJewel(k).type].color : 'transparent'}"></i>`).join('');
    return `<img src="${itemIconURL(b, 64)}"><span class="iname c-${it.set ? 'set' : it.rarity}">${it.name.length > 6 ? it.name.slice(0, 6) : it.name}</span>${socks ? `<span class="sdots">${socks}</span>` : ''}`;
  },
  refreshInv() {
    const P = G.P; if (!P) return;
    document.querySelectorAll('.eslot').forEach(d => {
      const it = P.equip[d.dataset.slot];
      d.className = 'cell eslot' + (it ? ' r-' + it.rarity : '') + (this.sel && this.sel.eq === d.dataset.slot ? ' selected' : '');
      d.innerHTML = it ? this.cellHTML(it) : `<span class="slabel">${EQUIP_SLOTS.find(s => s[0] === d.dataset.slot)[1]}</span>`;
      if (it) { const n = d.querySelector('.iname'); if (n) n.textContent = it.name; }   // v2.7.8 裝備格顯示完整名稱（最多兩行）
    });
    document.querySelectorAll('#invgrid .icell').forEach(d => {   // v2.6.1 只更新背包的格子（不要蓋掉倉庫的）
      const it = P.inv[+d.dataset.i];
      d.className = 'cell icell' + (it ? (isStack(it) ? ' r-stack' + (it.stack === 'cur' && this.curSel === it.key ? ' cursel' : '') : ' r-' + it.rarity) : '') + (this.flaskPick === +d.dataset.i ? ' picked' : '') + (this.sel && this.sel.inv === +d.dataset.i ? ' selected' : '');
      d.innerHTML = this.cellHTML(it);
    });
    document.querySelectorAll('.curbtn').forEach(d => {
      d.querySelector('.cn').textContent = P.cur[d.dataset.cur];
      d.classList.toggle('sel', this.curSel === d.dataset.cur);
    });
    document.body.classList.toggle('crafting', !!this.curSel);
    $('#invCount').textContent = `${P.inv.filter(x => x).length}/60`;
    this.refreshFlasks();
  },
  // 藥劑欄（背包上方 4 格）：背包裡的藥劑點一下放上來；點藥劑欄的藥劑放回背包
  flaskPick: null, // 藥劑欄滿了時，先選背包裡的藥劑，再點要換掉的那一格
  refreshFlasks() {
    const P = G.P, bar = $('#flaskbar'); if (!P || !bar) return;
    const pick = this.flaskPick != null && isFlask(P.inv[this.flaskPick]);
    if (!pick) this.flaskPick = null;
    bar.innerHTML = `<span class="flabel">藥劑欄</span>` + P.flaskSlots.map((it, i) =>
      `<div class="cell fcell ${it ? 'r-' + it.rarity : ''} ${pick ? 'ready' : ''}" data-fi="${i}"><b class="fkey">${i + 1}</b>${it ? this.cellHTML(it) : '<span class="slabel">空</span>'}</div>`).join('')
      + `<span class="fhint">${pick ? '點一格來換上' : '背包裡的藥劑點一下就會放上來；點這裡的藥劑放回背包'}</span>`;
    bar.querySelectorAll('.fcell').forEach(d => {
      const i = +d.dataset.fi;
      d.onclick = e => {
        const it = P.flaskSlots[i];
        if (this.curSel && it) { this.useCurOn(it, e); syncFlasks(false); return; }
        if (this.flaskPick != null) { equipFlask(this.flaskPick, i); this.flaskPick = null; }
        else unequipFlask(i);
        this.hideTip(); this.refreshInv(); saveGame();
      };
      d.onmouseenter = e => { const it = P.flaskSlots[i]; if (it) this.showTip(flaskTipHTML(it, { hint: this.curSel ? `點擊使用${CURRENCY[this.curSel].name}` : `按 ${i + 1} 喝　左鍵：放回背包` }), e.clientX, e.clientY); };
      d.onmousemove = e => this.moveTip(e); d.onmouseleave = () => this.hideTip();
    });
  },
  useCurOn(it, e) {
    const k = this.curSel;
    const err = applyCurrency(k, it);
    if (err) { this.msg(err, '#ff9a9a'); return; }
    G.P.cur[k]--; qc(G.P).curUsed++;
    this.msg(`使用了${CURRENCY[k].name} → ${it.name}`, CURRENCY[k].color);
    if (!e.shiftKey || G.P.cur[k] <= 0) this.curSel = null;
    onBuildChanged();
    this.showTip(itemTipHTML(it), e.clientX, e.clientY);
  },
  // v1.2：左鍵＝選取並打開比較面板；右鍵＝裝備（商人開著＝賣出、倉庫開著＝存入）
  sel: null, // { inv: 背包格 } 或 { eq: 裝備部位 }
  clickInv(i, e) {
    const P = G.P, it = P.inv[i];
    if (!it) return this.select(null);
    if (isStack(it)) {   // v2.6.1：點通貨＝選起來準備使用；其他堆疊打開對應的介面
      if (it.stack === 'cur') { if (CURRENCY[it.key].scroll) return usePortalScroll(); this.curSel = this.curSel === it.key ? null : it.key; this.select(null); return this.refreshInv(); }
      if (it.stack === 'sup') return this.toggle('skills', true);
      return this.toggle('craft', true);
    }
    if (this.curSel) return this.useCurOn(it, e);
    if (e.ctrlKey || this.salvMode) return this.salvage(i); // 手機沒有 Ctrl：用「分解」開關（只有商人開著時有效）
    this.select(this.sel && this.sel.inv === i ? null : { inv: i });
  },
  rightInv(i, e) {
    if (this.curSel) { this.curSel = null; return this.refreshInv(); } // 右鍵取消通貨
    const it = G.P.inv[i]; if (!it) return;
    if (isStack(it)) { if (this.open.stash) this.depositItem(i); else if (this.open.shop) this.msg('通貨、寶石不用賣，拿去用或存倉庫', '#d8c8a0'); return; }   // v2.6.1
    if (this.open.shop) this.sellItem(i);
    else if (this.open.stash) this.depositItem(i);
    else { this.equipFromInv(i); this.select(null); if (G.P.inv[i]) this.hoverInv(i, e); else this.hideTip(); return; }   // v2.7.6 裝備後不開左邊的比較面板；換下來的那件還在格子裡，就直接顯示它和身上那件的對照
    this.hideTip(); this.select(null);
  },
  clickEquip(slot, e) {
    const it = G.P.equip[slot];
    if (!it) return this.select(null);
    if (this.curSel) return this.useCurOn(it, e);
    this.select(this.sel && this.sel.eq === slot ? null : { eq: slot });
  },
  select(s) { this.sel = s; this.refreshInv(); this.renderCompare(); },
  // 比較面板：選取的物品 vs 目前穿的，以及換上之後數值怎麼變
  renderCompare() {
    const box = $('#cmp'), P = G.P;
    const it = !this.sel || !P ? null : this.sel.inv != null ? P.inv[this.sel.inv] : P.equip[this.sel.eq];
    if (!it || !this.open.inv) { this.sel = it && this.open.inv ? this.sel : null; box.classList.remove('show'); return; }
    let h = `<div class="ph">${this.sel.eq ? '穿著的裝備' : '物品比較'}<span class="x" id="cmpX">✕</span></div><div class="cmpcols">`;
    const btns = [];
    if (this.sel.eq) {
      h += `<div class="tipcol">${itemTipHTML(it)}</div></div>`;
      btns.push(['unequip', '卸下（右鍵）']);
    } else if (isFlask(it)) {
      h += `<div class="tipcol">${flaskTipHTML(it)}</div></div>`;
      btns.push(['equip', '放上藥劑欄（右鍵）']);
    } else {
      const b = BASE_BY_ID[it.base];
      let slot = b.slot; if (slot === 'ring') slot = !P.equip.ring1 ? 'ring1' : !P.equip.ring2 ? 'ring2' : 'ring1';
      const cur = P.equip[slot];
      h += `<div class="tipcol"><div class="tip-cmp">選取的物品</div>${itemTipHTML(it)}</div>`;
      h += cur ? `<div class="tipcol"><div class="tip-cmp">目前裝備（會被換下來）</div>${itemTipHTML(cur)}</div>` : `<div class="tipcol cmpempty"><div class="tip-cmp">目前裝備</div>這個部位是空的</div>`;
      h += '</div>';
      const err = canEquip(it);
      h += err ? `<div class="cmpdiff c-bad">無法裝備：${err}</div>` : this.diffHTML(it, slot);
      if (!err) btns.push(['equip', '裝備（右鍵）']);
    }
    if (this.sel.inv != null) {
      if (this.open.shop) btns.push(['sell', `賣出（${this.valueText(sellValue(it))}）`]);
      if (this.open.stash) btns.push(['stash', '放進倉庫']);
      if (this.open.shop) btns.push(['salvage', '分解成碎片']);
    }
    h += `<div class="cmpbtns">${btns.map(([k, t]) => `<button data-a="${k}">${t}</button>`).join('')}</div>`;
    box.innerHTML = h; box.classList.add('show');
    $('#cmpX').onclick = () => this.select(null);
    box.querySelectorAll('[data-a]').forEach(bt => bt.onclick = () => {
      const s = this.sel; if (!s) return;
      const a = bt.dataset.a;
      if (a === 'unequip') this.unequip(s.eq);
      else if (a === 'equip') { const slot = this.equipFromInv(s.inv); if (slot) return this.select({ eq: slot }); }
      else if (a === 'sell') this.sellItem(s.inv);
      else if (a === 'stash') this.depositItem(s.inv);
      else if (a === 'salvage') this.salvage(s.inv);
      this.select(null);
    });
  },
  // 換上這件之後，主要數值的變化（綠色變好、紅色變差）
  diffHTML(it, slot) {
    const P = G.P, S1 = G.S, old = P.equip[slot];
    P.equip[slot] = it; const S2 = computeStats(P); P.equip[slot] = old;
    const rows = [['生命', 'maxLife'], ['能量護盾', 'maxES'], ['魔力', 'maxMana'], ['護甲', 'armourT'], ['閃避', 'evasionT'],
      ['火焰抗性', 'resF', '%'], ['冰冷抗性', 'resC', '%'], ['閃電抗性', 'resL', '%'], ['毒素抗性', 'resX', '%'],
      ['力量', 'str'], ['敏捷', 'dex'], ['智慧', 'int'], ['移動速度', 'moveSpeed'], ['每秒回血', 'lifeRegenPS'], ['生命偷取', 'leech', '%'],
      ['格擋', 'blockChance', '%'], ['法術壓制', 'suppress', '%']];
    const out = [];
    const sid = P.skills[0];
    if (sid) {
      const n = linkSlots(P.lvl), a = calcSkill(S1, sid, P.lvl, P.links[0].slice(0, n)).dps, b = calcSkill(S2, sid, P.lvl, P.links[0].slice(0, n)).dps;
      out.push(this.diffRow(`${SKILLS[sid].name} 每秒傷害`, a, b));
    }
    for (const [name, k, u] of rows) { const a = +S1[k] || 0, b = +S2[k] || 0; if (Math.abs(b - a) >= 0.5) out.push(this.diffRow(name, a, b, u)); }
    return `<div class="cmpdiff"><div class="tip-cmp">換上之後</div>${out.join('') || '<div class="dfrow">沒有明顯變化</div>'}</div>`;
  },
  diffRow(name, a, b, u = '') {
    const d = b - a, f = v => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + u;
    const cls = Math.abs(d) < 0.05 ? '' : d > 0 ? 'up' : 'down';
    return `<div class="dfrow ${cls}"><span>${name}</span><span>${f(a)} → <b>${f(b)}</b> ${cls ? (d > 0 ? '▲' : '▼') + f(Math.abs(d)) : ''}</span></div>`;
  },
  unequip(slot) {
    const P = G.P, it = P.equip[slot];
    if (!it) return;
    const idx = P.inv.indexOf(null);
    if (idx < 0) return this.msg('背包已滿');
    P.inv[idx] = it; P.equip[slot] = null;
    if (slot === 'weapon' && P.equip.offhand && BASE_BY_ID[P.equip.offhand.base].cls === 'quiver') {
      const j = P.inv.indexOf(null); if (j >= 0) { P.inv[j] = P.equip.offhand; P.equip.offhand = null; }
    }
    this.hideTip(); onBuildChanged();
  },
  equipFromInv(i, forceSlot) {
    if (isStack(G.P.inv[i])) return null;   // v2.6.1 堆疊物品不能裝備   // v2.6 forceSlot：拖曳到指定的格子（戒指左／右）
    if (isFlask(G.P.inv[i])) {
      if (equipFlask(i)) { this.flaskPick = null; this.refreshInv(); return; }
      this.flaskPick = this.flaskPick === i ? null : i; // 藥劑欄滿了：選好再點要換的格子
      if (this.flaskPick != null) this.msg('藥劑欄滿了：點上方藥劑欄的一格來替換', '#e8d8a0');
      return this.refreshInv();
    }
    const P = G.P, it = P.inv[i], base = BASE_BY_ID[it.base];
    const err = canEquip(it);
    if (err) return this.msg(`無法裝備：${err}`, '#ff9a9a');
    let slot = base.slot;
    if (slot === "ring") slot = forceSlot === "ring1" || forceSlot === "ring2" ? forceSlot : !P.equip.ring1 ? "ring1" : !P.equip.ring2 ? "ring2" : "ring1";
    const wBase = P.equip.weapon ? BASE_BY_ID[P.equip.weapon.base] : null;
    if (slot === 'offhand') {
      if (base.cls === 'quiver' && (!wBase || wBase.cls !== 'bow')) return this.msg('箭袋只能搭配弓', '#ff9a9a');
      if (wBase && wBase.hands === 2 && !(wBase.cls === 'bow' && base.cls === 'quiver')) return this.msg('雙手武器不能再拿副手（弓只能配箭袋）', '#ff9a9a');
    }
    P.inv[i] = P.equip[slot] || null; P.equip[slot] = it;
    if (slot === 'weapon' && P.equip.offhand) {
      const off = BASE_BY_ID[P.equip.offhand.base];
      const ok = base.hands === 2 ? (base.cls === 'bow' && off.cls === 'quiver') : off.cls !== 'quiver';
      if (!ok) {
        const j = P.inv.indexOf(null);
        if (j < 0) { P.equip[slot] = P.inv[i]; P.inv[i] = it; return this.msg('背包沒空間放副手', '#ff9a9a'); }
        P.inv[j] = P.equip.offhand; P.equip.offhand = null;
        this.msg('已卸下不相容的副手');
      }
    }
    onBuildChanged();
    Sfx.play("equip"); burst(G.pl.x, G.pl.y - 14, RARITY_COLOR[it.rarity] || "#e8d8a8", 10, 70);   // v2.5.1 裝備音效
    return slot;
  },
  // v1.4：分解只能在商人那裡，分解會得到材料（I–V 級，看裝備基底階級）
  salvage(i, quiet) {
    const P = G.P, it = P.inv[i];
    if (!it) return;
    if (!this.open.shop) return this.msg('要在營地的商人那裡才能分解', '#ff9a9a');
    if (!quiet && it.rarity === 'unique' && quiet !== 'ok') return gameAsk(`確定要分解傳奇物品「${it.name}」嗎？`, () => this.salvage(i, 'ok'));
    if (quiet === 'ok') quiet = false;
    const got = salvageGains(it);
    returnJewels(it);
    P.inv[i] = null;
    if (!quiet) { this.msg(`分解了 ${it.name}${got.length ? '，得到 ' + got.join('、') : '（什麼都沒有）'}`, '#d8c8a0'); this.hideTip(); this.refreshInv(); this.refreshCraft(); }
    return got;
  },
  // 商人那裡的自動整理：依稀有度（白、藍、黃）一次賣掉或分解；不會動到傳奇、藥劑、被選取中的物品
  bulkFilter() { const P = G.P; P.ui.filter = P.ui.filter || { normal: true, magic: true, rare: false }; return P.ui.filter; },
  bulkList() { const f = this.bulkFilter(); return G.P.inv.map((it, i) => it && !isStack(it) && (isFlask(it) ? f.flask : it.rarity !== 'unique' && f[it.rarity]) ? i : -1).filter(i => i >= 0); },
  bulkDo(kind) {
    const list = this.bulkList(), P = G.P;
    if (!list.length) return this.msg('沒有符合條件的裝備', '#d8c8a0');
    gameAsk(`要${kind === 'sell' ? '賣掉' : '分解'}背包裡 ${list.length} 件物品嗎？`, () => this.bulkRun(kind, list));
  },
  bulkRun(kind, list) {
    const P = G.P, sum = {};
    for (const i of list) {
      if (kind === 'sell') { const v = sellValue(P.inv[i]); returnJewels(P.inv[i]); this.addBuyback(P.inv[i], v); P.inv[i] = null; for (const k in v) { P.shards[k] = (P.shards[k] || 0) + v[k]; while (P.shards[k] >= SHARD_NEED) { P.shards[k] -= SHARD_NEED; P.cur[k]++; sum[CURRENCY[k].name] = (sum[CURRENCY[k].name] || 0) + 1; } } }
      else for (const g of this.salvage(i, true) || []) { const m = g.match(/^(.*?)(?: ×(\d+))?$/); sum[m[1]] = (sum[m[1]] || 0) + (+m[2] || 1); }
    }
    this.msg(`${kind === 'sell' ? '賣掉' : '分解'}了 ${list.length} 件${Object.keys(sum).length ? '，得到 ' + Object.keys(sum).map(k => `${k} ×${sum[k]}`).join('、') : ''}`, '#e8d8a0');
    this.select(null); this.hideTip(); this.refreshInv(); this.refreshShop(); this.refreshCraft(); saveGame();
  },
  sortInv() {
    const order = { weapon: 0, offhand: 1, helmet: 2, body: 3, gloves: 4, boots: 5, amulet: 6, ring: 7, belt: 8 };
    const rr = { unique: 0, rare: 1, magic: 2, normal: 3 };
    const so = it => isStack(it) ? 10 + ['cur', 'sup', 'jewel', 'mat'].indexOf(it.stack) : isFlask(it) ? 9 : order[BASE_BY_ID[it.base].slot]; // 藥劑、通貨、寶石、材料排在後面
    // v2.6.1 先把同一種的堆疊合併
    const P = G.P, merged = Array(60).fill(null);
    for (const it of P.inv) if (it && isStack(it)) stackAdd(merged, it.stack, it.key, it.n);
    const stacks = merged.filter(x => x);
    const items = P.inv.filter(x => x && !isStack(x)).concat(stacks).sort((a, b) => so(a) - so(b) || (isStack(a) || isStack(b) ? String(a.key).localeCompare(String(b.key)) : rr[a.rarity] - rr[b.rarity] || (a.flask && b.flask ? a.type.localeCompare(b.type) || b.tier - a.tier : 0)));
    G.P.inv = items.concat(Array(60 - items.length).fill(null));
    this.refreshInv();
  },
  hoverInv(i, e) {
    const it = G.P.inv[i]; if (!it) return;
    if (isStack(it)) {   // v2.6.1 通貨、材料、寶石
      const hint = this.open.stash ? '右鍵：放進倉庫　拖曳：移動位置' : it.stack === 'cur' ? (CURRENCY[it.key].scroll ? '左鍵：使用' : '左鍵：選起來，再點要改造的裝備（右鍵取消）') : it.stack === 'sup' ? '按 K 到技能頁插上去' : it.stack === 'jewel' ? '按 G 到珠寶工坊鑲嵌、合成' : '按 B 到工坊使用';
      return this.showTip(stackTipHTML(it, hint), e.clientX, e.clientY);
    }
    if (isFlask(it)) {
      const hint = this.curSel ? `點擊使用${CURRENCY[this.curSel].name}` : this.open.shop ? `右鍵：賣給商人，得到 ${this.valueText(sellValue(it))}　Ctrl+左鍵：分解` : this.open.stash ? '右鍵：放進倉庫' : '左鍵：選取　右鍵：放到藥劑欄';
      return this.showTip(flaskTipHTML(it, { hint }), e.clientX, e.clientY);
    }
    const base = BASE_BY_ID[it.base];
    const slot = base.slot === 'ring' ? 'ring1' : base.slot;
    const cur = G.P.equip[slot];
    const hint = this.curSel ? `點擊使用${CURRENCY[this.curSel].name}` : this.open.shop ? `右鍵：賣給商人，得到 ${this.valueText(sellValue(it))}　Ctrl+左鍵：分解成碎片` : this.open.stash ? '右鍵：放進倉庫　左鍵：選取比較' : '左鍵：選取並比較　右鍵：裝備（要分解或賣掉請找商人）';
    let h = `<div class="tipcols"><div class="tipcol">${itemTipHTML(it, { hint })}</div>`;
    if (cur) h += `<div class="tipcol cmp"><div class="tip-cmp">目前裝備</div>${itemTipHTML(cur)}</div>`;
    h += '</div>';
    this.showTip(h, e.clientX, e.clientY);
  },
  hoverEquip(slot, e) {
    const it = G.P.equip[slot]; if (!it) return;
    this.showTip(itemTipHTML(it, { hint: this.curSel ? `點擊使用${CURRENCY[this.curSel].name}` : '左鍵：選取　右鍵：卸下' }), e.clientX, e.clientY);
  },

  // ---------- 角色面板 ----------
  refreshChar() {
    const P = G.P, S = G.S; if (!S) return;
    const mlvl = G.world ? G.world.mlvl : 1;
    const ev = Math.min(75, S.evasionT / (S.evasionT + 200 + 40 * Math.max(mlvl, P.lvl)) * 100);
    const drRef = Math.max(10, 6 * Math.pow(1.09, P.lvl));
    const dr = Math.min(90, S.armourT / (S.armourT + 10 * drRef) * 100);
    const row = (k, v, cls = '') => `<div class="crow"><span>${k}</span><b class="${cls}">${v}</b></div>`;
    const res = (v, cap) => `<span class="${v < 0 ? 'c-bad' : ''}">${Math.min(v, 75)}%${v > 75 ? `（${v}%）` : ''}</span>`;
    let h = `<div class="csec">${P.name}　·　${CLASSES[P.cls].name}　·　等級 ${P.lvl}</div>`;
    h += row('經驗', `${P.xp} / ${xpNeed(P.lvl)}`) + row('擊殺數', P.kills) + row('最高可開地圖', `第 ${P.maxTier} 層`);
    h += `<div class="csec">屬性<span class="thint">　力量：生命＋堅忍　敏捷：閃避　智慧：魔力＋能量護盾</span></div>` + row('力量', `${S.str}（＋${Math.round(S.str * 0.5)} 生命、＋${S.str} 堅忍值）`, 'c-str') + row('敏捷', `${S.dex}（＋${S.dex * 2} 閃避值、閃避 +${Math.round(S.dex / 5)}%）`, 'c-dex') + row('智慧', `${S.int}（＋${Math.round(S.int * 0.5)} 魔力、＋${Math.round(S.int * 0.4)} 能量護盾、能量護盾 +${Math.round(S.int / 5)}%）`, 'c-int');
    h += `<div class="cnote">力量：每 2 點 +1 生命、每 5 點 +1% 近戰物理傷害　敏捷：每 5 點 +1% 閃避　智慧：每 2 點 +1 魔力、每 10 點 +1% 能量護盾　｜　每升一級：主屬性 +1.5、其他 +0.5</div>`;
    h += `<div class="csec">防禦</div>`;
    h += row('最大生命', `${S.maxLife}（每秒回復 ${S.lifeRegenPS.toFixed(1)}）`) + row('最大魔力', S.flags.noMana ? '0（血之魔法）' : `${S.maxMana}（每秒 ${S.manaRegenPS.toFixed(1)}）`);
    h += row('能量護盾', S.maxES) + row('堅忍值', `${S.poiseT}（被打到會扣，扣光就硬直 ${STUN_TIME} 秒；1.5 秒沒被打會回滿）`) + row('護甲', `${S.armourT}（約減免 ${dr.toFixed(0)}% 物理）`) + row('閃避值', `${S.evasionT}（約 ${ev.toFixed(0)}% 閃避攻擊）`);
    if (S.blockChance) h += row('格擋率', `${S.blockChance}%`);
    if (S.life_regen_inc) h += row('生命回復速度', `+${S.life_regen_inc}%（基礎每秒 ${BASE_LIFE_REGEN}% 生命）`);
    if (S.dodge) h += row('閃避機率', `${Math.min(DODGE_CAP, S.dodge)}%（直接躲掉攻擊${S.dodge > DODGE_CAP ? `，上限 ${DODGE_CAP}%` : ''}）`);
    if (S.cdr) h += row('冷卻回復速度', `+${Math.min(CDR_CAP, S.cdr)}%${S.cdr > CDR_CAP ? `（上限 ${CDR_CAP}%，超出 ${S.cdr - CDR_CAP}%）` : ''}`);
    if (S.leech || S.mleech) h += row('偷取', `生命 ${S.leech || 0}%　魔力 ${S.mleech || 0}%（每次擊中最多回 8%）`);
    h += row('火焰抗性', res(S.res_fire)) + row('冰冷抗性', res(S.res_cold)) + row('閃電抗性', res(S.res_light)) + row('毒素抗性', res(S.res_chaos));
    h += row('法術壓制', `${S.suppress}%（法術傷害減半的機率）`) + row('法術格擋', `${S.spellBlock}%`);
    h += `<div class="cnote">法術攻擊（火焰小鬼、冰霜精魂、首領的預警招式）無法被閃避和一般格擋擋下，要靠抗性、法術壓制、法術格擋。</div>`;
    h += row('移動速度', `${S.move_inc >= 0 ? '+' : ''}${S.move_inc}%`);
    h += `<div class="csec">武器</div>`;
    const w = S.weapon;
    h += row('物理傷害', `${w.phys[0]}–${w.phys[1]}`) + row('每秒攻擊', (w.aps * (1 + S.aspd_inc / 100)).toFixed(2));
    h += `<div class="csec">技能傷害</div>`;
    P.skills.forEach((sid, i) => {
      if (!sid) return;
      const sk = SKILLS[sid], c = G.slotCalc[i];
      if (sid === 'blink') return;
      if (sk.type === 'summon') { const mc = c.minion; h += row(`${sk.name}`, `每隻 ${mc.dmg[0].toFixed(0)}–${mc.dmg[1].toFixed(0)} 傷害、${mc.life} 生命、上限 ${mc.max}`); return; }
      const err = skillUsable(S, sid);
      h += row(sk.name, err ? `<span class="c-bad">${err}</span>` : `平均一擊 ${c.avg.toFixed(0)}　DPS ${c.dps.toFixed(0)}　暴擊 ${c.crit.toFixed(1)}%`);
    });
    h += `<div class="csec">異常狀態（全部技能共用的加成）</div>`;
    h += row('點燃／冰凍／感電', `${S.ignite_ch}%／${S.freeze_ch}%／${S.shock_ch}%`) + row('中毒／流血', `${S.poison_ch}%／${S.bleed_ch}%`) + row('持續傷害', `+${S.dot_inc}%`);
    h += `<div class="cnote">技能本身還有內建機率，按 K 看每個技能的實際機率。點燃要火焰傷害、冰凍要冰冷、感電要閃電、中毒要物理或毒素、流血要物理。</div>`;
    const flags = Object.keys(S.flags);
    if (flags.length) { h += `<div class="csec">特殊效果</div>`; flags.forEach(f => h += `<div class="crow c-unique">${STAT_TEXT[f]()}</div>`); }
    $('#charBody').innerHTML = h;
  },

  // ---------- 技能面板 ----------
  skillInfo(sid, c) {
    const sk = SKILLS[sid];
    if (sk.type === 'summon') { const mc = c.minion; return `骷髏 ${mc.dmg[0].toFixed(0)}–${mc.dmg[1].toFixed(0)} 傷害，${mc.life} 生命，上限 ${mc.max} 隻`; }
    if (sk.type === 'blink') return `冷卻 ${effCd(G.S, sk).toFixed(1)} 秒`;
    if (sk.type === 'buff') return `攻擊與施法速度 +25%，持續 ${sk.dur} 秒，冷卻 ${effCd(G.S, sk).toFixed(1)} 秒`;
    const parts = [];
    for (const k in c.d) if (c.d[k][1] > 0.5) parts.push(`${ELEM_NAME[k]} ${c.d[k][0].toFixed(0)}–${c.d[k][1].toFixed(0)}`);
    let info = `${parts.join('、') || '無傷害'}　<b>${sk.type === 'zone' ? '每片每秒' : 'DPS'} ${c.dps.toFixed(0)}</b>　${(1 / c.time).toFixed(2)} 次/秒`;
    const ails = AIL_KEYS.filter(a => c.ail[a] > 0).map(a => `<span style="color:${AILMENTS[a].color}" title="${AILMENTS[a].desc}">${AILMENTS[a].name} ${Math.round(c.ail[a])}%</span>`);
    if (ails.length) info += '　' + ails.join(' ');
    if (sk.type === 'proj') info += `　投射物 ${Math.max(1, c.count)}${c.count > 1 ? '（同一個目標：第 2 發起每發 35%）' : ''}`;
    if (c.crit) info += `　暴擊 ${c.crit.toFixed(1)}%`;
    if (sk.cd) info += `　<span style="color:#ffcf70">冷卻 ${effCd(G.S, sk).toFixed(1)} 秒</span>`;
    if (c.echo) info += '　（回響：實際傷害約 ×2）';
    return info;
  },
  // ---------- 技能頁（v1.5）：把寶石拖到裝備上才會生效 ----------
  // 五件裝備各有一個技能孔（大格）＋輔助寶石孔（小格，隨等級增加）
  // 武器＝左鍵、胸甲＝右鍵、頭盔＝Q、手套＝E、鞋子＝R
  GEM_GEAR: [['weapon', '武器', '左鍵'], ['body', '胸甲', '右鍵'], ['helmet', '頭盔', 'Q'], ['gloves', '手套', 'E'], ['boots', '鞋子', 'R']],
  gemPick: null,
  refreshSkills() {
    const P = G.P, S = G.S; if (!S) return;
    const n = linkSlots(P.lvl);
    let h = '';
    this.GEM_GEAR.forEach(([slot, gname, key], i) => {
      const sid = P.skills[i], c = G.slotCalc[i], gear = P.equip[slot];
      const err = sid ? skillUsable(S, sid) : null;
      let socks = '';
      for (let k = 0; k < LINK_LEVELS.length; k++) {
        if (k >= n) { socks += `<span class="gsock lock" title="${LINK_LEVELS[k]} 級解鎖">${LINK_LEVELS[k]}</span>`; continue; }
        const cur = P.links[i][k];
        const fits = cur && supportFits(cur, sid);
        socks += cur
          ? `<span class="gsock sup ${fits ? '' : 'bad'}" data-drop="sup:${i}:${k}" data-gem="link:${i}:${k}" style="--c:${SUPPORTS[cur].color}"><img src="${supportIconURL(cur, 48)}"></span>`
          : `<span class="gsock sup empty" data-drop="sup:${i}:${k}"></span>`;
      }
      const gearIcon = gear ? (isFlask(gear) ? '' : `<img src="${itemIconURL(BASE_BY_ID[gear.base], 64)}">`) : `<span class="gslabel">${gname}</span>`;
      h += `<div class="gearrow ${sid ? '' : 'empty'}">
        <div class="gearbox ${gear ? 'r-' + gear.rarity : ''}" title="${gear ? gear.name : '沒有裝備（寶石還是可以放）'}">${gearIcon}<b class="gkey">${key}</b></div>
        <span class="gsock skill ${sid ? (err ? 'bad' : '') : 'empty'}" data-drop="skill:${i}" ${sid ? `data-gem="slot:${i}"` : ''}>${sid ? `<img src="${skillIconURL(sid, 64)}">` : '技能'}</span>
        <div class="gsocks">${socks}</div>${sid && typeof EvoCodex !== 'undefined' ? EvoCodex.cell(sid) : ''}
        <div class="ginfo">${sid ? this.gemLine(sid, err) : `<span class="thint">${gname}：把技能寶石拖到大格</span>`}</div></div>`;
    });
    $('#skillSlots').innerHTML = h;
    // 寶石袋：還沒放上去的技能寶石，和輔助寶石（數字＝還有幾顆）
    const used = new Set(P.skills.filter(x => x));
    const skillIds = Object.keys(SKILLS).filter(s => hasSkillGem(P, s) && !used.has(s)).sort((a, b) => SKILLS[a].lvl - SKILLS[b].lvl);
    const supIds = Object.keys(SUPPORTS).filter(id => supHave(id) > 0);   // v2.16.3 背包＋倉庫
    let g = `<div class="bagrow" data-drop="bag"><span class="bagt">技能寶石</span>${skillIds.map(s => {
      const bad = skillUsable(S, s);
      return `<span class="bgem ${bad ? 'bad' : ''} ${this.gemPick === 'skill:' + s ? 'picked' : ''}" data-gem="skill:${s}"><img src="${skillIconURL(s, 64)}"><i>${SKILLS[s].name}<br><span class="mpct">Lv ${gemLv(s)}</span></i>${gemCanLevel(s) ? '<b class="gup">↑</b>' : ''}</span>`;
    }).join('') || '<span class="thint">（都放在裝備上了）</span>'}</div>`;
    // v2.17 預設只顯示「推薦」的（gems4.js 的 supBagFilter），按「顯示全部」切換
    const supShow = supBagFilter(supIds, this.gemPick), supHid = supIds.length - supShow.length, all = supShowAll();
    g += `<div class="bagrow" data-drop="bag"><span class="bagt">輔助寶石<small>${all ? '全部' : '推薦的'}</small><button class="supall ${all ? 'on' : ''}" data-supall="1">${all ? '只看推薦' : `顯示全部${supHid ? `（還有 ${supHid}）` : ''}`}</button></span>${supShow.map(id => `<span class="bgem ${this.gemPick === 'sup:' + id ? 'picked' : ''}" data-gem="sup:${id}"><img src="${supportIconURL(id, 48)}"><i>${SUPPORTS[id].name}<br><span class="mpct">耗魔 ×${+SUPPORTS[id].cost.toFixed(2)}</span></i><b>${supHave(id)}</b></span>`).join('')
      || (supIds.length ? `<span class="thint">（沒有適合技能欄上技能的寶石，按「顯示全部」看其他 ${supHid} 種）</span>` : '<span class="thint">（沒有多的輔助寶石。打怪會掉，首領一定掉 2 顆）</span>')}</div>`;
    $('#gemBag').innerHTML = g;
    $('#gemBag').querySelectorAll('[data-supall]').forEach(b => b.onclick = e => { e.stopPropagation(); supSetShowAll(!supShowAll()); this.refreshSkills(); });
    // 拖放、提示、右鍵拿下
    $('#skills').querySelectorAll('[data-gem]').forEach(el => {
      el.onpointerdown = e => { if (e.button === 2) return; e.preventDefault(); this.gemDragStart(e, el.dataset.gem, el.querySelector('img') && el.querySelector('img').src); };
      el.onmouseenter = e => this.showTip(this.gemTip(el.dataset.gem), e.clientX, e.clientY);
      el.onmousemove = e => this.moveTip(e); el.onmouseleave = () => this.hideTip();
      el.oncontextmenu = e => { e.preventDefault(); this.gemRemove(el.dataset.gem); };
    });
    $('#skills').querySelectorAll('[data-drop]').forEach(el => el.classList.toggle('canDrop', !!this.gemPick && this.gemAccepts(this.gemPick, el.dataset.drop)));
    $('#skills').querySelectorAll('[data-gemup]').forEach(b => b.onclick = e => { e.stopPropagation(); gemLevelUp(b.dataset.gemup); this.refreshSkills(); });
    $('#skills').querySelectorAll('[data-gemlock]').forEach(b => b.onclick = e => { e.stopPropagation(); gemSetLock(b.dataset.gemlock, !gemLocked(b.dataset.gemlock)); this.refreshSkills(); });
    Hook.emit('skillsPanel', $('#skills'));   // 技能頁畫好之後（進化圖鑑 evocodex.js）
  },
  // v2.4 技能欄右邊那一行：名字、寶石等級、經驗條、升級按鈕
  gemLine(sid, err) {
    const sk = SKILLS[sid], d = gemData(sid), need = gemXpNeed(sid, d.lv), full = d.lv < GEM_MAX && d.xp >= need;
    const lack = full ? gemReqLack(sid, d.lv + 1) : null;
    const pct = d.lv >= GEM_MAX ? 100 : Math.floor(d.xp / need * 100);
    const locked = gemLocked(sid);   // v2.17 經驗滿了自動升級；鎖住等級的要自己按
    let h = `<b style="color:${sk.color}">${sk.name}</b>　<span class="glv">Lv ${d.lv}${d.lv >= GEM_MAX ? '（最高）' : ''}</span>`;
    if (d.lv < GEM_MAX) h += `<button class="glock ${locked ? 'on' : ''}" data-gemlock="${sid}" title="${locked ? '現在不會自動升級（升級會更耗魔）。點一下改回自動升級' : '經驗滿了會自動升級。點一下鎖住等級（升級會更耗魔）'}">${locked ? '🔒 鎖住等級' : '自動升級'}</button>`;
    h += `<div class="gxp"><i style="width:${pct}%"></i></div>`;
    if (err) h += `<span class="c-bad">${err}</span>`;
    else if (full && !lack) h += `<button class="gupbtn" data-gemup="${sid}">升級到 ${d.lv + 1} 級</button>`;
    else if (full) h += `<span class="c-bad">升級${lack}</span>`;
    else h += `<span class="thint">${d.lv >= GEM_MAX ? '已經最高等級' : `經驗 ${pct}%　滑鼠移到寶石上看詳細數字`}</span>`;
    return h;
  },
  // 寶石說明
  gemTip(p) {
    const P = G.P, S = G.S, [kind, a, b] = p.split(':');
    const sid = kind === 'skill' ? a : kind === 'slot' ? P.skills[+a] : null;
    if (sid) {
      const sk = SKILLS[sid], c = kind === 'slot' ? G.slotCalc[+a] : G.calc[sid], err = skillUsable(S, sid);
      const gl = gemLv(sid), reqA = gemReqAttr(sid, gl), reqL = gemReqLvl(sid, gl);
      let nextH = '';
      if (gl < GEM_MAX) { // 下一級的即時預覽：暫時把等級 +1 算一次，再改回來
        const d = gemData(sid); d.lv++; const nc = kind === 'slot' ? calcSkill(S, sid, P.lvl, P.links[+a].slice(0, linkSlots(P.lvl))) : calcSkill(S, sid, P.lvl, []); d.lv--;
        const lackN = gemReqLack(sid, gl + 1), up = (x, y) => y > x * 1.001 ? `<span class="c-good">▲</span>` : y < x * 0.999 ? `<span class="c-good">▼</span>` : '';
        nextH = `<div class="tip-sep"></div><div class="tip-sub">下一級（${gl + 1}）預覽${lackN ? `　<span class="c-bad">${lackN}</span>` : ''}</div>
          <div class="tip-mod" style="color:#c8f0c8">每秒傷害 ${nc.dps.toFixed(0)} ${up(c.dps, nc.dps)}　耗魔 ${nc.cost}${sk.cd ? `　冷卻 ${(sk.cd * gemBonus(sid, gl + 1).cd / (1 + Math.min(CDR_CAP, S.cdr || 0) / 100)).toFixed(2)} 秒` : ''}</div>
          <div class="tip-mod" style="color:#a8c8a8">${gemBonusText(sid, gl + 1)}</div>`;
      }
      return `<div class="tip-name" style="color:${sk.color}"><img class="skico" src="${skillIconURL(sid, 64)}">${sk.name}</div><div class="tip-sub">技能寶石 · <b style="color:#ffe6a0">Lv ${gl}</b> · ${sk.tags.map(t => TAG_NAME[t]).join('・')} · 魔力 ${c.cost}</div>
        <div class="tip-req">需求：<span class="${P.lvl < reqL ? 'c-bad' : ''}">等級 ${reqL}</span>，${Object.keys(reqA).map(x => `<span class="${S[x] < reqA[x] ? 'c-bad' : ''}">${ATTR_ZH[x]} ${reqA[x]}</span>`).join('，')}</div>
        <div class="tip-mod" style="color:#d8ccb4">${sk.desc}</div><div class="tip-mod ${err ? 'c-bad' : ''}" style="color:${err ? '' : '#8fd0ff'}">${err || this.skillInfo(sid, c)}</div>
        ${gl > 1 ? `<div class="tip-mod" style="color:#a89878">寶石等級加成：${gemBonusText(sid, gl)}</div>` : ''}${nextH}
        <div class="tip-hint">${kind === 'slot' ? '拖到別的裝備可以換位置；右鍵或拖回寶石袋＝拿下來' : '拖到裝備的大格（技能孔）就會生效'}</div>`;
    }
    const id = kind === 'sup' ? a : P.links[+a][+b];
    const sp = SUPPORTS[id]; if (!sp) return '';
    const fit = Object.keys(SKILLS).filter(s => supportFits(id, s)).map(s => SKILLS[s].name).join('、');
    return `<div class="tip-name" style="color:${sp.color}"><img class="skico" src="${supportIconURL(id, 48)}">${sp.name}</div><div class="tip-sub">輔助寶石 · <span style="color:#8fb8ff">${manaEffTxt(sp.cost)}</span>${kind === 'sup' ? ` · 還有 ${supHave(id)} 顆` : ''}</div>
      <div class="tip-mod" style="color:#d8ccb4">${sp.desc}</div><div class="tip-mod" style="color:#a89878">可搭配：${fit}</div>
      <div class="tip-hint">${kind === 'link' ? '右鍵或拖回寶石袋＝拿下來' : '拖到裝備旁邊的小格（輔助孔）'}</div>`;
  },
  gemAccepts(p, drop) {
    const kind = p.split(':')[0], t = drop.split(':')[0];
    if (t === 'bag') return kind === 'slot' || kind === 'link';
    if (t === 'skill') return kind === 'skill' || kind === 'slot' || kind === 'sup' || kind === 'link';
    if (t === 'sup') return kind === 'sup' || kind === 'link';
    return false;
  },
  // 拖曳：滑鼠、手指都能用；沒有拖動（只點一下）就是「選起來」，再點要放的格子
  gemDragStart(e, payload, url) {
    this.hideTip();
    const ghost = document.createElement('img'); ghost.className = 'gemghost'; if (url) ghost.src = url;
    const d = { payload, ghost, sx: e.clientX, sy: e.clientY, moved: false };
    const move = ev => {
      if (!d.moved && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 6) { d.moved = true; document.body.appendChild(ghost); }
      if (d.moved) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; }
    };
    const up = ev => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      ghost.remove();
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const drop = target && target.closest('[data-drop]');
      if (d.moved) { if (drop) this.gemDrop(payload, drop.dataset.drop); this.gemPick = null; this.refreshSkills(); return; }
      // 只點一下：如果手上已經選了寶石、點到的是可以放的格子 → 放進去；不然就選起這顆
      if (this.gemPick && drop && this.gemPick !== payload && this.gemAccepts(this.gemPick, drop.dataset.drop)) { this.gemDrop(this.gemPick, drop.dataset.drop); this.gemPick = null; }
      else this.gemPick = this.gemPick === payload ? null : payload;
      this.refreshSkills();
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  },
  gemDrop(p, drop) {
    const P = G.P, [kind, a, b] = p.split(':'), [t, x, y] = drop.split(':');
    const n = linkSlots(P.lvl);
    if (!this.gemAccepts(p, drop)) return this.msg(kind === 'skill' || kind === 'slot' ? '技能寶石要放在大格（技能孔）' : '輔助寶石要放在小格（輔助孔）', '#ff9a9a');
    if (t === 'bag') return this.gemRemove(p);
    if (kind === 'skill' || kind === 'slot') {
      const sid = kind === 'skill' ? a : P.skills[+a], to = +x;
      if (kind === 'skill') { const lack = gemReqLack(sid, gemLv(sid)); if (lack) { Sfx.play('deny'); return this.msg(`${SKILLS[sid].name}（${gemLv(sid)} 級）裝不上去：${lack}`, '#ff9a9a'); } }   // v2.4
      if (kind === 'slot') { const from = +a; [P.skills[from], P.skills[to]] = [P.skills[to], P.skills[from]]; } // 兩件裝備互換
      else { const j = P.skills.indexOf(sid); if (j >= 0) P.skills[j] = null; P.skills[to] = sid; }
      onBuildChanged(); return;
    }
    // 輔助寶石
    const id = kind === 'sup' ? a : P.links[+a][+b];
    const ti = +x, tk = t === 'sup' ? +y : (() => { for (let k = 0; k < n; k++) if (!P.links[ti][k]) return k; return -1; })();
    if (tk < 0 || tk >= n) return this.msg('這件裝備的輔助孔滿了（等級越高孔越多）', '#ff9a9a');
    if (kind === 'link') { if (+a === ti && +b === tk) return; if (P.links[ti].includes(id) && +a !== ti) return this.msg('同一個技能不能放兩顆一樣的輔助寶石', '#ff9a9a'); this.setSocket(+a, +b, null); }
    else if (P.links[ti].includes(id)) return this.msg('同一個技能不能放兩顆一樣的輔助寶石', '#ff9a9a');
    this.setSocket(ti, tk, id);
  },
  gemRemove(p) {
    const P = G.P, [kind, a, b] = p.split(':');
    if (kind === 'slot') { P.skills[+a] = null; onBuildChanged(); }
    else if (kind === 'link') this.setSocket(+a, +b, null);
    this.hideTip();
  },
  setSocket(i, k, id) {
    const P = G.P;
    const old = P.links[i][k];
    if (old) P.supports[old] = (P.supports[old] || 0) + 1;
    if (id) { if (!supTake(id)) return; P.links[i][k] = id; }   // v2.16.3 先用背包的，不夠從倉庫拿
    else P.links[i][k] = null;
    P.links[i] = P.links[i].map(x => x || null);
    while (P.links[i].length && !P.links[i][P.links[i].length - 1]) P.links[i].pop();
    onBuildChanged();
  },

  refreshTreeHead() {
    const P = G.P;
    const avail = treePointsTotal(P) - treePointsUsed(P);
    $('#treePts').innerHTML = `可用點數 <b class="${avail > 0 ? 'c-good' : ''}">${avail}</b>　已使用 ${treePointsUsed(P)}（等級 ${P.lvl - 1}＋任務 ${P.bonusPts || 0}）　重置點數 <b style="color:#c8b0ff">${respecFree(P) ? `${FREE_RESPEC_LVL} 級前免費` : (P.respec || 0)}</b>`;
  },

  // ---------- 地圖裝置 ----------
  mapDevOpen: false,
  showMapDevice(v) {
    if (v === this.mapDevOpen) return;
    this.mapDevOpen = v;
    $('#mapdev').classList.toggle('show', v);
    if (!v) return;
    this.renderMapDevice();
  },
  renderMapDevice() {
    const P = G.P;
    let h = '';
    if (G.savedMap) h += `<div class="ihint c-bad" style="padding:8px 12px">注意：開新的夢會關閉通往「${G.savedMap.world.name}」的傳送門。</div>`;
    const tierRow = (t) => {
      const th = THEMES[(t - 1) % THEMES.length], boss = BOSSES[th.boss];
      const kills = P.bossKills[th.boss] || 0;
      const excl = UNIQUES.filter(u => u.boss === th.boss).map(u => u.name).join('、');
      // v2.5.4：地圖等級＝怪物等級；能掉哪些基底看「物品等級」（一般怪最高＝地圖等級、黃色精英 +2、首領 +3）
      const L = mapLevel(t), top = L + MON_LVL_BONUS.boss, tiers = BASE_TIER_NAME.filter((n, i) => BASE_TIER_DROP[i] <= top);
      const nextT = BASE_TIER_DROP.find(d => d > top);
      return `<b>第 ${t} 夜　${th.name}</b>　<span class="mgrade">地圖等級 ${L}</span><br><span class="mdesc">掉落基底：${tiers.join("、")}${nextT ? `（下一階要物品等級 ${nextT}）` : ""}<br>看守者：${boss.name}（${boss.desc}）擊敗 ${kills} 次<br>專屬掉落：<span class="c-unique">${excl}</span>　<span class="thint">每次擊敗約 12% 機率掉一件（地圖稀有度越高越容易）</span></span>`;
    };
    // —— 終局：深層夢境 ——
    if (P.maxTier >= DEEP_TIER) {
      h += `<div class="msec">深層夢境（終局）<span class="thint">　詞綴越多越難，掉落越多越好。每次進入後會重新骰詞綴。</span></div>`;
      for (let t = P.maxTier; t >= DEEP_TIER; t--) {
        const ids = deepMods(t), A = aggMods(ids);
        h += `<div class="mrow deep"><div>${tierRow(t)}<div class="mmods">${ids.map(id => `<span>${MAP_MOD_BY_ID[id].name}</span>`).join('')}${depthRules(t).map(id => `<span class="mrule" title="世界規則：這一夜固定有，不能重骰">◆ ${MAP_MOD_BY_ID[id].name}</span>`).join('')}</div>
          <span class="mbonus">掉落數量 +${A.q}%　稀有度 +${A.r}%　碎片掉落 +${A.q}%</span></div>
          <div class="mbtns"><button data-tier="${t}">進入</button>
          <button class="sm" data-reroll="${t}" title="重骰詞綴（2–4 條）">混沌重骰 (${P.cur.chaos})</button>
          <button class="sm" data-add="${t}" ${ids.length >= MAX_MAP_MODS ? 'disabled' : ''} title="多加 1 條詞綴">富豪加一 (${P.cur.regal})</button>
          <button class="sm" data-clear="${t}" title="清空詞綴">重鑄清空 (${P.cur.scour})</button></div></div>`;
      }
      // 夢魘挑戰
      h += `<div class="msec">夢魘挑戰<span class="thint">　深層夢境的精英怪與看守者會掉碎片；夢魘首領掉鑰匙，三把湊齊挑戰守門人。</span></div>`;
      for (const k in NIGHTMARES) {
        const n = NIGHTMARES[k], b = BOSSES[n.boss], have = P.frags[k] || 0;
        const ex = UNIQUES.filter(u => u.boss === n.boss).map(u => u.name).join('、');
        h += `<div class="mrow"><div><b style="color:${n.color}">${b.name}</b>　怪物等級 ${ARENA_LEVEL[n.boss]}<br><span class="mdesc">${n.frag} ${have}/${FRAG_NEED}　擊敗 ${P.bossKills[n.boss] || 0} 次　掉落：${n.key}、<span class="c-unique">${ex}</span></span></div>
          <button data-arena="${n.boss}" ${have >= FRAG_NEED ? '' : 'disabled'}>挑戰</button></div>`;
      }
      const ok = ['bone', 'ash', 'frost'].every(k => P.keys[k] > 0);
      const kex = UNIQUES.filter(u => u.boss === 'keeper').map(u => u.name).join('、');
      h += `<div class="mrow keeper"><div><b class="c-unique">守門人</b>　怪物等級 ${ARENA_LEVEL.keeper}<br><span class="mdesc">骨之鑰 ${P.keys.bone}　灰之鑰 ${P.keys.ash}　冰之鑰 ${P.keys.frost}（各需 1）　擊敗 ${P.bossKills.keeper || 0} 次<br>掉落：<span class="c-unique">${kex}</span></span></div>
        <button data-arena="keeper" ${ok ? '' : 'disabled'}>挑戰</button></div>`;
    }
    // —— 營地傳送 ——
    const hubs = HUBS.filter(hb => P.hubs[hb.id] || (P.hubsOpen || {})[hb.id]);   // v2.7.10 開放但還沒去過的營地也能傳送
    if (hubs.length > 1) {
      h += `<div class="msec">營地傳送<span class="thint">　每個營地都有商店與倉庫（倉庫內容共用）</span></div><div class="hubrow">`;
      h += hubs.map(hb => `<button data-hub="${hb.id}" ${hb.id === P.hub ? 'disabled' : ''}>${hb.act > 5 ? '終局' : '第' + '一二三四五'[hb.act - 1] + '章'}　${hb.name}${hb.id === P.hub ? '（目前）' : ''}</button>`).join('');
      h += '</div>';
    }
    // —— 主線：五章，每章兩個場景 ——
    h += `<div class="msec">主線夢境</div>`;
    for (let t = Math.min(P.maxTier, ENDING_TIER); t >= 1; t--) {
      if (t % 2 === 0 || t === Math.min(P.maxTier, ENDING_TIER)) { const hb = HUB_BY_ID[hubForTier(t)]; h += `<div class="mchap">第${'一二三四五'[hb.act - 1]}章　營地：${hb.name}</div>`; }
      h += `<div class="mrow"><div>${tierRow(t)}</div><button data-tier="${t}">進入</button></div>`;
    }
    $('#mapList').innerHTML = h;
    const q = s => $('#mapList').querySelectorAll(s);
    q('[data-tier]').forEach(b => b.onclick = () => enterMap(+b.dataset.tier));
    q('[data-hub]').forEach(b => b.onclick = () => travelHub(b.dataset.hub));
    q('[data-arena]').forEach(b => b.onclick = () => enterArena(b.dataset.arena));
    const spend = (k, f) => { if (P.cur[k] <= 0) return this.msg(`沒有${CURRENCY[k].name}`, '#ff9a9a'); P.cur[k]--; f(); this.renderMapDevice(); this.refreshInv(); saveGame(); };
    q('[data-reroll]').forEach(b => b.onclick = () => spend('chaos', () => { P.deepMods[+b.dataset.reroll] = rollMapMods(rint(2, 4)); }));
    q('[data-add]').forEach(b => b.onclick = () => {
      const t = +b.dataset.add, ids = deepMods(t);
      const pool = MAP_MODS.filter(m => !m.rule).map(m => m.id).filter(id => !ids.includes(id));
      if (ids.length >= MAX_MAP_MODS || !pool.length) return;
      spend('regal', () => ids.push(pick(pool)));
    });
    q('[data-clear]').forEach(b => b.onclick = () => spend('scour', () => { P.deepMods[+b.dataset.clear] = []; }));
  },

  // ---------- 死亡 ----------
  showDeath(loss, keep) {
    $('#deathInfo').textContent = `失去 ${loss} 點經驗值。裝備都還在。` + (keep ? '你在這張地圖開過傳送門，可以從城鎮的藍色傳送門回去。' : '這張地圖沒開過傳送門，進度消失了。');
    $('#death').classList.add('show');
  },
  hideDeath() { $('#death').classList.remove('show'); goTown(!!G.savedMap); },

  // ---------- 城鎮 NPC ----------
  // F：跟附近的東西互動（人物、夢之門、傳送門）
  interact() {
    const a = G.nearAct; if (!a) return false;
    if (a.kind === 'npc') return this.talkNPC();
    if (a.kind === 'device') return this.showMapDevice(!this.mapDevOpen);
    if (a.kind === 'resume') return resumeMap();
    if (a.kind === 'exit') return leaveMapToTown();
  },
  talkNPC() {
    const n = G.nearNPC; if (!n) return false;
    const P = G.P;
    // 有新的人物故事可以聽：先說故事、給禮物；沒有的話就打開這個人物的功能
    const ch = nextNpcChapter(n.id, P);
    if (ch) {
      P.story.seen[ch.id] = true;
      this.queueStory(ch.id);
      const g = ch.gift;
      if (g) {
        if (g.cur) { P.cur[g.cur] += g.n; this.msg(`${n.name}給了你 ${CURRENCY[g.cur].name} ×${g.n}`, '#ffd780'); }
        if (g.jewel) { P.jewels[g.jewel] = (P.jewels[g.jewel] || 0) + 1; this.msg(`${n.name}給了你 ${jewelName(g.jewel)}`, '#ffd780'); }
      }
      saveGame(); this.refresh();
      return true;
    }
    if (Talk.run(n.id, n)) return true;   // 帶話任務、各人的分工（core.js 的 Talk）
    this.toggle(n.panel, true);
    this.msg(`${n.name}：${pick(NPC_LINES[n.id])}`, '#e8d8a0');
    return true;
  },
  closeTownPanels() { for (const k of ['shop', 'stash', 'gemshop']) if (this.open[k]) this.toggle(k, false); },
  autoCloseTownPanels(w) {
    for (const n of w.npcs) if (['shop', 'stash', 'gemshop'].includes(n.panel) && this.open[n.panel] && dist(G.pl, n) > 140) this.toggle(n.panel, false);
  },
  valueText(v) { return Object.keys(v).map(k => `${CURRENCY[k].name}${k === 'portal' ? '' : '碎片'} ×${v[k]}`).join('、'); },
  priceText(p) { return Object.keys(p).map(k => `${CURRENCY[k].name} ×${p[k]}`).join(' ＋ '); },

  // ---------- 商人（用通貨交易，沒有金錢） ----------
  refreshShop(regen) {
    if (!G.P) return;
    if (regen || !G.shop) G.shop = genShop();
    if (!this.open.shop) return;
    const P = G.P;
    let h = `<div class="ihint">背包裡的物品<b>右鍵賣出</b>，換成通貨碎片（湊滿 ${SHARD_NEED} 片自動變成 1 顆）；<b>Ctrl＋左鍵分解</b>：武器得到磨石碎片、防具得到護貝劑碎片（1～8 片，越稀有、等級越高越多；湊滿 10 片變 1 個）。每次從地圖回來，商人會換一批貨。</div>`;
    // 自動整理：勾選要處理的稀有度，一次賣掉或分解
    const f = this.bulkFilter(), n = this.bulkList().length;
    h += `<div class="bulk"><span class="bulkt">自動整理</span>${[['normal', '白裝', '#d8d8d8'], ['magic', '藍裝', '#8890ff'], ['rare', '黃裝', '#ffff77'], ['flask', '藥劑', '#e08080']].map(([k, t, c]) =>
      `<label class="bchip ${f[k] ? 'on' : ''}" style="--c:${c}"><input type="checkbox" data-bf="${k}" ${f[k] ? 'checked' : ''}>${t}</label>`).join('')}
      <button data-bulk="sell" ${n ? '' : 'disabled'}>全部賣出（${n}）</button><button data-bulk="salvage" ${n ? '' : 'disabled'}>全部分解（${n}）</button>
      <div class="bulkh">不會動到傳奇、藥劑欄上的藥劑；鑲在上面的珠寶會自動退回。</div></div>`;
    h += '<div class="shards">' + Object.keys(CURRENCY).filter(k => P.shards[k]).map(k => `<span style="color:${CURRENCY[k].color}">${CURRENCY[k].name}碎片 ${P.shards[k]}/${SHARD_NEED}</span>`).join('') + '</div>';
    h += '<div class="shopgrid">';
    G.shop.forEach((e, i) => {
      if (e.sold) return;
      let icon, name, color;
      if (e.item) { icon = isFlask(e.item) ? flaskIconURL(e.item.type, 64) : itemIconURL(BASE_BY_ID[e.item.base], 64); name = e.item.name; color = RARITY_COLOR[e.item.rarity]; }
      else if (e.gem) { icon = supportIconURL(e.gem, 64); name = `輔助寶石：${SUPPORTS[e.gem].name}`; color = '#3fd8b8'; }
      else if (e.respec) { icon = flaskIconURL('respec', 64, '#b890ff'); name = `遺忘藥水（重置點數 +${e.respec}）`; color = '#c8b0ff'; }
      else { icon = currencyIconURL(e.cur, 64); name = `${CURRENCY[e.cur].name} ×${e.qty}`; color = CURRENCY[e.cur].color; }
      const ok = canPay(e.price);
      h += `<div class="shopitem" data-i="${i}"><img src="${icon}"><div class="sname" style="color:${color}">${name}</div><div class="sprice ${ok ? '' : 'c-bad'}">${this.priceText(e.price)}</div><button data-buy="${i}" ${ok ? '' : 'disabled'}>購買</button></div>`;
    });
    h += '</div>';
    // 買回：最近賣掉的 10 件
    const bb = P.buyback || [];
    h += `<div class="csec2">買回（最近賣掉的 ${bb.length}/10 件）</div>`;
    h += bb.length ? '<div class="bbgrid">' + bb.map((e, j) => {
      const it = e.item, icon = isFlask(it) ? flaskIconURL(it.type, 64) : itemIconURL(BASE_BY_ID[it.base], 64), ok = canPay(e.price);
      return `<div class="bbitem" data-bb="${j}"><img src="${icon}"><div class="bbn c-${it.rarity}">${it.name}</div><div class="sprice ${ok ? '' : 'c-bad'}">${this.priceText(e.price)}</div><button data-bbuy="${j}" ${ok ? '' : 'disabled'}>買回</button></div>`;
    }).join('') + '</div>' : '<div class="ihint">還沒有賣過東西。賣掉的東西會先放在這裡，買錯了可以買回來（離開遊戲也會保留）。</div>';
    $('#shopBody').innerHTML = h;
    $('#shopBody').querySelectorAll('[data-bbuy]').forEach(b => b.onclick = () => this.buyBack(+b.dataset.bbuy));
    $('#shopBody').querySelectorAll('.bbitem').forEach(d => {
      const e = bb[+d.dataset.bb];
      d.onmouseenter = ev => this.showTip(itemTipHTML(e.item, { hint: `買回要 ${this.priceText(e.price)}` }), ev.clientX, ev.clientY);
      d.onmousemove = ev => this.moveTip(ev); d.onmouseleave = () => this.hideTip();
    });
    $('#shopBody').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => this.buy(+b.dataset.buy));
    $('#shopBody').querySelectorAll('[data-bf]').forEach(c => c.onchange = () => { this.bulkFilter()[c.dataset.bf] = c.checked; this.refreshShop(); });
    $('#shopBody').querySelectorAll('[data-bulk]').forEach(b => b.onclick = () => this.bulkDo(b.dataset.bulk));
    $('#shopBody').querySelectorAll('.shopitem').forEach(d => {
      const e = G.shop[+d.dataset.i];
      d.onmouseenter = ev => {
        if (e.item) this.showTip(itemTipHTML(e.item), ev.clientX, ev.clientY);
        else if (e.gem) this.showTip(`<div class="tip-name" style="color:#3fd8b8">${SUPPORTS[e.gem].name}</div><div class="tip-sub">輔助寶石</div><div class="tip-mod">${SUPPORTS[e.gem].desc}</div>`, ev.clientX, ev.clientY);
        else if (e.respec) this.showTip(`<div class="tip-name" style="color:#c8b0ff">遺忘藥水</div><div class="tip-mod">喝下去會忘掉一些天賦：重置點數 +${e.respec}。可以一直買。</div>`, ev.clientX, ev.clientY);
        else this.showTip(`<div class="tip-name">${CURRENCY[e.cur].name}</div><div class="tip-mod">${CURRENCY[e.cur].desc}</div>`, ev.clientX, ev.clientY);
      };
      d.onmousemove = ev => this.moveTip(ev); d.onmouseleave = () => this.hideTip();
    });
  },
  buy(i) {
    const P = G.P, e = G.shop[i];
    if (!canPay(e.price)) return this.msg('通貨不夠', '#ff9a9a');
    if (e.item) {
      const j = P.inv.indexOf(null); if (j < 0) return this.msg('背包已滿', '#ff9a9a');
      P.inv[j] = e.item; e.sold = true;
    } else if (e.gem) { P.supports[e.gem] = (P.supports[e.gem] || 0) + 1; e.sold = true; }
    else if (e.respec) P.respec = (P.respec || 0) + e.respec;
    else P.cur[e.cur] += e.qty;
    for (const k in e.price) P.cur[k] -= e.price[k];
    this.msg(`買了 ${e.item ? e.item.name : e.gem ? SUPPORTS[e.gem].name : e.respec ? '遺忘藥水' : CURRENCY[e.cur].name}`, '#e8d8a0');
    this.hideTip(); this.refreshShop(); this.refreshInv(); this.refreshSkills(); saveGame();
  },
  // 買回：最近賣掉的 10 件（存在角色身上）；價格＝賣出時拿到的碎片，換算成整顆通貨（無條件進位）
  addBuyback(it, v) {
    const P = G.P; P.buyback = P.buyback || [];
    const price = {}; for (const k in v) price[k] = Math.max(1, Math.ceil(v[k] / SHARD_NEED));
    P.buyback.unshift({ item: it, price });
    if (P.buyback.length > 10) P.buyback.length = 10;
  },
  buyBack(j) {
    const P = G.P, e = (P.buyback || [])[j]; if (!e) return;
    if (!canPay(e.price)) return this.msg('通貨不夠', '#ff9a9a');
    const k = P.inv.indexOf(null); if (k < 0) return this.msg('背包已滿', '#ff9a9a');
    for (const c in e.price) P.cur[c] -= e.price[c];
    P.inv[k] = e.item; P.buyback.splice(j, 1);
    this.msg(`買回了 ${e.item.name}`, '#e8d8a0');
    this.hideTip(); this.refreshInv(); this.refreshShop(); saveGame();
  },
  sellItem(i, ok) {
    const P = G.P, it = P.inv[i];
    if (it.rarity === 'unique' && !ok) return gameAsk(`確定要賣掉傳奇物品「${it.name}」嗎？`, () => this.sellItem(i, true));
    const v = sellValue(it);
    returnJewels(it);
    P.inv[i] = null;
    this.addBuyback(it, v);
    const made = [];
    for (const k in v) {
      P.shards[k] = (P.shards[k] || 0) + v[k];
      while (P.shards[k] >= SHARD_NEED) { P.shards[k] -= SHARD_NEED; P.cur[k]++; made.push(CURRENCY[k].name); }
    }
    this.msg(`賣出 ${it.name}，得到 ${this.valueText(v)}${made.length ? `　→ 合成了 ${made.join('、')}！` : ''}`, '#e8d8a0');
    this.hideTip(); this.refreshInv(); this.refreshShop(); saveGame();
  },

  // 工坊（B）的內容在 enhance.js（強化）和 dreamscar.js（夢痕拓印）
  refreshCraft() {},
  // ---------- 技能寶石商人：引路人．塞拉（全章節通關後才出現）----------
  refreshGemShop() {
    if (!this.open.gemshop || !G.P) return;
    const P = G.P;
    let h = `<div class="ihint">所有技能寶石都在這裡。買了就學會（還是要等級和屬性夠才能用）。你持有混沌石 <b style="color:${CURRENCY.chaos.color}">${P.cur.chaos}</b> 顆。</div>`;
    const ids = Object.keys(SKILLS).sort((a, b) => SKILLS[a].lvl - SKILLS[b].lvl);
    for (const sid of ids) {
      const sk = SKILLS[sid], own = hasSkillGem(P, sid), price = skillGemPrice(sid), ok = !own && canPay(price);
      const req = Object.keys(sk.req).map(a => `${ATTR_ZH[a]} ${sk.req[a]}`).join(' ');
      h += `<div class="gsrow ${own ? 'own' : ''}"><img src="${skillIconURL(sid, 64)}"><div class="gsn" style="color:${sk.color}">${sk.name}<small>Lv ${sk.lvl}　${req}　${sk.tags.map(t => TAG_NAME[t]).join('・')}</small></div>`
        + (own ? '<span class="thint">已擁有</span>' : `<span class="sprice ${ok ? '' : 'c-bad'}">${this.priceText(price)}</span><button data-gem="${sid}" ${ok ? '' : 'disabled'}>購買</button>`) + '</div>';
    }
    $('#gemshopBody').innerHTML = h;
    $('#gemshopBody').querySelectorAll('[data-gem]').forEach(b => b.onclick = () => this.buyGem(b.dataset.gem));
    $('#gemshopBody').querySelectorAll('.gsrow').forEach((d, i) => {
      const sid = ids[i];
      d.onmouseenter = e => this.showTip(`<div class="tip-name" style="color:${SKILLS[sid].color}"><img class="skico" src="${skillIconURL(sid, 64)}">${SKILLS[sid].name}</div><div class="tip-mod" style="color:#d8ccb4">${SKILLS[sid].desc}</div>`, e.clientX, e.clientY);
      d.onmousemove = e => this.moveTip(e); d.onmouseleave = () => this.hideTip();
    });
  },
  buyGem(sid) {
    const P = G.P, price = skillGemPrice(sid);
    if (hasSkillGem(P, sid)) return;
    if (!canPay(price)) return this.msg('混沌石不夠', '#ff9a9a');
    for (const k in price) P.cur[k] -= price[k];
    P.skillGems[sid] = true;
    if (typeof shareSkillGem === 'function') shareSkillGem(sid);
    this.msg(`學會新技能：${SKILLS[sid].name}（按 K 裝上）`, '#ffd27a');
    this.hideTip(); this.refreshGemShop(); this.refreshSkills(); this.refreshInv(); saveGame();
  },

  // ---------- 倉庫 ----------
  refreshStash() {
    if (!this.open.stash || !G.stash) return;
    const tab = G.stash.tabs[this.stashTab];
    $('#stashTabs').innerHTML = G.stash.tabs.map((t, i) => `<button class="${i === this.stashTab ? 'on' : ''}" data-t="${i}">分頁 ${i + 1}（${t.filter(x => x).length}）</button>`).join('');
    $('#stashTabs').querySelectorAll('button').forEach(b => b.onclick = () => { this.stashTab = +b.dataset.t; this.refreshStash(); });
    // v2.6.1 一鍵存入
    let bulk = $('#stashBulk');
    if (!bulk) { bulk = document.createElement('div'); bulk.id = 'stashBulk'; $('#stashGrid').before(bulk); }
    bulk.innerHTML = '<span class="bulkt">一鍵存入</span><button data-sb="cur">通貨</button><button data-sb="sup,jewel">寶石、珠寶</button><button data-sb="cur,mat,sup,jewel">全部（裝備以外）</button><span class="thint">倉庫所有角色共用</span>';
    bulk.querySelectorAll('[data-sb]').forEach(b => b.onclick = () => stashAllStacks(b.dataset.sb.split(',')));
    const grid = $('#stashGrid');
    grid.innerHTML = '';
    tab.forEach((it, i) => {
      const d = document.createElement('div');
      d.className = 'cell icell scell' + (it ? (isStack(it) ? ' r-stack' : ' r-' + it.rarity) : '');
      d.innerHTML = this.cellHTML(it);
      d.onclick = () => this.withdraw(i);
      d.onmouseenter = e => { if (it) this.showTip(isStack(it) ? stackTipHTML(it, '左鍵：拿回背包') : itemTipHTML(it, { hint: '左鍵：拿回背包' }), e.clientX, e.clientY); };
      d.onmousemove = e => this.moveTip(e); d.onmouseleave = () => this.hideTip();
      grid.appendChild(d);
    });
  },
  depositItem(i) {
    const tab = G.stash.tabs[this.stashTab];
    const st = G.P.inv[i];
    if (isStack(st)) {   // v2.6.1 堆疊：先疊到這個分頁裡同一種的上面
      const left = stackAdd(tab, st.stack, st.key, st.n);
      if (left === st.n) return this.msg('這個倉庫分頁滿了，換一頁', '#ff9a9a');
      if (left > 0) st.n = left; else G.P.inv[i] = null;
      Sfx.play('coin'); this.hideTip(); this.refreshInv(); this.refreshStash(); return saveGame();
    }
    const j = tab.indexOf(null);
    if (j < 0) return this.msg('這個倉庫分頁滿了，換一頁', '#ff9a9a');
    tab[j] = G.P.inv[i]; G.P.inv[i] = null;
    this.hideTip(); this.refreshInv(); this.refreshStash(); saveGame();
  },
  withdraw(i) {
    const tab = G.stash.tabs[this.stashTab], it = tab[i]; if (!it) return;
    if (isStack(it)) {   // v2.6.1 堆疊：能拿多少拿多少
      const left = stackAdd(G.P.inv, it.stack, it.key, it.n);
      if (left === it.n) return this.msg('背包已滿', '#ff9a9a');
      if (left > 0) it.n = left; else tab[i] = null;
      Sfx.play('coin'); this.hideTip(); this.refreshInv(); this.refreshStash(); return saveGame();
    }
    const j = G.P.inv.indexOf(null);
    if (j < 0) return this.msg('背包已滿', '#ff9a9a');
    G.P.inv[j] = it; tab[i] = null;
    this.hideTip(); this.refreshInv(); this.refreshStash(); saveGame();
  },

  // ---------- 選角 ----------
  buildMenu() {
    const ok = storageOK();
    const idx = ok ? loadIndex() : { chars: [] };
    let h = '';
    if (!ok) h += `<div class="warnbox">⚠ 這個瀏覽器目前<b>不允許遊戲存檔</b>（可能是無痕視窗或隱私設定）。<br>可以照常玩，但離開前請按 H →「匯出備份」把進度存成檔案，下次再「匯入備份」。<br>建議改用一般視窗的 Chrome 或 Edge 開啟 index.html。</div>`;
    if (idx.chars.length) {
      h += '<div class="slots">' + idx.chars.slice().sort((a, b) => (b.time || 0) - (a.time || 0)).map(c => `<div class="slot"><img src="${spriteURL(c.cls)}">
        <div class="sinfo"><b style="color:${CLASSES[c.cls].color}">${c.name}</b><br>${CLASSES[c.cls].name}　Lv ${c.lvl}　第 ${c.maxTier} 夜</div>
        <button data-play="${c.id}">繼續</button><button class="del" data-del="${c.id}">刪除</button></div>`).join('') + '</div>';
    }
    h += `<div class="or">— 建立新角色（最多 ${MAX_CHARS} 個，舊角色會保留）—</div><div class="classes">`;
    for (const k in CLASSES) {
      const c = CLASSES[k];
      const port = typeof ArtStyle !== 'undefined' && ArtStyle.img('class_' + k);
      h += `<div class="ccard${port ? ' hasport' : ''}" data-cls="${k}">${port ? `<img class="cport" src="${port}" alt=""><img class="cmini" src="${spriteURL(k)}">` : `<img src="${spriteURL(k)}">`}<div class="cname" style="color:${c.color}">${c.name}</div><div class="cattr">起點：${c.attrName}</div><div class="cdesc">${c.desc}</div>
        <div class="cskills">預設技能：${c.skills.filter(x => x).map(s => SKILLS[s].name).join('、')}</div></div>`;
    }
    h += '</div><div class="nrow">角色名稱 <input id="nameIn" maxlength="10" value="無名者"> <button id="newBtn" disabled>選一個職業</button></div>';
    h += `<div class="nrow"><button id="expBtn">匯出備份</button><button id="impBtn">匯入備份</button><input type="file" id="impFile" accept=".json,application/json" style="display:none"></div>`;
    if (FileSave.supported()) h += `<div class="nrow"><button id="linkBtn">連結存檔檔案（自動存到電腦）</button><button id="readBtn">從存檔檔案讀取</button></div><div class="freenote" id="fileStat"></div>`;
    h += '<div class="freenote">職業只決定「天賦樹的起點」和起始裝備，所有技能所有職業都能用。備份檔只會存在你的電腦（下載資料夾），不會上傳到網路。</div>';
    $('#menuBody').innerHTML = h;
    let chosen = null;
    document.querySelectorAll('.ccard').forEach(c => c.onclick = () => {
      document.querySelectorAll('.ccard').forEach(x => x.classList.remove('sel'));
      c.classList.add('sel'); chosen = c.dataset.cls;
      $('#newBtn').disabled = false; $('#newBtn').textContent = `以${CLASSES[chosen].name}開始`;
    });
    $('#newBtn').onclick = () => {
      if (!chosen) return;
      if (idx.chars.length >= MAX_CHARS) return alert(`角色已滿 ${MAX_CHARS} 個，請先刪除一個。`);
      FileSave.ensure();
      startGame(newCharacter(chosen, $('#nameIn').value.trim() || '無名者'));
    };
    document.querySelectorAll('[data-play]').forEach(b => b.onclick = () => {
      const P = loadChar(b.dataset.play);
      if (!P) return alert('這個角色的存檔讀不到了。');
      FileSave.ensure(); // 有連結過存檔檔案的話，順便取得寫入權限
      startGame(P, b.dataset.play);
    });
    if (FileSave.supported()) {
      FileSave.getStored().then(h => { const el = $('#fileStat'); if (el) el.textContent = h ? `已連結存檔檔案：${h.name}（開始遊戲時瀏覽器可能會問你是否允許寫入，請按允許）` : '還沒連結存檔檔案。連結後，每次自動存檔都會同時寫進你電腦裡的那個檔案。'; });
      $('#linkBtn').onclick = () => this.linkFile(() => this.buildMenu());
      $('#readBtn').onclick = async () => {
        try {
          if (!(await FileSave.ensure())) return alert('還沒連結存檔檔案，或沒有允許讀取。');
          const n = importBackup(await FileSave.read());
          alert(`從存檔檔案讀取了 ${n} 個角色。`); this.buildMenu();
        } catch (err) { alert('讀取失敗：' + err.message); }
      };
    }
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const c = idx.chars.find(x => x.id === b.dataset.del);
      gameAsk(`確定要刪除「${c.name}」嗎？刪掉就救不回來了（倉庫裡的東西會保留）。`, () => { deleteChar(c.id); this.buildMenu(); });
    });
    $('#expBtn').onclick = () => exportBackup();
    $('#impBtn').onclick = () => $('#impFile').click();
    $('#impFile').onchange = e => this.doImport(e, () => this.buildMenu());
  },
  async linkFile(after) {
    try {
      const name = await FileSave.pick();
      alert(`已連結存檔檔案「${name}」。之後每次自動存檔都會寫進這個檔案。\n建議存在 D:\\POE系統\\遺忘深淵 資料夾裡。`);
      after && after();
    } catch (err) { if (err.name !== 'AbortError') alert('連結失敗：' + err.message); }
  },
  doImport(e, after) {
    const f = e.target.files[0]; if (!f) return;
    gameAsk('匯入會用備份檔裡的角色和倉庫，覆蓋同一個角色的現有進度。確定嗎？', () => this.doImportRun(f, after));
  },
  doImportRun(f, after) {
    const r = new FileReader();
    r.onload = () => {
      try { const n = importBackup(r.result); alert(`匯入完成，共 ${n} 個角色。`); after && after(); }
      catch (err) { alert('匯入失敗：' + err.message); }
    };
    r.readAsText(f, 'utf-8');
  },

  // ---------- 劇情 ----------
  storyQ: [], storyOpen: false,
  queueStory(key) { this.storyQ.push(key); if (!this.storyOpen) this.nextStory(); },
  nextStory() {
    const key = this.storyQ.shift();
    if (!key) { this.storyOpen = false; $('#story').classList.remove('show'); return; }
    this.storyOpen = true; this.storyKey = key; this.storyPage = 0;
    $('#story').classList.add('show');
    this.renderStory();
  },
  storyText(t) { return t.replace(/\{class\}/g, CLASSES[G.P.cls].name).replace(/\{name\}/g, G.P.name); },
  renderStory() {
    const s = STORY[this.storyKey];
    // v2.4 人物故事：左邊顯示人物立繪（關掉新美術或沒有圖時照舊）
    const port = typeof portraitOfStory === 'function' ? portraitOfStory(this.storyKey) : null;
    $('#story').classList.toggle('port', !!port);
    if (port) $('#storyPortrait').src = port;
    $('#storyTitle').textContent = s.title;
    $('#storyText').textContent = this.storyText(s.pages[this.storyPage]);
    $('#storyBtn').textContent = this.storyPage < s.pages.length - 1 ? '繼續 ▸' : '關閉';
    $('#storyPg').textContent = `${this.storyPage + 1} / ${s.pages.length}`;
  },
  storyNext() {
    const s = STORY[this.storyKey];
    if (this.storyPage < s.pages.length - 1) { this.storyPage++; this.renderStory(); }
    else this.nextStory();
  },

  // ---------- 記憶日誌＋怪物圖鑑（J） ----------
  refreshJournal() {
    if (!this.open.journal || !G.P) return;
    const P = G.P;
    let h = '<div class="csec">記憶碎片</div>';
    const got = STORY_ORDER.filter(k => P.story.seen[k]);
    h += got.length ? got.map(k => `<div class="jent"><b>${STORY[k].journal.title}</b><div>${this.storyText(STORY[k].journal.text)}</div><button class="replay" data-k="${k}">重看</button></div>`).join('') : '<div class="skd">還沒有記憶。</div>';
    h += `<div class="jnote">已收集 ${got.length} / ${STORY_ORDER.length}</div>`;
    // 人物故事
    h += '<div class="csec">人物　<span class="thint">在牢房裡靠近他們按 F，頭上有「！」代表有新故事</span></div>';
    for (const npc in NPC_STORIES) {
      const S = NPC_STORIES[npc], seen = S.chapters.filter(c => P.story.seen[c.id]);
      const face = typeof ArtStyle !== 'undefined' && ArtStyle.img(NPC_PORTRAIT[npc]);
      h += `<div class="jperson">${face ? `<img class="jface" src="${face}" alt="">` : ''}<b>${S.who}</b>　<span class="thint">${S.role}　${seen.length} / ${S.chapters.length} 章</span>`;
      h += seen.map(c => `<div class="jent"><b>${c.title}</b><div>${c.text}</div><button class="replay" data-k="${c.id}">重看</button></div>`).join('');
      const nx = S.chapters.find(c => !P.story.seen[c.id]);
      if (nx) h += `<div class="jlock">${nx.when(P) ? '▶ 有新故事，去牢房找' + S.who + '聊聊' : '（下一章：繼續推進主線才會解鎖）'}</div>`;
      h += '</div>';
    }
    h += `<div class="csec">怪物圖鑑　<span class="thint">殺得越多，戰鬥時畫面上方顯示的資訊越多（${LORE_TIERS.join('／')} 隻；看守者 ${LORE_TIERS_BOSS.join('／')} 次）</span></div>`;
    // 依場景分組：每個場景 10 種專屬怪物＋看守者
    const rows = [];
    for (const th of THEMES) {
      const found = th.monsters.filter(k => P.lore[k]).length + (P.lore['boss_' + th.boss] ? 1 : 0);
      rows.push({ head: `${th.name}　<span class="thint">已發現 ${found} / ${th.monsters.length + 1}</span>` });
      th.monsters.forEach(k => rows.push({ key: k, d: MONSTERS[k], tiers: LORE_TIERS }));
      rows.push({ key: 'boss_' + th.boss, d: BOSSES[th.boss], tiers: LORE_TIERS_BOSS, boss: true });
    }
    rows.push({ head: '夢魘與守門人' });
    ['nm_bone', 'nm_ash', 'nm_frost', 'keeper'].forEach(k => rows.push({ key: 'boss_' + k, d: BOSSES[k], tiers: LORE_TIERS_BOSS, boss: true }));
    for (const r of rows) {
      if (r.head) { h += `<div class="lhead">${r.head}</div>`; continue; }
      const n = P.lore[r.key] || 0, lv = r.tiers.filter(t => n >= t).length;
      if (!n) { h += `<div class="lrow dim">？？？　<span class="thint">尚未擊殺</span></div>`; continue; }
      let info = `擊殺 ${n}`;
      if (lv >= 2) info += '　' + Object.keys(RES_NAME).map(e => resTag(e, r.d.res[e])).join(' ');
      if (lv >= 3) info += `　護甲 ${r.d.armour}　<span class="thint">${r.d.note}</span>`;
      const next = r.tiers.find(t => n < t);
      if (next) info += `　<span class="thint">下一階：${next}（${LORE_TEXT[lv]}）</span>`;
      h += `<div class="lrow"><b class="${r.boss ? 'c-unique' : ''}">${r.d.name}</b>　${info}</div>`;
    }
    $('#journalBody').innerHTML = JournalTabs.wrap(h);   // 上方的分頁（反應圖鑑、第一百三十八本……，見 core.js）
    $('#journalBody').querySelectorAll('.replay').forEach(b => b.onclick = () => this.queueStory(b.dataset.k));
    JournalTabs.bind($('#journalBody'), () => this.refreshJournal());
  },
};
function resTag(e, v) {
  const cls = v < 0 ? 'weak' : v >= 50 ? 'immune' : '';
  return `<span class="restag ${cls}">${RES_NAME[e]} ${v > 0 ? '+' : ''}${v}%</span>`;
}
const TAG_NAME = { attack: '攻擊', spell: '法術', melee: '近戰', projectile: '投射物', area: '範圍', minion: '召喚', movement: '位移', buff: '增益' };
function spriteURL(name) { return getSprite(name, 5).r.toDataURL(); }
