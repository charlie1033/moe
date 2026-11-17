// =============================================================
//  v2.13.9 荊棘綻放升級
//  ・不能隔牆施放：施放點從角色往滑鼠走，碰到牆就停在牆前（game.js 的 castPoint，暴風雪、隕石也一樣）
//  ・長出來的瞬間「破土」：範圍內的敵人立刻挨一下（1.5 倍的一次傷害），並被擊退一點
//  ・荊棘裡的敵人被纏住：移動和攻擊速度 −30%
//  ・畫面：一根根帶刺的藤蔓從地面竄出、隨風搖、會開紫花，地上有毒霧泡泡；結束前慢慢縮回地裡
//  接點：Hook 'update'（破土、纏繞）、'drawWorld'（藤蔓）；資料都在 G.azones 裡 sid==='thorn' 的那片
// =============================================================
const ThornFX = (() => {
  const isThorn = z => z.sid === 'thorn';
  function spikes(z) {   // 每片荊棘的藤蔓位置（固定亂數，畫面不會跳）
    if (z._sp) return z._sp;
    let s = Math.floor(z.x * 7 + z.y * 13) | 0; const R = () => ((s = (s * 16807 + 11) % 2147483647) / 2147483647);
    const n = Math.round(10 + z.r / 6), out = [];
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * z.r * 0.92;
      out.push({ x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d * 0.62, h: 14 + R() * 18, lean: (R() - 0.5) * 0.9, delay: R() * 0.25, ph: R() * 6, flower: R() < 0.3 });
    }
    return (z._sp = out.sort((p, q) => p.y - q.y));
  }
  Hook.on('update', dt => {
    for (const z of G.azones) {
      if (!isThorn(z)) continue;
      if (!z._burst) {   // 破土
        z._burst = true;
        const pk = Object.assign({}, z.pk, { d: Object.fromEntries(Object.entries(z.pk.d || {}).map(([k, v]) => [k, [v[0] * 1.5, v[1] * 1.5]])) });
        for (const m of G.mons) if (!m.dead && Math.hypot(m.x - z.x, m.y - z.y) <= z.r + m.r) hitMonster(m, pk, false, z, 0.8);
        burst(z.x, z.y, '#5ab05a', 18, 160); G.shake = Math.max(G.shake, 2);
      }
      for (const m of G.mons) if (!m.dead && !m.boss && Math.hypot(m.x - z.x, m.y - z.y) <= z.r + m.r) { m.chill = Math.max(m.chill || 0, 0.25); m.chillAmt = Math.max(m.chillAmt || 0, 0.3); }
      if (Math.random() < 0.25) G.parts.push({ x: z.x + rnd(-z.r, z.r) * 0.8, y: z.y + rnd(-z.r, z.r) * 0.5, vx: 0, vy: -24, t: 0, dur: 0.8, color: '#8ad050', s: 2 });
    }
  });
  Hook.on('drawWorld', g => {
    const T = G.time;
    for (const z of G.azones) {
      if (!isThorn(z)) continue;
      const grow = Math.min(1, z.t / 0.35), fade = Math.min(1, (z.dur - z.t) / 0.5);
      g.save();
      // 地面：深綠的毒沼
      g.globalAlpha = 0.35 * fade; g.fillStyle = '#1e3a14'; g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.62, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
      for (const s of spikes(z)) {
        const k = Math.max(0, Math.min(1, (z.t - s.delay) / 0.3)) * grow * fade; if (k <= 0) continue;
        const h = s.h * k, sway = Math.sin(T * 2.2 + s.ph) * 0.12, a = s.lean + sway;
        const tx = s.x + Math.sin(a) * h, ty = s.y - Math.cos(a) * h;
        // 藤蔓（彎的）
        g.strokeStyle = '#2e5a1e'; g.lineWidth = 3.2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(s.x, s.y); g.quadraticCurveTo(s.x + Math.sin(a) * h * 0.2 + 4 * Math.sign(a || 1), s.y - h * 0.55, tx, ty); g.stroke();
        g.strokeStyle = '#6ad06a'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(s.x, s.y); g.quadraticCurveTo(s.x + Math.sin(a) * h * 0.2 + 4 * Math.sign(a || 1), s.y - h * 0.55, tx, ty); g.stroke();
        // 刺
        g.fillStyle = '#c8e8a0';
        for (const f of [0.35, 0.6, 0.85]) {
          const px = s.x + (tx - s.x) * f, py = s.y + (ty - s.y) * f, side = f === 0.6 ? -1 : 1;
          g.beginPath(); g.moveTo(px, py); g.lineTo(px + side * 4, py - 2); g.lineTo(px, py - 2.5); g.fill();
        }
        if (s.flower && k > 0.9) { g.fillStyle = '#c070e0'; g.beginPath(); g.arc(tx, ty, 2.6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffe0ff'; g.fillRect(tx - 0.6, ty - 0.6, 1.2, 1.2); }
      }
      g.restore();
    }
  });
  return { spikes };
})();
