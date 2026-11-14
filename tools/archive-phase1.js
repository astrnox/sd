// 从子代理 transcript 中回收 Phase 1 完整产出并落盘
// 用法: node tools/archive-phase1.js
const fs = require('fs');
const path = require('path');

const SUB = 'C:/Users/admin/.workbuddy/projects/e-workboddy输出-2026-11-14-12-32-09/0f22816e-d219-4bdb-a358-617cf40237a0/subagents';
const OUT = path.resolve(__dirname, '..');

function pick(file, idx) {
  const lines = fs.readFileSync(path.join(SUB, file), 'utf8').split('\n').filter(Boolean);
  let a = JSON.parse(lines[idx]).arguments;
  if (typeof a === 'string') a = JSON.parse(a);
  return a.content;
}

const analyst = pick('agent-1a03e3fa-2cf8-4d2c-9167-d00a039b4e64.jsonl', 57);
const designerRaw = pick('agent-5a67cca4-7612-4b77-b50c-64f381e6ce73.jsonl', 47);

// designer 正文前有一段「交付说明（致主理人）」，抽出放到文末附录，避免 Phase 2 成员误读为正文
const marker = '# UMBRA《暗隙》游戏设计文档（GDD）· 详细版';
const i = designerRaw.indexOf(marker);
let designerBody = designerRaw;
let designerNote = '';
if (i > 0) {
  designerNote = designerRaw.slice(0, i).replace(/\n---\s*$/, '').trim();
  designerBody = designerRaw.slice(i);
}

const metaA = `<!-- 归档元信息
文档名：UMBRA《暗隙》竞品拆解报告
作者角色：game-design-workshop-analyst（沈竞帆）
版本：v1.0 ｜ 数据抓取日期：2026-11-14 ｜ 阶段：Phase 1
对应真值表：T12-a ~ T12-p（登记见 GDD_参数与真值表.md §6.2）
归档方式：由主理人从子代理回传原文逐字回收，未改动任何数值与结论
-->

`;

const metaD = `<!-- 归档元信息
文档名：UMBRA《暗隙》GDD 正文（详细版 11 章）
作者角色：game-design-workshop-designer（文思远）
版本：v1.0 ｜ 阶段：Phase 1
对应真值表：T1–T4、T8、T9（T9 全篇保持草案）
归档方式：由主理人从子代理回传原文逐字回收，未改动任何数值与结论
-->

`;

fs.writeFileSync(path.join(OUT, 'GDD_竞品拆解.md'), metaA + analyst.trim() + '\n', 'utf8');
fs.writeFileSync(
  path.join(OUT, 'GDD_正文.md'),
  metaD + designerBody.trim() + (designerNote ? `\n\n---\n\n## 附录 Z · 原交付说明（致主理人，非正文）\n\n${designerNote}\n` : ''),
  'utf8'
);

for (const f of ['GDD_竞品拆解.md', 'GDD_正文.md']) {
  const p = path.join(OUT, f);
  const s = fs.readFileSync(p, 'utf8');
  const heads = s.split('\n').filter(l => /^##\s/.test(l)).map(l => l.trim());
  console.log(`\n== ${f} == ${Buffer.byteLength(s, 'utf8')} B, ${s.split('\n').length} 行`);
  heads.slice(0, 40).forEach(h => console.log('  ' + h));
}
