// =============================================================
//  v2.7.9 天賦樹：一鍵走最短路徑＋確認前可以隨意調整
//  ・滑鼠移到還沒點的天賦上：畫出最短路徑、顯示要花幾點；左鍵就把整條路一次點下去
//  ・剛點的天賦是「待確認」（虛線金圈）：右鍵免費取消，後面跟著斷掉的待確認點也一起退回
//  ・按「確認加點」才算數；關掉天賦樹時如果還有待確認的，會問要確認還是全部退回
//  ・已經確認的點，照舊要用重置點數才能退
// =============================================================
const pendOf = P => (P.treePend = (P.treePend || []).filter(id => P.tree.includes(id)));
// 從已點的天賦出發，找到 target 的最短路（只經過還沒點、沒被互斥擋住的點）
function treePath(P, target) {
  if (P.tree.includes(target)) return [];
  const blocked = id => { const n = TREE.nodes[id]; return n.excl && n.excl.some(x => P.tree.includes(x)); };
  if (blocked(target)) return null;
  const prev = new Map(), q = [];
  for (const id of P.tree) { prev.set(id, null); q.push(id); }
  for (let h = 0; h < q.length; h++) {
    const c = q[h];
    if (c === target) break;
    for (const l of TREE.nodes[c].links) if (!prev.has(l) && !blocked(l)) { prev.set(l, c); q.push(l); }
  }
  if (!prev.has(target)) return null;
  const path = []; for (let c = target; c && !P.tree.includes(c); c = prev.get(c)) path.unshift(c);
  // 路上兩個互斥的基石不能同時拿
  for (const id of path) { const n = TREE.nodes[id]; if (n.excl && n.excl.some(x => path.includes(x))) return null; }
  return path;
}
const treeFree = P => treePointsTotal(P) - treePointsUsed(P);

TreeView.tryAlloc = function (id) {
  const P = G.P, path = treePath(P, id);
  if (!path || !path.length) return;
  if (path.length > treeFree(P)) return UI.msg(`點數不夠：走到這裡要 ${path.length} 點，你還剩 ${treeFree(P)} 點`, '#ff9a9a');
  for (const x of path) { P.tree.push(x); pendOf(P).push(x); }
  Sfx.play('click'); onBuildChanged(); this.pathCache = null; this.updateHover(); TreePlan.bar();
};
const _refundTP = TreeView.tryRefund.bind(TreeView);
TreeView.tryRefund = function (id) {
  const P = G.P, pend = pendOf(P);
  if (!pend.includes(id)) return _refundTP(id);
  // 待確認的點：免費退；退掉後跟起點連不上的「待確認點」一起退
  const start = CLASSES[P.cls].start, rest = new Set(P.tree.filter(x => x !== id));
  const seen = new Set([start]), q = [start];
  while (q.length) { const c = q.pop(); for (const l of TREE.nodes[c].links) if (rest.has(l) && !seen.has(l)) { seen.add(l); q.push(l); } }
  const lost = [...rest].filter(x => !seen.has(x));
  if (lost.some(x => !pend.includes(x))) return UI.msg('這一點後面還接著已經確認的天賦，不能單獨退', '#ff9a9a');
  const drop = new Set([id, ...lost]);
  P.tree = P.tree.filter(x => !drop.has(x)); P.treePend = pend.filter(x => !drop.has(x));
  Sfx.play('click'); onBuildChanged(); this.pathCache = null; this.updateHover(); TreePlan.bar();
};
// 說明框：加上「走到這裡要幾點」「待確認」
const _tipTP = TreeView.nodeTip.bind(TreeView);
TreeView.nodeTip = function (n) {
  let h = _tipTP(n);
  const P = G.P;
  if (pendOf(P).includes(n.id)) h = h.replace(/<div class="tip-hint">[\s\S]*?<\/div>/, '<div class="tip-hint" style="color:#ffd36a">待確認：右鍵免費取消（後面接著的待確認點也會一起退）</div>');
  else if (!P.tree.includes(n.id)) {
    const path = treePath(P, n.id);
    if (path && path.length > 1) h = h.replace(/<div class="tip-hint">[\s\S]*?<\/div>/, `<div class="tip-hint" style="color:${path.length <= treeFree(P) ? '#9fff9f' : '#ff9a9a'}">左鍵：沿最短路徑一次點到這裡，共 ${path.length} 點（你還剩 ${treeFree(P)} 點）</div>`);
  }
  return h;
};
// 畫：待確認的點（金色虛線圈）、滑鼠指著的那條最短路徑
const _drawTP = TreeView.draw.bind(TreeView);
TreeView.draw = function () {
  _drawTP();
  const g = this.g, P = G.P; if (!P) return;
  g.save(); g.lineWidth = 2;
  // 最短路徑預覽
  const hv = this.hover && !P.tree.includes(this.hover.id) ? this.hover.id : null;
  if (hv) {
    if (!this.pathCache || this.pathCache.id !== hv || this.pathCache.n !== P.tree.length) this.pathCache = { id: hv, n: P.tree.length, path: treePath(P, hv) };
    const path = this.pathCache.path;
    if (path && path.length) {
      const ok = path.length <= treeFree(P), col = ok ? 'rgba(160,255,160,0.9)' : 'rgba(255,140,140,0.9)';
      g.strokeStyle = col; g.setLineDash([6, 5]); g.lineDashOffset = -G.time * 30;
      const first = TREE.nodes[path[0]], from = TREE.nodes[first.links.find(l => P.tree.includes(l))] || first;
      g.beginPath(); let p = this.toScreen(from); g.moveTo(p.x, p.y);
      for (const id of path) { p = this.toScreen(TREE.nodes[id]); g.lineTo(p.x, p.y); }
      g.stroke(); g.setLineDash([]);
      g.fillStyle = col; g.font = 'bold 13px sans-serif'; g.textAlign = 'center';
      const e = this.toScreen(TREE.nodes[hv]); g.fillText(`${path.length} 點`, e.x, e.y - this.nodeR(TREE.nodes[hv]) - 8);
    }
  }
  // v2.12.7 手機：點了第一下的天賦點畫一圈閃爍的白圈（再點一下就點下去）
  if (this.tapSel && TREE.nodes[this.tapSel]) { const n = TREE.nodes[this.tapSel], p = this.toScreen(n); g.strokeStyle = `rgba(255,255,255,${0.55 + 0.4 * Math.sin(G.time * 8)})`; g.lineWidth = 3; g.setLineDash([]); g.beginPath(); g.arc(p.x, p.y, this.nodeR(n) + 9, 0, Math.PI * 2); g.stroke(); g.lineWidth = 2; }
  // 待確認的點
  g.strokeStyle = 'rgba(255,211,106,0.95)'; g.setLineDash([4, 3]);
  for (const id of pendOf(P)) { const n = TREE.nodes[id], p = this.toScreen(n); g.beginPath(); g.arc(p.x, p.y, this.nodeR(n) + 5, 0, Math.PI * 2); g.stroke(); }
  g.restore();
};
// 確認列
const TreePlan = {
  bar() {
    const P = G.P; let b = document.getElementById('treePlan');
    if (!b) {
      b = document.createElement('div'); b.id = 'treePlan';
      b.innerHTML = '<span class="tpt"></span><button class="tpok">確認加點</button><button class="tpno">全部取消</button>';
      document.getElementById('tree').appendChild(b);
      b.querySelector('.tpok').onclick = () => this.confirm();
      b.querySelector('.tpno').onclick = () => this.cancel();
    }
    const n = P ? pendOf(P).length : 0;
    b.style.display = n ? 'flex' : 'none';
    if (n) b.querySelector('.tpt').textContent = typeof IS_TOUCH !== 'undefined' && IS_TOUCH ? `${n} 點待確認（點兩下可以免費取消）` : `${n} 點待確認（右鍵可以免費取消）`;
  },
  confirm() { const P = G.P; const n = pendOf(P).length; P.treePend = []; Sfx.play('levelup'); UI.msg(`天賦確認：${n} 點`, '#9fff9f'); saveGame(); this.bar(); },
  cancel() { const P = G.P, pend = new Set(pendOf(P)); P.tree = P.tree.filter(x => !pend.has(x)); P.treePend = []; onBuildChanged(); saveGame(); this.bar(); },
};
// 關掉天賦樹時，還有待確認的點 → 問一次
const _toggleTP = UI.toggle.bind(UI);
UI.toggle = function (name, force) {
  if (name === 'tree' && G.P) {
    const v = force ?? !this.open.tree;
    if (!v && this.open.tree && pendOf(G.P).length) {
      const n = G.P.treePend.length;
      return gameAsk(`還有 ${n} 點天賦沒有確認。\n確認之後要退點，就要花重置點數了。`, () => { TreePlan.confirm(); _toggleTP('tree', false); }, { yes: '確認加點', no: '全部退回', onNo: () => { TreePlan.cancel(); _toggleTP('tree', false); } });
    }
    const r = _toggleTP(name, force);
    if (v) TreePlan.bar();
    return r;
  }
  return _toggleTP(name, force);
};
// 讀檔時，上次沒確認就關遊戲的：當作沒點（退回）
Hook.on('start', () => { try { if (G.P && G.P.treePend && G.P.treePend.length) TreePlan.cancel(); } catch (e) { } });
(() => {
  const st = document.createElement('style');
  st.textContent = `#treePlan { position:absolute; left:50%; bottom:14px; transform:translateX(-50%); display:none; align-items:center; gap:10px; padding:8px 14px; background:rgba(14,10,6,.92); border:1px solid #c8a050; border-radius:6px; z-index:5; box-shadow:0 2px 14px rgba(0,0,0,.7); }
  #treePlan .tpt { color:#ffd36a; font-size:14px; } #treePlan button { font-size:14px; padding:4px 12px; } #treePlan .tpok { border-color:#9fff9f; color:#cfffcf; }`;
  document.head.appendChild(st);
})();
