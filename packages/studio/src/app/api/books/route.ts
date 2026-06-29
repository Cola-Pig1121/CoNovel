import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { NextRequest, NextResponse } from 'next/server';

const CONFIG_DIR = join(homedir(), '.config', 'conovel');

function getBooksDir() {
  const dir = join(CONFIG_DIR, 'books');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson<T>(file: string, fallback: T): T {
  try { if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf-8')); } catch {}
  return fallback;
}

function writeJson(file: string, data: unknown) {
  const dir = join(file, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function uuid() { return crypto.randomUUID(); }

function chronoNow() { return new Date().toISOString(); }

function countWords(text: string): number {
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const english = (text.match(/[a-zA-Z]+/g) || []).length;
  return chinese + english;
}

// ===== Books =====
export async function GET() {
  const idx = readJson(join(getBooksDir(), '_index.json'), []);
  return NextResponse.json({ books: idx });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, genre, genres, premise, targetWordCount } = body;
  const id = uuid();
  const now = chronoNow();
  const bookDir = join(getBooksDir(), id);
  if (!existsSync(bookDir)) mkdirSync(bookDir, { recursive: true });

  const state = { id, title, genre: genre || 'custom', genres: genres || [], premise: premise || '', targetWordCount: targetWordCount || 1000000, currentWordCount: 0, currentChapter: 0, totalChapters: 0, status: 'planning', characters: [], foreshadowing: [], outline: { volumes: [], progress: { mainPlot: 0, subplots: {} } }, timeline: [], worldSettings: {}, createdAt: now, updatedAt: now, lastSyncedAt: now };
  writeJson(join(bookDir, 'state.json'), state);

  const index: any[] = readJson(join(getBooksDir(), '_index.json'), []);
  index.push({ id, title, genre: state.genre, genres: state.genres, premise: state.premise, targetWordCount: state.targetWordCount, currentWordCount: 0, currentChapter: 0, totalChapters: 0, status: 'planning', createdAt: now, updatedAt: now });
  writeJson(join(getBooksDir(), '_index.json'), index);

  return NextResponse.json(state, { status: 201 });
}
