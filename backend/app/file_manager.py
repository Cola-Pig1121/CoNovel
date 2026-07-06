"""File system CRUD operations for CoNovel data."""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config import DATA_DIR, ensure_data_dirs, get_book_dir, get_books_dir, get_templates_dir

# ── Ensure dirs on import ──────────────────────────────────────────────────
ensure_data_dirs()


# ── Generic JSON helpers ───────────────────────────────────────────────────

def read_json(path: Path) -> Any:
    """Read and parse a JSON file. Returns None if not found."""
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data: Any) -> None:
    """Write data as formatted JSON, creating parent dirs as needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ── Directory helpers ──────────────────────────────────────────────────────

def list_dir(path: Path) -> list[str]:
    """List immediate child names in a directory (non-recursively)."""
    if not path.exists():
        return []
    return [entry.name for entry in sorted(path.iterdir()) if entry.is_dir() or entry.is_file()]


def ensure_dir(path: Path) -> None:
    """Create directory (and parents) if it doesn't exist."""
    path.mkdir(parents=True, exist_ok=True)


def remove_dir(path: Path) -> None:
    """Remove a directory tree if it exists."""
    if path.exists():
        shutil.rmtree(path)


# ── Book Index ─────────────────────────────────────────────────────────────

def read_book_index() -> list[dict]:
    """Read the book index file. Returns an empty list if not found."""
    index_path = DATA_DIR / "books.json"
    data = read_json(index_path)
    if data is None:
        return []
    return data if isinstance(data, list) else []


def write_book_index(index: list[dict]) -> None:
    """Write the book index file."""
    write_json(DATA_DIR / "books.json", index)


# ── Book State ─────────────────────────────────────────────────────────────

def read_book_state(book_id: str) -> dict | None:
    """Read a book's state.json (flat structure matching BookState)."""
    state_path = get_book_dir(book_id) / "state.json"
    return read_json(state_path)


def write_book_state(book_id: str, state: dict) -> None:
    """Write a book's state.json."""
    state_path = get_book_dir(book_id) / "state.json"
    if "updatedAt" not in state:
        state["updatedAt"] = _now_iso()
    write_json(state_path, state)


# ── Chapters ───────────────────────────────────────────────────────────────

def read_chapter(book_id: str, num: int) -> dict | None:
    """Read a chapter file (chapter_XXXX.json) — flat ChapterMeta structure."""
    chapter_path = get_book_dir(book_id) / "chapters" / f"chapter_{num:04d}.json"
    return read_json(chapter_path)


def write_chapter(book_id: str, num: int, data: dict) -> None:
    """Write a chapter file — flat ChapterMeta structure with content."""
    chapters_dir = get_book_dir(book_id) / "chapters"
    chapters_dir.mkdir(parents=True, exist_ok=True)
    chapter_path = chapters_dir / f"chapter_{num:04d}.json"
    # Update timestamps and word count
    if not data.get("createdAt"):
        data["createdAt"] = _now_iso()
    data["updatedAt"] = _now_iso()
    if "content" in data:
        data["wordCount"] = len(data["content"].split())
    write_json(chapter_path, data)


def list_chapters(book_id: str) -> list[dict]:
    """List all chapter metadata for a book."""
    chapters_dir = get_book_dir(book_id) / "chapters"
    if not chapters_dir.exists():
        return []
    chapters = []
    for f in sorted(chapters_dir.glob("chapter_*.json")):
        data = read_json(f)
        if data:
            # Return the full chapter data (ChapterMeta with content)
            chapters.append(data)
    return chapters


# ── Characters ─────────────────────────────────────────────────────────────

def read_characters(book_id: str) -> list[dict]:
    """Read all characters for a book."""
    chars_path = get_book_dir(book_id) / "characters.json"
    data = read_json(chars_path)
    if data is None:
        return []
    return data if isinstance(data, list) else []


def write_characters(book_id: str, characters: list[dict]) -> None:
    """Write the full characters list for a book."""
    write_json(get_book_dir(book_id) / "characters.json", characters)


def read_character(book_id: str, char_id: str) -> dict | None:
    """Read a single character by ID."""
    characters = read_characters(book_id)
    for char in characters:
        if char.get("id") == char_id:
            return char
    return None


def write_character(book_id: str, character: dict) -> None:
    """Create or update a single character in the characters list."""
    characters = read_characters(book_id)
    existing_idx = next(
        (i for i, c in enumerate(characters) if c.get("id") == character.get("id")),
        None,
    )
    if existing_idx is not None:
        characters[existing_idx] = character
    else:
        characters.append(character)
    write_characters(book_id, characters)


def delete_character(book_id: str, char_id: str) -> bool:
    """Delete a character by ID. Returns True if found and deleted."""
    characters = read_characters(book_id)
    new_chars = [c for c in characters if c.get("id") != char_id]
    if len(new_chars) == len(characters):
        return False
    write_characters(book_id, new_chars)
    return True


# ── Foreshadowing ──────────────────────────────────────────────────────────

def read_foreshadowing(book_id: str) -> list[dict]:
    """Read all foreshadowing items for a book."""
    path = get_book_dir(book_id) / "foreshadowing.json"
    data = read_json(path)
    if data is None:
        return []
    return data if isinstance(data, list) else []


def write_foreshadowing(book_id: str, items: list[dict]) -> None:
    """Write the full foreshadowing list for a book."""
    write_json(get_book_dir(book_id) / "foreshadowing.json", items)


# ── Timeline ───────────────────────────────────────────────────────────────

def read_timeline(book_id: str) -> list[dict]:
    """Read all timeline events for a book."""
    path = get_book_dir(book_id) / "timeline.json"
    data = read_json(path)
    if data is None:
        return []
    return data if isinstance(data, list) else []


def write_timeline(book_id: str, events: list[dict]) -> None:
    """Write the full timeline for a book."""
    write_json(get_book_dir(book_id) / "timeline.json", events)


# ── Outline ────────────────────────────────────────────────────────────────

def read_outline(book_id: str) -> dict | None:
    """Read the outline structure for a book."""
    return read_json(get_book_dir(book_id) / "outline.json")


def write_outline(book_id: str, outline: dict) -> None:
    """Write the outline structure for a book."""
    write_json(get_book_dir(book_id) / "outline.json", outline)


# ── World Settings ─────────────────────────────────────────────────────────

def read_world_settings(book_id: str) -> dict | None:
    """Read world settings for a book."""
    return read_json(get_book_dir(book_id) / "world.json")


def write_world_settings(book_id: str, world: dict) -> None:
    """Write world settings for a book."""
    write_json(get_book_dir(book_id) / "world.json", world)


# ── Style Profile ──────────────────────────────────────────────────────────

def read_style_profile(book_id: str) -> dict | None:
    """Read style profile for a book."""
    return read_json(get_book_dir(book_id) / "style.json")


def write_style_profile(book_id: str, style: dict) -> None:
    """Write style profile for a book."""
    write_json(get_book_dir(book_id) / "style.json", style)


# ── Constraints (combined knowledge bundle) ────────────────────────────────

def read_constraints(book_id: str) -> dict:
    """Read all constraint data bundled for agent consumption."""
    return {
        "characters": read_characters(book_id),
        "foreshadowing": read_foreshadowing(book_id),
        "timeline": read_timeline(book_id),
        "outline": read_outline(book_id),
        "worldSettings": read_world_settings(book_id),
        "style": read_style_profile(book_id),
    }


# ── Providers / Settings ──────────────────────────────────────────────────

def read_providers() -> list[dict]:
    """Read the global providers configuration."""
    path = DATA_DIR / "providers.json"
    data = read_json(path)
    if data is None:
        return []
    return data if isinstance(data, list) else []


def write_providers(providers: list[dict]) -> None:
    """Write the global providers configuration."""
    write_json(DATA_DIR / "providers.json", providers)


# ── Agent Config ───────────────────────────────────────────────────────────

def read_agent_config() -> dict:
    """Read agent config list, falling back to defaults."""
    path = DATA_DIR / "agent-config.json"
    data = read_json(path)
    if data is None:
        return {
            "role": "writer",
            "name": "CoNovel Writer",
            "nameZh": "CoNovel 写手",
            "provider": "",
            "modelId": "",
            "temperature": 0.7,
            "maxTokens": 4096,
            "contextWindow": 8192,
            "reasoningEffort": "medium",
            "enabled": True,
        }
    return data


def write_agent_config(config: dict) -> None:
    """Write agent config."""
    write_json(DATA_DIR / "agent-config.json", config)


# ── Pipeline State ─────────────────────────────────────────────────────────

def read_pipeline_state(book_id: str) -> dict | None:
    """Read pipeline state for a book."""
    return read_json(get_book_dir(book_id) / "pipeline.json")


def write_pipeline_state(book_id: str, state: dict) -> None:
    """Write pipeline state for a book."""
    write_json(get_book_dir(book_id) / "pipeline.json", state)


# ── Memory ─────────────────────────────────────────────────────────────────

def read_memory_snapshots(book_id: str) -> list[dict]:
    """Read all fact snapshots for a book."""
    memory_dir = get_book_dir(book_id) / "memory" / "snapshots"
    if not memory_dir.exists():
        return []
    snapshots = []
    for f in sorted(memory_dir.iterdir()):
        if f.suffix == ".json":
            data = read_json(f)
            if data is not None:
                snapshots.append(data)
    return snapshots


def write_memory_snapshot(book_id: str, chapter_num: int, data: dict) -> None:
    """Write a fact snapshot for a chapter."""
    memory_dir = get_book_dir(book_id) / "memory" / "snapshots"
    ensure_dir(memory_dir)
    write_json(memory_dir / f"chapter_{chapter_num:04d}.json", data)


def read_memory_summaries(book_id: str) -> list[dict]:
    """Read all chapter summaries."""
    memory_dir = get_book_dir(book_id) / "memory" / "summaries"
    if not memory_dir.exists():
        return []
    summaries = []
    for f in sorted(memory_dir.iterdir()):
        if f.suffix == ".json":
            data = read_json(f)
            if data is not None:
                summaries.append(data)
    return summaries


def write_memory_summary(book_id: str, chapter_num: int, summary: str) -> None:
    """Write a chapter summary."""
    memory_dir = get_book_dir(book_id) / "memory" / "summaries"
    ensure_dir(memory_dir)
    write_json(memory_dir / f"chapter_{chapter_num:04d}.json", {
        "chapter": chapter_num,
        "summary": summary,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


def read_character_states(book_id: str) -> list[dict]:
    """Read all character states from memory."""
    memory_dir = get_book_dir(book_id) / "memory" / "character_states"
    if not memory_dir.exists():
        return []
    states = []
    for f in sorted(memory_dir.iterdir()):
        if f.suffix == ".json":
            data = read_json(f)
            if data is not None:
                states.append(data)
    return states


def write_character_state(book_id: str, char_id: str, state: dict) -> None:
    """Write a character state snapshot."""
    memory_dir = get_book_dir(book_id) / "memory" / "character_states"
    ensure_dir(memory_dir)
    write_json(memory_dir / f"{char_id}.json", state)


def read_memory_facts(book_id: str, chapter_num: int | None = None) -> list[dict]:
    """Read fact entries. If chapter_num is provided, filter by chapter."""
    memory_dir = get_book_dir(book_id) / "memory" / "facts"
    if not memory_dir.exists():
        return []
    if chapter_num is not None:
        # Read only the specific chapter file
        chapter_file = memory_dir / f"chapter_{chapter_num:04d}.json"
        data = read_json(chapter_file)
        if data is None:
            return []
        return data if isinstance(data, list) else []
    # Read all chapter fact files
    all_facts: list[dict] = []
    for f in sorted(memory_dir.glob("chapter_*.json")):
        data = read_json(f)
        if data is not None:
            if isinstance(data, list):
                all_facts.extend(data)
            else:
                all_facts.append(data)
    return all_facts


def write_memory_facts(book_id: str, chapter_num: int, facts: list[dict]) -> None:
    """Write fact entries for a chapter."""
    memory_dir = get_book_dir(book_id) / "memory" / "facts"
    ensure_dir(memory_dir)
    write_json(memory_dir / f"chapter_{chapter_num:04d}.json", facts)


def read_memory_all_facts(book_id: str) -> list[dict]:
    """Read all facts across all chapters."""
    return read_memory_facts(book_id)


def read_memory_long_term(book_id: str) -> dict:
    """Read long-term memory."""
    path = get_book_dir(book_id) / "memory" / "long_term.json"
    data = read_json(path)
    return data if data is not None else {}


def write_memory_long_term(book_id: str, data: dict) -> None:
    """Write long-term memory."""
    memory_dir = get_book_dir(book_id) / "memory"
    ensure_dir(memory_dir)
    write_json(memory_dir / "long_term.json", data)


def read_memory_index(book_id: str) -> dict:
    """Read memory index."""
    path = get_book_dir(book_id) / "memory" / "index.json"
    data = read_json(path)
    return data if data is not None else {}


def write_memory_index(book_id: str, data: dict) -> None:
    """Write memory index."""
    memory_dir = get_book_dir(book_id) / "memory"
    ensure_dir(memory_dir)
    write_json(memory_dir / "index.json", data)


# ── .eve Template ──────────────────────────────────────────────────────────

DEFAULT_AGENT_CONFIG = {
    # ── Strong tier: core writing agents ──
    "story_architect": {"provider": "openai", "model": "gpt-4o", "temperature": 0.7, "maxTokens": 4096, "tier": "strong"},
    "narrative_writer": {"provider": "openai", "model": "gpt-4o", "temperature": 0.8, "maxTokens": 8192, "tier": "strong"},
    "reviewer": {"provider": "openai", "model": "gpt-4o", "temperature": 0.3, "maxTokens": 4096, "tier": "strong"},
    "character_intelligence": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.5, "maxTokens": 4096, "tier": "strong"},
    # ── Medium tier: standard task agents ──
    "executive_editor": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.3, "maxTokens": 4096, "tier": "medium"},
    "character_designer": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.6, "maxTokens": 4096, "tier": "medium"},
    "editor": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.5, "maxTokens": 4096, "tier": "medium"},
    "de_ai_editor": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.4, "maxTokens": 4096, "tier": "medium"},
    "style_analyzer": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.5, "maxTokens": 4096, "tier": "medium"},
    "reflector": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.6, "maxTokens": 4096, "tier": "medium"},
    # ── Light tier: auxiliary agents ──
    "fact_checker": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.1, "maxTokens": 2048, "tier": "light"},
    "continuity_checker": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.1, "maxTokens": 2048, "tier": "light"},
    "pacing_controller": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.3, "maxTokens": 2048, "tier": "light"},
    "foreshadowing_tracker": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.2, "maxTokens": 2048, "tier": "light"},
    "observer": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.2, "maxTokens": 2048, "tier": "light"},
    "radar": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.5, "maxTokens": 2048, "tier": "light"},
    # ── Fallback ──
    "default": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.5, "maxTokens": 2048, "tier": "medium"},
}

DEFAULT_STYLE_CONSTRAINTS = """# Style Constraints

## Dialogue
- Keep dialogue natural and character-specific
- Each character should have a distinct voice
- Avoid dialogue tags where action can replace them
- Use subtext rather than explicit emotional statements

## Paragraph Length
- Average paragraph length: 3-5 sentences
- Vary paragraph length for rhythm and pacing
- Use short paragraphs for tension, longer for reflection

## Tone
- Maintain consistent narrative tone within scenes
- Match tone to genre expectations
- Avoid abrupt tonal shifts without transition

## Sentence Structure
- Mix simple, compound, and complex sentences
- Vary sentence openings
- Avoid excessive use of passive voice
- Target average sentence length: 15-25 words

## POV
- Maintain consistent point of view throughout chapters
- Do not head-hop between characters' internal thoughts
"""

DEFAULT_BANNED_WORDS = """# Banned / AI Fatigue Words

Avoid these overused AI-generated phrases and words:

## Overused Adjectives
- nuanced
- intricate
- captivating
- mesmerizing
- profound
- unparalleled
- exquisite
- ethereal
- resplendent
- magnificent

## Overused Adverbs
- deliberately
- meticulously
- subtly
- unmistakably
- undeniably
- palpably
- inexplicably

## Overused Phrases
- "couldn't help but"
- "a sense of"
- "the weight of"
- "as if"
- "like a"
- "seemed to"
- "couldn't help noticing"
- "there was something about"
- "it was as though"
- "a mere"

## Overused Verbs
- gazed
- lingered
- simmered
- bristled
- yearned
- faltered

## Filler Phrases
- "in the end"
- "at the end of the day"
- "it goes without saying"
- "needless to say"
- "it's worth noting"
- "it's important to note"
"""

DEFAULT_PLOT_CONSTRAINTS = """# Plot Constraints

## Structure
- Follow a clear three-act structure (or genre-appropriate structure)
- Each chapter should advance at least one major plot thread
- Avoid deus ex machina resolutions

## Pacing
- Balance action sequences with quieter character moments
- Ensure rising tension toward chapter endings
- Alternate between high-pressure and low-pressure chapters
- Maintain urgency through the mid-point

## Conflict
- Every scene needs some form of conflict or tension
- External and internal conflicts should intertwine
- Raise stakes progressively throughout the story

## Resolution
- All planted foreshadowing must eventually resolve
- Subplots should intersect with or mirror the main plot
- Character arcs should complete alongside plot resolution

## Continuity
- Track all plot threads in the timeline
- No unexplained contradictions in events
- Character knowledge must be consistent with what they've witnessed
"""

DEFAULT_CHARACTER_RULES = """# Character Rules

## Consistency
- Characters must behave according to their established personality
- Emotional reactions should match personality traits and history
- Characters cannot know things they haven't learned in-story

## Voice
- Each character needs distinct dialogue patterns
- Vocabulary and sentence structure should differ between characters
- Speech quirks should be consistent and natural

## Growth
- Character development should be gradual and earned
- Major personality shifts require significant story events
- Growth should be shown through behavior, not stated

## Relationships
- Character relationships should evolve based on shared experiences
- Trust levels should change realistically with betrayal or kindness
- Supporting characters should have their own motivations beyond the protagonist

## Physical
- Descriptions should be consistent across chapters
- Avoid contradicting physical details
- Actions should be physically plausible
"""

DEFAULT_WRITING_GUIDE = """# Writing Guide

## Show, Don't Tell
- Convey emotions through actions, body language, and dialogue
- Use sensory details to immerse the reader
- Let readers draw their own conclusions

## Dialogue
- Keep dialogue purposeful — every exchange should advance plot or character
- Use subtext — what characters don't say matters
- Avoid on-the-nose dialogue where characters state feelings directly

## Description
- Use specific, concrete details rather than vague abstractions
- Engage multiple senses in key scenes
- Avoid over-description that slows pacing

## Inner Monologue
- Limit internal thoughts to key emotional moments
- Differentiate a character's inner voice from narration
- Use inner monologue to reveal character, not to explain plot

## Transitions
- Use scene breaks or chapter breaks for time jumps
- Open scenes as late as possible, close them as early as possible
- Maintain narrative flow between scenes

## Tension
- Start each scene with a question or problem
- Withhold information strategically
- Use cliffhangers and unanswered questions to drive page-turning
"""


def create_book_eve_template(book_path: str) -> None:
    """Create the .eve directory template with default agent config and constraints."""
    eve_dir = Path(book_path) / ".eve"

    # Create .eve/agents/ directory
    agents_dir = eve_dir / "agents"
    agents_dir.mkdir(parents=True, exist_ok=True)

    # Create .eve/agent-config.json
    write_json(eve_dir / "agent-config.json", DEFAULT_AGENT_CONFIG)

    # Create .eve/evolution.log (empty file)
    evolution_log = eve_dir / "evolution.log"
    evolution_log.parent.mkdir(parents=True, exist_ok=True)
    evolution_log.touch()

    # Create constraints directory and default files
    constraints_dir = eve_dir / "constraints"
    constraints_dir.mkdir(parents=True, exist_ok=True)

    (constraints_dir / "style-constraints.md").write_text(
        DEFAULT_STYLE_CONSTRAINTS, encoding="utf-8"
    )
    (constraints_dir / "banned-words.md").write_text(
        DEFAULT_BANNED_WORDS, encoding="utf-8"
    )
    (constraints_dir / "plot-constraints.md").write_text(
        DEFAULT_PLOT_CONSTRAINTS, encoding="utf-8"
    )
    (constraints_dir / "character-rules.md").write_text(
        DEFAULT_CHARACTER_RULES, encoding="utf-8"
    )
    (constraints_dir / "writing-guide.md").write_text(
        DEFAULT_WRITING_GUIDE, encoding="utf-8"
    )


# ── Templates ──────────────────────────────────────────────────────────────

def list_local_templates() -> list[str]:
    """List locally available templates."""
    templates_dir = get_templates_dir()
    return [
        entry.name
        for entry in sorted(templates_dir.iterdir())
        if entry.is_dir()
    ]


def get_template_dir(name: str) -> Path:
    """Return the path for a specific template."""
    return get_templates_dir() / name


# ── Utilities ──────────────────────────────────────────────────────────────

def _now_iso() -> str:
    """Return the current time as an ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def generate_id() -> str:
    """Generate a simple unique ID using timestamp + short random."""
    import random
    import string
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    rand = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"{ts}-{rand}"
