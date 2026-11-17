// =============================================================
//  v2.6.1 背包改版：通貨、材料、輔助寶石、珠寶都是「背包裡的物品」，會佔格子、可以堆疊
//  ・背包物品 { stack: 'cur'|'mat'|'sup'|'jewel', key, n }
//  ・遊戲其他地方還是用 P.cur.chaos、P.mats.ore_2、P.supports.gmp、P.jewels.ruby_1 讀寫數量，
//    這裡用「代理」把它們接到背包格子：讀＝背包裡加起來有幾個，寫＝從背包拿走或放進去
//  ・背包放不下時（例如任務獎勵、分解、拆下輔助寶石）：多的自動送進倉庫；倉庫也滿就掉在腳邊
//  ・地上撿東西時背包滿了：撿不起來（東西留在地上）
//  ・技能寶石是「學會的技能」，不佔格子；夢魘碎片、鑰匙也不佔
// =============================================================
const STACK_TYPES = {
  cur: { name: k => CURRENCY[k] ? CURRENCY[k].name : k, max: k => k === 'portal' ? 40 : 20, color: k => (CURRENCY[k] || {}).color || '#e8d8a8', ok: k => !!CURRENCY[k],
    icon: k => currencyIconURL(k, 64), desc: k => CURRENCY[k].desc, kind: '通貨' },
  mat: { name: k => matName(k), max: () => 30, color: k => MATS[k.slice(0, k.lastIndexOf('_'))].color, ok: k => !!MATS[k.slice(0, k.lastIndexOf('_'))],
    icon: k => matIconURL(k.slice(0, k.lastIndexOf('_')), +k.slice(k.lastIndexOf('_') + 1), 64), desc: k => MATS[k.slice(0, k.lastIndexOf('_'))].desc + '（在工坊 B 用來製作、改造裝備）', kind: '材料' },
  sup: { name: k => SUPPORTS[k].name, max: () => 10, color: k => SUPPORTS[k].color, ok: k => !!SUPPORTS[k],
    icon: k => supportIconURL(k, 64), desc: k => SUPPORTS[k].desc + '（按 K 插到技能上）', kind: '輔助寶石' },
  jewel: { name: k => jewelName(k), max: () => 10, color: k => JEWELS[parseJewel(k).type].color, ok: k => { try { return !!JEWELS[parseJewel(k).type]; } catch (e) { return false; } },
    icon: k => jewelIconURL(k), desc: k => jewelText(k) + '（按 G 鑲到裝備的孔裡；3 顆同階合成高一階）', kind: '珠寶' },
};
const STACK_FIELD = { cur: 'cur', mat: 'mats', sup: 'supports', jewel: 'jewels' };
const isStack = it => !!(it && it.stack);
// 珠寶的小圖示（顏色＋階級數字）
const _jewelIconCache = {};
function jewelIconURL(k) {
  // v2.7（Higgsfield 美術工作階段）：有 AI 寶石圖（jw_<種類>）就用它，右下角標階級數字；關掉新美術照舊
  const art = typeof ArtStyle !== 'undefined' && ArtStyle.cell('jw_' + parseJewel(k).type);
  const ck = k + (art ? '|art' : '');
  if (_jewelIconCache[ck]) return _jewelIconCache[ck];
  if (art) {
    const j = parseJewel(k), c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const s = 40 + j.grade * 2.5;   // 階級越高，寶石畫得越大一點
    g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 3; g.drawImage(art, 32 - s / 2, 30 - s / 2, s, s); g.shadowBlur = 0;
    // 階級寫在左上角（右下角留給堆疊數量）
    g.font = 'bold 15px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
    g.lineWidth = 3; g.strokeStyle = '#000'; g.strokeText(j.grade, 3, 2); g.fillStyle = '#ffe9a8'; g.fillText(j.grade, 3, 2);
    return (_jewelIconCache[ck] = c.toDataURL());
  }
  const j = parseJewel(k), col = JEWELS[j.type].color, c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(26, 22, 4, 32, 32, 28); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, col); gr.addColorStop(1, '#101014');
  g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; g.lineTo(32 + Math.cos(a) * 24, 32 + Math.sin(a) * 26); } g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.stroke();
  g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000'; g.fillText(j.grade, 33, 35); g.fillStyle = '#fff'; g.fillText(j.grade, 32, 34);
  return (_jewelIconCache[k] = c.toDataURL());
}

// —— 背包／倉庫裡的堆疊 ——
function stackCount(list, type, key) { let n = 0; for (const it of list) if (it && it.stack === type && it.key === key) n += it.n; return n; }
// 放進 list（背包或倉庫分頁），回傳放不下的數量
function stackAdd(list, type, key, n) {
  const max = STACK_TYPES[type].max(key);
  for (const it of list) { if (n <= 0) break; if (it && it.stack === type && it.key === key && it.n < max) { const a = Math.min(n, max - it.n); it.n += a; n -= a; } }
  for (let i = 0; i < list.length && n > 0; i++) if (!list[i]) { const a = Math.min(n, max); list[i] = { stack: type, key, n: a }; n -= a; }
  return n;
}
function stackRemove(list, type, key, n) {
  for (let i = list.length - 1; i >= 0 && n > 0; i--) { const it = list[i]; if (it && it.stack === type && it.key === key) { const a = Math.min(n, it.n); it.n -= a; n -= a; if (it.n <= 0) list[i] = null; } }
  return n;
}
function stackRoom(list, type, key) { const max = STACK_TYPES[type].max(key); let r = 0; for (const it of list) { if (!it) r += max; else if (it.stack === type && it.key === key) r += max - it.n; } return r; }
// 背包放不下的：送進倉庫（分頁 1→4），還是放不下就掉在腳邊
function stackOverflow(type, key, n) {
  if (n <= 0) return;
  const name = STACK_TYPES[type].name(key);
  if (G.stash) for (const tab of G.stash.tabs) { if (n <= 0) break; n = stackAdd(tab, type, key, n); }
  if (n > 0 && G.pl && G.loot) { G.loot.push({ x: G.pl.x + rnd(-14, 14), y: G.pl.y + 10, t: 0, stackItem: { stack: type, key, n }, label: `${name} ×${n}`, color: STACK_TYPES[type].color(key) }); UI.msg(`背包和倉庫都滿了：${name} ×${n} 掉在腳邊`, '#ff9a9a'); }
  else UI.msg(`背包滿了，${name} 先送進倉庫`, '#d8c8a0');
}
// 讓 P.cur／P.mats／P.supports／P.jewels 讀寫的其實是背包
function stackView(P, type) {
  const keys = () => { const s = new Set(type === 'cur' ? Object.keys(CURRENCY) : []); for (const it of P.inv) if (it && it.stack === type) s.add(it.key); return [...s]; };
  return new Proxy({}, {
    get(_, k) { if (typeof k !== 'string' || k === 'toJSON') return undefined; return stackCount(P.inv, type, k); },
    set(_, k, v) {
      if (typeof k !== 'string') return true;
      const now = stackCount(P.inv, type, k), want = Math.max(0, Math.round(+v || 0));
      if (want > now) stackOverflow(type, k, stackAdd(P.inv, type, k, want - now));
      else if (want < now) stackRemove(P.inv, type, k, now - want);
      if (typeof UI !== 'undefined' && UI.refreshInv && G.P === P) setTimeout(() => UI.refreshInv(), 0);
      return true;
    },
    deleteProperty(_, k) { stackRemove(P.inv, type, k, Infinity); return true; },
    has(_, k) { return keys().includes(k); },
    ownKeys() { return keys(); },
    getOwnPropertyDescriptor(_, k) { return { enumerable: true, configurable: true, writable: true, value: stackCount(P.inv, type, k) }; },
  });
}
// 第一次用新版讀檔：把舊的數量搬進背包（放不下的進倉庫）
function installStacks(P) {
  if (P.invVer !== 2) {
    for (const type in STACK_FIELD) {
      const old = P[STACK_FIELD[type]] || {};
      for (const k in old) { const n = Math.round(old[k] || 0); if (n > 0 && STACK_TYPES[type].ok(k)) { const left = stackAdd(P.inv, type, k, n); if (left > 0 && G.stash) { let r = left; for (const tab of G.stash.tabs) { if (r <= 0) break; r = stackAdd(tab, type, k, r); } } } }
    }
    P.invVer = 2;
  }
  for (const type in STACK_FIELD) P[STACK_FIELD[type]] = stackView(P, type);
}
Hook.on('start', () => {
  installStacks(G.P); onBuildChanged(); if (UI.refresh) UI.refresh();
});

// —— 撿東西：背包滿了就撿不起來 ——
const _pickupBase = pickupLoot;
pickupLoot = function (l) {
  const P = G.P;
  if (l.stackItem) { // 掉在地上的一整疊
    const s = l.stackItem, left = stackAdd(P.inv, s.stack, s.key, s.n);
    if (left === s.n) return msgOnce('full', '背包滿了');
    s.n = left; Sfx.play('coin'); if (left <= 0) l.gone = true; else l.label = `${STACK_TYPES[s.stack].name(s.key)} ×${left}`;
    return UI.refreshInv();
  }
  const t = l.cur ? ['cur', l.cur] : l.mat ? ['mat', l.mat] : l.gem ? ['sup', l.gem] : l.jewel ? ['jewel', l.jewel] : null;
  if (t && stackRoom(P.inv, t[0], t[1]) < 1) return msgOnce('full', '背包滿了（回營地把通貨、材料存進倉庫）', '#ff9a9a');
  return _pickupBase(l);
};
// 地上的一整疊用通貨圖示畫
const _autoPickupBase = typeof autoPickup === 'function' ? autoPickup : null;
if (_autoPickupBase) autoPickup = function () {
  _autoPickupBase();
  const pl = G.pl; for (const l of G.loot) if (!l.gone && l.stackItem && l.t > 0.35 && dist(l, pl) < 34) pickupLoot(l);
};

// —— 說明 ——
function stackTipHTML(it, hint) {
  const T = STACK_TYPES[it.stack], col = T.color(it.key);
  return `<div class="tip-name" style="color:${col}"><img class="skico" src="${T.icon(it.key)}">${T.name(it.key)}</div>
    <div class="tip-sub">${T.kind}　·　這一疊 ${it.n} / ${T.max(it.key)}　·　背包共 ${stackCount(G.P.inv, it.stack, it.key)}</div>
    <div class="tip-mod" style="color:#d8ccb4">${T.desc(it.key)}</div>${hint ? `<div class="tip-hint">${hint}</div>` : ''}`;
}
// 一鍵存入倉庫：把背包裡某一類（或幾類）的堆疊全部搬進倉庫
function stashAllStacks(types) {
  const P = G.P; let moved = 0, left = 0;
  for (let i = 0; i < P.inv.length; i++) {
    const it = P.inv[i]; if (!it || !types.includes(it.stack)) continue;
    let n = it.n;
    for (const tab of G.stash.tabs) { if (n <= 0) break; n = stackAdd(tab, it.stack, it.key, n); }
    moved += it.n - n; left += n;
    if (n <= 0) P.inv[i] = null; else it.n = n;
  }
  UI.msg(moved ? `存進倉庫 ${moved} 個${left ? `（倉庫滿了，還有 ${left} 個留在背包）` : ''}` : '背包裡沒有可以存的', moved ? '#9fff9f' : '#d8c8a0');
  if (moved) Sfx.play('coin');
  UI.refreshInv(); UI.refreshStash(); saveGame();
}
