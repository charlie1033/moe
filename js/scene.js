// =============================================================
//  場景美術：地板材質、牆面、地上的小細節、環境粒子
// =============================================================
// 每個場景的風格：floor＝地板樣式、decor＝地上會散落的東西、amb＝飄在空中的粒子
const THEME_FX = {
  bone:   { floor: 'slab',  decor: ['bone', 'skull', 'crack', 'pebble', 'bone'], amb: { c: ['#d8d0e0'], n: 24, vx: 5, vy: -3, s: [1, 2], a: 0.3 } },
  fire:   { floor: 'slab',  decor: ['lava', 'crack', 'pebble', 'ember', 'lava'], amb: { c: ['#ff9a40', '#ffd060', '#ff5a20'], n: 42, vx: 0, vy: -28, s: [1.5, 3], a: 0.9, glow: true } },
  ice:    { floor: 'ice',   decor: ['ice', 'snow', 'crystal', 'pebble', 'snow'], amb: { c: ['#ffffff', '#d8f0ff'], n: 60, vx: -12, vy: 24, s: [1, 2.6], a: 0.85 } },
  cave:   { floor: 'rough', decor: ['rock', 'crystal', 'web', 'pebble', 'rock'], amb: { c: ['#90e0ff', '#c0a0ff'], n: 18, vx: 0, vy: -6, s: [1, 2], a: 0.7, glow: true } },
  grass:  { floor: 'grass', decor: ['grass', 'flower', 'grass', 'pebble', 'flower'], amb: { c: ['#f0f080', '#c8ff80'], n: 22, vx: 8, vy: -2, s: [1.5, 2.5], a: 0.75, glow: true } },
  beach:  { floor: 'sand',  decor: ['shell', 'ripple', 'pebble', 'weed', 'ripple'], amb: { c: ['#ffffff', '#d0f0ff'], n: 30, vx: 20, vy: -3, s: [1, 2], a: 0.35 } },
  swamp:  { floor: 'grass', decor: ['puddle', 'reed', 'mushroom', 'bubble', 'puddle'], amb: { c: ['#a0e060', '#70c040'], n: 28, vx: 0, vy: -10, s: [1.5, 3], a: 0.65, glow: true } },
  forest: { floor: 'grass', decor: ['leaf', 'root', 'mushroom', 'grass', 'leaf'], amb: { c: ['#d8a040', '#a87030', '#d0c060'], n: 24, vx: 12, vy: 14, s: [2, 3], a: 0.8, leaf: true } },
  desert: { floor: 'sand',  decor: ['ripple', 'crack', 'bone', 'pebble', 'ripple'], amb: { c: ['#e8c890', '#d8b070'], n: 46, vx: 46, vy: 4, s: [1, 2], a: 0.45 } },
  void:   { floor: 'slab',  decor: ['rune', 'star', 'crack', 'crystal', 'star'], amb: { c: ['#c8a0ff', '#8060ff', '#ffffff'], n: 38, vx: 0, vy: -9, s: [1, 2.5], a: 0.85, glow: true } },
  town:   { floor: 'slab',  decor: ['straw', 'pebble', 'crack', 'straw', 'pebble'], amb: { c: ['#ffe0a0'], n: 16, vx: 3, vy: -5, s: [1, 2], a: 0.4, glow: true } },
};
const themeKey = th => th.id.startsWith('town') ? 'town' : (THEME_FX[th.id] ? th.id : 'void');
const themeFX = th => THEME_FX[themeKey(th)];
function seeded(seed) { let s = (seed >>> 0) || 1; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); }

// ---------- 地板（6 種變化，依場景換樣式）----------
const FLOOR_CACHE = {};
getFloorTile = function (theme, variant) {
  const key = theme.id + '_' + variant;
  if (FLOOR_CACHE[key]) return FLOOR_CACHE[key];
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), R = seeded(variant * 7919 + theme.id.length * 31 + 1);
  const base = theme.floor[variant % theme.floor.length], style = themeFX(theme).floor;
  g.fillStyle = base; g.fillRect(0, 0, 32, 32);
  // 細小的雜點：有亮有暗，看起來不會那麼平
  for (let i = 0; i < 70; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.10)'; g.fillRect(Math.floor(R() * 32), Math.floor(R() * 32), 1 + Math.floor(R() * 2), 1); }
  if (style === 'slab') { // 石板：接縫＋邊緣的亮暗
    const off = variant % 2 ? 16 : 0;
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 15, 32, 2); g.fillRect(off, 0, 2, 15); g.fillRect((off + 16) % 32, 17, 2, 15);
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, 17, 32, 1); g.fillRect(off + 2, 0, 1, 15);
    if (variant >= 4) { g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(4 + R() * 8, 2); g.lineTo(10 + R() * 8, 9); g.lineTo(8 + R() * 8, 14); g.stroke(); }
  } else if (style === 'rough') { // 粗糙的岩地：大塊的明暗斑
    for (let i = 0; i < 4; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(R() * 32, R() * 32, 4 + R() * 7, 3 + R() * 5, R() * 3, 0, Math.PI * 2); g.fill(); }
  } else if (style === 'grass') { // 草地：短草線
    for (let i = 0; i < 18; i++) { const x = R() * 32, y = R() * 32; g.strokeStyle = R() < 0.5 ? 'rgba(160,220,120,0.16)' : 'rgba(0,0,0,0.16)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3, y - 3 - R() * 3); g.stroke(); }
  } else if (style === 'sand') { // 沙地：風吹的紋路
    g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const y = 6 + i * 10 + R() * 4; g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(16, y - 3 + R() * 2, 32, y); g.stroke(); }
  } else if (style === 'ice') { // 冰面：反光的斜線
    g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const x = R() * 32; g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 10, 32); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, 0, 32, 32 * R() * 0.5);
  }
  FLOOR_CACHE[key] = c; return c;
};

// ---------- 地上的小細節 ----------
function drawDecal(g, kind, x, y, R, th) {
  const fl = th.floor[0];
  const dots = (pts, r) => pts.forEach(([a, b]) => { g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); });
  g.save(); g.translate(x, y);
  switch (kind) {
    case 'bone': g.rotate(R() * 3); g.strokeStyle = 'rgba(220,210,190,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-5, 0); g.lineTo(5, 0); g.stroke();
      g.fillStyle = 'rgba(220,210,190,0.7)'; dots([[-5, -1.5], [-5, 1.5], [5, -1.5], [5, 1.5]], 1.6); break;
    case 'skull': g.fillStyle = 'rgba(225,215,195,0.75)'; g.beginPath(); g.arc(0, 0, 3.5, 0, 7); g.fill(); g.fillRect(-2, 2, 4, 2.5);
      g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(-2, -1, 1.5, 1.5); g.fillRect(0.5, -1, 1.5, 1.5); break;
    case 'crack': g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-6, -4); g.lineTo(-1, 0); g.lineTo(-3, 5); g.moveTo(-1, 0); g.lineTo(6, 2); g.stroke(); break;
    case 'pebble': for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? artShade(fl, 0.18) : artShade(fl, -0.3); g.beginPath(); g.ellipse((R() - 0.5) * 10, (R() - 0.5) * 8, 1.5 + R() * 1.5, 1 + R(), 0, 0, 7); g.fill(); } break;
    case 'lava': g.shadowColor = '#ff6a20'; g.shadowBlur = 6; g.strokeStyle = '#ff6a20'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -3); g.lineTo(-2, 1); g.lineTo(3, -2); g.lineTo(8, 3); g.stroke();
      g.shadowBlur = 0; g.strokeStyle = '#ffd860'; g.lineWidth = 0.8; g.stroke(); break;
    case 'ember': g.shadowColor = '#ff8a30'; g.shadowBlur = 5; g.fillStyle = '#ffb050'; g.fillRect(-1, -1, 2, 2); g.fillRect(3, 2, 1.5, 1.5); break;
    case 'ice': g.fillStyle = 'rgba(200,235,255,0.22)'; g.beginPath(); g.moveTo(-8, -2); g.lineTo(-2, -6); g.lineTo(8, -3); g.lineTo(6, 5); g.lineTo(-5, 4); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.stroke(); break;
    case 'snow': g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(0, 0, 7 + R() * 4, 3, 0, 0, 7); g.fill(); break;
    case 'crystal': {
      const col = th.id === 'void' ? '#c090ff' : th.id === 'ice' ? '#a0e8ff' : '#80d0ff';
      g.shadowColor = col; g.shadowBlur = 6;
      [[-3, 0, 7], [2, 1, 5], [5, -1, 4]].forEach(([dx, dy, h]) => { g.fillStyle = col; g.beginPath(); g.moveTo(dx - 2, dy + 2); g.lineTo(dx, dy - h); g.lineTo(dx + 2, dy + 2); g.closePath(); g.fill(); });
      g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-3.5, -4, 1, 3); break;
    }
    case 'rock': g.fillStyle = artShade(fl, -0.25); g.beginPath(); g.ellipse(0, 0, 5, 3.5, 0, 0, 7); g.fill(); g.fillStyle = artShade(fl, 0.2); g.beginPath(); g.ellipse(-1.5, -1.5, 2.5, 1.5, 0, 0, 7); g.fill(); break;
    case 'web': g.strokeStyle = 'rgba(230,230,230,0.22)'; g.lineWidth = 0.7; g.beginPath();
      for (let a = 0; a < 6; a++) { g.moveTo(0, 0); g.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); } g.stroke();
      g.beginPath(); g.arc(0, 0, 4, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 7, 0, 7); g.stroke(); break;
    case 'grass': for (let i = 0; i < 6; i++) { g.strokeStyle = R() < 0.5 ? '#6aa040' : '#4a8030'; g.lineWidth = 1.2; const bx = (R() - 0.5) * 8; g.beginPath(); g.moveTo(bx, 3); g.quadraticCurveTo(bx + (R() - 0.5) * 4, -2, bx + (R() - 0.5) * 5, -5 - R() * 3); g.stroke(); } break;
    case 'flower': {
      const col = ['#f0a0c0', '#f0e070', '#ffffff', '#c0a0ff'][Math.floor(R() * 4)];
      g.fillStyle = '#4a8030'; g.fillRect(-0.5, 0, 1, 4); g.fillStyle = col; dots([[-1.5, -1], [1.5, -1], [0, -2.5], [0, 0.5]], 1.3);
      g.fillStyle = '#ffe080'; g.fillRect(-0.5, -1.5, 1, 1); break;
    }
    case 'shell': g.fillStyle = 'rgba(240,220,200,0.8)'; g.beginPath(); g.moveTo(0, 3); g.arc(0, 3, 4, Math.PI * 1.15, Math.PI * 1.85); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(160,120,100,0.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(0, 3); g.lineTo(-2, -0.5); g.moveTo(0, 3); g.lineTo(0, -1); g.moveTo(0, 3); g.lineTo(2, -0.5); g.stroke(); break;
    case 'ripple': g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-9, 0); g.quadraticCurveTo(0, -3, 9, 0); g.moveTo(-6, 4); g.quadraticCurveTo(0, 1, 6, 4); g.stroke(); break;
    case 'weed': g.strokeStyle = '#3a7a4a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 4); g.bezierCurveTo(-3, 0, 3, -2, -1, -6); g.stroke(); break;
    case 'puddle': g.fillStyle = 'rgba(30,50,30,0.55)'; g.beginPath(); g.ellipse(0, 0, 9, 4.5, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(160,220,120,0.25)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(-4, -1.5, 3, 1); break;
    case 'reed': for (let i = 0; i < 3; i++) { const bx = (i - 1) * 3; g.strokeStyle = '#5a7a3a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(bx, 4); g.lineTo(bx + (i - 1), -7); g.stroke(); g.fillStyle = '#6a4a2a'; g.fillRect(bx + (i - 1) - 1, -9, 2, 4); } break;
    case 'mushroom': {
      const col = th.id === 'swamp' ? '#a0c060' : '#c84a3a';
      g.fillStyle = '#e8e0d0'; g.fillRect(-1, -1, 2, 4);
      g.fillStyle = col; g.beginPath(); g.ellipse(0, -1, 3.5, 2.5, 0, Math.PI, 0); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-1.5, -2.5, 1, 1); break;
    }
    case 'bubble': g.strokeStyle = 'rgba(180,230,140,0.45)'; g.lineWidth = 0.8; [[0, 0, 2.5], [4, -2, 1.5], [-3, 2, 1.2]].forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, 7); g.stroke(); }); break;
    case 'leaf': g.rotate(R() * 6); g.fillStyle = ['#b8742a', '#c8902a', '#8a5a2a'][Math.floor(R() * 3)]; g.beginPath(); g.ellipse(0, 0, 4, 1.8, 0, 0, 7); g.fill(); break;
    case 'root': g.strokeStyle = 'rgba(70,45,25,0.8)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-10, 2); g.bezierCurveTo(-4, -4, 2, 5, 10, -1); g.stroke(); break;
    case 'rune': g.shadowColor = '#b080ff'; g.shadowBlur = 6; g.strokeStyle = 'rgba(190,150,255,0.55)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 7, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(0, -5); g.lineTo(4, 3); g.lineTo(-4, 3); g.closePath(); g.stroke(); g.shadowBlur = 0; break;
    case 'star': g.fillStyle = 'rgba(230,210,255,0.7)'; g.fillRect(-0.5, -2.5, 1, 5); g.fillRect(-2.5, -0.5, 5, 1); break;
    case 'straw': g.strokeStyle = 'rgba(220,190,110,0.55)'; g.lineWidth = 1; g.beginPath();
      for (let i = 0; i < 4; i++) { const a = R() * 3; g.moveTo(Math.cos(a) * -5, Math.sin(a) * -3); g.lineTo(Math.cos(a) * 5, Math.sin(a) * 3); } g.stroke(); break;
  }
  g.restore();
}

// 地圖烤好之後再加一層：牆邊陰影、牆面細節、地上小東西
function paintWorldDetail(g, w) {
  const th = w.theme, fx = themeFX(th), W = w.W, H = w.H, k = themeKey(th);
  const solid = (x, y) => x < 0 || y < 0 || x >= W || y >= H || w.grid[y * W + x] === 0;
  const ao = (x0, y0, x1, y1, rx, ry, rw, rh) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,0.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x * TS, py = y * TS;
    if (!solid(x, y)) {
      // 牆邊的陰影（環境遮蔽），讓地板跟牆分開
      if (solid(x - 1, y)) ao(px, 0, px + 9, 0, px, py, 9, TS);
      if (solid(x + 1, y)) ao(px + TS, 0, px + TS - 9, 0, px + TS - 9, py, 9, TS);
      if (solid(x, y - 1)) ao(0, py, 0, py + 12, px, py, TS, 12);
      if (solid(x, y + 1)) ao(0, py + TS, 0, py + TS - 5, px, py + TS - 5, TS, 5);
      // 地上的小東西（同一張地圖每次都長一樣）
      const h = hash2(x * 3 + 11, y * 5 + 7);
      if (h % 100 < (w.kind === 'town' ? 6 : 13)) {
        const R = seeded(h);
        drawDecal(g, fx.decor[h % fx.decor.length], px + 6 + R() * 20, py + 8 + R() * 18, R, th);
      }
    } else if (!solid(x, y + 1)) {
      // 牆的正面：上亮下暗＋磚縫＋頂端的亮邊
      const top = py + 10, hh = 22, R = seeded(hash2(x, y));
      if (typeof PIX !== 'undefined' && pixStone(th)) {
        // v1.8：素材包的石牆（依場景換色）
        g.drawImage(pixWallFace(th, x), px, py);
      } else {
        const gr = g.createLinearGradient(0, top, 0, top + hh); gr.addColorStop(0, artShade(th.wallTop, 0.12)); gr.addColorStop(1, artShade(th.wallTop, -0.42));
        g.fillStyle = gr; g.fillRect(px, top, TS, hh);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(px, top + 10, TS, 1.5);
        const o = (x % 2) ? 10 : 22; g.fillRect(px + o, top, 1.5, 10); g.fillRect(px + ((o + 16) % 32), top + 11, 1.5, 11);
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(px, top + 11.5, TS, 1);
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(px, top, TS, 2);
      }
      if (k === 'ice') { // 冰柱
        g.fillStyle = 'rgba(220,245,255,0.85)';
        for (let i = 0; i < 3; i++) { const ix = px + 3 + R() * 26, ih = 3 + R() * 6; g.beginPath(); g.moveTo(ix - 1.5, top + hh); g.lineTo(ix, top + hh + ih); g.lineTo(ix + 1.5, top + hh); g.fill(); }
      }
      if (k === 'fire' && R() < 0.4) { // 發光的岩漿裂縫
        g.shadowColor = '#ff6a20'; g.shadowBlur = 5; g.strokeStyle = '#ff7a30'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(px + 6 + R() * 10, top + 2); g.lineTo(px + 10 + R() * 10, top + 12); g.lineTo(px + 8 + R() * 12, top + 21); g.stroke(); g.shadowBlur = 0;
      }
      if ((k === 'grass' || k === 'forest' || k === 'swamp') && R() < 0.6) { // 藤蔓
        g.strokeStyle = k === 'swamp' ? '#5a7a3a' : '#3a7a3a'; g.lineWidth = 1.6; const vx = px + 4 + R() * 24;
        g.beginPath(); g.moveTo(vx, top); g.bezierCurveTo(vx - 4, top + 6, vx + 4, top + 12, vx - 1, top + 18 + R() * 4); g.stroke();
        g.fillStyle = '#4a9a4a'; g.fillRect(vx - 3, top + 8, 3, 2);
      }
      if (k === 'void' && R() < 0.3) { g.shadowColor = '#b080ff'; g.shadowBlur = 6; g.fillStyle = 'rgba(200,160,255,0.7)'; g.fillRect(px + 12, top + 5, 2, 2); g.fillRect(px + 18, top + 14, 2, 2); g.shadowBlur = 0; }
    } else {
      // 牆頂（從上面看下去）：一點紋理＋靠近地板那邊的亮邊
      if (typeof PIX !== 'undefined' && pixStone(th) && solid(x, y + 1) && !solid(x, y + 2)) g.drawImage(pixWallTop(th), px, py); // 牆正面上方那一格：素材包的牆頂
      const R = seeded(hash2(x + 999, y));
      for (let i = 0; i < 3; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.18)'; g.fillRect(px + R() * 28, py + R() * 28, 3 + R() * 4, 2); }
      g.fillStyle = 'rgba(255,255,255,0.07)';
      if (!solid(x - 1, y)) g.fillRect(px, py, 2, TS);
      if (!solid(x + 1, y)) g.fillRect(px + TS - 2, py, 2, TS);
      if (!solid(x, y - 1)) g.fillRect(px, py, TS, 2);
    }
  }
}

// ---------- 環境粒子：灰塵、餘燼、雪、花粉、落葉、沙塵、虛空光點 ----------
function drawAmbient(g, w, cx, cy, lightR) {
  const fx = themeFX(w.theme); if (!fx) return;
  const A = fx.amb, dt = 1 / 60, pl = G.pl;
  if (G.ambW !== w) { G.amb = []; G.ambW = w; }
  const spawn = init => ({
    x: cx + Math.random() * (VW + 80) - 40,
    y: init ? cy + Math.random() * VH : (A.vy > 10 ? cy - 10 : A.vy < -10 ? cy + VH + 10 : cy + Math.random() * VH),
    s: A.s[0] + Math.random() * (A.s[1] - A.s[0]), c: A.c[Math.floor(Math.random() * A.c.length)], t: 0, life: 4 + Math.random() * 6, ph: Math.random() * 7, rot: Math.random() * 6 });
  while (G.amb.length < A.n) G.amb.push(spawn(true));
  for (let i = 0; i < G.amb.length; i++) {
    const p = G.amb[i];
    p.t += dt; p.x += (A.vx + Math.sin(p.t * 1.3 + p.ph) * 8) * dt; p.y += (A.vy + Math.cos(p.t * 1.1 + p.ph) * 4) * dt; p.rot += dt * 2;
    if (p.t > p.life || p.x < cx - 60 || p.x > cx + VW + 60 || p.y < cy - 60 || p.y > cy + VH + 60) { G.amb[i] = spawn(false); continue; }
    const fade = Math.max(0, Math.min(1, p.t, p.life - p.t));
    const d = Math.hypot(p.x - pl.x, p.y - pl.y), lit = A.glow ? 1 : Math.max(0.15, Math.min(1, 1.25 - d / lightR));
    const sx = p.x - cx, sy = p.y - cy;
    g.globalAlpha = A.a * fade * lit;
    if (A.glow) {
      g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(sx, sy, 0, sx, sy, p.s * 3); gr.addColorStop(0, p.c); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(sx - p.s * 3, sy - p.s * 3, p.s * 6, p.s * 6);
      g.globalCompositeOperation = 'source-over';
    } else if (A.leaf) { g.save(); g.translate(sx, sy); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-p.s, -p.s * 0.4, p.s * 2, p.s * 0.8); g.restore(); }
    else { g.fillStyle = p.c; g.fillRect(sx - p.s / 2, sy - p.s / 2, p.s, p.s); }
  }
  g.globalAlpha = 1;
}
