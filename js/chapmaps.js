// =============================================================
//  章節手工地圖（引擎）：主線第 1～10 夜每一區用固定地形，第 11 夜以後照舊隨機
//  玩家看到：同一夜同一區每次進去地形、障礙物、劇情事件、布景、區域首領的位置都一樣；怪物照舊隨機放在固定的房間裡
//    ・封住的通道（D）：一開始是發光的封印牆，完成打開它的劇情事件後震動＋粒子，變成路
//      打開時不整張重畫底圖：v2.19 起底圖分塊畫，只把蓋到 D 的那幾塊標記重畫（worldRepaint，下次畫到時才畫）
//    ・進每一區時橫幅副標是那一區的 intro（stages.js 讀 w.intro）
//    ・劇情點、布景周圍 5 格內不放怪：隨機的怪群、p 標記、守護者放好之後整群搬到別的房間（伏擊自己的怪、區域首領不算）
//    ・首領之門離劇情點至少 4 格、不壓在布景上（第 3 區有劇情點時用）
//  資料：內容檔（chapmaps1.js 第 1～5 夜、chapmaps2.js 第 6～10 夜）呼叫 ChapterMaps.add({ tier, stage, name, intro, rows, events, bosses })
//        存在 CHAPTER_MAPS['夜-區']；後加的蓋掉先加的。格式見 D:\POE系統 的章節地圖規格
//  地圖物件：一般欄位跟 game.js 的 genMap 一樣，另外 w.chap = { key, evs:[{n,id,part,kind,x,y,tx,ty,done,amb…}], packs, dCells, open, boss:{x,y,dead}, scenes:[…] }
//        （全是純資料，dreamkeep.js「沒打完的夢」會整份存起來，D 的開關跟著 grid 一起還原）
//        v2.19 大地圖（bigmap.js）把三區的 w.chap 合成一份：座標換成大地圖的、ev.key／ev.r（哪一區）、區域首領改成 bosses:[{x,y,dead,key,r}]；
//        生某一區的怪時 'stage' 掛鉤看到的 w.chap 是只有那一區 packs、bosses 的暫時版本（evs、scenes 是整張的）
//  角色存檔：P.chapEv = { 事件id: true, 'id#片': true }、P.chapBoss = { 首領id: true }（舊存檔在 'start' 自動補）
//  接點：stages.js 的 genMap 包裝裡呼叫 ChapterMaps.build(tier, 區)（沒資料回傳 null＝照舊隨機）；Hook 'start'、'stage'、'drawWorld'
//  另外：chapevents.js（互動、獎勵、日誌、任務面板）、chapart.js（地上標記、人物）、chapscenes.js（布景）、chapboss.js（區域首領）
// =============================================================
const CHAPTER_MAPS = {};
const CH_DECO = { '~': 2, '%': 8, '^': 14, T: 1, o: 3, c: 4, I: 5, '*': 6, b: 7, '!': 9, m: 10, w: 11, t: 12, v: 13 };
const ChapterMaps = {
  add(def) {
    if (!def || !def.tier || !def.stage || !Array.isArray(def.rows)) return console.warn('[ChapterMaps] 資料不完整', def);
    const key = def.tier + '-' + def.stage, rows = def.rows, L = rows[0].length;
    if (rows.some(r => r.length !== L)) console.warn(`[ChapterMaps] 第 ${key} 區的 rows 長度不一致`);
    if (rows.join('').split('S').length !== 2) console.warn(`[ChapterMaps] 第 ${key} 區的 S 不是剛好 1 個`);
    CHAPTER_MAPS[key] = def;
    // 劇情視窗的內容（STORY 的 key：chev_事件id、chev_事件id#片、chev_事件id#after）
    const pages = p => (Array.isArray(p) ? p : [p]).filter(Boolean);
    for (const n in def.events || {}) {
      const e = def.events[n]; if (!e || !e.id) continue;
      const jt = (e.done && e.done.title) || e.title || '夢裡的故事';
      if (e.kind === 'collect') {
        STORY['chev_' + e.id + '#' + (e.part || 1)] = { title: e.title || jt, pages: pages(e.pages).length ? pages(e.pages) : ['……'], journal: { title: e.title || jt, text: e.journal || '' } };
        if (e.done) STORY['chev_' + e.id] = { title: e.done.title || jt, pages: pages(e.done.pages).length ? pages(e.done.pages) : ['……'], journal: { title: jt, text: e.done.journal || '' } };
      } else STORY['chev_' + e.id] = { title: e.title || jt, pages: pages(e.pages).length ? pages(e.pages) : ['……'], journal: { title: jt, text: e.journal || '' } };
      if (e.kind === 'ambush' && e.after) STORY['chev_' + e.id + '#after'] = { title: e.title || jt, pages: pages(e.after), journal: { title: jt, text: e.journal || '' } };
    }
  },
  // v2.19 大地圖：一張圖有三區的資料，事件、區域首領各自帶 key（'夜-區'）；沒給 key＝舊存檔的單區圖
  def(w, key) { return w && w.chap ? CHAPTER_MAPS[key || w.chap.key] : null; },
  evDef(w, ev) { const d = this.def(w, ev && ev.key); return d && d.events && d.events[ev.n]; },
  // 一夜的劇情單位（日誌、任務面板用）：一般事件 1 個算 1 個；收集算 1 個（底下有幾片）；綁劇情的區域首領如果事件不存在，也算 1 個
  units(tier) {
    const out = [], seen = {};
    for (let s = 1; s <= 3; s++) {
      const d = CHAPTER_MAPS[tier + '-' + s]; if (!d) continue;
      for (const n in d.events || {}) {
        const e = d.events[n]; if (!e || !e.id) continue;
        let u = seen[e.id];
        if (!u) { u = seen[e.id] = { id: e.id, kind: e.kind, stage: s, ev: e, parts: [], title: (e.done && e.done.title) || e.title || '夢裡的故事', journal: (e.done && e.done.journal) || e.journal || '' }; out.push(u); }
        if (e.kind === 'collect') { u.parts.push(e.part || u.parts.length + 1); if (e.done && !u.ev.done) { u.ev = e; u.title = e.done.title || u.title; u.journal = e.done.journal || u.journal; } }
      }
      for (const b in d.bosses || {}) { const bd = d.bosses[b]; if (bd && bd.story && !seen[bd.story]) out.push(seen[bd.story] = { id: bd.story, kind: 'boss', stage: s, boss: bd, parts: [], title: `打倒${bd.name}`, journal: bd.journal || `我在夢裡打倒了${bd.name}。` }); }
    }
    for (const u of out) u.of = u.kind === 'collect' ? (u.ev.of || u.parts.length) : 1;
    return out;
  },
  bosses(tier) { const a = []; for (let s = 1; s <= 3; s++) { const d = CHAPTER_MAPS[tier + '-' + s]; for (const b in (d && d.bosses) || {}) if (d.bosses[b] && d.bosses[b].id) a.push(d.bosses[b]); } return a; },
  // 從 rows 蓋出一張地圖（沒有資料回傳 null）
  build(tier, si) {
    if (!(tier >= 1 && tier < DEEP_TIER)) return null;
    const key = tier + '-' + si, def = CHAPTER_MAPS[key]; if (!def || !def.rows || !def.rows.length) return null;
    const rows = def.rows, H = rows.length, W = Math.max(...rows.map(r => r.length)), P = G.P || {};
    const grid = new Uint8Array(W * H), deco = new Uint8Array(W * H), evs = [], packs = [], dCells = [];
    let S = null, B = null, xb = null;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = rows[y][x] || '#', i = y * W + x;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) continue;   // 四周一定是牆
      if (ch === '.' || ch === 'S' || ch === 'X' || ch === 'p' || ch === 'B' || ch === '=' || (ch >= '1' && ch <= '9')) grid[i] = 1;
      if (ch === '=') deco[i] = 15;
      else if (ch === 'S') S = { x, y };
      else if (ch === 'B') B = { x, y };
      else if (ch === 'p') packs.push({ x, y });
      else if (ch === 'D') dCells.push(i);
      else if (ch === 'X') xb = xb ? { x0: Math.min(xb.x0, x), y0: Math.min(xb.y0, y), x1: Math.max(xb.x1, x), y1: Math.max(xb.y1, y) } : { x0: x, y0: y, x1: x, y1: y };
      else if (ch >= '1' && ch <= '9') { const e = def.events && def.events[ch]; if (e && e.id) evs.push({ n: ch, id: e.id, part: e.part || 0, kind: e.kind, tx: x, ty: y, x: x * TS + 16, y: y * TS + 16, done: false }); }
      else if (CH_DECO[ch]) deco[i] = CH_DECO[ch];
    }
    if (!S) { const i = grid.indexOf(1); S = { x: i % W, y: (i / W) | 0 }; }
    const start = { x: clamp(S.x - 4, 1, W - 10), y: clamp(S.y - 3.5, 1, H - 9), w: 9, h: 8 };
    const inR = (r, x, y) => r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    // 房間：約 10×8 的區塊，地板夠多的當房間（populate 在這裡放怪）；出口房和起點不算
    const cand = [];
    let floor = 0; for (let i = 0; i < grid.length; i++) if (grid[i]) floor++;
    let boss = xb ? { x: xb.x0, y: xb.y0, w: xb.x1 - xb.x0 + 1, h: xb.y1 - xb.y0 + 1 } : null;
    for (let by = 1; by < H - 1; by += 8) for (let bx = 1; bx < W - 1; bx += 10) {
      let n = 0, a = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = by; y < Math.min(H - 1, by + 8); y++) for (let x = bx; x < Math.min(W - 1, bx + 10); x++) {
        a++; if (!grid[y * W + x]) continue; n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
      if (n / a >= 0.5) cand.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, f: n / a, d: Math.hypot(bx + 5 - S.x, by + 4 - S.y) });
    }
    const hit = (r, o) => o && r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y;
    if (!boss) { const far = cand.slice().sort((a, b) => b.d - a.d)[0] || { x: W - 12, y: H - 10, w: 9, h: 7 }; boss = { x: far.x, y: far.y, w: far.w, h: far.h }; }
    const N = tier <= 2 ? Math.max(tier === 1 ? 3 : 5, Math.round(floor / (tier === 1 ? 200 : 133)) - packs.length) : Math.max(6, Math.round(floor / 100) - packs.length);   // v2.18.2 放怪的房間數：第 1 夜減半、第 2 夜 ×0.75（新手）
    const others = cand.filter(r => !hit(r, start) && !hit(r, boss)).sort((a, b) => b.f - a.f).slice(0, N).map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
    const theme = THEMES[(tier - 1) % THEMES.length];
    const chap = { key, evs, packs, dCells, open: false, boss: B && def.bosses && def.bosses.B ? { x: B.x * TS + 16, y: B.y * TS + 16, dead: false } : null, scenes: [] };
    const w = { kind: 'map', W, H, grid, deco, rooms: [start, boss].concat(others), start, boss, others, tier, theme, mlvl: mapLevel(tier), grade: mapGrade(tier), mm: aggMods([]),
      name: `第 ${tier} 夜之夢・${def.name || theme.name}`, intro: def.intro || '', chap };
    // 已經完成的事件
    const done = P.chapEv || {};
    for (const ev of evs) ev.done = !!done[ev.kind === 'collect' ? ev.id + '#' + (ev.part || 1) : ev.id];
    // 布景（chapscenes.js）：蓋在事件後面，把房子、帳篷佔的格子設成擋路
    if (typeof ChapScenes !== 'undefined') for (const ev of evs) { const e = def.events[ev.n]; if (e && e.scene) try { ChapScenes.place(w, ev, e.scene); } catch (err) { console.error('[ChapScenes]', err); } }
    // 保險：每塊地都走得到（D 先當成路，算完再封回去）
    for (const i of dCells) grid[i] = 1;
    try { ensureConnected(w); } catch (e) { }
    const opened = evs.some(ev => ev.done && def.events[ev.n] && def.events[ev.n].opens);
    if (opened) chap.open = true; else for (const i of dCells) { grid[i] = 0; deco[i] = 0; }
    return w;
  },
  // 打開這張圖所有的 D（震動、粒子、訊息、重畫底圖）
  openD(w, quiet) {
    const c = w && w.chap; if (!c || c.open || !c.dCells.length) return false;
    c.open = true;
    for (const i of c.dCells) { w.grid[i] = 1; w.deco[i] = 0; }
    // v2.19 分塊畫：只把蓋到 D 的那幾塊標記重畫（下次畫到時才畫），小地圖補 D 和四周一格
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (const i of c.dCells) { const x = i % w.W, y = Math.floor(i / w.W); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    worldRepaint(w, x0, y0, x1, y1);
    if (w === G.world) {
      if (w.miniG && w.explored) {
        const seen = {};
        for (const i of c.dCells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const x = i % w.W + dx, y = Math.floor(i / w.W) + dy, j = y * w.W + x;
          if (x < 0 || y < 0 || x >= w.W || y >= w.H || seen[j] || !w.explored[j]) continue; seen[j] = 1; w.miniG.clearRect(x, y, 1, 1); paintMini(w, x, y);
        }
      }
      if (!quiet) {
        G.shake = Math.max(G.shake, 9); Sfx.play('portal');
        c.dCells.forEach((i, k) => { if (k % 2 === 0 || c.dCells.length < 20) burst((i % w.W) * TS + 16, Math.floor(i / w.W) * TS + 16, k % 3 ? '#ffd36a' : '#c8a8ff', 10, 160); });
        UI.msg('轟隆——封住的通道打開了，可以往前走了。', '#ffd36a');
      }
    }
    return true;
  },
  // 測試用：把某一區的地圖拿掉（回到隨機）
  remove(tier, stage) { delete CHAPTER_MAPS[tier + '-' + stage]; },
};
Hook.on('start', P => { P.chapEv = P.chapEv || {}; P.chapBoss = P.chapBoss || {}; });
// 每一區放好之後：p 的怪群、把隨機地圖事件（神殿、寶箱……）移到劇情事件 3 格外
Hook.on('stage', w => {
  const c = w && w.chap; if (!c || w.bossRoom || c.staged) return; c.staged = true;
  for (const p of c.packs) spawnPack(p.x * TS + 16, p.y * TS + 16, w);
  const spots = c.evs.map(e => [e.x, e.y]).concat(c.boss ? [[c.boss.x, c.boss.y]] : []);
  const near = (x, y) => spots.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 3.5 * TS);
  if (!w.events) return;
  w.events = w.events.filter(ev => {
    if (!near(ev.x, ev.y)) return true;
    for (let t = 0; t < 60; t++) {
      const r = pick(w.others || []); if (!r) break;
      const x = rint(r.x + 1, r.x + r.w - 2), y = rint(r.y + 1, r.y + r.h - 2), px = x * TS + 16, py = y * TS + 16;
      let ok = !near(px, py) && !w.events.some(e => e !== ev && Math.hypot(e.x - px, e.y - py) < 80);
      for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (!w.grid[(y + dy) * w.W + x + dx]) ok = false;
      if (ok) { ev.x = px; ev.y = py; return true; }
    }
    return false;
  });
});
// 封住的通道：發光的封印（只畫畫面裡的）
Hook.on('drawWorld', g => {
  const w = G.world, c = w && w.chap; if (!c || c.open || !c.dCells.length) return;
  const cx = G.cam.x, cy = G.cam.y, t = G.time;
  g.save();
  for (const i of c.dCells) {
    const x = (i % w.W) * TS, y = Math.floor(i / w.W) * TS;
    if (x < cx - TS || x > cx + VW + TS || y < cy - TS || y > cy + VH + TS) continue;
    const a = 0.35 + 0.15 * Math.sin(t * 2.4 + i * 0.7);
    g.fillStyle = `rgba(120,80,200,${a})`; g.fillRect(x + 2, y, TS - 4, TS);
    g.fillStyle = `rgba(255,211,106,${a + 0.2})`;
    g.fillRect(x + 6, y + 4 + ((t * 12 + i * 5) % 22), 4, 4); g.fillRect(x + 20, y + 4 + ((t * 9 + i * 11) % 22), 3, 3);
    g.strokeStyle = `rgba(255,220,140,${a + 0.25})`; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x + 16, y + 6); g.lineTo(x + 24, y + 16); g.lineTo(x + 16, y + 26); g.lineTo(x + 8, y + 16); g.closePath(); g.stroke();
  }
  g.restore();
});
Hook.on('light', (cut, cx, cy) => {
  const w = G.world, c = w && w.chap; if (!c || c.open || !c.dCells.length) return;
  for (let k = 0; k < c.dCells.length; k += 3) { const i = c.dCells[k], x = (i % w.W) * TS + 16 - cx, y = Math.floor(i / w.W) * TS + 16 - cy; if (x > -80 && x < VW + 80 && y > -80 && y < VH + 80) cut(x, y, 60, 0.35); }
});
// 劇情點、布景周圍 5 格內不放怪；首領之門離劇情點至少 4 格（排在 bossroom.js 放門和守護者、上面放 p 怪群之後）
Hook.on('stage', w => {
  const c = w && w.chap; if (!c || w.bossRoom || c.spaced) return; c.spaced = true;
  const W = w.W, R = 5 * TS, S = typeof ChapScenes !== 'undefined' ? ChapScenes.S : {};
  const boxes = (c.scenes || []).map(sc => S[sc.id] && { x0: sc.sx * TS, y0: sc.sy * TS, x1: (sc.sx + S[sc.id].w) * TS, y1: (sc.sy + S[sc.id].h) * TS }).filter(Boolean);
  const gap = (x, y) => {   // 離最近的劇情點／布景多遠（像素）
    let d = 1e9;
    for (const e of c.evs) d = Math.min(d, Math.hypot(e.x - x, e.y - y));
    for (const b of boxes) d = Math.min(d, Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1)));
    return d;
  };
  if (!c.evs.length && !boxes.length) return;
  const floor3 = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!w.grid[(y + dy) * W + x + dx]) return false; return true; };
  const inStart = (x, y) => w.start && x >= w.start.x && x < w.start.x + w.start.w && y >= w.start.y && y < w.start.y + w.start.h;
  // 首領之門：太靠近劇情點就在出口房裡（找不到再往外 3 格）挑離劇情點最遠的空地
  const gt = w.bossGate;
  if (gt && c.evs.some(e => Math.hypot(e.x - gt.x, e.y - gt.y) < 4 * TS) && w.boss) {
    let best = null;
    for (let y = Math.max(1, w.boss.y - 3); y < Math.min(w.H - 1, w.boss.y + w.boss.h + 3); y++) for (let x = Math.max(1, w.boss.x - 3); x < Math.min(W - 1, w.boss.x + w.boss.w + 3); x++) {
      if (!floor3(x, y) || inStart(x, y)) continue;
      const px = x * TS + 16, py = y * TS + 16, d = gap(px, py) - Math.hypot(px - gt.x, py - gt.y) * 0.05;   // 同樣遠時離原本的位置近一點
      if (!best || d > best.d) best = { x: px, y: py, d };
    }
    if (best) { gt.x = best.x; gt.y = best.y; }
  }
  // 怪：一群一起搬（140 內的算同一群），搬到別的房間離劇情點、布景 7 格以上的地方；找不到就留著
  const bad = G.mons.filter(m => !m.dead && !m.chapAmb && !m.chapBoss && !m.boss && gap(m.x, m.y) < R), done = new Set();
  const rooms = (w.others && w.others.length ? w.others : w.rooms || []).filter(r => r !== w.start);
  for (const m of bad) {
    if (done.has(m)) continue;
    const grp = bad.filter(o => !done.has(o) && Math.hypot(o.x - m.x, o.y - m.y) < 140); grp.forEach(o => done.add(o));
    let to = null;
    for (let t = 0; t < 60 && !to && rooms.length; t++) {
      const r = pick(rooms), x = rint(r.x + 1, r.x + r.w - 2), y = rint(r.y + 1, r.y + r.h - 2), px = x * TS + 16, py = y * TS + 16;
      if (x < 1 || y < 1 || x >= W - 1 || y >= w.H - 1 || !floor3(x, y) || inStart(x, y) || gap(px, py) < R + 2 * TS || (gt && Math.hypot(px - gt.x, py - gt.y) < 3 * TS)) continue;
      to = { x: px, y: py };
    }
    if (!to) continue;
    const mx = m.x, my = m.y;
    for (const o of grp) { const p = nearestFloor(to.x + (o.x - mx), to.y + (o.y - my)); o.x = p.x; o.y = p.y; }
  }
});
