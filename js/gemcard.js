// =============================================================
//  v2.20.17 手機的技能說明卡（玩家反應：手機上技能介紹太小、不好按）
//  以前：手機點寶石＝選起來，同時在手指旁邊跳一個縮得很小的浮動說明（字只有 7～8 像素），還會擋住要點的格子
//  現在（只有手機／觸控；電腦版照舊用滑鼠移上去看說明）：
//   ・點寶石袋或技能欄上的任何寶石 → 畫面中間跳出一張「說明卡」：字用實際大小、可以捲動，下面一排大按鈕
//       技能寶石（寶石袋）：「裝到哪一格？」五顆按鈕（主・武器、2・胸甲……，寫出那格現在是什麼）、可以升級時多「升級」
//       技能寶石（技能欄）：「換到別格」、「拿下來」、「升級」、「自動升級／鎖住等級」
//       習慣（寶石袋）：列出能用它的技能，每顆按鈕寫裝上去之後每秒傷害變多少；按了就放進那個技能第一個空的小格
//       習慣（已裝上）：「換成別顆」（打開原本的習慣清單）、「拿下來」
//   ・點空的大格（技能孔）→ 同樣一張卡，列出寶石袋裡可以放的技能寶石，點一下就放進去（電腦也能用）
//   ・點卡片外面或右上角 ✕ 關掉；拖曳寶石照舊可以用
//  接點：ui.js 技能頁「點一下（沒有拖動）」時呼叫 GemCard.open；空的大格呼叫 GemCard.pickFor
//  資料：沒有存檔欄位
// =============================================================
const GemCard = (() => {
  let bg = null, at = null;
  function close() { if (bg) { bg.remove(); bg = null; at = null; } }
  const P_ = () => G.P;
  const rowName = i => `${skillKeyNames()[i]}・${UI.GEM_GEAR[i][1]}`;
  const btn = (attr, html, cls = '') => `<button class="gc-b ${cls}" ${attr}>${html}</button>`;
  // 說明：直接用原本的寶石說明（同一份文字），拿掉給電腦看的操作提示
  function info(payload) {
    const d = document.createElement('div'); d.innerHTML = UI.gemTip(payload);
    d.querySelectorAll('.tip-hint').forEach(x => x.remove());
    // 習慣的「可搭配」會列出全部職業的技能（很長）：收起來，要看再點開；能用在你哪個技能，下面的按鈕已經寫了
    d.querySelectorAll('.tip-mod').forEach(x => { if (/^可搭配：/.test(x.textContent)) {
      const det = document.createElement('details'); det.className = 'gc-fit';
      det.innerHTML = `<summary>所有可以搭配的技能（點一下展開）</summary><div>${x.textContent.replace(/^可搭配：/, '')}</div>`; x.replaceWith(det); } });
    return touchWords(d.innerHTML);
  }
  // 技能說明寫的是電腦的說法（滑鼠位置）；手機是自動瞄準，換成手機的說法
  const touchWords = h => isTouchCtl() ? h.replace(/滑鼠位置|游標位置/g, '瞄準的位置').replace(/滑鼠方向/g, '瞄準的方向').replace(/滑鼠附近/g, '瞄準的目標附近').replace(/滑鼠/g, '瞄準點') : h;
  // 習慣裝上去之後每秒傷害變多少（召喚、增益這類沒有每秒傷害的回傳 null）
  function supGain(i, id) {
    const P = P_(), sid = P.skills[i], n = linkSlots(P.lvl), cur = P.links[i].slice(0, n).filter(x => x);
    try { const a = calcSkill(G.S, sid, P.lvl, cur), b = calcSkill(G.S, sid, P.lvl, cur.concat(id)); if (a && b && a.dps > 0 && isFinite(b.dps)) return b.dps / a.dps - 1; } catch (e) { }
    return null;
  }
  const gainTxt = g => { if (g == null) return ''; const p = Math.round(g * 100); return p > 0 ? `<span class="gc-up">每秒傷害 +${p}%</span>` : p < 0 ? `<span class="gc-down">每秒傷害 ${p}%</span>` : '<span class="gc-mid">傷害不變</span>'; };
  const lvBtns = sid => {
    let h = '';
    if (gemCanLevel(sid)) h += btn(`data-gcup="${sid}"`, `升級到 ${gemLv(sid) + 1} 級`, 'gc-go');
    if (gemLv(sid) < GEM_MAX && SKILLS[sid]) h += btn(`data-gclock="${sid}"`, gemLocked(sid) ? '🔒 鎖住等級（點一下改回自動升級）' : '自動升級（點一下鎖住等級）');
    return h;
  };
  // 依寶石種類決定卡片下面的按鈕
  function actions(payload) {
    const P = P_(), [kind, a, b] = payload.split(':'), n = linkSlots(P.lvl);
    let h = '';
    if (kind === 'skill') {
      const lack = gemReqLack(a, gemLv(a));
      h += `<div class="gc-q">裝到哪一格？</div>`;
      if (lack) h += `<div class="gc-bad">現在裝不上去：${lack}</div>`;
      h += '<div class="gc-grid">' + UI.GEM_GEAR.map((g, i) => { const s = P.skills[i];
        return btn(`data-gcput="${i}" ${lack ? 'disabled' : ''}`, `<b>${rowName(i)}</b><small>${s ? `換掉 ${SKILLS[s].name}` : '空的'}</small>`); }).join('') + '</div>';
      h += lvBtns(a);
    } else if (kind === 'slot') {
      const i = +a, sid = P.skills[i];
      h += `<div class="gc-q">換到別格（兩格互換）</div><div class="gc-grid">` + UI.GEM_GEAR.map((g, j) => j === i ? '' : btn(`data-gcswap="${j}"`, `<b>${rowName(j)}</b><small>${P.skills[j] ? `和 ${SKILLS[P.skills[j]].name} 互換` : '空的'}</small>`)).join('') + '</div>';
      h += lvBtns(sid) + btn('data-gcoff="1"', '拿下來（放回寶石袋）', 'gc-warn');
    } else if (kind === 'sup') {
      const rows = UI.GEM_GEAR.map((g, i) => i).filter(i => P.skills[i] && supportFits(a, P.skills[i]));
      h += `<div class="gc-q">裝到哪個技能？</div>`;
      if (!rows.length) h += `<div class="gc-bad">技能欄上沒有能用這個習慣的技能。</div>`;
      else h += '<div class="gc-grid">' + rows.map(i => {
        const sid = P.skills[i], has = P.links[i].slice(0, n).includes(a), free = P.links[i].slice(0, n).filter(x => x).length < n;
        const why = has ? '已經裝了這顆' : !free ? '習慣孔滿了' : '';
        return btn(`data-gcsup="${i}" ${why ? 'disabled' : ''}`, `<b style="color:${SKILLS[sid].color}">${SKILLS[sid].name}</b><small>${why || gainTxt(supGain(i, a)) || rowName(i)}</small>`);
      }).join('') + '</div>';
    } else if (kind === 'link') {
      const sid = P.skills[+a];
      if (sid) h += `<div class="gc-q">裝在 <b style="color:${SKILLS[sid].color}">${SKILLS[sid].name}</b> 的第 ${+b + 1} 個小格</div>`;
      h += btn('data-gcswapsup="1"', '換成別顆', 'gc-go') + btn('data-gcoff="1"', '拿下來（放回寶石袋）', 'gc-warn');
    }
    return h;
  }
  function show(key, head, body, acts) {
    close();
    bg = document.createElement('div'); bg.id = 'gemCardBg'; at = key;
    bg.innerHTML = `<div id="gemCard"><button class="gc-x" data-gcx="1" aria-label="關閉">✕</button><div class="gc-body">${head}${body}</div><div class="gc-acts">${acts}</div></div>`;
    document.body.appendChild(bg);
    bg.addEventListener('pointerdown', e => { if (e.target === bg) { e.preventDefault(); close(); } });
    bg.querySelector('[data-gcx]').onclick = close;
  }
  const done = (txt) => { Sfx.play('equip'); close(); UI.refreshSkills(); if (txt) UI.msg(txt, '#9fe0b0'); };
  // 點寶石：說明卡
  function open(payload) {
    const P = P_(); if (!P) return;
    if (at === payload) return close();
    UI.hideTip(); if (typeof SupQuick !== 'undefined') SupQuick.close();
    const body = info(payload); if (!body) return;
    show(payload, '', body, actions(payload));
    const [kind, a, b] = payload.split(':'), q = s => bg.querySelectorAll(s);
    q('[data-gcput]').forEach(el => el.onclick = () => { const i = +el.dataset.gcput; UI.gemDrop('skill:' + a, 'skill:' + i); if (P.skills[i] === a) done(`${SKILLS[a].name} 裝到 ${rowName(i)}`); });
    q('[data-gcswap]').forEach(el => el.onclick = () => { const j = +el.dataset.gcswap; UI.gemDrop('slot:' + a, 'skill:' + j); done(); });
    q('[data-gcsup]').forEach(el => el.onclick = () => { const i = +el.dataset.gcsup, n = linkSlots(P.lvl); let k = 0; while (k < n && P.links[i][k]) k++;
      if (k >= n) return UI.msg('這個技能的習慣孔滿了', '#ff9a9a');
      UI.gemDrop('sup:' + a, `sup:${i}:${k}`); if (P.links[i][k] === a) done(`${SUPPORTS[a].name} 裝到 ${SKILLS[P.skills[i]].name}`); });
    q('[data-gcoff]').forEach(el => el.onclick = () => { if (kind === 'slot') UI.gemRemove('slot:' + a); else UI.setSocket(+a, +b, null); done(); });
    q('[data-gcswapsup]').forEach(el => el.onclick = () => { close(); SupQuick.open(`sup:${a}:${b}`, null); });
    q('[data-gcup]').forEach(el => el.onclick = () => { gemLevelUp(el.dataset.gcup); UI.refreshSkills(); at = null; open(payload); });
    q('[data-gclock]').forEach(el => el.onclick = () => { const s = el.dataset.gclock; gemSetLock(s, !gemLocked(s)); UI.refreshSkills(); at = null; open(payload); });
  }
  // 點空的大格：從寶石袋挑一顆放進來
  function pickFor(i) {
    const P = P_(); if (!P) return;
    const key = 'pick:' + i; if (at === key) return close();
    UI.hideTip(); if (typeof SupQuick !== 'undefined') SupQuick.close();
    const used = new Set(P.skills.filter(x => x));
    const ids = Object.keys(SKILLS).filter(s => hasSkillGem(P, s) && !used.has(s)).sort((x, y) => SKILLS[x].lvl - SKILLS[y].lvl);
    const head = `<div class="tip-name">${rowName(i)}：放哪一顆技能？</div>`;
    const body = ids.length ? '<div class="gc-list">' + ids.map(s => { const lack = gemReqLack(s, gemLv(s));
      return btn(`data-gcpick="${s}" ${lack ? 'disabled' : ''}`, `<img src="${skillIconURL(s, 64)}"><span><b style="color:${SKILLS[s].color}">${SKILLS[s].name}</b>　Lv ${gemLv(s)}<small>${lack ? `<span class="gc-bad">${lack}</span>` : touchWords(String(SKILLS[s].desc || '').split('<br>')[0])}</small></span>`, 'gc-row'); }).join('') + '</div>'
      : '<div class="gc-dim">寶石袋裡沒有別的技能寶石了。升級、打首領會拿到新的。</div>';
    show(key, head, body, '');
    bg.querySelectorAll('[data-gcpick]').forEach(el => el.onclick = () => { const s = el.dataset.gcpick; UI.gemDrop('skill:' + s, 'skill:' + i); if (P.skills[i] === s) done(`${SKILLS[s].name} 裝到 ${rowName(i)}`); });
  }
  Hook.on('enterMap', close);
  (() => {
    const st = document.createElement('style');
    st.textContent = `#gemCardBg { position:fixed; inset:0; z-index:62; background:rgba(0,0,0,.55); display:flex; align-items:flex-start; justify-content:center; padding-top:calc(var(--vtop, 0px) + 8px); box-sizing:border-box; }
    #gemCard { position:relative; display:flex; flex-direction:column; width:min(600px, calc(100vw - 16px)); max-height:calc(var(--vh, 100vh) - 16px); background:rgba(14,10,8,.98); border:1px solid #9a7a42; border-radius:8px; box-shadow:0 8px 30px rgba(0,0,0,.8); color:#e8dcc0; font-size:14px; }
    #gemCard .gc-body { overflow-y:auto; padding:10px 46px 8px 14px; -webkit-overflow-scrolling:touch; }
    #gemCard .tip-name { font-size:18px; text-align:left; } #gemCard .tip-name .skico { width:32px; height:32px; vertical-align:-9px; }
    #gemCard .tip-sub, #gemCard .tip-req { font-size:13px; text-align:left; } #gemCard .tip-mod { font-size:14px; text-align:left; line-height:1.6; margin:3px 0; }
    #gemCard .gc-x { position:absolute; right:4px; top:4px; width:40px; height:40px; background:none; border:none; color:#c8b898; font-size:20px; cursor:pointer; z-index:1; }
    #gemCard .gc-acts { flex:none; display:flex; flex-wrap:wrap; gap:6px; padding:8px 10px 10px; border-top:1px solid #3a3020; } #gemCard .gc-acts:empty { display:none; }
    #gemCard .gc-q { width:100%; font-size:13px; color:#d8c8a0; } #gemCard .gc-grid { width:100%; display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:6px; }
    #gemCard .gc-b { min-height:42px; padding:5px 12px; font:inherit; font-size:14px; color:#f0e4c8; background:rgba(60,44,24,.9); border:1px solid #8a6a3a; border-radius:5px; cursor:pointer; text-align:left; }
    #gemCard .gc-b small { display:block; font-size:12px; color:#b8a888; margin-top:1px; } #gemCard .gc-b:disabled { opacity:.45; }
    #gemCard .gc-b.gc-go { background:rgba(40,70,40,.92); border-color:#6aa060; } #gemCard .gc-b.gc-warn { background:rgba(70,34,30,.9); border-color:#a06050; }
    #gemCard .gc-list { display:flex; flex-direction:column; gap:6px; margin-top:8px; } #gemCard .gc-row { display:flex; align-items:center; gap:10px; width:100%; }
    #gemCard .gc-row img { width:36px; height:36px; image-rendering:pixelated; flex:none; }
    #gemCard .gc-bad { color:#ff9a8a; font-size:13px; width:100%; } #gemCard .gc-dim { color:#a89878; padding:8px 0; }
    @media (min-aspect-ratio: 3/2) {   /* 手機橫拿（又寬又矮）：左邊說明、右邊按鈕，說明才不會被擠到只剩幾行 */
      #gemCard { flex-direction:row; width:min(780px, calc(100vw - 16px)); }
      #gemCard .gc-body { flex:1 1 56%; padding-right:10px; }
      #gemCard .gc-acts { flex:0 0 42%; box-sizing:border-box; align-content:flex-start; overflow-y:auto; border-top:none; border-left:1px solid #3a3020; padding:50px 10px 10px; }
      #gemCard .gc-acts > .gc-b { width:100%; }
      #gemCard .gc-grid { grid-template-columns:1fr 1fr; }
    }
    #gemCard .gc-fit { margin-top:6px; color:#a89878; font-size:13px; line-height:1.6; } #gemCard .gc-fit summary { cursor:pointer; padding:6px 0; color:#c8b898; }
    #gemCard .gc-up { color:#8fe08f; } #gemCard .gc-down { color:#ff9a8a; } #gemCard .gc-mid { color:#a89878; }`;
    document.head.appendChild(st);
  })();
  return { open, pickFor, close, get openAt() { return at; } };
})();
