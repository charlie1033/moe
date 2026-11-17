// =============================================================
//  v2.9.6 彩色光源
//  ・技能、投射物、爆炸、地面效果、怪物的法術彈都會照亮周圍的黑暗，並在地上染出自己的顏色
//    （箭、飛刀、飛斧這類實體投射物不上色，只稍微照亮；靠很近的投射物會合併成一個光，不會疊成一大團白光）
//    （冰＝藍、火＝橘、閃電＝黃、毒／混沌＝綠、虛空＝紫，顏色直接取技能本身的顏色）
//  ・黃色（稀有）怪身上有一圈淡金光、藍色（魔法）怪有淡藍光，在暗處也找得到
//  ・地上的傳奇裝備發出橘光，夢之門發出自己的顏色
//  ・一個畫面最多 70 個光源（太多會自動略過最遠的），每種顏色的光圈只做一次、之後重複用
//  ・設定 → 介面：「彩色光源」可以關掉（只剩原本角色身邊的光）
//  資料：CFG.colorLight（false＝關）；接在 render.js 的 'light'（挖黑暗）和 'glow'（疊彩色光）事件
// =============================================================
const ColorLight = (() => {
  const MAX = 70, GL = {};
  const PHYS = { arrow: 1, knife: 1, axe: 1, dagger: 1, spear: 1, bolt: 1 };   // 實體投射物的圖示代號
  const on = () => CFG.colorLight !== false;
  function glowImg(col) {               // 一種顏色一張 64×64 的柔光圈
    if (GL[col]) return GL[col];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col); gr.addColorStop(0.35, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (GL[col] = c);
  }
  // 這一格所有的光：{ x, y（世界座標）, r 半徑, a 強度 0～1, c 顏色 }
  function collect() {
    const L = [], w = G.world, add = (x, y, r, a, c) => { if (c && a > 0.02) L.push({ x, y, r, a, c }); };
    // 投射物：箭、飛刀、飛斧這些「實體」的不發彩色光，只稍微照亮一點（nc＝不上色）；有元素的才發光
    // 靠得很近的投射物（分裂箭、多重投射）合併成一個光，免得疊成一大團刺眼的白光
    const PL = [];
    for (const p of G.projs) {
      const phys = !p.sprite || PHYS[p.sprite];
      const s = phys ? { x: p.x, y: p.y, r: 40, a: 0.25, c: '#ffffff', nc: true, pj: true } : { x: p.x, y: p.y, r: p.sprite === 'fireball' ? 90 : 64, a: p.team === 'enemy' ? 0.5 : 0.6, c: p.color || '#fff0c0', pj: true };
      const o = PL.find(q => q.nc === s.nc && q.c === s.c && Math.abs(q.x - s.x) < 44 && Math.abs(q.y - s.y) < 44);
      if (o) { o.n = (o.n || 1) + 1; o.x += (s.x - o.x) / o.n; o.y += (s.y - o.y) / o.n; o.a = Math.min(phys ? 0.35 : 0.75, o.a + s.a * 0.25); o.r = Math.min(s.r * 1.5, o.r + 6); }
      else PL.push(s);
    }
    for (const s of PL) L.push(s);
    for (const f of G.fx) {
      const k = 1 - f.t / (f.dur || 1); if (k <= 0) continue;
      if (f.k === 'ring') add(f.x, f.y, (f.r || 40) * 1.1, 0.75 * k, f.color);
      else if (f.k === 'boom') add(f.x, f.y, (f.r || 40) * 1.4, 0.9 * k, '#ff9040');
      else if (f.k === 'slash') add(f.x, f.y, (f.r || 40), 0.45 * k, f.color);
      else if (f.k === 'bolt' && f.pts && f.pts.length) { const a = f.pts[0], b = f.pts[f.pts.length - 1]; add((a.x + b.x) / 2, (a.y + b.y) / 2, 110, 0.9 * k, f.color); }
      else if (f.k === 'line') add((f.x1 + f.x2) / 2, (f.y1 + f.y2) / 2, 90, 0.7 * k, f.color);
    }
    for (const z of G.zones) add(z.x, z.y, z.r + 30, 0.55, ELEM_COLOR[z.elem || 'fire']);
    for (const z of G.azones) add(z.x, z.y, z.r + 20, 0.4 * Math.min(1, (z.dur - z.t) * 2), z.color);
    for (const m of G.mons) if (!m.dead && m.rarity !== 'normal') add(m.x, m.y, m.rarity === 'rare' ? 60 : 44, m.rarity === 'rare' ? 0.45 : 0.3, m.rarity === 'rare' ? '#ffd060' : '#80a0ff');
    for (const l of G.loot) if (l.item && l.item.rarity === 'unique') add(l.x, l.y, 60, 0.6, '#e8803a');
    if (w && w.portal) add(w.portal.x, w.portal.y, 110, 0.5, w.kind === 'town' ? '#ffcf60' : '#70b0ff');
    // 太多就留離角色近的
    if (L.length > MAX) { const pl = G.pl; L.sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y)); L.length = MAX; }
    return L;
  }
  let cur = [];
  // 挖黑暗：讓光源附近看得見
  let HOLE = null;   // 挖洞用的柔邊圓（做一次重複用，比每個光源每一格都算漸層快很多）
  function cut(light, cx, cy) {
    cur = on() && G.world ? collect().filter(s => { const x = s.x - cx, y = s.y - cy; return !(x < -s.r || y < -s.r || x > VW + s.r || y > VH + s.r); }) : [];   // 只留畫面上的
    if (!cur.length) return;
    if (!HOLE) { HOLE = document.createElement('canvas'); HOLE.width = HOLE.height = 128; const h = HOLE.getContext('2d'), gr = h.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); h.fillStyle = gr; h.fillRect(0, 0, 128, 128); }
    const dg = DARKG;   // render.js 的黑暗圖層（這時已經是「挖掉」模式）
    for (const s of cur) { dg.globalAlpha = Math.min(1, s.a); dg.drawImage(HOLE, s.x - cx - s.r, s.y - cy - s.r, s.r * 2, s.r * 2); }
    dg.globalAlpha = 1;
  }
  // 疊彩色光（加亮混色）
  function glow(g, cx, cy) {
    if (!cur.length) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
    for (const s of cur) {
      const x = s.x - cx, y = s.y - cy, r = s.r;
      if (x < -r || y < -r || x > VW + r || y > VH + r) continue;
      if (s.nc) continue;                                   // 實體投射物不上色
      g.globalAlpha = Math.min(s.pj ? 0.35 : 0.6, s.a * 0.6);
      g.drawImage(glowImg(s.c), x - r, y - r * 0.75, r * 2, r * 1.5);   // 壓扁一點，像照在地上
    }
    g.restore();
  }
  return { on, collect, cut, glow, list: () => cur };   // list()：這一格的光源清單 [{ x, y（世界座標）, r, a, c }]，給別的模組讀（例如投影）
})();
Hook.on('light', (light, cx, cy) => { try { ColorLight.cut(light, cx, cy); } catch (e) { } });
Hook.on('glow', (g, cx, cy) => { try { ColorLight.glow(g, cx, cy); } catch (e) { } });
SettingsRows.add('ui', () => `<div class="prow"><div class="pname">彩色光源<small>技能、爆炸、精英怪、傳奇掉落會照亮周圍並染上顏色；電腦比較慢可以關掉</small></div><div class="pctl"><label class="pswitch"><input type="checkbox" data-clight ${ColorLight.on() ? 'checked' : ''}><span></span></label></div></div>`, root => {
  const c = root.querySelector('[data-clight]');
  if (c) c.onchange = () => { CFG.colorLight = c.checked; saveCfg(); };
});
