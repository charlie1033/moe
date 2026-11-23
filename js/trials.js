// =============================================================
//  夢境試煉：主線每章一個「有規則的挑戰」，取代以前「擊殺 15 隻」「用通貨改造 3 次」這種純計數
//  ・玩家看到：那一章的試煉步驟還沒完成時，進地圖畫面上方會出現試煉的規則和進度；犯規就從 0 重來（沒有其他懲罰）
//  ・五個試煉（TRIALS，步驟寫在 quests.js 的 trial 欄位）：
//    第一章 只用一招 onlyone：只用同一個技能擊殺 15 隻（空白鍵的位移技能不算）
//    第二章 別停下來 nostop：擊殺 20 隻；身邊 360 內有怪時，站著不動超過 2 秒就重來
//    第三章 漲潮之前 tide：殺第一隻開始倒數 60 秒，時間內擊殺 25 隻
//    第四章 別喝藥 nodrink：擊殺 25 隻，途中喝了任何藥劑就重來
//    第五章 燈不能滅 lamp：諾娃的光圈（半徑 170）以每秒 120 的速度跟著你走；人在圈外累計超過 4 秒就重來，擊殺 20 隻
//  ・v2.20 進圖 2.5 秒後跳一次大橫幅「目標：……」（TRIALS 的 goal）；狀態列寫「目標：夢境試煉「名稱」 進度」
//  ・進度只在這次地圖裡有效（回營地、換一張圖就從 0 開始）；完成記在 G.P.trials[代號] = true（會存檔）
//  ・舊存檔：原本那一步已完成的照樣算完成（quests.js 用同一個步驟位置）
// =============================================================
const TRIALS = {
  onlyone: { name: '只用一招', need: 15, color: '#e8c0ff', goal: '只用同一個技能打倒 15 隻怪（翻滾不算）' },
  nostop: { name: '別停下來', need: 20, color: '#bfe8ff', goal: '打倒 20 隻怪；身邊有怪時不能站著不動超過 2 秒', still: 2 },
  tide: { name: '漲潮之前', need: 25, color: '#9fe0d8', goal: '殺第一隻開始倒數 60 秒，時間內打倒 25 隻怪', time: 60 },
  nodrink: { name: '別喝藥', need: 25, color: '#c8f090', goal: '不喝任何藥劑，打倒 25 隻怪' },
  lamp: { name: '燈不能滅', need: 20, color: '#fff0b0', goal: '待在諾娃的光圈裡打倒 20 隻怪（圈外累計 4 秒就重來）', R: 170, spd: 120, out: 4 },
};
// 現在這一章還沒完成的試煉
function trialNow() {
  const P = G.P; if (!P || typeof Quest === 'undefined') return null;
  const q = Quest.state(P), ch = QUESTS[q.ch]; if (!ch) return null;
  const i = ch.steps.findIndex((st, k) => st.trial && !q.done[Quest.key(q.ch, st, k)] && !trialDone(P, st.trial));
  return i < 0 ? null : ch.steps[i].trial;
}
function trialFail(why) {
  const r = G.trialRun; if (!r) return;
  if (r.kills > 0) { UI.msg(`夢境試煉「${TRIALS[r.id].name}」失敗：${why}，從 0 重來`, '#ff9a7a'); Sfx.play('click'); }
  r.kills = 0; r.t = 0; r.out = 0; r.still = 0; r.sid = null; r.failT = 1.2;
  if (r.id === 'lamp' && G.pl) { r.lx = G.pl.x; r.ly = G.pl.y; }
}
function trialWin(r) {
  const P = G.P, T = TRIALS[r.id];
  P.trials = P.trials || {}; P.trials[r.id] = true; G.trialRun = null;
  UI.banner('夢境試煉完成', `「${T.name}」`, T.color); burst(G.pl.x, G.pl.y, T.color, 30, 200); Sfx.play('unique');
  mechHud('trialHud', 96, T.color, ''); saveGame(); Quest.tick();
}
Hook.on('start', P => { P.trials = P.trials || {}; G.trialRun = null; });
Hook.on('enterMap', () => { G.trialRun = null; });
Hook.on('cast', sid => {
  const r = G.trialRun; if (!r || r.id !== 'onlyone' || sid === 'blink' || sid === 'iai' || !G.P.skills.includes(sid)) return;
  if (!r.sid) r.sid = sid;
  else if (r.sid !== sid) { trialFail(`用了「${SKILLS[sid].name}」`); r.sid = sid; }
});
Hook.on('kill', m => {
  const r = G.trialRun; if (!r) return;
  if (r.id === 'tide' && !r.t) r.t = TRIALS.tide.time;
  r.kills++;
  if (r.kills >= TRIALS[r.id].need) trialWin(r);
});
Hook.on('update', dt => {
  const w = G.world, pl = G.pl, P = G.P;
  const id = w && w.kind === 'map' && pl && P ? trialNow() : null;
  if (!id) { if (G.trialRun || StatusLines.fixed.trialHud) { G.trialRun = null; mechHud('trialHud', 96, '#fff', ''); } return; }
  let r = G.trialRun;
  if (!r || r.id !== id) { r = G.trialRun = { id, kills: 0, t: 0, out: 0, still: 0, sid: null, lx: pl.x, ly: pl.y, px: pl.x, py: pl.y, fl: [], failT: 0, bn: 2.5 }; }
  const T = TRIALS[id], paused = G.dead || (UI.paused && UI.paused());
  if (r.failT > 0) r.failT -= dt;
  if (r.bn > 0 && !paused && (r.bn -= dt) <= 0) UI.banner(`夢境試煉「${T.name}」`, `目標：${T.goal}`, T.color);   // v2.20 進圖 2.5 秒後（地圖名稱的橫幅過了）大字寫出目標
  let extra = '';
  if (!paused) {
    if (id === 'nostop') {
      const moved = Math.hypot(pl.x - r.px, pl.y - r.py) > 0.6, foe = G.mons.some(m => !m.dead && dist(m, pl) < 360);
      r.still = moved || !foe ? 0 : r.still + dt;
      if (r.still > T.still) trialFail('停下來太久了');
      if (r.still > 0.6) extra = `　⚠ 動起來！（${Math.max(0, T.still - r.still).toFixed(1)} 秒）`;
    } else if (id === 'tide' && r.t > 0) {
      r.t -= dt; if (r.t <= 0) trialFail('潮水漲回來了');
      extra = `　剩 ${Math.max(0, r.t).toFixed(1)} 秒`;
    } else if (id === 'nodrink') {
      (pl.fl || []).forEach((f, i) => { if (f && r.fl[i] != null && f.c < r.fl[i] - 0.01) trialFail('喝了藥'); r.fl[i] = f ? f.c : null; });
    } else if (id === 'lamp') {
      const d = Math.hypot(pl.x - r.lx, pl.y - r.ly), st = Math.min(d, T.spd * dt);
      if (d > 1) { r.lx += (pl.x - r.lx) / d * st; r.ly += (pl.y - r.ly) / d * st; }
      if (d > 600) { r.lx = pl.x; r.ly = pl.y; }   // 換區、傳送：光圈直接回到身邊
      r.out = Math.hypot(pl.x - r.lx, pl.y - r.ly) > T.R ? r.out + dt : Math.max(0, r.out - dt * 0.5);
      if (r.out > T.out) trialFail('離開光圈太久，燈滅了');
      if (r.out > 0.3) extra = `　⚠ 回到光裡！（${Math.max(0, T.out - r.out).toFixed(1)} 秒）`;
    }
  }
  r.px = pl.x; r.py = pl.y;
  if (id === 'onlyone' && r.sid) extra = `　只用「${SKILLS[r.sid].name}」`;
  mechHud('trialHud', 96, r.failT > 0 ? '#ff9a7a' : T.color, `目標：夢境試煉「${T.name}」　${r.kills} / ${T.need}${extra}`);
});
// 第五章：諾娃的光圈
Hook.on('drawWorld', g => {
  const r = G.trialRun; if (!r || r.id !== 'lamp' || !G.world || G.world.kind !== 'map') return;
  const R = TRIALS.lamp.R, t = G.time, warn = r.out > 0.3;
  g.save();
  g.fillStyle = 'rgba(255,236,170,0.06)'; g.beginPath(); g.arc(r.lx, r.ly, R, 0, Math.PI * 2); g.fill();
  g.strokeStyle = warn ? `rgba(255,150,110,${0.6 + 0.4 * Math.sin(t * 14)})` : 'rgba(255,232,160,0.75)'; g.lineWidth = 2.5;
  g.setLineDash([10, 8]); g.lineDashOffset = -t * 20; g.beginPath(); g.arc(r.lx, r.ly, R, 0, Math.PI * 2); g.stroke();
  g.setLineDash([]); g.fillStyle = '#fff4c8'; g.beginPath(); g.arc(r.lx, r.ly - 40 + Math.sin(t * 3) * 3, 4, 0, Math.PI * 2); g.fill();   // 諾娃的小燈
  g.restore();
});
Hook.on('light', (cut, cx, cy) => { const r = G.trialRun; if (r && r.id === 'lamp') cut(r.lx - cx, r.ly - cy, TRIALS.lamp.R + 40, 0.6); });
