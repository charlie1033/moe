// =============================================================
//  v2.20.8 137 個我（特色差異化提案方向三）：牢房牆上 137 個「醒來」，每一個是一個以前的你
//  玩家看到：日誌（J）多一頁「137 個我」——想起來的人列出稱號、遺言、習慣，下面是 1～137 的格子（亮的＝想起來了）
//    想起來的方法：莫釣到寫著編號的紙（src fish）、在「記起的我」第一頁選了那個人（src cpath）、
//    在夢裡撿到他們的遺物（src relic：第 2 夜起，看守者倒下 25%、黃色精英 2.5%、藍色 0.5% 留下一頁發光的紙，按 F 撿）
//    想起一個就多一個「習慣」（很小的永久加成，全帳號共用，存在倉庫 G.stash.selves）
//  目前寫了 40 個（PAST_SELVES）；之後要加人，在陣列後面加一筆就好
//  接點：Hook 'treeStats'（items.js，習慣加到能力上）、'start'、'kill'、'update'、'drawWorld'；Interact.add('relic')；JournalTabs
// =============================================================
const PAST_SELVES = [
  {"habit":"用力刻","n":1,"name":"第一個刻字的","src":"relic","stats":{"dmg_inc":2},"words":"我在牆上刻了第一個「醒來」。那時候，我以為一個就夠了。"},
  {"habit":"站著不動","n":2,"name":"說實話的","src":"fish","stats":{"armour_inc":4},"words":"守門人不是英雄。只是一個不敢醒來的人。"},
  {"habit":"掃雪","n":3,"name":"守墓人","src":"cpath","stats":{"minion_life_inc":3},"words":"雪又下了。我替他們每一個都掃過，也替你掃了一塊。"},
  {"habit":"寫紙條","n":5,"name":"寫紙條的","src":"fish","stats":{"cspd_inc":1},"words":"如果你讀到這張紙，代表我又睡著了。"},
  {"habit":"押一把","n":9,"name":"賭徒","src":"cpath","stats":{"crit_multi":3},"words":"我把最後一枚銅板押在你身上。別讓我又輸了。"},
  {"habit":"先跑再說","n":12,"name":"逃兵","src":"fish","stats":{"move_inc":1},"words":"第三夜的冰很滑。下一個我，穿好一點的鞋。"},
  {"habit":"縫縫補補","n":17,"name":"掉扣子的","src":"relic","stats":{"armour_inc":4},"words":"外套的扣子掉了一顆。你撿到的話，幫我縫回去。"},
  {"habit":"打死結","n":19,"name":"綁繩子的","src":"relic","stats":{"poise":2},"words":"我把自己綁在床腳，不讓自己走進夢裡。早上起來，繩子是鬆的。"},
  {"habit":"擦裝備","n":23,"name":"愛乾淨的","src":"fish","stats":{"armour_inc":4},"words":"把裝備放回木箱的時候，記得擦乾淨。"},
  {"habit":"多放一點","n":27,"name":"毒師的學徒","src":"cpath","stats":{"dot_inc":3},"words":"師父說一點點就夠了。我每次都偷偷多放一點。"},
  {"habit":"摸石頭","n":31,"name":"左邊口袋","src":"fish","stats":{"crit_inc":4},"words":"小雀送我一顆石頭。我把它藏在左邊口袋。"},
  {"habit":"記路","n":34,"name":"畫地圖的","src":"relic","stats":{"move_inc":1},"words":"這張地圖畫到第四夜就沒紙了。後面的路，你自己畫。"},
  {"habit":"吹口哨","n":38,"name":"吹口哨的","src":"relic","stats":{"dodge":0.5},"words":"怕的時候就吹這個哨子。夢裡的怪，也會愣一下。"},
  {"habit":"靜心","n":41,"name":"道場的大師兄","src":"cpath","stats":{"crit_inc":4},"words":"師弟，呼吸慢一點。心靜下來，刀自己知道該去哪裡。"},
  {"habit":"低頭走路","n":44,"name":"雪地裡的人","src":"fish","stats":{"res_all":2},"words":"大白的項圈還在雪裡。我沒有勇氣撿。"},
  {"habit":"多煮一份","n":46,"name":"煮飯的","src":"relic","stats":{"life_regen":0.1},"words":"這根湯匙煮過一鍋湯。大家都說好喝，只有格倫不用喝。"},
  {"habit":"捏鼻子喝","n":49,"name":"怕苦的","src":"fish","stats":{"flask_inc":3},"words":"下一個我，替我喝一碗茵的苦湯。真的很苦。"},
  {"habit":"謝幕","n":54,"name":"街頭賣藝的","src":"cpath","stats":{"aspd_inc":1},"words":"沒有人拍手也沒關係。我對著夢，再表演一次就好。"},
  {"habit":"裝睡","n":58,"name":"被扛回來的","src":"fish","stats":{"life_inc":2},"words":"格倫扛我回來的時候在哼歌。很難聽。"},
  {"habit":"抬頭看","n":60,"name":"畫星星的","src":"relic","stats":{"area_inc":2},"words":"燈塔上看不到星星，我就用燈芯的灰，一顆一顆畫在牆上。"},
  {"habit":"走暗巷","n":63,"name":"夜裡的信差","src":"cpath","stats":{"evasion_inc":4},"words":"信都送到了。只是收信的人，早就不住在那裡了。"},
  {"habit":"看潮水","n":67,"name":"海邊的","src":"fish","stats":{"evasion_inc":4},"words":"別相信退潮。瑟琳說得對。"},
  {"habit":"抄筆記","n":70,"name":"書呆子","src":"cpath","stats":{"mana_inc":3},"words":"筆記抄到第三本，火、冰、雷都會了，還是不知道怎麼醒。"},
  {"habit":"聽腳步","n":72,"name":"不回頭的","src":"fish","stats":{"minion_life_inc":3},"words":"卡爾一直跟在後面。我假裝沒看見，因為不敢回頭。"},
  {"habit":"叫朋友來","n":77,"name":"亂葬崗的孩子","src":"fish","stats":{"minion_dmg_inc":3},"words":"火球術沒有想像中好用。別學我。"},
  {"habit":"忍住","n":81,"name":"愛哭的","src":"relic","stats":{"res_all":2},"words":"這條手帕是乾的。你看，我這一次，沒有哭喔。"},
  {"habit":"撐傘","n":85,"name":"撐傘的","src":"relic","stats":{"es_inc":3},"words":"腐沼的雨會咬人。傘留給你，只是破了一個小洞。"},
  {"habit":"扛著走","n":88,"name":"扛人的","src":"fish","stats":{"poise":2},"words":"我試過不睡。結果夢自己來找我。"},
  {"habit":"練字","n":92,"name":"練字的","src":"relic","stats":{"cspd_inc":1},"words":"我練了一整夜的「醒」字。最後一張，還是寫成了「睡」。"},
  {"habit":"偷翻冊子","n":96,"name":"不敢問的","src":"fish","stats":{"es_inc":3},"words":"歐莉的冊子越來越薄。我不敢問為什麼。"},
  {"habit":"先看風","n":101,"name":"獵戶的女兒","src":"cpath","stats":{"proj_inc":3},"words":"爸爸教我先看風，再拉弓。夢裡的風，也一直在說話。"},
  {"habit":"數到一半","n":103,"name":"數牆的","src":"fish","stats":{"life_regen":0.1},"words":"我數過牆上的字。數到一半就哭了。"},
  {"habit":"回頭看","n":109,"name":"看草原的","src":"fish","stats":{"dodge":0.5},"words":"第五夜的草原很美。可惜我一直在逃。"},
  {"habit":"再一步","n":114,"name":"多走一夜的","src":"fish","stats":{"dmg_inc":2},"words":"這一次我走到第八夜了。比上次多一夜。"},
  {"habit":"叫貓過來","n":117,"name":"餵貓的","src":"relic","stats":{"minion_dmg_inc":3},"words":"碼頭邊有一隻黑貓，鈴鐺是牠的。牠不是夢，我很確定。"},
  {"habit":"看著光走","n":120,"name":"怕黑的","src":"fish","stats":{"area_inc":2},"words":"諾娃問我怕不怕黑。我說怕。她就更亮了一點。"},
  {"habit":"坐一下","n":125,"name":"坐下來的","src":"relic","stats":{"flask_inc":3},"words":"我只是想坐下來休息一下。你走過去的時候，別叫醒我。"},
  {"habit":"再躺一下","n":131,"name":"說對不起的","src":"fish","stats":{"life_regen":0.1},"words":"今天又放棄了。對不起。"},
  {"habit":"點頭","n":136,"name":"被謝謝的","src":"fish","stats":{"res_all":2},"words":"國王的影子對我說謝謝。我不知道該回什麼。"},
  {"habit":"念自己名字","n":137,"name":"上一個我","src":"fish","stats":{"life_inc":2,"mana_inc":3},"words":"我把名字忘了。希望你還記得你的。"},
];
const SELF_BY_N = {}; for (const s of PAST_SELVES) SELF_BY_N[s.n] = s;
const PastSelves = {
  found() { return G.stash ? (G.stash.selves || (G.stash.selves = {})) : {}; },
  count() { return Object.keys(this.found()).filter(n => SELF_BY_N[n]).length; },
  habitText(s) { return Object.keys(s.stats).map(k => STAT_TEXT[k] ? STAT_TEXT[k](s.stats[k]) : k).join('、'); },
  unlock(n, how, quiet) {
    const s = SELF_BY_N[n], F = this.found(); if (!s || F[n]) return false;
    F[n] = { how, t: Date.now() };
    if (!quiet) {
      UI.banner(`想起了第 ${n} 個我・${s.name}`, `「${s.words}」　習慣「${s.habit}」：${this.habitText(s)}`, '#e8d8a8');
      Sfx.play('rare');
      if (typeof Book138 !== 'undefined' && Book138.note) Book138.note('record', `想起了第 ${n} 個我・${s.name}：「${s.words}」`);
    }
    if (typeof onBuildChanged === 'function' && G.P) onBuildChanged();
    if (typeof saveGame === 'function') saveGame();
    return true;
  },
  // 從其他地方想起來的：莫釣到的那一頁、記起的我選了的那個人（每秒對一次；第一次讀檔時安靜補上）
  sync(quiet) {
    const P = G.P; if (!P || !G.stash) return;
    if (typeof FISH_LINES !== 'undefined' && P.fish && P.fish.got) for (const i of P.fish.got) { const f = FISH_LINES[i]; if (f) this.unlock(f[0], 'fish', quiet); }
    if (typeof CLASS_PATHS !== 'undefined' && P.cpath && P.cpath[25] != null && CLASS_PATHS[P.cls]) {
      const o = CLASS_PATHS[P.cls][0][P.cpath[25]], m = o && /第 (\d+) 個我/.exec(o.name); if (m) this.unlock(+m[1], 'cpath', quiet);
    }
  },
  apply(S) { const F = this.found(); for (const n in F) { const s = SELF_BY_N[n]; if (s) for (const k in s.stats) addStat(S, k, s.stats[k]); } },
  // 夢裡的遺物：精英、首領倒下時有機會留下一個「還沒想起來、只能靠遺物找回來」的人的東西
  relicLeft() { const F = this.found(); return PAST_SELVES.filter(s => s.src === 'relic' && !F[s.n]); },
  dropRelic(m) {
    const w = G.world; if (!w || w.kind !== 'map' || (w.tier || 0) < 2) return;
    const ch = m.boss ? 0.25 : m.rarity === 'rare' ? 0.025 : m.rarity === 'magic' ? 0.005 : 0; if (!ch || Math.random() > ch) return;
    const L = this.relicLeft().filter(s => !(w.relics || []).some(r => r.n === s.n)); if (!L.length) return;
    const s = pick(L), p = randomFloorNear(m.x, m.y, 40);
    (w.relics || (w.relics = [])).push({ n: s.n, x: p.x, y: p.y, taken: false });
  },
  html() {
    const F = this.found(), got = this.count();
    let h = `<div class="csec">137 個我　<span class="thint">牢房牆上每一個「醒來」，都是一個以前的你。想起一個，就多一個「習慣」（全帳號共用）。已經想起 ${got} 個（夢裡找得到的有 ${PAST_SELVES.length} 個）</span></div>`;
    h += `<div class="jent"><div class="thint">怎麼想起來：莫釣到寫著編號的紙、在「記起的我」第一頁選了那個人、在夢裡撿到他們留下的遺物（精英和看守者倒下時偶爾會掉）。</div></div>`;
    const mine = PAST_SELVES.filter(s => F[s.n]).sort((a, b) => a.n - b.n);
    for (const s of mine) h += `<div class="jent pself"><b>第 ${s.n} 個我・${s.name}</b><div class="pq">「${s.words}」</div><div class="phb">習慣「${s.habit}」：${this.habitText(s)}</div></div>`;
    h += `<div class="lhead">牆上的 137 個醒來</div><div class="pgrid">`;
    for (let n = 1; n <= 137; n++) { const s = SELF_BY_N[n], on = F[n] && s; h += `<span class="pc ${on ? 'on' : s ? 'can' : ''}" title="${on ? `第 ${n} 個我・${s.name}` : s ? `第 ${n} 個：${({ fish: '也許莫釣得到', cpath: '在「記起的我」裡', relic: '在夢裡的某個地方' })[s.src]}` : '還想不起來'}">${n}</span>`; }
    return h + '</div>';
  },
};
JournalTabs.add('selves', '137 個我', () => PastSelves.html());
Hook.on('treeStats', S => PastSelves.apply(S));
Hook.on('start', () => { PastSelves.sync(true); });
Hook.on('kill', m => { if (m && !m.minionOf) PastSelves.dropRelic(m); });
Interact.add('relic', (pl, w) => (w.relics || []).filter(r => !r.taken).map(r => ({ ref: r, label: '撿起某個以前的我留下的東西', r: 60 })), r => { r.taken = true; burst(r.x, r.y, '#e8d8a8', 24, 160); PastSelves.unlock(r.n, 'relic'); });
let _psT = 0;
Hook.on('update', dt => { if ((_psT += dt) > 1) { _psT = 0; PastSelves.sync(false); } });
Hook.on('drawWorld', g => {
  const w = G.world; if (!w || !w.relics) return;
  for (const r of w.relics) {
    if (r.taken) continue; const a = 0.55 + 0.3 * Math.sin(G.time * 3 + r.n);
    g.save(); g.globalAlpha = a * 0.5; g.fillStyle = '#f0e0b0'; g.beginPath(); g.ellipse(r.x, r.y + 5, 16, 6, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1; g.fillStyle = '#e8dcc0'; g.save(); g.translate(r.x, r.y - 4 + Math.sin(G.time * 2 + r.n) * 1.5); g.rotate(-0.15); g.fillRect(-6, -8, 12, 15); g.fillStyle = '#8a7a60'; for (let k = 0; k < 4; k++) g.fillRect(-4, -5 + k * 3, 8, 1); g.restore(); g.restore();
  }
});
(() => { const st = document.createElement('style'); st.textContent = `.jent.pself .pq { color:#c8b48a; font-style:italic; } .jent.pself .phb { color:#9fe0b0; font-size:12px; }
  .pgrid { display:flex; flex-wrap:wrap; gap:3px; margin:6px 0 10px; } .pgrid .pc { width:26px; height:20px; font-size:10px; line-height:20px; text-align:center; border-radius:3px; background:rgba(255,255,255,.04); color:#4a4030; }
  .pgrid .pc.can { color:#8a7a60; background:rgba(232,214,170,.07); } .pgrid .pc.on { color:#1a1408; background:#e8d8a8; font-weight:bold; }`; document.head.appendChild(st); })();
