// =============================================================
//  v2.18.2 新手期保護：不耗魔的普通攻擊、前 10 級魔力回復、第 1～2 夜首領單下傷害上限
//  玩家看到：
//   ① 每個職業多一個「不耗魔力」的普通攻擊（魔力用光也能一直打，可以插習慣，傷害約主力技能的 55%）
//      戰士／武士／盜賊＝普通揮砍（要近戰武器）；弓箭手＝普通射擊（要弓）；法師／召喚師＝法杖彈（閃電，不挑武器）
//      新角色開局放在左鍵（手機是右下大圓鈕），原本的兩個技能往後移一格（右鍵、Q）
//      舊角色：技能欄有空位就自動補上（只補一次，之後拿掉不會再塞回來）；沒有空位就只放進技能寶石（技能頁自己換）
//   ② 1～10 級魔力回復每秒 +2（11 級起沒有）
//   ③ 第 1～2 夜：看守者（含第二階段新招）、精英守護者、區域首領打你一下，最多扣你當時最大生命的 45%（算護甲、抗性之前先壓）
//  資料：技能 SKILLS.bswing／bshot／wandbolt（basic: true，不會當成技能寶石掉落）；舊角色補過的記號 P.basicAtk = 1
//  接點：Hook 'start'、'stats'；core-end.js 的 damagePlayer 呼叫 Newbie.cap（不另外包裝）
//  載入順序：要排在 summoner2.js 之後（它會改召喚師的開局技能；也用到 gems3.js 的 gemReqAttr、SKILL_GLYPHS）
// =============================================================
Object.assign(SKILLS, {
  bswing: { name: '普通揮砍', icon: '揮', color: '#d8c8a8', lvl: 1, basic: true, tags: ['attack', 'melee'], cost: 0, eff: 0.7, speed: 1.15,
    type: 'melee', range: 60, arc: 1.6, need: 'melee', desc: '不耗魔力的基本揮砍。魔力用光時也能一直打，可以插習慣。' },
  bshot: { name: '普通射擊', icon: '射', color: '#c8d8a0', lvl: 1, basic: true, tags: ['attack', 'projectile'], cost: 0, eff: 0.72, speed: 1.05,
    type: 'proj', count: 1, spread: 0, pspeed: 720, need: 'bow', sprite: 'arrow', desc: '不耗魔力的普通一箭。魔力用光時也能一直射，可以插習慣。需要弓。' },
  wandbolt: { name: '法杖彈', icon: '彈', color: '#e8e070', lvl: 1, basic: true, tags: ['spell', 'projectile'], elem: 'light', cost: 0,
    base: [5, 9], crit: 5, cast: 0.6, eff: 0.6, type: 'proj', count: 1, spread: 0.05, pspeed: 620, sprite: 'orb',
    desc: '不耗魔力的小閃電彈。魔力用光時也能一直打，可以插習慣。' },
});
const BASIC_ATK = { warrior: 'bswing', samurai: 'bswing', ranger: 'bswing', druid: 'bshot', mage: 'wandbolt', summoner: 'wandbolt' };
Object.assign(SKILL_ATTR, { bswing: ['str', 'dex'], bshot: ['dex'], wandbolt: ['int'] });
for (const k of ['bswing', 'bshot', 'wandbolt']) {
  SKILLS[k].id = k; SKILLS[k].req = gemReqAttr(k, 1);
  if (typeof SKILL_GLYPHS !== 'undefined' && !SKILL_GLYPHS[k]) SKILL_GLYPHS[k] = SKILL_GLYPHS[{ bswing: 'heavy', bshot: 'rapid', wandbolt: 'arc' }[k]] || SKILL_GLYPHS.heavy;
}
for (const c in BASIC_ATK) {
  const sid = BASIC_ATK[c];
  if (CLASS_GEMS[c] && !CLASS_GEMS[c].includes(sid)) CLASS_GEMS[c].unshift(sid);
  const sk = CLASSES[c] && CLASSES[c].skills;
  if (sk && !sk.includes(sid)) { sk.unshift(sid); sk.length = 5; }   // 開局：[普通攻擊, 原本的第 1 招, 原本的第 2 招, 空, 空]
}
const Newbie = {
  // 第 1～2 夜首領級的一下：最多扣最大生命的 25%（第 1 夜）／40%（第 2 夜）
  capOn(src) { const w = G.world; return !!(src && w && w.kind === 'map' && w.tier >= 1 && w.tier <= 2 && (src.boss || src.guardian || src.chapBoss)); },
  cap(parts, o) {
    if (!parts || !parts.length || (o && o.dot) || !G.S || !this.capOn(o && o.src)) return parts;
    const tot = parts.reduce((s, p) => s + (p[0] || 0), 0), lim = G.S.maxLife * (G.world.tier <= 1 ? 0.25 : 0.4);   // v2.18.2 試玩後再降：第 1 夜 25%、第 2 夜 40%
    if (tot <= lim) return parts;
    const f = lim / tot, out = parts.map(([a, e]) => [a * f, e]); out.crit = parts.crit; return out;
  },
};
Hook.on('start', P => {
  if (!P || P.basicAtk) return;
  P.basicAtk = 1;
  const sid = BASIC_ATK[P.cls]; if (!sid || !Array.isArray(P.skills) || P.skills.includes(sid)) return;
  const i = P.skills.indexOf(null);
  if (i >= 0) { P.skills[i] = sid; onBuildChanged(); setTimeout(() => UI.msg(`新技能「${SKILLS[sid].name}」放上技能欄了：不耗魔力，魔力用光時也能打`, '#ffd780'), 1200); }
  else setTimeout(() => UI.msg(`你學會了「${SKILLS[sid].name}」（不耗魔力）：技能欄滿了，想用的話到技能頁（K）換上`, '#ffd780'), 1200);
});
Hook.on('stats', (S, P) => { if (P && (P.lvl || 1) <= 10) S.manaRegenPS = (S.manaRegenPS || 0) + 2; });   // 前 10 級魔力回復每秒 +2
// v2.18.2 第 1～2 夜看守者：生命 ×0.3／×0.4、傷害 ×0.5／×0.6（第 1 夜／第 2 夜）、召出來的小怪生命 ×0.5、同時最多 3 隻（試玩：新手弓箭手打腐骨之王要 5 分鐘、每條命只打掉 3～8%）
Hook.on('stage', w => {
  if (!w || !w.bossRoom || (w.tier || 99) > 2) return;
  for (const m of G.mons) if (m.boss && !m._nbHp) { m._nbHp = 1; const t1 = w.tier <= 1; m.maxLife = Math.round(m.maxLife * (t1 ? 0.3 : 0.4)); m.life = Math.min(m.life, m.maxLife); if (m.dmg) m.dmg = m.dmg.map(v => v * (t1 ? 0.5 : 0.6)); }
});
Hook.on('update', () => {
  const w = G.world; if (!w || !w.bossRoom || (w.tier || 99) > 2) return;
  for (const m of G.mons) if (m.summoned && !m._nbHp) { m._nbHp = 1; m.maxLife = Math.max(1, Math.round(m.maxLife * 0.5)); m.life = Math.min(m.life, m.maxLife); }
  const sm = G.mons.filter(m => m.summoned && !m.dead); for (const m of sm.slice(0, Math.max(0, sm.length - 3))) { m.dead = true; m.life = 0; G.mons.splice(G.mons.indexOf(m), 1); }
});
