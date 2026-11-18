// =============================================================
//  v2.17 無盡爬塔（取代原本的「首領連戰」：5 隻打完就結束 → 可以一直打下去）
//  玩家看到：地圖裝置上「無盡爬塔」，付 3 顆混沌石（背包＋倉庫）進競技場，一層一隻隨機看守者（不會連續同一隻）
//   ・越往上越強：第 N 層的看守者等級 +（N−1，最多 +6），生命 ×(1＋0.15(N−1)＋0.012(N−1)²)，傷害 ×(1＋0.07(N−1))
//     （第 10 層：生命約 2.3 倍、傷害 1.6 倍；第 20 層：生命約 4.2 倍、傷害 2.3 倍）
//   ・每打倒一隻：遊戲暫停，從三個「夢的贈禮」選一個（同一種可以疊；只在這次爬塔有效，離開就沒了），3.5 秒後下一隻出現
//   ・每 5 層一個獎勵寶箱（照地圖掉寶率：8 件起、每 5 層多 2 件、稀有度 +50%＋每層 4%、保底黃裝每 10 層多 1 件）
//     看守者本身照樣掉首領的寶物（競技場算法）
//   ・死掉或走傳送門離開＝結束：紀錄存在 G.P.climbBest，並寫進冊子 Book138.record('爬塔最高層', 層數)
//  資料：G.world.rush = { floor 正在打第幾層, cleared 打完幾層, next 下一隻出現的時間, gifts { 代號: 幾個 }, last 上一隻 }
//  對外：enterBossRush()（名字沿用，測試會呼叫）、climbDeviceHTML(P)（endgame.js 的地圖裝置介面用）、CLIMB_GIFTS
// =============================================================
const CLIMB_COST = 3;
const CLIMB_GIFTS = [
  { id: 'proj', name: '多重的夢', color: '#9ad070', text: '投射物 +2', f: (S, n) => { S.proj_count += 2 * n; } },
  { id: 'minion', name: '成群的夢', color: '#a0e0a8', text: '每種召喚物上限 +1', f: (S, n) => { S.minion_max += n; } },
  { id: 'regen', name: '癒合的夢', color: '#7aff9a', text: '每秒回復 2% 生命', f: (S, n) => { S.lifeRegenPS += S.maxLife * 0.02 * n; } },
  { id: 'critx', name: '致命的夢', color: '#ff8a70', text: '暴擊傷害 +50%', f: (S, n) => { S.crit_multi += 50 * n; } },
  { id: 'crit', name: '銳利的夢', color: '#ffe070', text: '暴擊率 +60%', f: (S, n) => { S.crit_inc += 60 * n; } },
  { id: 'speed', name: '急促的夢', color: '#7ae0ff', text: '攻擊、施法速度 +15%', f: (S, n) => { S.aspd_inc += 15 * n; S.cspd_inc += 15 * n; } },
  { id: 'power', name: '狂暴的夢', color: '#ff7050', text: '傷害 +20%（更多）', f: (S, n) => { S.more_dmg *= Math.pow(1.2, n); } },
  { id: 'life', name: '厚實的夢', color: '#e05050', text: '生命上限 +20%', f: (S, n) => { S.maxLife = Math.round(S.maxLife * Math.pow(1.2, n)); } },
  { id: 'res', name: '清醒的夢', color: '#c8c8d8', text: '火、冰、電抗性 +20%（上限照舊 75%）', f: (S, n) => { S.resF = Math.min(75, S.resF + 20 * n); S.resC = Math.min(75, S.resC + 20 * n); S.resL = Math.min(75, S.resL + 20 * n); } },
  { id: 'area', name: '擴散的夢', color: '#5b8cff', text: '範圍 +30%', f: (S, n) => { S.area_inc += 30 * n; } },
  { id: 'cdr', name: '輕快的夢', color: '#c090ff', text: '冷卻回復速度 +20%（上限照舊 40%）', f: (S, n) => { S.cdr += 20 * n; } },
  { id: 'ele', name: '元素的夢', color: '#ffb070', text: '火焰、冰冷、閃電傷害 +40%', f: (S, n) => { S.ele_inc += 40 * n; } },
  { id: 'move', name: '飄忽的夢', color: '#b0f0ff', text: '移動速度 +20%', f: (S, n) => { S.moveSpeed *= Math.pow(1.2, n); } },
];
const climbLevel = P => Math.min(80, mapLevel(Math.max(DEEP_TIER, P.maxTier)));
Hook.on('stats', S => {
  const R = G.world && G.world.rush; if (!R || !R.gifts) return;
  for (const g of CLIMB_GIFTS) if (R.gifts[g.id]) g.f(S, R.gifts[g.id]);
});
let _climbW = null;
function enterBossRush() {
  const P = G.P;
  if (craftCurHave('chaos') < CLIMB_COST) return UI.msg(`需要 ${CLIMB_COST} 顆混沌石（背包加倉庫）`, '#ff9a9a');
  craftCurPay('chaos', CLIMB_COST);
  if (G.savedMap) UI.msg('舊地圖的傳送門關閉了。', '#c8b890');
  G.savedMap = null; G.fromMap = true;
  resetEntities();
  const w = genArena('keeper');
  w.arena = 'rush'; w.mlvl = climbLevel(P); w.name = '無盡爬塔'; w.rush = { floor: 1, cleared: 0, next: 0, gifts: {}, last: null };
  G.world = w; _climbW = w;
  climbSpawn(w, true);
  buildWorldCanvas(w);
  const s = w.start; G.pl.x = (s.x + s.w / 2) * TS; G.pl.y = (s.y + 1) * TS;
  G.mins.forEach(m => { m.x = G.pl.x + rnd(-30, 30); m.y = G.pl.y + rnd(-30, 30); });
  w.flowT = 0;
  UI.showMapDevice(false); onBuildChanged();
  saveGame();
}
function climbSpawn(w, first) {
  const R = w.rush, ids = [...new Set(THEMES.map(t => t.boss))].filter(id => id !== R.last), id = pick(ids), f = R.floor - 1;
  R.last = id; w.portal = null;
  w.theme = Object.assign({}, THEMES.find(t => t.boss === id), { boss: id });
  const b = makeBoss(id, 20 * TS, 11 * TS, w.mlvl + MON_LVL_BONUS.boss + Math.min(6, f));
  const lf = 1 + 0.15 * f + 0.012 * f * f, df = 1 + 0.07 * f;
  b.maxLife = Math.round(b.maxLife * lf); b.life = b.maxLife; b.dmg = b.dmg.map(v => v * df);
  if (!first) { b.awake = true; G.bossBar = b; Sfx.play('bossroar'); }
  G.mons.push(b);
  UI.banner(`爬塔　第 ${R.floor} 層`, BOSSES[id].name, '#ff9a6a');
}
function climbEnd(w) {
  const R = w && w.rush; if (!R || R.ended) return; R.ended = true;
  const P = G.P, n = R.cleared;
  if (P) { const best = P.climbBest || 0; if (n > best) { P.climbBest = n; if (n) UI.msg(`無盡爬塔新紀錄：第 ${n} 層`, '#ffd36a'); } else if (n) UI.msg(`無盡爬塔結束：打完第 ${n} 層（最高紀錄 ${best} 層）`, '#ffcf70'); }
  if (n && typeof Book138 !== 'undefined') Book138.record('爬塔最高層', n);
  if (typeof ChoiceBox !== 'undefined') ChoiceBox.close();
  if (P) { saveGame(); setTimeout(() => { if (G.P) onBuildChanged(); }, 0); }
}
function climbGiftPick(w) {
  const R = w.rush, opts = CLIMB_GIFTS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  ChoiceBox.show('夢的贈禮', `第 ${R.cleared} 層打完了。選一個（只在這次爬塔有效，可以疊）`, opts.map(g => ({ name: g.name, color: g.color, text: g.text + (R.gifts[g.id] ? `<br>（已經有 ${R.gifts[g.id]} 個）` : '') })), i => {
    if (G.world !== w || R.ended) return;
    const g = opts[i]; R.gifts[g.id] = (R.gifts[g.id] || 0) + 1; onBuildChanged();
    UI.msg(`夢的贈禮：${g.name}（${g.text}）`, g.color);
  });
}
Hook.on('kill', m => {
  const w = G.world, R = w && w.rush; if (!R || !m.boss || R.ended) return;
  R.cleared = R.floor;
  if (R.cleared % 5 === 0) {
    const k = R.cleared / 5;
    mapLoot(m.x, m.y, { n: 8 + 2 * k, q: 40, r: 50 + 4 * R.cleared, bonus: 6, rare: 1 + Math.floor(R.cleared / 10), ilvl: w.mlvl + 4 });
    UI.banner('爬塔寶箱', `第 ${R.cleared} 層的獎勵掉在地上`, '#ffd36a'); Sfx.play('unique');
  }
  if (G.P && R.cleared > (G.P.climbBest || 0)) G.P.climbBest = R.cleared;
  R.floor++; R.next = G.time + 3.5;
  UI.msg(`下一隻看守者 3 秒後出現（第 ${R.floor} 層）・想結束就走傳送門`, '#ff9a6a');
  if (typeof ChoiceBox !== 'undefined') climbGiftPick(w);
  saveGame();
});
Hook.on('update', () => {
  const w = G.world, R = w && w.rush;
  if (_climbW && G.world !== _climbW) { climbEnd(_climbW); _climbW = null; }
  if (R && !R.ended && R.next && G.time >= R.next) { R.next = 0; climbSpawn(w, false); }
});
Hook.on('start', () => { _climbW = null; });
Hook.on('drawHUD', g => {
  const R = G.world && G.world.rush; if (!R || typeof VW === 'undefined') return;
  const n = Object.values(R.gifts).reduce((a, b) => a + b, 0);
  txt(g, `無盡爬塔　第 ${R.floor} 層　贈禮 ${n} 個　最高 ${(G.P && G.P.climbBest) || 0} 層`, VW / 2, 72, 13, '#ffcf70', 'center');
});
function climbDeviceHTML(P) {
  const have = craftCurHave('chaos');
  return `<div class="msec">無盡爬塔<span class="thint">　一層一隻看守者，越往上越強。每打倒一隻，從三個「夢的贈禮」選一個（只在這次有效）；每 5 層掉一個寶箱。</span></div>
    <div class="mrow"><div><b style="color:#ff9a6a">無盡爬塔</b>　怪物等級 ${climbLevel(P)} 起<br><span class="mdesc">費用：混沌石 ×${CLIMB_COST}（背包加倉庫，現在有 ${have}）　最高紀錄：第 ${P.climbBest || 0} 層<br>每打倒一隻會出現離開的傳送門；死掉或離開就結束，層數會記進冊子。</span></div>
    <button data-rush ${have >= CLIMB_COST ? '' : 'disabled'}>挑戰</button></div>`;
}
