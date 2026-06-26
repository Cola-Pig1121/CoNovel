import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ~/.config/conovel/
const BASE_DIR = join(homedir(), '.config', 'conovel');

export function getConfigDir() {
  if (!existsSync(BASE_DIR)) mkdirSync(BASE_DIR, { recursive: true });
  return BASE_DIR;
}

export function getBooksDir() {
  const dir = join(getConfigDir(), 'books');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function getBookDir(bookId: string) {
  const dir = join(getBooksDir(), bookId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function getConversationsDir() {
  const dir = join(getConfigDir(), 'conversations');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

// Generic JSON read/write
export function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return fallback;
}

export function writeJson(filePath: string, data: unknown) {
  const dir = join(filePath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Generate simple UUID
export function uuid(): string {
  return crypto.randomUUID();
}

// Count Chinese characters + English words
export function countWords(text: string): number {
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const english = (text.match(/[a-zA-Z]+/g) || []).length;
  return chinese + english;
}
