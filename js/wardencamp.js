// =============================================================
//  看守者抉擇（三）：營地、人物對話、保底殘片、歐莉換傳奇、日誌分頁
//  ・請託故事：STORY['wreq_代號']（進巢穴時播，wardens.js）
//  ・第一次選擇之後，相關人物多一章故事（NPC_STORIES 裡的 'w_代號'，內容依第一次的選擇；頭上會冒「！」）
//    小雀那一章講完會送你「生鏽的小王冠」（有套裝系統給 set_dabai_crown，沒有就給備用傳奇），只送一次
//  ・相關人物平常說的話多一兩句（NPC_LINES，依第一次的選擇）
//  ・第一次選「放走」：那個人物的營地多一個角色（用現成怪物圖換色），會走動，按 F 會說話
//  ・保底殘片：存在倉庫 G.stash.wshard = { 看守者代號: 片數 }（帳號共用）；10 片在夢醒之牢跟歐莉換一件那隻看守者的專屬傳奇
//    歐莉左手邊有一本發光的「殘片冊」，有殘片時才出現，靠近按 F
//  ・日誌（J）多一個分頁「看守者」：每隻看守者的第一次選擇、各條路走過幾次、殘片幾片
//  接點：Hook 'start'、'update'、'drawWorld'；Interact 'wcamp'、'wshard'；JournalTabs 'wardens'
// =============================================================
//  v2.18.2
//  ・選完之後的那一章取代原本的第二章（WARDEN_TEXT.merge，例如茵之二、卡爾之二）：選的那一刻第二章還沒看過，就記 P.wardens.mg[看守者]=1，
//    第二章不再冒「！」，它的禮物移到這一章，keep 的頁接在後面；這一章看完把第二章記成看過（mg=2）。已經看過第二章的舊存檔照舊
//  ・「和解」章節裡「你帶回來的信物」只在真的打贏和解那條路時才說（P.wardens.tok[看守者]=1，打倒時記），沒有就用 chap.nameNo
//  ・深層夢境（第 11 夜以後）進巢穴、接完請託後，大橫幅說一句 WARDEN_TEXT.deep（第一次選放走過的用第二句）；記在 G.world.wd.deepSaid
const wHasTok = (P, id) => !!(P && P.wardens && P.wardens.tok && P.wardens.tok[id]);
const wMerging = (P, id) => !!(P && P.wardens && P.wardens.first[id] && P.wardens.mg && P.wardens.mg[id]);
function wChapText(id) {
  const T = WARDEN_TEXT[id], P = G.P, c = (P && P.wardens && P.wardens.first[id]) || 'kill';
  return (c === 'name' && T.chap.nameNo && !wHasTok(P, id)) ? T.chap.nameNo : T.chap[c];
}
for (const id of WARDEN_IDS) {
  const T = WARDEN_TEXT[id], bn = BOSSES[id].name;
  STORY['wreq_' + id] = { title: `${T.who}的請託`, pages: T.req, journal: { title: `${T.who}的請託`, text: T.ask } };
  const cid = 'w_' + id, S = NPC_STORIES[T.npc]; if (!S) continue;
  const M = T.merge, c2 = M && S.chapters.find(c => c.id === M.id);
  if (c2) { const w0 = c2.when; c2.when = P => { wMergeTick(P); return !wMerging(P, id) && w0(P); }; }
  const ch = { id: cid, title: `${T.who}　${bn}之後`, when: P => !!(P.wardens && P.wardens.first[id]),
    get gift() { return c2 && wMerging(G.P, id) && G.P.wardens.mg[id] === 1 ? c2.gift : null; },
    get pages() { const extra = c2 && wMerging(G.P, id) && STORY[M.id] ? (M.keep || []).map(k => STORY[M.id].pages[k]).filter(Boolean) : [];
      return [wChapText(id)].concat(extra, T.gift ? [T.gift] : []); },
    get text() { return wChapText(id).split('\n')[0]; } };
  S.chapters.push(ch);
  STORY[cid] = { title: ch.title, get pages() { return ch.pages; }, journal: { title: ch.title, get text() { return ch.text; } } };
}
// —— 人物平常的話 ——
const W_BASE_LINES = {}; for (const id of WARDEN_IDS) { const n = WARDEN_TEXT[id].npc; if (NPC_LINES[n] && !W_BASE_LINES[n]) W_BASE_LINES[n] = NPC_LINES[n].slice(); }
function wApplyLines(P) {
  for (const n in W_BASE_LINES) NPC_LINES[n] = W_BASE_LINES[n].slice();
  for (const id of WARDEN_IDS) { const c = P.wardens && P.wardens.first[id], T = WARDEN_TEXT[id]; if (!c || !NPC_LINES[T.npc]) continue;
    const L = (c === 'name' && T.lines.nameNo && !wHasTok(P, id)) ? T.lines.nameNo : T.lines[c]; if (L) NPC_LINES[T.npc].push(...L); }
}
Hook.on('start', P => {
  const W = P.wardens; W.mg = W.mg || {};
  if (!W.tok) { W.tok = {}; for (const id of WARDEN_IDS) if (W.runs[id] && W.runs[id].name && (P.bossKills[id] || 0) > 0) W.tok[id] = 1; }   // 舊存檔：選過和解又打倒過，當作拿過信物
  wApplyLines(P);
});
// 打贏「和解」那條路：記下拿到信物
Hook.on('kill', m => {
  const P = G.P, w = G.world; if (!P || !m.boss || m.twin || !WARDEN_TEXT[m.boss] || !w || !w.wd || w.wd.id !== m.boss || w.wd.path !== 'name') return;
  P.wardens.tok = P.wardens.tok || {}; if (!P.wardens.tok[m.boss]) { P.wardens.tok[m.boss] = 1; wApplyLines(P); }
});
// —— 殘片 ——
const wShardHave = id => (G.stash && G.stash.wshard && G.stash.wshard[id]) || 0;
function wShardAdd(id, n) { if (!G.stash) return; G.stash.wshard = G.stash.wshard || {}; G.stash.wshard[id] = Math.max(0, wShardHave(id) + n); }
const wShardTotal = () => WARDEN_IDS.reduce((s, id) => s + wShardHave(id), 0);
function wGive(it) {
  const P = G.P, j = P.inv.indexOf(null);
  if (j >= 0) { P.inv[j] = it; UI.msg(`${it.name} 放進了背包`, itemColor(it) || '#ffd27a'); if (UI.refreshInv) UI.refreshInv(); }
  else dropLoot(G.pl.x, G.pl.y, { item: it });
  Sfx.play('unique'); saveGame();
}
// —— 合併的章節：決定要不要取代第二章、看完把第二章記成看過 ——
function wMergeTick(P) {
  const W = P.wardens; if (!W) return; W.mg = W.mg || {};
  for (const id of WARDEN_IDS) {
    const M = WARDEN_TEXT[id].merge; if (!M || !W.first[id]) continue;
    if (W.mg[id] == null) W.mg[id] = (!P.story.seen[M.id] && !P.story.seen['w_' + id]) ? 1 : 0;
    if (W.mg[id] === 1 && P.story.seen['w_' + id]) { P.story.seen[M.id] = true; W.mg[id] = 2; }
  }
}
Hook.on('update', () => { if (G.P && G.P.wardens) wMergeTick(G.P); });
// —— 深層夢境：看守者出場的一句話（接完請託、開打時） ——
Hook.on('update', () => {
  const w = G.world, P = G.P, wd = w && w.wd; if (!wd || !P || !w.bossRoom || (w.tier || 0) < DEEP_TIER || wd.deepSaid || wd.stage !== 'fight' || UI.paused()) return;
  const T = WARDEN_TEXT[wd.id]; wd.deepSaid = true; if (!T || !T.deep) return;
  const line = P.wardens && P.wardens.first[wd.id] === 'free' && T.deep[1] ? T.deep[1] : T.deep[0];
  UI.banner(BOSSES[wd.id].name, line, '#cbb8ff'); UI.msg(line, '#cbb8ff');
});
// —— 營地：放走之後多的角色 ——
function wCampList(w) {
  const P = G.P; if (!w || w.kind !== 'town' || !P || !P.wardens) return [];
  w.wcamp = w.wcamp || {}; const out = [];
  for (const id of WARDEN_IDS) {
    const T = WARDEN_TEXT[id]; if (P.wardens.first[id] !== 'free' || T.hub !== w.hub || !T.camp) continue;
    let c = w.wcamp[id];
    if (!c) { const a = w.npcs.find(n => n.id === T.npc); if (!a) continue; const p = nearestFloor(a.x + 46, a.y + 12); c = w.wcamp[id] = { x: p.x, y: p.y, hx: p.x, hy: p.y, tx: p.x, ty: p.y, f: 1, wait: 1 }; }
    out.push({ id, T, c });
  }
  return out;
}
Hook.on('update', dt => {
  const w = G.world, P = G.P; if (!w || !P || w.kind !== 'town' || UI.paused()) return;
  for (const { T, c } of wCampList(w)) {
    if (!T.camp.walk) continue;
    const d = Math.hypot(c.tx - c.x, c.ty - c.y);
    if (d < 4) { if ((c.wait -= dt) <= 0) { const a = Math.random() * Math.PI * 2, r = Math.random() * T.camp.walk, p = nearestFloor(c.hx + Math.cos(a) * r, c.hy + Math.sin(a) * r * 0.7); c.tx = p.x; c.ty = p.y; c.wait = rnd(0.8, 2.5); } c.mv = false; }
    else { const s = Math.min(d, (T.camp.walk > 60 ? 70 : 30) * dt); c.x += (c.tx - c.x) / d * s; c.y += (c.ty - c.y) / d * s; c.f = c.tx > c.x ? 1 : -1; c.mv = true; }
  }
  // 小雀那一章講完：送王冠（只送一次）
  if (P.story.seen.w_beast && P.wardens && !P.wardens.gifts.crown) {
    P.wardens.gifts.crown = 1; const lv = Math.min(80, mapLevel(Math.max(3, P.maxTier || 3)) + 3);
    const it = typeof makeSetItem === 'function' ? makeSetItem('set_dabai_crown', lv) : makeUnique('u_w_crown', lv);
    if (it) { wGive(it); UI.msg('小雀送你一頂「生鏽的小王冠」', '#ffd27a'); }
  }
});
Hook.on('drawWorld', g => {
  const w = G.world; if (!w || w.kind !== 'town') return;
  for (const { T, c } of wCampList(w)) {
    const k = T.camp, bob = k.float ? Math.round(Math.sin(G.time * 3 + c.hx) * 3) - 8 : (c.mv ? 0 : Math.round(Math.sin(G.time * 2 + c.hx)));
    if (k.ghost) g.globalAlpha = 0.6;
    drawSprite(g, k.sprite, c.x, c.y + 12, k.scale || 2, c.f, k.tint || null, false, bob, !!c.mv, 1);
    g.globalAlpha = 1;
    txt(g, G.nearAct && G.nearAct.ref === c ? `${ctlTag()}${k.name}` : k.name, c.x, c.y + 26, 11, '#c8d8b0', 'center');
  }
  // 歐莉的殘片冊
  const r = wShardRef(w);
  if (r) { const p = 0.5 + 0.5 * Math.sin(G.time * 3); g.fillStyle = '#5a3a1a'; g.fillRect(r.x - 9, r.y - 4, 18, 12); g.fillStyle = `rgba(255,214,120,${0.5 + 0.4 * p})`; g.fillRect(r.x - 7, r.y - 3, 6, 9); g.fillRect(r.x + 1, r.y - 3, 6, 9);
    txt(g, G.nearAct && G.nearAct.ref === r ? ctlTag() + '殘片冊' : '殘片冊', r.x, r.y + 22, 11, '#ffd27a', 'center'); }
});
Hook.on('light', (cut, cx, cy) => { const r = wShardRef(G.world); if (r) cut(r.x - cx, r.y - cy, 50, 0.5); });
Interact.add('wcamp', (pl, w) => wCampList(w).map(({ T, c }) => ({ ref: c, label: T.camp.name, r: 55 })), ref => {
  const e = wCampList(G.world).find(x => x.c === ref); if (!e) return;
  const line = pick(e.T.camp.lines); UI.msg(line.startsWith('（') ? line : `${e.T.camp.name}：${line}`, '#d8e8c0');
});
// —— 歐莉換傳奇 ——
function wShardRef(w) {
  if (!w || w.kind !== 'town' || w.hub !== 'cell' || !G.P || wShardTotal() <= 0) return null;
  if (!w.wshardRef) { const o = w.npcs.find(n => n.id === 'shop'); if (!o) return null; const p = nearestFloor(o.x - 66, o.y - 8); w.wshardRef = { x: p.x, y: p.y }; }
  return w.wshardRef;
}
Interact.add('wshard', (pl, w) => { const r = wShardRef(w); return r ? [{ ref: r, label: '殘片冊（跟歐莉換專屬傳奇）', r: 50 }] : null; }, () => wShardShop());
function wShardShop() {
  const P = G.P, opts = [];
  for (const id of WARDEN_IDS) { const n = wShardHave(id); if (!n) continue;
    for (const u of UNIQUES.filter(x => x.boss === id)) opts.push({ id, u, label: `${u.name}（${BOSSES[id].name}）`, desc: `要 10 片${BOSSES[id].name}的殘片　你有 ${n} 片`, dis: n < 10 }); }
  wChoose('歐莉的殘片冊', '歐莉翻開一本舊冊子：「看守者每倒下一次，就會留下一點碎片。湊滿 10 片，我就能照著冊子，把它的寶物寫回來。」', opts, i => {
    const o = opts[i]; if (!o || wShardHave(o.id) < 10) return;
    wShardAdd(o.id, -10);
    const lv = Math.min(83, mapLevel(Math.max(1, Math.min(P.maxTier || 1, 40))) + 3);
    wGive(makeUnique(o.u.id, lv)); UI.msg(`歐莉把「${o.u.name}」寫回來了`, '#ffd27a');
  }, true);
}
// —— 日誌分頁 ——
JournalTabs.add('wardens', '看守者', () => {
  const P = G.P; let h = '<div class="csec">看守者抉擇　<span class="thint">第一次的選擇決定營地和人物的變化；重打可以選別的。殘片 10 片在夢醒之牢跟歐莉換專屬傳奇（所有角色共用）</span></div>';
  for (const id of WARDEN_IDS) {
    const T = WARDEN_TEXT[id], f = P.wardens && P.wardens.first[id], R = (P.wardens && P.wardens.runs[id]) || {}, n = wShardHave(id);
    const runs = ['name', 'kill', 'free'].map(k => `${WCHOICE_NAME[k]} ${R[k] || 0}`).join('・');
    h += `<div class="jent"><b class="c-unique">${BOSSES[id].name}</b>　<span class="thint">${T.who}的請託</span><div>${f ? `第一次：${WCHOICE_NAME[f]}（${f === 'kill' ? WARDEN_KILL[0] : T.ch[f][0]}）　走過：${runs}` : (P.wardens && P.wardens.met[id] ? '還沒做出選擇' : '還沒見過')}　·　殘片 ${n} / 10</div></div>`;
  }
  return h;
});
