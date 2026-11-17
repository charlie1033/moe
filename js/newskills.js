// =============================================================
//  v2.5.5 新技能與新的質變天賦（新機制）
//  技能：迴旋飛斧（戰士）、燕返（武士）、毒霧陷阱（盜賊）、追蹤箭（弓箭手）、雷光球（法師）、屍爆（召喚師）
//  天賦（質變基石，在天賦樹最外圈）：回力、嗜血狂怒、鐵壁反擊、靈魂收割、冰晶碎裂、時之沙
//  這些技能開局沒有，要打怪掉落；前期會比較容易掉到「自己職業」的技能
// =============================================================
Object.assign(SKILLS, {
  axethrow: { name: '迴旋飛斧', icon: '斧', color: '#d8a868', lvl: 6, cls: 'warrior', tags: ['attack', 'projectile'], cost: 8, eff: 0.95, speed: 0.9,
    type: 'proj', count: 1, spread: 0.2, pspeed: 470, pierce: 99, need: 'melee', sprite: 'axe', returning: true, ail: { bleed: 15 },
    desc: '把手上的武器擲出去，穿過路上所有敵人，飛到底再飛回來（回程也會打）。需要近戰武器。' },
  swallow: { name: '燕返', icon: '燕', color: '#f0e0a8', lvl: 4, cls: 'samurai', tags: ['attack', 'melee'], cost: 7, eff: 0.5, speed: 0.8,
    type: 'combo', hits: 3, range: 70, arc: 1.8, need: 'melee', dpsMul: 4, ail: { bleed: 20 },
    desc: '一口氣連斬三刀，第三刀是兩倍傷害。對單一強敵特別有效。' },
  smoketrap: { name: '毒霧陷阱', icon: '阱', color: '#9ad060', lvl: 5, cls: 'ranger', tags: ['spell', 'area'], elem: 'chaos', cost: 9,
    base: [11, 17], crit: 5, cast: 0.45, eff: 1, type: 'trap', radius: 80, range: 380, maxTraps: 3, ail: { poison: 70 },
    desc: '在滑鼠位置放陷阱（最多 3 個），敵人靠近就炸開毒霧，70% 機率中毒。可以先佈置再把怪引過來。' },
  homing: { name: '追蹤箭', icon: '蹤', color: '#a0f0c0', lvl: 6, cls: 'druid', tags: ['attack', 'projectile'], cost: 6, eff: 0.8, speed: 1.0,
    type: 'proj', count: 2, spread: 0.7, pspeed: 520, need: 'bow', sprite: 'arrow', homing: true,
    desc: '射出會自己轉彎、追著最近敵人的箭。不用瞄得很準。需要弓。' },
  thunderorb: { name: '雷光球', icon: '球', color: '#fff090', lvl: 10, cls: 'mage', tags: ['spell', 'projectile'], elem: 'light', cost: 14,
    base: [3, 9], crit: 6, cast: 0.8, eff: 0.7, type: 'proj', count: 1, pspeed: 140, pierce: 99, sprite: 'orb', orb: true, dpsMul: 4, ail: { shock: 20 },
    desc: '放出一顆慢慢飄的雷球，每 0.3 秒電擊附近一個敵人（50% 傷害）。適合丟進怪物群裡。' },
  corpseboom: { name: '屍爆', icon: '屍', color: '#ff8a50', lvl: 6, cls: 'summoner', tags: ['spell', 'area'], elem: 'fire', cost: 12,
    base: [4, 8], crit: 5, cast: 0.6, eff: 1, type: 'corpse', radius: 85, range: 420, maxCorpses: 3, pct: 0.14,
    desc: '引爆滑鼠附近最多 3 具屍體，每具造成牠生前最大生命 14% 的火焰範圍傷害。召喚物殺的怪也會留下屍體。' },
});
Object.assign(SKILL_ATTR, { axethrow: ['str'], swallow: ['str', 'dex'], smoketrap: ['dex', 'int'], homing: ['dex'], thunderorb: ['int'], corpseboom: ['int'] });
for (const k of ['axethrow', 'swallow', 'smoketrap', 'homing', 'thunderorb', 'corpseboom']) { SKILLS[k].id = k; SKILLS[k].req = gemReqAttr(k, 1); }
// 技能寶石圖示上的字（沒有專屬圖案時用 icon 字）
if (typeof SKILL_GLYPHS !== 'undefined') for (const k of ['axethrow', 'swallow', 'smoketrap', 'homing', 'thunderorb', 'corpseboom']) if (!SKILL_GLYPHS[k] && SKILL_GLYPHS.heavy) SKILL_GLYPHS[k] = SKILL_GLYPHS[{ axethrow: 'heavy', swallow: 'iai', smoketrap: 'thorn', homing: 'split', thunderorb: 'arc', corpseboom: 'meteor' }[k]];

// 這個技能算不算「這個職業的」：開局技能、標了 cls 的新技能、或主要屬性跟職業主屬性一樣
function skillIsOwnClass(P, sid) { const sk = SKILLS[sid]; return (CLASS_GEMS[P.cls] || []).includes(sid) || sk.cls === P.cls || (SKILL_ATTR[sid] || [])[0] === CLASSES[P.cls].main; }
// v2.5.5 技能寶石掉落：前期（怪物 40 級以前）自己職業的技能 12 倍權重、別人的 1；後期 4：2；已經有的很少掉
randomSkillGem = function (mlvl) {
  const P = G.P, early = mlvl < 40, list = Object.keys(SKILLS).filter(s => SKILLS[s].lvl <= mlvl + 3);
  return wpick(list, s => hasSkillGem(P, s) ? 0.4 : skillIsOwnClass(P, s) ? (early ? 12 : 4) : (early ? 1 : 2));
};

// ---------- 施放 ----------
const _castSkillBase = castSkill;
castSkill = function (sid, c) {
  const sk = SKILLS[sid];
  if (!NEW_CAST[sk.type] && !sk.returning && !sk.homing && !sk.orb) return _castSkillBase(sid, c);
  const P = G.P, pl = G.pl, ang = Math.atan2(input.wy - pl.y, input.wx - pl.x);
  if (NEW_CAST[sk.type]) {
    pl.aim = ang; pl.facing = Math.cos(ang) >= 0 ? 1 : -1; pl.swing = 0.18; pl.swingType = sk.type; castSfx(sk);
    const pk = { d: c.d, crit: c.crit, multi: c.multi, leech: c.leech, mleech: c.mleech, noChill: c.noChill, ail: c.ail, dotMult: c.dotMult, ailDur: c.ailDur };
    return NEW_CAST[sk.type](sid, c, sk, pk, ang);
  }
  // 一般投射物技能，再加上特別行為（迴旋、追蹤、雷球）
  const before = G.projs.length;
  _castSkillBase(sid, c);
  for (let i = before; i < G.projs.length; i++) {
    const p = G.projs[i]; if (p.team !== 'ally') continue;
    if (sk.returning) { p.ret = true; p.life = 2.4; p.turnAt = 2.4 - 0.5; }
    if (sk.homing) { p.homing = true; p.life = 1.8; }
    if (sk.orb) { p.orb = true; p.life = 2.6; p.zapT = 0.15; p.r = 8; }
  }
};
const NEW_CAST = {
  // 燕返：三刀，間隔 0.12 秒，第三刀兩倍
  combo(sid, c, sk, pk, ang) {
    const pl = G.pl;
    for (let k = 0; k < sk.hits; k++) G.delayQ.push({ t: k * 0.12, fn: () => {
      const a = pl.aim, hk = k === sk.hits - 1 ? scalePk(pk, 2) : pk, list = [];
      for (const m of G.mons) {
        if (m.dead) continue; const d = dist(m, pl); if (d > sk.range + m.r) continue;
        let da = Math.abs(((Math.atan2(m.y - pl.y, m.x - pl.x) - a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        if (da <= sk.arc / 2 || d < m.r + 14) { hitMonster(m, hk, false, pl, k === sk.hits - 1 ? 1.6 : 0.5); list.push(m); }
      }
      if (list.length) G.hitstop = Math.max(G.hitstop || 0, k === sk.hits - 1 ? 0.05 : 0.02);
      G.fx.push({ k: 'slash', x: pl.x, y: pl.y - 6, a: a + (k % 2 ? 0.5 : -0.5), r: sk.range, t: 0, dur: 0.15, color: k === sk.hits - 1 ? '#fff4c0' : sk.color, arc: sk.arc });
      pl.swing = 0.18; Sfx.play(k === sk.hits - 1 ? 'heavy' : 'swing');
    } });
  },
  // 陷阱：放在滑鼠位置，0.4 秒後啟動；敵人靠近 45 內就炸
  trap(sid, c, sk, pk, ang) {
    const pl = G.pl, d = Math.min(sk.range, Math.hypot(input.wx - pl.x, input.wy - pl.y));
    let x = pl.x + Math.cos(ang) * d, y = pl.y + Math.sin(ang) * d;
    if (solidAt(x, y)) { x = pl.x; y = pl.y; }
    const mine = G.traps.filter(t => t.sid === sid); if (mine.length >= sk.maxTraps) G.traps.splice(G.traps.indexOf(mine[0]), 1);
    G.traps.push({ sid, x, y, t: 0, life: 10, pk, R: sk.radius * c.areaMul, color: sk.color });
  },
  // 屍爆：滑鼠附近最多 N 具屍體
  corpse(sid, c, sk, pk, ang) {
    const tx = input.wx, ty = input.wy;
    const near = G.corpses.filter(k => Math.hypot(k.x - tx, k.y - ty) < 200).sort((a, b) => Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty)).slice(0, sk.maxCorpses);
    if (!near.length) { UI.msg('附近沒有屍體（滑鼠指著屍體的位置）', '#d8c8a0'); G.pl.mana += c.cost; return; }
    near.forEach((k, i) => G.delayQ.push({ t: i * 0.08, fn: () => {
      const v = k.life * sk.pct, base = scalePk(pk, 1);
      base.d = Object.assign({}, pk.d, { fire: [pk.d.fire[0] + v, pk.d.fire[1] + v] });
      blastAt(k.x, k.y, sk.radius * c.areaMul, base);
      G.corpses.splice(G.corpses.indexOf(k), 1);
    } }));
  },
};

// ---------- 每格畫面的額外處理（追蹤、迴旋、雷球、陷阱、延遲動作、屍體、靈魂收割） ----------
G.delayQ = []; G.traps = []; G.corpses = [];
Hook.on('update', dt => {
  if (G.state !== 'play' || !G.P || G.dead || UI.paused()) return;
  const pl = G.pl, S = G.S;
  for (const e of G.delayQ) { e.t -= dt; if (e.t <= 0 && !e.done) { e.done = true; try { e.fn(); } catch (err) {} } }
  G.delayQ = G.delayQ.filter(e => !e.done);
  for (const p of G.projs) {
    if (p.team !== 'ally' || p.dead) continue;
    const sp = Math.hypot(p.vx, p.vy) || 1;
    if (p.homing) { // 追蹤：轉向最近的敵人（每秒最多轉 5 弧度）
      let best = null, bd = 320; for (const m of G.mons) { if (m.dead || p.hit.has(m)) continue; const d = dist(m, p); if (d < bd) { bd = d; best = m; } }
      if (best) { const want = Math.atan2(best.y - p.y, best.x - p.x), cur = Math.atan2(p.vy, p.vx); let da = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; da = Math.max(-5 * dt, Math.min(5 * dt, da)); p.vx = Math.cos(cur + da) * sp; p.vy = Math.sin(cur + da) * sp; }
    }
    if (p.ret && p.life < p.turnAt) { // 迴旋：飛回角色身上，回程可以再打一次
      if (!p.back) { p.back = true; p.hit = new Set(); if (p.cast) p.cast = new Map(); }
      const a = Math.atan2(pl.y - 6 - p.y, pl.x - p.x); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      if (Math.hypot(pl.x - p.x, pl.y - 6 - p.y) < 16) p.dead = true;
    }
    if (p.orb) { // 雷球：每 0.3 秒電一下附近的敵人
      p.zapT -= dt;
      if (p.zapT <= 0) {
        p.zapT = 0.3; let best = null, bd = 140; for (const m of G.mons) { if (m.dead) continue; const d = dist(m, p); if (d < bd) { bd = d; best = m; } }
        if (best) { hitMonster(best, scalePk(p.pk, 0.5), false, p, 0.3); G.fx.push({ k: 'line', x1: p.x, y1: p.y, x2: best.x, y2: best.y - 8, t: 0, dur: 0.12, color: '#fff6a0', w: 2 }); Sfx.play('zap', 0.4); }
      }
    }
    if (p.sprite === 'axe') p.spin = (p.spin || 0) + dt * 18;
  }
  // 陷阱
  for (const t of G.traps) {
    t.t += dt; if (t.t > t.life) { t.dead = true; continue; }
    if (t.t < 0.4) continue;
    if (G.mons.some(m => !m.dead && Math.hypot(m.x - t.x, m.y - t.y) < 45 + m.r)) {
      t.dead = true; blastAt(t.x, t.y, t.R, t.pk);
      G.fx.push({ k: 'ring', x: t.x, y: t.y, r: t.R, t: 0, dur: 0.5, color: '#a0e070', fill: 'rgba(120,200,60,0.25)' });
    }
  }
  G.traps = G.traps.filter(t => !t.dead);
  // 屍體 12 秒後消失
  for (const k of G.corpses) k.t += dt;
  G.corpses = G.corpses.filter(k => k.t < 12);
  // 靈魂收割：5 秒沒擊殺就少 1 層
  if (pl.souls > 0) { pl.soulT = (pl.soulT || 0) + dt; if (pl.soulT > 5) { pl.souls--; pl.soulT = 4; } }
});

// ---------- 擊殺時 ----------
Hook.on('kill', m => {
  const S = G.S, pl = G.pl, F = S.flags;
  if (!m.boss) { G.corpses.push({ x: m.x, y: m.y, life: m.maxLife, t: 0 }); if (G.corpses.length > 30) G.corpses.shift(); }
  if (F.soulReap) { pl.souls = Math.min(10, (pl.souls || 0) + 1); pl.soulT = 0; }
  if (F.shatter && (m.frozen > 0 || m.chill > 0)) { // 冰晶碎裂：被冰凍或冰緩的敵人死掉時，爆出 6 道冰晶
    const v = m.maxLife * 0.12;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.random() * 0.3; G.projs.push({ team: 'ally', x: m.x, y: m.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 4, life: 0.5, pk: { d: { phys: [0, 0], fire: [0, 0], cold: [v, v], light: [0, 0], chaos: [0, 0] }, crit: 0, multi: 150, ail: { freeze: 15 }, noBlast: true }, pierce: 1, hit: new Set([m]), explode: 0, sprite: 'iceshard', color: '#bfefff', child: true, chained: true }); }
    Sfx.play('ice');
  }
  if (F.cdReset && Math.random() < 0.1) { // 時之沙：擊殺時 10% 機率重置所有冷卻
    let any = false; for (const k in pl.cd) if (pl.cd[k] > 0) { pl.cd[k] = 0; any = true; }
    if (any) { G.texts.push({ x: pl.x, y: pl.y - 52, txt: '時之沙', color: '#ffe6a0', size: 13, t: 0, dur: 0.9 }); Sfx.play('blink'); }
  }
});

// ---------- 打中時的傷害加成（嗜血狂怒、靈魂收割） ----------
const _hitBase = hitMonster;
hitMonster = function (m, pk, fromMinion, src, kb) {
  const S = G.S, pl = G.pl, F = S && S.flags;
  if (F && !fromMinion && (F.berserk || pl.souls)) {
    let mul = 1;
    if (F.berserk) mul *= 1 + Math.max(0, 1 - pl.life / S.maxLife);      // 少 1% 生命 ＝ +1% 傷害
    if (pl.souls) mul *= 1 + pl.souls * 0.04;
    if (mul > 1.001) pk = scalePk(pk, mul);
  }
  return _hitBase(m, pk, fromMinion, src, kb);
};
// ---------- 被打時（鐵壁反擊） ----------
const _dmgPlayerBase = damagePlayer;
damagePlayer = function (parts, opts = {}) {
  const pl = G.pl, before = pl.life + (pl.es || 0);
  const r = _dmgPlayerBase(parts, opts);
  const S = G.S;
  if (S && S.flags.riposte && !opts.dot && pl.life + (pl.es || 0) < before && Math.random() < 0.3 && G.slotCalc[0]) {
    const c = G.slotCalc[0], pk = { d: c.d, crit: c.crit, multi: c.multi, ail: c.ail || {}, noBlast: true };
    for (const m of G.mons) if (!m.dead && dist(m, pl) < 95 + m.r) _hitBase(m, pk, false, pl, 1.6);
    G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: 95, t: 0, dur: 0.3, color: '#ffd080', fill: 'rgba(255,200,100,0.18)' });
    G.texts.push({ x: pl.x, y: pl.y - 52, txt: '反擊', color: '#ffd080', size: 13, t: 0, dur: 0.7 }); Sfx.play('block');
  }
  return r;
};
// 回力：所有投射物都會飛回來
const _castWithReturn = castSkill;
castSkill = function (sid, c) {
  const before = G.projs.length; _castWithReturn(sid, c);
  if (G.S.flags.projReturn) for (let i = before; i < G.projs.length; i++) { const p = G.projs[i]; if (p.team === 'ally' && !p.ret && !p.orb) { p.ret = true; p.life = Math.max(p.life, 1.6); p.turnAt = p.life - 0.45; } }
};
// 換地圖時清掉陷阱、屍體、還沒執行的連斬
const _resetBase = resetEntities;
resetEntities = function () { _resetBase(); G.delayQ = []; G.traps = []; G.corpses = []; if (G.pl) G.pl.souls = 0; };
