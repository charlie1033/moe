// =============================================================
//  v2.9.5 立體障礙物（精靈堆疊）
//  ・樹、枯樹、岩石、仙人掌、石柱、冰晶、骨堆、石筍、巨菇、灌木、虛空水晶，不再是一張平面圖，
//    而是 10～28 片「橫切面」從下往上疊，每片往上 1 像素 → 看起來像小方塊做的立體模型
//  ・會跟著鏡頭有一點透視（畫面邊緣的會往外傾），樹和灌木會被風吹得微微搖，冰晶、虛空水晶會慢慢自轉
//  ・每棵樹的朝向隨機（8 個角度），同一種東西不會長得一模一樣
//  ・水、岩漿、裂隙、木橋還是原本平面的畫法
//  ・v2.9.6 角色或怪物走到障礙物正後方：障礙物會擋住他，但在他身上挖一個透明圓，看得到樹後面的人
//  ・設定 → 介面：「立體障礙物」可以關掉，關掉就回到原本的平面圖
//  ・模型是程式算出來的（不吃美術圖），切片第一次用到才做、做完留著
//  資料：CFG.stackProps（false＝關）；地圖上的障礙物仍然是 w.deco（stages.js）
// =============================================================
const StackProps = (() => {
  const VOX = 2, PAD = 23, SZ = PAD * 2;          // 一格小方塊 2 像素；切片畫布 46×46（轉 45 度也放得下）
  const nz = (a, b, c) => { let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const pick = (arr, n) => arr[Math.min(arr.length - 1, Math.floor(n * arr.length))];
  // 每種障礙物：H＝高度（片數），f(u,v,z) 回傳顏色或 null（u,v 是以中心為 0 的方塊座標，z 是第幾片）
  const M = {
    1: { H: 32, sway: 1, f(u, v, z, n) {            // 樹：樹幹＋三團樹冠
      if (z < 15 && u * u + v * v < 2.6) return pick(['#4a3020', '#5a3a26'], n);
      const blob = (cu, cv, cz, r, rz) => ((u - cu) ** 2 + (v - cv) ** 2) / (r * r) + ((z - cz) ** 2) / (rz * rz);
      const d = Math.min(blob(0, 0, 21, 6.6, 8), blob(-2.5, 1.5, 26, 4.4, 5), blob(2, -2, 24, 4.2, 5));
      if (d < 1 - n * 0.18) return pick(['#1e4a22', '#2a6030', '#33703a', '#3e8044'], z / 32 * 0.7 + n * 0.45);
      return null; } },
    12: { H: 24, f(u, v, z, n) {                     // 枯樹：歪的樹幹＋兩根枝
      if (z < 18 && (u - z * 0.06) ** 2 + v * v < 1.9) return pick(['#4a4038', '#5a5048'], n);
      if (z >= 10 && z < 21 && Math.abs(u - (z - 10) * 0.55) < 1 && Math.abs(v - (z - 10) * 0.2) < 1) return '#5a5048';
      if (z >= 13 && z < 23 && Math.abs(u + (z - 13) * 0.5) < 1 && Math.abs(v + (z - 13) * 0.3) < 1) return '#665a50';
      return null; } },
    3: { H: 12, f(u, v, z, n) {                      // 岩石：一大一小兩塊
      const a = (u * u + v * v) / 40 + (z * z) / 120, b = ((u - 4.5) ** 2 + (v + 3) ** 2) / 8 + (z * z) / 25;
      if (Math.min(a, b) < 1 - n * 0.15) return pick(['#5a5a62', '#6a6a72', '#74747c', '#8a8a92'], z / 12 * 0.6 + n * 0.5);
      return null; } },
    4: { H: 24, f(u, v, z, n) {                      // 仙人掌：主幹＋左右兩支手
      const col = (cu, cv, r) => (u - cu) ** 2 + (v - cv) ** 2 < r * r;
      const g = pick(['#2e6a28', '#3a7a30', '#468a38'], n);
      if (col(0, 0, 2.4) && z < 23 - (u * u + v * v > 3 ? 1 : 0)) return (Math.abs(u) < 0.6 && n > 0.6) ? '#9ac080' : g;
      if (z >= 8 && z < 10 && Math.abs(v) < 1.3 && Math.abs(u) < 5) return g;
      if (z >= 8 && z < 17 && col(-4.5, 0, 1.5)) return g;
      if (z >= 9 && z < 15 && col(4.5, 0, 1.5)) return g;
      return null; } },
    5: { H: 26, f(u, v, z, n) {                      // 石柱：底座、柱身、柱頭
      const s = Math.max(Math.abs(u), Math.abs(v));
      if ((z < 3 || z >= 23) && s < 5.8) return z < 3 ? '#6a6476' : '#7a7486';
      if (s < 4.2) return (n > 0.92) ? '#3a3444' : pick(['#5a5464', '#625c6e'], n);
      return null; } },
    6: { H: 26, spin: 0.5, f(u, v, z, n) {           // 冰晶：六角錐，旁邊一根小的
      const hex = (x, y) => Math.max(Math.abs(x), Math.abs(x) * 0.5 + Math.abs(y) * 0.866);
      if (hex(u, v) < 4.6 * (1 - z / 26)) return pick(['#7ac0f0', '#9ad8ff', '#c8ecff'], n * 0.6 + z / 26 * 0.5);
      if (z < 14 && hex(u - 5, v - 2) < 2.4 * (1 - z / 14)) return '#d8f4ff';
      return null; } },
    7: { H: 11, f(u, v, z, n) {                      // 骨堆：一堆骨頭＋一顆頭骨
      if ((u * u + v * v) / 36 + z * z / 16 < 1 - n * 0.3) return pick(['#b8b098', '#c8c0a8', '#d8d0b8'], n);
      const sk = (u + 1) ** 2 + (v - 1) ** 2 + (z - 6) ** 2;
      if (sk < 12) return (sk > 6 && v > 2.5 && z > 5 && z < 8 && Math.abs(Math.abs(u + 1) - 1.3) < 0.8) ? '#2a2420' : '#e0d8c0';
      return null; } },
    9: { H: 24, f(u, v, z, n) {                      // 石筍：一大一小兩根
      if (u * u + v * v < (5.5 * (1 - z / 24)) ** 2) return pick(['#5a4a3a', '#6a5a48', '#86745e'], n * 0.6 + z / 24 * 0.5);
      if (z < 13 && (u - 4.5) ** 2 + (v - 3) ** 2 < (2.6 * (1 - z / 13)) ** 2) return '#86745e';
      return null; } },
    10: { H: 26, sway: 0.4, f(u, v, z, n) {          // 巨菇：白柄＋紫色傘蓋＋白點
      if (z < 20 && u * u + v * v < 3.2) return z < 2 ? "#b8b098" : "#d8d0b8";
      const rz = (z - 18) / 8;
      if (z >= 18 && u * u + v * v < 34 * (1 - rz * rz * rz)) return (n > 0.86 && z > 20) ? "#e8c8ff" : pick(['#6a3a88', '#8a4aa8', '#9a5ab8'], z / 26 * 0.8 + n * 0.3);
      return null; } },
    11: { H: 13, sway: 0.7, f(u, v, z, n) {          // 灌木：三團葉子
      const b = (cu, cv, cz, r) => ((u - cu) ** 2 + (v - cv) ** 2 + ((z - cz) * 1.2) ** 2) / (r * r);
      if (Math.min(b(-3, 1, 4, 5), b(3, 1, 4, 5), b(0, -2, 7, 5.5)) < 1 - n * 0.2) return pick(['#3a6a2a', '#46782e', '#56883a'], z / 13 * 0.6 + n * 0.5);
      return null; } },
    13: { H: 26, spin: 0.8, float: 1, f(u, v, z, n) { // 虛空水晶：浮著的八面體
      const d = Math.max(Math.abs(u), Math.abs(v)) / (1 - Math.abs(z - 13) / 13.5);
      if (d < 4.5) return d < 1.8 ? '#e6d2ff' : pick(['#7a50c0', '#a070e0', '#b890f0'], n * 0.5 + z / 26 * 0.5);
      return null; } },
  };
  const ANG_STATIC = 8, ANG_SPIN = 24;
  const cache = {};                                 // `${種類}_${角度}` → 每一片的畫布
  const shade = (hex, k) => { const c = parseInt(hex.slice(1), 16), f = x => Math.max(0, Math.min(255, Math.round(x * k))); return `rgb(${f(c >> 16)},${f((c >> 8) & 255)},${f(c & 255)})`; };
  function build(t, ai, na) {
    const key = t + '_' + ai + '_' + na; if (cache[key]) return cache[key];
    const m = M[t], A = ai / na * Math.PI * 2, cs = Math.cos(A), sn = Math.sin(A), H = m.H;
    // 先算出每個小方塊的顏色（方塊座標，不受旋轉影響，花紋才會跟著轉）
    const R = 12, vox = (x, y, z) => { if (z < 0 || z >= H) return null; return m.f(x, y, z, nz(x + 50, y + 50, z)); };
    const at = {}; const get = (x, y, z) => { const k = x + ',' + y + ',' + z; if (!(k in at)) at[k] = vox(x, y, z); return at[k]; };
    const layers = [];
    for (let z = 0; z < H; z++) {
      const cv = document.createElement('canvas'); cv.width = cv.height = SZ;
      const g = cv.getContext('2d'); let any = false;
      for (let py = 0; py < SZ; py++) for (let px = 0; px < SZ; px++) {
        const dx = (px + 0.5 - PAD) / VOX, dy = (py + 0.5 - PAD) / VOX;
        const u = Math.round(dx * cs + dy * sn), v = Math.round(-dx * sn + dy * cs);
        if (Math.abs(u) > R || Math.abs(v) > R) continue;
        const col = get(u, v, z); if (!col) continue;
        // 明暗：越下面越暗；頂面亮；外緣描深色邊
        let k = 0.62 + 0.38 * (z / H);
        if (!get(u, v, z + 1)) k *= 1.18;
        else if (!get(u + 1, v, z) || !get(u - 1, v, z) || !get(u, v + 1, z) || !get(u, v - 1, z)) k *= 0.72;
        g.fillStyle = shade(col, k); g.fillRect(px, py, 1, 1); any = true;
      }
      layers.push(any ? cv : null);
    }
    return (cache[key] = layers);
  }
  const on = () => CFG.stackProps !== false;
  const handles = t => on() && !!M[t];
  function list(w) {
    if (w._stk && w._stk.deco === w.deco) return w._stk.a;
    const a = [];
    if (w.deco) for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      const t = w.deco[y * w.W + x]; if (M[t]) a.push({ x: x * TS + 16, y: y * TS + 24, t, s: hash2(x, y) });
    }
    w._stk = { deco: w.deco, a }; return a;
  }
  // v2.12.1 一個障礙物＝一張疊好的圖（依種類、朝向、傾斜程度分格快取），畫一次就好；以前是每一格把 10～30 片各畫一次
  const LSTEP = 0.04, MX = 14, HMAX = 38, COMP = new Map(), COMP_MAX = 700;
  function comp(t, ai, na, lq) {
    const key = t + '_' + ai + '_' + na + '_' + lq; let c = COMP.get(key);
    if (c) return c;
    const ls = build(t, ai, na); c = document.createElement('canvas'); c.width = SZ + MX * 2; c.height = SZ + HMAX;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    for (let i = 0; i < ls.length; i++) if (ls[i]) g.drawImage(ls[i], MX + Math.round(lq * LSTEP * i), HMAX - i);
    if (COMP.size >= COMP_MAX) COMP.delete(COMP.keys().next().value);   // 太多就丟掉最舊的
    COMP.set(key, c); return c;
  }
  function drawOne(g, o, mx, my, T) {
    const m = M[o.t];
    const na = m.spin ? ANG_SPIN : ANG_STATIC, ai = m.spin ? Math.floor(((T * m.spin / (Math.PI * 2) + (o.s % 97) / 97) % 1) * ANG_SPIN) : o.s % ANG_STATIC;
    // 透視：離畫面中心越遠，往外傾越多；樹和灌木再加一點風吹的搖晃
    const lean = (o.x - mx) / (VW / 2) * 0.28 + (m.sway ? Math.sin(T * 1.4 + o.x * 0.05 + o.y * 0.03) * 0.04 * m.sway : 0);
    const lq = Math.max(-9, Math.min(9, Math.round(lean / LSTEP)));
    const fl = m.float ? Math.sin(T * 2 + o.s) * 2 - 3 : 0;
    g.drawImage(comp(o.t, ai, na, lq), Math.round(o.x - PAD - MX), Math.round(o.y - PAD - HMAX + fl));
  }
  const inView = (o, cam) => !(o.x < cam.x - 40 || o.x > cam.x + VW + 40 || o.y < cam.y - 10 || o.y > cam.y + VH + 50);
  function draw(g) {
    const w = G.world; if (!on() || !w || !w.deco) return;
    const cam = G.cam, mx = cam.x + VW / 2, my = cam.y + VH / 2, T = G.time;
    g.save(); g.imageSmoothingEnabled = false;
    for (const o of list(w)) {
      if (!inView(o, cam)) continue;
      g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(o.x, o.y + 1, 13, 5, 0, 0, Math.PI * 2); g.fill();
      drawOne(g, o, mx, my, T);
    }
    g.restore();
  }
  // 角色、怪物走到障礙物正後方：把擋在前面的障礙物再畫一次蓋上去，
  // 但在被擋住的人身上挖一個透明圓（角色的圓大一點），看得到樹後面的人
  let OV = null;
  const behind = (o, e) => e.y < o.y && o.y - e.y < M[o.t].H + 18 && Math.abs(e.x - o.x) < 24;
  function drawOver(g) {
    const w = G.world; if (!on() || !w || !w.deco || !G.pl) return;
    const cam = G.cam, mx = cam.x + VW / 2, my = cam.y + VH / 2, T = G.time;
    const ents = [G.pl, ...G.mons.filter(m => !m.dead), ...(G.mins || [])];
    const front = [], hid = new Set();
    for (const o of list(w)) {
      if (!inView(o, cam)) continue;
      let any = false; for (const e of ents) if (behind(o, e)) { any = true; hid.add(e); }
      if (any) front.push(o);
    }
    if (!front.length) return;
    if (!OV) { OV = document.createElement('canvas'); OV.width = VW; OV.height = VH; }
    const og = OV.getContext('2d'), ox = Math.round(cam.x), oy = Math.round(cam.y);
    og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, VW, VH); og.imageSmoothingEnabled = false;
    og.translate(-ox, -oy);
    for (const o of front) drawOne(og, o, mx, my, T);
    og.globalCompositeOperation = 'destination-out';
    for (const e of hid) {
      const R = e === G.pl ? 30 : 20, cx = e.x, cy = e.y - (e === G.pl ? 14 : e.r || 10);
      const gr = og.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
      gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      og.fillStyle = gr; og.beginPath(); og.arc(cx, cy, R, 0, Math.PI * 2); og.fill();
    }
    og.globalCompositeOperation = 'source-over';
    g.drawImage(OV, ox, oy);
  }
  return { M, on, handles, draw, drawOver, build };
})();
Hook.on('drawWorld', g => { try { StackProps.draw(g); } catch (e) { } });
Hook.on('drawOver', g => { try { StackProps.drawOver(g); } catch (e) { } });
SettingsRows.add('ui', () => `<div class="prow"><div class="pname">立體障礙物<small>樹、岩石、石柱這些障礙物用一層一層疊起來的方式畫，看起來有立體感；電腦比較慢可以關掉</small></div><div class="pctl"><label class="pswitch"><input type="checkbox" data-stk ${StackProps.on() ? 'checked' : ''}><span></span></label></div></div>`, root => {
  const c = root.querySelector('[data-stk]');
  if (c) c.onchange = () => { CFG.stackProps = c.checked; saveCfg(); if (G.world && G.world.canvas) try { buildWorldCanvas(G.world); } catch (e) { } };
});
