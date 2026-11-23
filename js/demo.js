// =============================================================
//  Demo 版專用（只有 tools\build_demo.ps1 打包 Demo 時會放進來；完整版不載入這支）
//  Demo 的範圍：主線五章（第 1～10 夜）玩到結局。終局（深層夢境、終局盤、無盡之塔、懸賞、夢潮、夢的儀式、
//  深層傳奇、夢魘首領、最初的守門人）不在 Demo 裡——那些檔案打包時就拿掉了，不是藏起來
//  玩家看到：
//   ・開始畫面版本號旁邊多「Demo」；網頁標題「夢疑 MOE Demo」
//   ・任務只有主線五章（終局兩章拿掉）；最多到第 10 夜
//   ・看完結局、關掉劇情之後，跳一張「Demo 到這裡結束，感謝遊玩」的卡片（每個角色只跳一次），之後可以繼續在第 1～10 夜刷寶
// =============================================================
const IS_DEMO = true;
// 被拿掉的終局檔案原本提供的東西，換成「沒有」（game.js、ui.js 會呼叫）
const DEPTH_MAX = ENDING_TIER;
function depthScale() { return 1; }
function depthRules() { return []; }
function depthRulesReroll() { }
function atlasVal() { return 0; }
// 任務：只留主線五章
while (QUESTS.length && /^終局/.test(QUESTS[QUESTS.length - 1].title)) QUESTS.pop();
const DemoEnd = {
  show() {
    if (document.getElementById('demoEnd')) return;
    const d = document.createElement('div'); d.id = 'demoEnd';
    d.innerHTML = `<div class="de-card"><div class="de-t">感謝遊玩《夢疑 MOE》Demo</div>
      <div class="de-p">主線故事到這裡告一段落。<br>你可以繼續在第 1～10 夜刷寶、收集傳奇、湊套裝。</div>
      <div class="de-p de-dim">完整版還有更深的夢在等你，敬請期待。</div>
      <button class="de-b">繼續刷寶</button></div>`;
    document.body.appendChild(d);
    d.querySelector('.de-b').onclick = () => d.remove();
  },
};
Hook.on('update', () => {
  const P = G.P; if (!P) return;
  if (P.maxTier > ENDING_TIER) P.maxTier = ENDING_TIER;
  if (P.story && P.story.seen && P.story.seen.ending && !P.demoEndShown && !UI.storyOpen && !(UI.storyQ && UI.storyQ.length)) { P.demoEndShown = true; DemoEnd.show(); saveGame(); }
});
(() => {
  document.title = '夢疑 MOE Demo';
  const tag = () => { const v = document.querySelector('#title .ts-ver'); if (v && !/Demo/.test(v.textContent)) v.textContent = v.textContent.replace(/-demo$/i, '') + '　Demo'; };
  new MutationObserver(tag).observe(document.body, { childList: true, subtree: true }); tag();
  const st = document.createElement('style');
  st.textContent = `#demoEnd { position:fixed; inset:0; z-index:200; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.72); }
  #demoEnd .de-card { width:min(460px, 90vw); padding:26px 28px; background:#17110b; border:2px solid #c8a050; border-radius:10px; text-align:center; color:#f0e4c8; box-shadow:0 10px 40px rgba(0,0,0,.8); }
  #demoEnd .de-t { font-size:22px; font-weight:bold; color:#ffe08a; margin-bottom:14px; } #demoEnd .de-p { line-height:1.8; margin-bottom:10px; } #demoEnd .de-dim { color:#a89878; font-size:14px; }
  #demoEnd .de-b { margin-top:8px; padding:8px 26px; font-size:16px; cursor:pointer; }`;
  document.head.appendChild(st);
})();
