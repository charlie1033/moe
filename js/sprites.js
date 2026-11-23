// =============================================================
//  像素圖：用文字畫圖，每個字元是一格像素，'.' 是透明
// =============================================================
const SPRITE_MAPS = {
  warrior: [
    '................',
    '......kkkk......',
    '.....kHHHHk.....',
    '....kHHHHHHk....',
    '....kHkkkkHk....',
    '....kHkffkHk....',
    '.....kffffk.....',
    '...kkRRRRRRkk...',
    '..kSkRRRRRRkSk..',
    '..kSkRRYYRRkSk..',
    '..kfkRRRRRRkfk..',
    '...kkBBBBBBkk...',
    '.....kBkkBk.....',
    '.....kBk.kBk....',
    '....kDDk.kDDk...',
    '................',
  ],
  ranger: [
    '................',
    '......kkkk......',
    '.....kGGGGk.....',
    '....kGGGGGGk....',
    '....kGkffkGk....',
    '....kGfeefGk....',
    '.....kffffk.....',
    '....kGGLLGGk....',
    '...kGGLLLLGGk...',
    '...kfkLLLLkfk...',
    '....kkLYYLkk....',
    '.....kLLLLk.....',
    '.....kBk.kBk....',
    '.....kBk.kBk....',
    '....kDDk.kDDk...',
    '................',
  ],
  mage: [
    '.......kk.......',
    '......kPPk......',
    '.....kPPPPk.....',
    '....kPPYPPPk....',
    '..kkPPPPPPPPkk..',
    '....kkffffkk....',
    '.....kfeefk.....',
    '.....kffffk.....',
    '....kPPYYPPk....',
    '...kPPPPPPPPk...',
    '...kfkPPPPkfk...',
    '...kkPPPPPPkk...',
    '...kPPPPPPPPk...',
    '..kPPPPPPPPPPk..',
    '..kkkkkkkkkkkk..',
    '................',
  ],
  skeleton: [
    '................',
    '.....kkkkk......',
    '....kWWWWWk.....',
    '....kWrWrWk.....',
    '....kWWWWWk.....',
    '.....kWkWk......',
    '......kWk.......',
    '....kWWWWWk.....',
    '...kWkWWWkWk....',
    '...kWkWWWkWk....',
    '....kkWWWkk.....',
    '.....kWkWk......',
    '.....kWkWk......',
    '....kWk.kWk.....',
    '....kk...kk.....',
    '................',
  ],
  archer: [
    '................',
    '.....kkkkk......',
    '....kHHHHHk.....',
    '....kHrWrHk.....',
    '....kHWWWHk.....',
    '.....kWkWk......',
    '......kWk.......',
    '....kHHHHHk.....',
    '...kWkHHHkWk....',
    '...kWkHHHkWk....',
    '....kkHHHkk.....',
    '.....kWkWk......',
    '.....kWkWk......',
    '....kWk.kWk.....',
    '....kk...kk.....',
    '................',
  ],
  zombie: [
    '................',
    '.....kkkkk......',
    '....kZZZZZk.....',
    '....kZrZrZk.....',
    '....kZZZZZk.....',
    '....kZkkkZk.....',
    '...kkZZZZZkk....',
    '..kZZCCCCCZZk...',
    '..kZkCCCCCkZk...',
    '..kZkCCCCCkZk...',
    '...kkCCCCCkk....',
    '.....kCkCk......',
    '.....kZkZk......',
    '....kZk.kZk.....',
    '....kkk.kkk.....',
    '................',
  ],
  imp: [
    '................',
    '................',
    '...kk......kk...',
    '...kRk....kRk...',
    '....kRkkkkRk....',
    '....kRRRRRRk....',
    '....kRYRRYRk....',
    '....kRRRRRRk....',
    '.....kRkkRk.....',
    '...kkRRRRRRkk...',
    '..kRkRRRRRRkRk..',
    '....kRRRRRRk....',
    '.....kRkkRk.....',
    '.....kRk.kRk....',
    '....kk....kk....',
    '................',
  ],
  wisp: [
    '................',
    '......kkkk......',
    '.....kCCCCk.....',
    '....kCWCCWCk....',
    '....kCWCCWCk....',
    '....kCCCCCCk....',
    '...kCCCCCCCCk...',
    '...kCCCCCCCCk...',
    '...kCCCCCCCCk...',
    '....kCCCCCCk....',
    '....kCkCCkCk....',
    '.....k.kk.k.....',
    '................',
    '................',
    '................',
    '................',
  ],
  bat: [
    '................',
    '................',
    '................',
    '................',
    'k......kk......k',
    '.kk...kBBk...kk.',
    '.kBk.kBBBBk.kBk.',
    '..kBkBrBBrBkBk..',
    '..kBBBBBBBBBBk..',
    '...kBBkBBkBBk...',
    '....kk.kk.kk....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  wolf: [
    '................',
    '................',
    '................',
    '................',
    '...........kk...',
    '..........kGGk..',
    'k........kGGrGk.',
    'kGk.....kGGGGGGk',
    '.kGkkkkkGGGGkkk.',
    '..kGGGGGGGGGk...',
    '..kGGGGGGGGGk...',
    '..kGkGkkkGkGk...',
    '..kGkGk.kGkGk...',
    '..kk.kk..kk.kk..',
    '................',
    '................',
  ],
  samurai: [
    '.......kk.......',
    '......kHHk......',
    '.....kkHHkk.....',
    '....kHHHHHHk....',
    '....kHkffkHk....',
    '....kfkeekfk....',
    '.....kffffk.....',
    '...kkRRkkRRkk...',
    '..kRkRRRRRRkRk..',
    '..kRkWWRRWWkRk..',
    '..kfkRRRRRRkfk..',
    '...kkDDDDDDkk...',
    '....kDDDDDDk....',
    '....kDDkkDDk....',
    '....kDk..kDk....',
    '...kkkk..kkkk...',
  ],
  druid: [ // 弓箭手（代號沿用 druid）：綠色兜帽、背上箭袋
    '................',
    '......kkkk...kk.',
    '.....kGGGGk.kQk.',
    '....kGGGGGGkkQk.',
    '....kGkffkGkkQk.',
    '....kGfeefGkkQk.',
    '.....kffffk.kQk.',
    '....kGGLLGGkkk..',
    '...kGGLLLLGGk...',
    '...kfkLLLLkfk...',
    '....kkLYYLkk....',
    '.....kLLLLk.....',
    '.....kBk.kBk....',
    '.....kBk.kBk....',
    '....kDDk.kDDk...',
    '................',
  ],
  summoner: [
    '......kkkk......',
    '.....kPPPPk.....',
    '....kPPPPPPk....',
    '....kPkkkkPk....',
    '....kPkgkgkPk...',
    '....kPkkkkPk....',
    '.....kPPPPk.....',
    '....kPPPPPPk..W.',
    '...kPPPPPPPPkWWW',
    '...kfkPPPPkfk.B.',
    '...kkPPYYPPkk.B.',
    '....kPPPPPPk..B.',
    '...kPPPPPPPPk.B.',
    '..kPPPPPPPPPPkB.',
    '..kkkkkkkkkkkk..',
    '................',
  ],
  jailer: [
    '......kkkk......',
    '.....kHHHHk.....',
    '....kHHHHHHk....',
    '....kHkGGkHk....',
    '....kHGeeGHk....',
    '.....kGGGGk.....',
    '...kkHHHHHHkk...',
    '..kHkHHHHHHkHk..',
    '..kHkHHYYHHkHk..',
    '..kGkHHHHHHkGkL.',
    '...kkHHHHHHkkkLk',
    '....kHHkkHHk..L.',
    '....kHk..kHk....',
    '....kHk..kHk....',
    '...kkk....kkk...',
    '................',
  ],
  girl: [
    '................',
    '................',
    '................',
    '......kkkk......',
    '.....kBBBBk.....',
    '....kBffffBk....',
    '....kBfeefBk....',
    '.....kffffk.....',
    '.....kRRRRk.....',
    '....kRRWWRRk....',
    '...kfRRRRRRfk...',
    '....kRRRRRRk....',
    '...kRRRRRRRRk...',
    '....kkfkkfkk....',
    '.....kk..kk.....',
    '................',
  ],
  merchant: [
    '......kkkk......',
    '.....kBBBBk.....',
    '....kBBBBBBk....',
    '....kBkffkBk....',
    '....kBfeefBk....',
    '.....kffffk.....',
    '....kBBBBBBkk...',
    '...kBBBBBBkYYk..',
    '...kfkBBBBkYYk..',
    '....kkBBBBkkkk..',
    '.....kBBBBk.....',
    '.....kBBBBk.....',
    '....kBBBBBBk....',
    '...kBBBBBBBBk...',
    '...kkkkkkkkkk...',
    '................',
  ],
  chest: [
    '................',
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.kWWWWWWWWWWWWk.',
    '.kWBBBBBBBBBBWk.',
    '.kWBBBBBBBBBBWk.',
    '.kkkkkkYYkkkkkk.',
    '.kWBBBBYYBBBBWk.',
    '.kWBBBBBBBBBBWk.',
    '.kWBBBBBBBBBBWk.',
    '.kWWWWWWWWWWWWk.',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
  ],
  boneking: [
    '.......Y..Y..Y......',
    '.......YYYYYYY......',
    '.......kkkkkkk......',
    '......kWWWWWWWk.....',
    '.....kWWWWWWWWWk....',
    '.....kWkkWWWkkWk....',
    '.....kWkPkWkPkWk....',
    '.....kWWWWkWWWWk....',
    '......kWkWkWkWk.....',
    '.......kWWWWWk......',
    '...kkkkkWWWWWkkkkk..',
    '..kVVVkWWWWWWWkVVVk.',
    '.kVVVkWkWWWWWkWkVVVk',
    '.kVVkWWkWWWWWkWWkVVk',
    '.kVVkWkkWWWWWkkWkVVk',
    '.kVVVkkVVVVVVVkkVVVk',
    '..kVVVVVVVVVVVVVVVk.',
    '..kVVVVkVVVVVkVVVVk.',
    '...kWWk.......kWWk..',
    '..kkkkk.......kkkkk.',
  ],
  witch: [
    '.......O..O..O......',
    '......OOOOOOOOO.....',
    '.....OOkkkkkkkOO....',
    '.....OkFFFFFFFkO....',
    '.....kFFFFFFFFFk....',
    '.....kFkYFFFYkFk....',
    '.....kFFFFFFFFFk....',
    '......kFFkkkFFk.....',
    '.......kFFFFFk......',
    '.....kkRRRRRRRkk....',
    '....kRRRRYYYRRRRk...',
    '...kFkRRRRRRRRRkFk..',
    '...kFkRRRRRRRRRkFk..',
    '...kkkRRRRRRRRRkkk..',
    '.....kRRRRRRRRRk....',
    '....kRRRRRRRRRRRk...',
    '....kRRRRRRRRRRRk...',
    '...kRRRRRRRRRRRRRk..',
    '...kOOOOOOOOOOOOOk..',
    '...kkkkkkkkkkkkkkk..',
  ],
  beast: [
    '....................',
    '....................',
    '..............kk.kk.',
    '.............kWk.kWk',
    '.............kCCkCCk',
    '...k........kCCCCCCk',
    '..kCk......kCCrCCrCk',
    '..kCCk....kCCCCCCCCk',
    '...kCCkkkkCCCCCCWkWk',
    '...kCCCCCCCCCCCCCkk.',
    '..kCCCCCCCCCCCCCCk..',
    '..kCCDCCCDCCCDCCCk..',
    '..kCCCCCCCCCCCCCCk..',
    '..kCCCCCCCCCCCCCCk..',
    '...kCCCkkkkkkCCCk...',
    '...kCCk......kCCk...',
    '...kCCk......kCCk...',
    '..kWkWk.....kWkWk...',
    '..kkkkk.....kkkkk...',
    '....................',
  ],
};

const SPRITE_PAL = {
  warrior: { k: '#1a1418', H: '#a8a8b8', f: '#e8b890', R: '#b83a32', S: '#d0d0d8', Y: '#f0c040', B: '#5a3a2a', D: '#2a1a14' },
  ranger: { k: '#0e0a12', G: '#3a2a4a', f: '#e8b890', e: '#c040ff', L: '#2a2228', Y: '#90e070', B: '#2a2028', D: '#141018' }, // 盜賊：暗紫兜帽
  mage: { k: '#14141e', P: '#3a5ad0', Y: '#f0d050', f: '#e8b890', e: '#202030' },
  skeleton: { k: '#141218', W: '#e8e4d8', r: '#ff3030' },
  minion: { k: '#0c1a0c', W: '#b8f0b8', r: '#40ff60' },
  archer: { k: '#141218', W: '#e0dccc', H: '#6a4a6a', r: '#ff3030' },
  zombie: { k: '#141a10', Z: '#7a9a5a', r: '#ff4020', C: '#5a4a3a' },
  imp: { k: '#1a0c0a', R: '#d84020', Y: '#ffe040' },
  wisp: { k: '#0c1824', C: '#8fd8ff', W: '#ffffff' },
  bat: { k: '#100c14', B: '#5a4a6a', r: '#ff3030' },
  wolf: { k: '#101820', G: '#a8c0d8', r: '#40c0ff' },
  samurai: { k: '#140a0a', H: '#1e1a20', f: '#e8b890', e: '#202020', R: '#b02a2a', W: '#e8e0d0', D: '#2a2a3a' },
  druid: { k: '#101408', G: '#4a9a4a', f: '#e8b890', e: '#202020', L: '#8a6a3a', Y: '#e0c050', B: '#4a3a2a', D: '#2a1a14', Q: '#a07040' },
  summoner: { k: '#0e0a12', P: '#3a2a4a', g: '#80ff80', W: '#e8e4d8', B: '#5a4030', Y: '#a070e0', f: '#d8c0a8' },
  mwolf: { k: '#0c1a10', G: '#a0e0a8', r: '#40ff60' },
  mspirit: { k: '#140c24', C: '#c8a8ff', W: '#ffffff' },
  mgolem: { k: '#14120e', Z: '#8a8270', r: '#ffb040', C: '#5a5448' },
  jailer: { k: '#1a2028', H: '#8a98a8', G: '#b8c8d8', e: '#40f0ff', Y: '#c8a040', L: '#ffd880' },
  girl: { k: '#1a1010', B: '#4a3020', f: '#f0c8a0', e: '#202020', R: '#d84860', W: '#fff0f0' },
  merchant: { k: '#140c16', B: '#7a4a8a', f: '#e8b890', e: '#202020', Y: '#e0b040' },
  chest: { k: '#140e08', W: '#9a9aa8', B: '#7a5030', Y: '#e8c040' },
  boneking: { k: '#120c16', Y: '#f0c040', W: '#e8e4d8', P: '#c040ff', V: '#5a2a7a' },
  witch: { k: '#1a0806', O: '#ff9a20', F: '#e8b890', Y: '#ffe040', R: '#a02818' },
  beast: { k: '#0a1420', C: '#6aa8d8', W: '#f0f8ff', r: '#40e0ff', D: '#3a78a8' },
};
// 不同主題用不同配色重新上色同一隻怪
const PAL_TINT = {
  fire: { skeleton: { W: '#e8c8a8' }, zombie: { Z: '#a87a4a' }, bat: { B: '#8a3a2a' } },
  ice: { skeleton: { W: '#d8ecff' }, archer: { H: '#3a5a8a' } },
};

// =============================================================
//  怪物體型範本：A＝主色、B＝副色、C＝點綴、E＝眼睛、k＝輪廓
//  100 種場景怪物都是「範本＋配色」組出來的
// =============================================================
const TEMPLATES = {
  humanoid: ['................', '......kkkk......', '.....kAAAAk.....', '.....kAEEAk.....', '.....kAAAAk.....', '......kCCk......', '....kkBBBBkk....', '...kAkBBBBkAk...',
    '...kAkBBBBkAk...', '...kAkBBBBkAk...', '....kkBBBBkk....', '.....kBkkBk.....', '.....kAk.kAk....', '.....kAk.kAk....', '....kkk..kkk....', '................'],
  skeleton: SPRITE_MAPS.skeleton.map(r => r.replace(/W/g, 'A').replace(/r/g, 'E')),
  beast4: SPRITE_MAPS.wolf.map(r => r.replace(/G/g, 'A').replace(/r/g, 'E')),
  flyer: SPRITE_MAPS.bat.map(r => r.replace(/B/g, 'A').replace(/r/g, 'E')),
  imp: SPRITE_MAPS.imp.map(r => r.replace(/R/g, 'A').replace(/Y/g, 'E')),
  bigbeast: ['................', '................', '................', '..........kkk...', '.........kAAAk..', 'k.......kAEAAAk.', 'kAk....kAAAAACk.', '.kAkkkkAAAAAkk..',
    '..kAABABABAAk...', '..kAAAAAAAAAk...', '..kAAAAAAAAAk...', '..kAkAkkkAkAk...', '..kAkAk.kAkAk...', '..kCkCk.kCkCk...', '................', '................'],
  insect: ['................', '................', '................', '................', '..k..kkkkkk..k..', '...k.kAAAAk.k...', '.k..kABBBBAk..k.', '..kkABBBBBBAkk..',
    '....kAEAAEAk....', '..kkABBBBBBAkk..', '.k..kABBBBAk..k.', '...k.kAAAAk.k...', '..k..kkkkkk..k..', '................', '................', '................'],
  crab: ['................', '................', '................', '..kk........kk..', '.kCCk......kCCk.', '.kCk........kCk.', '..kk.kE..Ek.kk..', '...kkkkkkkkkk...',
    '..kAAAAAAAAAAk..', '.kAABAAAAAABAAk.', '.kAAAAAAAAAAAAk.', '..kAAAAAAAAAAk..', '..k.k.k..k.k.k..', '.k..k.k..k.k..k.', '................', '................'],
  snake: ['................', '................', '................', '................', '................', '.........kkk....', '........kAAAk...', '........kAEACk..',
    '...kkk...kAk....', '..kABAk..kAk....', '.kAk.kAkkAk.....', '.kAk..kABAk.....', '..kAk..kkk......', '...kAkkkk.......', '....kAAAAk......', '.....kkkk.......'],
  blob: ['................', '................', '................', '................', '................', '.......kk.......', '.....kkAAkk.....', '....kAACAAAk....',
    '...kAAAAAAAAk...', '...kAEAAAAEAk...', '..kAAAAAAAAAAk..', '..kAAAAkkAAAAk..', '..kBBBBBBBBBBk..', '...kkkkkkkkkk...', '................', '................'],
  bird: ['................', '................', '................', '.......kk.......', '......kAAk......', '......kEAkC.....', 'kk....kAAk....kk', 'kAkk.kBAABk.kkAk',
    '.kAAkBBAABBkAAk.', '..kAABBAABBAAk..', '...kkkBAABkkk...', '......kBBk......', '......kCCk......', '.......kk.......', '................', '................'],
  plant: ['.....kkkkk......', '...kkCCCCCkk....', '..kCCCBCCCCCk...', '..kCCCCCCBCCk...', '...kkCCCCCkk....', '.....kAAAk......', '.....kAEAk......', '..kk.kAAAk.kk...',
    '..kAkkAAAkkAk...', '...kAAAAAAAk....', '.....kAAAk......', '.....kAAAk......', '....kAAAAAk.....', '...kAkAkAkAk....', '...kk.k.k.kk....', '................'],
  ghost: ['................', '......kkkk......', '.....kAAAAk.....', '....kAAAAAAk....', '....kAEAAEAk....', '....kAAAAAAk....', '....kAAkkAAk....', '...kAAAAAAAAk...',
    '...kAAAAAAAAk...', '...kAABAABAAk...', '....kAAAAAAk....', '....kAkAAkAk....', '.....k.kk.k.....', '................', '................', '................'],
  golem: ['................', '.....kkkkkk.....', '....kAAAAAAk....', '....kAEAAEAk....', '....kAAAAAAk....', '..kkkBBBBBBkkk..', '.kAAkBBCCBBkAAk.', '.kAAkBBBBBBkAAk.',
    '.kAAkBBBBBBkAAk.', '.kAAkkBBBBkkAAk.', '..kk.kBBBBk.kk..', '.....kAkkAk.....', '....kAAk.kAAk...', '....kAAk.kAAk...', '....kkkk.kkkk...', '................'],
  eye: ['................', '................', '.....kkkkkk.....', '...kkAAAAAAkk...', '..kAAAAAAAAAAk..', '.kAAABBBBBBAAAk.', '.kAABBCCCCBBAAk.', '.kAABBCEECBBAAk.',
    '.kAABBCEECBBAAk.', '.kAABBCCCCBBAAk.', '.kAAABBBBBBAAAk.', '..kAAAAAAAAAAk..', '...kkAkAAkAkk...', '.....kk..kk.....', '....k......k....', '................'],
  worm: ['................', '................', '................', '................', '................', '................', '..........kkk...', '.........kAAAk..',
    '........kAEAEk..', '..kkk..kAAAAk...', '.kABAkkABAAk....', 'kAAAAABAAAk.....', 'kAAkkAAAAk......', '.kk..kkkk.......', '................', '................'],
};
// 把資料檔裡用範本做的怪物與首領登記成可以畫的圖
function registerTemplateSprites() {
  const reg = (id, d) => { if (!d.tpl) return; SPRITE_MAPS[id] = TEMPLATES[d.tpl]; SPRITE_PAL[id] = Object.assign({ k: '#120e12', A: '#888888', B: '#666666', C: '#aaaaaa', E: '#ff3030' }, d.pal); };
  for (const id in MONSTERS) reg(MONSTERS[id].sprite, MONSTERS[id]);
  for (const id in BOSSES) if (BOSSES[id].tpl) reg(BOSSES[id].sprite, BOSSES[id]);
}
// 召喚物沿用怪物的圖，只換顏色
const SPRITE_ALIAS = { minion: 'skeleton', mwolf: 'wolf', mspirit: 'wisp', mgolem: 'zombie' };
const SPRITE_CACHE = {};
function getSprite(name, scale = 2, tint = null, flash = false) {
  const key = `${name}|${scale}|${tint ? JSON.stringify(tint) : ''}|${flash}`;
  if (SPRITE_CACHE[key]) return SPRITE_CACHE[key];
  const map = SPRITE_MAPS[SPRITE_ALIAS[name] || name];
  const pal = Object.assign({}, SPRITE_PAL[name], tint || {});
  const h = map.length, w = Math.max(...map.map(r => r.length));
  const mk = (flip) => {
    const c = document.createElement('canvas');
    c.width = w * scale; c.height = h * scale;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = map[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || !pal[ch]) continue;
        g.fillStyle = flash ? (ch === 'k' ? '#ffffff' : '#ffffff') : pal[ch];
        const px = flip ? (w - 1 - x) : x;
        g.fillRect(px * scale, y * scale, scale, scale);
      }
    }
    return c;
  };
  const res = { r: mk(false), l: mk(true), w: w * scale, h: h * scale };
  SPRITE_CACHE[key] = res;
  return res;
}

registerTemplateSprites();

// ---------- 物品小圖示（10×10） ----------
const ICON_MAPS = {
  sword: ['........kS', '.......kSk', '......kSk.', '.....kSk..', '....kSk...', '.k.kSk....', '..kSk.....', '..kYk.....', '.kBkk.....', 'kBk.......'],
  axe: ['....kkk...', '...kSSSk..', '..kSSSSk..', '...kSSBk..', '.....kBk..', '....kBk...', '...kBk....', '..kBk.....', '.kBk......', 'kk........'],
  bow: ['..kk......', '.kBBk..k..', 'kB..Bk.k..', 'kB...Bkk..', 'kB....kWk.', 'kB...Bkk..', 'kB..Bk.k..', '.kBBk..k..', '..kk......', '..........'],
  wand: ['.......kP.', '......kPPk', '.....kBPk.', '....kBk...', '...kBk....', '..kBk.....', '.kBk......', 'kBk.......', 'kk........', '..........'],
  staff: ['......kPPk', '.....kPYPk', '......kPk.', '.....kBk..', '....kBk...', '...kBk....', '..kBk.....', '.kBk......', 'kBk.......', 'kk........'],
  shield: ['.kkkkkkkk.', 'kSSSSSSSSk', 'kSRRRRRRSk', 'kSRRYYRRSk', 'kSRRYYRRSk', 'kSRRRRRRSk', '.kSRRRRSk.', '..kSRRSk..', '...kSSk...', '....kk....'],
  quiver: ['..kWk.kWk.', '..kSk.kSk.', '.kkBkkBkk.', '.kBBBBBBk.', '.kBBBBBBk.', '.kBYYYYBk.', '.kBBBBBBk.', '.kBBBBBBk.', '.kBBBBBBk.', '..kkkkkk..'],
  focus: ['...kkkk...', '..kPPPPk..', '.kPWPPPPk.', '.kPPPPPPk.', '.kPPPPPPk.', '..kPPPPk..', '...kkkk...', '..kBBBBk..', '.kBBBBBBk.', '.kkkkkkkk.'],
  helmet: ['..........', '...kkkk...', '..kSSSSk..', '.kSSSSSSk.', '.kSSSSSSk.', '.kSkkkkSk.', '.kSk..kSk.', '.kSk..kSk.', '..kk..kk..', '..........'],
  body: ['.kk....kk.', 'kSSkkkkSSk', 'kSSSSSSSSk', '.kSSYYSSk.', '.kSSSSSSk.', '.kSSSSSSk.', '.kSSSSSSk.', '.kSSSSSSk.', '.kkkkkkkk.', '..........'],
  gloves: ['..........', '..k.k.k...', '.kSkSkSk..', '.kSkSkSkk.', '.kSSSSSkSk', '.kSSSSSSk.', '.kSSSSSk..', '..kBBBk...', '..kBBBk...', '..kkkkk...'],
  boots: ['..........', '..kkkk....', '..kSSk....', '..kSSk....', '..kSSk....', '..kSSk....', '..kSSkkk..', '.kSSSSSSk.', '.kBBBBBBk.', '.kkkkkkkk.'],
  amulet: ['.kk....kk.', 'kYk....kYk', '.kYk..kYk.', '..kYkkYk..', '...kYYk...', '...kRRk...', '..kRWRRk..', '..kRRRRk..', '...kRRk...', '....kk....'],
  ring: ['..........', '...kkkk...', '..kRWRRk..', '...kkkk...', '..kYkkYk..', '.kYk..kYk.', '.kYk..kYk.', '..kYkkYk..', '...kkkk...', '..........'],
  belt: ['..........', '..........', 'kkkkkkkkkk', 'kBBBkkkBBk', 'kBBkYYkBBk', 'kBBkYYkBBk', 'kBBBkkkBBk', 'kkkkkkkkkk', '..........', '..........'],
  katana: ['.........k', '........kS', '.......kSk', '......kSk.', '.....kSk..', '....kSk...', '...kSk....', '..kYYk....', '.kRk......', 'kRk.......'],
  dagger: ['..........', '.......kk.', '......kSSk', '.....kSSk.', '....kSSk..', '...kSSk...', '..kYYk....', '.kBk......', 'kBk.......', 'kk........'],
  orb: ['..........', '...kkkk...', '..kCCCCk..', '.kCWCCCCk.', '.kCCCCCCk.', '.kCCCCCCk.', '.kCCCCCCk.', '..kCCCCk..', '...kkkk...', '..........'],
  flask: ['...YYYY...', '...kBBk...', '...kSSk...', '..kSSSSk..', '.kSSSSSSk.', '.kCCCCCCk.', '.kCWCCCCk.', '.kCWCCCCk.', '.kCCCCCCk.', '..kkkkkk..'],
};
const ICON_PAL = { k: '#120e10', S: '#b8bcc8', Y: '#e8c040', B: '#7a5030', W: '#ffffff', P: '#9a60ff', R: '#d03838' };
const ICON_CACHE = {};
function getIcon(cls, scale = 3, override) {
  const key = cls + scale + (override || '');
  if (ICON_CACHE[key]) return ICON_CACHE[key];
  const map = ICON_MAPS[cls] || ICON_MAPS.orb;
  const c = document.createElement('canvas');
  c.width = 10 * scale; c.height = 10 * scale;
  const g = c.getContext('2d');
  const pal = Object.assign({}, ICON_PAL, override ? { C: override } : { C: '#8fb8ff' });
  map.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || !pal[ch]) return;
    g.fillStyle = pal[ch]; g.fillRect(x * scale, y * scale, scale, scale);
  }));
  ICON_CACHE[key] = c.toDataURL();
  return ICON_CACHE[key];
}

// ---------- 地板／牆壁貼圖 ----------
const TILE_CACHE = {};
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0); }
function getFloorTile(theme, variant) {
  const key = theme.id + variant;
  if (TILE_CACHE[key]) return TILE_CACHE[key];
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = theme.floor[variant % theme.floor.length]; g.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 26; i++) {
    const h = hash2(i * 7 + variant * 131, i * 13 + 5);
    const x = (h % 16) * 2, y = ((h >> 5) % 16) * 2;
    g.fillStyle = (h >> 10) % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
    g.fillRect(x, y, 2, 2);
  }
  if (variant === 2) { // 裂縫
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 6; i++) g.fillRect(8 + i * 2, 12 + (i % 2) * 2, 2, 2);
  }
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 32, 1); g.fillRect(0, 0, 1, 32);
  TILE_CACHE[key] = c;
  return c;
}
