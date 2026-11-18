// =============================================================
//  v2.5.3 背包拖曳
//  ・從背包拖到上方裝備格 → 穿上（戒指可以指定左邊或右邊那格）
//  ・藥劑拖到藥劑欄的某一格 → 放進那一格（原本那瓶回到背包）
//  ・拖到背包裡另一格 → 換位置
//  ・拖到背包視窗外面（遊戲畫面上）→ 丟在腳邊（傳奇會先問一次）
//  ・拖的時候：可以放的格子淡淡反白，滑鼠指到的那格（要被換掉的那格）更亮
//  ・只點一下（沒有拖）照舊：左鍵選取、右鍵裝備
// =============================================================
const DragItem = {
  d: null,
  init() {
    // 圖片預設可以被瀏覽器拖走（會搶掉我們的拖曳），在背包裡一律擋掉
    document.getElementById('inv').addEventListener('dragstart', e => e.preventDefault());
    document.querySelectorAll('#invgrid .icell').forEach(el => {
      el.addEventListener('pointerdown', e => this.start(e, +el.dataset.i));
      // 拖完放開時，瀏覽器還會送一個 click，要擋掉，不然會變成「選取」
      el.addEventListener('click', e => { if (this.justDropped) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    });
  },
  start(e, i) {
    if (e.button !== 0 || !G.P || UI.curSel) return;   // 正在用通貨時，左鍵是「使用通貨」
    const it = G.P.inv[i]; if (!it) return;
    this.d = { i, it, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, over: null };
    const move = ev => this.move(ev), up = ev => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); this.end(ev); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  },
  // 這件物品可以放在哪些格子：回傳一串 { el, kind, key }
  targets(it) {
    const out = [];
    if (isFlask(it)) {
      document.querySelectorAll('#flaskbar [data-fi]').forEach(el => out.push({ el, kind: 'flask', key: +el.dataset.fi }));
      return out;
    }
    if (isStack(it)) return out;   // 通貨、材料、寶石：只能在背包裡換位置
    const b = BASE_BY_ID[it.base]; if (!b) return out;
    const slots = b.slot === 'ring' ? ['ring1', 'ring2'] : [b.slot];
    for (const s of slots) { const el = document.querySelector(`#doll .eslot[data-slot="${s}"]`); if (el) out.push({ el, kind: 'equip', key: s }); }
    return out;
  },
  move(ev) {
    const d = this.d; if (!d) return;
    if (!d.moved) {
      if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 7) return;
      d.moved = true; UI.hideTip();
      const g = document.createElement('img'); g.className = 'dragghost';
      g.src = isFlask(d.it) ? flaskIconURL(d.it.type, 64) : itemIconOfURL(d.it, 64);
      document.body.appendChild(g); d.ghost = g;
      d.tg = this.targets(d.it);
      // 拖起來的那格變暗；可以放的格子淡淡反白（不能穿的，例如屬性不夠，就標紅）
      document.querySelector(`#invgrid .icell[data-i="${d.i}"]`).classList.add('dragsrc');
      const err = isFlask(d.it) || isStack(d.it) ? null : canEquip(d.it);
      for (const t of d.tg) t.el.classList.add(err ? 'dropbad' : 'dropok');
      d.err = err;
      document.body.classList.add('dragging');
    }
    d.ghost.style.left = ev.clientX + 'px'; d.ghost.style.top = ev.clientY + 'px';
    // 滑鼠下面是哪一格
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const hit = d.tg.find(t => el && t.el.contains(el));
    const invCell = el && el.closest && el.closest('#invgrid .icell');
    const outside = this.isOutside(el);
    if (d.over && d.over !== hit) d.over.el.classList.remove('dropover');
    d.over = hit || null; if (hit) hit.el.classList.add('dropover');
    document.querySelectorAll('#invgrid .icell.dropover').forEach(c => { if (c !== invCell) c.classList.remove('dropover'); });
    if (invCell && +invCell.dataset.i !== d.i) invCell.classList.add('dropover');
    d.ghost.classList.toggle('toground', !!outside);
    d.ghost.title = outside ? '放開＝丟在地上' : '';
  },
  // 放在背包視窗外面、而且是遊戲畫面（不是別的視窗、按鈕）
  isOutside(el) {
    if (!el) return false;
    if (el.closest && (el.closest('#inv') || el.closest('#cmp') || el.closest('.panel') || el.closest('#menubar') || el.closest('#tip'))) return false;
    return el.id === 'game' || (el.closest && !!el.closest('#hud'));
  },
  end(ev) {
    const d = this.d; this.d = null; if (!d || !d.moved) return;
    this.justDropped = true; setTimeout(() => { this.justDropped = false; }, 50);
    d.ghost.remove(); document.body.classList.remove('dragging');
    document.querySelectorAll('.dragsrc, .dropok, .dropbad, .dropover').forEach(c => c.classList.remove('dragsrc', 'dropok', 'dropbad', 'dropover'));
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const hit = d.tg.find(t => el && t.el.contains(el));
    const P = G.P; if (P.inv[d.i] !== d.it) return;    // 拖的途中物品被動過了
    if (hit) {
      if (hit.kind === 'flask') { if (equipFlask(d.i, hit.key)) { Sfx.play('equip'); UI.msg(`放上藥劑欄 ${hit.key + 1}：${d.it.name}`, '#9fff9f'); } UI.refreshInv(); return; }
      if (d.err) { Sfx.play('deny'); return UI.msg(`無法裝備：${d.err}`, '#ff9a9a'); }
      const slot = UI.equipFromInv(d.i, hit.key);
      if (slot) UI.select(null);   // v2.7.6 不開比較面板
      return;
    }
    const invCell = el && el.closest && el.closest('#invgrid .icell');
    if (invCell) { // 背包裡換位置
      const j = +invCell.dataset.i; if (j === d.i) return;
      const a = P.inv[d.i], b = P.inv[j];
      if (isStack(a) && isStack(b) && a.stack === b.stack && a.key === b.key) { // 同一種的疊在一起
        const max = STACK_TYPES[a.stack].max(a.key), mv = Math.min(a.n, max - b.n); b.n += mv; a.n -= mv; if (a.n <= 0) P.inv[d.i] = null;
        UI.refreshInv(); return;
      }
      [P.inv[d.i], P.inv[j]] = [P.inv[j], P.inv[d.i]]; UI.select(null); return;
    }
    if (this.isOutside(el)) { if (isStack(d.it)) return UI.msg('通貨、材料、寶石不能丟在地上：回營地存進倉庫', '#d8c8a0'); return this.dropToGround(d.i); }
  },
  dropToGround(i) {
    const P = G.P, it = P.inv[i]; if (!it) return;
    const go = () => {
      if (P.inv[i] !== it) return;
      P.inv[i] = null;
      const pl = G.pl, a = Math.random() * Math.PI * 2;
      const l = { x: pl.x + Math.cos(a) * 18, y: pl.y + Math.sin(a) * 12 + 8, t: 0, item: it, label: it.name, color: isFlask(it) ? '#d8d8d8' : itemColor(it), dropped: true };
      G.loot.push(l);
      Sfx.play('pickup'); UI.msg(`丟下了 ${it.name}${G.world.kind === 'town' ? '（離開營地就會消失）' : '（離開這張地圖就會消失）'}`, '#d8c8a0');
      UI.select(null); UI.refreshInv(); saveGame();
    };
    if (it.rarity === 'unique' || it.rarity === 'rare') gameAsk(`要把「${it.name}」丟在地上嗎？\n離開${G.world.kind === 'town' ? '營地' : '這張地圖'}之後就撿不回來了。`, go);
    else go();
  },
};

// =============================================================
//  v2.7 從裝備格拖出來
//  ・拖到背包的空格 → 卸下放在那一格；拖到背包裡可以穿在這格的裝備上 → 兩件互換
//  ・拖到背包視窗外面（遊戲畫面）→ 卸下並丟在腳邊（稀有、傳奇會先問一次）
// =============================================================
Object.assign(DragItem, {
  initEquip() {
    const doll = document.getElementById('doll'); if (!doll) return;
    doll.addEventListener('dragstart', e => e.preventDefault());
    doll.addEventListener('pointerdown', e => { const el = e.target.closest && e.target.closest('.eslot'); if (el) this.startEq(e, el.dataset.slot); });
    doll.addEventListener('click', e => { if (this.justDropped) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  },
  fitsSlot(it, slot) { if (!it || isStack(it) || isFlask(it)) return false; const b = BASE_BY_ID[it.base]; return !!b && (b.slot === slot || (b.slot === 'ring' && /^ring/.test(slot))); },
  startEq(e, slot) {
    if (e.button !== 0 || !G.P || UI.curSel) return;
    const it = G.P.equip[slot]; if (!it) return;
    this.e = { slot, it, sx: e.clientX, sy: e.clientY, moved: false, ghost: null };
    const move = ev => this.moveEq(ev), up = ev => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); this.endEq(ev); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  },
  moveEq(ev) {
    const d = this.e; if (!d) return;
    if (!d.moved) {
      if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 7) return;
      d.moved = true; UI.hideTip();
      const g = document.createElement('img'); g.className = 'dragghost'; g.src = itemIconOfURL(d.it, 64);
      document.body.appendChild(g); d.ghost = g;
      document.querySelector(`#doll .eslot[data-slot="${d.slot}"]`).classList.add('dragsrc');
      document.querySelectorAll('#invgrid .icell').forEach(c => { const x = G.P.inv[+c.dataset.i]; if (!x) c.classList.add('dropok'); else if (this.fitsSlot(x, d.slot)) c.classList.add(canEquip(x) ? 'dropbad' : 'dropok'); });
      document.body.classList.add('dragging');
    }
    d.ghost.style.left = ev.clientX + 'px'; d.ghost.style.top = ev.clientY + 'px';
    const el = document.elementFromPoint(ev.clientX, ev.clientY), cell = el && el.closest && el.closest('#invgrid .icell');
    document.querySelectorAll('#invgrid .icell.dropover').forEach(c => { if (c !== cell) c.classList.remove('dropover'); });
    if (cell && (cell.classList.contains('dropok') || cell.classList.contains('dropbad'))) cell.classList.add('dropover');
    const out = this.isOutside(el); d.ghost.classList.toggle('toground', !!out); d.ghost.title = out ? '放開＝卸下並丟在地上' : '';
  },
  endEq(ev) {
    const d = this.e; this.e = null; if (!d || !d.moved) return;
    this.justDropped = true; setTimeout(() => { this.justDropped = false; }, 50);
    d.ghost.remove(); document.body.classList.remove('dragging');
    document.querySelectorAll('.dragsrc, .dropok, .dropbad, .dropover').forEach(c => c.classList.remove('dragsrc', 'dropok', 'dropbad', 'dropover'));
    const P = G.P; if (P.equip[d.slot] !== d.it) return;
    const el = document.elementFromPoint(ev.clientX, ev.clientY), cell = el && el.closest && el.closest('#invgrid .icell');
    if (cell) {
      const j = +cell.dataset.i, x = P.inv[j];
      if (!x) { // 放進那一格
        P.inv[j] = d.it; P.equip[d.slot] = null;
        if (d.slot === 'weapon' && P.equip.offhand && BASE_BY_ID[P.equip.offhand.base].cls === 'quiver') { const k = P.inv.indexOf(null); if (k >= 0) { P.inv[k] = P.equip.offhand; P.equip.offhand = null; } }
        Sfx.play('equip'); UI.hideTip(); UI.select(null); onBuildChanged(); UI.refreshInv(); return saveGame();
      }
      if (this.fitsSlot(x, d.slot)) { const err = canEquip(x); if (err) { Sfx.play('deny'); return UI.msg(`無法裝備：${err}`, '#ff9a9a'); } const s = UI.equipFromInv(j, d.slot); if (s) UI.select(null); return; }
      return UI.msg('那一格有別的東西：拖到空格，或拖到可以穿在這個部位的裝備上互換', '#d8c8a0');
    }
    if (this.isOutside(el)) {
      const go = () => {
        if (P.equip[d.slot] !== d.it) return;
        P.equip[d.slot] = null;
        const pl = G.pl, a = Math.random() * Math.PI * 2;
        G.loot.push({ x: pl.x + Math.cos(a) * 18, y: pl.y + Math.sin(a) * 12 + 8, t: 0, item: d.it, label: d.it.name, color: isFlask(d.it) ? '#d8d8d8' : itemColor(d.it), dropped: true });
        Sfx.play('pickup'); UI.msg(`卸下並丟下了 ${d.it.name}${G.world.kind === 'town' ? '（離開營地就會消失）' : '（離開這張地圖就會消失）'}`, '#d8c8a0');
        UI.hideTip(); UI.select(null); onBuildChanged(); UI.refreshInv(); saveGame();
      };
      if (d.it.rarity === 'unique' || d.it.rarity === 'rare') gameAsk(`要把身上的「${d.it.name}」丟在地上嗎？\n離開${G.world.kind === 'town' ? '營地' : '這張地圖'}之後就撿不回來了。`, go); else go();
    }
  },
});
const _dragInitBase = DragItem.init.bind(DragItem);
DragItem.init = function () { _dragInitBase(); this.initEquip(); };
