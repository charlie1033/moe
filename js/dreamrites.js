// =============================================================
//  v2.10.1 終局限時機制：獻祭圈、迷霧（夢潮裂隙在 dreamtide.js；出現機率 MECH／mechRoll 也在那裡）
//
//  ① 獻祭圈（kind:'rite'，第 14 夜起，每區 35%）— 擅長：範圍傷害、站得住的流派
//     按 F 開始，半徑 190 的圈。共 3 輪：
//       第 1 輪：一群怪（12～16 隻，吃地圖數量詞綴）
//       第 2 輪：第 1 輪死掉的全部復活＋一群新的
//       第 3 輪：前兩輪的全部復活＋一隻黃色精英
//     人不能離開圈：在圈外累計超過 4 秒，儀式失敗（怪消失、沒有獎勵）
//     儀式的怪本身不掉寶（有經驗）；3 輪打完在圈中心掉寶：件數＝4＋總擊殺÷8、稀有度 +40%、保底 1 件黃裝（mapLoot）
//
//  ② 迷霧（kind:'mist'，第 17 夜起，每區 35%）— 擅長：跑得快、清得快的流派
//     按 F 走進去：倒數 12 秒，每殺一隻 +0.5 秒（最多回到 12 秒）
//     每殺 12 隻升一層：霧更濃（看得到的範圍變小）、身邊再湧出一群怪，這群怪的生命和傷害每層 +8%
//     倒數歸零＝霧散，在腳邊掉寶：件數＝2＋層數×2、稀有度＋層數×15%、4 層以上保底 1 件黃裝（mapLoot）
//     停下來不殺怪，霧很快就散；想要高層數就得一直往有怪的地方衝
//  資料：都在 w.events 的事件物件上（rite：round／pool／mobs／out；mist：t／kills／layer）
// =============================================================
const RITE = { R: 190, outMax: 4 }, MIST = { t0: 12, perKill: 0.5, perLayer: 12 };
// mechHud(代號, top, 顏色, 文字) 在 core.js：v2.18.2 起所有狀態列統一排在小地圖下方（StatusLines）
const evActive = kind => G.world && G.world.events && G.world.events.find(e => e.kind === kind && e.active);
// —— 放進地圖 ——
Hook.on('stage', w => {
  if (!w || w.arena || !w.stage || !w.events) return;
  for (const kind of ['rite', 'mist']) {
    if (!mechRoll(kind, w)) continue;
    const rooms = (w.others || []).filter(r => r.w * r.h >= 70).sort(() => Math.random() - 0.5);
    for (const r of rooms) {
      const x = (r.x + (r.w >> 1)) * TS + 16, y = (r.y + (r.h >> 1)) * TS + 16;
      if (blockedCircle(x, y, 14) || w.events.some(e => Math.hypot(e.x - x, e.y - y) < 160)) continue;
      w.events.push({ kind, x, y, done: false }); break;
    }
  }
});
// —— ① 獻祭圈 ——
function riteSpawn(ev, type, rarity) {
  const w = G.world, a = Math.random() * Math.PI * 2, d = rnd(40, RITE.R - 30);
  let x = ev.x + Math.cos(a) * d, y = ev.y + Math.sin(a) * d; if (blockedCircle(x, y, 12)) { x = ev.x; y = ev.y; }
  const m = makeMonster(type, x, y, w.mlvl + (rarity === 'rare' ? 2 : 0), rarity, w.theme);
  m.rite = true; m.noDrop = true; m.aggro = true; G.mons.push(m); ev.mobs.push(m); burst(x, y, '#ff7a90', 4, 100);
}
function riteRound(ev) {
  const w = G.world; ev.round++; ev.mobs = [];
  for (const p of ev.pool) riteSpawn(ev, p[0], p[1]);                      // 之前死掉的全部復活
  const fresh = [];
  if (ev.round < 3) { const n = Math.round(rint(12, 16) * Math.min(1.6, (w.mm && w.mm.pack) || 1)); for (let i = 0; i < n; i++) fresh.push([pick(w.theme.monsters), Math.random() < 0.12 ? 'magic' : 'normal']); }
  else for (let i = 0; i < 1 + atlasVal('rite_rare'); i++) fresh.push([pick(w.theme.monsters), 'rare']);
  for (const p of fresh) { riteSpawn(ev, p[0], p[1]); ev.pool.push(p); }
  UI.msg(`獻祭圈：第 ${ev.round} / 3 輪（${ev.mobs.length} 隻）`, '#ff7a90'); G.shake = Math.max(G.shake, 3);
}
EV_START.rite = ev => {
  ev.active = true; ev.round = 0; ev.pool = []; ev.mobs = []; ev.out = 0; ev.kills = 0; ev.wait = 0.8;
  UI.banner('獻祭圈', '3 輪：死掉的怪下一輪會全部復活。不要離開圈', '#ff7a90');
};
function riteEnd(ev, ok) {
  ev.active = false; ev.cleared = true;
  for (const m of G.mons) if (m.rite && !m.dead) { m.dead = true; burst(m.x, m.y, '#ff7a90', 4, 120); }
  G.mons = G.mons.filter(m => !(m.rite && m.dead));
  if (ok) atlasMilestone('rite', 1);
  if (ok) { mapLoot(ev.x, ev.y, { n: 4 + Math.floor(ev.kills / 8), r: 40, bonus: 4, rare: 1, ilvl: (G.world.mlvl || 1) + 1 }); Sfx.play('unique'); }
  UI.banner(ok ? '獻祭完成' : '獻祭中斷', ok ? `擊殺 ${ev.kills} 隻・祭壇吐出了寶物` : '你離開圈太久，儀式失敗了', '#ff7a90');
  mechHud('riteHud', 120, '#ff9aa8', '');
}
// —— ② 迷霧 ——
function mistPack(ev) {
  const w = G.world, pl = G.pl, a = Math.random() * Math.PI * 2, p = randomFloorNear(pl.x + Math.cos(a) * 220, pl.y + Math.sin(a) * 220, 90);
  const before = G.mons.length; spawnPack(p.x, p.y, w);
  const k = 1 + 0.08 * ev.layer;
  for (let i = before; i < G.mons.length; i++) { const m = G.mons[i]; m.mist = true; m.aggro = true; m.maxLife = Math.round(m.maxLife * k); m.life = m.maxLife; m.dmg = [m.dmg[0] * k, m.dmg[1] * k]; }
}
EV_START.mist = ev => {
  ev.active = true; ev.t = ev.t0 = MIST.t0 + atlasVal('mist_time'); ev.kills = 0; ev.layer = 0;
  UI.banner('迷霧', '倒數歸零霧就散。殺怪加時間，殺得越多層數越高、獎勵越好', '#a8c8c0');
  mistPack(ev); mistPack(ev);
};
function mistEnd(ev) {
  const pl = G.pl; ev.active = false; ev.cleared = true;
  atlasMilestone('mist', ev.layer || 0);
  if (ev.layer > 0 || ev.kills > 0) { mapLoot(pl.x, pl.y, { n: 2 + ev.layer * 2, r: ev.layer * 15, bonus: 4, rare: ev.layer >= 4 ? 1 : 0, ilvl: (G.world.mlvl || 1) + 1 }); Sfx.play('unique'); }
  UI.banner('霧散了', `撐到第 ${ev.layer} 層・擊殺 ${ev.kills} 隻`, '#a8c8c0');
  mechHud('mistHud', 144, '#c8e8e0', '');
}
Hook.on('update', dt => {
  const w = G.world, pl = G.pl; if (!w || !w.events || !pl) return;
  let rite = null, mist = null;
  for (const ev of w.events) {
    if (!ev.active) continue;
    if (ev.kind === 'rite') {
      rite = ev;
      if (!ev.pool) { riteEnd(ev, false); continue; }                       // 舊的保留夢境讀回來
      ev.mobs = ev.mobs.filter(m => !m.dead && G.mons.includes(m));
      ev.out = Math.hypot(pl.x - ev.x, pl.y - ev.y) > RITE.R ? ev.out + dt : Math.max(0, ev.out - dt * 0.5);
      if (ev.out > RITE.outMax) { riteEnd(ev, false); rite = null; continue; }
      if (!ev.mobs.length && (ev.wait -= dt) <= 0) {
        if (ev.round >= 3) { riteEnd(ev, true); rite = null; continue; }
        riteRound(ev); ev.wait = 1.2;
      }
      mechHud('riteHud', 120, '#ff9aa8', `獻祭圈　第 ${Math.max(1, ev.round)} / 3 輪　剩 ${ev.mobs.length} 隻` + (ev.out > 0.3 ? `　⚠ 回到圈裡！（${Math.max(0, RITE.outMax - ev.out).toFixed(1)} 秒）` : ''));
    } else if (ev.kind === 'mist') {
      mist = ev;
      if (ev.t === undefined) { mistEnd(ev); mist = null; continue; }
      ev.t -= dt;
      if (ev.t <= 0) { mistEnd(ev); mist = null; continue; }
      mechHud('mistHud', 144, '#c8e8e0', `迷霧　第 ${ev.layer} 層　擊殺 ${ev.kills}　剩 ${ev.t.toFixed(1)} 秒`);
    }
  }
  if (!rite) mechHud('riteHud', 120, '#ff9aa8', '');
  if (!mist) mechHud('mistHud', 144, '#c8e8e0', '');
});
Hook.on('kill', m => {
  if (m.rite) { const ev = evActive('rite'); if (ev) ev.kills++; }
  const mist = evActive('mist');
  if (mist) {   // 霧裡殺的每一隻都算（不限霧生出來的）
    mist.kills++; mist.t = Math.min(mist.t0 || MIST.t0, mist.t + MIST.perKill);
    if (mist.kills % MIST.perLayer === 0) { mist.layer++; UI.msg(`迷霧更濃了：第 ${mist.layer} 層`, '#c8e8e0'); mistPack(mist); }
  }
});
// —— 畫 ——
Hook.on('drawWorld', g => {
  const w = G.world; if (!w || !w.events) return;
  for (const ev of w.events) {
    if (ev.kind !== 'rite' && ev.kind !== 'mist') continue;
    const x = ev.x, y = ev.y, t = G.time, on = !ev.cleared;
    if (typeof drawEventArt === 'function' && drawEventArt(g, ev)) { /* 美術畫本體 */ }
    else if (ev.kind === 'rite') {      // 祭壇：石台＋紅色符文
      g.save();
      g.fillStyle = '#4a3a40'; g.fillRect(x - 14, y - 6, 28, 18); g.fillStyle = '#6a5258'; g.fillRect(x - 17, y - 10, 34, 6);
      g.fillStyle = on ? `rgba(255,110,130,${0.6 + 0.4 * Math.sin(t * 4)})` : '#5a4a50';
      g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x + 7, y - 16); g.lineTo(x, y - 11); g.lineTo(x - 7, y - 16); g.closePath(); g.fill();
      g.restore();
    } else {                             // 迷霧：一團翻滾的霧
      g.save();
      for (let i = 0; i < 5; i++) { const a = t * 0.6 + i * 1.26, r = 12 + 5 * Math.sin(t * 1.3 + i); g.globalAlpha = on ? 0.35 : 0.12; g.fillStyle = '#b8d8d0'; g.beginPath(); g.arc(x + Math.cos(a) * 14, y - 8 + Math.sin(a) * 7, r, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
    if (ev.kind === 'rite' && ev.active) {
      g.save(); const warn = ev.out > 0.3;
      g.fillStyle = 'rgba(255,90,110,0.05)'; g.beginPath(); g.arc(x, y, RITE.R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = warn ? `rgba(255,220,120,${0.6 + 0.4 * Math.sin(t * 14)})` : 'rgba(255,120,140,0.85)'; g.lineWidth = 3;
      g.setLineDash([14, 6]); g.lineDashOffset = t * 30; g.beginPath(); g.arc(x, y, RITE.R, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
  }
});
// 迷霧：看得到的範圍變小（挖光之前先把整片黑蓋回去一點做不到，改成事後罩一層霧）
Hook.on('glow', (g, cx, cy) => {
  const ev = evActive('mist'); if (!ev || !G.pl) return;
  const px = G.pl.x - cx, py = G.pl.y - cy, R = Math.max(120, 300 - ev.layer * 28);
  const gr = g.createRadialGradient(px, py, R * 0.45, px, py, R * 1.5);
  gr.addColorStop(0, 'rgba(150,180,175,0)'); gr.addColorStop(1, `rgba(150,180,175,${Math.min(0.85, 0.55 + ev.layer * 0.05)})`);
  g.save(); g.fillStyle = gr; g.fillRect(0, 0, VW, VH); g.restore();
});
Hook.on('light', (cut, cx, cy) => {
  const w = G.world; if (!w || !w.events) return;
  for (const ev of w.events) if ((ev.kind === 'rite' || ev.kind === 'mist') && !ev.cleared) cut(ev.x - cx, ev.y - cy, ev.kind === 'rite' && ev.active ? RITE.R + 30 : 90, 0.55);
});
