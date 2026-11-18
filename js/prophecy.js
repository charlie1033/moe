// =============================================================
//  v2.17 瞻望之柱 → 預言三選一（原本的「開全圖、掉落 +25%、召來被預言的敵人」拿掉了）
//  按 F 凝視柱子，畫面暫停跳出三張卡（按 1／2／3 或點卡片）：
//   ① 精英的預言：離你最近的藍色或黃色精英多 2 個精英能力（沒有就在柱子旁邊叫出一隻黃色精英）；
//      牠倒下時必掉一件有夢痕的黃裝，再加一批寶物（3 件起、稀有度 +40%）
//   ② 豐收的預言：這一區掉的通貨每顆都變兩顆，但這一區不掉任何裝備（藥劑、寶石、珠寶照掉）
//   ③ 巨獸的預言：這一區活著的守護者（沒有守護者就用黃色精英，至少 2 隻）合成一隻巨怪：
//      生命是全部加起來 ×1.1、傷害 ×1.5、體型變大；倒下時掉一批寶物（每合成 1 隻多 4 件、保底黃裝同數量、稀有度 +60%）
//  ChoiceBox：通用的「三選一」視窗（開著時遊戲暫停，ui.js 的 UI.paused 會看 ChoiceBox.open）。爬塔的「夢的贈禮」也用它。
//    ChoiceBox.show(標題, 副標, [{ name, text, color, off }], 選了之後(第幾個))
//  資料：都在這張地圖上（G.world.lootRule、怪身上的 m.prophElite／m.prophGiant），不存檔
// =============================================================
const ChoiceBox = {
  open: false, cb: null,
  show(title, sub, opts, cb) {
    let box = document.getElementById('choicebox');
    if (!box) { box = document.createElement('div'); box.id = 'choicebox'; document.body.appendChild(box); }
    box.innerHTML = `<div class="cb-wrap"><div class="cb-title">${title}</div><div class="cb-sub">${sub || ''}</div><div class="cb-cards">${opts.map((o, i) =>
      `<div class="cb-card${o.off ? ' off' : ''}" data-i="${i}" style="--c:${o.color || '#ffe9a0'}"><b>${i + 1}．${o.name}</b><span>${o.text}</span></div>`).join('')}</div></div>`;
    this.open = true; this.cb = cb; this.opts = opts; box.classList.add('show');
    if (typeof input !== 'undefined') { input.keys = {}; input.l = input.r = false; }
    box.querySelectorAll('.cb-card').forEach(el => el.onclick = () => this.pick(+el.dataset.i));
  },
  pick(i) { const o = this.opts && this.opts[i]; if (!this.open || !o || o.off) return; const cb = this.cb; this.close(); Sfx.play('click'); if (cb) cb(i); },
  close() { this.open = false; this.cb = null; const box = document.getElementById('choicebox'); if (box) box.classList.remove('show'); },
};
window.addEventListener('keydown', e => {
  if (!ChoiceBox.open) return;
  const k = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code); if (k >= 0) ChoiceBox.pick(k);
  e.stopPropagation(); e.preventDefault();
}, true);
Hook.on('enterMap', () => ChoiceBox.close());
Hook.on('start', () => ChoiceBox.close());
// 給一隻怪多加 n 個精英能力（照 game.js makeMonster 的算法）
function monAddMods(m, n) {
  const have = new Set(m.modIds || []), pool = MONSTER_MODS.filter(x => (!x.minLvl || m.mlvl >= x.minLvl) && !have.has(x.id));
  m.modIds = m.modIds || [];
  for (let i = 0; i < n && pool.length; i++) {
    const mod = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    m.mods.push(mod.name); m.modIds.push(mod.id);
    if (mod.speed) { m.speed *= mod.speed; m.baseSpeed = m.speed; }
    if (mod.aspd) { m.aspd *= mod.aspd; m.baseAspd = m.aspd; }
    if (mod.dmg) { m.dmg = m.dmg.map(v => v * mod.dmg); m.baseDmg = m.dmg.slice(); }
    if (mod.life) { m.maxLife = Math.round(m.maxLife * mod.life); m.life = m.maxLife; }
    if (mod.regen) m.regen = mod.regen; if (mod.vamp) m.vamp = true; if (mod.addElem) m.addElem = mod.addElem;
    if (mod.id === 'shield') { m.shieldMax = m.maxLife * 0.4; m.shield = m.shieldMax; }
  }
}
function prophMergeList() {
  const g = G.mons.filter(m => m.guardian && !m.dead && !m.boss);
  return g.length >= 2 ? { list: g, who: '守護者' } : { list: G.mons.filter(m => !m.dead && !m.boss && m.rarity === 'rare' && !m.hidden), who: '黃色精英' };
}
function visionProphecy(ev) {
  const w = G.world, mg = prophMergeList(), canMerge = mg.list.length >= 2;
  ChoiceBox.show('瞻望之柱', '柱子上的眼睛看見了三種未來。選一個。', [
    { name: '精英的預言', color: '#ffd84a', text: '離你最近的精英多 2 個精英能力，<br>但牠倒下時<b>必掉一件有夢痕的黃裝</b>，再加一批寶物' },
    { name: '豐收的預言', color: '#e8d8a8', text: '這一區掉的<b>通貨全部加倍</b>，<br>但這一區<b>不會掉任何裝備</b>' },
    { name: '巨獸的預言', color: '#ff8a70', off: !canMerge, text: canMerge ? `這一區的 ${mg.list.length} 隻${mg.who}<b>合成一隻巨怪</b>，<br>很難打，但掉落好很多` : '這一區沒有可以合成的精英（要 2 隻以上）' },
  ], i => {
    if (G.world !== w) return;
    burst(ev.x, ev.y - 30, '#ffe9a0', 24, 160);
    if (i === 0) prophElite(ev, w);
    else if (i === 1) prophHarvest(w);
    else prophGiant(w);
    saveGame();
  });
}
function prophElite(ev, w) {
  let best = null, bd = 1e9;
  for (const m of G.mons) { if (m.dead || m.boss || m.hidden || m.prophElite || !(m.rarity === 'magic' || m.rarity === 'rare')) continue; const d = dist(m, G.pl); if (d < bd) { bd = d; best = m; } }
  if (!best) { const p = randomFloorNear(ev.x + rnd(-60, 60), ev.y + rnd(-60, 60), 40); best = makeMonster(pick(w.theme.monsters), p.x, p.y, w.mlvl + 2, 'rare', w.theme); G.mons.push(best); }
  monAddMods(best, 2); best.prophElite = true; best.aggro = true; best.name = '被預言的・' + best.name;
  burst(best.x, best.y, '#ffd84a', 20, 160);
  UI.banner('精英的預言', `${best.name} 變強了，打倒牠必掉夢痕裝`, '#ffd84a');
}
function prophHarvest(w) {
  const st = w.stage ? w.stage.i : 0;
  w.lootRule = (o, x, y) => {
    if (G.world !== w || (w.stage ? w.stage.i : 0) !== st) return true;
    if (o.item && !isFlask(o.item)) return false;
    if (o.cur && !o._dup) dropLoot(x, y, Object.assign({}, o, { _dup: true }));
    return true;
  };
  UI.banner('豐收的預言', '這一區通貨加倍・不掉裝備', '#e8d8a8');
}
function prophGiant(w) {
  const { list, who } = prophMergeList(); if (list.length < 2) return;
  const big = list[0], n = list.length;
  big.maxLife = Math.round(list.reduce((s, m) => s + m.maxLife, 0) * 1.1); big.life = big.maxLife;
  big.dmg = big.dmg.map(v => v * 1.5); big.baseDmg = big.dmg.slice();
  big.scale = (big.scale || 2) + 1.5; big.r = (big.r || 14) * 1.5; big.prophGiant = n; big.aggro = true; big.name = '巨獸・' + big.name.replace(/^守護者・/, '');
  for (const m of list.slice(1)) { burst(m.x, m.y, '#ff8a70', 14, 140); G.mons.splice(G.mons.indexOf(m), 1); }
  G.fx.push({ k: 'ring', x: big.x, y: big.y, r: 120, t: 0, dur: 0.5, color: '#ff8a70', fill: 'rgba(255,138,112,0.18)' }); G.shake = Math.max(G.shake, 6);
  UI.banner('巨獸的預言', `${n} 隻${who}合成了一隻巨怪`, '#ff8a70');
}
Hook.on('kill', m => {
  if (m.prophElite) {
    const L = m.mlvl + 2, it = makeItem(pickBase(L).id, 'rare', L); if (!it.scar && typeof rollScar === 'function') rollScar(it);
    dropLoot(m.x, m.y, { item: it }); mapLoot(m.x, m.y, { n: 3, r: 40, bonus: 5, ilvl: L });
  }
  if (m.prophGiant) mapLoot(m.x, m.y, { n: 4 * m.prophGiant, r: 60, bonus: 7, rare: m.prophGiant, ilvl: m.mlvl + 2 });
});
(() => { const st = document.createElement('style'); st.textContent = `#choicebox { position:fixed; inset:0; z-index:4900; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.6); }
  #choicebox.show { display:flex; } .cb-wrap { max-width:min(860px, calc(100vw - 32px)); max-height:90vh; overflow:auto; padding:16px 18px; border:1px solid #8a6a3a; border-radius:8px; background:linear-gradient(#2a2018, #14100c); color:#eadcc0; }
  .cb-title { font-size:22px; color:#ffe9a0; text-align:center; } .cb-sub { font-size:13px; color:#a89878; text-align:center; margin:2px 0 12px; }
  .cb-cards { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; }
  .cb-card { border:2px solid #4a3a2a; border-radius:8px; padding:12px; cursor:pointer; background:rgba(255,255,255,.03); display:flex; flex-direction:column; gap:6px; user-select:none; }
  .cb-card:hover { border-color:var(--c); background:rgba(255,255,255,.07); } .cb-card b { color:var(--c); font-size:17px; } .cb-card span { font-size:13px; line-height:1.55; color:#d8ccb4; } .cb-card span b { font-size:13px; }
  .cb-card.off { opacity:.4; cursor:default; } .cb-card.off:hover { border-color:#4a3a2a; }`; document.head.appendChild(st); })();
