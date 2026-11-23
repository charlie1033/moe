// =============================================================
//  v2.20 職業之路：每個職業自己的分支（原本天賦樹最外圈的「質變誓言」搬到這裡，各職業分到自己的）
//  玩家看到：
//   ・天賦樹（P）上方多一顆「職業之路」鈕；有可以選的階段時鈕上有紅點，升到 25／50／60／90 級時也會跳橫幅提醒
//   ・打開是一張卡片頁：四個階段（25、50、60、90 級），每階段兩條路二選一——
//       「醒之道」（穩、守、控）或「夢之道」（猛、險、爆發）。到等級才能選；不花天賦點數
//   ・每一階段第一次選免費；之後改選每次花 1 點重置點數（階段最早 25 級，已經過了天賦的免費重置期）
//  資料：P.cpath = { 25: 0 或 1, 50: …, 60: …, 90: … }（0＝醒之道、1＝夢之道）；P.cpathSeen＝已經提醒過到哪一階
//  接點：items.js computeStats 呼叫 ClassPath.apply(S, P)；Hook 'update'（提醒、紅點）
//  也在這裡：兩個新能力的說明文字 crit_base（基礎暴擊率）、minion_leech（召喚物偷取），給天賦樹最外圈的武器選擇用
// =============================================================
STAT_TEXT.crit_base = v => `基礎暴擊率 +${v}%`;
STAT_TEXT.minion_leech = v => `召喚物擊中時，偷取 ${v}% 傷害回復自己的生命`;
const CPATH_LV = [25, 50, 60, 90];
const cp = (name, stats, flags, desc) => ({ name, stats: stats || {}, flags: flags || [], desc: desc || '' });
// 每個職業四階段，每階段 [醒之道, 夢之道]
const CLASS_PATHS = {
  warrior: [
    [cp('不動明王', { life_inc: 10, poise: 20 }, ['noStun'], '站穩了，什麼都推不動你'), cp('餘震', {}, ['aftershock'], '每一擊，大地都替你再打一次')],
    [cp('鐵壁', { armour_inc: 40, block: 5 }, [], '盾與甲，是最老實的朋友'), cp('巨人之力', { area_inc: 25, aspd_inc: -8 }, [], '揮得慢一點，掃得大很多')],
    [cp('戰神之血', { life_on_kill: 10, life_regen: 0.8 }, [], '越打越有精神'), cp('爆裂之魂', {}, ['corpseBlast'], '倒下的敵人，會替你炸開下一群')],
    [cp('萬軍之盾', { armour_inc: 60, res_all: 10, more_dmg: 10 }, [], '你站的地方，就是防線'), cp('戰意沸騰', { more_attack: 25, life_inc: -10 }, [], '把命押上去，換更重的一擊')],
  ],
  samurai: [
    [cp('見切', { block: 5 }, ['riposte'], '看穿了，就還一刀'), cp('一閃', { crit_multi: 35, melee_inc: 15 }, [], '只要一刀，就夠了')],
    [cp('時之沙', { cdr: 8 }, ['cdReset'], '殺得越快，刀回得越快'), cp('斬鐵', { phys_inc: 30, more_attack: 10 }, [], '連鐵都斬得斷')],
    [cp('明鏡止水', { crit_inc: 40, dodge: 6 }, [], '心靜，刀才準'), cp('嗜血狂怒', { life_inc: -10 }, ['berserk'], '血越少，刀越快')],
    [cp('無我', { crit_inc: 60, more_dmg: 10 }, [], '忘了自己，只剩下刀'), cp('千本櫻', { aspd_inc: 15, crit_multi: 30 }, [], '花一瓣一瓣落下，刀一刀一刀到')],
  ],
  ranger: [
    [cp('影舞', { dodge: 6, evasion_inc: 30 }, [], '打不到的人，才活得久'), cp('毒牙', { poison_ch: 20, chaos_inc: 25 }, [], '一點點就夠了')],
    [cp('回力', { more_proj: -15 }, ['projReturn'], '丟出去的刀，會自己飛回來'), cp('連鎖', {}, ['projChain'], '一刀接著一刀，跳到下一個人')],
    [cp('疾風', { move_inc: 10, aspd_inc: 8 }, [], '比風還快一步'), cp('靈魂收割', {}, ['soulReap'], '殺得越多，越停不下來')],
    [cp('無影', { dodge: 12, more_dmg: 10 }, [], '影子落地之前，你已經走了'), cp('毒王', { poison_ch: 25, chaos_inc: 40, dot_inc: 30 }, [], '整片夢都是你的毒')],
  ],
  druid: [
    [cp('鷹眼', { crit_inc: 35, proj_inc: 15 }, [], '看得清楚，射得準'), cp('分裂箭', {}, ['projSplit'], '一箭打中，變成兩箭')],
    [cp('穿雲', { pierce: 2, proj_inc: 20 }, [], '箭會穿過前面的敵人'), cp('多重箭矢', { proj_count: 1, more_proj: -20 }, [], '多射一支，每支輕一點')],
    [cp('致命一擊', { crit_multi: 40 }, [], '暴擊時，痛得更深'), cp('狂風連射', { aspd_inc: 20, crit_inc: -20 }, [], '不瞄了，用數量淹沒')],
    [cp('神射', { more_proj: 20, crit_inc: 40 }, [], '一箭，就一箭'), cp('萬箭齊發', { proj_count: 2, more_proj: -30 }, [], '天空整片都是箭')],
  ],
  mage: [
    [cp('元素共鳴', { ignite_ch: 15, freeze_ch: 10, shock_ch: 15, ele_inc: 10 }, [], '火、冰、雷，都更容易附著'), cp('星爆', { area_inc: 20, spell_inc: 25 }, [], '法術炸得更開')],
    [cp('靜心', { es_inc: 40, mana_regen_inc: 30 }, [], '心靜了，夢殼就厚'), cp('雙重詠唱', { more_spell: -10 }, ['spellTwin'], '有時候，一個咒語會念兩次')],
    [cp('冰晶碎裂', {}, ['shatter'], '凍住的敵人，一碰就碎'), cp('焚盡', { ignite_ch: 25, more_spell: 15, life_inc: -8 }, [], '連自己也燒進去一點')],
    [cp('秘法大師', { cspd_inc: 15, more_spell: 15 }, [], '咒語念得又快又準'), cp('天啟', { crit_inc: 60, ele_inc: 30 }, [], '天上落下來的，都是你的法術')],
  ],
  summoner: [
    [cp('骨之守衛', { minion_life_inc: 30, minion_max: 1 }, [], '多一個守在你身邊的'), cp('亡者軍團', { minion_max: 2, minion_life_inc: -20 }, [], '數量就是力量')],
    [cp('冥火', { minion_aspd_inc: 15, minion_dmg_inc: 20 }, [], '牠們的手更快了'), cp('血肉祭品', { minion_dmg_inc: 40, minion_life_inc: -15 }, [], '用牠們的血，換牠們的牙')],
    [cp('守護之靈', { life_inc: 15, minion_life_inc: 20 }, [], '你們互相守著'), cp('亡君之令', { minion_max: 1, minion_dmg_inc: 15 }, [], '再叫一個起來')],
    [cp('不朽軍勢', { minion_dmg_inc: 30, minion_life_inc: 30 }, [], '倒不下的軍隊'), cp('百鬼夜行', { minion_max: 2, minion_dmg_inc: 20, life_inc: -10 }, [], '整個夜裡都是你的人')],
  ],
};
const ClassPath = {
  paths(P) { return CLASS_PATHS[P && P.cls] || null; },
  chosen(P) { return P.cpath || (P.cpath = {}); },
  // 有沒有可以選、還沒選的階段
  pending(P) { const L = this.paths(P); if (!L) return 0; const c = this.chosen(P); return CPATH_LV.filter(lv => P.lvl >= lv && c[lv] == null).length; },
  apply(S, P) {
    const L = this.paths(P); if (!L) return; const c = P.cpath || {};
    CPATH_LV.forEach((lv, i) => {
      const k = c[lv]; if (k == null || P.lvl < lv) return;
      const o = L[i][k]; if (!o) return;
      for (const s in o.stats) addStat(S, s, o.stats[s]);
      for (const f of o.flags) S.flags[f] = true;
    });
  },
  pick(lv, k) {
    const P = G.P, c = this.chosen(P); if (P.lvl < lv || c[lv] === k) return;
    const free = c[lv] == null || (typeof respecFree === 'function' && respecFree(P));
    if (!free) { if ((P.respec || 0) < 1) { Sfx.play('deny'); return UI.msg('改職業之路要 1 點重置點數（任務獎勵會給）', '#ff9a9a'); } P.respec--; }
    c[lv] = k; onBuildChanged(); Sfx.play('levelup'); saveGame(); this.render();
    const o = this.paths(P)[CPATH_LV.indexOf(lv)][k]; UI.msg(`職業之路：選了「${o.name}」`, k ? '#d8a8ff' : '#a8e0ff');
  },
  optHTML(o, lv, k, cur, open) {
    const mods = Object.keys(o.stats).map(s => STAT_TEXT[s] ? STAT_TEXT[s](o.stats[s]) : s).concat(o.flags.map(f => STAT_TEXT[f] ? STAT_TEXT[f]() : f));
    return `<button class="cp-opt ${k ? 'dream' : 'wake'} ${cur === k ? 'on' : ''} ${cur != null && cur !== k ? 'off' : ''}" data-cp="${lv}:${k}" ${open ? '' : 'disabled'}>
      <span class="cp-way">${k ? '夢之道' : '醒之道'}</span><b>${o.name}</b><i>${o.desc}</i>${mods.map(m => `<span class="cp-mod">${m}</span>`).join('')}</button>`;
  },
  render() {
    const box = document.getElementById('cpath'); if (!box) return;
    const P = G.P, L = this.paths(P); if (!L) return;
    const c = this.chosen(P), free = typeof respecFree === 'function' && respecFree(P);
    let h = `<div class="cp-head"><b>${CLASSES[P.cls].name}・職業之路</b><span class="thint">到等級就能選（不花天賦點數）。醒之道穩、夢之道猛。${free ? '現在改選免費' : `改選要 1 點重置點數（剩 ${P.respec || 0}）`}</span><span class="x" data-cpx="1">✕</span></div>`;
    CPATH_LV.forEach((lv, i) => {
      const open = P.lvl >= lv;
      h += `<div class="cp-row ${open ? '' : 'locked'}"><div class="cp-lv">${lv} 級${open ? (c[lv] == null ? '<em>可以選了</em>' : '') : '<small>還沒到</small>'}</div>
        <div class="cp-opts">${this.optHTML(L[i][0], lv, 0, c[lv], open)}${this.optHTML(L[i][1], lv, 1, c[lv], open)}</div></div>`;
    });
    box.innerHTML = h;
    box.querySelector('[data-cpx]').onclick = () => this.toggle(false);
    box.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => { const [lv, k] = b.dataset.cp.split(':').map(Number); this.pick(lv, k); });
  },
  toggle(v) {
    let box = document.getElementById('cpath');
    if (!box) { box = document.createElement('div'); box.id = 'cpath'; box.className = 'panel'; document.body.appendChild(box); }
    const on = v == null ? !box.classList.contains('show') : v;
    box.classList.toggle('show', on); if (on) { UI.hideTip && UI.hideTip(); this.render(); }
  },
  // 天賦樹上方的「職業之路」鈕（有可以選的階段時亮紅點）
  button() {
    const tp = document.getElementById('treeCenter'); if (!tp || document.getElementById('cpathBtn')) return;
    const b = document.createElement('button'); b.id = 'cpathBtn'; b.innerHTML = '職業之路<i class="cp-dot"></i>';
    b.onclick = () => this.toggle(); tp.parentNode.insertBefore(b, tp);
  },
};
Hook.on('update', () => {
  const P = G.P; if (!P) return;
  ClassPath.button();
  const n = ClassPath.pending(P), b = document.getElementById('cpathBtn'); if (b) b.classList.toggle('has', n > 0);
  // 剛到 25／50／60／90 級：跳一次橫幅提醒
  const top = CPATH_LV.filter(lv => P.lvl >= lv).pop() || 0;
  if (top > (P.cpathSeen || 0)) { P.cpathSeen = top; if (ClassPath.chosen(P)[top] == null && ClassPath.paths(P)) UI.banner('職業之路開啟', `${top} 級：打開天賦樹（${ctlText('{tree}', true)}）上方的「職業之路」，醒之道、夢之道選一條`, '#d8c0ff'); }
  const box = document.getElementById('cpath'); if (box && box.classList.contains('show') && !UI.open.tree) box.classList.remove('show');   // 關掉天賦樹就一起收起來
});
(() => {
  const st = document.createElement('style');
  st.textContent = `#cpath { display:none; position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:70; width:min(760px, 96vw); max-height:92vh; overflow:auto; padding:12px 14px; }
  #cpath.show { display:block; }
  #cpath .cp-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px; } #cpath .cp-head b { color:#ffe08a; font-size:17px; } #cpath .cp-head .x { margin-left:auto; cursor:pointer; padding:0 6px; }
  #cpath .cp-row { display:flex; gap:10px; align-items:stretch; padding:6px 0; border-top:1px solid #3a3020; } #cpath .cp-row.locked { opacity:.45; }
  #cpath .cp-lv { width:70px; flex:none; color:#e8c070; font-weight:bold; display:flex; flex-direction:column; justify-content:center; } #cpath .cp-lv em { color:#9fe0a0; font-style:normal; font-size:11px; } #cpath .cp-lv small { color:#8a7a60; font-weight:normal; }
  #cpath .cp-opts { flex:1; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  #cpath .cp-opt { text-align:left; padding:7px 9px; border-radius:6px; border:1px solid #4a3d28; background:rgba(20,16,12,.9); color:#e8dcc0; cursor:pointer; font:inherit; line-height:1.45; display:flex; flex-direction:column; gap:2px; }
  #cpath .cp-opt.wake { border-left:4px solid #6ab8ff; } #cpath .cp-opt.dream { border-left:4px solid #c080ff; }
  #cpath .cp-opt:hover:not([disabled]) { background:rgba(60,48,30,.9); } #cpath .cp-opt.on { box-shadow:0 0 0 2px #ffe08a inset; background:rgba(70,56,24,.9); } #cpath .cp-opt.off { opacity:.55; } #cpath .cp-opt[disabled] { cursor:default; }
  #cpath .cp-way { font-size:11px; color:#a89878; } #cpath .cp-opt.wake .cp-way { color:#8fc8ff; } #cpath .cp-opt.dream .cp-way { color:#d0a0ff; }
  #cpath .cp-opt b { font-size:15px; color:#fff3d6; } #cpath .cp-opt i { font-size:12px; color:#a89878; } #cpath .cp-mod { font-size:12px; color:#9fe0b0; }
  #cpathBtn { position:relative; } #cpathBtn .cp-dot { display:none; position:absolute; top:-3px; right:-3px; width:9px; height:9px; border-radius:50%; background:#ff4a4a; box-shadow:0 0 4px #ff4a4a; } #cpathBtn.has .cp-dot { display:block; }
  @media (max-width: 700px), (max-height: 480px) { #cpath .cp-row { flex-direction:column; gap:4px; } #cpath .cp-lv { width:auto; flex-direction:row; gap:8px; } #cpath .cp-opt { font-size:13px; } }`;
  document.head.appendChild(st);
})();
