// =============================================================
//  看守者抉擇（二）：第二階段的新招、信物（單件傳奇）的效果
//  ① 第二階段（選「和解」、牠停手 5 秒之後）：每隻看守者換一套招式 BOSS_ABILITIES['w2_代號']
//     ＝原本的招式（腐骨之王拿掉召喚）＋一招新的（都有預警圈或預警線，wardens.js 記錄有沒有被打中＝金檔「不被新招打中」）
//     腐骨之王＝跳砸（跳到你腳下）、移動 ×1.6；焰喉巫后＝火海（全場燒，只有綠圈安全）；霜牙巨獸＝三道衝擊線；
//     洞穴母后＝一圈毒網；草原獸王＝震地怒吼（身邊大圈＋擊退）；巨鉗蟹王＝大浪（一條很寬很長的線）；
//     沼澤魔女＝五片毒沼；古樹之心＝樹根牢籠（一圈樹根砸下來，正中間安全）；沙之法老＝雷暴（六個雷圈）；虛空之主＝凝視（一條很長的細線，很痛）
//  ② 信物（打贏「和解」那條路才掉）：旗標寫法照 skilluniques.js（FLAG_STATS、S.flags），效果在這裡用 Hook 實作，數字：
//     最後一把鑰匙＝殺死藍、黃精英時牠的骸骨爬起來替你打 15 秒（最多 3 隻）
//     老師的灰燼書頁＝站著不動 1 秒後，每 0.5 秒對身邊 120 內的敵人造成火焰傷害（你最大生命 6%）
//     母后的搖籃絲＝每 5 秒用蛛絲纏住身邊最近的 3 隻敵人：定住 1.5 秒（看守者 0.4 秒）並冰緩
//     商隊的駝鈴＝每走 320 步長，鈴響震退身邊 170 內的敵人（物理傷害＝你最大生命 5%）
//     霧裡的釣線＝每放 4 次技能，把 340 內最遠的一隻敵人拉到你面前並定住 0.6 秒（看守者不會被拉）
//     妹妹的藥草圍裙＝喝生命藥劑時腳下灑出解藥池 4 秒：你站在裡面每秒回 3% 生命，敵人每 0.5 秒受到毒素傷害（你最大生命 4%）
//     卡爾的護手＝每 3 秒替你擋下一發敵人的投射物
//     不熄的燈芯＝身邊 180 內的敵人每秒受到閃電傷害（你最大生命 4%，生命低於 30% 時加倍）
//     國王的懷錶＝一下子被打掉超過 25% 生命時，生命倒轉回 2 秒前（冷卻 20 秒）
//     大白：有套裝系統（makeSetItem）就給 set_dabai_collar／set_dabai_crown，沒有就給這裡的備用傳奇
//  信物登記在 UNIQUES，boss 欄寫 'w_token'：不會隨機掉落、也不算任何首領的專屬掉落
// =============================================================
const WARDEN_P2 = {
  boneking: { drop: ['summon'], spd: 1.6, sig: { t: 'leap', cd: 4, r: 80, mult: 2, cast: 0.9 } },
  witch: { sig: { t: 'safe', cd: 10, r: 80, mult: 2.2, cast: 2.4 } },
  beast: { sig: { t: 'lines', cd: 5, n: 3, spread: 0.38, w: 40, len: 480, mult: 1.6, cast: 0.9 } },
  b_cave: { sig: { t: 'circles', cd: 6, n: 6, ring: 120, r: 42, zone: 4, cast: 1 } },
  b_grass: { spd: 1.2, sig: { t: 'roar', cd: 6, r: 210, mult: 1.5, cast: 1 } },
  b_beach: { sig: { t: 'lines', cd: 6, n: 1, w: 90, len: 900, mult: 1.8, cast: 1.1 } },
  b_swamp: { sig: { t: 'circles', cd: 6, n: 5, ring: 0, r: 55, zone: 5, cast: 1 } },
  b_forest: { sig: { t: 'circles', cd: 7, n: 8, ring: 105, r: 44, mult: 1.7, cast: 1.2 } },
  b_desert: { sig: { t: 'circles', cd: 5, n: 6, ring: 0, r: 50, mult: 1.6, cast: 0.9 } },
  b_void: { sig: { t: 'lines', cd: 4.5, n: 1, w: 34, len: 900, mult: 2.2, cast: 1.2 } },
};
// 新招打中你：記下來（翻滾無敵中不算），再出手
function wSigHit(b, mult) { const pl = G.pl; if (!(pl.iframe > 0) && G.world.wd) G.world.wd.sigHit = true; monsterStrike(b, pl, mult, null, { spell: true }); }
const wInLine = (x, y, a, len, w) => { const pl = G.pl, dx = pl.x - x, dy = pl.y - y, u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a); return u > -pl.r && u < len + pl.r && Math.abs(v) < w / 2 + pl.r; };
function wSigAbility(s) {
  const col = b => ELEM_COLOR[bossEl(b)] || '#ff6040';
  const A = { id: 'wsig', cd: s.cd, cond: () => true, cast: s.cast };
  if (s.t === 'leap') {
    A.cond = (b, d) => d > 90 && d < 520;
    A.start = b => { b.tx = G.pl.x; b.ty = G.pl.y; tele('circle', b.tx, b.ty, s.r, s.cast, '#ff4040'); };
    A.fire = b => { const p = nearestFloor(b.tx, b.ty); b.x = p.x; b.y = p.y; G.shake = 9; burst(b.x, b.y, '#d8c8b0', 26, 240);
      G.fx.push({ k: 'ring', x: b.x, y: b.y, r: s.r, t: 0, dur: 0.3, color: '#ffb0a0', fill: 'rgba(255,80,60,0.3)' });
      if (Math.hypot(G.pl.x - b.x, G.pl.y - b.y) < s.r + G.pl.r) wSigHit(b, s.mult); };
  } else if (s.t === 'safe') {
    A.start = b => { const pl = G.pl; let p = null; for (let i = 0; i < 20 && !p; i++) { const a = Math.random() * Math.PI * 2, q = randomFloorNear(pl.x + Math.cos(a) * 200, pl.y + Math.sin(a) * 160, 30); if (Math.hypot(q.x - pl.x, q.y - pl.y) > 120) p = q; }
      b.sx = (p || pl).x; b.sy = (p || pl).y; tele('circle', 20 * TS, 15 * TS, 15 * TS, s.cast, '#ff5020'); tele('circle', b.sx, b.sy, s.r, s.cast, '#70ff80');
      UI.msg(`${b.name}：「${G.P.name}——！」全場火海，快躲進綠色的圈！`, '#ff9a6a'); };
    A.fire = b => { G.shake = 10; for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, r = rnd(60, 420); burst(G.pl.x + Math.cos(a) * r, G.pl.y + Math.sin(a) * r, '#ff7030', 4, 120); }
      G.fx.push({ k: 'ring', x: b.sx, y: b.sy, r: s.r, t: 0, dur: 0.5, color: '#a0ffa0', fill: 'rgba(120,255,140,0.18)' });
      if (Math.hypot(G.pl.x - b.sx, G.pl.y - b.sy) > s.r) wSigHit(b, s.mult); };
  } else if (s.t === 'lines') {
    A.start = b => { const a0 = Math.atan2(G.pl.y - b.y, G.pl.x - b.x); b.wl = { x: b.x, y: b.y, a: [] };
      for (let i = 0; i < s.n; i++) { const a = a0 + (i - (s.n - 1) / 2) * (s.spread || 0); b.wl.a.push(a); tele('line', b.x, b.y, s.w, s.cast, col(b), a, s.len); } };
    A.fire = b => { const L = b.wl; let hit = false; G.shake = 6;
      for (const a of L.a) { for (let d = 30; d < s.len; d += 60) burst(L.x + Math.cos(a) * d, L.y + Math.sin(a) * d, col(b), 3, 120); if (wInLine(L.x, L.y, a, s.len, s.w)) hit = true; }
      if (hit) wSigHit(b, s.mult); };
  } else if (s.t === 'circles') {
    A.start = b => { const pl = G.pl; b.wc = [];
      for (let i = 0; i < s.n; i++) { const a = i / s.n * Math.PI * 2; const p = s.ring ? { x: pl.x + Math.cos(a) * s.ring, y: pl.y + Math.sin(a) * s.ring * 0.8 } : (i === 0 ? { x: pl.x, y: pl.y } : randomFloorNear(pl.x + rnd(-150, 150), pl.y + rnd(-120, 120), 30));
        b.wc.push(p); tele('circle', p.x, p.y, s.r, s.cast, col(b)); } };
    A.fire = b => { let hit = false;
      for (const p of b.wc) {
        if (s.zone) G.zones.push({ x: p.x, y: p.y, r: s.r, dps: (b.dmg[0] + b.dmg[1]) / 2 * 0.5, t: 0, dur: s.zone, elem: bossEl(b) === 'phys' ? 'chaos' : bossEl(b) });
        else { G.fx.push({ k: 'ring', x: p.x, y: p.y, r: s.r, t: 0, dur: 0.3, color: col(b), fill: col(b) + '44' }); burst(p.x, p.y, col(b), 10, 160); }
        if (Math.hypot(G.pl.x - p.x, G.pl.y - p.y) < s.r + G.pl.r) hit = true;
      }
      if (hit && !s.zone) wSigHit(b, s.mult); else if (hit && G.world.wd && !(G.pl.iframe > 0)) G.world.wd.sigHit = true;
      G.shake = Math.max(G.shake, 4); };
  } else if (s.t === 'roar') {
    A.start = b => tele('circle', b.x, b.y, s.r, s.cast, '#ffd060');
    A.fire = b => { G.shake = 10; burst(b.x, b.y, '#ffe0a0', 40, 320); G.fx.push({ k: 'ring', x: b.x, y: b.y, r: s.r, t: 0, dur: 0.4, color: '#ffe0a0', fill: 'rgba(255,220,140,0.25)' });
      if (dist(b, G.pl) < s.r + G.pl.r) { wSigHit(b, s.mult); if (typeof knockPlayer === 'function') knockPlayer(Math.atan2(G.pl.y - b.y, G.pl.x - b.x), 380); } };
  }
  return A;
}
for (const id in WARDEN_P2) {
  const C = WARDEN_P2[id], base = BOSS_ABILITIES[BOSSES[id].ai || id] || [];
  BOSS_ABILITIES['w2_' + id] = [wSigAbility(C.sig), ...base.filter(a => !(C.drop || []).includes(a.id))];
}

// —— 信物（單件傳奇） ——
const W_FLAGS = { wKey: '殺死藍色、黃色精英時，牠的骸骨爬起來替你作戰 15 秒（最多 3 隻）', wAsh: '站著不動 1 秒後，腳下燒起灰燼火環：每 0.5 秒對身邊的敵人造成火焰傷害（你最大生命的 6%）',
  wWeb: '每 5 秒用蛛絲纏住身邊最近的 3 隻敵人：定住 1.5 秒（看守者 0.4 秒）並冰緩', wBell: '每走一段路，駝鈴響一次：震退身邊的敵人並造成物理傷害（你最大生命的 5%）',
  wHook: '每放 4 次技能，把附近最遠的一隻敵人拉到你面前並定住 0.6 秒（看守者不會被拉）', wBrew: '喝生命藥劑時腳下灑出解藥池 4 秒：你在裡面每秒回復 3% 生命，敵人進去會受到毒素傷害',
  wGuard: '每 3 秒替你擋下一發敵人的投射物', wWick: '身邊的敵人每秒受到閃電傷害（你最大生命的 4%；你的生命低於 30% 時加倍）', wWatch: '一下子被打掉超過 25% 生命時，生命倒轉回 2 秒前（冷卻 20 秒）' };
for (const f in W_FLAGS) { FLAG_STATS.add(f); STAT_TEXT[f] = () => W_FLAGS[f]; }
const W_SPARE = [{ id: 'u_w_collar', name: '大白的項圈', base: 'amulet0', flavor: '大白以前會舔我的手。', mods: [['minion_dmg_inc', 20, 30], ['minion_life_inc', 20, 30], ['life', 30, 50], ['move_inc', 5, 8]] },
  { id: 'u_w_crown', name: '生鏽的小王冠', base: 'helmet_es0', flavor: '爸爸說，我是公主。', mods: [['es', 30, 50], ['all_attr', 8, 12], ['res_cold', 20, 30]] }];
for (const [u, from] of W_SPARE.map(u => [u, 'beast']).concat(WARDEN_IDS.filter(id => WARDEN_TEXT[id].token).map(id => [WARDEN_TEXT[id].token, id])))   // v2.19.12 記下是哪一位看守者的信物（說明欄用）
  if (!UNIQUE_BY_ID[u.id] && BASE_BY_ID[u.base]) { const v = Object.assign({ boss: 'w_token', from }, u); UNIQUES.push(v); UNIQUE_BY_ID[u.id] = v; }
// 傳奇說明欄的來源一行（看守者信物沒有對應的首領掉落）
function uniqueSourceText(u) {
  if (!u || !u.boss) return '';
  if (u.boss === 'w_token') { const b = BOSSES[u.from]; return b ? `看守者的信物：在「${b.name}」的請託裡選擇和解時得到` : '看守者的信物'; }
  return BOSSES[u.boss] ? `首領專屬掉落：${BOSSES[u.boss].name}` : '';
}
function wTokenItem(id, ilvl) {
  if (id === 'beast') return typeof makeSetItem === 'function' ? makeSetItem('set_dabai_collar', ilvl) : makeUnique('u_w_collar', ilvl);
  const t = WARDEN_TEXT[id].token; return t && UNIQUE_BY_ID[t.id] ? makeUnique(t.id, ilvl) : null;
}
const WF = k => G.S && G.S.flags && G.S.flags[k];
const wPk = (el, v) => ({ d: { [el]: [v * 0.8, v] }, crit: 0, multi: 150, ail: {}, noBlast: true });
const wNear = (r, n) => G.mons.filter(m => !m.dead && !m.hidden && dist(m, G.pl) < r).sort((a, b) => dist(a, G.pl) - dist(b, G.pl)).slice(0, n);
Hook.on('kill', m => {
  if (!WF('wKey') || m.boss || m.summoned || (m.rarity !== 'magic' && m.rarity !== 'rare')) return;
  if (G.mins.filter(x => x.wKey).length >= 3) return;
  const L = Math.round(m.maxLife * 0.3), d = m.dmg || [5, 9];
  G.mins.push({ kind: 'min', mtype: 'skel', x: m.x, y: m.y, r: 10, life: L, maxLife: L, dmg: [d[0], d[1]], aps: 1.2, atkCD: 0.3, facing: 1, flash: 0, speed: 130, count: 1, wKey: G.time + 15 });
  burst(m.x, m.y, '#e8e0c0', 16, 160); G.texts.push({ x: m.x, y: m.y - 30, txt: '骸骨衛兵', color: '#e8e0c0', size: 12, t: 0, dur: 1 });
});
let _wHookN = 0;
Hook.on('cast', () => {
  if (!WF('wHook') || ++_wHookN % 4) return;
  const pl = G.pl, far = G.mons.filter(m => !m.dead && !m.hidden && dist(m, pl) < 340).sort((a, b) => dist(b, pl) - dist(a, pl))[0]; if (!far) return;
  G.fx.push({ k: 'bolt', pts: [{ x: pl.x, y: pl.y }, { x: far.x, y: far.y }], t: 0, dur: 0.25, color: '#e0f0ff' });
  if (!far.boss) { const a = Math.atan2(far.y - pl.y, far.x - pl.x), p = nearestFloor(pl.x + Math.cos(a) * 44, pl.y + Math.sin(a) * 44); far.x = p.x; far.y = p.y; }
  far.stagger = Math.max(far.stagger || 0, far.boss ? 0.2 : 0.6);
});
const WS = { still: 0, ash: 0, web: 0, bell: 0, guard: 0, wick: 0, watch: 0, hist: [], lx: 0, ly: 0, fl: null };
Hook.on('update', dt => {
  const pl = G.pl, S = G.S, w = G.world; if (!pl || !S || !w || G.dead || UI.paused()) return;
  for (let i = G.mins.length - 1; i >= 0; i--) if (G.mins[i].wKey && G.time > G.mins[i].wKey) { burst(G.mins[i].x, G.mins[i].y, '#e8e0c0', 8); G.mins.splice(i, 1); }
  const moved = Math.hypot(pl.x - WS.lx, pl.y - WS.ly); WS.lx = pl.x; WS.ly = pl.y;
  const fight = w.kind !== 'town', ML = S.maxLife;
  if (WF('wAsh') && fight) { WS.still = moved < 0.5 ? WS.still + dt : 0;
    if (WS.still > 1 && (WS.ash -= dt) <= 0) { WS.ash = 0.5; G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: 120, t: 0, dur: 0.3, color: '#ff9a50', fill: 'rgba(255,120,40,0.12)' });
      for (const m of wNear(120 + 20, 99)) hitMonster(m, wPk('fire', ML * 0.06), false, null); } }
  if (WF('wWeb') && fight && (WS.web -= dt) <= 0) { const ms = wNear(260, 3); if (ms.length) { WS.web = 5;
    for (const m of ms) { m.stagger = Math.max(m.stagger || 0, m.boss ? 0.4 : 1.5); m.chill = 2; m.chillAmt = Math.max(m.chillAmt || 0, 0.3); G.fx.push({ k: 'bolt', pts: [{ x: pl.x, y: pl.y }, { x: m.x, y: m.y }], t: 0, dur: 0.3, color: '#f0f0f0' }); } } }
  if (WF('wBell') && fight && (WS.bell += moved) > 320) { WS.bell = 0; Sfx.play('click');
    G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: 170, t: 0, dur: 0.35, color: '#ffe0a0', fill: 'rgba(255,220,140,0.12)' });
    for (const m of wNear(170, 99)) hitMonster(m, wPk('phys', ML * 0.05), false, pl, 2.5); }
  if (WF('wGuard') && (WS.guard -= dt) <= 0) { const p = G.projs.find(q => q.team !== 'ally' && Math.hypot(q.x - pl.x, q.y - pl.y) < 75);
    if (p) { WS.guard = 3; G.projs.splice(G.projs.indexOf(p), 1); burst(p.x, p.y, '#d8e0ff', 10, 140); G.texts.push({ x: pl.x + 20, y: pl.y - 30, txt: '卡爾擋下了', color: '#d8e0ff', size: 11, t: 0, dur: 0.7 }); } }
  if (WF('wWick') && fight && (WS.wick -= dt) <= 0) { WS.wick = 1; for (const m of wNear(180, 99)) hitMonster(m, wPk('light', ML * 0.04 * (pl.life < ML * 0.3 ? 2 : 1)), false, null); }
  // 解藥池：喝生命藥劑（生命藥劑的充能變少）
  const lf = (pl.fl || []).reduce((s, f) => s + (f && FLASKS[f.type] && FLASKS[f.type].heal === 'life' ? f.c : 0), 0);
  if (WF('wBrew') && fight && WS.fl != null && lf < WS.fl - 0.01) G.azones.push({ sid: 'wbrew', x: pl.x, y: pl.y, r: 90, t: 0, dur: 4, tick: 0.5, next: 0, pk: wPk('chaos', ML * 0.04), color: '#a0ff60', wBrew: true });
  WS.fl = lf;
  for (const z of G.azones) if (z.wBrew && Math.hypot(pl.x - z.x, pl.y - z.y) < z.r) pl.life = Math.min(ML, pl.life + ML * 0.03 * dt);
  // 懷錶：記 2 秒內的生命
  if (WF('wWatch')) { WS.watch -= dt; const h = WS.hist; h.push({ t: G.time, v: pl.life }); while (h.length && G.time - h[0].t > 2) h.shift();
    const prev = h.length > 1 ? h[h.length - 2].v : pl.life;
    if (WS.watch <= 0 && prev - pl.life > ML * 0.25 && pl.life > 0) { WS.watch = 20; pl.life = Math.min(ML, Math.max(...h.map(x => x.v))); h.length = 0; burst(pl.x, pl.y, '#c8b0ff', 30, 200); UI.msg('國王的懷錶：時間倒轉了', '#c8b0ff'); } }
});
// 燈芯的光圈
Hook.on('drawWorld', g => { if (!WF('wWick') || !G.pl || G.world.kind === 'town') return; const pl = G.pl;
  g.save(); g.globalAlpha = 0.18 + 0.06 * Math.sin(G.time * 3); g.strokeStyle = '#fff070'; g.lineWidth = 2; g.beginPath(); g.ellipse(pl.x, pl.y + 6, 180, 90, 0, 0, Math.PI * 2); g.stroke(); g.restore(); });
