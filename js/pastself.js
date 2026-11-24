// =============================================================
//  上一個我的殘影：主線第 3 夜以後，每一區（看守者那一區除外）有 12% 機率出現一隻特別的稀有精英
//  ・他是「帳號裡另一個角色」：用那個角色的職業外觀（半透明、冷色調）、技能配置（頭上寫他用的技能，元素跟著主技能、
//    主技能是遠程／法術就用遠程怪的打法，否則近戰），頭上顯示「上一個我．第 N 個」（N 由那個角色固定算出，1～137）
//  ・帳號只有一個角色：用目前角色這次進遊戲時的存檔快照；連裝備都沒有就用同職業的預設技能
//  ・生命是一般稀有精英的 1.5 倍、怪物等級＝地圖等級 +2；第一次靠近時跳出橫幅
//  ・打倒：除了照常的精英掉落，再掉一件「他身上某件裝備的重骰版」（同底材、同稀有度，詞綴重新骰；傳奇就是同一件傳奇重骰數值）
//  ・機率在 PAST.chance（測試時可以改成 1）；資料都在怪物身上（m.pastSelf），不存檔
//  ・畫面：render.js 的 drawMonster 看 m.alpha 畫半透明（只加了一行）
// =============================================================
const PAST = { chance: 0.12, minTier: 3, life: 1.5 };
let _pastSnap = null;
Hook.on('start', P => { try { _pastSnap = JSON.parse(JSON.stringify({ name: P.name, cls: P.cls, skills: P.skills, equip: P.equip })); } catch (e) { _pastSnap = null; } });
// 挑一個「上一個我」：帳號裡的其他角色 → 這個角色的快照 → 同職業預設
function pastSource() {
  const aw = typeof Awaken !== "undefined" && Awaken.pick();   // v2.20.11 真正醒來的人（awaken.js）：一半機會是他
  if (aw) return { id: "awk_" + aw.n, n: aw.n, awake: aw, name: aw.name, cls: aw.cls, skills: aw.skills || [], equip: aw.equip || {} };
  const others = [];
  try { for (const c of loadIndex().chars) if (c.id !== G.charId) { const p = loadChar(c.id); if (p && p.cls && CLASSES[p.cls]) others.push({ id: c.id, name: p.name, cls: p.cls, skills: p.skills || [], equip: p.equip || {} }); } } catch (e) { }
  if (others.length) return pick(others);
  if (_pastSnap && _pastSnap.cls) return Object.assign({ id: G.charId + '_old' }, _pastSnap);
  const cls = G.P.cls; return { id: 'def_' + cls, name: G.P.name, cls, skills: CLASSES[cls].skills.slice(), equip: {} };
}
const pastNo = id => { let h = 7; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 100003; return 1 + h % 137; };
function spawnPastSelf(w) {
  const src = pastSource(), sids = (src.skills || []).filter(s => s && SKILLS[s]);
  const main = sids[0] && SKILLS[sids[0]], ranged = !!(main && (main.tags.includes('projectile') || (main.tags.includes('spell') && !main.tags.includes('melee'))));
  const pool = w.theme.monsters.filter(k => !!MONSTERS[k].ranged === ranged), type = pick(pool.length ? pool : w.theme.monsters);
  // 放在離起點遠一點的房間
  const st = w.start, rooms = (w.others || []).filter(r => r.w * r.h >= 30 && (!st || Math.hypot(r.x - st.x, r.y - st.y) > 12)).sort(() => Math.random() - 0.5);
  const r = rooms[0]; if (!r) return null;
  const p = randomFloorNear((r.x + (r.w >> 1)) * TS + 16, (r.y + (r.h >> 1)) * TS + 16, 40);
  const m = makeMonster(type, p.x, p.y, (w.mlvl || 1) + 2, 'rare', w.theme);
  m.def = Object.assign({}, m.def, { sprite: src.cls });
  m.tint = {}; for (const k in (SPRITE_PAL[src.cls] || {})) if (k !== 'k') m.tint[k] = ['#7fa8d8', '#a8c8f0', '#5a7aa8', '#d0e4ff'][k.charCodeAt(0) % 4];
  m.scale = 2; m.alpha = 0.62; m.splitChild = true;   // 殘影不會分裂
  const si = (m.modIds || []).indexOf('split'); if (si >= 0) { m.modIds.splice(si, 1); m.mods = m.mods.filter(x => x !== '分裂'); }
  m.maxLife = m.life = Math.round(m.maxLife * PAST.life);
  if (main && ['fire', 'cold', 'light', 'chaos'].includes(main.elem)) m.addElem = main.elem;
  m.name = src.awake ? `醒來的我．第 ${src.n} 個` : `上一個我．第 ${pastNo(src.id)} 個`;
  m.mods.unshift(sids.length ? '用' + sids.slice(0, 3).map(s => `「${SKILLS[s].name}」`).join('') : CLASSES[src.cls].name);
  m.pastSelf = { src, met: false };
  G.mons.push(m);
  return m;
}
Hook.on('stage', w => {
  if (!w || w.kind !== 'map' || w.arena || w.bossRoom || (w.tier || 0) < PAST.minTier || !w.stage || w.stage.i >= w.stage.n) return;
  if (Math.random() < PAST.chance) spawnPastSelf(w);
});
// 第一次靠近：橫幅
Hook.on('update', () => {
  const pl = G.pl; if (!pl || !G.world || G.world.kind !== 'map') return;
  for (const m of G.mons) if (m.pastSelf && !m.pastSelf.met && !m.dead && dist(m, pl) < 420) {
    m.pastSelf.met = true; m.aggro = true;
    const aw = m.pastSelf.src.awake; if (aw) { UI.banner(m.name, `是醒來的「${aw.name || "？"}」。他在牆上寫過：「${aw.words || "……"}」`, "#ffe9a0"); continue; }
    UI.banner(m.name, `是你另一個角色「${m.pastSelf.src.name || '？'}」的${CLASSES[m.pastSelf.src.cls].name}——在夢裡，他還沒醒來`, '#a8d0ff');
  }
});
// 掉一件他身上裝備的重骰版
function pastReroll(src, ilvl) {
  const eq = Object.values(src.equip || {}).filter(it => it && it.base && BASE_BY_ID[it.base] && it.rarity);
  if (!eq.length) return makeItem(pickBase(ilvl).id, 'rare', ilvl);
  const o = pick(eq);
  if (o.rarity === 'unique' && o.uniqueId && UNIQUE_BY_ID[o.uniqueId]) return makeUnique(o.uniqueId, ilvl);
  return makeItem(o.base, o.rarity === 'unique' ? 'rare' : o.rarity, ilvl);
}
Hook.on('kill', m => {
  if (!m.pastSelf) return;
  const it = pastReroll(m.pastSelf.src, m.mlvl || 1);
  dropLoot(m.x, m.y, { item: it });
  burst(m.x, m.y, '#a8d0ff', 30, 200);
  UI.msg(`上一個我散成了光，留下「${it.name}」——跟他身上那件同一種底材，詞綴重新骰過`, '#a8d0ff');
});
// 腳下一圈冷光
Hook.on('drawWorld', g => {
  for (const m of G.mons) {
    if (!m.pastSelf || m.dead) continue;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.15 * Math.sin(G.time * 3);
    g.fillStyle = '#5a8ad8'; g.beginPath(); g.ellipse(m.x, m.y + m.r * 0.8, m.r + 10, (m.r + 10) * 0.45, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
});
