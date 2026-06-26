import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { getBooksDir, readJson, writeJson } from '@/lib/config-path';

function getStyleFile(id: string): string {
  return join(getBooksDir(), id, 'style.json');
}

const DEFAULT_STYLE = {
  genre: 'custom',
  narrativePerspective: '第三人称有限视角',
  sentenceStyle: '长短交替，避免连续长句',
  vocabularyLevel: '中等偏文雅',
  dialogueStyle: '口语化但不粗俗',
  bannedWords: ['不禁', '仿佛', '映入眼帘', '前所未有', '意义深远', '微微', '淡淡', '缓缓'],
  bannedPatterns: ['三段式排比', '过度解释', '学术论文式段落'],
  styleSamples: [],
  customRules: '',
};

/** GET /api/books/[id]/style */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const style = readJson(getStyleFile(id), DEFAULT_STYLE);
  return NextResponse.json(style);
}

/** PUT /api/books/[id]/style */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const existing = readJson(getStyleFile(id), DEFAULT_STYLE);
  const updated = { ...existing, ...body };
  writeJson(getStyleFile(id), updated);
  return NextResponse.json(updated);
}
