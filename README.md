# CoNovel

Tauri 桌面端小说写作系统。15 个 Agent 各自负责一件事，通过 Python litellm 调用 AI 模型，完成从大纲到成稿的全部流程。

---

## 这是什么

长篇小说写到后面最容易崩的不是文笔，是一致性——角色前后矛盾、伏笔有始无终、节奏失控。CoNovel 把这些容易出错的环节拆成 15 个专职 Agent，每个只做一件事。

```
角色推理 → 正文创作 → 事件记录
  → 事实核查 + 连续性检查 + 节奏检查（并行）
  → 综合审阅（13维度，最多3轮收敛）
  → 文字润色 → 28项去AI味 → 质量反思 → 状态同步
```

5 层质量门禁：记忆同步、事实一致性、连续性、风格校准、去AI味。

---

## 技术架构

```
src-tauri/              Rust 后端（文件操作、LLM调用）
packages/studio/        React 前端（Tauri Webview）
agent/                  15 个 Agent 指令 + 技能 + 工具
scripts/                Python litellm 桥接 + 安装脚本
```

---

## Agent

**核心创作**：故事架构师（大纲）、写作特工（正文）、角色智能体（角色思维推理）

**质量控制**：审阅官（13维度）、编辑、去AI味编辑（28项检测）、事实核查官、连续性检查官、节奏控制官

**辅助**：观察者、角色设计师、伏笔管理官、风格分析师、趋势雷达、反思官

三个等级（强/中/轻模型）在设置页面自行选择。

---

## 安装

**一键安装（Windows）**：

```powershell
irm https://raw.githubusercontent.com/Cola-Pig1121/CoNovel/main/scripts/install.ps1 | iex
```

**手动安装**：

```bash
git clone https://github.com/Cola-Pig1121/CoNovel.git
cd CoNovel && pnpm install
bash scripts/setup.sh
```

**从 Release 下载**：[Releases](https://github.com/Cola-Pig1121/CoNovel/releases)

---

## 运行

```bash
# 终端 1
cd packages/studio && pnpm dev

# 终端 2
cd src-tauri && cargo tauri dev
```

1. 设置 → 添加 LiteLLM 网关或直连 API → 扫描模型 → 配置 Agent 模型
2. 新建项目 → 输入书名和核心设定 → 选择题材
3. 项目详情页 14 个 Tab：约束 / 参考 / 风格 / 角色 / 大纲 / 章节 / 写作 ...

---

## 模型接入

通过 Python litellm 调用，自动处理厂商参数差异。

- **LiteLLM Proxy**：`http://localhost:4000`
- **直连 API**：OpenAI / Anthropic / DeepSeek / Ollama 等
- **自定义端点**：任何 OpenAI 兼容接口

---

## 数据存储

无云依赖，全部本地：

```
~/.config/conovel/
├── providers.json       模型供应商
├── agents.json          Agent 模型映射
├── books/{id}/          书籍状态、章节、约束、参考
└── conversations/       Agent 对话历史
```

---

## CI / Release

```bash
git tag v0.1.0 && git push origin v0.1.0
```

GitHub Actions 自动构建 Windows 安装包（.msi / .exe），上传到 Release。应用启动时自动检查更新。

---

## License

MIT
