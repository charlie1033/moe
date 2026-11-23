// =============================================================
//  v2.19.4 營地、終局事件、首領之門、巢穴機關的新美術（美術工作階段）
//  ・營地居民（放走看守者後出現的角色）：大白、骸骨衛兵、小火團、小蜘蛛、老獸王、小螃蟹、茵的妹妹、小樹苗、沙中的影子、小虛空之眼
//    做法：把 WARDEN_TEXT[id].camp.sprite 換成 'camp_<id>'，getSprite 認得就給新圖；新美術關掉或圖還沒載好 → 用原本的怪物圖
//    大白有站、走兩張圖，走動時交替
//  ・終局事件：夢潮裂隙（tide）、獻祭石壇（rite）、迷霧源頭（mist）接 drawEventArt；用過的變灰
//  ・首領之門：封印中／開啟兩張圖（bossroom.js 的掛鉤 drawGateArt，名字照畫）
//  ・海風驛站：莫的釣魚點換成小碼頭（campjobs.js 的掛鉤 drawFishArt）；營地多幾樣擺設（木箱、木桶、漁網、燈柱、浮標，只是畫、不擋路）
//  ・地圖障礙物：樹、岩石、仙人掌、石柱、冰晶、骨堆、石筍、巨菇、灌木、枯樹、虛空水晶換成 AI 圖（stackprops.js 的掛鉤 drawPropArt；
//    水、岩漿、裂隙不換）
//  ・木橋（v2.19.11）：新圖的橋面拉正成木板紋路，一格一格鋪在橋上；靠水的邊加木樑、木樁
//  ・看守者巢穴：冰封峽谷的冰錐、幽暗洞穴的落石，預警圈出現時從頭頂掉下來；黑森林的荊棘毒池上長出藤蔓
//  ・圖在 js\artwork.js：spr_camp_*、ev_*（assets\art\build_artwork.ps1 產生；ev_* 由 artui.js 載好放在 ArtUI.EV）
//  ・載入順序：core-end.js 前面（要等 wardentext、bossroom、dreamtide、dreamrites、campjobs 都載好）
// =============================================================
(function () {
  if (typeof ARTWORK === 'undefined') return;
  const on = () => typeof ArtStyle !== 'undefined' && ArtStyle.on;
  const EV = () => (typeof ArtUI !== 'undefined' && ArtUI.EV) || {};
  const load = (key, f) => { const src = ARTWORK.img[key]; if (!src) return; const im = new Image(); im.onload = () => f(im); im.src = src; };
  // 縮成高 h 的小圖（cw：畫布寬，圖置中；flip：左右翻）
  const fit = (im, h, flip, cw) => {
    const w = Math.round(im.width * h / im.height), W = cw || w, c = document.createElement('canvas'); c.width = W; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (flip) { g.translate(W, 0); g.scale(-1, 1); }
    g.drawImage(im, Math.round((W - w) / 2), 0, w, h); return c;
  };
  const put = (g, im, x, foot, w) => { const h = w * im.height / im.width; g.drawImage(im, x - w / 2, foot - h, w, h); return h; };
  const glow = (g, x, y, r, rgb, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const GRAY = new Map();
  const gray = im => {   // 用過的事件：去色、壓暗（'saturation' 混色，再用原圖形狀裁一次）
    let c = GRAY.get(im); if (c) return c;
    c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'saturation'; x.globalAlpha = 0.85; x.fillStyle = '#808080'; x.fillRect(0, 0, c.width, c.height);
    x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 0, c.width, c.height);
    GRAY.set(im, c); return c;
  };

  // —— ① 營地居民 ——
  const CAMP_H = { boneking: 58, witch: 30, beast: 44, b_cave: 24, b_grass: 76, b_beach: 20, b_swamp: 54, b_forest: 32, b_desert: 56, b_void: 30 };
  const orig = {}, ready = {}, raw = {};
  if (typeof WARDEN_TEXT !== 'undefined') for (const id in CAMP_H) {
    const c = WARDEN_TEXT[id] && WARDEN_TEXT[id].camp; if (!c) continue;
    orig['camp_' + id] = c.sprite; c.sprite = 'camp_' + id;
  }
  const make = id => {
    const h = CAMP_H[id], a = raw[id]; if (!a) return;
    const b = id === 'beast' && raw.beast_w;
    if (!b) { const r = fit(a, h, false); ready[id] = { r, l: fit(a, h, true), w: r.width, h }; return; }
    const W = Math.max(Math.round(a.width * h / a.height), Math.round(b.width * h / b.height));   // 兩張畫在一樣寬的畫布上，交替時不會左右跳
    const s = { r: fit(a, h, false, W), l: fit(a, h, true, W) }, m = { r: fit(b, h, false, W), l: fit(b, h, true, W) };
    ready[id] = { anim: true, idle: [s], run: [s, s, m, m], w: W, h, r: s.r, l: s.l };   // run 一張停兩格（render.js 走路每秒 10 格）
  };
  for (const id in CAMP_H) load('spr_camp_' + id, im => { raw[id] = im; make(id); });
  load('spr_camp_beast_w', im => { raw.beast_w = im; make('beast'); });
  if (typeof getSprite === 'function') {
    const prev = getSprite;
    getSprite = function (name, scale, tint, flash) {
      if (name in orig) {
        const s = ready[name.slice(5)];
        return s && on() && !flash ? s : prev(orig[name], scale, tint, flash);
      }
      return prev(name, scale, tint, flash);
    };
  }

  // —— ② 終局事件：夢潮裂隙、獻祭石壇、迷霧源頭 ——
  const EVW = { tide: [70, 12], rite: [62, 14], mist: [42, 12] };   // 寬、底部往下幾像素
  const prevEv = window.drawEventArt;
  window.drawEventArt = function (g, ev) {
    const sz = EVW[ev.kind], im = sz && on() && EV()['ev_' + ev.kind];
    if (!im) return typeof prevEv === 'function' ? prevEv(g, ev) : false;
    const x = ev.x, y = ev.y, t = (typeof G !== 'undefined' && G.time) || 0, live = !ev.cleared;
    g.imageSmoothingEnabled = true;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y + sz[1] - 2, sz[0] * 0.42, sz[0] * 0.14, 0, 0, Math.PI * 2); g.fill();
    if (live) {
      g.globalCompositeOperation = 'lighter';
      if (ev.kind === 'tide') glow(g, x, y - 10, 46, '120,200,255', 0.22 + 0.1 * Math.sin(t * 4));
      else if (ev.kind === 'rite') glow(g, x, y - 18, 40, '255,90,110', 0.2 + 0.1 * Math.sin(t * 3));
      else glow(g, x, y - 26, 34, '150,230,190', 0.18 + 0.08 * Math.sin(t * 2));
      g.globalCompositeOperation = 'source-over';
    }
    put(g, live ? im : gray(im), x, y + sz[1], sz[0]);
    if (live && !ev.active && typeof G !== 'undefined' && G.parts) {
      if (ev.kind === 'tide' && Math.random() < 0.25) G.parts.push({ x: x + rnd(-20, 20), y: y + rnd(-6, 6), vx: 0, vy: -36, t: 0, dur: 0.7, color: '#9ae8ff', s: 2 });
      if (ev.kind === 'rite' && Math.random() < 0.15) G.parts.push({ x: x + rnd(-14, 14), y: y - 20 + rnd(-6, 6), vx: 0, vy: -24, t: 0, dur: 0.8, color: '#ff7a8a', s: 2 });
    }
    if (live && ev.kind === 'mist') {   // 甕口飄出的霧
      g.save(); g.fillStyle = '#b8e0d0';
      for (let i = 0; i < 4; i++) { const k = (t * 0.35 + i / 4) % 1; g.globalAlpha = 0.28 * (1 - k); g.beginPath(); g.arc(x + Math.sin(t + i * 1.7) * 8 * k, y - 34 - k * 34, 6 + k * 12, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
    return true;
  };

  // —— ③ 首領之門 ——
  window.drawGateArt = function (g, gate, label) {
    const im = on() && EV()[gate.open ? 'ev_gate_open' : 'ev_gate_shut']; if (!im) return false;
    const x = gate.x, y = gate.y, t = (typeof G !== 'undefined' && G.time) || 0;
    g.imageSmoothingEnabled = true;
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(x, y + 20, 40, 11, 0, 0, Math.PI * 2); g.fill();
    if (gate.open) { g.globalCompositeOperation = 'lighter'; glow(g, x, y - 18, 70, '255,150,60', 0.28 + 0.1 * Math.sin(t * 3)); g.globalCompositeOperation = 'source-over'; }
    const h = put(g, im, x, y + 22, 88);
    if (gate.open && G.parts && Math.random() < 0.4) G.parts.push({ x: x + rnd(-18, 18), y: y + rnd(-30, 10), vx: 0, vy: -30, t: 0, dur: 0.6, color: '#ffb050', s: 2 });
    txt(g, label, x, y + 22 - h - 8, 12, gate.open ? '#ffd9a0' : '#e0c8d8', 'center');
    return true;
  };

  // —— ④ 海風驛站：小碼頭、擺設 ——
  window.drawFishArt = function (g, s) {
    const im = on() && EV().ev_pier; if (!im) return false;
    g.imageSmoothingEnabled = true; put(g, im, s.x - 30, s.y + 12, 56); return true;   // 碼頭往右伸進水裡；左邊是莫，不要蓋到他
  };
  // 擺設：[圖, 格 x, 格 y, 寬]（格子中心；只畫不擋路，放在牆邊、人物旁邊的空地）
  const HARBOR_PROPS = [['ev_crates', 3.6, 6.4, 46], ['ev_barrel', 8.4, 6.6, 24], ['ev_barrel', 9.1, 7.0, 22], ['ev_lantern', 18.5, 8.2, 30], ['ev_fishnet', 28, 12.5, 56], ['ev_buoy', 22.8, 15.6, 18], ['ev_crates', 18.2, 15.4, 40]];
  if (typeof Hook !== 'undefined') Hook.on('drawWorld', g => {
    const w = G.world; if (!on() || !w || w.kind !== 'town' || w.hub !== 'harbor') return;
    const E = EV(); g.imageSmoothingEnabled = true;
    for (const [k, tx, ty, wd] of HARBOR_PROPS) {
      const im = E[k]; if (!im) continue; const x = tx * TS, y = ty * TS;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y, wd * 0.42, wd * 0.14, 0, 0, Math.PI * 2); g.fill();
      put(g, im, x, y + 2, wd);
    }
  });
  if (typeof Hook !== 'undefined') Hook.on('light', (cut, cx, cy) => {   // 燈柱的燈照亮一小圈
    const w = G.world; if (!on() || !w || w.kind !== 'town' || w.hub !== 'harbor') return;
    for (const [k, tx, ty] of HARBOR_PROPS) if (k === 'ev_lantern') cut(tx * TS + 9 - cx, ty * TS - 26 - cy, 70, 0.45);
  });

  // —— ⑤ 地圖障礙物（stackprops.js 的掛鉤 drawPropArt）：樹、岩石、仙人掌…換成 AI 圖 ——
  //   [圖, 畫面高度, 會不會被風吹]；同一種隨格子左右翻、大小差一點；離畫面中心越遠往外傾一點（跟原本的立體模型一樣的透視）
  const PROP = { 1: ['ev_ob_tree', 72, 1], 3: ['ev_ob_boulder', 40, 0], 4: ['ev_ob_cactus', 48, 0], 5: ['ev_ob_pillar', 56, 0], 6: ['ev_ob_icecrystal', 42, 0],
    7: ['ev_ob_bones', 30, 0], 9: ['ev_ob_stalagmite', 52, 0], 10: ['ev_ob_mushroom', 46, 0], 11: ['ev_ob_bush', 32, 1], 12: ['ev_ob_deadtree', 64, 1], 13: ['ev_ob_voidcrystal', 46, 0] };
  const PC = new Map(), OB = {};
  let repaint = 0;
  for (const t in PROP) load(PROP[t][0], im => {   // 圖比地圖晚載好 → 地圖底圖重畫一次（障礙物底下改鋪連續地板，不畫舊的平面圖）
    OB[t] = im;
    if (!repaint) repaint = setTimeout(() => { repaint = 0; try { if (G.world && G.world.deco && typeof worldRepaint === 'function') worldRepaint(G.world); } catch (e) {} }, 300);
  });
  window.propArtReady = t => !!OB[t] && on();
  const propPic = (t, flip, k) => {
    const key = t + '|' + flip + '|' + k; let c = PC.get(key); if (c) return c;
    const im = OB[t]; if (!im) return null;
    c = fit(im, Math.round(PROP[t][1] * (0.9 + k * 0.1)), flip); PC.set(key, c); return c;
  };
  window.drawPropArt = function (g, o, lean, fl) {
    const P = PROP[o.t]; if (!P || !on()) return false;
    const c = propPic(o.t, o.s & 1, (o.s >> 1) % 3); if (!c) return false;
    const sk = -(lean || 0) * (P[2] ? 1.1 : 0.6);   // 往外傾：底部不動、頂端偏
    g.save(); g.translate(Math.round(o.x), Math.round(o.y + 5 + (fl || 0))); if (sk) g.transform(1, 0, sk, 1, 0, 0);
    g.imageSmoothingEnabled = true; g.drawImage(c, -Math.round(c.width / 2), -c.height); g.restore();
    return true;
  };

  // —— ⑥ 看守者巢穴的機關 ——
  const VINE = ['ev_vine1', 'ev_vine2', 'ev_vine3'];
  if (typeof Hook !== 'undefined') Hook.on('drawWorld', g => {
    const w = G.world; if (!on() || !w || !w.bossRoom || !w.haz) return;
    const id = w.theme && w.theme.id, E = EV(), H = w.haz; g.imageSmoothingEnabled = true;
    if ((id === 'ice' || id === 'cave') && H.pend) {   // 預警圈出現 1.1 秒後落地：這段時間從頭頂掉下來
      const im = E[id === 'ice' ? 'ev_icefall' : 'ev_rockfall'];
      if (im) for (const q of H.pend) {
        const left = q.at - G.time; if (left < 0 || left > 1.1) continue;
        const p = 1 - left / 1.1, wd = id === 'ice' ? 44 : 46;
        g.fillStyle = `rgba(0,0,0,${0.15 + 0.3 * p})`; g.beginPath(); g.ellipse(q.x, q.y, wd * 0.3 + wd * 0.2 * p, (wd * 0.3 + wd * 0.2 * p) * 0.4, 0, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 0.4 + 0.6 * p; put(g, im, q.x, q.y - 360 * (1 - p) * (1 - p) + 6, wd); g.globalAlpha = 1;
      }
    }
    if (id === 'forest' && G.zones) for (const z of G.zones) {   // 荊棘根鑽出地面：毒池上長出藤蔓（開頭長出來、最後縮回去）；只認機關放的毒池（半徑一樣）
      if (z.r !== H.r || z.elem !== 'chaos' || !(z.dur > 0)) continue;
      const im = E[VINE[Math.abs(Math.round(z.x * 7 + z.y * 13)) % 3]]; if (!im) continue;
      const k = Math.min(1, z.t / 0.35, (z.dur - z.t) / 0.5); if (k <= 0) continue;
      g.globalAlpha = Math.max(0, k); put(g, im, z.x, z.y + z.r * 0.35, z.r * 1.7 * (0.6 + 0.4 * k)); g.globalAlpha = 1;
    }
  });

  // —— ⑦ 木橋（v2.19.11）：新圖的橋面「拉正」成俯看的木板花紋，一格一格鋪在橋上 ——
  //   橋的形狀很多（一格寬的小橋、三格寬的長橋、大地圖整條彎來彎去的棧道），所以不貼整張圖，只取橋面的木板紋路
  //   木板一律跟走的方向垂直；靠水的那一邊加一條橋邊木樑和落影，轉角、每隔幾格立一根木樁（從原圖裁下來）
  let BR = null;
  load('ev_bridge', im => {
    const s = im.width / 661;   // 原圖 661×491；橋面四個角裡的三個：A 左後、B 右後、D 左前
    const A = [195 * s, 66 * s], B = [655 * s, 295 * s], D = [3 * s, 165 * s];
    const TW = 56, TL = 84, u0 = 0.2, u1 = 0.7, v0 = 0.1, v1 = 0.9;   // 只取橋面中間（避開兩頭的木樁；右前那根的樁頭在 u 0.72～0.8）
    const ex = [(D[0] - A[0]) * (v1 - v0) / TW, (D[1] - A[1]) * (v1 - v0) / TW], ey = [(B[0] - A[0]) * (u1 - u0) / TL, (B[1] - A[1]) * (u1 - u0) / TL];
    const ox = A[0] + u0 * (B[0] - A[0]) + v0 * (D[0] - A[0]), oy = A[1] + u0 * (B[1] - A[1]) + v0 * (D[1] - A[1]);
    const det = ex[0] * ey[1] - ey[0] * ex[1], a = ey[1] / det, b = -ex[1] / det, c = -ey[0] / det, d = ex[0] / det;
    const v = document.createElement('canvas'); v.width = TW; v.height = TL;   // 直著走的橋：木板橫放
    const vx = v.getContext('2d'); vx.imageSmoothingEnabled = true; vx.imageSmoothingQuality = 'high';
    vx.setTransform(a, b, c, d, -(a * ox + c * oy), -(b * ox + d * oy)); vx.drawImage(im, 0, 0);
    vx.setTransform(1, 0, 0, 1, 0, 0); vx.fillStyle = 'rgba(34,20,8,0.2)'; vx.fillRect(0, 0, TW, TL);   // 壓暗一點、偏暖（原圖在地圖上看起來太白）
    const h =document.createElement('canvas'); h.width = TL; h.height = TW;   // 橫著走的橋：轉 90 度
    const hx = h.getContext('2d'); hx.translate(TL, 0); hx.rotate(Math.PI / 2); hx.drawImage(v, 0, 0);
    const post = document.createElement('canvas'); post.width = 12; post.height = 22;   // 木樁：右前那根的上半截
    const px = post.getContext('2d'); px.imageSmoothingEnabled = true; px.imageSmoothingQuality = 'high'; px.drawImage(im, 400 * s, 288 * s, 50 * s, 92 * s, 0, 0, 12, 22);
    BR = { v, h, post, pv: null, ph: null };
  });
  const ORI = new WeakMap();
  // 每格木橋往哪個方向走：1 直走、2 橫走（看橋面左右、上下延伸到哪裡：兩頭接到陸地的那個方向就是路；一樣的話看哪邊長）
  const oriOf = w => {
    let o = ORI.get(w); if (o && o.n === w.deco.length) return o.a;
    const W = w.W, d = w.deco, N = d.length, a = new Uint8Array(N);
    const land = i => i >= 0 && i < N && w.grid[i] && d[i] !== 15 && d[i] !== 2;
    for (let i = 0; i < N; i++) if (d[i] === 15) {
      const x = i % W, y = (i / W) | 0; let l = x, r = x, t = y, bt = y;
      while (l > 0 && d[i - (x - l) - 1] === 15) l--;
      while (r < W - 1 && d[i + (r - x) + 1] === 15) r++;
      while (t > 0 && d[(t - 1) * W + x] === 15) t--;
      while ((bt + 1) * W + x < N && d[(bt + 1) * W + x] === 15) bt++;
      const hl = (l > 0 && land(y * W + l - 1) ? 1 : 0) + (r < W - 1 && land(y * W + r + 1) ? 1 : 0);
      const vl = (land((t - 1) * W + x) ? 1 : 0) + (land((bt + 1) * W + x) ? 1 : 0);
      a[i] = vl > hl ? 1 : hl > vl ? 2 : (bt - t >= r - l ? 1 : 2);
    }
    ORI.set(w, { n: N, a }); return a;
  };
  if (typeof Hook !== 'undefined') Hook.on('drawWorld', g => {
    const w = G.world; if (!on() || !BR || !w || !w.deco || !w.grid) return;
    const W = w.W, d = w.deco, N = d.length;
    const x0 = Math.max(0, Math.floor(G.cam.x / TS) - 1), y0 = Math.max(0, Math.floor(G.cam.y / TS) - 1);
    const x1 = Math.min(W - 1, Math.ceil((G.cam.x + VW) / TS) + 1), y1 = Math.min(w.H - 1, Math.ceil((G.cam.y + VH) / TS) + 1);
    const cells = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (d[y * W + x] === 15) cells.push(y * W + x);
    if (!cells.length) return;
    const o = oriOf(w), wet = i => i >= 0 && i < N && d[i] === 2;
    if (!BR.pv) { BR.pv = g.createPattern(BR.v, 'repeat'); BR.ph = g.createPattern(BR.h, 'repeat'); }
    g.save();
    for (const k of [1, 2]) {   // 橋面
      g.beginPath(); let n = 0;
      for (const i of cells) if (o[i] === k) { g.rect((i % W) * TS, ((i / W) | 0) * TS, TS, TS); n++; }
      if (n) { g.fillStyle = k === 1 ? BR.pv : BR.ph; g.fill(); }
    }
    const posts = [];
    for (const i of cells) {   // 靠水的邊：水面上的落影、橋邊木樑；轉角和每隔幾格立木樁
      const x = i % W, y = (i / W) | 0, X = x * TS, Y = y * TS, k = o[i];
      const L = x > 0 && wet(i - 1), R = x < W - 1 && wet(i + 1), U = wet(i - W), Dn = wet(i + W);
      g.fillStyle = 'rgba(0,0,0,0.28)';
      if (L) g.fillRect(X - 4, Y + 2, 4, TS); if (R) g.fillRect(X + TS, Y + 2, 4, TS); if (Dn) g.fillRect(X + 2, Y + TS, TS, 5);
      g.fillStyle = '#3a2c20';
      if (L) g.fillRect(X, Y, 3, TS); if (R) g.fillRect(X + TS - 3, Y, 3, TS); if (U) g.fillRect(X, Y, TS, 3); if (Dn) g.fillRect(X, Y + TS - 4, TS, 4);
      g.fillStyle = 'rgba(230,210,160,0.22)';
      if (L) g.fillRect(X + 3, Y, 1, TS); if (R) g.fillRect(X + TS - 4, Y, 1, TS); if (U) g.fillRect(X, Y + 3, TS, 1);
      if (k === 1) {
        const top = d[i - W] !== 15, bot = d[i + W] !== 15, mid = !top && !bot && y % 4 === 0;
        for (const [side, px] of [[L, X + 3], [R, X + TS - 3]]) if (side) {
          if (top) posts.push([px, Y + 6]); if (bot) posts.push([px, Y + TS]); if (mid) posts.push([px, Y + TS / 2 + 4]);
        }
      } else {
        const lf = d[i - 1] !== 15, rt = d[i + 1] !== 15, mid = !lf && !rt && x % 4 === 0;
        for (const [side, py] of [[U, Y + 6], [Dn, Y + TS]]) if (side) {
          if (lf) posts.push([X + 4, py]); if (rt) posts.push([X + TS - 4, py]); if (mid) posts.push([X + TS / 2, py]);
        }
      }
    }
    g.imageSmoothingEnabled = true;
    posts.sort((p, q) => p[1] - q[1]);
    for (const [px, py] of posts) g.drawImage(BR.post, px - 6, py - 22);
    g.restore();
  });
})();

// =============================================================
//  v2.20.5 牢房牆上的「第 138 筆」：角色第一次點上某種武器的最終天賦時（classtree.js 記在 P.engrave），
//  牆上那排淡淡的「醒來」旁邊，多一個這個角色自己刻的「醒來」，刻法看武器：
//    單手劍＝細長一筆一劃　雙手斧＝砸出來的粗字、邊緣碎裂　弓＝箭孔排成的點點字　魔杖＝發微光的字
//    法杖＝燒焦的黑字＋餘燼　太刀＝一刀斜斬的俐落刻痕　匕首＝很小很深、刻在角落
//  ・還沒刻（engraveOf 是 null）就不畫；走近或滑鼠移上去，下面出現一行「你用○○刻下的第 138 個醒來（天賦名字）」
//  ・字形先畫成小圖快取（每種武器一張），每格只貼圖；魔杖的光、法杖的餘燼才每格動
//  接法：Hook.on('drawWorld')，只在 G.world.hub === 'cell' 的營地畫
// =============================================================
(function () {
  if (typeof Hook === 'undefined') return;
  const WNAME = { sword: '單手劍', axe: '雙手斧', bow: '弓', wand: '魔杖', staff: '法杖', katana: '太刀', dagger: '匕首' };
  const SPOT = { x: 25.3, y: 1.55 };        // 牆上的位置（格）：在原本那排「醒來」的右邊、火把上方
  const CW = 64, CH = 40, FONTF = () => (typeof FONT !== 'undefined' ? FONT : 'serif');
  const cache = {};
  // 把「醒來」畫成遮罩（白字），回傳 canvas
  function mask(size, weight, skew) {
    const c = document.createElement('canvas'); c.width = CW; c.height = CH; const g = c.getContext('2d');
    g.font = `${weight || ''} ${size}px ${FONTF()}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    if (skew) g.setTransform(1, 0, skew, 1, -skew * CH / 2, 0);
    g.fillText('醒來', CW / 2, CH / 2); return c;
  }
  const tint = (m, col) => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; const g = c.getContext('2d'); g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, CW, CH); return c; };
  const alphaAt = (m) => m.getContext('2d').getImageData(0, 0, CW, CH).data;
  // 刻痕的基本樣子：剛刻開的石頭顏色比較淺（跟旁邊那排舊的淡色「醒來」同一種顏色，但新、清楚），
  //   字的左上一條深色陰影＝刻下去的溝；depth 越大陰影越重（刻得越深）
  const FRESH = '#e4d6b4';
  function carve(m, dark, light, depth) {
    const c = document.createElement('canvas'); c.width = CW; c.height = CH; const g = c.getContext('2d');
    for (let d = 0; d < (depth || 1); d++) { g.drawImage(tint(m, dark), -1, -1); g.drawImage(tint(m, dark), 1, 1); }
    g.drawImage(tint(m, light), 0, 0); return c;
  }
  function build(w) {
    const c = document.createElement('canvas'); c.width = CW; c.height = CH; const g = c.getContext('2d'); let extra = null;
    if (w === 'sword') {
      g.drawImage(carve(mask(15, '300'), 'rgba(8,6,3,0.85)', FRESH), 0, 0);
    } else if (w === 'axe') {   // 砸出來的坑：字很粗，周圍一圈碎石崩口
      const m = mask(19, '900'), a = alphaAt(m);
      g.drawImage(tint(m, 'rgba(10,8,4,0.45)'), -1, 1); g.drawImage(tint(m, 'rgba(10,8,4,0.45)'), 1, -1);
      g.drawImage(carve(m, 'rgba(6,4,2,0.9)', '#b8a47e', 2), 0, 0);
      let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 70; i++) { const x = (r() * CW) | 0, y = (r() * CH) | 0; if (a[(y * CW + x) * 4 + 3] > 0) continue;
        let near = false; for (let d = 1; d <= 2 && !near; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < CW && yy < CH && a[(yy * CW + xx) * 4 + 3] > 120) near = true; }
        if (near) { g.fillStyle = r() < 0.6 ? '#1a140c' : 'rgba(210,192,160,0.6)'; g.fillRect(x, y, r() < 0.5 ? 1 : 2, 1); } }
    } else if (w === 'bow') {   // 一排排箭孔排成字
      const m = mask(17, '700'), a = alphaAt(m);
      for (let y = 1; y < CH - 1; y += 3) for (let x = 1 + (y % 2); x < CW - 1; x += 3) if (a[(y * CW + x) * 4 + 3] > 110) {
        g.fillStyle = '#0a0704'; g.fillRect(x - 1, y - 1, 2, 2); g.fillStyle = '#d8c8a4'; g.fillRect(x, y, 2, 2); }
    } else if (w === 'wand') {   // 發光的字：光暈先畫好一張，每格只調亮度
      const m = mask(15, '400');
      const glow = document.createElement('canvas'); glow.width = CW; glow.height = CH; const gg = glow.getContext('2d');
      gg.shadowColor = 'rgba(150,210,255,0.95)'; gg.shadowBlur = 7; for (let i = 0; i < 3; i++) gg.drawImage(tint(m, 'rgba(150,210,255,0.6)'), 0, 0);
      g.drawImage(tint(m, '#eef8ff'), 0, 0); extra = { glow };
    } else if (w === 'staff') {   // 燒焦的黑字，旁邊一圈煙燻
      const m = mask(16, '700'), a = alphaAt(m);
      g.shadowColor = 'rgba(150,80,30,0.9)'; g.shadowBlur = 6; g.drawImage(tint(m, 'rgba(120,64,24,0.8)'), 0, 0); g.drawImage(tint(m, 'rgba(120,64,24,0.6)'), 0, 0); g.shadowBlur = 0;
      g.drawImage(tint(m, '#080504'), 0, 0);
      const pts = []; for (let y = 1; y < CH - 1; y++) for (let x = 1; x < CW - 1; x++) { const i = (y * CW + x) * 4 + 3; if (a[i] > 120 && (a[i - 4] < 60 || a[i + 4] < 60 || a[i - CW * 4] < 60 || a[i + CW * 4] < 60)) pts.push([x, y]); }
      const emb = []; for (let i = 0; i < 14 && pts.length; i++) emb.push(pts[(i * 977 + 31) % pts.length]); extra = { emb };
    } else if (w === 'katana') {   // 一刀斜斬：字細而斜，一道長長的斜刻痕穿過
      g.drawImage(carve(mask(15, '300', -0.32), 'rgba(8,6,3,0.85)', FRESH), 0, 0);
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(8,6,3,0.85)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(3, CH - 8); g.lineTo(CW - 5, 3); g.stroke();
      g.strokeStyle = FRESH; g.lineWidth = 1.4; g.beginPath(); g.moveTo(4, CH - 7); g.lineTo(CW - 4, 4); g.stroke();
    } else if (w === 'dagger') {   // 很小、刻得很深，縮在右下角
      const m = mask(9, '900'); const k = carve(m, 'rgba(4,3,1,0.95)', FRESH, 3);
      g.drawImage(k, 14, 9);
    }
    return { c, extra };
  }
  const at = () => ({ x: SPOT.x * TS, y: SPOT.y * TS });
  Hook.on('drawWorld', g => {
    const w = G.world, P = G.P; if (!w || w.kind !== 'town' || w.hub !== 'cell' || typeof engraveOf !== 'function') return;
    const e = engraveOf(P); if (!e || !WNAME[e.w]) return;
    const pic = cache[e.w] || (cache[e.w] = build(e.w)), p = at(), x0 = Math.round(p.x - CW / 2), y0 = Math.round(p.y - CH / 2), T = G.time;
    g.save(); g.imageSmoothingEnabled = false;
    if (pic.extra && pic.extra.glow) { g.globalAlpha = 0.55 + 0.35 * Math.sin(T * 2.3) + 0.1 * Math.sin(T * 7.1); g.drawImage(pic.extra.glow, x0, y0); g.globalAlpha = 0.85 + 0.15 * Math.sin(T * 2.3); }
    else g.globalAlpha = 0.92;
    g.drawImage(pic.c, x0, y0); g.globalAlpha = 1;
    if (pic.extra && pic.extra.emb) for (let i = 0; i < pic.extra.emb.length; i++) {   // 法杖：邊緣幾點餘燼一明一暗
      const [ex, ey] = pic.extra.emb[i], k = Math.sin(T * (1.7 + i * 0.37) + i * 2.1); if (k < 0.2) continue;
      g.globalAlpha = k; g.fillStyle = k > 0.75 ? '#ffd070' : '#ff7a20'; g.fillRect(x0 + ex, y0 + ey, 1, 1);
    }
    g.globalAlpha = 1;
    // 走近或滑鼠指著：顯示是什麼刻的
    const pl = G.pl, near = pl && Math.abs(pl.x - p.x) < 90 && pl.y - p.y < 110;
    const hov = typeof input !== 'undefined' && Math.abs(input.wx - p.x) < CW / 2 && Math.abs(input.wy - p.y) < CH / 2;
    if ((near || hov) && typeof txt === 'function') txt(g, `你用${WNAME[e.w]}刻下的第 138 個醒來（${e.name}）`, p.x, p.y + 26, 11, '#f0e0b8', 'center');
    g.restore();
  });
  if (typeof ArtUI !== 'undefined') ArtUI.engrave = { WNAME, SPOT, build };   // 給自我檢查用
})();
