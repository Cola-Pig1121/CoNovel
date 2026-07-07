import { useState, useMemo, useCallback, useRef } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiffHunk {
  type: 'equal' | 'delete' | 'insert'
  text: string
}

interface GroupedHunk extends DiffHunk {
  groupId: number
}

export interface DiffViewProps {
  original: string
  modified: string
  onAcceptAll: (mergedText: string) => void
  onDiscardAll: () => void
  onAcceptHunk?: (index: number) => void
  onRejectHunk?: (index: number) => void
}

// ---------------------------------------------------------------------------
// Diff algorithm — LCS-based token diff
// ---------------------------------------------------------------------------

/**
 * Tokenize text into alternating whitespace / non-whitespace runs.
 * Works well for both Chinese and English text.
 */
function tokenize(text: string): string[] {
  return text.match(/\s+|\S+/g) || []
}

/**
 * Compute the LCS dynamic-programming table for two token arrays.
 * Uses full table for backtracking (acceptable for texts under ~3 000 tokens).
 */
function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    const row = dp[i]!
    const prevRow = dp[i - 1]!
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        row[j] = prevRow[j - 1]! + 1
      } else {
        row[j] = Math.max(prevRow[j]!, row[j - 1]!)
      }
    }
  }
  return dp
}

/**
 * Backtrack the LCS table to produce a raw list of diff hunks.
 */
function backtrack(dp: number[][], a: string[], b: string[]): DiffHunk[] {
  const hunks: DiffHunk[] = []
  let i = a.length
  let j = b.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      hunks.unshift({ type: 'equal', text: a[i - 1]! })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      hunks.unshift({ type: 'insert', text: b[j - 1]! })
      j--
    } else {
      hunks.unshift({ type: 'delete', text: a[i - 1]! })
      i--
    }
  }
  return hunks
}

/**
 * Merge adjacent hunks of the same type into single hunks.
 */
function mergeHunks(hunks: DiffHunk[]): DiffHunk[] {
  const merged: DiffHunk[] = []
  for (const h of hunks) {
    const last = merged[merged.length - 1]
    if (last && last.type === h.type) {
      last.text += h.text
    } else {
      merged.push({ ...h })
    }
  }
  return merged
}

/**
 * Assign group IDs: consecutive non-equal hunks share the same group.
 */
function assignGroups(hunks: DiffHunk[]): GroupedHunk[] {
  let groupCounter = 0
  let currentGroup = -1
  return hunks.map((h) => {
    if (h.type === 'equal') {
      currentGroup = -1
      return { ...h, groupId: -1 }
    }
    if (currentGroup < 0) {
      currentGroup = groupCounter++
    }
    return { ...h, groupId: currentGroup }
  })
}

/**
 * High-level diff: tokenize → LCS → backtrack → merge → assign groups.
 * Falls back to "whole text replaced" for very large inputs.
 */
function computeDiff(original: string, modified: string): GroupedHunk[] {
  if (original === modified) {
    return [{ type: 'equal', text: original, groupId: -1 }]
  }

  const origTokens = tokenize(original)
  const modTokens = tokenize(modified)

  // Guard against very large inputs (LCS is O(m*n))
  if (origTokens.length * modTokens.length > 9_000_000) {
    return [
      { type: 'delete', text: original, groupId: 0 },
      { type: 'insert', text: modified, groupId: 0 },
    ]
  }

  const dp = lcsTable(origTokens, modTokens)
  const raw = backtrack(dp, origTokens, modTokens)
  const merged = mergeHunks(raw)
  return assignGroups(merged)
}

/**
 * Build the final merged text from hunks given a set of accepted group IDs.
 */
function buildMergedText(
  hunks: GroupedHunk[],
  acceptedGroups: Set<number>,
  editedTexts: Record<number, string>,
): string {
  let result = ''
  for (const h of hunks) {
    if (h.type === 'equal') {
      result += h.text
    } else if (h.groupId >= 0) {
      if (acceptedGroups.has(h.groupId)) {
        // Group accepted → apply changes
        if (h.type === 'insert') {
          // Use edited text if user modified this hunk
          result += editedTexts[h.groupId] ?? h.text
        }
        // deletions are dropped
      } else {
        // Group rejected → keep original
        if (h.type === 'delete') {
          result += h.text
        }
        // insertions are dropped
      }
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// HunkChangeIndicator — small accept / reject pill for a change group
// ---------------------------------------------------------------------------

function HunkChangeIndicator({
  groupId,
  accepted,
  onToggle,
  isLast,
}: {
  groupId: number
  accepted: boolean
  onToggle: () => void
  isLast: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 ml-1 align-middle ${
        isLast ? '' : 'mr-0.5'
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 border transition-colors rounded-none ${
          accepted
            ? 'border-foreground/20 text-foreground/60 hover:border-foreground hover:text-foreground'
            : 'border-border text-muted hover:text-foreground hover:border-foreground/40'
        }`}
        title={accepted ? '拒绝此更改' : '接受此更改'}
      >
        {accepted ? '✓' : '✗'}
      </button>
      <span className="text-[9px] text-muted select-none">#{groupId + 1}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// DiffView Component
// ---------------------------------------------------------------------------
// Note: The .tmp file concept from Gemini's plan is implemented server-side.
// The agent engine writes AI output to chapters/chapter_XXXX_edited.txt
// before the user reviews it. This DiffView shows the in-memory diff
// between the original content and the AI draft for interactive review.
// When the user clicks "Apply All", the final merged content is saved
// to the main chapter file via the chapters API.

export default function DiffView({
  original,
  modified,
  onAcceptAll,
  onDiscardAll,
  onAcceptHunk,
  onRejectHunk,
}: DiffViewProps) {
  // Compute diff hunks (memoised)
  const hunks = useMemo(() => computeDiff(original, modified), [original, modified])

  // Track which groups are accepted (default: all accepted — i.e. keep AI changes)
  const [acceptedGroups, setAcceptedGroups] = useState<Set<number>>(() => {
    const all = new Set<number>()
    for (const h of hunks) {
      if (h.groupId >= 0) all.add(h.groupId)
    }
    return all
  })

  // Track edited text for insert hunks (groupId → edited text)
  const [editedTexts, setEditedTexts] = useState<Record<number, string>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  // Derive unique group IDs for per-hunk controls
  const groupIds = useMemo(() => {
    const ids = new Set<number>()
    for (const h of hunks) {
      if (h.groupId >= 0) ids.add(h.groupId)
    }
    return Array.from(ids)
  }, [hunks])

  const totalGroups = groupIds.length

  // Toggle a single group
  const toggleGroup = useCallback(
    (gid: number) => {
      setAcceptedGroups((prev) => {
        const next = new Set(prev)
        if (next.has(gid)) {
          next.delete(gid)
          onRejectHunk?.(gid)
        } else {
          next.add(gid)
          onAcceptHunk?.(gid)
        }
        return next
      })
    },
    [onAcceptHunk, onRejectHunk],
  )

  // Accept all
  const handleAcceptAll = useCallback(() => {
    const all = new Set(groupIds)
    setAcceptedGroups(all)
    const merged = buildMergedText(hunks, all, editedTexts)
    onAcceptAll(merged)
  }, [hunks, groupIds, editedTexts, onAcceptAll])

  // Discard all
  const handleDiscardAll = useCallback(() => {
    setAcceptedGroups(new Set())
    onDiscardAll()
  }, [onDiscardAll])

  // Accept all (keep current per-hunk decisions, just apply them)
  const handleApplyCurrent = useCallback(() => {
    const merged = buildMergedText(hunks, acceptedGroups, editedTexts)
    onAcceptAll(merged)
  }, [hunks, acceptedGroups, editedTexts, onAcceptAll])

  // Handle contentEditable input for insert hunks
  const handleInsertInput = useCallback((groupId: number, e: React.FormEvent<HTMLSpanElement>) => {
    const text = e.currentTarget.textContent ?? ''
    setEditedTexts((prev) => ({ ...prev, [groupId]: text }))
  }, [])

  // Stats
  const acceptedCount = acceptedGroups.size
  const changeCount = totalGroups

  // ---- Render ----
  return (
    <div ref={containerRef} className="font-sans text-foreground leading-relaxed">
      {/* ---- Toolbar ---- */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            {changeCount === 0
              ? '无更改'
              : `${acceptedCount}/${changeCount} 个更改已接受`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDiscardAll}
            className="text-[10px] uppercase tracking-widest border border-border px-3 py-1.5 hover:border-foreground hover:text-foreground transition-colors rounded-none"
          >
            全部丢弃
          </button>
          <button
            onClick={changeCount > 0 ? handleApplyCurrent : handleAcceptAll}
            className="text-[10px] uppercase tracking-widest border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors rounded-none"
          >
            全部应用
          </button>
        </div>
      </div>

      {/* ---- Inline diff ---- */}
      <div className="relative text-sm leading-[1.8] tracking-wide whitespace-pre-wrap break-words">
        {hunks.map((hunk, idx) => {
          // Find the "last" non-equal hunk in the same group for indicator placement
          const nextHunk = hunks[idx + 1]
          const isLastInGroup =
            hunk.groupId >= 0 &&
            (idx === hunks.length - 1 || (nextHunk !== undefined && nextHunk.groupId !== hunk.groupId))

          if (hunk.type === 'equal') {
            return (
              <span key={`eq-${idx}`} className="diff-equal">
                {hunk.text}
              </span>
            )
          }

          if (hunk.type === 'delete') {
            return (
              <span key={`del-${idx}`} className="diff-delete" title="已删除文本（点击 ✗ 保留）">
                {hunk.text}
                {isLastInGroup && (
                  <HunkChangeIndicator
                    groupId={hunk.groupId}
                    accepted={acceptedGroups.has(hunk.groupId)}
                    onToggle={() => toggleGroup(hunk.groupId)}
                    isLast={idx === hunks.length - 1}
                  />
                )}
              </span>
            )
          }

          // insert
          const isAccepted = acceptedGroups.has(hunk.groupId)
          return (
            <span
              key={`ins-${idx}`}
              className={`diff-insert ${isAccepted ? '' : 'diff-insert-rejected'}`}
              title="插入文本 — 可编辑"
            >
              <span
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => handleInsertInput(hunk.groupId, e)}
                className="outline-none"
                spellCheck={false}
              >
                {editedTexts[hunk.groupId] ?? hunk.text}
              </span>
              {isLastInGroup && (
                <HunkChangeIndicator
                  groupId={hunk.groupId}
                  accepted={isAccepted}
                  onToggle={() => toggleGroup(hunk.groupId)}
                  isLast={idx === hunks.length - 1}
                />
              )}
            </span>
          )
        })}

        {changeCount === 0 && (
          <p className="text-muted text-sm italic">未发现原始文本与修改文本之间的差异。</p>
        )}
      </div>
    </div>
  )
}
