import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  const dir = join(homedir(), '.config', 'conovel', 'books', id, 'reference');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const safeName = file.name.replace(/[<>:"/\\|?*]/g, '_');
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(join(dir, safeName), buffer);
  return NextResponse.json({ success: true, name: safeName, size: buffer.length });
}
