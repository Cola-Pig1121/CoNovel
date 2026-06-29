import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

function sf(id: string) { return join(homedir(), '.config', 'conovel', 'books', id, 'style.json'); }
function rj<T>(f: string, d: T): T { try { if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8')); } catch {} return d; }
function wj(f: string, v: unknown) { writeFileSync(f, JSON.stringify(v, null, 2), 'utf-8'); }

const DEFAULT_STYLE = { genre: 'custom', narrativePerspective: '第三人称有限视角', sentenceStyle: '长短交替', vocabularyLevel: '中等偏文雅', dialogueStyle: '口语化但不粗俗', bannedWords: ['不禁','仿佛','映入眼帘','微微','淡淡','缓缓'], bannedPatterns: ['三段式排比','过度解释'], styleSamples: [], customRules: '' };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(rj(sf(id), DEFAULT_STYLE));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = rj(sf(id), DEFAULT_STYLE);
  const updates = await req.json();
  const updated = { ...existing, ...updates };
  wj(sf(id), updated);
  return NextResponse.json(updated);
}
