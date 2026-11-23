// =============================================================
//  v2.20.10 夢深條（特色差異化提案方向七，最小版）
//  玩家看到：生命球上面多一道紫色的弧，寫著「夢深」。
//    一直打怪，夢就越來越深：弧越滿，畫面四周越紫，地上掉的東西越多越好（數量最多 +40%、稀有度最多 +60%）
//    停下來不打（5 秒沒有擊殺），夢會慢慢變淺
//    滿了以後跳出「醒一下」（鍵盤 X，手機是一顆按鈕）：畫面上的怪全部被震開、暈住、扣一大截血，掉一個小寶箱，夢深歸零
//    滿了一直不醒，12 秒後夢會吞你一口：扣 30% 生命（不會死），夢深歸零
//  第 2 夜起才有（第 1 夜是教學）；營地、競技場沒有
//  資料：都放在這張地圖上 w.dd = { v 夢深 0～100, idle 幾秒沒擊殺, full 滿了幾秒, q/r 已經加到地圖上的掉落加成 }
//  接點：Hook 'kill'、'update'、'drawHUD'；KEY_ACTIONS 多「醒一下」；手機多一顆 DOM 按鈕
// =============================================================
const DreamDepth = (() => {
  const GAIN = { normal: 1.5, magic: 4, rare: 9 }, IDLE = 5, DECAY = 2, SWALLOW = 12, Q = 40, R = 60, WAKE_R = 640;
  const on = () => { const w = G.world; return !!(w && G.P && w.kind === 'map' && !w.arena && (w.tier || 0) >= 2 && w.mm); };
  const st = () => { const w = G.world; return w.dd || (w.dd = { v: 0, idle: 0, full: 0, q: 0, r: 0 }); };
  // 掉落加成：只加「這次跟上次的差」，不蓋掉地圖原本的詞綴
  function apply() {
    const w = G.world, d = st(), q = Math.round(d.v / 100 * Q), r = Math.round(d.v / 100 * R);
    if (q !== d.q) { w.mm.q = (w.mm.q || 0) + q - d.q; d.q = q; }
    if (r !== d.r) { w.mm.r = (w.mm.r || 0) + r - d.r; d.r = r; }
  }
  function set(v) {
    const d = st(), was = d.v; d.v = Math.max(0, Math.min(100, v)); if (d.v < 100) d.full = 0; apply();
    const P = G.P;
    if (was < 30 && d.v >= 30 && !P.ddSeen) { P.ddSeen = 1; UI.msg('夢變深了（生命球上面的紫色弧）：越深掉的東西越好；滿了記得「醒一下」，不然夢會吞你一口', '#c8a0ff'); }
    if (was < 100 && d.v >= 100) { UI.msg(`夢太深了——${IS_TOUCH_() ? '按「醒一下」' : `按 ${keyName()} 醒一下`}，12 秒內不醒，夢會吞你一口`, '#e0b0ff'); Sfx.play('levelup', 0.5); }
  }
  const IS_TOUCH_ = () => typeof IS_TOUCH !== 'undefined' && IS_TOUCH;
  const keyName = () => (keyOfAction('ddwake') || 'KeyX').replace(/^Key/, '');
  // 醒一下：畫面上的怪震開、暈住、扣血；掉小寶箱；歸零
  function wake() {
    if (!on() || st().v < 100 || G.dead) return false;
    const pl = G.pl, w = G.world;
    for (const m of G.mons) {
      if (m.dead || m.hidden || Math.hypot(m.x - pl.x, m.y - pl.y) > WAKE_R) continue;
      const a = Math.atan2(m.y - pl.y, m.x - pl.x), boss = !!m.boss;
      if (!boss) { m.kx = (m.kx || 0) + Math.cos(a) * 380; m.ky = (m.ky || 0) + Math.sin(a) * 380; }
      m.stagger = Math.max(m.stagger || 0, boss ? 0.6 : 1.6); m.aggro = true; m.flash = 0.15;
      const dmg = Math.max(1, Math.round(m.maxLife * (boss ? 0.05 : 0.25)));
      m.life -= dmg; G.texts.push({ x: m.x, y: m.y - m.r - 10, txt: String(dmg), color: '#e0b0ff', size: 14, t: 0, dur: 0.8, vx: rnd(-20, 20), pop: 0.6 });
      if (m.life <= 0) killMonster(m);
    }
    // 小寶箱：1 件稀有（或更好）＋2 個通貨
    const il = (w.mlvl || 1) + 1; let it = null;
    for (let j = 0; j < 40 && (!it || !['rare', 'unique'].includes(it.rarity)); j++) it = randomItem(il, 4);
    if (it) dropLoot(pl.x, pl.y - 20, { item: it });
    for (let n = 0; n < 2; n++) dropLoot(pl.x, pl.y - 20, { cur: randomCurrency() });
    G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: WAKE_R * 0.6, t: 0, dur: 0.7, color: '#e0b0ff', fill: 'rgba(200,150,255,0.18)' });
    burst(pl.x, pl.y, '#e0b0ff', 50, 320); G.shake = Math.max(G.shake || 0, 6); Sfx.play('crit');
    G.texts.push({ x: pl.x, y: pl.y - 60, txt: '醒一下！', color: '#f0d0ff', size: 20, t: 0, dur: 1.2, pop: 1 });
    set(0); return true;
  }
  function swallow() {
    const pl = G.pl, S = G.S;
    pl.life = Math.max(1, pl.life - S.maxLife * 0.3);
    G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: 90, t: 0, dur: 0.6, color: '#6a3a9a', fill: 'rgba(60,20,90,0.35)' });
    UI.banner('夢吞了你一口', '太深了沒有醒，被扣了 30% 生命。下次滿了記得「醒一下」', '#c8a0ff'); Sfx.play('stun');
    set(0);
  }
  Hook.on('kill', m => { if (!on() || !m || m.boss) return; const d = st(); d.idle = 0; if (d.v < 100) set(d.v + (GAIN[m.rarity] || 1.5)); });
  Hook.on('update', dt => {
    if (!on() || G.dead || UI.paused()) { btn(false); return; }
    const d = st();
    if (d.v >= 100) { d.full += dt; if (d.full >= SWALLOW) swallow(); }
    else if ((d.idle += dt) > IDLE && d.v > 0) set(d.v - DECAY * dt);
    btn(d.v >= 100);
  });
  // 生命球上面的紫色弧＋畫面四周變紫；滿了閃爍提示
  Hook.on('drawHUD', g => {
    if (!on() || G.state !== 'play' || typeof HUD === 'undefined' || !HUD.orbL) return;
    const d = st(), f = d.v / 100; if (f <= 0 && !d.full) return;
    g.save();
    if (f > 0.05) {
      const a = 0.32 * f, grd = g.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.35, VW / 2, VH / 2, Math.max(VW, VH) * 0.72);
      grd.addColorStop(0, 'rgba(90,40,140,0)'); grd.addColorStop(1, `rgba(90,40,140,${a.toFixed(3)})`);
      g.fillStyle = grd; g.fillRect(0, 0, VW, VH);
    }
    const [x, y, r] = HUD.orbL, R0 = r + 7, A0 = Math.PI * 1.12, A1 = Math.PI * 1.88, full = d.v >= 100, p = full ? 0.6 + 0.4 * Math.sin(G.time * 8) : 1;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(20,12,30,0.85)'; g.lineWidth = 7; g.beginPath(); g.arc(x, y, R0, A0, A1); g.stroke();
    if (f > 0) { g.strokeStyle = full ? `rgba(240,190,255,${p})` : '#a070e0'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, R0, A0, A0 + (A1 - A0) * f); g.stroke(); }
    txt(g, full ? '夢深 滿' : `夢深 ${Math.round(d.v)}%`, x, y - R0 - 8, 9, full ? '#f0d0ff' : '#c8a8f0', 'center');
    if (full && !IS_TOUCH_()) {   // 手機有按鈕；電腦在角色頭上提示
      const s = `夢太深了：按 ${keyName()} 醒一下（${Math.max(0, Math.ceil(SWALLOW - d.full))} 秒後夢會吞你一口）`, cx = VW / 2, cy = VH / 2 - 84;
      g.font = '14px sans-serif'; const tw = g.measureText(s).width + 28;
      g.fillStyle = 'rgba(30,12,48,0.85)'; g.fillRect(cx - tw / 2, cy - 15, tw, 26);
      g.strokeStyle = `rgba(220,170,255,${p})`; g.lineWidth = 1.5; g.strokeRect(cx - tw / 2, cy - 15, tw, 26);
      txt(g, s, cx, cy + 3, 14, '#f0d0ff', 'center');
    }
    g.restore();
  });
  // 手機：滿了才出現的按鈕
  let B = null;
  function btn(show) {
    if (!IS_TOUCH_()) return;
    if (!B) { if (!show) return; B = document.createElement('button'); B.id = 'ddWakeBtn'; B.textContent = '醒一下'; B.onclick = e => { e.stopPropagation(); wake(); }; document.body.appendChild(B); }
    B.style.display = show ? '' : 'none';
  }
  window.addEventListener('keydown', e => {
    if (G.state !== 'play' || !G.P || e.repeat) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.code === (keyOfAction('ddwake') || 'KeyX')) wake();
  });
  (() => { const s = document.createElement('style'); s.textContent = `#ddWakeBtn { position:fixed; left:50%; top:110px; transform:translateX(-50%); z-index:41; padding:9px 22px; font-size:16px; border-radius:18px; cursor:pointer;
    background:rgba(40,16,60,.92); color:#f0d0ff; border:1px solid #c890ff; box-shadow:0 0 14px rgba(200,140,255,.6); animation:ddp 0.8s ease-in-out infinite alternate; }
    @keyframes ddp { from { box-shadow:0 0 6px rgba(200,140,255,.4); } to { box-shadow:0 0 18px rgba(220,170,255,.9); } }`; document.head.appendChild(s); })();
  return { on, st, set, wake, swallow, get v() { return G.world && G.world.dd ? G.world.dd.v : 0; } };
})();
KEY_ACTIONS.push({ id: 'ddwake', name: '醒一下（夢深滿了）', def: 'KeyX', grp: '動作' });
