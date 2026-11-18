// =============================================================
//  營地人物分工：以前格倫、薇薇、莫、卡爾、國王按 F 都是打開同一本日誌，現在各有各的事
//  ・薇薇：照舊打開日誌（記憶與怪物圖鑑）　・國王：帶話任務（errands.js）
//  ・格倫：說下一個看守者是誰、在第幾夜、怕什麼（別的模組可以 GLEN_HOOKS.push(P => 文字或 null) 搶先說話）
//  ・卡爾：「陪你打一區」——答應後，下一張夢的第一區多一個戰鬥夥伴（卡爾本人的樣子，生命、傷害約你的一半，換區就回營地）
//  ・莫：海風驛站碼頭邊多一個釣魚點（莫的右邊）。每去夢裡走一趟回來，可以拋竿一次（按 F）
//    浮標晃一晃 → 驚嘆號 → 拉起來：90% 釣到「上一個我」的遺物＝一句話（20 句，寫進日誌「莫釣到的話」）＋一件隨機裝備（物品等級＝你的等級）
//    10% 釣到一隻黃色精英怪跳上岸（在營地打，怪物等級＝你的等級）
//  ・資料：G.P.fish = { ok: 能不能拋竿, n: 拋過幾次, got: [釣到的句子序號] }；G.P.karlGo＝下一張夢卡爾要跟
// =============================================================
const GLEN_HOOKS = [];
const FISH_LINES = [
  [12, '第三夜的冰很滑。下一個我，穿好一點的鞋。'], [131, '今天又放棄了。對不起。'], [96, '歐莉的冊子越來越薄。我不敢問為什麼。'],
  [44, '大白的項圈還在雪裡。我沒有勇氣撿。'], [5, '如果你讀到這張紙，代表我又睡著了。'], [77, '火球術沒有想像中好用。別學我。'],
  [103, '我數過牆上的字。數到一半就哭了。'], [58, '格倫扛我回來的時候在哼歌。很難聽。'], [120, '諾娃問我怕不怕黑。我說怕。她就更亮了一點。'],
  [23, '把裝備放回木箱的時候，記得擦乾淨。'], [88, '我試過不睡。結果夢自己來找我。'], [31, '小雀送我一顆石頭。我把它藏在左邊口袋。'],
  [67, '別相信退潮。瑟琳說得對。'], [109, '第五夜的草原很美。可惜我一直在逃。'], [72, '卡爾一直跟在後面。我假裝沒看見，因為不敢回頭。'],
  [114, '這一次我走到第八夜了。比上次多一夜。'], [136, '國王的影子對我說謝謝。我不知道該回什麼。'], [2, '守門人不是英雄。只是一個不敢醒來的人。'],
  [49, '下一個我，替我喝一碗茵的苦湯。真的很苦。'], [137, '我把名字忘了。希望你還記得你的。'],
];
const fishState = P => P.fish || (P.fish = { ok: true, n: 0, got: [] });
Hook.on('start', P => { fishState(P); G.fishAnim = null; });
Hook.on('enterMap', () => { const P = G.P; if (P) fishState(P).ok = true; });

// —— 格倫：看守者 ——
function glenWarden(P) {
  for (const f of GLEN_HOOKS) { const s = f(P); if (s) return s; }
  for (let t = 1; t <= ENDING_TIER; t++) {
    const th = THEMES[t - 1], b = th && BOSSES[th.boss]; if (!b || (P.bossKills[th.boss] || 0) > 0) continue;
    const res = b.res || {}, ks = Object.keys(RES_NAME), lo = Math.min(...ks.map(k => res[k] || 0)), hi = Math.max(...ks.map(k => res[k] || 0));
    const weak = ks.filter(k => (res[k] || 0) === lo && lo < 0).map(k => RES_NAME[k]), strong = ks.filter(k => (res[k] || 0) === hi && hi >= 40).map(k => RES_NAME[k]);
    return `「下一個看守者是「${b.name}」，在第 ${t} 夜的${th.name}最深處。」\n\n「${weak.length ? `牠怕${weak.join('、')}。` : '牠沒有特別怕什麼，硬打吧。'}${strong.length ? `${strong.join('、')}對牠沒什麼用。` : ''}」${b.note ? `\n\n（${b.note}）` : ''}`;
  }
  return '「主線的看守者，你都送走了。」\n\n「深層的夢還會長出新的。我會繼續巡邏，你也小心。」';
}
Talk.add(id => {
  if (id !== 'jailer' && id !== 'v_glen') return false;
  gameNote(`老獄卒．格倫：\n${glenWarden(G.P)}`);
  return true;
});
// —— 薇薇：圖鑑（打開日誌的第一頁） ——
Talk.add(id => { if (id === 'vivi' && typeof JournalTabs !== 'undefined') JournalTabs.cur = 'main'; return false; });

// —— 卡爾：陪你打一區 ——
Talk.add(id => {
  if (id !== 'karl') return false;
  const P = G.P;
  if (P.karlGo) { UI.msg('卡爾：「我準備好了。您一進夢，我就跟上。」', '#e8d8a0'); return true; }
  gameAsk('迷途騎士．卡爾：\n「守門人大人，下一張夢讓我跟著吧。」\n「至少第一區，我替您擋在前面。」\n\n（下一張夢的第一區，卡爾會跟你一起打；換區他就回營地）', () => {
    P.karlGo = true; saveGame(); UI.msg('卡爾：「遵命。這一次，我要走在大人前面。」', '#e8d8a0');
  }, { yes: '一起走', no: '不用了' });
  return true;
});
function karlStats() {
  const S = G.S, c = (G.slotCalc || []).find(x => x && x.d) || null;
  let avg = 0; if (c) for (const k in c.d) { const v = c.d[k]; if (Array.isArray(v)) avg += (v[0] + v[1]) / 2; }
  const rate = c && c.time ? Math.min(3, 1 / c.time) : 1.2;
  avg = Math.max(avg, 4 + G.P.lvl * 0.6);   // 技能欄沒有傷害技能（例如只帶召喚）時的保底
  return { life: Math.round(S.maxLife * 0.5), hit: avg * 0.5, aps: rate };
}
Hook.on('enterMap', () => {
  const P = G.P, pl = G.pl; if (!P || !P.karlGo || !G.world || G.world.kind !== 'map') return;
  P.karlGo = false;
  const k = karlStats(), p = randomFloorNear(pl.x + 30, pl.y, 30);
  G.mins.push({ kind: 'min', mtype: 'karl', sprite: 'npc_karl', karl: true, home: G.world, x: p.x, y: p.y, r: 12, life: k.life, maxLife: k.life,
    dmg: [k.hit * 0.85, k.hit * 1.15], aps: k.aps, atkCD: 0.4, facing: 1, flash: 0, speed: 210, count: 1 });
  UI.msg('卡爾：「跟緊我，守門人大人。」（第一區結束前，卡爾都會跟著你）', '#e8d8a0');
});
Hook.on('update', () => {
  const k = G.mins.find(m => m.karl); if (!k) return;
  if (k.home !== G.world) { G.mins.splice(G.mins.indexOf(k), 1); UI.msg('卡爾：「前面的路，請您自己走。我在營地等您。」', '#e8d8a0'); }
  else if (k.life <= 1) { G.mins.splice(G.mins.indexOf(k), 1); UI.msg('卡爾倒下了……他化成光，先回營地去了。', '#e8d8a0'); }
});
Hook.on('drawOver', g => { const k = G.mins.find(m => m.karl); if (k) txt(g, '卡爾', k.x, k.y - 44, 11, '#e8d8a0', 'center'); });

// —— 莫：釣竿 ——
function fishSpot(w) {
  if (!w || w.kind !== 'town' || w.hub !== 'harbor') return null;
  if (w.fishSpot === undefined) { const mo = (w.npcs || []).find(n => n.id === 'mo'); w.fishSpot = mo ? Object.assign(nearestFloor(mo.x + 64, mo.y + 8), { fish: true }) : null; }
  return w.fishSpot;
}
Interact.add('fish', (pl, w) => { const s = fishSpot(w); return s && !G.fishAnim ? [{ ref: s, label: fishState(G.P).ok ? '拋竿' : '看看水面', r: 56 }] : null; }, s => {
  const P = G.P, F = fishState(P);
  if (!F.ok) { UI.msg('莫：「一趟夢只釣一次。去夢裡走一趟再回來，魚才會回來。」', '#e8d8a0'); return; }
  F.ok = false; F.n++; saveGame();
  G.fishAnim = { t: 0, x: s.x, y: s.y, wait: 1.4 + Math.random() * 1.2, world: G.world };
  Sfx.play('click');
});
function fishResult(a) {
  const P = G.P, F = fishState(P), pl = G.pl;
  if (Math.random() < 0.1) {   // 精英怪跳上岸
    const th = THEMES.find(t => t.id === 'beach'), type = pick(th.monsters.filter(k => !MONSTERS[k].ranged)), p = randomFloorNear(a.x, a.y + 30, 30);
    const m = makeMonster(type, p.x, p.y, Math.max(1, P.lvl), 'rare', th);
    m.aggro = true; G.mons.push(m); burst(p.x, p.y, '#9fd8ff', 30, 220);
    UI.banner('有東西跳上岸了！', `${m.name}——在營地打倒牠`, '#ffff77'); Sfx.play('rare');
    return;
  }
  const left = FISH_LINES.map((_, i) => i).filter(i => !F.got.includes(i)), i = left.length ? pick(left) : rint(0, FISH_LINES.length - 1);
  if (!F.got.includes(i)) F.got.push(i);
  const [no, line] = FISH_LINES[i], it = randomItem(Math.max(1, P.lvl), 2), j = P.inv.indexOf(null);
  if (j >= 0) P.inv[j] = it; else dropLoot(pl.x, pl.y, { item: it });
  UI.banner('釣到了上一個我的遺物', `第 ${no} 個我：「${line}」`, '#9fd8ff');
  UI.msg(`莫：「是上一個你留下的。」釣到 ${it.name}${j >= 0 ? '（放進背包了）' : '（背包滿了，掉在腳邊）'}`, '#e8d8a0');
  if (F.got.length === FISH_LINES.length && !F.allMsg) { F.allMsg = true; UI.msg('莫：「霧裡的話，你都撈上來了。」', '#e8d8a0'); }
  saveGame(); UI.refreshInv();
}
Hook.on('update', dt => {
  const a = G.fishAnim; if (!a) return;
  if (a.world !== G.world) { G.fishAnim = null; return; }
  a.t += dt;
  if (!a.bit && a.t > 0.5 + a.wait) { a.bit = true; Sfx.play('click'); }
  if (a.t > 0.5 + a.wait + 1.4) { G.fishAnim = null; fishResult(a); }
});
Hook.on('drawWorld', g => {
  const w = G.world, s = fishSpot(w); if (!s) return;
  const t = G.time, a = G.fishAnim, P = G.P;
  // 一小塊水和木頭棧板（還沒有美術圖：先用程式畫）
  g.save();
  g.fillStyle = 'rgba(40,90,130,0.85)'; g.beginPath(); g.ellipse(s.x, s.y, 30, 14, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = `rgba(180,220,255,${0.35 + 0.15 * Math.sin(t * 2)})`; g.lineWidth = 1; g.beginPath(); g.ellipse(s.x, s.y, 22 + Math.sin(t * 1.5) * 3, 9, 0, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#6a4a2a'; g.fillRect(s.x - 40, s.y - 4, 12, 3); g.fillRect(s.x - 40, s.y + 1, 12, 3);
  if (!a) {   // 立著的竿子
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(s.x - 34, s.y + 2); g.lineTo(s.x - 22, s.y - 30); g.stroke();
    if (P && fishState(P).ok) txt(g, '釣魚點', s.x, s.y + 22, 10, '#9fd8ff', 'center');
  } else {
    const pl = G.pl, cast = Math.min(1, a.t / 0.5), reel = a.bit ? Math.max(0, (a.t - 0.5 - a.wait - 0.8) / 0.6) : 0;
    let bx = s.x + 6, by = s.y;
    if (a.bit && reel === 0) by += Math.sin(t * 30) * 3 + 3;            // 咬鉤：浮標往下沉、亂抖
    else if (!a.bit) by += Math.sin(t * 4) * 1.5;                     // 等待：輕輕晃
    bx = pl.x + (bx - pl.x) * (1 - reel); by = pl.y - 10 + (by - pl.y + 10) * (1 - reel);
    const tipX = pl.x + 10, tipY = pl.y - 34;
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(pl.x, pl.y - 6); g.lineTo(tipX, tipY); g.stroke();
    const ex = tipX + (bx - tipX) * cast, ey = tipY + (by - tipY) * cast - Math.sin(cast * Math.PI) * 30;
    g.strokeStyle = 'rgba(230,230,230,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(tipX, tipY); g.quadraticCurveTo((tipX + ex) / 2, Math.min(tipY, ey) - 10, ex, ey); g.stroke();
    g.fillStyle = '#ff5040'; g.beginPath(); g.arc(ex, ey - 2, 3, Math.PI, 0); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex, ey - 2, 3, 0, Math.PI); g.fill();
    if (a.bit && reel === 0) txt(g, '！', bx, by - 22 + Math.sin(t * 12) * 2, 20, '#ffd040', 'center');
  }
  g.restore();
});
// 日誌：莫釣到的話
JournalTabs.add('fish', '莫釣到的話', () => {
  const F = fishState(G.P);
  let h = `<div class="csec">莫釣到的話　<span class="thint">在海風驛站莫的旁邊拋竿，每去夢裡一趟可以釣一次（${F.got.length} / ${FISH_LINES.length}）</span></div>`;
  h += F.got.length ? F.got.slice().sort((a, b) => FISH_LINES[a][0] - FISH_LINES[b][0]).map(i => `<div class="jent"><b>第 ${FISH_LINES[i][0]} 個我</b><div>「${FISH_LINES[i][1]}」</div></div>`).join('') : '<div class="skd">還沒有釣到。霧裡漂著上一個你留下的話。</div>';
  return h;
});
// 莫本人：說句話、提醒釣竿（不再打開日誌）
Talk.add(id => {
  if (id !== 'mo') return false;
  const F = fishState(G.P);
  UI.msg(`老漁夫．莫：${F.ok ? '「旁邊那根竿子借你，往霧裡拋。」（走到莫右邊的釣魚點' + ctlText('{interact}', true) + '）' : pick(NPC_LINES.mo)}`, '#e8d8a0');
  return true;
});
