// =============================================================
//  遊戲引擎：地圖生成、怪物 AI、戰鬥、掉落、存檔、主迴圈
// =============================================================
const TS = 32, VW = 960, VH = 540;
const SAVE_KEY = 'yiwang_shenyuan_save_v1';
const G = {
  state: 'menu', P: null, S: null, calc: {}, world: null, pl: null,
  mons: [], mins: [], projs: [], fx: [], parts: [], loot: [], texts: [], zones: [], teles: [], echoQ: [], slotCalc: [], strikes: [], azones: [], target: null, targetT: 0,
  time: 0, dead: false, bossBar: null, msgs: [], throttle: {}, shake: 0, showNormal: true,
};
const input = { keys: {}, imeKeys: {}, mx: 0, my: 0, wx: 0, wy: 0, l: false, r: false };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 地圖格子 ----------
function solidTile(tx, ty) { const w = G.world; if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) return true; return w.grid[ty * w.W + tx] === 0; }
function solidAt(x, y) { return solidTile(Math.floor(x / TS), Math.floor(y / TS)); }
// v2.16.2 角色面向的方向：正在按方向鍵就照按鍵；沒按就照最後移動的方向；都沒有就照臉朝左或右
function faceDir() {
  const pl = G.pl, k = input.keys; let mx = 0, my = 0;
  if (k.KeyW || k.ArrowUp) my -= 1; if (k.KeyS || k.ArrowDown) my += 1; if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1;
  if (input.joy && Math.hypot(input.joy.x, input.joy.y) > 0.15) { mx = input.joy.x; my = input.joy.y; }
  if (!mx && !my) { mx = pl.mdx || pl.facing || 1; my = pl.mdy || 0; }
  const L = Math.hypot(mx, my) || 1; return { x: mx / L, y: my / L };
}
function blockedCircle(x, y, r) {
  const s = r * 0.8;
  return solidAt(x - s, y - s) || solidAt(x + s, y - s) || solidAt(x - s, y + s) || solidAt(x + s, y + s)
    || solidAt(x, y - s) || solidAt(x, y + s) || solidAt(x - s, y) || solidAt(x + s, y);
}
function moveEnt(e, dx, dy) {
  if (!blockedCircle(e.x + dx, e.y, e.r)) e.x += dx;
  if (!blockedCircle(e.x, e.y + dy, e.r)) e.y += dy;
}
function los(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 12);
  for (let i = 1; i < n; i++) if (solidAt(ax + (bx - ax) * i / n, ay + (by - ay) * i / n)) return false;
  return true;
}
// v2.13.9 地形分兩種：走路被擋（solidAt）、投射物被擋（shotWallAt）
//   投射物飛得過去：水、岩漿、虛空裂隙（地上的洞），還有矮的障礙物：岩石、骨堆、灌木
//   投射物飛不過去：牆、樹、枯樹、石柱、冰晶、石筍、巨菇、虛空水晶、仙人掌（比人高的東西）
const SHOT_PASS = new Set([2, 8, 14, 3, 7, 11]);
function shotWallAt(x, y) {
  const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
  if (!solidTile(tx, ty)) return false;
  const w = G.world, dv = w && w.deco && tx >= 0 && ty >= 0 && tx < w.W && ty < w.H ? w.deco[ty * w.W + tx] : 0;
  return !SHOT_PASS.has(dv);
}
function shotLos(ax, ay, bx, by) {   // 投射物、法術看不看得到（隔著岩漿可以射）
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 12);
  for (let i = 1; i < n; i++) if (shotWallAt(ax + (bx - ax) * i / n, ay + (by - ay) * i / n)) return false;
  return true;
}
// 指定地點的法術（荊棘綻放、暴風雪、隕石）：從角色往滑鼠方向走，碰到擋投射物的牆就停在牆前面（不能隔牆施放）
function castPoint(ax, ay, ca, sa, d) {
  let x = ax, y = ay;
  for (let s = 8; s <= d; s += 8) { const nx = ax + ca * s, ny = ay + sa * s; if (shotWallAt(nx, ny)) break; x = nx; y = ny; }
  return { x, y };
}

// ---------- 地圖生成：房間 + 走廊 ----------
function genMap(tier) {
  const W = 84, H = 64, grid = new Uint8Array(W * H);
  const rooms = [];
  const carve = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i > 0 && j > 0 && i < W - 1 && j < H - 1) grid[j * W + i] = 1; };
  const overlaps = r => rooms.some(o => r.x < o.x + o.w + 3 && r.x + r.w + 3 > o.x && r.y < o.y + o.h + 3 && r.y + r.h + 3 > o.y);
  const flipX = Math.random() < 0.5, flipY = Math.random() < 0.5;
  const fx = (x, w) => flipX ? W - x - w : x, fy = (y, h) => flipY ? H - y - h : y;
  const start = { x: fx(3, 9), y: fy(3, 8), w: 9, h: 8 };
  const boss = { x: fx(W - 21, 17), y: fy(H - 18, 15), w: 17, h: 15 };
  rooms.push(start, boss);
  let tries = 0;
  while (rooms.length < 14 && tries < 500) {
    tries++;
    const w = rint(7, 13), h = rint(6, 10);
    const r = { x: rint(2, W - w - 2), y: rint(2, H - h - 2), w, h };
    if (!overlaps(r)) rooms.push(r);
  }
  rooms.forEach(r => carve(r.x, r.y, r.w, r.h));
  const center = r => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) });
  const carveH = (x1, x2, y) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) carve(x, y - 1, 1, 3); };
  const carveV = (y1, y2, x) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) carve(x - 1, y, 3, 1); };
  const corridor = (a, b) => {
    const A = center(a), Bc = center(b);
    if (Math.random() < 0.5) { carveH(A.x, Bc.x, A.y); carveV(A.y, Bc.y, Bc.x); }
    else { carveV(A.y, Bc.y, A.x); carveH(A.x, Bc.x, Bc.y); }
  };
  const others = rooms.filter(r => r !== start && r !== boss);
  const order = [start], rem = [...others];
  let cur = start;
  while (rem.length) {
    let bi = 0, bd = 1e9;
    rem.forEach((r, i) => { const a = center(cur), b = center(r); const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y); if (d < bd) { bd = d; bi = i; } });
    cur = rem.splice(bi, 1)[0]; order.push(cur);
  }
  order.push(boss);
  for (let i = 0; i < order.length - 1; i++) corridor(order[i], order[i + 1]);
  for (let k = 0; k < 2; k++) { const a = pick(others), b = pick(others); if (a !== b) corridor(a, b); }
  const theme = THEMES[(tier - 1) % THEMES.length];
  return { kind: 'map', W, H, grid, rooms, start, boss, others, tier, theme, mlvl: mapLevel(tier), grade: mapGrade(tier), mm: aggMods([]),
    name: tier >= DEEP_TIER ? `深層夢境 第 ${tier} 夜・${theme.name}` : `第 ${tier} 夜之夢・${theme.name}` };
}
// 把夢境詞綴加總成一組倍率
function aggMods(ids) {
  const A = { ids: ids.slice(), life: 1, dmg: 1, spd: 1, res: 0, crit: 0, elite: 1, pack: 1, regen: 1, flask: 1, addElemAll: false, bossMult: 1, q: 0, r: 0 };
  for (const id of ids) {
    const m = MAP_MOD_BY_ID[id]; if (!m) continue;
    for (const k of ['life', 'dmg', 'spd', 'elite', 'pack', 'regen', 'flask', 'bossMult']) if (m[k]) A[k] *= m[k];
    if (m.res) A.res += m.res; if (m.crit) A.crit += m.crit; if (m.addElemAll) A.addElemAll = true;
    A.q += m.q; A.r += m.r;
  }
  return A;
}
function rollMapMods(n) {
  const pool = MAP_MODS.filter(m => !m.rule).map(m => m.id), out = [];   // v2.12 世界規則（rule）不會被骰到，由深度決定
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
// 首領競技場：一個大房間
function genArena(bossId) {
  const W = 40, H = 32, grid = new Uint8Array(W * H);
  const room = { x: 5, y: 4, w: 30, h: 24 };
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) grid[y * W + x] = 1;
  [[11, 10], [28, 10], [11, 21], [28, 21]].forEach(([x, y]) => { grid[y * W + x] = 0; grid[y * W + x + 1] = 0; });
  const ti = bossId === 'keeper' ? -1 : NIGHTMARES[Object.keys(NIGHTMARES).find(k => NIGHTMARES[k].boss === bossId)].theme;
  const theme = ti < 0 ? { id: 'void', name: '夢的盡頭', floor: ['#1e1828', '#1a1424', '#221c2c'], wall: '#08060c', wallTop: '#4a3a6a', light: '#c8b0ff', monsters: ['skeleton'], boss: 'keeper' }
    : Object.assign({}, THEMES[ti], { boss: bossId });
  return { kind: 'map', arena: bossId, W, H, grid, rooms: [room], start: { x: 17, y: 24, w: 6, h: 3 }, boss: room, others: [], tier: 0, theme,
    mlvl: ARENA_LEVEL[bossId], grade: 6, mm: aggMods([]), name: `${BOSSES[bossId].name}的夢境` };
}
// 營地（每一章一個，資料在 story.js 的 HUBS）
function genTown(hubId) {
  const hub = HUB_BY_ID[hubId] || HUBS[0];
  const W = 30, H = 20, grid = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) grid[y * W + x] = 1;
  [[6, 5], [23, 5], [6, 14], [23, 14]].forEach(([x, y]) => { grid[y * W + x] = 0; });
  const theme = { id: 'town_' + hub.id, name: hub.name, floor: hub.floor, wall: hub.wall, wallTop: hub.wallTop, light: hub.light };
  return { kind: 'town', hub: hub.id, W, H, grid, theme, mlvl: 1, name: hub.name, portal: { x: 15 * TS, y: 6 * TS }, spawn: { x: 15 * TS, y: 13 * TS },
    retPortal: { x: 20 * TS, y: 6 * TS },
    // panel：按 F 時打開的介面
    npcs: hub.npcs.map(n => Object.assign({}, n, { x: n.at[0] * TS, y: n.at[1] * TS })) };
}

// 整張地圖先畫好存起來，之後每格直接貼
function buildWorldCanvas(w) {
  const c = document.createElement('canvas'); c.width = w.W * TS; c.height = w.H * TS;
  const g = c.getContext('2d');
  const th = w.theme;
  for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
    const solid = w.grid[y * w.W + x] === 0;
    if (!solid) g.drawImage(getFloorTile(th, hash2(x, y) % 6), x * TS, y * TS); // 地板：6 種變化（scene.js）
    else { g.fillStyle = th.wall; g.fillRect(x * TS, y * TS, TS, TS); }
  }
  paintWorldDetail(g, w); // 牆面、牆邊陰影、地上小東西（scene.js）
  w.canvas = c;
  // 小地圖
  const mc = document.createElement('canvas'); mc.width = w.W; mc.height = w.H;
  w.mini = mc; w.miniG = mc.getContext('2d');
  w.explored = new Uint8Array(w.W * w.H);
  if (w.kind === 'town') w.explored.fill(1), paintMiniAll(w);
}
function paintMiniAll(w) { for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) paintMini(w, x, y); }
function paintMini(w, x, y) {
  const solid = w.grid[y * w.W + x] === 0;
  if (solid) { // 只畫邊界牆
    let edge = false;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < w.W && yy < w.H && w.grid[yy * w.W + xx] === 1) edge = true; }
    if (!edge) return;
    w.miniG.fillStyle = 'rgba(200,190,170,0.9)';
  } else w.miniG.fillStyle = 'rgba(90,80,70,0.55)';
  w.miniG.fillRect(x, y, 1, 1);
}
function updateExplore() {
  const w = G.world; if (w.kind === 'town') return;
  const px = Math.floor(G.pl.x / TS), py = Math.floor(G.pl.y / TS), R = 10;
  for (let y = py - R; y <= py + R; y++) for (let x = px - R; x <= px + R; x++) {
    if (x < 0 || y < 0 || x >= w.W || y >= w.H) continue;
    if ((x - px) ** 2 + (y - py) ** 2 > R * R) continue;
    const i = y * w.W + x;
    if (!w.explored[i]) { w.explored[i] = 1; paintMini(w, x, y); }
  }
}

// ---------- 路徑（簡單 BFS 流場，讓怪物會繞牆追你） ----------
function updateFlow() {
  const w = G.world;
  if (!w.flow) w.flow = new Int16Array(w.W * w.H);
  const f = w.flow; f.fill(-1);
  const sx = Math.floor(G.pl.x / TS), sy = Math.floor(G.pl.y / TS);
  const q = [sx + sy * w.W]; f[q[0]] = 0;
  let head = 0;
  while (head < q.length) {
    const i = q[head++], x = i % w.W, y = (i / w.W) | 0, d = f[i];
    if (d > 40) continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of nb) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w.W || ny >= w.H) continue;
      const ni = nx + ny * w.W;
      if (w.grid[ni] === 0 || f[ni] !== -1) continue;
      f[ni] = d + 1; q.push(ni);
    }
  }
}
function flowDir(e) {
  const w = G.world; if (!w.flow) return null;
  const tx = Math.floor(e.x / TS), ty = Math.floor(e.y / TS);
  let best = null, bd = w.flow[tx + ty * w.W];
  if (bd < 0) bd = 9999;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = tx + dx, ny = ty + dy;
    if (nx < 0 || ny < 0 || nx >= w.W || ny >= w.H) continue;
    if (dx && dy && (solidTile(tx + dx, ty) || solidTile(tx, ty + dy))) continue;
    const v = w.flow[nx + ny * w.W];
    if (v >= 0 && v < bd) { bd = v; best = [nx, ny]; }
  }
  if (!best) return null;
  const cx = best[0] * TS + TS / 2, cy = best[1] * TS + TS / 2;
  const d = Math.hypot(cx - e.x, cy - e.y) || 1;
  return [(cx - e.x) / d, (cy - e.y) / d];
}
function steerToward(e, tx, ty, speed, dt, useFlow) {
  let dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  let vx = dx / d, vy = dy / d;
  if (useFlow && !los(e.x, e.y, tx, ty)) { const f = flowDir(e); if (f) { vx = f[0]; vy = f[1]; } }
  moveEnt(e, vx * speed * dt, vy * speed * dt);
  if (Math.abs(vx) > 0.2) e.facing = vx > 0 ? 1 : -1;
}

// ---------- 怪物 ----------
function makeMonster(type, x, y, mlvl, rarity, theme) {
  const d = MONSTERS[type];
  const m = { kind: 'mon', type, def: d, x, y, r: d.r * (rarity === 'rare' ? 1.3 : 1), rarity, mlvl, mods: [], name: d.name,
    speed: d.speed * rnd(0.9, 1.1), aspd: d.aspd, range: d.range, regen: 0, vamp: false, addElem: null,
    atkCD: Math.random(), state: 'idle', wind: 0, chill: 0, chillAmt: 0.3, flash: 0, facing: 1, aggro: false,
    res: Object.assign({ fire: 0, cold: 0, light: 0, chaos: 0 }, d.res), armour: (d.armour || 0) * (1 + 0.15 * (mlvl - 1)) * (rarity === 'rare' ? 1.5 : 1),
    critCh: { normal: 5, magic: 7, rare: 10 }[rarity], poisons: [],
    tint: (PAL_TINT[theme.id] || {})[d.sprite] || null, scale: (d.scale || 2) + (rarity === 'rare' ? 1 : 0) };
  if (d.vampire) m.vamp = true;
  let lifeMult = { normal: 1, magic: 1.8, rare: 3.6 }[rarity], dmgMult = { normal: 1, magic: 1.15, rare: 1.35 }[rarity];
  const nm = rarity === 'magic' ? rint(1, 2) : rarity === 'rare' ? rint(2, 3) : 0;
  const pool = MONSTER_MODS.filter(x => !x.minLvl || mlvl >= x.minLvl);   // v2.7 新的精英能力有等級門檻
  for (let i = 0; i < nm; i++) {
    const mod = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    m.mods.push(mod.name);
    if (mod.speed) m.speed *= mod.speed;
    if (mod.aspd) m.aspd *= mod.aspd;
    if (mod.dmg) dmgMult *= mod.dmg;
    if (mod.life) lifeMult *= mod.life;
    if (mod.regen) m.regen = mod.regen;
    if (mod.vamp) m.vamp = true;
    if (mod.addElem) m.addElem = mod.addElem;
  }
  if (rarity === 'rare') m.name = pick(RARE_MONSTER_NAMES1) + pick(RARE_MONSTER_NAMES2);
  // 夢境詞綴
  const mm = (G.world && G.world.mm) || aggMods([]);
  // v1.4：深層夢境每多一夜，怪物生命與傷害再 +4%
  const deep = depthScale((G.world && G.world.tier) || 0); lifeMult *= deep; dmgMult *= deep;   // v2.12 第 11～20 夜每夜 +4%、第 21～40 夜每夜 +2%（depths.js）
  lifeMult *= MON_LIFE_MULT; dmgMult *= MON_DMG_MULT;
  // v2.12.5 新手保護：第 1 夜怪物傷害 −30%、生命 −25%，遠程怪出手慢 45%；第 2 夜 −15%、−10%、慢 25%；第 3～4 夜遠程怪慢 10%
  const tr = (G.world && G.world.kind === 'map' && G.world.tier) || 0;
  if (tr === 1) { dmgMult *= 0.7; lifeMult *= 0.75; } else if (tr === 2) { dmgMult *= 0.85; lifeMult *= 0.9; }
  if (d.ranged && tr >= 1 && tr <= 4) m.aspd *= tr === 1 ? 0.55 : tr === 2 ? 0.75 : 0.9;
  lifeMult *= mm.life; dmgMult *= mm.dmg; m.speed *= mm.spd; m.aspd *= mm.spd; m.critCh += mm.crit;
  for (const k in m.res) m.res[k] = Math.min(90, m.res[k] + mm.res);
  if (mm.addElemAll && !m.addElem) m.addElem = Math.random() < 0.5 ? 'fire' : 'cold';
  m.maxLife = Math.round(d.life * 0.8 * monLifeScale(mlvl) * lifeMult); m.life = m.maxLife;
  const s = monDmgScale(mlvl) * dmgMult;
  m.dmg = [d.dmg[0] * s, d.dmg[1] * s];
  return m;
}
function makeBoss(id, x, y, mlvl) {
  const d = BOSSES[id];
  const b = { kind: 'mon', boss: id, def: d, x, y, r: d.r, rarity: 'boss', mlvl, mods: [], name: d.name, speed: d.speed,
    state: 'idle', chill: 0, chillAmt: 0.3, flash: 0, facing: -1, aggro: false, cds: {}, casting: null, scale: d.scale || 3, regen: 0,
    res: Object.assign({ fire: 0, cold: 0, light: 0, chaos: 0 }, d.res), armour: (d.armour || 0) * (1 + 0.15 * (mlvl - 1)), critCh: 8, poisons: [] };
  const mm = (G.world && G.world.mm) || aggMods([]);
  b.maxLife = Math.round(d.life * 0.55 * monLifeScale(mlvl) * mm.bossMult * MON_LIFE_MULT * BOSS_LIFE_EXTRA); b.life = b.maxLife;
  const s = monDmgScale(mlvl) * mm.bossMult * (d.nightmare ? 1.1 : 1) * MON_DMG_MULT * BOSS_EXTRA;
  b.dmg = [d.dmg[0] * s, d.dmg[1] * s];
  if (d.tint) b.tint = d.tint;
  b.spriteName = d.sprite;
  if (id === 'keeper') { // 守門人＝過去的你：用你的職業外觀，染成暗影色
    b.spriteName = G.P.cls; b.tint = {};
    for (const k in SPRITE_PAL[G.P.cls]) if (k !== 'k') b.tint[k] = ['#3a2a5a', '#5a4a8a', '#2a1a3a', '#8070b0'][k.charCodeAt(0) % 4];
    b.def = Object.assign({}, d, { sprite: G.P.cls });
  }
  return b;
}
function randomFloorNear(cx, cy, rad) {
  for (let i = 0; i < 30; i++) {
    const x = cx + rnd(-rad, rad), y = cy + rnd(-rad, rad);
    if (!blockedCircle(x, y, 14)) return { x, y };
  }
  return nearestFloor(cx, cy);   // v2.14.4 附近都是牆：往外一圈一圈找最近的空地（以前直接回傳原點，傳送門、怪物會出現在牆裡）
}
// 離 (x, y) 最近、站得下的空地（找不到就回傳原點）
function nearestFloor(x, y, maxR = 640) {
  if (!blockedCircle(x, y, 14)) return { x, y };
  for (let r = 16; r <= maxR; r += 16) {
    const n = Math.max(8, Math.round(r / 6));
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (!blockedCircle(px, py, 14)) return { x: px, y: py }; }
  }
  return { x, y };
}
function spawnPack(cx, cy, w) {
  // v1.4：越後面的夜，怪物群越大、菁英越多（第 10 夜約 1.45 倍數量，最多 2.2 倍）
  const tp = Math.max(0, (w.tier || 1) - 1);
  // v2.5.5 前期精英怪少一點：第 1 夜只有原本的 35%，之後每夜 +13%，第 6 夜恢復正常
  const early = Math.min(1, 0.35 + 0.13 * tp);
  const r = Math.random(), el = w.mm.elite * (1 + Math.min(1, tp * 0.04)) * early * (1 + atlasVal('elite') / 100);   // v2.11 終局盤
  const rare = r < 0.14 * el ? 1 : 0, magic = r >= 0.14 * el && r < 0.4 * el ? rint(1, 2) : 0;
  let t1 = pick(w.theme.monsters), t2 = pick(w.theme.monsters);
  // v2.12.5 前期遠程怪少一點：第 1～4 夜一群怪的主力一定是近戰（遠程最多佔三分之一）；第 1 夜有 70%、第 2 夜有 40% 的怪群完全沒有遠程
  if ((w.tier || 9) <= 4) {
    const melee = w.theme.monsters.filter(k => !MONSTERS[k].ranged);
    if (melee.length) { if (MONSTERS[t1].ranged) t1 = pick(melee); if (MONSTERS[t2].ranged && Math.random() < (w.tier === 1 ? 0.7 : w.tier === 2 ? 0.4 : 0)) t2 = pick(melee); }
  }
  const dens = (w.tier || 1) >= DEEP_TIER ? 1.5 + Math.min(2, ((w.tier || 1) - 10) * 0.1) : 1 + Math.min(1.2, tp * 0.05);   // v2.10 深層夢境怪群更大：第 11 夜 1.6 倍、第 20 夜 2.5 倍、第 30 夜起 3.5 倍
  const n = Math.max(2, Math.round(rint(4, 7) * w.mm.pack * dens * (1 + atlasVal('pack') / 100) * (w.tier === 1 ? 0.65 : w.tier === 2 ? 0.85 : 1)));   // v2.12.5 第 1 夜一群怪少 35%、第 2 夜少 15%
  for (let i = 0; i < n; i++) {
    const rarity = i < rare ? 'rare' : i < rare + magic ? 'magic' : 'normal';
    const p = randomFloorNear(cx, cy, 60);
    const lv = Math.max(1, w.mlvl - rint(0, 2) + MON_LVL_BONUS[rarity]);   // v2.5.4 一般 −2～0、藍 +1、黃 +2
    G.mons.push(makeMonster(i % 3 === 2 ? t2 : t1, p.x, p.y, lv, rarity, w.theme));
  }
}
function populate(w) {
  const rc = r => ({ x: (r.x + r.w / 2) * TS, y: (r.y + r.h / 2) * TS });
  for (const r of w.others) {
    const packs = r.w * r.h > 80 ? 2 : 1;
    for (let i = 0; i < packs; i++) spawnPack((r.x + rnd(1.5, r.w - 1.5)) * TS, (r.y + rnd(1.5, r.h - 1.5)) * TS, w);
  }
  const s = rc(w.start);
  let placed = 0, tries = 0;
  while (placed < 6 && tries < 300) {
    tries++;
    const x = rint(1, w.W - 2), y = rint(1, w.H - 2);
    if (w.grid[y * w.W + x] !== 1) continue;
    const px = x * TS + 16, py = y * TS + 16;
    if (Math.hypot(px - s.x, py - s.y) < 500) continue;
    const inBoss = x >= w.boss.x && x < w.boss.x + w.boss.w && y >= w.boss.y && y < w.boss.y + w.boss.h;
    if (inBoss) continue;
    spawnPack(px, py, w); placed++;
  }
  const bc = rc(w.boss);
  G.mons.push(makeBoss(w.theme.boss, bc.x, bc.y, w.mlvl + MON_LVL_BONUS.boss));   // v2.5.4 首領 +3
}
function inBossRoom(e) {
  const w = G.world; if (!w.boss) return false;
  const b = w.boss;
  return e.x > b.x * TS && e.x < (b.x + b.w) * TS && e.y > b.y * TS && e.y < (b.y + b.h) * TS;
}

// ---------- 世界切換 ----------
function resetEntities() { G.mons = []; G.projs = []; G.fx = []; G.parts = []; G.loot = []; G.texts = []; G.zones = []; G.teles = []; G.echoQ = []; G.strikes = []; G.azones = []; G.target = null; G.bossBar = null; }
function goTown(viaPortal) {
  resetEntities();
  const P = G.P, hubId = P.hub || 'cell';
  G.towns = G.towns || {};
  if (!G.towns[hubId]) { G.towns[hubId] = genTown(hubId); buildWorldCanvas(G.towns[hubId]); }
  G.town = G.towns[hubId];
  G.world = G.town;
  const firstVisit = !P.hubs[hubId];
  P.hubs[hubId] = true;
  if (firstVisit && HUB_BY_ID[hubId].act > 1) storyBeat('act' + HUB_BY_ID[hubId].act);
  const at = viaPortal && G.savedMap ? { x: G.world.retPortal.x, y: G.world.retPortal.y + 40 } : G.world.spawn;
  G.pl.x = at.x; G.pl.y = at.y; G.pl.portalLock = true;
  fullHeal();
  G.mins.forEach(m => { m.x = G.pl.x + rnd(-30, 30); m.y = G.pl.y + 30; });
  G.dead = false;
  if (G.fromMap) UI.refreshShop(true);
  G.fromMap = false;
  UI.msg(G.savedMap ? `你回到了${G.town.name}。站到右邊的藍色門前按 F 可以回到剛才的夢。` : `你回到了${G.town.name}。站到金色的「夢之門」前按 F 入夢，也可以傳送到其他營地。`, '#e8d8a0');
  saveGame();
}
// 從主線地圖回來時，回到那一章的營地
// v2.7.10 回城一律回到「出發的那個營地」；打到新章節的地圖時，只把新營地「開放」，要去再從夢之門的營地傳送過去
function setHubFromWorld(w) {
  if (!(w && w.kind === 'map' && w.tier && w.tier <= ENDING_TIER)) return;
  const P = G.P, nh = hubForTier(w.tier); P.hubsOpen = P.hubsOpen || {};
  if (nh !== P.hub && !P.hubs[nh] && !P.hubsOpen[nh]) { P.hubsOpen[nh] = true; const hb = HUB_BY_ID[nh]; if (hb) UI.msg(`新的營地「${hb.name}」開放了：在夢之門的「營地傳送」可以過去`, '#ffd36a'); }
}
function travelHub(id) { if (!G.P.hubs[id] && !(G.P.hubsOpen || {})[id]) return; G.P.hub = id; UI.showMapDevice(false); goTown(); }
// 劇情：每段只播一次
function storyBeat(key) {
  const P = G.P;
  if (!STORY[key] || P.story.seen[key]) return;
  P.story.seen[key] = true;
  UI.queueStory(key);
  saveGame();
}
// 從地圖走傳送門回城：地圖狀態保留，之後可以回去
function leaveMapToTown() {
  const w = G.world;
  if (w && w.portal && w.portal.toHub) { const P = G.P; P.hub = w.portal.toHub; P.hubsOpen = P.hubsOpen || {}; P.hubsOpen[P.hub] = true; G.fromMap = true; G.savedMap = null; return goTown(true); }   // v2.15.2 看守者倒下後的門：去新營地
  G.savedMap = { world: w, mons: G.mons, loot: G.loot, bossBar: G.bossBar };
  G.fromMap = true;
  setHubFromWorld(w);
  goTown(true);
}
function resumeMap() {
  const s = G.savedMap; if (!s) return;
  resetEntities();
  G.world = s.world; G.mons = s.mons; G.loot = s.loot;
  G.bossBar = s.bossBar && !s.bossBar.dead ? s.bossBar : null;
  G.savedMap = null;
  const p = G.world.portal;
  G.pl.x = p.x; G.pl.y = p.y + 36; G.pl.portalLock = true;
  G.mins.forEach(m => { m.x = G.pl.x + rnd(-30, 30); m.y = G.pl.y + rnd(-30, 30); });
  G.world.flowT = 0;
  UI.closeTownPanels();
  UI.msg(`回到 ${G.world.name}`, '#9fd0ff');
}
function enterMap(tier) {
  if (G.savedMap) UI.msg('舊地圖的傳送門關閉了。', '#c8b890');
  G.savedMap = null;
  G.fromMap = true;
  resetEntities();
  G.world = genMap(tier);
  qc(G.P).entered = Math.max(qc(G.P).entered, tier);
  // 深層夢境：套用這一層目前的夢境詞綴，進去之後重新骰下一次的詞綴
  if (tier >= DEEP_TIER) {
    const ids = deepMods(tier).concat(depthRules(tier));   // v2.12 第 21 夜起再加上世界規則（depths.js）
    G.world.mm = aggMods(ids);
    G.P.deepMods[tier] = rollMapMods(2); depthRulesReroll(tier);
    storyBeat('deepDream');
  }
  buildWorldCanvas(G.world);
  const s = G.world.start;
  G.pl.x = (s.x + s.w / 2) * TS; G.pl.y = (s.y + s.h / 2) * TS;
  populate(G.world);
  G.mins.forEach(m => { m.x = G.pl.x + rnd(-30, 30); m.y = G.pl.y + rnd(-30, 30); });
  G.world.flowT = 0;
  UI.showMapDevice(false);
  UI.msg(`進入 ${G.world.name}。看守者：${BOSSES[G.world.theme.boss].name}`, '#ffcf70');
  storyBeat('firstDream');
  for (const t of [4, 7, 10]) if (tier >= t) storyBeat('tier' + t);
}
function deepMods(tier) {
  const P = G.P;
  if (!P.deepMods[tier]) P.deepMods[tier] = rollMapMods(2);
  return P.deepMods[tier];
}
// 夢魘首領／守門人：進入競技場
function enterArena(bossId) {
  const P = G.P;
  if (bossId === 'keeper') {
    if (!['bone', 'ash', 'frost'].every(k => P.keys[k] > 0)) return UI.msg('需要骨、灰、冰三把鑰匙', '#ff9a9a');
    ['bone', 'ash', 'frost'].forEach(k => P.keys[k]--);
  } else {
    const fk = Object.keys(NIGHTMARES).find(k => NIGHTMARES[k].boss === bossId);
    if ((P.frags[fk] || 0) < FRAG_NEED) return UI.msg(`需要 ${FRAG_NEED} 片${NIGHTMARES[fk].frag}`, '#ff9a9a');
    P.frags[fk] -= FRAG_NEED;
  }
  if (G.savedMap) UI.msg('舊地圖的傳送門關閉了。', '#c8b890');
  G.savedMap = null; G.fromMap = true;
  resetEntities();
  G.world = genArena(bossId); buildWorldCanvas(G.world);
  const s = G.world.start;
  G.pl.x = (s.x + s.w / 2) * TS; G.pl.y = (s.y + 1) * TS;
  G.mons.push(makeBoss(bossId, 20 * TS, 11 * TS, G.world.mlvl + MON_LVL_BONUS.boss));
  G.mins.forEach(m => { m.x = G.pl.x + rnd(-30, 30); m.y = G.pl.y + rnd(-30, 30); });
  G.world.flowT = 0;
  UI.showMapDevice(false);
  UI.msg(`你走進了 ${BOSSES[bossId].name} 的夢境。`, '#ff9a6a');
  saveGame();
}
function fullHeal() {
  const S = G.S, pl = G.pl;
  pl.life = S.maxLife; pl.mana = S.maxMana; pl.es = S.maxES; pl.ail = { poison: [] }; pl.poise = S.poiseT; pl.stun = 0; // 回營地：異常狀態清掉
  pl.fl.forEach(f => { if (f) f.c = f.max; });
}

// ---------- 角色建立／存檔 ----------
function newCharacter(cls, name) {
  const c = CLASSES[cls];
  const P = { v: 1, name, cls, lvl: 1, xp: 0, tree: [c.start],
    equip: { weapon: null, offhand: null, helmet: null, body: null, gloves: null, boots: null, amulet: null, ring1: null, ring2: null, belt: null },
    inv: Array(60).fill(null), cur: { portal: 5, transmute: 3, alter: 2, aug: 2, alch: 1, chaos: 0, exalt: 0, scour: 1 },
    skills: [...c.skills], maxTier: 1, bossKills: {}, kills: 0 };
  P.equip.weapon = makeItem(c.weapon + '0', 'normal', 1);
  P.equip.body = makeItem({ warrior: 'body_ar0', ranger: 'body_ev0', mage: 'body_es0', samurai: 'body_ev0', druid: 'body_ev0', summoner: 'body_es0' }[cls], 'normal', 1);
  const off = { warrior: 'shield0', ranger: 'quiver0', mage: 'focus0', summoner: 'focus0' }[cls];
  if (off) P.equip.offhand = makeItem(off, 'normal', 1);
  migrateSave(P);
  const st = STARTER_SUPPORTS[cls];
  P.links[0] = [st[0]];
  P.supports[st[1]] = 1;
  P.jewels = { ruby_1: 2, amethyst_1: 1 }; // 開局送幾顆碎裂珠寶試用
  P.flaskSlots = [makeFlask('life', 1), makeFlask('life', 1), makeFlask('mana', 1), makeFlask('speed', 1)]; // 開局藥劑：生命×2、魔力、迅捷
  return P;
}
// 舊存檔補上新欄位
function migrateSave(P) {
  if (!P.supports) P.supports = {};
  if (!P.links) P.links = [[], [], [], [], []];
  for (const k in CURRENCY) if (P.cur[k] == null) P.cur[k] = k === 'portal' ? 5 : 0;
  if (!P.shards) P.shards = {};
  if (!P.lore) P.lore = {};
  if (!P.story) P.story = { seen: {} };
  if (!P.frags) P.frags = { bone: 0, ash: 0, frost: 0 };
  if (!P.keys) P.keys = { bone: 0, ash: 0, frost: 0 };
  if (!P.deepMods) P.deepMods = {};
  if (!P.jewels) P.jewels = {};
  if (P.questVer !== QUEST_VERSION) { P.quest = null; P.questVer = QUEST_VERSION; } // 任務改版：重新從進度判斷
  // 藥劑：v0.9 用字串記（'life_1'），v1.0 起是背包裡的物品（有詞綴）
  const toFlask = k => typeof k === 'string' ? (() => { const f = parseFlask(k); return FLASKS[f.type] ? makeFlask(f.type, f.tier) : null; })() : k;
  if (!P.flaskSlots) P.flaskSlots = ['life_1', 'mana_1', null, null];
  P.flaskSlots = P.flaskSlots.map(k => k ? toFlask(k) : null);
  if (P.flaskBag) { // 舊的藥劑袋：搬進背包空格
    for (const k in P.flaskBag) for (let n = 0; n < P.flaskBag[k]; n++) { const j = P.inv.indexOf(null); const f = toFlask(k); if (j >= 0 && f) P.inv[j] = f; }
    delete P.flaskBag;
  }
  // v1.3 技能寶石：舊存檔已經裝在技能欄的技能直接送你，不會突然不能用
  if (!P.skillGems) { P.skillGems = {}; for (const s of P.skills || []) if (s && !(CLASS_GEMS[P.cls] || []).includes(s)) P.skillGems[s] = true; }
  if (!P.mats) P.mats = {}; // v1.4 材料
  if (!P.hub) P.hub = 'cell';
  if (!P.hubs) P.hubs = { cell: true };
  // 舊存檔：依目前進度補上任務計數
  if (!P.qc) P.qc = { rare: 0, curUsed: 0, entered: Math.max(0, (P.maxTier || 1) - 1), cleared: Math.max(0, (P.maxTier || 1) - 1) };
  if (!P.ui) P.ui = { skillLvl: P.lvl || 1, journalN: 0 };
  const fixSock = it => { if (it && !it.sockets) it.sockets = []; };
  Object.values(P.equip).forEach(fixSock); P.inv.forEach(fixSock);
  if (P.treeVer !== TREE_VERSION) {
    if (P.tree && P.tree.length > 1) P.treeRefunded = true;
    P.tree = [CLASSES[P.cls].start]; P.treeVer = TREE_VERSION;
  }
  // v2.7 互斥的基石兩個都點了：整棵樹免費退還重點（只影響這種角色）
  if (P.tree && P.tree.some(id => TREE.nodes[id] && TREE.nodes[id].excl && TREE.nodes[id].excl.some(x => P.tree.includes(x)))) { P.tree = [CLASSES[P.cls].start]; P.treeRefunded = true; }
  return P;
}
// 倉庫是獨立存檔，之後做多角色時可以共用
const STASH_KEY = 'yiwang_shenyuan_stash_v1';
// ---------- 存檔：多角色 ----------
// 每個角色一筆（yiwang_char_<id>），另有一份角色清單；倉庫獨立一筆、全部角色共用
const INDEX_KEY = 'yiwang_chars_v2';
const CHAR_KEY = id => 'yiwang_char_' + id;
const MAX_CHARS = 8;
// 檢查瀏覽器能不能存檔（無痕模式、某些安全設定會擋）
function storageOK() {
  try { localStorage.setItem('yiwang_test', '1'); const ok = localStorage.getItem('yiwang_test') === '1'; localStorage.removeItem('yiwang_test'); return ok; } catch (e) { return false; }
}
function loadIndex() {
  let idx = null;
  try { idx = JSON.parse(localStorage.getItem(INDEX_KEY)); } catch (e) { }
  if (!idx || !Array.isArray(idx.chars)) idx = { chars: [] };
  // 舊版單一存檔 → 搬進角色清單
  try {
    const old = localStorage.getItem(SAVE_KEY);
    if (old) {
      const P = JSON.parse(old);
      const id = 'c' + Date.now().toString(36);
      localStorage.setItem(CHAR_KEY(id), old);
      idx.chars.push({ id, name: P.name, cls: P.cls, lvl: P.lvl, maxTier: P.maxTier, time: Date.now() });
      localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
      localStorage.removeItem(SAVE_KEY);
    }
  } catch (e) { }
  return idx;
}
function saveGame() {
  if (!G.P || !G.charId) return;
  try {
    localStorage.setItem(CHAR_KEY(G.charId), JSON.stringify(G.P));
    const idx = loadIndex();
    const meta = { id: G.charId, name: G.P.name, cls: G.P.cls, lvl: G.P.lvl, maxTier: G.P.maxTier, time: Date.now() };
    const i = idx.chars.findIndex(c => c.id === G.charId);
    if (i >= 0) idx.chars[i] = meta; else idx.chars.push(meta);
    localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
    if (G.stash) localStorage.setItem(STASH_KEY, JSON.stringify(G.stash));
    G.lastSave = Date.now(); G.saveFail = false;
  } catch (e) {
    if (!G.saveFail && !FileSave.ok) UI.msg('⚠ 存檔失敗！請按 H → 「匯出備份」或「連結存檔檔案」。', '#ff6a6a');
    G.saveFail = true;
  }
  FileSave.write(); // 有連結存檔檔案時，同時寫進電腦裡的檔案
}
function loadChar(id) { try { return JSON.parse(localStorage.getItem(CHAR_KEY(id))); } catch (e) { return null; } }
function deleteChar(id) {
  try {
    localStorage.removeItem(CHAR_KEY(id));
    const idx = loadIndex(); idx.chars = idx.chars.filter(c => c.id !== id);
    localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
  } catch (e) { }
}
function loadStash() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(STASH_KEY)); } catch (e) { }
  if (!s || !s.tabs) s = { tabs: [0, 1, 2, 3].map(() => Array(60).fill(null)) };
  return s;
}
// ---------- 備份：把所有角色＋倉庫存成一個檔案（存在你的電腦，不會上傳） ----------
function buildBackupData() {
  const idx = loadIndex();
  const data = { game: '遺忘深淵', version: 2, time: new Date().toISOString(), index: idx, chars: {}, stash: null };
  for (const c of idx.chars) data.chars[c.id] = loadChar(c.id);
  try { data.stash = JSON.parse(localStorage.getItem(STASH_KEY)); } catch (e) { }
  if (G.P && G.charId) {
    data.chars[G.charId] = G.P;
    if (!data.index.chars.find(c => c.id === G.charId)) data.index.chars.push({ id: G.charId, name: G.P.name, cls: G.P.cls, lvl: G.P.lvl, maxTier: G.P.maxTier });
  }
  if (G.stash) data.stash = G.stash;
  return data;
}
// ---------- 自動存檔檔案：選一次存檔位置，之後每次存檔都寫進那個檔案（Chrome／Edge） ----------
const FileSave = {
  handle: null, ok: false, busy: false, last: 0,
  supported() { return 'showSaveFilePicker' in window; },
  db() {
    return new Promise((res, rej) => { const r = indexedDB.open('yiwang_files', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  },
  async getStored() {
    try { const db = await this.db(); return await new Promise(res => { const q = db.transaction('h').objectStore('h').get('save'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch (e) { return null; }
  },
  async store(h) {
    try { const db = await this.db(); await new Promise(res => { const t = db.transaction('h', 'readwrite'); t.objectStore('h').put(h, 'save'); t.oncomplete = res; t.onerror = res; }); } catch (e) { }
  },
  // 要在按鈕點擊裡呼叫（瀏覽器規定要使用者同意）
  async pick() {
    const h = await window.showSaveFilePicker({ suggestedName: '夢疑MOE存檔.json', types: [{ description: '夢疑 MOE 存檔', accept: { 'application/json': ['.json'] } }] });
    this.handle = h; this.ok = true; await this.store(h); await this.write(true);
    return h.name;
  },
  async ensure() {
    if (!this.supported()) return false;
    if (!this.handle) this.handle = await this.getStored();
    if (!this.handle) return false;
    try {
      let p = await this.handle.queryPermission({ mode: 'readwrite' });
      if (p !== 'granted') p = await this.handle.requestPermission({ mode: 'readwrite' });
      this.ok = p === 'granted';
    } catch (e) { this.ok = false; }
    return this.ok;
  },
  async write(force) {
    if (!this.ok || !this.handle || this.busy) return;
    if (!force && Date.now() - this.last < 5000) return;
    this.busy = true;
    try { const w = await this.handle.createWritable(); await w.write(JSON.stringify(buildBackupData())); await w.close(); this.last = Date.now(); G.lastFileSave = this.last; }
    catch (e) { this.ok = false; UI.msg('⚠ 寫入存檔檔案失敗，請到 H 說明重新連結存檔檔案', '#ff6a6a'); }
    this.busy = false;
  },
  async read() { const f = await this.handle.getFile(); return await f.text(); },
};
function exportBackup() {
  saveGame();
  const data = buildBackupData();
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = `夢疑MOE_存檔備份_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importBackup(text) {
  const data = JSON.parse(text);
  if (!['遺忘深淵', '夢疑 MOE'].includes(data.game) || !data.index || !data.chars) throw new Error('不是夢疑 MOE 的備份檔');   // 舊名稱的備份也能讀
  for (const id in data.chars) if (data.chars[id]) localStorage.setItem(CHAR_KEY(id), JSON.stringify(data.chars[id]));
  localStorage.setItem(INDEX_KEY, JSON.stringify(data.index));
  if (data.stash) localStorage.setItem(STASH_KEY, JSON.stringify(data.stash));
  return data.index.chars.length;
}
function startGame(P, id) {
  G.charId = id || ('c' + Date.now().toString(36));
  G.P = migrateSave(P);
  G.stash = loadStash(); G.town = null; G.towns = {}; G.savedMap = null; G.shop = null;
  let maxU = 0;
  const scan = it => { if (it && it.uid > maxU) maxU = it.uid; };
  Object.values(P.equip).forEach(scan); P.inv.forEach(scan); G.stash.tabs.forEach(t => t.forEach(scan));
  UID_SEQ = Math.max(UID_SEQ, maxU + 1);
  G.pl = { x: 0, y: 0, r: 11, life: 1, mana: 1, es: 0, esDelay: 0, facing: 1, act: 0, cd: {}, flash: 0, heal: [],
    fl: [], aim: 0, walk: 0 };
  G.flaskBuffs = {};
  syncFlasks(true);
  G.mins = [];
  G.state = 'play';
  onBuildChanged();
  fullHeal();
  goTown();
  UI.onStart();
  if (P.treeRefunded) { delete P.treeRefunded; UI.msg('天賦樹改版了，天賦點數已全部退還，按 P 重新配點。', '#ffd780'); }
  storyBeat('prologue');
}
function onBuildChanged() {
  if (G.P && G.P.gemVer !== 1) { G.S = computeStats(G.P); gemMigrate(G.P, G.S); }   // v2.4 舊存檔：寶石等級依目前角色設定
  G.S = computeStats(G.P);
  G.calc = {};
  for (const sid in SKILLS) G.calc[sid] = calcSkill(G.S, sid, G.P.lvl, []);
  const n = linkSlots(G.P.lvl);
  G.slotCalc = G.P.skills.map((sid, i) => sid ? calcSkill(G.S, sid, G.P.lvl, G.P.links[i].slice(0, n)) : null);
  if (G.pl) {
    G.pl.life = Math.min(G.pl.life, G.S.maxLife);
    G.pl.mana = Math.min(G.pl.mana, G.S.maxMana);
    G.pl.es = Math.min(G.pl.es, G.S.maxES);
  }
  UI.refresh();
}
// 經驗曲線：照正常進度打完主線（第 10 夜）大約 60 級；60 級以後每級多 6%，慢慢刷到 100
// v2.5.5 升級變慢：整體 ×4，前幾級再多一點（第 1 夜打完約 4–5 級、第 10 夜約 53 級）
// v2.12.5 前期升級變快：1 級只要約 60 點（6 隻怪），到 12 級接回原本的曲線；12 級以後跟以前一樣
const xpEarly = l => l >= 12 ? 1 + 2 * Math.exp(-l / 6) : 0.6 + (1 + 2 * Math.exp(-2) - 0.6) * (l - 1) / 11;
const xpNeed = l => Math.round((5.8 * Math.pow(l, 1.85) + 20) * (l >= 60 ? Math.pow(1.06, l - 59) : 1) * 4 * xpEarly(l));
// 怪物經驗跟著怪物等級加速成長（原本是直線，前期太快、後期跟不上）
const monXpScale = m => Math.pow(m + 2, 1.5) / 4;
function gainXp(n) {
  const P = G.P;
  if (P.lvl >= MAX_LEVEL) return;
  P.xp += Math.round(n);
  while (P.xp >= xpNeed(P.lvl) && P.lvl < MAX_LEVEL) {
    P.xp -= xpNeed(P.lvl); P.lvl++;
    UI.msg(`升級！現在 ${P.lvl} 級。獲得 1 點天賦點數（按 P）`, '#9fff9f');
    const unlocked = Object.keys(SKILLS).filter(k => SKILLS[k].lvl === P.lvl).map(k => SKILLS[k].name);
    if (unlocked.length) UI.msg(`新技能解鎖：${unlocked.join('、')}（按 K 裝上）`, '#ffd780');
    if (LINK_LEVELS.includes(P.lvl)) UI.msg('技能欄多了一個輔助寶石連結孔（按 K）', '#3fd8b8');
    burst(G.pl.x, G.pl.y, '#9fff9f', 30); Sfx.play('levelup'); UI.banner('升級', '等級 ' + P.lvl, '#9fff9f');
    G.fx.push({ k: 'ring', x: G.pl.x, y: G.pl.y, r: 150, t: 0, dur: 0.6, color: '#c8ffc8', fill: 'rgba(150,255,150,0.12)' });
    onBuildChanged(); fullHeal();
    saveGame();
  }
}

// ---------- 技能施放 ----------
function msgOnce(key, txt, color) {
  if ((G.throttle[key] || 0) > G.time) return;
  G.throttle[key] = G.time + 2.5;
  UI.msg(txt, color || '#ff9a9a');
}
function useSkill(i) {
  const P = G.P, S = G.S, pl = G.pl;
  if ((pl.ail && pl.ail.frozen > 0) || pl.stun > 0) return; // 冰凍或硬直中不能施放技能
  const sid = P.skills[i]; if (!sid) return;
  if (pl.act > 0 || (pl.cd[sid] || 0) > 0) return;
  const sk = SKILLS[sid];
  const err = skillUsable(S, sid);
  if (err) return msgOnce('use' + sid, `${sk.name}：${err}`);
  const c = G.slotCalc[i];
  if (S.flags.bloodMagic) {
    if (pl.life <= c.cost + 1) return msgOnce('cost', '生命不足以施放');
    pl.life -= c.cost;
  } else {
    if (pl.mana < c.cost) return msgOnce('cost', '魔力不足', '#8fb8ff');
    pl.mana -= c.cost;
  }
  pl.act = c.time / (pl.buff ? 1 + pl.buff.spd : 1);
  if (sk.cd) { const cd = effCd(S, sk); pl.cd[sid] = cd; (pl.cdMax || (pl.cdMax = {}))[sid] = cd; } // 冷卻（會被冷卻回復速度縮短）
  castSkill(sid, c);
  if (c.echo) G.echoQ.push({ t: 0.16, sid, c });
  // v1.7 質變天賦「雙重詠唱」：法術有 25% 機率再放一次（不耗魔）
  if (S.flags.spellTwin && sk.tags.includes('spell') && sk.type !== 'summon' && Math.random() < 0.25) { G.echoQ.push({ t: 0.22, sid, c }); G.texts.push({ x: pl.x, y: pl.y - 40, txt: '雙重詠唱', color: '#c8a0ff', size: 11, t: 0, dur: 0.6 }); }
}
// v1.7 質變天賦：投射物分裂、連鎖；近戰餘震
const scalePk = (pk, f) => Object.assign({}, pk, { d: Object.fromEntries(Object.entries(pk.d).map(([k, v]) => [k, [v[0] * f, v[1] * f]])) });
function projKeystones(p, m) {
  const F = G.S.flags, sp = Math.hypot(p.vx, p.vy) || 500;
  if (F.projSplit && !p.child) { // 第一次擊中時分裂成 2 支（各 50% 傷害）
    const base = Math.atan2(p.vy, p.vx);
    for (const da of [-0.5, 0.5]) G.projs.push({ team: 'ally', x: m.x, y: m.y, vx: Math.cos(base + da) * sp, vy: Math.sin(base + da) * sp, r: 3, life: 0.6,
      pk: scalePk(p.pk, 0.5), pierce: 0, hit: new Set([m]), explode: 0, sprite: p.sprite, color: p.color, child: true, chained: true });
  }
  if (F.projChain && !p.chained) { // 擊中後跳到附近 1 個敵人（70% 傷害）
    let best = null, bd = 260;
    for (const o of G.mons) { if (o.dead || o === m || p.hit.has(o)) continue; const d = dist(o, m); if (d < bd) { bd = d; best = o; } }
    if (best) {
      const a = Math.atan2(best.y - m.y, best.x - m.x);
      G.projs.push({ team: 'ally', x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 3, life: 0.8, pk: scalePk(p.pk, 0.7), pierce: 0,
        hit: new Set([m]), explode: 0, sprite: p.sprite, color: p.color, child: true, chained: true });
    }
  }
}
// 爆炸：範圍傷害＋特效（火花、碎片、畫面震動）。noBlast 讓爆炸不會再引發爆炸
function blastAt(x, y, R, pk) {
  for (const m of G.mons) if (!m.dead && Math.hypot(m.x - x, m.y - y) <= R + m.r) hitMonster(m, Object.assign({}, pk, { noBlast: true }), false, { x, y }, 1.6);
  G.fx.push({ k: 'boom', x, y, r: R, t: 0, dur: 0.45 }); Sfx.play("boom", 0.7);
  for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, v = rnd(80, 260); G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, dur: rnd(0.3, 0.6), color: ['#ffd060', '#ff8a30', '#ff5020', '#fff0c0'][i % 4], s: rint(2, 4) }); }
  G.shake = Math.max(G.shake, 3.5);
}
function aftershock(targets, pk) { // 近戰擊中時，在第一個目標周圍再震一次（50% 傷害）
  if (!G.S.flags.aftershock || !targets.length) return;
  const c0 = targets[0], R = 70;
  for (const m of G.mons) if (!m.dead && Math.hypot(m.x - c0.x, m.y - c0.y) <= R + m.r) hitMonster(m, scalePk(pk, 0.5), false, c0, 0.8);
  G.fx.push({ k: 'ring', x: c0.x, y: c0.y, r: R, t: 0, dur: 0.3, color: '#ffd080', fill: 'rgba(255,200,120,0.18)' });
  burst(c0.x, c0.y, '#e0b070', 10, 140);
}
// 實際產生技能效果（法術回響會再呼叫一次）
// v2.3 每種技能的出手聲
function castSfx(sk) {
  const t = sk.type, e = sk.elem, atk = sk.tags.includes('attack');
  Sfx.play(t === 'summon' ? 'summon' : t === 'blink' ? 'blink' : t === 'buff' ? 'buff' : t === 'dash' ? 'heavy'
    : atk ? (sk.tags.includes('projectile') ? 'shoot' : (sk.speed || 1) < 0.9 ? 'heavy' : 'swing')
    : e === 'fire' ? 'fire' : e === 'cold' ? 'ice' : e === 'light' ? 'zap' : 'cast');
}
function castSkill(sid, c) {
  const P = G.P, S = G.S, pl = G.pl, sk = SKILLS[sid];
  const ang = Math.atan2(input.wy - pl.y, input.wx - pl.x);
  pl.aim = ang; pl.facing = Math.cos(ang) >= 0 ? 1 : -1; pl.swing = 0.18; pl.swingType = sk.type;
  castSfx(sk);
  if (sk.type === 'melee' || sk.type === 'slam') moveEnt(pl, Math.cos(ang) * 5, Math.sin(ang) * 5);   // v2.3 近戰出手時往前踏一小步
  const pk = { d: c.d, crit: c.crit, multi: c.multi, leech: c.leech, mleech: c.mleech, noChill: c.noChill, ail: c.ail, dotMult: c.dotMult, ailDur: c.ailDur };
  const ca = Math.cos(ang), sa = Math.sin(ang);
  switch (sk.type) {
    case 'melee': {
      const range = sk.range;
      const hitList = [];
      for (const m of G.mons) {
        if (m.dead) continue;
        const d = dist(m, pl);
        if (d > range + m.r) continue;
        let da = Math.atan2(m.y - pl.y, m.x - pl.x) - ang;
        while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) <= sk.arc / 2 || d < m.r + 14) { hitMonster(m, pk, false, pl, 1.4); hitList.push(m); G.hitstop = Math.max(G.hitstop || 0, 0.035); }
      }
      G.fx.push({ k: 'slash', x: pl.x, y: pl.y, ang, r: range, arc: sk.arc, t: 0, dur: 0.16, color: '#fff0d0' });
      aftershock(hitList, pk);
      break;
    }
    case 'slam': {
      const R = sk.radius * c.areaMul;
      const cx = pl.x + ca * 46, cy = pl.y + sa * 46;
      let any = false;
      const hitList = [];
      for (const m of G.mons) if (!m.dead && Math.hypot(m.x - cx, m.y - cy) <= R + m.r) { hitMonster(m, pk, false, { x: cx, y: cy }, 1.8); any = true; hitList.push(m); }
      aftershock(hitList, pk);
      if (any) G.hitstop = Math.max(G.hitstop || 0, 0.05);
      G.fx.push({ k: 'ring', x: cx, y: cy, r: R, t: 0, dur: 0.3, color: '#e0b070', fill: 'rgba(200,150,80,0.25)' });
      burst(cx, cy, '#a08060', 18, 160);
      G.shake = Math.max(G.shake, 4);
      break;
    }
    case 'proj': {
      const n = Math.max(1, c.count);
      const spread = n > 1 ? Math.min(1.7, (sk.spread || 0.15) * (n - 1)) : 0;
      // v2.5.5：同一次施放的投射物可以打到同一隻怪，但第 2 發起只有 PROJ_SHOTGUN（35%）傷害——多 1 發對單一目標也有用
      const castHit = new Map();
      for (let k = 0; k < n; k++) {
        const a = n > 1 ? ang - spread / 2 + spread * k / (n - 1) : ang;
        G.projs.push({ team: 'ally', x: pl.x + Math.cos(a) * 12, y: pl.y - 6 + Math.sin(a) * 12, vx: Math.cos(a) * sk.pspeed, vy: Math.sin(a) * sk.pspeed,
          r: sk.sprite === "fireball" ? 7 : 4, life: 1.3, pk, pierce: c.pierce, hit: new Set(), cast: castHit, explode: sk.explode ? sk.explode * c.areaMul : 0, sprite: sk.sprite, color: sk.color });
      }
      break;
    }
    case 'nova': {
      const R = sk.radius * c.areaMul;
      for (const m of G.mons) if (!m.dead && dist(m, pl) <= R + m.r) hitMonster(m, pk, false, pl, 1.5);
      G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: R, t: 0, dur: 0.35, color: '#a8ecff', fill: 'rgba(140,220,255,0.22)' });
      burst(pl.x, pl.y, '#c8f4ff', 26, 260);
      break;
    }
    case 'chain': {
      const mx = input.wx, my = input.wy;
      let first = null, bd = 1e9;
      for (const m of G.mons) {
        if (m.dead || dist(m, pl) > sk.range) continue;
        const d = Math.hypot(m.x - mx, m.y - my);
        if (d < bd && shotLos(pl.x, pl.y, m.x, m.y)) { bd = d; first = m; }
      }
      const pts = [{ x: pl.x, y: pl.y - 8 }];
      if (first) {
        const hitSet = new Set();
        let curM = first;
        for (let k = 0; k <= c.chains && curM; k++) {
          hitMonster(curM, pk, false, pts[pts.length - 1], 0.5); hitSet.add(curM); pts.push({ x: curM.x, y: curM.y });
          let nx = null, nd = 170;
          for (const m of G.mons) { if (m.dead || hitSet.has(m)) continue; const d = dist(m, curM); if (d < nd) { nd = d; nx = m; } }
          curM = nx;
        }
      } else pts.push({ x: pl.x + ca * 160, y: pl.y + sa * 160 });
      G.fx.push({ k: 'bolt', pts, t: 0, dur: 0.18, color: '#fff890' });
      break;
    }
    case 'summon': {
      const mc = c.minion;
      // 每種召喚物各自計算上限，滿了就換掉最舊的那隻
      const same = G.mins.filter(x => x.mtype === mc.kind);
      if (same.length >= mc.max) G.mins.splice(G.mins.indexOf(same[0]), 1);
      const p = randomFloorNear(pl.x + ca * 30, pl.y + sa * 30, 20);
      G.mins.push({ kind: 'min', mtype: mc.kind, x: p.x, y: p.y, r: mc.kind === 'golem' ? 16 : 10, life: mc.life, maxLife: mc.life, dmg: mc.dmg, aps: mc.aps,
        atkCD: 0.3, facing: 1, flash: 0, speed: mc.speed, ranged: mc.ranged, taunt: mc.taunt, count: mc.count || 1 });
      burst(p.x, p.y, sk.color, 16);
      break;
    }
    case 'blink': {
      const maxD = Math.min(sk.dist, Math.hypot(input.wx - pl.x, input.wy - pl.y));
      burst(pl.x, pl.y, '#c090ff', 14);
      let tx = pl.x, ty = pl.y;
      for (let d = 8; d <= maxD; d += 8) { const nx = pl.x + ca * d, ny = pl.y + sa * d; if (blockedCircle(nx, ny, pl.r)) break; tx = nx; ty = ny; }
      pl.x = tx; pl.y = ty;
      burst(pl.x, pl.y, '#c090ff', 14);
      break;
    }
    case 'dash': { // 居合斬：衝刺並砍穿路徑上的敵人
      const sx = pl.x, sy = pl.y;
      let tx = pl.x, ty = pl.y;
      for (let d = 8; d <= sk.dist; d += 8) { const nx = sx + ca * d, ny = sy + sa * d; if (blockedCircle(nx, ny, pl.r)) break; tx = nx; ty = ny; }
      const L = Math.hypot(tx - sx, ty - sy) || 1;
      let any = false;
      for (const m of G.mons) {
        if (m.dead) continue;
        const t = clamp(((m.x - sx) * ca + (m.y - sy) * sa) / L, 0, 1);
        const px = sx + ca * L * t, py = sy + sa * L * t;
        if (Math.hypot(m.x - px, m.y - py) < m.r + 26) { hitMonster(m, pk, false, { x: px - sa * 10, y: py + ca * 10 }, 1.0); any = true; }
      }
      pl.x = tx; pl.y = ty;
      G.fx.push({ k: 'line', x1: sx, y1: sy, x2: tx, y2: ty, t: 0, dur: 0.25, color: '#fff4c0', w: 5 });
      if (any) { G.hitstop = Math.max(G.hitstop || 0, 0.06); G.shake = Math.max(G.shake, 3); }
      break;
    }
    case 'zone': { // 荊棘綻放、暴風雪：在地上留下持續傷害區域
      const d = Math.min(sk.range, Math.hypot(input.wx - pl.x, input.wy - pl.y));
      const cp = castPoint(pl.x, pl.y, ca, sa, d), zx = cp.x, zy = cp.y;   // v2.13.9 不能隔牆施放
      const mine = G.azones.filter(z => z.sid === sid);
      if (mine.length >= sk.maxZones) G.azones.splice(G.azones.indexOf(mine[0]), 1);
      G.azones.push({ sid, x: zx, y: zy, r: sk.radius * c.areaMul, t: 0, dur: sk.dur, tick: sk.tick, next: 0, pk, color: sk.color, chill: sk.elem === 'cold' });
      break;
    }
    case 'delayed': { // 隕石術
      const d = Math.min(sk.range, Math.hypot(input.wx - pl.x, input.wy - pl.y));
      const cp = castPoint(pl.x, pl.y, ca, sa, d), zx = cp.x, zy = cp.y, R = sk.radius * c.areaMul;
      G.strikes.push({ x: zx, y: zy, r: R, t: -sk.delay, pk, kind: 'meteor', color: sk.color, kb: 2 });
      tele('circle', zx, zy, R, sk.delay, '#ff8040');
      break;
    }
    case 'rain': { // 毒雨箭：三波箭雨
      const d = Math.min(sk.range, Math.hypot(input.wx - pl.x, input.wy - pl.y));
      const zx = pl.x + ca * d, zy = pl.y + sa * d, R = sk.radius * c.areaMul;
      for (let v = 0; v < c.volleys; v++) G.strikes.push({ x: zx + rnd(-15, 15), y: zy + rnd(-15, 15), r: R, t: -0.25 - v * 0.22, pk, kind: 'rain', color: sk.color, kb: 0.4 });
      break;
    }
    case 'storm': { // 天雷審判：落雷打在附近的敵人身上
      const d = Math.min(sk.range, Math.hypot(input.wx - pl.x, input.wy - pl.y));
      const zx = pl.x + ca * d, zy = pl.y + sa * d, R = sk.radius * c.areaMul;
      const near = G.mons.filter(m => !m.dead && Math.hypot(m.x - zx, m.y - zy) < R);
      for (let k = 0; k < c.strikes; k++) {
        const tgt = near.length ? near[k % near.length] : null;
        const p = tgt ? { x: tgt.x, y: tgt.y } : { x: zx + rnd(-R, R) * 0.6, y: zy + rnd(-R, R) * 0.6 };
        G.strikes.push({ x: p.x, y: p.y, r: 30, t: -0.1 - k * 0.12, pk, kind: 'bolt', color: sk.color, kb: 0.5, single: tgt });
      }
      break;
    }
    case 'buff': { // 戰吼
      pl.buff = { t: sk.dur, spd: 0.25 };
      for (const m of G.mons) {
        if (m.dead || dist(m, pl) > sk.radius * c.areaMul) continue;
        if (m.rarity !== 'boss') { const a = Math.atan2(m.y - pl.y, m.x - pl.x); m.kx = (m.kx || 0) + Math.cos(a) * 300; m.ky = (m.ky || 0) + Math.sin(a) * 300; m.stagger = 0.6; }
      }
      G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: sk.radius * c.areaMul, t: 0, dur: 0.4, color: '#ff8070', fill: 'rgba(255,90,70,0.15)' });
      G.shake = Math.max(G.shake, 5);
      UI.msg('戰意高昂！攻擊與施法速度 +25%', '#ff9a80');
      break;
    }
  }
}
// 延遲落下的攻擊（隕石、箭雨、落雷）
function updateStrikes(dt) {
  for (const s of G.strikes) {
    s.t += dt;
    if (s.t < 0) continue;
    s.done = true;
    if (s.single && !s.single.dead) hitMonster(s.single, s.pk, false, s, s.kb);
    else for (const m of G.mons) if (!m.dead && Math.hypot(m.x - s.x, m.y - s.y) <= s.r + m.r) hitMonster(m, s.pk, false, s, s.kb);
    if (s.kind === 'meteor') { Sfx.play("boom"); G.fx.push({ k: 'ring', x: s.x, y: s.y, r: s.r, t: 0, dur: 0.4, color: '#ffc080', fill: 'rgba(255,100,30,0.4)' }); burst(s.x, s.y, '#ff7030', 40, 320); G.shake = Math.max(G.shake, 7); G.hitstop = Math.max(G.hitstop || 0, 0.06); }
    else if (s.kind === 'rain') {
      G.fx.push({ k: 'ring', x: s.x, y: s.y, r: s.r, t: 0, dur: 0.2, color: s.color, fill: 'rgba(140,210,90,0.18)' });
      for (let i = 0; i < 10; i++) { const lx = s.x + rnd(-s.r, s.r) * 0.8, ly = s.y + rnd(-s.r, s.r) * 0.6; G.fx.push({ k: 'line', x1: lx - 8, y1: ly - 30, x2: lx, y2: ly, t: 0, dur: 0.15, color: '#e8e0b0', w: 2 }); }
    }
    else if (s.kind === 'bolt') { G.fx.push({ k: 'bolt', pts: [{ x: s.x + rnd(-20, 20), y: s.y - 260 }, { x: s.x + rnd(-10, 10), y: s.y - 120 }, { x: s.x, y: s.y }], t: 0, dur: 0.15, color: s.color }); burst(s.x, s.y, '#fff080', 8, 120); }
  }
  G.strikes = G.strikes.filter(s => !s.done);
  // 地面持續區域
  for (const z of G.azones) {
    z.t += dt; z.next -= dt;
    if (z.next <= 0) {
      z.next = z.tick;
      for (const m of G.mons) if (!m.dead && Math.hypot(m.x - z.x, m.y - z.y) <= z.r + m.r) { hitMonster(m, z.pk, false, null, 0); if (z.chill) { m.chill = 1; m.chillAmt = 0.3; } }
    }
  }
  G.azones = G.azones.filter(z => z.t < z.dur);
}

// ---------- 傷害：玩家打怪 ----------
function hitMonster(m, pk, fromMinion, src, kb = 1) {
  if (m.dead || m.hidden) return;   // v2.15.3 鑽在地底的怪打不到
  const S = G.S;
  const roll = k => pk.d[k] ? rnd(pk.d[k][0], pk.d[k][1]) : 0;
  const crit = Math.random() * 100 < pk.crit;
  const cm = (crit ? pk.multi / 100 : 1) * (m.shock > 0 ? 1.2 : 1);
  // 怪物防禦：護甲減物理（大傷害減得少），抗性減元素與毒（負抗性＝弱點，傷害變多）
  let phys = roll('phys') * cm;
  if (phys > 0 && m.armour > 0) phys *= 1 - Math.min(0.75, m.armour / (m.armour + 12 * phys));
  const fire = roll('fire') * cm * (1 - m.res.fire / 100), cold = roll('cold') * cm * (1 - m.res.cold / 100);
  const light = roll('light') * cm * (1 - m.res.light / 100), chaos = roll('chaos') * cm * (1 - m.res.chaos / 100);
  let total = Math.max(1, Math.round(phys + fire + cold + light + chaos));
  m.life -= total; m.flash = 0.1; m.aggro = true;
  G.target = m; G.targetT = 4;
  // 異常狀態
  if (pk.ail) applyAilments(m, pk, { phys, fire, cold, light, chaos }, crit);
  // 打擊感：擊退、硬直、噴血
  const resist = { normal: 1, magic: 0.65, rare: 0.35, boss: 0 }[m.rarity];
  if (src && resist > 0) {
    const a = Math.atan2(m.y - src.y, m.x - src.x);
    const power = 160 * kb * resist * (crit ? 1.4 : 1);
    m.kx = (m.kx || 0) + Math.cos(a) * power; m.ky = (m.ky || 0) + Math.sin(a) * power;
    m.stagger = Math.max(m.stagger || 0, 0.18 * resist * kb);
  }
  const hitCol = m.def.sprite === 'skeleton' || m.def.sprite === 'archer' || m.boss === 'boneking' ? '#e8e0d0' : m.def.sprite === 'wisp' ? '#bfefff' : '#a01818';
  for (let i = 0; i < (crit ? 7 : 3); i++) {
    const a = Math.random() * Math.PI * 2, v = rnd(60, 180);
    G.parts.push({ x: m.x, y: m.y - 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, dur: rnd(0.2, 0.45), color: hitCol, s: 2 });
  }
  if (cold > 0.5 && !pk.noChill) { m.chill = 2; m.chillAmt = S.flags.chillMore ? 0.5 : 0.3; }
  const top = Math.max(phys, fire, cold, light, chaos);
  const col = crit ? '#ffe040' : top === fire ? '#ffb080' : top === cold ? '#b0e8ff' : top === light ? '#ffffa0' : top === chaos ? '#a0f090' : '#ffffff';
  // v2.3 傷害數字：跳出來的瞬間放大再縮回、往旁邊飄；暴擊更大還有驚嘆號
  G.texts.push({ x: m.x + rnd(-10, 10), y: m.y - m.r - 10, txt: String(total) + (crit ? '!' : ''), color: col, size: crit ? 19 : 12, t: 0, dur: crit ? 0.95 : 0.7, vx: rnd(-22, 22), pop: crit ? 1.0 : 0.5 });
  // v2.3 打擊感：命中火花、怪物被打扁一下、依傷害大小頓格與震動、音效
  const big = total > m.maxLife * 0.12;
  m.squash = crit || big ? 0.14 : 0.09;
  G.fx.push({ k: 'spark', x: m.x, y: m.y - m.r * 0.4, a: src ? Math.atan2(m.y - src.y, m.x - src.x) : rnd(0, 6.28), t: 0, dur: crit ? 0.2 : 0.13, color: crit ? '#fff0a0' : col, big: crit || big });
  // v2.7.10 頓格節流：0.25 秒內只頓一次；投射物（遠程）只有暴擊才頓、而且比較短 → 穿刺箭一次打很多隻時不會一直卡住
  if (!fromMinion) { if ((G.time - (G.lastStop || -9)) > 0.25) { const hs = src === G.pl ? (crit ? 0.06 : big ? 0.035 : 0.012) : (crit ? 0.025 : 0); if (hs) { G.hitstop = Math.max(G.hitstop || 0, hs); G.lastStop = G.time; } } Sfx.play(crit ? 'crit' : 'hit'); } else Sfx.play('hit', 0.45);
  if (crit) G.shake = Math.max(G.shake, 3.5); else if (big && !fromMinion) G.shake = Math.max(G.shake, 1.6);
  const leech = pk.leech ?? S.leech;
  const mleech = pk.mleech ?? S.mleech;
  if (!fromMinion && (leech > 0 || mleech > 0)) {
    // 偷取：每次擊中最多回 8% 最大值；有紅色（生命）/藍色（魔力）的光點飛回角色身上
    if (leech > 0) G.pl.life = Math.min(S.maxLife, G.pl.life + Math.min(total * leech / 100, S.maxLife * 0.08));
    if (mleech > 0) G.pl.mana = Math.min(S.maxMana, G.pl.mana + Math.min(total * mleech / 100, S.maxMana * 0.08));
    if (Math.random() < 0.6) (G.leechFx || (G.leechFx = [])).push({ x: m.x, y: m.y - 8, t: 0, col: leech >= (mleech || 0) ? '#ff3a4a' : '#4a8aff' });
  }
  if (!fromMinion && S.flags.cull && !m.boss && m.life > 0 && m.life < m.maxLife * 0.1) {
    m.life = 0; G.texts.push({ x: m.x, y: m.y - m.r - 26, txt: '處決', color: '#ff6040', size: 14, t: 0, dur: 0.8 });
  }
  // v1.7 爆炸屬性：擊中時有機率引發爆炸（40% 傷害的範圍攻擊）
  if (!fromMinion && !pk.noBlast && S.blast_ch && Math.random() * 100 < S.blast_ch) blastAt(m.x, m.y, 65, scalePk(pk, 0.4));
  if (m.life <= 0) killMonster(m);
}
// ---------- 異常狀態：點燃、冰凍、感電、中毒、流血 ----------
function applyAilments(m, pk, dealt, crit) {
  const ch = k => Math.random() * 100 < (pk.ail[k] || 0);
  const dur = pk.ailDur || 1, dm = pk.dotMult || 1;
  const say = (t, c) => G.texts.push({ x: m.x + rnd(-10, 10), y: m.y - m.r - 24, txt: t, color: c, size: 11, t: 0, dur: 0.7 });
  if (dealt.fire > 0.5 && ch('ignite')) {
    const dps = dealt.fire * 0.3 * dm;
    if (!m.ign || m.ign.dps <= dps) { if (!m.ign) say('點燃', AILMENTS.ignite.color); m.ign = { dps, t: 3 * dur }; }
  }
  if (dealt.cold > 0.5 && ch('freeze')) {
    const t = (m.boss ? 0.25 : m.rarity === 'rare' ? 0.5 : 0.8) * dur;
    if ((m.frozen || 0) < t) { m.frozen = t; say('冰凍', AILMENTS.freeze.color); }
  }
  if (dealt.light > 0.5 && ch('shock')) { if (!(m.shock > 0)) say('感電', AILMENTS.shock.color); m.shock = 3 * dur; }
  if (dealt.phys + dealt.chaos > 0.5 && ch('poison')) {
    if (m.poisons.length < 40) m.poisons.push({ dps: (dealt.phys + dealt.chaos) * 0.2 * dm, t: 3 * dur });
  }
  if (dealt.phys > 0.5 && ch('bleed')) {
    const dps = dealt.phys * 0.25 * dm;
    if (!m.bleed || m.bleed.dps <= dps) { if (!m.bleed) say('流血', AILMENTS.bleed.color); m.bleed = { dps, t: 4 * dur }; }
  }
}
// 每幀結算持續傷害；數字每 0.4 秒冒一次
function tickAilments(m, dt) {
  let dmg = 0, col = null;
  if (m.ign) { dmg += m.ign.dps * dt; col = AILMENTS.ignite.color; if ((m.ign.t -= dt) <= 0) m.ign = null; }
  if (m.bleed) { dmg += m.bleed.dps * dt; col = col || AILMENTS.bleed.color; if ((m.bleed.t -= dt) <= 0) m.bleed = null; }
  if (m.poisons.length) {
    for (const p of m.poisons) { dmg += p.dps * dt; p.t -= dt; }
    m.poisons = m.poisons.filter(p => p.t > 0); col = col || AILMENTS.poison.color;
  }
  if (m.shock > 0) m.shock -= dt;
  if (m.frozen > 0) m.frozen -= dt;
  if (dmg <= 0) return;
  dmg *= m.shock > 0 ? 1.2 : 1;
  m.life -= dmg; m.dotAcc = (m.dotAcc || 0) + dmg; m.dotT = (m.dotT || 0) - dt;
  if (m.dotT <= 0 && m.dotAcc >= 1) {
    G.texts.push({ x: m.x + rnd(-10, 10), y: m.y - m.r - 6, txt: String(Math.round(m.dotAcc)), color: col, size: 10, t: 0, dur: 0.6 });
    m.dotAcc = 0; m.dotT = 0.4;
  }
  if (m.life <= 0) killMonster(m);
}
function loreKey(m) { return m.boss ? 'boss_' + m.boss : m.type; }
function loreLevel(m) {
  const n = (G.P.lore || {})[loreKey(m)] || 0;
  const tiers = m.boss ? LORE_TIERS_BOSS : LORE_TIERS;
  return { n, lv: tiers.filter(t => n >= t).length, next: tiers.find(t => n < t) };
}
function killMonster(m) {
  m.dead = true;
  // v2.3 擊殺回饋：音效、白色衝擊圈；精英震一下；首領倒下時慢動作
  Sfx.play(m.boss ? 'bosskill' : m.rarity === 'normal' ? 'kill' : 'elitekill');
  G.fx.push({ k: 'ring', x: m.x, y: m.y, r: m.r * (m.rarity === 'normal' ? 2 : 3.2), t: 0, dur: 0.22, color: '#ffffff', fill: 'rgba(255,255,255,0.16)' });
  burst(m.x, m.y, '#ffe8c0', m.rarity === 'normal' ? 4 : 14, 200);
  if (m.rarity === 'rare') G.shake = Math.max(G.shake, 4);
  if (m.boss) { G.slowmo = 1.2; G.shake = 10; }
  const P = G.P, S = G.S, pl = G.pl;
  // v1.7 質變天賦「爆裂之魂」：擊殺的敵人會爆炸（牠最大生命 15% 的火焰傷害）
  if (S.flags.corpseBlast && !m.boss) { const v = m.maxLife * 0.15; blastAt(m.x, m.y, 80, { d: { fire: [v, v] }, crit: 0, multi: 150, ail: {}, noBlast: true }); }
  P.kills++;
  if (m.rarity === 'rare') qc(P).rare++;
  P.lore = P.lore || {};
  const lk = loreKey(m), before = loreLevel(m).lv;
  P.lore[lk] = (P.lore[lk] || 0) + 1;
  const after = loreLevel(m).lv;
  if (after > before) UI.msg(`圖鑑解鎖：${m.def.name} 的「${LORE_TEXT[after - 1]}」`, '#c8b0ff');
  let xp;
  if (m.boss) xp = m.def.xp * monXpScale(m.mlvl);
  else xp = m.def.xp * monXpScale(m.mlvl) * ({ normal: 1, magic: 2.5, rare: 6 }[m.rarity]) * (m.swarm ? 0.35 : 1);
  const diff = P.lvl - m.mlvl - Math.max(0, ((G.world && G.world.tier) || 0) - 20) * 0.5;   // v2.12 第 21 夜起，怪物算經驗時每夜多當 0.5 級（封頂 80 級之後還能練）
  if (diff > 5) xp *= Math.max(0.15, 1 - (diff - 5) * 0.15);
  gainXp(xp); gemGainXp(xp);   // v2.4 裝在技能欄上的寶石一起拿經驗
  if (S.life_on_kill) pl.life = Math.min(S.maxLife, pl.life + S.life_on_kill);
  pl.mana = Math.min(S.maxMana, pl.mana + S.mana_on_kill);
  const mm = G.world.mm || aggMods([]);
  const ch = (m.boss ? 30 : { normal: 1, magic: 3, rare: 8 }[m.rarity]) * mm.flask;
  pl.fl.forEach(f => { if (f) f.c = Math.min(f.max, f.c + ch * f.st.kill); });
  burst(m.x, m.y, m.boss ? '#ffcf70' : '#8a2a2a', m.boss ? 60 : 12, m.boss ? 300 : 140);
  G.fx.push({ k: 'corpse', x: m.x, y: m.y + m.r * 0.8, sprite: m.def.sprite, scale: m.scale, facing: m.facing, tint: m.tint, kx: (m.kx || 0) * 0.15, t: 0, dur: m.boss ? 1.6 : 0.6 });
  if (m.boss) return bossDefeated(m);
  if (m.noDrop) return;   // v2.10 獻祭圈的怪：獎勵在儀式結束時一次給
  // 掉落
  const ilvl = m.mlvl;
  // 精英怪：魔法（藍）掉 1–2 件、稀有（黃）掉 3–4 件並必掉通貨，稀有度加成也更高
  // 夢境詞綴：數量加成＝多掉幾件的機率，稀有度加成＝乘在 bonus 上
  const bonus = { normal: 1, magic: 2, rare: 4 }[m.rarity] * (1 + mm.r / 100);
  let n = 0;
  // v1.3：掉落率調低（普通 9%、魔法 0–2 件、稀有 2–3 件）
  if (m.rarity === 'normal') n = Math.random() < (m.swarm ? 0.03 : 0.09) ? 1 : 0;   // v2.10 蟲群一隻掉得少（數量多）
  else if (m.rarity === 'magic') n = (Math.random() < 0.7 ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0);
  else { n = 2 + (Math.random() < 0.4 ? 1 : 0); dropLoot(m.x, m.y, { cur: randomCurrency() }); }
  const qx = n * mm.q / 100; n += Math.floor(qx) + (Math.random() < qx % 1 ? 1 : 0);
  // v2.2 材料也會從怪物身上掉（走過去自動撿）：白怪 2.5%、藍怪 30%、黃怪 70%；階級跟著地圖等級（I–V）
  // 深層夢境：精英怪有機會掉夢魘碎片
  if (G.world.tier >= DEEP_TIER && m.rarity !== 'normal' && Math.random() < (m.rarity === 'rare' ? 0.07 : 0.015) * (1 + mm.q / 100)) dropLoot(m.x, m.y, { frag: pick(THEME_FRAG) });
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    dropLoot(m.x, m.y, r < 0.15 ? { cur: randomCurrency() } : r < 0.22 ? { gem: randomSupport() } : r < 0.29 ? { jewel: randomJewel(m.mlvl) }
      : r < 0.34 ? { item: randomFlask(G.world.grade || 1) } : r < 0.37 ? { skill: randomSkillGem(m.mlvl) } : { item: randomItem(ilvl, bonus) });
  }
}
function randomSupport() { return pick(Object.keys(SUPPORTS)); }
function bossDefeated(b) {
  const P = G.P, w = G.world;
  UI.banner('擊敗首領', b.name, '#ffcf70');
  const id = b.boss;
  const first = !P.bossKills[id];
  P.bossKills[id] = (P.bossKills[id] || 0) + 1;
  G.bossBar = null;
  UI.msg(`★ 擊敗了 ${b.name}！`, '#ffcf70');
  const ilvl = b.mlvl;   // v2.5.4 物品等級＝首領等級（地圖等級 +3）
  const mm = w.mm, big = !!w.arena;
  // 首領專屬傳奇（v1.3）：不再首殺必掉；一般看守者 12%、夢魘首領與守門人 30%（夢境稀有度加成會提高一點）
  const excl = UNIQUES.filter(u => u.boss === id);
  if (excl.length && Math.random() < (big ? 0.3 : 0.12) * (1 + mm.r / 200)) dropLoot(b.x, b.y, { item: makeUnique(pick(excl).id, ilvl) });
  const extra = 1 + mm.q / 100, rb = 4 * (1 + mm.r / 100) * (big ? 2 : 1);
  // v1.3：首領掉的裝備變少（稀有 1–2 件＋隨機 1–2 件）
  for (let i = 0; i < (big ? 2 : 1); i++) dropLoot(b.x, b.y, { item: makeItem(pickBase(ilvl).id, 'rare', ilvl) });
  for (let i = 0; i < Math.round((big ? 2 : 1) * extra); i++) dropLoot(b.x, b.y, { item: randomItem(ilvl, rb) });
  if (Math.random() < (big ? 0.6 : 0.35)) dropLoot(b.x, b.y, { skill: randomSkillGem(b.mlvl) }); // 技能寶石
  for (let i = 0; i < Math.round((big ? 8 : 4) * extra); i++) dropLoot(b.x, b.y, { cur: randomCurrency() });
  for (let i = 0; i < 2; i++) dropLoot(b.x, b.y, { gem: randomSupport() });
  for (let i = 0; i < (big ? 3 : 1); i++) dropLoot(b.x, b.y, { jewel: randomJewel(b.mlvl, 1) });
  if (w.arena) {
    // 夢魘首領掉鑰匙；守門人有自己的劇情
    const nk = Object.keys(NIGHTMARES).find(k => NIGHTMARES[k].boss === id);
    if (nk) { dropLoot(b.x, b.y, { key: nk }); if (first) storyBeat('nightmare'); }
    if (id === 'keeper') storyBeat('keeper');
  } else {
    if (w.tier >= P.maxTier && w.tier < DEPTH_MAX) { P.maxTier = w.tier + 1; UI.msg(`解鎖了第 ${w.tier + 1} 夜的夢！`, '#9fff9f'); }
    qc(P).cleared = Math.max(qc(P).cleared, w.tier);
    if (first) storyBeat('boss_' + id);
    if (w.tier >= ENDING_TIER) { const firstEnd = !P.story.seen.ending; storyBeat('ending'); if (firstEnd) UI.msg('夢醒之牢來了一位新的客人：引路人．塞拉，她賣所有的技能寶石', '#ffd27a'); }
    // 深層夢境的看守者：60% 掉對應主題的夢魘碎片，25% 再掉一片隨機的
    if (w.tier >= DEEP_TIER) {
      if (Math.random() < 0.6 * extra) dropLoot(b.x, b.y, { frag: THEME_FRAG[THEMES.indexOf(THEMES.find(t => t.boss === id))] || pick(THEME_FRAG) });
      if (Math.random() < 0.25 * extra) dropLoot(b.x, b.y, { frag: pick(THEME_FRAG) });
    }
  }
  const pp = randomFloorNear(b.x, b.y + 90, 30);
  w.portal = { x: pp.x, y: pp.y, exit: true };
  // v2.15.2 打倒看守者後的傳送門：直接帶你到「下一夜」所屬的營地（換章節時就是新營地）
  if (!w.arena && w.tier && w.tier <= ENDING_TIER) { const nh = hubForTier(Math.min(w.tier + 1, ENDING_TIER)); if (nh && nh !== P.hub && HUB_BY_ID[nh]) w.portal.toHub = nh; }
  saveGame();
}
function dropLoot(x, y, o) {
  const p = randomFloorNear(x, y, 46);
  const l = Object.assign({ x: p.x, y: p.y, t: 0 }, o);
  if (l.item) {
    l.label = l.item.name; l.color = RARITY_COLOR[l.item.rarity];
    if (l.item.rarity === 'unique') { Sfx.play('unique'); UI.banner('傳奇物品掉落', l.item.name, RARITY_COLOR.unique); } else if (l.item.rarity === 'rare') Sfx.play('rare');
    if (l.item.rarity === 'unique') UI.msg(`傳奇物品掉落：${l.item.name}`, RARITY_COLOR.unique);
  } else if (l.gem) { l.label = `輔助寶石：${SUPPORTS[l.gem].name}`; l.color = '#3fd8b8'; }
  else if (l.skill) { l.label = `技能寶石：${SKILLS[l.skill].name}`; l.color = '#ffd27a'; }
  else if (l.frag) { l.label = NIGHTMARES[l.frag].frag; l.color = NIGHTMARES[l.frag].color; }
  else if (l.mat) { l.label = matName(l.mat); l.color = MATS[l.mat.slice(0, l.mat.lastIndexOf("_"))].color; }
  else if (l.jewel) { l.label = jewelName(l.jewel); l.color = JEWELS[parseJewel(l.jewel).type].color; }
  else if (l.key) { l.label = `★ ${NIGHTMARES[l.key].key}`; l.color = NIGHTMARES[l.key].color; UI.msg(`掉落了 ${NIGHTMARES[l.key].key}！`, NIGHTMARES[l.key].color); }
  else {
    l.label = CURRENCY[l.cur].name; l.color = '#e8d8a8';
    const sp = typeof CUR_SPECIAL !== 'undefined' && CUR_SPECIAL[l.cur];   // v2.15.3 稀有通貨：特殊顏色（lootfx.js）
    if (sp) { l.special = sp; l.color = sp.color; if (sp.tier === 1) { Sfx.play('unique'); UI.msg(`★ ${CURRENCY[l.cur].name}掉落了！`, sp.color); } }
  }
  G.loot.push(l);
}
const RARITY_COLOR = { normal: '#d8d8d8', magic: '#8890ff', rare: '#ffff77', unique: '#e8803a' };

// ---------- 傷害：怪打玩家 ----------
function damagePlayer(parts, opts = {}) {
  if (G.dead) return;
  const S = G.S, pl = G.pl;
  if (!opts.dot) {
    if (!opts.spell) {
      const mlvl = G.world.mlvl;
      // v1.5 閃避機率：直接躲掉攻擊（上限 50%），在閃避值之前先判定
      if (S.dodge && Math.random() * 100 < Math.min(DODGE_CAP, S.dodge)) { Sfx.play('dodge'); G.texts.push({ x: pl.x, y: pl.y - 30, txt: '閃身', color: '#b0f0ff', size: 12, t: 0, dur: 0.6 }); return; }
      const ev = Math.min(0.75, S.evasionT / (S.evasionT + 200 + 40 * mlvl));
      if (Math.random() < ev) { Sfx.play('dodge'); G.texts.push({ x: pl.x, y: pl.y - 30, txt: '閃避', color: '#9fd0ff', size: 12, t: 0, dur: 0.6 }); return; }
      if (S.blockChance && Math.random() * 100 < S.blockChance) { Sfx.play('block'); G.texts.push({ x: pl.x, y: pl.y - 30, txt: '格擋', color: '#e0e0e0', size: 12, t: 0, dur: 0.6 }); return; }
    } else if (S.spellBlock && Math.random() * 100 < S.spellBlock) {
      // 法術攻擊：閃避和一般格擋擋不了，只有「法術格擋」可以
      G.texts.push({ x: pl.x, y: pl.y - 30, txt: '法術格擋', color: '#c8b0ff', size: 12, t: 0, dur: 0.6 }); return;
    }
  }
  let total = 0;
  const supp = opts.spell && !opts.dot && S.suppress && Math.random() * 100 < S.suppress;
  const dealt = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0 };
  for (const [amt0, elem] of parts) {
    let amt = amt0;
    if (elem === 'phys') { const dr = Math.min(0.9, S.armourT / (S.armourT + 10 * amt)); amt *= (1 - dr); }
    else if (elem === 'fire') amt *= 1 - S.resF / 100;
    else if (elem === 'cold') amt *= 1 - S.resC / 100;
    else if (elem === 'light') amt *= 1 - S.resL / 100;
    else if (elem === 'chaos') amt *= 1 - S.resX / 100;
    total += amt; if (dealt[elem] != null) dealt[elem] += amt;
  }
  if (supp) { total *= 0.5; G.texts.push({ x: pl.x, y: pl.y - 42, txt: '壓制', color: '#c8b0ff', size: 11, t: 0, dur: 0.6 }); }
  if (pl.ail && pl.ail.shock > 0) total *= 1.15; // 感電：受到的傷害 +15%
  if (!opts.dot) hitPoise(total);
  if (!opts.dot) applyPlayerAilments(dealt, parts.crit);
  if (pl.es > 0) { const a = Math.min(pl.es, total); pl.es -= a; total -= a; }
  pl.life -= total;
  pl.esDelay = 2;
  if (!opts.dot) { Sfx.play('hurt', Math.min(1.4, 0.5 + total / S.maxLife * 4)); if (total > S.maxLife * 0.2) G.hitstop = Math.max(G.hitstop || 0, 0.05); }   // v2.3 被重擊時也頓一下
  if (!opts.dot && total > S.maxLife * 0.08) { G.shake = Math.max(G.shake, 4); G.hurt = 0.35; }
  if (!opts.dot) { pl.flash = 0.1; G.texts.push({ x: pl.x + rnd(-6, 6), y: pl.y - 28, txt: (parts.crit ? '暴擊 ' : '') + Math.max(1, Math.round(total + 0.001)), color: parts.crit ? '#ff3030' : '#ff6060', size: parts.crit ? 15 : 12, t: 0, dur: 0.7 }); }
  if (pl.life <= 0) playerDie();
}
// v1.6 硬直與堅忍值：每次被打，依「這下打掉幾 % 生命」扣堅忍值；扣到 0 就硬直（不能動、不能放技能），
// 然後堅忍值補滿並有一小段時間不會再被打到硬直。1.5 秒沒被打，堅忍值會快速回滿。
function hitPoise(total) {
  const pl = G.pl, S = G.S;
  if (pl.poise == null) pl.poise = S.poiseT;
  pl.poiseHit = 0;
  if (S.flags.noStun) return; // 質變天賦「不動明王」：不會硬直
  if (pl.stunImm > 0 || pl.stun > 0) return;
  const pct = total / Math.max(1, S.maxLife) * 100;   // 這一下打掉的生命百分比
  pl.poise -= pct * 1.6;
  if (pct > 18) pl.flinch = 0.12;                    // 很痛的一下：身體一頓
  if (pl.poise <= 0) {
    pl.stun = STUN_TIME; pl.stunImm = STUN_TIME + 1.2; pl.poise = S.poiseT;
    pl.act = Math.max(pl.act || 0, STUN_TIME);
    G.texts.push({ x: pl.x, y: pl.y - 48, txt: '硬直！', color: '#ffd060', size: 14, t: 0, dur: 0.9 });
    Sfx.play('stun');
    G.shake = Math.max(G.shake, 6);
  }
}
function tickPoise(dt) {
  const pl = G.pl, S = G.S;
  if (pl.poise == null) pl.poise = S.poiseT;
  pl.poiseHit = (pl.poiseHit || 0) + dt;
  if (pl.stun > 0) pl.stun -= dt;
  if (pl.stunImm > 0) pl.stunImm -= dt;
  if (pl.flinch > 0) pl.flinch -= dt;
  if (pl.poiseHit > 1.5) pl.poise = Math.min(S.poiseT, pl.poise + S.poiseT * 0.8 * dt);
  pl.poise = Math.min(pl.poise, S.poiseT);
}
// v1.2：角色也會中異常狀態（被怪物的元素／毒素攻擊打到時）
function applyPlayerAilments(d, crit) {
  const pl = G.pl, S = G.S, a = pl.ail || (pl.ail = { poison: [] });
  const say = (t, c) => G.texts.push({ x: pl.x + rnd(-8, 8), y: pl.y - 46, txt: t, color: c, size: 11, t: 0, dur: 0.8 });
  if (d.fire > S.maxLife * 0.02 && Math.random() < 0.25) {             // 點燃：3 秒持續火焰傷害
    const dps = d.fire * 0.2; if (!a.ign || a.ign.dps < dps) { if (!a.ign) say('點燃', '#ff7a30'); a.ign = { dps, t: 3 }; }
  }
  if (d.cold > 0.5) {                                                   // 冰緩：2 秒移動變慢 30%；一次被打很痛就冰凍 0.4 秒
    if (!(a.chill > 0)) say('冰緩', '#7fd0ff'); a.chill = 2;
    if (d.cold > S.maxLife * 0.15 && !(a.frozen > 0) && !(a.frzImm > 0)) { a.frozen = 0.4; a.frzImm = 2.5; say('冰凍', '#bfefff'); }
  }
  if (d.light > S.maxLife * 0.02 && Math.random() < 0.25) { if (!(a.shock > 0)) say('感電', '#ffe95a'); a.shock = 3; } // 感電：受到傷害 +15%
  if (d.chaos > 0.5 && Math.random() < 0.35 && a.poison.length < 10) { if (!a.poison.length) say('中毒', '#7ae060'); a.poison.push({ dps: d.chaos * 0.15, t: 3 }); }
  if (d.phys > 0.5 && crit && Math.random() < 0.4) {                    // 流血：被暴擊時
    const dps = d.phys * 0.2; if (!a.bleed || a.bleed.dps < dps) { if (!a.bleed) say('流血', '#e83a3a'); a.bleed = { dps, t: 3 }; }
  }
}
function tickPlayerAilments(dt) {
  const pl = G.pl, a = pl.ail; if (!a) return;
  let dmg = 0;
  if (a.ign) { dmg += a.ign.dps * dt; if ((a.ign.t -= dt) <= 0) a.ign = null; }
  if (a.bleed) { dmg += a.bleed.dps * dt; if ((a.bleed.t -= dt) <= 0) a.bleed = null; }
  if (a.poison.length) { for (const p of a.poison) { dmg += p.dps * dt; p.t -= dt; } a.poison = a.poison.filter(p => p.t > 0); }
  for (const k of ['chill', 'frozen', 'shock', 'frzImm']) if (a[k] > 0) a[k] -= dt;
  if (dmg > 0 && !G.dead) {
    if (pl.es > 0) { const s = Math.min(pl.es, dmg); pl.es -= s; dmg -= s; }
    pl.life -= dmg;
    if (pl.life <= 0) playerDie();
  }
}
function damageMinion(mn, amt) { mn.life -= amt; mn.flash = 0.08; }
function playerDie() {
  G.dead = true; Sfx.play('die');
  const P = G.P;
  const loss = Math.round(xpNeed(P.lvl) * 0.05);
  P.xp = Math.max(0, P.xp - loss);
  // 地圖裡如果已經開過傳送門，死後還能從城鎮回去
  const w = G.world;
  const keep = w.kind === 'map' && !!w.portal;
  if (keep) G.savedMap = { world: w, mons: G.mons, loot: G.loot, bossBar: G.bossBar };
  else if (w.kind === 'map') G.savedMap = null;
  setHubFromWorld(w);
  UI.showDeath(loss, keep);
  storyBeat('firstDeath');
  saveGame();
}
// 怪物也會暴擊（1.5 倍傷害）：普通 5%、魔法 7%、稀有 10%、首領 8%
function monsterParts(m, mult, elemOverride) {
  const crit = Math.random() * 100 < (m.critCh || 5);
  const amt = rnd(m.dmg[0], m.dmg[1]) * mult * (crit ? 1.5 : 1);
  const elem = elemOverride || m.def.elem || 'phys';
  const parts = [[amt, elem]];
  if (m.addElem) parts.push([amt * 0.35, m.addElem]);
  parts.crit = crit;
  return parts;
}
function monsterStrike(m, target, mult = 1, elemOverride, opts = {}) {
  if (target === G.pl) {
    damagePlayer(monsterParts(m, mult, elemOverride), opts);
    if (m.vamp) m.life = Math.min(m.maxLife, m.life + m.maxLife * 0.03);
  } else damageMinion(target, rnd(m.dmg[0], m.dmg[1]) * mult);
}
function enemyProj(m, ang, speed, mult, sprite, elem, spell) {
  G.projs.push({ team: 'enemy', x: m.x, y: m.y - 8, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: sprite === 'fireball' ? 7 : 5,
    life: 2.2, parts: monsterParts(m, mult * (m.mlvl < 40 ? 0.6 + 0.4 * m.mlvl / 40 : 1), elem), spell, sprite, owner: m, color: ELEM_COLOR[elem || m.def.elem || 'phys'] });
}

// ---------- 怪物 AI ----------
function nearestTarget(m, range) {
  let best = null, bd = range;
  const pl = G.pl;
  const dp = dist(m, pl);
  if (dp < bd) { best = pl; bd = dp; }
  // 石魔像會嘲諷：怪物會優先打它
  for (const mn of G.mins) { const d = dist(m, mn) * (mn.taunt ? 0.4 : 1); if (d < bd - 20) { bd = d; best = mn; } }
  return best;
}
function updateMonster(m, dt) {
  const pl = G.pl;
  if (m.boss) return bossAI(m, dt);
  const dpl = dist(m, pl);
  if (dpl > 1000 && !m.aggro) return;
  if (m.kx || m.ky) {
    moveEnt(m, m.kx * dt, m.ky * dt);
    const f = Math.pow(0.0005, dt); m.kx *= f; m.ky *= f;
    if (Math.abs(m.kx) + Math.abs(m.ky) < 5) m.kx = m.ky = 0;
  }
  if (m.stagger > 0) { m.stagger -= dt; return; }
  if (m.regen) m.life = Math.min(m.maxLife, m.life + m.maxLife * m.regen * dt);
  const slow = m.chill > 0 ? 1 - m.chillAmt : 1;
  const tgt = nearestTarget(m, m.aggro ? 700 : 330);
  if (tgt) m.aggro = true;
  if (m.state === 'wind') {
    m.wind -= dt * slow;
    if (m.wind <= 0) {
      m.state = 'idle'; m.atkCD = 1 / m.aspd;
      if (m.tgt && !m.tgt.dead) {
        if (m.def.ranged) enemyProj(m, Math.atan2(m.tgt.y - m.y, m.tgt.x - m.x), m.def.pspeed, 1, m.def.psprite, null, m.def.spell);
        else if (dist(m, m.tgt) <= m.range + m.r + m.tgt.r + 10) monsterStrike(m, m.tgt);
      }
    }
    return;
  }
  m.atkCD -= dt * slow;
  if (!tgt) return;
  const d = dist(m, tgt);
  const inRange = m.def.ranged ? (d <= m.range && shotLos(m.x, m.y, tgt.x, tgt.y)) : d <= m.range + m.r + tgt.r;
  if (inRange && m.atkCD <= 0) {
    m.state = 'wind'; m.wind = m.def.ranged ? 0.45 : 0.32; m.tgt = tgt; m.facing = tgt.x > m.x ? 1 : -1;
    return;
  }
  if (m.def.ranged && inRange && d < 120) {
    const a = Math.atan2(m.y - tgt.y, m.x - tgt.x);
    moveEnt(m, Math.cos(a) * m.speed * slow * dt, Math.sin(a) * m.speed * slow * dt);
  } else if (!inRange || !m.def.ranged) {
    if (d > m.range + m.r + tgt.r - 4) steerToward(m, tgt.x, tgt.y, m.speed * slow, dt, tgt === pl);
  }
}
function separate() {
  const arr = G.mons, pl = G.pl;
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i]; if (a.dead || Math.abs(a.x - pl.x) > 700 || Math.abs(a.y - pl.y) > 500) continue;
    for (let j = i + 1; j < arr.length; j++) {
      const b = arr[j]; if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
      if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
      const d = Math.hypot(dx, dy) || 0.01;
      if (d < rr) {
        const push = (rr - d) / 2, nx = dx / d, ny = dy / d;
        const wa = a.boss ? 0.1 : 1, wb = b.boss ? 0.1 : 1;
        moveEnt(a, -nx * push * wa, -ny * push * wa); moveEnt(b, nx * push * wb, ny * push * wb);
      }
    }
  }
}

// ---------- 首領 AI ----------
// 首領招式的元素跟著首領走（火焰巫后＝火、沼澤魔女＝毒、沙之法老＝雷…）
const ELEM_COLOR = { phys: '#d8d0c0', fire: '#ff7030', cold: '#a0e0ff', light: '#fff070', chaos: '#90e060' };
const bossEl = b => b.def.elem || 'phys';
const bossOrb = b => bossEl(b) === 'fire' ? 'fireball' : 'orb';
const BOSS_ABILITIES = {
  boneking: [
    { id: 'summon', cd: 11, cond: (b) => G.mons.filter(m => m.summoned && !m.dead).length < 6, cast: 0.8,
      start: b => tele('circle', b.x, b.y, 50, 0.8, '#c040ff'),
      fire: b => { for (let i = 0; i < 3; i++) { const p = randomFloorNear(b.x, b.y, 70); const s = makeMonster(b.def.minion || 'skeleton', p.x, p.y, b.mlvl - 1, 'normal', G.world.theme); s.summoned = true; s.aggro = true; G.mons.push(s); burst(p.x, p.y, '#c040ff', 10); } } },
    { id: 'slam', cd: 4.5, cond: (b, d) => d < 420, cast: 1.0,
      start: b => { b.tx = G.pl.x; b.ty = G.pl.y; tele('circle', b.tx, b.ty, 78, 1.0, '#ff4040'); },
      fire: b => { G.fx.push({ k: 'ring', x: b.tx, y: b.ty, r: 78, t: 0, dur: 0.3, color: '#ffb0a0', fill: 'rgba(255,80,60,0.3)' }); G.shake = 8; if (Math.hypot(G.pl.x - b.tx, G.pl.y - b.ty) < 78 + G.pl.r) monsterStrike(b, G.pl, 1.9, null, { spell: true }); burst(b.tx, b.ty, '#c0a0a0', 20, 200); } },
    { id: 'swipe', cd: 1.6, cond: (b, d) => d < b.r + 56, cast: 0.45,
      start: b => { b.ang = Math.atan2(G.pl.y - b.y, G.pl.x - b.x); tele('circle', b.x + Math.cos(b.ang) * 40, b.y + Math.sin(b.ang) * 40, 52, 0.45, '#ff8040'); },
      fire: b => { const cx = b.x + Math.cos(b.ang) * 40, cy = b.y + Math.sin(b.ang) * 40; G.fx.push({ k: 'slash', x: b.x, y: b.y, ang: b.ang, r: 90, arc: 2, t: 0, dur: 0.18, color: '#ffd0c0' }); if (Math.hypot(G.pl.x - cx, G.pl.y - cy) < 52 + G.pl.r) monsterStrike(b, G.pl, 1); } },
  ],
  witch: [
    { id: 'teleport', cd: 7, cond: () => true, cast: 0.4, start: b => burst(b.x, b.y, '#ff9a20', 20),
      fire: b => { const r = G.world.boss; for (let i = 0; i < 20; i++) { const x = (r.x + rnd(2, r.w - 2)) * TS, y = (r.y + rnd(2, r.h - 2)) * TS; if (Math.hypot(x - G.pl.x, y - G.pl.y) > 200 && !blockedCircle(x, y, b.r)) { b.x = x; b.y = y; break; } } burst(b.x, b.y, '#ff9a20', 20); } },
    { id: 'ring', cd: 5, cond: () => true, cast: 0.7, start: b => tele('circle', b.x, b.y, 40, 0.7, '#ff9a20'),
      fire: b => { const n = b.life < b.maxLife / 2 ? 14 : 10; const off = Math.random(); for (let i = 0; i < n; i++) enemyProj(b, off + i * Math.PI * 2 / n, 210, 0.8, bossOrb(b), bossEl(b), true); } },
    { id: 'pool', cd: 6, cond: () => true, cast: 0.5,
      start: b => { b.tx = G.pl.x; b.ty = G.pl.y; tele('circle', b.tx, b.ty, 62, 1.0, ELEM_COLOR[bossEl(b)]); },
      fire: b => { G.zones.push({ x: b.tx, y: b.ty, r: 62, dps: (b.dmg[0] + b.dmg[1]) / 2 * 0.55, t: 0, dur: 4.5, elem: bossEl(b) }); } },
    { id: 'barrage', cd: 1.8, cond: () => true, cast: 0.5, start: () => { },
      fire: b => { const a = Math.atan2(G.pl.y - b.y, G.pl.x - b.x); for (let i = -1; i <= 1; i++) enemyProj(b, a + i * 0.22, 300, 0.75, bossOrb(b), bossEl(b), true); } },
  ],
  beast: [
    { id: 'charge', cd: 6, cond: (b, d) => d > 110, cast: 0.8,
      start: b => { b.ang = Math.atan2(G.pl.y - b.y, G.pl.x - b.x); tele('line', b.x, b.y, 34, 0.8, '#60c0ff', b.ang, 430); },
      fire: b => { b.dash = 0.82; b.dashHit = false; } },
    { id: 'nova', cd: 7, cond: (b, d) => d < 260, cast: 1.0, start: b => tele('circle', b.x, b.y, 155, 1.0, '#80d8ff'),
      fire: b => { G.fx.push({ k: 'ring', x: b.x, y: b.y, r: 155, t: 0, dur: 0.35, color: '#c8f4ff', fill: 'rgba(140,220,255,0.3)' }); if (dist(b, G.pl) < 155 + G.pl.r) monsterStrike(b, G.pl, 1.4, bossEl(b), { spell: true }); burst(b.x, b.y, '#c8f4ff', 30, 300); } },
    { id: 'shards', cd: 3, cond: () => true, cast: 0.5, start: () => { },
      fire: b => { const a = Math.atan2(G.pl.y - b.y, G.pl.x - b.x); for (let i = -2; i <= 2; i++) enemyProj(b, a + i * 0.16, 340, 0.7, bossEl(b) === 'cold' ? 'iceshard' : 'orb', bossEl(b), false); } },
    { id: 'bite', cd: 1.4, cond: (b, d) => d < b.r + 44, cast: 0.4, start: () => { },
      fire: b => { if (dist(b, G.pl) < b.r + 50) monsterStrike(b, G.pl, 1.1); G.fx.push({ k: 'slash', x: b.x, y: b.y, ang: Math.atan2(G.pl.y - b.y, G.pl.x - b.x), r: 70, arc: 1.4, t: 0, dur: 0.15, color: '#d0f0ff' }); } },
  ],
};
// 守門人：混用三個看守者的招式，生命剩一半後會召喚自己的影子
BOSS_ABILITIES.keeper = [
  { id: 'shadows', cd: 14, cond: b => b.life < b.maxLife * 0.5 && G.mons.filter(m => m.shadow && !m.dead).length < 4, cast: 0.9,
    start: b => tele('circle', b.x, b.y, 60, 0.9, '#a080ff'),
    fire: b => {
      for (let i = 0; i < 2; i++) {
        const p = randomFloorNear(b.x, b.y, 90);
        const s = makeMonster('skeleton', p.x, p.y, b.mlvl - 2, 'magic', G.world.theme);
        s.shadow = true; s.summoned = true; s.aggro = true; s.name = '過去的影子';
        s.tint = { W: '#4a3a6a', r: '#c0a0ff' };
        G.mons.push(s); burst(p.x, p.y, '#a080ff', 14);
      }
      UI.msg('守門人：「這些都是你。每一個放棄的你。」', '#c8b0ff');
    } },
  ...BOSS_ABILITIES.beast.filter(a => ['charge', 'nova', 'shards'].includes(a.id)),
  ...BOSS_ABILITIES.witch.filter(a => ['ring', 'pool'].includes(a.id)),
  ...BOSS_ABILITIES.boneking.filter(a => ['slam', 'swipe'].includes(a.id)),
];
const BOSS_LINES = { boneking: '跪下，成為我的骨。', witch: '燒吧……全部燒掉。', beast: '（低沉的咆哮）',
  nm_bone: '我的王國……還沒有亡！', nm_ash: '學生啊，你終究還是來了。', nm_frost: '（大地在牠的腳下結冰）', keeper: '你又來了。這次，你打算醒來嗎？' };
function tele(shape, x, y, r, dur, color, ang, len) { G.teles.push({ shape, x, y, r, dur, t: 0, color, ang, len }); }
function bossAI(b, dt) {
  const pl = G.pl;
  if (!b.awake) {
    const arena = G.world.arena;
    if ((!arena && inBossRoom(pl)) || dist(b, pl) < (arena ? 380 : 300)) { b.awake = true; G.bossBar = b; Sfx.play('bossroar'); G.shake = Math.max(G.shake, 6); UI.msg(BOSS_LINES[b.boss] ? `${b.name}：「${BOSS_LINES[b.boss]}」` : `${b.name}醒了！`, '#ff9a6a'); }
    else return;
  }
  const enr = b.life < b.maxLife * 0.5 ? 0.65 : 1;
  const slow = b.chill > 0 ? 1 - b.chillAmt * 0.5 : 1;
  const abil = BOSS_ABILITIES[b.def.ai || b.boss];
  const cdm = b.def.cdMult || 1;
  for (const a of abil) b.cds[a.id] = (b.cds[a.id] ?? a.cd * 0.5 * cdm) - dt;
  if (b.dash > 0) {
    b.dash -= dt;
    const sp = 540 * dt;
    const ox = b.x, oy = b.y;
    moveEnt(b, Math.cos(b.ang) * sp, Math.sin(b.ang) * sp);
    if (Math.abs(b.x - ox) + Math.abs(b.y - oy) < 1) b.dash = 0;
    if (!b.dashHit && dist(b, pl) < b.r + pl.r + 6) { b.dashHit = true; monsterStrike(b, pl, 1.6); G.shake = 7; }
    if (Math.random() < 0.5) G.parts.push({ x: b.x + rnd(-10, 10), y: b.y + rnd(-10, 10), vx: 0, vy: 0, t: 0, dur: 0.4, color: '#a8e0ff', s: 3 });
    return;
  }
  if (b.casting) {
    b.castT -= dt * slow;
    if (b.castT <= 0) { const a = b.casting; b.casting = null; a.fire(b); }
    return;
  }
  const d = dist(b, pl);
  for (const a of abil) {
    if (b.cds[a.id] <= 0 && a.cond(b, d)) {
      b.casting = a; b.castT = a.cast; b.cds[a.id] = a.cd * enr * cdm; a.start(b);
      b.facing = pl.x > b.x ? 1 : -1;
      return;
    }
  }
  const keep = b.boss === 'witch' ? 230 : b.r + pl.r + 8;
  if (d > keep) steerToward(b, pl.x, pl.y, b.speed * slow, dt, true);
  else if (b.boss === 'witch' && d < 160) { const a = Math.atan2(b.y - pl.y, b.x - pl.x); moveEnt(b, Math.cos(a) * b.speed * dt, Math.sin(a) * b.speed * dt); }
}

// ---------- 召喚物 AI ----------
function updateMinion(mn, dt) {
  const pl = G.pl;
  if (dist(mn, pl) > 800) { mn.x = pl.x + rnd(-20, 20); mn.y = pl.y + rnd(-20, 20); }
  mn.atkCD -= dt;
  // v2.13.8 召喚物走路：只挑「看得到」的怪（不然會直線卡在牆邊）；走不動 1.5 秒就回到你身邊
  let tgt = null, bd = 320;
  for (const m of G.mons) { if (m.dead) continue; if (m.boss && !m.awake) continue; const d = dist(m, mn); if (d < bd && !m.hidden && dist(m, pl) < 450 && (mn.ranged ? shotLos : los)(mn.x, mn.y, m.x, m.y)) { bd = d; tgt = m; } }
  const ox = mn.x, oy = mn.y;
  const pk = { d: { phys: mn.dmg }, crit: 5, multi: 150 };
  if (tgt && mn.ranged) { // 靈體：遠程射擊
    if (bd <= mn.ranged && shotLos(mn.x, mn.y, tgt.x, tgt.y)) {
      if (mn.atkCD <= 0) {
        mn.atkCD = 1 / mn.aps;
        const a0 = Math.atan2(tgt.y - mn.y, tgt.x - mn.x), n = mn.count || 1;   // v2.13.5 多重投射：扇形多射幾發
        for (let k = 0; k < n; k++) {
          const a = a0 + (n > 1 ? (k - (n - 1) / 2) * 0.22 : 0);
          G.projs.push({ team: 'ally', x: mn.x, y: mn.y - 6, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, r: 5, life: 1.2, pk: { d: { chaos: mn.dmg }, crit: 5, multi: 150 },
            pierce: 0, hit: new Set(), explode: 0, sprite: 'shadow', fromMinion: true, tags: ['projectile', 'minion'] });
        }
      }
      // 遠程站位：離你太遠就回來；怪貼太近就往後退（不往怪群裡衝）
      if (dist(mn, pl) > 130) steerToward(mn, pl.x, pl.y, mn.speed, dt, true);
      else if (bd < 110) { const a = Math.atan2(mn.y - tgt.y, mn.x - tgt.x); moveEnt(mn, Math.cos(a) * mn.speed * 0.7 * dt, Math.sin(a) * mn.speed * 0.7 * dt); }
    } else {
      // 目標在射程外：只在你身邊 170 以內往前挪一點，不追過去
      const nx = mn.x + (tgt.x - mn.x) * 0.2, ny = mn.y + (tgt.y - mn.y) * 0.2;
      if (Math.hypot(nx - pl.x, ny - pl.y) < 170) steerToward(mn, tgt.x, tgt.y, mn.speed, dt, false);
      else if (dist(mn, pl) > 80) steerToward(mn, pl.x, pl.y, mn.speed, dt, true);
    }
  } else if (tgt) {
    if (bd <= mn.r + tgt.r + 12) {
      if (mn.atkCD <= 0) {
        mn.atkCD = 1 / mn.aps;
        hitMonster(tgt, pk, true, mn, mn.mtype === 'golem' ? 1.4 : 0.6);
        G.fx.push({ k: 'slash', x: mn.x, y: mn.y, ang: Math.atan2(tgt.y - mn.y, tgt.x - mn.x), r: mn.r + 16, arc: 1.4, t: 0, dur: 0.12, color: '#d0ffd0' });
      }
    } else steerToward(mn, tgt.x, tgt.y, mn.speed, dt, false);
  } else if (dist(mn, pl) > 70) steerToward(mn, pl.x, pl.y, mn.speed, dt, true);
  // 卡住偵測：想走卻幾乎沒動，累積 1.5 秒就傳回你身邊
  const moved = Math.hypot(mn.x - ox, mn.y - oy), wants = tgt ? bd > mn.r + tgt.r + 12 && !mn.ranged : dist(mn, pl) > 70;
  mn.stuckT = wants && moved < mn.speed * dt * 0.15 ? (mn.stuckT || 0) + dt : 0;
  if (mn.stuckT > 1.5 && dist(mn, pl) > 90) { const p = randomFloorNear(pl.x + rnd(-40, 40), pl.y + rnd(-40, 40), 30); mn.x = p.x; mn.y = p.y; mn.stuckT = 0; burst(mn.x, mn.y, '#c8a8ff', 8, 80); }
  // v2.15.3 召喚物互相推開（也不會疊在你身上），站成一圈而不是擠成一團
  for (const o of G.mins) { if (o === mn) continue; const dx = mn.x - o.x, dy = mn.y - o.y, dd = Math.hypot(dx, dy) || 0.01, md = mn.r + o.r + 6; if (dd < md) { const k = (md - dd) * 0.5; moveEnt(mn, dx / dd * k, dy / dd * k); } }
  { const dx = mn.x - pl.x, dy = mn.y - pl.y, dd = Math.hypot(dx, dy) || 0.01, md = mn.r + pl.r + 4; if (dd < md) moveEnt(mn, dx / dd * (md - dd), dy / dd * (md - dd)); }
}

// ---------- 特效小工具 ----------
function burst(x, y, color, n = 12, sp = 120) {
  if (CFG.particles === 'low') n = Math.ceil(n / 3);   // v2.4 精簡特效
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = rnd(sp * 0.3, sp);
    G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, dur: rnd(0.3, 0.7), color, s: rint(2, 4) });
  }
}

// ---------- 撿東西 ----------
function pickupLoot(l) {
  const P = G.P;
  Sfx.play(l.cur || l.mat ? 'coin' : 'pickup');
  if (l.cur) { P.cur[l.cur]++; UI.msg(`撿到 ${CURRENCY[l.cur].name}`, '#e8d8a8'); }
  else if (l.gem) { P.supports[l.gem] = (P.supports[l.gem] || 0) + 1; UI.msg(`撿到輔助寶石：${SUPPORTS[l.gem].name}（按 K 插到技能上）`, '#3fd8b8'); UI.refreshSkills(); }
  else if (l.skill) {
    if (hasSkillGem(P, l.skill)) { P.cur.alter++; UI.msg(`已經會「${SKILLS[l.skill].name}」了，換成 1 顆改造石`, '#d8c8a0'); }
    else { P.skillGems[l.skill] = true; if (typeof shareSkillGem === 'function') shareSkillGem(l.skill); UI.msg(`學會新技能：${SKILLS[l.skill].name}（按 K 裝上）`, '#ffd27a'); UI.refreshSkills(); }
  }
  else if (l.mat) { P.mats = P.mats || {}; P.mats[l.mat] = (P.mats[l.mat] || 0) + 1; UI.msg(`撿到材料：${matName(l.mat)}（按 B 到工坊使用）`, l.color); if (UI.refreshCraft) UI.refreshCraft(); }
  else if (l.jewel) { P.jewels[l.jewel] = (P.jewels[l.jewel] || 0) + 1; UI.msg(`撿到珠寶：${jewelName(l.jewel)}（按 G 鑲嵌）`, l.color); UI.refreshJewels(); }
  else if (l.frag) { P.frags[l.frag]++; UI.msg(`撿到 ${NIGHTMARES[l.frag].frag}（${P.frags[l.frag]}/${FRAG_NEED}）`, NIGHTMARES[l.frag].color); }
  else if (l.key) { P.keys[l.key]++; UI.msg(`撿到 ${NIGHTMARES[l.key].key}`, NIGHTMARES[l.key].color); }
  else if (!autoEquipPickup(l.item)) {
    const idx = P.inv.indexOf(null);
    if (idx < 0) return msgOnce('full', '背包已滿（Ctrl+左鍵 可分解物品）');
    P.inv[idx] = l.item;
  }
  l.gone = true;
  UI.refreshInv();
}
// 撿到裝備時：如果那個部位是空的（而且能穿），就直接穿上；藥劑欄有空格就直接放上去
function autoEquipPickup(it) {
  const P = G.P;
  if (isFlask(it)) {
    const j = P.flaskSlots.indexOf(null); if (j < 0) return false;
    P.flaskSlots[j] = it; syncFlasks(false); UI.msg(`放上藥劑欄 ${j + 1}：${it.name}`, '#9fff9f'); return true;
  }
  const b = BASE_BY_ID[it.base]; if (!b || canEquip(it)) return false;
  let slot = b.slot;
  if (slot === 'ring') slot = !P.equip.ring1 ? 'ring1' : !P.equip.ring2 ? 'ring2' : null;
  if (!slot || P.equip[slot]) return false;
  const w = P.equip.weapon ? BASE_BY_ID[P.equip.weapon.base] : null, off = P.equip.offhand ? BASE_BY_ID[P.equip.offhand.base] : null;
  if (slot === 'offhand') { if (b.cls === 'quiver' ? !(w && w.cls === 'bow') : (w && w.hands === 2)) return false; }
  if (slot === 'weapon' && off) { if (off.cls === 'quiver' ? b.cls !== 'bow' : b.hands === 2) return false; }
  P.equip[slot] = it; onBuildChanged(); Sfx.play('equip');
  UI.msg(`自動裝備：${it.name}`, RARITY_COLOR[it.rarity]);
  return true;
}
// v1.9.1：珠寶、通貨、材料走過去就自動撿；裝備、藥劑、技能／輔助寶石、碎片、鑰匙還是要點一下
function autoPickup() {
  const pl = G.pl;
  for (const l of G.loot) {
    if (l.gone || l.t < 0.35) continue;
    if (!(l.jewel || l.cur || l.mat)) continue;
    if (dist(l, pl) < 34) pickupLoot(l);
  }
}
function pickupNearest() {
  let best = null, bd = 80;
  for (const l of G.loot) { if (l.gone) continue; const d = dist(l, G.pl); if (d < bd) { bd = d; best = l; } }
  if (best) pickupLoot(best);
}
// 依身上的 4 個藥劑欄，建立（或保留）每瓶的充能
function syncFlasks(full) {
  const P = G.P, pl = G.pl;
  // 用物品的 uid 對應：同一瓶藥劑換格子也保留原本的充能
  const prev = {};
  for (const f of pl.fl || []) if (f) prev[f.item.uid] = f.c;
  pl.fl = P.flaskSlots.map(it => {
    if (!it) return null;
    const st = flaskStats(it);
    const c = prev[it.uid] != null ? prev[it.uid] : (full ? st.max : 0);
    return { item: it, type: it.type, tier: it.tier, st, c: Math.min(st.max, c), max: st.max, use: st.use };
  });
}
function useFlask(i) {
  const pl = G.pl, f = pl.fl[i], S = G.S;
  if (!f) return msgOnce('fl' + i, `第 ${i + 1} 格沒有藥劑（在背包裡點藥劑就能放上來）`);
  if (f.c < f.use) return msgOnce('fl' + i, '藥劑充能不足（打怪或等一下會自動充能）');
  const st = f.st, F = FLASKS[f.type];
  if (!(st.free && Math.random() * 100 < st.free)) f.c -= f.use;
  else G.texts.push({ x: pl.x, y: pl.y - 40, txt: '不消耗', color: '#9fff9f', size: 11, t: 0, dur: 0.6 });
  if (st.reso) pl.fl.forEach(o => { if (o && o !== f) o.c = Math.min(o.max, o.c + st.reso); });
  if (F.heal) {
    const amt = (F.heal === 'life' ? S.maxLife : S.maxMana) * st.val / 100 * (1 + S.flask_inc / 100);
    // 同種回復不疊加：新喝的這瓶取代還沒回完的那瓶
    const kind = F.heal === 'life' ? 0 : 1;
    pl.heal = pl.heal.filter(h => h.kind !== kind);
    // v2.0：瞬間＝全部立刻回；沸騰＝一半立刻、一半慢慢回；應急＝低血時整瓶立刻回
    let now = st.inst ? 1 : st.bubble ? 0.5 : 0;
    if (st.panic && kind === 0 && pl.life < S.maxLife * LOW_LIFE) { now = 1; G.texts.push({ x: pl.x, y: pl.y - 48, txt: '應急！', color: '#ff8080', size: 12, t: 0, dur: 0.8 }); }
    if (now > 0) { const a = amt * now; if (kind === 0) pl.life = Math.min(S.maxLife, pl.life + a); else pl.mana = Math.min(S.maxMana, pl.mana + a); }
    if (now < 1) pl.heal.push({ kind, rate: amt * (1 - now) / st.dur, t: st.dur });
  } else {
    // 功能藥劑：同種不疊加，只刷新時間（效果取較高的）；不同種可以同時生效
    G.flaskBuffs = G.flaskBuffs || {};
    const cur = G.flaskBuffs[f.type];
    G.flaskBuffs[f.type] = { v: Math.max(st.val, cur ? cur.v : 0), t: st.dur * (1 + S.flask_inc / 100) };
    onBuildChanged();
  }
  burst(pl.x, pl.y - 10, F.color, 10, 80); Sfx.play('flask');
}
// 背包裡的藥劑放到藥劑欄：有空格就放空格，不然換掉 slot 那格（換下來的回背包同一格）
function equipFlask(invIdx, slot) {
  const P = G.P, it = P.inv[invIdx];
  if (!isFlask(it)) return;
  if (slot == null) slot = P.flaskSlots.indexOf(null);
  if (slot < 0) return false;
  P.inv[invIdx] = P.flaskSlots[slot] || null; P.flaskSlots[slot] = it;
  syncFlasks(G.world === G.town);
  return true;
}
function unequipFlask(slot) {
  const P = G.P, it = P.flaskSlots[slot]; if (!it) return;
  const j = P.inv.indexOf(null);
  if (j < 0) return UI.msg('背包已滿', '#ff9a9a');
  P.inv[j] = it; P.flaskSlots[slot] = null;
  syncFlasks(false);
}

// ---------- 主更新 ----------
function update(dt) {
  if (G.slowmo > 0) { G.slowmo -= dt; dt *= 0.3; }   // v2.3 首領倒下的慢動作
  G.time += dt;
  const pl = G.pl, S = G.S, w = G.world;
  G.parts.forEach(p => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; });
  G.parts = G.parts.filter(p => p.t < p.dur);
  G.texts.forEach(t => { t.t += dt; t.y -= (t.pop ? 44 * Math.max(0.25, 1 - t.t / t.dur) : 26) * dt; if (t.vx) t.x += t.vx * dt * Math.max(0, 1 - t.t / t.dur); });
  G.texts = G.texts.filter(t => t.t < t.dur);
  G.msgs = G.msgs.filter(m => G.time - m.t < 7);
  // 暫停（劇情、對話、天賦樹…）時把按鍵狀態清掉，避免放開按鍵的訊號被吃掉而一直卡著走
  if (G.dead || UI.paused()) { input.keys = {}; input.l = input.r = false; return; }

  // 移動
  let mx = 0, my = 0;
  const k = input.keys;
  if (k.KeyW || k.ArrowUp) my -= 1; if (k.KeyS || k.ArrowDown) my += 1;
  if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1;
  if (input.joy && Math.hypot(input.joy.x, input.joy.y) > 0.15) { mx = input.joy.x; my = input.joy.y; } // 手機搖桿
  const pa = pl.ail || {};
  if (pa.frozen > 0 || pl.stun > 0 || pl.flinch > 0) { mx = 0; my = 0; } // 冰凍、硬直、被重擊的一頓：不能動
  if (mx || my) {
    const l = Math.hypot(mx, my);
    const sp = S.moveSpeed * (pl.act > 0 ? 0.6 : 1) * (pa.chill > 0 ? 0.7 : 1) * (input.joy ? Math.min(1, l / 0.55) : 1);
    moveEnt(pl, mx / l * sp * dt, my / l * sp * dt);
    pl.walk += dt * 10;
    if (mx && pl.act <= 0) pl.facing = mx > 0 ? 1 : -1;
    pl.mdx = mx / l; pl.mdy = my / l;   // v2.16.2 最後移動的方向（空白鍵位移照這個方向）
  }
  input.wx = input.mx + G.cam.x; input.wy = input.my + G.cam.y;
  // 技能
  pl.act -= dt; pl.swing = (pl.swing || 0) - dt;
  for (const s in pl.cd) { const was = pl.cd[s]; pl.cd[s] -= dt; if (was > 0 && pl.cd[s] <= 0) (pl.cdFlash || (pl.cdFlash = {}))[s] = 0.3; }
  for (const s in (pl.cdFlash || {})) pl.cdFlash[s] -= dt;
  if (input.l && !UI.mouseOverUI) useSkill(0);
  if (input.r && !UI.mouseOverUI) useSkill(1);
  if (k.KeyQ) useSkill(2); if (k.KeyE) useSkill(3); if (k.KeyR) useSkill(4);
  // 回復
  const rg = (w.mm && w.mm.regen) || 1;
  pl.life = Math.min(S.maxLife, pl.life + S.lifeRegenPS * dt * rg);
  pl.mana = Math.min(S.maxMana, pl.mana + S.manaRegenPS * dt * rg);
  tickPlayerAilments(dt);
  tickPoise(dt);
  pl.esDelay -= dt;
  if (pl.esDelay <= 0) pl.es = Math.min(S.maxES, pl.es + S.maxES * 0.33 * dt);
  // 藥劑：自動慢慢充能；功能藥劑時間到就失效
  for (const f of pl.fl) if (f) f.c = Math.min(f.max, f.c + FLASK_RECHARGE * f.st.auto * dt);
  // 「之急救」：生命太低時自動喝（正在回復中就不重複喝）
  pl.fl.forEach((f, i) => { if (f && f.st.emerg && pl.life < S.maxLife * f.st.emerg / 100 && f.c >= f.st.use && !pl.heal.some(h => h.kind === 0)) useFlask(i); });
  if (G.flaskBuffs) {
    let changed = false;
    for (const k in G.flaskBuffs) if ((G.flaskBuffs[k].t -= dt) <= 0) { delete G.flaskBuffs[k]; changed = true; }
    if (changed) onBuildChanged();
  }
  pl.heal = pl.heal.filter(h => {
    const a = h.rate * Math.min(dt, h.t); h.t -= dt;
    if (h.kind === 0) pl.life = Math.min(S.maxLife, pl.life + a); else pl.mana = Math.min(S.maxMana, pl.mana + a);
    return h.t > 0;
  });
  pl.flash -= dt;

  // 流場
  if (w.kind === 'map') { w.flowT -= dt; if (w.flowT <= 0) { updateFlow(); w.flowT = 0.3; } }
  // 怪物
  for (const m of G.mons) {
    if (m.dead) continue;
    m.flash -= dt; m.chill -= dt;
    tickAilments(m, dt);
    if (m.dead || m.frozen > 0) continue; // 冰凍中完全不能動
    updateMonster(m, dt);
  }
  if (G.targetT > 0) G.targetT -= dt;
  separate();
  G.mons = G.mons.filter(m => !m.dead);
  // 召喚物
  for (const mn of G.mins) { mn.flash -= dt; updateMinion(mn, dt); }
  G.mins = G.mins.filter(mn => mn.life > 0);
  // 投射物
  for (const p of G.projs) {
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (shotWallAt(p.x, p.y)) { p.dead = true; if (p.explode) explodeAt(p); continue; }   // v2.13.9 岩漿、水、矮障礙飛得過去
    if (p.team === 'ally') {
      for (const m of G.mons) {
        if (m.dead || m.hidden || p.hit.has(m)) continue;
        if (Math.hypot(m.x - p.x, m.y - p.y) < m.r + p.r) {
          if (p.explode) { explodeAt(p); p.dead = true; break; }
          const nth = p.cast ? (p.cast.get(m) || 0) : 0; if (p.cast) p.cast.set(m, nth + 1);
          hitMonster(m, nth ? scalePk(p.pk, PROJ_SHOTGUN) : p.pk, !!p.fromMinion, { x: p.x - p.vx * 0.05, y: p.y - p.vy * 0.05 }, nth ? 0.4 : 0.9); p.hit.add(m);
          if (!p.fromMinion) projKeystones(p, m);
          if (p.pierce > 0) p.pierce--; else { p.dead = true; break; }
        }
      }
    } else {
      if (dist(p, pl) < pl.r + p.r) { damagePlayer(p.parts, { spell: p.spell }); p.dead = true; continue; }
      for (const mn of G.mins) if (dist(p, mn) < mn.r + p.r) { damageMinion(mn, p.parts[0][0]); p.dead = true; break; }
    }
    if (p.sprite === 'fireball' && Math.random() < 0.6) G.parts.push({ x: p.x, y: p.y, vx: rnd(-20, 20), vy: rnd(-20, 20), t: 0, dur: 0.3, color: p.team === 'ally' ? '#ff9a40' : '#ff6030', s: 3 });
  }
  G.projs = G.projs.filter(p => !p.dead && p.life > 0);
  // 地面效果
  for (const z of G.zones) { z.t += dt; if (dist(z, pl) < z.r) damagePlayer([[z.dps * dt, z.elem || 'fire']], { dot: true }); }
  G.zones = G.zones.filter(z => z.t < z.dur);
  for (const t of G.teles) {
    t.t += dt;
    if (t.t >= t.dur) t.done = true;
  }
  G.teles = G.teles.filter(t => !t.done);
  updateStrikes(dt);
  if (pl.buff) { pl.buff.t -= dt; if (pl.buff.t <= 0) pl.buff = null; }
  // 法術回響
  for (const e of G.echoQ) { e.t -= dt; if (e.t <= 0) { e.done = true; castSkill(e.sid, e.c); } }
  G.echoQ = G.echoQ.filter(e => !e.done);
  G.fx.forEach(f => f.t += dt); G.fx = G.fx.filter(f => f.t < f.dur);
  // 掉落物
  G.loot.forEach(l => l.t += dt);   // v1.2：裝備要點擊（或空白鍵）才撿
  if (CFG.autoPick) autoPickup();     // v1.9.1：珠寶、通貨走過去自動撿
  G.loot = G.loot.filter(l => !l.gone);
  // 探索
  G.exploreT = (G.exploreT || 0) - dt;
  if (G.exploreT <= 0) { updateExplore(); G.exploreT = 0.15; }
  // 可以按 F 互動的東西：人物、夢之門、回到夢裡的藍門、回城的傳送門（走過去不會自動傳送）
  let act = null, ad = 1e9;
  const cand = (kind, ref, r, label) => { if (!ref) return; const d = dist(pl, ref); if (d < r && d < ad) { ad = d; act = { kind, ref, label }; } };
  if (w.kind === 'town') {
    for (const n of w.npcs) if (!n.req || n.req(G.P)) cand('npc', n, 60, n.panel === 'stash' ? '打開' : n.panel === 'gemshop' ? '買技能寶石' : '對話');
    cand('device', w.portal, 52, '打開夢之門');
    if (G.savedMap) cand('resume', w.retPortal, 52, '回到夢裡');
    if (UI.mapDevOpen && dist(pl, w.portal) > 70) UI.showMapDevice(false); // 走遠了就關掉
    UI.autoCloseTownPanels(w);
  } else cand('exit', w.portal, 52, w.portal && w.portal.toHub ? `前往新營地「${HUB_BY_ID[w.portal.toHub].name}」` : w.portal && w.portal.exit ? '醒來（回營地）' : '回營地');
  G.nearAct = act;
  G.nearNPC = act && act.kind === 'npc' ? act.ref : null;
  G.shake = Math.max(0, G.shake - dt * 30);
  G.autosave = (G.autosave || 0) - dt;
  if (G.autosave <= 0) { saveGame(); G.autosave = 20; }
}
function explodeAt(p) {
  for (const m of G.mons) {
    if (m.dead || p.hit.has(m)) continue;
    if (Math.hypot(m.x - p.x, m.y - p.y) <= p.explode + m.r) { hitMonster(m, p.pk, !!p.fromMinion, p, 1.3); p.hit.add(m); }
  }
  G.fx.push({ k: 'ring', x: p.x, y: p.y, r: p.explode, t: 0, dur: 0.25, color: '#ffc080', fill: 'rgba(255,140,40,0.35)' });
  burst(p.x, p.y, '#ff8a30', 14, 160); Sfx.play('boom', 0.6);
}
// 傳送卷軸：在腳下開傳送門並回城，地圖保留
function usePortalScroll() {
  if (G.world.kind === 'town' || G.dead) return;
  if ((G.P.cur.portal || 0) <= 0) return msgOnce('noscroll', '沒有傳送卷軸了（打怪會掉，商人也有賣）');
  G.P.cur.portal--;
  G.world.portal = { x: G.pl.x, y: G.pl.y, exit: true };
  burst(G.pl.x, G.pl.y, '#7fc8ff', 24); Sfx.play('portal');
  leaveMapToTown();
}
