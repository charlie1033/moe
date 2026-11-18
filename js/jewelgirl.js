// =============================================================
//  v2.17 小雀的寶石盒（取代已經拿掉的珠寶工坊和 G 鍵）
//  ・玩家看到：在營地跟小雀說話（F）→ 左邊打開「小雀的寶石盒」，列出身上所有珠寶（背包＋倉庫不算，只算背包）
//    每一種同階珠寶一列：圖示、名稱、效果、數量、「合成」按鈕（3 顆同種同階 → 1 顆高一階，最高第 8 階「神聖」）
//    「全部合成」：能合的一路合到不能合為止（低階先合，合出來的再往上合）
//  ・鑲嵌還是自己來：在背包點珠寶選起來，再點有空孔的裝備（jewels2.js）；這裡只放一行說明
//  ・走離小雀超過 140 像素或離開營地就自動關掉
//  ・資料：沒有新存檔欄位，讀寫 G.P.jewels（其實是背包裡的珠寶堆疊，見 stacks.js），合成用 jewels2.js 的 combineJewel
//  ・接法：story.js 小雀的 panel 是 'jewelbox'，UI.toggle 會開關 #jewelbox（這個檔自己建立）
// =============================================================
(() => {
  const box = document.createElement('div');
  box.id = 'jewelbox'; box.className = 'panel';
  box.innerHTML = '<div class="ph">小雀的寶石盒　<span class="thint">三顆一樣的，變成更漂亮的一顆</span><span class="x" id="jbclose">✕</span></div><div id="jewelboxBody"></div>';
  document.body.appendChild(box);
  box.querySelector('#jbclose').onclick = () => UI.toggle('jewelbox', false);
  const st = document.createElement('style');
  st.textContent = `#jewelbox { left:8px; top:8px; width:460px; max-width:calc(100vw - 16px); max-height:calc(100vh - 16px); overflow:auto; }
  .jbrow { display:flex; align-items:center; gap:8px; padding:4px 10px; border-top:1px solid #2a2218; font-size:13px; color:#e8dcc0; }
  .jbrow img { width:28px; height:28px; } .jbrow .jbn { flex:1; } .jbrow .jbn small { display:block; color:#a89878; font-size:11px; }
  .jbrow b { min-width:34px; text-align:right; color:#fff0c0; } .jbrow button { padding:3px 10px; }
  .jbtop { display:flex; align-items:center; gap:8px; padding:6px 10px; }`;
  document.head.appendChild(st);
})();
UI.open.jewelbox = false;
// 背包裡的珠寶：種類照 JEWELS 的順序、階級由低到高
function jewelBoxList() {
  const J = G.P.jewels || {}, types = Object.keys(JEWELS), out = [];
  for (const k in J) if (J[k] > 0) out.push(k);
  return out.sort((a, b) => { const x = parseJewel(a), y = parseJewel(b); return types.indexOf(x.type) - types.indexOf(y.type) || x.grade - y.grade; });
}
const jewelCanCombine = k => parseJewel(k).grade < 8 && (G.P.jewels[k] || 0) >= JEWEL_COMBINE;
function jewelBoxCombineAll() {
  let n = 0, guard = 500, k;
  while (guard-- > 0 && (k = jewelBoxList().find(jewelCanCombine))) {
    const j = parseJewel(k), nk = jewelKey(j.type, j.grade + 1);
    G.P.jewels[k] -= JEWEL_COMBINE; G.P.jewels[nk] = (G.P.jewels[nk] || 0) + 1; n++;
  }
  if (!n) return UI.msg('現在沒有可以合成的珠寶（要 3 顆同種同階）', '#d8c8a0');
  Sfx.play('unique'); UI.msg(`小雀：「好了！」合成了 ${n} 次`, '#e8c890');
  UI.refreshInv(); saveGame();
}
UI.refreshJewelBox = function () {
  const body = document.getElementById('jewelboxBody'); if (!body || !this.open.jewelbox || !G.P) return;
  const list = jewelBoxList(), any = list.some(jewelCanCombine);
  let h = `<div class="ihint">鑲嵌要自己來：在背包點一顆珠寶，再點有空孔的裝備（鑲上去就拿不下來）。合成只算背包裡的珠寶。</div>`;
  h += `<div class="jbtop"><button id="jball" ${any ? '' : 'disabled'}>全部合成</button><span class="thint">能合的一路往上合</span></div>`;
  if (!list.length) h += '<div class="ihint">「你身上沒有亮晶晶的石頭耶。」</div>';
  for (const k of list) {
    const n = G.P.jewels[k], ok = jewelCanCombine(k), top = parseJewel(k).grade >= 8;
    h += `<div class="jbrow"><img src="${jewelIconURL(k)}"><span class="jbn" style="color:${JEWELS[parseJewel(k).type].color}">${jewelName(k)}<small>${jewelText(k)}</small></span><b>×${n}</b>
      <button data-jbk="${k}" ${ok ? '' : 'disabled'} title="${top ? '已經是最高階' : `${JEWEL_COMBINE} 顆合成 1 顆高一階`}">${top ? '最高階' : `合成（${JEWEL_COMBINE}→1）`}</button></div>`;
  }
  body.innerHTML = h;
  const all = document.getElementById('jball'); if (all) all.onclick = () => { jewelBoxCombineAll(); this.refreshJewelBox(); };
  body.querySelectorAll('[data-jbk]').forEach(b => b.onclick = () => { combineJewel(b.dataset.jbk); this.refreshJewelBox(); });
};
// 打開時、背包裡的珠寶數量變了（撿到、合成）就重畫；走遠了、離開營地就關
let _jbSig = '';
Hook.on('update', () => {
  if (!UI.open.jewelbox) { _jbSig = ''; return; }
  const w = G.world, n = w && w.npcs && w.npcs.find(x => x.panel === 'jewelbox');
  if (!n || dist(G.pl, n) > 140) return UI.toggle('jewelbox', false);
  const sig = jewelBoxList().map(k => k + ':' + G.P.jewels[k]).join(',') || '-';
  if (sig !== _jbSig) { _jbSig = sig; UI.refreshJewelBox(); }
});
