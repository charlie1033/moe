// =============================================================
//  v2.16.2 技能型傳奇：不加天賦分支，改成「穿上這件傳奇，某個技能的玩法就變了」
//  隨機掉落（跟一般傳奇一樣進掉落池，物品等級夠就會掉），分布在武器以外的各個部位：
//   ・骸骨引信（戒指）     召喚骷髏 → 自爆骷髏：撞到敵人就爆炸（範圍火焰傷害＝骷髏一下的 5 倍），爆完消失
//   ・炎環冠（頭盔）       火球術爆炸後，再往外噴出 3 顆小火球（各 40% 傷害）
//   ・回音箭袋（箭袋）     箭命中後，往附近另一個敵人再射一支回音箭（50% 傷害）
//   ・震地拳套（手套）     每放 3 次近戰技能，第 3 下震出一圈衝擊波（武器物理傷害 ×1.5，範圍 110）
//   ・霜心（項鍊）         冰霜新星放完，地上留下一片持續 3 秒的冰霜地（冰冷傷害、冰緩）
//   ・根脈腰帶（腰帶）     荊棘綻放會把範圍裡的敵人往中間拖
//   ・碎骨之靴（鞋子）     骨矛殺死敵人時，屍體炸出 3 片骨刺往外飛（各 50% 傷害）
//   ・毒牙手套（手套）     中毒的敵人死掉時，原地炸開一團毒霧（3 秒，毒素傷害＝牠最大生命的 6%／跳，會中毒）
//  做法：每件傳奇帶一個旗標（S.flags.xxx），效果在這個檔案裡用 Hook 'cast'／'update'／'kill' 實作
// =============================================================
for (const f of ['skelBomb', 'fireSplit', 'arrowEcho', 'quake3', 'novaGround', 'thornPull', 'spearShatter', 'poisonSpread']) FLAG_STATS.add(f);
Object.assign(STAT_TEXT, {
  skelBomb: () => '召喚骷髏變成自爆骷髏：撞到敵人就爆炸（範圍火焰傷害＝骷髏攻擊的 5 倍），爆炸後消失',
  fireSplit: () => '火球術爆炸後，往外噴出 3 顆小火球（各 40% 傷害）',
  arrowEcho: () => '箭命中後，朝附近另一個敵人射出回音箭（50% 傷害）',
  quake3: () => '每放 3 次近戰技能，第 3 下震出一圈衝擊波（武器物理傷害 ×1.5）',
  novaGround: () => '冰霜新星會在地上留下持續 3 秒的冰霜地（冰冷傷害、冰緩）',
  thornPull: () => '荊棘綻放會把範圍裡的敵人往中間拖',
  spearShatter: () => '骨矛殺死敵人時，屍體炸出 3 片骨刺往外飛（各 50% 傷害）',
  poisonSpread: () => '中毒的敵人死亡時炸開毒霧（3 秒，每跳造成牠最大生命 6% 的毒素傷害）',
});
const SKILL_UNIQUES = [
  { id: 'u_fuse', name: '骸骨引信', base: 'ring0', flavor: '它們本來就沒打算活著回來。', mods: [['skelBomb'], ['minion_dmg_inc', 20, 30], ['int', 15, 25]] },
  { id: 'u_flamecrown', name: '炎環冠', base: 'helmet_es1', flavor: '火焰不會只燒一次。', mods: [['fireSplit'], ['fire_inc', 25, 35], ['es', 30, 50]] },
  { id: 'u_echoquiver', name: '回音箭袋', base: 'quiver1', flavor: '每一箭，都會有回聲。', mods: [['arrowEcho'], ['proj_inc', 15, 25], ['dex', 15, 25]] },
  { id: 'u_quakefist', name: '震地拳套', base: 'gloves_ev1', flavor: '第三拳，大地會替你出手。', mods: [['quake3'], ['melee_inc', 20, 30], ['str', 15, 25]] },
  { id: 'u_frostheart', name: '霜心', base: 'amulet0', flavor: '你走過的地方，都會下雪。', mods: [['novaGround'], ['cold_inc', 25, 35], ['mana', 30, 50]] },
  { id: 'u_rootbelt', name: '根脈腰帶', base: 'belt0', flavor: '根會找到你，然後把你拉下去。', mods: [['thornPull'], ['chaos_inc', 20, 30], ['life', 30, 50]] },
  { id: 'u_shardboots', name: '碎骨之靴', base: 'boots_ev0', flavor: '骨頭碎了，還會再刺一次。', mods: [['spearShatter'], ['spell_inc', 15, 25], ['move_inc', 8, 12]] },
  { id: 'u_fanggloves', name: '毒牙手套', base: 'gloves_ev0', flavor: '毒，不會因為死亡而停止。', mods: [['poisonSpread'], ['poison_ch', 20, 30], ['dot_inc', 15, 25]] },
];
for (const u of SKILL_UNIQUES) if (!UNIQUE_BY_ID[u.id] && BASE_BY_ID[u.base]) { UNIQUES.push(u); UNIQUE_BY_ID[u.id] = u; }
const F = k => G.S && G.S.flags && G.S.flags[k];
// —— 放技能時 ——
let _q3 = 0;
Hook.on('cast', (sid, c) => {
  const sk = SKILLS[sid], pl = G.pl; if (!sk || !pl) return;
  if (sid === 'nova' && F('novaGround')) {
    const v = c && c.d && c.d.cold && c.d.cold[1] ? c.d.cold : [5, 9];
    G.azones.push({ sid: 'frostground', x: pl.x, y: pl.y, r: (sk.radius || 120) * (c && c.areaMul || 1) * 0.8, t: 0, dur: 3, tick: 0.5, next: 0, pk: { d: { cold: [v[0] * 0.25, v[1] * 0.25] }, crit: 0, multi: 150, ail: {} }, color: '#a8ecff', chill: true });
  }
  if (F('quake3') && sk.tags.includes('melee') && ++_q3 % 3 === 0) {
    const w = G.S.weapon || { phys: [5, 10] }, R = 110;
    G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: R, t: 0, dur: 0.35, color: '#e8c890', fill: 'rgba(230,200,140,0.18)' }); G.shake = Math.max(G.shake, 4);
    for (const m of G.mons) if (!m.dead && dist(m, pl) <= R + m.r) hitMonster(m, { d: { phys: [w.phys[0] * 1.5, w.phys[1] * 1.5] }, crit: 5, multi: 150, ail: {} }, false, pl, 1.6);
  }
});
// —— 每格：投射物命中、自爆骷髏、荊棘拉人、火球分裂 ——
let _fb = new Map();
Hook.on('update', dt => {
  const pl = G.pl; if (!pl || !G.S) return;
  const seen = new Map();
  for (const p of G.projs) {
    if (p.team !== 'ally') continue;
    // 新命中的怪
    const n = p.hit ? p.hit.size : 0;
    if (n && n !== (p._hn || 0)) {
      const hits = [...p.hit].slice(p._hn || 0); p._hn = n;
      for (const m of hits) {
        if (F('arrowEcho') && p.sprite === 'arrow' && !p.echo && !p.fromMinion && p.color !== '#e8dcc0') {
          let best = null, bd = 260; for (const o of G.mons) { if (o.dead || o === m) continue; const d = dist(o, m); if (d < bd) { bd = d; best = o; } }
          if (best) { const a = Math.atan2(best.y - m.y, best.x - m.x); G.projs.push({ team: 'ally', x: m.x, y: m.y, vx: Math.cos(a) * 600, vy: Math.sin(a) * 600, r: 4, life: 0.6, pk: scalePk(p.pk, 0.5), pierce: 0, hit: new Set([m]), sprite: 'arrow', color: '#c8f0ff', echo: true }); }
        }
        if (F('spearShatter') && m.dead && p.color === '#e8dcc0' && !p.shard) {
          for (let k = 0; k < 3; k++) { const a = Math.random() * Math.PI * 2; G.projs.push({ team: 'ally', x: m.x, y: m.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 4, life: 0.45, pk: scalePk(p.pk, 0.5), pierce: 1, hit: new Set([m]), sprite: 'arrow', color: '#e8dcc0', shard: true }); }
          burst(m.x, m.y, '#e8dcc0', 12, 160);
        }
      }
    }
    if (F('fireSplit') && p.sprite === 'fireball' && !p.mini) seen.set(p, { x: p.x, y: p.y, pk: p.pk, vx: p.vx, vy: p.vy });
  }
  // 火球消失（爆炸）了 → 噴 3 顆小火球
  for (const [p, s] of _fb) if (!seen.has(p)) {
    const a0 = Math.atan2(s.vy, s.vx);
    for (const k of [-1, 0, 1]) { const a = a0 + Math.PI + k * 0.9; G.projs.push({ team: 'ally', x: s.x - Math.cos(a0) * 10, y: s.y - Math.sin(a0) * 10, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, r: 5, life: 0.45, pk: scalePk(s.pk, 0.4), pierce: 0, hit: new Set(), explode: 34, sprite: 'fireball', color: '#ff9a50', mini: true }); }
  }
  _fb = seen;
  // 自爆骷髏
  if (F('skelBomb')) for (const mn of G.mins.slice()) {
    if (mn.mtype !== 'skel') continue;
    const tgt = G.mons.find(m => !m.dead && !m.hidden && dist(m, mn) < m.r + mn.r + 10); if (!tgt) continue;
    const R = 72, d = mn.dmg || [5, 9];
    G.fx.push({ k: 'boom', x: mn.x, y: mn.y, r: R, t: 0, dur: 0.4 }); G.shake = Math.max(G.shake, 3); Sfx.play('boom', 0.5);
    for (const m of G.mons) if (!m.dead && dist(m, mn) <= R + m.r) hitMonster(m, { d: { fire: [d[0] * 5, d[1] * 5] }, crit: 5, multi: 150, ail: { ignite: 30 } }, true, mn, 1.4);
    G.mins.splice(G.mins.indexOf(mn), 1);
  }
  // 根脈：荊棘把敵人往中間拖
  if (F('thornPull')) for (const z of G.azones) {
    if (z.sid !== 'thorn') continue;
    for (const m of G.mons) { if (m.dead || m.boss) continue; const dx = z.x - m.x, dy = z.y - m.y, d = Math.hypot(dx, dy); if (d > 8 && d < z.r + m.r) moveEnt(m, dx / d * 70 * dt, dy / d * 70 * dt); }
  }
});
// —— 怪死掉時 ——
Hook.on('kill', m => {
  if (F('poisonSpread') && m.poisons && m.poisons.length && !m.boss) {
    const v = m.maxLife * 0.06;
    G.azones.push({ sid: 'poisoncloud', x: m.x, y: m.y, r: 62, t: 0, dur: 3, tick: 0.5, next: 0, pk: { d: { chaos: [v * 0.8, v * 1.2] }, crit: 0, multi: 150, ail: { poison: 60 } }, color: '#80c040' });
    burst(m.x, m.y, '#80c040', 14, 140);
  }
});

// =============================================================
//  v2.16.3 第二批技能型傳奇（12 件）
//   召喚：群鴉之心（項鍊）靈體的暗影彈命中後再彈跳 2 次｜巨像之心（胸甲）石魔像倒下時炸開，留下 4 秒減速碎石地｜
//         狼王之牙（頭盔）靈狼咬死敵人時，召來一隻 8 秒的小狼（最多 3 隻）
//   法師：雷鳴指環（戒指）電弧多彈跳 2 次｜隕石之瞳（頭盔）隕石術周圍再落下 2 顆小隕石（各 50%）｜
//         永凍之心（胸甲）冰霜之矛命中時炸出冰晶（範圍 60，40% 傷害）
//   戰士／武士：旋風之靴（鞋子）旋風斬時移動速度 +40%｜戰吼號角（盾）戰吼把 300 內的敵人拉到身邊｜
//         居合之鞘（腰帶）居合斬之後，原地再放一圈劍氣（範圍 120，武器傷害 ×2）
//   盜賊／弓箭手：百影手套（手套）丟飛刀時，3 把飛刀繞著你轉 2 秒｜
//         雨神之弓弦（箭袋）毒雨箭的落點冒毒 3 秒｜影步之靴（鞋子）翻滾／位移後 2 秒內的下一次攻擊必定暴擊
// =============================================================
for (const f of ['spiritChain', 'golemBurst', 'wolfPack', 'arcMore', 'meteorTriple', 'iceShatter', 'whirlHaste', 'warcryPull', 'iaiWave', 'knivesOrbit', 'rainLinger', 'rollCrit']) FLAG_STATS.add(f);
Object.assign(STAT_TEXT, {
  spiritChain: () => '召喚靈體的暗影彈命中後，再彈跳到附近 2 個敵人',
  golemBurst: () => '石魔像倒下時炸開（範圍物理傷害），留下 4 秒讓敵人變慢的碎石地',
  wolfPack: () => '靈狼咬死敵人時，召來一隻 8 秒的小狼（最多同時 3 隻）',
  arcMore: () => '電弧多彈跳 2 次',
  meteorTriple: () => '隕石術落下時，周圍再落下 2 顆小隕石（各 50% 傷害）',
  iceShatter: () => '冰霜之矛命中時炸出冰晶（範圍 40% 傷害）',
  whirlHaste: () => '施放旋風斬時，移動速度 +40%',
  warcryPull: () => '戰吼會把附近的敵人拉到你身邊',
  iaiWave: () => '居合斬之後，原地再放出一圈劍氣（武器傷害 ×2）',
  knivesOrbit: () => '丟飛刀時，3 把飛刀繞著你轉 2 秒，碰到敵人就割',
  rainLinger: () => '毒雨箭的落點冒毒 3 秒',
  rollCrit: () => '翻滾或位移後 2 秒內，下一次攻擊必定暴擊',
});
const SKILL_UNIQUES2 = [
  { id: 'u_ravenheart', name: '群鴉之心', base: 'amulet0', flavor: '一隻飛出去，帶回來三隻。', mods: [['spiritChain'], ['minion_dmg_inc', 20, 30], ['int', 15, 25]] },
  { id: 'u_colossus', name: '巨像之心', base: 'body_ar0', flavor: '它倒下的地方，誰也別想走快。', mods: [['golemBurst'], ['minion_life_inc', 25, 35], ['life', 40, 60]] },
  { id: 'u_wolfking', name: '狼王之牙', base: 'helmet_es0', flavor: '狼群，從來不是一隻。', mods: [['wolfPack'], ['minion_dmg_inc', 15, 25], ['dex', 15, 25]] },
  { id: 'u_thunderring', name: '雷鳴指環', base: 'ring0', flavor: '雷聲會一路追下去。', mods: [['arcMore'], ['light_inc', 25, 35], ['cspd_inc', 6, 10]] },
  { id: 'u_meteoreye', name: '隕石之瞳', base: 'helmet_es2', flavor: '天上掉下來的，從來不只一顆。', mods: [['meteorTriple'], ['fire_inc', 20, 30], ['area_inc', 10, 15]] },
  { id: 'u_icecore', name: '永凍之心', base: 'body_ev1', flavor: '碎掉的冰，也是武器。', mods: [['iceShatter'], ['cold_inc', 25, 35], ['es', 40, 60]] },
  { id: 'u_galeboots', name: '旋風之靴', base: 'boots_ev0', flavor: '轉得越快，跑得越遠。', mods: [['whirlHaste'], ['melee_inc', 15, 25], ['move_inc', 6, 10]] },
  { id: 'u_warhorn', name: '戰吼號角', base: 'shield1', flavor: '吼一聲，牠們就會自己過來。', mods: [['warcryPull'], ['armour_inc', 40, 60], ['life', 30, 50]] },
  { id: 'u_sheath', name: '居合之鞘', base: 'belt0', flavor: '刀還沒回鞘，第二刀已經到了。', mods: [['iaiWave'], ['attack_inc', 20, 30], ['str', 15, 25]] },
  { id: 'u_hundredshade', name: '百影手套', base: 'gloves_ev1', flavor: '你看到的每一把刀，都是真的。', mods: [['knivesOrbit'], ['proj_inc', 15, 25], ['dex', 15, 25]] },
  { id: 'u_rainstring', name: '雨神之弓弦', base: 'quiver1', flavor: '雨停了，毒還在。', mods: [['rainLinger'], ['chaos_inc', 20, 30], ['poison_ch', 15, 25]] },
  { id: 'u_shadowstep', name: '影步之靴', base: 'boots_ev0', flavor: '影子落地的那一刻，就是破綻。', mods: [['rollCrit'], ['crit_inc', 30, 50], ['move_inc', 6, 10]] },
];
for (const u of SKILL_UNIQUES2) if (!UNIQUE_BY_ID[u.id] && BASE_BY_ID[u.base]) { UNIQUES.push(u); UNIQUE_BY_ID[u.id] = u; SKILL_UNIQUES.push(u); }
const pkOf = (c, k = 1) => ({ d: Object.fromEntries(Object.entries((c && c.d) || {}).map(([e, v]) => [e, [v[0] * k, v[1] * k]])), crit: (c && c.crit) || 5, multi: (c && c.multi) || 150, ail: (c && c.ail) || {} });
// 雷鳴指環：電弧多彈 2 次（能力重算時調整，拿掉就恢復）
const _arcChains = SKILLS.arc ? SKILLS.arc.chains || 0 : 0;
Hook.on('build', () => { if (SKILLS.arc) SKILLS.arc.chains = _arcChains + (F('arcMore') ? 2 : 0); });
let _lastCast = { sid: null, t: -9 }, _orbit = null;
Hook.on('cast', (sid, c) => {
  const pl = G.pl, sk = SKILLS[sid]; if (!pl || !sk) return; _lastCast = { sid, t: G.time };
  if (G._rollCritT > 0 && sk.tags.includes('attack')) setTimeout(() => { G._rollCritT = 0; onBuildChanged(); }, 0);   // 影步：這一下用掉
  if (F('rollCrit') && sk.tags.includes('movement')) { G._rollCritT = 2; setTimeout(() => onBuildChanged(), 0); }
  if (sid === 'meteor' && F('meteorTriple')) {
    for (const s of [-1, 1]) { const a = Math.random() * Math.PI * 2, x = input.wx + Math.cos(a) * 80 * s, y = input.wy + Math.sin(a) * 60; if (shotWallAt(x, y)) continue;
      G.strikes.push({ x, y, r: (sk.radius || 90) * 0.6, t: -(sk.delay || 0.8) - 0.25 * (s + 2), pk: pkOf(c, 0.5), kind: 'meteor', color: sk.color, kb: 1.2 }); }
  }
  if (sid === 'warcry' && F('warcryPull')) for (const m of G.mons) { if (m.dead || m.boss || m.hidden) continue; const d = dist(m, pl); if (d < 300 && d > 40) { const k = (d - 40) / d * 0.85; const p = nearestFloor(m.x - (m.x - pl.x) * k, m.y - (m.y - pl.y) * k); m.x = p.x; m.y = p.y; m.aggro = true; burst(m.x, m.y, '#ff6050', 6, 90); } }
  if (sid === 'iai' && F('iaiWave')) setTimeout(() => { if (!G.pl || G.pl.dead) return; const w = G.S.weapon || { phys: [5, 10] }, R = 120, P0 = G.pl; G.fx.push({ k: 'ring', x: P0.x, y: P0.y, r: R, t: 0, dur: 0.3, color: '#f0d090', fill: 'rgba(240,208,144,0.18)' });
    for (const m of G.mons) if (!m.dead && !m.hidden && dist(m, P0) <= R + m.r) hitMonster(m, { d: { phys: [w.phys[0] * 2, w.phys[1] * 2] }, crit: 10, multi: 150, ail: {} }, false, P0, 1.2); }, 250);
  if (sid === 'knives' && F('knivesOrbit')) _orbit = { t: 2, pk: pkOf(c, 0.6), hit: new Map() };
  if (sid === 'rain' && F('rainLinger')) { const v = (c && c.d && c.d.phys) || [3, 6]; G.azones.push({ sid: 'rainpoison', x: input.wx, y: input.wy, r: (sk.radius || 80) * ((c && c.areaMul) || 1), t: 0, dur: 3, tick: 0.5, next: 0.3, pk: { d: { chaos: [v[0] * 0.35, v[1] * 0.35] }, crit: 0, multi: 150, ail: { poison: 60 } }, color: '#90d060' }); }
});
let _golems = new Set(), _dodgeCd = 0;
Hook.on('update', dt => {
  const pl = G.pl; if (!pl || !G.S) return;
  // 群鴉之心：靈體暗影彈、永凍之心：冰矛命中
  for (const p of G.projs) {
    if (!p.hit) continue;
    if (F('spiritChain') && p.fromMinion && p.sprite === 'shadow') {
      const n = p.hit.size; if (n && n !== (p._cn || 0)) { p._cn = n;
        const m = [...p.hit][n - 1];
        if ((p.bounce || 0) < 2) { let best = null, bd = 220; for (const o of G.mons) { if (o.dead || p.hit.has(o) || o.hidden) continue; const d = dist(o, m); if (d < bd) { bd = d; best = o; } }
          if (best) { const a = Math.atan2(best.y - m.y, best.x - m.x); G.projs.push(Object.assign({}, p, { x: m.x, y: m.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, life: 0.8, hit: new Set(p.hit), bounce: (p.bounce || 0) + 1, _cn: p.hit.size })); } }
      }
    }
    if (F('iceShatter') && p.team === 'ally' && p.sprite === 'iceshard' && !p.fromMinion) {
      const n = p.hit.size; if (n && n !== (p._in || 0)) { const ms = [...p.hit].slice(p._in || 0); p._in = n;
        for (const m of ms) { const R = 60; G.fx.push({ k: 'ring', x: m.x, y: m.y, r: R, t: 0, dur: 0.3, color: '#a8e8ff', fill: 'rgba(168,232,255,0.2)' }); burst(m.x, m.y, '#d8f6ff', 10, 150);
          for (const o of G.mons) if (!o.dead && o !== m && dist(o, m) <= R + o.r) hitMonster(o, scalePk(p.pk, 0.4), false, m, 0.6); } }
    }
  }
  // 巨像之心：石魔像倒下
  const now = new Set(G.mins.filter(m => m.mtype === 'golem' && m.life > 0));
  if (F('golemBurst')) for (const g0 of _golems) if (!now.has(g0) && g0.life <= 0) {
    const d = g0.dmg || [20, 30], R = 100;
    G.fx.push({ k: 'boom', x: g0.x, y: g0.y, r: R, t: 0, dur: 0.45 }); G.shake = Math.max(G.shake, 5); burst(g0.x, g0.y, '#b0a890', 30, 220);
    for (const m of G.mons) if (!m.dead && dist(m, g0) <= R + m.r) hitMonster(m, { d: { phys: [d[0] * 3, d[1] * 3] }, crit: 5, multi: 150, ail: {} }, true, g0, 1.6);
    G.azones.push({ sid: 'rubble', x: g0.x, y: g0.y, r: R, t: 0, dur: 4, tick: 0.5, next: 0, pk: { d: { phys: [1, 2] }, crit: 0, multi: 100, ail: {} }, color: '#b0a890', chill: true });
  }
  _golems = now;
  // 狼王之牙：小狼時間到就散掉
  for (const mn of G.mins.slice()) if (mn.temp !== undefined && (mn.temp -= dt) <= 0) { burst(mn.x, mn.y, '#a0e0a8', 10, 100); mn.life = 0; G.mins.splice(G.mins.indexOf(mn), 1); }
  // 旋風之靴
  if (F('whirlHaste') && _lastCast.sid === 'whirl' && G.time - _lastCast.t < 0.4) {
    const k = input.keys || {}; let mx = 0, my = 0; if (k.KeyW || k.ArrowUp) my--; if (k.KeyS || k.ArrowDown) my++; if (k.KeyA || k.ArrowLeft) mx--; if (k.KeyD || k.ArrowRight) mx++;
    if (input.joy && Math.hypot(input.joy.x, input.joy.y) > 0.15) { mx = input.joy.x; my = input.joy.y; }
    const L = Math.hypot(mx, my); if (L > 0.15) moveEnt(pl, mx / L * G.S.moveSpeed * 0.4 * dt, my / L * G.S.moveSpeed * 0.4 * dt);
  }
  // 百影手套：飛刀繞身
  if (_orbit) {
    _orbit.t -= dt; if (_orbit.t <= 0) _orbit = null;
    else for (let k = 0; k < 3; k++) { const a = G.time * 7 + k * Math.PI * 2 / 3, x = pl.x + Math.cos(a) * 46, y = pl.y + Math.sin(a) * 34;
      for (const m of G.mons) { if (m.dead || m.hidden || Math.hypot(m.x - x, m.y - y) > m.r + 10) continue; const last = _orbit.hit.get(m) || -9; if (G.time - last > 0.3) { _orbit.hit.set(m, G.time); hitMonster(m, _orbit.pk, false, pl, 0.3); } } }
  }
  // 影步之靴：翻滾冷卻剛開始＝剛翻滾
  const cdNow = pl.dodgeCd || 0;
  if (F('rollCrit') && cdNow > _dodgeCd + 0.2) { G._rollCritT = 2; onBuildChanged(); }
  _dodgeCd = cdNow;
  if (G._rollCritT > 0 && (G._rollCritT -= dt) <= 0) { G._rollCritT = 0; onBuildChanged(); }
});
Hook.on('build', () => { if (G._rollCritT > 0 && G.S) G.S.crit_inc = (G.S.crit_inc || 0) + 2000; });
Hook.on('kill', m => {
  if (!F('wolfPack')) return;
  const wolf = G.mins.find(mn => mn.mtype === 'wolf' && mn.temp === undefined && mn.life > 0 && dist(mn, m) < 80);
  if (wolf && G.mins.filter(x => x.temp !== undefined).length < 3) { const p = randomFloorNear(m.x, m.y, 30); G.mins.push(Object.assign({}, wolf, { x: p.x, y: p.y, life: wolf.maxLife, temp: 8, atkCD: 0.3 })); burst(p.x, p.y, '#a0e0a8', 14, 140); }
});
Hook.on('drawWorld', g => {
  if (!_orbit || !G.pl) return; const pl = G.pl;
  g.save(); g.fillStyle = '#d8e0e8'; g.strokeStyle = '#4a5260'; g.lineWidth = 1;
  for (let k = 0; k < 3; k++) { const a = G.time * 7 + k * Math.PI * 2 / 3, x = pl.x + Math.cos(a) * 46, y = pl.y + Math.sin(a) * 34 - 8;
    g.save(); g.translate(x, y); g.rotate(a + Math.PI); g.beginPath(); g.moveTo(0, -9); g.lineTo(3, 4); g.lineTo(-3, 4); g.closePath(); g.fill(); g.stroke(); g.restore(); }
  g.restore();
});
