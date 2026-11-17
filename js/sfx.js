// =============================================================
//  音效 v2.3：全部用瀏覽器即時合成（Web Audio），沒有任何音檔
//  ・Sfx.play('hit')  播一個音效（同一種音效 35 毫秒內不會重複疊，避免一次打十隻怪爆音）
//  ・按 M 開關聲音；Sfx.vol 是總音量（0–1），設定存在瀏覽器裡
//  ・瀏覽器規定要玩家先點一下或按一下鍵才能出聲，所以第一次操作時才啟動
// =============================================================
const Sfx = {
  ctx: null, master: null, last: {}, noise: null,
  on: (() => { try { return localStorage.getItem('yiwang_sound') !== '0'; } catch (e) { return true; } })(),
  vol: (() => { try { const v = parseFloat(localStorage.getItem('yiwang_volume')); return isNaN(v) ? 0.5 : Math.max(0, Math.min(1, v)); } catch (e) { return 0.5; } })(),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.on ? this.vol : 0;
      // 輕微壓縮，很多聲音同時出現也不會破音
      const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
      this.master.connect(comp); comp.connect(this.ctx.destination);
      // 一秒的白噪音，打擊聲、揮砍聲都從這裡切
      const len = this.ctx.sampleRate, buf = this.ctx.createBuffer(1, len, len), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    } catch (e) { this.ctx = null; }
  },
  toggle() {
    this.on = !this.on; this.init();
    if (this.master) this.master.gain.value = this.on ? this.vol : 0;
    try { localStorage.setItem('yiwang_sound', this.on ? '1' : '0'); } catch (e) {}
    return this.on;
  },
  setVol(v) { this.vol = Math.max(0, Math.min(1, v)); if (this.master && this.on) this.master.gain.value = this.vol; try { localStorage.setItem('yiwang_volume', String(this.vol)); } catch (e) {} },
  // 一個音：波形、起始頻率 → 結束頻率、長度、音量
  tone(type, f0, f1, dur, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    vol = Math.max(0.0002, vol * (this.mul ?? 1));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  // 一段噪音：濾波類型、頻率起訖、長度、音量（打擊的「啪」、揮砍的「咻」）
  hiss(ftype, f0, f1, dur, vol, delay = 0, q = 1) {
    const c = this.ctx, t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; s.loop = true; f.type = ftype; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    vol = Math.max(0.0002, vol * (this.mul ?? 1));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  play(name, k = 1) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now(); if (now - (this.last[name] || 0) < (SFX_GAP[name] || 35)) return; this.last[name] = now;
    const r = 0.92 + Math.random() * 0.16;   // 每次音高差一點點，連打不會像機關槍
    const cat = SFX_CAT[name] || 'combat'; this.mul = (this.cat && this.cat[cat] != null) ? this.cat[cat] : 1; if (this.mul <= 0) return;   // v2.4 分類音量
    try { (SFX_DEF[name] || SFX_DEF.hit)(this, r, k); } catch (e) {}
  },
};
// 音效分類（設定裡可以分別調音量）
const SFX_CAT = { pickup: 'loot', coin: 'loot', rare: 'loot', unique: 'loot', levelup: 'loot', click: 'ui', deny: 'ui', equip: 'ui', flask: 'ui', portal: 'ui' };
const SFX_GAP = { hit: 35, crit: 60, kill: 45, pickup: 60, swing: 70, shoot: 60, cast: 70, hurt: 120, step: 200 };
const SFX_DEF = {
  // 打中：低沉的「咚」＋短促的「啪」
  hit: (s, r, k) => { s.tone('triangle', 190 * r, 60, 0.09, 0.32 * k); s.hiss('bandpass', 2200 * r, 500, 0.06, 0.22 * k, 0, 0.8); },
  // 暴擊：更重，加一聲清脆的高音
  crit: (s, r) => { s.tone('triangle', 230 * r, 45, 0.16, 0.5); s.hiss('bandpass', 3200, 400, 0.11, 0.34, 0, 0.7); s.tone('square', 1400 * r, 2200, 0.07, 0.07, 0.01); },
  // 擊殺：「噗」一聲爆開
  kill: (s, r) => { s.hiss('lowpass', 1800 * r, 120, 0.2, 0.36); s.tone('sine', 130 * r, 38, 0.2, 0.34); },
  elitekill: (s, r) => { s.hiss('lowpass', 2400, 90, 0.34, 0.45); s.tone('sine', 150, 32, 0.34, 0.45); s.tone('triangle', 520 * r, 780, 0.22, 0.14, 0.05); },
  bosskill: (s) => { s.hiss('lowpass', 3000, 60, 0.9, 0.55); s.tone('sine', 110, 26, 0.9, 0.6); [392, 494, 587, 784].forEach((f, i) => s.tone('triangle', f, f, 0.5, 0.16, 0.25 + i * 0.12)); },
  // 揮砍、射箭、施法
  swing: (s, r) => s.hiss('bandpass', 700 * r, 2600, 0.11, 0.2, 0, 1.4),
  heavy: (s, r) => { s.hiss('bandpass', 420 * r, 1700, 0.16, 0.26, 0, 1.2); s.tone('sine', 95, 50, 0.14, 0.2, 0.05); },
  shoot: (s, r) => { s.hiss('highpass', 2600 * r, 900, 0.07, 0.18); s.tone('triangle', 520 * r, 180, 0.07, 0.14); },
  cast: (s, r) => { s.tone('sine', 330 * r, 880 * r, 0.16, 0.14); s.hiss('bandpass', 1400, 3600, 0.16, 0.1, 0, 2); },
  fire: (s, r) => { s.hiss('lowpass', 900 * r, 2400, 0.22, 0.24); s.tone('sawtooth', 120, 70, 0.2, 0.09); },
  ice: (s, r) => { s.tone('sine', 1500 * r, 2600, 0.14, 0.11); s.tone('triangle', 2100 * r, 1300, 0.18, 0.07, 0.03); },
  zap: (s, r) => { s.tone('sawtooth', 1100 * r, 140, 0.11, 0.13); s.hiss('highpass', 4200, 2000, 0.09, 0.14); },
  boom: (s, r) => { s.hiss('lowpass', 1500 * r, 70, 0.42, 0.5); s.tone('sine', 100, 28, 0.42, 0.5); },
  summon: (s, r) => { s.tone('sine', 196 * r, 392 * r, 0.3, 0.15); s.tone('triangle', 294 * r, 588 * r, 0.3, 0.08, 0.06); },
  blink: (s, r) => { s.hiss('bandpass', 3000, 600, 0.14, 0.18, 0, 3); s.tone('sine', 900 * r, 300, 0.14, 0.1); },
  buff: (s) => { s.tone('sawtooth', 150, 300, 0.3, 0.16); s.hiss('bandpass', 600, 1800, 0.3, 0.14); },
  // 玩家被打、被打到硬直、死亡
  hurt: (s, r, k) => { s.tone('sawtooth', 160 * r, 70, 0.13, 0.22 * k); s.hiss('lowpass', 900, 200, 0.12, 0.26 * k); },
  stun: (s) => { s.tone('square', 240, 90, 0.26, 0.2); s.hiss('lowpass', 700, 150, 0.26, 0.3); },
  dodge: (s, r) => s.hiss('bandpass', 2400 * r, 5000, 0.08, 0.1, 0, 2),
  block: (s, r) => { s.tone('square', 880 * r, 620, 0.06, 0.1); s.hiss('highpass', 3500, 2500, 0.05, 0.16); },
  die: (s) => { s.tone('sawtooth', 220, 40, 0.9, 0.3); s.hiss('lowpass', 1200, 80, 0.9, 0.3); },
  // 撿東西、喝藥、升級、介面
  pickup: (s, r) => s.tone('triangle', 880 * r, 1320 * r, 0.07, 0.11),
  coin: (s, r) => { s.tone('square', 1568 * r, 1568 * r, 0.05, 0.05); s.tone('square', 2093 * r, 2093 * r, 0.09, 0.05, 0.05); },
  rare: (s) => [659, 880, 1175].forEach((f, i) => s.tone('triangle', f, f, 0.22, 0.13, i * 0.07)),
  unique: (s) => [523, 659, 784, 1047, 1319].forEach((f, i) => s.tone('triangle', f, f, 0.4, 0.15, i * 0.08)),
  flask: (s, r) => { s.tone('sine', 300 * r, 520 * r, 0.09, 0.14); s.tone('sine', 380 * r, 640 * r, 0.09, 0.12, 0.09); },
  levelup: (s) => [392, 523, 659, 784, 1047].forEach((f, i) => { s.tone('triangle', f, f, 0.45, 0.17, i * 0.09); s.tone('sine', f * 2, f * 2, 0.45, 0.05, i * 0.09); }),
  equip: (s, r) => { s.hiss('bandpass', 1800 * r, 900, 0.07, 0.16, 0, 2); s.tone('triangle', 300 * r, 220, 0.06, 0.1); },
  click: (s) => s.tone('triangle', 660, 520, 0.035, 0.07),
  deny: (s) => s.tone('square', 150, 110, 0.12, 0.09),
  portal: (s) => { s.tone('sine', 220, 660, 0.5, 0.14); s.tone('sine', 330, 990, 0.5, 0.09, 0.05); },
  bossroar: (s) => { s.tone('sawtooth', 90, 55, 0.8, 0.3); s.hiss('lowpass', 500, 200, 0.8, 0.3); },
};
// 第一次點擊或按鍵時啟動（瀏覽器的規定）
['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => Sfx.init(), { capture: true, passive: true }));
// 介面按鈕的點擊聲
document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('button, .cell, .mbtn, [data-play], .ccard')) Sfx.play('click'); }, true);
