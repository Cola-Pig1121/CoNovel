interface SkeletonProps {
  className?: string
  lines?: number
}

export default function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-foreground/5 mb-2 last:mb-0"
          style={{ width: `${60 + Math.random() * 40}%` }}
        />
      ))}
    </div>
  )
}
