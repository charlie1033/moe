// =============================================================
//  v2.20.12 夢深詞綴：只有夢深滿了才帶得出來的詞綴
//  玩家看到：
//    夢深滿了（生命球上面的紫弧寫「夢深 滿」）的時候，掉的藍裝、黃裝有 30% 帶一條淡藍色的「夢深詞綴」
//    醒一下的小寶箱裡那件一定有
//    每件最多 1 條；同一種穿兩件只算最高的那件，不同種可以一起用
//    效果都跟夢深綁在一起（越深越強、醒一下更好用……）
//    換夢、亂夢這些重骰洗不掉；醒神（洗回白裝）會把它洗掉；詞綴記憶記不住它
//  資料：item.dd = { id, v }
//  接點：Hook 'dropItem'（掉落時加上）、'treeStats'（越深越強的兩種）、'kill'（夢囈）、'build'（快取身上有哪些）
//    貪夢、賴床、驚醒在夢深條那邊查 DreamAffix.val()
// =============================================================
const DreamAffix = (() => {
  const COLOR = '#9ab8ff', CHANCE = 0.3;
  const LIST = [
    { id: 'da_deep', name: '沉夢', r: [2, 3], text: v => `夢深每 10%，傷害增加 ${v}%（滿了 +${v * 10}%）` },
    { id: 'da_drift', name: '夢遊', r: [1, 2], text: v => `夢深每 10%，移動速度增加 ${v}%（滿了 +${v * 10}%）` },
    { id: 'da_greed', name: '貪夢', r: [25, 50], text: v => `擊殺讓夢深漲得快 ${v}%` },
    { id: 'da_doze', name: '賴床', r: [4, 8], text: v => `夢深滿了以後，多 ${v} 秒夢才會吞你` },
    { id: 'da_jolt', name: '驚醒', r: [15, 25], text: v => `醒一下的時候回復 ${v}% 生命` },
    { id: 'da_murmur', name: '夢囈', r: [6, 12], text: v => `夢深滿了的時候，擊殺有 ${v}% 機率多掉一個通貨` },
  ];
  const BY = Object.fromEntries(LIST.map(a => [a.id, a]));
  const ok = it => it && !isFlask(it) && !isStack(it) && ['magic', 'rare'].includes(it.rarity) && !it.set && BASE_BY_ID[it.base];
  function roll(it, id) { const a = id ? BY[id] : pick(LIST); it.dd = { id: a.id, v: rint(a.r[0], a.r[1]) }; return it; }
  // 身上有哪些（同一種取最高）
  function from(P) { const o = {}; if (!P || !P.equip) return o; for (const k in P.equip) { const it = P.equip[k]; if (it && it.dd && BY[it.dd.id]) o[it.dd.id] = Math.max(o[it.dd.id] || 0, it.dd.v); } return o; }
  let now = {};
  const val = id => now[id] || 0;
  const scales = () => !!(now.da_deep || now.da_drift);
  Hook.on('build', () => { now = from(G.P); });
  Hook.on('start', () => { now = from(G.P); });
  Hook.on('dropItem', it => {
    if (!ok(it) || it.dd || typeof DreamDepth === 'undefined' || !DreamDepth.on() || DreamDepth.v < 100) return;
    if (DreamDepth.waking || Math.random() < CHANCE) roll(it);
  });
  Hook.on('treeStats', (S, P) => {
    if (typeof DreamDepth === 'undefined' || !DreamDepth.on() || P !== G.P) return;
    const o = from(P), b = Math.floor(DreamDepth.v / 10); if (!b) return;
    if (o.da_deep) addStat(S, 'dmg_inc', o.da_deep * b);
    if (o.da_drift) addStat(S, 'move_inc', o.da_drift * b);
  });
  Hook.on('enterMap', () => { if (G.P && scales()) onBuildChanged(); });   // 換地圖夢深歸零，越深越強的加成跟著拿掉
  Hook.on('kill', m => {
    if (!now.da_murmur || !m || typeof DreamDepth === 'undefined' || !DreamDepth.on() || DreamDepth.v < 100) return;
    if (Math.random() * 100 < now.da_murmur) dropLoot(m.x, m.y, { cur: randomCurrency() });
  });
  ITEM_TIP_EXTRA.push(it => {
    if (!it || !it.dd || !BY[it.dd.id]) return '';
    const a = BY[it.dd.id];
    return `<div class="tip-sep"></div><div class="tip-mod" style="color:${COLOR}">◇ 夢深・${a.name}：${a.text(it.dd.v)}</div><div class="tip-mod" style="font-size:11px;color:#7f8fb8">只有夢深滿了才帶得出來；醒神會把它洗掉</div>`;
  });
  return { LIST, BY, roll, val, scales, from, ok, get now() { return now; } };
})();
