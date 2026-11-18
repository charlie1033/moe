// =============================================================
//  v2.8.8 空白鍵的位移技能依職業不同（職業固定技能，不用寶石）
//  ・弓箭手、盜賊：翻滾（往移動方向翻，無敵 0.28 秒，冷卻 1 秒）
//  ・法師、召喚師：瞬移（往滑鼠方向瞬間移動，無敵 0.2 秒，冷卻 1.4 秒）
//  ・戰士：躍擊（跳到滑鼠位置，空中無敵，落地砸出範圍傷害，冷卻 2.5 秒）
//  ・武士：一閃（往滑鼠方向拔刀衝刺，砍穿路上所有敵人，衝刺中無敵，冷卻 2 秒）
//  ・原本的「閃現」「居合斬」技能寶石拿掉了（舊存檔：居合斬換成燕返，閃現拿下來）
// =============================================================
const CLASS_MOVE = {
  ranger: { id: 'roll', name: '翻滾', glyph: '滾', cd: 1.0 }, druid: { id: 'roll', name: '翻滾', glyph: '滾', cd: 1.0 },
  mage: { id: 'blink', name: '瞬移', glyph: '移', cd: 1.4 }, summoner: { id: 'blink', name: '瞬移', glyph: '移', cd: 1.4 },
  warrior: { id: 'leap', name: '躍擊', glyph: '躍', cd: 2.5 }, samurai: { id: 'issen', name: '一閃', glyph: '閃', cd: 2.0 },
};
const classMove = () => CLASS_MOVE[(G.P && G.P.cls)] || CLASS_MOVE.ranger;
// 拿掉的寶石：不掉落、不賣、職業開局也不送
const REMOVED_GEMS = ['blink', 'iai'];
REMOVED_GEMS.forEach(k => { if (SKILLS[k]) SKILLS[k].hidden = true; });
for (const c in CLASS_GEMS) CLASS_GEMS[c] = CLASS_GEMS[c].filter(k => !REMOVED_GEMS.includes(k));
if (!CLASS_GEMS.samurai.includes('swallow')) CLASS_GEMS.samurai.unshift('swallow');
CLASSES.samurai.skills = ['heavy', 'swallow', null, null, null];
CLASSES.samurai.desc = `力量區：太刀、暴擊、流血。${byCtl('空白鍵', '閃避鈕')}「一閃」拔刀衝刺，一刀一個。`;
CLASSES.warrior.desc += `${byCtl('空白鍵', '閃避鈕')}「躍擊」跳進敵陣。`;
const _rsgCM = randomSkillGem;
randomSkillGem = function (mlvl) { let s = _rsgCM(mlvl), n = 0; while (REMOVED_GEMS.includes(s) && n++ < 20) s = _rsgCM(mlvl); return REMOVED_GEMS.includes(s) ? 'heavy' : s; };
const _gemShopCM = UI.refreshGemShop.bind(UI);
UI.refreshGemShop = function () {
  const saved = {}; REMOVED_GEMS.forEach(k => { saved[k] = SKILLS[k]; delete SKILLS[k]; });   // 商店列表暫時看不到
  try { return _gemShopCM(); } finally { Object.assign(SKILLS, saved); }
};
// 舊存檔：技能欄上的居合斬→燕返、閃現→拿下來；寶石袋清掉
Hook.on('start', () => {
  const p = G.P;
  try {
    let changed = false;
    p.skills = p.skills.map(s => { if (s === 'iai') { changed = true; return 'swallow'; } if (s === 'blink') { changed = true; return null; } return s; });
    if (p.skillGems) REMOVED_GEMS.forEach(k => { if (p.skillGems[k]) { delete p.skillGems[k]; changed = true; } });
    if (changed) { onBuildChanged(); UI.refresh && UI.refresh(); setTimeout(() => UI.msg(`「閃現」「居合斬」改成職業位移技能了：按 ${keyLabel('dodge')} 使用「${classMove().name}」`, '#ffd36a'), 1500); }
  } catch (e) { }
});
// —— 施放 ——
const _rollCM = playerDodge;
function aimAt(dist) {
  const f = faceDir();   // v2.16.2 空白鍵位移照角色面向的方向，不看滑鼠
  return { ax: f.x, ay: f.y, len: dist };
}
function withAim(tx, ty, fn) { const ox = input.wx, oy = input.wy; input.wx = tx; input.wy = ty; try { fn(); } finally { input.wx = ox; input.wy = oy; } }
playerDodge = function () {
  const pl = G.pl, P = G.P; if (!pl || !P || G.dead || UI.paused()) return;
  const M = classMove(); DODGE.cd = M.cd;
  if (M.id === 'roll') return _rollCM();
  if ((pl.dodgeCd || 0) > 0 || pl.roll > 0 || pl.leap) return;
  const pa = pl.ail || {}; if (pa.frozen > 0 || pl.stun > 0) return;
  pl.dodgeCd = M.cd;
  if (M.id === 'blink') {
    const a = aimAt(200); pl.iframe = 0.2;
    withAim(pl.x + a.ax * 200, pl.y + a.ay * 200, () => castSkill('blink', { d: {}, crit: 0, multi: 150, ail: {}, areaMul: 1 }));
  } else if (M.id === 'issen') {
    const c = calcSkill(G.S, 'iai', P.lvl, []); pl.iframe = 0.3;
    const a = aimAt(200);
    withAim(pl.x + a.ax * 200, pl.y + a.ay * 200, () => castSkill('iai', c));
    G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: 30, t: 0, dur: 0.25, color: '#fff0c0', fill: 'rgba(255,240,190,0.15)' });
  } else if (M.id === 'leap') {
    const a = aimAt(220); let tx = pl.x, ty = pl.y;
    for (let d = 8; d <= a.len; d += 8) { const nx = pl.x + a.ax * d, ny = pl.y + a.ay * d; if (blockedCircle(nx, ny, pl.r)) continue; tx = nx; ty = ny; }   // 可以跳過矮的障礙，落點要是空地
    pl.leap = { sx: pl.x, sy: pl.y, tx, ty, t: 0, dur: 0.32 }; pl.iframe = 0.4;
    if (a.ax) pl.facing = a.ax > 0 ? 1 : -1;
    Sfx.play('swing');
  }
};
// 躍擊的飛行與落地
Hook.on('update', dt => {
  const pl = G.pl; if (!pl || !pl.leap) return;
  const L = pl.leap; L.t += dt; const p = Math.min(1, L.t / L.dur);
  pl.x = L.sx + (L.tx - L.sx) * p; pl.y = L.sy + (L.ty - L.sy) * p; pl.hop = Math.sin(p * Math.PI) * 30;
  if (p >= 1) {
    pl.leap = null; pl.hop = 0;
    const c = calcSkill(G.S, G.P.skills[0] && SKILLS[G.P.skills[0]].tags.includes('attack') ? G.P.skills[0] : 'heavy', G.P.lvl, []);
    const pk = { d: {}, crit: c.crit, multi: c.multi, ail: {} }; for (const k in c.d) pk.d[k] = [c.d[k][0] * 1.4, c.d[k][1] * 1.4];
    const R = 80;
    for (const m of G.mons) if (!m.dead && Math.hypot(m.x - pl.x, m.y - pl.y) <= R + m.r) hitMonster(m, pk, false, { x: pl.x, y: pl.y }, 1.6);
    G.fx.push({ k: 'ring', x: pl.x, y: pl.y + 6, r: R, t: 0, dur: 0.35, color: '#ffc080', fill: 'rgba(255,170,90,0.22)' });
    burst(pl.x, pl.y + 8, '#c8a070', 18, 160); G.shake = Math.max(G.shake, 6); Sfx.play('boom');
  }
});
// 跳起來時角色畫高一點
const _drawPlCM = drawPlayer;
drawPlayer = function (g, ...a) { const pl = G.pl; if (pl && pl.hop) { g.save(); g.translate(0, -pl.hop); const r = _drawPlCM(g, ...a); g.restore(); return r; } return _drawPlCM(g, ...a); };
// 按鍵名稱、手機按鈕、說明
const kaD = KEY_ACTIONS.find(a => a.id === 'dodge'); if (kaD) kaD.name = '職業位移（翻滾／瞬移／躍擊／一閃）';
setInterval(() => { const b = document.getElementById('tdodge'); if (b && G.P) { const g = classMove().glyph; if (b.textContent !== g) b.textContent = g; } }, 1000);
