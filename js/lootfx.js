// =============================================================
//  v2.15.3 稀有通貨的掉落特效（打寶的驚喜感）
//  ・頂級（好夢、重溫、裂縫）：地上一道彩色光柱、彩色光源、整塊染色的名稱標籤、掉落音效＋左下角訊息
//  ・次一級（亂夢、盛夢、遺忘、金色的夢）：名稱用自己的顏色、外框加粗
//  ・一般通貨照舊（米色字）
//  資料：dropLoot 會讀 CUR_SPECIAL[通貨代號]，把 { tier, color, bg, beam } 放在 l.special
//  畫：光柱用 Hook 'drawWorld'；標籤顏色在 render.js 的掉落物標籤裡讀 l.special
// =============================================================
const CUR_SPECIAL = {
  exalt: { tier: 1, color: '#e8f6ff', bg: '#123048', beam: '#a8e0ff' },
  divine: { tier: 1, color: '#fff2b0', bg: '#4a3606', beam: '#ffd84a' },
  socket: { tier: 1, color: '#ffd0a0', bg: '#4a2408', beam: '#ff9a40' },
  chaos: { tier: 2, color: '#e8b0ff' },
  regal: { tier: 2, color: '#ffe8a0' },
  annul: { tier: 2, color: '#d8d8ff' },
  alch: { tier: 2, color: '#ffd76a' },
};
Hook.on('drawWorld', g => {
  const T = G.time;
  for (const l of G.loot) {
    const s = l.special; if (!s || s.tier !== 1 || l.gone) continue;
    const h = 150, a = 0.45 + 0.15 * Math.sin(T * 3 + l.x);
    const gr = g.createLinearGradient(0, l.y - h, 0, l.y);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, s.beam);
    g.save(); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(l.x - 6, l.y - h, 12, h);
    g.globalAlpha = a * 0.5; g.fillRect(l.x - 14, l.y - h * 0.6, 28, h * 0.6);
    g.globalAlpha = 0.5; g.fillStyle = s.beam; g.beginPath(); g.ellipse(l.x, l.y + 6, 16, 6, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    if (Math.random() < 0.15) G.parts.push({ x: l.x + rnd(-6, 6), y: l.y - rnd(0, 40), vx: 0, vy: -40, t: 0, dur: 0.9, color: s.beam, s: 2 });
  }
});
