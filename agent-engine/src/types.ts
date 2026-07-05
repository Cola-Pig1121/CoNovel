// ============================================================================
// CoNovel Agent Engine — Type Definitions
// Mirrors the backend Python models exactly.
// ============================================================================

// ---------------------------------------------------------------------------
// Book metadata & state
// ---------------------------------------------------------------------------

export interface BookMeta {
  title: string;
  author: string;
  genre: string;
  synopsis: string;
  target_word_count: number;
  created_at: string;
  updated_at: string;
}

export interface BookState {
  meta: BookMeta;
  chapters: ChapterMeta[];
  characters: CharacterProfile[];
  foreshadowing: ForeshadowingItem[];
  timeline: TimelineEvent[];
  outline: OutlineStructure;
  world: WorldSettings;
  style_profile?: StyleProfile;
  total_word_count: number;
  current_chapter: number;
}

export interface ChapterMeta {
  number: number;
  title: string;
  word_count: number;
  status: "draft" | "review" | "edited" | "final";
  created_at: string;
  updated_at: string;
  summary?: string;
  pov_character?: string;
  scenes: SceneInfo[];
}

export interface SceneInfo {
  id: string;
  location: string;
  characters: string[];
  summary: string;
  word_count: number;
}

// ---------------------------------------------------------------------------
// Character Intelligence Layer types
// ---------------------------------------------------------------------------

export interface PersonalityMatrix {
  core_traits: string[];
  secondary_traits: string[];
  flaws: string[];
  internal_conflicts: string[];
  growth_arc: string[];
}

export interface VoiceProfile {
  vocabulary_level: "simple" | "moderate" | "literary" | "archaic";
  sentence_preference: "short" | "medium" | "varied" | "long";
  favorite_patterns: string[];
  forbidden_words: string[];
  dialect_or_accent?: string;
  speech_quirks: string[];
  greeting_style: string;
  anger_expression: string;
  joy_expression: string;
  sadness_expression: string;
}

export interface MotivationChain {
  primary_goal: string;
  secondary_goals: string[];
  hidden_desires: string[];
  fears: string[];
  moral_code: string;
  current_urgency: string;
}

export interface KnowledgeBoundary {
  known_facts: string[];
  unknown_facts: string[];
  misconceptions: string[];
  information_sources: string[];
  knowledge_timeline: Record<string, string[]>; // chapter -> facts learned
}

export interface Relationship {
  target_character: string;
  relationship_type: string;
  dynamic: "improving" | "worsening" | "stable" | "complex";
  history: string[];
  current_tension: number; // 0-1
  secret_knowledge: string[];
}

export interface EmotionalState {
  current_mood: string;
  mood_history: Array<{ chapter: number; mood: string; trigger: string }>;
  emotional_stability: number; // 0-1
  trauma_triggers: string[];
  comfort_sources: string[];
}

export interface CharacterProfile {
  id: string;
  name: string;
  alias?: string[];
  age: number;
  gender: string;
  role: "protagonist" | "antagonist" | "supporting" | "minor" | "mentioned";
  background: string;
  personality: PersonalityMatrix;
  voice: VoiceProfile;
  motivations: MotivationChain;
  knowledge: KnowledgeBoundary;
  relationships: Relationship[];
  emotional_state: EmotionalState;
  first_appearance: number;
  last_appearance: number;
  alive: boolean;
  tags: string[];
  notes: string;
}

// ---------------------------------------------------------------------------
// Foreshadowing & timeline
// ---------------------------------------------------------------------------

export interface ForeshadowingItem {
  id: string;
  planted_chapter: number;
  description: string;
  resolution_chapter?: number;
  resolution_description?: string;
  status: "planted" | "hinted" | "resolved" | "abandoned";
  importance: "critical" | "major" | "minor";
  related_characters: string[];
}

export interface TimelineEvent {
  id: string;
  chapter: number;
  scene?: string;
  description: string;
  characters_involved: string[];
  location: string;
  time_of_day?: string;
  duration?: string;
  consequences: string[];
}

// ---------------------------------------------------------------------------
// Outline & world
// ---------------------------------------------------------------------------

export interface OutlineStructure {
  act_outlines: ActOutline[];
  chapter_outlines: ChapterOutline[];
}

export interface ActOutline {
  act_number: number;
  title: string;
  description: string;
  chapter_range: [number, number];
  climax_chapter: number;
}

export interface ChapterOutline {
  chapter_number: number;
  title: string;
  summary: string;
  pov_character: string;
  key_events: string[];
  characters_present: string[];
  foreshadowing_planted: string[];
  foreshadowing_resolved: string[];
  emotional_arc: string;
  target_words?: number;
}

export interface WorldSettings {
  name: string;
  era: string;
  geography: string[];
  factions: FactionInfo[];
  power_system?: string;
  rules: string[];
  cultural_notes: string[];
  custom: Record<string, unknown>;
}

export interface FactionInfo {
  name: string;
  type: string;
  description: string;
  members: string[];
  goals: string[];
  reputation: string;
}

// ---------------------------------------------------------------------------
// LLM provider / model configuration
// ---------------------------------------------------------------------------

export interface Provider {
  name: string;
  type: "openai" | "anthropic" | "openai-compatible" | "ollama";
  base_url: string;
  api_key: string;
  models: ModelEntry[];
}

export interface ModelEntry {
  id: string;
  name: string;
  provider: string;
  context_window: number;
  max_output: number;
  cost_per_1k_input: number;
  cost_per_1k_output: number;
  capabilities: string[];
}

export interface AgentConfigEntry {
  agent_name: string;
  model_id: string;
  provider_name: string;
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  custom_params?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export type PipelineStage =
  | "context_assembly"
  | "character_reasoning"
  | "writing"
  | "event_recording"
  | "fact_check"
  | "continuity_check"
  | "pacing_check"
  | "character_intelligence_review"
  | "review_round_1"
  | "review_round_2"
  | "review_round_3"
  | "editing"
  | "de_ai"
  | "reflector"
  | "state_sync";

export interface PipelineStageState {
  stage: PipelineStage;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  started_at?: string;
  completed_at?: string;
  output?: string;
  error?: string;
  token_usage?: { input: number; output: number };
}

export interface PipelineState {
  book_path: string;
  chapter_number: number;
  stages: PipelineStageState[];
  started_at: string;
  completed_at?: string;
  status: "running" | "completed" | "failed" | "paused";
  error?: string;
}

// ---------------------------------------------------------------------------
// Style & techniques
// ---------------------------------------------------------------------------

export interface WritingTechnique {
  id: string;
  name: string;
  category: string;
  genre: string[];
  description: string;
  example: string;
  tips: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
}

export interface StyleProfile {
  dialogue_ratio: number;
  avg_paragraph_length: number;
  sentence_length_variance: number;
  vocabulary_richness: number;
  avg_sentence_length: number;
  dominant_tense: "past" | "present";
  pov: "first" | "third_limited" | "third_omniscient" | "second";
  high_frequency_verbs: string[];
  high_frequency_adjectives: string[];
  tropes: string[];
  genre_markers: string[];
  punctuation_patterns: Record<string, number>;
  constraints: StyleConstraints;
  raw_fingerprint?: StyleFingerprint;
}

export interface StyleConstraints {
  max_paragraph_length: number;
  min_paragraph_length: number;
  dialogue_density: "sparse" | "moderate" | "heavy";
  description_density: "minimal" | "moderate" | "rich";
  forbidden_patterns: string[];
  required_patterns: string[];
}

export interface StyleFingerprint {
  sentence_lengths: number[];
  sentence_length_std: number;
  sentence_length_mean: number;
  vocabulary_size: number;
  type_token_ratio: number;
  hapax_legomena_ratio: number;
  punctuation_frequency: Record<string, number>;
  avg_words_per_sentence: number;
  paragraph_lengths: number[];
  paragraph_length_std: number;
  paragraph_length_mean: number;
  common_openers: string[];
  transition_words: string[];
}

// ---------------------------------------------------------------------------
// Character intelligence reports
// ---------------------------------------------------------------------------

export interface CharacterViolation {
  character_id: string;
  character_name: string;
  category:
    | "voice_inconsistency"
    | "knowledge_leak"
    | "motivation_break"
    | "emotional_inconsistency"
    | "relationship_mismatch"
    | "behavioral_out_of_character"
    | "speech_pattern_violation";
  severity: "critical" | "major" | "minor";
  description: string;
  original_text: string;
  suggestion: string;
  chapter: number;
}

export interface CharacterInsightReport {
  chapter: number;
  total_violations: number;
  violations: CharacterViolation[];
  overall_consistency_score: number; // 0-100
  character_scores: Record<string, number>; // character_id -> score
  recommendations: string[];
  reviewed_at: string;
}

// ---------------------------------------------------------------------------
// Model config (for LLM calls)
// ---------------------------------------------------------------------------

export interface ModelConfig {
  provider: string;
  model_id: string;
  api_key: string;
  base_url: string;
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

// ---------------------------------------------------------------------------
// Knowledge base types
// ---------------------------------------------------------------------------

export interface KnowledgeEntry {
  id: string;
  name: string;
  category: string;
  genre: string[];
  difficulty: string;
  description: string;
  details: string;
  examples: string[];
  tags: string[];
}

// ---------------------------------------------------------------------------
// API request / response types
// ---------------------------------------------------------------------------

export interface GenerateRequest {
  book_path: string;
  agent_name: string;
  chapter_number: number;
  context: string;
  instruction?: string;
  max_tokens?: number;
}

export interface CharacterReviewRequest {
  book_path: string;
  chapter_number: number;
  chapter_content: string;
  character_ids?: string[]; // subset to review; all POV characters if omitted
}

export interface NamingRequest {
  type: "character" | "faction" | "place";
  genre: string;
  gender?: string;
  count?: number;
  constraints?: string[];
}

export interface StyleAnalyzeRequest {
  file_path: string;
}

export interface KnowledgeSearchRequest {
  query: string;
  genre?: string;
  category?: string;
  top_k?: number;
}
