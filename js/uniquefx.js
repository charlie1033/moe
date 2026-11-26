// =============================================================
//  v2.20.17 傳奇精修（玩家反應：傳奇的效果比較普通）
//  以前只有數值、沒有特效的傳奇，每件多一句「★ 會改變打法的效果」（看傳奇代號，舊存檔撿到的也有，不用重骰）：
//   主線就撿得到：
//   ・暮光之刃（單手劍）   敵人生命低於一半時，你打牠傷害 +50%（更多）；殺死敵人時往前揮出一道穿透的暮光劍氣（主技能 ×1.2）
//   ・風語者（弓）         每射第 3 次，那一輪的箭變成疾風箭：穿透所有敵人、傷害 +60%（更多）
//   ・守夜人之冠（頭盔）   放法術時點亮一盞守夜燈繞著你（最多 3 盞、6 秒），每 0.7 秒朝附近敵人射一道光（主技能 35% 閃電）
//   ・浪人之靴（鞋子）     一直移動會累積「步伐」（每 0.4 秒 1 層、最多 10 層），每層傷害 +4%（更多）；停下來 1 秒就歸零
//   ・血契之戒（戒指）     生命低於一半時傷害 +40%（更多）；殺死敵人回復 2% 生命
//   ・煉金師的腰帶（腰帶） 喝藥劑時身邊炸出藥霧（範圍 130，主技能 ×1.5 毒素傷害、會中毒）；之後 5 秒傷害 +25%（更多）
//   ・妖刀．村正（太刀）   每殺 1 隻累積 1 層「血祭」（最多 20 層、4 秒沒殺會開始掉），每層傷害 +3%（更多）
//   ・腐根之杖（法杖）     中毒的敵人死掉時，身上的毒全部傳染給附近最多 3 隻敵人
//   ・毒蛇之吻（匕首）     打中中毒的敵人時，牠身上每層毒讓這一下傷害 +5%（更多，最多 +100%）
//   ・大白的項圈（項鍊）   召喚物打你身邊（250 內）的敵人時，傷害 +35%（更多）
//   ・生鏽的小王冠（頭盔） 夢殼被打破時，身邊爆出一圈冰：凍住附近的敵人 1.5 秒（看守者 0.4 秒），每 12 秒一次
//   終局（夢魘首領、守門人）：
//   ・亡者冠冕   召喚物倒下時炸出骨爆（範圍 110，牠最大生命 60% 的物理傷害）；召喚物每 4 秒回復 10% 生命
//   ・碎骨者     殺死敵人時，屍體炸出 4 片骨刺往外飛（主技能 50%）
//   ・焚世之心   被點燃的敵人死掉時，火焰跳到附近最多 3 隻敵人身上
//   ・灰燼女王的權杖  法術暴擊時，在目標腳下留下 3 秒火海（會點燃；同時最多 3 片）
//   ・永凍之觸   被冰凍或冰緩的敵人受到的傷害 +30%（更多）；冰凍的敵人死掉時炸出冰新星
//   ・冰河之牙   箭射中被冰緩的敵人時，分裂成 2 支冰箭往兩側飛（各 60%）
//   ・守門人之刃 每第 4 次攻擊揮出一道巨大的守門劍氣：往前穿透所有敵人（主技能 ×3）
//   ・醒來之戒   受到致命傷害時改成留下 30% 生命、震開身邊的敵人（每 90 秒一次）
//  原本就有特效的傳奇，數字調強的在 skilluniques.js、bossuniques.js（各自的註解有寫）
//  「主技能」＝技能欄第一個能用的技能算好的傷害（bossuniques.js 的 buPk）
//  資料：效果旗標 S.flags.ux_xxx（看身上裝備的 uniqueId）；層數、冷卻放在這個檔案的變數裡，不存檔
//  接點：Hook 'stats'（旗標）、'preHit'（傷害加成）、'cast'、'kill'、'crit'、'update'、'preDie'、'drawWorld'、'enterMap'
// =============================================================
const UNIQ_FX = {
  u_dusk: ['ux_dusk', '敵人生命低於一半時，你打牠傷害 +50%（更多）；殺死敵人時往前揮出一道穿透的暮光劍氣'],
  u_wind: ['ux_wind', '每射第 3 次，那一輪的箭變成疾風箭：穿透所有敵人、傷害 +60%（更多）'],
  u_watch: ['ux_watch', '放法術時點亮一盞守夜燈繞著你（最多 3 盞、6 秒），每 0.7 秒朝附近敵人射一道光'],
  u_ronin: ['ux_ronin', '一直移動會累積「步伐」（最多 10 層），每層傷害 +4%（更多）；停下來 1 秒就歸零'],
  u_pact: ['ux_pact', '生命低於一半時傷害 +40%（更多）；殺死敵人回復 2% 生命'],
  u_alch: ['ux_alch', '喝藥劑時身邊炸出藥霧（毒素傷害、會中毒）；之後 5 秒傷害 +25%（更多）'],
  u_muramasa: ['ux_blood', '每殺 1 隻累積 1 層「血祭」（最多 20 層，4 秒沒殺會開始掉），每層傷害 +3%（更多）'],
  u_rootstaff: ['ux_rot', '中毒的敵人死掉時，身上的毒全部傳染給附近最多 3 隻敵人'],
  u_viper: ['ux_viper', '打中中毒的敵人時，牠身上每層毒讓這一下傷害 +5%（更多，最多 +100%）'],
  u_w_collar: ['ux_collar', '召喚物打你身邊（250 內）的敵人時，傷害 +35%（更多）'],
  u_w_crown: ['ux_crown', '夢殼被打破時，身邊爆出一圈冰：凍住附近的敵人 1.5 秒（每 12 秒一次）'],
  u_deadcrown: ['ux_deadcrown', '召喚物倒下時炸出骨爆（牠最大生命 60% 的物理傷害）；召喚物每 4 秒回復 10% 生命'],
  u_bonecleaver: ['ux_cleave', '殺死敵人時，屍體炸出 4 片骨刺往外飛'],
  u_worldburn: ['ux_burn', '被點燃的敵人死掉時，火焰跳到附近最多 3 隻敵人身上'],
  u_ashcrown: ['ux_ashsea', '法術暴擊時，在目標腳下留下 3 秒火海（會點燃；同時最多 3 片）'],
  u_permafrost: ['ux_frost', '被冰凍或冰緩的敵人受到的傷害 +30%（更多）；冰凍的敵人死掉時炸出冰新星'],
  u_glacierfang: ['ux_glacier', '箭射中被冰緩的敵人時，分裂成 2 支冰箭往兩側飛（各 60% 傷害）'],
  u_keeperblade: ['ux_keeper', '每第 4 次攻擊揮出一道巨大的守門劍氣：往前穿透所有敵人'],
  u_wakering: ['ux_wake', '受到致命傷害時改成留下 30% 生命、震開身邊的敵人（每 90 秒一次）'],
};
for (const id in UNIQ_FX) STAT_TEXT[UNIQ_FX[id][0]] = (t => () => t)(UNIQ_FX[id][1]);
const UniqFx = (() => {
  const on = k => G.S && G.S.flags && G.S.flags[k];
  Hook.on('stats', (S, P) => { for (const k in P.equip || {}) { const it = P.equip[k], fx = it && UNIQ_FX[it.uniqueId]; if (fx) S.flags[fx[0]] = true; } });
  Hook.on('build', () => { if (on('ux_ashsea') && typeof HitWatch !== 'undefined') HitWatch.crit = true; });   // 灰燼女王要聽「暴擊」
  ITEM_TIP_EXTRA.push(it => { const fx = UNIQ_FX[it.uniqueId]; return fx ? `<div class="tip-mod c-unique">★ ${fx[1]}</div>` : ''; });
  const st = { ronin: 0, roninT: 0, still: 0, blood: 0, lastKill: -9, bloodT: 0, alchT: 0, flaskC: -1, wind: 0, windArm: -9, keeper: 0, lamps: [], lampT: -9, es: 0, crownCd: 0, wakeCd: 0, minis: new Map(), regenT: 0 };
  const say = (x, y, txt, color, size = 12) => G.texts.push({ x, y, txt, color, size, t: 0, dur: 0.8 });
  const nearest = (x, y, R, skip, n) => G.mons.filter(o => !o.dead && !o.hidden && !(skip && skip.has(o)) && Math.hypot(o.x - x, o.y - y) <= R).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)).slice(0, n);
  const wave = (x, y, a, pk, color, r, life = 0.7, speed = 520) => G.projs.push({ team: 'ally', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, life, pk, pierce: 99, hit: new Set(), sprite: 'orb', color, uxWave: true });
  // —— 打中時的傷害加成（更多）——
  Hook.on('preHit', ctx => {
    const m = ctx.m, pl = G.pl, S = G.S; if (!pl || !S) return;
    if (ctx.fromMinion) { if (on('ux_collar') && Math.hypot(m.x - pl.x, m.y - pl.y) < 250) ctx.mul *= 1.35; return; }
    if (on('ux_dusk') && m.life < m.maxLife * 0.5) ctx.mul *= 1.5;
    if (on('ux_ronin') && st.ronin) ctx.mul *= 1 + 0.04 * st.ronin;
    if (on('ux_pact') && pl.life < S.maxLife * 0.5) ctx.mul *= 1.4;
    if (on('ux_alch') && st.alchT > 0) ctx.mul *= 1.25;
    if (on('ux_blood') && st.blood) ctx.mul *= 1 + 0.03 * st.blood;
    if (on('ux_viper') && m.poisons && m.poisons.length) ctx.mul *= 1 + Math.min(1, 0.05 * m.poisons.length);
    if (on('ux_frost') && (m.frozen > 0 || m.chill > 0)) ctx.mul *= 1.3;
  });
  // —— 放技能時 ——
  Hook.on('cast', (sid, c) => {
    const sk = SKILLS[sid], pl = G.pl; if (!sk || !pl) return;
    const t = sk.tags || [];
    if (on('ux_wind') && t.includes('attack') && t.includes('projectile') && ++st.wind % 3 === 0) st.windArm = G.time;
    if (on('ux_watch') && t.includes('spell') && G.time - st.lampT > 0.6) {
      st.lampT = G.time;
      if (st.lamps.length < 3) st.lamps.push({ a: Math.random() * 6.28, t: 6, cd: 0.3 }); else st.lamps.sort((x, y) => x.t - y.t)[0].t = 6;
    }
    if (on('ux_keeper') && t.includes('attack') && ++st.keeper % 4 === 0) {
      const a = Math.atan2(input.wy - pl.y, input.wx - pl.x);
      wave(pl.x, pl.y, a, buPk(3), '#f0e0b0', 22, 0.8, 600); G.shake = Math.max(G.shake, 3); Sfx.play('boom', 0.35);
      say(pl.x, pl.y - 44, '守門劍氣', '#f0e0b0', 13);
    }
  });
  // —— 怪死掉時 ——
  Hook.on('kill', m => {
    const pl = G.pl, S = G.S; if (!pl || !S || !m) return;
    if (on('ux_blood')) { const was = st.blood; st.blood = Math.min(20, st.blood + 1); st.lastKill = G.time; if (st.blood === 20 && was < 20) say(pl.x, pl.y - 46, '血祭 滿', '#ff6060', 13); }
    if (on('ux_pact')) pl.life = Math.min(S.maxLife, pl.life + S.maxLife * 0.02);
    if (m.x == null) return;
    if (on('ux_dusk')) { const a = Math.atan2(m.y - pl.y, m.x - pl.x); wave(m.x, m.y, a, buPk(1.2), '#ffc870', 14, 0.5); }
    if (on('ux_rot') && m.poisons && m.poisons.length) {
      for (const o of nearest(m.x, m.y, 170, new Set([m]), 3)) {
        for (const p of m.poisons) if (o.poisons.length < 40) o.poisons.push({ dps: p.dps, t: Math.max(1, p.t) });
        burst(o.x, o.y, '#80c040', 8, 90);
      }
      burst(m.x, m.y, '#80c040', 16, 160);
    }
    if (on('ux_burn') && m.ign) {
      for (const o of nearest(m.x, m.y, 180, new Set([m]), 3)) { if (!o.ign || o.ign.dps < m.ign.dps) o.ign = { dps: m.ign.dps, t: 3 }; burst(o.x, o.y, '#ff8040', 8, 100); }
      burst(m.x, m.y, '#ff8040', 16, 160);
    }
    if (on('ux_cleave')) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.random() * 0.6;
      G.projs.push({ team: 'ally', x: m.x, y: m.y, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, r: 4, life: 0.45, pk: buPk(0.5, 'phys'), pierce: 1, hit: new Set([m]), sprite: 'arrow', color: '#e8dcc0' }); }
    if (on('ux_frost') && m.frozen > 0) { buAoe(m.x, m.y, 120, buPk(1, 'cold'), '#a8e8ff', 0.6); burst(m.x, m.y, '#d8f6ff', 18, 180); }
  });
  // —— 法術暴擊：火海 ——
  Hook.on('crit', (m, slot) => {
    if (!on('ux_ashsea') || slot < 0 || !m) return;
    const sid = G.P.skills[slot]; if (!sid || !SKILLS[sid].tags.includes('spell')) return;
    if (G.azones.filter(z => z.sid === 'ashsea').length >= 3) return;
    G.azones.push({ sid: 'ashsea', x: m.x, y: m.y, r: 75, t: 0, dur: 3, tick: 0.5, next: 0, pk: Object.assign(buPk(0.3, 'fire'), { ail: { ignite: 50 } }), color: '#ff7030' });
  });
  // —— 致命傷害：醒來 ——
  Hook.on('preDie', dz => {
    const pl = G.pl, S = G.S; if (dz.cancel || !pl || !S || !on('ux_wake') || st.wakeCd > 0) return;
    dz.cancel = true; st.wakeCd = 90;
    pl.life = Math.round(S.maxLife * 0.3);
    for (const m of G.mons) if (!m.dead && Math.hypot(m.x - pl.x, m.y - pl.y) < 170) { const a = Math.atan2(m.y - pl.y, m.x - pl.x); m.kx = (m.kx || 0) + Math.cos(a) * 300; m.ky = (m.ky || 0) + Math.sin(a) * 300; m.stagger = Math.max(m.stagger || 0, 0.6); }
    G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: 170, t: 0, dur: 0.6, color: '#fff0c0', fill: 'rgba(255,240,192,0.22)' }); burst(pl.x, pl.y, '#fff0c0', 40, 260);
    UI.msg('醒來之戒：你醒過來了（90 秒後才能再一次）', '#fff0c0'); Sfx.play('levelup');
  });
  // —— 每格 ——
  Hook.on('update', dt => {
    const pl = G.pl, S = G.S; if (!pl || !S || G.dead) return;
    if (st.wakeCd > 0) st.wakeCd -= dt; if (st.crownCd > 0) st.crownCd -= dt; if (st.alchT > 0) st.alchT -= dt;
    // 浪人：移動累積步伐
    const k = input.keys || {}, moving = k.KeyW || k.KeyA || k.KeyS || k.KeyD || k.ArrowUp || k.ArrowDown || k.ArrowLeft || k.ArrowRight || (input.joy && Math.hypot(input.joy.x, input.joy.y) > 0.15) || pl.roll > 0;
    if (on('ux_ronin')) {
      if (moving) { st.still = 0; if ((st.roninT += dt) >= 0.4) { st.roninT = 0; const was = st.ronin; st.ronin = Math.min(10, st.ronin + 1); if (st.ronin === 10 && was < 10) say(pl.x, pl.y - 46, '步伐 滿', '#c8e8ff', 13); } }
      else if ((st.still += dt) > 1) { st.ronin = 0; st.roninT = 0; }
    } else st.ronin = 0;
    // 村正：太久沒殺，血祭一層層掉
    if (st.blood > 0 && G.time - st.lastKill > 4) { if ((st.bloodT += dt) >= 0.5) { st.bloodT = 0; st.blood--; } } else st.bloodT = 0;
    if (!on('ux_blood')) st.blood = 0;
    // 煉金師：藥劑充能變少＝剛喝
    const fc = (pl.fl || []).reduce((s, f) => s + (f ? f.c : 0), 0);
    if (on('ux_alch') && st.flaskC >= 0 && fc < st.flaskC - 0.5) {
      st.alchT = 5; const pk = buPk(1.5, 'chaos'); pk.ail = { poison: 60 };
      buAoe(pl.x, pl.y, 130, pk, '#90d060', 0.8); burst(pl.x, pl.y, '#90d060', 24, 200);
    }
    st.flaskC = fc;
    // 小王冠：夢殼被打破
    const es = pl.es || 0;
    if (on('ux_crown') && st.es > 1 && es <= 0 && st.crownCd <= 0) {
      st.crownCd = 12;
      for (const m of G.mons) if (!m.dead && !m.hidden && Math.hypot(m.x - pl.x, m.y - pl.y) < 140 + m.r) { m.frozen = Math.max(m.frozen || 0, m.boss ? 0.4 : 1.5); m.chill = Math.max(m.chill || 0, 2); }
      G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: 140, t: 0, dur: 0.45, color: '#bfefff', fill: 'rgba(191,239,255,0.25)' }); burst(pl.x, pl.y, '#d8f6ff', 30, 220);
      say(pl.x, pl.y - 46, '冰封', '#bfefff', 13);
    }
    st.es = es;
    // 風語者：剛射的那一輪箭變成疾風箭；冰河之牙：箭打中冰緩的敵人分裂
    for (const p of G.projs) {
      if (p.team !== 'ally' || p.sprite !== 'arrow' || p.fromMinion) continue;
      if (!p._ux) { p._ux = 1; if (on('ux_wind') && G.time - st.windArm < 0.15 && !p.echo && !p.shard && !p.uxSplit) { p.pierce = 99; p.pk = scalePk(p.pk, 1.6); p.uxWind = true; p.life = Math.max(p.life || 0, 0.9); } }
      if (on('ux_glacier') && p.hit && !p.uxSplit && !p.echo) {
        const n = p.hit.size; if (n && n !== (p._gn || 0)) { const ms = [...p.hit].slice(p._gn || 0); p._gn = n;
          for (const m of ms) if (m.chill > 0) { const a0 = Math.atan2(p.vy, p.vx), sp = Math.hypot(p.vx, p.vy) || 600;
            for (const s of [-0.5, 0.5]) G.projs.push({ team: 'ally', x: m.x, y: m.y, vx: Math.cos(a0 + s) * sp, vy: Math.sin(a0 + s) * sp, r: 4, life: 0.5, pk: scalePk(p.pk, 0.6), pierce: 0, hit: new Set([m]), sprite: 'arrow', color: '#a8e8ff', uxSplit: true, _ux: 1 }); } }
      }
    }
    // 守夜燈：繞著你轉，朝附近敵人射光
    for (let i = st.lamps.length - 1; i >= 0; i--) { const L = st.lamps[i];
      if ((L.t -= dt) <= 0 || !on('ux_watch')) { st.lamps.splice(i, 1); continue; }
      L.a += dt * 1.6; L.x = pl.x + Math.cos(L.a) * 38; L.y = pl.y - 18 + Math.sin(L.a) * 22;
      if ((L.cd -= dt) > 0) continue; L.cd = 0.7;
      const [m] = nearest(L.x, L.y, 320, null, 1);
      if (m) { const a = Math.atan2(m.y - L.y, m.x - L.x); G.projs.push({ team: 'ally', x: L.x, y: L.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 4, life: 0.8, pk: buPk(0.35, 'light'), pierce: 0, hit: new Set(), sprite: 'orb', color: '#fff0a0' }); }
    }
    // 亡者冠冕：召喚物倒下炸開、慢慢回血
    if (on('ux_deadcrown')) {
      const now = new Map(); for (const mn of G.mins) if (mn.life > 0) now.set(mn, true);
      for (const [mn] of st.minis) if (!now.has(mn)) { const v = (mn.maxLife || 50) * 0.6; buAoe(mn.x, mn.y, 110, { d: { phys: [v * 0.8, v * 1.2] }, crit: 5, multi: 150, ail: {} }, '#e8e0d0', 1.2); burst(mn.x, mn.y, '#e8e0d0', 20, 200); }
      st.minis = now;
      if ((st.regenT += dt) >= 4) { st.regenT = 0; for (const mn of G.mins) if (mn.life > 0 && mn.maxLife) mn.life = Math.min(mn.maxLife, mn.life + mn.maxLife * 0.1); }
    } else st.minis = new Map();
  });
  Hook.on('enterMap', () => { st.lamps.length = 0; st.ronin = 0; st.blood = 0; st.minis = new Map(); st.flaskC = -1; });
  // —— 畫面：守夜燈、步伐／血祭的層數、疾風箭和劍氣的光 ——
  Hook.on('drawWorld', g => {
    const pl = G.pl; if (!pl) return;
    g.save();
    for (const L of st.lamps) { if (L.x == null) continue; g.globalAlpha = Math.min(1, L.t);
      g.fillStyle = 'rgba(255,230,140,0.25)'; g.beginPath(); g.arc(L.x, L.y, 9 + Math.sin(G.time * 5 + L.a) * 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5a4020'; g.fillRect(L.x - 3, L.y - 6, 6, 2); g.fillStyle = '#ffe890'; g.fillRect(L.x - 2, L.y - 4, 4, 6); }
    g.globalAlpha = 1;
    for (const p of G.projs) if (p.uxWind || p.uxWave) { g.fillStyle = p.uxWind ? 'rgba(180,255,230,0.35)' : 'rgba(255,220,150,0.3)'; g.beginPath(); g.arc(p.x, p.y, p.uxWind ? 9 : p.r + 6, 0, Math.PI * 2); g.fill(); }
    const pips = (n, max, color, y) => { for (let i = 0; i < n; i++) { g.fillStyle = color; g.fillRect(pl.x - max * 2 + i * 4, y, 3, 3); } };
    if (st.ronin) pips(st.ronin, 10, '#c8e8ff', pl.y + 14);
    if (st.blood) pips(Math.ceil(st.blood / 2), 10, '#ff5050', pl.y + (st.ronin ? 19 : 14));
    g.restore();
  });
  return { st };
})();
