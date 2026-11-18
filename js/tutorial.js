// =============================================================
//  v2.7 新手引導：新角色的前 10 分鐘，一步一步提示（做到了自動跳下一步）
//  ・只有新建的角色會出現；舊角色不會跑出來
//  ・可以按「略過教學」關掉，或在 Esc → 設定 → 介面 裡關掉
// =============================================================
if (CFG.tutorial === undefined) CFG.tutorial = true;
CFG_DEFAULT.tutorial = true;
const TUT_STEPS = [
  { text: () => ctlText('{move}移動，走進營地的傳送門（{interact}）就能進入夢境'), done: T => G.world && G.world.kind === 'map' },
  { text: () => ctlText('{lmb}攻擊{aimNote}，{rmb}是第二個技能。先打倒 5 隻怪物'), done: T => G.P.kills - T.k0 >= 5 },
  { text: () => ctlText('珠寶、通貨走過去會自動撿；<b>裝備</b>要走近{pickup}'), done: T => G.P.inv.some(it => it && !isStack(it) && !isFlask(it) && !T.inv0.has(it)) || T.t > 60 },
  { text: () => ctlText('打開背包（{inv}），{equip}'), done: T => UI.open.inv && T.t > 2 },
  { text: () => ctlText('生命變少時喝生命藥劑（{f1}）；看到地上的紅色預警，用職業位移技能閃開（{dodge}：翻滾／瞬移／躍擊／一閃，過程中不會受傷）'), done: T => T.t > 14 },
  { text: () => ctlText('升級會得到天賦點：打開天賦樹（{tree}），從你的起點往外點'), done: T => G.P.tree.length > 1 || T.t > 90 },
  { text: () => ctlText('打開技能寶石（{skills}）：撿到的技能寶石在這裡裝上，輔助寶石插在技能旁邊'), done: T => UI.open.skills || T.t > 60 },
  { text: () => `每張夢境的盡頭有<b>看守者</b>（首領），打倒它就能去下一夜。想回營地就用傳送卷軸（${ctl('portal')}）`, done: T => G.P.maxTier > 1 || T.t > 240 },
  { text: () => ctlText('在營地可以賣裝備、存倉庫；在商人那裡分解裝備會得到磨石、護貝劑碎片，湊滿就能強化裝備（{craft}）。隨時可以看說明（{help}）。祝你好夢！'), done: T => T.t > 14 },
];
const Tut = {
  T: null,
  begin(P) {
    if (P.tut === undefined) P.tut = (P.lvl <= 2 && P.kills < 5) ? 0 : 99;
    this.T = null; this.render();
  },
  tick(dt) {
    const P = G.P; if (!P || P.tut == null || P.tut >= TUT_STEPS.length || !CFG.tutorial) return this.hide();
    if (!this.T || this.T.step !== P.tut) this.T = { step: P.tut, t: 0, k0: P.kills, inv0: new Set(P.inv.filter(x => x)) };
    this.T.t += dt;
    if (TUT_STEPS[P.tut].done(this.T)) { P.tut++; Sfx.play('click'); this.T = null; if (P.tut >= TUT_STEPS.length) { UI.msg('教學完成！', '#9fff9f'); saveGame(); } }
    this.render();
  },
  el() {
    let e = document.getElementById('tutBox');
    if (!e) {
      e = document.createElement('div'); e.id = 'tutBox'; document.body.appendChild(e);
      e.addEventListener('click', ev => { if (ev.target.dataset.skip != null) { G.P.tut = 99; this.hide(); saveGame(); UI.msg('已略過教學（可以在 Esc → 設定 → 介面 重新打開）', '#d8c8a0'); } });
    }
    return e;
  },
  render() {
    const P = G.P; if (!P || P.tut == null || P.tut >= TUT_STEPS.length || !CFG.tutorial || UI.storyOpen || (typeof Touch !== 'undefined' && Touch.menuOpen)) return this.hide();   // 劇情對話開著時先藏起來，不擋插圖
    const e = this.el(), s = P.tut;
    const html = `<div class="tuth">新手引導　${s + 1} / ${TUT_STEPS.length}<span data-skip>略過教學 ✕</span></div><div class="tutt">${TUT_STEPS[s].text()}</div>`;
    if (e._h !== html) { e.innerHTML = html; e._h = html; }
    e.style.display = '';
  },
  hide() { const e = document.getElementById('tutBox'); if (e) e.style.display = 'none'; },
};
Hook.on('start', () => { try { Tut.begin(G.P); } catch (e) { } });
Hook.on('update', dt => { if (G.P && !G.paused) Tut.tick(dt); });
const _backTut = typeof backToTitle === 'function' ? backToTitle : null;
if (_backTut) backToTitle = function () { Tut.hide(); return _backTut.apply(this, arguments); };
// 設定 → 介面：加一個開關
SettingsRows.add('ui', () => `<div class="prow"><div class="pname">新手引導<small>新角色前 10 分鐘的步驟提示；打開時會從頭再教一次</small></div><div class="pctl"><label class="pswitch"><input type="checkbox" data-tut ${CFG.tutorial && G.P && G.P.tut < TUT_STEPS.length ? 'checked' : ''}><span></span></label></div></div>`, root => {
  const c = root.querySelector('[data-tut]');
  if (c) c.onchange = () => { CFG.tutorial = c.checked; if (c.checked && G.P) G.P.tut = 0; saveCfg(); if (G.P) saveGame(); Tut.T = null; Tut.render(); };
});
(() => {
  const st = document.createElement('style');
  st.textContent = `#tutBox { position:fixed; left:50%; top:86px; transform:translateX(-50%); width:min(520px, calc(100vw - 32px)); background:rgba(14,10,6,0.88); border:1px solid #8a6a30; border-radius:6px; padding:6px 10px 8px; z-index:40; box-shadow:0 2px 12px rgba(0,0,0,.6); pointer-events:auto; }
  #tutBox .tuth { font-size:11px; color:#c8a868; display:flex; justify-content:space-between; } #tutBox .tuth span { cursor:pointer; color:#8a7a60; } #tutBox .tuth span:hover { color:#ffcf70; }
  #tutBox .tutt { font-size:14px; color:#f0e4c8; margin-top:3px; line-height:1.5; } #tutBox b { color:#ffd36a; }`;
  document.head.appendChild(st);
})();
setInterval(() => { if (typeof UI !== 'undefined' && (UI.storyOpen || (typeof Touch !== 'undefined' && Touch.menuOpen))) Tut.hide(); else if (G.P) Tut.render(); }, 250);   // 劇情、手機功能選單開著時先藏起來   // 遊戲暫停（劇情）時 update 不跑，也要能藏起來
