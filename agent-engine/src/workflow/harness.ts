import { WorkflowRun, TaskStatus } from './types'

// Deterministic helpers that run WITHOUT LLM calls
// Used for: dedup, validation, normalization, formatting

export function deduplicateFindings(findings: any[]): any[] {
  const seen = new Set<string>()
  const unique: any[] = []
  
  for (const finding of findings) {
    // Create a fingerprint from key fields
    const fingerprint = JSON.stringify({
      type: finding.type,
      message: finding.message,
      location: finding.location
    })
    
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint)
      unique.push(finding)
    }
  }
  
  return unique
}

export function validateChapterStructure(content: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check minimum length
  if (content.length < 1000) {
    issues.push('Chapter too short (minimum 1000 characters)')
  }
  
  // Check for dialogue
  if (!content.includes('"') && !content.includes('"')) {
    issues.push('No dialogue detected')
  }
  
  // Check for scene breaks
  const sceneBreaks = (content.match(/\*{3,}|-{3,}|={3,}/g) || []).length
  if (sceneBreaks === 0 && content.length > 5000) {
    issues.push('Long chapter without scene breaks')
  }
  
  // Check for proper paragraph structure
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  if (paragraphs.length < 3) {
    issues.push('Insufficient paragraph breaks')
  }
  
  // Check for chapter ending
  if (!content.trim().match(/[…。\!！\?？"」]/)) {
    issues.push('Chapter may not have proper ending')
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}

export function normalizeCharacterState(characters: any[]): any[] {
  return characters.map(char => ({
    id: char.id || char.name?.toLowerCase().replace(/\s+/g, '-'),
    name: char.name,
    status: char.status || 'alive',
    location: char.location || 'unknown',
    mood: char.mood || 'neutral',
    relationships: char.relationships || [],
    lastSeen: char.lastSeen || null,
    ...(char.customFields || {})
  }))
}

export function factCheckTimeline(events: any[], existingTimeline: any[]): { conflicts: any[] } {
  const conflicts: any[] = []
  
  for (const event of events) {
    const existing = existingTimeline.find(
      e => e.characterId === event.characterId && e.chapterId === event.chapterId
    )
    
    if (existing) {
      // Check for contradictions
      if (event.location && existing.location && event.location !== existing.location) {
        conflicts.push({
          type: 'location_conflict',
          event,
          existing,
          message: `${event.characterId} can't be in ${event.location} and ${existing.location} in chapter ${event.chapterId}`
        })
      }
      
      if (event.status && existing.status && event.status !== existing.status) {
        conflicts.push({
          type: 'status_conflict',
          event,
          existing,
          message: `${event.characterId} status changed from ${existing.status} to ${event.status} in chapter ${event.chapterId}`
        })
      }
    }
  }
  
  return { conflicts }
}

export function calculateWordCount(content: string): number {
  // Count words by splitting on whitespace
  return content.split(/\s+/).filter(word => word.length > 0).length
}

export function extractDialogueRatio(content: string): number {
  // Simple heuristic: count characters inside quotation marks
  const dialogueMatches = content.match(/["「『].*?["」』]/g) || []
  const totalDialogueLength = dialogueMatches.reduce((sum, match) => sum + match.length, 0)
  
  return totalDialogueLength / content.length
}

export function detectAIPatterns(text: string): { layer: string; violations: string[] }[] {
  const results: { layer: string; violations: string[] }[] = []
  
  // Layer 1: Lexical patterns
  const lexicalViolations: string[] = []
  const aiPhrases = [
    'in conclusion',
    'it is important to note',
    'furthermore',
    'moreover',
    'in summary',
    'to summarize',
    'as an AI',
    'I apologize',
    'I must clarify',
    'it\'s worth mentioning'
  ]
  
  for (const phrase of aiPhrases) {
    if (text.toLowerCase().includes(phrase)) {
      lexicalViolations.push(`Contains AI phrase: "${phrase}"`)
    }
  }
  
  if (lexicalViolations.length > 0) {
    results.push({ layer: 'lexical', violations: lexicalViolations })
  }
  
  // Layer 2: Sentence structure patterns
  const sentenceViolations: string[] = []
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  // Check for uniform sentence length (AI tends to be uniform)
  const lengths = sentences.map(s => s.split(/\s+/).length)
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length
  
  if (variance < 10) {
    sentenceViolations.push('Unusually uniform sentence length (variance < 10)')
  }
  
  // Check for repetitive sentence starters
  const starters = sentences.slice(0, 10).map(s => s.trim().split(/\s+/)[0]?.toLowerCase())
  const uniqueStarters = new Set(starters)
  if (uniqueStarters.size < 5) {
    sentenceViolations.push('Repetitive sentence starters in first 10 sentences')
  }
  
  if (sentenceViolations.length > 0) {
    results.push({ layer: 'sentence_structure', violations: sentenceViolations })
  }
  
  // Layer 3: Semantic patterns
  const semanticViolations: string[] = []
  
  // Check for excessive hedging
  const hedgingWords = ['perhaps', 'maybe', 'possibly', 'might', 'could', 'somewhat', 'rather', 'quite']
  const hedgeCount = hedgingWords.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    return count + (text.match(regex) || []).length
  }, 0)
  
  if (hedgeCount > 10) {
    semanticViolations.push(`Excessive hedging (${hedgeCount} instances)`)
  }
  
  // Check for lack of sensory details
  const sensoryWords = ['see', 'hear', 'feel', 'smell', 'taste', 'touch', 'sound', 'sight']
  const sensoryCount = sensoryWords.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    return count + (text.match(regex) || []).length
  }, 0)
  
  if (sensoryCount < 5) {
    semanticViolations.push('Lack of sensory details')
  }
  
  if (semanticViolations.length > 0) {
    results.push({ layer: 'semantic', violations: semanticViolations })
  }
  
  return results
}

export function generateRunReport(run: WorkflowRun): string {
  const lines: string[] = []
  
  lines.push(`# Workflow Run Report`)
  lines.push(`Workflow: ${run.workflowName}`)
  lines.push(`Status: ${run.status}`)
  lines.push(`Book ID: ${run.bookId}`)
  lines.push(`Started: ${run.startedAt}`)
  if (run.completedAt) {
    lines.push(`Completed: ${run.completedAt}`)
    const duration = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
    lines.push(`Duration: ${Math.round(duration / 1000)}s`)
  }
  lines.push('')
  
  lines.push(`## Stage Results`)
  lines.push('')
  
  for (const stageRun of run.stages) {
    const statusIcon = getStatusIcon(stageRun.status)
    lines.push(`${statusIcon} ${stageRun.stageId}`)
    
    if (stageRun.error) {
      lines.push(`  Error: ${stageRun.error}`)
    }
    
    if (stageRun.tasks.length > 0) {
      lines.push(`  Tasks: ${stageRun.tasks.length}`)
      for (const task of stageRun.tasks) {
        const taskIcon = getStatusIcon(task.status)
        lines.push(`    ${taskIcon} ${task.id} (${task.agent})`)
      }
    }
  }
  
  lines.push('')
  lines.push(`## Summary`)
  lines.push(`Total Stages: ${run.stages.length}`)
  lines.push(`Completed: ${run.stages.filter(s => s.status === 'completed').length}`)
  lines.push(`Failed: ${run.stages.filter(s => s.status === 'failed').length}`)
  lines.push(`Pending: ${run.stages.filter(s => s.status === 'pending').length}`)
  
  return lines.join('\n')
}

function getStatusIcon(status: TaskStatus): string {
  switch (status) {
    case 'completed': return '✅'
    case 'failed': return '❌'
    case 'running': return '🔄'
    case 'skipped': return '⏭️'
    case 'pending': return '⏳'
    default: return '❓'
  }
}