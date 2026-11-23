// =============================================================
//  v2.20.3「記起的我」：職業的分支包裝成第一百三十八本裡的四頁（特色差異化提案第 4 節）
//  不是第二張天賦樹：每一頁是「你想起的一個以前的我」，兩個人二選一，選了就繼承他的打法
//   第一頁 名字（25 級）：歐莉翻開舊冊子——兩個同職業、不同打法的「以前的我」
//   第二頁 傷疤（50 級）：格倫問你以前怎麼受的傷——「扛下來」（守、反擊）或「躲開」（快、有代價）
//   第三頁 醒或守（60 級，主線結局附近）：守門人把門交給你——「醒來的人」（往外打、爆發）或「守門的人」（守一塊地方）
//   第四頁 最初（90 級，或打倒第 40 夜的看守者，哪個先到都算）：最初的守門人問你一句話，你的回答決定最後的樣子
//  回響：每一頁對應一位看守者；你第一次面對牠時的選擇如果跟這個「我」同一路（左邊＝和解、右邊＝了結或放走），多一行小效果
//  玩家看到：天賦樹上方「記起的我」鈕（有可以翻的頁時亮紅點；到等級跳橫幅）；選了會寫進第一百三十八本「做過的抉擇」
//   每一頁第一次選免費；之後要「重做那個夢」換另一邊，花 1 點重置點數
//  資料：P.cpath = { 25: 0 或 1, 50, 60, 90 }（0＝左邊、1＝右邊）；P.cpathSeen＝已經提醒到哪一頁
//  接點：items.js computeStats 呼叫 ClassPath.apply(S, P)；Hook 'update'；Book138.note
//  也在這裡：crit_base（基礎暴擊率）、minion_leech（召喚物偷取）的說明文字（天賦樹最外圈「第 138 筆」用）
// =============================================================
STAT_TEXT.crit_base = v => `基礎暴擊率 +${v}%`;
STAT_TEXT.minion_leech = v => `召喚物擊中時，偷取 ${v}% 傷害回復自己的生命`;
const CPATH_LV = [25, 50, 60, 90];
// 四頁：誰來問、問什麼、左右兩邊叫什麼、回響看哪一位看守者
const CPATH_PAGES = [
  { lv: 25, title: '名字', who: '歐莉', ask: '「這裡……有你以前的名字。不只一個。你想起來的是哪一個？」', ways: ['以前的我', '以前的我'], warden: 'boneking' },
  { lv: 50, title: '傷疤', who: '格倫', ask: '「我扛你回來的那一次，你身上有一道疤。那是怎麼來的？」', ways: ['扛下來', '躲開'], warden: 'b_cave' },
  { lv: 60, title: '醒或守', who: '守門人', ask: '「門交給你了。要守、要走，都由你決定。」', ways: ['醒來的人', '守門的人'], warden: 'b_forest' },
  { lv: 90, title: '最初', who: '最初的守門人', ask: '「你為什麼還在這裡？」', ways: ['你的回答', '你的回答'], warden: 'b_void', or40: true },
];
const CPATH_ECHO = [{ life_inc: 6, res_all: 5 }, { dmg_inc: 8, move_inc: 3 }];   // 左邊（和解）／右邊（了結、放走）
const cp = (name, stats, flags, desc) => ({ name, stats: stats || {}, flags: flags || [], desc: desc || '' });
// 每個職業四頁，每頁 [左, 右]
const CLASS_PATHS = {
  warrior: [
    [cp('第 88 個我・扛人的', { life_inc: 10, poise: 20 }, ['noStun'], '他扛著受傷的人走過整片戰場，什麼都推不動他'), cp('第 12 個我・逃兵', { move_inc: 5 }, ['corpseBlast'], '他跑過一次。身後追來的，一個一個炸開了')],
    [cp('鐵壁', { armour_inc: 40, block: 5 }, [], '那一刀，你用盾硬接下來了'), cp('側身', { dodge: 8, evasion_inc: 30, move_inc: 5 }, [], '那一刀，你差一點就躲開了')],
    [cp('餘震', { area_inc: 15 }, ['aftershock'], '往外打。每一擊，大地都替你再打一次'), cp('戰旗', { armour_inc: 30, life_regen: 0.8, life_on_kill: 10 }, [], '把旗子插下，這裡就是防線')],
    [cp('「我不怕」', { more_attack: 25, life_inc: -10 }, [], '把命押上去，換更重的一擊'), cp('「我會回來」', { life_inc: 15, res_all: 10, more_dmg: 8 }, [], '倒下幾次都一樣，你會站起來')],
  ],
  samurai: [
    [cp('第 41 個我・道場的大師兄', { crit_inc: 40, dodge: 6 }, [], '心靜，刀才準'), cp('第 9 個我・賭徒', { life_inc: -10 }, ['berserk'], '他把命押在每一刀上：血越少，刀越快')],
    [cp('見切', { block: 5 }, ['riposte'], '你看穿了那一刀，還了回去'), cp('殘心', { dodge: 8, move_inc: 8 }, [], '你退了一步，刀沒有碰到你')],
    [cp('時之沙', { cdr: 8, crit_multi: 20 }, ['cdReset'], '殺得越快，刀回得越快'), cp('不退', { block: 6, life_inc: 10, armour_inc: 25 }, [], '站在門前，一步也不退')],
    [cp('「我不再猶豫」', { crit_inc: 60, more_dmg: 10 }, [], '忘了自己，只剩下刀'), cp('「我會再拔一次刀」', { aspd_inc: 15, crit_multi: 30 }, [], '一刀不夠，就再一刀')],
  ],
  ranger: [
    [cp('第 63 個我・夜裡的信差', { dodge: 6, evasion_inc: 30, move_inc: 5 }, [], '他送信從來沒被抓到過'), cp('第 27 個我・毒師的學徒', { poison_ch: 20, chaos_inc: 25 }, [], '一點點就夠了')],
    [cp('咬牙', { life_inc: 12, res_all: 8 }, [], '那一下很痛，你沒有出聲'), cp('影子', { dodge: 10, move_inc: 8 }, [], '那一下打中的，只是你的影子')],
    [cp('連鎖', { crit_inc: 30 }, ['projChain'], '一刀接著一刀，跳到下一個人'), cp('回力', { more_proj: -10, life_inc: 8 }, ['projReturn'], '丟出去的刀，會飛回來守著你')],
    [cp('「我不怕」', { more_dmg: 5 }, ['soulReap'], '殺得越多，越停不下來'), cp('「我會回來」', { poison_ch: 25, chaos_inc: 40, dot_inc: 30 }, [], '你走了，毒還留著')],
  ],
  druid: [
    [cp('第 101 個我・獵戶的女兒', { crit_inc: 35, proj_inc: 15 }, [], '她看得清楚，射得準'), cp('第 54 個我・街頭賣藝的', {}, ['projSplit'], '一箭打中，變成兩箭，大家都會拍手')],
    [cp('咬牙', { life_inc: 12, res_all: 8 }, [], '那一箭射偏了，你還是站著'), cp('退一步', { dodge: 8, move_inc: 10, aspd_inc: 5 }, [], '退一步，再射一箭')],
    [cp('多重箭矢', { proj_count: 1, more_proj: -20 }, [], '多射一支，每支輕一點'), cp('穿雲', { pierce: 2, proj_inc: 20, block: 3 }, [], '箭會穿過前面的敵人，守住你的那一線')],
    [cp('「我不怕」', { proj_count: 2, more_proj: -30 }, [], '天空整片都是箭'), cp('「我會回來」', { more_proj: 20, crit_inc: 40 }, [], '一箭，就一箭')],
  ],
  mage: [
    [cp('第 70 個我・書呆子', { ignite_ch: 15, freeze_ch: 10, shock_ch: 15, ele_inc: 10 }, [], '他把火、冰、雷都抄在同一本筆記裡'), cp('第 5 個我・寫紙條的', { ignite_ch: 25, more_spell: 10 }, [], '她寫的紙條，總是燒起來')],
    [cp('靜心', { es_inc: 40, mana_regen_inc: 30 }, [], '那一下打在夢殼上，你沒有動'), cp('閃身', { cspd_inc: 10, move_inc: 8, dodge: 4 }, [], '咒語還沒念完，你已經換了位置')],
    [cp('雙重詠唱', { more_spell: -10 }, ['spellTwin'], '有時候，一個咒語會念兩次'), cp('冰晶碎裂', { freeze_ch: 10 }, ['shatter'], '凍住門前的路，靠近的都會碎')],
    [cp('「我記得」', { cspd_inc: 15, more_spell: 15 }, [], '每一個咒語，你都記得'), cp('「我會醒」', { crit_inc: 60, ele_inc: 30 }, [], '天上落下來的，都是你的法術')],
  ],
  summoner: [
    [cp('第 3 個我・守墓人', { minion_life_inc: 30, minion_max: 1 }, [], '他替每一個墳掃過雪'), cp('第 77 個我・亂葬崗的孩子', { minion_max: 2, minion_life_inc: -20 }, [], '她從來不覺得孤單')],
    [cp('護著', { life_inc: 15, minion_life_inc: 20 }, [], '那一下，你們一起扛下來了'), cp('散開', { move_inc: 8, minion_aspd_inc: 15, dodge: 4 }, [], '你們一起散開，再一起回來')],
    [cp('血肉祭品', { minion_dmg_inc: 40, minion_life_inc: -15 }, [], '用牠們的血，換牠們的牙'), cp('骨之守衛', { minion_life_inc: 30, minion_dmg_inc: 15, armour_inc: 20 }, [], '牠們站成一圈，守著你')],
    [cp('「我不會一個人」', { minion_max: 2, minion_dmg_inc: 20, life_inc: -10 }, [], '整個夜裡都是你的人'), cp('「我會帶他們回家」', { minion_dmg_inc: 30, minion_life_inc: 30 }, [], '倒不下的隊伍')],
  ],
};
const ClassPath = {
  paths(P) { return CLASS_PATHS[P && P.cls] || null; },
  chosen(P) { return P.cpath || (P.cpath = {}); },
  // 這一頁能不能翻：到等級；最後一頁另外「打倒第 40 夜」也算
  open(P, i) { const pg = CPATH_PAGES[i]; return P.lvl >= pg.lv || (pg.or40 && typeof qc === 'function' && qc(P).cleared >= 40); },
  pending(P) { const L = this.paths(P); if (!L) return 0; const c = this.chosen(P); return CPATH_LV.filter((lv, i) => this.open(P, i) && c[lv] == null).length; },
  // 回響：這一頁對應的看守者，你第一次的選擇跟這一邊同一路嗎
  echo(P, i, k) {
    const pg = CPATH_PAGES[i], f = P.wardens && P.wardens.first && P.wardens.first[pg.warden];
    return { on: !!f && (k === 0 ? f === 'name' : f === 'kill' || f === 'free'), f, warden: pg.warden };
  },
  apply(S, P) {
    const L = this.paths(P); if (!L) return; const c = P.cpath || {};
    CPATH_LV.forEach((lv, i) => {
      const k = c[lv]; if (k == null || !this.open(P, i)) return;
      const o = L[i][k]; if (!o) return;
      for (const s in o.stats) addStat(S, s, o.stats[s]);
      for (const f of o.flags) S.flags[f] = true;
      if (this.echo(P, i, k).on) for (const s in CPATH_ECHO[k]) addStat(S, s, CPATH_ECHO[k][s]);
    });
  },
  pick(lv, k) {
    const P = G.P, c = this.chosen(P), i = CPATH_LV.indexOf(lv); if (i < 0 || !this.open(P, i) || c[lv] === k) return;
    const first = c[lv] == null;
    if (!first) { if ((P.respec || 0) < 1) { Sfx.play('deny'); return UI.msg('重做那個夢要 1 點重置點數（任務獎勵會給）', '#ff9a9a'); } P.respec--; }
    c[lv] = k; onBuildChanged(); Sfx.play('levelup'); saveGame(); this.render();
    const o = this.paths(P)[i][k], pg = CPATH_PAGES[i];
    UI.msg(`${first ? '記起了' : '重做了那個夢，記起的變成'}「${o.name}」（${pg.title}）`, k ? '#d8a8ff' : '#a8e0ff');
    if (typeof Book138 !== 'undefined' && Book138.note) Book138.note('choice', `記起的我・${pg.title}：${o.name}`);
  },
  optHTML(P, i, k, cur, open) {
    const o = this.paths(P)[i][k], pg = CPATH_PAGES[i], e = this.echo(P, i, k), eb = BOSSES[e.warden] ? BOSSES[e.warden].name : '看守者';
    const mods = Object.keys(o.stats).map(s => STAT_TEXT[s] ? STAT_TEXT[s](o.stats[s]) : s).concat(o.flags.map(f => STAT_TEXT[f] ? STAT_TEXT[f]() : f));
    const echoTxt = Object.keys(CPATH_ECHO[k]).map(s => STAT_TEXT[s](CPATH_ECHO[k][s])).join('、');
    const echo = e.on ? `<span class="cp-echo on">回響・你對「${eb}」選了「${WCHOICE_NAME[e.f]}」：${echoTxt}</span>`
      : `<span class="cp-echo">回響：第一次對「${eb}」選${k ? '「了結」或「放走」' : '「和解」'}的話，${echoTxt}</span>`;
    return `<button class="cp-opt ${k ? 'right' : 'left'} ${cur === k ? 'on' : ''} ${cur != null && cur !== k ? 'off' : ''}" data-cp="${pg.lv}:${k}" ${open ? '' : 'disabled'}>
      <span class="cp-way">${pg.ways[k]}</span><b>${o.name}</b><i>${o.desc}</i>${mods.map(m => `<span class="cp-mod">${m}</span>`).join('')}${echo}</button>`;
  },
  render() {
    const box = document.getElementById('cpath'); if (!box) return;
    const P = G.P, L = this.paths(P); if (!L) return;
    const c = this.chosen(P);
    let h = `<div class="cp-head"><b>記起的我</b><span class="cp-sub">第一百三十八本・${CLASSES[P.cls].name}的四頁</span><span class="x" data-cpx="1">✕</span>
      <div class="thint">到了那一天，就會想起一個以前的自己——兩個人裡選一個，繼承他的打法（不花天賦點數）。每頁第一次選免費；之後「重做那個夢」換另一邊要 1 點重置點數（剩 ${P.respec || 0}）。</div></div>`;
    CPATH_PAGES.forEach((pg, i) => {
      const open = this.open(P, i), lv = pg.lv;
      const cond = pg.or40 ? `${lv} 級，或打倒第 40 夜` : `${lv} 級`;
      h += `<div class="cp-page ${open ? '' : 'locked'}"><div class="cp-pt"><span class="cp-no">第 ${i + 1} 頁</span><b>${pg.title}</b><span class="cp-cond">${cond}${open ? (c[lv] == null ? '　<em>可以翻開了</em>' : '') : '　<small>還沒到</small>'}</span></div>
        <div class="cp-ask"><span>${pg.who}：</span>${open ? pg.ask : '……'}</div>
        <div class="cp-opts">${this.optHTML(P, i, 0, c[lv], open)}${this.optHTML(P, i, 1, c[lv], open)}</div></div>`;
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
  button() {
    const tp = document.getElementById('treeCenter'); if (!tp || document.getElementById('cpathBtn')) return;
    const b = document.createElement('button'); b.id = 'cpathBtn'; b.innerHTML = '記起的我<i class="cp-dot"></i>';
    b.onclick = () => this.toggle(); tp.parentNode.insertBefore(b, tp);
  },
};
// 第 138 筆：第一次點上天賦樹最外圈的武器最終選擇時，記下「用什麼武器刻的」，永遠不變（給美術畫牢房牆上的刻字）
//   P.engrave = { w: 'sword'|'axe'|'bow'|'wand'|'staff'|'katana'|'dagger', pick: 'A'|'B', name: 那顆天賦的名字, n: 第幾夜刻的 }
function engraveOf(P) { return P && P.engrave || null; }
Hook.on('update', () => {
  const P = G.P; if (!P) return;
  if (!P.engrave && P.tree) { const id = P.tree.find(x => TREE.nodes[x] && TREE.nodes[x].wfinal); if (id) { const n = TREE.nodes[id]; P.engrave = { w: n.weapon, pick: id.slice(-1), name: n.name, n: (G.world && G.world.tier) || 0 }; if (typeof Book138 !== 'undefined' && Book138.note) Book138.note('choice', `第 138 筆：用${(BASES.find(b => b.cls === n.weapon) || {}).clsName || n.weapon}刻下了「醒來」（${n.name}）`); saveGame(); } }
  ClassPath.button();
  const n = ClassPath.pending(P), b = document.getElementById('cpathBtn'); if (b) b.classList.toggle('has', n > 0);
  // 剛可以翻開新的一頁：跳一次橫幅
  const top = CPATH_LV.filter((lv, i) => ClassPath.open(P, i)).pop() || 0;
  if (top > (P.cpathSeen || 0)) {
    P.cpathSeen = top; const i = CPATH_LV.indexOf(top), pg = CPATH_PAGES[i];
    if (ClassPath.chosen(P)[top] == null && ClassPath.paths(P)) UI.banner(`你想起了一些事（${pg.title}）`, `打開天賦樹（${ctlText('{tree}', true)}）上方的「記起的我」，翻開第 ${i + 1} 頁`, '#d8c0ff');
  }
  const box = document.getElementById('cpath'); if (box && box.classList.contains('show') && !UI.open.tree) box.classList.remove('show');   // 關掉天賦樹就一起收起來
});
(() => {
  const st = document.createElement('style');
  st.textContent = `#cpath { display:none; position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:70; width:min(780px, 96vw); max-height:92vh; overflow:auto; padding:14px 16px;
    background:linear-gradient(#2a2216, #1c1610) !important; border:1px solid #8a6a3a !important; }
  #cpath.show { display:block; }
  #cpath .cp-head { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:6px; } #cpath .cp-head b { color:#ffe08a; font-size:19px; letter-spacing:2px; } #cpath .cp-sub { color:#c8b48a; font-size:13px; }
  #cpath .cp-head .x { margin-left:auto; cursor:pointer; padding:0 6px; } #cpath .cp-head .thint { width:100%; }
  #cpath .cp-page { margin-top:10px; padding:10px 12px; border-radius:6px; background:rgba(232,214,170,.06); border:1px solid #4a3d28; box-shadow:inset 0 0 18px rgba(0,0,0,.35); }
  #cpath .cp-page.locked { opacity:.45; }
  #cpath .cp-pt { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; } #cpath .cp-no { color:#a89878; font-size:12px; } #cpath .cp-pt b { color:#f4e2b0; font-size:17px; letter-spacing:3px; }
  #cpath .cp-cond { color:#e8c070; font-size:12px; } #cpath .cp-cond em { color:#9fe0a0; font-style:normal; } #cpath .cp-cond small { color:#8a7a60; }
  #cpath .cp-ask { margin:4px 0 8px; color:#d8c8a0; font-style:italic; font-size:13px; } #cpath .cp-ask span { font-style:normal; color:#a89878; }
  #cpath .cp-opts { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  #cpath .cp-opt { text-align:left; padding:8px 10px; border-radius:6px; border:1px solid #4a3d28; background:rgba(20,16,12,.85); color:#e8dcc0; cursor:pointer; font:inherit; line-height:1.45; display:flex; flex-direction:column; gap:2px; }
  #cpath .cp-opt.left { border-left:4px solid #8fc8ff; } #cpath .cp-opt.right { border-left:4px solid #d0a0ff; }
  #cpath .cp-opt:hover:not([disabled]) { background:rgba(60,48,30,.9); } #cpath .cp-opt.on { box-shadow:0 0 0 2px #ffe08a inset; background:rgba(70,56,24,.9); } #cpath .cp-opt.off { opacity:.55; } #cpath .cp-opt[disabled] { cursor:default; }
  #cpath .cp-way { font-size:11px; color:#a89878; } #cpath .cp-opt b { font-size:15px; color:#fff3d6; } #cpath .cp-opt i { font-size:12px; color:#c8b48a; }
  #cpath .cp-mod { font-size:12px; color:#9fe0b0; } #cpath .cp-echo { font-size:11px; color:#7a6a50; margin-top:2px; } #cpath .cp-echo.on { color:#ffd27a; }
  #cpathBtn { position:relative; } #cpathBtn .cp-dot { display:none; position:absolute; top:-3px; right:-3px; width:9px; height:9px; border-radius:50%; background:#ff4a4a; box-shadow:0 0 4px #ff4a4a; } #cpathBtn.has .cp-dot { display:block; }
  @media (max-width: 700px), (max-height: 480px) { #cpath .cp-opts { grid-template-columns:1fr; } #cpath .cp-opt { font-size:13px; } }`;
  document.head.appendChild(st);
})();
