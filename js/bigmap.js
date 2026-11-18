// =============================================================
//  無縫大地圖：一夜＝一整張連在一起的地圖，區域之間沒有門、沒有讀取，走過去就到下一區
//  玩家看到：
//   ・主線第 1～10 夜：三張手工地圖用過渡地帶接起來（一條窄的：木橋、岩漿石徑、窄峽谷…；一片寬的：草原、雪原、空地…），
//     方向有左右、上下、轉彎，整張圖不是一條直線；第 1、2 區的出口房挖一條路接到過渡地帶，不再有「前往第 N 區」的門
//   ・第 11 夜以後：3～6 區（區數照舊 4～6），每區是房間群／開闊平原／狹長峽谷／小密室之一，整張 寬 100～260、高 70～180
//   ・走進新的一區：跳那一區的橫幅（名稱＋開場白），任務面板、懸賞、試煉、夢話、首領之門照舊以「區」運作（w.stage.i＝人在第幾區）
//     走進過渡地帶時左下角說一句「河上的木橋——穿過去就是下一區」
//   ・怪物：進圖時只生第 1 區（含它後面的過渡地帶）；離下一區的邊界一個畫面內（而且上一區已經走進去過）才生那一區
//     離你很遠（橫 1800、直 1400 像素外）的怪凍結不動、不更新
//   ・過渡地帶的怪（窄的 1 群、寬的 2～3 群）從那一區的「額外怪群」扣掉，整夜怪量跟以前三區加起來差不多
//  資料（都在地圖物件上，「沒打完的夢」整份存起來）：
//   w.regions = [{ i, rect, name, title, intro, key, start, exit, sPt, others, nTrans, act（怪生了沒）, seen（走進去過沒） }]
//   w.rmap（每一格屬於第幾區，過渡地帶算前一區）、w.trans = [{ rect, name, r, seen }]、w.stage = { i, n }
//   w.chap：三區合併（事件 ev.key／ev.r、區域首領 c.bosses=[{x,y,dead,key,r}]、封住的通道 dCells 換成大地圖的格子）
//  接點：stages.js 的 genMap／enterMap／nextStage 呼叫 BigMap.build／BigMap.activate／goRegion；Hook 'update'
//  給別的檔用：BigMap.regionAt(w, x, y)、BigMap.here(物件)（是不是在玩家現在這一區）、goRegion(i)（測試：把玩家移到第 i 區入口）
// =============================================================
const BigMap = (() => {
  const SIDES = ['L', 'R', 'T', 'B'], OPP = { L: 'R', R: 'L', T: 'B', B: 'T' }, DIR = { L: [-1, 0], R: [1, 0], T: [0, -1], B: [0, 1] };
  const cen = r => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) });
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // ① 從一個點（出口房中間或起點）往四個邊各找一條最短的路挖出去：3 格寬、只穿過牆和障礙物、不碰劇情點、布景、封住的通道和別的封閉區塊
  function ports(R, p) {
    const W = R.W, H = R.H, g = R.grid, bad = new Uint8Array(W * H), dist = new Int32Array(W * H).fill(-1);
    if (R.chap) { for (const i of R.chap.dCells) bad[i] = 1; for (const e of R.chap.evs) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) bad[(e.ty + dy) * W + e.tx + dx] = 1; }
    for (let i = 0; i < g.length; i++) if (R.deco[i] === 30) bad[i] = 1;
    let s = p.y * W + p.x;
    if (!g[s]) { let bd = 1e9; for (let i = 0; i < g.length; i++) if (g[i]) { const d = Math.abs(i % W - p.x) + Math.abs(((i / W) | 0) - p.y); if (d < bd) { bd = d; s = i; } } }
    const q = [s]; dist[s] = 0;
    for (let h = 0; h < q.length; h++) { const i = q[h]; for (const d of [1, -1, W, -W]) { const j = i + d; if (j >= 0 && j < g.length && g[j] && dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); } } }
    const best = {};
    for (const i of q) {
      const x = i % W, y = (i / W) | 0;
      for (const sd of SIDES) {
        const [dx, dy] = DIR[sd], len = dx > 0 ? W - 1 - x : dx < 0 ? x : dy > 0 ? H - 1 - y : y, cost = len + dist[i] * 0.8;
        if (len < 1 || (best[sd] && cost >= best[sd].cost)) continue;
        const px = dy, py = dx; let ok = true;
        for (let t = 0; t <= len && ok; t++) for (let o = -1; o <= 1; o++) {
          if (!t && !o) continue;
          const X = x + dx * t + px * o, Y = y + dy * t + py * o;
          if ((px && (X < 1 || X > W - 2)) || (py && (Y < 1 || Y > H - 2))) { ok = false; break; }
          const j = Y * W + X; if (bad[j] || (g[j] && dist[j] < 0)) { ok = false; break; }
        }
        if (ok) best[sd] = { s: sd, x, y, len, cost, ex: x + dx * len, ey: y + dy * len };
      }
    }
    return best;
  }
  function carvePort(R, pt) {
    const W = R.W, [dx, dy] = DIR[pt.s];
    for (let t = 0; t <= pt.len; t++) for (let o = -1; o <= 1; o++) {
      const i = (pt.y + dy * t + dx * o) * W + pt.x + dx * t + dy * o; if (R.grid[i]) continue;
      R.grid[i] = 1; R.deco[i] = R.deco[i] === 2 ? 15 : 0;
    }
  }
  // ② 排版：區、過渡、區、過渡……一個接一個放，不重疊；寧可轉彎（不是一條直線）
  function dims(kind, e, u) {
    const st = u === e, hz = e === 'L' || e === 'R';
    const [a, b] = kind === 'narrow' ? (st ? [rint(26, 42), rint(9, 12)] : [rint(15, 22), rint(15, 22)]) : kind === 'wide' ? (st ? [rint(48, 66), rint(38, 52)] : [rint(40, 54), rint(40, 54)]) : (st ? [rint(7, 14), rint(7, 9)] : [rint(9, 12), rint(9, 12)]);
    return st ? (hz ? [a, b] : [b, a]) : [a, b];
  }
  function layout(P, kinds, lim) {
    const n = P.length, pos = [{ x: 0, y: 0, w: P[0].R.W, h: P[0].R.H }], tr = [], boxes = [pos[0]];
    let budget = 1500;
    const over = b => boxes.some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
    const fits = b => { let x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h; for (const o of boxes) { x0 = Math.min(x0, o.x); y0 = Math.min(y0, o.y); x1 = Math.max(x1, o.x + o.w); y1 = Math.max(y1, o.y + o.h); } return x1 - x0 + 2 <= lim.W && y1 - y0 + 2 <= lim.H; };
    function rec(k, inSide) {
      if (k === n - 1) return true;
      if (--budget < 0) return false;
      const A = P[k], es = Object.values(A.exits).filter(p => p.s !== inSide).sort((a, b) => a.cost - b.cost);
      const pool = es.filter(p => p.cost <= es[0].cost * 1.6 + 12); shuffle(pool);
      for (const pe of pool.concat(es.filter(p => !pool.includes(p)))) {
        const e = pe.s, us = shuffle(SIDES.filter(u => u !== OPP[e]));
        if (Math.random() < 0.6) us.sort((a, b) => (a === e) - (b === e));   // 先試轉彎
        for (const u of us) {
          const ps = P[k + 1].entries[OPP[u]]; if (!ps) continue;
          const [tw, th] = dims(kinds[k], e, u), gx = pos[k].x + pe.ex, gy = pos[k].y + pe.ey, Rn = P[k + 1].R;
          const T = { w: tw, h: th }, a = e === 'L' || e === 'R' ? rint(2, th - 3) : rint(2, tw - 3);
          let Ac;
          if (e === 'R') { T.x = gx + 1; T.y = gy - a; Ac = { x: 0, y: a }; } else if (e === 'L') { T.x = gx - tw; T.y = gy - a; Ac = { x: tw - 1, y: a }; }
          else if (e === 'B') { T.y = gy + 1; T.x = gx - a; Ac = { x: a, y: 0 }; } else { T.y = gy - th; T.x = gx - a; Ac = { x: a, y: th - 1 }; }
          if (over(T) || !fits(T)) continue;
          const b = u === 'L' || u === 'R' ? rint(2, th - 3) : rint(2, tw - 3), Rb = { w: Rn.W, h: Rn.H }; let Bc;
          if (u === 'R') { Rb.x = T.x + tw; Rb.y = T.y + b - ps.ey; Bc = { x: tw - 1, y: b }; } else if (u === 'L') { Rb.x = T.x - Rn.W; Rb.y = T.y + b - ps.ey; Bc = { x: 0, y: b }; }
          else if (u === 'B') { Rb.y = T.y + th; Rb.x = T.x + b - ps.ex; Bc = { x: b, y: th - 1 }; } else { Rb.y = T.y - Rn.H; Rb.x = T.x + b - ps.ex; Bc = { x: b, y: 0 }; }
          boxes.push(T);
          if (over(Rb) || !fits(Rb)) { boxes.pop(); continue; }
          boxes.push(Rb); pos[k + 1] = Rb; tr[k] = { box: T, A: Ac, B: Bc, sa: OPP[e], sb: u, kind: kinds[k], pe, ps };
          if (rec(k + 1, OPP[u])) return true;
          boxes.pop(); boxes.pop();
        }
      }
      return false;
    }
    return rec(0, null) ? { pos, tr } : null;
  }
  // ③ 蓋整張圖
  function build(tier, n) {
    const chapter = tier < DEEP_TIER, theme = THEMES[(tier - 1) % THEMES.length];
    for (let at = 0; at < 6; at++) {
      const regs = [], f = n >= 5 ? 0.8 : 1;
      const deepKinds = shuffle(['rooms', 'plain', 'canyon', 'hall', 'rooms', 'plain', 'canyon']);
      for (let k = 1; k <= n; k++) {
        let R = chapter && typeof ChapterMaps !== 'undefined' ? ChapterMaps.build(tier, k) : null, kind = 'rooms';
        if (!R) { kind = chapter ? 'rooms' : deepKinds[k - 1]; if (k === n && kind === 'hall') kind = 'plain'; R = BigGen.region(kind, tier, theme, k === n, f); }
        R.gk = R.chap ? null : kind; regs.push(R);
      }
      const P = regs.map((R, k) => ({ R, exits: k < n - 1 ? ports(R, cen(R.boss)) : {}, entries: k > 0 ? ports(R, R.sPt || cen(R.start)) : {} }));
      const kinds = [];
      if (chapter) { const two = shuffle(['narrow', 'wide']); for (let k = 0; k < n - 1; k++) kinds.push(two[k % 2]); }
      else for (let k = 0; k < n - 1; k++) { const r = Math.random(); kinds.push(r < 0.55 || (r > 0.85 && n > 4) ? 'connector' : r < 0.85 ? 'narrow' : 'wide'); }
      const L = layout(P, kinds, chapter ? { W: 420, H: 320 } : { W: 260, H: 180 });
      if (L) return assemble(tier, theme, regs, L, chapter);
    }
    return null;
  }
  function assemble(tier, theme, regs, L, chapter) {
    const n = regs.length, all = L.pos.concat(L.tr.map(t => t.box));
    const x0 = Math.min(...all.map(b => b.x)), y0 = Math.min(...all.map(b => b.y)), x1 = Math.max(...all.map(b => b.x + b.w)), y1 = Math.max(...all.map(b => b.y + b.h));
    let W = x1 - x0 + 2, H = y1 - y0 + 2, ox = 1 - x0, oy = 1 - y0;
    if (!chapter) { const px = Math.max(0, 100 - W), py = Math.max(0, 70 - H); ox += px >> 1; oy += py >> 1; W += px; H += py; }
    const grid = new Uint8Array(W * H), deco = new Uint8Array(W * H), rmap = new Uint8Array(W * H);
    L.tr.forEach((t, k) => { carvePort(regs[k], t.pe); carvePort(regs[k + 1], t.ps); });
    const regions = [], others = [], trans = [];
    let chap = null, hasD = false, allOpen = true;
    regs.forEach((R, k) => {
      const bx = L.pos[k].x + ox, by = L.pos[k].y + oy, off = r => ({ x: r.x + bx, y: r.y + by, w: r.w, h: r.h });
      for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) { const i = (by + y) * W + bx + x, j = y * R.W + x; grid[i] = R.grid[j]; deco[i] = R.deco[j]; rmap[i] = k + 1; }
      const sp = R.sPt || cen(R.start), cc = R.chap;
      const nm = cc ? R.name.replace(/^第 \d+ 夜之夢・/, '') : chapter ? theme.name : `${theme.name}・${BigGen.KIND[R.gk] || ''}`;
      const reg = { i: k + 1, rect: { x: bx, y: by, w: R.W, h: R.H }, name: nm, intro: (cc && R.intro) || '', key: cc ? cc.key : null,
        title: cc ? R.name : chapter ? `第 ${tier} 夜之夢・${theme.name}` : `深層夢境 第 ${tier} 夜・${theme.name}`, kind: R.gk,
        start: off(R.start), exit: off(R.boss), sPt: { x: sp.x + bx, y: sp.y + by }, others: R.others.map(off).concat(k < n - 1 ? [off(R.boss)] : []), nTrans: 0, act: false, seen: false };
      regions.push(reg);
      if (cc) {
        chap = chap || { key: cc.key, keys: [], evs: [], packs: [], dCells: [], open: false, boss: null, bosses: [], scenes: [] };
        chap.keys.push(cc.key);
        for (const ev of cc.evs) { ev.tx += bx; ev.ty += by; ev.x += bx * TS; ev.y += by * TS; ev.key = cc.key; ev.r = k + 1; chap.evs.push(ev); }
        for (const p of cc.packs) chap.packs.push({ x: p.x + bx, y: p.y + by, r: k + 1 });
        for (const i of cc.dCells) chap.dCells.push((by + ((i / R.W) | 0)) * W + bx + i % R.W);
        if (cc.dCells.length) { hasD = true; if (!cc.open) allOpen = false; }
        if (cc.boss) chap.bosses.push({ x: cc.boss.x + bx * TS, y: cc.boss.y + by * TS, dead: false, key: cc.key, r: k + 1 });
        for (const s of cc.scenes) chap.scenes.push({ id: s.id, sx: s.sx + bx, sy: s.sy + by, r: k + 1 });
      }
    });
    L.tr.forEach((t, k) => {
      const tx = t.box.x + ox, ty = t.box.y + oy, T = BigGen.trans({ kind: t.kind, tw: t.box.w, th: t.box.h, A: t.A, B: t.B, sa: t.sa, sb: t.sb, theme });
      for (let y = 0; y < T.H; y++) for (let x = 0; x < T.W; x++) { const i = (ty + y) * W + tx + x, j = y * T.W + x; if (rmap[i]) continue; grid[i] = T.grid[j]; deco[i] = T.deco[j]; rmap[i] = k + 1; }
      const rr = T.rooms.map(r => ({ x: r.x + tx, y: r.y + ty, w: r.w, h: r.h }));
      regions[k].others.push(...rr); regions[k].nTrans = rr.length;
      trans.push({ rect: { x: tx, y: ty, w: t.box.w, h: t.box.h }, name: T.name, r: k + 1, kind: t.kind, seen: false });
    });
    if (chap) chap.open = hasD && allOpen;
    for (const r of regions) others.push(...r.others);
    const R0 = regions[0], start = R0.start, boss = regions[n - 1].exit;
    const w = { kind: 'map', big: true, W, H, grid, deco, rmap, rooms: [start, boss].concat(others), start, boss, others, tier, theme, mlvl: mapLevel(tier), grade: mapGrade(tier), mm: aggMods([]),
      regions, trans, stage: { i: 1, n }, intro: R0.intro, name: R0.title + `（第 1 / ${n} 區）` };
    if (chap) w.chap = chap;
    // 整張圖每塊地都走得到（封住的通道先當成路，算完再封回去）
    if (chap) for (const i of chap.dCells) grid[i] = 1;
    try { ensureConnected(w); } catch (e) { console.error('[BigMap ensureConnected]', e); }
    if (chap && !chap.open) for (const i of chap.dCells) { grid[i] = 0; deco[i] = 0; }
    return w;
  }
  // ④ 生一區的怪：暫時把地圖看成「只有這一區」（房間、起點、首領房、劇情資料、怪物清單），讓所有 'stage' 掛鉤照舊運作
  function activate(w, k) {
    const reg = w.regions && w.regions[k - 1]; if (!reg || reg.act) return false;
    reg.act = true;
    const n = w.stage.n, keep = { mons: G.mons, events: w.events || [], others: w.others, boss: w.boss, start: w.start, si: w.stage.i, chap: w.chap };
    G.mons = []; w.events = []; w.others = reg.others; w.start = reg.start; w.boss = k === n ? keep.boss : null; w.stage.i = k;
    if (keep.chap) { const c = keep.chap; w.chap = { key: reg.key || c.key, keys: c.keys, evs: c.evs, packs: c.packs.filter(p => p.r === k), dCells: c.dCells, open: c.open, boss: null, bosses: c.bosses.filter(b => b.r === k), scenes: c.scenes }; }
    try { populateRegion(w, reg, k === n); stageFixup(w); }
    catch (e) { console.error('[BigMap activate]', e); }
    finally {
      for (const m of G.mons) m.reg = k;
      G.mons = keep.mons.concat(G.mons); w.events = keep.events.concat(w.events || []);
      w.others = keep.others; w.start = keep.start; w.boss = keep.boss; w.stage.i = keep.si; w.chap = keep.chap;
    }
    return true;
  }
  function populateRegion(w, reg, last) {
    for (const r of reg.others) { const packs = r.w * r.h > 80 ? 2 : 1; for (let i = 0; i < packs; i++) spawnPack((r.x + rnd(1.5, r.w - 1.5)) * TS, (r.y + rnd(1.5, r.h - 1.5)) * TS, w); }
    const R = reg.rect, s = reg.i === 1 ? cen(reg.start) : reg.sPt, ex = reg.exit;
    let floor = 0; for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) if (w.grid[y * w.W + x]) floor++;
    const base = w.tier === 1 ? 3 : w.tier === 2 ? 4 : w.tier < DEEP_TIER ? 6 : Math.max(3, Math.round(6 * floor / 2000));
    const want = Math.max(1, base - reg.nTrans);
    for (let placed = 0, tries = 0; placed < want && tries < 400; tries++) {
      const x = rint(R.x + 1, R.x + R.w - 2), y = rint(R.y + 1, R.y + R.h - 2), i = y * w.W + x;
      if (w.grid[i] !== 1 || w.rmap[i] !== reg.i || Math.hypot(x - s.x, y - s.y) * TS < 500) continue;
      if (last && x >= ex.x && x < ex.x + ex.w && y >= ex.y && y < ex.y + ex.h) continue;
      spawnPack(x * TS + 16, y * TS + 16, w); placed++;
    }
    if (last) { const bc = cen(ex); G.mons.push(makeBoss(w.theme.boss, (bc.x + 0.5) * TS, (bc.y + 0.5) * TS, w.mlvl + MON_LVL_BONUS.boss)); }
  }
  // ⑤ 人在哪一區
  const regionAt = (w, x, y) => { if (!w || !w.rmap) return 0; const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= w.W || ty >= w.H ? 0 : w.rmap[ty * w.W + tx]; };
  const here = o => { const w = G.world; if (!w || !w.regions || !o) return true; const r = regionAt(w, o.x, o.y); return !r || r === w.stage.i; };
  function enter(w, k, quiet) {
    const reg = w.regions[k - 1], n = w.stage.n; if (!reg) return;
    w.stage.i = k; w.name = reg.title + `（第 ${k} / ${n} 區）`; w.intro = reg.intro;
    activate(w, k);
    if (reg.seen) return;
    for (const r of w.regions) if (r.i <= k) r.seen = true;
    if (k === n && w.bt) w.bt.el = 0;   // 懸賞的速攻從最後一區開始算
    if (quiet) return;
    const sub = k === n ? '看守者就在這一區' : '沿著路往前走，就會到下一區';
    UI.banner(reg.intro ? `${reg.name}（第 ${k} / ${n} 區）` : `第 ${k} / ${n} 區${reg.kind ? '・' + (BigGen.KIND[reg.kind] || '') : ''}`, reg.intro || sub, '#ffcf70');
    if (reg.intro) UI.msg(sub, '#ffcf70');
    saveGame();
  }
  let _t = 0;
  Hook.on('update', dt => {
    const w = G.world, pl = G.pl; if (!w || !w.regions || w.kind !== 'map' || !pl) return;
    if ((_t += dt) < 0.2) return; _t = 0;
    const k = regionAt(w, pl.x, pl.y);
    if (k && k !== w.stage.i) enter(w, k);
    for (const reg of w.regions) {
      if (reg.act || (reg.i > 1 && !w.regions[reg.i - 2].seen)) continue;
      const R = reg.rect, dx = Math.max(R.x * TS - pl.x, 0, pl.x - (R.x + R.w) * TS), dy = Math.max(R.y * TS - pl.y, 0, pl.y - (R.y + R.h) * TS);
      if (dx < VW && dy < VH) activate(w, reg.i);
    }
    const tx = Math.floor(pl.x / TS), ty = Math.floor(pl.y / TS);
    for (const t of w.trans || []) if (!t.seen && t.name && tx >= t.rect.x && tx < t.rect.x + t.rect.w && ty >= t.rect.y && ty < t.rect.y + t.rect.h) { t.seen = true; UI.msg(`${t.name}——穿過去就是下一區`, '#c8b890'); }
    for (const m of G.mons) m.zz = Math.abs(m.x - pl.x) > 1800 || Math.abs(m.y - pl.y) > 1400;
  });
  return { build, activate, enter, regionAt, here, ports, layout };
})();
// 測試、舊存檔換區用：把玩家移到第 i 區的入口（那一區的怪會生出來，前面的區算走過了）
function goRegion(i) {
  const w = G.world; if (!w || !w.regions || !G.pl) return false;
  i = clamp(i, 1, w.stage.n);
  const reg = w.regions[i - 1], p = i === 1 ? { x: reg.start.x + reg.start.w / 2, y: reg.start.y + reg.start.h / 2 } : reg.sPt;
  for (const r of w.regions) if (r.i < i) r.seen = true;
  const f = nearestFloor(p.x * TS + 16, p.y * TS + 16); G.pl.x = f.x; G.pl.y = f.y;
  G.mins.forEach(m => { m.x = G.pl.x + rnd(-30, 30); m.y = G.pl.y + rnd(-30, 30); });
  w.flowT = 0; BigMap.enter(w, i);
  return true;
}
