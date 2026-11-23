// =============================================================
//  v2.16.3 寶石共用：不用一直把寶石帶在身上
//  ・輔助寶石：技能頁的寶石袋＝背包裡的＋倉庫「輔助寶石」分頁裡的，插上去時先用背包的，不夠才從倉庫拿（在地圖裡也可以）
//  ・技能寶石：任何一個角色學會的技能寶石，記在倉庫裡（全帳號共用），每個角色都能直接裝上
//    舊角色：讀檔時把自己會的技能寶石登記到倉庫
//  資料：G.stash.spec.sup（倉庫的輔助寶石數量）、G.stash.skillGems（全帳號會的技能寶石）
// =============================================================
const stashSup = () => (G.stash && G.stash.spec && G.stash.spec.sup) || {};
function supHave(id) { const P = G.P; return ((P && P.supports[id]) || 0) + (stashSup()[id] || 0); }
function supTake(id) {
  const P = G.P;
  if ((P.supports[id] || 0) > 0) { P.supports[id]--; return true; }
  const s = stashSup(); if ((s[id] || 0) > 0) { s[id]--; return true; }
  return false;
}
function shareSkillGem(sid) { if (!G.stash || !sid) return; G.stash.skillGems = G.stash.skillGems || {}; G.stash.skillGems[sid] = true; }
Hook.on('start', P => { if (!P || !G.stash) return; G.stash.skillGems = G.stash.skillGems || {}; for (const s in P.skillGems || {}) if (P.skillGems[s]) G.stash.skillGems[s] = true; });
