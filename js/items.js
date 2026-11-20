// =============================================================
//  裝備生成、詞綴骰值、工藝石、角色數值計算
// =============================================================
let UID_SEQ = Math.floor(Math.random() * 1e6) * 1000;
const newUid = () => ++UID_SEQ;
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function wpick(list, wf) {
  let tot = 0; for (const x of list) tot += wf(x);
  let r = Math.random() * tot;
  for (const x of list) { r -= wf(x); if (r <= 0) return x; }
  return list[list.length - 1];
}
const RARITY_NAME = { normal: '普通', magic: '魔法', rare: '稀有', unique: '傳奇' };
// v2.17.4 顯示用的稀有度：套裝（item.set）一律算 'set'（綠色，class c-set），其他照 rarity
function itemRarityKey(it) { return it && it.set ? 'set' : it && it.rarity; }
function itemColor(it) { return RARITY_COLOR[itemRarityKey(it)] || RARITY_COLOR[it && it.rarity] || '#d8d8d8'; }

// ---------- 詞綴骰值 ----------
function eligibleAffixes(item, type) {
  const base = BASE_BY_ID[item.base];
  const have = new Set(item.mods.map(m => m.id));
  return AFFIXES.filter(a => a.type === type && a.classes.includes(base.cls) && !have.has(a.id)
    && a.tiers[0][0] <= item.ilvl
    && !(a.local && a.id.startsWith('def') && !base.def));
}
function rollAffix(item, type) {
  const pool = eligibleAffixes(item, type);
  if (!pool.length) return null;
  const a = pick(pool);
  const base = BASE_BY_ID[item.base];
  const tiers = a.tiers.map((t, i) => ({ t, i })).filter(x => x.t[0] <= item.ilvl);
  const ch = wpick(tiers, x => x.i === tiers.length - 1 && tiers.length > 1 ? 0.5 : 1);
  return { id: a.id, type, tier: a.tiers.length - ch.i, stat: a.stat, v: rollValue(a, ch.i, base) };
}
// 在某一階詞綴的範圍內骰數值
function rollValue(a, idx, base) {
  let mult = 1;
  if (a.twoHandMult && base.hands === 2) mult *= a.twoHandMult;
  if (a.nonWeaponMult && base.slot !== 'weapon') mult *= a.nonWeaponMult;
  if (a.id === 'def_flat' && base.def === 'es') mult *= 0.35;
  const t = a.tiers[idx];
  if (t.length === 5) {
    const lo = Math.max(1, Math.round(rint(t[1], t[2]) * mult));
    const hi = Math.max(lo + 1, Math.round(rint(t[3], t[4]) * mult));
    return [lo, hi];
  }
  if (a.decimal) return Math.round(rnd(t[1], t[2]) * mult * 10) / 10;
  return Math.max(1, Math.round(rint(t[1], t[2]) * mult));
}
function rollUniqueValue(md) {
  if (md.length === 1) return true;
  if (Array.isArray(md[1])) return [rint(md[1][0], md[1][1]), rint(md[2][0], md[2][1])];
  const dec = md[1] % 1 !== 0 || md[2] % 1 !== 0;
  return dec ? Math.round(rnd(md[1], md[2]) * 10) / 10 : rint(md[1], md[2]);
}
function addRandomAffix(item) {
  const p = item.mods.filter(m => m.type === 'p').length, s = item.mods.filter(m => m.type === 's').length;
  const maxEach = item.rarity === 'magic' ? 1 : 3;
  const opts = [];
  if (p < maxEach) opts.push('p');
  if (s < maxEach) opts.push('s');
  while (opts.length) {
    const type = opts.splice(Math.floor(Math.random() * opts.length), 1)[0];
    const mod = rollAffix(item, type);
    if (mod) { item.mods.push(mod); return true; }
  }
  return false;
}
function rollMods(item) {
  item.mods = [];
  if (item.rarity === 'magic') {
    const n = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < n; i++) addRandomAffix(item);
    if (!item.mods.length) addRandomAffix(item);
  } else if (item.rarity === 'rare') {
    const n = wpick([3, 4, 5, 6], x => ({ 3: 2, 4: 4, 5: 3, 6: 1 })[x]);
    for (let i = 0; i < n; i++) addRandomAffix(item);
  }
  nameItem(item);
}

// ---------- 命名 ----------
const RARE_W1 = ['暗影', '血腥', '霜冷', '雷鳴', '腐朽', '永恆', '狂怒', '寂靜', '末日', '星辰', '幽魂', '熾焰', '荒野', '鋼鐵', '毒蛇', '古龍', '黎明', '深淵', '風暴', '鴉羽'];
const RARE_W2 = {
  weapon: ['之牙', '裂痕', '之刃', '低語', '之怒', '收割', '咬痕'],
  armour: ['守護', '外殼', '之盾', '堡壘', '之皮', '庇護', '之鱗'],
  jewel: ['之眼', '之結', '之環', '印記', '之心', '之淚', '之誓'],
};
function nameItem(item) {
  const base = BASE_BY_ID[item.base];
  if (item.rarity === 'normal') item.name = base.name;
  else if (item.rarity === 'magic') {
    const p = item.mods.find(m => m.type === 'p'), s = item.mods.find(m => m.type === 's');
    const pn = p ? AFFIX_BY_ID[p.id].names[AFFIX_BY_ID[p.id].tiers.length - p.tier] : '';
    const sn = s ? AFFIX_BY_ID[s.id].names[AFFIX_BY_ID[s.id].tiers.length - s.tier] : '';
    item.name = `${pn}${base.name}${sn}`;
  } else if (item.rarity === 'rare') {
    const grp = base.slot === 'weapon' ? 'weapon' : ['amulet', 'ring', 'belt'].includes(base.slot) ? 'jewel' : 'armour';
    item.name = pick(RARE_W1) + pick(RARE_W2[grp]);
  }
}

// ---------- 建立物品 ----------
// ---------- 珠寶插槽 ----------
function socketMax(base) {
  if (base.slot === 'weapon') return base.hands === 2 ? SOCKET_MAX.weapon2 : SOCKET_MAX.weapon1;
  return SOCKET_MAX[base.slot] || 0;
}
// 掉落時隨機幾個孔：0 孔 35%、1 孔 35%、2 孔 20%、3 孔 10%（超過部位上限就取上限）
function rollSockets(base) {
  const n = wpick([0, 1, 2, 3], x => [35, 35, 20, 10][x]);
  return Array(Math.min(n, socketMax(base))).fill(null);
}
function makeItem(baseId, rarity, ilvl) {
  const base = BASE_BY_ID[baseId];
  const item = { uid: newUid(), base: baseId, rarity, ilvl, mods: [], implicit: base.implicit.map(x => ({ stat: x.stat, v: x.v })), sockets: rollSockets(base) };
  rollMods(item);
  return item;
}
function makeUnique(uid, ilvl) {
  const u = UNIQUE_BY_ID[uid];
  const item = { uid: newUid(), base: u.base, rarity: 'unique', ilvl, uniqueId: uid, name: u.name, mods: [],
    implicit: BASE_BY_ID[u.base].implicit.map(x => ({ stat: x.stat, v: x.v })), sockets: rollSockets(BASE_BY_ID[u.base]) };
  for (const md of u.mods) item.mods.push({ type: 'u', stat: md[0], v: rollUniqueValue(md) });
  return item;
}
// 挑基底：武器、副手、防具看「地圖等級」決定能掉哪幾階（越高階權重越低）；飾品看物品等級
const TIERED_SLOTS = new Set(['weapon', 'offhand', 'helmet', 'body', 'gloves', 'boots']);
// v2.5.4 原初（第 6 階）的圖示顏色：白金
if (typeof METAL !== 'undefined' && METAL.length < 6) { METAL.push('#fff4d8'); LEATHER.push('#e8d8b0'); CLOTH.push('#f0e8ff'); }
function currentGrade() { return (G.world && G.world.grade) || 1; }
function pickBase(ilvl, grade) {
  grade = grade || currentGrade();
  // v2.5.4：基底看「物品等級」決定掉不掉（物品等級＝打倒的怪物等級）
  const pool = BASES.filter(b => TIERED_SLOTS.has(b.slot) ? baseDropLvl(b) <= ilvl : b.lvl <= ilvl);
  const slotW = { weapon: 3, offhand: 1.2, helmet: 1.2, body: 1.2, gloves: 1.2, boots: 1.2, amulet: 0.8, ring: 1.2, belt: 0.8 };
  const bySlot = {};
  pool.forEach(b => (bySlot[b.slot] = bySlot[b.slot] || []).push(b));
  const slot = wpick(Object.keys(bySlot), s => slotW[s]);
  return wpick(bySlot[slot], b => TIERED_SLOTS.has(b.slot) ? BASE_TIER_WEIGHT[b.tier] : (ilvl - b.lvl < 18 ? 3 : 1));
}
// bonus：稀有度加成倍率（魔法怪 / 稀有怪 / 首領 會更高）
function randomItem(ilvl, bonus = 1) {
  const r = Math.random();
  const pU = 0.006 * bonus, pR = 0.07 * bonus, pM = 0.30 * Math.min(bonus, 2);
  if (r < pU) {
    // v2.17 世界規則專屬傳奇（u.wr）只在帶那條規則的夜掉，而且那一夜掉傳奇時有 30% 是它
    const pool = UNIQUES.filter(u => !u.boss && !u.noDrop && (!u.wr || (typeof wrFlag === 'function' && wrFlag(u.wr))) && BASE_BY_ID[u.base].lvl <= ilvl + 3);
    const wrp = pool.filter(u => u.wr);
    if (wrp.length && Math.random() < 0.3) return makeUnique(pick(wrp).id, ilvl);
    if (pool.length) return makeUnique(pick(pool).id, ilvl);
  }
  const base = pickBase(ilvl);
  const rarity = r < pU + pR ? 'rare' : r < pU + pR + pM ? 'magic' : 'normal';
  return makeItem(base.id, rarity, ilvl);
}
// 珠寶掉落：怪物等級越高，掉的階級越高（最高只到第 5 階，第 6–8 階要合成）
function randomJewel(mlvl, boost = 0) {
  const maxG = Math.max(1, Math.min(JEWEL_DROP_MAX, 1 + Math.floor(mlvl / 14) + boost));
  const cands = [maxG - 2, maxG - 1, maxG].filter(x => x >= 1);
  const g = wpick(cands, x => x === maxG ? 1 : x === maxG - 1 ? 3 : 2);
  return jewelKey(pick(Object.keys(JEWELS)), g);
}
// ---------- 藥劑（放在一般背包裡的物品，可以賣、可以放倉庫） ----------
const isFlask = it => !!(it && it.flask);
function makeFlask(type, tier, rarity = 'normal') {
  const f = { uid: newUid(), flask: true, type, tier, rarity, ilvl: tier, mods: [], implicit: [], sockets: [] };
  if (rarity === 'magic') rollFlaskMods(f); else nameFlask(f);
  return f;
}
function flaskModOK(f, a) {
  const F = FLASKS[f.type];
  return !a.only || (a.only === 'heal' && F.heal) || (a.only === 'buff' && !F.heal) || (a.only === 'life' && F.heal === 'life');
}
function rollFlaskModValue(f, a) {
  // 高階藥劑比較容易骰到高數值
  const top = Math.min(1, 0.45 + f.tier * 0.11);
  return Math.round(a.r[0] + (a.r[1] - a.r[0]) * Math.random() * top);
}
function addFlaskMod(f, type) {
  const have = new Set(f.mods.map(m => m.id));
  const types = type ? [type] : ['p', 's'].filter(t => !f.mods.some(m => m.type === t));
  const pool = FLASK_MODS.filter(a => types.includes(a.type) && !have.has(a.id) && flaskModOK(f, a) && !f.mods.some(m => m.type === a.type));
  if (!pool.length) return false;
  const a = pick(pool);
  f.mods.push({ id: a.id, type: a.type, v: rollFlaskModValue(f, a) });
  return true;
}
function rollFlaskMods(f) {
  f.mods = [];
  if (Math.random() < 0.45) { addFlaskMod(f, 'p'); addFlaskMod(f, 's'); }
  else addFlaskMod(f);
  if (!f.mods.length) addFlaskMod(f);
  nameFlask(f);
}
function nameFlask(f) {
  const p = f.mods.find(m => m.type === 'p'), s = f.mods.find(m => m.type === 's');
  f.name = `${p ? FLASK_MOD_BY_ID[p.id].name : ''}${FLASK_TIER_NAME[f.tier - 1]}${FLASKS[f.type].name}${s ? FLASK_MOD_BY_ID[s.id].name : ''}`;
}
// 一瓶藥劑最後的能力（詞綴算進去）
function flaskStats(f) {
  const F = FLASKS[f.type], m = {};
  for (const x of f.mods) m[x.id] = x.v;
  return {
    max: Math.round(F.max[f.tier - 1] * (1 + (m.f_max || 0) / 100)),
    use: Math.max(1, Math.round(F.use * (1 - (m.f_use || 0) / 100))),
    val: F.vals[f.tier - 1] * (1 + (m.f_eff || 0) / 100) * (m.f_inst ? 0.75 : 1) * (m.f_bubble ? 0.9 : 1),
    bubble: !!m.f_bubble, panic: !!m.f_panic,
    dur: F.heal ? F.dur : F.dur * (1 + (m.f_dur || 0) / 100),
    kill: 1 + (m.f_kill || 0) / 100, auto: 1 + (m.f_auto || 0) / 100,
    free: m.f_free || 0, inst: !!m.f_inst, emerg: m.f_emerg || 0, reso: m.f_reso || 0,
  };
}
function flaskTipHTML(f, opts = {}) {
  const F = FLASKS[f.type], st = flaskStats(f);
  const durTxt = st.inst ? '立刻' : `${Math.round(st.dur * 10) / 10}`;
  let h = `<div class="tip-head c-${f.rarity}"><div class="tip-name">${f.name}</div></div>`;
  h += `<div class="tip-sub">藥劑 · ${RARITY_NAME[f.rarity]} · ${FLASK_TIER_NAME[f.tier - 1]}（第 ${f.tier} 級）</div>`;
  h += `<div class="tip-prop" style="color:${F.color}">${st.inst ? F.desc(Math.round(st.val), '').replace(' 秒內', '立刻') : F.desc(Math.round(st.val), durTxt)}</div>`;
  h += `<div class="tip-prop">充能 ${st.max}，每次喝用 ${st.use}（可以喝 ${Math.floor(st.max / st.use)} 次）</div>`;
  if (f.mods.length) {
    h += '<div class="tip-sep"></div>';
    for (const m of f.mods) h += `<div class="tip-mod">${FLASK_MOD_BY_ID[m.id].text(m.v)}<span class="tip-tier">${m.type === 'p' ? '前綴' : '後綴'}</span></div>`;
  }
  h += '<div class="tip-sep"></div><div class="tip-mod" style="color:#a89878">同種藥劑效果不疊加，不同種可以同時生效。能用蛻變、改造、增幅、剝離、重鑄、神聖石改造。</div>';
  if (opts.hint) h += `<div class="tip-hint">${opts.hint}</div>`;
  return h;
}
function applyFlaskCurrency(cur, f) {
  if (!FLASK_CURRENCY.has(cur)) return '藥劑只能用蛻變、改造、增幅、剝離、重鑄、神聖石';
  switch (cur) {
    case 'transmute': if (f.rarity !== 'normal') return '只能用在普通藥劑'; f.rarity = 'magic'; rollFlaskMods(f); break;
    case 'alter': if (f.rarity !== 'magic') return '只能用在魔法藥劑'; rollFlaskMods(f); break;
    case 'aug': if (f.rarity !== 'magic') return '只能用在魔法藥劑';
      if (f.mods.length >= 2) return '藥劑最多 2 條詞綴'; if (!addFlaskMod(f)) return '沒有可以加的詞綴'; nameFlask(f); break;
    case 'annul': if (!f.mods.length) return '沒有可以移除的詞綴'; f.mods.splice(Math.floor(Math.random() * f.mods.length), 1); nameFlask(f); break;
    case 'scour': if (f.rarity === 'normal') return '已經是普通藥劑'; f.rarity = 'normal'; f.mods = []; nameFlask(f); break;
    case 'divine': if (!f.mods.length) return '這瓶藥劑沒有可以重骰的詞綴'; f.mods.forEach(m => { m.v = rollFlaskModValue(f, FLASK_MOD_BY_ID[m.id]); }); break;
  }
  return null;
}
// =============================================================
//  v1.4 工坊：分解得到材料、用材料製作裝備、改造裝備
// =============================================================
// v2.7 製作、改造會連倉庫裡的材料一起算（先用背包的，不夠再用倉庫的）
const stashHave = (type, k) => (G.stash && typeof stackCount === "function") ? G.stash.tabs.reduce((a, t) => a + stackCount(t, type, k), 0) + ((G.stash.spec && G.stash.spec[type] && G.stash.spec[type][k]) || 0) : 0;
function craftCurHave(k) { return (G.P.cur[k] || 0) + stashHave("cur", k); }
function takeInvThenStash(type, field, k, n) { const inInv = G.P[field][k] || 0, a = Math.min(n, inInv); if (a) G.P[field][k] = inInv - a; let r = n - a; if (r > 0 && G.stash && G.stash.spec && G.stash.spec[type]) { const sp = G.stash.spec[type], b = Math.min(r, sp[k] || 0); if (b) { sp[k] -= b; r -= b; if (!sp[k]) delete sp[k]; } } if (r > 0 && G.stash) for (const t of G.stash.tabs) { if (r <= 0) break; r = stackRemove(t, type, k, r); } }
function craftCurPay(k, n) { takeInvThenStash("cur", "cur", k, n); }
// 分解的內容在 enhance.js（給磨石／護貝劑碎片）；這裡只留宣告
function salvageGains(it) { return []; }
// 技能寶石掉落：只會掉怪物等級附近（含以下）就能學的技能；還沒有的比較容易掉
function randomSkillGem(mlvl) {
  const P = G.P, list = Object.keys(SKILLS).filter(s => SKILLS[s].lvl <= mlvl + 3);
  return wpick(list, s => hasSkillGem(P, s) ? 1 : 4);
}
// 藥劑掉落：地圖等級＝最高可掉的階級（越高階越難掉）；40% 是魔法藥劑
function randomFlask(grade, magicCh = 0.4) {
  const tiers = [1, 2, 3, 4, 5, 6].filter(t => t <= Math.max(1, grade));
  const tier = wpick(tiers, t => FLASK_TIER_WEIGHT[t - 1]);
  const type = wpick(Object.keys(FLASKS), t => (t === 'life' || t === 'mana') ? 3 : 1);
  return makeFlask(type, tier, Math.random() < magicCh ? 'magic' : 'normal');
}
// 賣掉／分解裝備時，鑲在上面的珠寶自動退回
function returnJewels(item) {
  let n = 0;
  for (const k of item.sockets || []) if (k) { G.P.jewels[k] = (G.P.jewels[k] || 0) + 1; n++; }
  if (n) UI.msg(`裝備上的 ${n} 顆珠寶已退回珠寶袋`, '#e8c890');
}
// v2.17 主線地圖只掉 MAIN_CURRENCY；深層夢境（或高等競技場）全部都掉。isDeepWorld 在 enhance.js
function randomCurrency() { const deep = typeof isDeepWorld === 'function' && isDeepWorld(); return wpick(Object.keys(CURRENCY).filter(k => deep || MAIN_CURRENCY.has(k)), k => CURRENCY[k].weight); }
// 還沒打到深層夢境的角色：商人的價錢、賣東西換到的碎片，把改造石、增幅石換成蛻變石（主線不掉那兩種）
function curMainOnly(v) {
  if (!G.P || (G.P.maxTier || 0) >= DEEP_TIER) return v;
  const o = {}; for (const k in v) { const kk = (k === 'alter' || k === 'aug') ? 'transmute' : k; o[kk] = (o[kk] || 0) + v[k]; } return o;
}

// ---------- 工藝石 ----------
function applyCurrency(cur, item) {
  if (isFlask(item)) return applyFlaskCurrency(cur, item);
  const base = BASE_BY_ID[item.base];
  if (cur === 'socket') {
    if (!item.sockets) item.sockets = [];
    const max = socketMax(base);
    if (!max) return '這個部位不能有插槽';
    if (item.sockets.length >= max) return `已經是最多的 ${max} 個插槽了`;
    item.sockets.push(null);
    return null;
  }
  if (cur === 'divine') {
    if (item.rarity === 'normal' || !item.mods.length) return '這件物品沒有可以重骰的詞綴';
    if (item.rarity === 'unique') {
      const u = UNIQUE_BY_ID[item.uniqueId];
      item.mods.forEach((m, i) => { if (m.type === 'u' && u.mods[i]) m.v = rollUniqueValue(u.mods[i]); else if (AFFIX_BY_ID[m.id]) { const a = AFFIX_BY_ID[m.id]; m.v = rollValue(a, a.tiers.length - m.tier, base); } });   // v2.17 深層傳奇多的那條是一般詞綴
    } else item.mods.forEach(m => { const a = AFFIX_BY_ID[m.id]; m.v = rollValue(a, a.tiers.length - m.tier, base); });
    return null;
  }
  if (item.rarity === 'unique') return item.set ? '套裝物品不能改造（只能用神聖石重骰數值）' : '傳奇物品只能用神聖石';
  switch (cur) {
    case 'aug': if (item.rarity !== 'magic') return '只能用在魔法物品';
      if (item.mods.length >= 2) return '魔法物品最多 2 條詞綴';
      if (!addRandomAffix(item)) return '沒有可以加的詞綴';
      nameItem(item); break;
    case 'regal': if (item.rarity !== 'magic') return '只能用在魔法物品';
      item.rarity = 'rare'; addRandomAffix(item); nameItem(item); break;
    case 'annul': if (!item.mods.length || item.rarity === 'normal') return '沒有可以移除的詞綴';
      item.mods.splice(Math.floor(Math.random() * item.mods.length), 1);
      if (item.rarity === 'magic') nameItem(item); break;
    case 'chance': {
      if (item.rarity !== 'normal') return '只能用在普通物品';
      const us = UNIQUES.filter(u => u.base === item.base && !u.boss && !u.wr && !u.noDrop);
      if (us.length && Math.random() < 0.08) { const keep = item.sockets; Object.assign(item, makeUnique(pick(us).id, item.ilvl), { uid: item.uid, sockets: keep || [] }); return null; }
      item.rarity = Math.random() < 0.25 ? 'rare' : 'magic'; rollMods(item); break;
    }
    case 'transmute': if (item.rarity !== 'normal') return '只能用在普通物品';
      item.rarity = 'magic'; rollMods(item); break;
    case 'alter': if (item.rarity !== 'magic') return '只能用在魔法物品';
      rollMods(item); break;
    case 'alch': if (item.rarity !== 'normal') return '只能用在普通物品';
      item.rarity = 'rare'; rollMods(item); break;
    case 'chaos': if (item.rarity !== 'rare') return '只能用在稀有物品';
      rollMods(item); break;
    case 'exalt': if (item.rarity !== 'rare') return '只能用在稀有物品';
      if (item.mods.length >= 6) return '詞綴已滿（6 條）';
      if (!addRandomAffix(item)) return '沒有可以加的詞綴'; break;
    case 'scour': if (item.rarity === 'normal') return '已經是普通物品';
      item.rarity = 'normal'; item.mods = []; nameItem(item); break;
  }
  return null;
}

// v2.7 強化：+1～+4 每級 4%，+5～+10 每級 6%（+10 共 52%）
function enhPct(n) { n = n || 0; return Math.min(n, 4) * 4 + Math.max(0, n - 4) * 6; }
// ---------- 單件物品的局部數值（武器傷害、防具防禦） ----------
function itemLocal(item) {
  const base = BASE_BY_ID[item.base];
  const em = 1 + enhPct(item.enh) / 100;   // v2.7 強化：武器物理傷害、防具防禦值一起變高
  let pinc = 0, padd = [0, 0], aspd = 0, dflat = 0, dinc = 0;
  for (const m of item.mods) {
    if (m.stat === 'l_phys_inc') pinc += m.v;
    else if (m.stat === 'l_phys_add') { padd[0] += m.v[0]; padd[1] += m.v[1]; }
    else if (m.stat === 'l_aspd') aspd += m.v;
    else if (m.stat === 'def_flat') dflat += m.v;
    else if (m.stat === 'def_inc') dinc += m.v;
  }
  const out = {};
  if (base.phys) {
    out.phys = [Math.round((base.phys[0] + padd[0]) * (1 + pinc / 100) * em), Math.round((base.phys[1] + padd[1]) * (1 + pinc / 100) * em)];
    out.aps = Math.round(base.aps * (1 + aspd / 100) * 100) / 100;
    out.crit = base.crit;
    out.physMod = pinc > 0 || padd[1] > 0 || em > 1; out.apsMod = aspd > 0;
  }
  if (base.def) { out.def = base.def; out.defv = Math.round((base.defv + dflat) * (1 + dinc / 100) * em); out.defMod = dflat > 0 || dinc > 0 || em > 1; }
  return out;
}
const LOCAL_STATS = new Set(['l_phys_inc', 'l_phys_add', 'l_aspd', 'def_flat', 'def_inc']);
const FLAG_STATS = new Set(['bloodMagic', 'noMana', 'noCrit', 'noRegen', 'cull', 'chillMore']);

// ---------- 角色數值 ----------
const ZERO_KEYS = ['str', 'dex', 'int', 'all_attr', 'life', 'life_inc', 'mana', 'mana_inc', 'es', 'es_inc', 'armour', 'armour_inc', 'evasion', 'evasion_inc',
  'res_fire', 'res_cold', 'res_light', 'res_all', 'move_inc', 'aspd_inc', 'cspd_inc', 'crit_inc', 'crit_multi', 'dmg_inc', 'phys_inc', 'fire_inc',
  'cold_inc', 'light_inc', 'ele_inc', 'spell_inc', 'attack_inc', 'melee_inc', 'proj_inc', 'area_dmg_inc', 'minion_dmg_inc', 'minion_life_inc', 'minion_aspd_inc',
  'proj_count', 'pierce', 'area_inc', 'leech', 'mleech', 'life_regen_inc', 'cdr', 'dodge', 'poise', 'blast_ch', 'life_on_kill', 'mana_on_kill', 'life_regen', 'mana_regen_inc', 'minion_max', 'block', 'flask_inc',
  'chaos_inc', 'dot_inc', 'ignite_ch', 'freeze_ch', 'shock_ch', 'poison_ch', 'bleed_ch', 'ail_dur', 'res_chaos', 'spell_supp', 'spell_block'];
const AIL_KEYS = ['ignite', 'freeze', 'shock', 'poison', 'bleed'];
function addStat(S, stat, v) {
  if (FLAG_STATS.has(stat)) { S.flags[stat] = true; return; }
  if (stat.startsWith('more_')) { S[stat] *= (1 + v / 100); return; }
  if (Array.isArray(v)) { S[stat + '_min'] = (S[stat + '_min'] || 0) + v[0]; S[stat + '_max'] = (S[stat + '_max'] || 0) + v[1]; return; }
  S[stat] = (S[stat] || 0) + v;
}
function computeStats(P) {
  const S = { flags: {}, more_dmg: 1, more_spell: 1, more_proj: 1, more_attack: 1 };
  ZERO_KEYS.forEach(k => S[k] = 0);
  ['a_phys', 'a_fire', 'a_cold', 'a_light', 'a_chaos', 's_fire', 's_cold', 's_light', 's_chaos'].forEach(k => { S[k + '_min'] = 0; S[k + '_max'] = 0; });
  const cls = CLASSES[P.cls];
  // v2.2：屬性會隨等級成長（主屬性每級 +1.5、其他 +0.5），不然 36 級以後連自己職業的武器都拿不起來
  for (const k in cls.attr) S[k] += cls.attr[k] + Math.floor(((P.lvl || 1) - 1) * (k === cls.main ? 1.5 : 0.5));
  for (const k in cls.bonus) addStat(S, k, cls.bonus[k]);
  for (const id of P.tree) {
    const n = TREE.nodes[id];
    for (const k in n.stats) addStat(S, k, n.stats[k]);
    for (const f of n.flags) S.flags[f] = true;
  }
  let weapon = null, hasShield = false;
  for (const slot in P.equip) {
    const it = P.equip[slot]; if (!it) continue;
    const base = BASE_BY_ID[it.base];
    for (const m of it.implicit) addStat(S, m.stat, m.v);
    for (const m of it.mods) if (!LOCAL_STATS.has(m.stat)) addStat(S, m.stat, m.v);
    for (const k of it.sockets || []) if (k) { const j = parseJewel(k); addStat(S, JEWELS[j.type].stat, JEWELS[j.type].vals[j.grade - 1]); }
    const loc = itemLocal(it);
    if (it.enh && slot === 'weapon') addStat(S, 'spell_inc', Math.round(enhPct(it.enh) / 2));   // v2.7 法系武器強化也有用
    if (loc.def) addStat(S, loc.def === 'ar' ? 'armour' : loc.def === 'ev' ? 'evasion' : 'es', loc.defv);
    if (slot === 'weapon') weapon = { cls: base.cls, phys: loc.phys, aps: loc.aps, crit: loc.crit, hands: base.hands };
    if (base.cls === 'shield') hasShield = true;
  }
  // 正在生效的功能藥劑（同種只算一次）
  for (const type in (G.flaskBuffs || {})) { const b = G.flaskBuffs[type], F = FLASKS[type]; if (F.stat) for (const st of [].concat(F.stat)) addStat(S, st, Math.round(b.v)); }
  S.str += S.all_attr; S.dex += S.all_attr; S.int += S.all_attr;
  S.res_fire += S.res_all; S.res_cold += S.res_all; S.res_light += S.res_all;
  const L = P.lvl;
  S.maxLife = Math.max(1, Math.round((38 + 12 * L + S.str * 0.5 + S.life) * (1 + S.life_inc / 100)));
  S.maxMana = S.flags.noMana ? 0 : Math.round((34 + 6 * L + S.int * 0.5 + S.mana) * (1 + S.mana_inc / 100));
  // v1.6 屬性：每 1 智慧＋0.4 能量護盾；每 1 敏捷＋2 閃避值；每 1 力量＋1 堅忍值（另外原本的生命／魔力／百分比加成照舊）
  S.maxES = Math.round((S.es + S.int * 0.3) * (1 + (S.es_inc + S.int / 10) / 100)); // v2.2：智慧會隨等級成長了，換算調低，不然法師又最痛又最硬
  S.armourT = Math.round(S.armour * (1 + S.armour_inc / 100));
  S.poiseT = Math.round(POISE_BASE + S.str + S.poise); // 堅忍值：被打到會扣，扣完就硬直
  S.evasionT = Math.round((S.evasion + 15 + L * 3 + S.dex * 2) * (1 + (S.evasion_inc + S.dex / 5) / 100));
  S.resF = Math.min(75, S.res_fire); S.resC = Math.min(75, S.res_cold); S.resL = Math.min(75, S.res_light); S.resX = Math.min(75, S.res_chaos);
  S.suppress = Math.min(75, S.spell_supp); S.spellBlock = Math.min(75, S.spell_block);
  S.moveSpeed = 165 * (1 + S.move_inc / 100);
  // v1.2：每個角色都有基礎回血（每秒 0.6% 最大生命），詞綴「生命回復速度」再乘上去
  S.lifeRegenPS = S.flags.noRegen ? 0 : S.maxLife * (BASE_LIFE_REGEN + S.life_regen) / 100 * (1 + S.life_regen_inc / 100);
  S.manaRegenPS = S.maxMana * 0.05 * (1 + S.mana_regen_inc / 100);
  S.mana_on_kill += 3;
  S.blockChance = hasShield ? Math.min(75, S.block) : 0;
  S.weapon = weapon || { cls: 'none', phys: [2, 5], aps: 1.3, crit: 5, hands: 1 };
  S.minionMax = 3 + S.minion_max;
  S.meleeStrBonus = Math.floor(S.str / 5);
  return S;
}

// ---------- 技能傷害 ----------
// 實際冷卻＝技能冷卻 ÷（1＋冷卻回復速度），冷卻回復速度最多 40%
const CDR_CAP = 40;
function effCd(S, sk) { return sk.cd * (sk.id ? gemBonus(sk.id, gemLv(sk.id)).cd : 1) / (1 + Math.min(CDR_CAP, S.cdr || 0) / 100); }   // v2.4 寶石等級縮短冷卻
function skillUsable(S, sid) {
  const sk = SKILLS[sid];
  if (G.P && !hasSkillGem(G.P, sid)) return '還沒有這個技能寶石（打怪掉落；全章節通關後也能跟塞拉買）';
  if (sk.need === 'bow' && S.weapon.cls !== 'bow') return '需要裝備弓';
  if (sk.need === 'melee' && ['bow', 'wand'].includes(S.weapon.cls)) return '需要近戰武器（劍／斧／太刀／匕首／法杖，或空手）';
  // v2.4：看「這顆寶石目前等級」的角色等級與屬性需求（不看職業）
  const lack = gemReqLack(sid, gemLv(sid), S, G.P);
  if (lack) return lack;
  return null;
}
// 把一個技能欄上的輔助寶石效果加總（不相容的寶石不生效）
function supportAgg(sid, sups) {
  const X = { aspd_inc: 0, cspd_inc: 0, crit_inc: 0, crit_multi: 0, area_inc: 0, proj_count: 0, pierce: 0, leech: 0, extra_fire: 0, extra_chaos: 0, conv_cold: 0, minion_max: 0,
    ignite_ch: 0, freeze_ch: 0, shock_ch: 0, poison_ch: 0, bleed_ch: 0,
    more_dmg: 1, more_phys: 1, more_ele: 1, more_area: 1, more_minion: 1, more_minion_life: 1, more_dot: 1, cost: 1, flags: {}, active: [] };
  for (const id of sups || []) {
    if (!supportFits(id, sid)) continue;
    const sp = SUPPORTS[id];
    X.cost *= sp.cost; X.active.push(id);
    for (const k in sp.mods) {
      const v = sp.mods[k];
      if (v === true) X.flags[k] = true;
      else if (k.startsWith('more_')) X[k] *= 1 + v / 100;
      else X[k] += v;
    }
  }
  return X;
}
function calcSkill(S, sid, lvl, sups) {
  const sk = SKILLS[sid];
  const X = supportAgg(sid, sups);
  if (X.flags.allin && typeof allinOn === 'function' && allinOn(sid)) X.more_dmg *= 1.4;   // v2.17 輔助寶石「孤注」：技能欄只有這一個打傷害的技能（gems4.js）
  const GB = gemBonus(sid, gemLv(sid)); lvl = GB.effLvl;   // v2.4：法術與召喚物的威力看寶石等級，不看角色等級
  const tags = sk.tags;
  const isAtk = tags.includes('attack'), isSpell = tags.includes('spell');
  const melee = tags.includes('melee'), proj = tags.includes('projectile'), area = tags.includes('area');
  const d = { phys: [0, 0], fire: [0, 0], cold: [0, 0], light: [0, 0], chaos: [0, 0] };
  let crit = 0, time = 1;
  if (isAtk) {
    const w = S.weapon;
    d.phys = [w.phys[0] + S.a_phys_min, w.phys[1] + S.a_phys_max];
    d.fire = [S.a_fire_min, S.a_fire_max]; d.cold = [S.a_cold_min, S.a_cold_max]; d.light = [S.a_light_min, S.a_light_max];
    d.chaos = [S.a_chaos_min, S.a_chaos_max];
    for (const k in d) d[k] = [d[k][0] * sk.eff * GB.eff, d[k][1] * sk.eff * GB.eff];
    crit = w.crit;
    time = 1 / (w.aps * (1 + (S.aspd_inc + X.aspd_inc) / 100) * sk.speed);
  } else if (sk.base && sk.type !== 'summon') {
    const sc = 1 + 0.13 * (lvl - 1);   // v2.2：0.16 → 0.13（法術原本中後期比攻擊強太多）
    d[sk.elem] = [sk.base[0] * sc, sk.base[1] * sc];
    for (const e of ['fire', 'cold', 'light', 'chaos']) { d[e][0] += S[`s_${e}_min`] * sk.eff; d[e][1] += S[`s_${e}_max`] * sk.eff; }
    crit = sk.crit || 5;
    time = sk.cast / (1 + (S.cspd_inc + X.cspd_inc) / 100);
  } else {
    time = (sk.cast || 0.5) / (1 + (S.cspd_inc + X.cspd_inc) / 100);
  }
  // 輔助寶石：額外火焰、物理轉冰冷
  if (X.extra_fire) { d.fire[0] += d.phys[0] * X.extra_fire / 100; d.fire[1] += d.phys[1] * X.extra_fire / 100; }
  if (X.extra_chaos) { d.chaos[0] += d.phys[0] * X.extra_chaos / 100; d.chaos[1] += d.phys[1] * X.extra_chaos / 100; }
  if (X.conv_cold) {
    const c = Math.min(1, X.conv_cold / 100);
    d.cold[0] += d.phys[0] * c; d.cold[1] += d.phys[1] * c;
    d.phys = [d.phys[0] * (1 - c), d.phys[1] * (1 - c)];
  }
  if (X.flags.noEle) { d.fire = [0, 0]; d.cold = [0, 0]; d.light = [0, 0]; }
  let common = S.dmg_inc + (isAtk ? S.attack_inc : 0) + (isSpell ? S.spell_inc : 0) + (melee ? S.melee_inc : 0) + (proj ? S.proj_inc : 0) + (area ? S.area_dmg_inc : 0);
  const inc = {
    phys: common + S.phys_inc + (melee ? S.meleeStrBonus : 0),
    fire: common + S.fire_inc + S.ele_inc, cold: common + S.cold_inc + S.ele_inc, light: common + S.light_inc + S.ele_inc,
    chaos: common + S.chaos_inc,
  };
  const more = S.more_dmg * (isSpell ? S.more_spell : 1) * (isAtk ? S.more_attack : 1) * (proj ? S.more_proj : 1) * X.more_dmg * (area ? X.more_area : 1);
  let avg = 0;
  for (const k in d) {
    const f = Math.max(0, 1 + inc[k] / 100) * more * (k === 'phys' || k === 'chaos' ? (k === 'phys' ? X.more_phys : 1) : X.more_ele);
    d[k] = [d[k][0] * f, d[k][1] * f];
    avg += (d[k][0] + d[k][1]) / 2;
  }
  const critC = S.flags.noCrit ? 0 : Math.min(95, crit * (1 + (S.crit_inc + X.crit_inc) / 100));
  const multi = 150 + S.crit_multi + X.crit_multi;
  const eavg = avg * (1 + critC / 100 * (multi / 100 - 1));
  const cost = Math.round((sk.cost || 0) * X.cost * GB.cost);
  const out = { d, crit: critC, multi, time, avg, dps: eavg / time, cost, count: (sk.count || 0) + GB.proj + (proj ? S.proj_count + X.proj_count : 0),
    pierce: (sk.pierce || 0) + GB.pierce + S.pierce + X.pierce, areaMul: Math.sqrt(Math.max(0.1, 1 + (S.area_inc + X.area_inc + GB.area) / 100)),
    chains: (sk.chains || 0) + GB.chain, volleys: (sk.volleys || 0) + GB.volley, strikes: (sk.strikes || 0) + GB.strike, gemLv: gemLv(sid),
    leech: S.leech + X.leech, mleech: S.mleech, noChill: !!X.flags.noChill, echo: !!X.flags.echo, active: X.active };
  // 異常狀態機率與持續傷害倍率
  out.ail = {};
  for (const a of AIL_KEYS) out.ail[a] = Math.min(100, ((sk.ail && sk.ail[a]) || 0) + S[a + '_ch'] + X[a + '_ch']);
  out.dotMult = Math.max(0, 1 + S.dot_inc / 100) * X.more_dot;
  out.ailDur = 1 + S.ail_dur / 100;
  if (X.flags.bloodpay) { out.lifeCost = out.cost; out.cost = 0; }   // v2.17「血祭」：改耗生命（game.js useSkill 扣）
  if (X.flags.overdraw) out.overdraw = true;                         // v2.17「透支」：魔力不夠用生命補
  if (sk.type === 'summon') { out.minion = calcMinion(S, lvl, X, sk); out.minion.max += GB.minion; }
  if (sk.type === 'zone') out.dps = eavg / sk.tick; // 每片地面的每秒傷害
  if (sk.dpsMul) out.dps *= sk.dpsMul;   // v2.5.5 連斬、雷球這類一次施放打很多下的技能
  if (sk.type === 'proj' && out.count > 1) out.dps *= 1 + PROJ_SHOTGUN * (out.count - 1);   // v2.5.5 多的投射物也打得到同一個目標（35%）
  if (sk.type === 'rain') out.dps = eavg * out.volleys / time;
  if (sk.type === 'storm') out.dps = eavg * out.strikes / time;
  if (sk.cd) { const ecd = effCd(S, sk); out.dps *= time / Math.max(time, ecd); out.cd = ecd; } // 有冷卻的技能：每秒傷害要算冷卻時間
  return out;
}
function calcMinion(S, lvl, X, sk) {
  sk = sk || SKILLS.skel;
  const sc = 1 + 0.16 * (lvl - 1);
  const pc = X ? X.proj_count : 0;   // v2.13.5 會射擊的召喚物（靈體）可以吃多重投射：多射幾發，傷害照輔助寶石打折
  const f = (1 + S.minion_dmg_inc / 100) * (X ? X.more_minion : 1) * (pc > 0 && X ? X.more_dmg : 1);
  const lf = (1 + S.minion_life_inc / 100) * (X ? X.more_minion_life : 1);
  return { kind: sk.minion, dmg: [sk.base[0] * sc * f, sk.base[1] * sc * f], life: Math.round(sk.mlife * (1 + 0.14 * (lvl - 1)) * lf), aps: sk.maps * (1 + (S.minion_aspd_inc || 0) / 100),   // v2.13.1 召喚物攻擊速度
    speed: sk.mspeed, ranged: sk.mranged || 0, count: sk.mranged ? 1 + Math.max(0, pc) : 1, taunt: !!sk.taunt, max: sk.max + S.minion_max + (X ? X.minion_max : 0) };
}

// ---------- 物品說明（滑鼠移上去的提示框） ----------
const ITEM_TIP_EXTRA = [];   // v2.17 物品說明多加的段落：push(item => HTML 字串)
function itemTipHTML(item, opts = {}) {
  if (isFlask(item)) return flaskTipHTML(item, opts);
  const base = BASE_BY_ID[item.base];
  const loc = itemLocal(item);
  const cl = 'c-' + (item.set ? 'set' : item.rarity);   // v2.17 套裝用綠色
  let h = `<div class="tip-head ${cl}"><div class="tip-name">${item.name}</div>${item.rarity === 'rare' || item.rarity === 'unique' ? `<div class="tip-base">${base.name}</div>` : ''}</div>`;
  const tierTxt = TIERED_SLOTS.has(base.slot) ? ` · <span style="color:${['#a8a8a8', '#c8c8a0', '#e8d890', '#c8a0ff', '#ff8a8a'][base.tier]}">${BASE_TIER_NAME[base.tier]}基底</span>` : '';
  h += `<div class="tip-sub">${base.clsName}${base.hands === 2 ? '（雙手）' : ''} · ${item.set ? '<span class="c-set">套裝</span>' : RARITY_NAME[item.rarity]}${tierTxt} · 物品等級 ${item.ilvl}</div>`;
  if (loc.phys) {
    h += `<div class="tip-prop">物理傷害：<span class="${loc.physMod ? 'c-mod' : ''}">${loc.phys[0]}–${loc.phys[1]}</span></div>`;
    h += `<div class="tip-prop">每秒攻擊次數：<span class="${loc.apsMod ? 'c-mod' : ''}">${loc.aps.toFixed(2)}</span></div>`;
    h += `<div class="tip-prop">暴擊率：${loc.crit}%</div>`;
  }
  if (loc.def) h += `<div class="tip-prop">${DEF_NAME[loc.def]}：<span class="${loc.defMod ? 'c-mod' : ''}">${loc.defv}</span></div>`;
  const req = base.req || {};
  const reqParts = [];
  const S = G.S;
  if (req.lvl > 1) reqParts.push(`<span class="${G.P.lvl < req.lvl ? 'c-bad' : ''}">等級 ${req.lvl}</span>`);
  [['str', '力量'], ['dex', '敏捷'], ['int', '智慧']].forEach(([k, n]) => { if (req[k]) reqParts.push(`<span class="${S[k] + itemOwnAttr(item, k) < req[k] ? 'c-bad' : ''}">${n} ${req[k]}</span>`); });
  if (reqParts.length) h += `<div class="tip-req">需求：${reqParts.join('，')}</div>`;
  if (item.implicit.length) {
    h += '<div class="tip-sep"></div>';
    for (const m of item.implicit) h += `<div class="tip-mod">${STAT_TEXT[m.stat](m.v)}</div>`;
  }
  if (item.mods.length) {
    h += '<div class="tip-sep"></div>';
    let prevU = false;
    for (const m of item.mods) {
      if (item.set && prevU && m.type !== 'u') h += '<div class="tip-sep"></div><div class="tip-mod" style="font-size:11px;color:#8a9a90">隨機詞綴</div>';   // v2.17.4 套裝：固定效果和隨機詞綴分開
      prevU = m.type === 'u';
      const t = STAT_TEXT[m.stat] ? STAT_TEXT[m.stat](m.v, base.def) : m.stat;
      const tag = !advInfo() ? '' : m.type === 'p' ? `<span class="tip-tier">前綴 T${m.tier}</span>` : m.type === 's' ? `<span class="tip-tier">後綴 T${m.tier}</span>` : '';
      h += `<div class="tip-mod ${m.type === 'u' && FLAG_STATS.has(m.stat) ? 'c-unique' : ''}">${t}${tag}</div>`;
    }
  }
  // 珠寶插槽
  const smax = socketMax(base), socks = item.sockets || [];
  if (smax) {
    h += '<div class="tip-sep"></div>';
    h += `<div class="tip-sock">插槽 ${socks.length}/${smax}${socks.length ? '' : '（可用鑿孔石增加）'}</div>`;
    for (const k of socks) h += k ? `<div class="tip-mod" style="color:${JEWELS[parseJewel(k).type].color}">◆ ${jewelName(k)}：${jewelText(k)}</div>` : '<div class="tip-mod" style="color:#6a6070">◇ 空插槽</div>';
  }
  for (const f of ITEM_TIP_EXTRA) { try { h += f(item) || ''; } catch (e) { } }   // v2.17 別的模組加的說明（套裝、首領傳奇效果、深層傳奇）
  if (item.rarity === 'unique') {
    const u = UNIQUE_BY_ID[item.uniqueId];
    if (u) h += `<div class="tip-flavor">「${u.flavor}」</div>`;
    const src = !u || !u.boss ? '' : typeof uniqueSourceText === 'function' ? uniqueSourceText(u) : BOSSES[u.boss] ? `首領專屬掉落：${BOSSES[u.boss].name}` : '';   // v2.19.12 看守者信物沒有對應的首領：以前這裡出錯，整個說明都出不來
    if (src) h += `<div class="tip-boss">${src}</div>`;
  }
  if (opts.hint) h += `<div class="tip-hint">${opts.hint}</div>`;
  return h;
}
// ---------- 商人：以物易物 ----------
function sellValue(it) { return curMainOnly(sellValueRaw(it)); }
function sellValueRaw(it) {
  if (isFlask(it)) return it.rarity === "magic" ? { alter: 2 } : { transmute: 1 };
  if (it.rarity === 'normal') return { transmute: 2 };
  if (it.rarity === 'magic') return { alter: 3, aug: 2 };
  if (it.rarity === 'rare') return { alch: 3 + Math.max(0, it.mods.length - 3), chaos: 2 };
  return { chaos: 10, divine: 2 };
}
function canPay(price) { for (const k in price) if ((G.P.cur[k] || 0) < price[k]) return false; return true; }
function genShop() {
  const ilvl = Math.max(3, G.P.maxTier * 3 - 1);
  const list = [];
  list.push({ cur: 'portal', qty: 3, price: { transmute: 1 } });
  list.push({ respec: 2, price: { chaos: 1 } }); // 遺忘藥水：天賦重置點數
  if ((G.P.maxTier || 0) >= DEEP_TIER) list.push({ cur: 'aug', qty: 2, price: { alter: 2 } });   // 增幅石主線不掉，深層才賣
  list.push({ cur: 'alch', qty: 1, price: { aug: 3, alter: 3 } });
  const gr = mapGrade(Math.max(1, G.P.maxTier - 1)); // 商人的貨跟你打到的地圖等級走
  for (let i = 0; i < 3; i++) list.push({ item: makeItem(pickBase(ilvl, gr).id, 'magic', ilvl), price: { alter: 2 } });
  for (let i = 0; i < 2; i++) list.push({ item: makeItem(pickBase(ilvl, gr).id, 'rare', ilvl), price: { alch: 2 } });
  list.push({ item: makeItem(pickBase(ilvl, gr).id, 'normal', ilvl), price: { transmute: 1 } });
  // 藥劑：商人賣跟地圖等級一樣的藥劑
  list.push({ item: makeFlask("life", Math.max(1, gr), "normal"), price: { transmute: 1 } });
  list.push({ item: randomFlask(gr, 0.6), price: { alter: 2 } });
  const supPool = Object.keys(SUPPORTS).filter(k => (G.P.maxTier || 1) >= DEEP_TIER || !SUPPORTS[k].risk);   // v2.17 有代價的輔助寶石：到過深層夢境才賣
  for (let i = 0; i < 3; i++) list.push({ gem: pick(supPool), price: { chaos: 1 } });
  for (const e of list) e.price = curMainOnly(e.price);
  return list;
}
// v2.18.2 這件裝備自己加的屬性（還沒穿上的才算；已經穿著的早就算在 G.S 裡）：判斷能不能穿、說明的紅字都把它算進去
function itemOwnAttr(item, k) { if (!item || Object.values(G.P.equip || {}).includes(item)) return 0; return [].concat(item.implicit || [], item.mods || []).reduce((s, m) => s + (m.stat === k || m.stat === 'all_attr' ? (+m.v || 0) : 0), 0); }
function canEquip(item) {
  if (isFlask(item)) return null;
  const req = BASE_BY_ID[item.base].req || {};
  if (req.lvl && G.P.lvl < req.lvl) return `等級不足（需要 ${req.lvl}）`;
  for (const [k, n] of [['str', '力量'], ['dex', '敏捷'], ['int', '智慧']]) if (req[k] && G.S[k] + itemOwnAttr(item, k) < req[k]) return `${n}不足（需要 ${req[k]}）`;
  return null;
}
// v2.19.2 傳奇、套裝、信物有自己的圖示（美術 CC0 暫代圖，代號＝uniqueId；ArtStyle.cell 查得到就用，沒有才用底材圖）
function itemIconOf(it, px = 48) {
  const id = it && it.uniqueId, c = id && typeof ArtStyle !== 'undefined' && ArtStyle.cell ? ArtStyle.cell(id) : null;
  return c || itemIcon(BASE_BY_ID[it.base], px);
}
const itemIconOfURL = (it, px = 48) => artURL(itemIconOf(it, px));
