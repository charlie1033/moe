// =============================================================
//  大地圖的地形產生器（bigmap.js 用）：深層夢境的隨機區域、區域之間的過渡地帶
//  玩家看到：
//   ・第 11 夜以後每一區的樣子都不一樣：房間群（一間一間的房＋走道）、開闊平原（一大片空地）、
//     狹長峽谷（又長又彎的路，旁邊有小凹洞）、小密室（一間圓形的大房，中間有柱子）
//   ・區域之間的過渡地帶依場景變：窄的（森林、沼澤、海灘、冰原＝水上的木橋；熔岩＝岩漿上的石徑；虛空＝裂隙間的窄路；
//     其他＝兩邊是岩壁的窄路，中間有一個小凹地），寬的（一大片開闊地，散著樹、石頭），深層夢境多半是短短的小路
//  數字：房間群 48～76×34～52、平原 56～84×42～60、峽谷 長 64～100 寬 18～26、密室 26～34×22～28（第 5～6 區的夜縮成 8 成）
//        窄過渡 長 26～42 寬 9～12（轉彎 15～22 見方）、寬過渡 48～66×38～52（轉彎 40～54 見方）、小路 7～14×7～9
//  資料：只產生「一區」或「一塊過渡地帶」的格子（grid 1＝地板、deco 障礙物），拼起來在 bigmap.js
//  給別的檔用：BigGen.region(種類, 夜, 場景, 是不是最後一區, 縮放) → 區域地圖；BigGen.trans(o) → 過渡地帶；BigGen.KIND（種類名稱）
// =============================================================
const BigGen = (() => {
  const KIND = { rooms: '房間群', plain: '開闊平原', canyon: '狹長峽谷', hall: '小密室' };
  // 過渡地帶的樣子：haz＝窄過渡兩旁填的東西（2 水→路變木橋、8 岩漿、14 裂隙；0＝岩壁）；n＝窄的名字、wn＝寬的名字
  const STYLE = {
    forest: { haz: 2, n: '河上的木橋', wn: '林間空地' }, swamp: { haz: 2, n: '沼澤上的木棧道', wn: '開闊的泥沼' },
    beach: { haz: 2, n: '礁石間的棧橋', wn: '退潮的沙灘' }, ice: { haz: 2, n: '冰河上的木橋', wn: '大雪原' },
    fire: { haz: 8, n: '熔岩上的石徑', wn: '冒煙的焦土' }, void: { haz: 14, n: '虛空裂隙間的窄路', wn: '漂浮的石原' },
    bone: { haz: 0, n: '狹窄的墓道', wn: '亂葬崗' }, cave: { haz: 0, n: '地底的窄縫', wn: '地底大廳' },
    grass: { haz: 0, n: '岩壁間的小路', wn: '開闊的草原' }, desert: { haz: 0, n: '沙岩峽谷', wn: '流沙平原' },
  };
  const noise = (x, y, s) => (hash2(Math.floor(x / 4) + s, Math.floor(y / 4) + s * 7) % 1000) / 1000;
  // 地圖上的「房間」：10×8 的區塊有一半以上是地板就算（放怪用），起點和出口房不算
  function roomsOf(R) {
    const W = R.W, H = R.H, g = R.grid, out = [];
    const hit = (r, o) => o && r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y;
    for (let by = 1; by < H - 1; by += 8) for (let bx = 1; bx < W - 1; bx += 10) {
      let n = 0, a = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = by; y < Math.min(H - 1, by + 8); y++) for (let x = bx; x < Math.min(W - 1, bx + 10); x++) { a++; if (!g[y * W + x]) continue; n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const r = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      if (n / a >= 0.5 && !hit(r, R.start) && !hit(r, R.boss)) out.push(r);
    }
    return out;
  }
  // 一區（深層夢境、或主線缺資料的區）：回傳跟 ChapterMaps.build 一樣的欄位＋sPt（入口那一格）
  function region(kind, tier, theme, last, f) {
    f = f || 1;
    const sz = (a, b) => Math.round(rint(a, b) * f);
    let W, H;
    if (kind === 'rooms') { W = sz(48, 76); H = sz(34, 52); }
    else if (kind === 'plain') { W = sz(56, 84); H = sz(42, 60); }
    else if (kind === 'canyon') { const L = sz(64, 100), S = rint(18, 26); if (Math.random() < 0.5) { W = L; H = S; } else { W = S; H = L; } }
    else { W = rint(26, 34); H = rint(22, 28); }
    const grid = new Uint8Array(W * H), seed = rint(1, 9999);
    const carve = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i > 0 && j > 0 && i < W - 1 && j < H - 1) grid[j * W + i] = 1; };
    const disc = (cx, cy, r) => carve(Math.round(cx - r), Math.round(cy - r), Math.round(r * 2 + 1), Math.round(r * 2 + 1));
    const flip = Math.random() < 0.5, along = W >= H;
    // 起點、出口房放在長邊的兩頭
    const bw = last ? Math.min(17, W - 6) : Math.min(11, W - 6), bh = last ? Math.min(15, H - 6) : Math.min(9, H - 6);
    let start, boss;
    if (along) { start = { x: 3, y: rint(3, Math.max(3, H - 11)), w: 9, h: 8 }; boss = { x: W - bw - 3, y: rint(3, Math.max(3, H - bh - 3)), w: bw, h: bh }; }
    else { start = { x: rint(3, Math.max(3, W - 12)), y: 3, w: 9, h: 8 }; boss = { x: rint(3, Math.max(3, W - bw - 3)), y: H - bh - 3, w: bw, h: bh }; }
    if (flip) { if (along) { start.x = W - 12; boss.x = 3; } else { start.y = H - 11; boss.y = 3; } }
    if (kind === 'hall') { start = { x: (W >> 1) - 4, y: H - 10, w: 9, h: 8 }; boss = { x: 5, y: 3, w: W - 10, h: Math.min(bh, H - 13) }; }
    start.w = Math.min(start.w, W - start.x - 2); start.h = Math.min(start.h, H - start.y - 2);
    const cen = r => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) });
    const line = (a, b, r) => { let x = a.x, y = a.y; while (x !== b.x || y !== b.y) { disc(x, y, r); if (x !== b.x && (y === b.y || Math.random() < 0.5)) x += Math.sign(b.x - x); else y += Math.sign(b.y - y); } disc(x, y, r); };
    if (kind === 'rooms') {
      const rooms = [start, boss];
      const ov = r => rooms.some(o => r.x < o.x + o.w + 3 && r.x + r.w + 3 > o.x && r.y < o.y + o.h + 3 && r.y + r.h + 3 > o.y);
      for (let t = 0; t < 400 && rooms.length < Math.round(W * H / 230); t++) { const w = rint(6, 12), h = rint(5, 9), r = { x: rint(2, W - w - 2), y: rint(2, H - h - 2), w, h }; if (!ov(r)) rooms.push(r); }
      rooms.forEach(r => carve(r.x, r.y, r.w, r.h));
      const rest = rooms.slice(2), order = [start]; let cur = start;
      while (rest.length) { let bi = 0, bd = 1e9; rest.forEach((r, i) => { const a = cen(cur), b = cen(r), d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y); if (d < bd) { bd = d; bi = i; } }); cur = rest.splice(bi, 1)[0]; order.push(cur); }
      order.push(boss);
      for (let i = 0; i < order.length - 1; i++) line(cen(order[i]), cen(order[i + 1]), 1);
      for (let k = 0; k < 2; k++) { const a = pick(order), b = pick(order); if (a !== b) line(cen(a), cen(b), 1); }
    } else if (kind === 'plain') {
      const cx = W / 2, cy = H / 2, rx = W / 2 - 2.5, ry = H / 2 - 2.5;
      for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + noise(x, y, seed) * 0.55 < 1.05) grid[y * W + x] = 1;
      carve(start.x, start.y, start.w, start.h); carve(boss.x, boss.y, boss.w, boss.h); line(cen(start), cen(boss), 2);
      for (let k = 0; k < Math.round(W * H / 500); k++) { const x = rint(6, W - 7), y = rint(6, H - 7); if (Math.random() < 0.6) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) grid[(y + dy) * W + x + dx] = 0; }
    } else if (kind === 'canyon') {
      const L = along ? W : H, S = along ? H : W; let c = S / 2, v = 0;
      for (let t = 2; t < L - 2; t++) {
        v = clamp(v + rnd(-0.35, 0.35), -0.8, 0.8); c = clamp(c + v, 5, S - 6); const hw = 2 + noise(t, 0, seed) * 2.2;
        for (let o = -Math.ceil(hw); o <= Math.ceil(hw); o++) { const s = Math.round(c + o), x = along ? t : s, y = along ? s : t; if (s > 1 && s < S - 2) grid[y * W + x] = 1; }
        if (t % 13 === 6 && Math.random() < 0.7) { const side = Math.random() < 0.5 ? -1 : 1, pc = Math.round(c + side * 5); along ? carve(t - 3, pc - 2, 7, 5) : carve(pc - 2, t - 3, 5, 7); }
      }
      carve(start.x, start.y, start.w, start.h); carve(boss.x, boss.y, boss.w, boss.h);
      const a = cen(start), b = cen(boss);
      // 起點、出口房往峽谷那邊多挖一段（真的沒接上，biomeApply 最後的 ensureConnected 會補路）
      line(a, along ? { x: a.x + (flip ? -6 : 6), y: a.y } : { x: a.x, y: a.y + (flip ? -6 : 6) }, 1); line(b, along ? { x: b.x + (flip ? 6 : -6), y: b.y } : { x: b.x, y: b.y + (flip ? 6 : -6) }, 1);
    } else {
      const cx = W / 2, cy = H / 2 - 1, rx = W / 2 - 2, ry = H / 2 - 2;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 < 1) grid[y * W + x] = 1;
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, x = Math.round(cx + Math.cos(a) * rx * 0.5), y = Math.round(cy + Math.sin(a) * ry * 0.5); grid[y * W + x] = grid[y * W + x + 1] = 0; }
      carve(start.x + 2, start.y, 5, start.h);
    }
    const R = { kind: 'map', W, H, grid, deco: new Uint8Array(W * H), start, boss, others: [], tier, theme, mlvl: mapLevel(tier), grade: mapGrade(tier), mm: aggMods([]), name: theme.name, gk: kind };
    R.others = roomsOf(R); R.rooms = [start, boss].concat(R.others);
    try { biomeApply(R); } catch (e) { try { ensureConnected(R); } catch (e2) { } }
    R.sPt = cen(start);
    if (!R.grid[R.sPt.y * W + R.sPt.x]) { R.grid[R.sPt.y * W + R.sPt.x] = 1; R.deco[R.sPt.y * W + R.sPt.x] = 0; }
    return R;
  }
  // 過渡地帶：o = { kind: narrow|wide|connector, tw, th, A, B（兩個接點，在邊上）, sa, sb（接點在哪一邊）, theme }
  function trans(o) {
    const W = o.tw, H = o.th, g = new Uint8Array(W * H), d = new Uint8Array(W * H), st = STYLE[o.theme.id] || STYLE.cave;
    const haz = o.kind === 'narrow' ? st.haz : 0, seed = rint(1, 9999);
    if (haz) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) d[y * W + x] = haz;
    const put = (x, y, edge) => { if (x < 0 || y < 0 || x >= W || y >= H) return; if (!edge && (x < 1 || y < 1 || x > W - 2 || y > H - 2)) return; const i = y * W + x; g[i] = 1; d[i] = haz === 2 ? 15 : 0; };
    const brush = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) put(x + dx, y + dy); };
    const IN = { L: [1, 0], R: [-1, 0], T: [0, 1], B: [0, -1] };
    const inward = (p, s) => ({ x: clamp(p.x + IN[s][0] * 2, 2, W - 3), y: clamp(p.y + IN[s][1] * 2, 2, H - 3) });
    const mouth = (p, s) => { const q = inward(p, s); for (let t = 0; t <= 2; t++) { const x = p.x + IN[s][0] * t, y = p.y + IN[s][1] * t; for (let k = -1; k <= 1; k++) put(x + IN[s][1] * k, y + IN[s][0] * k, true); } return q; };
    const ia = mouth(o.A, o.sa), ib = mouth(o.B, o.sb), r = o.kind === 'wide' ? 2 : 1, path = [];
    let x = ia.x, y = ia.y;
    for (let guard = 0; guard < 4000 && (x !== ib.x || y !== ib.y); guard++) {
      const dx = ib.x - x, dy = ib.y - y; let mx = 0, my = 0;
      if (Math.random() < 0.22 && Math.abs(dx) + Math.abs(dy) > 4) { if (Math.abs(dx) > Math.abs(dy)) my = Math.random() < 0.5 ? -1 : 1; else mx = Math.random() < 0.5 ? -1 : 1; }
      else if (Math.random() < Math.abs(dx) / (Math.abs(dx) + Math.abs(dy))) mx = Math.sign(dx); else my = Math.sign(dy);
      x = clamp(x + mx, 2, W - 3); y = clamp(y + my, 2, H - 3); brush(x, y, r); path.push([x, y]);
    }
    brush(ia.x, ia.y, r);
    const rooms = [];
    if (o.kind === 'wide') {
      const cx = W / 2, cy = H / 2, rx = W / 2 - 2.5, ry = H / 2 - 2.5;
      for (let yy = 2; yy < H - 2; yy++) for (let xx = 2; xx < W - 2; xx++) if (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 + noise(xx, yy, seed) * 0.6 < 1.05) { g[yy * W + xx] = 1; d[yy * W + xx] = 0; }
      const B = BIOME[o.theme.id], kinds = B ? B.kinds : [[3, 1]];
      for (let k = 0; k < Math.round(W * H / 70); k++) {
        let tot = kinds.reduce((a, b) => a + b[1], 0), t = kinds[0][0], rr = Math.random() * tot; for (const [kk, wt] of kinds) { rr -= wt; if (rr <= 0) { t = kk; break; } }
        const px = rint(3, W - 4), py = rint(3, H - 4), big = POOL_KINDS.has(t) ? 1 : 0;
        if (path.some(([qx, qy]) => Math.abs(qx - px) < 3 && Math.abs(qy - py) < 3)) continue;
        for (let dy = 0; dy <= big; dy++) for (let dx = 0; dx <= big; dx++) { const i = (py + dy) * W + px + dx; if (g[i]) { g[i] = 0; d[i] = t; } }
      }
      for (let k = 0, tries = 0; k < 3 && tries < 80; tries++) {
        const rw = 8, rh = 6, rx0 = rint(3, W - rw - 3), ry0 = rint(3, H - rh - 3); let n = 0;
        for (let yy = ry0; yy < ry0 + rh; yy++) for (let xx = rx0; xx < rx0 + rw; xx++) if (g[yy * W + xx]) n++;
        if (n < rw * rh * 0.7 || rooms.some(q => Math.abs(q.x - rx0) < 12 && Math.abs(q.y - ry0) < 10)) continue;
        rooms.push({ x: rx0, y: ry0, w: rw, h: rh }); k++;
      }
    } else if (o.kind === 'narrow' && path.length > 8) {
      const [mx, my] = path[path.length >> 1]; brush(mx, my, 3); rooms.push({ x: clamp(mx - 3, 1, W - 8), y: clamp(my - 3, 1, H - 8), w: 7, h: 7 });
    }
    const name = o.kind === 'wide' ? st.wn : o.kind === 'narrow' ? st.n : '';
    return { W, H, grid: g, deco: d, rooms, name };
  }
  return { region, trans, roomsOf, KIND, STYLE };
})();
