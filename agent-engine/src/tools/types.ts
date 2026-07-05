// ============================================================================
// CoNovel Tool Framework — Inspired by Pi Agent's tool pattern
// Tools are TypeScript functions that agents can call during execution.
// ============================================================================

/**
 * Tool parameter definition (JSON Schema-like)
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required?: boolean
  default?: any
  enum?: string[]
}

/**
 * Tool definition — the contract between agent and tool
 */
export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, ToolParameter>
}

/**
 * Tool execution context — runtime state available to tools
 */
export interface ToolContext {
  bookPath: string
  chapterNumber?: number
  [key: string]: any
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * Pluggable operations — allows overriding filesystem/API for remote systems
 */
export interface FileOperations {
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  mkdir: (path: string) => Promise<void>
  exists: (path: string) => Promise<boolean>
  readdir: (path: string) => Promise<string[]>
  stat: (path: string) => Promise<{ isFile: boolean; isDirectory: boolean; size: number }>
}

/**
 * A ready-to-use tool that agents can invoke
 */
export interface CoNovelTool {
  definition: ToolDefinition
  execute: (params: Record<string, any>, context: ToolContext) => Promise<ToolResult>
}

/**
 * Tool factory — creates a CoNovelTool with default or custom operations
 */
export type ToolFactory = (ops?: Partial<FileOperations>) => CoNovelTool
