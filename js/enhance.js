// =============================================================
//  v2.7 強化系統（取代原本的「材料＋製作」）
//  ・武器：磨石（+1～+4）、異界磨石（+5～+10）
//  ・防具（頭盔、胸甲、手套、鞋子、盾牌／法器）：護貝劑（+1～+4）、高級護貝劑（+5～+10）
//  ・飾品（戒指、項鍊、腰帶）、箭袋、藥劑不能強化
//  ・+1～+4 失敗：只用掉磨石／護貝劑，裝備沒事
//  ・+5～+10 失敗：退一級（例如 +6 升 +7 失敗 → 變 +5），裝備不會碎；有砥石（武器）／針線（防具）就會用掉 1 個，等級不退（v2.17 起不再碎裝）
//  ・效果：每級 +4%（+1～+4）、+6%（+5～+10），加在武器物理傷害（法系武器另外給一半的法術傷害）或防具防禦值
//  ・掉落：v2.17 起這幾種在主線章節完全不掉（主線只掉 MAIN_CURRENCY，見 data.js），深層夢境、懸賞、首領連戰才會掉；主線靠分解裝備的碎片先認識強化
// =============================================================
Object.assign(CURRENCY, {
  whet: { name: '磨石', color: '#b8c4cc', weight: 0, enh: true, desc: '武器強化 +1～+4。失敗只會用掉磨石，武器不會壞。' },
  whet2: { name: '異界磨石', color: '#a88aff', weight: 0, enh: true, desc: '武器強化 +5～+10。失敗時武器退一級（不會碎）；有砥石就會用掉 1 個，等級不退。' },
  lam: { name: '護貝劑', color: '#e0d090', weight: 0, enh: true, desc: '防具（頭盔、胸甲、手套、鞋子、盾牌、法器）強化 +1～+4。失敗只會用掉護貝劑。' },
  lam2: { name: '高級護貝劑', color: '#ffa850', weight: 0, enh: true, desc: '防具強化 +5～+10。失敗時防具退一級（不會壞）；有針線就會用掉 1 組，等級不退。' },
  hone: { name: '砥石', color: '#7ad8c0', weight: 0, enh: true, desc: '武器 +5 以上強化失敗時，自動用掉 1 個，讓武器不會退級（還是算失敗）。' },
  thread: { name: '針線', color: '#f0a0c0', weight: 0, enh: true, desc: '防具 +5 以上強化失敗時，自動用掉 1 組，讓防具不會退級（還是算失敗）。' },
});
// 圖示
Object.assign(CUR_ART, {
  whet: g => { paint(g, 'M18 62 L62 22 L84 38 L40 80 Z', mat(g, '#9aa4ac')); paint(g, 'M26 62 L62 30', 'rgba(255,255,255,0.55)', { s: 3, noOutline: true }); glint(g, 66, 30, 6); },
  whet2: g => { g.shadowColor = '#b090ff'; g.shadowBlur = 10; paint(g, 'M18 62 L62 22 L84 38 L40 80 Z', mat(g, '#6a5aa8')); g.shadowBlur = 0; paint(g, 'M30 60 L46 46 L40 58 L58 42', '#e0d0ff', { s: 3, noOutline: true }); glint(g, 66, 30, 7); },
  lam: g => { paint(g, A_.rrect(32, 34, 36, 50, 8), mat(g, '#d8c890')); paint(g, A_.rrect(40, 18, 20, 18, 4), mat(g, '#8a6a40')); paint(g, 'M38 56 H62', 'rgba(255,255,255,0.6)', { s: 3, noOutline: true }); },
  lam2: g => { g.shadowColor = '#ffb060'; g.shadowBlur = 10; paint(g, A_.rrect(32, 34, 36, 50, 8), mat(g, '#e89040')); g.shadowBlur = 0; paint(g, A_.rrect(40, 18, 20, 18, 4), mat(g, '#6a4a30')); glint(g, 58, 50, 7); },
  hone: g => { paint(g, A_.rrect(16, 40, 68, 26, 8), mat(g, '#5ab0a0')); paint(g, 'M24 48 H76', 'rgba(255,255,255,0.5)', { s: 3, noOutline: true }); glint(g, 72, 44, 5); },
  thread: g => { paint(g, A_.rrect(30, 30, 40, 44, 6), mat(g, '#e890b0')); paint(g, 'M30 40 H70 M30 50 H70 M30 60 H70', 'rgba(120,40,70,0.6)', { s: 2, noOutline: true }); paint(g, 'M70 70 L88 18', '#d8d8e0', { s: 3 }); },
});

// —— 掉落：只有深層夢境會掉（包一次 randomCurrency：要改它的回傳值） ——
const ENH_DROP = [['whet', 30], ['lam', 30], ['whet2', 8], ['lam2', 8], ['hone', 4], ['thread', 4]];
const isDeepWorld = () => { const w = G.world; return !!w && ((w.tier || 0) >= DEEP_TIER || (w.arena && (w.mlvl || 0) >= 70)); };
const _randomCurrencyEnh = randomCurrency;
randomCurrency = function () {
  // 強化通貨：深層夢境每次掉通貨有 2.5% 是強化類；章節不掉（主線的通貨種類由 items.js 的 randomCurrency 管）
  if (isDeepWorld() && Math.random() < 0.025) { const tot = ENH_DROP.reduce((a, b) => a + b[1], 0); let r = Math.random() * tot; for (const [k, w] of ENH_DROP) { r -= w; if (r <= 0) return k; } }
  return _randomCurrencyEnh();
};

// —— 強化規則 ——
const ENH_MAX = 10;
const ENH_RATE = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.32, 0.25, 0.18, 0.12];   // 升到 +1 … +10 的成功率
function enhKind(it) {
  if (!it || isFlask(it) || isStack(it)) return null;
  const b = BASE_BY_ID[it.base]; if (!b) return null;
  if (['ring', 'amulet', 'belt'].includes(b.slot)) return null;
  if (b.slot === 'weapon') return 'weapon';
  if (b.def && ['helmet', 'body', 'gloves', 'boots', 'offhand'].includes(b.slot)) return 'armour';
  return null;
}
function enhInfo(it) {
  const kind = enhKind(it); if (!kind) return { err: '只有武器和防具可以強化（飾品、箭袋不行）' };
  const n = it.enh || 0; if (n >= ENH_MAX) return { err: `已經是 +${ENH_MAX}（最高）` };
  const high = n >= 4;
  const stone = kind === 'weapon' ? (high ? 'whet2' : 'whet') : (high ? 'lam2' : 'lam');
  return { kind, n, to: n + 1, stone, protect: kind === 'weapon' ? 'hone' : 'thread', risk: high, rate: ENH_RATE[n] };
}
// 強化一次。pay(k) 負責扣通貨；useProtect＝失敗時要不要用保護
function enhanceItem(it, pay, have, useProtect = true) {
  const I = enhInfo(it); if (I.err) return { err: I.err };
  if (have(I.stone) < 1) return { err: `沒有${CURRENCY[I.stone].name}` };
  pay(I.stone, 1);
  if (Math.random() < I.rate) {
    it.enh = I.to; Sfx.play(I.to >= 7 ? 'unique' : 'rare');
    G.fx && burst(G.pl.x, G.pl.y - 14, '#ffe8a0', 16, 90);
    return { ok: true, msg: `強化成功！${it.name} → +${it.enh}`, color: '#9fff9f' };
  }
  if (!I.risk) { Sfx.play('deny'); return { ok: false, msg: `強化失敗（+${I.to}），${CURRENCY[I.stone].name}用掉了，裝備沒事`, color: '#ff9a9a' }; }
  if (useProtect && have(I.protect) > 0) { pay(I.protect, 1); Sfx.play('deny'); return { ok: false, msg: `強化失敗（+${I.to}），用掉 1 個${CURRENCY[I.protect].name}，等級沒有退（還是 +${I.n}）`, color: '#ffcf70' }; }
  // 退一級（最低 +0），裝備不會碎
  it.enh = Math.max(0, I.n - 1); Sfx.play('deny');
  return { ok: false, msg: `強化失敗（+${I.to}），${it.name} 退回 +${it.enh}`, color: '#ff8a6a' };
}
// 顯示名稱：+N 前綴
const enhName = it => (it && it.enh ? `+${it.enh} ` : '') + (it ? it.name : '');

// —— 說明框、背包格子 ——
const _tipEnh = itemTipHTML;
itemTipHTML = function (item, opts = {}) {
  let h = _tipEnh(item, opts);
  if (item && item.enh) {
    h = h.replace('<div class="tip-name">', `<div class="tip-name"><span style="color:#ffe070">+${item.enh} </span>`);
    const k = enhKind(item), p = enhPct(item.enh);
    const line = `<div class="tip-mod" style="color:#ffe070">強化 +${item.enh}：${k === 'weapon' ? `物理傷害 +${p}%、法術傷害 +${Math.round(p / 2)}%` : `防禦值 +${p}%`}</div>`;
    h = h.replace(/(<div class="tip-sub">[\s\S]*?<\/div>)/, `$1${line}`);
  }
  return h;
};
const _cellEnh = UI.cellHTML.bind(UI);
UI.cellHTML = function (it) { let h = _cellEnh(it); if (it && it.enh) h += `<b class="enhb">+${it.enh}</b>`; return h; };

// —— 用通貨列／背包裡的磨石直接點裝備 ——
const _useCurEnh = UI.useCurOn.bind(UI);
UI.useCurOn = function (it, e) {
  const k = this.curSel;
  if (!CURRENCY[k] || !CURRENCY[k].enh) return _useCurEnh(it, e);
  if (k === 'hone' || k === 'thread') { this.curSel = null; this.refreshInv(); return this.msg(`${CURRENCY[k].name}不用手動使用：強化 +5 以上失敗時會自動用掉，讓裝備不退級`, '#d8c8a0'); }
  const I = enhInfo(it);
  if (I.err) return this.msg(I.err, '#ff9a9a');
  if (I.stone !== k) return this.msg(`這件要升到 +${I.to}，要用${CURRENCY[I.stone].name}`, '#ff9a9a');
  const go = () => {
    const r = enhanceItem(it, (c, n) => { G.P.cur[c] -= n; }, c => G.P.cur[c] || 0);
    if (r.err) return this.msg(r.err, '#ff9a9a');
    this.msg(r.msg, r.color);
    if (!e.shiftKey || (G.P.cur[k] || 0) <= 0) this.curSel = null;
    this.hideTip(); onBuildChanged(); this.refreshInv(); saveGame();
  };
  go();
};

// —— 分解：不再給材料，改成小機率給通貨 ——
// v2.8.3 分解：武器給「磨石碎片」、防具給「護貝劑碎片」（飾品、箭袋隨機一種），湊滿 SHARD_NEED 片自動變成 1 個
//   數量 1～8 片：稀有度（白 1、藍 2、黃 3、傳奇 5）＋物品等級（每 20 級 +1）＋隨機 −1～+1
function salvageShardN(it) {
  const base = { normal: 1, magic: 2, rare: 3, unique: 5 }[it.rarity] || 1;
  return Math.max(1, Math.min(8, base + Math.floor((it.ilvl || 1) / 20) + rint(-1, 1)));
}
salvageGains = function (it) {
  const P = G.P, got = [];
  if (isFlask(it)) { if (Math.random() < 0.3) { P.cur.transmute++; got.push(CURRENCY.transmute.name); } return got; }
  const kind = enhKind(it), k = kind === 'weapon' ? 'whet' : kind === 'armour' ? 'lam' : (Math.random() < 0.5 ? 'whet' : 'lam');
  const n = salvageShardN(it);
  P.shards = P.shards || {}; P.shards[k] = (P.shards[k] || 0) + n;
  got.push(`${CURRENCY[k].name}碎片 ×${n}`);
  while (P.shards[k] >= SHARD_NEED) { P.shards[k] -= SHARD_NEED; P.cur[k]++; got.push(`湊滿 ${SHARD_NEED} 片 → ${CURRENCY[k].name}`); }
  return got;
};

// —— 工坊（B）：改成強化 ——
UI.enhTarget = '';
UI.refreshCraft = function () {
  if (!this.open.craft || !G.P) return;
  const P = G.P;
  const opts = [];
  for (const s in P.equip) if (P.equip[s] && enhKind(P.equip[s])) opts.push([`eq:${s}`, `身上：${enhName(P.equip[s])}`, P.equip[s]]);
  P.inv.forEach((it, i) => { if (enhKind(it)) opts.push([`inv:${i}`, `背包：${enhName(it)}`, it]); });
  if (!opts.some(o => o[0] === this.enhTarget)) this.enhTarget = opts.length ? opts[0][0] : '';
  const tgt = opts.find(o => o[0] === this.enhTarget);
  const cnt = k => craftCurHave(k);
  let h = `<div class="enhstock">${['whet', 'whet2', 'hone', 'lam', 'lam2', 'thread'].map(k => `<span class="${cnt(k) ? '' : 'zero'}" title="${CURRENCY[k].desc}"><img src="${currencyIconURL(k, 40)}">${CURRENCY[k].name} <b>${cnt(k)}</b></span>`).join('')}</div>
    <div class="ihint">數量包含背包和倉庫（先用背包的）。武器用磨石，防具用護貝劑；戒指、項鍊、腰帶、箭袋不能強化。</div>`;
  h += `<div class="crow"><label style="flex:1">要強化的裝備<select id="etgt" style="width:100%">${opts.map(o => `<option value="${o[0]}" ${o[0] === this.enhTarget ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label></div>`;
  if (!tgt) h += '<div class="ihint">背包和身上都沒有可以強化的武器或防具。</div>';
  else {
    const it = tgt[2], I = enhInfo(it);
    h += `<div class="cmodwrap"><div class="tipcol cmodtip">${itemTipHTML(it)}</div><div class="cops">`;
    if (I.err) h += `<div class="ihint c-bad">${I.err}</div>`;
    else {
      const haveS = cnt(I.stone), haveP = cnt(I.protect), useP = P.ui.enhProtect !== false;
      h += `<div class="enhbig">+${I.n} → <b>+${I.to}</b></div>
        <div class="enhrow">成功率 <b style="color:${I.rate >= 0.6 ? '#9fff9f' : I.rate >= 0.3 ? '#ffcf70' : '#ff8a8a'}">${Math.round(I.rate * 100)}%</b>　效果 ${I.kind === 'weapon' ? '物理傷害' : '防禦值'} +${enhPct(I.n)}% → +${enhPct(I.to)}%</div>
        <div class="enhrow">需要：<img src="${currencyIconURL(I.stone, 40)}">${CURRENCY[I.stone].name} ×1（有 <b class="${haveS ? '' : 'c-bad'}">${haveS}</b>）</div>`;
      if (I.risk) {
        h += `<div class="enhrow"><label><input type="checkbox" id="eprot" ${useP ? 'checked' : ''}> 失敗時用<img src="${currencyIconURL(I.protect, 40)}">${CURRENCY[I.protect].name}保護（有 <b>${haveP}</b>）</label></div>`;
        h += (useP && haveP) ? `<div class="enhrow" style="color:#ffcf70">失敗：用掉 1 個${CURRENCY[I.protect].name}，還是 +${I.n}</div>` : `<div class="enhrow" style="color:#ff9a7a">失敗的話退一級，變成 +${I.n - 1}（不會碎）</div>`;
      } else h += `<div class="enhrow" style="color:#9fd8ff">+1～+4：失敗只會用掉${CURRENCY[I.stone].name}，裝備不會壞</div>`;
      h += `<div class="cbtns"><button id="edo" ${haveS ? '' : 'disabled'}>強化</button></div>`;
    }
    h += `<table class="enhtab"><tr><th>升到</th>${ENH_RATE.map((r, i) => `<th>+${i + 1}</th>`).join('')}</tr><tr><td>成功率</td>${ENH_RATE.map(r => `<td>${Math.round(r * 100)}%</td>`).join('')}</tr><tr><td>失敗</td>${ENH_RATE.map((r, i) => `<td class="${i >= 4 ? 'c-bad' : ''}">${i >= 4 ? '退一級' : '沒事'}</td>`).join('')}</tr></table>`;
    h += '</div></div>';
  }
  $('#craftBody').innerHTML = h;
  const sel = $('#etgt'); if (sel) sel.onchange = () => { this.enhTarget = sel.value; this.refreshCraft(); };
  const pr = $('#eprot'); if (pr) pr.onchange = () => { P.ui.enhProtect = pr.checked; this.refreshCraft(); };
  const btn = $('#edo');
  if (btn && tgt) btn.onclick = () => {
    const it = tgt[2], useP = P.ui.enhProtect !== false;
    const go = () => {
      const r = enhanceItem(it, (c, n) => craftCurPay(c, n), cnt, useP);
      if (r.err) return this.msg(r.err, '#ff9a9a');
      this.msg(r.msg, r.color);
      onBuildChanged(); this.refreshInv(); this.refreshCraft(); saveGame();
    };
    go();
  };
};

// —— 舊存檔：材料換成亂夢（每 25 個材料換 1 顆，至少 1 顆） ——
function convertOldMats() {
  const P = G.P; if (P.matsGone) return;
  let n = 0;
  for (let i = 0; i < P.inv.length; i++) { const it = P.inv[i]; if (it && it.stack === 'mat') { n += it.n; P.inv[i] = null; } }
  if (G.stash && !G.stash.matsGone) {
    for (const tab of G.stash.tabs) for (let i = 0; i < tab.length; i++) { const it = tab[i]; if (it && it.stack === 'mat') { n += it.n; tab[i] = null; } }
    if (G.stash.spec && G.stash.spec.mat) { for (const k in G.stash.spec.mat) n += G.stash.spec.mat[k]; G.stash.spec.mat = {}; }
    G.stash.matsGone = true;
  }
  P.matsGone = true;
  if (n > 0) { const c = Math.max(1, Math.floor(n / 25)); P.cur.chaos += c; setTimeout(() => UI.msg(`工坊改成「強化」了：你的 ${n} 個舊材料換成了 ${c} 顆亂夢`, '#ffd36a'), 1500); saveGame(); }
}
Hook.on('start', () => { try { convertOldMats(); } catch (e) { } });

(() => {
  const st = document.createElement('style');
  st.textContent = `
  .enhb { position:absolute; left:2px; top:1px; font-size:11px; color:#ffe070; text-shadow:0 0 3px #000,0 0 2px #000; pointer-events:none; }
  .enhstock { display:flex; flex-wrap:wrap; gap:4px 10px; margin:8px 10px 2px; font-size:12px; color:#f0e0c0; }
  .enhstock span { display:flex; align-items:center; gap:3px; } .enhstock span.zero { opacity:0.4; } .enhstock img { width:22px; height:22px; }
  .enhbig { font-size:22px; color:#ffe070; margin:4px 0 6px; } .enhbig b { color:#fff6c0; }
  .enhrow { font-size:13px; color:#e8dcc0; margin:3px 0; display:flex; align-items:center; gap:4px; flex-wrap:wrap; } .enhrow img { width:20px; height:20px; }
  .enhtab { border-collapse:collapse; margin-top:10px; font-size:11px; } .enhtab th, .enhtab td { padding:1px 4px; text-align:center; color:#d8ccb4; border-top:1px solid #2a2218; } .enhtab th { color:#c8a868; }`;
  document.head.appendChild(st);
})();
