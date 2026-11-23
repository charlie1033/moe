// =============================================================
//  v2.7.3 技能寶石／輔助寶石擴充與限制整理
//  限制原則：輔助寶石只能插在「它真的有作用」的技能上
//  ・加傷害、加異常、暴擊、偷取這類：不能插在詛咒、召喚、位移、增益技能上（這些技能本身沒有傷害）
//  ・多重投射、穿透：只能插在投射物技能上（法術投射物也可以，例如火球、冰矛）；箭雨不算（它是一波一波落下，不是飛出去）
//  ・集中效應（範圍變小、傷害變高）：詛咒沒有傷害，不能插
//  ・範圍擴大、速度、透支：詛咒也可以用
// =============================================================
// —— 新的技能寶石 ——
Object.assign(SKILLS, {
  firewall: { name: '烈焰之牆', icon: '牆', color: '#ff9a50', lvl: 12, cls: 'mage', tags: ['spell', 'area'], elem: 'fire', cost: 14,
    base: [6, 10], crit: 5, cast: 0.8, eff: 0.45, type: 'zone', radius: 95, dur: 4, tick: 0.4, range: 420, maxZones: 2, ail: { ignite: 25 },
    desc: '在滑鼠位置燃起一片火海，持續 4 秒，25% 機率點燃。最多同時 2 片。' },
  poisonarrow: { name: '毒蛇箭', icon: '蛇', color: '#8ad050', lvl: 8, cls: 'druid', tags: ['attack', 'projectile'], cost: 6, eff: 0.85, speed: 1.0,
    type: 'proj', count: 1, spread: 0, pspeed: 640, pierce: 1, need: 'bow', sprite: 'arrow', ail: { poison: 60 },
    desc: '淬毒的箭，穿透 1 個敵人，60% 機率中毒。需要弓。' },
  charge: { name: '猛衝', icon: '衝', color: '#e8b070', lvl: 10, cls: 'warrior', tags: ['attack', 'melee'], cost: 6, cd: 3, eff: 1.6, speed: 0.9,
    type: 'dash', dist: 200, need: 'melee', ail: { bleed: 15 },
    desc: '往前衝撞，沿路撞擊所有敵人，15% 機率流血。冷卻 3 秒。可以插傷害類的輔助寶石。' },
  frosttrap: { name: '冰霜陷阱', icon: '凍', color: '#9ad8ff', lvl: 10, cls: 'ranger', tags: ['spell', 'area'], elem: 'cold', cost: 10,
    base: [14, 22], crit: 6, cast: 0.45, eff: 1, type: 'trap', radius: 85, range: 380, maxTraps: 3, ail: { freeze: 25 },
    desc: '在滑鼠位置放冰霜陷阱（最多 3 個），敵人靠近就炸開，25% 機率冰凍。' },
});
// 猛衝：雖然是位移技能，但它本身有傷害 → 不標 movement（標了會讓傷害輔助全部插不上），冷卻照舊
const NEW_GEMS2 = ['firewall', 'poisonarrow', 'charge', 'frosttrap'];   // 骨矛移到 summoner2.js（v2.13 變成召喚師開局技能）
Object.assign(SKILL_ATTR, { firewall: ['int'], poisonarrow: ['dex'], charge: ['str'], frosttrap: ['dex', 'int'] });
for (const k of NEW_GEMS2) { SKILLS[k].id = k; SKILLS[k].req = gemReqAttr(k, 1); }
if (typeof SKILL_GLYPHS !== 'undefined') for (const k of NEW_GEMS2) if (!SKILL_GLYPHS[k]) SKILL_GLYPHS[k] = SKILL_GLYPHS[{ firewall: 'blizzard', poisonarrow: 'rapid', charge: 'iai', bonespear: 'icespear', frosttrap: 'smoketrap' }[k]] || SKILL_GLYPHS.heavy;
// 毒蛇箭：毒雨箭本來就是毒系，弓箭手前期也有個中毒選擇；陷阱型技能讓 NEW_CAST.trap 處理元素
// —— 輔助寶石 ——（v2.17：持續傷害強化、近戰物理併進「威力」；詛咒延長併進「詛咒強化」；節能改成「透支」，在 gems4.js）
Object.assign(SUPPORTS, {
  curseamp: { name: '詛咒強化', color: '#5b8cff', req: ['curse'], cost: 1.3, mods: {},
    desc: '詛咒更強、維持更久。<br>詛咒效果 +30%，持續時間 +60%。' },
});
const _supportFits0 = supportFits;
supportFits = function (id, sid) {
  if (!_supportFits0(id, sid)) return false;
  const sp = SUPPORTS[id], sk = SKILLS[sid];
  if (sp.exclType && sp.exclType.includes(sk.type)) return false;
  return true;
};
// 為什麼插不上：給技能頁的說明用
function supportWhyNot(id, sid) {
  const sp = SUPPORTS[id], sk = SKILLS[sid]; if (!sp || !sk) return '';
  if (sp.exclType && sp.exclType.includes(sk.type)) return `${sp.name}對「${sk.name}」沒有作用`;
  const bad = (sp.excl || []).find(t => sk.tags.includes(t));
  if (bad) return `${sp.name}不能用在${TAG_NAME[bad] || bad}技能上`;
  if (!sp.req.some(t => sk.tags.includes(t))) return `${sp.name}只能用在${sp.req.map(t => TAG_NAME[t] || t).join('或')}技能上`;
  return '';
}
// 輔助寶石說明框：多一行「可以插在哪些技能」
if (typeof TAG_NAME !== 'undefined') Object.assign(TAG_NAME, { curse: '詛咒', buff: '增益', movement: '位移' });

// —— 詛咒輔助：效果、時間 ——
const _calcG2 = calcSkill;
calcSkill = function (S, sid, lvl, sups, ...rest) {
  const r = _calcG2(S, sid, lvl, sups, ...rest);
  if (r && SKILLS[sid] && SKILLS[sid].type === 'curse') {
    const has = id => (sups || []).includes(id) && supportFits(id, sid);
    r.curseMul = has('curseamp') ? 1.3 : 1; r.curseDurMul = has('curseamp') ? 1.6 : 1;
    const cd = CURSE_DEF[SKILLS[sid].curse];
    r.curseText = `${cd.text(Math.round(curseValue(sid) * r.curseMul))}，持續 ${(curseDur(sid) * r.curseDurMul).toFixed(1)} 秒，同一隻怪最多 ${curseMaxOf()} 個詛咒`;
  }
  return r;
};
const _curseCast = NEW_CAST.curse;
NEW_CAST.curse = function (sid, c, sk, pk, ang) {
  const v0 = curseValue, d0 = curseDur;
  curseValue = s => Math.round(v0(s) * (c.curseMul || 1)); curseDur = s => d0(s) * (c.curseDurMul || 1);
  try { return _curseCast(sid, c, sk, pk, ang); } finally { curseValue = v0; curseDur = d0; }
};
// 技能頁：插上去卻沒作用的輔助寶石，滑鼠移上去說明原因
const _gemTipG2 = UI.gemTip.bind(UI);
UI.gemTip = function (p) {
  let h = _gemTipG2(p);
  const [kind, a, b] = String(p).split(':');
  if (kind === 'link' && G.P) {
    const sid = G.P.skills[+a], id = G.P.links[+a] && G.P.links[+a][+b];
    if (sid && id && !supportFits(id, sid)) h = h.replace('<div class="tip-hint">', `<div class="tip-mod c-bad">現在沒有作用：${supportWhyNot(id, sid)}</div><div class="tip-hint">`);
  }
  return h;
};
