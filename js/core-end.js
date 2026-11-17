// =============================================================
//  core-end.js — 一定要排在所有功能模組之後、main.js 之前。
//  這裡把幾個全域函式「只包一次」，把事件發給 Hook 的登記者，並決定按 F 要互動的對象。
//  新功能請用 Hook.on／Interact.add（見 core.js），不要自己再包一層。
// =============================================================
(() => {
  const wrapAfter = (name, evt, args) => { const base = window[name]; if (typeof base !== 'function') return; window[name] = function (...a) { const r = base.apply(this, a); Hook.emit(evt, ...(args ? args(a) : a)); return r; }; };
  const _update = update;
  update = function (dt) { _update(dt); Hook.emit('update', dt); Interact.resolve(); };
  const _kill = killMonster; killMonster = function (m) { const was = m.dead; const r = _kill(m); if (!was) Hook.emit('kill', m); return r; };   // 已經死過的怪不重複發
  const _start = startGame; startGame = function (P, id) { const r = _start(P, id); Hook.emit('start', G.P); return r; };
  const _enter = enterMap; enterMap = function (tier) { const r = _enter(tier); Hook.emit('enterMap', tier); return r; };
  const _build = onBuildChanged; onBuildChanged = function (...a) { const r = _build(...a); Hook.emit('build'); return r; };
  const _draw = drawStageExtras; drawStageExtras = function (g) { _draw(g); Hook.emit('drawWorld', g); };
  const _bwc = buildWorldCanvas; buildWorldCanvas = function (w) { const r = _bwc(w); Hook.emit('worldCanvas', w); return r; };   // v2.12.1 地圖底圖畫好之後（要畫進底圖、只畫一次的東西）
  const _hud = drawHUD; drawHUD = function (g) { const r = _hud.apply(this, arguments); Hook.emit('drawHUD', g); return r; };   // v2.13.9 畫面下方介面全部畫完之後（美術外框也畫完了）
  const _cast = castSkill; castSkill = function (sid, c) { const r = _cast.apply(this, arguments); Hook.emit('cast', sid, c); return r; };   // v2.16.2 放完技能之後（技能型傳奇用）
  const _interact = UI.interact.bind(UI);
  UI.interact = function () { return Interact.use() || _interact(); };
})();
