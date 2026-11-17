// =============================================================
//  v2.8.6 天賦樹的珠寶洞＋天賦珠寶
//  ・天賦樹中圈多了 8 個「珠寶洞」（六角形），要花 1 點天賦點亮
//  ・點亮後左鍵點它：選一顆背包裡的「天賦珠寶」鑲進去（已經有的會換下來回到背包）
//  ・天賦珠寶有自己的詞綴池（跟裝備不一樣），魔法 1～2 條、稀有 3～4 條；只在深層夢境（第 11 夜以上）掉落
//  ・退掉珠寶洞那一點時，裡面的珠寶自動回到背包
// =============================================================
const TJ_AFFIX = [
  ['life_inc', 4, 8], ['mana_inc', 6, 10], ['es_inc', 6, 12], ['armour_inc', 10, 20], ['evasion_inc', 10, 20], ['res_all', 4, 8],
  ['dmg_inc', 5, 10], ['attack_inc', 6, 12], ['spell_inc', 6, 12], ['melee_inc', 6, 12], ['proj_inc', 6, 12], ['phys_inc', 8, 14],
  ['ele_inc', 6, 12], ['dot_inc', 8, 14], ['crit_inc', 8, 16], ['crit_multi', 6, 12], ['aspd_inc', 3, 6], ['cspd_inc', 3, 6],
  ['area_inc', 4, 8], ['move_inc', 2, 4], ['cdr', 2, 4], ['minion_dmg_inc', 8, 14], ['minion_life_inc', 8, 14], ['curse_eff', 4, 8],
  ['poison_ch', 3, 6], ['bleed_ch', 3, 6], ['ignite_ch', 3, 6], ['block', 1, 3], ['dodge', 1, 2], ['all_attr', 4, 8], ['leech', 0.2, 0.4, 1],
];
const TJ_NAME_A = ['深淵', '夢魘', '星辰', '虛空', '遺忘', '黎明', '霜燼', '血月', '沉睡', '迴廊'];
const TJ_NAME_B = ['之眼', '之心', '低語', '碎片', '印記', '迴響', '淚滴', '火種', '星核', '殘夢'];
BASE_BY_ID.tjewel = { id: 'tjewel', slot: 'tjewel', cls: 'tjewel', clsName: '天賦珠寶', name: '深淵珠寶', lvl: 1, req: {}, implicit: [] };
ITEM_ART.tjewel = (g) => {
  const gr = g.createRadialGradient(44, 40, 4, 50, 50, 40); gr.addColorStop(0, '#f0e0ff'); gr.addColorStop(0.35, '#9a5ae0'); gr.addColorStop(1, '#1a0c2a');
  g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(50 + Math.cos(a) * 34, 50 + Math.sin(a) * 34); } g.closePath(); g.fill();
  g.strokeStyle = '#e8c0ff'; g.lineWidth = 3; g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(50, 22); g.lineTo(50, 78); g.moveTo(26, 36); g.lineTo(74, 64); g.moveTo(74, 36); g.lineTo(26, 64); g.stroke();
};
const isTreeJewel = it => !!(it && it.base === 'tjewel');
function makeTreeJewel(ilvl, rarity) {
  rarity = rarity || (Math.random() < 0.3 ? 'rare' : 'magic');
  const n = rarity === 'rare' ? rint(3, 4) : rint(1, 2), f = 0.6 + 0.4 * Math.min(1, Math.max(0, (ilvl - 60) / 24));
  const pool = TJ_AFFIX.slice(), mods = [];
  for (let i = 0; i < n && pool.length; i++) {
    const [stat, lo, hi, dec] = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const raw = rnd(lo, hi) * f; mods.push({ stat, v: dec ? Math.round(raw * 10) / 10 || 0.1 : Math.max(1, Math.round(raw)), tj: true });
  }
  return { uid: newUid(), base: 'tjewel', rarity, ilvl, mods, implicit: [], sockets: [], name: rarity === 'rare' ? pick(TJ_NAME_A) + pick(TJ_NAME_B) : '深淵珠寶' };
}
// 不能當裝備穿、不能用通貨改
const _canEquipTJ = canEquip;
canEquip = function (it) { if (isTreeJewel(it)) return '天賦珠寶要鑲在天賦樹的珠寶洞（按 P）'; return _canEquipTJ(it); };
const _equipTJ = UI.equipFromInv.bind(UI);
UI.equipFromInv = function (i, slot) { if (isTreeJewel(G.P.inv[i])) { this.msg('天賦珠寶要鑲在天賦樹的珠寶洞：按 P 打開天賦樹，左鍵點亮的珠寶洞', '#c8a0ff'); return null; } return _equipTJ(i, slot); };
const _applyCurTJ = applyCurrency;
applyCurrency = function (cur, item) { if (isTreeJewel(item)) return '天賦珠寶不能用通貨改造'; return _applyCurTJ(cur, item); };

// —— 天賦樹上的珠寶洞（建在現有的樹上，不改變原本的連線，舊的配點不受影響）——
(function addSockets() {
  const parents = INNER_CONSTS.map((c, i) => `A${i}_b`).filter((id, i) => i % 2 === 0 && TREE.nodes[id]);
  parents.forEach((pid, k) => {
    const p = TREE.nodes[pid], R = Math.hypot(p.x, p.y) || 1, tx = -p.y / R, ty = p.x / R;
    const cand = [1, -1].map(sd => ({ x: p.x + tx * 46 * sd, y: p.y + ty * 46 * sd })).map(c => ({ ...c, free: Math.min(...TREE.list.map(n => Math.hypot(n.x - c.x, n.y - c.y))) }));
    const c = cand[0].free >= cand[1].free ? cand[0] : cand[1];
    const id = `JS${k}`;
    const n = { id, ang: Math.atan2(c.y, c.x) * 180 / Math.PI, rad: Math.hypot(c.x, c.y), x: c.x, y: c.y, kind: 'jsock', name: '珠寶洞', stats: {}, flags: [], links: [pid], cat: 'util' };
    TREE.nodes[id] = n; TREE.list.push(n); p.links.push(id);
  });
})();
const isSock = id => TREE.nodes[id] && TREE.nodes[id].kind === 'jsock';
// 角色的珠寶洞內容 → 套到節點的數值上（只有點亮的才算）；沒點亮的洞裡如果有珠寶，退回背包
function applyTreeJewels() {
  const P = G.P; if (!P) return;
  P.treeJewels = P.treeJewels || {};
  for (const n of TREE.list) if (n.kind === 'jsock') n.stats = {};
  for (const id in P.treeJewels) {
    const it = P.treeJewels[id]; if (!it) { delete P.treeJewels[id]; continue; }
    if (!P.tree.includes(id)) {
      const j = P.inv.indexOf(null); if (j < 0) continue;   // 背包滿了先留著，下次再退
      P.inv[j] = it; delete P.treeJewels[id]; UI.msg(`珠寶洞退掉了：${it.name} 回到背包`, '#c8a0ff'); continue;
    }
    const st = TREE.nodes[id].stats; for (const m of it.mods) st[m.stat] = (st[m.stat] || 0) + m.v;
  }
}
const _obcTJ = onBuildChanged;
onBuildChanged = function (...a) { try { applyTreeJewels(); } catch (e) { } return _obcTJ(...a); };
// 天賦樹介面
const _nodeRTJ = TreeView.nodeR.bind(TreeView);
TreeView.nodeR = function (n) { return n.kind === 'jsock' ? 11 * Math.max(0.75, this.scale) : _nodeRTJ(n); };
const _tipTJ = TreeView.nodeTip.bind(TreeView);
TreeView.nodeTip = function (n) {
  if (n.kind !== 'jsock') return _tipTJ(n);
  const P = G.P, it = (P.treeJewels || {})[n.id], alloc = P.tree.includes(n.id);
  let h = `<div class="tip-name" style="color:#c8a0ff">珠寶洞</div><div class="tip-sub">天賦樹・可以鑲一顆天賦珠寶</div>`;
  if (it) h += `<div class="tip-sep"></div>` + itemTipHTML(it);
  else h += `<div class="tip-mod" style="color:#a89878">空的。天賦珠寶只在深層夢境（第 11 夜以上）掉落。</div>`;
  h += `<div class="tip-hint">${alloc ? '左鍵：選一顆天賦珠寶鑲進來' + (it ? '（換下來的回到背包）' : '') : '先點亮這一點（花 1 點天賦點）'}</div>`;
  return h;
};
const _tryAllocTJ = TreeView.tryAlloc.bind(TreeView);
TreeView.tryAlloc = function (id) { if (isSock(id) && G.P.tree.includes(id)) return TJPick.open(id); return _tryAllocTJ(id); };
const _drawTJ = TreeView.draw.bind(TreeView);
TreeView.draw = function () {
  _drawTJ();
  const g = this.g, P = G.P; if (!P) return;
  for (const n of TREE.list) if (n.kind === 'jsock') {
    const p = this.toScreen(n), r = this.nodeR(n) + 3, it = (P.treeJewels || {})[n.id], alloc = P.tree.includes(n.id);
    g.save(); g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); } g.closePath();
    g.fillStyle = it ? (it.rarity === 'rare' ? '#d8c040' : '#7a80f0') : alloc ? '#2a1a3a' : '#120c18'; g.fill();
    g.strokeStyle = alloc ? '#e8c0ff' : 'rgba(200,170,255,0.5)'; g.lineWidth = 2; g.stroke();
    if (it) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(p.x - r * 0.25, p.y - r * 0.3, r * 0.22, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
};
// 選珠寶的小視窗
const TJPick = {
  open(id) {
    const P = G.P; let box = document.getElementById('tjPick');
    if (!box) { box = document.createElement('div'); box.id = 'tjPick'; document.getElementById('tree').appendChild(box); }
    const list = P.inv.map((it, i) => [it, i]).filter(([it]) => isTreeJewel(it));
    const cur = (P.treeJewels || {})[id];
    box.innerHTML = `<div class="tjh">珠寶洞${cur ? `　<span class="thint">目前：${cur.name}</span>` : ''}<span class="tjx">✕</span></div>`
      + (list.length ? list.map(([it, i]) => `<div class="tjrow" data-i="${i}"><img src="${itemIconURL(BASE_BY_ID.tjewel, 32)}"><div><b class="c-${it.rarity}">${it.name}</b><br>${it.mods.map(m => STAT_TEXT[m.stat] ? STAT_TEXT[m.stat](m.v) : m.stat).join('　')}</div></div>`).join('')
        : '<div class="thint" style="padding:8px">背包裡沒有天賦珠寶。深層夢境（第 11 夜以上）才會掉。</div>')
      + (cur ? `<button class="tjout">把「${cur.name}」拿回背包</button>` : '');
    box.style.display = 'block';
    box.querySelector('.tjx').onclick = () => this.close();
    box.querySelectorAll('.tjrow').forEach(r => r.onclick = () => {
      const i = +r.dataset.i, it = P.inv[i]; P.treeJewels = P.treeJewels || {};
      P.inv[i] = P.treeJewels[id] || null; P.treeJewels[id] = it;
      Sfx.play('equip'); UI.msg(`珠寶洞鑲上了 ${it.name}`, '#c8a0ff'); onBuildChanged(); UI.refreshInv(); saveGame(); this.close();
    });
    const out = box.querySelector('.tjout');
    if (out) out.onclick = () => { const j = P.inv.indexOf(null); if (j < 0) return UI.msg('背包滿了', '#ff9a9a'); P.inv[j] = cur; delete P.treeJewels[id]; onBuildChanged(); UI.refreshInv(); saveGame(); this.close(); };
  },
  close() { const b = document.getElementById('tjPick'); if (b) b.style.display = 'none'; },
};
const _toggleTJ = UI.toggle.bind(UI);
UI.toggle = function (name, force) { if (name === 'tree') TJPick.close(); return _toggleTJ(name, force); };
// 讀檔時套一次
Hook.on('start', () => { try { onBuildChanged(); } catch (e) { } });
// 掉落：只有深層夢境
Hook.on('kill', m => {
  const w = G.world;
  if (w && (w.tier || 0) >= DEEP_TIER) {
    const ch = (m.boss ? 0.4 : { normal: 0.003, magic: 0.012, rare: 0.035 }[m.rarity] || 0) * (1 + ((w.mm && w.mm.q) || 0) / 100);
    if (Math.random() < ch) dropLoot(m.x, m.y, { item: makeTreeJewel(m.mlvl, m.boss || Math.random() < 0.3 + ((w.mm && w.mm.r) || 0) / 300 ? 'rare' : 'magic') });
  }
});
(() => {
  const st = document.createElement('style');
  st.textContent = `#tjPick { position:absolute; right:16px; top:56px; width:330px; max-height:70%; overflow:auto; display:none; z-index:6; background:rgba(14,10,18,.96); border:1px solid #9a70d0; border-radius:6px; padding:8px; box-shadow:0 4px 18px rgba(0,0,0,.7); }
  #tjPick .tjh { color:#e0c8ff; font-size:14px; margin-bottom:6px; display:flex; gap:6px; align-items:center; } #tjPick .tjx { margin-left:auto; cursor:pointer; color:#a89878; }
  #tjPick .tjrow { display:flex; gap:8px; align-items:flex-start; padding:5px; border:1px solid #3a2a4a; border-radius:4px; margin:4px 0; cursor:pointer; font-size:12px; color:#d8ccb4; }
  #tjPick .tjrow:hover { border-color:#e0c0ff; background:rgba(160,110,220,.12); } #tjPick .tjrow img { width:32px; height:32px; }
  #tjPick .tjout { width:100%; margin-top:6px; }`;
  document.head.appendChild(st);
})();
