// =============================================================
//  v2.8.1 斷線、重開遊戲時保留「還沒打完的夢」5 分鐘（離線時間也算）
//  ・在地圖裡、或回營地時傳送門還開著：每 5 秒把那張地圖（地形、怪物、地上的東西）存一份
//  ・重新進入同一個角色：5 分鐘內，營地會有藍色傳送門可以回去；超過 5 分鐘就關閉
//  ・回到標題換角色：不保留（直接清掉）
//  ・怪物會照原本的種類、位置、剩下的血量回來；精英怪的詞綴會重新骰
// =============================================================
const DREAM_TTL = 5 * 60 * 1000;
const dreamKey = id => 'yiwang_dream_' + id;
function dreamSer(o) {
  const out = {};
  for (const k in o) {
    const v = o[k];
    if (typeof v === 'function' || k === 'folk' || k === 'amb' || k === 'canvas' || k === 'mini' || k === 'miniCtx') continue;
    if (v && typeof v === 'object' && (v instanceof HTMLCanvasElement || (typeof CanvasRenderingContext2D !== 'undefined' && v instanceof CanvasRenderingContext2D) || v instanceof ImageData)) continue;
    if (v && ArrayBuffer.isView(v)) { out[k] = { __ta: v.constructor.name, d: Array.from(v) }; continue; }
    out[k] = v;
  }
  return out;
}
function dreamDe(o) {
  for (const k in o) { const v = o[k]; if (v && v.__ta) o[k] = new (window[v.__ta] || Uint8Array)(v.d); }
  return o;
}
function dreamPack(world, mons, loot) {
  return {
    w: dreamSer(world),
    m: mons.filter(m => !m.dead).map(m => ({ type: m.type, boss: m.boss || null, x: Math.round(m.x), y: Math.round(m.y), mlvl: m.mlvl, rarity: m.rarity, lf: m.maxLife ? m.life / m.maxLife : 1, treasure: !!m.treasure })),
    l: loot.filter(l => !l.gone).map(l => { const c = Object.assign({}, l); delete c.wr; delete c.rect; return c; }),
  };
}
function dreamSave() {
  try {
    if (G.state !== 'play' || !G.P || !G.charId || !G.world) return;
    let rec = null;
    if (G.world.kind === 'map') rec = dreamPack(G.world, G.mons, G.loot);
    else if (G.savedMap && G.savedMap.world) rec = dreamPack(G.savedMap.world, G.savedMap.mons || [], G.savedMap.loot || []);
    if (!rec) return localStorage.removeItem(dreamKey(G.charId));
    rec.t = Date.now(); rec.exp = (G.savedMap && G.savedMap.expireAt) || 0;
    localStorage.setItem(dreamKey(G.charId), JSON.stringify(rec));
  } catch (e) { }
}
function dreamRestore(id) {
  let rec = null;
  try { rec = JSON.parse(localStorage.getItem(dreamKey(id))); } catch (e) { }
  if (!rec || !rec.w) return;
  const expireAt = rec.exp || (rec.t + DREAM_TTL);
  if (Date.now() > expireAt) { localStorage.removeItem(dreamKey(id)); UI.msg('上次沒打完的夢已經關閉了（超過 5 分鐘）', '#a89878'); return; }
  try {
    const w = dreamDe(rec.w), explored = w.explored;
    buildWorldCanvas(w);
    if (explored && explored.length === w.W * w.H) { w.explored = explored; for (let i = 0; i < explored.length; i++) if (explored[i]) paintMini(w, i % w.W, Math.floor(i / w.W)); }
    const mons = [];
    for (const s of rec.m) {
      const m = s.boss ? makeBoss(s.boss, s.x, s.y, s.mlvl) : makeMonster(s.type, s.x, s.y, s.mlvl, s.rarity, w.theme);
      if (!m) continue; m.life = Math.max(1, m.maxLife * s.lf); if (s.treasure) m.treasure = true; mons.push(m);
    }
    if (!w.portal) w.portal = { x: (w.start.x + w.start.w / 2) * TS, y: (w.start.y + w.start.h / 2) * TS, exit: true };
    for (const l of rec.l || []) fixOldFlask(l.item);   // v2.17 地上的舊單抗藥劑
    G.savedMap = { world: w, mons, loot: rec.l || [], bossBar: null, expireAt };
    const left = Math.ceil((expireAt - Date.now()) / 60000);
    UI.msg(`上次沒打完的夢還在！${left} 分鐘內可以從營地的藍色傳送門回去`, '#9fd0ff');
    UI.banner('夢還沒醒', `${w.name}・還剩約 ${left} 分鐘`, '#9fd0ff');
  } catch (e) { localStorage.removeItem(dreamKey(id)); }
}
Hook.on('start', () => {
  try { if (G.charId) dreamRestore(G.charId); } catch (e) { }
});
// 回去了就不再倒數；超過時間就關閉
const _resumeDream = resumeMap;
resumeMap = function () { if (G.savedMap) delete G.savedMap.expireAt; return _resumeDream(); };
Hook.on('update', dt => {
  if (G.savedMap && G.savedMap.expireAt && Date.now() > G.savedMap.expireAt) {
    G.savedMap = null; try { localStorage.removeItem(dreamKey(G.charId)); } catch (e) { }
    UI.msg('上次沒打完的夢關閉了（超過 5 分鐘）', '#a89878');
  }
});
// 換角色（回到標題）：不保留
const _backDream = backToTitle;
backToTitle = function () { try { if (G.charId) localStorage.removeItem(dreamKey(G.charId)); } catch (e) { } return _backDream.apply(this, arguments); };
setInterval(dreamSave, 5000);
window.addEventListener('pagehide', dreamSave);
document.addEventListener('visibilitychange', () => { if (document.hidden) dreamSave(); });
