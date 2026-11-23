// =============================================================
//  v2.20 顯示全部掉落物（掉落篩選的「暫時看全部」）
//  ・玩家看到：被掉落篩選篩掉的東西（設定→掉落），地上只剩一個暗暗的小圖示，沒有名稱，F／點擊／自動撿取都撿不到
//    電腦：按住 Alt＝全部顯示名稱、可以撿；放開就恢復
//    手機：地上有被篩掉的東西時，畫面上方、小地圖左邊出現一顆「顯示全部」小按鈕（48×48），點一下切換；地上沒有被篩掉的東西時按鈕消失、自動關掉
//  ・規則本身在 settings.js（lootHidden、lootFiltered、lootCanPick）；畫圖在 render.js；撿取在 dodge.js（F）、game.js（自動撿取）
//  ・資料：G.lootAllOn（手機按鈕的開關，不存檔）
// =============================================================
const lootShowAll = () => !!(G.lootAllOn || (typeof input !== 'undefined' && input.keys && (input.keys.AltLeft || input.keys.AltRight)));
// Alt 單獨按下時，有些瀏覽器會跳到功能表列：遊戲中攔下來
window.addEventListener('keydown', e => { if (e.key === 'Alt' && typeof G !== 'undefined' && G.state === 'play') e.preventDefault(); });
(() => {
  const st = document.createElement('style');
  st.textContent = `#lootAllBtn { position:fixed; z-index:6; min-width:48px; min-height:48px; padding:4px 8px; border-radius:10px; font-size:13px; line-height:1.2;
    background:rgba(12,10,8,.78); color:#e8dcc0; border:1px solid #8a6a3a; display:none; touch-action:manipulation; }
  #lootAllBtn.on { background:rgba(80,60,20,.9); color:#ffe6a0; border-color:#f2d692; }`;
  document.head.appendChild(st);
})();
setInterval(() => {
  if (typeof IS_TOUCH === 'undefined' || !IS_TOUCH || typeof G === 'undefined') return;
  let b = document.getElementById('lootAllBtn');
  const any = G.state === 'play' && G.P && G.pl && G.loot && G.loot.some(l => !l.gone && lootFiltered(l));
  if (!any) G.lootAllOn = false;
  const on = any && !(typeof UI !== 'undefined' && UI.paused && UI.paused());
  if (!b) { if (!on) return; b = document.createElement('button'); b.id = 'lootAllBtn'; document.body.appendChild(b);
    b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); G.lootAllOn = !G.lootAllOn; b._t = null; });
    b.addEventListener('click', e => e.stopPropagation()); }
  b.style.display = on ? 'block' : 'none'; if (!on) return;
  const t = G.lootAllOn ? '顯示全部：開' : '顯示全部'; if (b._t !== t) { b.textContent = t; b._t = t; b.classList.toggle('on', !!G.lootAllOn); }
  // 位置：畫面上方、小地圖的左邊（不擋左下的移動搖桿、右下的技能鈕、左上的任務框）
  const cv = document.getElementById('game'), r = cv && cv.getBoundingClientRect(), mb = G.mmBox && G.mmBox.wd === G.world && CFG.minimap !== 'off' ? G.mmBox : null;
  if (r && r.width) { const sc = r.width / VW; b.style.right = Math.round(innerWidth - r.left - (mb ? mb.x : VW * 0.75) * sc + 8) + 'px'; b.style.top = Math.round(r.top + (mb ? mb.y : 8) * sc) + 'px'; }
}, 200);
