// ============================================================
// State Synchronization
// Updates book state after chapter completion and commits to Git
// ============================================================

import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { execSync } from 'child_process'
import type { BookState, ChapterMeta } from '../types'

/**
 * Sync chapter data into the book's state.json (SSOT)
 */
export function syncChapterState(
  bookPath: string,
  chapterData: ChapterMeta,
): void {
  const statePath = join(bookPath, 'state.json')
  if (!existsSync(statePath)) return

  const state: BookState = JSON.parse(readFileSync(statePath, 'utf-8'))

  // Update word counts
  state.total_word_count += chapterData.word_count
  state.current_chapter = Math.max(state.current_chapter, chapterData.number)
  state.meta.updated_at = new Date().toISOString()

  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
}

/**
 * Recalculate total word count from all chapter files
 */
export function updateWordCounts(bookPath: string): void {
  const statePath = join(bookPath, 'state.json')
  const chaptersDir = join(bookPath, 'chapters')

  if (!existsSync(statePath)) return

  const state: BookState = JSON.parse(readFileSync(statePath, 'utf-8'))

  if (!existsSync(chaptersDir)) {
    state.total_word_count = 0
    writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
    return
  }

  let totalWords = 0
  const files = readdirSync(chaptersDir).filter((f) => f.endsWith('.json'))

  for (const file of files) {
    const chapter: ChapterMeta = JSON.parse(
      readFileSync(join(chaptersDir, file), 'utf-8'),
    )
    totalWords += chapter.word_count
  }

  state.total_word_count = totalWords
  state.meta.updated_at = new Date().toISOString()
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
}

/**
 * Commit changes to the book's Git repository
 */
export function commitChanges(bookPath: string, message: string): void {
  try {
    execSync('git add .', { cwd: bookPath, stdio: 'ignore' })
    execSync(`git commit -m "${message}" --allow-empty`, {
      cwd: bookPath,
      stdio: 'ignore',
    })
  } catch {
    // Git commit might fail if nothing to commit, that's OK
  }
}
