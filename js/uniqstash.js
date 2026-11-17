// =============================================================
//  v2.8.1 倉庫的「傳奇」分頁：像收藏冊一樣
//  ・所有傳奇裝備依部位排好，有收到的亮起來（右下角是有幾件），還沒收到的顯示暗影
//  ・傳奇裝備存進倉庫時，一律放進這一頁（沒有容量上限）
//  ・左鍵拿出來（同一種有好幾件時，拿第一件；滑鼠移上去看得到每一件的數值）
// =============================================================
SPEC_TABS.push(['uniq', '傳奇']);
const _specEnsureU = specEnsure;
specEnsure = function (s) { s = _specEnsureU(s); if (s && s.spec && !Array.isArray(s.spec.uniq)) s.spec.uniq = []; return s; };
if (G.stash) specEnsure(G.stash);
const UNIQ_SLOT_ORDER = ['weapon', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring'];
const UNIQ_SLOT_NAME = { weapon: '武器', offhand: '副手', helmet: '頭盔', body: '胸甲', gloves: '手套', boots: '鞋子', belt: '腰帶', amulet: '項鍊', ring: '戒指' };
UI.uniqHTML = function () {
  const list = G.stash.spec.uniq, have = id => list.filter(it => it.uniqueId === id);
  const kinds = new Set(list.map(it => it.uniqueId)).size;
  let h = `<div class="spsum">收集了 ${kinds} / ${UNIQUES.length} 種、共 ${list.length} 件　<span class="thint">左鍵拿回背包　傳奇存進倉庫都會放在這頁</span></div>`;
  for (const sl of UNIQ_SLOT_ORDER) {
    const us = UNIQUES.filter(u => BASE_BY_ID[u.base] && BASE_BY_ID[u.base].slot === sl); if (!us.length) continue;
    h += `<div class="spg">${UNIQ_SLOT_NAME[sl]}</div><div class="sprow uq">`;
    for (const u of us) { const n = have(u.id).length; h += `<div class="spc big uqc ${n ? '' : 'empty'}" data-uq="${u.id}" style="--c:#e8803a"><img src="${itemIconURL(BASE_BY_ID[u.base], 64)}" draggable="false">${n ? `<b>${n}</b>` : ''}<span>${u.name}</span></div>`; }
    h += '</div>';
  }
  return h;
};
const _refreshStashU = UI.refreshStash.bind(UI);
UI.refreshStash = function () {
  _refreshStashU();
  if (!this.open.stash || !G.stash) return;
  // 分頁按鈕的數字（傳奇頁是「幾種」）
  const b = document.querySelector('#stashTabs [data-t="uniq"]');
  if (b) { const n = new Set(G.stash.spec.uniq.map(it => it.uniqueId)).size; b.textContent = `傳奇${n ? `（${n}）` : ''}`; b.classList.add('spbtn', 'uqbtn'); }
  if (this.stashTab !== 'uniq') return;
  const grid = $('#stashGrid'); grid.classList.add('specmode'); grid.innerHTML = this.uniqHTML();
  grid.querySelectorAll('.uqc').forEach(d => {
    const id = d.dataset.uq, u = UNIQUES.find(x => x.id === id);
    d.onclick = () => {
      const list = G.stash.spec.uniq, k = list.findIndex(it => it.uniqueId === id); if (k < 0) return;
      const j = G.P.inv.indexOf(null); if (j < 0) return this.msg('背包已滿', '#ff9a9a');
      G.P.inv[j] = list.splice(k, 1)[0]; Sfx.play('equip'); this.hideTip(); this.refreshInv(); this.refreshStash(); saveGame();
    };
    d.onmouseenter = e => {
      const items = G.stash.spec.uniq.filter(it => it.uniqueId === id);
      if (!items.length) return this.showTip(`<div class="tip-name c-unique">${u.name}</div><div class="tip-sub">${BASE_BY_ID[u.base].name}・還沒收集到</div>${u.boss ? `<div class="tip-mod" style="color:#a89878">只有首領「${BOSSES[u.boss] ? BOSSES[u.boss].name : u.boss}」會掉</div>` : ''}${u.flavor ? `<div class="tip-mod" style="color:#8a7a60;font-style:italic">${u.flavor}</div>` : ''}`, e.clientX, e.clientY);
      const cols = items.slice(0, 3).map((it, i) => `<div class="tipcol">${i ? '' : '<div class="tip-cmp">左鍵拿這件</div>'}${itemTipHTML(it)}</div>`).join('');
      this.showTip(`<div class="tipcols">${cols}</div>${items.length > 3 ? `<div class="thint" style="padding:4px">還有 ${items.length - 3} 件</div>` : ''}`, e.clientX, e.clientY);
    };
    d.onmousemove = e => this.moveTip(e); d.onmouseleave = () => this.hideTip();
  });
};
// 存入：傳奇一律進傳奇頁
const _depositU = UI.depositItem.bind(UI);
UI.depositItem = function (i) {
  const it = G.P.inv[i];
  if (it && !isStack(it) && !isFlask(it) && it.rarity === 'unique' && it.uniqueId) {
    specEnsure(G.stash); G.stash.spec.uniq.push(it); G.P.inv[i] = null;
    Sfx.play('equip'); this.msg(`${it.name} 放進倉庫的「傳奇」頁`, '#e8803a'); this.hideTip(); this.refreshInv(); this.refreshStash(); return saveGame();
  }
  return _depositU(i);
};
(() => { const st = document.createElement('style'); st.textContent = `#stashTabs .uqbtn { color:#ffb070; } .sprow.uq { grid-template-columns:repeat(auto-fill, minmax(96px, 1fr)); } .uqc.empty img { filter:brightness(0) opacity(.5); } .uqc.empty { opacity:.55; }`; document.head.appendChild(st); })();
