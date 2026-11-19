// =============================================================
//  v2.20 目標行：劇情、確認框、選擇框最後一行寫清楚「接下來要做什麼」
//  ・玩家看到：劇情播到最後一頁，文字下面有一條金色小標題「目標」＋一句話
//      例：「目標　找齊王的詔書（1 / 3）——另外兩片在第 1 夜的第 2 區」「目標（選修）　90 秒內打倒腐骨之王」
//      已經完成的（讀文字、說完話、帶話回報）寫「已記進日誌　夢裡的故事」，不會留白
//    同一個目標在進行中時，也會出現在小地圖下方的狀態列（「目標：……」），完成就消失（StatusLines，core.js）
//  ・怎麼接：
//      STORY[代號].goal = '文字' | { t, opt, done } | (P, 代號) => 上面兩種  （播放器在最後一頁自動顯示）
//      Goal.add(代號 => 目標 | null)       沒寫 goal 的劇情，由各模組依代號判斷（例：chapevents.js 的 chev_*）
//      gameAsk(文字, 確定, { goal })         確認框底下多一條目標（ui.js）
//      Goal.html(目標)                      任何視窗都能塞的 HTML（選擇框的說明文字也能用）
//      Goal.live(() => 目標 | null)          進行中的目標放進狀態列
//    目標可以是陣列（多條，例如主要＋選修）
//  ・主線記憶（STORY_ORDER）沒寫目標時：顯示目前主線任務的下一步
// =============================================================
Object.assign(Goal, {   // Goal.add／Goal.live 的登記在 core.js（所有模組載入時就能用）
  norm(g) {
    if (!g) return [];
    if (Array.isArray(g)) return g.flatMap(x => this.norm(x));
    if (typeof g === 'string') return [{ t: g }];
    return g.t ? [g] : [];
  },
  head: g => g.done ? '已記進日誌' : g.opt ? '目標（選修）' : '目標',
  html(g) {
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return this.norm(g).map(x => `<div class="goalrow${x.done ? ' done' : ''}"><b>${this.head(x)}</b><span>${esc(typeof ctlText === 'function' ? ctlText(x.t, true) : x.t)}</span></div>`).join('');
  },
  // 狀態列用的一行字
  text(g) { const x = this.norm(g)[0]; return x ? `${this.head(x)}：${typeof ctlText === 'function' ? ctlText(x.t, true) : x.t}` : ''; },
  forStory(key) {
    const s = STORY[key]; if (!s) return null;
    let g = s.goal; if (typeof g === 'function') { try { g = g(G.P, key); } catch (e) { console.error('[Goal]', e); g = null; } }
    if (g) return g;
    for (const f of this.fns) { let r = null; try { r = f(key); } catch (e) { console.error('[Goal]', e); } if (r) return r; }
    if (typeof STORY_ORDER !== 'undefined' && STORY_ORDER.includes(key)) return this.mainStep();
    return null;
  },
  // 目前主線任務的下一步（quests.js）
  mainStep() {
    const P = G.P; if (!P || typeof Quest === 'undefined') return null;
    const q = Quest.state(P), ch = QUESTS[q.ch]; if (!ch) return null;
    const i = ch.steps.findIndex((st, k) => !q.done[Quest.key(q.ch, st, k)]);
    return i < 0 ? null : { t: ch.steps[i].text };
  },
  // 把目標行放在某個元素的後面（沒有目標就清掉）
  into(el, g) {
    if (!el) return;
    let host = el.nextElementSibling; if (!host || !host.classList.contains('goalhost')) { host = document.createElement('div'); host.className = 'goalhost'; el.after(host); }
    const h = this.html(g); host.innerHTML = h; host.style.display = h ? '' : 'none';
  },
  // 劇情視窗：最後一頁才顯示（ui.js renderStory 呼叫）
  story(key, last) { this.into(document.getElementById('storyText'), last ? this.forStory(key) : null); },
  // 狀態列的一行（Goal.live 用）
  line(g) { const x = this.norm(g)[0]; return x ? { t: this.text(x), c: x.c || '#ffd36a' } : null; },
});
(() => {
  const st = document.createElement('style');
  st.textContent = `.goalhost { margin-top:14px; display:flex; flex-direction:column; gap:6px; text-align:left; }
  .goalrow { display:flex; gap:10px; align-items:baseline; padding:7px 10px; border:1px solid rgba(242,214,146,.45); border-radius:4px; background:rgba(242,214,146,.08); font-size:14px; line-height:1.5; color:#f0e6cc; white-space:normal; }
  .goalrow b { flex:none; color:#ffd36a; font-size:12px; letter-spacing:1px; }
  .goalrow.done { border-color:rgba(160,200,150,.4); background:rgba(160,200,150,.07); }
  .goalrow.done b { color:#b8e0a8; }
  .gask-text + .goalhost { margin:10px 0 4px; }`;
  document.head.appendChild(st);
})();
