// =============================================================
//  v2.13 召喚師前期加強
//  實測（第 1 夜、3 級、15 秒）：召喚師只殺 12 隻，法師 22、戰士 25、弓箭手 32；召喚物太脆，幾秒就死光，自己又沒有攻擊技能
//
//  ① 新技能「骨矛」（召喚師開局就有，放在左鍵）：物理法術投射物，穿透 2 隻敵人，自己也能清小怪、自保
//     傷害 8～14（跟火球術差不多，但沒有爆炸範圍、多了穿透），耗魔 6，施放 0.65 秒
//  ② 召喚物變強：傷害約 ×1.4、生命約 ×1.6（骷髏 7～13／90、靈體 8～14／60、靈狼 10～17／75、石魔像 30～46／380）
//     （實測打木樁：召喚物全召出來時本來就比別的職業高，真正的問題是太脆、一直死、要一直重召，所以生命加得比傷害多）
//  ③ 自保：召喚師本身 生命 +15%、能量護盾 +15
//  ④ 舊角色：讀檔時自動拿到骨矛；技能欄有空位就放進去（沒有就按 K 自己裝）
//     新角色的技能欄：左鍵＝骨矛、右鍵＝召喚骷髏、Q＝召喚靈體
//  美術：骨矛先用箭的投射物圖（白骨色），之後美術可以接 sprite 'bonespear' 的圖
// =============================================================
Object.assign(SKILLS, {
  bonespear: { name: '骨矛', icon: '矛', color: '#e8dcc0', lvl: 1, cls: 'summoner', tags: ['spell', 'projectile'], elem: 'phys', cost: 6,
    base: [8, 14], crit: 6, cast: 0.65, eff: 1, type: 'proj', count: 1, spread: 0.15, pspeed: 620, pierce: 2, sprite: 'arrow', 
    desc: '射出一根骨矛，穿透 2 隻敵人。召喚物還沒召出來、或被打散的時候，靠它自保。' },
});
SKILL_ATTR.bonespear = ['int'];
SKILLS.bonespear.id = 'bonespear'; SKILLS.bonespear.req = gemReqAttr('bonespear', 1);
if (!CLASS_GEMS.summoner.includes('bonespear')) CLASS_GEMS.summoner.unshift('bonespear');
CLASSES.summoner.skills = ['bonespear', 'skel', 'spirit', null, null];
CLASSES.summoner.bonus = Object.assign({}, CLASSES.summoner.bonus, { life_inc: 15, es: 15 });
// 召喚物數值
for (const [k, base, life] of [['skel', [7, 13], 90], ['spirit', [8, 14], 60], ['wolf', [10, 17], 75], ['golem', [30, 46], 380]]) {
  if (!SKILLS[k]) continue; SKILLS[k].base = base; SKILLS[k].mlife = life;
}
if (typeof SKILL_GLYPHS !== 'undefined' && !SKILL_GLYPHS.bonespear && SKILL_GLYPHS.icespear) SKILL_GLYPHS.bonespear = SKILL_GLYPHS.icespear;
// 舊角色：補上骨矛
Hook.on('start', P => {
  if (!P || P.cls !== 'summoner' || P.skills.includes('bonespear')) return;
  const i = P.skills.indexOf(null);
  if (i >= 0) { P.skills[i] = 'bonespear'; onBuildChanged(); }
  setTimeout(() => UI.msg(i >= 0 ? `新技能：骨矛（已經放在技能欄第 ${i + 1} 格）` : '新技能：骨矛（按 K 裝到技能欄）', '#e8dcc0'), 1200);
});
