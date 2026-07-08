// ============================================================
// API Client
// Communicates with Python FastAPI backend (port 3582)
// ============================================================

const BASE_URL = '/api'

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<T>
}

// --- Books ---

export const booksApi = {
  list: () => request<import('./types').BookMeta[]>('GET', '/books/'),
  get: (id: string) => request<import('./types').BookState>('GET', `/books/${id}`),
  create: (data: { title: string; genres: string[]; premise: string }) =>
    request<import('./types').BookMeta>('POST', '/books/', data),
  update: (id: string, data: Partial<import('./types').BookMeta>) =>
    request<import('./types').BookMeta>('PUT', `/books/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/books/${id}`),
}

// --- Chapters ---

export const chaptersApi = {
  list: (bookId: string) =>
    request<import('./types').ChapterMeta[]>('GET', `/books/${bookId}/chapters`),
  get: (bookId: string, num: number) =>
    request<import('./types').ChapterMeta>('GET', `/books/${bookId}/chapters/${num}`),
  update: (bookId: string, num: number, data: Partial<import('./types').ChapterMeta>) =>
    request<import('./types').ChapterMeta>('PUT', `/books/${bookId}/chapters/${num}`, data),
}

// --- Characters ---

export const charactersApi = {
  list: (bookId: string) =>
    request<import('./types').CharacterProfile[]>('GET', `/books/${bookId}/characters`),
  get: (bookId: string, charId: string) =>
    request<import('./types').CharacterProfile>('GET', `/books/${bookId}/characters/${charId}`),
  create: (bookId: string, data: Partial<import('./types').CharacterProfile>) =>
    request<import('./types').CharacterProfile>('POST', `/books/${bookId}/characters`, data),
  update: (bookId: string, charId: string, data: Partial<import('./types').CharacterProfile>) =>
    request<import('./types').CharacterProfile>('PUT', `/books/${bookId}/characters/${charId}`, data),
  delete: (bookId: string, charId: string) =>
    request<void>('DELETE', `/books/${bookId}/characters/${charId}`),
  // ★ Character Intelligence
  review: (bookId: string, chapterNum: number) =>
    request<import('./types').CharacterInsightReport[]>('POST', `/books/${bookId}/characters/review`, { chapterNumber: chapterNum }),
}

// --- Agents ---

export const agentsApi = {
  listConfig: () =>
    request<{ config: Record<string, any> }>('GET', '/agents/config'),
  updateConfig: (data: Record<string, any>) =>
    request<{ config: Record<string, any> }>('PUT', '/agents/config', data),
}

// --- Pipeline ---

export const pipelineApi = {
  start: (bookId: string, chapterNum: number) =>
    request<import('./types').PipelineState>('POST', `/pipeline/start`, { bookId, chapterNumber: chapterNum }),
  status: (bookId: string) =>
    request<import('./types').PipelineState>('GET', `/pipeline/status/${bookId}`),
  cancel: (bookId: string) =>
    request<void>('POST', `/pipeline/cancel`, { bookId }),
}

// --- Settings ---

export const settingsApi = {
  getProviders: () =>
    request<{ providers: import('./types').Provider[] }>('GET', '/settings/providers'),
  updateProviders: (data: import('./types').Provider[]) =>
    request<{ providers: import('./types').Provider[] }>('PUT', '/settings/providers', { providers: data }),
}

// --- Agent Engine ---

export const agentEngineApi = {
  health: () => request<{ status: string }>('GET', 'http://127.0.0.1:3583/health'),
  switchContext: (bookPath: string) =>
    request<{ status: string }>('POST', 'http://127.0.0.1:3583/api/context/switch', { bookPath }),
}

// --- Store ---

export const storeApi = {
  listLocal: () => request<string[]>('GET', '/store/local'),
  import: (repoUrl: string) =>
    request<{ name: string }>('POST', '/store/import', { repoUrl }),
  export: (bookId: string, name: string) =>
    request<{ path: string }>('POST', '/store/export', { bookId, name }),
}

// --- Tools ---

export const toolsApi = {
  deAI: (text: string) =>
    request<{ result?: string; error?: string }>('POST', '/tools/de-ai', { text }),
  polish: (text: string) =>
    request<{ result?: string; error?: string }>('POST', '/tools/polish', { text }),
}

// --- Constraints ---

export const constraintsApi = {
  get: (bookId: string) =>
    request<{ content: string }>('GET', `/books/${bookId}/constraints`),
  save: (bookId: string, content: string) =>
    request<{ content: string }>('PUT', `/books/${bookId}/constraints`, { content }),
}

// --- Memory ---

export const memoryApi = {
  getSnapshots: (bookId: string) =>
    request<any[]>('GET', `/books/${bookId}/memory/snapshots`),
  getSummaries: (bookId: string) =>
    request<any[]>('GET', `/books/${bookId}/memory/summaries`),
  getCharacterStates: (bookId: string) =>
    request<any[]>('GET', `/books/${bookId}/memory/character-states`),
  getFacts: (bookId: string, chapter?: number) =>
    request<any[]>('GET', `/books/${bookId}/memory/facts${chapter ? `?chapter=${chapter}` : ''}`),
  searchFacts: (bookId: string, q: string, category?: string) =>
    request<any[]>('GET', `/books/${bookId}/memory/search?q=${encodeURIComponent(q)}${category ? `&category=${category}` : ''}`),
  getLongTerm: (bookId: string) =>
    request<any>('GET', `/books/${bookId}/memory/long-term`),
  getIndex: (bookId: string) =>
    request<any>('GET', `/books/${bookId}/memory/index`),
  extractFacts: (bookId: string, chapterNumber: number, content: string) =>
    request<any>('POST', `/memory/extract`, { book_id: bookId, chapter_number: chapterNumber, content }),
  consolidate: (bookId: string) =>
    request<any>('POST', `/memory/consolidate`, { book_id: bookId }),
}

// --- Import API ---

export interface DetectResult {
  format: string
  confidence: number
  description: string
  files: string[]
  estimatedChapters: number
  hasMetadata: boolean
  hasGit: boolean
}

export interface ImportResult {
  imported: boolean
  bookId: string
  title: string
  format: string
  chapters: number
  totalWords?: number
}

export const importApi = {
  detect: (path: string) => request<DetectResult>('POST', '/import/detect', { path }),
  execute: (path: string, title?: string, genre?: string, premise?: string) =>
    request<ImportResult>('POST', '/import/execute', { path, title, genre, premise }),
}

// --- Style ---

export const styleApi = {
  analyze: (filePath: string, outputPath: string) =>
    request<{ result?: string; error?: string }>('POST', '/style/analyze', {
      file_path: filePath,
      output_path: outputPath,
    }),
}

// --- Workflow ---

export const workflowApi = {
  listWorkflows: () => request<import('./types').WorkflowSpec[]>('GET', '/workflows'),
  getWorkflow: (name: string) => request<import('./types').WorkflowSpec>('GET', `/workflows/${name}`),
  startWorkflow: (name: string, bookId: string) =>
    request<import('./types').WorkflowRun>('POST', `/workflows/${name}/start`, { bookId }),
  getRunStatus: (runId: string) =>
    request<import('./types').WorkflowRun>('GET', `/workflows/runs/${runId}`),
  pauseRun: (runId: string) =>
    request<void>('POST', `/workflows/runs/${runId}/pause`),
  resumeRun: (runId: string) =>
    request<void>('POST', `/workflows/runs/${runId}/resume`),
  cancelRun: (runId: string) =>
    request<void>('POST', `/workflows/runs/${runId}/cancel`),
}

// --- Question API ---

import type { Questionnaire, QuestionAnswer, Goal } from './types'

export const questionApi = {
  listPending: () => request<Questionnaire[]>('GET', '/questions/pending'),
  answer: (id: string, answers: QuestionAnswer[]) => request<{ ok: boolean }>('POST', `/questions/${id}/answer`, { answers }),
  cancel: (id: string) => request<{ ok: boolean }>('POST', `/questions/${id}/cancel`),
}

// --- Goal API ---

export const goalApi = {
  list: (bookId: string) => request<Goal[]>('GET', `/books/${bookId}/goals`),
  create: (bookId: string, objective: string, milestones?: string[]) => request<Goal>('POST', `/books/${bookId}/goals`, { objective, milestones }),
  updateStatus: (bookId: string, goalId: string, status: string, reason?: string) => request<Goal>('PUT', `/books/${bookId}/goals/${goalId}/status`, { status, reason }),
  updateProgress: (bookId: string, goalId: string, progress: number) => request<Goal>('PUT', `/books/${bookId}/goals/${goalId}/progress`, { progress }),
  completeMilestone: (bookId: string, goalId: string, milestoneId: string) => request<Goal>('POST', `/books/${bookId}/goals/${goalId}/milestones/${milestoneId}/complete`),
  delete: (bookId: string, goalId: string) => request<{ ok: boolean }>('DELETE', `/books/${bookId}/goals/${goalId}`),
  autoUpdate: (bookId: string) => request<{ updated: number }>('POST', `/books/${bookId}/goals/auto-update`),
}

// --- Streaming helper ---

export async function* streamGenerate(
  agentName: string,
  payload: { prompt: string; genre: string; historyContext: string },
): AsyncGenerator<string> {
  const res = await fetch('http://127.0.0.1:3583/api/agent/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentName, ...payload }),
  })

  if (!res.ok || !res.body) throw new Error('Stream generation failed')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {
          // skip malformed chunks
        }
      }
    }
  }
}
