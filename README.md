# CoNovel

**自主多智能体网文创作系统** — Autonomous Multi-Agent Narrative System

CoNovel 是一个面向网络文学创作的多智能体协作系统。它将文件系统作为核心数据架构，通过 16 个专业智能体组成的流水线，从世界观构建到终稿润色，实现端到端的自动化创作辅助。

---

## 核心理念

### Filesystem-First（文件系统优先）

一切数据以文件形式持久化。书籍、章节、角色档案、知识库均以目录结构组织，人类可读、Git 可追踪、任意工具可编辑。拒绝黑箱数据库。

### Character Intelligence Layer（角色智能层）

角色不再是扁平的属性表，而是具备记忆、关系网络和行为一致性的智能实体。每个角色拥有独立的 CSV 知识库，在整个叙事过程中保持人格连贯。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18 + Vite + Lexical 富文本编辑器 + TypeScript |
| **后端** | Python FastAPI + Pydantic |
| **智能体引擎** | Bun TypeScript 运行时 |
| **状态管理** | Zustand |
| **样式** | Tailwind CSS |

---

## 项目结构

```
CoNovel/
├── frontend/          # React 前端应用
│   ├── src/
│   │   ├── components/    # UI 组件（LexicalEditor, panels, modals）
│   │   ├── pages/         # 页面（Dashboard, Editor）
│   │   ├── stores/        # Zustand 状态管理
│   │   ├── lib/           # API 客户端、类型定义
│   │   └── styles/        # 全局样式
│   └── public/
├── backend/           # Python FastAPI 后端
│   ├── app/
│   │   ├── api/           # REST 路由
│   │   ├── models/        # Pydantic 数据模型
│   │   ├── services/      # 业务逻辑
│   │   └── core/          # 配置与中间件
│   └── requirements.txt
├── agent-engine/      # 智能体引擎（TypeScript）
│   ├── src/
│   │   ├── agents/        # 16 个智能体定义
│   │   ├── pipeline/      # 流水线编排
│   │   └── providers/     # LLM 提供商适配
│   └── package.json
├── store-presets/     # 预设模板与示例数据
├── data/              # 运行时数据目录
└── turbo.json         # Turborepo 工作区配置
```

---

## 快速开始

### 前置条件

- Node.js >= 18
- Python >= 3.10
- [Bun](https://bun.sh) >= 1.0
- pnpm

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/your-org/conovel.git
cd conovel

# 安装前端依赖
cd frontend && pnpm install && cd ..

# 安装后端依赖
cd backend && pip install -r requirements.txt && cd ..

# 安装智能体引擎依赖
cd agent-engine && bun install && cd ..

# 复制环境配置
cp .env.example .env

# 启动前端开发服务器
cd frontend && pnpm dev

# 启动后端服务（新终端）
cd backend && uvicorn app.main:app --reload

# 启动智能体引擎（新终端）
cd agent-engine && bun run dev
```

---

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│  Dashboard ─── Editor (Lexical) ─── Settings Panel   │
│       │              │                    │           │
│       └──── REST API calls ───────────────┘           │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────────┐
│                  Backend (FastAPI)                    │
│  Books ─── Chapters ─── Characters ─── Config        │
│       │              │                    │           │
│       └──── Filesystem persistence ───────┘           │
└──────────────────────┬──────────────────────────────┘
                       │ IPC / HTTP
┌──────────────────────▼──────────────────────────────┐
│              Agent Engine (Bun TS)                   │
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ World   │→│ Character│→│ Plot    │  Pipeline     │
│  │ Builder │  │ Weaver  │  │ Architect│              │
│  └─────────┘  └─────────┘  └─────────┘             │
│       ↓            ↓             ↓                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ Chapter │→│ Dialogue│→│ Style   │  Writing       │
│  │ Writer  │  │ Master │  │ Polisher│  Phase        │
│  └─────────┘  └─────────┘  └─────────┘             │
│       ↓            ↓             ↓                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ Continuity│ │ De-AI  │→│ Final   │  Quality      │
│  │ Checker │  │ Rewriter│  │ Editor  │  Assurance   │
│  └─────────┘  └─────────┘  └─────────┘             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 功能特性

### 16 个专业智能体

1. **World Builder** — 世界观与设定构建
2. **Character Weaver** — 角色档案与性格编织
3. **Plot Architect** — 情节架构与三幕设计
4. **Outline Generator** — 章节大纲生成
5. **Chapter Writer** — 正文创作（核心写作智能体）
6. **Dialogue Master** — 对话润色与角色语感
7. **Style Polisher** — 文风统一与段落节奏
8. **Sensory Enhancer** — 五感描写增强
9. **Pacing Controller** — 节奏与张力控制
10. **Continuity Checker** — 前后一致性校验
11. **De-AI Rewriter** — 去 AI 味重写
12. **Knowledge Integrator** — 知识库整合
13. **Reader Simulate** — 读者体验模拟
14. **Title Candidate** — 章节标题候选生成
15. **Summary Generator** — 章节摘要生成
16. **Final Editor** — 终稿审校与出版级打磨

### Pipeline 流水线

智能体按阶段串联执行，每个阶段的输出作为下一阶段的输入。支持：
- 单章流水线（Chapter Pipeline）
- 全书规划流水线（Book Planning Pipeline）
- 自定义执行顺序

### CSV 知识库

角色、设定、世界规则均以 CSV 文件存储，实现：
- 结构化数据管理
- 版本控制友好
- 跨章节一致性查询
- 人类可直接编辑

### De-AI 去 AI 味

专门的重写智能体消除 AI 生成文本的机械感：
- 消除模板化句式
- 注入口语化表达
- 模拟人类写作的"不完美"
- 保持角色语感一致

### 风格学习

系统可分析作者已有作品，提取：
- 用词偏好与词汇密度
- 句式长度分布
- 段落结构习惯
- 修辞手法倾向

### 角色智能层

每个角色拥有：
- 独立的 CSV 知识档案
- 关系图谱
- 记忆时间线
- 行为模式约束

---

## 开发

```bash
# 运行全部测试
pnpm test

# 构建生产版本
pnpm build

# Lint 检查
pnpm lint
```

---

## 环境变量

详见 `.env.example`。

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `BACKEND_HOST` | 后端监听地址 | `127.0.0.1` |
| `BACKEND_PORT` | 后端端口 | `3582` |
| `AGENT_ENGINE_PORT` | 智能体引擎端口 | `3583` |
| `CONOVEL_DATA_DIR` | 数据目录 | `~/.config/conovel` |

---

## License

MIT License. See [LICENSE](./LICENSE) for details.
