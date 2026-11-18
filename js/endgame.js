// =============================================================
//  v2.7 終局玩法：夢境懸賞、首領連戰
//  ・夢境懸賞：地圖裝置上有 3 張懸賞，接 1 張，在深層夢境（第 11 夜以上）完成就拿獎勵
//    v2.17 起進度會保留：擊殺類（清掃、獵殺精英、獵殺黃怪）的數字存在懸賞上（P.bounty.board[i].prog），回城、下線、換一張深層夢境都接著算
//    打看守者類（速攻、無傷、惡夢）綁在那一張地圖（G.world.bt，會跟著傳送門和「沒打完的夢」保留）；速攻只算人在地圖裡的時間（bt.el）
//  ・首領連戰：v2.17 改成無盡爬塔，規則、入口費、獎勵都在 climb.js（地圖裝置上那一列由 climbDeviceHTML 產生）
// =============================================================
const BOUNTY_TYPES = {
  kills: { name: '清掃', n: [120, 200], text: n => `在深層夢境裡累計擊殺 ${n} 隻怪物（回城、下線都會保留進度）` },
  elites: { name: '獵殺精英', n: [12, 20], text: n => `在深層夢境裡累計擊殺 ${n} 隻精英怪（藍色或黃色，進度會保留）` },
  rares: { name: '獵殺黃怪', n: [4, 7], text: n => `在深層夢境裡累計擊殺 ${n} 隻黃色精英（進度會保留）` },
  speed: { name: '速攻', n: [150, 240], text: n => `在同一張深層夢境裡待不到 ${n} 秒就擊敗看守者（回城的時間不算）` },
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
const bountyProg = b => (b.prog = b.prog || { kills: 0, elites: 0, rares: 0 });
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
  const b = B.board[B.active], bt = w.bt, pg = bountyProg(b);
  if (b.type === 'kills') return `懸賞：擊殺 ${pg.kills}/${b.n}`;
  if (b.type === 'elites') return `懸賞：精英 ${pg.elites}/${b.n}`;
  if (b.type === 'rares') return `懸賞：黃怪 ${pg.rares}/${b.n}`;
  if (b.type === 'speed') { const left = Math.max(0, b.n - (bt.el || 0)); return left > 0 ? `懸賞：${Math.ceil(left)} 秒內打倒看守者` : '懸賞：時間到了（離開再進一張重來）'; }
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
  if (tier >= DEEP_TIER && B && B.active >= 0) { G.world.bt = { el: 0, died: false, mods: nMods }; UI.msg('懸賞進行中：' + bountyText(B.board[B.active]), '#ffd36a'); }
};
// 速攻：只算人在這張地圖裡的時間
Hook.on('update', dt => { const w = G.world; if (w && w.bt && w.kind === 'map') w.bt.el = (w.bt.el || 0) + dt; });
Hook.on('kill', m => {
  const w = G.world;
  const B = G.P.bounty;
  if (w && w.bt && B && B.active >= 0 && w === G.world) {
    const b = B.board[B.active], bt = w.bt, pg = bountyProg(b);
    if (!m.boss) { pg.kills++; if (m.rarity !== 'normal') pg.elites++; if (m.rarity === 'rare') pg.rares++; }
    const ok = b.type === 'kills' ? pg.kills >= b.n : b.type === 'elites' ? pg.elites >= b.n : b.type === 'rares' ? pg.rares >= b.n
      : !m.boss ? false : b.type === 'speed' ? (bt.el || 0) <= b.n : b.type === 'nodeath' ? !bt.died : b.type === 'mods' ? bt.mods >= b.n : false;
    if (ok) bountyComplete();
  }
});
const _showDeathEG = UI.showDeath.bind(UI);
UI.showDeath = function (loss, keep) { if (G.world && G.world.bt) G.world.bt.died = true; return _showDeathEG(loss, keep); };

// —— 首領連戰：v2.17 改成無盡爬塔，整個搬到 climb.js（這裡只留地圖裝置上的那一列） ——

// —— 地圖裝置上的介面 ——
const _renderMapDevEG = UI.renderMapDevice.bind(UI);
UI.renderMapDevice = function () {
  _renderMapDevEG();
  const P = G.P; if (P.maxTier < DEEP_TIER) return;
  const B = bountyState();
  let h = `<div class="msec">夢境懸賞<span class="thint">　接一張，在深層夢境完成就拿獎勵（擊殺類的進度回城、下線都會保留）。已完成 ${B.done} 張。</span></div>`;
  B.board.forEach((b, i) => {
    const on = B.active === i;
    h += `<div class="mrow bounty ${on ? 'on' : ''}"><div><b style="color:#ffd36a">${BOUNTY_TYPES[b.type].name}</b>${on ? '　<span class="c-good">進行中</span>' : ''}<br><span class="mdesc">${bountyText(b)}<br>獎勵：<span style="color:#ffe8a0">${bountyRewardText(b)}</span></span></div>
      <div class="mbtns">${on ? `<button class="sm" data-bdrop="${i}">放棄</button>` : `<button data-btake="${i}">接下</button>`}<button class="sm" data-breroll="${i}" title="換一張懸賞">混沌換一張 (${craftCurHave('chaos')})</button></div></div>`;
  });
  if (typeof climbDeviceHTML === 'function') h += climbDeviceHTML(P);   // v2.17 無盡爬塔（climb.js）
  const list = $('#mapList');
  const box = document.createElement('div'); box.innerHTML = h;
  // 放在「深層夢境」那一段的後面、夢魘挑戰的前面
  const secs = [...list.querySelectorAll('.msec')], nm = secs.find(s => s.textContent.startsWith('夢魘挑戰'));
  if (nm) nm.before(...box.childNodes); else list.append(...box.childNodes);
  list.querySelectorAll('[data-btake]').forEach(b => b.onclick = () => { B.active = +b.dataset.btake; Sfx.play('click'); UI.msg('接下懸賞：' + bountyText(B.board[B.active]) + '（下一張深層夢境開始算）', '#ffd36a'); saveGame(); this.renderMapDevice(); });
  list.querySelectorAll('[data-bdrop]').forEach(b => b.onclick = () => { if (B.board[B.active]) B.board[B.active].prog = null; B.active = -1; if (G.world) G.world.bt = null; saveGame(); this.renderMapDevice(); });
  list.querySelectorAll('[data-breroll]').forEach(b => b.onclick = () => {
    if (craftCurHave('chaos') < 1) return this.msg('沒有混沌石', '#ff9a9a');
    craftCurPay('chaos', 1); const i = +b.dataset.breroll; B.board[i] = makeBounty(); if (B.active === i) B.active = -1;
    Sfx.play('click'); saveGame(); this.refreshInv(); this.renderMapDevice();
  });
  const rb = list.querySelector('[data-rush]'); if (rb) rb.onclick = () => enterBossRush();
};
// 進行中的懸賞：小地圖下方的狀態列（core.js 的 StatusLines）
(() => { const st = document.createElement('style'); st.textContent = `.mrow.bounty.on { box-shadow: inset 3px 0 0 #ffd36a; }`; document.head.appendChild(st); })();
StatusLines.add(() => (G.P && G.world) ? { t: bountyProgressText(), c: '#ffd36a' } : null);
