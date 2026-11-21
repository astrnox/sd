/* 发布构建：把三件套打包到 dist/，可选 --strip 去注释/空行以满足包体预算。
   用法：node tools/build.js [--strip]
   默认（无 strip）：原样复制 index.html/style.css/game.js 到 dist/
   --strip：剥离 game.js 的整行 // 与 /* *\/ 注释、空行；保留字符串与正则中的 // （状态机处理）
   不修改源文件，只写 dist/。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const STRIP = process.argv.includes('--strip');

function stripJs(src) {
  let out = '', i = 0, n = src.length;
  let state = 'code';           // code | lineComment | blockComment | single | double | template | regex
  let lineStart = true;         // 当前行是否只有空白（用于整行注释的换行处理）
  let regexAllowed = true;      // 上一有效 token 是否允许正则字面量

  const isIdent = (c) => /[A-Za-z0-9_$]/.test(c || '');
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (state === 'lineComment') {
      if (c === '\n') { state = 'code'; out += c; lineStart = true; i++; }
      else i++;
      continue;
    }
    if (state === 'blockComment') {
      if (c === '*' && d === '/') { state = 'code'; i += 2; }
      else { if (c === '\n') { out += c; lineStart = true; } i++; }
      continue;
    }
    if (state === 'single' || state === 'double' || state === 'template') {
      const q = state === 'single' ? "'" : state === 'double' ? '"' : '`';
      out += c;
      if (c === '\\' && i + 1 < n) { out += src[i + 1]; i += 2; continue; }
      if (c === q) { state = 'code'; regexAllowed = false; }
      i++; continue;
    }
    if (state === 'regex') {
      out += c;
      if (c === '\\' && i + 1 < n) { out += src[i + 1]; i += 2; continue; }
      if (c === '/') { state = 'code'; regexAllowed = false; }
      i++; continue;
    }
    // code
    if (c === '/' && d === '/') {
      // 整行注释才剥；行尾注释也剥（前面有代码时保留该行其余内容）
      state = 'lineComment'; i += 2; continue;
    }
    if (c === '/' && d === '*') { state = 'blockComment'; i += 2; continue; }
    if (c === "'") { state = 'single'; out += c; regexAllowed = false; i++; continue; }
    if (c === '"') { state = 'double'; out += c; regexAllowed = false; i++; continue; }
    if (c === '`') { state = 'template'; out += c; regexAllowed = false; i++; continue; }
    if (c === '/' && regexAllowed) { state = 'regex'; out += c; i++; continue; }
    out += c;
    if (!/\s/.test(c)) regexAllowed = isIdent(c) || /[)\]}]/.test(c);
    // 保留非空行的换行；空行整行丢弃
    if (c === '\n') {
      const lastLine = out.slice(out.lastIndexOf('\n', out.length - 2) + 1, out.length - 1);
      if (lastLine.trim() === '') out = out.slice(0, out.lastIndexOf('\n', out.length - 2) + 1) + '\n';
      lineStart = true;
    }
    i++;
  }
  // 收尾：合并连续超过一个的空行为单个（strip 目标）
  out = out.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
  return out;
}

fs.mkdirSync(OUT, { recursive: true });
const files = ['index.html', 'style.css', 'game.js'];
let total = 0;
for (const f of files) {
  let data = fs.readFileSync(path.join(ROOT, f));
  if (STRIP && f === 'game.js') {
    // 归一化为 LF 再 strip，避免 CRLF 干扰字节口径
    data = Buffer.from(stripJs(data.toString('utf8').replace(/\r\n/g, '\n')), 'utf8');
  }
  fs.writeFileSync(path.join(OUT, f), data);
  total += data.length;
  console.log(`  ${f.padEnd(12)} ${String(data.length).padStart(7)} B`);
}
console.log(`合计 ${total} B  (${STRIP ? '发布口径 strip' : '原始复制'})`);
console.log(`T13-d raw ≤ 100,000 B → ${total <= 100000 ? '达标' : '超线 ' + (total - 100000) + ' B'}`);
