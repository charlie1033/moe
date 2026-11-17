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
    const v = c && c.pk && c.pk.d && c.pk.d.cold ? c.pk.d.cold : [5, 9];
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
