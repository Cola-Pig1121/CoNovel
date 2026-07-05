// ============================================================================
// Ask User Question Tool — Structured clarifying questions during writing
// Inspired by rpiv-ask-user-question
// ============================================================================

import type { CoNovelTool, ToolContext, ToolResult } from './types.js'

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

// Store pending questionnaires in memory (lost on restart, that's OK)
const pendingQuestionnaires = new Map<string, Questionnaire>()

export function createAskUserQuestionTool(): CoNovelTool {
  return {
    definition: {
      name: 'ask_user_question',
      description: '向用户提出结构化问题以获取创作决策。当需要用户确认题材、角色设定、剧情方向、风格偏好等时使用。可以一次问多个问题。',
      parameters: {
        questions: {
          type: 'array',
          description: '问题列表（1-4个）',
          required: true,
        },
      },
    },

    execute: async (params, _context: ToolContext): Promise<ToolResult> => {
      try {
        const questions = params.questions as Question[]
        if (!Array.isArray(questions) || questions.length === 0) {
          return { success: false, error: '至少需要1个问题' }
        }
        if (questions.length > 4) {
          return { success: false, error: '最多4个问题' }
        }

        // Validate each question
        for (const q of questions) {
          if (!q.question || !q.header || !q.options || q.options.length < 2) {
            return { success: false, error: `问题 "${q.header}" 需要至少2个选项` }
          }
          if (q.options.length > 4) {
            return { success: false, error: `问题 "${q.header}" 最多4个选项` }
          }
        }

        const id = `q_${Date.now().toString(36)}`
        const questionnaire: Questionnaire = {
          id,
          questions,
          createdAt: new Date().toISOString(),
          status: 'pending',
        }
        pendingQuestionnaires.set(id, questionnaire)

        return {
          success: true,
          data: {
            questionnaireId: id,
            questions: questions.map((q, i) => ({
              index: i,
              header: q.header,
              question: q.question,
              options: q.options.map((o) => ({ label: o.label, description: o.description })),
              multiSelect: q.multiSelect ?? false,
            })),
            message: '问题已提交给用户，请等待回答。',
          },
        }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    },
  }
}

// Functions for the API layer to manage questionnaires
export function getPendingQuestionnaire(id: string): Questionnaire | undefined {
  return pendingQuestionnaires.get(id)
}

export function getAllPendingQuestionnaires(): Questionnaire[] {
  return [...pendingQuestionnaires.values()].filter((q) => q.status === 'pending')
}

export function answerQuestionnaire(id: string, answers: QuestionAnswer[]): boolean {
  const q = pendingQuestionnaires.get(id)
  if (!q) return false
  q.answers = answers
  q.status = 'answered'
  return true
}

export function cancelQuestionnaire(id: string): boolean {
  const q = pendingQuestionnaires.get(id)
  if (!q) return false
  q.status = 'cancelled'
  return true
}
