export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`${sizeClasses[size]} border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin`} />
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[var(--skeleton-bg)] rounded ${className}`} />
  );
}

export function LoadingOverlay({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-8 flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-[var(--text-primary)] font-medium">{message}</p>
      </div>
    </div>
  );
}
