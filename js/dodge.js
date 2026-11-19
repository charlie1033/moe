// =============================================================
//  v2.7.4 閃避翻滾＋F 鍵統一互動
//  ・空白鍵（可在設定改）：往移動方向翻滾 140 像素，翻滾中 0.28 秒不會受傷；冷卻 1 秒
//    沒有按方向鍵時，往滑鼠的方向翻
//  ・F：對話、撿東西、進傳送門都是 F；同時有好幾個時，選「離角色最近」的那個，用金色外框標出來
// =============================================================
const DODGE = { dist: 140, time: 0.22, iframe: 0.28, cd: 1.0 };
function playerDodge() {
  const pl = G.pl, P = G.P; if (!pl || !P || G.dead || UI.paused()) return;
  if ((pl.dodgeCd || 0) > 0 || pl.roll > 0) return;
  const pa = pl.ail || {}; if (pa.frozen > 0 || pl.stun > 0) return;
  const k = input.keys; let mx = 0, my = 0;
  if (k.KeyW || k.ArrowUp) my -= 1; if (k.KeyS || k.ArrowDown) my += 1; if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1;
  if (input.joy && Math.hypot(input.joy.x, input.joy.y) > 0.15) { mx = input.joy.x; my = input.joy.y; }
  if (!mx && !my) { const f = faceDir(); mx = f.x; my = f.y; }   // v2.16.2 沒按方向鍵：往角色面向的方向（不是滑鼠）
  const l = Math.hypot(mx, my) || 1;
  pl.rollVx = mx / l * DODGE.dist / DODGE.time; pl.rollVy = my / l * DODGE.dist / DODGE.time;
  pl.roll = DODGE.time; pl.iframe = DODGE.iframe; pl.dodgeCd = DODGE.cd;
  if (mx) pl.facing = mx > 0 ? 1 : -1;
  Sfx.play('swing');
  G.fx.push({ k: 'ring', x: pl.x, y: pl.y + 6, r: 16, t: 0, dur: 0.25, color: '#e8e0ff', fill: 'rgba(220,220,255,0.15)' });
}
// 翻滾的移動、無敵、冷卻
Hook.on('update', dt => {
  const pl = G.pl; if (!pl) return;
  if (pl.dodgeCd > 0) pl.dodgeCd -= dt;
  if (pl.iframe > 0) pl.iframe -= dt;
  if (pl.roll > 0) {
    const t = Math.min(dt, pl.roll); pl.roll -= dt;
    moveEnt(pl, pl.rollVx * t, pl.rollVy * t);
    if (Math.random() < 0.6) burst(pl.x, pl.y + 8, '#d8d0e8', 1, 40);
  }
});
// F 撿東西：登記成互動對象（由 core.js 的 Interact 挑最近的）
Interact.add('loot', () => G.loot.filter(l => !(l.gone || l.t < 0.25 || (typeof lootHidden === 'function' && lootHidden(l)) || (l.item && l.item.rarity === 'normal' && !G.showNormal && !isFlask(l.item)))).map(l => ({ ref: l, label: '撿起 ' + (l.label || ''), r: 80 })), l => pickupLoot(l));
// 翻滾中不受傷（投射物、近戰、地面都算）
const _dmgDodge = damagePlayer;
damagePlayer = function (parts, opts = {}) {
  if (G.pl && G.pl.iframe > 0) { if (!opts.dot && Math.random() < 0.5) G.texts.push({ x: G.pl.x, y: G.pl.y - 30, txt: '閃避', color: '#d8d0ff', t: 0, dur: 0.5 }); return; }
  return _dmgDodge(parts, opts);
};
// 翻滾時角色畫半透明，看得出在無敵
const _drawPlayerDodge = typeof drawPlayer === 'function' ? drawPlayer : null;
if (_drawPlayerDodge) drawPlayer = function (g, ...a) {
  const pl = G.pl, on = pl && pl.roll > 0;
  if (on) g.globalAlpha = 0.55;
  const r = _drawPlayerDodge(g, ...a);
  if (on) g.globalAlpha = 1;
  // 冷卻中：腳下一小段弧線
  if (pl && pl.dodgeCd > 0) { g.strokeStyle = 'rgba(220,210,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.arc(pl.x, pl.y + 10, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - pl.dodgeCd / DODGE.cd)); g.stroke(); }
  return r;
};
// 手機的位移鈕在 touch.js（技能鈕旁邊，畫各職業位移技能的圖示）
