// =============================================================
//  v2.17 輔助寶石整理（企劃書第 4 名）
//  玩家看到：
//  ・只換數字的輔助寶石併成三顆：威力（傷害 ×1.3）、速度（攻擊／施法速度 +30%）、暴擊（暴擊率 +100%、暴擊傷害 +30%），
//    其他雷同的併進同類（見下面 SUP_MERGE）。舊存檔裡身上、倉庫、已經插在技能上的舊寶石自動換成新的那顆（數量合併；
//    同一個技能插了兩顆會變成同一顆的，多的那顆退回背包）。
//  ・「節能」改成「透支」：魔力不夠時差的用生命補，傷害 ×1.15（扣生命寫在 game.js 的 useSkill）。
//  ・有代價的三顆（risk）：連段（連打同一隻每下 +6%、最多 8 層，換目標歸零）、孤注（技能欄只有這一個打傷害的技能時傷害 ×1.4）、
//    血祭（耗魔改扣生命，傷害 ×1.25）。圖示加紅框，只在深層夢境（第 DEEP_TIER 夜起）掉落、到過深層才會在商人那裡賣。
//  ・技能頁的輔助寶石袋：預設只顯示「推薦」的（規則見 supGoodFor），旁邊「顯示全部」可切換，記在這台裝置（localStorage 'moe_supAll'）。
//  包裝（都是要改輸入或回傳值，沒有登記點可用）：
//  ・hitMonster 包一次：認出這一下是哪個技能欄打的、發 'preHit'（可以改暴擊／傷害倍率）和 'crit'（暴擊之後）兩個事件，
//    給連段、夢囈（dreamtalk.js）、搖籃曲（skills4.js）用。ctx = { m, pk, slot, fromMinion, crit: null|true|false, mul }
//  ・supportIcon 包一次：有代價的寶石圖示加紅框（快取在同一張畫布上，只畫一次）
//  資料：G.P.links、G.P.supports（背包）、G.stash.spec.sup（倉庫）都只換代號，沒有新欄位；P.supRefund 是暫存（start 時退回背包）
// =============================================================
const SUP_MERGE = {
  lmp: 'gmp', shockwave: 'aoe', combust: 'burn', bloodlust: 'leech', mfury: 'mdmg', mlife: 'mdmg', cursedur: 'curseamp',
  brutal: 'power', meleephys: 'power', impact: 'power', elefocus: 'power', catalyst: 'power', addfire: 'power', addchaos: 'power', dotamp: 'power',
  fasta: 'speed', fastc: 'speed', precision: 'crit', lessmana: 'overdraw',
};
Object.assign(SUPPORTS, {
  overdraw: { name: '透支', color: '#5b8cff', req: ['attack', 'spell'], excl: ['movement', 'aura'], cost: 1.2, mods: { more_dmg: 15, overdraw: true },
    desc: '魔力不夠的時候，用生命補上，照樣放得出來。<br>傷害變成 1.15 倍；魔力不夠的部分直接扣生命（生命也不夠就放不出來）。' },
  streak: { name: '連段', color: '#e05a4f', req: ['attack', 'spell'], excl: DMG_EXCL, cost: 1.3, risk: true, mods: { streak: true },
    desc: '一直打同一隻，越打越痛；換目標就重來。<br>連續打中同一隻怪，每一下傷害 +6%，最多 8 層（+48%）；打到別隻就歸零。<br><span style="color:#ff8a8a">有代價的寶石：只在深層夢境掉落、販售</span>' },
  allin: { name: '孤注', color: '#e05a4f', req: ['attack', 'spell'], excl: DMG_EXCL, cost: 1.3, risk: true, mods: { allin: true },
    desc: '技能欄上只放這一招打人，它就變得很痛。<br>技能欄上沒有別的攻擊或法術時，傷害變成 1.4 倍（召喚、光環、詛咒、位移、增益不算）；有別的就沒效果。<br><span style="color:#ff8a8a">有代價的寶石：只在深層夢境掉落、販售</span>' },
  bloodpay: { name: '血祭', color: '#e05a4f', req: ['attack', 'spell'], excl: DMG_EXCL, cost: 1, risk: true, mods: { more_dmg: 25, bloodpay: true },
    desc: '不耗魔，改扣生命，換來更痛。<br>這個技能原本要耗的魔，改成扣同樣多的生命；傷害變成 1.25 倍。<br><span style="color:#ff8a8a">有代價的寶石：只在深層夢境掉落、販售</span>' },
});
if (typeof SUPPORT_GLYPHS !== 'undefined') {
  const G0 = { power: 'brutal', speed: 'fasta', overdraw: 'leech', streak: 'rend', allin: 'crit', bloodpay: 'leech' };
  for (const k in G0) if (!SUPPORT_GLYPHS[k] && SUPPORT_GLYPHS[G0[k]]) SUPPORT_GLYPHS[k] = SUPPORT_GLYPHS[G0[k]];
}

// ---------- 舊存檔：被併掉的代號換成新的 ----------
function supMergeCounts(o) { if (!o) return; for (const k of Object.keys(o)) { const n = SUP_MERGE[k]; if (!n) continue; const v = o[k] || 0; delete o[k]; if (v > 0) o[n] = (o[n] || 0) + v; } }
function supMergeCells(arr) { for (const it of arr || []) if (it && it.stack === 'sup' && SUP_MERGE[it.key]) it.key = SUP_MERGE[it.key]; }
function gemMergeSave(P) {
  if (!P) return;
  supMergeCells(P.inv);
  if (P.supports) supMergeCounts(P.supports);
  for (const L of P.links || []) {
    if (!Array.isArray(L)) continue;
    for (let k = 0; k < L.length; k++) {
      const id = L[k]; if (!id || !SUP_MERGE[id]) continue;
      const n = SUP_MERGE[id];
      if (L.includes(n)) { L[k] = null; (P.supRefund = P.supRefund || {})[n] = (P.supRefund[n] || 0) + 1; }   // 同一個技能已經有新的那顆：多的退回
      else L[k] = n;
    }
  }
}
function gemMergeStash(s) {
  if (!s) return;
  if (s.spec) supMergeCounts(s.spec.sup);
  for (const t of s.tabs || []) supMergeCells(t);
}
Hook.on('start', P => {
  if (!P || !P.supRefund) return;
  const R = P.supRefund; delete P.supRefund;
  for (const k in R) if (SUPPORTS[k]) P.supports[k] = (P.supports[k] || 0) + R[k];
  UI.msg('輔助寶石改版了：一樣的寶石已經合併，多出來的放回背包（按 K 看）', '#3fd8b8');
});

// ---------- 孤注：技能欄上沒有別的打傷害的技能 ----------
const NODMG_TAGS = ['minion', 'curse', 'buff', 'aura', 'movement', 'control'];
const isDmgSkill = s => { const t = SKILLS[s] && SKILLS[s].tags; return !!t && (t.includes('attack') || t.includes('spell')) && !t.some(x => NODMG_TAGS.includes(x)); };
function allinOn(sid) { const P = G.P; return !!P && !P.skills.some(s => s && s !== sid && isDmgSkill(s)); }

// ---------- 打中時：認出技能欄、preHit／crit 事件 ----------
let _slotOfD = new WeakMap();
const slotOfPk = pk => (pk && pk.d && _slotOfD.has(pk.d)) ? _slotOfD.get(pk.d) : -1;
function markSlotCalc(c, i) { if (c && c.d) _slotOfD.set(c.d, i); }   // 別的模組用算好的數值另外施放時，也算這個技能欄打的（夢囈用）
Hook.on('build', () => { _slotOfD = new WeakMap(); (G.slotCalc || []).forEach((c, i) => markSlotCalc(c, i)); });
const HitWatch = { crit: false };   // 有人要聽「暴擊」時才自己先擲暴擊（dreamtalk.js 會打開）
const _hitG4 = hitMonster;
hitMonster = function (m, pk, fromMinion, src, kb) {
  if (!m || m.dead || m.hidden || !pk) return _hitG4(m, pk, fromMinion, src, kb);
  const slot = fromMinion ? -1 : slotOfPk(pk);
  const ctx = { m, pk, slot, fromMinion: !!fromMinion, crit: null, mul: 1 };
  Hook.emit('preHit', ctx);
  let crit = ctx.crit;
  if (crit == null && HitWatch.crit && !G.S.flags.noCrit) crit = Math.random() * 100 < (pk.crit || 0);
  if (crit != null || ctx.mul !== 1) { pk = ctx.mul !== 1 ? scalePk(pk, ctx.mul) : Object.assign({}, pk); if (crit != null) pk.crit = crit ? 100 : 0; }
  m._lastSlot = slot;
  const r = _hitG4(m, pk, fromMinion, src, kb);
  if (crit) Hook.emit('crit', m, slot);
  return r;
};
// 連段：同一格畫面裡打到很多隻（範圍技能）只看第一下，不會一直歸零
const _streak = {};
Hook.on('preHit', ctx => {
  if (ctx.slot < 0) return;
  const c = G.slotCalc && G.slotCalc[ctx.slot]; if (!c || !(c.active || []).includes('streak')) return;
  const st = _streak[ctx.slot] || (_streak[ctx.slot] = { m: null, n: 0, t: -1 });
  if (st.t !== G.time) {
    st.t = G.time;
    if (st.m === ctx.m && !ctx.m.dead) { const was = st.n; st.n = Math.min(8, st.n + 1); if (st.n === 8 && was < 8) G.texts.push({ x: ctx.m.x, y: ctx.m.y - ctx.m.r - 34, txt: '連段 滿', color: '#ff9a6a', size: 12, t: 0, dur: 0.8 }); }
    else { st.m = ctx.m; st.n = 0; }
  }
  if (st.n) ctx.mul *= 1 + 0.06 * st.n;
});
Hook.on('enterMap', () => { for (const k in _streak) delete _streak[k]; });

// ---------- 有代價的寶石：圖示紅框 ----------
const _supIconG4 = supportIcon;
supportIcon = function (id, px = 48) {
  const c = _supIconG4(id, px);
  if (SUPPORTS[id] && SUPPORTS[id].risk && !c._risk) {
    const g = c.getContext('2d'), w = Math.max(2, Math.round(px / 14));
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.strokeStyle = '#ff2a2a'; g.lineWidth = w; g.strokeRect(w / 2, w / 2, px - w, px - w); g.restore();
    c._risk = true; c._url = null;
  }
  return c;
};

// ---------- 技能頁：推薦篩選 ----------
// 推薦＝插得上技能欄上的技能，而且是那個技能常搭的：
//  ・威力、速度、暴擊、投射物類、範圍類、回響、召喚類、詛咒強化：插得上就推薦
//  ・異常狀態類：技能本身就有那種異常、或是那個元素（例：燃燒→會點燃或火焰技能）
//  ・寒霜轉化：攻擊技能；生命偷取：近戰技能
//  ・夢囈、透支、有代價的：進階玩法，不推薦（按「顯示全部」才看得到）
function supGoodFor(id, sid) {
  if (!sid || !supportFits(id, sid)) return false;
  const sp = SUPPORTS[id], sk = SKILLS[sid], t = sk.tags, ail = sk.ail || {}, el = sk.elem;
  if (sp.risk || sp.dream || id === 'overdraw') return false;
  switch (id) {
    case 'burn': return !!ail.ignite || el === 'fire';
    case 'venom': return !!ail.poison || el === 'chaos';
    case 'rend': return !!ail.bleed;
    case 'frostbite': return !!ail.freeze || el === 'cold';
    case 'static': return !!ail.shock || el === 'light';
    case 'hypo': return t.includes('attack');
    case 'leech': return t.includes('melee');
  }
  return true;
}
function supShowAll() { try { return localStorage.getItem('moe_supAll') === '1'; } catch (e) { return false; } }
function supSetShowAll(v) { try { localStorage.setItem('moe_supAll', v ? '1' : '0'); } catch (e) { } }
// 寶石袋要顯示哪些：選起某個技能欄時只看那個技能，沒選就看整條技能欄
function supBagFilter(ids, pick) {
  const P = G.P; if (!P || supShowAll()) return ids;
  const m = /^(slot|link):(\d+)/.exec(pick || ''), sids = m ? [P.skills[+m[2]]] : P.skills;
  return ids.filter(id => pick === 'sup:' + id || sids.some(s => supGoodFor(id, s)));
}
(() => {
  const st = document.createElement('style');
  st.textContent = `.supall { margin-left:6px; padding:1px 7px; font-size:11px; cursor:pointer; background:rgba(40,32,20,.8); color:#d8c8a0; border:1px solid #6a5a3a; border-radius:3px; }
  .supall.on { color:#ffe08a; border-color:#c8a050; }
  .glock { margin-left:6px; padding:0 6px; font-size:10px; cursor:pointer; background:rgba(40,32,20,.8); color:#a8c8a0; border:1px solid #5a6a4a; border-radius:3px; vertical-align:middle; }
  .glock.on { color:#ffb070; border-color:#a86a3a; } .bagt small { display:block; font-size:10px; color:#a89878; font-weight:normal; }`;
  document.head.appendChild(st);
})();
