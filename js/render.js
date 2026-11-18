// =============================================================
//  畫面繪製：世界、角色、特效、HUD（生命球、技能列、小地圖）
// =============================================================
G.cam = { x: 0, y: 0 };
let CV, CTX, SCALE = 1, DARK, DARKG;
const FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

function initRender(canvas) {
  CV = canvas; CTX = canvas.getContext('2d');
  DARK = document.createElement('canvas'); DARK.width = VW; DARK.height = VH; DARKG = DARK.getContext('2d');
  resizeCanvas(); window.addEventListener('resize', resizeCanvas);
}
// v2.12.3 畫面大小照「實際看得到的範圍」算：手機瀏覽器的網址列、外層網頁的框會蓋住一部分，
// mobilefit.js 量到之後放在 VISBOX（{x,y,w,h}，沒被蓋住時是 null），畫布就排在那個範圍的正中間
let VISBOX = null;
function resizeCanvas() {
  const b = VISBOX || { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
  const s = Math.min(b.w / VW, b.h / VH);
  const cw = Math.floor(VW * s), ch = Math.floor(VH * s);
  CV.style.width = cw + 'px'; CV.style.height = ch + 'px';
  Object.assign(CV.style, { position: 'fixed', left: Math.round(b.x + (b.w - cw) / 2) + 'px', top: Math.round(b.y + (b.h - ch) / 2) + 'px' });
  const dpr = window.devicePixelRatio || 1;
  CV.width = Math.floor(cw * dpr); CV.height = Math.floor(ch * dpr);
  SCALE = CV.width / VW;
}

// moving＝要不要播跑步動畫（素材包的角色與怪物有站著／跑步兩組動畫）；seed 讓同一群怪不會同步
function drawSprite(g, name, x, y, scale, facing, tint, flash, bob = 0, moving = false, seed = 0) {
  const sp = getSprite(name, scale, tint, flash);
  let fr = sp;
  if (sp.anim) { const set = moving ? sp.run : sp.idle; fr = set[Math.floor(G.time * (moving ? 10 : 5) + seed) % set.length]; bob = Math.min(bob, 0); }
  g.drawImage(facing < 0 ? fr.l : fr.r, Math.round(x - sp.w / 2), Math.round(y - sp.h + bob));
  sp._img = facing < 0 ? fr.l : fr.r; sp._x = Math.round(x - sp.w / 2); sp._y = Math.round(y - sp.h + bob);   // v2.5.1 給「裝備上色」用
  return sp;
}
function shadow(g, x, y, r) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); g.fill(); }
function txt(g, s, x, y, size, color, align = 'left', outline = true) {
  g.font = `${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle';
  if (outline) { g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3; g.strokeText(s, x, y); }
  g.fillStyle = color; g.fillText(s, x, y);
}

function render() {
  const g = CTX;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#07060a'; g.fillRect(0, 0, VW, VH);
  if (G.state !== 'play' || !G.P) return;
  const pl = G.pl, w = G.world;
  let cx = pl.x - VW / 2, cy = pl.y - VH / 2;
  if (w.W * TS > VW) cx = clamp(cx, -40, w.W * TS - VW + 40); else cx = (w.W * TS - VW) / 2;
  if (w.H * TS > VH) cy = clamp(cy, -40, w.H * TS - VH + 40); else cy = (w.H * TS - VH) / 2;
  if (G.shake > 0) { const sh = G.shake * CFG.shake / 100; cx += rnd(-sh, sh); cy += rnd(-sh, sh); }   // v2.4 震動強度可調
  G.cam.x = cx; G.cam.y = cy;
  g.save();
  g.translate(-Math.round(cx), -Math.round(cy));
  // 地圖
  const sx = Math.max(0, Math.floor(cx)), sy = Math.max(0, Math.floor(cy));
  const sw = Math.min(w.canvas.width - sx, VW + 2), sh = Math.min(w.canvas.height - sy, VH + 2);
  if (sw > 0 && sh > 0) g.drawImage(w.canvas, sx, sy, sw, sh, sx, sy, sw, sh);
  // 城鎮裝飾
  if (w.kind === 'town') drawTownDeco(g, w);
  if (w.portal) { if (w.kind === 'town' && w.fireGate) txt(g, `${TOWN_TEXT.device}（營火・新的夢）`, w.portal.x, w.portal.y - 46, 12, '#ffcf60', 'center'); else drawPortal(g, w.portal.x, w.portal.y, w.kind === 'town' ? '#ffcf60' : '#70b0ff', w.kind === 'town' ? `${TOWN_TEXT.device}（新的夢）` : w.portal.toHub ? `前往新營地：${HUB_BY_ID[w.portal.toHub].name}` : `回到${(HUB_BY_ID[G.P && G.P.hub] || {}).name || '營地'}`); }   // v2.8.13 營地的夢之門＝中間的營火
  // 地面火焰
  for (const z of G.zones) {
    const a = 0.22 + Math.sin(G.time * 12 + z.x) * 0.05;
    const zc = ELEM_COLOR[z.elem || 'fire'];
    g.globalAlpha = a; g.fillStyle = zc; g.beginPath(); g.arc(z.x, z.y, z.r, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    if (Math.random() < 0.5) G.parts.push({ x: z.x + rnd(-z.r, z.r) * 0.8, y: z.y + rnd(-z.r, z.r) * 0.6, vx: 0, vy: -40, t: 0, dur: 0.5, color: zc, s: 3 });
  }
  // 玩家的地面效果（荊棘、暴風雪）
  for (const z of G.azones) {
    if (z.sid === 'thorn') continue;   // v2.13.9 荊棘綻放有自己的畫法（thornfx.js）
    const fade = Math.min(1, (z.dur - z.t) * 2);
    g.globalAlpha = 0.28 * fade; g.fillStyle = z.color; g.beginPath(); g.arc(z.x, z.y, z.r, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.7 * fade; g.strokeStyle = z.color; g.lineWidth = 2; g.beginPath(); g.arc(z.x, z.y, z.r, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1;
    if (Math.random() < 0.6) {
      const a = Math.random() * Math.PI * 2, rr = Math.random() * z.r;
      G.parts.push({ x: z.x + Math.cos(a) * rr, y: z.y + Math.sin(a) * rr * 0.7, vx: z.chill ? rnd(-30, 30) : 0, vy: z.chill ? 60 : -30, t: 0, dur: 0.6, color: z.chill ? '#ffffff' : '#4aa04a', s: z.chill ? 2 : 3 });
    }
  }
  if (typeof drawStageExtras === "function") drawStageExtras(g);   // v2.8.4 小關卡的出口門
  // v2.7.4 按 F 會互動的人物／傳送門：金色外框
  if (G.nearAct && G.nearAct.kind !== 'loot' && G.nearAct.ref) { const t = G.nearAct.ref, p = 0.55 + 0.45 * Math.sin(G.time * 6), R = t.r ? t.r + 10 : 24; g.strokeStyle = `rgba(255,220,120,${p})`; g.lineWidth = 2; g.beginPath(); g.ellipse(t.x, t.y + 4, R, R * 0.45, 0, 0, Math.PI * 2); g.stroke(); const s = R + 4, y0 = t.y - 30; g.beginPath(); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx2 = t.x + sx * s * 0.8, cy2 = y0 + 14 + sy * (s * 0.95); g.moveTo(cx2, cy2 - sy * 8); g.lineTo(cx2, cy2); g.lineTo(cx2 - sx * 8, cy2); } g.stroke(); }
  // 預警
  for (const t of G.teles) {
    const p = t.t / t.dur;
    g.strokeStyle = t.color; g.lineWidth = 2; g.globalAlpha = 0.9;
    if (t.shape === 'circle') {
      g.beginPath(); g.arc(t.x, t.y, t.r, 0, Math.PI * 2); g.stroke();
      g.fillStyle = t.color; g.globalAlpha = 0.25; g.beginPath(); g.arc(t.x, t.y, t.r * p, 0, Math.PI * 2); g.fill();
    } else {
      g.save(); g.translate(t.x, t.y); g.rotate(t.ang);
      g.strokeRect(0, -t.r / 2, t.len, t.r); g.fillStyle = t.color; g.globalAlpha = 0.25; g.fillRect(0, -t.r / 2, t.len * p, t.r);
      g.restore();
    }
    g.globalAlpha = 1;
  }
  // 掉落物（光柱）
  for (const l of G.loot) {
    if (lootHidden(l) || (l.item && l.item.rarity === 'normal' && !G.showNormal && !isFlask(l.item))) continue;   // v2.7 掉落篩選：藏起來的連圖示都不畫
    if (l.item && l.item.rarity === 'unique') {
      const gr = g.createLinearGradient(0, l.y - 120, 0, l.y);
      gr.addColorStop(0, 'rgba(232,128,58,0)'); gr.addColorStop(1, 'rgba(232,128,58,0.55)');
      g.fillStyle = gr; g.fillRect(l.x - 5, l.y - 120, 10, 120);
    }
    // 地上的物品：用跟背包一樣的圖示（art.js），下面有一圈淡淡的光
    const bob = Math.sin(G.time * 3 + l.x * 0.1) * 1.5;
    const icon = isFlask(l.item) ? flaskIcon(l.item.type, 64) : l.item ? itemIcon(BASE_BY_ID[l.item.base], 64)
      : l.gem ? supportIcon(l.gem, 48) : l.skill ? skillIcon(l.skill, 48) : l.cur ? currencyIcon(l.cur, 48) : l.stackItem ? (l.stackItem.stack === 'cur' ? currencyIcon(l.stackItem.key, 48) : null) : l.mat ? matIcon(l.mat.slice(0, l.mat.lastIndexOf("_")), +l.mat.slice(l.mat.lastIndexOf("_") + 1), 48) : null;
    if (icon) {
      const rc = l.item ? RARITY_COLOR[l.item.rarity] : l.gem ? SUPPORTS[l.gem].color : l.skill ? '#ffd27a' : '#e8d8a8';
      g.globalAlpha = 0.28; g.fillStyle = rc; g.beginPath(); g.ellipse(l.x, l.y + 8, 11, 4, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      const sz = l.item ? 24 : 18;
      g.imageSmoothingEnabled = true; g.drawImage(icon, l.x - sz / 2, l.y - sz / 2 + bob, sz, sz); g.imageSmoothingEnabled = false;
    }
    else if (l.jewel) {
      g.fillStyle = l.color; g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(l.x + Math.cos(a) * 6, l.y + Math.sin(a) * 6); }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(l.x - 2, l.y - 3, 2, 2);
    }
    else if ((l.frag || l.key) && typeof drawLootArt === 'function' && drawLootArt(g, l, bob)) { /* v2.9 碎片、鑰匙新圖 */ }
    else if (l.frag || l.key) {
      const c = NIGHTMARES[l.frag || l.key].color;
      g.fillStyle = c; g.strokeStyle = '#000'; g.lineWidth = 1;
      if (l.key) { g.fillRect(l.x - 6, l.y - 2, 12, 4); g.fillRect(l.x + 3, l.y - 1, 2, 6); g.beginPath(); g.arc(l.x - 7, l.y, 4, 0, Math.PI * 2); g.fill(); }
      else { g.beginPath(); g.moveTo(l.x, l.y - 7); g.lineTo(l.x + 6, l.y + 4); g.lineTo(l.x - 6, l.y + 4); g.closePath(); g.fill(); g.stroke(); }
      if (l.key) { const gr = g.createLinearGradient(0, l.y - 90, 0, l.y); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, c); g.globalAlpha = 0.4; g.fillStyle = gr; g.fillRect(l.x - 4, l.y - 90, 8, 90); g.globalAlpha = 1; }
    }
    else if (l.gem) {
      g.fillStyle = SUPPORTS[l.gem].color; g.strokeStyle = '#000'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(l.x, l.y - 7); g.lineTo(l.x + 5, l.y); g.lineTo(l.x, l.y + 7); g.lineTo(l.x - 5, l.y); g.closePath(); g.fill(); g.stroke();
    }
    else { g.fillStyle = CURRENCY[l.cur].color; g.beginPath(); g.arc(l.x, l.y, 5, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke(); }
  }
  // 角色與怪物（依 y 排序）
  const ents = [...G.mons.filter(m => m.boss || (m.x > cx - 120 && m.x < cx + VW + 120 && m.y > cy - 140 && m.y < cy + VH + 160)), ...G.mins, pl].sort((a, b) => a.y - b.y);   // v2.12.1 畫面外的怪不畫（深層夢境一區有幾百隻）
  for (const e of ents) {
    if (e === pl) drawPlayer(g, pl);
    else if (e.kind === 'min') {
      shadow(g, e.x, e.y + e.r * 0.8, e.r);
      const spr = e.sprite || { skel: 'minion', wolf: 'mwolf', spirit: 'mspirit', golem: 'mgolem' }[e.mtype] || 'minion';
      const bob = e.mtype === 'spirit' ? Math.sin(G.time * 6 + e.x) * 3 - 6 : 0;
      if (e.ghost) g.globalAlpha = 0.55;   // v2.17 殘影（套裝）半透明
      const sp = drawSprite(g, spr, e.x, e.y + e.r * 0.8, e.mscale || (e.mtype === 'golem' ? 3 : 2), e.facing, e.tint || null, e.flash > 0, bob, true, (e.x | 0) % 4);   // v2.17 召喚物可以自帶大小、顏色（大白）
      g.globalAlpha = 1;
      lifeBar(g, e.x, e.y + e.r * 0.8 - sp.h - 6, 22, e.life / e.maxLife, '#60e060');
    } else drawMonster(g, e);
  }
  Hook.emit('drawOver', g);   // v2.9.6 畫在角色和怪物上面的東西（世界座標）：擋在前面的立體樹
  // 投射物
  // v2.5.5 屍體（屍爆用）與陷阱
  for (const k of G.corpses || []) { g.globalAlpha = Math.max(0, 0.45 - k.t / 30); g.fillStyle = "#3a0c0c"; g.beginPath(); g.ellipse(k.x, k.y + 8, 11, 4, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#d8ccb4"; g.fillRect(k.x - 4, k.y + 5, 3, 2); g.fillRect(k.x + 2, k.y + 7, 3, 2); }
  g.globalAlpha = 1;
  for (const t of G.traps || []) {
    const armed = t.t >= 0.4, pulse = 0.5 + 0.5 * Math.sin(G.time * 6 + t.x);
    g.strokeStyle = t.color; g.globalAlpha = armed ? 0.35 + 0.3 * pulse : 0.3; g.lineWidth = 1.5; g.beginPath(); g.arc(t.x, t.y, 45, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1; g.fillStyle = "#2a3a1a"; g.beginPath(); g.arc(t.x, t.y, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = armed ? t.color : "#6a7a5a"; g.beginPath(); g.arc(t.x, t.y, 4, 0, Math.PI * 2); g.fill();
  }
  for (const p of G.projs) {
    if (typeof drawProjArt === "function" && drawProjArt(g, p)) continue;   // v2.8.7 美術工作階段可以接手畫投射物（回傳 true＝已經畫好）
    if (p.sprite === "axe") { // 迴旋飛斧：轉圈的斧頭
      g.save(); g.translate(p.x, p.y); g.rotate(p.spin || 0);
      g.strokeStyle = "#6a4a2a"; g.lineWidth = 3; g.beginPath(); g.moveTo(-9, 0); g.lineTo(9, 0); g.stroke();
      g.fillStyle = "#d0d4dc"; g.beginPath(); g.moveTo(5, -1); g.quadraticCurveTo(14, -10, 9, 7); g.closePath(); g.fill(); g.strokeStyle = "#2a2a30"; g.lineWidth = 1; g.stroke();
      g.restore(); continue;
    }
    if (p.orb) { g.fillStyle = "rgba(255,240,140,0.25)"; g.beginPath(); g.arc(p.x, p.y, 16 + Math.sin(G.time * 20) * 3, 0, Math.PI * 2); g.fill(); }
    if (p.sprite === "arrow") {
      const a = Math.atan2(p.vy, p.vx);
      g.strokeStyle = p.team === 'ally' ? '#e8d8a0' : '#c8b088'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(p.x - Math.cos(a) * 12, p.y - Math.sin(a) * 12); g.lineTo(p.x, p.y); g.stroke();
      g.fillStyle = '#ffffff'; g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    } else if (p.sprite === 'fireball') {
      g.fillStyle = 'rgba(255,120,30,0.35)'; g.beginPath(); g.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = p.team === 'ally' ? '#ffb040' : '#ff5a20'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff0a0'; g.beginPath(); g.arc(p.x, p.y, p.r * 0.45, 0, Math.PI * 2); g.fill();
    } else if (p.sprite === 'orb') { // 各元素的法術彈
      const c = p.color || '#d8d0c0';
      g.globalAlpha = 0.35; g.fillStyle = c; g.beginPath(); g.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      g.fillStyle = c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(p.x - 1, p.y - 2, 2, 2);
    } else if (p.sprite === 'shadow') {
      g.fillStyle = 'rgba(160,110,255,0.35)'; g.beginPath(); g.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c8a8ff'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
    } else if (p.sprite === 'iceshard') {
      const a = Math.atan2(p.vy, p.vx);
      g.save(); g.translate(p.x, p.y); g.rotate(a);
      g.fillStyle = '#c8f4ff'; g.beginPath(); g.moveTo(9, 0); g.lineTo(0, 4); g.lineTo(-9, 0); g.lineTo(0, -4); g.closePath(); g.fill();
      g.restore();
    }
  }
  // 特效
  for (const f of G.fx) {
    const p = f.t / f.dur;
    g.globalAlpha = 1 - p;
    if (typeof drawFxArt === 'function' && drawFxArt(g, f, p)) { g.globalAlpha = 1; continue; }   // v2.9 美術工作階段的特效新圖
    if (f.k === 'line') {
      g.strokeStyle = f.color; g.lineWidth = f.w || 3;
      g.beginPath(); g.moveTo(f.x1, f.y1); g.lineTo(f.x2, f.y2); g.stroke();
    } else if (f.k === 'corpse') {
      const sp = getSprite(f.sprite, f.scale, f.tint, p < 0.15);
      g.save(); g.translate(f.x + f.kx * p, f.y); g.rotate(f.facing * Math.min(1, p * 4) * Math.PI / 2);
      g.drawImage(f.facing < 0 ? sp.l : sp.r, -sp.w / 2, -sp.h); g.restore();
    } else if (f.k === 'slash') {
      g.strokeStyle = f.color; g.lineWidth = 3;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(f.x, f.y, f.r * (0.6 + i * 0.2), f.ang - f.arc / 2, f.ang + f.arc / 2); g.stroke(); }
    } else if (f.k === 'boom') {
      // 爆炸：一開始很亮的閃光，接著火球膨脹、衝擊波往外推、最後變成煙
      const R = f.r, e = 1 - Math.pow(1 - p, 3);
      g.globalCompositeOperation = 'lighter';
      const core = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, R * (0.35 + e * 0.75));
      core.addColorStop(0, `rgba(255,250,220,${0.95 * (1 - p)})`); core.addColorStop(0.35, `rgba(255,180,70,${0.85 * (1 - p)})`);
      core.addColorStop(0.75, `rgba(220,70,20,${0.5 * (1 - p)})`); core.addColorStop(1, 'rgba(120,20,0,0)');
      g.fillStyle = core; g.beginPath(); g.arc(f.x, f.y, R * (0.35 + e * 0.75), 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = `rgba(255,220,150,${0.8 * (1 - p)})`; g.lineWidth = 4 * (1 - p) + 1;
      g.beginPath(); g.arc(f.x, f.y, R * (0.4 + e * 0.9), 0, Math.PI * 2); g.stroke();
      if (p > 0.35) { g.fillStyle = `rgba(40,30,30,${0.35 * (1 - p)})`; g.beginPath(); g.arc(f.x, f.y - p * 14, R * 0.7 * p, 0, Math.PI * 2); g.fill(); }
    } else if (f.k === 'spark') {
      // v2.3 命中火花：一個白色亮點＋朝受擊方向噴出的幾道光
      const R = (f.big ? 26 : 16) * (0.4 + p * 0.8);
      g.globalAlpha = (1 - p) * 0.9; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(f.x, f.y, (f.big ? 9 : 6) * (1 - p), 0, Math.PI * 2); g.fill();
      g.strokeStyle = f.color; g.lineWidth = f.big ? 3 : 2; g.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { const a = f.a + i * 0.5; g.beginPath(); g.moveTo(f.x + Math.cos(a) * R * 0.35, f.y + Math.sin(a) * R * 0.35); g.lineTo(f.x + Math.cos(a) * R * (i === 0 ? 1.5 : 1), f.y + Math.sin(a) * R * (i === 0 ? 1.5 : 1)); g.stroke(); }
      g.lineCap = 'butt';
    } else if (f.k === 'ring') {
      const r = f.r * (0.5 + p * 0.5);
      if (f.fill) { g.fillStyle = f.fill; g.beginPath(); g.arc(f.x, f.y, r, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = f.color; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, r, 0, Math.PI * 2); g.stroke();
    } else if (f.k === 'bolt') {
      g.strokeStyle = f.color; g.lineWidth = 2;
      for (let rep = 0; rep < 2; rep++) {
        g.beginPath(); g.moveTo(f.pts[0].x, f.pts[0].y);
        for (let i = 1; i < f.pts.length; i++) {
          const a = f.pts[i - 1], b = f.pts[i];
          for (let s = 1; s <= 4; s++) g.lineTo(a.x + (b.x - a.x) * s / 4 + (s < 4 ? rnd(-9, 9) : 0), a.y + (b.y - a.y) * s / 4 + (s < 4 ? rnd(-9, 9) : 0));
        }
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  }
  for (const p of G.parts) { g.globalAlpha = 1 - p.t / p.dur; g.fillStyle = p.color; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  // 偷取：光點從怪物飛回角色
  if (G.leechFx && G.leechFx.length) {
    g.globalAlpha = 1; g.globalCompositeOperation = 'lighter';
    for (const f of G.leechFx) {
      f.t += 1 / 60; const k = Math.min(1, 0.06 + f.t * 0.5);
      f.x += (pl.x - f.x) * k; f.y += (pl.y - 6 - f.y) * k;
      const gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, 6); gr.addColorStop(0, f.col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(f.x - 6, f.y - 6, 12, 12);
      if (Math.hypot(pl.x - f.x, pl.y - 6 - f.y) < 8 || f.t > 1.2) f.done = true;
    }
    g.globalCompositeOperation = 'source-over';
    G.leechFx = G.leechFx.filter(f => !f.done);
  }
  g.globalAlpha = 1;
  for (const t of G.texts) { if (t.pop && (CFG.dmgNum === 'off' || (CFG.dmgNum === 'crit' && t.pop < 1))) continue; g.globalAlpha = Math.min(1, 2 - t.t / t.dur * 2); const k = t.pop ? 1 + t.pop * Math.max(0, 1 - t.t / 0.14) : 1; txt(g, t.txt, t.x, t.y, Math.round(t.size * k), t.color, 'center'); }
  g.globalAlpha = 1;
  // 互動提示：「F 對話」「F 回到夢裡」…（手機版顯示在按鈕上，這裡就不畫）
  if (G.nearAct && !IS_TOUCH) {
    const a = G.nearAct, lb = a.label, yy = a.ref.y - (a.kind === 'npc' ? 58 : 50) + Math.sin(G.time * 4) * 2;
    g.font = `bold 12px ${FONT}`; const tw = g.measureText(lb).width + 34;
    g.fillStyle = 'rgba(10,8,6,0.85)'; roundRect(g, a.ref.x - tw / 2, yy - 11, tw, 22, 5); g.fill();
    g.strokeStyle = '#c8a060'; g.lineWidth = 1; roundRect(g, a.ref.x - tw / 2 + 0.5, yy - 10.5, tw - 1, 21, 5); g.stroke();
    g.fillStyle = '#e8c878'; roundRect(g, a.ref.x - tw / 2 + 4, yy - 8, 16, 16, 3); g.fill();
    txt(g, 'F', a.ref.x - tw / 2 + 12, yy + 0.5, 11, '#1a1208', 'center', false);
    txt(g, lb, a.ref.x - tw / 2 + 25, yy + 0.5, 12, '#f2e2b8', 'left', false);
  }
  g.restore();

  // 黑暗與光源
  const dg = DARKG;
  dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, VW, VH);
  dg.fillStyle = w.kind === 'town' ? 'rgba(10,8,20,0.28)' : 'rgba(4,3,8,0.9)'; dg.fillRect(0, 0, VW, VH);
  dg.globalCompositeOperation = 'destination-out';
  const light = (x, y, r, a = 1) => {
    const gr = dg.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.6, `rgba(0,0,0,${a * 0.7})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    dg.fillStyle = gr; dg.beginPath(); dg.arc(x, y, r, 0, Math.PI * 2); dg.fill();
  };
  light(pl.x - cx, pl.y - cy, w.kind === 'town' ? 600 : (w.mm && w.mm.flags && w.mm.flags.mdark) ? 220 : 340);   // v2.7 濃霧詞綴
  for (const p of G.projs) if (p.sprite === 'fireball') light(p.x - cx, p.y - cy, 70, 0.6);
  for (const z of G.zones) light(z.x - cx, z.y - cy, z.r + 30, 0.5);
  if (w.portal) light(w.portal.x - cx, w.portal.y - cy, 120, 0.7);
  if (G.bossBar && G.bossBar.awake) light(G.bossBar.x - cx, G.bossBar.y - cy, 120, 0.5);
  Hook.emit('light', light, cx, cy);   // v2.9.6 其他模組在黑暗上挖光（螢幕座標）
  g.drawImage(DARK, 0, 0, VW, VH);
  // 稍微染上主題色；角色身邊有一圈暖色的光
  g.fillStyle = w.theme.light; g.globalAlpha = 0.04; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1;
  const lr = w.kind === 'town' ? 600 : 340;
  g.globalCompositeOperation = 'soft-light';
  const wl = g.createRadialGradient(pl.x - cx, pl.y - cy, 0, pl.x - cx, pl.y - cy, lr * 0.8);
  wl.addColorStop(0, w.theme.light); wl.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.35; g.fillStyle = wl; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  Hook.emit('glow', g, cx, cy);   // v2.9.6 彩色光（螢幕座標）
  // 環境粒子（雪、餘燼、落葉…）
  drawAmbient(g, w, cx, cy, lr);
  // 畫面四周暗角
  const vg = g.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  g.fillStyle = vg; g.fillRect(0, 0, VW, VH);

  // 受重擊時畫面邊緣泛紅
  if (G.hurt > 0) {
    G.hurt -= 1 / 60;
    const gr = g.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.65);
    gr.addColorStop(0, 'rgba(160,0,0,0)'); gr.addColorStop(1, `rgba(160,0,0,${Math.min(0.5, G.hurt)})`);
    g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
  }
  // v2.0 低血警示：生命低於 35% 時畫面邊緣一直有紅色，越低越紅、像心跳一樣一縮一放
  if (CFG.lowLife && G.pl && G.S && !G.dead && G.pl.life < G.S.maxLife * LOW_LIFE) {
    const k = 1 - G.pl.life / (G.S.maxLife * LOW_LIFE);               // 0（剛跌破）→ 1（快死了）
    const beat = 0.5 + 0.5 * Math.pow(Math.abs(Math.sin(G.time * (2.2 + k * 2))), 3); // 越危險心跳越快
    const a = (0.42 + 0.33 * k) * (0.65 + 0.35 * beat);
    const gr = g.createRadialGradient(VW / 2, VH / 2, VH * (0.42 - 0.08 * k), VW / 2, VH / 2, VW * 0.62);
    gr.addColorStop(0, 'rgba(200,0,0,0)'); gr.addColorStop(0.7, `rgba(190,0,0,${a * 0.45})`); gr.addColorStop(1, `rgba(170,0,0,${a})`);
    g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
  }
  drawLootLabels(g, cx, cy);
  drawHUD(g);
}

const ICON_IMG = {};
function iconImg(cls) {
  if (!ICON_IMG[cls]) { const im = new Image(); im.src = getIcon(cls, 2); ICON_IMG[cls] = im; }
  return ICON_IMG[cls].complete ? ICON_IMG[cls] : null;
}
function lifeBar(g, x, y, w, frac, color) {
  g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
  g.fillStyle = color; g.fillRect(x - w / 2, y, w * clamp(frac, 0, 1), 3);
}
function drawMonster(g, m) {
  const feet = m.y + m.r * 0.8;
  shadow(g, m.x, feet, m.r);
  if (m.rarity === 'magic' || m.rarity === 'rare') {
    g.strokeStyle = m.rarity === 'rare' ? 'rgba(255,255,120,0.7)' : 'rgba(120,130,255,0.7)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(m.x, feet, m.r + 3, (m.r + 3) * 0.45, 0, 0, Math.PI * 2); g.stroke();
  }
  let bob = (m.state === 'wind' || m.casting) ? -3 : Math.sin(G.time * 8 + m.x) * 1;
  if (m.type === 'bat' || m.type === 'wisp') bob += Math.sin(G.time * 10 + m.x) * 3 - 6;
  let tint = m.tint;
  if (m.frozen > 0) { tint = Object.assign({}, tint || {}, chillTint(m, '#dff6ff')); bob = 0; }
  else if (m.chill > 0) tint = Object.assign({}, tint || {}, chillTint(m, '#9fdcff'));
  // v2.3 受擊的瞬間被打扁一下再彈回來
  const sq = m.squash > 0 ? Math.min(1, m.squash / 0.1) : 0; if (m.squash > 0) m.squash -= 1 / 60;
  if (sq) { g.save(); g.translate(m.x, feet); g.scale(1 + 0.2 * sq, 1 - 0.16 * sq); g.translate(-m.x, -feet); }
  if (m.alpha) g.globalAlpha = m.alpha;   // 半透明的怪（上一個我的殘影）
  const sp = drawSprite(g, m.def.sprite, m.x, feet, m.scale, m.facing, tint, m.flash > 0, bob, !!m.aggro && !(m.frozen > 0), (m.x | 0) % 4);
  g.globalAlpha = 1;
  if (sq) g.restore();
  // 異常狀態特效（v1.2：更明顯，頭上也有小圖示）
  drawAilmentFx(g, m, feet, sp.h, m.r, monAilState(m), m.boss ? 14 : (m.rarity !== 'normal' && dist(m, G.pl) < 360) ? (m.mods.length ? 44 : 31) : 17);
  if (m.addElem) { g.fillStyle = m.addElem === 'fire' ? 'rgba(255,100,30,0.25)' : m.addElem === 'chaos' ? 'rgba(100,220,90,0.25)' : 'rgba(120,200,255,0.25)'; g.beginPath(); g.arc(m.x, m.y - 4, m.r + 4, 0, Math.PI * 2); g.fill(); }
  const top = feet - sp.h - 6;
  if (m.boss) return;
  if (m.life < m.maxLife || m.rarity !== 'normal') lifeBar(g, m.x, top, Math.max(26, m.r * 2.4), m.life / m.maxLife, m.rarity === 'rare' ? '#e8d040' : m.rarity === 'magic' ? '#8088ff' : '#d03030');
  if (m.rarity === 'rare' || m.rarity === 'magic') {
    if (dist(m, G.pl) < 360) {
      txt(g, m.name, m.x, top - 10, 11, m.rarity === 'rare' ? '#ffff77' : '#9aa0ff', 'center');
      if (m.mods.length) txt(g, m.mods.join('・'), m.x, top - 23, 10, '#d0c8b0', 'center');
    }
  }
}
function chillTint(m, col) {
  const pal = SPRITE_PAL[m.def.sprite]; const o = {};
  for (const k in pal) if (k !== 'k') o[k] = col;
  return o;
}
// =============================================================
//  異常狀態特效（怪物和角色共用）：燃燒的火焰、冰緩的霜圈、冰凍的冰塊、
//  感電的閃電、中毒的綠泡泡、流血的血滴；頭上還有小圖示
// =============================================================
const AIL_ICON = [['ign', '燃', '#ff7a30'], ['frozen', '凍', '#bfefff'], ['chill', '緩', '#7fd0ff'], ['shock', '電', '#ffe95a'], ['poison', '毒', '#7ae060'], ['bleed', '血', '#e83a3a']];
function monAilState(m) { return { ign: !!m.ign, chill: m.chill > 0, frozen: m.frozen > 0, shock: m.shock > 0, poison: m.poisons ? m.poisons.length : 0, bleed: !!m.bleed }; }
function plAilState(pl) { const a = pl.ail || {}; return { ign: !!a.ign, chill: a.chill > 0, frozen: a.frozen > 0, shock: a.shock > 0, poison: a.poison ? a.poison.length : 0, bleed: !!a.bleed }; }
function drawAilmentFx(g, e, feet, h, r, st, iconOff = 16) {
  const t = G.time, cx = e.x, top = feet - h;
  if (st.chill || st.frozen) { // 腳下的霜圈
    g.strokeStyle = st.frozen ? 'rgba(220,245,255,0.9)' : 'rgba(130,200,255,0.75)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(cx, feet, r + 6, (r + 6) * 0.42, 0, 0, Math.PI * 2); g.stroke();
    if (Math.random() < 0.25) G.parts.push({ x: cx + rnd(-r, r), y: top + rnd(0, h * 0.6), vx: rnd(-8, 8), vy: 22, t: 0, dur: 0.6, color: '#e8f8ff', s: 2 });
  }
  if (st.frozen) { // 冰塊：半透明的冰包住身體
    g.fillStyle = 'rgba(190,235,255,0.35)'; g.strokeStyle = 'rgba(240,252,255,0.85)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(cx - r - 4, feet); g.lineTo(cx - r - 6, top + h * 0.35); g.lineTo(cx - r * 0.3, top - 4); g.lineTo(cx + r * 0.6, top + 2); g.lineTo(cx + r + 6, top + h * 0.4); g.lineTo(cx + r + 4, feet); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(cx - r * 0.5, top + 6); g.lineTo(cx - r * 0.1, top + h * 0.5); g.stroke();
  }
  if (st.ign) { // 身上有火舌在跳
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const fx = cx + (i - 1) * r * 0.7, fh = h * (0.45 + 0.2 * Math.sin(t * 14 + i * 2 + cx)), fy = feet - 2;
      const gr = g.createLinearGradient(0, fy, 0, fy - fh); gr.addColorStop(0, 'rgba(255,120,30,0.75)'); gr.addColorStop(0.6, 'rgba(255,200,60,0.45)'); gr.addColorStop(1, 'rgba(255,240,150,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(fx - 5, fy); g.quadraticCurveTo(fx - 6, fy - fh * 0.5, fx + Math.sin(t * 9 + i) * 3, fy - fh); g.quadraticCurveTo(fx + 6, fy - fh * 0.5, fx + 5, fy); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.6) G.parts.push({ x: cx + rnd(-r, r), y: feet - rnd(0, h), vx: rnd(-10, 10), vy: -70, t: 0, dur: 0.45, color: Math.random() < 0.5 ? '#ff8a30' : '#ffd060', s: 3 });
  }
  if (st.shock) { // 閃電在身上亂竄
    g.strokeStyle = '#fff38a'; g.lineWidth = 1.6; g.shadowColor = '#ffe95a'; g.shadowBlur = 8;
    for (let k = 0; k < 2; k++) {
      if (Math.random() < 0.35) continue;
      let x = cx + rnd(-r, r), y = top + rnd(0, h * 0.4); g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += rnd(-7, 7); y += rnd(4, 9); g.lineTo(x, y); }
      g.stroke();
    }
    g.shadowBlur = 0;
  }
  if (st.poison) { // 綠色泡泡往上冒，腳下一圈毒液
    g.fillStyle = `rgba(90,200,70,${Math.min(0.45, 0.15 + st.poison * 0.03)})`; g.beginPath(); g.ellipse(cx, feet, r + 4, (r + 4) * 0.4, 0, 0, Math.PI * 2); g.fill();
    if (Math.random() < 0.35 + st.poison * 0.04) G.parts.push({ x: cx + rnd(-r, r), y: feet - rnd(0, h * 0.8), vx: 0, vy: -26, t: 0, dur: 0.8, color: Math.random() < 0.5 ? '#7ae060' : '#a8f090', s: 3 });
  }
  if (st.bleed) { // 血往下滴，地上一灘
    g.fillStyle = 'rgba(150,10,10,0.45)'; g.beginPath(); g.ellipse(cx + 3, feet + 1, r * 0.7, r * 0.28, 0, 0, Math.PI * 2); g.fill();
    if (Math.random() < 0.45) G.parts.push({ x: cx + rnd(-r * 0.6, r * 0.6), y: top + rnd(h * 0.2, h * 0.8), vx: 0, vy: 80, t: 0, dur: 0.35, color: '#d01818', s: 3 });
  }
  // 頭上的小圖示
  const icons = AIL_ICON.filter(([k]) => st[k] && !(k === 'chill' && st.frozen));
  if (icons.length) {
    const w = 14, y = top - iconOff, x0 = cx - (icons.length * (w + 2) - 2) / 2;
    icons.forEach(([k, ch, col], i) => {
      const x = x0 + i * (w + 2);
      g.fillStyle = 'rgba(0,0,0,0.75)'; roundRect(g, x, y - 7, w, 14, 3); g.fill();
      g.strokeStyle = col; g.lineWidth = 1; roundRect(g, x + 0.5, y - 6.5, w - 1, 13, 3); g.stroke();
      txt(g, k === 'poison' && st.poison > 1 ? String(Math.min(9, st.poison)) : ch, x + w / 2, y + 0.5, 9, col, 'center', false);
    });
  }
}
function drawPlayer(g, pl) {
  const feet = pl.y + pl.r * 0.8;
  shadow(g, pl.x, feet, 12);
  const moving = input.keys.KeyW || input.keys.KeyA || input.keys.KeyS || input.keys.KeyD || input.joy;
  const bob = moving ? Math.round(Math.sin(pl.walk) * 1.5) : 0;
  const pst = plAilState(pl);
  // v2.5.1 身上的裝備：副手（盾／箭袋／法器）、頭盔、胸甲顯示在角色身上
  const EQ = G.P.equip, eqIcon = (it, px) => { const b = it && BASE_BY_ID[it.base]; return b ? itemIcon(b, px) : null; };
  const offB = EQ.offhand && BASE_BY_ID[EQ.offhand.base];
  // v2.5.1 接口：如果有 js\paperdoll.js（依裝備畫的分層像素人物，Higgsfield 美術工作階段負責），就交給它畫
  //   drawPaperDoll 回傳 { w, h }（畫好了）或 false（沒畫，照下面原本的方式）。它會自己畫身體、裝備和武器。
  const doll = typeof drawPaperDoll === 'function' ? drawPaperDoll(g, pl, feet, bob, moving, pst) : false;
  if (doll) {
    drawAilmentFx(g, pl, feet, doll.h, 12, pst);
    drawPlayerStatus(g, pl, feet, doll);
      return;
  }
  if (offB && offB.cls === 'quiver') { const ic = eqIcon(EQ.offhand, 64); if (ic) { g.save(); g.translate(pl.x - pl.facing * 10, feet - 24 + bob); g.rotate(-pl.facing * 0.45); g.imageSmoothingEnabled = true; g.drawImage(ic, -8, -9, 16, 18); g.restore(); } } // 箭袋背在背上（畫在身體後面）
  const sp = drawSprite(g, G.P.cls, pl.x, feet, 2, pl.facing, pst.frozen ? { R: '#bfe8ff', B: '#bfe8ff' } : null, pl.flash > 0, bob, !!moving && !(pl.stun > 0));
  drawGearOnBody(g, pl, feet, sp, bob, EQ, offB, eqIcon);
  drawAilmentFx(g, pl, feet, sp.h, 12, pst);
  drawPlayerStatus(g, pl, feet, sp);
  // 武器
  const wc = G.S.weapon.cls;
  const acting = pl.act > -0.15;
  const a = acting ? pl.aim : (pl.facing > 0 ? -0.9 : Math.PI + 0.9);
  const hx = pl.x + pl.facing * 7, hy = pl.y + 1 + bob;
  const ca = Math.cos(a), sa = Math.sin(a);
  g.lineCap = 'square';
  // v1.8：素材包的武器圖（依武器種類和基底階級換樣子），握在手上跟著瞄準方向轉；近戰揮砍時會掃一下
  const wtile = PIX.ready && pixWeaponTile(wc, P_weaponTier());
  if (wtile) {
    // v1.9：平常直立拿在身側（不再斜斜橫過身體），攻擊時才轉向瞄準方向；只用整數倍放大
    const [sx, sy, w, h] = ATLAS_0X72_TILES[wtile], s = 1;   // v2.5.1：原尺寸（放大兩倍幾乎跟人一樣高）
    const handX = pl.x + pl.facing * (wc === "bow" ? 12 : 9), handY = feet - 13 + bob;
    let rot = acting ? a + Math.PI / 2 : pl.facing * 0.25;
    if (pl.swing > 0 && !['bow', 'staff'].includes(wc)) rot += (pl.swing / 0.18 - 0.5) * 2.2 * pl.facing;
    g.save(); g.translate(handX, handY); g.rotate(wc === 'bow' ? (acting ? a : 0) : rot);
    g.imageSmoothingEnabled = false;
    if (wc === 'bow') g.drawImage(PIX.img, sx, sy, w, h, -w * s / 2 + (acting ? 0 : pl.facing * 2), -h * s / 2 - (acting ? 0 : 3), w * s, h * s);
    else g.drawImage(PIX.img, sx, sy, w, h, -w * s / 2, -h * s + 5 * s, w * s, h * s);
    g.restore();
  } else if (wc === 'katana' || wc === 'dagger') {
    const L = wc === 'katana' ? 26 : 12;
    g.strokeStyle = '#eef0f8'; g.lineWidth = wc === 'katana' ? 2 : 3; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + ca * L, hy + sa * L); g.stroke();
    g.strokeStyle = '#2a1a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx - ca * 6, hy - sa * 6); g.lineTo(hx, hy); g.stroke();
    g.fillStyle = '#c8a040'; g.fillRect(hx - 2, hy - 2, 4, 4);
  } else if (wc === 'sword' || wc === 'axe') {
    g.strokeStyle = '#d8d8e0'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + ca * 20, hy + sa * 20); g.stroke();
    g.strokeStyle = '#6a4a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx - ca * 4, hy - sa * 4); g.lineTo(hx + ca * 2, hy + sa * 2); g.stroke();
    if (wc === 'axe') { g.fillStyle = '#b0b0b8'; g.save(); g.translate(hx + ca * 18, hy + sa * 18); g.rotate(a); g.fillRect(-4, -8, 8, 10); g.restore(); }
  } else if (wc === 'bow') {
    g.strokeStyle = '#a0703a'; g.lineWidth = 3; g.beginPath(); g.arc(hx + ca * 4, hy + sa * 4, 11, a - 1.3, a + 1.3); g.stroke();
    g.strokeStyle = '#e0e0e0'; g.lineWidth = 1; g.beginPath();
    g.moveTo(hx + ca * 4 + Math.cos(a - 1.3) * 11, hy + sa * 4 + Math.sin(a - 1.3) * 11); g.lineTo(hx + ca * 4 + Math.cos(a + 1.3) * 11, hy + sa * 4 + Math.sin(a + 1.3) * 11); g.stroke();
  } else if (wc === 'wand' || wc === 'staff') {
    const L = wc === 'staff' ? 24 : 14;
    g.strokeStyle = '#7a5030'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx - ca * (wc === 'staff' ? 8 : 0), hy - sa * (wc === 'staff' ? 8 : 0)); g.lineTo(hx + ca * L, hy + sa * L); g.stroke();
    g.fillStyle = '#b080ff'; g.fillRect(hx + ca * L - 3, hy + sa * L - 3, 6, 6);
  }
}
// v2.5.1 把穿著的裝備畫在角色身上：胸甲＝身上一層顏色＋稀有度的邊光、頭盔＝頭上的小圖示、盾／法器＝拿在另一隻手
function drawGearOnBody(g, pl, feet, sp, bob, EQ, offB, eqIcon) {
  const top = feet - sp.h + bob, f = pl.facing;
  g.imageSmoothingEnabled = true;
  // 胸甲：依防禦種類在軀幹蓋一層淡淡的顏色（護甲＝鐵灰、閃避＝皮革、能量護盾＝藍紫），稀有度越高邊光越明顯
  // 胸甲、頭盔：照角色的輪廓上色（只塗在人物身上，不會塗到外面）。
  //   顏色看防禦種類：護甲＝鐵灰、閃避＝皮革褐、能量護盾＝藍紫；魔法以上的裝備，那一塊會有稀有度顏色的光
  const body = EQ.body && BASE_BY_ID[EQ.body.base], helmB = EQ.helmet && BASE_BY_ID[EQ.helmet.base];
  if ((body || helmB) && sp._img) {
    const W = sp._img.width, H = sp._img.height;
    const c = drawGearOnBody.c || (drawGearOnBody.c = document.createElement('canvas')), cg = c.getContext('2d');
    c.width = W; c.height = H;
    const DEF_COL = { ar: '#aab4c4', ev: '#9a6a3a', es: '#7a6ae8' };
    const band = (it, b, y0, y1, a) => {
      if (!b) return;
      cg.globalCompositeOperation = 'source-over'; cg.clearRect(0, 0, W, H); cg.drawImage(sp._img, 0, 0);
      cg.globalCompositeOperation = 'source-in'; cg.fillStyle = DEF_COL[b.def] || '#c0b090'; cg.fillRect(0, Math.round(H * y0), W, Math.round(H * (y1 - y0)));
      g.globalAlpha = a; g.drawImage(c, sp._x, sp._y);
      const glow = { magic: 0.35, rare: 0.5, unique: 0.65 }[it.rarity];
      if (glow) { cg.fillStyle = RARITY_COLOR[it.rarity]; cg.fillRect(0, 0, W, H); g.globalAlpha = glow * (0.6 + 0.4 * Math.sin(G.time * 3)) * 0.35; g.drawImage(c, sp._x, sp._y); }
      g.globalAlpha = 1;
    };
    band(EQ.body, body, 0.45, 0.88, 0.62);    // 軀幹和腿
    band(EQ.helmet, helmB, 0.0, 0.3, 0.58);  // 頭
  }
  // 盾牌、法器：拿在沒拿武器的那一邊
  if (offB && offB.cls !== 'quiver') { const ic = eqIcon(EQ.offhand, 64); if (ic) { const s = offB.cls === 'shield' ? 16 : 12; g.drawImage(ic, pl.x - f * 11 - s / 2, feet - 22 + bob, s, s); } }
  g.imageSmoothingEnabled = false;
}
// 堅忍值條（沒滿的時候才顯示在腳下）＋硬直時頭上轉圈的星星
function drawPlayerStatus(g, pl, feet, sp) {
  const S = G.S;
  if (S.poiseT && pl.poise != null && pl.poise < S.poiseT - 0.5) {
    const w = 30, fr = Math.max(0, pl.poise / S.poiseT);
    g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(pl.x - w / 2 - 1, feet + 5, w + 2, 4);
    g.fillStyle = fr < 0.3 ? '#ff8a40' : '#e8c060'; g.fillRect(pl.x - w / 2, feet + 6, w * fr, 2);
  }
  if (pl.stun > 0) {
    for (let k = 0; k < 3; k++) {
      const a = G.time * 6 + k * Math.PI * 2 / 3, sx = pl.x + Math.cos(a) * 12, sy = feet - sp.h - 6 + Math.sin(a) * 4;
      g.fillStyle = '#ffe070'; g.beginPath(); for (let i = 0; i < 8; i++) { const b = i * Math.PI / 4, r = i % 2 ? 1.4 : 3.5; g.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r); } g.closePath(); g.fill();
    }
  }
}
function drawPortal(g, x, y, color, label) {
  const t = G.time;
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(x, y + 18, 22, 8, 0, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 4; i++) {
    g.strokeStyle = color; g.globalAlpha = 0.25 + i * 0.18; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, y - 6, 16 + Math.sin(t * 3 + i) * 2 - i * 3, 26 - i * 4, 0, 0, Math.PI * 2); g.stroke();
  }
  g.globalAlpha = 1;
  if (Math.random() < 0.4) G.parts.push({ x: x + rnd(-14, 14), y: y + rnd(-20, 14), vx: 0, vy: -30, t: 0, dur: 0.6, color, s: 2 });
  txt(g, label, x, y - 44, 12, color, 'center');
}
function drawTownDeco(g, w) {
  // 火把
  [[3, 3], [26, 3], [3, 16], [26, 16]].forEach(([tx, ty]) => {
    const x = tx * TS + 16, y = ty * TS + 16;
    g.fillStyle = '#5a3a20'; g.fillRect(x - 2, y - 4, 4, 16);
    const f = Math.sin(G.time * 14 + tx) * 2;
    g.fillStyle = '#ff9a30'; g.fillRect(x - 4, y - 12 + f, 8, 9);
    g.fillStyle = '#ffe080'; g.fillRect(x - 2, y - 9 + f, 4, 5);
  });
  // 商人與倉庫
  for (const n of w.npcs) {
    if (n.req && !n.req(G.P)) continue; // 還沒出現的人物（例如通關後才來的塞拉）
    shadow(g, n.x, n.y + 10, 14);
    let bob = n.sprite !== 'chest' ? Math.round(Math.sin(G.time * 2 + n.x) * 1) : 0;   // v2.3.2 每個 NPC 都會輕輕呼吸
    if (n.ghost) { bob = Math.round(Math.sin(G.time * 1.5) * 2) - 2; g.globalAlpha = 0.65 + Math.sin(G.time * 2) * 0.1; }
    drawSprite(g, n.sprite, n.x, n.y + 12, 2, n.x < w.W * TS / 2 ? 1 : -1, n.tint || null, false, bob);
    g.globalAlpha = 1;
    const near = G.nearNPC === n;
    // 有新故事可以聽：頭上冒金色驚嘆號
    const hasStory = !!nextNpcChapter(n.id, G.P);
    if (hasStory) txt(g, '！', n.x, n.y - 48 + Math.sin(G.time * 4) * 2, 18, '#ffd040', 'center');
    txt(g, near ? `[F] ${hasStory ? '聊聊' : n.name}` : n.name, n.x, n.y + 26, near ? 13 : 11, near ? '#ffe9a0' : '#c8b890', 'center');
  }
  if (G.savedMap) drawPortal(g, w.retPortal.x, w.retPortal.y, '#70b0ff', `${TOWN_TEXT.back}：第 ${G.savedMap.world.tier} 夜`);
  txt(g, w.name, 15 * TS, 2 * TS + 4, 16, '#e8d8a0', 'center');
  // 牆上的「醒來」（只有牢房有）
  g.globalAlpha = w.hub === 'cell' ? 0.18 : 0;
  for (let i = 0; i < 14; i++) txt(g, '醒來', (2 + (i * 7) % 26) * TS + (i % 3) * 9, (1.4 + (i % 2) * 0.5) * TS + (i > 6 ? 14 * TS : 0), 10, '#d8c8a8', 'left', false);
  g.globalAlpha = 1;
  txt(g, IS_TOUCH ? '左邊按住拖曳＝移動 · 右下圓鈕＝技能 · 右上 ☰＝所有功能 · 靠近人物按「對話」' : '按 H 看操作說明 · I 背包 · P 天賦 · K 技能與寶石 · C 角色 · 靠近商人／倉庫按 F', 15 * TS, 17.5 * TS, 12, '#c8b890', 'center');
}
// 地上物品名稱：每個標籤找一個不跟別人重疊的位置（上下輪流找），被擠開的會拉一條細線指回物品
const LOOT_RANK = l => l.item ? ({ unique: 0, rare: 2, magic: 3, normal: 5 })[l.item.rarity] ?? 4 : l.key || l.frag || l.skill ? 0 : l.jewel ? 1 : 3;
function drawLootLabels(g, cx, cy) {
  // v2.4：標籤的位置改成「掉下來的時候排一次，之後固定不動」。
  //   以前每一格畫面都用螢幕座標重排一次：角色一走動，畫面邊緣有物品進出、或鏡頭的小數點進位不同，
  //   「誰跟誰重疊」的判斷就會變來變去，標籤就上下跳。現在用地圖座標排、排好就記住（l.wr），走路時整組一起平移。
  const H = 16, GAP = 2;
  const shown = l => !l.gone && !(l.item && l.item.rarity === 'normal' && !G.showNormal) && !lootHidden(l);
  const fkey = G.showNormal + '|' + lootFilterKey();
  if (G.lootShowNormal !== fkey) { G.lootShowNormal = fkey; for (const l of G.loot) l.wr = null; }   // 切換「顯示白裝」時才全部重排
  const rects = [];
  for (const l of G.loot) { if (!shown(l)) { l.wr = null; l.rect = null; } else if (l.wr) rects.push(l.wr); }
  const overlaps = r => rects.some(o => o.x < r.x + r.w + GAP && o.x + o.w + GAP > r.x && o.y < r.y + r.h + GAP && o.y + o.h + GAP > r.y);
  // 新掉出來的才需要找位置：重要的先排；已經排好的不會被擠走
  const fresh = G.loot.filter(l => shown(l) && !l.wr).sort((a, b) => LOOT_RANK(a) - LOOT_RANK(b) || a.y - b.y || a.x - b.x);
  g.font = `11px ${FONT}`;
  for (const l of fresh) {
    const tw = Math.ceil(g.measureText(l.label).width) + 12;
    const base = { x: Math.round(l.x - tw / 2), y: Math.round(l.y - 18 - H / 2), w: tw, h: H };
    let r = base;
    // 依序試：原位、上 1 格、下 1 格、上 2 格、下 2 格……再不行就往左右錯開
    for (let k = 1; k < 24 && overlaps(r); k++) {
      const step = Math.ceil(k / 2) * (H + GAP) * (k % 2 ? -1 : 1);
      r = { ...base, y: base.y + step };
      if (!overlaps(r)) break;
      if (k > 10) r = { ...base, y: base.y + step, x: base.x + (k % 4 < 2 ? -1 : 1) * Math.round(tw / 2 + 4) };
    }
    r.by = base.y; r.bx = base.x;
    l.wr = r; rects.push(r);
  }
  // 畫：鏡頭位置只取整數一次，所有標籤一起平移，彼此之間不會差 1 格像素
  const ox = Math.round(cx), oy = Math.round(cy);
  for (const l of G.loot) {
    const wr = l.wr; if (!wr) continue;
    const r = { x: wr.x - ox, y: wr.y - oy, w: wr.w, h: wr.h };
    if (r.x + r.w < -40 || r.y + r.h < -40 || r.x > VW + 40 || r.y > VH + 40) { l.rect = null; continue; }
    l.rect = r;
    const sx = l.x - ox, sy = l.y - oy - 18;
    if (Math.abs(wr.y - wr.by) > 1 || Math.abs(wr.x - wr.bx) > 1) { // 被擠開的：細線連回地上的物品
      g.strokeStyle = l.color; g.globalAlpha = 0.35; g.lineWidth = 1; g.beginPath();
      g.moveTo(r.x + r.w / 2, r.y + (wr.y < wr.by ? r.h : 0)); g.lineTo(sx, sy + 12); g.stroke(); g.globalAlpha = 1;
    }
    const hover = input.mx >= r.x && input.mx <= r.x + r.w && input.my >= r.y && input.my <= r.y + r.h;
    const normal = l.item && l.item.rarity === 'normal';
    const sp = l.special;   // v2.15.3 稀有通貨：整塊染色（頂級）或加粗外框（次一級）
    g.fillStyle = sp && sp.bg ? sp.bg : hover ? 'rgba(48,40,30,0.96)' : 'rgba(6,5,8,0.82)'; roundRect(g, r.x, r.y, r.w, r.h, 3); g.fill();
    g.strokeStyle = l.color; g.globalAlpha = normal ? 0.25 : hover || sp ? 1 : 0.75; g.lineWidth = sp ? 2 : 1; roundRect(g, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 3); g.stroke(); g.globalAlpha = 1;
    if (G.nearAct && G.nearAct.ref === l) { const p = 0.6 + 0.4 * Math.sin(G.time * 8); g.strokeStyle = `rgba(255,220,120,${p})`; g.lineWidth = 2; roundRect(g, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 4); g.stroke(); }   // v2.7.4 按 F 會撿這個
    txt(g, l.label, r.x + r.w / 2, r.y + H / 2 + 0.5, 11, l.color, 'center', false);
  }
}

// ---------- 怪物資訊列（依圖鑑解鎖程度顯示） ----------
function drawTargetBar(g, m, y) {
  const L = loreLevel(m);
  const w = 340, x = VW / 2 - w / 2;
  const col = m.boss ? '#e8803a' : m.rarity === 'rare' ? '#ffff77' : m.rarity === 'magic' ? '#9aa0ff' : '#e8e0d0';
  const lines = [];
  // 第一階：生命數值與異常狀態
  if (L.lv >= 1) {
    const st = [];
    if (m.frozen > 0) st.push(['冰凍', AILMENTS.freeze.color]);
    else if (m.chill > 0) st.push(['冰緩', '#9fdcff']);
    if (m.ign) st.push([`點燃 ${m.ign.t.toFixed(1)}s`, AILMENTS.ignite.color]);
    if (m.shock > 0) st.push([`感電 ${m.shock.toFixed(1)}s`, AILMENTS.shock.color]);
    if (m.poisons.length) st.push([`中毒 ×${m.poisons.length}`, AILMENTS.poison.color]);
    if (m.bleed) st.push([`流血 ${m.bleed.t.toFixed(1)}s`, AILMENTS.bleed.color]);
    lines.push(st.length ? st : [['無異常狀態', '#8a8070']]);
  }
  // 第二階：抗性與弱點
  if (L.lv >= 2) lines.push(Object.keys(RES_NAME).map(e => { const v = m.res[e]; return [`${RES_NAME[e]} ${v > 0 ? '+' : ''}${v}%`, v < 0 ? '#9fff9f' : v >= 50 ? '#ff8a8a' : '#c8c0b0']; }));
  // 第三階：護甲與攻擊方式
  if (L.lv >= 3) {
    const atk = m.boss ? '多種招式' : `${ELEM_NAME[m.def.elem || 'phys']}${m.def.ranged ? (m.def.spell ? '法術・遠程' : '攻擊・遠程') : '攻擊・近戰'}`;
    lines.push([[`護甲 ${Math.round(m.armour)}`, '#c8c0b0'], [atk, '#c8c0b0']]);
    lines.push([[m.def.note, '#a89c88']]);
  }
  const H = 34 + lines.length * 16 + 12;
  g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(x - 8, y - 4, w + 16, H);
  g.strokeStyle = 'rgba(140,120,80,0.6)'; g.lineWidth = 1; g.strokeRect(x - 8.5, y - 4.5, w + 17, H + 1);
  txt(g, `${m.name}${m.rarity === 'rare' ? '（稀有精英）' : m.rarity === 'magic' ? '（魔法精英）' : ''}　Lv ${m.mlvl}`, VW / 2, y + 6, 12, col, 'center');
  g.fillStyle = '#3a1010'; g.fillRect(x, y + 15, w, 10);
  { const fr = clamp(m.life / m.maxLife, 0, 1); m.trail = Math.max(fr, (m.trail == null ? fr : m.trail) - 0.01); g.fillStyle = "#ffe8d0"; g.fillRect(x, y + 15, w * m.trail, 10); }   // v2.3 延遲扣血的白條
  g.fillStyle = '#c83020'; g.fillRect(x, y + 15, w * clamp(m.life / m.maxLife, 0, 1), 10);
  if (L.lv >= 1) txt(g, `${Math.max(0, Math.ceil(m.life))} / ${m.maxLife}`, VW / 2, y + 20, 10, '#ffffff', 'center');
  let ly = y + 36;
  for (const ln of lines) {
    g.font = `11px ${FONT}`;
    const widths = ln.map(([t]) => g.measureText(t).width + 14);
    let lx = VW / 2 - widths.reduce((a, b) => a + b, 0) / 2;
    ln.forEach(([t, c], i) => { txt(g, t, lx + widths[i] / 2, ly, 11, c, 'center'); lx += widths[i]; });
    ly += 16;
  }
  const hint = L.next ? `圖鑑 ${L.n}/${L.next}：再${m.boss ? '擊敗' : '殺'} ${L.next - L.n} ${m.boss ? '次' : '隻'}解鎖「${LORE_TEXT[L.lv]}」` : '圖鑑已全部解鎖';
  txt(g, hint, VW / 2, ly, 10, '#8a7f6a', 'center');
}

// ---------- HUD ----------
function drawOrb(g, x, y, R, frac, col, dark, label, es, trail) {
  g.fillStyle = '#0c0a0e'; g.beginPath(); g.arc(x, y, R + 5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#6a5a40'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, R + 4, 0, Math.PI * 2); g.stroke();
  g.save(); g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.clip();
  g.fillStyle = dark; g.fillRect(x - R, y - R, R * 2, R * 2);
  const h = R * 2 * clamp(frac, 0, 1);
  if (trail > frac) { const th = R * 2 * clamp(trail, 0, 1); g.fillStyle = "rgba(255,235,215,0.85)"; g.fillRect(x - R, y + R - th, R * 2, th - h); }   // v2.3 剛被打掉的那一段先變白
  g.fillStyle = col; g.fillRect(x - R, y + R - h, R * 2, h);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x - R, y + R - h, R * 2, 3);
  g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.ellipse(x - R * 0.3, y - R * 0.45, R * 0.35, R * 0.22, -0.5, 0, Math.PI * 2); g.fill();
  g.restore();
  if (es != null) { g.strokeStyle = '#8fd0ff'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, R + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(es, 0, 1)); g.stroke(); }
  // v2.7.10 數字加大，並顯示上限（目前 ／ 上限）；有能量護盾時下面多一行
  const [cur, max, sub] = String(label).split('|');
  // v2.8.1 只留一行「目前 / 上限」，字清楚一點（護盾看外圈的藍色圈）
  if (max) { g.save(); g.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(g, x - 36, y - 10, 72, 20, 9); g.fill(); g.restore(); txt(g, `${cur} / ${max}`, x, y, 14, '#ffffff', 'center'); }
  else txt(g, cur, x, y, 15, '#ffffff', 'center');
}
// 下方 HUD 的位置（滑鼠說明的熱區也用這組數字）
// 手機／平板（主要是用手指）：網址加 ?touch=1 也可以強制開啟，方便在電腦上測試
const IS_TOUCH = /[?&]touch=1/.test(location.search) || (matchMedia('(pointer: coarse)').matches && !/[?&]touch=0/.test(location.search));
const HUD = {
  orbL: [58, VH - 54, 40], orbR: [VW - 58, VH - 54, 40],
  flask: i => IS_TOUCH ? [110 + i * 36, VH - 58, 30, 52] : [118 + i * 24, VH - 50, 20, 42], // 手機版藥劑格大一點，好用手指點
  skill: i => [VW / 2 - 143 + i * 42, VH - 46, 38, 38], // v1.2：往左移，讓出藍球左邊的功能鈕
  skillMid: VW / 2 - 40,
  menuBtn: [VW - 152, VH - 50, 44, 44],                 // 功能選單按鈕（藍球左邊）
  xp: [214, VH - 6, VW - 428, 4],
};
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawHUD(g) {
  const P = G.P, S = G.S, pl = G.pl, w = G.world;
  // 底部面板：深色漸層＋金色細邊
  const pg = g.createLinearGradient(0, VH - 62, 0, VH);
  pg.addColorStop(0, 'rgba(14,10,8,0.0)'); pg.addColorStop(0.35, 'rgba(14,10,8,0.82)'); pg.addColorStop(1, 'rgba(8,6,5,0.95)');
  g.fillStyle = pg; g.fillRect(100, VH - 62, VW - 200, 62);
  g.strokeStyle = 'rgba(200,160,90,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(110, VH - 56.5); g.lineTo(VW - 110, VH - 56.5); g.stroke();
  // 生命與魔力球
  const [lx, ly, lr] = HUD.orbL, [rx, ry, rr] = HUD.orbR;
  { const lf = pl.life / S.maxLife; pl.lifeTrail = Math.max(lf, (pl.lifeTrail == null ? lf : pl.lifeTrail) - 0.008); }
  drawOrb(g, lx, ly, lr, pl.life / S.maxLife, "#b82020", "#2a0808", `${Math.ceil(pl.life)}|${S.maxLife}${S.maxES > 0 ? '|護盾 ' + Math.ceil(pl.es) + '/' + S.maxES : ''}`, S.maxES > 0 ? pl.es / S.maxES : null, pl.lifeTrail);
  if (S.maxES > 0) txt(g, `護盾 ${Math.ceil(pl.es)}`, lx, ly - lr - 12, 10, '#9fd8ff', 'center');
  drawOrb(g, rx, ry, rr, S.maxMana ? pl.mana / (S.maxManaFull || S.maxMana) : 0,   /* v2.14.2 照總魔力算比例，保留的部分由光環畫上去 */ '#2a50c8', '#080c2a', S.flags.bloodMagic ? '血魔' : `${Math.floor(pl.mana)}|${S.maxMana}`);
  // 藥劑（4 格，按 1–4）
  for (let i = 0; i < 4; i++) {
    const [x, y, fw, fh] = HUD.flask(i), f = pl.fl[i];
    g.fillStyle = 'rgba(10,8,12,0.9)'; roundRect(g, x, y, fw, fh, 4); g.fill();
    g.strokeStyle = f && f.c >= f.use ? '#8a7448' : '#4a4030'; g.lineWidth = 1; roundRect(g, x + 0.5, y + 0.5, fw - 1, fh - 1, 4); g.stroke();
    if (f) {
      const F = FLASKS[f.type], h = (fh - 6) * f.c / f.max;
      g.fillStyle = F.color; g.globalAlpha = f.c >= f.use ? 0.9 : 0.4; g.fillRect(x + 3, y + fh - 3 - h, fw - 6, h); g.globalAlpha = 1;
      for (let k = 1; k * f.use < f.max; k++) { const yy = y + fh - 3 - (fh - 6) * k * f.use / f.max; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 3, yy, fw - 6, 1); }
      if (G.flaskBuffs && G.flaskBuffs[f.type]) { g.strokeStyle = '#fff4c0'; g.lineWidth = 1.5; roundRect(g, x - 1, y - 1, fw + 2, fh + 2, 5); g.stroke(); }
    }
    txt(g, keyLabel('f' + (i + 1)), x + fw / 2, y + 7, 9, '#e8d8a8', 'center');
  }
  // 技能列（較小的格子，按鍵標在左上角）
  const labels = CFG.swapMouse ? ['右', '左', keyLabel('sk3'), keyLabel('sk4'), keyLabel('sk5')] : ['左', '右', keyLabel('sk3'), keyLabel('sk4'), keyLabel('sk5')];
  for (let i = 0; i < 5; i++) {
    const [x, y, s] = HUD.skill(i), sid = P.skills[i];
    g.fillStyle = 'rgba(10,8,12,0.92)'; roundRect(g, x, y, s, s, 5); g.fill();
    if (sid) {
      const sk = SKILLS[sid], c = G.slotCalc[i];
      const bad = skillUsable(S, sid) || (!S.flags.bloodMagic && pl.mana < c.cost);
      // 技能寶石圖示（art.js）：不能用時變暗
      g.imageSmoothingEnabled = true;
      g.globalAlpha = bad ? 0.35 : 1; g.drawImage(skillIcon(sid, 96), x + 1, y + 1, s - 2, s - 2); g.globalAlpha = 1;
      g.imageSmoothingEnabled = false;
      const cdv = pl.cd[sid] || 0;
      if (cdv > 0) {
        // 冷卻：像時鐘一樣轉一圈（暗的部分＝還要等的時間），中間顯示剩幾秒
        const frac = Math.min(1, cdv / ((pl.cdMax && pl.cdMax[sid]) || sk.cd)), cx = x + s / 2, cy = y + s / 2, R = s / 2 + 2;
        const a0 = -Math.PI / 2 + (1 - frac) * Math.PI * 2;
        g.save(); roundRect(g, x + 1, y + 1, s - 2, s - 2, 5); g.clip();
        g.fillStyle = 'rgba(0,0,0,0.68)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, Math.PI * 1.5); g.closePath(); g.fill();
        g.strokeStyle = '#ffe08a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); g.stroke();
        g.restore();
        txt(g, cdv >= 1 ? cdv.toFixed(1) : cdv.toFixed(1), cx, cy + 0.5, 12, '#ffffff', 'center');
      } else if (pl.cdFlash && pl.cdFlash[sid] > 0) { // 冷卻剛好結束：閃一下
        g.globalAlpha = pl.cdFlash[sid] * 2; g.strokeStyle = '#fff4c0'; g.lineWidth = 2; roundRect(g, x, y, s, s, 5); g.stroke(); g.globalAlpha = 1;
      }
      c.active.forEach((id, k) => { g.fillStyle = SUPPORTS[id].color; g.fillRect(x + 5 + k * 7, y + s - 7, 5, 3); });
    }
    g.strokeStyle = '#7a6440'; g.lineWidth = 1; roundRect(g, x + 0.5, y + 0.5, s - 1, s - 1, 5); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.75)'; roundRect(g, x + 1, y + 1, 13, 11, 3); g.fill();
    txt(g, labels[i], x + 7.5, y + 6.5, 8, '#e8c878', 'center', false);
  }
  // 經驗條與等級
  const [xx, xy, xw, xh] = HUD.xp;
  g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(xx - 1, xy - 1, xw + 2, xh + 2);
  const xg = g.createLinearGradient(xx, 0, xx + xw, 0); xg.addColorStop(0, '#8a6020'); xg.addColorStop(1, '#f0c860');
  g.fillStyle = xg; g.fillRect(xx, xy, xw * P.xp / xpNeed(P.lvl), xh);
  txt(g, `Lv ${P.lvl}`, HUD.skillMid - 118, VH - 27, 11, '#e8d8a8', 'right');
  txt(g, `${Math.floor(P.xp / xpNeed(P.lvl) * 100)}%`, HUD.skillMid + 118, VH - 27, 10, '#a89878', 'left');
  // 正在生效的功能藥劑
  let bx2 = 118;
  for (const k in (G.flaskBuffs || {})) {
    const b = G.flaskBuffs[k], F = FLASKS[k];
    g.fillStyle = 'rgba(0,0,0,0.75)'; roundRect(g, bx2, VH - 76, 46, 14, 3); g.fill();
    g.fillStyle = F.color; g.fillRect(bx2 + 2, VH - 74, 4, 10);
    txt(g, `${F.name.slice(0, 2)} ${b.t.toFixed(0)}s`, bx2 + 26, VH - 69, 9, '#e8e0d0', 'center', false);
    bx2 += 50;
  }
  // 天賦點提示
  const pts = treePointsTotal(P) - treePointsUsed(P);
  if (pts > 0) {
    const a = 0.6 + Math.sin(G.time * 5) * 0.4;
    g.globalAlpha = a; txt(g, `＋${pts} 天賦點數（${ctlText('{tree}', true)}）`, VW / 2, VH - 64, 11, '#9fff9f', 'center'); g.globalAlpha = 1;
  }
  // 區域名稱與訊息
  txt(g, w.name, 12, 16, 14, '#e8d8a0');
  if (w.kind === 'map') txt(g, `地圖等級 ${w.mlvl}　剩餘怪物 ${G.mons.filter(m => !m.boss).length}`, 12, 34, 11, '#a89878');
  let my0 = 60;
  if (w.mm && w.mm.ids.length) {
    txt(g, `夢境詞綴 ${w.mm.ids.length} 條：掉落數量 +${w.mm.q}%　稀有度 +${w.mm.r}%`, 12, 50, 11, '#c8a0ff');
    w.mm.ids.forEach((id, i) => txt(g, '・' + MAP_MOD_BY_ID[id].name, 12, 66 + i * 14, 10, '#a890d0'));
    my0 = 76 + w.mm.ids.length * 14;
  }
  // 訊息：顯示在技能列上方正中間，最新的在最下面，7 秒後淡出
  // v2.3：訊息移到左下角（原本在正中下方會擋住戰鬥），靠左排、最多 4 則、6 秒淡出
  const live = CFG.msgLog ? G.msgs.filter(m => G.time - m.t < 6).slice(-4) : [];
  live.forEach((m, i) => {
    const y = VH - 100 - (live.length - 1 - i) * 17, age = G.time - m.t;
    g.globalAlpha = Math.min(1, 6 - age) * (i === live.length - 1 ? 1 : 0.8);
    g.font = `11px ${FONT}`; let s = m.txt; while (s.length > 8 && g.measureText(s).width > 330) s = s.slice(0, -2); if (s !== m.txt) s += '…';
    const tw = g.measureText(s).width + 14, x = 112 + Math.max(0, 1 - age / 0.18) * -14;
    g.fillStyle = 'rgba(8,6,10,0.55)'; roundRect(g, x, y - 8, tw, 16, 3); g.fill();
    g.fillStyle = m.color; g.fillRect(x, y - 8, 2, 16);
    txt(g, s, x + 8, y, 11, m.color, 'left');
  });
  g.globalAlpha = 1;
  // 重要事件（升級、傳奇掉落、擊敗首領）：畫面上方的大橫幅
  const bn = G.banner;
  if (bn && G.time - bn.t < 2.6) {
    const a = G.time - bn.t, al = Math.min(1, a / 0.15) * Math.min(1, (2.6 - a) / 0.5), sc = 1 + Math.max(0, 1 - a / 0.2) * 0.35;
    g.globalAlpha = al; const by = 128;
    const bg = g.createLinearGradient(VW / 2 - 260, 0, VW / 2 + 260, 0); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(0.5, 'rgba(0,0,0,0.6)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = bg; g.fillRect(VW / 2 - 260, by - 26, 520, 54);
    g.fillStyle = bn.color; g.globalAlpha = al * 0.7; g.fillRect(VW / 2 - 150, by - 27, 300, 1); g.fillRect(VW / 2 - 150, by + 28, 300, 1); g.globalAlpha = al;
    txt(g, bn.title, VW / 2, by - 8, Math.round(22 * sc), bn.color, 'center');
    if (bn.sub) txt(g, bn.sub, VW / 2, by + 15, 13, '#f0e8d8', 'center');
    g.globalAlpha = 1;
  }
  // 首領血條
  const b = G.bossBar;
  if (b && !b.dead) {
    const bw = 420, x = VW / 2 - bw / 2, y = 14;
    // v2.3：金色外框、被打掉的血先變白再慢慢縮（看得出這一下打多痛）、每 25% 一格刻度
    const fr = Math.max(0, b.life / b.maxLife); b.trail = Math.max(fr, (b.trail == null ? fr : b.trail) - 0.006);
    g.fillStyle = 'rgba(0,0,0,0.85)'; roundRect(g, x - 4, y - 4, bw + 8, 20, 4); g.fill();
    g.strokeStyle = '#a8843c'; g.lineWidth = 1; roundRect(g, x - 3.5, y - 3.5, bw + 7, 19, 4); g.stroke();
    g.fillStyle = '#3a0a0a'; g.fillRect(x, y, bw, 12);
    g.fillStyle = '#ffe8d0'; g.fillRect(x, y, bw * b.trail, 12);
    const hg = g.createLinearGradient(0, y, 0, y + 12); hg.addColorStop(0, '#f04a30'); hg.addColorStop(1, '#9a1810');
    g.fillStyle = hg; g.fillRect(x, y, bw * fr, 12);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, bw * fr, 3);
    g.fillStyle = 'rgba(0,0,0,0.55)'; for (let q = 1; q < 4; q++) g.fillRect(x + bw * q / 4, y, 1, 12);
    txt(g, Math.ceil(fr * 100) + '%', x + bw - 4, y + 6.5, 10, '#fff0e0', 'right');
    txt(g, `${b.name}${b.life < b.maxLife / 2 ? '（狂暴）' : ''}`, VW / 2, y + 26, 13, '#ffb090', 'center');
  }
  // 怪物資訊列：滑鼠指著的怪，或剛打過的怪
  let tg = null;
  for (const m of G.mons) if (!m.dead && Math.hypot(m.x - input.wx, m.y - 6 - input.wy) < m.r + 14) { tg = m; break; }
  if (!tg && G.target && !G.target.dead && G.targetT > 0) tg = G.target;
  if (tg && CFG.targetBar) drawTargetBar(g, tg, b && !b.dead ? 50 : 12);
  // 戰吼增益
  if (pl.buff) txt(g, `戰意 ${pl.buff.t.toFixed(1)} 秒`, VW / 2 + 140, VH - 70, 11, '#ff9a80', 'left');
  if (pl.souls) txt(g, `魂 ×${pl.souls}（傷害 +${pl.souls * 4}%）`, VW / 2 - 140, VH - 70, 11, '#c8a0ff', 'right');   // v2.5.5 靈魂收割
  // 小地圖
  if (G.fps && CFG.fps) txt(g, `${G.fps} FPS`, VW - 8, VH - 74, 10, '#9fd09f', 'right');
  if (w.mini && CFG.minimap !== 'off') {
    const s = (w.kind === 'town' ? 3 : 2) * ({ small: 0.5, normal: 1, large: 1.5 }[CFG.minimap] || 1);
    const mw = w.W * s, mh = w.H * s, mx = VW - mw - 10, my = 10;
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
    g.drawImage(w.mini, mx, my, mw, mh);
    if (w.boss && w.explored[(w.boss.y + (w.boss.h >> 1)) * w.W + w.boss.x + (w.boss.w >> 1)]) txt(g, '☠', mx + (w.boss.x + w.boss.w / 2) * s, my + (w.boss.y + w.boss.h / 2) * s, 12, '#ff7050', 'center');
    if (w.portal) { g.fillStyle = '#70b0ff'; g.fillRect(mx + w.portal.x / TS * s - 2, my + w.portal.y / TS * s - 2, 4, 4); }
    Hook.emit('drawMinimap', g, mx, my, s);   // v2.15.3 小地圖上的事件、精英怪（minimapmarks.js）
    g.fillStyle = '#ffffff'; g.fillRect(mx + pl.x / TS * s - 2, my + pl.y / TS * s - 2, 4, 4);
  }
}
