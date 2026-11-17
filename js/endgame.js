// =============================================================
//  v2.7 終局玩法：夢境懸賞、首領連戰
//  ・夢境懸賞：地圖裝置上有 3 張懸賞，接 1 張，在深層夢境（第 11 夜以上）完成就拿獎勵
//    進度只算「同一張地圖」：離開地圖就重來（懸賞本身不會消失）
//  ・首領連戰：付 4 顆混沌石（背包＋倉庫），在競技場連打 5 隻看守者，一隻比一隻高 1 級，打完有寶箱
// =============================================================
const BOUNTY_TYPES = {
  kills: { name: '清掃', n: [120, 200], text: n => `在同一張深層夢境裡擊殺 ${n} 隻怪物` },
  elites: { name: '獵殺精英', n: [12, 20], text: n => `在同一張深層夢境裡擊殺 ${n} 隻精英怪（藍色或黃色）` },
  rares: { name: '獵殺黃怪', n: [4, 7], text: n => `在同一張深層夢境裡擊殺 ${n} 隻黃色精英` },
  speed: { name: '速攻', n: [150, 240], text: n => `進入深層夢境後 ${n} 秒內擊敗看守者` },
  nodeath: { name: '無傷', n: [0, 0], text: () => '擊敗深層夢境的看守者，過程中一次都沒有死' },
  mods: { name: '惡夢', n: [3, 4], text: n => `在有 ${n} 條以上詞綴的深層夢境擊敗看守者` },
};
const BOUNTY_REWARDS = [
  { id: 'chaos', w: 30, text: n => `混沌石 ×${n}`, n: [3, 5], give: n => { G.P.cur.chaos += n; } },
  { id: 'regal', w: 18, text: n => `富豪石 ×${n}`, n: [2, 4], give: n => { G.P.cur.regal += n; } },
  { id: 'exalt', w: 12, text: n => `崇高石 ×${n}`, n: [1, 1], give: n => { G.P.cur.exalt += n; } },
  { id: 'divine', w: 10, text: n => `神聖石 ×${n}`, n: [1, 2], give: n => { G.P.cur.divine += n; } },
  { id: 'socket', w: 6, text: n => `鑿孔石 ×${n}`, n: [1, 1], give: n => { G.P.cur.socket += n; } },
  { id: 'frag', w: 16, text: n => `夢魘碎片 ×${n}（隨機）`, n: [2, 3], give: n => { for (let i = 0; i < n; i++) { const k = pick(THEME_FRAG); G.P.frags[k] = (G.P.frags[k] || 0) + 1; } } },
  { id: 'scar', w: 14, text: () => '有夢痕的黃裝 ×1', n: [1, 1], give: () => { const L = Math.min(84, mapLevel(G.P.maxTier) + 3), it = makeItem(pickBase(L).id, 'rare', L); if (!it.scar) rollScar(it); bountyGiveItem(it); } },
  { id: 'jewel', w: 12, text: () => '高階珠寶 ×1', n: [1, 1], give: () => { G.P.jewels[jewelKey(pick(Object.keys(JEWELS)), rint(4, 5))] += 1; } },
  { id: 'whet', w: 10, text: n => `磨石 ×${n}`, n: [1, 2], give: n => { G.P.cur.whet += n; } },
  { id: 'lam', w: 10, text: n => `護貝劑 ×${n}`, n: [1, 2], give: n => { G.P.cur.lam += n; } },
  { id: 'whet2', w: 4, text: () => '異界磨石 ×1', n: [1, 1], give: () => { G.P.cur.whet2 += 1; } },
  { id: 'lam2', w: 4, text: () => '高級護貝劑 ×1', n: [1, 1], give: () => { G.P.cur.lam2 += 1; } },
  { id: 'protect', w: 3, text: () => '砥石或針線 ×1', n: [1, 1], give: () => { G.P.cur[pick(['hone', 'thread'])] += 1; } },
];
function bountyGiveItem(it) { const P = G.P, j = P.inv.indexOf(null); if (j >= 0) P.inv[j] = it; else dropLoot(G.pl.x, G.pl.y + 10, { item: it }); }
function wpickW(list) { let s = list.reduce((a, b) => a + b.w, 0) * Math.random(); for (const x of list) { s -= x.w; if (s <= 0) return x; } return list[0]; }
// v2.8.12 懸賞獎勵也照地圖掉寶率計算：完成時在你腳邊掉一批寶物（件數、稀有度吃當下地圖的加成），越難的懸賞件數越多、保底黃裝越多
const BOUNTY_BASE = { kills: 5, elites: 6, rares: 7, speed: 6, nodeath: 7, mods: 8 };
function makeBounty() {
  const type = pick(Object.keys(BOUNTY_TYPES)), T = BOUNTY_TYPES[type], n = rint(T.n[0], T.n[1]);
  const hard = T.n[1] > T.n[0] ? (n - T.n[0]) / (T.n[1] - T.n[0]) : 0.5;
  return { type, n, reward: { n: BOUNTY_BASE[type] + Math.round(hard * 2), q: 20, r: 20 + Math.round(hard * 20), rare: BOUNTY_BASE[type] >= 7 ? 2 : 1 } };
}
function bountyState() {
  const P = G.P;
  if (!P.bounty) P.bounty = { board: [makeBounty(), makeBounty(), makeBounty()], active: -1, done: 0 };
  P.bounty.board = P.bounty.board.map(b => b && b.reward ? b : makeBounty());   // 舊格式的懸賞換成新的
  return P.bounty;
}
const bountyText = b => BOUNTY_TYPES[b.type].text(b.n);
const bountyRewardText = b => `一批寶物（${b.reward.n} 件起、保底 ${b.reward.rare} 件黃裝，稀有度 +${b.reward.r}%，再疊加當下地圖的掉寶率）`;
function bountyComplete() {
  const B = bountyState(), b = B.board[B.active]; if (!b) return;
  const w = G.world, L = (w && w.mlvl) || mapLevel(G.P.maxTier);
  mapLoot(G.pl.x, G.pl.y + 12, { n: b.reward.n, q: b.reward.q, r: b.reward.r, bonus: 5, rare: b.reward.rare, ilvl: L + 1 });
  B.done++; B.board[B.active] = makeBounty(); B.active = -1;
  if (G.world) G.world.bt = null;
  UI.banner('懸賞完成', '寶物掉在你腳邊', '#ffd36a'); Sfx.play('unique');
  UI.msg(`懸賞完成：${BOUNTY_TYPES[b.type].name}，寶物掉在你腳邊`, '#ffd36a');
  UI.refreshInv(); saveGame();
}
function bountyProgressText() {
  const w = G.world, B = G.P && G.P.bounty; if (!w || !w.bt || !B || B.active < 0) return '';
  const b = B.board[B.active], bt = w.bt;
  if (b.type === 'kills') return `懸賞：擊殺 ${bt.kills}/${b.n}`;
  if (b.type === 'elites') return `懸賞：精英 ${bt.elites}/${b.n}`;
  if (b.type === 'rares') return `懸賞：黃怪 ${bt.rares}/${b.n}`;
  if (b.type === 'speed') { const left = Math.max(0, b.n - (G.time - bt.t0)); return left > 0 ? `懸賞：${Math.ceil(left)} 秒內打倒看守者` : '懸賞：時間到了（離開再進一張重來）'; }
  if (b.type === 'nodeath') return bt.died ? '懸賞：這張死過了（離開再進一張重來）' : '懸賞：不死亡擊敗看守者';
  if (b.type === 'mods') return bt.mods >= b.n ? '懸賞：擊敗看守者' : `懸賞：這張只有 ${bt.mods} 條詞綴，不算`;
  return '';
}

// —— 進地圖時開始記錄 ——
const _enterMapEG = enterMap;
enterMap = function (tier) {
  const nMods = tier >= DEEP_TIER ? deepMods(tier).length : 0;
  _enterMapEG(tier);
  const B = G.P.bounty;
  if (tier >= DEEP_TIER && B && B.active >= 0) { G.world.bt = { kills: 0, elites: 0, rares: 0, t0: G.time, died: false, mods: nMods }; UI.msg('懸賞進行中：' + bountyText(B.board[B.active]), '#ffd36a'); }
};
Hook.on('kill', m => {
  const w = G.world;
  const B = G.P.bounty;
  if (w && w.bt && B && B.active >= 0 && w === G.world) {
    const b = B.board[B.active], bt = w.bt;
    if (!m.boss) { bt.kills++; if (m.rarity !== 'normal') bt.elites++; if (m.rarity === 'rare') bt.rares++; }
    const ok = b.type === 'kills' ? bt.kills >= b.n : b.type === 'elites' ? bt.elites >= b.n : b.type === 'rares' ? bt.rares >= b.n
      : !m.boss ? false : b.type === 'speed' ? G.time - bt.t0 <= b.n : b.type === 'nodeath' ? !bt.died : b.type === 'mods' ? bt.mods >= b.n : false;
    if (ok) bountyComplete();
  }
  if (w && w.rush && m.boss) rushNext(m);
});
const _showDeathEG = UI.showDeath.bind(UI);
UI.showDeath = function (loss, keep) { if (G.world && G.world.bt) G.world.bt.died = true; return _showDeathEG(loss, keep); };

// —— 首領連戰 ——
const RUSH_COST = 4, RUSH_COUNT = 5;
function enterBossRush() {
  const P = G.P;
  if (craftCurHave('chaos') < RUSH_COST) return UI.msg(`需要 ${RUSH_COST} 顆混沌石（背包加倉庫）`, '#ff9a9a');
  craftCurPay('chaos', RUSH_COST);
  if (G.savedMap) UI.msg('舊地圖的傳送門關閉了。', '#c8b890');
  G.savedMap = null; G.fromMap = true;
  resetEntities();
  const ids = [...new Set(THEMES.map(t => t.boss))].sort(() => Math.random() - 0.5).slice(0, RUSH_COUNT);
  const L = Math.min(80, mapLevel(Math.max(DEEP_TIER, P.maxTier)));
  const w = genArena('keeper');
  w.arena = 'rush'; w.mlvl = L; w.name = '首領連戰'; w.rush = { list: ids, i: 0, next: 0 };
  w.theme = Object.assign({}, THEMES.find(t => t.boss === ids[0]), { boss: ids[0] });
  G.world = w; buildWorldCanvas(w);
  const s = w.start; G.pl.x = (s.x + s.w / 2) * TS; G.pl.y = (s.y + 1) * TS;
  G.mons.push(makeBoss(ids[0], 20 * TS, 11 * TS, L + MON_LVL_BONUS.boss));
  G.mins.forEach(m => { m.x = G.pl.x + rnd(-30, 30); m.y = G.pl.y + rnd(-30, 30); });
  w.flowT = 0;
  UI.showMapDevice(false);
  UI.banner('首領連戰', `第 1 / ${RUSH_COUNT} 位：${BOSSES[ids[0]].name}`, '#ff9a6a');
  saveGame();
}
function rushNext(m) {
  const w = G.world, R = w.rush; R.i++;
  if (R.i < R.list.length) { R.next = G.time + 3.5; UI.msg(`下一位看守者 3 秒後出現（${R.i + 1} / ${R.list.length}）：${BOSSES[R.list[R.i]].name}`, '#ff9a6a'); return; }
  // 全部打完：寶箱
  const x = m.x, y = m.y, L = w.mlvl + 4;
  UI.banner('連戰勝利', `${R.list.length} 位看守者全部倒下`, '#ffd36a'); Sfx.play('unique');
  mapLoot(x, y, { n: 12, q: 60, r: 80, bonus: 6, rare: 2, ilvl: L });   // v2.8.11 連戰寶箱也照地圖掉寶率計算（保底 2 件黃裝）
  G.P.rushWins = (G.P.rushWins || 0) + 1;
  saveGame();
}
Hook.on('update', dt => {
  const w = G.world, R = w && w.rush;
  if (R && R.next && G.time >= R.next && R.i < R.list.length) {
    R.next = 0; const id = R.list[R.i];
    w.portal = null;
    w.theme = Object.assign({}, w.theme, { boss: id });
    const b = makeBoss(id, 20 * TS, 11 * TS, w.mlvl + MON_LVL_BONUS.boss + R.i);
    b.awake = true; G.bossBar = b; G.mons.push(b);
    UI.banner(`第 ${R.i + 1} / ${R.list.length} 位`, BOSSES[id].name, '#ff9a6a'); Sfx.play('bossroar');
  }
});

// —— 地圖裝置上的介面 ——
const _renderMapDevEG = UI.renderMapDevice.bind(UI);
UI.renderMapDevice = function () {
  _renderMapDevEG();
  const P = G.P; if (P.maxTier < DEEP_TIER) return;
  const B = bountyState();
  let h = `<div class="msec">夢境懸賞<span class="thint">　接一張，在深層夢境完成就拿獎勵（只算同一張地圖）。已完成 ${B.done} 張。</span></div>`;
  B.board.forEach((b, i) => {
    const on = B.active === i;
    h += `<div class="mrow bounty ${on ? 'on' : ''}"><div><b style="color:#ffd36a">${BOUNTY_TYPES[b.type].name}</b>${on ? '　<span class="c-good">進行中</span>' : ''}<br><span class="mdesc">${bountyText(b)}<br>獎勵：<span style="color:#ffe8a0">${bountyRewardText(b)}</span></span></div>
      <div class="mbtns">${on ? `<button class="sm" data-bdrop="${i}">放棄</button>` : `<button data-btake="${i}">接下</button>`}<button class="sm" data-breroll="${i}" title="換一張懸賞">混沌換一張 (${craftCurHave('chaos')})</button></div></div>`;
  });
  h += `<div class="msec">首領連戰<span class="thint">　在競技場連打 ${RUSH_COUNT} 位看守者，一位比一位強，全部打倒會掉一大箱寶物（照怪物等級的掉寶率加成計算，保底 2 件黃裝）。</span></div>
    <div class="mrow"><div><b style="color:#ff9a6a">首領連戰</b>　怪物等級 ${Math.min(80, mapLevel(Math.max(DEEP_TIER, P.maxTier)))} 起<br><span class="mdesc">費用：混沌石 ×${RUSH_COST}（背包加倉庫，現在有 ${craftCurHave('chaos')}）　完成 ${P.rushWins || 0} 次<br>中途可以用傳送卷軸離開，但沒打完就拿不到寶箱。</span></div>
    <button data-rush ${craftCurHave('chaos') >= RUSH_COST ? '' : 'disabled'}>挑戰</button></div>`;
  const list = $('#mapList');
  const box = document.createElement('div'); box.innerHTML = h;
  // 放在「深層夢境」那一段的後面、夢魘挑戰的前面
  const secs = [...list.querySelectorAll('.msec')], nm = secs.find(s => s.textContent.startsWith('夢魘挑戰'));
  if (nm) nm.before(...box.childNodes); else list.append(...box.childNodes);
  list.querySelectorAll('[data-btake]').forEach(b => b.onclick = () => { B.active = +b.dataset.btake; Sfx.play('click'); UI.msg('接下懸賞：' + bountyText(B.board[B.active]) + '（下一張深層夢境開始算）', '#ffd36a'); saveGame(); this.renderMapDevice(); });
  list.querySelectorAll('[data-bdrop]').forEach(b => b.onclick = () => { B.active = -1; if (G.world) G.world.bt = null; saveGame(); this.renderMapDevice(); });
  list.querySelectorAll('[data-breroll]').forEach(b => b.onclick = () => {
    if (craftCurHave('chaos') < 1) return this.msg('沒有混沌石', '#ff9a9a');
    craftCurPay('chaos', 1); const i = +b.dataset.breroll; B.board[i] = makeBounty(); if (B.active === i) B.active = -1;
    Sfx.play('click'); saveGame(); this.refreshInv(); this.renderMapDevice();
  });
  const rb = list.querySelector('[data-rush]'); if (rb) rb.onclick = () => enterBossRush();
};
// 進行中的懸賞：畫面左上方小字
(() => { const st = document.createElement('style'); st.textContent = `.mrow.bounty.on { box-shadow: inset 3px 0 0 #ffd36a; } #bountyHud { position:fixed; left:50%; top:52px; transform:translateX(-50%); color:#ffd36a; font-size:13px; text-shadow:0 0 3px #000,0 0 2px #000; pointer-events:none; z-index:5; }`; document.head.appendChild(st); })();
setInterval(() => {
  let el = document.getElementById('bountyHud');
  const t = (typeof G !== 'undefined' && G.P && G.world) ? bountyProgressText() : '';
  if (!el) { if (!t) return; el = document.createElement('div'); el.id = 'bountyHud'; document.body.appendChild(el); }
  el.textContent = t; el.style.display = t ? '' : 'none';
}, 250);
