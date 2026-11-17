// =============================================================
//  v2.12.3 手機畫面：看得到完整畫面＋全螢幕
//  ① 畫面不再被切掉：手機瀏覽器的網址列、或外層網頁（線上版是嵌在別的頁面裡）會蓋住遊戲的一部分。
//     這裡量出「實際看得到的範圍」，交給 render.js 的 VISBOX，畫布就縮到那個範圍裡、放在正中間。
//     （用 IntersectionObserver 量；嵌在別人的頁面裡也量得到）
//  ② 全螢幕：瀏覽器規定一定要「手指點一下」才能進全螢幕，不能轉個方向就自動進。所以做成：
//     ・手機橫向時，點畫面的第一下自動進全螢幕並鎖定橫向（設定 → 介面「手機自動全螢幕」可以關）
//     ・手機直向時，「請把手機轉成橫向」那一頁點一下，也會直接進全螢幕＋轉成橫向
//     ・右上角選單旁多一顆「⛶」全螢幕按鈕，可以手動進出
//     ・瀏覽器不給全螢幕（iPhone 的 Safari、有些嵌入頁）就什麼都不做，靠 ① 保證看得到完整畫面
//  資料：CFG.autoFull（false＝關）
// =============================================================
const MobileFit = (() => {
  // —— ① 量看得到的範圍 ——
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;visibility:hidden;z-index:-1';
  let io = null;
  let lastRect = null, busy = false;
  const embedded = (() => { try { return window.top !== window; } catch (e) { return true; } })();
  const TOPPAD = 52;   // 嵌在 Claude App／網頁裡時，上面那排「✕、分享」按鈕會蓋住遊戲最上面一條：手機上先讓出來
  function apply(r) {
    if (r !== undefined) lastRect = r; r = lastRect;
    const W = window.innerWidth, H = window.innerHeight;
    let b = r && r.width > 120 && r.height > 80 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : { x: 0, y: 0, w: W, h: H };
    if (embedded && typeof IS_TOUCH !== 'undefined' && IS_TOUCH && !isFull() && CFG.topPad !== false && b.h < 600 && b.y < TOPPAD) { const d = TOPPAD - b.y; b = { x: b.x, y: b.y + d, w: b.w, h: b.h - d }; }
    const nb = (b.w < W - 2 || b.h < H - 2) ? b : null;
    const same = (!nb && !VISBOX) || (nb && VISBOX && nb.x === VISBOX.x && nb.y === VISBOX.y && nb.w === VISBOX.w && nb.h === VISBOX.h);
    if (!same) { VISBOX = nb; busy = true; try { window.dispatchEvent(new Event('resize')); } finally { busy = false; } }   // 畫布、觸控按鈕、介面一起重排
    setTimeout(vars, 0);
  }
  // 面板、對話框的大小：照看得到的高度縮小（不管是不是觸控裝置，視窗小就縮），太高可以捲
  function vars() {
    const b = VISBOX || { w: window.innerWidth, h: window.innerHeight }, s = document.documentElement.style;
    s.setProperty('--pz', Math.min(1, b.h / 600, b.w / 1000).toFixed(3)); s.setProperty('--vh', b.h + 'px'); s.setProperty('--vmid', ((((VISBOX && VISBOX.y) || 0) + b.h / 2) / window.innerHeight * 100).toFixed(2) + '%');   // 對話框的垂直中心（用百分比，才不會被面板縮放影響）
  }
  function watch() {
    if (!('IntersectionObserver' in window)) return;
    if (io) io.disconnect();
    const th = []; for (let i = 0; i <= 100; i++) th.push(i / 100);
    io = new IntersectionObserver(es => { const e = es[es.length - 1]; if (e) apply(e.isIntersecting ? e.intersectionRect : null); }, { threshold: th });
    io.observe(probe);
  }
  function init() {
    document.body.appendChild(probe); watch();
    window.addEventListener('resize', () => { if (!busy) { watch(); apply(); } });   // 大小變了：重新量一次
    window.addEventListener('orientationchange', () => setTimeout(watch, 300));
    document.addEventListener('fullscreenchange', () => setTimeout(() => { watch(); apply(); }, 100));
    apply();
    const st = document.createElement('style');
    st.textContent = `.panel:not(#tree):not(#menu) { max-height:calc((var(--vh, 100vh) - 16px) / (var(--pz, 1) * var(--uiScale, 1))); }
    #story { max-height:calc((var(--vh, 100vh) - 24px) / (var(--pz, 1) * var(--uiScale, 1))); top:var(--vmid, 50%); overflow-y:auto; }
    #story .stfoot { position:sticky; bottom:-18px; background:linear-gradient(rgba(15,12,18,0), #0f0c12 35%); padding:10px 0 4px; }`;
    document.head.appendChild(st);
  }
  // —— ② 全螢幕 ——
  const el = document.documentElement;
  const can = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !!(el.requestFullscreen || el.webkitRequestFullscreen);
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function enter() {
    if (!can() || isFull()) return;
    try {
      const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => { });
    } catch (e) { }
  }
  function exit() { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { } }
  const toggle = () => isFull() ? exit() : enter();
  const auto = () => typeof IS_TOUCH !== 'undefined' && IS_TOUCH && CFG.autoFull !== false;
  let declined = false;   // 玩家自己退出全螢幕：這次就不再自動進，免得一直跳
  function initFull() {
    if (typeof IS_TOUCH === 'undefined' || !IS_TOUCH) return;
    // 點畫面的第一下（手指放開的那一刻才算「使用者動作」）
    document.addEventListener('pointerup', e => { if (auto() && !declined && !isFull() && !(e.target.closest && e.target.closest('#fullbtn'))) enter(); }, true);
    document.addEventListener('fullscreenchange', () => { if (!isFull()) declined = true; const b = document.getElementById('fullbtn'); if (b) b.classList.toggle('on', isFull()); });
    if (!can()) return;
    const b = document.createElement('div'); b.id = 'fullbtn'; b.textContent = '⛶'; b.title = '全螢幕';
    b.addEventListener('pointerup', e => { e.stopPropagation(); declined = false; toggle(); });
    document.body.appendChild(b);
    const st = document.createElement('style');
    st.textContent = `#fullbtn { position:fixed; right:calc(8px + env(safe-area-inset-right)); bottom:calc(8px + env(safe-area-inset-bottom)); width:34px; height:34px; line-height:34px; text-align:center; font-size:20px; color:#e8d8a8; background:rgba(14,10,6,.7); border:1px solid #8a6a30; border-radius:6px; z-index:90; opacity:.75; user-select:none; }
    #fullbtn.on { opacity:.35; }`;
    document.head.appendChild(st);
    const rot = document.getElementById('rotate');
    if (rot) { rot.insertAdjacentHTML('beforeend', '<span style="font-size:14px;color:#c8b890">或點一下這裡，直接轉成橫向全螢幕</span>'); }
  }
  // isFull 要在上面 apply 之前就能用（function 宣告會提前）
  return { init, initFull, enter, exit, toggle, can, isFull };
})();
MobileFit.init();
Hook.on('start', () => { if (!MobileFit._f) { MobileFit._f = true; MobileFit.initFull(); } });
SettingsRows.add('ui', () => (typeof IS_TOUCH !== 'undefined' && IS_TOUCH && MobileFit.can()) ? `<div class="prow"><div class="pname">手機自動全螢幕<small>橫向時點畫面的第一下自動進全螢幕；關掉後可以用右下角的 ⛶ 按鈕手動切換</small></div><div class="pctl"><label class="pswitch"><input type="checkbox" data-afull ${CFG.autoFull !== false ? 'checked' : ''}><span></span></label></div></div>` : '', root => {
  const c = root.querySelector('[data-afull]');
  if (c) c.onchange = () => { CFG.autoFull = c.checked; saveCfg(); };
});
SettingsRows.add('ui', () => (typeof IS_TOUCH !== 'undefined' && IS_TOUCH) ? `<div class="prow"><div class="pname">手機上方留白<small>在 Claude App 或網頁裡玩的時候，讓出最上面一條，免得被「✕、分享」那排按鈕蓋住；全螢幕時不留</small></div><div class="pctl"><label class="pswitch"><input type="checkbox" data-tpad ${CFG.topPad !== false ? 'checked' : ''}><span></span></label></div></div>` : '', root => {
  const c = root.querySelector('[data-tpad]');
  if (c) c.onchange = () => { CFG.topPad = c.checked; saveCfg(); window.dispatchEvent(new Event('resize')); };
});
