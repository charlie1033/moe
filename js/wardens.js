// =============================================================
//  看守者抉擇（主線 10 隻看守者，在首領巢穴裡；主線和深層夢境重打都一樣）
//  玩家看到：
//   ① 進巢穴：跟這隻看守者有關係的人講一段故事（第一次才講完整的，之後只說一句），提出請託
//      接下請託＝開始試煉（選修，失敗不扣東西）：銅＝這一場沒死過 → 1 片殘片；金＝那個人的條件（見 wardentext.js）→ 3 片
//      金檔要「打完全程」才算（選和解那條路）；畫面上方即時顯示兩個條件還成不成立
//   ② 看守者打到 50% 生命：無敵 1 秒、講一句台詞（大橫幅）、身體變大
//   ③ 接著遊戲暫停，三選一：
//      和解（喊名字）＝牠停手 5 秒（這 5 秒打不動），然後換成第二階段的打法、傷害 ×1.25、更快 → 打贏掉信物（只有這條路有）
//      了結＝戰鬥立刻結束（看守者死亡），多掉一批寶物（mapLoot 8 件、保底 2 件黃裝）
//      放走＝戰鬥結束、這一場不掉任何東西，但第一次選放走時，營地多一個角色（見 wardenplus.js）
//      第一次的選擇永久記在角色上（營地、人物對話以第一次為準），也記進第一百三十八本冊子；重打可以選別的
//   ④ 打倒時專屬傳奇沒掉 → 1 片保底殘片（放走那條路沒有）；殘片 10 片跟歐莉換專屬傳奇（wardenplus.js）
//  做法：首領的生命用 getter/setter 鎖在 50%（不包裝任何全域函式），轉場前怎麼打都不會跳過轉場
//        「放走」時暫時把 dropLoot 換成空函式、呼叫完馬上換回來（只在那一瞬間，讓看守者照常算擊敗、解鎖下一夜但不掉東西）
//  資料：角色 P.wardens = { first: {看守者: 'name'|'kill'|'free'}, runs: {看守者: {name, kill, free}}, met: {看守者: 1}, gifts: {} }
//        這一場的狀態 G.world.wd（跟著地圖存檔；不存首領本身，每格用 boss 代號找）
//  接點：Hook 'start'、'update'、'kill'、'drawWorld'；第二階段招式 BOSS_ABILITIES['w2_代號']（wardenplus.js）
// =============================================================
Hook.on('start', P => { P.wardens = P.wardens || {}; for (const k of ['first', 'runs', 'met', 'gifts']) P.wardens[k] = P.wardens[k] || {}; });
const wdBoss = wd => G.mons.find(m => m.boss === wd.id && !m.twin && !m.dead);
let wPaused = false;
function wPause(on) {
  if (on) { wPaused = true; UI.storyOpen = true; if (typeof input !== 'undefined') { input.keys = {}; input.l = input.r = false; } }
  else if (wPaused) { wPaused = false; UI.storyOpen = false; if (UI.storyQ.length) UI.nextStory(); }
}
// 共用的選擇視窗（手機可以點；鍵盤 1／2／3）：opts = [{ label, desc, dis }]，選了呼叫 cb(第幾個)；cancel＝有「取消」按鈕
function wChoose(title, sub, opts, cb, cancel) {
  let box = document.getElementById('wchoose');
  if (!box) {
    box = document.createElement('div'); box.id = 'wchoose';
    box.style.cssText = 'position:fixed;inset:0;z-index:5001;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6)';
    document.body.appendChild(box);
    const st = document.createElement('style'); st.textContent = `#wchoose .wc-card{max-height:calc(100vh - 32px);overflow:auto} #wchoose .wc-opt{display:block;width:100%;text-align:left;margin:8px 0 0;padding:9px 12px;font-size:14px;line-height:1.5;white-space:normal}
      #wchoose .wc-opt b{color:#ffe6a0;font-size:15px} #wchoose .wc-opt small{display:block;color:#cbbd9c;font-size:12.5px} #wchoose .wc-opt:disabled{opacity:.45} #wchoose .wc-t{font-size:17px;color:#ffd27a;margin-bottom:4px}`;
    document.head.appendChild(st);
  }
  box.innerHTML = `<div class="gask-card wc-card" style="max-width:min(480px, calc(100vw - 32px))"><div class="wc-t"></div><div class="gask-text" style="margin-bottom:4px"></div><div class="wc-list"></div></div>`;
  box.querySelector('.wc-t').textContent = title; box.querySelector('.gask-text').textContent = sub || '';
  const list = box.querySelector('.wc-list');
  const all = opts.concat(cancel ? [{ label: '取消', cancel: true }] : []);
  all.forEach((o, i) => { const bt = document.createElement('button'); bt.className = 'wc-opt'; bt.disabled = !!o.dis;
    bt.innerHTML = `<b>${o.cancel ? '' : (i + 1) + '. '}${o.label}</b>${o.desc ? `<small></small>` : ''}`; if (o.desc) bt.querySelector('small').textContent = o.desc;
    bt.onclick = () => done(o.cancel ? -1 : i); list.appendChild(bt); });
  const onKey = e => { e.stopPropagation(); e.preventDefault(); const n = +e.key; if (n >= 1 && n <= opts.length && !opts[n - 1].dis) done(n - 1); else if (e.key === 'Escape' && cancel) done(-1); };
  function done(i) { box.style.display = 'none'; window.removeEventListener('keydown', onKey, true); cb(i); }
  box.style.display = 'flex'; window.addEventListener('keydown', onKey, true);
}
const wName = s => s.replace(/\{name\}/g, G.P.name);
// —— 首領的生命鎖：b.wLock 有值時，生命不會低於它 ——
function wLockLife(b) {
  if (b._wInst) return; b._wInst = true;
  let life = b.life;
  Object.defineProperty(b, 'life', { configurable: true, enumerable: true, get() { return life; }, set(v) { life = this.wLock != null ? Math.max(v, this.wLock) : v; } });
}
function wHold(b, wd) {   // 轉場、停手時：不動、不出招
  b.casting = null; b.dash = 0; b.x = wd.hx; b.y = wd.hy; for (const k in b.cds) b.cds[k] = 99;
}
const wRelease = b => { for (const k in b.cds) b.cds[k] = 1 + Math.random(); };
// —— 金檔條件 ——
function wGoldOk(wd) {
  const g = WARDEN_TEXT[wd.id].gold;
  return g.k === 'time' ? wd.t <= g.n : g.k === 'nosig' ? !wd.sigHit : g.k === 'hp' ? !wd.low : !wd.flask;
}
function wHud(wd) {
  if (!wd || !wd.trial || wd.stage === 'done') return mechHud('wardHud', 146, '#ffe6a0', '');
  const g = WARDEN_TEXT[wd.id].gold, ok = v => v ? '✔' : '✘';
  let gt = g.k === 'time' ? `${g.n} 秒內打倒（還剩 ${Math.max(0, Math.ceil(g.n - wd.t))} 秒）` : g.text.replace(/（.*）$/, '');
  if (wd.path && wd.path !== 'name') gt += '（沒有打完全程）';
  mechHud('wardHud', 146, '#ffe6a0', `目標（選修）請託試煉　銅：不死通過 ${ok(!wd.died)}　　金：${gt} ${ok(wGoldOk(wd) && (!wd.path || wd.path === 'name'))}`);
}
// —— ① 進巢穴：請託 ——
function wAsk(wd) {
  const T = WARDEN_TEXT[wd.id], P = G.P, bn = BOSSES[wd.id].name, have = wShardHave(wd.id), f = P.wardens.first[wd.id], pr = T.pr || '牠';
  wd.stage = 'asking';
  const txt = `${T.who}的請託\n${T.ask}\n\n請託試煉（選修，失敗不會扣任何東西）：\n・銅：這一場不死通過 → 1 片殘片\n・金：${T.gold.text} → 再 3 片（要選「和解」打完全程才算）\n\n「${bn}的殘片」10 片可以跟歐莉換一件${pr}的專屬傳奇（目前 ${have} 片）。` +
    (f ? `\n\n你第一次面對${pr}時選了「${WCHOICE_NAME[f]}」。這次可以選別的、拿別的獎勵。` : `\n\n${pr}的生命打到一半時，你要從「和解」「了結」「放走」裡選一個。`);
  gameAsk(txt, () => { wd.trial = true; wd.stage = 'fight'; UI.msg('接下了請託：試煉開始', '#ffe6a0'); }, { yes: '接下請託', no: '不用了', onNo: () => { wd.stage = 'fight'; }, goal: [`打倒${bn}`, { opt: true, t: `${T.gold.text.replace(/（.*）$/, '')}（金）・不死通過（銅）` }] });   // v2.20 底下的「目標」（goals.js）
}
// v2.20 進巢穴的請託故事：最後一頁寫「目標：打倒看守者」（goals.js）
Goal.add(key => key.startsWith('wreq_') && BOSSES[key.slice(5)] ? { t: `打倒${BOSSES[key.slice(5)].name}` } : null);
// —— ② 半血轉場 ——
function wTrans(b, wd) {
  const T = WARDEN_TEXT[wd.id], w = G.world;
  wd.stage = 'trans'; wd.invT = 1; wd.hx = b.x; wd.hy = b.y; b.wLock = b.life;
  G.teles = []; G.projs = G.projs.filter(p => p.team === 'ally'); if (w.haz) { w.haz.pend = []; w.haz.t = 4; }
  b.scale = (b.scale || 3) * 1.15; b.flash = 0.3; G.shake = 10; Sfx.play('bossroar'); burst(b.x, b.y, '#ffd27a', 50, 260);
  G.fx.push({ k: 'ring', x: b.x, y: b.y, r: 160, t: 0, dur: 0.6, color: '#ffe6a0', fill: 'rgba(255,220,140,0.15)' });
  UI.banner(wName(T.half), T.halfSub, '#ff9a6a');   // v2.18.2 轉場台詞只在畫面中間偏上大字出現一次（拿掉頭上那行重複的字）
}
// —— ③ 三選一 ——
function wOpenChoice(b, wd) {
  const T = WARDEN_TEXT[wd.id], P = G.P, f = P.wardens.first[wd.id];
  wd.stage = 'choice'; wPause(true);
  const keys = ['name', 'kill', 'free'], lab = { name: T.ch.name, kill: wKillOpt(wd.id), free: T.ch.free }, pr = T.pr || '牠';
  const tag = k => lab[k][0].includes(WCHOICE_NAME[k]) ? lab[k][0] : `${lab[k][0]}（${WCHOICE_NAME[k]}）`;   // v2.18.2 按鈕後面標出是哪一條路（請託寫的「和解」對得上）
  const sub = (f ? `你第一次面對${pr}時選了「${WCHOICE_NAME[f]}」（營地和人物的變化以那次為準）。這次可以選別的、拿別的獎勵。` : `這是你第一次面對${pr}：第一次的選擇會寫進冊子，營地和人物也會跟著變。之後重打，可以選別的。`);
  wChoose(`${b.name}停下來了`, sub, keys.map(k => ({ label: tag(k), desc: lab[k][1] })), i => {
    const c = keys[i];
    wChoose(lab[c][0], T.out[c], [{ label: '繼續' }], () => { wPause(false); wPick(c, wd); });
  });
}
function wPick(c, wd) {
  const b = wdBoss(wd), P = G.P, T = WARDEN_TEXT[wd.id]; if (!b) return;
  wd.path = c;
  const R = P.wardens.runs[wd.id] = P.wardens.runs[wd.id] || {}; R[c] = (R[c] || 0) + 1;
  if (!P.wardens.first[wd.id]) {
    P.wardens.first[wd.id] = c;
    if (typeof Book138 !== 'undefined') Book138.note('choice', `${b.name}：我選了「${WCHOICE_NAME[c]}」——${T.ch[c] ? T.ch[c][0] : WARDEN_KILL[0]}。`);
    if (typeof wApplyLines === 'function') wApplyLines(P);
    UI.msg(`${T.who}的故事有新的一章（營地裡找${T.who}聊聊）`, '#ffd27a');
  }
  if (c === 'name') { wd.stage = 'stop'; wd.stopT = 5; G.texts.push({ x: b.x, y: b.y - 80, txt: '……', color: '#ffffff', size: 20, t: 0, dur: 4.5 }); }
  else {
    wd.stage = 'end'; b.wLock = null;
    G.fx.push({ k: 'slash', x: b.x, y: b.y, ang: -0.6, r: 140, arc: 2.4, t: 0, dur: 0.3, color: '#ffffff' });
    if (c === 'free') {
      const keep = dropLoot, fx0 = G.fx.length; dropLoot = () => { };
      try { b.life = 0; killMonster(b); } finally { dropLoot = keep; }
      G.fx = G.fx.filter((f, i) => i < fx0 || f.k !== 'corpse'); burst(b.x, b.y, '#d8f0ff', 40, 200);
      UI.banner('你放牠走了', '這一場不掉寶物', '#bfe8ff');
    } else { b.life = 0; killMonster(b); }
  }
  saveGame();
}
function wPhase2(b, wd) {
  wd.stage = 'p2'; b.wLock = null; wRelease(b);
  const key = 'w2_' + wd.id;
  b.def = Object.assign({}, b.def, { ai: BOSS_ABILITIES[key] ? key : (b.def.ai || b.boss), cdMult: (b.def.cdMult || 1) * 0.75 });
  b.dmg = b.dmg.map(v => v * 1.25); b.speed *= (WARDEN_P2[wd.id] && WARDEN_P2[wd.id].spd || 1) * 1.15;
  G.shake = 8; Sfx.play('bossroar'); UI.banner(`${b.name}：最後的力氣`, '換打法了・看預警圈躲開', '#ff7050');   // v2.18.2 不再重複轉場那句
}
// —— 每格 ——
Hook.on('update', dt => {
  const w = G.world, P = G.P;
  if (!w || !P || !w.bossRoom) { mechHud('wardHud', 146, '#ffe6a0', ''); return; }
  let wd = w.wd;
  if (!wd) { const b0 = G.mons.find(m => m.boss && !m.twin && WARDEN_TEXT[m.boss]); if (!b0) return; wd = w.wd = { id: b0.boss, stage: 'init', t: 0 }; }
  const b = wdBoss(wd);
  if (G.dead) wd.died = true;
  if (b && !b._wInst) { wLockLife(b); if (!wd.path) { b.wLock = Math.ceil(b.maxLife * 0.5); if (['trans', 'choice', 'stop'].includes(wd.stage)) wd.stage = 'fight'; if (['asking', 'story'].includes(wd.stage)) wd.stage = 'ask'; } else if (wd.stage === 'stop' || wd.stage === 'p2') wPhase2(b, wd); }
  if (wd.stage === 'init') { if (!P.wardens.met[wd.id]) { P.wardens.met[wd.id] = 1; UI.queueStory('wreq_' + wd.id); wd.stage = 'story'; } else wd.stage = 'ask'; }
  if (wd.stage === 'story' && !UI.storyOpen) wd.stage = 'ask';
  if (wd.stage === 'ask' && !UI.paused()) wAsk(wd);
  wHud(wd);
  if (!b || UI.paused() || G.dead) return;
  const pl = G.pl;
  // 試煉紀錄：打的時間（轉場、停手不算）、喝藥（藥劑充能變少）、生命
  if (b.awake && (wd.stage === 'fight' || wd.stage === 'p2')) wd.t += dt;
  const fl = (pl.fl || []).reduce((s, f) => s + (f ? f.c : 0), 0);
  if (wd.fl != null && fl < wd.fl - 0.01 && b.awake) wd.flask = true; wd.fl = fl;
  const T = WARDEN_TEXT[wd.id];
  if (b.awake && T.gold.k === 'hp' && G.S && pl.life < G.S.maxLife * T.gold.n / 100 && wd.stage !== 'end') wd.low = true;
  if (wd.stage === 'fight' && b.life <= b.maxLife * 0.5 + 0.5) wTrans(b, wd);
  else if (wd.stage === 'trans') { wHold(b, wd); if ((wd.invT -= dt) <= 0) wOpenChoice(b, wd); }
  else if (wd.stage === 'stop') { wHold(b, wd); if ((wd.stopT -= dt) <= 0) wPhase2(b, wd); }
});
// 第二階段：腳下一圈脈動的光，看得出牠換打法了
Hook.on('drawWorld', g => {
  const w = G.world, wd = w && w.wd; if (!wd || !['p2', 'stop', 'trans'].includes(wd.stage)) return;
  const b = wdBoss(wd); if (!b) return;
  const p = 0.5 + 0.5 * Math.sin(G.time * 6);
  g.save(); g.globalAlpha = 0.35 + 0.3 * p; g.strokeStyle = wd.stage === 'p2' ? '#ff5030' : '#ffe6a0'; g.lineWidth = 3;
  g.beginPath(); g.ellipse(b.x, b.y + b.r * 0.6, b.r * 1.6 + p * 6, b.r * 0.7 + p * 3, 0, 0, Math.PI * 2); g.stroke(); g.restore();
});
// —— ④ 打倒之後：殘片、信物、多掉的寶物 ——
Hook.on('kill', m => {
  if (!m.boss || !WARDEN_TEXT[m.boss] || m.twin) return;
  const w = G.world, wd = w && w.wd && w.wd.id === m.boss ? w.wd : null, id = m.boss, bn = BOSSES[id].name;
  let n = 0; const why = [];
  const path = wd && wd.path;
  if (path !== 'free') {
    const got = G.loot.some(l => !l.gone && l.item && l.item.uniqueId && UNIQUE_BY_ID[l.item.uniqueId] && UNIQUE_BY_ID[l.item.uniqueId].boss === id);
    if (!got) { n++; why.push('專屬傳奇沒掉'); }
  }
  if (wd && wd.trial) {
    if (!wd.died) { n++; why.push('銅：不死通過'); }
    if (path === 'name' && wGoldOk(wd)) { n += 3; why.push('金：' + WARDEN_TEXT[id].gold.text.replace(/（.*）$/, '')); }
  }
  if (path === 'name') { const it = wTokenItem(id, m.mlvl); if (it) dropLoot(m.x, m.y, { item: it }); }
  if (path === 'kill') mapLoot(m.x, m.y, { n: 8, rare: 2, bonus: 6, ilvl: m.mlvl });
  if (wd) wd.stage = 'done';
  if (n) { wShardAdd(id, n); UI.msg(`得到 ${bn}的殘片 ×${n}（${why.join('、')}）・現在 ${wShardHave(id)} / 10 片`, '#ffd27a'); }
  mechHud('wardHud', 146, '#ffe6a0', '');
  saveGame();
});
