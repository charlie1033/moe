// =============================================================
//  v2.17.2 劇情跟著看守者的抉擇變（wardens.js 的三選一）
//  ・玩家第一次面對看守者時選了「放走」（free）或「和解」（name），之後播的劇情改用這裡的版本；
//    選「了結」（kill）或還沒選過，照 story.js 原本的文字
//  ・只改文字，不做分支劇情：哪一頁換掉、換成什麼，寫在 SC_ALT
//    SC_ALT[劇情代號] = { w: 看守者代號, free: { p: { 第幾頁: 新文字 }, text: 日誌文字 }, name: {…} }
//  ・小雀之三：王冠改由小雀在「大白」那一章之後送（wardencamp.js），這裡把小雀之三「把王冠放在你手上」改成指著你收著的那頂
//  接法：把 STORY[代號] 的 pages、journal.text 換成 getter（每次讀都看 G.P.wardens.first）
// =============================================================
const SC_ALT = {
  boss_boneking: { w: 'boneking',
    free: { p: { 0: '腐骨之王撿起王冠，沒有戴上。轉身走進黑暗前，他把王冠在手裡轉了一圈——你看見王冠的瞬間，一段畫面湧進腦海——' } } },
  boss_witch: { w: 'witch',
    free: { p: { 0: '巫后的火縮成掌心大的一團光。光裡浮出一張臉——是你自己的臉，年輕一點，眼神很堅定。' } } },
  boss_beast: { w: 'beast',
    free: { p: { 0: '小白狗跑遠了。牠剛才站的地方，冰層一片一片碎開。冰裡封著一段誓言，你聽見自己的聲音在念：' } } },
  ending: { w: 'b_void',
    free: { p: { 0: '虛空之主闔上眼睛，退回裂縫裡。夢開始崩塌，一層一層，像被風吹散的灰。\n\n你站在夢之門前。這一次，門的另一邊不再是夢，只是一扇普通的木門，門縫裡透著晨光。' } } },
  glen2: { w: 'boneking',
    free: { p: { 0: '「你放陛下走了？」格倫把燈放下，對著空氣行了一個禮。\n\n「……謝謝你。是陛下下令，把守門人關進這裡的。是我轉動的鑰匙。」' } },
    name: { p: { 0: '「你叫了他一聲陛下。」格倫把燈放下，對著空氣行了一個禮。\n\n「他最後是像個王一樣倒下的吧。是陛下下令，把守門人關進這裡的。是我轉動的鑰匙。」' } } },
  sparrow2: { w: 'beast',
    free: { p: { 0: '小雀抱著一隻小小的白狗跑過來，笑得眼睛都瞇起來了。\n\n「是大白！大白回來了！牠還記得要舔我的手！」',
      1: '「那時候深淵做了一個很冷很冷的夢，大白就跑進去了。牠變得好大，好兇，認不得我了。」\n\n她把臉埋進白狗的毛裡：「謝謝你把牠帶回來。」' },
      text: '霜牙巨獸原本是小雀的小狗「大白」。我放了牠，牠變回小白狗，回到了小雀身邊。' },
    name: { p: { 0: '小雀聽說你喊了大白的名字，哭了。\n\n「牠有聽到對不對？牠最後有想起我對不對？」',
      1: '「以前大白很小、很白，會舔我的手。後來深淵做了一個很冷很冷的夢，牠就跑進去了。」\n\n她擦擦眼淚：「謝謝你叫牠的名字。這樣牠睡覺的時候，就不會覺得冷了。」' },
      text: '霜牙巨獸原本是小雀的小狗「大白」。我喊了牠的名字，牠在最後好像想起了小雀。' } },
  are2: { w: 'beast',
    free: { p: { 0: '「我聽說了。那頭白色的……變回一隻小狗了？」阿雷沉默了很久。\n\n「我一直以為牠是怪物。原來，牠只是一隻找不到主人的狗。」' } } },
  hassan2: { w: 'b_grass',
    free: { p: { 0: '「你從草原回來了？聽說你放那頭獸王走了。」哈桑笑了。「牠以前是我商隊的守護獸。」' } } },
  yin2: { w: 'b_swamp',
    free: { p: { 0: '「我妹妹回來了。」茵低著頭攪著鍋子，眼眶紅紅的。「她是聞著這鍋湯的味道回來的。」',
      1: '「她想找出解開深淵的毒，結果把自己泡進了毒裡。謝謝你沒有傷她。這鍋湯，是她教我的。」' },
      text: '沼澤魔女是茵的妹妹，為了解開深淵的毒而墮落。我放她走，她跟著湯的味道回到了茵身邊。' },
    name: { p: { 1: '「她想找出解開深淵的毒，結果把自己泡進了毒裡。你告訴她我還在熬湯——謝謝你，讓她最後知道這件事。這鍋湯，是她教我的。」' } } },
  karl2: { w: 'b_forest',
    free: { p: { 0: '「古樹把樹根收回去了，森林的路也打開了。」卡爾站起來，向你行了一個很久沒行過的禮。' } } },
};
// 小雀之三：王冠已經在「大白」那一章之後送過了，這裡改成指著你收著的那頂
const SC_FIXED = {
  sparrow3: { 0: '小雀拉拉你的袖子，指著你收著的那頂生鏽的小王冠。\n\n「那是我的喔。爸爸說，我是公主。」' },
};
const scChoice = w => (typeof G !== 'undefined' && G.P && G.P.wardens && G.P.wardens.first && G.P.wardens.first[w]) || null;
function scInstall(id) {
  const s = STORY[id]; if (!s || s._sc) return; s._sc = true;
  const basePages = s.pages.slice(), baseText = s.journal && s.journal.text, A = SC_ALT[id], F = SC_FIXED[id];
  const alt = () => (A && A[scChoice(A.w)]) || null;
  Object.defineProperty(s, 'pages', { configurable: true, get() {
    const a = alt(); return basePages.map((t, i) => (a && a.p && a.p[i] != null) ? a.p[i] : (F && F[i] != null) ? F[i] : t);
  } });
  if (s.journal) Object.defineProperty(s.journal, 'text', { configurable: true, get() { const a = alt(); return (a && a.text) || baseText; } });
}
for (const id of Object.keys(SC_ALT).concat(Object.keys(SC_FIXED))) scInstall(id);
// story.js 可能在讀檔時重建人物章節的 STORY（第 363 行），讀完角色再裝一次
Hook.on('start', () => { for (const id of Object.keys(SC_ALT).concat(Object.keys(SC_FIXED))) { if (STORY[id]) { const d = Object.getOwnPropertyDescriptor(STORY[id], 'pages'); if (!d || !d.get) STORY[id]._sc = false; } scInstall(id); } });
