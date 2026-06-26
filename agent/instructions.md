# CoNovel - 自进化多Agent小说写作系统

## 架构

每本小说拥有独立的Agent文件夹：`agent/books/{book-id}/`

```
agent/
├── instructions.md              # 本文件：全局协调Agent
├── agent.ts                     # 全局Agent配置
├── books/
│   └── {book-id}/              # 每本书的独立Agent
│       ├── instructions.md      # 本书的系统提示词
│       ├── agent.ts             # 本书的模型配置
│       ├── tools/               # 14个工具（与API通信）
│       │   ├── read-chapter.ts
│       │   ├── write-chapter.ts
│       │   ├── get-characters.ts
│       │   ├── update-character.ts
│       │   ├── get-foreshadowing.ts
│       │   ├── add-foreshadowing.ts
│       │   ├── get-timeline.ts
│       │   ├── add-event.ts
│       │   ├── get-style.ts
│       │   ├── get-reading-power.ts
│       │   ├── get-hooks-status.ts
│       │   ├── get-memory.ts
│       │   ├── get-graph.ts
│       │   └── naming.ts
│       ├── skills/              # 7个按需加载技能
│       │   ├── scene-writing.md
│       │   ├── outline-builder.md
│       │   ├── character-design.md
│       │   ├── anti-ai-edit.md
│       │   ├── style-calibration.md
│       │   ├── naming.md
│       │   └── webnovel-techniques.md
│       └── subagents/           # 15个子Agent
│           ├── architect/
│           ├── writer/
│           ├── character-intelligence/
│           ├── reviewer/
│           ├── editor/
│           ├── de-ai-editor/
│           ├── observer/
│           ├── character-designer/
│           ├── fact-checker/
│           ├── continuity/
│           ├── pacing-controller/
│           ├── foreshadowing/
│           ├── style-analyzer/
│           ├── radar/
│           └── reflector/
```

## 全局协调Agent

当用户操作书籍时，路由到对应的书籍Agent。

## 每本书的Agent

每本书的Agent包含：
- **instructions.md** — 本书的写作铁律、角色定义、工具清单
- **agent.ts** — 本书的模型配置（可通过LiteLLM网关自定义）
- **tools/** — 14个工具，通过HTTP调用后端API
- **skills/** — 7个技能文档，按需加载
- **subagents/** — 15个子Agent，各有专属工具和技能映射

## 子Agent → 工具/技能映射

| Agent | 工具 | 技能 |
|-------|------|------|
| architect | get-characters, get-foreshadowing, get-timeline, get-outline, get-style | outline-builder, character-design |
| writer | read-chapter, write-chapter, get-characters, get-style, get-foreshadowing | scene-writing, webnovel-techniques, anti-ai-edit |
| character-intelligence | get-characters, get-graph, get-timeline | character-design |
| reviewer | read-chapter, get-characters, get-foreshadowing, get-reading-power | — |
| editor | read-chapter, write-chapter, get-style | scene-writing, style-calibration |
| de-ai-editor | read-chapter, write-chapter, get-style | anti-ai-edit |
| observer | read-chapter, add-event, update-character, get-foreshadowing | — |
| character-designer | get-characters, update-character, get-graph, naming | character-design |
| fact-checker | read-chapter, get-characters, get-timeline, get-memory | — |
| continuity | read-chapter, get-characters, get-timeline, get-foreshadowing | — |
| pacing-controller | read-chapter, get-reading-power, get-foreshadowing | webnovel-techniques |
| foreshadowing | get-foreshadowing, add-foreshadowing, get-hooks-status, read-chapter | — |
| style-analyzer | read-chapter, get-style, get-memory | style-calibration |
| radar | get-style, get-reading-power | — |
| reflector | read-chapter, get-reading-power, get-hooks-status, get-memory | — |

## 写作铁律

1. **剧情加速上限**：每章最多1个A/B/C级触发
2. **情感优先**：每个场景服务明确情感目标
3. **角色一致性**：角色行为符合性格设定
4. **伏笔有始有终**：伏笔必须在指定章节内回收
5. **禁止加速结局**：核心冲突不能在最终章前解决

## 质量门禁（5层）

| 层级 | 检查项 | 失败处理 |
|------|--------|----------|
| L1 | 记忆同步 | 阻断 |
| L2 | 事实一致性 | P0阻断 |
| L3 | 连续性 | P0阻断 |
| L4 | 风格校准 | 警告 |
| L5 | 去AI味(28项) | 警告/自动修复 |
