// =============================================================
//  v2.8.7 地圖事件
//  ・主線：每一夜（3 區合計）只有 1 個事件；深層夢境：每一區 1～3 個（第 11～14 夜 1 個、15～18 夜 2 個、19 夜起 3 個）
//  ・祝福神殿（5 種）：靠近按 F，30 秒強化
//      力量＝傷害 +40%　疾風＝攻擊、施法、移動速度 +25%　鋼鐵＝受到的傷害 −35%　回春＝每秒回 4% 生命和魔力　洞察＝暴擊率 +120%
//  ・深淵裂口：按 F 打開，裂口湧出 3 波怪物（比地圖高 1 級），全部清掉後掉一堆寶物（深層夢境還可能掉天賦珠寶）
//  ・精髓水晶：裡面封著一隻黃色精英怪，按 F 打碎放出來；牠特別耐打，但一定掉一件高等黃裝和通貨
//  ・瞻望之柱：按 F 凝視，預言三選一（v2.17，規則在 prophecy.js；原本的開全圖拿掉了）
// =============================================================
const SHRINES = {
  might: { name: '力量神殿', color: '#ff7050', text: '傷害 +40%' },
  haste: { name: '疾風神殿', color: '#7ae0ff', text: '攻擊、施法、移動速度 +25%' },
  iron: { name: '鋼鐵神殿', color: '#c8c8d8', text: '受到的傷害 −35%' },
  renew: { name: '回春神殿', color: '#7aff9a', text: '每秒回復 4% 生命和魔力' },
  insight: { name: '洞察神殿', color: '#ffe070', text: '暴擊率 +120%' },
};
const EV_NAME = { shrine: '祝福神殿', abyss: '深淵裂口', essence: '精髓水晶', vision: '瞻望之柱', tide: '夢潮裂隙', rite: '獻祭圈', mist: '迷霧' };
const SHRINE_DUR = 30;
const EV_START = {};   // v2.10 新事件在自己的檔案裡登記：EV_NAME.x＝名稱、EV_LABEL.x＝按 F 的字、EV_START.x＝啟動時做的事
function eventCountFor(w) {
  if (!w.stage || w.arena) return 0;
  if (w.tier < DEEP_TIER) return G.curNight && G.curNight.evStage === w.stage.i ? 1 : 0;
  return Math.min(3, 1 + Math.floor((w.tier - DEEP_TIER) / 4));
}
function placeEvents(w) {
  const n = eventCountFor(w); w.events = [];
  const rooms = (w.others || []).slice().sort(() => Math.random() - 0.5);
  for (const r of rooms) {
    if (w.events.length >= n) break;
    for (let t = 0; t < 30; t++) {
      const x = rint(r.x + 2, r.x + r.w - 3), y = rint(r.y + 2, r.y + r.h - 3);
      let ok = true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!w.grid[(y + dy) * w.W + x + dx]) ok = false;
      if (!ok) continue;
      const kinds = w.tier >= DEEP_TIER ? ['shrine', 'abyss', 'essence', 'vision', 'shrine'] : ['shrine', 'abyss', 'essence', 'vision'];
      const fresh = kinds.filter(k => !w.events.some(e => e.kind === k)), kind = pick(fresh.length ? fresh : kinds);
      const ev = { kind, x: x * TS + 16, y: y * TS + 16, done: false };
      if (kind === 'shrine') ev.type = pick(Object.keys(SHRINES));
      if (kind === 'essence') ev.mon = pick(w.theme.monsters || ['skeleton']);
      w.events.push(ev); break;
    }
  }
}
const _fixupEV = stageFixup;
stageFixup = function (w) { _fixupEV(w); try { placeEvents(w); } catch (e) { } Hook.emit('stage', w); };   // v2.10 'stage'：這一區的怪和事件都放好之後
const _enterEV = enterMap;
enterMap = function (tier) { G.curNight = { tier, evStage: rint(1, 3) }; return _enterEV(tier); };

// —— 啟動事件 ——
function activateEvent(ev) {
  const w = G.world; if (ev.done) return;
  ev.done = true; Sfx.play('portal');
  if (ev.kind === 'shrine') {
    const S = SHRINES[ev.type]; G.shrine = { type: ev.type, t: SHRINE_DUR }; onBuildChanged();
    UI.banner(S.name, `${S.text}（${SHRINE_DUR} 秒）`, S.color);
    G.fx.push({ k: 'ring', x: G.pl.x, y: G.pl.y, r: 90, t: 0, dur: 0.6, color: S.color, fill: S.color + '33' });
  } else if (ev.kind === 'abyss') {
    ev.wave = 0; ev.next = 0.5; ev.mobs = []; ev.active = true;
    UI.banner('深淵裂口', '撐過 3 波從裂口湧出的怪物', '#b070ff');
  } else if (ev.kind === 'essence') {
    const L = w.mlvl + 2, m = makeMonster(ev.mon, ev.x, ev.y, L, 'rare', w.theme);
    if (m) { m.maxLife *= 2; m.life = m.maxLife; m.essence = true; m.aggro = true; m.name = '精髓・' + m.name; G.mons.push(m); }
    burst(ev.x, ev.y, '#c0f0ff', 30, 200); G.shake = Math.max(G.shake, 5);
    UI.banner('精髓水晶碎了', '打倒被封印的精英，牠一定會掉寶', '#9ae8ff');
  } else if (EV_START[ev.kind]) { EV_START[ev.kind](ev);   // v2.10 別的模組登記的事件（夢潮裂隙、獻祭圈、迷霧）
  } else if (ev.kind === 'vision') {
    if (typeof visionProphecy === 'function') visionProphecy(ev);   // v2.17 預言三選一（prophecy.js）
  }
  saveGame();
}
Hook.on('update', dt => {
  const w = G.world, pl = G.pl; if (!w || !pl) return;
  // 神殿效果倒數
  if (G.shrine) {
    G.shrine.t -= dt;
    if (G.shrine.type === 'renew') { pl.life = Math.min(G.S.maxLife, pl.life + G.S.maxLife * 0.04 * dt); pl.mana = Math.min(G.S.maxMana, pl.mana + G.S.maxMana * 0.04 * dt); }
    if (G.shrine.t <= 0) { G.shrine = null; onBuildChanged(); }
  }
  if (!w.events) return;
  // 深淵：一波一波出怪
  for (const ev of w.events) if (ev.kind === 'abyss' && ev.active) {
    ev.mobs = (ev.mobs || []).filter(m => !m.dead && G.mons.includes(m));
    if (ev.wave < 3 && (ev.next -= dt) <= 0 && ev.mobs.length < 4) {
      ev.wave++; ev.next = 4;
      const before = G.mons.length; spawnPack(ev.x + rnd(-40, 40), ev.y + rnd(-40, 40), w);
      for (let i = before; i < G.mons.length; i++) { const m = G.mons[i]; m.aggro = true; m.mlvl += 1; ev.mobs.push(m); }
      UI.msg(`深淵裂口：第 ${ev.wave} 波`, '#b070ff'); burst(ev.x, ev.y, '#8040c0', 20, 160);
    }
    if (ev.wave >= 3 && !ev.mobs.length) {
      ev.active = false; ev.cleared = true; const L = w.mlvl + 1;
      mapLoot(ev.x, ev.y, { n: 6, q: 20, r: 20, bonus: 4, rare: 1, ilvl: L });
      if (w.tier >= DEEP_TIER && typeof makeTreeJewel === 'function' && Math.random() < 0.25 * (1 + ((w.mm && w.mm.r) || 0) / 100)) dropLoot(ev.x, ev.y, { item: makeTreeJewel(L) });
      UI.banner('深淵裂口平息了', '裂口裡吐出了寶物', '#b070ff'); Sfx.play('unique');
    }
  }
});
const EV_LABEL = { tide: '撕開夢潮裂隙', rite: '開始獻祭', mist: '走進迷霧', abyss: '打開深淵裂口', essence: '打碎精髓水晶', vision: '凝視瞻望之柱', chest: '打開寶箱' };
Interact.add('mapev', (pl, w) => w.events ? w.events.filter(ev => !ev.done).map(ev => ({ ref: ev, label: ev.kind === 'shrine' ? `祈禱（${SHRINES[ev.type].name}）` : EV_LABEL[ev.kind] })) : null, ev => activateEvent(ev));
// 神殿效果套到能力上
const _csEV = computeStats;
computeStats = function (P) {
  const S = _csEV(P);
  if (G.shrine && G.P === P) {
    const t = G.shrine.type;
    if (t === 'might') S.dmg_inc = (S.dmg_inc || 0) + 40;
    if (t === 'haste') { S.aspd_inc = (S.aspd_inc || 0) + 25; S.cspd_inc = (S.cspd_inc || 0) + 25; S.moveSpeed = (S.moveSpeed || 0) * 1.25; }
    if (t === 'insight') S.crit_inc = (S.crit_inc || 0) + 120;
  }
  return S;
};
const _dmgEV = damagePlayer;
damagePlayer = function (parts, opts = {}) {
  if (G.shrine && G.shrine.type === 'iron' && Array.isArray(parts)) parts = parts.map(p => Array.isArray(p) ? [p[0] * 0.65, p[1]] : p);
  return _dmgEV(parts, opts);
};
// 精髓：死亡掉寶
Hook.on('kill', m => {
  if (m.essence) mapLoot(m.x, m.y, { n: 3, r: 50, bonus: 6, rare: 1, ilvl: m.mlvl + 2 });
});
// 畫：事件本體＋神殿效果提示
const _drawStageEV = drawStageExtras;
drawStageExtras = function (g) {
  _drawStageEV(g);
  const w = G.world; if (!w || !w.events) return;
  for (const ev of w.events) {
    const x = ev.x, y = ev.y, t = G.time;
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y + 14, 22, 7, 0, 0, Math.PI * 2); g.fill();
    if (typeof drawEventArt === 'function' && drawEventArt(g, ev)) { /* 美術工作階段畫好了 */ }
    else if (ev.kind === 'shrine') {
      const c = SHRINES[ev.type].color;
      g.fillStyle = '#5a5464'; g.fillRect(x - 12, y - 10, 24, 24); g.fillStyle = '#76707e'; g.fillRect(x - 15, y - 14, 30, 6); g.fillRect(x - 15, y + 12, 30, 5);
      if (!ev.done) { const gl = g.createRadialGradient(x, y - 26, 0, x, y - 26, 30); gl.addColorStop(0, c); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, y - 26, 30, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y - 26 + Math.sin(t * 3) * 3, 6, 0, Math.PI * 2); g.fill(); }
    } else if (ev.kind === 'abyss') {
      g.fillStyle = ev.cleared ? '#2a2030' : '#120818'; g.beginPath(); g.ellipse(x, y, 34, 12, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = ev.cleared ? '#5a4a6a' : `rgba(180,110,255,${0.6 + 0.3 * Math.sin(t * 4)})`; g.lineWidth = 3; g.stroke();
      if (!ev.cleared && Math.random() < 0.3) G.parts.push({ x: x + rnd(-28, 28), y: y + rnd(-6, 6), vx: 0, vy: -30, t: 0, dur: 0.8, color: '#a060e0', s: 2 });
    } else if (ev.kind === 'essence' && !ev.done) {
      g.globalAlpha = 0.85; drawSprite(g, ev.mon, x, y + 10, 2, 1, '#9ae8ff', false, 0); g.globalAlpha = 1;
      g.fillStyle = 'rgba(160,230,255,0.28)'; g.strokeStyle = 'rgba(200,245,255,0.9)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y - 46); g.lineTo(x + 22, y - 14); g.lineTo(x + 16, y + 16); g.lineTo(x - 16, y + 16); g.lineTo(x - 22, y - 14); g.closePath(); g.fill(); g.stroke();
    } else if (ev.kind === 'vision') {
      g.fillStyle = '#4a4258'; g.beginPath(); g.moveTo(x - 10, y + 14); g.lineTo(x - 6, y - 44); g.lineTo(x + 6, y - 44); g.lineTo(x + 10, y + 14); g.fill();
      g.fillStyle = ev.done ? '#6a6070' : '#ffe9a0'; g.beginPath(); g.ellipse(x, y - 30, 6, 3.5, 0, 0, Math.PI * 2); g.fill();
      if (!ev.done) { g.fillStyle = '#3a2a10'; g.beginPath(); g.arc(x, y - 30, 2, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
    if (!ev.done || ev.active) txt(g, ev.kind === 'shrine' ? SHRINES[ev.type].name : EV_NAME[ev.kind] + (ev.active && ev.kind === 'abyss' ? `　第 ${ev.wave} / 3 波` : ''), x, y - 58, 11, ev.kind === 'shrine' ? SHRINES[ev.type].color : '#e8d8ff', 'center');
  }
};
// 神殿剩幾秒：畫面上方
setInterval(() => {
  let el = document.getElementById('shrineHud');
  const t = (typeof G !== 'undefined' && G.shrine && G.P) ? `${SHRINES[G.shrine.type].name}：${SHRINES[G.shrine.type].text}（${Math.ceil(G.shrine.t)} 秒）` : '';
  if (!el) { if (!t) return; el = document.createElement('div'); el.id = 'shrineHud'; document.body.appendChild(el); }
  el.textContent = t; el.style.display = t ? '' : 'none'; if (t) el.style.color = SHRINES[G.shrine.type].color;
}, 250);
(() => { const st = document.createElement('style'); st.textContent = `#shrineHud { position:fixed; left:50%; top:72px; transform:translateX(-50%); font-size:13px; text-shadow:0 0 3px #000,0 0 2px #000; pointer-events:none; z-index:5; }`; document.head.appendChild(st); })();
// 回營地時神殿效果結束
const _goTownEV = goTown;
goTown = function (...a) { if (G.shrine) { G.shrine = null; } return _goTownEV(...a); };

// =============================================================
//  v2.8.9 寶箱事件：主線就有。開出來的東西照這張地圖的掉落規則，
//  但比黃色精英怪更好：件數 4～6（再吃地圖數量加成 +30%）、稀有度比黃怪高（再吃地圖稀有度加成 +30%）、必掉 1～2 顆通貨
//  ・主線每區 40% 機率有 1 個；深層夢境每區 1 個，30% 機率再多 1 個
// =============================================================
EV_NAME.chest = '寶箱';
const _placeEvChest = placeEvents;
placeEvents = function (w) {
  _placeEvChest(w);
  if (!w.stage || w.arena) return;
  const n = w.tier >= DEEP_TIER ? 1 + (Math.random() < 0.3 ? 1 : 0) : (Math.random() < 0.4 ? 1 : 0);
  const rooms = (w.others || []).slice().sort(() => Math.random() - 0.5); let put = 0;
  for (const r of rooms) {
    if (put >= n) break;
    const x = rint(r.x + 1, r.x + r.w - 2), y = rint(r.y + 1, r.y + r.h - 2);
    if (!w.grid[y * w.W + x] || w.events.some(e => Math.hypot(e.x - (x * TS + 16), e.y - (y * TS + 16)) < 80)) continue;
    w.events.push({ kind: 'chest', x: x * TS + 16, y: y * TS + 16, done: false }); put++;
  }
};
function openChest(ev) {
  const w = G.world;
  mapLoot(ev.x, ev.y, { n: 5, q: 30, r: 30, bonus: 5, rare: 1, ilvl: (w.mlvl || 1) + 1 });
  Sfx.play('unique'); burst(ev.x, ev.y - 6, '#ffd36a', 24, 160);
}
const _activateChest = activateEvent;
activateEvent = function (ev) {
  if (ev.kind !== 'chest') return _activateChest(ev);
  if (ev.done) return; ev.done = true; openChest(ev); saveGame();
};
// 畫：沒開的寶箱閃一點金光；開過的變暗
const _drawChestEv = drawStageExtras;
drawStageExtras = function (g) {
  const w = G.world, chests = w && w.events ? w.events.filter(e => e.kind === 'chest') : [];
  for (const ev of chests) {
    if (typeof drawEventArt === 'function' && drawEventArt(g, ev)) continue;
    g.save(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(ev.x, ev.y + 12, 18, 6, 0, 0, Math.PI * 2); g.fill();
    if (!ev.done) { const gl = g.createRadialGradient(ev.x, ev.y, 0, ev.x, ev.y, 34); gl.addColorStop(0, `rgba(255,211,106,${0.25 + 0.15 * Math.sin(G.time * 4)})`); gl.addColorStop(1, 'rgba(255,211,106,0)'); g.fillStyle = gl; g.beginPath(); g.arc(ev.x, ev.y, 34, 0, Math.PI * 2); g.fill(); }
    else g.globalAlpha = 0.45;
    drawSprite(g, 'chest', ev.x, ev.y + 12, 2, 1, null, false, 0);
    g.restore();
    if (!ev.done) txt(g, '寶箱', ev.x, ev.y - 30, 11, '#ffd36a', 'center');
  }
  // 其他事件交給原本的畫法（跳過寶箱）
  if (w && w.events) { const all = w.events; w.events = all.filter(e => e.kind !== 'chest'); try { _drawChestEv(g); } finally { w.events = all; } }
  else _drawChestEv(g);
};

// =============================================================
//  v2.8.11 統一的掉落計算：所有「事件獎勵」都用這張地圖的掉落數量、稀有度去疊加
//  n＝基本件數；q／r＝在地圖加成之外再多加的數量／稀有度（%）；bonus＝稀有度倍率（一般怪 1、藍怪 2、黃怪 4）；rare＝保底幾件黃裝
//  每一件照怪物掉落的比例：通貨、輔助寶石、珠寶、藥劑、技能寶石、裝備（裝備的稀有度吃 bonus）
// =============================================================
function mapLoot(x, y, o = {}) {
  const w = G.world || {}, mm = w.mm || {}, ilvl = o.ilvl || w.mlvl || 1;
  const bonus = (o.bonus || 4) * (1 + ((mm.r || 0) + (o.r || 0)) / 100);
  let n = o.n || 1; const qx = n * ((mm.q || 0) + (o.q || 0)) / 100; n += Math.floor(qx) + (Math.random() < qx % 1 ? 1 : 0);
  let rares = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    if (r < 0.15) dropLoot(x, y, { cur: randomCurrency() });
    else if (r < 0.22) dropLoot(x, y, { gem: randomSupport() });
    else if (r < 0.29) dropLoot(x, y, { jewel: randomJewel(ilvl) });
    else if (r < 0.34) dropLoot(x, y, { item: randomFlask(w.grade || 1) });
    else if (r < 0.37) dropLoot(x, y, { skill: randomSkillGem(ilvl) });
    else { const it = randomItem(ilvl, bonus); if (it.rarity === 'rare' || it.rarity === 'unique') rares++; dropLoot(x, y, { item: it }); }
  }
  for (; rares < (o.rare || 0); rares++) dropLoot(x, y, { item: makeItem(pickBase(ilvl).id, 'rare', ilvl) });
}
