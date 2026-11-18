// =============================================================
//  v2.8.1 珠寶改版：不用珠寶工坊了
//  ・在背包對珠寶按右鍵（或左鍵）＝選起來 → 再點有空插槽的裝備（身上的或背包裡的）就鑲上去
//    按住 Shift 點：鑲完還保持選取，可以連續鑲；右鍵或 Esc 取消
//  ・Shift＋右鍵點珠寶：3 顆同階合成高一階（最高第 8 階）
//  ・鑲上去就拿不下來；裝備分解、賣掉時，珠寶「退一階」還給你（完美以上一律退成無瑕；碎裂的就沒了）
//  ・藍玉：法術傷害 → 最大魔力（對物理職業比較公平）
// =============================================================
Object.assign(JEWELS.sapphire, { stat: 'mana', vals: [8, 12, 18, 26, 35, 46, 60, 76], hint: '最大魔力' });
const JEWEL_BACK_MAX = 5;   // 退回時最高只給到「無瑕」（第 5 階）
function jewelBack(k) { const j = parseJewel(k); const g = j.grade >= 6 ? JEWEL_BACK_MAX : j.grade - 1; return g >= 1 ? jewelKey(j.type, g) : null; }
returnJewels = function (item) {
  const got = [];
  for (const k of item.sockets || []) if (k) { const b = jewelBack(k); if (b) { G.P.jewels[b] = (G.P.jewels[b] || 0) + 1; got.push(jewelName(b)); } }
  if (got.length) UI.msg(`裝備上的珠寶退一階還給你：${got.join('、')}`, '#e8c890');
  else if ((item.sockets || []).some(x => x)) UI.msg('裝備上的碎裂珠寶跟著消失了', '#a89878');
};
// 珠寶工坊和 G 鍵都拿掉了（v2.17）；跟營地的小雀說話會打開「小雀的寶石盒」（jewelgirl.js）合成珠寶
UI.jewelPick = null;
function socketJewel(it, k) {
  if (!it || isStack(it) || isFlask(it)) return UI.msg('珠寶只能鑲在裝備上', '#ff9a9a');
  it.sockets = it.sockets || [];
  const si = it.sockets.indexOf(null);
  if (si < 0) return UI.msg(it.sockets.length ? '這件裝備的插槽都滿了（珠寶鑲上去就拿不下來；可以用鑿孔石多開一個孔）' : '這件裝備沒有插槽（可以用鑿孔石開孔）', '#ff9a9a');
  if (!(G.P.jewels[k] > 0)) { UI.jewelPick = null; return UI.refreshInv(); }
  G.P.jewels[k] -= 1; it.sockets[si] = k;
  Sfx.play('equip'); UI.msg(`鑲上了 ${jewelName(k)}：${jewelText(k)}（${it.name}）`, JEWELS[parseJewel(k).type].color);
  onBuildChanged(); saveGame();
  return true;
}
function combineJewel(k) {
  const j = parseJewel(k);
  if (j.grade >= 8) return UI.msg('已經是最高階了', '#d8c8a0');
  if ((G.P.jewels[k] || 0) < JEWEL_COMBINE) return UI.msg(`要 ${JEWEL_COMBINE} 顆同階的才能合成（你有 ${G.P.jewels[k] || 0} 顆）`, '#ff9a9a');
  G.P.jewels[k] -= JEWEL_COMBINE; const nk = jewelKey(j.type, j.grade + 1); G.P.jewels[nk] = (G.P.jewels[nk] || 0) + 1;
  Sfx.play('unique'); UI.msg(`合成成功：${jewelName(nk)}（${jewelText(nk)}）`, JEWELS[j.type].color);
  if (UI.jewelPick === k && !(G.P.jewels[k] > 0)) UI.jewelPick = null;
  UI.refreshInv(); saveGame();
}
const _rightInvJw = UI.rightInv.bind(UI);
UI.rightInv = function (i, e) {
  const it = G.P.inv[i];
  if (this.jewelPick && !(it && it.stack === 'jewel')) { this.jewelPick = null; this.refreshInv(); return; }   // 右鍵取消
  if (it && it.stack === 'jewel' && !this.open.stash) {
    if (e && e.shiftKey) return combineJewel(it.key);
    this.curSel = null;
    this.jewelPick = this.jewelPick === it.key ? null : it.key;
    if (this.jewelPick) this.msg(`已選取 ${jewelName(it.key)}：點要鑲嵌的裝備（身上的或背包裡的），右鍵取消`, '#e8c890');
    this.hideTip(); return this.refreshInv();
  }
  return _rightInvJw(i, e);
};
const _clickInvJw = UI.clickInv.bind(UI);
UI.clickInv = function (i, e) {
  const it = G.P.inv[i];
  if (it && it.stack === 'jewel') { this.curSel = null; this.jewelPick = this.jewelPick === it.key ? null : it.key; this.hideTip(); return this.refreshInv(); }
  if (this.jewelPick && it) { const k = this.jewelPick; const ok = socketJewel(it, k); if (ok && !(e && e.shiftKey && G.P.jewels[k] > 0)) this.jewelPick = null; this.refreshInv(); if (ok) this.hoverInv(i, e); return; }
  return _clickInvJw(i, e);
};
const _clickEqJw = UI.clickEquip.bind(UI);
UI.clickEquip = function (slot, e) {
  const it = G.P.equip[slot];
  if (this.jewelPick && it) { const k = this.jewelPick; const ok = socketJewel(it, k); if (ok && !(e && e.shiftKey && G.P.jewels[k] > 0)) this.jewelPick = null; this.refreshInv(); if (ok) this.hoverEquip(slot, e); return; }
  return _clickEqJw(slot, e);
};
// 畫面：選中的珠寶格亮起來；有空插槽的裝備（身上、背包）亮金框
const _refreshInvJw = UI.refreshInv.bind(UI);
UI.refreshInv = function () {
  _refreshInvJw();
  const P = G.P, k = this.jewelPick; if (!P) return;
  const empty = it => it && !isStack(it) && !isFlask(it) && (it.sockets || []).includes(null);
  document.querySelectorAll('#invgrid .icell').forEach(d => { const it = P.inv[+d.dataset.i]; d.classList.toggle('cursel', !!(k && it && it.stack === 'jewel' && it.key === k)); d.classList.toggle('jready', !!(k && empty(it))); });
  document.querySelectorAll('#doll .eslot').forEach(d => d.classList.toggle('jready', !!(k && empty(P.equip[d.dataset.slot]))));
};
// 說明框
const _stackTipJw = stackTipHTML;
stackTipHTML = function (it, hint) {
  if (it.stack === 'jewel' && !(UI.open && UI.open.stash)) hint = '右鍵（或左鍵）：選起來，再點要鑲嵌的裝備　Shift＋右鍵：3 顆合成高一階';
  return _stackTipJw(it, hint);
};
STACK_TYPES.jewel.desc = k => jewelText(k) + '（鑲上去就拿不下來；3 顆同階可以合成高一階）';
window.addEventListener('keydown', e => { if (e.code === 'Escape' && UI.jewelPick) { UI.jewelPick = null; UI.refreshInv(); } }, true);
(() => { const st = document.createElement('style'); st.textContent = `.cell.jready { box-shadow: inset 0 0 0 2px #ffd36a, 0 0 8px rgba(255,211,106,.6); }`; document.head.appendChild(st); })();
const _unequipJw = UI.unequip.bind(UI);
UI.unequip = function (slot) { if (this.jewelPick) { this.jewelPick = null; return this.refreshInv(); } return _unequipJw(slot); };
