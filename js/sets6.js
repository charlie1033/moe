// =============================================================
//  v2.17.4 六件套裝（2／4／6 件）＋傳奇戒指「第一百三十八枚指環」
//  玩家看到：四套綠色的套裝，部位是頭盔、胸甲、手套、鞋子、腰帶、項鍊（戒指留給指環）。說明跟舊套裝一樣（sets.js 畫），
//    每件也有 4 條隨機詞綴、只能用重溫。效果在 sets6fx.js。
//   ・第五十個我．擋門的人（近戰）　2：近戰技能傷害 +20%（更多）、生命 +8%
//       4：站穩（不動時每 0.5 秒一層，最多 8 層；每層近戰更多傷害 +5%、被打到補回那一下的 4%；走動每 0.5 秒掉 2 層）
//       6：被打到就對身邊 140 內所有敵人反擊（武器物理 ×2，0.3 秒一次）；站穩滿 8 層時範圍 ×2、會震開
//   ・第九十一個我．點燈的人（法術）　2：法術傷害 +20%（更多）、魔力 +10%
//       4：放法術時，附近 100 內沒有燈就點一盞（最多 3 盞、8 秒）；每放一個法術，每盞燈朝最近的敵人射燈火（35% 傷害）
//       6：燈最多 5 盞、亮 12 秒；站在燈 150 內時，法術不用付魔力（也不用付生命）
//   ・第一百零三個我．射偏的那一箭（投射物）　2：投射物技能傷害 +20%（更多）、移動 +6%
//       4：投射物飛到盡頭或撞牆時掉頭飛回你身上，回程穿透（50% 傷害）
//       6：回程改成 100% 傷害；接住飛回來的投射物，每個讓下一次投射物技能多射 1 發（最多 5 發）
//   ・第八個我．點名的人（召喚）　2：每種召喚物上限 +1
//       4：放出不是召喚的技能時，每隻召喚物追打牠身邊最近的敵人一下（牠攻擊的 80%）
//       6：召喚物倒下 3 秒後在原地滿血站起來（每隻每 15 秒一次）
//  掉落：只在深層夢境（第 11 夜起，DEEP_TIER）的地圖：看守者 2%、黃色精英 0.2%（越深越多：每深一夜 ×1.03，最多 ×1.75；
//    再乘地圖稀有度加成 1＋r/200）。無盡爬塔每 5 層的寶箱另外 8% 給一件（每多 5 層 +2%，最多 20%）
//  第一百三十八枚指環（u_ring138）：身上有穿的每一套都多算 1 件（兩枚不疊加；件數計算在 sets.js 的 setCounts）。
//    只在深層掉：看守者 1.5%、黃色精英 0.1%（同樣乘越深倍率和稀有度加成）。登記在 UNIQUES（傳奇頁看得到），
//    noDrop＝不會從一般傳奇池、夢籤掉，也不算進收藏獎勵的分類
//  對外：SET6_IDS（四套代號）、set6DropRoll(怪) → 套件代號／指環代號／null、set6DropMul(夜數)
// =============================================================
Object.assign(SET_PIECES, {
  set_door_helm: { set: 'door', name: '缺角的門盔', base: 'helmet_ar0', drop: 'deep6', flavor: '門後面是她們。所以我不讓。', mods: [['armour_inc', 30, 50], ['life', 40, 60], ['str', 15, 25]] },
  set_door_body: { set: 'door', name: '頂過門閂的胸甲', base: 'body_ar0', drop: 'deep6', flavor: '我把背靠在門上，睡了三天。', mods: [['life', 70, 90], ['armour_inc', 30, 50], ['res_all', 10, 14]] },
  set_door_gloves: { set: 'door', name: '磨亮門把的手套', base: 'gloves_ar0', drop: 'deep6', flavor: '這扇門，我推了一百次，也守了一百次。', mods: [['melee_inc', 25, 35], ['aspd_inc', 6, 10], ['str', 10, 20]] },
  set_door_boots: { set: 'door', name: '釘在地上的靴子', base: 'boots_ar0', drop: 'deep6', flavor: '一步都不退。退了，就沒有門了。', mods: [['life', 40, 60], ['res_chaos', 15, 25], ['move_inc', 6, 10]] },
  set_door_belt: { set: 'door', name: '掛著鑰匙圈的腰帶', base: 'belt0', drop: 'deep6', flavor: '鑰匙留給你。門，我先幫你擋著。', mods: [['life', 50, 70], ['armour', 80, 140], ['flask_inc', 15, 25]] },
  set_door_amulet: { set: 'door', name: '門閂墜子', base: 'amulet0', drop: 'deep6', flavor: '第五十次，我沒有逃。', mods: [['phys_inc', 20, 30], ['str', 20, 30], ['life', 30, 50]] },
  set_lamp_helm: { set: 'lamp', name: '燻黑的燈罩帽', base: 'helmet_es0', drop: 'deep6', flavor: '燈快熄的時候，我就再點一次。', mods: [['spell_inc', 25, 35], ['mana', 40, 60], ['int', 15, 25]] },
  set_lamp_body: { set: 'lamp', name: '沾滿燈油的長袍', base: 'body_es0', drop: 'deep6', flavor: '牢房裡只有這盞燈。我把它帶進夢裡。', mods: [['es_inc', 30, 50], ['life', 50, 70], ['res_all', 10, 14]] },
  set_lamp_gloves: { set: 'lamp', name: '燙傷的手套', base: 'gloves_es0', drop: 'deep6', flavor: '火柴只剩三根，我用了兩根。', mods: [['cspd_inc', 8, 12], ['fire_inc', 20, 30], ['int', 10, 20]] },
  set_lamp_boots: { set: 'lamp', name: '踩過燭淚的鞋', base: 'boots_es0', drop: 'deep6', flavor: '我走過的路，都留著一點光。', mods: [['move_inc', 10, 14], ['mana_regen_inc', 30, 40], ['res_fire', 20, 30]] },
  set_lamp_belt: { set: 'lamp', name: '掛油壺的腰帶', base: 'belt0', drop: 'deep6', flavor: '油要省著用。你那一份，我放在角落。', mods: [['mana', 40, 60], ['life', 40, 60], ['cdr', 5, 8]] },
  set_lamp_amulet: { set: 'lamp', name: '最後一根火柴', base: 'amulet0', drop: 'deep6', flavor: '這一根留給你。點亮它，就不會迷路。', mods: [['ele_inc', 20, 30], ['spell_inc', 15, 25], ['int', 15, 25]] },
  set_arrow_helm: { set: 'arrow', name: '歪掉的瞄準帽', base: 'helmet_ev0', drop: 'deep6', flavor: '我瞄了很久。還是偏了一點。', mods: [['proj_inc', 20, 30], ['crit_inc', 20, 30], ['dex', 15, 25]] },
  set_arrow_body: { set: 'arrow', name: '插滿斷箭的皮甲', base: 'body_ev0', drop: 'deep6', flavor: '射出去的箭，我一支一支撿回來。', mods: [['life', 60, 80], ['evasion_inc', 30, 50], ['res_all', 10, 14]] },
  set_arrow_gloves: { set: 'arrow', name: '拉破弓弦的手套', base: 'gloves_ev0', drop: 'deep6', flavor: '那一箭如果射中了，你就不用來了。', mods: [['aspd_inc', 8, 12], ['attack_inc', 20, 30], ['dex', 10, 20]] },
  set_arrow_boots: { set: 'arrow', name: '追著箭跑的靴子', base: 'boots_ev0', drop: 'deep6', flavor: '箭飛多遠，我就追多遠。', mods: [['move_inc', 12, 16], ['dodge', 3, 5], ['res_cold', 20, 30]] },
  set_arrow_belt: { set: 'arrow', name: '空箭袋腰帶', base: 'belt0', drop: 'deep6', flavor: '最後一支，我沒有射。留給你。', mods: [['life', 40, 60], ['proj_inc', 15, 25], ['flask_inc', 15, 25]] },
  set_arrow_amulet: { set: 'arrow', name: '箭尾羽墜子', base: 'amulet0', drop: 'deep6', flavor: '偏了的箭會回來。人也會。', mods: [['crit_multi', 20, 30], ['dex', 20, 30], ['life', 30, 50]] },
  set_roll_helm: { set: 'roll', name: '夾著點名簿的帽子', base: 'helmet_es0', drop: 'deep6', flavor: '每天晚上點一次名。一個都不能少。', mods: [['minion_dmg_inc', 25, 35], ['life', 40, 60], ['int', 15, 25]] },
  set_roll_body: { set: 'roll', name: '背著大家的外套', base: 'body_es0', drop: 'deep6', flavor: '他們很重。可是我背得動。', mods: [['minion_life_inc', 25, 35], ['life', 60, 80], ['res_all', 10, 14]] },
  set_roll_gloves: { set: 'roll', name: '牽過很多手的手套', base: 'gloves_ev0', drop: 'deep6', flavor: '走散的，我都會回去找。', mods: [['minion_aspd_inc', 10, 15], ['minion_dmg_inc', 15, 25], ['dex', 10, 20]] },
  set_roll_boots: { set: 'roll', name: '走在最後面的鞋', base: 'boots_es0', drop: 'deep6', flavor: '我走最後面，這樣才看得到每一個。', mods: [['move_inc', 10, 14], ['minion_life_inc', 15, 25], ['res_chaos', 15, 25]] },
  set_roll_belt: { set: 'roll', name: '綁著名牌的腰帶', base: 'belt0', drop: 'deep6', flavor: '名字都寫在這裡了。也有你的。', mods: [['life', 50, 70], ['minion_dmg_inc', 15, 25], ['mana', 30, 50]] },
  set_roll_amulet: { set: 'roll', name: '一串小哨子', base: 'amulet0', drop: 'deep6', flavor: '吹一聲，他們就會回來。', mods: [['minion_dmg_inc', 20, 30], ['minion_life_inc', 20, 30], ['all_attr', 10, 15]] },
});
Object.assign(SETS, {
  door: { name: '第五十個我．擋門的人', bonus: [[2, 'setDoorMelee', '近戰技能傷害 +20%（更多），生命上限 +8%'],
    [4, 'setDoorStand', '站穩：站著不動時每 0.5 秒疊 1 層（最多 8 層）。每層近戰傷害 +5%（更多），被打到時立刻補回那一下傷害的 4%；一走動每 0.5 秒掉 2 層'],
    [6, 'setDoorRiposte', '擋門：每次被打到，對身邊所有敵人反擊一次（武器物理傷害 ×2，每 0.3 秒最多一次）；站穩滿 8 層時反擊範圍變 2 倍，還會把敵人震開']] },
  lamp: { name: '第九十一個我．點燈的人', bonus: [[2, 'setLampSpell', '法術傷害 +20%（更多），魔力上限 +10%'],
    [4, 'setLampLight', '留燈：放法術時，附近沒有燈就在腳下點一盞（最多 3 盞，亮 8 秒）。你每放一個法術，每一盞燈也朝最近的敵人射一團燈火（這一招 35% 的傷害）'],
    [6, 'setLampHome', '燈下：燈最多 5 盞、亮 12 秒；站在任何一盞燈旁邊時，法術不用付魔力（也不用付生命）']] },
  arrow: { name: '第一百零三個我．射偏的那一箭', bonus: [[2, 'setArrowProj', '投射物技能傷害 +20%（更多），移動速度 +6%'],
    [4, 'setArrowReturn', '回頭：投射物飛到盡頭或撞到牆時，會掉頭飛回你身上，回程穿透所有敵人（50% 傷害）'],
    [6, 'setArrowCatch', '接住：回程的投射物改成 100% 傷害。接住飛回來的投射物，每接一個，下一次投射物技能多射 1 發（最多疊 5 發）']] },
  roll: { name: '第八個我．點名的人', bonus: [[2, 'setRollMax', '每種召喚物的數量上限 +1'],
    [4, 'setRollCall', '跟上：你放出不是召喚的技能時，每一隻召喚物都對牠身邊最近的敵人追打一下（牠攻擊的 80%）'],
    [6, 'setRollRevive', '一個都不能少：召喚物倒下後，3 秒後在原地滿血站起來（每一隻每 15 秒一次）']] },
});
const SET6_IDS = ['door', 'lamp', 'arrow', 'roll'];
for (const id of SET6_IDS) {
  SETS[id].pieces = Object.keys(SET_PIECES).filter(k => SET_PIECES[k].set === id);
  for (const b of SETS[id].bonus) STAT_TEXT[b[1]] = STAT_TEXT[b[1]] || (() => b[2]);
}
for (const id in SET_PIECES) { const p = SET_PIECES[id]; if (SET6_IDS.includes(p.set) && BASE_BY_ID[p.base] && !UNIQUE_BY_ID[id]) UNIQUE_BY_ID[id] = { id, name: p.name, base: p.base, flavor: p.flavor, mods: p.mods, set: p.set }; }
// —— 第一百三十八枚指環 ——
FLAG_STATS.add('setPlusOne');
STAT_TEXT.setPlusOne = () => '你身上每一套已經穿著至少 1 件的套裝，都多算 1 件（戴兩枚也只多算 1 件）';
(() => {
  const u = { id: SET_RING_ID, name: '第一百三十八枚指環', base: 'ring0', noDrop: true, dropNote: '只在深層夢境（第 11 夜起）掉落，看守者掉的機會比較高',
    flavor: '每一套都少一件。少的那一件，是你。', mods: [['setPlusOne'], ['all_attr', 8, 14], ['res_all', 8, 12], ['life', 30, 50]] };
  if (!UNIQUE_BY_ID[u.id] && BASE_BY_ID[u.base]) { UNIQUES.push(u); UNIQUE_BY_ID[u.id] = u; }
})();
ITEM_TIP_EXTRA.push(it => {
  if (!it || it.uniqueId !== SET_RING_ID) return '';
  const P = G.P, on = P && Object.values(P.equip || {}).includes(it);
  if (!on) return '<div class="tip-mod" style="font-size:12px;color:#8a9a90">戴上之後，套裝說明的件數會顯示（+1）</div>';
  const rows = Object.keys(SETS).map(id => [id, setWornIds(P, id).size]).filter(([id, n]) => n > 0 && n < SETS[id].pieces.length);
  return rows.length ? `<div class="tip-mod" style="font-size:12px;color:#9af0b8">現在多算：${rows.map(([id, n]) => `${SETS[id].name} ${n}→${n + 1} 件`).join('、')}</div>` : '';
});
// —— 掉落 ——
const SET6_DROP = Object.keys(SET_PIECES).filter(k => SET_PIECES[k].drop === 'deep6');
function set6DropMul(t) { return Math.min(1.75, Math.pow(1.03, Math.max(0, t - DEEP_TIER))); }
function set6DropRoll(m) {
  const w = G.world; if (!w || w.kind !== 'map' || w.arena || !(m.boss || m.rarity === 'rare')) return null;
  const t = w.tier || 0; if (t < DEEP_TIER) return null;
  const k = set6DropMul(t) * (1 + ((w.mm && w.mm.r) || 0) / 200);
  if (Math.random() < (m.boss ? 0.015 : 0.001) * k) return SET_RING_ID;
  if (Math.random() < (m.boss ? 0.02 : 0.002) * k) return pick(SET6_DROP);
  return null;
}
Hook.on('kill', m => {
  const w = G.world; if (!w) return;
  const R = w.rush;
  if (R && m.boss) {   // 無盡爬塔：climb.js 的寶箱剛掉（這個檔排在 climb.js 後面，R.cleared 已經更新）
    if (R.cleared && R.cleared % 5 === 0 && Math.random() < Math.min(0.2, 0.08 + 0.02 * (R.cleared / 5 - 1))) dropLoot(m.x, m.y, { item: makeSetItem(pick(SET6_DROP), w.mlvl + 4) });
    return;
  }
  const id = set6DropRoll(m); if (!id) return;
  dropLoot(m.x, m.y, { item: id === SET_RING_ID ? makeUnique(id, m.mlvl) : makeSetItem(id, m.mlvl) });
});
