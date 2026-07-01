/**
 * Pipeline stage handlers — each stage receives input and returns output.
 */

import { callLLM } from '@/lib/llm';
import { getProviders, type Provider } from '@/lib/providers';
import { extractSnapshot, generateSummary, type FactSnapshot } from '@/lib/memory';
import { PROMPTS, STAGE_NAMES, type PipelineStage } from './prompts';

export interface StageInput {
  bookId: string;
  chapterNumber: number;
  chapterTitle: string;
  chapterContent: string;
  chapterOutline: string;
  bookState: any;
  previousSnapshot: FactSnapshot | null;
  recentSummaries: { chapterNumber: number; title: string; summary: string }[];
  contextPacket: { system: string; user: string };
  previousStageResults: Record<string, any>;
}

export interface StageOutput {
  success: boolean;
  stage: PipelineStage;
  result: any;
  error?: string;
  tokenUsage: { promptTokens: number; completionTokens: number };
}

/** Get the default provider/model for pipeline calls. */
async function getDefaultLLM(): Promise<{ provider: Provider; modelId: string }> {
  const providers = await getProviders();
  // Find first enabled provider with models
  for (const p of providers) {
    if (p.enabled && p.models.length > 0) {
      return { provider: p, modelId: p.models[0].id };
    }
  }
  throw new Error('No enabled provider found. Please configure a provider in Settings.');
}

/** Parse JSON from LLM response, handling markdown code blocks. */
function parseJSON(text: string): any {
  let str = text;
  const match = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) str = match[1];
  return JSON.parse(str.trim());
}

/** Generic stage runner — calls LLM with the stage's prompt. */
async function runLLMStage(
  stage: PipelineStage,
  input: StageInput,
  extraContext?: string,
): Promise<StageOutput> {
  const { provider, modelId } = await getDefaultLLM();
  const prompt = PROMPTS[stage];

  let userContent = input.contextPacket?.user || input.chapterContent;
  if (extraContext) {
    userContent = extraContext + '\n\n---\n\n' + userContent;
  }

  // Add previous stage results for downstream stages
  if (stage !== 'context_assembled' && stage !== 'character_intelligence') {
    const relevantResults = Object.entries(input.previousStageResults)
      .filter(([k]) => ['character_intelligence', 'fact_check', 'continuity_check', 'review'].includes(k))
      .map(([k, v]) => `## ${STAGE_NAMES[k as PipelineStage] || k}\n${JSON.stringify(v, null, 2)}`)
      .join('\n\n');
    if (relevantResults) {
      userContent += `\n\n---\n\n# 前序分析结果\n${relevantResults}`;
    }
  }

  const result = await callLLM({
    provider,
    modelId,
    system: prompt.system,
    user: userContent,
    temperature: stage === 'writing' ? 0.8 : 0.4,
    maxTokens: stage === 'writing' ? 8192 : 4096,
  });

  let parsed: any;
  try {
    parsed = parseJSON(result.content);
  } catch {
    parsed = { rawText: result.content };
  }

  return {
    success: true,
    stage,
    result: parsed,
    tokenUsage: result.usage,
  };
}

/**
 * Stage: writing — special handler that produces prose, not JSON.
 */
async function stageWriting(input: StageInput): Promise<StageOutput> {
  const { provider, modelId } = await getDefaultLLM();
  const prompt = PROMPTS.writing;

  const result = await callLLM({
    provider,
    modelId,
    system: prompt.system,
    user: input.contextPacket?.user || input.chapterContent,
    temperature: 0.8,
    maxTokens: 8192,
  });

  return {
    success: true,
    stage: 'writing',
    result: { text: result.content },
    tokenUsage: result.usage,
  };
}

/**
 * Stage: editing — takes the written text and refines it.
 */
async function stageEditing(input: StageInput): Promise<StageOutput> {
  const { provider, modelId } = await getDefaultLLM();
  const prompt = PROMPTS.editing;
  const writtenText = input.previousStageResults.writing?.text || input.chapterContent;

  const result = await callLLM({
    provider,
    modelId,
    system: prompt.system,
    user: `请润色以下章节正文：\n\n${writtenText}`,
    temperature: 0.5,
    maxTokens: 8192,
  });

  return {
    success: true,
    stage: 'editing',
    result: { text: result.content },
    tokenUsage: result.usage,
  };
}

/**
 * Stage: de_ai — detects and removes AI writing patterns.
 */
async function stageDeAI(input: StageInput): Promise<StageOutput> {
  const { provider, modelId } = await getDefaultLLM();
  const prompt = PROMPTS.de_ai;
  const editedText = input.previousStageResults.editing?.text
    || input.previousStageResults.writing?.text
    || input.chapterContent;

  const result = await callLLM({
    provider,
    modelId,
    system: prompt.system,
    user: `请检查并修复以下文本的AI写作痕迹：\n\n${editedText}`,
    temperature: 0.4,
    maxTokens: 8192,
  });

  let parsed: any;
  try {
    parsed = parseJSON(result.content);
  } catch {
    parsed = { score: 50, correctedText: result.content, issues: [] };
  }

  return {
    success: true,
    stage: 'de_ai',
    result: parsed,
    tokenUsage: result.usage,
  };
}

/**
 * Stage: state_sync — extracts snapshot and summary using AI + memory system.
 */
async function stageStateSync(input: StageInput): Promise<StageOutput> {
  const finalText = input.previousStageResults.de_ai?.correctedText
    || input.previousStageResults.editing?.text
    || input.previousStageResults.writing?.text
    || input.chapterContent;

  // Extract snapshot and summary in parallel
  const [snapshot, summary] = await Promise.all([
    extractSnapshot(input.bookId, input.chapterNumber, finalText, input.previousSnapshot),
    generateSummary(input.bookId, input.chapterNumber, input.chapterTitle, finalText),
  ]);

  return {
    success: true,
    stage: 'state_sync',
    result: { snapshot, summary, finalText },
    tokenUsage: { promptTokens: 0, completionTokens: 0 },
  };
}

/**
 * Run a single pipeline stage.
 */
export async function runStage(
  stage: PipelineStage,
  input: StageInput,
): Promise<StageOutput> {
  switch (stage) {
    case 'writing':
      return stageWriting(input);
    case 'editing':
      return stageEditing(input);
    case 'de_ai':
      return stageDeAI(input);
    case 'state_sync':
      return stageStateSync(input);
    default:
      return runLLMStage(stage, input);
  }
}
