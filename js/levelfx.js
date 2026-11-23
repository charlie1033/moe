// =============================================================
//  v2.8.11 經驗下修＋升級特效
//  ・一夜分成好幾區（主線 3 區、深層 4～6 區），打的怪變多了：每隻怪的經驗 ×（1.3 ÷ 區數）
//    → 打完整一夜拿到的經驗，大約是以前一張圖的 1.3 倍（多出來的是地圖事件、寶箱的份）
//  ・寶石經驗也一樣下修
//  ・升級特效：金色光柱、往外擴的光環、往上飄的光點、大字「等級提升」
// =============================================================
const xpStageMul = () => { const w = G.world; return w && w.stage && w.stage.n ? 1.3 / w.stage.n : 1; };
const _killXP = killMonster;
killMonster = function (m) { G._xpMul = xpStageMul(); try { return _killXP(m); } finally { G._xpMul = 1; } };
const _gainXpLF = gainXp;
gainXp = function (n) {
  const P = G.P, lv0 = P ? P.lvl : 0;
  const r = _gainXpLF(n * (G._xpMul || 1));
  if (P && P.lvl > lv0) G.lvlFx = { t: 0, lv: P.lvl };
  return r;
};
const _gemXpLF = gemGainXp;
gemGainXp = function (n) { return _gemXpLF(n * (G._xpMul || 1)); };
// 升級特效（畫在世界座標，角色身上）
const _drawStageLF = drawStageExtras;
drawStageExtras = function (g) {
  _drawStageLF(g);
  const F = G.lvlFx, pl = G.pl; if (!F || !pl) return;
  F.t += 1 / 60; const t = F.t, D = 1.8; if (t > D) { G.lvlFx = null; return; }
  const a = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / (D - 0.15));
  g.save(); g.globalCompositeOperation = 'lighter';
  // 光柱
  const h = 220 * Math.min(1, t / 0.25), gr = g.createLinearGradient(0, pl.y - h, 0, pl.y + 10);
  gr.addColorStop(0, 'rgba(255,230,140,0)'); gr.addColorStop(0.6, `rgba(255,220,120,${0.35 * a})`); gr.addColorStop(1, `rgba(255,250,210,${0.7 * a})`);
  g.fillStyle = gr; g.fillRect(pl.x - 22, pl.y - h, 44, h + 10);
  // 地上的光環（兩圈往外擴）
  for (let k = 0; k < 2; k++) { const p = Math.min(1, (t - k * 0.25) / 0.9); if (p <= 0) continue; g.strokeStyle = `rgba(255,215,110,${(1 - p) * 0.9})`; g.lineWidth = 4 - p * 3; g.beginPath(); g.ellipse(pl.x, pl.y + 10, 20 + p * 110, (20 + p * 110) * 0.38, 0, 0, Math.PI * 2); g.stroke(); }
  g.restore();
  // 往上飄的光點
  if (t < 1.2 && Math.random() < 0.8) for (let i = 0; i < 2; i++) G.parts.push({ x: pl.x + rnd(-26, 26), y: pl.y + rnd(-10, 10), vx: rnd(-10, 10), vy: rnd(-120, -60), t: 0, dur: rnd(0.6, 1.1), color: pick(['#fff0a0', '#ffd36a', '#ffffff']), s: 2.5 });
  // 大字
  if (t < 1.5) { const s = t < 0.2 ? 0.6 + t * 2 : 1, y = pl.y - 70 - t * 12; g.save(); g.globalAlpha = Math.min(1, a * 1.3); g.translate(pl.x, y); g.scale(s, s); txt(g, '等級提升', 0, 0, 22, '#ffe48a', 'center'); txt(g, `Lv ${F.lv}`, 0, 22, 14, '#ffffff', 'center'); g.restore(); }
};
