# CoNovel

长篇小说写到后面最容易崩的不是文笔，是一致性——角色前后矛盾、伏笔有始无终、节奏一泻千里。CoNovel 用 15 个专职 Agent 把这些容易出错的环节拆开，每个 Agent 只管一件事，做完交给下一个。

Tauri 桌面端应用，Python litellm 调用 AI 模型，Rust 处理本地文件。

---

## 做什么

```
角色推理 → 正文创作 → 事件记录
  → 事实核查 + 连续性检查 + 节奏检查（并行）
  → 综合审阅（13维度，最多3轮收敛）
  → 文字润色 → 28项去AI味 → 质量反思 → 状态同步
```

每章经过 5 层质量门禁：记忆同步、事实一致性、连续性、风格校准、去AI味。未通过打回重写，不让问题流入下一章。

---

## 技术栈

| 层 | 技术 | 职责 |
|---|---|---|
| 桌面端 | Tauri 2 + Rust | 窗口管理、本地文件操作、LLM 桥接 |
| 前端 | React + Next.js（静态构建） | 编辑杂志风仪表盘，24 个组件 |
| 模型调用 | Python litellm SDK | 统一参数归一化，自动处理厂商差异 |
| Agent 指令 | Markdown + TypeScript | 15 个子 Agent 的系统提示词、技能、工具 |

```
src-tauri/            Rust 后端
  src/commands/       13 个 Command（books/chapters/config/pipeline/llm/...）
packages/studio/      React 前端
  src/lib/api.ts      统一 API 层（Tauri → Rust，Web → fetch）
  src/components/     24 个 UI 组件
agent/                15 个子 Agent 指令 + 技能 + 工具
scripts/              Python litellm 桥接 + 安装脚本
```

---

## Agent 系统

### 核心创作

| Agent | 职责 | 模型 |
|---|---|---|
| 故事架构师 | 大纲构建、情节设计、世界观架构 | 强模型 |
| 写作特工 | 正文创作，8 种叙事入口模式轮转 | 中等模型 |
| 角色智能体 ★ | 完全沉浸在角色中推理心理和行为 | 强模型 |

角色智能体是系统的核心创新——它不是简单地"按设定写对话"，而是进入角色的思维方式，推理此时此地该角色会怎么想、怎么做、怎么说。

### 质量控制

| Agent | 职责 | 模型 |
|---|---|---|
| 审阅官 | 13 维度结构化审阅，最多 3 轮收敛 | 中等模型 |
| 编辑 | 文字润色、结构调整 | 中等模型 |
| 去AI味编辑 | 28 项 AI 痕迹检测与最小修补 | 中等模型 |
| 事实核查官 | 事实一致性检查 | 轻量模型 |
| 连续性检查官 | 跨章节连续性验证 | 轻量模型 |
| 节奏控制官 | 节奏曲线分析 | 中等模型 |

去AI味编辑的 28 项检测覆盖结构（3）、词汇（8）、句式（7）、语姿（4）、标点（2）、小说专用（4）六个维度。核心原则是"修补不重写"——每个命中项只做一次最小修补，保留原作者的锋利度。

### 辅助

| Agent | 职责 |
|---|---|
| 观察者 | 监控叙事事件、记录关键信息 |
| 角色设计师 | 角色档案设计、关系图谱 |
| 伏笔管理官 | 伏笔追踪、回收提醒 |
| 风格分析师 | 提取风格指纹、风格校准 |
| 趋势雷达 | 市场趋势扫描 |
| 反思官 | 章节质量反思、改进建议 |

三个模型等级（强/中/轻）在设置页面自行指定，不绑定具体模型名。

---

## 自进化

**反馈学习**——每章审阅后记录各 Agent 得分，追踪常见问题模式，自动计算改进趋势。连续下滑的 Agent 会生成针对性的提示词调整建议。

**风格记忆**——每章完成后提取风格指纹（句长分布、对话比例、词汇偏好、AI 痕迹分数），与历史风格对比。成功的实验被标记，逐步形成稳定写作风格，为后续章节提供锚点。

---

## 安装

### 一键安装（Windows）

```powershell
# PowerShell
irm https://raw.githubusercontent.com/Cola-Pig1121/CoNovel/main/scripts/install.ps1 | iex
```

安装脚本检测 Python、Node.js、pnpm 环境，缺失时询问是否自动安装。安装完成后创建桌面快捷方式。

### 手动安装

```bash
git clone https://github.com/Cola-Pig1121/CoNovel.git
cd CoNovel
pnpm install
bash scripts/setup.sh   # 安装 Python litellm
```

### 从 Release 下载

[Releases](https://github.com/Cola-Pig1121/CoNovel/releases) 提供 `.msi` 和 `.exe` 安装包。

---

## 运行

```bash
# 终端 1：启动前端
cd packages/studio && pnpm dev

# 终端 2：启动桌面端
cd src-tauri && cargo tauri dev
```

### 首次使用

1. **配置模型**——设置 → 添加供应商（LiteLLM Proxy 或直连 API）→ 扫描模型 → Agent 模型配置
2. **创建项目**——小说管理 → 新建 → 输入书名和核心设定 → 选择题材（支持多选）
3. **开始创作**——项目详情页有 14 个 Tab，按引导顺序操作：
   - 约束（写作规则、禁词列表）
   - 参考（上传参考小说，拖拽或点击上传）
   - 风格（叙事视角、句式、词汇）
   - 角色（角色档案、关系图谱）
   - 大纲（卷章结构、每章蓝图）
   - 写作（发起 12 阶段创作流水线）

---

## 模型接入

通过 Python litellm 调用，自动处理不同厂商的参数差异（reasoning_effort、extended_thinking 等）。

| 接入方式 | Base URL | 说明 |
|---|---|---|
| LiteLLM Proxy | `http://localhost:4000` | 统一管理多供应商 |
| 直连 API | 各厂商端点 | OpenAI / Anthropic / DeepSeek / Ollama |
| 自定义端点 | 任意 URL | OpenAI 兼容格式 |

设置页面支持：
- 供应商管理（添加/删除/启用禁用）
- 模型自动扫描（通过 litellm 数据库）
- 思考强度检测（reasoning_effort: low/medium/high/max）
- Per-Agent 模型配置 + 智能分配

---

## 数据存储

无云依赖，全部本地：

```
~/.config/conovel/
├── providers.json          模型供应商配置
├── agents.json             Agent → 模型映射
├── books/{id}/
│   ├── state.json          完整书籍状态（SSOT）
│   ├── style.json          风格配置
│   ├── pipeline.json       流水线状态
│   ├── chapters/           章节内容（纯文本 JSON）
│   ├── constraints/         约束文件（Markdown）
│   ├── reference/           参考小说文件
│   └── evolution/           进化记录
└── conversations/          Agent 对话历史
```

---

## 题材模板

内置 33 种中文网络小说题材，每种包含写作指南、禁忌模式、情感弧线、世界观要素：

仙侠 · 玄幻 · 都市 · 科幻 · 悬疑 · 历史 · 无限流 · 重生 · 系统流 · 末日 · 诡异 · 游戏 · 西幻 · 综艺 · 军事 · 医生 · 法律 · 体育 · 穿越 · 都市异能 · 西游 · 三国 · 末世求生 · 灵异 · 修真 · 赘婿 · 甜宠 · 宫斗 · 金手指系统 · 种田 · 规则怪谈 · 生存游戏 · 同人

支持自定义题材。创建项目时可多选题材组合（如"仙侠+重生"）。

---

## CI / Release

### 自动构建

每次推送到 `main` 分支自动运行构建检查。

### 发布

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions 自动：
1. 构建 Windows 安装包（.msi + .exe）
2. 创建 GitHub Release
3. 上传安装包

应用启动时自动检查 GitHub Releases，有新版本提示下载更新。

---

## 项目结构

```
CoNovel/
├── src-tauri/                       Rust 后端
│   ├── src/main.rs                  入口，注册 13 个 Command
│   ├── src/commands/
│   │   ├── books.rs                 书籍 CRUD
│   │   ├── chapters.rs             章节读写（纯文本）
│   │   ├── config.rs               供应商/Agent 配置
│   │   ├── pipeline.rs             流水线状态机
│   │   ├── llm.rs                  Python litellm 桥接
│   │   ├── constraints.rs          约束文件管理
│   │   ├── reference.rs            参考小说管理
│   │   ├── naming.rs               取名工具
│   │   ├── knowledge.rs            知识库检索
│   │   └── write.rs                写作流水线触发
│   ├── Cargo.toml
│   └── tauri.conf.json
├── packages/studio/                 React 前端
│   └── src/
│       ├── lib/api.ts              统一 API 抽象层
│       ├── lib/tauri.ts            Tauri 环境检测
│       ├── app/                    12 个页面路由
│       ├── components/             24 个 UI 组件
│       └── styles/editorial.css    编辑杂志风样式
├── agent/                           15 个子 Agent
│   ├── instructions.md             系统提示词
│   ├── agent.ts                    模型配置
│   ├── tools/                      14 个工具
│   ├── skills/                     7 个技能文档
│   └── subagents/                  15 个子 Agent 指令
├── scripts/
│   ├── llm_bridge.py               litellm Python 桥接
│   ├── setup.sh                    Python 依赖安装
│   └── install.ps1                 Windows 一键安装
└── .github/workflows/build.yml     CI 自动构建 + Release
```

---

## License

MIT
