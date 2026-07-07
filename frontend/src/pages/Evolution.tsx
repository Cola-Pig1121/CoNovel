import { useEffect, useState } from 'react'
import { useBookStore } from '@/stores/bookStore'
import { pipelineApi, memoryApi } from '@/lib/api'
import type { PipelineState } from '@/lib/types'

export default function Evolution() {
  const { currentBook, chapters, fetchBook, fetchChapters } = useBookStore()
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null)
  const [styleProfile, setStyleProfile] = useState<any>(null)
  const [longTerm, setLongTerm] = useState<any>(null)
  const [evolutionLog, setEvolutionLog] = useState<string | null>(null)

  const bookId = currentBook?.id

  useEffect(() => {
    if (bookId) {
      fetchBook(bookId)
      fetchChapters(bookId)
      pipelineApi
        .status(bookId)
        .then((ps) => setPipelineState(ps))
        .catch(() => {})

      // Fetch style profile from book style.json
      fetch(`/api/books/${bookId}/style`)
        .then((res) => {
          if (res.ok) return res.json()
          throw new Error('not found')
        })
        .then((data) => setStyleProfile(data))
        .catch(() => {})

      // Fetch long-term memory for style evolution data
      memoryApi
        .getLongTerm(bookId)
        .then((data) => {
          setLongTerm(data)
          if (data?.style_evolution) {
            setEvolutionLog(
              typeof data.style_evolution === 'string'
                ? data.style_evolution
                : JSON.stringify(data.style_evolution, null, 2),
            )
          }
        })
        .catch(() => {})
    }
  }, [bookId, fetchBook, fetchChapters])

  const totalChaptersWritten = chapters.filter((ch) => ch.wordCount > 0).length
  const completedRuns = pipelineState?.stages.filter((s) => s.status === 'completed').length ?? 0
  const createdDate = currentBook?.createdAt
    ? new Date(currentBook.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-8 py-6">
        <h1 className="font-serif text-3xl">演化追踪</h1>
        <p className="text-muted text-sm mt-1">
          追踪性能、风格漂移和学习进展
        </p>
      </header>

      <main className="px-8 py-8 space-y-12">
        {/* Book Overview */}
        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">书籍概览</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-6">
              当前手稿统计
            </p>

            {!currentBook ? (
              <p className="text-sm text-muted">
                未选择书籍。从仪表盘打开手稿以查看演化数据。
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-border/50 p-5 rounded-none">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                    标题
                  </span>
                  <span className="font-serif text-lg">{currentBook.title}</span>
                </div>
                <div className="border border-border/50 p-5 rounded-none">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                    创建时间
                  </span>
                  <span className="text-sm">{createdDate ?? 'Unknown'}</span>
                </div>
                <div className="border border-border/50 p-5 rounded-none">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                    已写章节
                  </span>
                  <span className="text-sm tabular-nums">
                    {totalChaptersWritten}
                    <span className="text-muted">
                      {' '}/ {currentBook.totalChapters}
                    </span>
                  </span>
                </div>
                <div className="border border-border/50 p-5 rounded-none">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                    字数
                  </span>
                  <span className="text-sm tabular-nums">
                    {currentBook.currentWordCount.toLocaleString()}
                    <span className="text-muted">
                      {' '}/ {currentBook.targetWordCount.toLocaleString()}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Pipeline Runs */}
        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">流水线运行</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-6">
              智能体流水线执行历史
            </p>

            <div className="border border-border/50 p-5 rounded-none">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm">已完成阶段</span>
                <span className="text-sm tabular-nums font-sans">{completedRuns}</span>
              </div>
              {pipelineState && (
                <div className="flex items-baseline justify-between">
                  <span className="text-sm">上次运行</span>
                  <span className="text-sm text-muted">
                    {pipelineState.startedAt
                      ? new Date(pipelineState.startedAt).toLocaleString()
                      : '暂无运行记录'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Style Evolution */}
        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">风格演变</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
              文学性与一致性
            </p>
            <div className="border border-border/50 p-6 rounded-none">
              {styleProfile ? (
                <div className="space-y-4">
                  {styleProfile.constraints && (
                    <div className="space-y-3">
                      {styleProfile.constraints.dialogueStyle && (
                        <div>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                            对话风格
                          </span>
                          <p className="text-sm">{styleProfile.constraints.dialogueStyle}</p>
                        </div>
                      )}
                      {styleProfile.constraints.paragraphLength && (
                        <div>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                            段落长度
                          </span>
                          <p className="text-sm">{styleProfile.constraints.paragraphLength}</p>
                        </div>
                      )}
                      {styleProfile.constraints.tonePattern && (
                        <div>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                            基调模式
                          </span>
                          <p className="text-sm">{styleProfile.constraints.tonePattern}</p>
                        </div>
                      )}
                      {styleProfile.constraints.avgSentenceLength !== undefined && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                            平均句长:
                          </span>
                          <span className="text-sm tabular-nums">
                            {styleProfile.constraints.avgSentenceLength} chars
                          </span>
                        </div>
                      )}
                      {styleProfile.constraints.dialogueRatio !== undefined && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                            对话比例:
                          </span>
                          <span className="text-sm tabular-nums">
                            {(styleProfile.constraints.dialogueRatio * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                      {longTerm?.style_evolution && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                            风格演变数据
                          </span>
                          <pre className="text-xs text-muted whitespace-pre-wrap font-mono leading-relaxed border border-border p-4 rounded-none">
                            {typeof longTerm.style_evolution === 'string'
                              ? longTerm.style_evolution
                              : JSON.stringify(longTerm.style_evolution, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                  {!styleProfile.constraints && (
                    <p className="text-sm text-muted">
                      风格档案已加载但无约束数据。
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted leading-relaxed max-w-lg mx-auto">
                    请先运行风格学习工作流以生成风格档案。该档案
                    捕获参考小说的对话风格、段落长度、基调模式和词汇特征。
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-4">
                    使用书籍详情中的参考标签页分析参考小说
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Performance Metrics — word count growth */}
        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">性能指标</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
              量化测量
            </p>
            {chapters.length === 0 ? (
              <div className="border border-border/50 p-8 rounded-none text-center">
                  <p className="text-sm text-muted leading-relaxed max-w-lg mx-auto">
                    暂无章节数据。写作章节后将显示指标。
                  </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Word count growth chart (text-based) */}
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-3">
                    字数增长
                  </span>
                  <div className="space-y-2">
                    {chapters.map((ch) => {
                      const maxWord = Math.max(...chapters.map((c) => c.wordCount), 1)
                      const pct = Math.round((ch.wordCount / maxWord) * 100)
                      return (
                        <div key={ch.chapterNumber} className="flex items-center gap-3">
                          <span className="text-[10px] tabular-nums text-muted w-6 text-right shrink-0">
                            {String(ch.chapterNumber).padStart(2, '0')}
                          </span>
                          <div className="flex-1 h-4 bg-border/20 rounded-none overflow-hidden">
                            <div
                              className="h-full bg-foreground/20 rounded-none transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-muted w-16 text-right shrink-0">
                            {ch.wordCount.toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                      总字数
                    </span>
                    <span className="text-sm tabular-nums font-sans">
                      {chapters.reduce((s, c) => s + c.wordCount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                      章均字数
                    </span>
                    <span className="text-sm tabular-nums font-sans">
                      {Math.round(
                        chapters.reduce((s, c) => s + c.wordCount, 0) / chapters.length,
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                      完成度
                    </span>
                    <span className="text-sm tabular-nums font-sans">
                      {currentBook
                        ? `${Math.round((currentBook.currentWordCount / currentBook.targetWordCount) * 100)}%`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Learning History */}
        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">学习历史</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
              提示词与记忆演变
            </p>
            <div className="border border-border/50 p-6 rounded-none">
              {evolutionLog ? (
                <pre className="text-xs text-muted whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                  {evolutionLog}
                </pre>
              ) : longTerm?.world_facts || longTerm?.active_threads ? (
                <div className="space-y-4">
                  {longTerm.world_facts && longTerm.world_facts.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                        已积累世界观事实 ({longTerm.world_facts.length})
                      </span>
                      <div className="text-sm text-muted">
                        {longTerm.world_facts.length} 条世界观事实跨章节追踪
                      </div>
                    </div>
                  )}
                  {longTerm.active_threads && longTerm.active_threads.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                        活跃情节线索 ({longTerm.active_threads.length})
                      </span>
                      <div className="text-sm text-muted">
                        {longTerm.active_threads.length} 条情节线索正在追踪
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted leading-relaxed max-w-lg mx-auto">
                    学习历史将随着流水线运行而积累。它追踪记忆更新、
                    提示词优化和约束调整。
                  </p>
                  {completedRuns < 2 && (
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-4">
                      需要至少 2 次完成的流水线运行（目前 {completedRuns} 次）
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
