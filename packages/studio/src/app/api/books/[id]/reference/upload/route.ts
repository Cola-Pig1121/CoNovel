import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getBooksDir } from '@/lib/config-path';

function getRefDir(bookId: string): string {
  const dir = join(getBooksDir(), bookId, 'reference');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** POST /api/books/[id]/reference/upload — upload a reference file */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validExtensions = ['.txt', '.md', '.epub'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      return NextResponse.json({ error: `Unsupported file type: ${ext}. Supported: ${validExtensions.join(', ')}` }, { status: 400 });
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());

    // Save to reference directory
    const refDir = getRefDir(id);
    const safeName = file.name.replace(/[<>:"/\\|?*]/g, '_');
    const filePath = join(refDir, safeName);
    writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      name: safeName,
      size: buffer.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
