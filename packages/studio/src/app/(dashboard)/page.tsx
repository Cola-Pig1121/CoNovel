import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { AgentMonitor } from '@/components/dashboard/AgentMonitor';
import { WritingPipeline } from '@/components/dashboard/WritingPipeline';
import { StyleEvolution } from '@/components/dashboard/StyleEvolution';

export default function Home() {
  return (
    <div>
      {/* Header */}
      <header className="border-b border-border px-12 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl tracking-tight">CoNovel</h1>
            <p className="text-muted text-sm mt-1">自进化多Agent小说写作系统</p>
          </div>
          <div className="flex gap-4">
            <button className="btn-editorial">新建项目</button>
            <button className="btn-editorial-primary">开始写作</button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="p-12">
        <section className="mb-16">
          <h2 className="label-editorial mb-6">项目总览</h2>
          <DashboardOverview />
        </section>

        <section className="mb-16">
          <h2 className="label-editorial mb-6">Agent 监控</h2>
          <AgentMonitor />
        </section>

        <section className="mb-16">
          <h2 className="label-editorial mb-6">写作流水线</h2>
          <WritingPipeline />
        </section>

        <section className="mb-16">
          <h2 className="label-editorial mb-6">风格进化</h2>
          <StyleEvolution />
        </section>
      </div>
    </div>
  );
}
