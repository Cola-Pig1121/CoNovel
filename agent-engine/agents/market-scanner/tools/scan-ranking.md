# scan-ranking

扫描指定平台的小说排行榜，提取榜单数据。

## 参数
- `platform`: 平台名称（"qidian" | "fanqie" | "zhihu"）
- `list_type`: 榜单类型
  - 起点：`hot`（畅销榜）| `recommend`（推荐榜）| `newbook`（新书榜）| `completed`（完本榜）
  - 番茄：`hot`（热度榜）| `complete`（完读榜）
  - 知乎：`hot`（热度榜）| `trending`（趋势榜）
- `genre_filter`: 题材筛选（可选，如 "玄幻"、"都市"）
- `top_n`: 取前N本（默认20）

## 输出
```json
{
  "platform": "平台名称",
  "list_type": "榜单类型",
  "scan_time": "扫描时间",
  "works": [
    {
      "rank": 排名,
      "title": "书名",
      "author": "作者",
      "genre": "题材",
      "word_count": 字数,
      "rating": 评分,
      "follower_count": 追读/收藏数,
      "recent_chapter": "最新章节摘要",
      "update_frequency": "更新频率",
      "tags": ["标签"],
      "hook_summary": "开篇钩子概述"
    }
  ]
}
```

## 使用说明
- 扫描频率建议：热门榜单每周1次，新书榜每周2次
- genre_filter 为空时返回全品类榜单
- 数据异常时标注 `data_quality: "estimated"` 表示为估算值
