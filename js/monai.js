// =============================================================
//  v2.7.4 怪物行為多樣化：每種怪物有自己的「打法」，不再全部直直走過來
//  ・衝撞（慢、壯的怪）：瞄準 0.55 秒（地上出現一條預警線）→ 高速衝過去，撞到很痛；衝完會喘一下（可以趁機打）
//  ・跳砸（中型怪、精英）：蹲下 → 地上出現預警圈 → 跳過來砸地（圈內受傷）
//  ・包抄（中型怪）：不走直線，從左右兩側繞過來，一群怪會把你圍住
//  ・打了就退（快的小怪，像狼、蝙蝠）：咬一口就退開，再找機會衝回來
//  ・側移（遠程怪）：射完往旁邊橫移，比較難一直追著打
//  ・連發（法術遠程怪）：有時一次丟 3 發扇形
//  ・保持距離（弓手類）：被貼近時退得比較早
//  v2.15.3 照使用者的決定：小怪（含精英）不再出現預警線、預警圈，只有首領才有；看動作（蹲低、身體抖、地面隆起）判斷
// =============================================================
const MON_STYLE_NAME = { fly: '飛行', hop: '跳躍前進', burrow: '鑽地', charge: '衝撞', leap: '跳砸', flank: '包抄', skirm: '打了就退', strafe: '側移射擊', burst: '連發', kite: '保持距離', plain: '一般' };
const hashStr = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
function monStyleFor(m) {
  const d = m.def;
  const mv = moveStyleByType(m); if (mv && !(mv === 'burrow' && d.ranged)) return mv;   // v2.15.3 飛行／跳躍／鑽地照怪物種類
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
    if (m.ss === 'hopA' || m.ss === 'hopW' || m.ss === 'dig' || m.ss === 'under' || m.ss === 'rise') { const r = monMove2(m, dt, slow); if (r !== undefined) return r; }
    m.ss = null;
  }
  // —— v2.15.3 新的移動方式：飛行、跳躍前進、鑽地 ——
  if (m.style === 'fly' || m.style === 'hop' || m.style === 'burrow') { const r = monMove2(m, dt, slow); if (r !== undefined) return r; }
  // —— 要不要開始一個特殊動作 ——
  const aggro = m.aggro && !(m.stagger > 0) && m.state !== 'wind', d = dist(m, pl);
  if (aggro && m.sCd <= 0 && G.world && G.world.kind === 'map') {
    if (m.style === 'charge' && d > 110 && d < 320 && los(m.x, m.y, pl.x, pl.y)) {
      m.ss = 'aim'; m.st = 0.55; m.ang = Math.atan2(pl.y - m.y, pl.x - m.x); m.sCd = 4 + Math.random() * 2.5;
      return;
    }
    if (m.style === 'leap' && d > 100 && d < 280 && los(m.x, m.y, pl.x, pl.y)) {
      m.ss = 'crouch'; m.st = 0.5; m.lx = pl.x; m.ly = pl.y; m.sCd = 5 + Math.random() * 2.5;
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
  if (m.hidden) {   // 鑽在地底：只畫一個會動的土堆
    g.save(); g.fillStyle = 'rgba(90,64,40,0.9)'; g.beginPath(); g.ellipse(m.x, m.y + 6, 14, 6, 0, Math.PI, 0); g.fill();
    g.fillStyle = 'rgba(140,104,70,0.8)'; for (let k = -1; k <= 1; k++) g.fillRect(m.x + k * 7 - 2, m.y + 1 - Math.abs(Math.sin(G.time * 12 + k)) * 3, 4, 3); g.restore(); return;
  }
  const up = (m.hop || 0) + (m.flyH || 0);
  if (m.sink) { g.save(); g.globalAlpha = 1 - m.sink * 0.8; g.translate(0, m.sink * 10); _drawMonAI(g, m); g.restore(); return; }
  if (up) { if (m.flyH) { g.save(); g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(m.x, m.y + 8, m.r, m.r * 0.35, 0, 0, Math.PI * 2); g.fill(); g.restore(); } g.save(); g.translate(0, -up); _drawMonAI(g, m); g.restore(); return; }
  if (m.ss === 'aim' || m.ss === 'crouch') { g.save(); const s = 1 + Math.sin(G.time * 30) * 0.03; g.translate(m.x, m.y); g.scale(s, 1 / s); g.translate(-m.x, -m.y); _drawMonAI(g, m); g.restore(); return; }
  _drawMonAI(g, m);
};

// =============================================================
//  v2.15.3 怪物的新移動方式（照怪物種類決定，見 MOVE_BY_TYPE）
//  ・飛行（蝙蝠、精魂、小鬼、火鳥、貓頭鷹、妖精、怨靈）：飛在半空中、邊飛邊左右擺，可以飛過岩漿、水、裂隙和矮障礙（牆照樣擋）
//  ・跳躍前進（史萊姆、蛆、甲蟲、蟹、蠍）：一蹲一跳地靠近，每跳約 3 格
//  ・鑽地（蛇、蜘蛛、掘墓人、沙蟲）：鑽進地底（看不到、打不到）→ 地面隆起一路往你衝 → 停下來抖 0.55 秒 → 破土而出撞你
// =============================================================
const MOVE_BY_TYPE = [[/bat|bird|owl|fairy|wisp|spirit|wraith|imp|moth|wasp|ghost|harpy/, 'fly'], [/slime|maggot|beetle|frog|toad|crab|scarab/, 'hop'], [/serpent|worm|tarantula|spider|gravedigger|scorpion|mole/, 'burrow']];
function moveStyleByType(m) { for (const [re, s] of MOVE_BY_TYPE) if (re.test(m.type)) return s; return null; }
function flyMove(m, dx, dy) {   // 飛的：只被牆擋（岩漿、水、矮障礙都飛得過去）
  const nx = m.x + dx, ny = m.y + dy;
  if (!shotWallAt(nx, m.y)) m.x = nx;
  if (!shotWallAt(m.x, ny)) m.y = ny;
}
function monMove2(m, dt, slow) {
  const pl = G.pl, d = dist(m, pl), reach = (m.def.ranged ? m.range * 0.85 : m.range + m.r + pl.r + 4);
  if (m.style === 'fly') {
    m.flyH = 14 + Math.sin(G.time * 4 + m.side) * 4;
    if (!m.aggro || m.state === 'wind' || d <= reach) return;   // 打得到了：交給一般 AI 攻擊
    const a = Math.atan2(pl.y - m.y, pl.x - m.x) + Math.sin(G.time * 2.5 + m.side * 3) * 0.6, sp = m.speed * slow * 1.05;
    flyMove(m, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt); m.facing = Math.cos(a) >= 0 ? 1 : -1;
    m.atkCD -= dt * slow; return true;
  }
  if (m.style === 'hop') {
    if (m.ss === 'hopA') {
      const p = 1 - Math.max(0, m.st) / 0.32; m.hop = Math.sin(p * Math.PI) * 14; m.st -= dt;
      moveEnt(m, Math.cos(m.ang) * 290 * slow * dt, Math.sin(m.ang) * 290 * slow * dt);
      if (m.st <= 0) { m.hop = 0; m.ss = 'hopW'; m.st = 0.35 + Math.random() * 0.2; }
      return true;
    }
    if (m.ss === 'hopW') { m.st -= dt; if (m.st <= 0) m.ss = null; else { m.atkCD -= dt * slow; return true; } }
    if (!m.aggro || m.state === 'wind' || d <= reach) return;
    m.ss = 'hopA'; m.st = 0.32; m.ang = Math.atan2(pl.y - m.y, pl.x - m.x) + (Math.random() - 0.5) * 0.4; m.facing = Math.cos(m.ang) >= 0 ? 1 : -1;
    return true;
  }
  if (m.style === 'burrow') {
    if (m.ss === 'dig') { m.st -= dt; m.sink = 1 - Math.max(0, m.st) / 0.4; if (m.st <= 0) { m.ss = 'under'; m.st = 1.1; m.hidden = true; } return true; }
    if (m.ss === 'under') {
      m.st -= dt; const a = Math.atan2(pl.y - m.y, pl.x - m.x); moveEnt(m, Math.cos(a) * 260 * slow * dt, Math.sin(a) * 260 * slow * dt);
      if (Math.random() < 0.5) G.parts.push({ x: m.x + rnd(-8, 8), y: m.y + 6, vx: rnd(-20, 20), vy: -30, t: 0, dur: 0.5, color: '#8a6a44', s: 3 });
      if (m.st <= 0 || d < 40) { m.ss = 'rise'; m.st = 0.55; }
      return true;
    }
    if (m.ss === 'rise') {
      m.st -= dt;
      if (m.st <= 0) {
        m.ss = 'tired'; m.st = 0.5; m.hidden = false; m.sink = 0;
        G.fx.push({ k: 'ring', x: m.x, y: m.y, r: 52, t: 0, dur: 0.3, color: '#c89060', fill: 'rgba(200,144,96,0.2)' }); burst(m.x, m.y, '#8a6a44', 18, 180); G.shake = Math.max(G.shake, 3);
        if (dist(pl, m) < 52 + pl.r) monsterStrike(m, pl, m.mlvl < 30 ? 1.2 : 1.4);
      }
      return true;
    }
    if (m.aggro && m.sCd <= 0 && d > 140 && d < 420 && m.state !== 'wind' && G.world && G.world.kind === 'map') { m.ss = 'dig'; m.st = 0.4; m.sCd = 6 + Math.random() * 3; return true; }
  }
}
