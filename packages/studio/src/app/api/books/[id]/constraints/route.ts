import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

function cDir(id: string) { const d = join(homedir(), '.config', 'conovel', 'books', id, 'constraints'); if (!existsSync(d)) mkdirSync(d, { recursive: true }); return d; }
const DEFAULTS: [string, string][] = [['style-constraints.md', '# 风格约束\n\n## 叙事视角\n第三人称有限视角\n\n## 禁词\n不禁、仿佛、微微、淡淡、缓缓\n'], ['banned-words.md', '# 禁词列表\n\n## AI高频词\n不禁、仿佛、映入眼帘、微微、淡淡、缓缓\n\n## AI句式\n不是A而是B、不仅...而且...更\n'], ['plot-constraints.md', '# 剧情约束\n\n每章最多1个A/B/C级触发\n高潮后安排缓冲\n每章至少1个章末钩子\n'], ['character-rules.md', '# 角色行为规则\n\n角色行为必须符合性格设定\n角色能力不能超出已建立的水平\n'], ['writing-guide.md', '# 写作指南\n\n## 自由编写区域\n在这里编写创作约束和灵感笔记。\n']];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dir = cDir(id);
  if (!readdirSync(dir).filter(f => f.endsWith('.md')).length) { for (const [n, c] of DEFAULTS) writeFileSync(join(dir, n), c); }
  return NextResponse.json({ files: readdirSync(dir).filter(f => f.endsWith('.md')).map(f => ({ name: f, size: readFileSync(join(dir, f)).length, preview: readFileSync(join(dir, f), 'utf-8').substring(0, 100) })) });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, content } = await req.json();
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  writeFileSync(join(cDir(id), safe), content);
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, content } = await req.json();
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const f = join(cDir(id), safe.endsWith('.md') ? safe : `${safe}.md`);
  if (existsSync(f)) return NextResponse.json({ error: 'Exists' }, { status: 409 });
  writeFileSync(f, content || `# ${name}\n\n（在此编写约束内容）\n`);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json();
  const f = join(cDir(id), name);
  if (existsSync(f)) rmSync(f);
  return NextResponse.json({ success: true });
}
