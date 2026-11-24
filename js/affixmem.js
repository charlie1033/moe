// =============================================================
//  v2.20.12 詞綴記憶（定向打造）
//  玩家看到：
//    分解藍裝、黃裝時，角色會「記住」它身上最好的一條詞綴（階級最高的那條）
//    同一條詞綴最多記 3 份；記滿了只會換成更好的階級
//    工坊（B）多一區「詞綴記憶」：選一份記憶，花亂夢寫到背包裡有空位的藍裝／黃裝上
//      寫上去的是「同一階」，數值在那一階裡重骰；寫完這份記憶就用掉了
//    只能寫自己親手分解過的詞綴；夢痕、夢深詞綴、傳奇詞綴都記不住
//  資料：P.affMem = { 詞綴 id: [階級, 階級, …] }（由好到壞，最多 3 個；T1 最好）
//  接點：Hook 'salvage'（分解）、'craftPanel'（工坊畫好之後）
// =============================================================
const AffixMem = (() => {
  const CAP = 3, COLOR = '#8fd8c8';
  const mem = P => P.affMem || (P.affMem = {});
  const cost = tier => Math.max(1, 5 - tier);   // T1 ×4、T2 ×3、T3 ×2、T4 以下 ×1（亂夢）
  const tierIdx = (a, tier) => a.tiers.length - tier;
  // 這一階的數值範圍（給玩家看的文字）
  function rangeText(a, tier) {
    const t = a.tiers[tierIdx(a, tier)]; if (!t) return a.stat;
    const f = STAT_TEXT[a.stat]; if (!f) return a.stat;
    const v = t.length === 5 ? [t[1], t[4]] : t[2];
    let s = f(v);
    if (t.length !== 5 && t[1] !== t[2]) s = s.replace(String(t[2]), `${t[1]}～${t[2]}`);
    return s;
  }
  const label = (id, tier) => { const a = AFFIX_BY_ID[id]; return `${a.type === 'p' ? '前綴' : '後綴'}・${rangeText(a, tier)}（T${tier}）`; };
  // 這條詞綴值不值得記：還沒記滿，或比記住的最差那份好
  function useful(P, m) {
    const l = mem(P)[m.id] || [];
    return l.length < CAP || m.tier < l[l.length - 1];
  }
  function remember(P, it) {
    if (!it || isFlask(it) || isStack(it) || !['magic', 'rare'].includes(it.rarity) || it.set) return null;
    const c = (it.mods || []).filter(m => AFFIX_BY_ID[m.id] && (m.type === 'p' || m.type === 's') && m.tier && useful(P, m));
    if (!c.length) return null;
    const best = Math.min(...c.map(m => m.tier)), m = pick(c.filter(x => x.tier === best));
    const l = mem(P)[m.id] = (mem(P)[m.id] || []).concat(m.tier).sort((a, b) => a - b).slice(0, CAP);
    return { id: m.id, tier: m.tier, n: l.length };
  }
  Hook.on('salvage', (it, got, quiet) => {
    const P = G.P; if (!P || !got) return;
    const r = remember(P, it); if (!r) return;
    got.push(quiet ? '記住的詞綴 ×1' : `記住詞綴「${label(r.id, r.tier)}」`);
    if (!P.affMemSeen) { P.affMemSeen = 1; setTimeout(() => UI.msg('你記住了一條詞綴：到工坊（B）的「詞綴記憶」可以把它寫到別的裝備上', COLOR), 600); }
  });
  // 能不能寫到這件裝備上：藍裝／黃裝、部位能有這條、還沒有同一條、那一類（前綴／後綴）還有空位
  function why(it, id) {
    const a = AFFIX_BY_ID[id];
    if (!it || isFlask(it) || isStack(it)) return '只能寫到裝備上';
    if (it.rarity === 'unique') return '傳奇、套裝不能寫';
    if (!['magic', 'rare'].includes(it.rarity)) return '白裝沒有詞綴位置，先用微光或金色的夢';
    const base = BASE_BY_ID[it.base];
    if (!a.classes.includes(base.cls) || (a.local && a.id.startsWith('def') && !base.def)) return `${base.clsName}不會有這條詞綴`;
    if (it.mods.some(m => m.id === id)) return '已經有這條了';
    const n = it.mods.filter(m => m.type === a.type).length, max = it.rarity === 'magic' ? 1 : 3;
    if (n >= max || (it.rarity === 'magic' && it.mods.length >= 2)) return `${a.type === 'p' ? '前綴' : '後綴'}滿了`;
    return null;
  }
  function write(P, invIdx, id, tier) {
    const it = P.inv[invIdx], a = AFFIX_BY_ID[id], l = mem(P)[id] || [], k = l.indexOf(tier);
    if (!a || k < 0) return '沒有這份記憶';
    const e = why(it, id); if (e) return e;
    const n = cost(tier); if (craftCurHave('chaos') < n) return `亂夢不夠：需要 ×${n}`;
    craftCurPay('chaos', n);
    it.mods.push({ id, type: a.type, tier, stat: a.stat, v: rollValue(a, tierIdx(a, tier), BASE_BY_ID[it.base]) });
    if (it.rarity === 'magic') nameItem(it);
    l.splice(k, 1); if (!l.length) delete mem(P)[id];
    return null;
  }
  // ---------- 工坊介面 ----------
  let sel = '';
  Hook.on('craftPanel', body => {
    const P = G.P; if (!P || !body) return;
    let box = document.getElementById('affMemBox'); if (!box) { box = document.createElement('div'); box.id = 'affMemBox'; }
    body.appendChild(box);
    const M = mem(P), opts = [];
    for (const id in M) if (AFFIX_BY_ID[id]) for (const t of [...new Set(M[id])]) opts.push([`${id}|${t}`, id, t, M[id].filter(x => x === t).length]);
    opts.sort((x, y) => AFFIX_BY_ID[x[1]].type.localeCompare(AFFIX_BY_ID[y[1]].type) || x[2] - y[2]);
    let h = `<div class="csec" style="color:${COLOR}">◆ 詞綴記憶<span class="thint">　分解藍裝、黃裝會記住最好的一條；花亂夢寫到有空位的裝備上</span></div>`;
    if (!opts.length) h += '<div class="ihint">還沒有記住任何詞綴。到商人那裡分解藍裝或黃裝，就會記住它身上階級最高的一條。</div>';
    else {
      if (!opts.some(o => o[0] === sel)) sel = opts[0][0];
      const o = opts.find(x => x[0] === sel), [, id, t] = o, n = cost(t);
      h += `<div class="crow"><label style="flex:1">記住的詞綴<select id="affPick" style="width:100%">${opts.map(x => `<option value="${x[0]}" ${x[0] === sel ? 'selected' : ''}>${label(x[1], x[2])}${x[3] > 1 ? ` ×${x[3]}` : ''}</option>`).join('')}</select></label></div>`;
      h += `<div class="ihint">寫上去是同一階，數值在這一階裡重骰；寫完這份記憶就用掉了。花亂夢 ×${n}（有 <b class="${craftCurHave('chaos') >= n ? '' : 'c-bad'}">${craftCurHave('chaos')}</b>）</div>`;
      const cands = P.inv.map((it, i) => [it, i]).filter(([it]) => it && !isFlask(it) && !isStack(it) && it.rarity !== 'normal' && it.rarity !== 'unique' && BASE_BY_ID[it.base] && AFFIX_BY_ID[id].classes.includes(BASE_BY_ID[it.base].cls));
      const ok = cands.filter(([it]) => !why(it, id)), bad = cands.filter(([it]) => why(it, id));
      h += ok.length ? `<div class="scarcands">${ok.map(([it, i]) => `<button data-affw="${i}" class="c-${it.rarity}">寫到：${it.name}</button>`).join('')}</div>` : '<div class="ihint">背包裡沒有可以寫這條的藍裝或黃裝。</div>';
      if (bad.length) h += `<div class="ihint" style="opacity:.7">${bad.slice(0, 3).map(([it]) => `${it.name}：${why(it, id)}`).join('　')}</div>`;
    }
    box.innerHTML = h;
    const sp = box.querySelector('#affPick'); if (sp) sp.onchange = () => { sel = sp.value; UI.refreshCraft(); };
    box.querySelectorAll('[data-affw]').forEach(b => b.onclick = () => {
      const [id, t] = sel.split('|'), it = P.inv[+b.dataset.affw];
      const e = write(P, +b.dataset.affw, id, +t);
      if (e) return UI.msg(e, '#ff9a9a');
      Sfx.play('unique'); UI.msg(`寫好了：${it.name} 多了「${STAT_TEXT[AFFIX_BY_ID[id].stat](it.mods[it.mods.length - 1].v)}」`, COLOR);
      UI.refreshCraft(); UI.refreshInv(); saveGame();
    });
  });
  return { remember, write, why, cost, label, mem };
})();
