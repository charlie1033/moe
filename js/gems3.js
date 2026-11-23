// =============================================================
//  v2.9.1 更多技能寶石：每個職業多 2 個技能選擇（v2.17 起這裡的輔助寶石已併掉）
//  技能（標 cls 的前期比較容易掉給那個職業，但任何職業都能用，看屬性需求）
// =============================================================
Object.assign(SKILLS, {
  // 戰士
  quake: { name: '震盪波', icon: '盪', color: '#c89050', lvl: 12, cls: 'warrior', tags: ['attack', 'melee', 'area'], cost: 8, eff: 1.05, speed: 0.75,
    type: 'nova', radius: 135, need: 'melee', ail: { bleed: 10 }, desc: '以自己為中心砸出大範圍震波，打中周圍所有敵人。範圍比旋風斬大、但比較慢。' },
  cleave: { name: '劈砍', icon: '劈', color: '#d8b080', lvl: 3, cls: 'warrior', tags: ['attack', 'melee', 'area'], cost: 4, eff: 1.15, speed: 0.95,
    type: 'melee', range: 74, arc: 3.0, need: 'melee', ail: { bleed: 15 }, desc: '大弧度的一刀，前方半圈的敵人都會被砍到。清怪用的近戰技能。' },
  // 武士
  bladewind: { name: '刃風', icon: '刃', color: '#e8e0b0', lvl: 9, cls: 'samurai', tags: ['attack', 'projectile'], cost: 6, eff: 0.75, speed: 1.0,
    type: 'proj', count: 3, spread: 0.45, pspeed: 560, pierce: 2, need: 'melee', sprite: 'shadow', ail: { bleed: 20 }, desc: '揮刀斬出三道刀氣，各穿透 2 個敵人。近戰武器也能打遠。' },
  thousandcuts: { name: '千刃', icon: '千', color: '#fff0c0', lvl: 16, cls: 'samurai', tags: ['attack', 'melee'], cost: 9, eff: 0.32, speed: 0.75,
    type: 'combo', hits: 5, range: 72, arc: 1.6, need: 'melee', dpsMul: 6, ail: { bleed: 25 }, desc: '一口氣連斬五刀，最後一刀加倍。單體爆發最高的武士技能。' },
  // 盜賊
  fanknives: { name: '扇形飛刀', icon: '扇', color: '#c8d8e8', lvl: 7, cls: 'ranger', tags: ['attack', 'projectile'], cost: 6, eff: 0.55, speed: 1.0,
    type: 'proj', count: 6, spread: 1.4, pspeed: 600, sprite: 'arrow', ail: { poison: 25 }, desc: '一次丟出六把扇形飛刀，近距離整片掃過去。' },
  viper: { name: '蛇吻', icon: '吻', color: '#7ad060', lvl: 11, cls: 'ranger', tags: ['attack', 'melee'], cost: 4, eff: 0.9, speed: 1.5,
    type: 'melee', range: 54, arc: 1.2, need: 'melee', ail: { poison: 80 }, desc: '極快的毒刺，80% 機率中毒。配持續傷害輔助很強。' },
  // 弓箭手
  barrage: { name: '連珠射擊', icon: '珠', color: '#e0d090', lvl: 12, cls: 'druid', tags: ['attack', 'projectile'], cost: 7, eff: 0.5, speed: 0.9,
    type: 'proj', count: 4, spread: 0.06, pspeed: 760, need: 'bow', sprite: 'arrow', desc: '幾乎同一條線連射四箭，全部打中同一隻怪時傷害很高（第 2 發起每發 35%）。' },
  frostrain: { name: '冰雨箭', icon: '霰', color: '#a8e0ff', lvl: 18, cls: 'druid', tags: ['attack', 'projectile', 'area'], cost: 11, eff: 0.6, speed: 0.8,
    type: 'rain', radius: 90, volleys: 3, range: 420, need: 'bow', ail: { freeze: 15 }, desc: '在滑鼠位置降下三波冰箭，有機會冰凍。' },
  // 法師
  flamewave: { name: '烈焰衝擊', icon: '焰', color: '#ff8040', lvl: 9, cls: 'mage', tags: ['spell', 'area'], elem: 'fire', cost: 13,
    base: [12, 20], crit: 6, cast: 0.85, eff: 0.75, type: 'nova', radius: 140, ail: { ignite: 25 }, desc: '以自己為中心爆出火焰，大範圍、25% 點燃。' },
  frostchain: { name: '冰霜鏈', icon: '鏈', color: '#9ad8ff', lvl: 14, cls: 'mage', tags: ['spell'], elem: 'cold', cost: 10,
    base: [6, 18], crit: 6, cast: 0.75, eff: 0.65, type: 'chain', chains: 5, range: 280, ail: { freeze: 15 }, desc: '在敵人之間連鎖跳 5 次的冰霜，有機會冰凍。' },
  // 召喚師
  soulbolt: { name: '噬魂彈', icon: '魂', color: '#a070e0', lvl: 7, cls: 'summoner', tags: ['spell', 'projectile'], elem: 'chaos', cost: 9,
    base: [8, 14], crit: 5, cast: 0.75, eff: 0.85, type: 'proj', count: 2, spread: 0.5, pspeed: 420, sprite: 'shadow', homing: true, ail: { poison: 40 },
    desc: '放出兩顆會自己追敵人的毒素靈魂彈。召喚師自己也能出一點力。' },
  bonenova: { name: '骨刺新星', icon: '刺', color: '#e8e0c8', lvl: 13, cls: 'summoner', tags: ['spell', 'area'], elem: 'phys', cost: 12,
    base: [10, 18], crit: 6, cast: 0.8, eff: 0.8, type: 'nova', radius: 120, ail: { bleed: 30 }, desc: '從腳下刺出一圈骨刺，物理傷害、30% 流血。配脆弱詛咒很痛。' },
});
const NEW_GEMS3 = ['quake', 'cleave', 'bladewind', 'thousandcuts', 'fanknives', 'viper', 'barrage', 'frostrain', 'flamewave', 'frostchain', 'soulbolt', 'bonenova'];
Object.assign(SKILL_ATTR, { quake: ['str'], cleave: ['str'], bladewind: ['str', 'dex'], thousandcuts: ['str', 'dex'], fanknives: ['dex'], viper: ['dex'],
  barrage: ['dex'], frostrain: ['dex', 'int'], flamewave: ['int'], frostchain: ['int'], soulbolt: ['int'], bonenova: ['int', 'str'] });
const GLYPH_FROM3 = { quake: 'whirl', cleave: 'heavy', bladewind: 'knives', thousandcuts: 'swallow', fanknives: 'knives', viper: 'venom', barrage: 'rapid', frostrain: 'rain', flamewave: 'nova', frostchain: 'arc', soulbolt: 'thorn', bonenova: 'nova' };
for (const k of NEW_GEMS3) { SKILLS[k].id = k; SKILLS[k].req = gemReqAttr(k, 1); if (typeof SKILL_GLYPHS !== 'undefined' && !SKILL_GLYPHS[k]) SKILL_GLYPHS[k] = SKILL_GLYPHS[GLYPH_FROM3[k]] || SKILL_GLYPHS.heavy; }

// v2.17：這裡原本的八顆輔助寶石（少量多重投射、重擊打擊、震擊範圍、嗜血、召喚狂暴、精準、燃燒爆發、元素催化）已經併進 data.js 的威力／暴擊／範圍擴大／生命偷取／召喚物強化／燃燒（舊存檔在 gems4.js 自動換）
