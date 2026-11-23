// =============================================================
//  v2.8.14 ① 習慣「投射物返回」：投射物飛到底再飛回來，回程也會打（傷害變成 0.9 倍）
//          ② 光環技能寶石：按一下開、再按一下關；開著的時候「保留」一部分最大魔力，換來一直生效的效果（v2.13.9 開著時技能列那格會亮）
//             光環要放在技能欄上才有效（拿下來就關掉）；寶石等級越高效果越好
// =============================================================
Object.assign(SUPPORTS, {
  ret: { name: '投射物返回', color: '#5cc45c', req: ['projectile'], cost: 1.3, mods: { more_dmg: -10, retProj: true }, exclType: ['rain'],
    desc: '投射物飛到底會飛回來，回程也會再打一次。<br>傷害變成 0.9 倍。' },
});
const _castRet = castSkill;
castSkill = function (sid, c) {
  const before = G.projs.length; const r = _castRet(sid, c);
  if (c && (c.active || []).includes('ret')) for (let i = before; i < G.projs.length; i++) { const p = G.projs[i]; if (p.team === 'ally' && !p.ret && !p.orb) { p.ret = true; p.life = Math.max(p.life, 1.6); p.turnAt = p.life - 0.45; } }
  return r;
};

// —— 光環 ——
const AURA_DEF = {
  a_haste: { name: '迅捷光環', color: '#7ae0ff', res: 25, lvl: 8, attr: ['dex'], cls: 'druid', stats: { aspd_inc: 10, cspd_inc: 10, move_inc: 5 }, text: '攻擊、施法速度 +10%、移動速度 +5%' },
  a_might: { name: '憤怒光環', color: '#ff7050', res: 25, lvl: 10, attr: ['str'], cls: 'warrior', stats: { dmg_inc: 14 }, text: '所有傷害 +14%' },
  a_guard: { name: '堅守光環', color: '#c8c8d8', res: 25, lvl: 6, attr: ['str'], cls: 'samurai', stats: { armour_inc: 35, evasion_inc: 35 }, text: '護甲、閃避 +35%' },
  a_vital: { name: '活力光環', color: '#7aff9a', res: 20, lvl: 4, attr: ['str'], cls: 'warrior', stats: { life_regen: 1 }, text: '每秒回復 1% 最大生命' },
  a_purity: { name: '淨化光環', color: '#ffe8a0', res: 20, lvl: 12, attr: ['int'], cls: 'mage', stats: { res_all: 12 }, text: '全元素抗性 +12%' },
  a_command: { name: '統御光環', color: '#c8a0ff', res: 25, lvl: 8, attr: ['int'], cls: 'summoner', stats: { minion_dmg_inc: 18, minion_life_inc: 18 }, text: '召喚物傷害、生命 +18%' },
  a_focus: { name: '專注光環', color: '#ffd36a', res: 25, lvl: 14, attr: ['dex', 'int'], cls: 'ranger', stats: { crit_inc: 35 }, text: '暴擊率 +35%' },
};
for (const id in AURA_DEF) {
  const A = AURA_DEF[id];
  SKILLS[id] = { id, name: A.name, icon: A.name[0], color: A.color, lvl: A.lvl, cls: A.cls, tags: ['aura'], cost: 0, cd: 1, cast: 0.3, type: 'aura', aura: true,
    desc: `開啟：保留 ${A.res}% 最大魔力，${A.text}。再按一次關掉。要放在技能欄上才有效。` };
  SKILL_ATTR[id] = A.attr; SKILLS[id].req = gemReqAttr(id, 1);
  if (typeof SKILL_GLYPHS !== 'undefined' && !SKILL_GLYPHS[id] && SKILL_GLYPHS.warcry) SKILL_GLYPHS[id] = SKILL_GLYPHS.warcry;
}
if (typeof TAG_NAME !== 'undefined') TAG_NAME.aura = '光環';
const auraMul = sid => 1 + 0.04 * (gemLv(sid) - 1);
// 開／關
NEW_CAST.aura = function (sid) {
  const P = G.P; P.auras = P.auras || {};
  if (P.auras[sid]) { delete P.auras[sid]; UI.msg(`${AURA_DEF[sid].name} 關閉`, '#a89878'); }
  else { P.auras[sid] = true; UI.msg(`${AURA_DEF[sid].name} 開啟：保留 ${AURA_DEF[sid].res}% 魔力`, AURA_DEF[sid].color); G.fx.push({ k: 'ring', x: G.pl.x, y: G.pl.y, r: 70, t: 0, dur: 0.5, color: AURA_DEF[sid].color, fill: AURA_DEF[sid].color + '22' }); }
  Sfx.play('buff'); onBuildChanged(); saveGame();
};
// 能力：開著、而且在技能欄上的光環才算
function activeAuras(P) { if (!P || !P.auras) return []; return Object.keys(P.auras).filter(id => AURA_DEF[id] && P.skills.includes(id)); }
const _csAura = computeStats;
computeStats = function (P) {
  const S = _csAura(P);
  const list = activeAuras(P); if (!list.length) return S;
  let res = 0;
  for (const id of list) { const A = AURA_DEF[id], m = auraMul(id); res += A.res; for (const k in A.stats) S[k] = (S[k] || 0) + Math.round(A.stats[k] * m * 10) / 10; }
  // 這幾個數值在原本的計算裡已經算成最終值了，要補算一次
  const add = k => list.reduce((s, id) => s + (AURA_DEF[id].stats[k] || 0) * auraMul(id), 0);
  if (add('armour_inc') && S.armourT) S.armourT = Math.round(S.armourT * (1 + add('armour_inc') / 100));
  if (add('evasion_inc') && S.evasionT) S.evasionT = Math.round(S.evasionT * (1 + add('evasion_inc') / 100));
  if (add('move_inc') && S.moveSpeed) S.moveSpeed *= 1 + add('move_inc') / 100;
  if (add('life_regen') && S.maxLife && !S.flags.noRegen) S.lifeRegenPS = (S.lifeRegenPS || 0) + S.maxLife * add('life_regen') / 100;
  if (add('res_all')) for (const e of ['res_fire', 'res_cold', 'res_light']) S[e] = (S[e] || 0) + add('res_all');
  S.manaReserved = Math.min(95, res); S.maxManaFull = S.maxMana; S.maxMana = Math.max(1, Math.round(S.maxMana * (1 - S.manaReserved / 100)));   // maxManaFull：保留之前的總魔力（魔力球用）
  return S;
};
const _obcAura = onBuildChanged;
onBuildChanged = function (...a) { const r = _obcAura(...a); if (G.pl && G.S && G.pl.mana > G.S.maxMana) G.pl.mana = G.S.maxMana; return r; };
// 技能說明
const _infoAura = UI.skillInfo.bind(UI);
UI.skillInfo = function (sid, c) {
  const A = AURA_DEF[sid]; if (!A) return _infoAura(sid, c);
  const m = auraMul(sid), on = G.P && G.P.auras && G.P.auras[sid];
  return `${on ? '<b style="color:#9fff9f">開啟中</b>　' : ''}保留 ${A.res}% 魔力：${Object.keys(A.stats).map(k => STAT_TEXT[k] ? STAT_TEXT[k](Math.round(A.stats[k] * m * 10) / 10) : k).join('、')}`;
};
// 腳下的光環圈
const _drawPlAura = drawPlayer;
drawPlayer = function (g, ...a) {
  const P = G.P, pl = G.pl, list = activeAuras(P);
  if (pl && list.length && !(typeof drawAuraArt === 'function' && drawAuraArt(g, pl, list))) list.forEach((id, i) => { g.save(); g.strokeStyle = AURA_DEF[id].color; g.globalAlpha = 0.35 + 0.15 * Math.sin(G.time * 2 + i); g.lineWidth = 2; g.beginPath(); g.ellipse(pl.x, pl.y + 10, 30 + i * 6, (30 + i * 6) * 0.38, 0, 0, Math.PI * 2); g.stroke(); g.restore(); });
  return _drawPlAura(g, ...a);
};
// v2.14.2 魔力球：保留掉的那一段畫成上面一截暗灰色斜線（球裡的藥水照「總魔力」的比例畫，不會因為保留就看起來全滿）
Hook.on('drawHUD', g => {
  const S = G.S, P = G.P; if (!P || !S || !S.manaReserved || G.state !== 'play' || typeof HUD === 'undefined' || !HUD.orbR) return;
  const [x, y, r] = HUD.orbR, f = S.manaReserved / 100, top = y - r, h = r * 2 * f;
  g.save(); g.beginPath(); g.arc(x, y, r - 1, 0, Math.PI * 2); g.clip();
  g.fillStyle = 'rgba(18,16,26,0.82)'; g.fillRect(x - r, top, r * 2, h);
  g.strokeStyle = 'rgba(150,140,190,0.35)'; g.lineWidth = 1.5; g.beginPath();
  for (let k = -r * 2; k < r * 2; k += 6) { g.moveTo(x + k, top); g.lineTo(x + k + h, top + h); }
  g.stroke();
  g.strokeStyle = 'rgba(200,190,255,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - r, top + h); g.lineTo(x + r, top + h); g.stroke();
  g.restore();
  if (h > 12) txt(g, `保留 ${S.manaReserved}%`, x, top + Math.min(h / 2 + 3, h - 4), 9, '#c8c0ff', 'center');
});
// v2.13.9 開著的光環：技能列上那一格亮起來（金色呼吸光框＋右上角小燈），一眼就知道哪些光環開著
Hook.on('drawHUD', g => {
  const P = G.P; if (!P || G.state !== 'play') return;
  const on = activeAuras(P); if (!on.length) return;
  const t = G.time;
  g.save();
  for (let i = 0; i < 5; i++) {
    const sid = P.skills[i]; if (!sid || !on.includes(sid)) continue;
    const [x, y, s] = HUD.skill(i), col = AURA_DEF[sid].color, p = 0.55 + 0.45 * Math.sin(t * 3 + i);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18 + 0.12 * p; g.fillStyle = col; g.fillRect(x + 2, y + 2, s - 4, s - 4);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.65 + 0.35 * p; g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(x - 1, y - 1, s + 2, s + 2);
    g.globalAlpha = 1; g.fillStyle = col; g.beginPath(); g.arc(x + s - 5, y + 5, 3, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke();
  }
  g.restore();
});
