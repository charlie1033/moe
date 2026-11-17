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
  hero(cls = 'warrior', lvl = 30, maxTier = 13) {
    this.clean();
    const P = newCharacter(cls, this.NAME); P.lvl = lvl; P.maxTier = maxTier; P.story = { seen: { intro: true, ending: true } };
    startGame(P); this.quiet(); window.damagePlayer = () => { }; return G.P;
  },
  quiet() { UI.storyOpen = false; const s = document.getElementById('story'); if (s) s.classList.remove('show'); if (UI.storyQ) UI.storyQ.length = 0; },
  run(sec = 1) { for (let i = 0; i < sec * 30; i++) { this.quiet(); update(1 / 30); } render(); },
  near(ref, dx = 20) { G.pl.x = ref.x + dx; G.pl.y = ref.y; this.quiet(); update(1 / 30); return G.nearAct; },
  ok(c, msg) { if (!c) throw new Error(msg); },
  TESTS: {
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
    '按 F 互動：撿東西、路人、出口門、地圖事件、寶箱': T => {
      const P = T.hero('warrior', 60, 21);
      const f = campFolk(G.world)[0]; T.ok(T.near(f).kind === 'folk', '路人沒被選到'); UI.interact(); T.ok(f.say, '路人沒說話');
      T.ok(T.near(G.world.portal, 30).kind === 'device', '營火（夢之門）沒被選到'); UI.interact(); T.ok(UI.mapDevOpen, '夢之門沒打開'); UI.showMapDevice(false);
      enterMap(14); T.quiet(); const w = G.world;
      const l = { x: G.pl.x + 20, y: G.pl.y, t: 1, item: makeItem(BASES.find(b => b.slot === 'helmet').id, 'rare', 12), color: '#ff0' }; l.label = l.item.name; G.loot.push(l);
      T.quiet(); update(1 / 30); T.ok(G.nearAct && G.nearAct.kind === 'loot', '地上物品沒被選到'); UI.interact(); T.ok(l.gone || G.P.inv.includes(l.item) || Object.values(G.P.equip).includes(l.item), 'F 沒撿起來');
      const s = w.start, at = { x: (s.x + s.w / 2) * TS, y: (s.y + s.h / 2) * TS };
      for (const kind of ['shrine', 'essence', 'vision', 'chest', 'abyss']) {
        const ev = Object.assign({ kind, done: false, type: 'might', mon: w.theme.monsters[0] }, at); w.events.push(ev); G.loot = [];
        T.ok(T.near(ev).kind === 'mapev', kind + ' 沒被選到'); UI.interact(); T.ok(ev.done, kind + ' 沒啟動'); T.run(0.3);
      }
      const n = w.stage.n; for (let k = 1; k < n; k++) { G.loot = []; T.ok(T.near(G.world.gate).kind === 'gate', '出口門沒被選到'); UI.interact(); T.ok(G.world.stage.i === k + 1, '沒進下一區'); }
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
      enterMap(3); while (G.world.stage && G.world.stage.i < G.world.stage.n) nextStage(); BossRoom.skip(); T.ok((MapTint.veins(G.world) || []).length > 5, '首領房沒有裂紋');
    },
    '終局：怪群加大、蟲群、夢潮裂隙': T => {
      T.hero('mage', 80, 26); let sw = 0, tide = null, cnt = 0;
      for (let k = 0; k < 8 && !(sw && tide); k++) { enterMap(22); cnt = Math.max(cnt, G.mons.length); sw += G.mons.filter(m => m.swarm).length; tide = G.world.events.find(e => e.kind === 'tide'); }
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
      P.deepRules[38] = ['wr_blast', 'wr_colossus', 'wr_guard', 'wr_thorn']; P.deepMods[38] = []; enterMap(38); while (G.world.stage.i < G.world.stage.n) nextStage(); BossRoom.skip();
      const F = G.world.mm.flags; T.ok(F.wr_blast && F.wr_colossus && F.wr_guard && F.wr_thorn && G.world.mm.q >= 40, '世界規則沒有套到地圖');
      T.ok(G.mons.filter(m => m.name.startsWith('護衛・')).length === 3 && G.mons.find(m => m.boss).colossus, '護衛或巨像沒生效');
      const m = makeMonster(G.world.theme.monsters[0], G.pl.x + 60, G.pl.y, G.world.mlvl, 'normal', G.world.theme); G.mons.push(m); killMonster(m); T.ok(G.world.blasts.length === 1, '餘燼沒有留下爆炸'); T.run(3); T.ok(!G.world.blasts.length && G.zones.length > 0, '爆炸沒結束或荊棘沒長');
      T.ok(!P.deepRules[38], '進圖後世界規則沒有重抽'); T.ok(!rollMapMods(30).some(id => MAP_MOD_BY_ID[id].rule), '世界規則被當成一般詞綴骰到');
      P.deepMods[40] = []; enterMap(40); while (G.world.stage.i < G.world.stage.n) nextStage(); BossRoom.skip(); killMonster(G.mons.find(m => m.boss)); T.ok(P.maxTier === 40 && P.depthEnd, '第 40 夜沒有封頂');
    },
    '新手保護：前期升級快、第一夜怪少而且遠程少': T => {
      T.ok(xpNeed(1) < 80 && xpNeed(11) < xpNeed(12) && xpNeed(12) === 3026, '前期經驗曲線不對');
      for (let l = 1; l < 30; l++) T.ok(xpNeed(l + 1) > xpNeed(l), '經驗需求沒有遞增：' + l);
      T.hero('mage', 1, 1); enterMap(1); const ms = G.mons.filter(m => !m.boss), rg = ms.filter(m => m.def.ranged).length;
      T.ok(ms.length < 120, '第一夜怪太多：' + ms.length); T.ok(rg / ms.length < 0.2, '第一夜遠程怪太多：' + rg + '/' + ms.length);
    },
    '召喚師：開局有骨矛、召喚物生命變厚': T => {
      const P = T.hero('summoner', 3, 1); T.ok(P.skills[0] === 'bonespear' && hasSkillGem(P, 'bonespear'), '召喚師開局沒有骨矛');
      enterMap(1); T.quiet(); const m = G.mons.find(x => !x.boss); input.wx = m.x; input.wy = m.y; G.pl.mana = 999; useSkill(0); T.ok(G.projs.some(p => p.team === 'ally'), '骨矛沒有射出去');
      G.pl.cd = {}; G.pl.act = 0; useSkill(1); T.run(1); T.ok(G.mins.length && G.mins[0].maxLife >= 90, '骷髏生命沒有變厚');
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
      enterMap(2); T.quiet(); G.pl.cd = {}; G.pl.act = 0; G.pl.mana = 999; useSkill(1); T.run(0.3); const mn = G.mins.find(x => x.mtype === 'skel'); T.ok(mn, '沒召出骷髏');
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
        G._stagePlan = { i: 1, n: 3 }; const w = genMap(tier); G._stagePlan = null; const W = w.W, g = w.grid;
        const s = Math.floor(w.start.y + w.start.h / 2) * W + Math.floor(w.start.x + w.start.w / 2), seen = new Uint8Array(g.length), q = [s]; seen[s] = 1;
        while (q.length) { const i = q.pop(); for (const d of [1, -1, W, -W]) { const j = i + d; if (j >= 0 && j < g.length && !seen[j] && g[j]) { seen[j] = 1; q.push(j); } } }
        let miss = 0; for (let i = 0; i < g.length; i++) if (g[i] && !seen[i]) miss++;
        T.ok(!miss, `${w.theme.name || w.theme.id}有 ${miss} 格走不到`);
      }
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
