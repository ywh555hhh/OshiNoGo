# OshiNoGo 架构契约

> 一句话目的：**用一个能被信任的计时器，把「看到假名 → 立刻反应」这一件事练到自动化。**

不是课程，不是教材，不是 SRS 平台。是一个**测量仪 + 调度器**。
凡是不服务于「测准 → 练到自动化」的东西，都是要被减掉的。

---

## 一、三条不可动摇的规则

### R0. 手机是第一上帝（微信 / QQ 内置浏览器是一等环境）

不是「也要支持手机」，而是**手机是主战场，桌面是附赠**。所有设计默认在
微信内置浏览器（iOS WKWebView / Android XWeb·X5）里跑得通。

由 R0 派生的硬性约束：

- **作答通道只有点按，没有文本输入。** 详见 R1。
- **一屏一题，不滚动。** `100dvh`（不是 `vh`，微信地址栏会收），`viewport-fit=cover` +
  `env(safe-area-inset-bottom)`，刺激在上 60%，选项在下 40% 拇指区。
- **无确认按钮。** 点按即提交。少一次点按、少 ~200 ms 污染、循环零点按推进。
- **禁掉浏览器的手势干扰**：`touch-action: manipulation`、`-webkit-tap-highlight-color: transparent`、
  `user-select: none`、`overscroll-behavior: none`。点击目标 ≥ 44×44 px。
- **无长按、无 hover、无滑动依赖。** 滑动/键盘只当加速器，不能是唯一路径。
- **旧内核兼容**：X5/XWeb 的 Chromium 版本落后于现代浏览器，`build.target` 必须显式下调，
  不允许出现 `:has()`、顶层 await、`Array.prototype.at` 之类现代语法。
- **音频必须由用户手势解锁**（`AudioContext` 初始为 suspended；iOS 需要在 `pointerdown` 内 `resume()`）。
  所以音频绝不能出现在第一屏自动播放路径上。
- **微信会回收后台页面、清缓存会抹掉 localStorage。** 所以进度要即时落盘，且导出/导入文件是刚需。
- **v1 不做音频。** 识别 drill 一项就能立住，先把手机上的核心循环打磨到位。

### R1. 测量规则：作答通道决定能不能测

| 刺激 / 作答 | 允许计时？ | 原因 |
| --- | --- | --- |
| 视觉（假名字形），双 `rAF` 之后起表 | ✅ | React 渲染 + 绘制有几十 ms 不确定延迟，必须等真正上屏 |
| 音频（预渲染剪辑，Web Audio 排程播放） | ✅ onset = `audioContext.currentTime` | 我们知道它何时响 |
| 音频（`speechSynthesis`） | ❌ **禁止进入任何计时路径** | onset 不可知，各平台实现不同、无可靠事件 |
| **手指点按固定按钮（`pointerdown`）** | ✅ | 触摸采样 8–30 ms，比软键盘干净一个数量级 |
| 物理键盘 | ✅ | 延迟 < 5 ms |
| **软键盘 / IME 文本输入** | ❌ 不计入统计 | commit 延迟 50–150 ms，且混入拼写与输入法行为 |

关键区分不是「手机 vs 桌面」，而是**「点按 vs 文本输入」**。
手指点在已知位置的按钮上，延迟只有触摸采样周期量级；软键盘慢的是**字符 commit**（联想、组词、纠错）。

因此：**所有 drill 一律 N 选 1 点按，文本输入不作为作答通道。**

这一条同时买到三件事：

1. **RT 变得可比。** 选项数 N 固定后 Hick's law 的 `log₂(n)` 项被消掉，
   不同池大小（5 个母音 vs 46 个清音）的 RT 终于是同一个物理量，「0.5 秒」重新成为有意义的靶子。
2. **识别与拼写解耦。** 不再混入「romaji 会不会拼」这个与假名识别无关的能力。
3. **歧义在结构上不可表达。** 选项集按「感知等价类互不相同」构建，
   dictation 的 じ/ぢ、あ/ア 不再是靠文案道歉的问题——构建函数根本不允许出现这种选项对。

文本输入（写 romaji / 写假名）保留为**独立的产出型 drill，不计时**，只在桌面端提供。

### R2. 事件日志是唯一真相

一场训练 = 一个 `TrialEvent[]`。所有指标都是这个数组上的纯函数。

- 不丢进度：状态是数据，不是 React 的 `useState`（现在切 Tab 就因为 Radix 卸载子树而丢整组）。
- 可测试：**用合成的 RT 序列重放整场 session**，调度器和指标就能回归测试。
- 导出/导入文件 = 直接序列化这个日志（这就是已定的档案方案）。

### R3. kernel 不知道「假名」是什么

kernel 只认识：`Item` / 感知等价函数 / 调度配置 / 事件日志。
于是「一系列免费小站」= 加数据包，不是加工程。
纯净性由 `kernel/__tests__/purity.test.ts` 守着：kernel 里不许 import React、不许 import `@/`。

---

## 二、指标模型

### 为什么废掉「平均反应 ≤ 500ms」

1. **RT 的下限由选项数决定。** Hick's law：`RT ≈ a + b·log₂(n)`。46 项池的 log₂≈5.5，和 5 项母音池的 log₂≈2.3 不是同一个物理量，不能用同一个阈值。
2. **RT 分布右偏。** 一个 8 秒的走神能把均值拉高几百 ms（现有代码用 `calcAvg` + `slice(-200)`）。
3. **「98% @ n=50」统计上无意义。** 错 1 题就是 98%；n=50 时 98% 的区间约 ±4%。

### 唯一的北星指标

**ICPM = items correct per minute**（限时冲刺内每分钟正确数）

- precision teaching 的标准 fluency 指标（Haughton 1972 的 fluency aims）。
- **对单题离群值免疫**，天然把「准」和「快」合成一个可比较的数。
- 屏幕上只显示：`42 个/分 · 98% · ↗`。没有均值 ms、没有 best/worst、没有日志表、没有报告弹窗。

达标判定（criterion-referenced）：`准确率 ≥ 95%` **且** `ICPM ≥ 目标` **且** `连续 3 次达标`。

### 收在「详情」里的诊断指标

| 指标 | 用途 |
| --- | --- |
| `medianRt` | 中位数而非均值（RT 右偏） |
| `cv = sd/mean` | **区分「变快」和「自动化」**：真正的自动化表现为 CV 下降（Segalowitz & Segalowitz, 1993） |
| `sufficient` | trial 数是否够（< 30 不给结论，只显示「样本不足」） |
| `excluded` | 抢答（<150ms）/ 走神（>5000ms）被排除的条数，**透明可见，不静默丢弃** |
| 迁移测试 | 未训练项上的同速表现——唯一能证明「练的不是这 46 张图」 |

> 证据边界（诚实标注）：CV 作为自动化指标在**单词识别**层证据较强；句子层有反驳（Hulstijn et al., 2009 及后续部分复现）。所以 CV 只作**第二指标**，不作唯一真理。
> 离群值处理在文献中**没有共识**，甚至有人认为剔除弊大于利——所以我们只排除物理上不可能是真实作答的区间，并把排除数量摆出来。

---

## 三、训练循环

文献上足够稳、值得写进代码的只有三条：

- **提取练习 + 即时反馈**（已有）
- **间隔**（Kim & Webb 2022 元分析，48 实验，效应稳）
- **交错/语境干扰**（Nakata & Suzuki 2019 等；混练通常优于块状，但有条件）

「扩张间隔 vs 等间隔」**证据冲突**，所以**不引入 SM-2 那套参数**，只做等间隔 Leitner。

### 调度器（三层，全纯函数）

1. **组内错误回插**：答错 → 间隔 `requeueLag` 题后重插同一项，最多 `maxRequeues` 次。
   *现状完全没有这个机制——这是「测」和「练」的分水岭。*
2. **加权抽题**：`weight = (1-acc)^accExp · max(0.25, rt/targetRt)^speedExp`，未见项给 `unseenWeight`。
   *把已经算出来的 `weakest`/`slowest` 接回抽题。*
3. **跨场次 Leitner**：3 箱（新 / 在练 / 已自动化），等间隔到期复习；CV 降到阈值且 ICPM 达标 → 毕业进「保持」抽查。

### 每个 drill 内部的序列

```
① 5 项小池 100% 准确  →  ② 60 秒冲刺 ICPM  →  ③ 打散交错  →  ④ 迁移测试（未训练项 / 整词 / 片假名）
```

---

## 四、目录

```
frontend/src/
  kernel/           # 纯 TS，零依赖，零 DOM，零 React，全单测
    types.ts        Item / TrialEvent / GradeReason
    grading.ts      归一化 + 感知等价类判分（消灭 じ/ぢ、あ/ア 歧义）
    metrics.ts      median RT / CV / ICPM / celeration / 样本充足性
    random.ts       带种子的 PRNG —— 保证调度可重放、可测试
    schedule.ts     pickNext：错误回插 + 熟练度加权
    choices.ts      N 选 1 选项集：按感知等价类去重，UI 与判分永不打架
    session.ts      step(state, event) -> state  纯状态机（双 rAF 起表）
    persist.ts      版本化 schema + 严格校验 + 导出/导入档案（事件日志即档案）
  drills/           # 只有数据 + descriptor，没有逻辑
    kana-recognition/
    kana-dictation/     # 需要预渲染音频
  app/              # 极薄渲染层：把 session 状态画出来
```

**判定标准：一个 drill 的 UI 层超过 ~150 行，就是过度设计。**

---

## 五、减法清单

**删**

- `static/`（35KB+12KB+12KB legacy 原生实现）、根 `index.html` 跳转页、`app/main.py`、`pyproject.toml`、`uv.lock` —— Pages 上的静态 SPA 不需要 Python 服务层（砍掉仓库约 25%）
- `SessionSummaryDialog`（275 行三 Tab 报告）→ 一个数 + 一条趋势线
- `LogTable` + 分页 + `logPage` —— 逐题日志是给开发者看的，不是给学习者看的
- `OnboardingDialog`、`TrainingStatusCard`、`AppFootnote`（含「加奈图片占位」占位图）、`logo.svg`
- 三个配置面板 → **URL 即配置**：`?set=seion&mode=recog&sprint=60`（可分享、可收藏、零 UI）
- `mixed` 文字模式（dictation 歧义的直接来源，概念上无价值）
- `result-sound` vs `speak-kana` 切换 → 一种行为
- Radix 10 个依赖只留 1–2 个
- `localStorage` 里 24×500 条历史 → 一条聚合记录 + 事件日志导出
- `domain/queue.ts` 的死代码 `randomPick`（全等元素时死循环）

**留并强化**

- `useAppPreferences` 的版本化 `normalize*` 校验 → 抽成 `kernel/persist.ts`
- 语音能力三档检测 → 降级为**能力门**，不是功能开关
- 主题、键盘优先、Enter 提交、跳过

---

## 六、分阶段计划

| 阶段 | 内容 | 验收 |
| --- | --- | --- |
| **P0** | kernel + 全单测 | `npm test` 全绿；purity 测试通过 |
| **P1** | **手机优先的识别 drill**：N 选 1 点按、一屏一题、零确认按钮、双 rAF 起表；`session.ts` 接管状态 | 微信内置浏览器里单手可完成一整组；切 Tab 不丢进度；主指标是 ICPM |
| **P2** | 减法清理（删 legacy / Python / 报告弹窗 / 配置面板 / 文本输入通道） | 仓库 -25%；UI 组件 < 150 行 |
| **P3** | 预渲染音频管线 + dictation（禁止 speechSynthesis 计时，音频必须手势解锁） | dictation 的 RT 可信 |
| **P4** | Leitner 跨场次 + 档案导出/导入文件 | 换设备可恢复 |
| **P5** | 迁移测试 drill（整词 / 片假名） | 能回答「是不是练出了迁移」 |
