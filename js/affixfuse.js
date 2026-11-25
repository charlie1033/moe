// =============================================================
//  v2.20.14 融合器（取代 v2.20.12 的詞綴記憶：分解就能白拿詞綴太強了）
//  玩家看到：
//    工坊（B）多一區「融合器」：背包裡挑兩件藍裝／黃裝，各選一條詞綴，合成一件新的黃裝
//    底子（底座、物品等級、插槽、強化、夢痕、夢深詞綴）用第二件的；材料那件會消失
//    成功率看兩條裡比較強的那條：T1 25%、T2 40%、T3 60%、T4 以下 85%
//    成功：新裝備身上只有這兩條，各自在原本那一階裡重骰數值
//    失敗：新裝備身上變成兩條 T4 以下的隨機詞綴
//    每次花亂夢 ×1
//    舊存檔裡記住的詞綴：每一份退一顆亂夢
//  資料：沒有新的存檔欄位（舊的 P.affMem 退完就刪掉）
//  接點：Hook 'craftPanel'（工坊畫好之後）、'start'（退還舊的詞綴記憶）
// =============================================================
const AffixFuse = (() => {
  const COLOR = '#8fd8c8', COST = 1;
  const RATE = { 1: 25, 2: 40, 3: 60 };
  const rate = (t1, t2) => RATE[Math.min(t1, t2)] || 85;
  const affOf = it => (it.mods || []).map((m, k) => [m, k]).filter(([m]) => AFFIX_BY_ID[m.id] && (m.type === 'p' || m.type === 's') && m.tier);
  const usable = it => it && !isFlask(it) && !isStack(it) && ['magic', 'rare'].includes(it.rarity) && !it.set && BASE_BY_ID[it.base] && affOf(it).length > 0;
  // 這條詞綴能不能出現在這個底座上
  const fits = (id, it) => { const a = AFFIX_BY_ID[id], b = BASE_BY_ID[it.base]; return a.classes.includes(b.cls) && !(a.local && a.id.startsWith('def') && !b.def); };
  const tierIdx = (a, tier) => Math.max(0, Math.min(a.tiers.length - 1, a.tiers.length - tier));
  const modText = m => { const f = STAT_TEXT[AFFIX_BY_ID[m.id].stat]; return f ? f(m.v) : m.stat; };
  const modLabel = m => `${m.type === 'p' ? '前綴' : '後綴'}・${modText(m)}（T${m.tier}）`;
  // 失敗時：T4 以下的隨機詞綴
  function lowAffix(it) {
    for (const type of Math.random() < 0.5 ? ['p', 's'] : ['s', 'p']) {
      const pool = eligibleAffixes(it, type); if (!pool.length) continue;
      const a = pick(pool), ok = a.tiers.map((t, i) => i).filter(i => a.tiers.length - i >= 4 && a.tiers[i][0] <= it.ilvl);
      const i = ok.length ? pick(ok) : 0;
      return { id: a.id, type, tier: a.tiers.length - i, stat: a.stat, v: rollValue(a, i, BASE_BY_ID[it.base]) };
    }
    return null;
  }
  // 能不能融合：回傳錯誤文字或 null
  function why(P, ia, ka, ib, kb) {
    const A = P.inv[ia], B = P.inv[ib];
    if (ia === ib) return '要兩件不同的裝備';
    if (!usable(A) || !usable(B)) return '只能用有詞綴的藍裝或黃裝（傳奇、套裝不行）';
    const ma = A.mods[ka], mb = B.mods[kb];
    if (!ma || !mb || !AFFIX_BY_ID[ma.id] || !AFFIX_BY_ID[mb.id]) return '先選好兩條詞綴';
    if (ma.id === mb.id) return '兩條詞綴不能一樣';
    if (!fits(ma.id, B)) return `${BASE_BY_ID[B.base].clsName}不會有「${modText(ma)}」這條詞綴`;
    if (craftCurHave('chaos') < COST) return `亂夢不夠：需要 ×${COST}`;
    return null;
  }
  // 融合：回傳 { ok, item } 或 { err }
  function fuse(P, ia, ka, ib, kb, roll = Math.random()) {
    const e = why(P, ia, ka, ib, kb); if (e) return { err: e };
    const A = P.inv[ia], B = P.inv[ib], ma = A.mods[ka], mb = B.mods[kb], base = BASE_BY_ID[B.base];
    const ok = roll * 100 < rate(ma.tier, mb.tier);
    craftCurPay('chaos', COST);
    B.rarity = 'rare'; B.mods = [];
    if (ok) for (const m of [mb, ma]) { const a = AFFIX_BY_ID[m.id], i = tierIdx(a, m.tier); B.mods.push({ id: a.id, type: a.type, tier: a.tiers.length - i, stat: a.stat, v: rollValue(a, i, base) }); }
    else for (let n = 0; n < 2; n++) { const m = lowAffix(B); if (m) B.mods.push(m); }
    nameItem(B);
    returnJewels(A); P.inv[ia] = null;
    return { ok, item: B };
  }
  // 舊存檔：記住的詞綴退亂夢
  function refund(P) {
    if (!P || !P.affMem) return 0;
    let n = 0; for (const id in P.affMem) n += (P.affMem[id] || []).length;
    delete P.affMem; delete P.affMemSeen;
    if (n) P.cur.chaos = (P.cur.chaos || 0) + n;
    return n;
  }
  Hook.on('start', () => {
    const n = refund(G.P);
    if (n) { setTimeout(() => UI.msg(`詞綴記憶改成了融合器（工坊）：之前記住的 ${n} 條詞綴退成亂夢 ×${n}`, COLOR), 1500); saveGame(); }
  });
  // ---------- 工坊介面 ----------
  const sel = { a: -1, ka: -1, b: -1, kb: -1 };
  Hook.on('craftPanel', body => {
    const P = G.P; if (!P || !body) return;
    let box = document.getElementById('fuseBox'); if (!box) { box = document.createElement('div'); box.id = 'fuseBox'; }
    body.appendChild(box);
    const items = P.inv.map((it, i) => [it, i]).filter(([it]) => usable(it));
    let h = `<div class="csec" style="color:${COLOR}">◆ 融合器<span class="thint">　兩件藍裝或黃裝各挑一條詞綴，合成一件新的黃裝；材料那件會消失</span></div>`;
    if (items.length < 2) h += '<div class="ihint">背包裡要有兩件以上有詞綴的藍裝或黃裝才能融合。</div>';
    else {
      if (!items.some(([, i]) => i === sel.a)) sel.a = items[0][1];
      const A = P.inv[sel.a], affA = affOf(A);
      if (!affA.some(([, k]) => k === sel.ka)) sel.ka = affA[0][1];
      const ma = A.mods[sel.ka];
      const bs = items.filter(([it, i]) => i !== sel.a && fits(ma.id, it));
      const opt = (list, cur, f) => list.map(x => `<option value="${x[1]}" ${x[1] === cur ? 'selected' : ''}>${f(x[0])}</option>`).join('');
      h += `<div class="crow"><label style="flex:1">材料（會消失）<select id="fuA" style="width:100%">${opt(items, sel.a, it => it.name)}</select></label><label style="flex:1">選一條<select id="fuKa" style="width:100%">${opt(affA, sel.ka, modLabel)}</select></label></div>`;
      if (!bs.length) h += `<div class="ihint">背包裡沒有能放「${modText(ma)}」的另一件藍裝或黃裝。</div>`;
      else {
        if (!bs.some(([, i]) => i === sel.b)) sel.b = bs[0][1];
        const B = P.inv[sel.b], affB = affOf(B).filter(([m]) => m.id !== ma.id);
        if (!affB.some(([, k]) => k === sel.kb)) sel.kb = affB.length ? affB[0][1] : -1;
        h += `<div class="crow"><label style="flex:1">底子（留下底座、插槽）<select id="fuB" style="width:100%">${opt(bs, sel.b, it => it.name)}</select></label><label style="flex:1">選一條<select id="fuKb" style="width:100%">${affB.length ? opt(affB, sel.kb, modLabel) : '<option>（沒有別的詞綴）</option>'}</select></label></div>`;
        const mb = B.mods[sel.kb], e = why(P, sel.a, sel.ka, sel.b, sel.kb);
        if (mb) {
          const r = rate(ma.tier, mb.tier);
          h += `<div class="ihint">成功率 <b style="color:${COLOR}">${r}%</b>（看比較強的那條：T${Math.min(ma.tier, mb.tier)}）・花亂夢 ×${COST}（有 <b class="${craftCurHave('chaos') >= COST ? '' : 'c-bad'}">${craftCurHave('chaos')}</b>）</div>`;
          h += `<div class="ihint">成功：「${BASE_BY_ID[B.base].name}」只留這兩條，各自在那一階重骰數值<br>失敗：變成兩條 T4 以下的隨機詞綴</div>`;
        }
        h += e ? `<div class="ihint c-bad">${e}</div>` : `<div class="scarcands"><button id="fuGo">融合</button></div>`;
      }
    }
    box.innerHTML = h;
    const on = (id, k) => { const el = box.querySelector(id); if (el) el.onchange = () => { sel[k] = +el.value; UI.refreshCraft(); }; };
    on('#fuA', 'a'); on('#fuKa', 'ka'); on('#fuB', 'b'); on('#fuKb', 'kb');
    const go = box.querySelector('#fuGo');
    if (go) go.onclick = () => {
      const A = P.inv[sel.a], B = P.inv[sel.b];
      gameAsk(`「${A.name}」會消失，「${B.name}」原本的其他詞綴也會不見。確定要融合嗎？`, () => {
        const r = fuse(P, sel.a, sel.ka, sel.b, sel.kb);
        if (r.err) return UI.msg(r.err, '#ff9a9a');
        if (r.ok) { Sfx.play('unique'); UI.msg(`融合成功：${r.item.name}`, COLOR); }
        else UI.msg(`融合失敗：${r.item.name} 變成了兩條比較弱的詞綴`, '#ff9a9a');
        sel.a = sel.ka = sel.b = sel.kb = -1;
        UI.refreshCraft(); UI.refreshInv(); saveGame();
      });
    };
  });
  return { fuse, why, rate, usable, fits, lowAffix, refund };
})();
