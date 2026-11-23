// =============================================================
//  帶話任務：故事裡大家沒說出口的話，替他們帶到另一個營地
//  ・玩家看到：A 有話要帶時，頭上冒一個淡藍色的「…」泡泡；按 F → A 說出請求，選「我幫你帶」接下
//    → 到另一個營地找 B（頭上也有泡泡）按 F，B 回一段話 → 回去找 A 按 F，A 回應、送一件小禮物，日誌多一頁
//  ・九件（ERRANDS）：阿雷→小雀、國王→小雀、魯伯→托姆、卡爾→莫德、哈桑→歐莉、格倫→國王、諾娃→薇薇、茵→魯伯、瑟琳→數星星的老人
//  ・任務面板（展開時）最下面列出進行中的帶話；國王的殘影負責「帶話」：沒事時跟他說話，他會說還有誰的話沒帶到
//  ・小禮物：通貨、藥劑，或一件有名字的普通裝備（底材挑你等級用得到的最高階）；背包滿了就掉在腳邊
//  ・資料：G.P.errands[代號] = 'got'（接了）／'told'（B 回話了）／'done'；日誌頁是 STORY 的 er_* 條目（P.story.seen）
//  ・終局村莊的同一批人（v_glen、vf_sailor…）也算，見 ER_ALIAS
// =============================================================
const ER_ALIAS = { v_glen: 'jailer', v_shop: 'shop', vf_kid: 'f_kid', vf_mer: 'f_mer', vf_sailor: 'f_sailor', vf_elf: 'f_elf', vf_gnome: 'f_gnome', vf_old: 'f_old' };
const ERRANDS = [
  { id: 'er_are', from: 'are', to: 'girl', when: P => P.story.seen.are2, gift: { item: 'gloves', name: '阿雷的舊獵手套' },
    ask: '「如果你見到那個小女孩……幫我跟她說聲抱歉。我射過牠好幾箭。」',
    reply: ['小雀把石頭排好，抬頭看你。\n\n「阿雷叔叔？那個背弓的叔叔？」', '「大白以前很怕打雷，一定也很怕箭。」她想了很久。\n\n「你跟他說，我不生氣了。可是他要答應我，以後看到白色的狗狗，不可以射。」'],
    back: ['阿雷聽完，低頭磨了很久的箭頭。\n\n「……不射。我答應她。」', '他把一雙舊手套塞給你。「拿去。我以後用不到這麼多箭了。」'],
    title: '帶話　阿雷的抱歉', text: '我替阿雷向小雀道歉。小雀說她不生氣了，只要阿雷以後看到白色的狗不要射。阿雷答應了。' },
  { id: 'er_king', from: 'king', to: 'girl', when: P => P.story.seen.king2, gift: { flask: 1, cur: 'exalt', n: 1 },
    ask: '「替我告訴小雀……爸爸很抱歉。」',
    reply: ['你把話帶到的時候，小雀正在幫一顆石頭擦亮。\n\n她的手停住了。', '「爸爸……還在嗎？」\n\n她把那頂生鏽的小王冠戴上，歪歪的。\n\n「你跟爸爸說，我把門外的雪人都數過了，一個都沒少。叫他不要再哭了。」'],
    back: ['國王的殘影聽著，透明的手一直在發抖。\n\n「她……戴上了王冠？」', '「謝謝你。」他把一個小小的藥瓶交給你。\n\n「她小時候發燒，我守了一整夜，就是這瓶藥。我一直沒丟。」'],
    title: '帶話　爸爸很抱歉', text: '我替國王告訴小雀：爸爸很抱歉。小雀戴上小王冠，叫爸爸不要再哭。國王把當年守著她的那瓶藥送給了我。' },
  { id: 'er_rube', from: 'f_sailor', to: 'f_dwarf', when: P => P.hubs.harbor, gift: { item: 'boots', name: '魯伯的甲板靴' },
    ask: '「我的船……沉在第三夜。冰原那邊的人如果看到，幫我說聲對不起。說我不該把船開進那麼冷的夢裡。」',
    reply: ['托姆放下鎬子，瞇起眼睛。\n\n「船？冰裡是有一根桅杆，上面綁著一面破帆，我每天鑿冰都會經過。」', '「對不起？跟誰說？」他敲了敲冰面。「……好吧，我替你跟它說了。」\n\n「叫那個醉鬼自己來看。船還在，只是睡著了。」'],
    back: ['魯伯聽完，酒杯停在半空中。\n\n「船還在？」', '他沉默了很久，把杯子推開。「……那我今天，就不喝了。」\n\n他把腳上的靴子脫下來給你：「這雙踩過甲板，比我還記得怎麼站穩。」'],
    title: '帶話　沉在第三夜的船', text: '魯伯的船沉在第三夜的冰原裡。托姆說桅杆還在冰裡，船只是睡著了。魯伯那天沒有喝酒。' },
  { id: 'er_karl', from: 'karl', to: 'f_maud', when: P => P.story.seen.karl1, gift: { item: 'amulet', name: '王宮護衛的舊護符' },
    ask: '「守門人大人，若您走到燈塔……那裡應該有一位女騎士，叫莫德。請告訴她：卡爾還活著，還在找路。」',
    reply: ['莫德一直看著遠方的黑暗。你說出卡爾的名字時，她第一次轉過頭來。', '「……那個笨蛋。」\n\n這是你第一次聽見她說話。\n\n「跟他說：路不用找了。我在燈塔等。守門人右手邊的位置，我替他留著。」'],
    back: ['卡爾聽完，把頭盔摘了下來，很久都沒說話。', '「她還是叫我笨蛋。」他笑了，眼眶是紅的。\n\n「謝謝您。這枚舊護符，是我們受封那天一起領的——請您收下。」'],
    title: '帶話　右手邊的位置', text: '我替卡爾帶話給燈塔的莫德。她第一次開口，說會替卡爾留著守門人右手邊的位置。' },
  { id: 'er_hassan', from: 'hassan', to: 'shop', when: P => P.story.seen.hassan2, gift: { cur: 'chaos', n: 2 },
    ask: '「你從牢房來的吧？那裡有個王宮書記……幫我問問她，封城那天的帳冊上，有沒有寫我商隊的名字。我想知道，有沒有人記得我們。」',
    reply: ['歐莉翻了很久，從一疊舊冊子最底下抽出一本。', '「有。」她指著一行小字念給你聽：\n\n「最後離城的商隊，三十二頭駱駝，一頭守護獸。隊長不肯放下貨，說『總有人需要』。」\n\n「跟他說，我記得。書記什麼都記得。」'],
    back: ['哈桑聽著聽著，突然大笑起來，笑到眼淚都掉出來了。\n\n「三十二頭！她連駱駝都數了！」', '「好、好。有人記得就好。」他塞給你一個小袋子，「生意人不欠人情，這個拿去。」'],
    title: '帶話　有人記得', text: '哈桑想知道有沒有人記得他的商隊。歐莉的帳冊上寫著：三十二頭駱駝、一頭守護獸、一個不肯放下貨的隊長。' },
  { id: 'er_glen', from: 'jailer', to: 'king', when: P => P.story.seen.glen2 && P.hubs.lighthouse, gift: { cur: 'regal', n: 1, cur2: 'portal', n2: 5 },
    ask: '「你要去燈塔？聽說陛下的影子在那裡……替我稟報陛下：鑰匙，我照命令丟了。一把都沒留。」',
    reply: ['國王的殘影聽完，閉上了眼睛。', '「格倫……他還在巡邏？」\n\n「告訴他，命令已經結束了。一百年前就結束了。他可以休息了——如果他願意的話。」'],
    back: ['格倫聽完，提著燈的手垂了下來。\n\n「命令……結束了。」', '他站了很久，又把燈提了起來。「死人的腳停不下來。不過，知道是自己想走的，感覺不一樣。」\n\n他給了你一卷舊巡邏圖：「現在用不到了。」'],
    title: '帶話　命令結束了', text: '我替格倫向國王稟報鑰匙的事。國王說命令一百年前就結束了。格倫還是會巡邏，但這次是他自己想走的。' },
  { id: 'er_nova', from: 'nova', to: 'vivi', when: P => P.story.seen.nova2, gift: { flask: 1, cur: 'divine', n: 1 },
    ask: '「冰窟那裡有一位蒙著眼的占卜師吧？她看得見夢，卻看不見光。幫我告訴她：她看不見的那一半，我一直替她亮著。」',
    reply: ['薇薇安靜地聽完，把手放在胸口。', '「我知道。冷的夜裡，我的眼皮會變暖，我一直以為是火堆。」\n\n「原來是她。跟她說——我在夢裡看過她的樣子。她很漂亮，而且一直在笑。」'],
    back: ['諾娃的光閃了一下，變得比平常更亮。\n\n「她說我在笑？」', '「……那我就一直笑下去吧。」她把一點火光裝進小瓶子交給你，「帶著。路黑的時候用。」'],
    title: '帶話　另一半的光', text: '諾娃託我告訴薇薇：她看不見的那一半，諾娃一直替她亮著。薇薇說，她在夢裡看過諾娃一直在笑。' },
  { id: 'er_yin', from: 'yin', to: 'f_sailor', when: P => P.story.seen.yin1 && P.hubs.harbor, gift: { flask: 1, cur: 'alch', n: 2 },
    ask: '「海邊那個醉醺醺的水手，你認得吧？把這包藥草帶給他。跟他說：泡水喝，不准泡酒。」',
    reply: ['魯伯接過藥草聞了一下，整張臉皺起來。\n\n「這是什麼？比海水還苦！」', '「……泡水喝？不准泡酒？」他嘆了一口氣，把藥草小心收進懷裡。\n\n「跟那個婆婆說，謝了。我盡量。」'],
    back: ['「盡量？」茵哼了一聲，用力攪著鍋子。', '「醉鬼都這樣說。」可是她的嘴角翹了一下。\n\n「好啦，你跑了一趟，這鍋分你一瓶。」'],
    title: '帶話　不准泡酒', text: '茵託我帶藥草給魯伯：泡水喝，不准泡酒。魯伯說他盡量。茵嘴上嫌他，嘴角卻翹了一下。' },
  { id: 'er_seren', from: 'f_mer', to: 'f_old', when: P => P.hubs.harbor, gift: { item: 'ring', name: '瑟琳的貝殼戒指' },
    ask: '「你會走到世界的盡頭吧？那裡有人在數星星。幫我問問他：海上那顆最亮的星，還在不在？」',
    reply: ['老人抬頭找了很久，手指在空中點來點去。', '「昨晚少了一顆，前晚也是……但不是那顆。」\n\n「海上那顆，還在。它亮得很固執，像在等誰回去。」'],
    back: ['瑟琳聽完，把尾巴輕輕拍在水裡。\n\n「還在啊……」', '「那我就知道往哪裡游了。」她從頭髮上取下一枚貝殼戒指給你，「等我回得去，你再還我。」'],
    title: '帶話　最亮的那顆星', text: '瑟琳託我問數星星的老人：海上最亮的那顆星還在不在。還在。瑟琳說，那她就知道往哪裡游了。' },
];
// 日誌頁（er_*）和 B 回話的那一段（er_*_b，不進日誌）
for (const e of ERRANDS) {
  STORY[e.id + '_b'] = { title: e.title, pages: e.reply, goal: () => erGoalBack(e) };   // v2.20 最後一頁的「目標」（goals.js）
  STORY[e.id] = { title: e.title, pages: e.back, journal: { title: e.title, text: e.text }, goal: { done: true, t: '帶話' } };
}
const erGoalTo = e => { const to = erWho(e.to); return `把${erShort(e.from)}的話帶給${to.hub ? to.hub + '的' : ''}${erShort(e.to)}`; };
const erGoalBack = e => `回${erWho(e.from).hub || '營地'}，把回話告訴${erShort(e.from)}`;
// 狀態列：在營地時顯示第一件進行中的帶話（其他的算件數）
Goal.live(() => {
  const P = G.P, w = G.world; if (!P || !w || w.kind !== 'town') return null;
  const st = erState(P), act = ERRANDS.filter(e => st[e.id] === 'got' || st[e.id] === 'told'); if (!act.length) return null;
  const e = act[0]; return { t: (st[e.id] === 'got' ? erGoalTo(e) : erGoalBack(e)) + (act.length > 1 ? `（還有 ${act.length - 1} 件帶話）` : ''), c: '#9fd8ff' };
});
// 人物在哪裡、叫什麼（營地的 NPC 和路人都找）
function erWho(id) {
  for (const h of HUBS) { const n = h.npcs.find(x => x.id === id); if (n && h.id !== 'village') return { name: n.name, hub: h.name }; }
  for (const hub in CAMP_FOLK) { if (hub === 'village') continue; const f = CAMP_FOLK[hub].find(x => x.id === id); if (f) return { name: f.name, hub: HUB_BY_ID[hub] ? HUB_BY_ID[hub].name : '' }; }
  return { name: id, hub: '' };
}
const erShort = id => ({ king: '國王', f_old: '數星星的老人' })[id] || erWho(id).name.split('．').pop();
const erState = P => P.errands || (P.errands = {});
G.erLater = {};   // 這次遊玩說「下次吧」的：先不再問
// 這個人現在有沒有帶話的事：'give'（B 收話）／'back'（回報 A）／'offer'（A 要請你帶話）
function erAction(id0, P) {
  const id = ER_ALIAS[id0] || id0, st = erState(P);
  for (const e of ERRANDS) if (e.to === id && st[e.id] === 'got') return { e, k: 'give' };
  for (const e of ERRANDS) if (e.from === id && st[e.id] === 'told') return { e, k: 'back' };
  for (const e of ERRANDS) if (e.from === id && !st[e.id] && !G.erLater[e.id] && e.when(P)) return { e, k: 'offer' };
  return null;
}
function erGiftBase(slot, lvl) {
  const pool = BASES.filter(b => b.slot === slot && (b.lvl || 1) <= Math.max(1, lvl));
  return pool.sort((a, b) => (b.lvl || 1) - (a.lvl || 1))[0] || BASES.find(b => b.slot === slot);
}
function erGive(P, g, who) {
  const got = [], put = it => { const j = P.inv.indexOf(null); if (j >= 0) P.inv[j] = it; else dropLoot(G.pl.x, G.pl.y, { item: it }); };
  if (g.item) { const b = erGiftBase(g.item, P.lvl); if (b) { const it = makeItem(b.id, 'normal', Math.max(1, P.lvl)); it.name = g.name; put(it); got.push(`「${g.name}」`); } }
  if (g.flask) { const f = randomFlask(Math.min(6, 1 + Math.floor((P.maxTier || 1) / 3)), 1); put(f); got.push(f.name || '藥劑'); }
  if (g.cur) { P.cur[g.cur] = (P.cur[g.cur] || 0) + g.n; got.push(`${CURRENCY[g.cur].name} ×${g.n}`); }
  if (g.cur2) { P.cur[g.cur2] = (P.cur[g.cur2] || 0) + g.n2; got.push(`${CURRENCY[g.cur2].name} ×${g.n2}`); }
  UI.msg(`${who}給了你 ${got.join('、')}`, '#ffd780');
}
function erRun(id0, P) {
  const a = erAction(id0, P); if (!a) return false;
  const { e, k } = a, st = erState(P);
  if (k === 'give') {
    st[e.id] = 'told'; UI.queueStory(e.id + '_b');
    UI.msg(`帶話：回${erWho(e.from).hub}告訴${erShort(e.from)}`, '#9fd8ff');
  } else if (k === 'back') {
    st[e.id] = 'done'; P.story.seen[e.id] = true; UI.queueStory(e.id);
    erGive(P, e.gift, erShort(e.from)); UI.msg(`日誌多了一頁：${e.title}`, '#9fd8ff'); burst(G.pl.x, G.pl.y, '#9fd8ff', 24, 160);
  } else {
    const to = erWho(e.to);
    gameAsk(`${erWho(e.from).name}：\n${e.ask}`, () => {   // v2.20 要帶給誰改寫在底下的「目標」
      st[e.id] = 'got'; UI.msg(`接下帶話：去${to.hub}找${erShort(e.to)}`, '#9fd8ff'); saveGame(); UI.renderQuest();
    }, { yes: '我幫你帶', no: '下次吧', onNo: () => { G.erLater[e.id] = true; }, goal: erGoalTo(e) });
    return true;
  }
  saveGame(); UI.refresh(); UI.renderQuest();
  return true;
}
Talk.add((id, ref) => erRun(id, G.P));
// 國王的殘影負責帶話：沒事時告訴你還有誰的話沒帶到
Talk.add((id, ref) => {
  if (id !== 'king') return false;
  const P = G.P, st = erState(P), lines = [];
  for (const e of ERRANDS) {
    if (st[e.id] === 'got') lines.push(`・${erShort(e.from)}的話，還沒帶給${erWho(e.to).hub}的${erShort(e.to)}`);
    else if (st[e.id] === 'told') lines.push(`・${erShort(e.to)}回話了，回${erWho(e.from).hub}告訴${erShort(e.from)}`);
    else if (!st[e.id] && e.when(P)) lines.push(`・${erWho(e.from).hub}的${erShort(e.from)}，有話想託人帶`);
  }
  const done = ERRANDS.filter(e => st[e.id] === 'done').length;
  gameNote(`國王的殘影：\n「話沒說出口，就會一直壓在心上。我最清楚。」\n\n${lines.length ? lines.join('\n') : '・現在沒有人在等你帶話。繼續往前走，總會有人想說些什麼。'}\n\n（帶到的話：${done} / ${ERRANDS.length}，記在日誌的「帶話」）`);
  return true;
});
// 任務面板：進行中的帶話
PanelRows.add('quest', P => {
  const st = erState(P); let h = '';
  for (const e of ERRANDS) {
    if (st[e.id] === 'got') h += `<div class="qstep">✉ 帶話：${erShort(e.from)} → ${erShort(e.to)}（${erWho(e.to).hub}）</div>`;
    else if (st[e.id] === 'told') h += `<div class="qstep">✉ 帶話：回去告訴${erShort(e.from)}（${erWho(e.from).hub}）</div>`;
  }
  return h;
});
// 日誌：帶到的話
JournalTabs.add('errands', '帶話', () => {
  const P = G.P, st = erState(P), done = ERRANDS.filter(e => st[e.id] === 'done');
  let h = `<div class="csec">帶話　<span class="thint">替大家把沒說出口的話帶到另一個營地（${done.length} / ${ERRANDS.length}）</span></div>`;
  h += done.length ? done.map(e => `<div class="jent"><b>${e.title}</b><div>${e.text}</div><button class="replay" data-k="${e.id}">重看</button></div>`).join('') : '<div class="skd">還沒有帶過話。頭上有淡藍色「…」泡泡的人，有話想託你帶。</div>';
  return h;
}, root => root.querySelectorAll('.replay').forEach(b => b.onclick = () => UI.queueStory(b.dataset.k)));
// 頭上的泡泡（有帶話的事）
Hook.on('drawWorld', g => {
  const w = G.world, P = G.P; if (!w || w.kind !== 'town' || !P) return;
  const list = (w.npcs || []).filter(n => !n.req || n.req(P)).concat(typeof campFolk === 'function' ? campFolk(w) : []);
  for (const n of list) {
    const a = erAction(n.id, P); if (!a) continue;
    const x = n.x, y = n.y - (n.hx ? 46 : 62) + Math.sin(G.time * 3 + x) * 2;
    g.save(); g.globalAlpha = a.k === 'offer' ? 0.8 : 1;
    g.fillStyle = a.k === 'offer' ? '#d8eeff' : '#9fd8ff'; roundRect(g, x - 13, y - 8, 26, 16, 7); g.fill();
    g.beginPath(); g.moveTo(x - 3, y + 8); g.lineTo(x, y + 13); g.lineTo(x + 3, y + 8); g.fill();
    g.fillStyle = '#1a3048'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(x + i * 6, y, 1.8, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
});
