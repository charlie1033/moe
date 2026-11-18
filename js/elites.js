// =============================================================
//  v2.7 精英怪能力（8 → 18 種）與地圖詞綴（11 → 20 種）
//  ・新的精英怪能力有等級門檻（minLvl），前期不會遇到太麻煩的
//  ・行為都在 update 的包裝裡處理
// =============================================================
MONSTER_MODS.push(
  { id: 'split', name: '分裂', minLvl: 12, life: 0.85 },
  { id: 'caller', name: '召喚', minLvl: 18 },
  { id: 'shield', name: '護盾', minLvl: 15 },
  { id: 'enrage', name: '狂暴', minLvl: 10 },
  { id: 'blinker', name: '閃爍', minLvl: 20, speed: 0.9 },
  { id: 'reflect', name: '反射', minLvl: 30 },
  { id: 'haste', name: '疾行光環', minLvl: 14 },
  { id: 'toxic', name: '毒沼', minLvl: 16 },
  { id: 'frostaura', name: '寒霜光環', minLvl: 22 },
  { id: 'unyield', name: '不屈', minLvl: 25, life: 1.15 },
);
const ELITE_MOD_DESC = {
  split: '死掉時分裂成 2 隻比較小的', caller: '每 8 秒叫來 2 隻同伴', shield: '有一層護盾（40% 生命），4 秒沒被打就回滿',
  enrage: '生命低於 40% 時，速度和傷害 +50%', blinker: '會瞬間移動到你身邊', reflect: '把受到傷害的 15% 反彈給你（打太快會痛）',
  haste: '身邊的怪物移動和攻擊速度 +30%', toxic: '走過的地方留下毒池', frostaura: '靠近牠會被冰緩（移動變慢）', unyield: '不會被冰凍、冰緩，也不會被擊退',
};
const MON_MOD_ID = Object.fromEntries(MONSTER_MODS.map(m => [m.name, m.id]));
const hasMod = (m, id) => m.modIds && m.modIds.includes(id);

// 每隻怪記下能力的代號，護盾先填滿
const _makeMonEl = makeMonster;
makeMonster = function (type, x, y, mlvl, rarity, theme) {
  const m = _makeMonEl(type, x, y, mlvl, rarity, theme);
  m.modIds = (m.mods || []).map(n => MON_MOD_ID[n]).filter(Boolean);
  if (G.world && G.world.mm && G.world.mm.eliteMod && rarity !== 'normal' && !m.modIds.includes(G.world.mm.eliteMod)) { const id = G.world.mm.eliteMod; m.modIds.push(id); m.mods.push(MONSTER_MODS.find(x => x.id === id).name); }
  if (hasMod(m, 'shield')) { m.shieldMax = m.maxLife * 0.4; m.shield = m.shieldMax; }
  m.baseSpeed = m.speed; m.baseAspd = m.aspd; m.baseDmg = m.dmg.slice();
  return m;
};
// 打怪：護盾先吸收、不屈免疫冰凍、反射
const _hitEl = hitMonster;
hitMonster = function (m, pk, fromMinion, src, kb) {
  { const F = G.world && G.world.mm && G.world.mm.flags; if (F && F.mnoleech && (pk.leech || pk.mleech)) pk = Object.assign({}, pk, { leech: 0, mleech: 0 }); }
  if (!m.modIds || !m.modIds.length || m.dead) return _hitEl(m, pk, fromMinion, src, kb);
  const l0 = m.life;
  if (hasMod(m, 'unyield')) kb = 0;
  { const F = G.world && G.world.mm && G.world.mm.flags; if (F && F.mnoleech) pk = Object.assign({}, pk, { leech: 0, mleech: 0 }); }
  const r = _hitEl(m, pk, fromMinion, src, kb);
  let dealt = Math.max(0, l0 - m.life);
  if (hasMod(m, 'shield') && m.shield > 0 && dealt > 0 && !m.dead) { const a = Math.min(m.shield, dealt); m.shield -= a; m.life += a; dealt -= a; }
  if (hasMod(m, 'shield')) m.shieldHitT = G.time;
  if (hasMod(m, 'unyield')) { m.frozen = 0; m.chill = 0; m.stagger = 0; m.kx = 0; m.ky = 0; }
  if (hasMod(m, 'reflect') && !fromMinion && dealt > 0 && G.time - (m.reflT || 0) > 0.3) {
    m.reflT = G.time; const v = Math.min(G.S.maxLife * 0.05, dealt * 0.15);
    G.pl.life -= v; G.texts.push({ x: G.pl.x, y: G.pl.y - 30, txt: '反射 ' + Math.round(v), color: '#ff9ad8', size: 11, t: 0, dur: 0.6 });
    if (typeof DeathHelp !== 'undefined') DeathHelp.note(v, { src: m, how: 'reflect' });   // v2.18.2 死因
    if (G.pl.life <= 0) { G.pl.life = 0; playerDie(); }
  }
  return r;
};
// 死掉：分裂；寶藏怪掉一堆東西
Hook.on('kill', m => {
  if ((hasMod(m, 'split') || (G.world.mm && G.world.mm.flags && G.world.mm.flags.msplit && !m.boss && !m.splitChild && Math.random() < 0.25)) && !m.splitChild) {
    for (let i = 0; i < 2; i++) { const p = randomFloorNear(m.x, m.y, 30); const c = makeMonster(m.type, p.x, p.y, Math.max(1, m.mlvl - 2), 'normal', G.world.theme); c.maxLife = c.life = Math.round(c.maxLife * 0.45); c.scale = Math.max(1, (c.scale || 2) - 1); c.splitChild = true; c.aggro = true; G.mons.push(c); }
    burst(m.x, m.y, '#e0c0ff', 12, 140);
  }
  if (m.treasure) {
    mapLoot(m.x, m.y, { n: 10, q: 50, r: 50, bonus: 5, rare: 2, ilvl: m.mlvl });   // v2.8.11 照地圖掉寶率計算（保底 2 件黃裝）
    UI.banner('寶藏怪倒下了', '掉了一地的寶物', '#ffd36a'); Sfx.play('unique');
  }
});
// 每格：精英能力的行為
Hook.on('update', dt => {
  if (G.state !== 'play' || !G.P || G.dead || UI.paused() || !G.world || G.world.kind !== 'map') return;
  const pl = G.pl;
  // 疾行光環：先還原，再套用
  for (const m of G.mons) if (m.baseSpeed != null && !m.dead) { m.speed = m.baseSpeed; m.aspd = m.baseAspd; if (m.baseDmg && !m.enraged) m.dmg = m.baseDmg.slice(); }
  for (const m of G.mons) {
    if (m.dead || !m.modIds || !m.modIds.length) continue;
    const d = dist(m, pl);
    if (hasMod(m, 'haste')) for (const o of G.mons) if (!o.dead && o !== m && dist(o, m) < 160 && o.baseSpeed != null) { o.speed = o.baseSpeed * 1.3; o.aspd = o.baseAspd * 1.3; }
    if (hasMod(m, 'enrage') && m.life < m.maxLife * 0.4) { if (!m.enraged) { m.enraged = true; G.texts.push({ x: m.x, y: m.y - m.r - 26, txt: '狂暴！', color: '#ff6040', size: 13, t: 0, dur: 0.9 }); } m.speed = m.baseSpeed * 1.5; m.dmg = m.baseDmg.map(v => v * 1.5); if (Math.random() < 0.2) G.parts.push({ x: m.x + rnd(-8, 8), y: m.y - 10, vx: 0, vy: -40, t: 0, dur: 0.4, color: '#ff4020', s: 2 }); }
    if (hasMod(m, 'shield') && m.shield < m.shieldMax && G.time - (m.shieldHitT || 0) > 4) m.shield = Math.min(m.shieldMax, m.shield + m.shieldMax * dt);
    if (hasMod(m, 'blinker') && m.aggro && d > 130 && d < 600 && G.time > (m.blinkT || 0)) { m.blinkT = G.time + 5; burst(m.x, m.y, '#c090ff', 10); const p = randomFloorNear(pl.x + rnd(-60, 60), pl.y + rnd(-60, 60), 20); m.x = p.x; m.y = p.y; burst(m.x, m.y, '#c090ff', 10); Sfx.play('blink', 0.6); }
    if (hasMod(m, 'caller') && m.aggro && G.time > (m.callT || 0)) { m.callT = G.time + 8; m.called = (m.called || 0); if (m.called < 6) { for (let i = 0; i < 2; i++) { const p = randomFloorNear(m.x, m.y, 50); const c = makeMonster(pick(G.world.theme.monsters), p.x, p.y, Math.max(1, m.mlvl - 2), 'normal', G.world.theme); c.aggro = true; G.mons.push(c); m.called++; } G.fx.push({ k: 'ring', x: m.x, y: m.y, r: 60, t: 0, dur: 0.4, color: '#c8a0ff', fill: 'rgba(160,100,255,0.15)' }); } }
    if (hasMod(m, 'toxic') && m.aggro && G.time > (m.toxT || 0)) { m.toxT = G.time + 2; G.zones.push({ x: m.x, y: m.y + 6, r: 34, dps: m.baseDmg[1] * 0.5, elem: 'chaos', t: 0, dur: 4, color: '#80c040' }); }
    if (hasMod(m, 'frostaura') && d < 120) { pl.ail = pl.ail || {}; pl.ail.chill = Math.max(pl.ail.chill || 0, 0.3); if (Math.random() < 0.15) G.parts.push({ x: m.x + rnd(-60, 60), y: m.y + rnd(-40, 40), vx: 0, vy: -20, t: 0, dur: 0.6, color: '#bfefff', s: 2 }); }
    if (hasMod(m, 'unyield')) { m.frozen = 0; m.chill = 0; }
  }
  // 寶藏怪：看到你就逃跑
  for (const m of G.mons) if (m.treasure && !m.dead && dist(m, pl) < 300) { const a = Math.atan2(m.y - pl.y, m.x - pl.x); moveEnt(m, Math.cos(a) * 150 * dt, Math.sin(a) * 150 * dt); if (Math.random() < 0.3) G.parts.push({ x: m.x, y: m.y, vx: 0, vy: -20, t: 0, dur: 0.5, color: '#ffd36a', s: 2 }); }
  // 地圖詞綴：火焰陷阱
  const F = G.world.mm && G.world.mm.flags;
  if (F && F.mburn && G.time > (G.burnT || 0)) { G.burnT = G.time + 5; const p = randomFloorNear(pl.x + rnd(-120, 120), pl.y + rnd(-90, 90), 30); G.teles.push({ shape: 'circle', x: p.x, y: p.y, r: 60, dur: 1.0, t: 0, color: '#ff7030' }); G.delayQ.push({ t: 1.0, fn: () => { G.zones.push({ x: p.x, y: p.y, r: 60, dps: G.S.maxLife * 0.06, elem: 'fire', t: 0, dur: 3, color: '#ff7030' }); } }); }
});
// 護盾條（畫在怪物頭上）：用資訊列顯示，另外在怪物身上畫一圈
const _drawMonEl = typeof drawMonster === 'function' ? drawMonster : null;
if (_drawMonEl) drawMonster = function (g, m) { _drawMonEl(g, m); if (m.shield > 0 && !m.dead) { g.strokeStyle = `rgba(150,210,255,${0.3 + 0.5 * m.shield / m.shieldMax})`; g.lineWidth = 2; g.beginPath(); g.arc(m.x, m.y - 4, m.r + 6, 0, Math.PI * 2); g.stroke(); } if (m.treasure) { g.strokeStyle = '#ffd36a'; g.lineWidth = 1.5; g.beginPath(); g.arc(m.x, m.y - 4, m.r + 4 + Math.sin(G.time * 6) * 2, 0, Math.PI * 2); g.stroke(); } };

// ---------- 地圖詞綴 +9 種（有好有壞） ----------
const NEW_MAP_MODS = [
  { id: 'meliterefl', name: '精英怪全部帶「反射」', eliteMod: 'reflect', q: 10, r: 14 },
  { id: 'msplit', name: '怪物死掉時 25% 機率分裂', flag: 'msplit', q: 14, r: 8 },
  { id: 'mburn', name: '地上會不定時冒出火焰陷阱', flag: 'mburn', q: 8, r: 10 },
  { id: 'mnoleech', name: '你無法偷取生命和魔力', flag: 'mnoleech', q: 8, r: 10 },
  { id: 'mcurse', name: '你受到的傷害 +15%', flag: 'mcurse', q: 10, r: 12 },
  { id: 'mdark', name: '濃霧：視野變小', flag: 'mdark', q: 6, r: 8 },
  { id: 'mrich', name: '怪物生命 +25%，黃裝更容易掉', life: 1.25, q: 0, r: 40 },
  { id: 'mtreasure', name: '地圖裡藏著一隻會逃跑的寶藏怪', flag: 'mtreasure', q: 5, r: 5 },
  { id: 'mswift', name: '你的移動速度 +15%，怪物傷害 +15%', flag: 'mswift', dmg: 1.15, q: 6, r: 6 },
];
for (const m of NEW_MAP_MODS) { MAP_MODS.push(m); MAP_MOD_BY_ID[m.id] = m; }
const _aggEl = aggMods;
aggMods = function (ids) { const A = _aggEl(ids); A.flags = {}; for (const id of ids) { const m = MAP_MOD_BY_ID[id]; if (!m) continue; if (m.flag) A.flags[m.flag] = true; if (m.eliteMod) A.eliteMod = m.eliteMod; } return A; };
// 寶藏怪
const _enterEl = enterMap;
enterMap = function (tier) {
  const r = _enterEl(tier);
  onBuildChanged();   // 地圖詞綴（移動速度、不能偷取）要重算
  const F = G.world && G.world.mm && G.world.mm.flags;
  if (F && F.mtreasure) {
    const room = pick(G.world.others || [G.world.start]); const p = randomFloorNear((room.x + room.w / 2) * TS, (room.y + room.h / 2) * TS, 40);
    const m = makeMonster(pick(G.world.theme.monsters), p.x, p.y, G.world.mlvl + 2, 'rare', G.world.theme);
    m.treasure = true; m.name = '寶藏怪'; m.maxLife = m.life = Math.round(m.maxLife * 1.5); m.dmg = [1, 2]; m.baseDmg = [1, 2]; m.tint = { A: '#ffd36a', R: '#ffd36a', B: '#ffd36a' };
    G.mons.push(m);
  }
  return r;
};
// 你受到的傷害 +15%、移動 +15%、不能偷取
const _dmgEl = damagePlayer;
damagePlayer = function (parts, opts = {}) { const F = G.world && G.world.mm && G.world.mm.flags; if (F && F.mcurse) parts = parts.map(p => [p[0] * 1.15, p[1]]); return _dmgEl(parts, opts); };
const _onBuildEl = onBuildChanged;
onBuildChanged = function () { _onBuildEl(); const F = G.world && G.world.mm && G.world.mm.flags; if (F && G.S) { if (F.mswift) G.S.moveSpeed *= 1.15; if (F.mnoleech) { G.S.leech = 0; G.S.mleech = 0; } } };
