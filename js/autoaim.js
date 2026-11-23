// =============================================================
//  v2.18.2 自動瞄準（手機按著技能鈕時）：挑誰打
//  玩家看到：
//   ・只打畫面裡看得到的怪（以前會打到畫面外）
//   ・先打大的：看守者／區域首領／守護者 ＞ 精英（藍、黃）＞ 一般怪；同一級打最近的
//   ・手機上點一下怪物＝鎖定：鎖定的怪頭上有一個小準星，技能都往牠打；牠死掉或離開畫面就自動解除（在右半邊再點同一隻也會解除；左半邊點到怪只鎖定，不影響搖桿）
//  電腦版是朝滑鼠方向放技能，不受影響
//  資料：AutoAim.lock（鎖定的怪，只在記憶體）；接點：touch.js 的 tick／zoneDown 呼叫，Hook 'drawOver' 畫準星、'enterMap' 解除
//  載入順序：要排在 touch.js 之前或之後都可以（只在遊戲進行中被呼叫）
// =============================================================
const AutoAim = {
  lock: null,
  onScreen(m, pad = 0) { const x = m.x - G.cam.x, y = m.y - G.cam.y; return x >= -pad && x <= VW + pad && y >= -pad && y <= VH + pad; },
  rank(m) { return m.boss || m.chapBoss || m.guardian ? 3 : m.rarity === 'rare' || m.rarity === 'magic' ? 2 : 1; },
  ok(m) { return m && !m.dead && !m.hidden && !m.friendly && !(m.boss && !m.awake && m !== this.lock) && G.mons.includes(m); },
  pick() {
    const L = this.lock;
    if (L && (!this.ok(L) || !this.onScreen(L))) this.lock = null;
    if (this.lock) return this.lock;
    const pl = G.pl; let best = null, br = 0, bd = 1e9;
    for (const m of G.mons) {
      if (!this.ok(m) || !this.onScreen(m)) continue;
      const r = this.rank(m), d = Math.hypot(m.x - pl.x, m.y - pl.y);
      if (r > br || (r === br && d < bd)) { best = m; br = r; bd = d; }
    }
    return best;
  },
  // 手機：點到怪物（邏輯座標 x, y）就鎖定；點到同一隻就解除。回傳 true＝這一下是點怪
  tap(x, y, toggle = true) {
    let hit = null, hd = 1e9;
    for (const m of G.mons) {
      if (m.dead || m.hidden || m.friendly) continue;
      const sx = m.x - G.cam.x, sy = m.y - 10 - G.cam.y, d = Math.hypot(sx - x, sy - y), r = (m.r || 12) + 14;
      if (d < r && d < hd) { hit = m; hd = d; }
    }
    if (!hit) return false;
    this.lock = toggle && this.lock === hit ? null : hit;
    if (this.lock) UI.msg(`鎖定：${hit.name}`, '#ffd36a');
    return true;
  },
};
Hook.on('enterMap', () => { AutoAim.lock = null; });
Hook.on('drawOver', g => {
  const m = AutoAim.lock; if (!m) return;
  if (!AutoAim.ok(m) || !AutoAim.onScreen(m)) { AutoAim.lock = null; return; }
  const x = Math.round(m.x), y = Math.round(m.y - (m.r || 12) * 2 - 18), s = 6 + Math.sin(G.time * 6) * 1.2;
  g.save(); g.strokeStyle = '#ffd36a'; g.lineWidth = 2;
  g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2);
  g.moveTo(x - s - 4, y); g.lineTo(x - s + 2, y); g.moveTo(x + s - 2, y); g.lineTo(x + s + 4, y);
  g.moveTo(x, y - s - 4); g.lineTo(x, y - s + 2); g.moveTo(x, y + s - 2); g.lineTo(x, y + s + 4); g.stroke(); g.restore();
});
