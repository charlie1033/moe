// =============================================================
//  元素連動（四條規則，不加新寶石）
//  玩家看到：異常狀態疊在一起會「起反應」。第一次觸發時畫面中間跳出反應名字（大橫幅），之後只在怪頭上冒小字。
//   ・碎冰：冰凍中的敵人被重擊（同一格裡少掉牠 8% 以上的最大生命，打死也算）
//          → 冰塊炸開（範圍 90），對旁邊的敵人造成「這一下 50%」的冰冷傷害；牠的冰凍解除
//   ・毒爆：中毒的敵人被點燃（新的點燃上身）
//          → 牠身上剩下的毒一次結算（總傷害不變，只是提早打完），再噴一小圈毒（範圍 70，旁邊的敵人中一層小毒）
//   ・凝血：流血的敵人被冰緩 → 定身 1 秒（稀有 0.6 秒、首領 0.3 秒）
//   ・導電：感電的敵人站在水邊（地圖格 deco 2 水、15 木橋，在河或水塘旁一格內）
//          → 電沿著水傳給 200 內也在水邊的敵人（最多 4 隻），各受到牠最大生命 4% 的閃電傷害（首領 2%），並感電 1.5 秒
//  平衡：每隻怪每種反應有冷卻（碎冰、導電 2 秒；毒爆、凝血 3 秒，首領的凝血 6 秒）；同一隻怪 0.5 秒內只會被導電打一次
//        首領／看守者（m.boss）：每次碎冰最多吃到牠最大生命 3%、導電 2%；毒爆一次最多結算 2%（稀有怪 8%），沒結算完的毒照常留著
//  日誌（J）多一頁「反應圖鑑」：觸發過的顯示名稱、條件、效果、次數，沒觸發過的是「？？？」；下面附上每個異常狀態的說明
//  異常狀態說明（AILMENTS[x].desc）第一行補上它參與的反應（技能頁滑鼠移到異常狀態上看得到）
//  習慣說明（SUPPORTS[x].desc）最後補一行「可觸發：凝血（流血＋冰緩）」：依寶石 mods 會造成的狀態（SUP_AIL）對 REACTIONS 的 need 自動產生
//  做法：不包裝任何函式。Hook 'update' 每格比對每隻怪的冰凍／生命／冰緩／點燃，'kill' 補抓「一下打死冰凍的怪」
//  資料：全帳號共用 G.stash.reactSeen = { shatter: 次數, toxic, clot, conduct }
// =============================================================
const REACTIONS = {
  shatter: { name: '碎冰', color: '#bfefff', ail: ['freeze'], cond: '冰凍中的敵人被重擊（一下打掉牠 8% 以上的生命）', eff: '冰塊炸開，對周圍敵人造成這一下 50% 的冰冷傷害，冰凍解除' },
  toxic: { name: '毒爆', color: '#9be060', ail: ['poison', 'ignite'], cond: '中毒的敵人被點燃', eff: '身上剩下的毒一次結算（總量不變，提早打完），再噴一小圈毒' },
  clot: { name: '凝血', color: '#ff5050', ail: ['bleed', 'freeze'], cond: '流血的敵人被冰緩（冰冷傷害打到）', eff: '血凝住了：定身 1 秒（稀有怪 0.6 秒、首領 0.3 秒）' },
  conduct: { name: '導電', color: '#fff070', ail: ['shock'], cond: '感電的敵人站在水邊（河、水塘、木橋）', eff: '電沿著水傳給附近也在水邊的敵人（最多 4 隻），各受到牠最大生命 4% 的閃電傷害' },
};
const REACT_ORDER = ['shatter', 'toxic', 'clot', 'conduct'];
const REACT_CD = { shatter: 2, toxic: 3, clot: 3, conduct: 2 };
// 習慣說明最後一行「可觸發：凝血（流血＋冰緩）」：看寶石的 mods 會造成哪種異常狀態，再找用到那個狀態的反應（從 REACTIONS 產生）
//   need＝這個反應要哪些狀態（有其中一個就算「可觸發」）；combo＝括號裡寫的組合
Object.assign(REACTIONS.shatter, { need: ['freeze'], combo: '冰凍＋重擊' });
Object.assign(REACTIONS.toxic, { need: ['poison', 'ignite'], combo: '中毒＋點燃' });
Object.assign(REACTIONS.clot, { need: ['bleed', 'chill'], combo: '流血＋冰緩' });
Object.assign(REACTIONS.conduct, { need: ['shock'], combo: '感電＋水邊' });
const SUP_AIL = { bleed_ch: ['bleed'], poison_ch: ['poison'], ignite_ch: ['ignite'], shock_ch: ['shock'], freeze_ch: ['freeze', 'chill'], conv_cold: ['chill'] };   // 輔助的 mod → 造成的狀態（冰冷傷害一定會冰緩）
function supReactLine(sp) {
  const ail = new Set(); for (const k in (sp && sp.mods) || {}) for (const a of SUP_AIL[k] || []) ail.add(a);
  const rs = REACT_ORDER.filter(k => REACTIONS[k].need.some(a => ail.has(a)));
  return rs.length ? '可觸發：' + rs.map(k => `${REACTIONS[k].name}（${REACTIONS[k].combo}）`).join('、') : '';
}
function supReactAll() { for (const k in SUPPORTS) { const sp = SUPPORTS[k], t = supReactLine(sp); if (t && !String(sp.desc).includes('可觸發：')) sp.desc += '<br>' + t; } }
supReactAll(); Hook.on('start', supReactAll);   // 後面的檔案也會加習慣：進角色時再補一次（已經補過的不會重複）
// 異常狀態說明的第一行：它參與哪些反應
(() => {
  const line = { freeze: '連動：碎冰（冰凍中被重擊）、凝血（冰冷傷害讓流血的敵人定身）', ignite: '連動：毒爆（點燃中毒的敵人，毒一次結算）',
    poison: '連動：毒爆（中毒的敵人被點燃，毒一次結算）', bleed: '連動：凝血（流血的敵人被冰緩就定身）', shock: '連動：導電（感電的敵人站在水邊，電會傳出去）' };
  for (const k in line) if (AILMENTS[k] && !String(AILMENTS[k].desc).startsWith('連動')) AILMENTS[k].desc = line[k] + '\n' + AILMENTS[k].desc;
})();
const reactSeen = () => { if (!G.stash) return {}; return G.stash.reactSeen || (G.stash.reactSeen = {}); };
function reactFire(k, m) {
  const R = REACTIONS[k], seen = reactSeen(), first = !seen[k];
  seen[k] = (seen[k] || 0) + 1;
  G.texts.push({ x: m.x + rnd(-8, 8), y: m.y - m.r - 34, txt: R.name, color: R.color, size: 13, t: 0, dur: 0.9, pop: 0.6 });
  if (first) { UI.banner('元素連動：' + R.name, R.eff, R.color); UI.msg(`新的反應「${R.name}」：${R.cond}。記在日誌${byCtl('（J）', '')}的反應圖鑑。`, R.color); Sfx.play('crit'); if (UI.open && UI.open.journal) UI.refreshJournal(); }
}
const _rxArcs = [];
const rxOf = m => m._rx || (m._rx = { pz: false, pl: m.life, pc: m.chill || 0, pi: m.ign || null, cd: {}, recv: -9 });
const rxReady = (m, k) => { const r = rxOf(m), cd = REACT_CD[k] * (k === 'clot' && m.boss ? 2 : 1); return G.time - (r.cd[k] ?? -99) >= cd; };
const rxUse = (m, k) => { rxOf(m).cd[k] = G.time; };
function rxWaterAt(x, y) { const w = G.world, tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!w || !w.deco || tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) return false; const v = w.deco[ty * w.W + tx]; return v === 2 || v === 15; }
function rxNearWater(m) { const R = (m.r || 10) + 14; return rxWaterAt(m.x, m.y) || rxWaterAt(m.x + R, m.y) || rxWaterAt(m.x - R, m.y) || rxWaterAt(m.x, m.y + R) || rxWaterAt(m.x, m.y - R); }
const rxPk = (elem, v) => ({ d: { [elem]: [v * 0.9, v * 1.1] }, crit: 0, multi: 100, ail: {}, noBlast: true });
// —— 碎冰 ——
function rxShatter(m, drop) {
  rxUse(m, 'shatter'); reactFire('shatter', m);
  if (!m.dead) m.frozen = 0;
  const R = 90, v0 = drop * 0.5;
  G.fx.push({ k: 'ring', x: m.x, y: m.y, r: R, t: 0, dur: 0.35, color: '#bfefff', fill: 'rgba(190,240,255,0.22)' }); burst(m.x, m.y, '#e8fbff', 16, 200); G.shake = Math.max(G.shake, 2.5);
  for (const o of G.mons.slice()) {
    if (o === m || o.dead || o.hidden || dist(o, m) > R + o.r) continue;
    const v = o.boss ? Math.min(v0, o.maxLife * 0.03 / 1.2) : v0;
    if (v >= 1) hitMonster(o, rxPk('cold', v), true, m, 0.8);
  }
}
// —— 毒爆 ——
function rxToxic(m) {
  const sh = m.shock > 0 ? 1.2 : 1, rest = m.poisons.reduce((s, p) => s + p.dps * Math.max(0, p.t), 0) * sh;
  if (rest < 1) return;
  rxUse(m, 'toxic'); reactFire('toxic', m);
  const cap = m.boss ? m.maxLife * 0.02 : m.rarity === 'rare' ? m.maxLife * 0.08 : Infinity, dmg = Math.min(rest, cap);
  if (dmg >= rest) m.poisons = []; else { const f = 1 - dmg / rest; m.poisons.forEach(p => p.t *= f); }
  m.life -= dmg; m.flash = 0.1;
  G.texts.push({ x: m.x + rnd(-8, 8), y: m.y - m.r - 14, txt: String(Math.round(dmg)), color: '#9be060', size: 15, t: 0, dur: 0.8, pop: 0.6 });
  const R = 70; G.fx.push({ k: 'ring', x: m.x, y: m.y, r: R, t: 0, dur: 0.4, color: '#9be060', fill: 'rgba(150,224,96,0.22)' }); burst(m.x, m.y, '#9be060', 14, 150);
  let n = 0;
  for (const o of G.mons) {
    if (o === m || o.dead || o.hidden || dist(o, m) > R + o.r || n >= 6) continue;
    let dps = dmg * 0.1 / 3; if (o.boss) dps = Math.min(dps, o.maxLife * 0.01 / 3);
    if (dps > 0.2 && o.poisons.length < 40) { o.poisons.push({ dps, t: 3 }); n++; }
  }
  if (m.life <= 0) killMonster(m);
}
// —— 凝血 ——
function rxClot(m) {
  rxUse(m, 'clot'); reactFire('clot', m);
  const t = m.boss ? 0.3 : m.rarity === 'rare' ? 0.6 : 1;
  m.frozen = Math.max(m.frozen || 0, t); m._clotT = t;
  burst(m.x, m.y, '#c01818', 10, 90);
}
// —— 導電 ——
function rxConduct(m) {
  const list = G.mons.filter(o => o !== m && !o.dead && !o.hidden && dist(o, m) < 200 && G.time - rxOf(o).recv >= 0.5 && rxNearWater(o)).sort((a, b) => dist(a, m) - dist(b, m)).slice(0, 4);
  rxUse(m, 'conduct'); if (!list.length) return;
  reactFire('conduct', m);
  for (const o of list) {
    const r = rxOf(o); r.recv = G.time; r.cd.conduct = G.time;   // 被傳到的不會馬上再傳出去
    _rxArcs.push({ x1: m.x, y1: m.y - 8, x2: o.x, y2: o.y - 8, t: 0 });
    hitMonster(o, rxPk('light', o.maxLife * (o.boss ? 0.02 : 0.04) / 1.2), true, m, 0.3);
    if (!o.dead) o.shock = Math.max(o.shock || 0, 1.5);
  }
  Sfx.play('hit', 0.5);
}
// —— 每格比對 ——
Hook.on('update', dt => {
  for (let i = _rxArcs.length - 1; i >= 0; i--) if ((_rxArcs[i].t += dt) > 0.25) _rxArcs.splice(i, 1);
  const w = G.world; if (!G.pl || !w || w.kind !== 'map' || G.dead) return;
  for (const m of G.mons.slice()) {
    if (m.dead) continue;
    const fresh = !m._rx, r = rxOf(m);
    if (m._clotT > 0) m._clotT -= dt;
    if (!fresh) {
      const drop = Math.min(r.pl, r.pl - m.life);
      if (r.pz && drop >= m.maxLife * 0.08 && rxReady(m, 'shatter')) rxShatter(m, drop);
      if (!m.dead && m.ign && m.ign !== r.pi && m.poisons.length && rxReady(m, 'toxic')) rxToxic(m);
      if (!m.dead && m.bleed && m.chill > r.pc + 0.001 && rxReady(m, 'clot')) rxClot(m);
      if (!m.dead && m.shock > 0 && rxReady(m, 'conduct') && rxNearWater(m)) rxConduct(m);
    }
    r.pz = m.frozen > 0 && !(m._clotT > 0); r.pl = m.life; r.pc = m.chill || 0; r.pi = m.ign || null;
  }
});
// 一下打死冰凍中的怪，也算碎冰（屍體炸開）
Hook.on('kill', m => {
  const r = m._rx; if (!r || !r.pz || !G.world || G.world.kind !== 'map') return;
  const drop = Math.min(r.pl, r.pl - m.life);
  if (drop >= m.maxLife * 0.08 && rxReady(m, 'shatter')) { r.pz = false; rxShatter(m, drop); }
});
Hook.on('drawWorld', g => {
  if (!_rxArcs.length) return;
  g.save(); g.strokeStyle = '#fff6a0'; g.lineWidth = 2; g.shadowColor = '#fff070'; g.shadowBlur = 6;
  for (const a of _rxArcs) {
    g.globalAlpha = 1 - a.t / 0.25; g.beginPath(); g.moveTo(a.x1, a.y1);
    for (let k = 1; k < 5; k++) { const f = k / 5; g.lineTo(a.x1 + (a.x2 - a.x1) * f + rnd(-7, 7), a.y1 + (a.y2 - a.y1) * f + rnd(-7, 7)); }
    g.lineTo(a.x2, a.y2); g.stroke();
  }
  g.restore();
});
// —— 日誌：反應圖鑑 ——
JournalTabs.add('react', '反應圖鑑', () => {
  const seen = reactSeen();
  let h = `<div class="csec">反應圖鑑　<span class="thint">兩種異常狀態疊在同一隻怪身上會起反應。已發現 ${REACT_ORDER.filter(k => seen[k]).length} / ${REACT_ORDER.length}（全帳號共用）</span></div>`;
  for (const k of REACT_ORDER) {
    const R = REACTIONS[k];
    if (!seen[k]) { h += `<div class="jent"><b>？？？</b><div class="thint">還沒有觸發過。試著把不同的異常狀態疊在同一隻怪身上。</div></div>`; continue; }
    h += `<div class="jent"><b style="color:${R.color}">${R.name}</b>　<span class="thint">觸發 ${seen[k]} 次</span><div>條件：${R.cond}</div><div>效果：${R.eff}</div><div class="thint">同一隻怪 ${REACT_CD[k]} 秒才能再觸發一次${k === 'toxic' ? '；首領一次最多結算 2% 生命，沒結算完的毒照常留著' : k === 'shatter' ? '；首領每次最多吃到 3% 生命' : k === 'conduct' ? '；首領每次 2%' : ''}</div></div>`;
  }
  h += `<div class="csec">異常狀態說明</div>`;
  for (const a of AIL_KEYS) { const A = AILMENTS[a]; const [l1, ...rest] = String(A.desc).split('\n'); h += `<div class="lrow"><b style="color:${A.color}">${A.name}</b>　${rest.length ? `<span class="c-unique">${l1}</span><br>${rest.join('<br>')}` : l1}</div>`; }
  return h;
});
