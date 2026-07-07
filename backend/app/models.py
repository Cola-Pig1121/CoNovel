"""Pydantic models matching the CoNovel TypeScript types."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Character Intelligence Layer ──────────────────────────────────────────

class PersonalityMatrix(BaseModel):
    openness: float = 0.5
    conscientiousness: float = 0.5
    extraversion: float = 0.5
    agreeableness: float = 0.5
    neuroticism: float = 0.5


class VoiceProfile(BaseModel):
    vocabulary: list[str] = Field(default_factory=list)
    sentencePattern: str = "mixed"  # short | long | mixed
    speechQuirks: list[str] = Field(default_factory=list)
    formality: str = "mixed"  # casual | formal | mixed
    dialect: str | None = None


class MotivationChain(BaseModel):
    current: str = ""
    longTerm: str = ""
    fear: str = ""
    desire: str = ""


class KnowledgeBoundary(BaseModel):
    knows: list[str] = Field(default_factory=list)
    doesntKnow: list[str] = Field(default_factory=list)
    suspects: list[str] = Field(default_factory=list)


class Relationship(BaseModel):
    type: str = "neutral"  # ally | enemy | neutral | romantic | family
    trust: float = 0.5
    history: str = ""


class EmotionalState(BaseModel):
    current: str = "neutral"
    intensity: float = 0.5
    triggers: list[str] = Field(default_factory=list)


class CharacterProfile(BaseModel):
    id: str
    name: str
    role: str = ""  # protagonist | antagonist | supporting | minor
    personality: PersonalityMatrix = Field(default_factory=PersonalityMatrix)
    voice: VoiceProfile = Field(default_factory=VoiceProfile)
    motivations: MotivationChain = Field(default_factory=MotivationChain)
    knowledgeBoundary: KnowledgeBoundary = Field(default_factory=KnowledgeBoundary)
    relationships: dict[str, Relationship] = Field(default_factory=dict)
    emotionalState: EmotionalState = Field(default_factory=EmotionalState)
    createdAt: str = ""
    updatedAt: str = ""


# ── Character Intelligence Output ────────────────────────────────────────

class CharacterViolation(BaseModel):
    type: str = "behavior"  # language | behavior | knowledge | emotion | relationship
    severity: str = "minor"  # critical | major | minor
    description: str = ""
    evidence: str = ""
    suggestion: str = ""


class CharacterInsightReport(BaseModel):
    characterId: str
    characterName: str
    chapterNumber: int = 0
    violations: list[CharacterViolation] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    overallConsistency: float = 0.0
    timestamp: str = ""


# ── Foreshadowing ─────────────────────────────────────────────────────────

class ForeshadowingItem(BaseModel):
    id: str
    type: str = "planted"  # planted | hinted | resolved | overdue
    description: str = ""
    plantedInChapter: int = 0
    resolvedInChapter: int | None = None
    urgency: str = "low"  # low | medium | high | critical
    relatedCharacters: list[str] = Field(default_factory=list)


# ── Timeline ──────────────────────────────────────────────────────────────

class TimelineEvent(BaseModel):
    id: str
    chapterNumber: int = 0
    description: str = ""
    timestamp: str = ""
    location: str = ""
    characters: list[str] = Field(default_factory=list)


# ── Outline ───────────────────────────────────────────────────────────────

class ChapterOutline(BaseModel):
    chapterNumber: int = 0
    title: str = ""
    summary: str = ""
    keyEvents: list[str] = Field(default_factory=list)
    position: str = "propulsive"  # high-pressure | propulsive | relationship | low-pressure


class Volume(BaseModel):
    id: str = ""
    title: str = ""
    chapters: list[ChapterOutline] = Field(default_factory=list)


class OutlineStructure(BaseModel):
    volumes: list[Volume] = Field(default_factory=list)


# ── World Settings ────────────────────────────────────────────────────────

class WorldSettings(BaseModel):
    rules: str = ""
    powerSystem: str | None = None
    geography: str | None = None
    history: str | None = None
    customFields: dict[str, str] = Field(default_factory=dict)


# ── Style Profile ─────────────────────────────────────────────────────────

class StyleConstraints(BaseModel):
    dialogueStyle: str = ""
    paragraphLength: str = ""
    tonePattern: str = ""
    prohibitedKeywords: list[str] = Field(default_factory=list)
    avgSentenceLength: int | None = None
    dialogueRatio: float | None = None
    vocabFrequency: dict[str, float] | None = None


class StyleProfile(BaseModel):
    lastUpdated: str = ""
    sourceFile: str = ""
    constraints: StyleConstraints = Field(default_factory=StyleConstraints)


# ── Book ──────────────────────────────────────────────────────────────────

class BookMeta(BaseModel):
    id: str
    title: str
    genre: str = ""
    genres: list[str] = Field(default_factory=list)
    premise: str = ""
    targetWordCount: int = 0
    currentWordCount: int = 0
    currentChapter: int = 0
    totalChapters: int = 0
    status: str = "planning"  # planning | writing | paused | completed
    createdAt: str = ""
    updatedAt: str = ""


class BookState(BookMeta):
    """Full book state — extends BookMeta with all associated data."""
    characters: list[CharacterProfile] = Field(default_factory=list)
    foreshadowing: list[ForeshadowingItem] = Field(default_factory=list)
    outline: OutlineStructure = Field(default_factory=OutlineStructure)
    timeline: list[TimelineEvent] = Field(default_factory=list)
    worldSettings: WorldSettings = Field(default_factory=WorldSettings)
    lastSyncedAt: str = ""


# ── Chapter ───────────────────────────────────────────────────────────────

class ChapterMeta(BaseModel):
    chapterNumber: int
    title: str = ""
    wordCount: int = 0
    status: str = "draft"  # draft | reviewed | final
    content: str = ""
    outline: str = ""
    agentOutputs: dict[str, str] = Field(default_factory=dict)
    qualityGate: str = "L1"  # L1 | L2 | L3 | L4 | L5
    wordTarget: int = 3000
    createdAt: str = ""
    updatedAt: str = ""


# ── LLM Provider ─────────────────────────────────────────────────────────

class ModelEntry(BaseModel):
    id: str
    name: str
    contextWindow: int = 8192
    maxOutput: int = 4096


class Provider(BaseModel):
    id: str
    name: str
    baseUrl: str = ""
    apiFormat: str = "openai"  # openai | anthropic | custom
    apiKey: str = ""
    models: list[ModelEntry] = Field(default_factory=list)
    enabled: bool = True


# ── Agent Config ──────────────────────────────────────────────────────────

class AgentConfigEntry(BaseModel):
    role: str = ""
    name: str = ""
    nameZh: str = ""
    provider: str = ""
    modelId: str = ""
    temperature: float = 0.7
    maxTokens: int = 4096
    contextWindow: int = 8192
    reasoningEffort: str = "medium"  # low | medium | high
    enabled: bool = True


# ── Pipeline ──────────────────────────────────────────────────────────────

class PipelineStageState(BaseModel):
    stage: str  # PipelineStage string value
    status: str = "pending"  # pending | running | completed | failed
    output: str | None = None
    error: str | None = None
    duration: float | None = None
    startedAt: str | None = None
    completedAt: str | None = None


class PipelineState(BaseModel):
    bookId: str
    activeStage: str | None = None  # PipelineStage or null
    stages: list[PipelineStageState] = Field(default_factory=list)
    startedAt: str | None = None
    completedAt: str | None = None


# ── Writing Techniques ────────────────────────────────────────────────────

class WritingTechnique(BaseModel):
    id: str
    skill: str
    category: str
    tier: str = "reminder"  # reminder | defect_compensation | knowledge_supplement
    keywords: list[str] = Field(default_factory=list)
    genres: list[str] = Field(default_factory=list)
    content: str = ""


# ── Toast ─────────────────────────────────────────────────────────────────

class ToastMessage(BaseModel):
    id: str
    type: str = "info"  # success | error | info
    message: str = ""
    duration: int | None = None


# ── Request/Response Models ───────────────────────────────────────────────

class CreateBookRequest(BaseModel):
    title: str
    genre: str = ""
    genres: list[str] = Field(default_factory=list)
    premise: str = ""


class UpdateBookRequest(BaseModel):
    title: str | None = None
    genre: str | None = None
    premise: str | None = None
    status: str | None = None
    targetWordCount: int | None = None
    totalChapters: int | None = None


class CreateCharacterRequest(BaseModel):
    name: str
    role: str = ""


class UpdateCharacterRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    personality: PersonalityMatrix | None = None
    voice: VoiceProfile | None = None
    motivations: MotivationChain | None = None
    knowledgeBoundary: KnowledgeBoundary | None = None
    relationships: dict[str, Relationship] | None = None
    emotionalState: EmotionalState | None = None


class UpdateChapterRequest(BaseModel):
    content: str
    title: str | None = None
    outline: str | None = None
    qualityGate: str | None = None


class StartPipelineRequest(BaseModel):
    bookId: str
    chapterNumber: int
    mode: str = "full"  # full | continue | revise


class CancelPipelineRequest(BaseModel):
    bookId: str


class ImportTemplateRequest(BaseModel):
    repoUrl: str
    name: str = ""


class ExportTemplateRequest(BaseModel):
    bookId: str
    name: str
    targetDir: str = ""


class StoreImportRequest(BaseModel):
    repo_url: str


class StoreExportRequest(BaseModel):
    book_id: str
    name: str


class StyleAnalyzeRequest(BaseModel):
    file_path: str
    output_path: str


class DeAIRequest(BaseModel):
    text: str
