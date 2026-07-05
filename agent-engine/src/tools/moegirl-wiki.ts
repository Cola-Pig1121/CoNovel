// ============================================================================
// Moegirl Wiki Tool — Query Moegirlpedia for character/setting information
// Built-in tool (not MCP), directly calls MediaWiki API
// Reference: Character_Skill_Producer/examples/csp/scripts/moegirl_api.py
// ============================================================================

import type { CoNovelTool, FileOperations, ToolContext, ToolResult } from './types.js'

const API_URL = 'https://zh.moegirl.org.cn/api.php'
const PAGE_BASE_URL = 'https://zh.moegirl.org.cn/'
const USER_AGENT = 'CoNovel/1.0 (https://github.com/CoNovel)'

interface MoegirlResult {
  ok: boolean
  source: string
  mode: string
  query: string
  resolvedTitle?: string
  pageId?: number
  pageUrl?: string
  extract: string
  extractChars: number
  candidates: { title: string; description: string; url: string }[]
  warnings: string[]
}

async function requestJson(params: Record<string, string>, timeout = 15000): Promise<any> {
  const url = new URL(API_URL)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function buildPageUrl(title: string): string {
  return PAGE_BASE_URL + encodeURIComponent(title.replace(/ /g, '_'))
}

async function queryExtract(title: string, introOnly = true, timeout = 15000): Promise<MoegirlResult> {
  const params: Record<string, string> = {
    action: 'query',
    prop: 'extracts',
    titles: title,
    format: 'json',
    explaintext: '1',
    redirects: '1',
    origin: '*',
  }
  if (introOnly) params.exintro = '1'

  const data = await requestJson(params, timeout)
  const pages = data?.query?.pages ?? {}
  const page = Object.values(pages)[0] as any

  if (!page || page.missing !== undefined || String(page.pageid) === '-1') {
    return { ok: false, source: 'moegirl', mode: 'intro', query: title, extract: '', extractChars: 0, candidates: [], warnings: ['page not found'] }
  }

  const extract = page.extract ?? ''
  return {
    ok: extract.trim().length > 0,
    source: 'moegirl',
    mode: introOnly ? 'intro' : 'full',
    query: title,
    resolvedTitle: page.title ?? title,
    pageId: page.pageid,
    pageUrl: buildPageUrl(page.title ?? title),
    extract,
    extractChars: extract.length,
    candidates: [],
    warnings: extract.trim() ? [] : ['empty extract'],
  }
}

async function searchTitles(query: string, timeout = 15000): Promise<MoegirlResult> {
  const params: Record<string, string> = {
    action: 'opensearch',
    search: query,
    limit: '10',
    namespace: '0',
    format: 'json',
    origin: '*',
  }

  const data = await requestJson(params, timeout)
  const titles: string[] = data[1] ?? []
  const descriptions: string[] = data[2] ?? []
  const urls: string[] = data[3] ?? []

  const candidates = titles.map((t, i) => ({
    title: t,
    description: descriptions[i] ?? '',
    url: urls[i] ?? buildPageUrl(t),
  }))

  return {
    ok: candidates.length > 0,
    source: 'moegirl',
    mode: 'search',
    query,
    resolvedTitle: candidates[0]?.title,
    extract: candidates[0]?.description ?? '',
    extractChars: (candidates[0]?.description ?? '').length,
    candidates,
    warnings: candidates.length ? [] : ['no candidates'],
  }
}

async function autoQuery(query: string, timeout = 15000): Promise<MoegirlResult> {
  // 1. Try direct intro extract
  const intro = await queryExtract(query, true, timeout)
  if (intro.ok) return intro

  // 2. Try search + first candidate
  const search = await searchTitles(query, timeout)
  if (search.ok && search.candidates[0]) {
    const candidate = await queryExtract(search.candidates[0].title, true, timeout)
    if (candidate.ok) {
      candidate.candidates = search.candidates
      return candidate
    }
    search.warnings.push('first candidate extract empty')
    return search
  }

  return {
    ok: false,
    source: 'moegirl',
    mode: 'auto',
    query,
    extract: '',
    extractChars: 0,
    candidates: [],
    warnings: ['no results found'],
  }
}

/**
 * Create the Moegirl Wiki query tool.
 *
 * Usage by agents:
 * - Query character info: { query: "初音未来" }
 * - Search for candidates: { query: "晓美焰", mode: "search" }
 * - Get full page: { query: "凉宫春日", mode: "full" }
 */
export function createMoegirlWikiTool(_ops?: Partial<FileOperations>): CoNovelTool {
  return {
    definition: {
      name: 'moegirl_wiki',
      description: '查询萌娘百科获取角色/作品/设定信息。当遇到需要查证的二次元知识时使用。',
      parameters: {
        query: { type: 'string', description: '查询关键词（角色名、作品名、术语等）', required: true },
        mode: { type: 'string', description: '查询模式', enum: ['auto', 'search', 'intro', 'full'] },
      },
    },

    execute: async (params, _context): Promise<ToolResult> => {
      try {
        const query = params.query as string
        const mode = (params.mode as string) || 'auto'
        const timeout = 15000

        let result: MoegirlResult

        switch (mode) {
          case 'search':
            result = await searchTitles(query, timeout)
            break
          case 'intro':
            result = await queryExtract(query, true, timeout)
            if (!result.ok) {
              // Fallback to search
              const search = await searchTitles(query, timeout)
              if (search.ok && search.candidates[0]) {
                const c = await queryExtract(search.candidates[0].title, true, timeout)
                c.candidates = search.candidates
                result = c.ok ? c : search
              }
            }
            break
          case 'full':
            result = await queryExtract(query, false, timeout)
            break
          default:
            result = await autoQuery(query, timeout)
        }

        return {
          success: result.ok,
          data: {
            title: result.resolvedTitle,
            url: result.pageUrl,
            extract: result.extract.substring(0, 8000), // limit output
            extractChars: result.extractChars,
            candidates: result.candidates.slice(0, 5),
            warnings: result.warnings,
          },
        }
      } catch (e) {
        return {
          success: false,
          error: `萌娘百科查询失败: ${String(e)}。建议：请手动搜索或询问用户。`,
        }
      }
    },
  }
}
