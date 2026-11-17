// =============================================================
//  v2.8.7 終局村莊：「夢境終點的村莊」
//  ・打完主線（解鎖第 11 夜）後，第一次回營地會來到這裡；之後在夢之門的「營地傳送」也能來
//  ・比一般營地大，有商人、倉庫、技能寶石、強化鐵匠、記憶日誌，還有一路上遇過的人們搬來住
// =============================================================
HUBS.push({ id: 'village', act: 6, name: '夢境終點的村莊', tiers: [], floor: ['#4a4436', '#463f32', '#4e483a'], wall: '#1a160f', wallTop: '#7a6a48', light: '#ffe8b8',
  npcs: [
    { id: 'v_shop', panel: 'shop', name: '商人．歐莉', sprite: 'npc_olly', at: [11, 12] },
    { id: 'v_stash', panel: 'stash', name: '村莊倉庫', sprite: 'chest', at: [33, 12] },
    { id: 'v_sera', panel: 'gemshop', name: '引路人．塞拉', sprite: 'npc_sera', at: [14, 7] },
    { id: 'v_smith', panel: 'craft', name: '鐵匠．古倫', sprite: 'flv_dwarf', at: [30, 7] },
    { id: 'v_glen', panel: 'journal', name: '老獄卒．格倫', sprite: 'npc_glen', at: [33, 20], ghost: true },
  ] });
HUB_BY_ID.village = HUBS[HUBS.length - 1];
Object.assign(NPC_LINES, {
  v_shop: ['「我從牢房一路跟過來了。這裡的貨比較好喔。」', '「深層的夢會吐出好東西，記得拿回來給我看。」', '「這裡的人，都是醒不過來、又不想再睡的人。」'],
  v_stash: ['（木箱上刻滿了每個人的名字）', '（村裡的倉庫，大家共用）'],
  v_sera: ['「路走到這裡，剩下的就是你自己要不要再往下了。」', '「每一顆寶石，都是某個人沒做完的夢。」'],
  v_smith: ['「磨石給我，護貝劑也行。我幫你把東西敲得更硬。」', '「冰窟的冰太硬了，還是這裡的爐子好。」', '「+5 以上會碎，別怪我，那是夢的脾氣。」'],
  v_glen: ['「……你還記得牢房嗎？我還記得。」', '「怪物的事，問我就對了。」'],
});
if (STORY && !STORY.act6) STORY.act6 = { title: '終局　夢境終點的村莊', pages: [
  '燈塔後面，有一條沒有人走過的路。路的盡頭，是一座小小的村莊。',
  '村子裡住著你在夢裡遇過的人：歐莉、古倫、小石……他們都說，是跟著你的腳步來的。\n\n「醒來之前，先在這裡歇一下吧。」',
  '（終局：從村莊的夢之門進入深層夢境。越深的夢，掉落越好、事件越多。）'] };
// 村莊的路人
CAMP_FOLK.village = [
  { id: 'vf_kid', name: '小石', sprite: 'flv_kid', at: [18, 17], lines: ['「這裡不會下雪耶！」', '「你看到我的雪人了嗎？它也跟過來了。」'] },
  { id: 'vf_mer', name: '瑟琳', sprite: 'flv_mer', at: [8, 21], lines: ['「這裡的井，聽得到海的聲音。」', '「我在等潮水把我帶回去。」'] },
  { id: 'vf_sailor', name: '魯伯', sprite: 'flv_sailor', at: [26, 22], lines: ['「這裡的酒比驛站好喝！」', '「深層的夢裡，有一艘跟我一樣沉掉的船。」'] },
  { id: 'vf_elf', name: '艾菈', sprite: 'flv_elf', at: [36, 16], lines: ['「這座村子是長在夢的根上的。」', '「你每走深一夜，樹就多長一圈。」'] },
  { id: 'vf_gnome', name: '波波', sprite: 'flv_gnome', at: [6, 9], lines: ['「村子後面也有蘑菇！可是都不能吃。」', '「茵婆婆說她晚點也會來。」'] },
  { id: 'vf_old', name: '數星星的老人', sprite: 'flv_old', at: [22, 24], lines: ['「這裡看得到所有的星星，連少掉的那幾顆也看得到。」', '「你醒來以後，這個村子還會在嗎？」'] },
];
CAMP_FX.village = 'firefly';
// 比較大的地圖：中間廣場、四角幾間小屋（牆）
const _genTownV = genTown;
genTown = function (hubId) {
  if (hubId !== 'village') return _genTownV(hubId);
  const hub = HUB_BY_ID.village, W = 44, H = 30, grid = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) grid[y * W + x] = 1;
  for (const [hx, hy, hw, hh] of [[3, 3, 5, 3], [36, 3, 5, 3], [3, 25, 6, 2], [35, 25, 6, 2], [18, 2, 8, 2]]) for (let y = hy; y < hy + hh; y++) for (let x = hx; x < hx + hw; x++) grid[y * W + x] = 0;
  const theme = { id: 'town_village', name: hub.name, floor: hub.floor, wall: hub.wall, wallTop: hub.wallTop, light: hub.light };
  return { kind: 'town', hub: 'village', W, H, grid, theme, mlvl: 1, name: hub.name, fire: [22, 15],
    portal: { x: 22 * TS, y: 8 * TS }, spawn: { x: 22 * TS, y: 19 * TS }, retPortal: { x: 27 * TS, y: 8 * TS },
    npcs: hub.npcs.map(n => Object.assign({}, n, { x: n.at[0] * TS, y: n.at[1] * TS })) };
};
// 打完主線第一次回營地：直接到村莊
const _goTownV = goTown;
goTown = function (viaPortal) {
  const P = G.P;
  if (P && P.maxTier >= DEEP_TIER && !P.hubs.village) { P.hub = 'village'; setTimeout(() => UI.banner('夢境終點的村莊', '終局的據點：從這裡的夢之門進入深層夢境', '#ffe8b8'), 300); }
  return _goTownV(viaPortal);
};
