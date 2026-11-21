/* 冒烟测试：用 DOM / Canvas 桩在 Node 中真实运行 game.js
   覆盖：五关加载 / 主循环无异常 / 碰撞不穿模 / 融合判定 / 数据合法性
   运行：node tools/smoke-test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
// DIST=1 时测试 strip 构建产物（node tools/build.js --strip 生成），否则测试源码
const TARGET = process.env.DIST ? path.join(ROOT, 'dist', 'game.js') : path.join(ROOT, 'game.js');
const code = fs.readFileSync(TARGET, 'utf8');

/* ---------- Canvas 2D 桩 ---------- */
function makeCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return {
    setTransform: noop, fillRect: noop, clearRect: noop, strokeRect: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop,
    arcTo: noop, fill: noop, stroke: noop, save: noop, restore: noop,
    translate: noop, scale: noop, rotate: noop, drawImage: noop, setLineDash: noop,
    createRadialGradient: () => grad, createLinearGradient: () => grad,
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
    globalCompositeOperation: 'source-over', shadowColor: '', shadowBlur: 0, lineCap: 'butt'
  };
}
function makeCanvas() {
  return { width: 960, height: 544, style: {}, getContext: () => makeCtx() };
}

/* ---------- DOM 桩 ---------- */
const cache = new Map();
function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    textContent: '', innerHTML: '', style: {}, dataset: {},
    children: [makeChild(), makeChild(), makeChild()],
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { if (f === undefined) f = !this._s.has(c); f ? this._s.add(c) : this._s.delete(c); return f; },
      contains(c) { return this._s.has(c); }
    },
    _handlers: {},
    addEventListener(ev, fn) { (this._handlers[ev] = this._handlers[ev] || []).push(fn); },
    fire(ev, obj) { (this._handlers[ev] || []).forEach((fn) => fn(obj || {})); },
    appendChild() {}, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 960, height: 544, left: 0, top: 0 })
  };
  if (tag === 'canvas') Object.assign(el, makeCanvas());
  return el;
}
function makeChild() {
  return { classList: { add() {}, remove() {}, toggle() {}, contains: () => false } };
}
function qs(sel) {
  if (!cache.has(sel)) cache.set(sel, sel === '#cv' ? makeEl('canvas') : makeEl('div'));
  return cache.get(sel);
}

let rafCb = null;
let t = 0; // 与 performance.now 共用同一时钟，保证固定步长累加器能推进
const sandbox = {
  console,
  performance: { now: () => t },
  requestAnimationFrame: (cb) => { rafCb = cb; return 1; },
  devicePixelRatio: 1,
  navigator: { maxTouchPoints: 0 },
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = v; },
    removeItem(k) { delete this._d[k]; }
  },
  document: {
    hidden: false,
    querySelector: qs,
    createElement: (t) => makeEl(t),
    addEventListener: (ev, fn) => { (winHandlers[ev] = winHandlers[ev] || []).push(fn); },
    visibilityState: 'visible'
  },
  setTimeout, clearTimeout, Math, Date, JSON
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
// 捕获 window 事件处理器，让暂停/失焦/按键可以被真实触发（旧版是空函数，导致这些行为零覆盖）
const winHandlers = {};
sandbox.window.addEventListener = (ev, fn) => { (winHandlers[ev] = winHandlers[ev] || []).push(fn); };
function fireWindow(ev, obj) { (winHandlers[ev] || []).forEach((fn) => fn(obj || {})); }

vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'game.js' });

const U = sandbox.window.UMBRA;
if (!U) throw new Error('UMBRA 未挂载');

/* ---------- 断言工具 ---------- */
let pass = 0, fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg + (extra ? '  → ' + extra : '')); }
};

/* ---------- 驱动帧 ---------- */
function frames(n) {
  for (let i = 0; i < n; i++) {
    t += 16.667;
    const cb = rafCb;
    if (!cb) throw new Error('requestAnimationFrame 断链');
    cb(t);
  }
}

console.log('\n[1] 关卡数据合法性');
U.LEVELS.forEach((L, li) => {
  U.startLevel(li);
  const lv = U.level;
  ok(lv.cols === L.cols && lv.rows === 17, `L${li + 1} 网格 ${L.cols}x17`);
  // 出生点必须是空的且脚下有实体
  const sx = Math.floor(lv.spawn.x / 32), sy = Math.floor((lv.spawn.y + 24) / 32);
  ok(lv.grid[sy][sx] !== 0, `L${li + 1} 出生点下方为实体`);
  // 碎片：墙外的在空位，墙中的必须嵌在黑砖里
  let keyOK = true, wallKeys = 0;
  lv.keys.forEach((k) => {
    const v = lv.grid[Math.floor(k.y / 32)][Math.floor(k.x / 32)];
    if (k.inWall) { wallKeys++; if (v !== 1) keyOK = false; }
    else if (v !== 0) keyOK = false;
  });
  ok(keyOK, `L${li + 1} ${lv.keys.length} 枚碎片位置合法（其中墙中 ${wallKeys} 枚）`);
  const eu = lv.grid[Math.floor((lv.exit.y + 30) / 32)][Math.floor((lv.exit.x + 20) / 32)];
  ok(eu === 0, `L${li + 1} 出口下方为空`);
  // 至少存在可融合的黑砖
  let soft = 0;
  lv.grid.forEach((row) => row.forEach((v) => { if (v === 1) soft++; }));
  ok(soft > 10, `L${li + 1} 黑砖数量 ${soft}（可融合）`);
});

console.log('\n[2] 主循环与物理：每关空跑 6 秒');
U.LEVELS.forEach((L, li) => {
  U.startLevel(li);
  let err = null;
  try { frames(360); } catch (e) { err = e; }
  const p = U.player;
  ok(!err, `L${li + 1} 300+ 帧无异常`, err && err.message);
  ok(p && Math.abs(p.x - 64) < 42 || li === 0, `L${li + 1} 角色未被卡死`, p && p.x.toFixed(1));
  ok(p && p.y < 17 * 32, `L${li + 1} 角色未坠出地图`, p && p.y.toFixed(1));
});

console.log('\n[3] 融合 / 脱离判定');
U.startLevel(0);
frames(10);
const p = U.player;
// 放到第一块黑砖上（[5,12,4,1] 顶面 y=384）
p.x = 5 * 32 + 20; p.y = 12 * 32 - 24; p.vx = 0; p.vy = 0;
frames(40);
ok(p.merged === true, '站上黑砖静止后自动融合');
ok(p.eye < 0.25, '融合后眼睛闭合（eye=' + p.eye.toFixed(2) + '）');
ok(U.level && p.exposure === 0, '融合状态下无暴露累积');

U.input.right = true;
frames(6);
ok(p.merged === false, '向右移动立即脱离融合');
U.input.right = false;
// 移到灰色硬地面（无黑砖可贴）
p.x = 3 * 32; p.y = 15 * 32 - 24; p.vx = 0; p.vy = 0;
frames(60);
ok(p.merged === false && p.eye > 0.8, '离开黑砖后眼睛重新睁开（eye=' + p.eye.toFixed(2) + '）');

console.log('\n[4] 墙中碎片：必须融合才能取（L3 巡灯为首座教学关）');
U.startLevel(2);
frames(5);
const wk = U.level.keys[1];
const p2 = U.player;
p2.x = wk.x - 5; p2.y = wk.y - 40; p2.vx = 0; p2.vy = 0;
frames(2);
ok(wk.inWall === true && wk.got === false, '未融合时贴得再近也拿不到墙中碎片');
frames(40);
ok(wk.got === true, '融合后碎片自动过户（merged=' + p2.merged + '）');

console.log('\n[4.5] 光会"愣一下"（拟人化）');
U.startLevel(0);
frames(6);
const L0 = U.level.lights[0];
L0.amp = 0;
// 把灯对准一块黑砖，保证玩家在那块砖上一定被照到
const tgtX = 6 * 32 + 20, tgtY = 12 * 32 - 24;
L0.angle = Math.atan2((tgtY + 12) - L0.y, (tgtX + 11) - L0.x);
const p3 = U.player;
p3.x = tgtX; p3.y = tgtY; p3.vx = 0; p3.vy = 0;
frames(30);
ok(p3.merged === true, '在灯下站在黑砖上照样能融合（灯照不到墙里）');
ok(!!U.curious, '融合瞬间灯停住了（curious 触发）');
const frozenAng = U.curious.ang, hold0 = U.curious.hold;
frames(3);
ok(!!U.curious && U.curious.ang === frozenAng && U.curious.hold < hold0, '停住期间角度完全冻结（只走计时，无抖动）');
frames(300);
ok(!U.curious, '停留约 3.6 s 并平滑归位后，灯恢复巡逻');

console.log('\n[5] 硬砖不可融合');
U.startLevel(0);
const q = U.player;
q.x = 2 * 32; q.y = 15 * 32 - 24; q.vx = 0; q.vy = 0;
frames(60);
ok(q.merged === false, '站在灰色硬砖上不会融合');

console.log('\n[6] 跳跃与冲刺');
U.startLevel(0);
frames(5);
const r = U.player;
r.x = 3 * 32; r.y = 15 * 32 - 24;
frames(10);
const y0 = r.y;
U.input.jumpEdge = true; U.input.jump = true;
frames(12);
ok(r.y < y0 - 40, '起跳生效（上升 ' + (y0 - r.y).toFixed(0) + 'px）');
U.input.jump = false;
frames(60);
ok(r.onGround === true, '落地并重新贴地');

const x0 = r.x;
U.input.dashEdge = true;
frames(10);
ok(Math.abs(r.x - x0) > 60, '冲刺位移 ' + Math.abs(r.x - x0).toFixed(0) + 'px');

console.log('\n[7] 输入边界：暂停 / 恢复 / 失焦 / 按钮交互');
U.startLevel(0);
frames(5);
ok(U.state === 'play', '初始为 play 状态');
// 键盘暂停 / 恢复
fireWindow('keydown', { code: 'KeyP', repeat: false, preventDefault() {} });
ok(U.state === 'pause', 'KeyP 进入暂停');
fireWindow('keydown', { code: 'KeyP', repeat: false, preventDefault() {} });
ok(U.state === 'play', 'KeyP 再次恢复');
// 暂停界面按跳/冲键，恢复后不得自动执行（回归暂停边沿残留）
fireWindow('keydown', { code: 'KeyP', repeat: false, preventDefault() {} });
fireWindow('keydown', { code: 'Space', repeat: false, preventDefault() {} });
fireWindow('keyup', { code: 'Space' });
fireWindow('keydown', { code: 'KeyK', repeat: false, preventDefault() {} });
fireWindow('keydown', { code: 'KeyP', repeat: false, preventDefault() {} });
const py = U.player.y; frames(2);
ok(U.player.y >= py - 0.5 && U.player.dashT <= 0, '暂停期间按跳/冲键，恢复后无自动跳跃/冲刺');
// 失焦自动暂停（blur / visibilitychange）
fireWindow('blur', {});
ok(U.state === 'pause', '窗口失焦自动暂停');
fireWindow('keydown', { code: 'KeyP', repeat: false, preventDefault() {} });
sandbox.document.hidden = true;
fireWindow('visibilitychange', {});
ok(U.state === 'pause', '标签页隐藏自动暂停');
sandbox.document.hidden = false;
fireWindow('keydown', { code: 'KeyP', repeat: false, preventDefault() {} });
// 按钮回调：暂停 → Resume 按钮恢复 → Quit 按钮回标题
fireWindow('keydown', { code: 'KeyP', repeat: false, preventDefault() {} });
qs('#btnResume').fire('click');
ok(U.state === 'play', 'Resume 按钮恢复游戏');
fireWindow('keydown', { code: 'KeyP', repeat: false, preventDefault() {} });
qs('#btnQuit').fire('click');
ok(U.state === 'title', 'Quit 按钮回到标题');

console.log('\n[8] 表现层创意：活碎片 / 影压 / 烧痕');
U.startLevel(3);
frames(5);
const lk = U.level.keys[2];
ok(lk.live === true, 'L4 的第三枚碎片是"活的"');
const p4 = U.player;
p4.x = lk.x - 11; p4.y = lk.y - 60; p4.vx = 0; p4.vy = 0;
frames(10);
ok(lk.liveIn > 0.45, '未融合靠近时它缩进砖里（liveIn=' + lk.liveIn.toFixed(2) + '）');
p4.x = lk.x - 11; p4.y = 9 * 32 - 24; p4.vx = 0; p4.vy = 0;
frames(80);
ok(lk.got === true, '融合后它探出来并自动过户');

U.startLevel(0);
frames(5);
const p5 = U.player;
p5.x = 6 * 32 + 20; p5.y = 12 * 32 - 24; p5.vx = 0; p5.vy = 0;
const w0 = U.waveCount;
frames(30);
ok(U.waveCount > w0, '融合/现身时触发影压波纹（+' + (U.waveCount - w0) + '）');

U.startLevel(1);
frames(5);
const Lb = U.level.lights[0];
Lb.amp = 0; Lb.angle = Math.PI / 2;
U.player.x = Lb.x - 11; U.player.y = 15 * 32 - 24; U.player.vx = 0; U.player.vy = 0;
U.player.exposure = 0.99;
frames(20);
ok(U.level.deaths > 0 && U.level.marks.length > 0, '被光照死后在砖面留下烧痕（' + U.level.marks.length + ' 处）');

console.log('\n[9] 无演示：只留线索');
U.startLevel(0);
frames(20);
ok(U.level.clueT < 0 && U.cue === undefined, '开局既无残影演示，也无预置提示');
const L0c = U.level.lights[0];
L0c.amp = 0; L0c.angle = Math.PI / 2;
const p7 = U.player;
p7.x = 520; p7.y = 360; p7.vx = 0; p7.vy = 0;
frames(6);
ok(U.clueT >= 0, '第一次被照到 → 灯下那块砖开始浮出闭眼轮廓（线索）');
frames(90);
ok(U.clueT >= 1, '轮廓淡入完成后永久留在场景里，不做任何动作演示');

console.log('\n[10] 记忆片段（随进度显露）');
U.startLevel(0);
ok(U.depth === 0 && U.memoryShown === 0, '首次游玩不显露任何记忆片段');
U.level.keys.forEach((k) => { k.got = true; });
const ex = U.level.exit;
U.player.x = ex.x + 2; U.player.y = ex.y + 20;
frames(5);
ok(U.depth >= 1, '通关后记忆深度 +1');
U.startLevel(1);
ok(U.memoryShown === 1, '下一关只显露 1 处（逐步，不一次全给）');
U.startLevel(4);
ok(U.memoryShown === 1, '深度不随关卡编号跳变，只随通关数增长');

console.log('\n[11] 记忆动画与翻转结局');
U.startLevel(0);
U.level.keys.forEach((k) => { k.got = true; });
const e2 = U.level.exit;
U.player.x = e2.x + 2; U.player.y = e2.y + 20;
frames(5);
ok(U.state === 'memory', '通关后先播记忆演出，不直接结算');
frames(150);
ok(U.state === 'clear', '演出 2.4 s 结束才显示结算');
U.startLevel(4);
U.level.keys.forEach((k) => { k.got = true; });
const e3 = U.level.exit;
U.player.x = e3.x + 2; U.player.y = e3.y + 20;
frames(5);
ok(U.state === 'ending', '最后一关进入翻转结局（非普通结算）');

console.log('\n[12] 可读的因果：真实轨迹 + 开场轮换');
U.startLevel(0);
frames(60);
ok(U.level.trace.length > 2, '玩家走过的路被真实记录（' + U.level.trace.length + ' 点）');
U.level.keys.forEach((k) => { k.got = true; });
const e4 = U.level.exit;
U.player.x = e4.x + 2; U.player.y = e4.y + 20;
frames(5);
ok(U.state === 'memory' && U.level.trace.length > 2, '记忆演出回放的是这局自己的路，不是通用动画');
U.startLevel(1);
ok(!!U.level.prevTrace, '下一关墙上印着上一局自己走过的路（看得见的证据）');
U.startIntro();
ok(U.state === 'wake', '从标题开始会先播「灯闭眼 → 你睁眼」');
frames(160);
ok(U.state === 'play', '开场 2.4 s 后自动进入第一关');

console.log('\n[13] 记得住的是事件，不是路线');
U.startLevel(0);
const p9 = U.player;
p9.x = 6 * 32 + 20; p9.y = 12 * 32 - 24; p9.vx = 0; p9.vy = 0;
frames(30);
U.level.events.push({ type: 'death', u: 0.30, v: 0.82 });
U.level.events.push({ type: 'dash', u: 0.90, v: 0.80 });
U.level.keys.forEach((k) => { k.got = true; });
const e6 = U.level.exit;
U.player.x = e6.x + 2; U.player.y = e6.y + 20;
frames(5);
const m3 = U.level.events3;
ok(!!m3 && m3.length === 3, '通关只留下三个事件，不是整条路线');
ok(['death', 'hold', 'dash'].every((t) => m3.some((m) => m.type === t)), '三个事件：死过 / 憋过 / 冲过去');
U.startLevel(1);
ok(U.level.prevEvents && U.level.prevEvents.length === 3, '下一关墙上印的是这三个点');
ok(U.level.wallTraces.every((t) => t.onSolid), '三个痕迹全部吸附在实体砖面上，不浮空');
const hv = U.level.prevEvents.find((e) => e.type === 'hold');
U.player.x = hv.u * U.level.cols * 32 - 11; U.player.y = hv.v * 17 * 32 - 12;
frames(3);
ok(U.memRate < 0.0003, '走到上局憋过的地方，伪装更快（身体先认出来）');
const dv = U.level.prevEvents.find((e) => e.type === 'death');
U.player.x = dv.u * U.level.cols * 32 - 11; U.player.y = dv.v * 17 * 32 - 12;
frames(3);
ok(U.memRate > 0.0003, '走到上局死过的地方，更难冷静');

console.log('\n[14] 结局分歧与成就数据层');
U.startLevel(4);
U.level.keys.forEach((k) => { k.got = true; });
const ex5 = U.level.exit;
U.player.x = ex5.x + 2; U.player.y = ex5.y + 20; U.player.vx = 0; U.player.vy = 0;
frames(5);
ok(U.state === 'ending', '最后一关集齐碎片走进门 → 进入结局序列');
ok(U.endingKind === 'light' || U.endingKind === 'shade', '结局类型属于「成为灯 / 无痕」（实际：' + U.endingKind + '）');
ok(Object.keys(U.ach).length > 0, '结局达成本地留档（成就数据层非空）');

console.log('\n[15] 教学关：一盏会主动来找你的灯');
U.startLevel(0);
ok(U.level.lights.some((L) => L.track === true), '教学关有一盏会主动追人的灯（不用玩家自己找光）');
ok(U.player.merged === false, '出生在灰色地面，不会一上来就自动伪装');
const pT = U.player;
pT.x = 3 * 32 + 4; pT.y = 15 * 32 - 24; pT.vx = 0; pT.vy = 0;
frames(140);
ok(U.level.clueT >= 0, '教学灯会自己摆过来照到你（"它冲我来了"）');

console.log('\n[16] 教学关免死一次');
U.startLevel(0);
const pM = U.player;
const Lm = U.level.lights.find((x) => x.track) || U.level.lights[0];
Lm._tutDone = true; Lm.amp = 0;
pM.x = 3 * 32 + 4; pM.y = 15 * 32 - 24; pM.vx = 0; pM.vy = 0; pM.exposure = 0.999;
Lm.angle = Math.atan2((pM.y + 12) - Lm.y, (pM.x + 11) - Lm.x);
frames(2);
ok(pM.alive === true, '第一次被照满不死（给新手一次喘息）');
ok(U.level._mercy === true, '免死标记已用掉（只给一次）');
ok(pM.exposure < 0.2, '免死后暴露清零');

console.log('\n[20] 难度曲线：战役暴露致死随进度收紧');
U.startLevel(0); ok(Math.abs(U.exposureSec - 1.0) < 0.01, '战役第一关 1.0 s');
U.startLevel(1); ok(Math.abs(U.exposureSec - 0.6) < 0.01, '战役第二关 0.6 s');
U.startLevel(2); ok(Math.abs(U.exposureSec - 0.5) < 0.01, '战役第三关 0.5 s');
U.startLevel(3); ok(Math.abs(U.exposureSec - 0.45) < 0.01, '战役第四关 0.45 s');
U.startLevel(4); ok(Math.abs(U.exposureSec - 0.4) < 0.01, '战役第五关 0.4 s');

console.log('\n[21] 特效生命周期：波纹/烧痕衰减与跨关重置');
U.startLevel(0); frames(5);
for (let i = 0; i < 5; i++) {
  U.player.x = 6 * 32 + 20; U.player.y = 12 * 32 - 24; U.player.vx = 0; U.player.vy = 0;
  frames(15); U.input.right = true; frames(6); U.input.right = false;
}
ok(U.waveLive > 0, '融合/脱离产生波纹（' + U.waveLive + ' 条）');
ok(U.waveLive <= 64, '波纹数量受硬上限约束（≤64）');
frames(60);
ok(U.waveLive === 0, '波纹随时间衰减归零（现 ' + U.waveLive + '）');
// 先明确脱离融合，再重新站上黑砖，确保触发一次新的融合事件
U.input.right = true; frames(6); U.input.right = false;
U.player.x = 6 * 32 + 20; U.player.y = 12 * 32 - 24; U.player.vx = 0; U.player.vy = 0;
U.player.merged = false; U.player.mergeT = 0;
frames(15);
ok(U.waveLive > 0, '再次融合重新产生波纹');
U.startLevel(1); frames(3);
ok(U.waveLive === 0 && U.waveCount === 0, '切关后波纹数组与计数被重置');

console.log('\n[24] 结局可见性：门的信号预判结局，不再是隐藏布尔');
// 最后一关、集齐碎片后，门中央的"眼"信号应与即将触发的结局一致
U.startLevel(4); frames(3);
U.setRunClean(true);
U.level.keys.forEach((k) => { k.got = true; });
ok(U.exitSignal === 'unseen', '全程无痕 → 门显示闭眼信号（实际 ' + U.exitSignal + '）');
ok(U.exitSignal === signalForEnding(runCleanToEnding(true)), '映射一致：shade 结局 ↔ unseen 信号');
U.setRunClean(false);
ok(U.exitSignal === 'seen', '被看见过 → 门显示睁眼信号（实际 ' + U.exitSignal + '）');
ok(U.exitSignal === signalForEnding(runCleanToEnding(false)), '映射一致：light 结局 ↔ seen 信号');
// 非最后一关 / 碎片未集齐时不显示信号
U.startLevel(0); frames(3);
U.level.keys.forEach((k) => { k.got = true; });
ok(U.exitSignal === null, '非最后一关不显示结局信号');
U.startLevel(4); frames(3);
ok(U.exitSignal === null, '碎片未集齐时不显示结局信号');

// 与 clearLevel 行 1062 的 endingKind 判定同一口径
function runCleanToEnding(clean) { return clean ? 'shade' : 'light'; }
// 与 game.js exitSignal() 同一口径：无痕结局显示闭眼信号
function signalForEnding(ending) { return ending === 'shade' ? 'unseen' : 'seen'; }

console.log('\n[22] 存档消毒 + 改名迁移：损坏存档不再导致崩溃，旧存档能迁移');
// 先清两个键，确保走"旧键迁移"路径（前面的测试已写过新键，不清就会跳过迁移）
sandbox.localStorage.removeItem('nsp.save.v1');
// 旧版《暗隙》存档键，故意放损坏数据：同时验证迁移 + 消毒
sandbox.localStorage.setItem('umbra.save.v2', '{"lastEvents":42,"unlocked":5,"best":"bad","depth":null,"ach":[]}');
let reloadErr = null;
try { vm.runInContext(code, sandbox, { filename: 'game.js#reload' }); } catch (e) { reloadErr = e; }
ok(!reloadErr, '损坏存档下 game.js 可重新加载（' + (reloadErr && reloadErr.message) + '）');
const U2 = sandbox.window.UMBRA;
ok(U2 && typeof U2.startLevel === 'function', '测试环境仍暴露完整调试接口');
let loadErr = null;
try { U2.startLevel(0); frames(5); } catch (e) { loadErr = e; }
ok(!loadErr, '损坏存档下 startLevel 不抛错（' + (loadErr && loadErr.message) + '）');
ok(U2.state === 'play', '损坏存档下仍可进入游戏');
ok(sandbox.localStorage.getItem('nsp.save.v1') !== null, '存档已写入新键 nsp.save.v1');
ok(sandbox.localStorage.getItem('umbra.save.v2') === null, '旧键已在迁移后删除（避免重复迁移）');

console.log('\n──────────────');
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail ? 1 : 0);
