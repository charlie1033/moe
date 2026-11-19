// =============================================================
//  進化圖鑑：讓玩家知道「技能型傳奇」存在
//  玩家看到：技能頁（K）每個裝上的技能旁邊多一個小方格——還沒撿過對應的傳奇是「？」，撿過就亮出那件傳奇的圖示
//    （滑鼠移上去看說明；手機點一下會捲到下面的圖鑑那一列）
//    技能頁最下面多一區「進化圖鑑」：「召喚骷髏 ＋ ？ ＝ ？？？」，撿過就顯示傳奇名稱和效果
//    一件傳奇對應好幾個技能的（回音箭袋、震地拳套、毒牙手套、居合之鞘、影步之靴），不放在技能旁邊，放在「不只一個技能」那一區
//    排序：技能欄上的技能 → 同職業的技能（「你的技能」）→「不只一個技能」→ 其他職業（摺起來：「其他職業（14）」點開才看）
//    還沒撿過的那一列多一行掉落提示（hint）：「傳奇戒指・第 3 夜以後的精英和看守者會掉」，依底材部位和基底等級算
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
  u_sheath: `武士的${byCtl('空白鍵', '位移鈕')}位移`, u_shadowstep: '翻滾與位移技能',
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
  icon(u) { return `<img src="${itemIconOfURL({ uniqueId: u.id, base: u.base }, 64)}" alt="">`; },
  // 技能頁每一列旁邊的小方格
  cell(sid) {
    const u = this.bySkill(sid); if (!u) return '';
    const on = !!this.found()[u.id];
    const tip = on ? `${SKILLS[sid].name} ＋ ${u.name} ＝ ${this.effect(u)}` : `${SKILLS[sid].name} ＋ ？ ＝ ？？？（有一件傳奇會改變這個技能的玩法：${this.hint(u)}）`;
    return `<span class="evocell ${on ? 'on' : ''}" data-evo="${sid}" title="${tip}">${on ? this.icon(u) : '？'}</span>`;
  },
  // 還沒撿過時的掉落提示：「傳奇戒指・第 3 夜以後的精英和看守者有機會掉（一般怪偶爾也會）」
  //   依底材部位（BASE_BY_ID[基底].clsName）和掉落條件（items.js randomItem：基底等級 ≤ 怪物等級 + 3；精英怪等級＝地圖等級 + 2）
  hint(u) {
    const b = BASE_BY_ID[u.base]; if (!b) return '';
    const slot = `傳奇${b.clsName || '裝備'}`;
    if (u.noDrop) return `${slot}・不會從怪物身上掉`;
    if (u.boss) { const n = typeof BOSSES !== 'undefined' && BOSSES[u.boss] && BOSSES[u.boss].name; return `${slot}・${n || '某位看守者'}的專屬掉落`; }
    if (u.wr) return `${slot}・深層夢境帶特殊世界規則的夜才會掉`;
    let t = 1; while (t < ENDING_TIER && mapLevel(t) + 5 < b.lvl) t++;
    return `${slot}・${t <= 1 ? '每一夜' : `第 ${t} 夜以後`}的精英和看守者有機會掉（一般怪偶爾也會）`;
  },
  html() {
    const F = this.found(), P = G.P || {}, all = Object.keys(EVO_MAP).concat(Object.keys(EVO_MULTI)).filter(id => UNIQUE_BY_ID[id]);
    let h = `<div class="csec2">進化圖鑑　<span class="thint">已點亮 ${all.filter(id => F[id]).length} / ${all.length}　穿上對應的傳奇，技能的玩法就會改變；撿到過一次就會亮起來（全帳號共用）</span></div>`;
    const row = (left, leftIcon, id, key) => {
      const u = UNIQUE_BY_ID[id], on = !!F[id];
      return `<div class="evorow ${on ? 'on' : ''}" data-evorow="${key}"><span class="evoic">${leftIcon}</span><b>${left}</b><span class="evoplus">＋</span><span class="evocell ${on ? 'on' : ''}">${on ? this.icon(u) : '？'}</span><span class="evoplus">＝</span>`
        + (on ? `<span class="evotxt"><b class="c-unique">${u.name}</b>：${this.effect(u)}</span>` : `<span class="evotxt dim">？？？<small class="evohint">${this.hint(u)}</small></span>`) + '</div>';
    };
    // 排序：技能欄上的 → 同職業的 → 其他職業（摺起來）
    const bar = (P.skills || []).filter(Boolean), mine = sid => (CLASS_GEMS[P.cls] || []).includes(sid) || (SKILLS[sid] && SKILLS[sid].cls === P.cls);
    const ids = Object.keys(EVO_MAP).filter(id => SKILLS[EVO_MAP[id]] && UNIQUE_BY_ID[id]);
    const grp = id => { const sid = EVO_MAP[id], i = bar.indexOf(sid); return i >= 0 ? i : mine(sid) ? 10 : 20; };
    ids.sort((a, b) => grp(a) - grp(b));
    const sk = id => row(SKILLS[EVO_MAP[id]].name, `<img src="${skillIconURL(EVO_MAP[id], 48)}" alt="">`, id, EVO_MAP[id]);
    const near = ids.filter(id => grp(id) < 20), far = ids.filter(id => grp(id) >= 20);
    if (near.length) h += `<div class="evohead">你的技能</div>` + near.map(sk).join('');
    h += `<div class="evohead">不只一個技能</div>`;
    for (const id in EVO_MULTI) if (UNIQUE_BY_ID[id]) h += row(EVO_MULTI[id], '✦', id, id);
    if (far.length) h += `<details class="evoother" ${this.otherOpen ? 'open' : ''}><summary>其他職業（${far.length}）<span class="thint">　點開看</span></summary>${far.map(sk).join('')}</details>`;
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
  const od = box.querySelector('details.evoother'); if (od) od.ontoggle = () => { EvoCodex.otherOpen = od.open; };   // 重畫技能頁時記得有沒有點開
  root.querySelectorAll('#skillSlots .evocell[data-evo]').forEach(el => el.onclick = e => {
    e.stopPropagation(); const r = box.querySelector(`[data-evorow="${el.dataset.evo}"]`); if (!r) return;
    const dt = r.closest('details'); if (dt && !dt.open) { dt.open = true; EvoCodex.otherOpen = true; }
    r.scrollIntoView({ block: 'center', behavior: 'smooth' }); r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash');
  });
});
(() => { const st = document.createElement('style'); st.textContent = `
  .evocell { flex:none; width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; border:1px dashed #6a5a40; border-radius:6px; color:#8a7a58; font-size:14px; background:#0b090d; cursor:pointer; }
  .evocell.on { border:1px solid #e8803a; box-shadow:0 0 6px rgba(232,128,58,.5); } .evocell img { width:26px; height:26px; pointer-events:none; }
  #evoCodex { padding:0 10px 10px; } .evorow { display:flex; align-items:center; gap:6px; padding:4px 2px; border-bottom:1px solid #221c16; font-size:12px; flex-wrap:wrap; }
  .evorow .evoic { width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; color:#c8a868; } .evorow .evoic img { width:26px; height:26px; }
  .evorow > b { min-width:70px; color:#d8ccb4; font-weight:normal; } .evoplus { color:#8a7a60; } .evotxt { flex:1 1 180px; color:#e8dcc0; } .evotxt.dim { color:#6a5a48; }
  .evohead { margin-top:8px; font-size:12px; color:#c8a868; } .evohint { display:block; color:#9a8a6a; font-size:11px; margin-top:1px; }
  .evoother { margin-top:8px; } .evoother > summary { cursor:pointer; font-size:12px; color:#c8a868; padding:4px 2px; } .evorow.flash { animation:evoflash 1.2s; } @keyframes evoflash { 0%,60% { background:rgba(232,128,58,.25); } 100% { background:none; } }`; document.head.appendChild(st); })();
