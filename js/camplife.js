// =============================================================
//  v2.7.10 營地（庇護所）更有生氣
//  ・每個營地多 2 位「路人」：沒有功能，會在附近慢慢走動，你靠近時會說話（按 F 也可以跟他們聊一句）
//  ・營火、掛燈、每個營地自己的氛圍粒子（牢房的塵埃、冰窟的雪、驛站的海霧、樹根的螢火蟲、燈塔的虛空光點）
//  ・v2.18.2 打完第 4／7 夜回到營地時，播主線的「歐莉的紙條」「牆上的字」（story.js 的 tier4、tier7）
// =============================================================
const CAMP_FOLK = {
  cell: [
    { id: 'f_prisoner', name: '囚犯．阿德', sprite: 'flv_prisoner', at: [5, 6], lines: ['「我數過這裡的磚，每天醒來都多一塊。」', '「你也是被夢關進來的？」', '「別碰那面牆，上面的字會換。」'] },
    { id: 'f_monk', name: '褪色的修士', sprite: 'flv_monk', at: [25, 15], ghost: true, lines: ['「……醒來……」', '「我在這裡禱告了很久，久到忘了要求什麼。」', '「每個人都以為自己是第一個醒來的。」'] },
  ],
  icecamp: [
    { id: 'f_dwarf', name: '鑿冰的矮人．托姆', sprite: 'flv_dwarf', at: [5, 6], lines: ['「冰裡凍著一些東西，有時候它們會眨眼。」', '「這把鎬子比我老。」', '「別在冰上生火，會哭的。」'] },
    { id: 'f_kid', name: '雪地裡的孩子．小石', sprite: 'flv_kid', at: [24, 15], lines: ['「你看！我堆的雪人會自己轉頭！」', '「阿雷說外面的狼是夢變的。」', '「我不冷，我只是不記得溫暖是什麼。」'] },
  ],
  harbor: [
    { id: 'f_mer', name: '擱淺的人魚．瑟琳', sprite: 'flv_mer', at: [25, 6], lines: ['「海在夢的另一邊，我回不去了。」', '「浪聲裡有人在叫你的名字。」', '「別相信退潮，它會回來的。」'] },
    { id: 'f_sailor', name: '醉水手．魯伯', sprite: 'flv_sailor', at: [5, 15], lines: ['「再一杯……就一杯……」', '「我的船沉在第三夜，你看到的話幫我說聲對不起。」', '「哈桑的貨，十件有九件是夢裡撈的。」'] },
  ],
  grove: [
    { id: 'f_elf', name: '林中守望者．艾菈', sprite: 'flv_elf', at: [5, 6], lines: ['「樹根記得每一個走過的人。」', '「葉子落下的方向，就是夢醒的方向。」', '「卡爾在找的，可能從來不存在。」'] },
    { id: 'f_gnome', name: '採菇的地精．波波', sprite: 'flv_gnome', at: [25, 15], lines: ['「這朵紅的不能吃。那朵也不能。全部都不能。」', '「茵婆婆的湯，是用我的蘑菇煮的喔！」', '「噓，樹在睡覺。」'] },
  ],
  lighthouse: [
    { id: 'f_maud', name: '沉默的女騎士．莫德', sprite: 'flv_maud', at: [5, 6], lines: ['「……」', '「（她看著遠方的黑暗，握緊了劍）」', '「國王回來的那天，我會在這裡。」'] },
    { id: 'f_old', name: '數星星的老人', sprite: 'flv_old', at: [25, 15], lines: ['「昨晚少了一顆星。前晚也是。」', '「燈塔的光照不到的地方，就是夢的盡頭。」', '「年輕人，你醒來以後，還會記得我嗎？」'] },
  ],
};
const CAMP_FX = { cell: 'dust', icecamp: 'snow', harbor: 'mist', grove: 'firefly', lighthouse: 'void' };

function campFolk(w) {
  if (!w || w.kind !== 'town') return [];
  if (!w.folk) w.folk = (CAMP_FOLK[w.hub] || []).map(f => ({ ...f, hx: f.at[0] * TS + 16, hy: f.at[1] * TS + 16, x: f.at[0] * TS + 16, y: f.at[1] * TS + 16, tx: null, wait: Math.random() * 3, say: null, sayT: 0, lastSay: -99, facing: 1, r: 10 }));
  return w.folk;
}
function folkSay(f, line) { f.say = line || pick(f.lines); f.sayT = 3.6; f.lastSay = G.time; }
// 走動、說話
Hook.on('update', dt => {
  const w = G.world; if (!w || w.kind !== 'town' || !G.pl) return;
  const pl = G.pl;
  for (const f of campFolk(w)) {
    if (f.sayT > 0) f.sayT -= dt;
    const near = dist(f, pl) < 120;
    if (near) { f.tx = null; f.facing = pl.x > f.x ? 1 : -1; if (G.time - f.lastSay > 9) folkSay(f); continue; }   // 你靠近時停下來看著你
    if (f.tx == null) { if ((f.wait -= dt) <= 0) { const a = Math.random() * 6.28, r = 20 + Math.random() * 50; f.tx = f.hx + Math.cos(a) * r; f.ty = f.hy + Math.sin(a) * r * 0.6; } }
    else {
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
      if (d < 3) { f.tx = null; f.wait = 2 + Math.random() * 4; }
      else { const sp = 28 * dt; const ox = f.x, oy = f.y; moveEnt(f, dx / d * sp, dy / d * sp); if (Math.abs(f.x - ox) + Math.abs(f.y - oy) < 0.01) f.tx = null; f.facing = dx > 0 ? 1 : -1; f.walk = (f.walk || 0) + dt * 8; }
    }
    if (G.time - f.lastSay > 25 + Math.random() * 400) folkSay(f);   // 偶爾自言自語
  }
});
Interact.add('folk', (pl, w) => w.kind === 'town' ? campFolk(w).map(f => ({ ref: f, label: '聊聊' })) : null, f => { Sfx.play('click'); if (!Talk.run(f.id, f)) folkSay(f); });   // 帶話任務的對象先處理（core.js 的 Talk）

// 畫：營火、掛燈、路人、對話泡泡、氛圍粒子
const _townDecoCamp = drawTownDeco;
drawTownDeco = function (g, w) {
  // 營火（地圖中央偏下，人會圍著）
  const fx = (w.fire ? w.fire[0] : 15) * TS, fy = (w.fire ? w.fire[1] : 11) * TS;
  const fl = 0.85 + Math.sin(G.time * 9) * 0.08 + Math.sin(G.time * 23) * 0.05;
  const gl = g.createRadialGradient(fx, fy, 0, fx, fy, 120 * fl); gl.addColorStop(0, 'rgba(255,170,80,0.28)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(fx, fy, 120 * fl, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a2614'; for (const [a, b] of [[-10, 4], [8, 6], [-2, 9]]) { g.save(); g.translate(fx + a, fy + b); g.rotate(a * 0.05); g.fillRect(-11, -2, 22, 5); g.restore(); }
  g.fillStyle = '#5a5048'; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.arc(fx + Math.cos(a) * 15, fy + 4 + Math.sin(a) * 8, 3.2, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 3; i++) { const h = (14 + i * 4) * fl, ox = (i - 1) * 4; g.fillStyle = ['#ff7a20', '#ffb040', '#fff0a0'][i]; g.beginPath(); g.moveTo(fx + ox - 6 + i * 2, fy + 4); g.quadraticCurveTo(fx + ox + Math.sin(G.time * 12 + i) * 3, fy - h, fx + ox + 6 - i * 2, fy + 4); g.fill(); }
  if (Math.random() < 0.25) G.parts.push({ x: fx + rnd(-6, 6), y: fy - 6, vx: rnd(-8, 8), vy: rnd(-40, -20), t: 0, dur: rnd(0.6, 1.2), color: '#ffc060', s: 2 });
  _townDecoCamp(g, w);
  // 路人
  for (const f of campFolk(w)) {
    shadow(g, f.x, f.y + 10, 12);
    let bob = Math.round(Math.sin(G.time * 2 + f.hx) * 1);
    if (f.ghost) { bob = Math.round(Math.sin(G.time * 1.5) * 2) - 2; g.globalAlpha = 0.55 + Math.sin(G.time * 2) * 0.1; }
    drawSprite(g, f.sprite, f.x, f.y + 12, 2, f.facing, null, false, bob, f.tx != null, f.hx);
    g.globalAlpha = 1;
    const near = G.nearAct && G.nearAct.ref === f;
    txt(g, near ? `${ctlTag()}${f.name}` : f.name, f.x, f.y + 26, near ? 12 : 10, near ? '#fff2b0' : '#d4c6a4', 'center');
    if (f.sayT > 0 && f.say) {
      g.globalAlpha = Math.min(1, f.sayT / 0.4);
      g.font = `12px ${FONT}`; const tw = Math.min(260, g.measureText(f.say).width) + 14, bx = f.x - tw / 2, by = Math.max(f.y - 64, Math.round(G.cam.y) + 30);   // v2.18.2 不蓋到左上角的營地名稱
      g.fillStyle = 'rgba(250,244,228,0.94)'; roundRect(g, bx, by, tw, 20, 6); g.fill();
      g.beginPath(); g.moveTo(f.x - 5, by + 20); g.lineTo(f.x + 2, by + 27); g.lineTo(f.x + 5, by + 20); g.fill();
      txt(g, f.say, f.x, by + 10, 12, '#3a2a18', 'center', false);
      g.globalAlpha = 1;
    }
  }
  // 氛圍粒子
  const kind = CAMP_FX[w.hub], W = w.W * TS, H = w.H * TS;
  if (!w.amb) w.amb = Array.from({ length: kind === 'snow' ? 70 : 40 }, () => ({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6.28, s: Math.random() }));
  for (const a of w.amb) {
    let col, r = 1.5;
    if (kind === 'snow') { a.y += 0.5 + a.s * 0.6; a.x += Math.sin(G.time + a.p) * 0.3; if (a.y > H) { a.y = 0; a.x = Math.random() * W; } col = 'rgba(240,248,255,0.8)'; r = 1.2 + a.s * 1.2; }
    else if (kind === 'firefly') { a.x += Math.sin(G.time * 0.7 + a.p) * 0.4; a.y += Math.cos(G.time * 0.5 + a.p * 2) * 0.3; col = `rgba(210,255,120,${0.3 + 0.6 * Math.max(0, Math.sin(G.time * 2 + a.p * 3))})`; r = 2; }
    else if (kind === 'mist') { a.x += 0.25 + a.s * 0.2; if (a.x > W) a.x = 0; col = 'rgba(220,235,245,0.06)'; r = 30 + a.s * 30; }
    else if (kind === 'void') { a.y -= 0.2 + a.s * 0.2; if (a.y < 0) a.y = H; col = `rgba(190,150,255,${0.25 + 0.4 * Math.sin(G.time * 1.5 + a.p)})`; r = 1.6; }
    else { a.x += Math.sin(G.time * 0.3 + a.p) * 0.15; a.y += 0.05; if (a.y > H) a.y = 0; col = 'rgba(255,230,180,0.35)'; r = 1; }
    g.fillStyle = col; g.beginPath(); g.arc(a.x, a.y, r, 0, Math.PI * 2); g.fill();
  }
};
// v2.18.2 主線「歐莉的紙條」（tier4）、「牆上的字」（tier7）：打完第 4／7 夜之後，回到任何一個營地時播（以前是一進那一夜就播，人卻還寫在牢房裡）
Hook.on('update', () => {
  const w = G.world, P = G.P; if (!w || w.kind !== 'town' || !P || !P.story || UI.storyOpen || UI.paused()) return;
  for (const t of [4, 7]) if ((P.maxTier || 0) > t && !P.story.seen['tier' + t]) { storyBeat('tier' + t); break; }
});
