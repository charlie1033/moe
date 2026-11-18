// =============================================================
//  v2.15.3 小地圖標記：地圖事件、精英怪、守護者、首領之門
//  ・事件：探索過的地方才顯示；用過的就從小地圖消失（進行中的照樣顯示）。顏色：神殿＝神殿的顏色、深淵＝紫、精髓＝淡藍、瞻望＝淡黃、
//          寶箱＝金、夢潮裂隙＝藍、獻祭圈＝紅、迷霧＝灰綠
//  ・精英怪：看得到的範圍（離你 520 以內，或探索過的地方）才顯示：黃色精英＝黃點、藍色精英＝藍點、守護者＝橘色大點
//  ・首領之門：封印中＝暗紫、打開＝金色閃爍
//  接點：render.js 小地圖畫完之後發的 Hook 'drawMinimap'(g, mx, my, s)
// =============================================================
const MINI_EV_COLOR = { abyss: '#b070ff', essence: '#9ae8ff', vision: '#ffe9a0', chest: '#ffd36a', tide: '#7ad8ff', rite: '#ff7a90', mist: '#a8c8c0' };
Hook.on('drawMinimap', (g, mx, my, s) => {
  const w = G.world, pl = G.pl; if (!w || w.kind === 'town') return;
  const seen = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return !w.explored || w.explored[ty * w.W + tx]; };
  const P = (x, y) => [mx + x / TS * s, my + y / TS * s];
  const dot = (x, y, r, col, ring) => { const [px, py] = P(x, y); g.fillStyle = col; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); if (ring) { g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke(); } };
  const blink = 0.6 + 0.4 * Math.sin(G.time * 5);
  // v2.17.3 小地圖下方：這一區還剩幾隻怪（精英另外算）
  if (w.kind === 'map') {
    const alive = G.mons.filter(m => !m.dead && !m.boss), el = alive.filter(m => m.rarity && m.rarity !== 'normal').length;
    const tx = mx + w.W * s, ty = my + w.H * s + 16;
    g.save(); g.font = 'bold 12px sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
    const t = `怪物 ${alive.length}${el ? `（精英 ${el}）` : ''}`, tw = g.measureText(t).width;
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(tx - tw - 8, ty - 9, tw + 10, 18);
    g.fillStyle = alive.length ? '#e8d8b8' : '#9fe0a0'; g.fillText(alive.length ? t : '這一區清空了', tx - 2, ty);
    g.restore();
  }
  // 事件
  for (const ev of w.events || []) {
    if (!seen(ev.x, ev.y)) continue;
    if (ev.done && !ev.active) continue;   // v2.16.2 用過的事件不再顯示
    const col = ev.kind === 'shrine' ? (SHRINES[ev.type] || {}).color || '#fff' : MINI_EV_COLOR[ev.kind] || '#ffffff';
    const [px, py] = P(ev.x, ev.y), r = Math.max(2.5, s * 1.2);
    g.fillStyle = col; g.beginPath(); g.moveTo(px, py - r - 1); g.lineTo(px + r, py); g.lineTo(px, py + r + 1); g.lineTo(px - r, py); g.closePath(); g.fill();
    g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1;
  }
  // 首領之門
  const gate = w.bossGate;
  if (gate && seen(gate.x, gate.y)) { g.globalAlpha = gate.open ? blink : 0.8; dot(gate.x, gate.y, Math.max(3, s * 1.6), gate.open ? '#ffb050' : '#6a4a7a', true); g.globalAlpha = 1; }
  // 精英怪、守護者
  for (const m of G.mons) {
    if (m.dead || m.boss || m.hidden || (m.rarity === 'normal' && !m.guardian)) continue;
    if (Math.hypot(m.x - pl.x, m.y - pl.y) > 520 && !seen(m.x, m.y)) continue;
    if (m.guardian) { g.globalAlpha = blink; dot(m.x, m.y, Math.max(2.5, s * 1.4), '#ff8a30', true); g.globalAlpha = 1; }
    else dot(m.x, m.y, Math.max(1.5, s * 0.8), m.rarity === 'rare' ? '#ffd84a' : '#7aa8ff');
  }
});
