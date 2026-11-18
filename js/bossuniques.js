// =============================================================
//  v2.17 主線看守者的專屬傳奇：每件多一句「會動的效果」（舊存檔撿到的也有：看傳奇代號，不用重骰）
//   骸骨王冠（骸骨王）    殺死精英時，牠變成半透明的亡魂站起來替你打 10 秒（最多 3 隻）
//   王者之怒（骸骨王）    殺死精英時，原地震出衝擊波（範圍 130，你主技能 ×1.5 的傷害）
//   熔岩之心（熔岩女巫）  被打到時身邊炸出熔岩（範圍 100，火焰傷害＝你最大生命 25%，會點燃；每 2 秒一次）
//   灰燼法杖（熔岩女巫）  每放第 4 次法術，身邊爆出一圈灰燼新星（範圍 140，那招火焰傷害 ×1.2）
//   霜牙之弓（霜牙巨獸）  被冰緩的敵人死掉時，碎成 4 片冰刺往外飛（主技能 50%）
//   冰封之握（霜牙巨獸）  翻滾時在起點留下 3 秒冰霜地（冰冷傷害、冰緩）
//   母后之絲（蛛后）      殺死敵人時噴出蛛網：附近 90 內的敵人變慢 60%、2 秒
//   獸王之牙（獸王）      每殺 20 隻，發出獸吼：8 秒內攻擊、施法速度 +20%
//   巨鉗（巨蟹）          格擋時夾住附近一隻敵人 1 秒（定住不能動），順便夾一下（主技能 ×1）
//   魔女的苦湯（沼澤魔女）生命掉到 35% 以下時，身邊冒出 4 秒毒霧（每 8 秒一次）
//   樹心之衣（樹王）      站著不動超過 1 秒，每秒回復 3% 生命
//   法老權杖（沙漠法老）  每放第 5 次法術，游標位置落下一道雷（範圍 90，主技能 ×2 的閃電傷害，會感電）
//   凝視深淵（虛空之眼）  敵人死掉時 10% 機率（精英 50%）留下一隻凝視之眼 4 秒，每 0.6 秒朝附近敵人射暗影彈（最多 4 隻）
//  「主技能」＝技能欄第一個能用的技能算好的傷害（法師、召喚也吃得到）
//  資料：效果旗標 S.flags.bu_xxx（看身上裝備的 uniqueId）；暫存狀態放在這個檔案的變數裡，不存檔
// =============================================================
const BOSS_UNIQ_FX = {
  u_bonecrown: ['bu_raise', '殺死精英時，牠會變成亡魂站起來替你打 10 秒（最多 3 隻）'],
  u_kingwrath: ['bu_quake', '殺死精英時，原地震出衝擊波（範圍 130）'],
  u_lavaheart: ['bu_erupt', '被打到時身邊炸出熔岩，燒傷附近的敵人（每 2 秒一次）'],
  u_ashstaff: ['bu_ashnova', '每放第 4 次法術，身邊爆出一圈灰燼新星'],
  u_frostfang: ['bu_shard', '被冰緩的敵人死掉時，碎成 4 片冰刺往外飛'],
  u_frostgrip: ['bu_frosttrail', '翻滾時在起點留下 3 秒冰霜地'],
  u_silk: ['bu_web', '殺死敵人時噴出蛛網：附近的敵人變慢 60%（2 秒）'],
  u_kingfang: ['bu_roar', '每殺 20 隻發出獸吼：8 秒內攻擊、施法速度 +20%'],
  u_claw: ['bu_pinch', '格擋時夾住附近一隻敵人 1 秒，讓牠動不了'],
  u_brew: ['bu_fog', '生命掉到 35% 以下時，身邊冒出 4 秒毒霧（每 8 秒一次）'],
  u_heartwood: ['bu_root', '站著不動超過 1 秒，每秒回復 3% 生命'],
  u_pharaoh: ['bu_bolt', '每放第 5 次法術，游標位置落下一道雷'],
  u_gaze: ['bu_eye', '敵人死掉時有機會留下一隻凝視之眼，替你射暗影彈 4 秒'],
};
for (const id in BOSS_UNIQ_FX) STAT_TEXT[BOSS_UNIQ_FX[id][0]] = (t => () => t)(BOSS_UNIQ_FX[id][1]);
const BF = k => G.S && G.S.flags && G.S.flags[k];
Hook.on('stats', (S, P) => {
  for (const k in P.equip || {}) { const it = P.equip[k], fx = it && BOSS_UNIQ_FX[it.uniqueId]; if (fx) S.flags[fx[0]] = true; }
  if (_buRoarT > 0) { S.aspd_inc += 20; S.cspd_inc += 20; }
});
ITEM_TIP_EXTRA.push(it => { const fx = BOSS_UNIQ_FX[it.uniqueId]; return fx ? `<div class="tip-mod c-unique">★ ${fx[1]}</div>` : ''; });
// 主技能的傷害（縮放 k 倍），沒有就用武器
function buPk(k, elem) {
  const c = (G.slotCalc || []).find(x => x && x.d && Object.keys(x.d).length);
  let d = c ? c.d : { phys: (G.S && G.S.weapon && G.S.weapon.phys) || [5, 10] };
  if (elem) { let lo = 0, hi = 0; for (const e in d) { lo += d[e][0]; hi += d[e][1]; } d = { [elem]: [lo, hi] }; }
  return { d: Object.fromEntries(Object.entries(d).map(([e, v]) => [e, [v[0] * k, v[1] * k]])), crit: (c && c.crit) || 5, multi: (c && c.multi) || 150, ail: {} };
}
const buAoe = (x, y, R, pk, color, kb = 0.8) => {
  G.fx.push({ k: 'ring', x, y, r: R, t: 0, dur: 0.3, color, fill: color + '2e' });
  for (const m of G.mons) if (!m.dead && !m.hidden && Math.hypot(m.x - x, m.y - y) <= R + m.r) hitMonster(m, pk, false, G.pl, kb);
};
let _buRoarT = 0, _buKills = 0, _buSpells = 0, _buEruptCd = 0, _buFogCd = 0, _buStill = 0, _buLife = 0, _buRoll = 0, _buRx = 0, _buRy = 0;
const _buEyes = [];
Hook.on('kill', m => {
  const pl = G.pl; if (!pl || !G.S || m.boss) return;
  const elite = m.rarity === 'magic' || m.rarity === 'rare';
  if (elite && BF('bu_raise') && G.mins.filter(x => x.mtype === 'raised').length < 3) {
    const d = m.dmg || [5, 9];
    G.mins.push({ kind: 'min', mtype: 'raised', sprite: (m.def && m.def.sprite) || 'minion', ghost: true, x: m.x, y: m.y, r: m.r || 12, life: Math.round(m.maxLife * 0.5), maxLife: Math.round(m.maxLife * 0.5),
      dmg: [d[0] * 2.5, d[1] * 2.5], aps: 1.2, atkCD: 0.3, facing: 1, flash: 0, speed: 150, ranged: 0, taunt: false, count: 1, temp: 10 });
    burst(m.x, m.y, '#c8f0c8', 18, 150);
  }
  if (elite && BF('bu_quake')) { buAoe(m.x, m.y, 130, buPk(1.5), '#e8c890', 1.4); G.shake = Math.max(G.shake, 4); }
  if (BF('bu_shard') && m.chill > 0) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.random() * 0.5;
    G.projs.push({ team: 'ally', x: m.x, y: m.y, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, r: 4, life: 0.5, pk: buPk(0.5, 'cold'), pierce: 1, hit: new Set([m]), sprite: 'arrow', color: '#a8e8ff' }); }
  if (BF('bu_web')) { for (const o of G.mons) if (!o.dead && o !== m && dist(o, m) < 90 + o.r) { o.chill = Math.max(o.chill || 0, 2); o.chillAmt = Math.max(o.chillAmt || 0, 0.6); } burst(m.x, m.y, '#e8e8e8', 10, 120); }
  if (BF('bu_roar') && ++_buKills % 20 === 0) { const was = _buRoarT > 0; _buRoarT = 8; if (!was) onBuildChanged(); UI.msg('獸吼！8 秒內攻擊、施法速度 +20%', '#ffb070'); G.fx.push({ k: 'ring', x: pl.x, y: pl.y, r: 120, t: 0, dur: 0.4, color: '#ffb070', fill: 'rgba(255,176,112,0.15)' }); }
  if (BF('bu_eye') && _buEyes.length < 4 && Math.random() < (elite ? 0.5 : 0.1)) _buEyes.push({ x: m.x, y: m.y - 10, t: 4, cd: 0.2 });
});
Hook.on('cast', (sid, c) => {
  const sk = SKILLS[sid], pl = G.pl; if (!sk || !pl || !sk.tags.includes('spell')) return;
  _buSpells++;
  if (BF('bu_ashnova') && _buSpells % 4 === 0) { const f = c && c.d && c.d.fire ? { d: { fire: [c.d.fire[0] * 1.2, c.d.fire[1] * 1.2] }, crit: c.crit || 5, multi: c.multi || 150, ail: { ignite: 30 } } : buPk(1, 'fire'); buAoe(pl.x, pl.y, 140, f, '#ff9a50'); burst(pl.x, pl.y, '#5a4a40', 20, 200); }
  if (BF('bu_bolt') && _buSpells % 5 === 0) { const x = input.wx, y = input.wy, pk = buPk(2, 'light'); pk.ail = { shock: 40 }; buAoe(x, y, 90, pk, '#fff080'); burst(x, y, '#fff080', 24, 220); G.shake = Math.max(G.shake, 3); Sfx.play('boom', 0.4); }
});
Hook.on('update', dt => {
  const pl = G.pl, S = G.S; if (!pl || !S || G.dead) return;
  if (_buRoarT > 0 && (_buRoarT -= dt) <= 0) { _buRoarT = 0; onBuildChanged(); }
  if (_buEruptCd > 0) _buEruptCd -= dt; if (_buFogCd > 0) _buFogCd -= dt;
  // 被打到（生命或護盾少了）
  const hp = pl.life + (pl.es || 0);
  if (BF('bu_erupt') && hp < _buLife - 1 && _buEruptCd <= 0) { _buEruptCd = 2; const v = S.maxLife * 0.25; buAoe(pl.x, pl.y, 100, { d: { fire: [v * 0.8, v * 1.2] }, crit: 5, multi: 150, ail: { ignite: 40 } }, '#ff7030'); burst(pl.x, pl.y, '#ff7030', 20, 200); }
  _buLife = hp;
  if (BF('bu_fog') && _buFogCd <= 0 && pl.life < S.maxLife * 0.35) { _buFogCd = 8; const v = S.maxLife * 0.08;
    G.azones.push({ sid: 'brewfog', x: pl.x, y: pl.y, r: 110, t: 0, dur: 4, tick: 0.5, next: 0, pk: { d: { chaos: [v * 0.8, v * 1.2] }, crit: 0, multi: 150, ail: { poison: 60 } }, color: '#80c040' }); UI.msg('魔女的苦湯：毒霧！', '#80c040'); }
  // 樹心：站著不動
  const k = input.keys || {}, moving = k.KeyW || k.KeyA || k.KeyS || k.KeyD || k.ArrowUp || k.ArrowDown || k.ArrowLeft || k.ArrowRight || (input.joy && Math.hypot(input.joy.x, input.joy.y) > 0.15) || pl.roll > 0;
  _buStill = moving ? 0 : _buStill + dt;
  if (BF('bu_root') && _buStill > 1) { pl.life = Math.min(S.maxLife, pl.life + S.maxLife * 0.03 * dt); if (Math.random() < 0.15) G.parts.push({ x: pl.x + rnd(-14, 14), y: pl.y + 10, vx: 0, vy: -20, t: 0, dur: 0.8, color: '#7ad070', s: 2 }); }
  // 冰封之握：翻滾起點
  const r = pl.dodgeCd || 0;   // 位移冷卻剛開始＝剛翻滾
  if (r > _buRoll + 0.2 && BF('bu_frosttrail')) { const pk = buPk(0.25, 'cold'); G.azones.push({ sid: 'frostground', x: _buRx, y: _buRy, r: 70, t: 0, dur: 3, tick: 0.5, next: 0, pk, color: '#a8ecff', chill: true }); }
  _buRoll = r; _buRx = pl.x; _buRy = pl.y;
  // 巨鉗：格擋（遊戲剛冒出「格擋」字）
  if (BF('bu_pinch')) for (const t of G.texts) if (t.txt === '格擋' && !t._bu) { t._bu = true;
    let best = null, bd = 120; for (const m of G.mons) { if (m.dead || m.hidden) continue; const d = dist(m, pl); if (d < bd) { bd = d; best = m; } }
    if (best) { best.stagger = Math.max(best.stagger || 0, 1); hitMonster(best, buPk(1), false, pl, 0); burst(best.x, best.y, '#ff8060', 10, 120); G.texts.push({ x: best.x, y: best.y - 30, txt: '夾住', color: '#ff9a70', size: 12, t: 0, dur: 0.7 }); } }
  // 凝視之眼
  for (let i = _buEyes.length - 1; i >= 0; i--) { const e = _buEyes[i];
    if ((e.t -= dt) <= 0) { _buEyes.splice(i, 1); continue; }
    if ((e.cd -= dt) > 0) continue; e.cd = 0.6;
    let best = null, bd = 300; for (const m of G.mons) { if (m.dead || m.hidden) continue; const d = Math.hypot(m.x - e.x, m.y - e.y); if (d < bd) { bd = d; best = m; } }
    if (best) { const a = Math.atan2(best.y - e.y, best.x - e.x); G.projs.push({ team: 'ally', x: e.x, y: e.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, r: 5, life: 0.9, pk: buPk(0.4, 'chaos'), pierce: 0, hit: new Set(), explode: 0, sprite: 'shadow', color: '#b080ff' }); }
  }
});
Hook.on('enterMap', () => { _buEyes.length = 0; });
Hook.on('drawWorld', g => {
  if (!_buEyes.length) return; g.save();
  for (const e of _buEyes) { g.globalAlpha = Math.min(1, e.t); g.fillStyle = '#2a1040'; g.beginPath(); g.ellipse(e.x, e.y, 10, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c090ff'; g.beginPath(); g.arc(e.x, e.y, 3 + Math.sin(G.time * 6), 0, Math.PI * 2); g.fill(); }
  g.restore();
});
