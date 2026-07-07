import { useState } from 'react'
import { charactersApi } from '@/lib/api'
import { useBookStore } from '@/stores/bookStore'
import type { CharacterInsightReport, CharacterViolation } from '@/lib/types'

// ---------------------------------------------------------------------------
// Severity Helpers
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG = {
  critical: { label: '严重', style: 'border-foreground bg-foreground text-background' },
  major: { label: '主要', style: 'border-foreground bg-transparent text-foreground' },
  minor: { label: '轻微', style: 'border-border text-muted' },
} as const

const TYPE_LABELS: Record<CharacterViolation['type'], string> = {
  language: '语言',
  behavior: '行为',
  knowledge: '知识',
  emotion: '情感',
  relationship: '关系',
}

// ---------------------------------------------------------------------------
// SeverityBadge
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: CharacterViolation['severity'] }) {
  const config = SEVERITY_CONFIG[severity]
  return (
    <span
      className={`text-[10px] uppercase tracking-widest border px-2 py-0.5 rounded-none ${config.style}`}
    >
      {config.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// ViolationCard
// ---------------------------------------------------------------------------

function ViolationCard({ violation }: { violation: CharacterViolation }) {
  return (
    <div className="border border-border p-4 rounded-none hover:border-foreground transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
          {TYPE_LABELS[violation.type]}
        </span>
        <SeverityBadge severity={violation.severity} />
      </div>
      <p className="text-sm leading-relaxed mb-2">{violation.description}</p>
      <div className="text-xs text-muted border-l-2 border-border pl-3 mb-2">
        {violation.evidence}
      </div>
      <p className="text-xs text-muted italic">
        建议: {violation.suggestion}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReportCard
// ---------------------------------------------------------------------------

function ReportCard({ report }: { report: CharacterInsightReport }) {
  return (
    <div className="border border-border p-6 rounded-none hover:border-foreground transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg tracking-tight">{report.characterName}</h3>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            第 {report.chapterNumber} 章
          </span>
        </div>
        <div className="text-right">
          <div className="font-serif text-3xl tracking-tight">
            {report.overallConsistency}
            <span className="text-sm text-muted">%</span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            一致性
          </span>
        </div>
      </div>

      {/* Consistency bar */}
      <div className="w-full h-px bg-border mb-4">
        <div
          className="h-px bg-foreground transition-all"
          style={{ width: `${report.overallConsistency}%` }}
        />
      </div>

      {/* Suggestions */}
      {report.suggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-2">
            建议
          </h4>
          <ul className="space-y-1">
            {report.suggestions.map((s, i) => (
              <li key={i} className="text-xs text-muted pl-3 border-l border-border">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Violations */}
      {report.violations.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-3">
            违规 ({report.violations.length})
          </h4>
          <div className="space-y-3">
            {report.violations.map((v, i) => (
              <ViolationCard key={i} violation={v} />
            ))}
          </div>
        </div>
      )}

      {report.violations.length === 0 && (
        <p className="text-sm text-muted italic">
          未检测到违规 — 角色一致性良好。
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CharacterInsight — Main Component
// ---------------------------------------------------------------------------

export default function CharacterInsight({ chapterNumber }: { chapterNumber: number }) {
  const { currentBook } = useBookStore()
  const [reports, setReports] = useState<CharacterInsightReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRunReview() {
    if (!currentBook) return
    setLoading(true)
    setError(null)
    try {
      const results = await charactersApi.review(currentBook.id, chapterNumber)
      setReports(results)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  // Aggregate stats
  const totalViolations = reports.reduce((sum, r) => sum + r.violations.length, 0)
  const avgConsistency =
    reports.length > 0
      ? Math.round(reports.reduce((sum, r) => sum + r.overallConsistency, 0) / reports.length)
      : 0

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted">
              ★ 角色洞察
            </h3>
            {reports.length > 0 && (
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs tabular-nums">
                  一致性: <strong>{avgConsistency}%</strong>
                </span>
                <span className="text-xs text-muted tabular-nums">
                  {totalViolations} 个违规
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleRunReview}
            disabled={loading || !currentBook}
            className="text-[10px] uppercase tracking-widest border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-30 shrink-0"
          >
            {loading ? '运行中...' : '运行审查'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {error && (
          <div className="border border-border p-4 rounded-none">
            <p className="text-sm text-muted">错误: {error}</p>
          </div>
        )}

        {!loading && reports.length === 0 && !error && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="font-serif text-lg mb-2">暂无审查</p>
              <p className="text-xs text-muted">
                点击"运行审查"分析角色一致性
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-4 h-4 border border-foreground border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-xs text-muted uppercase tracking-[0.2em]">
                分析角色中...
              </p>
            </div>
          </div>
        )}

        {reports.map((report) => (
          <ReportCard key={report.characterId} report={report} />
        ))}
      </div>
    </div>
  )
}
