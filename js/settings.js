// =============================================================
//  v2.4 暫停選單（Esc）與設定
//  ・設定存在這台電腦的瀏覽器（yiwang_settings），每個角色共用
//  ・按鍵重新設定：遊戲裡其他程式還是用「預設按鍵」判斷，這裡負責把玩家按的鍵翻譯過去
// =============================================================
const CFG_KEY = 'yiwang_settings';
const CFG_DEFAULT = {
  // 顯示
  shake: 100,          // 畫面震動強度 %
  hitstop: true,       // 打中時的頓格
  dmgNum: 'all',       // 傷害數字：all 全部／crit 只顯示暴擊／off 不顯示
  lowLife: true,       // 低血時畫面邊緣變紅
  particles: 'high',   // 粒子特效：high／low
  showNormal: true,    // 地上的白色（普通）物品名稱
  fps: false,          // 顯示每秒畫面數
  // 音效
  sound: true, vol: 50, volCombat: 100, volLoot: 100, volUi: 100,
  // 介面
  uiScale: 100,        // 面板大小 %
  quest: true,         // 左邊的任務提示
  minimap: 'normal',   // 小地圖：off／small／normal／large
  targetBar: true,     // 上方的怪物資訊列
  msgLog: true,        // 左下角的訊息
  autoPick: true,      // 珠寶、通貨走過去自動撿
  // 操作
  swapMouse: false,    // 滑鼠左右鍵互換
  keys: {},            // 重新設定過的按鍵：{ 動作: 實體按鍵 }
};
const CFG = Object.assign({}, CFG_DEFAULT, (() => { try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; } })());
CFG.keys = Object.assign({}, CFG.keys || {});
function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(CFG)); } catch (e) {} }

// —— 可以重新設定的按鍵（def＝遊戲內部用的預設按鍵）——
const KEY_ACTIONS = [
  { id: 'up', name: '往上走', def: 'KeyW', grp: '移動' }, { id: 'down', name: '往下走', def: 'KeyS', grp: '移動' },
  { id: 'left', name: '往左走', def: 'KeyA', grp: '移動' }, { id: 'right', name: '往右走', def: 'KeyD', grp: '移動' },
  { id: 'sk3', name: '技能（頭盔）', def: 'KeyQ', grp: '技能' }, { id: 'sk4', name: '技能（手套）', def: 'KeyE', grp: '技能' }, { id: 'sk5', name: '技能（鞋子）', def: 'KeyR', grp: '技能' },
  { id: 'f1', name: '藥劑 1', def: 'Digit1', grp: '藥劑' }, { id: 'f2', name: '藥劑 2', def: 'Digit2', grp: '藥劑' }, { id: 'f3', name: '藥劑 3', def: 'Digit3', grp: '藥劑' }, { id: 'f4', name: '藥劑 4', def: 'Digit4', grp: '藥劑' },
  { id: 'interact', name: '互動（對話／撿東西／進門）', def: 'KeyF', grp: '動作' }, { id: 'dodge', name: '閃避翻滾', def: 'Space', grp: '動作' }, { id: 'portal', name: '傳送卷軸回城', def: 'KeyT', grp: '動作' },
  { id: 'inv', name: '背包', def: 'KeyI', grp: '介面' }, { id: 'char', name: '角色', def: 'KeyC', grp: '介面' }, { id: 'skills', name: '技能寶石', def: 'KeyK', grp: '介面' },
  { id: 'tree', name: '天賦樹', def: 'KeyP', grp: '介面' }, { id: 'craft', name: '強化工坊', def: 'KeyB', grp: '介面' },
  { id: 'journal', name: '日誌', def: 'KeyJ', grp: '介面' }, { id: 'help', name: '說明', def: 'KeyH', grp: '介面' },
  { id: 'labels', name: '顯示／隱藏白裝名稱', def: 'KeyZ', grp: '介面' }, { id: 'mute', name: '開關聲音', def: 'KeyM', grp: '介面' },
];
const keyOfAction = id => { const a = KEY_ACTIONS.find(x => x.id === id); return CFG.keys[id] || (a && a.def); };
// 實體按鍵 → 遊戲內部的預設按鍵（沒有改過的鍵照原樣；被別的動作借走的預設鍵就不再有作用）
function remapKey(code) {
  for (const a of KEY_ACTIONS) if ((CFG.keys[a.id] || a.def) === code) return a.def;
  if (KEY_ACTIONS.some(a => a.def === code)) return null;   // 這個預設鍵已經被改掉了
  return code;
}
function keyName(code) {
  if (!code) return '—';
  const m = { Space: '空白', Escape: 'Esc', Enter: 'Enter', Tab: 'Tab', ShiftLeft: '左 Shift', ShiftRight: '右 Shift', ControlLeft: '左 Ctrl', ControlRight: '右 Ctrl', AltLeft: '左 Alt', AltRight: '右 Alt',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', CapsLock: 'Caps' };
  if (m[code]) return m[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return '數字鍵 ' + code.slice(6);
  return code;
}
const keyLabel = id => keyName(keyOfAction(id));
// v2.17 操作說法：電腦版「按 P」，手機（觸控）版「點右上角 ☰ → 天賦」。同一份文字：
//   ctl('tree') 直接回傳一段說法；文字裡寫 {tree}、{lmb} 這種代號，ctlText(文字) 會換成對的說法（plain＝拿掉 <b>，給左下訊息用）
//   沒列在表裡的代號＝「按 <b>那個鍵</b>」（照玩家改過的按鍵）
const CTL_MENU = n => `點右上角 ☰ → <b>${n}</b>`;
const CTL_TOUCH = {
  tree: CTL_MENU('天賦'), inv: CTL_MENU('背包'), skills: CTL_MENU('技能'), char: CTL_MENU('角色'), craft: CTL_MENU('強化'), journal: CTL_MENU('日誌'), help: CTL_MENU('說明'), portal: CTL_MENU('回城'),
  interact: '點右邊跳出來的<b>互動鈕</b>', dodge: '點<b>「閃」</b>鈕', f1: '點左下角<b>第 1 格藥劑</b>',
  move: '在<b>左半邊畫面</b>按住拖曳就能', lmb: '按<b>右下的大圓鈕</b>', rmb: '<b>大圓鈕旁邊的小圓鈕</b>', aimNote: '（會自動瞄準畫面裡的怪，首領、精英優先；點一下怪可以鎖定）',
  pickup: '<b>點地上的名稱</b>撿起來', equip: '點一下裝備，再按<b>「裝備」</b>鈕穿上',
  dodgeKey: '閃避鈕', lmbSkill: '大圓鈕的技能', rmbSkill: '大圓鈕旁邊小圓鈕的技能', talk: '點右邊的<b>「對話」</b>鈕',
};
const CTL_PC = {
  move: () => `用 <b>${keyLabel('up')} ${keyLabel('left')} ${keyLabel('down')} ${keyLabel('right')}</b> `, lmb: '按<b>滑鼠左鍵</b>', rmb: '<b>右鍵</b>', aimNote: '（朝滑鼠的方向）',
  pickup: () => `按 <b>${keyLabel('interact')}</b> 撿（會撿有金色外框的那個）`, equip: '在裝備上按<b>右鍵</b>穿上（也可以拖到上面的裝備格）',
  dodgeKey: () => keyLabel('dodge') === '空白' ? '空白鍵' : `${keyLabel('dodge')} 鍵`, lmbSkill: '左鍵技能', rmbSkill: '右鍵技能', talk: () => `按 <b>${keyLabel('interact')}</b>`,
};
function ctl(id) {
  const t = typeof IS_TOUCH !== 'undefined' && IS_TOUCH ? CTL_TOUCH[id] : null; if (t) return t;
  const p = CTL_PC[id]; if (p) return typeof p === 'function' ? p() : p;
  return `按 <b>${keyLabel(id)}</b>`;
}
// v2.18.2 進階資訊（詞綴階級 T4、夢之門的掉落基底）：設定頁「顯示進階資訊」；沒設定過＝角色最高打到第 3 夜才顯示（CFG.advInfo）
const advInfo = () => CFG.advInfo != null ? !!CFG.advInfo : !!(typeof G !== 'undefined' && G.P && G.P.maxTier >= 3);
// v2.18.2 觸控模式的其他說法：byCtl(電腦版文字, 手機版文字) 挑一個；ctlTag() 是人物頭上的「[F] 」（手機版是空字串，靠右邊的互動鈕）
const isTouchCtl = () => typeof IS_TOUCH !== 'undefined' && IS_TOUCH;
const byCtl = (pc, touch) => isTouchCtl() ? touch : pc;
const skillKeyNames = () => isTouchCtl() ? ['主', '2', '3', '4', '5'] : ['左鍵', '右鍵', keyLabel('sk3'), keyLabel('sk4'), keyLabel('sk5')];   // 技能欄 5 格的叫法（手機：主＝右下的大圓鈕）
const ctlTag = (id = 'interact') =>isTouchCtl() ? '' : `[${keyLabel(id)}] `;
const ctlText = (s, plain) =>{ const r = String(s == null ? '' : s).replace(/\{(\w+)\}/g, (m, id) => ctl(id)); return plain ? r.replace(/<[^>]+>/g, '') : r; };

// —— 套用設定 ——
function applyCfg() {
  if (typeof G !== 'undefined') G.showNormal = CFG.showNormal;
  if (typeof Sfx !== 'undefined') { Sfx.on = CFG.sound; Sfx.vol = CFG.vol / 100; if (Sfx.master) Sfx.master.gain.value = Sfx.on ? Sfx.vol : 0; Sfx.cat = { combat: CFG.volCombat / 100, loot: CFG.volLoot / 100, ui: CFG.volUi / 100 }; }
  document.documentElement.style.setProperty('--uiScale', CFG.uiScale / 100);
  const qb = document.getElementById('questbox'); if (qb) qb.style.display = CFG.quest ? '' : 'none';
  if (typeof UI !== 'undefined' && UI.buildMenuBar && document.getElementById('menubar') && G && G.P) UI.buildMenuBar();
}

// —— 暫停選單 ——
const Pause = {
  open: false, tab: 'display', waitKey: null,
  el() {
    let p = document.getElementById('pause');
    if (!p) { p = document.createElement('div'); p.id = 'pause'; document.body.appendChild(p); }
    return p;
  },
  show() {
    if (typeof G === 'undefined' || G.state !== 'play' || !G.P) return;
    this.open = true; this.view = 'main'; input.keys = {}; input.l = input.r = false;
    Sfx.play('click'); this.render();
  },
  hide() { this.open = false; this.waitKey = null; this.el().classList.remove('show'); setTimeout(() => window.focusSink && window.focusSink(), 30); },
  render() {
    const p = this.el(); p.classList.add('show');
    if (this.view === 'main') {
      const P = G.P;
      p.innerHTML = `<div class="pcard pmain"><div class="ptitle">暫停</div>
        <div class="psub">${P.name}　${CLASSES[P.cls].name}　等級 ${P.lvl}　·　${G.world.name}</div>
        <button data-p="resume" class="pbig">繼續遊戲</button>
        <button data-p="settings" class="pbig">設定</button>
        <button data-p="help" class="pbig">操作說明</button>
        <button data-p="save" class="pbig">存檔</button>
        <button data-p="quit" class="pbig">存檔並回到選角畫面</button>
        <div class="phint">${byCtl('按 Esc 繼續遊戲', '點「繼續遊戲」回到夢裡')}${G.lastSave ? `　·　上次存檔 ${new Date(G.lastSave).toLocaleTimeString()}` : ''}</div></div>`;
    } else p.innerHTML = this.settingsHTML();
    this.bind();
  },
  settingsHTML() {
    const tabs = [['display', '顯示'], ['sound', '音效'], ['ui', '介面'], ['loot', '掉落篩選'], ['keys', '操作按鍵']];
    const sel = (k, opts) => `<select data-c="${k}">${opts.map(([v, t]) => `<option value="${v}" ${String(CFG[k]) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    const chk = k => `<label class="pswitch"><input type="checkbox" data-c="${k}" ${CFG[k] ? 'checked' : ''}><span></span></label>`;
    const rng = (k, min, max, step = 5) => `<span class="prange"><input type="range" data-c="${k}" min="${min}" max="${max}" step="${step}" value="${CFG[k]}"><b>${CFG[k]}%</b></span>`;
    const row = (name, ctl, hint = '') => `<div class="prow"><div class="pname">${name}${hint ? `<small>${hint}</small>` : ''}</div><div class="pctl">${ctl}</div></div>`;
    let body = '';
    if (this.tab === 'display') {
      body += row('畫面震動', rng('shake', 0, 150), '重擊、暴擊、爆炸時畫面晃動的強度');
      body += row('打擊頓格', chk('hitstop'), '打中的瞬間畫面停一下');
      body += row('傷害數字', sel('dmgNum', [['all', '全部顯示'], ['crit', '只顯示暴擊'], ['off', '不顯示']]));
      body += row('低血警示', chk('lowLife'), '生命低於 35% 時畫面邊緣變紅');
      body += row('粒子特效', sel('particles', [['high', '完整'], ['low', '精簡（電腦比較慢時用）']]));
      body += row('地上的白裝名稱', chk('showNormal'), '也可以按 ' + keyLabel('labels') + ' 切換');
      body += row('顯示畫面更新率', chk('fps'), '右上角顯示每秒幾格畫面');
      if (typeof ArtStyle !== 'undefined' && ArtStyle.has && ArtStyle.has()) body += row('AI 美術', `<label class="pswitch"><input type="checkbox" data-art ${ArtStyle.on ? 'checked' : ''}><span></span></label>`, '標題畫面、立繪、圖示用新版（AI 生成）的圖');
      body += row('全螢幕', `<button data-p="fullscreen">${document.fullscreenElement ? '離開全螢幕' : '切換成全螢幕'}</button>`);
    } else if (this.tab === 'sound') {
      body += row('聲音', chk('sound'), '也可以按 ' + keyLabel('mute') + ' 切換');
      body += row('總音量', rng('vol', 0, 100));
      body += row('戰鬥音效', rng('volCombat', 0, 100), '打擊、技能、被打、首領');
      body += row('掉寶音效', rng('volLoot', 0, 100), '撿東西、黃裝與傳奇掉落、升級');
      body += row('介面音效', rng('volUi', 0, 100), '按鈕、裝備、喝藥');
      body += row('試聽', `<button data-p="test">播放一段</button>`);
    } else if (this.tab === 'ui') {
      body += row('面板大小', rng('uiScale', 80, 130), '背包、角色、技能等視窗的大小');
      body += row('任務提示', chk('quest'), '畫面左邊的任務框');
      body += row('小地圖', sel('minimap', [['normal', '一般'], ['large', '大'], ['small', '小'], ['off', '不顯示']]));
      body += row('怪物資訊列', chk('targetBar'), '畫面上方顯示正在打的怪物');
      body += row('訊息', chk('msgLog'), '左下角的撿到東西、任務等訊息');
      body += row('自動撿取', chk('autoPick'), '珠寶、通貨走過去就撿');
      body += row('顯示進階資訊', `<label class="pswitch"><input type="checkbox" data-c="advInfo" ${advInfo() ? 'checked' : ''}><span></span></label>`, '裝備詞綴的階級（T1～T8）、夢之門的「掉落基底」。還沒打到第 3 夜時預設關掉，之後自動打開');
    } else if (this.tab === 'loot') {
      body += row('白裝（普通）', chk('showNormal'), '也可以按 ' + keyLabel('labels') + ' 切換');
      body += row('藍裝（魔法）', chk('lootMagic'));
      body += row('藥劑', chk('lootFlask'));
      body += row('白裝、藍裝的最低基底', sel('lootMinTier', BASE_TIER_NAME.map((n, i) => [i, i ? n + '以上才顯示' : '全部顯示'])), '只影響武器、副手、防具');
      body += row('黃裝只顯示有夢痕的', chk('lootScarOnly'), '傳奇、通貨、寶石、珠寶永遠會顯示');
      body += `<div class="phint">藏起來的東西還在地上，只是不顯示名稱和圖示；改回來就看得到。</div>`;
    } else {
      body += row('滑鼠左右鍵互換', chk('swapMouse'), '左鍵放「右鍵技能」、右鍵放「左鍵技能」');
      let grp = '';
      for (const a of KEY_ACTIONS) {
        if (a.grp !== grp) { grp = a.grp; body += `<div class="pgrp">${grp}</div>`; }
        const code = keyOfAction(a.id), dup = KEY_ACTIONS.some(b => b !== a && keyOfAction(b.id) === code);
        body += row(a.name, `<button class="pkey ${this.waitKey === a.id ? 'wait' : ''} ${dup ? 'dup' : ''}" data-k="${a.id}">${this.waitKey === a.id ? '請按一個鍵…' : keyName(code)}</button>${CFG.keys[a.id] ? `<button class="pmini" data-kr="${a.id}" title="改回預設">↺</button>` : ''}`, dup ? '<span class="c-bad">跟別的按鍵重複了</span>' : '');
      }
      body += `<div class="phint">左鍵、右鍵技能固定在滑鼠；Esc 固定是暫停。按鍵改好立刻生效。</div>`;
    }
    if (typeof SettingsRows !== 'undefined') body += SettingsRows.html(this.tab);   // 其他模組登記的設定列（core.js）
    return `<div class="pcard pset"><div class="ptitle">設定</div>
      <div class="ptabs">${tabs.map(([k, t]) => `<button data-t="${k}" class="${this.tab === k ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="pbody">${body}</div>
      <div class="pfoot"><button data-p="reset">${this.tab === 'keys' ? '按鍵全部改回預設' : '這一頁改回預設'}</button><button data-p="back" class="pmainbtn">返回</button></div></div>`;
  },
  bind() {
    const p = this.el();
    p.querySelectorAll('[data-p]').forEach(b => b.onclick = () => this.act(b.dataset.p));
    p.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { this.tab = b.dataset.t; this.waitKey = null; this.render(); });
    p.querySelectorAll('[data-c]').forEach(el => {
      const k = el.dataset.c;
      const set = () => {
        CFG[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
        if (el.type === 'range') el.nextElementSibling.textContent = el.value + '%';
        saveCfg(); applyCfg();
        if (/^vol/.test(k)) { Sfx.init(); Sfx.play(k === 'volUi' ? 'equip' : k === 'volLoot' ? 'coin' : 'hit'); }
        if (k === 'sound' && CFG.sound) { Sfx.init(); Sfx.play('pickup'); }
      };
      el.oninput = set; el.onchange = set;
    });
    const art = p.querySelector('[data-art]'); if (art) art.onchange = () => ArtStyle.set(art.checked);
    p.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { this.waitKey = b.dataset.k; this.render(); });
    p.querySelectorAll('[data-kr]').forEach(b => b.onclick = () => { delete CFG.keys[b.dataset.kr]; saveCfg(); applyCfg(); this.render(); });
    if (typeof SettingsRows !== 'undefined') SettingsRows.bind(this.tab, p);
  },
  act(a) {
    if (a === 'resume') return this.hide();
    if (a === 'settings') { this.view = 'settings'; return this.render(); }
    if (a === 'back') { this.view = 'main'; this.waitKey = null; return this.render(); }
    if (a === 'help') { this.hide(); return UI.toggle('help', true); }
    if (a === 'save') { saveGame(); UI.msg('已存檔', '#9fff9f'); return this.render(); }
    if (a === 'quit') { saveGame(); this.hide(); UI.closeAll(); return backToTitle(); }
    if (a === 'fullscreen') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => UI.msg('這個瀏覽器不允許全螢幕', '#ff9a9a')); setTimeout(() => this.render(), 300); return; }
    if (a === 'test') { Sfx.init(); ['swing', 'hit', 'crit', 'kill', 'coin', 'rare'].forEach((n, i) => setTimeout(() => { Sfx.last[n] = 0; Sfx.play(n); }, i * 260)); return; }
    if (a === 'reset') {
      const groups = { display: ['shake', 'hitstop', 'dmgNum', 'lowLife', 'particles', 'showNormal', 'fps'], sound: ['sound', 'vol', 'volCombat', 'volLoot', 'volUi'], ui: ['uiScale', 'quest', 'minimap', 'targetBar', 'msgLog', 'autoPick'], loot: ['showNormal', 'lootMagic', 'lootFlask', 'lootMinTier', 'lootScarOnly'] };
      if (this.tab === 'keys') { CFG.keys = {}; CFG.swapMouse = false; } else for (const k of groups[this.tab]) CFG[k] = CFG_DEFAULT[k];
      saveCfg(); applyCfg(); return this.render();
    }
  },
  // 按鍵設定模式：攔下下一個按鍵
  onKey(e) {
    if (!this.open) return false;
    e.preventDefault(); e.stopPropagation();
    if (this.waitKey) {
      if (e.code !== 'Escape') { const a = KEY_ACTIONS.find(x => x.id === this.waitKey); if (e.code === a.def) delete CFG.keys[a.id]; else CFG.keys[a.id] = e.code; saveCfg(); applyCfg(); }
      this.waitKey = null; this.render(); return true;
    }
    if (e.code === 'Escape' && !e.repeat) { if (this.view !== 'main') { this.view = 'main'; this.render(); } else this.hide(); }
    return true;
  },
};
// 存檔並回到選角畫面
function backToTitle() {
  G.state = 'menu'; G.P = null; G.dead = false; input.keys = {}; input.l = input.r = false;
  document.body.classList.remove('playing');
  UI.buildMenu(); $('#menu').classList.add('show');
}

// ---------- v2.7 掉落篩選 ----------
Object.assign(CFG_DEFAULT, { lootMagic: true, lootFlask: true, lootMinTier: 0, lootScarOnly: false });
for (const k of ['lootMagic', 'lootFlask', 'lootMinTier', 'lootScarOnly']) if (CFG[k] === undefined) CFG[k] = CFG_DEFAULT[k];
// 回傳 true＝這個掉落物要藏起來（只藏白裝、藍裝、藥劑；黃裝、傳奇、通貨、寶石永遠顯示）
function lootHidden(l) {
  const it = l.item; if (!it) return false;
  if (isFlask(it)) return !CFG.lootFlask;
  if (it.rarity === 'rare' || it.rarity === 'unique') return CFG.lootScarOnly && it.rarity === 'rare' && !it.scar;
  if (it.rarity === 'magic' && !CFG.lootMagic) return true;
  const b = BASE_BY_ID[it.base];
  if (b && b.tier != null && ['weapon', 'offhand', 'helmet', 'body', 'gloves', 'boots'].includes(b.slot) && b.tier < +CFG.lootMinTier) return true;
  return false;
}
const lootFilterKey = () => [CFG.lootMagic, CFG.lootFlask, CFG.lootMinTier, CFG.lootScarOnly].join(',');
