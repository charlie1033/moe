// =============================================================
//  夢話三選一：每一夜進門前，從營地的人裡借一句夢話，只管這一夜
//  玩家看到：打開夢之門（地圖裝置），清單上方多一區「夢話三選一」，三張卡片點一下選（手機也是點），可以選「不借」
//    選好後進入下一夜就生效；畫面上方顯示這一夜借的是哪句（跟祝福神殿同一排，在它上面）
//    離開地圖（回營地、倒下、用傳送卷軸）或進下一夜就失效；三句是隨機的，用掉一夜才換新的三句（開關夢之門不會換）
//  能借的人：牢房的歐莉、格倫、小雀一定有；其他人要先去過他們的營地
//    歐莉「記下來」每殺 50 隻傷害 +5%（最多 +50%）｜格倫「巡邏」每一區第一隻碰上的精英只剩半血｜小雀「亮晶晶」珠寶掉落加倍、怪多兩成
//    阿雷「放輕腳步」移動 +10%、暴擊率 +50%｜薇薇「閉上眼睛聽」火冰雷抗性 +12%（上限照舊）｜哈桑「多帶一箱」掉落數量 +20%、怪物生命 +10%
//    老漁夫莫「等潮水」每秒回 1.5% 生命、移動 −5%｜茵婆婆「苦的才有效」持續傷害 +25%｜卡爾「不准退」攻速施速 +12%、最大生命 −10%｜諾娃「留一盞燈」魔力回復 +60%
//  做法：能力數值包了 computeStats 一次（跟祝福神殿一樣，因為傷害在能力重算時就算好了，'build' 之後改來不及）
//        改怪用 Hook 'stage'、殺怪計數用 'kill'、珠寶加倍是每格比對地上新出現的珠寶再多丟一顆
//  資料：只在記憶體（DreamWords.opts／pick／act），不存檔；重新整理頁面會重骰三句
// =============================================================
const DREAMS = {
  olly: { who: '歐莉', hub: 'cell', name: '記下來', color: '#f0d8a0', quote: '……記下來。全部都要記下來……', eff: '每殺 50 隻，傷害 +5%（這一夜累積，最多 +50%）',
    stats: (S, a) => { S.dmg_inc = (S.dmg_inc || 0) + 5 * a.stacks; }, hud: a => `每殺 50 隻傷害 +5%，目前 +${5 * a.stacks}%（殺了 ${a.kills} 隻）` },
  glen: { who: '格倫', hub: 'cell', name: '巡邏', color: '#c8e0ff', quote: '巡邏、巡邏……總得有人看著門。', eff: '每一區第一隻碰上的精英怪，只剩一半生命' },
  sparrow: { who: '小雀', hub: 'cell', name: '亮晶晶', color: '#ffb0e0', quote: '亮晶晶的……再多一顆就好……', eff: '珠寶掉落加倍，但怪物多兩成' },
  are: { who: '阿雷', hub: 'icecamp', name: '放輕腳步', color: '#b8e8c8', quote: '噓，風往這邊吹，牠們聞不到你。', eff: '移動速度 +10%，暴擊率 +50%',
    stats: S => { S.moveSpeed *= 1.1; S.crit_inc = (S.crit_inc || 0) + 50; } },
  vivi: { who: '薇薇', hub: 'icecamp', name: '閉上眼睛聽', color: '#d8c0ff', quote: '我看不見，所以聽得見火、冰和雷從哪裡來。', eff: '火焰、冰冷、閃電抗性各 +12%（上限照舊 75%）',
    stats: S => { for (const k of ['resF', 'resC', 'resL']) S[k] = Math.max(S[k], Math.min(75, S[k] + 12)); } },
  hassan: { who: '哈桑', hub: 'harbor', name: '多帶一箱', color: '#ffd890', quote: '貨多一箱，路就難走一點。做生意嘛。', eff: '掉落數量 +20%，但怪物生命 +10%' },
  mo: { who: '老漁夫莫', hub: 'harbor', name: '等潮水', color: '#90d0e8', quote: '別急，潮水會自己回來的……', eff: '每秒回復 1.5% 生命，但移動速度 −5%',
    stats: S => { S.moveSpeed *= 0.95; } },
  yin: { who: '茵婆婆', hub: 'grove', name: '苦的才有效', color: '#a0e090', quote: '苦的才有效……再熬久一點……', eff: '持續傷害（點燃、中毒、流血）+25%',
    stats: S => { S.dot_inc = (S.dot_inc || 0) + 25; } },
  karl: { who: '卡爾', hub: 'grove', name: '不准退', color: '#e8b090', quote: '不准退……騎士不准退……', eff: '攻擊與施法速度 +12%，但最大生命 −10%',
    stats: S => { S.aspd_inc = (S.aspd_inc || 0) + 12; S.cspd_inc = (S.cspd_inc || 0) + 12; S.maxLife = Math.max(1, Math.round(S.maxLife * 0.9)); } },
  nova: { who: '諾娃', hub: 'lighthouse', name: '留一盞燈', color: '#fff0a0', quote: '燈不能滅。我會一直添油。', eff: '魔力回復 +60%',
    stats: S => { S.manaRegenPS = (S.manaRegenPS || 0) * 1.6; } },
};
const DreamWords = {
  opts: null, pick: null, act: null,
  pool() { const P = G.P; return Object.keys(DREAMS).filter(k => DREAMS[k].hub === 'cell' || (P && P.hubs && P.hubs[DREAMS[k].hub])); },
  roll() { this.opts = this.pool().sort(() => Math.random() - 0.5).slice(0, 3); if (this.pick && !this.opts.includes(this.pick)) this.pick = null; },
  label(k) { const D = DREAMS[k]; return `${D.who}「${D.name}」`; },
  render() {
    const dev = document.getElementById('mapdev'), list = document.getElementById('mapList'); if (!dev || !list || !G.P) return;
    if (!this.opts) this.roll();
    let box = document.getElementById('dreamWords');
    if (!box) { box = document.createElement('div'); box.id = 'dreamWords'; list.before(box); }
    let h = `<div class="msec">夢話三選一<span class="thint">　借一句營地的人說的夢話，只管下一夜（離開地圖就沒了）</span></div><div class="dwrow">`;
    for (const k of this.opts) { const D = DREAMS[k];
      h += `<button class="dwcard ${this.pick === k ? 'on' : ''}" data-dw="${k}" style="--c:${D.color}"><b>${D.who}「${D.name}」</b><i>「${D.quote}」</i><span>${D.eff}</span></button>`; }
    h += `<button class="dwcard none ${this.pick ? '' : 'on'}" data-dw=""><b>不借</b><span>這一夜照平常走</span></button></div>`;
    if (this.act) h += `<div class="thint" style="padding:0 12px 6px">現在這一夜借的是：${this.label(this.act.id)}</div>`;
    box.innerHTML = h;
    box.querySelectorAll('[data-dw]').forEach(b => b.onclick = () => { this.pick = b.dataset.dw || null; Sfx.play('click'); this.render(); });
  },
  start(w) {
    const k = this.pick; this.pick = null; this.opts = null;
    this.act = { id: k, w0: w, kills: 0, stacks: 0, glenStage: null };
    UI.msg(`借來的夢話：${this.label(k)}　${DREAMS[k].eff}`, DREAMS[k].color);
    onBuildChanged();
  },
  end() { if (!this.act) return; this.act = null; if (G.P) onBuildChanged(); },
};
// 能力：包 computeStats 一次（見檔頭）
const _csDW = computeStats;
computeStats = function (P) {
  const S = _csDW(P), a = DreamWords.act, D = a && DREAMS[a.id];
  if (D && D.stats && G.P === P) D.stats(S, a);
  return S;
};
// 每一區放好怪之後：新的一夜開始就生效；改怪
Hook.on('stage', w => {
  const DW = DreamWords;
  if (!w || w.kind !== 'map' || w.arena || w.rush) return;
  if (DW.pick && (!w.stage || w.stage.i === 1) && (!DW.act || DW.act.w0 !== w)) DW.start(w);
  const a = DW.act; if (!a) return;
  if (a.id === 'sparrow') {
    const base = G.mons.filter(m => !m.dead && !m.boss && m.rarity === 'normal'), n = Math.round(G.mons.filter(m => !m.boss).length * 0.2);
    for (let i = 0; i < n && base.length; i++) { const s = pick(base), p = randomFloorNear(s.x, s.y, 50); G.mons.push(makeMonster(s.type, p.x, p.y, s.mlvl, 'normal', w.theme)); }
  }
  if (a.id === 'hassan') {
    if (!w.mm._dwq) w.mm = Object.assign({}, w.mm, { q: (w.mm.q || 0) + 20, _dwq: true });
    for (const m of G.mons) if (!m.dead && !m._dwl) { m._dwl = true; m.maxLife = Math.round(m.maxLife * 1.1); m.life = m.maxLife; }
  }
  if (a.id === 'glen') a.glenStage = null;
});
// 新的一夜（沒選夢話）→ 上一夜的失效
Hook.on('enterMap', () => { const a = DreamWords.act; if (a && a.w0 !== G.world) DreamWords.end(); });
Hook.on('kill', m => {
  const a = DreamWords.act; if (!a || a.id !== 'olly' || m.isMinion) return;
  a.kills++;
  const st = Math.min(10, Math.floor(a.kills / 50));
  if (st !== a.stacks) { a.stacks = st; onBuildChanged(); if (G.pl) G.texts.push({ x: G.pl.x, y: G.pl.y - 48, txt: `記下來 +${5 * st}%`, color: DREAMS.olly.color, size: 13, t: 0, dur: 1 }); }
});
let _dwOpen = false;
Hook.on('update', dt => {
  const DW = DreamWords, w = G.world;
  if (UI.mapDevOpen && !_dwOpen) DW.render();
  _dwOpen = !!UI.mapDevOpen;
  const a = DW.act; if (!a) return;
  if (!w || w.kind !== 'map' || w.arena) return DW.end();
  const pl = G.pl; if (!pl || G.dead) return;
  if (a.id === 'mo') pl.life = Math.min(G.S.maxLife, pl.life + G.S.maxLife * 0.015 * dt);
  if (a.id === 'glen' && a.glenStage !== w) {
    const m = G.mons.find(x => !x.dead && !x.boss && x.rarity === 'rare' && x.aggro);
    if (m) { a.glenStage = w; m.life = Math.min(m.life, m.maxLife * 0.5); G.texts.push({ x: m.x, y: m.y - m.r - 30, txt: '格倫巡邏過了：只剩半血', color: DREAMS.glen.color, size: 12, t: 0, dur: 1.4 }); burst(m.x, m.y, '#c8e0ff', 12, 120); }
  }
  if (a.id === 'sparrow') for (let i = 0, n = G.loot.length; i < n; i++) { const l = G.loot[i];
    if (!l.jewel || l._dw || l.gone) continue; l._dw = true; dropLoot(l.x, l.y, { jewel: l.jewel }); const nl = G.loot[G.loot.length - 1]; if (nl) nl._dw = true; }
});
// 畫面上方：這一夜借的是哪句（神殿提示在 72px，這裡排在它上面）
setInterval(() => {
  let el = document.getElementById('dreamHud');
  const a = DreamWords.act, D = a && DREAMS[a.id];
  const t = D && G.P ? `夢話．${DreamWords.label(a.id)}：${D.hud ? D.hud(a) : D.eff}` : '';
  if (!el) { if (!t) return; el = document.createElement('div'); el.id = 'dreamHud'; document.body.appendChild(el); }
  el.textContent = t; el.style.display = t ? '' : 'none'; if (t) el.style.color = D.color;
}, 250);
(() => { const st = document.createElement('style'); st.textContent = `
  #dreamHud { position:fixed; left:50%; top:54px; transform:translateX(-50%); font-size:12px; text-shadow:0 0 3px #000,0 0 2px #000; pointer-events:none; z-index:5; max-width:92vw; text-align:center; }
  .dwrow { display:flex; flex-wrap:wrap; gap:6px; padding:4px 10px 8px; }
  .dwcard { flex:1 1 150px; min-height:64px; display:flex; flex-direction:column; align-items:flex-start; gap:2px; text-align:left; padding:6px 8px; border:1px solid #4a3a24; border-radius:6px; background:rgba(0,0,0,.25); cursor:pointer; }
  .dwcard b { color:var(--c, #e8dcc0); font-size:13px; } .dwcard i { font-size:11px; color:#a89878; font-style:normal; } .dwcard span { font-size:12px; color:#e8dcc0; }
  .dwcard.on { border-color:var(--c, #f2d692); box-shadow:0 0 8px rgba(242,214,146,.35); background:rgba(242,214,146,.1); } .dwcard.none { flex:0 1 90px; }`; document.head.appendChild(st); })();
