// =============================================================
//  進化圖鑑：讓玩家知道「技能型傳奇」存在
//  玩家看到：技能頁（K）每個裝上的技能旁邊多一個小方格——還沒撿過對應的傳奇是「？」，撿過就亮出那件傳奇的圖示
//    （滑鼠移上去看說明；手機點一下會捲到下面的圖鑑那一列）
//    技能頁最下面多一區「進化圖鑑」：「召喚骷髏 ＋ ？ ＝ ？？？」，撿過就顯示傳奇名稱和效果
//    一件傳奇對應好幾個技能的（回音箭袋、震地拳套、毒牙手套、居合之鞘、影步之靴），不放在技能旁邊，放在圖鑑最後一區
//  「撿過」＝這件傳奇曾經出現在任何角色的背包、身上或倉庫（整個帳號只要一次）
//    判斷：讀角色時掃身上、背包、倉庫；之後每秒掃一次身上和背包（不用改撿東西的程式）
//  資料：G.stash.uniqFound = { 傳奇id: true }（倉庫存檔，全帳號共用）
//  接點：ui.js 技能頁的每一列呼叫 EvoCodex.cell(技能)，畫完發 Hook 'skillsPanel'
// =============================================================
const EVO_MAP = {   // 傳奇 id → 技能代號（技能頁那一格用）
  u_fuse: 'skel', u_flamecrown: 'fireball', u_frostheart: 'nova', u_rootbelt: 'thorn', u_shardboots: 'bonespear',
  u_ravenheart: 'spirit', u_colossus: 'golem', u_wolfking: 'wolf', u_thunderring: 'arc', u_meteoreye: 'meteor',
  u_icecore: 'icespear', u_galeboots: 'whirl', u_warhorn: 'warcry', u_hundredshade: 'knives', u_rainstring: 'rain',
};
const EVO_MULTI = {   // 一件對應好幾個技能：圖鑑最後一區
  u_echoquiver: '所有射箭的技能', u_quakefist: '所有近戰技能', u_fanggloves: '會讓敵人中毒的技能',
  u_sheath: '武士的空白鍵位移', u_shadowstep: '翻滾與位移技能',
};
const EvoCodex = {
  found() { if (!G.stash) return {}; return G.stash.uniqFound || (G.stash.uniqFound = {}); },
  bySkill(sid) { for (const u in EVO_MAP) if (EVO_MAP[u] === sid && UNIQUE_BY_ID[u]) return UNIQUE_BY_ID[u]; return null; },
  effect(u) { const f = u.mods && u.mods[0] && u.mods[0][0]; return f && STAT_TEXT[f] ? STAT_TEXT[f]() : ''; },
  note(it) { if (it && it.rarity === 'unique' && it.uniqueId) { const F = this.found(); if (!F[it.uniqueId]) { F[it.uniqueId] = true; return true; } } return false; },
  scan(all) {
    const P = G.P; if (!P || !G.stash) return;
    let nw = false;
    for (const k in P.equip || {}) nw = this.note(P.equip[k]) || nw;
    for (const it of P.inv || []) nw = this.note(it) || nw;
    if (all) { for (const t of G.stash.tabs || []) for (const it of t || []) nw = this.note(it) || nw; for (const it of (G.stash.spec && G.stash.spec.uniq) || []) nw = this.note(it) || nw; }
    return nw;
  },
  icon(u) { return `<img src="${itemIconURL(BASE_BY_ID[u.base], 64)}" alt="">`; },
  // 技能頁每一列旁邊的小方格
  cell(sid) {
    const u = this.bySkill(sid); if (!u) return '';
    const on = !!this.found()[u.id];
    const tip = on ? `${SKILLS[sid].name} ＋ ${u.name} ＝ ${this.effect(u)}` : `${SKILLS[sid].name} ＋ ？ ＝ ？？？（有一件傳奇會改變這個技能的玩法）`;
    return `<span class="evocell ${on ? 'on' : ''}" data-evo="${sid}" title="${tip}">${on ? this.icon(u) : '？'}</span>`;
  },
  html() {
    const F = this.found(), all = Object.keys(EVO_MAP).concat(Object.keys(EVO_MULTI)).filter(id => UNIQUE_BY_ID[id]);
    let h = `<div class="csec2">進化圖鑑　<span class="thint">已點亮 ${all.filter(id => F[id]).length} / ${all.length}　穿上對應的傳奇，技能的玩法就會改變；撿到過一次就會亮起來（全帳號共用）</span></div>`;
    const row = (left, leftIcon, id, key) => {
      const u = UNIQUE_BY_ID[id], on = !!F[id];
      return `<div class="evorow ${on ? 'on' : ''}" data-evorow="${key}"><span class="evoic">${leftIcon}</span><b>${left}</b><span class="evoplus">＋</span><span class="evocell ${on ? 'on' : ''}">${on ? this.icon(u) : '？'}</span><span class="evoplus">＝</span>`
        + (on ? `<span class="evotxt"><b class="c-unique">${u.name}</b>：${this.effect(u)}</span>` : `<span class="evotxt dim">？？？</span>`) + '</div>';
    };
    for (const id in EVO_MAP) { const sid = EVO_MAP[id]; if (!SKILLS[sid] || !UNIQUE_BY_ID[id]) continue; h += row(SKILLS[sid].name, `<img src="${skillIconURL(sid, 48)}" alt="">`, id, sid); }
    h += `<div class="evohead">不只一個技能</div>`;
    for (const id in EVO_MULTI) if (UNIQUE_BY_ID[id]) h += row(EVO_MULTI[id], '✦', id, id);
    return h;
  },
};
Hook.on('start', () => { EvoCodex.scan(true); });
let _evoT = 0;
Hook.on('update', dt => { if ((_evoT -= dt) > 0) return; _evoT = 1; if (EvoCodex.scan(false) && UI.open && UI.open.skills) UI.refreshSkills(); });
Hook.on('skillsPanel', root => {
  if (!root || !UI.open.skills) return;
  let box = document.getElementById('evoCodex');
  if (!box) { box = document.createElement('div'); box.id = 'evoCodex'; const bag = document.getElementById('gemBag'); if (bag) bag.after(box); else root.appendChild(box); }
  box.innerHTML = EvoCodex.html();
  root.querySelectorAll('#skillSlots .evocell[data-evo]').forEach(el => el.onclick = e => {
    e.stopPropagation(); const r = box.querySelector(`[data-evorow="${el.dataset.evo}"]`); if (!r) return;
    r.scrollIntoView({ block: 'center', behavior: 'smooth' }); r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash');
  });
});
(() => { const st = document.createElement('style'); st.textContent = `
  .evocell { flex:none; width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; border:1px dashed #6a5a40; border-radius:6px; color:#8a7a58; font-size:14px; background:#0b090d; cursor:pointer; }
  .evocell.on { border:1px solid #e8803a; box-shadow:0 0 6px rgba(232,128,58,.5); } .evocell img { width:26px; height:26px; pointer-events:none; }
  #evoCodex { padding:0 10px 10px; } .evorow { display:flex; align-items:center; gap:6px; padding:4px 2px; border-bottom:1px solid #221c16; font-size:12px; flex-wrap:wrap; }
  .evorow .evoic { width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; color:#c8a868; } .evorow .evoic img { width:26px; height:26px; }
  .evorow > b { min-width:70px; color:#d8ccb4; font-weight:normal; } .evoplus { color:#8a7a60; } .evotxt { flex:1 1 180px; color:#e8dcc0; } .evotxt.dim { color:#6a5a48; }
  .evohead { margin-top:8px; font-size:12px; color:#c8a868; } .evorow.flash { animation:evoflash 1.2s; } @keyframes evoflash { 0%,60% { background:rgba(232,128,58,.25); } 100% { background:none; } }`; document.head.appendChild(st); })();
