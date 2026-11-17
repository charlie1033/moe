// =============================================================
//  任務系統：主線五章（每章兩個場景）＋終局兩章，每章最後一步都是打倒指定的首領
//  ・done(P)：這一步完成了沒；goal + prog(P, base)：計數型任務（從本章開始時算起）
//  ・hint：畫面旁邊的提示；reward：本章完成的獎勵
// =============================================================
const anySocketed = P => Object.values(P.equip).some(it => it && (it.sockets || []).some(k => k));
const anySupport = P => P.skills.some((sid, i) => sid && (P.links[i] || []).some(x => x && supportFits(x, sid)));
const qc = P => P.qc || (P.qc = { rare: 0, curUsed: 0, entered: 0, cleared: 0 });

const QUEST_VERSION = 2;
const talked = id => P => !!P.story.seen[id];
const QUESTS = [
  // ===== 主線五章：每章兩個場景，最後一步打倒第二個場景的看守者 =====
  { title: '第一章　骨與火', reward: { pts: 2, respec: 2, cur: { alch: 1, transmute: 3 } }, steps: [
    { text: '走進「夢之門」，進入第 1 夜', done: P => qc(P).entered >= 1, hint: '走到牢房上方金色的門前，按 F' },
    { text: '擊殺怪物', goal: 15, prog: (P, b) => P.kills - b.kills },
    { text: '按 P 點一個天賦', done: P => P.tree.length > 1, hint: '升級就有點數' },
    { text: '打倒「腐骨之王」（骸骨墓穴）', done: P => (P.bossKills.boneking || 0) > 0, hint: '第 1 夜最深處（小地圖 ☠）' },
    { text: '在背包對珠寶按右鍵，再點有空插槽的裝備，鑲一顆珠寶', done: anySocketed, hint: '找有洞的裝備，或用鑿孔石' },
    { text: '打倒「焰喉巫后」（熔岩洞窟）', boss: true, done: P => (P.bossKills.witch || 0) > 0, hint: '第 2 夜。怕冰，記得堆火抗' },
  ] },
  { title: '第二章　冰與暗', reward: { pts: 2, respec: 3, cur: { chaos: 1 }, jewel: 'ruby_3' }, steps: [
    { text: '抵達「冰窟營地」', done: P => P.hubs.icecamp, hint: '進入第 3 夜後回營地，就會到新營地' },
    { text: '和獵人阿雷聊聊', done: talked('are1'), hint: '頭上有「！」的人' },
    { text: '按 K 讓一顆輔助寶石生效', done: anySupport },
    { text: '打倒「霜牙巨獸」（冰封峽谷）', done: P => (P.bossKills.beast || 0) > 0, hint: '第 3 夜。怕火' },
    { text: '和盲眼占卜師薇薇聊聊', done: talked('vivi1') },
    { text: '擊殺稀有精英（黃色）', goal: 3, prog: (P, b) => qc(P).rare - b.rare },
    { text: '打倒「洞穴母后」（幽暗洞穴）', boss: true, done: P => (P.bossKills.b_cave || 0) > 0, hint: '第 4 夜。怕火，先清小蜘蛛' },
  ] },
  { title: '第三章　金沙與海霧', reward: { pts: 3, respec: 3, cur: { regal: 1, aug: 2 }, jewel: 'sapphire_4' }, steps: [
    { text: '抵達「海風驛站」', done: P => P.hubs.harbor },
    { text: '和商隊長哈桑聊聊', done: talked('hassan1') },
    { text: '打倒「草原獸王」（金色草原）', done: P => (P.bossKills.b_grass || 0) > 0, hint: '第 5 夜。怕冰，看到衝鋒往旁邊閃' },
    { text: '和老漁夫莫聊聊', done: talked('mo1') },
    { text: '用通貨改造裝備', goal: 3, prog: (P, b) => qc(P).curUsed - b.cur, hint: '背包裡點通貨，再點裝備' },
    { text: '打倒「巨鉗蟹王」（迷霧海灘）', boss: true, done: P => (P.bossKills.b_beach || 0) > 0, hint: '第 6 夜。殼很硬，用元素打，最怕雷' },
  ] },
  { title: '第四章　腐沼與黑森', reward: { pts: 3, respec: 4, cur: { socket: 1, divine: 1 } }, steps: [
    { text: '抵達「樹根下的庇護所」', done: P => P.hubs.grove },
    { text: '和藥草婆婆茵聊聊', done: talked('yin1') },
    { text: '角色達到 40 級', done: P => P.lvl >= 40 },
    { text: '打倒「沼澤魔女」（腐沼）', done: P => (P.bossKills.b_swamp || 0) > 0, hint: '第 7 夜。怕火，記得堆毒素抗性' },
    { text: '和迷途騎士卡爾聊聊', done: talked('karl1') },
    { text: '打倒「古樹之心」（黑森林）', boss: true, done: P => (P.bossKills.b_forest || 0) > 0, hint: '第 8 夜。非常怕火' },
  ] },
  { title: '第五章　沙與虛空', reward: { pts: 3, respec: 4, cur: { exalt: 1, chaos: 3 }, jewel: 'diamond_4' }, steps: [
    { text: '抵達「虛空邊緣的燈塔」', done: P => P.hubs.lighthouse },
    { text: '和守燈人諾娃聊聊', done: talked('nova1') },
    { text: '打倒「沙之法老」（沙漠遺跡）', done: P => (P.bossKills.b_desert || 0) > 0, hint: '第 9 夜。怕冰' },
    { text: '和國王的殘影聊聊', done: talked('king1') },
    { text: '打倒「虛空之主」（主線結局）', boss: true, done: P => (P.bossKills.b_void || 0) > 0, hint: '第 10 夜。怕雷，別站在紫色地面上' },
  ] },
  // ===== 終局 =====
  { title: '終局一　更深的夢', reward: { pts: 2, respec: 3, cur: { socket: 1, exalt: 1 }, jewel: 'topaz_5' }, steps: [
    { text: '進入深層夢境（第 11 夜）', done: P => qc(P).entered >= DEEP_TIER, hint: '用通貨改夢境詞綴，掉落更好' },
    { text: '湊齊 4 片同一種夢魘碎片', done: P => Object.values(P.frags).some(n => n >= FRAG_NEED) || ['nm_bone', 'nm_ash', 'nm_frost'].some(b => P.bossKills[b]) },
    { text: '打倒任一隻夢魘首領', boss: true, done: P => ['nm_bone', 'nm_ash', 'nm_frost'].some(b => P.bossKills[b]), hint: '夢之門的「夢魘挑戰」' },
  ] },
  { title: '終局二　最初的守門人', reward: { pts: 3, respec: 5, cur: { exalt: 2, divine: 2 }, jewel: 'diamond_5' }, steps: [
    { text: '集齊骨、灰、冰三把鑰匙', done: P => ['bone', 'ash', 'frost'].every(k => P.keys[k] > 0) || P.bossKills.keeper },
    { text: '打倒「守門人」', boss: true, done: P => (P.bossKills.keeper || 0) > 0 },
  ] },
];

const Quest = {
  state(P) {
    if (!P.quest) P.quest = { ch: 0, done: {}, base: this.base(P) };
    return P.quest;
  },
  base(P) { return { kills: P.kills, rare: qc(P).rare, cur: qc(P).curUsed }; },
  stepDone(P, st) {
    const q = this.state(P);
    if (st.goal) return Math.max(0, st.prog(P, q.base)) >= st.goal;
    return !!st.done(P);
  },
  // 每隔一小段時間檢查進度；步驟完成、章節完成都會提示
  tick() {
    const P = G.P; if (!P || G.state !== 'play') return;
    const q = this.state(P), ch = QUESTS[q.ch];
    if (!ch) return;
    ch.steps.forEach((st, i) => {
      const key = q.ch + '_' + i;
      if (!q.done[key] && this.stepDone(P, st)) { q.done[key] = true; UI.msg(`任務完成：${st.text}`, '#9fff9f'); }
    });
    if (ch.steps.every((st, i) => q.done[q.ch + '_' + i])) {
      const r = ch.reward, got = [];
      if (r.pts) { P.bonusPts = (P.bonusPts || 0) + r.pts; got.push(`天賦點數 +${r.pts}`); }
      if (r.respec) { P.respec = (P.respec || 0) + r.respec; got.push(`重置點數 +${r.respec}`); }
      for (const k in r.cur || {}) { P.cur[k] += r.cur[k]; got.push(`${CURRENCY[k].name}×${r.cur[k]}`); }
      if (r.jewel) { P.jewels[r.jewel] = (P.jewels[r.jewel] || 0) + 1; got.push(jewelName(r.jewel)); }
      UI.msg(`★ ${ch.title} 完成！獎勵：${got.join('、')}`, '#ffd780');
      burst(G.pl.x, G.pl.y, '#ffd780', 40, 220);
      q.ch++; q.base = this.base(P);
      // 新章節可能一開始就有幾步已經達成（例如已經點過天賦）
      onBuildChanged(); saveGame();
    }
    UI.renderQuest();
  },
};
