// =============================================================
//  v2.10 終局第一步：怪變多（蟲群）＋夢潮裂隙
//  （怪群本身加大寫在 game.js 的 spawnPack：深層夢境第 11 夜 1.6 倍、第 20 夜 2.5 倍、第 30 夜起 3.5 倍）
//
//  ① 蟲群：只在深層夢境（第 11 夜起）。每個房間有 30% 機率（每深一夜 +1%，最多 50%）多一窩蟲群：
//     22～34 隻（吃地圖的怪物數量詞綴），體型小、跑得快 20%、生命只有 30%、傷害 55%
//     一隻的經驗 35%、掉寶率是一般怪的三分之一（數量多，總量差不多）
//
//  ② 夢潮裂隙（地圖事件 kind:'tide'）：只在深層夢境，每一區 50% 機率有一個（終局天賦盤可以再加）
//     按 F 撕開 → 一個圈在 14 秒內從 40 擴到 380，然後 6 秒內收掉，共 20 秒
//     圈掃過的地方不斷冒出怪（一次 3～5 隻、同時最多 140 隻），圈收掉時還活著的裂隙怪一起消失（不掉寶）
//     獎勵看擊殺數：結束時在裂隙中心掉寶，件數＝3＋擊殺÷10、稀有度加成＝擊殺÷2（%），
//     擊殺 40 隻以上保底 1 件黃裝、80 隻以上 2 件。全部照這張地圖的掉寶率算（mapLoot），不固定掉東西
//     裂隙怪本身照一般怪掉寶、給經驗（蟲群規格：一隻掉得少）
//     考驗的是「跟著圈跑、清得快」，站著不動殺不到幾隻
//  資料：事件存在 w.events（ev.t 已經過幾秒、ev.kills 擊殺數、ev.R 目前半徑）
//  接點：Hook 'stage'（放蟲群、放裂隙）、'update'、'kill'、'drawWorld'、'light'；啟動走 mapevents.js 的 activateEvent
// =============================================================
const TIDE = { grow: 14, fade: 6, r0: 40, r1: 380, cap: 140, tick: 0.3 };
// 三個限時機制什麼時候開始出現、每一區出現的機率（終局天賦盤會再加：G.P.atlas 的 mech_種類 每點 +機率）
const MECH = { tide: { from: 11, ch: 0.5 }, rite: { from: 14, ch: 0.35 }, mist: { from: 17, ch: 0.35 } };
function mechRoll(kind, w) {
  const M = MECH[kind]; if (!M || (w.tier || 0) < M.from) return false;
  const bonus = typeof atlasVal === 'function' ? atlasVal('mech_' + kind) : 0;
  return Math.random() < M.ch + bonus / 100;
}
function makeSwarmMon(w, x, y, lv) {
  const m = makeMonster(pick(w.theme.monsters), x, y, Math.max(1, lv), 'normal', w.theme);
  m.swarm = true; m.maxLife = Math.max(1, Math.round(m.maxLife * 0.3)); m.life = m.maxLife;
  m.dmg = [m.dmg[0] * 0.55, m.dmg[1] * 0.55]; m.speed *= 1.2; m.r *= 0.8; m.scale = Math.max(1, m.scale * 0.8);
  return m;
}
// ① 蟲群
Hook.on('stage', w => {
  if (!w || w.arena || (w.tier || 0) < DEEP_TIER) return;
  const horde = w.mm && w.mm.flags && w.mm.flags.wr_horde;   // 世界規則「蟲潮」：每個房間都有
  const ch = Math.min(0.5, 0.3 + (w.tier - DEEP_TIER) * 0.01) + atlasVal('swarm') / 100, pack = Math.min(1.6, (w.mm && w.mm.pack) || 1);
  for (const r of w.others || []) {
    if (!horde && Math.random() > ch) continue;
    const cx = (r.x + r.w / 2) * TS, cy = (r.y + r.h / 2) * TS, n = Math.round(rint(22, 34) * pack);
    for (let i = 0; i < n; i++) { const p = randomFloorNear(cx, cy, 120); G.mons.push(makeSwarmMon(w, p.x, p.y, w.mlvl - 1)); }
  }
});
// ② 夢潮裂隙：放在一個房間中間（跟別的事件隔開）
Hook.on('stage', w => {
  if (!w || w.arena || !w.stage || (w.tier || 0) < DEEP_TIER || !w.events) return;
  if (!mechRoll('tide', w)) return;
  const rooms = (w.others || []).filter(r => r.w * r.h >= 60).sort(() => Math.random() - 0.5);
  for (const r of rooms) {
    const x = (r.x + (r.w >> 1)) * TS + 16, y = (r.y + (r.h >> 1)) * TS + 16;
    if (blockedCircle(x, y, 14) || w.events.some(e => Math.hypot(e.x - x, e.y - y) < 120)) continue;
    w.events.push({ kind: 'tide', x, y, done: false }); return;
  }
});
EV_START.tide = tideStart;
function tideStart(ev) {
  ev.active = true; ev.t = 0; ev.kills = 0; ev.R = TIDE.r0; ev.next = 0;
  UI.banner('夢潮裂隙', '跟著擴散的圈殺怪：20 秒內殺越多，裂隙吐出的寶物越多', '#7ad8ff');
  G.shake = Math.max(G.shake, 5); burst(ev.x, ev.y, '#7ad8ff', 30, 220);
}
const tideGrow = () => TIDE.grow + atlasVal('tide_len');   // 終局盤可以加長
const tideMobs = () => G.mons.filter(m => m.tide && !m.dead);
function tideEnd(ev) {
  const w = G.world; ev.active = false; ev.cleared = true;
  for (const m of tideMobs()) { m.dead = true; burst(m.x, m.y, '#7ad8ff', 4, 120); }   // 沒殺完的直接消失（不算擊殺、不掉寶）
  G.mons = G.mons.filter(m => !(m.tide && m.dead));
  const k = ev.kills || 0;
  atlasMilestone('tide', k);
  if (k > 0) mapLoot(ev.x, ev.y, { n: 3 + Math.floor(k / 10), r: Math.floor(k / 2), bonus: 4, rare: k >= 80 ? 2 : k >= 40 ? 1 : 0, ilvl: (w.mlvl || 1) + 1 });
  UI.banner('夢潮退去', k ? `擊殺 ${k} 隻・裂隙吐出了寶物` : '一隻都沒殺到，裂隙什麼也沒留下', '#7ad8ff');
  Sfx.play(k ? 'unique' : 'portal'); tideHud('');
}
Hook.on('update', dt => {
  const w = G.world; if (!w || !w.events) return;
  for (const ev of w.events) {
    if (ev.kind !== 'tide' || !ev.active) continue;
    if (ev.t === undefined) { tideEnd(ev); continue; }   // 舊的保留夢境讀回來：直接結束
    ev.t += dt;
    const grow = tideGrow(), total = grow + TIDE.fade;
    ev.R = ev.t < grow ? TIDE.r0 + (TIDE.r1 - TIDE.r0) * (ev.t / grow) : TIDE.r1 * Math.max(0, 1 - (ev.t - grow) / TIDE.fade);
    // 圈的邊緣冒怪（只在擴張的時候）
    if (ev.t < grow && (ev.next -= dt) <= 0) {
      ev.next = TIDE.tick;
      const alive = tideMobs().length;
      for (let i = rint(3, 5); i > 0 && alive + i <= TIDE.cap; i--) {
        const a = Math.random() * Math.PI * 2, d = ev.R * rnd(0.8, 1), x = ev.x + Math.cos(a) * d, y = ev.y + Math.sin(a) * d;
        if (blockedCircle(x, y, 12)) continue;
        const m = makeSwarmMon(w, x, y, w.mlvl); m.tide = true; m.aggro = true;
        if (Math.random() < 0.08) { m.rarity = 'magic'; m.maxLife *= 2.2; m.life = m.maxLife; m.swarm = false; m.scale /= 0.8; m.r /= 0.8; }
        G.mons.push(m); burst(x, y, '#7ad8ff', 3, 90);
      }
    }
    tideHud(`夢潮裂隙　擊殺 ${ev.kills}　剩 ${Math.max(0, Math.ceil(total - ev.t))} 秒`);
    if (ev.t >= total) tideEnd(ev);
  }
});
Hook.on('kill', m => {
  if (!m.tide) return;
  const ev = G.world && G.world.events && G.world.events.find(e => e.kind === 'tide' && e.active);
  if (ev) ev.kills++;
});
Hook.on('update', () => { const w = G.world; if (!w || !w.events || !w.events.some(e => e.kind === 'tide' && e.active)) tideHud(''); });   // 離開地圖、回營地：倒數字收掉
// 畫：沒開＝地上一道發光的裂縫；開了＝擴散的圈
Hook.on('drawWorld', g => {
  const w = G.world; if (!w || !w.events) return;
  for (const ev of w.events) {
    if (ev.kind !== 'tide') continue;
    const x = ev.x, y = ev.y, t = G.time;
    if (typeof drawEventArt === 'function' && drawEventArt(g, ev)) { /* 美術畫本體 */ }
    else {
      g.save(); g.lineCap = 'round';
      const on = !ev.cleared, c = on ? `rgba(122,216,255,${0.7 + 0.3 * Math.sin(t * 5)})` : '#4a5560';
      for (const [wd, a] of [[7, 0.25], [3, 1]]) {
        g.globalAlpha = a; g.strokeStyle = c; g.lineWidth = wd; g.beginPath();
        g.moveTo(x - 22, y + 8); g.lineTo(x - 8, y - 2); g.lineTo(x + 2, y + 5); g.lineTo(x + 12, y - 8); g.lineTo(x + 24, y - 3); g.stroke();
      }
      g.restore();
      if (on && !ev.active && Math.random() < 0.25) G.parts.push({ x: x + rnd(-20, 20), y: y + rnd(-6, 6), vx: 0, vy: -36, t: 0, dur: 0.7, color: '#9ae8ff', s: 2 });
    }
    if (ev.active && ev.R > 0) {
      g.save();
      g.fillStyle = 'rgba(90,180,255,0.06)'; g.beginPath(); g.arc(x, y, ev.R, 0, Math.PI * 2); g.fill();
      g.setLineDash([10, 8]); g.lineDashOffset = -t * 40;
      g.strokeStyle = 'rgba(150,225,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, ev.R, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]); g.globalAlpha = 0.3; g.lineWidth = 9; g.stroke();
      g.restore();
    }
  }
});
Hook.on('light', (cut, cx, cy) => {
  const w = G.world; if (!w || !w.events) return;
  for (const ev of w.events) if (ev.kind === 'tide' && !ev.cleared) cut(ev.x - cx, ev.y - cy, ev.active ? Math.max(120, ev.R + 40) : 90, ev.active ? 0.75 : 0.5);
});
// 上方的倒數字
function tideHud(t) {
  let el = document.getElementById('tideHud');
  if (!el) { if (!t) return; el = document.createElement('div'); el.id = 'tideHud'; document.body.appendChild(el); }
  if (el.textContent !== t) el.textContent = t; el.style.display = t ? '' : 'none';
}
(() => { const st = document.createElement('style'); st.textContent = `#tideHud { position:fixed; left:50%; top:96px; transform:translateX(-50%); font-size:16px; font-weight:bold; color:#9ae8ff; text-shadow:0 0 4px #000,0 0 2px #000; pointer-events:none; z-index:5; }`; document.head.appendChild(st); })();
