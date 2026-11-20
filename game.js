/* =========================================================
   UMBRA · 暗隙  —— 纯前端光影潜行平台 Demo  v2
   参考玩法：Sqube Darkness（CrazyGames）

   核心创意（v2 重构）：
   你是一块黑色方块。地图里的黑色砖块是同类材质——
   当你贴着黑砖静止 0.1 秒，"表情"（眼睛）消失，
   你和砖块融合成一体，光找不到你。
   一旦移动、起跳、或离开黑砖，眼睛睁开，你就重新成为靶子。

   因此：黑砖 = 安全岛；移动 = 暴露；冲刺 = 用命换距离。
   ========================================================= */
(function () {
  'use strict';

  /* ------------------------- 常量 ------------------------- */
  const TILE = 32, ROWS = 17, VIEW_W = 960, VIEW_H = 544;
  const GRAV = 2400, RUN = 340, ACC = 2800, FRIC = 3400;
  const JUMP_V = 790, COYOTE = 0.09, JBUF = 0.12, JCUT = 0.42;
  const DASH_V = 900, DASH_T = 0.13, DASH_CD = 0.8;
  // 暴露致死时间见 exposureSec()（按进度 1.0→0.35 s 收紧）；这里只留恢复速率
  const EXP_DN = 1 / 0.55;
  const MERGE_T = 0.08;      // 静止多久后融入
  const MERGE_V = 34;        // 低于该速度视为静止
  const SAVE_KEY = 'umbra.save.v2';

  /* 五条表现层创意的总开关（可单独关掉做 A/B） */
  const FX = { warden: true, tide: true, burn: true, shard: true, pressure: true };

  /* 调色板：单色世界。光=纯白，黑=同类/障碍，灰=石头。 */
  const PAL = {
    bgTop: '#43484d',      // 背景上缘（v3.1 再压一档）
    bgBottom: '#5f646a',   // 背景下缘
    hard: '#3a3f44',       // 硬砖：可走不可藏
    hardTop: '#4e555b',
    hardLine: 'rgba(255,255,255,.07)',
    soft: '#060606',       // 黑砖：同类材质
    softTop: '#141414',
    softLine: 'rgba(255,255,255,.05)',
    player: '#000000'
  };
  const RAY_CONE = 130, RAY_POINT = 170;

  // 瓦片材质
  const EMPTY = 0, SOFT = 1, HARD = 2;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const angDiff = (a, b) => {
    let d = (a - b + Math.PI) % (Math.PI * 2);
    if (d < 0) d += Math.PI * 2;
    return d - Math.PI;
  };

  /* ------------------------- 关卡数据 -------------------------
     hard : 硬砖（不可融合，浅灰石质）
     soft : 黑砖（可融合的安全点）
     spawn 为像素坐标（脚底贴地 y=456）
  ------------------------------------------------------------ */
  const LEVELS = [
    {
      id: 1, name: '初暗', cols: 46,
      hint: '站上黑砖，别动。眼睛闭上，光就找不到你。',
      spawn: [96, 456],
      hard: [
        [0, 15, 46, 2], [0, 0, 1, 17], [45, 0, 1, 17]
      ],
      soft: [
        [6, 15, 7, 2],
        [5, 12, 4, 1], [11, 10, 3, 1], [16, 12, 4, 1], [22, 10, 4, 1],
        [28, 12, 3, 1], [33, 10, 4, 1], [38, 12, 5, 1]
      ],
      spikes: [],
      // 引导不预置，等玩家第一次被光照到才出现（目的 → 过程 → 结果）
      clue: [16, 12],
      ms: [[6,12,'g'],[14,14,'s'],[17,12,'g'],[31,14,'s'],[39,12,'g']],
      keys: [[6, 11], [23, 9], [39, 11]],
      exit: [42, 13],
      lights: [
        // 教学灯：从右边慢慢把视线挪到你身上——跑不掉，只能停下变成砖
        { type: 'cone', x: 352, y: 40, angle: 0.7, spread: 0.40, range: 580, track: true, speed: 0.5, amp: 0.1, phase: 0 },
        { type: 'cone', x: 576, y: 40, angle: Math.PI / 2, spread: 0.56, range: 640, amp: 0.28, speed: 0.55, phase: 0 },
        { type: 'cone', x: 1120, y: 40, angle: Math.PI / 2, spread: 0.50, range: 620, amp: 0.30, speed: 0.70, phase: 2.0 }
      ]
    },
    {
      id: 2, name: '灼线', cols: 52,
      hint: '激光亮 0.9 秒、灭 1.3 秒。有些碎片藏在砖里——融进去才拿得到。',
      spawn: [64, 456],
      hard: [
        [0, 15, 14, 2], [18, 15, 14, 2], [36, 15, 16, 2],
        [0, 0, 1, 17], [51, 0, 1, 17]
      ],
      soft: [
        [6, 12, 3, 1], [12, 10, 3, 1], [19, 12, 3, 1], [25, 10, 3, 1],
        [31, 12, 3, 1], [38, 11, 4, 1], [44, 12, 4, 1], [48, 10, 3, 1]
      ],
      spikes: [[21, 14, 3, 1], [42, 14, 2, 1]],
      keys: [[7, 11], [26, 10, 1], [45, 11]],
      ms: [[7,12,'g'],[20,14,'s'],[26,10,'g'],[45,12,'g']],
      exit: [49, 13],
      lights: [
        { type: 'laser', x1: 608, y1: 464, x2: 992, y2: 464, period: 2.2, dur: 0.9, warn: 0.5, phase: 0 },
        { type: 'laser', x1: 1152, y1: 464, x2: 1504, y2: 464, period: 2.6, dur: 1.0, warn: 0.5, phase: 1.1 },
        { type: 'cone', x: 832, y: 40, angle: Math.PI / 2, spread: 0.50, range: 580, amp: 0.32, speed: 1.0, phase: 0 }
      ]
    },
    {
      id: 3, name: '巡灯', cols: 56,
      hint: '灯在找你的眼睛。闭上它，灯就从你身上滑过去。',
      spawn: [64, 456],
      hard: [
        [0, 15, 56, 2], [0, 0, 1, 17], [55, 0, 1, 17],
        [10, 11, 1, 4], [19, 12, 1, 3], [31, 11, 1, 4], [44, 12, 1, 3]
      ],
      soft: [
        [6, 11, 3, 1], [14, 9, 4, 1], [22, 12, 3, 1], [27, 10, 4, 1],
        [34, 12, 3, 1], [40, 9, 4, 1], [47, 11, 4, 1], [51, 13, 3, 1]
      ],
      spikes: [[17, 14, 2, 1], [30, 14, 2, 1], [36, 14, 2, 1]],
      ghosts: [[23, 12], [24, 12]], scars: [[33, 14]],
      ms: [[23,12,'g'],[28,10,'g'],[34,14,'s'],[41,9,'g']],
      keys: [[7, 10], [28, 10, 1], [41, 8]],
      exit: [52, 11],
      lights: [
        { type: 'cone', x: 288, y: 40, angle: Math.PI / 2, spread: 0.56, range: 540, amp: 0.34, speed: 1.05, phase: 0 },
        { type: 'cone', x: 832, y: 40, angle: Math.PI / 2, spread: 0.46, range: 520, amp: 0.42, speed: 1.35, phase: 1.4 },
        { type: 'cone', x: 1408, y: 40, angle: Math.PI / 2, spread: 0.54, range: 540, amp: 0.34, speed: 1.15, phase: 0.7 },
        { type: 'point', x: 1056, y: 424, range: 210, pulse: 1.9, phase: 0 }
      ]
    },
    {
      id: 4, name: '上升', cols: 44,
      hint: '一格一格往上。黑砖是台阶，也是掩体。',
      spawn: [64, 456],
      hard: [
        [0, 15, 44, 2], [0, 0, 1, 17], [43, 0, 1, 17]
      ],
      soft: [
        [4, 13, 3, 1], [9, 11, 3, 1], [14, 13, 3, 1], [19, 11, 3, 1],
        [24, 13, 3, 1], [29, 11, 3, 1], [33, 9, 6, 1]
      ],
      spikes: [[12, 14, 2, 1]],
      keys: [[10, 10], [25, 12], [35, 8, 2]],
      ms: [[10,11,'g'],[25,13,'g'],[20,14,'s'],[35,9,'g']],
      exit: [36, 7],
      lights: [
        { type: 'point', x: 448, y: 192, range: 250, pulse: 1.5, phase: 0 },
        { type: 'laser', x1: 720, y1: 320, x2: 720, y2: 480, period: 2.4, dur: 1.0, warn: 0.45, phase: 0.4 },
        { type: 'cone', x: 1184, y: 40, angle: Math.PI / 2, spread: 0.50, range: 460, amp: 0.30, speed: 1.2, phase: 0 }
      ]
    },
    {
      id: 5, name: '终局', cols: 60,
      hint: '灯、线、断崖一起上。你已经知道怎么活了。',
      spawn: [64, 456],
      hard: [
        [0, 15, 18, 2], [22, 15, 14, 2], [40, 15, 20, 2],
        [0, 0, 1, 17], [59, 0, 1, 17],
        [16, 13, 1, 2], [34, 12, 1, 3]
      ],
      soft: [
        [5, 12, 4, 1], [11, 10, 3, 1], [19, 11, 4, 1], [25, 12, 3, 1],
        [30, 10, 4, 1], [36, 11, 3, 1], [42, 12, 4, 1], [48, 10, 4, 1], [53, 12, 4, 1]
      ],
      spikes: [[26, 14, 3, 1], [45, 14, 2, 1]],
      ghosts: [[43, 12], [44, 12], [45, 12]], scars: [[39, 14]],
      ms: [[6,12,'g'],[31,10,'g'],[43,12,'g'],[50,10,'g'],[27,14,'s']],
      keys: [[6, 11], [31, 10, 1], [49, 9, 2]],
      exit: [57, 13],
      lights: [
        { type: 'cone', x: 256, y: 40, angle: Math.PI / 2, spread: 0.52, range: 560, amp: 0.34, speed: 1.45, phase: 0 },
        { type: 'cone', x: 768, y: 40, angle: Math.PI / 2, spread: 0.44, range: 540, amp: 0.42, speed: 1.65, phase: 2.0 },
        { type: 'laser', x1: 544, y1: 384, x2: 544, y2: 480, period: 1.9, dur: 0.75, warn: 0.4, phase: 0 },
        { type: 'laser', x1: 1280, y1: 464, x2: 1760, y2: 464, period: 2.4, dur: 0.9, warn: 0.45, phase: 0.8 },
        { type: 'point', x: 1120, y: 400, range: 190, pulse: 2.4, phase: 0.5 }
      ]
    }
  ];

  /* ------------------------- 音频（全合成，零资源） ------------------------- */
  const Audio = {
    ctx: null, master: null, noiseBuf: null, heat: null, muted: false,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.lp = this.ctx.createBiquadFilter();
      this.lp.type = 'lowpass';
      this.lp.frequency.value = 20000;
      this.master.connect(this.lp);
      this.lp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startAmbient();
      this.startHeat();
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
      });
    },
    startAmbient() {
      const c = this.ctx, g = c.createGain(); g.gain.value = 0.055;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
      const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 82.4;
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.master);
      const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
      const lg = c.createGain(); lg.gain.value = 0.028;
      lfo.connect(lg); lg.connect(g.gain);
      o1.start(); o2.start(); lfo.start();
    },
    startHeat() {
      const c = this.ctx, src = c.createBufferSource();
      src.buffer = this.noiseBuf; src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.8;
      const g = c.createGain(); g.gain.value = 0;
      src.connect(bp); bp.connect(g); g.connect(this.master); src.start();
      this.heat = g;
    },
    setMerged(on) {
      if (!this.lp) return;
      this.lp.frequency.setTargetAtTime(on ? 620 : 20000, this.ctx.currentTime, 0.07);
    },
    setHeat(v) { if (this.heat) this.heat.gain.setTargetAtTime(v * 0.16, this.ctx.currentTime, 0.06); },
    blip(freq, dur, type, vol, slide) {
      if (!this.ctx || this.muted) return;
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, vol, freq) {
      if (!this.ctx || this.muted) return;
      const c = this.ctx, t = c.currentTime;
      const s = c.createBufferSource(); s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 900; f.Q.value = 1.2;
      const g = c.createGain();
      g.gain.setValueAtTime(vol || 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur);
    },
    jump() { this.blip(420, 0.1, 'triangle', 0.16, 620); },
    dash() { this.noise(0.16, 0.20, 1800); this.blip(180, 0.12, 'sawtooth', 0.08, 90); },
    merge() { this.noise(0.14, 0.10, 480); this.blip(140, 0.16, 'sine', 0.10, 90); },
    unmerge() { this.blip(300, 0.09, 'sine', 0.07, 420); },
    key() { this.blip(880, 0.09, 'sine', 0.20); setTimeout(() => this.blip(1320, 0.14, 'sine', 0.16), 70); },
    die() { this.blip(220, 0.4, 'sawtooth', 0.20, 60); this.noise(0.3, 0.16, 500); },
    curious() { this.blip(190, 0.22, 'sine', 0.10, 120); this.noise(0.14, 0.05, 700); },
    land() { this.noise(0.06, 0.09, 320); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'triangle', 0.14), i * 90)); },
    ui() { this.blip(660, 0.05, 'square', 0.07); }
  };

  /* ------------------------- DOM ------------------------- */
  const $ = (s) => document.querySelector(s);
  const cv = $('#cv'), ctx = cv.getContext('2d', { alpha: false });
  const lcan = document.createElement('canvas');
  const lctx = lcan.getContext('2d');
  const el = {
    hud: $('#hud'), lvPips: $('#lvPips'), hudKeys: $('#hudKeys'),
    expose: $('#expose'), exposeFill: $('#exposeFill'),
    status: $('#status'), fps: $('#fps'),
    scrTitle: $('#scrTitle'), scrPause: $('#scrPause'), scrClear: $('#scrClear'),
    lvList: $('#lvList'), touch: $('#touch'),
    clearMark: $('#clearMark'), btnNext: $('#btnNext')
  };

  /* ------------------------- 状态 ------------------------- */
  let DPR = Math.min(window.devicePixelRatio || 1, 2);
  let state = 'title';
  let level = null, levelIndex = 0, player = null;
  let cam = 0, shakeT = 0, shakeMag = 0, gameTime = 0, fx = 0;
  let particles = [];
  let bgGrad = null;
  let negT = 0;
  let waves = [];
  let waveCount = 0;
  let curious = null;
  let noisePat = null;
  let dirFlash = 0;
  let endT = 0, endingKind = 'light', runClean = true;
  // 一局（Run）模式的状态
  let mode = 'campaign';                         // 'campaign' | 'run'
  let runRooms = [], runIdx = 0, runAct = 0, runSeed = 0, runPath = [], runScore = 0;
  let hallSel = 0;
  let wakeNext = 'campaign';
  const ACTS = 3, ROOMS_PER_ACT = 5;
  let memT = 0;
  let wakeT = 0;
  let memFreeze = false;   // 光"愣住"的状态：{L, t, ang}
  let save = { unlocked: 1, best: {}, depth: 0, lastTrace: null, lastEvents: null, ach: {} };
  const input = { left: false, right: false, jump: false, jumpEdge: false, dashEdge: false };

  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') save = Object.assign(save, o); }
  } catch (e) {}
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  // 成就数据层：只记不舍。真正的 Steam 成就需在发行时用 Steamworks SDK 上报，
  // 这里先把达成状态落到本地存档，保证判定逻辑与文案一一对应。
  const ACH = {
    firstHide: '第一次伪装成砖', stare: '第一次让灯愣住', clean: '一路无痕走完一关',
    light: '成为灯', brick: '成为砖', shade: '无痕结局', allKeys: '集齐全部碎片'
  };
  function achieve(id) {
    if (!save.ach) save.ach = {};
    if (save.ach[id]) return;
    save.ach[id] = 1; persist();
  }

  /* ------------------------- 关卡构建 ------------------------- */
  function fillRect(grid, cols, [x, y, w, h], v) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const gx = x + i, gy = y + j;
      if (gx >= 0 && gx < cols && gy >= 0 && gy < ROWS) grid[gy][gx] = v;
    }
  }

  function makeLevel(def) {
    const cols = def.cols;
    const grid = [];
    for (let y = 0; y < ROWS; y++) grid.push(new Array(cols).fill(EMPTY));
    (def.hard || []).forEach((r) => fillRect(grid, cols, r, HARD));
    (def.soft || []).forEach((r) => fillRect(grid, cols, r, SOFT));
    // 上一局的三个瞬间：吸附到下方最近的实体砖格，避免浮在半空
    const wallTraces = (save.lastEvents || []).map((q) => {
      const gx = clamp(Math.floor(q.u * cols), 0, cols - 1);
      const gy = clamp(Math.floor(q.v * ROWS), 0, ROWS - 1);
      let bx = gx, by = ROWS - 1, found = false;
      // 先向下找该列的实体砖；整列是断崖时，向左右找最近的实体列
      for (let d = 0; d <= 6 && !found; d++) {
        for (const cx of [gx - d, gx + d]) {
          if (cx < 0 || cx >= cols) continue;
          for (let y = gy; y < ROWS; y++) {
            if (grid[y][cx] !== EMPTY) { bx = cx; by = y; found = true; break; }
          }
          if (found) break;
        }
      }
      return { x: bx * TILE, y: by * TILE, type: q.type, onSolid: found };
    });
    // 远景视差层：给平面世界一点纵深，避免平台读成浮空的 UI 条
    const parallax = [];
    {
      let s = (def.id || 1) * 9176 + 37;
      const rr = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      const span = cols * TILE;
      for (let i = 0; i < 30; i++) {
        parallax.push({ x: rr() * (span + 200) - 100, y: 30 + rr() * 400, w: 24 + rr() * 130, h: 50 + rr() * 220, a: 0.035 + rr() * 0.055 });
      }
    }
    return {
      def, cols, rows: ROWS, grid, parallax,
      spikes: (def.spikes || []).map(([x, y, w, h]) => ({ x: x * TILE + 5, y: y * TILE + 14, w: w * TILE - 10, h: h * TILE - 14 })),
      keys: (def.keys || []).map(([x, y, flag]) => ({
        x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, got: false,
        inWall: flag === 1, live: flag === 2, liveIn: 0,
        hx: x * TILE + TILE / 2, hy: (y + 1) * TILE + TILE / 2
      })),
      exit: { x: def.exit[0] * TILE, y: def.exit[1] * TILE, w: 40, h: 64 },
      spawn: { x: def.spawn[0], y: def.spawn[1] },
      lights: (function () {
        const ls = def.lights.map((L) => Object.assign({}, L));
        // 灯记得你上一局死在哪：离那个位置最近的锥光会更不安地扫动
        const death = (save.lastEvents || []).find((e) => e.type === 'death');
        if (death) {
          const dx = death.u * cols * TILE;
          let best = null, bd = 1e9;
          for (const L of ls) {
            if (L.type !== 'cone') continue;
            const d = Math.abs(L.x - dx);
            if (d < bd) { bd = d; best = L; }
          }
          if (best && bd < 520) {
            best.amp = Math.min(0.6, (best.amp || 0.3) + 0.16);
            best.phase = (best.phase || 0) + 0.7;
          }
        }
        return ls;
      })(),
      time: 0, deaths: 0, lockMsgT: 0, lockFlash: 0, marks: [], clueT: -1, trace: [], traceT: 0,
      prevTrace: save.lastTrace || null, prevEvents: save.lastEvents || null, wallTraces,
      events: [], holdT: 0, holdBest: 0, holdAt: null, events3: null,
    };
  }

  function val(cx, cy) {
    if (!level) return EMPTY;
    if (cx < 0 || cx >= level.cols || cy < 0 || cy >= level.rows) return EMPTY;
    return level.grid[cy][cx];
  }
  function isSolid(cx, cy) {
    if (!level) return true;
    if (cx < 0 || cx >= level.cols || cy < 0 || cy >= level.rows) return true;
    return level.grid[cy][cx] !== EMPTY;
  }

  function startLevel(i) {
    mode = 'campaign';
    levelIndex = clamp(i, 0, LEVELS.length - 1);
    level = makeLevel(LEVELS[levelIndex]);
    if (levelIndex === 0) runClean = true;   // 每一轮从头开始记「有没有被光看见过」
    player = {
      x: level.spawn.x, y: level.spawn.y, w: 22, h: 24,
      vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jumpBuf: 0,
      dashT: 0, dashCd: 0, exposure: 0, alive: true, deadT: 0, trail: 0, _wasGround: false,
      merged: false, mergeT: 0, eye: 1, mergePop: 0, press: 0, holdT: 0
    };
    cam = clamp(player.x - VIEW_W / 2, 0, Math.max(0, level.cols * TILE - VIEW_W));
    particles = [];
    shakeT = 0; shakeMag = 0; gameTime = 0; fx = 0;
    state = 'play';
    memFreeze = false;
    el.scrTitle.classList.add('hide');
    el.scrPause.classList.add('hide');
    el.scrClear.classList.add('hide');
    el.hud.classList.remove('hide');
    buildLvPips();
    syncKeys();
    updateHud(true);
    showTouch();
  }

  /* ===================== 一局（Run）：房间池 + 门厅 ===================== */
  function seededRng(seed) {
    let s = (seed | 0) || 1;
    return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }

  // 生成一间保证可进的房：连续地板 + 侧墙 + 地上黑砖段（可躲）+ 走得到的碎片 + 右侧出口
  // 房间设计规则（保证"合理"）：
  //  1) 出生点(最左)与出口(最右)永远无灯，且是灰硬地板；
  //  2) 中段地面按「黑,黑,灰」循环 → 任意位置 1 格内必有黑砖可藏；
  //  3) 灯只放在中段 col 9..cols-8，均匀分布，永远照不到出生点；
  //  4) 碎片放在中段某块黑砖上，走过去顺手拿；出口在最右端。
  /* ===== 手工房间池（Phase 1.5：程序生成 → 手工编排）=====
     每间房按「掩体岛 / 亮区缺口 / 灯」手工编排：
     - 掩体岛（黑砖地板）之间最多 6 格灰缺口（0.56 s 可跨，远低于 1.0 s 致死时间）；
     - 灯压在缺口上方：玩家等灯扫开再跨；
     - 灯只放在 col 11..cols-8，出生点(左)与出口(右)永远安全。 */
  const ROOM_RECIPES = [
    { // A 入门：第一段缺口不点灯（先学会"跨"），后两段有灯
      patches: [[4, 2], [11, 3], [19, 2], [26, 3]],
      plats: [[15, 12, 3], [29, 13, 3]],
      lights: [16, 23], key: [20, 14]
    },
    { // B 错落：掩体左右错开
      patches: [[3, 3], [10, 2], [17, 4], [24, 2], [29, 3]],
      plats: [[7, 12, 3], [14, 13, 4], [21, 12, 3]],
      lights: [14, 22], key: [18, 14]
    },
    { // C 三岛：灯压在两个主缺口上
      cols: 36,
      patches: [[4, 3], [11, 3], [18, 3], [25, 3], [31, 3]],
      plats: [[8, 12, 4], [15, 13, 3], [22, 12, 4]],
      lights: [15, 22], key: [19, 14]
    },
    { // D 长缺口：缺口 6 格，最考验时机
      patches: [[4, 2], [12, 3], [20, 2], [27, 3]],
      plats: [[8, 12, 4], [16, 11, 4], [24, 12, 4]],
      lights: [17, 24], key: [21, 14]
    },
    { // E 高台：中间能跳上去的台
      patches: [[5, 2], [13, 2], [21, 2], [28, 2]],
      plats: [[9, 12, 5], [17, 10, 5], [25, 12, 3]],
      lights: [16, 24], key: [18, 14]
    }
  ];

  function buildRoom(rec) {
    const cols = rec.cols || 34;
    const hard = [[0, 0, 1, 17], [0, 15, cols, 2], [cols - 1, 0, 1, 17]];
    const soft = [];
    (rec.patches || []).forEach(([x, w]) => soft.push([x, 15, w, 2]));   // 掩体岛（黑砖地板）
    (rec.plats || []).forEach(([x, y, w]) => soft.push([x, y, w, 1]));    // 空中黑平台
    const lights = (rec.lights || []).map((x, idx) => ({
      type: 'cone', x: x * TILE, y: 40, angle: Math.PI / 2,
      spread: 0.38, range: 560, amp: 0.22, speed: 0.65, phase: idx * 1.7
    }));
    return {
      id: 70, name: '', cols,
      spawn: [48, 15 * TILE - 24],
      hard, soft, spikes: [], keys: [rec.key], exit: [cols - 3, 13],
      lights, ms: [], ghosts: [], scars: []
    };
  }

  function assembleRun(seed) {
    runSeed = (seed | 0) || 1;
    runRooms = [];
    for (let idx = 0; idx < ACTS * ROOMS_PER_ACT; idx++) {
      if (idx === 0) { runRooms.push(Object.assign({}, LEVELS[0], { id: 90 })); continue; }  // 每局从教程开始
      const act = Math.floor(idx / ROOMS_PER_ACT);
      const pos = idx % ROOMS_PER_ACT;
      // 每一幕把 5 个模板洗牌一次（同一幕内顺序不重复），难度随幕递增
      const rrA = seededRng(((runSeed ^ (act * 2654435761)) >>> 0));
      const order = ROOM_RECIPES.map((_, k) => k);
      for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(rrA() * (k + 1)); const t = order[k]; order[k] = order[j]; order[j] = t; }
      const def = buildRoom(ROOM_RECIPES[order[pos % order.length]]);
      const sm = 1 + act * 0.3;
      def.lights.forEach((L) => { L.speed *= sm; L.amp *= (1 + act * 0.25); L.spread += act * 0.03; });
      def.id = 70 + idx;
      runRooms.push(def);
    }
    return runRooms;
  }

  // 把一间房打成 ASCII 图，供无浏览器环境下检查关卡结构
  // ' '=空 '#'=灰硬砖 '.'=黑砖（可伪装）'L'=灯 'K'=碎片 'E'=出口 'S'=出生
  function roomAscii(idx) {
    const def = runRooms[idx];
    if (!def) return '';
    const lv = makeLevel(def);
    const g = lv.grid.map((r) => r.slice());
    const setc = (cx, cy, ch) => { if (cy >= 0 && cy < lv.rows && cx >= 0 && cx < lv.cols) g[cy][cx] = ch; };
    (def.lights || []).forEach((L) => { const cx = Math.floor(L.x / TILE); if (cx >= 0 && cx < lv.cols) g[0][cx] = 'L'; });
    const k = (def.keys || [])[0]; if (k) setc(k[0], k[1], 'K');
    setc(def.exit[0], def.exit[1], 'E');
    setc(Math.floor(def.spawn[0] / TILE), Math.floor(def.spawn[1] / TILE), 'S');
    let out = '';
    for (let y = 0; y < lv.rows; y++) {
      let row = '';
      for (let x = 0; x < lv.cols; x++) {
        const v = g[y][x];
        if (v === 'L' || v === 'K' || v === 'E' || v === 'S') row += v;
        else row += (v === EMPTY ? ' ' : (v === HARD ? '#' : '.'));
      }
      out += row + '\n';
    }
    return out;
  }

  function startRun(seed) {
    mode = 'run';
    assembleRun(seed == null ? (Date.now() & 0x7fffffff) : seed);
    runIdx = 0; runAct = 0; runPath = []; runScore = 0; runClean = true;
    startRoom(0);
  }

  function startRoom(idx) {
    runIdx = clamp(idx, 0, runRooms.length - 1);
    runAct = Math.floor(runIdx / ROOMS_PER_ACT);
    level = makeLevel(runRooms[runIdx]);
    player = {
      x: level.spawn.x, y: level.spawn.y, w: 22, h: 24,
      vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jumpBuf: 0,
      dashT: 0, dashCd: 0, exposure: 0, alive: true, deadT: 0, trail: 0, _wasGround: false,
      merged: false, mergeT: 0, eye: 1, mergePop: 0, press: 0, holdT: 0
    };
    cam = clamp(player.x - VIEW_W / 2, 0, Math.max(0, level.cols * TILE - VIEW_W));
    particles = []; shakeT = 0; shakeMag = 0; gameTime = 0; fx = 0;
    state = 'play'; memFreeze = false;
    input.left = input.right = input.jump = false;
    el.scrTitle.classList.add('hide');
    el.scrPause.classList.add('hide');
    el.scrClear.classList.add('hide');
    el.hud.classList.remove('hide');
    buildLvPips(); syncKeys(); updateHud(true); showTouch();
  }

  function openDoorHall() {
    state = 'doorhall'; hallSel = 0;
    el.hud.classList.add('hide');
    el.touch.classList.add('hide');
    el.scrClear.classList.add('hide');
    Audio.ui();
  }

  function hallChoose() {
    if (state !== 'doorhall') return;
    runPath.push(hallSel);
    const nextAct = runAct + 1;
    // 最后一幕前的这一次是「假选择」：门不一样，去哪都一样；但游戏记住你选了哪扇
    const fake = nextAct >= ACTS - 1;
    if (nextAct < ACTS) {
      // 假选择时忽略所选的门 → 无论点哪扇，下一幕完全一样
      const rrA = seededRng(((runSeed ^ (0x51ed27 * ((fake ? 0 : hallSel) + 1)) ^ (nextAct * 131)) >>> 0));
      const order = ROOM_RECIPES.map((_, q) => q);
      for (let q = order.length - 1; q > 0; q--) { const j = Math.floor(rrA() * (q + 1)); const t = order[q]; order[q] = order[j]; order[j] = t; }
      for (let i = 0; i < ROOMS_PER_ACT; i++) {
        const k = nextAct * ROOMS_PER_ACT + i;
        const def = buildRoom(ROOM_RECIPES[order[i % order.length]]);
        let mult = 1 + nextAct * 0.3;
        if (!fake && hallSel === 0) mult += 0.2;    // 亮门：灯更快
        if (!fake && hallSel === 1) mult -= 0.15;   // 暗门：灯更慢
        def.lights.forEach((L) => { L.speed *= mult; L.amp *= (1 + nextAct * 0.25); L.spread += nextAct * 0.03; });
        if (!fake && hallSel === 2) def.ghosts = [[Math.floor(def.cols / 2), 12]];   // 记忆门：多一道刻痕
        def.id = 70 + k;
        runRooms[k] = def;
      }
    }
    Audio.ui();
    if (nextAct < ACTS) startRoom(nextAct * ROOMS_PER_ACT);
    else { state = 'ending'; endT = 3.4; }
  }

  function drawDoorHall() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#2b2f33';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const n = 3, w = 118, h = 188, gap = 56;
    const totalW = n * w + (n - 1) * gap;
    const x0 = (VIEW_W - totalW) / 2, y0 = (VIEW_H - h) / 2 + 6;
    for (let i = 0; i < n; i++) {
      const dx = x0 + i * (w + gap), sel = i === hallSel;
      ctx.fillStyle = sel ? 'rgba(255,255,255,.94)' : 'rgba(255,255,255,.12)';
      ctx.fillRect(dx, y0, w, h);
      ctx.strokeStyle = sel ? '#0a0a0a' : 'rgba(255,255,255,.42)';
      ctx.lineWidth = sel ? 3 : 1.5;
      ctx.strokeRect(dx + 0.5, y0 + 0.5, w - 1, h - 1);
      const cx = dx + w / 2, cy = y0 + h / 2;
      const ink = sel ? '#0a0a0a' : 'rgba(255,255,255,.75)';
      // 图标（无字）：0 亮门=实心块+光；1 暗门=一道缝；2 记忆门=两道闭眼刻痕
      if (i === 0) {
        ctx.fillStyle = ink; ctx.fillRect(cx - 15, cy - 15, 30, 30);
        ctx.fillStyle = sel ? 'rgba(10,10,10,.35)' : 'rgba(255,255,255,.35)';
        ctx.fillRect(cx - 22, cy - 2, 44, 4);
      } else if (i === 1) {
        ctx.strokeStyle = ink; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy); ctx.stroke();
      } else {
        ctx.strokeStyle = ink; ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy); ctx.lineTo(cx - 4, cy);
        ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 15, cy);
        ctx.stroke();
      }
      if (sel) { ctx.fillStyle = '#0a0a0a'; ctx.fillRect(cx - 20, y0 + h + 12, 40, 3); }
    }
    // 输入提示（纯图形）：← → 选择，▶ 确认
    const hy = VIEW_H - 20;
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    ctx.beginPath(); ctx.moveTo(VIEW_W / 2 - 44, hy); ctx.lineTo(VIEW_W / 2 - 34, hy - 5); ctx.lineTo(VIEW_W / 2 - 34, hy + 5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(VIEW_W / 2 - 16, hy); ctx.lineTo(VIEW_W / 2 - 26, hy - 5); ctx.lineTo(VIEW_W / 2 - 26, hy + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.moveTo(VIEW_W / 2 + 12, hy - 6); ctx.lineTo(VIEW_W / 2 + 12, hy + 6); ctx.lineTo(VIEW_W / 2 + 23, hy); ctx.closePath(); ctx.fill();

    for (let a = 0; a < ACTS; a++) {
      ctx.fillStyle = a < runAct ? 'rgba(255,255,255,.85)' : (a === runAct ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.16)');
      ctx.fillRect(VIEW_W / 2 - 34 + a * 24, VIEW_H - 44, 14, 4);
    }
  }

  /* ------------------------- 输入 ------------------------- */
  function onKeyDown(e) {
    const k = e.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].indexOf(k) >= 0) e.preventDefault();
    Audio.init();
    if (e.repeat) return;
    if (state === 'doorhall') {
      if (k === 'ArrowLeft' || k === 'KeyA') { hallSel = (hallSel + 2) % 3; Audio.ui(); }
      else if (k === 'ArrowRight' || k === 'KeyD') { hallSel = (hallSel + 1) % 3; Audio.ui(); }
      else if (k === 'Space' || k === 'Enter' || k === 'ArrowUp' || k === 'KeyW' || k === 'KeyJ') { hallChoose(); }
      return;
    }
    if (k === 'ArrowLeft' || k === 'KeyA') input.left = true;
    if (k === 'ArrowRight' || k === 'KeyD') input.right = true;
    if (k === 'Space' || k === 'KeyW' || k === 'ArrowUp' || k === 'KeyJ') { input.jump = true; input.jumpEdge = true; }
    if (k === 'ShiftLeft' || k === 'ShiftRight' || k === 'KeyZ' || k === 'KeyK') input.dashEdge = true;
    if (k === 'KeyR' && (state === 'play' || state === 'pause')) restartLevel();
    if (k === 'Escape' || k === 'KeyP') togglePause();
    if (k === 'KeyM') toggleMute();
    if (k === 'Enter' && state === 'clear') nextOrMenu();
  }
  function onKeyUp(e) {
    const k = e.code;
    if (k === 'ArrowLeft' || k === 'KeyA') input.left = false;
    if (k === 'ArrowRight' || k === 'KeyD') input.right = false;
    if (k === 'Space' || k === 'KeyW' || k === 'ArrowUp' || k === 'KeyJ') {
      input.jump = false;
      if (player && player.vy < -220) player.vy *= JCUT;
    }
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // 门厅：鼠标直接点门
  cv.addEventListener('click', (e) => {
    if (state !== 'doorhall') return;
    const rect = cv.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const n = 3, w = 118, gap = 56;
    const totalW = n * w + (n - 1) * gap;
    const x0 = (VIEW_W - totalW) / 2;
    for (let i = 0; i < n; i++) {
      const dx = x0 + i * (w + gap);
      if (x >= dx && x <= dx + w) { hallSel = i; hallChoose(); return; }
    }
  });

  el.touch.querySelectorAll('.tbtn').forEach((b) => {
    const k = b.dataset.k;
    const on = (e) => {
      e.preventDefault(); Audio.init();
      if (k === 'left') input.left = true;
      if (k === 'right') input.right = true;
      if (k === 'jump') { input.jump = true; input.jumpEdge = true; }
      if (k === 'dash') input.dashEdge = true;
    };
    const off = (e) => {
      e.preventDefault();
      if (k === 'left') input.left = false;
      if (k === 'right') input.right = false;
      if (k === 'jump') { input.jump = false; if (player && player.vy < -220) player.vy *= JCUT; }
    };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', off);
  });

  function showTouch() {
    const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    el.touch.classList.toggle('hide', !touch);
  }

  /* ------------------------- 物理 ------------------------- */
  function moveX(p, dx) {
    p.x += dx;
    const y0 = Math.floor((p.y + 2) / TILE), y1 = Math.floor((p.y + p.h - 2) / TILE);
    if (dx > 0) {
      const cx = Math.floor((p.x + p.w - 0.01) / TILE);
      for (let cy = y0; cy <= y1; cy++) if (isSolid(cx, cy)) { p.x = cx * TILE - p.w; p.vx = 0; break; }
    } else if (dx < 0) {
      const cx = Math.floor(p.x / TILE);
      for (let cy = y0; cy <= y1; cy++) if (isSolid(cx, cy)) { p.x = (cx + 1) * TILE; p.vx = 0; break; }
    }
  }

  function moveY(p, dy) {
    p.y += dy;
    const x0 = Math.floor((p.x + 2) / TILE), x1 = Math.floor((p.x + p.w - 2) / TILE);
    if (dy > 0) {
      const cy = Math.floor((p.y + p.h - 0.01) / TILE);
      for (let cx = x0; cx <= x1; cx++) if (isSolid(cx, cy)) {
        p.y = cy * TILE - p.h; p.vy = 0;
        if (!p._wasGround) {              // 只在"真的刚落地"时触发一次
          p._wasGround = true;
          p.onGround = true;
          Audio.land();
          spawnDust(p.x + p.w / 2, p.y + p.h);
        }
        p.onGround = true;
        break;
      }
    } else if (dy < 0) {
      const cy = Math.floor(p.y / TILE);
      for (let cx = x0; cx <= x1; cx++) if (isSolid(cx, cy)) { p.y = (cy + 1) * TILE; p.vy = 0; break; }
    }
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // 是否贴着黑砖（脚下 / 左右）
  function touchSoft(p) {
    const x0 = Math.floor((p.x + 3) / TILE), x1 = Math.floor((p.x + p.w - 3) / TILE);
    if (p.onGround) {
      const by = Math.floor((p.y + p.h + 2) / TILE);
      for (let cx = x0; cx <= x1; cx++) if (val(cx, by) === SOFT) return true;
    }
    const cy0 = Math.floor((p.y + 4) / TILE), cy1 = Math.floor((p.y + p.h - 4) / TILE);
    const lx = Math.floor((p.x - 2) / TILE), rx = Math.floor((p.x + p.w + 2) / TILE);
    for (let cy = cy0; cy <= cy1; cy++) {
      if (val(lx, cy) === SOFT) return true;
      if (val(rx, cy) === SOFT) return true;
    }
    return false;
  }

  /* ------------------------- 光照 ------------------------- */
  function castRay(ox, oy, ang, maxD) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let mx = Math.floor(ox / TILE), my = Math.floor(oy / TILE);
    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    const invX = dx !== 0 ? Math.abs(TILE / dx) : Infinity;
    const invY = dy !== 0 ? Math.abs(TILE / dy) : Infinity;
    let tMaxX = dx !== 0 ? ((dx > 0 ? (mx + 1) * TILE - ox : ox - mx * TILE) / Math.abs(dx)) : Infinity;
    let tMaxY = dy !== 0 ? ((dy > 0 ? (my + 1) * TILE - oy : oy - my * TILE) / Math.abs(dy)) : Infinity;
    if (isSolid(mx, my)) return 0;
    let t = 0;
    for (let i = 0; i < 64; i++) {
      if (tMaxX < tMaxY) { t = tMaxX; mx += stepX; tMaxX += invX; }
      else { t = tMaxY; my += stepY; tMaxY += invY; }
      if (t > maxD) return maxD;
      if (isSolid(mx, my)) return t;
    }
    return maxD;
  }

  function coneAngle(L, t) {
    const natural = L.angle + Math.sin(t * L.speed + L.phase) * L.amp;
    if (curious && curious.L === L) {
      // 停顿：完全静止，不抖。停够之后用 0.9 s 平滑回到原本的摆动轨道
      if (curious.hold > 0) return curious.ang;
      const k = Math.min(1, 1 - curious.fade / 0.9);
      return curious.ang + (natural - curious.ang) * k;
    }
    // 教学灯：2.2 s 内把视线从初始方向平滑摆到你身上（跑不掉，只能停住）
    if (L.track && !L._tutDone && player && player.alive) {
      const px = player.x + player.w / 2, py = player.y + player.h / 2;
      const want = Math.atan2(py - L.y, px - L.x);
      const tt = Math.min(1, level.time / 2.2);
      const k = tt * tt * (3 - 2 * tt);
      return L.angle + (want - L.angle) * k;
    }
    return natural;
  }

  // 灯发现"猎物刚还在"—— 停下、眯起、找一下
  function noticeLight() {
    if (curious) return;
    const p = player;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    for (let i = 0; i < level.lights.length; i++) {
      const L = level.lights[i];
      if (L.type !== 'cone') continue;
      if (!litBy(L, gameTime, cx, cy)) continue;
      curious = { L: L, ang: coneAngle(L, gameTime), hold: 3.6, fade: 0.9 };
      if (L.track) L._tutDone = true;   // 教学灯演过一次就不再追你
      achieve('stare');
      if (Audio.curious) Audio.curious();
      return;
    }
  }
  function pointRange(L, t) {
    const k = L.pulse ? 0.82 + 0.18 * Math.sin(t * L.pulse + L.phase) : 1;
    return L.range * k;
  }
  function laserState(L, t) {
    const per = L.period;
    let tt = (t + (L.phase || 0)) % per;
    if (tt < 0) tt += per;
    return { on: tt < L.dur, warn: tt > per - (L.warn || 0.45) && tt >= L.dur };
  }
  function laserSeg(L) {
    const dx = L.x2 - L.x1, dy = L.y2 - L.y1;
    const len = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx);
    const d = Math.min(len, castRay(L.x1, L.y1, ang, len));
    return { x1: L.x1, y1: L.y1, x2: L.x1 + Math.cos(ang) * d, y2: L.y1 + Math.sin(ang) * d };
  }
  function segRectHit(x1, y1, x2, y2, r) {
    let t0 = 0, t1 = 1;
    const dx = x2 - x1, dy = y2 - y1;
    const p = [-dx, dx, -dy, dy];
    const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
    for (let i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < 1e-9) { if (q[i] < 0) return false; }
      else {
        const t = q[i] / p[i];
        if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
        else { if (t < t0) return false; if (t < t1) t1 = t; }
      }
    }
    return true;
  }

  function litBy(L, t, px, py) {
    if (L.type === 'laser') {
      const st = laserState(L, t);
      if (!st.on) return false;
      const s = laserSeg(L);
      return segRectHit(s.x1, s.y1, s.x2, s.y2, { x: px - 10, y: py - 12, w: 20, h: 24 });
    }
    const dx = px - L.x, dy = py - L.y;
    const d = Math.hypot(dx, dy);
    if (L.type === 'cone') {
      if (d > L.range * 0.97) return false;
      const a = Math.atan2(dy, dx);
      if (Math.abs(angDiff(a, coneAngle(L, t))) > L.spread / 2 - 0.02) return false;
      return castRay(L.x, L.y, a, d + 2) >= d - 1;
    }
    const r = pointRange(L, t) * 0.97;
    if (d > r) return false;
    return castRay(L.x, L.y, Math.atan2(dy, dx), d + 2) >= d - 1;
  }

  function playerLit() {
    if (!player) return false;
    const p = player;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    for (let i = 0; i < level.lights.length; i++) {
      const L = level.lights[i];
      if (L.type === 'laser') { if (litBy(L, gameTime, cx, cy)) return true; continue; }
      if (litBy(L, gameTime, cx, cy)) return true;
      if (litBy(L, gameTime, p.x + 3, p.y + 3)) return true;
      if (litBy(L, gameTime, p.x + p.w - 3, p.y + 3)) return true;
      if (litBy(L, gameTime, p.x + 3, p.y + p.h - 3)) return true;
      if (litBy(L, gameTime, p.x + p.w - 3, p.y + p.h - 3)) return true;
    }
    return false;
  }

  /* ------------------------- 粒子 ------------------------- */
  function burst(x, y, color, n) {
    n = n || 18;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), s = rnd(40, 260);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: rnd(0.3, 0.8), max: 0.8, c: color, r: rnd(1.2, 3.2), g: 900 });
    }
  }
  function spawnDust(x, y) {
    for (let i = 0; i < 5; i++) {
      particles.push({ x: x + rnd(-8, 8), y, vx: rnd(-40, 40), vy: rnd(-60, -10), life: rnd(0.2, 0.4), max: 0.4, c: 'rgba(255,255,255,.85)', r: rnd(0.8, 1.8), g: 300 });
    }
  }
  function spawnTrail() {
    const p = player;
    particles.push({ x: p.x + p.w / 2, y: p.y + p.h / 2 + rnd(-6, 6), vx: -p.face * rnd(20, 90), vy: rnd(-20, 20), life: 0.3, max: 0.3, c: 'rgba(255,255,255,1)', r: rnd(1.5, 3), g: 0 });
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.life -= dt;
      if (q.life <= 0) { particles.splice(i, 1); continue; }
      q.vy += q.g * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.vx *= 0.98;
    }
  }

  /* ------------------------- 逻辑 ------------------------- */
  function die(reason) {
    const p = player;
    if (!p.alive) return;
    p.alive = false; p.deadT = 0.7; p.vx = 0; p.vy = 0; p.dashT = 0; p.merged = false;
    Audio.setMerged(false);
    level.deaths++;
    level.events.push({ type: 'death', u: clamp((p.x + p.w / 2) / (level.cols * TILE), 0, 1), v: clamp((p.y + p.h / 2) / (level.rows * TILE), 0, 1) });
    shakeT = 0.35; shakeMag = 9;
    Audio.die();
    burst(p.x + p.w / 2, p.y + p.h / 2, 'rgba(255,255,255,1)', 26);
    if (reason === 'light') {
      burst(p.x + p.w / 2, p.y + p.h / 2, 'rgba(0,0,0,.9)', 14);
      if (FX.burn) {
        negT = 0.12;
        level.marks.push({ x: p.x, y: p.y, w: p.w, h: p.h, t: 6, max: 6 });
        if (level.marks.length > 8) level.marks.shift();
      }
    }
    updateHud(true);
  }

  function respawn() {
    const p = player;
    p.x = level.spawn.x; p.y = level.spawn.y;
    p.vx = 0; p.vy = 0; p.exposure = 0; p.dashT = 0; p.dashCd = 0;
    p.alive = true; p.deadT = 0; p.onGround = false; p.coyote = 0; p.jumpBuf = 0;
    p.merged = false; p.mergeT = 0; p.eye = 1; p.press = 0; p._wasGround = false;
  }

  function restartLevel() {
    const keepDeaths = level ? level.deaths : 0;
    if (mode === 'run') startRoom(runIdx);
    else startLevel(levelIndex);
    if (level) level.deaths = keepDeaths;
    updateHud(true);
  }

  // 暴露致死时间：随进度收紧（越往后越短 = 越难）。第一关最松 ~1.0s，第三幕最硬 0.35s。
  function exposureSec() {
    if (mode === 'run') {
      if (runIdx === 0) return 1.0;   // 第一间：最容易
      if (runAct === 0) return 0.6;
      if (runAct === 1) return 0.45;
      return 0.35;                     // 第三幕：最硬
    }
    return [1.0, 0.6, 0.5, 0.45, 0.4][levelIndex] || 0.5;
  }

  function step(dt) {
    if (state !== 'play') return;
    gameTime += dt;
    level.time += dt;
    fx = Math.max(0, fx - dt * 3);
    if (shakeT > 0) shakeT -= dt;

    const p = player;

    if (negT > 0) negT -= dt;
    if (!p.alive) {
      p.deadT -= dt;
      if (p.deadT <= 0) respawn();
      updateParticles(dt);
      updateCamera(dt);
      return;
    }

    // 采样玩家真实走过的路（记忆演出的素材，不是通用动画）
    level.traceT -= dt;
    if (level.traceT <= 0 && p.alive) {
      level.traceT = 0.09;
      level.trace.push({
        u: clamp((p.x + p.w / 2) / (level.cols * TILE), 0, 1),
        v: clamp((p.y + p.h / 2) / (level.rows * TILE), 0, 1),
        m: p.merged
      });
      if (level.trace.length > 240) level.trace.shift();
    }
    if (p.jumpBuf > 0) p.jumpBuf -= dt;
    if (p.coyote > 0) p.coyote -= dt;
    if (p.dashCd > 0) p.dashCd -= dt;
    if (p.mergePop > 0) p.mergePop -= dt;
    if (level.lockFlash > 0) level.lockFlash -= dt;
    if (dirFlash > 0) dirFlash -= dt;
    if (level.clueT >= 0 && level.clueT < 1) level.clueT = Math.min(1, level.clueT + dt * 1.6);
    if (curious) {
      if (curious.hold > 0) curious.hold -= dt;
      else { curious.fade -= dt; if (curious.fade <= 0) curious = null; }
    }

    if (input.jumpEdge) { p.jumpBuf = JBUF; input.jumpEdge = false; }
    if (input.dashEdge) {
      input.dashEdge = false;
      if (p.dashCd <= 0) {
        p.dashT = DASH_T; p.dashCd = DASH_CD; p.vy = 0;
        level.events.push({ type: 'dash', u: clamp((p.x + p.w / 2) / (level.cols * TILE), 0, 1), v: clamp((p.y + p.h / 2) / (level.rows * TILE), 0, 1) });
        if (input.left) p.face = -1; else if (input.right) p.face = 1;
        Audio.dash();
      }
    }

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = p.face * DASH_V;
      p.vy *= 0.25;
      p.trail -= dt;
      if (p.trail <= 0) { spawnTrail(); p.trail = 0.03; }
    } else {
      if (dir !== 0) {
        p.vx += dir * ACC * dt;
        p.vx = clamp(p.vx, -RUN, RUN);
        p.face = dir;
      } else {
        const s = Math.sign(p.vx);
        p.vx -= s * FRIC * dt;
        if (Math.sign(p.vx) !== s) p.vx = 0;
      }
      p.vy += GRAV * dt;
      if (p.vy > 1400) p.vy = 1400;
    }

    if (p.jumpBuf > 0 && (p.onGround || p.coyote > 0)) {
      p.vy = -JUMP_V; p.jumpBuf = 0; p.coyote = 0; p.onGround = false; p._wasGround = false;
      Audio.jump(); spawnDust(p.x + p.w / 2, p.y + p.h);
    }

    const wasGround = p.onGround;
    p.onGround = false;
    p._wasGround = wasGround;
    moveX(p, p.vx * dt);
    moveY(p, p.vy * dt);
    if (!p.onGround && p.vy >= 0) {
      const fy = p.y + p.h;
      const x0 = Math.floor((p.x + 2) / TILE), x1 = Math.floor((p.x + p.w - 2) / TILE);
      const cy = Math.floor((fy + 1) / TILE);
      for (let cx = x0; cx <= x1; cx++) if (isSolid(cx, cy) && fy + 1 >= cy * TILE) { p.onGround = true; break; }
    }
    if (wasGround && !p.onGround && p.vy >= 0) p.coyote = COYOTE;

    // ---- 融合：贴着黑砖 + 基本静止 0.08s ----
    const still = Math.abs(p.vx) < MERGE_V;
    const canMerge = p.onGround && still && touchSoft(p);
    if (p.merged) {
      if (!canMerge) {
        p.merged = false; Audio.unmerge(); Audio.setMerged(false);
        if (FX.pressure) { waves.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, t: 0.34, dur: 0.34, from: 8, to: 54 }); waveCount++; }
      }
    } else {
      if (canMerge) {
        p.mergeT += dt;
        if (p.mergeT >= MERGE_T) {
          const wasLit = playerLit();
          p.merged = true; p.mergeT = 0; p.mergePop = 0.22;
          Audio.merge(); Audio.setMerged(true);
          if (FX.pressure) { waves.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, t: 0.16, dur: 0.16, from: 74, to: 8 }); waveCount++; }
          if (wasLit) noticeLight();
          burst(p.x + p.w / 2, p.y + p.h / 2, 'rgba(255,255,255,.9)', 8);
        }
      } else p.mergeT = 0;
    }
    p.eye = lerp(p.eye, p.merged ? 0 : 1, 1 - Math.pow(0.0005, dt));
    // 让手替他记：上局憋过的地方伪装更快，死过的地方更难冷静
    let memRate = 0.0003;
    if (level.prevEvents) {
      const px = p.x + p.w / 2, py = p.y + p.h / 2;
      for (let i = 0; i < level.prevEvents.length; i++) {
        const q = level.prevEvents[i];
        const dx = px - q.u * level.cols * TILE, dy = py - q.v * level.rows * TILE;
        if (dx * dx + dy * dy > 56 * 56) continue;
        if (q.type === 'hold') memRate = 0.00008;
        else if (q.type === 'death') memRate = 0.0009;
      }
    }
    p.memRate = memRate;
    p.press = lerp(p.press, p.merged ? 1 : 0, 1 - Math.pow(memRate, dt));
    if (p.merged) {
      p.holdT += dt;
      if (p.holdT > level.holdBest) {
        level.holdBest = p.holdT;
        level.holdAt = { u: clamp((p.x + p.w / 2) / (level.cols * TILE), 0, 1), v: clamp((p.y + p.h / 2) / (level.rows * TILE), 0, 1) };
      }
    } else p.holdT = 0;

    // ---- 危险 ----
    const body = { x: p.x + 4, y: p.y + 6, w: p.w - 8, h: p.h - 6 };
    for (let i = 0; i < level.spikes.length; i++) {
      if (rectsOverlap(body, level.spikes[i])) { die('spike'); return; }
    }
    if (p.y > level.rows * TILE + 120) { die('fall'); return; }

    const lit = p.merged ? false : playerLit();
    if (lit && level.def.clue && level.clueT < 0) level.clueT = 0;
    if (lit) {
      p.exposure = Math.min(1, p.exposure + dt / exposureSec());
      if (p.exposure > 0.1) runClean = false;   // 被光看到，就再也不是「无痕」了
      if (p.exposure >= 1) {
        if (mode === 'campaign' && levelIndex === 0 && !level._mercy) {
          // 教学关免死一次：灯"被吓退"愣住 3.6 s，给你一口喘息看清"停住"这件事
          level._mercy = true;
          p.exposure = 0;
          negT = 0.16;
          const L = level.lights.find((x) => x.track) || level.lights[0];
          if (L && L.type === 'cone' && !curious) curious = { L, ang: coneAngle(L, gameTime), hold: 3.6, fade: 0.9 };
          if (Audio.curious) Audio.curious();
        } else { die('light'); return; }
      }
      if (Math.random() < dt * 24) burst(p.x + p.w / 2 + rnd(-9, 9), p.y + rnd(0, p.h), 'rgba(255,255,255,1)', 1);
    } else {
      p.exposure = Math.max(0, p.exposure - EXP_DN * (p.merged ? 3 : 1) * dt);
    }
    Audio.setHeat(p.exposure);

    // ---- 碎片 ----
    for (let i = 0; i < level.keys.length; i++) {
      const k = level.keys[i];
      if (k.got) continue;
      const kdx = (p.x + p.w / 2) - k.x, kdy = (p.y + p.h / 2) - k.y;
      const d2 = kdx * kdx + kdy * kdy;

      // 活碎片：你一露出眼睛，它就缩回砖里；你融进去，它才慢慢探出来
      if (k.live && FX.shard) {
        const near = d2 < 110 * 110;
        const wantHide = near && !p.merged;
        k.liveIn = lerp(k.liveIn, wantHide ? 1 : 0, 1 - Math.pow(0.0012, dt));
        if (k.liveIn > 0.5) continue;
      }

      if (k.inWall || k.live) {
        if (!p.merged || d2 > 42 * 42) continue;
      } else if (d2 > 26 * 26) continue;
      k.got = true;
      dirFlash = 0.45;
      Audio.key();
      burst(k.x, k.y, 'rgba(255,255,255,1)', k.inWall ? 30 : 22);
      if (FX.pressure) { waves.push({ x: k.x, y: k.y, t: 0.3, dur: 0.3, from: 6, to: 46 }); waveCount++; }
      syncKeys(); updateHud(true);
    }

    // ---- 出口 ----
    if (keysLeft() === 0 && rectsOverlap(body, level.exit)) { clearLevel(); return; }
    if (keysLeft() > 0 && rectsOverlap(body, level.exit)) {
      level.lockMsgT -= dt;
      if (level.lockMsgT <= 0) { level.lockFlash = 0.55; level.lockMsgT = 0.75; }
    }

    // ---- 结局分歧：集齐碎片后不去开门、而是伪装着不动，就慢慢融回墙里（成为砖）----
    if (levelIndex === LEVELS.length - 1 && keysLeft() === 0 && !rectsOverlap(body, level.exit)) {
      level.stayT = p.merged ? (level.stayT || 0) + dt : 0;
      if (level.stayT >= 5) { triggerBrick(); return; }
    } else if (level.stayT) level.stayT = 0;

    updateParticles(dt);
    updateCamera(dt);
  }

  function keysLeft() {
    let n = 0;
    for (let i = 0; i < level.keys.length; i++) if (!level.keys[i].got) n++;
    return n;
  }

  function updateCamera(dt) {
    const target = clamp(player.x + player.w / 2 - VIEW_W / 2 + player.face * 40, 0, Math.max(0, level.cols * TILE - VIEW_W));
    cam = lerp(cam, target, 1 - Math.pow(0.001, dt));
  }

  function clearLevel() {
    // 记忆跨房间/跨关卡都保留：这一局走过的路 + 三个瞬间
    const keep = [];
    for (let i = 0; i < level.trace.length; i += 3) keep.push(level.trace[i]);
    save.lastTrace = keep.length > 2 ? keep : null;
    const ev = level.events;
    let d = null, sh = null;
    for (let i = 0; i < ev.length; i++) {
      if (ev[i].type === 'death') d = ev[i];
      if (ev[i].type === 'dash') sh = ev[i];
    }
    level.events3 = [
      d ? { type: 'death', u: d.u, v: d.v } : { type: 'hold', u: 0.25, v: 0.85 },
      level.holdAt ? { type: 'hold', u: level.holdAt.u, v: level.holdAt.v } : { type: 'hold', u: 0.55, v: 0.7 },
      sh ? { type: 'dash', u: sh.u, v: sh.v } : { type: 'dash', u: 0.9, v: 0.8 }
    ];
    save.lastEvents = level.events3;
    // 战役模式才动"解锁 / 最佳时间"；一局模式不污染战役存档
    if (mode !== 'run') {
      save.depth = Math.max(save.depth, Math.min(LEVELS.length, levelIndex + 1));
      const best = save.best[levelIndex];
      if (!best || level.time < best) save.best[levelIndex] = level.time;
      save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, levelIndex + 2));
    }
    persist();
    el.hud.classList.add('hide');
    el.touch.classList.add('hide');
    el.scrClear.classList.add('hide');
    Audio.win();
    Audio.setHeat(0);

    // 一局模式：清房 → 记忆过场 / 幕间门厅 / 最终结局
    if (mode === 'run') {
      runScore++;
      const roomInAct = runIdx % ROOMS_PER_ACT;
      const isActEnd = roomInAct === ROOMS_PER_ACT - 1;
      const isLast = runIdx >= runRooms.length - 1;
      if (isLast) {
        endingKind = runClean ? 'shade' : 'light';
        achieve(endingKind);
        state = 'ending'; endT = 3.4;
      } else if (isActEnd) {
        openDoorHall();
      } else {
        state = 'memory'; memT = 2.4;
      }
      return;
    }

    // 战役模式：记忆演出期间 step() 不跑，白闪会卡住不衰减，所以不设 fx
    if (levelIndex === LEVELS.length - 1) {
      endingKind = runClean ? 'shade' : 'light';
      achieve(endingKind);
      state = 'ending'; endT = 3.4;
    }
    else { state = 'memory'; memT = 2.4; }
  }

  // 成为砖：不走进门，选择融回墙里
  function triggerBrick() {
    endingKind = 'brick';
    achieve('brick');
    save.depth = Math.max(save.depth, LEVELS.length);
    persist();
    el.hud.classList.add('hide');
    el.touch.classList.add('hide');
    el.scrClear.classList.add('hide');
    Audio.setHeat(0);
    state = 'ending'; endT = 3.4;
  }

  function nextOrMenu() {
    Audio.ui();
    if (mode === 'run') {
      if (runIdx >= runRooms.length - 1) { toTitle(); return; }
      startRoom(runIdx + 1);
      return;
    }
    if (levelIndex === LEVELS.length - 1) { toTitle(); return; }
    startLevel(levelIndex + 1);
  }

  /* ------------------------- 渲染 ------------------------- */
  function resizeCanvas() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(VIEW_W * DPR);
    cv.height = Math.round(VIEW_H * DPR);
    lcan.width = Math.round(VIEW_W * DPR);
    lcan.height = Math.round(VIEW_H * DPR);
  }

  // 一次性生成 128×128 灰度颗粒，multiply 叠加，只压暗不染色
  function ensureNoise() {
    if (noisePat !== null) return noisePat;
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      const d = g.createImageData(128, 128);
      for (let i = 0; i < d.data.length; i += 4) {
        const v = 234 + Math.floor(Math.random() * 22);
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
        d.data[i + 3] = 255;
      }
      g.putImageData(d, 0, 0);
      noisePat = ctx.createPattern(c, 'repeat');
    } catch (e) { noisePat = false; }
    return noisePat;
  }

  // 记忆演出：回放玩家本关真实走过的路，然后让这条路的末端长出一盏灯。
  // 一镜因果，不解释、不猜谜 —— 玩家认得自己刚做过的事。
  // 三种事件的图形，全部复用玩家在游戏里已经见过的视觉：
  // 烧痕（死过）／闭眼砖屑（憋住过）／冲刺拖尾（冲过去）
  function drawEventMark(mx, my, type, a, ink, dark) {
    ctx.save();
    ctx.globalAlpha = a;
    if (type === 'death') {
      const g = ctx.createRadialGradient(mx, my, 1, mx, my, 15);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'hold') {
      ctx.fillStyle = ink;
      ctx.fillRect(mx - 6, my - 6, 12, 12);
      ctx.fillStyle = dark;
      ctx.fillRect(mx - 3.5, my, 3, 1);
      ctx.fillRect(mx + 1, my, 3, 1);
    } else {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(mx - 10, my); ctx.lineTo(mx + 10, my);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMemoryStage(k, invert) {
    const W = 480, H = 250, X = (VIEW_W - W) / 2, Y = (VIEW_H - H) / 2;
    const ink = invert ? '#101216' : '#f2f3f4';
    const soft = invert ? 'rgba(16,18,22,.35)' : 'rgba(242,243,244,.35)';
    ctx.save();
    ctx.fillStyle = invert ? '#e8eaec' : '#0e1013';
    ctx.fillRect(X, Y, W, H);
    ctx.strokeStyle = invert ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(X + 0.5, Y + 0.5, W - 1, H - 1);

    const px = (u) => X + 34 + u * (W - 68);
    const py = (v) => Y + 34 + v * (H - 68);
    const tr = level.trace || [];
    const reveal = clamp(k / 0.66, 0, 1);
    const n = Math.max(1, Math.floor(tr.length * reveal));

    // 描出这一局走过的路；伪装过的点留一块闭眼砖屑
    if (tr.length > 1) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const q = tr[i];
        if (i === 0) ctx.moveTo(px(q.u), py(q.v));
        else ctx.lineTo(px(q.u), py(q.v));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      for (let i = 0; i < n; i += 7) {
        if (!tr[i].m) continue;
        ctx.fillStyle = ink;
        ctx.fillRect(px(tr[i].u) - 2.5, py(tr[i].v) - 2.5, 5, 5);
        ctx.fillStyle = invert ? '#e8eaec' : '#0e1013';
        ctx.fillRect(px(tr[i].u) - 1.5, py(tr[i].v), 3, 0.8);
      }
    }

    // 三个玩家一定记得的瞬间，依次亮起。不是坐标曲线，是「我死过 / 我憋过 / 我冲过去」
    const marks = level.events3 || [];
    const dark = invert ? '#e8eaec' : '#0e1013';
    for (let i = 0; i < marks.length; i++) {
      const mm = marks[i];
      const on = clamp((k - (0.24 + i * 0.17)) / 0.14, 0, 1);
      if (on <= 0) continue;
      drawEventMark(px(mm.u), py(mm.v), mm.type, on, ink, dark);
    }

    // 因果：路的末端长出一盏灯，灯照回起点 —— 你出去，就成了它
    if (k > 0.72) {
      const a = clamp((k - 0.72) / 0.24, 0, 1);
      const last = tr[n - 1] || { u: 0.5, v: 0.5 };
      const first = tr[0] || { u: 0.1, v: 0.8 };
      const lx = px(last.u), ly = py(last.v) - 24;
      ctx.globalAlpha = a * 0.30;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(px(first.u) - 30, py(first.v) + 16);
      ctx.lineTo(px(first.u) + 30, py(first.v) + 16);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = a;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(lx, ly, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = invert ? '#101216' : '#ffffff';
      ctx.beginPath(); ctx.arc(lx + 3, ly + 4, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // 开场：上一盏灯闭上眼，你从砖里睁开眼。不写字，不解释。
  function drawWake(k) {
    const cx = VIEW_W / 2;
    const a = (x, y) => clamp((k - x) / (y - x), 0, 1);
    ctx.save();
    // 灯与它的光锥（前半段）
    const lampOut = 1 - a(0.34, 0.58);
    if (lampOut > 0) {
      ctx.globalAlpha = lampOut;
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      ctx.beginPath();
      ctx.moveTo(cx, VIEW_H * 0.28);
      ctx.lineTo(cx - 150, VIEW_H * 0.86);
      ctx.lineTo(cx + 150, VIEW_H * 0.86);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, VIEW_H * 0.28, 20 - 6 * a(0.30, 0.52), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx + 5, VIEW_H * 0.28 + 5, 9, 0, Math.PI * 2); ctx.fill();
    }
    // 砖里睁开的两只眼（后半段）
    const wakeIn = a(0.58, 0.78);
    if (wakeIn > 0) {
      ctx.globalAlpha = wakeIn;
      const by = VIEW_H * 0.70;
      ctx.fillStyle = '#0a0a0c';
      roundRect(cx - 16, by - 17, 32, 34, 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.26)';
      ctx.fillRect(cx - 14, by - 17, 28, 2);
      ctx.strokeStyle = 'rgba(255,255,255,.20)';
      ctx.lineWidth = 1;
      roundRect(cx - 15.5, by - 16.5, 31, 33, 2); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      const eh = 8 * a(0.66, 0.84);
      ctx.fillRect(cx - 9, by - eh / 2, 4, eh);
      ctx.fillRect(cx + 5, by - eh / 2, 4, eh);
    }
    ctx.globalAlpha = 1 - a(0.90, 1.0) * 0.999;
    ctx.restore();
  }

  function render() {
    if (state === 'wake') {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = '#08090b';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawWake(clamp(1 - wakeT / 2.4, 0, 1));
      return;
    }
    if (state === 'doorhall') { drawDoorHall(); return; }
    const t = gameTime;
    const shx = shakeT > 0 ? rnd(-1, 1) * shakeMag * (shakeT / 0.35) : 0;
    const shy = shakeT > 0 ? rnd(-1, 1) * shakeMag * (shakeT / 0.35) : 0;
    const camX = Math.round(cam);

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!bgGrad) {
      bgGrad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      bgGrad.addColorStop(0, PAL.bgTop);
      bgGrad.addColorStop(1, PAL.bgBottom);
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (!level) { drawTitleBackdrop(); return; }

    // 远景视差：以 0.4 倍速度平移（越远越慢），制造纵深
    if (level.parallax) {
      ctx.setTransform(DPR, 0, 0, DPR, (shx - camX * 0.4) * DPR, shy * 0.4 * DPR);
      for (let i = 0; i < level.parallax.length; i++) {
        const b = level.parallax[i];
        ctx.fillStyle = 'rgba(0,0,0,' + b.a + ')';
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
    }

    ctx.setTransform(DPR, 0, 0, DPR, (shx - camX) * DPR, shy * DPR);
    drawTiles(camX);
    drawLegacy();
    if (FX.burn) drawMarks();
    if (FX.pressure) drawWaves();
    drawSpikes();
    drawExit(t);
    drawKeys(t);
    drawEyeGlow(t);
    drawPlayer(t);
    drawParticles(false);

    ctx.setTransform(DPR, 0, 0, DPR, shx * DPR, shy * DPR);
    drawLightLayer(t, camX);
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(lcan, 0, 0, VIEW_W, VIEW_H);
    ctx.globalCompositeOperation = 'source-over';

    // 前景粒子用的是世界坐标：这里必须补回相机偏移，否则宽关卡里会整体右偏 camX
    ctx.setTransform(DPR, 0, 0, DPR, (shx - camX) * DPR, shy * DPR);
    drawParticles(true);

    // 以下是贴屏幕的后期层，回到屏幕坐标，避免跟着抖动一起晃
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawExposureVignette();
    drawFrameEdges();

    // 门在这一侧看不见时，屏幕边缘给一道微光：不用文字也知道该往哪走
    if (level && level.exit) {
      const exS = level.exit.x + level.exit.w / 2 - camX;
      const ep = 0.09 + 0.05 * Math.sin(gameTime * 2.2);
      if (exS > VIEW_W + 8) {
        const g = ctx.createLinearGradient(VIEW_W - 110, 0, VIEW_W, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(255,255,255,' + ep + ')');
        ctx.fillStyle = g; ctx.fillRect(VIEW_W - 110, 0, 110, VIEW_H);
      } else if (exS < -8) {
        const g = ctx.createLinearGradient(110, 0, 0, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(255,255,255,' + ep + ')');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 110, VIEW_H);
      }
    }

    const np = ensureNoise();
    if (np) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = np;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalCompositeOperation = 'source-over';
    }

    // 收集碎片后，朝出口那一侧亮一下：不用文字指明方向
    if (dirFlash > 0) {
      const g = ctx.createLinearGradient(VIEW_W - 170, 0, VIEW_W, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,' + (Math.min(1, dirFlash / 0.45) * 0.3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(VIEW_W - 170, 0, 170, VIEW_H);
    }

    // 世界呼吸：24 s 周期 ±7%，对抗静态画面的习惯化
    if (FX.tide) {
      const b = Math.sin(gameTime * (Math.PI * 2 / 24));
      ctx.fillStyle = b > 0
        ? 'rgba(255,255,255,' + (b * 0.05) + ')'
        : 'rgba(0,0,0,' + (-b * 0.07) + ')';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // 结局：三种「对剧本的态度」，各自不同的收场
    if (state === 'ending') {
      const kk = clamp((3.4 - endT) / 1.9, 0, 1);
      if (endingKind === 'light') {
        // 成为灯：先翻转（同一空间，换一个身份重看一遍），再白屏
        if (endT > 1.5) {
          ctx.fillStyle = '#0a0b0d';
          ctx.fillRect(0, 0, VIEW_W, VIEW_H);
          drawMemoryStage(kk, true);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, 1 - endT / 1.5) + ')';
          ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        }
      } else if (endingKind === 'brick') {
        // 成为砖：不走进门，融回墙里——画面被砖色吞掉，只剩两道闭眼刻痕
        ctx.fillStyle = 'rgba(6,6,6,' + kk + ')';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        if (kk > 0.4) {
          const a = (kk - 0.4) / 0.6;
          ctx.fillStyle = 'rgba(255,255,255,' + (0.10 * a) + ')';
          ctx.fillRect(VIEW_W / 2 - 7, VIEW_H / 2 - 14, 14, 1);
          ctx.fillStyle = 'rgba(255,255,255,' + (0.22 * a) + ')';
          ctx.fillRect(VIEW_W / 2 - 6, VIEW_H / 2, 5, 1);
          ctx.fillRect(VIEW_W / 2 + 1, VIEW_H / 2, 5, 1);
        }
      } else {
        // 无痕：一路没被看见——你连痕迹都没留下，白点缩到无
        const a = clamp((3.4 - endT) / 2.6, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,' + (a * 0.98) + ')';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        if (a < 0.82) {
          const r = 3 * (1 - a / 0.82) + 0.5;
          ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * (1 - a / 0.82)) + ')';
          ctx.beginPath(); ctx.arc(VIEW_W / 2, VIEW_H / 2, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // 记忆演出：覆盖在游戏画面之上，不打断判定
    if (state === 'memory') {
      ctx.fillStyle = 'rgba(8,9,11,' + (0.97 * Math.min(1, (1 - memT / 2.4) * 5)) + ')';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawMemoryStage(1 - memT / 2.4, false);
    }

    // 曝光负片：被抓住的那 0.12 s，整个世界反过来
    if (negT > 0) {
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (fx > 0) { ctx.fillStyle = 'rgba(230,245,255,' + (fx * 0.35) + ')'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
  }

  function drawTiles(camX) {
    const echo = (player && player.mergePop > 0) ? player.mergePop / 0.22 : 0;   // 1→0
    const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const x1 = Math.min(level.cols - 1, Math.floor((camX + VIEW_W) / TILE) + 1);
    for (let y = 0; y < level.rows; y++) {
      for (let x = x0; x <= x1; x++) {
        const v = level.grid[y][x];
        if (v === EMPTY) continue;
        const px = x * TILE, py = y * TILE;
        const above = level.grid[y - 1] ? level.grid[y - 1][x] : 0;
        const below = level.grid[y + 1] ? level.grid[y + 1][x] : 0;

        if (v === HARD) {
          ctx.fillStyle = PAL.hard;
          ctx.fillRect(px, py, TILE, TILE);
          if (!above) {                       // 只有暴露的顶面才有亮边与细节
            ctx.fillStyle = PAL.hardTop;
            ctx.fillRect(px, py, TILE, 3);
            ctx.fillStyle = PAL.hardLine;
            ctx.fillRect(px + 6, py + 12, TILE - 12, 1);
          }
          if (!below) {
            ctx.fillStyle = 'rgba(0,0,0,.22)';
            ctx.fillRect(px, py + TILE - 2, TILE, 2);
          }
        } else {
          ctx.fillStyle = PAL.soft;
          ctx.fillRect(px, py, TILE, TILE);
          // 砌块缝：顶边两端留断口 + 一条极淡竖缝，让连续黑带变成"一块块砖"
          ctx.fillStyle = 'rgba(255,255,255,.05)';
          ctx.fillRect(px, py, 1, TILE);
          if (!above) {
            ctx.fillStyle = PAL.softTop;
            ctx.fillRect(px + 2, py, TILE - 4, 2);
            ctx.fillStyle = PAL.softLine;
            ctx.fillRect(px + 3, py + 2, TILE - 6, 1);
          }
        }
        // 接地阴影：底面无砖时向下压一层，避免平台像浮空的条
        if (!below) {
          ctx.fillStyle = 'rgba(0,0,0,.10)';
          ctx.fillRect(px, py + TILE, TILE, 3);
          ctx.fillStyle = 'rgba(0,0,0,.05)';
          ctx.fillRect(px, py + TILE + 3, TILE, 4);
        }
      }
    }
  }

  // 遗迹：嵌在墙里的轮廓 = 前人成功过；地上的漂白印 = 前人失败过
  // 所有「墙里有人」的痕迹共用一套画法：不画方框，只让这一格砖的表面
  // 多出一道顶边断口和两道闭眼刻痕。看起来像建材，不像贴上去的图标。
  function closedEyesOnBrick(cx, cy, a) {
    if (a <= 0) return;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.12 * a) + ')';
    ctx.fillRect(cx - 7, cy - 14, 14, 1);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.26 * a) + ')';
    ctx.fillRect(cx - 6, cy, 5, 1);
    ctx.fillRect(cx + 1, cy, 5, 1);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.24 * a) + ')';
    ctx.fillRect(cx - 6, cy + 1, 5, 1);
    ctx.fillRect(cx + 1, cy + 1, 5, 1);
  }

  function drawLegacy() {
    const gs = level.def.ghosts || [];
    for (let i = 0; i < gs.length; i++) {
      closedEyesOnBrick(gs[i][0] * TILE + TILE / 2, gs[i][1] * TILE + TILE / 2, 1);
    }
    // 线索：第一次被照到后，灯下那格砖慢慢显出闭眼的刻痕
    if (level.def.clue && level.clueT >= 0) {
      const gx = level.def.clue[0] * TILE + TILE / 2;
      const gy = level.def.clue[1] * TILE + TILE / 2;
      closedEyesOnBrick(gx, gy, Math.min(1, level.clueT));
    }
    // 上一局的三个瞬间：贴在砖面上的风化痕迹
    if (level.wallTraces && save.depth > 0) {
      for (let i = 0; i < level.wallTraces.length; i++) {
        const q = level.wallTraces[i];
        if (!q.onSolid) continue;
        ctx.save();
        if (q.type === 'death') {
          const g = ctx.createRadialGradient(q.x + 16, q.y + 3, 1, q.x + 16, q.y + 3, 15);
          g.addColorStop(0, 'rgba(255,255,255,.13)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(q.x + 1, q.y, 30, 13);
        } else if (q.type === 'hold') {
          closedEyesOnBrick(q.x + 16, q.y + 14, 0.55);
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,.10)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(q.x + 6, q.y + 7); ctx.lineTo(q.x + 15, q.y + 3);
          ctx.moveTo(q.x + 12, q.y + 10); ctx.lineTo(q.x + 22, q.y + 5);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    // 记忆片段：通关越多，越多格砖上出现同样的闭眼刻痕
    const sites = level.def.ms || [];
    const shown = Math.min(sites.length, save.depth);
    const fade = Math.min(1, level.time / 0.9);
    for (let i = 0; i < shown; i++) {
      const st = sites[i];
      const mx = st[0] * TILE + TILE / 2, my = st[1] * TILE + TILE / 2;
      if (st[2] === 'g') closedEyesOnBrick(mx, my, fade);
      else {
        const g = ctx.createRadialGradient(mx, my, 1, mx, my, 24);
        g.addColorStop(0, 'rgba(255,255,255,.13)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(mx, my, 24, 0, Math.PI * 2); ctx.fill();
      }
    }
    const sc = level.def.scars || [];
    for (let i = 0; i < sc.length; i++) {
      const sx = sc[i][0] * TILE + TILE / 2, sy = sc[i][1] * TILE + TILE / 2;
      const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, 26);
      g.addColorStop(0, 'rgba(255,255,255,.16)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 被光烧穿后留在砖面上的轮廓：你的失误会留在关卡里
  function drawMarks() {
    for (let i = 0; i < level.marks.length; i++) {
      const m = level.marks[i];
      const a = Math.min(1, m.t / m.max);
      const g = ctx.createRadialGradient(m.x + m.w / 2, m.y + m.h / 2, 2, m.x + m.w / 2, m.y + m.h / 2, m.w * 1.15);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.17 * a) + ')');
      g.addColorStop(0.7, 'rgba(255,255,255,' + (0.07 * a) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      roundRect(m.x - 3, m.y - 3, m.w + 6, m.h + 6, 4);
      ctx.fill();
    }
  }

  // 影压：压平自己是"向下压"，不画向外扩散的圆。
  // 只在脚下留一道水平压痕，收束 / 展开，避免大圆抢走画面。
  function drawWaves() {
    for (let i = 0; i < waves.length; i++) {
      const w = waves[i];
      const k = 1 - w.t / w.dur;
      const half = (w.from + (w.to - w.from) * k) * 0.5;
      const a = 0.20 * (1 - k);
      ctx.strokeStyle = 'rgba(255,255,255,' + a + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(w.x - half, w.y + 12);
      ctx.lineTo(w.x + half, w.y + 12);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,' + (a * 0.4) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w.x - half, w.y + 13.5);
      ctx.lineTo(w.x + half, w.y + 13.5);
      ctx.stroke();
    }
  }

  function drawSpikes() {
    ctx.fillStyle = '#000000';
    for (let i = 0; i < level.spikes.length; i++) {
      const s = level.spikes[i];
      const n = Math.max(1, Math.round((s.w + 10) / 16));
      const step = (s.w + 10) / n;
      for (let j = 0; j < n; j++) {
        const bx = s.x - 5 + j * step;
        ctx.beginPath();
        ctx.moveTo(bx, s.y + s.h + 14);
        ctx.lineTo(bx + step / 2, s.y - 2);
        ctx.lineTo(bx + step, s.y + s.h + 14);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawKeys(t) {
    for (let i = 0; i < level.keys.length; i++) {
      const k = level.keys[i];
      if (k.got) continue;
      let vis = 1;
      if (k.inWall) {
        vis = (player && player.merged && nearPlayer(k, 74)) ? 1 : 0.18;
      }
      const hide = k.live ? k.liveIn : 0;
      if (k.live) vis = 1 - hide * 0.82;
      const kx = k.x;
      const ky = k.y + Math.sin(t * 2.2 + i) * (k.inWall ? 1.2 : 3) * (1 - hide);
      const y = ky + (k.hy - k.y) * hide;
      const lead = (i === 0 && !k.inWall && !k.live) ? 1 + 0.22 * (0.5 + 0.5 * Math.sin(t * 2.5)) : 1;
      const s = (k.inWall ? 3 : 3.5) * lead;
      ctx.save();
      ctx.globalAlpha = vis;
      ctx.translate(kx, y);
      ctx.fillStyle = 'rgba(244,246,248,.94)';
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.fillRect(-s, -s, s * 2, 1);
      ctx.fillStyle = 'rgba(10,11,13,.78)';
      ctx.fillRect(-s + 1.2, -0.4, s - 1, 1);
      ctx.fillRect(1, -0.4, s - 1, 1);
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-s - 0.5, -s - 0.5, s * 2 + 1, s * 2 + 1);
      ctx.restore();
    }
  }

  function nearPlayer(o, r) {
    if (!player) return false;
    const dx = player.x + player.w / 2 - o.x, dy = player.y + player.h / 2 - o.y;
    return dx * dx + dy * dy < r * r;
  }

  function drawExit(t) {
    const e = level.exit;
    const open = keysLeft() === 0;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
    const w = e.w, h = e.h;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    if (open) {
      g.addColorStop(0, 'rgba(255,255,255,' + (0.55 + pulse * 0.35) + ')');
      g.addColorStop(1, 'rgba(255,255,255,.08)');
    } else {
      g.addColorStop(0, 'rgba(0,0,0,.22)');
      g.addColorStop(1, 'rgba(0,0,0,.06)');
    }
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = open ? 'rgba(255,255,255,' + (0.7 + pulse * 0.3) + ')' : 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
    if (open) {
      for (let i = 0; i < 4; i++) {
        const yy = -h / 2 + ((t * 60 + i * 17) % h);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fillRect(-w / 2 + 4, yy, w - 8, 1.5);
      }
    }
    ctx.restore();

    // 三个插座：收集进度直接长在门上，不需要文字
    const got = level.keys.length - keysLeft();
    const flash = level.lockFlash > 0 ? (0.5 + 0.5 * Math.sin(gameTime * 34)) : 1;
    for (let i = 0; i < level.keys.length; i++) {
      const sx = e.x + e.w / 2 + (i - (level.keys.length - 1) / 2) * 13;
      const sy = e.y - 9;
      ctx.save();
      ctx.translate(sx, sy);
      if (i < got) {
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.fillRect(-3, -3, 6, 6);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + flash * 0.45) + ')';
        ctx.lineWidth = 1;
        ctx.strokeRect(-3, -3, 6, 6);
      }
      ctx.restore();
    }
  }

  // 眼睛的辉光画在世界层、方块之前：光晕在体外，方块本体保持纯黑
  function drawEyeGlow(t) {
    const p = player;
    if (!p || !p.alive || p.eye < 0.08) return;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const r = 20 + p.eye * 12;
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.30 * p.eye) + ')');
    g.addColorStop(0.45, 'rgba(255,255,255,' + (0.09 * p.eye) + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawPlayer(t) {
    const p = player;
    if (!p.alive) {
      const k = 1 - p.deadT / 0.7;
      ctx.globalAlpha = Math.max(0, 0.5 - k * 0.5);
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
      ctx.globalAlpha = 1;
      return;
    }
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const open = p.eye;
    const pr = p.press || 0;

    // 伪装 = 摊成脚下那一格砖：位置、尺寸、圆角、表面细节全部对齐网格
    const footY = Math.floor((p.y + p.h + 2) / TILE);
    const tx = Math.floor(cx / TILE);
    const k = pr;
    const X = lerp(p.x, tx * TILE + 1, k);
    const Y = lerp(p.y, footY * TILE + 1, k);
    const W = lerp(p.w, TILE - 2, k);
    const H = lerp(p.h, TILE - 2, k);
    const rad = 3 - 3 * k;

    ctx.save();
    ctx.fillStyle = p.merged ? PAL.soft : PAL.player;
    roundRect(X, Y, W, H, rad);
    ctx.fill();

    if (k > 0.02) {
      // 抄走砖块的表面：顶边（同样留断口）+ 竖缝 + 内衬线
      ctx.fillStyle = PAL.softTop;
      ctx.fillRect(X + 2, Y, W - 4, 2 * k);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.05 * k) + ')';
      ctx.fillRect(X, Y, 1, H);
      ctx.fillRect(X + 2, Y + 2, W - 4, 1);
    }

    if (p.exposure > 0.02) {
      ctx.strokeStyle = 'rgba(255,' + Math.round(200 - p.exposure * 90) + ',' + Math.round(140 - p.exposure * 90) + ',' + (0.25 + p.exposure * 0.75) + ')';
      ctx.lineWidth = 1.4;
      roundRect(X + 0.5, Y + 0.5, W - 1, H - 1, rad);
      ctx.stroke();
    } else if (k < 0.55) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.10 * open) + ')';
      ctx.lineWidth = 1.4;
      roundRect(X + 0.5, Y + 0.5, W - 1, H - 1, rad);
      ctx.stroke();
    } else {
      // 伪装的破绽只有一条极淡的缝，够自己找到自己
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.09 + 0.02 * Math.sin(t * 2.2)) + ')';
      ctx.lineWidth = 1;
      roundRect(X + 0.5, Y + 0.5, W - 1, H - 1, rad);
      ctx.stroke();
    }

    const ecx = X + W / 2, ecy = Y + H / 2;
    if (open > 0.06) {
      const eh = 4.4 * open;
      const ex = ecx + (p.face > 0 ? -3 : 0);
      ctx.fillStyle = p.exposure > 0.5 ? '#ffffff' : 'rgba(255,255,255,' + (0.75 + 0.25 * open) + ')';
      ctx.fillRect(ex, ecy - eh / 2, 3, eh);
      ctx.fillRect(ex + 6, ecy - eh / 2, 3, eh);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      ctx.fillRect(ecx - 3, ecy, 3, 0.8);
      ctx.fillRect(ecx + 3, ecy, 3, 0.8);
    }
    ctx.restore();

    // 暴露环：贴着你画一圈，别只靠屏幕底那条 3px 的条
    if (p.exposure > 0.02 && !p.merged) {
      ctx.beginPath();
      ctx.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.exposure);
      ctx.strokeStyle = 'rgba(255,' + Math.round(210 - 90 * p.exposure) + ',' + Math.round(150 - 90 * p.exposure) + ',' + (0.35 + 0.55 * p.exposure) + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 伪装瞬间的收敛环
    if (p.mergePop > 0) {
      const k = 1 - p.mergePop / 0.22;
      ctx.beginPath();
      ctx.arc(cx, cy, 8 + k * 26, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * (1 - k)) + ')';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    if (p.dashCd > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCd / DASH_CD));
      ctx.strokeStyle = 'rgba(255,255,255,.28)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawParticles(front) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < particles.length; i++) {
      const q = particles[i];
      const a = clamp(q.life / q.max, 0, 1);
      ctx.globalAlpha = a * (front ? 0.9 : 0.6);
      ctx.fillStyle = q.c;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r * (front ? 1 : 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawLightLayer(t, camX) {
    lctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    lctx.clearRect(0, 0, VIEW_W, VIEW_H);
    lctx.setTransform(DPR, 0, 0, DPR, -camX * DPR, 0);
    lctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < level.lights.length; i++) {
      const L = level.lights[i];
      if (L.type === 'cone') drawCone(L, t);
      else if (L.type === 'point') drawPoint(L, t);
      else if (L.type === 'laser') drawLaser(L, t);
    }

    // 玩家身边的微光：黑暗里勉强能看清落脚点，不构成"光源"
    if (player && player.alive) {
      const px = player.x + player.w / 2, py = player.y + player.h / 2;
      const g = lctx.createRadialGradient(px, py, 0, px, py, 210);
      g.addColorStop(0, 'rgba(255,255,255,.055)');
      g.addColorStop(0.55, 'rgba(255,255,255,.025)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      lctx.fillStyle = g;
      lctx.beginPath(); lctx.arc(px, py, 210, 0, Math.PI * 2); lctx.fill();
    }

    // 暴露时，眼睛是黑暗里唯一发亮的东西——它会把光引过来
    for (let i = 0; i < level.keys.length; i++) {
      const k = level.keys[i];
      if (k.got) continue;
      let ka = k.inWall ? ((player && player.merged && nearPlayer(k, 74)) ? 0.16 : 0.03) : 0.06;
      if (i === 0 && !k.inWall && !k.live) ka = 0.13 + 0.05 * Math.sin(gameTime * 2.5);
      const g = lctx.createRadialGradient(k.x, k.y, 0, k.x, k.y, 26);
      g.addColorStop(0, 'rgba(255,255,255,' + ka + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      lctx.fillStyle = g;
      lctx.beginPath(); lctx.arc(k.x, k.y, 26, 0, Math.PI * 2); lctx.fill();
    }
    if (keysLeft() === 0) {
      const ex = level.exit.x + level.exit.w / 2, ey = level.exit.y + level.exit.h / 2;
      const g = lctx.createRadialGradient(ex, ey, 0, ex, ey, 90);
      g.addColorStop(0, 'rgba(255,255,255,.50)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      lctx.fillStyle = g;
      lctx.beginPath(); lctx.arc(ex, ey, 90, 0, Math.PI * 2); lctx.fill();
    }
    lctx.globalCompositeOperation = 'source-over';
  }

  function drawBulb(x, y) {
    const g = lctx.createRadialGradient(x, y, 0, x, y, 22);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    lctx.fillStyle = g;
    lctx.beginPath(); lctx.arc(x, y, 22, 0, Math.PI * 2); lctx.fill();
    lctx.fillStyle = '#ffffff';
    lctx.beginPath(); lctx.arc(x, y, 3.2, 0, Math.PI * 2); lctx.fill();
  }

  /* 灯不是灯具，是一只看守这里的眼睛：白环是虹膜，黑瞳朝着视线方向。
     不画眼白、不画高光——一旦可爱化，冷酷感就没了。 */
  function drawWarden(x, y, ang, contract) {
    if (!FX.warden) { drawBulb(x, y); return; }
    const g = lctx.createRadialGradient(x, y, 0, x, y, 26);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.45, 'rgba(255,255,255,.30)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    lctx.fillStyle = g;
    lctx.beginPath(); lctx.arc(x, y, 26, 0, Math.PI * 2); lctx.fill();

    // 瞳孔必须用 source-over 画：光照层是加法混合，画黑色等于没画
    lctx.globalCompositeOperation = 'source-over';
    const r = contract ? 6.2 : 9;
    lctx.fillStyle = '#0a0a0c';
    lctx.beginPath(); lctx.arc(x, y, r - 0.6, 0, Math.PI * 2); lctx.fill();
    lctx.strokeStyle = 'rgba(255,255,255,.9)';
    lctx.lineWidth = 1.2;
    lctx.beginPath(); lctx.arc(x, y, r, 0, Math.PI * 2); lctx.stroke();

    // 瞳仁朝视线方向偏移一点点，就读成"在看"
    lctx.fillStyle = '#ffffff';
    lctx.beginPath();
    lctx.arc(x + Math.cos(ang) * (r * 0.34), y + Math.sin(ang) * (r * 0.34), r * 0.3, 0, Math.PI * 2);
    lctx.fill();
    lctx.globalCompositeOperation = 'lighter';
  }

  function drawCone(L, t) {
    const ang = coneAngle(L, t);
    const squint = (curious && curious.L === L) ? 0.82 : 1;
    const half = (L.spread / 2) * squint, range = L.range;
    // 体积雾：一层不参与遮挡的圆晕，让光束边缘有空气感
    hazeGlow(L.x, L.y, range * 0.92, 0.055);
    coneFan(L, ang, half, range, squint < 1 ? 1.12 : 1);
    drawWarden(L.x, L.y, ang, squint < 1);
  }

  function hazeGlow(x, y, r, a) {
    const g = lctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,' + a + ')');
    g.addColorStop(0.5, 'rgba(255,255,255,' + (a * 0.45) + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    lctx.fillStyle = g;
    lctx.beginPath(); lctx.arc(x, y, r, 0, Math.PI * 2); lctx.fill();
  }

  function coneFan(L, ang, half, range, k) {
    lctx.beginPath();
    lctx.moveTo(L.x, L.y);
    for (let i = 0; i <= RAY_CONE; i++) {
      const a = ang - half + (half * 2 * i) / RAY_CONE;
      const d = castRay(L.x, L.y, a, range);
      lctx.lineTo(L.x + Math.cos(a) * d, L.y + Math.sin(a) * d);
    }
    lctx.closePath();
    const g = lctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, range);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.72 * k) + ')');
    g.addColorStop(0.28, 'rgba(255,255,255,' + (0.40 * k) + ')');
    g.addColorStop(0.66, 'rgba(255,255,255,' + (0.16 * k) + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    lctx.fillStyle = g;
    lctx.fill();
  }

  function drawPoint(L, t) {
    const r = pointRange(L, t);
    lctx.beginPath();
    for (let i = 0; i <= RAY_POINT; i++) {
      const a = (Math.PI * 2 * i) / RAY_POINT;
      const d = castRay(L.x, L.y, a, r);
      const px = L.x + Math.cos(a) * d, py = L.y + Math.sin(a) * d;
      if (i === 0) lctx.moveTo(px, py); else lctx.lineTo(px, py);
    }
    lctx.closePath();
    const g = lctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, r);
    g.addColorStop(0, 'rgba(255,255,255,.62)');
    g.addColorStop(0.5, 'rgba(255,255,255,.26)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    lctx.fillStyle = g;
    lctx.fill();
    drawBulb(L.x, L.y);
  }

  function drawLaser(L, t) {
    const st = laserState(L, t);
    const s = laserSeg(L);
    lctx.lineCap = 'round';
    if (st.on) {
      lctx.strokeStyle = 'rgba(255,255,255,.20)'; lctx.lineWidth = 18;
      lctx.beginPath(); lctx.moveTo(s.x1, s.y1); lctx.lineTo(s.x2, s.y2); lctx.stroke();
      lctx.strokeStyle = 'rgba(255,255,255,.55)'; lctx.lineWidth = 7;
      lctx.beginPath(); lctx.moveTo(s.x1, s.y1); lctx.lineTo(s.x2, s.y2); lctx.stroke();
      lctx.strokeStyle = '#ffffff'; lctx.lineWidth = 2;
      lctx.beginPath(); lctx.moveTo(s.x1, s.y1); lctx.lineTo(s.x2, s.y2); lctx.stroke();
    } else if (st.warn) {
      const k = 0.25 + 0.55 * Math.abs(Math.sin(t * 26));
      lctx.strokeStyle = 'rgba(255,255,255,' + k + ')';
      lctx.lineWidth = 1.4;
      lctx.setLineDash([7, 9]);
      lctx.beginPath(); lctx.moveTo(s.x1, s.y1); lctx.lineTo(s.x2, s.y2); lctx.stroke();
      lctx.setLineDash([]);
    } else {
      lctx.strokeStyle = 'rgba(255,255,255,.12)'; lctx.lineWidth = 1;
      lctx.beginPath(); lctx.moveTo(s.x1, s.y1); lctx.lineTo(s.x2, s.y2); lctx.stroke();
    }
    drawBulb(s.x1, s.y1);
  }

  function drawExposureVignette() {
    const p = player;
    if (!p || p.exposure <= 0.01) return;
    const k = p.exposure;
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.55, VIEW_W / 2, VIEW_H / 2, VIEW_H * 1.02);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,' + (0.10 * k) + ')');
    g.addColorStop(1, 'rgba(255,255,255,' + (0.55 * k) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawFrameEdges() {
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.3, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  const bgBlocks = [];
  for (let i = 0; i < 16; i++) bgBlocks.push({ x: rnd(0, VIEW_W), y: rnd(0, VIEW_H), s: rnd(10, 54), v: rnd(4, 16), a: rnd(0.02, 0.07) });
  function drawTitleBackdrop() {
    for (let i = 0; i < bgBlocks.length; i++) {
      const b = bgBlocks[i];
      b.y -= b.v * 0.016;
      if (b.y < -80) { b.y = VIEW_H + 60; b.x = rnd(0, VIEW_W); }
      ctx.fillStyle = 'rgba(0,0,0,' + (b.a * 1.6) + ')';
      ctx.fillRect(b.x, b.y, b.s, b.s);
    }
    const g = ctx.createRadialGradient(VIEW_W * 0.72, VIEW_H * 0.42, 0, VIEW_W * 0.72, VIEW_H * 0.42, 360);
    g.addColorStop(0, 'rgba(255,255,255,.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  /* ------------------------- HUD ------------------------- */
  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const ss = s - m * 60;
    return m + ':' + (ss < 10 ? '0' : '') + ss.toFixed(1);
  }
  function buildLvPips() {
    if (!el.lvPips) return;
    el.lvPips.innerHTML = '';
    const n = mode === 'run' ? (runRooms.length || 15) : LEVELS.length;
    const cur = mode === 'run' ? runIdx : levelIndex;
    for (let i = 0; i < n; i++) {
      const b = document.createElement('i');
      if (i < cur) b.className = 'done';
      else if (i === cur) b.className = 'on';
      el.lvPips.appendChild(b);
    }
  }

  function syncKeys() {
    const spans = el.hudKeys.children;
    for (let i = 0; i < spans.length; i++) {
      spans[i].classList.toggle('got', i < level.keys.length && level.keys[i].got);
    }
  }

  let lastHud = 0, lastStatus = null;
  function updateHud(force) {
    if (!level || state !== 'play') return;
    const now = performance.now();
    if (!force && now - lastHud < 60) return;
    lastHud = now;
    const e = player ? player.exposure : 0;
    el.exposeFill.style.width = (e * 100).toFixed(0) + '%';
    el.expose.classList.toggle('on', e > 0.02);
    const merged = player && player.merged;
    if (merged !== lastStatus) {
      lastStatus = merged;
      el.status.classList.toggle('safe', !!merged);
    }
  }

  // 无文字版本：所有提示改为场景内的视觉反馈，保留空实现以免遗漏调用点
  function toast() {}

  /* ------------------------- 状态切换 ------------------------- */
  function toTitle() {
    state = 'title';
    mode = 'campaign';
    level = null; player = null; lastStatus = null;
    input.left = input.right = input.jump = false;
    el.hud.classList.add('hide');
    el.touch.classList.add('hide');
    el.scrPause.classList.add('hide');
    el.scrClear.classList.add('hide');
    el.scrTitle.classList.remove('hide');
    buildLevelList();
    el.scrTitle.style.animation = 'none';
    void el.scrTitle.offsetWidth;
    el.scrTitle.style.animation = '';
  }

  function togglePause() {
    if (state === 'play') {
      state = 'pause';
      el.scrPause.classList.remove('hide');
      Audio.setHeat(0);
    } else if (state === 'pause') {
      state = 'play';
      el.scrPause.classList.add('hide');
      Audio.init();
    }
  }

  function toggleMute() {
    Audio.muted = !Audio.muted;
    if (Audio.master) Audio.master.gain.value = Audio.muted ? 0 : 0.5;
  }

  function buildLevelList() {
    el.lvList.innerHTML = '';
    LEVELS.forEach((L, i) => {
      const b = document.createElement('button');
      b.className = 'lvbtn';
      const dots = document.createElement('span');
      dots.className = 'dots';
      for (let d = 0; d <= i; d++) dots.appendChild(document.createElement('i'));
      b.appendChild(dots);
      b.disabled = i >= save.unlocked;
      b.addEventListener('click', () => { Audio.init(); Audio.ui(); startLevel(i); });
      el.lvList.appendChild(b);
    });
  }

  /* ------------------------- 主循环 ------------------------- */
  const FIXED = 1 / 120;
  let acc = 0, last = performance.now(), fpsT = 0, fpsN = 0;

  function frame(now) {
    const raw = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (state === 'play') {
      acc += raw;
      let guard = 0;
      while (acc >= FIXED && guard++ < 8) { step(FIXED); acc -= FIXED; }
    } else if (state === 'wake') {
      acc = 0;
      wakeT -= raw;
      if (wakeT <= 0) { if (wakeNext === 'run') startRoom(0); else startLevel(0); }
    } else if (state === 'doorhall') {
      acc = 0;
      gameTime += raw;
    } else if (state === 'memory') {
      acc = 0;
      if (!memFreeze) memT -= raw;
      if (memT <= 0) {
        if (mode === 'run') startRoom(runIdx + 1);   // 一局模式：过场结束直接进下一间房
        else { state = 'clear'; el.scrClear.classList.remove('hide'); }
      }
    } else if (state === 'ending') {
      acc = 0;
      endT -= raw;
      if (endT <= 0) { toTitle(); }
    } else {
      acc = 0;
      if (state === 'title') gameTime += raw;
    }
    updateHud(false);
    render();

    fpsT += raw; fpsN++;
    if (fpsT >= 0.5) {
      el.fps.textContent = Math.round(fpsN / fpsT) + ' FPS';
      fpsT = 0; fpsN = 0;
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------- 绑定 ------------------------- */
  function startIntro() {
    Audio.init(); Audio.ui();
    wakeNext = 'campaign';
    state = 'wake';
    wakeT = 2.4;
    el.scrTitle.classList.add('hide');
  }
  // 一局模式：先播开场（灯闭眼→砖睁眼），再进第一间房
  function beginRun(seed) {
    Audio.init(); Audio.ui();
    mode = 'run';
    assembleRun(seed == null ? (Date.now() & 0x7fffffff) : seed);
    runIdx = 0; runAct = 0; runPath = []; runScore = 0; runClean = true;
    wakeNext = 'run';
    state = 'wake';
    wakeT = 2.4;
    el.scrTitle.classList.add('hide');
  }
  $('#btnStart').addEventListener('click', startIntro);   // 主入口回到手工设计的 5 关战役
  $('#btnLevels').addEventListener('click', () => {
    Audio.init(); Audio.ui();
    el.lvList.classList.toggle('hide');
    if (!el.lvList.classList.contains('hide')) buildLevelList();
  });
  $('#btnResume').addEventListener('click', () => { Audio.ui(); togglePause(); });
  $('#btnRestart').addEventListener('click', () => { Audio.ui(); el.scrPause.classList.add('hide'); state = 'play'; restartLevel(); });
  $('#btnQuit').addEventListener('click', () => { Audio.ui(); toTitle(); });
  $('#btnNext').addEventListener('click', () => nextOrMenu());
  $('#btnReplay').addEventListener('click', () => { Audio.ui(); startLevel(levelIndex); });
  $('#btnMenu').addEventListener('click', () => { Audio.ui(); toTitle(); });

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('blur', () => { if (state === 'play') togglePause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(); });

  resizeCanvas();
  buildLevelList();
  showTouch();
  requestAnimationFrame(frame);

  window.UMBRA = {
    LEVELS, startLevel, input,
    get state() { return state; },
    get player() { return player; },
    get level() { return level; },
    get curious() { return curious; },
    get waveCount() { return waveCount; },
    get clueT() { return level ? level.clueT : -1; },
    get depth() { return save.depth; },
    get wakeT() { return wakeT; },
    get memRate() { return player ? (player.memRate || 0.0003) : 0.0003; },
    startIntro: startIntro,
    previewMemory: (k) => { state = 'memory'; memT = 2.4 * (1 - clamp(k, 0, 1)); memFreeze = true; },
    get memoryShown() { return level ? Math.min((level.def.ms || []).length, save.depth) : 0; },
    get negT() { return negT; },
    get endingKind() { return endingKind; },
    get runClean() { return runClean; },
    get ach() { return save.ach || {}; },
    get mode() { return mode; },
    get exposureSec() { return exposureSec(); },
    get runIdx() { return runIdx; },
    get runRooms() { return runRooms; },
    get runPath() { return runPath; },
    assembleRun, startRun, beginRun, startRoom, openDoorHall, hallChoose,
    ascii: (idx) => roomAscii(idx)
  };
})();
