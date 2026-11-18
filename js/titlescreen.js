// =============================================================
//  v2.19.1 開始畫面（遊戲一打開、在角色清單之前）
//  玩家看到：一整片用遊戲引擎即時畫的「夢之門前的營地」，從黃昏慢慢變成夜晚（約 80 秒到最暗，再慢慢回到黃昏）：
//    ・天空：晚霞漸層、慢慢飄的雲、夕陽西沉、星星一顆顆亮起、月亮、偶爾一顆流星；遠景兩層山影（有視差）和一道瀑布
//    ・地面：遊戲自己的地形和水面（水面倒映天空）、立體樹和石柱（stackprops.js）、倒塌的石門／營火／帳篷（chapscenes.js 的布景）、
//      地圖色調、黑暗＋光源（營火、夢之門、帳篷），火星往上飄、螢火蟲、夢之門發光旋轉
//    ・上次玩的角色（角色清單裡最近玩的那個）用遊戲畫角色的同一套函式站在夢之門前，偶爾回頭看營火；沒有角色時是隨機職業的剪影
//    ・左上「夢疑 MOE」標誌（沿用選角畫面的金色牌匾）＋副標，左邊文字選單：繼續（有角色才有）、選擇角色、建立新角色、設定、製作人員；右下版本號
//    ・鏡頭緩慢左右平移；第一次點擊後播營地音樂（music.js 讀 TitleScreen.playing()）
//  規則：「選擇角色」「建立新角色」只是把開始畫面藏起來，露出原本的角色清單（左上多一顆「回到開始畫面」）；
//        進入遊戲（Hook 'start'，含 MOE_DEV.hero）→ 停掉迴圈、丟掉地圖分塊和畫布（destroy）；backToTitle 回來時看到角色清單，可以按左上鈕再打開
//  效能：畫面寬度（邏輯 540 高）只用到 2 塊地圖分塊；每格約 1～3 毫秒；設定頁開著或分頁在背景時不畫。TitleScreen.ms＝最近一格花幾毫秒
//  資料：不存任何東西（只讀角色清單 loadIndex／loadChar）
// =============================================================
const TitleScreen = (() => {
  const LH = 540, HZ = 205, Z = 1.4, CYCLE = 160;
  // 取景用的小地圖（40×9，~ 水、. 地）＋障礙物位置（格式同 chapmaps：T 樹、o 岩石、I 石柱、w 灌木、t 枯樹、m 巨菇；「字母 x,y」）
  const MAP = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~.~~~~~~........~~~~~~~~~~~...~~~~~~',
    '~~~.....................................',
    '........................................',
  ].concat(Array(4).fill('.'.repeat(40)));
  const PROPS = 'T6,3 T20,3 I21,4 I28,3 T30,3 T36,3 T1,4 w4,4 T9,4 w29,4 o37,4 T39,4 o2,5 w8,5 T28,6 t0,6 w13,6 o24,6 w36,6 T39,6 w1,7 m6,7 T10,7 w27,7 T30,8 T3,8 o14,8 w22,8 T37,8 T19,8';
  const SCENES = [{ id: 'ruin', sx: 11, sy: 2 }, { id: 'camp', sx: 16, sy: 5 }, { id: 'tent', sx: 31, sy: 5 }];
  const GATE = { x: 798, y: 124 }, HERO = { x: 712, y: 176 }, FIRE = { x: 16 * 32 + 80, y: 5 * 32 + 46 };
  const DUSK = ['#2a1f4a', '#5a3466', '#b0507a', '#ee8a5e', '#ffc77e'], NIGHT = ['#04050f', '#0b1030', '#1a1c46', '#2c2856', '#3e3460'];
  const rgb = c => [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16)), DR = DUSK.map(rgb), NR = NIGHT.map(rgb);
  const mixA = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k), css = (a, al = 1) => `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${al})`;
  const R = (a, b) => a + Math.random() * (b - a), cl = (v, a, b) => Math.max(a, Math.min(b, v));
  let root = null, cv, g, dk, dg, hc, hg, raf = 0, shown = false, T = 0, last = 0, LW = 960, Q = 1, N = 0, camX = 0, music = false, hot = -1;
  let w = null, P = null, S = null, sil = false, pl = null, gparts = [], fx = [], stars = [], clouds = [], mtn = null, shoot = null, shootAt = 7, waterPath = null, setOpen = false;
  const IMG = {};
  // ---------- 一次做好的小圖 ----------
  function soft(col, inner = 0.35) { const k = 'g' + col + inner; if (IMG[k]) return IMG[k]; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, col); gr.addColorStop(inner, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return (IMG[k] = c); }
  function moon() { if (IMG.moon) return IMG.moon; const c = document.createElement('canvas'); c.width = c.height = 40; const x = c.getContext('2d'); x.fillStyle = '#f4ecd0'; x.beginPath(); x.arc(20, 20, 13, 0, 7); x.fill(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(27, 15, 12, 0, 7); x.fill(); return (IMG.moon = c); }
  function cloud(seed, top, bot) {   // 像素雲：低解析度畫幾團圓再放大 3 倍
    const c = document.createElement('canvas'), W = 70, H = 22; c.width = W; c.height = H; const x = c.getContext('2d'); let s = seed;
    const rr = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const blobs = Array.from({ length: 7 }, (_, i) => [8 + i * 9 + rr() * 6, 13 - rr() * 5 - (i > 1 && i < 5 ? 3 : 0), 5 + rr() * 5]);
    x.fillStyle = bot; for (const [bx, by, br] of blobs) { x.beginPath(); x.arc(bx, by + 2, br, 0, 7); x.fill(); }
    x.fillStyle = top; for (const [bx, by, br] of blobs) { x.beginPath(); x.arc(bx, by - 1, br * 0.82, 0, 7); x.fill(); }
    x.globalCompositeOperation = 'destination-out'; x.fillRect(0, 17, W, 5);
    return c;
  }
  function mountains() {   // 兩層山影（黃昏版、夜晚版各一張，畫的時候交叉淡入）；近的那層有一道瀑布的位置
    const Wd = LW + 260, mk = (top, amp, f, col, rim, seed) => {
      const c = document.createElement('canvas'); c.width = Wd; c.height = HZ + 2; const x = c.getContext('2d'), ys = [];
      for (let i = 0; i <= Wd; i += 3) ys.push(Math.round((top + Math.sin(i * f + seed) * amp + Math.sin(i * f * 2.7 + seed * 3) * amp * 0.45 + Math.sin(i * f * 7.1 + seed) * amp * 0.12) / 2) * 2);
      x.fillStyle = col; x.beginPath(); x.moveTo(0, HZ + 2); ys.forEach((y, k) => { x.lineTo(k * 3, y); x.lineTo(k * 3 + 3, y); }); x.lineTo(Wd, HZ + 2); x.fill();
      if (rim) { x.fillStyle = rim; ys.forEach((y, k) => x.fillRect(k * 3, y, 3, 2)); }
      return { c, ys };
    };
    const far = [mk(HZ - 72, 26, 0.006, '#6e4c7c', 'rgba(255,170,140,0.45)', 1), mk(HZ - 72, 26, 0.006, '#1c1a36', null, 1)];
    const near = [mk(HZ - 38, 18, 0.011, '#3c2a4a', 'rgba(255,140,110,0.5)', 4), mk(HZ - 38, 18, 0.011, '#0d0c1e', null, 4)];
    const fx0 = Math.round(Wd * 0.56 / 3);
    return { far, near, fall: fx0 * 3, fallTop: near[0].ys[fx0] + 4 };
  }
  // ---------- 場景資料 ----------
  function buildWorld() {
    const H = MAP.length, W = MAP[0].length, grid = new Uint8Array(W * H), deco = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const ch = MAP[y][x], i = y * W + x; if (ch === '.') grid[i] = 1; else if (CH_DECO[ch]) deco[i] = CH_DECO[ch]; }
    for (const p of PROPS.split(' ')) { const [x, y] = p.slice(1).split(',').map(Number), i = y * W + x; grid[i] = 0; deco[i] = CH_DECO[p[0]]; }
    for (const s of SCENES) { const d = ChapScenes.S[s.id]; for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) { const i = (s.sy + y) * W + s.sx + x; grid[i] = 1; deco[i] = 0; } }
    const theme = THEMES.find(t => t.id === 'grass') || THEMES[0];
    w = { kind: 'map', title: true, W, H, grid, deco, theme, tier: 1, mlvl: 1, grade: 1, mm: aggMods([]), rooms: [], others: [], name: '開始畫面',
      chap: { key: 'title', evs: [], packs: [], dCells: [], open: true, boss: null, scenes: SCENES.map(s => Object.assign({}, s)) } };
    buildWorldCanvas(w);
    waterPath = new Path2D(); for (let i = 0; i < W * H; i++) if (deco[i] === 2) waterPath.rect((i % W) * TS, ((i / W) | 0) * TS, TS, TS);
  }
  function pickHero() {   // 上次玩的角色（清單裡時間最近的）；沒有就隨機職業剪影
    let c = null; try { c = (loadIndex().chars || []).slice().sort((a, b) => (b.time || 0) - (a.time || 0))[0] || null; } catch (e) { }
    let p = null; if (c) try { p = loadChar(c.id); } catch (e) { }
    sil = !p || !CLASSES[p.cls];
    P = sil ? { cls: (c && CLASSES[c.cls]) ? c.cls : pick(Object.keys(CLASSES)), equip: {}, name: '' } : p;
    P.equip = P.equip || {};
    const wb = P.equip.weapon && BASE_BY_ID[P.equip.weapon.base];
    S = { weapon: { cls: wb ? wb.cls : 'none', hands: wb ? wb.hands : 1 }, poiseT: 0 };
    pl = { x: 100, y: 112, r: 11, facing: 1, act: -1, aim: 0, walk: 0, flash: 0, cd: {}, heal: [], fl: [] };
    return c;
  }
  function makeSky() {
    stars = Array.from({ length: 150 }, () => ({ x: Math.random(), y: R(4, HZ - 40) * (Math.random() < 0.6 ? 0.6 : 1), s: Math.random() < 0.15 ? 2 : 1, th: R(0.12, 0.85), ph: R(0, 6), sp: R(1, 3) }));
    clouds = Array.from({ length: 7 }, (_, i) => ({ x: R(-100, LW + 100), y: R(18, HZ - 90), v: R(3, 9), k: R(2.2, 3.4), d: cloud(i * 977 + 13, '#ffcfae', '#a8607e'), n: cloud(i * 977 + 13, '#1e2040', '#10122a') }));
  }
  // ---------- 每一格 ----------
  const toS = (x, y) => [(x - camX) * Z, HZ + y * Z];
  function withG(fn) {   // 借用遊戲的畫圖函式：這一格暫時把 G 指向開始畫面的場景，畫完馬上還原（同步執行，不影響遊戲本身）
    const sv = { world: G.world, P: G.P, S: G.S, pl: G.pl, time: G.time, cam: G.cam, parts: G.parts, keys: input.keys, joy: input.joy };
    G.world = w; G.P = P; G.S = S; G.pl = null; G.time = T; G.cam = { x: camX, y: 0 }; G.parts = gparts; input.keys = {}; input.joy = null;
    try { fn(); } catch (e) { console.error('[TitleScreen]', e); } finally { Object.assign(G, { world: sv.world, P: sv.P, S: sv.S, pl: sv.pl, time: sv.time, cam: sv.cam, parts: sv.parts }); input.keys = sv.keys; input.joy = sv.joy; }
  }
  function drawSky(dt) {
    const sk = DR.map((d, i) => mixA(d, NR[i], N)), n = 30;
    for (let i = 0; i < n; i++) { const k = i / (n - 1) * 4, j = Math.min(3, k | 0); g.fillStyle = css(mixA(sk[j], sk[j + 1], k - j)); g.fillRect(0, Math.floor(i * HZ / n), LW, Math.ceil(HZ / n) + 1); }
    for (const s of stars) { const a = cl((N - s.th) / 0.15, 0, 1) * (0.65 + 0.35 * Math.sin(T * s.sp + s.ph)); if (a > 0.03) { g.globalAlpha = a; g.fillStyle = '#fff6e0'; g.fillRect(Math.round(s.x * LW), Math.round(s.y), s.s, s.s); } }
    g.globalAlpha = 1;
    const sx = LW * 0.5 - (camX - 220) * 0.05, sy = HZ - 78 + N * 150;   // 夕陽
    if (N < 0.75) { g.globalAlpha = 1 - N / 0.75; g.drawImage(soft('rgba(255,180,110,0.55)', 0.1), sx - 110, sy - 110, 220, 220); g.fillStyle = '#ffdc96'; g.beginPath(); g.arc(sx, sy, 22, 0, 7); g.fill(); g.fillStyle = '#fff0c0'; g.beginPath(); g.arc(sx - 4, sy - 4, 14, 0, 7); g.fill(); g.globalAlpha = 1; }
    const ma = cl((N - 0.3) / 0.3, 0, 1); if (ma > 0) { g.globalAlpha = ma * 0.5; g.drawImage(soft('rgba(200,210,255,0.5)', 0.05), LW * 0.9 - 40, 6, 80, 80); g.globalAlpha = ma; g.drawImage(moon(), Math.round(LW * 0.9 - 20), 26); g.globalAlpha = 1; }
    if (shoot) { shoot.t += dt; const p = shoot.t / 0.9, x = shoot.x + p * 260, y = shoot.y + p * 90; if (p >= 1) shoot = null; else { const gr = g.createLinearGradient(x - 80, y - 28, x, y); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(255,250,230,${0.9 * (1 - p) * cl(N * 1.6, 0.3, 1)})`); g.strokeStyle = gr; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 80, y - 28); g.lineTo(x, y); g.stroke(); } }
    else if ((shootAt -= dt) <= 0) { shoot = { x: R(LW * 0.35, LW * 0.8), y: R(10, 70), t: 0 }; shootAt = R(7, 16); }
    g.imageSmoothingEnabled = false;
    for (const c of clouds) { c.x += c.v * dt; if (c.x > LW + 60) c.x = -c.d.width * c.k - 40; const x = Math.round(c.x - (camX - 220) * 0.1), cw = c.d.width * c.k, ch = c.d.height * c.k; g.globalAlpha = 0.9 * (1 - N * 0.8); g.drawImage(c.d, x, c.y, cw, ch); g.globalAlpha = 0.7 * N; g.drawImage(c.n, x, c.y, cw, ch); }
    g.globalAlpha = 1;
    for (const [L, par] of [[mtn.far, 0.2], [mtn.near, 0.4]]) { const x = -130 - (camX - 220) * par; g.drawImage(L[0].c, x, 0); g.globalAlpha = N; g.drawImage(L[1].c, x, 0); g.globalAlpha = 1; }
    const fxX = -130 - (camX - 220) * 0.4 + mtn.fall;   // 瀑布
    g.fillStyle = `rgba(150,180,230,${0.5 - N * 0.25})`; g.fillRect(fxX, mtn.fallTop, 7, HZ - mtn.fallTop);
    g.fillStyle = `rgba(235,245,255,${0.55 - N * 0.3})`; for (let k = 0; k < 6; k++) { const y = mtn.fallTop + ((T * 40 + k * 23) % (HZ - mtn.fallTop)); g.fillRect(fxX + (k % 3) * 2, y, 2, 6); }
    g.globalAlpha = 0.35 - N * 0.15; g.drawImage(soft('rgba(230,240,255,0.8)', 0.2), fxX - 22, HZ - 18, 50, 26); g.globalAlpha = 1;
  }
  function drawGate(x, y) {   // 夢之門：石框＋會轉的漩渦
    const s = (a, b, c, d, col) => { g.fillStyle = col; g.fillRect(x + a, y + b, c, d); };
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y + 30, 34, 9, 0, 0, 7); g.fill();
    s(-34, -36, 12, 66, '#5e5868'); s(22, -36, 12, 66, '#5e5868'); s(-34, -36, 3, 66, '#7a7486'); s(22, -36, 3, 66, '#7a7486'); s(-38, 26, 20, 6, '#4a4452'); s(18, 26, 20, 6, '#4a4452');
    g.strokeStyle = '#6a6476'; g.lineWidth = 10; g.beginPath(); g.ellipse(x, y - 36, 28, 22, 0, Math.PI, 0); g.stroke(); g.strokeStyle = '#8a8496'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - 39, 30, 24, 0, Math.PI, 0); g.stroke();
    g.save(); g.beginPath(); g.ellipse(x, y - 6, 21, 33, 0, 0, 7); g.clip();
    const gr = g.createRadialGradient(x, y - 6, 2, x, y - 6, 34); gr.addColorStop(0, '#f0e0ff'); gr.addColorStop(0.25, '#9a70f0'); gr.addColorStop(1, '#1a0c3a'); g.fillStyle = gr; g.fillRect(x - 22, y - 40, 44, 68);
    g.globalCompositeOperation = 'lighter'; g.lineWidth = 2;
    for (let k = 0; k < 5; k++) { const a0 = T * 1.6 + k * Math.PI * 2 / 5; g.strokeStyle = k % 2 ? 'rgba(160,200,255,0.5)' : 'rgba(210,160,255,0.55)'; g.beginPath(); for (let i = 0; i < 16; i++) { const r = 3 + i * 1.6, a = a0 + i * 0.32; g.lineTo(x + Math.cos(a) * r, y - 6 + Math.sin(a) * r * 1.55); } g.stroke(); }
    g.restore();
  }
  function drawHero() {
    const flip = (T % 15) > 10.5 ? -1 : 1; pl.facing = flip;
    hg.setTransform(1, 0, 0, 1, 0, 0); hg.clearRect(0, 0, hc.width, hc.height); hg.imageSmoothingEnabled = false;
    drawPlayer(hg, pl);
    if (sil) { hg.globalCompositeOperation = 'source-atop'; hg.fillStyle = 'rgba(12,8,22,0.92)'; hg.fillRect(0, 0, hc.width, hc.height); hg.globalCompositeOperation = 'source-over'; }
    const k = 1.2; g.drawImage(hc, HERO.x - pl.x * k, HERO.y - pl.y * k - 2, hc.width * k, hc.height * k);   // 主角稍微放大一點，站在畫面裡比較顯眼
  }
  function spawn(dt) {
    if (Math.random() < dt * 9) fx.push({ x: FIRE.x + R(-7, 7), y: FIRE.y - 6, vx: R(-8, 8), vy: R(-55, -30), t: 0, dur: R(1.2, 2.4), c: Math.random() < 0.5 ? '#ffb050' : '#ff7a30', s: 2, wob: R(0, 6) });
    if (Math.random() < dt * 7) { const a = R(0, 6.28); fx.push({ x: GATE.x + Math.cos(a) * 30, y: GATE.y - 6 + Math.sin(a) * 40, tx: GATE.x, ty: GATE.y - 6, t: 0, dur: R(0.8, 1.4), c: Math.random() < 0.5 ? '#c8a0ff' : '#90c8ff', s: 2 }); }
    while (fx.filter(p => p.fly).length < 14) fx.push({ fly: 1, x: R(camX, camX + LW / Z), y: R(80, 270), t: 0, dur: 1e9, c: '#d8ff80', s: 2, ph: R(0, 6), vx: R(-8, 8), vy: R(-5, 5) });
    for (const p of fx) { p.t += dt; if (p.fly) { p.vx += R(-20, 20) * dt; p.vy += R(-20, 20) * dt; p.vx = cl(p.vx, -12, 12); p.vy = cl(p.vy, -8, 8); p.x += p.vx * dt; p.y = cl(p.y + p.vy * dt, 70, 280); if (p.x < camX - 20 || p.x > camX + LW / Z + 20) p.t = p.dur; } else if (p.tx) { const k = dt * 2.2; p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; } else { p.x += (p.vx + Math.sin(T * 3 + p.wob) * 10) * dt; p.y += p.vy * dt; } }
    fx = fx.filter(p => p.t < p.dur);
    for (const p of gparts) { p.t += dt; p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; }
    gparts = gparts.filter(p => p.t < p.dur).slice(-80);
  }
  function draw(dt) {
    camX = HERO.x - 0.64 * LW / Z + Math.sin(T * 0.07) * 34;
    const bob = Math.sin(T * 0.23) * 1.5;
    g.setTransform(Q, 0, 0, Q, 0, 0); g.imageSmoothingEnabled = false;
    drawSky(dt);
    const wx0 = Math.max(0, Math.floor(camX)), wx1 = Math.min(w.W * TS, Math.ceil(camX + LW / Z) + 2), vis = (LH - HZ) / Z + 4;
    g.save(); g.beginPath(); g.rect(0, HZ, LW, LH - HZ); g.clip();
    g.setTransform(Q * Z, 0, 0, Q * Z, -camX * Q * Z, (HZ + bob) * Q);
    withG(() => {
      worldDraw(g, w, wx0, 0, wx1, Math.min(w.H * TS, vis));
      // 水面倒映天空（只畫在水的格子上）
      g.save(); g.clip(waterPath); g.setTransform(Q, 0, 0, Q, 0, 0);
      const sk = DR.map((d, i) => mixA(d, NR[i], N));
      for (let i = 0; i < 24; i++) { const k = 4 - i / 23 * 2.6, j = Math.min(3, k | 0); g.fillStyle = css(mixA(sk[j], sk[j + 1], k - j), 0.55 - i * 0.012); g.fillRect(0, HZ + i * 8, LW, 8); }
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 18; k++) { const x = ((k * 173 + T * (6 + k % 4)) % (LW + 60)) - 30, y = HZ + 4 + (k * 29) % 84; g.fillStyle = `rgba(255,220,190,${0.12 + 0.1 * Math.sin(T * 2 + k)})`; g.fillRect(x, y, 10 + k % 3 * 6, 1); }
      for (const [o, col] of [[FIRE, '255,150,60'], [GATE, '170,130,255']]) { const sx = (o.x - camX) * Z; for (let k = 0; k < 8; k++) { g.fillStyle = `rgba(${col},${(0.22 + 0.1 * Math.sin(T * 5 + k)) * (0.4 + N * 0.6)})`; g.fillRect(sx - 8 + Math.sin(T * 3 + k) * 4, HZ + 8 + k * 9, 16 - k, 2); } }
      g.restore();
      StackProps.draw(g);
      ChapScenes.anim(g);
      drawGate(GATE.x, GATE.y);
      drawHero();
    });
    g.restore(); g.setTransform(Q, 0, 0, Q, 0, 0);
    // 黑暗＋光
    dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, LW, LH);
    const dkGr = dg.createLinearGradient(0, HZ, 0, LH); dkGr.addColorStop(0, `rgba(8,6,20,${0.12 + 0.45 * N})`); dkGr.addColorStop(1, `rgba(6,4,14,${0.32 + 0.6 * N})`); dg.fillStyle = dkGr; dg.fillRect(0, HZ, LW, LH - HZ);
    dg.globalCompositeOperation = 'destination-out';
    const fl = 0.94 + 0.06 * Math.sin(T * 11) + 0.03 * Math.sin(T * 23);
    const LIGHTS = [[FIRE, 125 * fl, 0.95, '#ff9a40'], [GATE, 95, 0.8, '#9a70ff'], [{ x: HERO.x, y: HERO.y - 10 }, 55, 0.45, null], [{ x: 31 * 32 + 80, y: 5 * 32 + 78 }, 70, 0.5, '#ffc070'], [{ x: 11 * 32 + 60, y: 2 * 32 + 70 }, 60, 0.35, '#c8a0ff']];
    for (const [o, r, a] of LIGHTS) { const [x, y] = toS(o.x, o.y + bob / Z); dg.globalAlpha = a; dg.drawImage(soft('#000', 0.45), x - r * Z, y - r * Z, r * Z * 2, r * Z * 2); }
    dg.globalAlpha = 1; g.drawImage(dk, 0, 0, LW, LH);
    g.save(); g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
    for (const [o, r, a, c] of LIGHTS) if (c) { const [x, y] = toS(o.x, o.y + bob / Z); g.globalAlpha = a * (0.3 + 0.35 * N); g.drawImage(soft(c), x - r * Z, y - r * Z * 0.75, r * Z * 2, r * Z * 1.5); }
    g.setTransform(Q * Z, 0, 0, Q * Z, -camX * Q * Z, (HZ + bob) * Q); g.imageSmoothingEnabled = false;
    for (const p of fx.concat(gparts)) { const k = p.fly ? (0.4 + 0.6 * Math.max(0, Math.sin(T * 2.4 + p.ph))) * (0.25 + 0.75 * N) : 1 - p.t / p.dur; if (k <= 0.02) continue; g.globalAlpha = k; g.fillStyle = p.c || p.color; g.fillRect(Math.round(p.x), Math.round(p.y), p.s || 2, p.s || 2); }
    g.restore();
    const hz = g.createLinearGradient(0, HZ - 6, 0, HZ + 34), hc0 = mixA(mixA(DR[4], NR[4], N), [255, 255, 255], 0.1);   // 地平線的霧
    hz.addColorStop(0, css(hc0, 0)); hz.addColorStop(0.25, css(hc0, 0.45 - N * 0.2)); hz.addColorStop(1, css(hc0, 0)); g.fillStyle = hz; g.fillRect(0, HZ - 6, LW, 40);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (G.state === 'play') return destroy();
    if (!shown || (typeof Pause !== 'undefined' && Pause.open) || document.hidden || (IS_TOUCH && innerHeight > innerWidth)) return;   // 手機直向時蓋著「請轉成橫向」，不用畫
    T += dt; N = 0.5 - 0.5 * Math.cos(T * Math.PI * 2 / CYCLE);
    const t0 = performance.now(); spawn(dt); draw(dt); api.ms = performance.now() - t0; api.frames++;
  }
  function resize() {
    if (!cv) return;
    const vw = Math.max(1, root.clientWidth || innerWidth), vh = Math.max(1, root.clientHeight || innerHeight);
    const nl = Math.max(640, Math.round(LH * vw / vh)); Q = Math.min(2, vh * (devicePixelRatio || 1) / LH);
    cv.width = Math.round(nl * Q); cv.height = Math.round(LH * Q);
    if (nl !== LW || !mtn) { LW = nl; mtn = mountains(); dk.width = LW; dk.height = LH; }
  }
  // ---------- 畫面（DOM） ----------
  const ver = () => { try { return JSON.parse(document.getElementById('bootList').textContent).v; } catch (e) { return ''; } };
  function menuHTML(c) {
    const sub = c ? `${c.name}　${CLASSES[c.cls] ? CLASSES[c.cls].name : ''}　等級 ${c.lvl}　最深第 ${c.maxTier || 1} 夜` : '';
    return (c ? `<button data-ts="cont">繼續<small>${sub}</small></button>` : '') + '<button data-ts="chars">選擇角色</button><button data-ts="new">建立新角色</button><button data-ts="set">設定</button><button data-ts="cred">製作人員</button>';
  }
  function build() {
    root = document.getElementById('title');
    if (!root) { root = document.createElement('div'); root.id = 'title'; document.body.appendChild(root); }
    root.innerHTML = `<canvas id="tsCv"></canvas><div class="ts-shade"></div><div class="ts-left"><div class="tp-wrap ts-logo"><div class="tplaque"></div><div class="title">夢疑 <span class="title-en"><i>M</i><i>O</i><i>E</i></span></div></div>
      <div class="ts-sub">一次又一次入夢，直到你想起怎麼醒來</div><nav class="ts-menu"></nav></div><div class="ts-ver">v${ver()}</div>
      <div class="ts-cred"><div class="ts-card"><div class="ts-ct">夢疑 MOE</div><div class="ts-cv">版本 v${ver()}</div>
      <p><b>企劃</b>使用者</p><p><b>程式與美術協作</b>Claude</p><p><b>美術生成</b>Higgsfield</p><p><b>背景音樂、音效</b>遊戲內即時合成</p>
      <p><b>像素素材</b>（皆為 CC0 公眾領域，謝謝作者們）<br>0x72 DungeonTileset II（作者 0x72）<br>Dungeon Crawl Stone Soup 圖塊<br>Animated Wild Animals（作者 ScratchIO）</p>
      <button data-ts="credx">關閉</button></div></div>`;
    cv = root.querySelector('#tsCv'); g = cv.getContext('2d');
    dk = document.createElement('canvas'); dg = dk.getContext('2d');
    hc = document.createElement('canvas'); hc.width = 200; hc.height = 150; hg = hc.getContext('2d');
    if (!root._ts) { root._ts = 1;   // 開始畫面關掉再打開時，root 還是同一個：事件只接一次
    root.addEventListener('click', e => { const b = e.target.closest('[data-ts]'); if (b) act(b.dataset.ts); else if (e.target.closest('.ts-cred') && !e.target.closest('.ts-card')) act('credx'); });
    root.addEventListener('pointerdown', () => { if (!music && typeof Sfx !== 'undefined') { try { Sfx.init(); music = true; } catch (e) { } } });
    root.addEventListener('pointerover', e => { const b = e.target.closest('.ts-menu button'); if (b) setHot([...root.querySelectorAll('.ts-menu button')].indexOf(b)); });
    }
    if (!document.getElementById('tsBack')) { const m = document.getElementById('menu'), b = document.createElement('button'); b.id = 'tsBack'; b.textContent = '◂ 回到開始畫面'; b.onclick = () => open(); if (m) m.appendChild(b); }
    addEventListener('resize', resize);
  }
  function setHot(i) { const bs = root.querySelectorAll('.ts-menu button'); hot = (i + bs.length) % bs.length; bs.forEach((b, k) => b.classList.toggle('hot', k === hot)); }
  function act(a) {
    if (typeof Sfx !== 'undefined') try { Sfx.play('click'); } catch (e) { }
    if (a === 'cont') { const c = api.last; const p = c && loadChar(c.id); if (!p) return act('chars'); try { FileSave.ensure(); } catch (e) { } return startGame(p, c.id); }
    if (a === 'chars' || a === 'new') { hide(); UI.buildMenu(); document.getElementById('menu').classList.add('show'); if (a === 'new') setTimeout(() => { const el = document.querySelector('#menu .classes'); if (el) el.scrollIntoView({ block: 'center' }); }, 30); return; }
    if (a === 'set') { setOpen = true; Pause.open = true; Pause.view = 'settings'; Pause.waitKey = null; Pause.render(); return; }
    if (a === 'cred') return root.classList.add('cred');
    if (a === 'credx') return root.classList.remove('cred');
  }
  // 設定頁本來只能在遊戲中打開：「返回」和 Esc 原本會回到暫停畫面（要有角色），在開始畫面改成直接關掉
  const closeSet = () => { setOpen = false; Pause.hide(); };
  document.addEventListener('click', e => { if (setOpen && Pause.open && e.target.closest && e.target.closest('#pause [data-p="back"]')) { e.stopPropagation(); e.preventDefault(); closeSet(); } }, true);
  addEventListener('keydown', e => {
    if (setOpen && Pause.open) { if (e.code === 'Escape' && !Pause.waitKey) { e.stopPropagation(); e.preventDefault(); closeSet(); } return; }
    if (!shown || !root) return;
    if (e.code === 'Escape' && root.classList.contains('cred')) return act('credx');
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') { e.preventDefault(); setHot(hot + (e.code === 'ArrowDown' ? 1 : -1)); }
    else if ((e.code === 'Enter' || e.code === 'Space') && hot >= 0) { e.preventDefault(); const b = root.querySelectorAll('.ts-menu button')[hot]; if (b) act(b.dataset.ts); }
  }, true);
  function open() {
    if (typeof G !== 'undefined' && G.state === 'play') return;
    if (!root || !cv) build();
    if (!w) { buildWorld(); makeSky(); }
    api.last = pickHero();
    root.querySelector('.ts-menu').innerHTML = menuHTML(api.last); hot = -1;
    root.classList.add('show'); root.classList.remove('cred'); shown = true; resize();
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }
  function hide() { shown = false; if (root) root.classList.remove('show'); if (raf) cancelAnimationFrame(raf); raf = 0; }
  function destroy() {   // 進遊戲：停掉迴圈、丟掉地圖分塊和所有畫布
    hide(); if (w) { try { worldDropChunks(w); } catch (e) { } } w = null; P = S = pl = null; fx = []; gparts = []; mtn = null; waterPath = null;
    if (root) { root.innerHTML = ''; } removeEventListener('resize', resize); cv = g = dk = dg = hc = hg = null; for (const k in IMG) delete IMG[k];
  }
  const api = { ms: 0, frames: 0, last: null, open, hide, destroy, seek: t => { T = t; }, get shown() { return shown; }, get alive() { return !!raf; }, playing: () => shown && music && G.state !== 'play' };
  return api;
})();
Hook.on('start', () => TitleScreen.destroy());
(function wait() {   // main.js 打開角色清單之後再蓋上開始畫面
  const m = document.getElementById('menu');
  if (m && m.classList.contains('show') && typeof UI !== 'undefined') { if (G.state !== 'play') TitleScreen.open(); }
  else if (G.state !== 'play') setTimeout(wait, 60);
})();
