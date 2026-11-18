// =============================================================
//  v2.7 場景美術（Higgsfield 美術工作階段）：首領登場圖、劇情回憶插圖
//  ・圖在 js\artwork.js 的 ARTWORK.img（boss_<首領id>、scene_<劇情key>）
//  ・只用「包裝」的方式接上遊戲，不改 game.js／story.js
//  ・說明頁關掉「新美術」就不顯示
//  ・載入順序：tutorial.js 之後、touch.js 之前
// =============================================================
// 夢魘首領沿用本體的圖，畫面染深一點
const BOSS_ART = { nm_bone: ['boneking', 'hue-rotate(250deg) saturate(1.3) brightness(.8)'], nm_ash: ['witch', 'saturate(1.5) brightness(.75) contrast(1.15)'],
  nm_frost: ['beast', 'hue-rotate(170deg) brightness(.75)'] };
// 打倒首領時的回憶劇情 → 用那隻首領的登場圖
const SCENE_ALIAS = { boss_boneking: 'boss_boneking', boss_witch: 'boss_witch', boss_beast: 'boss_beast' };

const ArtScenes = {
  shown: new WeakSet(),
  el: null,
  img(key) { return typeof ArtStyle !== 'undefined' ? ArtStyle.img(key) : null; },
  // 首領醒來：畫面中間閃一下登場圖＋名字（約 1.2 秒，不擋操作、不暫停）
  bossIntro(b) {
    const map = BOSS_ART[b.boss], src = this.img('boss_' + (map ? map[0] : b.boss));
    if (!src) return;
    if (!this.el) {
      const d = document.createElement('div'); d.id = 'bossIntro';
      d.innerHTML = '<img alt=""><div class="bi-name"></div>';
      document.body.appendChild(d); this.el = d;
    }
    const d = this.el, im = d.querySelector('img');
    im.src = src; im.style.filter = map ? map[1] : '';
    d.querySelector('.bi-name').textContent = b.name || '';
    d.classList.remove('show'); void d.offsetWidth; d.classList.add('show');
  },
  check() {
    const b = typeof G !== 'undefined' && G.bossBar;
    if (!b || !b.awake || b.dead || this.shown.has(b)) return;
    this.shown.add(b);
    try { this.bossIntro(b); } catch (e) {}
  },
};

// 每格檢查：G.bossBar 換成一個新的、醒著的首領 → 播登場圖（首領連戰會直接設 awake，所以不包 bossAI）
(function () {
  const prev = update;
  update = function (dt) { prev(dt); ArtScenes.check(); };
})();

// 營地 NPC 在地圖上的小人：換成跟立繪同一個人的像素小人（不會走路，只有原本的呼吸起伏）
const NPC_SPRITE_ART = { npc_olly: 'spr_npc_olly', npc_glen: 'spr_npc_glen', girl: 'spr_npc_sparrow', npc_sera: 'spr_npc_sera', npc_are: 'spr_npc_are',
  npc_vivi: 'spr_npc_vivi', npc_hassan: 'spr_npc_hassan', npc_mo: 'spr_npc_mo', npc_yin: 'spr_npc_yin', npc_karl: 'spr_npc_karl', npc_nova: 'spr_npc_nova', npc_king: 'spr_npc_king' };
// v2.8 營地路人（js\camplife.js 的 flv_*）
for (const k of ['prisoner', 'monk', 'dwarf', 'kid', 'mer', 'sailor', 'elf', 'gnome', 'maud', 'old']) NPC_SPRITE_ART['flv_' + k] = 'spr_flv_' + k;
const NPC_GHOST = { npc_glen: 1, npc_king: 1, flv_monk: 1 };
// 圖都裁成一樣高（58px）；小孩、地精、矮人、坐著的人魚縮小一點，才不會跟大人一樣高
const NPC_SCALE = { girl: 0.8, flv_kid: 0.74, flv_gnome: 0.64, flv_dwarf: 0.82, flv_mer: 0.86 };
(function () {
  const ready = {};
  if (typeof ARTWORK !== 'undefined') for (const k in NPC_SPRITE_ART) {
    const src = ARTWORK.img[NPC_SPRITE_ART[k]]; if (!src) continue;
    const im = new Image();
    im.onload = () => {
      // 幽魂（格倫、國王）的圖本身就半透明，遊戲還會再淡化一次 → 畫兩層補回來
      const twice = !!NPC_GHOST[k];
      const sc = NPC_SCALE[k] || 1, W = Math.round(im.width * sc), H = Math.round(im.height * sc);
      const mk = flip => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; if (flip) { g.translate(W, 0); g.scale(-1, 1); } g.drawImage(im, 0, 0, W, H); if (twice) g.drawImage(im, 0, 0, W, H); return c; };
      ready[k] = { r: mk(false), l: mk(true), w: W, h: H };
    };
    im.src = src;
  }
  const prev = getSprite;
  getSprite = function (name, scale, tint, flash) {
    const s = ready[name];
    if (s && typeof ArtStyle !== 'undefined' && ArtStyle.on && !flash) return s;
    return prev(name, scale, tint, flash);
  };
})();

// v2.8 怪物：100 種怪物＋10 個首領換成 AI 像素圖（mon_<圖名>）。大小照怪物的體型 r，精英 1.5 倍；
//   冰凍等染色、受擊閃白照舊；沒有新圖的照原本的畫法
(function () {
  if (typeof ARTWORK === 'undefined') return;
  const R = {}, BOSSY = {};
  if (typeof MONSTERS !== 'undefined') for (const k in MONSTERS) R[MONSTERS[k].sprite || k] = MONSTERS[k].r || 12;
  if (typeof BOSSES !== 'undefined') for (const k in BOSSES) if (BOSSES[k].sprite) { R[BOSSES[k].sprite] = BOSSES[k].r; BOSSY[BOSSES[k].sprite] = 1; }
  const imgs = {}, cache = new Map();
  const sat = hex => { const n = parseInt(String(hex).slice(1, 7), 16) || 0, r = n >> 16, g = (n >> 8) & 255, b = n & 255; return Math.max(r, g, b) - Math.min(r, g, b); };
  for (const k in ARTWORK.img) if (k.startsWith('mon_')) { const im = new Image(); im.onload = () => { imgs[k.slice(4).replace(/^boss_/, '')] = im; cache.clear(); }; im.src = ARTWORK.img[k]; }
  const make = (im, h, tint, flash, flip, recol) => {
    const w = Math.max(1, Math.round(im.width * h / im.height)), c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (flip) { g.translate(w, 0); g.scale(-1, 1); }
    g.drawImage(im, 0, 0, w, h);
    if (recol === 'white') {   // v2.19 換成白色（營地的大白：狼的圖染成白狗）：先去色、再提亮，最後照原圖形狀裁一次
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'saturation'; g.globalAlpha = 0.92; g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.55; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in'; g.globalAlpha = 1;
      if (flip) { g.translate(w, 0); g.scale(-1, 1); }
      g.drawImage(im, 0, 0, w, h);
    } else if (recol) {   // 夢魘首領：同一張圖，壓暗再整個換成夢魘的色調
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.28; g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'color'; g.globalAlpha = 0.7; g.fillStyle = recol; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in'; g.globalAlpha = 1;
      if (flip) { g.translate(w, 0); g.scale(-1, 1); }
      g.drawImage(im, 0, 0, w, h);
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    if (tint) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.32; g.fillStyle = tint; g.fillRect(0, 0, w, h); }
    if (flash) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.85; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
    return c;
  };
  const prev = getSprite;
  getSprite = function (name, scale = 2, tint = null, flash = false) {
    const im = imgs[name];
    if (!im || typeof ArtStyle === 'undefined' || !ArtStyle.on) return prev(name, scale, tint, flash);
    // 只有冰凍／冰緩（每個顏色都換成同一色）才染色；主題換色（PAL_TINT）是給舊像素圖用的，新圖本來就各有顏色
    const tv = tint ? Object.values(tint) : [], tc = tv.length > 1 && tv.every(v => v === tv[0]) ? tv[0] : null;
    // 首領帶著一整組不同顏色（夢魘首領）→ 挑最鮮豔的那個顏色重新上色
    // v2.19 一般怪帶著一組顏色、其中有接近白色的主色（營地的大白）→ 整隻染白
    const lum = hex => { const n = parseInt(String(hex).slice(1, 7), 16) || 0; return (n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11; };
    const recol = !tc && BOSSY[name] && tv.length ? tv.slice().sort((a, b) => sat(b) - sat(a))[0] : !tc && tint && tint.G && lum(tint.G) > 225 && sat(tint.G) < 24 ? 'white' : null;   // 只看身體主色 G
    const key = `${name}|${scale}|${tc || ''}|${recol || ''}|${flash ? 1 : 0}`;
    let s = cache.get(key);
    if (!s) {
      if (cache.size > 600) cache.clear();
      const r = R[name] || 12;
      // 一般怪 scale 2；大型怪 3；精英再 +1 → 高度跟著放大
      const h = BOSSY[name] ? Math.round(r * 3.6) : Math.round((32 + (r - 9) * 2.4) * (1 + Math.max(0, scale - 2) * 0.35));
      const rr = make(im, h, tc, flash, false, recol), ll = make(im, h, tc, flash, true, recol);
      s = { r: rr, l: ll, w: rr.width, h: rr.height };
      cache.set(key, s);
    }
    return s;
  };
})();

// 劇情回憶：上方加一張橫幅插圖（人物故事的左側立繪照舊）
(function () {
  if (typeof UI === 'undefined' || !UI.renderStory) return;
  const prev = UI.renderStory;
  UI.renderStory = function () {
    prev.apply(this, arguments);
    const st = document.getElementById('story'); if (!st) return;
    let im = document.getElementById('storyScene');
    if (!im) { im = document.createElement('img'); im.id = 'storyScene'; im.alt = ''; st.insertBefore(im, st.firstChild); }
    const key = this.storyKey, src = ArtScenes.img(SCENE_ALIAS[key] || 'scene_' + key);
    const on = !!src && !st.classList.contains('port');
    st.classList.toggle('scene', on);
    if (on) im.src = src;
  };
})();
