'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">出错了</h2>
        <p className="text-muted text-sm mb-4">{error.message}</p>
        <button onClick={reset} className="btn-editorial">重试</button>
      </div>
    </div>
  );
}
