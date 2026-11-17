// =============================================================
//  v2.12.1 順暢度保險
//  ・遊戲自己量每一格花多久。連續 4 秒平均低於約 33 張／秒（每格超過 30 毫秒），就自動關掉一個吃效能的畫面特效，
//    順序：立體光影 → 彩色光源 → 立體障礙物；關一個之後再觀察 4 秒，還是不順才關下一個
//  ・關掉時左下角會說一聲；設定 → 介面可以隨時再打開（打開後如果又不順，會再關）
//  ・分頁在背景、剛切回來、剛進地圖的那幾格不算
//  資料：只改 CFG.depth3d／colorLight／stackProps（跟設定頁的開關是同一個）
// =============================================================
const PerfGuard = { ema: 16, bad: 0, last: 0, steps: [['depth3d', '立體光影'], ['colorLight', '彩色光源'], ['stackProps', '立體障礙物']] };
Hook.on('enterMap', () => { PerfGuard.bad = 0; PerfGuard.last = 0; });
Hook.on('update', () => {
  const now = performance.now(), gap = now - PerfGuard.last; PerfGuard.last = now;
  if (document.hidden || gap <= 0 || gap > 400) return;            // 背景分頁、卡一大下（存檔、切視窗）不算
  PerfGuard.ema += (gap - PerfGuard.ema) * 0.05;
  PerfGuard.bad = PerfGuard.ema > 30 ? PerfGuard.bad + gap : Math.max(0, PerfGuard.bad - gap * 2);
  if (PerfGuard.bad < 4000) return;
  PerfGuard.bad = 0; PerfGuard.ema = 16;
  const s = PerfGuard.steps.find(([k]) => CFG[k] !== false); if (!s) return;
  CFG[s[0]] = false; saveCfg();
  if (s[0] === 'stackProps' && G.world && G.world.canvas) try { buildWorldCanvas(G.world); } catch (e) { }
  UI.msg(`畫面跑不太順，已自動關掉「${s[1]}」（設定 → 介面可以再打開）`, '#ffd36a');
});
