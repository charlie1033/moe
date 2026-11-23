// =============================================================
//  v2.19.2 開始畫面（遊戲一打開、在角色清單之前）
//  玩家看到：拉近的一堆營火，六個職業的主角圍坐在火邊，像一張像素插畫
//    ・營火：AI 畫的營火（ARTWORK ev_campfire：石圈、木柴、紫色夢煙，整張微微伸縮）＋疊上即時的像素火（經典火焰演算法，
//      暗紅→橘→黃→白，火舌會跳）、火星往上飄、煙往右飄
//    ・火光把附近照成暖橘色，往外漸暗成深藍黑的夜；上方一點點星星；四周是樹和石頭的暗影（stackprops.js 的立體樹）
//    ・地面：遊戲的地板貼圖（getFloorTile 金色草原）＋火堆周圍一圈泥土
//    ・六個人用遊戲畫角色的同一套函式（drawPlayer），坐在地上（腿那段壓扁成 1/3 往前伸＝屈膝坐），身體朝火：朝火那側亮、背側暗；
//      最前面兩個是背對鏡頭的剪影（邊緣一圈火光）。有存檔時用玩家各職業最近玩的角色（裝備外觀），
//      最近玩的那個坐在火堆右邊最顯眼的位置；沒有的職業用預設外觀
//    ・小動作：大家會呼吸；左邊的人每 8～13 秒往前傾、往火裡丟一根柴（火星噴一下、火變大）；
//      召喚師外側趴著一隻白色靈狼（遊戲的狼圖用 tint.G 染白，同營地的大白），身體跟著呼吸起伏
//    ・左上「夢疑 MOE」標誌＋副標，左邊文字選單：繼續（有角色才有）、選擇角色、建立新角色、設定、製作人員；右下版本號
//    ・第一次點擊後播營地音樂（music.js 讀 TitleScreen.playing()）
//  規則：「選擇角色」「建立新角色」只是把開始畫面藏起來，各自打開選角畫面的那一頁（槽位清單／建立新角色；左上多一顆「回到開始畫面」）；
//        進入遊戲（Hook 'start'，含 MOE_DEV.hero）→ 停掉迴圈、丟掉畫布（destroy）；backToTitle 回來時看到角色清單，可以按左上鈕再打開
//  畫法：整個畫面畫在 300 列高的小畫布上（1 個世界像素＝2 格），瀏覽器用像素放大貼滿螢幕；地面和樹只在換尺寸時畫一次
//        火堆固定在畫面右邊（距右邊約 0.62 個畫面高、至少 62% 寬），手機橫向也不會被左邊選單蓋到
//  效能：每格約 0.5～1 毫秒；設定頁開著、分頁在背景、手機直向時不畫。TitleScreen.ms＝最近一格花幾毫秒
//  資料：不存任何東西（只讀角色清單 loadIndex／loadChar）。測試用：TitleScreen.tick(dt) 手動畫一格、TitleScreen.state() 看誰坐哪、丟柴進度
// =============================================================
const TitleScreen = (() => {
  const ROWS = 300, Z = 2, LEG = 22, SW = 80, SH = 82, CUT = 58;
  const ORDER = ['warrior', 'samurai', 'ranger', 'druid', 'mage', 'summoner'];
  // 座位（世界像素，火堆底部中心＝0,0；y＝坐的那根木頭）；f＝面向（1 右、-1 左）；sil＝背對鏡頭的剪影（y 依畫面底邊算）
  const SEATS = { R: { x: 64, y: 8, f: -1 }, BL: { x: -31, y: -27, f: 1 }, BR: { x: 33, y: -29, f: -1 }, L: { x: -64, y: 6, f: 1, toss: 1 }, FL: { x: -44, f: 1, sil: 1 }, FR: { x: 46, f: -1, sil: 1 } };
  // 周圍的樹和石頭（格子座標，火堆在 (12, 8)；字母同 chapmaps：T 樹、o 岩石、w 灌木、t 枯樹）
  const PROPS = 'T3,5 T5,4 T7,5 T9,4 w10,5 T15,4 T17,5 o15,6 T18,7 T18,9 w16,10 T4,10 T6,11 o8,9 t2,7';
  const OX = 12 * 32, OY = 8 * 32;
  const FC = ['#5a160a', '#8e240e', '#c63a12', '#ea5e18', '#f88624', '#ffa83a', '#ffc858', '#ffe08a', '#fff2c4'], FCR = FC.map(c => [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16))), FW = 40, FH = 56;
  const R = (a, b) => a + Math.random() * (b - a), cl = (v, a, b) => Math.max(a, Math.min(b, v));
  let root = null, cv, g, raf = 0, shown = false, T = 0, last = 0, CW = 640, CH = 340, FX = 420, FY = 204, BOT = 68, music = false, hot = -1, setOpen = false;
  let cast = [], fw = null, ground = null, trees = null, stars = [], fAcc = 0, sparks = [], smoke = [], toss = null, tossAt = 4, flare = 0, fk = 1;
  const IMG = {}, art = k => { if (IMG[k] !== undefined) return IMG[k]; const s = typeof ARTWORK !== 'undefined' && ARTWORK.img[k]; if (!s) return (IMG[k] = null); const im = new Image(); im.src = s; return (IMG[k] = im); };
  // v2.19.3 插畫背景（Gemini 畫的兩張，每次開遊戲隨機一張）：插畫用 <img> 鋪滿（object-fit:cover、object-position 70% 50%），
  //   畫布變透明、只在上面疊會動的東西：火光閃爍、火星往上飄、螢火蟲。圖載不到時照舊用程式畫的營火場景
  //   fx、fy＝火堆在圖上的位置（0～1）；fw＝火堆大約佔圖寬的比例（決定火星的大小）
  const ARTS = [{ src: 'img/title_a.jpg', fx: 0.645, fy: 0.705, fw: 0.15 }, { src: 'img/title_b.jpg', fx: 0.655, fy: 0.6, fw: 0.13 }];
  let artI = null, artOn = false, flies = [];
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const TMP = canvas(SW * Z, LEG * Z);
  const heat = new Float32Array(FW * FH), fcv = canvas(FW, FH), fimg = fcv.getContext('2d').createImageData(FW, FH);
  // ---------- 借用遊戲的畫圖函式：暫時把 G 指向開始畫面的東西，畫完馬上還原（同步執行，不影響遊戲本身） ----------
  function withG(c, fn) {
    const sv = { world: G.world, P: G.P, S: G.S, pl: G.pl, time: G.time, cam: G.cam, keys: input.keys, joy: input.joy, stk: CFG.stackProps };
    G.world = fw; G.P = c ? c.P : null; G.S = c ? c.S : null; G.pl = null; G.time = T + (c ? c.ph : 0); G.cam = { x: OX - FX / Z, y: OY - FY / Z }; input.keys = {}; input.joy = null; CFG.stackProps = true;
    try { fn(); } catch (e) { console.error('[TitleScreen]', e); } finally { Object.assign(G, { world: sv.world, P: sv.P, S: sv.S, pl: sv.pl, time: sv.time, cam: sv.cam }); input.keys = sv.keys; input.joy = sv.joy; CFG.stackProps = sv.stk; }
  }
  function buildWorld() {   // 只給立體樹用的小世界（沒有地圖分塊）
    const W = 24, H = 14, deco = new Uint8Array(W * H);
    for (const p of PROPS.split(' ')) { const [x, y] = p.slice(1).split(',').map(Number); deco[y * W + x] = CH_DECO[p[0]]; }
    fw = { kind: 'map', title: true, W, H, deco, grid: new Uint8Array(W * H).fill(1), theme: THEMES.find(t => t.id === 'grass') || THEMES[0], tier: 1, mlvl: 1, rooms: [], others: [], name: '開始畫面' };
  }
  // ---------- 誰坐哪裡 ----------
  function pickCast() {
    let list = []; try { list = (loadIndex().chars || []).slice().sort((a, b) => (b.time || 0) - (a.time || 0)); } catch (e) { }
    const by = {}; for (const c of list) if (CLASSES[c.cls] && !by[c.cls]) by[c.cls] = c;
    const cls = ORDER.filter(k => CLASSES[k]), hero = list[0] && CLASSES[list[0].cls] ? list[0].cls : pick(cls);
    const rest = cls.filter(k => k !== hero && k !== 'summoner').sort((a, b) => (by[b] ? by[b].time || 1 : 0) - (by[a] ? by[a].time || 1 : 0)), seatOf = { [hero]: 'R' };
    if (hero !== 'summoner' && cls.includes('summoner')) seatOf.summoner = 'BR';
    const free = ['BL', 'L', 'FR', 'FL', 'BR'].filter(s => !Object.values(seatOf).includes(s));
    rest.forEach((k, i) => { if (free[i]) seatOf[k] = free[i]; });
    cast = Object.keys(seatOf).map(k => {
      let p = null; if (by[k]) try { p = loadChar(by[k].id); } catch (e) { }
      if (!p || p.cls !== k) p = { cls: k, equip: {}, name: '' }; p.equip = p.equip || {};
      const wb = p.equip.weapon && BASE_BY_ID[p.equip.weapon.base], s = SEATS[seatOf[k]];
      return { P: p, S: { weapon: { cls: wb ? wb.cls : 'none', hands: wb ? wb.hands : 1 }, poiseT: 0 }, seat: s, ph: R(0, 9), a: canvas(SW * Z, SH * Z), b: s.sil ? canvas(SW * Z, SH * Z) : null,
        pl: { x: SW / 2, y: CUT + LEG - 8.8, r: 11, facing: s.f, act: -1, aim: 0, walk: 0, flash: 0, cd: {}, heal: [], fl: [] }, pet: k === 'summoner' && !s.sil };
    });
    return list[0] || null;
  }
  // ---------- 光：朝火那側暖亮、背側暗（在每個人自己的小畫布上，用 source-atop 只染到人身上） ----------
  function light(x, w, h, wx, wy) {
    const dx = -wx, dy = -10 - wy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, cx = w / 2, cy = h * 0.55, L = w * 0.3;
    const amb = cl((d - 30) / 170, 0.08, 0.4), gr = x.createLinearGradient(cx - ux * L, cy - uy * L, cx + ux * L, cy + uy * L), gw = x.createLinearGradient(cx - ux * L, cy - uy * L, cx + ux * L, cy + uy * L);
    gr.addColorStop(0, `rgba(8,7,26,${amb + 0.5})`); gr.addColorStop(0.55, `rgba(8,7,26,${amb})`); gr.addColorStop(1, `rgba(8,7,26,${amb * 0.2})`);
    gw.addColorStop(0, 'rgba(255,140,60,0)'); gw.addColorStop(0.45, 'rgba(255,140,60,0.03)'); gw.addColorStop(1, `rgba(255,150,70,${0.44 * fk})`);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = gw; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
  }
  function paintSeat(c) {
    const s = c.seat, x = c.a.getContext('2d'), W = c.a.width, H = c.a.height, f = s.f;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); x.imageSmoothingEnabled = false; x.setTransform(Z, 0, 0, Z, 0, 0);
    withG(c, () => drawPlayer(x, c.pl));
    // 坐在地上：把腿（腰以下那段）壓扁成 1/3 高、往前伸，看起來像盤腿／屈膝坐著
    const t = TMP.getContext('2d'); t.clearRect(0, 0, TMP.width, TMP.height); t.drawImage(c.a, 0, CUT * Z, W, LEG * Z, 0, 0, W, LEG * Z);
    x.clearRect(0, CUT, SW, SH);
    if (!s.sil) { x.save(); x.setTransform(Z, 0, 0, Z, 0, 0); x.drawImage(TMP, 0, 0, W, LEG * Z, f * 4 - SW * 0.06, CUT - 1, SW * 1.12, LEG * 0.36);
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(10,8,20,0.3)'; x.fillRect(0, CUT + 2, SW, 8); x.restore(); }
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (!s.sil) return light(x, W, H, s.x, s.y - 20);
    const y = c.b.getContext('2d'); y.clearRect(0, 0, W, H); y.drawImage(c.a, 0, 0);   // 剪影：深色本體＋往火那邊偏一點的橘色邊
    y.globalCompositeOperation = 'source-atop'; y.fillStyle = `rgba(255,150,64,${0.75 * fk})`; y.fillRect(0, 0, W, H); y.globalCompositeOperation = 'source-over';
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#0b0911'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
  }
  const shadowAt = (x, y, rx, ry, a) => { g.fillStyle = `rgba(6,4,10,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
  function drawSeat(c) {
    const s = c.seat; let dx = 0, dy = 0;
    if (s.toss && toss) { const k = toss.t < 0.35 ? toss.t / 0.35 : toss.t > 0.9 ? Math.max(0, 1 - (toss.t - 0.9) / 0.5) : 1; dx = Math.round(3 * k) * s.f; dy = Math.round(k); }
    if (c.pet) drawPet(c);
    paintSeat(c);
    const X = s.x - SW / 2 + dx, Y = s.y + 3 - CUT + dy;
    if (!s.sil) shadowAt(s.x + s.f * 3, s.y + 6, 16, 4, 0.45);
    if (c.b) g.drawImage(c.b, X + Math.sign(-s.x), Y - 1, SW, SH);
    g.drawImage(c.a, X, Y, SW, SH);
  }
  // 召喚師的靈狼：白色的狼（遊戲的狼圖染白，同營地的「大白」），趴在召喚師外側（腳藏在草裡），呼吸時微微起伏、身上一層淡淡的藍光
  function drawPet(c) {
    const s = c.seat, sp = typeof getSprite === 'function' && getSprite('wolf', 2, { G: '#f2f2f2', B: '#e0e0e0' }); if (!sp || !sp.r) return;
    const im = s.f < 0 ? sp.l : sp.r, k = 0.44, w = sp.w * k, h = sp.h * k, PW = 40, PH = 16;
    if (!c.p) c.p = canvas(PW * Z, PH * Z);
    const x = c.p.getContext('2d'), br = Math.sin((T + c.ph) * 1.6) * 0.4;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.p.width, c.p.height); x.setTransform(Z, 0, 0, Z, 0, 0); x.imageSmoothingEnabled = true;
    x.drawImage(im, PW / 2 - w / 2, PH + h * 0.3 - h - br, w, h + br);
    x.setTransform(1, 0, 0, 1, 0, 0);
    const px = s.x - s.f * 28, py = s.y + 4;
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(30,36,70,0.25)'; x.fillRect(0, 0, c.p.width, c.p.height); x.globalCompositeOperation = 'source-over';
    light(x, c.p.width, c.p.height, px, py - 8);
    shadowAt(px, py, 15, 3, 0.45);
    g.drawImage(c.p, px - PW / 2, py - PH, PW, PH);
  }
  // ---------- 營火 ----------
  function fireBase() {   // AI 畫的營火（營地那堆：石圈、木柴、橘火、往上冒的紫色夢煙），整張微微上下伸縮，像火在跳
    const im = art('ev_campfire');
    if (im && im.width) { const w = 48, h = im.height * w / im.width, fl = 1 + Math.sin(T * 9) * 0.02 + Math.sin(T * 23) * 0.01;
      g.save(); g.imageSmoothingEnabled = true; g.translate(0, 17); g.scale(1, fl); g.drawImage(im, -w / 2, -h, w, h); g.restore(); }
    else { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.fillStyle = '#6a6a70'; g.fillRect(Math.round(Math.cos(a) * 18) - 3, Math.round(Math.sin(a) * 8) - 3, 6, 5); } g.fillStyle = '#4a2a14'; g.fillRect(-12, -4, 24, 4); }
    g.fillStyle = `rgba(255,${110 + Math.round(40 * Math.sin(T * 7))},40,${0.55 * fk})`;   // 木柴縫裡的炭火
    for (let i = 0; i < 6; i++) if (Math.sin(T * 5 + i * 2.1) > -0.2) g.fillRect(-9 + i * 3.5, -2 + (i % 2), 1.5, 1);
  }
  function spawn(dt) {
    for (fAcc += dt; fAcc > 1 / 40; fAcc -= 1 / 40) fireStep();
    if (Math.random() < dt * 8) sparks.push({ x: R(-5, 5), y: R(-16, -8), vx: R(-8, 8), vy: -R(28, 52), t: 0, d: R(1.2, 2.6), ph: R(0, 6) });
    if (Math.random() < dt * 5) smoke.push({ x: R(-3, 3), y: -24 - 8 * flare, vx: R(2, 6), vy: -R(8, 13), t: 0, d: R(2.6, 4.2), s: R(2, 3) });
    for (const p of sparks) { p.t += dt; p.x += (p.vx + Math.sin(T * 4 + p.ph) * 10) * dt; p.y += p.vy * dt; p.vy *= 1 - dt * 0.3; }
    for (const p of smoke) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.s += dt * 3; }
    sparks = sparks.filter(p => p.t < p.d); smoke = smoke.filter(p => p.t < p.d);
    // 丟柴：左邊的人往前傾 → 柴飛進火裡 → 火星噴一下、火變大
    if (toss) {
      toss.t += dt;
      if (toss.t >= 0.85 && !toss.hit) { toss.hit = 1; flare = 1; for (let i = 0; i < 26; i++) sparks.push({ x: R(-6, 6), y: R(-12, -4), vx: R(-22, 22), vy: -R(40, 85), t: 0, d: R(0.8, 2), ph: R(0, 6) }); if (typeof Sfx !== 'undefined' && music) try { Sfx.play('hit'); } catch (e) { } }
      if (toss.t > 1.5) toss = null;
    } else if ((tossAt -= dt) <= 0 && cast.some(c => c.seat.toss)) { toss = { t: 0 }; tossAt = R(8, 13); }
    flare = Math.max(0, flare - dt * 0.7);
    fk = 0.92 + 0.05 * Math.sin(T * 11) + 0.03 * Math.sin(T * 23 + 1) + flare * 0.25;
  }
  const px = (x, y, s, col) => { g.fillStyle = col; g.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, s, s); };
  function drawStick() {
    if (!toss || toss.t < 0.35 || toss.hit) return;
    const s = SEATS.L, u = (toss.t - 0.35) / 0.5, x = s.x + 14 + (-2 - s.x - 14) * u, y = s.y - 16 + (-6 - s.y + 16) * u - Math.sin(u * Math.PI) * 20, a = u * 6;
    for (let i = -6; i <= 6; i++) px(x + Math.cos(a) * i, y + Math.sin(a) * i, 2, i >= 5 ? '#f0c888' : i <= -5 ? '#4a2c14' : i % 3 ? '#a87444' : '#7a4e28');
  }
  // 火焰：經典的像素火（每格往上傳熱、隨機冷卻、左右飄），36×48 個世界像素，底部的熱度中間高兩邊低 → 一條條會跳的火舌
  function fireStep() {
    const W = FW, H = FH, wd = 7.5 + flare * 3, top = 1 + flare * 0.3;
    for (let x = 0; x < W; x++) { const u = (x - W / 2 + 0.5) / wd; heat[(H - 1) * W + x] = Math.exp(-u * u) * (0.8 + Math.random() * 0.35) * top; }
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
      const src = y * W + x, r = Math.random(), dx = r < 0.25 ? -1 : r > 0.75 ? 1 : 0, dst = src - W + dx;
      heat[dst] = Math.max(0, heat[src] - Math.random() * 0.05 * (1 - flare * 0.35));
    }
    const d = fimg.data;
    for (let i = 0; i < W * H; i++) { const h = heat[i], k = h < 0.15 ? -1 : Math.min(FC.length - 1, ((h - 0.15) / 0.85 * FC.length) | 0), o = i * 4;
      if (k < 0) { d[o + 3] = 0; continue; } const c = FCR[k]; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = k === 0 ? 120 : k === 1 ? 210 : 255; }
    fcv.getContext('2d').putImageData(fimg, 0, 0);
  }
  function drawFlames() { g.drawImage(fcv, -FW / 2, -FH - 1, FW, FH); }
  // ---------- 一次畫好的地面、樹（換尺寸時） ----------
  function prerender() {
    ground = canvas(CW, CH); let x = ground.getContext('2d'); x.imageSmoothingEnabled = false; x.setTransform(Z, 0, 0, Z, FX, FY);
    const th = THEMES.find(t => t.id === 'grass') || THEMES[0], x0 = Math.floor(-FX / Z / 32) - 1, y0 = Math.floor(-FY / Z / 32) - 1;
    for (let ty = y0; ty < y0 + CH / Z / 32 + 3; ty++) for (let tx = x0; tx < x0 + CW / Z / 32 + 3; tx++) x.drawImage(getFloorTile(th, hash2(tx + 40, ty + 40) % 6), tx * 32, ty * 32);
    for (let y = -34; y < 36; y++) for (let xx = -64; xx < 64; xx++) {   // 火堆周圍踩出來的泥土（邊緣碎碎的）＋中間一圈灰
      const e = (xx / 58) ** 2 + ((y - 2) / 30) ** 2, n = hash2(xx + 300, y + 300) % 100 / 100; if (e > 1 + n * 0.25 - 0.12) continue;
      x.fillStyle = e < 0.22 ? (n < 0.5 ? '#2a2420' : '#332c26') : n < 0.15 ? '#5a4a36' : n < 0.55 ? '#46382a' : '#3e3226'; x.fillRect(xx, y, 1, 1);
    }
    trees = canvas(CW, CH); x = trees.getContext('2d'); x.imageSmoothingEnabled = false; x.setTransform(Z, 0, 0, Z, FX - OX * Z, FY - OY * Z);
    withG(null, () => StackProps.draw(x));
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop';
    const gr = x.createRadialGradient(FX, FY, 0, FX, FY, 190 * Z); gr.addColorStop(0, 'rgba(14,8,10,0.5)'); gr.addColorStop(0.3, 'rgba(8,7,22,0.9)'); gr.addColorStop(1, 'rgba(4,5,15,0.97)');
    x.fillStyle = gr; x.fillRect(0, 0, CW, CH); x.globalCompositeOperation = 'source-over';
    stars = Array.from({ length: Math.round(CW / 14) }, () => ({ x: R(0, CW) | 0, y: (Math.pow(Math.random(), 1.6) * CH * 0.3) | 0, s: Math.random() < 0.15 ? 2 : 1, ph: R(0, 6), sp: R(0.8, 2.4) }));
  }
  // ---------- 每一格 ----------
  function draw(dt) {
    if (artOn) return drawArt(dt);
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.globalCompositeOperation = 'source-over';
    g.drawImage(ground, 0, 0);
    // 夜：離火越遠越暗（橢圓，地面是斜看的）
    g.save(); g.translate(FX, FY - 6 * Z); g.scale(1, 0.6);
    const rad = (138 + 5 * Math.sin(T * 9) + 3 * Math.sin(T * 21)) * Z * (1 + flare * 0.1), dk = g.createRadialGradient(0, 0, 0, 0, 0, rad);
    dk.addColorStop(0, 'rgba(6,6,20,0)'); dk.addColorStop(0.18, 'rgba(6,6,20,0.06)'); dk.addColorStop(0.4, 'rgba(6,6,20,0.5)'); dk.addColorStop(0.65, 'rgba(5,6,19,0.86)'); dk.addColorStop(1, 'rgba(4,5,16,0.97)');
    g.fillStyle = dk; g.fillRect(-CW * 2, -CH * 4, CW * 4, CH * 8); g.restore();
    const sky = g.createLinearGradient(0, 0, 0, CH * 0.35); sky.addColorStop(0, 'rgba(10,14,40,0.9)'); sky.addColorStop(1, 'rgba(10,14,40,0)'); g.fillStyle = sky; g.fillRect(0, 0, CW, CH * 0.35);
    for (const s of stars) { g.globalAlpha = 0.35 + 0.35 * Math.sin(T * s.sp + s.ph); g.fillStyle = '#e8ecff'; g.fillRect(s.x, s.y, s.s, s.s); }
    g.globalAlpha = 1; g.drawImage(trees, 0, 0);
    g.save(); g.globalCompositeOperation = 'lighter'; g.translate(FX, FY - 4 * Z); g.scale(1, 0.62);   // 地面的暖光
    const wl = g.createRadialGradient(0, 0, 0, 0, 0, 110 * Z); wl.addColorStop(0, `rgba(255,130,40,${0.42 * fk})`); wl.addColorStop(0.5, `rgba(210,90,30,${0.16 * fk})`); wl.addColorStop(1, 'rgba(160,60,20,0)');
    g.fillStyle = wl; g.fillRect(-110 * Z, -110 * Z, 220 * Z, 220 * Z); g.restore();
    g.setTransform(Z, 0, 0, Z, FX, FY);
    const back = cast.filter(c => !c.seat.sil).sort((a, b) => a.seat.y - b.seat.y), front = cast.filter(c => c.seat.sil);
    for (const c of back) if (c.seat.y < 0) drawSeat(c);
    fireBase();
    for (const c of back) if (c.seat.y >= 0) drawSeat(c);
    drawStick(); drawFlames();
    for (const p of smoke) { const k = p.t / p.d, s = Math.round(p.s * 2) / 2; g.globalAlpha = 0.16 * (1 - k) * Math.min(1, p.t * 3); g.fillStyle = k < 0.25 ? '#9a7a62' : '#4a4658'; g.fillRect(Math.round(p.x * 2) / 2 - s / 2, Math.round(p.y * 2) / 2 - s / 2, s, s); }
    g.globalAlpha = 1;
    for (const c of front) drawSeat(c);
    g.save(); g.globalCompositeOperation = 'lighter';
    const fg = g.createRadialGradient(0, -14, 0, 0, -14, 44); fg.addColorStop(0, `rgba(255,160,60,${0.38 * fk})`); fg.addColorStop(0.5, `rgba(255,110,40,${0.12 * fk})`); fg.addColorStop(1, 'rgba(255,100,30,0)'); g.fillStyle = fg; g.fillRect(-44, -58, 88, 88);
    for (const p of sparks) { const k = p.t / p.d; g.globalAlpha = 1 - k; px(p.x, p.y, k < 0.3 ? 1 : 0.5, k < 0.45 ? '#ffe39a' : '#ff8a3a'); }
    g.restore();
  }
  // 插畫模式：把圖上的 (0～1) 位置換成畫布座標（跟 CSS 的 object-fit:cover、object-position:70% 50% 一樣算）
  function artMap() {
    const im = root.querySelector(".ts-art"), vw = root.clientWidth || innerWidth || CW, vh = root.clientHeight || innerHeight || CH, iw = im.naturalWidth || 16, ih = im.naturalHeight || 9;
    const s = Math.max(vw / iw, vh / ih), dw = iw * s, dh = ih * s, ox = (vw - dw) * 0.7, oy = (vh - dh) * 0.5, k = CW / vw;
    return (u, v) => [(ox + u * dw) * k, (oy + v * dh) * k, dw * k];
  }
  function drawArt(dt) {
    if (!(CW > 2 && CH > 2)) return;   // 視窗大小還是 0（背景分頁）時先不畫
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, CW, CH);
    const M = artMap(), [fx, fy, dw] = M(artI.fx, artI.fy), fr = dw * artI.fw;
    // 火光：一圈暖光跟著火忽明忽暗
    g.globalCompositeOperation = 'lighter';
    const a = 0.16 + 0.07 * Math.sin(T * 9) + 0.05 * Math.sin(T * 23) + 0.18 * flare, rg = g.createRadialGradient(fx, fy - fr * 0.25, 0, fx, fy - fr * 0.25, fr * 1.6);
    rg.addColorStop(0, `rgba(255,150,60,${a})`); rg.addColorStop(0.4, `rgba(255,110,40,${a * 0.45})`); rg.addColorStop(1, 'rgba(255,90,30,0)');
    g.fillStyle = rg; g.fillRect(fx - fr * 1.7, fy - fr * 1.9, fr * 3.4, fr * 3.4);
    // 火星（跟程式畫的版本共用同一組粒子，單位換算成這張圖上火堆的大小）
    const u = fr / 60; g.setTransform(u, 0, 0, u, fx, fy - fr * 0.18);
    for (const p of sparks) { const q = p.t / p.d; g.globalAlpha = 1 - q; px(p.x, p.y * 1.6, q < 0.3 ? 1.5 : 1, q < 0.45 ? '#ffe39a' : '#ff8a3a'); }
    // 螢火蟲：慢慢飄、一閃一閃
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (const f of flies) {
      f.x += f.vx * dt + Math.sin(T * 0.7 + f.ph) * 0.0006; f.y += f.vy * dt + Math.cos(T * 0.9 + f.ph) * 0.0005;
      if (f.x < 0.3 || f.x > 0.99) f.vx *= -1; if (f.y < 0.2 || f.y > 0.92) f.vy *= -1;
      const [x, y] = M(f.x, f.y), b = Math.max(0, Math.sin(T * f.sp * 2 + f.ph));
      g.globalAlpha = 0.25 + 0.75 * b; g.fillStyle = 'rgba(190,255,120,0.35)'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); g.fillStyle = '#e8ff9a'; g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (G.state === 'play') return destroy();
    if (!shown || (typeof Pause !== 'undefined' && Pause.open) || document.hidden || (IS_TOUCH && innerHeight > innerWidth)) return;   // 手機直向時蓋著「請轉成橫向」，不用畫
    tick(dt);
  }
  function tick(dt) { T += dt; const t0 = performance.now(); spawn(dt); draw(dt); api.ms = performance.now() - t0; api.frames++; }
  function resize() {
    if (!cv) return;
    const d = devicePixelRatio || 1, vw = Math.max(1, (root.clientWidth || innerWidth) * d), vh = Math.max(1, (root.clientHeight || innerHeight) * d), P = Math.max(1, vh / ROWS);
    const w = Math.round(vw / P), h = Math.round(vh / P); if (w === CW && h === CH && ground) return;
    CW = cv.width = w; CH = cv.height = h;
    FY = Math.round(CH * 0.6); FX = Math.round(Math.max(CW * 0.62, CW - CH * 0.62)); BOT = (CH - FY) / Z;
    SEATS.FL.y = Math.round(BOT + 3); SEATS.FR.y = Math.round(BOT + 5);   // 前面兩個背影只露出頭和肩膀
    prerender();
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
    root.innerHTML = `<img class="ts-art" alt=""><canvas id="tsCv"></canvas><div class="ts-shade"></div><div class="ts-left"><div class="tp-wrap ts-logo"><div class="title logo-title"><img src="img/logo.png" alt="夢疑 MOE"></div></div>
      <div class="ts-sub">一次又一次入夢，直到你想起怎麼醒來</div><nav class="ts-menu"></nav></div><div class="ts-ver">v${ver()}</div>
      <div class="ts-cred"><div class="ts-card"><div class="ts-ct">夢疑 MOE</div><div class="ts-cv">版本 v${ver()}</div>
      <p><b>企劃／製作人</b>Charlie Huang</p><p><b>程式與美術協作</b>Claude</p><p><b>美術生成</b>Higgsfield</p><p><b>背景音樂、音效</b>遊戲內即時合成</p>
      <p><b>像素素材</b>（皆為 CC0 1.0 公眾領域，謝謝作者們）<br>Dungeon Crawl Stone Soup 32×32 圖塊<br>（Crawl Stone Soup 團隊與 rltiles 的美術貢獻者；部分傳奇、套裝圖示由它裁切、放大、換色而成）<br>opengameart.org/content/dungeon-crawl-32x32-tiles<br>0x72 DungeonTileset II（作者 0x72）<br>Animated Wild Animals（作者 ScratchIO）</p>
      <button data-ts="credx">關閉</button></div></div>`;
    cv = root.querySelector('#tsCv'); g = cv.getContext('2d'); CW = CH = 0; ground = null;
    artI = ARTS[Math.floor(Math.random() * ARTS.length)]; artOn = false; const im = root.querySelector('.ts-art'); im.onload = () => { artOn = true; root.classList.add('art'); }; im.onerror = () => { artOn = false; root.classList.remove('art'); }; im.src = artI.src;
    flies = Array.from({ length: 16 }, () => ({ x: R(0.32, 0.98), y: R(0.25, 0.9), ph: R(0, 6), sp: R(0.4, 1.1), vx: R(-0.006, 0.006), vy: R(-0.004, 0.004) }));
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
    if (a === 'chars' || a === 'new') { hide(); UI.buildMenu(a === 'new' ? 'new' : 'pick'); document.getElementById('menu').classList.add('show'); return; }
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
    if (!fw) buildWorld();
    api.last = pickCast();
    root.querySelector('.ts-menu').innerHTML = menuHTML(api.last); hot = -1;
    root.classList.add('show'); root.classList.remove('cred'); shown = true; resize();
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }
  function hide() { shown = false; if (root) root.classList.remove('show'); if (raf) cancelAnimationFrame(raf); raf = 0; }
  function destroy() {   // 進遊戲：停掉迴圈、丟掉所有畫布
    hide(); fw = null; cast = []; heat.fill(0); sparks = []; smoke = []; toss = null; ground = trees = null;
    if (root) { root.innerHTML = ''; } removeEventListener('resize', resize); cv = g = null; for (const k in IMG) delete IMG[k];
  }
  const api = { ms: 0, frames: 0, last: null, open, hide, destroy, seek: t => { T = t; }, tick: (dt = 1 / 60) => { if (shown && g) tick(dt); }, state: () => ({ art: artOn && artI ? artI.src : null, toss: toss ? toss.t : -1, tossAt, flare, seats: cast.map(c => c.P.cls + '@' + Object.keys(SEATS).find(k => SEATS[k] === c.seat)) }), get shown() { return shown; }, get alive() { return !!raf; }, playing: () => shown && music && G.state !== 'play' };
  return api;
})();
Hook.on('start', () => TitleScreen.destroy());
(function wait() {   // main.js 打開角色清單之後再蓋上開始畫面
  const m = document.getElementById('menu');
  if (m && m.classList.contains('show') && typeof UI !== 'undefined') { if (G.state !== 'play') TitleScreen.open(); }
  else if (G.state !== 'play') setTimeout(wait, 60);
})();
