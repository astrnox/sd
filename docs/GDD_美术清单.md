<!-- 归档元信息
文档名：NO SUCH PERSON《查无此人》GDD 美术清单（Phase 2）
作者角色：game-design-workshop-art-director（戴艺境）
版本：v1.1 ｜ 阶段：Phase 2 ｜ v1.0 → v1.1 变更：HUD 三处计数更正（A-34 五枚→四枚 / 6 张）、新增 A-39 触屏虚拟键（2 张），总量 38 项 / 69 张 → 39 项 / 70 张；其余数值未动
数值基准：GDD_参数与真值表.md（T1–T12）只读引用
视觉基准：art/style-guide.html v3.1（已由我修订，与本文件同源）+ game.js 实测参数
字段边界：本文件只产出美术资源量（T10）与色彩/材质/动画视觉参数；玩法数值、工期人日、性能预算一律只读引用
-->

# NO SUCH PERSON《查无此人》美术清单（Phase 2 · art-director 定稿）

| 项 | 内容 |
|---|---|
| 文档名称 | NO SUCH PERSON《查无此人》GDD 美术清单 |
| 文档 owner | game-design-workshop-art-director（美术资源量、画布规格、色彩规范、提示词条数） |
| 只读引用域 | 玩法数值（→T1–T4、T8、T9）、平台约束（→T5、T6、T7）、竞品风格参照（analyst） |
| 对齐基准 | `art/style-guide.html` v3.1（已按本文件 §8 异议 1–7 修订，两份文件同源） |
| 实测基准 | `game.js`（1,957 行）与 `style.css`、`index.html` 行号逐项标注于 §3 依据索引 |
| 状态 | v1.1：资源量与规范定稿；§8 异议 7 条已被主理人全部采认 |

---

## §1 美术方向定稿摘要

### 1.1 一句话风格定义

> **低明度单色几何 + 印刷砌块质感 + 一种被叫作「光」的材料。**
> 世界是灰的，障碍与同类都是黑的，光是唯一允许发亮的东西；全部信息由明度与形状承担，没有色相，没有纹理噪声，没有一个字。

### 1.2 三条视觉铁律（违反即回退）

| # | 铁律 | 可验收判据 | 落地参数 |
|---|---|---|---|
| R1 | **只有明度，没有色相** | 全片不出现任何色相偏移（含「暖白」「冷白」）；新元素必须落进既有 6 条明度带 | L\* 带：0–5.43（同类黑）/ 6.32（砖顶）/ 26.37（硬砖）/ 30.31–42.14（空气）/ 35.74（硬砖顶）/ 92.60–100（光与白） |
| R2 | **伪装靠网格与缝，不靠明度差** | 玩家黑 `#000000`（L\*=0）与砖黑 `#060606`（L\*=1.65）的 ΔL\* 仅 **1.65**，人眼在暗部无法靠明度分辨；可分辨性必须 100% 由边缘与缝承担 | 1 px 竖缝（`rgba(255,255,255,.05)`）+ 顶边两端各 2 px 断口 + 玩家 22×24 与砖 32×32 的尺寸差 + 伪装态 9%±2% 白描边呼吸 |
| R3 | **光独享发光权** | 除光与碎片外，一切边缘为 1–2 px 硬边；无描边外发光、无投影、无圆角卡片、无镜面高光 | 砖面顶面亮边仅 2–3 px；灯用白环（虹膜）+ 黑瞳 + 0.34r 瞳仁偏移；光层 `screen` 合成，瞳孔必须 `source-over`（光照层是加法混合，画黑等于没画） |

### 1.3 为什么不是手绘（三条，按重要性）

1. **机制一致性是硬约束，不是审美偏好。** 伪装成立的前提是玩家与砖**逐像素同色**——该差值的上限被实测压到 ΔL\*=1.65。手绘纹理自带笔触与明度抖动，会把 1.65 这个余量直接吃掉，让玩家「永远差一点点、永远露馅」。这是机制漏洞，不是画得不好。
2. **判据是 0.3 s 可读性。** 玩家要在半秒内判断「这块黑能不能钻进去」；手绘的价值来自细节密度，而细节密度在这个判据下是负资产——几何把差异压缩成明度台阶，手绘把差异摊平成纹理。
3. **预算配比必须押在光上。** 本作唯一会「表演」的元素是灯（三态：巡视 / 愣住 / 归位）与三层后期；砖与地形应是「改数据」而非「重画」。省下的工时应全部转入光的表演与可读性，而不是砖的纹理。

> 补充约束（来自 P4「每关都是同一个你」）：角色不做皮肤、不做成长外观、不做局外解锁外观。剪影一次定稿，十年不过时。

---

## §2 资源总量表（T10 核心）

> **计数口径（唯一口径，全文一致）**
> - **1 项** = 一条可下单的资源条目，有唯一编号 `A-xx`。
> - **1 张** = **一个独立画布产物**：能在离屏画布上单独渲染、单独对齐、单独导出的一个图层或图元。同一项内不同状态若需各自对齐（如激光 ON/WARN/OFF、插座 空/满/闪烁），**各计 1 张**。
> - 条目内部不可单独导出的绘制细节（如 1 px 砌缝、2 px 断口、闭眼刻痕两道）**不单独计张**。
> - 尺寸为**逻辑画布尺寸（CSS px）**；运行期位图 = 逻辑尺寸 × DPR（DPR 上限 2，→T7 只读）。

| 类别 | 项数 | 张数 | 单张画布尺寸（px） | 生成方式 | 优先级 |
|---|---:|---:|---|---|---|
| 1 角色（玩家） | 4 | 4 | 32×32；36×28 | 纯代码绘制 | P0 |
| 2 灯（看守） | 4 | 7 | 32×32；960×544 | 纯代码绘制（离屏光照层） | P0 |
| 3 地形材质 | 5 | 6 | 32×32 | 纯代码绘制 | P0 |
| 4 门 / 传送 | 4 | 8 | 40×64；6×6；24×40 | 纯代码绘制 | P0 |
| 5 记忆演出与过场 | 6 | 9 | 480×250；32×32；24×8；960×544 | 纯代码绘制 | P0 |
| 6 粒子与后期 | 6 | 9 | 128×128；960×544；96×8；32×32 | 程序化生成（运行期）+ 1 张位图 | P0 |
| 7 HUD 图标 | 6 | 21 | 3×16；9–12（clamp）；240×3；8×8；26×26；64×64；146×146；64×64 / 54×54 | 纯代码绘制 / DOM+CSS | P1 |
| 8 宣传物（商店页 / 封面） | 4 | 6 | 1920×1080；640×360；1080×1080 | 外部位图（AI 生成 + 人工合成） | P0 |
| **总计** | **39 项（共 8 类）** | **70 张** | — | — | — |

**分项复算（供主理人横向核对，先分项后合计）**

| 类别 | 逐项张数 | 小计 |
|---|---|---:|
| 1 角色 | 1+1+1+1 | 4 |
| 2 灯 | 1+1+2+3 | 7 |
| 3 地形 | 1+1+1+2+1 | 6 |
| 4 门/传送 | 1+1+3+3 | 8 |
| 5 记忆/过场 | 1+1+1+1+1+4 | 9 |
| 6 粒子/后期 | 1+1+2+2+2+1 | 9 |
| 7 HUD | 3+3+3+4+6+2 | 21 |
| 8 宣传物 | 1+1+3+1 | 6 |
| **总计** | — | **70** |

**项数区间说明（主动申报，避免被打回）**：本表 39 项高于通用美术清单默认区间 10–30 项，原因有两条且不可压缩：
① 本作**零文字**，HUD 与记忆符号是唯一的通信通道，必须逐态拆成可单独对齐的条目（如「插座三态」「印记三种」），合并会丢掉下单所需的逐态规格；
② 8 类里有 5 个条目是全屏后期 / 离屏光照层（A-07、A-08、A-25、A-26、A-29），它们的**混合模式与合成顺序互不相同**（`screen` / `multiply` / `difference` / `source-over`），不可合并为一项。
若主理人要求压到 30 项以内，唯一可行压缩是把 A-19/A-20/A-21 合成「事件印记组」（-2 项）、A-27/A-28 合成「痕迹组」（-1 项）、A-33/A-34/A-39 合成「界面符号组」（-2 项）、A-35/A-36/A-38 合成「对外物料组」（-2 项）→ 32 项，但**张数 70 不变**（张数按画布产物算，不随条目合并而减少）。

**位图与序列帧申报（显式标注单位与语义，防止被误读）**
- 全片**只有 1 张位图**：A-24 静态噪点贴图 128×128（`multiply`，只压暗不染色）。
- **序列帧动画帧数 = 0（每项）**。本作不存在逐帧动画：全部状态过渡由参数化插值驱动（指数逼近 / 线性 / 正弦），详见 §5。此处的「0」是**美术要画的张数**，与逻辑时序 `tick`（120 Hz，→T5 只读）是两个量，不可混用。

---

## §3 资源编号清单（逐项）

> 格式说明：「无文件」= 运行期程序化绘制，包体内无对应文件（受零外部请求约束，→T6 只读）；「PNG/WebP」= 唯一需要落盘的产物。

### 3.1 类别 1 · 角色（玩家）— 4 项 / 4 张

| 编号 | 名称 | 用途 / 出现场景 | 画布尺寸 | 格式 | 是否切图 | 复用关系 | 优先级 |
|---|---|---|---|---|---|---|---|
| A-01 | 玩家·常态 EXPOSED | 全游玩过程默认态；暴露/解除伪装的过渡两端 | 32×32 | 无文件 | 否 | 与 A-09/A-10 共用 `#000000`/`#060606` 双值；黑瞳近黑带与 A-05 同源 | P0 |
| A-02 | 玩家·伪装 MERGED | 贴住黑砖静止 0.08 s 后（→T1）；摊平为脚下那一格 | 32×32（图元终值 **30×30**，四周各内缩 1 px） | 无文件 | 否 | **直接复用** A-10 的顶边断口 + 1 px 竖缝、A-11 的 2 px 顶面亮边；终值 `TILE−2`，顶边由砖面上方 24 px 下沉 25 px 至砖面下方 1 px | P0 |
| A-03 | 玩家·暴露烧穿 BURNING | 暴露值 > 0.02 起至烧穿 0.6 s（→T2） | 32×32 | 无文件 | 否 | 复用 A-01 几何，仅换描边色阶与眼白 | P0 |
| A-04 | 玩家·死亡消散 DEATH | 烧穿归零 / 触刺；0.7 s 残影 | 36×28 | 无文件 | 否 | 复用 A-01 轮廓外扩 2 px，`#0a0d14` | P1 |

### 3.2 类别 2 · 灯（看守）— 4 项 / 7 张

| 编号 | 名称 | 用途 / 出现场景 | 画布尺寸 | 格式 | 是否切图 | 复用关系 | 优先级 |
|---|---|---|---|---|---|---|---|
| A-05 | 灯·虹膜巡视态 | PATROL；所有锥光光源的灯头 | 32×32 | 无文件 | 否 | 与 A-07 共用光源坐标；与 A-08 激光发射端共用 `drawBulb` 光晕 | P0 |
| A-06 | 灯·虹膜愣住态 | CURIOUS：玩家在光里消失后 3.6 s（→T3） | 32×32 | 无文件 | 否 | 复用 A-05，虹膜半径 9→6.2、扇宽 ×0.82 | P0 |
| A-07 | 锥光扇形 + 点光穹顶 | 锥光（PATROL/CURIOUS）、点光封锁局部空间 | 960×544 ×2 张 | 无文件 | 否 | 共用同一 960×544 离屏光照层，`screen` 合成；含 5.5% 体积雾圆晕 | P0 |
| A-08 | 激光三态（ON / WARN / OFF） | L2 起间歇激光；WARN 是玩家读秒的唯一依据 | 960×544 ×3 张 | 无文件 | 否 | 发射端复用 A-05 的 `drawBulb`；三态时长沿用 Demo 只读基准（见 §5.3） | P0 |

### 3.3 类别 3 · 地形材质 — 5 项 / 6 张

| 编号 | 名称 | 用途 / 出现场景 | 画布尺寸 | 格式 | 是否切图 | 复用关系 | 优先级 |
|---|---|---|---|---|---|---|---|
| A-09 | 黑砖·满砖 | 黑砖主体（无上方邻砖时仅此一层） | 32×32 | 无文件 | 否 | 基准材质；被 A-02 伪装态逐像素复用 | P0 |
| A-10 | 黑砖·断口砖 | 黑砖顶边两端各留 2 px 断口 + 1 px 竖缝，让连续黑带可被数出格子 | 32×32 | 无文件 | 否 | 与 A-09 叠加；被 A-02、A-20 复用 | P0 |
| A-11 | 黑砖·顶面受光砖 | 仅当上方为空时绘制：2 px `#141414` + 1 px 5% 白内衬线 | 32×32 | 无文件 | 否 | 与 A-09/A-10 叠加；被 A-02 复用 | P0 |
| A-12 | 硬砖（满砖 / 顶面受光砖） | 可走不可藏；地面永远是硬砖 | 32×32 ×2 张 | 无文件 | 否 | 满砖 `#3a3f44`；顶面 3 px `#4e555b` + 1 px 7% 白线 + 底缘 2 px 22% 黑 | P0 |
| A-13 | 尖刺阵列 | 禁止拖时间；触碰即死、伪装无效 | 32×32 | 无文件 | 否 | 纯黑三角，节距 16 px（`(w+10)/16` 取整） | P1 |

> 三种砌法（满砖 / 断口砖 / 顶面受光砖）合计 3 张，是「伪装成立」的前提，**不可合并为一张**：三者叠加顺序与出现条件不同（满砖恒有、断口恒有、顶面仅上方为空时出现）。

### 3.4 类别 4 · 门 / 传送 — 4 项 / 8 张

| 编号 | 名称 | 用途 / 出现场景 | 画布尺寸 | 格式 | 是否切图 | 复用关系 | 优先级 |
|---|---|---|---|---|---|---|---|
| A-14 | 门·未解锁 LOCKED | 三枚碎片未齐；深灰竖框 + 三个空插座 | 40×64 | 无文件 | 否 | 与 A-15 同几何，仅换渐变与描边 | P0 |
| A-15 | 门·已解锁 UNLOCKED | 三枚齐；白色竖框 + 4 条向上流动亮线 | 40×64 | 无文件 | 否 | 复用 A-14 几何 | P0 |
| A-16 | 门上插座三态（空 / 满 / 撞锁闪烁） | 进度直接长在门上，零文字 | 6×6 ×3 张 | 无文件 | 否 | 与 A-31 HUD 碎片插座同形不同位置 | P0 |
| A-17 | 碎片三态（明放 / 墙中 / 活碎片收起） | 明放：常规；墙中：仅伪装态可拾；活碎片：暴露靠近时缩回 | 24×40 ×3 张 | 无文件 | 否 | 与 A-20（闭眼砖屑）共用「带闭眼缝的方块」语汇 | P0 |

### 3.5 类别 5 · 记忆演出与过场 — 6 项 / 9 张

| 编号 | 名称 | 用途 / 出现场景 | 画布尺寸 | 格式 | 是否切图 | 复用关系 | 优先级 |
|---|---|---|---|---|---|---|---|
| A-18 | 记忆面板底板 | 通关记忆演出 / 翻转结局的 480×250 深底 + 1 px 边框 | 480×250 | 无文件 | 否 | 正相/反相各一套参数（见 §4.4 例外色） | P1 |
| A-19 | 事件印记·漂白圆印（death） | 记忆演出三事件之一；也是 A-28 烧痕的图形语言 | 32×32 | 无文件 | 否 | 与 A-28 同源（径向渐变 0.95→0） | P0 |
| A-20 | 事件印记·闭眼砖屑（hold） | 记忆演出三事件之一 | 32×32 | 无文件 | 否 | **完全复用** A-10 断口 + `closedEyesOnBrick` 两道刻痕 | P0 |
| A-21 | 事件印记·短线（dash） | 记忆演出三事件之一 | 24×8 | 无文件 | 否 | 与 A-05 冲刺拖尾同语汇（2.4 px 横线） | P1 |
| A-22 | 末端白环 + 黑瞳 | 演出末端「路的尽头长出一盏灯，照回起点」 | 32×32 | 无文件 | 否 | 复用 A-05 语汇（r13 白环 + 偏移黑瞳） | P1 |
| A-23 | 过场两段（开场轮换 2 帧 + 翻转结局 2 帧） | 点开始后播；L5 通关时反相 | 960×544 ×4 张 | 无文件 | 否 | 灯帧复用 A-05/A-06；砖帧复用 A-09 | P1 |

### 3.6 类别 6 · 粒子与后期 — 6 项 / 9 张

| 编号 | 名称 | 用途 / 出现场景 | 画布尺寸 | 格式 | 是否切图 | 复用关系 | 优先级 |
|---|---|---|---|---|---|---|---|
| A-24 | 静态噪点贴图 | 全屏 `multiply` 颗粒；一次性生成后平铺 | 128×128 | 运行期生成（无文件） | 是（可平铺） | 唯一位图；被三层后期共用，不重复生成 | P0 |
| A-25 | 曝光负片全屏 | 被抓住的 0.12 s；`difference` + 纯白 | 960×544 | 无文件 | 否 | 与 A-23 翻转结局共用反相逻辑 | P1 |
| A-26 | 暗角双层（暴露白化 + 固定黑框） | 暴露值越高边缘越白（不用红色暗角）；固定黑框压画面外缘 | 960×544 ×2 张 | 无文件 | 否 | 两层径向渐变，混合模式均为 `source-over` | P0 |
| A-27 | 影压压痕（收 / 展） | 伪装瞬间向下压、解除时释放；两段水平线 | 96×8 ×2 张 | 无文件 | 否 | 与 A-02 同时触发（0.16 s / 0.34 s） | P2 |
| A-28 | 烧痕漂白印（本局 6 s / 跨轮常驻） | 死亡处留印；本局 6 s 线性消散，跨轮印常驻砖面 | 32×32 ×2 张 | 无文件 | 否 | 复用 A-19 径向渐变，本局 alpha 0.17、跨轮 alpha 0.13 | P0 |
| A-29 | 世界呼吸亮度罩 | 24 s 周期低频明度起伏；抗习惯化 | 960×544 | 无文件 | 否 | 覆于全屏，白侧 `rgba(255,255,255,b*0.05)`、黑侧 `rgba(0,0,0,-b*0.07)` | P1 |

### 3.7 类别 7 · HUD 图标 — 6 项 / 21 张

> 编号说明：**A-39 追加于末位**而非插入序列中段，以免 A-35…A-38（宣传物）既有编号失效。按用途归类于本类。
> 归属说明：A-30 / A-31 / A-32 在 `#hud` 容器内，随游戏画面显示；A-33 / A-34 / A-39 在 `#hud` **之外**（标题 / 暂停 / 结算面板与触屏层）。

| 编号 | 名称 | 用途 / 出现场景 | 画布尺寸 | 格式 | 是否切图 | 复用关系 | 优先级 |
|---|---|---|---|---|---|---|---|
| A-30 | 关卡点三态（未到 / 当前 / 已完成） | 左上；条数对应关卡数 5（→T4）；未到 3×10 `rgba(13,15,17,.22)`、当前 3×16 `#0a0a0a`、已完成 3×10 `rgba(13,15,17,.45)`，间隙 6 px 底对齐 | 3×10 → 3×16 ×3 张 | DOM+CSS | 否 | 独立；`#lvPips`，style.css:37–46 | P1 |
| A-31 | 碎片插座三态 | 顶部居中（`left 50%`，`top clamp(46–66px)`，间隙 12 px）；未收集 1.5 px 描边 45% 黑 + 18% 白底，已收集填 `#0a0a0a` | 9–12（`clamp(9px,1.3vmin,12px)`）×3 张 | DOM+CSS | 否 | 与 A-16 门上插座同形，尺寸不同；`#hudKeys`，style.css:49–56 | P1 |
| A-32 | 暴露条（轨道 + 渐变填充）+ 状态点两态 | 暴露条底部居中、仅暴露时显示；状态点左下、8×8 方点，实心=暴露、空心环=伪装 | 240×3（容器 `clamp(140–240px)`）/ 8×8 ×3 张 | DOM+CSS | 否 | 暴露条与 A-26 白化暗角同源（同一暴露值驱动）；`#expose`、`#status`，style.css:59–66、74–83 | P1 |
| A-33 | 键帽四枚（← → ↑ ≫） | 标题页唯一操作说明，整组 opacity .62 | 26×26（≫ 为 38×26）×4 张 | DOM+CSS | 否 | 复用系统 `system-ui` 字形（← → ↑ ≫ 是字符非文案），不另绘；`.pad-legend`，style.css:151–162 | P1 |
| A-34 | 图标按钮四枚（▶ 开始/继续、▦ 选关、↻ 重开、⌂ 返回）+ 标题标志两帧 | 标题 / 暂停 / 结算三面板（8 处实例，4 种字形）；标题标志为会眨眼方块 | 64×64；146×146 ×6 张 | DOM+CSS | 否 | 字形 ▶ ▦ ↻ ⌂ 各 1 张（共 4）+ 标题标志睁/眯 2 帧；结算三格 14×14 复用同色方块、不另计张；`.iconbtn`、`.mark`，style.css:121–133、97–116 | P1 |
| A-39 | 触屏虚拟键（← → / ≫ / ↑） | `@media (pointer:coarse)` 下的虚拟按键层；圆壳 64×64、`.small` 54×54，coarse 低高屏缩为 52 / 44 | 64×64 / 54×54 ×2 张 | DOM+CSS | 否 | 字形复用 A-33 的 ← → ↑ ≫；仅圆壳与两号尺寸新出；`#touch`、`.tbtn`，style.css:175–200、index.html:29–38 | P1 |

### 3.8 类别 8 · 宣传物 — 4 项 / 6 张

| 编号 | 名称 | 用途 / 出现场景 | 画布尺寸 | 格式 | 是否切图 | 复用关系 | 优先级 |
|---|---|---|---|---|---|---|---|
| A-35 | 商店页 Key Art | 商店页主视觉 | 1920×1080 | PNG / WebP | 否 | 复用 A-07 锥光 + A-02 伪装态构图 | P0 |
| A-36 | 商店胶囊图 / 缩略图 | 列表页小图，须在 640×360 下的 1/9 尺寸仍可读 | 640×360 | PNG / WebP | 否 | 从 A-35 二次构图裁切重绘，不直接缩放 | P0 |
| A-37 | 预发布静帧三张（苏醒 / 看守 / 出去） | 预告片与商店轮播；三幕各一张 | 1920×1080 ×3 张 | PNG / WebP | 否 | 分别对应 A-23 开场、A-05 灯、A-15 门 | P1 |
| A-38 | 社交方图 | 发布日物料 | 1080×1080 | PNG / WebP | 否 | 复用 A-35 主体 | P2 |

### 3.9 依据索引（编号 → game.js 行号，供复核）

| 编号 | 依据 | 编号 | 依据 |
|---|---|---|---|
| A-01/A-02/A-03 | `drawPlayer` 1463–1531；`w=22,h=24` 364；`press` 799；`rad=3-3k` 1485 | A-18 | `drawMemoryStage` 969–1039（480×250 于 970） |
| A-04 | `drawPlayer` 1465–1471（deadT 0.7） | A-19 | `drawEventMark` 947–952（r15 径向） |
| A-05 | `drawWarden` 1637–1661（r=9、瞳仁 0.34r） | A-20 | `drawEventMark` 953–958；`closedEyesOnBrick` 1229–1239 |
| A-06 | 1648–1650（r=6.2）；`squint` 1665 | A-21 | `drawEventMark` 959–965（lineWidth 2.4） |
| A-07 | `drawCone` 1663–1671；`coneFan` 1682–1698；`drawPoint` 1700–1717 | A-22 | 第 1019–1037 行（r13 白环 + 偏移黑瞳） |
| A-08 | `drawLaser` 1719–1742；`laserState` 542–546 | A-23 | `drawWake` 1042–1081；ending 1156–1165 |
| A-09/A-10/A-11 | `drawTiles` 1209–1220（竖缝 1 px 5%、顶边断口 2 px、`softTop` 2 px、`softLine` 1 px） | A-24 | `ensureNoise` 922–938（128×128、234–255） |
| A-12 | `drawTiles` 1196–1208（`hardTop` 3 px、`hardLine`、底 2 px 22% 黑） | A-25 | 1174–1180（`difference`、negT 0.12 于 649） |
| A-13 | `drawSpikes` 1342–1358 | A-26 | `drawExposureVignette` 1744–1754；`drawFrameEdges` 1756–1762 |
| A-14/A-15 | `drawExit` 1398–1425（40×64 于 340） | A-27 | `drawWaves` 1321–1340；waves 参数 770、779 |
| A-16 | 1427–1440（6×6、间距 13 px） | A-28 | `drawMarks` 1305–1317；marks `t=6,max=6` 650；跨轮 1253–1276 |
| A-17 | `drawKeys` 1360–1390；`inWall`/`live` 335–339 | A-29 | 1146–1153 |
| A-30/A-31/A-32 | `style.css` 37–46 / 49–56 / 59–66、74–83；`index.html:17–24`（含 FPS `hide` 实测） | A-33/A-34 | `style.css` 151–162 / 121–133、97–116；`index.html:43–55、62–78`（图标按钮 8 实例 / 4 字形） |
| A-39 | `style.css` 175–200（`.tbtn`、`@media (pointer:coarse)`）；`index.html:29–38`（4 枚虚拟键） | A-35–A-38 | 无代码依据（对外物料，见 §6） |

---

## §4 色彩与材质规范

### 4.1 主色板（六色 PAL）与实测明度

> L\* 为 CIELAB 明度（D65 白点，sRGB 输入，按 CIE 标准公式计算）。所有数值可由色值直接复算。

| 色值 | 用途 | L\* | 与下一阶的最小 ΔL\* |
|---|---|---:|---:|
| `#43484d` | 空气·背景上缘（bgTop） | 30.31 | 与 `#5f646a` 差 **11.82** |
| `#5f646a` | 空气·背景下缘（bgBottom） | 42.14 | 与 `#3a3f44` 差 **15.77** |
| `#3a3f44` | 硬砖体（hard） | 26.37 | 与 `#4e555b` 差 **9.37** |
| `#4e555b` | 硬砖顶面亮边（hardTop，3 px） | 35.74 | — |
| `#060606` | 黑砖体（soft，可藏） | 1.65 | 与 `#141414` 差 **4.67** |
| `#141414` | 黑砖顶面亮边（softTop，2 px） | 6.32 | — |
| `#000000` | 玩家（player） | 0.00 | 与 `#060606` 差 **1.65** |
| `#ffffff` | 光 / 白 | 100.00 | 与 `#5f646a` 差 **57.86** |

**两个必须写进验收的结论**

1. **玩家与黑砖的 ΔL\* 只有 1.65，不足以分辨。** 因此「伪装成立」完全不靠明度差，只靠四件事：① 1 px 竖缝 `rgba(255,255,255,.05)`；② 顶边两端各 2 px 断口；③ 22×24（圆角 3）→ 30×30（圆角 0）的尺寸与轮廓突变；④ 伪装态 9%±2% 白描边呼吸（`0.09 + 0.02·sin(2.2t)`）。**删掉任何一条，伪装就会被读成「凸起」。** 任何提案「把玩家调亮或调暗以便区分」都是把机制改坏，一律驳回。
2. **硬砖体与背景上缘的 ΔL\* 只有 3.95。** 硬砖之所以仍可读，靠的是 3 px 顶面亮边（ΔL\*=9.37）与 1–2 px 硬边；因此**硬砖块不允许出现在画面最上方且顶面被裁切的位置**（没有顶面亮边时它会与空气糊在一起）。

### 4.2 材质语法（具体参数，可直接下单）

| 材质 | 参数 | 判据 |
|---|---|---|
| 黑砖竖缝 | 宽 1 px，色 `rgba(255,255,255,.05)`，每格一条，位于格左侧 | 连续黑带必须能被数出格子 |
| 黑砖顶边 | 出现条件：上方为空；高 2 px，`#141414`，左右各留 2 px 断口；其下再 1 px `rgba(255,255,255,.05)` 内衬线 | 断口是「伪装可对齐」的锚点 |
| 硬砖顶边 | 高 3 px `#4e555b`；其下 1 px `rgba(255,255,255,.07)`，x 偏移 +6、宽 −12 | 亮边是硬砖唯一的可读性来源 |
| 硬砖底缘 | 高 2 px `rgba(0,0,0,.22)`，仅当下方为空 | 让地面有「厚度」，不产生投影感 |
| 砖面高光 | **禁止**。砖面哑光、无反射、无渐变、无圆角 | 光只提升亮度，不产生镜面 |
| 边缘处理 | 全部 1–2 px 硬边；**禁止**描边外发光（发光只属于光与碎片） | — |
| 噪点 | 128×128 平铺，灰度值 `234 + rand(0,21)`（21 级，234–255），`multiply` 叠加，只压暗不染色；单像素颗粒，覆盖 100% 像素；最大压暗 8.2%（234/255） | 颗粒是静态的，不随时间变化 |
| 尖刺 | 纯黑 `#000000` 三角，节距 16 px，顶点高出砖面 2 px | 靠形状而非颜色区分危险 |

### 4.3 三层后期参数（只写视觉参数）

| 层 | 混合模式 | 参数 | 备注 |
|---|---|---|---|
| ① 静态噪点 | `multiply` | 灰度 234–255（21 级），128×128 平铺，一次性生成 | 只压暗不染色 |
| ② 世界呼吸 | `source-over` | 周期 24 s 正弦；白侧 `rgba(255,255,255, b×0.05)`、黑侧 `rgba(0,0,0, −b×0.07)`，`b = sin(2πt/24)` | 幅度**非对称**：+5% 白 / −7% 黑（与文档「±7%」不一致，见 §8 异议 7） |
| ③ 曝光负片 | `difference` + 纯白 | 触发时长 0.12 s（全屏反相）；触发条件为烧穿死亡（暴露 0.6 s，→T2） | 视觉时长 0.12 s 属 art 域；0.6 s（→T2）为玩法时长，只读引用 |
| 附加：暴露白化暗角 | `source-over` | 内径 0.55×H → 外径 1.02×H；中心 alpha 0 → 0.10e → 0.55e | **不使用红色暗角**（V3） |
| 附加：固定画框暗角 | `source-over` | 内径 0.30×H → 0.95×H，0 → 0.22 黑 | 恒定，不随状态变化 |

### 4.4 例外色组（PAL 之外，实测存在，必须登记）

「六色 PAL」是主色承诺，但运行期实测另有 **9 个不透明色值 + 1 处色相偏移**。它们全部落在两个窄带内，**不新增明度阶**，故不违反铁律 R1：

| 色值 | L\* | 出现位置 |
|---|---:|---|
| `#08090b` | 2.45 | 记忆演出全屏遮罩（alpha 0.97） |
| `#0a0a0c` | 2.78 | 灯的黑瞳；开场砖体 |
| `#0a0b0d` | 3.01 | 结局底；碎片刻线 |
| `#0a0d14` | 3.64 | 玩家死亡残影 |
| `#0e1013` | 4.62 | 记忆面板底（正相） |
| `#101216` | 5.43 | 记忆面板 ink（反相） |
| `#e8eaec` | 92.60 | 记忆面板底（反相） |
| `#f2f3f4` | 95.79 | 记忆面板 ink（正相） |
| `#f4f6f8` | 96.79 | 碎片体（alpha 0.94） |

**近黑带 = L\* 0–5.43（9 值）｜近白带 = L\* 92.60–100（4 值，含 `#ffffff`）**，中间只有 6.32 / 26.37 / 30.31 / 35.74 / 42.14 五个锚点。**任何新色值必须落进这两带或五个锚点，否则驳回。**
**两处待裁决的色相偏移**（已列 §8 异议 6）：`rgba(255, 200−90e, 140−90e, .25+.75e)` 暴露描边（e≈0.02 时为暖橙，e→1 时为橙）与 `rgba(230,245,255,.35)` 白闪（冷白，B−R = 25）。

---

## §5 动画与状态规格

> **单位与语义声明（防误读，必读）**
> - 本作**没有逐帧动画**：序列帧数 = 0。下表全部是**参数化插值的起止值与曲线**。
> - 「τ」= 指数逼近的时间常数（秒）：`α(t) = 1 − e^(−t/τ)`，实现为 `lerp(a, b, 1 − k^dt)`，`τ = −1/ln(k)`。
> - 涉及 **T1 / T2 / T3** 的时长一律只读引用，本文件不改写、不推算。
> - 「Demo 只读基准」= 已实现 Demo 的现成参数，仅登记、不作为正式 spec。

### 5.1 玩家三态过渡

| 过渡 | 曲线 | 时长 / 参数 | 起值 → 止值 |
|---|---|---|---|
| 常态 → 伪装（几何） | 指数逼近 exp-decay | τ = **0.1233 s**（默认，k=3e-4）；τ = **0.1060 s**（距上局 hold 点 56 px 内，k=8e-5）；τ = **0.1426 s**（距上局 death 点 56 px 内，k=9e-4） | 22×24 / 圆角 3 / `#000000` → **30×30** / 圆角 0 / `#060606`；坐标吸至 `(格x×32+1, 脚下格y×32+1)` |
| 伪装 → 常态（几何） | 同上（同 τ，反向） | 同上 | 30×30 → 22×24；判定**瞬时**解除，视觉按 τ 回落 |
| 眼睛开合（eye 1↔0） | 指数逼近 exp-decay | τ = **0.1316 s**（k=5e-4），张开与闭合同速率 | 开：眼高 4.4 px × eye、宽 3 px、间距 6 px、`rgba(255,255,255,.75–1)`；闭：两段 3×0.8 px、alpha 0.16 |
| 描边（伪装） | 正弦呼吸 | `0.09 + 0.02·sin(2.2t)`，周期 **2.86 s** | alpha 0.07 → 0.11 |
| 描边（暴露态基准） | 线性 | `0.10 × eye` | alpha 0 → 0.10 |
| 描边（暴露烧穿） | 线性（随暴露值） | alpha = `0.25 + 0.75e`，线宽 1.4 px | 见 §4.4 色相偏移待裁决项 |
| 收敛环（mergePop） | 线性 | **0.22 s**，半径 8 → 34 px，alpha 0.55 → 0 | 伪装瞬间一次 |
| 影压压痕·收起 | 线性 | **0.16 s**，半长 74 → 8 px，alpha 0.20 → 0 | 伪装瞬间 |
| 影压压痕·展开 | 线性 | **0.34 s**，半长 8 → 54 px，alpha 0.20 → 0 | 解除瞬间 |
| 冲刺环（冷却指示） | 线性弧 | 半径 15 px，线宽 1.5 px，alpha 0.28 | 0° → 360° |
| 死亡残影 | 线性 | **0.7 s**，alpha 0.5 → 0 | — |

### 5.2 灯三态过渡

| 过渡 | 曲线 | 时长 / 参数 | 起值 → 止值 |
|---|---|---|---|
| PATROL（巡视） | 正弦摆动 | 角度 `angle + sin(t·speed + phase)·amp`；Demo 只读基准：扇宽 0.50–0.56 rad、摆幅 0.28–0.30 rad、射程 620–640 px | 连续 |
| PATROL → CURIOUS（愣住） | **阶跃（0 s 瞬切）** | 角度立即冻结；虹膜半径 **9 → 6.2 px**；扇宽 ×**0.82**（→T3）；扇亮度 ×**1.12** | 三处均为瞬时切换，无过渡帧（避免被读成「抖动」，静止才读作「愣住」） |
| CURIOUS 保持 | 无变化 | **3.6 s（→T3）完全静止** | 角度、扇宽、虹膜均不变 |
| CURIOUS → RETURN（归位） | **线性** | **0.9 s（→T3）**，`k = 1 − fade/0.9` | 冻结角度 → 当前自然角度；归位完成时虹膜 6.2 → 9、扇宽还原 |
| 单次 CURIOUS 触发 | 单例 | 全局同时只有一盏灯可进入 CURIOUS（`if (curious) return`） | 停顿不可被刷新 |

> 待定（视觉域，未定稿）：CURIOUS 入场目前是 0 s 瞬切。若改为过渡，**上限 0.12 s**——超过 0.12 s 会被读成「机关在动」，与「静止才像愣住」的语义冲突。此项列为 §8 待登记值。

### 5.3 激光与点光（三态时长沿用 Demo 只读基准，属 designer 域只读引用）

| 项 | Demo 只读基准（只读引用，不改写） |
|---|---|
| 激光周期 / 亮 / 预警 | period 1.9–2.6 s；dur 0.75–1.0 s；warn 0.40–0.50 s（`LEVELS[].lights[]`） |
| 激光 ON 三档线宽 | 18 px（alpha .20）/ 7 px（alpha .55）/ 2 px（纯白），`lineCap: round` |
| 激光 WARN | 1.4 px 虚线，dash `[7,9]`，alpha `0.25 + 0.55·|sin(26t)|`（周期 0.242 s） |
| 激光 OFF | 1 px、alpha 0.12 残线 |
| 点光呼吸 | `range` 190–250 px；缩放 `k = 0.82 + 0.18·sin(pulse·t + phase)`，`pulse` 1.5–2.4 rad/s ⇒ 实际半径 = 0.64R–1.00R，周期 **2.62–4.19 s**（`pointRange` 538–541） |

### 5.4 记忆演出与两段过场（帧数口径：参数驱动，非序列帧）

**A-18/A-19/A-20/A-21/A-22 记忆演出（总时长 2.4 s）**

| 节拍 | 曲线 | 时间窗（由 `k/2.4` 换算） | 起 → 止 |
|---|---|---|---|
| 淡线揭示本局路径 | 线性 `reveal = k/0.66` | 0 → **1.584 s** | alpha 0.22；lineWidth 1.5 |
| 事件 1（death/hold/dash 之一） | 线性渐入 0.336 s | **0.576 s** 起 | alpha 0 → 1 |
| 事件 2 | 线性渐入 0.336 s | **0.984 s** 起 | alpha 0 → 1 |
| 事件 3 | 线性渐入 0.336 s | **1.392 s** 起 | alpha 0 → 1 |
| 末端白环 + 黑瞳 + 光锥 | 线性渐入 0.576 s | **1.728 s** 起，2.304 s 完成 | 环 r13（lineWidth 2）、瞳 r7 偏移 `(+3,+4)`、光锥 alpha 0 → 0.30 |
| 面板整体 | — | 全程 | 480×250，居中 |

**A-23 开场轮换（总 2.4 s）**

| 节拍 | 曲线 | 时间窗 | 起 → 止 |
|---|---|---|---|
| 上方灯 + 光锥淡出 | 线性 `1 − a(0.34,0.58)` | **0.816 → 1.392 s** | alpha 1 → 0；虹膜半径 20 → 14 px（0.720 → 1.248 s） |
| 下方砖 + 双眼淡入 | 线性 `a(0.58,0.78)` | **1.392 → 1.872 s** | alpha 0 → 1 |
| 双眼睁开 | 线性 `8·a(0.66,0.84)` | **1.584 → 2.016 s** | 眼高 0 → 8 px |
| 全片收尾 | 线性 | **2.16 → 2.4 s** | alpha 1 → 0.001 |

**A-23 翻转结局（总 3.4 s）**

| 节拍 | 曲线 | 时间窗 | 起 → 止 |
|---|---|---|---|
| 反相记忆面板 | 线性 `(3.4−endT)/1.9` | 3.4 → **1.5 s** 剩余 | 面板正相 → 反相（`#e8eaec` 底 / `#101216` ink） |
| 白屏渐白 | 线性 `min(1, 1−endT/1.5)` | 剩余 1.5 → 0 s | alpha 0 → 1 |

### 5.5 门、碎片、痕迹

| 项 | 曲线 | 参数 | 起 → 止 |
|---|---|---|---|
| 门·解锁描边脉动 | 正弦 | 周期 `2π/3` = **2.09 s** | alpha 0.70 → 1.00 |
| 门·撞锁闪烁 | 正弦 | 周期 `2π/34` = **0.185 s** | 插座描边 alpha 0.35 → 0.80 |
| 门·解锁流动线 | 线性循环 | 4 条，速度 60 px/s，线高 1.5 px | 循环 |
| 碎片·浮动 | 正弦 | 明放 amp 3 px、周期 `2π/2.2` = **2.86 s**；墙中 amp 1.2 px | 连续 |
| 碎片·首枚呼吸放大 | 正弦 | 尺寸 ×1.00 → ×1.22，周期 **2.51 s** | 仅首枚明放碎片 |
| 碎片·墙中可见度 | 阶跃 | 伪装态且在 74 px 内 → alpha 1.0；否则 0.18 | 两态瞬切 |
| 碎片·活碎片收起 | 线性 | alpha `1 − 0.82·hide`，y 位移向下一格 | 连续 |
| 烧痕·本局 | 线性衰减 | **6.0 s**，alpha 0.17 → 0 | — |
| 烧痕·跨轮 | 恒定 | alpha 0.13 | 常驻 |
| 闭眼刻痕淡入 | 线性 | 速率 1.6 /s → **0.625 s** 完成 | alpha 0 → 1 |
| 出生点微光 | 径向渐变 | r = 210 px，中心 alpha 0.055 → 0 | 常驻 |

---

## §6 AI 提示词工程

### 6.1 统一 style token 块（所有提示词的前置锚点，直接照抄）

```
[@@PROT_NO SUCH PERSONTOKEN@@] monochrome value-only geometry, exactly six values: air #43484d to #5f646a,
hard stone #3a3f44 with #4e555b lit top edge, obsidian tile #060606 with #141414 lit top edge
and rgba(255,255,255,0.05) 1px vertical seams and 2px notches at both ends of the top edge,
subject #000000, light #ffffff. Matte flat faces, zero gloss, zero gradient on solid mass,
1-2px hard edges, print-block masonry rhythm, 8% static film grain multiply only, no color,
no hue, no warm light, no cold tint. Restraint of Limbo/Inside silhouettes, matte geometry of
Monument Valley, high-contrast black-and-white film lighting. Allowed to glow: light and shards
only. Text-free, letter-free, number-free.
```

**它怎么锁住单色几何调性**：① 把六个数码色值写进 token，模型无法自行「润色」出中间色；② 用「matte / zero gloss / zero gradient on solid mass」封死塑料感与镜面高光；③ 用「1–2px hard edges + 2px notches」把「砌块可数」这个机制前提带进生成物；④ 用「Allowed to glow: light and shards only」把发光权收归光；⑤ 用 Limbo/Inside + Monument Valley 两个参照锚定明度与哑光，而不是锚定「暗黑风」；⑥ 尾部三重否定（text/letter/number-free）强制零文字。

### 6.2 逐条提示词（13 条）

> 所有提示词 = `[@@PROT_NO SUCH PERSONTOKEN@@]` + 下列正文。负向提示词共用一套，个别条目追加项已标注。

**共用负向提示词（NEG-BASE）**
```
color, colored, hue, saturation, cyan, teal, orange, red, gold, neon, rgb lighting, lens flare,
bloom halo, bokeh, soft shadow, drop shadow, ambient occlusion glow, glossy reflection, specular
highlight, plastic, glassmorphism, rounded card, gradient mesh, pixel art, cartoon outline, cel
shading, scanlines, crt, glitch, chromatic aberration, motion blur, depth of field, text, letters,
numbers, watermark, logo, ui label, hud frame, 3d render, blender, octane, isometric, anime, cute
eyes, eyelashes, eye whites
```

---

**P-01 → A-01 玩家·常态 EXPOSED**
```
A single small matte black square standing on a seamless graphite wall, one solid rectangular
block, 22 by 24 units, corner radius 3 units, pure #000000 fill with a 10 percent white hairline
outline, two narrow vertical white eye slits 3 units wide spaced 6 units apart, faint 210px soft
white halo behind it. Flat orthographic side view, subject centered, tile grid 32 units visible
in the wall behind, quiet negative space above.
```
`--ar 1:1`

**P-02 → A-02 玩家·伪装 MERGED**
```
The same matte black square flattened and snapped into one grid cell of a masonry black wall,
now 30 by 30 units with zero corner radius, filled exactly the same #060606 as the tile it
occupies, sharing the identical 2px lit top edge, the identical 1px vertical seam and the
identical 2px notch at both ends of the top edge; eyes closed into two 3 by 0.8 unit slits at
16 percent opacity; only a 9 percent white hairline breathing around it. You must be unable to
tell which tile it is at a glance.
```
`--ar 1:1`，负向追加：`visible silhouette gap, distinctly lighter square, protruding block, drop shadow under subject`

**P-03 → A-03 玩家·暴露烧穿 BURNING**
```
The same black square now heated into exposure: its hairline outline thickened to 1.4 units and
burning toward pale warm white, the two eye slits grown to full white 4.4 units tall and flaring,
a soft radial white bloom hugging the body, edges of the frame washing toward white from all four
sides like overexposed film. No red vignette. The block still reads as a flat matte square, not a
glowing object.
```
`--ar 1:1`，负向追加：`red vignette, orange glow, fire, sparks, embers`

**P-04 → A-05 灯·虹膜巡视态（同时产出 A-06 变体）**
```
A hovering warden eye rendered as a light source: a 9 unit dark pupil disc (#0a0a0c) ringed by a
1.2 unit pure white iris circle, plus a single small white highlight dot offset 34 percent of the
radius toward the direction it is looking; around it a 26 unit soft white radial breathe and a
wide hard-edged white light cone sweeping downward across a masonry wall. No eye whites, no
lashes, no gloss. The eye is cold, mechanical, watchful. Variant B: identical but iris radius
contracted to 6.2 units and the light cone narrowed to 82 percent of its width, completely
motionless.
```
`--ar 1:1` ×2（巡视 / 愣住两版），负向追加：`eye white sclera, eyelashes, cute, mascot, iris texture, colorful iris`

**P-05 → 光型风格校准图（对应 A-07 / A-08；**仅内部参考，不进包体**，两者本体必须代码绘制）**
```
Two lighting prototypes on one sheet. Left: a hard-edged volumetric cone of pure white light
emitted from a single point on the ceiling, its polygon edge cut by the masonry silhouettes it
hits, faint 5.5 percent haze inside the beam, no soft falloff on the sides. Right: a radial dome
of white light expanding from a point on the floor, its boundary clipped by surrounding blocks,
0.62 center alpha decaying to zero at the rim. Both rendered as flat value polygons on a
graphite background, no bloom, no lens artifacts.
```
`--ar 16:9`

**P-06 → A-18 记忆面板底板**
```
A single subtle rectangular panel floating over a black void, 480 by 250 units, filled #0e1013
with a 1 unit 18 percent white border inset half a pixel, empty inside, four evenly spaced
corner marks missing, no title, no frame ornament, no icon, no text. It reads as a dark vitrine
for evidence, not as a UI window. Slight graphite grain across the fill only.
```
`--ar 2:1`

**P-07 → A-19 / A-20 / A-21 事件印记三格（一条覆盖三项）**
```
A three-cell reference sheet of the only three marks this world is allowed to leave.
Cell one: a bleached radial burn print, white center at 95 percent alpha fading to zero at
15 units radius, like light burned into stone. Cell two: a small 12 unit dark tile with a 1 unit
white top-edge notch at each end and two 5 unit closed-eye slits etched 1 unit apart, 26 percent
white with a 24 percent black shadow line beneath each slit. Cell three: a single 20 unit long,
2.4 unit thick white horizontal dash, flat caps. Flat, matte, no glow except the first cell.
```
`--ar 16:9`，负向追加：`icon set, badge, sticker, gradient border, five pointed star, diamond, gem`

**P-08 → A-35 商店页 Key Art**
```
Wide key art, 16:9. A graphite masonry wall fills the frame with countable black tiles, one tile
in the lower third has flattened into the wall and is only betrayed by a 9 percent hairline and a
pair of closed eye slits. From the top edge a single vast white light cone sweeps down and stops
just short of that tile; inside the cone, a warden's pupil is contracted and still. No character,
no face, no logo, no text. Vast negative space in the upper two thirds, high contrast, matte.
```
`--ar 16:9`

**P-09 → A-36 商店胶囊图 / 缩略图**
```
Square-ish store capsule, 16:9 but composed for extreme reduction: one large flat black square
centered, two white eye slits, a single diagonal white light wedge crossing behind it from upper
left, graphite wall reading as two large blocks only. Thick shapes, no fine detail, no grain
heavier than 8 percent. Must remain legible at one ninth of its size. No text, no logo, no border.
```
`--ar 16:9`，负向追加：`small details, fine linework, complex composition, busy background`

**P-10 → A-37a 预发布静帧·苏醒**
```
A dark vertical vignette: at the top a single white light cone is extinguishing, its bulb ring
shrinking, light bleeding away; at the bottom a black tile is opening two narrow white eyes for
the first time, the eye height only 8 units and still growing. The middle of the frame is empty
graphite. Nothing explains anything. Symmetrical, centered, ceremonial, matte.
```
`--ar 16:9`

**P-11 → A-37b 预发布静帧·看守**
```
A close, oppressive framing of a warden eye above a masonry wall: the dark pupil contracted, the
white iris ring thin and perfectly circular, the light cone narrowed and frozen mid-sweep,
pointing at an empty tile. Below the beam a bleached burn print on the stone is the only evidence
anyone was here. Cold, still, watchful. Graphite on graphite with one white beam.
```
`--ar 16:9`

**P-12 → A-37c 预发布静帧·出去**
```
A tall white-lit door frame, 40 by 64 units, three small sockets above it all filled, the frame
itself blazing pure white with four thin vertical light streaks rising through it. In front of it,
three evenly spaced black blocks with closed eye slits stand in a row, facing the door. Behind
them the wall is otherwise empty. The whole image is inverted in value: bright door, dark
foreground, no figures.
```
`--ar 16:9`

**P-13 → A-38 社交方图**
```
Square composition, one black square occupying the lower right third with two white eye slits,
a single hard-edged white light cone entering from the top left corner and terminating before it
touches the square, the rest of the frame a flat graphite gradient from #43484d to #5f646a with
8 percent static grain. Monumental emptiness, high contrast, poster-like, zero text.
```
`--ar 1:1`

### 6.3 明令禁止使用 AI 生成的资源（26 项）

| 组 | 涉及编号 | 项数 | 理由 |
|---|---|---:|---|
| ① 32 px 网格逐像素对齐类 | A-09 A-10 A-11 A-12 A-13 A-16 A-17 | 7 | 需保证 1 px 竖缝、2 px 断口、2 px/3 px 顶面亮边的**亚像素对齐**，且要与玩家伪装态的 30×30 逐像素同色（ΔL\*=1.65）。AI 位图必然错格或引入色偏，直接毁掉伪装判据。必须代码绘制。 |
| ② 全屏后期与离屏光照层 | A-07 A-08 A-24 A-25 A-26 A-27 A-28 A-29 | 8 | 依赖 `screen` / `multiply` / `difference` 混合模式与离屏画布合成顺序；位图无法承载「同一像素被两次不同模式合成」的行为。且 A-24 噪点需 100% 像素级可平铺。**A-07/A-08 虽在 §6.2 有对应风格校准提示词（P-05），但那是内部参考图、不进包体**——DDA 射线生成的可见性多边形与扇宽 82% 收窄必须代码绘制。 |
| ③ HUD 与界面小件 | A-30 A-31 A-32 A-33 A-34 A-39 | 6 | 尺寸 3–12 px（A-39 圆壳 54–64 px 但含字符字形与 1 px 描边），需 1 px 描边与 8 px 状态点在 DPR≤2（→T7 只读）下抗锯齿一致；AI 生成的图标无法保证 3 px 条的边缘锐度，也必然夹带文字或装饰。 |
| ④ 参数驱动状态类 | A-04 A-14 A-15 A-22 A-23 | 5 | 由时间参数连续驱动（见 §5），AI 位图会把状态锁死在单帧，反而制造「演示一套、实操另一套」。 |
| **合计** | — | **26** | 7+8+6+5 = 26 = 39 项 − 13 项（提示词覆盖）= 26 项 |

### 6.4 提示词统计

| 项 | 数 |
|---|---:|
| 提示词条数 | **13** |
| 其中：面向交付位图 | 12 条（P-01～P-04、P-06～P-13） |
| 其中：仅作风格校准、不产交付物 | 1 条（P-05 光型校准；A-07/A-08 本体必须代码绘制） |
| 覆盖资源项 | **13 项**（A-01 A-02 A-03 A-05 A-06 A-18 A-19 A-20 A-21 A-35 A-36 A-37 A-38） |
| 其中 A-37 拆为 3 条（三幕各一） | +2 |
| 明确禁止 AI 生成的资源项 | 26 项（见 §6.3） |
| 覆盖项 + 禁止项 = 总项数 | 13 + 26 = **39** ✓ |

> v1.0 勘误：此处原写「覆盖 14 项 / 禁止 24 项」，并把 A-07 同时列进「提示词覆盖」与「禁止 AI」两处，且 §6.3 四个分组小计 7+8+5+5=25 与声称的 24 不符。v1.1 已把 A-07 归入禁止组（其 P-05 降级为风格校准图），四组小计 7+8+6+5=26，13+26=39 闭合。

---

## §7 抗疲劳与一致性检查清单（逐项可勾，全部带参数）

| # | 检查项 | 通过判据（可验收） |
|---|---|---|
| C1 | 同屏明度阶数量 | 同一屏内**不超过 3 级主体明度**（空气 L\*30.31–42.14 / 硬砖 26.37–35.74 / 同类黑 0–6.32）+ 1 级光白（92.60–100）。出现第 4 级主体明度即驳回 |
| C2 | 色相偏移 | 全屏取色统计：所有像素的 R−B 绝对值 ≤ 25；且**不得出现 R>B+10 的暖色**（例外见 §8 异议 6 待裁决） |
| C3 | 伪装可辨性 | 截取伪装态与同格砖，比较 32×32 像素块：填充色完全一致（`#060606`）；差异仅存在于 1 px 描边（alpha 0.07–0.11）与顶边/竖缝的**重叠完全对齐**（偏移为 0 px） |
| C4 | 硬砖位置禁区 | 硬砖块不得出现在「上邻为空且块顶 y < 画面上沿 + 3 px」的位置——该位置顶面亮边被裁切，与空气的 ΔL\* 只剩 3.95，会糊掉 |
| C5 | 砌块可数性 | 任意连续黑砖段的长度 ≥ 2 格时，必须能在 100% 缩放下数出竖缝（1 px / 5% 白）；模糊或缩放至 640×360 后仍可数 |
| C6 | 发光权 | 除 A-07/A-08（光）与 A-17（碎片）外，任何元素不得有外发光、bloom、glow 描边；全屏 bloom 面积统计为 0 |
| C7 | 圆角与投影 | 所有砖块 / 面板 / 按钮圆角 = 0（唯一例外：玩家常态圆角 3 px、标题标志圆角 6 px）；投影数量 = 0 |
| C8 | 噪点参数 | 有且只有 1 层噪点：128×128、灰度 234–255、`multiply`、静态（同一帧与 60 帧后比特一致）。不得出现第二层、滚动噪点或扫描线 |
| C9 | 呼吸幅度 | 世界呼吸周期 24 s；白侧 alpha 峰值 0.05、黑侧 0.07；连续取样 3 个周期，alpha 峰谷差 ≤ 0.07 |
| C10 | 负片可控性 | 曝光负片为全屏 `difference` + 纯白，单次时长 0.12 s；须可由 FX 开关单独关闭（`FX.burn` 等五开关） |
| C11 | 零文字 | 游戏画面内字符串数 = 0（唯一例外：浏览器 `<title>`，不属于游戏画面）；FPS 仅在 `?debug` 下可见 |
| C12 | HUD 遮挡 | 全部 HUD `pointer-events:none`；暴露条与状态点不进入画面中心 320×200 区域；触屏下状态点下移 78 px 避开虚拟键 |
| C13 | 光与判定同源 | 同一帧内，视觉可见光斑与判定命中集合的差异像素 = 0（容差宁可少杀不可错杀） |
| C14 | 记忆符号不新增 | 记忆演出中出现的形状集合 ⊆ {漂白圆印, 闭眼砖屑, 短线, 白环+黑瞳, 淡线}；超出即驳回 |
| C15 | 静帧抗疲劳抽样 | 间隔 10 min 截取同一房间两帧：除世界呼吸（≤0.07 alpha）与灯具摆动外，其余像素差异 ≤ 2%；确保「变化来自动态层次而非细节堆叠」 |

---

## §8 异议项 + 待登记值

### 8.1 异议表（7 条，均只提口径与措辞，**未改任何既有文件**）

| # | 字段 | 原值 | 建议值 | 理由 |
|---|---|---|---|---|
| 1 | `style-guide.html` §01 空气色板标签 | 图上写出 `#4E5358 → #70757A` | `#43484d → #5f646a` | 同一节的 CSS 渐变与 `game.js` `PAL.bgTop/bgBottom`（第 31–32 行）都是 `#43484d → #5f646a`（L\* 30.31 → 42.14）。标签值不在任何代码里出现，属 v3.1 压暗后未同步的文字残留；若外包照标签取色会做出一版整体偏亮的背景 |
| 2 | `style-guide.html` §02「两种砖明度差 52 级」 | 52 级（无单位） | 「ΔL\* = 24.72（CIELAB）」 | 「级」无定义（HSL 明度差 22.4、8-bit 均值差 57、CIELAB 差 24.72，三者互不相同）。三处口径任取其一都能算出不同数字，横向复算时必对不上 |
| 3 | `style-guide.html` §03 伪装卡面「13% 白描边」 | 13% | 9%（±2% 呼吸，即 0.07–0.11） | 与同文件 §04 注「只留 9% 白描边」自相矛盾；`game.js` 第 1513 行实测 `0.09 + 0.02·sin(2.2t)`，上限 0.11。13% 会让伪装破绽过亮，削弱「远看认不出」 |
| 4 | `style-guide.html` §05 DON'T「不要噪点滤镜」 | 禁止噪点滤镜 | 「禁止高频滚动噪点 / 扫描线 / 故障位移；保留 128×128 静态颗粒（`multiply`，8.2% 压暗上限）」 | 已实现的三层后期第一层就是静态噪点（`ensureNoise` 922–938、`multiply` 1129–1135），且 `NO_SUCH_PERSON_核心卖点与塑造.md` §8 v3.1 明确把它作为「调性别扭」的修正项。原措辞会让执行者删掉一个已验收的层 |
| 5 | `style-guide.html` §06 排版与 HUD 表 | 关卡号 19px / 关卡名 14px / 计时·死亡 14px / 按钮 13px 文字 | 整节作废，以 `GDD_正文.md` Ch9 §9.2 形状 HUD 为准 | 该表描述的是**带文字**的 HUD（关卡号、关卡名、计时、死亡数），与 W1「游戏画面内零字符串」铁律直接冲突，也与已实现的图标化 HUD（`#lvPips` 3×10 竖条、键帽、暴露条、8 px 状态点）完全不同。属 v2.0 早于「无文字 v3」的历史残留 |
| 6 | 「六色 PAL」完整性 | 六色 | 「六主色 + 例外色组 9 值（近黑带 L\*0–5.43 / 近白带 L\*92.60–96.79）」+ 裁定 2 处色相偏移 | 实测运行期另有 9 个不透明色值（§4.4 逐值列出），均可用、但不登记会使「单色六值」在横向核对时不成立。另有两处真色相偏移待裁决：`rgba(255, 200−90e, 140−90e, .25+.75e)` 暴露描边（e→0 时为橙）与 `rgba(230,245,255,.35)` 白闪（B−R=25）。建议：描边改为 `rgba(255,255,255,.25+.75e)` 保无彩；白闪登记为「唯一允许的冷白偏移」 |
| 7 | 「世界呼吸 ±7%」幅度 | ±7% | 「白侧 +5% / 黑侧 −7%（非对称）」 | `game.js` 第 1147–1153 行实测：`b>0` 时 `rgba(255,255,255, b×0.05)`、`b<0` 时 `rgba(0,0,0, −b×0.07)`。写成「±7%」会使压暗侧正确、提亮侧高估 40%，盲测调幅时会调错方向 |

### 8.2 T10 登记建议表（数值与 §2 / §3 / §6 完全一致）

| 编号 | 字段 | 建议值 | 依据 |
|---|---|---|---|
| T10-a | 美术资源类别数 | **8 类** | §2 资源总量表，8 行类目 |
| T10-b | **资源项数** | **39 项** | §2 合计行；§3 逐项编号 A-01…A-39（A-39 追加于 §3.7 末位，见该节编号说明） |
| T10-c | **总张数** | **70 张** | §2 分项复算表：4+7+6+8+9+9+21+6 = 70（先分项后合计） |
| T10-d | **AI 提示词条数** | **13 条** | §6.2 逐条 P-01…P-13；覆盖 13 项资源，其中 P-05 仅作风格校准（§6.4） |
| T10-e | 主色板 | 6 主色（`#43484d` / `#5f646a` / `#3a3f44` / `#060606` / `#000000` / `#ffffff`）+ 例外色组 9 值（近黑带 L\*0–5.43、近白带 L\*92.60–96.79） | §4.1 / §4.4；异议 6 |
| T10-f | 序列帧动画帧数 | **0 帧/项**（全部状态由参数化插值驱动） | §2 申报 + §5 全表；唯一位图为 A-24 静态噪点 |
| T10-g | 位图资源数 | **1 张**（A-24 128×128 噪点） | §2 / §3.6 |
| T10-h | 画布尺寸清单 | 32×32（14 项）｜960×544（6 项）｜40×64（2 项）｜36×28（1 项）｜24×40（1 项）｜6×6（1 项）｜480×250（1 项）｜96×8（1 项）｜24×8（1 项）｜128×128（1 项）｜HUD：3×10→3×16、9–12（clamp）、240×3+8×8、26×26/38×26、64×64+146×146、64×64/54×54（6 项）｜宣传物：1920×1080（2 项）、640×360（1 项）、1080×1080（1 项） | §3 全表；逐格合计 14+6+2+1+1+1+1+1+1+6+4 = **39 项** |

**交叉自检（T10 一致性）**
- 项数：§3 编号 A-01…A-39 = 39 个，无跳号无重号 = §2 合计 39 = §6.4「13 + 26 = 39」✓
- 张数：§2 分项复算 70；逐类小计 4/7/6/8/9/9/21/6 与 §3 各类「×N 张」标注逐一对应 ✓
- 提示词：§6.2 共 13 条（P-01…P-13），其中 P-04 产出 2 张（巡视/愣住）、P-07 覆盖 3 项、P-05 为校准图不产交付物 ✓
- 本文件**未产出**任何玩法数值、工期人日、里程碑、团队人数、引擎版本、性能预算；T1–T9 全部只读引用并标编号（T9 未出现，因本清单不涉及正式版节奏）。

---

## 附录 · 自检（team-protocol §10 七问）

| # | 问 | 答 |
|---|---|---|
| 1 | 每个数字都能追溯来源？ | 是。资源量与视觉参数 → §2/§3/§5（附 `game.js` 行号）；玩法时长 → `（→T1/T2/T3）`；色值明度 → §4.1 CIELAB 算式；平台约束 → `（→T5/T6/T7，只读）`。**无裸数**，全文无「约」「若干」 |
| 2 | 有没有跨域出数？ | 无。未出工期人日、里程碑、团队人数、引擎版本、性能与内存预算；未出玩法判定窗口与节奏；未引用任何竞品数值（§1 只引用竞品**风格语汇**，不含数据） |
| 3 | 合计是加总出来的吗？ | 是。§2 先逐类小计、再给分项复算式 4+7+6+8+9+9+21+6=70，最后才出合计 39 项 / 70 张；未先写合计再拆项 |
| 4 | 分项穷尽且互斥？ | 是。39 项互不重叠：玩家（4）与灯（4）分列；黑砖三种砌法拆为 A-09/A-10/A-11 三张（叠加顺序不同，不可合并）；记忆印记（A-19/20/21）与游戏内痕迹（A-28）分列；A-39 只计圆壳与两号尺寸、字形复用 A-33，未与 A-33 重复计数 |
| 5 | 动画帧数有单位与语义吗？ | 有。§2 明示「序列帧 = 0 帧/项，全部参数化插值」，并声明 `帧`（美术张数）与 `tick`（120 Hz 逻辑时序，→T5）是两个量不可混用 |
| 6 | 依赖项未定稿处有没有先写死？ | 没有。CURIOUS 入场过渡、暴露描边色相两处标为「待定/待裁决」；T9 未引用；§8 异议 7 条全部只提建议不给结论 |
| 7 | 与 `style-guide.html` 有无冲突？ | v1.0 曾有 5 处，已全部写入 §8 异议（1/2/3/4/5）并由主理人采认；v1.1 起两份文件同源（`style-guide.html` v3.1 已按异议修订），§3.9 保留逐项行号供反查 |

**文档结束。** 资源量以本文件 §2/§3 为唯一源头；色彩规范以 §4 为准；`art/style-guide.html` v3.1 与本文件同源，二者若再生分歧，以本文件 §3.9 的 `game.js` / `style.css` 行号实测为准。
