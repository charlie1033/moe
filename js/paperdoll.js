// =============================================================
//  v2.6 換裝像素小人（地圖上的玩家角色）
//  ・身體用 16×24 的像素格畫，放大 2 倍；全部用程式畫（AI 生不出能動的分層像素圖）
//  ・頭盔、胸甲、手套、鞋子：形狀看「防禦種類」（護甲＝金屬板甲、閃避＝皮甲兜帽、能量護盾＝法袍頭冠），
//    顏色看「基底階級」（初階生鏽鐵 → 中階鋼 → 高階金邊 → 夢鑄紫光 → 深淵黑紅）
//  ・武器、盾、法器、箭袋：用 AI 生成的各階裝備圖示（js\artwork.js），縮小拿在手上
//  ・沒穿裝備時是職業本身的樣子（髮色、衣服顏色不同）
//  ・說明頁關掉「新美術」就回到原本的 0x72 角色
//  ・render.js 的 drawPlayer 會呼叫 drawPaperDoll()，回傳 false 就用原本的畫法
// =============================================================
const DOLL = { W: 18, H: 26, S: 2, cache: new Map() };

// ---------- 顏色 ----------
function dollMix(hex, k) { // k>0 變亮、k<0 變暗
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = k > 0 ? 255 : 0, a = Math.abs(k);
  r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
const pal = base => ({ b: base, d: dollMix(base, -0.35), dd: dollMix(base, -0.6), l: dollMix(base, 0.3) });
// 各階的材質：m＝主色、t＝鑲邊（null 就不鑲）、glow＝會發光的小點
const DOLL_TIER = {
  // 第 6 階「原初」：象牙白＋青金色發光紋路
  ar: [{ m: '#8c8174', t: '#9a5a32' }, { m: '#b4bfcd', t: '#e4ecf6' }, { m: '#c4c8d2', t: '#f2c440' }, { m: '#a493e2', t: '#e2d4ff', glow: '#c8a8ff' }, { m: '#3c3238', t: '#ff3434', glow: '#ff3030' }, { m: '#e8e0cc', t: '#5ae8f0', glow: '#9af8ff' }],
  ev: [{ m: '#8a5a34', t: null }, { m: '#6a7a3a', t: '#b49a5a' }, { m: '#3e4658', t: '#f2c440' }, { m: '#7a5ab4', t: '#e2d4ff', glow: '#c8a8ff' }, { m: '#3a2228', t: '#ff3434', glow: '#ff3030' }, { m: '#d8ccb0', t: '#5ae8f0', glow: '#9af8ff' }],
  es: [{ m: '#6a6a8c', t: null }, { m: '#3a5ab4', t: '#c8d4ff' }, { m: '#2a7a9c', t: '#f2c440' }, { m: '#8a5ad8', t: '#e2d4ff', glow: '#d0b0ff' }, { m: '#2c1a34', t: '#ff3434', glow: '#ff3030' }, { m: '#ece6d8', t: '#e8c860', glow: '#9af8ff' }],
};
// 職業本身的樣子
const DOLL_CLASS = {
  warrior:  { skin: '#eebc94', hair: '#6a3a1a', shirt: '#8a2e24', pants: '#3a3038', style: 'short' },
  samurai:  { skin: '#e6b48a', hair: '#1c1418', shirt: '#2a3050', pants: '#22222e', style: 'knot' },
  ranger:   { skin: '#eebc94', hair: '#2a2228', shirt: '#3a4238', pants: '#2a2a2a', style: 'short' },
  druid:    { skin: '#f2c8a2', hair: '#e8c060', shirt: '#4a6a32', pants: '#4a3a2a', style: 'long' },
  mage:     { skin: '#f2c8a2', hair: '#d8d8e4', shirt: '#3a4a8c', pants: '#2a2a3a', style: 'long' },
  summoner: { skin: '#e2c0a8', hair: '#5a2a6a', shirt: '#4a2a5a', pants: '#2a2030', style: 'long' },
};

// ---------- 畫一格（18×26，座標已含 1 格外框空間） ----------
function dollFrame(look, pose) {
  const W = DOLL.W, H = DOLL.H;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const R = (x, y, w, h, col) => { if (col) { g.fillStyle = col; g.fillRect(x + 1, y + 1, w, h); } };
  const P = (x, y, col) => R(x, y, 1, 1, col);
  const C = DOLL_CLASS[look.cls] || DOLL_CLASS.warrior;
  const skin = pal(C.skin), hair = pal(C.hair);
  const up = pose.up || 0;            // 上半身往上幾格（跑步彈跳）
  const lf = pose.legF || 0, lb = pose.legB || 0, af = pose.armF || 0, ab = pose.armB || 0;
  const tierOf = b => Math.max(0, Math.min(5, b ? b.tier || 0 : 0));
  const mat = b => b ? DOLL_TIER[b.def || 'ar'][tierOf(b)] : null;
  const bodyB = look.body, helmB = look.helmet, gloB = look.gloves, bootB = look.boots;
  const robe = bodyB && bodyB.def === 'es';

  // --- 後面的手臂（比較暗） ---
  const sleeve = bodyB ? pal(mat(bodyB).m) : pal(C.shirt);
  R(3, 10 - up + ab, 2, 4, sleeve.dd); P(3, 10 - up + ab, sleeve.d);
  const hand = (x, y, back) => {
    if (gloB) { const gm = pal(mat(gloB).m); R(x, y, 2, 2, back ? gm.d : gm.b); P(x + 1, y, back ? gm.b : gm.l); if (mat(gloB).t && tierOf(gloB) >= 2) R(x, y, 2, 1, mat(gloB).t); }
    else R(x, y + 1, 2, 1, back ? skin.d : skin.b);
  };
  hand(3, 13 - up + ab, true);

  // --- 腿 ---
  const pants = pal(C.pants);
  if (!robe) {
    R(5 + lb, 16, 2, 4, pants.d);   // 後腿
    R(8 + lf, 16, 2, 4, pants.b);   // 前腿
  }
  // --- 鞋子 ---
  const foot = (x, back) => {
    if (bootB) {
      const m = mat(bootB), bp = pal(m.m), col = back ? bp.d : bp.b;
      if (bootB.def === 'es') { R(x, 21, 3, 1, col); if (m.t) P(x + 2, 21, m.t); }
      else {
        R(x, 19, 2, 2, col); R(x, 21, 3, 1, back ? bp.dd : bp.d);
        if (m.t && tierOf(bootB) >= 1) R(x, 19, 2, 1, back ? dollMix(m.t, -0.3) : m.t);
        if (bootB.def === 'ar') P(x + 1, 20, back ? bp.b : bp.l);
      }
    } else { R(x, 20, 2, 1, back ? pants.dd : pants.d); R(x, 21, 3, 1, back ? '#2a1c14' : '#3a2818'); }
  };
  foot(5 + lb, true); foot(8 + lf, false);

  // --- 身體 ---
  const ty = 9 - up;
  if (!bodyB) {
    const sh = pal(C.shirt);
    R(5, ty, 6, 7, sh.b); R(5, ty, 1, 7, sh.d); R(10, ty, 1, 6, sh.l);
    R(5, ty + 6, 6, 1, '#3a2418'); P(8, ty + 6, '#c8a040');     // 腰帶
    R(7, ty, 2, 1, skin.d);                                     // 領口
  } else {
    const m = mat(bodyB), bp = pal(m.m), t = tierOf(bodyB);
    if (bodyB.def === 'ar') {          // 板甲：胸甲＋肩甲＋裙甲
      R(5, ty, 6, 7, bp.b); R(5, ty, 1, 7, bp.d); R(9, ty + 1, 1, 3, bp.l); P(10, ty + 1, bp.l);
      R(6, ty + 3, 4, 1, bp.d); R(6, ty + 5, 4, 1, bp.d);                   // 板甲的接縫
      R(3, ty, 3, 2, bp.d); P(3, ty + 1, bp.dd);                            // 後肩甲
      R(5, ty + 6, 6, 1, bp.dd);                                            // 腰
      R(5, ty + 7, 6, 2, bp.d); P(7, ty + 8, bp.dd); P(9, ty + 8, bp.b);    // 裙甲（蓋住大腿）
      if (m.t && t >= 2) { R(7, ty + 1, 1, 4, m.t); R(9, ty, 3, 1, m.t); }    // 金／紫／紅的鑲邊
      else if (t === 0) { P(6, ty + 3, m.t); P(9, ty + 5, m.t); }            // 生鏽斑點
      else if (m.t) R(9, ty, 3, 1, m.t);
      if (t >= 3) P(8, ty + 2, m.glow);
    } else if (bodyB.def === 'ev') {   // 皮甲：短外衣＋斜背帶＋腰帶
      R(5, ty, 6, 8, bp.b); R(5, ty, 1, 8, bp.d); R(10, ty + 1, 1, 6, bp.l);
      R(6, ty, 4, 1, bp.dd);                                                // 領子
      for (let i = 0; i < 5; i++) P(6 + i, ty + 1 + i, bp.dd);              // 斜背帶
      R(5, ty + 6, 6, 1, '#2a1a12'); P(8, ty + 6, m.t || '#a08050');         // 腰帶扣
      R(5, ty + 8, 2, 1, bp.d); R(9, ty + 8, 2, 1, bp.d);                   // 下襬
      if (m.t && t >= 1) { R(5, ty + 7, 6, 1, dollMix(m.t, -0.15)); }
      if (t >= 3) P(9, ty + 3, m.glow);
    } else {                           // 法袍：長到腳踝，蓋住腿
      R(5, ty, 6, 7, bp.b); R(5, ty, 1, 7, bp.d); R(10, ty + 1, 1, 5, bp.l);
      R(4, ty + 7, 8, 5, bp.b); R(4, ty + 7, 2, 5, bp.d); R(10, ty + 7, 2, 4, bp.l);   // 裙襬
      R(4, ty + 12 - up, 8, 0, bp.dd);
      R(5, ty + 6, 6, 1, m.t || bp.dd);                                    // 腰帶
      if (m.t) { R(8, ty + 7, 1, 5, m.t); R(4, 20, 8, 1, dollMix(m.t, -0.2)); }   // 前襟、下襬鑲邊
      R(7, ty, 2, 1, skin.d);
      if (t >= 3) { P(6, ty + 9, m.glow); P(10, ty + 3, m.glow); }
    }
  }
  // --- 前面的手臂 ---
  const sl = bodyB ? pal(mat(bodyB).m) : pal(C.shirt);
  R(11, 10 - up + af, 2, 4, sl.b); R(12, 10 - up + af, 1, 3, sl.l); P(11, 10 - up + af, sl.d);   // 手臂（外側亮、內側暗，才不會跟身體糊在一起）
  if (robe) R(11, 12 - up + af, 3, 2, sl.b);    // 法袍的大袖子
  if (bodyB && bodyB.def === 'ar') { const bp = pal(mat(bodyB).m); R(10, 9 - up, 3, 2, bp.l); P(12, 10 - up, bp.b); if (mat(bodyB).t && tierOf(bodyB) >= 2) R(10, 9 - up, 3, 1, mat(bodyB).t); }   // 前肩甲
  hand(11, 13 - up + af, false);
  // 脖子的陰影：頭和身體分開
  R(6, 9 - up, 4, 1, bodyB ? pal(mat(bodyB).m).dd : skin.d);

  // --- 頭 ---
  const hy = 1 - up;
  const helmCovers = helmB && (helmB.def === 'ar' || helmB.def === 'ev');
  // 臉＋頭髮
  R(6, hy, 5, 8, skin.b); R(5, hy + 1, 1, 6, skin.d); R(10, hy + 1, 1, 6, skin.b);
  P(9, hy + 4, '#201820'); P(10, hy + 6, skin.d);                       // 眼睛、下巴陰影
  if (!helmCovers) {
    R(5, hy, 6, 3, hair.b); R(5, hy + 3, 2, 3, hair.d); P(10, hy + 2, hair.b); P(9, hy + 2, hair.l);
    if (C.style === 'long') R(5, hy + 6, 2, 3, hair.d);
    if (C.style === 'knot') { R(6, hy - 1, 2, 1, hair.b); P(7, hy - 2, hair.d); }
  }
  if (helmB) {
    const m = mat(helmB), hp = pal(m.m), t = tierOf(helmB);
    if (helmB.def === 'ar') {          // 全罩頭盔＋面甲縫
      R(5, hy, 6, 8, hp.b); R(5, hy, 1, 8, hp.d); R(6, hy - 1, 4, 1, hp.b); R(9, hy + 1, 2, 2, hp.l);
      R(8, hy + 4, 3, 1, '#14100e'); if (t >= 3) P(10, hy + 4, m.glow);       // 面甲縫（高階會發光）
      P(10, hy + 6, hp.d); P(8, hy + 6, hp.d);
      if (t === 0) P(6, hy + 2, m.t);
      if (t >= 2) { R(5, hy + 3, 6, 1, m.t); R(7, hy - 3, 2, 2, t === 2 ? '#c83a2a' : m.glow); }  // 鑲邊＋盔頂羽飾
      if (t === 4) { P(5, hy - 1, hp.l); P(4, hy - 2, hp.l); P(10, hy - 1, hp.l); P(11, hy - 2, hp.l); }   // 深淵的角
    } else if (helmB.def === 'ev') {   // 兜帽（露出臉）
      R(5, hy - 1, 6, 4, hp.b); R(4, hy, 2, 7, hp.d); R(10, hy, 1, 2, hp.b); R(5, hy + 3, 2, 4, hp.d);
      R(4, hy + 7, 3, 2, hp.dd);       // 披到肩上
      P(10, hy - 1, hp.l);
      if (t >= 2) { R(7, hy + 4, 4, 1, t >= 3 ? hp.dd : '#1a1418'); P(9, hy + 4, t >= 3 ? m.glow : '#e8e0d0'); }   // 面罩（眼睛會亮）
      if (m.t && t >= 1) R(5, hy - 1, 6, 1, m.t);
    } else {                           // 頭冠（露出頭髮）
      R(5, hy + 2, 6, 1, m.t || hp.l); P(10, hy + 2, t >= 3 ? m.glow : hp.b);
      if (t >= 2) { P(6, hy + 1, m.t); P(8, hy + 1, m.t); P(10, hy + 1, m.t); }
      if (t >= 3) { P(8, hy, m.glow); }
    }
  }
  return c;
}

// 自動加 1 格深色外框（像素遊戲的描邊）
function dollOutline(src) {
  const W = src.width, H = src.height, g = src.getContext('2d');
  const d = g.getImageData(0, 0, W, H), a = d.data, out = new Uint8ClampedArray(a);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (a[i + 3]) continue;
    let n = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && a[(Y * W + X) * 4 + 3]) n = true; }
    if (n) { out[i] = 18; out[i + 1] = 12; out[i + 2] = 14; out[i + 3] = 255; }
  }
  d.data.set(out); g.putImageData(d, 0, 0); return src;
}
// 放大＋翻面＋閃白／冰凍
function dollScale(src, s, flip, fx) {
  const c = document.createElement('canvas'); c.width = src.width * s; c.height = src.height * s;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
  g.drawImage(src, 0, 0, c.width, c.height); g.setTransform(1, 0, 0, 1, 0, 0);
  if (fx === 'flash') { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.85; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
  if (fx === 'frozen') { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.4; g.fillStyle = '#bfe8ff'; g.fillRect(0, 0, c.width, c.height); }
  return c;
}
// 跑步 4 格、站著 2 格
const DOLL_RUN = [{ legF: 1, legB: -1, armF: -1, armB: 1 }, { up: 1 }, { legF: -1, legB: 1, armF: 1, armB: -1 }, { up: 1 }];
const DOLL_IDLE = [{}, { up: -1 }];   // 站著時慢慢呼吸：上半身沉下 1 格
function dollLook(cls, eq) {
  const b = it => it && typeof BASE_BY_ID !== 'undefined' ? BASE_BY_ID[it.base] || null : null;
  return { cls, helmet: b(eq && eq.helmet), body: b(eq && eq.body), gloves: b(eq && eq.gloves), boots: b(eq && eq.boots) };
}
function dollKey(look) { return [look.cls, look.helmet && look.helmet.id, look.body && look.body.id, look.gloves && look.gloves.id, look.boots && look.boots.id].join('|'); }
// 取得一格（有快取）
function dollGet(look, set, i, s, flip, fx) {
  const k = `${dollKey(look)}|${set}${i}|${s}|${flip ? 1 : 0}|${fx || ''}`;
  let c = DOLL.cache.get(k);
  if (!c) {
    if (DOLL.cache.size > 400) DOLL.cache.clear();
    const pose = (set === 'run' ? DOLL_RUN : DOLL_IDLE)[i];
    c = dollScale(dollOutline(dollFrame(look, pose)), s, flip, fx);
    DOLL.cache.set(k, c);
  }
  return c;
}
const dollOn = () => typeof ArtStyle !== 'undefined' && ArtStyle.on;

// ---------- 手上的東西：用 AI 各階圖示 ----------
function dollIcon(base, px) {
  if (!base) return null;
  // v2.7：拿在手上用直立的原圖（背包裡的武器圖是斜擺的）
  const c = typeof ArtStyle !== 'undefined' && ArtStyle.cell('it_' + base.id);
  if (c) return c;
  return typeof itemIcon === 'function' ? itemIcon(base, px) : null;
}
// v2.10 主角改用 AI 小人時，每個職業的手在不同位置：[往前幾 px, 離腳底幾 px]
const HERO_HAND = { warrior: [8, 20], samurai: [8, 20], ranger: [8, 20], druid: [8, 20], mage: [8, 21], summoner: [8, 21] };

// v2.11 武器強化光：等級越高光越強、顏色越稀有
//   +1～+2 不發光｜+3～+4 淡白光｜+5～+6 藍光｜+7～+8 紫光（會呼吸）｜+9 金橘光＋火星｜+10 紅金交替＋更多火星
const ENH_GLOW = [null, null, null,
  { c: '#e8f4ff', a: 0.7, blur: 6 }, { c: '#e8f4ff', a: 0.9, blur: 7, x2: 1 },
  { c: '#3c9cff', a: 0.9, blur: 8, x2: 1 }, { c: '#3c9cff', a: 1, blur: 10, x2: 1 },
  { c: '#b060ff', a: 1, blur: 11, pulse: 1, x2: 1 }, { c: '#b060ff', a: 1, blur: 13, pulse: 1, x2: 1 },
  { c: '#ffa020', a: 1, blur: 14, pulse: 1, x2: 1, spark: 5 },
  { c: '#ff3018', c2: '#ffd050', a: 1, blur: 16, pulse: 1, x2: 1, spark: 9 }];
const ENH_TINT = new Map();
function enhTinted(ic, id, col) {
  const k = id + '|' + col; let c = ENH_TINT.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = ic.width; c.height = ic.height;
  const x = c.getContext('2d'); x.drawImage(ic, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  if (ENH_TINT.size > 40) ENH_TINT.clear(); ENH_TINT.set(k, c); return c;
}
const ENH_GS = new Map();
function enhGlowSpr(tin, id, G0, s) {
  const key = id + '|' + G0.c + '|' + G0.blur + '|' + Math.round(s); let o = ENH_GS.get(key); if (o) return o;
  const k = tin.width / s, blur = G0.blur * 1.4 * k, pad = Math.ceil(blur * 1.6 + 3 * k);   // k＝圖上幾點等於畫面上 1 點
  const c = document.createElement('canvas'); c.width = tin.width + pad * 2; c.height = tin.height + pad * 2;
  const x = c.getContext('2d'); x.shadowColor = G0.c; x.shadowBlur = blur;
  x.drawImage(tin, pad - 2 * k, pad - 2 * k, tin.width + 4 * k, tin.height + 4 * k);
  if (G0.x2) x.drawImage(tin, pad - k, pad - k, tin.width + 2 * k, tin.height + 2 * k);
  o = { c, pad, k }; if (ENH_GS.size > 40) ENH_GS.clear(); ENH_GS.set(key, o); return o;
}
// 先畫一圈有顏色的光暈，再畫武器本體；高等級再疊一層會閃的亮面
function drawEnhIcon(g, ic, id, enh, x, y, s) {
  const G0 = ENH_GLOW[Math.min(10, enh | 0)], t = G.time;
  if (!G0 || !ic.width) { g.drawImage(ic, x, y, s, s); return; }
  const col = G0.c, p = G0.pulse ? 0.75 + 0.25 * Math.sin(t * 4) : 1, tin = enhTinted(ic, id, col);
  // v2.12.2 光暈先做好存起來（每格即時算模糊在全螢幕很貴），每格只貼圖＋改透明度
  const gs = enhGlowSpr(tin, id, G0, s), q = gs.pad / gs.k;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, G0.a * p);
  g.drawImage(gs.c, x - q, y - q, s + q * 2, s + q * 2);
  g.restore();
  g.drawImage(ic, x, y, s, s);
  if (enh >= 7) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18 + 0.14 * Math.sin(t * 5); g.drawImage(tin, x, y, s, s); g.restore(); }
}
// +9 以上：沿著武器往上飄的小火星（bow＝繞著弓轉）
function drawEnhSparks(g, enh, L, bow) {
  const G0 = ENH_GLOW[Math.min(10, enh | 0)]; if (!G0 || !G0.spark) return;
  const t = G.time, n = G0.spark;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < n; k++) {
    const ph = (t * 0.9 + k / n) % 1, a = Math.sin(ph * Math.PI);
    let x, y;
    if (bow) { const ang = k * 6.283 / n + t * 1.6, r = L * (0.28 + 0.14 * ph); x = Math.cos(ang) * r; y = Math.sin(ang) * r; }
    else { x = Math.sin(k * 2.3 + t * 2.2) * L * 0.16; y = 3 - L * (0.25 + 0.8 * ph); }
    g.globalAlpha = a; g.fillStyle = k % 2 && G0.c2 ? G0.c2 : G0.c; g.fillRect(x - 1, y - 1, 2, 2);
    g.globalAlpha = a * 0.9; g.fillStyle = '#fff6d8'; g.fillRect(x - 0.5, y - 0.5, 1, 1);
  }
  g.restore();
}
function drawDollWeapon(g, pl, feet, bob) {
  const w = G.P.equip.weapon, b = w && BASE_BY_ID[w.base]; if (!b) return;
  const wc = b.cls, ic = dollIcon(b, 64); if (!ic) return;
  const L = { sword: 34, axe: 36, katana: 38, dagger: 24, bow: 38, wand: 26, staff: 44 }[wc] || 32;   // 圖示裡武器佔滿整個高度，L＝武器長度
  const acting = pl.act > -0.15, f = pl.facing, enh = w.enh || 0;
  const hand = heroOn() ? HERO_HAND[G.P.cls] || [8, 20] : [8, 15];
  const handX = pl.x + f * hand[0], handY = feet - hand[1] + bob;
  let rot = acting ? pl.aim + Math.PI / 2 : f * 0.22;
  if (pl.swing > 0 && !['bow', 'staff', 'wand'].includes(wc)) rot += (pl.swing / 0.18 - 0.5) * 2.2 * f;
  g.save(); g.translate(handX, handY);
  if (wc === 'bow') { g.rotate(acting ? pl.aim : 0); g.imageSmoothingEnabled = true; const ox = acting ? 0 : f * 2, oy = acting ? 0 : -2; drawEnhIcon(g, ic, b.id, enh, -L / 2 + ox, -L / 2 + oy, L); g.translate(ox, oy); drawEnhSparks(g, enh, L, true); }
  else { g.rotate(rot); g.imageSmoothingEnabled = true; drawEnhIcon(g, ic, b.id, enh, -L / 2, -L + 5, L); drawEnhSparks(g, enh, L, false); }   // 握把在手上，刀刃朝上
  g.restore(); g.imageSmoothingEnabled = false;
}
function drawDollOffhand(g, pl, feet, bob, behind) {
  const o = G.P.equip.offhand, b = o && BASE_BY_ID[o.base]; if (!b) return;
  const f = pl.facing;
  if (b.cls === 'quiver') { if (!behind) return; const ic = dollIcon(b, 64); g.save(); g.translate(pl.x - f * 9, feet - 34 + bob); g.rotate(-f * 0.5); g.imageSmoothingEnabled = true; g.drawImage(ic, -12, -14, 24, 28); g.restore(); }   // 箭袋斜背在背上，從肩膀後面露出來
  else if (behind) return;
  else if (b.cls === 'shield') { const ic = dollIcon(b, 64); g.imageSmoothingEnabled = true; g.drawImage(ic, pl.x - f * 9 - 8, feet - 30 + bob, 16, 16); }
  else { const ic = dollIcon(b, 64), y = feet - 30 + Math.sin(G.time * 3) * 2; g.imageSmoothingEnabled = true; g.drawImage(ic, pl.x - f * 13 - 6, y, 12, 12); }   // 法器浮在手邊
  g.imageSmoothingEnabled = false;
}

// ---------- v2.10 主角：每個職業一張 AI 小人（使用者選 B） ----------
//   身上的盔甲不再跟著裝備變；手上的武器、副手（盾、法器、箭袋）照舊換、照舊畫在手上
//   站著：輕輕呼吸；跑步：上下彈跳＋往前微傾；受擊閃白、冰凍染藍照舊
//   圖在 ARTWORK.img 的 spr_cls_<職業>（assets\art\sprites）；沒有圖就退回原本程式畫的換裝小人
const HERO = { img: {}, cache: new Map(), H: 54 };
// v2.21 換裝：胸甲的階級（第 1～6 階）換一整套外觀 spr_cls_<職業>_t1～t6；沒穿胸甲＝第 1 階；那一階沒圖就用原本那張
if (typeof ARTWORK !== 'undefined') for (const c in DOLL_CLASS) for (const sfx of ['', '_t1', '_t2', '_t3', '_t4', '_t5', '_t6']) {
  const src = ARTWORK.img['spr_cls_' + c + sfx]; if (!src) continue;
  const im = new Image(); im.onload = () => { HERO.img[c + sfx] = im; HERO.cache.clear(); }; im.src = src;
}
const heroOn = () => dollOn() && G.P && !!HERO.img[G.P.cls];
function heroKey(P) {
  const it = P.equip && P.equip.body, b = it && typeof BASE_BY_ID !== 'undefined' && BASE_BY_ID[it.base];
  const k = P.cls + '_t' + (1 + Math.max(0, Math.min(5, b ? b.tier || 0 : 0)));
  return HERO.img[k] ? k : P.cls;
}
function heroFrame(cls, h, flip, fx) {
  const key = `${cls}|${h}|${flip ? 1 : 0}|${fx || ''}`; let c = HERO.cache.get(key); if (c) return c;
  const im = HERO.img[cls], w = Math.max(1, Math.round(im.width * h / im.height));
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  if (flip) { g.translate(w, 0); g.scale(-1, 1); }
  g.drawImage(im, 0, 0, w, h); g.setTransform(1, 0, 0, 1, 0, 0);
  if (fx === 'flash') { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.85; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
  if (fx === 'frozen') { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.45; g.fillStyle = '#bfe8ff'; g.fillRect(0, 0, w, h); }
  if (fx === 'shadow') {   // v2.11 守門人＝過去的你：同一個小人，壓暗成暗影色，邊緣透出紫光
    g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.5; g.fillStyle = '#120a20'; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.16; g.fillStyle = '#7a50e0'; g.fillRect(0, 0, w, h);
    const e = document.createElement('canvas'); e.width = w; e.height = h; const eg = e.getContext('2d');
    eg.shadowColor = 'rgba(150,110,255,0.8)'; eg.shadowBlur = Math.max(2, h * 0.025); eg.drawImage(c, 0, 0);
    c = e;
  }
  if (HERO.cache.size > 60) HERO.cache.clear(); HERO.cache.set(key, c); return c;
}
// 身上有傳奇裝備：人物周圍的橘光（v2.12.2 光暈先做好存起來，每格只貼圖、用透明度做呼吸）
const UNIQ_GLOW = new WeakMap();
function uniqGlow(g, fr, x, y, t) {
  let o = UNIQ_GLOW.get(fr);
  if (!o) {
    const pad = 12, c = document.createElement('canvas'); c.width = fr.width + pad * 2; c.height = fr.height + pad * 2;
    const x2 = c.getContext('2d'); x2.shadowColor = 'rgba(255,150,50,0.9)'; x2.shadowBlur = 5; x2.drawImage(fr, pad, pad);
    x2.shadowBlur = 0; x2.globalCompositeOperation = 'destination-out'; x2.drawImage(fr, pad, pad);   // 只留外面那圈光
    o = { c, pad }; UNIQ_GLOW.set(fr, o);
  }
  g.save(); g.globalAlpha = 0.7 + 0.3 * Math.sin(t * 3); g.drawImage(o.c, x - o.pad, y - o.pad); g.restore();
}
// v2.21 攻擊動作（程式做，不用另外畫圖）：出手的那一段時間（pl.act 從滿倒數到 0）身體跟著動
//   近戰＝先往後蓄力、再往前踏一步揮下去（身體壓扁、前傾），最後收回
//   弓＝拉弓時身體往後仰、放箭那一下往後彈，再回正
//   施法（魔杖、法杖、法術技能）＝先往上提、拉高，放出去的瞬間往前推、壓扁一點
//   數值都在 HERO_ATK；回傳 { dx, dy, rot, sx, sy }（dx 已經乘上面向）
const HERO_ATK = {
  melee: { wind: 0.22, hit: 0.42, back: [-4, -0.12, 1.05], strike: [9, 0.24, 1.13, 0.89] },
  shoot: { draw: 0.62, back: [-4, -0.11, 0.97], kick: [-6.5, -0.06] },
  cast: { rise: 0.4, push: 0.55, up: [-6, 0.94, 1.1], fwd: [5, 1.07, 0.93] },
};
const ease = x => x * x * (3 - 2 * x), lerp = (a, b, k) => a + (b - a) * k;
// v2.21 位移動作（使用者：閃避時人物很僵硬）
//   翻滾（盜賊、弓箭手）＝縮成一團往前滾一圈（繞身體中心轉 360 度）
//   躍擊（戰士）＝起跳前蹲、空中拉長前傾、落地壓扁（跳多高照遊戲原本的 pl.hop）
//   瞬移、一閃（一格內位置跳很遠）＝落點先被拉長變細再彈回來，人淡入
const HERO_DODGE = { roll: { squash: 0.78, low: 7 }, leap: { crouch: 0.12, land: 0.85 }, blink: { time: 0.26 } };
function heroDodgePose(pl) {
  const f = pl.facing < 0 ? -1 : 1;
  const last = pl._hp; pl._hp = { x: pl.x, y: pl.y, w: G.world };
  if (last && last.w === G.world && Math.hypot(pl.x - last.x, pl.y - last.y) > 44 && !pl.leap && !(pl.roll > 0)) pl._tpT = G.time;   // 瞬間移動很遠＝瞬移／一閃
  if (pl.roll > 0 && typeof DODGE !== 'undefined') {
    const p = Math.max(0, Math.min(1, 1 - pl.roll / DODGE.time)), R = HERO_DODGE.roll, k = Math.sin(p * Math.PI);
    return { dx: 0, dy: R.low * k, rot: f * p * Math.PI * 2, sx: 1 + 0.08 * k, sy: 1 - (1 - R.squash) * k, spin: 1 };
  }
  if (pl.leap) {
    const L = pl.leap, p = Math.min(1, L.t / L.dur), D = HERO_DODGE.leap;
    if (p < D.crouch) { const k = p / D.crouch; return { dx: 0, dy: 0, rot: -0.06 * f * k, sx: 1 + 0.12 * k, sy: 1 - 0.18 * k }; }
    if (p < D.land) { const k = (p - D.crouch) / (D.land - D.crouch), s = Math.sin(k * Math.PI); return { dx: 0, dy: 0, rot: (0.1 + 0.22 * k) * f, sx: 1 - 0.1 * s, sy: 1 + 0.14 * s }; }
    const k = (p - D.land) / (1 - D.land); return { dx: 0, dy: 0, rot: 0.32 * f * (1 - k), sx: 1 + 0.18 * k, sy: 1 - 0.2 * k };
  }
  const tp = pl._tpT != null ? (G.time - pl._tpT) / HERO_DODGE.blink.time : 9;
  if (tp >= 0 && tp < 1) { const k = 1 - tp, w = Math.sin(tp * Math.PI * 2.5) * k; return { dx: 0, dy: 0, rot: 0, sx: 1 - 0.35 * k + 0.06 * w, sy: 1 + 0.3 * k - 0.06 * w, alpha: Math.min(1, 0.35 + tp * 1.3) }; }
  return null;
}
function heroAttackPose(pl) {
  const P0 = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 };
  const D = heroDodgePose(pl); if (D) return D;
  if (pl.act > (pl._ha == null ? -1 : pl._ha) + 0.02) pl._haDur = pl.act;   // 剛出手：記住這次出手多長
  pl._ha = pl.act;
  if (!(pl.act > 0) || !(pl._haDur > 0) || pl.stun > 0 || pl.roll > 0 || pl.leap) return P0;
  const p = Math.max(0, Math.min(1, 1 - pl.act / pl._haDur)), f = pl.facing < 0 ? -1 : 1;
  const w = G.P.equip && G.P.equip.weapon, wc = w && BASE_BY_ID[w.base] && BASE_BY_ID[w.base].cls;
  const kind = pl.swing > -0.05 ? 'melee' : wc === 'bow' ? 'shoot' : wc === 'wand' || wc === 'staff' ? 'cast' : pl.swingType ? 'melee' : 'cast';
  if (kind === 'melee') {
    const A = HERO_ATK.melee, [bx, br, bs] = A.back, [sx0, sr, ssx, ssy] = A.strike;
    if (p < A.wind) { const k = ease(p / A.wind); return { dx: bx * k * f, dy: 0, rot: br * k * f, sx: 1, sy: lerp(1, bs, k) }; }
    if (p < A.hit) { const k = ease((p - A.wind) / (A.hit - A.wind)); return { dx: lerp(bx, sx0, k) * f, dy: 0, rot: lerp(br, sr, k) * f, sx: lerp(1, ssx, k), sy: lerp(bs, ssy, k) }; }
    const k = ease((p - A.hit) / (1 - A.hit)); return { dx: lerp(sx0, 0, k) * f, dy: 0, rot: lerp(sr, 0, k) * f, sx: lerp(ssx, 1, k), sy: lerp(ssy, 1, k) };
  }
  if (kind === 'shoot') {
    const A = HERO_ATK.shoot, [bx, br, bs] = A.back, [kx, kr] = A.kick;
    if (p < A.draw) { const k = ease(p / A.draw); return { dx: bx * k * f, dy: 0, rot: br * k * f, sx: 1, sy: lerp(1, bs, k) }; }
    const k = (p - A.draw) / (1 - A.draw), snap = k < 0.25 ? k / 0.25 : 1 - ease((k - 0.25) / 0.75);   // 放箭那一下往後彈，再慢慢回正
    return { dx: lerp(bx, kx, snap) * f * (1 - k * 0.6), dy: 0, rot: lerp(br, kr, snap) * f * (1 - k), sx: 1, sy: lerp(bs, 1, k) };
  }
  const A = HERO_ATK.cast, [uy, usx, usy] = A.up, [fx0, fsx, fsy] = A.fwd;
  if (p < A.rise) { const k = ease(p / A.rise); return { dx: 0, dy: uy * k, rot: 0, sx: lerp(1, usx, k), sy: lerp(1, usy, k) }; }
  if (p < A.push) { const k = ease((p - A.rise) / (A.push - A.rise)); return { dx: fx0 * k * f, dy: lerp(uy, 0, k), rot: 0.05 * k * f, sx: lerp(usx, fsx, k), sy: lerp(usy, fsy, k) }; }
  const k = ease((p - A.push) / (1 - A.push)); return { dx: lerp(fx0, 0, k) * f, dy: 0, rot: lerp(0.05, 0, k) * f, sx: lerp(fsx, 1, k), sy: lerp(fsy, 1, k) };
}
function drawHeroSprite(g, pl, feet, moving, pst) {
  const run = !!moving && !(pl.stun > 0), t = G.time, f = pl.facing < 0 ? -1 : 1;
  const fx = pl.flash > 0 ? 'flash' : pst && pst.frozen ? 'frozen' : '';
  const fr = heroFrame(heroKey(G.P), HERO.H, f < 0, fx);
  const step = run ? Math.sin(t * 15) : 0, bob = run ? -Math.abs(step) * 3 : 0;
  const breathe = run ? 1 : 1 + Math.sin(t * 2.2) * 0.012, tilt = run ? 0.07 * f : 0;
  const A = heroAttackPose(pl);
  g.save(); g.translate(Math.round(A.dx), Math.round(A.dy));   // 攻擊動作：身體、副手、武器一起移
  if (!A.spin) drawDollOffhand(g, pl, feet, bob, true);   // 翻滾時武器、副手先收起來（不然會浮在空中）
  const EQ = G.P.equip, uniq = EQ && Object.keys(EQ).some(k => EQ[k] && EQ[k].rarity === 'unique');
  g.save(); g.translate(Math.round(pl.x), Math.round(feet));
  if (A.spin) { const cy = -fr.height * 0.45; g.translate(0, cy); g.rotate(A.rot); g.scale(A.sx, A.sy); g.translate(0, -cy); }   // 翻滾：繞身體中心轉
  else { g.rotate(tilt + A.rot); g.scale(A.sx, breathe * A.sy); }
  if (A.alpha != null) g.globalAlpha = A.alpha;
  if (uniq && !fx) uniqGlow(g, fr, -fr.width / 2, -fr.height + bob, t);
  g.drawImage(fr, -fr.width / 2, -fr.height + bob);
  g.restore();
  if (!A.spin) { drawDollOffhand(g, pl, feet, bob, false); drawDollWeapon(g, pl, feet, bob); }
  g.restore();
  return { w: fr.width, h: fr.height };
}

// ---------- render.js drawPlayer 呼叫的接口 ----------
function drawPaperDoll(g, pl, feet, bob, moving, pst) {
  if (!dollOn() || !G.P || !DOLL_CLASS[G.P.cls]) return false;
  if (heroOn()) return drawHeroSprite(g, pl, feet, moving, pst);
  const look = dollLook(G.P.cls, G.P.equip);
  const run = !!moving && !(pl.stun > 0);
  const set = run ? 'run' : 'idle', n = run ? 4 : 2;
  const i = Math.floor(G.time * (run ? 9 : 2)) % n;
  const fx = pl.flash > 0 ? 'flash' : pst && pst.frozen ? 'frozen' : '';
  const fr = dollGet(look, set, i, DOLL.S, pl.facing < 0, fx);
  drawDollOffhand(g, pl, feet, 0, true);
  const x = Math.round(pl.x - fr.width / 2), y = Math.round(feet - fr.height + DOLL.S);   // 最下面一格是外框空間
  // 身上有傳奇裝備：人物周圍一圈淡淡的橘光
  const EQ = G.P.equip, uniq = EQ && Object.keys(EQ).some(k => EQ[k] && EQ[k].rarity === 'unique');
  if (uniq && !fx) uniqGlow(g, fr, x, y, G.time);
  g.drawImage(fr, x, y);
  drawDollOffhand(g, pl, feet, 0, false);
  drawDollWeapon(g, pl, feet, 0);
  return { w: fr.width, h: fr.height - DOLL.S * 2 };
}

// ---------- 選角畫面、存檔列表的小人也換成新的（沒穿裝備的樣子） ----------
(function () {
  const prev = getSprite;
  getSprite = function (name, scale = 2, tint = null, flash = false) {
    if (!dollOn() || !DOLL_CLASS[name]) return prev(name, scale, tint, flash);
    if (HERO.img[name]) {   // v2.10 選角畫面、存檔列表也用 AI 小人
      const fx = flash ? 'flash' : tint && typeof tint === 'object' && Object.keys(tint).length ? 'shadow' : '';   // 有染色（守門人）→ 暗影版
      const h = Math.round(27 * scale), r = heroFrame(name, h, false, fx), l = heroFrame(name, h, true, fx);
      return { r, l, w: r.width, h: r.height };
    }
    const s = Math.max(1, Math.round(scale));
    const look = dollLook(name, null), fx = flash ? 'flash' : '';
    const mk = (set, k) => Array.from({ length: k }, (_, i) => ({ r: dollGet(look, set, i, s, false, fx), l: dollGet(look, set, i, s, true, fx) }));
    const idle = mk('idle', 2), run = mk('run', 4);
    return { r: idle[0].r, l: idle[0].l, w: idle[0].r.width, h: idle[0].r.height, anim: true, idle, run, doll: true };
  };
})();
