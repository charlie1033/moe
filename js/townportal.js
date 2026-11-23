// =============================================================
//  v2.20 回城要詠唱、開傳送門（取代「按了就直接回營地」）
//  玩家看到：
//   ・按回城（T、右上角回城鈕、手機功能選單、背包裡點傳送卷軸）→ 角色原地詠唱 TP_CAST 秒（1 秒）：
//     腳下一圈藍色光圈在轉、頭上有藍色詠唱條，回城鈕裡也有一條跟著跑的藍色進度、字變成「詠唱」
//   ・詠唱中這些會中斷（卷軸不會扣）：移動或翻滾（離開原地 4 像素）、放技能、被打到真的掉血或掉護盾（持續傷害不算；v2.19.10 起每一夜都會中斷）
//   ・詠唱完成才扣 1 張卷軸，在腳邊（優先往上一步，看得到的空地）打開藍色傳送門（開門時一圈光往外擴、有音效）
//     地圖上同時只有一個回城傳送門：再開一次會把舊的搬到新位置
//   ・走進傳送門或站在旁邊按 F（手機點互動鈕）＝回營地（剛從營地回來時人站在門口，要先走開一步，走回去才會再傳送）；營地右邊的藍色門可以回到同一張地圖、從這個傳送門出來
//   ・看守者倒下後出現的傳送門照舊（按 F），那時候按回城會提醒你走那個門，不會再開一個、不扣卷軸
//   ・沒有卷軸、在營地、死掉時照舊不能用
//  資料：詠唱狀態只在記憶體（不存檔）；傳送門就是原本的 G.world.portal，多一個 tp: true（走進去會傳送），跟著「沒打完的夢」存
//  接點：game.js 的 usePortalScroll 檢查完卷軸後呼叫 TownPortal.begin()；Hook 'update'、'cast'、'hurt'、'drawOver'、'drawWorld'、'light'
// =============================================================
const TP_CAST = 1;          // 詠唱秒數（v2.19.10 從 1.6 改成 1）
const TP_MOVE = 4;          // 離開原地幾像素算移動
const TP_WALKIN = 20;       // 走到離門中心幾像素內就傳送
const TP_ARM = 56;          // 剛從營地回來（人在門口）：要先離開這麼遠，走回來才會傳送
const TownPortal = (() => {
  let ch = null;            // 詠唱中：{ t, x, y, w }
  let armW = null, armed = new WeakSet();
  const btn = () => document.getElementById('portalbtn');
  function showBtn(p) {
    const b = btn(); if (!b) return;
    b.classList.toggle('tpchan', p != null); b.style.setProperty('--tp', p == null ? 0 : p.toFixed(3));
    const n = b.querySelector('.pbname'); if (n) n.textContent = p != null ? '詠唱' : '回城';
  }
  function stop(why) {
    if (!ch) return; ch = null; showBtn(null);
    if (why) { UI.msg(`回城的詠唱被打斷了（${why}）`, '#ffb070'); Sfx.play('deny'); }
  }
  // 腳邊找一格看得到的空地：先往上一步，再左右、往下
  function spot(pl) {
    for (const [dx, dy] of [[0, -46], [46, -10], [-46, -10], [0, 46], [32, 32], [-32, 32]]) {
      const x = pl.x + dx, y = pl.y + dy;
      if (!blockedCircle(x, y, 16) && los(pl.x, pl.y, x, y)) return { x, y };
    }
    return nearestFloor(pl.x, pl.y - 46);
  }
  function open() {
    const w = G.world, pl = G.pl, P = G.P; ch = null; showBtn(null);
    if (!w || w.kind === 'town' || G.dead || (P.cur.portal || 0) <= 0) return;
    P.cur.portal--;
    const p = spot(pl);
    w.portal = { x: p.x, y: p.y, exit: true, tp: true, born: G.time };
    if (dist(pl, p) > TP_WALKIN + 10) armed.add(w.portal);   // 門開在旁邊一步：直接走過去就會傳送
    G.fx.push({ k: 'ring', x: p.x, y: p.y - 6, r: 60, t: 0, dur: 0.5, color: '#7fc8ff', fill: 'rgba(120,190,255,0.15)' });
    burst(p.x, p.y, '#7fc8ff', 28, 180); Sfx.play('portal');
    UI.msg(ctlText('傳送門打開了：走進去，或站在旁邊{interact}回營地', true), '#9fd0ff');
    if (UI.refreshInv) UI.refreshInv();
    saveGame();
  }
  function begin() {
    const w = G.world, pl = G.pl; if (!w || !pl) return;
    if (ch) return;   // 已經在詠唱
    if (w.portal && w.portal.toHub) return UI.msg(ctlText(`看守者倒下後的傳送門已經開著了：走過去{interact}`, true), '#9fd0ff');
    ch = { t: 0, x: pl.x, y: pl.y, w };
    showBtn(0); Sfx.play('click');
  }
  Hook.on('update', dt => {
    const w = G.world, pl = G.pl; if (!w || !pl) return;
    if (armW !== w) { armW = w; armed = new WeakSet(); }   // 換了地圖（含從營地回來）：門口要重新離開一步才會吸人
    if (ch) {
      if (G.dead || ch.w !== w || w.kind === 'town') stop();
      else if (Math.hypot(pl.x - ch.x, pl.y - ch.y) > TP_MOVE) stop('移動了');
      else if (!UI.paused() && (ch.t += dt) >= TP_CAST) open();
      else showBtn(Math.min(1, ch.t / TP_CAST));
    }
    const p = w.portal; if (!p || !p.tp || w.kind === 'town' || G.dead || UI.paused()) return;
    const d = dist(pl, p);
    if (d > TP_ARM) armed.add(p);
    else if (d < TP_WALKIN && armed.has(p)) { burst(p.x, p.y, '#7fc8ff', 16, 140); Sfx.play('portal'); leaveMapToTown(); }
  });
  Hook.on('cast', () => { if (ch && !G._autoCast) stop('放了技能'); });   // 夢囈自動放的不算（dreamtalk.js 會設 G._autoCast）
  Hook.on('hurt', () => { if (ch) stop('被打到了'); });   // v2.19.10 被打到一律中斷
  // 詠唱：腳下轉的藍色光圈、往上飄的光點、頭上的詠唱條
  Hook.on('drawOver', g => {
    if (!ch || !G.pl) return;
    const pl = G.pl, k = Math.min(1, ch.t / TP_CAST), T = G.time;
    g.save();
    g.strokeStyle = '#7fc8ff'; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a0 = T * 3 + i * Math.PI * 2 / 3;
      g.globalAlpha = 0.45 + 0.4 * k; g.beginPath(); g.ellipse(pl.x, pl.y + 14, 24 + 4 * k, 9 + 2 * k, 0, a0, a0 + 1.4); g.stroke();
    }
    g.globalAlpha = 0.18 + 0.2 * k; g.fillStyle = '#7fc8ff'; g.beginPath(); g.ellipse(pl.x, pl.y + 14, 22 * k + 6, (22 * k + 6) * 0.38, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    const bw = 44, bx = Math.round(pl.x - bw / 2), by = Math.round(pl.y - 58);
    g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(bx - 1, by - 1, bw + 2, 6);
    g.fillStyle = '#7fc8ff'; g.fillRect(bx, by, bw * k, 4);
    g.restore();
    if (Math.random() < 0.5) G.parts.push({ x: pl.x + rnd(-20, 20), y: pl.y + rnd(0, 16), vx: 0, vy: -50, t: 0, dur: 0.6, color: '#9fd8ff', s: 2 });
  });
  // 剛打開的回城門：一圈光往外擴（門本身照舊由 render.js 的 drawPortal 畫，有動畫和光）
  Hook.on('drawWorld', g => {
    const p = G.world && G.world.portal; if (!p || !p.tp || p.born == null) return;
    const a = G.time - p.born; if (a < 0 || a > 0.8) return;
    g.save(); g.globalAlpha = 1 - a / 0.8; g.strokeStyle = '#bfe4ff'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(p.x, p.y - 6, 10 + a * 50, 16 + a * 60, 0, 0, Math.PI * 2); g.stroke(); g.restore();
  });
  Hook.on('light', (cut, cx, cy) => { if (ch && G.pl) cut(G.pl.x - cx, G.pl.y - cy, 90 + 60 * Math.min(1, ch.t / TP_CAST), 0.6); });
  // 回城鈕裡的進度條（藍色從左往右填）
  (() => { const st = document.createElement('style'); st.textContent = `#portalbtn.tpchan { border-color:#9fd8ff !important; box-shadow:0 0 0 1px #000, 0 0 12px rgba(120,190,255,.7) !important; }
    #portalbtn.tpchan::after { content:''; position:absolute; left:0; bottom:0; top:0; width:calc(var(--tp, 0) * 100%); background:rgba(120,190,255,.38); border-radius:8px; pointer-events:none; }`; document.head.appendChild(st); })();
  return { begin, stop, get casting() { return !!ch; } };
})();
