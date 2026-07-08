# CoNovel 书籍目录标准格式

每本书存储在 `~/.config/conovel/books/{book_id}/` 目录下。

## 目录结构

```
book_id/
├── state.json                    # 书籍元数据（必须）
├── .eve/                         # Agent 配置（必须）
│   ├── agent-config.json         # 16 个 Agent 的模型配置
│   ├── constraints/              # 约束规则
│   │   ├── banned-words.md       # 禁用词
│   │   ├── character-rules.md    # 角色规则
│   │   ├── plot-constraints.md   # 剧情约束
│   │   ├── style-constraints.md  # 文风约束
│   │   └── writing-guide.md      # 写作指南
│   ├── agents/                   # Agent 系统提示词（可选）
│   └── evolution.log             # 演化日志
├── chapters/                     # 章节文件
│   ├── chapter_0001.json         # 第1章
│   ├── chapter_0002.json         # 第2章
│   └── ...
├── characters.json               # 角色列表
├── foreshadowing.json            # 伏笔列表
├── timeline.json                 # 时间线事件
├── outline.json                  # 大纲结构
├── memory/                       # 记忆系统
│   ├── facts/                    # 每章事实快照
│   ├── summaries/                # 章节摘要
│   ├── character_states/         # 角色跨章节状态
│   └── long_term/                # 长期记忆 + VolumeLore
├── knowledge/                    # CSV 知识库
├── references/                   # 参考小说
│   └── style-profile.json        # 文风指纹
├── events/                       # 事件记录
├── constraints/                  # 用户可编辑的约束
└── pipeline/                     # Pipeline 运行记录
```

## state.json 格式

```json
{
  "id": "书ID",
  "title": "书名",
  "genre": "类型",
  "genres": ["类型1", "类型2"],
  "premise": "前提",
  "targetWordCount": 100000,
  "currentWordCount": 0,
  "currentChapter": 0,
  "totalChapters": 0,
  "status": "planning",
  "createdAt": "ISO时间",
  "updatedAt": "ISO时间"
}
```

## chapter_XXXX.json 格式

```json
{
  "chapterNumber": 1,
  "title": "章节标题",
  "content": "章节正文...",
  "wordCount": 3000,
  "status": "draft",
  "outline": "章节大纲",
  "qualityGate": "L1",
  "createdAt": "ISO时间",
  "updatedAt": "ISO时间"
}
```
