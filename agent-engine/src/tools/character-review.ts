// ============================================================================
// Character Review Tool — Extract character dialogue/actions and build review prompt
// ============================================================================

import { join } from 'path'
import { readFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import type { CoNovelTool, FileOperations, ToolContext, ToolResult } from './types.js'

interface CharacterProfile {
  id: string
  name: string
  role: string
  voice?: { vocabulary?: string[]; speechQuirks?: string[]; sentencePattern?: string }
  motivations?: { current?: string; fear?: string; desire?: string }
  knowledgeBoundary?: { knows?: string[]; doesntKnow?: string[] }
  relationships?: Record<string, any>
  emotionalState?: { current?: string; intensity?: number }
}

export function createCharacterReviewTool(_ops?: Partial<FileOperations>): CoNovelTool {
  return {
    definition: {
      name: 'character_review',
      description: '提取章节中角色的对话和行为，构建第一人称审查提示词',
      parameters: {
        chapterContent: { type: 'string', description: '章节正文内容', required: true },
        characterId: { type: 'string', description: '指定审查的角色 ID（为空则审查所有 POV 角色）' },
      },
    },

    execute: async (params, context): Promise<ToolResult> => {
      try {
        const content = params.chapterContent as string
        const targetId = params.characterId as string | undefined

        // 加载所有角色档案
        const characters = await loadCharacters(context.bookPath)
        if (characters.length === 0) {
          return { success: true, data: { reports: [], message: '没有角色档案' } }
        }

        // 筛选目标角色
        const targets = targetId
          ? characters.filter((c) => c.id === targetId)
          : characters

        const reports = []
        for (const char of targets) {
          // 提取该角色的对话
          const dialogue = extractDialogue(content, char.name)
          // 提取该角色的行为
          const actions = extractActions(content, char.name)

          if (dialogue.length === 0 && actions.length === 0) continue

          // 构建审查提示词
          const reviewPrompt = buildReviewPrompt(char, dialogue, actions)

          reports.push({
            characterId: char.id,
            characterName: char.name,
            dialogue,
            actions,
            reviewPrompt,
          })
        }

        return { success: true, data: { reports, totalCharacters: targets.length } }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    },
  }
}

function extractDialogue(text: string, charName: string): string[] {
  const dialogues: string[] = []
  // Match patterns like: "xxx"xxx说, or xxx说："xxx"
  const patterns = [
    new RegExp(`[「『"]([^」』"]+)[」』"][,，]?\\s*${charName}(?:说|道|笑|喊|问|答|叹|哼|冷笑|低声|轻声|大声|怒道|冷冷)`, 'g'),
    new RegExp(`${charName}(?:说|道|笑|喊|问|答|叹|哼|冷笑|低声|轻声|大声|怒道|冷冷)[：:]*\\s*[「『"]([^」』"]+)[」』"]`, 'g'),
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      dialogues.push(match[1])
    }
  }
  return [...new Set(dialogues)]
}

function extractActions(text: string, charName: string): string[] {
  const actions: string[] = []
  // Find sentences containing the character name and action verbs
  const sentences = text.split(/[。！？]/)
  const actionVerbs = '走|跑|站|坐|躺|拿|放|推|拉|握|点|摇头|点头|转身|抬头|低头|看向|盯着|微笑|皱眉|叹气|冷笑|哼|站起|坐下|走近|后退|伸手|收回|打开|关闭|拿起|放下'

  for (const sentence of sentences) {
    if (sentence.includes(charName) && new RegExp(actionVerbs).test(sentence)) {
      actions.push(sentence.trim())
    }
  }
  return actions.slice(0, 20) // limit
}

function buildReviewPrompt(char: CharacterProfile, dialogue: string[], actions: string[]): string {
  const voice = char.voice ?? {}
  const motivations = char.motivations ?? {}
  const kb = char.knowledgeBoundary ?? {}
  const emotional = char.emotionalState ?? {}

  return `你是「${char.name}」，请基于 CSP 角色行为蒸馏模型，从6个维度审视以下你在本章中的言行：

## 你的人设
- 性格角色: ${char.role}
- 当前目标: ${motivations.current ?? '未设定'}
- 核心恐惧: ${motivations.fear ?? '未设定'}
- 核心欲望: ${motivations.desire ?? '未设定'}
- 说话方式: ${voice.sentencePattern ?? '未设定'}
- 口癖/语气词: ${(voice.speechQuirks ?? []).join('、') || '无'}
- 常用词汇: ${(voice.vocabulary ?? []).join('、') || '无'}
- 当前情绪: ${emotional.current ?? '平静'} (强度: ${emotional.intensity ?? 50}/100)
- 确定知道: ${(kb.knows ?? []).join('、') || '无'}
- 确定不知道: ${(kb.doesntKnow ?? []).join('、') || '无'}
- 关系网络: ${JSON.stringify(char.relationships ?? {})}

## 你的对话
${dialogue.map((d, i) => `${i + 1}. 「${d}」`).join('\n') || '（本章无对话）'}

## 你的行为
${actions.map((a, i) => `${i + 1}. ${a}`).join('\n') || '（本章无行为描写）'}

## CSP 6维度审查（行为蒸馏模型）

### D1 行为镜片 — 你先注意什么、忽略什么？
- 你在场景中首先关注了什么？这符合你的性格吗？
- 你忽略了什么不该忽略的信息？

### D2 反应规则 — 什么情境下靠近、逃开、攻击、沉默？
- 面对冲突/威胁/亲近，你的反应模式对吗？
- 你的反应强度与当前情绪状态匹配吗？

### D3 表达 DNA — 句长、停顿、敬语、自称、情绪泄露
- 你的对话句式长度变化自然吗？
- 你的自称/敬语使用是否一致？
- 你的情绪是否通过表达方式自然泄露，而不是直接"我很生气"？

### D4 关系算法 — 她如何判断善意、背叛、亲近、利用？
- 你对不同角色的态度差异是否合理？
- 你的信任/警惕反应是否符合当前关系状态？

### D5 决策底线 — 价值冲突时先保什么、牺牲什么？
- 面对两难选择时，你的优先级排序对吗？
- 你是否被轻易说服做了不该做的事？

### D6 诚实边界 — 哪些不知道、哪些过期、哪些只是推测？
- 你是否说出了你知识范围外的信息？
- 你是否表现出了你不可能知道的事情？

请输出 JSON 格式的审查结果，每个维度给出: 维度名、是否通过、违规描述（如有）、修改建议（如有）。`
}

async function loadCharacters(bookPath: string): Promise<CharacterProfile[]> {
  const charsDir = join(bookPath, 'characters')
  if (!existsSync(charsDir)) return []

  try {
    const files = await readdir(charsDir)
    const characters: CharacterProfile[] = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const content = await readFile(join(charsDir, file), 'utf-8')
      characters.push(JSON.parse(content))
    }
    return characters
  } catch {
    return []
  }
}
