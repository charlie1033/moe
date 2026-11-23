// =============================================================
//  v2.17 夢囈（觸發型習慣）三顆：夢囈．暴擊、夢囈．受傷、夢囈．擊殺
//  玩家看到：把「夢囈」插在想被自動施放的技能（A）上，插上就生效，不用另外設定：
//  ・夢囈．暴擊：別的技能（或召喚物）打出暴擊時，自動施放 A
//  ・夢囈．受傷：你被打到、真的掉血時，自動施放 A（持續傷害不算）
//  ・夢囈．擊殺：別的技能（或召喚物）殺死敵人時，自動施放 A
//  規則：自動施放不耗魔，傷害 70%，每顆每 1.5 秒最多一次（A 本身冷卻比較長就照 A 的）；自動瞄準最近的怪（520 內沒怪就不放）。
//  A 自己造成的暴擊、擊殺不會觸發自己（要「別的技能」）；A 的屬性或武器需求不符時不放。不能插在位移、召喚、光環、增益技能上。
//  接法：gems4.js 的 'crit' 事件、core-end.js 的 'hurt'、'kill'；施放時 G._autoCast = true（蓄力射擊會直接射出）
//  資料：沒有存檔資料（冷卻只記在這次遊戲裡）
// =============================================================
const DREAM_EX = ['movement', 'minion', 'aura', 'buff'];
const DREAM_NOTE = '<br>插在想被自動施放的技能上；不耗魔、傷害 70%、每 1.5 秒最多一次，會自動瞄準最近的怪。';
Object.assign(SUPPORTS, {
  dream_crit: { name: '夢囈．暴擊', color: '#5b8cff', req: ['attack', 'spell'], excl: DREAM_EX, cost: 1, dream: 'crit', mods: {},
    desc: '別的技能打出暴擊時，自動幫你放這一招。' + DREAM_NOTE },
  dream_hurt: { name: '夢囈．受傷', color: '#e05a4f', req: ['attack', 'spell'], excl: DREAM_EX, cost: 1, dream: 'hurt', mods: {},
    desc: '你被打到的時候，自動幫你放這一招。' + DREAM_NOTE },
  dream_kill: { name: '夢囈．擊殺', color: '#5cc45c', req: ['attack', 'spell'], excl: DREAM_EX, cost: 1, dream: 'kill', mods: {},
    desc: '別的技能殺死敵人時，自動幫你放這一招。' + DREAM_NOTE },
});
if (typeof SUPPORT_GLYPHS !== 'undefined' && SUPPORT_GLYPHS.echo) for (const k of ['dream_crit', 'dream_hurt', 'dream_kill']) if (!SUPPORT_GLYPHS[k]) SUPPORT_GLYPHS[k] = SUPPORT_GLYPHS.echo;

const DREAM_CD = 1.5, DREAM_DMG = 0.7;
const _dreamReady = {};
const dreamHas = (c, kind) => !!c && (c.active || []).includes('dream_' + kind);
function dreamNearest(x, y, R) {
  let best = null, bd = R;
  for (const m of G.mons) { if (m.dead || m.hidden || (m.boss && !m.awake)) continue; const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = m; } }
  return best;
}
function dreamFire(kind, fromSlot) {
  const P = G.P, pl = G.pl;
  if (!P || !pl || !G.slotCalc || G.dead || G.state !== 'play' || !G.world || G.world.kind === 'town') return;
  if ((pl.ail && pl.ail.frozen > 0) || pl.stun > 0) return;
  for (let i = 0; i < P.skills.length; i++) {
    const sid = P.skills[i], c = G.slotCalc[i];
    if (!sid || i === fromSlot || !dreamHas(c, kind)) continue;
    const key = i + kind; if ((_dreamReady[key] || 0) > G.time) continue;
    if (skillUsable(G.S, sid)) continue;
    const tgt = dreamNearest(pl.x, pl.y, 520); if (!tgt) continue;
    const sk = SKILLS[sid];
    _dreamReady[key] = G.time + Math.max(DREAM_CD, sk.cd ? effCd(G.S, sk) : 0);
    const c2 = Object.assign({}, c, { d: Object.fromEntries(Object.entries(c.d).map(([k, v]) => [k, [v[0] * DREAM_DMG, v[1] * DREAM_DMG]])), echo: false });
    markSlotCalc(c2, i);   // 這一招打出的暴擊、擊殺算 A 自己的，不會再觸發自己
    const ox = input.wx, oy = input.wy, was = G._autoCast;
    input.wx = tgt.x; input.wy = tgt.y; G._autoCast = true;
    try { castSkill(sid, c2); } catch (e) { console.error('[夢囈]', e); } finally { input.wx = ox; input.wy = oy; G._autoCast = was; }
    G.texts.push({ x: pl.x, y: pl.y - 46, txt: '夢囈．' + sk.name, color: '#c8b0ff', size: 11, t: 0, dur: 0.7 });
  }
}
// 有插「夢囈．暴擊」的時候，打中時才需要先擲暴擊（gems4.js）
Hook.on('build', () => { HitWatch.crit = !!(G.slotCalc || []).some(c => dreamHas(c, 'crit')); });
Hook.on('crit', (m, slot) => dreamFire('crit', slot));
Hook.on('kill', m => dreamFire('kill', m && m._lastSlot != null ? m._lastSlot : -1));
Hook.on('hurt', () => dreamFire('hurt', -1));
Hook.on('enterMap', () => { for (const k in _dreamReady) delete _dreamReady[k]; });
