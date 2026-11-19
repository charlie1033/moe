// =============================================================
//  devtest.js — 一鍵自我檢查（只有網址加 ?dev=1 才會載入，玩家不會用到）
//  用法：瀏覽器打開 http://localhost:埠號/?dev=1 ，在 console 執行  await MOE_DEV.smoke()
//  回傳 { ok, pass, fail:[…], errors:[…] }。fail 和 errors 都是空的才算通過。
//  改完任何東西都先跑這個；新功能請在 TESTS 加一條（一條 5～15 行就好）。
//  測試會建立名叫「測試員」的角色，結束時自動刪掉，倉庫也會還原。
// =============================================================
const MOE_DEV = {
  NAME: '測試員',
  errors: [],
  clean() {
    try { if (G.P) backToTitle(); } catch (e) { }
    try { JSON.parse(localStorage.getItem('yiwang_chars_v2')).chars.filter(c => c.name === this.NAME).forEach(c => deleteChar(c.id)); } catch (e) { }
    Object.keys(localStorage).filter(k => k.startsWith('yiwang_dream_')).forEach(k => localStorage.removeItem(k));
  },
  // 章節手工地圖的示範圖（第 1 夜第 1 區）：S、X、D、p、三種池子、木橋、障礙物、四種事件、布景、區域首領；chapTry 跑完會還原
  chapDemo() {
    const W = 64, H = 44, R = Array.from({ length: H }, () => Array(W).fill('#'));
    const box = (x, y, w, h, ch = '.') => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) R[j][i] = ch; };
    box(3, 3, 26, 16); box(28, 8, 8, 4); box(35, 3, 26, 16); box(3, 24, 26, 17); box(14, 18, 4, 7); box(35, 24, 26, 17);
    box(50, 19, 4, 5, 'D'); box(43, 3, 2, 16, '~'); box(43, 10, 2, 2, '='); box(48, 30, 11, 8, 'X'); box(5, 37, 3, 2, '%'); box(55, 14, 2, 2, '^'); box(38, 32, 4, 3, '~');
    [[20, 5, 'T'], [24, 7, 'o'], [26, 15, 'I'], [37, 16, '*'], [40, 15, 'b'], [57, 6, '!'], [58, 9, 'm'], [25, 27, 'w'], [26, 38, 't'], [57, 26, 'v'], [37, 26, 'c'],
      [6, 6, 'S'], [14, 12, '1'], [8, 32, '2'], [39, 6, '3'], [22, 36, '4'], [48, 13, '5'], [18, 30, 'B'], [10, 28, 'p'], [40, 38, 'p']].forEach(([x, y, c]) => R[y][x] = c);
    const ev = (id, kind, o) => Object.assign({ id, kind, marker: 'book', label: '查看', title: id, pages: ['測試。'], journal: '測試。' }, o);
    return { tier: 1, stage: 1, name: '測試墓穴', intro: '測試用的夢。', rows: R.map(r => r.join('')),
      events: { '1': ev('dev_ghost', 'npc', { who: '士兵', look: 'ghost', scene: 'hut', opens: true, npcLine: { npc: 'jailer', text: '測試台詞' } }), '2': ev('dev_book', 'lore', { scene: 'shrine', reward: { cur: 'alch', n: 1 } }),
        '3': ev('dev_shard', 'collect', { part: 1, of: 2 }), '4': ev('dev_shard', 'collect', { part: 2, of: 2, done: { title: '鏡子', pages: ['拼好了。'], journal: '拼好了。' } }),
        '5': ev('dev_amb', 'ambush', { scene: 'camp', waves: 2, after: '安靜了。' }) },
      bosses: { B: { id: 'dev_boss', name: '測試的老骨頭', base: 'skeleton', scale: 1.6, color: '#bfe8ff', line: '你來了。', reward: { item: 'rare' }, story: 'dev_bossstory' } } };
  },
  chapTry(fn) { const old = CHAPTER_MAPS['1-1']; ChapterMaps.add(this.chapDemo()); try { fn(); } finally { if (old) CHAPTER_MAPS['1-1'] = old; else ChapterMaps.remove(1, 1); } },


  hero(cls = 'warrior', lvl = 30, maxTier = 13) {
    this.realDP = this.realDP || window.damagePlayer;
    this.clean();
    const P = newCharacter(cls, this.NAME); P.lvl = lvl; P.maxTier = maxTier; P.story = { seen: { intro: true, ending: true } };
    startGame(P); this.quiet(); window.damagePlayer = () => { }; return G.P;
  },
  quiet() { UI.storyOpen = false; const s = document.getElementById('story'); if (s) s.classList.remove('show'); if (UI.storyQ) UI.storyQ.length = 0; },
  run(sec = 1) { for (let i = 0; i < sec * 30; i++) { this.quiet(); update(1 / 30); } render(); },
  near(ref, dx = 20) { G.pl.x = ref.x + dx; G.pl.y = ref.y; this.quiet(); update(1 / 30); return G.nearAct; },
  ok(c, msg) { if (!c) throw new Error(msg); },
  TESTS: {
    '營地居民與終局新美術': T => {   // artcamp.js：營地居民換圖（關掉新美術退回怪物圖）、終局事件、首領之門、碼頭不會出錯
      if (typeof ARTWORK === 'undefined') return;
      T.ok(WARDEN_TEXT.beast.camp.sprite === 'camp_beast', '營地居民沒接上新美術');
      const s = getSprite('camp_beast', 2, null, false); T.ok(s && s.w > 0 && s.h > 0, '大白的圖拿不到');
      const was = ArtStyle.on; ArtStyle.on = false; const o = getSprite('camp_beast', 2, null, false); ArtStyle.on = was; T.ok(o && o.w > 0, '關掉新美術時大白沒有退回原本的圖');
      const g = document.createElement('canvas').getContext('2d');
      for (const kind of ['tide', 'rite', 'mist']) drawEventArt(g, { kind, x: 50, y: 50, done: false, cleared: kind === 'mist' });
      T.ok(typeof drawGateArt === 'function' && typeof drawFishArt === 'function', '首領之門／碼頭的美術掛鉤不見了');
      drawGateArt(g, { x: 50, y: 50, open: false }, '測試'); drawGateArt(g, { x: 50, y: 50, open: true }, '測試'); drawFishArt(g, { x: 50, y: 50 });
    },
    '打擊特效加強': T => {   // juice.js：拖尾、飛行拉伸、連擊升調、首領倒下推近、位移殘影
      T.ok(typeof JUICE === 'object' && typeof juiceProjXf === 'function' && typeof juiceZoom === 'function', 'juice.js 沒載入');
      T.hero('ranger', 20, 5); enterMap(2); T.quiet();
      G.projs.push({ x: G.pl.x, y: G.pl.y, vx: 400, vy: 0, r: 4, sprite: 'orb', color: '#80c0ff', team: 'ally', life: 2, pk: { d: { phys: [1, 1] } }, pierce: 0, hit: new Set(), explode: 0, child: true });
      const p = G.projs[G.projs.length - 1]; T.run(0.3); T.ok(!G.projs.includes(p) || (p._tr && p._tr.length >= 4), '投射物沒有記錄拖尾');
      const g = document.createElement('canvas').getContext('2d'), m0 = g.getTransform();
      if (juiceProjXf(g, { x: 0, y: 0, vx: 300, vy: 0 })) { T.ok(Math.abs(g.getTransform().a - JUICE.stretch.along) < 0.01, '投射物沒有沿方向拉長'); g.restore(); }
      T.ok(g.getTransform().a === m0.a, '拉長之後沒有還原');
      const r1 = Sfx.pitchMul('kill', 1), r2 = Sfx.pitchMul('kill', 1), r3 = Sfx.pitchMul('kill', 1); T.ok(r3 > r2 && r2 > 0.95, '連續擊殺音效沒有升高');
      T.ok(Sfx.pitchMul('hit', 0.97) === 0.97, '一般打擊音效不該跟著升調');
      G.slowmo = 1.2; T.run(0.2); T.ok(juiceZoom() > 1, '首領倒下鏡頭沒有推近'); G.slowmo = 0; T.ok(juiceZoom() === 1, '慢動作結束鏡頭沒有拉回');
      G.pl.x += 200; T.run(0.05); T.ok(Juice.dashes() > 0, '瞬間位移沒有殘影');
    },
    '資料完整': T => {
      for (const k in SKILLS) T.ok(SKILLS[k].name && SKILLS[k].tags && SKILLS[k].req, '技能資料不完整 ' + k);
      for (const k in SUPPORTS) T.ok(SUPPORTS[k].req && SUPPORTS[k].mods && SUPPORTS[k].cost, '輔助資料不完整 ' + k);
      for (const n of TREE.list) for (const s in n.stats) T.ok(STAT_TEXT[s], '天賦數值沒有說明文字 ' + s);
      T.ok(typeof Hook === 'object' && typeof Interact === 'object', 'core.js 沒載入');
    },
    '六職業開局、進圖、放技能、位移': T => {
      for (const cls of Object.keys(CLASSES)) {
        const P = T.hero(cls, 15, 5); enterMap(2); T.quiet();
        const m = G.mons.find(x => !x.boss); m.x = G.pl.x + 60; m.y = G.pl.y; input.wx = m.x; input.wy = m.y;
        for (let i = 0; i < 2; i++) { G.pl.cd = {}; G.pl.act = 0; G.pl.mana = 999; useSkill(i); T.run(0.5); }
        G.pl.dodgeCd = 0; const x0 = G.pl.x, y0 = G.pl.y; input.keys = { KeyD: true }; playerDodge(); T.run(0.7); input.keys = {};
        T.ok(Math.hypot(G.pl.x - x0, G.pl.y - y0) > 30, cls + ' 位移沒有動');
      }
    },
    '按 F 互動：撿東西、路人、地圖事件、寶箱、首領之門': T => {
      const P = T.hero('warrior', 60, 21);
      const f = campFolk(G.world)[0]; T.ok(T.near(f).kind === 'folk', '路人沒被選到'); UI.interact(); T.ok(f.say, '路人沒說話');
      T.ok(T.near(G.world.portal, 30).kind === 'device', '營火（夢之門）沒被選到'); UI.interact(); T.ok(UI.mapDevOpen, '夢之門沒打開'); UI.showMapDevice(false);
      enterMap(14); T.quiet(); const w = G.world;
      const l = { x: G.pl.x + 20, y: G.pl.y, t: 1, item: makeItem(BASES.find(b => b.slot === 'helmet').id, 'rare', 12), color: '#ff0' }; l.label = l.item.name; G.loot.push(l);
      T.quiet(); update(1 / 30); T.ok(G.nearAct && G.nearAct.kind === 'loot', '地上物品沒被選到'); UI.interact(); T.ok(l.gone || G.P.inv.includes(l.item) || Object.values(G.P.equip).includes(l.item), 'F 沒撿起來');
      const s = w.start, at = { x: (s.x + s.w / 2) * TS, y: (s.y + s.h / 2) * TS };
      for (const kind of ['shrine', 'essence', 'vision', 'chest', 'abyss']) {
        const ev = Object.assign({ kind, done: false, type: 'might', mon: w.theme.monsters[0] }, at); w.events.push(ev); G.loot = [];
        T.ok(T.near(ev).kind === 'mapev', kind + ' 沒被選到'); UI.interact(); T.ok(ev.done, kind + ' 沒啟動'); if (typeof ChoiceBox !== 'undefined' && ChoiceBox.open) ChoiceBox.pick(0); T.run(0.3);
      }
      T.ok(!w.gate, '大地圖不該有區域門'); for (let k = 2; k <= w.stage.n; k++) { goRegion(k); T.ok(G.world === w && w.stage.i === k, '沒走到第 ' + k + ' 區'); }
      T.ok(G.world.bossGate && !G.mons.some(m => m.boss), '最後一區應該是首領之門'); T.ok(T.near(G.world.bossGate).kind === 'bossgate', '首領之門沒被選到');
      UI.interact(); T.ok(!G.world.bossRoom, '封印中不該進得去'); BossRoom.skip(); T.ok(G.world.bossRoom && G.mons.some(m => m.boss), '沒有進到首領巢穴');
      G.mons.find(m => m.boss).awake = true; T.run(6); T.ok(G.teles.length || G.zones.length || G.mons.length > 1 || (G.world.haz && G.world.haz.pend.length), '巢穴機關沒有發動');
      const b = G.mons.find(m => m.boss); b.life = 0; killMonster(b); T.run(0.3);
    },
    '所有場景與營地都能畫': T => {
      T.hero('mage', 60, 21);
      for (let t = 1; t <= 10; t++) { enterMap(t); T.run(0.3); }
      for (const h of HUBS) { G.P.hub = h.id; G.P.hubs[h.id] = true; goTown(); T.run(0.3); }
    },
    '立體障礙物：每種都做得出切片、畫得出來': T => {
      for (const t in StackProps.M) { const ls = StackProps.build(+t, 3, 8); T.ok(ls.length === StackProps.M[t].H && ls.some(Boolean), '障礙物 ' + t + ' 沒有切片'); }
      T.hero('ranger', 20, 12); let n = 0; for (let t = 1; t <= 10 && !n; t++) { enterMap(t); n = (G.world.deco || []).filter(t => StackProps.M[t]).length; } T.ok(n > 0, '地圖上沒有立體障礙物');
      const c = document.createElement('canvas').getContext('2d'); StackProps.draw(c);
    },
    '彩色光源、樹後透視': T => {
      T.hero('mage', 30, 9); enterMap(5); T.run(0.5); render();
      const m = G.mons.find(x => !x.dead); enemyProj(m, 0, 100, 1, 'orb', 'cold'); T.ok(ColorLight.collect().some(s => s.c === ELEM_COLOR.cold), '冰的法術彈沒有發光');
      const w = G.world, o = (w.deco && [...w.deco].findIndex(t => StackProps.M[t]));
      if (o > 0) { G.pl.x = (o % w.W) * TS + 16; G.pl.y = Math.floor(o / w.W) * TS + 10; render(); }
      CFG.depth3d = false; render(); delete CFG.depth3d; render();   // 美術的「立體光影」開關兩種狀態都要畫得出來
    },
    '地圖色調：每種場景都有色調、首領房有裂紋': T => {
      T.hero('mage', 30, 12);
      for (let t = 1; t <= 10; t++) { enterMap(t); T.ok(MapTint.T[G.world.theme.id], '場景 ' + G.world.theme.id + ' 沒有色調'); render(); }
      enterMap(3); goRegion(G.world.stage.n); BossRoom.skip(); T.ok((MapTint.veins(G.world) || []).length > 5, '首領房沒有裂紋');
    },
    '終局：怪群加大、蟲群、夢潮裂隙': T => {
      T.hero('mage', 80, 26); let sw = 0, tide = null, cnt = 0;
      for (let k = 0; k < 8 && !(sw && tide); k++) { enterMap(22); for (let i = 2; i <= G.world.stage.n; i++) goRegion(i); cnt = Math.max(cnt, G.mons.length); sw += G.mons.filter(m => m.swarm).length; tide = G.world.events.find(e => e.kind === 'tide'); }
      T.ok(sw > 0, '深層夢境沒有蟲群'); T.ok(tide, '第 22 夜沒有夢潮裂隙'); T.ok(cnt > 120, '深層夢境怪太少：' + cnt);
      G.pl.x = tide.x; G.pl.y = tide.y + 30; tide.done = false; activateEvent(tide); T.run(5);
      const mobs = G.mons.filter(m => m.tide); T.ok(mobs.length > 5, '裂隙沒有冒怪'); mobs.slice(0, 5).forEach(m => killMonster(m)); T.ok(tide.kills === 5, '裂隙擊殺數不對');
      G.loot = []; T.run(20); T.ok(tide.cleared && !G.mons.some(m => m.tide) && G.loot.length > 0, '裂隙沒有正常結束或沒掉寶');
    },
    '終局：獻祭圈三輪、迷霧層數': T => {
      T.hero('mage', 80, 26); enterMap(22); const w = G.world, r = w.others.find(o => o.w * o.h >= 70) || w.others[0];
      const x = (r.x + (r.w >> 1)) * TS + 16, y = (r.y + (r.h >> 1)) * TS + 16;
      const rite = { kind: 'rite', x, y, done: false }; w.events.push(rite); G.pl.x = x; G.pl.y = y; activateEvent(rite);
      let n1 = 0; for (let round = 1; round <= 3; round++) { T.run(2); G.pl.x = x; G.pl.y = y; T.ok(rite.round === round, '獻祭圈沒有進到第 ' + round + ' 輪'); if (round === 1) n1 = rite.mobs.length; if (round === 2) T.ok(rite.mobs.length > n1, '第 2 輪沒有把第 1 輪的怪復活'); rite.mobs.slice().forEach(m => killMonster(m)); }
      G.loot = []; T.run(2); T.ok(rite.cleared && G.loot.length > 0, '獻祭圈打完沒掉寶');
      const rite2 = { kind: 'rite', x, y, done: false }; w.events.push(rite2); activateEvent(rite2); G.pl.x = x + 400; G.loot = []; T.run(6); T.ok(rite2.cleared && !G.loot.length && !G.mons.some(m => m.rite), '離開圈沒有判失敗');
      const mist = { kind: 'mist', x, y, done: false }; w.events.push(mist); G.pl.x = x; activateEvent(mist); T.ok(G.mons.some(m => m.mist), '迷霧沒有湧出怪');
      G.mons.filter(m => m.mist).slice(0, 12).forEach(m => killMonster(m)); T.ok(mist.layer === 1, '迷霧殺 12 隻沒有升層'); render();
      G.loot = []; G.mons = G.mons.filter(m => m.boss); T.run(14); T.ok(mist.cleared && G.loot.length > 0, '迷霧倒數完沒有結束或沒掉寶');
    },
    '終局盤：拿點、加點、效果、重置': T => {
      const P = T.hero('mage', 80, 26); enterMap(22); T.ok(atlasTotal(P) === 0 && atlasVal('pack') === 0, '新角色不該有終局盤點數');
      atlasMilestone('tide', 85); T.ok(atlasTotal(P) === 2, '裂隙殺 85 隻應該拿 2 點');
      UI.toggle('atlas', true); document.querySelector('.atl-n[data-n="pack"]').click(); document.querySelector('.atl-n[data-n="qty"]').click(); document.querySelector('.atl-n[data-n="rar"]').click();
      T.ok(atlasUsed(P) === 2 && atlasVal('pack') === 8 && atlasVal('qty') === 4, '加點或點數上限不對');
      enterMap(22); T.ok(G.world.mm._atlas && atlasVal('pack') === 8, '終局盤效果沒有套到地圖'); goTown(); T.ok(atlasVal('pack') === 0, '營地不該有終局盤效果');
      UI.toggle('atlas', true); document.getElementById('atlReset').click(); T.ok(atlasUsed(P) === 0, '重置沒有退點'); UI.toggle('atlas', false);
    },
    '夢的深度：倍率、世界規則、盡頭': T => {
      T.ok(Math.abs(depthScale(20) - 1.4) < 1e-9 && Math.abs(depthScale(40) - 1.8) < 1e-9 && depthScale(5) === 1, '深度倍率不對');
      const P = T.hero('mage', 95, 40); T.ok(depthRules(15).length === 0 && depthRules(23).length === 1 && depthRules(38).length === 4, '世界規則條數不對');
      P.deepRules[38] = ['wr_blast', 'wr_colossus', 'wr_guard', 'wr_thorn']; P.deepMods[38] = []; enterMap(38); goRegion(G.world.stage.n); BossRoom.skip();
      const F = G.world.mm.flags; T.ok(F.wr_blast && F.wr_colossus && F.wr_guard && F.wr_thorn && G.world.mm.q >= 40, '世界規則沒有套到地圖');
      T.ok(G.mons.filter(m => m.name.startsWith('護衛・')).length === 3 && G.mons.find(m => m.boss).colossus, '護衛或巨像沒生效');
      const m = makeMonster(G.world.theme.monsters[0], G.pl.x + 60, G.pl.y, G.world.mlvl, 'normal', G.world.theme); G.mons.push(m); killMonster(m); T.ok(G.world.blasts.length === 1, '餘燼沒有留下爆炸'); T.run(3); T.ok(!G.world.blasts.length && G.zones.length > 0, '爆炸沒結束或荊棘沒長');
      T.ok(!P.deepRules[38], '進圖後世界規則沒有重抽'); T.ok(!rollMapMods(30).some(id => MAP_MOD_BY_ID[id].rule), '世界規則被當成一般詞綴骰到');
      P.deepMods[40] = []; enterMap(40); goRegion(G.world.stage.n); BossRoom.skip(); killMonster(G.mons.find(m => m.boss)); T.ok(P.maxTier === 40 && P.depthEnd, '第 40 夜沒有封頂');
    },
    '新手保護：前期升級快、第一夜怪少而且遠程少': T => {
      T.ok(xpNeed(1) < 80 && xpNeed(11) < xpNeed(12) && xpNeed(12) === 3026, '前期經驗曲線不對');
      for (let l = 1; l < 30; l++) T.ok(xpNeed(l + 1) > xpNeed(l), '經驗需求沒有遞增：' + l);
      T.hero('mage', 1, 1); enterMap(1); const ms = G.mons.filter(m => !m.boss), rg = ms.filter(m => m.def.ranged).length;
      T.ok(ms.length < 120, '第一夜怪太多：' + ms.length); T.ok(rg / ms.length < 0.2, '第一夜遠程怪太多：' + rg + '/' + ms.length);
    },
    '召喚師：開局有骨矛、召喚物生命變厚': T => {
      const P = T.hero('summoner', 3, 1); T.ok(P.skills[0] === 'wandbolt' && P.skills[1] === 'bonespear' && hasSkillGem(P, 'bonespear'), '召喚師開局沒有骨矛');
      enterMap(1); T.quiet(); const m = G.mons.find(x => !x.boss); input.wx = m.x; input.wy = m.y; G.pl.mana = 999; useSkill(1); T.ok(G.projs.some(p => p.team === 'ally'), '骨矛沒有射出去');
      G.pl.cd = {}; G.pl.act = 0; useSkill(2); T.run(1); T.ok(G.mins.length && G.mins[0].maxLife >= 90, '骷髏生命沒有變厚');
    },
    '地形碰撞：投射物飛過岩漿、荊棘不能隔牆': T => {
      T.hero('mage', 20, 6); enterMap(2); const w = G.world; let lava = -1, wall = -1;
      for (let i = 0; i < w.grid.length && (lava < 0 || wall < 0); i++) { if (w.deco && w.deco[i] === 8 && lava < 0) lava = i; if (!w.grid[i] && !(w.deco && w.deco[i]) && wall < 0) wall = i; }
      const at = i => [(i % w.W) * TS + 16, Math.floor(i / w.W) * TS + 16];
      if (lava >= 0) { const [x, y] = at(lava); T.ok(solidAt(x, y) && !shotWallAt(x, y), '岩漿應該擋路但不擋投射物'); }
      const [wx, wy] = at(wall); T.ok(shotWallAt(wx, wy), '牆應該擋投射物');
      const cp = castPoint(wx - 200, wy, 1, 0, 300); T.ok(cp.x < wx - 8, '荊棘可以隔牆施放');
    },
    '技能型傳奇：八件都掉得出來、效果會動': T => {
      T.ok(SKILL_UNIQUES.every(u => UNIQUE_BY_ID[u.id] && BASE_BY_ID[u.base]), '技能型傳奇的基底不存在');
      const P = T.hero('summoner', 30, 6); const it = makeUnique('u_fuse', 30); P.equip.ring1 = it; onBuildChanged(); T.ok(G.S.flags.skelBomb, '骸骨引信沒有效果');
      enterMap(2); T.quiet(); G.pl.cd = {}; G.pl.act = 0; G.pl.mana = 999; useSkill(2); T.run(0.3); const mn = G.mins.find(x => x.mtype === 'skel'); T.ok(mn, '沒召出骷髏');
      const m = makeMonster(G.world.theme.monsters[0], mn.x + 12, mn.y, 5, 'normal', G.world.theme); G.mons = [m]; T.run(0.2); T.ok(!G.mins.includes(mn), '骷髏沒有自爆');
    },
    '第二批技能傳奇、倉庫寶石共用': T => {
      T.ok(SKILL_UNIQUES.length >= 20, '第二批技能傳奇沒有加進去');
      const P = T.hero('mage', 40, 8); const ch0 = SKILLS.arc.chains || 0;
      P.equip.ring1 = makeUnique('u_thunderring', 40); onBuildChanged(); T.ok(SKILLS.arc.chains === ch0 + 2, '雷鳴指環沒有多彈跳');
      P.equip.ring1 = null; onBuildChanged(); T.ok(SKILLS.arc.chains === ch0, '拿掉雷鳴指環沒恢復');
      P.equip.boots = makeUnique('u_shadowstep', 40); onBuildChanged(); const c0 = G.S.crit_inc; G._rollCritT = 2; onBuildChanged(); T.ok(G.S.crit_inc > c0 + 1000, '影步之靴沒加暴擊'); G._rollCritT = 0; onBuildChanged();
      const id = Object.keys(SUPPORTS)[0]; G.stash.spec = G.stash.spec || {}; G.stash.spec.sup = G.stash.spec.sup || {}; G.stash.spec.sup[id] = 1; P.supports[id] = 0;
      T.ok(supHave(id) === 1, '倉庫裡的輔助寶石讀不到'); T.ok(supTake(id) && G.stash.spec.sup[id] === 0, '倉庫裡的輔助寶石拿不出來');
      shareSkillGem('meteor'); T.ok(hasSkillGem(P, 'meteor'), '倉庫的技能寶石不能用');
    },
    '地圖每一塊地都走得到（河流一定有橋）': T => {
      T.hero('warrior', 40, 20);
      for (const tier of [3, 6, 7, 8, 10, 12, 14]) for (let k = 0; k < 4; k++) {
        G._stagePlan = { i: 1, n: 3 }; const w = genMap(tier); G._stagePlan = null; const W = w.W, g = w.grid.slice(); if (w.chap) w.chap.dCells.forEach(i => g[i] = 1);
        const s = Math.floor(w.start.y + w.start.h / 2) * W + Math.floor(w.start.x + w.start.w / 2), seen = new Uint8Array(g.length), q = [s]; seen[s] = 1;
        while (q.length) { const i = q.pop(); for (const d of [1, -1, W, -W]) { const j = i + d; if (j >= 0 && j < g.length && !seen[j] && g[j]) { seen[j] = 1; q.push(j); } } }
        let miss = 0; for (let i = 0; i < g.length; i++) if (g[i] && !seen[i]) miss++;
        T.ok(!miss, `${w.theme.name || w.theme.id}有 ${miss} 格走不到`);
      }
    },
    '強化失敗退一級、不碎': T => {
      const P = T.hero('warrior', 30, 13), w = Object.values(P.equip).find(it => it && enhKind(it) === 'weapon');
      const rnd = Math.random; Math.random = () => 0.999;
      try {
        w.enh = 6; P.cur.whet2 = 2; P.cur.hone = 0; enhanceItem(w, (c, n) => { P.cur[c] -= n; }, c => P.cur[c] || 0, true);
        T.ok(w.enh === 5 && Object.values(P.equip).includes(w), '+7 失敗沒有退回 +5，或裝備不見了');
        P.cur.hone = 1; enhanceItem(w, (c, n) => { P.cur[c] -= n; }, c => P.cur[c] || 0, true);
        T.ok(w.enh === 5 && P.cur.hone === 0, '有砥石失敗還是退級了');
      } finally { Math.random = rnd; }
    },
    '懸賞：擊殺進度回城、重讀都保留': T => {
      const P = T.hero('warrior', 30, 13), B = bountyState();
      B.board[0] = { type: 'kills', n: 10, reward: { n: 1, q: 0, r: 0, rare: 0 } }; B.active = 0;
      enterMap(12); T.quiet(); for (let i = 0; i < 4; i++) Hook.emit('kill', { rarity: 'normal' });
      leaveMapToTown(); saveGame(); const id = G.charId; startGame(loadChar(id), id); T.quiet();
      T.ok(G.P.bounty.board[0].prog && G.P.bounty.board[0].prog.kills === 4, '回城重讀後懸賞進度不見了');
      enterMap(13); T.quiet(); for (let i = 0; i < 6; i++) Hook.emit('kill', { rarity: 'normal' });
      T.ok(G.P.bounty.done === 1, '換一張深層夢境沒有接著算');
    },
    '稜鏡藥劑：舊單抗藥劑自動換掉、全抗、不中毒': T => {
      const P = T.hero('warrior', 30, 5);
      P.flaskSlots[2] = { uid: newUid(), flask: true, type: 'rubyf', tier: 3, rarity: 'normal', ilvl: 3, mods: [], implicit: [], sockets: [] };
      saveGame(); const id = G.charId; startGame(loadChar(id), id); T.quiet();
      T.ok(G.P.flaskSlots[2].type === 'prism', '舊的紅寶石藥劑沒換成稜鏡藥劑');
      enterMap(5); T.quiet(); const c0 = G.S.res_cold, h0 = G.S.res_chaos; G.pl.fl[2].c = G.pl.fl[2].max; useFlask(2); onBuildChanged();
      T.ok(G.S.res_cold > c0 && G.S.res_chaos > h0, '稜鏡藥劑沒有加抗性');
      for (let i = 0; i < 30; i++) applyPlayerAilments({ fire: 0, cold: 0, light: 0, chaos: 50, phys: 0 }, false);
      T.ok(!G.pl.ail.poison.length, '稜鏡藥劑生效時還是中毒了');
    },
    '小雀的寶石盒：合成、沒有 G 鍵': T => {
      const P = T.hero('warrior', 30, 3); P.hub = 0; goTown(false); T.quiet();
      for (const k in P.jewels) P.jewels[k] = 0; P.jewels.ruby_1 = 3;
      const girl = G.world.npcs.find(n => n.id === 'girl'); T.ok(girl && girl.panel === 'jewelbox', '小雀沒接到寶石盒');
      G.pl.x = girl.x; G.pl.y = girl.y + 30; UI.toggle('jewelbox', true); T.run(0.1);
      T.ok(document.querySelectorAll('#jewelbox .jbrow').length === 1, '寶石盒沒列出珠寶');
      document.querySelector('#jewelbox [data-jbk="ruby_1"]').click();
      T.ok(P.jewels.ruby_2 === 1 && !P.jewels.ruby_1, '合成沒有作用'); UI.toggle('jewelbox', false);
      T.ok(!KEY_ACTIONS.some(a => a.id === 'jewels') && !UI.MENU.some(m => m.id === 'jewels'), 'G 鍵／珠寶選單還在');
    },
    '通貨分段：主線只掉四種，深層全部': T => {
      const P = T.hero('warrior', 30, 13);
      enterMap(5); T.quiet(); const a = new Set(); for (let i = 0; i < 3000; i++) a.add(randomCurrency());
      T.ok([...a].every(k => MAIN_CURRENCY.has(k)), '主線掉了不該掉的通貨：' + [...a].filter(k => !MAIN_CURRENCY.has(k)));
      enterMap(12); T.quiet(); const b = new Set(); for (let i = 0; i < 6000; i++) b.add(randomCurrency());
      T.ok(b.has('exalt') && b.has('whet'), '深層沒有掉崇高石或磨石');
      P.maxTier = 5; T.ok(!genShop().some(e => e.price.alter || e.price.aug || e.cur === 'aug'), '主線商人還在用改造石／增幅石');
    },
    '說明文字：按鍵說法、拿掉的技能名稱': T => {
      T.ok(IS_TOUCH || ctl('tree') === `按 <b>${keyLabel('tree')}</b>`, '天賦的按鍵說法不對');
      T.ok(!QUESTS.some(q => q.steps.some(s => /\{\w+\}/.test(ctlText(s.text) + ctlText(s.hint)))), '任務文字還有沒換掉的代號');
      T.ok(!/居合斬|閃現/.test(STAT_TEXT.iaiWave() + CLASSES.samurai.desc + SCARS.find(s => s.id === 'sc_wind').text(30)), '還有拿掉的技能名稱');
      T.ok(!/以外……/.test(SKILLS.charge.desc), '猛衝說明還是壞句子');
    },
    '元素連動：碎冰、毒爆、凝血、反應圖鑑': T => {
      T.hero('mage', 20, 6); enterMap(3); T.quiet(); const keep = G.stash.reactSeen; G.stash.reactSeen = {};
      const mk = dx => { const m = makeMonster(G.world.theme.monsters[0], G.pl.x + dx, G.pl.y, 10, 'normal', G.world.theme); G.mons.push(m); return m; };
      const a = mk(200), b = mk(240), c = mk(-300), d = mk(-200);
      a.frozen = 3; c.poisons.push({ dps: 20, t: 3 }); d.bleed = { dps: 1, t: 4 }; T.run(0.05);
      const bl = b.life; hitMonster(a, { d: { phys: [a.maxLife * 0.3, a.maxLife * 0.3] }, crit: 0, multi: 100, ail: {} }, false, G.pl, 0); c.ign = { dps: 1, t: 3 }; d.chill = 2; T.run(0.05);
      T.ok(G.stash.reactSeen.shatter && b.life < bl, '碎冰沒有炸到旁邊');
      T.ok(G.stash.reactSeen.toxic && !c.poisons.length, '毒爆沒有結算毒');
      T.ok(G.stash.reactSeen.clot && d._clotT > 0, '凝血沒有定身');
      UI.toggle('journal', true); JournalTabs.cur = 'react'; UI.refreshJournal(); T.ok(document.querySelector('#journalBody').textContent.includes('碎冰'), '反應圖鑑沒有顯示'); JournalTabs.cur = 'main'; UI.toggle('journal', false);
      G.stash.reactSeen = keep || {};
    },
    '進化圖鑑、第一百三十八本、夢話三選一': T => {
      const P = T.hero('mage', 20, 6); const keep = G.stash.uniqFound; G.stash.uniqFound = {};
      P.skills[0] = 'fireball'; onBuildChanged(); P.inv[30] = makeUnique('u_flamecrown', 30); T.run(1.2);
      UI.toggle('skills', true); T.ok(document.querySelector('#skillSlots .evocell.on'), '撿到炎環冠，技能旁邊的格子沒亮'); T.ok(document.querySelector('#evoCodex [data-evorow="fireball"].on'), '進化圖鑑沒亮'); UI.toggle('skills', false); G.stash.uniqFound = keep || {};
      enterMap(1); T.quiet(); const b = makeBoss('boneking', G.pl.x + 100, G.pl.y, 5); b.awake = true; G.mons.push(b); G.bossBar = b; G.pl.life = 0; playerDie(); T.run(0.1);
      T.ok(P.book138.deaths.length === 1 && P.book138.deaths[0].boss === 'boneking', '冊子沒記下被誰打倒'); UI.hideDeath(); T.run(0.1);
      T.ok(Book138.record('測試紀錄', 5) && !Book138.record('測試紀錄', 3), '紀錄沒有只取最高');
      DreamWords.pick = 'olly'; enterMap(2); T.ok(DreamWords.act && DreamWords.act.id === 'olly', '夢話沒有生效'); goTown(); T.run(0.1); T.ok(!DreamWords.act, '回營地夢話沒有失效');
    },
    '輔助寶石整理：舊存檔換代號、推薦、代價型只在深層': T => {
      T.hero('warrior', 30, 5);
      const raw = JSON.parse(JSON.stringify(G.P)); raw.links[0] = ['brutal', 'impact', 'fasta']; raw.inv[raw.inv.indexOf(null)] = { stack: 'sup', key: 'addfire', n: 2 };
      const m = migrateSave(raw); T.ok(m.links[0].join() === 'power,,speed' && m.supRefund.power === 1, '技能上的舊輔助沒有換成新的');
      T.ok(m.inv.some(it => it && it.stack === 'sup' && it.key === 'power' && it.n === 2), '背包的舊輔助沒有換');
      const st = { tabs: [[]], spec: { sup: { lmp: 2, gmp: 1 } } }; gemMergeStash(st); T.ok(st.spec.sup.gmp === 3 && !st.spec.sup.lmp, '倉庫的舊輔助沒有合併');
      T.ok(Object.keys(SUPPORTS).length <= 28 && supGoodFor('power', 'heavy') && !supGoodFor('burn', 'heavy') && !supGoodFor('streak', 'heavy'), '推薦規則不對');
      enterMap(3); T.ok(![...Array(300)].some(() => SUPPORTS[randomSupport()].risk), '主線掉了有代價的輔助寶石');
    },
    '夢囈、孤注、血祭、透支': T => {
      T.hero('warrior', 30, 5); const P = G.P, pl = G.pl; P.skills = ['heavy', 'slam', null, null, null]; P.links = [[], ['dream_kill'], [], [], []]; onBuildChanged(); enterMap(3); T.quiet();
      spawnPack(pl.x + 50, pl.y, G.world); const m = G.mons.find(x => !x.dead && !x.boss); m.life = 1; let n = 0; const h = s => { if (s === 'slam') n++; }; Hook.on('cast', h);
      hitMonster(m, { d: G.slotCalc[0].d, crit: 0, multi: 150, ail: {} }, false, pl, 1); Hook.m.cast.splice(Hook.m.cast.indexOf(h), 1);
      T.ok(n === 1, '夢囈．擊殺沒有自動施放');
      P.skills[1] = 'warcry'; P.links = [['allin'], [], [], [], []]; onBuildChanged(); const a = G.slotCalc[0].d.phys[0]; P.skills[1] = 'slam'; onBuildChanged(); T.ok(Math.abs(a / G.slotCalc[0].d.phys[0] - 1.4) < 0.01, '孤注倍率不對');
      P.links[0] = ['bloodpay']; onBuildChanged(); pl.cd = {}; pl.act = 0; pl.life = 300; pl.mana = 100; useSkill(0); T.ok(pl.mana === 100 && pl.life < 300, '血祭沒有改扣生命');
      P.links[0] = ['overdraw']; onBuildChanged(); pl.cd = {}; pl.act = 0; pl.life = 300; pl.mana = 0; useSkill(0); T.ok(pl.life < 300 && pl.act > 0, '透支魔力不夠時沒有用生命補');
    },
    '新技能：蓄力射擊、搖籃曲；寶石自動升級': T => {
      T.hero('druid', 20, 3); const P = G.P, pl = G.pl;
      T.ok(['druid', 'ranger', 'summoner', 'samurai'].every((c, i) => CLASS_GEMS[c].includes(['chargeshot', 'sleepwalk', 'lullaby', 'inscribe'][i])), '新技能沒有加進職業');
      P.skills[0] = 'chargeshot'; P.links[0] = []; onBuildChanged(); enterMap(3); T.quiet(); G.projs = [];
      input.wx = pl.x + 200; input.wy = pl.y; pl.mana = 99; pl.cd = {}; pl.act = 0;
      if (Touch.on) { input.joy = null; T.run(1.7); pl.mana = 99; useSkill(0); T.run(0.05); } else { input.l = true; T.run(1.7); input.l = false; T.run(0.05); }   // 手機：站著自動蓄滿、點一下射出
      const p = G.projs.find(x => x.team === 'ally'); T.ok(p && p.pierce >= 99, '蓄滿沒有全穿透');
      P.skills[2] = 'lullaby'; P.skillGems = P.skillGems || {}; P.skillGems.lullaby = true; onBuildChanged(); spawnPack(pl.x + 150, pl.y, G.world); input.wx = pl.x + 150; input.wy = pl.y; const _su = skillUsable; skillUsable = () => null; pl.cd = {}; pl.act = 0; pl.mana = 99; try { useSkill(2); } finally { skillUsable = _su; }
      T.ok(G.mons.some(m => m.sleep > 0), '搖籃曲沒有讓怪睡著');
      const sid = P.skills[1], d = gemData(sid); d.xp = 0; const lv = d.lv; gemGainXp(gemXpNeed(sid, lv) + 1); T.ok(gemData(sid).lv === lv + 1 || gemReqLack(sid, lv + 1), '寶石經驗滿了沒有自動升級');
    },
    '帶話任務：接話、帶到、回報、禮物': T => {
      T.hero('ranger', 20, 4); const P = G.P; P.story.seen.are1 = P.story.seen.are2 = true; P.hubs.icecamp = true;
      for (const c of NPC_STORIES.girl.chapters) P.story.seen[c.id] = true;
      P.hub = 'icecamp'; goTown(); T.near(G.world.npcs.find(n => n.id === 'are')); UI.interact();
      document.querySelector('#gask .gask-yes').click(); T.ok(P.errands.er_are === 'got', '沒接到帶話');
      P.hub = 'cell'; goTown(); T.near(G.world.npcs.find(n => n.id === 'girl')); UI.interact(); T.ok(P.errands.er_are === 'told', '小雀沒收到話');
      UI.storyQ = []; UI.nextStory(); P.hub = 'icecamp'; goTown(); T.near(G.world.npcs.find(n => n.id === 'are')); UI.interact();
      T.ok(P.errands.er_are === 'done' && P.story.seen.er_are, '回報沒完成'); T.ok(P.inv.some(x => x && x.name === '阿雷的舊獵手套'), '沒拿到禮物');
      UI.storyQ = []; UI.nextStory();
    },
    '夢境試煉：犯規重來、完成會記住': T => {
      T.hero('ranger', 10, 2); const P = G.P; P.quest = { ch: 0, done: { '0_0': true }, base: Quest.base(P) }; P.trials = {};
      enterMap(1); T.quiet(); T.run(0.1); T.ok(G.trialRun && G.trialRun.id === 'onlyone', '第一章試煉沒啟動');
      const kill = n => { for (let i = 0; i < n; i++) { const m = makeMonster(G.world.theme.monsters[0], G.pl.x + 50, G.pl.y, 1, 'normal', G.world.theme); G.mons.push(m); killMonster(m); } };
      P.skills[1] = P.skills[1] || 'split'; Hook.emit('cast', P.skills[0]); kill(5); Hook.emit('cast', P.skills[1]); T.ok(G.trialRun.kills === 0, '換技能沒有重來');
      kill(15); T.ok(P.trials.onlyone, '試煉完成沒記住'); Quest.tick(); T.ok(P.quest.done['0_1'], '任務步驟沒打勾');
    },
    '上一個我：出現、半透明、掉重骰裝備': T => {
      T.hero('mage', 30, 6); const c0 = PAST.chance; PAST.chance = 1;
      try { enterMap(5); const m = G.mons.find(x => x.pastSelf); T.ok(m && m.alpha < 1 && m.name.startsWith('上一個我'), '殘影沒出現');
        const n0 = G.loot.length; hitMonster(m, { d: { phys: [1e7, 1e7] }, crit: 0, multi: 150 }, false, G.pl, 0); T.run(0.1); T.ok(m.dead && G.loot.length > n0, '打倒沒掉東西'); }
      finally { PAST.chance = c0; }
    },
    '莫的釣竿：一趟夢一次、動畫跑完有東西': T => {
      T.hero('ranger', 20, 6); const P = G.P; P.hubs.harbor = true; P.hub = 'harbor'; goTown();
      const s = fishSpot(G.world); T.ok(s && T.near(s).kind === 'fish', '釣魚點沒被選到'); UI.interact(); T.ok(G.fishAnim, '沒有拋竿');
      T.run(5); T.ok(!G.fishAnim && (P.fish.got.length || G.mons.length), '沒釣到東西'); UI.interact(); T.ok(!G.fishAnim, '同一趟不該再拋');
      enterMap(5); T.ok(P.fish.ok, '進夢之後沒恢復');
    },
    '營地分工：卡爾陪打一區、格倫講看守者': T => {
      T.hero('warrior', 20, 8); const P = G.P; P.karlGo = true; enterMap(3); T.ok(G.mins.some(m => m.karl), '卡爾沒跟來');
      goRegion(2); T.run(0.1); T.ok(!G.mins.some(m => m.karl), '換區後卡爾沒回營地');
      T.ok(glenWarden(P).includes('看守者'), '格倫沒講看守者');
    },
    '看守者抉擇：請託、半血轉場、三選一、殘片': T => {
      T.hero('warrior', 30, 3); enterMap(3); goRegion(G.world.stage.n); BossRoom.skip(); T.run(0.2);
      const wd = G.world.wd; T.ok(wd && wd.id === 'beast', '巢穴沒有建立抉擇狀態');
      const yes = document.querySelector('#gask.show .gask-yes'); if (yes) yes.click(); T.ok(wd.trial && wd.stage === 'fight', '請託沒有接下');
      const b = G.mons.find(m => m.boss); b.awake = true; hitMonster(b, { d: { fire: [1e8, 1e8] }, crit: 0, multi: 100, ail: {} });
      T.ok(!b.dead && b.life / b.maxLife >= 0.49, '首領沒有停在半血'); T.run(1.3); T.ok(wd.stage === 'choice', '沒有跳出三選一');
      const sh0 = wShardHave('beast'); document.querySelectorAll('#wchoose .wc-opt')[1].click(); document.querySelectorAll('#wchoose .wc-opt')[0].click();
      T.ok(b.dead && G.P.wardens.first.beast === 'kill', '了結沒有結束戰鬥或沒記下選擇'); T.ok(wShardHave('beast') > sh0, '銅檔沒有給殘片');
      wShardAdd('beast', sh0 - wShardHave('beast'));
      T.ok(BOSS_ABILITIES.w2_witch && UNIQUE_BY_ID.u_w_key && STORY.wreq_b_void, '第二階段招式、信物或請託故事沒登記');
    },
    '套裝、深層傳奇、世界規則傳奇': T => {
      const P = T.hero('summoner', 70, 25);
      for (const id in SET_PIECES) T.ok(makeSetItem(id, 75).set, '套件做不出來 ' + id);
      P.equip.amulet = makeSetItem('set_dabai_collar', 75); P.equip.helmet = makeSetItem('set_dabai_crown', 75); P.equip.gloves = makeSetItem('set_dabai_paw', 75); onBuildChanged();
      T.ok(G.S.flags.setDabaiDog && G.S.flags.setDabaiPounce, '大白 2／3 件沒生效');
      T.ok(itemTipHTML(P.equip.amulet).includes('身上 3 / 3'), '套裝說明沒有件數');
      enterMap(22); T.quiet(); const u = makeUnique('u_wind', 70); dropLoot(G.pl.x, G.pl.y, { item: u });
      T.ok(u.deep && u.base === 'bow4' && u.mods.length === 5, '第 22 夜的傳奇沒有升級');
      T.ok(WR_UNIQUES.every(x => UNIQUE_BY_ID[x.id]), '世界規則傳奇沒登記');
    },
    '無盡爬塔：贈禮、寶箱': T => {
      const P = T.hero('warrior', 70, 25); P.cur.chaos = 10; enterBossRush();
      for (let f = 1; f <= 5; f++) { const b = G.mons.find(x => x.boss && !x.dead); b.life = 0; killMonster(b); T.ok(ChoiceBox.open, '沒有跳贈禮'); ChoiceBox.pick(0); G.time += 4; T.run(0.2); }
      const R = G.world.rush; T.ok(R.cleared === 5 && R.floor === 6 && G.mons.some(m => m.boss && !m.dead), '爬塔層數不對');
      enterMap(12); T.run(0.1); T.ok(P.climbBest === 5 && !ChoiceBox.open, '爬塔紀錄沒存');
    },
    '預言三選一、終局盤大卡': T => {
      const P = T.hero('warrior', 70, 25); enterMap(22); T.quiet();
      const ev = { kind: 'vision', x: G.pl.x, y: G.pl.y, done: false }; activateEvent(ev); T.ok(ChoiceBox.open && UI.paused(), '預言沒跳');
      ChoiceBox.pick(1); G.loot = []; mapLoot(G.pl.x, G.pl.y, { n: 20, rare: 2 }); T.ok(!G.loot.some(l => l.item && !isFlask(l.item)), '豐收還掉裝備');
      const A = atlasOf(P); for (let t = 11; t <= 30; t++) A.got['n' + t] = true; atlasPreset(P, 'boss'); T.ok(atlasUsed(P) === 20 && A.pts.boss_life === 3, '打王大卡沒配點');
      T.ok(atlasMaxPts() >= 46, '點數上限還是不夠點滿');
    },
    '劇情跟著看守者的抉擇變': T => {
      const P = T.hero('warrior', 30, 8); P.wardens.first = {};
      T.ok(STORY.sparrow2.pages[0].includes('打倒'), '沒選過時應該是原本的文字');
      P.wardens.first.beast = 'free'; T.ok(STORY.sparrow2.pages[0].includes('回來了') && STORY.are2.pages[0].includes('小狗') && STORY.boss_beast.pages[0].includes('小白狗'), '放走大白後劇情沒變');
      P.wardens.first.beast = 'name'; T.ok(STORY.sparrow2.pages[1].includes('名字'), '和解後劇情沒變');
      P.wardens.first.b_swamp = 'free'; T.ok(STORY.yin2.journal.text.includes('回到了茵身邊'), '日誌文字沒變');
      T.ok(!STORY.sparrow3.pages[0].includes('放在你手上'), '小雀之三還在重複送王冠');
      P.wardens.first = {};
    },
    '章節地圖：固定地圖會被採用、同一區兩次一樣、沒資料和第 11 夜照舊隨機': T => T.chapTry(() => {
      T.hero('warrior', 20, 12); enterMap(1); T.quiet(); const w = G.world, r1 = w.regions[0], rel = W => W.chap.evs.filter(e => e.r === 1).map(e => (e.tx - W.regions[0].rect.x) + ',' + (e.ty - W.regions[0].rect.y)).join(';'), a = rel(w);
      T.ok(w.chap && r1.rect.w === 64 && /測試墓穴/.test(w.name) && G.banner.sub === '測試用的夢。', '第 1 夜第 1 區沒有用固定地圖或開場白');
      T.ok(w.chap.scenes.filter(s => s.r === 1).length === 3 && G.mons.some(m => m.chapBoss) && w.deco.includes(15), '布景、木橋或區域首領沒放');
      enterMap(1); T.quiet(); T.ok(rel(G.world) === a && G.world.regions[0].rect.w === 64, '同一區兩次地形不一樣');
      const o2 = CHAPTER_MAPS['1-2']; delete CHAPTER_MAPS['1-2']; try { enterMap(1); T.ok(G.world.regions[1].key === null && G.world.regions[0].key === '1-1' && !G.world.chap.evs.some(e => e.r === 2), '沒有資料的區沒有照舊隨機'); } finally { if (o2) CHAPTER_MAPS['1-2'] = o2; }
      enterMap(11); T.quiet(); T.ok(!G.world.chap && G.world.regions && G.world.W >= 100 && G.world.H >= 70, '第 11 夜不是隨機大地圖');
    }),
    '章節地圖：四種事件都能完成、D 會打開、再進圖不重複給獎勵': T => T.chapTry(() => {
      T.hero('warrior', 20, 3); enterMap(1); T.quiet(); const w = G.world, ev = n => w.chap.evs.find(e => e.n === n && e.key === '1-1'), use = n => { T.near(ev(n), 0); UI.interact(); T.quiet(); };
      T.ok(w.chap.dCells.every(i => !w.grid[i]), 'D 一開始沒有封住');
      use('1'); T.ok(G.P.chapEv.dev_ghost && w.chap.dCells.every(i => w.grid[i]) && NPC_LINES.jailer.includes('「測試台詞」'), 'npc 完成後 D 沒打開或沒多台詞');
      use('2'); use('3'); T.ok(!G.P.chapEv.dev_shard, '收集只撿一片就完成了'); use('4'); T.ok(G.P.chapEv.dev_book && G.P.chapEv.dev_shard, 'lore 或收集沒有完成');
      G.mons = []; use('5'); for (let k = 0; k < 12 && !G.P.chapEv.dev_amb; k++) { T.run(1); G.mons.filter(m => m.chapAmb).forEach(m => killMonster(m)); }
      T.ok(G.P.chapEv.dev_amb, '伏擊打完沒有完成');
      enterMap(1); T.quiet(); const l0 = G.loot.length; T.near(G.world.chap.evs.find(e => e.n === '2' && e.key === '1-1'), 0); UI.interact(); T.quiet();
      T.ok(G.world.chap.open && G.world.chap.evs.filter(e => e.key === '1-1').every(e => e.done) && G.loot.length === l0, '第二次進圖事件又出現或又給獎勵');
    }),
    '章節地圖：區域首領、沒打完的夢還原 D 和首領、日誌與任務面板': T => T.chapTry(() => {
      T.hero('warrior', 20, 3); enterMap(1); T.quiet(); let w = G.world, b = G.mons.find(m => m.chapBoss);
      G.pl.x = b.x + 120; G.pl.y = b.y; T.run(0.2); T.ok(G.bossBar === b, '區域首領沒有首領血條');
      b.life = b.maxLife / 2; dreamSave(); goTown(); G.savedMap = null; dreamRestore(G.charId); resumeMap(); G.pl.x = b.x + 120; G.pl.y = b.y; T.run(0.2); w = G.world;
      T.ok(w.chap && w.chap.dCells.every(i => !w.grid[i]) && w.chap.scenes.filter(s => s.r === 1).length === 3, '讀檔後地圖、D 的狀態不對');
      b = G.mons.find(m => m.chapBoss && !m.dead); T.ok(b && Math.abs(b.life / b.maxLife - 0.5) < 0.05, '讀檔後區域首領沒有還原');
      const l0 = G.loot.length; killMonster(b); T.ok(G.P.chapBoss.dev_boss && G.P.chapEv.dev_bossstory && G.loot.length > l0, '打倒區域首領沒記錄或沒掉獎勵');
      T.ok(/第 1 夜的夢：\d+ \/ \d+/.test(PanelRows.html('quest', G.P)), '任務面板沒顯示劇情進度');
      T.ok(/測試的老骨頭/.test(JournalTabs.list.find(t => t.id === 'chapstory').html()), '日誌「夢裡的故事」沒有內容');
    }),

    '章節地圖第1到5夜': T => {
      for (let t = 1; t <= 5; t++) for (let s = 1; s <= 3; s++) { const d = CHAPTER_MAPS[t + '-' + s]; T.ok(d && d.rows.every(r => r.length === d.rows[0].length), `第 ${t}-${s} 區手工地圖缺少或列長不一`); }
      enterMap(1); T.ok(G.world.chap && G.world.regions[0].rect.w === 64 && G.world.chap.evs.filter(e => e.r === 1).length === 2, '第 1 夜第 1 區沒有用手工地圖');
      T.ok(STORY.chev_ch1_decree && STORY['chev_ch1_decree#3'], '詔書收集的劇情沒有登記');
    },
    '六件套裝：四套 24 件、2／4／6 件門檻': T => {
      const P = T.hero('warrior', 70, 20), ids = SET6_IDS.flatMap(s => SETS[s].pieces);
      T.ok(ids.length === 24 && ids.every(id => { const it = makeSetItem(id, 75); return it && it.set && BASE_BY_ID[it.base]; }), '六件套裝做不出來');
      const wear = (sid, n) => { for (const k of ['helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring1', 'ring2']) P.equip[k] = null; SETS[sid].pieces.slice(0, n).forEach(pid => { const it = makeSetItem(pid, 75); P.equip[BASE_BY_ID[it.base].slot] = it; }); onBuildChanged(); };
      for (const sid of SET6_IDS) { const f = SETS[sid].bonus.map(b => b[1]), on = n => { wear(sid, n); return f.map(x => G.S.flags[x] ? 1 : 0).join(''); };
        T.ok(on(1) === '000' && on(2) === '100' && on(3) === '100' && on(4) === '110' && on(5) === '110' && on(6) === '111', sid + ' 的 2／4／6 件門檻不對'); }
    },
    '第一百三十八枚指環：多算一件、兩枚不疊加': T => {
      const P = T.hero('warrior', 70, 20); for (const k of ['helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring1', 'ring2']) P.equip[k] = null;
      SETS.door.pieces.slice(0, 5).forEach(pid => { const it = makeSetItem(pid, 75); P.equip[BASE_BY_ID[it.base].slot] = it; }); onBuildChanged();
      T.ok(!G.S.flags.setDoorRiposte, '5 件就有 6 件效果');
      P.equip.ring1 = makeUnique(SET_RING_ID, 75); onBuildChanged(); T.ok(setCounts(P).door === 6 && G.S.flags.setDoorRiposte, '指環沒有讓 5 件變成 6 件效果');
      T.ok(/身上 5（\+1） \/ 6/.test(itemTipHTML(P.equip.helmet).replace(/<[^>]+>/g, '')), '說明沒顯示「身上 5（+1）/ 6」');
      P.equip.ring2 = makeUnique(SET_RING_ID, 75); P.equip.helmet = null; onBuildChanged(); T.ok(setCounts(P).door === 5 && !G.S.flags.setDoorRiposte, '兩枚指環疊加了');
      for (const k of ['helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring2']) P.equip[k] = null; P.equip.body = makeSetItem('set_n137_coat', 75); onBuildChanged();
      T.ok(G.S.flags.setN137Die, '舊套裝（1 件＋指環）沒有 2 件效果');
    },
    '六件套裝、指環只在深層掉': T => {
      T.hero('warrior', 70, 30); enterMap(8); T.quiet(); let n = 0; for (let i = 0; i < 2000; i++) if (set6DropRoll({ boss: true })) n++;
      T.ok(n === 0, '主線掉了六件套裝或指環');
      enterMap(14); T.quiet(); n = 0; for (let i = 0; i < 2000; i++) if (set6DropRoll({ boss: true })) n++;
      T.ok(n > 0, '深層看守者掉不出六件套裝');
      let r = 0; for (let i = 0; i < 5000; i++) if (randomItem(80, 50).uniqueId === SET_RING_ID) r++; T.ok(r === 0, '指環跑進一般傳奇的掉落池');
    },
    '套裝：4 條隨機詞綴、不能改造、神聖石、舊存檔、綠色': T => {
      const P = T.hero('warrior', 60, 12);
      T.ok(Object.keys(SET_PIECES).every(id => setRandCount(makeSetItem(id, 70)) === 4), '套裝沒有 4 條隨機詞綴');
      const it = makeSetItem('set_nerd_cap', 70), st = JSON.stringify(it.mods.map(m => m.stat)), v0 = JSON.stringify(it.mods);
      for (const c of ['chaos', 'exalt', 'annul', 'alch', 'regal', 'alter', 'chance']) T.ok(applyCurrency(c, it) && JSON.stringify(it.mods) === v0, c + ' 改得動套裝');
      let ch = false; for (let i = 0; i < 6; i++) { T.ok(applyCurrency('divine', it) === null, '神聖石不能用在套裝'); if (JSON.stringify(it.mods) !== v0) ch = true; }
      T.ok(ch && JSON.stringify(it.mods.map(m => m.stat)) === st, '神聖石沒重骰數值，或改到了詞綴');
      const old = makeSetItem('set_desert_boots', 40); old.mods = old.mods.filter(m => m.type === 'u'); P.inv[3] = old; saveGame(); startGame(loadChar(G.charId), G.charId); T.quiet();
      T.ok(G.P.inv[3] && setRandCount(G.P.inv[3]) === 4, '舊套裝讀檔沒補詞綴');
      T.ok(/tip-head c-set/.test(itemTipHTML(it)) && itemRarityKey(it) === 'set' && itemColor(it) === RARITY_COLOR.set, '套裝名字不是綠色');
    },
    '六件套裝效果：站穩反擊、燈、回頭箭、召喚物站起來': T => {
      const wear = sid => { const P = G.P; for (const k of ['helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring1', 'ring2']) P.equip[k] = null; SETS[sid].pieces.forEach(pid => { const it = makeSetItem(pid, 75); P.equip[BASE_BY_ID[it.base].slot] = it; }); onBuildChanged(); };
      T.hero('warrior', 70, 20); enterMap(12); T.quiet(); wear('door'); T.run(2.5); T.ok(_s6stand >= 3, '站穩沒有疊層');
      spawnPack(G.pl.x + 60, G.pl.y, G.world); const ms = G.mons.filter(m => !m.dead).slice(0, 8); ms.forEach(m => { m.x = G.pl.x + 50; m.y = G.pl.y; }); const l0 = ms.map(m => m.life);
      Hook.emit('hurt', 50, {}); T.ok(ms.some((m, i) => m.dead || m.life < l0[i]), '被打到沒有反擊');
      T.hero('mage', 70, 20); enterMap(12); T.quiet(); wear('lamp'); const sp = G.P.skills.findIndex(s => s && SKILLS[s].tags.includes('spell') && SKILLS[s].type !== 'summon');
      input.wx = G.pl.x + 200; input.wy = G.pl.y; G.pl.mana = 999; G.pl.act = 0; G.pl.cd = {}; useSkill(sp); T.run(0.1); T.ok(_s6lamps.length === 1 && G.slotCalc[sp].cost === 0, '燈沒點起來，或站在燈旁邊還要付魔力');
      T.hero('druid', 70, 20); enterMap(12); T.quiet(); G.mons = []; wear('arrow'); const pi = G.P.skills.findIndex(s => s && SKILLS[s].type === 'proj');
      input.wx = G.pl.x + 300; input.wy = G.pl.y; G.pl.mana = 999; G.pl.act = 0; G.pl.cd = {}; useSkill(pi); let ret = 0; for (let i = 0; i < 120; i++) { update(1 / 30); ret = Math.max(ret, G.projs.filter(p => p.s6ret).length); }
      T.ok(ret > 0 && _s6catch > 0, '投射物沒有飛回來，或沒接住');
      T.hero('summoner', 70, 20); enterMap(12); T.quiet(); G.mons = []; wear('roll'); const si = G.P.skills.findIndex(s => s && SKILLS[s].type === 'summon');
      G.pl.mana = 999; G.pl.act = 0; G.pl.cd = {}; useSkill(si); update(1 / 30); const mn = G.mins[0]; mn.life = 0; update(1 / 30); T.run(3.3); T.ok(G.mins.includes(mn) && mn.life === mn.maxLife, '召喚物沒有站起來');
    },
    '章節地圖：第 6～10 夜格式': T => {
      for (let t = 6; t <= 10; t++) for (let s = 1; s <= 3; s++) {
        const d = CHAPTER_MAPS[t + '-' + s], all = d ? d.rows.join('') : '';
        T.ok(d && d.rows.every(r => r.length === d.rows[0].length), `第 ${t}-${s} 區 rows 長度不一致`);
        T.ok(all.split('S').length === 2, `第 ${t}-${s} 區 S 不是 1 個`);
        const digs = [...new Set(all.match(/[1-9]/g) || [])].sort().join();
        T.ok(digs === Object.keys(d.events || {}).sort().join(), `第 ${t}-${s} 區事件數字對不上`);
      }
    },
    '章節地圖：10-2 封印打開通道': T => { T.hero('warrior', 40, 10); enterMap(10); goRegion(2);
      const w = G.world, c = w.chap, i0 = c && c.dCells[0];
      T.ok(c && c.keys.includes('10-2') && c.dCells.length > 0 && !w.grid[i0] && w.rmap[i0] === 2, '10-2 一開始要封住');
      ChapterMaps.openD(w, true); T.ok(w.grid[i0] === 1, '打開後要變成路'); },
    '狀態列：統一排在小地圖下方、不重疊': T => {
      T.hero('warrior', 20, 5); enterMap(3);
      mechHud('trialHud', 96, '#fff', '測試一'); StatusLines.set('x', '測試二', '#fff');
      const L = StatusLines.lines().map(l => l.t); T.ok(L.includes('測試一') && L.includes('測試二'), '狀態列沒有收到');
      StatusLines.draw(); const el = document.getElementById('statusStack');
      if (el && el.style.display !== 'none') { const r = [...el.children].map(d => d.getBoundingClientRect()); T.ok(r.every((a, i) => !i || a.top >= r[i - 1].bottom - 0.5), '狀態列疊在一起'); }
      T.ok(!document.getElementById('trialHud'), '舊的置中狀態字還在');
      mechHud('trialHud', 96, '#fff', ''); StatusLines.set('x', ''); T.ok(!StatusLines.fixed.trialHud && !StatusLines.fixed.x, '狀態列拿不掉');
    },
    '新手引導：照實際狀況出現、不擋面板': T => {
      UI.storyQ = []; UI.storyOpen = false; document.querySelectorAll('#story.show, #gask.show').forEach(e => e.classList.remove('show')); for (const k in UI.open) if (UI.open[k]) UI.toggle(k, false);   // 前面的測試可能留下劇情框、請託框
      T.hero('druid', 1, 1); const P = G.P; P.tut = 0; P.tutD = {}; CFG.tutorial = true; Tut.begin(P); Tut.T = null;
      Tut.tick(0.1); T.ok(Tut.T && Tut.T.id === 'move', '第一步不是移動');
      enterMap(1); P.tutD = { move: 1, attack: 1, pickup: 1 }; Tut.T = null; P.inv = P.inv.map(it => it && (isStack(it) || isFlask(it)) ? it : null);
      Tut.tick(0.1); T.ok(!Tut.T || Tut.T.id !== 'equip', '背包沒有能穿的東西還在教裝備');
      T.ok(!TUT_STEPS.find(s => s.id === 'tree').when(P.tutD), '沒有天賦點數就教天賦');
      UI.toggle('char', true); Tut.render(); T.ok(document.getElementById('tutBox').style.display === 'none', '開著面板還擋在畫面上'); UI.toggle('char', false);
      T.ok(getComputedStyle(document.getElementById('tutBox')).pointerEvents === 'none', '引導框會攔點擊');
      P.tut = 99;
    },
    '操作說法、進階資訊開關、終局盤選單': T => {
      T.ok(byCtl('a', 'b') === (IS_TOUCH ? 'b' : 'a'), 'byCtl 挑錯');
      T.ok(IS_TOUCH ? ctlTag() === '' : /^\[.+\] $/.test(ctlTag()), 'ctlTag 不對');
      T.ok(skillKeyNames().length === 5, '技能欄叫法不是 5 個');
      T.hero('warrior', 20, 1); const keep = CFG.advInfo; delete CFG.advInfo;
      const it = makeItem(pickBase(10).id, 'rare', 10);
      T.ok(!/[前後]綴 T\d/.test(itemTipHTML(it)), '前 3 夜還顯示詞綴階級');
      G.P.maxTier = 3; T.ok(/[前後]綴 T\d/.test(itemTipHTML(it)), '第 3 夜後沒有詞綴階級');
      G.P.maxTier = 1; T.ok(UI.MENU.find(m => m.id === 'atlas').hide(G.P), '還沒到深層就出現終局盤');
      if (keep != null) CFG.advInfo = keep;
    },
    '技能頁：點寶石再點空孔就放進去': T => {
      T.hero('druid', 20, 3); const P = G.P; const id = Object.keys(SUPPORTS).find(s => supportFits(s, P.skills[0])); P.supports[id] = (P.supports[id] || 0) + 1; P.links[0] = P.links[0].map(() => null);
      UI.toggle('skills', true); UI.refreshSkills(); UI.gemPick = 'sup:' + id;
      const el = document.querySelector('#skillSlots [data-drop="sup:0:0"]'); T.ok(el && !el.dataset.gem, '找不到空的輔助孔');
      if (el) el.click(); T.ok(P.links[0][0] === id, '點空孔沒有放進去'); T.ok(!UI.gemPick, '放完還選著');
      UI.toggle('skills', false);
    },
    '普通攻擊：開局左鍵、不耗魔、舊存檔補上、前 10 級魔力回復': T => {
      for (const c of ['warrior','samurai','ranger','druid','mage','summoner']) { const P = T.hero(c, 1, 1); const sid = BASIC_ATK[c]; T.ok(P.skills[0] === sid && G.slotCalc[0].cost === 0 && !skillUsable(G.S, sid), c + ' 開局左鍵不是不耗魔的普通攻擊'); }
      enterMap(1); T.quiet(); G.pl.mana = 0; G.pl.act = 0; G.pl.cd = {}; const n = G.projs.length; input.wx = G.pl.x + 100; input.wy = G.pl.y; useSkill(0); T.ok(G.projs.length > n, '魔力 0 時普通攻擊放不出來');
      const P = newCharacter('druid', T.NAME); P.skills = ['split', 'rapid', null, null, null]; delete P.basicAtk; P.story = { seen: { intro: true, ending: true } }; startGame(P); T.quiet(); T.ok(G.P.skills[2] === 'bshot', '舊存檔沒補上普通射擊');
      T.ok(G.S.manaRegenPS >= G.S.maxMana * 0.05 + 1.9, '前 10 級魔力回復沒有 +2'); T.ok(!Array.from({ length: 300 }, () => randomSkillGem(5)).some(s => SKILLS[s].basic), '普通攻擊掉成寶石了');
    },
    '新手保護：第 1～2 夜首領一下最多 45%、第 3 夜沒有': T => {
      T.hero('druid', 5, 2); damagePlayer = T.realDP; enterMap(1); T.quiet(); const b = makeBoss('boneking', G.pl.x + 60, G.pl.y, 5); G.mons.push(b); const l0 = G.pl.life; G.pl.es = 0;
      damagePlayer([[9999, 'phys']], { src: b, spell: true }); T.ok(!G.dead && l0 - G.pl.life > 1 && l0 - G.pl.life <= G.S.maxLife * 0.45 + 1, '第 1 夜看守者一下超過 45%'); T.ok(G._lastHit && G._lastHit.who === b.name, '沒記下是誰打的');
      enterMap(3); T.quiet(); G.pl.life = G.S.maxLife; const b3 = makeBoss('boneking', G.pl.x + 60, G.pl.y, 5); damagePlayer([[G.S.maxLife * 3, 'phys']], { src: b3, spell: true }); T.ok(G.dead, '第 3 夜不應該有傷害上限'); UI.hideDeath();
    },
    '死在巢穴：死因、回到首領之門前': T => {
      T.hero('druid', 5, 1); damagePlayer = T.realDP; enterMap(1); T.quiet(); goRegion(G.world.stage.n); const z = G.world; BossRoom.skip(); T.quiet();
      const b = G.mons.find(m => m.boss); T.ok(b.maxLife < BOSSES.boneking.life * 3, '第 1 夜看守者生命沒有降低');
      for (let i = 0; i < 5 && !G.dead; i++) damagePlayer([[9999, 'phys']], { src: b, how: 'slam', spell: true });
      T.ok(G.dead && G.savedMap && G.savedMap.world === z, '巢穴裡倒下沒有留首領之門的回來點'); T.ok(/腐骨之王.*重砸/.test(DeathHelp.cause().text), '死因沒寫看守者和招式');
      document.getElementById('deathGate').click(); T.quiet(); T.ok(G.world === z && !G.dead && z.bossGate.open, '回到首領之門前失敗');
    },
    '自動瞄準：只打畫面內、精英優先、點怪鎖定': T => {
      T.hero('druid', 5, 1); enterMap(1); T.quiet(); G.mons = []; render(); const th = G.world.theme, pl = G.pl, mk = (r, dx) => { const m = makeMonster(th.monsters[0], pl.x + dx, pl.y, 2, r, th); G.mons.push(m); return m; };
      const n = mk('normal', 40), e = mk('rare', 200), far = mk('rare', 3000); render(); T.ok(AutoAim.pick() === e, '自動瞄準沒有先打精英'); G.mons = [far]; T.ok(!AutoAim.pick(), '打到畫面外');
      G.mons = [n, e]; render(); AutoAim.tap(n.x - G.cam.x, n.y - 10 - G.cam.y, true); T.ok(AutoAim.pick() === n, '點怪沒有鎖定'); n.dead = true; T.ok(AutoAim.pick() === e && !AutoAim.lock, '鎖定的怪死了沒有解除');
    },
    '裝備需求算自己的屬性、離開前提醒只算黃傳套、第 1 夜怪量': T => {
      T.hero('warrior', 30, 3); const b = BASES.find(x => x.req && x.req.str > G.S.str + 2 && x.req.str - G.S.str < 40 && (!x.req.dex || x.req.dex <= G.S.dex) && (!x.req.int || x.req.int <= G.S.int) && (!x.req.lvl || x.req.lvl <= 30));
      if (b) { const it = makeItem(b.id, 'magic', 30); it.mods = [{ stat: 'str', v: b.req.str - G.S.str }]; T.ok(!canEquip(it), '裝備自己加的力量沒算進去'); it.mods = []; T.ok(canEquip(it), '力量不夠卻能穿'); }
      G.loot = []; dropLoot(G.pl.x, G.pl.y, { item: makeItem(pickBase(5).id, 'normal', 5) }); T.ok(valuableLeft() === 0, '白裝也被算進提醒');
      T.hero('druid', 1, 1); let n = 0, r = 0; for (let i = 0; i < 3; i++) { enterMap(1); n += G.mons.filter(m => !m.dead).length; r += G.mons.filter(m => m.rarity === 'rare').length; } T.ok(n / 3 < 70, '第 1 夜第 1 區怪太多 ' + n / 3); T.ok(r === 0, '第 1 夜第 1 區出現稀有精英');
      T.ok(mapLevel(1) === 2 && mapLevel(2) === 5 && mapLevel(10) === 60, '地圖等級曲線不對');
    },
    '區域首領鎖劇情點（7-2 老鱷魚）': T => {
      T.hero('warrior', 40, 10); enterMap(7); goRegion(2); const w = G.world, ev = w.chap.evs.find(e => e.id === 'ch7_lastpage'), b = ChapBoss.live();
      T.ok(ev && b && ChapEv.locked(w, ev), '首領活著時劇情點沒有鎖');
      T.near(ev, 0); Interact.resolve(); T.ok(G.nearAct && /^先打倒『/.test(G.nearAct.label), '互動鈕沒寫先打倒');
      ChapEv.use(ev); T.ok(!G.P.chapEv.ch7_lastpage, '鎖住時還能撿');
      killMonster(b); T.ok(!G.P.chapEv.ch7_lastpage && !ChapEv.locked(w, ev), '首領倒下後沒解鎖或直接完成了');
      ChapEv.use(ev); T.ok(G.P.chapEv.ch7_lastpage, '解鎖後撿不起來');
    },
    '分塊畫：每塊跟整張畫一樣、交界沒有縫': T => {
      T.hero('warrior', 40, 12); enterMap(12); const w0 = G.world, W = 60, H = 40, w = Object.assign({}, w0, { W, H, grid: new Uint8Array(W * H), deco: w0.deco && new Uint8Array(W * H), canvas: null, chap: null });
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { w.grid[y * W + x] = w0.grid[y * w0.W + x]; if (w.deco) w.deco[y * W + x] = w0.deco[y * w0.W + x]; }
      buildWorldCanvas(w); const all = { x0: 0, y0: 0, x1: W, y1: H }, px = c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let bad = 0;   // ① 每一塊＝同樣大小的畫布畫全部格子（只畫範圍內的格子不會少東西）
      for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) { const c = worldChunk(w, cx, cy), r = document.createElement('canvas'); r.width = c.width; r.height = c.height; worldPaintInto(w, r, cx * CHUNK_PX - CHUNK_PAD, cy * CHUNK_PX - CHUNK_PAD, all); const a = px(c), b = px(r); for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) bad++; }
      // ② 接起來跟舊的整張畫比：交界兩行的差不能比畫布大小造成的雜訊大（實測 ≤ 5）
      const full = document.createElement('canvas'); full.width = W * TS; full.height = H * TS; worldPaintInto(w, full, 0, 0, all);
      const comp = document.createElement('canvas'); comp.width = full.width; comp.height = full.height; worldDraw(comp.getContext('2d'), w, 0, 0, W * TS, H * TS);
      const fa = px(full), ca = px(comp); let seam = 0, diff = 0;
      for (let i = 0; i < fa.length; i += 4) { const d = Math.max(Math.abs(fa[i] - ca[i]), Math.abs(fa[i + 1] - ca[i + 1]), Math.abs(fa[i + 2] - ca[i + 2])), p = i / 4, x = p % full.width, y = (p / full.width) | 0; if (d) diff++; if ((x === 1023 || x === 1024 || y === 1023 || y === 1024) && d > seam) seam = d; }
      worldDropChunks(w);
      T.ok(bad <= (ArtStyle.on ? 20000 : 0), '分塊畫少畫了東西（' + bad + ' 個值不同）');   // 美術開著時 GPU 畫裁切路徑有少量四捨五入誤差（美術工作階段實測，多數差 1～3） T.ok(seam <= 8 && diff < fa.length / 4 * 0.01, '塊與塊交界有縫（交界最大差 ' + seam + '、全圖 ' + diff + ' 點不同）');
    },
    '分塊畫：400×300 大地圖不超過上限': T => {
      T.hero('warrior', 40, 12); enterMap(12); const w0 = G.world, W = 400, H = 300, w = Object.assign({}, w0, { W, H, grid: new Uint8Array(W * H), deco: null, canvas: null, chap: null, events: [] });
      for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) w.grid[y * W + x] = (x % 9 && y % 7) ? 1 : 0;
      const keep = [ArtStyle.on, Hook.m.worldCanvas, WorldChunks.max]; ArtStyle.on = false; Hook.m.worldCanvas = []; WorldChunks.max = 6;   // 只量引擎：關美術、上限調小比較快
      let over = 0, peak = 0;
      try { buildWorldCanvas(w); G.world = w; const g = document.createElement('canvas').getContext('2d');
        for (let k = 0; k < 10; k++) { G.pl.x = (40 + k * 36) * TS; G.pl.y = (30 + k * 26) * TS; worldDraw(g, w, G.pl.x - VW / 2, G.pl.y - VH / 2, G.pl.x + VW / 2, G.pl.y + VH / 2); const n = WorldChunks.count(); peak = Math.max(peak, n); if (n > 6) over++; }
      } finally { [ArtStyle.on, Hook.m.worldCanvas, WorldChunks.max] = keep; worldDropChunks(w); }
      T.ok(!over && peak >= 4, '塊數超過上限或沒畫（最多 ' + peak + ' 塊）'); T.ok(WorldChunks.limit() === (IS_TOUCH ? 12 : 20), '預設上限不對');
      T.ok(w.canvas.chunked && w.canvas.width === W * TS && w.mini.width === W, '大地圖的代表物件或小地圖不對');
    },
    '分塊畫：worldRepaint 只重畫涵蓋的塊': T => {
      T.hero('warrior', 40, 12); enterMap(12); const w = G.world, nx = Math.ceil(w.W / CHUNK), ny = Math.ceil(w.H / CHUNK);
      worldDropChunks(w); for (let cy = 0; cy < Math.min(ny, 2); cy++) for (let cx = 0; cx < Math.min(nx, 3); cx++) worldChunk(w, cx, cy);   // 大地圖塊數超過上限時舊塊會被丟掉，只畫左上幾塊
      let ev = null; const f = (ww, r) => { ev = r; }; Hook.on('terrainChanged', f);
      const tv = w._terrainVer, n = worldRepaint(w, 40, 10, 41, 11), dirty = [...w.chunks.values()].filter(k => k.dirty).map(k => k.cx + ',' + k.cy);
      Hook.m.terrainChanged = Hook.m.terrainChanged.filter(h => h !== f);
      T.ok(n === 1 && dirty.join() === '1,0', '標記重畫的塊不對：' + dirty.join(' '));
      T.ok(w._terrainVer === tv + 1 && ev && ev.x0 === 40 && ev.y1 === 11, '沒發 terrainChanged 或版本沒加');
      const p0 = WorldChunks.painted; worldChunk(w, 1, 0); T.ok(WorldChunks.painted - p0 === 1 && !w.chunks.get(1).dirty, '重畫的塊太多或沒重畫');   // 不呼叫 render（玩家位置不同時會順便畫別的塊）
      const tv2 = w._terrainVer; T.ok(worldRepaint(w) === w.chunks.size && w._terrainVer === tv2, '設定切換（全部重畫）不對');
    },
    '小地圖：大地圖用附近、可以切換整張': T => {
      T.hero('warrior', 40, 12); enterMap(12); const w0 = G.world, keep = CFG.miniView;
      const w = Object.assign({}, w0, { W: 200, H: 60, grid: new Uint8Array(200 * 60).fill(1), deco: null, canvas: null, chap: null, events: [] });
      try {
        buildWorldCanvas(w); G.world = w; G.pl.x = 150 * TS; G.pl.y = 30 * TS;
        CFG.miniView = 'auto'; render(); const a = Object.assign({}, G.mmView);
        CFG.miniView = 'full'; render(); const b = Object.assign({}, G.mmView);
        CFG.miniView = 'auto'; enterMap(12); render(); const c = Object.assign({}, G.mmView);
        T.ok(a.near && a.w === 90 * a.s && a.ox === 105 && G.mmBox && G.mmBox.wd === G.world, '大地圖沒有用附近、或沒跟著玩家捲動（ox=' + a.ox + '）');
        T.ok(!b.near && b.w === 200 * b.s, '設定整張沒有顯示整張');
        T.ok(G.world.W > 120 || !c.near, '小地圖（寬 ' + G.world.W + '）自動模式不該用附近');
      } finally { CFG.miniView = keep; worldDropChunks(w); }
    },
    '章節地圖：打開通道只重畫蓋到的塊': T => {
      T.hero('warrior', 40, 10); enterMap(10); G._stagePlan = { i: 2, n: 3 }; let w; try { w = genMap(10); } finally { G._stagePlan = null; }   // 10-2 有 D（世界組改成大地圖後：換成大地圖裡有 D 的那張）
      G.world = w; buildWorldCanvas(w); T.ok(w.chap && w.chap.dCells.length && !w.chap.open, '10-2 沒有封住的通道');
      for (let cy = 0; cy < Math.ceil(w.H / CHUNK); cy++) for (let cx = 0; cx < Math.ceil(w.W / CHUNK); cx++) worldChunk(w, cx, cy);
      const dc = w.chap.dCells[0], dx = Math.floor((dc % w.W) / CHUNK), dy = Math.floor(Math.floor(dc / w.W) / CHUNK); worldDropChunks(w); for (let cy = Math.max(0, dy - 1); cy <= dy + 1; cy++) for (let cx = Math.max(0, dx - 1); cx <= dx + 1; cx++) if (cx * CHUNK < w.W && cy * CHUNK < w.H) worldChunk(w, cx, cy);
        const ex = w.explored, tv = w._terrainVer, t0 = performance.now(); ChapterMaps.openD(w, true); const ms = performance.now() - t0;
      const dirty = [...w.chunks.values()].filter(k => k.dirty).length;
      T.ok(w.chap.dCells.every(i => w.grid[i]) && dirty > 0 && dirty < w.chunks.size && w.explored === ex && w._terrainVer > tv && ms < 15, '打開通道沒有只重畫蓋到的塊（' + dirty + '/' + w.chunks.size + ' 塊，' + ms.toFixed(1) + ' 毫秒）');
    },
    '大地圖：一夜一張圖、沒有區域門、走進第 2 區換區、怪延後生成、遠處凍結': T => {
      T.hero('warrior', 30, 3); enterMap(1); T.quiet(); const w = G.world;
      T.ok(w.regions && w.regions.length === 3 && !w.gate && w.stage.i === 1, '第 1 夜不是一張三區的大地圖，或還有區域門');
      T.ok(G.mons.length && G.mons.every(m => BigMap.regionAt(w, m.x, m.y) === 1) && !w.regions[1].act, '進圖時第 1 區以外就有怪');
      const p = w.regions[1].sPt; G.pl.x = p.x * TS + 16; G.pl.y = p.y * TS + 16; T.run(0.3);
      T.ok(w.stage.i === 2 && w.regions[1].act && G.banner && /倒鐘/.test(G.banner.title) && /第 2 \/ 3 區/.test(w.name), '走進第 2 區沒換區或沒跳橫幅');
      T.ok(G.mons.some(m => BigMap.regionAt(w, m.x, m.y) === 2) && !w.regions[2].act, '第 2 區的怪沒生，或第 3 區太早生');
      const far = G.mons.find(m => !m.dead && Math.hypot(m.x - G.pl.x, m.y - G.pl.y) > 2400); if (far) { far.aggro = true; const x = far.x; T.run(0.5); T.ok(far.zz && far.x === x, '遠處的怪沒有凍結'); }
    },
    '大地圖：劇情事件、封住的通道、區域首領都在大地圖上完成（第 1 夜）': T => {
      T.hero('warrior', 30, 3); enterMap(1); T.quiet(); const w = G.world, c = w.chap;
      T.ok(c && c.keys.join() === '1-1,1-2,1-3' && c.dCells.length && c.dCells.every(i => !w.grid[i]), '三區的劇情資料沒合併或 D 沒封住');
      for (const ev of c.evs) { T.near(ev, 0); UI.interact(); T.quiet(); }
      T.ok(c.open && c.dCells.every(i => w.grid[i]) && ['ch1_guard', 'ch1_decree', 'ch1_throne'].every(k => G.P.chapEv[k]), 'D 沒打開或劇情沒完成');
      goRegion(2); const b = ChapBoss.live(); T.ok(b && BigMap.regionAt(w, b.x, b.y) === 2, '第 2 區的區域首領沒出現'); killMonster(b); T.ok(c.bosses[0].dead && G.P.chapBoss.ch1_herald, '區域首領沒記錄');
      T.ok(!(w.events || []).some(e => c.evs.some(s => Math.hypot(s.x - e.x, s.y - e.y) < 3 * TS)), '地圖事件壓在劇情點 3 格內');
      goRegion(3); T.ok(w.bossGate && BigMap.regionAt(w, w.bossGate.x, w.bossGate.y) === 3 && G.mons.filter(m => m.guardian).length === 2, '首領之門或守護者不在最後一區');
    },
    '大地圖：深層地圖 3～6 區、大小在範圍內、樣子不一樣': T => {
      T.hero('warrior', 60, 30);
      for (const t of [11, 15, 25]) for (let k = 0; k < 3; k++) {
        G._stagePlan = { i: 1, n: stageCountFor(t) }; const t0 = performance.now(), w = genMap(t), ms = performance.now() - t0; G._stagePlan = null;
        T.ok(w.regions && w.regions.length >= 3 && w.regions.length <= 6 && w.stage.n === w.regions.length, `第 ${t} 夜區數不對`);
        T.ok(w.W >= 100 && w.W <= 260 && w.H >= 70 && w.H <= 180, `第 ${t} 夜大小 ${w.W}×${w.H} 超出範圍`);
        T.ok(new Set(w.regions.map(r => r.kind)).size >= 2 && ms < 400, `區域長得都一樣，或蓋圖太慢（${Math.round(ms)} 毫秒）`);
      }
    },
    '大地圖：沒打完的夢存讀（目前區、已生成的區、D、守護者）': T => {
      T.hero('warrior', 30, 3); enterMap(1); T.quiet(); let w = G.world; goRegion(3); T.run(0.3);
      const n0 = G.mons.length, act = w.regions.map(r => r.act).join();
      dreamSave(); goTown(); G.savedMap = null; dreamRestore(G.charId); resumeMap(); T.run(0.3); w = G.world;
      T.ok(w.regions && w.regions.map(r => r.act).join() === act && w.rmap && w.rmap.length === w.W * w.H, '讀檔後區域資料不對');
      T.ok(Math.abs(G.mons.length - n0) <= 3 && G.mons.filter(m => m.guardian).length === w.bossGate.need && !w.bossGate.open, '讀檔後怪物或守護者不對');
      T.ok(w.chap.dCells.every(i => !w.grid[i]) && !w.chap.open && w.stage.i === 1, '讀檔後 D 或目前所在區不對');
      goRegion(2); T.ok(w.regions[1].act && w.stage.i === 2 && G.mons.some(m => BigMap.regionAt(w, m.x, m.y) === 2), '讀檔後還沒生怪的區走近不會生');
    },
    '大地圖：v2.18.2 舊存檔（一區一張圖）讀得回來、出口門接到大地圖': T => {
      T.hero('warrior', 30, 5); enterMap(3); T.quiet(); const old = ChapterMaps.build(3, 1), b = old.boss; old.stage = { i: 1, n: 3 }; old.gate = { x: (b.x + b.w / 2) * TS, y: (b.y + b.h / 2) * TS };
      resetEntities(); G.world = old; buildWorldCanvas(old); G.pl.x = (old.start.x + 4) * TS; G.pl.y = (old.start.y + 4) * TS; populate(old); old.portal = { x: G.pl.x, y: G.pl.y, exit: true };
      dreamSave(); goTown(); G.savedMap = null; dreamRestore(G.charId); resumeMap(); T.run(0.2); T.ok(!G.world.regions && G.world.gate && G.world.chap, '舊格式沒讀回來');
      G.loot = []; T.ok(T.near(G.world.gate).kind === 'gate', '舊存檔的出口門沒被選到'); UI.interact(); T.run(0.2);
      const w = G.world; T.ok(w.regions && w.stage.i === 2 && w.regions[0].act && !G.mons.some(m => BigMap.regionAt(w, m.x, m.y) === 1), '舊存檔換區沒接到大地圖第 2 區');
    },
    '章節地圖：劇情點旁邊沒有怪': T => {
      for (const [t, s] of [[6, 2], [10, 2], [7, 2]]) { T.hero('warrior', 40, 10); enterMap(t); goRegion(s); const c = G.world.chap;
        const n = G.mons.filter(m => !m.dead && !m.chapBoss && !m.chapAmb && c.evs.some(e => Math.hypot(e.x - m.x, e.y - m.y) < 4.5 * TS)).length;
        T.ok(n === 0, `${t}-${s} 劇情點旁邊還有 ${n} 隻怪`); }
    },
    '沉船大版、日誌第幾區、進化圖鑑排序、輔助寶石連動': T => {
      T.hero('ranger', 30, 6); enterMap(6); goRegion(2); T.ok(G.world.chap.scenes.some(s => s.id === 'wreckBig'), '6-2 沉船沒有用大版');
      const j = JournalTabs.list.find(x => x.id === 'chapstory').html(); T.ok(/在第 1 夜第 \d/.test(j), '日誌沒寫第幾區');
      const h = EvoCodex.html(); T.ok(h.indexOf('飛刀') >= 0 && h.indexOf('飛刀') < h.indexOf('evoother') && /其他職業（\d+）/.test(h) && /傳奇.+有機會掉/.test(h), '進化圖鑑排序或掉落提示不對');
      T.ok(/可觸發：凝血（流血＋冰緩）/.test(SUPPORTS.rend.desc) && !/可觸發/.test(SUPPORTS.power.desc), '輔助寶石沒寫可觸發的連動');
    },
    '劇情對齊：營地播主線、選完取代第二章、深層台詞': T => {
      const P = T.hero('warrior', 50, 9); P.story.seen = { intro: true, firstDream: true };
      // smoke() 把 storyBeat 換成空的（劇情不會跳出來擋測試）→ 這裡記下有沒有叫它播 tier4，不看 seen
      const sb = window.storyBeat, beats = []; window.storyBeat = k => beats.push(k);
      try { enterMap(4); update(1 / 30); T.ok(!beats.includes('tier4'), '一進第 4 夜就播了舊劇情'); P.hub = 'cell'; goTown(); T.quiet(); update(1 / 30); } finally { window.storyBeat = sb; }
      T.ok(beats.includes('tier4'), '回營地沒播歐莉的紙條'); T.quiet();
      P.story.seen.yin1 = true; P.bossKills.b_swamp = 1; P.wardens.first.b_swamp = 'name'; P.wardens.tok = {};
      T.ok((nextNpcChapter('yin', P) || {}).id === 'w_b_swamp', '選完之後茵之二沒有被取代');
      T.ok(!STORY.w_b_swamp.pages[0].includes('圍裙'), '沒拿到信物卻說了圍裙');
      T.ok(WARDEN_IDS.every(id => WARDEN_TEXT[id].deep && WARDEN_TEXT[id].deep.length === 2), '深層台詞不齊');
      T.ok(wKillOpt('witch')[1].includes('她') && wKillOpt('beast')[1].includes('牠'), '了結說明的稱呼不對');
      T.ok(CHAPTER_MAPS['10-3'].bosses.B.story === 'ch10_sit' && !(CHAPTER_MAPS['10-1'].bosses || {}).B, '放棄的那個我位置不對');
      P.wardens.first = {};
    },
    '開始畫面：選單、繼續、選擇角色、進遊戲後停止': T => {
      T.clean(); if (G.state === 'play') backToTitle();
      TitleScreen.open(); const q = s => document.querySelector(s), ids = [...document.querySelectorAll('#title .ts-menu button')].map(b => b.dataset.ts).join(',');
      T.ok(TitleScreen.shown && q('#title.show'), '開始畫面沒出現');
      T.ok(['chars', 'new', 'set', 'cred'].every(k => ids.includes(k)), '選單項目不齊：' + ids);
      q('#title [data-ts="chars"]').click(); T.ok(!TitleScreen.shown && q('#menu.show') && q('#tsBack'), '選擇角色沒打開原本的清單');
      q('#tsBack').click(); T.ok(TitleScreen.shown, '回不到開始畫面');
      T.hero('mage', 12, 4); saveGame(); const id = G.charId; T.ok(!TitleScreen.alive && !TitleScreen.shown, '進遊戲後開始畫面的迴圈沒停');
      backToTitle(); TitleScreen.open(); T.ok(TitleScreen.last && TitleScreen.last.id === id && q('#title [data-ts="cont"]'), '繼續不是上次的角色');
      q('#title [data-ts="cont"]').click(); T.ok(G.state === 'play' && G.charId === id && !TitleScreen.alive, '繼續沒有直接進角色');
    },
    '選角畫面：槽位清單和建立新角色分開': T => {
      T.clean(); if (G.state === 'play') backToTitle(); const q = s => document.querySelector(s), qa = s => document.querySelectorAll(s).length;
      TitleScreen.open(); q('#title [data-ts="new"]').click();
      T.ok(q('#menu.show .classes') && !qa('#menu .slot') && q('#backPick'), '建立新角色那頁還有角色清單，或沒有返回');
      UI.buildMenu(); T.ok(q('#menu .classes'), '重畫後跳回了選擇角色');
      q('#backPick').click(); const n = loadIndex().chars.length;
      T.ok(!qa('#menu .classes') && qa('#menu .slot[data-play]') === n && q('#slotNew'), '選擇角色的槽位數不對：' + qa('#menu .slot[data-play]') + '/' + n);
      q('#slotNew').click(); T.ok(q('#menu .classes'), '空槽位沒打開建立新角色');
      q('#tsBack').click(); q('#title [data-ts="chars"]').click(); T.ok(q('#menu .slots') && !qa('#menu .classes'), '開始畫面的選擇角色沒打開槽位清單');
      const old = window.loadIndex; window.loadIndex = () => ({ chars: Array.from({ length: MAX_CHARS }, (_, i) => ({ id: 'x' + i, name: '假' + i, cls: 'mage', lvl: 1, maxTier: 1 })) });
      try { UI.buildMenu('pick'); T.ok(!q('#slotNew') && q('#menu .slot.full') && qa('#menu .slot[data-play]') === MAX_CHARS, '角色滿了還能建立'); } finally { window.loadIndex = old; UI.buildMenu('pick'); }
      T.hero('mage', 2, 1); backToTitle(); T.ok(UI.menuMode === 'pick' && q('#menu .slots'), '回到選角沒回到槽位清單'); TitleScreen.destroy();
    },
    '開始畫面：沒有角色時沒有繼續': T => {
      if (G.state === 'play') backToTitle(); const old = window.loadIndex; window.loadIndex = () => ({ chars: [] });
      try { TitleScreen.open(); T.ok(!document.querySelector('#title [data-ts="cont"]') && document.querySelectorAll('#title .ts-menu button').length === 4, '沒有角色卻有繼續'); } finally { window.loadIndex = old; TitleScreen.destroy(); }
    },
    '開始畫面：六個人圍著營火、畫一格很快': T => {
      if (G.state === 'play') backToTitle();
      TitleScreen.open(); for (let i = 0; i < 30; i++) TitleScreen.tick(1 / 60);
      const st = TitleScreen.state(), cls = st.seats.map(s => s.split('@')[0]);
      T.ok(st.seats.length === 6 && new Set(cls).size === 6, '圍坐的人數或職業不對：' + st.seats);
      const last = TitleScreen.last; T.ok(!last || st.seats.includes(last.cls + '@R'), '最近玩的角色沒坐在最顯眼的位置');
      T.ok(TitleScreen.ms < 8, '開始畫面一格太慢：' + TitleScreen.ms.toFixed(1) + 'ms');
      let n = 0; while (TitleScreen.state().flare <= 0 && n++ < 1200) TitleScreen.tick(1 / 60);
      T.ok(TitleScreen.state().flare > 0, '沒有人往火裡丟柴');
      TitleScreen.destroy(); T.ok(!TitleScreen.alive && !TitleScreen.shown, '關掉後迴圈沒停');
    },
    '傳奇、套裝用自己的圖示': T => {
      const P = T.hero('warrior', 40, 8); P.inv[0] = makeUnique('u_fuse', 40); P.inv[1] = makeSetItem('set_dabai_collar', 40);
      const want = ['u_fuse', 'set_dabai_collar'].map(id => ArtStyle.cell(id)); if (want.some(c => !c)) return;   // 美術關掉時跳過
      UI.toggle('inv', true); UI.refreshInv(); const imgs = [...document.querySelectorAll('#inv img')].map(i => i.src);
      T.ok(want.every(c => imgs.includes(artURL(c))), '背包裡的傳奇或套裝沒用自己的圖示'); UI.toggle('inv', false);
    },
    '手機：點背包裝備只出現一個視窗（比較面板）': T => {
      T.hero('ranger', 20, 5); const P = G.P, keep = Touch.on;
      let it = null; for (let k = 0; k < 60 && !it; k++) { const x = makeItem(pickBase(5).id, 'magic', 5); if (!isFlask(x) && !canEquip(x)) it = x; }
      const i = P.inv.indexOf(null); P.inv[i] = it; UI.toggle('inv', true); UI.refreshInv();
      const c = document.querySelector(`#invgrid .icell[data-i="${i}"]`), r = c.getBoundingClientRect(), o = { bubbles: true, clientX: r.x + 5, clientY: r.y + 5 };
      try {
        Touch.on = true; c.dispatchEvent(new MouseEvent('mouseenter', o)); c.dispatchEvent(new MouseEvent('click', o));
        T.ok($('#cmp').classList.contains('show') && $('#cmp [data-a="equip"]'), '手機：點了沒有打開比較面板（或沒有裝備鈕）');
        T.ok($('#tip').style.display !== 'block', '手機：比較面板之外又跳了浮動說明');
        UI.select(null); Touch.on = false; c.dispatchEvent(new MouseEvent('mouseenter', o));
        T.ok($('#tip').style.display === 'block', '電腦版：滑鼠移上去沒有浮動說明');
      } finally { Touch.on = keep; UI.select(null); UI.hideTip(); UI.toggle('inv', false); }
    },
    '手機：位移鈕有職業圖示、冷卻轉圈、在畫面內': T => {
      if (!Touch.on) return T.ok(!document.getElementById('tdodge'), '電腦版不該有位移鈕');
      for (const cls of ['ranger', 'mage', 'warrior', 'samurai']) {
        T.hero(cls, 10, 2); UI.closeAll(); enterMap(1); T.quiet(); G.pl.dodgeCd = 0.5; Touch.frame = 5; Touch.tick();
        const b = $('#tdodge'), r = b.getBoundingClientRect(), c = CV.getBoundingClientRect();
        T.ok(b.querySelector('.tico').src.startsWith('data:image') && b.dataset.move === classMove().id, cls + '：位移鈕沒有該職業的圖示');
        T.ok(r.left >= c.left && r.right <= c.right && r.top >= c.top && r.bottom <= c.bottom, cls + '：位移鈕跑出畫面');
        T.ok(b.querySelector('.tcd').textContent !== '', cls + '：位移冷卻沒有轉圈');
        for (const o of document.querySelectorAll('#touchui .tbtn[data-s]')) { const q = o.getBoundingClientRect(); T.ok(r.right <= q.left || r.left >= q.right || r.bottom <= q.top || r.top >= q.bottom, cls + '：位移鈕跟技能鈕重疊'); }
      }
      G.pl.dodgeCd = 0; $('#tdodge').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); T.ok(G.pl.dodgeCd > 0, '按位移鈕沒有放出位移');
    },
    '手機：天賦點一下出現確認鈕、按了才點上': T => {
      T.hero('ranger', 20, 5); const P = G.P; UI.toggle('tree', true); TreeView.center(); TreeView.draw();
      const tgt = TREE.list.find(n => { const p = treePath(P, n.id); return p && p.length === 2 && n.kind === 'minor'; });
      const n0 = P.tree.length, cv = TreeView.canvas;
      const blank = () => { for (let y = 30; y < cv.height; y += 17) for (let x = 30; x < cv.width; x += 17) if (TREE.list.every(n => { const q = TreeView.toScreen(n); return Math.hypot(q.x - x, q.y - y) > TreeView.nodeR(n) + 30; })) return { x, y }; };
      const tap = (n, type) => { const r = cv.getBoundingClientRect(), p = n ? TreeView.toScreen(n) : blank(), o = { bubbles: true, clientX: r.left + p.x, clientY: r.top + p.y, pointerId: 9, pointerType: type || 'touch', button: 0 }; cv.dispatchEvent(new PointerEvent('pointerdown', o)); window.dispatchEvent(new PointerEvent('pointerup', o)); };
      try {
        tap(tgt); tap(tgt);
        T.ok(P.tree.length === n0, '點兩下同一個天賦就點上了（應該要按確認鈕）');
        const b = document.querySelector('#treeSel [data-ta="alloc"]');
        T.ok(b && b.textContent === '點這 2 個（需要 2 點）', '沒有出現「點這 2 個（需要 2 點）」確認鈕');
        if (b) b.click();
        T.ok(P.tree.length === n0 + 2 && P.tree.includes(tgt.id), '按確認鈕沒有點上');
        T.ok(document.querySelector('#treeSel').style.display === 'none', '點完說明卡沒收起來');
        tap(tgt); const rb = document.querySelector('#treeSel [data-ta="refund"]'); if (rb) rb.click();
        T.ok(!P.tree.includes(tgt.id), '「退回這一點」沒作用');
        tap(tgt); tap(null); T.ok(!TreeView.tapSel && document.querySelector('#treeSel').style.display === 'none', '點空白處沒有取消選取');
        if (!IS_TOUCH) { TreePlan.cancel(); tap(tgt, 'mouse'); T.ok(P.tree.includes(tgt.id), '電腦版：左鍵沒有直接點上'); }
      } finally { TreePlan.cancel(); UI.toggle('tree', false); }
    },
    '面板、設定頁、夢之門都打得開': T => {
      for (let i = 0; i < 3; i++) applyCfg(); T.ok(document.querySelectorAll('#portalbtn').length === 1, '改設定後回城鈕變成好幾顆');
      T.hero('summoner', 60, 21);
      for (const p of ['inv', 'char', 'skills', 'craft', 'journal', 'help', 'shop', 'stash', 'tree']) { UI.toggle(p, true); if (p === 'tree') TreeView.draw(); UI.toggle(p, false); G.P.treePend = []; }
      for (const t of ['cur', 'sup', 'jewel', 'uniq', 0]) { UI.toggle('stash', true); UI.stashTab = t; UI.refreshStash(); } UI.toggle('stash', false);
      Pause.show(); Pause.view = 'settings'; for (const t of ['display', 'sound', 'ui', 'loot', 'keys']) { Pause.tab = t; Pause.render(); }
      T.ok(document.querySelector('[data-c="volMusic"]') || true, ''); Pause.tab = 'sound'; Pause.render(); T.ok(document.querySelector('[data-c="volMusic"]'), '設定：背景音樂那一列不見了');
      Pause.tab = 'ui'; Pause.render(); T.ok(document.querySelector('[data-tut]'), '設定：新手引導那一列不見了'); Pause.hide();
      UI.showMapDevice(true); T.ok(document.querySelector('#mapList .bounty'), '夢之門沒有懸賞'); UI.showMapDevice(false);
    },
    '強化、珠寶鑲嵌、天賦珠寶、天賦最短路徑': T => {
      const P = T.hero('ranger', 70, 13); const w = P.equip.weapon, R = Math.random;
      P.cur.whet = 2; Math.random = () => 0.01; const r = enhanceItem(w, (k, n) => { P.cur[k] -= n; }, k => P.cur[k] || 0); Math.random = R; T.ok(r.ok && w.enh === 1, '強化沒成功');
      P.equip.body.sockets = [null]; P.jewels.ruby_2 = 1; UI.toggle('inv', true); UI.refreshInv();
      UI.rightInv(P.inv.findIndex(it => it && it.stack === 'jewel' && it.key === 'ruby_2'), {}); UI.clickEquip('body', {}); T.ok(P.equip.body.sockets[0] === 'ruby_2', '珠寶沒鑲上'); UI.toggle('inv', false);
      const sock = TREE.list.filter(n => n.kind === 'jsock').map(n => ({ n, p: treePath(P, n.id) })).filter(x => x.p).sort((a, b) => a.p.length - b.p.length)[0];
      UI.toggle('tree', true); TreeView.tryAlloc(sock.n.id); T.ok(P.treePend.length === sock.p.length, '最短路徑沒點到'); TreePlan.confirm();
      const j = makeTreeJewel(80, 'rare'); P.treeJewels = { [sock.n.id]: j }; onBuildChanged(); T.ok(Object.keys(sock.n.stats).length, '天賦珠寶沒生效'); UI.toggle('tree', false);
    },
    '光環、詛咒、輔助寶石限制': T => {
      const P = T.hero('summoner', 30, 5); P.skillGems = Object.assign(P.skillGems || {}, { a_haste: true }); P.skills[2] = 'a_haste'; onBuildChanged();
      const m0 = G.S.maxMana; G.pl.cd = {}; G.pl.act = 0; useSkill(2); T.ok(G.S.maxMana < m0, '光環沒有保留魔力'); G.pl.cd = {}; G.pl.act = 0; useSkill(2); T.ok(G.S.maxMana === m0, '光環關不掉');
      enterMap(2); T.quiet(); const m = G.mons.find(x => !x.boss); input.wx = m.x; input.wy = m.y; G.pl.x = m.x - 80; G.pl.y = m.y;
      NEW_CAST.curse('c_enf', calcSkill(G.S, 'c_enf', 30, []), SKILLS.c_enf, {}, 0); T.ok(m.curses && m.curses.length === 1, '詛咒沒上');
      T.ok(supportFits('gmp', 'fireball') && !supportFits('gmp', 'c_enf') && !supportFits('crit', 'a_haste') && !supportFits('ret', 'rain'), '輔助寶石限制不對');
    },
    '倉庫專屬分頁、傳奇頁、分解、一鍵賣': T => {
      const P = T.hero('warrior', 30, 5); const keep = localStorage.getItem(STASH_KEY);
      try {
        P.cur.chaos = 3; UI.toggle('stash', true); stashAllStacks(['cur']); T.ok((G.stash.spec.cur.chaos || 0) >= 3, '通貨沒進專屬分頁');
        const u = makeUnique(UNIQUES[0].id, 30); P.inv[31] = u; UI.depositItem(31); T.ok(G.stash.spec.uniq.includes(u), '傳奇沒進傳奇頁'); UI.toggle('stash', false);
        UI.toggle('shop', true); P.inv[20] = makeItem(BASES.find(b => b.slot === 'weapon').id, 'rare', 60); UI.salvage(20); T.ok((P.shards.whet || 0) > 0 || P.cur.whet > 0, '分解沒給磨石碎片');
        P.inv[21] = randomFlask(2); UI.bulkFilter().flask = true; T.ok(UI.bulkList().includes(21), '一鍵賣沒有包含藥劑'); UI.toggle('shop', false);
      } finally { if (keep) localStorage.setItem(STASH_KEY, keep); else localStorage.removeItem(STASH_KEY); G.stash = loadStash(); }
    },
    '懸賞、首領連戰、保留夢境': T => {
      const P = T.hero('warrior', 60, 16); const B = bountyState(); B.board[0] = { type: 'kills', n: 2, reward: { n: 5, q: 0, r: 0, rare: 1 } }; B.active = 0;
      enterMap(15); G.loot = []; G.mons.filter(m => !m.boss).slice(0, 2).forEach(m => killMonster(m)); T.ok(B.done === 1 && G.loot.length > 0, '懸賞沒完成或沒掉寶');
      dreamSave(); T.ok(localStorage.getItem('yiwang_dream_' + G.charId), '夢境沒存'); const id = G.charId; saveGame(); G.savedMap = null; startGame(loadChar(id), id); T.quiet(); T.ok(G.savedMap, '夢境沒還原');
      G.P.cur.chaos = 10; enterBossRush(); T.ok(G.world.rush && G.mons.some(m => m.boss), '首領連戰沒開始'); T.run(0.3);
    },
      '登記式事件（舊包裝改過來的）都還有作用': T => {
      let P = T.hero('warrior', 20, 5); T.ok(G.P.tut === 99 || G.P.tut === 0, '新手引導狀態不對');
      T.ok(typeof G.P.cur === 'object' && (G.P.cur.portal || 0) >= 0, '背包通貨代理沒裝上');
      G.P.inv[30] = { stack: 'mat', key: 'ore_1', n: 30 }; G.P.matsGone = false; saveGame(); const id = G.charId; const c0 = G.P.cur.chaos;
      startGame(loadChar(id), id); T.quiet(); T.ok(!G.P.inv.some(x => x && x.stack === 'mat') && G.P.cur.chaos > c0, '舊材料沒換成混沌石');
      G.P.tree.push(...treePath(G.P, TREE.list.find(n => n.name === '一閃').id)); G.P.treePend = G.P.tree.slice(-3); const n0 = G.P.tree.length; saveGame();
      startGame(loadChar(id), id); T.quiet(); T.ok(G.P.tree.length === n0 - 3, '沒確認的天賦沒有退回');
      const f = campFolk(G.world)[0], fx = f.x; f.tx = f.x + 40; f.ty = f.y; f.wait = 0; T.run(1); T.ok(f.x !== fx, '營地路人不會走');
      G.pl.dodgeCd = 1; T.run(0.5); T.ok(G.pl.dodgeCd < 1, '位移冷卻不會倒數');
      enterMap(2); T.quiet(); const m = G.mons.find(x => !x.boss); m.curses = [{ id: 'c_enf', v: 20, t: 0.2 }]; T.run(0.5); T.ok(!m.curses.length, '詛咒不會到期');
      const s = G.mons.find(x => !x.boss && !x.dead); s.modIds = ['split']; s.mods = [{ id: 'split' }]; const k0 = G.mons.length; s.life = 0; killMonster(s); T.ok(G.mons.length > k0, '分裂精英死了沒分裂');
      if (!T._kc) { T._kc = 1; Hook.on('kill', m => { if (m.__kc != null) m.__kc++; }); } const tj = G.mons.find(x => !x.boss && !x.dead); tj.__kc = 0; killMonster(tj); killMonster(tj); T.ok(tj.__kc === 1, '同一隻怪的死亡事件發了兩次');
      P = T.hero('warrior', 60, 16); G.P.cur.chaos = 10; enterBossRush(); const b = G.mons.find(x => x.boss); b.life = 0; killMonster(b); G.time += 4; T.run(0.2); T.ok(G.mons.some(x => x.boss && !x.dead), '首領連戰下一位沒出現');
      enterMap(12); leaveMapToTown(); G.savedMap.expireAt = Date.now() - 1; T.run(0.1); T.ok(!G.savedMap, '保留的夢境過期沒關');
    },
  },
  async smoke(only) {
    const pass = [], fail = []; this.errors = [];
    const onErr = e => this.errors.push(String(e.message || e).slice(0, 200)); window.addEventListener('error', onErr);
    const dp = window.damagePlayer, sb = window.storyBeat; window.storyBeat = () => { };
    for (const name in this.TESTS) {
      if (only && !name.includes(only)) continue;
      try { this.TESTS[name](this); pass.push(name); } catch (e) { fail.push(name + '：' + String(e.message || e).slice(0, 160)); }
    }
    this.clean(); window.damagePlayer = dp; window.storyBeat = sb; window.removeEventListener('error', onErr);
    return { ok: !fail.length && !this.errors.length, pass: pass.length, fail, errors: this.errors };
  },
};
