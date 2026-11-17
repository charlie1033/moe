// =============================================================
//  v2.7.4 怪物行為多樣化：每種怪物有自己的「打法」，不再全部直直走過來
//  ・衝撞（慢、壯的怪）：瞄準 0.55 秒（地上出現一條預警線）→ 高速衝過去，撞到很痛；衝完會喘一下（可以趁機打）
//  ・跳砸（中型怪、精英）：蹲下 → 地上出現預警圈 → 跳過來砸地（圈內受傷）
//  ・包抄（中型怪）：不走直線，從左右兩側繞過來，一群怪會把你圍住
//  ・打了就退（快的小怪，像狼、蝙蝠）：咬一口就退開，再找機會衝回來
//  ・側移（遠程怪）：射完往旁邊橫移，比較難一直追著打
//  ・連發（法術遠程怪）：有時一次丟 3 發扇形
//  ・保持距離（弓手類）：被貼近時退得比較早
//  預警線、預警圈看到就翻滾（空白鍵）閃開
// =============================================================
const MON_STYLE_NAME = { charge: '衝撞', leap: '跳砸', flank: '包抄', skirm: '打了就退', strafe: '側移射擊', burst: '連發', kite: '保持距離', plain: '一般' };
const hashStr = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
function monStyleFor(m) {
  const d = m.def;
  let pool;
  if (d.ranged) pool = d.spell ? ['burst', 'strafe', 'burst'] : ['kite', 'strafe'];
  else if (d.speed >= 110) pool = ['skirm', 'flank', 'skirm'];
  else if (d.speed <= 70) pool = ['charge', 'charge', 'plain'];
  else pool = ['flank', 'leap', 'plain', 'charge', 'flank'];
  let s = pool[hashStr(m.type) % pool.length];
  if (s === 'plain' && m.rarity !== 'normal') s = 'charge';
  return s;
}
const _makeMonAI = makeMonster;
makeMonster = function (...a) {
  const m = _makeMonAI(...a);
  if (m && !m.boss) { m.style = monStyleFor(m); m.side = Math.random() < 0.5 ? -1 : 1; m.sCd = 1 + Math.random() * 2.5; }
  return m;
};
// 舊存檔／先產生的怪也補上
function ensureStyle(m) { if (!m.style && !m.boss && m.def) { m.style = monStyleFor(m); m.side = Math.random() < 0.5 ? -1 : 1; m.sCd = 1 + Math.random() * 2; } }

const _updMonAI = updateMonster;
updateMonster = function (m, dt) {
  if (m.boss) return _updMonAI(m, dt);
  ensureStyle(m);
  const pl = G.pl, slow = m.chill > 0 ? 1 - m.chillAmt : 1;
  m.sCd -= dt;
  // —— 進行中的特殊動作 ——
  if (m.ss) {
    if (m.stagger > 0 || m.frozen > 0) { m.ss = null; return _updMonAI(m, dt); }
    m.st -= dt;
    if (m.ss === 'aim') { m.facing = Math.cos(m.ang) >= 0 ? 1 : -1; if (m.st <= 0) { m.ss = 'dash'; m.st = 0.42; m.hit = false; } return; }
    if (m.ss === 'dash') {
      const sp = 560 * slow; moveEnt(m, Math.cos(m.ang) * sp * dt, Math.sin(m.ang) * sp * dt);
      if (!m.hit && dist(m, pl) < m.r + pl.r + 8) { m.hit = true; monsterStrike(m, pl, m.mlvl < 30 ? 1.2 : 1.5); G.shake = Math.max(G.shake, 4); if (typeof knockPlayer === 'function') knockPlayer(m.ang, 200); }
      if (m.st <= 0) { m.ss = 'tired'; m.st = 0.6; }
      return;
    }
    if (m.ss === 'tired') { if (m.st <= 0) m.ss = null; return; }   // 衝完喘一下：不動也不攻擊
    if (m.ss === 'crouch') { if (m.st <= 0) { m.ss = 'air'; m.st = 0.45; m.fx0 = m.x; m.fy0 = m.y; } return; }
    if (m.ss === 'air') {
      const p = 1 - Math.max(0, m.st) / 0.45; m.x = m.fx0 + (m.lx - m.fx0) * p; m.y = m.fy0 + (m.ly - m.fy0) * p; m.hop = Math.sin(p * Math.PI) * 26;
      if (m.st <= 0) {
        m.hop = 0; m.ss = 'tired'; m.st = 0.45;
        if (typeof isWall === 'function' && isWall(m.x, m.y)) { m.x = m.fx0; m.y = m.fy0; }
        G.fx.push({ k: 'ring', x: m.x, y: m.y, r: 62, t: 0, dur: 0.3, color: '#ffb070', fill: 'rgba(255,170,100,0.18)' });
        G.shake = Math.max(G.shake, 3);
        if (dist(pl, m) < 62 + pl.r) monsterStrike(m, pl, m.mlvl < 30 ? 1.1 : 1.3);
        for (const mn of G.mins) if (dist(mn, m) < 62 + mn.r) monsterStrike(m, mn, 1.3);
      }
      return;
    }
    if (m.ss === 'back' || m.ss === 'strafe') {
      const sp = m.speed * slow * (m.ss === 'back' ? 1.15 : 0.85);
      moveEnt(m, Math.cos(m.ang) * sp * dt, Math.sin(m.ang) * sp * dt);
      m.atkCD -= dt * slow;
      if (m.st <= 0) m.ss = null;
      return;
    }
    m.ss = null;
  }
  // —— 要不要開始一個特殊動作 ——
  const aggro = m.aggro && !(m.stagger > 0) && m.state !== 'wind', d = dist(m, pl);
  if (aggro && m.sCd <= 0 && G.world && G.world.kind === 'map') {
    if (m.style === 'charge' && d > 110 && d < 320 && los(m.x, m.y, pl.x, pl.y)) {
      m.ss = 'aim'; m.st = 0.55; m.ang = Math.atan2(pl.y - m.y, pl.x - m.x); m.sCd = 4 + Math.random() * 2.5;
      tele('line', m.x, m.y, m.r * 1.6, 0.55, '#ff7050', m.ang, 0.97 * 560 * 0.42);
      return;
    }
    if (m.style === 'leap' && d > 100 && d < 280 && los(m.x, m.y, pl.x, pl.y)) {
      m.ss = 'crouch'; m.st = 0.5; m.lx = pl.x; m.ly = pl.y; m.sCd = 5 + Math.random() * 2.5;
      tele('circle', m.lx, m.ly, 62, 0.95, '#ffb070');
      return;
    }
  }
  // —— 包抄：還沒到攻擊距離時，從側面繞過去 ——
  if (m.style === 'flank' && aggro && d > 95 && d < 420 && m.state !== 'wind') {
    const a = Math.atan2(m.y - pl.y, m.x - pl.x) + m.side * 0.75, R = Math.max(55, d - 90);
    const tx = pl.x + Math.cos(a) * R, ty = pl.y + Math.sin(a) * R;
    m.atkCD -= dt * slow;
    if (los(m.x, m.y, tx, ty)) { steerToward(m, tx, ty, m.speed * slow, dt, false); return; }
  }
  // —— 一般 AI，攻擊完再決定要不要退開／側移／多丟兩發 ——
  const before = m.state;
  const r = _updMonAI(m, dt);
  if (before === 'wind' && m.state === 'idle' && m.tgt && !m.dead) {
    const away = Math.atan2(m.y - m.tgt.y, m.x - m.tgt.x);
    if (m.style === 'skirm' && Math.random() < 0.5) { m.ss = 'back'; m.st = 0.3 + Math.random() * 0.15; m.ang = away + (Math.random() - 0.5) * 0.8; }
    else if ((m.style === 'strafe' && Math.random() < 0.6) || (m.style === 'burst' && Math.random() < 0.3)) { m.side = Math.random() < 0.5 ? -1 : 1; m.ss = 'strafe'; m.st = 0.35 + Math.random() * 0.25; m.ang = away + m.side * Math.PI / 2; }
    if (m.style === 'burst' && m.def.ranged && Math.random() < 0.35) {
      const a0 = Math.atan2(m.tgt.y - m.y, m.tgt.x - m.x);
      for (const s of [-0.28, 0.28]) enemyProj(m, a0 + s, m.def.pspeed, 0.65, m.def.psprite, null, m.def.spell);
    }
  }
  // 保持距離：玩家靠近到 170 以內就往後退（原本是 120）
  if (m.style === 'kite' && m.def.ranged && m.state !== 'wind' && m.aggro) {
    const dd = dist(m, pl);
    if (dd < 170 && dd >= 120) { const a = Math.atan2(m.y - pl.y, m.x - pl.x); moveEnt(m, Math.cos(a) * m.speed * slow * dt, Math.sin(a) * m.speed * slow * dt); }
  }
  return r;
};
// 跳起來時畫高一點
const _drawMonAI = drawMonster;
drawMonster = function (g, m) {
  if (m.hop) { g.save(); g.translate(0, -m.hop); _drawMonAI(g, m); g.restore(); return; }
  if (m.ss === 'aim' || m.ss === 'crouch') { g.save(); const s = 1 + Math.sin(G.time * 30) * 0.03; g.translate(m.x, m.y); g.scale(s, 1 / s); g.translate(-m.x, -m.y); _drawMonAI(g, m); g.restore(); return; }
  _drawMonAI(g, m);
};
