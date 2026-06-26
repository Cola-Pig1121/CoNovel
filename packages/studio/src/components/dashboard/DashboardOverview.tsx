'use client';

// Dashboard Overview - 项目总览组件
// 显示项目关键指标和进度

interface ProjectStats {
  totalBooks: number;
  activeBooks: number;
  totalChapters: number;
  totalWordCount: number;
  avgQualityScore: number;
}

export function DashboardOverview() {
  // Placeholder data - will be fetched from API
  const stats: ProjectStats = {
    totalBooks: 3,
    activeBooks: 2,
    totalChapters: 156,
    totalWordCount: 468000,
    avgQualityScore: 7.8,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard
        label="项目总数"
        labelEn="Total Books"
        value={stats.totalBooks}
        unit="个"
      />
      <StatCard
        label="进行中"
        labelEn="Active"
        value={stats.activeBooks}
        unit="个"
      />
      <StatCard
        label="已完成章节"
        labelEn="Chapters"
        value={stats.totalChapters}
        unit="章"
      />
      <StatCard
        label="总字数"
        labelEn="Word Count"
        value={stats.totalWordCount}
        unit="字"
      />
      <StatCard
        label="平均质量分"
        labelEn="Quality Score"
        value={stats.avgQualityScore}
        unit="/10"
      />
    </div>
  );
}

function StatCard({
  label,
  labelEn,
  value,
  unit,
}: {
  label: string;
  labelEn: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="card-editorial">
      <p className="label-editorial text-muted">{label}</p>
      <p className="font-mono text-xs text-muted mt-1">{labelEn}</p>
      <div className="mt-4">
        <span className="font-serif text-3xl tracking-tight">
          {typeof value === 'number' && value > 999
            ? value.toLocaleString()
            : value}
        </span>
        <span className="text-muted text-sm ml-1">{unit}</span>
      </div>
    </div>
  );
}
