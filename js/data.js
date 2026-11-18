// =============================================================
//  遺忘深淵 — 遊戲資料（職業／技能／物品基底／詞綴／傳奇／怪物／首領）
//  想調數值，大多改這個檔就好。
// =============================================================

// ---------- 職業 ----------
// 職業只決定：起始屬性、天賦樹起點、起始裝備與預設技能。
// 任何職業都可以用任何技能——這就是「自由」。
const CLASSES = {
  // 主屬性：戰士、武士＝力量；盜賊、德魯伊＝敏捷；法師、召喚師＝智慧
  warrior: {
    name: '戰士', attrName: '力量', main: 'str', color: '#e05a4f', start: 'S_war',
    attr: { str: 22, dex: 12, int: 10 }, bonus: { life: 20, armour: 20 },
    skills: ['heavy', 'slam', null, null, null],
    weapon: 'sword', weaponTier: 0,
    desc: '力量區：生命、護甲、近戰、範圍傷害。站得住、打得重。',
  },
  samurai: {
    name: '武士', attrName: '力量', main: 'str', color: '#e0a040', start: 'S_sam',
    attr: { str: 22, dex: 14, int: 8 }, bonus: { aspd_inc: 5, crit_multi: 10, life: 15, armour: 15 },
    skills: ['heavy', 'swallow', null, null, null],
    weapon: 'katana', weaponTier: 0,
    desc: '力量區：太刀、暴擊、流血。空白鍵「一閃」拔刀衝刺，一刀一個。',
  },
  ranger: { // 存檔代號沿用 ranger
    name: '盜賊', attrName: '敏捷', main: 'dex', color: '#5cc45c', start: 'S_ran',
    attr: { str: 12, dex: 22, int: 10 }, bonus: { move_inc: 6, evasion: 30, poison_ch: 5 },
    skills: ['venom', 'knives', null, null, null],
    weapon: 'dagger', weaponTier: 0,
    desc: '敏捷區：匕首、飛刀、中毒、閃避與移速。拿起弓也能射箭。',
  },
  druid: { // 存檔代號沿用 druid（原本的德魯伊改成弓箭手）
    name: '弓箭手', attrName: '敏捷', main: 'dex', color: '#3fb08a', start: 'S_dru',
    attr: { str: 10, dex: 22, int: 12 }, bonus: { move_inc: 4, evasion: 20, crit_inc: 10 },
    skills: ['split', 'rapid', null, null, null],
    weapon: 'bow', weaponTier: 0,
    desc: '敏捷區：弓箭、投射物、暴擊、獵人夥伴。遠遠地把敵人射穿。',
  },
  mage: {
    name: '法師', attrName: '智慧', main: 'int', color: '#5b8cff', start: 'S_mag',
    attr: { str: 10, dex: 12, int: 22 }, bonus: { mana: 25, es: 10 },
    skills: ['fireball', 'nova', null, null, null],
    weapon: 'wand', weaponTier: 0,
    desc: '智慧區：法術、元素、能量護盾。用魔力換毀滅。',
  },
  summoner: {
    name: '召喚師', attrName: '智慧', main: 'int', color: '#a070e0', start: 'S_sum',
    attr: { str: 14, dex: 8, int: 22 }, bonus: { minion_dmg_inc: 10, minion_max: 1 },
    skills: ['skel', 'spirit', null, null, null],
    weapon: 'wand', weaponTier: 0,
    desc: '智慧區：召喚物更多更強，自己躲在後面指揮亡靈大軍。',
  },
};

// ---------- 異常狀態 ----------
// 火→點燃（持續燒傷）、冰→冰緩／冰凍（停住）、雷→感電（受到更多傷害）、毒→中毒（可疊加）、物理→流血
const AILMENTS = {
  ignite: { name: '點燃', color: '#ff8a30', from: 'fire', desc: '每秒受到該次火焰傷害 30% 的燃燒傷害，持續 3 秒（只取最強的一個）' },
  freeze: { name: '冰凍', color: '#bfefff', from: 'cold', desc: '完全停住 0.8 秒（稀有怪 0.5 秒、首領 0.25 秒）' },
  shock: { name: '感電', color: '#fff070', from: 'light', desc: '受到的所有傷害 +20%，持續 3 秒' },
  poison: { name: '中毒', color: '#70e070', from: 'chaos', desc: '每秒受到該次物理＋毒素傷害 20% 的毒傷，持續 3 秒，可以無限疊加' },
  bleed: { name: '流血', color: '#e03030', from: 'phys', desc: '每秒受到該次物理傷害 25% 的流血傷害，持續 4 秒（只取最強的一個）' },
};

// ---------- 技能（所有職業共用，lvl＝解鎖等級） ----------
// tags 決定哪些「增加傷害」會套用；eff = 傷害效用；ail = 內建異常狀態機率（%）
const SKILLS = {
  // —— 1 級 ——
  heavy: { name: '重擊', icon: '擊', color: '#e8a060', lvl: 1, tags: ['attack', 'melee'], cost: 3, eff: 1.5, speed: 1.0,
    type: 'melee', range: 64, arc: 1.9, need: 'melee', ail: { bleed: 10 },
    desc: '用武器重重劈向前方扇形範圍。10% 機率造成流血。' },
  slam: { name: '震地', icon: '震', color: '#c08040', lvl: 1, tags: ['attack', 'melee', 'area'], cost: 9, eff: 1.15, speed: 0.75,
    type: 'slam', radius: 80, need: 'melee',
    desc: '猛擊地面，對前方一圈造成範圍傷害。' },
  iai: { name: '居合斬', icon: '居', color: '#f0d090', lvl: 1, tags: ['attack', 'melee'], cost: 6, cd: 2.5, eff: 3.0, speed: 0.8,
    type: 'dash', dist: 170, need: 'melee', ail: { bleed: 35 },
    desc: '拔刀衝刺，沿路砍穿所有敵人，35% 機率造成流血。冷卻 2.5 秒（不能拿來一直位移）。' },
  venom: { name: '毒刃', icon: '毒', color: '#90e070', lvl: 1, tags: ['attack', 'melee'], cost: 3, eff: 1.0, speed: 1.4,
    type: 'melee', range: 54, arc: 1.4, need: 'melee', ail: { poison: 40 },
    desc: '快速的刺擊，40% 機率中毒（可疊加）。匕首最順手。' },
  knives: { name: '飛刀', icon: '刀', color: '#c8d0d8', lvl: 1, tags: ['attack', 'projectile'], cost: 5, eff: 0.7, speed: 1.1,
    type: 'proj', count: 3, spread: 0.22, pspeed: 650, sprite: 'arrow', ail: { bleed: 25 },
    desc: '丟出扇形的三把飛刀，不需要弓。25% 機率流血。' },
  split: { name: '分裂箭', icon: '分', color: '#9ad070', lvl: 1, tags: ['attack', 'projectile'], cost: 6, eff: 0.95, speed: 1.0,
    type: 'proj', count: 3, spread: 0.32, pspeed: 560, need: 'bow', sprite: 'arrow',
    desc: '一次射出扇形的多支箭。需要弓。' },
  rapid: { name: '穿刺射擊', icon: '穿', color: '#d0e070', lvl: 1, tags: ['attack', 'projectile'], cost: 3, eff: 1.4, speed: 1.1,
    type: 'proj', count: 1, spread: 0, pspeed: 820, pierce: 3, need: 'bow', sprite: 'arrow',
    desc: '高速的一箭，可穿透 3 個敵人。需要弓。' },
  fireball: { name: '火球術', icon: '火', color: '#ff7a30', lvl: 1, tags: ['spell', 'projectile', 'area'], elem: 'fire', cost: 7,
    base: [9, 15], crit: 6, cast: 0.75, eff: 1.0, type: 'proj', count: 1, spread: 0.2, pspeed: 430, explode: 52, sprite: 'fireball', ail: { ignite: 25 },
    desc: '擲出火球，命中後爆炸，25% 機率點燃敵人。' },
  nova: { name: '冰霜新星', icon: '冰', color: '#7fd8ff', lvl: 1, tags: ['spell', 'area'], elem: 'cold', cost: 11,
    base: [8, 12], crit: 6, cast: 0.8, eff: 0.7, type: 'nova', radius: 125, ail: { freeze: 10 },
    desc: '以自己為中心爆出冰環，冰緩敵人，10% 機率冰凍。' },
  thorn: { name: '荊棘綻放', icon: '荊', color: '#6ad06a', lvl: 1, tags: ['spell', 'area'], elem: 'chaos', cost: 9,
    base: [3, 5], crit: 5, cast: 0.7, eff: 0.3, type: 'zone', radius: 70, dur: 4, tick: 0.5, range: 380, maxZones: 3, ail: { poison: 60 },
    desc: '在滑鼠位置長出荊棘，4 秒內持續造成毒素傷害，每次 60% 機率中毒（可疊加）。最多同時 3 片。' },
  skel: { name: '召喚骷髏', icon: '骷', color: '#c8f0c8', lvl: 1, tags: ['spell', 'minion'], cost: 14,
    base: [5, 9], cast: 0.9, type: 'summon', minion: 'skel', max: 3, mlife: 55, mspeed: 190, maps: 1.3,
    desc: '召喚近戰骷髏（上限 3 隻）。召喚物傷害吃「召喚物傷害」加成。' },
  spirit: { name: '召喚靈體', icon: '靈', color: '#c8a8ff', lvl: 1, tags: ['spell', 'minion'], cost: 16,
    base: [6, 10], cast: 0.9, type: 'summon', minion: 'spirit', max: 2, mlife: 35, mspeed: 200, maps: 0.9, mranged: 260,
    desc: '召喚會從遠處發射暗影彈的靈體（上限 2 隻）。' },
  wolf: { name: '召喚靈狼', icon: '狼', color: '#a0e0a8', lvl: 1, tags: ['spell', 'minion'], cost: 14,
    base: [7, 12], cast: 0.8, type: 'summon', minion: 'wolf', max: 2, mlife: 45, mspeed: 260, maps: 1.6,
    desc: '召喚快速撲咬的靈狼（上限 2 隻）。' },
  // —— 等級解鎖 ——
  blink: { name: '閃現', icon: '閃', color: '#c090ff', lvl: 3, tags: ['spell', 'movement'], cost: 10, cd: 2.0, cast: 0.15,
    type: 'blink', dist: 230,
    desc: '瞬間移動到滑鼠方向。冷卻 2 秒。' },
  arc: { name: '電弧', icon: '電', color: '#f0f060', lvl: 6, tags: ['spell'], elem: 'light', cost: 8,
    base: [2, 26], crit: 5, cast: 0.7, eff: 0.6, type: 'chain', chains: 4, range: 280, ail: { shock: 25 },
    desc: '閃電在敵人之間連鎖跳躍 4 次，25% 機率感電。' },
  whirl: { name: '旋風斬', icon: '旋', color: '#e0c0a0', lvl: 8, tags: ['attack', 'melee', 'area'], cost: 5, eff: 0.75, speed: 1.3,
    type: 'nova', radius: 78, need: 'melee', ail: { bleed: 15 },
    desc: '原地旋轉砍擊身邊一圈的敵人，可以邊走邊轉。15% 機率流血。' },
  icespear: { name: '冰霜之矛', icon: '矛', color: '#a8e8ff', lvl: 8, tags: ['spell', 'projectile'], elem: 'cold', cost: 8,
    base: [14, 22], crit: 8, cast: 0.7, eff: 0.9, type: 'proj', count: 1, spread: 0.15, pspeed: 720, pierce: 2, sprite: 'iceshard', ail: { freeze: 15 },
    desc: '高速冰矛，穿透 2 個敵人，暴擊率高，15% 機率冰凍。' },
  explarrow: { name: '爆裂箭', icon: '爆', color: '#ffa060', lvl: 10, tags: ['attack', 'projectile', 'area'], cost: 8, eff: 1.15, speed: 0.9,
    type: 'proj', count: 1, spread: 0.2, pspeed: 600, explode: 60, need: 'bow', sprite: 'arrow', ail: { ignite: 20 },
    desc: '箭矢命中後爆炸，20% 機率點燃。需要弓。' },
  warcry: { name: '戰吼', icon: '吼', color: '#ff6050', lvl: 12, tags: ['buff'], cost: 12, cd: 10, cast: 0.3,
    type: 'buff', radius: 180, dur: 6,
    desc: '怒吼震退身邊的敵人，6 秒內攻擊與施法速度 +25%。冷卻 10 秒。' },
  rain: { name: '毒雨箭', icon: '雨', color: '#90d060', lvl: 14, tags: ['attack', 'projectile', 'area'], cost: 10, eff: 0.62, speed: 0.8,
    type: 'rain', radius: 85, volleys: 3, range: 420, need: 'bow', ail: { poison: 30 },
    desc: '向滑鼠位置射出三波箭雨，每波 30% 機率中毒。需要弓。' },
  meteor: { name: '隕石術', icon: '隕', color: '#ff5030', lvl: 16, tags: ['spell', 'area'], elem: 'fire', cost: 18, cd: 2,
    base: [40, 60], crit: 6, cast: 1.1, eff: 1.2, type: 'delayed', radius: 95, delay: 0.7, range: 420, ail: { ignite: 50 },
    desc: '召喚隕石砸向滑鼠位置（0.7 秒後落下），巨大範圍火焰傷害，50% 機率點燃。冷卻 2 秒。' },
  golem: { name: '召喚石魔像', icon: '像', color: '#b0a890', lvl: 18, tags: ['spell', 'minion'], cost: 25, cd: 5,
    base: [22, 34], cast: 1.2, type: 'summon', minion: 'golem', max: 1, mlife: 260, mspeed: 140, maps: 0.8, taunt: true,
    desc: '召喚巨大的石魔像（上限 1 隻），血很厚，怪物會優先攻擊它。冷卻 5 秒。' },
  blizzard: { name: '暴風雪', icon: '雪', color: '#d0f0ff', lvl: 22, tags: ['spell', 'area'], elem: 'cold', cost: 16,
    base: [7, 11], crit: 5, cast: 0.9, eff: 0.4, type: 'zone', radius: 110, dur: 4, tick: 0.4, range: 420, maxZones: 2, ail: { freeze: 5 },
    desc: '在滑鼠位置降下暴風雪，持續 4 秒，冰緩並有機會冰凍。最多同時 2 片。' },
  storm: { name: '天雷審判', icon: '雷', color: '#fff080', lvl: 28, tags: ['spell', 'area'], elem: 'light', cost: 22, cd: 4,
    base: [8, 33], crit: 6, cast: 1.0, eff: 0.6, type: 'storm', radius: 200, strikes: 6, range: 420, ail: { shock: 40 },
    desc: '在滑鼠附近連續落下 6 道天雷，各自打一隻敵人，40% 機率感電。冷卻 4 秒。' },
  fissure: { name: '裂地斬', icon: '裂', color: '#d08050', lvl: 32, tags: ['attack', 'melee', 'area'], cost: 16, cd: 3, eff: 3.4, speed: 0.55,
    type: 'slam', radius: 135, need: 'melee', ail: { bleed: 30 },
    desc: '全力劈開大地，超大範圍重擊，30% 機率流血。冷卻 3 秒。' },
};

// ---------- 技能的屬性需求（不分職業，屬性夠就能用） ----------
// 單一屬性：12 ＋ 解鎖等級 × 2；兩種屬性：各 8 ＋ 解鎖等級 × 1.4
const SKILL_ATTR = {
  heavy: ['str'], slam: ['str'], whirl: ['str', 'dex'], warcry: ['str'], fissure: ['str'], iai: ['str', 'dex'],
  split: ['dex'], rapid: ['dex'], venom: ['dex'], knives: ['dex'], explarrow: ['dex'], rain: ['dex'], blink: ['dex', 'int'],
  fireball: ['int'], nova: ['int'], arc: ['int'], icespear: ['int'], meteor: ['int'], blizzard: ['int'], storm: ['int'],
  thorn: ['int', 'dex'], skel: ['int'], spirit: ['int'], wolf: ['dex', 'int'], golem: ['str', 'int'],
};
for (const sid in SKILLS) {
  const sk = SKILLS[sid], at = SKILL_ATTR[sid] || ['int'];
  sk.req = {};
  for (const a of at) sk.req[a] = at.length === 1 ? Math.round(12 + sk.lvl * 2) : Math.round(8 + sk.lvl * 1.4);
}

// ---------- 技能寶石（v1.3）----------
// 開局只有「自己職業」的技能寶石（等級到了自動會用）；其他職業的技能要打怪掉落技能寶石，
// 或全章節通關後，向夢醒之牢的「引路人．塞拉」購買。屬性需求照舊：屬性不夠還是不能用。
const CLASS_GEMS = {
  warrior: ['heavy', 'slam', 'whirl', 'warcry', 'fissure'],
  samurai: ['iai', 'heavy', 'whirl', 'warcry', 'fissure'],
  ranger: ['venom', 'knives', 'blink', 'whirl'],
  druid: ['split', 'rapid', 'explarrow', 'rain', 'blink'],
  mage: ['fireball', 'nova', 'arc', 'icespear', 'meteor', 'blizzard', 'storm'],
  summoner: ['skel', 'spirit', 'wolf', 'golem', 'thorn'],
};
const hasSkillGem = (P, sid) => !!(P && ((CLASS_GEMS[P.cls] || []).includes(sid) || (P.skillGems && P.skillGems[sid]) || (typeof G !== 'undefined' && G.stash && G.stash.skillGems && G.stash.skillGems[sid])));   // v2.16.3 倉庫裡（全帳號）會的技能寶石也算
const skillGemPrice = sid => ({ chaos: Math.max(1, Math.ceil(SKILLS[sid].lvl / 10)) }); // 塞拉的價格：等級越高越貴

// ---------- 輔助寶石（v2.17 整理：只換數字的併成「威力／速度／暴擊」，全部約 25 顆；被併掉的舊代號見 gems4.js 的 SUP_MERGE） ----------
// req：技能只要有其中一個標籤就能用；excl：技能有這些標籤就不能用
// cost：插上去後這個技能耗魔變成幾倍（多顆相乘）；mods 裡 more_ 開頭是「傷害變成幾倍」（+30 ＝ 1.3 倍，−25 ＝ 0.75 倍）
// desc：第一行一句人話，<br> 後面才放數字
const DMG_EXCL = ['movement', 'minion', 'curse', 'buff', 'aura', 'control'];
const SUPPORTS = {
  // —— 純數字：三顆就夠 ——
  power: { name: '威力', color: '#e05a4f', req: ['attack', 'spell'], excl: DMG_EXCL, cost: 1.4, mods: { more_dmg: 30 },
    desc: '這個技能打得更痛。<br>傷害變成 1.3 倍（中毒、流血、點燃也跟著變痛）。' },
  speed: { name: '速度', color: '#5cc45c', req: ['attack', 'spell'], excl: ['movement', 'aura'], cost: 1.25, mods: { aspd_inc: 30, cspd_inc: 30 },
    desc: '這個技能出手更快。<br>攻擊速度、施法速度 +30%。' },
  crit: { name: '暴擊', color: '#5b8cff', req: ['attack', 'spell'], excl: DMG_EXCL, cost: 1.35, mods: { crit_inc: 100, crit_multi: 30 },
    desc: '更容易打出暴擊，暴擊也更痛。<br>暴擊率 +100%（例如 5% 變 10%），暴擊傷害 +30%。' },
  // —— 投射物 ——
  gmp: { name: '多重投射', color: '#5cc45c', req: ['projectile'], cost: 1.5, exclType: ['rain'], mods: { proj_count: 2, more_dmg: -25 },
    desc: '多射兩支，每支弱一點。<br>投射物 +2，每支傷害變成 0.75 倍。同一次射出的多支打到同一隻怪，第 2 支起只算 35%（清怪強、打王普通）。' },
  pierce: { name: '穿透', color: '#5cc45c', req: ['projectile'], cost: 1.25, exclType: ['rain'], mods: { pierce: 3, more_dmg: 10 },
    desc: '投射物打穿敵人，繼續往後飛。<br>多穿過 3 個敵人，傷害變成 1.1 倍。' },
  // —— 範圍 ——
  aoe: { name: '範圍擴大', color: '#5b8cff', req: ['area'], cost: 1.4, mods: { area_inc: 50 },
    desc: '技能的圈圈變大。<br>範圍 +50%。' },
  conc: { name: '集中效應', color: '#5b8cff', req: ['area'], excl: DMG_EXCL, cost: 1.5, mods: { area_inc: -30, more_area: 45 },
    desc: '圈圈變小，但打得更痛。<br>範圍 −30%，範圍傷害變成 1.45 倍。' },
  // —— 改變打法 ——
  hypo: { name: '寒霜轉化', color: '#5cc45c', req: ['attack'], excl: DMG_EXCL, cost: 1.25, mods: { conv_cold: 60 },
    desc: '武器打出去變成冰，打中的怪會變慢。<br>60% 物理傷害變成冰冷傷害（吃冰冷和元素加成）。' },
  echo: { name: '法術回響', color: '#5b8cff', req: ['spell'], excl: DMG_EXCL, cost: 1.6, mods: { echo: true, more_dmg: -30 },
    desc: '法術自動再放一次。<br>第二次不耗魔；每一次傷害變成 0.7 倍（兩次加起來約 1.4 倍）。' },
  leech: { name: '生命偷取', color: '#e05a4f', req: ['attack', 'spell'], excl: DMG_EXCL, cost: 1.2, mods: { leech: 3 },
    desc: '打中敵人時回血。<br>打出傷害的 3% 變成生命（每一下最多回 8% 最大生命）。' },
  // —— 召喚物 ——
  mdmg: { name: '召喚物強化', color: '#5b8cff', req: ['minion'], cost: 1.4, mods: { more_minion: 40, more_minion_life: 30 },
    desc: '召喚物更會打、更耐打。<br>召喚物傷害變成 1.4 倍，生命變成 1.3 倍。' },
  army: { name: '骷髏大軍', color: '#5b8cff', req: ['minion'], cost: 1.6, mods: { minion_max: 2, more_minion: -15 },
    desc: '多召喚兩隻，每隻弱一點。<br>召喚上限 +2，召喚物傷害變成 0.85 倍。' },
  // —— 異常狀態 ——
  burn: { name: '燃燒', color: '#e05a4f', req: ['attack', 'spell'], excl: DMG_EXCL, cost: 1.35, mods: { ignite_ch: 40, more_dot: 20 },
    desc: '更容易把敵人點燃，燒得更久更痛。<br>點燃機率 +40%（要有火焰傷害），持續傷害變成 1.2 倍。' },
  venom: { name: '毒蛇之牙', color: '#5cc45c', req: ['attack', 'spell'], excl: DMG_EXCL, cost: 1.3, mods: { poison_ch: 50, more_dot: 10 },
    desc: '更容易讓敵人中毒，毒可以一直疊。<br>中毒機率 +50%（要有物理或毒素傷害），持續傷害變成 1.1 倍。' },
  rend: { name: '撕裂', color: '#e05a4f', req: ['attack'], excl: DMG_EXCL, cost: 1.35, mods: { bleed_ch: 50, more_dot: 15 },
    desc: '更容易讓敵人流血。<br>流血機率 +50%（要有物理傷害），持續傷害變成 1.15 倍。' },
  frostbite: { name: '冰封', color: '#5b8cff', req: ['attack', 'spell'], excl: DMG_EXCL, cost: 1.25, mods: { freeze_ch: 25, more_ele: 10 },
    desc: '更容易把敵人凍住不動。<br>冰凍機率 +25%（要有冰冷傷害），元素傷害變成 1.1 倍。' },
  static: { name: '感電', color: '#5b8cff', req: ['attack', 'spell'], excl: DMG_EXCL, cost: 1.25, mods: { shock_ch: 40, more_ele: 10 },
    desc: '更容易讓敵人感電，感電的怪會受到更多傷害。<br>感電機率 +40%（要有閃電傷害），元素傷害變成 1.1 倍。' },
};
// 連結孔數量：依角色等級解鎖
const LINK_LEVELS = [1, 6, 15, 28];
function linkSlots(lvl) { return LINK_LEVELS.filter(l => lvl >= l).length; }
function supportFits(id, sid) {
  if (!id || !sid || !SUPPORTS[id] || !SKILLS[sid]) return false;
  const sp = SUPPORTS[id], tags = SKILLS[sid].tags;
  return sp.req.some(t => tags.includes(t)) && !(sp.excl || []).some(t => tags.includes(t));
}
// 耗魔說明（白話）：插上去之後這個技能耗魔變成幾倍
const manaEffTxt = c => `這個技能耗魔變成 ${+c.toFixed(2)} 倍`;

// 各職業開局送的輔助寶石（第一顆自動插在左鍵技能上）
const STARTER_SUPPORTS = { warrior: ['power', 'aoe'], ranger: ['venom', 'gmp'], mage: ['echo', 'power'],
  samurai: ['crit', 'rend'], druid: ['gmp', 'speed'], summoner: ['army', 'mdmg'] };

// ---------- 物品基底 ----------
// cls：物品類別；slot：裝備欄；def：防禦類型 ar=護甲 ev=閃避 es=能量護盾
const DEF_NAME = { ar: '護甲', ev: '閃避', es: '能量護盾' };
const BASES = [];
function B(o) { BASES.push(o); return o; }

// ---------- 基底階級與地圖等級 ----------
// 五階基底：初階、中階、高階、夢鑄、深淵。地圖等級到了才會開始掉那一階，越高階掉落機率越低
const BASE_TIER_NAME = ['初階', '中階', '高階', '夢鑄', '深淵', '原初'];
const BASE_TIER_LVL = [1, 10, 22, 36, 50, 68];          // 各階的裝備需求等級（v2.2：原本是 1／10／22／55／68，22–55 級之間沒有新武器，攻擊系中期傷害停滯）
const BASE_TIER_UNLOCK = [1, 2, 3, 4, 5];           // 從第幾級地圖開始掉
const BASE_TIER_WEIGHT = [10, 6, 3.5, 1.6, 0.7, 0.35];
// v2.5.4 每一階「開始會掉」的物品等級（＝怪物等級）。原初是特殊基底：防具、副手 82、武器 83，
//   只有 EndGame（地圖等級 80）的黃色精英（82）或首領（83）才掉得出來
const BASE_TIER_DROP = [1, 10, 22, 36, 50, 82];
const baseDropLvl = b => b.tier === 5 && b.slot === 'weapon' ? 83 : (BASE_TIER_DROP[b.tier] ?? b.lvl);    // 掉落權重（越高階越少）
// 地圖等級：第 1–2 夜＝1、3–4＝2、5–6＝3、7–8＝4、9–15＝5、16 以上＝6（v2.2：第 9 夜就開始掉深淵基底）
function mapGrade(tier) { return tier >= 16 ? 6 : tier >= 9 ? 5 : tier >= 7 ? 4 : tier >= 5 ? 3 : tier >= 3 ? 2 : 1; }

// 武器（五階：物理傷害下限、上限、每秒攻擊次數）
[
  ['sword', '單手劍', 1, [['生鏽短劍', 4, 9, 1.45], ['闊劍', 9, 19, 1.45], ['君王之劍', 16, 34, 1.5], ['夢鑄長劍', 30, 58, 1.5], ['深淵之刃', 40, 76, 1.55], ['原初之刃', 48, 92, 1.55]], 5, { str: 1, dex: 1 }, null],
  ['axe', '雙手斧', 2, [['伐木斧', 7, 16, 1.2], ['戰斧', 15, 33, 1.2], ['處刑者巨斧', 27, 58, 1.25], ['夢鑄巨斧', 48, 100, 1.25], ['深淵斬首斧', 64, 134, 1.3], ['原初戰斧', 77, 160, 1.3]], 5, { str: 1 }, null],
  ['bow', '弓', 2, [['短弓', 5, 12, 1.5], ['長弓', 10, 26, 1.4], ['複合弓', 19, 44, 1.45], ['夢鑄長弓', 35, 76, 1.45], ['深淵獵弓', 47, 102, 1.5], ['原初長弓', 57, 122, 1.5]], 6, { dex: 1 }, null],
  ['wand', '魔杖', 1, [['木魔杖', 3, 7, 1.4], ['骨魔杖', 5, 12, 1.4], ['水晶魔杖', 9, 20, 1.45], ['夢鑄魔杖', 16, 34, 1.45], ['深淵魔杖', 21, 45, 1.5], ['原初魔杖', 25, 54, 1.5]], 7, { int: 1 }, 'spell_inc'],
  ['staff', '法杖', 2, [['樹枝法杖', 6, 12, 1.15], ['符文法杖', 11, 23, 1.15], ['星辰法杖', 19, 40, 1.2], ['夢鑄法杖', 34, 70, 1.2], ['深淵法杖', 46, 94, 1.25], ['原初法杖', 55, 113, 1.25]], 7, { int: 1 }, 'spell_inc'],
  ['katana', '太刀', 2, [['木刀', 6, 13, 1.45], ['打刀', 12, 26, 1.45], ['名刀', 22, 46, 1.5], ['夢鑄太刀', 38, 80, 1.5], ['深淵太刀', 52, 106, 1.55], ['原初太刀', 62, 127, 1.55]], 7.5, { str: 1, dex: 1 }, null],
  ['dagger', '匕首', 1, [['生鏽匕首', 3, 8, 1.6], ['淬毒短刃', 6, 15, 1.6], ['暗影之牙', 11, 27, 1.65], ['夢鑄匕首', 20, 46, 1.65], ['深淵毒牙', 28, 60, 1.7], ['原初毒牙', 34, 72, 1.7]], 7, { dex: 1, int: 1 }, 'poison_ch'],
].forEach(([cls, clsName, hands, tiers, crit, reqAttr, implicitStat]) => {
  tiers.forEach(([name, pmin, pmax, aps], t) => {
    const lvl = BASE_TIER_LVL[t], imp = [];
    if (implicitStat === 'poison_ch') imp.push({ stat: implicitStat, v: [10, 15, 20, 25, 30, 35][t] });
    else if (implicitStat) imp.push({ stat: implicitStat, v: [12, 18, 24, 30, 36, 42][t] * (cls === 'staff' ? 1.5 : 1) });
    B({ id: `${cls}${t}`, cls, clsName, slot: 'weapon', hands, name, lvl, tier: t, phys: [pmin, pmax], aps, crit,
      req: reqOf(reqAttr, lvl), implicit: imp });
  });
});

// 副手
[['shield', '盾牌', 'ar', ['木盾', '鐵塔盾', '龍鱗盾', '夢鑄塔盾', '深淵壁壘', '原初壁壘']],
 ['quiver', '箭袋', null, ['獸皮箭袋', '銳利箭袋', '獵王箭袋', '夢鑄箭袋', '深淵箭袋', '原初箭袋']],
 ['focus', '法器', 'es', ['符文書', '秘術水晶', '星界寶珠', '夢鑄寶珠', '深淵之眼', '原初之眼']],
].forEach(([cls, clsName, def, names]) => {
  names.forEach((name, t) => {
    const lvl = BASE_TIER_LVL[t], imp = [];
    if (cls === 'shield') imp.push({ stat: 'block', v: [18, 22, 26, 28, 30, 32][t] });
    if (cls === 'quiver') imp.push({ stat: 'a_phys', v: [[1, 3], [3, 6], [5, 10], [8, 14], [11, 19], [14, 23]][t] });
    if (cls === 'focus') imp.push({ stat: 'spell_inc', v: [8, 12, 16, 20, 24, 28][t] });
    B({ id: `${cls}${t}`, cls, clsName, slot: 'offhand', name, lvl, tier: t, def,
      defv: def === 'ar' ? [14, 45, 100, 190, 260, 310][t] : def === 'es' ? [8, 16, 30, 52, 70, 84][t] : 0,
      req: reqOf(cls === 'shield' ? { str: 1 } : cls === 'quiver' ? { dex: 1 } : { int: 1 }, lvl), implicit: imp });
  });
});

// 防具：每個部位 × 三種防禦 × 五階
const ARMOUR_NAMES = {
  helmet: { clsName: '頭盔', mult: 1.0, ar: ['鐵盔', '鋼鐵戰盔', '王者戰盔', '夢鑄戰盔', '深淵頭盔'], ev: ['皮帽', '遊俠兜帽', '影獵者面具', '夢鑄面具', '深淵兜帽'], es: ['布冠', '秘術頭環', '星紋頭冠', '夢鑄冠冕', '深淵之冠'] },
  body: { clsName: '胸甲', mult: 2.2, ar: ['鐵甲', '鋼鐵胸甲', '巨人板甲', '夢鑄重甲', '深淵板甲'], ev: ['皮甲', '獵人背心', '暗影外衣', '夢鑄皮甲', '深淵影衣'], es: ['簡樸長袍', '秘術法袍', '星紋法衣', '夢鑄法袍', '深淵星袍'] },
  gloves: { clsName: '手套', mult: 0.7, ar: ['鐵手套', '鋼鐵護手', '巨人之握', '夢鑄護手', '深淵之握'], ev: ['皮手套', '獵手護腕', '影刃手套', '夢鑄手套', '深淵影手'], es: ['絲綢手套', '法師手套', '秘銀手套', '夢鑄絲手套', '深淵符手'] },
  boots: { clsName: '鞋子', mult: 0.7, ar: ['鐵靴', '鋼鐵脛甲', '巨人戰靴', '夢鑄戰靴', '深淵脛甲'], ev: ['皮靴', '獵人長靴', '影步靴', '夢鑄長靴', '深淵影靴'], es: ['絲綢便鞋', '秘術之靴', '星辰之履', '夢鑄便鞋', '深淵星履'] },
};
const ARMOUR_LVLS = BASE_TIER_LVL;
const DEF_BASE = { ar: [16, 48, 100, 190, 260, 310], ev: [16, 48, 100, 190, 260, 310], es: [6, 14, 26, 46, 62, 74] };
for (const cls in ARMOUR_NAMES) for (const def of ['ar', 'ev', 'es']) ARMOUR_NAMES[cls][def].push({ ar: '原初鐵', ev: '原初影', es: '原初星' }[def] + ARMOUR_NAMES[cls].clsName);
for (const cls in ARMOUR_NAMES) {
  const info = ARMOUR_NAMES[cls];
  for (const def of ['ar', 'ev', 'es']) {
    info[def].forEach((name, t) => {
      const lvl = ARMOUR_LVLS[t] + (cls === 'body' ? 1 : 0);
      B({ id: `${cls}_${def}${t}`, cls, clsName: info.clsName, slot: cls, name, lvl, tier: t, def,
        defv: Math.round(DEF_BASE[def][t] * info.mult),
        req: reqOf(def === 'ar' ? { str: 1 } : def === 'ev' ? { dex: 1 } : { int: 1 }, lvl), implicit: [] });
    });
  }
}

// 飾品
[
  ['amulet', '項鍊', 'amulet', [['珊瑚項鍊', 1, 'life', 15], ['琥珀項鍊', 5, 'str', 15], ['翡翠項鍊', 5, 'dex', 15], ['青玉項鍊', 5, 'int', 15], ['黃金項鍊', 20, 'res_all', 6]]],
  ['ring', '戒指', 'ring', [['鐵戒指', 1, 'a_phys', [1, 4]], ['紅寶石戒指', 4, 'res_fire', 20], ['藍寶石戒指', 4, 'res_cold', 20], ['黃玉戒指', 4, 'res_light', 20], ['紫晶戒指', 18, 'es', 15]]],
  ['belt', '腰帶', 'belt', [['皮腰帶', 1, 'life', 20], ['重革腰帶', 8, 'str', 20], ['鍊甲腰帶', 18, 'es', 18]]],
].forEach(([cls, clsName, slot, list]) => {
  list.forEach(([name, lvl, stat, v], i) => {
    B({ id: `${cls}${i}`, cls, clsName, slot, name, lvl, tier: 0, req: {}, implicit: [{ stat, v }] });
  });
});

function reqOf(attr, lvl) {
  const r = {};
  const n = Object.keys(attr).length;
  const amount = Math.round((8 + lvl * 2.0) / n);   // v2.2：2.4 → 2.0
  for (const k in attr) r[k] = lvl <= 1 ? 0 : amount;
  r.lvl = lvl;
  return r;
}
const BASE_BY_ID = {};
BASES.forEach(b => BASE_BY_ID[b.id] = b);

// ---------- 詞綴 ----------
// type p=前綴 s=後綴；tiers: [物品等級, 最小, 最大]；雙值為 [物品等級, a1, a2, b1, b2]
const W_ATK = ['sword', 'axe', 'bow', 'katana', 'dagger'];
const W_CAST = ['wand', 'staff'];
const ARM = ['helmet', 'body', 'gloves', 'boots'];
const AFFIXES = [];
function A(id, type, stat, names, tiers, classes, opt = {}) {
  AFFIXES.push(Object.assign({ id, type, stat, names, tiers, classes }, opt));
}
// --- 前綴 ---
A('life', 'p', 'life', ['健壯的', '強健的', '旺盛的', '不朽的'], [[1, 10, 19], [12, 20, 34], [25, 35, 54], [40, 55, 79]], [...ARM, 'shield', 'belt', 'ring', 'amulet']);
A('mana', 'p', 'mana', ['蔚藍的', '湛藍的', '深海的', '天穹的'], [[1, 10, 19], [12, 20, 34], [25, 35, 54], [40, 55, 74]], ['ring', 'amulet', 'helmet', 'gloves', 'wand', 'staff', 'focus']);
A('es', 'p', 'es', ['閃光的', '光輝的', '星光的'], [[1, 5, 10], [15, 11, 20], [30, 21, 35]], ['amulet', 'ring', 'belt']);
A('def_flat', 'p', 'def_flat', ['加固的', '堅實的', '精鍛的', '神工的'], [[1, 5, 12], [12, 13, 30], [25, 31, 60], [40, 61, 100]], [...ARM, 'shield', 'focus'], { local: true });
A('def_inc', 'p', 'def_inc', ['堅固的', '強化的', '無畏的', '不破的'], [[1, 15, 25], [12, 26, 42], [25, 43, 64], [40, 65, 100]], [...ARM, 'shield', 'focus'], { local: true });
A('l_phys_inc', 'p', 'l_phys_inc', ['沉重的', '兇殘的', '殘暴的', '屠戮的'], [[1, 20, 34], [12, 35, 59], [25, 60, 84], [40, 85, 119]], W_ATK, { local: true });
A('l_phys_add', 'p', 'l_phys_add', ['銳利的', '鋒利的', '致命的', '斷魂的'], [[1, 1, 2, 3, 5], [12, 3, 6, 8, 12], [25, 6, 10, 14, 20], [40, 10, 15, 22, 32]], W_ATK, { local: true, twoHandMult: 1.6 });
A('a_fire', 'p', 'a_fire', ['熾熱的', '燃燒的', '烈焰的', '煉獄的'], [[1, 1, 2, 3, 5], [12, 3, 6, 8, 12], [25, 6, 10, 14, 20], [40, 10, 15, 22, 32]], [...W_ATK, 'ring', 'gloves', 'quiver'], { nonWeaponMult: 0.6, twoHandMult: 1.6 });
A('a_cold', 'p', 'a_cold', ['冰冷的', '霜凍的', '冰封的', '極寒的'], [[1, 1, 2, 3, 5], [12, 3, 6, 8, 12], [25, 6, 10, 14, 20], [40, 10, 15, 22, 32]], [...W_ATK, 'ring', 'gloves', 'quiver'], { nonWeaponMult: 0.6, twoHandMult: 1.6 });
A('a_light', 'p', 'a_light', ['閃電的', '雷擊的', '雷暴的', '天雷的'], [[1, 1, 1, 4, 8], [12, 1, 3, 12, 20], [25, 2, 4, 22, 34], [40, 3, 6, 35, 55]], [...W_ATK, 'ring', 'gloves', 'quiver'], { nonWeaponMult: 0.6, twoHandMult: 1.6 });
A('spell_inc', 'p', 'spell_inc', ['學徒的', '術士的', '秘法的', '大法師的'], [[1, 10, 19], [12, 20, 29], [25, 30, 39], [40, 40, 54]], ['wand', 'staff', 'focus', 'amulet'], { twoHandMult: 1.5 });
A('s_fire', 'p', 's_fire', ['火花的', '焚燒的', '爆炎的', '太陽的'], [[1, 1, 2, 3, 5], [12, 3, 6, 8, 12], [25, 5, 9, 12, 18], [40, 8, 13, 18, 26]], ['wand', 'staff', 'amulet'], { twoHandMult: 1.5 });
A('s_cold', 'p', 's_cold', ['霜語的', '冰晶的', '寒霧的', '永凍的'], [[1, 1, 2, 3, 5], [12, 3, 6, 8, 12], [25, 5, 9, 12, 18], [40, 8, 13, 18, 26]], ['wand', 'staff', 'amulet'], { twoHandMult: 1.5 });
A('s_light', 'p', 's_light', ['電光的', '雷鳴的', '風暴的', '天罰的'], [[1, 1, 1, 3, 7], [12, 1, 2, 9, 16], [25, 1, 3, 17, 28], [40, 2, 5, 28, 42]], ['wand', 'staff', 'amulet'], { twoHandMult: 1.5 });
A('ele_inc', 'p', 'ele_inc', ['元素的', '稜鏡的', '混元的'], [[1, 8, 12], [15, 13, 18], [30, 19, 25]], ['amulet', 'ring', 'wand', 'staff', 'gloves']);
A('move_inc', 'p', 'move_inc', ['跑者的', '疾行的', '迅捷的', '疾風的'], [[1, 10, 10], [10, 15, 15], [22, 20, 20], [36, 25, 25]], ['boots']);
A('minion_dmg_inc', 'p', 'minion_dmg_inc', ['召喚師的', '死靈的', '亡魂主宰的'], [[1, 10, 19], [15, 20, 29], [30, 30, 39]], ['wand', 'staff', 'focus', 'helmet', 'amulet']);
A('a_chaos', 'p', 'a_chaos', ['毒液的', '劇毒的', '瘟疫的'], [[5, 1, 3, 4, 7], [18, 4, 7, 10, 15], [32, 7, 11, 17, 25]], [...W_ATK, 'ring', 'gloves', 'quiver'], { nonWeaponMult: 0.6, twoHandMult: 1.6 });
A('chaos_inc', 'p', 'chaos_inc', ['腐敗的', '凋零的', '瘟疫之主的'], [[5, 10, 16], [18, 17, 24], [32, 25, 34]], ['dagger', 'wand', 'staff', 'amulet', 'ring']);
// --- 後綴 ---
const RES_SLOTS = [...ARM, 'amulet', 'ring', 'belt', 'shield', 'quiver', 'focus'];
const RES_T = [[1, 6, 11], [10, 12, 17], [20, 18, 23], [30, 24, 29], [40, 30, 35]];
A('res_fire', 's', 'res_fire', ['之暖意', '之火焰', '之烈火', '之熔岩', '之焰心'], RES_T, RES_SLOTS);
A('res_cold', 's', 'res_cold', ['之寒冬', '之冰霜', '之冰雪', '之冰川', '之永冬'], RES_T, RES_SLOTS);
A('res_light', 's', 'res_light', ['之靜電', '之閃電', '之雷電', '之雷暴', '之雷神'], RES_T, RES_SLOTS);
A('res_all', 's', 'res_all', ['之稜鏡', '之虹彩', '之萬象'], [[5, 3, 5], [15, 6, 9], [30, 10, 14]], ['amulet', 'ring']);
// 抵抗魔法攻擊（法術、毒素）
A('res_chaos', 's', 'res_chaos', ['之解毒', '之淨化', '之免疫'], [[8, 5, 9], [20, 10, 15], [35, 16, 22]], RES_SLOTS);
A('spell_supp', 's', 'spell_supp', ['之護符', '之結界', '之聖域'], [[5, 6, 10], [18, 11, 16], [32, 17, 22]], [...ARM, 'shield', 'focus']);
A('spell_block', 's', 'spell_block', ['之咒盾', '之禁咒'], [[8, 4, 6], [24, 7, 10]], ['shield', 'focus']);
const ATTR_T = [[1, 8, 12], [10, 13, 17], [20, 18, 22], [30, 23, 27], [40, 28, 32]];
const ATTR_SLOTS = [...ARM, 'amulet', 'ring', 'belt', 'shield', 'quiver', 'focus', ...W_ATK, 'wand', 'staff'];
A('str', 's', 'str', ['之力', '之蠻力', '之巨人', '之泰坦', '之神力'], ATTR_T, ATTR_SLOTS);
A('dex', 's', 'dex', ['之敏', '之靈巧', '之山貓', '之猞猁', '之疾影'], ATTR_T, ATTR_SLOTS);
A('int', 's', 'int', ['之智', '之學識', '之賢者', '之先知', '之神諭'], ATTR_T, ATTR_SLOTS);
A('l_aspd', 's', 'l_aspd', ['之技巧', '之熟練', '之大師', '之名家'], [[1, 5, 7], [12, 8, 10], [25, 11, 13], [40, 14, 16]], W_ATK, { local: true });
A('aspd_inc', 's', 'aspd_inc', ['之敏捷', '之迅速', '之疾速'], [[5, 4, 6], [20, 7, 9], [35, 10, 12]], ['gloves', 'quiver', 'ring']);
A('cspd_inc', 's', 'cspd_inc', ['之話語', '之詠唱', '之咒語', '之真言'], [[1, 7, 10], [15, 11, 14], [30, 15, 18], [45, 19, 22]], ['wand', 'staff', 'amulet', 'focus', 'ring'], { twoHandMult: 1.5 });
A('crit_inc', 's', 'crit_inc', ['之針', '之刺', '之穿心', '之毀滅'], [[1, 10, 14], [12, 15, 19], [25, 20, 24], [40, 25, 29]], [...W_ATK, 'wand', 'staff', 'amulet', 'quiver', 'focus']);
A('crit_multi', 's', 'crit_multi', ['之痛楚', '之劇痛', '之狂暴', '之屠殺'], [[5, 10, 14], [15, 15, 19], [30, 20, 24], [45, 25, 29]], [...W_ATK, 'wand', 'staff', 'amulet', 'quiver', 'gloves']);
A('life_regen', 's', 'life_regen', ['之更新', '之恢復', '之再生'], [[1, 0.3, 0.5], [15, 0.6, 0.9], [30, 1.0, 1.4]], ['amulet', 'ring', 'belt', 'body', 'helmet'], { decimal: true });
A('leech', 's', 'leech', ['之吸血鬼', '之血之君主'], [[8, 0.3, 0.6], [25, 0.7, 1.0]], [...W_ATK, 'ring', 'gloves', 'amulet'], { decimal: true });
A('life_on_kill', 's', 'life_on_kill', ['之饗宴', '之盛宴', '之吞噬'], [[1, 3, 6], [15, 7, 12], [30, 13, 20]], [...W_ATK, 'wand', 'staff', 'gloves']);
// 異常狀態相關
const AIL_SLOTS = [...W_ATK, 'wand', 'staff', 'gloves', 'ring', 'amulet', 'quiver', 'focus'];
A('ignite_ch', 's', 'ignite_ch', ['之火種', '之焚身'], [[3, 5, 9], [20, 10, 15]], AIL_SLOTS);
A('freeze_ch', 's', 'freeze_ch', ['之凍結', '之冰封'], [[3, 4, 7], [20, 8, 12]], AIL_SLOTS);
A('shock_ch', 's', 'shock_ch', ['之麻痺', '之雷殛'], [[3, 5, 9], [20, 10, 15]], AIL_SLOTS);
A('poison_ch', 's', 'poison_ch', ['之毒蛇', '之毒王'], [[3, 6, 10], [20, 11, 18]], AIL_SLOTS);
A('bleed_ch', 's', 'bleed_ch', ['之撕裂', '之放血'], [[3, 6, 10], [20, 11, 18]], [...W_ATK, 'gloves', 'ring', 'amulet', 'quiver']);
A('dot_inc', 's', 'dot_inc', ['之折磨', '之凋零', '之腐蝕'], [[5, 8, 12], [18, 13, 18], [32, 19, 25]], [...W_ATK, 'wand', 'staff', 'gloves', 'amulet', 'belt']);
// v1.2：回復速度與偷取
A('life_regen_inc', 's', 'life_regen_inc', ['之活力', '之生機', '之不息'], [[1, 10, 19], [15, 20, 34], [30, 35, 50]], ['amulet', 'ring', 'belt', 'body', 'helmet', 'boots', 'shield']);
// v1.4：冷卻回復速度（中後期才會出現；全身加起來最多 40%）
A('cdr', 's', 'cdr', ['之迅思', '之疾風', '之時光'], [[20, 5, 8], [40, 9, 12], [60, 13, 16]], ['amulet', 'ring', 'helmet', 'gloves', 'belt', 'focus']);
// v1.7：爆炸（擊中時機率引發範圍爆炸）
A('blast_ch', 's', 'blast_ch', ['之火花', '之爆裂', '之殲滅'], [[12, 3, 5], [28, 6, 9], [48, 10, 14]], ['sword', 'axe', 'katana', 'dagger', 'bow', 'wand', 'staff', 'gloves', 'amulet', 'quiver']);
// v1.6：堅忍值（被打到不容易硬直）
A('poise', 'p', 'poise', ['穩固的', '堅毅的', '不屈的'], [[1, 8, 15], [15, 16, 28], [35, 29, 45]], ['helmet', 'body', 'belt', 'boots', 'shield']);
// v1.5：閃避機率（直接躲掉攻擊）
A('dodge', 's', 'dodge', ['之靈巧', '之幻步', '之殘影'], [[10, 2, 3], [25, 4, 5], [45, 6, 7]], ['boots', 'gloves', 'body', 'helmet', 'quiver']);
A('mleech', 's', 'mleech', ['之汲取', '之噬魂', '之虛吸'], [[8, 0.3, 0.6], [22, 0.7, 1.1], [38, 1.2, 1.6]], ['sword', 'axe', 'bow', 'katana', 'dagger', 'wand', 'staff', 'gloves', 'ring', 'amulet'], { decimal: true });
A('mana_regen_inc', 's', 'mana_regen_inc', ['之沉思', '之冥想', '之頓悟'], [[1, 20, 29], [15, 30, 39], [30, 40, 59]], ['ring', 'amulet', 'helmet', 'wand', 'staff', 'focus']);
A('l_block', 's', 'block', ['之守衛', '之壁壘'], [[1, 3, 5], [20, 6, 8]], ['shield']);
const AFFIX_BY_ID = {};
AFFIXES.forEach(a => AFFIX_BY_ID[a.id] = a);

// ---------- 數值文字 ----------
// v 可以是數字或 [a,b]
const STAT_TEXT = {
  life: v => `${sgn(v)} 最大生命`, mana: v => `${sgn(v)} 最大魔力`, es: v => `${sgn(v)} 最大能量護盾`,
  life_inc: v => `${incTxt(v)} 最大生命`, mana_inc: v => `${incTxt(v)} 最大魔力`, es_inc: v => `${incTxt(v)} 最大能量護盾`,
  armour: v => `${sgn(v)} 護甲`, evasion: v => `${sgn(v)} 閃避值`,
  armour_inc: v => `${incTxt(v)} 護甲`, evasion_inc: v => `${incTxt(v)} 閃避值`,
  str: v => `${sgn(v)} 力量`, dex: v => `${sgn(v)} 敏捷`, int: v => `${sgn(v)} 智慧`,
  all_attr: v => `${sgn(v)} 全屬性`,
  res_fire: v => `${sgn(v)}% 火焰抗性`, res_cold: v => `${sgn(v)}% 冰冷抗性`, res_light: v => `${sgn(v)}% 閃電抗性`, res_all: v => `${sgn(v)}% 全元素抗性`,
  res_chaos: v => `${sgn(v)}% 毒素抗性`, spell_supp: v => `${sgn(v)}% 法術壓制（被法術打中時，有機率只受一半傷害）`, spell_block: v => `${sgn(v)}% 法術格擋率`,
  move_inc: v => `${incTxt(v)} 移動速度`, aspd_inc: v => `${incTxt(v)} 攻擊速度`, cspd_inc: v => `${incTxt(v)} 施法速度`,
  crit_inc: v => `${incTxt(v)} 暴擊率`, crit_multi: v => `${sgn(v)}% 暴擊傷害`,
  dmg_inc: v => `${incTxt(v)} 全部傷害`, phys_inc: v => `${incTxt(v)} 物理傷害`, fire_inc: v => `${incTxt(v)} 火焰傷害`,
  cold_inc: v => `${incTxt(v)} 冰冷傷害`, light_inc: v => `${incTxt(v)} 閃電傷害`, ele_inc: v => `${incTxt(v)} 元素傷害`,
  spell_inc: v => `${incTxt(v)} 法術傷害`, attack_inc: v => `${incTxt(v)} 攻擊傷害`, melee_inc: v => `${incTxt(v)} 近戰傷害`,
  proj_inc: v => `${incTxt(v)} 投射物傷害`, area_dmg_inc: v => `${incTxt(v)} 範圍傷害`,
  minion_dmg_inc: v => `召喚物${incTxt(v)}傷害`, minion_life_inc: v => `召喚物${incTxt(v)}生命`, minion_aspd_inc: v => `召喚物${incTxt(v)}攻擊速度`,
  a_phys: v => `攻擊附加 ${v[0]}–${v[1]} 物理傷害`, a_fire: v => `攻擊附加 ${v[0]}–${v[1]} 火焰傷害`,
  a_cold: v => `攻擊附加 ${v[0]}–${v[1]} 冰冷傷害`, a_light: v => `攻擊附加 ${v[0]}–${v[1]} 閃電傷害`,
  s_fire: v => `法術附加 ${v[0]}–${v[1]} 火焰傷害`, s_cold: v => `法術附加 ${v[0]}–${v[1]} 冰冷傷害`, s_light: v => `法術附加 ${v[0]}–${v[1]} 閃電傷害`,
  proj_count: v => `${sgn(v)} 投射物數量`, pierce: v => `投射物額外穿透 ${v} 個敵人`, area_inc: v => `${incTxt(v)} 技能範圍`,
  leech: v => `${v}% 擊中傷害轉為生命偷取`, life_on_kill: v => `擊殺回復 ${v} 生命`, mana_on_kill: v => `擊殺回復 ${v} 魔力`,
  life_regen: v => `每秒回復 ${v}% 生命`, cdr: v => `技能冷卻回復速度 +${v}%`, poise: v => `${sgn(v)} 堅忍值`, dodge: v => `${sgn(v)}% 閃避機率（直接躲掉攻擊，上限 50%）`, life_regen_inc: v => `${incTxt(v)} 生命回復速度`, mleech: v => `${v}% 擊中傷害轉為魔力偷取`, mana_regen_inc: v => `${incTxt(v)} 魔力回復速度`,
  minion_max: v => `${sgn(v)} 每種召喚物上限`, block: v => `${sgn(v)}% 格擋率`, flask_inc: v => `${incTxt(v)} 藥劑恢復量`,
  chaos_inc: v => `${incTxt(v)} 毒素傷害`, a_chaos: v => `攻擊附加 ${v[0]}–${v[1]} 毒素傷害`, s_chaos: v => `法術附加 ${v[0]}–${v[1]} 毒素傷害`,
  dot_inc: v => `${incTxt(v)} 持續傷害（燃燒、中毒、流血）`,
  ignite_ch: v => `${sgn(v)}% 點燃機率`, freeze_ch: v => `${sgn(v)}% 冰凍機率`, shock_ch: v => `${sgn(v)}% 感電機率`,
  poison_ch: v => `${sgn(v)}% 中毒機率`, bleed_ch: v => `${sgn(v)}% 流血機率`,
  more_attack: v => `攻擊傷害總${v >= 0 ? '增' : '降'} ${Math.abs(v)}%`,
  ail_dur: v => `${incTxt(v)} 異常狀態持續時間`,
  more_dmg: v => `你造成的傷害總${v >= 0 ? '增' : '降'} ${Math.abs(v)}%`,
  more_spell: v => `法術傷害總${v >= 0 ? '增' : '降'} ${Math.abs(v)}%`,
  more_proj: v => `投射物傷害總${v >= 0 ? '增' : '降'} ${Math.abs(v)}%`,
  // 局部（只影響這件裝備本身）
  l_phys_inc: v => `增加 ${v}% 物理傷害`, l_phys_add: v => `附加 ${v[0]}–${v[1]} 物理傷害`, l_aspd: v => `增加 ${v}% 攻擊速度`,
  def_flat: (v, def) => `${sgn(v)} ${DEF_NAME[def] || '防禦'}`, def_inc: (v, def) => `增加 ${v}% ${DEF_NAME[def] || '防禦'}`,
  // 旗標（基石／傳奇特效）
  bloodMagic: () => '技能改為消耗生命，而非魔力', noMana: () => '你的最大魔力為 0',
  noCrit: () => '你無法造成暴擊',
  projSplit: () => '投射物第一次擊中時，分裂成 2 支（各 50% 傷害）', projChain: () => '投射物擊中後，會再跳到附近 1 個敵人（70% 傷害）',
  aftershock: () => '近戰攻擊擊中時，在目標周圍再震一次（50% 範圍傷害）', spellTwin: () => '法術有 25% 機率再施放一次（不耗魔力）',
  noStun: () => '你不會硬直', corpseBlast: () => '你擊殺的敵人會爆炸，對周圍造成牠最大生命 15% 的火焰傷害',
  blast_ch: v => `擊中時有 ${v}% 機率引發爆炸（對周圍造成 40% 範圍傷害）`, noRegen: () => '你無法自然回復生命',
  cull: () => '擊中生命低於 10% 的稀有與普通敵人時，直接將其擊殺',
  chillMore: () => '冰緩效果增強為 50% 減速',
  // v2.5.5 新質變基石
  projReturn: () => '所有投射物飛到盡頭後會飛回你身上，回程可以再打一次',
  riposte: () => `受到傷害時有 30% 機率反擊：用${ctl('lmbSkill')}的傷害打你周圍所有敵人`,
  berserk: () => '生命越低傷害越高：每少 1% 生命，傷害 +1%',
  soulReap: () => '擊殺得到 1 層「魂」（最多 10 層），每層傷害 +4%；5 秒沒擊殺掉 1 層',
  shatter: () => '被冰凍或冰緩的敵人死掉時，爆出 6 道冰晶（牠最大生命 12% 的冰冷傷害）',
  cdReset: () => '擊殺時 10% 機率讓所有技能冷卻立刻結束',
};
function incTxt(v) { return v >= 0 ? `增加 ${v}%` : `減少 ${-v}%`; }
function sgn(v) { return v >= 0 ? `+${v}` : `${v}`; }

// ---------- 傳奇物品 ----------
// boss: 只會由該首領掉落（首領專屬）
// mods: [stat, min, max] 或 [stat, [a1,a2], [b1,b2]] 或 [flag]
const UNIQUES = [
  { id: 'u_dusk', name: '暮光之刃', base: 'sword1', flavor: '黃昏時，它最鋒利。',
    mods: [['l_phys_inc', 60, 90], ['a_light', [2, 4], [18, 26]], ['l_aspd', 10, 15], ['life_on_kill', 8, 12]] },
  { id: 'u_wind', name: '風語者', base: 'bow0', flavor: '風，會替你瞄準。',
    mods: [['proj_count', 1, 1], ['l_aspd', 15, 20], ['dex', 20, 30], ['move_inc', 8, 10]] },
  { id: 'u_watch', name: '守夜人之冠', base: 'helmet_es1', flavor: '有人醒著，世界才能安睡。',
    mods: [['def_inc', 80, 120], ['spell_inc', 15, 25], ['mana', 30, 50], ['mana_regen_inc', 30, 50]] },
  { id: 'u_ronin', name: '浪人之靴', base: 'boots_ev0', flavor: '沒有主人，就沒有枷鎖。',
    mods: [['move_inc', 20, 25], ['life', 30, 50], ['res_all', 10, 15], ['dex', 10, 20]] },
  { id: 'u_pact', name: '血契之戒', base: 'ring0', flavor: '每一滴都要還。',
    mods: [['leech', 2, 3], ['life', 20, 30], ['phys_inc', 15, 25], ['res_all', -10, -10]] },
  { id: 'u_alch', name: '煉金師的腰帶', base: 'belt0', flavor: '藥水不夠？那就讓它更濃。',
    mods: [['flask_inc', 30, 50], ['life', 40, 60], ['life_regen', 0.5, 1.0]] },
  { id: 'u_muramasa', name: '妖刀．村正', base: 'katana1', flavor: '出鞘必見血，不見血不歸鞘。',
    mods: [['l_phys_inc', 60, 90], ['crit_inc', 40, 60], ['bleed_ch', 30, 30], ['dot_inc', 25, 35], ['life', -30, -30]] },
  { id: 'u_rootstaff', name: '腐根之杖', base: 'staff1', flavor: '森林死去之後，留下的是毒。',
    mods: [['chaos_inc', 40, 60], ['poison_ch', 30, 40], ['dot_inc', 20, 30], ['life_regen', 0.8, 1.2]] },
  { id: 'u_viper', name: '毒蛇之吻', base: 'dagger0', flavor: '一點點就夠了。',
    mods: [['a_chaos', [3, 5], [9, 13]], ['poison_ch', 40, 40], ['l_aspd', 10, 15], ['dex', 15, 25]] },
  // —— 首領專屬 ——
  { id: 'u_bonecrown', name: '骸骨王冠', base: 'helmet_es0', boss: 'boneking', flavor: '王已死，王的軍隊仍在。',
    mods: [['minion_max', 2, 2], ['minion_dmg_inc', 30, 50], ['minion_life_inc', 20, 30], ['int', 15, 25]] },
  { id: 'u_kingwrath', name: '王者之怒', base: 'axe0', boss: 'boneking', flavor: '他用這把斧頭，親手建立了一座墳場。',
    mods: [['l_phys_inc', 100, 140], ['l_phys_add', [6, 10], [16, 24]], ['cull'], ['str', 20, 30]] },
  { id: 'u_lavaheart', name: '熔岩之心', base: 'body_ar0', boss: 'witch', flavor: '她的心早就燒成了石頭。',
    mods: [['def_inc', 100, 150], ['res_fire', 40, 40], ['fire_inc', 30, 40], ['life', 50, 70]] },
  { id: 'u_ashstaff', name: '灰燼法杖', base: 'staff0', boss: 'witch', flavor: '火焰不會說謊，只會吞噬。',
    mods: [['fire_inc', 40, 60], ['s_fire', [8, 12], [18, 26]], ['proj_count', 2, 2], ['cspd_inc', 10, 15]] },
  { id: 'u_frostfang', name: '霜牙之弓', base: 'bow0', boss: 'beast', flavor: '取自巨獸口中，至今仍冷得刺骨。',
    mods: [['l_phys_inc', 60, 80], ['a_cold', [8, 12], [20, 30]], ['crit_inc', 30, 40], ['pierce', 2, 2], ['chillMore']] },
  { id: 'u_frostgrip', name: '冰封之握', base: 'gloves_ev0', boss: 'beast', flavor: '握住它的人，心也會結冰。',
    mods: [['a_cold', [4, 6], [10, 14]], ['aspd_inc', 8, 12], ['cold_inc', 25, 35], ['leech', 1, 1]] },
  // —— 新場景看守者專屬 ——
  { id: 'u_silk', name: '母后之絲', base: 'gloves_ev1', boss: 'b_cave', flavor: '一根絲，就能吊起一頭熊。',
    mods: [['poison_ch', 25, 25], ['chaos_inc', 25, 35], ['aspd_inc', 8, 12], ['res_chaos', 20, 25]] },
  { id: 'u_kingfang', name: '獸王之牙', base: 'amulet0', boss: 'b_grass', flavor: '草原上，只有一個王。',
    mods: [['phys_inc', 25, 35], ['aspd_inc', 6, 10], ['life', 30, 50], ['str', 15, 20]] },
  { id: 'u_claw', name: '巨鉗', base: 'shield1', boss: 'b_beach', flavor: '夾住的東西，從來沒有鬆開過。',
    mods: [['def_inc', 80, 120], ['block', 8, 8], ['life', 40, 60], ['res_cold', 25, 35]] },
  { id: 'u_brew', name: '魔女的苦湯', base: 'belt0', boss: 'b_swamp', flavor: '很苦，但喝了就不怕毒。',
    mods: [['flask_inc', 40, 60], ['res_chaos', 25, 35], ['poison_ch', 15, 15], ['life_regen', 0.6, 1.0]] },
  { id: 'u_heartwood', name: '樹心之衣', base: 'body_ev1', boss: 'b_forest', flavor: '一百年的年輪，一層一層包住你。',
    mods: [['def_inc', 80, 120], ['life', 60, 80], ['life_regen', 1.0, 1.5], ['minion_life_inc', 25, 35]] },
  { id: 'u_pharaoh', name: '法老權杖', base: 'wand1', boss: 'b_desert', flavor: '沙子記得每一道雷。',
    mods: [['spell_inc', 50, 70], ['light_inc', 30, 40], ['s_light', [3, 5], [30, 40]], ['cspd_inc', 10, 15]] },
  { id: 'u_gaze', name: '凝視深淵', base: 'ring0', boss: 'b_void', flavor: '你看著它的時候，它也在看你。',
    mods: [['chaos_inc', 30, 40], ['crit_inc', 25, 35], ['all_attr', 10, 15], ['res_chaos', 20, 20]] },
  // —— 終局：夢魘首領專屬（頂級） ——
  { id: 'u_deadcrown', name: '亡者冠冕', base: 'helmet_es2', boss: 'nm_bone', flavor: '戴上它，死者會叫你「陛下」。',
    mods: [['def_inc', 120, 160], ['minion_max', 2, 2], ['minion_dmg_inc', 60, 80], ['minion_life_inc', 40, 60], ['life', 40, 60]] },
  { id: 'u_bonecleaver', name: '碎骨者', base: 'axe2', boss: 'nm_bone', flavor: '它記得每一根被它劈開的骨頭。',
    mods: [['l_phys_inc', 160, 200], ['l_phys_add', [15, 22], [35, 48]], ['bleed_ch', 30, 30], ['cull'], ['area_inc', 20, 25]] },
  { id: 'u_worldburn', name: '焚世之心', base: 'amulet0', boss: 'nm_ash', flavor: '世界本來就是燃料。',
    mods: [['fire_inc', 40, 50], ['ignite_ch', 30, 30], ['dot_inc', 30, 40], ['s_fire', [12, 16], [28, 36]], ['res_fire', 30, 40]] },
  { id: 'u_ashcrown', name: '灰燼女王的權杖', base: 'staff2', boss: 'nm_ash', flavor: '她把老師的名字刻在了上面。',
    mods: [['spell_inc', 80, 110], ['proj_count', 2, 2], ['cspd_inc', 20, 25], ['ignite_ch', 20, 20], ['more_spell', 15, 15]] },
  { id: 'u_permafrost', name: '永凍之觸', base: 'gloves_es2', boss: 'nm_frost', flavor: '摸過的東西，就再也不會動了。',
    mods: [['freeze_ch', 20, 25], ['cold_inc', 40, 50], ['crit_multi', 30, 40], ['a_cold', [10, 14], [24, 32]], ['res_cold', 30, 40]] },
  { id: 'u_glacierfang', name: '冰河之牙', base: 'bow2', boss: 'nm_frost', flavor: '一箭過去，整條河都停了。',
    mods: [['l_phys_inc', 120, 160], ['a_cold', [18, 24], [40, 55]], ['crit_inc', 50, 70], ['pierce', 3, 3], ['chillMore']] },
  // —— 終局：守門人專屬（最高） ——
  { id: 'u_keeperblade', name: '守門人之刃', base: 'katana2', boss: 'keeper', flavor: '你曾經用它守住整個世界。現在，用它守住自己。',
    mods: [['l_phys_inc', 180, 220], ['crit_inc', 50, 70], ['all_attr', 20, 25], ['life_on_kill', 25, 35], ['more_dmg', 10, 10]] },
  { id: 'u_wakering', name: '醒來之戒', base: 'ring0', boss: 'keeper', flavor: '戒指內側刻著一個詞。你知道是哪個詞。',
    mods: [['all_attr', 20, 30], ['res_all', 15, 20], ['life', 50, 70], ['dmg_inc', 25, 35], ['more_dmg', 8, 8]] },
];
const UNIQUE_BY_ID = {};
UNIQUES.forEach(u => UNIQUE_BY_ID[u.id] = u);

// ---------- 通貨（工藝石） ----------
// 通貨＝改造裝備的材料（這個遊戲沒有金錢，商人也用這些交易）
const CURRENCY = {
  portal: { name: '傳送卷軸', color: '#7fc8ff', weight: 30, scroll: true, desc: '在地圖裡按 T 使用：打開傳送門回城鎮，之後可以從城鎮的藍色傳送門回到同一張地圖繼續打。' },
  transmute: { name: '蛻變石', color: '#8fb8ff', weight: 36, desc: '普通 → 魔法（1–2 條詞綴）' },
  alter: { name: '改造石', color: '#b0d0ff', weight: 28, desc: '重骰魔法物品的全部詞綴' },
  aug: { name: '增幅石', color: '#9ad0ff', weight: 22, desc: '魔法物品只有 1 條詞綴時，再加 1 條' },
  chance: { name: '機會石', color: '#d8d8a0', weight: 10, desc: '普通 → 隨機稀有度，有小機率直接變成同底座的傳奇！' },
  alch: { name: '點金石', color: '#ffd76a', weight: 12, desc: '普通 → 稀有（3–6 條詞綴）' },
  regal: { name: '富豪石', color: '#ffe8a0', weight: 8, desc: '魔法 → 稀有，保留原本詞綴並多加 1 條' },
  chaos: { name: '混沌石', color: '#e0a0ff', weight: 8, desc: '重骰稀有物品的全部詞綴' },
  annul: { name: '剝離石', color: '#d0d0e8', weight: 3, desc: '隨機移除魔法或稀有物品的 1 條詞綴（有風險！）' },
  divine: { name: '神聖石', color: '#fff0c0', weight: 2.5, desc: '詞綴種類不變，只重骰數值（傳奇也可以用）' },
  exalt: { name: '崇高石', color: '#ffffff', weight: 2, desc: '為稀有物品加上 1 條新詞綴' },
  scour: { name: '重鑄石', color: '#c0c0c0', weight: 7, desc: '清除所有詞綴，變回普通（插槽與珠寶會保留）' },
  socket: { name: '鑿孔石', color: '#e8c890', weight: 1.2, desc: '為裝備多鑿 1 個珠寶插槽（不能超過該部位的上限）。非常稀有。' },
};
// v2.17 通貨分段：主線（第 1 夜到深層夢境之前）只掉這幾種（變藍、變黃、重骰黃裝、鑿孔，加上傳送卷軸）；其他通貨和強化材料進深層夢境（DEEP_TIER）才開始掉
//   已經有的不會刪；主線的任務、人物故事還是會送少量，讓玩家先認識。判斷在 items.js 的 randomCurrency／curMainOnly
const MAIN_CURRENCY = new Set(['portal', 'transmute', 'alch', 'chaos', 'socket']);

// =============================================================
//  v1.4 材料（在商人那裡分解裝備得到）：5 種 × 5 個等級（I–V）
//  材料等級＝裝備基底的階級：初階→I、中階→II、高階→III、夢鑄→IV、深淵→V
// =============================================================
const MAT_TIER = ['I', 'II', 'III', 'IV', 'V'];
const MAT_TIER_COLOR = ['#d0d0d0', '#7ae070', '#6ab4ff', '#c890ff', '#ffa040'];
const MATS = {
  ore: { name: '礦石', color: '#a8b0bc', desc: '分解護甲類防具、劍、斧、太刀、盾得到' },
  hide: { name: '獸皮', color: '#b07a48', desc: '分解閃避類防具、弓、匕首、箭袋、腰帶得到' },
  fur: { name: '毛皮', color: '#e0d0b0', desc: '分解閃避類手套與鞋子、能量護盾類防具得到' },
  gem: { name: '寶石原石', color: '#7ab8ff', desc: '分解魔杖、法杖、法器、戒指、項鍊、能量護盾類防具得到' },
  wood: { name: '木材', color: '#8a5a30', desc: '分解弓、魔杖、法杖得到' },
};
const matKey = (type, tier) => `${type}_${tier}`;
const matName = k => { const i = k.lastIndexOf('_'); return `${MATS[k.slice(0, i)].name} ${MAT_TIER[+k.slice(i + 1) - 1]}`; };

// =============================================================
//  藥劑：身上最多帶 4 瓶（按 1–4），打怪充能＋自動慢慢充能
//  同一種藥劑效果不疊加（重新喝只會刷新時間、取較高階），不同種可以同時生效
//  分 6 階：地圖等級到了才會掉那一階，越高階越難掉
// =============================================================
const FLASK_TIER_NAME = ['初級', '中級', '高級', '特級', '神聖', '永恆'];
const FLASK_TIER_WEIGHT = [10, 6, 3.5, 2, 1, 0.5];
const FLASK_RECHARGE = 0.5;   // 每秒自動回充幾點
const LOW_LIFE = 0.35;        // v2.0「低血」：生命低於 35%（畫面邊緣變紅、應急藥劑整瓶瞬回）
const FLASKS = {
  life: { name: '生命藥劑', color: '#d03030', heal: 'life', vals: [30, 35, 40, 46, 53, 60], dur: 1.5, max: [40, 45, 50, 55, 60, 70], use: 15, desc: (v, d) => `${d} 秒內回復 ${v}% 生命` },
  mana: { name: '魔力藥劑', color: '#3060e0', heal: 'mana', vals: [40, 45, 50, 56, 63, 70], dur: 1.5, max: [40, 45, 50, 55, 60, 70], use: 15, desc: (v, d) => `${d} 秒內回復 ${v}% 魔力` },
  speed: { name: '迅捷藥劑', color: '#c0e8ff', stat: 'move_inc', vals: [15, 20, 25, 30, 35, 40], dur: 5, max: [50, 55, 60, 65, 70, 80], use: 25, desc: (v, d) => `${d} 秒內移動速度 +${v}%` },
  granite: { name: '花崗岩藥劑', color: '#a8a090', stat: 'armour_inc', vals: [40, 60, 80, 100, 125, 150], dur: 5, max: [50, 55, 60, 65, 70, 80], use: 25, desc: (v, d) => `${d} 秒內護甲 +${v}%` },
  jade: { name: '翠玉藥劑', color: '#60c070', stat: 'evasion_inc', vals: [40, 60, 80, 100, 125, 150], dur: 5, max: [50, 55, 60, 65, 70, 80], use: 25, desc: (v, d) => `${d} 秒內閃避 +${v}%` },
  // v2.17 稜鏡藥劑：取代舊的紅寶石、藍寶石、黃玉、解毒四瓶單抗藥劑（舊存檔：讀角色、讀倉庫、還原沒打完的夢時，用 fixOldFlask 換成同階、同詞綴的稜鏡藥劑）
  prism: { name: '稜鏡藥劑', color: '#d8a0ff', stat: ['res_all', 'res_chaos'], noPoison: true, vals: [15, 20, 25, 30, 35, 40], dur: 6, max: [50, 55, 60, 65, 70, 80], use: 25, desc: (v, d) => `${d} 秒內火焰、冰冷、閃電、毒素抗性各 +${v}%，而且不會中毒` },
  rage: { name: '狂暴藥劑', color: '#ff4060', stat: 'dmg_inc', vals: [10, 14, 18, 22, 26, 30], dur: 5, max: [50, 55, 60, 65, 70, 80], use: 30, desc: (v, d) => `${d} 秒內全部傷害 +${v}%` },
};
// 舊版存檔用字串記藥劑（例如 'life_1'），讀檔時會換成新的藥劑物品
// v2.17 拿掉的藥劑種類 → 換成哪一種（同階、同詞綴）
const FLASK_RENAMED = { rubyf: 'prism', sapphiref: 'prism', topazf: 'prism', antidote: 'prism' };
function fixOldFlask(it) { if (it && it.flask && FLASK_RENAMED[it.type]) { it.type = FLASK_RENAMED[it.type]; if (typeof nameFlask === 'function') nameFlask(it); } return it; }
const parseFlask = k => { const i = k.lastIndexOf('_'); return { type: k.slice(0, i), tier: +k.slice(i + 1) }; };

// 藥劑詞綴：最多 2 條（1 個前綴＋1 個後綴）。不加角色屬性，只改藥劑本身
//   前綴＝改「效果」（效果量、持續時間、瞬間回復）
//   後綴＝改「充能」（最大充能、每次用量、擊殺／自動充能、不消耗、自動喝、共鳴）
//   only：heal＝只出現在生命／魔力藥劑，buff＝只出現在功能藥劑，life＝只出現在生命藥劑
const FLASK_MODS = [
  { id: 'f_eff', type: 'p', name: '濃縮的', r: [15, 40], text: v => `藥劑效果 +${v}%` },
  { id: 'f_dur', type: 'p', name: '持久的', only: 'buff', r: [20, 60], text: v => `效果持續時間 +${v}%` },
  { id: 'f_inst', type: 'p', name: '瞬間的', only: 'heal', r: [1, 1], text: () => '喝下立刻全部回復（回復量 −25%）' },
  // v2.0
  { id: 'f_bubble', type: 'p', name: '沸騰的', only: 'heal', r: [1, 1], text: () => '一半立刻回復，另一半照常慢慢回（回復量 −10%）' },
  { id: 'f_panic', type: 'p', name: '應急的', only: 'life', r: [1, 1], text: () => `生命低於 ${Math.round(LOW_LIFE * 100)}% 時喝：整瓶立刻回復（平常照常慢慢回）` },
  { id: 'f_max', type: 's', name: '之充沛', r: [20, 50], text: v => `最大充能 +${v}%` },
  { id: 'f_use', type: 's', name: '之節約', r: [15, 35], text: v => `每次喝的充能 −${v}%` },
  { id: 'f_kill', type: 's', name: '之嗜血', r: [30, 80], text: v => `擊殺獲得的充能 +${v}%` },
  { id: 'f_auto', type: 's', name: '之湧泉', r: [50, 150], text: v => `自動充能速度 +${v}%` },
  { id: 'f_free', type: 's', name: '之滿溢', r: [10, 25], text: v => `喝的時候有 ${v}% 機率不消耗充能` },
  { id: 'f_emerg', type: 's', name: '之急救', only: 'life', r: [35, 35], text: v => `生命低於 ${v}% 時自動喝下` },
  { id: 'f_reso', type: 's', name: '之共鳴', r: [3, 8], text: v => `喝的時候，其他藥劑各獲得 ${v} 充能` },
];
const FLASK_MOD_BY_ID = Object.fromEntries(FLASK_MODS.map(m => [m.id, m]));
// 藥劑能用的通貨（藥劑只會是普通或魔法）
const FLASK_CURRENCY = new Set(['transmute', 'alter', 'aug', 'annul', 'scour', 'divine']);

// =============================================================
//  珠寶：鑲在裝備插槽裡，7 種 × 8 階，3 顆同種同階合成 1 顆高一階
// =============================================================
const JEWEL_GRADES = ['碎裂', '粗糙', '普通', '精緻', '無瑕', '完美', '皇家', '神聖'];
const JEWEL_DROP_MAX = 5;        // 第 1–5 階會掉落；第 6–8 階只能合成
const JEWEL_COMBINE = 3;         // 幾顆合成 1 顆
const JEWELS = {
  ruby: { name: '紅玉', color: '#e04848', stat: 'life', vals: [6, 10, 16, 24, 34, 46, 60, 80], hint: '最大生命' },
  emerald: { name: '翠玉', color: '#48c870', stat: 'aspd_inc', vals: [2, 3, 4, 5, 6, 8, 10, 12], hint: '攻擊速度' },
  sapphire: { name: '藍玉', color: '#4878e8', stat: 'spell_inc', vals: [3, 5, 8, 11, 15, 20, 26, 32], hint: '法術傷害' },
  topaz: { name: '黃玉', color: '#e8c840', stat: 'crit_inc', vals: [4, 7, 10, 14, 19, 25, 32, 40], hint: '暴擊率' },
  amethyst: { name: '紫晶', color: '#a868e0', stat: 'res_all', vals: [2, 3, 5, 7, 9, 12, 15, 18], hint: '全元素抗性' },
  diamond: { name: '白鑽', color: '#e8f0ff', stat: 'all_attr', vals: [2, 3, 5, 7, 9, 12, 15, 18], hint: '全屬性' },
  obsidian: { name: '黑曜', color: '#6a5a7a', stat: 'dot_inc', vals: [3, 5, 8, 11, 15, 20, 26, 32], hint: '持續傷害' },
};
// 各部位最多幾個插槽
const SOCKET_MAX = { body: 3, weapon2: 3, weapon1: 2, helmet: 2, gloves: 2, boots: 2, offhand: 2, amulet: 1, ring: 1, belt: 1 };
const jewelKey = (type, grade) => `${type}_${grade}`;
const parseJewel = k => { const i = k.lastIndexOf('_'); return { type: k.slice(0, i), grade: +k.slice(i + 1) }; };
const jewelName = k => { const j = parseJewel(k); return `${JEWEL_GRADES[j.grade - 1]}的${JEWELS[j.type].name}`; };
const jewelText = k => { const j = parseJewel(k); return STAT_TEXT[JEWELS[j.type].stat](JEWELS[j.type].vals[j.grade - 1]); };
// 賣給商人得到的「碎片」，湊滿 10 片合成 1 顆
const SHARD_NEED = 10;

// ---------- 怪物 ----------
// res：元素抗性（%），負數＝弱點；armour：護甲（減少物理傷害）；note：圖鑑全解鎖後的說明
const MONSTERS = {
  zombie: { name: '腐屍', sprite: 'zombie', life: 46, dmg: [5, 8], speed: 52, aspd: 0.8, range: 30, xp: 7, r: 13,
    res: { fire: -30, cold: 20, light: 0, chaos: 50 }, armour: 10, note: '行動緩慢但很耐打。怕火，毒對它效果差。' },
  skeleton: { name: '骷髏戰士', sprite: 'skeleton', life: 30, dmg: [4, 7], speed: 86, aspd: 1.1, range: 28, xp: 5, r: 12,
    res: { fire: 0, cold: 30, light: -25, chaos: 75 }, armour: 15, note: '有骨甲，物理效果打折。怕雷，幾乎不怕毒。' },
  archer: { name: '骷髏弓手', sprite: 'archer', life: 24, dmg: [4, 6], speed: 72, aspd: 0.7, range: 250, xp: 6, r: 12, ranged: true, pspeed: 320, psprite: 'arrow',
    res: { fire: 0, cold: 30, light: -25, chaos: 75 }, armour: 5, note: '會保持距離放箭，靠近就會退。怕雷。' },
  imp: { name: '火焰小鬼', sprite: 'imp', life: 22, dmg: [5, 9], elem: 'fire', speed: 92, aspd: 0.6, range: 240, xp: 6, r: 11, ranged: true, spell: true, pspeed: 270, psprite: 'fireball',
    res: { fire: 75, cold: -40, light: 0, chaos: 0 }, armour: 0, note: '丟火球的法術攻擊，無法閃避。幾乎免疫火，非常怕冰。' },
  wisp: { name: '冰霜精魂', sprite: 'wisp', life: 22, dmg: [5, 9], elem: 'cold', speed: 92, aspd: 0.6, range: 240, xp: 6, r: 11, ranged: true, spell: true, pspeed: 270, psprite: 'iceshard',
    res: { fire: -40, cold: 75, light: 20, chaos: 0 }, armour: 0, note: '丟冰刺的法術攻擊。幾乎免疫冰，非常怕火。' },
  bat: { name: '吸血蝙蝠', sprite: 'bat', life: 13, dmg: [2, 4], speed: 150, aspd: 1.5, range: 24, xp: 3, r: 9,
    res: { fire: 0, cold: 0, light: -30, chaos: 0 }, armour: 0, note: '很快、很脆、成群出現。怕雷。' },
  wolf: { name: '霜原狼', sprite: 'wolf', life: 32, dmg: [5, 8], elem: 'cold', speed: 125, aspd: 1.2, range: 28, xp: 6, r: 12,
    res: { fire: -25, cold: 50, light: 0, chaos: 0 }, armour: 5, note: '跑得比你快，咬人帶冰冷傷害。怕火。' },
};
// 圖鑑：殺幾隻同種怪才解鎖哪些資訊（首領用後面那組，算擊敗次數）
const LORE_TIERS = [10, 50, 150];   // v2.17.3 上調（原本 3／15／40）
const LORE_TIERS_BOSS = [1, 2, 3];
const LORE_TEXT = ['生命數值、異常狀態', '元素抗性與弱點', '護甲、攻擊方式、弱點說明'];
const RES_NAME = { fire: '火', cold: '冰', light: '雷', chaos: '毒' };
const ELEM_NAME = { phys: '物理', fire: '火焰', cold: '冰冷', light: '閃電', chaos: '毒素' };
const MONSTER_MODS = [
  { id: 'swift', name: '迅捷', speed: 1.4, aspd: 1.25 },
  { id: 'strong', name: '強壯', dmg: 1.45 },
  { id: 'tough', name: '堅韌', life: 1.6 },
  { id: 'fiery', name: '烈焰附加', addElem: 'fire' },
  { id: 'frozen', name: '寒冰附加', addElem: 'cold' },
  { id: 'regen', name: '再生', regen: 0.04 },
  { id: 'vamp', name: '吸血', vamp: true },
  { id: 'plague', name: '瘟疫附加', addElem: 'chaos' },
];
const RARE_MONSTER_NAMES1 = ['腐朽', '狂暴', '飢渴', '陰影', '血色', '無盡', '寂滅', '詛咒', '嚎叫', '扭曲'];
const RARE_MONSTER_NAMES2 = ['的屠夫', '的守望者', '的吞噬者', '的哀嚎者', '的獵手', '的暴君', '的行者', '的收割者'];

// =============================================================
//  場景專屬怪物：用「體型範本＋配色＋戰鬥定位」組出來
//  定位：melee 近戰、fast 快攻、tank 坦克、brute 巨漢、ranged 遠程射擊、caster 遠程法術
// =============================================================
const ROLE = {
  melee: { life: 30, dmg: [4, 7], speed: 85, aspd: 1.1, range: 28, r: 12, xp: 5, desc: '近戰' },
  fast: { life: 18, dmg: [3, 5], speed: 145, aspd: 1.4, range: 24, r: 10, xp: 4, desc: '速度很快、但很脆' },
  tank: { life: 52, dmg: [5, 8], speed: 55, aspd: 0.8, range: 30, r: 14, xp: 7, desc: '血厚、動作慢' },
  brute: { life: 70, dmg: [7, 11], speed: 62, aspd: 0.7, range: 34, r: 16, xp: 9, scale: 3, desc: '巨大、一下很痛' },
  ranged: { life: 22, dmg: [4, 6], speed: 72, aspd: 0.7, range: 250, r: 12, xp: 6, ranged: true, pspeed: 320, psprite: 'arrow', desc: '保持距離放箭' },
  caster: { life: 22, dmg: [5, 9], speed: 85, aspd: 0.6, range: 240, r: 11, xp: 6, ranged: true, spell: true, pspeed: 270, psprite: 'orb', desc: '遠程法術，無法閃避' },
};
// MON(代號, 名字, 範本, 定位, 攻擊元素, 弱點, 抗性, 配色, 其他)
function MON(id, name, tpl, role, elem, weak, strong, pal, extra = {}) {
  const R = ROLE[role];
  const res = { fire: 0, cold: 0, light: 0, chaos: 0 };
  if (weak) res[weak] = -30;
  if (strong) res[strong] = strong === elem ? 75 : 50;
  const note = `${R.desc}。` + (weak ? `怕${RES_NAME[weak]}。` : '') + (strong ? `${RES_NAME[strong]}很難打穿。` : '') + (extra.armour >= 30 ? '外殼很硬，物理打折。' : '');
  MONSTERS[id] = Object.assign({ name, sprite: id, tpl, pal, role, elem: elem === 'phys' ? undefined : elem, res, armour: 0, note }, R, extra, { desc: undefined });
}
// —— 1 骸骨墓穴（另有原本的骷髏戰士、骷髏弓手、腐屍）——
MON('ghoul', '食屍鬼', 'humanoid', 'fast', 'phys', 'fire', 'chaos', { A: '#8a9a6a', B: '#4a3a2a', C: '#c0c0a0', E: '#ff3030' });
MON('bonemage', '骷髏法師', 'skeleton', 'caster', 'cold', 'light', 'chaos', { A: '#d8d0e8', E: '#80c0ff' });
MON('cryptguard', '墓穴守衛', 'skeleton', 'tank', 'phys', 'light', 'chaos', { A: '#a8a8b8', E: '#ff3030' }, { armour: 40 });
MON('wraith', '怨靈', 'ghost', 'caster', 'chaos', 'fire', 'cold', { A: '#a0a8c8', B: '#6a7090', E: '#ff4040' });
MON('maggot', '屍蟲', 'worm', 'fast', 'phys', 'fire', 'chaos', { A: '#e8e0c0', B: '#c8b890', E: '#202020' });
MON('bonehound', '骨犬', 'beast4', 'fast', 'phys', 'light', 'cold', { A: '#e0dcd0', E: '#ff3030' });
MON('gravedigger', '送葬者', 'humanoid', 'brute', 'phys', 'fire', 'cold', { A: '#d8b890', B: '#3a3040', C: '#888888', E: '#ffd040' });
// —— 2 熔岩洞窟（另有原本的火焰小鬼）——
MON('lavaslime', '熔岩史萊姆', 'blob', 'tank', 'fire', 'cold', 'fire', { A: '#ff7020', B: '#a03010', C: '#ffd060', E: '#202020' });
MON('salamander', '火蜥蜴', 'snake', 'fast', 'fire', 'cold', 'fire', { A: '#e05020', B: '#ffb040', C: '#ffe080', E: '#ffff60' });
MON('magmagolem', '岩漿巨像', 'golem', 'brute', 'fire', 'cold', 'fire', { A: '#5a3a30', B: '#ff6020', C: '#ffd040', E: '#ffff80' }, { armour: 30 });
MON('hellhound', '炎魔犬', 'beast4', 'fast', 'fire', 'cold', 'fire', { A: '#8a2a1a', E: '#ffd040' });
MON('coalbeetle', '煤炭甲蟲', 'insect', 'tank', 'phys', 'cold', 'fire', { A: '#2a2a2a', B: '#ff6020', E: '#ffb040' }, { armour: 35 });
MON('firespirit', '火焰精靈', 'ghost', 'caster', 'fire', 'cold', 'fire', { A: '#ff9a30', B: '#ffd060', E: '#ffffff' });
MON('lavaserpent', '熔岩蛇', 'snake', 'caster', 'fire', 'cold', 'fire', { A: '#a02010', B: '#ff7020', C: '#ffd060', E: '#ffff60' });
MON('charred', '焦屍', 'humanoid', 'melee', 'fire', 'cold', 'fire', { A: '#3a2a20', B: '#5a3020', C: '#ff6020', E: '#ff8030' });
MON('flamebird', '火焰鳥', 'bird', 'caster', 'fire', 'cold', 'fire', { A: '#ff6020', B: '#ffb040', C: '#ffe060', E: '#ffffff' });
// —— 3 冰封峽谷（另有原本的霜原狼、冰霜精魂）——
MON('yeti', '雪人', 'golem', 'brute', 'cold', 'fire', 'cold', { A: '#f0f0ff', B: '#c8d8f0', C: '#8ab0d0', E: '#2040a0' });
MON('icebeetle', '冰甲蟲', 'insect', 'tank', 'cold', 'fire', 'cold', { A: '#8ac8f0', B: '#d0f0ff', E: '#2040a0' }, { armour: 30 });
MON('icegolem', '冰晶魔像', 'golem', 'tank', 'cold', 'fire', 'cold', { A: '#a8e0ff', B: '#d8f4ff', C: '#ffffff', E: '#4080ff' }, { armour: 30 });
MON('snowfox', '雪狐', 'beast4', 'fast', 'cold', 'fire', 'cold', { A: '#f0f4ff', E: '#40a0ff' });
MON('icebear', '冰原巨熊', 'bigbeast', 'brute', 'phys', 'fire', 'cold', { A: '#e8f0ff', B: '#c0d0e0', C: '#506070', E: '#202020' });
MON('frozencorpse', '凍屍', 'humanoid', 'melee', 'cold', 'fire', 'cold', { A: '#a0c0d8', B: '#607890', C: '#e0f0ff', E: '#40e0ff' });
MON('snowowl', '雪鴞', 'bird', 'caster', 'cold', 'fire', 'cold', { A: '#f0f0f0', B: '#c8d0e0', C: '#ffd040', E: '#202020' });
MON('frostsprite', '冰晶妖精', 'imp', 'caster', 'cold', 'fire', 'cold', { A: '#a8e0ff', E: '#ffffff' });
// —— 4 幽暗洞穴（另有原本的吸血蝙蝠：蝙蝠只在洞穴）——
MON('cavespider', '洞穴蜘蛛', 'insect', 'fast', 'chaos', 'fire', 'chaos', { A: '#3a3040', B: '#6a5a70', E: '#ff3030' });
MON('crawler', '盲眼爬行者', 'beast4', 'melee', 'phys', 'light', null, { A: '#c8b8a8', E: '#ffffff' });
MON('troglodyte', '穴居人', 'humanoid', 'melee', 'phys', 'fire', null, { A: '#7a8a6a', B: '#4a3a2a', C: '#a8a080', E: '#ffd040' });
MON('caveworm', '巨型蠕蟲', 'worm', 'tank', 'phys', 'fire', 'cold', { A: '#c89080', B: '#a06050', E: '#202020' });
MON('shroom', '菇菇人', 'plant', 'caster', 'chaos', 'fire', 'chaos', { A: '#e8d8c0', B: '#ffffff', C: '#c83a3a', E: '#202020' });
MON('cavebear', '洞熊', 'bigbeast', 'brute', 'phys', 'fire', null, { A: '#6a4a30', B: '#4a3020', C: '#3a2a1a', E: '#ffd040' });
MON('stalactite', '鐘乳石怪', 'golem', 'tank', 'phys', 'light', 'cold', { A: '#8a8478', B: '#6a6458', C: '#c8c0b0', E: '#40e0ff' }, { armour: 50 });
MON('crystalsnail', '晶體蝸牛', 'blob', 'tank', 'light', 'chaos', 'light', { A: '#a080e0', B: '#6a50a0', C: '#e0d0ff', E: '#ffffff' });
MON('gargoyle', '石像鬼', 'bird', 'melee', 'phys', 'light', null, { A: '#7a7a7a', B: '#5a5a5a', C: '#9a9a9a', E: '#ff3030' }, { armour: 30 });
// —— 5 金色草原（老虎只在草原）——
MON('tiger', '老虎', 'bigbeast', 'fast', 'phys', 'cold', null, { A: '#e89030', B: '#2a1a10', C: '#f0e0c0', E: '#40ff40' }, { life: 32, dmg: [5, 9], r: 13 });
MON('hyena', '鬣狗', 'beast4', 'fast', 'phys', 'fire', null, { A: '#a8905a', E: '#ffd040' });
MON('boar', '野豬', 'bigbeast', 'tank', 'phys', 'fire', null, { A: '#6a4a3a', B: '#4a3020', C: '#f0f0e0', E: '#ff3030' }, { armour: 20 });
MON('viper', '毒蛇', 'snake', 'fast', 'chaos', 'cold', 'chaos', { A: '#6a9a3a', B: '#3a5a20', C: '#ffd040', E: '#ff3030' });
MON('vulture', '禿鷹', 'bird', 'melee', 'phys', 'light', null, { A: '#4a3a3a', B: '#2a2020', C: '#e8d8c0', E: '#ffd040' });
MON('wasp', '草原蜂群', 'flyer', 'fast', 'chaos', 'fire', 'chaos', { A: '#e8c030', E: '#202020' });
MON('bull', '狂暴公牛', 'bigbeast', 'brute', 'phys', 'cold', null, { A: '#3a2a20', B: '#2a1a10', C: '#e0d0b0', E: '#ff3030' });
MON('gnoll', '豺狼人', 'humanoid', 'melee', 'phys', 'fire', null, { A: '#b09060', B: '#6a4a30', C: '#d0c0a0', E: '#ff3030' });
MON('gnollarcher', '豺狼人射手', 'humanoid', 'ranged', 'phys', 'fire', null, { A: '#a08050', B: '#5a6a30', C: '#d0c0a0', E: '#ffd040' });
MON('lion', '獅子', 'bigbeast', 'melee', 'phys', 'cold', 'fire', { A: '#d8a850', B: '#a06a20', C: '#f0e0b0', E: '#202020' });
// —— 6 迷霧海灘（螃蟹只在海灘）——
MON('crab', '螃蟹', 'crab', 'tank', 'phys', 'light', 'cold', { A: '#d84a30', B: '#a03020', C: '#ff8060', E: '#202020' }, { armour: 30 });
MON('hermit', '寄居蟹', 'crab', 'tank', 'phys', 'light', 'cold', { A: '#c8a080', B: '#8a6040', C: '#d84a30', E: '#202020' }, { armour: 45 });
MON('gull', '海鷗', 'bird', 'fast', 'phys', 'light', null, { A: '#f0f0f0', B: '#a0a8b0', C: '#ffb040', E: '#202020' });
MON('murloc', '魚人', 'humanoid', 'melee', 'cold', 'light', 'cold', { A: '#3a8a8a', B: '#2a5a6a', C: '#a0e0d0', E: '#ffff60' });
MON('jelly', '水母', 'ghost', 'caster', 'light', 'phys', 'light', { A: '#c0a0ff', B: '#f0c0ff', E: '#ffffff' });
MON('seasnake', '海蛇', 'snake', 'fast', 'cold', 'light', 'cold', { A: '#2a6a8a', B: '#80c0d0', C: '#ffd040', E: '#ff3030' });
MON('octopus', '章魚', 'blob', 'caster', 'cold', 'light', 'cold', { A: '#c05080', B: '#802050', C: '#ff80b0', E: '#ffffff' });
MON('murlocspear', '魚人投矛手', 'humanoid', 'ranged', 'phys', 'light', 'cold', { A: '#4a9a7a', B: '#2a5a4a', C: '#a0e0d0', E: '#ffff60' });
MON('pirateghost', '海盜幽靈', 'ghost', 'melee', 'cold', 'fire', 'cold', { A: '#80c0b0', B: '#406a60', E: '#ffff60' });
MON('coralgolem', '珊瑚魔像', 'golem', 'brute', 'phys', 'light', 'cold', { A: '#e07080', B: '#ffa0a0', C: '#ffe0e0', E: '#40e0ff' }, { armour: 35 });
// —— 7 腐沼 ——
MON('frog', '沼澤蛙', 'blob', 'fast', 'chaos', 'fire', 'chaos', { A: '#5a8a3a', B: '#3a5a20', C: '#ffd040', E: '#202020' });
MON('croc', '鱷魚', 'bigbeast', 'tank', 'phys', 'light', 'chaos', { A: '#4a6a3a', B: '#2a4020', C: '#e0e0c0', E: '#ffd040' }, { armour: 30 });
MON('mosquito', '蚊群', 'flyer', 'fast', 'chaos', 'fire', 'chaos', { A: '#5a4a3a', E: '#ff3030' });
MON('bogbeast', '泥沼怪', 'golem', 'tank', 'chaos', 'fire', 'chaos', { A: '#5a4a30', B: '#3a3020', C: '#7a8a40', E: '#c0ff40' });
MON('poisonshroom', '毒蘑菇', 'plant', 'caster', 'chaos', 'fire', 'chaos', { A: '#d8d0b0', B: '#40c040', C: '#7a2a8a', E: '#202020' });
MON('leech', '水蛭', 'worm', 'melee', 'phys', 'fire', 'chaos', { A: '#4a2a2a', B: '#7a3a3a', E: '#ff3030' }, { vampire: true });
MON('bogwitch', '沼澤巫婆', 'humanoid', 'caster', 'chaos', 'fire', 'chaos', { A: '#8aa070', B: '#3a4a2a', C: '#6a2a6a', E: '#c0ff40' });
MON('lizardman', '蜥蜴人', 'humanoid', 'melee', 'phys', 'cold', 'chaos', { A: '#4a7a4a', B: '#6a4a2a', C: '#a0c080', E: '#ffd040' });
MON('rotent', '腐爛樹人', 'plant', 'brute', 'chaos', 'fire', 'chaos', { A: '#4a3a20', B: '#6a5a2a', C: '#4a6a2a', E: '#c0ff40' });
MON('watersnake', '毒水蛇', 'snake', 'fast', 'chaos', 'cold', 'chaos', { A: '#3a5a4a', B: '#6a8a5a', C: '#c0ff40', E: '#ff3030' });
// —— 8 黑森林 ——
MON('treant', '樹精', 'plant', 'tank', 'phys', 'fire', 'cold', { A: '#5a3a20', B: '#3a2a10', C: '#3a7a2a', E: '#ffd040' }, { armour: 30 });
MON('tarantula', '狼蛛', 'insect', 'fast', 'chaos', 'fire', 'chaos', { A: '#3a2a1a', B: '#6a4a2a', E: '#ff3030' });
MON('bear', '棕熊', 'bigbeast', 'brute', 'phys', 'fire', null, { A: '#7a5030', B: '#5a3a20', C: '#3a2a1a', E: '#202020' });
MON('fairy', '森林妖精', 'imp', 'caster', 'light', 'chaos', 'light', { A: '#a0ffa0', E: '#ffffff' });
MON('vine', '荊棘藤', 'plant', 'ranged', 'phys', 'fire', null, { A: '#3a5a2a', B: '#2a4a1a', C: '#5a8a3a', E: '#ff3030' });
MON('owl', '貓頭鷹', 'bird', 'melee', 'phys', 'light', null, { A: '#8a6a4a', B: '#5a4030', C: '#ffd040', E: '#202020' });
MON('stag', '鹿角獸', 'beast4', 'melee', 'phys', 'fire', null, { A: '#9a7050', E: '#202020' });
MON('werewolf', '狼人', 'humanoid', 'fast', 'phys', 'fire', null, { A: '#6a6070', B: '#4a4050', C: '#c0c0c0', E: '#ffd040' }, { life: 26 });
MON('goblin', '林地哥布林', 'imp', 'melee', 'phys', 'fire', null, { A: '#6a9a3a', E: '#ff3030' });
MON('thornflower', '毒刺花', 'plant', 'caster', 'chaos', 'fire', 'chaos', { A: '#4a7a3a', B: '#ff60a0', C: '#c03080', E: '#ffff60' });
// —— 9 沙漠遺跡 ——
MON('scorpion', '蠍子', 'insect', 'melee', 'chaos', 'cold', 'fire', { A: '#c89040', B: '#a06a20', E: '#202020' }, { armour: 25 });
MON('mummy', '木乃伊', 'humanoid', 'tank', 'phys', 'fire', 'chaos', { A: '#d8c8a0', B: '#b0a080', C: '#806040', E: '#40ff80' });
MON('sandworm', '沙蟲', 'worm', 'brute', 'phys', 'cold', 'fire', { A: '#c8a870', B: '#a07a40', E: '#ff3030' });
MON('scarab', '聖甲蟲', 'insect', 'fast', 'phys', 'cold', null, { A: '#2a5a6a', B: '#40a0a0', E: '#ffd040' }, { armour: 25 });
MON('jackalguard', '胡狼守衛', 'humanoid', 'melee', 'phys', 'cold', 'fire', { A: '#2a2a2a', B: '#c8a040', C: '#e0c060', E: '#ffd040' }, { armour: 30 });
MON('duststorm', '沙塵元素', 'ghost', 'caster', 'phys', 'cold', 'fire', { A: '#d8c090', B: '#b09060', E: '#ffffff' });
MON('rattlesnake', '響尾蛇', 'snake', 'fast', 'chaos', 'cold', 'fire', { A: '#b08a50', B: '#6a4a2a', C: '#e0c080', E: '#ff3030' });
MON('sandlizard', '沙漠蜥蜴', 'beast4', 'fast', 'phys', 'cold', 'fire', { A: '#d0a060', E: '#202020' });
MON('stoneguard', '石像守衛', 'golem', 'brute', 'phys', 'light', 'fire', { A: '#c8b080', B: '#a08a60', C: '#e0c060', E: '#40e0ff' }, { armour: 50 });
MON('mummypriest', '木乃伊祭司', 'humanoid', 'caster', 'light', 'fire', 'light', { A: '#e0d0b0', B: '#4a3a80', C: '#e0c060', E: '#40ff80' });
// —— 10 虛空神殿 ——
MON('voideye', '虛空之眼', 'eye', 'caster', 'chaos', 'light', 'chaos', { A: '#3a1a5a', B: '#7a3aaa', C: '#e0a0ff', E: '#ffffff' });
MON('shade', '影魔', 'ghost', 'fast', 'chaos', 'light', 'chaos', { A: '#2a1a3a', B: '#4a2a6a', E: '#ff40ff' });
MON('tentacle', '虛空觸手', 'worm', 'tank', 'chaos', 'light', 'chaos', { A: '#4a2a6a', B: '#8a4aaa', E: '#ff40ff' });
MON('astralknight', '星界騎士', 'humanoid', 'brute', 'cold', 'chaos', 'cold', { A: '#c0c8ff', B: '#4a4a8a', C: '#ffd040', E: '#80e0ff' }, { armour: 40 });
MON('nightmarehorse', '夢魘馬', 'beast4', 'fast', 'chaos', 'light', 'chaos', { A: '#1a1a2a', E: '#ff40ff' });
MON('assassin', '暗影刺客', 'humanoid', 'fast', 'phys', 'light', 'chaos', { A: '#2a2a3a', B: '#1a1a2a', C: '#8a2a8a', E: '#ff40ff' });
MON('fallen', '墮落天使', 'bird', 'caster', 'light', 'chaos', 'light', { A: '#c0b0d0', B: '#5a4a6a', C: '#ffd040', E: '#ff3030' });
MON('voidworm', '虛空蠕蟲', 'worm', 'fast', 'chaos', 'light', 'chaos', { A: '#3a2a5a', B: '#6a4a9a', E: '#ff40ff' });
MON('mirror', '鏡像', 'humanoid', 'melee', 'phys', 'chaos', null, { A: '#8080a0', B: '#c0c0e0', C: '#ffffff', E: '#202020' });
MON('chaosmage', '混沌法師', 'humanoid', 'caster', 'chaos', 'light', 'chaos', { A: '#6a2a8a', B: '#2a1a3a', C: '#e0a0ff', E: '#ff40ff' });

// ---------- 十個地圖場景（第 N 夜依序輪換）與首領 ----------
const THEMES = [
  { id: 'bone', name: '骸骨墓穴', floor: ['#3a3540', '#36313c', '#3e3944'], wall: '#1c1820', wallTop: '#5b5266', light: '#d8c8ff',
    monsters: ['skeleton', 'archer', 'zombie', 'ghoul', 'bonemage', 'cryptguard', 'wraith', 'maggot', 'bonehound', 'gravedigger'], boss: 'boneking' },
  { id: 'fire', name: '熔岩洞窟', floor: ['#4a2e26', '#452a22', '#50332a'], wall: '#1e100c', wallTop: '#8a3d22', light: '#ffc890',
    monsters: ['imp', 'lavaslime', 'salamander', 'magmagolem', 'hellhound', 'coalbeetle', 'firespirit', 'lavaserpent', 'charred', 'flamebird'], boss: 'witch' },
  { id: 'ice', name: '冰封峽谷', floor: ['#34465a', '#304255', '#394c60'], wall: '#141c26', wallTop: '#7fa8c8', light: '#d0f0ff',
    monsters: ['wolf', 'wisp', 'yeti', 'icebeetle', 'icegolem', 'snowfox', 'icebear', 'frozencorpse', 'snowowl', 'frostsprite'], boss: 'beast' },
  { id: 'cave', name: '幽暗洞穴', floor: ['#3a342c', '#36302a', '#403830'], wall: '#14100c', wallTop: '#5a4c3c', light: '#e8d0a0',
    monsters: ['bat', 'cavespider', 'crawler', 'troglodyte', 'caveworm', 'shroom', 'cavebear', 'stalactite', 'crystalsnail', 'gargoyle'], boss: 'b_cave' },
  { id: 'grass', name: '金色草原', floor: ['#6a6a2a', '#646428', '#707030'], wall: '#2a3a14', wallTop: '#5a7a2a', light: '#fff0b0',
    monsters: ['tiger', 'hyena', 'boar', 'viper', 'vulture', 'wasp', 'bull', 'gnoll', 'gnollarcher', 'lion'], boss: 'b_grass' },
  { id: 'beach', name: '迷霧海灘', floor: ['#b8a878', '#b0a070', '#c0b080'], wall: '#1a3a5a', wallTop: '#4a8ab0', light: '#e0f0ff',
    monsters: ['crab', 'hermit', 'gull', 'murloc', 'jelly', 'seasnake', 'octopus', 'murlocspear', 'pirateghost', 'coralgolem'], boss: 'b_beach' },
  { id: 'swamp', name: '腐沼', floor: ['#3a4228', '#363e24', '#40482c'], wall: '#141a0c', wallTop: '#4a5a28', light: '#d0f0a0',
    monsters: ['frog', 'croc', 'mosquito', 'bogbeast', 'poisonshroom', 'leech', 'bogwitch', 'lizardman', 'rotent', 'watersnake'], boss: 'b_swamp' },
  { id: 'forest', name: '黑森林', floor: ['#2a3a22', '#26361e', '#2e3e26'], wall: '#0e1a0a', wallTop: '#2a4a1a', light: '#c0f0a0',
    monsters: ['treant', 'tarantula', 'bear', 'fairy', 'vine', 'owl', 'stag', 'werewolf', 'goblin', 'thornflower'], boss: 'b_forest' },
  { id: 'desert', name: '沙漠遺跡', floor: ['#a88a58', '#a08450', '#b09060'], wall: '#4a3420', wallTop: '#c8a060', light: '#ffe0a0',
    monsters: ['scorpion', 'mummy', 'sandworm', 'scarab', 'jackalguard', 'duststorm', 'rattlesnake', 'sandlizard', 'stoneguard', 'mummypriest'], boss: 'b_desert' },
  { id: 'void', name: '虛空神殿', floor: ['#241c34', '#201830', '#28203a'], wall: '#0a0610', wallTop: '#4a3a6a', light: '#c8b0ff',
    monsters: ['voideye', 'shade', 'tentacle', 'astralknight', 'nightmarehorse', 'assassin', 'fallen', 'voidworm', 'mirror', 'chaosmage'], boss: 'b_void' },
];
const BOSSES = {
  boneking: { name: '腐骨之王', sprite: 'boneking', life: 1100, dmg: [12, 20], speed: 70, r: 26, xp: 120,
    res: { fire: 10, cold: 30, light: -20, chaos: 60 }, armour: 40,
    desc: '會召喚骷髏、預警後重擊地面。', note: '骨甲很硬，物理打折。怕雷。紅圈出現就快離開。' },
  witch: { name: '焰喉巫后', sprite: 'witch', life: 900, dmg: [10, 17], elem: 'fire', speed: 85, r: 22, xp: 120,
    res: { fire: 75, cold: -25, light: 20, chaos: 0 }, armour: 10,
    desc: '瞬移、放出火球環、在你腳下點燃地面。', note: '免疫火、怕冰。火抗堆高再來。別站在火海裡。' },
  beast: { name: '霜牙巨獸', sprite: 'beast', life: 1250, dmg: [14, 24], elem: 'cold', speed: 80, r: 28, xp: 120,
    res: { fire: -25, cold: 75, light: 10, chaos: 20 }, armour: 30,
    desc: '預警後衝鋒、釋放冰霜新星與冰刺。', note: '免疫冰、怕火。藍色直線是衝鋒路線，往旁邊閃。' },
  // —— 新場景的看守者（用怪物範本放大；ai＝沿用哪一種首領招式；minion＝召喚哪種小怪）——
  b_cave: { name: '洞穴母后', sprite: 'b_cave', tpl: 'insect', scale: 4, ai: 'boneking', minion: 'cavespider', life: 1150, dmg: [12, 20], elem: 'chaos', speed: 75, r: 26, xp: 120,
    pal: { A: '#2a2030', B: '#5a4060', E: '#ff3030' }, res: { fire: -25, cold: 20, light: 0, chaos: 75 }, armour: 25,
    desc: '召喚一窩洞穴蜘蛛、預警後撲擊地面。', note: '怕火、幾乎免疫毒。小蜘蛛很多，先清掉。' },
  b_grass: { name: '草原獸王', sprite: 'b_grass', tpl: 'bigbeast', scale: 4, ai: 'beast', life: 1250, dmg: [14, 24], speed: 95, r: 28, xp: 120,
    pal: { A: '#e8a030', B: '#6a3a10', C: '#fff0d0', E: '#40ff40' }, res: { fire: 20, cold: -25, light: 0, chaos: 0 }, armour: 20,
    desc: '預警後衝鋒、震地怒吼、拋擲碎石。', note: '怕冰。衝鋒時往旁邊閃。' },
  b_beach: { name: '巨鉗蟹王', sprite: 'b_beach', tpl: 'crab', scale: 4, ai: 'boneking', minion: 'crab', life: 1350, dmg: [13, 22], elem: 'cold', speed: 60, r: 30, xp: 120,
    pal: { A: '#c03020', B: '#801810', C: '#ff7050', E: '#ffff60' }, res: { fire: 10, cold: 50, light: -30, chaos: 0 }, armour: 55,
    desc: '召喚小螃蟹、預警後重夾地面。', note: '殼非常硬（護甲高），用元素打；最怕雷。' },
  b_swamp: { name: '沼澤魔女', sprite: 'b_swamp', tpl: 'humanoid', scale: 4, ai: 'witch', life: 950, dmg: [10, 17], elem: 'chaos', speed: 85, r: 22, xp: 120,
    pal: { A: '#8aa070', B: '#2a3a1a', C: '#6a2a6a', E: '#c0ff40' }, res: { fire: -25, cold: 0, light: 20, chaos: 75 }, armour: 10,
    desc: '瞬移、毒球環、在你腳下冒出毒沼。', note: '怕火、免疫毒。堆毒素抗性再來。' },
  b_forest: { name: '古樹之心', sprite: 'b_forest', tpl: 'plant', scale: 4, ai: 'boneking', minion: 'treant', life: 1400, dmg: [12, 20], speed: 50, r: 28, xp: 120,
    pal: { A: '#5a3a20', B: '#3a2a10', C: '#2a6a1a', E: '#ffd040' }, res: { fire: -35, cold: 30, light: 0, chaos: 30 }, armour: 35,
    desc: '召喚樹精、預警後用樹根砸地。', note: '非常怕火。動作慢，可以繞著打。' },
  b_desert: { name: '沙之法老', sprite: 'b_desert', tpl: 'humanoid', scale: 4, ai: 'witch', life: 950, dmg: [11, 18], elem: 'light', speed: 85, r: 22, xp: 120,
    pal: { A: '#e0d0b0', B: '#2a4a8a', C: '#e8c040', E: '#40ff80' }, res: { fire: 50, cold: -25, light: 50, chaos: 0 }, armour: 20,
    desc: '瞬移、雷球環、在你腳下降下雷暴。', note: '怕冰。閃電抗性堆高再來。' },
  b_void: { name: '虛空之主', sprite: 'b_void', tpl: 'eye', scale: 4, ai: 'witch', life: 1050, dmg: [12, 20], elem: 'chaos', speed: 80, r: 26, xp: 120,
    pal: { A: '#2a1040', B: '#7a3aaa', C: '#e0a0ff', E: '#ffffff' }, res: { fire: 20, cold: 20, light: -25, chaos: 75 }, armour: 20,
    desc: '瞬移、虛空彈環、在你腳下打開虛空裂縫。', note: '怕雷、免疫毒。別站在紫色的地面上。' },
};

// =============================================================
//  終局：深層夢境、夢境詞綴、夢魘首領、守門人
// =============================================================
const DEEP_TIER = 11;            // 第 11 夜起是深層夢境（主線五章、十個場景，在第 10 夜結束）
const MAX_LEVEL = 100;
const MON_LIFE_MULT = 1.4;       // v1.7：怪物整體變強（生命 ×1.4、傷害 ×1.3；首領再 ×1.15）
const MON_DMG_MULT = 1.3;
const BOSS_EXTRA = 1.15;
const BOSS_LIFE_EXTRA = 1.5;      // v2.2：首領生命另外算（玩家中後期變強了，首領戰原本 20 秒就結束，拉長到 30 秒上下）
const POISE_BASE = 20;           // v1.6：基礎堅忍值（再加上力量和裝備）
const STUN_TIME = 0.55;          // 堅忍值被打光時硬直幾秒
const DODGE_CAP = 50;            // v1.5：閃避機率上限
const BASE_LIFE_REGEN = 0.6;      // v1.2：每秒基礎回復 0.6% 最大生命（魔力本來就有每秒 5%）
// 怪物等級：主線每夜 +6 級（第 10 夜＝56）；深層夢境每夜 +2 級，最高 100
// v2.5.4 地圖等級＝這張地圖怪物的基準等級。主線第 1–10 夜從 2 級到 60 級；深層夢境（EndGame）每夜 +2，最高 80 級
//   一般怪：地圖等級 −2 ～ 地圖等級；藍色精英 +1；黃色精英 +2；首領（傳奇怪物）+3
const MAP_LEVEL_MAIN = 60, MAP_LEVEL_END = 80;
// v2.18.2 前幾夜的坡度放緩：第 1～10 夜＝2、5、10、17、25、32、39、46、53、60（以前每夜 +6～7，第 1 夜 2 → 第 2 夜 8 太陡）
const MAP_LEVEL_MAINLINE = [2, 5, 10, 17, 25, 32, 39, 46, 53, MAP_LEVEL_MAIN];
function mapLevel(tier) { return tier <= 10 ? MAP_LEVEL_MAINLINE[Math.max(1, tier | 0) - 1] : Math.min(MAP_LEVEL_END, MAP_LEVEL_MAIN + (tier - 10) * 2); }
const MON_LVL_BONUS = { normal: 0, magic: 1, rare: 2, boss: 3 };
const PROJ_SHOTGUN = 0.35;      // v2.5.5 同一次施放的第 2 發起打同一隻怪：35% 傷害
// 怪物強度曲線（等級越高成長越平緩，才能一路打到 100 級）
const monLifeScale = m => Math.pow(1 + 0.12 * (m - 1), 1.6);
const monDmgScale = m => Math.pow(1 + 0.08 * (m - 1), 1.5);
// 夢境詞綴：讓地圖更難，換取更多（q＝數量%）、更好（r＝稀有度%）的掉落
const MAP_MODS = [
  { id: 'mlife', name: '怪物生命 +40%', life: 1.4, q: 8, r: 10 },
  { id: 'mdmg', name: '怪物傷害 +30%', dmg: 1.3, q: 10, r: 12 },
  { id: 'mspd', name: '怪物移動與攻擊速度 +20%', spd: 1.2, q: 8, r: 8 },
  { id: 'mres', name: '怪物元素與毒素抗性 +25%', res: 25, q: 6, r: 10 },
  { id: 'mcrit', name: '怪物暴擊率 +10%', crit: 10, q: 6, r: 6 },
  { id: 'elite', name: '精英怪數量 +60%', elite: 1.6, q: 15, r: 15 },
  { id: 'pack', name: '怪物群規模 +40%', pack: 1.4, q: 20, r: 5 },
  { id: 'noregen', name: '你的生命與魔力回復 −50%', regen: 0.5, q: 10, r: 15 },
  { id: 'lessflask', name: '藥劑充能獲得 −50%', flask: 0.5, q: 6, r: 8 },
  { id: 'elemhit', name: '怪物攻擊附加火焰與冰冷', addElemAll: true, q: 8, r: 8 },
  { id: 'bossbuff', name: '看守者生命與傷害 +50%', bossMult: 1.5, q: 10, r: 20 },
];
const MAP_MOD_BY_ID = {}; MAP_MODS.forEach(m => MAP_MOD_BY_ID[m.id] = m);
const MAX_MAP_MODS = 5;
// 夢魘碎片：深層夢境掉落，湊滿 FRAG_NEED 片挑戰夢魘首領；夢魘首領掉鑰匙，三把湊齊挑戰守門人
const FRAG_NEED = 4;
const NIGHTMARES = {
  bone: { boss: 'nm_bone', frag: '骸骨碎片', key: '骨之鑰', color: '#c8b0ff', theme: 0 },
  ash: { boss: 'nm_ash', frag: '灰燼碎片', key: '灰之鑰', color: '#ff9a50', theme: 1 },
  frost: { boss: 'nm_frost', frag: '冰晶碎片', key: '冰之鑰', color: '#9fe0ff', theme: 2 },
};
const THEME_FRAG = ['bone', 'ash', 'frost'];
// 夢魘版首領：沿用原本的招式，但更快、更硬、更痛
BOSSES.nm_bone = Object.assign({}, BOSSES.boneking, { name: '夢魘．腐骨之王', ai: 'boneking', nightmare: true, life: 2000, cdMult: 0.6,
  tint: { V: '#2a0a3a', W: '#c8b8ff' }, note: '所有招式更快。召喚的骷髏更多。紅圈連續出現時不要停下來。' });
BOSSES.nm_ash = Object.assign({}, BOSSES.witch, { name: '夢魘．焰喉巫后', ai: 'witch', nightmare: true, life: 1700, cdMult: 0.6,
  tint: { R: '#3a0808', O: '#ff4020' }, note: '火球環更密、火海更多。冰冷傷害是你最好的朋友。' });
BOSSES.nm_frost = Object.assign({}, BOSSES.beast, { name: '夢魘．霜牙巨獸', ai: 'beast', nightmare: true, life: 2200, cdMult: 0.6,
  tint: { C: '#1a3a5a', D: '#0a1a2a' }, note: '衝鋒更頻繁、冰霜新星範圍更大。火焰傷害效果最好。' });
BOSSES.keeper = { name: '守門人', ai: 'keeper', life: 3200, dmg: [11, 18], speed: 95, r: 24, xp: 400, cdMult: 0.8,
  res: { fire: 30, cold: 30, light: 30, chaos: 30 }, armour: 50,
  desc: '過去的你。混用三個看守者的招式，生命剩一半時召喚影子。', note: '沒有明顯弱點。看預警、別貪刀，影子出現時先處理影子。' };
const ARENA_LEVEL = { nm_bone: 78, nm_ash: 78, nm_frost: 78, keeper: 80 };   // v2.5.4 地圖等級（首領本身再 +3）
