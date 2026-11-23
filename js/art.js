// =============================================================
//  美術：技能寶石、輔助寶石、裝備、通貨、藥劑的圖示（全部用程式畫，不用下載圖檔）
//  每個圖示都畫在 100×100 的座標裡，再縮放成需要的大小；會快取起來，只畫一次
// =============================================================
const ART_CACHE = {};
const ART_DARK = 'rgba(14,8,4,0.92)';
const ART_LIGHT = '#fff3d6';

// ---------- 小工具：產生 SVG 路徑字串 ----------
const A_ = {
  circ: (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`,
  poly: pts => 'M' + pts.map(p => p.join(' ')).join(' L') + ' Z',
  line: (...p) => { let s = `M${p[0]} ${p[1]}`; for (let i = 2; i < p.length; i += 2) s += ` L${p[i]} ${p[i + 1]}`; return s; },
  star: (cx, cy, n, r1, r2, rot = -90) => {
    const pts = [];
    for (let i = 0; i < n * 2; i++) { const a = (rot + i * 180 / n) * Math.PI / 180, r = i % 2 ? r2 : r1; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return A_.poly(pts.map(p => p.map(v => Math.round(v * 10) / 10)));
  },
  // 箭頭（三角形），尖端在 (x, y)，指向 ang 度
  head: (x, y, ang, s = 10) => {
    const a = ang * Math.PI / 180, b = s * 0.62;
    const bx = x - Math.cos(a) * s * 1.3, by = y - Math.sin(a) * s * 1.3;
    return A_.poly([[x, y], [bx + Math.cos(a + Math.PI / 2) * b, by + Math.sin(a + Math.PI / 2) * b], [bx - Math.cos(a + Math.PI / 2) * b, by - Math.sin(a + Math.PI / 2) * b]]);
  },
  rrect: (x, y, w, h, r) => `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`,
  drop: (cx, cy, r) => `M${cx} ${cy - r * 1.7} Q${cx + r * 1.15} ${cy - r * 0.3} ${cx + r} ${cy + r * 0.2} A${r} ${r} 0 1 1 ${cx - r} ${cy + r * 0.2} Q${cx - r * 1.15} ${cy - r * 0.3} ${cx} ${cy - r * 1.7} Z`,
  cloud: dy => `M22 ${48 + dy} C10 ${48 + dy} 10 ${30 + dy} 24 ${30 + dy} C24 ${16 + dy} 44 ${12 + dy} 52 ${24 + dy} C60 ${14 + dy} 80 ${18 + dy} 78 ${32 + dy} C92 ${32 + dy} 92 ${48 + dy} 78 ${48 + dy} Z`,
};
function artShade(hex, k) { // k>0 變亮，k<0 變暗
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = k > 0 ? 255 : 0, a = Math.abs(k);
  r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
  return `rgb(${r},${g},${b})`;
}

// ---------- 畫「符號」：先畫深色描邊，再畫顏色＋發光 ----------
// part：{ d: 路徑, c: 顏色（L=淺色、A=重點色、D=深色、或色碼）, s: 線寬（有就是線條，沒有就是填色）, rot, cx, cy, tx, ty, sc }
function drawGlyph(g, parts, accent, glow = true) {
  const col = c => c === 'L' ? ART_LIGHT : c === 'A' ? accent : c === 'D' ? '#1a0e06' : c === 'W' ? '#ffffff' : c;
  const withT = (p, fn) => {
    g.save();
    if (p.tx || p.ty) g.translate(p.tx || 0, p.ty || 0);
    if (p.rot) { g.translate(p.cx || 50, p.cy || 50); g.rotate(p.rot * Math.PI / 180); g.translate(-(p.cx || 50), -(p.cy || 50)); }
    if (p.sc) g.scale(p.sc, p.sc);
    fn(new Path2D(p.d)); g.restore();
  };
  g.lineCap = 'round'; g.lineJoin = 'round';
  // 第一層：深色描邊，讓符號在任何底色上都看得清楚
  for (const p of parts) {
    if (p.c === 'D' || p.c === 'W' || p.noOutline) continue;
    withT(p, path => { g.strokeStyle = ART_DARK; g.lineWidth = (p.s || 0) + 7; g.stroke(path); });
  }
  // 第二層：顏色（重點色會發光）
  for (const p of parts) {
    withT(p, path => {
      const c = col(p.c || 'L');
      if (glow && (p.c === 'A' || p.glow)) { g.shadowColor = accent; g.shadowBlur = 9; } else g.shadowBlur = 0;
      if (p.s) { g.strokeStyle = c; g.lineWidth = p.s; g.stroke(path); }
      else { g.fillStyle = c; g.fill(path); }
      g.shadowBlur = 0;
    });
  }
}

// =============================================================
//  技能符號（25 個）
// =============================================================
const SKILL_GLYPHS = {
  heavy: () => [ // 重擊：狼牙錘＋衝擊線
    { d: A_.line(24, 82, 54, 52), s: 9 }, { d: A_.circ(22, 84, 6) },
    { d: A_.star(62, 38, 8, 25, 15) }, { d: A_.circ(62, 38, 8), c: 'A' },
    { d: 'M10 58 L24 60 M14 72 L28 68 M28 92 L34 78', s: 4, c: 'A' }],
  slam: () => [ // 震地：地面炸開＋碎石飛起＋裂痕
    { d: 'M50 64 L36 20 L48 38 L50 6 L54 38 L66 18 L58 46 L84 30 L64 56 Z', c: 'A' },
    { d: 'M50 64 L16 40 M50 64 L88 48', s: 4, c: 'A' },
    { d: A_.poly([[20, 22], [28, 18], [30, 28], [22, 30]]) }, { d: A_.poly([[76, 12], [86, 14], [82, 24]]) }, { d: A_.poly([[8, 54], [16, 50], [16, 60]]) },
    { d: A_.line(4, 66, 96, 66), s: 7 },
    { d: 'M50 70 L42 82 L50 88 L44 98 M50 70 L62 80 L58 92 M24 70 L18 80 M76 70 L84 80', s: 4, c: 'A' }],
  iai: () => [ // 居合斬：新月斬擊＋太刀
    { d: 'M10 66 Q26 12 92 20 Q38 28 10 66 Z', c: 'A' },
    { d: 'M26 82 Q50 52 84 18', s: 5 }, { d: 'M24 70 L38 84', s: 6, c: 'A' }, { d: A_.line(30, 78, 14, 94), s: 8 },
    { d: 'M22 84 L26 88 M18 88 L22 92', s: 2, c: 'D' }],
  venom: () => [ // 毒刃：匕首滴毒
    { d: A_.poly([[50, 6], [61, 44], [50, 54], [39, 44]]) }, { d: A_.line(50, 10, 50, 48), s: 2, c: 'D' },
    { d: A_.line(32, 56, 68, 56), s: 7, c: 'A' }, { d: A_.line(50, 60, 50, 78), s: 8 }, { d: A_.circ(50, 84, 5), c: 'A' },
    { d: A_.drop(78, 62, 8), c: 'A' }, { d: A_.drop(22, 74, 6), c: 'A' }],
  knives: () => { // 飛刀：三把扇形
    const k = rot => [{ d: A_.poly([[50, 8], [57, 40], [50, 48], [43, 40]]), rot, cx: 50, cy: 88 }, { d: A_.line(50, 50, 50, 66), s: 7, c: 'A', rot, cx: 50, cy: 88 }];
    return [...k(-34), ...k(34), ...k(0)];
  },
  split: () => [ // 分裂箭：一支分成三支
    { d: 'M10 90 L8 78 M10 90 L22 92', s: 3.5, c: 'A' }, { d: A_.line(10, 90, 42, 58), s: 5 },
    { d: A_.line(42, 58, 74, 26), s: 4 }, { d: A_.head(82, 18, -45, 9), c: 'A' },
    { d: A_.line(42, 58, 82, 54), s: 4 }, { d: A_.head(92, 53, -5, 9), c: 'A' },
    { d: A_.line(42, 58, 48, 20), s: 4 }, { d: A_.head(50, 9, -80, 9), c: 'A' }],
  rapid: () => [ // 穿刺射擊：箭穿過靶心
    { d: A_.circ(58, 42, 26), s: 5, c: 'A' }, { d: A_.circ(58, 42, 11), s: 4, c: 'A' },
    { d: A_.line(8, 92, 78, 22), s: 5 }, { d: A_.head(88, 12, -45, 11) },
    { d: 'M8 92 L4 80 M8 92 L20 96', s: 3.5, c: 'A' }],
  fireball: () => [ // 火球術
    { d: 'M18 26 L34 40 M8 46 L24 52 M30 12 L40 30', s: 4, c: 'A' },
    { d: 'M68 12 C46 22 26 40 28 62 C30 84 54 94 70 80 C86 66 82 48 68 48 C76 38 76 24 68 12 Z', c: 'A' },
    { d: 'M58 52 C46 58 44 74 56 78 C68 82 72 66 62 60 C64 56 62 54 58 52 Z', c: 'L' }],
  nova: () => { // 冰霜新星：雪花
    let spokes = '', ticks = '';
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
      spokes += `M${50 + c * 8} ${50 + s * 8} L${50 + c * 40} ${50 + s * 40} `;
      for (const sg of [-1, 1]) { const b = a + sg * 0.75; ticks += `M${50 + c * 24} ${50 + s * 24} L${50 + c * 24 + Math.cos(b) * 12} ${50 + s * 24 + Math.sin(b) * 12} `; }
    }
    return [{ d: spokes, s: 5 }, { d: ticks, s: 4 }, { d: A_.star(50, 50, 6, 11, 5, -90), c: 'A' }];
  },
  thorn: () => { // 荊棘綻放
    const out = [];
    for (let k = 0; k < 5; k++) out.push({ d: A_.poly([[50, 4], [45, 20], [55, 20]]), rot: k * 72 + 36 });
    for (let k = 0; k < 5; k++) out.push({ d: 'M50 50 C38 36 40 18 50 12 C60 18 62 36 50 50 Z', c: 'A', rot: k * 72 });
    out.push({ d: A_.circ(50, 50, 9) });
    return out;
  },
  skel: () => [ // 召喚骷髏
    { d: 'M50 10 C28 10 18 26 20 44 C21 54 28 58 30 62 L30 74 C30 78 34 80 38 80 L62 80 C66 80 70 78 70 74 L70 62 C72 58 79 54 80 44 C82 26 72 10 50 10 Z' },
    { d: A_.circ(38, 44, 9), c: 'D' }, { d: A_.circ(62, 44, 9), c: 'D' },
    { d: A_.circ(38, 45, 3.5), c: 'A', glow: true, noOutline: true }, { d: A_.circ(62, 45, 3.5), c: 'A', glow: true, noOutline: true },
    { d: A_.poly([[50, 52], [45, 62], [55, 62]]), c: 'D' }, { d: 'M41 68 V80 M50 68 V80 M59 68 V80', s: 3, c: 'D' }],
  spirit: () => [ // 召喚靈體：幽魂
    { d: 'M10 28 Q4 44 12 58 M90 28 Q96 44 88 58', s: 3.5, c: 'A' },
    { d: 'M50 8 C30 8 22 26 24 46 L22 88 L32 80 L40 90 L50 80 L60 90 L68 80 L78 88 L76 46 C78 26 70 8 50 8 Z', c: 'A' },
    { d: A_.circ(40, 40, 6), c: 'D' }, { d: A_.circ(60, 40, 6), c: 'D' }, { d: A_.circ(50, 58, 5), c: 'D' }],
  wolf: () => [ // 召喚靈狼：狼頭
    { d: 'M18 12 L38 30 L62 30 L82 12 L80 46 L68 66 L57 86 L43 86 L32 66 L20 46 Z' },
    { d: A_.poly([[25, 22], [35, 32], [29, 40]]), c: 'D' }, { d: A_.poly([[75, 22], [65, 32], [71, 40]]), c: 'D' },
    { d: A_.poly([[32, 47], [45, 52], [33, 56]]), c: 'A' }, { d: A_.poly([[68, 47], [55, 52], [67, 56]]), c: 'A' },
    { d: A_.circ(50, 78, 5), c: 'D' }, { d: 'M50 62 V72', s: 2.5, c: 'D' }],
  blink: () => [ // 閃現：殘影＋閃光
    { d: A_.circ(14, 86, 6), c: 'L' }, { d: A_.circ(28, 72, 5), c: 'L' }, { d: A_.circ(40, 60, 4), c: 'L' },
    { d: 'M8 66 L22 54 M24 94 L38 82', s: 3, c: 'A' },
    { d: A_.star(64, 36, 4, 30, 7, 0), c: 'A' }, { d: A_.star(64, 36, 4, 16, 4, 45), c: 'L', noOutline: true }],
  arc: () => [ // 電弧：在三個目標間跳躍
    { d: 'M16 72 L28 48 L37 58 L50 30', s: 5, c: 'A' }, { d: 'M50 30 L60 56 L69 45 L84 68', s: 5, c: 'A' },
    { d: A_.circ(16, 72, 8) }, { d: A_.circ(50, 30, 8) }, { d: A_.circ(84, 68, 8) }],
  whirl: () => [ // 旋風斬
    { d: 'M50 14 A36 36 0 0 1 86 50', s: 7 }, { d: A_.head(84, 64, 95, 10) },
    { d: 'M50 86 A36 36 0 0 1 14 50', s: 7 }, { d: A_.head(16, 36, -85, 10) },
    { d: 'M50 30 A20 20 0 0 1 70 50 M50 70 A20 20 0 0 1 30 50', s: 3.5, c: 'A' }, { d: A_.circ(50, 50, 9), c: 'A' }],
  icespear: () => [ // 冰霜之矛
    { d: A_.poly([[24, 60], [36, 54], [30, 66]]), c: 'L' }, { d: A_.poly([[40, 88], [50, 78], [48, 92]]), c: 'L' },
    { d: A_.poly([[10, 92], [60, 36], [92, 8], [66, 42]]), c: 'A' }, { d: A_.line(18, 86, 84, 16), s: 2, c: 'W' }],
  explarrow: () => [ // 爆裂箭
    { d: 'M10 92 L6 80 M10 92 L22 96', s: 3.5, c: 'A' }, { d: A_.line(10, 92, 52, 50), s: 5 },
    { d: A_.star(64, 36, 9, 32, 14), c: 'A' }, { d: A_.circ(64, 36, 10) }],
  warcry: () => [ // 戰吼：號角＋聲波
    { d: 'M14 42 L32 42 L62 18 L62 82 L32 58 L14 58 Z' }, { d: A_.line(32, 44, 32, 56), s: 2.5, c: 'D' },
    { d: 'M72 34 Q82 50 72 66', s: 5, c: 'A' }, { d: 'M82 22 Q98 50 82 78', s: 5, c: 'A' }],
  rain: () => [ // 毒雨箭
    ...[[34, 6], [60, 12], [86, 6]].flatMap(([x, y]) => [{ d: A_.line(x, y, x - 9, y + 34), s: 4 }, { d: A_.head(x - 12, y + 46, 105, 8), c: 'A' }]),
    { d: 'M6 84 Q26 74 44 84 M52 88 Q72 78 94 88', s: 4, c: 'A' }, { d: A_.drop(18, 70, 4), c: 'A' }, { d: A_.drop(70, 72, 4), c: 'A' }],
  meteor: () => [ // 隕石術
    { d: A_.poly([[4, 16], [16, 4], [70, 50], [50, 70]]), c: 'A' }, { d: 'M14 30 L44 58 M30 12 L58 42', s: 3, c: 'L', noOutline: true },
    { d: A_.circ(64, 64, 21) }, { d: 'M56 56 L64 64 L60 75 M64 64 L75 60 M52 70 L46 74', s: 3, c: 'D' }],
  golem: () => [ // 召喚石魔像
    { d: 'M28 16 H72 V34 H80 V58 H72 V84 H28 V58 H20 V34 H28 Z' },
    { d: 'M36 40 H46 V48 H36 Z M54 40 H64 V48 H54 Z', c: 'A' }, { d: 'M38 66 H62', s: 4, c: 'D' },
    { d: 'M30 22 L38 30 M66 72 L72 80 M24 44 L28 50', s: 2.5, c: 'D' }],
  blizzard: () => [ // 暴風雪
    { d: 'M28 58 L22 76 M46 58 L40 82 M64 58 L58 76 M82 58 L78 70', s: 5, c: 'A' },
    { d: A_.cloud(0) }, { d: A_.star(30, 90, 6, 5, 2), c: 'L', noOutline: true }, { d: A_.star(70, 90, 6, 5, 2), c: 'L', noOutline: true }],
  storm: () => [ // 天雷審判
    { d: A_.cloud(-8) }, { d: A_.poly([[54, 38], [36, 66], [49, 66], [40, 96], [70, 56], [56, 56], [65, 38]]), c: 'A' }],
  fissure: () => [ // 裂地斬：劍插地面
    { d: 'M50 70 L40 82 L46 88 L38 98 M50 70 L62 80 L58 90 M28 70 L20 78 M72 70 L82 78', s: 4, c: 'A' },
    { d: A_.line(6, 68, 94, 68), s: 6 },
    { d: A_.poly([[44, 22], [56, 22], [56, 58], [50, 66], [44, 58]]) }, { d: A_.line(50, 24, 50, 58), s: 2, c: 'D' },
    { d: A_.line(34, 18, 66, 18), s: 7, c: 'A' }, { d: A_.line(50, 3, 50, 14), s: 7 },
    { d: A_.circ(20, 56, 3) }, { d: A_.circ(82, 54, 3) }],
};

// =============================================================
//  輔助寶石符號（22 個）
// =============================================================
const SUPPORT_GLYPHS = {
  gmp: () => [{ d: A_.line(50, 88, 50, 26), s: 5 }, { d: A_.head(50, 12, -90, 10), c: 'A' },
    { d: A_.line(50, 88, 22, 34), s: 5 }, { d: A_.head(15, 21, -118, 10), c: 'A' },
    { d: A_.line(50, 88, 78, 34), s: 5 }, { d: A_.head(85, 21, -62, 10), c: 'A' }],
  pierce: () => [{ d: A_.circ(34, 66, 13), s: 5, c: 'A' }, { d: A_.circ(64, 38, 13), s: 5, c: 'A' },
    { d: A_.line(8, 92, 80, 20), s: 6 }, { d: A_.head(92, 8, -45, 11) }, { d: 'M8 92 L4 80 M8 92 L20 96', s: 3.5, c: 'A' }],
  aoe: () => [{ d: A_.circ(50, 50, 12), c: 'A' },
    ...[0, 90, 180, 270].flatMap(a => { const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [{ d: A_.line(50 + c * 22, 50 + s * 22, 50 + c * 34, 50 + s * 34), s: 5 }, { d: A_.head(50 + c * 46, 50 + s * 46, a, 8) }]; })],
  conc: () => [{ d: A_.circ(50, 50, 10), c: 'A' },
    ...[45, 135, 225, 315].flatMap(a => { const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [{ d: A_.line(50 + c * 44, 50 + s * 44, 50 + c * 30, 50 + s * 30), s: 5 }, { d: A_.head(50 + c * 18, 50 + s * 18, a + 180, 8) }]; })],
  addfire: () => [{ d: 'M50 8 C36 28 22 44 28 64 C32 82 68 86 74 64 C78 50 68 42 64 30 C62 42 56 44 54 36 C54 28 56 18 50 8 Z', c: '#ff8a3a', glow: true },
    { d: 'M50 54 C42 60 42 74 50 76 C58 78 62 66 54 60 Z', c: 'L', noOutline: true }],
  hypo: () => SKILL_GLYPHS.nova().map(p => Object.assign({}, p, { c: p.c === 'A' ? 'A' : '#cfefff' })),
  brutal: () => [{ d: A_.rrect(26, 26, 48, 38, 9) }, { d: 'M38 30 V44 M50 30 V44 M62 30 V44', s: 3, c: 'D' },
    { d: 'M30 62 V86 H70 V62', c: 'L' }, { d: A_.star(50, 14, 4, 10, 3, 0), c: 'A' }],
  elefocus: () => [{ d: A_.poly([[50, 24], [26, 66], [74, 66]]), s: 3 },
    { d: A_.circ(50, 24, 13), c: '#ff6a40', glow: true }, { d: A_.circ(26, 66, 13), c: '#6ab8ff', glow: true }, { d: A_.circ(74, 66, 13), c: '#ffe060', glow: true }],
  crit: () => [{ d: A_.circ(50, 50, 26), s: 5 }, { d: 'M50 6 V30 M50 70 V94 M6 50 H30 M70 50 H94', s: 5 }, { d: A_.star(50, 50, 4, 14, 4, 0), c: 'A' }],
  fasta: () => [{ d: 'M14 20 L44 50 L14 80', s: 10 }, { d: 'M46 20 L76 50 L46 80', s: 10, c: 'A' }],
  fastc: () => [{ d: A_.poly([[26, 12], [74, 12], [54, 50], [74, 88], [26, 88], [46, 50]]) },
    { d: A_.poly([[36, 20], [64, 20], [50, 40]]), c: 'A' }, { d: A_.poly([[50, 66], [64, 82], [36, 82]]), c: 'A' }],
  echo: () => [{ d: 'M26 64 A28 28 0 1 1 64 76', s: 6 }, { d: A_.head(74, 70, -40, 10) },
    { d: 'M38 58 A14 14 0 1 1 58 64', s: 4, c: 'A' }],
  leech: () => [{ d: A_.drop(50, 56, 24), c: '#e83a3a', glow: true }, { d: 'M38 52 Q38 42 46 38', s: 4, c: 'W', noOutline: true }],
  mdmg: () => [{ d: 'M14 14 L86 86 M86 14 L14 86', s: 6 }, ...SKILL_GLYPHS.skel().map(p => Object.assign({}, p, { tx: 20, ty: 18, sc: 0.6 }))],
  army: () => [[2, 30], [38, 6], [38, 50]].flatMap(([tx, ty]) => SKILL_GLYPHS.skel().map(p => Object.assign({}, p, { tx, ty, sc: 0.5 }))),
  mlife: () => [{ d: 'M50 86 C18 62 8 44 20 26 C32 12 46 18 50 30 C54 18 68 12 80 26 C92 44 82 62 50 86 Z', c: '#ff4a5a', glow: true },
    { d: 'M30 34 Q30 26 38 24', s: 4, c: 'W', noOutline: true }],
  burn: () => [...SUPPORT_GLYPHS.addfire(), { d: A_.circ(20, 30, 4), c: 'A' }, { d: A_.circ(82, 26, 3), c: 'A' }, { d: A_.circ(84, 72, 4), c: 'A' }],
  venom: () => [{ d: A_.poly([[24, 10], [46, 10], [38, 66]]) }, { d: A_.poly([[54, 10], [76, 10], [62, 66]]) },
    { d: A_.drop(38, 84, 7), c: '#7ae060', glow: true }, { d: A_.drop(62, 82, 5), c: '#7ae060', glow: true }],
  rend: () => [{ d: 'M24 10 Q40 46 26 90 M48 8 Q62 46 50 92 M72 10 Q86 46 74 90', s: 7, c: '#ff5a4a', glow: true }],
  frostbite: () => [{ d: A_.poly([[50, 6], [64, 50], [50, 94], [36, 50]]), c: '#bfe8ff', glow: true },
    { d: A_.poly([[20, 38], [32, 48], [22, 60]]), c: 'L' }, { d: A_.poly([[80, 38], [68, 48], [78, 60]]), c: 'L' }, { d: A_.line(50, 12, 50, 88), s: 2, c: 'W' }],
  static: () => [{ d: A_.poly([[58, 6], [26, 54], [47, 54], [36, 94], [76, 40], [55, 40], [68, 6]]), c: '#ffe95a', glow: true }],
  addchaos: () => [{ d: A_.circ(40, 58, 22), c: '#7ae060', glow: true }, { d: A_.circ(68, 34, 13), c: '#9ae070', glow: true }, { d: A_.circ(70, 74, 9), c: '#5ac050', glow: true },
    { d: 'M30 50 Q32 42 40 40 M62 30 Q64 26 68 26', s: 3, c: 'W', noOutline: true }],
};

// =============================================================
//  寶石外框
// =============================================================
const ATTR_GEM = { str: ['#ff7a6a', '#9a1e14'], dex: ['#7ae070', '#1e6a22'], int: ['#7aa8ff', '#1a3690'] };
function gemPoints(cx, cy, r, n, cut) { // 八角形（切角的正方形）或多邊形
  if (n === 8) { const a = r, c = r * cut; return [[cx - a + c, cy - a], [cx + a - c, cy - a], [cx + a, cy - a + c], [cx + a, cy + a - c], [cx + a - c, cy + a], [cx - a + c, cy + a], [cx - a, cy + a - c], [cx - a, cy - a + c]]; }
  const pts = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2 - Math.PI / 2 + Math.PI / n; pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); } return pts;
}
function drawGemBody(g, outer, inner, c1, c2) {
  const path = pts => { const p = new Path2D(); p.moveTo(...pts[0]); for (const q of pts.slice(1)) p.lineTo(...q); p.closePath(); return p; };
  const op = path(outer);
  // 寶石底色：左上亮、右下暗
  const gr = g.createLinearGradient(10, 10, 90, 90); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fill(op);
  // 刻面：依照面的方向打光（光從左上來）
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    const mx = (outer[i][0] + outer[j][0]) / 2 - 50, my = (outer[i][1] + outer[j][1]) / 2 - 50, ml = Math.hypot(mx, my) || 1;
    const b = (-mx * 0.7 - my * 0.7) / ml;
    g.fillStyle = b > 0 ? `rgba(255,255,255,${0.32 * b})` : `rgba(0,0,0,${0.38 * -b})`;
    g.fill(path([outer[i], outer[j], inner[j], inner[i]]));
  }
  // 中央的檯面：中間稍亮，好讓符號浮出來
  const ip = path(inner);
  const rg = g.createRadialGradient(42, 40, 4, 50, 50, 40); rg.addColorStop(0, 'rgba(255,255,255,0.18)'); rg.addColorStop(1, 'rgba(0,0,0,0.38)');
  g.fillStyle = rg; g.fill(ip);
  g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1; g.stroke(ip);
  // 外框：深色＋金邊
  g.strokeStyle = ART_DARK; g.lineWidth = 6; g.stroke(op);
  const gold = g.createLinearGradient(0, 0, 100, 100); gold.addColorStop(0, '#fff0b0'); gold.addColorStop(0.5, '#c8963c'); gold.addColorStop(1, '#6a4818');
  g.strokeStyle = gold; g.lineWidth = 2.6; g.stroke(op);
  // 高光
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(30, 22, 10, 4, -0.6, 0, Math.PI * 2); g.fill();
}
function artCanvas(key, px, draw) {
  const k = key + '@' + px;
  if (ART_CACHE[k]) return ART_CACHE[k];
  const c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'); g.scale(px / 100, px / 100);
  draw(g);
  ART_CACHE[k] = c; return c;
}
function artURL(c) { if (!c._url) c._url = c.toDataURL(); return c._url; }
// v2.4：有 AI 新圖示（js\artstyle.js）就用新的，沒有就照舊用程式畫
const artNew = (g, ...ids) => typeof ArtStyle !== 'undefined' && ids.some(id => ArtStyle.icon(g, id));

// 技能寶石：八角形切割，顏色＝主要屬性（力量紅、敏捷綠、智慧藍，雙屬性就是漸層）
function skillIcon(sid, px = 64) {
  return artCanvas('sk_' + sid, px, g => {
    if (artNew(g, 'sk_' + sid)) return;
    const sk = SKILLS[sid], at = (SKILL_ATTR[sid] || ['int']);
    const c1 = ATTR_GEM[at[0]][0], c2 = ATTR_GEM[at[at.length - 1]][1];
    drawGemBody(g, gemPoints(50, 50, 46, 8, 0.32), gemPoints(50, 50, 33, 8, 0.32), c1, c2);
    const fn = SKILL_GLYPHS[sid];
    if (fn) { g.save(); g.translate(14, 14); g.scale(0.72, 0.72); drawGlyph(g, fn(), sk.color); g.restore(); }
  });
}
// 輔助寶石：圓形明亮式切割，顏色＝輔助寶石本身的顏色
function supportIcon(id, px = 48) {
  return artCanvas('sp_' + id, px, g => {
    if (artNew(g, 'sp_' + id)) return;
    const sp = SUPPORTS[id], base = sp.color;
    drawGemBody(g, gemPoints(50, 50, 46, 12), gemPoints(50, 50, 30, 12), artShade(base, 0.35), artShade(base, -0.55));
    const fn = SUPPORT_GLYPHS[id];
    if (fn) { g.save(); g.translate(19, 19); g.scale(0.62, 0.62); drawGlyph(g, fn(), artShade(base, 0.45)); g.restore(); }
  });
}
const skillIconURL = (sid, px = 64) => artURL(skillIcon(sid, px));
const supportIconURL = (id, px = 48) => artURL(supportIcon(id, px));

// =============================================================
//  裝備圖示（依部位、防禦類型、階級換顏色）
// =============================================================
const METAL = ['#a8aeb8', '#d8e0ec', '#f0c860', '#c8a0ff', '#ff7a6a'];      // 初階鐵 → 中階鋼 → 高階金 → 夢鑄紫 → 深淵紅
const LEATHER = ['#9a6a40', '#7a8a3a', '#3a7a5a', '#7a50a8', '#a83a3a'];
const CLOTH = ['#5a6aa8', '#3a7ac8', '#2a9ab8', '#9a5ad8', '#c83a6a'];
const WOOD = '#8a5a30', GOLDC = '#e8b850', GRIP = '#4a2a18';
const STONE = ['#6ab4ff', '#5ae0a0', '#ffcf50', '#c890ff', '#ff5a5a']; // 寶石鑲嵌：藍寶 → 翡翠 → 黃玉 → 夢紫 → 深淵紅
// 用漸層把一個顏色變成有立體感的材質
function mat(g, hex, x0 = 20, y0 = 10, x1 = 80, y1 = 90) {
  const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, artShade(hex, 0.45)); gr.addColorStop(0.5, hex); gr.addColorStop(1, artShade(hex, -0.45)); return gr;
}
function paint(g, d, fill, opt = {}) {
  const p = new Path2D(d);
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (opt.s) { if (!opt.noOutline) { g.strokeStyle = ART_DARK; g.lineWidth = opt.s + 6; g.stroke(p); } g.strokeStyle = fill; g.lineWidth = opt.s; g.stroke(p); return; }
  if (!opt.noOutline) { g.strokeStyle = ART_DARK; g.lineWidth = 6; g.stroke(p); }
  g.fillStyle = fill; g.fill(p);
  if (opt.line) { g.strokeStyle = opt.line; g.lineWidth = 1.6; g.stroke(p); }
}
function glint(g, x, y, r = 5) { g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill(new Path2D(A_.star(x, y, 4, r, r * 0.25, 0))); }
const ITEM_ART = {
  sword: (g, m) => { paint(g, A_.poly([[72, 8], [86, 6], [84, 20], [38, 64], [30, 56]]), mat(g, m)); paint(g, A_.line(80, 12, 36, 58), 'rgba(255,255,255,0.5)', { s: 1.5, noOutline: true });
    paint(g, A_.line(22, 52, 46, 76), mat(g, GOLDC), { s: 8 }); paint(g, A_.line(32, 68, 16, 84), GRIP, { s: 8 }); paint(g, A_.circ(13, 87, 6), mat(g, GOLDC)); glint(g, 76, 16); },
  axe: (g, m) => { paint(g, A_.line(28, 94, 64, 18), mat(g, WOOD), { s: 8 });
    paint(g, 'M58 14 C78 6 96 22 92 46 C82 38 70 38 60 44 L54 30 Z', mat(g, m)); paint(g, A_.poly([[54, 22], [38, 16], [48, 34]]), mat(g, m));
    paint(g, 'M64 16 C80 12 92 26 90 42', 'rgba(255,255,255,0.55)', { s: 2, noOutline: true }); glint(g, 80, 20); },
  bow: (g, m) => { paint(g, 'M30 6 C76 20 76 80 30 94', mat(g, WOOD, 30, 0, 80, 100), { s: 7 }); paint(g, A_.line(30, 6, 30, 94), '#e8e0d0', { s: 1.6 });
    paint(g, A_.line(62, 42, 62, 58), mat(g, m), { s: 10 }); paint(g, A_.line(30, 50, 84, 50), '#d8d0c0', { s: 3 }); paint(g, A_.head(94, 50, 0, 8), mat(g, m)); },
  wand: (g, m) => { paint(g, A_.line(16, 88, 66, 38), mat(g, WOOD), { s: 8 }); paint(g, A_.line(28, 76, 34, 82), GOLDC, { s: 3 });
    g.shadowColor = m; g.shadowBlur = 12; paint(g, A_.poly([[76, 14], [88, 28], [76, 42], [64, 28]]), mat(g, m)); g.shadowBlur = 0; glint(g, 74, 22); },
  staff: (g, m) => { paint(g, A_.line(20, 94, 70, 24), mat(g, WOOD), { s: 7 }); paint(g, 'M62 32 Q52 14 70 6 M86 34 Q98 16 80 8', mat(g, GOLDC), { s: 4 });
    g.shadowColor = m; g.shadowBlur = 14; const rg = g.createRadialGradient(72, 18, 2, 76, 22, 14); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.4, m); rg.addColorStop(1, artShade(m, -0.5));
    paint(g, A_.circ(76, 22, 12), rg); g.shadowBlur = 0; },
  katana: (g, m) => { paint(g, 'M24 80 Q52 56 90 12', mat(g, m), { s: 6 }); paint(g, 'M26 76 Q54 52 88 14', 'rgba(255,255,255,0.6)', { s: 1.4, noOutline: true });
    paint(g, A_.circ(30, 74, 8), mat(g, GOLDC)); paint(g, A_.line(26, 78, 10, 94), '#2a1a20', { s: 8 }); paint(g, 'M22 82 L18 78 M16 88 L12 84', '#c8a060', { s: 2, noOutline: true }); },
  dagger: (g, m) => { paint(g, A_.poly([[72, 10], [86, 14], [48, 58], [40, 50]]), mat(g, m)); paint(g, A_.line(30, 46, 52, 68), mat(g, GOLDC), { s: 8 });
    paint(g, A_.line(40, 60, 22, 78), GRIP, { s: 8 }); paint(g, A_.circ(20, 80, 6), mat(g, GOLDC)); glint(g, 78, 16); },
  shield: (g, m) => { const d = 'M50 6 C66 12 80 12 88 12 C88 54 74 80 50 94 C26 80 12 54 12 12 C20 12 34 12 50 6 Z';
    paint(g, d, mat(g, m)); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3; g.stroke(new Path2D('M50 14 C64 18 74 18 80 18 C80 52 68 74 50 86 C32 74 20 52 20 18 C26 18 36 18 50 14 Z'));
    paint(g, 'M50 22 V76 M28 40 H72', 'rgba(0,0,0,0.3)', { s: 4, noOutline: true }); paint(g, A_.circ(50, 42, 9), mat(g, GOLDC)); glint(g, 30, 22); },
  quiver: (g, m) => { [[40, '#d0d0c0'], [52, '#c8a060'], [64, '#d0d0c0']].forEach(([x, c]) => { paint(g, A_.line(x, 30, x + 6, 4), '#c8b890', { s: 3 }); paint(g, A_.poly([[x + 6, 2], [x + 12, 10], [x + 2, 12]]), m); });
    paint(g, A_.rrect(30, 28, 40, 64, 10), mat(g, LEATHER[0])); paint(g, 'M30 44 H70 M30 76 H70', mat(g, GOLDC), { s: 4 }); },
  focus: (g, m) => { g.shadowColor = m; g.shadowBlur = 16; const rg = g.createRadialGradient(42, 32, 3, 50, 42, 30); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.35, m); rg.addColorStop(1, artShade(m, -0.6));
    paint(g, A_.circ(50, 42, 28), rg); g.shadowBlur = 0; paint(g, 'M30 76 H70 L62 92 H38 Z', mat(g, GOLDC)); paint(g, 'M34 70 Q50 80 66 70', mat(g, GOLDC), { s: 4 }); glint(g, 40, 30, 7); },
  helmet: (g, m, def, t) => {
    if (def === 'ev') { paint(g, 'M50 8 C24 12 12 40 14 88 L36 88 C34 66 38 50 50 46 C62 50 66 66 64 88 L86 88 C88 40 76 12 50 8 Z', mat(g, LEATHER[t])); paint(g, 'M36 88 C34 66 38 50 50 46 C62 50 66 66 64 88 Z', '#140c08', { noOutline: true }); return; }
    if (def === 'es') { paint(g, 'M12 58 Q50 76 88 58', mat(g, GOLDC), { s: 9 }); paint(g, 'M26 60 L34 40 L42 62 M58 62 L66 40 L74 60', mat(g, GOLDC), { s: 5 });
      g.shadowColor = CLOTH[t]; g.shadowBlur = 12; paint(g, A_.poly([[50, 30], [60, 46], [50, 62], [40, 46]]), mat(g, CLOTH[t])); g.shadowBlur = 0; glint(g, 48, 40); return; }
    paint(g, 'M16 62 C16 26 34 12 50 12 C66 12 84 26 84 62 L74 62 L74 84 L26 84 L26 62 Z', mat(g, m)); paint(g, A_.line(30, 50, 70, 50), '#140c08', { s: 7 }); paint(g, A_.line(50, 54, 50, 80), '#140c08', { s: 4 });
    paint(g, 'M50 12 Q56 4 64 6', mat(g, '#c83a2a'), { s: 5 }); glint(g, 36, 26); },
  body: (g, m, def, t) => {
    if (def === 'es') { paint(g, 'M36 8 H64 L72 24 L88 92 H12 L28 24 Z', mat(g, CLOTH[t])); paint(g, 'M50 24 V92 M36 8 L50 24 L64 8', mat(g, GOLDC), { s: 3 }); paint(g, 'M14 88 H86', mat(g, GOLDC), { s: 4 }); return; }
    const c = def === 'ev' ? LEATHER[t] : m;
    paint(g, 'M20 18 L38 10 Q50 20 62 10 L80 18 L88 42 L76 48 L74 90 L26 90 L24 48 L12 42 Z', mat(g, c));
    if (def === 'ev') paint(g, 'M44 30 L56 36 M44 42 L56 48 M44 54 L56 60 M56 30 L44 36 M56 42 L44 48 M56 54 L44 60', '#e8d8b0', { s: 1.8, noOutline: true });
    else { paint(g, 'M28 50 H72 M30 66 H70 M50 24 V88', 'rgba(0,0,0,0.3)', { s: 3, noOutline: true }); glint(g, 34, 28); } },
  gloves: (g, m, def, t) => { const c = def === 'ar' ? m : def === 'ev' ? LEATHER[t] : CLOTH[t];
    paint(g, 'M28 92 L28 52 L22 32 Q22 24 29 25 L35 42 L36 16 Q37 9 43 10 L45 38 L50 12 Q53 7 57 12 L56 38 L62 18 Q67 13 70 20 L66 46 L78 38 Q85 37 82 46 L68 68 L68 92 Z', mat(g, c));
    paint(g, 'M26 80 H70', def === 'ar' ? mat(g, GOLDC) : 'rgba(0,0,0,0.35)', { s: 5, noOutline: def !== 'ar' }); if (def === 'ar') glint(g, 46, 26); },
  boots: (g, m, def, t) => { const c = def === 'ar' ? m : def === 'ev' ? LEATHER[t] : CLOTH[t];
    paint(g, 'M28 8 H58 V56 L84 68 Q92 74 88 86 H22 L26 56 Z', mat(g, c)); paint(g, A_.line(22, 88, 88, 88), '#1a100a', { s: 6 });
    paint(g, 'M26 22 H58', def === 'ar' ? mat(g, GOLDC) : 'rgba(0,0,0,0.35)', { s: 5, noOutline: def !== 'ar' }); },
  amulet: (g, m) => { paint(g, 'M18 8 Q50 56 82 8', mat(g, GOLDC), { s: 3.5 }); paint(g, A_.circ(50, 42, 6), mat(g, GOLDC));
    g.shadowColor = m; g.shadowBlur = 12; paint(g, A_.poly([[50, 46], [68, 66], [50, 92], [32, 66]]), mat(g, m)); g.shadowBlur = 0;
    paint(g, A_.line(50, 46, 50, 92) + ' ' + A_.line(32, 66, 68, 66), 'rgba(255,255,255,0.35)', { s: 1.5, noOutline: true }); glint(g, 44, 60); },
  ring: (g, m) => { paint(g, A_.circ(50, 60, 25), mat(g, GOLDC), { s: 9 }); g.shadowColor = m; g.shadowBlur = 12;
    paint(g, A_.poly([[50, 18], [64, 32], [50, 46], [36, 32]]), mat(g, m)); g.shadowBlur = 0; glint(g, 46, 28); },
  belt: (g, m) => { paint(g, A_.rrect(6, 40, 88, 22, 6), mat(g, LEATHER[0], 0, 40, 0, 62)); paint(g, A_.rrect(38, 32, 24, 38, 4), mat(g, GOLDC), { s: 5 });
    paint(g, A_.line(50, 40, 50, 62), mat(g, GOLDC), { s: 3 }); paint(g, A_.rrect(68, 60, 18, 20, 4), mat(g, LEATHER[1])); },
};
// 裝備圖示：base＝裝備基底（決定部位、防禦類型、階級）
function itemIcon(base, px = 48) {
  return artCanvas(`it_${base.id || base.cls}_${base.def || ''}_${base.tier || 0}`, px, g => {   // v2.6：每個基底各自一張圖（戒指、項鍊的階級都是 0，所以要用 id 分開）
    const t = base.tier || 0, m = METAL[t];
    // 高階裝備背後有淡淡的光
    if (t >= 2) { const rg = g.createRadialGradient(50, 50, 4, 50, 50, 50); rg.addColorStop(0, artShade(m, 0) .replace('rgb', 'rgba').replace(')', ',0.35)')); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 100, 100); }
    if (typeof ArtStyle !== 'undefined' && ArtStyle.baseIcon(g, base)) return;
    (ITEM_ART[base.cls] || ITEM_ART.ring)(g,['wand', 'staff', 'focus', 'amulet', 'ring'].includes(base.cls) ? STONE[t] : m, base.def, t);
  });
}
const itemIconURL = (base, px = 48) => artURL(itemIcon(base, px));

// 藥劑瓶
function flaskIcon(type, px = 48, color) {
  return artCanvas('fl_' + type + (color || ''), px, g => {
    if (!color && artNew(g, 'fl_' + type)) return;
    const c = color || FLASKS[type].color;
    const body = 'M38 30 V40 C22 46 18 62 22 76 C26 90 74 90 78 76 C82 62 78 46 62 40 V30 Z';
    paint(g, body, 'rgba(200,220,235,0.25)');
    g.save(); g.clip(new Path2D(body));
    const lg = g.createLinearGradient(0, 50, 0, 92); lg.addColorStop(0, artShade(c, 0.25)); lg.addColorStop(1, artShade(c, -0.45));
    g.fillStyle = lg; g.fillRect(0, 54, 100, 50);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 54, 100, 3);
    g.restore();
    paint(g, 'M30 76 Q32 58 40 52', 'rgba(255,255,255,0.55)', { s: 3, noOutline: true });
    paint(g, A_.rrect(34, 16, 32, 14, 4), mat(g, '#a07040')); paint(g, A_.rrect(32, 26, 36, 6, 2), mat(g, GOLDC));
  });
}
const flaskIconURL = (type, px = 48, color) => artURL(flaskIcon(type, px, color));

// =============================================================
//  通貨圖示：每種都不一樣
// =============================================================
function orbBase(g, c, rim = GOLDC) {
  const rg = g.createRadialGradient(40, 36, 4, 50, 52, 38); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.3, artShade(c, 0.2)); rg.addColorStop(1, artShade(c, -0.6));
  g.shadowColor = c; g.shadowBlur = 10; paint(g, A_.circ(50, 52, 34), rg); g.shadowBlur = 0;
  g.strokeStyle = rim; g.lineWidth = 3; g.stroke(new Path2D(A_.circ(50, 52, 34)));
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(38, 36, 9, 5, -0.6, 0, Math.PI * 2); g.fill();
}
const CUR_ART = {
  portal: g => { paint(g, A_.rrect(18, 22, 64, 56, 6), mat(g, '#e8d8b0')); paint(g, A_.rrect(10, 16, 14, 68, 7), mat(g, '#c8a878')); paint(g, A_.rrect(76, 16, 14, 68, 7), mat(g, '#c8a878'));
    g.shadowColor = '#5ab0ff'; g.shadowBlur = 8; paint(g, A_.circ(50, 50, 14), 'rgba(0,0,0,0)', { s: 4 }); paint(g, A_.circ(50, 50, 14), '#5ab0ff', { s: 3 }); g.shadowBlur = 0; },
  transmute: g => { orbBase(g, '#6a9aff'); paint(g, 'M36 52 A14 14 0 1 1 50 66', '#ffffff', { s: 4 }); },
  alter: g => { orbBase(g, '#3a6ae0'); paint(g, A_.circ(50, 52, 20), 'rgba(255,255,255,0.8)', { s: 2.5 }); paint(g, 'M50 32 V40 M50 64 V72 M30 52 H38 M62 52 H70', '#ffffff', { s: 3 }); },
  aug: g => { orbBase(g, '#4a8ae8'); paint(g, 'M50 38 V66 M36 52 H64', '#ffffff', { s: 6 }); },
  chance: g => { paint(g, A_.circ(50, 52, 34), mat(g, '#e8c860')); g.strokeStyle = '#8a6a20'; g.lineWidth = 3; g.stroke(new Path2D(A_.circ(50, 52, 26)));
    paint(g, A_.star(50, 52, 5, 16, 7), '#fff4c0'); },
  alch: g => { orbBase(g, '#e8a030'); paint(g, A_.poly([[50, 34], [68, 66], [32, 66]]), 'rgba(0,0,0,0)', { s: 3 }); paint(g, A_.poly([[50, 34], [68, 66], [32, 66]]), '#fff4c0', { s: 3 }); paint(g, A_.circ(50, 56, 5), '#fff4c0'); },
  regal: g => { orbBase(g, '#5a7ae0'); paint(g, 'M30 62 L30 42 L40 52 L50 36 L60 52 L70 42 L70 62 Z', mat(g, GOLDC)); },
  chaos: g => { paint(g, A_.circ(50, 52, 34), mat(g, '#3a2050')); g.shadowColor = '#e0a0ff'; g.shadowBlur = 10;
    for (let k = 0; k < 4; k++) paint(g, 'M50 52 Q60 30 82 34', mat(g, GOLDC), { s: 5 }), g.translate(50, 52), g.rotate(Math.PI / 2), g.translate(-50, -52);
    g.shadowBlur = 0; paint(g, A_.circ(50, 52, 8), '#e0a0ff'); },
  annul: g => { orbBase(g, '#d8d8f0', '#a0a0c0'); paint(g, 'M36 38 L64 66 M64 38 L36 66', '#3a3a5a', { s: 5 }); },
  divine: g => { g.shadowColor = '#fff0a0'; g.shadowBlur = 14; paint(g, A_.star(50, 52, 12, 44, 30), mat(g, '#ffe080')); g.shadowBlur = 0; orbBase(g, '#fff0c0'); },
  exalt: g => { paint(g, 'M50 40 C30 20 12 30 8 44 C24 40 34 46 44 56 Z', mat(g, '#f0f0ff')); paint(g, 'M50 40 C70 20 88 30 92 44 C76 40 66 46 56 56 Z', mat(g, '#f0f0ff'));
    g.shadowColor = '#ffffff'; g.shadowBlur = 12; paint(g, A_.star(50, 56, 4, 30, 9, 0), mat(g, '#ffffff')); g.shadowBlur = 0; },
  scour: g => { orbBase(g, '#b8b8b8', '#808080'); paint(g, 'M34 40 Q50 50 40 64 M58 36 Q64 54 56 70', '#4a4a4a', { s: 3 }); },
  socket: g => { paint(g, A_.line(22, 82, 62, 42), mat(g, WOOD), { s: 9 }); paint(g, A_.poly([[58, 34], [76, 16], [86, 26], [68, 46]]), mat(g, '#d8e0ec'));
    paint(g, A_.circ(28, 30, 14), mat(g, '#8a7a68')); paint(g, A_.circ(28, 30, 8), '#140c08', { noOutline: true }); glint(g, 24, 26, 3); glint(g, 76, 22); },
};
function currencyIcon(k, px = 40) {
  return artCanvas('cur_' + k, px, g => artNew(g, 'cur_' + k) || (CUR_ART[k] || (gg => orbBase(gg, CURRENCY[k] ? CURRENCY[k].color : '#8fb8ff')))(g));
}
const currencyIconURL = (k, px = 40) => artURL(currencyIcon(k, px));

// =============================================================
//  v1.4 材料圖示：礦石、獸皮、毛皮、寶石原石、木材（等級越高，光暈顏色越亮）
// =============================================================
function matIcon(type, tier, px = 40) {
  return artCanvas(`mat_${type}_${tier}`, px, g => {
    const tc = MAT_TIER_COLOR[tier - 1];
    const rg = g.createRadialGradient(50, 55, 4, 50, 55, 48); rg.addColorStop(0, artShade(tc, 0).replace('rgb', 'rgba').replace(')', ',0.45)')); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 100, 100);
    if (artNew(g, 'mat_' + type)) { // 新圖示＋右下角的等級小點（材料等級顏色）
      g.fillStyle = 'rgba(10,6,4,.85)'; g.beginPath(); g.arc(84, 84, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = tc; g.beginPath(); g.arc(84, 84, 7.5, 0, Math.PI * 2); g.fill(); return;
    }
    if (type === 'ore') {
      paint(g, A_.poly([[22, 70], [18, 46], [36, 26], [62, 22], [82, 40], [84, 66], [64, 82], [36, 84]]), mat(g, '#7a7a84'));
      paint(g, 'M30 52 L46 44 L58 54 M56 34 L66 46 M40 70 L54 64', artShade(tc, 0.2), { s: 4, noOutline: true });
      glint(g, 60, 34, 6);
    } else if (type === 'hide') {
      paint(g, 'M20 30 Q30 18 44 26 Q56 16 70 24 Q86 26 82 44 Q90 58 80 70 Q74 86 56 80 Q42 90 30 80 Q14 72 20 56 Q10 42 20 30 Z', mat(g, '#a06a3a'));
      paint(g, 'M30 36 Q50 30 72 38 M28 66 Q50 74 74 64', 'rgba(255,230,190,0.5)', { s: 2, noOutline: true });
      paint(g, 'M50 30 V78', artShade(tc, 0), { s: 3, noOutline: true });
    } else if (type === 'fur') {
      let d = 'M18 40'; for (let i = 0; i <= 8; i++) d += ` Q${22 + i * 8} ${i % 2 ? 26 : 34} ${26 + i * 8} 32`; d += ' L84 66'; for (let i = 8; i >= 0; i--) d += ` Q${22 + i * 8} ${i % 2 ? 80 : 72} ${18 + i * 8} 74`; d += ' Z';
      paint(g, d, mat(g, '#e8d8b8'));
      paint(g, 'M30 44 L36 62 M48 42 L52 64 M66 44 L70 62', artShade(tc, -0.1), { s: 4, noOutline: true });
    } else if (type === 'gem') {
      g.shadowColor = tc; g.shadowBlur = 12;
      [[34, 74, 10, 34], [52, 78, 13, 50], [70, 74, 10, 30]].forEach(([x, y, w, h]) => paint(g, A_.poly([[x - w, y], [x - w * 0.7, y - h * 0.7], [x, y - h], [x + w * 0.7, y - h * 0.7], [x + w, y]]), mat(g, tc)));
      g.shadowBlur = 0; paint(g, A_.rrect(18, 72, 64, 12, 5), mat(g, '#6a6a72')); glint(g, 50, 36, 6);
    } else if (type === 'wood') {
      paint(g, A_.rrect(16, 36, 62, 34, 10), mat(g, '#8a5a30', 0, 36, 0, 70));
      paint(g, 'M24 44 H66 M26 60 H70', 'rgba(0,0,0,0.25)', { s: 2, noOutline: true });
      paint(g, 'M78 36 A10 17 0 1 1 78 70 A10 17 0 1 1 78 36 Z', mat(g, '#d8b080'));
      paint(g, 'M78 44 A5 9 0 1 1 78 62 A5 9 0 1 1 78 44 Z', 'rgba(120,70,30,0.6)', { s: 1.5, noOutline: true });
      paint(g, A_.circ(30, 28, 4), artShade(tc, 0));
    }
  });
}
const matIconURL = (type, tier, px = 40) => artURL(matIcon(type, tier, px));
