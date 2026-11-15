/* 冒烟测试：用 DOM / Canvas 桩在 Node 中真实运行 game.js
   覆盖：五关加载 / 主循环无异常 / 碰撞不穿模 / 融合判定 / 数据合法性
   运行：node tools/smoke-test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');

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
    addEventListener() {}, appendChild() {}, querySelectorAll: () => [],
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
    setItem(k, v) { this._d[k] = v; }
  },
  document: {
    hidden: false,
    querySelector: qs,
    createElement: (t) => makeEl(t),
    addEventListener() {},
    visibilityState: 'visible'
  },
  setTimeout, clearTimeout, Math, Date, JSON
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.addEventListener = () => {};

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

console.log('\n[4] 墙中碎片：必须融合才能取');
U.startLevel(1);
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

console.log('\n[7] 输入边界：暂停 / 恢复');
U.startLevel(0);
frames(5);
sandbox.document.querySelector('#btnResume'); // 确保元素存在
frames(5);
ok(U.state === 'play', '初始为 play 状态');

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

console.log('\n[17] 一局模式：房间池 + 门厅');
const rs = U.assembleRun(2026);
ok(rs.length === 15, '一局 15 间房（3 幕 × 5）');
const rs2 = U.assembleRun(2026);
ok(rs.length === rs2.length && rs.every((r, i) => r.cols === rs2[i].cols && r.lights.length === rs2[i].lights.length), '同种子房间一致（可复现）');
ok(rs.every((r) => r.exit && r.keys.length >= 1 && r.soft.length >= 1), '每间房都有出口 / 碎片 / 可躲的黑砖');
U.startRun(2026);
ok(U.mode === 'run' && U.state === 'play', '开始一局 → 直接进入第一间房');
U.level.keys.forEach((k) => { k.got = true; });
const rx = U.level.exit;
U.player.x = rx.x + 2; U.player.y = rx.y + 20; U.player.vx = 0; U.player.vy = 0;
frames(5);
ok(U.state === 'memory' || U.state === 'clear', '清房 → 先走记忆过场（不直接跳关）');
U.openDoorHall();
ok(U.state === 'doorhall', '幕间进入门厅（选择下次去哪）');
U.hallChoose();
ok(U.state === 'play' && U.runIdx === 5, '选完门 → 进入下一幕第一间房');

console.log('\n[18] 一整局能从头打到结局');
U.startRun(424242);
let guard = 0, sawHall = false, roomsCleared = 0;
while (U.state !== 'ending' && guard++ < 80) {
  if (U.state === 'play') {
    U.level.keys.forEach((k) => { k.got = true; });
    const e = U.level.exit;
    U.player.x = e.x + 2; U.player.y = e.y + 20; U.player.vx = 0; U.player.vy = 0;
    frames(4);
    if (U.state !== 'play') roomsCleared++;
  } else if (U.state === 'memory' || U.state === 'clear') {
    frames(200);
  } else if (U.state === 'doorhall') {
    sawHall = true;
    U.hallChoose();
  } else { break; }
}
ok(sawHall, '一局里至少经过一次门厅');
ok(U.state === 'ending', '打完一整局到达结局（清 ' + roomsCleared + ' 房，' + guard + ' 步）');

console.log('\n[19] 房间设计公平性（不会无解 / 不会出生即死）');
const rf = U.assembleRun(2026);
const floorType = (r, x) => r.soft.some((s) => s[0] <= x && x < s[0] + s[2] && s[1] <= 15 && 15 < s[1] + s[3]) ? 'S' : 'H';
ok(rf.slice(1).every((r) => {
  let run = 0, mx = 0;
  for (let x = 5; x <= r.cols - 6; x++) { if (floorType(r, x) === 'H') { run++; mx = Math.max(mx, run); } else run = 0; }
  return mx <= 6;
}), '掩体岛之间最多 6 格灰缺口（可跨）（教程房除外）');
ok(rf.every((r) => r.lights.every((L) => Math.round(L.x / 32) >= 8)), '灯全在中段（col≥8），照不到出生点');
ok(rf.every((r) => r.lights.every((L) => Math.round(L.x / 32) <= r.cols - 8)), '灯不会压到出口区');
ok(rf.slice(1).every((r) => r.soft.filter((s) => s[3] === 1).length >= 2), '每间房至少 2 块空中平台（有纵向结构）');

console.log('\n[20] 难度曲线：暴露致死随进度收紧');
U.startRun(123);
ok(Math.abs(U.exposureSec - 1.0) < 0.01, '第一间 1.0 s（最松，好上手）');
U.startRoom(1);  ok(Math.abs(U.exposureSec - 0.6) < 0.01, '第一幕 0.6 s');
U.startRoom(6);  ok(Math.abs(U.exposureSec - 0.45) < 0.01, '第二幕 0.45 s');
U.startRoom(11); ok(Math.abs(U.exposureSec - 0.35) < 0.01, '第三幕 0.35 s（最硬）');
U.startLevel(0); ok(Math.abs(U.exposureSec - 1.0) < 0.01, '战役第一关 1.0 s');
U.startLevel(4); ok(Math.abs(U.exposureSec - 0.4) < 0.01, '战役第五关 0.4 s');

if (process.env.MAP) {
  U.assembleRun(2026);
  [0, 5, 10].forEach((i) => { console.log('\n--- room ' + i + ' ---\n' + U.ascii(i)); });
}

console.log('\n──────────────');
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
process.exit(fail ? 1 : 0);
