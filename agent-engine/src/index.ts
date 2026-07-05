// ============================================================================
// CoNovel Agent Engine — Public API Re-exports
// ============================================================================

// --- Types ---
export type {
  BookMeta,
  BookState,
  ChapterMeta,
  SceneInfo,
  CharacterProfile,
  PersonalityMatrix,
  VoiceProfile,
  MotivationChain,
  KnowledgeBoundary,
  Relationship,
  EmotionalState,
  ForeshadowingItem,
  TimelineEvent,
  OutlineStructure,
  ActOutline,
  ChapterOutline,
  WorldSettings,
  FactionInfo,
  Provider,
  ModelEntry,
  AgentConfigEntry,
  ModelConfig,
  PipelineStage,
  PipelineStageState,
  PipelineState,
  WritingTechnique,
  StyleProfile,
  StyleConstraints,
  StyleFingerprint,
  CharacterViolation,
  CharacterInsightReport,
  KnowledgeEntry,
  GenerateRequest,
  CharacterReviewRequest,
  NamingRequest,
  StyleAnalyzeRequest,
  KnowledgeSearchRequest,
} from "./types.js";

// --- Knowledge ---
export {
  parseCSV,
  loadKnowledgeBase,
  getTechniques,
  formatTechniquesForPrompt,
  invalidateCache,
} from "./knowledge/csv-reader.js";

export {
  tokenize,
  bm25Score,
  search as bm25Search,
  searchWithBoost,
} from "./knowledge/bm25-search.js";

export {
  normalizeGenre,
  inferGenre,
  getGenreTechniques,
  listAvailableGenres,
} from "./knowledge/genre-resolver.js";

// --- Utils: De-AI ---
export {
  FATIGUE_WORDS,
  AI_TROPES,
  BANNED_PATTERNS,
  detectAILayers,
  sanitizeText,
} from "./utils/de-ai.js";

export type { AIViolation } from "./utils/de-ai.js";

// --- Utils: Naming ---
export {
  setExistingNames,
  clearExistingNames,
  generateCharacterNames,
  generateFactionNames,
  generatePlaceNames,
} from "./utils/naming.js";

export type { NamingCriteria } from "./utils/naming.js";

// --- Utils: Character Intelligence ---
export {
  extractCharacterDialogue,
  extractCharacterActions,
  extractCharacterMentions,
  loadCharacterProfile,
  loadAllCharacterProfiles,
  buildFirstPersonReviewPrompt,
  parseReviewResponse,
  reviewCharacterConsistency,
  prepareCharacterReviewLLMCall,
} from "./utils/character-intelligence.js";

// --- Pipeline ---
export { AGENT_NAMES, getAgentPrompt, buildWritingPrompt, buildReviewPrompt } from "./pipeline/prompts.js";
export type { AgentName } from "./pipeline/prompts.js";

export {
  STAGE_DEFINITIONS,
  getAllStages,
  getStageDefinition,
  executeStage,
} from "./pipeline/stages.js";
export type { StageContext, StageResult, StageDefinition, LLMCallFunction } from "./pipeline/stages.js";

export { PipelineOrchestrator } from "./pipeline/orchestrator.js";
export type { PipelineExecutionOptions } from "./pipeline/orchestrator.js";

// --- Style ---
export { analyzeReference, extractFingerprint, autoLearnFromReferences } from "./style/style-learner.js";
export { extractStats, compareFingerprints, generateStyleGuide } from "./style/style-fingerprint.js";
export { analyzeNovel, extractTropes, identifyFatigueWords } from "./style/reference-analyzer.js";
export type {
  ReferenceAnalysisReport,
  DialogueAnalysis,
  TropeResult,
  FatigueWord,
  VocabularyStats,
  PacingAnalysis,
} from "./style/reference-analyzer.js";
