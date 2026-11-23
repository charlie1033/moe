// =============================================================
//  v2.7 新手引導：新角色的前 10 分鐘，一步一步提示（做到了自動跳下一步）
//  ・只有新建的角色會出現；舊角色不會跑出來
//  ・可以按「略過」關掉，或在 Esc → 設定 → 介面 裡關掉
//  v2.18.2 改版（試玩回報：手機上引導框擋住角色、門和按鈕；教的東西跟實際狀況對不上）
//  ・位置：左上「任務」框的正下方，一個小框；手機上字小一點。整個框不攔點擊（點得穿），只有「收起／略過」兩個小鈕能點
//  ・可以收起成一顆小膠囊「引導 3/9 ▸」，點一下再打開（收起狀態存在設定 CFG.tutMini）
//  ・開著任何面板、對話框、三選一、劇情、手機功能選單、死亡畫面時先藏起來；手機上出現互動鈕時也先藏起來
//  ・每一步看實際狀況才出現（when），不是照固定順序硬教：
//      背包裡真的有能穿的裝備才教「裝備」；撿到的已經自動穿上了，就改成說「已經自動穿上了」
//      有天賦點數才教天賦；在最後一區（有首領之門）才講守護者和首領；人在營地才講營地的商人
//  ・資料：G.P.tut（0＝進行中、99＝完成或略過）、G.P.tutD（做完的步驟代號）
// =============================================================
if (CFG.tutorial === undefined) CFG.tutorial = true;
CFG_DEFAULT.tutorial = true;
const tutInMap = () => G.world && G.world.kind === 'map';
const tutInTown = () => G.world && G.world.kind === 'town';
const tutCanWear = () => G.P.inv.some(it => it && !isStack(it) && !isFlask(it) && !canEquip(it));   // 背包裡有能穿的裝備
const tutEqKey = () => Object.keys(G.P.equip).map(k => k + ':' + (G.P.equip[k] ? (G.P.equip[k].uid || G.P.equip[k].name) : '')).join('|');
const TUT_STEPS = [
  { id: 'move', when: () => true, text: () => ctlText('{move}移動，走進營地的傳送門（{interact}）就能進入夢境'), done: T => tutInMap() },
  { id: 'attack', when: () => tutInMap(), text: () => ctlText('{lmb}攻擊{aimNote}，{rmb}是第二個技能。先打倒 5 隻怪物'), done: T => G.P.kills - T.k0 >= 5 },
  { id: 'pickup', when: D => tutInMap() && D.attack, text: () => ctlText('珠寶、通貨走過去會自動撿；<b>裝備</b>要走近{pickup}'), done: T => G.P.inv.some(it => it && !isStack(it) && !isFlask(it) && !T.inv0.has(it)) || tutEqKey() !== T.eq0 || T.t > 60 },
  { id: 'equip', when: () => tutCanWear() || tutEqKey() !== Tut.eqBase,
    text: T => T.auto ? ctlText('你剛撿到的裝備已經<b>自動穿上</b>了。之後撿到更好的，打開背包（{inv}）換上') : UI.open.inv ? ctlText('背包裡有一件能穿的裝備：{equip}') : ctlText('背包裡有能穿的裝備：打開背包（{inv}），{equip}'),
    start: T => { T.auto = !tutCanWear(); }, panel: 'inv', done: T => T.auto ? T.t > 7 : (tutEqKey() !== T.eq0 || T.pt > 12 || !tutCanWear()) },   // 穿上了、或背包開著看了 12 秒
  { id: 'flask', when: D => tutInMap() && D.attack, text: () => ctlText('生命變少時喝生命藥劑（{f1}）；看到地上的紅色預警，用位移技能閃開（{dodge}，過程中不會受傷）'), done: T => T.t > 14 },
  { id: 'tree', when: () => treePointsTotal(G.P) - treePointsUsed(G.P) > 0, text: () => ctlText('你有天賦點數了：打開天賦樹（{tree}），從你的起點往外點'), done: T => G.P.tree.length > T.tree0 || T.t > 90 },
  { id: 'skills', when: D => D.attack && !tutInMap() || D.flask, text: () => ctlText('技能寶石（{skills}）：撿到的技能寶石在這裡裝上，習慣插在技能旁邊'), panel: 'skills', done: T => UI.open.skills || T.t > 45 },
  { id: 'boss', when: () => tutInMap() && G.world.bossGate && !G.world.bossGate.open,
    text: () => `這是這一夜的最後一區：先打倒<b>精英守護者</b>（畫面邊緣的橘色箭頭會指路），<b>首領之門</b>才會打開，進去打<b>看守者</b>。想回營地就用回營的燈（${ctl('portal')}）`,
    done: T => G.world.bossGate && G.world.bossGate.open || T.t > 30 },
  { id: 'camp', when: () => tutInTown() && G.P.maxTier > 1, text: () => ctlText('營地的商人可以賣裝備、分解出磨石和護貝劑碎片，湊滿就能強化（{craft}）。倉庫可以存東西。不懂就看說明（{help}）。祝你好夢！'), done: T => T.t > 14 },
];
const Tut = {
  T: null, eqBase: '',
  active() { const P = G.P; return !!(P && P.tut != null && P.tut < 99 && CFG.tutorial); },
  begin(P) {
    if (P.tut === undefined) P.tut = (P.lvl <= 2 && P.kills < 5) ? 0 : 99;
    if (P.tut > 0 && P.tut < 99 && !P.tutD) { P.tutD = {}; TUT_STEPS.slice(0, P.tut).forEach(s => P.tutD[s.id] = 1); P.tut = P.tut >= TUT_STEPS.length ? 99 : 0; }   // 舊存檔：照順序的步數 → 做完的代號
    P.tutD = P.tutD || {};
    this.T = null; this.eqBase = tutEqKey(); this.render();
  },
  doneN() { const D = G.P.tutD || {}; return TUT_STEPS.filter(s => D[s.id]).length; },
  // 挑現在要教的那一步：正在教的還符合狀況就繼續；不然找第一個「還沒做完、現在用得上」的
  pick() {
    const P = G.P, D = P.tutD;
    if (this.T && !D[this.T.id]) { const s = TUT_STEPS.find(x => x.id === this.T.id); if (s && s.when(D)) return s; }
    return TUT_STEPS.find(s => !D[s.id] && s.when(D)) || null;
  },
  tick(dt) {
    if (!this.active()) return this.hide();
    const P = G.P, D = P.tutD, s = this.pick();
    if (!s) { this.T = null; return this.render(); }
    if (!this.T || this.T.id !== s.id) { this.T = { id: s.id, t: 0, k0: P.kills, inv0: new Set(P.inv.filter(x => x)), eq0: tutEqKey(), tree0: P.tree.length }; if (s.start) s.start(this.T); }
    this.T.t += dt; this.T.pt = (this.T.pt || 0) + (s.panel && UI.open[s.panel] ? dt : 0);   // pt＝這一步要的面板開了多久
    if (s.done(this.T)) {
      D[s.id] = 1; this.T = null; if (s.id === 'equip') this.eqBase = tutEqKey();
      if (TUT_STEPS.every(x => D[x.id])) { P.tut = 99; UI.msg('新手引導完成！', '#9fff9f'); saveGame(); return this.hide(); }
      Sfx.play('click');
    }
    this.render();
  },
  // 有東西開著就先藏起來（不擋面板、對話框、三選一、劇情、死亡畫面、手機的互動鈕）
  blocked(s) {
    if (G.state !== 'play' || G.dead || UI.storyOpen || (typeof Touch !== 'undefined' && Touch.menuOpen)) return true;
    if (typeof Pause !== 'undefined' && Pause.open) return true;
    for (const p of document.querySelectorAll('.panel.show')) if (!(s.panel && (p.id === s.panel || (s.panel === 'inv' && p.id === 'cmp')))) return true;
    for (const id of ['gask', 'wchoose', 'choicebox', 'death', 'mapdev', 'tjPick', 'evoCodex']) { const e = document.getElementById(id); if (e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden') return true; }
    if (typeof IS_TOUCH !== 'undefined' && IS_TOUCH && G.nearAct) return true;
    return false;
  },
  el() {
    let e = document.getElementById('tutBox');
    if (!e) {
      e = document.createElement('div'); e.id = 'tutBox'; document.body.appendChild(e);
      e.addEventListener('click', ev => {
        const b = ev.target.closest('[data-tb]'); if (!b) return; ev.stopPropagation();
        if (b.dataset.tb === 'skip') { G.P.tut = 99; this.hide(); saveGame(); UI.msg(`已略過新手引導（可以在${byCtl('按 Esc', '右上角 ☰ →「設定・存檔」')} → 設定 → 介面 重新打開）`, '#d8c8a0'); }
        else {
          if (b.dataset.tb === 'open' && this.tall && !CFG.tutMini) { const h = document.querySelector('#questbox .qhead'); if (h) h.click(); }   // 任務框展開太長時是自動收成小膠囊：點開就順便把任務框收起來
          CFG.tutMini = b.dataset.tb === 'mini'; saveCfg(); e._h = null; this.render();
        }
      });
      ['pointerdown', 'touchstart'].forEach(k => e.addEventListener(k, ev => { if (ev.target.closest('[data-tb]')) ev.stopPropagation(); }));
    }
    return e;
  },
  render() {
    if (!this.active()) return this.hide();
    const s = this.T ? TUT_STEPS.find(x => x.id === this.T.id) : null;
    if (!s || this.blocked(s)) return this.hide();
    const e = this.el(), n = this.doneN() + 1, N = TUT_STEPS.length;
    // 位置：任務框的正下方（任務框關掉時貼左上）；任務框展開得很長時，自動收成小膠囊放在任務框右邊（不擋畫面中間）
    const q = document.getElementById('questbox'), r = q && q.getClientRects().length ? q.getBoundingClientRect() : null;
    const has = r && r.height, tall = this.tall = !!(has && r.bottom + 6 > innerHeight * 0.5), mini = CFG.tutMini || (tall && typeof IS_TOUCH !== "undefined" && IS_TOUCH);   // 電腦版畫面大，放任務框右邊照樣整個顯示
    const html = mini
      ? `<span class="tutpill" data-tb="open">引導 ${n}/${N} ▸</span>`
      : `<div class="tuth"><span>新手引導　${n} / ${N}</span><span class="tutbtns"><span data-tb="mini">收起 ▴</span><span data-tb="skip">略過 ✕</span></span></div><div class="tutt">${s.text(this.T)}</div>`;
    if (e._h !== html) { e.innerHTML = html; e._h = html; e.classList.toggle('mini', mini); }
    const top = has ? (tall ? r.top : r.bottom + 6) : 110, left = has ? (tall ? r.right + 8 : r.left) : 12;
    e.style.top = Math.round(top) + 'px'; e.style.left = Math.round(left) + 'px';
    e.style.display = '';
  },
  hide() { const e = document.getElementById('tutBox'); if (e) e.style.display = 'none'; },
};
Hook.on('start', () => { try { Tut.begin(G.P); } catch (e) { console.error('[Tut]', e); } });
Hook.on('update', dt => { if (G.P && !G.paused) Tut.tick(dt); });
// 設定 → 介面：加一個開關
SettingsRows.add('ui', () => `<div class="prow"><div class="pname">新手引導<small>新角色前 10 分鐘的步驟提示；打開時會從頭再教一次</small></div><div class="pctl"><label class="pswitch"><input type="checkbox" data-tut ${Tut.active() ? 'checked' : ''}><span></span></label></div></div>`, root => {
  const c = root.querySelector('[data-tut]');
  if (c) c.onchange = () => { CFG.tutorial = c.checked; if (c.checked && G.P) { G.P.tut = 0; G.P.tutD = {}; CFG.tutMini = false; } saveCfg(); if (G.P) saveGame(); Tut.T = null; Tut.render(); };
});
(() => {
  const st = document.createElement('style');
  st.textContent = `#tutBox { position:fixed; left:12px; top:110px; width:270px; background:rgba(14,10,6,0.82); border:1px solid #8a6a30; border-left:3px solid #c8a060; border-radius:4px; padding:4px 8px 6px; z-index:7; box-shadow:0 2px 10px rgba(0,0,0,.5); pointer-events:none; }
  #tutBox .tuth { font-size:11px; color:#c8a868; display:flex; justify-content:space-between; align-items:center; gap:6px; }
  #tutBox [data-tb] { pointer-events:auto; cursor:pointer; color:#a89878; padding:2px 6px; border-radius:3px; } #tutBox [data-tb]:hover { color:#ffcf70; background:rgba(255,220,140,.08); }
  #tutBox .tutt { font-size:13px; color:#f0e4c8; margin-top:2px; line-height:1.45; } #tutBox b { color:#ffd36a; }
  #tutBox.mini, body.touch #tutBox.mini { width:auto; padding:0; border:none; background:none; box-shadow:none; }
  #tutBox .tutpill { display:inline-block; font-size:12px; color:#ffd36a; background:rgba(14,10,6,0.85); border:1px solid #8a6a30; border-radius:12px; padding:3px 10px; }
  body.touch #tutBox { width:min(210px, 30vw); padding:3px 6px 5px; }
  body.touch #tutBox .tutt { font-size:11px; line-height:1.4; } body.touch #tutBox .tuth { font-size:10px; }
  body.touch #tutBox [data-tb] { padding:4px 7px; }`;
  document.head.appendChild(st);
})();
setInterval(() => { if (typeof UI !== 'undefined' && G.P) Tut.render(); else Tut.hide(); }, 250);   // 遊戲暫停（劇情、面板）時 update 不跑，也要能藏起來、跟著任務框移動
