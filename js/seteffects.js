// =============================================================
//  v2.17 套裝效果（套裝資料、旗標在 sets.js；這裡只做「穿滿門檻之後會發生的事」）
//   大白 2：靈狼上限 +1、靈狼變成白色大狗（顏色、大小）｜大白 3：翻滾時所有召喚物撲到你前方 150 處，各自炸一圈（召喚物攻擊 ×4，範圍 80，冷卻 1.5 秒）
//   逃兵 2：移動 +15%，被打到後 2 秒內再 +25%｜逃兵 3：翻滾起點留下殘影 3 秒（會嘲諷怪物、不會攻擊）
//   書呆子 2：放出跟上一招不同元素的技能，回 4% 魔力｜書呆子 3：技能欄每種元素更多傷害 +10%
//   一百三十七夜 2：真的死掉時記一層（最多 3），進下一張地圖時變成更多傷害 +15%／層（那張地圖有效，用掉就歸零）
//   一百三十七夜 4：會死的那一下改成「殘夢」5 秒（生命停在 1、不受傷），殺 10 隻滿血站起來；時間到沒殺夠就真的死（每張地圖一次）
//   書記 2：連續換不同技能，每次更多傷害 +6%（最多 5 層）｜書記 3：連放 5 個不同技能後，下一招退還魔力、再放一次
//  包裝：playerDie 包一次（殘夢要擋住死亡，這件事沒有登記點；同時記一百三十七夜的死亡層數）
//  資料：G.P.n137Die＝待用的層數；G.world.n137＝這張地圖的層數、G.world.n137used＝殘夢用過了；G.remnant＝殘夢進行中
// =============================================================
const SF = k => G.S && G.S.flags && G.S.flags[k];
const _wolfMax = SKILLS.wolf ? SKILLS.wolf.max || 0 : 0;
const DABAI_TINT = { G: '#f4f2ec', r: '#80c8ff' };
const skillElem = sid => { const sk = SKILLS[sid]; if (!sk) return null; return sk.elem || (sk.tags.includes('attack') ? 'phys' : null); };
let _setHurtT = 0, _inkStack = 0, _inkSeq = [], _inkArmed = false, _lastSid = null, _lastElem = null;
// —— 能力 ——
Hook.on('stats', (S, P) => {
  const F = S.flags;
  if (SKILLS.wolf) SKILLS.wolf.max = _wolfMax + (F.setDabaiDog ? 1 : 0);
  if (F.setRun) S.moveSpeed *= 1.15 * (_setHurtT > 0 ? 1.25 : 1);
  if (F.setNerdEle) { const els = new Set((P.skills || []).map(skillElem).filter(Boolean)); S.more_dmg *= 1 + 0.1 * els.size; }
  if (F.setN137Die && G.world && G.world.n137) S.more_dmg *= 1 + 0.15 * G.world.n137;
  if (F.setInkStack && _inkStack) S.more_dmg *= 1 + 0.06 * _inkStack;
});
// —— 翻滾 ——
let _cdPrev = 0, _px = 0, _py = 0, _pounceCd = 0, _lifePrev = 0;
function setOnDodge(pl, sx, sy) {
  if (SF('setDecoy')) {
    G.mins.push({ kind: 'min', mtype: 'decoy', sprite: G.P.cls, ghost: true, tint: { k: '#3a3a6a' }, x: sx, y: sy, r: 10, life: 1e7, maxLife: 1e7, dmg: [0, 0], aps: 0.01, atkCD: 999,
      facing: pl.facing, flash: 0, speed: 0, ranged: 0, taunt: true, count: 1, temp: 3 });
    burst(sx, sy, '#b0b8ff', 12, 100);
  }
  if (SF('setDabaiPounce') && _pounceCd <= 0 && G.mins.length) {
    _pounceCd = 1.5;
    let dx = pl.x - sx, dy = pl.y - sy; if (Math.hypot(dx, dy) < 4) { dx = pl.rollVx || pl.facing || 1; dy = pl.rollVy || 0; }
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const T = nearestFloor(pl.x + dx * 150, pl.y + dy * 150);
    for (const mn of G.mins) {
      if (mn.mtype === 'decoy') continue;
      burst(mn.x, mn.y, '#e8f4ff', 6, 120);
      const p = randomFloorNear(T.x, T.y, 30); mn.x = p.x; mn.y = p.y;
      const d = mn.dmg || [5, 9], R = 80;
      G.fx.push({ k: 'ring', x: p.x, y: p.y, r: R, t: 0, dur: 0.3, color: '#e8f4ff', fill: 'rgba(220,240,255,0.18)' });
      for (const m of G.mons) if (!m.dead && !m.hidden && dist(m, p) <= R + m.r) hitMonster(m, { d: { phys: [d[0] * 4, d[1] * 4] }, crit: 5, multi: 150, ail: {} }, true, mn, 1.2);
    }
    G.shake = Math.max(G.shake, 3); Sfx.play('boom', 0.4);
  }
}
Hook.on('update', dt => {
  const pl = G.pl; if (!pl || !G.S) return;
  const cd = pl.dodgeCd || 0; if (cd > _cdPrev + 0.2) setOnDodge(pl, _px, _py);   // 位移冷卻剛開始＝剛翻滾（各職業的位移都算）
  _cdPrev = cd; _px = pl.x; _py = pl.y; if (_pounceCd > 0) _pounceCd -= dt;
  // 逃兵：被打到
  if (SF('setRun')) {
    if (pl.life < _lifePrev - 1) { const was = _setHurtT > 0; _setHurtT = 2; if (!was) onBuildChanged(); }
    else if (_setHurtT > 0 && (_setHurtT -= dt) <= 0) { _setHurtT = 0; onBuildChanged(); }
  }
  _lifePrev = pl.life;
  // 大白：白色大狗
  const dog = SF('setDabaiDog');
  for (const mn of G.mins) if (mn.mtype === 'wolf' && mn.temp === undefined) { mn.tint = dog ? DABAI_TINT : null; mn.mscale = dog ? 3 : 0; }
  // 殘夢
  const R0 = G.remnant;
  if (R0) {
    pl.iframe = Math.max(pl.iframe || 0, 0.15); pl.life = Math.max(pl.life, 1);
    if ((R0.t -= dt) <= 0) { G.remnant = null; pl.life = 0; _setDie(); }
  }
});
// —— 放技能 ——
Hook.on('cast', (sid, c) => {
  const pl = G.pl, S = G.S; if (!pl || !S || !SKILLS[sid]) return;
  const el = skillElem(sid);
  if (SF('setNerdMana') && el && _lastElem && el !== _lastElem) pl.mana = Math.min(S.maxMana, pl.mana + S.maxMana * 0.04);
  if (el) _lastElem = el;
  if (SF('setInkFree')) {
    if (_inkArmed) {
      _inkArmed = false; const cost = (c && c.cost) || 0;
      if (S.flags.bloodMagic) pl.life = Math.min(S.maxLife, pl.life + cost); else pl.mana = Math.min(S.maxMana, pl.mana + cost);
      if (c) G.echoQ.push({ t: 0.2, sid, c });
      G.texts.push({ x: pl.x, y: pl.y - 44, txt: '書記的墨', color: '#9af0b8', size: 12, t: 0, dur: 0.7 });
      _inkSeq = [];
    } else {
      if (_inkSeq.includes(sid)) _inkSeq = [sid]; else _inkSeq.push(sid);
      if (_inkSeq.length >= 5) { _inkArmed = true; _inkSeq = []; G.texts.push({ x: pl.x, y: pl.y - 44, txt: '下一招免費、多放一次', color: '#9af0b8', size: 11, t: 0, dur: 0.9 }); }
    }
  }
  if (SF('setInkStack')) { const n = sid === _lastSid ? 0 : Math.min(5, _inkStack + 1); if (n !== _inkStack) { _inkStack = n; setTimeout(() => onBuildChanged(), 0); } }
  else _inkStack = 0;
  _lastSid = sid;
});
// —— 一百三十七夜：死亡 ——
const _setDie = playerDie;
playerDie = function () {
  const pl = G.pl, w = G.world;
  if (G.remnant) { if (pl) pl.life = 1; return; }
  if (SF('setN137Remnant') && w && w.kind === 'map' && !w.n137used && pl) {
    w.n137used = true; G.remnant = { t: 5, k: 0 }; pl.life = 1;
    UI.banner('殘夢', '5 秒內殺滿 10 隻，就能站起來', '#9af0b8'); Sfx.play('portal'); burst(pl.x, pl.y, '#9af0b8', 30, 180);
    return;
  }
  if (SF('setN137Die') && G.P) G.P.n137Die = Math.min(3, (G.P.n137Die || 0) + 1);
  return _setDie.apply(this, arguments);
};
Hook.on('kill', m => {
  const R0 = G.remnant; if (!R0 || !G.pl) return;
  if (++R0.k >= 10) { G.remnant = null; G.pl.life = G.S.maxLife; UI.banner('從殘夢裡站起來了', '一百三十七夜：還沒完', '#9af0b8'); burst(G.pl.x, G.pl.y, '#c8ffd8', 40, 220); }
});
Hook.on('enterMap', () => {
  const P = G.P, w = G.world; G.remnant = null; if (!P || !w) return;
  if (P.n137Die) { w.n137 = P.n137Die; P.n137Die = 0; onBuildChanged(); if (SF('setN137Die')) UI.msg(`一百三十七夜：這張地圖傷害 +${w.n137 * 15}%`, '#9af0b8'); }
});
Hook.on('start', () => { G.remnant = null; _inkStack = 0; _inkSeq = []; _inkArmed = false; _setHurtT = 0; });
Hook.on('drawOver', g => {
  const R0 = G.remnant, pl = G.pl; if (!R0 || !pl) return;
  g.save(); g.globalAlpha = 0.5 + 0.3 * Math.sin(G.time * 8); g.strokeStyle = '#9af0b8'; g.lineWidth = 2; g.beginPath(); g.arc(pl.x, pl.y, 30, 0, Math.PI * 2); g.stroke(); g.restore();
  txt(g, `殘夢 ${R0.k}/10　${Math.ceil(R0.t)} 秒`, pl.x, pl.y - 58, 13, '#c8ffd8', 'center');
});
