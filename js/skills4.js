// =============================================================
//  v2.17 四個新技能（各職業一個，開局就會，等級到了就能用；也在塞拉的寶石商店）
//  ・蓄力射擊（弓箭手，4 級）：按住蓄力最多 1.5 秒，放開射出，傷害 1～4 倍；蓄滿時穿透所有敵人。蓄力中走路變慢、不能放別的技能。
//      手機：放開搖桿、站著不動時自動蓄力（角色身邊有一圈在長），點技能鈕就照目前蓄的力射出去。
//  ・夢遊（盜賊，8 級）：在原地留下半透明殘影 3 秒；這 3 秒內你放的攻擊和法術，殘影會在它的位置跟著放一次（傷害 50%）。冷卻 8 秒。
//  ・搖籃曲（召喚師，10 級）：滑鼠位置一圈內的小怪睡著 4 秒（不動、不攻擊，首領無效），打醒牠的那一下必定暴擊。冷卻 6 秒。
//  ・刻字（武士，6 級）：在腳下刻一個「醒」字（程式畫），持續 6 秒；站在字上時攻擊速度 +30%。冷卻 9 秒。
//  圖示先借現有技能的圖案換顏色（見 SK4_GLYPH）；殘影、醒字、睡覺的 z 都是程式畫。
//  包裝：UI.skillInfo 包一次（這四種技能沒有傷害，技能頁改寫成白話效果）
//  資料：沒有存檔資料；G.sk4 是這次地圖裡的殘影、醒字、蓄力狀態（換地圖清掉）；怪物身上的 m.sleep＝還要睡幾秒
// =============================================================
Object.assign(SKILLS, {
  chargeshot: { name: '蓄力射擊', icon: '蓄', color: '#ffd870', lvl: 4, cls: 'druid', tags: ['attack', 'projectile'], cost: 6, eff: 1.0, speed: 0.9,
    type: 'chargeshot', count: 1, spread: 0.15, pspeed: 820, pierce: 1, need: 'bow', sprite: 'arrow',
    desc: '按住蓄力，放開射出：蓄越久越痛（最多 1.5 秒、傷害 4 倍），蓄滿時穿過所有敵人。手機上站著不動就會自己蓄力。需要弓。' },
  sleepwalk: { name: '夢遊', icon: '遊', color: '#b8a0ff', lvl: 8, cls: 'ranger', tags: ['spell', 'buff'], cost: 12, cd: 8, cast: 0.3, type: 'sleepwalk', dur: 3,
    desc: '在原地留下一個半透明的殘影。接下來 3 秒你放的攻擊和法術，殘影也會在它站的地方跟著放一次（傷害 50%）。冷卻 8 秒。' },
  lullaby: { name: '搖籃曲', icon: '眠', color: '#a0c8ff', lvl: 10, cls: 'summoner', tags: ['spell', 'area', 'control'], cost: 14, cd: 6, cast: 0.6,
    type: 'lullaby', radius: 110, range: 420, dur: 4,
    desc: '在滑鼠位置唱搖籃曲：圈內的小怪睡著 4 秒，不動也不攻擊（首領無效）。打醒牠的那一下必定暴擊。冷卻 6 秒。' },
  inscribe: { name: '刻字', icon: '醒', color: '#ffe0a0', lvl: 6, cls: 'samurai', tags: ['spell', 'area', 'buff'], cost: 10, cd: 9, cast: 0.4,
    type: 'inscribe', radius: 70, dur: 6,
    desc: '在腳下刻一個「醒」字，持續 6 秒。站在字上的時候攻擊速度 +30%。冷卻 9 秒。' },
});
const SK4 = ['chargeshot', 'sleepwalk', 'lullaby', 'inscribe'];
Object.assign(SKILL_ATTR, { chargeshot: ['dex'], sleepwalk: ['dex', 'int'], lullaby: ['int'], inscribe: ['str', 'dex'] });
for (const k of SK4) { SKILLS[k].id = k; SKILLS[k].req = gemReqAttr(k, 1); }
const SK4_GLYPH = { chargeshot: 'rapid', sleepwalk: 'blink', lullaby: 'c_chain', inscribe: 'iai' };
if (typeof SKILL_GLYPHS !== 'undefined') for (const k of SK4) if (!SKILL_GLYPHS[k]) SKILL_GLYPHS[k] = SKILL_GLYPHS[SK4_GLYPH[k]] || SKILL_GLYPHS.thorn || SKILL_GLYPHS.heavy;
for (const [cls, sid] of [['druid', 'chargeshot'], ['ranger', 'sleepwalk'], ['summoner', 'lullaby'], ['samurai', 'inscribe']]) if (!CLASS_GEMS[cls].includes(sid)) CLASS_GEMS[cls].push(sid);
if (typeof TAG_NAME !== 'undefined') TAG_NAME.control = '控場';

G.sk4 = { ghost: null, ghostQ: [], glyph: null, charge: null, auto: 0 };
Hook.on('enterMap', () => { G.sk4 = { ghost: null, ghostQ: [], glyph: null, charge: null, auto: 0 }; });
const sk4Scale = (c, f) => Object.assign({}, c, { d: Object.fromEntries(Object.entries(c.d).map(([k, v]) => [k, [v[0] * f, v[1] * f]])), echo: false });

// ---------- 蓄力射擊 ----------
const CHARGE_MAX = 1.5;
function chargeHeld(slot) { const k = input.keys || {}; return slot === 0 ? !!input.l : slot === 1 ? !!input.r : !!k[['KeyQ', 'KeyE', 'KeyR'][slot - 2]]; }
function chargeFire(sid, c, pk, ang, f) {
  const sk = SKILLS[sid], pl = G.pl, full = f >= 0.999, mul = 1 + 3 * f;
  const p2 = scalePk(pk, mul); if (typeof markSlotCalc === 'function') markSlotCalc(p2, G.P.skills.indexOf(sid));
  const n = Math.max(1, c.count), spread = n > 1 ? Math.min(1.7, sk.spread * (n - 1)) : 0, castHit = new Map();
  for (let k = 0; k < n; k++) {
    const a = n > 1 ? ang - spread / 2 + spread * k / (n - 1) : ang;
    G.projs.push({ team: 'ally', x: pl.x + Math.cos(a) * 12, y: pl.y - 6 + Math.sin(a) * 12, vx: Math.cos(a) * sk.pspeed * (1 + f * 0.4), vy: Math.sin(a) * sk.pspeed * (1 + f * 0.4),
      r: full ? 6 : 4, life: 1.3, pk: p2, pierce: full ? 99 : c.pierce, hit: new Set(), cast: castHit, explode: 0, sprite: 'arrow', color: full ? '#fff4b0' : sk.color });
  }
  if (f > 0.3) G.shake = Math.max(G.shake, 1 + f * 3);
  if (full) { burst(pl.x, pl.y - 6, '#fff0a0', 16, 200); G.texts.push({ x: pl.x, y: pl.y - 40, txt: '蓄滿！', color: '#ffe680', size: 13, t: 0, dur: 0.7 }); }
}
NEW_CAST.chargeshot = function (sid, c, sk, pk, ang) {
  const S4 = G.sk4;
  if (c._release != null) return chargeFire(sid, c, pk, ang, c._release);
  if (Touch.on || G._autoCast || G._ghostCast) { const f = Touch.on && !G._autoCast && !G._ghostCast ? Math.min(1, S4.auto / CHARGE_MAX) : 0; S4.auto = 0; return chargeFire(sid, c, pk, ang, f); }
  S4.charge = { sid, slot: G.P.skills.indexOf(sid), t: 0 };   // 電腦：開始蓄力，放開按鍵才射（update 裡判斷）
};
Hook.on('update', dt => {
  const S4 = G.sk4, pl = G.pl, P = G.P; if (!pl || !P) return;
  const ch = S4.charge;
  if (ch) {
    if (G.dead || G.state !== 'play' || P.skills[ch.slot] !== ch.sid) S4.charge = null;
    else if (chargeHeld(ch.slot) && !UI.paused()) { ch.t = Math.min(CHARGE_MAX, ch.t + dt); pl.act = Math.max(pl.act, 0.05); const a = Math.atan2(input.wy - pl.y, input.wx - pl.x); pl.aim = a; pl.facing = Math.cos(a) >= 0 ? 1 : -1; }
    else { S4.charge = null; const c = G.slotCalc[ch.slot]; if (c) castSkill(ch.sid, Object.assign({}, c, { _release: Math.min(1, ch.t / CHARGE_MAX) })); }
  }
  // 手機：站著不動自動蓄力
  if (Touch.on) {
    const has = P.skills.includes('chargeshot'), still = !input.joy || Math.hypot(input.joy.x, input.joy.y) < 0.2;
    S4.auto = has && still && G.world && G.world.kind === 'map' ? Math.min(CHARGE_MAX, S4.auto + dt) : 0;
  }
});
function drawChargeRing(g, f) {
  const pl = G.pl, R = 20;
  g.save(); g.globalAlpha = 0.85; g.lineWidth = 3; g.strokeStyle = f >= 0.999 ? '#fff4b0' : '#ffd870';
  g.beginPath(); g.arc(pl.x, pl.y - 6, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); g.stroke();
  if (f >= 0.999) { g.globalAlpha = 0.25 + 0.15 * Math.sin(G.time * 18); g.fillStyle = '#fff0a0'; g.beginPath(); g.arc(pl.x, pl.y - 6, R + 4, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

// ---------- 夢遊 ----------
const ghostOK = sid => { const sk = SKILLS[sid]; return sk && sid !== 'sleepwalk' && isDmgSkill(sid) && !['dash', 'blink', 'summon'].includes(sk.type); };
NEW_CAST.sleepwalk = function (sid, c, sk) {
  const pl = G.pl;
  G.sk4.ghost = { x: pl.x, y: pl.y, facing: pl.facing || 1, t: sk.dur, dur: sk.dur }; G.sk4.ghostQ = [];
  burst(pl.x, pl.y, sk.color, 14, 120);
  G.texts.push({ x: pl.x, y: pl.y - 40, txt: '夢遊', color: sk.color, size: 12, t: 0, dur: 0.7 });
};
Hook.on('cast', (sid, c) => {
  const S4 = G.sk4, gh = S4.ghost;
  if (!gh || G._ghostCast || !c || !ghostOK(sid)) return;
  if (SKILLS[sid].type === 'chargeshot' && c._release == null && !Touch.on && !G._autoCast) return;   // 剛開始蓄力不算，放開射出才跟著射
  S4.ghostQ.push({ t: 0.15, sid, c: sk4Scale(c, 0.5), wx: input.wx, wy: input.wy });
});
Hook.on('update', dt => {
  const S4 = G.sk4, gh = S4.ghost, pl = G.pl; if (!gh || !pl) return;
  gh.t -= dt;
  for (const q of S4.ghostQ) {
    if ((q.t -= dt) > 0) continue; q.done = true;
    const tgt = typeof dreamNearest === 'function' ? dreamNearest(gh.x, gh.y, 460) : null;
    const ox = pl.x, oy = pl.y, of = pl.facing, oa = pl.aim, wx = input.wx, wy = input.wy;
    pl.x = gh.x; pl.y = gh.y; input.wx = tgt ? tgt.x : q.wx; input.wy = tgt ? tgt.y : q.wy; G._ghostCast = true;
    try { castSkill(q.sid, q.c); } catch (e) { console.error('[夢遊]', e); }
    finally { gh.facing = pl.facing; pl.x = ox; pl.y = oy; pl.facing = of; pl.aim = oa; input.wx = wx; input.wy = wy; G._ghostCast = false; }
  }
  S4.ghostQ = S4.ghostQ.filter(q => !q.done);
  if (gh.t <= 0 && !S4.ghostQ.length) S4.ghost = null;
});
function drawGhost(g, gh) {
  const a = Math.min(1, gh.t / 0.5, (gh.dur - gh.t) / 0.3 + 0.2) * (0.6 + 0.1 * Math.sin(G.time * 6));
  g.save(); g.globalAlpha = Math.max(0, a); g.fillStyle = '#c8b4ff'; g.strokeStyle = '#ffffff'; g.lineWidth = 1;
  g.beginPath(); g.ellipse(gh.x, gh.y - 2, 10, 14, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(gh.x, gh.y - 20, 7.5, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.ellipse(gh.x, gh.y - 2, 9, 13, 0, 0, Math.PI * 2); g.fill();     // 身體
  g.beginPath(); g.arc(gh.x, gh.y - 20, 6.5, 0, Math.PI * 2); g.fill();             // 頭
  g.globalAlpha *= 0.5; g.beginPath(); g.ellipse(gh.x, gh.y + 11, 12, 4, 0, 0, Math.PI * 2); g.fill();   // 腳下的影子
  g.restore();
}

// ---------- 搖籃曲 ----------
NEW_CAST.lullaby = function (sid, c, sk, pk, ang) {
  const pl = G.pl, d = Math.min(sk.range, Math.hypot(input.wx - pl.x, input.wy - pl.y));
  const p = castPoint(pl.x, pl.y, Math.cos(ang), Math.sin(ang), d), R = sk.radius * (c.areaMul || 1);
  let n = 0;
  for (const m of G.mons) if (!m.dead && !m.boss && m.rarity !== 'boss' && Math.hypot(m.x - p.x, m.y - p.y) <= R + m.r) { m.sleep = sk.dur; m.kx = m.ky = 0; m._sx = m.x; m._sy = m.y; n++; }
  G.fx.push({ k: 'ring', x: p.x, y: p.y, r: R, t: 0, dur: 0.6, color: sk.color, fill: 'rgba(160,200,255,0.16)' });
  for (let i = 0; i < 5; i++) G.texts.push({ x: p.x + rnd(-R, R) * 0.6, y: p.y + rnd(-R, R) * 0.4, txt: '♪', color: '#c8e0ff', size: 14, t: 0, dur: 0.9, vx: rnd(-14, 14) });
  if (n) G.texts.push({ x: p.x, y: p.y - 30, txt: `${n} 隻睡著了`, color: '#c8e0ff', size: 11, t: 0, dur: 0.8 });
};
Hook.on('update', dt => {
  for (const m of G.mons) if (m.sleep > 0 && !m.dead) { m.sleep -= dt; m.stagger = Math.max(m.stagger || 0, 0.06); m.aggro = false; if (m._sx != null) { m.x = m._sx; m.y = m._sy; } }   // 睡著：釘在原地（飛的、跳的怪也一樣）
});
Hook.on('preHit', ctx => {
  const m = ctx.m; if (!(m.sleep > 0)) return;
  m.sleep = 0; ctx.crit = true;
  G.texts.push({ x: m.x, y: m.y - m.r - 30, txt: '驚醒！', color: '#ffe680', size: 12, t: 0, dur: 0.7 });
});

// ---------- 刻字 ----------
NEW_CAST.inscribe = function (sid, c, sk) {
  const pl = G.pl;
  G.sk4.glyph = { x: pl.x, y: pl.y + 8, r: sk.radius * (c.areaMul || 1), t: sk.dur, dur: sk.dur };
  burst(pl.x, pl.y, sk.color, 18, 140);
};
const onGlyph = () => { const gl = G.sk4.glyph, pl = G.pl; return !!(gl && pl && gl.t > 0 && Math.hypot(pl.x - gl.x, pl.y - gl.y) <= gl.r); };
Hook.on('update', dt => { const gl = G.sk4.glyph; if (gl && (gl.t -= dt) <= 0) G.sk4.glyph = null; });
// 站在字上出手：這次攻擊的出手時間 ÷1.3（useSkill 設好出手時間之後才發 'cast'）
Hook.on('cast', sid => {
  if (G._autoCast || G._ghostCast || !onGlyph() || !SKILLS[sid] || !SKILLS[sid].tags.includes('attack') || !(G.pl.act > 0)) return;
  G.pl.act /= 1.3;
});
function drawGlyph(g, gl) {
  const a = Math.min(1, gl.t / 0.6, (gl.dur - gl.t) / 0.25 + 0.1), on = onGlyph();
  g.save(); g.globalAlpha = a * 0.55;
  g.strokeStyle = '#ffe0a0'; g.lineWidth = 2; g.beginPath(); g.ellipse(gl.x, gl.y, gl.r, gl.r * 0.55, 0, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = a * (on ? 0.9 : 0.7); g.font = `bold ${Math.round(gl.r * 0.8)}px "Noto Serif TC", "PMingLiU", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.translate(gl.x, gl.y); g.scale(1, 0.6);   // 字躺在地上
  g.lineWidth = 5; g.strokeStyle = 'rgba(60,30,10,0.8)'; g.strokeText('醒', 0, 0);
  g.fillStyle = on ? '#fff4c8' : '#ffd890'; g.fillText('醒', 0, 0);
  g.restore(); g.restore();
}

// ---------- 畫 ----------
Hook.on('drawWorld', g => { const gl = G.sk4.glyph; if (gl) drawGlyph(g, gl); });
Hook.on('drawOver', g => {
  const S4 = G.sk4; if (!G.pl) return;
  if (S4.ghost) drawGhost(g, S4.ghost);
  if (S4.charge) drawChargeRing(g, Math.min(1, S4.charge.t / CHARGE_MAX));
  else if (Touch.on && S4.auto > 0.15) drawChargeRing(g, Math.min(1, S4.auto / CHARGE_MAX));
  let n = 0;
  for (const m of G.mons) {
    if (!(m.sleep > 0) || m.dead || ++n > 40) continue;
    const k = (G.time * 0.8 + m.x * 0.01) % 1;
    g.save(); g.globalAlpha = 1 - k; g.fillStyle = '#c8e0ff'; g.font = `bold ${10 + k * 6}px sans-serif`; g.textAlign = 'center';
    g.fillText('z', m.x + 6 + k * 8, m.y - m.r - 10 - k * 14); g.restore();
  }
});

// ---------- 技能頁的說明 ----------
const _infoSk4 = UI.skillInfo.bind(UI);
UI.skillInfo = function (sid, c) {
  const sk = SKILLS[sid], cd = sk && sk.cd ? `　<span style="color:#ffcf70">冷卻 ${effCd(G.S, sk).toFixed(1)} 秒</span>` : '';
  if (!sk) return _infoSk4(sid, c);
  if (sk.type === 'sleepwalk') return `殘影 ${sk.dur} 秒，跟著放你的攻擊和法術（傷害 50%）${cd}`;
  if (sk.type === 'lullaby') return `圈內小怪睡 ${sk.dur} 秒（首領無效），打醒的那一下必定暴擊　範圍 ${Math.round(sk.radius * ((c && c.areaMul) || 1))}${cd}`;
  if (sk.type === 'inscribe') return `站在「醒」字上攻擊速度 +30%，持續 ${sk.dur} 秒${cd}`;
  if (sk.type === 'chargeshot') return _infoSk4(sid, c) + `　投射物 ${Math.max(1, c.count)}　<span style="color:#ffe680">蓄滿：傷害 ×4、穿透全部</span>（上面是沒蓄力的數字）`;
  return _infoSk4(sid, c);
};
