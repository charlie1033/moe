// =============================================================
//  章節劇情事件：手工地圖裡的 lore／collect／ambush／npc 四種事件（地圖資料見 chapmaps.js）
//  玩家看到：
//   ・lore 查看、npc 說話：靠近按 F → 播劇情 → 完成
//   ・collect 收集：同一夜散在 1～3 區的 2～4 片；每撿一片播那一片，全部撿齊再播完整的故事
//   ・ambush 伏擊：按 F 播劇情 → 周圍湧出 2～3 波怪（第一波 1 群、最後一波 2 群，比地圖高 1 級）→ 全清才完成，再播一頁「之後」
//   ・完成：給獎勵（掉在事件旁邊，只有第一次）、記進日誌「夢裡的故事」、可能打開這張圖的封住通道（D）、營地某人多一句平常台詞
//   ・區域首領綁的劇情點（首領的 story）：首領活著時鎖住（互動鈕「先打倒『名字』」、按了不會觸發、地上不發光），打倒後才亮起來可以撿
//   ・完成過的：第二次進圖顯示成已查看（變暗、沒有光暈），按 F 可以重看劇情，不再給獎勵；收集的碎片撿過就不再出現
//   ・任務面板：「✦ 第 3 夜的夢：2 / 3」；日誌多一個分頁「夢裡的故事」
//  資料：角色 P.chapEv（chapmaps.js 的 'start' 補）；事件狀態在 w.chap.evs（ev.done、伏擊中 ev.amb／wave）；伏擊的怪 m.chapAmb＝'夜-區'＋事件格子編號（v2.19 大地圖三區的編號會重複）
//  給別的檔用：ChapEv.completeById(事件id, x, y)（區域首領綁劇情時呼叫）、ChapEv.reward(獎勵, x, y)、ChapEv.applyLines()
// =============================================================
const ChapEv = {
  keyOf: e => e.kind === 'collect' ? e.id + '#' + (e.part || 1) : e.id,
  // 被區域首領鎖住的劇情點：這張圖的首領 story 指向它、首領還活著、這個角色還沒打倒過牠 → 回傳首領名字（沒鎖回傳 null）
  locked(w, ev) {
    const c = w && w.chap; if (!c || !ev || ev.done) return null;
    for (const rec of (c.bosses || (c.boss ? [c.boss] : []))) {   // v2.19 大地圖：每區各自的區域首領
      if (rec.dead) continue;
      const d = ChapterMaps.def(w, rec.key), bd = d && d.bosses && d.bosses.B;
      if (!bd || bd.story !== ev.id || (G.P && G.P.chapBoss && G.P.chapBoss[bd.id])) continue;
      return bd.name || '區域首領';
    }
    return null;
  },
  reward(r, x, y) {
    if (!r) return;
    const w = G.world || {}, L = w.mlvl || 1;
    try {
      if (r.cur && CURRENCY[r.cur]) for (let i = 0; i < Math.max(1, r.n || 1); i++) dropLoot(x, y, { cur: r.cur });
      else if (r.jewel) dropLoot(x, y, { jewel: r.jewel });
      else if (r.item) {
        if (r.item === 'unique') { const pool = UNIQUES.filter(u => BASE_BY_ID[u.base] && !u.boss && !u.wr); dropLoot(x, y, { item: makeUnique(pick(pool).id, L) }); }
        else dropLoot(x, y, { item: makeItem(pickBase(L).id, r.item === 'magic' ? 'magic' : 'rare', L) });
      }
    } catch (e) { console.error('[ChapEv reward]', e); }
  },
  // 營地台詞：完成的事件有 npcLine → 那個人平常多一句（換角色時先拿掉別人的）
  added: [],
  applyLines() {
    for (const [n, t] of this.added) { const a = NPC_LINES[n], i = a ? a.indexOf(t) : -1; if (i >= 0) a.splice(i, 1); }
    this.added = [];
    const P = G.P; if (!P || !P.chapEv) return;
    for (const k in CHAPTER_MAPS) for (const n in CHAPTER_MAPS[k].events || {}) {
      const e = CHAPTER_MAPS[k].events[n], nl = e && ((e.done && e.done.npcLine) || e.npcLine);
      if (!nl || !nl.npc || !nl.text || !P.chapEv[e.id] || !NPC_LINES[nl.npc]) continue;
      const t = /^[「（(]/.test(nl.text) ? nl.text : `「${nl.text}」`;
      if (!NPC_LINES[nl.npc].includes(t)) { NPC_LINES[nl.npc].push(t); this.added.push([nl.npc, t]); }
    }
  },
  // 一個劇情單位完成（src 是事件資料或收集的 done）
  complete(id, src, x, y) {
    const P = G.P; if (!P || P.chapEv[id]) return false;
    P.chapEv[id] = true;
    this.reward(src && src.reward, x, y);
    this.applyLines();
    const w = G.world; if (w && w.chap) for (const ev of w.chap.evs) if (ev.id === id && ev.kind !== 'collect') ev.done = true;
    UI.msg(`✦ ${(src && src.title) || '夢裡的故事'}——記進了日誌的「夢裡的故事」`, '#ffd36a');
    saveGame(); return true;
  },
  // 區域首領綁了劇情：打倒時完成那個事件（找得到事件就播它的劇情）
  completeById(id, x, y) {
    const P = G.P; if (!P || P.chapEv[id]) return;
    let e = null; for (const k in CHAPTER_MAPS) for (const n in CHAPTER_MAPS[k].events || {}) { const d = CHAPTER_MAPS[k].events[n]; if (d && d.id === id && d.kind !== 'collect') e = e || d; }
    if (e && STORY['chev_' + id]) UI.queueStory('chev_' + id);
    this.complete(id, e || { title: '夢裡的故事' }, x, y);
    const w = G.world; if (e && e.opens && w && w.chap && w.chap.evs.some(ev => ev.id === id)) ChapterMaps.openD(w);
  },
  use(ev) {
    const w = G.world, d = ChapterMaps.evDef(w, ev), P = G.P; if (!d || !P) return;
    const lk = this.locked(w, ev); if (lk) { UI.msg(`先打倒『${lk}』才拿得到`, '#ffb070'); return; }
    if (ev.done) { if (d.kind !== 'collect' && STORY['chev_' + d.id]) UI.queueStory('chev_' + d.id); return; }
    Sfx.play('click'); burst(ev.x, ev.y - 10, '#ffd36a', 16, 120);
    if (d.kind === 'collect') {
      ev.done = true; P.chapEv[this.keyOf(d)] = true;
      UI.queueStory('chev_' + this.keyOf(d));
      if (d.opens) ChapterMaps.openD(w);
      const u = ChapterMaps.units(w.tier).find(x => x.id === d.id), of = (u && u.of) || d.of || 1;
      const got = (u ? u.parts : [d.part || 1]).filter(p => P.chapEv[d.id + '#' + p]).length;
      if (got >= of) { if (STORY['chev_' + d.id]) UI.queueStory('chev_' + d.id); this.complete(d.id, Object.assign({}, d, d.done || {}, { reward: (d.done && d.done.reward) || (u && u.ev.reward) || d.reward }), ev.x, ev.y); }
      else { UI.msg(`找到了一片（${got} / ${of}）……其他的還散在這一夜的夢裡`, '#ffd36a'); saveGame(); }
    } else if (d.kind === 'ambush') {
      ev.amb = true; ev.wave = 0; ev.waves = clamp(d.waves || 2, 1, 4); ev.next = 0.8;
      UI.queueStory('chev_' + d.id);
    } else {
      ev.done = true; UI.queueStory('chev_' + d.id);
      this.complete(d.id, d, ev.x, ev.y);
      if (d.opens) ChapterMaps.openD(w);
    }
  },
};
Interact.add('chapev', (pl, w) => {
  const c = w && w.chap; if (!c) return null; const out = [];
  for (const ev of c.evs) {
    const d = ChapterMaps.evDef(w, ev); if (!d || ev.amb) continue;
    const lk = !ev.done && ChapEv.locked(w, ev);
    if (lk) out.push({ ref: ev, label: `先打倒『${lk}』`, r: 64 });
    else if (!ev.done) out.push({ ref: ev, label: d.label || (d.kind === 'npc' ? `和${d.who || '他'}說話` : '查看'), r: 64 });
    else if (d.kind !== 'collect') out.push({ ref: ev, label: `重看：${d.title || '夢裡的故事'}`, r: 46 });
  }
  return out;
}, ev => ChapEv.use(ev));
Talk.add(() => { ChapEv.applyLines(); return false; });   // 跟營地的人說話之前先把台詞補上（換角色、營地重設台詞之後也對）
Hook.on('start', () => ChapEv.applyLines());
// 伏擊：劇情關掉之後才開始出怪（劇情開著時遊戲暫停）
Hook.on('update', dt => {
  const w = G.world, c = w && w.chap; if (!c) return;
  for (const ev of c.evs) if (ev.amb) {
    const alive = G.mons.filter(m => m.chapAmb === (ev.key || '') + ev.n && !m.dead).length;
    if (ev.wave < ev.waves) {
      if ((ev.next -= dt) <= 0 && alive < 3) {
        ev.wave++; ev.next = 3.5;
        const before = G.mons.length, packs = ev.wave === ev.waves ? 2 : 1;
        for (let k = 0; k < packs; k++) { const a = Math.random() * Math.PI * 2; spawnPack(ev.x + Math.cos(a) * 90, ev.y + Math.sin(a) * 70, w); }
        for (let i = before; i < G.mons.length; i++) { const m = G.mons[i]; m.aggro = true; m.mlvl += 1; m.chapAmb = (ev.key || '') + ev.n; burst(m.x, m.y, '#ff7a50', 6, 120); }
        G.shake = Math.max(G.shake, 4);
        UI.msg(`伏擊：第 ${ev.wave} / ${ev.waves} 波`, '#ff9a6a');
      }
    } else if (!alive) {
      ev.amb = false; ev.done = true;
      const d = ChapterMaps.evDef(w, ev); if (!d) continue;
      if (STORY['chev_' + d.id + '#after']) UI.queueStory('chev_' + d.id + '#after');
      UI.banner(d.title || '伏擊', '撐過去了', '#ffd36a'); Sfx.play('unique');
      ChapEv.complete(d.id, d, ev.x, ev.y);
      if (d.opens) ChapterMaps.openD(w);
    }
  }
});
// —— v2.20 目標行（goals.js）：劇情最後一頁＋小地圖下方的狀態列 ——
const chapNum = n => ['零', '一', '兩', '三', '四', '五'][n] || n;
// 收集：還沒撿的碎片在第幾區（同一夜）
function chapCollectGoal(P, t, u) {
  const got = u.parts.filter(p => P.chapEv[u.id + '#' + p]).length, left = [];
  let nm = '';   // 碎片的名字：「王的詔書（一）」→「王的詔書」
  for (let s = 1; s <= 3; s++) { const d = CHAPTER_MAPS[t + '-' + s]; for (const n in (d && d.events) || {}) { const e = d.events[n]; if (!e || e.id !== u.id) continue; nm = nm || (e.title || '').replace(/（[^）]*）$/, ''); if (!P.chapEv[u.id + '#' + (e.part || 1)]) left.push(s); } }
  const zs = [...new Set(left)].sort().join('、'), rest = u.of - got;
  return { t: `找齊${nm || u.title}（${got} / ${u.of}）` + (rest > 0 && zs ? `——另外${chapNum(rest)}片在第 ${t} 夜的第 ${zs} 區` : '') };
}
// 依劇情代號找事件資料：chev_代號、chev_代號#片、chev_代號#after
function chapGoal(key) {
  const m = /^chev_(.+?)(?:#(\w+))?$/.exec(key), P = G.P; if (!m || !P) return null;
  const id = m[1], part = m[2], done = { done: true, t: '夢裡的故事' };
  let t = 0, d = null;
  for (const k in CHAPTER_MAPS) for (const n in CHAPTER_MAPS[k].events || {}) { const e = CHAPTER_MAPS[k].events[n]; if (e && e.id === id && !d) { d = e; t = +k.split('-')[0]; } }
  if (!d) return done;   // 只綁在區域首領身上的劇情
  if (part === 'after' || P.chapEv[id]) return done;
  if (d.kind === 'collect') {   // 撿到最後一片：接著播完整的故事、記進日誌
    const u = ChapterMaps.units(t).find(x => x.id === id);
    return u && u.parts.filter(p => P.chapEv[id + '#' + p]).length < u.of ? chapCollectGoal(P, t, u) : done;
  }
  if (d.kind === 'ambush') return { t: `擋住${chapNum(clamp(d.waves || 2, 1, 4))}波伏擊的敵人` };
  return done;   // 查看、說話：播的時候就完成了
}
Goal.add(chapGoal);
Goal.live(() => {   // 正在打伏擊
  const w = G.world, c = w && w.chap; if (!c) return null;
  const ev = c.evs.find(e => e.amb); return ev ? { t: `擋住伏擊（第 ${Math.max(1, ev.wave)} / ${ev.waves} 波）`, c: '#ff9a6a' } : null;
});
Goal.live(() => {   // 這一夜撿到一半的收集
  const w = G.world, P = G.P; if (!P || !P.chapEv || !w || w.kind !== 'map' || !w.chap) return null;
  const u = ChapterMaps.units(w.tier).find(x => x.kind === 'collect' && !P.chapEv[x.id] && x.parts.some(p => P.chapEv[x.id + '#' + p]));
  return u ? chapCollectGoal(P, w.tier, u) : null;
});
// —— 任務面板：這一夜的劇情事件進度 ——
function chapProgress(P, tier) {
  const us = ChapterMaps.units(tier); if (!us.length) return null;
  return { us, done: us.filter(u => P.chapEv[u.id]).length };
}
PanelRows.add('quest', P => {
  const w = G.world; P.chapEv = P.chapEv || {};   // 進角色時任務面板比 'start' 還早畫
  let tier = w && w.kind === 'map' && w.tier < DEEP_TIER && !w.arena ? w.tier : 0;
  if (!tier) for (let t = Math.min(ENDING_TIER, (P.maxTier || 0) + 1); t >= 1 && !tier; t--) { const p = chapProgress(P, t); if (p && p.done < p.us.length) tier = t; }
  const p = tier && chapProgress(P, tier); if (!p) return '';
  let h = `<div class="qstep ${p.done >= p.us.length ? 'done' : ''}">✦ 第 ${tier} 夜的夢：${p.done} / ${p.us.length}</div>`;
  for (const u of p.us) if (u.kind === 'collect' && !P.chapEv[u.id]) { const got = u.parts.filter(x => P.chapEv[u.id + '#' + x]).length; if (got) h += `<div class="qhint">${u.title}：已找到 ${got} / ${u.of} 片</div>`; }
  return h;
});
// —— 日誌：夢裡的故事 ——
JournalTabs.add('chapstory', '夢裡的故事', () => {
  const P = G.P; let h = '', all = 0, got = 0; P.chapEv = P.chapEv || {}; P.chapBoss = P.chapBoss || {};
  for (let t = 1; t <= ENDING_TIER; t++) {
    const us = ChapterMaps.units(t), bs = ChapterMaps.bosses(t); if (!us.length && !bs.length) continue;
    const dn = us.filter(u => P.chapEv[u.id]).length; all += us.length; got += dn;
    h += `<div class="lhead">第 ${t} 夜　${THEMES[(t - 1) % THEMES.length].name}　<span class="thint">${dn} / ${us.length}</span></div>`;
    for (const u of us) {
      if (P.chapEv[u.id]) { h += `<div class="jent"><b>${u.title}</b><div>${UI.storyText(u.journal || '')}</div>${STORY['chev_' + u.id] ? `<button class="replay" data-k="chev_${u.id}">重看</button>` : ''}</div>`; continue; }
      const part = u.kind === 'collect' ? u.parts.filter(x => P.chapEv[u.id + '#' + x]).length : 0;
      // 在哪幾區：一般事件＝它那一區；收集＝每一片所在的區（還沒撿的另外列）；只綁在首領身上的＝首領那一區
      const at = [], left = [];
      for (let s = 1; s <= 3; s++) { const d = CHAPTER_MAPS[t + '-' + s]; if (!d) continue;
        for (const n in d.events || {}) { const e = d.events[n]; if (!e || e.id !== u.id) continue; at.push(s); if (u.kind === 'collect' && !P.chapEv[u.id + '#' + (e.part || 1)]) left.push(s); }
        for (const b in d.bosses || {}) if (d.bosses[b] && d.bosses[b].story === u.id && !at.length) at.push(s); }
      const zs = a => [...new Set(a)].sort().join('、');
      h += `<div class="lrow dim">？？？　<span class="thint">在第 ${t} 夜${at.length ? `第 ${zs(at)} 區` : ''}的夢裡${u.kind === 'collect' ? `（${part ? `已找到 ${part} / ${u.of} 片` : `共 ${u.of} 片`}${part && left.length ? `・還差第 ${zs(left)} 區` : ''}）` : ''}</span></div>`;
    }
    for (const b of bs) h += P.chapBoss[b.id] ? `<div class="lrow"><b class="c-unique">☠ ${b.name}</b>　<span class="thint">區域首領・已打倒</span></div>` : `<div class="lrow dim">☠ ？？？　<span class="thint">第 ${t} 夜${(s => s ? `第 ${s} 區` : '')([1, 2, 3].find(s => { const d = CHAPTER_MAPS[t + '-' + s]; return d && d.bosses && Object.values(d.bosses).includes(b); }))}的區域首領</span></div>`;
  }
  return `<div class="csec">夢裡的故事　<span class="thint">主線每一夜的夢裡藏著的事（${got} / ${all}）：地上有金色光暈的東西${ctlText('靠近後{interact}', true)}</span></div>` + (h || '<div class="skd">還沒有找到。</div>');
});
