// =============================================================
//  第一百三十八本：歐莉那本空白的冊子，變成日誌（J）的一頁，自動記下這一輪發生的事
//  玩家看到：日誌上方多一個分頁「第一百三十八本」，分成：做過的抉擇、倒下的夜（第幾夜、在哪、被誰打倒）、
//    常常打倒你的看守者、紀錄（爬塔最高層之類）。還沒聽歐莉講「一百三十七本」那一章時，頁首會提示去找她
//  同一隻看守者（任何首領）打倒你第 3 次：回到營地時，格倫說一句那隻看守者專屬的話，送一瓶藥（稜鏡藥劑；沒有這種藥就送生命藥劑）
//  被誰打倒：倒下那一刻，看守者的血條還在而且在附近就算看守者；否則算離你最近的怪；附近沒有怪就算陷阱或身上的毒火
//  給其他組用：
//    Book138.note(kind, text)   kind：'choice' 抉擇、'death' 死亡、'record' 紀錄（自動記下第幾夜和時間）
//    Book138.record(名稱, 數字)  只有比舊紀錄高才更新，有更新回傳 true（同時寫一行 'record'）
//  資料：角色存檔 P.book138 = { deaths:[{n 第幾夜, place, by, boss, t}], bossDeaths:{首領id:次數}, glen:{首領id:true}, notes:[{kind,text,n,t}], records:{名稱:數字} }
//        舊存檔沒有這一欄：讀角色時自動補（Hook 'start'）
// =============================================================
const GLEN_LINES = {
  boneking: '陛下的斧頭，我年輕時也挨過一次。往左邊躲，他右手比較慢。',
  witch: '巫后的火燒過你三次了。帶著這瓶，下次別站在她的喉嚨前面。',
  beast: '大白……我是說那頭巨獸，撲過來之前會先低頭。看到就跑。',
  b_cave: '洞穴母后的絲，黏上了就砍斷，別硬拉。',
  b_grass: '草原獸王只會往前衝。讓牠衝，你往旁邊走一步就好。',
  b_beach: '那隻蟹的夾子比殼還硬。繞到牠背後打。',
  b_swamp: '沼澤魔女的湯我喝過，死人喝了都嫌苦。這瓶給你，沒那麼苦。',
  b_forest: '古樹之心長得慢，你可以比它更有耐心。一圈一圈削就好。',
  b_desert: '沙之法老的雷落下前，地上會先亮。死人的眼睛都看得到，你也看得到。',
  b_void: '虛空之主那邊什麼都沒有，連我的燈都照不到。所以我把燈油裝進這瓶裡了。',
};
const GLEN_DEFAULT = '同一個傢伙把你打倒三次了，巡邏的人都記得。拿著，下次走慢一點。';
const Book138 = {
  data() {
    const P = G.P; if (!P) return null;
    const b = P.book138 || (P.book138 = {});
    b.deaths = b.deaths || []; b.bossDeaths = b.bossDeaths || {}; b.glen = b.glen || {}; b.notes = b.notes || []; b.records = b.records || {};
    return b;
  },
  night() { const w = G.world; return w && w.kind === 'map' ? (w.tier || 0) : 0; },
  note(kind, text) {
    const b = this.data(); if (!b || !text) return;
    b.notes.push({ kind: ['choice', 'death', 'record'].includes(kind) ? kind : 'record', text: String(text), n: this.night(), t: Date.now() });
    if (b.notes.length > 200) b.notes.splice(0, b.notes.length - 200);
    if (UI.open && UI.open.journal) UI.refreshJournal();
  },
  record(name, n) {
    const b = this.data(); if (!b || !(n > (b.records[name] ?? -Infinity))) return false;
    b.records[name] = n; this.note('record', `${name}：${n}`); return true;
  },
  // 倒下的那一刻
  onDeath() {
    const b = this.data(), pl = G.pl, w = G.world; if (!b || !pl || !w) return;
    let killer = null;
    const bb = G.bossBar; if (bb && !bb.dead && bb.awake !== false && dist(bb, pl) < 600) killer = bb;
    if (!killer) { let bd = 420; for (const m of G.mons) { if (m.dead || m.hidden) continue; const d = dist(m, pl) - (m.boss ? 200 : 0); if (d < bd) { bd = d; killer = m; } } }
    const a = pl.ail || {};
    const by = killer ? killer.name : a.poison && a.poison.length ? '身上的毒' : a.ign ? '身上的火' : '夢裡的陷阱';
    const place = w.arena ? (BOSSES[w.arena] ? BOSSES[w.arena].name + '的競技場' : '競技場') : (w.theme ? w.theme.name : (w.name || ''));
    const e = { n: w.kind === 'map' && !w.arena ? (w.tier || 0) : 0, place, by, boss: killer && killer.boss ? killer.boss : null, t: Date.now() };
    b.deaths.push(e); if (b.deaths.length > 60) b.deaths.splice(0, b.deaths.length - 60);
    if (e.boss) {
      b.bossDeaths[e.boss] = (b.bossDeaths[e.boss] || 0) + 1;
      if (b.bossDeaths[e.boss] >= 3 && !b.glen[e.boss]) b.glenPend = e.boss;
    }
  },
  // 回到營地：格倫的話＋一瓶藥
  glenGift() {
    const b = this.data(), id = b && b.glenPend; if (!id) return;
    b.glenPend = null; b.glen[id] = true;
    const line = GLEN_LINES[id] || GLEN_DEFAULT, bname = BOSSES[id] ? BOSSES[id].name : '那傢伙';
    const type = FLASKS.prism ? 'prism' : 'life', tier = Math.max(1, Math.min(6, Math.ceil((G.P.maxTier || 1) / 2)));
    const f = makeFlask(type, tier, 'magic');
    const idx = G.P.inv.indexOf(null);
    if (idx >= 0) G.P.inv[idx] = f; else dropLoot(G.pl.x, G.pl.y, { item: f });
    UI.banner('格倫', `「${line}」`, '#c8e0ff');
    UI.msg(`格倫：「${line}」`, '#c8e0ff');
    UI.msg(`格倫塞給你一瓶${FLASKS[type].name}（被${bname}打倒三次）${idx >= 0 ? '，放進背包了' : '，背包滿了，放在你腳邊'}。`, '#9fff9f');
    this.note('death', `被${bname}打倒了第三次。格倫把我扛回床上，塞給我一瓶${FLASKS[type].name}。`);
    UI.refreshInv(); saveGame();
  },
  html() {
    const b = this.data(); if (!b) return '';
    const P = G.P, fmt = n => n ? `第 ${n} 夜` : '競技場';
    let h = `<div class="csec">第一百三十八本　<span class="thint">歐莉替這一次的你寫的冊子</span></div>`;
    h += P.story && P.story.seen && P.story.seen.olly2 ? `<div class="jent"><div>「這一本，我會一邊看一邊寫。」歐莉把冊子翻開，第一頁寫著你的名字：${P.name || '守門人'}。</div></div>`
      : `<div class="jent"><div class="thint">冊子的封面是空白的。（推進到第 3 夜後，去牢房找歐莉聊聊，她會跟你說這本冊子的事。內容已經在自動記錄了。）</div></div>`;
    const choices = b.notes.filter(x => x.kind === 'choice');
    h += `<div class="lhead">做過的抉擇</div>` + (choices.length ? choices.map(x => `<div class="lrow">${x.n ? `<span class="thint">${fmt(x.n)}</span>　` : ''}${x.text}</div>`).join('') : '<div class="lrow dim">還沒有。</div>');
    h += `<div class="lhead">倒下的夜　<span class="thint">一共 ${b.deaths.length} 次${b.deaths.length ? `，最深在第 ${Math.max(...b.deaths.map(d => d.n))} 夜` : ''}</span></div>`;
    const dn = b.notes.filter(x => x.kind === 'death').map(x => ({ t: x.t, html: `<span class="thint">${x.n ? fmt(x.n) : ''}</span>　${x.text}` }));
    const dl = b.deaths.map(d => ({ t: d.t, html: `${fmt(d.n)}．${d.place}　被<b class="${d.boss ? 'c-unique' : ''}">${d.by}</b>打倒` }));
    const all = dl.concat(dn).sort((x, y) => y.t - x.t).slice(0, 15);
    h += all.length ? all.map(x => `<div class="lrow">${x.html}</div>`).join('') : '<div class="lrow dim">一次都還沒倒下。</div>';
    const bd = Object.entries(b.bossDeaths).sort((x, y) => y[1] - x[1]);
    if (bd.length) h += `<div class="lhead">常常打倒你的看守者　<span class="thint">同一隻打倒你 3 次，格倫會有話要說</span></div>` + bd.map(([id, n]) => `<div class="lrow"><b class="c-unique">${BOSSES[id] ? BOSSES[id].name : id}</b>　${n} 次${b.glen[id] ? '　<span class="thint">（格倫給過藥了）</span>' : ''}</div>`).join('');
    const rec = Object.entries(b.records);
    h += `<div class="lhead">紀錄</div>` + (rec.length ? rec.map(([k, v]) => `<div class="lrow">${k}　<b>${v}</b></div>`).join('') : '<div class="lrow dim">還沒有。</div>');
    return h;
  },
};
Hook.on('start', P => { if (P) Book138.data(); });
let _b138dead = false;
Hook.on('update', () => {
  if (!G.P) return;
  if (G.dead && !_b138dead) Book138.onDeath();
  _b138dead = !!G.dead;
  if (!G.dead && G.world && G.world.kind === 'town' && G.P.book138 && G.P.book138.glenPend) Book138.glenGift();
});
JournalTabs.add('book138', '第一百三十八本', () => Book138.html());
