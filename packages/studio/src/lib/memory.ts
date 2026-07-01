/**
 * Memory system — structured state management for novel continuity.
 * Inspired by Tianming's 15-dimensional fact snapshots and Openwrite's truth files.
 */

import { api } from './api';
import { parseJSON } from './llm';

// ===== Types =====

export interface CharacterState {
  id: string;
  name: string;
  location: string;
  emotionalState: string;
  keyActions: string[];
  secrets: string[];
  relationships: { targetId: string; relation: string }[];
}

export interface PlotProgress {
  mainPlot: string;
  subplots: string[];
}

export interface ForeshadowingState {
  id: string;
  description: string;
  status: 'buried' | 'hinted' | 'resolved' | 'overdue';
  plantedChapter: number;
  resolvedChapter?: number;
}

export interface FactSnapshot {
  chapterNumber: number;
  timestamp: string;
  characters: CharacterState[];
  plotProgress: PlotProgress;
  foreshadowing: ForeshadowingState[];
  worldState: Record<string, string>;
  timeline: { time: string; event: string }[];
  unresolvedQuestions: string[];
  nextChapterHints: string[];
}

export interface ChapterSummary {
  chapterNumber: number;
  title: string;
  summary: string;
  keyEvents: string[];
}

export interface MemoryState {
  bookId: string;
  currentSnapshot: FactSnapshot | null;
  summaries: ChapterSummary[];
  currentStateMarkdown: string;
}

// ===== API Functions =====

/** Get all memory snapshots for a book. */
export async function getSnapshots(bookId: string): Promise<FactSnapshot[]> {
  try {
    const data = await api.get<{ snapshots: FactSnapshot[] }>(
      `/api/books/${bookId}/memory`,
    );
    return data.snapshots || [];
  } catch {
    return [];
  }
}

/** Get the latest fact snapshot. */
export async function getLatestSnapshot(
  bookId: string,
): Promise<FactSnapshot | null> {
  const snapshots = await getSnapshots(bookId);
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
}

/** Get chapter summaries. */
export async function getSummaries(
  bookId: string,
): Promise<ChapterSummary[]> {
  try {
    const data = await api.get<{ summaries: ChapterSummary[] }>(
      `/api/books/${bookId}/memory/summaries`,
    );
    return data.summaries || [];
  } catch {
    return [];
  }
}

/** Get recent summaries (last N chapters). */
export async function getRecentSummaries(
  bookId: string,
  count: number = 3,
): Promise<ChapterSummary[]> {
  const all = await getSummaries(bookId);
  return all.slice(-count);
}

/** Get the current state markdown. */
export async function getCurrentState(
  bookId: string,
): Promise<string> {
  try {
    const data = await api.get<{ content: string }>(
      `/api/books/${bookId}/memory/current_state`,
    );
    return data.content || '';
  } catch {
    return '';
  }
}

/**
 * Extract a fact snapshot from a chapter using AI.
 * Called after chapter completion.
 */
export async function extractSnapshot(
  bookId: string,
  chapterNumber: number,
  chapterContent: string,
  previousSnapshot: FactSnapshot | null,
): Promise<FactSnapshot> {
  const systemPrompt = `你是一个专业的叙事状态分析器。你的任务是从小说章节中提取结构化的叙事状态。

输出严格的 JSON 格式：
{
  "chapterNumber": ${chapterNumber},
  "timestamp": "当前时间ISO格式",
  "characters": [
    {
      "id": "角色唯一ID（小写英文）",
      "name": "角色名",
      "location": "当前所在地",
      "emotionalState": "当前情绪状态",
      "keyActions": ["本章关键行为"],
      "secrets": ["知道的秘密"],
      "relationships": [{"targetId": "其他角色ID", "relation": "关系描述"}]
    }
  ],
  "plotProgress": {
    "mainPlot": "主线进展一句话概述",
    "subplots": ["支线进展"]
  },
  "foreshadowing": [
    {
      "id": "伏笔ID",
      "description": "伏笔描述",
      "status": "buried|hinted|resolved",
      "plantedChapter": 埋设章节号,
      "resolvedChapter": null
    }
  ],
  "worldState": {"key": "value"},
  "timeline": [{"time": "时间点", "event": "事件"}],
  "unresolvedQuestions": ["未解决的问题"],
  "nextChapterHints": ["给下一章的提示"]
}

只输出 JSON，不要其他文字。`;

  const contextMsg = previousSnapshot
    ? `\n\n上一章状态快照：\n${JSON.stringify(previousSnapshot, null, 2)}`
    : '\n\n这是第一章，没有前序状态。';

  const userPrompt = `请从以下章节内容中提取叙事状态：

章节 ${chapterNumber}：

${chapterContent}
${contextMsg}`;

  // Call LLM via Rust backend
  const { callLLM } = await import('./llm');
  const { getProviders } = await import('./providers');
  const providers = await getProviders();
  const provider = providers.find(p => p.enabled && p.models.length > 0);
  if (!provider) throw new Error('No enabled LLM provider found');

  const result = await callLLM({
    provider,
    modelId: provider.models[0].id,
    system: systemPrompt,
    user: userPrompt,
    temperature: 0.3,
    maxTokens: 4096,
  });
  let parsed: any;
  try {
    // Parse JSON from the response, handling markdown code blocks
    let jsonStr = result.content;
    parsed = parseJSON(jsonStr);
  } catch {
    // Fallback: return a basic snapshot
    return {
      chapterNumber,
      timestamp: new Date().toISOString(),
      characters: [],
      plotProgress: { mainPlot: '（提取失败）', subplots: [] },
      foreshadowing: [],
      worldState: {},
      timeline: [],
      unresolvedQuestions: [],
      nextChapterHints: [],
    };
  }
  return parsed as FactSnapshot;
}

/**
 * Generate a chapter summary using AI.
 */
export async function generateSummary(
  bookId: string,
  chapterNumber: number,
  chapterTitle: string,
  chapterContent: string,
): Promise<ChapterSummary> {
  const systemPrompt = `你是一个专业的叙事摘要器。请为小说章节生成简洁的摘要。

输出 JSON 格式：
{
  "chapterNumber": ${chapterNumber},
  "title": "${chapterTitle}",
  "summary": "150-200字的章节摘要",
  "keyEvents": ["关键事件1", "关键事件2"]
}

只输出 JSON。`;

  const { callLLM } = await import('./llm');
  const { getProviders } = await import('./providers');
  const providers = await getProviders();
  const provider = providers.find(p => p.enabled && p.models.length > 0);
  if (!provider) throw new Error('No enabled LLM provider found');

  const result = await callLLM({
    provider,
    modelId: provider.models[0].id,
    system: systemPrompt,
    user: `章节标题：${chapterTitle}\n\n章节内容：\n${chapterContent}`,
    temperature: 0.3,
    maxTokens: 1024,
  });
  let parsed: any;
  try {
    let jsonStr = result.content;
    parsed = parseJSON(jsonStr);
  } catch {
    return {
      chapterNumber,
      title: chapterTitle,
      summary: chapterContent.slice(0, 200) + '...',
      keyEvents: [],
    };
  }
  return parsed as ChapterSummary;
}
