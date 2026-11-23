// =============================================================
//  v2.19.14 習慣快速安裝（玩家反應：裝習慣要拖來拖去、也看不出哪顆比較好）
//  玩家看到（技能頁 K）：
//   ・點技能旁邊的小格（習慣孔）→ 跳出一張小清單：這個技能能用、你身上或倉庫有的習慣
//     推薦的排前面，每一顆寫出裝上去之後每秒傷害變多少（例：「每秒傷害 +18%」）、一句說明、還有幾顆；點一下就裝上
//   ・點已經裝好的習慣 → 同一張清單，最上面多「拿下來」，點別顆就是直接換掉
//   ・每個技能那一列多一顆「補滿推薦」：把空的習慣孔照推薦順序一次裝好（只用推薦的、不會放同一顆兩次）
//   ・原本的拖曳、「點寶石再點孔」照舊可以用（手上選著寶石時，點孔就是直接放，不會跳清單）
//  接點：ui.js 空孔的 onclick、已裝寶石點一下（gemDragStart 沒拖動）時呼叫 SupQuick.open；Hook 'skillsPanel' 加按鈕
//  裝上去用 UI.gemDrop／拿下用 UI.setSocket（跟原本一樣扣背包、不夠從倉庫拿）
// =============================================================
const SupQuick = (() => {
  let box = null, at = null;
  const firstLine = s => String(s || '').split('<br>')[0];
  function close() { if (box) { box.remove(); box = null; at = null; } }
  // 裝上 links 之後這個技能每秒傷害（召喚、增益這類沒有每秒傷害的回傳 null）
  function dps(i, links) {
    const P = G.P, sid = P.skills[i];
    try { const c = calcSkill(G.S, sid, P.lvl, links); return c && isFinite(c.dps) && c.dps > 0 ? c.dps : null; } catch (e) { return null; }
  }
  // 第 i 個技能、第 k 個習慣孔可以放哪些：推薦的在前，再照傷害提升排
  function choices(i, k) {
    const P = G.P, sid = P.skills[i], n = linkSlots(P.lvl);
    const others = P.links[i].slice(0, n).filter((x, j) => x && j !== k);
    const d0 = dps(i, others);
    return Object.keys(SUPPORTS).filter(id => supHave(id) > 0 && supportFits(id, sid) && !others.includes(id)).map(id => {
      const d = d0 ? dps(i, others.concat(id)) : null;
      return { id, good: typeof supGoodFor === 'function' ? supGoodFor(id, sid) : true, gain: d0 && d ? d / d0 - 1 : null, have: supHave(id) };
    }).sort((a, b) => {   // 推薦又不會讓傷害變少的排最前面，接著照傷害提升
      const top = c => c.good && !(c.gain < 0) ? 1 : 0;
      return (top(b) - top(a)) || ((b.gain == null ? -9 : b.gain) - (a.gain == null ? -9 : a.gain));
    });
  }
  function gainTxt(g) {
    if (g == null) return '';
    const p = Math.round(g * 100);
    return p > 0 ? `<span class="sq-up">每秒傷害 +${p}%</span>` : p < 0 ? `<span class="sq-down">每秒傷害 ${p}%</span>` : '<span class="sq-mid">傷害不變</span>';
  }
  function open(drop, anchor) {
    const P = G.P; if (!P) return;
    const [, a, b] = drop.split(':'), i = +a, k = +b, sid = P.skills[i];
    if (at === drop) return close();   // 再點一次同一格＝關掉
    close(); UI.hideTip();
    const cur = P.links[i][k];
    let h = `<div class="sq-head">${sid ? `<b style="color:${SKILLS[sid].color}">${SKILLS[sid].name}</b>　第 ${k + 1} 個習慣孔` : '這一列還沒有技能'}<button class="sq-x" data-sqx="1">✕</button></div>`;
    if (!sid) h += `<div class="sq-empty">${byCtl('先把技能寶石拖到這一列的大格', '先點技能寶石，再點這一列的大格')}，習慣才有東西可以輔助。</div>`;
    else {
      if (cur) h += `<div class="sq-cur"><img src="${supportIconURL(cur, 32)}"><span>現在：<b style="color:${SUPPORTS[cur].color}">${SUPPORTS[cur].name}</b></span><button data-sqoff="1">拿下來</button></div>`;
      const L = choices(i, k).filter(c => c.id !== cur);
      if (!L.length) h += `<div class="sq-empty">${cur ? '沒有別顆適合這個技能的習慣可以換。' : '沒有適合這個技能的習慣。'}打怪會掉，首領一定掉 2 個。</div>`;
      for (const c of L) {
        const sp = SUPPORTS[c.id];
        h += `<button class="sq-row" data-sq="${c.id}"><img src="${supportIconURL(c.id, 32)}"><span class="sq-txt"><b style="color:${sp.color}">${sp.name}</b>${c.good ? '<i class="sq-rec">推薦</i>' : ''}${gainTxt(c.gain)}<small>${firstLine(sp.desc)}</small></span><span class="sq-n">×${c.have}</span></button>`;
      }
    }
    box = document.createElement('div'); box.id = 'supQuick'; box.innerHTML = h; at = drop;
    document.body.appendChild(box);
    // 位置：電腦放在格子旁邊；手機（窄螢幕）放在畫面下半部置中
    const r = anchor && anchor.getBoundingClientRect(), W = innerWidth, H = innerHeight, bw = box.offsetWidth, bh = box.offsetHeight;
    if (W < 700 || !r) { box.style.left = Math.max(8, (W - bw) / 2) + 'px'; box.style.top = Math.max(8, H - bh - 12) + 'px'; }
    else { box.style.left = Math.min(W - bw - 8, r.right + 8) + 'px'; box.style.top = Math.max(8, Math.min(H - bh - 8, r.top - 20)) + 'px'; }
    box.querySelector('[data-sqx]').onclick = close;
    box.querySelectorAll('[data-sq]').forEach(el => el.onclick = () => { UI.gemDrop('sup:' + el.dataset.sq, `sup:${i}:${k}`); Sfx.play('equip'); close(); UI.refreshSkills(); });
    const off = box.querySelector('[data-sqoff]'); if (off) off.onclick = () => { UI.setSocket(i, k, null); close(); UI.refreshSkills(); };
  }
  // 補滿推薦：空孔照順序放推薦的第一名
  function fill(i) {
    const P = G.P, n = linkSlots(P.lvl); let put = 0;
    for (let k = 0; k < n; k++) {
      if (P.links[i][k]) continue;
      const c = choices(i, k).find(x => x.good && (x.gain == null || x.gain > 0));
      if (!c) break;
      UI.gemDrop('sup:' + c.id, `sup:${i}:${k}`); if (P.links[i][k] === c.id) put++;
    }
    if (put) { Sfx.play('equip'); UI.msg(`裝上了 ${put} 個推薦的習慣`, '#9fe0b0'); } else UI.msg('沒有可以補的推薦習慣', '#d8c8a0');
    close(); UI.refreshSkills();
  }
  function canFill(i) {
    const P = G.P, n = linkSlots(P.lvl); if (!P.skills[i]) return false;
    for (let k = 0; k < n; k++) if (!P.links[i][k]) return choices(i, k).some(x => x.good && (x.gain == null || x.gain > 0));
    return false;
  }
  Hook.on('skillsPanel', root => {
    if (box && !(at && UI.open.skills)) close();
    root.querySelectorAll('#skillSlots .gearrow').forEach((row, i) => {
      if (!canFill(i)) return;
      const s = row.querySelector('.gsocks'); if (!s) return;
      const b = document.createElement('button'); b.className = 'sq-fill'; b.textContent = '補滿推薦'; b.title = '把空的習慣孔照推薦一次裝好';
      b.onclick = e => { e.stopPropagation(); fill(i); }; s.appendChild(b);
    });
  });
  Hook.on('update', () => { if (box && !UI.open.skills) close(); });
  document.addEventListener('pointerdown', e => { if (box && !box.contains(e.target) && !(e.target.closest && e.target.closest('[data-drop^="sup:"],[data-gem^="link:"]'))) close(); }, true);
  (() => {
    const st = document.createElement('style');
    st.textContent = `#supQuick { position:fixed; z-index:60; width:300px; max-width:calc(100vw - 16px); max-height:min(420px, 70vh); overflow:auto; background:rgba(18,14,10,.97); border:1px solid #8a6a3a; border-radius:6px; box-shadow:0 6px 24px rgba(0,0,0,.7); padding:6px; font-size:13px; color:#e8dcc0; }
    #supQuick .sq-head { display:flex; align-items:center; gap:4px; padding:2px 4px 6px; border-bottom:1px solid #3a3020; margin-bottom:4px; }
    #supQuick .sq-x { margin-left:auto; background:none; border:none; color:#a89878; font-size:15px; cursor:pointer; padding:0 4px; }
    #supQuick .sq-cur { display:flex; align-items:center; gap:6px; padding:4px; margin-bottom:4px; background:rgba(255,255,255,.04); border-radius:4px; }
    #supQuick .sq-cur button { margin-left:auto; font-size:12px; padding:2px 8px; cursor:pointer; }
    #supQuick img { width:28px; height:28px; image-rendering:pixelated; flex:none; }
    #supQuick .sq-row { display:flex; align-items:center; gap:6px; width:100%; text-align:left; background:none; border:1px solid transparent; border-radius:4px; color:inherit; padding:4px; cursor:pointer; font:inherit; }
    #supQuick .sq-row:hover, #supQuick .sq-row:active { background:rgba(255,220,140,.08); border-color:#6a5a3a; }
    #supQuick .sq-txt { flex:1; min-width:0; line-height:1.4; } #supQuick .sq-txt small { display:block; color:#a89878; font-size:11px; }
    #supQuick .sq-rec { font-style:normal; font-size:10px; color:#1a1408; background:#d8b860; border-radius:3px; padding:0 4px; margin-left:5px; vertical-align:1px; }
    #supQuick .sq-up, #supQuick .sq-down, #supQuick .sq-mid { font-size:11px; margin-left:6px; } .sq-up { color:#8fe08f; } .sq-down { color:#ff9a8a; } .sq-mid { color:#a89878; }
    #supQuick .sq-n { color:#a89878; font-size:11px; flex:none; } #supQuick .sq-empty { color:#a89878; padding:6px 4px; line-height:1.6; }
    .sq-fill { margin-left:6px; font-size:11px; padding:1px 7px; cursor:pointer; background:rgba(40,52,30,.85); color:#c8f0b0; border:1px solid #5a7a4a; border-radius:3px; vertical-align:middle; align-self:center; }`;
    document.head.appendChild(st);
  })();
  return { open, close, fill, choices, get openAt() { return at; } };
})();
