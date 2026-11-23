// =============================================================
//  v2.19.15 特殊掉落高亮（試玩回饋：特殊掉落可以更顯眼）
//  玩家看到：
//   ・傳奇（橘）、套裝（綠）、夢魘鑰匙與碎片（各自的顏色）：地上一道高光柱、名稱標籤整塊染色加粗框、
//     掉下來那一刻腳下一圈光往外擴；小地圖上一顆一閃一閃的菱形（不管在哪一區都看得到，撿走就消失）
//   ・頂級通貨（崇高石、神聖石、鑿孔石）原本就有光柱（lootfx.js），這裡加上小地圖菱形
//   ・技能寶石、珠寶：名稱標籤加粗框（不加光柱，免得滿地都是光）
//  做法：沿用 lootfx.js 的 l.special（{ tier, color, bg, beam }）：tier 1＝光柱＋整塊染色標籤，tier 2＝加粗框
//    新掉的東西在 Hook 'update' 裡分類一次（l._hl），通貨原本就有 l.special 的不動
//  接點：Hook 'update'、'drawMinimap'（框的位置照 minimapmarks.js 的 G.mmView）
// =============================================================
function lootHighlight(l) {
  if (l.item && l.item.rarity === 'unique') return l.item.set
    ? { tier: 1, bg: '#0e2e1c', beam: '#5ad08a', mm: '#6ae09a' }
    : { tier: 1, bg: '#3a1a06', beam: '#ff9a40', mm: '#ff9a40' };
  if (l.key || l.frag) return { tier: 1, bg: '#2a1036', beam: l.color || '#d080ff', mm: l.color || '#d080ff' };
  if (l.skill || l.jewel) return { tier: 2 };
  if (l.special && l.special.tier === 1) return Object.assign({ mm: l.special.beam }, l.special);
  return null;
}
Hook.on('update', () => {
  for (const l of G.loot) {
    if (l._hl !== undefined) continue;
    const h = l._hl = lootHighlight(l);
    if (!h) continue;
    if (!l.special) l.special = h;
    if (h.tier === 1 && G.fx) G.fx.push({ k: 'ring', x: l.x, y: l.y + 4, r: 46, t: 0, dur: 0.6, color: h.beam, fill: 'rgba(255,255,255,0.06)' });
  }
});
// 小地圖：一閃一閃的菱形（外圈黑邊），菱形比事件的大一點
Hook.on('drawMinimap', (g, mx, my, s) => {
  const w = G.world; if (!w || w.kind === 'town' || !G.loot.length) return;
  const V = G.mmView && G.mmView.wd === w ? G.mmView : { x: mx, y: my, w: w.W * s, h: w.H * s };
  const b = 0.55 + 0.45 * Math.sin(G.time * 6), r = Math.max(3.5, s * 1.8);
  g.save(); g.beginPath(); g.rect(V.x - 3, V.y - 3, V.w + 6, V.h + 6); g.clip();
  for (const l of G.loot) {
    const h = l._hl; if (!h || !h.mm || l.gone) continue;
    const px = mx + l.x / TS * s, py = my + l.y / TS * s;
    g.globalAlpha = 0.35 + 0.65 * b; g.fillStyle = h.mm; g.beginPath(); g.moveTo(px, py - r - 1); g.lineTo(px + r, py); g.lineTo(px, py + r + 1); g.lineTo(px - r, py); g.closePath(); g.fill();
    g.globalAlpha = 1; g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke();
  }
  g.restore();
});
