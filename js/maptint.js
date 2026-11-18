// =============================================================
//  v2.9.9 地圖主色調
//  ・每種場景的地圖底圖染上自己的顏色（進地圖時畫一次，不佔每一格的時間）：中間調偏 hi 色、畫面四周往 lo 色收（像電影調色，黑的地方維持黑），
//    熔岩洞窟偏暗紅、冰封峽谷偏冷藍、虛空神殿偏紫、腐沼偏病態綠……營地維持暖黃
//  ・首領房的地上有會發光、慢慢呼吸的裂紋（顏色跟著場景），首領被打倒後裂紋熄掉
//  ・設定 → 介面：「地圖色調」可以關掉
//  資料：CFG.mapTint（false＝關）；裂紋存在 w._veins（進地圖第一次畫時才算）
//  接在 render.js 的 'glow' 事件（黑暗之後、螢幕座標）
// =============================================================
const MapTint = (() => {
  // hi：亮處染色（soft-light）、lo：暗處染色（multiply 進陰影）、a：強度、vein：首領房裂紋顏色
  const T = {
    bone:   { hi: '#c8b8e8', lo: '#2a1e3a', a: 0.35, vein: '#b890ff' },
    fire:   { hi: '#ff9a50', lo: '#4a0e08', a: 0.5,  vein: '#ff5a1a' },
    ice:    { hi: '#a8e0ff', lo: '#0e2440', a: 0.45, vein: '#80d8ff' },
    cave:   { hi: '#e8c890', lo: '#14202a', a: 0.35, vein: '#60e0d0' },
    grass:  { hi: '#fff0a0', lo: '#3a3010', a: 0.3,  vein: '#ffd040' },
    beach:  { hi: '#d8f4ff', lo: '#10283a', a: 0.3,  vein: '#60c8ff' },
    swamp:  { hi: '#c8f080', lo: '#14240a', a: 0.45, vein: '#90ff40' },
    forest: { hi: '#b8f0a0', lo: '#0a1e14', a: 0.4,  vein: '#70ff90' },
    desert: { hi: '#ffd890', lo: '#3a2008', a: 0.35, vein: '#ffb030' },
    void:   { hi: '#d0a8ff', lo: '#1a0830', a: 0.5,  vein: '#c060ff' },
    town:   { hi: '#ffe0a0', lo: '#2a1808', a: 0.25 },
  };
  const on = () => CFG.mapTint !== false;
  const pal = w => w && (w.kind === 'town' ? T.town : T[w.theme && w.theme.id]);
  // 首領房的裂紋：從房間中心往外隨機長出幾條會分岔的線（只走在地板上）
  function veins(w) {
    if (w._veins !== undefined) return w._veins;
    const b = w.boss; if (!b || !w.grid) return (w._veins = null);
    let s = (w.tier || 1) * 7919 + b.x * 131 + b.y; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS, segs = [];
    const floor = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return w.grid[ty * w.W + tx] && !(w.deco && w.deco[ty * w.W + tx]); };
    const grow = (x, y, ang, len, wid, depth) => {
      for (let i = 0; i < len; i++) {
        ang += (R() - 0.5) * 0.9;
        const nx = x + Math.cos(ang) * 14, ny = y + Math.sin(ang) * 14;
        if (!floor(nx, ny)) break;
        segs.push([x, y, nx, ny, wid]);
        if (depth < 2 && R() < 0.18) grow(nx, ny, ang + (R() < 0.5 ? 1 : -1) * (0.6 + R() * 0.6), len * 0.5 | 0, wid * 0.6, depth + 1);
        x = nx; y = ny;
      }
    };
    const n = 6 + (R() * 3 | 0);
    for (let k = 0; k < n; k++) grow(cx, cy, k / n * Math.PI * 2 + R() * 0.5, 9 + (R() * 6 | 0), 2.6, 0);
    return (w._veins = segs);
  }
  const bossAlive = () => G.mons.some(m => m.boss && !m.dead);
  function glow(g, cx, cy) {
    const w = G.world, p = pal(w); if (!on() || !p) return;
    g.save();
    // ① 首領房裂紋（加亮混色，看起來在發光）
    const vs = w.kind !== 'town' && bossAlive() ? veins(w) : null;
    if (vs && vs.length) {
      const pulse = 0.55 + 0.45 * Math.sin(G.time * 2.2);
      g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.strokeStyle = p.vein;
      for (const [wd, al] of [[3.2, 0.12], [1.6, 0.35], [0.55, 0.9]]) {
        g.globalAlpha = al * pulse; g.beginPath();
        for (const [x1, y1, x2, y2, wid] of vs) {
          if (Math.max(x1, x2) < cx - 20 || Math.min(x1, x2) > cx + VW + 20 || Math.max(y1, y2) < cy - 20 || Math.min(y1, y2) > cy + VH + 20) continue;
          g.moveTo(x1 - cx, y1 - cy); g.lineTo(x2 - cx, y2 - cy);
        }
        g.lineWidth = wd * 2.6; g.stroke();
      }
      g.globalAlpha = 1;
    }
    // ② 畫面四周往 lo 色收（一般的半透明漸層，不用混色模式，很省）
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = Math.min(0.75, p.a * 1.3);
    const vg = g.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.65);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, p.lo);
    g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
    g.restore();
  }
  return { T, on, pal, veins, glow };
})();
// 整體調色直接畫進地圖底圖（進地圖時畫一次；v2.12.1 以前是每一格全螢幕混色，大螢幕很吃效能）
Hook.on('worldCanvas', w => {
  try {
    const p = MapTint.on() && w && w._chunkPx && MapTint.pal(w); if (!p) return;   // v2.19 分塊畫：只罩這一塊
    const g = w.canvas.getContext('2d'), B = w._chunkPx; g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = p.a * 0.75; g.fillStyle = p.hi; g.fillRect(B.x, B.y, B.w, B.h); g.restore();
  } catch (e) { }
});
Hook.on('glow', (g, cx, cy) => { try { MapTint.glow(g, cx, cy); } catch (e) { } });
SettingsRows.add('ui', () => `<div class="prow"><div class="pname">地圖色調<small>每種場景罩上自己的顏色（熔岩偏紅、冰原偏藍、虛空偏紫），首領房地上有發光的裂紋</small></div><div class="pctl"><label class="pswitch"><input type="checkbox" data-mtint ${MapTint.on() ? 'checked' : ''}><span></span></label></div></div>`, root => {
  const c = root.querySelector('[data-mtint]');
  if (c) c.onchange = () => { CFG.mapTint = c.checked; saveCfg(); if (G.world) worldRepaint(G.world); };
});
