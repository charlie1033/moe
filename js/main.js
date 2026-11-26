// =============================================================
//  主程式：鍵盤滑鼠輸入、遊戲迴圈
// =============================================================
(function () {
  const canvas = document.getElementById('game');
  initRender(canvas);
  UI.init();
  DragItem.init();   // v2.5.3 背包拖曳：拖到裝備格穿上、拖到視窗外丟在地上
  applyCfg();   // v2.4 套用玩家的設定
  if (typeof ArtStyle !== 'undefined') ArtStyle.init(); // v2.4 AI 美術（載入圖示圖集、標題背景）
  Touch.init(); // 手機／平板才會啟動

  const toLogical = e => {
    const r = canvas.getBoundingClientRect();
    input.mx = (e.clientX - r.left) / r.width * VW;
    input.my = (e.clientY - r.top) / r.height * VH;
  };
  window.addEventListener('mousemove', e => {
    toLogical(e);
    if (G.state !== 'play' || UI.treeOpen) return;
    if (e.target !== canvas) return;
    // 滑過地上物品標籤時顯示說明
    const l = G.loot.find(l => l.rect && l.item && input.mx >= l.rect.x && input.mx <= l.rect.x + l.rect.w && input.my >= l.rect.y && input.my <= l.rect.y + l.rect.h);
    if (l) UI.showTipCorner(itemTipHTML(l.item, { hint: byCtl('左鍵：撿起', '點一下：撿起') }));   // v2.5.2 改到右下角
    else if (!UI.open.inv || e.target === canvas) UI.hideTip();
  });
  canvas.addEventListener('mousedown', e => {
    toLogical(e);
    if (G.state !== 'play') return;
    if (UI.curSel) { UI.curSel = null; UI.refreshInv(); }
    const btn = CFG.swapMouse && (e.button === 0 || e.button === 2) ? 2 - e.button : e.button;   // v2.4 滑鼠左右鍵互換
    if (btn === 0) {
      // v2.7.10 撿東西只用 F（點地上的名稱不再撿，避免攻擊時點到物品變成沒出手）
      input.l = true;
    }
    if (btn === 2) input.r = true;
  });
  window.addEventListener('mouseup', e => { const btn = CFG.swapMouse && (e.button === 0 || e.button === 2) ? 2 - e.button : e.button; if (btn === 0) input.l = false; if (btn === 2) input.r = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('blur', () => { input.keys = {}; input.l = input.r = false; });

  // ---------- 鍵盤：中文輸入法開著也能用 ----------
  // 注音輸入法會把字母鍵變成注音符號，這裡把它們對回原本的按鍵
  const BPMF = { 'ㄅ': 'Digit1', 'ㄉ': 'Digit2', 'ˇ': 'Digit3', 'ˋ': 'Digit4', 'ㄓ': 'Digit5', 'ˊ': 'Digit6', '˙': 'Digit7', 'ㄚ': 'Digit8', 'ㄞ': 'Digit9', 'ㄢ': 'Digit0',
    'ㄆ': 'KeyQ', 'ㄊ': 'KeyW', 'ㄍ': 'KeyE', 'ㄐ': 'KeyR', 'ㄔ': 'KeyT', 'ㄗ': 'KeyY', 'ㄧ': 'KeyU', 'ㄛ': 'KeyI', 'ㄟ': 'KeyO', 'ㄣ': 'KeyP',
    'ㄇ': 'KeyA', 'ㄋ': 'KeyS', 'ㄎ': 'KeyD', 'ㄑ': 'KeyF', 'ㄕ': 'KeyG', 'ㄘ': 'KeyH', 'ㄨ': 'KeyJ', 'ㄜ': 'KeyK', 'ㄠ': 'KeyL',
    'ㄈ': 'KeyZ', 'ㄌ': 'KeyX', 'ㄏ': 'KeyC', 'ㄒ': 'KeyV', 'ㄖ': 'KeyB', 'ㄙ': 'KeyN', 'ㄩ': 'KeyM' };
  const KEYCODE = { 32: 'Space', 27: 'Escape', 13: 'Enter', 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown' };
  function keyOf(e) {
    if (e.code && e.code !== 'Unidentified' && e.code !== 'Process') return e.code; // 實體按鍵位置（不管輸入法）
    let k = e.key || '';
    if (BPMF[k]) return BPMF[k];
    k = k.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)); // 全形轉半形
    if (/^[a-z]$/i.test(k)) return 'Key' + k.toUpperCase();
    if (/^[0-9]$/.test(k)) return 'Digit' + k;
    const kc = e.keyCode;
    if (kc >= 65 && kc <= 90) return 'Key' + String.fromCharCode(kc);
    if (kc >= 48 && kc <= 57) return 'Digit' + (kc - 48);
    return KEYCODE[kc] || k;
  }
  // v1.4：進到遊戲畫面就把焦點放在看不到的密碼欄位 → Windows 會自動停用中文輸入法（注音、大易、倉頡都一樣），
  // 離開遊戲視窗或點到輸入框時，輸入法會自動回到原本的狀態。手機不做（會跳出鍵盤）。
  const sink = document.getElementById('keysink');
  sink.addEventListener('input', () => { sink.value = ''; });
  const focusSink = () => {
    if (IS_TOUCH || G.state !== 'play' || !document.hasFocus()) return;
    const a = document.activeElement;
    if (a === sink || (a && (a.tagName === 'SELECT' || a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type !== 'checkbox')))) return;
    sink.focus({ preventScroll: true });
  };
  window.focusSink = focusSink;
  document.addEventListener('pointerup', () => setTimeout(focusSink, 0));
  document.addEventListener('change', () => setTimeout(() => { const a = document.activeElement; if (a && a.tagName === 'SELECT') a.blur(); focusSink(); }, 0));
  window.addEventListener('focus', () => setTimeout(focusSink, 0));
  setInterval(focusSink, 500);
  let imeWarned = false;
  window.addEventListener('keydown', e => {
    if (Pause.onKey(e)) return;   // v2.4 暫停選單開著：按鍵交給選單（設定按鍵時也是在這裡攔）
    if (e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target !== sink) return; // 正在打字（例如角色名字）
    if (e.target.tagName === 'SELECT') { if (/^(Arrow|Enter|Tab)/.test(e.key)) return; e.target.blur(); focusSink(); } // 選單剛選完：把焦點還給遊戲
    if (G.state !== 'play') return;
    const raw = keyOf(e), code = raw === 'Escape' ? raw : remapKey(raw);   // v2.4 依玩家設定的按鍵翻譯
    if (!code) return;
    if (e.key === 'Process' && !imeWarned && G.P) { imeWarned = true; UI.msg('偵測到中文輸入法：遊戲會自動辨識按鍵，如果還是沒反應，按 Shift 切成英文', '#d8c8a0'); }
    if (['Space', 'Tab'].includes(code)) e.preventDefault();
    // 劇情與對話畫面：空白鍵／Enter／F 翻頁
    if (UI.storyOpen) { if (!e.repeat && ['Space', 'Enter', 'NumpadEnter', 'KeyF'].includes(code)) UI.storyNext(); return; }
    if (!e.repeat) {
      switch (code) {
        case 'KeyI': UI.toggle('inv'); break;
        case 'KeyC': UI.toggle('char'); break;
        case 'KeyK': UI.toggle('skills'); break;
        case 'KeyP': UI.toggle('tree'); break;
        case 'KeyH': UI.toggle('help'); break;
        case 'KeyJ': UI.toggle('journal'); break;
        case 'KeyB': UI.toggle('craft'); break;
        // v2.4：有開著的視窗就先關掉；什麼都沒開才打開暫停選單
        case 'Escape': if (Object.values(UI.open).some(v => v)) UI.closeAll(); else Pause.show(); break;
        case "KeyM": CFG.sound = Sfx.toggle(); saveCfg(); UI.msg(CFG.sound ? `聲音：開（按 ${keyLabel('mute')} 關閉）` : `聲音：關（按 ${keyLabel('mute')} 打開）`, "#d8c8a0"); break;   // v2.3
        case 'Space': playerDodge(); break;   // v2.7.4 空白鍵＝閃避翻滾（撿東西改成 F）
        case 'Digit1': useFlask(0); break;
        case 'Digit2': useFlask(1); break;
        case 'Digit3': useFlask(2); break;
        case 'Digit4': useFlask(3); break;
        case 'KeyT': usePortalScroll(); break;
        case 'KeyF': UI.interact(); break; // 對話、進入傳送門、打開夢之門都是 F
        case 'KeyZ': G.showNormal = CFG.showNormal = !G.showNormal; saveCfg(); UI.msg(G.showNormal ? '顯示普通物品標籤' : '隱藏普通物品標籤'); break;
      }
    }
    input.keys[code] = true;
    // v1.9.1：被輸入法攔下的按鍵（大易等），「放開」的訊號可能會被吃掉 → 記下時間，太久沒再收到就當作放開
    if (e.key === 'Process' || e.isComposing || e.keyCode === 229) input.imeKeys[code] = performance.now(); else delete input.imeKeys[code];
  });
  window.addEventListener('keyup', e => { const raw = keyOf(e), c = remapKey(raw) || raw; if (c !== raw) { input.keys[raw] = false; delete input.imeKeys[raw]; } input.keys[c] = false; delete input.imeKeys[c]; if (e.code) { input.keys[e.code] = false; delete input.imeKeys[e.code]; } });
  // 按著不放時，系統每 0.03 秒會重送一次按下（第一次重送要等 0.5 秒），所以 0.7 秒沒收到就一定是放開了
  setInterval(() => { const now = performance.now(); for (const c in input.imeKeys) if (now - input.imeKeys[c] > 700) { input.keys[c] = false; delete input.imeKeys[c]; } }, 100);
  // 跳出確認視窗、切到別的分頁時，放開按鍵的訊號一定收不到 → 全部歸零
  const clearInput = () => { input.keys = {}; input.imeKeys = {}; input.l = input.r = false; };
  document.addEventListener('visibilitychange', clearInput);
  for (const fn of ['confirm', 'alert']) { const orig = window[fn].bind(window); window[fn] = (...a) => { clearInput(); const r = orig(...a); clearInput(); return r; }; }
  // 點畫面時把焦點從輸入框／選單拿回來，避免按鍵被吃掉
  canvas.addEventListener('pointerdown', () => { const a = document.activeElement; if (a && a !== document.body && a !== sink && a.blur) a.blur(); focusSink(); });

  // 每 0.4 秒更新一次：任務進度、按鈕紅點
  setInterval(() => { if (G.state === 'play' && G.P) { Quest.tick(); UI.updateBadges(); } }, 400);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // 頓格：重擊或暴擊時畫面停一瞬間，增加打擊感
    if (!CFG.hitstop) G.hitstop = 0;   // v2.4 設定可以關掉頓格
    G.fpsN = (G.fpsN || 0) + 1; if (now - (G.fpsT || 0) > 500) { G.fps = Math.round(G.fpsN * 1000 / (now - (G.fpsT || now - 500))); G.fpsN = 0; G.fpsT = now; }
    if (G.hsAt != null && G.time >= G.hsAt) { if (CFG.hitstop) G.hitstop = Math.max(G.hitstop || 0, G.hsAmt || 0); G.hsAt = null; G.hsAmt = 0; }   // 等刀揮到才頓
    if (G.hitstop > 0) { G.hitstop -= dt; if (G.state === 'play' && G.P) update(dt * 0.12); }   // v2.20.19 頓格不全停，放很慢 → 不會看起來像當掉
    else if (G.state === 'play' && G.P) { Touch.tick(); update(dt); }
    render();
    if (UI.treeOpen) TreeView.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.getElementById('menu').classList.add('show');
})();
