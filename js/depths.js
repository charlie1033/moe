// =============================================================
//  v2.12 終局第四步：夢的深度（第 21～40 夜）、世界規則、成長曲線
//
//  ・夢有盡頭：最深第 40 夜（DEPTH_MAX）。打倒第 40 夜的看守者＝走到夢的盡頭
//  ・怪物強度（depthScale）：第 11～20 夜每夜 +4%（到 1.4 倍），第 21～40 夜每夜只 +2%（第 40 夜 1.8 倍；舊版是 2.2 倍）
//    → 後段不再靠「更硬更痛」，改靠下面的世界規則和更多的怪
//  ・怪物等級第 20 夜封頂 80 級；第 21 夜起算經驗時每夜多當 0.5 級（第 40 夜當 90 級），角色 90 級以後還練得動（寫在 game.js）
//  ・世界規則：第 21 夜起每一夜固定帶幾條（不能用通貨重骰、每次進去重抽）：
//      第 21～25 夜 1 條、26～30 夜 2 條、31～35 夜 3 條、36～40 夜 4 條
//    每條 掉落數量 +10%、稀有度 +10%。六條規則分兩類，讓不同流派有擅長和吃虧的圖：
//      對「範圍／遠程」友善、對「近戰貼身」吃虧：餘燼（怪死後 1 秒原地爆炸）、蟲潮（每個房間都有蟲群）、追獵（附近的怪都會衝過來）
//      對「單體爆發」友善、對「清怪型」吃虧：巨像（看守者和黃怪生命 +80%）、護衛（看守者身邊多 3 隻黃怪）
//      考驗走位：荊棘地（腳邊不斷長出荊棘）
//    玩家自己加的夢境詞綴可以全部清掉（重鑄石），所以最低難度＝深度倍率＋世界規則，強化到頂的角色一定打得過
//  資料：G.P.deepRules[夜數] = [規則代號]；規則就是 MAP_MODS 裡 rule:true 的詞綴（旗標在 w.mm.flags）
// =============================================================
const DEPTH_MAX = 40;
function depthScale(tier) { return 1 + 0.04 * clamp(tier - 10, 0, 10) + 0.02 * clamp(tier - 20, 0, 20); }
const depthRuleCount = tier => tier < 21 ? 0 : Math.min(4, 1 + Math.floor((tier - 21) / 5));
const WORLD_RULES = [
  { id: 'wr_blast', name: '餘燼：怪物死後 1 秒在原地爆炸', flag: 'wr_blast', fam: 'sea' },
  { id: 'wr_horde', name: '蟲潮：每個房間都有蟲群', flag: 'wr_horde', fam: 'sea' },
  { id: 'wr_hunt', name: '追獵：附近的怪物都會直接衝向你', flag: 'wr_hunt', fam: 'sea' },
  { id: 'wr_colossus', name: '巨像：看守者與黃色精英生命 +80%', flag: 'wr_colossus', fam: 'boss' },
  { id: 'wr_guard', name: '護衛：看守者身邊多 3 隻黃色精英', flag: 'wr_guard', fam: 'boss' },
  { id: 'wr_thorn', name: '荊棘地：你的腳邊不斷長出荊棘', flag: 'wr_thorn', fam: 'move' },
];
for (const r of WORLD_RULES) { const m = Object.assign({ rule: true, q: 10, r: 10 }, r); MAP_MODS.push(m); MAP_MOD_BY_ID[m.id] = m; }
function depthRules(tier) {
  const P = G.P, n = depthRuleCount(tier); if (!P || !n) return [];
  P.deepRules = P.deepRules || {};
  if (!P.deepRules[tier] || P.deepRules[tier].length !== n) P.deepRules[tier] = WORLD_RULES.map(r => r.id).sort(() => Math.random() - 0.5).slice(0, n);
  return P.deepRules[tier];
}
function depthRulesReroll(tier) { if (G.P && G.P.deepRules) delete G.P.deepRules[tier]; }
const wrFlag = k => { const w = G.world; return !!(w && w.mm && w.mm.flags && w.mm.flags[k]); };
// 舊存檔：超過第 40 夜的收回來
Hook.on('start', P => { if (P.maxTier > DEPTH_MAX) P.maxTier = DEPTH_MAX; P.deepRules = P.deepRules || {}; });
Hook.on('enterMap', tier => {
  const w = G.world; if (!w || !w.mm || !w.mm.ids) return;
  const rs = w.mm.ids.filter(id => MAP_MOD_BY_ID[id] && MAP_MOD_BY_ID[id].rule);
  for (const id of rs) UI.msg('世界規則　' + MAP_MOD_BY_ID[id].name, '#ffb070');
});
Hook.on('kill', m => {
  const w = G.world;
  if (m.boss && !m.twin && w && !w.arena && w.tier === DEPTH_MAX && !G.P.depthEnd) { G.P.depthEnd = true; setTimeout(() => UI.banner('夢的盡頭', '第 40 夜的看守者倒下了。再往下，已經沒有夢。', '#ffe9a0'), 2500); }
  // 餘燼：死後 1 秒爆炸
  if (wrFlag('wr_blast') && !m.boss && m.dmg) (w.blasts = w.blasts || []).push({ x: m.x, y: m.y, t: 1, r: m.swarm ? 40 : 58, dmg: (m.dmg[0] + m.dmg[1]) / 2 * (m.swarm ? 0.5 : 0.9) });
});
// 巨像、護衛：這一區的怪放好之後
Hook.on('stage', w => {
  if (!w || !w.mm || !w.mm.flags) return;
  const b = G.mons.find(m => m.boss && !m.dead && !m.twin);
  if (w.mm.flags.wr_colossus) for (const m of G.mons) if ((m.boss || m.rarity === 'rare') && !m.colossus) { m.colossus = true; m.maxLife = Math.round(m.maxLife * 1.8); m.life = m.maxLife; }
  if (w.mm.flags.wr_guard && b) for (let i = 0; i < 3; i++) {
    const p = randomFloorNear(b.x + rnd(-90, 90), b.y + rnd(-70, 70), 40), g = makeMonster(pick(w.theme.monsters), p.x, p.y, w.mlvl + 2, 'rare', w.theme);
    g.name = '護衛・' + g.name; G.mons.push(g);
  }
});
Hook.on('update', dt => {
  const w = G.world, pl = G.pl; if (!w || !pl || !w.mm || !w.mm.flags) return;
  const F = w.mm.flags;
  if (w.blasts && w.blasts.length) {
    for (const b of w.blasts) if ((b.t -= dt) <= 0) {
      G.fx.push({ k: 'boom', x: b.x, y: b.y, r: b.r, t: 0, dur: 0.35 });
      if (Math.hypot(pl.x - b.x, pl.y - b.y) < b.r + pl.r && !(G.S && G.S.flags.wrEmber)) damagePlayer([[b.dmg, 'fire']], { spell: true });   // v2.17 餘燼搖籃：不會炸到你
    }
    w.blasts = w.blasts.filter(b => b.t > 0);
  }
  if (F.wr_hunt && G.time > (w.huntT || 0)) { w.huntT = G.time + 0.5; for (const m of G.mons) if (!m.aggro && !m.boss && Math.abs(m.x - pl.x) < 560 && Math.abs(m.y - pl.y) < 360) m.aggro = true; }
  if (F.wr_thorn && G.time > (w.thornT || 0)) {
    w.thornT = G.time + 2.2;
    if (!w.refDmg) { const m = G.mons.find(x => !x.dead && !x.boss && x.rarity === 'normal' && !x.swarm && x.dmg) || makeMonster(w.theme.monsters[0], 0, 0, w.mlvl, 'normal', w.theme); w.refDmg = (m.dmg[0] + m.dmg[1]) / 2; }   // v2.15 首領巢穴裡沒有小怪：用一隻參考怪算傷害
    const p = randomFloorNear(pl.x + rnd(-110, 110), pl.y + rnd(-80, 80), 30);
    if (w.refDmg) G.zones.push({ x: p.x, y: p.y, r: 44, dps: w.refDmg * 0.7, elem: 'chaos', t: 0, dur: 5, color: '#4aa04a' });
  }
});
// 餘燼的預警圈
Hook.on('drawWorld', g => {
  const w = G.world; if (!w || !w.blasts || !w.blasts.length) return;
  g.save();
  for (const b of w.blasts) {
    const k = 1 - b.t;
    g.strokeStyle = 'rgba(255,140,60,0.85)'; g.lineWidth = 1.5; g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,110,40,0.22)'; g.beginPath(); g.arc(b.x, b.y, b.r * k, 0, Math.PI * 2); g.fill();
  }
  g.restore();
});
(() => { const st = document.createElement('style'); st.textContent = `.mmods .mrule { color:#ffb070; border-color:#8a5a30; }`; document.head.appendChild(st); })();
