// =============================================================
//  v2.19.6 打擊手感加強（參考「8 招打擊感」）
//  ・頓幀、震屏、閃白、怪物死亡碎裂（artui.js）、受擊壓扁、首領慢動作早就有；這個檔補齊剩下的：
//  ・拖尾：投射物身後畫最近 12 個位置的軌跡，越舊越細越透明；投射物消失軌跡就跟著消失
//  ・位移殘影：翻滾、躍擊、瞬移、一閃（一格內移動很遠）留下一道淡淡的殘影
//  ・飛行拉伸：投射物沿飛行方向拉到 120%、另一軸壓到 83%（render.js 的投射物迴圈呼叫 juiceProjXf）
//  ・連擊升調：1 秒內連續擊殺，擊殺音效每次升高 1 個半音，最多 12 級，停 1 秒回原音高（sfx.js 呼叫 Sfx.pitchMul）
//  ・終結慢鏡：首領倒下時（遊戲原本就放慢到 0.3 倍），鏡頭再以角色為中心推近 10%（render.js 呼叫 juiceZoom）
//  所有數值都在 JUICE；設定 → 介面「打擊特效加強」可以整組關掉（CFG.juice＝false）
// =============================================================
const JUICE = {
  trail: { len: 12, width: 3.2, alpha: 0.55, busy: 60 },      // busy：畫面上投射物超過這麼多，軌跡減半（省效能）
  dash: { jump: 48, life: 0.28, width: 12, alpha: 0.32 },      // jump：一格內移動超過幾點算「位移」
  stretch: { along: 1.2, across: 0.83, minSpeed: 120 },
  combo: { step: 1, max: 12, window: 1.0, sounds: ['kill', 'elitekill'] },
  finish: { zoom: 0.10, ease: 0.15 },                          // ease：推近、拉回各花幾秒
};
const Juice = (() => {
  const on = () => typeof CFG === 'undefined' || CFG.juice !== false;
  // —— 拖尾 ——
  const TCOL = { arrow: '#f0e2b0', fireball: '#ffa040', iceshard: '#c8f4ff', shadow: '#b898ff', axe: '#d8dce4', orb: null };
  const colOf = p => p.color || TCOL[p.sprite] || (p.team === 'ally' ? '#f0e8d0' : '#ffb0a0');
  // —— 位移殘影 ——
  let dashes = [], last = null;
  // —— 終結慢鏡 ——
  let smPrev = 0, smMax = 0;
  Hook.on('enterMap', () => { dashes = []; last = null; });
  Hook.on('start', () => { dashes = []; last = null; });
  Hook.on('update', dt => {
    const T = JUICE.trail, busy = G.projs && G.projs.length > T.busy, len = busy ? T.len >> 1 : T.len;
    if (G.projs) for (const p of G.projs) {
      const a = p._tr || (p._tr = []);
      a.push(p.x, p.y); while (a.length > len * 2) a.splice(0, 2);
    }
    const pl = G.pl;
    if (pl) {
      if (last && last.w === G.world) {
        const d = Math.hypot(pl.x - last.x, pl.y - last.y);
        if (d > JUICE.dash.jump && d < 600) dashes.push({ x0: last.x, y0: last.y, x1: pl.x, y1: pl.y, t: 0 });
        else if ((pl.roll > 0 || pl.leap) && d > 2) dashes.push({ x0: last.x, y0: last.y, x1: pl.x, y1: pl.y, t: 0 });
      }
      last = { x: pl.x, y: pl.y, w: G.world };
    }
    for (const s of dashes) s.t += dt;
    if (dashes.length) dashes = dashes.filter(s => s.t < JUICE.dash.life);
    const sm = G.slowmo > 0 ? G.slowmo : 0;
    if (sm > smPrev + 0.05) smMax = sm;
    smPrev = sm;
  });
  Hook.on('drawWorld', g => {
    if (!on()) return;
    const T = JUICE.trail, cx = G.cam.x, cy = G.cam.y;
    g.save(); g.lineCap = 'round';
    if (G.projs) for (const p of G.projs) {
      const a = p._tr; if (!a || a.length < 4) continue;
      if (p.x < cx - 80 || p.x > cx + VW + 80 || p.y < cy - 80 || p.y > cy + VH + 80) continue;
      const n = a.length / 2, base = Math.max(1.5, Math.min(T.width * 2, (p.r || 4) * 0.8)) * T.width / 3.2;
      g.strokeStyle = colOf(p);
      for (let i = 1; i < n; i++) {
        const k = i / (n - 1);   // 0＝最舊，1＝最新
        g.globalAlpha = T.alpha * k * k; g.lineWidth = Math.max(0.6, base * k);
        g.beginPath(); g.moveTo(a[i * 2 - 2], a[i * 2 - 1]); g.lineTo(a[i * 2], a[i * 2 + 1]); g.stroke();
      }
    }
    const D = JUICE.dash;
    for (const s of dashes) {
      const k = 1 - s.t / D.life;
      g.globalAlpha = D.alpha * k; g.strokeStyle = '#e8f0ff'; g.lineWidth = D.width * (0.4 + 0.6 * k);
      g.beginPath(); g.moveTo(s.x0, s.y0 - 14); g.lineTo(s.x1, s.y1 - 14); g.stroke();
    }
    g.restore();
  });
  // render.js 投射物迴圈：每個投射物畫之前呼叫；回傳 true＝已經 save 並變形，畫完由 render.js restore
  window.juiceProjXf = (g, p) => {
    if (!on() || p.sprite === 'axe') return false;
    const v = Math.hypot(p.vx || 0, p.vy || 0), S = JUICE.stretch; if (v < S.minSpeed) return false;
    const a = Math.atan2(p.vy, p.vx);
    g.save(); g.translate(p.x, p.y); g.rotate(a); g.scale(S.along, S.across); g.rotate(-a); g.translate(-p.x, -p.y);
    return true;
  };
  // render.js 鏡頭：回傳放大倍率（1＝不推近）
  window.juiceZoom = () => {
    if (!on() || !(G.slowmo > 0) || !smMax) return 1;
    const F = JUICE.finish, k = Math.max(0, Math.min(1, (smMax - G.slowmo) / F.ease, G.slowmo / F.ease));
    return 1 + F.zoom * k * k * (3 - 2 * k);
  };
  // sfx.js：擊殺音效連擊升調（r＝原本的隨機音高倍率）
  let combo = 0, lastKill = -9;
  Sfx.pitchMul = (name, r) => {
    const C = JUICE.combo; if (!on() || C.sounds.indexOf(name) < 0) return r;
    const now = performance.now() / 1000;
    combo = now - lastKill > C.window ? 0 : Math.min(C.max, combo + C.step); lastKill = now;
    return combo ? (0.985 + Math.random() * 0.03) * Math.pow(2, combo / 12) : r;
  };
  SettingsRows.add('ui', () => `<div class="prow"><div class="pname">打擊特效加強<small>投射物有拖尾、飛行時拉長，翻滾和瞬移有殘影，連續擊殺音效越來越高，首領倒下鏡頭推近</small></div><div class="pctl"><label class="pswitch"><input type="checkbox" data-juice ${on() ? 'checked' : ''}><span></span></label></div></div>`, root => {
    const c = root.querySelector('[data-juice]');
    if (c) c.onchange = () => { CFG.juice = c.checked; saveCfg(); };
  });
  return { on, combo: () => combo, dashes: () => dashes.length };
})();
