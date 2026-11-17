// =============================================================
//  v2.8.2 技能可以升級時，任務提示上方出現「技能升級」的快捷按鈕
//  ・只列技能欄上、經驗已滿、等級和屬性也夠的寶石；點一下就升級
//  ・經驗滿了但屬性或等級不夠的，會灰掉並寫還差什麼
// =============================================================
function gemQuickList() {
  const P = G.P; if (!P) return [];
  const out = [];
  for (const sid of new Set(P.skills.filter(x => x))) {
    const d = gemData(sid); if (d.lv >= GEM_MAX || d.xp < gemXpNeed(sid, d.lv)) continue;
    const lack = gemReqLack(sid, d.lv + 1), L = gemReqLvl(sid, d.lv + 1), A = gemReqAttr(sid, d.lv + 1), a = Object.keys(A).find(x => G.S[x] < A[x]);
    out.push({ sid, lv: d.lv, lack, short: lack ? (P.lvl < L ? `需要 Lv ${L}` : `需要${ATTR_ZH[a]} ${A[a]}`) : '' });
  }
  return out;
}
const _renderQuestGQ = UI.renderQuest.bind(UI);
UI.renderQuest = function () {
  _renderQuestGQ();
  const box = $('#questbox'); if (!box || !G.P) return;
  const list = gemQuickList();
  let el = document.getElementById('gemQuick');
  if (!list.length) { if (el) el.remove(); return; }
  if (!el || el.parentNode !== box) { el = document.createElement('div'); el.id = 'gemQuick'; box.prepend(el); }
  el.innerHTML = `<div class="gqh">技能可以升級</div>` + list.map(g => `<button class="gqb ${g.lack ? 'lack' : ''}" data-gq="${g.sid}" title="${g.lack ? '還不能升：' + g.lack : '點一下升級'}"><img src="${skillIconURL(g.sid, 32)}"><span>${SKILLS[g.sid].name}</span><b>${g.lack ? g.short : `Lv ${g.lv} → ${g.lv + 1}`}</b></button>`).join('');
  el.querySelectorAll('[data-gq]').forEach(b => b.onclick = e => { e.stopPropagation(); gemLevelUp(b.dataset.gq); UI.refreshSkills && UI.refreshSkills(); UI.renderQuest(); });
};
// 經驗是打怪時慢慢加的：狀態改變時才重畫，不會一直閃
let _gqSig = '';
setInterval(() => {
  if (typeof G === 'undefined' || G.state !== 'play' || !G.P) return;
  const sig = gemQuickList().map(g => g.sid + g.lv + (g.lack || '')).join('|');
  if (sig !== _gqSig) { _gqSig = sig; UI.renderQuest(); }
}, 500);
(() => {
  const st = document.createElement('style');
  st.textContent = `#gemQuick { pointer-events:auto; margin:2px 0 6px; padding-bottom:5px; border-bottom:1px solid rgba(200,160,96,.35); opacity:1; }
  #gemQuick .gqh { font-size:11px; color:#ffd36a; margin-bottom:3px; }
  #gemQuick .gqb { display:flex; align-items:center; gap:5px; width:100%; margin:2px 0; padding:2px 6px; font-size:12px; text-align:left; cursor:pointer;
    background:linear-gradient(90deg, rgba(90,70,20,.85), rgba(40,30,10,.6)); border:1px solid #c8a050; border-radius:4px; color:#fff0c8; animation:gqpulse 1.6s ease-in-out infinite; }
  #gemQuick .gqb:hover { border-color:#ffe08a; filter:brightness(1.2); }
  #gemQuick .gqb img { width:20px; height:20px; } #gemQuick .gqb span { flex:1; } #gemQuick .gqb b { font-size:11px; color:#9fff9f; font-weight:normal; }
  #gemQuick .gqb.lack { animation:none; filter:grayscale(.6); opacity:.75; } #gemQuick .gqb.lack b { color:#ff9a9a; }
  @keyframes gqpulse { 0%,100% { box-shadow:0 0 0 rgba(255,211,106,0); } 50% { box-shadow:0 0 8px rgba(255,211,106,.55); } }`;
  document.head.appendChild(st);
})();
