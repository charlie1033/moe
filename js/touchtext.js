// =============================================================
//  v2.18.2 手機（觸控）版的說法：index.html 和資料檔裡寫死的鍵盤說明（右鍵、Ctrl、按 T、（K）……），
//  在手機上換成點按的說法。電腦版完全不動。
//  ・背包、技能頁、天賦樹上方的小字說明；面板標題的按鍵字母（技能寶石（K）→ 技能寶石）
//  ・回營的燈的說明（data.js 載入時還不知道是不是手機，所以在這裡換）
//  ・操作說明（H）：手機操作那段補上「設定・存檔」；下面的鍵盤操作（「移動與戰鬥」到「存檔」之前）收進一個可以展開的「電腦鍵盤操作」
//  動態產生的文字（訊息、物品說明、任務提示）用 settings.js 的 ctl()／ctlText()／byCtl()，不在這裡
//  載入順序：要在 data.js、render.js 之後（用到 CURRENCY、IS_TOUCH）
// =============================================================
(() => {
  if (typeof IS_TOUCH === 'undefined' || !IS_TOUCH) return;
  const $q = s => document.querySelector(s);
  const set = (s, html) => { const e = $q(s); if (e) e.innerHTML = html; };
  set('#inv > .ihint', '點一下物品看說明，同一格再點一下＝選取，用跳出來的按鈕<b>裝備／卸下／賣出／存倉庫</b>；要分解就先按上方的「分解」<br>夢的材料：點它，再點要改造的裝備（再點一次它取消）　回營的燈：點它就回營地');
  set('#skills > .ihint', '點一下寶石袋裡的寶石（會亮框），再點裝備旁邊的<b>大格</b>（技能）或<b>小格</b>（習慣）就放進去；點已經放上的寶石、再點寶石袋＝拿下來。等級越高小格越多');
  set('#tree .ph .thint', '<span class="tseg">點天賦 → 按下方的「點這個天賦」</span><span class="tseg">「確認加點」前都能免費改</span><span class="tseg">一指拖曳・兩指縮放</span>');   // v2.19.7 分段：只在段落之間換行（.tseg 在 treeplan.js）
  // 面板標題的按鍵字母
  for (const id of ['skills', 'craft', 'journal']) { const h = $q(`#${id} > .ph`); if (h && h.firstChild && h.firstChild.nodeType === 3) h.firstChild.textContent = h.firstChild.textContent.replace(/（[A-Z]）/, ''); }
  if (typeof CURRENCY !== 'undefined' && CURRENCY.portal) CURRENCY.portal.desc = '在地圖裡點它（或點右上角的「回城」鈕）：原地詠唱 1.6 秒後打開傳送門，走進去回營地，之後可以從營地的藍色傳送門回到同一張地圖繼續打。';
  // 操作說明：手機那段補一句；鍵盤操作收起來
  const t = $q('#help .tonly');
  if (t) {
    t.insertAdjacentHTML('beforeend', '<br>右上 ☰ →「設定・存檔」：設定、存檔、回到選角畫面（電腦版的 Esc）');
    const box = document.createElement('details'); box.className = 'kbhelp';
    box.innerHTML = '<summary>電腦鍵盤操作（手機用不到，點一下展開）</summary>';
    while (t.nextSibling && !(t.nextSibling.tagName === 'H4' && t.nextSibling.textContent === '存檔')) box.appendChild(t.nextSibling);   // 移動與戰鬥、介面（按鍵）兩段
    t.after(box);
    // 「介面」「怎麼玩」裡剩下的按鍵（<kbd>P</kbd> 之類）換成手機的點法
    const KB = { P: '☰ → 天賦', K: '☰ → 技能', I: '☰ → 背包', J: '☰ → 日誌', C: '☰ → 角色', B: '☰ → 強化', H: '☰ → 說明', T: '☰ → 回城', F: '「對話」鈕' };
    document.querySelectorAll('#help .hb kbd').forEach(k => {
      if (k.closest('.kbhelp') || !KB[k.textContent]) return;
      const p = k.previousSibling; if (p && p.nodeType === 3) p.textContent = p.textContent.replace(/按 ?$/, '點 ');
      k.textContent = KB[k.textContent];
    });
    const st = document.createElement('style'); st.textContent = `.kbhelp summary { cursor:pointer; color:#c8a868; padding:6px 0; } .kbhelp[open] summary { color:#ffd36a; }`; document.head.appendChild(st);
  }
})();
