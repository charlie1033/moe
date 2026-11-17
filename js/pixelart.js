// =============================================================
//  像素美術 v1.9：0x72 DungeonTileset II（CC0）
//  原則：素材包裡「真的是同一種東西」才換，其他一律保留原本手繪
//  ・只用整數倍放大，不再硬縮成 0.75 倍（那樣像素會粗細不一）
//  ・不再把素材整張重上色；只有冰凍、場景變色時輕輕染一點
//  ・石磚地板與牆只用在地下城類場景（墓穴、熔岩洞、洞穴、虛空神殿），戶外場景保留原本的畫法
//  ・素材還沒載入好之前，會先用舊的程式畫圖（不會出錯）
// =============================================================
const PIX = { img: null, ready: false, cache: {}, box: {} };
(function loadAtlas() {
  const im = new Image();
  im.onload = () => {
    PIX.img = im; PIX.ready = true;
    for (const k in SPRITE_CACHE) delete SPRITE_CACHE[k];
    for (const k in FLOOR_CACHE) delete FLOOR_CACHE[k];
    if (typeof UI !== 'undefined' && UI.buildMenu && document.getElementById('menu') && document.getElementById('menu').classList.contains('show')) UI.buildMenu();
  };
  im.src = ATLAS_0X72_SRC;
})();

// 只有對得上的才換（名字 → 素材包的生物）；不在這張表上的，全部用原本手繪
const PIX_NAMED = {
  // 職業（武士素材包裡沒有對得上的，保留手繪）
  warrior: 'knight_m', ranger: 'elf_m', druid: 'elf_f', mage: 'wizzard_m', summoner: 'wizzard_f',
  // 營地
  merchant: 'dwarf_f', chest: '#chest_full_open_anim_f0',
  // 骷髏類、食屍鬼：素材包的造型是大頭小身體，跟其他手繪骷髏放一起不協調，保留手繪
  // 殭屍類
  zombie: 'zombie', frozencorpse: 'ice_zombie',
  // 其他真的是同一種的
  imp: 'imp', goblin: 'goblin', bogbeast: 'swampy', chaosmage: 'necromancer',
};
function pixFor(name) { return PIX_NAMED[name] ? { base: PIX_NAMED[name] } : null; }
// 一個生物的動畫影格名稱：有 idle/run 就分開，只有 anim 就共用
function pixFrames(base) {
  const T = ATLAS_0X72_TILES;
  if (base[0] === '#') return { idle: [base.slice(1)], run: [base.slice(1)] };
  const get = pre => [0, 1, 2, 3].map(i => T[`${pre}_f${i}`] ? `${pre}_f${i}` : (i === 0 && T[`${pre}_f10`] ? `${pre}_f10` : null)).filter(Boolean);
  let idle = get(`${base}_idle_anim`), run = get(`${base}_run_anim`);
  if (!idle.length) idle = get(`${base}_anim`);
  if (!run.length) run = idle;
  return { idle, run };
}
// 所有影格合起來「真正有畫東西」的範圍：切掉上方空白，腳底對齊不跳動
function pixBox(base, frames) {
  if (PIX.box[base]) return PIX.box[base];
  let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
  const c = document.createElement('canvas'); const g = c.getContext('2d', { willReadFrequently: true });
  for (const t of frames) {
    const [sx, sy, w, h] = ATLAS_0X72_TILES[t]; c.width = w; c.height = h; g.clearRect(0, 0, w, h);
    g.drawImage(PIX.img, sx, sy, w, h, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const [, , w, h] = ATLAS_0X72_TILES[frames[0]];
  // 左右保持置中（不然翻面時會偏），上方切掉空白，下方切到腳底
  const pad = Math.min(x0, w - 1 - x1);
  return (PIX.box[base] = x1 < 0 ? [0, 0, w, h] : [pad, y0, w - pad * 2, y1 - y0 + 1]);
}
// 從素材圖切出一格，整數倍放大、（輕輕）染色、翻面
function pixCut(tile, box, s, color, tintA, flash, flip) {
  const [sx, sy] = ATLAS_0X72_TILES[tile]; const [bx, by, bw, bh] = box;
  const c = document.createElement('canvas'); c.width = bw * s; c.height = bh * s;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
  g.drawImage(PIX.img, sx + bx, sy + by, bw, bh, 0, 0, c.width, c.height);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (color && tintA) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = tintA; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); }
  if (flash) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.85; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); }
  return c;
}
// —— v2.1 地下城大全（Dungeon Crawl Stone Soup，CC0）的怪物：只放真的對得上的 54 種，不會動 ——
//  原圖 32×32、畫得比較細：一般怪用原尺寸（跟手繪放大兩倍差不多大），精英（scale 3）放大兩倍
const DCSS = { img: null, ready: false, box: {} };
(function loadDcss() {
  if (typeof ATLAS_DCSS_SRC === 'undefined') return;
  const im = new Image();
  im.onload = () => { DCSS.img = im; DCSS.ready = true; for (const k in SPRITE_CACHE) delete SPRITE_CACHE[k]; };
  im.src = ATLAS_DCSS_SRC;
})();
// 原圖臉朝左的（遊戲裡「r」要朝右，所以這些要翻過來）
const DCSS_BOSS = new Set(["boneking", "witch", "beast", "b_cave", "b_grass", "b_beach", "b_swamp", "b_forest", "b_desert", "b_void"]);
const DCSS_FACE_LEFT = new Set(['hellhound', 'icebear', 'wolf', 'cavebear', 'bear', 'crystalsnail', 'frog', 'scarab', 'coalbeetle', 'seasnake', 'lavaserpent', 'bonehound', 'wasp', 'beast', 'b_grass']);
// 要換圖或加新怪：改 assets\dcss\dcss_map.txt（怪物代號=大全裡的檔名），再用 assets\dcss\build_dcss.ps1 重新產生 js\atlasdcss.js
function dcssBox(name) {   // 上下切掉空白（腳底對齊），左右保持置中
  if (DCSS.box[name]) return DCSS.box[name];
  const [sx, sy, w, h] = ATLAS_DCSS_TILES[name];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(DCSS.img, sx, sy, w, h, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = x1 < 0 ? 0 : Math.min(x0, w - 1 - x1);
  return (DCSS.box[name] = x1 < 0 ? [0, 0, w, h] : [pad, y0, w - pad * 2, y1 - y0 + 1]);
}
function dcssSprite(name, scale, tint, flash) {
  const key = `dcss|${name}|${scale}|${tint ? JSON.stringify(tint) : ''}|${flash}`;
  if (SPRITE_CACHE[key]) return SPRITE_CACHE[key];
  const [sx, sy] = ATLAS_DCSS_TILES[name], [bx, by, bw, bh] = dcssBox(name);
  const s = DCSS_BOSS.has(name) ? 3 : scale >= 3 ? 2 : 1;   // 只用整數倍：一般 1 倍、精英與大型怪 2 倍、首領 3 倍
  const tc = tint ? (tint.A || tint.R || tint.B || tint.P || Object.values(tint)[0]) : null;
  const cut = flip => {
    const c = document.createElement('canvas'); c.width = bw * s; c.height = bh * s;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
    g.drawImage(DCSS.img, sx + bx, sy + by, bw, bh, 0, 0, c.width, c.height);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (tc) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.3; g.fillStyle = tc; g.fillRect(0, 0, c.width, c.height); }
    if (flash) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.85; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
    return c;
  };
  const left = DCSS_FACE_LEFT.has(name);
  const r = cut(left), l = cut(!left);
  return (SPRITE_CACHE[key] = { r, l, w: r.width, h: r.height });
}

// —— v2.2 野生動物包（CC0）：野豬、鹿角獸，有站立／跑步動畫，原圖臉朝右 ——
const WILD = { imgs: {}, box: {} };
(function loadWild() {
  if (typeof WILD_SRC === 'undefined') return;
  for (const nm in WILD_SRC) for (const k of ['idle', 'run']) {
    const im = new Image();
    im.onload = () => { (WILD.imgs[nm] = WILD.imgs[nm] || {})[k] = im; for (const c in SPRITE_CACHE) delete SPRITE_CACHE[c]; };
    im.src = WILD_SRC[nm][k][0];
  }
})();
const wildReady = name => WILD.imgs[name] && WILD.imgs[name].idle && WILD.imgs[name].run;
function wildSprite(name, scale, tint, flash) {
  const key = `wild|${name}|${scale}|${tint ? JSON.stringify(tint) : ''}|${flash}`;
  if (SPRITE_CACHE[key]) return SPRITE_CACHE[key];
  const s = scale >= 3 ? 2 : 1, fw = WILD_SRC[name].idle[1], im = WILD.imgs[name];
  // 所有影格共用同一個裁切範圍，動起來腳底才不會跳
  if (!WILD.box[name]) {
    let x0 = fw, y0 = 999, x1 = -1, y1 = -1;
    for (const k of ['idle', 'run']) {
      const c = document.createElement('canvas'); c.width = im[k].width; c.height = im[k].height; const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im[k], 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 10) { const fx = x % fw; if (fx < x0) x0 = fx; if (fx > x1) x1 = fx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    WILD.box[name] = [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
  }
  const [bx, by, bw, bh] = WILD.box[name];
  const tc = tint ? (tint.A || tint.R || tint.B || tint.P || Object.values(tint)[0]) : null;
  const cut = (src, i, flip) => {
    const c = document.createElement('canvas'); c.width = bw * s; c.height = bh * s;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
    g.drawImage(src, i * fw + bx, by, bw, bh, 0, 0, c.width, c.height);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (tc) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.3; g.fillStyle = tc; g.fillRect(0, 0, c.width, c.height); }
    if (flash) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.85; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
    return c;
  };
  const mk = src => Array.from({ length: Math.round(src.width / fw) }, (_, i) => ({ r: cut(src, i, false), l: cut(src, i, true) }));
  const idle = mk(im.idle), run = mk(im.run);
  return (SPRITE_CACHE[key] = { r: idle[0].r, l: idle[0].l, w: idle[0].r.width, h: idle[0].r.height, anim: true, idle, run });
}

// 取代原本的 getSprite：回傳 { r, l, w, h }（第一格）＋ idle／run 動畫
//  優先順序：0x72（有動畫）→ 野生動物包（有動畫）→ 地下城大全 → 原本手繪
const _getSpriteHand = getSprite;
getSprite = function (name, scale = 2, tint = null, flash = false) {
  const m = PIX.ready && pixFor(name);
  if (!m) return wildReady(name) ? wildSprite(name, scale, tint, flash)
    : (DCSS.ready && ATLAS_DCSS_TILES[name]) ? dcssSprite(name, scale, tint, flash) : _getSpriteHand(name, scale, tint, flash);
  const key = `pix|${name}|${scale}|${tint ? JSON.stringify(tint) : ''}|${flash}`;
  if (SPRITE_CACHE[key]) return SPRITE_CACHE[key];
  const fr = pixFrames(m.base);
  if (!fr.idle.length) return _getSpriteHand(name, scale, tint, flash);
  const box = pixBox(m.base, fr.idle.concat(fr.run));
  const s = Math.max(1, Math.round(scale));            // 只用整數倍
  const tc = tint ? (tint.A || tint.R || tint.B || tint.P || Object.values(tint)[0]) : null;
  const mk = list => list.map(t => ({ r: pixCut(t, box, s, tc, 0.3, flash, false), l: pixCut(t, box, s, tc, 0.3, flash, true) }));
  const idle = mk(fr.idle), run = fr.run === fr.idle ? idle : mk(fr.run);
  const res = { r: idle[0].r, l: idle[0].l, w: idle[0].r.width, h: idle[0].r.height, anim: idle.length > 1 || run !== idle, idle, run };
  SPRITE_CACHE[key] = res;
  return res;
};

// —— 地板、牆：只有地下城類場景用素材包的石磚，戶外照舊 ——
const PIX_STONE_THEMES = { bone: 1, fire: 1, cave: 1, void: 1 };
function pixStone(theme) { return PIX.ready && theme && PIX_STONE_THEMES[theme.id]; }
function pixTile(name, s, color, alpha, darken) {
  const key = `${name}|${s}|${color}|${alpha}|${darken}`;
  if (PIX.cache[key]) return PIX.cache[key];
  const [sx, sy, w, h] = ATLAS_0X72_TILES[name];
  const c = document.createElement('canvas'); c.width = w * s; c.height = h * s;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(PIX.img, sx, sy, w, h, 0, 0, c.width, c.height);
  if (color) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); }
  if (darken) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = darken; g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); }
  PIX.cache[key] = c; return c;
}
const _floorHand = getFloorTile;
getFloorTile = function (theme, variant) {
  if (!pixStone(theme)) return _floorHand(theme, variant);
  const key = 'pix_' + theme.id + '_' + variant;
  if (FLOOR_CACHE[key]) return FLOOR_CACHE[key];
  // 大部分用最乾淨的 floor_1，少數幾格帶裂縫，不要滿地花紋
  const t = pixTile(['floor_1', 'floor_1', 'floor_1', 'floor_2', 'floor_1', 'floor_3'][variant % 6], 2, theme.floor[variant % theme.floor.length], 0.35, 0.1);
  FLOOR_CACHE[key] = t; return t;
};
function pixWallFace(theme, x) { return pixTile(x % 7 === 3 ? 'wall_hole_1' : 'wall_mid', 2, theme.wallTop, 0.3, 0.05); }
function pixWallTop(theme) { return pixTile('wall_top_mid', 2, theme.wallTop, 0.3, 0.25); }

// —— 角色手上的武器：用素材包的武器圖，依武器種類和階級換樣子 ——
//  只挑短的（放大兩倍後不會比角色還高）；魔杖素材包沒有對得上的，用原本的畫法
const PIX_WEAPON = {
  sword: ['weapon_rusty_sword', 'weapon_regular_sword', 'weapon_regular_sword', 'weapon_golden_sword', 'weapon_red_gem_sword'],
  axe: ['weapon_axe', 'weapon_axe', 'weapon_waraxe', 'weapon_waraxe', 'weapon_double_axe'],
  katana: ['weapon_machete', 'weapon_machete', 'weapon_machete', 'weapon_machete', 'weapon_machete'],
  dagger: ['weapon_knife', 'weapon_knife', 'weapon_cleaver', 'weapon_cleaver', 'weapon_cleaver'],
  bow: ['weapon_bow', 'weapon_bow', 'weapon_bow_2', 'weapon_bow_2', 'weapon_bow_2'],
  staff: ['weapon_green_magic_staff', 'weapon_green_magic_staff', 'weapon_red_magic_staff', 'weapon_red_magic_staff', 'weapon_red_magic_staff'],
};
function pixWeaponTile(cls, tier) { const l = PIX_WEAPON[cls]; return l ? l[Math.min(l.length - 1, tier || 0)] : null; }
// 目前武器的基底階級（0–4），用來換武器的樣子
function P_weaponTier() { const w = G.P && G.P.equip && G.P.equip.weapon; const b = w && BASE_BY_ID[w.base]; return b ? b.tier || 0 : 0; }
