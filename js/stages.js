// =============================================================
//  v2.8.4 地圖改版
//  ① 每一夜分成 3～5 個小關卡（區域）：前面幾區打完走到出口的門（按 F）進下一區，最後一區才有看守者
//     區數越多，打倒看守者時的額外獎勵越好
//  ② 每個場景有自己的地形：森林有河和樹、沼澤有水塘、熔岩洞窟有岩漿池、沙漠和草原比較開闊……
//     障礙物不會擋死路（放完會檢查每個地方都走得到，河流會自動留橋）
//  ④ v2.14.4 房間的直角削圓、直牆隨機凹凸（organicEdges）；東西卡在牆裡會自動移到最近的空地
//  ③ 角色腳下顯示小小的生命條和魔力條
// =============================================================
const BIOME = {
  bone: { open: 0.05, dens: 0.6, kinds: [[5, 2], [7, 3]] },
  fire: { open: 0.1, dens: 0.8, kinds: [[8, 3], [3, 1]] },
  ice: { open: 0.15, dens: 0.8, kinds: [[6, 2], [2, 1]] },
  cave: { open: 0, dens: 0.9, kinds: [[9, 2], [10, 2]] },
  grass: { open: 0.45, dens: 0.35, kinds: [[11, 3], [3, 1]] },
  beach: { open: 0.35, dens: 0.45, kinds: [[3, 2], [2, 2]] },
  swamp: { open: 0.15, dens: 1.1, kinds: [[2, 3], [12, 2]], river: true },
  forest: { open: 0.1, dens: 1.3, kinds: [[1, 5], [11, 1]], river: true },
  desert: { open: 0.6, dens: 0.25, kinds: [[4, 2], [3, 2]] },
  void: { open: 0.1, dens: 0.6, kinds: [[13, 2], [14, 2]] },
};
const DECO_NAME = { 1: '樹', 2: '水', 3: '岩石', 4: '仙人掌', 5: '石柱', 6: '冰晶', 7: '骨堆', 8: '岩漿', 9: '石筍', 10: '巨菇', 11: '灌木', 12: '枯樹', 13: '虛空水晶', 14: '虛空裂隙', 15: '木橋' };
const POOL_KINDS = new Set([2, 8, 14]);   // 這幾種是一整片（水塘、岩漿、裂隙）

// v2.14.4 讓地形邊緣自然一點（一格 32 像素的格子不變，碰撞照格子算；美術那邊會把牆邊畫得更圓滑）
//  ① 凸出去的直角（房間四個角）：削掉 1 格，大房間再削旁邊 1 格，變成圓角
//  ② 長直的牆邊：用低頻雜訊決定哪裡往內凸 1 格（牆長出來）、哪裡往外凹 1 格（牆被挖進去）
//  安全規則：往內凸只做在「後面至少還有 3 格空地、左右也是空地」的地方，所以 1～2 格寬的走道永遠不會被堵住
function organicEdges(w, protect) {
  const W = w.W, H = w.H, g = w.grid, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : g[y * W + x];
  const noise = (x, y) => { const v = hash2(Math.floor(x / 3) + 911, Math.floor(y / 3) + (w.tier || 1) * 37); return (v % 1000) / 1000; };
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const wide = (x, y, dx, dy) => at(x - dx, y - dy) && at(x - 2 * dx, y - 2 * dy) && at(x - 3 * dx, y - 3 * dy) && at(x + dy, y + dx) && at(x - dy, y - dx);
  const toWall = [], toFloor = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (protect(x, y)) continue;
    const i = y * W + x;
    if (g[i]) {
      // ① 直角：兩個相鄰方向是牆、對角內側是寬敞的地
      for (const [ax, ay, bx, by] of [[1, 0, 0, 1], [1, 0, 0, -1], [-1, 0, 0, 1], [-1, 0, 0, -1]]) {
        if (!at(x + ax, y + ay) && !at(x + bx, y + by) && at(x - ax, y - ay) && at(x - bx, y - by) && at(x - ax - bx, y - ay - by) && at(x - 2 * ax, y - 2 * ay) && at(x - 2 * bx, y - 2 * by)) {
          if (Math.random() < 0.85) toWall.push(i);
          // 大房間：直角旁邊再削一格，圓得更明顯
          if (at(x - 3 * ax, y - 3 * ay) && at(x - 3 * bx, y - 3 * by) && Math.random() < 0.5) { toWall.push((y - ay) * W + x - ax); toWall.push((y - by) * W + x - bx); }
        }
      }
      // ② 直牆往內凸
      const walls = D.filter(([dx, dy]) => !at(x + dx, y + dy));
      if (walls.length === 1) { const [dx, dy] = walls[0]; if (wide(x, y, dx, dy) && noise(x, y) < 0.18) toWall.push(i); }
    } else {
      // ② 直牆往外凹：這格牆只有一面是地，而且後面還是牆（挖了不會穿到別的地方）
      const fl = D.filter(([dx, dy]) => at(x + dx, y + dy));
      if (fl.length === 1) { const [dx, dy] = fl[0]; if (!at(x - dx, y - dy) && !at(x - dx + dy, y - dy + dx) && !at(x - dx - dy, y - dy - dx) && noise(x + 50, y + 50) < 0.16) toFloor.push(i); }
    }
  }
  for (const i of toWall) g[i] = 0;
  for (const i of toFloor) g[i] = 1;
  // 清掉孤零零的一格牆（四面都是地）和死角的一格地（三面是牆）
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (protect(x, y)) continue;
    const i = y * W + x, n = D.reduce((s, [dx, dy]) => s + (at(x + dx, y + dy) ? 1 : 0), 0);
    if (!g[i] && n === 4) g[i] = 1; else if (g[i] && n <= 1) g[i] = 0;
  }
}
function biomeApply(w) {
  const B = BIOME[w.theme && w.theme.id]; if (!B) return;
  const W = w.W, H = w.H, g = w.grid; w.deco = new Uint8Array(W * H);
  const inR = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  const protect = (x, y) => inR(w.start, x, y) || (w.boss && inR(w.boss, x, y));
  // 開闊：把牆邊吃掉一些，房間之間連成一片
  for (let pass = 0; pass < 3; pass++) {
    const add = [];
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      if (g[y * W + x]) continue;
      const n = g[y * W + x - 1] + g[y * W + x + 1] + g[(y - 1) * W + x] + g[(y + 1) * W + x];
      if (n && Math.random() < B.open * (n / 2)) add.push(y * W + x);
    }
    add.forEach(i => g[i] = 1);
  }
  // v2.14.4 地形不要方方正正：房間的直角削圓、長直的牆邊隨機凹進凸出（只動夠寬的地方，不會把路堵死）
  organicEdges(w, protect);
  const floorCount = () => { let n = 0; for (let i = 0; i < g.length; i++) if (g[i]) n++; return n; };
  const reach = () => { const s = { x: Math.floor(w.start.x + w.start.w / 2), y: Math.floor(w.start.y + w.start.h / 2) }; const seen = new Uint8Array(W * H), q = [s.y * W + s.x]; seen[q[0]] = 1; let n = 0; while (q.length) { const i = q.pop(); n++; for (const d of [1, -1, W, -W]) { const j = i + d; if (!seen[j] && g[j]) { seen[j] = 1; q.push(j); } } } return { n, seen }; };
  // 河流（森林、沼澤）：橫過整張圖，之後自動補橋
  if (B.river) {
    const horiz = Math.random() < 0.5, len = horiz ? W : H, span = horiz ? H : W;
    let c = rint(Math.floor(span * 0.35), Math.floor(span * 0.65)); const riv = [];
    for (let t = 1; t < len - 1; t++) {
      c += rint(-1, 1); c = Math.max(6, Math.min(span - 7, c));
      for (let k = 0; k < 2; k++) { const x = horiz ? t : c + k, y = horiz ? c + k : t, i = y * W + x; if (g[i] && !protect(x, y)) { g[i] = 0; w.deco[i] = 2; riv.push([x, y]); } }
    }
    for (let guard = 0; guard < 40; guard++) {
      const total = floorCount(), R = reach(); if (R.n >= total) break;
      // 找一段「一邊走得到、一邊走不到」的河，鋪一座橋
      let done = false;
      for (const [x, y] of riv.sort(() => Math.random() - 0.5)) {
        const i = y * W + x; if (w.deco[i] !== 2) continue;
        const a = horiz ? [x, y - 1] : [x - 1, y], b = horiz ? [x, y + 2] : [x + 2, y], c2 = horiz ? [x, y - 2] : [x - 2, y], d2 = horiz ? [x, y + 1] : [x + 1, y];
        const side = ([px, py]) => g[py * W + px] ? (R.seen[py * W + px] ? 1 : 2) : 0;
        const s1 = Math.max(side(a), side(c2)), s2 = Math.max(side(b), side(d2));
        if ((s1 === 1 && s2 === 2) || (s1 === 2 && s2 === 1)) {
          for (let k = -1; k <= 2; k++) { const bx = horiz ? x : x + k, by = horiz ? y + k : y, bi = by * W + bx; if (w.deco[bi] === 2) { g[bi] = 1; w.deco[bi] = 15; } }
          done = true; break;
        }
      }
      if (!done) break;
    }
  }
  // 房間裡的障礙物：一叢一叢放，放了會擋路就拿掉
  const rooms = w.others || [];
  const total0 = () => floorCount();
  for (const r of rooms) {
    const n = Math.round(r.w * r.h / 30 * B.dens * rnd(0.6, 1.3));
    for (let k = 0; k < n; k++) {
      let tot = B.kinds.reduce((a, b) => a + b[1], 0), pickK = B.kinds[0][0], rr = Math.random() * tot; for (const [t, wt] of B.kinds) { rr -= wt; if (rr <= 0) { pickK = t; break; } }
      const cx = rint(r.x + 1, r.x + r.w - 2), cy = rint(r.y + 1, r.y + r.h - 2), cells = [];
      const big = POOL_KINDS.has(pickK) ? [rint(1, 3), rint(1, 2)] : (Math.random() < 0.3 ? [1, 0] : [0, 0]);
      for (let dy = -big[1]; dy <= big[1]; dy++) for (let dx = -big[0]; dx <= big[0]; dx++) {
        if (POOL_KINDS.has(pickK) && (dx * dx) / ((big[0] + 0.5) ** 2) + (dy * dy) / ((big[1] + 0.5) ** 2) > 1) continue;
        const x = cx + dx, y = cy + dy, i = y * W + x; if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || !g[i] || protect(x, y)) continue; cells.push(i);
      }
      if (!cells.length) continue;
      const before = total0(); cells.forEach(i => { g[i] = 0; w.deco[i] = pickK; });
      if (reach().n < before - cells.length) cells.forEach(i => { g[i] = 1; w.deco[i] = 0; });   // 擋到路了：拿掉
    }
  }
  ensureConnected(w);
}
// v2.16.5 最後保險：整張圖每一塊地都要從起點走得到
//  ・小於 10 格的封閉小角落 → 直接填成牆（不然怪物、掉落物會卡在裡面）
//  ・比較大的一塊 → 從走得到的地方開一條 2 格寬的路過去：優先穿過障礙物（水變木橋、石頭拿掉），不得已才挖牆
function ensureConnected(w) {
  const W = w.W, H = w.H, g = w.grid, D = [1, -1, W, -W];
  const s0 = Math.floor(w.start.y + w.start.h / 2) * W + Math.floor(w.start.x + w.start.w / 2);
  if (!g[s0]) g[s0] = 1;
  const inside = i => { const x = i % W, y = (i / W) | 0; return x >= 2 && y >= 2 && x < W - 2 && y < H - 2; };
  const open = i => { g[i] = 1; if (w.deco[i] === 2) w.deco[i] = 15; else if (w.deco[i] && w.deco[i] !== 15) w.deco[i] = 0; };
  for (let guard = 0; guard < 30; guard++) {
    // 從起點能走到哪裡
    const seen = new Uint8Array(W * H), q = [s0]; seen[s0] = 1;
    while (q.length) { const i = q.pop(); for (const d of D) { const j = i + d; if (j >= 0 && j < g.length && !seen[j] && g[j]) { seen[j] = 1; q.push(j); } } }
    // 找走不到的一塊
    let comp = null;
    for (let i = 0; i < g.length && !comp; i++) if (g[i] && !seen[i]) {
      comp = [i]; const cs = new Uint8Array(W * H); cs[i] = 1;
      for (let k = 0; k < comp.length; k++) for (const d of D) { const j = comp[k] + d; if (j >= 0 && j < g.length && !cs[j] && g[j]) { cs[j] = 1; comp.push(j); } }
    }
    if (!comp) return;
    if (comp.length < 10) { for (const i of comp) { g[i] = 0; if (w.deco[i] === 15) w.deco[i] = 2; } continue; }
    // 從這一塊往外找最近的走得到的地（障礙物算 1 步、牆算 4 步）
    const cost = new Float32Array(W * H).fill(1e9), prev = new Int32Array(W * H).fill(-1), buckets = [[]];
    for (const i of comp) { cost[i] = 0; buckets[0].push(i); }
    let hit = -1;
    for (let c = 0; c < buckets.length && hit < 0; c++) {
      const b = buckets[c]; if (!b) continue;
      for (let k = 0; k < b.length && hit < 0; k++) {
        const i = b[k]; if (cost[i] < c) continue;
        if (seen[i]) { hit = i; break; }
        for (const d of D) { const j = i + d; if (j < 0 || j >= g.length || !inside(j)) continue;
          const nc = c + (g[j] ? 0 : w.deco[j] ? 1 : 4); if (nc >= cost[j]) continue; cost[j] = nc; prev[j] = i; (buckets[nc] = buckets[nc] || []).push(j); }
      }
    }
    if (hit < 0) { for (const i of comp) g[i] = 0; continue; }   // 真的接不上：整塊封掉
    // 把路開出來（2 格寬：旁邊那格是障礙物也一起打開）
    for (let i = hit; i >= 0; i = prev[i]) {
      if (!g[i]) open(i);
      const side = Math.abs(prev[i] - i) === 1 ? W : 1;
      if (prev[i] >= 0 && inside(i + side) && !g[i + side] && w.deco[i + side]) open(i + side);
    }
  }
}
// 障礙物的樣子（畫在地圖底圖上，只畫一次）
function drawDeco(g, t, x, y, s, w) {
  const X = x * TS, Y = y * TS, c = X + 16, m = Y + 16;
  const circ = (cx, cy, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); };
  if (t === 2 || t === 8 || t === 14) {   // 水、岩漿、裂隙
    const pal = t === 2 ? ['#24506a', '#3a7090', 'rgba(200,230,255,0.35)'] : t === 8 ? ['#7a1a08', '#d8501a', 'rgba(255,220,120,0.6)'] : ['#08040e', '#2a1840', 'rgba(190,140,255,0.4)'];
    // 水面連成一片：只在「旁邊不是同一種」的那一邊畫深色岸邊
    g.fillStyle = pal[1]; g.fillRect(X, Y, TS, TS);
    const same = (dx, dy) => { const v = w && w.deco[(y + dy) * w.W + x + dx]; return v === t || (t === 2 && v === 15); };
    g.fillStyle = pal[0]; if (!same(0, -1)) g.fillRect(X, Y, TS, 4); if (!same(0, 1)) g.fillRect(X, Y + TS - 3, TS, 3); if (!same(-1, 0)) g.fillRect(X, Y, 3, TS); if (!same(1, 0)) g.fillRect(X + TS - 3, Y, 3, TS);
    g.strokeStyle = pal[2]; g.lineWidth = 1.5; for (let k = 0; k < 2; k++) { const yy = Y + 8 + k * 12 + (s % 5); g.beginPath(); g.moveTo(X + 4 + (s % 7), yy); g.quadraticCurveTo(c, yy - 3, X + 26, yy); g.stroke(); }
    return;
  }
  if (t === 15) { g.fillStyle = '#24506a'; g.fillRect(X, Y, TS, TS); g.fillStyle = '#7a5a34'; for (let k = 0; k < 4; k++) g.fillRect(X + 1, Y + 1 + k * 8, TS - 2, 6); g.fillStyle = '#4a3420'; g.fillRect(X + 1, Y, 3, TS); g.fillRect(X + TS - 4, Y, 3, TS); return; }
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(c, Y + 27, 13, 5, 0, 0, Math.PI * 2); g.fill();
  if (t === 1) { g.fillStyle = '#4a3020'; g.fillRect(c - 3, m + 2, 6, 12); circ(c, m - 2, 13, '#1e4a22'); circ(c - 5, m - 6, 9, '#2a6030'); circ(c + 5, m - 7, 8, '#33703a'); circ(c - 1, m - 11, 6, '#3e8044'); }
  else if (t === 12) { g.strokeStyle = '#5a5048'; g.lineWidth = 4; g.beginPath(); g.moveTo(c, Y + 28); g.lineTo(c, m - 4); g.lineTo(c - 8, Y + 6); g.moveTo(c, m); g.lineTo(c + 9, Y + 8); g.stroke(); }
  else if (t === 3) { circ(c, m + 3, 11, '#5a5a62'); circ(c - 3, m, 8, '#74747c'); circ(c + 4, m + 1, 5, '#8a8a92'); }
  else if (t === 4) { g.fillStyle = '#3a7a30'; g.fillRect(c - 3, Y + 6, 7, 22); g.fillRect(c - 10, m - 2, 6, 4); g.fillRect(c - 10, m - 8, 4, 8); g.fillRect(c + 5, m, 6, 4); g.fillRect(c + 8, m - 6, 4, 8); }
  else if (t === 5) { g.fillStyle = '#5a5464'; g.fillRect(c - 8, Y + 4, 16, 24); g.fillStyle = '#7a7486'; g.fillRect(c - 10, Y + 2, 20, 5); g.fillRect(c - 10, Y + 25, 20, 4); }
  else if (t === 6) { g.fillStyle = '#9ad8ff'; g.beginPath(); g.moveTo(c, Y + 3); g.lineTo(c + 6, m + 10); g.lineTo(c - 6, m + 10); g.fill(); g.fillStyle = '#d8f4ff'; g.beginPath(); g.moveTo(c - 7, m - 2); g.lineTo(c - 3, m + 10); g.lineTo(c - 11, m + 10); g.fill(); }
  else if (t === 7) { circ(c, m + 6, 9, '#c8c0a8'); circ(c - 5, m + 2, 5, '#e0d8c0'); g.fillStyle = '#2a2420'; g.fillRect(c - 7, m + 1, 2, 2); g.fillRect(c - 4, m + 1, 2, 2); }
  else if (t === 9) { g.fillStyle = '#6a5a48'; g.beginPath(); g.moveTo(c - 9, Y + 28); g.lineTo(c - 1, Y + 3); g.lineTo(c + 8, Y + 28); g.fill(); g.fillStyle = '#86745e'; g.beginPath(); g.moveTo(c - 4, Y + 28); g.lineTo(c - 1, Y + 8); g.lineTo(c + 2, Y + 28); g.fill(); }
  else if (t === 10) { g.fillStyle = '#d8d0b8'; g.fillRect(c - 3, m, 6, 12); g.fillStyle = '#8a4aa8'; g.beginPath(); g.ellipse(c, m, 13, 8, 0, Math.PI, 0); g.fill(); circ(c - 5, m - 4, 2, '#e8c8ff'); circ(c + 4, m - 3, 2, '#e8c8ff'); }
  else if (t === 11) { circ(c - 5, m + 4, 8, '#3a6a2a'); circ(c + 5, m + 4, 8, '#46782e'); circ(c, m - 2, 9, '#56883a'); }
  else if (t === 13) { g.fillStyle = '#a070e0'; g.beginPath(); g.moveTo(c, Y + 2); g.lineTo(c + 7, m); g.lineTo(c, Y + 28); g.lineTo(c - 7, m); g.fill(); g.fillStyle = 'rgba(230,210,255,0.7)'; g.beginPath(); g.moveTo(c, Y + 5); g.lineTo(c + 3, m); g.lineTo(c, m + 6); g.fill(); }
}
const _buildWCStage = buildWorldCanvas;
buildWorldCanvas = function (w) {
  _buildWCStage(w);
  if (!w.deco || !w.canvas) return;
  const g = w.canvas.getContext('2d');
  for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
    const t = w.deco[y * w.W + x]; if (!t) continue;
    g.drawImage(getFloorTile(w.theme, hash2(x, y) % 6), x * TS, y * TS);
    if (!(typeof StackProps !== "undefined" && StackProps.handles(t))) drawDeco(g, t, x, y, hash2(x, y), w);   // v2.9.5 立體障礙物另外畫
  }
};
// ① 小關卡
const _genMapStage = genMap;
genMap = function (tier) {
  const w = _genMapStage(tier);
  try { biomeApply(w); } catch (e) { }
  if (G._stagePlan) { w.stage = { i: G._stagePlan.i, n: G._stagePlan.n }; w.name += `（第 ${w.stage.i} / ${w.stage.n} 區）`; }
  return w;
};
// v2.8.5 主線章節固定 3 區；深層夢境（刷圖）4～6 區，區數越多整張圖的掉落數量和稀有度越高（不再固定多掉東西）
function stageCountFor(tier) { return tier >= DEEP_TIER ? rint(4, 6) : 3; }
const stageBonus = n => ({ q: Math.max(0, n - 3) * 15, r: Math.max(0, n - 3) * 10 });
// 障礙物上的怪物挪到旁邊的空地；不是最後一區：拿掉看守者、出口放一扇門
function stageFixup(w) {
  for (const m of G.mons) if (solidAt(m.x, m.y)) {
    const tx = Math.floor(m.x / TS), ty = Math.floor(m.y / TS);
    out: for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = tx + dx, y = ty + dy; if (x > 0 && y > 0 && x < w.W && y < w.H && w.grid[y * w.W + x]) { m.x = x * TS + 16; m.y = y * TS + 16; break out; } }
  }
  if (w.stage && w.stage.i < w.stage.n) {
    G.mons = G.mons.filter(m => !m.boss);
    const r = w.boss; w.exitRoom = r; w.boss = null;
    spawnPack((r.x + r.w / 2) * TS, (r.y + r.h / 2) * TS, w);
    w.gate = { x: (r.x + r.w / 2) * TS, y: (r.y + r.h / 2) * TS };
  }
}
const _enterMapStage = enterMap;
enterMap = function (tier) {
  G._stagePlan = { i: 1, n: stageCountFor(tier) };
  try { _enterMapStage(tier); } finally { G._stagePlan = null; }
  stageFixup(G.world);
  const w0 = G.world;
  if (w0.stage) {
    const B = stageBonus(w0.stage.n);
    if (B.q || B.r) { w0.mm = Object.assign({}, w0.mm, { q: (w0.mm.q || 0) + B.q, r: (w0.mm.r || 0) + B.r }); w0.stageBonus = B; }
    UI.banner(w0.name.replace(/（.*$/, ''), `這一夜有 ${w0.stage.n} 區，最後一區有看守者${B.q ? `｜掉落數量 +${B.q}%、稀有度 +${B.r}%` : ''}`, '#ffcf70');
  }
};
function nextStage() {
  const old = G.world, st = old.stage; if (!st || st.i >= st.n) return;
  G._stagePlan = { i: st.i + 1, n: st.n };
  let w; try { w = genMap(old.tier); } finally { G._stagePlan = null; }
  w.mm = old.mm; if (old.bt) { w.bt = old.bt; if (st.i + 1 === st.n) w.bt.t0 = G.time; }   // 懸賞跟著走（速攻從最後一區開始算）
  const mins = G.mins; resetEntities(); G.mins = mins;
  G.world = w; buildWorldCanvas(w);
  const s = w.start; G.pl.x = (s.x + s.w / 2) * TS; G.pl.y = (s.y + s.h / 2) * TS;
  populate(w); stageFixup(w);
  G.mins.forEach(m => { m.x = G.pl.x + rnd(-30, 30); m.y = G.pl.y + rnd(-30, 30); });
  w.flowT = 0; Sfx.play('portal');
  UI.banner(`第 ${w.stage.i} / ${w.stage.n} 區`, w.stage.i === w.stage.n ? '看守者就在這一區' : '找到出口的門，前往下一區', '#ffcf70');
  saveGame();
}
// 出口的門：按 F
Interact.add('gate', (pl, w) => w.gate ? [{ ref: w.gate, label: `前往第 ${w.stage.i + 1} 區` }] : null, () => {
    const left = G.loot.filter(l => !l.gone && l.item && (l.item.rarity === 'rare' || l.item.rarity === 'unique')).length;
    if (left) return gameAsk(`這一區地上還有 ${left} 件黃裝／傳奇沒撿。\n進下一區之後就撿不回來了，確定要走嗎？`, nextStage);
    nextStage();
});
function drawStageExtras(g) {
  const w = G.world; if (!w || !w.gate) return;
  drawPortal(g, w.gate.x, w.gate.y, '#ffcf70', `前往第 ${w.stage.i + 1} / ${w.stage.n} 區`);
}
// ③ 角色腳下的生命條、魔力條
const _drawPlayerBars = drawPlayer;
drawPlayer = function (g, ...a) {
  const r = _drawPlayerBars(g, ...a);
  const pl = G.pl, S = G.S; if (!pl || !S || !S.maxLife) return r;
  const x = Math.round(pl.x) - 18, y = Math.round(pl.y) + 17, W = 36;
  g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(x - 1, y - 1, W + 2, 9);
  g.fillStyle = '#c02828'; g.fillRect(x, y, W * Math.max(0, Math.min(1, pl.life / S.maxLife)), 4);
  if (S.maxES > 0 && pl.es > 0) { g.fillStyle = 'rgba(150,215,255,0.85)'; g.fillRect(x, y, W * Math.min(1, pl.es / S.maxES), 1.5); }
  if (!S.flags.bloodMagic) { g.fillStyle = '#3a68e0'; g.fillRect(x, y + 5, W * Math.max(0, Math.min(1, pl.mana / (S.maxMana || 1))), 2); }
  return r;
};
// v2.14.4 保險：每半秒檢查一次，卡在牆裡的怪物、召喚物、掉落物、傳送門，移到最近的空地（以前偶爾會出現在地圖外面）
let _safeT = 0;
Hook.on('update', dt => {
  if ((_safeT += dt) < 0.5) return; _safeT = 0;
  const w = G.world; if (!w || !w.grid || w.kind === 'town') return;
  const fix = o => { if (o && (o.flyH ? shotWallAt(o.x, o.y) : solidAt(o.x, o.y))) { const p = nearestFloor(o.x, o.y); o.x = p.x; o.y = p.y; } };   // 飛行的怪可以停在岩漿、水上
  for (const m of G.mons) if (!m.dead) fix(m);
  for (const m of G.mins) fix(m);
  for (const l of G.loot) fix(l);
  fix(w.portal);
});
