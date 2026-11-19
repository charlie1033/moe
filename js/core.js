// =============================================================
//  core.js — 共用的「登記點」（在 settings.js 之後就載入，所有模組都能用）。新功能一律用這裡的登記方式，不要再去包裝（覆寫）全域函式。
//  （規則全文見 開發規則.md）
//  Hook.on(事件, fn)      事件由 core-end.js 統一發出：
//     'update'(dt) 每格更新之後　'kill'(m) 怪物死亡之後　'start'(P) 進入角色之後
//     'enterMap'(tier) 進地圖之後　'build'() 能力重算之後　'drawWorld'(g) 畫完地圖物件之後（世界座標）
//     'drawOver'(g) 畫完角色和怪物之後（世界座標）　'light'(cut, cx, cy) 在黑暗上挖光（cut(螢幕x, 螢幕y, 半徑, 強度)）　'glow'(g, cx, cy) 黑暗之後畫彩色光（螢幕座標）
//     'stage'(w) 每一區的怪和事件放好之後　'worldCanvas'(w) 底圖畫一塊的時候（v2.19 分塊畫：每塊各跑一次，只畫 w._chunkRect 的格子，見 game.js）　'terrainChanged'(w, rect|null) 地形變了（換地圖、worldRepaint 給範圍）　'drawHUD'(g) 下方介面全部畫完之後（螢幕座標）　'drawMinimap'(g, mx, my, s) 小地圖上加標記（世界座標 / TS * s + mx）
//     'cast'(sid, c) 放完技能之後（c＝這次施放算好的數值）
//     'hurt'(掉了多少, opts) 角色被打到、真的掉血或掉護盾之後（持續傷害不算）
//     'preHit'(ctx)／'crit'(m, 技能欄) 打中怪之前可改暴擊與倍率／打出暴擊之後（gems4.js 發的，ctx 見那個檔頭）
//     'monKb'(ctx) 怪被打中、算擊退之前（game.js hitMonster 發的）：ctx = { m, dmg 這一下的傷害, kb 擊退倍率（可以改，堅忍用） }
//     'stats'(S, P) 能力算好之後、技能數值算之前（要影響技能傷害的加成放這裡；生命上限、移動速度已經算完，要改就直接改 S.maxLife／S.moveSpeed）
//     'dropItem'(item, l) 裝備掉到地上時（dropLoot 裡發；可以在這裡改這件裝備，例如深層傳奇升級底材）
//  Interact.add(種類, find, use)   按 F 互動：find(pl, w) 回傳 [{ ref, label, r? }]（r＝互動距離，預設 60）
//     系統會挑「離角色最近」的那個放進 G.nearAct，按 F 時呼叫 use(ref)
//  SettingsRows.add(分頁, html, bind)   在 Esc → 設定的某一頁最下面多加一列
// =============================================================
const Hook = {
  m: {},
  on(e, f) { (this.m[e] = this.m[e] || []).push(f); },
  emit(e, ...a) { const l = this.m[e]; if (l) for (const f of l) { try { f(...a); } catch (err) { console.error('[Hook ' + e + ']', err); } } },
};
const Interact = {
  kinds: {},
  add(kind, find, use) { this.kinds[kind] = { find, use }; },
  resolve() {
    const pl = G.pl, w = G.world; if (!pl || !w || !G.P) return;
    // v2.19.10 傳送門（離開地圖）比較的時候多算 48 像素：旁邊有掉落物時按 F 先撿東西，不會一不小心就離開
    const bias = k => (k === 'exit' ? 48 : 0);
    let best = G.nearAct && G.nearAct.ref ? { kind: G.nearAct.kind, ref: G.nearAct.ref, label: G.nearAct.label, d: dist(pl, G.nearAct.ref) + bias(G.nearAct.kind) } : null;
    for (const k in this.kinds) {
      let list; try { list = this.kinds[k].find(pl, w); } catch (err) { console.error('[Interact ' + k + ']', err); }
      if (!list) continue;
      for (const c of list) { const d0 = dist(pl, c.ref), d = d0 + bias(k); if (d0 < (c.r || 60) && (!best || d < best.d)) best = { kind: k, ref: c.ref, label: c.label, d }; }
    }
    G.nearAct = best ? { kind: best.kind, ref: best.ref, label: best.label } : null;
    G.nearNPC = G.nearAct && G.nearAct.kind === 'npc' ? G.nearAct.ref : null;
  },
  use() { const a = G.nearAct, k = a && this.kinds[a.kind]; if (!k) return false; k.use(a.ref); return true; },
};
//  Talk.add(fn)   跟營地的人物（NPC）或路人說話（按 F）時，先問登記者：fn(id, ref) 回傳 true＝這次由它處理（帶話任務、各人的分工）
//     人物有新故事時先說故事；登記者都不處理才打開原本的功能
const Talk = {
  fns: [],
  add(f) { this.fns.push(f); },
  run(id, ref) { for (const f of this.fns) { try { if (f(id, ref)) return true; } catch (err) { console.error('[Talk]', err); } } return false; },
};
//  PanelRows.add('quest', P => html)   任務面板（展開時）最下面多一段（帶話任務）
const PanelRows = {
  rows: {},
  add(tab, f) { (this.rows[tab] = this.rows[tab] || []).push(f); },
  html(tab, P) { let h = ''; for (const f of (this.rows[tab] || [])) { try { h += f(P) || ''; } catch (err) { console.error('[PanelRows ' + tab + ']', err); } } return h; },
};
const SettingsRows = {
  rows: {},
  add(tab, html, bind) { (this.rows[tab] = this.rows[tab] || []).push({ html, bind }); },
  html(tab) { return (this.rows[tab] || []).map(r => r.html()).join(''); },
  bind(tab, root) { for (const r of (this.rows[tab] || [])) if (r.bind) r.bind(root); },
};
//  JournalTabs.add(代號, 分頁名稱, html(), bind(root)?)   日誌（J）上方多一個分頁按鈕（反應圖鑑、第一百三十八本……）；原本的內容是第一頁「記憶與圖鑑」
const JournalTabs = {
  list: [], cur: 'main',
  add(id, name, html, bind) { if (!this.list.some(t => t.id === id)) this.list.push({ id, name, html, bind }); },
  wrap(mainHtml) {
    if (!this.list.length) return mainHtml;
    const t = this.list.find(x => x.id === this.cur); if (!t) this.cur = 'main';
    const tabs = [['main', '記憶與圖鑑']].concat(this.list.map(x => [x.id, x.name]));
    let body = mainHtml; if (t) { try { body = t.html(); } catch (e) { console.error('[JournalTabs ' + t.id + ']', e); } }
    return `<div class="jtabs">${tabs.map(([id, n]) => `<button data-jtab="${id}" class="${this.cur === id ? 'on' : ''}">${n}</button>`).join('')}</div>` + body;
  },
  bind(root, refresh) {
    root.querySelectorAll('[data-jtab]').forEach(b => b.onclick = () => { if (this.cur === b.dataset.jtab) return; this.cur = b.dataset.jtab; refresh(); root.scrollTop = 0; if (root.parentNode) root.parentNode.scrollTop = 0; });
    const t = this.list.find(x => x.id === this.cur); if (t && t.bind) try { t.bind(root); } catch (e) { console.error('[JournalTabs ' + t.id + ']', e); }
  },
};
(() => { const st = document.createElement('style'); st.textContent = `.jtabs { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 6px; padding-bottom:8px; border-bottom:1px solid #4a3a24; }
  .jtabs button { flex:1 1 auto; min-height:32px; font-size:13px; } .jtabs button.on { border-color:#f2d692 !important; color:#ffe6a0 !important; background:rgba(242,214,146,.12) !important; }`; document.head.appendChild(st); })();
//  StatusLines.add(fn)   畫面右上「小地圖下方」的狀態列（v2.18.2：夢話、懸賞、神殿、試煉、守護者、獻祭圈……以前各自釘在畫面正上方，首領戰時五層字疊在一起）
//     fn() 回傳 { t: 文字, c: 顏色 } 或 null／''（不顯示）；所有行由這裡統一縱向排好，不會重疊
//  StatusLines.set(代號, 文字, 顏色)   直接設定一行（文字空白＝拿掉）。舊的 mechHud(代號, top, 顏色, 文字) 也轉到這裡（top 不再使用）
const StatusLines = {
  fns: [], fixed: {},
  add(f) { this.fns.push(f); },
  set(id, t, c) { if (t) this.fixed[id] = { t, c: c || '#e8dcc0' }; else delete this.fixed[id]; },
  lines() {
    const out = []; for (const id in this.fixed) out.push(this.fixed[id]);
    for (const f of this.fns) { let r; try { r = f(); } catch (err) { console.error('[StatusLines]', err); } if (r && r.t) out.push(r); }
    return out;
  },
  draw() {
    let el = document.getElementById('statusStack');
    const on = typeof G !== 'undefined' && G.state === 'play' && G.P && G.world && !(typeof UI !== 'undefined' && UI.storyOpen);
    const L = on ? this.lines() : [];
    if (!el) { if (!L.length) return; el = document.createElement('div'); el.id = 'statusStack'; document.body.appendChild(el); }
    const h = L.map(l => `<div style="color:${l.c}">${String(l.t).replace(/</g, '&lt;')}</div>`).join('');
    if (el._h !== h) { el.innerHTML = h; el._h = h; }
    el.style.display = L.length ? '' : 'none'; if (!L.length) return;
    // 位置：小地圖（含下面那行「怪物 N」）的正下方，靠右；沒有小地圖就貼右上
    const cv = document.getElementById('game'), r = cv && cv.getBoundingClientRect(), mb = G.mmBox && G.mmBox.wd === G.world && CFG.minimap !== 'off' ? G.mmBox : null;
    if (r && r.width) { const sc = r.width / VW; el.style.top = Math.round(r.top + (mb ? mb.y + mb.h + 30 : 10) * sc) + 'px'; el.style.right = Math.round(innerWidth - r.right + 10 * sc) + 'px'; }
  },
};
function mechHud(id, top, color, t) { StatusLines.set(id, t, color); }
//  Goal.add(代號 => 目標)／Goal.live(() => 目標)   v2.20 目標行：劇情最後一頁、確認框底下、狀態列的「目標：……」（目標的寫法和畫法在 goals.js）
const Goal = { fns: [], add(f) { this.fns.push(f); }, live(f) { StatusLines.add(() => this.line ? this.line(f()) : null); } };
// 任務框（DOM）在畫面上的範圍，換成畫面座標記在 G.qbBox：左下的訊息列看到任務框拉長到下面時，就改排在任務框右邊（render.js）
function hudBoxes() {
  if (typeof G === 'undefined') return;
  const q = document.getElementById('questbox'), cv = document.getElementById('game');
  const r = q && q.getClientRects().length ? q.getBoundingClientRect() : null, c = cv && cv.getBoundingClientRect();
  G.qbBox = r && r.height && c && c.width ? { right: (r.right - c.left) * VW / c.width, bottom: (r.bottom - c.top) * VW / c.width } : null;
}
setInterval(() => { StatusLines.draw(); hudBoxes(); }, 200);
(() => { const st = document.createElement('style'); st.textContent = `#statusStack { position:fixed; z-index:5; pointer-events:none; display:flex; flex-direction:column; align-items:flex-end; gap:3px; max-width:min(440px, 48vw); }
  #statusStack div { font-size:13px; font-weight:bold; line-height:1.35; padding:1px 7px; border-radius:3px; background:rgba(6,4,8,.62); text-shadow:0 0 3px #000, 0 1px 1px #000; text-align:right; }
  body.touch #statusStack { max-width:34vw; } body.touch #statusStack div { font-size:11px; padding:1px 5px; }`; document.head.appendChild(st); })();
