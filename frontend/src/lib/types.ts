// ============================================================
// CoNovel Type Definitions
// Filesystem-First: all types mirror the on-disk JSON structures
// ============================================================

// --- Book ---

export interface BookMeta {
  id: string
  title: string
  genre: string
  genres: string[]
  premise: string
  targetWordCount: number
  currentWordCount: number
  currentChapter: number
  totalChapters: number
  status: 'planning' | 'writing' | 'paused' | 'completed'
  createdAt: string
  updatedAt: string
}

export interface BookState extends BookMeta {
  characters: CharacterProfile[]
  foreshadowing: ForeshadowingItem[]
  outline: OutlineStructure
  timeline: TimelineEvent[]
  worldSettings: WorldSettings
  lastSyncedAt: string
}

// --- Chapter ---

export interface ChapterMeta {
  chapterNumber: number
  title: string
  wordCount: number
  status: 'draft' | 'reviewed' | 'final'
  content: string
  outline: string
  agentOutputs: Record<string, string>
  qualityGate: QualityGate
  wordTarget: number
  createdAt: string
  updatedAt: string
}

export type QualityGate = 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

// --- Character Intelligence Layer ---

export interface CharacterProfile {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  personality: PersonalityMatrix
  voice: VoiceProfile
  motivations: MotivationChain
  knowledgeBoundary: KnowledgeBoundary
  relationships: Record<string, Relationship>
  emotionalState: EmotionalState
  createdAt: string
  updatedAt: string
}

export interface PersonalityMatrix {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

export interface VoiceProfile {
  vocabulary: string[]
  sentencePattern: 'short' | 'long' | 'mixed'
  speechQuirks: string[]
  formality: 'casual' | 'formal' | 'mixed'
  dialect?: string
}

export interface MotivationChain {
  current: string
  longTerm: string
  fear: string
  desire: string
}

export interface KnowledgeBoundary {
  knows: string[]
  doesntKnow: string[]
  suspects: string[]
}

export interface Relationship {
  type: 'ally' | 'enemy' | 'neutral' | 'romantic' | 'family'
  trust: number
  history: string
}

export interface EmotionalState {
  current: string
  intensity: number
  triggers: string[]
}

// --- Character Intelligence Output ---

export interface CharacterInsightReport {
  characterId: string
  characterName: string
  chapterNumber: number
  violations: CharacterViolation[]
  suggestions: string[]
  overallConsistency: number // 0-100
  timestamp: string
}

export interface CharacterViolation {
  type: 'language' | 'behavior' | 'knowledge' | 'emotion' | 'relationship'
  severity: 'critical' | 'major' | 'minor'
  description: string
  evidence: string
  suggestion: string
}

// --- Foreshadowing ---

export interface ForeshadowingItem {
  id: string
  type: 'planted' | 'hinted' | 'resolved' | 'overdue'
  description: string
  plantedInChapter: number
  resolvedInChapter?: number
  urgency: 'low' | 'medium' | 'high' | 'critical'
  relatedCharacters: string[]
}

// --- Timeline ---

export interface TimelineEvent {
  id: string
  chapterNumber: number
  description: string
  timestamp: string
  location: string
  characters: string[]
}

// --- Outline ---

export interface OutlineStructure {
  volumes: Volume[]
}

export interface Volume {
  id: string
  title: string
  chapters: ChapterOutline[]
}

export interface ChapterOutline {
  chapterNumber: number
  title: string
  summary: string
  keyEvents: string[]
  position: 'high-pressure' | 'propulsive' | 'relationship' | 'low-pressure'
}

// --- World Settings ---

export interface WorldSettings {
  rules: string
  powerSystem?: string
  geography?: string
  history?: string
  customFields: Record<string, string>
}

// --- LLM Provider ---

export interface Provider {
  id: string
  name: string
  baseUrl: string
  apiFormat: 'openai' | 'anthropic' | 'custom'
  apiKey: string
  models: ModelEntry[]
  enabled: boolean
}

export interface ModelEntry {
  id: string
  name: string
  contextWindow: number
  maxOutput: number
}

// --- Agent Config ---

export interface AgentConfigEntry {
  role: string
  name: string
  nameZh: string
  provider: string
  modelId: string
  temperature: number
  maxTokens: number
  contextWindow: number
  reasoningEffort: 'low' | 'medium' | 'high'
  enabled: boolean
}

// --- Pipeline ---

export interface PipelineState {
  bookId: string
  activeStage: PipelineStage | null
  stages: PipelineStageState[]
  startedAt: string | null
  completedAt: string | null
}

export type PipelineStage =
  | 'context_assembly'
  | 'character_reasoning'
  | 'writing'
  | 'event_recording'
  | 'fact_check'
  | 'continuity_check'
  | 'pacing_check'
  | 'character_intelligence'
  | 'review'
  | 'editing'
  | 'de_ai'
  | 'reflector'
  | 'state_sync'

export interface PipelineStageState {
  stage: PipelineStage
  status: 'pending' | 'running' | 'completed' | 'failed'
  output?: string
  error?: string
  duration?: number
  startedAt?: string
  completedAt?: string
}

// --- Writing Techniques (CSV Knowledge Base) ---

export interface WritingTechnique {
  id: string
  skill: string
  category: string
  tier: 'reminder' | 'defect_compensation' | 'knowledge_supplement'
  keywords: string[]
  genres: string[]
  content: string
}

// --- Style Profile ---

export interface StyleProfile {
  lastUpdated: string
  sourceFile: string
  constraints: {
    dialogueStyle: string
    paragraphLength: string
    tonePattern: string
    prohibitedKeywords: string[]
    avgSentenceLength?: number
    dialogueRatio?: number
    vocabFrequency?: Record<string, number>
  }
}

// --- Toast ---

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

// --- Workflow ---

export interface WorkflowSpec {
  schemaVersion: 1
  name: string
  description: string
  defaults: { agent: string; readOnly: boolean; tools: string[] }
  artifactGraph: { stages: StageSpec[] }
}

export interface StageSpec {
  id: string
  type: 'single' | 'foreach' | 'reduce' | 'loop' | 'dag' | 'dynamic'
  agent: string
  prompt: string
  from?: string | string[]
  fromPath?: string
  each?: { prompt: string }
  until?: string
  maxRounds?: number
  stages?: StageSpec[]
  tools?: string[]
}

export interface WorkflowRun {
  id: string
  workflowName: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  bookId: string
  startedAt: string
  completedAt?: string
  stages: StageRun[]
}

export interface StageRun {
  stageId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  output?: any
  error?: string
  startedAt?: string
  completedAt?: string
  tasks: TaskRun[]
}

export interface TaskRun {
  id: string
  agent: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  input?: any
  output?: any
  error?: string
}

// --- Question System ---

export interface Question {
  question: string
  header: string
  options: { label: string; description: string; preview?: string }[]
  multiSelect?: boolean
}

export interface Questionnaire {
  id: string
  questions: Question[]
  createdAt: string
  answers?: QuestionAnswer[]
  status: 'pending' | 'answered' | 'cancelled'
}

export interface QuestionAnswer {
  questionIndex: number
  question: string
  kind: 'option' | 'custom' | 'multi'
  answer: string | null
  selected?: string[]
  notes?: string
}

// --- Goal System ---

export type GoalStatus = 'active' | 'paused' | 'blocked' | 'complete'

export interface Goal {
  id: string
  bookId: string
  objective: string
  status: GoalStatus
  progress: number
  milestones: Milestone[]
  createdAt: string
  updatedAt: string
  completedAt?: string
  blockedReason?: string
  history: GoalEvent[]
}

export interface Milestone {
  id: string
  description: string
  completed: boolean
  completedAt?: string
}

export interface GoalEvent {
  timestamp: string
  type: 'created' | 'progress' | 'milestone' | 'blocked' | 'paused' | 'resumed' | 'completed'
  message: string
}
