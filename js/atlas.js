// =============================================================
//  v2.11 終局天賦盤（按 N，或功能選單「終局盤」）— 只影響深層夢境（第 11 夜起）
//  讓玩家自己決定「我的地圖多出現什麼」：怪海路線（範圍流派擅長）、打王路線（單體流派擅長）、通用
//
//  點數怎麼來（一個角色最多 48 點，節點全點滿要 46 點；隨時可以免費重置）：
//   ・第一次打倒第 11～40 夜的看守者：每一夜 1 點（30 點）
//   ・夢潮裂隙單次擊殺 40／80／120 隻：各 1 點
//   ・獻祭圈累計完成 1／5／15 次：各 1 點
//   ・迷霧撐到第 3／5／7 層：各 1 點
//   ・v2.17 傳奇收藏冊每集滿一類：1 點（9 類，分類在 uniqstash.js 的 UNIQ_COLS）
//
//  v2.17 上方三張大卡「怪海／打王／尋寶」：點一下就把目前所有點數照那個方向重新配好（ATLAS_PRESETS 的順序：前面的先點滿）
//    盤面的節點彼此沒有連線，所以照順序點就好；想細調的人照常左鍵加、右鍵退。節點說明是白話（text）
//
//  節點（每點的效果寫在 ATLAS_NODES 的 per／text）：
//   怪海：裂隙機率、裂隙時間、蟲群機率、怪群數量、迷霧機率、迷霧起始時間
//   打王：看守者強化（更耐打、多掉寶）、雙看守者、精英怪數量、精髓水晶、獻祭圈機率、獻祭圈多黃怪
//   通用：寶箱、掉落數量、掉落稀有度
//
//  資料：G.P.atlas = { pts: { 節點: 幾點 }, got: { 來源代號: true }, rites: 獻祭完成次數 }
//  別的檔案用 atlasVal('節點') 拿「目前加了多少」（沒點＝0；不在深層夢境也＝0）
// =============================================================
const ATLAS_NODES = [
  { id: 'mech_tide', col: 0, name: '潮汐共鳴', max: 3, per: 15, text: v => `夢潮裂隙（一波比一波多的怪潮）出現機率 +${v}%` },
  { id: 'tide_len', col: 0, name: '漫長的潮', max: 2, per: 4, text: v => `夢潮裂隙多撐 ${v} 秒（撐越久、殺越多）` },
  { id: 'swarm', col: 0, name: '蟲巢', max: 3, per: 10, text: v => `每個房間有 ${v}% 機率多一大群蟲（很多隻好殺的小怪）` },
  { id: 'pack', col: 0, name: '擁擠的夢', max: 3, per: 8, text: v => `每一群怪多 ${v}%` },
  { id: 'mech_mist', col: 0, name: '霧季', max: 3, per: 15, text: v => `迷霧（越走越深、越來越難）出現機率 +${v}%` },
  { id: 'mist_time', col: 0, name: '深呼吸', max: 2, per: 2, text: v => `迷霧裡一開始多 ${v} 秒可以待` },
  { id: 'boss_life', col: 1, name: '夢魘之主', max: 3, per: 40, text: v => `看守者更耐打（生命 +${v}%），倒下時多掉一批寶物（每點多 3 件，保底 1 件黃裝）` },
  { id: 'boss_twin', col: 1, name: '成雙的惡夢', max: 3, per: 15, text: v => `最後一區有 ${v}% 機率多來一隻別的看守者（牠也會掉一批寶物）` },
  { id: 'elite', col: 1, name: '菁英集結', max: 3, per: 10, text: v => `藍色、黃色精英怪變多 ${v}%` },
  { id: 'essence', col: 1, name: '封印之地', max: 3, per: 12, text: v => `每一區有 ${v}% 機率多一顆封著黃色精英的水晶（打碎必掉寶）` },
  { id: 'mech_rite', col: 1, name: '血祭傳統', max: 3, per: 15, text: v => `獻祭圈（站進去連打三輪怪）出現機率 +${v}%` },
  { id: 'rite_rare', col: 1, name: '貪婪的祭壇', max: 2, per: 1, text: v => `獻祭圈最後一輪多 ${v} 隻黃色精英` },
  { id: 'chest', col: 2, name: '遺落的寶藏', max: 3, per: 12, text: v => `每一區有 ${v}% 機率多一個寶箱` },
  { id: 'qty', col: 2, name: '豐饒', max: 5, per: 4, text: v => `掉的東西多 ${v}%` },
  { id: 'rar', col: 2, name: '鍍金', max: 5, per: 4, text: v => `掉到黃裝、傳奇的機率 +${v}%` },
];
const ATLAS_COLS = [['怪海', '怪多、要跑、要清得快', '#7ad8ff'], ['打王', '單隻更硬、獎勵集中', '#ff8a70'], ['通用', '', '#ffd36a']];
// v2.17 三張大卡：一鍵把點數照方向配好（照順序，前面的先點滿）
const ATLAS_PRESETS = {
  sea: { name: '怪海', sub: '怪很多、一路清過去（範圍、召喚流派）', color: '#7ad8ff', order: ['pack', 'swarm', 'mech_tide', 'tide_len', 'qty', 'mech_mist', 'mist_time', 'elite', 'rar', 'chest', 'essence', 'mech_rite', 'rite_rare', 'boss_life', 'boss_twin'] },
  boss: { name: '打王', sub: '看守者更多更硬、掉更多（單體爆發流派）', color: '#ff8a70', order: ['boss_life', 'boss_twin', 'elite', 'essence', 'mech_rite', 'rite_rare', 'rar', 'qty', 'chest', 'pack', 'swarm', 'mech_tide', 'tide_len', 'mech_mist', 'mist_time'] },
  loot: { name: '尋寶', sub: '不管打什麼，掉的東西更多更好', color: '#ffd36a', order: ['qty', 'rar', 'chest', 'essence', 'boss_life', 'elite', 'mech_rite', 'rite_rare', 'pack', 'boss_twin', 'swarm', 'mech_tide', 'tide_len', 'mech_mist', 'mist_time'] },
};
function atlasPreset(P, kind) {
  const A = atlasOf(P), pr = ATLAS_PRESETS[kind]; if (!pr) return;
  A.pts = {}; let free = atlasTotal(P);
  for (const id of pr.order) { const n = ATLAS_NODES.find(x => x.id === id); if (!n || free <= 0) continue; const k = Math.min(n.max, free); A.pts[id] = k; free -= k; }
  A.preset = kind;
}
const atlasMaxPts = () => 30 + 9 + (typeof UNIQ_COLS !== 'undefined' ? UNIQ_COLS.length : 0);
const ATLAS_MILE = { tide: [40, 80, 120], rite: [1, 5, 15], mist: [3, 5, 7] };
const ATLAS_NIGHTS = [11, 40];
const atlasOf = P => (P.atlas = P.atlas || { pts: {}, got: {}, rites: 0 });
const atlasTotal = P => Object.keys(atlasOf(P).got).length;
const atlasUsed = P => Object.values(atlasOf(P).pts).reduce((a, b) => a + b, 0);
function atlasVal(id) {
  const P = G.P, w = G.world; if (!P || !P.atlas || !w || w.kind === 'town' || (w.tier || 0) < DEEP_TIER) return 0;
  const n = ATLAS_NODES.find(x => x.id === id); return n ? (P.atlas.pts[id] || 0) * n.per : 0;
}
function atlasGain(key, why) {
  const A = atlasOf(G.P); if (A.got[key]) return;
  A.got[key] = true; UI.banner('終局盤 +1 點', why, '#ffe9a0'); Sfx.play('levelup'); saveGame(); AtlasUI.badge();
}
// 里程碑：kind＝tide（單次擊殺數）／rite（完成一次）／mist（層數）
function atlasMilestone(kind, v) {
  const A = atlasOf(G.P); if (kind === 'rite') v = (A.rites = (A.rites || 0) + 1);
  const name = { tide: n => `夢潮裂隙單次擊殺 ${n} 隻`, rite: n => `獻祭圈累計完成 ${n} 次`, mist: n => `迷霧撐到第 ${n} 層` }[kind];
  for (const n of ATLAS_MILE[kind]) if (v >= n) atlasGain(kind + n, name(n));
}
Hook.on('start', P => { atlasOf(P); AtlasUI.badge(); });
Hook.on('kill', m => {
  const w = G.world; if (!m.boss || !w || w.arena || m.twin) return;
  if (w.tier >= ATLAS_NIGHTS[0] && w.tier <= ATLAS_NIGHTS[1]) atlasGain('n' + w.tier, `第一次打倒第 ${w.tier} 夜的看守者`);
});
// —— 效果 ——
// 掉落數量、稀有度：加在這張圖的詞綴上（同一夜換區會沿用，所以只加一次）
Hook.on('stage', w => {
  if (!w || w.arena || (w.tier || 0) < DEEP_TIER || !w.mm || w.mm._atlas) return;
  w.mm = Object.assign({}, w.mm, { q: (w.mm.q || 0) + atlasVal('qty'), r: (w.mm.r || 0) + atlasVal('rar'), _atlas: true });
});
// 多的寶箱、精髓水晶
Hook.on('stage', w => {
  if (!w || w.arena || !w.stage || !w.events || (w.tier || 0) < DEEP_TIER) return;
  for (const [node, kind] of [['chest', 'chest'], ['essence', 'essence']]) {
    if (Math.random() * 100 >= atlasVal(node)) continue;
    for (const r of (w.others || []).slice().sort(() => Math.random() - 0.5)) {
      const x = rint(r.x + 2, r.x + r.w - 3) * TS + 16, y = rint(r.y + 2, r.y + r.h - 3) * TS + 16;
      if (blockedCircle(x, y, 14) || w.events.some(e => Math.hypot(e.x - x, e.y - y) < 90)) continue;
      const ev = { kind, x, y, done: false }; if (kind === 'essence') ev.mon = pick(w.theme.monsters); w.events.push(ev); break;
    }
  }
});
// 看守者強化、雙看守者（只在有看守者的那一區）
Hook.on('stage', w => {
  if (!w || w.arena || (w.tier || 0) < DEEP_TIER) return;
  const b = G.mons.find(m => m.boss && !m.dead); if (!b) return;
  const k = atlasVal('boss_life'); if (k) { b.maxLife = Math.round(b.maxLife * (1 + k / 100)); b.life = b.maxLife; b.atlasRank = k / 40; }
  if (Math.random() * 100 < atlasVal('boss_twin')) {
    const ids = Object.keys(BOSSES).filter(id => id !== b.boss && THEMES.some(t => t.boss === id)), id = pick(ids);
    const p = randomFloorNear(b.x + 90, b.y + 40, 60), t = makeBoss(id, p.x, p.y, b.mlvl);
    t.twin = true; t.maxLife = Math.round(t.maxLife * 0.7); t.life = t.maxLife; G.mons.push(t);
  }
});
Hook.on('kill', m => {
  if (m.atlasRank) mapLoot(m.x, m.y, { n: 3 * m.atlasRank, bonus: 6, rare: 1, ilvl: m.mlvl });
  if (m.twin) mapLoot(m.x, m.y, { n: 5, bonus: 6, rare: 1, ilvl: m.mlvl });
});
// —— 介面 ——
const AtlasUI = {
  build() {
    if (document.getElementById('atlas')) return;
    const d = document.createElement('div'); d.id = 'atlas'; d.className = 'panel';
    d.innerHTML = `<div class="ph">終局盤${byCtl('（N）', '')}　<span class="thint">只影響深層夢境（第 11 夜起）・隨時可以免費重置</span><span class="x">✕</span></div><div id="atlasBody"></div>`;
    document.body.appendChild(d); d.querySelector('.x').onclick = () => UI.toggle('atlas', false);
    const st = document.createElement('style');
    st.textContent = `#atlas { left:50%; top:50%; transform:translate(-50%,-50%); width:min(900px,96vw); max-height:92vh; overflow:auto; z-index:30; }
    #atlasBody { padding:10px 14px 14px; background:rgba(14,10,16,.93); } .atl-top { display:flex; align-items:center; gap:14px; margin-bottom:10px; font-size:15px; } .atl-top b { color:#ffe9a0; font-size:18px; }
    .atl-cols { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; } @media (max-width:700px) { .atl-cols { grid-template-columns:1fr; } }
    .atl-col h4 { margin:0 0 6px; font-size:16px; } .atl-col h4 small { color:#9a8f80; font-weight:normal; font-size:12px; margin-left:6px; }
    .atl-n { border:1px solid #3a3040; border-radius:5px; padding:7px 9px; margin-bottom:7px; cursor:pointer; background:rgba(255,255,255,.02); user-select:none; }
    .atl-n:hover { border-color:#c8a050; } .atl-n.has { border-color:#8a6a30; background:rgba(255,211,106,.07); } .atl-n.full { border-color:#ffd36a; }
    .atl-n .nm { font-size:14px; color:#f2e2b8; display:flex; justify-content:space-between; } .atl-n .pip { letter-spacing:2px; color:#ffd36a; }
    .atl-n .ds { font-size:12px; color:#b8ac98; margin-top:3px; line-height:1.45; } .atl-n .ds i { color:#9fff9f; font-style:normal; }
    .atl-src { margin-top:10px; font-size:12px; color:#9a8f80; line-height:1.7; } .atl-src span { margin-right:12px; white-space:nowrap; } .atl-src .ok { color:#9fff9f; }
    .atl-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:12px; } @media (max-width:700px) { .atl-cards { grid-template-columns:1fr; } }
    .atl-card { border:2px solid #3a3040; border-radius:8px; padding:10px 12px; cursor:pointer; background:rgba(255,255,255,.03); user-select:none; display:flex; flex-direction:column; gap:3px; }
    .atl-card:hover { border-color:var(--c); } .atl-card.on { border-color:var(--c); background:rgba(255,255,255,.07); box-shadow:0 0 10px color-mix(in srgb, var(--c) 40%, transparent); }
    .atl-card b { color:var(--c); font-size:20px; } .atl-card span { font-size:12px; color:#c8bca8; } .atl-card i { font-style:normal; font-size:11px; color:#8a8070; }`;
    document.head.appendChild(st);
  },
  render() {
    const P = G.P; if (!P) return; this.build();
    const A = atlasOf(P), total = atlasTotal(P), free = total - atlasUsed(P);
    let h = `<div class="atl-top"><span>可用點數 <b>${free}</b>　／　已獲得 ${total}（最多 ${atlasMaxPts()}，全點滿要 46）</span><button id="atlReset">全部重置</button><span class="thint">${byCtl('左鍵加點・右鍵退點', '點節點加點・想退點按「全部重置」')}</span></div>`;
    h += `<div class="atl-cards">${Object.entries(ATLAS_PRESETS).map(([k, p]) => `<div class="atl-card${A.preset === k ? ' on' : ''}" data-pre="${k}" style="--c:${p.color}"><b>${p.name}</b><span>${p.sub}</span><i>${A.preset === k ? '目前用這個' : '點一下自動配點'}</i></div>`).join('')}</div><div class="atl-cols">`;
    ATLAS_COLS.forEach(([name, sub, color], c) => {
      h += `<div class="atl-col"><h4 style="color:${color}">${name}<small>${sub}</small></h4>`;
      for (const n of ATLAS_NODES.filter(x => x.col === c)) {
        const r = A.pts[n.id] || 0;
        h += `<div class="atl-n${r ? ' has' : ''}${r >= n.max ? ' full' : ''}" data-n="${n.id}"><div class="nm"><span>${n.name}</span><span class="pip">${'◆'.repeat(r)}${'◇'.repeat(n.max - r)}</span></div><div class="ds">${r ? `<i>目前：${n.text(r * n.per)}</i><br>` : ''}${r < n.max ? `下一點：${n.text((r + 1) * n.per)}` : '已點滿'}</div></div>`;
      }
      h += '</div>';
    });
    const nights = Object.keys(A.got).filter(k => k[0] === 'n').length;
    const mile = (kind, label) => ATLAS_MILE[kind].map(n => `<span class="${A.got[kind + n] ? 'ok' : ''}">${A.got[kind + n] ? '✔' : '○'} ${label(n)}</span>`).join('');
    h += `</div><div class="atl-src"><b>點數來源：</b><span class="${nights >= 30 ? 'ok' : ''}">第一次打倒第 11～40 夜的看守者（${nights} / 30）</span><br>${mile('tide', n => `夢潮裂隙單次殺 ${n} 隻`)}<br>${mile('rite', n => `獻祭圈完成 ${n} 次`)}（目前 ${A.rites || 0} 次）<br>${mile('mist', n => `迷霧第 ${n} 層`)}${typeof UNIQ_COLS !== 'undefined' ? `<br><span class="${UNIQ_COLS.every(c => A.got['col_' + c.id]) ? 'ok' : ''}">傳奇收藏冊集滿一類（${UNIQ_COLS.filter(c => A.got['col_' + c.id]).length} / ${UNIQ_COLS.length}，在倉庫的「傳奇」頁看進度）</span>` : ''}</div>`;
    const body = document.getElementById('atlasBody'); body.innerHTML = h;
    body.querySelectorAll('.atl-n').forEach(el => {
      const n = ATLAS_NODES.find(x => x.id === el.dataset.n);
      el.onclick = () => { const r = A.pts[n.id] || 0; if (r >= n.max) return; if (atlasTotal(P) - atlasUsed(P) <= 0) return UI.msg('沒有可用的終局盤點數', '#ff9a9a'); A.pts[n.id] = r + 1; A.preset = null; Sfx.play('click'); saveGame(); this.render(); this.badge(); };
      el.oncontextmenu = e => { e.preventDefault(); const r = A.pts[n.id] || 0; if (!r) return; A.pts[n.id] = r - 1; A.preset = null; Sfx.play('click'); saveGame(); this.render(); this.badge(); };
    });
    document.getElementById('atlReset').onclick = () => { A.pts = {}; A.preset = null; saveGame(); this.render(); this.badge(); };
    body.querySelectorAll('.atl-card').forEach(el => el.onclick = () => { atlasPreset(P, el.dataset.pre); Sfx.play('click'); saveGame(); this.render(); this.badge(); UI.msg(`終局盤照「${ATLAS_PRESETS[el.dataset.pre].name}」配好了`, '#ffe9a0'); });
  },
  badge() {   // 功能選單上的紅點：有沒用的點數
    const b = document.querySelector('.mbtn[data-m="atlas"] .mbadge'); if (!b || !G.P) return;
    const free = atlasTotal(G.P) - atlasUsed(G.P); b.textContent = free > 0 ? free : ''; b.style.display = free > 0 ? '' : 'none';
  },
};
// 掛進功能選單、按鍵設定、N 鍵
UI.MENU.splice(UI.MENU.findIndex(m => m.id === 'journal'), 0, { id: 'atlas', name: '終局盤', key: 'N', desc: '決定深層夢境多出現什麼：怪海、打王、寶箱……（第 11 夜起有用）', hide: P => !P || (P.maxTier < DEEP_TIER && !atlasTotal(P)) });   // v2.18.2 還沒解鎖（沒到深層夢境、也沒有點數）就不出現在選單
Hook.on('enterMap', () => { const on = G.P && !UI.MENU.find(m => m.id === 'atlas').hide(G.P); if (on !== UI._atlasOn) { UI._atlasOn = on; UI.buildMenuBar(); } });
UI.ICONS.atlas = '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>';
KEY_ACTIONS.push({ id: 'atlas', name: '終局盤', def: 'KeyN', grp: '介面' });
AtlasUI.build();
const _toggleAtlas = UI.toggle.bind(UI);   // 包 UI.toggle：打開終局盤時重畫內容（UI.toggle 沒有登記點）
UI.toggle = function (name, force) { const r = _toggleAtlas(name, force); if (name === 'atlas' && this.open.atlas) AtlasUI.render(); return r; };
window.addEventListener('keydown', e => {
  if (e.repeat || G.state !== 'play' || !G.P || UI.storyOpen || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
  if (remapKey(e.code) === 'KeyN') UI.toggle('atlas');
});
