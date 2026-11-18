// =============================================================
//  v2.15 首領房
//  ・每一夜的最後一區不再直接放看守者，改成首領房裡一扇「首領之門」（封印中）
//  ・同一區裡散布幾隻「精英守護者」（黃色精英，生命 ×1.8（第 1～2 夜 ×1.2）、等級 +2）：全部打倒，門才會打開
//    主線（第 1～10 夜）2 隻；深層夢境 3 隻，每深 10 夜再 +1（最多 5 隻）
//  ・按 F 進門：進到這個看守者自己的巢穴（一張新的圓形競技場），地形和機關跟著場景變：
//    熔岩洞窟＝岩漿池＋地底噴火；冰封峽谷＝冰晶柱＋落冰錐；骸骨墓穴＝骨堆石柱＋骷髏爬起來；
//    幽暗洞穴＝石筍＋落石；金色草原＝灌木＋落雷；迷霧海灘＝水池＋浪花；腐沼＝毒水＋沼氣毒池；
//    黑森林＝大樹＋荊棘根；沙漠遺跡＝仙人掌岩石＋沙暴；虛空神殿＝虛空水晶與裂隙＋虛空裂縫
//    機關都會先出現預警圈，躲開就不會受傷；看守者倒下後機關停止
//  ・掉寶、解鎖下一夜、懸賞、終局盤點數，都跟以前在地圖裡打倒看守者一樣
//  資料：地圖 w.bossGate = { id, mlvl, x, y, open }；守護者 m.guardian = true；巢穴 w.bossRoom = true、w.haz（機關）
//  接點：Hook 'stage'（這個檔要排在 atlas.js、depths.js 前面：先把看守者收起來，牠們的效果改在巢穴裡套用）、
//        'kill'、'update'、'drawWorld'、'light'；Interact 'bossgate'
// =============================================================
const BOSS_LAIR = {
  fire: { deco: [8, 9], haz: { every: 5, n: 3, elem: 'fire', r: 55, kind: 'zone' }, text: '熔岩會從地底噴發' },
  ice: { deco: [6, 6], haz: { every: 4.5, n: 4, elem: 'cold', r: 45, kind: 'blast' }, text: '冰錐會從頭頂落下' },
  bone: { deco: [7, 5], haz: { every: 10, adds: 2 }, text: '骸骨會從地上爬起來' },
  cave: { deco: [9, 10], haz: { every: 5, n: 3, elem: 'phys', r: 50, kind: 'blast' }, text: '洞頂會落石' },
  grass: { deco: [11, 3], haz: { every: 5, n: 2, elem: 'light', r: 50, kind: 'blast' }, text: '雷雲會落雷' },
  beach: { deco: [2, 3], haz: { every: 6, n: 3, elem: 'cold', r: 60, kind: 'blast' }, text: '浪潮會打上來' },
  swamp: { deco: [2, 12], haz: { every: 6, n: 3, elem: 'chaos', r: 60, kind: 'zone' }, text: '沼氣毒池會冒出來' },
  forest: { deco: [1, 11], haz: { every: 6, n: 3, elem: 'chaos', r: 55, kind: 'zone' }, text: '荊棘根會鑽出地面' },
  desert: { deco: [4, 3], haz: { every: 7, n: 4, elem: 'phys', r: 45, kind: 'blast' }, text: '沙暴會捲起碎石' },
  void: { deco: [13, 14], haz: { every: 5, n: 3, elem: 'chaos', r: 60, kind: 'zone' }, text: '虛空裂縫會被撕開' },
};
const guardianCount = w => (w.tier || 1) < DEEP_TIER ? 2 : Math.min(5, 3 + Math.floor(((w.tier || 11) - DEEP_TIER) / 10));
// —— ① 最後一區：收起看守者、放首領之門和守護者 ——
Hook.on('stage', w => {
  if (!w || w.kind !== 'map' || w.arena || w.bossRoom || w.rush || !w.stage || w.stage.i < w.stage.n || !w.boss) return;
  const b = G.mons.find(m => m.boss && !m.dead); if (!b) return;
  G.mons.splice(G.mons.indexOf(b), 1); if (G.bossBar === b) G.bossBar = null;
  const r = w.boss, gp = nearestFloor((r.x + r.w / 2) * TS, (r.y + r.h / 2) * TS);
  w.bossGate = { id: b.boss, mlvl: b.mlvl, x: gp.x, y: gp.y, open: false, need: guardianCount(w) };
  const rooms = (w.others || []).filter(o => o !== r).map(o => ({ o, d: Math.hypot(o.x - w.start.x, o.y - w.start.y) })).sort((a, c) => c.d - a.d);
  for (let i = 0; i < w.bossGate.need; i++) {
    const o = rooms.length ? rooms[i % rooms.length].o : r, p = randomFloorNear((o.x + o.w / 2) * TS, (o.y + o.h / 2) * TS, 40);
    const m = makeMonster(pick(w.theme.monsters), p.x, p.y, w.mlvl + 2, 'rare', w.theme);
    m.guardian = true; m.maxLife = Math.round(m.maxLife * ((w.tier || 9) <= 2 ? 1.2 : 1.8));   /* v2.18.2 第 1～2 夜 ×1.2 */ m.life = m.maxLife; m.name = '守護者・' + m.name; G.mons.push(m);
  }
  setTimeout(() => UI.msg(`這一區有 ${w.bossGate.need} 隻精英守護者：全部打倒，首領之門才會打開`, '#ffb070'), 900);
});
const guardLeft = w => G.mons.filter(m => m.guardian && !m.dead).length;
Hook.on('kill', m => {
  const w = G.world; if (!m.guardian || !w || !w.bossGate || w.bossGate.open) return;
  const left = guardLeft(w);
  if (left > 0) UI.msg(`守護者倒下了（還剩 ${left} 隻）`, '#ffb070');
});
// —— ② 進門：蓋一座這個看守者的巢穴 ——
function genLair(w0) {
  const W = 40, H = 32, grid = new Uint8Array(W * H), deco = new Uint8Array(W * H);
  const cx = 20, cy = 15, rx = 15.5, ry = 12.5;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const e = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 + (hash2(x, y) % 100) / 1400;
    if (e < 1) grid[y * W + x] = 1;
  }
  const L = BOSS_LAIR[w0.theme.id] || BOSS_LAIR.void;
  // 障礙：兩圈，左右對稱（大的一種在外圈、另一種在內圈）
  const put = (x, y, t) => { const pool = t === 2 || t === 8 || t === 14; const cells = pool ? [[0, 0], [1, 0], [0, 1], [1, 1]] : [[0, 0]];
    for (const [dx, dy] of cells) { const i = (y + dy) * W + x + dx; if (grid[i]) { grid[i] = 0; deco[i] = t; } } };
  for (const [ang, rr, t] of [[-150, 0.72, 0], [-30, 0.72, 0], [150, 0.72, 0], [30, 0.72, 0], [-115, 0.5, 1], [-65, 0.5, 1], [180, 0.55, 1], [0, 0.55, 1]]) {
    const a = ang * Math.PI / 180; put(Math.round(cx + Math.cos(a) * rx * rr), Math.round(cy + Math.sin(a) * ry * rr), L.deco[t]);
  }
  const room = { x: 6, y: 4, w: 28, h: 23 };
  return { kind: 'map', bossRoom: true, W, H, grid, deco, rooms: [room], start: { x: 17, y: 24, w: 6, h: 3 }, boss: { x: 13, y: 4, w: 14, h: 9 }, others: [],
    tier: w0.tier, theme: w0.theme, mlvl: w0.mlvl, grade: w0.grade, mm: w0.mm, bt: w0.bt, name: `${BOSSES[w0.bossGate.id].name}的巢穴` };
}
function enterLair() {
  const w0 = G.world, gate = w0.bossGate; if (!gate || !gate.open) return;
  const L = BOSS_LAIR[w0.theme.id] || BOSS_LAIR.void;
  G.gateBack = { world: w0, mons: G.mons.filter(m => !m.dead), loot: G.loot, bossBar: null };   // v2.18.2 門口回來點：在巢穴裡倒下，可以回到這裡（game.js playerDie、deathhelp.js）
  resetEntities();
  const w = genLair(w0); G.world = w; buildWorldCanvas(w);
  const s = w.start; G.pl.x = (s.x + s.w / 2) * TS; G.pl.y = (s.y + 1) * TS;
  G.mins.forEach(m => { m.x = G.pl.x + rnd(-30, 30); m.y = G.pl.y + rnd(-30, 30); });
  const b = makeBoss(gate.id, 20 * TS, 9 * TS, gate.mlvl); G.mons.push(b);
  const ref = makeMonster(w.theme.monsters[0], 0, 0, w.mlvl, 'normal', w.theme);
  w.haz = Object.assign({ t: 3, pend: [], ref: (ref.dmg[0] + ref.dmg[1]) / 2 }, L.haz);
  w.flowT = 0; Hook.emit('stage', w);   // 終局盤（看守者強化、雙看守者）、世界規則（巨像、護衛）在這裡套用
  Sfx.play('portal'); UI.banner(w.name, L.text + '・看預警圈躲開', '#ffb070'); UI.msg('已經在首領之門前記下回來點：在巢穴裡倒下，可以直接回到門口再打一次', '#9fd0ff'); saveGame();
}
Interact.add('bossgate', (pl, w) => w.bossGate ? [{ ref: w.bossGate, label: w.bossGate.open ? '進入首領之門' : `首領之門（封印中：還有 ${guardLeft(w)} 隻守護者）`, r: 70 }] : null, ref => {
  if (!ref.open) return UI.msg(`首領之門被封印了：先打倒這一區的 ${guardLeft(G.world)} 隻精英守護者`, '#ffb070');
  const left = valuableLeft();   // v2.18.2 跟區域門口一樣：只算黃裝、傳奇、套裝（stages.js）
  if (left) gameAsk(`這一區地上還有 ${left} 件黃裝／傳奇／套裝沒撿。\n進了首領之門，除非在巢穴裡倒下，不然就回不來這一區，要進去嗎？`, enterLair); else enterLair();
});
// —— ③ 每格：門的封印、巢穴機關 ——
Hook.on('update', dt => {
  const w = G.world, pl = G.pl; if (!w || !pl) return;
  const gate = w.bossGate;
  if (gate && !gate.open && guardLeft(w) === 0 && G.time > 1) { gate.open = true; UI.banner('首領之門開啟了', ctlText('守護者都倒下了・走到門前{interact}', true), '#ffd36a'); Sfx.play('unique'); burst(gate.x, gate.y, '#ffd36a', 40, 220); }
  if (gate && !gate.open) mechHud('guardHud', 168, '#ffb070', `精英守護者　還剩 ${guardLeft(w)} / ${gate.need}`); else mechHud('guardHud', 168, '#ffb070', '');
  const H = w.haz; if (!w.bossRoom || !H) return;
  const boss = G.mons.find(m => m.boss && !m.dead && !m.twin); if (!boss || !boss.awake) return;
  if ((H.t -= dt) <= 0) {
    H.t = H.every;
    if (H.adds) {
      for (let i = 0; i < H.adds; i++) { const a = Math.random() * Math.PI * 2, p = randomFloorNear(pl.x + Math.cos(a) * 180, pl.y + Math.sin(a) * 140, 40);
        const m = makeMonster(pick(w.theme.monsters), p.x, p.y, w.mlvl, 'normal', w.theme); m.aggro = true; G.mons.push(m); burst(p.x, p.y, '#d8d0b0', 14, 140); }
      UI.msg('骸骨爬起來了', '#d8d0b0');
    } else for (let i = 0; i < H.n; i++) {
      const p = i === 0 ? nearestFloor(pl.x + rnd(-30, 30), pl.y + rnd(-30, 30)) : randomFloorNear(pl.x + rnd(-170, 170), pl.y + rnd(-130, 130), 40);
      const col = ELEM_COLOR[H.elem] || '#ffffff';
      G.teles.push({ shape: 'circle', x: p.x, y: p.y, r: H.r, dur: 1.1, t: 0, color: col });
      H.pend.push({ x: p.x, y: p.y, at: G.time + 1.1 });
    }
  }
  for (const q of H.pend) if (G.time >= q.at) {
    q.done = true; const col = ELEM_COLOR[H.elem] || '#ffffff';
    if (H.kind === 'zone') G.zones.push({ x: q.x, y: q.y, r: H.r, dps: H.ref * 0.9, elem: H.elem === 'phys' ? 'fire' : H.elem, t: 0, dur: 4 });
    else { G.fx.push({ k: 'ring', x: q.x, y: q.y, r: H.r, t: 0, dur: 0.35, color: col, fill: col + '44' }); burst(q.x, q.y, col, 16, 200); G.shake = Math.max(G.shake, 3);
      if (Math.hypot(pl.x - q.x, pl.y - q.y) < H.r + pl.r) damagePlayer([[H.ref * 2.2, H.elem]], { spell: true }); }
  }
  H.pend = H.pend.filter(q => !q.done);
});
// —— ④ 畫門 ——
Hook.on('drawWorld', g => {
  const w = G.world, gate = w && w.bossGate; if (!gate) return;
  if (gate.open) drawPortal(g, gate.x, gate.y, '#ffb050', `首領之門・${BOSSES[gate.id].name}`);
  else {
    drawPortal(g, gate.x, gate.y, '#6a4a5a', `首領之門（封印：守護者 ${guardLeft(w)} / ${gate.need}）`);
    g.save(); g.strokeStyle = 'rgba(180,140,120,0.85)'; g.lineWidth = 3;   // 封印的鎖鏈
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(gate.x - 26, gate.y - 34 * s * 0.6 - 8); g.lineTo(gate.x + 26, gate.y + 34 * s * 0.6 - 8); g.stroke(); }
    g.restore();
  }
});
// v2.18.2 守護者在哪：門還封著時，最近一隻守護者在畫面外，就在畫面邊緣畫一個橘色箭頭指過去（旁邊寫距離）
Hook.on('drawHUD', g => {
  const w = G.world, gate = w && w.bossGate, pl = G.pl; if (!gate || gate.open || !pl || G.dead) return;
  let m = null, d = 1e9; for (const x of G.mons) if (x.guardian && !x.dead) { const dd = Math.hypot(x.x - pl.x, x.y - pl.y); if (dd < d) { d = dd; m = x; } }
  if (!m) return;
  const cx = G.cam.x, cy = G.cam.y, sx = m.x - cx, sy = m.y - cy;
  if (sx > 20 && sx < VW - 20 && sy > 20 && sy < VH - 70) return;   // 已經在畫面裡
  const px = pl.x - cx, py = pl.y - cy, a = Math.atan2(sy - py, sx - px);
  const L = 46, R = VW - 46, T = 70, B = VH - 96, ca = Math.cos(a), sa = Math.sin(a);
  const k = Math.min(ca > 0 ? (R - px) / ca : ca < 0 ? (L - px) / ca : 1e9, sa > 0 ? (B - py) / sa : sa < 0 ? (T - py) / sa : 1e9);
  const ax = px + ca * k, ay = py + sa * k, p = 0.7 + 0.3 * Math.sin(G.time * 6);
  const sz = IS_TOUCH ? 1.6 : 1.2;   // 手機畫面縮得比較小，箭頭畫大一點
  g.save(); g.translate(ax, ay); g.rotate(a); g.scale(sz, sz); g.globalAlpha = p;
  g.fillStyle = '#ff8a30'; g.strokeStyle = '#1a0a00'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(16, 0); g.lineTo(-10, -12); g.lineTo(-4, 0); g.lineTo(-10, 12); g.closePath(); g.fill(); g.stroke();
  g.restore();
  txt(g, `守護者 ${Math.round(d / TS)} 格`, clamp(ax - ca * 36 * sz, 50, VW - 50), ay - sa * 30 * sz, IS_TOUCH ? 15 : 12, '#ffb070', 'center');
});
Hook.on('light', (cut, cx, cy) => { const w = G.world, gate = w && w.bossGate; if (gate) cut(gate.x - cx, gate.y - cy, gate.open ? 150 : 90, gate.open ? 0.8 : 0.45); });
// 測試用：直接把守護者清掉、打開門並進去
const BossRoom = { skip() { const w = G.world; if (!w.bossGate) return false; G.mons.filter(m => m.guardian).forEach(m => killMonster(m)); w.bossGate.open = true; enterLair(); return true; } };
