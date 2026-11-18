// =============================================================
//  章節劇情事件的地上標記與夢裡的人物（全部程式畫，不吃美術圖）
//  玩家看到：還沒完成的事件腳下有金色光暈（慢慢呼吸）、頭上一個跳動的金色「！」、偶爾冒出金色火花，夜裡也照得亮一圈；
//            完成過的變暗、沒有光暈；被區域首領鎖住的也畫成暗的（頭上寫「先打倒『名字』」），首領倒下才亮起來。npc 會輕輕呼吸，幽魂半透明飄著；靠近時頭上顯示名字
//  標記 11 種：book 書頁、bowl 碗、altar 祭壇、grave 墓碑、chest 箱子、crown 王冠、lamp 燈、npc 人影、bones 屍骨、crystal 水晶、sign 告示牌
//  人物 5 種（look）：skel 骷髏、human 旅人、ghost 幽魂、child 小孩、dog 狗
//  美術掛鉤：drawChapArt(g, ev, def) 有定義且回傳 true＝美術畫好了本體（光暈、「！」、名字照舊畫）
//  效能：每種標記、人物先畫成一張小圖存起來，之後每格只 drawImage；畫面外的不畫
//  接點：Hook 'drawWorld'、'light'、'glow'
// =============================================================
const ChapArt = (() => {
  const cache = {};
  const mk = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); f(g); return c; };
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const C = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const E = (g, x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const PG = (g, pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
  // 標記：40×44 的小圖，底部中心在 (20, 38)
  const MARK = {
    book(g) { R(g, 8, 32, 24, 7, '#4a4452'); R(g, 8, 31, 24, 2, '#6a6476'); PG(g, [[20, 30], [6, 26], [6, 33], [20, 35]], '#e8dcc0'); PG(g, [[20, 30], [34, 26], [34, 33], [20, 35]], '#d8ccb0');
      PG(g, [[20, 35], [5, 33], [5, 34], [20, 36], [35, 34], [35, 33]], '#5a2a6a'); g.fillStyle = '#8a7a68'; for (let k = 0; k < 3; k++) { g.fillRect(9, 28 + k * 2, 8, 1); g.fillRect(23, 28 + k * 2, 8, 1); } R(g, 19, 29, 2, 7, '#a02a2a'); },
    bowl(g) { E(g, 20, 34, 12, 5, '#36506a'); E(g, 20, 32, 12, 4.5, '#6a90b0'); E(g, 20, 32, 9, 3, '#1a2836'); E(g, 18, 31.5, 5, 1.2, '#cfeaff'); R(g, 10, 33, 3, 1, '#e8f6ff'); R(g, 27, 34, 2, 1, '#e8f6ff'); },
    altar(g) { R(g, 10, 24, 20, 14, '#5a5464'); R(g, 7, 21, 26, 5, '#7a7486'); R(g, 13, 27, 14, 2, '#46404e'); PG(g, [[20, 8], [25, 15], [20, 21], [15, 15]], '#9ae8ff'); PG(g, [[20, 9], [22, 15], [20, 19]], '#e8fbff'); },
    grave(g) { E(g, 20, 37, 14, 4, '#3a3420'); R(g, 11, 14, 18, 23, '#7a7486'); C(g, 20, 15, 9, '#7a7486'); R(g, 11, 14, 3, 23, '#8e889a'); R(g, 19, 16, 3, 13, '#4a4452'); R(g, 15, 19, 11, 3, '#4a4452'); R(g, 8, 35, 3, 3, '#4a6a2a'); R(g, 29, 34, 3, 4, '#4a6a2a'); },
    chest(g) { R(g, 8, 22, 24, 15, '#7a4a24'); R(g, 8, 18, 24, 6, '#8a5a2c'); R(g, 8, 23, 24, 2, '#3a2410'); R(g, 11, 18, 3, 19, '#d8b050'); R(g, 26, 18, 3, 19, '#d8b050'); R(g, 18, 22, 4, 6, '#f0d070'); R(g, 19, 25, 2, 2, '#3a2410'); },
    crown(g) { E(g, 20, 35, 13, 4, '#6a1a1a'); E(g, 20, 34, 12, 3, '#8a2a2a'); PG(g, [[9, 32], [9, 20], [14, 26], [20, 16], [26, 26], [31, 20], [31, 32]], '#e8b830'); R(g, 9, 29, 22, 3, '#c89420'); C(g, 20, 27, 2, '#e03a3a'); C(g, 13, 29, 1.5, '#3a9ae8'); C(g, 27, 29, 1.5, '#3ae87a'); C(g, 20, 16, 1.5, '#fff0b0'); },
    lamp(g) { E(g, 20, 37, 9, 3, '#5a4a2a'); R(g, 14, 31, 12, 6, '#b8902a'); R(g, 15, 18, 10, 13, 'rgba(255,240,200,0.35)'); R(g, 14, 17, 12, 2, '#b8902a'); R(g, 14, 18, 1, 13, '#8a6a20'); R(g, 25, 18, 1, 13, '#8a6a20'); R(g, 18, 12, 4, 5, '#8a6a20'); R(g, 19, 9, 2, 3, '#5a4a2a'); },
    npc(g) { E(g, 20, 37, 9, 3, 'rgba(0,0,0,0.4)'); PG(g, [[20, 8], [29, 20], [31, 37], [9, 37], [11, 20]], '#2a2436'); C(g, 20, 15, 6, '#3a3248'); C(g, 20, 16, 4, '#0c0a10'); R(g, 17, 15, 2, 1, '#c8b0ff'); R(g, 22, 15, 2, 1, '#c8b0ff'); },
    bones(g) { const b = (x1, y1, x2, y2) => { g.strokeStyle = '#d8d0b8'; g.lineWidth = 3; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); C(g, x1, y1, 2.5, '#e8e0c8'); C(g, x2, y2, 2.5, '#e8e0c8'); };
      b(8, 36, 32, 30); b(9, 29, 31, 37); C(g, 20, 25, 8, '#e8e0c8'); R(g, 15, 29, 10, 5, '#e8e0c8'); R(g, 15, 23, 4, 4, '#2a2420'); R(g, 21, 23, 4, 4, '#2a2420'); R(g, 17, 32, 1, 2, '#2a2420'); R(g, 20, 32, 1, 2, '#2a2420'); R(g, 23, 32, 1, 2, '#2a2420'); },
    crystal(g) { E(g, 20, 37, 12, 3, '#2a3a4a'); PG(g, [[20, 6], [26, 20], [22, 37], [16, 37], [14, 20]], '#6ad0f0'); PG(g, [[20, 6], [22, 20], [20, 36]], '#c8f4ff'); PG(g, [[11, 18], [15, 26], [14, 37], [9, 37], [8, 27]], '#4aa8d0'); PG(g, [[30, 20], [33, 28], [31, 37], [26, 37], [27, 27]], '#4aa8d0'); },
    sign(g) { R(g, 18, 18, 4, 20, '#5a3a20'); R(g, 6, 10, 28, 14, '#8a6038'); R(g, 6, 10, 28, 2, '#a87a48'); R(g, 6, 22, 28, 2, '#5a3a20'); g.fillStyle = '#3a2410'; g.fillRect(10, 14, 14, 1); g.fillRect(10, 17, 19, 1); g.fillRect(10, 20, 10, 1); },
  };
  // 人物：像素圖（k 外框；每格放大 2 倍）
  const LOOK = {
    human: { pal: { k: '#14101a', C: '#5a4a6a', c: '#3e3250', f: '#e8b890', e: '#2a1a14', Y: '#c8a050', B: '#3a2a20' }, map: ['....kkkk....', '...kCCCCk...', '..kCCCCCCk..', '..kCffffCk..', '..kCfefeCk..', '..kCffffCk..', '...kCffCk...', '..kCCCCCCk..', '.kCCCCCCCCk.', '.kCcCCCCcCk.', '.kfcCYYCcfk.', '..kcCCCCck..', '..kCCCCCCk..', '..kCcCCcCk..', '..kCCCCCCk..', '...kBkkBk...', '...kBk.kBk..', '...kk...kk..'] },
    child: { pal: { k: '#14101a', H: '#6a3a20', f: '#f0c8a0', e: '#2a1a14', D: '#c86a5a', d: '#a04a40', W: '#f0e8d8' }, map: ['...kkkk...', '..kHHHHk..', '.kHHHHHHk.', '.kHffffHk.', '.kHfefeHk.', '.kHffffHk.', '..kkffkk..', '..kDWWDk..', '.kfDDDDfk.', '..kDdDDk..', '.kDDDdDDk.', '..kfkkfk..', '..kk..kk..'] },
    ghost: { pal: { k: '#2a3a5a', G: '#c8e0ff', g: '#a0c0f0', e: '#1a2440' }, map: ['....kkkk....', '...kGGGGk...', '..kGGGGGGk..', '..kGeGGeGk..', '..kGGGGGGk..', '..kGGeeGGk..', '.kGGGGGGGGk.', '.kGgGGGGgGk.', 'kGGgGGGGgGGk', 'kGGGGGGGGGGk', 'kGgGGGGGGgGk', '.kGGGGGGGGk.', '.kGkGGkGGkk.', '..k.kk.kk...'] },
    skel: { pal: { k: '#14121a', W: '#e0dccc', e: '#8ad8ff' }, map: ['....kkkk....', '...kWWWWk...', '..kWWWWWWk..', '..kWeWWeWk..', '..kWWWWWWk..', '...kWkWkWk..', '....kkkkk...', '.....kWk....', '..kkkWWWkkk.', '.kW.kWkWk.Wk', '.kW.kWWWk.Wk', '.kk.kWkWk.kk', '....kWWWk...', '.....kWk....', '....kWkWk...', '....kW.kW...', '...kWk.kWk..', '...kk...kk..'] },
    dog: { pal: { k: '#1a1a24', W: '#f0f4f8', w: '#c8d4e0', e: '#1a1a24', n: '#2a2a30' }, map: ['..........kk..', '.........kWWk.', 'kk......kWWWek', 'kWk.....kWWWWn', '.kWkkkkkkWWkk.', '..kWWWWWWWWk..', '..kWWwWWWwWk..', '..kWkWWWWkWk..', '..kWkk..kkWk..', '..kk......kk..'] },
  };
  function pix(look) {
    const L = LOOK[look] || LOOK.human, S = 3, Wd = Math.max(...L.map.map(r => r.length));
    return mk(Wd * S, L.map.length * S, g => L.map.forEach((row, y) => [...row].forEach((ch, x) => { if (L.pal[ch]) { g.fillStyle = L.pal[ch]; g.fillRect(x * S, y * S, S, S); } })));
  }
  const img = k => cache[k] || (cache[k] = k.startsWith('L_') ? pix(k.slice(2)) : mk(40, 44, g => (MARK[k] || MARK.sign)(g)));
  const halo = () => cache._halo || (cache._halo = mk(96, 48, g => { const gr = g.createRadialGradient(48, 24, 0, 48, 24, 46); gr.addColorStop(0, 'rgba(255,214,110,0.55)'); gr.addColorStop(0.5, 'rgba(255,190,80,0.2)'); gr.addColorStop(1, 'rgba(255,190,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, 96, 48); }));
  const glowImg = () => cache._glow || (cache._glow = mk(128, 128, g => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,200,90,0.9)'); gr.addColorStop(0.4, 'rgba(255,170,60,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }));
  const onScr = (x, y, m = 80) => x > G.cam.x - m && x < G.cam.x + VW + m && y > G.cam.y - m && y < G.cam.y + VH + m;
  function draw(g) {
    const w = G.world, c = w && w.chap; if (!c) return;
    const t = G.time, pl = G.pl;
    for (const ev of c.evs) {
      const d = ChapterMaps.evDef(w, ev); if (!d || (d.kind === 'collect' && ev.done) || !onScr(ev.x, ev.y)) continue;
      const lk = !ev.done && typeof ChapEv !== 'undefined' && ChapEv.locked(w, ev), on = !ev.done && !lk, x = ev.x, y = ev.y + 10, ph = ev.tx * 0.7 + ev.ty;   // lk：被區域首領鎖住（畫成暗的、不發光）
      g.save();
      if (on) { g.globalAlpha = 0.65 + 0.3 * Math.sin(t * 2.2 + ph); g.drawImage(halo(), x - 48, y - 26); g.globalAlpha = 1; }
      if (ev.amb) { g.strokeStyle = `rgba(255,90,60,${0.5 + 0.3 * Math.sin(t * 6)})`; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, 120, 60, 0, 0, Math.PI * 2); g.stroke(); }
      let top = y - 40;
      if (typeof drawChapArt === 'function' && drawChapArt(g, ev, d)) { /* 美術畫好了 */ }
      else if (d.kind === 'npc') {
        const im = img('L_' + (d.look || 'human')), ghost = d.look === 'ghost', fl = ghost ? Math.sin(t * 2 + ph) * 3 - 4 : 0;
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y, 11, 4, 0, 0, Math.PI * 2); g.fill();
        if (ghost) g.globalAlpha = on ? 0.7 : 0.4; else if (!on) g.globalAlpha = 0.75;
        const br = Math.sin(t * 2.5 + ph) > 0.6 ? 1 : 0;   // 呼吸：偶爾往上 1 像素
        g.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height + fl - br)); top = y - im.height + fl - 4;
        g.globalAlpha = 1;
      } else {
        const bob = on ? Math.sin(t * 2.6 + ph) * 2 : 0;
        if (!on) g.globalAlpha = 0.5;
        g.drawImage(img(d.marker || 'sign'), x - 20, y - 38 + bob);
        if (d.marker === 'lamp') { const f = 0.8 + 0.2 * Math.sin(t * 14 + ph); g.fillStyle = on ? `rgba(255,${180 + 50 * f | 0},80,0.95)` : 'rgba(120,100,70,0.8)'; g.beginPath(); g.ellipse(x, y - 15 + bob, 2.5 * f, 4.5 * f, 0, 0, Math.PI * 2); g.fill(); }
        if (d.marker === 'crystal' && on) { g.fillStyle = `rgba(220,250,255,${0.5 + 0.5 * Math.sin(t * 5 + ph)})`; g.fillRect(x - 1, y - 30 + bob, 2, 2); }
        g.globalAlpha = 1;
      }
      g.restore();
      if (on) {
        txt(g, "！", x, top - 8 + Math.sin(t * 5 + ph) * 2.5, 16, '#ffd36a', 'center');
        if (pl && Math.hypot(pl.x - x, pl.y - y) < 300) txt(g, d.kind === 'npc' ? (d.who || '夢裡的人') : (d.title || ''), x, top - 26, 11, '#ffe6a0', 'center');
        if (Math.random() < 0.06) G.parts.push({ x: x + rnd(-14, 14), y: y - rnd(0, 20), vx: rnd(-6, 6), vy: -rnd(20, 40), t: 0, dur: rnd(0.6, 1.1), color: Math.random() < 0.5 ? '#ffd36a' : '#fff0c0', s: 2 });
      } else if (lk) { if (pl && Math.hypot(pl.x - x, pl.y - y) < 300) txt(g, `先打倒『${lk}』`, x, top - 8, 11, '#ffb070', 'center'); }
      else if (d.kind === 'npc' && pl && Math.hypot(pl.x - x, pl.y - y) < 200) txt(g, d.who || '', x, top - 6, 10, '#bfb59a', 'center');
    }
  }
  function light(cut, cx, cy) {
    const w = G.world, c = w && w.chap; if (!c) return;
    for (const ev of c.evs) { if (ev.kind === 'collect' && ev.done) continue; const x = ev.x - cx, y = ev.y - cy; if (x > -120 && x < VW + 120 && y > -120 && y < VH + 120) cut(x, y, ev.done ? 46 : 100, ev.done ? 0.25 : 0.6); }
  }
  function glow(g, cx, cy) {
    const w = G.world, c = w && w.chap; if (!c) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const ev of c.evs) { if (ev.done || (typeof ChapEv !== 'undefined' && ChapEv.locked(w, ev))) continue; const x = ev.x - cx, y = ev.y - cy; if (x < -80 || x > VW + 80 || y < -80 || y > VH + 80) continue;
      g.globalAlpha = 0.22 + 0.08 * Math.sin(G.time * 2.2 + ev.tx); g.drawImage(glowImg(), x - 56, y - 64, 112, 112); }
    g.restore();
  }
  return { draw, light, glow, img, MARK, LOOK };
})();
Hook.on('drawWorld', g => { try { ChapArt.draw(g); } catch (e) { console.error('[ChapArt]', e); } });
Hook.on('light', (cut, cx, cy) => ChapArt.light(cut, cx, cy));
Hook.on('glow', (g, cx, cy) => ChapArt.glow(g, cx, cy));
