// =============================================================
//  v2.20.9 帶一個人的信物入夢（特色差異化提案方向五）
//  玩家看到：打開夢之門，最上面多一排「身上帶著誰的東西」：營地的人各給一樣東西，選一樣帶進夢裡（也可以不帶）
//    每樣信物改一條規則；帶著同一個人的東西走越多夜，關係越深（第 1 夜起 Lv1、3 夜 Lv2、8 夜 Lv3），效果變強、那個人會多說一句話
//    跟「夢話三選一」不一樣：夢話是隨機的一夜加成；信物是長期的關係（選了會一直帶著，直到你換）
//   小雀的石頭：地上的通貨、珠寶、寶石會自己滾向你（範圍 110／170／250）
//   格倫的燈：身邊亮一大圈；範圍內的精英怪會出現在小地圖上（範圍 500／800／1200）
//   歐莉的筆：每一夜第一次倒下不算，歐莉替你劃掉：原地站起來（生命 30％／50％／70％）
//   老漁夫莫的浮標：每一區第一隻倒下的精英會多浮上東西（1 件稀有／＋通貨／2 件稀有＋通貨）
//   茵婆婆的湯碗：生命低於 35% 時自動喝一口，回 25％／35％／50％ 生命（冷卻 60／50／40 秒）
//   卡爾的盾：格擋機率 +4／7／10%
//  能帶誰：牢房的歐莉、格倫、小雀一定可以；其他人要先去過他們的營地（跟夢話一樣）
//  資料：P.token＝帶著的信物代號；P.tokenBond[代號]＝帶著進過幾夜；P.tokenLv[代號]＝已經說過話的等級；地圖上用 w.tokPen、w.tokFloat
//  接點：Hook 'update'、'enterMap'、'kill'、'treeStats'、'preDie'、'light'、'drawMinimap'；夢之門的清單上方
// =============================================================
const TOKENS = {
  sparrow: { who: '小雀', hub: 'cell', name: '小雀的石頭', color: '#ffb0e0', rule: ['地上的通貨、珠寶、寶石會自己滾向你', [110, 170, 250], v => `範圍 ${v}`],
    lines: ['小雀：「這顆給你。它會自己滾回來找你喔。」', '小雀：「石頭說你走了好遠。它都記得。」', '小雀：「你看，它現在會帶朋友一起滾回來了。」'] },
  glen: { who: '格倫', hub: 'cell', name: '格倫的燈', color: '#ffd27a', rule: ['身邊亮一大圈，範圍內的精英會出現在小地圖上', [500, 800, 1200], v => `範圍 ${v}`],
    lines: ['格倫：「拿著。路暗的時候，燈會先替你看。」', '格倫：「燈油我加滿了。別讓它熄。」', '格倫：「這盞燈跟我巡邏了一百年。現在它跟你走。」'] },
  olly: { who: '歐莉', hub: 'cell', name: '歐莉的筆', color: '#f0d8a0', rule: ['每一夜第一次倒下不算：歐莉替你劃掉，原地站起來', [30, 50, 70], v => `生命 ${v}%`],
    lines: ['歐莉：「我替你記著。倒下一次，我就劃掉一次。」', '歐莉：「冊子上劃掉的地方越來越多。表示你越來越常回來。」', '歐莉：「這支筆只剩一點墨水了。剩下的，全部給你。」'] },
  mo: { who: '老漁夫莫', hub: 'harbor', name: '莫的浮標', color: '#80d8e0', rule: ['每一區第一隻倒下的精英，會多浮上東西', [1, 2, 3], v => ['1 件稀有', '1 件稀有＋通貨', '2 件稀有＋通貨'][v - 1]],
    lines: ['莫：「浮標動了，就是有東西上鉤。別急。」', '莫：「你帶回來的東西，比我釣到的還多。」', '莫：「我這根浮標，終於釣到一個會回來的人。」'] },
  yin: { who: '茵婆婆', hub: 'grove', name: '茵的湯碗', color: '#a0e070', rule: ['生命低於 35% 時自動喝一口', [25, 35, 50], v => `回 ${v}% 生命`], cd: [60, 50, 40],
    lines: ['茵：「湯碗拿去。痛的時候喝一口，很苦，但有用。」', '茵：「碗底有一道裂痕。是我妹妹小時候摔的。」', '茵：「你喝的不是湯，是我這一百年想說的話。」'] },
  karl: { who: '卡爾', hub: 'grove', name: '卡爾的盾', color: '#c8d8ff', rule: ['格擋機率提高', [4, 7, 10], v => `+${v}%`],
    lines: ['卡爾：「盾借你。這一次，換我走在你後面。」', '卡爾：「你舉盾的樣子，越來越像大人了。」', '卡爾：「我不用再跟著你了。盾知道路。」'] },
};
const TOKEN_LV_AT = [0, 3, 8];   // 帶著進過幾夜 → Lv2、Lv3
const Tokens = {
  pool() { const P = G.P; return Object.keys(TOKENS).filter(k => TOKENS[k].hub === 'cell' || (P && P.hubs && P.hubs[TOKENS[k].hub])); },
  bond(k) { const P = G.P; return (P && P.tokenBond && P.tokenBond[k]) || 0; },
  lv(k) { const b = this.bond(k); return b >= TOKEN_LV_AT[2] ? 3 : b >= TOKEN_LV_AT[1] ? 2 : 1; },
  cur() { const P = G.P, k = P && P.token; return k && TOKENS[k] ? k : null; },
  val(k) { return TOKENS[k].rule[1][this.lv(k) - 1]; },
  inDream() { const w = G.world; return !!(w && w.kind === 'map' && !w.arena); },
  set(k) {
    const P = G.P; P.token = k || null;
    if (k) { const L = P.tokenLv || (P.tokenLv = {}); if (!L[k]) { L[k] = 1; UI.msg(TOKENS[k].lines[0], TOKENS[k].color); } }
    onBuildChanged(); saveGame(); this.render();
  },
  render() {
    const list = document.getElementById('mapList'); if (!list || !G.P) return;
    let box = document.getElementById('tokens');
    if (!box) { box = document.createElement('div'); box.id = 'tokens'; const dw = document.getElementById('dreamWords'); (dw || list).before(box); }
    const cur = this.cur();
    let h = `<div class="msec">身上帶著誰的東西<span class="thint">　選一樣帶進夢裡，會一直帶著直到你換。帶著同一個人的東西走越多夜，關係越深（3 夜、8 夜各升一級）</span></div><div class="tkrow">`;
    for (const k of this.pool()) {
      const T = TOKENS[k], lv = this.lv(k), b = this.bond(k), nx = TOKEN_LV_AT[lv];
      h += `<button class="tkcard ${cur === k ? 'on' : ''}" data-tk="${k}" style="--c:${T.color}"><b>${T.name}</b><span>${T.rule[0]}（${T.rule[2](this.val(k))}）</span><i>${'★'.repeat(lv)}${'☆'.repeat(3 - lv)}　帶過 ${b} 夜${lv < 3 ? `，再 ${nx - b} 夜升級` : ''}</i></button>`;
    }
    h += `<button class="tkcard none ${cur ? '' : 'on'}" data-tk=""><b>不帶</b><span>這一夜誰的東西都不帶</span></button></div>`;
    box.innerHTML = h;
    box.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { Sfx.play('click'); this.set(b.dataset.tk || null); });
  },
};
// 進一夜：帶著的人關係 +1；剛升級就說一句話
Hook.on('enterMap', () => {
  const P = G.P, k = Tokens.cur(), w = G.world; if (!P || !w) return;
  w.tokPen = false; w.tokFloat = {}; w.tokSoupT = 0;
  if (!k || !(w.tier > 0)) return;
  const B = P.tokenBond || (P.tokenBond = {}); B[k] = (B[k] || 0) + 1;
  const L = P.tokenLv || (P.tokenLv = {}), lv = Tokens.lv(k);
  if (lv > (L[k] || 1)) { L[k] = lv; const T = TOKENS[k]; UI.banner(`${T.name}　Lv${lv}`, T.lines[lv - 1], T.color); if (typeof Book138 !== 'undefined' && Book138.note) Book138.note('record', `${T.who}的東西跟著你走了 ${B[k]} 夜。${T.lines[lv - 1]}`); }
  onBuildChanged();
});
// 卡爾的盾：格擋
Hook.on('treeStats', S => { if (Tokens.cur() === 'karl') addStat(S, 'block', Tokens.val('karl')); });
// 歐莉的筆：這一夜第一次倒下不算
Hook.on('preDie', dz => {
  const w = G.world, pl = G.pl; if (Tokens.cur() !== 'olly' || !Tokens.inDream() || w.tokPen) return;
  w.tokPen = true; dz.cancel = true;
  pl.life = Math.round(G.S.maxLife * Tokens.val('olly') / 100); if (pl.es != null && G.S.maxES) pl.es = G.S.maxES * 0.3;
  if (pl.ail) pl.ail = {};
  for (const m of G.mons) if (!m.dead && Math.hypot(m.x - pl.x, m.y - pl.y) < 160) { const a = Math.atan2(m.y - pl.y, m.x - pl.x); m.kx = (m.kx || 0) + Math.cos(a) * 260; m.ky = (m.ky || 0) + Math.sin(a) * 260; }
  G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: 140, t: 0, dur: 0.6, color: '#f0d8a0', fill: 'rgba(240,216,160,0.2)' }); burst(pl.x, pl.y, '#f0d8a0', 40, 240);
  UI.banner('歐莉替你劃掉了這一次', '「這次不算。站起來。」（這一夜只能劃掉一次）', '#f0d8a0'); Sfx.play('levelup');
});
// 莫的浮標：每一區第一隻倒下的精英多掉
Hook.on('kill', m => {
  if (Tokens.cur() !== 'mo' || !Tokens.inDream() || !m || m.boss || !['magic', 'rare'].includes(m.rarity)) return;
  const w = G.world, k = (w.stage && w.stage.i) || 1; if (!w.tokFloat) w.tokFloat = {}; if (w.tokFloat[k]) return; w.tokFloat[k] = true;
  const lv = Tokens.lv('mo'), il = (w.mlvl || 1) + 2;
  for (let n = 0; n < (lv >= 3 ? 2 : 1); n++) { let it = null; for (let j = 0; j < 12 && (!it || !['rare', 'unique'].includes(it.rarity)); j++) it = randomItem(il, 2); if (it) dropLoot(m.x, m.y, { item: it }); }
  if (lv >= 2) for (const c of ['chaos', 'alch']) dropLoot(m.x, m.y, { cur: c });
  G.texts.push({ x: m.x, y: m.y - 40, txt: '浮標動了', color: TOKENS.mo.color, size: 13, t: 0, dur: 1.2 });
});
Hook.on('update', dt => {
  const k = Tokens.cur(), pl = G.pl, w = G.world; if (!k || !pl || !w || G.dead || !Tokens.inDream() || UI.paused()) return;
  // 小雀的石頭：通貨、珠寶、寶石滾過來
  if (k === 'sparrow') { const R = Tokens.val('sparrow'); for (const l of G.loot) { if (l.gone || l.item || l.t < 0.4) continue; const d = Math.hypot(l.x - pl.x, l.y - pl.y); if (d > 8 && d < R) { const sp = Math.min(d, 240 * dt); l.x -= (l.x - pl.x) / d * sp; l.y -= (l.y - pl.y) / d * sp; l.wr = null; } } }
  // 茵的湯碗：低血自動喝一口
  if (k === 'yin') { w.tokSoupT = Math.max(0, (w.tokSoupT || 0) - dt);
    if (!w.tokSoupT && pl.life < G.S.maxLife * 0.35) { const lv = Tokens.lv('yin'); pl.life = Math.min(G.S.maxLife, pl.life + G.S.maxLife * Tokens.val('yin') / 100); w.tokSoupT = TOKENS.yin.cd[lv - 1];
      G.texts.push({ x: pl.x, y: pl.y - 46, txt: '喝了一口苦湯', color: TOKENS.yin.color, size: 13, t: 0, dur: 1.2 }); burst(pl.x, pl.y, '#a0e070', 16, 120); } }
});
// 格倫的燈：亮一大圈；小地圖上看得到範圍內的精英
Hook.on('light', (cut, cx, cy) => { if (Tokens.cur() === 'glen' && Tokens.inDream() && G.pl) cut(G.pl.x - cx, G.pl.y - cy, 120 + Tokens.lv('glen') * 50, 0.5); });
Hook.on('drawMinimap', (g, mx, my, s) => {
  if (Tokens.cur() !== 'glen' || !Tokens.inDream() || !G.pl) return;
  const w = G.world, V = G.mmView && G.mmView.wd === w ? G.mmView : { x: mx, y: my, w: w.W * s, h: w.H * s }, R = Tokens.val('glen');
  g.save(); g.beginPath(); g.rect(V.x, V.y, V.w, V.h); g.clip();
  for (const m of G.mons) { if (m.dead || m.boss || !['magic', 'rare'].includes(m.rarity) || Math.hypot(m.x - G.pl.x, m.y - G.pl.y) > R) continue;
    g.fillStyle = m.rarity === 'rare' ? '#ffe060' : '#8fa0ff'; g.beginPath(); g.arc(mx + m.x / TS * s, my + m.y / TS * s, Math.max(2.2, s * 1.1), 0, Math.PI * 2); g.fill(); }
  g.restore();
});
// 夢之門打開時畫清單（放在夢話上面）
let _tkOpen = false;
Hook.on('update', () => { if (UI.mapDevOpen && !_tkOpen) Tokens.render(); _tkOpen = !!UI.mapDevOpen; });
// 狀態列：現在帶著誰的東西
if (typeof StatusLines !== 'undefined' && StatusLines.add) StatusLines.add(() => { const k = Tokens.cur(); return k && Tokens.inDream() ? { t: `帶著：${TOKENS[k].name} Lv${Tokens.lv(k)}`, c: TOKENS[k].color } : null; });
(() => { const st = document.createElement('style'); st.textContent = `#tokens .tkrow { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:6px; padding:4px 12px 8px; }
  #tokens .tkcard { text-align:left; padding:6px 8px; cursor:pointer; display:flex; flex-direction:column; gap:2px; font:inherit; background:rgba(20,16,12,.85); color:#e8dcc0; border:1px solid #4a3d28; border-left:4px solid var(--c, #8a7a60); border-radius:5px; }
  #tokens .tkcard b { font-size:13px; color:var(--c, #e8dcc0); } #tokens .tkcard span { font-size:11px; color:#c8b48a; } #tokens .tkcard i { font-style:normal; font-size:11px; color:#ffd27a; }
  #tokens .tkcard.on { box-shadow:0 0 0 2px #ffe08a inset; background:rgba(60,48,24,.9); } #tokens .tkcard:hover { border-color:#e8c070; }`; document.head.appendChild(st); })();
