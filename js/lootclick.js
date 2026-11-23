// =============================================================
//  v2.20.2 撿東西省力（試玩回報第 5 件：第 9 夜一區掉 41 件，要走 30 趟按 F）
//  玩家看到：
//   ① 電腦版：附近沒有怪時，左鍵點地上的物品名稱就會撿（離得遠會自己走過去；走的途中按移動鍵、攻擊就取消）
//      附近有怪時照舊：左鍵＝攻擊（v2.7.10 拿掉點名稱撿東西，就是怕打架時點到物品沒出手）
//   ② 附近有 2 件以上撿得起來的東西、而且附近沒有怪：畫面下方出現「撿起附近全部（N）」鈕；鍵盤按 G 也可以（設定可改鍵）
//      只撿篩選後看得到的；背包滿了就停
//   ③ 第一次背包滿、或第一次進第 5 夜以後：問一次「要不要把白裝藏起來、藍裝只顯示高階的」，按好就套用（之後在設定 → 掉落篩選可以改）
//  接點：canvas 的 mousedown（capture，比 main.js 先收到）、Hook 'update'、KEY_ACTIONS 多一個「撿起附近全部」
// =============================================================
const LootClick = (() => {
  const CALM_R = 260, NEAR_R = 320;
  let walk = null;
  const calm = () => !G.mons.some(m => !m.dead && !m.hidden && Math.hypot(m.x - G.pl.x, m.y - G.pl.y) < CALM_R);
  const pickable = l => !l.gone && l.t >= 0.25 && (typeof lootCanPick !== 'function' || lootCanPick(l));
  const nearList = () => G.loot.filter(l => pickable(l) && Math.hypot(l.x - G.pl.x, l.y - G.pl.y) < NEAR_R).sort((a, b) => Math.hypot(a.x - G.pl.x, a.y - G.pl.y) - Math.hypot(b.x - G.pl.x, b.y - G.pl.y));
  const bagFull = () => G.P && G.P.inv && G.P.inv.indexOf(null) < 0;
  function pickAll() {
    if (!G.pl || G.dead) return;
    const L = nearList(); let n = 0;
    for (const l of L) {
      if (l.item && bagFull()) { UI.msg('背包滿了，剩下的先留在地上', '#ff9a9a'); break; }
      pickupLoot(l); if (l.gone) n++;
    }
    if (n) Sfx.play('pickup');
  }
  // ① 點名稱撿（只在附近沒怪時；遠的走過去）
  function labelAt(mx, my) { return G.loot.find(l => l.rect && pickable(l) && mx >= l.rect.x - 2 && mx <= l.rect.x + l.rect.w + 2 && my >= l.rect.y - 2 && my <= l.rect.y + l.rect.h + 2); }
  function onDown(e) {
    if (G.state !== 'play' || !G.pl || G.dead || (typeof IS_TOUCH !== 'undefined' && IS_TOUCH) || e.button !== 0 || CFG.swapMouse) return;
    const cv = e.currentTarget, r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width * VW, my = (e.clientY - r.top) / r.height * VH;
    const l = labelAt(mx, my); if (!l || !calm()) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (Math.hypot(l.x - G.pl.x, l.y - G.pl.y) < 60) pickupLoot(l); else walk = { l, t: 0 };
  }
  let bound = false;
  function bind() { const cv = document.getElementById('game'); if (!cv || bound) return; bound = true; cv.addEventListener('mousedown', onDown, true); }
  // ② 撿起附近全部的鈕
  let btn = null;
  function button(n) {
    if (!btn) {
      btn = document.createElement('button'); btn.id = 'pickAllBtn';
      btn.onclick = e => { e.stopPropagation(); pickAll(); };
      document.body.appendChild(btn);
    }
    btn.style.display = n >= 2 ? '' : 'none';
    if (n >= 2) btn.textContent = `撿起附近全部（${n}）${typeof IS_TOUCH !== 'undefined' && IS_TOUCH ? '' : `　${(keyOfAction('pickall') || 'KeyG').replace(/^Key/, '')}`}`;
  }
  // ③ 篩選的建議：只問一次
  function nudge(why) {
    if (CFG.lootNudged || G.showNormal === false || +CFG.lootMinTier > 0) return;
    CFG.lootNudged = true; saveCfg();
    gameAsk(`${why}\n要不要把地上的白色（普通）裝備藏起來、藍色（魔法）只顯示比較高階的？\n藏起來的還是看得到一個小圖示，按住 Alt（手機按「顯示全部」）就能撿。之後在 設定 → 掉落篩選 可以再改。`,
      () => { G.showNormal = CFG.showNormal = false; CFG.lootMinTier = 2; saveCfg(); UI.msg('已套用：白裝藏起來、藍裝只顯示高階的', '#9fe0b0'); },
      { yes: '好，幫我藏', no: '先不用' });
  }
  Hook.on('update', dt => {
    bind();
    const pl = G.pl, w = G.world; if (!pl || !w || !G.P) return;
    // 走過去撿
    if (walk) {
      const l = walk.l, d = Math.hypot(l.x - pl.x, l.y - pl.y);
      const k = input.keys || {}, moving = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(c => k[c]);
      if (l.gone || moving || input.l || input.r || (walk.t += dt) > 4 || !calm() || UI.paused()) walk = null;
      else if (d < 40) { pickupLoot(l); walk = null; }
      else { const sp = ((G.S && G.S.moveSpeed) || 200) * dt; moveEnt(pl, (l.x - pl.x) / d * Math.min(sp, d), (l.y - pl.y) / d * Math.min(sp, d)); }
    }
    const n = w.kind === 'town' || UI.paused() || G.dead || !calm() ? 0 : nearList().length;
    button(n);
    if (w.kind === 'map' && (w.tier || 0) >= 5 && w.tier <= ENDING_TIER && !CFG.lootNudged && !UI.paused() && G.time > 3) nudge('第 5 夜以後地上的東西會越來越多。');
  });
  // 背包第一次滿的時候也問
  Hook.on('update', () => { if (G.P && !CFG.lootNudged && bagFull() && G.world && G.world.kind === 'map' && !UI.paused()) nudge('背包滿了。'); });
  window.addEventListener('keydown', e => {
    if (G.state !== 'play' || !G.P || e.repeat) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.code === (keyOfAction('pickall') || 'KeyG')) { pickAll(); }
  });
  (() => {
    const st = document.createElement('style');
    st.textContent = `#pickAllBtn { position:fixed; left:50%; bottom:118px; transform:translateX(-50%); z-index:40; padding:6px 16px; font-size:14px; border-radius:16px; cursor:pointer;
      background:rgba(24,18,10,.9); color:#ffe6a0; border:1px solid #c8a050; box-shadow:0 2px 10px rgba(0,0,0,.6); }
    body.touch #pickAllBtn { bottom:auto; top:64px; font-size:15px; padding:8px 18px; }`;
    document.head.appendChild(st);
  })();
  return { pickAll, nearList };
})();
KEY_ACTIONS.push({ id: 'pickall', name: '撿起附近全部', def: 'KeyG', grp: '動作' });
