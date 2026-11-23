// =============================================================
//  v2.17.4 六件套裝的效果（資料、門檻文字在 sets6.js；旗標由 sets.js 的 'stats' 照件數打開）
//   擋門的人　2：近戰技能更多傷害 +20%（preHit）、生命 ×1.08
//             4：站穩 _stand（0～8）：0.5 秒內幾乎沒移動 +1，有移動 −2；每層近戰更多 +5%；被打到（'hurt'）補回那一下的 4%／層
//             6：被打到 → 身邊 140（站穩滿 8 層時 280，會震開）所有怪吃武器物理 ×2，0.3 秒一次
//   點燈的人　2：法術更多傷害 +20%、魔力 ×1.10
//             4：放法術時 100 內沒燈就點一盞（_lamps，最多 3、8 秒）；每放一個有傷害的法術，每盞燈朝 420 內最近的怪射燈火（35%）
//             6：最多 5 盞、12 秒；站在燈 150 內時，技能欄裡的法術 cost／lifeCost 暫時設 0（離開就還原；slotCalc 重算時本來就會重建）
//   射偏的那一箭　2：投射物技能更多傷害 +20%、移動 ×1.06
//             4：玩家技能射出的投射物（有 p.cast）快飛完（life < 0.1）或下一格撞牆 → 掉頭追著你飛回來（p.s6ret），回程穿透、50% 傷害
//             6：回程 100% 傷害；飛到你身上＝接住，_catch +1（最多 5）；下一次投射物技能照你瞄的方向多射 _catch 發
//   點名的人　2：S.minion_max +1
//             4：放不是召喚的技能 → 每隻召喚物打牠 260 內最近的怪（牠攻擊 ×0.8 物理；每隻 0.25 秒一次）
//             6：召喚物生命歸零被拿掉 → 3 秒後原地滿血回來（_downs；每隻 15 秒一次；技能欄沒有那種召喚或已經滿了就不回來）
//  資料都在記憶體（不存檔）：換地圖、讀角色時清空
// =============================================================
const S6F = k => G.S && G.S.flags && G.S.flags[k];
const s6Tags = slot => { const sid = slot >= 0 && G.P && G.P.skills[slot], sk = sid && SKILLS[sid]; return sk ? sk.tags : null; };
let _s6stand = 0, _s6standT = 0, _s6moved = 0, _s6lx = 0, _s6ly = 0, _s6ripT = -9, _s6catch = 0;
let _s6lamps = [], _s6downs = [], _s6prev = [];
function s6Reset() { _s6stand = 0; _s6standT = 0; _s6catch = 0; _s6lamps = []; _s6downs = []; _s6prev = []; }
Hook.on('start', s6Reset); Hook.on('enterMap', s6Reset);
// —— 能力 ——
Hook.on('stats', S => {
  const F = S.flags;
  if (F.setDoorMelee) S.maxLife = Math.round(S.maxLife * 1.08);
  if (F.setLampSpell && !F.noMana) S.maxMana = Math.round(S.maxMana * 1.1);
  if (F.setArrowProj) S.moveSpeed *= 1.06;
  if (F.setRollMax) S.minion_max = (S.minion_max || 0) + 1;
});
Hook.on('preHit', ctx => {
  if (ctx.fromMinion || !G.S) return; const tg = s6Tags(ctx.slot); if (!tg) return;
  const F = G.S.flags;
  if (tg.includes('melee')) { if (F.setDoorMelee) ctx.mul *= 1.2; if (F.setDoorStand && _s6stand) ctx.mul *= 1 + 0.05 * _s6stand; }
  if (F.setLampSpell && tg.includes('spell')) ctx.mul *= 1.2;
  if (F.setArrowProj && tg.includes('projectile')) ctx.mul *= 1.2;
});
// —— 擋門的人：被打到 ——
Hook.on('hurt', amt => {
  const pl = G.pl, S = G.S; if (!pl || !S || pl.life <= 0) return;
  if (S6F('setDoorStand') && _s6stand) pl.life = Math.min(S.maxLife, pl.life + amt * 0.04 * _s6stand);
  if (S6F('setDoorRiposte') && G.time - _s6ripT >= 0.3) {
    _s6ripT = G.time;
    const full = S6F('setDoorStand') && _s6stand >= 8, R = full ? 280 : 140, wp = S.weapon && S.weapon.phys ? S.weapon.phys : [5, 10];
    G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: R, t: 0, dur: 0.25, color: '#e8c890', fill: 'rgba(230,200,140,0.14)' });
    for (const m of G.mons) if (!m.dead && !m.hidden && dist(m, pl) <= R + m.r) hitMonster(m, { d: { phys: [wp[0] * 2, wp[1] * 2] }, crit: 5, multi: 150, ail: {} }, false, pl, full ? 2.5 : 0.5);
    if (full) G.shake = Math.max(G.shake, 3);
  }
});
// —— 點燈的人、射偏的那一箭、點名的人：放技能 ——
Hook.on('cast', (sid, c) => {
  const sk = SKILLS[sid], pl = G.pl, S = G.S; if (!sk || !pl || !S) return;
  const F = S.flags, isSpell = sk.tags.includes('spell');
  if (F.setLampLight && isSpell) {
    const max = F.setLampHome ? 5 : 3, dur = F.setLampHome ? 12 : 8;
    const hasDmg = c && c.d && Object.values(c.d).some(v => v && v[1] > 0);
    if (hasDmg) for (const l of _s6lamps) {
      let best = null, bd = 420; for (const m of G.mons) { if (m.dead || m.hidden) continue; const d = dist(m, l); if (d < bd) { bd = d; best = m; } }
      if (!best) continue;
      const a = Math.atan2(best.y - l.y + 10, best.x - l.x);
      G.projs.push({ team: 'ally', x: l.x, y: l.y - 10, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, r: 5, life: 1.2, pk: scalePk({ d: c.d, crit: c.crit, multi: c.multi, ail: c.ail }, 0.35), pierce: 0, hit: new Set(), sprite: 'fireball', color: '#ffd27a', s6lamp: true });
    }
    if (!_s6lamps.some(l => dist(l, pl) < 100)) {
      _s6lamps.push({ x: pl.x, y: pl.y, t: dur, w: G.world });
      while (_s6lamps.length > max) _s6lamps.shift();
      burst(pl.x, pl.y - 8, '#ffd27a', 8, 60);
    }
  }
  if (F.setArrowCatch && _s6catch > 0 && sk.type === 'proj') {
    const lp = G.projs[G.projs.length - 1];
    if (lp && lp.cast && !lp.s6ret) {
      const sp = Math.hypot(lp.vx, lp.vy), a0 = pl.aim || 0;
      for (let k = 1; k <= _s6catch; k++) { const a = a0 + (k % 2 ? 1 : -1) * 0.12 * Math.ceil(k / 2); G.projs.push(Object.assign({}, lp, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, hit: new Set() })); }
      _s6catch = 0;
    }
  }
  if (F.setRollCall && sk.type !== 'summon' && G.mins.length) {
    for (const mn of G.mins) {
      if (mn.mtype === 'decoy' || G.time - (mn._s6t || -9) < 0.25) continue;
      let best = null, bd = 260; for (const m of G.mons) { if (m.dead || m.hidden) continue; const d = dist(m, mn); if (d < bd) { bd = d; best = m; } }
      if (!best) continue;
      mn._s6t = G.time; mn.facing = best.x >= mn.x ? 1 : -1;
      const d = mn.dmg || [5, 9];
      G.fx.push({ k: 'bolt', pts: [{ x: mn.x, y: mn.y - 6 }, { x: best.x, y: best.y - 6 }], t: 0, dur: 0.12, color: '#a0e0a8' });
      hitMonster(best, { d: { phys: [d[0] * 0.8, d[1] * 0.8] }, crit: 5, multi: 150, ail: {} }, true, mn, 0.5);
    }
  }
});
// —— 每格 ——
Hook.on('update', dt => {
  const pl = G.pl, S = G.S; if (!pl || !S) return;
  const F = S.flags;
  // 站穩
  if (F.setDoorStand) {
    _s6moved += Math.hypot(pl.x - _s6lx, pl.y - _s6ly);
    if ((_s6standT += dt) >= 0.5) { _s6stand = _s6moved < 6 ? Math.min(8, _s6stand + 1) : Math.max(0, _s6stand - 2); _s6standT = 0; _s6moved = 0; }
  } else _s6stand = 0;
  _s6lx = pl.x; _s6ly = pl.y;
  // 燈
  _s6lamps = _s6lamps.filter(l => l.w === G.world && (l.t -= dt) > 0);
  if (!F.setLampLight) _s6lamps = [];
  const nearLamp = F.setLampHome && _s6lamps.some(l => dist(l, pl) < 150);
  (G.slotCalc || []).forEach((c, i) => {
    if (!c) return; const sk = SKILLS[G.P.skills[i]]; if (!sk || !sk.tags.includes('spell')) return;
    if (nearLamp) { if (c._s6cost === undefined) { c._s6cost = c.cost; c._s6life = c.lifeCost; } c.cost = 0; if (c.lifeCost) c.lifeCost = 0; }
    else if (c._s6cost !== undefined) { c.cost = c._s6cost; if (c._s6life) c.lifeCost = c._s6life; delete c._s6cost; delete c._s6life; }
  });
  // 回頭的投射物
  if (F.setArrowReturn) {
    let caught = 0; const keep = [];
    for (const p of G.projs) {
      if (p.team === 'ally' && p.cast && !p.s6ret && !p.explode && !p.fromMinion && (p.life < 0.1 || shotWallAt(p.x + p.vx * 0.05, p.y + p.vy * 0.05))) {   // 快飛完或下一格撞牆
        p.s6ret = true; p.life = 1.6; p.hit = new Set(); p.cast = null; p.pierce = 999; p.color = '#c8ffe8';
        if (!F.setArrowCatch) p.pk = scalePk(p.pk, 0.5);
      }
      if (p.s6ret) {
        const dx = pl.x - p.x, dy = pl.y - p.y, d = Math.hypot(dx, dy) || 1, sp = Math.max(380, Math.hypot(p.vx, p.vy));
        p.vx = dx / d * sp; p.vy = dy / d * sp;
        if (d < pl.r + 14) { caught++; continue; }
      }
      keep.push(p);
    }
    if (keep.length !== G.projs.length) G.projs = keep;
    if (caught && F.setArrowCatch) {
      const was = _s6catch; _s6catch = Math.min(5, _s6catch + caught);
      if (_s6catch > was) G.texts.push({ x: pl.x, y: pl.y - 44, txt: `接住 ${_s6catch}`, color: '#c8ffe8', size: 11, t: 0, dur: 0.6 });
    }
  } else _s6catch = 0;
  // 倒下的召喚物
  if (F.setRollRevive) {
    const cur = new Set(G.mins);
    for (const mn of _s6prev) if (!cur.has(mn) && mn.life <= 0 && mn.temp === undefined && !mn.ghost && mn.mtype !== 'decoy' && G.time - (mn._s6rev || -99) >= 15) _s6downs.push({ mn, t: 3, w: G.world });
    for (const D of _s6downs) {
      if (D.w !== G.world) { D.done = true; continue; }
      if ((D.t -= dt) > 0) continue;
      D.done = true;
      const mn = D.mn, c = (G.slotCalc || []).find(x => x && x.minion && x.minion.kind === mn.mtype);
      if (!c || G.mins.filter(x => x.mtype === mn.mtype).length >= c.minion.max) continue;
      mn.life = mn.maxLife; mn.flash = 0; mn._s6rev = G.time; G.mins.push(mn);
      burst(mn.x, mn.y, '#a0e0a8', 14, 120);
      G.texts.push({ x: mn.x, y: mn.y - 30, txt: '到！', color: '#a0e0a8', size: 12, t: 0, dur: 0.8 });
    }
    _s6downs = _s6downs.filter(D => !D.done);
  } else _s6downs = [];
  _s6prev = G.mins.slice();
});
// —— 畫面 ——
Hook.on('drawWorld', g => {
  for (const l of _s6lamps) {
    const fl = 0.7 + 0.3 * Math.sin(G.time * 9 + l.x);
    g.save(); g.globalAlpha = 0.25 * fl; g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(l.x, l.y - 6, 22, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1; g.fillStyle = '#5a4630'; g.fillRect(l.x - 4, l.y - 6, 8, 8);
    g.fillStyle = '#ffe9a0'; g.beginPath(); g.ellipse(l.x, l.y - 11, 3, 5 * fl, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  for (const D of _s6downs) {
    g.save(); g.globalAlpha = 0.5; g.strokeStyle = '#a0e0a8'; g.lineWidth = 2; g.beginPath(); g.arc(D.mn.x, D.mn.y, 12, 0, Math.PI * 2 * (1 - D.t / 3)); g.stroke(); g.restore();
  }
});
Hook.on('light', (cut, cx, cy) => { for (const l of _s6lamps) cut(l.x - cx, l.y - cy, 110, 0.7); });
Hook.on('drawOver', g => {
  const pl = G.pl; if (!pl || !_s6stand || !S6F('setDoorStand')) return;
  txt(g, `站穩 ${_s6stand}`, pl.x, pl.y - 50, 11, _s6stand >= 8 ? '#ffd36a' : '#e8c890', 'center');
});
