// =============================================================
//  core.js — 共用的「登記點」（在 settings.js 之後就載入，所有模組都能用）。新功能一律用這裡的登記方式，不要再去包裝（覆寫）全域函式。
//  （規則全文見 開發規則.md）
//  Hook.on(事件, fn)      事件由 core-end.js 統一發出：
//     'update'(dt) 每格更新之後　'kill'(m) 怪物死亡之後　'start'(P) 進入角色之後
//     'enterMap'(tier) 進地圖之後　'build'() 能力重算之後　'drawWorld'(g) 畫完地圖物件之後（世界座標）
//     'drawOver'(g) 畫完角色和怪物之後（世界座標）　'light'(cut, cx, cy) 在黑暗上挖光（cut(螢幕x, 螢幕y, 半徑, 強度)）　'glow'(g, cx, cy) 黑暗之後畫彩色光（螢幕座標）
//     'stage'(w) 每一區的怪和事件放好之後　'worldCanvas'(w) 地圖底圖畫好之後（畫進底圖、只畫一次）
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
    let best = G.nearAct && G.nearAct.ref ? { kind: G.nearAct.kind, ref: G.nearAct.ref, label: G.nearAct.label, d: dist(pl, G.nearAct.ref) } : null;
    for (const k in this.kinds) {
      let list; try { list = this.kinds[k].find(pl, w); } catch (err) { console.error('[Interact ' + k + ']', err); }
      if (!list) continue;
      for (const c of list) { const d = dist(pl, c.ref); if (d < (c.r || 60) && (!best || d < best.d)) best = { kind: k, ref: c.ref, label: c.label, d }; }
    }
    G.nearAct = best ? { kind: best.kind, ref: best.ref, label: best.label } : null;
    G.nearNPC = G.nearAct && G.nearAct.kind === 'npc' ? G.nearAct.ref : null;
  },
  use() { const a = G.nearAct, k = a && this.kinds[a.kind]; if (!k) return false; k.use(a.ref); return true; },
};
const SettingsRows = {
  rows: {},
  add(tab, html, bind) { (this.rows[tab] = this.rows[tab] || []).push({ html, bind }); },
  html(tab) { return (this.rows[tab] || []).map(r => r.html()).join(''); },
  bind(tab, root) { for (const r of (this.rows[tab] || [])) if (r.bind) r.bind(root); },
};
