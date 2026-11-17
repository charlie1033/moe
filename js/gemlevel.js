// =============================================================
//  技能寶石等級 v2.4
//  ・每顆技能寶石有自己的等級（1–20）。裝在技能欄上、打怪就會累積經驗；經驗滿了，
//    在技能頁（K）按「升級」才會升。升級和裝備都要符合「角色等級」和「屬性」需求。
//  ・寶石等級越高：傷害（法術的基礎傷害、攻擊的傷害效用）越高、冷卻越短、
//    投射物／穿透／連鎖／箭雨波數／落雷數變多、範圍變大；代價是耗魔變多。
//  ・屬性需求跟著寶石等級變高：只有「主屬性」對得上的職業，才拿得到高等版本。
//  ・想調數字：改下面 GEM_* 和 gemBonus()。
// =============================================================
const GEM_MAX = 20;
const GEM_TOP_LVL = 72;            // 20 級寶石需要的角色等級
for (const k in SKILLS) SKILLS[k].id = k;
// v2.4：雙屬性技能「第一個」是主要屬性。召喚靈狼、召喚石魔像是召喚師的技能，主要屬性改成智慧
SKILL_ATTR.wolf = ['int', 'dex']; SKILL_ATTR.golem = ['int', 'str'];

// 第 g 級需要的角色等級：從技能的解鎖等級，平均分配到 72 級
function gemReqLvl(sid, g) { const b = SKILLS[sid].lvl || 1; return g <= 1 ? b : Math.round(b + (g - 1) * (GEM_TOP_LVL - b) / (GEM_MAX - 1)); }
// 第 g 級需要的屬性（主屬性職業每級 +1.5，剛好跟得上；其他職業每級只 +0.5，跟不上）
function gemReqAttr(sid, g) {
  const at = SKILL_ATTR[sid] || ['int'], L = gemReqLvl(sid, g), r = {};
  if (at.length === 1) r[at[0]] = Math.round(10 + L * 1.5);
  else { r[at[0]] = Math.round(8 + L * 1.1); r[at[1]] = Math.round(6 + L * 0.45); }
  return r;
}
for (const k in SKILLS) SKILLS[k].req = gemReqAttr(k, 1);   // 第 1 級的需求（塞拉的商店、圖鑑用）

function gemData(sid, P = G.P) { if (!P) return { lv: 1, xp: 0 }; P.gemLv = P.gemLv || {}; return P.gemLv[sid] || (P.gemLv[sid] = { lv: 1, xp: 0 }); }
function gemLv(sid, P = G.P) { return (P && P.gemLv && P.gemLv[sid] && P.gemLv[sid].lv) || 1; }
// 升下一級要多少經驗：大約等於角色從這一級的需求等級，升到下一級的需求等級要的經驗
function gemXpNeed(sid, g) {
  if (g >= GEM_MAX) return Infinity;
  let s = 0; for (let L = gemReqLvl(sid, g); L < gemReqLvl(sid, g + 1); L++) s += xpNeed(L);
  return Math.max(xpNeed(gemReqLvl(sid, g)), s);
}
// 不符合第 g 級需求的原因（符合就回傳 null）
function gemReqLack(sid, g, S = G.S, P = G.P) {
  const L = gemReqLvl(sid, g), A = gemReqAttr(sid, g), out = [];
  if (P && P.lvl < L) out.push(`等級 ${L}（目前 ${P.lvl}）`);
  for (const a in A) if (S && S[a] < A[a]) out.push(`${ATTR_ZH[a]} ${A[a]}（目前 ${S[a]}）`);
  return out.length ? '需要 ' + out.join('、') : null;
}
// 寶石等級帶來的加成
function gemBonus(sid, g) {
  const sk = SKILLS[sid], k = g - 1;
  const multi = (sk.count || 1) >= 2;
  return {
    effLvl: gemReqLvl(sid, g),                                         // 法術、召喚物的「威力等級」
    eff: 1 + 0.025 * k,                                                 // 攻擊的傷害效用：每級 +2.5%
    cd: Math.max(0.6, 1 - 0.015 * k),                                   // 冷卻：每級 −1.5%
    cost: 1 + 0.035 * k,                                                // 耗魔：每級 +3.5%
    area: k,                                                            // 範圍：每級 +1%
    proj: sk.type === 'proj' ? (multi ? (g >= 8) + (g >= 16) : +(g >= 20)) : 0,   // 多發的技能 8、16 級各 +1；單發的 20 級 +1
    pierce: sk.type === 'proj' && !multi ? (g >= 8) + (g >= 16) : 0,             // 單發的 8、16 級各多穿透 1
    chain: sk.type === 'chain' ? (g >= 10) + (g >= 20) : 0,
    volley: sk.type === 'rain' ? +(g >= 12) : 0,
    strike: sk.type === 'storm' ? (g >= 10) + (g >= 20) : 0,
    minion: sk.type === 'summon' && (sk.max || 1) > 1 ? (g >= 10) + (g >= 20) : 0,
  };
}
// 給技能說明用：這一級跟下一級差在哪
function gemBonusText(sid, g) {
  const B = gemBonus(sid, g), sk = SKILLS[sid], out = [];
  if (sk.tags.includes('attack')) out.push(`傷害效用 ${Math.round((sk.eff || 1) * B.eff * 100)}%`);
  else if (sk.base) out.push(`威力等級 ${B.effLvl}`);
  if (sk.cd) out.push(`冷卻 −${Math.round((1 - B.cd) * 100)}%`);
  if (B.area) out.push(`範圍 +${B.area}%`);
  if (B.proj) out.push(`投射物 +${B.proj}`);
  if (B.pierce) out.push(`穿透 +${B.pierce}`);
  if (B.chain) out.push(`連鎖 +${B.chain}`);
  if (B.volley) out.push(`箭雨 +${B.volley} 波`);
  if (B.strike) out.push(`落雷 +${B.strike} 道`);
  if (B.minion) out.push(`召喚上限 +${B.minion}`);
  if (g > 1) out.push(`耗魔 +${Math.round((B.cost - 1) * 100)}%`);
  return out.join('、');
}
// 打怪時：裝在技能欄上的寶石一起拿經驗（滿了就停，要按升級）
function gemGainXp(n) {
  const P = G.P; if (!P || !n) return;
  for (const sid of new Set(P.skills.filter(Boolean))) {
    const d = gemData(sid); if (d.lv >= GEM_MAX) continue;
    const need = gemXpNeed(sid, d.lv), was = d.xp >= need;
    d.xp = Math.min(need, d.xp + n);
    if (!was && d.xp >= need) {
      const lack = gemReqLack(sid, d.lv + 1);
      UI.msg(lack ? `${SKILLS[sid].name} 可以升到 ${d.lv + 1} 級了，但${lack}` : `${SKILLS[sid].name} 可以升到 ${d.lv + 1} 級了（按 K 到技能頁升級）`, lack ? '#d8b080' : '#9fffd0');
    }
  }
}
// v2.12.9 技能頁開著時，經驗條跟著打怪即時更新（只在百分比或「可以升級」變了才重畫，拖曳寶石時不重畫）
let _gemPageSig = '', _gemPageT = 0;
Hook.on('update', () => {
  if (!UI.open || !UI.open.skills || !G.P || G.time - _gemPageT < 0.4) return; _gemPageT = G.time;
  if (document.querySelector('.dragghost')) return;
  const sig = G.P.skills.map(s => { if (!s) return ''; const d = gemData(s); return s + d.lv + ':' + Math.floor(d.xp / gemXpNeed(s, d.lv) * 100) + (gemCanLevel(s) ? '!' : ''); }).join('|');
  if (sig !== _gemPageSig) { const first = !_gemPageSig; _gemPageSig = sig; if (!first) UI.refreshSkills(); }
});
function gemCanLevel(sid) { const d = gemData(sid); return d.lv < GEM_MAX && d.xp >= gemXpNeed(sid, d.lv) && !gemReqLack(sid, d.lv + 1); }
function gemLevelUp(sid) {
  const d = gemData(sid);
  if (d.lv >= GEM_MAX) return UI.msg('已經是最高等級了', '#d8c8a0');
  if (d.xp < gemXpNeed(sid, d.lv)) return UI.msg('經驗還不夠：把它裝在技能欄上打怪', '#d8c8a0');
  const lack = gemReqLack(sid, d.lv + 1); if (lack) { Sfx.play('deny'); return UI.msg(`${SKILLS[sid].name} 升級${lack}`, '#ff9a9a'); }
  d.xp = 0; d.lv++;
  Sfx.play('levelup'); UI.banner(SKILLS[sid].name, `技能寶石升到 ${d.lv} 級`, SKILLS[sid].color);
  onBuildChanged(); saveGame();
}
// 舊存檔：依目前角色等級和屬性，把寶石直接設成「現在能用的最高等級」，不會突然變弱
function gemMigrate(P, S) {
  if (P.gemVer === 1) return;
  P.gemLv = P.gemLv || {};
  for (const sid in SKILLS) {
    if (!hasSkillGem(P, sid)) continue;
    let g = 1; while (g < GEM_MAX && !gemReqLack(sid, g + 1, S, P)) g++;
    P.gemLv[sid] = { lv: g, xp: 0 };
  }
  P.gemVer = 1;
}
