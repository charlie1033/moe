// =============================================================
//  v2.7 夢痕詞綴：會改變玩法的特殊詞綴
//  ・只出現在黃裝（稀有）上，每件最多 1 條，紫色顯示；物品等級 30 以上才會有
//  ・每個部位有自己的一組（鞋子＝移動、胸甲＝防禦……），想要哪個效果就刷哪個部位
//  ・分解有夢痕的裝備：會「記住」這條詞綴；之後可以在工坊（B）花混沌石拓印到同部位的黃裝上
//  ・效果都在這個檔案裡實作（用包裝原本函式的方式加進去）
// =============================================================
const SCAR_SLOT_GROUP = { weapon: 'weapon', offhand: 'offhand', helmet: 'helmet', body: 'body', gloves: 'gloves', boots: 'boots', amulet: 'amulet', ring: 'ring', ring1: 'ring', ring2: 'ring', belt: 'belt' };
const SCARS = [
  // 武器
  { id: 'sc_thunder', slot: 'weapon', name: '雷鳴', r: [6, 10], text: v => `擊中時 ${v}% 機率落下一道天雷（80% 傷害，閃電）` },
  { id: 'sc_rend', slot: 'weapon', name: '裂傷', r: [3, 5], text: v => `連續擊中同一個敵人，每下讓牠多受 ${v}% 傷害，最多 10 層` },
  { id: 'sc_ember', slot: 'weapon', name: '餘燼', r: [25, 35], text: v => `${v}% 物理傷害轉為火焰；點燃機率 +20%` },
  { id: 'sc_hunter', slot: 'weapon', name: '獵王', r: [20, 30], text: v => `對首領和黃色精英多造成 ${v}% 傷害` },
  { id: 'sc_pact', slot: 'weapon', name: '血契', r: [25, 35], text: v => `傷害總增 ${v}%，但最大生命 −15%` },
  // 手套
  { id: 'sc_frostfist', slot: 'gloves', name: '霜拳', r: [5, 8], text: v => `擊中時 ${v}% 機率在敵人身邊爆出冰霜新星（60% 傷害，冰冷）` },
  { id: 'sc_siphon', slot: 'gloves', name: '汲魔', r: [2, 4], text: v => `擊中時回復 ${v} 點魔力（每秒最多 10 次）` },
  { id: 'sc_variety', slot: 'gloves', name: '千變', r: [12, 18], text: v => `每次施放「跟上一招不同」的技能，傷害 +${v}%（最多 3 層，用同一招就歸零）` },
  { id: 'sc_haste', slot: 'gloves', name: '疾風', r: [15, 25], text: v => `使用有冷卻的技能後，3 秒內攻擊與施法速度 +${v}%` },
  // 頭盔
  { id: 'sc_veteran', slot: 'helmet', name: '老兵', r: [2, 4], text: v => `召喚物存活越久越強：每秒傷害 +${v}%，最多 +60%` },
  { id: 'sc_clarity', slot: 'helmet', name: '清明', r: [10, 18], text: v => `施放技能時 ${v}% 機率不消耗魔力` },
  { id: 'sc_pristine', slot: 'helmet', name: '無瑕', r: [15, 25], text: v => `生命全滿時，傷害 +${v}%` },
  { id: 'sc_predator', slot: 'helmet', name: '掠食', r: [12, 20], text: v => `對中毒、流血或點燃中的敵人，傷害 +${v}%` },
  // 胸甲
  { id: 'sc_laststand', slot: 'body', name: '絕境', r: [15, 25], text: v => `一下被打掉 30% 以上生命時，立刻回復 ${v}% 生命（10 秒一次）` },
  { id: 'sc_phalanx', slot: 'body', name: '方陣', r: [2, 3], text: v => `身邊每有 1 隻敵人，受到的傷害 −${v}%（最多 −20%）` },
  { id: 'sc_thorns', slot: 'body', name: '荊甲', r: [40, 60], text: v => `被近戰打到時，把 ${v}% 傷害反彈給攻擊者` },
  { id: 'sc_soulward', slot: 'body', name: '魂護', r: [100, 100], text: () => '生命自然回復時，能量護盾也一起回復' },
  // 鞋子
  { id: 'sc_wind', slot: 'boots', name: '乘風', r: [25, 35], text: v => `用${ctl('dodgeKey')}的「瞬移」「一閃」或「猛衝」之後，2 秒內移動速度 +${v}%` },
  { id: 'sc_rooted', slot: 'boots', name: '紮根', r: [12, 18], text: v => `站著不動 1.5 秒後，受到的傷害 −${v}%` },
  { id: 'sc_riposte', slot: 'boots', name: '見切', r: [100, 100], text: () => '閃避或閃身成功後，下一次擊中必定暴擊' },
  { id: 'sc_cinder', slot: 'boots', name: '焦土', r: [20, 30], text: v => `走過的地方留下 2 秒的火焰足跡（每 0.5 秒 ${v}% ${ctl('lmbSkill')}傷害）` },
  // 副手
  { id: 'sc_bastion', slot: 'offhand', name: '堡壘', r: [2, 4], text: v => `格擋時回復 ${v}% 生命` },
  { id: 'sc_quake', slot: 'offhand', name: '反震', r: [25, 35], text: v => `格擋時 ${v}% 機率對周圍造成反震（${ctl('lmbSkill')}傷害）` },
  // 項鍊
  { id: 'sc_surge', slot: 'amulet', name: '蓄勢', r: [8, 12], text: v => `每 ${v} 秒，下一招的傷害 ×2（準備好時腳下會發光）` },
  { id: 'sc_bond', slot: 'amulet', name: '共生', r: [1, 2], text: v => `召喚物擊中時，你回復 ${v}% 生命（每秒最多 5 次）` },
  // 戒指
  { id: 'sc_magnet', slot: 'ring', name: '引力', r: [100, 100], text: () => '擊殺精英怪時，周圍地上的通貨、珠寶會飛到你身上' },
  { id: 'sc_contagion', slot: 'ring', name: '傳染', r: [2, 3], text: v => `敵人死掉時，身上的點燃、中毒、流血傳給旁邊 ${v} 個敵人` },
  { id: 'sc_shared', slot: 'ring', name: '分享', r: [40, 60], text: v => `喝生命藥劑時，召喚物也回復 ${v}% 生命` },
  // 腰帶
  { id: 'sc_brew', slot: 'belt', name: '藥效', r: [12, 18], text: v => `藥劑生效期間（回復中或功能藥劑），傷害 +${v}%` },
  { id: 'sc_refill', slot: 'belt', name: '續杯', r: [1, 1], text: v => `擊殺時，所有藥劑額外 +${v} 充能` },
];
const SCAR_BY_ID = Object.fromEntries(SCARS.map(s => [s.id, s]));
const SCAR_COLOR = '#c88cff';
const scarSlotOf = it => { const b = it && BASE_BY_ID[it.base]; return b ? SCAR_SLOT_GROUP[b.slot] : null; };
function rollScar(it) {
  const sl = scarSlotOf(it); const pool = SCARS.filter(s => s.slot === sl); if (!pool.length) return;
  const s = pick(pool); it.scar = { id: s.id, v: rint(s.r[0], s.r[1]) };
}
// 掉落：黃裝、物品等級 30 以上：8% 起，每多 1 級 +0.4%，最高 28%
const _makeItemScar = makeItem;
makeItem = function (baseId, rarity, ilvl) {
  const it = _makeItemScar(baseId, rarity, ilvl);
  if (rarity === 'rare' && ilvl >= 30 && Math.random() < Math.min(0.28, 0.08 + (ilvl - 30) * 0.004)) rollScar(it);
  return it;
};
// 說明：在詞綴後面加一行紫色
const _tipScar = itemTipHTML;
itemTipHTML = function (item, opts = {}) {
  let h = _tipScar(item, opts);
  if (item && item.scar && SCAR_BY_ID[item.scar.id]) {
    const s = SCAR_BY_ID[item.scar.id];
    const line = `<div class="tip-sep"></div><div class="tip-mod" style="color:${SCAR_COLOR}">◆ 夢痕・${s.name}：${s.text(item.scar.v)}</div>`;
    const k = h.indexOf('<div class="tip-hint"'); h = k >= 0 ? h.slice(0, k) + line + h.slice(k) : h + line;
  }
  return h;
};
// 目前身上有哪些夢痕（同一種取最高）
function scarsNow() { const o = {}; if (!G.P) return o; for (const k in G.P.equip) { const it = G.P.equip[k]; if (it && it.scar) o[it.scar.id] = Math.max(o[it.scar.id] || 0, it.scar.v); } return o; }
const _onBuildScar = onBuildChanged;
onBuildChanged = function () { if (G.P) G.scar = scarsNow(); _onBuildScar(); if (G.scar && G.scar.sc_pact) G.S.maxLife = Math.round(G.S.maxLife * 0.85); };
const SC = id => (G.scar && G.scar[id]) || 0;

// ---------- 分解：記住夢痕；工坊：拓印 ----------
const _salvScar = salvageGains;
salvageGains = function (it) {
  const got = _salvScar(it);
  if (it && it.scar && SCAR_BY_ID[it.scar.id]) {
    const P = G.P; P.scarMem = P.scarMem || {}; const old = P.scarMem[it.scar.id] || 0;
    if (it.scar.v > old) { P.scarMem[it.scar.id] = it.scar.v; got.push(`記住夢痕「${SCAR_BY_ID[it.scar.id].name}」${old ? `（${old}→${it.scar.v}）` : ''}`); }
  }
  return got;
};
const SCAR_IMPRINT_COST = { chaos: 6 };   // v2.7 材料拿掉了：混沌石 ×6（背包加倉庫）
function scarImprintable(it) { return it && !isFlask(it) && !isStack(it) && it.rarity === 'rare'; }
function scarImprint(invIdx, scarId) {
  const P = G.P, it = P.inv[invIdx], s = SCAR_BY_ID[scarId];
  if (!scarImprintable(it)) return UI.msg('只能拓印到黃色（稀有）裝備上', '#ff9a9a');
  if (scarSlotOf(it) !== s.slot) return UI.msg(`「${s.name}」只能拓印到${SCAR_SLOT_NAME[s.slot]}上`, '#ff9a9a');
  if (craftCurHave('chaos') < SCAR_IMPRINT_COST.chaos) return UI.msg(`混沌石不夠：需要 ×${SCAR_IMPRINT_COST.chaos}`, '#ff9a9a');
  const go = () => { craftCurPay('chaos', SCAR_IMPRINT_COST.chaos); it.scar = { id: scarId, v: P.scarMem[scarId] }; Sfx.play('unique'); UI.msg(`拓印完成：${it.name} 得到夢痕「${s.name}」`, SCAR_COLOR); UI.refreshCraft(); UI.refreshInv(); saveGame(); };
  if (it.scar) gameAsk(`這件裝備已經有夢痕「${SCAR_BY_ID[it.scar.id].name}」，拓印會把它換掉。確定嗎？`, go); else go();
}
const SCAR_SLOT_NAME = { weapon: '武器', gloves: '手套', helmet: '頭盔', body: '胸甲', boots: '鞋子', offhand: '副手', amulet: '項鍊', ring: '戒指', belt: '腰帶' };

// ---------- 效果 ----------
const scarMul = (m, fromMinion, src) => {
  const pl = G.pl, S = G.S; let mul = 1;
  if (fromMinion) { if (SC('sc_veteran') && src && src.born != null) mul *= 1 + Math.min(0.6, (G.time - src.born) * SC('sc_veteran') / 100); return mul; }
  if (SC('sc_rend') && m.rend) mul *= 1 + m.rend * SC('sc_rend') / 100;
  if (SC('sc_hunter') && (m.boss || m.rarity === 'rare')) mul *= 1 + SC('sc_hunter') / 100;
  if (SC('sc_pact')) mul *= 1 + SC('sc_pact') / 100;
  if (SC('sc_variety') && pl.variety) mul *= 1 + pl.variety * SC('sc_variety') / 100;
  if (SC('sc_pristine') && pl.life >= S.maxLife * 0.99) mul *= 1 + SC('sc_pristine') / 100;
  if (SC('sc_predator') && (m.ign || m.bleed || (m.poisons && m.poisons.length))) mul *= 1 + SC('sc_predator') / 100;
  if (SC('sc_brew') && ((pl.heal && pl.heal.length) || (G.flaskBuffs && Object.keys(G.flaskBuffs).length))) mul *= 1 + SC('sc_brew') / 100;
  if (pl.surgeUntil && G.time < pl.surgeUntil) mul *= 2;
  return mul;
};
const _hitScar = hitMonster;
hitMonster = function (m, pk, fromMinion, src, kb) {
  if (!G.scar || m.dead) return _hitScar(m, pk, fromMinion, src, kb);
  const pl = G.pl, S = G.S;
  let p = pk; const mul = scarMul(m, fromMinion, src);
  if (mul !== 1) p = scalePk(p, mul);
  if (!fromMinion && SC('sc_ember') && p.d && p.d.phys && (p.d.phys[0] || p.d.phys[1])) { const c = SC('sc_ember') / 100; p = Object.assign({}, p, { d: Object.assign({}, p.d, { phys: [p.d.phys[0] * (1 - c), p.d.phys[1] * (1 - c)], fire: [(p.d.fire || [0, 0])[0] + p.d.phys[0] * c, (p.d.fire || [0, 0])[1] + p.d.phys[1] * c] }), ail: Object.assign({}, p.ail, { ignite: Math.min(100, ((p.ail && p.ail.ignite) || 0) + 20) }) }); }
  if (!fromMinion && pl.nextCrit) { pl.nextCrit = false; p = Object.assign({}, p, { crit: 100 }); }
  const r = _hitScar(m, p, fromMinion, src, kb);
  if (fromMinion) { if (SC('sc_bond') && (G.time - (pl.bondT || 0)) > 0.2) { pl.bondT = G.time; pl.life = Math.min(S.maxLife, pl.life + S.maxLife * SC('sc_bond') / 100); } return r; }
  if (pk.scarProc) return r;
  if (SC('sc_rend')) m.rend = (pl.rendTarget === m) ? Math.min(10, (m.rend || 0) + 1) : 1, pl.rendTarget = m;
  if (SC('sc_siphon') && (G.time - (pl.siphonT || 0)) > 0.1) { pl.siphonT = G.time; pl.mana = Math.min(S.maxMana, pl.mana + SC('sc_siphon')); }
  const base = G.slotCalc[0] ? { d: G.slotCalc[0].d, crit: G.slotCalc[0].crit, multi: G.slotCalc[0].multi, ail: {}, noBlast: true, scarProc: true } : null;
  if (SC('sc_thunder') && !m.dead && Math.random() * 100 < SC('sc_thunder')) {
    const tot = Object.values(pk.d).reduce((a, v) => a + (v[0] + v[1]) / 2, 0) * 0.8;
    _hitScar(m, { d: { phys: [0, 0], fire: [0, 0], cold: [0, 0], light: [tot * 0.7, tot * 1.3], chaos: [0, 0] }, crit: pk.crit, multi: pk.multi, ail: { shock: 30 }, noBlast: true, scarProc: true }, false, m, 0.3);
    G.fx.push({ k: 'line', x1: m.x + rnd(-8, 8), y1: m.y - 140, x2: m.x, y2: m.y - 6, t: 0, dur: 0.15, color: '#fff6a0', w: 3 }); Sfx.play('zap', 0.7);
  }
  if (SC('sc_frostfist') && Math.random() * 100 < SC('sc_frostfist')) {
    const nova = scalePk(Object.assign({}, pk, { scarProc: true, noBlast: true }), 0.6); nova.d = { phys: [0, 0], fire: [0, 0], cold: Object.values(nova.d).reduce((a, v) => [a[0] + v[0], a[1] + v[1]], [0, 0]), light: [0, 0], chaos: [0, 0] }; nova.ail = { freeze: 20 };
    for (const o of G.mons) if (!o.dead && dist(o, m) < 85 + o.r) _hitScar(o, nova, false, m, 0.6);
    G.fx.push({ k: 'ring', x: m.x, y: m.y, r: 85, t: 0, dur: 0.35, color: '#bfefff', fill: 'rgba(160,220,255,0.2)' }); Sfx.play('ice');
  }
  return r;
};
// 施放時：千變、疾風、乘風、清明、蓄勢
const _castScar = castSkill;
castSkill = function (sid, c) {
  const pl = G.pl, sk = SKILLS[sid];
  if (SC('sc_variety')) { pl.variety = pl.lastSid && pl.lastSid !== sid ? Math.min(3, (pl.variety || 0) + 1) : 0; pl.lastSid = sid; }
  if (SC('sc_surge') && G.time >= (pl.surgeReady || 0)) { pl.surgeUntil = G.time + 0.6; pl.surgeReady = G.time + SC('sc_surge'); }
  _castScar(sid, c);
  if (SC('sc_haste') && sk.cd) pl.buff = { t: 3, spd: Math.max(pl.buff ? pl.buff.spd : 0, SC('sc_haste') / 100) };
  if (SC('sc_wind') && ['blink', 'dash'].includes(sk.type)) pl.windT = 2;
};
const _useScar = useSkill;
useSkill = function (i) {
  const pl = G.pl, m0 = pl.mana, l0 = pl.life;
  _useScar(i);
  if (SC('sc_clarity') && Math.random() * 100 < SC('sc_clarity')) { if (pl.mana < m0) pl.mana = m0; }
};
// 被打：絕境、方陣、荊甲、紮根、見切、堡壘、反震
const _strikeScar = monsterStrike;
monsterStrike = function (m, target, mult, elemOverride, opts) { G.curAttacker = m; try { return _strikeScar(m, target, mult, elemOverride, opts); } finally { G.curAttacker = null; } };
const _dmgScar = damagePlayer;
damagePlayer = function (parts, opts = {}) {
  if (!G.scar) return _dmgScar(parts, opts);
  const pl = G.pl, S = G.S;
  let red = 0;
  if (SC('sc_phalanx')) red += Math.min(20, G.mons.filter(m => !m.dead && dist(m, pl) < 150).length * SC('sc_phalanx'));
  if (SC('sc_rooted') && (pl.stillT || 0) >= 1.5) red += SC('sc_rooted');
  if (red) parts = parts.map(p => [p[0] * (1 - Math.min(60, red) / 100), p[1]]);
  const before = pl.life + (pl.es || 0), nText = G.texts.length;
  const r = _dmgScar(parts, opts);
  const lost = before - (pl.life + (pl.es || 0));
  const newTxt = G.texts.slice(nText).map(t => t.txt);
  if (newTxt.some(t => t === '閃避' || t === '閃身') && SC('sc_riposte')) { pl.nextCrit = true; G.texts.push({ x: pl.x, y: pl.y - 44, txt: '見切', color: '#ffe6a0', size: 12, t: 0, dur: 0.7 }); }
  if (newTxt.includes('格擋')) {
    if (SC('sc_bastion')) pl.life = Math.min(S.maxLife, pl.life + S.maxLife * SC('sc_bastion') / 100);
    if (SC('sc_quake') && Math.random() * 100 < SC('sc_quake') && G.slotCalc[0]) { const c = G.slotCalc[0]; for (const m of G.mons) if (!m.dead && dist(m, pl) < 100 + m.r) _hitScar(m, { d: c.d, crit: c.crit, multi: c.multi, ail: {}, noBlast: true, scarProc: true }, false, pl, 1.4); G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: 100, t: 0, dur: 0.3, color: '#e0e0e0', fill: 'rgba(220,220,220,0.15)' }); }
  }
  if (lost > 0 && !opts.dot) {
    if (SC('sc_laststand') && lost > S.maxLife * 0.3 && G.time > (pl.lastStandT || 0)) { pl.lastStandT = G.time + 10; pl.life = Math.min(S.maxLife, pl.life + S.maxLife * SC('sc_laststand') / 100); G.texts.push({ x: pl.x, y: pl.y - 50, txt: '絕境', color: '#9fff9f', size: 14, t: 0, dur: 0.9 }); Sfx.play('flask'); }
    const a = G.curAttacker; if (SC('sc_thorns') && a && !a.dead && !a.def.ranged) _hitScar(a, { d: { phys: [lost * SC('sc_thorns') / 100, lost * SC('sc_thorns') / 100], fire: [0, 0], cold: [0, 0], light: [0, 0], chaos: [0, 0] }, crit: 0, multi: 150, ail: {}, noBlast: true, scarProc: true }, false, pl, 0.5);
  }
  return r;
};
// 擊殺：引力、傳染、續杯
Hook.on('kill', m => {
  if (!G.scar) return;
  const pl = G.pl;
  if (SC('sc_magnet') && m.rarity !== 'normal') for (const l of G.loot) if (!l.gone && !l.item && dist(l, m) < 420) { l.x = pl.x + rnd(-6, 6); l.y = pl.y + rnd(-6, 6); }
  if (SC('sc_contagion') && (m.ign || m.bleed || (m.poisons && m.poisons.length))) {
    const near = G.mons.filter(o => !o.dead && o !== m).sort((a, b) => dist(a, m) - dist(b, m)).slice(0, SC('sc_contagion')).filter(o => dist(o, m) < 220);
    for (const o of near) { if (m.ign) o.ign = Object.assign({}, m.ign); if (m.bleed) o.bleed = Object.assign({}, m.bleed); if (m.poisons && m.poisons.length) o.poisons = (o.poisons || []).concat(m.poisons.map(p => Object.assign({}, p))).slice(-20); G.fx.push({ k: 'line', x1: m.x, y1: m.y, x2: o.x, y2: o.y, t: 0, dur: 0.25, color: '#a0f090', w: 2 }); }
  }
  if (SC('sc_refill')) (pl.fl || []).forEach(f => { if (f) f.c = Math.min(f.max, f.c + SC('sc_refill')); });
});
// 喝藥：分享
const _flaskScar = useFlask;
useFlask = function (i) { const f = G.pl.fl[i], c0 = f ? f.c : 0; _flaskScar(i); if (SC('sc_shared') && f && f.c < c0 && FLASKS[f.type].heal === 'life') for (const mn of G.mins) mn.life = Math.min(mn.maxLife, mn.life + mn.maxLife * SC('sc_shared') / 100); };
// 每格：紮根計時、乘風加速、焦土足跡、魂護、蓄勢光、召喚物出生時間
const _updScar = update;
update = function (dt) {
  const pl = G.pl, S = G.S, play = G.state === 'play' && G.P && !G.dead && !UI.paused();
  let restore = null;
  if (play && pl.windT > 0) { restore = S.moveSpeed; S.moveSpeed *= 1 + SC('sc_wind') / 100; pl.windT -= dt; }
  const x0 = pl && pl.x, y0 = pl && pl.y;
  _updScar(dt);
  if (restore != null) S.moveSpeed = restore;
  if (!play || !G.scar) return;
  const moved = Math.hypot(pl.x - x0, pl.y - y0) > 0.3;
  pl.stillT = moved ? 0 : (pl.stillT || 0) + dt;
  for (const mn of G.mins) if (mn.born == null) mn.born = G.time;
  if (SC('sc_cinder') && moved && G.time > (pl.cinderT || 0) && G.slotCalc[0]) {
    pl.cinderT = G.time + 0.25; const c = G.slotCalc[0], v = c.avg * SC('sc_cinder') / 100;
    G.azones.push({ sid: 'cinder', x: pl.x, y: pl.y + 8, r: 22, t: 0, dur: 2, tick: 0.5, next: 0, pk: { d: { phys: [0, 0], fire: [v, v], cold: [0, 0], light: [0, 0], chaos: [0, 0] }, crit: 0, multi: 150, ail: { ignite: 10 }, noBlast: true, scarProc: true }, color: '#ff7a30' });
  }
  if (SC('sc_soulward') && S.maxES > 0) pl.es = Math.min(S.maxES, pl.es + S.maxLife * (BASE_LIFE_REGEN + (S.life_regen || 0)) / 100 * (1 + (S.life_regen_inc || 0) / 100) * dt);
  if (SC('sc_surge') && G.time >= (pl.surgeReady || 0) && Math.random() < 0.3) G.parts.push({ x: pl.x + rnd(-10, 10), y: pl.y + 8, vx: 0, vy: -30, t: 0, dur: 0.5, color: '#c88cff', s: 2 });
};

// ---------- 工坊：夢痕拓印的介面 ----------
const _craftScar = UI.refreshCraft.bind(UI);
UI.refreshCraft = function () {
  _craftScar();
  if (!this.open.craft || !G.P) return;
  const P = G.P, mem = P.scarMem || {}, body = $('#craftBody') || document.querySelector('#craft .craftbody') || $('#craft');
  let box = document.getElementById('scarBox'); if (!box) { box = document.createElement('div'); box.id = 'scarBox'; body.appendChild(box); }
  const ids = Object.keys(mem);
  let h = `<div class="csec" style="color:${SCAR_COLOR}">◆ 夢痕記憶<span class="thint">　分解有夢痕的黃裝就會記住；拓印到同部位的黃裝上（花混沌石 ×${SCAR_IMPRINT_COST.chaos}）</span></div>`;
  if (!ids.length) h += '<div class="ihint">還沒有記住任何夢痕。黃裝（物品等級 30 以上）有機會帶夢痕，分解它就會記住。</div>';
  else {
    const sel = this.scarSel && mem[this.scarSel] ? this.scarSel : ids[0]; this.scarSel = sel; const s = SCAR_BY_ID[sel];
    h += `<div class="crow"><label>夢痕<select id="scarPick">${ids.map(id => `<option value="${id}" ${id === sel ? 'selected' : ''}>${SCAR_SLOT_NAME[SCAR_BY_ID[id].slot]}・${SCAR_BY_ID[id].name}（${mem[id]}）</option>`).join('')}</select></label></div>`;
    h += `<div class="ihint" style="color:${SCAR_COLOR}">${s.text(mem[sel])}</div>`;
    const cands = P.inv.map((it, i) => [it, i]).filter(([it]) => scarImprintable(it) && scarSlotOf(it) === s.slot);
    h += cands.length ? `<div class="scarcands">${cands.map(([it, i]) => `<button data-scar="${i}">拓印到：${it.name}${it.scar ? '（會換掉原本的）' : ''}</button>`).join('')}</div>` : `<div class="ihint">背包裡沒有黃色的${SCAR_SLOT_NAME[s.slot]}可以拓印。</div>`;
  }
  box.innerHTML = h;
  const sp = $('#scarPick'); if (sp) sp.onchange = () => { this.scarSel = sp.value; this.refreshCraft(); };
  box.querySelectorAll('[data-scar]').forEach(b => b.onclick = () => scarImprint(+b.dataset.scar, this.scarSel));
};
