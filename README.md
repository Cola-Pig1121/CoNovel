# CoNovel

自进化多 Agent 小说写作系统。

长篇小说写到后面最容易崩的不是文笔，是一致性——角色前后矛盾、伏笔有始无终、节奏一泻千里。CoNovel 用 15 个专职 Agent 把这些容易出错的环节拆开，每个 Agent 只管一件事，做完交给下一个。

Tauri v2 桌面端，SvelteKit 前端，Rust 直连 LLM API。

---

## 做什么

```
上下文组装 → 角色推理 → 正文创作 → 事件记录
  → 事实核查 + 连续性检查 + 节奏检查
  → 综合审阅（13 维度评分）
  → 文字润色 → 28 项去 AI 味 → 质量反思 → 状态同步
```

每章经过 5 层质量门禁：记忆同步、事实一致性、连续性、风格校准、去 AI 味。未通过打回重写，不让问题流入下一章。

---

## 技术栈

| 层 | 技术 | 职责 |
|---|---|---|
| 桌面端 | Tauri 2 + Rust | 窗口管理、本地文件操作、LLM HTTP 直连 |
| 前端 | SvelteKit 2 + Svelte 5 + Tailwind CSS | 编辑器工作台、15 Tab 管理面板 |
| 模型调用 | Rust reqwest 直连 | OpenAI Compatible / Anthropic API，无 Python 依赖 |
| AI SDK | Vercel AI SDK (ai, @ai-sdk/openai, @ai-sdk/anthropic) | 前端 pipeline 编排 |
| 包管理 | pnpm + Turborepo | Monorepo 工作区 |

---

## Agent 系统

### 核心创作

| Agent | 职责 | 模型等级 |
|---|---|---|
| 故事架构师 Architect | 大纲构建、情节设计、世界观架构 | 强 |
| 写作特工 Writer | 正文创作，8 种叙事入口模式轮转 | 中 |
| 角色智能体 Character Intelligence | 进入角色思维推理心理和行为 | 强 |

### 质量控制

| Agent | 职责 | 模型等级 |
|---|---|---|
| 审阅官 Reviewer | 13 维度结构化审阅，最多 3 轮收敛 | 中 |
| 编辑 Editor | 文字润色、结构调整 | 中 |
| 去 AI 味编辑 De-AI Editor | 28 项 AI 痕迹检测与最小修补 | 中 |
| 事实核查官 Fact Checker | 事实一致性检查 | 轻 |
| 连续性检查官 Continuity | 跨章节连续性验证 | 轻 |
| 节奏控制官 Pacing Controller | 节奏曲线分析 | 中 |

### 辅助

| Agent | 职责 |
|---|---|
| 风格分析师 Style Analyzer | 提取风格指纹、风格校准 |
| 观察者 Observer | 监控叙事事件、记录关键信息 |
| 角色设计师 Character Designer | 角色档案设计、关系图谱 |
| 伏笔管理官 Foreshadowing | 伏笔追踪、回收提醒 |
| 趋势雷达 Radar | 市场趋势扫描 |
| 反思官 Reflector | 章节质量反思、改进建议 |

三个模型等级（强/中/轻）在设置页面自行指定，不绑定具体模型名。

---

## 界面

**编辑器工作台** — 三栏布局：左侧工具导航 + 中心文本编辑器 + 右侧动态面板。支持 Ctrl+S 保存、防抖自动保存（停笔 2 秒）、AI 润色/扩写/缩写/去 AI 味。选中文本即触发，结果直接替换。

**项目中心** — 书架式网格，点击直达编辑器。首次使用引导配置 LLM 服务商。

**书籍详情** — 15 Tab 分 4 组（项目/创作/风格/分析），管理大纲、角色、伏笔、时间线、风格、约束、参考、技法、取名、写作流水线、Git 版本。

**设置** — Provider 管理（CRUD + 模型扫描）、Agent 模型分配（三层快速配置）。

**模板商店** — 导出项目为模板、从 GitHub 克隆、分类浏览。

---

## 记忆系统

参考天命的结构化状态管理：

- **15 维事实快照** — 每章完成后自动提取角色状态、剧情进展、伏笔追踪、世界状态、时间线、未解决问题
- **真相文件** — 章节摘要链（前后章承接）、当前状态汇总
- **上下文组装器** — 为每次 AI 调用组装精炼上下文包：系统提示 + 书籍设定 + 角色档案 + 最近摘要 + 事实快照 + 大纲 + 上章结尾 + 约束

---

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发
pnpm dev              # 前端 (localhost:5173)

# 或启动桌面端
cargo tauri dev        # 前端 + Tauri 窗口
```

### 首次使用

1. **配置模型** — 设置 → 添加服务商（OpenAI / Anthropic / DeepSeek 等）→ 扫描模型 → Agent 模型配置
2. **创建项目** — 项目中心 → 新建项目 → 输入书名 → 选择题材 → 开始创作
3. **使用流水线** — 书籍详情页 → 写作 Tab → 开始创作（12 阶段 Pipeline）

---

## 模型接入

通过 Rust reqwest 直连，无 Python 依赖。

| API 格式 | Base URL 示例 | 支持厂商 |
|---|---|---|
| OpenAI Compatible | `https://api.openai.com/v1` | OpenAI / DeepSeek / Qwen / Moonshot / Ollama |
| Anthropic | `https://api.anthropic.com` | Claude Sonnet 4 / Opus 4 / 3.5 Sonnet |

设置页面支持：供应商 CRUD、模型自动扫描、三层快速分配（强/中/轻模型）、Per-Agent 独立配置。

---

## 数据存储

无云依赖，全部本地：

```
~/.config/conovel/
├── providers.json          模型供应商配置
├── agents.json             Agent → 模型映射
├── store/templates/        导出的项目模板
└── books/
    ├── _index.json         书籍索引
    └── {book-id}/
        ├── state.json      完整书籍状态（SSOT）
        ├── chapters/       章节内容
        ├── constraints/    约束文件（Markdown）
        ├── reference/      参考小说
        └── memory/         记忆系统（快照 + 摘要）
```

---

## 项目结构

```
CoNovel/
├── src-tauri/                       Rust 后端（37 个 Tauri IPC 命令）
│   └── src/commands/
│       ├── books.rs                 书籍 CRUD
│       ├── chapters.rs             章节读写
│       ├── config.rs               供应商/Agent 配置
│       ├── llm.rs                  LLM HTTP 直连（OpenAI + Anthropic）
│       ├── pipeline.rs             流水线状态机
│       ├── constraints.rs          约束文件管理
│       ├── reference.rs            参考小说管理
│       ├── naming.rs               取名工具（纯 Rust）
│       ├── knowledge.rs            知识库检索
│       ├── git.rs                  Git 版本控制
│       ├── store.rs                模板导入导出
│       ├── env_check.rs            环境检测
│       └── write.rs                写作流水线触发
├── packages/studio/                 SvelteKit 前端
│   └── src/
│       ├── lib/                    业务逻辑（11 个纯 TS 文件，无框架依赖）
│       │   ├── api.ts              URL → Tauri IPC 路由表
│       │   ├── tauri.ts            Tauri 环境检测
│       │   ├── llm.ts              LLM 调用核心
│       │   ├── memory.ts           记忆系统
│       │   ├── context-builder.ts  上下文组装器
│       │   ├── providers.ts        Provider 管理
│       │   └── pipeline/           12 阶段 Pipeline
│       ├── lib/components/
│       │   ├── book/               15 个 Book*.svelte
│       │   └── settings/           ProviderManager + AgentModelConfig
│       └── routes/(app)/           9 个页面路由
├── agent/                           Eve Agent 框架定义（设计文档）
└── .github/workflows/build.yml     CI 自动构建
```

---

## CI / Release

每次推送到 `main` 自动构建。打 tag 自动发布：

```bash
git tag v0.2.0
git push origin v0.2.0
```

---

## License

AGPL-3.0
