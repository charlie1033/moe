// =============================================================
//  v2.20.8 醒來的早晨（特色差異化提案方向六）：打完一夜或倒下回到營地，有人針對你昨晚的事說一句話
//  玩家看到：回營地時畫面下方一張小卡（不暫停遊戲、可以按「不用了」）：牢房的人說一句話（被誰打倒、第幾次、走到第幾夜），
//    下面三件小事選一件，換「下一夜」一個小加成（只管下一夜，回營地就結束）
//    倒下的地方：下一次進同一夜，那裡多一塊刻著「醒來」的石頭，摸一下拿回一點經驗＋1 個金色的夢（巢穴裡倒下的話，石頭在首領之門旁邊）
//  資料：P.morning（選的小事；armed＝等下一夜、tier＝生效的那一夜）、P.mornStones[夜]、P.mornClear、P.mornDeep；台詞與小事在 MORNING
//  接點：Hook 'kill'、'update'、'enterMap'、'treeStats'、'drawWorld'；Interact.add('mstone')；昨晚被誰打倒讀第一百三十八本（Book138）
// =============================================================
const MORNING = {
  "lines":{
    "clear_again":[
      "格倫：「第 {night} 夜又走了一趟。路熟了，就更別大意。」",
      "歐莉：「第 {night} 夜，又一次。我寫了『平安回來』，這四個字我最喜歡寫。」",
      "小雀：「你又去第 {night} 夜玩了喔？下次帶我去，我會很乖。」",
      "格倫：「第 {night} 夜你走得比上次快。回來的時候，盔甲連刮痕都沒有。」",
      "歐莉：「第 {night} 夜走很多次也沒關係。同一句話，我也抄了一百年。」",
      "小雀：「第 {night} 夜的怪是不是都認得你了？牠們有沒有跟你打招呼？」"
    ],
    "clear_first":[
      "歐莉：「第 {night} 夜，第一次走完。我替你多寫了半頁。」",
      "格倫：「你第一次走完第 {night} 夜。我今天巡邏，腳步都輕了一點。」",
      "小雀：「第 {night} 夜過完了！這顆石頭送你，是慶祝用的。」",
      "歐莉：「以前的冊子裡，走完第 {night} 夜的你不多。現在你是其中一個了。」",
      "格倫：「第 {night} 夜的看守者，我認識牠很久了。牠終於可以休息一下了。」"
    ],
    "deeper":[
      "歐莉：「第 {night} 夜。這是你走過最深的一次。我換了一支新的筆。」",
      "格倫：「你昨晚走到第 {night} 夜，比以前都深。我在門口站了很久。」",
      "小雀：「第 {night} 夜！比上次還遠耶！我在牆上幫你多畫了一格。」",
      "歐莉：「我翻了以前的冊子。走到第 {night} 夜的你，一隻手就數得完。」",
      "格倫：「第 {night} 夜的風比較冷。你走得那麼深，記得還要回來。」",
      "小雀：「你走到第 {night} 夜了，是不是快醒了？醒了以後，還會來看我嗎？」"
    ],
    "die":[
      "格倫：「我在{place}找到你的。你睡得很熟，我差點捨不得叫你。」",
      "歐莉：「{place}。我記下來了。下次走到那裡，腳步放慢一點。」",
      "小雀：「你昨天倒在{place}喔？那裡有沒有亮晶晶的石頭？」",
      "格倫：「{place}的路不好走。扛你回來，我走了一整夜。」",
      "歐莉：「倒下不算什麼。冊子上寫的是：『{place}。然後，他又站起來了。』」",
      "小雀：「我夢到你在{place}睡覺，我就坐在旁邊幫你蓋被子。」"
    ],
    "die_boss":[
      "格倫：「是{boss}吧。我扛你回來的時候，你一直在念牠的名字。」",
      "歐莉：「我在冊子上寫了『昨晚，{boss}』，然後就停筆了。剩下的，等你回來再寫。」",
      "小雀：「{boss}好兇喔。你還痛不痛？我幫你吹一吹。」",
      "格倫：「{boss}送回來的人，你不是第一個。不丟臉。」",
      "歐莉：「{boss}比上一個看守者難纏。先吃點東西，再想怎麼打。」",
      "小雀：「我昨天晚上有幫你許願，可是{boss}好像沒有聽到。」"
    ],
    "die_boss_again":[
      "格倫：「你又被{boss}送回來了。第 {n} 次了。我的肩膀都記得路了。」",
      "歐莉：「{boss}，第 {n} 次。我把這一頁摺了一個角，下次翻得比較快。」",
      "小雀：「第 {n} 次了耶。我用石頭幫你排，{boss}那一排最長。」",
      "格倫：「第 {n} 次。{boss}的招式你應該都背起來了，剩下的是腳要跟上。」",
      "歐莉：「以前也有一個你，在{boss}前面倒了 {n} 次。後來，他走過去了。」",
      "小雀：「{boss}是不是很喜歡你？不然怎麼一直不讓你走。」"
    ]
  },
  "tasks":[
    {
      "eff":"下一夜最大生命 +10%",
      "id":"soup",
      "k":"life",
      "text":"喝一碗茵的苦湯",
      "v":10,
      "who":"茵"
    },
    {
      "eff":"下一夜暴擊率 +15%",
      "id":"stones",
      "k":"crit",
      "text":"陪小雀數石頭",
      "v":15,
      "who":"小雀"
    },
    {
      "eff":"下一夜移動速度 +6%",
      "id":"patrol",
      "k":"move",
      "text":"幫格倫巡邏一圈",
      "v":6,
      "who":"格倫"
    },
    {
      "eff":"下一夜經驗 +10%",
      "id":"book",
      "k":"xp",
      "text":"聽歐莉念冊子",
      "v":10,
      "who":"歐莉"
    },
    {
      "eff":"下一夜傷害 +8%",
      "id":"net",
      "k":"dmg",
      "text":"幫莫收網",
      "v":8,
      "who":"莫"
    },
    {
      "eff":"下一夜全抗 +8%",
      "id":"shield",
      "k":"res",
      "text":"替卡爾擦盾",
      "v":8,
      "who":"卡爾"
    }
  ]
}
;
const MORNING_STAT = { life: 'life_inc', dmg: 'dmg_inc', crit: 'crit_inc', move: 'move_inc', res: 'res_all' };
const Morning = {
  pend: null, card: null,
  line(ev) {
    const L = MORNING.lines, fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k] != null ? o[k] : '');
    if (ev.die) {
      const b = ev.boss && BOSSES[ev.boss] ? BOSSES[ev.boss].name : null;
      if (b && ev.cnt >= 2) return fill(pick(L.die_boss_again), { boss: b, n: ev.cnt });
      if (b) return fill(pick(L.die_boss), { boss: b });
      return fill(pick(L.die), { place: ev.place || '夢裡' });
    }
    if (ev.deeper) return fill(pick(L.deeper), { night: ev.night });
    return fill(pick(ev.first ? L.clear_first : L.clear_again), { night: ev.night });
  },
  show(ev) {
    this.hide();
    const opts = MORNING.tasks.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    const d = document.createElement('div'); d.id = 'morning';
    d.innerHTML = `<div class="mn-t">醒來的早晨</div><div class="mn-l">${this.line(ev)}</div><div class="mn-o">${opts.map((o, i) => `<button data-mn="${i}"><b>${o.text}</b><span>${o.eff}</span></button>`).join('')}</div><button class="mn-x" data-mnx="1">不用了</button>`;
    document.body.appendChild(d); this.card = d;
    d.querySelectorAll('[data-mn]').forEach(b => b.onclick = () => { const o = opts[+b.dataset.mn]; G.P.morning = { k: o.k, v: o.v, eff: o.eff, who: o.who, text: o.text, armed: true }; UI.msg(`${o.text}。${o.eff}`, '#ffe6a0'); Sfx.play('click'); saveGame(); this.hide(); });
    d.querySelector('[data-mnx]').onclick = () => this.hide();
  },
  hide() { if (this.card) { this.card.remove(); this.card = null; } },
  active() { const P = G.P, m = P && P.morning, w = G.world; return m && m.tier != null && w && w.kind === 'map' && w.tier === m.tier ? m : null; },
};
// 記下昨晚發生什麼：打倒這一夜的看守者／倒下
Hook.on('kill', m => {
  const w = G.world, P = G.P; if (!m || !m.boss || !w || !P || w.kind !== 'map' || w.arena || !(w.tier > 0)) return;
  if (!G.mons.some(x => x.boss && !x.dead && x !== m) && (m.boss === (w.theme && w.theme.boss) || w.bossRoom)) {
    const first = !(P.mornClear || {})[w.tier], deeper = w.tier > (P.mornDeep || 0);
    (P.mornClear || (P.mornClear = {}))[w.tier] = 1; if (deeper) P.mornDeep = w.tier;
    Morning.pend = { night: w.tier, first, deeper: deeper && w.tier > 1 };   // 走到比以前都深的一夜：用「走得更遠了」的話
  }
  // 早晨的小事「經驗」：這一夜殺怪多拿經驗
  const a = Morning.active(); if (a && a.k === 'xp' && typeof monXpScale === 'function') { const base = m.def.xp * monXpScale(m.mlvl) * (m.boss ? 1 : ({ normal: 1, magic: 2.5, rare: 6 }[m.rarity] || 1)); gainXp(base * a.v / 100); }
});
let _mnDead = false, _mnKind = null;
Hook.on('update', () => {
  const P = G.P, w = G.world; if (!P || !w) return;
  // 倒下：記地點（下一次進同一夜有一塊「醒來」的石頭）和誰打的
  if (G.dead && !_mnDead && w.kind === 'map' && !w.arena && w.tier > 0) {
    const b = typeof Book138 !== 'undefined' && Book138.data && Book138.data(), e = b && b.deaths && b.deaths[b.deaths.length - 1];
    const by = e && e.boss, cnt = by && b.bossDeaths ? b.bossDeaths[by] || 1 : 0;
    Morning.pend = { die: true, boss: by, cnt, place: e ? e.place : (w.theme && w.theme.name) };
    (P.mornStones || (P.mornStones = {}))[w.bossRoom && G.gateBack ? G.gateBack.world.tier : w.tier] = { x: G.pl.x, y: G.pl.y, room: !!w.bossRoom };
  }
  _mnDead = !!G.dead;
  // 回到營地：早晨的卡片（等劇情、視窗都關了才出來）；上一夜的小事到這裡結束
  if (w.kind === 'town') {
    if (P.morning && P.morning.tier != null) { P.morning = null; onBuildChanged(); }   // 生效過的那一夜結束了
    if (Morning.pend && !G.dead && !UI.paused() && !UI.storyOpen && !(UI.storyQ && UI.storyQ.length)) { const ev = Morning.pend; Morning.pend = null; Morning.show(ev); }
  } else if (Morning.card && w.kind === 'map') Morning.hide();
  _mnKind = w.kind;
});
// 進下一夜：早上選的小事開始生效（只管這一夜）；倒下過的地方放一塊「醒來」的石頭
Hook.on('enterMap', tier => {
  const P = G.P, w = G.world; if (!P || !w) return;
  if (P.morning && P.morning.armed) { P.morning.armed = false; P.morning.tier = w.tier; onBuildChanged(); UI.msg(`早上${P.morning.text}：${P.morning.eff.replace('下一夜', '這一夜')}`, '#ffe6a0'); }
  const st = P.mornStones && P.mornStones[w.tier];
  if (st) { const p = st.room ? (w.bossGate ? nearestFloor(w.bossGate.x + 60, w.bossGate.y + 40) : null) : nearestFloor(st.x, st.y); if (p) w.mstone = { x: p.x, y: p.y }; }
});
Hook.on('treeStats', S => { const a = Morning.active(); if (a && MORNING_STAT[a.k]) addStat(S, MORNING_STAT[a.k], a.v); });
Interact.add('mstone', (pl, w) => w.mstone && !w.mstone.taken ? [{ ref: w.mstone, label: '摸一摸刻著「醒來」的石頭', r: 60 }] : [], s => {
  const P = G.P, w = G.world; s.taken = true; if (P.mornStones) delete P.mornStones[w.tier];
  const xp = Math.round(xpNeed(P.lvl) * 0.03); gainXp(xp); P.cur.alch = (P.cur.alch || 0) + 1;
  UI.banner('刻著「醒來」的石頭', `上一次你在這裡倒下。石頭摸起來是溫的。（經驗 +${xp}、金色的夢 ×1）`, '#e8d8a8');
  if (typeof Book138 !== 'undefined' && Book138.note) Book138.note('record', `第 ${w.tier} 夜，你摸到了上一次倒下時留下的石頭。`); saveGame();
});
Hook.on('drawWorld', g => {
  const s = G.world && G.world.mstone; if (!s || s.taken) return;
  g.save(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(s.x, s.y + 8, 13, 5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7a7468'; g.beginPath(); g.moveTo(s.x - 11, s.y + 8); g.lineTo(s.x - 9, s.y - 10); g.quadraticCurveTo(s.x, s.y - 18, s.x + 9, s.y - 10); g.lineTo(s.x + 11, s.y + 8); g.closePath(); g.fill();
  g.globalAlpha = 0.6 + 0.3 * Math.sin(G.time * 2); g.fillStyle = '#ffe6a0'; g.font = '8px sans-serif'; g.textAlign = 'center'; g.fillText('醒來', s.x, s.y + 1); g.restore();
});
(() => { const st = document.createElement('style'); st.textContent = `#morning { position:fixed; left:50%; bottom:110px; transform:translateX(-50%); z-index:55; width:min(560px, 94vw); padding:10px 14px; border-radius:8px;
    background:linear-gradient(rgba(60,46,26,.96), rgba(30,22,14,.96)); border:1px solid #c8a050; box-shadow:0 6px 24px rgba(0,0,0,.6); color:#f0e4c8; }
  #morning .mn-t { color:#ffd27a; font-size:12px; letter-spacing:3px; } #morning .mn-l { margin:4px 0 8px; font-size:15px; line-height:1.6; }
  #morning .mn-o { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; } #morning .mn-o button { text-align:left; padding:6px 8px; cursor:pointer; display:flex; flex-direction:column; gap:2px; font:inherit; background:rgba(20,16,12,.85); color:#e8dcc0; border:1px solid #6a5a3a; border-radius:5px; }
  #morning .mn-o button b { font-size:13px; } #morning .mn-o button span { font-size:11px; color:#9fe0b0; } #morning .mn-o button:hover { border-color:#e8c070; }
  #morning .mn-x { position:absolute; right:8px; top:6px; font-size:11px; padding:1px 8px; cursor:pointer; }
  body.touch #morning { bottom:auto; top:12%; } @media (max-width:600px) { #morning .mn-o { grid-template-columns:1fr; } }`; document.head.appendChild(st); })();
