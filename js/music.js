// =============================================================
//  v2.8.7 背景音樂：每個場景有自己的調性和節奏（瀏覽器即時合成，沒有音檔）
//  ・營地＝溫暖的五聲音階；骸骨墓穴＝陰暗小調；熔岩＝急促的佛里幾亞；冰封＝清脆的鐘聲加回音；
//    洞穴＝藍調小調＋水滴；草原＝明亮大調；海灘＝利地亞；腐沼＝不安的洛克利亞；森林＝多利亞；
//    沙漠＝雙和聲音階；虛空＝全音音階；看守者醒來＝快節奏加鼓
//  ・Esc → 設定 → 音效：「背景音樂」音量（0 就是關掉）；也會跟著總音量、靜音
// =============================================================
const MOODS = {
  town: { sc: [0, 2, 4, 7, 9], root: 57, bpm: 68, wave: 'triangle', arp: 0.45, bass: 0.5, drum: 0, echo: 0.25, pad: 0.5 },
  bone: { sc: [0, 2, 3, 5, 7, 8, 10], root: 50, bpm: 60, wave: 'sine', arp: 0.25, bass: 0.6, drum: 0, echo: 0.3, pad: 0.6 },
  fire: { sc: [0, 1, 4, 5, 7, 8, 10], root: 52, bpm: 92, wave: 'sawtooth', arp: 0.5, bass: 0.7, drum: 0.6, echo: 0.1, pad: 0.4 },
  ice: { sc: [0, 2, 3, 7, 8], root: 64, bpm: 56, wave: 'sine', arp: 0.4, bass: 0.3, drum: 0, echo: 0.45, pad: 0.4 },
  cave: { sc: [0, 3, 5, 6, 7, 10], root: 45, bpm: 64, wave: 'triangle', arp: 0.3, bass: 0.6, drum: 0.15, echo: 0.4, pad: 0.5 },
  grass: { sc: [0, 2, 4, 5, 7, 9, 11], root: 55, bpm: 84, wave: 'triangle', arp: 0.55, bass: 0.5, drum: 0.3, echo: 0.15, pad: 0.4 },
  beach: { sc: [0, 2, 4, 6, 7, 9, 11], root: 53, bpm: 70, wave: 'sine', arp: 0.4, bass: 0.4, drum: 0.1, echo: 0.35, pad: 0.6 },
  swamp: { sc: [0, 1, 3, 5, 6, 8, 10], root: 47, bpm: 58, wave: 'square', arp: 0.25, bass: 0.6, drum: 0.1, echo: 0.3, pad: 0.5 },
  forest: { sc: [0, 2, 3, 5, 7, 9, 10], root: 50, bpm: 72, wave: 'triangle', arp: 0.45, bass: 0.5, drum: 0.2, echo: 0.3, pad: 0.5 },
  desert: { sc: [0, 1, 4, 5, 7, 8, 11], root: 52, bpm: 80, wave: 'sawtooth', arp: 0.45, bass: 0.5, drum: 0.45, echo: 0.2, pad: 0.4 },
  void: { sc: [0, 2, 4, 6, 8, 10], root: 48, bpm: 50, wave: 'sine', arp: 0.3, bass: 0.4, drum: 0, echo: 0.5, pad: 0.7 },
  boss: { sc: [0, 1, 3, 5, 7, 8, 10], root: 45, bpm: 124, wave: 'sawtooth', arp: 0.7, bass: 0.9, drum: 1, echo: 0.1, pad: 0.4 },
};
if (CFG.volMusic === undefined) CFG.volMusic = 45;
CFG_DEFAULT.volMusic = 45;
const Music = {
  out: null, delay: null, mood: null, next: 0, beat: 0, chord: 0,
  setup() {
    const c = Sfx.ctx; if (!c || this.out) return !!this.out;
    this.out = c.createGain(); this.out.gain.value = 0; this.out.connect(Sfx.master);
    this.delay = c.createDelay(1); this.delay.delayTime.value = 0.33; this.fb = c.createGain(); this.fb.gain.value = 0.3; this.wet = c.createGain(); this.wet.gain.value = 0.25;
    this.delay.connect(this.fb); this.fb.connect(this.delay); this.delay.connect(this.wet); this.wet.connect(this.out);
    return true;
  },
  note(f, t, dur, vol, wave, filt) {
    const c = Sfx.ctx, o = c.createOscillator(), gn = c.createGain(), lp = c.createBiquadFilter();
    o.type = wave; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = filt || 1800;
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + Math.min(0.08, dur * 0.3)); gn.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(lp); lp.connect(gn); gn.connect(this.out); gn.connect(this.delay); o.start(t); o.stop(t + dur + 0.05);
  },
  drum(t, kind, vol) {
    const c = Sfx.ctx;
    if (kind === 'kick') { const o = c.createOscillator(), gn = c.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(gn); gn.connect(this.out); o.start(t); o.stop(t + 0.25); }
    else if (Sfx.noise) { const s = c.createBufferSource(), gn = c.createGain(), hp = c.createBiquadFilter(); s.buffer = Sfx.noise; hp.type = 'highpass'; hp.frequency.value = 6000; gn.gain.setValueAtTime(vol * 0.4, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.connect(hp); hp.connect(gn); gn.connect(this.out); s.start(t); s.stop(t + 0.06); }
  },
  pickMood() {
    if (typeof G === 'undefined' || G.state !== 'play' || !G.world) return null;
    const w = G.world;
    if (w.kind === 'town') return 'town';
    if (w.arena || (G.bossBar && G.bossBar.awake && !G.bossBar.dead)) return 'boss';
    return (w.theme && MOODS[w.theme.id]) ? w.theme.id : 'bone';
  },
  tick() {
    if (!Sfx.ctx || !this.setup()) return;
    const c = Sfx.ctx, want = this.pickMood(), vol = (CFG.volMusic || 0) / 100 * 0.32;
    if (want !== this.mood) { this.out.gain.cancelScheduledValues(c.currentTime); this.out.gain.setTargetAtTime(0, c.currentTime, 0.25); if (this.next < c.currentTime + 0.9) this.next = c.currentTime + 0.9; this.mood = want; this.beat = 0; }
    else this.out.gain.setTargetAtTime(want ? vol : 0, c.currentTime, 0.6);
    if (!want || vol <= 0) return;
    const M = MOODS[want], spb = 60 / M.bpm / 2;   // 八分音符
    this.wet.gain.value = M.echo;
    const hz = n => 440 * Math.pow(2, (n - 69) / 12), deg = (d, oct = 0) => M.root + M.sc[((d % M.sc.length) + M.sc.length) % M.sc.length] + 12 * (oct + Math.floor(d / M.sc.length));
    while (this.next < c.currentTime + 0.5) {
      const t = this.next, b = this.beat % 16;
      if (b === 0) { this.chord = [0, 5, 3, 4, 0, 2, 5, 4][Math.floor(this.beat / 16) % 8]; if (M.pad) for (const k of [0, 2, 4]) this.note(hz(deg(this.chord + k)), t, spb * 16, 0.05 * M.pad, 'sine', 900); }
      if (M.bass && (b === 0 || b === 8 || (M.drum > 0.5 && b % 4 === 0))) this.note(hz(deg(this.chord, -1)), t, spb * 3, 0.12 * M.bass, 'triangle', 600);
      if (Math.random() < M.arp * (b % 2 ? 0.6 : 1)) this.note(hz(deg(this.chord + pick([0, 2, 4, 1, 3, 5, 7]), 1)), t, spb * rint(1, 3), 0.05, M.wave, M.wave === 'sawtooth' || M.wave === 'square' ? 1400 : 2600);
      if (M.drum) { if (b % 8 === 0) this.drum(t, 'kick', 0.35 * M.drum); if (b % 2 === 1 && Math.random() < M.drum) this.drum(t, 'hat', 0.3 * M.drum); }
      if (want === 'cave' && Math.random() < 0.06) this.note(hz(deg(pick([4, 5, 6]), 2)), t, 0.25, 0.04, 'sine', 4000);   // 水滴
      this.next += spb; this.beat++;
    }
  },
};
setInterval(() => { try { Music.tick(); } catch (e) { } }, 120);
// 設定 → 音效：多一條「背景音樂」
SettingsRows.add('sound', () => `<div class="prow"><div class="pname">背景音樂<small>每個場景不同的音樂；拉到 0 就關掉</small></div><div class="pctl"><span class="prange"><input type="range" data-c="volMusic" min="0" max="100" step="5" value="${CFG.volMusic}"><b>${CFG.volMusic}%</b></span></div></div>`);
