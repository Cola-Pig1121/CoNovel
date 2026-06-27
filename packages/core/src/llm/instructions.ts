import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { AgentRole } from '../agents/types.js';
import { readdirSync } from 'fs';

/**
 * Instructions Loader - 加载Agent指令文件和技能文档
 *
 * 从 agent/books/{book-id}/ 目录加载：
 * - subagents/{role}/instructions.md
 * - skills/{skill-name}.md
 */

const CONFIG_DIR = join(homedir(), '.config', 'conovel');

/**
 * 加载Agent的系统提示词（instructions + skills）
 */
export function loadAgentSystemPrompt(
  bookId: string,
  agentRole: AgentRole,
  skillNames: string[] = [],
): string {
  const bookDir = join(CONFIG_DIR, 'books', bookId, 'agent');

  // Load main instructions
  const instructionsPath = join(bookDir, 'subagents', agentRole, 'instructions.md');
  let instructions = '';
  if (existsSync(instructionsPath)) {
    instructions = readFileSync(instructionsPath, 'utf-8');
  }

  // Load skill files
  let skills = '';
  for (const skillName of skillNames) {
    const skillPath = join(bookDir, 'skills', `${skillName}.md`);
    if (existsSync(skillPath)) {
      skills += `\n\n---\n\n${readFileSync(skillPath, 'utf-8')}`;
    }
  }

  // Load constraint files as additional context
  const constraintsDir = join(CONFIG_DIR, 'books', bookId, 'constraints');
  let constraints = '';
  if (existsSync(constraintsDir)) {
    const constraintFiles = readdirSync(constraintsDir).filter(f => f.endsWith('.md'));
    for (const file of constraintFiles) {
      const content = readFileSync(join(constraintsDir, file), 'utf-8');
      constraints += `\n\n--- ${file} ---\n${content}`;
    }
  }

  // Load style config
  const stylePath = join(CONFIG_DIR, 'books', bookId, 'style.json');
  let styleConfig = '';
  if (existsSync(stylePath)) {
    const style = JSON.parse(readFileSync(stylePath, 'utf-8'));
    styleConfig = `\n\n--- 风格配置 ---\n${JSON.stringify(style, null, 2)}`;
  }

  return [
    instructions,
    skills,
    constraints ? `\n\n--- 写作约束文件 ---${constraints}` : '',
    styleConfig,
  ].filter(Boolean).join('\n');
}

/**
 * 加载Agent的指令文件（仅instructions）
 */
export function loadAgentInstructions(bookId: string, agentRole: AgentRole): string {
  const bookDir = join(CONFIG_DIR, 'books', bookId, 'agent');
  const instructionsPath = join(bookDir, 'subagents', agentRole, 'instructions.md');

  if (existsSync(instructionsPath)) {
    return readFileSync(instructionsPath, 'utf-8');
  }

  // Fallback to template
  const templateDir = join(process.env.CONOVEL_TEMPLATE_DIR || join(homedir(), '.zcode', 'skills'), 'conovel', 'agent', 'books', '_template');
  const templatePath = join(templateDir, 'subagents', agentRole, 'instructions.md');

  if (existsSync(templatePath)) {
    return readFileSync(templatePath, 'utf-8');
  }

  return '';
}
