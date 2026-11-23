// =============================================================
//  v2.7.2 詛咒：召喚師／法系那一側的新玩法
//  ・詛咒技能：對滑鼠位置一個範圍內的怪物降下詛咒（持續 6 秒，寶石等級越高越久、越強）
//  ・同一隻怪身上同時能有幾個詛咒＝「詛咒上限」（基本 1 個；天賦「惡語術」+1）
//    超過上限時，最舊的那個會被新的頂掉
//  ・天賦：詛咒效果（數值變強）、詛咒範圍
//  ・召喚師開局就會「衰弱」，其他詛咒打怪掉落（召喚師、法師比較容易掉）
// =============================================================
const CURSE_DEF = {
  c_enf: { name: '衰弱', color: '#b0b0b0', base: 20, text: v => `造成的傷害 −${v}%` },
  c_vuln: { name: '脆弱', color: '#e08a5a', base: 25, text: v => `受到的物理傷害 +${v}%` },
  c_ele: { name: '元素要害', color: '#7ab8ff', base: 25, text: v => `火焰、冰冷、閃電抗性 −${v}%` },
  c_chain: { name: '時空鎖鏈', color: '#c8a0ff', base: 25, text: v => `移動和攻擊速度 −${v}%` },
};
Object.assign(SKILLS, {
  c_enf: { name: '衰弱詛咒', icon: '衰', color: '#b0b0b0', lvl: 1, cls: 'summoner', tags: ['spell', 'area', 'curse'], cost: 10, base: [0, 0], crit: 0, cast: 0.5, eff: 0, type: 'curse', curse: 'c_enf', radius: 110, range: 420,
    desc: '詛咒滑鼠附近的敵人：牠們造成的傷害降低 20%（持續 6 秒）。保護召喚物和自己。' },
  c_vuln: { name: '脆弱詛咒', icon: '脆', color: '#e08a5a', lvl: 4, cls: 'summoner', tags: ['spell', 'area', 'curse'], cost: 10, base: [0, 0], crit: 0, cast: 0.5, eff: 0, type: 'curse', curse: 'c_vuln', radius: 110, range: 420,
    desc: '詛咒滑鼠附近的敵人：受到的物理傷害增加 25%（骷髏、狼、魔像、近戰都吃得到）。' },
  c_ele: { name: '元素要害', icon: '要', color: '#7ab8ff', lvl: 8, cls: 'mage', tags: ['spell', 'area', 'curse'], cost: 12, base: [0, 0], crit: 0, cast: 0.5, eff: 0, type: 'curse', curse: 'c_ele', radius: 110, range: 420,
    desc: '詛咒滑鼠附近的敵人：火焰、冰冷、閃電抗性降低 25%。' },
  c_chain: { name: '時空鎖鏈', icon: '鎖', color: '#c8a0ff', lvl: 12, cls: 'summoner', tags: ['spell', 'area', 'curse'], cost: 12, base: [0, 0], crit: 0, cast: 0.5, eff: 0, type: 'curse', curse: 'c_chain', radius: 110, range: 420,
    desc: '詛咒滑鼠附近的敵人：移動和攻擊速度降低 25%。' },
});
const CURSE_SKILLS = ['c_enf', 'c_vuln', 'c_ele', 'c_chain'];
Object.assign(SKILL_ATTR, { c_enf: ['int'], c_vuln: ['int', 'str'], c_ele: ['int'], c_chain: ['int', 'dex'] });
for (const k of CURSE_SKILLS) { SKILLS[k].id = k; SKILLS[k].req = gemReqAttr(k, 1); }
if (typeof SKILL_GLYPHS !== 'undefined') for (const k of CURSE_SKILLS) if (!SKILL_GLYPHS[k] && SKILL_GLYPHS.nova) SKILL_GLYPHS[k] = SKILL_GLYPHS.nova;
if (!CLASS_GEMS.summoner.includes('c_enf')) CLASS_GEMS.summoner.push('c_enf');
Object.assign(STAT_TEXT, {
  curse_eff: v => `+${v}% 詛咒效果`,
  curse_area: v => `+${v}% 詛咒範圍`,
  curse_max: v => `+${v} 詛咒上限（同一隻怪身上可以同時有的詛咒數）`,
});

// 詛咒強度：基本值 ×（1＋寶石等級每級 3%）×（1＋詛咒效果）
const curseMaxOf = () => 1 + ((G.S && G.S.curse_max) || 0);
function curseValue(sid) { const cd = CURSE_DEF[SKILLS[sid].curse]; return Math.round(cd.base * (1 + 0.03 * (gemLv(sid) - 1)) * (1 + ((G.S && G.S.curse_eff) || 0) / 100)); }
function curseDur(sid) { return 6 + 0.2 * (gemLv(sid) - 1); }
// 套上／拿掉效果（抗性、速度直接改在怪物身上；傷害類在打擊時算）
function curseOn(m, c, sign) {
  if (c.id === 'c_ele') for (const e of ['fire', 'cold', 'light']) m.res[e] -= sign * c.v;
  if (c.id === 'c_chain') { const f = 1 - c.v / 100; if (sign > 0) { m.speed *= f; m.aspd *= f; } else { m.speed /= f; m.aspd /= f; } }
}
function applyCurse(m, id, v, dur) {
  if (m.dead) return;
  m.curses = m.curses || [];
  const old = m.curses.find(c => c.id === id);
  if (old) { curseOn(m, old, -1); m.curses.splice(m.curses.indexOf(old), 1); }
  const c = { id, v: m.boss ? Math.round(v * 0.66) : v, t: dur };   // 首領只吃 2/3
  m.curses.push(c); curseOn(m, c, 1);
  while (m.curses.length > curseMaxOf()) { const o = m.curses.shift(); curseOn(m, o, -1); }
}
const curseV = (m, id) => { const c = m.curses && m.curses.find(x => x.id === id); return c ? c.v : 0; };

// 施放
NEW_CAST.curse = function (sid, c, sk, pk, ang) {
  const pl = G.pl, range = sk.range;
  let tx = input.wx, ty = input.wy; const d = Math.hypot(tx - pl.x, ty - pl.y);
  if (d > range) { tx = pl.x + (tx - pl.x) / d * range; ty = pl.y + (ty - pl.y) / d * range; }
  const R = sk.radius * (c.areaMul || 1) * (1 + ((G.S.curse_area) || 0) / 100);
  const v = curseValue(sid), dur = curseDur(sid), cd = CURSE_DEF[sk.curse];
  let n = 0;
  for (const m of G.mons) if (!m.dead && Math.hypot(m.x - tx, m.y - ty) < R + m.r) { applyCurse(m, sk.curse, v, dur); n++; }
  G.fx.push({ k: 'ring', x: tx, y: ty, r: R, t: 0, dur: 0.45, color: cd.color, fill: cd.color + '22' });
  if (!n) G.texts.push({ x: tx, y: ty - 10, txt: '沒有敵人', color: '#aaa', t: 0, dur: 0.7 });
};
// 傷害：脆弱＝物理多吃；衰弱＝怪物打人變弱
const _hitCurse = hitMonster;
hitMonster = function (m, pk, ...rest) {
  const vu = m && m.curses && curseV(m, 'c_vuln');
  if (vu && pk && pk.d && pk.d.phys) { pk = Object.assign({}, pk, { d: Object.assign({}, pk.d, { phys: [pk.d.phys[0] * (1 + vu / 100), pk.d.phys[1] * (1 + vu / 100)] }) }); }
  return _hitCurse(m, pk, ...rest);
};
const _partsCurse = monsterParts;
monsterParts = function (m, ...rest) {
  const r = _partsCurse(m, ...rest), en = m && m.curses && curseV(m, 'c_enf');
  if (en && Array.isArray(r)) for (const p of r) if (Array.isArray(p)) p[0] *= 1 - en / 100;
  return r;
};
// 計時
Hook.on('update', dt => {
  for (const m of G.mons) if (m.curses && m.curses.length) for (let i = m.curses.length - 1; i >= 0; i--) { const c = m.curses[i]; if ((c.t -= dt) <= 0) { curseOn(m, c, -1); m.curses.splice(i, 1); } }
});
// 畫：怪物頭上的小色點（一個詛咒一顆）
const _drawMonCurse = drawMonster;
drawMonster = function (g, m) {
  _drawMonCurse(g, m);
  if (m.curses && m.curses.length && !m.dead) m.curses.forEach((c, i) => { g.fillStyle = CURSE_DEF[c.id].color; g.beginPath(); g.arc(m.x - (m.curses.length - 1) * 4 + i * 8, m.y - m.r * 2 - 14, 3, 0, Math.PI * 2); g.fill(); });
};
// 技能說明：顯示詛咒的實際數值
const _calcCurse = calcSkill;
calcSkill = function (S, sid, ...rest) {
  const r = _calcCurse(S, sid, ...rest);
  if (SKILLS[sid] && SKILLS[sid].type === 'curse' && r) { r.dps = 0; r.curseText = `${CURSE_DEF[SKILLS[sid].curse].text(curseValue(sid))}，持續 ${curseDur(sid).toFixed(1)} 秒，同一隻怪最多 ${curseMaxOf()} 個詛咒`; }
  return r;
};
if (typeof TAG_NAME !== 'undefined') TAG_NAME.curse = '詛咒';
const _skillInfoCurse = UI.skillInfo.bind(UI);
UI.skillInfo = function (sid, c) { if (SKILLS[sid] && SKILLS[sid].type === 'curse') return c && c.curseText ? c.curseText : CURSE_DEF[SKILLS[sid].curse].text(curseValue(sid)); return _skillInfoCurse(sid, c); };
