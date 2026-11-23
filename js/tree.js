// =============================================================
//  天賦樹 v4「星圖」：像星座一樣的天賦圖
//  ・六個職業起點分成三個屬性區：上方智慧（法師、召喚師）、右方敏捷（弓箭手、盜賊）、左下力量（武士、戰士）
//  ・越強的天賦離得越遠：一般核心要走 3–4 個小點，基石（有代價的超強天賦）要走 6 個
//  ・小點可以重複（例如 +4% 生命、+6% 魔力、+4% 全抗），但會依區域靠攏職業特性：
//    生命、護甲只在力量／敏捷那一側；能量護盾、魔力只在智慧那一側，不會離法師很近
//  ・內環、外環兩圈「星河」把所有星座連起來，可以自由走到任何地方
//  要加星座：在 INNER_CONSTS／OUTER_CONSTS 加一行
// =============================================================
const TREE = { nodes: {}, list: [], consts: [] };
const TREE_VERSION = 10; // v2.7.2 內圈改成基礎點（生命、護甲、閃避、護盾）：舊的配點會免費退還
const ATTR_ZH = { str: '力量', dex: '敏捷', int: '智慧' };
const CLASS_RING = [
  ['S_mag', -90, 'mage'], ['S_dru', -30, 'druid'], ['S_ran', 30, 'ranger'],
  ['S_sam', 90, 'samurai'], ['S_war', 150, 'warrior'], ['S_sum', 210, 'summoner'],
];
const ATTR_CENTER = { int: -120, dex: 0, str: 120 };
const angDiff = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
const affinity = (attr, ang) => Math.max(0, 1 - angDiff(ang, ATTR_CENTER[attr]) / 100); // 1＝屬性區正中間，0＝很遠
const mainAt = ang => ['str', 'dex', 'int'].reduce((b, a) => affinity(a, ang) > affinity(b, ang) ? a : b);
const mainOf = cls => CLASSES[cls].main;

function tnode(id, angDeg, rad, kind, name, stats = {}, flags = []) {
  const a = angDeg * Math.PI / 180;
  const n = { id, ang: angDeg, rad, x: Math.cos(a) * rad, y: Math.sin(a) * rad, kind, name, stats, flags, links: [] };
  TREE.nodes[id] = n; TREE.list.push(n);
  return n;
}
function tlink(a, b) {
  if (a === b) return;
  const A = TREE.nodes[a], Bn = TREE.nodes[b];
  if (!A.links.includes(b)) A.links.push(b);
  if (!Bn.links.includes(a)) Bn.links.push(a);
}
// 共同小點：依區域挑（可以重複出現）。生命、護甲不會出現在智慧區；魔力、能量護盾不會出現在力量區
function commonSmall(ang, seed) {
  const s = affinity('str', ang), d = affinity('dex', ang), i = affinity('int', ang), m = mainAt(ang);
  const opts = [
    ['生命', { life_inc: 4 }, i > 0.2 ? 0 : 0.3 + s * 1.3 + d * 0.5],
    ['魔力', { mana_inc: 6 }, s > 0.2 ? 0 : 0.3 + i * 1.3 + d * 0.4],
    ['全抗性', { res_all: 4 }, 0.6],
    [ATTR_ZH[m], { [m]: 8 }, 1.2],
    ['護甲', { armour_inc: 10 }, s > 0.3 ? s : 0],
    ['閃避', { evasion_inc: 10 }, d > 0.3 ? d : 0],
    ['閃避機率', { dodge: 1 }, d > 0.5 ? d * 0.6 : 0],
    ['堅忍', { poise: 6 }, s > 0.3 ? s * 0.7 : 0],
    ['能量護盾', { es_inc: 8 }, i > 0.3 ? i : 0],
  ];
  let tot = 0; for (const o of opts) tot += o[2];
  let r = (hash2(seed, 77) % 10000) / 10000 * tot;
  for (const o of opts) { r -= o[2]; if (r <= 0) return [o[0], o[1]]; }
  return [opts[3][0], opts[3][1]];
}
// v2.7.2 分層：內圈（起點附近）＝基礎點；中圈＝特性（暴擊、流血、中毒…的核心）；外圈＝技能與職業特色（基石、質變）
//   每個內圈星座的前 4 顆一律是基礎點：生命 → 防禦（力量＝護甲、敏捷＝閃避、智慧＝能量護盾）→ 基礎傷害（攻擊／法術／召喚物）→ 速度（攻擊速度／施法速度）
const BASIC_N = 4;
function basicSmall(ang, i) {
  const m = mainAt(ang);
  if (i === 3) return m === 'int' ? ['施法速度', { cspd_inc: 4 }] : ['攻擊速度', { aspd_inc: 4 }];
  if (i === 2) return m === 'int' ? (angDiff(ang, -150) < 35 ? ['召喚物傷害', { minion_dmg_inc: 10 }] : ['法術傷害', { spell_inc: 8 }]) : ['攻擊傷害', { attack_inc: 8 }];
  if (i === 0) return ['生命', { life: m === 'int' ? 8 : m === 'dex' ? 10 : 12 }];
  if (m === 'str') return ['護甲', { armour: 30, armour_inc: 6 }];
  if (m === 'dex') return ['閃避', { evasion: 30, evasion_inc: 6 }];
  return ['能量護盾', { es: 10, es_inc: 4 }];
}
const n_ = (name, stats) => ['notable', name, stats, []];
const k_ = (name, stats, flags = []) => ['keystone', name, stats, flags];

// —— 內圈星座：靠近起點，核心天賦比較溫和（走 3–4 步）——
const INNER_CONSTS = [
  // 智慧區
  [-100, '秘術座', [['法術傷害', { spell_inc: 8 }], ['施法速度', { cspd_inc: 3 }]], 3, n_('秘法精通', { spell_inc: 25, cspd_inc: 6 })],
  [-76, '星盾座', [['能量護盾', { es_inc: 10 }], ['魔力', { mana_inc: 6 }]], 3, n_('秘術屏障', { es_inc: 30, mana_inc: 10 })],
  [-122, '元素座', [['火焰傷害', { fire_inc: 10 }], ['冰冷傷害', { cold_inc: 10 }], ['閃電傷害', { light_inc: 10 }]], 3, n_('元素使者', { ele_inc: 20, ignite_ch: 8, freeze_ch: 5, shock_ch: 8 })],
  [-142, '亡骨座', [['召喚物傷害', { minion_dmg_inc: 10 }]], 3, n_('骨之契約', { minion_dmg_inc: 25, minion_max: 1 })],
  [-161, '咒言座', [['詛咒效果', { curse_eff: 5 }], ['詛咒範圍', { curse_area: 12 }]], 3, n_('惡語術', { curse_max: 1, curse_eff: 10 })],   // v2.7.2 詛咒
  // 敏捷區
  [-46, '鷹眼座', [['暴擊率', { crit_inc: 10 }], ['投射物傷害', { proj_inc: 8 }]], 3, n_('鷹眼射手', { crit_inc: 30, proj_inc: 15 })],
  [-20, '連珠座', [['攻擊速度', { aspd_inc: 3 }], ['投射物傷害', { proj_inc: 8 }]], 3, n_('連珠箭', { aspd_inc: 10, proj_inc: 15 })],
  [5, '疾風座', [['閃避', { evasion_inc: 12 }], ['移動速度', { move_inc: 2 }]], 3, n_('疾風步', { move_inc: 6, evasion_inc: 30 })],
  [26, '影舞座', [['閃避機率', { dodge: 2 }], ['閃避', { evasion_inc: 10 }]], 4, n_('影舞者', { dodge: 6, evasion_inc: 20 })],
  [48, '毒牙座', [['中毒機率', { poison_ch: 8 }], ['中毒傷害', { chaos_inc: 10, dot_inc: 8 }], ['中毒機率', { poison_ch: 8 }], ['中毒傷害', { chaos_inc: 10, dot_inc: 8 }]], 5, n_('毒刃大師', { chaos_inc: 25, poison_ch: 15, dot_inc: 15 })],   // v2.14.2 中毒天賦加多加強（盜賊出生點附近）
  // 力量區
  [72, '一閃座', [['暴擊率', { crit_inc: 10 }], ['近戰傷害', { melee_inc: 8 }], ['暴擊傷害', { crit_multi: 8 }]], 3, n_('一閃', { crit_multi: 25, melee_inc: 15 })],
  [98, '血刃座', [['流血機率', { bleed_ch: 5 }], ['物理傷害', { phys_inc: 8 }], ['持續傷害', { dot_inc: 8 }]], 3, n_('血刃', { bleed_ch: 15, dot_inc: 15 })],
  [122, '鋼鐵座', [['護甲', { armour_inc: 12 }], ['生命', { life_inc: 4 }]], 3, n_('不動如山', { armour_inc: 40, life_inc: 6 })],
  [145, '戰神座', [['生命', { life_inc: 5 }], ['生命回復', { life_regen: 0.3 }]], 3, n_('強健體魄', { life_inc: 15, life_regen: 0.5 })],
  [170, '狂戰座', [['近戰傷害', { melee_inc: 8 }], ['攻擊速度', { aspd_inc: 3 }]], 3, n_('狂戰士', { melee_inc: 25, aspd_inc: 6 })],
  [183, '鋼魂座', [['護甲', { armour_inc: 8 }], ['能量護盾', { es_inc: 8 }]], 3, n_('鋼魂', { armour_inc: 20, es_inc: 20 })],
];
// —— 外圈星座：在外環之外，越強越遠（核心 4–5 步、基石 6 步）——
const OUTER_CONSTS = [
  // 智慧區
  [-102, '星爆座', [['法術傷害', { spell_inc: 10 }], ['元素傷害', { ele_inc: 10 }]], 6, k_('元素超載', { more_spell: 40 }, ['noCrit'])],
  [-76, '心鏡座', [['能量護盾', { es_inc: 12 }], ['魔力回復', { mana_regen_inc: 15 }]], 4, n_('心靈之盾', { es_inc: 30, mana_regen_inc: 30, mana_inc: 10 })],
  [-58, '泉源座', [['魔力', { mana_inc: 6 }], ['施法速度', { cspd_inc: 3 }]], 3, n_('心智之泉', { mana_inc: 15, mana_regen_inc: 25, cspd_inc: 4 })],
  [-126, '風暴座', [['元素傷害', { ele_inc: 10 }], ['暴擊率', { crit_inc: 10 }]], 4, n_('元素風暴', { ele_inc: 20, crit_inc: 25 })],
  [-150, '亡君座', [['召喚物傷害', { minion_dmg_inc: 10 }], ['召喚物生命', { minion_life_inc: 10 }]], 6, k_('亡者之主', { minion_max: 2, more_dmg: -30 })],
  [-172, '冥門座', [['召喚物生命', { minion_life_inc: 12 }]], 5, n_('冥界之門', { minion_life_inc: 25, minion_max: 1 })],
  // 敏捷區
  [-40, '專注座', [['暴擊率', { crit_inc: 12 }], ['暴擊傷害', { crit_multi: 8 }]], 6, k_('完美專注', { crit_inc: 100, life_inc: -15 })],
  [-16, '狙擊座', [['投射物傷害', { proj_inc: 10 }]], 6, k_('狙擊手', { more_proj: 35, proj_count: -1 })],
  [12, '幻影座', [['閃避', { evasion_inc: 12 }], ['閃避機率', { dodge: 2 }]], 5, n_('幻影', { evasion_inc: 40, dodge: 5, life_inc: 4 })],
  [34, '殘影座', [['閃避機率', { dodge: 2 }], ['移動速度', { move_inc: 2 }]], 6, k_('殘影之道', { dodge: 15, armour_inc: -50 })],
  [56, '箭雨座', [['投射物傷害', { proj_inc: 10 }], ['攻擊速度', { aspd_inc: 3 }]], 6, k_('箭雨風暴', { proj_count: 2, more_proj: -30 })],
  // 力量區
  [76, '止水座', [['暴擊率', { crit_inc: 10 }], ['閃避', { evasion_inc: 8 }]], 4, n_('明鏡止水', { crit_inc: 30, evasion_inc: 20 })],
  [96, '居合座', [['攻擊傷害', { attack_inc: 10 }], ['近戰傷害', { melee_inc: 8 }]], 6, k_('居合之道', { aspd_inc: -20, more_attack: 40 })],
  [116, '血渴座', [['生命偷取', { leech: 0.4 }], ['物理傷害', { phys_inc: 10 }]], 6, k_('鮮血渴望', { leech: 2 }, ['noRegen'])],
  [136, '戰血座', [['生命', { life_inc: 5 }]], 4, n_('戰神之血', { life_inc: 12, life_on_kill: 8 })],
  [156, '血魔座', [['生命', { life_inc: 5 }], ['近戰傷害', { melee_inc: 8 }]], 6, k_('血之魔法', { life_inc: 30 }, ['bloodMagic', 'noMana'])],
  [176, '大地座', [['技能範圍', { area_inc: 6 }], ['範圍傷害', { area_dmg_inc: 10 }]], 4, n_('大地震擊', { area_inc: 15, area_dmg_inc: 20 })],
];

// —— 深空：質變基石（改變整個角色的玩法），全部 7 步遠、40 級以上 ——
const DEEP_CONSTS = [
  // 敏捷（弓箭手、盜賊）
  [-28, '分裂星', [['投射物傷害', { proj_inc: 10 }], ['攻擊速度', { aspd_inc: 3 }]], 7, k_('分裂箭', {}, ['projSplit'])],
  [0, '多重星', [['投射物傷害', { proj_inc: 10 }], ['暴擊率', { crit_inc: 10 }]], 7, k_('多重箭矢', { proj_count: 1, more_proj: -10 })],
  [23, '連鎖星', [['投射物傷害', { proj_inc: 10 }], ['閃避', { evasion_inc: 10 }]], 7, k_('連鎖', {}, ['projChain'])],
  // 力量（武士、戰士）
  [86, '餘震星', [['近戰傷害', { melee_inc: 10 }], ['範圍傷害', { area_dmg_inc: 10 }]], 7, k_('餘震', {}, ['aftershock'])],
  [126, '爆裂星', [['爆炸機率', { blast_ch: 2 }], ['範圍傷害', { area_dmg_inc: 10 }]], 7, k_('爆裂之魂', {}, ['corpseBlast'])],
  [146, '不動星', [['堅忍', { poise: 8 }], ['生命', { life_inc: 5 }]], 7, k_('不動明王', { move_inc: -10, life_inc: 10 }, ['noStun'])],
  [166, '巨人星', [['技能範圍', { area_inc: 6 }], ['近戰傷害', { melee_inc: 8 }]], 7, k_('巨人之力', { area_inc: 25, aspd_inc: -10 })],
  // 智慧（法師、召喚師）
  [-88, '雙詠星', [['法術傷害', { spell_inc: 10 }], ['施法速度', { cspd_inc: 3 }]], 7, k_('雙重詠唱', { more_spell: -10 }, ['spellTwin'])],
  [-114, '共鳴星', [['元素傷害', { ele_inc: 10 }], ['暴擊率', { crit_inc: 8 }]], 7, k_('元素共鳴', { ignite_ch: 15, freeze_ch: 10, shock_ch: 15, ele_inc: 10 })],
  [-137, '軍團星', [['召喚物傷害', { minion_dmg_inc: 10 }], ['召喚物生命', { minion_life_inc: 8 }]], 7, k_('亡者軍團', { minion_max: 2, minion_life_inc: -20 })],
  // v2.5.5 新的質變基石
  [48, '回力星', [['投射物傷害', { proj_inc: 10 }], ['投射物速度', { proj_inc: 6 }]], 7, k_('回力', { more_proj: -15 }, ['projReturn'])],
  [68, '鐵壁星', [['格擋', { block: 2 }], ['護甲', { armour_inc: 12 }]], 7, k_('鐵壁反擊', { block: 5 }, ['riposte'])],
  [106, '狂血星', [['生命', { life_inc: 5 }], ['近戰傷害', { melee_inc: 10 }]], 7, k_('嗜血狂怒', { life_inc: -10 }, ['berserk'])],
  [186, '收割星', [['全部傷害', { dmg_inc: 8 }], ['移動速度', { move_inc: 3 }]], 7, k_('靈魂收割', {}, ['soulReap'])],
  [-62, '碎冰星', [['冰冷傷害', { cold_inc: 12 }], ['冰凍機率', { freeze_ch: 3 }]], 7, k_('冰晶碎裂', {}, ['shatter'])],
  [214, '時沙星', [['技能冷卻', { cdr: 3 }], ['施法速度', { cspd_inc: 3 }]], 7, k_('時之沙', {}, ['cdReset'])],
];

function buildTree() {
  const R_START = 290, R_IN = 150, R_OUT = 860, STEP = 52; // v1.7：整棵樹放大，星星之間比較不擠
  // ① 中央與內環星河（12 顆，可重複的共同小點）
  tnode('C', 0, 0, 'notable', '萬物歸一', { str: 10, dex: 10, int: 10, res_all: 6 });
  const inner = [];
  for (let k = 0; k < 12; k++) {
    const ang = -90 + k * 30, [nm, st] = commonSmall(ang, 1000 + k);
    inner.push(tnode(`IN${k}`, ang, R_IN, 'minor', nm, st).id);
  }
  inner.forEach((id, k) => tlink(id, inner[(k + 1) % 12]));
  for (let k = 0; k < 12; k += 2) tlink('C', inner[k]);
  // ② 職業起點：往內接一顆主屬性點到內環；相鄰起點之間有兩顆屬性點
  const anchors = [];
  CLASS_RING.forEach(([id, ang, cls], ci) => {
    tnode(id, ang, R_START, 'start', CLASSES[cls].name + '起點').cls = cls;
    const m = mainOf(cls);
    tnode(`${id}_in`, ang, 220, 'minor', ATTR_ZH[m], { [m]: 10 });
    tlink(id, `${id}_in`); tlink(`${id}_in`, inner[((ang + 90) / 30 + 12) % 12]);
    anchors.push(id);
  });
  CLASS_RING.forEach(([a, angA, ca], i) => {
    const [b] = CLASS_RING[(i + 1) % 6], cb = CLASS_RING[(i + 1) % 6][2];
    const ma = mainOf(ca), mb = mainOf(cb);
    let prev = a;
    [[angA + 20, { [ma]: 10 }], [angA + 40, ma === mb ? { [ma]: 12 } : { [mb]: 10 }]].forEach(([ang, st], k) => {
      const id = `IR${i}_${k}`;
      tnode(id, ang, R_START, 'minor', Object.keys(st).map(x => ATTR_ZH[x]).join('與'), st);
      tlink(prev, id); prev = id; anchors.push(id);
    });
    tlink(prev, b);
  });
  // ③ 外環星河（36 顆，每 10 度一顆）
  const outer = [];
  for (let k = 0; k < 36; k++) {
    const ang = -90 + k * 10, [nm, st] = commonSmall(ang, 2000 + k);
    outer.push(tnode(`OR${k}`, ang, R_OUT, 'minor', nm, st).id);
  }
  outer.forEach((id, k) => tlink(id, outer[(k + 1) % 36]));
  const nearestOuter = ang => outer[Math.round((((ang + 90) % 360) + 360) % 360 / 10) % 36];
  const nearestAnchor = ang => anchors.reduce((b, id) => angDiff(TREE.nodes[id].ang, ang) < angDiff(TREE.nodes[b].ang, ang) ? id : b);
  // ④ 星座：一串小點（走幾步看天賦多強）＋中段一顆共同小點的分支＋最後的核心／基石
  const constellation = (prefix, [ang, cname, smalls, L, tip], r0, anchorId) => {
    let prev = anchorId; const ids = [];
    const basic = prefix[0] === 'A' ? BASIC_N : 0; L += basic ? 2 : 0;   // v2.7.2 內圈星座先走 4 顆基礎點（星座本身的特色點少走 2 顆）
    for (let i = 0; i < L; i++) {
      const [nm, st] = i < basic ? basicSmall(ang, i) : smalls[(i - basic) % smalls.length];
      const id = `${prefix}${i}`;
      tnode(id, ang, r0 + i * STEP, 'minor', nm, Object.assign({}, st));   // v2.14 一串天賦沿直線往外排（以前左右鋸齒交錯，線會上下亂跳）
      tlink(prev, id); prev = id; ids.push(id);
    }
    // 中段長出一顆共同小點（可重複的生命／魔力／抗性…）
    const mi = Math.floor(L / 2), mid = ids[mi], mn = TREE.nodes[mid], side = mi % 2 ? -1 : 1; // 長在鋸齒的另一邊，不會疊在一起
    const [cn, cs] = smalls[(mi + 1) % smalls.length];   // v2.14.2 分支點跟這一串同主題（以前是生命／魔力／護盾輪流，會在召喚星座中間冒出一顆魔力）
    tnode(`${prefix}s`, mn.ang + side * 40 / mn.rad * 180 / Math.PI, mn.rad + 4, 'minor', cn, Object.assign({}, cs));
    tlink(mid, `${prefix}s`);
    const tipId = `${prefix}N`;
    tnode(tipId, ang, r0 + L * STEP + (tip[0] === 'keystone' ? 18 : 6), tip[0], tip[1], tip[2], tip[3]);
    tlink(prev, tipId);
    // 基石旁邊再長兩顆小點，像星座的「冠」
    if (tip[0] === 'keystone') [-1, 1].forEach(sd => {
      const [cn2, cs2] = smalls[(sd + 1) % smalls.length]; const id = `${prefix}c${sd > 0 ? 1 : 0}`;
      const tn = TREE.nodes[tipId]; tnode(id, ang + sd * 7.5 * 600 / tn.rad, tn.rad - 26, 'minor', cn2, Object.assign({}, cs2)); tlink(prev, id);
    });
    TREE.consts.push({ name: cname, ang, rad: r0 + L * STEP + 60, tip: tipId, kind: tip[0] });
    return { ids, tipId };
  };
  // v2.0 過路點：只加一點點主屬性的小星星。強力天賦放得遠，中間用過路點隔開——
  //   想拿外面的大天賦，就得先多花幾點走過去（不再用等級鎖，玩家隨時都知道自己可以往哪走）
  const travel = (id, ang, rad) => { const m = mainAt(ang); const n = tnode(id, ang, rad, 'minor', `過路點・${ATTR_ZH[m]}`, { [m]: 5 }); n.travel = true; return n; };
  INNER_CONSTS.forEach((c, i) => {
    const { tipId } = constellation(`A${i}_`, c, 352, nearestAnchor(c[0]));
    // 核心往外走一串過路點，才接到外環星河（第一顆仍叫 _b，給交錯星橋用）
    const tn = TREE.nodes[tipId], n = Math.max(2, Math.floor((R_OUT - tn.rad - 30) / 56));
    let prev = tipId;
    for (let k = 0; k < n; k++) {
      const id = k === 0 ? `A${i}_b` : `A${i}_b${k + 1}`;
      travel(id, c[0], tn.rad + (R_OUT - tn.rad) * (k + 1) / (n + 1));
      tlink(prev, id); prev = id;
    }
    tlink(prev, nearestOuter(c[0]));
  });
  OUTER_CONSTS.forEach((c, i) => { constellation(`B${i}_`, c, R_OUT + 56, nearestOuter(c[0])); });
  // v1.7 深空：會讓角色玩法「質變」的基石，在最外面；v2.0 從外環出發要先走 4 顆過路點才進得了星座
  //   （直衝最近的質變基石約 21–22 點；想更晚就把 DEEP_TRAVEL 調大，每多 1 顆就多 1 點）
  const DEEP_TRAVEL = 4;
  DEEP_CONSTS.forEach((c, i) => {
    let prev = nearestOuter(c[0]);
    for (let k = 0; k < DEEP_TRAVEL; k++) { travel(`D${i}_t${k}`, c[0], R_OUT + 56 + STEP * k); tlink(prev, `D${i}_t${k}`); prev = `D${i}_t${k}`; }
    constellation(`D${i}_`, c, R_OUT + 56 + STEP * DEEP_TRAVEL, prev);
  });
  // ⑤ v1.6 交錯的星橋：相鄰星座之間多拉幾條線，讓路線更錯綜
  const byAng = (list) => list.map((c, i) => [c[0], i]).sort((a, b) => a[0] - b[0]);
  const linkNeighbors = (list, prefix, pick, maxGap) => {
    const s = byAng(list);
    s.forEach(([ang, i], k) => {
      const [ang2, j] = s[(k + 1) % s.length];
      if (angDiff(ang, ang2) > maxGap) return;
      const a = pick(prefix, i), b = pick(prefix, j);
      if (TREE.nodes[a] && TREE.nodes[b]) tlink(a, b);
    });
  };
  linkNeighbors(INNER_CONSTS, 'A', (p, i) => `${p}${i}_1`, 32);            // 內圈星座的第 2 顆互連（一圈）
  linkNeighbors(INNER_CONSTS, 'A', (p, i) => `${p}${i}_b`, 32);            // 內圈的橋互連（再一圈）
  linkNeighbors(OUTER_CONSTS, 'B', (p, i) => `${p}${i}_2`, 30);            // 外圈星座的第 3 顆互連
  linkNeighbors(OUTER_CONSTS, 'B', (p, i) => `${p}${i}_s`, 30);            // 外圈星座的分支互連
  // 斜向的線：內圈星座的分支 → 隔壁星座的橋；起點旁的屬性點 → 內環
  const sIn = byAng(INNER_CONSTS);
  sIn.forEach(([ang, i], k) => { const [ang2, j] = sIn[(k + 1) % sIn.length]; if (angDiff(ang, ang2) <= 32) tlink(`A${i}_s`, `A${j}_b`); });
  for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) {
    const id = `IR${i}_${k}`, n = TREE.nodes[id];
    tlink(id, inner[Math.round((((n.ang + 90) % 360) + 360) % 360 / 30) % 12]);
  }
  // ⑥ 依天賦類型上色
  // ⑦ v2.0：不再有等級門檻（改用過路點拉開距離）；深空的核心標記成「質變」
  for (const n of TREE.list) if (/^D\d+_N$/.test(n.id)) n.deep = true;
  // ⑧ 把太靠近的星星推開（起點和中央不動），讓樹看起來不會黏在一起
  const MIN = 40, fixed = n => n.kind === 'start' || n.id === 'C';
  for (let it = 0; it < 60; it++) {
    let moved = false;
    for (let a = 0; a < TREE.list.length; a++) for (let b = a + 1; b < TREE.list.length; b++) {
      const A = TREE.list[a], B = TREE.list[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.01;
      if (d >= MIN) continue;
      const push = (MIN - d) / 2, ux = dx / d, uy = dy / d;
      if (!fixed(A)) { A.x -= ux * push * (fixed(B) ? 2 : 1); A.y -= uy * push * (fixed(B) ? 2 : 1); }
      if (!fixed(B)) { B.x += ux * push * (fixed(A) ? 2 : 1); B.y += uy * push * (fixed(A) ? 2 : 1); }
      moved = true;
    }
    if (!moved) break;
  }
  untangleTree();   // v2.5.4 連線不交叉、不穿過星星
  // v2.7 互斥的基石：投射物「數量」的取捨只能選一邊（不然狙擊手＋多重箭矢＝支數不變、傷害白賺）
  const byName = nm => TREE.list.find(n => n.name === nm && n.kind === 'keystone');
  for (const [a, b] of [['狙擊手', '多重箭矢'], ['狙擊手', '箭雨風暴']]) { const A = byName(a), B = byName(b); if (A && B) { (A.excl = A.excl || []).push(B.id); (B.excl = B.excl || []).push(A.id); } }
  for (const n of TREE.list) { n.rad = Math.hypot(n.x, n.y); n.ang = Math.atan2(n.y, n.x) * 180 / Math.PI; }
  for (const n of TREE.list) n.cat = treeCat(n);
}
// v2.5.4 整理連線：讓整張樹像一張網，但線不會交叉、也不會穿過別的星星
//  ① 星星如果壓在別人的連線上，把它往旁邊推開
//  ② 還交叉的連線，從最長的開始拿掉——前提是拿掉之後，每顆星星都還走得到（只拿掉「多的那條路」）
function untangleTree() {
  const N = TREE.list, CLEAR = 18;
  // v2.7 預先算好的結果（js/treecache.js）：星星數量和編號一樣就直接套用，開遊戲省下約 1 秒
  const sig = N.reduce((a, n) => (a * 31 + Math.round(n.x) * 7 + Math.round(n.y) * 13 + n.links.length) % 1000000007, 7); TREE.sig = sig;
  if (typeof TREE_CACHE !== 'undefined' && TREE_CACHE && TREE_CACHE.sig === sig && TREE_CACHE.n === N.length && N.every(n => TREE_CACHE.p[n.id])) {
    for (const n of N) { const c = TREE_CACHE.p[n.id]; n.x = c[0]; n.y = c[1]; n.links = c[2].slice(); }
    return;
  }
  // v2.14 這台裝置上次算好的結果（存在瀏覽器裡）：樹改版後每台裝置只要第一次開遊戲算一次
  const LS = 'moe_treecache';
  try { const c = JSON.parse(localStorage.getItem(LS) || 'null'); if (c && c.sig === sig && c.n === N.length && N.every(n => c.p[n.id])) { for (const n of N) { const p = c.p[n.id]; n.x = p[0]; n.y = p[1]; n.links = p[2].slice(); } return; } } catch (e) { }
  const saveLS = () => { try { const p = {}; for (const n of N) p[n.id] = [Math.round(n.x * 10) / 10, Math.round(n.y * 10) / 10, n.links.slice()]; localStorage.setItem(LS, JSON.stringify({ sig, n: N.length, p })); } catch (e) { } };
  const edges = () => { const E = []; for (const n of N) for (const l of n.links) if (l > n.id) E.push([n, TREE.nodes[l]]); return E; };
  const segDist = (p, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2)); return { d: Math.hypot(p.x - a.x - vx * t, p.y - a.y - vy * t), t, vx, vy }; };
  const cross = (p1, p2, p3, p4) => { const s = (a, b, c) => (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x); return ((s(p3, p4, p1) > 0) !== (s(p3, p4, p2) > 0)) && ((s(p1, p2, p3) > 0) !== (s(p1, p2, p4) > 0)); };
  const fixed = n => n.kind === 'start' || n.id === 'C';
  // ① 推開壓線的星星
  for (let it = 0; it < 40; it++) {
    let moved = false;
    for (const [a, b] of edges()) for (const n of N) {
      if (n === a || n === b || fixed(n)) continue;
      const r = segDist(n, a, b); if (r.d >= CLEAR || r.t <= 0.02 || r.t >= 0.98) continue;
      const L = Math.hypot(r.vx, r.vy) || 1; let nx = -r.vy / L, ny = r.vx / L;
      if ((n.x - a.x) * nx + (n.y - a.y) * ny < 0) { nx = -nx; ny = -ny; }   // 往它本來在的那一邊推
      const push = (CLEAR - r.d) * 0.6 + 0.5; n.x += nx * push; n.y += ny * push; moved = true;
    }
    if (!moved) break;
  }
  // ② 拿掉交叉、或還是穿過星星的多餘連線
  const unlink = (a, b) => { a.links = a.links.filter(x => x !== b.id); b.links = b.links.filter(x => x !== a.id); };
  const connected = () => { const seen = new Set(['C']), q = ['C']; while (q.length) { const id = q.pop(); for (const l of TREE.nodes[id].links) if (!seen.has(l)) { seen.add(l); q.push(l); } } return seen.size === N.length; };
  for (let it = 0; it < 30; it++) {
    const E = edges(), bad = new Map();
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const [a, b] = E[i], [c, d] = E[j]; if (a === c || a === d || b === c || b === d) continue;
      if (cross(a, b, c, d)) { bad.set(i, (bad.get(i) || 0) + 1); bad.set(j, (bad.get(j) || 0) + 1); }
    }
    for (let i = 0; i < E.length; i++) { const [a, b] = E[i]; if (N.some(n => n !== a && n !== b && segDist(n, a, b).d < CLEAR - 4)) bad.set(i, (bad.get(i) || 0) + 2); }
    if (!bad.size) break;
    // 交叉越多、越長的先拿
    const order = [...bad.keys()].sort((i, j) => bad.get(j) - bad.get(i) || Math.hypot(E[j][0].x - E[j][1].x, E[j][0].y - E[j][1].y) - Math.hypot(E[i][0].x - E[i][1].x, E[i][0].y - E[i][1].y));
    let removed = 0;
    for (const i of order) {
      const [a, b] = E[i]; if (!a.links.includes(b.id)) continue;
      unlink(a, b);
      if (!connected()) { a.links.push(b.id); b.links.push(a.id); continue; }   // 拿掉會斷路：保留
      removed++;
      // 這條拿掉後，跟它交叉的那幾條可能就不用拿了：重新算
      if (removed >= 8) break;
    }
    if (!removed) break;
  }
  saveLS();
}
// 天賦分類與顏色（星星的顏色＝這顆天賦是哪一類）
const TREE_CATS = {
  life: { name: '生命', color: '#ff6060' }, mana: { name: '魔力', color: '#5a8cff' }, def: { name: '防禦', color: '#7fe0ff' },
  attack: { name: '攻擊', color: '#ff9a40' }, spell: { name: '法術', color: '#c080ff' }, crit: { name: '暴擊', color: '#ffe050' },
  minion: { name: '召喚', color: '#a8f070' }, ail: { name: '異常', color: '#ff70c8' }, attr: { name: '屬性', color: '#e8dcb0' }, util: { name: '其他', color: '#ffffff' }, deep: { name: '質變', color: '#ff8cff' },
};
function treeCat(n) {
  const k = Object.keys(n.stats);
  if (n.kind === 'start') return 'attr';
  if (n.deep) return 'deep';
  const has = (...xs) => xs.some(x => k.includes(x));
  if (has('minion_dmg_inc', 'minion_life_inc', 'minion_max')) return 'minion';
  if (has('life_inc', 'life', 'life_regen', 'life_on_kill', 'leech') && !has('es_inc', 'evasion_inc', 'armour_inc', 'es', 'armour', 'evasion')) return 'life';
  if (has('poison_ch', 'bleed_ch', 'dot_inc', 'chaos_inc', 'ignite_ch', 'curse_eff', 'curse_max', 'curse_area')) return 'ail';
  if (has('crit_inc', 'crit_multi')) return 'crit';
  if (has('spell_inc', 'cspd_inc', 'ele_inc', 'fire_inc', 'cold_inc', 'light_inc', 'more_spell')) return 'spell';
  if (has('mana_inc', 'mana_regen_inc')) return 'mana';
  if (has('melee_inc', 'attack_inc', 'phys_inc', 'aspd_inc', 'proj_inc', 'more_proj', 'more_attack', 'proj_count')) return 'attack';
  if (has('armour_inc', 'evasion_inc', 'es_inc', 'armour', 'evasion', 'es', 'dodge', 'block', 'res_all', 'poise')) return 'def';
  if (has('str', 'dex', 'int', 'all_attr')) return 'attr';
  return 'util';
}
buildTree();

// ---------- 配點邏輯 ----------
// 天賦點數＝等級 −1 ＋ 任務給的額外點數
function treePointsTotal(P) { return P.lvl - 1 + (P.bonusPts || 0); }
// 退點：10 級以前免費，之後每退 1 點要花 1 點「重置點數」
const FREE_RESPEC_LVL = 10;
function respecFree(P) { return P.lvl < FREE_RESPEC_LVL; }
function resetAllCost(P) { return respecFree(P) ? 0 : Math.ceil((P.tree.length - 1) / 5); }
function treePointsUsed(P) { return P.tree.length - 1; }
function canAllocate(P, id) {
  const tn = TREE.nodes[id]; if (tn.lvl && P.lvl < tn.lvl) return false; // 等級不夠
  if (P.tree.includes(id)) return false;
  if (tn.excl && tn.excl.some(x => P.tree.includes(x))) return false;   // v2.7 互斥的基石
  if (treePointsUsed(P) >= treePointsTotal(P)) return false;
  return TREE.nodes[id].links.some(l => P.tree.includes(l));
}
function canRefund(P, id) {
  if (!P.tree.includes(id) || id === CLASSES[P.cls].start) return false;
  const rest = new Set(P.tree.filter(x => x !== id));
  const start = CLASSES[P.cls].start;
  const seen = new Set([start]); const q = [start];
  while (q.length) {
    const c = q.pop();
    for (const l of TREE.nodes[c].links) if (rest.has(l) && !seen.has(l)) { seen.add(l); q.push(l); }
  }
  return seen.size === rest.size;
}

// ---------- 天賦樹畫面 ----------
const TreeView = {
  canvas: null, g: null, scale: 0.85, ox: 0, oy: 0, hover: null, drag: null,
  init(canvas) {
    this.canvas = canvas; this.g = canvas.getContext('2d');
    // 用 pointer 事件：滑鼠和手指都能用。兩根手指＝縮放
    canvas.style.touchAction = 'none';
    this.pts = new Map();
    canvas.addEventListener('pointerdown', e => {
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pts.size === 2) { // 開始雙指縮放
        const [a, b] = [...this.pts.values()];
        this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), scale: this.scale, ox: this.ox, oy: this.oy };
        if (this.drag) this.drag.moved = true;
        return;
      }
      const r = canvas.getBoundingClientRect();
      this.touchMode = e.pointerType === 'touch' || IS_TOUCH;   // v2.12.7 手指點：判定範圍放大、挑最近的點（v2.19.7 手機版一律用「點選＋確認鈕」）
      this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top, cx: e.clientX, cy: e.clientY };
      this.updateHover();
      this.drag = { x: e.clientX, y: e.clientY, ox: this.ox, oy: this.oy, moved: false, btn: e.button, touch: this.touchMode };
    });
    window.addEventListener('pointermove', e => {
      if (!UI.treeOpen) return;
      if (this.pts.has(e.pointerId)) this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch && this.pts.size === 2) {
        const [a, b] = [...this.pts.values()], r = canvas.getBoundingClientRect();
        const ns = Math.max(0.25, Math.min(2.2, this.pinch.scale * Math.hypot(a.x - b.x, a.y - b.y) / this.pinch.d));
        const mx = (a.x + b.x) / 2 - r.left - canvas.width / 2, my = (a.y + b.y) / 2 - r.top - canvas.height / 2, k = ns / this.pinch.scale;
        this.ox = mx - (mx - this.pinch.ox) * k; this.oy = my - (my - this.pinch.oy) * k; this.scale = ns;
        return;
      }
      if (this.drag) {
        const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > (this.drag.touch ? 14 : 4)) this.drag.moved = true;
        this.ox = this.drag.ox + dx; this.oy = this.drag.oy + dy;
      }
      if (e.pointerType === 'touch' && !this.drag) return; // 手指沒按著就沒有「滑過」
      const r = canvas.getBoundingClientRect();
      this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top, cx: e.clientX, cy: e.clientY };
      if (!(this.drag && this.drag.touch && this.drag.moved)) this.updateHover();
    });
    const up = e => {
      this.pts.delete(e.pointerId);
      if (this.pts.size < 2) this.pinch = null;
      if (!this.drag) return;
      const d = this.drag; this.drag = null;
      if (d.moved) return;   // 拖曳、縮放：選取的點留著
      if (d.touch) {
        // v2.19.7 手機：點一下＝選取（高亮＋下方說明卡），按說明卡上的「點這個天賦」才點；點空白處＝取消選取（說明卡在 treeplan.js 的 TreePlan.sel）
        this.tapSel = this.hover ? this.hover.id : null;
        UI.hideTip(); TreePlan.sel(true);
        return;
      }
      if (!this.hover) return;
      if (d.btn === 0) this.tryAlloc(this.hover.id);
      if (d.btn === 2) this.tryRefund(this.hover.id);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left - canvas.width / 2, my = e.clientY - r.top - canvas.height / 2;
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const ns = Math.max(0.25, Math.min(2.2, this.scale * f));
      const k = ns / this.scale;
      this.ox = mx - (mx - this.ox) * k; this.oy = my - (my - this.oy) * k;
      this.scale = ns;
    }, { passive: false });
  },
  center() {
    const s = TREE.nodes[CLASSES[G.P.cls].start];
    this.scale = typeof IS_TOUCH !== 'undefined' && IS_TOUCH ? 1.15 : 0.85; this.ox = -s.x * this.scale * 0.6; this.oy = -s.y * this.scale * 0.6;   // 手機一打開就放大一點
  },
  toScreen(n) { return { x: this.canvas.width / 2 + this.ox + n.x * this.scale, y: this.canvas.height / 2 + this.oy + n.y * this.scale }; },
  nodeR(n) { return ({ minor: 6, notable: 13, keystone: 19, start: 20 })[n.kind] * Math.max(0.75, this.scale); },
  updateHover() {
    if (!this.mouse) return;
    // v2.12.7 挑「離手指最近」的點；手指的判定範圍比滑鼠大很多（小天賦點畫出來只有 5 像素，手指根本點不準）
    let best = null, bd = 1e9; const pad = this.touchMode ? 24 : 7;
    for (const n of TREE.list) {
      const p = this.toScreen(n);
      const d = Math.hypot(p.x - this.mouse.x, p.y - this.mouse.y);
      if (d < this.nodeR(n) + pad && d - this.nodeR(n) < bd) { best = n; bd = d - this.nodeR(n); }
    }
    this.hover = best;
    if (this.touchMode) UI.hideTip();   // 手機：說明放在下方的說明卡（treeplan.js），不跳浮動說明
    else if (best) UI.showTip(this.nodeTip(best), this.mouse.cx, this.mouse.cy);
    else UI.hideTip();
  },
  nodeTip(n) {
    const P = G.P;
    const kindName = { minor: '天賦', notable: '核心天賦', keystone: '基石', start: '起點' }[n.kind];
    let h = `<div class="tip-name ${n.kind === 'keystone' ? 'c-unique' : n.kind === 'notable' ? 'c-rare' : ''}">${n.name}</div><div class="tip-sub">${kindName}${n.cat && n.kind !== "start" ? ` · <span style="color:${TREE_CATS[n.cat].color}">${TREE_CATS[n.cat].name}類</span>` : ""}</div><div class="tip-sep"></div>`;
    for (const k in n.stats) h += `<div class="tip-mod">${STAT_TEXT[k] ? STAT_TEXT[k](n.stats[k]) : k}</div>`;
    for (const f of n.flags) h += `<div class="tip-mod c-unique">${STAT_TEXT[f]()}</div>`;
    if (n.kind === 'start') h += `<div class="tip-mod">${n.cls === P.cls ? '你的起點' : '其他職業的起點（可花 1 點通過）'}</div>`;
    if (n.excl) h += `<div class="tip-req ${n.excl.some(x => P.tree.includes(x)) ? 'c-bad' : ''}">與「${n.excl.map(x => TREE.nodes[x].name).join('」「')}」互斥，只能選一個</div>`;   // v2.7
    if (n.lvl) h += `<div class="tip-req ${P.lvl < n.lvl ? 'c-bad' : ''}">需要等級 ${n.lvl}${n.deep ? '（質變基石：會改變整個角色的玩法）' : ''}</div>`;
    const alloc = P.tree.includes(n.id);
    h += `<div class="tip-hint">${alloc ? (canRefund(P, n.id) ? (respecFree(P) ? `${byCtl('右鍵', '再點一下')}：取消配點（${FREE_RESPEC_LVL} 級前免費）` : `${byCtl('右鍵', '再點一下')}：取消配點（花 1 點重置點數，剩 ${P.respec || 0}）`) : '已配點') : canAllocate(P, n.id) ? byCtl('左鍵：配點', '再點一下：配點') : '需要先點亮相鄰的天賦'}</div>`;
    return h;
  },
  tryAlloc(id) {
    if (canAllocate(G.P, id)) { G.P.tree.push(id); onBuildChanged(); this.updateHover(); }
  },
  tryRefund(id) {
    const P = G.P;
    if (!canRefund(P, id)) return;
    if (!respecFree(P)) {
      if ((P.respec || 0) < 1) return UI.msg('重置點數不夠（任務獎勵、或用混沌石跟歐莉換）', '#ff9a9a');
      P.respec--;
    }
    P.tree = P.tree.filter(x => x !== id); onBuildChanged(); this.updateHover();
  },
  // 星圖畫面：深色星空＋三個屬性區的星雲；小點是小星星、核心是四芒星、基石是八芒星
  stars: null,
  draw() {
    const c = this.canvas, g = this.g, P = G.P, sc = this.scale;
    if (c.width !== c.clientWidth || c.height !== c.clientHeight) { c.width = c.clientWidth; c.height = c.clientHeight; }
    g.fillStyle = '#05040a'; g.fillRect(0, 0, c.width, c.height);
    // 星雲：力量紅、敏捷綠、智慧藍
    g.globalCompositeOperation = 'lighter';
    for (const [attr, col] of [['str', '200,60,50'], ['dex', '50,170,90'], ['int', '70,100,230']]) {
      const a = ATTR_CENTER[attr] * Math.PI / 180, p = this.toScreen({ x: Math.cos(a) * 520, y: Math.sin(a) * 520 }), R = 620 * sc;
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, R); gr.addColorStop(0, `rgba(${col},0.16)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(p.x - R, p.y - R, R * 2, R * 2);
    }
    // 背景小星星（固定位置，跟著拖曳移動一點點，有景深感）
    if (!this.stars) { this.stars = []; for (let i = 0; i < 420; i++) { const h = hash2(i, 911); this.stars.push({ x: (h % 2400) - 1200, y: ((h >> 12) % 2400) - 1200, s: 0.5 + (h % 7) / 6, tw: (h % 100) / 10 }); } }
    for (const s of this.stars) {
      const x = c.width / 2 + this.ox * 0.5 + s.x * sc * 0.6, y = c.height / 2 + this.oy * 0.5 + s.y * sc * 0.6;
      if (x < 0 || y < 0 || x > c.width || y > c.height) continue;
      g.globalAlpha = 0.25 + 0.25 * Math.sin(G.time * 1.5 + s.tw); g.fillStyle = '#cfd8ff'; g.fillRect(x, y, s.s, s.s);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const has = new Set(P.tree);
    // 連線：沒點的是淡淡的星線，點了的是金色發光
    for (const n of TREE.list) for (const l of n.links) {
      if (l < n.id) continue;
      const o = TREE.nodes[l], a = this.toScreen(n), b = this.toScreen(o);
      const both = has.has(n.id) && has.has(l), one = has.has(n.id) || has.has(l);
      // v2.5.4 連線更好認：先畫一條深色底線讓線從星雲裡跳出來；
      //   已點＝金色發光粗線、可以點下一步＝亮的虛線（會流動）、還沒走到＝清楚的淡藍線
      const k = Math.max(0.7, sc);
      g.lineCap = 'round';
      // v2.14 POE 風格：兩顆星在同一圈上（離中心一樣遠）＝沿著圓弧連；其他＝直線。線全部加粗
      const path = () => { g.beginPath(); const ra = Math.hypot(n.x, n.y), rb = Math.hypot(o.x, o.y);
        let aa = Math.atan2(n.y, n.x), ab = Math.atan2(o.y, o.x), da = ab - aa; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        if (ra > 60 && Math.abs(ra - rb) < 24 && Math.abs(da) > 0.02 && Math.abs(da) < 1.2) { const R = (ra + rb) / 2 * sc, cx = c.width / 2 + this.ox, cy = c.height / 2 + this.oy; g.moveTo(a.x, a.y); g.arc(cx, cy, R, aa, aa + da, da < 0); g.lineTo(b.x, b.y); }
        else { g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); } };
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = (both ? 8 : 6) * k; path(); g.stroke();
      if (both) { g.strokeStyle = 'rgba(255,200,90,0.35)'; g.lineWidth = 12 * Math.max(0.6, sc); path(); g.stroke(); }
      g.strokeStyle = both ? '#ffd27a' : one ? 'rgba(255,236,170,0.95)' : 'rgba(150,165,220,0.55)';
      g.lineWidth = (both ? 4.5 : one ? 3.4 : 2.8) * k;
      if (one && !both) { g.setLineDash([8 * k, 5 * k]); g.lineDashOffset = -G.time * 18; }
      path(); g.stroke();
      g.setLineDash([]); g.lineCap = 'butt';
    }
    // 星座名稱
    if (sc > 0.4) {
      g.font = `${Math.round(13 * Math.max(0.8, sc))}px "Microsoft JhengHei", sans-serif`; g.textAlign = 'center';
      for (const k of TREE.consts) {
        const a = k.ang * Math.PI / 180, p = this.toScreen({ x: Math.cos(a) * k.rad, y: Math.sin(a) * k.rad });
        g.fillStyle = k.kind === 'keystone' ? 'rgba(255,170,100,0.55)' : 'rgba(200,210,255,0.4)'; g.fillText(k.name, p.x, p.y);
      }
    }
    // 星星（節點）
    const starPath = (x, y, pts, r1, r2, rot = -Math.PI / 2) => { g.beginPath(); for (let i = 0; i < pts * 2; i++) { const a = rot + i * Math.PI / pts, r = i % 2 ? r2 : r1; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); };
    for (const n of TREE.list) {
      const p = this.toScreen(n), r = this.nodeR(n);
      if (p.x < -40 || p.y < -40 || p.x > c.width + 40 || p.y > c.height + 40) continue;
      const alloc = has.has(n.id), avail = canAllocate(P, n.id);
      const cc = TREE_CATS[n.cat || 'util'].color; // 依類型上色
      const glowC = n.kind === 'start' ? CLASSES[n.cls].color : alloc ? cc : avail ? '#a0ff90' : cc;
      // 光暈
      const gl = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * (alloc ? 3 : 2.2));
      gl.addColorStop(0, glowC + (alloc ? 'cc' : avail ? '66' : '30')); gl.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gl; g.fillRect(p.x - r * 3, p.y - r * 3, r * 6, r * 6);
      // 本體
      const body = n.kind === 'start' ? CLASSES[n.cls].color : alloc ? artShade(cc, 0.15) : avail ? artShade(cc, -0.1) : artShade(cc, -0.55);
      g.fillStyle = body; g.strokeStyle = alloc ? '#fff8e0' : avail ? '#a0ff90' : 'rgba(255,255,255,0.35)'; g.lineWidth = n.kind === 'minor' ? 1 : 1.6;
      if (n.kind === 'keystone') starPath(p.x, p.y, 8, r, r * 0.55);
      else if (n.kind === 'notable') starPath(p.x, p.y, 4, r, r * 0.45, -Math.PI / 2);
      else { g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); }
      g.fill(); g.stroke();
      if (n.kind === 'start') { g.strokeStyle = alloc ? '#ffe080' : 'rgba(255,255,255,0.5)'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, r + 4, 0, Math.PI * 2); g.stroke(); }
      if (this.hover === n) { g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, r + 5, 0, Math.PI * 2); g.stroke(); }
      if (n.kind !== 'minor' && sc > 0.5) {
        g.fillStyle = n.kind === 'start' ? '#ffffff' : alloc ? '#ffe9a8' : n.kind === 'keystone' ? '#ffb880' : '#c8c0e0';
        g.font = `${n.kind === 'start' ? 15 : 12}px "Microsoft JhengHei", sans-serif`; g.textAlign = 'center';
        g.fillText(n.kind === 'start' ? CLASSES[n.cls].name : n.name, p.x, p.y + r + 14);
        if (n.lvl && P.lvl < n.lvl) { g.fillStyle = '#ff8a7a'; g.font = '11px "Microsoft JhengHei", sans-serif'; g.fillText(`Lv ${n.lvl}`, p.x, p.y + r + 27); }
      }
    }
    // 顏色圖例（左下角）；v2.12.7 畫面矮（手機）時縮小一半、每排 10 個
    const small = c.height < 420, per = small ? 10 : 5, cw = small ? 44 : 74, rh = small ? 13 : 20;
    g.font = (small ? 9 : 12) + 'px "Microsoft JhengHei", sans-serif'; g.textAlign = 'left';
    const cats = Object.values(TREE_CATS), lx = 12, ly = c.height - (small ? 8 : 14) - Math.ceil(cats.length / per) * rh;
    g.fillStyle = 'rgba(5,4,10,0.75)'; g.fillRect(lx - 6, ly - rh + 4, per * cw + 8, Math.ceil(cats.length / per) * rh + 6);
    cats.forEach((ct, i) => {
      const x = lx + (i % per) * cw, y = ly + Math.floor(i / per) * rh, cr = small ? 3.5 : 5;
      g.fillStyle = ct.color; g.beginPath(); g.arc(x + cr + 1, y - cr + 1, cr, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d8d0e0'; g.fillText(ct.name, x + cr * 2 + 4, y);
    });
    // 屬性區標題
    g.font = '20px "Microsoft JhengHei", sans-serif'; g.textAlign = 'center';
    [['int', '智慧之域', '#8fb0ff'], ['dex', '敏捷之域', '#8fe0a0'], ['str', '力量之域', '#ff9a8a']].forEach(([a, t, col]) => {
      const rad = ATTR_CENTER[a] * Math.PI / 180, p = this.toScreen({ x: Math.cos(rad) * 980, y: Math.sin(rad) * 980 });
      g.fillStyle = col; g.globalAlpha = 0.6; g.fillText(t, p.x, p.y); g.globalAlpha = 1;
    });
  },
};
