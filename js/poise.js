// =============================================================
//  v2.20 怪物的「堅忍」（站穩）
//  玩家看到：
//   ・怪物被打會被擊退、頓一下（硬直）；同一隻怪累積吃下的傷害越多，退得越少、頓得越短，最後完全打不退
//     （看的是「吃了多少傷害」，不是被打幾下：一下打掉 30% 跟十下各打 3%，站穩的程度一樣）
//   ・擊退和硬直倍率＝ 1 − 累積傷害 ÷ (最大生命 × 站穩門檻)，最低 0
//       一般怪：累積 30% 生命時剩一半、60% 以上完全不退
//       藍色精英 40%、黃色精英 30%、守護者／區域首領 20% 就完全站穩（精英以前會被一路打退到牆邊）
//       看守者本來就打不退（不變）
//   ・這一下要不要退，看的是「這一下之前」累積了多少（所以一大下照樣打得退，之後才站穩）
//   ・停手 POISE_DELAY 秒（3 秒）沒被打，堅忍每秒回落最大生命的 POISE_DECAY（15%）→ 要連續追打才會站穩
//   ・精英、守護者、區域首領的血條下面有一條細細的金色「堅忍條」，滿了＝站穩：閃一下金光、頭上跳「站穩」，之後條會發亮；一般小怪不顯示
//  資料：都在怪物身上，不存檔：m.poise（累積傷害 ÷ 最大生命）、m.poiseT（上次被打的遊戲時間）、m._poised（已經站穩）
//  接點：game.js 的 hitMonster 在算擊退之前發 Hook 'monKb'(ctx)，ctx = { m, dmg（這一下的傷害）, kb（原本的擊退倍率，可以改） }
//        Hook 'update'（回落）、'drawOver'（堅忍條，位置用 render.js drawMonster 記下的 m._barY）
// =============================================================
const POISE_FULL = { normal: 0.6, magic: 0.4, rare: 0.3, boss: 0.2 };   // 累積到「最大生命的多少」完全站穩（一半的時候擊退剩一半）
const POISE_FULL_BIG = 0.2;     // 守護者、區域首領
const POISE_DELAY = 3;          // 幾秒沒被打，堅忍開始回落
const POISE_DECAY = 0.15;       // 回落速度：每秒回落最大生命的多少
const poiseFull = m => (m.guardian || m.chapBoss) ? POISE_FULL_BIG : (POISE_FULL[m.rarity] || POISE_FULL.normal);
// 擊退、硬直要乘的倍率（0～1）
const poiseMul = m => Math.max(0, 1 - (m.poise || 0) / poiseFull(m));
Hook.on('monKb', c => {
  const m = c.m; if (!m || !m.maxLife) return;
  c.kb *= poiseMul(m);
  m.poise = Math.min(poiseFull(m) * 1.5, (m.poise || 0) + Math.max(0, c.dmg) / m.maxLife);   // 多存一點，停手後不會一回落就馬上又被打退
  m.poiseT = G.time;
  if (!m._poised && m.poise >= poiseFull(m) && m.rarity !== 'normal' && !m.boss) {
    m._poised = true;
    G.texts.push({ x: m.x, y: m.y - m.r - 40, txt: '站穩', color: '#ffd76a', size: 12, t: 0, dur: 0.8 });
    G.fx.push({ k: 'ring', x: m.x, y: m.y, r: m.r + 16, t: 0, dur: 0.35, color: '#ffd76a', fill: 'rgba(255,215,106,0.12)' });
    burst(m.x, m.y - m.r * 0.5, '#ffd76a', 10, 120);
  }
});
Hook.on('update', dt => {
  if (UI.paused() || G.dead) return;
  for (const m of G.mons) {
    if (!m.poise || m.dead || G.time - (m.poiseT || 0) < POISE_DELAY) continue;
    m.poise = Math.max(0, m.poise - POISE_DECAY * dt);
    if (m._poised && m.poise < poiseFull(m)) m._poised = false;
  }
});
// 堅忍條：精英、守護者、區域首領才畫（一般小怪不畫）；在血條（render.js lifeBar）正下方
Hook.on('drawOver', g => {
  const cam = G.cam; if (!cam) return;
  for (const m of G.mons) {
    if (m.dead || !m.poise || m.rarity === 'normal' || m.boss || m._barY == null) continue;
    if (m.x < cam.x - 60 || m.x > cam.x + VW + 60 || m.y < cam.y - 60 || m.y > cam.y + VH + 60) continue;
    const w = Math.max(26, m.r * 2.4), x = m.x - w / 2, y = m._barY + 5, f = Math.min(1, m.poise / poiseFull(m));
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x - 1, y - 1, w + 2, 3);
    g.fillStyle = m._poised ? '#ffe9a0' : '#c89a3a'; g.fillRect(x, y, w * f, 1.5);
    if (m._poised) { g.globalAlpha = 0.35 + 0.25 * Math.sin(G.time * 8); g.fillStyle = '#ffd76a'; g.fillRect(x - 1, y - 1, w + 2, 3.5); g.globalAlpha = 1; }
  }
});
