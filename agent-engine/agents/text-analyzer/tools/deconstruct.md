# deconstruct

拆解指定文本段落或章节，提取可复用的写作模块。

## 参数
- `text`: 待拆解的文本内容（全文或指定段落）
- `scope`: 拆解范围
  - `chapter`: 单章拆解（默认）
  - `segment`: 指定段落拆解
  - `cross_chapter`: 跨章节对比拆解
- `focus`: 拆解重点（可多选）
  - `structure`: 结构分析
  - `plot`: 情节模块
  - `character`: 人设模式
  - `dialogue`: 对话技法
  - `pacing`: 节奏分析
  - `hook`: 钩子识别
  - `all`: 全维度拆解（默认）
- `reference_modules`: 已有模块库（可选，用于对比去重）

## 输出
```json
{
  "scope": "拆解范围",
  "focus": ["拆解重点"],
  "extracted_modules": [
    {
      "module_id": "新增模块编号",
      "module_name": "模块名称",
      "type": "模块类型",
      "description": "模块描述",
      "source_location": "原文位置",
      "usage_scenario": "适用场景",
      "variants": ["变体"],
      "effectiveness": 评分,
      "is_new": true
    }
  ],
  "analysis_notes": "拆解备注",
  "duplicates_found": ["与已有模块的重复/相似项"]
}
```

## 使用说明
- scope 为 `cross_chapter` 时需要提供多个章节的文本
- `reference_modules` 用于去重，避免重复提取相同模块
- 拆解结果会自动追加到模块库中
