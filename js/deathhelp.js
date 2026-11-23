// =============================================================
//  v2.18.2 死亡面板：寫出死因＋一句小提示；巢穴裡倒下可以回到首領之門前
//  玩家看到：
//   ・死亡面板多一行「被『腐骨之王』的『重砸』打倒，最後一下 153 傷害」
//     精英會寫出名字和種類（「腐爛之牙（屍蟲・稀有精英）」）；沒有招式名就寫「普通攻擊」「投射物」「持續傷害」
//   ・再加一句依死因的小提示：首領／精英的大招 → 看到紅色圈圈時翻滾躲開；持續傷害 → 被點燃／中毒時記得喝藥；
//     身邊 160 內有 5 隻以上的怪 → 怪很多時先往後退；投射物 → 橫著走開或躲到障礙物後面；其他 → 生命剩一半就喝藥
//   ・在看守者巢穴裡倒下（巢穴裡沒開傳送門）：這一夜的進度留著，死亡面板多一顆「回到首領之門前」；
//     按「回到城鎮」也行，營地的藍色傳送門會通到首領之門前
//  資料：G._lastHit = { who, how, dmg, dot, boss, tele, t }（只在記憶體，不存檔）；G.gateBack＝進首領之門時記下的那一區（bossroom.js enterLair 寫入、
//        game.js playerDie 讀取後清掉）；進新地圖、打倒看守者時清掉
//  接點：core-end.js 的 damagePlayer（DeathHelp.note）、game.js 異常狀態致死（DeathHelp.ail）、elites.js 反射；ui.js showDeath 呼叫 DeathHelp.panel
//  給其他組：DeathHelp.cause() → { text, hint }（第一百三十八本、日誌可以用）
// =============================================================
const MOVE_NAME = {
  summon: '召喚骷髏', slam: '重砸', swipe: '橫掃', teleport: '瞬移', ring: '火球環', pool: '燃燒的地面', barrage: '連發火球',
  charge: '衝鋒', nova: '冰霜新星', shards: '冰刺', bite: '撕咬', shadows: '影子', wsig: '第二階段的新招',
  proj: '投射物', zone: '地上的傷害區域', reflect: '反射傷害',
};
const WSIG_NAME = { boneking: '跳砸', witch: '火海', beast: '三道衝擊線', b_cave: '毒網', b_grass: '震地怒吼', b_beach: '大浪', b_swamp: '毒沼', b_forest: '樹根牢籠', b_desert: '雷暴', b_void: '凝視' };
// 有預警圈、預警線的招式（看得到就躲得掉）
const TELE_MOVES = new Set(['slam', 'swipe', 'pool', 'charge', 'nova', 'wsig', '大招', '跳砸', '衝撞', '鑽地突襲']);
const DeathHelp = {
  who(m) {
    if (!m) return null;
    if (m.boss) return m.name || (BOSSES[m.boss] && BOSSES[m.boss].name) || '看守者';
    const base = m.def && m.def.name;
    if (m.chapBoss) return `${m.name}（區域首領）`;
    if (m.guardian) return `${m.name}（${base ? base + '・' : ''}守護者）`;
    if (m.rarity === 'rare') return `${m.name}（${base ? base + '・' : ''}稀有精英）`;
    if (m.rarity === 'magic') return `${m.name}（魔法精英）`;
    return m.name || base || '怪物';
  },
  how(o, src) {
    if (o.dot) return '持續傷害';
    const h = o.how;
    if (h === 'wsig' && src && WSIG_NAME[src.boss]) return WSIG_NAME[src.boss];
    if (h && MOVE_NAME[h]) return MOVE_NAME[h];
    if (h && /[一-鿿]/.test(h)) return h;
    return src ? '普通攻擊' : '機關';
  },
  // 每次真的掉血（core-end.js）：記下最後一下
  note(lost, o) {
    const src = o.src, w = G.world, who = this.who(src) || (w && w.bossRoom ? '巢穴的機關' : '夢裡的陷阱');
    const L = G._lastHit, dot = !!o.dot;
    if (dot && L && L.dot && L.who === who && G.time - L.t < 1.5) { L.dmg += lost; L.t = G.time; return; }   // 持續傷害：同一個來源的累加起來
    G._lastHit = { who, how: this.how(o, src), dmg: lost, dot, boss: (src && src.boss) || null, big: !!(src && (src.boss || src.guardian || src.chapBoss)), tele: TELE_MOVES.has(o.how) || (!src && !dot), t: G.time };   // 沒有來源的（巢穴機關、爆炸）都有預警圈
  },
  // 身上的點燃／流血／中毒把人燒死（game.js tickPlayerAilments）
  ail(a) {
    const k = [a.ign && '點燃', a.bleed && '流血', a.poison && a.poison.length && '中毒'].filter(Boolean).join('、') || '異常狀態';
    const L = G._lastHit;
    G._lastHit = { who: L && G.time - L.t < 6 ? L.who : '身上的異常狀態', how: `持續傷害（${k}）`, dmg: L ? L.dmg : 0, dot: true, boss: L && L.boss, big: L && L.big, tele: false, ail: true, t: G.time };
  },
  cause() {
    const L = G._lastHit, pl = G.pl;
    if (!L || G.time - L.t > 8) return { text: '', hint: '生命剩一半就喝藥（藥劑打怪會自己充回來）。' };
    const crowd = pl ? G.mons.filter(m => !m.dead && !m.hidden && Math.hypot(m.x - pl.x, m.y - pl.y) < 160).length : 0;
    const text = L.ail ? `被『${L.who}』留下的${L.how}打倒`
      : L.dot ? `被『${L.who}』的『${L.how}』打倒（站在裡面一直掉血）`
      : `被『${L.who}』的『${L.how}』打倒，最後一下 ${Math.max(1, Math.round(L.dmg))} 傷害`;
    const hint = L.tele ? '看到紅色圈圈（或地上的預警線）時翻滾躲開，等它炸完再回來打。'
      : L.ail || L.dot ? '被點燃／中毒時記得喝藥，也別站在地上會冒煙、發光的地方。'
      : crowd >= 5 ? '怪很多時先往後退，邊退邊打，一次只跟幾隻打。'
      : L.how === '投射物' ? '遠處飛來的子彈可以橫著走開，或躲到石頭、柱子後面。'
      : L.big ? '首領打人很痛：生命剩一半就喝藥，拉開距離再打。'
      : '生命剩一半就喝藥（藥劑打怪會自己充回來）。';
    return { text, hint };
  },
  panel(keep) {
    const box = document.getElementById('death'), info = document.getElementById('deathInfo'); if (!box || !info) return;
    let c = document.getElementById('deathCause');
    if (!c) { c = document.createElement('div'); c.id = 'deathCause'; c.style.cssText = 'margin:0 0 8px;line-height:1.6'; c.innerHTML = '<div class="dc-t" style="color:#ffb0a0"></div><div class="dc-h" style="color:#ffe6a0;font-size:.92em"></div>'; info.parentNode.insertBefore(c, info); }
    // 倒下的那一下是在 damagePlayer 裡面觸發的，DeathHelp.note 會在它之後才記下來：等這一輪跑完再填字
    const fill = () => { const { text, hint } = this.cause(); c.querySelector('.dc-t').textContent = text; c.querySelector('.dc-h').textContent = hint ? '小提示：' + hint : ''; };
    fill(); Promise.resolve().then(fill);
    let b = document.getElementById('deathGate');
    if (!b) { b = document.createElement('button'); b.id = 'deathGate'; b.textContent = '回到首領之門前'; b.style.marginLeft = '10px';
      b.onclick = () => { box.classList.remove('show'); goTown(true); if (G.savedMap) resumeMap(); };
      const home = box.querySelector('button:not(#deathGate)'); (home ? home.parentNode : box).insertBefore(b, home ? home.nextSibling : null); }
    b.style.display = (keep === 'gate' || keep === 'zone') && G.savedMap ? '' : 'none'; b.textContent = keep === 'zone' ? '回到這一區的入口' : '回到首領之門前';   // v2.20.2 區的回來點
  },
};
Hook.on('enterMap', () => { G.gateBack = null; G._lastHit = null; });
Hook.on('kill', m => { if (m.boss && G.world && G.world.bossRoom && !G.mons.some(x => x.boss && !x.dead && x !== m)) G.gateBack = null; });
