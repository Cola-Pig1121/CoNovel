// ============================================================================
// CoNovel Agent Engine — Main Server
// Bun.serve on port 3583 with per-agent model routing and streaming.
// ============================================================================

import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadKnowledgeBase, formatTechniquesForPrompt, getTechniques } from "./knowledge/csv-reader.js";
import { search as bm25Search } from "./knowledge/bm25-search.js";
import { detectAILayers, sanitizeText } from "./utils/de-ai.js";
import { generateCharacterNames, generateFactionNames, generatePlaceNames, setExistingNames } from "./utils/naming.js";
import { reviewCharacterConsistency } from "./utils/character-intelligence.js";
import { analyzeReference } from "./style/style-learner.js";
import { getAgentPrompt, AGENT_NAMES } from "./pipeline/prompts.js";
import { executeStage } from "./pipeline/stages.js";
import { PipelineOrchestrator } from "./pipeline/orchestrator.js";
import type {
  BookState,
  BookMeta,
  ModelConfig,
  AgentConfigEntry,
  Provider,
  ModelEntry,
  GenerateRequest,
  CharacterReviewRequest,
  NamingRequest,
  StyleAnalyzeRequest,
  KnowledgeSearchRequest,
  CharacterProfile,
  PipelineStage,
} from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? "3583", 10);
const HOST = process.env.HOST ?? "0.0.0.0";
const KNOWLEDGE_DIR = process.env.KNOWLEDGE_DIR ?? join(getProjectRoot(), "knowledge-base");
const BOOKS_DIR = process.env.BOOKS_DIR ?? "D:\\Code\\CoNovel\\novels";

function getProjectRoot(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, "..");
}

// ---------------------------------------------------------------------------
// CoNovelAgentEngine class
// ---------------------------------------------------------------------------

class CoNovelAgentEngine {
  private currentBookPath: string | null = null;
  private bookState: BookState | null = null;
  private providers: Map<string, Provider> = new Map();
  private agentConfigs: Map<string, AgentConfigEntry> = new Map();
  private knowledgeLoaded = false;
  private orchestrator: PipelineOrchestrator | null = null;

  constructor() {
    this.loadDefaultProviders();
  }

  // -------------------------------------------------------------------------
  // Provider / model configuration
  // -------------------------------------------------------------------------

  private loadDefaultProviders(): void {
    // OpenAI-compatible default
    this.providers.set("openai", {
      name: "openai",
      type: "openai",
      base_url: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      api_key: process.env.OPENAI_API_KEY ?? "",
      models: [],
    });

    // Ollama local
    this.providers.set("ollama", {
      name: "ollama",
      type: "ollama",
      base_url: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
      api_key: "ollama",
      models: [],
    });

    // Anthropic
    this.providers.set("anthropic", {
      name: "anthropic",
      type: "anthropic",
      base_url: "https://api.anthropic.com",
      api_key: process.env.ANTHROPIC_API_KEY ?? "",
      models: [],
    });
  }

  /**
   * Load agent configurations from a JSON config file or env vars.
   */
  async loadAgentConfigs(configPath?: string): Promise<void> {
    if (configPath) {
      try {
        const content = await readFile(configPath, "utf-8");
        const configs: AgentConfigEntry[] = JSON.parse(content);
        for (const c of configs) {
          this.agentConfigs.set(c.agent_name, c);
        }
        console.log(`[engine] Loaded ${configs.length} agent configs from ${configPath}`);
      } catch (err) {
        console.error(`[engine] Failed to load agent configs:`, err);
      }
    }

    // Also support per-agent env vars: AGENT_<NAME>_MODEL, AGENT_<NAME>_PROVIDER, etc.
    const agentNames = [
      "plot_architect", "character_designer", "world_builder", "chapter_planner",
      "prose_writer", "dialogue_specialist", "action_writer", "scene_architect",
      "fact_checker", "continuity_checker", "pacing_analyst", "character_reviewer",
      "editor", "de_ai_specialist", "reflector", "event_recorder",
    ];
    for (const name of agentNames) {
      if (this.agentConfigs.has(name)) continue;
      const modelId = process.env[`AGENT_${name.toUpperCase()}_MODEL`];
      const provider = process.env[`AGENT_${name.toUpperCase()}_PROVIDER`];
      if (modelId || provider) {
        this.agentConfigs.set(name, {
          agent_name: name,
          model_id: modelId ?? "gpt-4o",
          provider_name: provider ?? "openai",
          temperature: 0.7,
          max_tokens: 4096,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Book context management
  // -------------------------------------------------------------------------

  async loadBookContext(bookPath: string): Promise<BookState> {
    console.log(`[engine] Loading book context from: ${bookPath}`);
    this.currentBookPath = bookPath;

    // Read meta.json
    const metaPath = join(bookPath, "meta.json");
    let meta: BookMeta;
    try {
      const content = await readFile(metaPath, "utf-8");
      meta = JSON.parse(content);
    } catch {
      meta = {
        title: "未命名小说",
        author: "未知",
        genre: "玄幻",
        synopsis: "",
        target_word_count: 500000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Read characters
    const characters = await this.loadCharacters(bookPath);

    // Set existing names for naming tool
    setExistingNames(characters.map((c) => c.name));

    // Read chapters index
    const chapters = await this.loadChapterIndex(bookPath);

    // Read outline
    const outline = await this.loadJSON(join(bookPath, "outline.json"), {
      act_outlines: [],
      chapter_outlines: [],
    });

    // Read world
    const world = await this.loadJSON(join(bookPath, "world.json"), {
      name: "",
      era: "",
      geography: [],
      factions: [],
      rules: [],
      cultural_notes: [],
      custom: {},
    });

    // Read foreshadowing
    const foreshadowing = await this.loadJSON(join(bookPath, "foreshadowing.json"), []);

    // Read timeline
    const timeline = await this.loadJSON(join(bookPath, "timeline.json"), []);

    // Compute total word count
    let totalWordCount = 0;
    for (const ch of chapters) {
      totalWordCount += ch.word_count;
    }

    // Current chapter = last chapter number + 1 (or 1 if no chapters)
    const currentChapter = chapters.length > 0
      ? Math.max(...chapters.map((c) => c.number)) + 1
      : 1;

    this.bookState = {
      meta,
      chapters,
      characters,
      foreshadowing,
      timeline,
      outline,
      world,
      total_word_count: totalWordCount,
      current_chapter: currentChapter,
    };

    // Ensure knowledge base is loaded
    if (!this.knowledgeLoaded) {
      await loadKnowledgeBase(KNOWLEDGE_DIR);
      this.knowledgeLoaded = true;
    }

    console.log(`[engine] Book loaded: ${meta.title} (${characters.length} characters, ${chapters.length} chapters, ${totalWordCount} words)`);
    return this.bookState;
  }

  private async loadCharacters(bookPath: string): Promise<CharacterProfile[]> {
    const charsDir = join(bookPath, "characters");
    try {
      const files = await readdir(charsDir);
      const characters: CharacterProfile[] = [];
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const content = await readFile(join(charsDir, file), "utf-8");
          characters.push(JSON.parse(content));
        } catch (err) {
          console.error(`[engine] Failed to load character ${file}:`, err);
        }
      }
      return characters;
    } catch {
      return [];
    }
  }

  private async loadChapterIndex(bookPath: string): Promise<any[]> {
    const chaptersPath = join(bookPath, "chapters.json");
    return this.loadJSON(chaptersPath, []);
  }

  private async loadJSON<T>(filePath: string, defaultValue: T): Promise<T> {
    try {
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return defaultValue;
    }
  }

  // -------------------------------------------------------------------------
  // LLM execution with per-agent model routing
  // -------------------------------------------------------------------------

  /**
   * Execute an LLM call for a specific agent with streaming.
   * Routes to the correct provider/model based on agent config.
   */
  async executeAgentStream(
    agentName: string,
    payload: {
      messages: Array<{ role: string; content: string }>;
      max_tokens?: number;
      temperature?: number;
    }
  ): Promise<ReadableStream<Uint8Array>> {
    const config = this.agentConfigs.get(agentName);
    const providerName = config?.provider_name ?? process.env.DEFAULT_PROVIDER ?? "openai";
    const modelId = config?.model_id ?? process.env.DEFAULT_MODEL ?? "gpt-4o";
    const temperature = payload.temperature ?? config?.temperature ?? 0.7;
    const maxTokens = payload.max_tokens ?? config?.max_tokens ?? 4096;

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider "${providerName}" not configured`);
    }

    console.log(`[engine] Agent "${agentName}" → ${providerName}/${modelId}`);

    // Build request based on provider type
    if (provider.type === "anthropic") {
      return this.streamAnthropic(provider, modelId, payload.messages, temperature, maxTokens);
    } else {
      // OpenAI-compatible (including Ollama)
      return this.streamOpenAICompatible(provider, modelId, payload.messages, temperature, maxTokens);
    }
  }

  private async streamOpenAICompatible(
    provider: Provider,
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    temperature: number,
    maxTokens: number
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${provider.base_url}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${provider.api_key}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    // Transform SSE stream to a simple text stream
    return new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(new TextEncoder().encode(content));
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });
  }

  private async streamAnthropic(
    provider: Provider,
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    temperature: number,
    maxTokens: number
  ): Promise<ReadableStream<Uint8Array>> {
    // Separate system message from conversation
    const systemMsg = messages.find((m) => m.role === "system");
    const conversationMsgs = messages.filter((m) => m.role !== "system");

    const url = `${provider.base_url}/v1/messages`;
    const body: Record<string, unknown> = {
      model: modelId,
      messages: conversationMsgs,
      max_tokens: maxTokens,
      temperature,
      stream: true,
    };
    if (systemMsg) {
      body.system = systemMsg.content;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": provider.api_key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    return new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (!data) continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "content_block_delta") {
                  const text = parsed.delta?.text;
                  if (text) {
                    controller.enqueue(new TextEncoder().encode(text));
                  }
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });
  }

  /**
   * Non-streaming LLM call (for shorter tasks like reviews, analysis).
   */
  async executeAgent(
    agentName: string,
    messages: Array<{ role: string; content: string }>,
    options: { temperature?: number; max_tokens?: number } = {}
  ): Promise<string> {
    const config = this.agentConfigs.get(agentName);
    const providerName = config?.provider_name ?? process.env.DEFAULT_PROVIDER ?? "openai";
    const modelId = config?.model_id ?? process.env.DEFAULT_MODEL ?? "gpt-4o";
    const temperature = options.temperature ?? config?.temperature ?? 0.3;
    const maxTokens = options.max_tokens ?? config?.max_tokens ?? 4096;

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider "${providerName}" not configured`);
    }

    const url = provider.type === "anthropic"
      ? `${provider.base_url}/v1/messages`
      : `${provider.base_url}/chat/completions`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: Record<string, unknown>;

    if (provider.type === "anthropic") {
      const systemMsg = messages.find((m) => m.role === "system");
      const convMsgs = messages.filter((m) => m.role !== "system");
      headers["x-api-key"] = provider.api_key;
      headers["anthropic-version"] = "2023-06-01";
      body = { model: modelId, messages: convMsgs, max_tokens: maxTokens, temperature };
      if (systemMsg) body.system = systemMsg.content;
    } else {
      headers["Authorization"] = `Bearer ${provider.api_key}`;
      body = { model: modelId, messages, temperature, max_tokens: maxTokens };
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    const result = await response.json() as Record<string, unknown>;

    if (provider.type === "anthropic") {
      const content = result.content as Array<{ type: string; text: string }>;
      return content?.[0]?.text ?? "";
    } else {
      const choices = result.choices as Array<{ message: { content: string } }>;
      return choices?.[0]?.message?.content ?? "";
    }
  }

  // -------------------------------------------------------------------------
  // System prompt assembly
  // -------------------------------------------------------------------------

  assembleSystemPrompt(agentName: string, genre: string): string {
    const basePrompt = getAgentPrompt(agentName, genre);

    const stateParts: string[] = [];

    if (this.bookState) {
      const { meta, world, characters } = this.bookState;
      stateParts.push(`## 当前书籍信息`);
      stateParts.push(`- 书名：${meta.title}`);
      stateParts.push(`- 类型：${meta.genre}`);
      stateParts.push(`- 总字数：${this.bookState.total_word_count}`);
      stateParts.push(`- 当前章节：第${this.bookState.current_chapter}章`);

      if (world.name) {
        stateParts.push(`\n## 世界设定`);
        stateParts.push(`- 世界名：${world.name}`);
        stateParts.push(`- 时代：${world.era}`);
        if (world.factions.length > 0) {
          stateParts.push(`- 势力：${world.factions.map((f) => f.name).join("、")}`);
        }
      }

      if (characters.length > 0) {
        stateParts.push(`\n## 主要角色`);
        for (const c of characters.filter((c) => c.role === "protagonist" || c.role === "antagonist")) {
          stateParts.push(`- ${c.name}（${c.role}）：${c.background.slice(0, 100)}`);
        }
      }
    }

    // Add genre-specific writing techniques
    if (this.knowledgeLoaded) {
      // We'll load knowledge base and get relevant techniques
      stateParts.push(`\n## 相关写作技巧`);
      stateParts.push(`（写作技巧将通过 knowledge-base CSV 提供）`);
    }

    const stateContext = stateParts.length > 0
      ? `\n\n${stateParts.join("\n")}`
      : "";

    return basePrompt + stateContext;
  }
}

// ---------------------------------------------------------------------------
// Global engine instance
// ---------------------------------------------------------------------------

const engine = new CoNovelAgentEngine();

// ---------------------------------------------------------------------------
// Request handlers
// ---------------------------------------------------------------------------

async function handleHealth(): Promise<Response> {
  return Response.json({
    status: "ok",
    engine: "@conovel/agent-engine",
    version: "0.1.0",
    uptime: process.uptime(),
  });
}

async function handleContextSwitch(req: Request): Promise<Response> {
  try {
    const body = await req.json() as { book_path: string };
    if (!body.book_path) {
      return Response.json({ error: "book_path is required" }, { status: 400 });
    }

    const state = await engine.loadBookContext(body.book_path);
    return Response.json({
      status: "ok",
      book: state.meta,
      characters: state.characters.length,
      chapters: state.chapters.length,
      total_word_count: state.total_word_count,
      current_chapter: state.current_chapter,
    });
  } catch (err) {
    console.error("[server] Context switch error:", err);
    return Response.json(
      { error: `Failed to load context: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

async function handleAgentGenerate(req: Request): Promise<Response> {
  try {
    const body = await req.json() as GenerateRequest;

    const messages: Array<{ role: string; content: string }> = [];

    // System prompt
    const systemPrompt = engine.assembleSystemPrompt(
      body.agent_name,
      process.env.DEFAULT_GENRE ?? "玄幻"
    );
    messages.push({ role: "system", content: systemPrompt });

    // User context
    if (body.context) {
      messages.push({ role: "user", content: body.context });
    }

    if (body.instruction) {
      messages.push({ role: "user", content: body.instruction });
    }

    // Stream the response
    const stream = await engine.executeAgentStream(body.agent_name, {
      messages,
      max_tokens: body.max_tokens,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[server] Agent generate error:", err);
    return Response.json(
      { error: `Generation failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

async function handleCharacterReview(req: Request): Promise<Response> {
  try {
    const body = await req.json() as CharacterReviewRequest;

    if (!body.chapter_content) {
      return Response.json({ error: "chapter_content is required" }, { status: 400 });
    }

    const result = await reviewCharacterConsistency(
      body.chapter_content,
      body.chapter_number,
      body.book_path,
      body.character_ids
    );

    return Response.json(result);
  } catch (err) {
    console.error("[server] Character review error:", err);
    return Response.json(
      { error: `Character review failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

async function handleNaming(req: Request): Promise<Response> {
  try {
    const body = await req.json() as NamingRequest;
    const count = body.count ?? 5;

    let names: string[];
    switch (body.type) {
      case "character":
        names = generateCharacterNames(
          { genre: body.genre, gender: body.gender as any, constraints: body.constraints },
          count
        );
        break;
      case "faction":
        names = generateFactionNames({ genre: body.genre }, count);
        break;
      case "place":
        names = generatePlaceNames({ genre: body.genre }, count);
        break;
      default:
        return Response.json({ error: `Unknown naming type: ${body.type}` }, { status: 400 });
    }

    return Response.json({ names, type: body.type, genre: body.genre });
  } catch (err) {
    console.error("[server] Naming error:", err);
    return Response.json(
      { error: `Naming failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

async function handleStyleAnalyze(req: Request): Promise<Response> {
  try {
    const body = await req.json() as StyleAnalyzeRequest;
    if (!body.file_path) {
      return Response.json({ error: "file_path is required" }, { status: 400 });
    }

    const { profile, guide } = await analyzeReference(body.file_path);
    return Response.json({ profile, guide });
  } catch (err) {
    console.error("[server] Style analyze error:", err);
    return Response.json(
      { error: `Style analysis failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

async function handleKnowledgeSearch(req: Request): Promise<Response> {
  try {
    const body = await req.json() as KnowledgeSearchRequest;
    if (!body.query) {
      return Response.json({ error: "query is required" }, { status: 400 });
    }

    // Load knowledge base if not loaded
    const kb = await loadKnowledgeBase(KNOWLEDGE_DIR);

    // Filter by genre if specified
    let techniques = kb.techniques;
    if (body.genre) {
      techniques = getTechniques(kb.techniques, body.genre);
    }

    // Search using BM25
    const results = bm25Search(body.query, techniques, body.top_k ?? 5);

    return Response.json({
      query: body.query,
      results: results.map((r) => ({
        ...r.technique,
        score: r.score,
      })),
      total: results.length,
    });
  } catch (err) {
    console.error("[server] Knowledge search error:", err);
    return Response.json(
      { error: `Knowledge search failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

async function handleDeAICheck(req: Request): Promise<Response> {
  try {
    const body = await req.json() as { text: string };
    if (!body.text) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const result = detectAILayers(body.text);
    const sanitized = sanitizeText(body.text);

    return Response.json({
      ...result,
      sanitized_text: sanitized,
    });
  } catch (err) {
    console.error("[server] De-AI check error:", err);
    return Response.json(
      { error: `De-AI check failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

async function handlePipelineExecute(req: Request): Promise<Response> {
  try {
    const body = await req.json() as {
      book_path: string;
      chapter_number: number;
      chapter_content?: string;
      stages?: PipelineStage[];
      resume_from?: PipelineStage;
    };

    if (!body.book_path) {
      return Response.json({ error: "book_path is required" }, { status: 400 });
    }

    // Load book context if different
    if (body.book_path !== engine["currentBookPath"]) {
      await engine.loadBookContext(body.book_path);
    }

    const orchestrator = new PipelineOrchestrator(engine as any);
    const result = await orchestrator.execute({
      bookPath: body.book_path,
      chapterNumber: body.chapter_number,
      chapterContent: body.chapter_content,
      stages: body.stages,
      resumeFrom: body.resume_from,
    });

    return Response.json(result);
  } catch (err) {
    console.error("[server] Pipeline execute error:", err);
    return Response.json(
      { error: `Pipeline execution failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function route(path: string, method: string): ((req: Request) => Promise<Response>) | null {
  // Health
  if (path === "/health" && method === "GET") return handleHealth;

  // Context
  if (path === "/api/context/switch" && method === "POST") return handleContextSwitch;

  // Agent generation
  if (path === "/api/agent/generate" && method === "POST") return handleAgentGenerate;

  // Character review
  if (path === "/api/agent/character-review" && method === "POST") return handleCharacterReview;

  // Naming
  if (path === "/api/tools/naming" && method === "POST") return handleNaming;

  // Style analysis
  if (path === "/api/style/analyze" && method === "POST") return handleStyleAnalyze;

  // Knowledge search
  if (path === "/api/knowledge/search" && method === "POST") return handleKnowledgeSearch;

  // De-AI check
  if (path === "/api/tools/de-ai" && method === "POST") return handleDeAICheck;

  // Pipeline execution
  if (path === "/api/pipeline/execute" && method === "POST") return handlePipelineExecute;

  return null;
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

// Load agent configs on startup
await engine.loadAgentConfigs(
  process.env.AGENT_CONFIG_PATH ?? join(getProjectRoot(), "agent-configs.json")
).catch(() => {
  console.log("[engine] No agent config file found, using env vars / defaults");
});

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Route
    const handler = route(path, method);
    if (handler) {
      try {
        const response = await handler(req);
        // Add CORS headers
        for (const [key, value] of Object.entries(corsHeaders)) {
          response.headers.set(key, value);
        }
        return response;
      } catch (err) {
        console.error(`[server] Unhandled error on ${method} ${path}:`, err);
        return Response.json(
          { error: (err as Error).message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 404
    return Response.json(
      { error: `Not found: ${method} ${path}` },
      { status: 404, headers: corsHeaders }
    );
  },
});

console.log(`
╔══════════════════════════════════════════════════╗
║       CoNovel Agent Engine v0.1.0                ║
║       Running on http://${HOST}:${PORT}            ║
╠══════════════════════════════════════════════════╣
║  Endpoints:                                      ║
║  GET  /health                                    ║
║  POST /api/context/switch                        ║
║  POST /api/agent/generate       (streaming)      ║
║  POST /api/agent/character-review                ║
║  POST /api/tools/naming                          ║
║  POST /api/tools/de-ai                           ║
║  POST /api/style/analyze                         ║
║  POST /api/knowledge/search                      ║
║  POST /api/pipeline/execute                      ║
╚══════════════════════════════════════════════════╝
`);

export { engine, CoNovelAgentEngine };
