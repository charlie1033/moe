// =============================================================
//  v2.8.11 每個營地的擺位都不一樣：夢之門、回夢的藍門、出生點、營火、柱子、NPC、路人的位置
//  （夢醒之牢維持原本的樣子；終局村莊另外設計）
// =============================================================
const TOWN_LAYOUT = {
  icecamp: { portal: [8, 6], ret: [13, 6], spawn: [15, 14], fire: [20, 11], pillars: [[4, 4], [26, 4], [4, 16], [18, 17]],
    npcs: { are: [23, 7], stash: [25, 15], vivi: [9, 15] }, folk: { f_dwarf: [4, 10], f_kid: [27, 11] } },
  harbor: { portal: [22, 5], ret: [26, 7], spawn: [8, 14], fire: [12, 9], pillars: [[3, 3], [14, 3], [3, 17], [27, 17]],
    npcs: { hassan: [6, 7], stash: [16, 15], mo: [25, 14] }, folk: { f_mer: [27, 10], f_sailor: [10, 16] } },
  grove: { portal: [15, 15], ret: [20, 15], spawn: [15, 7], fire: [15, 11], pillars: [[6, 12], [24, 10], [9, 17], [3, 4]],
    npcs: { yin: [7, 6], stash: [23, 6], karl: [25, 15] }, folk: { f_elf: [4, 15], f_gnome: [26, 12] } },
  lighthouse: { portal: [24, 10], ret: [24, 15], spawn: [6, 10], fire: [12, 10], pillars: [[18, 7], [18, 13], [4, 3], [4, 16]],
    npcs: { nova: [12, 5], stash: [12, 15], king: [21, 4] }, folk: { f_maud: [8, 16], f_old: [26, 4] } },
};
// NPC、路人的位置直接改在資料上
for (const id in TOWN_LAYOUT) {
  const L = TOWN_LAYOUT[id], hub = HUB_BY_ID[id]; if (!hub) continue;
  for (const n of hub.npcs) if (L.npcs[n.id]) n.at = L.npcs[n.id];
  for (const f of (CAMP_FOLK[id] || [])) if (L.folk[f.id]) f.at = L.folk[f.id];
}
const _genTownTL = genTown;
genTown = function (hubId) {
  const w = _genTownTL(hubId), L = TOWN_LAYOUT[hubId]; if (!L) return w;
  const W = w.W;
  for (const [x, y] of [[6, 5], [23, 5], [6, 14], [23, 14]]) w.grid[y * W + x] = 1;   // 原本的柱子拿掉
  for (const [x, y] of L.pillars) w.grid[y * W + x] = 0;
  w.portal = { x: L.portal[0] * TS, y: L.portal[1] * TS }; w.retPortal = { x: L.ret[0] * TS, y: L.ret[1] * TS };
  w.spawn = { x: L.spawn[0] * TS, y: L.spawn[1] * TS }; w.fire = L.fire;
  return w;
};

// v2.8.13 每個營地的夢之門都在正中間，就是那堆營火：走到營火旁按 F 進入夢境（回夢的藍門在營火右邊）
const GATE_AT = { village: [22, 14] };
const _genTownGate = genTown;
genTown = function (hubId) {
  const w = _genTownGate(hubId);
  const [cx, cy] = GATE_AT[hubId] || [Math.floor(w.W / 2), Math.floor(w.H / 2)];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 5; dx++) w.grid[(cy + dy) * w.W + cx + dx] = 1;   // 營火和藍門附近不要有柱子
  w.fire = [cx, cy]; w.fireGate = true;
  w.portal = { x: cx * TS, y: cy * TS }; w.retPortal = { x: (cx + 4) * TS, y: cy * TS };
  w.spawn = { x: cx * TS, y: (cy + 4) * TS };
  for (const n of w.npcs) if (Math.hypot(n.x - w.portal.x, n.y - w.portal.y) < 90) n.y += 110;   // 太靠近營火的人往下挪
  return w;
};
// 營火是夢之門：火焰上方繞著紫色的夢之光點
const _decoGate = drawTownDeco;
drawTownDeco = function (g, w) {
  _decoGate(g, w);
  if (!w.fireGate || !w.fire) return;
  const fx = w.fire[0] * TS, fy = w.fire[1] * TS, t = G.time;
  g.save(); g.globalCompositeOperation = 'lighter';
  const gl = g.createRadialGradient(fx, fy - 6, 0, fx, fy - 6, 70); gl.addColorStop(0, 'rgba(170,120,255,0.22)'); gl.addColorStop(1, 'rgba(120,80,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(fx, fy - 6, 70, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 7; i++) { const a = t * 1.3 + i * Math.PI * 2 / 7, r = 26 + Math.sin(t * 2 + i) * 4; g.fillStyle = i % 2 ? 'rgba(200,170,255,0.9)' : 'rgba(255,220,150,0.8)'; g.beginPath(); g.arc(fx + Math.cos(a) * r, fy - 8 + Math.sin(a) * r * 0.45 - 10, 2.2, 0, Math.PI * 2); g.fill(); }
  g.restore();
};
