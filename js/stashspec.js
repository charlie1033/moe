// =============================================================
//  v2.7 倉庫專屬分頁：通貨、輔助寶石、珠寶各有一頁（材料系統已拿掉：舊存檔的 spec.mat 資料留著，只是不顯示）
//  ・每一種東西有固定的位置，沒有的會顯示成暗格（數量 0），一眼看出缺什麼
//  ・專屬分頁沒有容量上限，所有角色共用
//  ・存：在背包右鍵、或按「一鍵存入」→ 自動進專屬分頁
//  ・拿：左鍵拿一疊、Shift＋左鍵全部拿（背包放得下為止）、右鍵拿 1 個
// =============================================================
const SPEC_TABS = [['cur', '通貨'], ['sup', '輔助寶石'], ['jewel', '珠寶']];
function specEnsure(s) {
  if (!s) return s;
  if (!s.spec) s.spec = { cur: {}, mat: {}, sup: {}, jewel: {} };
  for (const t of ['cur', 'mat', 'sup', 'jewel']) s.spec[t] = s.spec[t] || {};
  // 第一次：把一般分頁裡的通貨、材料、寶石、珠寶搬進專屬分頁
  if (!s.specVer) {
    for (const tab of s.tabs) for (let i = 0; i < tab.length; i++) { const it = tab[i]; if (it && it.stack && s.spec[it.stack]) { s.spec[it.stack][it.key] = (s.spec[it.stack][it.key] || 0) + it.n; tab[i] = null; } }
    s.specVer = 1;
  }
  return s;
}
const _loadStashSpec = loadStash;
loadStash = function () { return specEnsure(_loadStashSpec()); };
if (G.stash) specEnsure(G.stash);
const specAdd = (type, k, n) => { const sp = G.stash.spec[type]; sp[k] = (sp[k] || 0) + n; };

// 背包放不下的：先進專屬分頁（沒有上限）
stackOverflow = function (type, key, n) {
  if (n <= 0) return;
  if (G.stash) { specEnsure(G.stash); specAdd(type, key, n); UI.msg(`背包滿了，${STACK_TYPES[type].name(key)} 先送進倉庫`, '#d8c8a0'); return; }
};
// 一鍵存入
stashAllStacks = function (types) {
  const P = G.P; let moved = 0;
  for (let i = 0; i < P.inv.length; i++) { const it = P.inv[i]; if (!it || !types.includes(it.stack)) continue; specAdd(it.stack, it.key, it.n); moved += it.n; P.inv[i] = null; }
  UI.msg(moved ? `存進倉庫 ${moved} 個` : '背包裡沒有可以存的', moved ? '#9fff9f' : '#d8c8a0');
  if (moved) Sfx.play('coin');
  UI.refreshInv(); UI.refreshStash(); saveGame();
};

// —— 介面 ——
const SUP_GROUP = { '#e05a4f': '力量（紅）', '#5cc45c': '敏捷（綠）', '#5b8cff': '智慧（藍）' };
const CUR_GROUPS = [['卷軸', ['portal']], ['改造魔法裝', ['transmute', 'alter', 'aug', 'chance']], ['稀有裝', ['alch', 'regal', 'chaos', 'annul', 'scour']], ['高價', ['divine', 'exalt', 'socket']], ['強化', ['whet', 'whet2', 'hone', 'lam', 'lam2', 'thread']]];
Object.assign(UI, {
  specCell(type, k, big) {
    const n = G.stash.spec[type][k] || 0, T = STACK_TYPES[type];
    return `<div class="spc ${n ? '' : 'empty'} ${big ? 'big' : ''}" data-st="${type}" data-sk="${k}" style="--c:${T.color(k)}"><img src="${T.icon(k)}" draggable="false">${n ? `<b>${n > 999 ? Math.floor(n / 1000) + 'k' : n}</b>` : ''}${big ? `<span>${T.name(k)}</span>` : ''}</div>`;
  },
  specHTML(type) {
    const sp = G.stash.spec[type]; let h = '';
    if (type === 'cur') {
      const seen = new Set();
      for (const [g, ks] of CUR_GROUPS) { const list = ks.filter(k => CURRENCY[k]); list.forEach(k => seen.add(k)); h += `<div class="spg">${g}</div><div class="sprow">${list.map(k => this.specCell('cur', k, true)).join('')}</div>`; }
      const rest = Object.keys(CURRENCY).filter(k => !seen.has(k)); if (rest.length) h += `<div class="spg">其他</div><div class="sprow">${rest.map(k => this.specCell('cur', k, true)).join('')}</div>`;
    } else if (type === 'sup') {
      const groups = {}; for (const k in SUPPORTS) { const g = SUP_GROUP[SUPPORTS[k].color] || '其他'; (groups[g] = groups[g] || []).push(k); }
      for (const g of [...Object.values(SUP_GROUP), '其他']) if (groups[g]) h += `<div class="spg">${g}</div><div class="sprow">${groups[g].map(k => this.specCell('sup', k, true)).join('')}</div>`;
    } else {
      h += `<table class="sptab"><tr><th></th>${JEWEL_GRADES.map((g, i) => `<th>${i + 1}</th>`).join('')}</tr>`;
      for (const t in JEWELS) h += `<tr><td class="spn" style="color:${JEWELS[t].color}" title="${JEWELS[t].hint}">${JEWELS[t].name}<small>${JEWELS[t].hint}</small></td>${JEWEL_GRADES.map((g, i) => `<td>${this.specCell('jewel', jewelKey(t, i + 1))}</td>`).join('')}</tr>`;
      h += `</table><div class="phint">1～8＝珠寶等級（${JEWEL_GRADES.join('、')}）。3 顆同級可以在珠寶工坊合成高一級。</div>`;
    }
    const total = Object.values(sp).reduce((a, b) => a + b, 0), kinds = Object.values(sp).filter(x => x > 0).length;
    return `<div class="spsum">共 ${kinds} 種、${total} 個　<span class="thint">${byCtl('左鍵拿一疊　Shift＋左鍵全部拿　右鍵拿 1 個', '點一下拿一疊')}</span></div>` + h;
  },
  specWithdraw(type, k, mode) {
    const sp = G.stash.spec[type], have = sp[k] || 0; if (!have) return;
    const want = mode === 'one' ? 1 : mode === 'all' ? have : Math.min(have, STACK_TYPES[type].max(k));
    const left = stackAdd(G.P.inv, type, k, want), got = want - left;
    if (!got) return this.msg('背包已滿', '#ff9a9a');
    sp[k] = have - got; if (!sp[k]) delete sp[k];
    Sfx.play('coin'); this.hideTip(); this.refreshInv(); this.refreshStash(); saveGame();
  },
});
const _refreshStashBase = UI.refreshStash.bind(UI);
UI.refreshStash = function () {
  if (!this.open.stash || !G.stash) return;
  specEnsure(G.stash);
  const spec = typeof this.stashTab === 'string';
  if (!spec) _refreshStashBase();
  // 分頁按鈕：專屬分頁在前，一般分頁在後
  const tabs = $('#stashTabs');
  tabs.innerHTML = SPEC_TABS.map(([t, n]) => { const c = Object.values(G.stash.spec[t]).filter(x => x > 0).length; return `<button class="spbtn ${this.stashTab === t ? 'on' : ''}" data-t="${t}">${n}${c ? `（${c}）` : ''}</button>`; }).join('')
    + G.stash.tabs.map((t, i) => `<button class="${i === this.stashTab ? 'on' : ''}" data-t="${i}">裝備${i + 1}<small>（${t.filter(x => x).length}）</small></button>`).join('');
  tabs.querySelectorAll('button').forEach(b => b.onclick = () => { const v = b.dataset.t; this.stashTab = /^\d+$/.test(v) ? +v : v; this.hideTip(); this.refreshStash(); });
  let bulk = $('#stashBulk');
  if (!bulk) { bulk = document.createElement('div'); bulk.id = 'stashBulk'; $('#stashGrid').before(bulk); }
  bulk.innerHTML = '<span class="bulkt">一鍵存入</span><button data-sb="cur">通貨</button><button data-sb="sup,jewel">寶石、珠寶</button><button data-sb="cur,sup,jewel">全部（裝備以外）</button><span class="thint">倉庫所有角色共用</span>';
  bulk.querySelectorAll('[data-sb]').forEach(b => b.onclick = () => stashAllStacks(b.dataset.sb.split(',')));
  const grid = $('#stashGrid');
  grid.classList.toggle('specmode', spec);
  if (!spec) return;
  grid.innerHTML = this.specHTML(this.stashTab);
  grid.querySelectorAll('.spc').forEach(d => {
    const type = d.dataset.st, k = d.dataset.sk;
    d.onclick = e => this.specWithdraw(type, k, e.shiftKey ? 'all' : 'stack');
    d.oncontextmenu = e => { e.preventDefault(); this.specWithdraw(type, k, 'one'); };
    d.onmouseenter = e => {
      const T = STACK_TYPES[type], n = G.stash.spec[type][k] || 0;
      this.showTip(`<div class="tip-name" style="color:${T.color(k)}"><img class="skico" src="${T.icon(k)}">${T.name(k)}</div>
        <div class="tip-sub">${T.kind}　·　倉庫 ${n}　·　背包 ${stackCount(G.P.inv, type, k)}</div><div class="tip-mod" style="color:#d8ccb4">${T.desc(k)}</div>
        ${n ? `<div class="tip-hint">${byCtl('左鍵：拿一疊　Shift＋左鍵：全部拿　右鍵：拿 1 個', '再點一下：拿一疊')}</div>` : '<div class="tip-hint" style="color:#8a7a60">倉庫裡還沒有</div>'}`, e.clientX, e.clientY);
    };
    d.onmousemove = e => this.moveTip(e); d.onmouseleave = () => this.hideTip();
  });
};
// 存入：通貨、材料、寶石、珠寶一律進專屬分頁；裝備在專屬分頁時放進第一個有空位的裝備分頁
const _depositBase = UI.depositItem.bind(UI);
UI.depositItem = function (i) {
  const it = G.P.inv[i]; if (!it) return;
  specEnsure(G.stash);
  if (isStack(it)) { specAdd(it.stack, it.key, it.n); G.P.inv[i] = null; Sfx.play('coin'); this.hideTip(); this.refreshInv(); this.refreshStash(); return saveGame(); }
  if (typeof this.stashTab === 'string') {
    const t = G.stash.tabs.findIndex(tab => tab.includes(null));
    if (t < 0) return this.msg('裝備分頁都滿了', '#ff9a9a');
    const j = G.stash.tabs[t].indexOf(null); G.stash.tabs[t][j] = it; G.P.inv[i] = null;
    this.msg(`放進「裝備 ${t + 1}」`, '#d8c8a0'); this.hideTip(); this.refreshInv(); this.refreshStash(); return saveGame();
  }
  return _depositBase(i);
};
// 樣式
(() => {
  const st = document.createElement('style');
  st.textContent = `
  #stashTabs { display:flex; flex-wrap:wrap; gap:2px; }
  #stashTabs button { font-size:12px; padding:3px 6px; white-space:nowrap; }
  #stashTabs button small { font-size:10px; opacity:0.75; }
  #stashTabs .spbtn { color:#ffe0a0; }
  #stashGrid.specmode { display:block; padding:4px 8px 10px; }
  .spsum { font-size:12px; color:#d8ccb4; margin:2px 0 4px; }
  .spg { font-size:12px; color:#c8a868; margin:8px 0 3px; border-bottom:1px solid #2a2218; }
  .sprow { display:grid; grid-template-columns:repeat(auto-fill, minmax(84px, 1fr)); gap:4px; }
  .spc { position:relative; width:40px; height:40px; background:#14110d; border:1px solid #3a3022; border-radius:4px; cursor:pointer; box-sizing:border-box; }
  .spc img { width:32px; height:32px; margin:3px; image-rendering:pixelated; pointer-events:none; }
  .spc b { position:absolute; right:2px; bottom:0; font-size:12px; color:#fff; text-shadow:0 0 3px #000, 0 0 2px #000; }
  .spc:hover { border-color:var(--c); box-shadow:0 0 6px var(--c); }
  .spc.empty { opacity:0.28; cursor:default; } .spc.empty:hover { box-shadow:none; border-color:#3a3022; }
  .spc.big { width:auto; height:auto; display:flex; flex-direction:column; align-items:center; padding:2px 2px 3px; }
  .spc.big img { margin:2px 0 0; } .spc.big b { top:2px; bottom:auto; }
  .spc.big span { font-size:11px; color:var(--c); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
  .sptab { border-collapse:collapse; margin-top:4px; } .sptab th { font-size:11px; color:#c8a868; padding:0 2px; }
  .sptab td { padding:1px; } .sptab .spn { font-size:12px; color:#d8ccb4; white-space:nowrap; padding-right:6px; }
  .sptab .spn small { display:block; font-size:10px; color:#8a7a60; }
  .sptab .spc { width:38px; height:38px; } .sptab .spc img { width:30px; height:30px; margin:3px; }`;
  document.head.appendChild(st);
})();
