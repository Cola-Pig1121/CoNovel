/**
 * Context builder — assembles focused context packets for AI calls.
 * Combines book state, memory, constraints, and outline into a single
 * prompt package, keeping token usage efficient.
 */

import { api } from './api';
import type { FactSnapshot, ChapterSummary } from './memory';

export interface ContextPacket {
  systemPrompt: string;
  bookSettings: string;
  characterProfiles: string;
  recentSummaries: string;
  factSnapshot: string;
  outline: string;
  previousEnding: string;
  constraints: string;
  totalTokens: number;
}

/** Get the last N paragraphs from a chapter. */
function getLastParagraphs(content: string, count: number = 2): string {
  const paragraphs = content.split(/\n\s*\n/).filter(Boolean);
  return paragraphs.slice(-count).join('\n\n');
}

/** Build a context packet for writing the next chapter. */
export async function buildWritingContext(
  bookId: string,
  chapterNumber: number,
  chapterOutline: string,
  previousSnapshot: FactSnapshot | null,
  recentSummaries: ChapterSummary[],
  previousChapterContent: string,
): Promise<ContextPacket> {
  // Fetch book state, constraints, and characters in parallel
  const [bookState, constraintsData] = await Promise.all([
    api.get<any>(`/api/books/${bookId}`),
    api.get<any>(`/api/books/${bookId}/constraints`),
  ]);

  // Build each section
  const systemPrompt = buildSystemPrompt(bookState);
  const bookSettings = buildBookSettings(bookState);
  const characterProfiles = buildCharacterProfiles(bookState, previousSnapshot);
  const summaryText = buildSummaryText(recentSummaries);
  const snapshotText = previousSnapshot
    ? JSON.stringify(previousSnapshot, null, 2)
    : '（无前序状态，这是第一章）';
  const outline = chapterOutline || '（无章节大纲）';
  const previousEnding = previousChapterContent
    ? getLastParagraphs(previousChapterContent)
    : '（无前文）';
  const constraints = buildConstraintsText(constraintsData);

  const packet: ContextPacket = {
    systemPrompt,
    bookSettings,
    characterProfiles,
    recentSummaries: summaryText,
    factSnapshot: snapshotText,
    outline,
    previousEnding,
    constraints,
    totalTokens: estimateTokens(
      systemPrompt + bookSettings + characterProfiles + summaryText + snapshotText + outline + previousEnding + constraints,
    ),
  };

  return packet;
}

/** Format the context packet into a single user prompt. */
export function formatContextForWriting(
  packet: ContextPacket,
  chapterNumber: number,
): { system: string; user: string } {
  const sections: string[] = [];

  sections.push(`# 书籍设定\n${packet.bookSettings}`);
  sections.push(`# 角色档案\n${packet.characterProfiles}`);
  if (packet.recentSummaries.trim()) {
    sections.push(`# 近章摘要\n${packet.recentSummaries}`);
  }
  sections.push(`# 当前叙事状态\n${packet.factSnapshot}`);
  sections.push(`# 第${chapterNumber}章大纲\n${packet.outline}`);
  sections.push(`# 上一章结尾（衔接用）\n${packet.previousEnding}`);
  if (packet.constraints.trim()) {
    sections.push(`# 写作约束\n${packet.constraints}`);
  }

  return {
    system: packet.systemPrompt,
    user: sections.join('\n\n---\n\n'),
  };
}

// ===== Internal Helpers =====

function buildSystemPrompt(bookState: any): string {
  const genre = bookState.genre || 'fantasy';
  const genres = bookState.genres?.join('、') || genre;
  return `你是一位资深的中文网络小说作家。你精通${genres}类型的创作。

写作要求：
- 使用第三人称视角
- 对话自然流畅，符合角色性格
- 场景描写生动，有画面感
- 节奏张弛有度，适时制造悬念
- 章节结尾留有钩子，吸引读者继续阅读
- 避免AI味过重的表达（如"值得一提的是"、"不得不说"、"在这一刻"等）
- 避免过度使用排比句和四字成语堆砌`;
}

function buildBookSettings(bookState: any): string {
  const lines: string[] = [];
  lines.push(`书名：${bookState.title || '未命名'}`);
  lines.push(`类型：${bookState.genre || '未分类'}`);
  if (bookState.premise) lines.push(`简介：${bookState.premise}`);
  lines.push(`目标字数：${bookState.targetWordCount || 3000} 字/章`);
  if (bookState.worldSettings) {
    const ws = typeof bookState.worldSettings === 'string'
      ? bookState.worldSettings
      : JSON.stringify(bookState.worldSettings);
    if (ws !== '{}') lines.push(`世界观：${ws}`);
  }
  return lines.join('\n');
}

function buildCharacterProfiles(bookState: any, snapshot: FactSnapshot | null): string {
  const chars = bookState.characters || [];
  if (chars.length === 0) return '（暂无角色档案）';

  return chars
    .map((c: any) => {
      const lines: string[] = [];
      lines.push(`## ${c.name || '未知角色'}`);
      if (c.description) lines.push(`简介：${c.description}`);
      if (c.personality?.length) lines.push(`性格：${c.personality.join('、')}`);
      if (c.appearance) lines.push(`外貌：${c.appearance}`);
      // Add snapshot state if available
      const state = snapshot?.characters?.find(
        (s) => s.id === c.id || s.name === c.name,
      );
      if (state) {
        lines.push(`当前位置：${state.location}`);
        lines.push(`情绪状态：${state.emotionalState}`);
        if (state.keyActions.length) lines.push(`近期行为：${state.keyActions.join('；')}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

function buildSummaryText(summaries: ChapterSummary[]): string {
  if (summaries.length === 0) return '';
  return summaries
    .map((s) => `**第${s.chapterNumber}章「${s.title}」**：${s.summary}`)
    .join('\n\n');
}

function buildConstraintsText(constraintsData: any): string {
  const files = constraintsData?.files || [];
  if (files.length === 0) return '';

  // We only include the names/previews, not the full content
  // Full constraint loading would be done separately for detailed writing
  return files
    .map((f: any) => `## ${f.name}\n${f.preview || '(无预览)'}`)
    .join('\n\n');
}

function estimateTokens(text: string): number {
  // Rough estimate: ~1.5 tokens per Chinese character, ~0.25 per English word
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const eng = (text.match(/[a-zA-Z]+/g) || []).length;
  return Math.ceil(cjk * 1.5 + eng * 0.25);
}
