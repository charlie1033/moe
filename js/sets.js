// =============================================================
//  v2.17 套裝：「上一個我」留下的東西（呼應舊木箱上刻的「給下一個我」）
//  玩家看到：綠色名字的裝備（傳奇是橘色）。說明裡寫套裝名、身上穿了幾件、每個門檻的效果（還沒達到的是灰色），
//    最下面一句是「那一個我的遺言」。同一套穿到門檻件數就生效（效果在 seteffects.js）。
//  五套（件數／效果）：
//   ・大白的項圈（3）  2 件：靈狼多一隻，變成白色大狗　3 件：翻滾時所有召喚物撲向你面向的方向，落地炸一圈
//       項圈＝打霜牙巨獸時喊牠的名字（第三組呼叫 makeSetItem）、小王冠＝小雀送（第三組呼叫）、掌印＝深層夢境掉
//   ・第十二個我．逃兵（3）  2 件：移動 +15%，被打到後 2 秒內再 +25%　3 件：翻滾後留下殘影 3 秒，怪會去打它
//   ・第七十個我．書呆子（3）  2 件：換不同元素的技能放時回 4% 魔力　3 件：技能欄每有一種元素（物理火冰電毒），更多傷害 +10%
//       ↑ 這兩套：主線第 8 夜以後，黃色精英 0.4%、看守者 4% 掉一件（地圖稀有度加成會提高）
//   ・一百三十七夜（4，深層）  2 件：每死一次，下一張地圖更多傷害 +15%（最多 3 層）
//       4 件：生命歸零時進入 5 秒「殘夢」（不會受傷），殺滿 10 隻就滿血站起來（每張地圖一次）
//   ・書記的墨（3，深層）  2 件：每放一個跟上一招不同的技能，更多傷害 +6%（最多 5 層，放同一招歸零）
//       3 件：連續放 5 個不同的技能後，下一招不耗魔力而且多放一次
//       ↑ 深層（第 11 夜起）：黃色精英 0.3%、看守者 3% 掉一件（從深層件裡抽：這兩套＋大白的掌印）
//  資料：套裝物品＝rarity 'unique'＋item.set＝套裝代號＋item.uniqueId＝套件代號（套件登記在 UNIQUE_BY_ID，不進 UNIQUES，
//    所以不會被當一般傳奇隨機掉，也不進傳奇收藏冊）。底材跟著物品等級升到最高可用階（setBestBase，深層傳奇也用）。
//  v2.17.4：套裝另外骰 4 條一般詞綴（前後綴照稀有裝備規則；說明裡跟固定效果分開），不能用通貨改造（items.js 擋），
//    只能用重溫重骰數值；舊存檔的套裝讀檔時補骰（setUpgradeOld）。件數只算「不同的套件」，
//    戴第一百三十八枚指環（SET_RING_ID，資料在 sets6.js）時每一套有穿的 +1（兩枚不疊加），說明顯示「身上 5（+1）/ 6」。
//    六件套裝（2／4／6 件）四套在 sets6.js。
//  對外：SETS、SET_PIECES、makeSetItem(套件代號, 物品等級)、setCounts(P)、setBestBase(底材, 物品等級)、setRingBonus(P)、setAddAffixes(物品)
// =============================================================
RARITY_COLOR.set = '#5ad08a';
const SET_PIECES = {
  set_dabai_collar: { set: 'dabai', name: '褪色的狗項圈', base: 'amulet0', drop: 'gift', flavor: '叫牠的名字。牠一直在等。',
    mods: [['minion_life_inc', 20, 30], ['minion_dmg_inc', 15, 25], ['life', 20, 40]] },
  set_dabai_crown: { set: 'dabai', name: '生鏽的小王冠', base: 'helmet_es0', drop: 'gift', flavor: '公主的騎士，至少要戴得下她的王冠。',
    mods: [['minion_dmg_inc', 20, 30], ['res_cold', 20, 30], ['int', 10, 20]] },
  set_dabai_paw: { set: 'dabai', name: '雪白的掌印', base: 'gloves_ev0', drop: 'deep', flavor: '牠的腳印很大，可是走得很輕，怕吵醒她。',
    mods: [['minion_aspd_inc', 10, 15], ['cold_inc', 15, 25], ['dex', 10, 20]] },
  set_desert_boots: { set: 'deserter', name: '磨破的逃兵靴', base: 'boots_ev0', drop: 'main8', flavor: '我跑了。對不起，換你了。',
    mods: [['move_inc', 10, 15], ['evasion_inc', 20, 30], ['dex', 10, 20]] },
  set_desert_coat: { set: 'deserter', name: '拔掉徽章的外套', base: 'body_ev0', drop: 'main8', flavor: '徽章是我自己拔掉的。',
    mods: [['life', 40, 60], ['dodge', 3, 5], ['res_all', 8, 12]] },
  set_desert_belt: { set: 'deserter', name: '空水壺腰帶', base: 'belt0', drop: 'main8', flavor: '水喝完了，路還很長。',
    mods: [['flask_inc', 20, 30], ['life', 30, 40], ['move_inc', 4, 6]] },
  set_nerd_cap: { set: 'nerd', name: '裂了鏡片的書生帽', base: 'helmet_es0', drop: 'main8', flavor: '我算過了，一百三十八次之內一定會醒。',
    mods: [['spell_inc', 15, 25], ['mana', 30, 50], ['int', 15, 25]] },
  set_nerd_ring: { set: 'nerd', name: '計算尺戒指', base: 'ring0', drop: 'main8', flavor: '書上沒寫怎麼醒來，所以我自己寫。',
    mods: [['ele_inc', 15, 20], ['cspd_inc', 5, 8], ['int', 10, 15]] },
  set_nerd_gloves: { set: 'nerd', name: '寫滿筆記的手套', base: 'gloves_es0', drop: 'main8', flavor: '每一種火都有名字。我全記下來了。',
    mods: [['cdr', 5, 8], ['mana_regen_inc', 20, 30], ['res_all', 6, 10]] },
  set_n137_coat: { set: 'n137', name: '第一百三十七夜的睡袍', base: 'body_es0', drop: 'deep', flavor: '這次也沒醒。但我離門口更近了。',
    mods: [['life', 60, 80], ['es_inc', 20, 30], ['res_all', 12, 16]] },
  set_n137_shoes: { set: 'n137', name: '沒走完的鞋', base: 'boots_ar0', drop: 'deep', flavor: '鞋底磨穿的那天，我數到了一百三十七。',
    mods: [['move_inc', 12, 16], ['life', 40, 60], ['res_chaos', 15, 20]] },
  set_n137_button: { set: 'n137', name: '最後一顆鈕扣', base: 'amulet0', drop: 'deep', flavor: '如果你看得到這句話，就代表我又倒下了。起來。',
    mods: [['dmg_inc', 20, 30], ['all_attr', 10, 15], ['life', 30, 50]] },
  set_n137_ring: { set: 'n137', name: '刻著一百三十七的戒指', base: 'ring0', drop: 'deep', flavor: '一百三十七個醒來。第一百三十八個，留給你。',
    mods: [['crit_multi', 20, 30], ['life_on_kill', 10, 15], ['res_all', 8, 12]] },
  set_ink_hood: { set: 'ink', name: '墨染的頭巾', base: 'helmet_es0', drop: 'deep', flavor: '歐莉寫我，我也寫她。',
    mods: [['spell_inc', 25, 35], ['cspd_inc', 6, 10], ['mana', 40, 60]] },
  set_ink_gloves: { set: 'ink', name: '沾墨的手指套', base: 'gloves_ev0', drop: 'deep', flavor: '墨乾之前，把咒語念完。',
    mods: [['attack_inc', 20, 30], ['aspd_inc', 6, 10], ['dex', 15, 20]] },
  set_ink_pouch: { set: 'ink', name: '書記的筆袋', base: 'belt0', drop: 'deep', flavor: '最後一頁是空白的。那是你的。',
    mods: [['cdr', 6, 10], ['mana_regen_inc', 30, 40], ['life', 40, 60]] },
};
const SETS = {
  dabai: { name: '大白的項圈', bonus: [[2, 'setDabaiDog', '靈狼多一隻，而且變成白色的大狗'], [3, 'setDabaiPounce', '翻滾時，所有召喚物撲向你面向的方向，落地炸一圈']] },
  deserter: { name: '第十二個我．逃兵', bonus: [[2, 'setRun', '移動速度 +15%；被打到之後 2 秒內再 +25%'], [3, 'setDecoy', '翻滾後在原地留下殘影 3 秒，附近的怪物會去打它']] },
  nerd: { name: '第七十個我．書呆子', bonus: [[2, 'setNerdMana', '放出跟上一招不同元素的技能時，回復 4% 魔力'], [3, 'setNerdEle', '技能欄每有一種元素（物理、火、冰、電、毒），傷害 +10%（更多）']] },
  n137: { name: '一百三十七夜', bonus: [[2, 'setN137Die', '每死一次，下一張地圖傷害 +15%（更多，最多 3 層）'], [4, 'setN137Remnant', '生命歸零時進入 5 秒「殘夢」：這段時間不會受傷，殺滿 10 隻就滿血站起來（每張地圖一次）']] },
  ink: { name: '書記的墨', bonus: [[2, 'setInkStack', '每放一個跟上一招不同的技能，傷害 +6%（更多，最多 5 層，放同一招就歸零）'], [3, 'setInkFree', '連續放出 5 個不同的技能後，下一招不耗魔力，而且多放一次']] },
};
for (const id in SETS) SETS[id].pieces = Object.keys(SET_PIECES).filter(k => SET_PIECES[k].set === id);
for (const id in SET_PIECES) { const p = SET_PIECES[id]; if (BASE_BY_ID[p.base]) UNIQUE_BY_ID[id] = { id, name: p.name, base: p.base, flavor: p.flavor, mods: p.mods, set: p.set }; }
for (const id in SETS) for (const b of SETS[id].bonus) STAT_TEXT[b[1]] = STAT_TEXT[b[1]] || (() => b[2]);
// 同部位、同防禦種類裡，物品等級掉得出來的最高階底材（飾品沒有分階，原樣回傳）
function setBestBase(baseId, ilvl) {
  const b = BASE_BY_ID[baseId]; if (!b || !TIERED_SLOTS.has(b.slot)) return b;
  let best = b;
  for (const x of BASES) if (x.slot === b.slot && x.cls === b.cls && x.def === b.def && x.tier > best.tier && baseDropLvl(x) <= ilvl) best = x;
  return best;
}
function setRebase(it, b) { if (!b || b.id === it.base) return; it.base = b.id; it.implicit = b.implicit.map(x => ({ stat: x.stat, v: x.v })); }
const SET_RING_ID = 'u_ring138';   // v2.17.4 第一百三十八枚指環（資料在 sets6.js）：身上有穿的每一套都多算 1 件，兩枚不疊加
function setRingBonus(P) { return P && P.equip && Object.values(P.equip).some(it => it && it.uniqueId === SET_RING_ID) ? 1 : 0; }
// v2.17.4 套裝另外骰 4 條一般詞綴（照部位、物品等級，前後綴各最多 3 條，跟稀有裝備同一套規則）
const SET_AFFIX_N = 4;
function setRandCount(it) { return (it.mods || []).filter(m => m.type === 'p' || m.type === 's').length; }
function setAddAffixes(it) { for (let i = setRandCount(it); i < SET_AFFIX_N; i++) if (!addRandomAffix(it)) break; return it; }
function makeSetItem(pid, ilvl) {
  const p = SET_PIECES[pid]; if (!p || !UNIQUE_BY_ID[pid]) return null;
  ilvl = Math.max(1, Math.round(ilvl || 1));
  const it = makeUnique(pid, ilvl); it.set = p.set; setRebase(it, setBestBase(p.base, ilvl));
  return setAddAffixes(it);
}
// 件數：同一套「不同的套件」各算 1 件（同一件穿兩個不會算兩件）；戴著第一百三十八枚指環時，有穿的每一套 +1（最多到滿）
function setWornIds(P, sid) { return new Set(P && P.equip ? Object.values(P.equip).filter(x => x && x.set === sid).map(x => x.uniqueId) : []); }
function setCounts(P) {
  const n = {}; if (!P || !P.equip) return n;
  const plus = setRingBonus(P);
  for (const k in P.equip) { const it = P.equip[k]; if (it && it.set && SETS[it.set] && n[it.set] === undefined) n[it.set] = Math.min(SETS[it.set].pieces.length, setWornIds(P, it.set).size + plus); }
  return n;
}
// 舊存檔：v2.17.4 以前撿到的套裝沒有隨機詞綴，讀檔時補骰 4 條（身上、背包、倉庫）
function setUpgradeOld(P) {
  let eq = false; const fix = it => { if (it && it.set && it.rarity === 'unique' && !isStack(it) && setRandCount(it) === 0) { setAddAffixes(it); return true; } return false; };
  if (P) { for (const k in P.equip || {}) eq = fix(P.equip[k]) || eq; (P.inv || []).forEach(fix); }
  if (G.stash) for (const t of G.stash.tabs || []) (t || []).forEach(fix);
  return eq;
}
Hook.on('start', P => { if (setUpgradeOld(P)) onBuildChanged(); });
// 套裝效果的旗標（效果本身在 seteffects.js）
Hook.on('stats', (S, P) => {
  const n = setCounts(P);
  for (const id in n) for (const [need, flag] of SETS[id].bonus) if (n[id] >= need) S.flags[flag] = true;
});
// 物品說明：套裝名、穿了幾件、各門檻
ITEM_TIP_EXTRA.push(it => {
  const S0 = it.set && SETS[it.set]; if (!S0) return '';
  const P = G.P, worn = setWornIds(P, it.set), n0 = worn.size, L = S0.pieces.length;
  const plus = n0 > 0 && n0 < L ? setRingBonus(P) : 0, n = n0 + plus;   // v2.17.4 第一百三十八枚指環多算的那一件
  let h = `<div class="tip-sep"></div><div class="tip-mod c-set">套裝：${S0.name}（身上 ${n0}${plus ? '<span style="color:#ffb070">（+1）</span>' : ''} / ${L} 件）</div>`;
  if (plus) h += `<div class="tip-mod" style="font-size:11px;color:#ffb070">（+1）是「${UNIQUE_BY_ID[SET_RING_ID] ? UNIQUE_BY_ID[SET_RING_ID].name : '戒指'}」多算的那一件</div>`;
  h += `<div class="tip-mod" style="font-size:12px">${S0.pieces.map(k => `<span style="color:${worn.has(k) ? '#9af0b8' : '#6a7a70'}">${SET_PIECES[k].name}</span>`).join('、')}</div>`;
  for (const [need, , text] of S0.bonus) h += `<div class="tip-mod" style="color:${n >= need ? '#7aff9a' : '#6a6a6a'}">（${need} 件）${text}</div>`;
  return h;
});
// 掉落
const SET_DROP = { main8: Object.keys(SET_PIECES).filter(k => SET_PIECES[k].drop === 'main8'), deep: Object.keys(SET_PIECES).filter(k => SET_PIECES[k].drop === 'deep') };
function setDropRoll(m) {
  const w = G.world; if (!w || w.kind !== 'map' || w.arena || !(m.boss || m.rarity === 'rare')) return null;
  const t = w.tier || 0, k = 1 + ((w.mm && w.mm.r) || 0) / 200;
  if (t >= DEEP_TIER && Math.random() < (m.boss ? 0.03 : 0.003) * k) return pick(SET_DROP.deep);
  if (t >= 8 && Math.random() < (m.boss ? 0.04 : 0.004) * k) return pick(SET_DROP.main8);
  return null;
}
Hook.on('kill', m => { const pid = setDropRoll(m); if (pid) dropLoot(m.x, m.y, { item: makeSetItem(pid, m.mlvl) }); });
(() => { const st = document.createElement('style'); st.textContent = `.c-set { color:#5ad08a !important; } .tip-head.c-set { background:linear-gradient(#1a4a2a, #0c2414); border-color:#3a9a5a; }
  .cell.r-unique:has(.c-set), .gearbox.r-unique:has(.c-set) { background:radial-gradient(circle, rgba(80,200,120,.32), #08180e 72%); border-color:#3a9a5a; box-shadow:inset 0 0 8px rgba(80,220,130,.35); }`; document.head.appendChild(st); })();
