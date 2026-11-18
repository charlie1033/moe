// =============================================================
//  章節地圖的區域首領（rows 裡的 B，資料在那一區的 bosses.B）
//  玩家看到：一隻放大、換色、名字金色、腳下有金色光圈的強化精英（黃怪再多 2 個精英能力、生命約 8 倍、傷害 ×1.2、等級 +2）
//    ・第一次看到牠：大橫幅播牠的台詞，畫面上方出現首領血條，小地圖上是紅色骷髏
//    ・大招：每 7～9 秒在你腳下和旁邊放 3 個預警圈（1.3 秒後炸開，躲開就沒事）；元素跟著場景（熔岩＝火、冰＝冰……）
//    ・打倒：每個角色只有第一次打倒會掉 reward（之後照一般黃怪掉落）；有 story 的話算完成那個劇情事件
//    ・每次進那一區牠都會在（可以重打），只有保證獎勵限第一次
//  資料：P.chapBoss[首領id] = true；地圖 w.chap.boss = { x, y, dead, lx, ly }（純資料，沒打完的夢會還原：讀回來後把同種的黃怪換回首領）
//  接點：Hook 'stage'、'update'、'kill'、'drawWorld'、'drawOver'
// =============================================================
const ChapBoss = (() => {
  const pend = [];
  const def = w => { const d = ChapterMaps.def(w); return d && d.bosses && d.bosses.B; };
  const hex = h => { h = (h || '#ffffff').replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  function tint(sprite, col) { const pal = SPRITE_PAL[sprite]; if (!pal || !col) return null; const o = {}; for (const k in pal) if (k !== 'k' && /^#/.test(pal[k])) o[k] = mix(pal[k], col, 0.5); return o; }
  function spawn(w, bd, x, y, lf) {
    const type = MONSTERS[bd.base] ? bd.base : pick(w.theme.monsters);
    const m = makeMonster(type, x, y, w.mlvl + 2, 'rare', w.theme); if (!m) return null;
    let life = 1, dmg = 1.2;
    const pool = MONSTER_MODS.filter(md => !m.mods.includes(md.name) && (!md.minLvl || m.mlvl >= md.minLvl));
    for (let i = 0; i < 2 && pool.length; i++) {
      const md = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; m.mods.push(md.name);
      if (md.speed) m.speed *= md.speed; if (md.aspd) m.aspd *= md.aspd; if (md.dmg) dmg *= md.dmg; if (md.life) life *= md.life;
      if (md.regen) m.regen = md.regen; if (md.vamp) m.vamp = true; if (md.addElem) m.addElem = md.addElem;
    }
    m.maxLife = Math.round(m.maxLife * 2.2 * life); m.life = Math.max(1, m.maxLife * (lf || 1)); m.dmg = [m.dmg[0] * dmg, m.dmg[1] * dmg];
    const sc = clamp(bd.scale || 1.6, 1.2, 2.5); m.scale = Math.max(m.scale + 1, Math.round(m.scale * sc)); m.r *= Math.min(1.8, sc);
    const tn = tint(m.def.sprite, bd.color); if (tn) m.tint = tn;
    m.name = bd.name || m.name; m.chapBoss = bd.id || 'chboss'; m.cbT = 4;
    G.mons.push(m); return m;
  }
  const live = () => G.mons.find(m => m.chapBoss && !m.dead);
  Hook.on('stage', w => {
    const c = w && w.chap; if (!c || !c.boss || w.bossRoom || c.bossSpawned) return;
    const bd = def(w); if (!bd) return; c.bossSpawned = true;
    spawn(w, bd, c.boss.x, c.boss.y, 1);
  });
  Hook.on('update', dt => {
    const w = G.world, pl = G.pl, c = w && w.chap; if (!c || !c.boss || !pl || c.boss.dead || !c.bossSpawned) return;
    const bd = def(w); if (!bd) return;
    let b = live();
    if (!b) {   // 沒打完的夢讀回來：首領變成普通黃怪了 → 換回來
      const lx = c.boss.lx || c.boss.x, ly = c.boss.ly || c.boss.y;
      const old = G.mons.filter(m => !m.dead && m.rarity === 'rare' && (m.type === bd.base || !MONSTERS[bd.base])).sort((a, z) => Math.hypot(a.x - lx, a.y - ly) - Math.hypot(z.x - lx, z.y - ly))[0];
      let lf = 1; if (old && Math.hypot(old.x - lx, old.y - ly) < 200) { lf = old.life / old.maxLife; G.mons.splice(G.mons.indexOf(old), 1); }
      b = spawn(w, bd, lx, ly, lf); if (!b) return;
    }
    c.boss.lx = Math.round(b.x); c.boss.ly = Math.round(b.y);
    const d = dist(b, pl);
    if (!b.awake && d < 380 && los(b.x, b.y, pl.x, pl.y)) {
      b.awake = true; b.aggro = true; G.bossBar = b; Sfx.play('bossroar'); G.shake = Math.max(G.shake, 5);
      UI.banner(b.name, bd.line ? `「${bd.line}」` : '區域首領', bd.color || '#ffd36a');
      if (bd.line) UI.msg(`${b.name}：「${bd.line}」`, '#ffd36a');
    }
    if (b.awake && d < 700 && (!G.bossBar || G.bossBar.dead)) G.bossBar = b;
    // 大招：3 個預警圈
    if (b.awake && d < 520 && (b.cbT -= dt) <= 0) {
      b.cbT = rnd(7, 9);
      const L = BOSS_LAIR[w.theme.id], elem = (L && L.haz.elem) || 'phys', col = ELEM_COLOR[elem] || '#ffd36a', hit = (b.dmg[0] + b.dmg[1]) / 2 * 2.2;
      for (let i = 0; i < 3; i++) {
        const p = i === 0 ? nearestFloor(pl.x, pl.y) : randomFloorNear(pl.x + rnd(-120, 120), pl.y + rnd(-90, 90), 40);
        G.teles.push({ shape: 'circle', x: p.x, y: p.y, r: 70, dur: 1.3, t: 0, color: col });
        pend.push({ x: p.x, y: p.y, at: G.time + 1.3, elem, col, hit, b, w0: w });
      }
      UI.msg(`${b.name}要放大招了——躲開預警圈`, '#ffb070');
    }
  });
  Hook.on('update', () => {
    const pl = G.pl; if (!pl || !pend.length) return;
    for (const q of pend) if (G.time >= q.at || q.b.dead) {
      q.done = true; if (q.b.dead || G.world !== q.w0) continue;
      G.fx.push({ k: 'ring', x: q.x, y: q.y, r: 70, t: 0, dur: 0.35, color: q.col, fill: q.col + '44' }); burst(q.x, q.y, q.col, 18, 220); G.shake = Math.max(G.shake, 4);
      if (Math.hypot(pl.x - q.x, pl.y - q.y) < 70 + pl.r) damagePlayer([[q.hit, q.elem]], { spell: true });
    }
    for (let i = pend.length - 1; i >= 0; i--) if (pend[i].done) pend.splice(i, 1);
  });
  Hook.on('enterMap', () => { pend.length = 0; });
  Hook.on('kill', m => {
    if (!m.chapBoss) return;
    const w = G.world, c = w && w.chap, P = G.P, bd = def(w) || {}; if (c && c.boss) c.boss.dead = true;
    if (G.bossBar === m) G.bossBar = null;
    const first = P && !P.chapBoss[m.chapBoss]; if (P) P.chapBoss[m.chapBoss] = true;
    if (first) { ChapEv.reward(bd.reward, m.x, m.y); UI.banner(`${m.name}倒下了`, bd.reward ? '牠留下了東西' : '區域首領', '#ffd36a'); Sfx.play('unique'); }
    else UI.msg(`${m.name}倒下了`, '#ffd36a');
    if (bd.story && P && !P.chapEv[bd.story]) ChapEv.completeById(bd.story, m.x, m.y);
    saveGame();
  });
  // 腳下金色光圈、金色名字（蓋在黃色名字上面）
  Hook.on('drawWorld', g => {
    const b = G.world && G.world.chap && live(); if (!b) return;
    const feet = b.y + b.r * 0.8, a = 0.5 + 0.3 * Math.sin(G.time * 4);
    g.save(); g.strokeStyle = `rgba(255,200,80,${a})`; g.lineWidth = 3; g.beginPath(); g.ellipse(b.x, feet, b.r + 10, (b.r + 10) * 0.45, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = `rgba(255,170,60,${a * 0.18})`; g.fill(); g.restore();
  });
  Hook.on('drawOver', g => {
    const b = G.world && G.world.chap && live(); if (!b || dist(b, G.pl) >= 360) return;
    const sp = getSprite(b.def.sprite, b.scale, b.tint, false), top = b.y + b.r * 0.8 - sp.h - 6;
    txt(g, b.name, b.x, top - 10, 11, '#ffd36a', 'center');
    txt(g, '— 區域首領 —', b.x, top - (b.mods.length ? 36 : 23), 10, '#ffb050', 'center');
  });
  return { spawn, live, tint };
})();
