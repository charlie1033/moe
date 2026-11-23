// =============================================================
//  v2.12.7 離線快取（只在 https 網址有用，例如 GitHub 版；雙擊打開或 Claude 線上版不會用到）
//  ・遊戲的 js（網址有 ?v=版本）：第一次下載後存在手機裡，之後直接用，不用再下載 9MB
//  ・index.html：每次先上網拿最新的；沒網路才用存著的
//  ・改版時 VER 會被 tools\boot.ps1 改掉 → 舊版本的檔案自動清掉
// =============================================================
const VER = '2.19.16-demo';
const CACHE = 'moe-demo';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  const c = await caches.open(CACHE);
  for (const r of await c.keys()) { const v = new URL(r.url).searchParams.get('v'); if (v && v !== VER) await c.delete(r); }
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url); if (u.origin !== location.origin) return;
  if (u.searchParams.get('v')) {   // 有版本號的檔案：有存就直接用
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })));
  } else {                         // 其他（index.html、圖片）：先上網，沒網路用存的
    e.respondWith(caches.open(CACHE).then(c => fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => c.match(req).then(r => r || Response.error()))));
  }
});
