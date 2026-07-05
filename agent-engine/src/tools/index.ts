// ============================================================================
// CoNovel Tools — Public API
// ============================================================================

export type { ToolDefinition, ToolContext, ToolResult, CoNovelTool, ToolFactory, FileOperations, ToolParameter } from './types.js'

// Core tools
export { createReadFileTool } from './read-file.js'
export { createWriteFileTool } from './write-file.js'
export { createGrepTool } from './grep.js'
export { createSearchKnowledgeTool } from './search-knowledge.js'

// Agent-specific tools
export { createOutlineBuilderTool } from './outline-builder.js'
export { createChapterWriterTool } from './chapter-writer.js'
export { createCharacterReviewTool } from './character-review.js'

// Built-in web tools
export { createMoegirlWikiTool } from './moegirl-wiki.js'
export { createFileSearchTool } from './file-search.js'

// Interactive tools
export { createAskUserQuestionTool, getPendingQuestionnaire, getAllPendingQuestionnaires, answerQuestionnaire, cancelQuestionnaire } from './ask-user-question.js'
export type { Question, Questionnaire, QuestionAnswer } from './ask-user-question.js'

import { createReadFileTool } from './read-file.js'
import { createWriteFileTool } from './write-file.js'
import { createGrepTool } from './grep.js'
import { createSearchKnowledgeTool } from './search-knowledge.js'
import { createMoegirlWikiTool } from './moegirl-wiki.js'
import { createFileSearchTool } from './file-search.js'
import { createAskUserQuestionTool } from './ask-user-question.js'
import type { CoNovelTool, FileOperations } from './types.js'

/**
 * Create all shared tools with default filesystem operations
 */
export function createSharedTools(ops?: Partial<FileOperations>): CoNovelTool[] {
  return [
    createReadFileTool(ops),
    createWriteFileTool(ops),
    createGrepTool(ops),
    createSearchKnowledgeTool(ops),
    createMoegirlWikiTool(ops),
    createFileSearchTool(ops),
    createAskUserQuestionTool(),
  ]
}
