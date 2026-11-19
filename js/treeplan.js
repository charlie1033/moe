// =============================================================
//  v2.7.9 天賦樹：一鍵走最短路徑＋確認前可以隨意調整
//  ・滑鼠移到還沒點的天賦上：畫出最短路徑、顯示要花幾點；左鍵就把整條路一次點下去
//  ・剛點的天賦是「待確認」（虛線金圈）：右鍵免費取消，後面跟著斷掉的待確認點也一起退回
//  ・按「確認加點」才算數；關掉天賦樹時如果還有待確認的，會問要確認還是全部退回
//  ・已經確認的點，照舊要用重置點數才能退
//  ・v2.19.7 手機：點一下天賦＝選取（白圈＋畫面下方的說明卡），按卡上的「點這個天賦」／「點這 N 個（需要 N 點）」才點；
//    點已點的天賦，卡上是「退回這一點」；點空白處或「取消」＝取消選取。說明卡和確認列一起放在畫面下方（#treeDock）
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
  const lv = path.map(x => TREE.nodes[x]).find(x => x.lvl && P.lvl < x.lvl);
  if (lv) return UI.msg(`「${lv.name}」需要等級 ${lv.lvl}`, '#ff9a9a');
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
  if (pendOf(P).includes(n.id)) h = h.replace(/<div class="tip-hint">[\s\S]*?<\/div>/, `<div class="tip-hint" style="color:#ffd36a">待確認：${byCtl('右鍵免費取消', '再點一下就免費取消')}（後面接著的待確認點也會一起退）</div>`);
  else if (!P.tree.includes(n.id)) {
    const path = treePath(P, n.id);
    if (path && path.length > 1) h = h.replace(/<div class="tip-hint">[\s\S]*?<\/div>/, `<div class="tip-hint" style="color:${path.length <= treeFree(P) ? '#9fff9f' : '#ff9a9a'}">${byCtl('左鍵', '再點一下')}：沿最短路徑一次點到這裡，共 ${path.length} 點（你還剩 ${treeFree(P)} 點）</div>`);
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
  const hn = this.touchMode ? (this.tapSel && TREE.nodes[this.tapSel]) : this.hover;   // 手機：預覽「選取的點」的路徑
  const hv = hn && !P.tree.includes(hn.id) ? hn.id : null;
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
  // 手機：選取的天賦點畫一圈閃爍的白圈（按下方說明卡的按鈕才點）
  if (this.tapSel && TREE.nodes[this.tapSel]) { const n = TREE.nodes[this.tapSel], p = this.toScreen(n); g.strokeStyle = `rgba(255,255,255,${0.55 + 0.4 * Math.sin(G.time * 8)})`; g.lineWidth = 3; g.setLineDash([]); g.beginPath(); g.arc(p.x, p.y, this.nodeR(n) + 9, 0, Math.PI * 2); g.stroke(); g.lineWidth = 2; }
  // 待確認的點
  g.strokeStyle = 'rgba(255,211,106,0.95)'; g.setLineDash([4, 3]);
  for (const id of pendOf(P)) { const n = TREE.nodes[id], p = this.toScreen(n); g.beginPath(); g.arc(p.x, p.y, this.nodeR(n) + 5, 0, Math.PI * 2); g.stroke(); }
  g.restore();
};
// 確認列
const TreePlan = {
  dock() {
    let d = document.getElementById('treeDock');
    if (!d) { d = document.createElement('div'); d.id = 'treeDock'; document.getElementById('tree').appendChild(d); }
    return d;
  },
  bar() {
    const P = G.P; let b = document.getElementById('treePlan');
    if (!b) {
      b = document.createElement('div'); b.id = 'treePlan';
      b.innerHTML = '<span class="tpt"></span><button class="tpok">確認加點</button><button class="tpno">全部取消</button>';
      this.dock().appendChild(b);
      b.querySelector('.tpok').onclick = () => this.confirm();
      b.querySelector('.tpno').onclick = () => this.cancel();
    }
    const n = P ? pendOf(P).length : 0;
    b.style.display = n ? 'flex' : 'none';
    if (n) b.querySelector('.tpt').innerHTML = IS_TOUCH ? `${n} 點待確認<small>點已點的天賦可以免費退回</small>` : `${n} 點待確認（右鍵可以免費取消）`;
  },
  // 手機：選取天賦的說明卡（點一下天賦就出現；按卡上的按鈕才真的點下去）
  sel(pan) {
    const T = TreeView, P = G.P, id = T.tapSel, n = id && TREE.nodes[id];
    let c = document.getElementById('treeSel');
    if (!c) {
      c = document.createElement('div'); c.id = 'treeSel'; this.dock().prepend(c);
      c.addEventListener('click', e => {
        const a = e.target.closest('[data-ta]'); if (!a) return;
        const k = a.dataset.ta, sid = T.tapSel, had = G.P.tree.includes(sid);
        if (k === 'alloc') T.tryAlloc(sid);
        else if (k === 'refund') T.tryRefund(sid);
        else if (k === 'jewel') T.tryAlloc(sid);
        if (k === 'x' || k === 'jewel' || G.P.tree.includes(sid) !== had) T.tapSel = null;   // 點成功、退成功、取消 → 收起來；沒成功（點數不夠）就留著
        this.sel();
      });
    }
    const on = !!(n && P && UI.open.tree);
    this.dock().classList.toggle('hassel', on);   // 說明卡開著時，確認列先收起來（畫面小，兩個疊起來會蓋住一半的樹）
    if (!on) { c.style.display = 'none'; return; }
    const info = T.nodeTip(n).replace(/<div class="tip-hint"[\s\S]*?<\/div>/g, '');
    const own = P.tree.includes(id), free = treeFree(P), btn = [];
    let line = '';
    if (own) {
      if (typeof isSock === 'function' && isSock(id)) btn.push(['jewel', '鑲嵌珠寶']);
      if (pendOf(P).includes(id)) { line = '待確認：現在退回不用花點數'; btn.push(['refund', '退回這一點']); }
      else if (canRefund(P, id)) { const fr = respecFree(P); line = fr ? `${FREE_RESPEC_LVL} 級前退點免費` : `退點要花 1 點重置點數（你有 ${P.respec || 0} 點）`; btn.push(['refund', fr ? '退回這一點' : '花 1 點重置退回']); }
      else line = '已經點了';
    } else {
      const path = treePath(P, id), lv = path && path.map(x => TREE.nodes[x]).find(x => x.lvl && P.lvl < x.lvl);
      if (!path) line = n.excl && n.excl.some(x => P.tree.includes(x)) ? '跟你已經點的基石互斥，不能點' : '走不到這裡';
      else if (lv) line = `「${lv.name}」需要等級 ${lv.lvl}`;
      else if (path.length > free) line = `走到這裡要 ${path.length} 點，你只剩 ${free} 點`;
      else { line = `你還有 ${free} 點`; btn.push(['alloc', path.length > 1 ? `點這 ${path.length} 個（需要 ${path.length} 點）` : '點這個天賦']); }
    }
    btn.push(['x', '取消']);
    c.innerHTML = `<div class="tsinfo">${info}<div class="tsline">${line}</div></div><div class="tsbtns">${btn.map(([k, t]) => `<button data-ta="${k}" class="${k === 'alloc' ? 'tpok' : ''}">${t}</button>`).join('')}</div>`;
    c.style.display = 'flex';
    // 選的點被說明卡蓋住：把天賦樹往上推，讓點露出來
    if (pan) {
      const cr = T.canvas.getBoundingClientRect(), dr = c.getBoundingClientRect(), p = T.toScreen(n), lim = dr.top - cr.top - T.nodeR(n) - 16;
      if (p.y > lim) T.oy -= p.y - lim;
    }
  },
  confirm() { TreeView.tapSel = null; this.sel(); const P = G.P; const n = pendOf(P).length; P.treePend = []; Sfx.play('levelup'); UI.msg(`天賦確認：${n} 點`, '#9fff9f'); saveGame(); this.bar(); },
  cancel() { TreeView.tapSel = null; this.sel(); const P = G.P, pend = new Set(pendOf(P)); P.tree = P.tree.filter(x => !pend.has(x)); P.treePend = []; onBuildChanged(); saveGame(); this.bar(); },
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
    TreeView.tapSel = null;
    const r = _toggleTP(name, force);
    if (v) TreePlan.bar();
    TreePlan.sel();
    return r;
  }
  return _toggleTP(name, force);
};
// 讀檔時，上次沒確認就關遊戲的：當作沒點（退回）
Hook.on('start', () => { try { if (G.P && G.P.treePend && G.P.treePend.length) TreePlan.cancel(); } catch (e) { } });
(() => {
  const st = document.createElement('style');
  st.textContent = `#treeDock { position:absolute; left:50%; bottom:14px; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:6px; z-index:5; max-width:calc(100% - 16px); }
  #treePlan { display:none; align-items:center; gap:10px; padding:8px 14px; background:rgba(14,10,6,.92); border:1px solid #c8a050; border-radius:6px; box-shadow:0 2px 14px rgba(0,0,0,.7); }
  #treePlan .tpt { color:#ffd36a; font-size:14px; } #treePlan .tpt small { display:block; font-size:11px; color:#c8b890; } #treePlan button { font-size:14px; padding:4px 12px; } #treeDock .tpok { border-color:#9fff9f; color:#cfffcf; }
  #treeSel { display:none; align-items:center; gap:12px; padding:8px 12px; width:min(560px, calc(100vw - 24px)); box-sizing:border-box; background:rgba(14,10,6,.95); border:1px solid #e8d8a8; border-radius:8px; box-shadow:0 2px 16px rgba(0,0,0,.8); }
  #treeSel .tsinfo { flex:1; min-width:0; max-height:34vh; overflow-y:auto; font-size:13px; }
  #treeSel .tsinfo .tip-sep { margin:3px 0; } #treeSel .tsline { margin-top:4px; color:#ffd36a; font-size:12px; }
  #treeSel .tsbtns { display:flex; flex-direction:column; gap:6px; flex-shrink:0; }
  #treeDock.hassel #treePlan { display:none !important; }
  #tree .ph { flex-shrink:0; } #treeCanvas { min-height:0; }   /* 畫面矮的時候標題列不會被畫布擠扁（以前手機上只剩 9 像素高、字被切掉） */
  body.touch #treeDock button { min-height:40px; min-width:64px; font-size:14px; padding:4px 12px; white-space:nowrap; }
  #tree .ph .tseg { display:inline-block; white-space:nowrap; margin-right:12px; }
  body.touch #tree .ph > span:last-child { white-space:nowrap; flex-shrink:0; }`;
  document.head.appendChild(st);
  // 標題列的操作說明：分段，只在「·」的地方換行（手機版的文字在 touchtext.js，已經分好段）
  const th = document.querySelector('#tree .ph .thint');
  if (th && !th.querySelector('.tseg')) th.innerHTML = th.textContent.split(/\s*·\s*/).map(s => `<span class="tseg">${s}</span>`).join('');
})();
