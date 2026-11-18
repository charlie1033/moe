// =============================================================
//  v2.17 深層傳奇＋世界規則專屬傳奇
//  ① 深層傳奇：第 21 夜以後掉到地上的傳奇（套裝不算），底材自動換成同部位、同防禦種類裡掉得出來的最高階，
//     再多一條一般詞綴（前綴或後綴，照物品等級骰）。說明裡多一行「深層傳奇」。已經在背包、倉庫裡的舊傳奇不動。
//     做法：'dropItem' 事件（game.js 的 dropLoot 發）。資料：item.deep = true
//  ② 世界規則專屬傳奇（每條規則一件，u.wr＝規則代號）：只在帶那條規則的夜掉
//     ・那一夜任何掉落骰到傳奇時，30% 是當晚規則的專屬傳奇（items.js randomItem）
//     ・那一夜的看守者另外 8% 掉一件（從當晚的規則裡抽）
//     餘燼搖籃（戒指）    你殺的怪 1 秒後原地爆炸，炸傷附近的怪（牠最大生命 10%）；餘燼規則的爆炸不會傷到你
//     蟲后的低語（頭盔）  蟲群的怪死掉時 25% 變成你的小蟲，替你咬 6 秒（最多 8 隻）
//     獵物之鈴（項鍊）    身邊 200 內每有一隻怪，你的傷害 +2%（更多，最多 +60%）
//     巨人的骨頭（手套）  打倒黃色精英或看守者，這張地圖內生命 +8%、傷害 +8%（更多，最多 5 層）
//     叛變的護衛徽章（胸甲）護衛黃怪倒下時，20 秒內傷害 +15%（更多，最多 3 層，再殺一隻會續時間）
//     荊棘之履（鞋子）    荊棘地長出的荊棘改成刺怪（你主技能 30%／0.5 秒），站在荊棘上移動 +15%
// =============================================================
const DEEP_UNIQ_TIER = 21;
Hook.on('dropItem', it => {
  const w = G.world;
  if (!it || it.rarity !== 'unique' || it.set || it.deep || !w || w.kind !== 'map' || w.arena || (w.tier || 0) < DEEP_UNIQ_TIER) return;
  setRebase(it, setBestBase(it.base, it.ilvl));
  const a = rollAffix(it, Math.random() < 0.5 ? 'p' : 's') || rollAffix(it, 'p') || rollAffix(it, 's');
  if (a) it.mods.push(a);
  it.deep = true;
});
ITEM_TIP_EXTRA.push(it => it.deep ? '<div class="tip-mod" style="color:#c8a0ff">深層傳奇：底材升到最高階，多一條詞綴</div>' : '');
// —— 世界規則專屬傳奇 ——
const WR_UNIQUES = [
  { id: 'u_wr_ember', name: '餘燼搖籃', base: 'ring0', wr: 'wr_blast', flavor: '它們燒完了，換你點火。', mods: [['wrEmber'], ['fire_inc', 25, 35], ['res_fire', 30, 40]] },
  { id: 'u_wr_hive', name: '蟲后的低語', base: 'helmet_ev0', wr: 'wr_horde', flavor: '一千隻，都聽得懂你的話。', mods: [['wrHive'], ['minion_dmg_inc', 25, 35], ['life', 40, 60]] },
  { id: 'u_wr_bell', name: '獵物之鈴', base: 'amulet0', wr: 'wr_hunt', flavor: '鈴一響，牠們就來了。正好。', mods: [['wrBell'], ['life', 40, 60], ['res_all', 10, 15]] },
  { id: 'u_wr_giant', name: '巨人的骨頭', base: 'gloves_ar0', wr: 'wr_colossus', flavor: '吃掉巨人的人，會變成巨人。', mods: [['wrGiant'], ['phys_inc', 25, 35], ['str', 20, 30]] },
  { id: 'u_wr_traitor', name: '叛變的護衛徽章', base: 'body_ar0', wr: 'wr_guard', flavor: '他們守了一輩子的王，最後選了你。', mods: [['wrTraitor'], ['life', 60, 80], ['armour_inc', 30, 50]] },
  { id: 'u_wr_thorn', name: '荊棘之履', base: 'boots_ev0', wr: 'wr_thorn', flavor: '荊棘認得穿這雙鞋的人。', mods: [['wrThorn'], ['move_inc', 15, 20], ['res_chaos', 20, 30]] },
];
for (const f of ['wrEmber', 'wrHive', 'wrBell', 'wrGiant', 'wrTraitor', 'wrThorn']) FLAG_STATS.add(f);
Object.assign(STAT_TEXT, {
  wrEmber: () => '你殺死的怪物 1 秒後原地爆炸，炸傷附近的怪物（牠最大生命的 10%）；「餘燼」規則的爆炸不會傷到你',
  wrHive: () => '蟲群的怪物死掉時，25% 變成你的小蟲替你咬 6 秒（最多 8 隻）',
  wrBell: () => '身邊每有一隻怪物，你的傷害 +2%（更多，最多 +60%）',
  wrGiant: () => '打倒黃色精英或看守者，這張地圖內生命 +8%、傷害 +8%（更多，最多 5 層）',
  wrTraitor: () => '護衛黃怪倒下時，20 秒內傷害 +15%（更多，最多 3 層）',
  wrThorn: () => '「荊棘地」長出的荊棘改成刺怪物；站在荊棘上移動速度 +15%',
});
for (const u of WR_UNIQUES) if (!UNIQUE_BY_ID[u.id] && BASE_BY_ID[u.base]) { UNIQUES.push(u); UNIQUE_BY_ID[u.id] = u; }
ITEM_TIP_EXTRA.push(it => { const u = UNIQUE_BY_ID[it.uniqueId]; if (!u || !u.wr) return ''; const r = WORLD_RULES.find(x => x.id === u.wr); return r ? `<div class="tip-mod" style="color:#ffb070">只在帶「${r.name.split('：')[0]}」規則的夜掉落</div>` : ''; });
const DWF = k => G.S && G.S.flags && G.S.flags[k];
let _wrBellN = 0, _wrBellT = 0, _wrTrT = 0, _wrTrN = 0, _wrOnThorn = false;
const _wrEmbers = [];
Hook.on('stats', S => {
  const F = S.flags, w = G.world;
  if (F.wrBell && _wrBellN) S.more_dmg *= 1 + Math.min(0.6, 0.02 * _wrBellN);
  if (F.wrGiant && w && w.wrGiant) { S.more_dmg *= 1 + 0.08 * w.wrGiant; S.maxLife = Math.round(S.maxLife * (1 + 0.08 * w.wrGiant)); }
  if (F.wrTraitor && _wrTrT > 0) S.more_dmg *= 1 + 0.15 * _wrTrN;
  if (F.wrThorn && _wrOnThorn) S.moveSpeed *= 1.15;
});
Hook.on('kill', m => {
  const w = G.world; if (!w || !G.pl) return;
  // 看守者在規則夜：8% 掉當晚的專屬傳奇
  if (m.boss && !m.twin && w.kind === 'map' && !w.arena && Math.random() < 0.08 * (1 + ((w.mm && w.mm.r) || 0) / 200)) {
    const pool = WR_UNIQUES.filter(u => UNIQUE_BY_ID[u.id] && wrFlag(u.wr)); if (pool.length) dropLoot(m.x, m.y, { item: makeUnique(pick(pool).id, m.mlvl) });
  }
  if (DWF('wrEmber') && m.maxLife) _wrEmbers.push({ x: m.x, y: m.y, t: 1, v: m.maxLife * 0.1 });
  if (DWF('wrHive') && m.swarm && Math.random() < 0.25 && G.mins.filter(x => x.mtype === 'bug').length < 8) {
    const d = m.dmg || [3, 6];
    G.mins.push({ kind: 'min', mtype: 'bug', sprite: (m.def && m.def.sprite) || 'minion', tint: { k: '#1a3a10' }, x: m.x, y: m.y, r: m.r || 8, life: Math.round(m.maxLife), maxLife: Math.round(m.maxLife),
      dmg: [d[0] * 3, d[1] * 3], aps: 1.5, atkCD: 0.2, facing: 1, flash: 0, speed: 190, ranged: 0, taunt: false, count: 1, temp: 6 });
    burst(m.x, m.y, '#a0e060', 10, 110);
  }
  if (DWF('wrGiant') && (m.boss || m.rarity === 'rare') && (w.wrGiant || 0) < 5) { w.wrGiant = (w.wrGiant || 0) + 1; onBuildChanged(); UI.msg(`巨人的骨頭：第 ${w.wrGiant} 層`, '#ffb070'); }
  if (DWF('wrTraitor') && m.name && m.name.startsWith('護衛・')) { _wrTrN = Math.min(3, (_wrTrT > 0 ? _wrTrN : 0) + 1); _wrTrT = 20; onBuildChanged(); UI.msg(`叛變的護衛：傷害 +${_wrTrN * 15}%`, '#ffb070'); }
});
Hook.on('update', dt => {
  const pl = G.pl; if (!pl || !G.S) return;
  // 餘燼搖籃：延遲爆炸
  for (let i = _wrEmbers.length - 1; i >= 0; i--) { const e = _wrEmbers[i]; if ((e.t -= dt) > 0) continue; _wrEmbers.splice(i, 1);
    G.fx.push({ k: 'boom', x: e.x, y: e.y, r: 60, t: 0, dur: 0.35 });
    for (const m of G.mons) if (!m.dead && !m.hidden && Math.hypot(m.x - e.x, m.y - e.y) <= 60 + m.r) hitMonster(m, { d: { fire: [e.v * 0.8, e.v * 1.2] }, crit: 0, multi: 100, ail: {} }, false, pl, 0.4); }
  // 獵物之鈴：每 0.5 秒數一次身邊的怪
  if (DWF('wrBell') && (_wrBellT -= dt) <= 0) { _wrBellT = 0.5; let n = 0; for (const m of G.mons) if (!m.dead && !m.hidden && Math.abs(m.x - pl.x) < 200 && Math.abs(m.y - pl.y) < 200 && dist(m, pl) < 200) n++; n = Math.min(30, n); if (n !== _wrBellN) { _wrBellN = n; onBuildChanged(); } }
  if (_wrTrT > 0 && (_wrTrT -= dt) <= 0) { _wrTrT = 0; _wrTrN = 0; onBuildChanged(); }
  // 荊棘之履：把荊棘地（depths.js 放的 '#4aa04a' 地面）改成替你刺怪
  if (DWF('wrThorn')) {
    for (let i = G.zones.length - 1; i >= 0; i--) { const z = G.zones[i]; if (z.color !== '#4aa04a' || z.elem !== 'chaos') continue; G.zones.splice(i, 1);
      G.azones.push({ sid: 'wrthorn', x: z.x, y: z.y, r: z.r, t: 0, dur: z.dur - (z.t || 0), tick: 0.5, next: 0.2, pk: buPk(0.3, 'chaos'), color: '#6ad06a' }); }
    const on = G.azones.some(z => z.sid === 'wrthorn' && Math.hypot(z.x - pl.x, z.y - pl.y) < z.r);
    if (on !== _wrOnThorn) { _wrOnThorn = on; onBuildChanged(); }
  } else _wrOnThorn = false;
});
Hook.on('enterMap', () => { _wrEmbers.length = 0; _wrTrT = 0; _wrTrN = 0; _wrBellN = 0; });
