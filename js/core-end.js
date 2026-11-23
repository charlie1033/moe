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
  const _bwc = buildWorldCanvas; buildWorldCanvas = function (w) { if (!w || !w._chunkRect) return worldReset(w); const r = _bwc(w); Hook.emit('worldCanvas', w); return r; };   // v2.12.1 地圖底圖畫好之後；v2.19 分塊畫：平常呼叫只清掉分塊，畫每一塊時（worldChunk）才跑整串包裝和 'worldCanvas'
  const _hud = drawHUD; drawHUD = function (g) { const r = _hud.apply(this, arguments); Hook.emit('drawHUD', g); return r; };   // v2.13.9 畫面下方介面全部畫完之後（美術外框也畫完了）
  const _cast = castSkill; castSkill = function (sid, c) { const r = _cast.apply(this, arguments); Hook.emit('cast', sid, c); return r; };   // v2.16.2 放完技能之後（技能型傳奇用）
  const _cs = computeStats; computeStats = function (P) { const S = _cs(P); Hook.emit('stats', S, P); return S; };   // v2.17 能力算好之後（套裝、首領傳奇、爬塔贈禮用）
  const _dp = damagePlayer; damagePlayer = function (parts, opts) {   // v2.17 被打到、真的掉血或掉夢殼之後（持續傷害不算；夢囈．受傷用）
    const pl = G.pl, b = pl ? pl.life + (pl.es || 0) : 0;
    if (typeof Newbie !== 'undefined') parts = Newbie.cap(parts, opts);   // v2.18.2 第 1～2 夜首領單下傷害上限（newbie.js）
    const r = _dp.call(this, parts, opts), lost = pl ? b - pl.life - (pl.es || 0) : 0;
    if (lost > 0.01 && typeof DeathHelp !== 'undefined') DeathHelp.note(lost, opts || {});   // v2.18.2 記下最後一下是誰、哪一招（deathhelp.js）
    if (pl && !(opts && opts.dot) && lost > 0.5) Hook.emit('hurt', lost, opts || {});
    return r;
  };
  const _interact = UI.interact.bind(UI);
  UI.interact = function () { return Interact.use() || _interact(); };
})();
