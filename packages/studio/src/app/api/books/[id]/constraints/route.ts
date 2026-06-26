import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getBooksDir } from '@/lib/config-path';

function getConstraintsDir(bookId: string): string {
  const dir = join(getBooksDir(), bookId, 'constraints');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

// Default constraint files
const DEFAULT_CONSTRAINTS: Record<string, string> = {
  'style-constraints.md': `# 风格约束

## 叙事视角
第三人称有限视角

## 句式风格
长短交替，避免连续长句。短句仅在关键判断处使用。

## 词汇水平
中等偏文雅，避免过于口语化或过于书面化。

## 对话风格
口语化但不粗俗，符合角色身份。

## 禁词列表
不禁、仿佛、映入眼帘、前所未有、意义深远、微微、淡淡、缓缓

## 段落结构
- 厚段（200-500字）：承载多层动作、对话、心理
- 中段（90-180字）：承接场景、转换视角
- 薄段（30-90字）：短促判断、转折钉
- 一句成段（8-30字）：冷判断或收束

## 连续性禁令
- 禁连续3段 <90字
- 禁连续2段一句成段
- 禁连续3段厚段
`,

  'genre-constraints.md': `# 题材约束

## 适用题材
（根据所选题材自动填充）

## 题材特有规则
（从题材模板导入）

## 题材禁忌
（从题材模板导入）
`,

  'character-rules.md': `# 角色行为规则

## 主角
（由角色设计师填充）

## 主要配角
（由角色设计师填充）

## 角色一致性检查
- 角色行为必须符合性格设定
- 角色能力不能超出已建立的水平
- 角色关系发展要自然
- 新出场角色需要铺垫
`,

  'plot-constraints.md': `# 剧情约束

## 节奏控制
- 高潮章节后安排缓冲
- 连续高潮不超过3章
- 每章至少1个章末钩子

## 剧情加速上限
每章最多触发以下之一：
- A: 主线实质推进
- B: 关系决定性升级
- C: 核心秘密完整揭示

## 伏笔规则
- 伏笔必须在指定章节内回收
- 逾期伏笔会触发警告
- 新伏笔植入要自然

## 爽点设计
- 先抑后扬：压制→积蓄→反转→爽
- 每章至少1个微爽点
- 每3-5章至少1个大爽点
`,

  'banned-words.md': `# 禁词列表

## AI高频词汇（必须替换）
不禁、仿佛、映入眼帘、前所未有、意义深远
微微、淡淡、缓缓、默默

## AI句式（必须打破）
不是A而是B、不仅...而且...更、首先其次最后
值得注意的是、不可否认、毋庸置疑

## 网络口语（必须删除）
说白了、本质上就是、无非就是、半毛钱、翻车、收割

## 宣传腔（必须替换）
深刻揭示了、充分体现了、具有重大意义

## 伪学术（必须替换）
舆论场、底层逻辑、赛道、闭环、抓手
`,

  'writing-guide.md': `# 写作指南

## 自由编写区域
在这里编写自定义的写作约束、灵感笔记、风格参考等。

## 示例
- 本文的叙事节奏偏快，适合碎片化阅读
- 主角的说话风格要简洁有力
- 战斗描写要注重招式细节
- 感情线要自然发展，不要强行
`,
};

/** GET /api/books/[id]/constraints — list or read constraint files */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('file');

  const dir = getConstraintsDir(id);

  // Initialize defaults if directory is empty
  const existingFiles = readdirSync(dir).filter(f => f.endsWith('.md'));
  if (existingFiles.length === 0) {
    for (const [name, content] of Object.entries(DEFAULT_CONSTRAINTS)) {
      writeFileSync(join(dir, name), content, 'utf-8');
    }
  }

  // Read specific file
  if (fileName) {
    const filePath = join(dir, fileName);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({
      name: fileName,
      content: readFileSync(filePath, 'utf-8'),
    });
  }

  // List all constraint files
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      name: f,
      size: readFileSync(join(dir, f)).length,
      preview: readFileSync(join(dir, f), 'utf-8').substring(0, 100),
    }));

  return NextResponse.json({ files });
}

/** PUT /api/books/[id]/constraints — save constraint file */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, content } = body;

  if (!name || content === undefined) {
    return NextResponse.json({ error: 'name and content required' }, { status: 400 });
  }

  // Sanitize filename
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safeName.endsWith('.md')) {
    return NextResponse.json({ error: 'File must end with .md' }, { status: 400 });
  }

  const dir = getConstraintsDir(id);
  const filePath = join(dir, safeName);
  writeFileSync(filePath, content, 'utf-8');

  return NextResponse.json({ success: true, name: safeName });
}

/** POST /api/books/[id]/constraints — create new constraint file */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, content } = body;

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.md';
  const dir = getConstraintsDir(id);
  const filePath = join(dir, safeName);

  if (existsSync(filePath)) {
    return NextResponse.json({ error: 'File already exists' }, { status: 409 });
  }

  writeFileSync(filePath, content || `# ${name}\n\n（在此编写约束内容）\n`, 'utf-8');

  return NextResponse.json({ success: true, name: safeName });
}

/** DELETE /api/books/[id]/constraints — delete constraint file */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const dir = getConstraintsDir(id);
  const filePath = join(dir, name);

  if (existsSync(filePath)) {
    const { rmSync } = await import('fs');
    rmSync(filePath);
  }

  return NextResponse.json({ success: true });
}
